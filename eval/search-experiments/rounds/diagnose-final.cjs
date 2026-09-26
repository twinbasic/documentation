// Phase 4 (final round) -- base index = V2 (h3, generic headings folded) +
// V5 symbols field (boost 50). Query-side variants only (index unchanged):
// Q-split (V4b, split every '.'), Q-smart (whole token + smart-split extra
// terms, presence optional), Q-smart-req (same split, presence REQUIRED),
// plus an asterisk-only-token guard applied on top.
"use strict";
const fs = require("fs");
const path = require("path");
const { H, NORMALSEP, DOTSEP } = require("./config-b.cjs");

const SCRIPT_DIR = __dirname;
const symbolIndex = H.loadSymbols(path.join(SCRIPT_DIR, "symbols.json"));
const queries = H.buildQuerySet(symbolIndex, null);
const v2docs = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, "data-v2.json"), "utf8"));

function symbolNamesFor(sym) { const names = [sym.name]; if (sym.container) names.push(`${sym.container}.${sym.name}`); return names; }
function buildSymbolsField() {
  const byUrl = new Map();
  for (const sym of symbolIndex.symbols) {
    const u = H.normalizeUrl(sym.url);
    if (!byUrl.has(u)) byUrl.set(u, new Set());
    for (const n of symbolNamesFor(sym)) byUrl.get(u).add(n);
  }
  return byUrl;
}
const symField = buildSymbolsField();
const baseDocs = {};
for (const [id, e] of Object.entries(v2docs)) {
  const names = symField.get(H.normalizeUrl(e.relUrl));
  baseDocs[id] = { ...e, symbols: names ? [...names].join(" ") : "" };
}
fs.writeFileSync(path.join(SCRIPT_DIR, "data-v5-50.json"), JSON.stringify(baseDocs));

function buildBaseIndex() {
  const lunr = H.loadLunr(H.defaultLunrPath());
  lunr.tokenizer.separator = NORMALSEP;
  const index = lunr(function () {
    this.ref("id");
    this.field("title", { boost: 200 });
    this.field("content", { boost: 2 });
    this.field("relUrl");
    this.field("symbols", { boost: 50 });
    this.metadataWhitelist = ["position"];
    for (const i in baseDocs) this.add({ id: i, title: baseDocs[i].title, content: baseDocs[i].content, relUrl: baseDocs[i].relUrl, symbols: baseDocs[i].symbols });
  });
  return { lunr, index };
}

const STAR_ONLY = /^\*+$/;
function stripStars(tokens) { return tokens.filter((t) => !STAR_ONLY.test(t.toString ? t.toString() : t)); }

// Smart split: only between identifier chars on both sides of '.', drop
// length-1 fragments (so "1.0"/"3.9"/"e.g." split into nothing usable).
const SMART_SPLIT = /(?<=[A-Za-z_]\w*)\.(?=[A-Za-z_])/;
function smartExtraParts(tokenStr) {
  if (!tokenStr.includes(".")) return [];
  return tokenStr.split(SMART_SPLIT).filter((p) => p.length > 1);
}

function makeRunQuery(mode) {
  return function runQuery(lunr, index, input) {
    let results;
    try {
      if (mode === "split") {
        const saved = lunr.tokenizer.separator;
        lunr.tokenizer.separator = DOTSEP;
        let tokens = lunr.tokenizer(input).map((t) => t.toString());
        lunr.tokenizer.separator = saved;
        tokens = stripStars(tokens);
        if (tokens.length === 0) return [];
        results = index.query((q) => { q.term(tokens, { boost: 10 }); q.term(tokens, { wildcard: lunr.Query.wildcard.TRAILING }); });
      } else if (mode === "smart" || mode === "smart-req") {
        let whole = lunr.tokenizer(input).map((t) => t.toString());
        whole = stripStars(whole);
        const extra = [];
        for (const t of whole) extra.push(...smartExtraParts(t));
        if (whole.length === 0 && extra.length === 0) return [];
        results = index.query((q) => {
          if (whole.length) { q.term(whole, { boost: 10 }); q.term(whole, { wildcard: lunr.Query.wildcard.TRAILING }); }
          if (extra.length) {
            if (mode === "smart-req") q.term(extra, { presence: lunr.Query.presence.REQUIRED });
            else { q.term(extra, { boost: 10 }); q.term(extra, { wildcard: lunr.Query.wildcard.TRAILING }); }
          }
        });
      }
    } catch (err) { results = []; }
    if (results.length === 0 && input.length > 2) {
      let tokens = lunr.tokenizer(input).map((t) => t.toString());
      tokens = stripStars(tokens).filter((s) => s.length < 20);
      if (tokens.length) {
        try { results = index.query((q) => q.term(tokens, { editDistance: Math.min(2, Math.round(Math.sqrt(input.length / 2 - 1))) })); } catch (e) { results = []; }
      }
    }
    return results || [];
  };
}

