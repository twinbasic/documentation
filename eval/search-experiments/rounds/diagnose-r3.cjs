// Phase 6 -- F5/F6/F7(/F8) on top of R, using the CORRECTLY-GUARDED query
// logic (whole.length===0 && extra.length===0 -> return [] immediately,
// matching diagnose-final.cjs's actual R, not diagnose-r1/r2.cjs's
// unguarded reimplementation, which mis-measured the "/" query).
"use strict";
const fs = require("fs");
const path = require("path");
const { H, NORMALSEP } = require("./config-b.cjs");

const SCRIPT_DIR = __dirname;
const symbolIndex = H.loadSymbols(path.join(SCRIPT_DIR, "symbols.json"));
const queries = H.buildQuerySet(symbolIndex, null);
const v2docs = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, "data-v2.json"), "utf8"));

function buildField(map, container) { return container ? `${container}.` : ""; }
function docsWithFields(mode) {
  // mode: "single" (R's current: one "symbols" field, bare+qualified) or
  // "split" (F7: separate "names" bare-only and "qualified" Container.Name-only fields)
  const byUrlNames = new Map();
  const byUrlQualified = new Map();
  for (const sym of symbolIndex.symbols) {
    const u = H.normalizeUrl(sym.url);
    if (!byUrlNames.has(u)) { byUrlNames.set(u, new Set()); byUrlQualified.set(u, new Set()); }
    byUrlNames.get(u).add(sym.name);
    if (sym.container) byUrlQualified.get(u).add(`${sym.container}.${sym.name}`);
  }
  const out = {};
  for (const [id, e] of Object.entries(v2docs)) {
    const u = H.normalizeUrl(e.relUrl);
    const names = byUrlNames.get(u);
    const qualified = byUrlQualified.get(u);
    if (mode === "single") {
      const all = new Set([...(names || []), ...(qualified || [])]);
      out[id] = { ...e, symbols: all.size ? [...all].join(" ") : "" };
    } else {
      out[id] = { ...e, names: names && names.size ? [...names].join(" ") : "", qualified: qualified && qualified.size ? [...qualified].join(" ") : "" };
    }
  }
  return out;
}
const docsSingle = docsWithFields("single");
const docsSplit = docsWithFields("split");

function buildIndex({ docs, mode, symbolsBoost, namesBoost, qualifiedBoost }) {
  const lunr = H.loadLunr(H.defaultLunrPath());
  lunr.tokenizer.separator = NORMALSEP;
  const index = lunr(function () {
    this.ref("id");
    this.field("title", { boost: 200 });
    this.field("content", { boost: 2 });
    this.field("relUrl");
    if (mode === "single") this.field("symbols", { boost: symbolsBoost });
    else { this.field("names", { boost: namesBoost }); this.field("qualified", { boost: qualifiedBoost }); }
    this.metadataWhitelist = ["position"];
    for (const i in docs) {
      const rec = { id: i, title: docs[i].title, content: docs[i].content, relUrl: docs[i].relUrl };
      if (mode === "single") rec.symbols = docs[i].symbols || "";
      else { rec.names = docs[i].names || ""; rec.qualified = docs[i].qualified || ""; }
      this.add(rec);
    }
  });
  return { lunr, index };
}

const STAR_ONLY = /^\*+$/;
const SMART_SPLIT = /(?<=[A-Za-z_]\w*)\.(?=[A-Za-z_])/;
function smartExtraParts(t) { if (!t.includes(".")) return []; return t.split(SMART_SPLIT).filter((p) => p.length > 1); }
const ALL_FIELDS_NO_WILDCARD_RESTRICT = null; // null = search all fields (R's current wildcard behavior)
const NARROW_FIELDS = ["title", "content", "relUrl"]; // F5: exclude symbols/names/qualified from the wildcard clause

