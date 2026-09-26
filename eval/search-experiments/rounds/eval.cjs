#!/usr/bin/env node
// -----------------------------------------------------------------------------
// search-eval/eval.cjs -- reusable harness for measuring (a) search ranking
// quality and (b) client-side cost of the twinBASIC docs site's lunr search
// index, so different index-granularity designs (docs/_config.yml's
// `search.heading_level`) can be compared.
//
// USAGE
//   node eval.cjs data-h2.json [data-h3.json data-h4.json ...] [options]
//
// Each data-*.json argument is a copy of a build's
// docs/_site/assets/js/search-data.json (the object of {doc,title,content,
// url,relUrl} entries just-the-docs' initSearch() fetches and feeds to lunr).
// Pass one file to see just its own metrics; pass two or more to also get a
// side-by-side comparison table.
//
// Options:
//   --symbols <path>   symbols.json to derive ground truth from
//                       (default: symbols.json next to this script, i.e. a
//                       copy of docs/_site/tB/symbols.json -- this is
//                       independent of heading_level, so one copy covers
//                       every configuration under test)
//   --lunr <path>      path to lunr.min.js (default: resolved relative to
//                       this repo's builder/vendor/just-the-docs tree)
//   --worst [N]        for each pair of CONSECUTIVE data files, print the N
//                       (default 15) most-regressed and N most-improved
//                       queries (by per-query reciprocal rank, capped at 20)
//   --out <path>       write full JSON results to this file (default:
//                       results.json next to this script)
//   --queries <path>   write the derived query set to this file for
//                       inspection (default: queries.json next to this
//                       script)
//   --sample <N>       evaluate only a random sample of N symbol queries
//                       (bare + qualified), for fast iteration; omit for the
//                       full set
//
// GROUND TRUTH
//   - Bare-name queries: one per unique symbol name (case-insensitive),
//     taken from symbols.json. A hit is correct if its relUrl normalizes to
//     any of the URLs of every symbol sharing that name (ambiguous names
//     like "Left" or "PaintPicture", which twinBASIC really does have several
//     of, are correct as long as the search finds ANY of them).
//   - Qualified "Class.Member" queries: one per unique (container, name)
//     pair that has a container. Correct only if the hit's relUrl normalizes
//     to that specific symbol's URL (not a same-named member of a different
//     class).
//   - Prose queries: a small hand-picked list below of realistic reader
//     queries with an expected page (matched by path only, ignoring the
//     in-page anchor, since which heading gets the anchor is exactly the
//     thing heading_level changes).
//
//   URL normalization strips a trailing "/index"/"/index.html", strips a
//   trailing slash from the path portion, and keeps the "#anchor" separately
//   -- i.e. "modulo trailing slash / index", matching the task's ground-truth
//   rule.
//
// CLIENT REPLICA
//   Mirrors builder/vendor/just-the-docs/assets/js/just-the-docs.js's
//   initSearch()/update() exactly: lunr.tokenizer.separator = /[\s\-/]+/,
//   fields title (boost 200) / content (boost 2) / relUrl, metadataWhitelist
//   = ['position'], primary query = term(tokens,{boost:10}) +
//   term(tokens,{wildcard:TRAILING}), and -- only when the primary query
//   returns zero hits and the input is longer than 2 chars -- the fuzzy
//   fallback with editDistance = min(2, round(sqrt(len/2-1))). Verified to
//   return identical rankings to eval/site_search.mjs (the repo's own
//   replica) for sample queries (PaintPicture, Line, Add) against the
//   baseline build -- see search-eval/verify-parity.cjs.
// -----------------------------------------------------------------------------
"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { performance } = require("perf_hooks");

const SCRIPT_DIR = __dirname;

// ---------------------------------------------------------------- arg parsing

