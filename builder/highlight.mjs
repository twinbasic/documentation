// Phase 3 syntax highlighter. Wraps Shiki + the twinBASIC TextMate
// grammar to produce themed <pre> blocks; the per-token colour palette
// comes from builder/highlight-theme.mjs (which reads the vendored
// twinBASIC IDE .theme files). The renderer's class output and the
// matching CSS share a single source of truth -- editing a .theme
// file changes both halves of the pipeline.
//
// Wrapper shape (matches what the chrome's CSS selectors target):
//
//   <div class="language-<lang> highlighter-rouge">
//     <div class="highlight">
//       <pre class="highlight"><code>...spans...
// </code></pre>
//     </div>
//   </div>

import { promises as fs } from "node:fs";
import { loadHighlightTheme } from "./highlight-theme.mjs";

// Fenced-info aliases that select the bundled tB grammar.
const TB_ALIASES = new Set(["tb", "twinbasic", "vb", "vba"]);

// Fence labels that explicitly disclaim highlighting -- never warn for these.
// Empty info string lands as wrapperLang `plaintext` (see renderCodeBlock).
const SILENT_LANGS = new Set(["plaintext", "text", "txt", ""]);

// Shiki grammars to load alongside the tB grammar. Restricted to labels
// actually used in docs/ -- the highlighter warns at build time for any
// unknown label, so adding a new fence language is a deliberate step:
// extend this list, run the build, verify no warning. Aliases are
// recognized automatically (shiki registers both canonical and alias
// names, so loading `js` accepts `javascript` too, `yaml` accepts `yml`,
// `batch` accepts `bat`). Counts from the last survey are noted.
const SHIKI_LANGS = [
  "js",     // 56 blocks (CEF/WebView2 interop tutorials)
  "yaml",   // 13 blocks (config snippets)
  "json",   //  7 blocks
  "c",      //  3 blocks (Win32 API examples, comment style demos)
  "html",   //  2 blocks (transitively loads css + javascript)
  "xml",    //  1 block
  "sql",    //  1 block
  "batch",  //  1 block (Windows .bat examples)
];

// Phase 11 (B5) server-side copy-button: emitted inside the wrapper
// before the <div class="highlight"> child so it absolutely-positions
// over the top-right corner per the chrome's existing CSS rules. The
// matching click handler in builder/assets/js/just-the-docs.js binds
// to these pre-rendered buttons on DOM-ready -- the runtime DOM
// injection path (the upstream `processCodeBlocks` step) is gone.
const COPY_BUTTON_HTML =
  `<button type="button" class="copy-code" aria-label="Copy code to clipboard">` +
  `<svg viewBox="0 0 24 24" class="copy-icon"><use xlink:href="#svg-copy"></use></svg>` +
  `</button>`;

let cached = null;

export async function initHighlighter() {
  if (cached) return cached;

  const theme = await loadHighlightTheme();

  let shiki = null;
  try {
    const grammarUrl = new URL("./twinbasic.tmLanguage.json", import.meta.url);
    const grammarText = await fs.readFile(grammarUrl, "utf8");
    const tbGrammar = JSON.parse(grammarText);
    const { createHighlighter } = await import("shiki");
    shiki = await createHighlighter({
      themes: [],
      langs: [tbGrammar, ...SHIKI_LANGS],
    });
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }

  // Dedup unknown-language warnings per init. SILENT_LANGS suppresses
  // explicit plaintext intent (text, txt, plaintext) and empty fences.
  const warned = new Set();
  const warn = (lang) => {
    if (warned.has(lang)) return;
    warned.add(lang);
    console.warn(
      `highlight: unknown fence language "${lang}" -- falling back to plain text. ` +
      `Add it to highlight.mjs's SHIKI_LANGS to enable highlighting.`);
  };

  cached = {
    render: (code, lang) => renderCodeBlock(shiki, theme, code, lang, warn),
    themeCss: theme.css,
  };
  return cached;
}

