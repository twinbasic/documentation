// Phase 12 SERVE: long-lived dev server with watcher + rebuild queue +
// SSE live-reload. See builder/PLAN-12.md for the full spec.
//
// One entry point: runServe(opts). Composes:
//   §A  HTTP server + static file handler
//   §B  HTML inject middleware (SSE client script)
//   §C  SSE endpoint (/_tbdocs/reload)
//   §D  Watcher loop (node:fs/promises watch, recursive)
//   §E  Rebuild queue (single-flight + one-pending-slot, debounced)
//   §F  Lifecycle (SIGINT → close server + abort watcher + drain SSE)

import { createServer } from "node:http";
import { readFile, stat, watch } from "node:fs/promises";
import path from "node:path";
import { runBuild } from "./tbdocs.mjs";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml":  "application/xml; charset=utf-8",
  ".svg":  "image/svg+xml; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".webp": "image/webp",
  ".ico":  "image/x-icon",
  ".txt":  "text/plain; charset=utf-8",
  ".pdf":  "application/pdf",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
};

function log(req, status, extra) {
  const reason = extra ? ` -- ${extra}` : "";
  process.stderr.write(`${new Date().toISOString()} ${status} ${req.method ?? "?"} ${req.url ?? "?"}${reason}\n`);
}

// §B — HTML inject middleware
const RELOAD_SCRIPT = `<script>(()=>{const es=new EventSource('/_tbdocs/reload');es.addEventListener('reload',()=>location.reload());})();</script>`;

function injectReloadScript(html) {
  const idx = html.lastIndexOf("</body>");
  if (idx === -1) return html;
  return html.slice(0, idx) + RELOAD_SCRIPT + html.slice(idx);
}

// §C — SSE endpoint
const sseClients = new Set();

function sseHandler(req, res) {
  res.statusCode = 200;
  res.setHeader("content-type", "text/event-stream");
  res.setHeader("cache-control", "no-store");
  res.setHeader("connection", "keep-alive");
  res.write(": connected\n\n");
  sseClients.add(res);

  const keepalive = setInterval(() => {
    try { res.write(": keepalive\n\n"); } catch {}
  }, 30000);

  req.on("close", () => {
    clearInterval(keepalive);
    sseClients.delete(res);
  });
}

function notifyReload() {
  for (const res of sseClients) {
    try { res.write("event: reload\ndata: 1\n\n"); } catch {}
  }
}

// §A — Static file handler factory
function createStaticHandler(destRoot) {
  async function resolveFile(urlPath) {
    let p;
    try { p = decodeURIComponent(urlPath.split("?")[0].split("#")[0]); }
    catch { return null; }
    if (!p.startsWith("/")) p = "/" + p;

    const target = path.normalize(path.join(destRoot, p));
    if (target !== destRoot && !target.startsWith(destRoot + path.sep)) return null;

    const candidates = [];
    if (!p.endsWith("/")) candidates.push(target);
    if (!p.endsWith("/") && !path.extname(target)) candidates.push(target + ".html");
    candidates.push(path.join(target, "index.html"));

    for (const c of candidates) {
      try {
        const s = await stat(c);
        if (s.isFile()) return c;
      } catch {}
    }
    return null;
  }

  return async (req, res) => {
    try {
      const file = await resolveFile(req.url ?? "/");
      if (!file) {
        res.statusCode = 404;
        res.setHeader("content-type", "text/plain; charset=utf-8");
        res.end("404 Not Found\n");
        log(req, 404);
        return;
      }
      const ext = path.extname(file).toLowerCase();
      const isHtml = ext === ".html";
      const isBook = path.basename(file).toLowerCase() === "book.html";

      let data = await readFile(file);
      if (isHtml && !isBook) {
        data = injectReloadScript(data.toString("utf8"));
      }

      res.statusCode = 200;
      res.setHeader("content-type", MIME[ext] ?? "application/octet-stream");
      res.setHeader("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
      res.end(data);
    } catch (err) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end("500 Internal Server Error\n");
      log(req, 500, err?.message ?? String(err));
    }
  };
}

