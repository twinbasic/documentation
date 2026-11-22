// Evaluating the condition of a `#If` block, as the scanner records it on each declaration
// (`Win64`, `Not (Win64)`, `NTDDI_VERSION >= NTDDI_WIN10_RS1`), for one architecture. The compiler's
// own constants are known, and those a file defines with #Const when they are given; a condition
// that names any other constant gives null, unless the file's constants were given: then, as in
// twinBASIC, a constant nobody defines is Empty, which is 0 and False.

const KNOWN_ALL = Symbol("every constant is known");

/** The #Const lines of a source file, in order: [{name, expr}]. */
export function fileConstants(text) {
  const out = [];
  for (const m of String(text).matchAll(/^[ \t]*#Const[ \t]+([A-Za-z_]\w*)[ \t]*=[ \t]*([^'\r\n]*)/gim))
    out.push({ name: m[1].toUpperCase(), expr: m[2].trim() });
  return out;
}

/**
 * The constants for an architecture, x86 or x64: the compiler's, and with `defined` (a file's #Const
 * lines, fileConstants's) those too, each evaluated in order; then a constant not defined is Empty.
 */
export function constantsFor(arch, defined = null) {
  // The compiler's constants are numbers, 1 or 0, not Booleans: `#If Win64 = 1` holds in a 64-bit
  // build, `#If Win64 = -1` in none, and `(TWINBASIC = 1) Or (Win64 = 1)` in both (BETA 1042).
  const c = { WIN64: arch === "x64" ? 1 : 0, WIN32: 1, VBA7: 1, VBA6: 1, TWINBASIC: 1, MAC: 0 };
  if (defined) {
    Object.defineProperty(c, KNOWN_ALL, { value: true });
    for (const d of defined) {
      const v = conditionValue(d.expr, c);
      if (v !== null) c[d.name] = v;
    }
  }
  return c;
}

/**
 * The value of an expression of the constants (a number or a boolean), or null when it names an
 * unknown constant or is not an expression of Not, And, Or, Xor, comparisons, + -, parentheses,
 * True, False and numbers (decimal or &H).
 */
export function conditionValue(expr, constants) {
  const tokens = String(expr)
    .match(/\s*(\(|\)|<>|<=|>=|<|>|=|\+|-|&H[0-9A-F]+&?|[A-Za-z_][A-Za-z0-9_]*|\d+&?)\s*/gi)
    ?.map((t) => t.trim());
  if (!tokens || tokens.join("").replace(/\s/g, "") !== String(expr).replace(/\s/g, "")) return null;
  let i = 0;
  const peek = () => tokens[i]?.toUpperCase();
  const num = (v) => (typeof v === "boolean" ? (v ? -1 : 0) : v);
  const value = (t) => {
    const u = t.toUpperCase();
    if (u === "TRUE") return true;
    if (u === "FALSE") return false;
    const h = /^&H([0-9A-F]+)(&?)$/i.exec(t);
    if (h) {
      const v = Number.parseInt(h[1], 16);
      // &H8000 is an Integer, &HFFFFFFFF a Long: as wide as its type, two's complement.
      return h[2] || h[1].length > 4 ? v | 0 : v >= 0x8000 ? v - 0x10000 : v;
    }
    if (/^\d+&?$/.test(t)) return Number.parseInt(t, 10);
    if (u in constants) return constants[u];
    if (constants[KNOWN_ALL]) return 0;
    throw new Error("unknown");
  };
  const primary = () => {
    const t = tokens[i++];
    if (t === undefined) throw new Error("end");
    if (t === "(") {
      const v = orExpr();
      if (tokens[i++] !== ")") throw new Error("paren");
      return v;
    }
    if (t === "-") return -num(primary());
    if (t.toUpperCase() === "NOT") {
      // `Not (x)` is how the scanner writes the #Else of `#If x`: the branch that holds when x
      // does not, so it negates x's truth. Any other Not is twinBASIC's, bitwise on a number:
      // `#If Not Win64` holds in a 64-bit build too, since Not 1 is -2. (A source `Not (Win64)`
      // reads as the scanner's; tbKMode writes none.)
      const scanners = tokens[i] === "(";
      const v = compare();
      return typeof v === "boolean" ? !v : scanners ? v === 0 : ~v;
    }
    return value(t);
  };
  const sum = () => {
    let v = primary();
    while (peek() === "+" || peek() === "-") {
      const op = tokens[i++];
      const w = primary();
      v = op === "+" ? num(v) + num(w) : num(v) - num(w);
    }
    return v;
  };
  const compare = () => {
    const a = sum();
    const op = peek();
    if (!["=", "<>", "<", ">", "<=", ">="].includes(op)) return a;
    i++;
    const x = num(a);
    const y = num(sum());
    return { "=": x === y, "<>": x !== y, "<": x < y, ">": x > y, "<=": x <= y, ">=": x >= y }[op];
  };
  const truthy = (v) => (typeof v === "number" ? v !== 0 : Boolean(v));
  const andExpr = () => {
    let v = compare();
    while (peek() === "AND") {
      i++;
      const w = compare();
      v = typeof v === "number" && typeof w === "number" ? v & w : truthy(v) && truthy(w);
    }
    return v;
  };
  const orExpr = () => {
    let v = andExpr();
    while (peek() === "OR" || peek() === "XOR") {
      const op = tokens[i++].toUpperCase();
      const w = andExpr();
      v =
        typeof v === "number" && typeof w === "number"
          ? op === "OR"
            ? v | w
            : v ^ w
          : op === "OR"
            ? truthy(v) || truthy(w)
            : truthy(v) !== truthy(w);
    }
    return v;
  };
  try {
    const v = orExpr();
    return i === tokens.length ? v : null;
  } catch {
    return null;
  }
}

/**
 * Whether a condition holds for the constants, or null when it cannot be decided (see conditionValue).
 *
 * @param {string | null} cond
 * @param {Record<string, boolean | number>} constants
 * @returns {boolean | null}
 */
export function evaluate(cond, constants) {
  if (cond === null || cond === undefined || cond.trim() === "") return true;
  const v = conditionValue(cond, constants);
  if (v === null) return null;
  return typeof v === "number" ? v !== 0 : Boolean(v);
}
