// Phase 3 syntax highlighter. Wraps Shiki + the twinBASIC TextMate
// grammar to produce Rouge-shaped HTML so the existing rouge.css keeps
// working byte-for-byte. See builder/PLAN-3.md §5.10 + §7 for the full
// spec.
//
// Wrapper shape (kept identical to Rouge's HTML formatter):
//   <div class="language-<lang> highlighter-rouge">
//     <div class="highlight">
//       <pre class="highlight"><code>...spans...
// </code></pre>
//     </div>
//   </div>

import { promises as fs } from "node:fs";
import { createHighlighter } from "shiki";

// TextMate scope prefix -> Rouge class. Entries are matched against the
// per-token scope chain in order (most-specific scope first); the first
// hit wins. Entries are language-agnostic (no trailing `.tb` / `.js` /
// `.c`) so the same map handles every grammar Shiki loads. Ordering
// matters: more-specific prefixes must precede their parents (e.g.
// "comment.block.preprocessor" before "comment.block").
const SCOPE_TO_ROUGE_CLASS = [
  ["punctuation.line-continuation",          "lc"],
  ["constant.language.boolean",              "lb"],
  ["constant.language.empty",                "le"],
  ["constant.language.nothing",              "ln"],
  ["constant.language.null",                 "lu"],
  ["constant.numeric.float",                 "mf"],
  ["constant.numeric.integer",               "mi"],
  ["constant.numeric",                       "m"],
  ["constant.other.date",                    "ld"],
  ["comment.line",                           "c1"],
  ["comment.block.preprocessor",             "cp"],
  ["comment.block",                          "cm"],
  ["meta.preprocessor",                      "cp"],
  ["keyword.declaration",                    "kd"],
  ["keyword.operator.word",                  "ow"],
  ["keyword.operator",                       "o"],
  ["keyword.control",                        "k"],
  ["keyword",                                "k"],
  // JS arrow functions `=>` carry the more specific scope
  // `storage.type.function.arrow.*`. Rouge treats them as Operator
  // (`o`) -- match that BEFORE the broader `storage.type.function`
  // rule below picks them up as kd.
  ["storage.type.function.arrow",            "o"],
  // Rouge's JS / Ruby / similar lexers classify `function`, `class`,
  // `extends` etc. as Keyword::Declaration -- a separate token category
  // from Keyword::Type. Match that for grammars that tag declarators as
  // `storage.type.function.*`.
  ["storage.type.function",                  "kd"],
  // `async`/`await` / `static` / similar TextMate `storage.modifier`
  // scopes are Keyword (not Declaration, not Type) in Rouge.
  ["storage.modifier",                       "k"],
  ["storage.type",                           "kt"],
  ["entity.name.function",                   "nf"],
  ["entity.name.type",                       "nc"],
  ["entity.name.namespace",                  "nn"],
  ["entity.other.attribute-name",            "na"],
  ["entity.name.tag",                        "nt"],
  ["variable",                               "nv"],
  ["support.function",                       "nb"],
  ["punctuation",                            "p"],
  ["meta.brace",                             "p"],
  ["string.escape",                          "se"],
  ["string.quoted.double",                   "s"],
  ["entity.name",                            "n"],
  ["invalid.illegal",                        "err"],
];

// Languages we tokenise alongside the bundled tB grammar. Each name
// must be a Shiki bundled-language identifier or a tB alias. `tb`'s
// aliases collapse to "tb" for the wrapper class; every other entry
// keeps its own name in the wrapper.
const TB_ALIASES = new Set(["tb", "twinbasic", "vb", "vba"]);
const SHIKI_BUNDLED_LANGS = ["js", "json", "ruby", "html", "yaml", "xml", "sql", "sh", "cpp", "c", "liquid"];

let cached = null;

export async function initHighlighter() {
  if (cached) return cached;

  let shiki = null;
  try {
    const grammarUrl = new URL("./twinbasic.tmLanguage.json", import.meta.url);
    const grammarText = await fs.readFile(grammarUrl, "utf8");
    const tbGrammar = JSON.parse(grammarText);
    shiki = await createHighlighter({
      themes: [],
      langs: [tbGrammar, ...SHIKI_BUNDLED_LANGS],
    });
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }

  cached = {
    render: (code, lang) => renderCodeBlock(shiki, code, lang),
  };
  return cached;
}