// §D — Watcher filtering
const IGNORED_PREFIXES = ["_site", "_site-offline", "_site-pdf", "_serve", "_pdf", "node_modules", ".git"];
const IGNORED_BASENAME_RE = /^\.|~$|\.tmp$|\.swp$|^4913$/;

function shouldRebuild(filename) {
  if (!filename) return false;
  const segs = filename.split(/[/\\]/);
  if (IGNORED_PREFIXES.includes(segs[0])) return false;
  if (IGNORED_BASENAME_RE.test(segs.at(-1) ?? "")) return false;
  // Mermaid renders <name>.mmd → <name>.svg back under srcRoot/assets/
  // images/mmd/. The .mmd is the source of truth; the .svg is the
  // build artifact. Without this filter, each .mmd edit fires the
  // watcher twice -- once on the .mmd save, once on the .svg write
  // mid-rebuild -- so the user sees a redundant second reload ~3 s
  // after the first.
  if (segs[0] === "assets" && segs[1] === "images" && segs[2] === "mmd"
      && (segs.at(-1) ?? "").endsWith(".svg")) {
    return false;
  }
  return true;
}

export async function runServe(opts) {
  const srcRoot = path.resolve(process.cwd(), opts.src ?? "docs");
  // Serve writes to a tree disjoint from build.bat's `_site/` so a one-off
  // build.bat run (for the PDF, an offline-mirror check, ...) doesn't clobber
  // the running serve session's output mid-watch. The HTTP server, the
  // watcher's IGNORED_PREFIXES, and both runBuild calls below all key off
  // this same path.
  const destRoot = path.resolve(opts.dest ?? path.join(srcRoot, "_serve"));
  const port = opts.port ?? 4000;

  // Initial build
  try {
    await runBuild({ ...opts, dest: destRoot, skipOffline: true, skipPdf: true });
  } catch (err) {
    console.error("serve: initial build failed:", err.message);
    process.exit(1);
  }

  const staticHandler = createStaticHandler(destRoot);

  const server = createServer(async (req, res) => {
    const url = req.url ?? "/";
    if (url === "/_tbdocs/reload" || url.startsWith("/_tbdocs/reload?")) {
      sseHandler(req, res);
      return;
    }
    await staticHandler(req, res);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`serve: port ${port} already in use. Pass --port <other> to choose another, or stop the process bound to ${port}.`);
      process.exit(1);
    }
    throw err;
  });

  // §E — Rebuild queue (single-flight + one-pending-slot, debounced)
  let running = false;
  let pending = false;
  let debounceTimer = null;

  function schedule() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fire, 300);
  }

  async function fire() {
    if (running) { pending = true; return; }
    running = true;
    try {
      await runBuild({ ...opts, dest: destRoot, skipOffline: true, skipPdf: true });
      notifyReload();
    } catch (err) {
      console.error("rebuild failed:", err.message);
    } finally {
      running = false;
      if (pending) { pending = false; schedule(); }
    }
  }

  // §D — Watcher loop
  const ac = new AbortController();
  const watcher = watch(srcRoot, { recursive: true, signal: ac.signal });

  (async () => {
    try {
      for await (const event of watcher) {
        if (!shouldRebuild(event.filename)) continue;
        schedule();
      }
    } catch (err) {
      if (err.name !== "AbortError") throw err;
    }
  })();

  // §F — Lifecycle (SIGINT)
  process.on("SIGINT", () => {
    console.log("serve: shutting down.");
    ac.abort();
    for (const res of sseClients) {
      try { res.end(); } catch {}
    }
    sseClients.clear();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 100).unref();
  });

  server.listen(port, () => {
    console.log(`Serving ${destRoot} at http://localhost:${port}/`);
    console.log(`Watching ${srcRoot} for changes.`);
  });
}
