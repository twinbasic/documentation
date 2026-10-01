import fs from "node:fs";
import { resolvePaths, loadLunr } from "./site_search.mjs";
import { buildIndex, search } from "./variants.mjs";

const SITE = process.argv[2];
function normalizeUrl(u) {
  if (!u) return u;
  const h = u.indexOf("#");
  let p = h === -1 ? u : u.slice(0, h);
  const a = h === -1 ? "" : u.slice(h + 1);
  p = p.replace(/\/index(\.html)?$/i, "").replace(/\/+$/, "");
  if (p === "") p = "/";
  return a ? `${p}#${a}` : p;
}
function pathOnly(u) {
  const n = normalizeUrl(u);
  const h = n.indexOf("#");
  return h === -1 ? n : n.slice(0, h);
}

const { dataPath } = resolvePaths(SITE);
const lunrPath = resolvePaths(SITE).lunrPath;
const lunr = loadLunr(lunrPath);
const docsRaw = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const opts = { x1: 200, x2: 20, x3: true };
const ctx = { lunr, index: buildIndex(lunr, docsRaw, opts), docs: docsRaw };
const results = search(ctx, "symbol index", opts);
console.log(
  "symbol index rank:",
  results.findIndex((r) => pathOnly(ctx.docs[r.ref].relUrl) === "/Documentation/Development/Building") + 1 ||
    "not found in",
  results.length,
);
