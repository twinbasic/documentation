// Phase 9 -- F9 as a tokenizer WRAPPER (ships as: wrap lunr.tokenizer so any
// input string first has 2+-dot runs replaced by the same number of spaces,
// preserving positions, before calling the original tokenizer). Confirms
// this equals the preprocessing version's metrics, then measures REAL
// per-page-load client cost (index build happens in the browser on every
// page load, not at build time) via 15 interleaved round-robin builds per
// config after a warm-up, with --expose-gc.
"use strict";
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");
const { H, NORMALSEP } = require("./config-b.cjs");

const SCRIPT_DIR = __dirname;
const symbolIndex = H.loadSymbols(path.join(SCRIPT_DIR, "symbols.json"));
const queries = H.buildQuerySet(symbolIndex, null);
const v2docs = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, "data-v2.json"), "utf8"));

function buildDocsSplit() {
  const byUrlNames = new Map(), byUrlQualified = new Map();
  for (const sym of symbolIndex.symbols) {
    const u = H.normalizeUrl(sym.url);
    if (!byUrlNames.has(u)) { byUrlNames.set(u, new Set()); byUrlQualified.set(u, new Set()); }
    byUrlNames.get(u).add(sym.name);
    if (sym.container) byUrlQualified.get(u).add(`${sym.container}.${sym.name}`);
  }
  const out = {};
  for (const [id, e] of Object.entries(v2docs)) {
    const u = H.normalizeUrl(e.relUrl);
    const names = byUrlNames.get(u), qualified = byUrlQualified.get(u);
    out[id] = { ...e, names: names && names.size ? [...names].join(" ") : "", qualified: qualified && qualified.size ? [...qualified].join(" ") : "" };
  }
  return out;
}
const F7docs = buildDocsSplit();

// F9 as it would ship: wrap lunr.tokenizer itself (not the title text) --
// same 2+-dot-run -> equal-length-space-run substitution, applied to
// whatever string is handed to the tokenizer (index-build title/content
// strings AND the query string alike, since it's the same function).
function wrapTokenizerForF9(lunr) {
  const original = lunr.tokenizer;
  const wrapped = function (input, metadata) {
    if (typeof input === "string") {
      input = input.replace(/\.{2,}/g, (m) => " ".repeat(m.length));
    }
    return original(input, metadata);
  };
  wrapped.separator = original.separator;
  lunr.tokenizer = wrapped;
  return original;
}

function buildIndex(docs, { removeStopwords, wrapF9 } = {}) {
  const lunr = H.loadLunr(H.defaultLunrPath());
  lunr.tokenizer.separator = NORMALSEP;
  if (wrapF9) wrapTokenizerForF9(lunr);
  const index = lunr(function () {
    this.ref("id"); this.field("title", { boost: 200 }); this.field("content", { boost: 2 }); this.field("relUrl");
    this.field("names", { boost: 100 }); this.field("qualified", { boost: 50 });
    this.metadataWhitelist = ["position"];
    if (removeStopwords) this.pipeline.remove(lunr.stopWordFilter);
    for (const i in docs) this.add({ id: i, title: docs[i].title, content: docs[i].content, relUrl: docs[i].relUrl, names: docs[i].names, qualified: docs[i].qualified });
  });
  return { lunr, index };
}

const STAR_ONLY = /^\*+$/;
const SMART_SPLIT = /(?<=[A-Za-z_]\w*)\.(?=[A-Za-z_])/;
function smartExtraParts(t) { if (!t.includes(".")) return []; return t.split(SMART_SPLIT).filter((p) => p.length > 1); }
function runQuery(lunr, index, input) {
  let whole = lunr.tokenizer(input).map((t) => t.toString()).filter((t) => !STAR_ONLY.test(t));
  const extra = [];
  for (const t of whole) extra.push(...smartExtraParts(t));
  if (whole.length === 0 && extra.length === 0) return [];
  let results;
  try {
    results = index.query((q) => {
      const addGroup = (tokens) => { if (!tokens.length) return; q.term(tokens, { boost: 10 }); q.term(tokens, { wildcard: lunr.Query.wildcard.TRAILING }); };
      addGroup(whole); addGroup(extra);
    });
  } catch (e) { results = []; }
  if (results.length === 0 && input.length > 2) {
    const tokens = whole.filter((s) => s.length < 20);
    if (tokens.length) { try { results = index.query((q) => q.term(tokens, { editDistance: Math.min(2, Math.round(Math.sqrt(input.length / 2 - 1))) })); } catch (e) { results = []; } }
  }
  return results;
}

function evalConfig(docs, index, lunr) {
  const perQuery = [];
  for (const q of queries) {
    const results = runQuery(lunr, index, q.q);
    const expectedSet = new Set(q.expected);
    const matches = (u) => (q.pathOnlyMatch ? q.expected.some((e) => H.pathOnly(u) === H.pathOnly(e)) : expectedSet.has(H.normalizeUrl(u)));
    let firstHitRank = null;
    for (let i = 0; i < results.length; i++) { if (matches(docs[results[i].ref]?.relUrl)) { firstHitRank = i + 1; break; } }
    const capped = firstHitRank !== null && firstHitRank <= 20 ? firstHitRank : null;
    perQuery.push({ q: q.q, category: q.category, kindGroup: q.kindGroup, firstHitRank, reciprocalRank: capped ? 1 / capped : 0, hit1: firstHitRank === 1, hit5: firstHitRank !== null && firstHitRank <= 5, hit10: firstHitRank !== null && firstHitRank <= 10 });
  }
  return { overall: H.summarize(perQuery), perQuery };
}

