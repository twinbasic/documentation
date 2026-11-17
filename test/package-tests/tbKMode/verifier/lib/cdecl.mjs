// Reading the WDK's headers after the preprocessor (cl /EP /d1PP): which structures, enumerations,
// typedefs, functions and macros they declare, and each structure's members by name and nesting.
// Only names come from here. What each one is (offsets, sizes, values, prototypes) is asked of
// the compiler by the program wdkdb.mjs writes, and a name read wrongly here is one the compiler
// refuses there; so this reader may guess, and does where C's declarators are ambiguous without a
// symbol table.

const TOKEN =
  /\s+|(L?"(?:\\.|[^"\\\n])*")|(L?'(?:\\.|[^'\\\n])*')|(\.?\d(?:[eEpP][+-]|[\w.])*)|([A-Za-z_$][\w$]*)|(::|->|\.\.\.|<<=|>>=|<<|>>|[<>=!+\-*/%&|^]=|&&|\|\||\+\+|--|##|[^\s])/gy;

/** The tokens of preprocessed C, each a string; lines that start with #, and their continuations, are left out. */
export function tokenize(text) {
  const kept = [];
  let directive = false;
  for (const l of text.split(/\r?\n/)) {
    if (directive || /^\s*#/.test(l)) directive = l.endsWith("\\");
    else kept.push(l);
  }
  const code = kept.join("\n");
  const out = [];
  TOKEN.lastIndex = 0;
  for (let m = TOKEN.exec(code); m; m = TOKEN.exec(code)) {
    if (m.index === code.length) break;
    const t = m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5];
    if (t) out.push(t);
    if (TOKEN.lastIndex >= code.length) break;
  }
  return out;
}

/**
 * The macros of C text: `{objects: Map<name, body>, functions: Set<name>}`, each name with its
 * last definition, and a #undef forgets one. With `union`, for the text of several headers whose
 * branches are not known to be taken, every definition counts and none is forgotten: an object
 * macro keeps its first body.
 */
export function readMacros(text, { union = false } = {}) {
  const objects = new Map();
  const functions = new Set();
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    while (line.endsWith("\\") && i + 1 < lines.length) line = `${line.slice(0, -1)} ${lines[++i]}`;
    const u = /^\s*#\s*undef\s+(\w+)/.exec(line);
    if (u) {
      if (!union) {
        objects.delete(u[1]);
        functions.delete(u[1]);
      }
      continue;
    }
    const m = /^\s*#\s*define\s+([A-Za-z_]\w*)(\()?(.*)$/.exec(line);
    if (!m) continue;
    if (m[2]) {
      functions.add(m[1]);
      if (!union) objects.delete(m[1]);
    } else {
      if (!union || !objects.has(m[1])) objects.set(m[1], withoutComments(m[3]).trim());
      if (!union) functions.delete(m[1]);
    }
  }
  return { objects, functions };
}

/** A macro's body without its comments, which /d1PP keeps: `0x2 // Reset ... for` is `0x2`. */
function withoutComments(s) {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < s.length && s[j] !== c) j += s[j] === "\\" ? 2 : 1;
      out += s.slice(i, j + 1);
      i = j;
    } else if (c === "/" && s[i + 1] === "/") break;
    else if (c === "/" && s[i + 1] === "*") {
      const end = s.indexOf("*/", i + 2);
      if (end < 0) break;
      out += " ";
      i = end + 1;
    } else out += c;
  }
  return out;
}

const ident = (t) => /^[A-Za-z_$][\w$]*$/.test(t);
const OPEN = { "(": ")", "[": "]", "{": "}" };

/** The index of the token that closes the group opened at `i`. */
function closeOf(toks, i) {
  const open = toks[i];
  const close = OPEN[open];
  for (let d = 0, j = i; j < toks.length; j++) {
    if (toks[j] === open) d++;
    else if (toks[j] === close && --d === 0) return j;
  }
  return toks.length - 1;
}

