#!/usr/bin/env node
// Measure the repository's own tooling for repetition and structure.
//
//     node scripts/survey_tooling.mjs                  # the summary, then every listing
//     node scripts/survey_tooling.mjs --summary        # the summary only
//     node scripts/survey_tooling.mjs --root <dir>     # measure another checkout
//     node scripts/survey_tooling.mjs --top 300        # list more clone regions
//     node scripts/survey_tooling.mjs --include-perf   # list what involves perf/ too
//
// Not a gate, and nothing runs it. It is a measurement taken by hand before and
// after a piece of refactoring work: builder/PLAN-TOOLING-REVIEW.md records its
// summary at the commit the tooling review started from, and the review's last
// phase runs it again to compare. It reads only the files git tracks, so a
// scratch file never moves a number; and --root lets this copy of the script
// measure a checkout that does not contain it, such as a worktree at that
// baseline commit.
//
// ---------------------------------------------------------- what it measures
//
// Clones. A token-level detector in the manner of PMD's CPD. Each file is
// tokenised with acorn, and identifiers and literals are reduced to their kind,
// so two copies that differ only in names or strings still match. Every run of
// --window equal tokens that occurs in two places is grown into the longest
// region the two places share. Comments and layout are not tokens, so a
// formatter pass moves nothing here. A window that occurs in more than
// MAX_OCCURRENCES places is skipped as boilerplate, such as an import block,
// rather than reported as that many copies of each other.
//
// Top-level functions defined under the same name in two or more files. A
// lead, not a verdict: two `pad` helpers may do different things. Two `opt`
// helpers that nearly agree are how the review found one argument parser in
// three versions.
//
// Command-line handling: the files that read process.argv, how many take
// node:util's parseArgs, and how many define a private flag/opt/die helper.
//
// Undeclared packages: bare import specifiers, other than Node's own modules,
// that package.json does not declare. Such a package is installed only because
// something else depends on it, and an update of that something can remove it.
//
// The import graph: edges that cross a top-level directory, the files nothing
// imports (entry points, scripts injected into a page, or dead code), and the
// most imported modules.
//
// perf/ is a lab notebook (decision 1 in PLAN-TOOLING-REVIEW.md): it is
// measured, but the summary counts it separately and the listings leave it out
// unless --include-perf is given, because nothing in it is maintained.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import * as acorn from "acorn";
import * as walk from "acorn-walk";

const TOOLING_DIRS = ["builder", "scripts", "lib", "book", "eval", "wisdom", "test", "perf"];
const VENDORED = [/^book\/lib\/paged\.browser\.js$/, /^builder\/vendor\//];
const LAB = "perf/";
const MAX_OCCURRENCES = 40;
const ARG_HELPERS = new Set(["flag", "opt", "die"]);

const USAGE = "usage: node scripts/survey_tooling.mjs [--root DIR] [--summary] " +
  "[--window N] [--top N] [--include-perf]";

let opts;
try {
  ({ values: opts } = parseArgs({
    options: {
      root: { type: "string" },
      summary: { type: "boolean", default: false },
      window: { type: "string", default: "60" },
      top: { type: "string", default: "45" },
      "include-perf": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  }));
} catch (err) {
  console.error(`${err.message}\n${USAGE}`);
  process.exit(2);
}
if (opts.help) {
  console.log(USAGE);
  process.exit(0);
}
const WINDOW = positiveInt("window", opts.window);
const TOP = positiveInt("top", opts.top);
const ROOT = path.resolve(opts.root ?? fileURLToPath(new URL("..", import.meta.url)));
const listed = (f) => opts["include-perf"] || !f.startsWith(LAB);

function positiveInt(name, raw) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    console.error(`--${name} expects a positive integer, got: ${raw}\n${USAGE}`);
    process.exit(2);
  }
  return n;
}

