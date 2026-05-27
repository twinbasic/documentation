// Minimal static file server for `_site/`. Replaces `npx http-server` so
// the access log shows only failures (4xx, 5xx, exceptions) instead of
// every successful 2xx hit. Resolution rules mirror what GitHub Pages
// does on the deployed site:
//
//   /path        -> _site/path/index.html if a dir,
//                   _site/path.html if a file (extensionless fallback),
//                   _site/path verbatim otherwise.
//   /path/       -> _site/path/index.html.
//   /path.ext    -> _site/path.ext verbatim.
//
// Cache-Control is disabled (`no-store`) so a manual browser refresh
// always picks up a rebuild.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "_site");
const PORT = 4000;

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

async function resolveFile(urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath.split("?")[0].split("#")[0]); }
  catch { return null; }
  if (!p.startsWith("/")) p = "/" + p;

  const target = path.normalize(path.join(ROOT, p));
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) return null;

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

function log(req, status, extra) {
  const reason = extra ? ` -- ${extra}` : "";
  process.stderr.write(`${new Date().toISOString()} ${status} ${req.method ?? "?"} ${req.url ?? "?"}${reason}\n`);
}

const server = createServer(async (req, res) => {
  try {
    const file = await resolveFile(req.url ?? "/");
    if (!file) {
      res.statusCode = 404;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end("404 Not Found\n");
      log(req, 404);
      return;
    }
    const data = await readFile(file);
    res.statusCode = 200;
    res.setHeader("content-type", MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream");
    res.setHeader("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
    res.end(data);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("500 Internal Server Error\n");
    log(req, 500, err?.message ?? String(err));
  }
});

server.listen(PORT, () => {
  console.log(`Serving ${ROOT} at http://localhost:${PORT}/`);
  console.log("Only 4xx / 5xx / exceptions will be logged. Ctrl+C to stop.");
});