// opts: { wildcardFields: null|array, wildcardMinLen: number (0 = no threshold) }
function makeRunQuery(opts = {}) {
  const { wildcardFields = null, wildcardMinLen = 0 } = opts;
  return function runQuery(lunr, index, input) {
    let whole = lunr.tokenizer(input).map((t) => t.toString()).filter((t) => !STAR_ONLY.test(t));
    const extra = [];
    for (const t of whole) extra.push(...smartExtraParts(t));
    if (whole.length === 0 && extra.length === 0) return []; // <-- the guard (also fixes "/")
    let results;
    try {
      results = index.query((q) => {
        const addGroup = (tokens) => {
          if (!tokens.length) return;
          q.term(tokens, { boost: 10 }); // exact term: all fields, as before
          const wcTokens = wildcardMinLen ? tokens.filter((t) => t.trim().length >= wildcardMinLen) : tokens;
          if (wcTokens.length) {
            const opts2 = { wildcard: lunr.Query.wildcard.TRAILING };
            if (wildcardFields) opts2.fields = wildcardFields;
            q.term(wcTokens, opts2);
          }
        };
        addGroup(whole);
        addGroup(extra);
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

const h2docs = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, "data-h2.json"), "utf8"));
const lunrH2 = H.loadLunr(H.defaultLunrPath());
const idxH2 = H.buildIndex(lunrH2, h2docs);
const h2Result = evalConfig("h2", h2docs, idxH2, lunrH2, (l, i, q) => H.runQuery(l, i, q));

function regressionsVs(cfg, refResult, excludeSlash) {
  const rank = (r) => (r === null ? Infinity : r);
  let worse = 0, better = 0, unchanged = 0, excluded = 0;
  const hist = { "1": 0, "2-5": 0, "6-10": 0, "11-20": 0, "21-50": 0, "51+": 0 };
  const worstList = [];
  for (let i = 0; i < refResult.perQuery.length; i++) {
    const a = refResult.perQuery[i], c = cfg.perQuery[i];
    if (excludeSlash && a.q === "/") { excluded++; continue; }
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
  return { worse, better, unchanged, excluded, hist, worstList };
}

function fmtPct(x) { return `${x.toFixed(1)}%`; }
function printSummary(r) {
  console.log(`\n=== ${r.label} ===`);
  console.log(`  overall n=${r.overall.n} hit1=${fmtPct(r.overall.hit1)} hit5=${fmtPct(r.overall.hit5)} hit10=${fmtPct(r.overall.hit10)} MRR=${r.overall.mrr.toFixed(4)}`);
  for (const cat of ["symbol-bare", "symbol-qualified", "prose"]) { const s = r.byCategory[cat]; console.log(`  ${cat}: hit10=${fmtPct(s.hit10)} MRR=${s.mrr.toFixed(4)}`); }
  for (const k of ["type", "member"]) { const s = r.byKind[k]; console.log(`  kind=${k}: hit10=${fmtPct(s.hit10)} MRR=${s.mrr.toFixed(4)}`); }
}

// Confirm "/" behavior under R specifically.
{
  const { lunr, index } = buildIndex({ docs: docsSingle, mode: "single", symbolsBoost: 50 });
  const runQuery = makeRunQuery({});
  const r = runQuery(lunr, index, "/");
  console.log(`\n"/" under true (guarded) R: ${r.length} results (expect 0)`);
}

const results = { h2: h2Result };
const trials = [
  { label: "R (baseline, guarded)", docs: docsSingle, mode: "single", symbolsBoost: 50, q: {} },
  { label: "F5 (wildcard excl. symbols)", docs: docsSingle, mode: "single", symbolsBoost: 50, q: { wildcardFields: NARROW_FIELDS } },
  { label: "F6 (minlen=3)", docs: docsSingle, mode: "single", symbolsBoost: 50, q: { wildcardMinLen: 3 } },
  { label: "F6 (minlen=4)", docs: docsSingle, mode: "single", symbolsBoost: 50, q: { wildcardMinLen: 4 } },
  { label: "F5+F6(3)", docs: docsSingle, mode: "single", symbolsBoost: 50, q: { wildcardFields: NARROW_FIELDS, wildcardMinLen: 3 } },
  { label: "F7 (names/qual=50/50)", docs: docsSplit, mode: "split", namesBoost: 50, qualifiedBoost: 50, q: {} },
  { label: "F7 (names/qual=50/25)", docs: docsSplit, mode: "split", namesBoost: 50, qualifiedBoost: 25, q: {} },
  { label: "F7 (names/qual=100/50)", docs: docsSplit, mode: "split", namesBoost: 100, qualifiedBoost: 50, q: {} },
  { label: "F7(50/25)+F5+F6(3)", docs: docsSplit, mode: "split", namesBoost: 50, qualifiedBoost: 25, q: { wildcardFields: NARROW_FIELDS, wildcardMinLen: 3 } },
];

for (const t of trials) {
  const { lunr, index } = buildIndex({ docs: t.docs, mode: t.mode, symbolsBoost: t.symbolsBoost, namesBoost: t.namesBoost, qualifiedBoost: t.qualifiedBoost });
  const runQuery = makeRunQuery(t.q);
  const r = evalConfig(t.label, t.docs, index, lunr, runQuery);
  printSummary(r);
  const regH2 = regressionsVs(r, h2Result, true);
  console.log(`  vs h2 (excl "/"): worse=${regH2.worse} better=${regH2.better} unchanged=${regH2.unchanged} hist=${JSON.stringify(regH2.hist)}`);
  console.log(`  worst vs h2:`, regH2.worstList.slice(0, 10).map((d) => `${d.q}:${d.rankRef ?? "none"}->${d.rankNew ?? "none"}`).join(", "));
  r.regressionsVsH2 = regH2;
  results[t.label] = r;
}

const R = results["R (baseline, guarded)"];
for (const t of trials) {
  if (t.label.startsWith("R (baseline")) continue;
  const r = results[t.label];
  const regR = regressionsVs(r, R, false);
  console.log(`\n${t.label} vs R: worse=${regR.worse} better=${regR.better} unchanged=${regR.unchanged}`);
  if (regR.worse) console.log(`  new regressions vs R:`, regR.worstList.slice(0, 15).map((d) => `${d.q}[${d.category}]:${d.rankRef ?? "none"}->${d.rankNew ?? "none"}`).join(", "));
  r.regressionsVsR = regR;
}

fs.writeFileSync(path.join(SCRIPT_DIR, "results-r3.json"), JSON.stringify(results, null, 1));
console.log("\nFull results -> results-r3.json");
