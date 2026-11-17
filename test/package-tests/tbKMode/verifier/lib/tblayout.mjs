// twinBASIC's layout of a package's Types, for x86 or x64, worked out from their declarations: each
// field at a multiple of its alignment (a [PackingAlignment(n)] Type caps it at n), the Type's size
// a multiple of its largest alignment. The package's own compiler is the authority: the layout test
// modules `check --write-tests` writes assert the database's offsets in a build, and so catch where
// this model and twinBASIC disagree.
import { constantsFor, evaluate } from "./conditions.mjs";

// The intrinsic types: [size, alignment] on x86 and on x64, and the kind a C field of the same
// meaning has (i: integer, f: floating point, p: pointer, v: a Variant or Decimal).
const INTRINSIC = {
  byte: { x86: [1, 1], x64: [1, 1], kind: "i" },
  boolean: { x86: [2, 2], x64: [2, 2], kind: "i" },
  integer: { x86: [2, 2], x64: [2, 2], kind: "i" },
  long: { x86: [4, 4], x64: [4, 4], kind: "i" },
  longlong: { x86: [8, 8], x64: [8, 8], kind: "i" },
  longptr: { x86: [4, 4], x64: [8, 8], kind: "ip" },
  single: { x86: [4, 4], x64: [4, 4], kind: "f" },
  double: { x86: [8, 8], x64: [8, 8], kind: "f" },
  currency: { x86: [8, 8], x64: [8, 8], kind: "i" },
  date: { x86: [8, 8], x64: [8, 8], kind: "f" },
  string: { x86: [4, 4], x64: [8, 8], kind: "p" },
  object: { x86: [4, 4], x64: [8, 8], kind: "p" },
  any: { x86: [4, 4], x64: [8, 8], kind: "p" },
  variant: { x86: [16, 8], x64: [24, 8], kind: "v" },
  decimal: { x86: [16, 8], x64: [16, 8], kind: "v" },
};

const lc = (s) => String(s).toLowerCase();

/** A Type's fields, an Enum's members: the scanner's members of that kind. */
export const fieldsOf = (t) => (t.members ?? []).filter((m) => m.kind === "field");
export const enumValuesOf = (t) => (t.members ?? []).filter((m) => m.kind === "enumvalue");

/**
 * What a parsed package (readPackage's) declares, for laying out and evaluating: its Types, Enums,
 * aliases, delegates, interfaces and classes, constants and enumeration members, by lower-case
 * name. A constant declared under #If is one entry for each branch, each with its `cond`.
 */
export function packageModel(parsed) {
  const types = new Map();
  const enums = new Map();
  const pointers = new Set();
  const consts = new Map();
  const aliases = new Map(parsed.aliases.map((a) => [lc(a.name), lc(a.target)]));
  for (const t of parsed.types) {
    const n = lc(t.name);
    if (t.kind === "type") {
      if (!types.has(n)) types.set(n, []);
      types.get(n).push(t);
    } else if (t.kind === "enum") {
      enums.set(n, t);
      for (const v of enumValuesOf(t)) consts.set(lc(v.name), { enumOf: t, value: v });
    } else if (["interface", "class", "coclass"].includes(t.kind)) pointers.add(n);
    for (const m of t.members ?? []) {
      if (m.kind === "delegate") pointers.add(lc(m.name));
      if (m.kind === "const") {
        const b = { ...m, file: t.file };
        const c = consts.get(lc(m.name));
        if (c?.branches) c.branches.push(b);
        else consts.set(lc(m.name), { branches: [b] });
      }
    }
  }
  return { types, enums, pointers, consts, aliases, defines: parsed.defines ?? {}, envs: new Map(), cache: new Map() };
}

/**
 * The Type of a name that an arch compiles: of the definitions of that name, the one whose #If
 * holds (a Type defined once for Win64 and once for the rest), or null.
 */
export function typeFor(name, arch, model) {
  const defs = model.types.get(lc(name.replace(/^.*\./, ""))) ?? [];
  return defs.find((t) => evaluate(t.cond, envOf(model, arch, t.file)) === true) ?? null;
}

