// Reading, naming and patching the twinBASIC IDE's minified ide/main.js, for
// scripts/ide_js.mjs and its tests (test/ide-js.test.mjs).
//
// The minifier only removes whitespace and renames locals and parameters: every
// top-level function and class, every property and every global keeps its name.
// So a top-level function or a method of a top-level class is a *unit* whose name
// is the same in every build, and the map of our names for its locals is keyed
// by the unit and by where each binding is declared inside it, never by its
// minified name, which changes from build to build.
//
// Nothing is ever printed from the syntax tree into main.js. The tree (acorn,
// with ranges and the token list) only says where things are, and every edit is
// a splice of the original text at a range, so a byte that no edit covers is
// the input's byte. `coverage` shows that the tokens, the comments and the
// whitespace between them account for every byte of the file. The readable view
// (prettier) is only for reading and for writing a fix; a fix comes back into
// main.js as the smallest token edit of the unit (patchUnits).
//
// The names are ours, never twinBASIC's: Wayne Phillips' own sources are never
// used (owner), so a name is what we understood a variable to be.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import * as acorn from "acorn";
import { analyze } from "eslint-scope";
import { buildNumber } from "../lib/tb-install.mjs";

/** A fix that does not apply to the build: a unit it names is missing, or the patch is not the fix. */
export class FixError extends Error {
  constructor(message) {
    super(message);
    this.name = "FixError";
  }
}

/** A name the map may not take: not an identifier, given twice in a unit, or one that would hide another name. */
export class NameError extends Error {
  constructor(message) {
    super(message);
    this.name = "NameError";
  }
}

/** The main.js of an install, from its twinBASIC.exe, its folder or the file itself. */
export function mainJsOf(p) {
  if (p.toLowerCase().endsWith(".js")) return p;
  const dir = p.toLowerCase().endsWith(".exe") ? path.dirname(p) : p;
  return path.join(dir, "ide", "main.js");
}

/** "BETA <n>" for the install a main.js is in, or null when its build cannot be read. */
export function buildOf(mainJs) {
  const n = buildNumber(path.join(path.dirname(path.dirname(path.resolve(mainJs))), "twinBASIC.exe"));
  return n === null ? null : `BETA ${n}`;
}

export function parse(text) {
  const tokens = [];
  const comments = [];
  const ast = acorn.parse(text, {
    ecmaVersion: "latest",
    sourceType: "script",
    ranges: true,
    onToken: tokens,
    onComment: comments,
    allowHashBang: true,
  });
  return { text, ast, tokens: tokens.filter((t) => t.type !== acorn.tokTypes.eof), comments };
}

export function load(file) {
  return parse(readFileSync(file, "utf8"));
}

/**
 * Whether the token list accounts for the whole file: every byte is in a token,
 * in a comment or in whitespace between them, nothing overlaps, and putting the
 * pieces back together gives the text.
 */
export function coverage({ text, tokens, comments }) {
  const pieces = [...tokens, ...comments].sort((a, b) => a.start - b.start);
  let at = 0;
  let gaps = 0;
  let overlaps = 0;
  let rebuilt = "";
  for (const p of pieces) {
    if (p.start < at) overlaps++;
    else {
      const between = text.slice(at, p.start);
      if (!/^\s*$/.test(between)) gaps++;
      rebuilt += between + text.slice(p.start, p.end);
      at = p.end;
    }
  }
  const tail = text.slice(at);
  if (!/^\s*$/.test(tail)) gaps++;
  rebuilt += tail;
  return { pieces: pieces.length, gaps, overlaps, exact: rebuilt === text && gaps === 0 && overlaps === 0 };
}

/**
 * The units a map is keyed on, by name: each top-level function declaration,
 * and each method of a top-level class ("Class.method", "Class.get name",
 * "Class.static m"). The value is the function node: for a method, its
 * FunctionExpression, `(params) { body }`.
 */
export function namedUnits(ast) {
  const units = new Map();
  for (const node of ast.body) {
    if (node.type === "FunctionDeclaration" && node.id) units.set(node.id.name, node);
    if (node.type === "ClassDeclaration" && node.id) {
      for (const m of node.body.body) {
        if (m.type !== "MethodDefinition" || m.key.type !== "Identifier") continue;
        units.set(unitNameOf(node, m), m.value);
      }
    }
  }
  return units;
}