function renderCodeBlock(shiki, code, lang) {
  const lower = (lang || "").toLowerCase();
  const isTb = TB_ALIASES.has(lower);
  // Rouge wraps the code block with `language-<info-string>` (the
  // literal first token of the fence info). Two minor adjustments:
  //   - The empty info string and `tb` aliases both resolve to the tB
  //     lexer, but Rouge's CSS class is `language-<as-typed>`. Keep
  //     `vb` / `vba` / `twinbasic` distinct in the wrapper. The
  //     internal `tb` alias is only for the wrapper when no lang is
  //     supplied (Jekyll's site default).
  //   - `lang` may have whitespace from a ` ``` vb` style fence;
  //     callers already trim, but stay defensive.
  const wrapperLang = lang ? lang.trim().toLowerCase() : "plaintext";
  // Shiki language id for the actual tokenise call.
  let shikiLang = null;
  if (shiki) {
    if (isTb) {
      shikiLang = "tb";
    } else if (shiki.getLoadedLanguages().includes(lower)) {
      shikiLang = lower;
    }
  }

  // Rouge always emits a trailing \n inside <code>; kramdown's GFM parser
  // strips the user's trailing newline from the fence body and Rouge
  // re-adds exactly one. Mirror that.
  const codeBody = code.endsWith("\n") ? code : code + "\n";

  let tokenizedHtml;
  if (shikiLang) {
    const lines = shiki.codeToTokensBase(codeBody, {
      lang: shikiLang,
      includeExplanation: true,
    });
    tokenizedHtml = renderRougeStyleSpans(lines, isTb);
  } else {
    tokenizedHtml = escapeHtml(codeBody);
  }

  return `<div class="language-${wrapperLang} highlighter-rouge"><div class="highlight"><pre class="highlight"><code>${tokenizedHtml}</code></pre></div></div>`;
}

// Shiki's `codeToTokensBase` with `includeExplanation` returns
// ThemedToken[][] where every top-level token has a per-line content
// span. The token-level scope chain is coarse, but the `explanation`
// array breaks it into per-segment entries with each segment's own
// scope chain -- that's the granularity we need to emit Rouge-style
// per-keyword/operator/string <span>s.
// Lift the scope-prefix lookup out of the hot loop -- one shallow
// iteration over the chain replaces a doubly-nested loop in
// `bestRougeClass`.

