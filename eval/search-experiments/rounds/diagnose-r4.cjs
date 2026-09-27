// Phase 7 -- F9/F9b on top of F7(names=100/qualified=50) + Q-smart + guard.
//
// lunr.tokenizer (read from lunr.min.js) tests ONE character at a time
// against `separator` (`r.charAt(s).match(T.tokenizer.separator)`), so an
// alternation requiring 2+ chars (`\.{2,}`) can never match -- a single
// character is passed to .match() in isolation, and a {2,} quantifier can
// never satisfy on a 1-char string. Confirmed empirically below too.
// Implemented instead as STRING PREPROCESSING (replace 2+ consecutive '.'
// with a single space) applied on both sides: index-build side (what
// builder/search.mjs could emit into the "title" field text before it's
// written to search-data.json) and query side (what just-the-docs.js's
// update() could do to `input` before calling lunr.tokenizer). A true single
// '.' is left untouched, so "Debug.Print"/"1.0" still tokenize as one token
// and Q-smart's split logic still runs on them unchanged.
"use strict";
const fs = require("fs");
const path = require("path");
const { H, NORMALSEP } = require("./config-b.cjs");

const SCRIPT_DIR = __dirname;
const symbolIndex = H.loadSymbols(path.join(SCRIPT_DIR, "symbols.json"));
const queries = H.buildQuerySet(symbolIndex, null);
const v2docs = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, "data-v2.json"), "utf8"));

// Confirm the character-loop claim directly against the real lunr.
{
  const lunr = H.loadLunr(H.defaultLunrPath());
  lunr.tokenizer.separator = /[\s\-/]+|\.{2,}/;
  console.log("lunr.tokenizer('Do...Loop') with alternation separator ->", JSON.stringify(lunr.tokenizer("Do...Loop").map((t) => t.toString())));
  console.log("(expect NOT split -- confirms char-by-char .match() can't see a 2+ run)");
}

const DOTS2PLUS = /\.{2,}/g;
const ELLIPSIS = /…/g; // '…'
function preprocessF9(s) { return String(s).replace(DOTS2PLUS, " "); }
function preprocessF9b(s) { return preprocessF9(s).replace(ELLIPSIS, " "); }

// Count titles containing '…' (F9b's rationale check).
{
  let n = 0; const seen = new Set();
  for (const e of Object.values(v2docs)) if (e.title.includes("…")) { n++; seen.add(e.title); }
  console.log(`\n'…' appears in ${n} entries' titles (${seen.size} unique titles)`);
}

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
    out[id] = {
      ...e,
      title: preprocessTitle ? preprocessTitle(e.title) : e.title, // F9/F9b: index side
      names: names && names.size ? [...names].join(" ") : "",
      qualified: qualified && qualified.size ? [...qualified].join(" ") : "",
    };
  }
  return out;
}

function buildIndex(docs) {
  const lunr = H.loadLunr(H.defaultLunrPath());
  lunr.tokenizer.separator = NORMALSEP;
  const index = lunr(function () {
    this.ref("id"); this.field("title", { boost: 200 }); this.field("content", { boost: 2 }); this.field("relUrl");
    this.field("names", { boost: 100 }); this.field("qualified", { boost: 50 });
    this.metadataWhitelist = ["position"];
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
function printSummary(r) {
  console.log(`\n=== ${r.label} ===`);
  console.log(`  overall n=${r.overall.n} hit1=${fmtPct(r.overall.hit1)} hit5=${fmtPct(r.overall.hit5)} hit10=${fmtPct(r.overall.hit10)} MRR=${r.overall.mrr.toFixed(4)}`);
  for (const cat of ["symbol-bare", "symbol-qualified", "prose"]) { const s = r.byCategory[cat]; console.log(`  ${cat}: hit10=${fmtPct(s.hit10)} MRR=${s.mrr.toFixed(4)}`); }
  for (const k of ["type", "member"]) { const s = r.byKind[k]; console.log(`  kind=${k}: hit10=${fmtPct(s.hit10)} MRR=${s.mrr.toFixed(4)}`); }
}

const GROUP_B = ["With", "Is", "VB", "Do", "For", "Each", "On", "Select", "Time$", "Lock"];

const configs = {};
const F7docs = buildDocsSplit(null);
{ const { lunr, index } = buildIndex(F7docs); const rq = makeRunQuery(null); configs["F7"] = evalConfig("F7", F7docs, index, lunr, rq); }
const F9docs = buildDocsSplit(preprocessF9);
{ const { lunr, index } = buildIndex(F9docs); const rq = makeRunQuery(preprocessF9); configs["F9"] = evalConfig("F9", F9docs, index, lunr, rq); }
const F9bdocs = buildDocsSplit(preprocessF9b);
{ const { lunr, index } = buildIndex(F9bdocs); const rq = makeRunQuery(preprocessF9b); configs["F9b"] = evalConfig("F9b", F9bdocs, index, lunr, rq); }

for (const [label, r] of Object.entries(configs)) {
  printSummary(r);
  const regH2 = regressionsVs(r, h2Result, true);
  console.log(`  vs h2 (excl "/"): worse=${regH2.worse} better=${regH2.better} unchanged=${regH2.unchanged} hist=${JSON.stringify(regH2.hist)}`);
  const regF7 = regressionsVs(r, configs["F7"], false);
  if (label !== "F7") console.log(`  vs F7: worse=${regF7.worse} better=${regF7.better} unchanged=${regF7.unchanged}`, regF7.worse ? `NEW REGRESSIONS: ${regF7.worstList.slice(0, 15).map((d) => `${d.q}[${d.category}]:${d.rankRef ?? "none"}->${d.rankNew ?? "none"}`).join(", ")}` : "");
  console.log("  group-B queries (rank):", GROUP_B.map((q) => { const p = r.perQuery.find((x) => x.q === q); return `${q}:${p.firstHitRank ?? "none"}`; }).join(", "));
  const symIdx = r.perQuery.find((x) => x.q === "symbol index");
  console.log(`  "symbol index" prose rank: ${symIdx ? symIdx.firstHitRank : "n/a"}`);
}

fs.writeFileSync(path.join(SCRIPT_DIR, "results-r4.json"), JSON.stringify(configs, null, 1));
console.log("\nFull results -> results-r4.json");