const unitNameOf = (cls, m) =>
  `${cls.id.name}.${m.static ? "static " : ""}${m.kind === "get" || m.kind === "set" ? `${m.kind} ` : ""}${m.key.name}`;

/** eslint-scope's ScopeManager for a parse, made once. */
export function scopes(parsed) {
  parsed.scopeManager ??= analyze(parsed.ast, { ecmaVersion: 2022, sourceType: "script" });
  return parsed.scopeManager;
}

/**
 * The bindings declared inside a unit, each under a key that says where it is
 * declared and not what it is called: the scope's path from the unit's own
 * function scope (the index of each child scope in source order) and the
 * binding's place in that scope's order of declaration. "0#1" is the unit's
 * second parameter or variable, "0/2#0" the first binding of its third nested
 * scope. Returns undefined when the parse has no unit of that name.
 *
 * Each binding has its minified `name`, `def` (eslint-scope's definition type:
 * Parameter, Variable, FunctionName, ClassName, CatchClause...), `kind` (var,
 * let, const, or paramN for the Nth parameter), `refs` (its reference count) and
 * `ranges`, every place the name is written.
 */
export function bindings(parsed, unitName) {
  const node = namedUnits(parsed.ast).get(unitName);
  if (!node) return undefined;
  const root = scopes(parsed).acquire(node);
  const out = [];
  const visit = (scope, at) => {
    let ordinal = 0;
    if (scope.type !== "function-expression-name") {
      for (const v of scope.variables) {
        if (v.defs.length === 0) continue; // the implicit `arguments`
        const def = v.defs[0];
        const starts = new Set();
        const ranges = [];
        for (const id of [...v.identifiers, ...v.references.map((r) => r.identifier)]) {
          if (starts.has(id.start)) continue;
          starts.add(id.start);
          ranges.push([id.start, id.end]);
        }
        out.push({
          key: `${at}#${ordinal++}`,
          name: v.name,
          def: def.type,
          kind:
            def.type === "Parameter"
              ? `param${def.node.params.findIndex((p) => p.start <= def.name.start && def.name.end <= p.end)}`
              : (def.parent?.kind ?? ""),
          refs: v.references.length,
          ranges,
        });
      }
    }
    for (const [i, c] of scope.childScopes.entries()) visit(c, `${at}/${i}`);
  };
  visit(root, "0");
  return { node, bindings: out, free: new Set(root.through.map((r) => r.identifier.name)) };
}

/**
 * The unit's syntax tree with every binding replaced by its key, hashed. Equal
 * hashes in two builds mean the unit is the same code under other local names.
 * The tree and not the text, so that a printer's parentheses, quotes and
 * whitespace do not count as a change, nor does `{t}` against `{t: e}`: a
 * property's key is hashed as its name, never as the binding a shorthand's
 * key shares its place with.
 */
export function shapeHash(node, list) {
  const keyAt = new Map();
  for (const b of list) for (const r of b.ranges) keyAt.set(r[0], b.key);
  const h = createHash("sha256");
  const SKIP = new Set(["start", "end", "range", "loc", "raw", "shorthand"]);
  const emit = (n, asName = false) => {
    if (Array.isArray(n)) {
      h.update("[");
      for (const x of n) emit(x);
      h.update("]");
    } else if (n && typeof n === "object") {
      if (n.type === "Identifier" && keyAt.has(n.start) && !asName) {
        h.update(`\u{241F}${keyAt.get(n.start)};`);
        return;
      }
      h.update("{");
      for (const k of Object.keys(n)) {
        if (SKIP.has(k)) continue;
        h.update(`${k}:`);
        emit(n[k], n.type === "Property" && k === "key" && !n.computed);
      }
      h.update("}");
    } else h.update(`${typeof n}:${String(n)};`);
  };
  emit(node);
  return h.digest("hex").slice(0, 16);
}

/** A unit's bindings and its shape hash, or undefined when the parse has no such unit. */
export function unitInfo(parsed, unitName) {
  const b = bindings(parsed, unitName);
  return b && { ...b, shape: shapeHash(b.node, b.bindings) };
}

/**
 * The text of [start, end) with each edit [from, to, replacement] applied.
 * Edits may not overlap. A shorthand property's value (`{e}` or `{e = 1}`,
 * whose starts `shorthand` maps to their keys) keeps its key: renaming it
 * writes `e: new`.
 */
