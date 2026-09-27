// Phase 5.2/5.3 -- candidate fixes F1-F4 on top of R = V2 + symbols(boost50)
// + Q-smart + asterisk guard, measured on the full query set.
"use strict";
const fs = require("fs");
const path = require("path");
const { H, NORMALSEP } = require("./config-b.cjs");

const SCRIPT_DIR = __dirname;
const symbolIndex = H.loadSymbols(path.join(SCRIPT_DIR, "symbols.json"));
const queries = H.buildQuerySet(symbolIndex, null);
const v2docs = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, "data-v2.json"), "utf8"));

function symbolNamesFor(sym, bareOnly) {
  const names = [sym.name];
  if (!bareOnly && sym.container) names.push(`${sym.container}.${sym.name}`);
  return names;
}
function buildSymbolsField(bareOnly) {
  const byUrl = new Map();
  for (const sym of symbolIndex.symbols) {
    const u = H.normalizeUrl(sym.url);
    if (!byUrl.has(u)) byUrl.set(u, new Set());
    for (const n of symbolNamesFor(sym, bareOnly)) byUrl.get(u).add(n);
  }
  return byUrl;
}
function docsWithSymbolsField(bareOnly) {
  const field = buildSymbolsField(bareOnly);
  const out = {};
  for (const [id, e] of Object.entries(v2docs)) {
    const names = field.get(H.normalizeUrl(e.relUrl));
    out[id] = { ...e, symbols: names ? [...names].join(" ") : "" };
  }
  return out;
}
// F2: "name" field -- title normalised into identifier words: split on any
// non-word run (so "Do...Loop" -> "do loop", "If...Then...Else" -> "if
// then else"), i.e. what the coordinator flagged: the title FIELD's own
// tokenizer never splits "Do...Loop" into "do"+"loop" because '.' isn't in
// the client's separator and lunr's trimmer only trims the ends -- the
// whole title becomes one token "do...loop" that a bare "Do" query can
// never match via title. The "name" field pre-splits it before indexing.
function nameFieldFor(title) {
  return title.split(/\W+/).filter(Boolean).join(" ");
}

const docsFull = docsWithSymbolsField(false); // Container.Name forms included (R's default)
const docsBare = docsWithSymbolsField(true); // F3: bare names only

function buildIndex({ docs, symbolsBoost, nameBoost, titleTermField = false }) {
  const lunr = H.loadLunr(H.defaultLunrPath());
  lunr.tokenizer.separator = NORMALSEP;
  const index = lunr(function () {
    this.ref("id");
    this.field("title", { boost: 200 });
    this.field("content", { boost: 2 });
    this.field("relUrl");
    if (symbolsBoost) this.field("symbols", { boost: symbolsBoost });
    if (nameBoost) this.field("name", { boost: nameBoost });
    this.metadataWhitelist = ["position"];
    for (const i in docs) {
      const rec = { id: i, title: docs[i].title, content: docs[i].content, relUrl: docs[i].relUrl };
      if (symbolsBoost) rec.symbols = docs[i].symbols || "";
      if (nameBoost) rec.name = nameFieldFor(docs[i].title);
      this.add(rec);
    }
  });
  return { lunr, index };
}

const STAR_ONLY = /^\*+$/;
const SMART_SPLIT = /(?<=[A-Za-z_]\w*)\.(?=[A-Za-z_])/;
function smartExtraParts(t) { if (!t.includes(".")) return []; return t.split(SMART_SPLIT).filter((p) => p.length > 1); }

