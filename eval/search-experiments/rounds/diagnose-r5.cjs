// Phase 8 -- F10 (remove stopWordFilter from the index pipeline) and F10+F9
// on top of F7(names=100/qualified=50) + Q-smart + guard.
"use strict";
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { performance } = require("perf_hooks");
const { H, NORMALSEP } = require("./config-b.cjs");

const SCRIPT_DIR = __dirname;
const symbolIndex = H.loadSymbols(path.join(SCRIPT_DIR, "symbols.json"));
const queries = H.buildQuerySet(symbolIndex, null);
const v2docs = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, "data-v2.json"), "utf8"));

const DOTS2PLUS = /\.{2,}/g;
function preprocessF9(s) { return String(s).replace(DOTS2PLUS, " "); }

function buildDocsSplit(preprocessTitle) {
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
    out[id] = { ...e, title: preprocessTitle ? preprocessTitle(e.title) : e.title, names: names && names.size ? [...names].join(" ") : "", qualified: qualified && qualified.size ? [...qualified].join(" ") : "" };
  }
  return out;
}

function buildIndex(docs, { removeStopwords } = {}) {
  const lunr = H.loadLunr(H.defaultLunrPath());
  lunr.tokenizer.separator = NORMALSEP;
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
function makeRunQuery(preprocessQuery) {
  return function runQuery(lunr, index, rawInput) {
    const input = preprocessQuery ? preprocessQuery(rawInput) : rawInput;
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
  };
}

function evalConfig(label, docs, index, lunr, runQuery) {
  const perQuery = [];
  const latencies = [];
  for (const q of queries) {
    const t0 = performance.now();
    const results = runQuery(lunr, index, q.q);
    latencies.push(performance.now() - t0);
    const expectedSet = new Set(q.expected);
    const matches = (u) => (q.pathOnlyMatch ? q.expected.some((e) => H.pathOnly(u) === H.pathOnly(e)) : expectedSet.has(H.normalizeUrl(u)));
    let firstHitRank = null;
    for (let i = 0; i < results.length; i++) { if (matches(docs[results[i].ref]?.relUrl)) { firstHitRank = i + 1; break; } }
    const capped = firstHitRank !== null && firstHitRank <= 20 ? firstHitRank : null;
    perQuery.push({ q: q.q, category: q.category, kindGroup: q.kindGroup, firstHitRank, reciprocalRank: capped ? 1 / capped : 0, hit1: firstHitRank === 1, hit5: firstHitRank !== null && firstHitRank <= 5, hit10: firstHitRank !== null && firstHitRank <= 10 });
  }
  latencies.sort((a, b) => a - b);
  const overall = H.summarize(perQuery);
  const byCategory = { "symbol-bare": H.summarize(perQuery, (r) => r.category === "symbol-bare"), "symbol-qualified": H.summarize(perQuery, (r) => r.category === "symbol-qualified"), prose: H.summarize(perQuery, (r) => r.category === "prose") };
  const byKind = { type: H.summarize(perQuery, (r) => r.kindGroup === "type"), member: H.summarize(perQuery, (r) => r.kindGroup === "member") };
  return { label, overall, byCategory, byKind, perQuery, medianLatencyMs: latencies[Math.floor(latencies.length / 2)] };
}

const h2docs = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, "data-h2.json"), "utf8"));
const lunrH2 = H.loadLunr(H.defaultLunrPath());
const idxH2 = H.buildIndex(lunrH2, h2docs);
const h2Result = evalConfig("h2", h2docs, idxH2, lunrH2, (l, i, q) => H.runQuery(l, i, q));