function gitFiles(...args) {
  try {
    return execFileSync("git", ["ls-files", ...args], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
      .split("\n").filter(Boolean);
  } catch (err) {
    const reason = String(err.stderr ?? "").trim() || err.message;
    console.error(`cannot list the files git tracks under ${ROOT}: ${reason}`);
    process.exit(2);
  }
}

// Top-level directory, with scripts/lib/ told apart from the tools that use it.
const areaOf = (f) => (f.startsWith("scripts/lib/") ? "scripts/lib" : f.split("/")[0]);

// ------------------------------------------------------------------ parsing

const files = gitFiles("--", ...TOOLING_DIRS)
  .filter((f) => /\.(mjs|js|cjs)$/.test(f) && !VENDORED.some((re) => re.test(f)));

const ACORN_OPTIONS = {
  ecmaVersion: "latest", allowHashBang: true, allowAwaitOutsideFunction: true,
  allowReturnOutsideFunction: true, locations: true,
};

const parsed = new Map(); // file -> { tokens: [{ kind, line, text }], ast }
for (const f of files) {
  const src = readFileSync(path.join(ROOT, f), "utf8");
  // A page script injected into a browser is not a module; try it as both.
  let ast = null;
  let sourceType = null;
  for (const type of ["module", "script"]) {
    try {
      ast = acorn.parse(src, { ...ACORN_OPTIONS, sourceType: type });
      sourceType = type;
      break;
    } catch {
      // try the other source type
    }
  }
  if (!ast) {
    console.error(`skipped, acorn cannot parse it: ${f}`);
    continue;
  }
  const tokens = [];
  for (const tok of acorn.tokenizer(src, { ...ACORN_OPTIONS, sourceType })) {
    tokens.push({ kind: tokenKind(tok), line: tok.loc.start.line, text: src.slice(tok.start, tok.end) });
  }
  parsed.set(f, { tokens, ast });
}

// Identifiers and literals compare by kind only; keywords and punctuation as themselves.
function tokenKind(tok) {
  switch (tok.type.label) {
    case "name": return "name";
    case "privateId": return "name";
    case "string": return "string";
    case "num": return "number";
    case "template": return "template";
    case "regexp": return "regexp";
    default: return tok.type.keyword ?? tok.type.label;
  }
}

// ------------------------------------------------------------------- clones

const kindIds = new Map();
const seqs = new Map(); // file -> Int32Array of token kinds
for (const [f, p] of parsed) {
  seqs.set(f, Int32Array.from(p.tokens, (t) => {
    let id = kindIds.get(t.kind);
    if (id === undefined) kindIds.set(t.kind, (id = kindIds.size + 1));
    return id;
  }));
}
const order = new Map([...parsed.keys()].map((f, i) => [f, i]));

function findClones() {
  // A polynomial rolling hash over every window; windows that share a hash are
  // candidate pairs, confirmed token by token before a region is grown.
  const B = 1000003;
  let bPowWindow = 1;
  for (let i = 0; i < WINDOW; i++) bPowWindow = Math.imul(bPowWindow, B) >>> 0;
  const buckets = new Map();
  for (const [f, s] of seqs) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (Math.imul(h, B) + s[i]) >>> 0;
      if (i >= WINDOW) h = (h - Math.imul(s[i - WINDOW], bPowWindow)) >>> 0;
      if (i < WINDOW - 1) continue;
      let occurrences = buckets.get(h);
      if (!occurrences) buckets.set(h, (occurrences = []));
      occurrences.push([f, i - WINDOW + 1]);
    }
  }

  const regions = [];
  const grown = new Set();
  for (const occurrences of buckets.values()) {
    if (occurrences.length < 2 || occurrences.length > MAX_OCCURRENCES) continue;
    for (let x = 0; x < occurrences.length; x++) {
      for (let y = x + 1; y < occurrences.length; y++) {
        const region = grow(occurrences[x], occurrences[y], grown);
        if (region) regions.push(region);
      }
    }
  }
  return regions.sort((p, q) => q.length - p.length || order.get(p.a) - order.get(q.a) || p.aStart - q.aStart);
}

// Grow the region two equal windows belong to, once per region: every window
// inside it backs up to the same start, and `grown` remembers that start.
function grow([fa, ia], [fb, ib], grown) {
  if (order.get(fa) > order.get(fb) || (fa === fb && ia > ib)) [fa, ia, fb, ib] = [fb, ib, fa, ia];
  if (fa === fb && ib - ia < WINDOW) return null; // a window overlapping itself
  const a = seqs.get(fa);
  const b = seqs.get(fb);
  for (let k = 0; k < WINDOW; k++) if (a[ia + k] !== b[ib + k]) return null; // a hash collision
  let back = 0;
  while (ia - back > 0 && ib - back > 0 && a[ia - back - 1] === b[ib - back - 1]) back++;
  const aStart = ia - back;
  const bStart = ib - back;
  const key = `${fa}:${aStart}|${fb}:${bStart}`;
  if (grown.has(key)) return null;
  grown.add(key);
  let length = 0;
  while (aStart + length < a.length && bStart + length < b.length && a[aStart + length] === b[bStart + length]) length++;
  // Code that repeats within itself matches its own continuation; keep the two
  // regions from overlapping.
  if (fa === fb) length = Math.min(length, bStart - aStart);
  const ta = parsed.get(fa).tokens;
  const tb = parsed.get(fb).tokens;
  return {
    a: fa, b: fb, length, aStart,
    aLines: [ta[aStart].line, ta[aStart + length - 1].line],
    bLines: [tb[bStart].line, tb[bStart + length - 1].line],
    head: ta.slice(aStart, aStart + 14).map((t) => t.text).join(" "),
  };
}

// ------------------------------------------------- declarations and imports