export function splice(text, start, end, edits, shorthand = new Map()) {
  const sorted = [...edits].sort((a, b) => a[0] - b[0]);
  let out = "";
  let at = start;
  for (const [from, to, rep] of sorted) {
    if (from < at || to > end) throw new Error(`edit ${from}-${to} is outside ${start}-${end} or overlaps another`);
    const key = shorthand.get(from);
    out += text.slice(at, from) + (key !== undefined && key !== rep ? `${key}: ${rep}` : rep);
    at = to;
  }
  return out + text.slice(at, end);
}

/**
 * The start of each shorthand property's value identifier inside `node`, to
 * its key's name. Every node is visited, a destructuring pattern's properties
 * included, which acorn-walk's walkers pass over.
 */
export function shorthandStarts(node) {
  const map = new Map();
  forEachNode(node, (n) => {
    if (n.type !== "Property" || !n.shorthand) return;
    const id = n.value.type === "AssignmentPattern" ? n.value.left : n.value;
    map.set(id.start, n.key.name);
  });
  return map;
}

function forEachNode(n, fn) {
  if (Array.isArray(n)) for (const x of n) forEachNode(x, fn);
  else if (n && typeof n.type === "string") {
    fn(n);
    for (const [k, v] of Object.entries(n)) if (k !== "range" && v && typeof v === "object") forEachNode(v, fn);
  }
}

// ---- the name map ----

/** An empty map, as names.json holds it. */
export const emptyMap = () => ({
  format: 1,
  about:
    "Our names for minified locals of the twinBASIC IDE's ide/main.js, keyed by unit and scope path (scripts/ide_js.mjs). These are our names, not the twinBASIC source's.",
  units: {},
});

/**
 * How each name of a unit's map entry applies to a build:
 *   exact    the unit's shape is unchanged, so the code is the same and the name
 *            is certainly this binding's
 *   carried  the unit changed, but its key still finds a binding of the same
 *            kind with the same reference count
 *   review   the key finds a binding of the same kind whose reference count
 *            changed: probably the same variable, used more or less often
 *   lost     the unit is gone, or the key finds no binding or one of another
 *            kind; the name is not applied
 * Exact and carried names are applied; review and lost ones are not.
 */
export function checkUnit(parsed, unitName, entry) {
  const u = unitInfo(parsed, unitName);
  const verdicts = [];
  for (const [key, n] of Object.entries(entry.names)) {
    const x = u?.bindings.find((y) => y.key === key);
    let verdict;
    let why = "";
    if (!u) {
      verdict = "lost";
      why = "the unit is gone";
    } else if (!x || x.def !== n.def || x.kind !== n.kind) {
      verdict = "lost";
      why = x ? `the key is now ${x.def} ${x.kind} ${x.name}` : "no binding has that key";
    } else if (u.shape === entry.shape) verdict = "exact";
    else if (x.refs === n.refs) verdict = "carried";
    else {
      verdict = "review";
      why = `${n.refs} references, now ${x.refs}`;
    }
    verdicts.push({ key, name: n.name, was: n.was, now: x?.name, verdict, why });
  }
  return { info: u, verdicts };
}

/** The names of a unit's entry that apply to this build, key to our name (exact and carried). */
export function applicableNames(parsed, unitName, entry) {
  const names = {};
  const skipped = [];
  if (!entry) return { names, skipped, info: unitInfo(parsed, unitName) };
  const { info, verdicts } = checkUnit(parsed, unitName, entry);
  for (const v of verdicts) {
    if (v.verdict === "exact" || v.verdict === "carried") names[v.key] = v.name;
    else skipped.push(v);
  }
  return { names, skipped, info };
}

const isIdentifierName = (s) => {
  if (!/^[A-Za-z_$][\w$]*$/.test(s) || s === "arguments" || s === "eval") return false;
  try {
    acorn.parse(`"use strict"; var ${s};`, { ecmaVersion: "latest" });
    return true;
  } catch {
    return false;
  }
};

/**
 * The map entry for a unit, sealed against a build: each name in `names` (key
 * to our name) with what its binding is in that build. Refuses a name that is
 * not an identifier, one given to two bindings of the unit, and one that would
 * hide another name the unit uses: a global or outer name it refers to, or a
 * binding of the unit that keeps its minified name.
 */