/** Splits tokens at a separator that is outside every (), [] and {}. */
function splitTop(toks, sep) {
  const parts = [[]];
  let d = 0;
  for (const t of toks) {
    if (t in OPEN) d++;
    else if (t === ")" || t === "]" || t === "}") d--;
    if (t === sep && d === 0) parts.push([]);
    else parts.at(-1).push(t);
  }
  return parts;
}

/** Tokens with each `__declspec(...)`, `__pragma(...)`, `_Pragma(...)` and `alignas(...)` taken out. */
function stripGroups(toks) {
  const out = [];
  for (let i = 0; i < toks.length; i++) {
    if (
      ["__declspec", "_declspec", "__pragma", "_Pragma", "alignas", "__alignas"].includes(toks[i]) &&
      toks[i + 1] === "("
    ) {
      i = closeOf(toks, i + 1);
      continue;
    }
    out.push(toks[i]);
  }
  return out;
}

const NOT_A_NAME = new Set([
  "const",
  "volatile",
  "__ptr64",
  "__ptr32",
  "__unaligned",
  "__restrict",
  "restrict",
  "__stdcall",
  "__cdecl",
  "_cdecl",
  "__fastcall",
  "__thiscall",
  "__vectorcall",
  "__clrcall",
  "__sptr",
  "__uptr",
  "struct",
  "union",
  "enum",
  "class",
  "unsigned",
  "signed",
  "int",
  "long",
  "short",
  "char",
  "void",
  "float",
  "double",
  "__int8",
  "__int16",
  "__int32",
  "__int64",
  "bool",
  "wchar_t",
  "inline",
  "__inline",
  "__forceinline",
  "static",
  "extern",
  "typedef",
]);

/**
 * What one declarator declares: `{name, fn, pointer, array, bits}`, or null. `fn` is a function
 * (not a pointer to one); `pointer` a pointer (to a function too); `bits` a bitfield.
 */
export function declarator(toksIn) {
  let toks = stripGroups(toksIn);
  const at = (t) => {
    let d = 0;
    for (let i = 0; i < toks.length; i++) {
      if (toks[i] in OPEN) d++;
      else if (toks[i] === ")" || toks[i] === "]" || toks[i] === "}") d--;
      else if (d === 0 && toks[i] === t) return i;
    }
    return -1;
  };
  const eq = at("=");
  if (eq >= 0) toks = toks.slice(0, eq);
  const colon = at(":");
  const bits = colon >= 0;
  if (bits) toks = toks.slice(0, colon);
  // An array's bound may hold parentheses, VolumeLabel[(32 * sizeof(WCHAR)) / sizeof(WCHAR)]: its
  // [...] groups go before the declarator is read.
  const array = toks.includes("[");
  {
    const kept = [];
    let d = 0;
    for (const t of toks) {
      if (t === "[") d++;
      else if (t === "]") d--;
      else if (d === 0) kept.push(t);
    }
    toks = kept;
  }
  const paren = toks.indexOf("(");
  if (paren >= 0) {
    const close = closeOf(toks, paren);
    const inner = toks.slice(paren + 1, close);
    // (*name)(...) and (__stdcall *name)(...) are pointers to functions; name(...) is a function.
    const lead = inner.find((t) => !NOT_A_NAME.has(t));
    const before = toks[paren - 1];
    if ((!before || !ident(before) || NOT_A_NAME.has(before)) && (lead === "*" || lead === "&" || lead === "^")) {
      const name = inner.filter((t) => ident(t) && !NOT_A_NAME.has(t)).at(-1);
      return name ? { name, fn: false, pointer: true, array, bits } : null;
    }
    const name = toks
      .slice(0, paren)
      .filter((t) => ident(t) && !NOT_A_NAME.has(t))
      .at(-1);
    // A function's name is the token just before its parameters.
    if (!name || toks[paren - 1] !== name) return null;
    return { name, fn: true, pointer: false, array: false, bits };
  }
  const names = toks.filter((t) => ident(t) && !NOT_A_NAME.has(t));
  if (!names.length) return null;
  const name = names.at(-1);
  return { name, fn: false, pointer: toks.includes("*"), array, bits };
}

