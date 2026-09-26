#!/usr/bin/env node
// Measure the site search's ranking quality and client-side cost, so a
// change to the index design (docs/_config.yml's `search.heading_level`,
// the fields the client indexes, the query construction) can be judged
// against a number instead of a handful of manually-tried queries.
//
// WIP.Search.md's "Measurement" section describes what it measures and what
// it found. It shares its index setup and query logic with eval/site_search.mjs -- see that file's
// `load`/`buildIndex`/`search` exports -- so a later change to the real
// replica is measured by this tool automatically, instead of by a second
// copy of the lunr configuration that could quietly drift from it.
//
//     node eval/search_quality.mjs [--site docs/_site]
//     node eval/search_quality.mjs --save eval/search_baseline.json
//     node eval/search_quality.mjs --compare eval/search_baseline.json [--worst N]
//     node eval/search_quality.mjs --sample 500        # fast iteration
//     node eval/search_quality.mjs --failures 20       # queries not at rank 1
//
// Exit code is always 0: this is a measuring tool, not a pass/fail check
// (scripts/ is for those).
//
// GROUND TRUTH
//
// Symbol queries are derived at run time from the built site's
// `tB/symbols.json` (the same file eval/nav_hops.mjs and the symbol-index
// build produce), not from a committed copy, so they always match the site
// under test:
//
//   - Bare-name queries, one per unique symbol name (case-insensitive),
//     judged by READER INTENT (WIP.Search.md, "Reader intent"). Every
//     symbol sharing the name gets a tier:
//       1. a type (class, control, module, enum, interface, package...) or
//          a language element: a statement, keyword, operator, attribute or
//          directive with no package, or a function/property/sub/method
//          whose container is a *module* (`Left` -> the Strings function,
//          not the Left property of 30 controls);
//       2. a member of a class;
//       3. an enum constant.
//     A hit is correct only if it lands on a URL of the name's best tier.
//     Where that tier has several URLs (`PaintPicture` on six classes, or
//     `Line` the control and `Line` the statement), any of them counts.
//     Lower tiers are not excluded from the results: the tier-order
//     metrics below check that they still appear, after the higher ones.
//     The looser "any page documenting this name" rule, which the first
//     version of this tool used, is still reported as `bare, any page`.
//   - Qualified `Container.Name` queries, one per unique (container, name)
//     pair. Correct only for that exact symbol's URL.
//
// Both use the same URL normalisation: a trailing "/index" or "/index.html"
// is stripped, then a trailing slash, before comparing (matching how
// `relUrl` values do and don't agree on a trailing slash across pages).
//
// The 20 prose queries live in the committed eval/search_prose_queries.json
// instead, because they are NOT derivable from the build -- they are a
// small, hand-picked set of realistic reader questions ("late binding",
// "Option Explicit") with a maintainer-judged expected page, matched by
// path only (ignoring the in-page anchor, since which heading gets the
// anchor is exactly the kind of thing an index-granularity change moves).
// Small and cherry-picked for plausibility, its 80% hit@10 is a sanity
// check that this tool has kept stable across configurations, not a
// statistical claim about real user queries.
//
// TIER ORDER
//
// For each bare name documented on 2+ URLs: the fraction of those URLs in
// the top 10 and top 20 (recall), and the number of names where a
// lower-tier URL ranks above a higher-tier one, or appears in the top 20
// while the best tier doesn't (violations). Near-name matches (`Nodes` for
// `Node`) are not in the name's URL set, so they are neither counted nor
// penalised here.
//
// BIASES TO KEEP IN MIND WHEN READING THE NUMBERS
//
//   - Most queries are symbol names, so the aggregate numbers mostly grade
//     API lookup, not prose discoverability. The `prose` breakdown below is
//     the only signal for the latter, and it is small.
//   - The index's `names` and `qualified` fields are built from this same
//     `tB/symbols.json` (WIP.Search.md's "Design" §2), so this ground truth
//     is partly circular with them: a query that hits because of those
//     fields is checked against the data they were built from. A held-out
//     split measured once showed the fields generalise (WIP.Search.md,
//     "What the numbers showed"); this tool does not repeat that split.
//
// COST
//
// Entries, raw and gzip bytes of search-data.json, median index-build time
// over 3 runs, and median query latency across every derived query. Heap
// delta after the 3rd build is reported only when Node was started with
// --expose-gc (`node --expose-gc eval/search_quality.mjs`); otherwise it is
// skipped rather than reported as a number `global.gc` never actually froze.

