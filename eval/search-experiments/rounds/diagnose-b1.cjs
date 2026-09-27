// Phase 3.1 -- re-verify A.4 buckets under B (V2 data + V4b query tokenizer).
"use strict";
const fs = require("fs");
const path = require("path");
const { buildB, H } = require("./config-b.cjs");

const SCRIPT_DIR = __dirname;
const symbolIndex = H.loadSymbols(path.join(SCRIPT_DIR, "symbols.json"));
const queries = H.buildQuerySet(symbolIndex, null);
const bareQueries = queries.filter((q) => q.category === "symbol-bare");

const ctx = buildB("data-v2.json");
const { docs, runQueryB } = ctx;

// index entries by normalized full url and by page path
const byExactUrl = new Map();
const byPathUrl = new Map();
for (const [id, e] of Object.entries(docs)) {
  const n = H.normalizeUrl(e.relUrl);
  if (!byExactUrl.has(n)) byExactUrl.set(n, []);
  byExactUrl.get(n).push({ id, ...e });
  const p = H.pathOnly(e.relUrl);
  if (!byPathUrl.has(p)) byPathUrl.set(p, []);
  byPathUrl.get(p).push({ id, ...e });
}

const misses = [];
for (const q of bareQueries) {
  const results = runQueryB(q.q);
  const expectedSet = new Set(q.expected);
  let firstHitRank = null;
  for (let i = 0; i < results.length; i++) {
    if (expectedSet.has(H.normalizeUrl(docs[results[i].ref]?.relUrl))) { firstHitRank = i + 1; break; }
  }
  const hit10 = firstHitRank !== null && firstHitRank <= 10;
  if (!hit10) {
    // ground-truth symbol record(s) for this name
    const gtSymbols = symbolIndex.symbols.filter((s) => s.name.toLowerCase() === q.q.toLowerCase());
    misses.push({
      q: q.q,
      expected: q.expected,
      firstHitRank,
      resultCount: results.length,
      kinds: [...new Set(gtSymbols.map((s) => s.kind))],
      containers: [...new Set(gtSymbols.map((s) => s.container).filter(Boolean))],
      packages: [...new Set(gtSymbols.map((s) => s.package).filter(Boolean))],
    });
  }
}

fs.writeFileSync(path.join(SCRIPT_DIR, "misses-B.json"), JSON.stringify(misses, null, 1));
console.log(`Under B: ${misses.length} of ${bareQueries.length} bare-name queries miss top10 (${((100*misses.length)/bareQueries.length).toFixed(1)}%)`);

// ---- Categorize causes with evidence ----
const GENERIC = new Set(["see also", "example", "examples", "remarks", "parameters", "return value", "syntax", "notes"]);
const OPERATOR_RE = /^[^A-Za-z0-9_$]+$/; // pure symbol/operator name, no letters/digits

const buckets = {
  "pure-operator-symbol": [],
  "no-exact-entry-any-heading-level": [], // expected anchor doesn't exist as its own entry even after folding
  "exact-entry-exists-title-mismatch": [],
  "exact-entry-exists-crowded": [],
};

for (const m of misses) {
  if (OPERATOR_RE.test(m.q)) { buckets["pure-operator-symbol"].push(m); continue; }
  const exact = m.expected.flatMap((u) => byExactUrl.get(u) || []);
  if (exact.length === 0) { buckets["no-exact-entry-any-heading-level"].push(m); continue; }
  const titleMatch = exact.some((e) => e.title.toLowerCase() === m.q.toLowerCase());
  if (!titleMatch) buckets["exact-entry-exists-title-mismatch"].push({ ...m, titles: exact.map((e) => e.title) });
  else buckets["exact-entry-exists-crowded"].push({ ...m, titles: exact.map((e) => e.title) });
}

console.log("\n--- buckets ---");
for (const [name, arr] of Object.entries(buckets)) {
  console.log(`${name}: ${arr.length} (${((100 * arr.length) / misses.length).toFixed(1)}%)`);
}

// Group "no-exact-entry" and "title-mismatch" (the two biggest, most
// interesting buckets) by ground-truth URL PAGE (path before any anchor)
// and by symbol kind, to see the real shape of the "folded into one big
// page" story.
function groupByPageAndKind(arr, label) {
  console.log(`\n=== ${label}: grouped by ground-truth page ===`);
  const byPage = new Map();
  for (const m of arr) {
    for (const u of m.expected) {
      const page = H.pathOnly(u);
      if (!byPage.has(page)) byPage.set(page, []);
      byPage.get(page).push(m);
    }
  }
  const sorted = [...byPage.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [page, ms] of sorted.slice(0, 15)) {
    const kinds = [...new Set(ms.flatMap((m) => m.kinds))];
    console.log(`  ${String(ms.length).padStart(3)}  ${page}  kinds=${kinds.join(",")}  e.g. ${ms.slice(0, 3).map((m) => m.q).join(", ")}`);
  }
  console.log(`  ... ${sorted.length} distinct pages total`);
}

groupByPageAndKind(buckets["no-exact-entry-any-heading-level"], "no-exact-entry (folded, no distinct entry at any level)");
groupByPageAndKind(buckets["exact-entry-exists-title-mismatch"], "title-mismatch (entry exists, title differs from name)");

console.log("\n--- examples: title-mismatch, showing actual titles ---");
for (const m of buckets["exact-entry-exists-title-mismatch"].slice(0, 8)) {
  console.log(`  "${m.q}" (kind=${m.kinds.join(",")}) expected=${m.expected} actualTitles=${JSON.stringify(m.titles)}`);
}
console.log("\n--- examples: crowded (title matches exactly but still misses top10) ---");
for (const m of buckets["exact-entry-exists-crowded"].slice(0, 8)) {
  console.log(`  "${m.q}" (kind=${m.kinds.join(",")}) rank=${m.firstHitRank}`);
}
console.log("\n--- examples: pure-operator-symbol ---");
for (const m of buckets["pure-operator-symbol"].slice(0, 6)) {
  console.log(`  "${m.q}" (kind=${m.kinds.join(",")}) expected=${m.expected}`);
}