function parseArgs(argv) {
  const o = {
    files: [],
    symbolsPath: path.join(SCRIPT_DIR, "symbols.json"),
    lunrPath: null,
    worst: false,
    worstN: 15,
    outPath: path.join(SCRIPT_DIR, "results.json"),
    queriesPath: path.join(SCRIPT_DIR, "queries.json"),
    sample: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--symbols") o.symbolsPath = path.resolve(argv[++i]);
    else if (a === "--lunr") o.lunrPath = path.resolve(argv[++i]);
    else if (a === "--worst") {
      o.worst = true;
      if (argv[i + 1] && /^\d+$/.test(argv[i + 1])) o.worstN = Number(argv[++i]);
    } else if (a === "--out") o.outPath = path.resolve(argv[++i]);
    else if (a === "--queries") o.queriesPath = path.resolve(argv[++i]);
    else if (a === "--sample") o.sample = Number(argv[++i]);
    else if (a === "--help" || a === "-h") o.help = true;
    else o.files.push(path.resolve(a));
  }
  return o;
}

function defaultLunrPath() {
  // search-eval/ -> scratchpad -> ... has no fixed relation to the repo, so
  // resolve relative to this script only via the REPO_ROOT env var if given,
  // else fall back to the well-known relative layout from the repo this
  // harness was written for.
  const envRoot = process.env.TBDOCS_REPO_ROOT;
  const candidates = [
    envRoot && path.join(envRoot, "builder/vendor/just-the-docs/assets/js/vendor/lunr.min.js"),
    "D:/OCP/wc/twinBASIC-documentation/.claude/worktrees/hopeful-dewdney-03ae03/builder/vendor/just-the-docs/assets/js/vendor/lunr.min.js",
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error(
    "Could not find lunr.min.js. Pass --lunr <path> or set TBDOCS_REPO_ROOT."
  );
}

// -------------------------------------------------------------- URL normalize

function normalizeUrl(u) {
  if (!u) return u;
  const hashIdx = u.indexOf("#");
  let pathPart = hashIdx === -1 ? u : u.slice(0, hashIdx);
  const anchor = hashIdx === -1 ? "" : u.slice(hashIdx + 1);
  pathPart = pathPart.replace(/\/index(\.html)?$/i, "");
  pathPart = pathPart.replace(/\/+$/, "");
  if (pathPart === "") pathPart = "/";
  return anchor ? `${pathPart}#${anchor}` : pathPart;
}

function pathOnly(u) {
  const n = normalizeUrl(u);
  const hashIdx = n.indexOf("#");
  return hashIdx === -1 ? n : n.slice(0, hashIdx);
}

// ------------------------------------------------------------- query building

// The kinds symbols.json uses that name a *type* (a page of its own) vs a
// *member* (something documented on/under a type's page). See
// builder/symbols.mjs's typeKind()/memberKind().
const TYPE_KINDS = new Set([
  "class", "module", "interface", "enum", "control", "object", "type", "package",
]);
// Everything else in symbols.json (method, property, function, sub, event,
// field, constant, enumvalue, operator, statement, attribute, keyword,
// directive, member) is treated as "member" for the breakdown.

function loadSymbols(symbolsPath) {
  return JSON.parse(fs.readFileSync(symbolsPath, "utf8"));
}

function kindGroup(kind) {
  return TYPE_KINDS.has(kind) ? "type" : "member";
}

// Hand-picked prose queries. Expected is a list of acceptable page paths
// (anchor-insensitive) verified to exist in the baseline (h2) search index
// at the time this harness was written.
const PROSE_QUERIES = [
  { q: "late binding", expected: ["/Reference/Data-Types"] },
  { q: "Implements", expected: ["/tB/Core/Implements"] },
  { q: "AutoRedraw", expected: ["/tB/Packages/VB/Form", "/tB/Packages/VB/PictureBox"] },
  { q: "DoEvents", expected: ["/tB/Modules/Interaction/DoEvents"] },
  { q: "Option Explicit", expected: ["/tB/Core/Option"] },
  { q: "conditional compilation", expected: ["/Reference/Compiler-Constants"] },
  { q: "PtrSafe", expected: ["/Features/64bit"] },
  { q: "circular reference", expected: ["/Tutorials/CustomControls/Defining"] },
  { q: "64-bit compilation", expected: ["/Features/64bit"] },
  { q: "regular expressions", expected: ["/tB/IDE/Project/FindReplace"] },
  { q: "error handling", expected: ["/Reference/Categories"] },
  { q: "threading and atomics", expected: ["/Reference/Categories"] },
  { q: "array bounds checks", expected: ["/tB/IDE/Project/Settings"] },
  { q: "File I/O", expected: ["/Features/Standard-Library/File-IO"] },
  { q: "Fusion", expected: ["/Features/Fusion"] },
  { q: "AddressOf operator", expected: ["/tB/Core/AddressOf"] },
  { q: "variadic arguments", expected: ["/Features/Advanced/API-Declarations"] },
  { q: "heading levels", expected: ["/Documentation/Development/Authoring"] },
  { q: "With statement", expected: ["/tB/Core/With"] },
  { q: "symbol index", expected: ["/Documentation/Development/Building"] },
];

function buildQuerySet(symbolIndex, sample) {
  const symbols = symbolIndex.symbols;
  const queries = [];

  // Bare-name queries: group by lowercased name.
  const byName = new Map();
  for (const s of symbols) {
    const k = s.name.toLowerCase();
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(s);
  }
  for (const [, group] of byName) {
    const expected = [...new Set(group.map((s) => normalizeUrl(s.url)))];
    const kinds = [...new Set(group.map((s) => kindGroup(s.kind)))];
    queries.push({
      category: "symbol-bare",
      kindGroup: kinds.length === 1 ? kinds[0] : "mixed",
      q: group[0].name,
      expected,
    });
  }

  // Qualified Class.Member queries: group by (container, name), case-
  // insensitive, only where a container exists.
  const byPair = new Map();
  for (const s of symbols) {
    if (!s.container) continue;
    const k = `${s.container.toLowerCase()}.${s.name.toLowerCase()}`;
    if (!byPair.has(k)) byPair.set(k, []);
    byPair.get(k).push(s);
  }
  for (const [, group] of byPair) {
    const expected = [...new Set(group.map((s) => normalizeUrl(s.url)))];
    queries.push({
      category: "symbol-qualified",
      kindGroup: kindGroup(group[0].kind),
      q: `${group[0].container}.${group[0].name}`,
      expected,
    });
  }

  // Prose queries.
  for (const p of PROSE_QUERIES) {
    queries.push({
      category: "prose",
      kindGroup: "n/a",
      q: p.q,
      expected: p.expected.map(normalizeUrl),
      pathOnlyMatch: true,
    });
  }

  if (sample) {
    // Keep all prose queries; sample the (much larger) symbol query sets.
    const prose = queries.filter((x) => x.category === "prose");
    const rest = queries.filter((x) => x.category !== "prose");
    const shuffled = rest
      .map((x) => [Math.random(), x])
      .sort((a, b) => a[0] - b[0])
      .map((x) => x[1]);
    return [...prose, ...shuffled.slice(0, sample)];
  }
  return queries;
}

// ------------------------------------------------------------- lunr replica

function loadLunr(lunrPath) {
  // Fresh module instance per call so lunr.tokenizer.separator mutation
  // (global on the module) never leaks between configurations tested in one
  // process.
  delete require.cache[lunrPath];
  return require(lunrPath);
}

function buildIndex(lunr, docs) {
  lunr.tokenizer.separator = /[\s\-/]+/;
  return lunr(function () {
    this.ref("id");
    this.field("title", { boost: 200 });
    this.field("content", { boost: 2 });
    this.field("relUrl");
    this.metadataWhitelist = ["position"];
    for (const i in docs) {
      this.add({ id: i, title: docs[i].title, content: docs[i].content, relUrl: docs[i].relUrl });
    }
  });
}

// Exact replica of just-the-docs.js's update(): primary query, then (only if
// zero hits and input.length > 2) the capped fuzzy fallback.
function runQuery(lunr, index, input) {
  let results;
  try {
    results = index.query(function (query) {
      const tokens = lunr.tokenizer(input);
      query.term(tokens, { boost: 10 });
      query.term(tokens, { wildcard: lunr.Query.wildcard.TRAILING });
    });
  } catch (err) {
    // Pre-existing lunr crash for certain literal query-syntax characters
    // (see search-eval/diagnose-b5.cjs) -- treated as zero results here so
    // a query set containing one doesn't abort a whole evaluation run. The
    // real client has the identical bug (unguarded); see diagnose-b5.cjs.
    results = [];
  }
  if (results.length === 0 && input.length > 2) {
    const tokens = lunr.tokenizer(input).filter((token) => token.str.length < 20);
    if (tokens.length > 0) {
      try {
        results = index.query(function (query) {
          query.term(tokens, {
            editDistance: Math.min(2, Math.round(Math.sqrt(input.length / 2 - 1))),
          });
        });
      } catch (err) {
        results = [];
      }
    }
  }
  return results;
}

// ------------------------------------------------------------------- metrics

function evaluate({ lunr, index, docs }, queries) {
  const perQuery = [];
  let totalLatencyMs = 0;
  const latencies = [];

  for (const query of queries) {
    const t0 = performance.now();
    const results = runQuery(lunr, index, query.q);
    const dt = performance.now() - t0;
    totalLatencyMs += dt;
    latencies.push(dt);

    const expectedSet = new Set(query.expected);
    const matches = (rankedUrl) =>
      query.pathOnlyMatch
        ? expectedSet.has(pathOnly(rankedUrl)) || query.expected.some((e) => pathOnly(rankedUrl) === pathOnly(e))
        : expectedSet.has(normalizeUrl(rankedUrl));

    let firstHitRank = null; // 1-based
    let anyCorrect = false;
    for (let i = 0; i < results.length; i++) {
      const url = docs[results[i].ref]?.relUrl;
      if (matches(url)) {
        anyCorrect = true;
        if (firstHitRank === null) firstHitRank = i + 1;
      }
    }

    const cappedRank = firstHitRank !== null && firstHitRank <= 20 ? firstHitRank : null;
    perQuery.push({
      q: query.q,
      category: query.category,
      kindGroup: query.kindGroup,
      expected: query.expected,
      resultCount: results.length,
      firstHitRank,
      reciprocalRank: cappedRank ? 1 / cappedRank : 0,
      hit1: firstHitRank === 1,
      hit5: firstHitRank !== null && firstHitRank <= 5,
      hit10: firstHitRank !== null && firstHitRank <= 10,
      zeroCorrect: !anyCorrect,
    });
  }

  latencies.sort((a, b) => a - b);
  const medianLatencyMs = latencies.length
    ? latencies[Math.floor(latencies.length / 2)]
    : 0;

  return { perQuery, totalLatencyMs, medianLatencyMs };
}

function summarize(perQuery, filterFn) {
  const rows = filterFn ? perQuery.filter(filterFn) : perQuery;
  const n = rows.length;
  if (n === 0) return null;
  const pct = (f) => (100 * rows.filter(f).length) / n;
  const mrr = rows.reduce((a, r) => a + r.reciprocalRank, 0) / n;
  return {
    n,
    hit1: pct((r) => r.hit1),
    hit5: pct((r) => r.hit5),
    hit10: pct((r) => r.hit10),
    mrr,
    zeroCorrectPct: pct((r) => r.zeroCorrect),
  };
}

// ---------------------------------------------------------------------- cost

function measureCost(rawText, lunr, docsParsed) {
  const rawBytes = Buffer.byteLength(rawText, "utf8");
  const gzipBytes = zlib.gzipSync(Buffer.from(rawText, "utf8")).length;
  const entries = Object.keys(docsParsed).length;

  const buildTimes = [];
  let lastIndex = null;
  let heapDelta = null;
  for (let run = 0; run < 3; run++) {
    if (global.gc) global.gc();
    const heapBefore = process.memoryUsage().heapUsed;
    const t0 = performance.now();
    lastIndex = buildIndex(lunr, docsParsed);
    const t1 = performance.now();
    buildTimes.push(t1 - t0);
    if (run === 2) {
      const heapAfter = process.memoryUsage().heapUsed;
      heapDelta = heapAfter - heapBefore;
    }
  }
  buildTimes.sort((a, b) => a - b);
  const medianBuildMs = buildTimes[1];

  return { entries, rawBytes, gzipBytes, medianBuildMs, buildTimes, heapDeltaBytes: heapDelta, index: lastIndex };
}

// -------------------------------------------------------------------- output

function fmtPct(x) {
  return `${x.toFixed(1)}%`;
}
function fmtMs(x) {
  return `${x.toFixed(2)}ms`;
}
function fmtBytes(x) {
  return `${(x / 1024).toFixed(1)}KB`;
}

function printComparisonTable(configs) {
  const cols = configs.map((c) => c.label);
  const rows = [
    ["# entries", (c) => String(c.cost.entries)],
    ["raw bytes", (c) => fmtBytes(c.cost.rawBytes)],
    ["gzip bytes", (c) => fmtBytes(c.cost.gzipBytes)],
    ["median build time (3 runs)", (c) => fmtMs(c.cost.medianBuildMs)],
    ["heap delta (3rd build)", (c) => c.cost.heapDeltaBytes == null ? "n/a" : fmtBytes(c.cost.heapDeltaBytes)],
    ["median query latency", (c) => fmtMs(c.eval.medianLatencyMs)],
    ["--- overall ranking quality ---", () => ""],
    ["# queries", (c) => String(c.overall.n)],
    ["hit@1", (c) => fmtPct(c.overall.hit1)],
    ["hit@5", (c) => fmtPct(c.overall.hit5)],
    ["hit@10", (c) => fmtPct(c.overall.hit10)],
    ["MRR (cap 20)", (c) => c.overall.mrr.toFixed(4)],
    ["% zero correct", (c) => fmtPct(c.overall.zeroCorrectPct)],
  ];

  const catBreakdown = [
    ["symbol-bare", (c) => c.byCategory["symbol-bare"]],
    ["symbol-qualified", (c) => c.byCategory["symbol-qualified"]],
    ["prose", (c) => c.byCategory["prose"]],
  ];
  const kindBreakdown = [
    ["kind: type", (c) => c.byKind["type"]],
    ["kind: member", (c) => c.byKind["member"]],
  ];

  const labelWidth = Math.max(28, ...rows.map((r) => r[0].length));
  const colWidth = Math.max(12, ...cols.map((c) => c.length));

  const printRow = (label, cells) => {
    console.log(
      label.padEnd(labelWidth) + " | " + cells.map((c) => String(c).padStart(colWidth)).join(" | ")
    );
  };

  printRow("configuration", cols);
  console.log("-".repeat(labelWidth) + "-+-" + cols.map(() => "-".repeat(colWidth)).join("-+-"));
  for (const [label, fn] of rows) {
    printRow(label, configs.map(fn));
  }

  console.log("\nBreakdown by category (hit@10 / MRR / n):");
  for (const [label, fn] of catBreakdown) {
    printRow(
      label,
      configs.map((c) => {
        const s = fn(c);
        return s ? `${fmtPct(s.hit10)}/${s.mrr.toFixed(3)}/${s.n}` : "n/a";
      })
    );
  }

  console.log("\nBreakdown by symbol kind group (hit@10 / MRR / n):");
  for (const [label, fn] of kindBreakdown) {
    printRow(
      label,
      configs.map((c) => {
        const s = fn(c);
        return s ? `${fmtPct(s.hit10)}/${s.mrr.toFixed(3)}/${s.n}` : "n/a";
      })
    );
  }
}

function printWorstDiffs(configA, configB, n) {
  console.log(`\n=== ${configA.label} -> ${configB.label}: diff by query ===`);
  const byQueryA = new Map(configA.eval.perQuery.map((r) => [`${r.category}\u0000${r.q}`, r]));
  const byQueryB = new Map(configB.eval.perQuery.map((r) => [`${r.category}\u0000${r.q}`, r]));
  const diffs = [];
  for (const [key, a] of byQueryA) {
    const b = byQueryB.get(key);
    if (!b) continue;
    diffs.push({
      q: a.q,
      category: a.category,
      rrA: a.reciprocalRank,
      rrB: b.reciprocalRank,
      rankA: a.firstHitRank,
      rankB: b.firstHitRank,
      delta: b.reciprocalRank - a.reciprocalRank,
    });
  }
  const changed = diffs.filter((d) => d.delta !== 0);
  if (changed.length === 0) {
    console.log("  (no query changed rank between these two configurations)");
    return;
  }
  changed.sort((x, y) => x.delta - y.delta);
  console.log(`\n-- up to ${n} most regressed (rank got worse or lost), of ${changed.length} changed --`);
  for (const d of changed.slice(0, n)) {
    console.log(
      `  [${d.category}] "${d.q}": rank ${d.rankA ?? "none"} -> ${d.rankB ?? "none"}  (RR ${d.rrA.toFixed(3)} -> ${d.rrB.toFixed(3)})`
    );
  }
  changed.sort((x, y) => y.delta - x.delta);
  console.log(`\n-- up to ${n} most improved, of ${changed.length} changed --`);
  for (const d of changed.slice(0, n)) {
    console.log(
      `  [${d.category}] "${d.q}": rank ${d.rankA ?? "none"} -> ${d.rankB ?? "none"}  (RR ${d.rrA.toFixed(3)} -> ${d.rrB.toFixed(3)})`
    );
  }
}

// ---------------------------------------------------------------------- main

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || opts.files.length === 0) {
    console.log(
      "Usage: node eval.cjs data-a.json [data-b.json ...] [--symbols path] " +
        "[--lunr path] [--worst [N]] [--out path] [--queries path] [--sample N]\n\n" +
        "See the header comment in this file for full documentation."
    );
    process.exit(opts.help ? 0 : 1);
  }

  const lunrPath = opts.lunrPath || defaultLunrPath();
  const symbolIndex = loadSymbols(opts.symbolsPath);
  const queries = buildQuerySet(symbolIndex, opts.sample);
  fs.writeFileSync(opts.queriesPath, JSON.stringify(queries, null, 1));
  console.log(`Derived ${queries.length} queries (` +
    `${queries.filter((q) => q.category === "symbol-bare").length} bare, ` +
    `${queries.filter((q) => q.category === "symbol-qualified").length} qualified, ` +
    `${queries.filter((q) => q.category === "prose").length} prose) ` +
    `-> ${opts.queriesPath}`);

  const configs = [];
  for (const file of opts.files) {
    const label = path.basename(file, ".json");
    console.log(`\nEvaluating ${label} (${file}) ...`);
    const rawText = fs.readFileSync(file, "utf8");
    const docsParsed = JSON.parse(rawText);

    const lunr = loadLunr(lunrPath);
    const cost = measureCost(rawText, lunr, docsParsed);
    const docs = docsParsed;
    const evalResult = evaluate({ lunr, index: cost.index, docs }, queries);

    const overall = summarize(evalResult.perQuery);
    const byCategory = {
      "symbol-bare": summarize(evalResult.perQuery, (r) => r.category === "symbol-bare"),
      "symbol-qualified": summarize(evalResult.perQuery, (r) => r.category === "symbol-qualified"),
      prose: summarize(evalResult.perQuery, (r) => r.category === "prose"),
    };
    const byKind = {
      type: summarize(evalResult.perQuery, (r) => r.kindGroup === "type"),
      member: summarize(evalResult.perQuery, (r) => r.kindGroup === "member"),
    };

    configs.push({
      label,
      file,
      cost: { entries: cost.entries, rawBytes: cost.rawBytes, gzipBytes: cost.gzipBytes,
        medianBuildMs: cost.medianBuildMs, buildTimes: cost.buildTimes, heapDeltaBytes: cost.heapDeltaBytes },
      eval: { perQuery: evalResult.perQuery, medianLatencyMs: evalResult.medianLatencyMs, totalLatencyMs: evalResult.totalLatencyMs },
      overall,
      byCategory,
      byKind,
    });
  }

  console.log("\n" + "=".repeat(100));
  printComparisonTable(configs);

  if (opts.worst && configs.length >= 2) {
    for (let i = 0; i + 1 < configs.length; i++) {
      printWorstDiffs(configs[i], configs[i + 1], opts.worstN);
    }
  }

  const outJson = configs.map((c) => ({
    label: c.label,
    file: c.file,
    cost: c.cost,
    overall: c.overall,
    byCategory: c.byCategory,
    byKind: c.byKind,
    medianLatencyMs: c.eval.medianLatencyMs,
    // perQuery kept for downstream diffing/inspection.
    perQuery: c.eval.perQuery,
  }));
  fs.writeFileSync(opts.outPath, JSON.stringify(outJson, null, 1));
  console.log(`\nFull results written to ${opts.outPath}`);
}

if (require.main === module) {
  main();
}

// Exported so sibling scripts (variant simulations, diagnostics) in this
// directory can reuse the exact same index-building/query/metric code
// instead of forking a copy of it.
module.exports = {
  normalizeUrl, pathOnly, loadSymbols, buildQuerySet, loadLunr, buildIndex,
  runQuery, evaluate, summarize, measureCost, defaultLunrPath, kindGroup,
  PROSE_QUERIES,
};