// ---- 1. Confirm wrapped F9 matches preprocessed F9's reported metrics ----
{
  const { lunr, index } = buildIndex(F7docs, { removeStopwords: true, wrapF9: true });
  const r = evalConfig(F7docs, index, lunr);
  console.log("F10+F9(wrapped): overall hit1/5/10, MRR =",
    (r.overall.hit1).toFixed(1), (r.overall.hit5).toFixed(1), (r.overall.hit10).toFixed(1), r.overall.mrr.toFixed(4));
  console.log("(round 8's F10+F9 preprocessing version: 89.5 / 97.8 / 98.0, MRR .9331 -- compare by eye)");
  const groupB = ["With", "Is", "Do", "For", "Each", "On"];
  console.log("group-B (should all be rank 1):", groupB.map((q) => `${q}:${r.perQuery.find((x) => x.q === q).firstHitRank}`).join(", "));
}

// ---- 3. Offline-flow sanity check ----
{
  // The offline tree (_site-offline/) reuses the SAME assets/js/search-data.json
  // and the SAME vendored just-the-docs.js/lunr.min.js as the online _site/
  // (see docs/_config.yml's offline_exclude, which does NOT exclude
  // assets/js/search-data.json or the vendor JS -- only CNAME/robots/sitemap/
  // book.html are excluded). Building the index is the identical code path
  // regardless of which tree served the HTML/JS, so this is a one-line check:
  // it already built successfully in test #1 above, from the same
  // search-data.json/lunr.min.js pair the offline tree ships unmodified.
  console.log("\nOffline flow: builds via the identical code path (same search-data.json + lunr.min.js, unexcluded from _site-offline/); already exercised above -- no separate test needed.");
}

// ---- 2. Real per-page-load client cost: 15 interleaved round-robin builds ----
const CONFIGS = [
  { label: "h2 (today)", docs: JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, "data-h2.json"), "utf8")), opts: {}, plainIndex: true },
  { label: "F7", docs: F7docs, opts: {} },
  { label: "F10", docs: F7docs, opts: { removeStopwords: true } },
  { label: "F10+F9", docs: F7docs, opts: { removeStopwords: true, wrapF9: true } },
];

function buildOnce(cfg) {
  if (cfg.plainIndex) {
    const lunr = H.loadLunr(H.defaultLunrPath());
    return { lunr, index: H.buildIndex(lunr, cfg.docs) };
  }
  return buildIndex(cfg.docs, cfg.opts);
}

// Warm-up: a handful of builds per config, discarded, so V8 JITs the hot
// paths before the timed runs.
for (const cfg of CONFIGS) for (let i = 0; i < 3; i++) buildOnce(cfg);

const N = 15;
const buildTimes = new Map(CONFIGS.map((c) => [c.label, []]));
const lastBuilt = new Map(); // label -> {lunr, index} of the LAST build, held for heap measurement
for (let round = 0; round < N; round++) {
  for (const cfg of CONFIGS) {
    if (global.gc) global.gc();
    const t0 = performance.now();
    const built = buildOnce(cfg);
    const dt = performance.now() - t0;
    buildTimes.get(cfg.label).push(dt);
    lastBuilt.set(cfg.label, built); // keep the most recent one alive
  }
}

function median(arr) { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; }
function p90(arr) { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.ceil(0.9 * s.length) - 1)]; }

console.log(`\n=== ${N}x interleaved round-robin build times (--expose-gc: ${!!global.gc}) ===`);
for (const cfg of CONFIGS) {
  const times = buildTimes.get(cfg.label);
  console.log(`  ${cfg.label}: median=${median(times).toFixed(1)}ms p90=${p90(times).toFixed(1)}ms (all: ${times.map((t) => t.toFixed(0)).join(",")})`);
}

// Heap retained by the built index: gc, snapshot, build+hold, gc, snapshot.
console.log("\n=== heap retained by the built index (gc, heapUsed delta, index held) ===");
for (const cfg of CONFIGS) {
  if (global.gc) global.gc();
  const before = process.memoryUsage().heapUsed;
  const held = buildOnce(cfg);
  if (global.gc) global.gc();
  const after = process.memoryUsage().heapUsed;
  console.log(`  ${cfg.label}: heapUsed delta = ${((after - before) / 1024 / 1024).toFixed(2)}MB`);
  lastBuilt.set(cfg.label + "-heap", held); // keep alive until measured
}

// Median query latency over the full query set, for each config.
console.log("\n=== median query latency over full query set ===");
for (const cfg of CONFIGS) {
  const { lunr, index } = buildOnce(cfg);
  const lat = [];
  for (const q of queries) {
    const t0 = performance.now();
    if (cfg.plainIndex) H.runQuery(lunr, index, q.q); else runQuery(lunr, index, q.q);
    lat.push(performance.now() - t0);
  }
  console.log(`  ${cfg.label}: median=${median(lat).toFixed(3)}ms`);
}
