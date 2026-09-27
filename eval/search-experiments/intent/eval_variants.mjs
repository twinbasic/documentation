import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { resolvePaths, loadLunr } from "./site_search.mjs";
import { buildIndex, search } from "./variants.mjs";
import { buildIntentGroundTruth } from "./intent_gt.mjs";

const SITE = process.argv[2] || path.resolve("docs/_site");

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
  const h = n.indexOf("#");
  return h === -1 ? n : n.slice(0, h);
}

const TYPE_KINDS = new Set(["class", "module", "interface", "enum", "control", "object", "type", "package"]);
function kindGroup(kind) { return TYPE_KINDS.has(kind) ? "type" : "member"; }

// Tier of an individual symbol occurrence, for X1t (see buildTieredExactFields
// below) and the tier-order/recall analysis. Tier 1 = type or core language
// element, 2 = ordinary member, 3 = enum constant. Mirrors intent_gt.mjs's
// per-name priority logic but applied per symbol occurrence.
const CORE_ONLY_KINDS = new Set(["statement", "keyword", "operator", "attribute", "directive"]);
const MODULE_MEMBER_KINDS = new Set(["function", "property", "sub", "method"]);
function buildContainerKindMap(symbols) {
  const m = new Map();
  for (const s of symbols) if (TYPE_KINDS.has(s.kind)) m.set(s.name.toLowerCase(), s.kind);
  return m;
}
function tierOfSymbol(s, containerKind) {
  if (TYPE_KINDS.has(s.kind)) return 1;
  if (CORE_ONLY_KINDS.has(s.kind) && s.package === null) return 1;
  if (MODULE_MEMBER_KINDS.has(s.kind) && s.container && containerKind.get(s.container.toLowerCase()) === "module") return 1;
  if (s.kind === "enumvalue") return 3;
  return 2;
}

// Builds exact1/exact2/exact3 marker strings per doc for X1t: which names in
// this doc's `names` field belong to which tier, so ranking can be biased by
// tier via three separately-boosted fields instead of one flat field (X1).
//
// NOTE ON APPROXIMATION: search-data.json's `names` field is already joined
// to entries by URL at build time (WIP.Search.md Design §2); this replica
// does not have that join's code, only its *output* (the names strings), so
// it re-derives, for each (doc URL, name) pair, which symbol kind produced
// it by matching symbols.json entries by normalized URL, falling back to
// path-only URL match, and finally to "any symbol with this name" if the
// name isn't found under this doc's URL at all (rare -- can happen for
// generic-section folding, which moves a name's mention without moving the
// symbol's own anchor). In production the build's own join already knows
// each symbol's kind at emission time, so it would emit exact1/exact2/exact3
// directly -- no re-derivation needed, and no approximation risk.
function buildTieredExactFields(docsRaw, symbols) {
  const containerKind = buildContainerKindMap(symbols);
  const exactByUrl = new Map(); // normalizeUrl(with anchor) -> Map(name.lower -> tier)
  const exactByPath = new Map(); // pathOnly -> Map(name.lower -> tier)
  for (const s of symbols) {
    const tier = tierOfSymbol(s, containerKind);
    const full = normalizeUrl(s.url);
    const p = pathOnly(s.url);
    if (!exactByUrl.has(full)) exactByUrl.set(full, new Map());
    exactByUrl.get(full).set(s.name.toLowerCase(), tier);
    if (!exactByPath.has(p)) exactByPath.set(p, new Map());
    // keep the *best* (lowest-numbered) tier seen at this path for this name
    const cur = exactByPath.get(p).get(s.name.toLowerCase());
    if (cur === undefined || tier < cur) exactByPath.get(p).set(s.name.toLowerCase(), tier);
  }
  const byNameAny = new Map(); // name.lower -> best tier anywhere
  for (const s of symbols) {
    const t = tierOfSymbol(s, containerKind);
    const cur = byNameAny.get(s.name.toLowerCase());
    if (cur === undefined || t < cur) byNameAny.set(s.name.toLowerCase(), t);
  }

  const docsWithTiers = {};
  let approxFallbacks = 0;
  for (const id in docsRaw) {
    const d = docsRaw[id];
    const names = (d.names || "").split(/\s+/).filter(Boolean);
    const tiers = { 1: [], 2: [], 3: [] };
    const full = normalizeUrl(d.relUrl);
    const p = pathOnly(d.relUrl);
    for (const n of names) {
      const lower = n.toLowerCase();
      let tier = exactByUrl.get(full)?.get(lower);
      if (tier === undefined) tier = exactByPath.get(p)?.get(lower);
      if (tier === undefined) { tier = byNameAny.get(lower) ?? 2; approxFallbacks++; }
      tiers[tier].push(lower + "_");
    }
    docsWithTiers[id] = { ...d, exact1: tiers[1].join(" "), exact2: tiers[2].join(" "), exact3: tiers[3].join(" ") };
  }
  return { docsWithTiers, approxFallbacks };
}