function renderRougeStyleSpans(lines, isTb) {
  // Coalesce adjacent runs with the same Rouge class into one <span>.
  // Inter-line newlines are deferred -- if the next non-empty token
  // shares the open run's class, the newline is absorbed into the span
  // (the way Rouge keeps a multi-line block comment in one
  // Comment::Multiline token); otherwise it flushes outside the span.
  const parts = [];
  let runCls = undefined; // undefined = no run open; null = no-class run; string = class
  let runText = "";
  let pendingNewlines = "";

  const flush = () => {
    if (runText === "") { runCls = undefined; return; }
    parts.push(runCls ? `<span class="${runCls}">${runText}</span>` : runText);
    runText = "";
    runCls = undefined;
  };
  const append = (cls, text) => {
    if (text === "") return;
    if (runCls === undefined) {
      // Pending newlines belong before the first content of a fresh run.
      if (pendingNewlines !== "") { parts.push(pendingNewlines); pendingNewlines = ""; }
      runCls = cls;
      runText = text;
    } else if (cls === runCls) {
      // Same class -- absorb any pending newline INTO the span and keep
      // accumulating. This is what gives Rouge-shaped multi-line spans
      // for block comments / multi-line strings.
      if (pendingNewlines !== "") { runText += pendingNewlines; pendingNewlines = ""; }
      runText += text;
    } else if (runCls === "lc" && cls === null && /^[ \t]+$/.test(text)) {
      // Rouge's LineContinuation token is `_[ \t]*\n[ \t]*` -- i.e. it
      // also absorbs the next line's leading whitespace into the same
      // <span class="lc"> element. Our TextMate `line-continuation`
      // rule only matches `_[ \t]*$` (single-line); the next line's
      // indent comes through as a separate cls=null whitespace token.
      // Fold it into the open lc run instead of flushing.
      runText += text;
    } else {
      // Class change -- flush the open run, emit any pending newline
      // OUTSIDE the span, then start the new run.
      flush();
      if (pendingNewlines !== "") { parts.push(pendingNewlines); pendingNewlines = ""; }
      runCls = cls;
      runText = text;
    }
  };

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    for (const tok of line) {
      if (tok.explanation && tok.explanation.length > 0) {
        for (const ex of tok.explanation) {
          // Walk scopes outer -> inner (least specific -> most specific
          // per TextMate convention). The first scope whose prefix is
          // mapped wins, which lets a parent comment.block scope override
          // an inner punctuation.definition.comment marker the way Rouge
          // emits a single Comment::Multiline token for `/* ... */`.
          const scopes = (ex.scopes || []).map((s) => s.scopeName);
          let cls = bestRougeClass(scopes);
          // Rouge's JS / Python / Ruby / C / etc. lexers tag identifiers
          // as Name::Other (nx) rather than Name::Variable (nv); tB
          // alone uses Name::Variable for `Dim X`-style declarations.
          // Remap when the language isn't tB.
          if (!isTb && cls === "nv") cls = "nx";
          // Rouge's C / C++ lexers don't have a `variable.parameter`
          // category; identifiers in parameter lists are just Name (n)
          // even when Shiki tags them via `variable.parameter.*` in a
          // lambda-capture context (e.g. `[out]` in IDL/COM API decls).
          // Override for cpp / c scopes.
          if (!isTb && (cls === "nx" || cls === "nv")
              && /\.(cpp|c|h)$/.test(scopes[scopes.length - 1] || "")) {
            cls = "n";
          }
          // Rouge's JS lexer has an explicit `builtins` list (Array,
          // Boolean, Date, ..., window, document, navigator, ...)
          // -- identifiers in that list are tagged Name::Builtin (nb).
          // Shiki's JS grammar tags them as `variable.other.object.js`
          // / `variable.other.readwrite.js` -> nv -> nx (via the
          // remap above). Override to nb when the literal matches a
          // known builtin and the scope is .js.
          if (!isTb && (cls === "nx" || cls === null)
              && /\.js$/.test(scopes[scopes.length - 1] || "")
              && JS_BUILTINS.has(ex.content)) {
            cls = "nb";
          }
          // Rouge's JS lexer classifies bare `var`/`let`/`const` as
          // Keyword::Declaration (kd). In Shiki's JS grammar these
          // tokens carry scope `storage.type.js` -- exactly the same
          // shape (`storage.type.<lang>`, no specific keyword segment)
          // tB uses for its type keywords (`storage.type.tb` ->
          // String, Integer, ...). Disambiguate by language: for
          // non-tB grammars whose specific scope is the bare
          // `storage.type.<lang>` form, remap kt -> kd.
          if (!isTb && cls === "kt" && STORAGE_TYPE_BARE_RE.test(scopes[scopes.length - 1] || "")) {
            cls = "kd";
          }
          // Rouge's JS lexer has a quirk where a function-CALL
          // identifier containing an uppercase letter is tagged
          // Name::Class (nc) instead of Name::Function (nf):
          // `Foo()` -> nc, `foo()` -> nf. Function DEFINITIONS keep
          // `nf` regardless of case (the upstream regex at
          // rouge/lexers/javascript.rb#185 only fires when the
          // identifier is immediately followed by `(...)` AND is not in
          // the `function <name>(...)` declaration position handled by
          // line 187). Distinguish by the parent scope chain --
          // `meta.function-call.*` marks a call site,
          // `meta.definition.function.*` marks a definition.
          if (cls === "nf"
              && /\.js$/.test(scopes[scopes.length - 1] || "")
              && /^[$_]*\p{Lu}/u.test(ex.content)
              && scopes.some((s) => s.startsWith("meta.function-call"))) {
            cls = "nc";
          }
          // Rouge's numeric tokens are typed by content: Num::Integer
          // (mi), Num::Float (mf), Num::Hex (mh), Num::Oct (mo), etc.
          // Many Shiki grammars tag every numeric as the generic
          // `constant.numeric.decimal.<lang>` (-> `m`) without
          // distinguishing the subtype. Look at the literal text and
          // upgrade `m` to the right Rouge bucket.
          if (cls === "m") {
            const trimmed = ex.content;
            if (/^0[xX][0-9a-fA-F_]+$/.test(trimmed)) cls = "mh";
            else if (/^0[oO][0-7_]+$/.test(trimmed)) cls = "mo";
            else if (/^0[bB][01_]+$/.test(trimmed)) cls = "mb";
            else if (/^[0-9_]+$/.test(trimmed)) cls = "mi";
            else if (/^[0-9._eE+-]+$/.test(trimmed) && /\./.test(trimmed)) cls = "mf";
          }
          // Rouge's JS lexer (and several others) splits string tokens
          // into delimiters (`"`, `'`) and content. The delimiter is
          // tagged Str::Delimiter (`dl`), the content Str::Double (`s2`)
          // or Str::Single (`s1`). tB and C alike use a single Str
          // (`s`) for everything. Apply the split only when the scope
          // chain has both a string scope and a definition marker --
          // and only for grammars where Rouge does this split, i.e.
          // JavaScript here. (C / Ruby / etc. stay with the parent
          // string class via DEFINITION_MARKER_RE fallthrough.)
          const lastScope = scopes[scopes.length - 1] || "";
          if (!isTb && lastScope.startsWith("punctuation.definition.string") && /\.js$/.test(lastScope)) {
            cls = "dl";
          } else if (!isTb && /^string\.quoted\.double\.js$/.test(lastScope)) {
            cls = "s2";
          } else if (!isTb && /^string\.quoted\.single\.js$/.test(lastScope)) {
            cls = "s1";
          }
          // Rouge's JS lexer parses `...`, `?`, `:` (and the other
          // structural single-char tokens) as Punctuation, not Operator.
          // TextMate / Shiki tags `...` as `keyword.operator.spread.*`,
          // `?` ternary as `keyword.operator.ternary.*`, etc. -- all of
          // which map to `o` via the generic `keyword.operator` rule.
          // Remap the punctuation-shaped sub-scopes back to `p` when the
          // grammar isn't tB.
          if (!isTb && cls === "o" && NONTB_PUNCT_OPERATOR_RE.test(scopes[scopes.length - 1] || "")) {
            cls = "p";
          }
          // Rouge tags unrecognised identifiers in the C / HTML / JS
          // grammars as Name (class "n"); Shiki's bundled grammars
          // leave them with no inner scope (just `source.<lang>`). When
          // there's no class match and the token's trimmed text looks
          // like an identifier, split off any leading / trailing
          // whitespace and emit the identifier inside its own <n> span.
          if (cls === null) {
            const m = ex.content.match(/^(\s*)([A-Za-z_]\w*)(\s*)$/);
            if (m) {
              if (m[1]) append(null, escapeHtml(m[1]));
              append("n", escapeHtml(m[2]));
              if (m[3]) append(null, escapeHtml(m[3]));
              continue;
            }
            // For C / C++ specifically, Shiki sometimes returns one big
            // unclassified token covering a parameter list / declaration
            // tail when the grammar's higher-level scope (e.g. a lambda
            // capture) consumes the start but doesn't break out the
            // rest. Rouge instead tokenises each character: identifiers
            // -> Name (n), brackets / commas / dots -> Punctuation (p).
            // Re-tokenise the bulk content with a lightweight scanner
            // when the parent grammar is C / C++.
            if (!isTb && CPP_LIKE_RE.test(scopes[scopes.length - 1] || "")
                && SPLITTABLE_TOKEN_RE.test(ex.content)) {
              for (const m2 of ex.content.matchAll(CPP_TOKEN_RE)) {
                if (m2[1] !== undefined) append("n", escapeHtml(m2[1]));
                else if (m2[2] !== undefined) append("p", escapeHtml(m2[2]));
                else if (m2[3] !== undefined) append(null, m2[3]); // whitespace
              }
              continue;
            }
          }
          append(cls, escapeHtml(ex.content));
        }
      } else {
        append(null, escapeHtml(tok.content));
      }
    }
    // The Rouge twinBASIC lexer's line-continuation rule is
    // `_[ \t]*\n[ \t]*` -- it ALSO absorbs the leading whitespace of
    // the following line into the same <span class="lc">. Append the
    // newline to the open lc run here; the matching whitespace-absorb
    // case in `append()` folds the next line's indent into the same
    // run when its first token is a cls=null whitespace token.
    //
    // For block comments (cm), defer the newline so it can be merged
    // into the next run if the same scope continues -- Rouge emits one
    // Comment::Multiline span for a multi-line `/* ... */`. Every other
    // class is single-line in Rouge's output even when the surface
    // class matches across two adjacent lines (e.g. consecutive keyword
    // lines), so flush the run before the newline.
    if (runCls === "lc") {
      append("lc", "\n");
    } else if (runCls === "cm") {
      pendingNewlines += "\n";
    } else {
      flush();
      pendingNewlines += "\n";
    }
  }
  // End of input: flush any open run, then drop a single trailing
  // newline (the Rouge trailing \n inside <code> is supplied by the
  // codeBody adjustment in renderCodeBlock).
  flush();
  if (pendingNewlines !== "") {
    parts.push(pendingNewlines.slice(0, -1));
  }
  return parts.join("");
}

