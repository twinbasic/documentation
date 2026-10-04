// The static file handler tbdocs --serve answers with, and test/addin's help
// lane serves the built site with. Folders are served as GitHub Pages serves
// them: a folder's URL without its trailing slash redirects to the slash form,
// and a path without an extension also finds <path>.html. Nothing is cached.

import { readFile, stat } from "node:fs/promises";
import path from "node:path";

// biome-ignore format: a table, one entry per line
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

export function createStaticHandler(destRoot, { transformHtml } = {}) {
  // A folder's URL with its trailing slash, built from the folder rather
  // than from the request, so that it is always a path on this server.
  function folderUrl(dir) {
    const rel = path.relative(destRoot, dir);
    return "/" + (rel ? rel.split(path.sep).map(encodeURIComponent).join("/") + "/" : "");
  }

  // Returns { file }, { redirect } or null. A folder named without its
  // trailing slash redirects to the slash form, as GitHub Pages does:
  // served in place, its page's relative links resolve one level too high.
  async function resolveFile(urlPath) {
    const url = urlPath.split("#")[0];
    const q = url.indexOf("?");
    let p;
    try {
      p = decodeURIComponent(q < 0 ? url : url.slice(0, q));
    } catch {
      return null;
    }
    if (!p.startsWith("/")) p = "/" + p;

    const target = path.normalize(path.join(destRoot, p));
    if (target !== destRoot && !target.startsWith(destRoot + path.sep)) return null;

    const index = path.join(target, "index.html");
    const candidates = [];
    if (!p.endsWith("/")) candidates.push(target);
    if (!p.endsWith("/") && !path.extname(target)) candidates.push(target + ".html");
    candidates.push(index);

    for (const c of candidates) {
      try {
        const s = await stat(c);
        if (!s.isFile()) continue;
        if (c === index && !p.endsWith("/")) {
          return { redirect: folderUrl(target) + (q < 0 ? "" : url.slice(q)) };
        }
        return { file: c };
      } catch {}
    }
    return null;
  }

  return async (req, res) => {
    try {
      const found = await resolveFile(req.url ?? "/");
      if (!found) {
        res.statusCode = 404;
        res.setHeader("content-type", "text/plain; charset=utf-8");
        res.end("404 Not Found\n");
        log(req, 404);
        return;
      }
      // Nothing is cached, a redirect included: the tree changes under the
      // browser, and a folder page can become a single-file one.
      res.setHeader("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
      if (found.redirect) {
        res.statusCode = 301;
        res.setHeader("location", found.redirect);
        res.end();
        return;
      }
      const { file } = found;
      const ext = path.extname(file).toLowerCase();
      let data = await readFile(file);
      if (transformHtml && ext === ".html") data = transformHtml(data.toString("utf8"), file);

      res.statusCode = 200;
      res.setHeader("content-type", MIME[ext] ?? "application/octet-stream");
      res.end(data);
    } catch (err) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end("500 Internal Server Error\n");
      log(req, 500, err?.message ?? String(err));
    }
  };
}