function buildOldQuerySet(symbols, proseQueries) {
  const queries = [];
  const byName = new Map();
  for (const s of symbols) {
    const k = s.name.toLowerCase();
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(s);
  }
  for (const [, group] of byName) {
    const expected = [...new Set(group.map((s) => normalizeUrl(s.url)))];
    const kinds = [...new Set(group.map((s) => kindGroup(s.kind)))];
    queries.push({ category: "symbol-bare", kindGroup: kinds.length === 1 ? kinds[0] : "mixed", q: group[0].name, expected });
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
    queries.push({ category: "symbol-qualified", kindGroup: kindGroup(group[0].kind), q: `${group[0].container}.${group[0].name}`, expected });
  }
  queries.push(...proseQueries.map((r) => ({ category: "prose", q: r.q, expected: r.expected.map(normalizeUrl), pathOnlyMatch: true })));
  return queries;
}

function buildIntentQuerySet(symbols, proseQueriesFixed) {
  const { queries: bareIntent, tierCounts, doubtful } = buildIntentGroundTruth(symbols);
  const qualified = buildOldQuerySet(symbols, []).filter((q) => q.category === "symbol-qualified");
  const prose = proseQueriesFixed.map((r) => ({ category: "prose", q: r.q, expected: r.expected.map(normalizeUrl), pathOnlyMatch: true }));
  return { queries: [...bareIntent.map((q) => ({ ...q, category: "symbol-bare" })), ...qualified, ...prose], tierCounts, doubtful };
}

function evaluate(ctx, queries, searchFn, opts) {
  const perQuery = [];
  const latencies = [];
  for (const query of queries) {
    const t0 = performance.now();
    const results = searchFn(ctx, query.q, opts);
    latencies.push(performance.now() - t0);
    const expectedSet = new Set(query.expected);
    const matches = (u) => query.pathOnlyMatch ? query.expected.some((e) => pathOnly(u) === pathOnly(e)) : expectedSet.has(normalizeUrl(u));
    let firstHitRank = null, anyCorrect = false;
    for (let i = 0; i < results.length; i++) {
      const url = ctx.docs[results[i].ref]?.relUrl;
      if (matches(url)) { anyCorrect = true; if (firstHitRank === null) firstHitRank = i + 1; }
    }
    const cappedRank = firstHitRank !== null && firstHitRank <= 20 ? firstHitRank : null;
    perQuery.push({ q: query.q, category: query.category, tier: query.tier, firstHitRank, reciprocalRank: cappedRank ? 1 / cappedRank : 0, hit1: firstHitRank === 1, hit10: firstHitRank !== null && firstHitRank <= 10, zeroCorrect: !anyCorrect });
  }
  latencies.sort((a, b) => a - b);
  return { perQuery, medianLatencyMs: latencies[Math.floor(latencies.length / 2)] || 0 };
}

function summarize(perQuery, filterFn) {
  const rows = filterFn ? perQuery.filter(filterFn) : perQuery;
  const n = rows.length;
  if (n === 0) return { n: 0, hit1: 0, hit10: 0, mrr: 0 };
  const pct = (f) => (100 * rows.filter(f).length) / n;
  const mrr = rows.reduce((a, r) => a + r.reciprocalRank, 0) / n;
  return { n, hit1: pct((r) => r.hit1), hit10: pct((r) => r.hit10), mrr };
}

const EIGHTEEN = ["symbol index", "VB", "Lock", "Time$", "Column", "64-bit compilation", "CheckBox", "PropertyPage", "vbForm", "vbListBox", "ListImage", "ColumnHeader", "ListItem", "Node", "ToolWindow", "conditional compilation", "array bounds checks", "Fusion"];