function bestRougeClass(scopes) {
  // Walk inner -> outer (most-specific scope first). When a scope chain
  // is `[source, string.quoted.double, string.escape]`, the inner
  // `string.escape` should win over the parent `string.quoted.double`
  // so Rouge's `<span class="se">""</span>` shape lands.
  //
  // For `punctuation.definition.*` markers attached to begin/end of a
  // container scope (comment, string, etc.), Rouge tokenises the whole
  // container as ONE token; fall through to the parent so the marker
  // gets the container's class. For markers OUTSIDE a container scope
  // (e.g. `punctuation.definition.capture.begin.lambda.cpp` whose only
  // parent is `source.cpp`), keep matching the marker as `punctuation`.
  for (let i = scopes.length - 1; i >= 0; i--) {
    const scope = scopes[i];
    if (DEFINITION_MARKER_RE.test(scope) && hasContainerParent(scopes, i)) continue;
    for (const [tmScope, cls] of SCOPE_TO_ROUGE_CLASS) {
      if (scope === tmScope || scope.startsWith(tmScope + ".")) return cls;
    }
  }
  return null;
}

const DEFINITION_MARKER_RE = /(^|\.)definition\./;

// Rouge's non-tB lexers (JS / TS / Ruby / Python / C / etc.) classify
// these tokens as Punctuation, not Operator. Shiki's TextMate grammars
// tag them under `keyword.operator.*` which maps to `o` via the generic
// rule -- remap to `p` for non-tB languages.
const NONTB_PUNCT_OPERATOR_RE = /^keyword\.operator\.(spread|rest|ternary|optional)\b/;