const functionDefs = new Map(); // name -> [{ file, line, lines }]
const argvReaders = new Set();
const parseArgsUsers = new Set();
const argHelperFiles = new Set();
const importers = new Map([...parsed.keys()].map((f) => [f, new Set()]));
const edges = [];
const bareImports = new Map(); // package -> Set of files

for (const [f, { ast }] of parsed) {
  for (const statement of ast.body) {
    const d = statement.type.startsWith("Export") ? statement.declaration : statement;
    if (!d) continue;
    if (d.type === "FunctionDeclaration" && d.id) addFunction(d.id.name, f, d);
    if (d.type === "VariableDeclaration") {
      for (const v of d.declarations) {
        if (v.id.type === "Identifier" && /Function/.test(v.init?.type ?? "")) addFunction(v.id.name, f, v);
      }
    }
  }
  walk.full(ast, (node) => {
    if (node.type === "MemberExpression" && node.object.name === "process" && node.property.name === "argv") {
      argvReaders.add(f);
    }
    if (node.type === "ImportDeclaration" && /^(node:)?util$/.test(node.source.value) &&
        node.specifiers.some((s) => s.imported?.name === "parseArgs")) {
      parseArgsUsers.add(f);
    }
    const specifier = moduleSpecifier(node);
    if (typeof specifier === "string") addImport(f, specifier);
  });
}

function addFunction(name, file, node) {
  const defs = functionDefs.get(name) ?? [];
  defs.push({ file, line: node.loc.start.line, lines: node.loc.end.line - node.loc.start.line + 1 });
  functionDefs.set(name, defs);
  if (ARG_HELPERS.has(name)) argHelperFiles.add(file);
}

// The module a node loads, if it loads one by a literal name: import and
// export ... from, import(), require(), and new Worker(new URL(...)).
function moduleSpecifier(node) {
  switch (node.type) {
    case "ImportDeclaration":
    case "ExportAllDeclaration":
    case "ExportNamedDeclaration":
      return node.source?.value;
    case "ImportExpression":
      return node.source.type === "Literal" ? node.source.value : undefined;
    case "CallExpression":
      return node.callee.name === "require" && node.arguments[0]?.type === "Literal"
        ? node.arguments[0].value : undefined;
    case "NewExpression": {
      const url = node.callee.name === "Worker" ? node.arguments[0] : undefined;
      return url?.type === "NewExpression" && url.arguments[0]?.type === "Literal"
        ? url.arguments[0].value : undefined;
    }
    default:
      return undefined;
  }
}

function addImport(file, specifier) {
  if (specifier.startsWith(".")) {
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
    edges.push([file, target]);
    importers.get(target)?.add(file);
    return;
  }
  if (specifier.startsWith("node:") || specifier.startsWith("/")) return;
  const parts = specifier.split("/");
  const pkg = specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
  if (builtinModules.includes(pkg)) return;
  if (!bareImports.has(pkg)) bareImports.set(pkg, new Set());
  bareImports.get(pkg).add(file);
}

