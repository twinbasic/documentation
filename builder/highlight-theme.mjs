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

  const renderRule = (selector, props, comment) => {
    if (!props) return "";
    const lines = [];
    for (const k of PROP_ORDER) {
      if (props[k]) lines.push(`  ${CSS_PROP[k]}: ${props[k]};`);
    }
    if (lines.length === 0) return "";
    const c = comment ? `  /* ${comment} */` : "";
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
    css += renderRule(`.highlight .${cls}`, light.get(sym), symbolListComment(cls));
  }
  css += "\n/* Dark palette (active under html.dark-mode). */\n";
  for (const cls of orderedClasses) {
    const sym = classToSample.get(cls);
    css += renderRule(
      `html.dark-mode .highlight .${cls}`,
      dark.get(sym),
      symbolListComment(cls),
    );
  }

  return { classForScope, classForSymbol, css };
}