function renderCodeBlock(shiki, theme, code, lang, warn) {
  const lower = (lang || "").toLowerCase();
  const isTb = TB_ALIASES.has(lower);
  // The wrapper class is `language-<as-typed>`; keep `vb` / `vba` /
  // `twinbasic` distinct in the wrapper even though they all route to
  // the tB grammar internally. An empty info string lands as
  // `language-plaintext`.
  const wrapperLang = lang ? lang.trim().toLowerCase() : "plaintext";

  let shikiLang = null;
  if (shiki) {
    if (isTb) {
      shikiLang = "tb";
    } else if (shiki.getLoadedLanguages().includes(lower)) {
      shikiLang = lower;
    }
  }

  // Warn for non-silent fence labels that don't resolve to a loaded
  // grammar. SILENT_LANGS covers explicit plaintext intent.
  if (!shikiLang && !SILENT_LANGS.has(lower) && warn) {
    warn(lower);
  }

  // The trailing \n inside <code> matches the rouge / kramdown shape:
  // GFM strips the user's trailing newline; one is re-added here.
  const codeBody = code.endsWith("\n") ? code : code + "\n";

  let tokenizedHtml;
  if (shikiLang) {
    const lines = shiki.codeToTokensBase(codeBody, {
      lang: shikiLang,
      includeExplanation: true,
    });
    tokenizedHtml = renderThemedSpans(lines, theme);
  } else {
    tokenizedHtml = escapeHtml(codeBody);
  }

  return `<div class="language-${wrapperLang} highlighter-rouge">${COPY_BUTTON_HTML}<div class="highlight"><pre class="highlight"><code>${tokenizedHtml}</code></pre></div></div>`;
}

// Shiki's `codeToTokensBase` with `includeExplanation` returns
// ThemedToken[][] where every top-level token also exposes a per-
// segment scope chain inside its `explanation` array. The renderer
// walks each segment, asks the theme for the matching palette class,
// and emits coalesced run-spans:
//
//   (a) Adjacent same-class runs merge into one <span> so a multi-line
//       block comment renders as a single coloured block.
//   (b) Line-continuation runs absorb the leading whitespace of the
//       next line, mirroring the tB lexer's `_[ \t]*\n[ \t]*` token
//       shape -- one span covers both halves of the continuation.
//   (c) Comment runs defer their trailing newline so a continuing
//       comment on the next line merges into the same span; every
//       other run flushes before the newline.
function renderThemedSpans(lines, theme) {
  const lcClass = theme.classForSymbol("ContinuationCharacter");
  const cmClass = theme.classForSymbol("Comment");

  const parts = [];
  let runCls = undefined;    // undefined = no run; null = unclassed run; string = class
  let runText = "";
  let pendingNewlines = "";

  const flush = () => {
    if (runText === "") {
      runCls = undefined;
      return;
    }
    parts.push(
      runCls ? `<span class="${runCls}">${runText}</span>` : runText,
    );
    runText = "";
    runCls = undefined;
  };
  const append = (cls, text) => {
    if (text === "") return;
    if (runCls === undefined) {
      if (pendingNewlines !== "") {
        parts.push(pendingNewlines);
        pendingNewlines = "";
      }
      runCls = cls;
      runText = text;
    } else if (cls === runCls) {
      // Same class -- absorb any pending newline INTO the span so
      // multi-line same-class runs share a single coloured block.
      if (pendingNewlines !== "") {
        runText += pendingNewlines;
        pendingNewlines = "";
      }
      runText += text;
    } else if (runCls === lcClass && cls === null && /^[ \t]+$/.test(text)) {
      // Fold the next line's leading whitespace into the open
      // line-continuation span.
      runText += text;
    } else {
      flush();
      if (pendingNewlines !== "") {
        parts.push(pendingNewlines);
        pendingNewlines = "";
      }
      runCls = cls;
      runText = text;
    }
  };

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    for (const tok of line) {
      if (tok.explanation && tok.explanation.length > 0) {
        for (const ex of tok.explanation) {
          const scopes = (ex.scopes || []).map((s) => s.scopeName);
          const cls = theme.classForScope(scopes);
          append(cls, escapeHtml(ex.content));
        }
      } else {
        append(null, escapeHtml(tok.content));
      }
    }
    // End of line:
    //   - lc runs: fold the newline into the span; the next line's
    //     leading whitespace is absorbed by the lcClass/cls=null
    //     branch in append().
    //   - comment runs: defer the newline so a continuing comment on
    //     the next line can merge into the same span.
    //   - everything else: flush and park the newline for the gap
    //     between spans.
    if (runCls === lcClass) {
      append(lcClass, "\n");
    } else if (runCls === cmClass) {
      pendingNewlines += "\n";
    } else {
      flush();
      pendingNewlines += "\n";
    }
  }
  flush();
  if (pendingNewlines !== "") {
    // Drop the single trailing newline; renderCodeBlock already added
    // one to codeBody.
    parts.push(pendingNewlines.slice(0, -1));
  }
  return parts.join("");
}

// Rouge's HTML formatter escapes only `& < >` -- not quotes. Match that
// so string literals inside code blocks keep their literal " character.
const HTML_ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };
function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => HTML_ESCAPE[c]);
}