export function sealUnit(parsed, unitName, names, build) {
  const u = unitInfo(parsed, unitName);
  if (!u) throw new NameError(`the build has no unit named ${unitName}`);
  const seen = new Map();
  const entry = { namedOn: build, shape: u.shape, names: {} };
  for (const [key, name] of Object.entries(names)) {
    const x = u.bindings.find((y) => y.key === key);
    if (!x) throw new NameError(`${unitName} has no binding ${key}`);
    if (!isIdentifierName(name)) throw new NameError(`${unitName} ${key}: not a name a variable can have: ${name}`);
    if (seen.has(name)) throw new NameError(`${unitName}: ${name} is given to both ${seen.get(name)} and ${key}`);
    seen.set(name, key);
    if (u.free.has(name)) throw new NameError(`${unitName} ${key}: ${name} would hide the outer ${name} the unit uses`);
    entry.names[key] = { name, was: x.name, def: x.def, kind: x.kind, refs: x.refs };
  }
  for (const x of u.bindings) {
    if (!(x.key in names) && seen.has(x.name))
      throw new NameError(`${unitName} ${seen.get(x.name)}: ${x.name} would hide ${x.key}, which keeps that name`);
  }
  return entry;
}

/** The unit's own text with the names `names` (key to our name) put in. */
export function renamedUnitText(parsed, info, names) {
  const edits = [];
  for (const x of info.bindings) {
    const want = names[x.key];
    if (want) for (const r of x.ranges) edits.push([r[0], r[1], want]);
  }
  return splice(parsed.text, info.node.start, info.node.end, edits, shorthandStarts(info.node));
}

// ---- the readable view ----

let prettier;
/** Pretty-printed JavaScript, as prettier prints it; loaded on first use. */
export async function pretty(code) {
  prettier ??= await import("prettier");
  return prettier.format(code, { parser: "babel", printWidth: 100 });
}

/** A unit's text as code that parses on its own: a method is put back in a class of its own name. */
function standalone(unitName, text) {
  const dot = unitName.indexOf(".");
  return dot < 0 ? text : `class ${unitName.slice(0, dot)} {\n${unitName.slice(dot + 1)}${text}\n}`;
}

/**
 * The readable view of a unit: its text in our names, pretty-printed, under a
 * comment naming the build, where the unit is in main.js, its shape, our names
 * and any name of the map this build does not take. Returns undefined when the
 * build has no such unit.
 */
export async function unitView(parsed, unitName, entry, build) {
  const { names, skipped, info } = applicableNames(parsed, unitName, entry);
  if (!info) return undefined;
  const ours = Object.values(names);
  return (
    `// ${unitName}: ${build ?? "unknown build"}, main.js @${info.node.start}+${info.node.end - info.node.start}, shape ${info.shape}\n` +
    (ours.length ? `// our names, not twinBASIC's: ${ours.join(", ")}\n` : "") +
    (skipped.length
      ? `// not applied, the map does not fit this build: ${skipped.map((v) => `${v.key} ${v.name} (${v.verdict})`).join(", ")}\n`
      : "") +
    (await pretty(standalone(unitName, renamedUnitText(parsed, info, names))))
  );
}

/** The whole file with every unit of the map in our names, pretty-printed, for reading only. */
export async function fileView(parsed, map, build) {
  const edits = [];
  for (const [unit, entry] of Object.entries(map.units)) {
    const { names, info } = applicableNames(parsed, unit, entry);
    if (!info) continue;
    const sh = shorthandStarts(info.node);
    for (const x of info.bindings) {
      const want = names[x.key];
      if (!want) continue;
      for (const r of x.ranges) edits.push([r[0], r[1], sh.has(r[0]) ? `${sh.get(r[0])}: ${want}` : want]);
    }
  }
  const units = Object.keys(map.units).length;
  return `// ${build ?? "unknown build"} main.js, ${units} unit(s) in our names, not twinBASIC's\n${await pretty(splice(parsed.text, 0, parsed.text.length, edits))}`;
}

// ---- patching ----

// A token's text, and what it is compared by: a string by its value and a number
// by its value, so that the view's quotes (prettier writes "x" for 'x') and
// number forms (0.5 for .5) are not differences.
function tokenList(parsed, start, end) {
  const out = [];
  for (const t of parsed.tokens) {
    if (t.start < start || t.end > end) continue;
    const v = parsed.text.slice(t.start, t.end);
    const label = t.type.label;
    const cmp = label === "string" ? `s:${JSON.stringify(t.value)}` : label === "num" ? `n:${t.value}` : v;
    out.push({ s: t.start, e: t.end, v, cmp });
  }
  return out;
}