function evalConfig(label, runQuery, docs, index, lunr) {
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

function fmtPct(x) { return `${x.toFixed(1)}%`; }
function printSummary(r) {
  console.log(`\n=== ${r.label} ===`);
  console.log(`  overall n=${r.overall.n} hit1=${fmtPct(r.overall.hit1)} hit5=${fmtPct(r.overall.hit5)} hit10=${fmtPct(r.overall.hit10)} MRR=${r.overall.mrr.toFixed(4)}`);
  for (const cat of ["symbol-bare", "symbol-qualified", "prose"]) { const s = r.byCategory[cat]; console.log(`  ${cat}: hit10=${fmtPct(s.hit10)} MRR=${s.mrr.toFixed(4)}`); }
  for (const k of ["type", "member"]) { const s = r.byKind[k]; console.log(`  kind=${k}: hit10=${fmtPct(s.hit10)} MRR=${s.mrr.toFixed(4)}`); }
}

const configs = [];
for (const mode of ["split", "smart", "smart-req"]) {
  const { lunr, index } = buildBaseIndex();
  const runQuery = makeRunQuery(mode);
  const r = evalConfig(`Q-${mode}`, runQuery, baseDocs, index, lunr);
  configs.push(r);
  printSummary(r);
}

// Guard confirmation: does "*" still crash under Q-split, and does stripping
// change ANY metric vs the un-guarded Q-split from earlier rounds?
console.log("\n=== asterisk-guard confirmation (Q-split) ===");
{
  const { lunr, index } = buildBaseIndex();
  const runQuery = makeRunQuery("split");
  let crashed = false;
  try {
    const saved = lunr.tokenizer.separator; lunr.tokenizer.separator = DOTSEP;
    const tokens = lunr.tokenizer("*").map((t) => t.toString());
    lunr.tokenizer.separator = saved;
    index.query((q) => { q.term(tokens, { boost: 10 }); q.term(tokens, { wildcard: lunr.Query.wildcard.TRAILING }); });
  } catch (e) { crashed = true; }
  console.log("  unguarded '*' query still crashes lunr directly:", crashed);
  console.log("  guarded runQuery('*') result:", JSON.stringify(runQuery(lunr, index, "*")));
}

// ---- regressions vs h2 baseline, per variant ----
const h2docs = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, "data-h2.json"), "utf8"));
const lunrH2 = H.loadLunr(H.defaultLunrPath());
const idxH2 = H.buildIndex(lunrH2, h2docs);
const h2PerQuery = [];
for (const q of queries) {
  const results = H.runQuery(lunrH2, idxH2, q.q);
  const expectedSet = new Set(q.expected);
  const matches = (u) => (q.pathOnlyMatch ? q.expected.some((e) => H.pathOnly(u) === H.pathOnly(e)) : expectedSet.has(H.normalizeUrl(u)));
  let firstHitRank = null;
  for (let i = 0; i < results.length; i++) { if (matches(h2docs[results[i].ref]?.relUrl)) { firstHitRank = i + 1; break; } }
  h2PerQuery.push({ q: q.q, category: q.category, firstHitRank });
}

function regressionsVsH2(cfg) {
  const rank = (r) => (r === null ? Infinity : r);
  let worse = 0, better = 0, unchanged = 0;
  const deltas = [];
  for (let i = 0; i < h2PerQuery.length; i++) {
    const a = h2PerQuery[i], c = cfg.perQuery[i];
    const ra = rank(a.firstHitRank), rc = rank(c.firstHitRank);
    if (ra === rc) unchanged++;
    else if (rc > ra) { worse++; deltas.push({ q: a.q, category: a.category, rankH2: a.firstHitRank, rankNew: c.firstHitRank, delta: (rc === Infinity ? 999 : rc) - (ra === Infinity ? -1 : ra) }); }
    else better++;
  }
  const hist = { "1": 0, "2-5": 0, "6-10": 0, "11-20": 0, "21-50": 0, "51+": 0 };
  for (const d of deltas) {
    if (d.delta === 1) hist["1"]++;
    else if (d.delta <= 5) hist["2-5"]++;
    else if (d.delta <= 10) hist["6-10"]++;
    else if (d.delta <= 20) hist["11-20"]++;
    else if (d.delta <= 50) hist["21-50"]++;
    else hist["51+"]++;
  }
  deltas.sort((x, y) => y.delta - x.delta);
  return { worse, better, unchanged, hist, top20: deltas.slice(0, 20) };
}

for (const cfg of configs) {
  const reg = regressionsVsH2(cfg);
  console.log(`\n=== regressions vs h2: ${cfg.label} ===`);
  console.log(`  worse=${reg.worse} better=${reg.better} unchanged=${reg.unchanged}`);
  console.log("  histogram:", JSON.stringify(reg.hist));
  console.log("  top20:");
  for (const d of reg.top20) console.log(`    [${d.category}] "${d.q}": ${d.rankH2 ?? "none"} -> ${d.rankNew ?? "none"} (delta=${d.delta})`);
  cfg.regressions = reg;
}

// ---- 15 period queries, top-3 for each variant ----
const PERIOD_QUERIES = ["1.0", "3.9", "e.g. array", "i.e. pointer", "Debug.Print", "Debug.Assert", "Err.Raise", "Form.Left", "Collection.Add", "Me.Hide", "App.Path", "VB.Form", "Assert.Exact.AreEqual", "String.Format", "BETA 403"];
for (const mode of ["split", "smart", "smart-req"]) {
  const { lunr, index } = buildBaseIndex();
  const runQuery = makeRunQuery(mode);
  console.log(`\n=== period queries: Q-${mode} ===`);
  for (const q of PERIOD_QUERIES) {
    const results = runQuery(lunr, index, q);
    const top3 = results.slice(0, 3).map((r) => `${baseDocs[r.ref].title} (${baseDocs[r.ref].relUrl})`);
    console.log(`  "${q}" (${results.length}): ${JSON.stringify(top3)}`);
  }
}

fs.writeFileSync(path.join(SCRIPT_DIR, "results-final.json"), JSON.stringify(configs, null, 1));
console.log("\nFull results -> results-final.json");