import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { performance } from "node:perf_hooks";

import { load, buildIndex, search } from "./site_search.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------- arg parsing

function parseArgs(argv) {
  const o = {
    site: path.join(REPO_ROOT, "docs/_site"),
    save: null,
    compare: null,
    sample: null,
    worstN: 15,
    failures: 0,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--site") o.site = path.resolve(argv[++i]);
    else if (a === "--save") o.save = path.resolve(argv[++i]);
    else if (a === "--compare") o.compare = path.resolve(argv[++i]);
    else if (a === "--sample") o.sample = Number(argv[++i]);
    else if (a === "--worst") o.worstN = Number(argv[++i]);
    else if (a === "--failures") o.failures = Number(argv[++i]);
    else if (a === "--help" || a === "-h") o.help = true;
    else {
      console.error(`unrecognised argument: ${a}`);
      process.exit(1);
    }
  }
  return o;
}

// ------------------------------------------------------------- URL normalize

// A trailing "/index" or "/index.html", then a trailing slash. Keeps any
// "#anchor" separate so path-only matching (the prose set) can drop it.
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

// The kinds tB/symbols.json uses that name a *type* (a page of its own) vs
// a *member* (something documented on/under a type's page). See
// builder/symbols.mjs's typeKind()/memberKind() for where these come from.
const TYPE_KINDS = new Set([
  "class", "module", "interface", "enum", "control", "object", "type", "package",
]);

function kindGroup(kind) {
  return TYPE_KINDS.has(kind) ? "type" : "member";
}

const LANGUAGE_KINDS = new Set(["statement", "keyword", "operator", "attribute", "directive"]);
const MODULE_MEMBER_KINDS = new Set(["function", "property", "sub", "method"]);

// The reader-intent tier of one symbol: 1 type or language element, 2
// class member, 3 enum constant. `moduleNames` holds the lowercased names
// of every module, so an intrinsic like Strings.Left counts as a language
// element. `label` is only for the breakdown.
function intentTier(s, moduleNames) {
  if (TYPE_KINDS.has(s.kind)) return { tier: 1, label: "type" };
  if (LANGUAGE_KINDS.has(s.kind) && s.package === null) return { tier: 1, label: "language" };
  if (MODULE_MEMBER_KINDS.has(s.kind) && s.container && moduleNames.has(s.container.toLowerCase())) {
    return { tier: 1, label: "language" };
  }
  if (s.kind === "enumvalue") return { tier: 3, label: "enum" };
  return { tier: 2, label: "member" };
}

function loadProseQueries() {
  const p = path.join(REPO_ROOT, "eval/search_prose_queries.json");
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  return raw.map((r) => ({
    category: "prose",
    kindGroup: "n/a",
    q: r.q,
    expected: r.expected.map(normalizeUrl),
    pathOnlyMatch: true,
  }));
}

function checkProseUrlsExist(proseQueries, docs) {
  const knownPaths = new Set(Object.values(docs).map((d) => pathOnly(String(d.relUrl ?? ""))));
  const missing = [];
  for (const q of proseQueries) {
    for (const e of q.expected) {
      if (!knownPaths.has(pathOnly(e))) missing.push(`${q.q} -> ${e}`);
    }
  }
  if (missing.length) {
    console.error(
      "warning: eval/search_prose_queries.json expects URLs not found in this build:\n" +
      missing.map((m) => `  ${m}`).join("\n")
    );
  }
}