const manifest = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
const declared = new Set(["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]
  .flatMap((field) => Object.keys(manifest[field] ?? {})));
const undeclared = [...bareImports].filter(([pkg]) => !declared.has(pkg));

// ------------------------------------------------------------------ summary

const outsideLab = (f) => !f.startsWith(LAB);
const clones = findClones();
const repeatedNames = [...functionDefs]
  .filter(([, defs]) => new Set(defs.map((d) => d.file)).size >= 2);
const repeatedOutsideLab = repeatedNames
  .filter(([, defs]) => new Set(defs.filter((d) => outsideLab(d.file)).map((d) => d.file)).size >= 2);
const toolsOutsideLab = [...argvReaders].filter(outsideLab);
const totalTokens = [...seqs.values()].reduce((sum, s) => sum + s.length, 0);

const summary = [
  ["files surveyed", files.length],
  ["tokens", totalTokens],
  [`clone regions of ${WINDOW}+ tokens`, clones.length],
  ["  not involving perf/", clones.filter((c) => outsideLab(c.a) && outsideLab(c.b)).length],
  ["top-level function names defined in 2+ files", repeatedNames.length],
  ["  counting only files outside perf/", repeatedOutsideLab.length],
  ["files outside perf/ that read process.argv", toolsOutsideLab.length],
  ["  of which import node:util parseArgs", toolsOutsideLab.filter((f) => parseArgsUsers.has(f)).length],
  ["files outside perf/ defining flag, opt or die", [...argHelperFiles].filter(outsideLab).length],
  ["undeclared packages imported outside perf/", undeclared.filter(([, fs]) => [...fs].some(outsideLab)).length],
];

console.log(`# Tooling survey: ${ROOT}\n`);
const width = Math.max(...summary.map(([label]) => label.length));
for (const [label, value] of summary) console.log(`${label.padEnd(width)}  ${value}`);
if (opts.summary) process.exit(0);

// ----------------------------------------------------------------- listings

console.log("\n## Clone regions by pair of areas (tokens counted once per region)\n");
const byPair = new Map();
for (const c of clones) {
  const key = [areaOf(c.a), areaOf(c.b)].sort().join(" <-> ");
  const agg = byPair.get(key) ?? { regions: 0, tokens: 0 };
  agg.regions++;
  agg.tokens += c.length;
  byPair.set(key, agg);
}
for (const [key, agg] of [...byPair].sort((p, q) => q[1].tokens - p[1].tokens)) {
  console.log(`${String(agg.regions).padStart(5)} regions ${String(agg.tokens).padStart(7)} tokens  ${key}`);
}

console.log("\n## Files most involved in clone regions (tokens, counted on each side)\n");
const byFile = new Map();
for (const c of clones) for (const f of [c.a, c.b]) byFile.set(f, (byFile.get(f) ?? 0) + c.length);
for (const [f, n] of [...byFile].filter(([f]) => listed(f)).sort((p, q) => q[1] - p[1]).slice(0, 30)) {
  console.log(`${String(n).padStart(7)}  ${f} (of ${seqs.get(f).length})`);
}

const shownClones = clones.filter((c) => listed(c.a) && listed(c.b));
console.log(`\n## The ${Math.min(TOP, shownClones.length)} largest of ${shownClones.length} clone regions\n`);
for (const c of shownClones.slice(0, TOP)) {
  console.log(`${String(c.length).padStart(5)} tokens  ${c.a}:${c.aLines.join("-")}  ~  ${c.b}:${c.bLines.join("-")}`);
  console.log(`              ${c.head.slice(0, 150)}`);
}

const shownNames = (opts["include-perf"] ? repeatedNames : repeatedOutsideLab)
  .map(([name, defs]) => [name, defs.filter((d) => listed(d.file))])
  .sort((p, q) => q[1].length - p[1].length || p[0].localeCompare(q[0]));
console.log(`\n## ${shownNames.length} top-level function names defined in 2+ files\n`);
for (const [name, defs] of shownNames) {
  console.log(`${String(defs.length).padStart(3)}x ${name.padEnd(26)} ${defs.map((d) => `${d.file}:${d.line}(${d.lines})`).join("  ")}`);
}

console.log("\n## Undeclared packages\n");
if (!undeclared.length) console.log("none");
for (const [pkg, fs] of undeclared) console.log(`${pkg.padEnd(24)} ${[...fs].join("  ")}`);

console.log("\n## Import edges that cross an area\n");
const crossing = new Map();
for (const [from, to] of edges) {
  if (areaOf(from) === areaOf(to) || !listed(from) || !listed(to)) continue;
  const key = `${areaOf(from)} -> ${areaOf(to)}`;
  const list = crossing.get(key) ?? [];
  list.push(`${from} -> ${to}`);
  crossing.set(key, list);
}
for (const [key, list] of [...crossing].sort((p, q) => q[1].length - p[1].length)) {
  console.log(`${String(list.length).padStart(4)}  ${key}`);
  for (const edge of list.slice(0, 12)) console.log(`        ${edge}`);
  if (list.length > 12) console.log(`        ... and ${list.length - 12} more`);
}

// Names only, so a lead: a file named in a .bat file may be run by it, or may
// only be mentioned in one of its comments.
console.log("\n## Files nothing imports, and where their names appear\n");
const mentions = gitFiles()
  .filter((f) => /\.(bat|ya?ml|json|md|mjs|js|ps1)$/.test(f) && !f.startsWith("docs/Reference/"))
  .map((f) => [f, readFileSync(path.join(ROOT, f), "utf8")]);
for (const f of [...parsed.keys()].filter((f) => listed(f) && importers.get(f).size === 0)) {
  const base = path.posix.basename(f);
  const namedBy = mentions.filter(([g, text]) => g !== f && text.includes(base)).map(([g]) => g);
  const run = namedBy.filter((g) => /\.(bat|ya?ml)$/.test(g) || g === "package.json");
  const code = namedBy.filter((g) => /\.(mjs|js|ps1)$/.test(g));
  const docs = namedBy.filter((g) => g.endsWith(".md"));
  const where = run.length ? `named by ${run.join(", ")}`
    : code.length ? `named in code: ${code.slice(0, 3).join(", ")}`
    : docs.length ? `named only in ${docs.length} document(s)`
    : "NAMED NOWHERE";
  console.log(`  ${f.padEnd(48)} ${where}`);
}

console.log("\n## The most imported modules\n");
for (const [f, from] of [...importers].filter(([f]) => listed(f)).sort((p, q) => q[1].size - p[1].size).slice(0, 20)) {
  console.log(`${String(from.size).padStart(4)}  ${f}`);
}