/** The first `struct|union|class|enum [tag] {` of a declaration: `{kind, tag, open}`, or null. */
function bodyOf(toks) {
  for (let i = 0; i < toks.length; i++) {
    if (toks[i] === "(" || toks[i] === "[") i = closeOf(toks, i);
    if (!["struct", "union", "class", "enum"].includes(toks[i])) continue;
    let j = i + 1;
    if (toks[i] === "enum" && (toks[j] === "class" || toks[j] === "struct")) j++;
    while (["__declspec", "_declspec", "alignas"].includes(toks[j]) && toks[j + 1] === "(")
      j = closeOf(toks, j + 1) + 1;
    let tag = null;
    if (ident(toks[j]) && !NOT_A_NAME.has(toks[j])) tag = toks[j++];
    if (toks[j] === ":") while (j < toks.length && toks[j] !== "{" && toks[j] !== ";") j++;
    if (toks[j] === "{") return { kind: toks[i], tag, open: j, start: i };
    return null;
  }
  return null;
}

/**
 * The members of a structure's body: `[{name, children?, array, bits}]`, where an anonymous
 * member is `{name: null, children}`.
 */
export function members(body) {
  const out = [];
  for (const decl of splitTop(body, ";")) {
    const toks = stripGroups(decl);
    if (!toks.length || toks[0] === "static_assert" || toks[0] === "typedef" || toks[0] === "template") continue;
    if (toks.length === 2 && toks[1] === ":") continue;
    const b = bodyOf(toks);
    if (b && b.kind !== "enum") {
      const close = closeOf(toks, b.open);
      const children = members(toks.slice(b.open + 1, close));
      const rest = toks.slice(close + 1);
      if (!rest.length) out.push({ name: null, children });
      else
        for (const part of splitTop(rest, ",")) {
          const d = declarator(part);
          if (d && !d.fn)
            out.push({ name: d.name, children: d.pointer ? undefined : children, array: d.array, bits: d.bits });
        }
      continue;
    }
    if (b) {
      // An enum declared inside: its declarators follow its body.
      const close = closeOf(toks, b.open);
      for (const part of splitTop(toks.slice(close + 1), ",")) {
        const d = declarator(part);
        if (d && !d.fn) out.push({ name: d.name, array: d.array, bits: d.bits });
      }
      continue;
    }
    const parts = splitTop(toks, ",");
    for (let k = 0; k < parts.length; k++) {
      // Later declarators share the first one's type: give each its own name only.
      const d = declarator(parts[k]);
      if (d && !d.fn) out.push({ name: d.name, array: d.array, bits: d.bits });
    }
  }
  return out;
}

/** The end of a top-level declaration that starts at `i`: the index after its `;` or function body. */
function declEnd(toks, i) {
  let prev = null;
  for (let j = i; j < toks.length; j++) {
    const t = toks[j];
    if (t === ";") return j + 1;
    if (t === "(" || t === "[") {
      j = closeOf(toks, j);
      prev = ")";
      continue;
    }
    if (t === "{") {
      const close = closeOf(toks, j);
      if (prev === ")" || prev === "const" || prev === "noexcept" || prev === "throw") {
        return toks[close + 1] === ";" ? close + 2 : close + 1;
      }
      j = close;
      prev = "}";
      continue;
    }
    prev = t;
  }
  return toks.length;
}

/**
 * The declarations of preprocessed headers:
 * - `structs`: `[{kind, tag, name, members}]`, each structure or union defined at file scope,
 *   named by its tag or, with none, by its first typedef name;
 * - `enums`: `[{tag, names}]`, every enumeration defined anywhere, its members' names;
 * - `aliases`: `Map<typedef name, tag>` where a typedef names a structure, union or enumeration by
 *   its tag (a pointer typedef is not one);
 * - `typedefs`: every other plain typedef name, for the compiler to say what it is;
 * - `functions`: `Map<name, {import, inline}>`.
 */
