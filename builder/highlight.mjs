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
import { createHighlighter } from "shiki";

import { loadHighlightTheme } from "./highlight-theme.mjs";

// Fenced-info aliases that select the bundled tB grammar.
const TB_ALIASES = new Set(["tb", "twinbasic", "vb", "vba"]);
const SHIKI_BUNDLED_LANGS = [
  "js", "json", "ruby", "html", "yaml", "xml", "sql", "sh", "cpp", "c", "liquid",
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

export async function initHighlighter({ copyButton = true } = {}) {
  if (cached) return cached;

  const theme = await loadHighlightTheme();

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

  const copyButtonHtml = copyButton ? COPY_BUTTON_HTML : "";
  cached = {
    render: (code, lang) => renderCodeBlock(shiki, theme, copyButtonHtml, code, lang),
    themeCss: theme.css,
  };
  return cached;
}

function renderCodeBlock(shiki, theme, copyButtonHtml, code, lang) {
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

  return `<div class="language-${wrapperLang} highlighter-rouge">${copyButtonHtml}<div class="highlight"><pre class="highlight"><code>${tokenizedHtml}</code></pre></div></div>`;
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