function runConfig(lunr, docsRaw, oldQueries, intentQueries, opts, label) {
  const ctx = { lunr, index: buildIndex(lunr, docsRaw, opts), docs: docsRaw };
  const oldEval = evaluate(ctx, oldQueries, search, opts);
  const intentEval = evaluate(ctx, intentQueries, search, opts);
  const eighteen = {};
  for (const q of EIGHTEEN) {
    const row = intentEval.perQuery.find((r) => r.q === q) || oldEval.perQuery.find((r) => r.q === q);
    eighteen[q] = row ? row.firstHitRank : "n/a";
  }
  return {
    label,
    old: { overall: summarize(oldEval.perQuery), bare: summarize(oldEval.perQuery, (r) => r.category === "symbol-bare"), qualified: summarize(oldEval.perQuery, (r) => r.category === "symbol-qualified"), prose: summarize(oldEval.perQuery, (r) => r.category === "prose") },
    intent: { overall: summarize(intentEval.perQuery), bare: summarize(intentEval.perQuery, (r) => r.category === "symbol-bare"), qualified: summarize(intentEval.perQuery, (r) => r.category === "symbol-qualified"), prose: summarize(intentEval.perQuery, (r) => r.category === "prose") },
    eighteen,
    perQueryOld: oldEval.perQuery,
    perQueryIntent: intentEval.perQuery,
  };
}

// Tier-order + recall analysis for multi-URL bare-name queries: for each
// name whose symbol group spans >=2 distinct normalized URLs, tag every
// result in the top 20 that IS one of those URLs with its tier (1/2/3),
// then check every ordered pair for a violation (a higher tier NUMBER --
// lower priority -- ranked strictly ahead of a lower tier number). A
// near-name match (stemmed/wildcard neighbour, e.g. "Nodes" for "Node") is
// not in the group's URL set, so it can never register as a violation --
// only exact-name matches of a *different* tier count.
function tierOrderAnalysis(ctx, symbols, searchFn, opts) {
  const containerKind = buildContainerKindMap(symbols);
  const byName = new Map();
  for (const s of symbols) {
    const k = s.name.toLowerCase();
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(s);
  }
  let queriesConsidered = 0, violatingQueries = 0, totalViolationPairs = 0;
  let recall10Sum = 0, recall20Sum = 0;
  const violationExamples = [];
  for (const [, group] of byName) {
    const urlTier = new Map(); // normalizedUrl -> {tier, name}
    for (const s of group) {
      const u = normalizeUrl(s.url);
      const t = tierOfSymbol(s, containerKind);
      if (!urlTier.has(u) || urlTier.get(u) > t) urlTier.set(u, t);
    }
    if (urlTier.size < 2) continue; // only interesting when the name spans multiple tiers/pages
    queriesConsidered++;
    const results = searchFn(ctx, group[0].name, opts);
    const seen = new Set();
    const hits = []; // {rank, tier, url}
    for (let i = 0; i < results.length && i < 20; i++) {
      const url = normalizeUrl(ctx.docs[results[i].ref]?.relUrl);
      if (!urlTier.has(url) || seen.has(url)) continue;
      seen.add(url);
      hits.push({ rank: i + 1, tier: urlTier.get(url), url });
    }
    const totalExpected = urlTier.size;
    const found10 = hits.filter((h) => h.rank <= 10).length;
    const found20 = hits.length;
    recall10Sum += found10 / totalExpected;
    recall20Sum += found20 / totalExpected;
    let localViolations = 0;
    for (let i = 0; i < hits.length; i++) {
      for (let j = i + 1; j < hits.length; j++) {
        if (hits[i].tier > hits[j].tier) localViolations++; // i ranks before j but has worse (higher) tier number
      }
    }
    if (localViolations > 0) {
      violatingQueries++;
      totalViolationPairs += localViolations;
      if (violationExamples.length < 15) violationExamples.push({ name: group[0].name, hits, localViolations });
    }
  }
  return {
    queriesConsidered,
    violatingQueries,
    totalViolationPairs,
    recall10Pct: queriesConsidered ? (100 * recall10Sum) / queriesConsidered : 0,
    recall20Pct: queriesConsidered ? (100 * recall20Sum) / queriesConsidered : 0,
    violationExamples,
  };
}