/** The #If constants of one file for an arch: the compiler's and the file's #Const lines. */
export function envOf(model, arch, file) {
  const key = `${arch}\0${file}`;
  if (!model.envs.has(key)) model.envs.set(key, constantsFor(arch, model.defines[file] ?? []));
  return model.envs.get(key);
}

/** A constant's or enumeration member's value for an arch, as a BigInt or a string; null when unknown. */
export function packageValue(name, arch, model) {
  const c = model.consts.get(lc(name));
  if (!c) return null;
  if (c.value) return evalExpr(name, arch, model);
  for (const b of c.branches) {
    if (evaluate(b.cond, envOf(model, arch, b.file)) !== true) continue;
    const m = /=\s*(.+)$/.exec(b.signature ?? "");
    if (!m) return null;
    const s = /^\s*"((?:[^"]|"")*)"\s*$/.exec(m[1]);
    return s ? s[1].replaceAll('""', '"') : evalExpr(m[1], arch, model);
  }
  return null;
}

// The bits of an integer type, for a constant's width.
const WIDTH = { byte: 16, integer: 16, long: 32, longlong: 64, longptr: 64 };

/**
 * A twinBASIC number literal: `{v, w}`, its value and its type's width in bits, or null: 10, &H1F,
 * &O17, with a type character or not.
 */
function literal(t) {
  const suffix = (c) => (c === "%" ? 16 : c === "&" ? 32 : c === "^" ? 64 : 0);
  const m = /^&H([0-9A-F]+)([%&^]?)$/i.exec(t);
  if (m) {
    // A hex literal is as wide as its type, two's complement: &HFFFF is Integer -1, &HFFFF& Long
    // 65535; with no type character, up to 4 digits is an Integer, up to 8 a Long.
    const digits = m[1].replace(/^0+(?=.)/, "").length;
    const w = suffix(m[2]) || (digits <= 4 ? 16 : digits <= 8 ? 32 : 64);
    return { v: BigInt.asIntN(w, BigInt(`0x${m[1]}`)), w };
  }
  const o = /^&O([0-7]+)([%&^]?)$/i.exec(t);
  if (o) return { v: BigInt(`0o${o[1]}`), w: suffix(o[2]) || 32 };
  const d = /^(\d+)([%&^]?)$/.exec(t);
  if (!d) return null;
  const v = BigInt(d[1]);
  return { v, w: suffix(d[2]) || (v <= 32767n ? 16 : v <= 2147483647n ? 32 : 64) };
}

/**
 * The value of a constant expression for an arch, as a BigInt, or null: numbers, the package's
 * constants and enumeration members, + - * \ Mod And Or Xor Not << >>, parentheses. A constant
 * declared under #If takes the branch for the arch.
 */
export function evalExpr(text, arch, model, depth = 0) {
  return evalTyped(text, arch, model, depth)?.v ?? null;
}

/**
 * evalExpr's value with the width of its type, `{v, w}`: an operation is as wide as its wider
 * operand, as twinBASIC types it, and a shift keeps its left operand's width, so `&Hff << 24` is an
 * Integer shifted out to 0.
 */
