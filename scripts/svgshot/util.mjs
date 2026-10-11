// Small helpers the converter's modules share.

/** A number as short SVG text: three decimals at most, no negative zero. */
export function num(v) {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? "0" : String(r);
}

export function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Split a computed value on the commas that are not inside parentheses. */
export function splitTop(s, sep = ",") {
  const out = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === sep && depth === 0) {
      out.push(s.slice(from, i).trim());
      from = i + 1;
    }
  }
  out.push(s.slice(from).trim());
  return out.filter((x) => x !== "");
}

export const px = (v) => Number.parseFloat(v) || 0;

/** The channels of a computed rgb()/rgba() colour, or null. */
export function rgba(c) {
  const m = /^rgba?\(([^)]*)\)$/.exec(c ?? "");
  if (!m) return null;
  const [r, g, b, a = 1] = m[1].split(",").map(Number);
  return { r, g, b, a };
}