export function readDeclarations(toks) {
  const structs = [];
  const aliases = new Map();
  const typedefs = new Set();
  const functions = new Map();
  for (let i = 0; i < toks.length; ) {
    const t = toks[i];
    if (t === "extern" && /^"/.test(toks[i + 1] ?? "") && toks[i + 2] === "{") {
      i += 3;
      continue;
    }
    if (t === "namespace" && toks[i + 2] === "{") {
      i += 3;
      continue;
    }
    if (t === "}" || t === ";") {
      i++;
      continue;
    }
    const end = declEnd(toks, i);
    const decl = toks.slice(i, end);
    i = end;
    if (decl[0] === "template" || decl[0] === "static_assert" || decl[0] === "using") continue;
    const isTypedef = stripGroups(decl)[0] === "typedef";
    const b = bodyOf(decl);
    let rest = decl;
    let tagged = null;
    if (b) {
      const close = closeOf(decl, b.open);
      rest = decl.slice(close + 1);
      tagged = { kind: b.kind, tag: b.tag };
      if (b.kind !== "enum") {
        const names = isTypedef
          ? splitTop(
              rest.filter((x) => x !== ";"),
              ",",
            ).map(declarator)
          : [];
        const plain = names.find((d) => d && !d.pointer && !d.array && !d.fn);
        const name = b.tag ?? plain?.name;
        if (name) structs.push({ kind: b.kind, tag: b.tag, name, members: members(decl.slice(b.open + 1, close)) });
        if (!b.tag) tagged.tag = name;
      }
    } else if (isTypedef) {
      // typedef struct _X X: the tag without a body.
      const s = stripGroups(decl);
      const k = s.findIndex((x) => ["struct", "union", "class", "enum"].includes(x));
      if (k >= 0 && ident(s[k + 1] ?? "")) {
        tagged = { kind: s[k], tag: s[k + 1] };
        rest = s.slice(k + 2);
      }
    }
    if (isTypedef) {
      const parts = splitTop(
        (b || tagged ? rest : decl.slice(1)).filter((x) => x !== ";"),
        ",",
      );
      for (const part of parts) {
        const d = declarator(part);
        if (!d || d.pointer || d.array || d.fn) continue;
        if (tagged?.tag) {
          if (d.name !== tagged.tag) aliases.set(d.name, tagged.tag);
        } else typedefs.add(d.name);
      }
      continue;
    }
    if (b) continue;
    const parts = splitTop(
      decl.filter((x, k) => !(x === ";" && k === decl.length - 1)),
      ",",
    );
    const d = declarator(parts[0]);
    if (d?.fn) {
      const flat = decl.join(" ");
      functions.set(d.name, {
        import: /__declspec \( dllimport \)/.test(flat),
        inline: /\b(?:__forceinline|__inline|inline)\b/.test(flat) || decl.at(-1) === "}",
      });
    }
  }
  return { structs, enums: readEnums(toks), aliases, typedefs, functions };
}

/** Every enumeration in the tokens, wherever it is defined: `[{tag, names}]`. */
export function readEnums(toks) {
  const out = [];
  for (let i = 0; i < toks.length; i++) {
    if (toks[i] !== "enum") continue;
    const b = bodyOf(toks.slice(i, i + 40));
    if (!b || b.kind !== "enum" || b.start !== 0) continue;
    const open = i + b.open;
    const close = closeOf(toks, open);
    const names = splitTop(toks.slice(open + 1, close), ",")
      .map((p) => stripGroups(p)[0])
      .filter((n) => n && ident(n));
    out.push({ tag: b.tag, names });
    i = close;
  }
  return out;
}

/**
 * A structure's members as paths, each `{path, cpath, bits, array}`: an anonymous member's
 * members are reached by name, a named one's as `name.member`. `cpath` is the C++ expression,
 * which reaches into the first element of an array.
 */
export function memberPaths(list, prefix = "", cprefix = "") {
  const out = [];
  for (const m of list) {
    if (m.name === null) {
      out.push(...memberPaths(m.children ?? [], prefix, cprefix));
      continue;
    }
    const path = `${prefix}${m.name}`;
    const cpath = `${cprefix}${m.name}`;
    out.push({ path, cpath, bits: Boolean(m.bits), array: Boolean(m.array) });
    if (m.children) out.push(...memberPaths(m.children, `${path}.`, `${cpath}${m.array ? "[0]" : ""}.`));
  }
  return out;
}