// Tokens a printer may add or leave out without changing the program: a ";"
// just before "}", and a trailing "," before ")", "]" or "}" (not an array hole).
function significant(list) {
  return list.filter((t, i) => {
    const next = list[i + 1]?.v;
    const prev = list[i - 1]?.v;
    if (t.v === ";" && next === "}") return false;
    return !(t.v === "," && (next === ")" || next === "]" || next === "}") && prev !== "," && prev !== "[");
  });
}

/** The runs where two token lists differ, as index ranges [a0, a1) of `a` and [b0, b1) of `b`. */
export function tokenHunks(a, b) {
  let lo = 0;
  while (lo < a.length && lo < b.length && a[lo].cmp === b[lo].cmp) lo++;
  let ha = a.length;
  let hb = b.length;
  while (ha > lo && hb > lo && a[ha - 1].cmp === b[hb - 1].cmp) {
    ha--;
    hb--;
  }
  const n = ha - lo;
  const m = hb - lo;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[lo + i].cmp === b[lo + j].cmp ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hunks = [];
  let i = 0;
  let j = 0;
  let open = null;
  const close = () => {
    if (open) hunks.push({ a0: lo + open.i, b0: lo + open.j, a1: lo + i, b1: lo + j });
    open = null;
  };
  while (i < n || j < m) {
    if (i < n && j < m && a[lo + i].cmp === b[lo + j].cmp) {
      close();
      i++;
      j++;
    } else {
      open ??= { i, j };
      if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) j++;
      else i++;
    }
  }
  close();
  // Two edits a token or two apart, with the same tokens between them, read
  // better as one: "o?e:TEXTtoHTML(e)" -> "e" rather than three pieces.
  const merged = [];
  for (const h of hunks) {
    const last = merged.at(-1);
    if (last && h.a0 - last.a1 <= 2 && h.b0 - last.b1 === h.a0 - last.a1) Object.assign(last, { a1: h.a1, b1: h.b1 });
    else merged.push({ ...h });
  }
  return merged;
}

