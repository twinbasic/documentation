// Phase 2.B -- evaluate design variants V1..V4b (plus baseline h2 for V2/V4)
// by reusing eval.cjs's exported building blocks. Not part of the reusable
// harness's public CLI; a one-off comparison script for this investigation.
"use strict";
const fs = require("fs");
const path = require("path");
const H = require("./eval.cjs"); // exported helpers (see bottom of eval.cjs)

const SCRIPT_DIR = __dirname;
const LUNR_PATH = H.defaultLunrPath();
const SYMBOLS = H.loadSymbols(path.join(SCRIPT_DIR, "symbols.json"));
const QUERIES = H.buildQuerySet(SYMBOLS, null);

function loadDocsFile(name) {
  return JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, name), "utf8"));
}

// Build + evaluate one configuration. `separatorForIndex`/`separatorForQuery`
// let V4/V4b diverge from the client's real /[\s\-/]+/ separator to test the
// "split on '.' too" idea, at index-build time and/or query-tokenize time.
function runConfig(label, docsFileName, { separatorForIndex, separatorForQuery } = {}) {
  const rawText = fs.readFileSync(path.join(SCRIPT_DIR, docsFileName), "utf8");
  const docs = JSON.parse(rawText);
  const lunr = H.loadLunr(LUNR_PATH);

  const indexSep = separatorForIndex || /[\s\-/]+/;
  lunr.tokenizer.separator = indexSep;
  const index = H.buildIndex(lunr, docs);

  // If query-time tokenization should differ from how the index was built
  // (V4b), temporarily swap the separator just for tokenizing the query
  // string, then restore it -- mirrors "index stays as-is, only the typed
  // input is split differently" with no client-side index rebuild.
  function runQuery(input) {
    if (separatorForQuery) {
      const saved = lunr.tokenizer.separator;
      lunr.tokenizer.separator = separatorForQuery;
      const tokens = lunr.tokenizer(input);
      lunr.tokenizer.separator = saved;
      // Replicate runQuery's logic inline since it needs the query-time tokens.
      let results = index.query(function (query) {
        query.term(tokens, { boost: 10 });
        query.term(tokens, { wildcard: lunr.Query.wildcard.TRAILING });
      });
      if (results.length === 0 && input.length > 2) {
        const filtered = tokens.filter((t) => t.str.length < 20);
        if (filtered.length) {
          results = index.query((q) => q.term(filtered, { editDistance: Math.min(2, Math.round(Math.sqrt(input.length / 2 - 1))) }));
        }
      }
      return results;
    }
    return H.runQuery(lunr, index, input);
  }

  const perQuery = [];
  for (const q of QUERIES) {
    let results;
    try {
      results = runQuery(q.q);
    } catch (err) {
      console.error(`  [${label}] query crashed: ${JSON.stringify(q.q)} -- ${err.message}`);
      results = [];
    }
    const expectedSet = new Set(q.expected);
    const matches = (u) =>
      q.pathOnlyMatch ? q.expected.some((e) => H.pathOnly(u) === H.pathOnly(e)) : expectedSet.has(H.normalizeUrl(u));
    let firstHitRank = null;
    for (let i = 0; i < results.length; i++) {
      if (matches(docs[results[i].ref]?.relUrl)) { firstHitRank = i + 1; break; }
    }
    const capped = firstHitRank !== null && firstHitRank <= 20 ? firstHitRank : null;
    perQuery.push({
      q: q.q, category: q.category, kindGroup: q.kindGroup,
      firstHitRank, reciprocalRank: capped ? 1 / capped : 0,
      hit1: firstHitRank === 1, hit5: firstHitRank !== null && firstHitRank <= 5, hit10: firstHitRank !== null && firstHitRank <= 10,
    });
  }

  const overall = H.summarize(perQuery);
  const byCategory = {
    "symbol-bare": H.summarize(perQuery, (r) => r.category === "symbol-bare"),
    "symbol-qualified": H.summarize(perQuery, (r) => r.category === "symbol-qualified"),
    prose: H.summarize(perQuery, (r) => r.category === "prose"),
  };
  const cost = H.measureCost(rawText, lunr, docs);
  return { label, entries: cost.entries, rawBytes: cost.rawBytes, gzipBytes: cost.gzipBytes, medianBuildMs: cost.medianBuildMs, overall, byCategory, perQuery };
}

const DOTSEP = /[\s\-/.]+/;