function evalTyped(text, arch, model, depth = 0) {
  if (depth > 40) return null;
  const toks = String(text).match(/&[HO][0-9A-F]+[%&^]?|\d+[%&^]?|[A-Za-z_][\w.]*|<<|>>|<>|<=|>=|[-+*\\/()=<>]/gi);
  if (!toks) return null;
  let i = 0;
  const name = (n) => {
    const c = model.consts.get(lc(n.replace(/^.*\./, "")));
    if (!c) return null;
    if (c.value) {
      // An enumeration member, a Long: its own value, or the one before it plus one.
      let v = -1n;
      for (const x of enumValuesOf(c.enumOf)) {
        if (evaluate(x.cond, envOf(model, arch, c.enumOf.file)) === false) continue;
        const m = /=\s*(.+)$/.exec(x.signature ?? "");
        v = m ? evalExpr(m[1], arch, model, depth + 1) : v === null ? null : v + 1n;
        if (x === c.value) return v === null ? null : { v, w: 32 };
      }
      return null;
    }
    for (const b of c.branches) {
      if (evaluate(b.cond, envOf(model, arch, b.file)) !== true) continue;
      const m = /(?:\bAs\s+(\w+)\s*)?=\s*(.+)$/i.exec(b.signature ?? "");
      if (!m) return null;
      const r = evalTyped(m[2], arch, model, depth + 1);
      const w = WIDTH[lc(m[1] ?? "")];
      return r && w ? { v: r.v, w } : r;
    }
    return null;
  };
  const primary = () => {
    const t = toks[i++];
    if (t === undefined) return null;
    if (t === "(") {
      const r = expr();
      i++;
      return r;
    }
    if (t === "-") {
      const r = primary();
      return r && { v: -r.v, w: r.w };
    }
    if (lc(t) === "not") {
      const r = primary();
      return r && { v: ~r.v, w: r.w };
    }
    // LenB(Of T) and Len(Of T): the size of a type.
    if ((lc(t) === "lenb" || lc(t) === "len") && toks[i] === "(" && lc(toks[i + 1] ?? "") === "of") {
      const info = typeInfo(toks[i + 2] ?? "", arch, model);
      i += 4;
      return info.error ? null : { v: BigInt(info.size), w: 32 };
    }
    return literal(t) ?? name(t);
  };
  const binary = (next, ops, apply) => () => {
    let r = next();
    while (i < toks.length && ops.includes(lc(toks[i]))) {
      const op = lc(toks[i++]);
      const s = next();
      const v = r === null || s === null ? null : apply(op, r.v, s.v, r.w);
      r = v === null ? null : { v, w: op === "<<" || op === ">>" ? r.w : Math.max(r.w, s.w) };
    }
    return r;
  };
  const mul = binary(primary, ["*", "\\", "/", "mod"], (op, a, b) =>
    op === "*" ? a * b : b === 0n ? null : op === "mod" ? a % b : a / b,
  );
  const add = binary(mul, ["+", "-"], (op, a, b) => (op === "+" ? a + b : a - b));
  const shift = binary(add, ["<<", ">>"], (op, a, b, w) => BigInt.asIntN(w, op === "<<" ? a << b : a >> b));
  const and = binary(shift, ["and"], (_, a, b) => a & b);
  const expr = binary(and, ["or", "xor"], (op, a, b) => (op === "or" ? a | b : a ^ b));
  const r = expr();
  return i === toks.length ? r : null;
}

/**
 * A field's declaration, `Name[(bounds)] As Type [* n]`: `{name, dims, type, fixedString}`, dims
 * the bounds' text of each dimension, or null when it cannot be read.
 */
export function parseField(signature) {
  const m = /^\s*\[?([A-Za-z_]\w*)\]?\s*(\((.*)\))?\s+As\s+([A-Za-z_][\w.]*)\s*(?:\*\s*(.+))?$/i.exec(signature);
  if (!m) return null;
  const dims = [];
  if (m[3] !== undefined) {
    let d = 0;
    let cur = "";
    for (const c of m[3]) {
      if (c === "(") d++;
      if (c === ")") d--;
      if (c === "," && d === 0) {
        dims.push(cur.trim());
        cur = "";
      } else cur += c;
    }
    dims.push(cur.trim());
  }
  return { name: m[1], dims, type: m[4].replace(/^.*\./, ""), fixedString: m[5] ?? null };
}

/** The element count of a dimension's bounds (`n`, `a To b`), or null. */
function dimCount(text, arch, model) {
  const parts = text.split(/\s+To\s+/i);
  const lo = parts.length > 1 ? evalExpr(parts[0], arch, model) : 0n;
  const hi = evalExpr(parts.at(-1), arch, model);
  return lo === null || hi === null ? null : Number(hi - lo + 1n);
}