// The space two pieces of code need between them: between two word characters,
// and where "+ +", "- -", "/ /" or "/ *" would otherwise run together.
const WORD = /[\w$]/;
const glue = (x, y) =>
  !x || !y ? "" : (WORD.test(x.at(-1)) && WORD.test(y[0])) || /^([+-])\1$|^\/[/*]$/.test(x.at(-1) + y[0]) ? " " : "";

/**
 * Splices a fix into the build's main.js. `fix` is a parse of a file of whole
 * units in our names: top-level functions, and classes holding the methods
 * that are fixed. For each unit, our names are turned back into this build's
 * minified names (only the names the map applies to this build; any other name
 * is kept as written), the unit's tokens are compared with the fix's, and each
 * run of tokens that differs becomes one edit of the minified text. The
 * patched file is parsed again, and each patched unit must have the shape of
 * the fix, so the patched main.js runs the code the fix shows.
 *
 * Returns { text, edits: [{ unit, from, to, before, after }], skipped: [unit, verdicts] }.
 * Throws a FixError when the fix does not apply.
 */
export function patchUnits(parsed, fix, map) {
  const units = [...namedUnits(fix.ast)];
  if (!units.length) throw new FixError("the fix holds no top-level function and no class method");
  // Our names back to the build's, over the whole fix file, so that a method
  // still parses in its class.
  const renames = [];
  const plan = [];
  const skipped = [];
  for (const [unit] of units) {
    const { names, skipped: notApplied, info } = applicableNames(parsed, unit, map.units[unit]);
    if (!info) throw new FixError(`the build has no unit named ${unit}`);
    if (notApplied.length) skipped.push([unit, notApplied]);
    const back = new Map();
    for (const [key, ours] of Object.entries(names)) back.set(ours, info.bindings.find((x) => x.key === key).name);
    const fb = unitInfo(fix, unit);
    for (const x of fb.bindings) {
      if (back.has(x.name)) for (const r of x.ranges) renames.push([r[0], r[1], back.get(x.name)]);
    }
    plan.push({ unit, info, oursShape: fb.shape });
  }
  const shorthand = new Map();
  for (const [, node] of units) for (const [k, v] of shorthandStarts(node)) shorthand.set(k, v);
  const minified = parse(splice(fix.text, 0, fix.text.length, renames, shorthand));

  const edits = [];
  for (const p of plan) {
    const want = unitInfo(minified, p.unit);
    // A name the fix gives a new variable can be one of the minified names: if
    // turning ours back made a reference find another variable, the shapes differ.
    if (want.shape !== p.oursShape)
      throw new FixError(`${p.unit}: a name in the fix is one of the build's minified names; rename it`);
    p.wantShape = want.shape;
    const orig = significant(tokenList(parsed, p.info.node.start, p.info.node.end));
    const next = significant(tokenList(minified, want.node.start, want.node.end));
    for (const h of tokenHunks(orig, next)) {
      const from = h.a0 < h.a1 ? orig[h.a0].s : orig[h.a0 - 1].e;
      const to = h.a0 < h.a1 ? orig[h.a1 - 1].e : from;
      let after = next.slice(h.b0, h.b1).reduce((s, t) => s + glue(s, t.v) + t.v, "");
      if (after) after = glue(parsed.text.slice(from - 1, from), after) + after + glue(after, parsed.text[to]);
      edits.push({ unit: p.unit, from, to, before: parsed.text.slice(from, to), after });
    }
  }

  const text = splice(
    parsed.text,
    0,
    parsed.text.length,
    edits.map((e) => [e.from, e.to, e.after]),
  );
  let patched;
  try {
    patched = parse(text);
  } catch (err) {
    throw new FixError(`the patched main.js does not parse: ${err.message}`);
  }
  for (const p of plan) {
    const got = unitInfo(patched, p.unit);
    if (got?.shape !== p.wantShape)
      throw new FixError(`${p.unit}: the patched unit is not the fix (shape ${got?.shape}, the fix's ${p.wantShape})`);
  }
  return { text, edits, skipped };
}

// ---- the fix shape ----

/** A unified diff of two texts' lines, `context` lines around each change; "" when they are equal. */
export function lineDiff(a, b, { context = 3 } = {}) {
  const x = a.replace(/\n$/, "").split("\n");
  const y = b.replace(/\n$/, "").split("\n");
  const toks = (lines) => lines.map((v) => ({ cmp: v }));
  const hunks = tokenHunks(toks(x), toks(y)).map((h) => ({ ...h }));
  if (!hunks.length) return "";
  // Hunks whose context would touch are printed as one.
  const groups = [];
  for (const h of hunks) {
    const g = groups.at(-1);
    if (g && h.a0 - g.at(-1).a1 <= 2 * context) g.push(h);
    else groups.push([h]);
  }
  const out = [];
  for (const g of groups) {
    const a0 = Math.max(0, g[0].a0 - context);
    const b0 = Math.max(0, g[0].b0 - context);
    const a1 = Math.min(x.length, g.at(-1).a1 + context);
    const b1 = Math.min(y.length, g.at(-1).b1 + context);
    out.push(`@@ -${a0 + 1},${a1 - a0} +${b0 + 1},${b1 - b0} @@`);
    let i = a0;
    for (const h of g) {
      for (; i < h.a0; i++) out.push(` ${x[i]}`);
      for (let k = h.a0; k < h.a1; k++) out.push(`-${x[k]}`);
      for (let k = h.b0; k < h.b1; k++) out.push(`+${y[k]}`);
      i = h.a1;
    }
    for (; i < a1; i++) out.push(` ${x[i]}`);
  }
  return `${out.join("\n")}\n`;
}

/**
 * The fix shape of each unit of a fix: the unit as the build has it and as
 * the fix has it, both in our names and printed alike, and the diff between.
 * Returns [{ unit, ours: [[minified, ours]], before, after, diff }].
 */
export async function fixShapes(parsed, fix, map) {
  const out = [];
  for (const [unit, node] of namedUnits(fix.ast)) {
    const { names, info } = applicableNames(parsed, unit, map.units[unit]);
    if (!info) throw new FixError(`the build has no unit named ${unit}`);
    const before = await pretty(standalone(unit, renamedUnitText(parsed, info, names)));
    const after = await pretty(standalone(unit, fix.text.slice(node.start, node.end)));
    const ours = Object.entries(names).map(([key, name]) => [info.bindings.find((x) => x.key === key).name, name]);
    out.push({ unit, ours, before, after, diff: lineDiff(before, after) });
  }
  return out;
}