function buildQuerySet(symbolIndex, proseQueries, sample) {
  const symbols = symbolIndex.symbols;
  const queries = [];

  const moduleNames = new Set(symbols.filter((s) => s.kind === "module").map((s) => s.name.toLowerCase()));
  const byName = new Map();
  for (const s of symbols) {
    const k = s.name.toLowerCase();
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(s);
  }
  for (const [, group] of byName) {
    // urlTier: every URL documenting this name, with the best tier found
    // there. `expected` is the URLs of the name's best tier.
    const urlTier = new Map();
    const labels = new Map();
    for (const s of group) {
      const u = normalizeUrl(s.url);
      const { tier, label } = intentTier(s, moduleNames);
      if (!urlTier.has(u) || tier < urlTier.get(u)) urlTier.set(u, tier);
      if (!labels.has(tier)) labels.set(tier, new Set());
      labels.get(tier).add(label);
    }
    const best = Math.min(...urlTier.values());
    const expected = [...urlTier].filter(([, t]) => t === best).map(([u]) => u);
    const kinds = [...new Set(group.map((s) => kindGroup(s.kind)))];
    queries.push({
      category: "symbol-bare",
      kindGroup: kinds.length === 1 ? kinds[0] : "mixed",
      tier: [...labels.get(best)].sort().join("+"),
      q: group[0].name,
      expected,
      urlTier,
    });
  }

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

  queries.push(...proseQueries);

  if (sample) {
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

// ------------------------------------------------------------------ metrics

// Runs every query through eval/site_search.mjs's own `search()` -- the
// same function the CLI uses -- so ranking here is exactly what a reader
// querying the live search box would get, including the asterisk guard and
// the fuzzy fallback.
function evaluate(ctx, queries) {
  const perQuery = [];
  const latencies = [];

  for (const query of queries) {
    const t0 = performance.now();
    const results = search(ctx, query.q);
    latencies.push(performance.now() - t0);

    const expectedSet = new Set(query.expected);
    const matches = (rankedUrl) =>
      query.pathOnlyMatch
        ? query.expected.some((e) => pathOnly(rankedUrl) === pathOnly(e))
        : expectedSet.has(normalizeUrl(rankedUrl));

    let firstHitRank = null; // 1-based
    let anyPageRank = null; // bare names: the first URL of any tier
    let anyCorrect = false;
    for (let i = 0; i < results.length; i++) {
      const url = ctx.docs[results[i].ref]?.relUrl;
      if (matches(url)) {
        anyCorrect = true;
        if (firstHitRank === null) firstHitRank = i + 1;
      }
      if (query.urlTier && anyPageRank === null && query.urlTier.has(normalizeUrl(url))) anyPageRank = i + 1;
    }

    const cappedRank = firstHitRank !== null && firstHitRank <= 20 ? firstHitRank : null;
    perQuery.push({
      q: query.q,
      category: query.category,
      kindGroup: query.kindGroup,
      firstHitRank,
      reciprocalRank: cappedRank ? 1 / cappedRank : 0,
      hit1: firstHitRank === 1,
      hit5: firstHitRank !== null && firstHitRank <= 5,
      hit10: firstHitRank !== null && firstHitRank <= 10,
      zeroCorrect: !anyCorrect,
      tier: query.tier,
      anyPageHit10: anyPageRank !== null && anyPageRank <= 10,
      tierOrder: query.urlTier && query.urlTier.size >= 2 ? tierOrder(ctx, results, query.urlTier) : null,
    });
  }

  latencies.sort((a, b) => a - b);
  const medianLatencyMs = latencies.length ? latencies[Math.floor(latencies.length / 2)] : 0;
  return { perQuery, medianLatencyMs };
}

// Where the URLs documenting one name land in the top 20: how many of them
// appear in the top 10 and top 20, and whether any lower-tier URL comes
// before a higher-tier one.
function tierOrder(ctx, results, urlTier) {
  const seen = new Set();
  const hits = [];
  for (let i = 0; i < results.length && i < 20; i++) {
    const url = normalizeUrl(ctx.docs[results[i].ref]?.relUrl);
    if (!urlTier.has(url) || seen.has(url)) continue;
    seen.add(url);
    hits.push({ rank: i + 1, tier: urlTier.get(url) });
  }
  let violation = false;
  for (let i = 1; i < hits.length; i++) {
    if (hits.slice(0, i).some((h) => h.tier > hits[i].tier)) violation = true;
  }
  const bestTier = Math.min(...urlTier.values());
  if (hits.length && !hits.some((h) => h.tier === bestTier)) violation = true;
  return {
    recall10: hits.filter((h) => h.rank <= 10).length / urlTier.size,
    recall20: hits.length / urlTier.size,
    violation,
  };
}

function summarizeTierOrder(perQuery) {
  const rows = perQuery.filter((r) => r.tierOrder);
  const n = rows.length;
  if (n === 0) return null;
  return {
    n,
    recall10: (100 * rows.reduce((a, r) => a + r.tierOrder.recall10, 0)) / n,
    recall20: (100 * rows.reduce((a, r) => a + r.tierOrder.recall20, 0)) / n,
    violations: rows.filter((r) => r.tierOrder.violation).length,
  };
}

function summarize(perQuery, filterFn) {
  const rows = filterFn ? perQuery.filter(filterFn) : perQuery;
  const n = rows.length;
  if (n === 0) return null;
  const pct = (f) => (100 * rows.filter(f).length) / n;
  const mrr = rows.reduce((a, r) => a + r.reciprocalRank, 0) / n;
  return { n, hit1: pct((r) => r.hit1), hit5: pct((r) => r.hit5), hit10: pct((r) => r.hit10), mrr, zeroCorrectPct: pct((r) => r.zeroCorrect) };
}

// ---------------------------------------------------------------------- cost

function measureCost(rawText, ctx, docsParsed) {
  const rawBytes = Buffer.byteLength(rawText, "utf8");
  const gzipBytes = zlib.gzipSync(Buffer.from(rawText, "utf8")).length;
  const entries = Object.keys(docsParsed).length;

  const buildTimes = [];
  let heapDelta = null;
  for (let run = 0; run < 3; run++) {
    if (global.gc) global.gc();
    const heapBefore = process.memoryUsage().heapUsed;
    const t0 = performance.now();
    buildIndex(ctx.lunr, docsParsed);
    buildTimes.push(performance.now() - t0);
    if (run === 2 && global.gc) heapDelta = process.memoryUsage().heapUsed - heapBefore;
  }
  buildTimes.sort((a, b) => a - b);
  return { entries, rawBytes, gzipBytes, medianBuildMs: buildTimes[1], heapDeltaBytes: heapDelta };
}

// -------------------------------------------------------------------- output

const fmtPct = (x) => `${x.toFixed(1)}%`;
const fmtMs = (x) => `${x.toFixed(2)}ms`;
const fmtBytes = (x) => `${(x / 1024).toFixed(1)}KB`;

function printTable(result) {
  const rows = [
    ["# entries", String(result.cost.entries)],
    ["raw bytes", fmtBytes(result.cost.rawBytes)],
    ["gzip bytes", fmtBytes(result.cost.gzipBytes)],
    ["median build time (3 runs)", fmtMs(result.cost.medianBuildMs)],
    ["heap delta (3rd build)", result.cost.heapDeltaBytes == null ? "n/a (run with --expose-gc)" : fmtBytes(result.cost.heapDeltaBytes)],
    ["median query latency", fmtMs(result.medianLatencyMs)],
    ["--- overall ranking quality ---", ""],
    ["# queries", String(result.overall.n)],
    ["hit@1", fmtPct(result.overall.hit1)],
    ["hit@5", fmtPct(result.overall.hit5)],
    ["hit@10", fmtPct(result.overall.hit10)],
    ["MRR (cap 20)", result.overall.mrr.toFixed(4)],
    ["% zero correct", fmtPct(result.overall.zeroCorrectPct)],
  ];
  const labelWidth = Math.max(28, ...rows.map((r) => r[0].length));
  for (const [label, value] of rows) console.log(label.padEnd(labelWidth) + " | " + value);

  const line = (s) => (s ? `${fmtPct(s.hit1)} / ${fmtPct(s.hit10)} / ${s.mrr.toFixed(3)} / ${s.n}` : "n/a");
  console.log("\nBreakdown by category (hit@1 / hit@10 / MRR / n):");
  for (const [label, key] of [["symbol-bare", "symbol-bare"], ["symbol-qualified", "symbol-qualified"], ["prose", "prose"]]) {
    console.log(label.padEnd(labelWidth) + " | " + line(result.byCategory[key]));
  }
  console.log("bare, any page (hit@10)".padEnd(labelWidth) + " | " + fmtPct(result.bareAnyPageHit10));

  console.log("\nBare names by intent tier (hit@1 / hit@10 / MRR / n):");
  for (const [tier, s] of Object.entries(result.byTier)) {
    console.log(`tier: ${tier}`.padEnd(labelWidth) + " | " + line(s));
  }

  const t = result.tierOrder;
  console.log("\nTier order, bare names on 2+ URLs:");
  if (t) {
    console.log("names".padEnd(labelWidth) + " | " + t.n);
    console.log("recall@10 / recall@20".padEnd(labelWidth) + " | " + `${fmtPct(t.recall10)} / ${fmtPct(t.recall20)}`);
    console.log("names out of tier order".padEnd(labelWidth) + " | " + t.violations);
  }
}

// The queries missing rank 1, grouped by category and tier, so the work
// list is one command away.
function printFailures(perQuery, n) {
  const failing = perQuery.filter((r) => !r.hit1);
  const groups = new Map();
  for (const r of failing) {
    const g = r.category === "symbol-bare" ? `bare, ${r.tier}` : r.category;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(r);
  }
  console.log(`\nNot at rank 1: ${failing.length} (up to ${n} per group)`);
  for (const [g, rows] of groups) {
    console.log(`  ${g} (${rows.length}):`);
    for (const r of rows.slice(0, n)) console.log(`    ${r.q}: ${r.firstHitRank ?? "none"}`);
  }
}

// Short codes keep the saved rank map (one entry per query, thousands of
// them) from ballooning: "symbol-qualified" repeated 5,108 times costs real
// kilobytes for no information a single letter doesn't carry.
// Saved with a baseline, so --compare can tell a baseline judged by a
// different ground truth from a change in ranking.
const GROUND_TRUTH = "intent-1";

const CATEGORY_CODE = { "symbol-bare": "b", "symbol-qualified": "q", prose: "p" };
const CATEGORY_NAME = { b: "symbol-bare", q: "symbol-qualified", p: "prose" };

function rankKey(category, q) {
  return `${CATEGORY_CODE[category] ?? category}:${q}`;
}

function rankMap(perQuery) {
  const m = {};
  for (const r of perQuery) m[rankKey(r.category, r.q)] = r.firstHitRank;
  return m;
}

function printCompare(current, saved, worstN) {
  console.log("\n" + "=".repeat(78));
  console.log(`Compare: current vs ${path.basename(saved.file ?? "saved")}`);

  const metricRows = [
    ["hit@1", (r) => r.overall.hit1],
    ["hit@5", (r) => r.overall.hit5],
    ["hit@10", (r) => r.overall.hit10],
    ["MRR", (r) => r.overall.mrr * 100],
    ["% zero correct", (r) => r.overall.zeroCorrectPct],
  ];
  console.log("\nmetric".padEnd(20) + "baseline".padStart(12) + "current".padStart(12) + "delta".padStart(12));
  for (const [label, fn] of metricRows) {
    const a = fn(saved);
    const b = fn(current);
    const delta = b - a;
    const deltaStr = (delta >= 0 ? "+" : "") + delta.toFixed(2);
    console.log(label.padEnd(20) + a.toFixed(2).padStart(12) + b.toFixed(2).padStart(12) + deltaStr.padStart(12));
  }

  if (saved.groundTruth !== GROUND_TRUTH) {
    console.log(
      `\nwarning: the baseline was saved with ground truth "${saved.groundTruth ?? "any-page"}", ` +
      `this run uses "${GROUND_TRUTH}"; bare-name ranks are not comparable.`
    );
  }
  const oldRanks = saved.ranks ?? rankMap(saved.perQuery ?? []);
  const newRanks = rankMap(current.perQuery);

  const rankValue = (r) => (r === null || r === undefined ? Infinity : r);
  const diffs = [];
  for (const key of Object.keys(oldRanks)) {
    if (!(key in newRanks)) continue;
    const sep = key.indexOf(":");
    const code = key.slice(0, sep);
    const q = key.slice(sep + 1);
    diffs.push({ category: CATEGORY_NAME[code] ?? code, q, oldRank: oldRanks[key], newRank: newRanks[key] });
  }

  let worse = 0, better = 0, unchanged = 0;
  for (const d of diffs) {
    const a = rankValue(d.oldRank);
    const b = rankValue(d.newRank);
    if (b > a) worse++;
    else if (b < a) better++;
    else unchanged++;
  }
  console.log(`\nqueries compared: ${diffs.length} (worse: ${worse}, better: ${better}, unchanged: ${unchanged})`);

  const regressed = diffs.filter((d) => rankValue(d.newRank) > rankValue(d.oldRank));
  if (regressed.length) {
    const buckets = new Map();
    for (const d of regressed) {
      const a = rankValue(d.oldRank);
      const b = rankValue(d.newRank);
      const delta = b === Infinity ? "lost entirely" : `+${b - a} rank(s)`;
      buckets.set(delta, (buckets.get(delta) ?? 0) + 1);
    }
    console.log("\nhistogram of how much worse (regressed queries):");
    for (const [bucket, n] of [...buckets].sort((x, y) => y[1] - x[1])) {
      console.log(`  ${String(n).padStart(5)}  ${bucket}`);
    }
  }

  const byDelta = (d) => rankValue(d.newRank) - rankValue(d.oldRank);
  const worst = [...regressed].sort((a, b) => byDelta(b) - byDelta(a)).slice(0, worstN);
  if (worst.length) {
    console.log(`\n-- up to ${worstN} largest regressions --`);
    for (const d of worst) {
      console.log(`  [${d.category}] "${d.q}": rank ${d.oldRank ?? "none"} -> ${d.newRank ?? "none"}`);
    }
  }
  const improved = diffs.filter((d) => rankValue(d.newRank) < rankValue(d.oldRank));
  const best = [...improved].sort((a, b) => byDelta(a) - byDelta(b)).slice(0, worstN);
  if (best.length) {
    console.log(`\n-- up to ${worstN} largest improvements --`);
    for (const d of best) {
      console.log(`  [${d.category}] "${d.q}": rank ${d.oldRank ?? "none"} -> ${d.newRank ?? "none"}`);
    }
  }
}

// ---------------------------------------------------------------------- main

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(
      "Usage: node eval/search_quality.mjs [--site docs/_site] [--save file] " +
      "[--compare file] [--worst N] [--sample N] [--failures N]\n\nSee the header comment in this file."
    );
    process.exit(0);
  }

  const ctx = load(opts.site);
  const { dataPath } = (function () {
    // load() already validated these paths exist; recompute the data path
    // only to read the raw bytes for the cost measurement.
    return { dataPath: path.join(opts.site, "assets/js/search-data.json") };
  })();
  const rawText = fs.readFileSync(dataPath, "utf8");

  const symbolIndex = JSON.parse(fs.readFileSync(path.join(opts.site, "tB/symbols.json"), "utf8"));
  const proseQueries = loadProseQueries();
  checkProseUrlsExist(proseQueries, ctx.docs);

  const queries = buildQuerySet(symbolIndex, proseQueries, opts.sample);
  console.log(
    `Evaluating ${queries.length} queries ` +
    `(${queries.filter((q) => q.category === "symbol-bare").length} bare, ` +
    `${queries.filter((q) => q.category === "symbol-qualified").length} qualified, ` +
    `${queries.filter((q) => q.category === "prose").length} prose) against ${opts.site}\n`
  );

  const evalResult = evaluate(ctx, queries);
  const cost = measureCost(rawText, ctx, ctx.docs);

  const bare = evalResult.perQuery.filter((r) => r.category === "symbol-bare");
  const result = {
    site: opts.site,
    overall: summarize(evalResult.perQuery),
    byCategory: {
      "symbol-bare": summarize(evalResult.perQuery, (r) => r.category === "symbol-bare"),
      "symbol-qualified": summarize(evalResult.perQuery, (r) => r.category === "symbol-qualified"),
      prose: summarize(evalResult.perQuery, (r) => r.category === "prose"),
    },
    byKind: {
      type: summarize(evalResult.perQuery, (r) => r.kindGroup === "type"),
      member: summarize(evalResult.perQuery, (r) => r.kindGroup === "member"),
    },
    byTier: Object.fromEntries(
      [...new Set(bare.map((r) => r.tier))]
        .sort()
        .map((tier) => [tier, summarize(evalResult.perQuery, (r) => r.category === "symbol-bare" && r.tier === tier)])
    ),
    bareAnyPageHit10: bare.length ? (100 * bare.filter((r) => r.anyPageHit10).length) / bare.length : 0,
    tierOrder: summarizeTierOrder(evalResult.perQuery),
    cost,
    medianLatencyMs: evalResult.medianLatencyMs,
    perQuery: evalResult.perQuery,
  };

  printTable(result);
  if (opts.failures) printFailures(result.perQuery, opts.failures);

  if (opts.compare) {
    const saved = JSON.parse(fs.readFileSync(opts.compare, "utf8"));
    saved.file = opts.compare;
    printCompare(result, saved, opts.worstN);
  }

  if (opts.save) {
    const compact = {
      groundTruth: GROUND_TRUTH,
      site: result.site,
      overall: result.overall,
      byCategory: result.byCategory,
      byKind: result.byKind,
      byTier: result.byTier,
      bareAnyPageHit10: result.bareAnyPageHit10,
      tierOrder: result.tierOrder,
      cost: { entries: result.cost.entries, rawBytes: result.cost.rawBytes, gzipBytes: result.cost.gzipBytes, medianBuildMs: result.cost.medianBuildMs, heapDeltaBytes: result.cost.heapDeltaBytes },
      medianLatencyMs: result.medianLatencyMs,
      ranks: rankMap(result.perQuery),
    };
    // No pretty-printing: the rank map alone has one entry per query (8,000+
    // in the full run), so indentation would multiply the file's size for a
    // shape nobody reads by eye.
    fs.writeFileSync(opts.save, JSON.stringify(compact));
    console.log(`\nSaved to ${opts.save}`);
  }

  process.exit(0);
}

main();
