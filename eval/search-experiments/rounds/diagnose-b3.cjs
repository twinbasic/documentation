// Phase 3.3 -- V5 (symbols field) and V6 (BM25 b tuning) on top of B (V2 data
// + V4b query-time '.' tokenizer).
"use strict";
const fs = require("fs");
const path = require("path");
const { H, DOTSEP, NORMALSEP } = require("./config-b.cjs");

const SCRIPT_DIR = __dirname;
const symbolIndex = H.loadSymbols(path.join(SCRIPT_DIR, "symbols.json"));
const queries = H.buildQuerySet(symbolIndex, null);
const v2docs = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, "data-v2.json"), "utf8"));

// ---- seeded 50/50 split of symbols.json's symbols array (deterministic) ----
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(42);
const shuffled = symbolIndex.symbols.map((s, i) => ({ s, r: rng() })).sort((a, b) => a.r - b.r).map((x) => x.s);
const half = Math.floor(shuffled.length / 2);
const includeSet = new Set(shuffled.slice(0, half));
const excludeSet = new Set(shuffled.slice(half));
console.log(`Seeded split: ${includeSet.size} include / ${excludeSet.size} exclude of ${symbolIndex.symbols.length} symbols`);

function symbolNamesFor(sym) {
  const names = [sym.name];
  if (sym.container) names.push(`${sym.container}.${sym.name}`);
  return names;
}

// Build a relUrl(normalized) -> "symbols" text map, optionally restricted to
// a subset of symbol records.
function buildSymbolsField(subsetSet) {
  const byUrl = new Map();
  for (const sym of symbolIndex.symbols) {
    if (subsetSet && !subsetSet.has(sym)) continue;
    const u = H.normalizeUrl(sym.url);
    if (!byUrl.has(u)) byUrl.set(u, new Set());
    for (const n of symbolNamesFor(sym)) byUrl.get(u).add(n);
  }
  return byUrl;
}

function docsWithSymbolsField(docs, byUrl) {
  const out = {};
  for (const [id, e] of Object.entries(docs)) {
    const names = byUrl.get(H.normalizeUrl(e.relUrl));
    out[id] = { ...e, symbols: names ? [...names].join(" ") : "" };
  }
  return out;
}

// ---- custom index builder: title/content/relUrl as usual, plus an
// optional "symbols" field at a given boost, plus an optional BM25 b.
function buildIndexCustom(lunr, docs, { symbolsBoost = null, bmB = null } = {}) {
  lunr.tokenizer.separator = NORMALSEP;
  return lunr(function () {
    this.ref("id");
    this.field("title", { boost: 200 });
    this.field("content", { boost: 2 });
    this.field("relUrl");
    if (symbolsBoost) this.field("symbols", { boost: symbolsBoost });
    if (bmB !== null) this.b(bmB);
    this.metadataWhitelist = ["position"];
    for (const i in docs) {
      const rec = { id: i, title: docs[i].title, content: docs[i].content, relUrl: docs[i].relUrl };
      if (symbolsBoost) rec.symbols = docs[i].symbols || "";
      this.add(rec);
    }
  });
}

function runQueryDot(lunr, index, input) {
  const saved = lunr.tokenizer.separator;
  lunr.tokenizer.separator = DOTSEP;
  const tokens = lunr.tokenizer(input);
  lunr.tokenizer.separator = saved;
  let results;
  try {
    results = index.query((q) => { q.term(tokens, { boost: 10 }); q.term(tokens, { wildcard: lunr.Query.wildcard.TRAILING }); });
  } catch (e) { results = []; }
  if (results.length === 0 && input.length > 2) {
    const filtered = tokens.filter((t) => t.str.length < 20);
    if (filtered.length) {
      try { results = index.query((q) => q.term(filtered, { editDistance: Math.min(2, Math.round(Math.sqrt(input.length / 2 - 1))) })); } catch (e) { results = []; }
    }
  }
  return results;
}

function evalConfig(label, docs, opts, queriesSubset) {
  const qs = queriesSubset || queries;
  const lunr = H.loadLunr(H.defaultLunrPath());
  const index = buildIndexCustom(lunr, docs, opts);
  const perQuery = [];
  for (const q of qs) {
    const results = runQueryDot(lunr, index, q.q);
    const expectedSet = new Set(q.expected);
    const matches = (u) => (q.pathOnlyMatch ? q.expected.some((e) => H.pathOnly(u) === H.pathOnly(e)) : expectedSet.has(H.normalizeUrl(u)));
    let firstHitRank = null;
    for (let i = 0; i < results.length; i++) { if (matches(docs[results[i].ref]?.relUrl)) { firstHitRank = i + 1; break; } }
    const capped = firstHitRank !== null && firstHitRank <= 20 ? firstHitRank : null;
    perQuery.push({ q: q.q, category: q.category, kindGroup: q.kindGroup, firstHitRank, reciprocalRank: capped ? 1 / capped : 0, hit1: firstHitRank === 1, hit5: firstHitRank !== null && firstHitRank <= 5, hit10: firstHitRank !== null && firstHitRank <= 10 });
  }
  const overall = H.summarize(perQuery);
  const byCategory = { "symbol-bare": H.summarize(perQuery, (r) => r.category === "symbol-bare"), "symbol-qualified": H.summarize(perQuery, (r) => r.category === "symbol-qualified"), prose: H.summarize(perQuery, (r) => r.category === "prose") };
  const byKind = { type: H.summarize(perQuery, (r) => r.kindGroup === "type"), member: H.summarize(perQuery, (r) => r.kindGroup === "member") };
  return { label, overall, byCategory, byKind, perQuery };
}

