// Phase 3.2 -- regressions of B (V2+V4b) vs h2 baseline, ALL query types.
"use strict";
const fs = require("fs");
const path = require("path");
const { buildB, H } = require("./config-b.cjs");

const SCRIPT_DIR = __dirname;
const symbolIndex = H.loadSymbols(path.join(SCRIPT_DIR, "symbols.json"));
const queries = H.buildQuerySet(symbolIndex, null);

function evalAll(runFn, docs) {
  const out = [];
  for (const q of queries) {
    const results = runFn(q.q);
    const expectedSet = new Set(q.expected);
    const matches = (u) => (q.pathOnlyMatch ? q.expected.some((e) => H.pathOnly(u) === H.pathOnly(e)) : expectedSet.has(H.normalizeUrl(u)));
    let firstHitRank = null;
    for (let i = 0; i < results.length; i++) {
      if (matches(docs[results[i].ref]?.relUrl)) { firstHitRank = i + 1; break; }
    }
    out.push({ q: q.q, category: q.category, kindGroup: q.kindGroup, firstHitRank });
  }
  return out;
}

// h2 baseline: normal client logic, no dot-tokenizer, unfolded data.
const h2docs = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, "data-h2.json"), "utf8"));
const lunrH2 = H.loadLunr(H.defaultLunrPath());
const idxH2 = H.buildIndex(lunrH2, h2docs);
function runH2(input) { return H.runQuery(lunrH2, idxH2, input); }

const b = buildB("data-v2.json");

const resH2 = evalAll(runH2, h2docs);
const resB = evalAll(b.runQueryB, b.docs);

const rank = (r) => (r === null ? Infinity : r); // treat "not found" as worst
let worse = 0, better = 0, unchanged = 0;
const deltas = [];
for (let i = 0; i < resH2.length; i++) {
  const a = resH2[i], c = resB[i];
  const ra = rank(a.firstHitRank), rc = rank(c.firstHitRank);
  if (ra === rc) unchanged++;
  else if (rc > ra) { worse++; deltas.push({ q: a.q, category: a.category, kindGroup: a.kindGroup, rankH2: a.firstHitRank, rankB: c.firstHitRank, delta: (rc === Infinity ? 999 : rc) - (ra === Infinity ? -1 : ra) }); }
  else better++;
}
console.log(`Total queries: ${resH2.length}`);
console.log(`worse: ${worse}  better: ${better}  unchanged: ${unchanged}`);

// Histogram of magnitude of regression (rank delta buckets)
const histBuckets = [[1, 1], [2, 5], [6, 10], [11, 20], [21, 50], [51, Infinity]];
console.log("\nHistogram of regression magnitude (rank delta):");
for (const [lo, hi] of histBuckets) {
  const n = deltas.filter((d) => d.delta >= lo && d.delta <= hi).length;
  console.log(`  ${lo}-${hi === Infinity ? "inf" : hi}: ${n}`);
}
const lostEntirely = deltas.filter((d) => d.rankB === null).length;
console.log(`  of which "found at h2, not found at all (out of ${queries.length > 0 ? "" : ""}top-of-results) at B": ${lostEntirely}`);

// Group regressions by cause via simple heuristics + lookups.
function normPage(u) { return H.pathOnly(u); }
const causes = { "enum-constant (length-norm/table-row)": 0, "prose-title-collision": 0, "qualified-still-broken": 0, "other": 0 };
const causeExamples = { "enum-constant (length-norm/table-row)": [], "prose-title-collision": [], "qualified-still-broken": [], "other": [] };
for (const d of deltas) {
  let cause = "other";
  if (d.category === "symbol-bare") {
    const sym = symbolIndex.symbols.find((s) => s.name.toLowerCase() === d.q.toLowerCase());
    if (sym && sym.kind === "enumvalue") cause = "enum-constant (length-norm/table-row)";
  } else if (d.category === "prose") {
    cause = "prose-title-collision";
  } else if (d.category === "symbol-qualified") {
    cause = "qualified-still-broken";
  }
  causes[cause]++;
  if (causeExamples[cause].length < 4) causeExamples[cause].push(d);
}
console.log("\nRegressions grouped by cause:");
for (const [c, n] of Object.entries(causes)) {
  console.log(`  ${c}: ${n}`);
  for (const ex of causeExamples[c]) console.log(`     "${ex.q}" [${ex.category}] rank ${ex.rankH2} -> ${ex.rankB}`);
}

deltas.sort((x, y) => y.delta - x.delta);
console.log("\nTop 20 worst regressions (by rank delta):");
for (const d of deltas.slice(0, 20)) {
  console.log(`  [${d.category}] "${d.q}": rank ${d.rankH2 ?? "none"} -> ${d.rankB ?? "none"} (delta=${d.delta})`);
}

fs.writeFileSync(path.join(SCRIPT_DIR, "regressions-B-vs-h2.json"), JSON.stringify({ worse, better, unchanged, deltas }, null, 1));
console.log("\nFull list -> regressions-B-vs-h2.json");
