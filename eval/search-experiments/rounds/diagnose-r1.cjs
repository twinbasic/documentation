// Phase 5.1 -- diagnose all 38 R-vs-h2 regressions with matchData evidence.
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

function buildRIndex() {
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
const SMART_SPLIT = /(?<=[A-Za-z_]\w*)\.(?=[A-Za-z_])/;
function smartExtraParts(t) { if (!t.includes(".")) return []; return t.split(SMART_SPLIT).filter((p) => p.length > 1); }
function runQueryR(lunr, index, input) {
  let whole = lunr.tokenizer(input).map((t) => t.toString()).filter((t) => !STAR_ONLY.test(t));
  const extra = [];
  for (const t of whole) extra.push(...smartExtraParts(t));
  let results = [];
  try {
    results = index.query((q) => {
      if (whole.length) { q.term(whole, { boost: 10 }); q.term(whole, { wildcard: lunr.Query.wildcard.TRAILING }); }
      if (extra.length) { q.term(extra, { boost: 10 }); q.term(extra, { wildcard: lunr.Query.wildcard.TRAILING }); }
    });
  } catch (e) { results = []; }
  if (results.length === 0 && input.length > 2) {
    const tokens = whole.filter((s) => s.length < 20);
    if (tokens.length) { try { results = index.query((q) => q.term(tokens, { editDistance: Math.min(2, Math.round(Math.sqrt(input.length / 2 - 1))) })); } catch (e) { results = []; } }
  }
  return results;
}

const h2docs = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, "data-h2.json"), "utf8"));
const lunrH2 = H.loadLunr(H.defaultLunrPath());
const idxH2 = H.buildIndex(lunrH2, h2docs);

const { lunr: lunrR, index: idxR } = buildRIndex();

function rankOf(docs, results, expected, pathOnlyMatch) {
  const expectedSet = new Set(expected);
  for (let i = 0; i < results.length; i++) {
    const u = docs[results[i].ref]?.relUrl;
    const ok = pathOnlyMatch ? expected.some((e) => H.pathOnly(u) === H.pathOnly(e)) : expectedSet.has(H.normalizeUrl(u));
    if (ok) return i + 1;
  }
  return null;
}

const regressions = [];
for (const q of queries) {
  const rH2 = H.runQuery(lunrH2, idxH2, q.q);
  const rR = runQueryR(lunrR, idxR, q.q);
  const rankH2 = rankOf(h2docs, rH2, q.expected, q.pathOnlyMatch);
  const rankR = rankOf(baseDocs, rR, q.expected, q.pathOnlyMatch);
  const rank = (r) => (r === null ? Infinity : r);
  if (rank(rankR) > rank(rankH2)) regressions.push({ q: q.q, category: q.category, expected: q.expected, rankH2, rankR, delta: (rank(rankR) === Infinity ? 999 : rank(rankR)) - (rank(rankH2) === Infinity ? -1 : rank(rankH2)) });
}
regressions.sort((a, b) => b.delta - a.delta);
console.log(`${regressions.length} regressions vs h2\n`);

// For each, dump ground-truth entry info + top-3 R competitors with matchData
for (const reg of regressions) {
  const expectedSet = new Set(reg.expected);
  const gtEntries = Object.entries(baseDocs).filter(([id, e]) => expectedSet.has(H.normalizeUrl(e.relUrl)));
  const rR = runQueryR(lunrR, idxR, reg.q);
  console.log(`\n"${reg.q}" [${reg.category}] h2:${reg.rankH2 ?? "none"} -> R:${reg.rankR ?? "none"} (delta ${reg.delta})`);
  for (const [id, e] of gtEntries) console.log(`  GT: title="${e.title}" len=${e.content.length} symbols="${(e.symbols || "").slice(0, 60)}" url=${e.relUrl}`);
  rR.slice(0, 3).forEach((r, i) => {
    const d = baseDocs[r.ref];
    const fields = new Set();
    for (const term in r.matchData.metadata) for (const f in r.matchData.metadata[term]) fields.add(f);
    console.log(`  #${i + 1} score=${r.score.toFixed(2)} title="${d.title}" len=${d.content.length} matchedFields=${[...fields].join(",")} terms=${Object.keys(r.matchData.metadata).join(",")} url=${d.relUrl}`);
  });
}

fs.writeFileSync(path.join(SCRIPT_DIR, "regressions-R-vs-h2-full.json"), JSON.stringify(regressions, null, 1));