function fmtPct(x) { return `${x.toFixed(1)}%`; }
function printSummary(r) {
  console.log(`\n=== ${r.label} ===`);
  console.log(`  overall n=${r.overall.n} hit@1=${fmtPct(r.overall.hit1)} hit@5=${fmtPct(r.overall.hit5)} hit@10=${fmtPct(r.overall.hit10)} MRR=${r.overall.mrr.toFixed(4)}`);
  for (const cat of ["symbol-bare", "symbol-qualified", "prose"]) {
    const s = r.byCategory[cat];
    if (s) console.log(`  ${cat}: n=${s.n} hit@10=${fmtPct(s.hit10)} MRR=${s.mrr.toFixed(4)}`);
  }
  for (const k of ["type", "member"]) {
    const s = r.byKind[k];
    if (s) console.log(`  kind=${k}: n=${s.n} hit@10=${fmtPct(s.hit10)} MRR=${s.mrr.toFixed(4)}`);
  }
}

// ---------------------------------------------------------------- V5 (full)
const fullField = buildSymbolsField(null);
const docsFull = docsWithSymbolsField(v2docs, fullField);
const v5_50 = evalConfig("V5 boost=50 (full symbols field)", docsFull, { symbolsBoost: 50 });
const v5_200 = evalConfig("V5 boost=200 (full symbols field)", docsFull, { symbolsBoost: 200 });
printSummary(v5_50);
printSummary(v5_200);

// ------------------------------------------------------- V5 held-out check
const halfField = buildSymbolsField(includeSet);
const docsHalf = docsWithSymbolsField(v2docs, halfField);
// classify each bare-name query: held-in if >=1 of its ground-truth symbols
// is in includeSet; held-out only if ALL of its symbols are in excludeSet.
function classify(q) {
  const syms = symbolIndex.symbols.filter((s) => s.name.toLowerCase() === q.q.toLowerCase());
  if (syms.length === 0) return "unknown";
  return syms.every((s) => excludeSet.has(s)) ? "held-out" : "held-in";
}
const bareQueries = queries.filter((q) => q.category === "symbol-bare");
const heldIn = bareQueries.filter((q) => classify(q) === "held-in");
const heldOut = bareQueries.filter((q) => classify(q) === "held-out");
console.log(`\nHeld-out check: ${heldIn.length} held-in bare queries, ${heldOut.length} held-out bare queries`);

const v5_half_boost = 200; // best boost from the full-field test, applied to the 50%-built field
const v5_heldIn = evalConfig("V5-half (boost 200) on HELD-IN queries", docsHalf, { symbolsBoost: v5_half_boost }, heldIn);
const v5_heldOut = evalConfig("V5-half (boost 200) on HELD-OUT queries", docsHalf, { symbolsBoost: v5_half_boost }, heldOut);
// baseline (B, no symbols field) on the same two query subsets, for comparison
const v5_base_heldIn = evalConfig("B (no symbols field) on HELD-IN queries", v2docs, {}, heldIn);
const v5_base_heldOut = evalConfig("B (no symbols field) on HELD-OUT queries", v2docs, {}, heldOut);
printSummary(v5_heldIn);
printSummary(v5_heldOut);
printSummary(v5_base_heldIn);
printSummary(v5_base_heldOut);

// ---------------------------------------------------------------- V6
const v6_b050 = evalConfig("V6 b=0.5", v2docs, { bmB: 0.5 });
const v6_b025 = evalConfig("V6 b=0.25", v2docs, { bmB: 0.25 });
printSummary(v6_b050);
printSummary(v6_b025);

// V6 + best V5 (boost 200, full field)
const v6combo_050 = evalConfig("V6(b=0.5) + V5(boost200,full)", docsFull, { symbolsBoost: 200, bmB: 0.5 });
const v6combo_025 = evalConfig("V6(b=0.25) + V5(boost200,full)", docsFull, { symbolsBoost: 200, bmB: 0.25 });
printSummary(v6combo_050);
printSummary(v6combo_025);

// Baseline B for reference (already computed as v2 with no symbols/bm change)
const bBase = evalConfig("B (V2+V4b) reference", v2docs, {});
printSummary(bBase);

fs.writeFileSync(path.join(SCRIPT_DIR, "results-v5-v6.json"), JSON.stringify({
  bBase, v5_50, v5_200, v5_heldIn, v5_heldOut, v5_base_heldIn, v5_base_heldOut,
  v6_b050, v6_b025, v6combo_050, v6combo_025,
}, null, 1));
console.log("\nFull results -> results-v5-v6.json");
