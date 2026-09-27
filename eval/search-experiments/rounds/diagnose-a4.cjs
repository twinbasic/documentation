// Ad-hoc: bucket h3 bare-name misses (not in top 10) by cause.
const fs = require("fs");
const path = require("path");
const REPO = "D:/OCP/wc/twinBASIC-documentation/.claude/worktrees/hopeful-dewdney-03ae03";
const lunrPath = path.join(REPO, "builder/vendor/just-the-docs/assets/js/vendor/lunr.min.js");

function normalizeUrl(u) {
  if (!u) return u;
  const h = u.indexOf("#");
  let p = h === -1 ? u : u.slice(0, h);
  const a = h === -1 ? "" : u.slice(h + 1);
  p = p.replace(/\/index(\.html)?$/i, "").replace(/\/+$/, "");
  if (p === "") p = "/";
  return a ? `${p}#${a}` : p;
}
function pathOnly(u) { const n = normalizeUrl(u); const h = n.indexOf("#"); return h === -1 ? n : n.slice(0, h); }

const results = JSON.parse(fs.readFileSync("results-full.json", "utf8"));
const h3 = results.find((r) => r.label === "data-h3");
const queries = JSON.parse(fs.readFileSync("queries.json", "utf8"));
const docs = JSON.parse(fs.readFileSync("data-h3.json", "utf8"));

// Build relUrl -> [entries] index (normalized, path-only too)
const byExactUrl = new Map();
const byPathUrl = new Map();
for (const [id, e] of Object.entries(docs)) {
  const n = normalizeUrl(e.relUrl);
  if (!byExactUrl.has(n)) byExactUrl.set(n, []);
  byExactUrl.get(n).push({ id, ...e });
  const p = pathOnly(e.relUrl);
  if (!byPathUrl.has(p)) byPathUrl.set(p, []);
  byPathUrl.get(p).push({ id, ...e });
}

const missed = h3.perQuery.filter((r) => r.category === "symbol-bare" && !r.hit10);
console.log(`${missed.length} of ${h3.perQuery.filter((r) => r.category === "symbol-bare").length} symbol-bare queries missed top 10 at h3\n`);

const buckets = { "no-exact-entry-folded": [], "title-mismatch": [], "crowded-out": [], "other": [] };

for (const m of missed) {
  const q = queries.find((x) => x.category === "symbol-bare" && x.q === m.q);
  const expected = q.expected; // already normalized
  const exactEntries = expected.flatMap((u) => byExactUrl.get(u) || []);
  const pathEntries = expected.flatMap((u) => byPathUrl.get(pathOnly(u)) || []);

  if (exactEntries.length === 0) {
    // No entry at the exact expected anchor. Does the *page* exist at all
    // (just under a coarser/different anchor -- folded)?
    buckets["no-exact-entry-folded"].push({ q: m.q, expected, note: pathEntries.length ? `page exists (${pathEntries.length} other section(s) on it)` : "page itself missing from index" });
    continue;
  }
  const exactTitleMatch = exactEntries.some((e) => e.title.toLowerCase() === m.q.toLowerCase());
  if (!exactTitleMatch) {
    buckets["title-mismatch"].push({ q: m.q, expected, titles: exactEntries.map((e) => e.title) });
    continue;
  }
  buckets["crowded-out"].push({ q: m.q, expected, rank: m.firstHitRank, titles: exactEntries.map((e) => e.title) });
}

for (const [name, arr] of Object.entries(buckets)) {
  console.log(`\n=== ${name}: ${arr.length} (${((100 * arr.length) / missed.length).toFixed(1)}%) ===`);
  console.log(JSON.stringify(arr.slice(0, 4), null, 1));
}
