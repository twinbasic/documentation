// Phase 12 SERVE: long-lived dev server with watcher + rebuild queue +
// SSE live-reload. See builder/PLAN-12.md for the full spec.
//
// One entry point: runServe(opts). Composes:
//   §A  HTTP server, answering with static-files.mjs
//   §B  HTML inject middleware (SSE client script)
//   §C  SSE endpoint (/_tbdocs/reload)
//   §D  Watcher loop (node:fs/promises watch, recursive)
//   §E  Rebuild queue (single-flight + one-pending-slot, debounced)
//   §F  Lifecycle (SIGINT → close server + abort watcher + drain SSE)

import { createServer } from "node:http";
import { watch } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { isOutputTree } from "../lib/markdown-files.mjs";
import { runBuild, createWorkerPool, EXIT_ERROR } from "./tbdocs.mjs";
import { createStaticHandler } from "./static-files.mjs";

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
    try {
      res.write(": keepalive\n\n");
    } catch {}
  }, 30000);

  req.on("close", () => {
    clearInterval(keepalive);
    sseClients.delete(res);
  });
}

function notifyReload() {
  for (const res of sseClients) {
    try {
      res.write("event: reload\ndata: 1\n\n");
    } catch {}
  }
}

// §A — Static file handler factory
// §D — Watcher filtering
// The build's output trees are skipped by the test every tool that walks
// docs/ uses, isOutputTree. A list of names would miss the three a build given
// --dest docs/_site-basepath writes, so such a build would start a rebuild
// here. The two names below are not output trees.
const IGNORED_DIRS = ["node_modules", ".git"];
const IGNORED_BASENAME_RE = /^\.|~$|\.tmp$|\.swp$|^4913$/;

function shouldRebuild(filename, srcRoot) {
  if (!filename) return false;
  const segs = filename.split(/[/\\]/);
  if (isOutputTree(segs[0]) || IGNORED_DIRS.includes(segs[0])) return false;
  if (IGNORED_BASENAME_RE.test(segs.at(-1) ?? "")) return false;
  // Graphviz renders <name>.dot → <name>.svg back under srcRoot, beside the
  // source. The .dot is the source of truth; the .svg is the build artifact.
  // Without this filter, each .dot edit fires the watcher twice -- once on
  // the .dot save, once on the .svg write mid-rebuild -- so the user sees a
  // redundant second reload after the first.
  //
  // Keyed on "has a .dot sibling" rather than on a fixed folder, because a
  // diagram may live beside the page that uses it. That is also strictly
  // more accurate than a path test: a hand-authored .svg in
  // assets/images/dot/ is not ignored.
  if (
    srcRoot &&
    (segs.at(-1) ?? "").endsWith(".svg") &&
    existsSync(path.join(srcRoot, filename).replace(/\.svg$/, ".dot"))
  ) {
    return false;
  }
  return true;
}

export async function runServe(opts) {
  const srcRoot = path.resolve(process.cwd(), opts.src ?? "docs");
  // Serve writes to a tree disjoint from build.bat's `_site/` so a one-off
  // build.bat run (for the PDF, an offline-mirror check, ...) doesn't clobber
  // the running serve session's output mid-watch. The HTTP server and both
  // runBuild calls below key off this path. The watcher does not: it skips
  // output trees by name (isOutputTree), which covers this path because
  // runBuild refuses a --dest inside docs/ that is not in an output tree
  // directly under it (assertDestinationClearOfSource).
  const destRoot = path.resolve(opts.dest ?? path.join(srcRoot, "_serve"));
  const port = opts.port ?? 4000;

  // Pool persists across rebuilds: skips ~100--200 ms of worker cold boot
  // per rebuild and lets warmInit's survives_reset short-circuit on builds
  // after the first.
  let pool = createWorkerPool();

  // A stalled build means a worker is still inside a handler that never
  // returned. The pool outlives a rebuild here, so that worker stays
  // wedged: it will not pick up the next build's sendInit, and the
  // per-worker tasks (warmInit, renderEnvInit) wait on every lane, so
  // the next rebuild would stall too -- for a reason that has nothing
  // to do with whatever the author just edited. Replace the pool
  // wholesale; it costs one cold boot and is certainly correct,
  // whereas replacing only the wedged lane means identifying it, and
  // the SAB records the lane a task completed on, not the one that
  // claimed it.
  async function replacePool(oldPool) {
    console.error("serve: a worker is wedged; restarting the worker pool.");
    pool = createWorkerPool();
    try {
      await oldPool.destroy();
    } catch {}
  }

  // Initial build
  try {
    await runBuild({ ...opts, dest: destRoot, skipOffline: true, skipPdf: true, pool });
  } catch (err) {
    console.error("serve: initial build failed:", describeBuildError(err));
    await pool.destroy();
    // A --dest the build refuses is a command-line error and any other throw a
    // crash; both exit EXIT_ERROR, as in tbdocs's main().
    process.exit(EXIT_ERROR);
  }

  const staticHandler = createStaticHandler(destRoot, {
    transformHtml: (html, file) =>
      path.basename(file).toLowerCase() === "book.html" ? html : injectReloadScript(html),
  });

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
      console.error(
        `serve: port ${port} already in use. Pass --port <other> to choose another, or stop the process bound to ${port}.`,
      );
      process.exit(EXIT_ERROR);
    }
    throw err;
  });

  // §E — Rebuild queue (single-flight + one-pending-slot, debounced)
  let running = false;
  let pending = false;
  let debounceTimer = null;
  const changedFiles = new Set();

  function schedule() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fire, 300);
  }

  async function fire() {
    if (running) {
      pending = true;
      return;
    }
    running = true;
    const files = [...changedFiles].sort();
    changedFiles.clear();
    console.log(`\nChanged: ${files.join(", ")}`);
    try {
      await runBuild({ ...opts, dest: destRoot, skipOffline: true, skipPdf: true, pool });
      notifyReload();
    } catch (err) {
      console.error("rebuild failed:", describeBuildError(err));
      if (err?.stalled) await replacePool(pool);
    } finally {
      running = false;
      if (pending) {
        pending = false;
        schedule();
      }
    }
  }

  // §D — Watcher loop
  const ac = new AbortController();
  const watcher = watch(srcRoot, { recursive: true, signal: ac.signal });

  (async () => {
    try {
      for await (const event of watcher) {
        if (!shouldRebuild(event.filename, srcRoot)) continue;
        changedFiles.add(event.filename.replaceAll("\\", "/"));
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
      try {
        res.end();
      } catch {}
    }
    sseClients.clear();
    pool.destroy();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 100).unref();
  });

  server.listen(port, () => {
    console.log(`Serving ${destRoot} at http://localhost:${port}/`);
    console.log(`Watching ${srcRoot} for changes.`);
  });
}

// A scheduler abort's own message is only "task <name> failed"; what it
// was actually refusing sits in `cause`. Printing just `err.message` in
// the serve loop therefore turns a build gate's carefully-worded refusal
// -- the publish allowlist naming four stray files, say -- into four
// words that say nothing. Walk the chain.
function describeBuildError(err) {
  const seen = new Set();
  const parts = [];
  for (let e = err; e && !seen.has(e); e = e.cause) {
    seen.add(e);
    if (e.message) parts.push(e.message);
  }
  return parts.join("\n  caused by: ");
}