// The bare `storage.type.<lang>` scope (no specific keyword segment in
// between). Used by JS for `let`/`const`/`var` and by tB for type
// keywords. Disambiguated per-language in the renderer.
const STORAGE_TYPE_BARE_RE = /^storage\.type\.[a-z]+$/;

// Scopes whose unclassified bulk content should be re-tokenised by the
// lightweight identifier-and-punctuation scanner below.
const CPP_LIKE_RE = /\.(cpp|c|h|hpp|hxx)$/;

// Cheap test: the bulk content actually contains punctuation worth
// splitting (not just whitespace or a single identifier).
const SPLITTABLE_TOKEN_RE = /[,;()\[\]{}.]|[A-Za-z_]\w+\s+[A-Za-z_]/;

// One-pass scanner: identifier | punctuation | whitespace. Three
// alternation groups so the regex engine reports which fired.
const CPP_TOKEN_RE = /([A-Za-z_]\w*)|([,;()\[\]{}.])|(\s+)/g;

// Rouge's JS lexer `builtins` list (rouge/lexers/javascript.rb#127).
// Identifiers in this set are tagged Name::Builtin (`nb`).
const JS_BUILTINS = new Set([
  "Array", "Boolean", "Date", "Error", "Function", "Math", "netscape",
  "Number", "Object", "Packages", "RegExp", "String", "sun", "decodeURI",
  "decodeURIComponent", "encodeURI", "encodeURIComponent",
  "eval", "isFinite", "isNaN", "parseFloat", "parseInt",
  "document", "window", "navigator", "self", "global",
  "Promise", "Set", "Map", "WeakSet", "WeakMap", "Symbol", "Proxy", "Reflect",
  "Int8Array", "Uint8Array", "Uint8ClampedArray",
  "Int16Array", "Uint16Array", "Uint16ClampedArray",
  "Int32Array", "Uint32Array", "Uint32ClampedArray",
  "Float32Array", "Float64Array", "DataView", "ArrayBuffer",
]);

// True when any outer scope in the chain is a `container` (one whose
// top-level component matches a Rouge "single-token wrapper" element --
// comment/string/heredoc). Used by bestRougeClass to decide whether a
// `punctuation.definition.*` inner scope should fall through to the
// container's class.
const CONTAINER_TOP_LEVEL = new Set(["comment", "string"]);
function hasContainerParent(scopes, fromIdx) {
  for (let j = fromIdx - 1; j >= 0; j--) {
    const top = scopes[j].split(".")[0];
    if (CONTAINER_TOP_LEVEL.has(top)) return true;
  }
  return false;
}

// Matches a token whose content is entirely word characters (identifier-
// like). Used by the non-tB fallback in renderRougeStyleSpans to tag
// unrecognised identifiers as Rouge's Name token (class "n").
const IDENT_FALLBACK_RE = /^[A-Za-z_][\w]*$/;

// Rouge's HTML formatter escapes only `& < >` -- NOT quotes. Match that
// so string literals inside code blocks keep their literal " character
// and our bytes match Jekyll's verbatim.
const HTML_ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };
function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => HTML_ESCAPE[c]);
}