// opts.f1Boost: number|null -- adds an exact, non-wildcard title-only term
function makeRunQuery(opts) {
  const { f1Boost = null } = opts;
  return function runQuery(lunr, index, input) {
    let whole = lunr.tokenizer(input).map((t) => t.toString()).filter((t) => !STAR_ONLY.test(t));
    const extra = [];
    for (const t of whole) extra.push(...smartExtraParts(t));
    let results = [];
    try {
      results = index.query((q) => {
        if (whole.length) {
          q.term(whole, { boost: 10 });
          q.term(whole, { wildcard: lunr.Query.wildcard.TRAILING });
          if (f1Boost) q.term(whole, { fields: ["title"], boost: f1Boost });
        }
        if (extra.length) {
          q.term(extra, { boost: 10 });
          q.term(extra, { wildcard: lunr.Query.wildcard.TRAILING });
          if (f1Boost) q.term(extra, { fields: ["title"], boost: f1Boost });
        }
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
  for (const q of queries) {
    const results = runQuery(lunr, index, q.q);
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

// h2 baseline perQuery (for regressions)
const h2docs = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, "data-h2.json"), "utf8"));
const lunrH2 = H.loadLunr(H.defaultLunrPath());
const idxH2 = H.buildIndex(lunrH2, h2docs);
const h2Result = evalConfig("h2", h2docs, idxH2, lunrH2, (l, i, q) => H.runQuery(l, i, q));

function regressionsVs(cfg, refResult) {
  const rank = (r) => (r === null ? Infinity : r);
  let worse = 0, better = 0, unchanged = 0;
  const hist = { "1": 0, "2-5": 0, "6-10": 0, "11-20": 0, "21-50": 0, "51+": 0 };
  const worstList = [];
  for (let i = 0; i < refResult.perQuery.length; i++) {
    const a = refResult.perQuery[i], c = cfg.perQuery[i];
    const ra = rank(a.firstHitRank), rc = rank(c.firstHitRank);
    if (ra === rc) unchanged++;
    else if (rc > ra) {
      worse++;
      const delta = (rc === Infinity ? 999 : rc) - (ra === Infinity ? -1 : ra);
      if (delta === 1) hist["1"]++; else if (delta <= 5) hist["2-5"]++; else if (delta <= 10) hist["6-10"]++; else if (delta <= 20) hist["11-20"]++; else if (delta <= 50) hist["21-50"]++; else hist["51+"]++;
      worstList.push({ q: a.q, category: a.category, rankRef: a.firstHitRank, rankNew: c.firstHitRank, delta });
    } else better++;
  }
  worstList.sort((x, y) => y.delta - x.delta);
  return { worse, better, unchanged, hist, worstList };
}

function fmtPct(x) { return `${x.toFixed(1)}%`; }
function printSummary(r) {
  console.log(`\n=== ${r.label} ===`);
  console.log(`  overall n=${r.overall.n} hit1=${fmtPct(r.overall.hit1)} hit5=${fmtPct(r.overall.hit5)} hit10=${fmtPct(r.overall.hit10)} MRR=${r.overall.mrr.toFixed(4)}`);
  for (const cat of ["symbol-bare", "symbol-qualified", "prose"]) { const s = r.byCategory[cat]; console.log(`  ${cat}: hit10=${fmtPct(s.hit10)} MRR=${s.mrr.toFixed(4)}`); }
  for (const k of ["type", "member"]) { const s = r.byKind[k]; console.log(`  kind=${k}: hit10=${fmtPct(s.hit10)} MRR=${s.mrr.toFixed(4)}`); }
}

const results = { h2: h2Result };
const trials = [
  { label: "R (baseline)", docs: docsFull, symbolsBoost: 50, nameBoost: null, f1Boost: null },
  { label: "F1(B=20)", docs: docsFull, symbolsBoost: 50, nameBoost: null, f1Boost: 20 },
  { label: "F1(B=50)", docs: docsFull, symbolsBoost: 50, nameBoost: null, f1Boost: 50 },
  { label: "F1(B=100)", docs: docsFull, symbolsBoost: 50, nameBoost: null, f1Boost: 100 },
  { label: "F2(name=50)", docs: docsFull, symbolsBoost: 50, nameBoost: 50, f1Boost: null },
  { label: "F2(name=100)", docs: docsFull, symbolsBoost: 50, nameBoost: 100, f1Boost: null },
  { label: "F3(bare-only,boost50)", docs: docsBare, symbolsBoost: 50, nameBoost: null, f1Boost: null },
  { label: "F3(bare-only,boost25)", docs: docsBare, symbolsBoost: 25, nameBoost: null, f1Boost: null },
  { label: "F2(100)+F1(50)", docs: docsFull, symbolsBoost: 50, nameBoost: 100, f1Boost: 50 },
  { label: "F2(100)+F3(bare,25)", docs: docsBare, symbolsBoost: 25, nameBoost: 100, f1Boost: null },
  { label: "F2(100)+F1(50)+F3(bare,25)", docs: docsBare, symbolsBoost: 25, nameBoost: 100, f1Boost: 50 },
];

for (const t of trials) {
  const { lunr, index } = buildIndex({ docs: t.docs, symbolsBoost: t.symbolsBoost, nameBoost: t.nameBoost });
  const runQuery = makeRunQuery({ f1Boost: t.f1Boost });
  const r = evalConfig(t.label, t.docs, index, lunr, runQuery);
  printSummary(r);
  const regH2 = regressionsVs(r, h2Result);
  console.log(`  vs h2: worse=${regH2.worse} better=${regH2.better} unchanged=${regH2.unchanged} hist=${JSON.stringify(regH2.hist)}`);
  r.regressionsVsH2 = regH2;
  results[t.label] = r;
}

// regressions vs R for each trial (R itself excluded)
const R = results["R (baseline)"];
for (const t of trials) {
  if (t.label === "R (baseline)") continue;
  const r = results[t.label];
  const regR = regressionsVs(r, R);
  console.log(`\n${t.label} vs R: worse=${regR.worse} better=${regR.better} unchanged=${regR.unchanged}`);
  r.regressionsVsR = regR;
}

fs.writeFileSync(path.join(SCRIPT_DIR, "results-r-fixes.json"), JSON.stringify(results, null, 1));
console.log("\nFull results -> results-r-fixes.json");
