// twinBASIC syntax-highlight theme loader. Reads the vendored IDE
// theme files under builder/themes/, derives a Symbol-keyed palette,
// and emits both the renderer's scope -> class lookup and the matching
// CSS stylesheet. Phase 3's highlight.mjs consumes classForScope to
// translate Shiki's per-token scope chains to palette class names;
// the same palette drives the build-time-generated tb-highlight.css
// that styles those classes in light and dark mode.
//
// Replaces the legacy two-step indirection (`scripts/extract_theme_colors.py`
// emitting SCSS partials under docs/_sass/custom/, consumed by Jekyll's
// Sass pipeline). Under Phase 11 the .theme source feeds the renderer
// directly; there is no Rouge-class intermediate naming step.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_THEMES_DIR = path.join(__dirname, "themes");

const PROPERTY_LINE = /^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.+?)\s*;?\s*$/;
const SYMBOL_PROP =
  /^Symbol([A-Za-z]+?)(Color|FontStyle|FontWeight|TextDecoration)$/;
const COMMENT_RE = /\/\*[\s\S]*?\*\//g;

const PROP_ORDER = ["Color", "FontStyle", "FontWeight", "TextDecoration"];
const CSS_PROP = {
  Color: "color",
  FontStyle: "font-style",
  FontWeight: "font-weight",
  TextDecoration: "text-decoration",
};

// TextMate scope prefix -> twinBASIC theme Symbol. Same precedence as
// the historic SCOPE_TO_ROUGE_CLASS table that lived in highlight.mjs:
// more-specific scopes precede their parents. The renderer walks the
// per-token scope chain inner-out and stops at the first prefix match.
//
// Scopes the IDE theme does not name (plain punctuation, generic
// identifiers, illegal tokens, HTML tag names) are absent here; tokens
// matching only those emit no <span> wrap and inherit the default text
// colour from the surrounding .highlight rule.
const SCOPE_TO_SYMBOL = [
  ["punctuation.line-continuation",  "ContinuationCharacter"],
  ["constant.language.boolean",      "LiteralBoolean"],
  ["constant.language.empty",        "LiteralEmpty"],
  ["constant.language.nothing",      "LiteralNothing"],
  ["constant.language.null",         "LiteralNull"],
  ["constant.numeric",               "LiteralNumeric"],
  ["constant.other.date",            "LiteralDate"],
  ["comment.block.preprocessor",     "ConditionalCompilationDirective"],
  ["comment.line",                   "Comment"],
  ["comment.block",                  "Comment"],
  ["meta.preprocessor",              "ConditionalCompilationDirective"],
  ["keyword.declaration",            "Keyword"],
  ["keyword.operator.word",          "NamedOperator"],
  ["keyword.operator",               "Operator"],
  ["keyword.control",                "Keyword"],
  ["keyword",                        "Keyword"],
  ["storage.type.function.arrow",    "Operator"],
  ["storage.type.function",          "Keyword"],
  ["storage.modifier",               "Keyword"],
  ["storage.type",                   "BuiltInDataType"],
  ["entity.name.function",           "Function"],
  ["entity.name.type",               "Class"],
  ["entity.name.namespace",          "Module"],
  ["entity.other.attribute-name",    "Attribute"],
  ["variable",                       "Variable"],
  ["support.function",               "Class"],
  ["string.escape",                  "LiteralString"],
  ["string.quoted.double",           "LiteralString"],
];

// WCAG 1.4.3 contrast clamp.
//
// The vendored .theme files mirror the twinBASIC IDE's own palettes, where
// several token colours fall below the 4.5:1 body-text threshold against the
// code-block background. Rather than edit the vendored themes -- they should
// keep matching the IDE -- the emit step nudges only the failing colours,
// moving lightness away from the background until the ratio is met. Hue and
// saturation are preserved, so a clamped token still reads as the same colour.
const MIN_CONTRAST = 4.5;