/**
 * What a type name is, for an arch: `{size, align, kind, type?}`, kind as INTRINSIC's, "e" for an
 * Enum, "s" for a Type (`type` its name); or `{error}`.
 */
export function typeInfo(name, arch, model, seen = new Set()) {
  let n = lc(name.replace(/^.*\./, ""));
  for (let k = 0; model.aliases.has(n) && k < 8; k++) n = model.aliases.get(n);
  if (INTRINSIC[n]) {
    const [size, align] = INTRINSIC[n][arch];
    return { size, align, kind: INTRINSIC[n].kind };
  }
  if (model.enums.has(n)) return { size: 4, align: 4, kind: "e" };
  if (model.pointers.has(n)) return { size: arch === "x64" ? 8 : 4, align: arch === "x64" ? 8 : 4, kind: "p" };
  if (model.types.has(n)) {
    const l = layoutOf(n, arch, model, seen);
    if (l.error) return { error: l.error };
    return { size: l.size, align: l.align, kind: "s", type: l.name };
  }
  return { error: `the type ${name} is not declared by the package` };
}

/**
 * A Type's layout for an arch: `{size, align, fields: [{name, offset, size, count, elemSize, kind,
 * type}]}`, or `{error}`. Fields whose #If excludes them on the arch are left out; one whose #If
 * this tool cannot decide makes the layout an error.
 */
export function layoutOf(name, arch, model, seen = new Set()) {
  const key = `${arch}\0${lc(name)}`;
  if (model.cache.has(key)) return model.cache.get(key);
  if (seen.has(lc(name))) return { error: `${name} contains itself` };
  const t = typeFor(name, arch, model);
  if (!t) return { error: `no Type ${name}` };
  const next = new Set(seen).add(lc(name));
  const packAttr = (t.attrs ?? []).find((a) => lc(a.name) === "packingalignment");
  // An attribute under #If applies where its condition holds.
  const packCond = t.attrConds?.packingalignment ?? null;
  const packs = packAttr && evaluate(packCond, envOf(model, arch, t.file)) === true;
  const pack = packs ? Number(evalExpr(packAttr.args, arch, model)) : Infinity;
  let offset = 0;
  let maxAlign = 1;
  const fields = [];
  let result = null;
  for (const f of fieldsOf(t)) {
    const applies = evaluate(f.cond, envOf(model, arch, t.file));
    if (applies === false) continue;
    if (applies === null) {
      result = { error: `the #If of ${f.name}, ${f.cond}, names a constant this tool does not know` };
      break;
    }
    const p = parseField(f.signature ?? "");
    if (!p) {
      result = { error: `the field ${f.signature} could not be read` };
      break;
    }
    let info;
    if (p.fixedString) {
      const len = evalExpr(p.fixedString, arch, model);
      if (len === null) {
        result = { error: `the length of ${p.name}, ${p.fixedString}, could not be evaluated` };
        break;
      }
      info = { size: 2 * Number(len), align: 2, kind: "w" };
    } else info = typeInfo(p.type, arch, model, next);
    if (info.error) {
      result = { error: `${p.name}: ${info.error}` };
      break;
    }
    let count = 1;
    for (const d of p.dims) {
      const c = dimCount(d, arch, model);
      if (c === null) {
        result = { error: `the bounds of ${p.name}, (${p.dims.join(", ")}), could not be evaluated` };
        break;
      }
      count *= c;
    }
    if (result) break;
    const align = Math.min(info.align, pack);
    offset = Math.ceil(offset / align) * align;
    fields.push({
      name: p.name,
      offset,
      size: info.size * count,
      count: p.dims.length ? count : null,
      elemSize: info.size,
      kind: info.kind,
      type: info.type ?? p.type,
    });
    offset += info.size * count;
    maxAlign = Math.max(maxAlign, align);
  }
  result ??= { name: t.name, size: Math.ceil(offset / maxAlign) * maxAlign, align: maxAlign, fields };
  model.cache.set(key, result);
  return result;
}