function medianBuildTime(lunr, docsRaw, opts, runs = 7) {
  const times = [];
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    buildIndex(lunr, docsRaw, opts);
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  return times[Math.floor(runs / 2)];
}

function heapFor(lunr, docsRaw, opts) {
  if (!global.gc) return null;
  global.gc();
  const before = process.memoryUsage().heapUsed;
  const idx = buildIndex(lunr, docsRaw, opts);
  global.gc();
  const after = process.memoryUsage().heapUsed;
  // Use the index after the reading: otherwise V8 may treat it as dead and
  // collect it before `after`, under-counting what it retains.
  if (!idx) throw new Error("index build returned nothing");
  return after - before;
}

async function main() {
  const { dataPath, lunrPath } = resolvePaths(SITE);
  const lunr = loadLunr(lunrPath);
  const docsRaw = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const symIdx = JSON.parse(fs.readFileSync(path.join(SITE, "tB/symbols.json"), "utf8"));
  const proseQueries = JSON.parse(fs.readFileSync(path.resolve("search_prose_queries.json"), "utf8"));

  const oldQueries = buildOldQuerySet(symIdx.symbols, proseQueries);
  const { queries: intentQueries, tierCounts, doubtful } = buildIntentQuerySet(symIdx.symbols, proseQueries);
  const { docsWithTiers, approxFallbacks } = buildTieredExactFields(docsRaw, symIdx.symbols);
  console.error(`tiered-field approximation fallbacks: ${approxFallbacks} of ${Object.values(docsRaw).reduce((a, d) => a + (d.names || "").split(/\s+/).filter(Boolean).length, 0)} name occurrences`);

  const configs = [
    ["baseline", docsRaw, {}],
    ["X1-B50", docsRaw, { x1: 50 }],
    ["X1-B200", docsRaw, { x1: 200 }],
    ["X1-B1000", docsRaw, { x1: 1000 }],
    ["X2-P5", docsRaw, { x2: 5 }],
    ["X2-P20", docsRaw, { x2: 20 }],
    ["X2-P50", docsRaw, { x2: 50 }],
    ["X3", docsRaw, { x3: true }],
    ["X1t(200/100/50)", docsWithTiers, { x1t: { b1: 200, b2: 100, b3: 50 } }],
    ["X1t(1000/200/50)", docsWithTiers, { x1t: { b1: 1000, b2: 200, b3: 50 } }],
    ["X1(200)+X2(20)", docsRaw, { x1: 200, x2: 20 }],
    ["X1(200)+X3", docsRaw, { x1: 200, x3: true }],
    ["X1t(200/100/50)+X2(20)", docsWithTiers, { x1t: { b1: 200, b2: 100, b3: 50 }, x2: 20 }],
    ["X1t(200/100/50)+X2(20)+X3", docsWithTiers, { x1t: { b1: 200, b2: 100, b3: 50 }, x2: 20, x3: true }],
    ["X1(200)+X2(20)+X3", docsRaw, { x1: 200, x2: 20, x3: true }],
  ];

  // configs to run the expensive 7-run cost + heap measurement on (all of
  // them would multiply total runtime; the recommended combo and baseline
  // are what the report needs numbers for).
  const costConfigs = new Set(["baseline", "X1-B200", "X1t(200/100/50)", "X1t(200/100/50)+X2(20)+X3", "X1(200)+X2(20)+X3"]);

  const results = [];
  for (const [label, docsForRun, opts] of configs) {
    const r = runConfig(lunr, docsForRun, oldQueries, intentQueries, opts, label);
    if (costConfigs.has(label)) {
      r.cost = { medianBuildMs: medianBuildTime(lunr, docsForRun, opts), heapDeltaBytes: heapFor(lunr, docsForRun, opts) };
    }
    const ctx = { lunr, index: buildIndex(lunr, docsForRun, opts), docs: docsForRun };
    r.tierAnalysis = tierOrderAnalysis(ctx, symIdx.symbols, search, opts);
    results.push(r);
    console.error(`done: ${label}`);
  }

  fs.writeFileSync(path.resolve("out_results.json"), JSON.stringify({ tierCounts, doubtful, approxFallbacks, results }, null, 1));
  console.log("wrote out_results.json");
}

main();