// Code-block backgrounds the emitted rules sit on. Light is
// $code-background-color ($grey-lt-000); dark is the `.language-tb` override
// in docs/_sass/custom/custom.scss.
const CODE_BG = { light: "#f5f6fa", dark: "#212121" };

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function parseHex(value) {
  const m = HEX_RE.exec(value.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function toHex(rgb) {
  const c = (n) =>
    Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0");
  return "#" + c(rgb[0]) + c(rgb[1]) + c(rgb[2]);
}

function relativeLuminance([r, g, b]) {
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function rgbToHsl([r, g, b]) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h, sat, l];
}

function hslToRgb([h, sat, l]) {
  if (sat === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat;
  const pp = 2 * l - q;
  const channel = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return pp + (q - pp) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6;
    return pp;
  };
  return [channel(h + 1 / 3) * 255, channel(h) * 255, channel(h - 1 / 3) * 255];
}

// Returns the input unchanged when it already passes, when it is not a plain
// hex literal, or when even pure black/white cannot reach the threshold.
function clampContrast(value, bgHex) {
  const fg = parseHex(value);
  const bg = parseHex(bgHex);
  if (!fg || !bg) return value;
  if (contrastRatio(fg, bg) >= MIN_CONTRAST) return value;

  const [h, sat, l0] = rgbToHsl(fg);
  // Move away from the background: darken on a light ground, lighten on a
  // dark one. 1/255 steps are finer than any perceptible colour change.
  const darken = relativeLuminance(bg) > relativeLuminance(fg);
  const step = darken ? -1 / 255 : 1 / 255;
  for (let l = l0 + step; l >= 0 && l <= 1; l += step) {
    // Measure the rounded hex, not the float triple -- rounding can drop a
    // candidate that measured just over the threshold back under it.
    const candidate = toHex(hslToRgb([h, sat, l]));
    if (contrastRatio(parseHex(candidate), bg) >= MIN_CONTRAST) return candidate;
  }
  return value;
}

function parseTheme(text) {
  const stripped = text.replace(COMMENT_RE, "");
  const result = new Map();
  for (const rawLine of stripped.split(/\r?\n/)) {
    const m = PROPERTY_LINE.exec(rawLine.trim());
    if (!m) continue;
    const name = m[1];
    const value = m[2].trim().replace(/;\s*$/, "").trim();
    if (!value) continue; // empty `Name: ;` = inherit-from-parent, skip
    result.set(name, value);
  }
  return result;
}

function symbolProps(theme) {
  const grouped = new Map();
  for (const [name, value] of theme) {
    const m = SYMBOL_PROP.exec(name);
    if (!m) continue;
    const sym = m[1];
    const prop = m[2];
    let entry = grouped.get(sym);
    if (!entry) {
      entry = {};
      grouped.set(sym, entry);
    }
    entry[prop] = value;
  }
  return grouped;
}

function propsKey(props) {
  if (!props) return "_";
  return PROP_ORDER.map((k) => `${k}=${props[k] || ""}`).join("|");
}

export async function loadHighlightTheme(themesDir = DEFAULT_THEMES_DIR) {
  const [lightText, darkText] = await Promise.all([
    fs.readFile(path.join(themesDir, "Light.theme"), "utf8"),
    fs.readFile(path.join(themesDir, "Dark.theme"), "utf8"),
  ]);
  const light = symbolProps(parseTheme(lightText));
  const dark = symbolProps(parseTheme(darkText));

  // Deduped list of Symbols the renderer can land on.
  const referenced = [];
  const seen = new Set();
  for (const [, sym] of SCOPE_TO_SYMBOL) {
    if (seen.has(sym)) continue;
    seen.add(sym);
    referenced.push(sym);
  }

  // Group Symbols by their (Light props, Dark props) tuple so any two
  // Symbols that share BOTH palettes' properties collapse to one
  // class. The grouping key is a deterministic string suitable for
  // sort -- the assigned classId stays stable across builds because
  // the sort key is property-derived, not insertion-order-derived.
  const symbolTuple = new Map();
  for (const sym of referenced) {
    symbolTuple.set(
      sym,
      propsKey(light.get(sym)) + "##" + propsKey(dark.get(sym)),
    );
  }
  const uniqueTuples = [...new Set(symbolTuple.values())].sort();
  const tupleToClass = new Map(
    uniqueTuples.map((t, i) => [t, `c${i + 1}`]),
  );

  const symbolToClass = new Map();
  for (const sym of referenced) {
    symbolToClass.set(sym, tupleToClass.get(symbolTuple.get(sym)));
  }

  // Representative Symbol per class -- any one in the group works
  // since group members share both palettes' properties.
  const classToSample = new Map();
  for (const sym of referenced) {
    const cls = symbolToClass.get(sym);
    if (!classToSample.has(cls)) classToSample.set(cls, sym);
  }
  // For human-readable rule comments: list every Symbol in each group.
  const classToSymbols = new Map();
  for (const sym of referenced) {
    const cls = symbolToClass.get(sym);
    if (!classToSymbols.has(cls)) classToSymbols.set(cls, []);
    classToSymbols.get(cls).push(sym);
  }

  const scopeToClass = SCOPE_TO_SYMBOL.map(
    ([scope, sym]) => [scope, symbolToClass.get(sym)],
  );

  function classForScope(scopes) {
    for (let i = scopes.length - 1; i >= 0; i--) {
      const scope = scopes[i];
      for (const [prefix, cls] of scopeToClass) {
        if (scope === prefix || scope.startsWith(prefix + ".")) return cls;
      }
    }
    return null;
  }

  function classForSymbol(symbolName) {
    return symbolToClass.get(symbolName) ?? null;
  }

  // CSS emit. One rule per (palette, classId). The dark palette nests
  // under `html.dark-mode` so the chrome's theme toggle flips the
  // syntax highlight in lockstep with the rest of the page.
  const orderedClasses = uniqueTuples.map((t) => tupleToClass.get(t));
  const symbolListComment = (cls) =>
    classToSymbols.get(cls).map((s) => `Symbol${s}`).join(", ");

  const renderRule = (selector, props, comment, bg) => {
    if (!props) return "";
    const lines = [];
    let note = "";
    for (const k of PROP_ORDER) {
      if (!props[k]) continue;
      let value = props[k];
      if (k === "Color") {
        const clamped = clampContrast(value, bg);
        if (clamped !== value) {
          note = ` -- ${value} raised to ${MIN_CONTRAST}:1 on ${bg}`;
          value = clamped;
        }
      }
      lines.push(`  ${CSS_PROP[k]}: ${value};`);
    }
    if (lines.length === 0) return "";
    const c = comment ? `  /* ${comment}${note} */` : "";
    return `${selector} {${c}\n${lines.join("\n")}\n}\n`;
  };

  let css =
    "/* twinBASIC syntax-highlight palette. Generated from\n" +
    "   builder/themes/Light.theme + builder/themes/Dark.theme by\n" +
    "   builder/highlight-theme.mjs. Do not hand-edit; regenerate by\n" +
    "   running build.bat. */\n\n" +
    "/* Light palette (root). */\n";
  for (const cls of orderedClasses) {
    const sym = classToSample.get(cls);
    css += renderRule(
      `.highlight .${cls}`,
      light.get(sym),
      symbolListComment(cls),
      CODE_BG.light,
    );
  }
  css += "\n/* Dark palette (active under html.dark-mode). */\n";
  for (const cls of orderedClasses) {
    const sym = classToSample.get(cls);
    css += renderRule(
      `html.dark-mode .highlight .${cls}`,
      dark.get(sym),
      symbolListComment(cls),
      CODE_BG.dark,
    );
  }

  return { classForScope, classForSymbol, css };
}