function regressionsVs(cfg, refResult, excludeSlash) {
  const rank = (r) => (r === null ? Infinity : r);
  let worse = 0, better = 0, unchanged = 0;
  const hist = { "1": 0, "2-5": 0, "6-10": 0, "11-20": 0, "21-50": 0, "51+": 0 };
  const worstList = [];
  for (let i = 0; i < refResult.perQuery.length; i++) {
    const a = refResult.perQuery[i], c = cfg.perQuery[i];
    if (excludeSlash && a.q === "/") continue;
    const ra = rank(a.firstHitRank), rc = rank(c.firstHitRank);
    if (ra === rc) unchanged++;
    else if (rc > ra) { worse++; const delta = (rc === Infinity ? 999 : rc) - (ra === Infinity ? -1 : ra);
      if (delta === 1) hist["1"]++; else if (delta <= 5) hist["2-5"]++; else if (delta <= 10) hist["6-10"]++; else if (delta <= 20) hist["11-20"]++; else if (delta <= 50) hist["21-50"]++; else hist["51+"]++;
      worstList.push({ q: a.q, category: a.category, rankRef: a.firstHitRank, rankNew: c.firstHitRank, delta }); }
    else better++;
  }
  worstList.sort((x, y) => y.delta - x.delta);
  return { worse, better, unchanged, hist, worstList };
}
function fmtPct(x) { return `${x.toFixed(1)}%`; }
function printSummary(r, cost) {
  console.log(`\n=== ${r.label} ===`);
  console.log(`  overall n=${r.overall.n} hit1=${fmtPct(r.overall.hit1)} hit5=${fmtPct(r.overall.hit5)} hit10=${fmtPct(r.overall.hit10)} MRR=${r.overall.mrr.toFixed(4)}`);
  for (const cat of ["symbol-bare", "symbol-qualified", "prose"]) { const s = r.byCategory[cat]; console.log(`  ${cat}: hit10=${fmtPct(s.hit10)} MRR=${s.mrr.toFixed(4)}`); }
  for (const k of ["type", "member"]) { const s = r.byKind[k]; console.log(`  kind=${k}: hit10=${fmtPct(s.hit10)} MRR=${s.mrr.toFixed(4)}`); }
  console.log(`  median query latency: ${r.medianLatencyMs.toFixed(3)}ms`);
  if (cost) console.log(`  cost: invertedIndex terms=${cost.terms} serialized index bytes=${cost.bytes} (gzip ${cost.gzip}) build ms(median of 3)=${cost.buildMs.toFixed(1)}`);
}

function measureCost(docs, removeStopwords) {
  const times = [];
  let index, lunr;
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    ({ lunr, index } = buildIndex(docs, { removeStopwords }));
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const json = JSON.stringify(index.toJSON());
  const terms = Object.keys(index.invertedIndex).length;
  return { terms, bytes: Buffer.byteLength(json), gzip: zlib.gzipSync(json).length, buildMs: times[1], lunr, index };
}

const GROUP_B = ["With", "Is", "VB", "Do", "For", "Each", "On", "Select", "Time$", "Lock"];

// F7 (reference)
const F7docs = buildDocsSplit(null);
const f7Cost = measureCost(F7docs, false);
const F7 = evalConfig("F7", F7docs, f7Cost.index, f7Cost.lunr, makeRunQuery(null));

// F10
const f10Cost = measureCost(F7docs, true);
const F10 = evalConfig("F10", F7docs, f10Cost.index, f10Cost.lunr, makeRunQuery(null));

// F10+F9
const F9docs = buildDocsSplit(preprocessF9);
const f10f9Cost = measureCost(F9docs, true);
const F10F9 = evalConfig("F10+F9", F9docs, f10f9Cost.index, f10f9Cost.lunr, makeRunQuery(preprocessF9));

const configs = { F7: [F7, f7Cost], F10: [F10, f10Cost], "F10+F9": [F10F9, f10f9Cost] };
for (const [label, [r, cost]] of Object.entries(configs)) {
  printSummary(r, cost);
  const regH2 = regressionsVs(r, h2Result, true);
  console.log(`  vs h2 (excl "/"): worse=${regH2.worse} better=${regH2.better} unchanged=${regH2.unchanged} hist=${JSON.stringify(regH2.hist)}`);
  if (label !== "F7") {
    const regF7 = regressionsVs(r, F7, false);
    console.log(`  vs F7: worse=${regF7.worse} better=${regF7.better} unchanged=${regF7.unchanged}`);
    if (regF7.worse) console.log(`  NEW REGRESSIONS vs F7:`, regF7.worstList.slice(0, 15).map((d) => `${d.q}[${d.category}]:${d.rankRef ?? "none"}->${d.rankNew ?? "none"}`).join(", "));
  }
  console.log("  group-B queries (rank):", GROUP_B.map((q) => { const p = r.perQuery.find((x) => x.q === q); return `${q}:${p.firstHitRank ?? "none"}`; }).join(", "));
  const symIdx = r.perQuery.find((x) => x.q === "symbol index");
  console.log(`  "symbol index" prose rank: ${symIdx ? symIdx.firstHitRank : "n/a"}`);
  // scan prose queries for damage from common words
  console.log("  prose ranks:", r.perQuery.filter((x) => x.category === "prose").map((x) => `${x.q}:${x.firstHitRank ?? "none"}`).join(", "));
}

fs.writeFileSync(path.join(SCRIPT_DIR, "results-r5.json"), JSON.stringify({ F7, F10, F10F9 }, null, 1));
console.log("\nFull results -> results-r5.json");