const configs = [
  runConfig("h2 (baseline)", "data-h2.json"),
  runConfig("V1 = h3", "data-h3.json"),
  runConfig("V2 = h3 folded", "data-v2.json"),
  runConfig("V2 on h2", "data-h2.json"), // placeholder overwritten below with real V2-on-h2
  runConfig("V3 = h3 retitled", "data-v3.json"),
  runConfig("V4 = V2 + '.' in index+query sep", "data-v4.json", { separatorForIndex: DOTSEP, separatorForQuery: null }),
  runConfig("V4 on h2", "data-h2.json"),
  runConfig("V4b = V2, '.' only at query time", "data-v2.json", { separatorForQuery: DOTSEP }),
];

// V4's separatorForQuery must also use the dot-splitting separator for the
// *query* tokens (index and query use the same tokenizer in the real
// client), so redo V4 properly: both index-time and query-time use DOTSEP.
configs[5] = runConfig("V4 = V2 + '.' in tokenizer", "data-v4.json", { separatorForIndex: DOTSEP, separatorForQuery: DOTSEP });
// "V2 on h2" doesn't make sense (V2 folds *h3*'s generic subsections; running
// baseline h2 through the same fold is a distinct, smaller experiment asked
// for as "run V2/V4 against baseline h2"). Build h2-folded and h2+dotsep
// variants explicitly.
const h2 = loadDocsFile("data-h2.json");
function pagePath(u) { const h = u.indexOf("#"); return h === -1 ? u : u.slice(0, h); }
const GENERIC = new Set(["see also", "example", "examples", "remarks", "parameters", "return value", "syntax", "notes"]);
function foldGeneric(docs) {
  const ids = Object.keys(docs).sort((a, b) => Number(a) - Number(b));
  const out = {}; const last = new Map();
  for (const id of ids) {
    const e = docs[id]; const page = pagePath(e.relUrl);
    const generic = GENERIC.has(e.title.trim().toLowerCase());
    if (generic && last.has(page)) { out[last.get(page)].content = (out[last.get(page)].content + " " + e.content).replace(/\s+/g, " "); continue; }
    out[id] = { ...e }; last.set(page, id);
  }
  return out;
}
fs.writeFileSync(path.join(SCRIPT_DIR, "data-h2-v2.json"), JSON.stringify(foldGeneric(h2)));
configs[3] = runConfig("V2 on h2 (h2 folded)", "data-h2-v2.json");
configs[6] = runConfig("V4 on h2 ('.' in tokenizer, h2 data)", "data-h2.json", { separatorForIndex: DOTSEP, separatorForQuery: DOTSEP });

// ---------------------------------------------------------------- printing
function fmtPct(x) { return `${x.toFixed(1)}%`; }
function fmtMs(x) { return `${x.toFixed(1)}ms`; }
function fmtKB(x) { return `${(x / 1024).toFixed(1)}KB`; }

const rows = [
  ["# entries", (c) => c.entries],
  ["raw bytes", (c) => fmtKB(c.rawBytes)],
  ["gzip bytes", (c) => fmtKB(c.gzipBytes)],
  ["median build ms", (c) => fmtMs(c.medianBuildMs)],
  ["--- overall (n=" + configs[0].overall.n + ") ---", () => ""],
  ["hit@1", (c) => fmtPct(c.overall.hit1)],
  ["hit@5", (c) => fmtPct(c.overall.hit5)],
  ["hit@10", (c) => fmtPct(c.overall.hit10)],
  ["MRR (cap 20)", (c) => c.overall.mrr.toFixed(4)],
  ["--- symbol-bare ---", () => ""],
  ["hit@10 / MRR", (c) => `${fmtPct(c.byCategory["symbol-bare"].hit10)} / ${c.byCategory["symbol-bare"].mrr.toFixed(3)}`],
  ["--- symbol-qualified ---", () => ""],
  ["hit@10 / MRR", (c) => `${fmtPct(c.byCategory["symbol-qualified"].hit10)} / ${c.byCategory["symbol-qualified"].mrr.toFixed(3)}`],
  ["--- prose ---", () => ""],
  ["hit@10 / MRR", (c) => `${fmtPct(c.byCategory.prose.hit10)} / ${c.byCategory.prose.mrr.toFixed(3)}`],
];

const labelW = 28;
const colW = 16;
console.log("configuration".padEnd(labelW) + " | " + configs.map((c) => c.label.padStart(colW)).join(" | "));
console.log("-".repeat(labelW) + "-+-" + configs.map(() => "-".repeat(colW)).join("-+-"));
for (const [label, fn] of rows) {
  console.log(label.padEnd(labelW) + " | " + configs.map((c) => String(fn(c)).padStart(colW)).join(" | "));
}

fs.writeFileSync(path.join(SCRIPT_DIR, "results-variants.json"), JSON.stringify(configs.map((c) => ({ ...c })), null, 1));
console.log("\nFull results -> results-variants.json");
