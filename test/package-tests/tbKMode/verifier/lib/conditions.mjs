// Evaluating the condition of a `#If` block, as the scanner records it on each declaration
// (`Win64`, `Not (Win64)`, `Win64 And VBA7`), for one architecture. Only the compiler's own constants
// are known; a condition that names any other gives null: it cannot be decided here.

/** The compiler's constants for an architecture: x86 or x64. */
export function constantsFor(arch) {
  return { WIN64: arch === "x64", WIN32: true, VBA7: true, VBA6: true, TWINBASIC: true, MAC: false };
}

/**
 * The value of a condition for the constants, or null when it names an unknown constant or is not
 * an expression of Not, And, Or, Xor, =, <>, parentheses, True, False and numbers.
 *
 * @param {string | null} cond
 * @param {Record<string, boolean>} constants
 * @returns {boolean | null}
 */
export function evaluate(cond, constants) {
  if (cond === null || cond === undefined || cond.trim() === "") return true;
  const tokens = cond.match(/\s*(\(|\)|<>|=|[A-Za-z_][A-Za-z0-9_]*|-?\d+)\s*/g)?.map((t) => t.trim());
  if (!tokens || tokens.join("").replace(/\s/g, "") !== cond.replace(/\s/g, "")) return null;
  let i = 0;
  const peek = () => tokens[i]?.toUpperCase();
  const value = (t) => {
    const u = t.toUpperCase();
    if (u === "TRUE") return true;
    if (u === "FALSE") return false;
    if (/^-?\d+$/.test(t)) return Number(t);
    if (u in constants) return constants[u];
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
    if (t.toUpperCase() === "NOT") return !truthy(primaryOrCompare());
    return value(t);
  };
  const truthy = (v) => (typeof v === "number" ? v !== 0 : Boolean(v));
  const primaryOrCompare = () => {
    const a = primary();
    if (peek() === "=" || peek() === "<>") {
      const op = tokens[i++];
      const b = primary();
      const eq = (typeof a === "boolean" ? (a ? -1 : 0) : a) === (typeof b === "boolean" ? (b ? -1 : 0) : b);
      return op === "=" ? eq : !eq;
    }
    return a;
  };
  const andExpr = () => {
    let v = primaryOrCompare();
    while (peek() === "AND") {
      i++;
      const w = primaryOrCompare();
      v = truthy(v) && truthy(w);
    }
    return v;
  };
  const orExpr = () => {
    let v = andExpr();
    while (peek() === "OR" || peek() === "XOR") {
      const op = tokens[i++].toUpperCase();
      const w = andExpr();
      v = op === "OR" ? truthy(v) || truthy(w) : truthy(v) !== truthy(w);
    }
    return v;
  };
  try {
    const v = orExpr();
    if (i !== tokens.length) return null;
    return truthy(v);
  } catch {
    return null;
  }
}
