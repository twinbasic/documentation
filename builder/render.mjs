// Phase 3 of tbdocs: render each page's markdown / HTML body to an HTML
// fragment stored on page.renderedContent. See builder/PLAN-3.md for the
// full spec.
//
// What this phase does NOT do (per PLAN-3 §3):
//   - wrap in <html> / layout / sidebar / footer / scripts (Phase 4)
//   - inject <a class="anchor-heading"> next to <hN id> (Phase 4 -- has
//     to see auto-generated heading IDs)
//   - compress whitespace (Phase 4)
//   - generate the per-page nav-activation <style> block (Phase 4)
//   - concatenate chapter bodies for the PDF book (Phase 8)

import MarkdownIt from "markdown-it";
import attrs from "markdown-it-attrs";
import deflist from "markdown-it-deflist";
import footnote from "markdown-it-footnote";

import { initHighlighter } from "./highlight.mjs";

export async function renderPhase(pages, site, staticFiles = []) {
  // Allow the orchestrator to pre-build the markdown-it instance (so
  // Phase 2's seo.mjs can share the same renderer). Idempotent: if
  // site.markdown is already set, use it; otherwise build it here.
  let md = site.markdown;
  if (!md) {
    const highlighter = await initHighlighter();
    const linkTables = buildLinkTables(pages);
    const baseurl = String(site.config.baseurl || "");
    const staticFileSet = new Set(staticFiles.map((s) => s.srcRel));
    md = createMarkdownIt({ highlighter, linkTables, baseurl, staticFiles: staticFileSet });
    site.markdown = md;
  }

  await Promise.all(pages.map(async (page) => {
    page.renderedContent = renderPage(page, md);
  }));
}

function renderPage(page, md) {
  if (page.ext === ".html") {
    // 404.html passes through Phase 4's default-layout wrap; book.html is
    // consumed by Phase 8. Either way, no markdown rendering happens here.
    return page.rawContent;
  }
  // CommonMark normalises CRLF/CR to LF before block parsing. The
  // pre-render rewrites below all rely on LF-only input -- do the
  // normalisation up front so they see consistent line shapes.
  let source = page.rawContent.replace(/\r\n?/g, "\n");
  source = stripLiquidRawTags(source);
  source = rewriteTripleAsteriskEmphasis(source);
  source = encodeSpacesInMediaUrls(source);
  source = rewriteListItemSetextHeadings(source);
  source = absorbTrailingHtmlComments(source);
  source = rewriteAdmonitions(source);
  let html = md.render(source, { page });
  html = normaliseVoidTags(html);
  html = padEmptyCells(html);
  return html;
}

// kramdown emits a single space inside otherwise-empty `<td>` / `<th>`
// cells (`<td> </td>`); markdown-it leaves them collapsed (`<td></td>`).
function padEmptyCells(html) {
  // kramdown emits `<td>\xa0</td>` (nbsp) for empty cells; we mirror
  // it so the rendered HTML byte-matches. Regular space here would
  // visually look the same, but Phase 4's compress would later
  // collapse it differently than kramdown's empty-cell content.
  return html.replace(/<(t[dh])([^>]*)><\/\1>/g, "<$1$2> </$1>");
}

// Jekyll's Liquid renderer strips `{% raw %}` / `{% endraw %}` tags
// before kramdown sees the source; markdown-it does not understand
// Liquid, so the tags survive into the rendered HTML. Strip them so
// the same content reaches the markdown parser as kramdown sees.
const LIQUID_RAW_RE = /\{%\s*(?:end)?raw\s*%\}/g;
function stripLiquidRawTags(src) {
  return src.replace(LIQUID_RAW_RE, "");
}

// kramdown accepts unescaped spaces inside `![alt](url)` and `[text](url)`
// URLs; CommonMark / markdown-it does NOT and leaves the source text
// unparsed. URL-encode spaces inside image and link URL components so
// markdown-it can parse them the way kramdown would.
//
// Only the simple case is handled: a URL that's a plain file path with
// spaces and NO embedded quotes or parens. Anything trickier (titles,
// nested parens) gets left alone -- the regex is too coarse to safely
// rewrite those.
const MEDIA_URL_SPACES_RE = /(!?\[(?:[^\]\n]*)\])\(([^)"'\n]+)\)/g;
function encodeSpacesInMediaUrls(src) {
  return src.replace(MEDIA_URL_SPACES_RE, (whole, prefix, url) => {
    if (!/ /.test(url)) return whole;
    return `${prefix}(${url.replace(/ /g, "%20")})`;
  });
}

// kramdown emits `***text***` as `<strong><em>text</em></strong>`;
// markdown-it emits the same source as `<em><strong>text</strong></em>`.
// Pre-rewriting the source to `**_text_**` makes both renderers emit
// the strong-outside form. Leave existing `**_..._**` and `_**...**_`
// patterns alone so their em/strong order matches the source intent.
const TRIPLE_STAR_RE = /\*\*\*([^*\n][^*\n]*?)\*\*\*/g;
function rewriteTripleAsteriskEmphasis(src) {
  return src.replace(TRIPLE_STAR_RE, "**_$1_**");
}

// kramdown attaches a standalone HTML-comment line to the preceding
// paragraph (the comment line ends up inside the paragraph's AST). In
// CommonMark / markdown-it, a comment that occupies a whole line is
// detected as a block-level HTML element and the preceding paragraph is
// closed before it. Pre-rewrite the source so a comment line that
// immediately follows a non-blank "regular text" line and is itself
// followed by a blank line is JOINED to the preceding line. markdown-it
// then treats the `<!-- ... -->` as inline raw HTML inside the same
// paragraph, matching kramdown.
//
// Conservative: skip if the previous line is a fence, heading, list
// marker, blockquote marker, or HTML-block opener -- those don't form
// the kind of paragraph kramdown would absorb the comment into.
const HTML_COMMENT_LINE_RE = /^[ \t]*<!--[^\n]*-->[ \t]*$/;
const PARAGRAPH_CONTINUATION_RE = /^[ \t]*[^\s#>*+\-`~|<\[].*$/;
function absorbTrailingHtmlComments(src) {
  const lines = src.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      i > 0
      && HTML_COMMENT_LINE_RE.test(line)
      && PARAGRAPH_CONTINUATION_RE.test(lines[i - 1])
      && (i + 1 >= lines.length || lines[i + 1].trim() === "")
    ) {
      // Append to the previous emitted line with a single space.
      out[out.length - 1] = `${out[out.length - 1]} ${line.trim()}`;
    } else {
      out.push(line);
    }
  }
  return out.join("\n");
}

// kramdown quirk: when `---` appears on a line directly after a list item,
// it treats the previous list item's content as a setext H2 INSIDE the
// <li>, and the `---` does NOT terminate the list. markdown-it instead
// reads `---` as <hr> after the list. Rewrite the source to make the
// promoted item explicit: `- text\n---\n` becomes `- ## text\n` so
// markdown-it emits an <li><h2>text</h2></li> at that position.
const LIST_ITEM_SETEXT_RE = /^([ \t]*[*+\-][ \t]+)([^\n]*?)\n[ \t]*---[ \t]*$/gm;
function rewriteListItemSetextHeadings(src) {
  return src.replace(LIST_ITEM_SETEXT_RE, (_, marker, text) => `${marker}## ${text}`);
}

// markdown-it inline newline rule, modified to keep all-but-the-final-
// two trailing spaces in the pending text. Matches kramdown's behaviour
// (the line-break regex `(  )(?=\n)` consumes exactly the final two
// spaces). Otherwise identical to the upstream rule.
function kramdownHardBreakNewline(state, silent) {
  let pos = state.pos;
  if (state.src.charCodeAt(pos) !== 0x0A) return false;

  const pmax = state.pending.length - 1;
  const max = state.posMax;

  if (!silent) {
    if (pmax >= 0 && state.pending.charCodeAt(pmax) === 0x20) {
      if (pmax >= 1 && state.pending.charCodeAt(pmax - 1) === 0x20) {
        // Two-or-more trailing spaces -> hardbreak. Strip only the final
        // two; preserve any additional trailing spaces in the text.
        state.pending = state.pending.slice(0, pmax - 1);
        state.push("hardbreak", "br", 0);
      } else {
        state.pending = state.pending.slice(0, -1);
        state.push("softbreak", "br", 0);
      }
    } else {
      state.push("softbreak", "br", 0);
    }
  }

  pos++;
  while (pos < max && state.src.charCodeAt(pos) === 0x20) pos++;
  while (pos < max && state.src.charCodeAt(pos) === 0x09) pos++;
  state.pos = pos;
  return true;
}

// kramdown normalises HTML void elements to the XHTML self-closing form
// (`<br />`, `<hr />`, `<img ... />`) regardless of the input shape.
// markdown-it with `xhtmlOut: true` emits the same form for tokens it
// generates, but raw block / inline HTML (like author-written `<br>`)
// passes through verbatim. Rewrite those to match.
const VOID_TAGS_RE = /<(br|hr|img|input|link|meta|area|base|col|embed|source|track|wbr)((?:\s+[^>/]+(?:="[^"]*"|='[^']*')?)*)\s*\/?>/gi;
function normaliseVoidTags(html) {
  return html.replace(VOID_TAGS_RE, (_, tag, attrs) => `<${tag.toLowerCase()}${attrs} />`);
}

// ---------- markdown-it configuration ---------------------------------------

export { initHighlighter };

export function createMarkdownIt(ctx) {
  const md = new MarkdownIt({
    // kramdown parse_block_html + parse_span_html; recursion handled by
    // blockHtmlRecursionPlugin (PLAN-3 §5.12).
    html: true,
    // kramdown emits self-closing <br /> / <hr /> (XHTML form); CommonMark
    // default is HTML5 <br>. Match kramdown.
    xhtmlOut: true,
    // kramdown hard_wrap is OFF on this site -- single newlines are not
    // <br>. Two-space line breaks still produce <br> via CommonMark.
    breaks: false,
    // Site content uses explicit [text](url) form; no bare URLs in body
    // prose. Off matches current rendered output.
    linkify: false,
    // -- -> en-dash, --- -> em-dash, ASCII quotes -> curly. Matches
    // kramdown smart_quotes; see PLAN-3 §5.9 for divergences.
    typographer: true,
    quotes: "“”‘’",
    highlight: (code, lang) => ctx.highlighter.render(code, lang),
  });

  // Override the fence renderer so our highlight callback's wrapper HTML
  // (which starts with <div, not <pre>) is used verbatim. Without this,
  // markdown-it's default fence rule wraps it in another <pre><code>.
  //
  // When the fence is nested (inside a list item, admonition, or other
  // block container), kramdown inserts a newline between the inner
  // `</div>` and the outer `</div>` of the wrapper as part of its
  // indented-block pretty-printing -- the html-compress pass then
  // renders that as a single space. Mirror by splicing a `\n` between
  // the close tags when level > 0.
  md.renderer.rules.fence = (tokens, idx, options) => {
    const tok = tokens[idx];
    const lang = tok.info ? tok.info.trim().split(/\s+/)[0] : "";
    const html = options.highlight(tok.content, lang);
    if (tok.level > 0 || tok.meta?.nestedInBlock) {
      return html.replace(/<\/div><\/div>$/, "</div>\n</div>") + "\n";
    }
    return html + "\n";
  };

  // Indented (4-space) code blocks have no language info. kramdown wraps
  // them in the same Rouge wrapper shape used for fences with a
  // `language-plaintext` class. markdown-it's default emits a bare
  // `<pre><code>` -- override to match.
  md.renderer.rules.code_block = (tokens, idx, _opts, _env, _slf) => {
    const tok = tokens[idx];
    const body = escapeHtmlMinimal(tok.content);
    return `<div class="language-plaintext highlighter-rouge"><div class="highlight"><pre class="highlight"><code>${body}</code></pre></div></div>\n`;
  };

  // kramdown/just-the-docs tag inline `code` spans with the Rouge wrapper
  // class so the same CSS rules style both block-level highlights and
  // inline ones. Match that, and escape only `& < >` (matching kramdown's
  // code-span escape) -- leaving `"` and `'` literal so embedded HTML
  // attribute syntax stays readable.
  md.renderer.rules.code_inline = (tokens, idx, _opts, _env, slf) => {
    const tok = tokens[idx];
    return `<code class="language-plaintext highlighter-rouge"${slf.renderAttrs(tok)}>${escapeHtmlMinimal(tok.content)}</code>`;
  };

  // just-the-docs wraps every <table> in <div class="table-wrapper"> via
  // its `_includes/table_wrappers.html` Liquid pass. Mirror that here so
  // CSS rules keyed on `.table-wrapper > table` keep working. Use the
  // default renderToken first so markdown-it's per-token block-prefix
  // whitespace handling still produces the leading newline when the
  // table sits at the start of a list-item / dd / blockquote child.
  md.renderer.rules.table_open = (tokens, idx, opts, _env, slf) =>
    slf.renderToken(tokens, idx, opts).replace(/<table>/, `<div class="table-wrapper"><table>`);
  md.renderer.rules.table_close = (tokens, idx, opts, _env, slf) =>
    `</table></div>` + slf.renderToken(tokens, idx, opts).replace(/<\/table>/, "");

  // kramdown emits `style="text-align: left"` with a space after the
  // colon; markdown-it emits the compact form. Override the th/td
  // renderers to widen the gap.
  const styleSpace = (defaultRule) => (tokens, idx, opts, env, slf) => {
    const tok = tokens[idx];
    const styleIdx = tok.attrIndex("style");
    if (styleIdx >= 0) {
      tok.attrs[styleIdx][1] = tok.attrs[styleIdx][1].replace(/:/g, ": ");
    }
    return slf.renderToken(tokens, idx, opts);
  };
  md.renderer.rules.th_open = styleSpace();
  md.renderer.rules.td_open = styleSpace();

  // kramdown renders ordered lists with no `start` attribute even when
  // the source numbers don't begin at 1 (it ignores the source
  // numbering entirely). markdown-it preserves it; strip to match.
  md.renderer.rules.ordered_list_open = (tokens, idx, _opts, _env, slf) => {
    const tok = tokens[idx];
    const startIdx = tok.attrIndex("start");
    if (startIdx >= 0) tok.attrs.splice(startIdx, 1);
    return slf.renderToken(tokens, idx, slf.options);
  };

  // Override the inline newline rule to match kramdown's hard-break
  // semantics. kramdown's regex `(  )(?=\n)` consumes EXACTLY the two
  // spaces immediately before the newline -- any additional trailing
  // spaces are preserved in the text. markdown-it's default rule strips
  // ALL trailing spaces before emitting the hardbreak. For 2-space hard
  // breaks (the common case) both behaviours are identical; the
  // divergence shows up with 3+ trailing spaces, where Jekyll renders
  // `text <br />` (one trailing space) and we render `text<br />`.
  md.inline.ruler.at("newline", kramdownHardBreakNewline);

  // kramdown's `{: ... }` attribute syntax. Default plugin delimiters
  // are `{` / `}`; we override both to require the colon.
  md.use(attrs, {
    leftDelimiter: "{:",
    rightDelimiter: "}",
  });
  md.use(standaloneIalForwardPlugin);
  md.use(tightLooseListPlugin);
  md.use(deflist);
  md.use(looseDeflistPlugin);
  md.use(footnote);
  configureFootnotes(md);
  md.use(headerIdPlugin);
  md.use(tocPlugin);
  md.use(relativeLinksPlugin, ctx);
  md.use(blockHtmlRecursionPlugin);
  md.use(kramdownDashesPlugin);
  md.use(kramdownEllipsisPlugin);
  md.use(flattenAdjacentStrongPlugin);

  return md;
}

// kramdown pairs adjacent `**` markers left-to-right (1st with 2nd,
// 3rd with 4th, ...). markdown-it follows CommonMark's emphasis rule,
// which prefers nesting when intermediate `**` markers can both open
// and close (e.g. `**X"**Y**"Z**` -> outer strong wrapping an inner
// strong). Detect the depth-2 nested-strong-with-text shape and
// flatten it back to two sibling strongs with the inner content as
// plain text between them.
function flattenAdjacentStrongPlugin(md) {
  md.core.ruler.after("inline", "flatten-adjacent-strong", (state) => {
    walkInlineChildren(state.tokens, (children) => {
      let i = 0;
      while (i < children.length) {
        // Pattern (level L):
        //   [i  ] strong_open  (level L)
        //   [i+1] text          (level L+1)   -- non-empty, "outer-left"
        //   [i+2] strong_open  (level L+1)
        //   [i+3] text          (level L+2)   -- "inner"
        //   [i+4] strong_close (level L+1)
        //   [i+5] text          (level L+1)   -- non-empty, "outer-right"
        //   [i+6] strong_close (level L)
        const t0 = children[i];
        if (t0 && t0.type === "strong_open"
            && children[i + 1]?.type === "text"
            && children[i + 2]?.type === "strong_open"
            && children[i + 3]?.type === "text"
            && children[i + 4]?.type === "strong_close"
            && children[i + 5]?.type === "text"
            && children[i + 6]?.type === "strong_close"
            && children[i + 2].markup === t0.markup
            && children[i + 4].markup === t0.markup
            && children[i + 6].markup === t0.markup) {
          // Repair the nesting:
          //   inner strong_open  -> outer strong_close
          //   inner strong_close -> outer strong_open
          // Level of each remaining content drops by one (was inside
          // the outer-then-inner stack, now only one deep at most).
          const innerOpen = children[i + 2];
          const innerClose = children[i + 4];
          const baseLevel = t0.level;
          innerOpen.type = "strong_close";
          innerOpen.tag = "strong";
          innerOpen.nesting = -1;
          innerOpen.level = baseLevel;
          innerClose.type = "strong_open";
          innerClose.tag = "strong";
          innerClose.nesting = 1;
          innerClose.level = baseLevel;
          // Plain-text middle is now at level baseLevel.
          children[i + 3].level = baseLevel;
          // Outer-left / outer-right texts retain their levels (still
          // inside a strong each).
          // No re-numbering of subsequent tokens needed -- levels are
          // only used by the renderer for indentation and our other
          // post-passes; the outer strong_close at i+6 is already at
          // baseLevel.
          i += 7;
          continue;
        }
        i++;
      }
    });
  });
}

// markdown-it's `replacements` core rule collapses every run of 2+ dots
// (`.{2,}`) to a single ellipsis `…`. kramdown is stricter: it converts
// exactly THREE consecutive dots to `…` and leaves any extra dots as
// plain dots. The two behaviours diverge on `....`, `.....`, etc.:
// kramdown writes `….`, `…..`, ...; markdown-it writes `…`, `…`, ....
// Walk text tokens after typographer has run; for each contiguous run of
// `…` immediately following a word/punctuation char (i.e. not in
// `?…` / `!…` patterns the upstream regex already special-cases),
// recover the missing dots if the source had >3 dots in a row.
function kramdownEllipsisPlugin(md) {
  md.core.ruler.after("replacements", "kramdown-ellipsis", (state) => {
    // The replacements rule has already collapsed `.{2,}` -> `…` (with
    // `?…` / `!…` -> `?..` / `!..` exceptions). We can't recover the
    // pre-collapse count from the token alone -- examine the inline
    // token's source content, count consecutive dots in the source, and
    // pad the rendered `…` with N-3 trailing dots when N > 3.
    for (const blk of state.tokens) {
      if (blk.type !== "inline" || !blk.children) continue;
      const src = blk.content;
      if (!/\.{4,}/.test(src)) continue;
      // Walk text children left-to-right tracking source position by
      // counting characters consumed. For each `…` we encounter in the
      // text content, peek the source string to count how many dots
      // were originally there.
      let srcPos = 0;
      for (const t of blk.children) {
        if (t.type !== "text" || !t.content) continue;
        let out = "";
        for (let i = 0; i < t.content.length; i++) {
          const ch = t.content[i];
          if (ch === "…") {
            // Find the matching dot run starting at or near srcPos.
            const m = src.slice(srcPos).match(/^[^.…]*\.{3,}/);
            const dotCount = m ? m[0].match(/\.+$/)[0].length : 3;
            out += "…";
            for (let k = 3; k < dotCount; k++) out += ".";
            srcPos += (m ? m[0].length : 3);
          } else if (ch === "—" || ch === "–") {
            out += ch;
            // skip 2-3 source chars for en/em-dash conversions
            const skip = src.startsWith("---", srcPos) ? 3 : (src.startsWith("--", srcPos) ? 2 : 1);
            srcPos += skip;
          } else {
            out += ch;
            srcPos++;
          }
        }
        t.content = out;
      }
    }
  });
}

// ---------- kramdown-style smart dashes -------------------------------------
//
// markdown-it's typographer converts `--` -> en-dash only when neither
// side is whitespace ("word--word"). kramdown converts unconditionally:
// `word-- word` -> `word– word`. Run a small pass over inline text
// tokens after markdown-it's typographer has finished, replacing the
// remaining `---` with em-dash and `--` with en-dash. text tokens
// inside code spans and code blocks are separate token types
// (code_inline / code_block / fence), so they're untouched.

function kramdownDashesPlugin(md) {
  md.core.ruler.after("replacements", "kramdown-dashes", (state) => {
    walkTokens(state.tokens, (t) => {
      if (t.type !== "text") return;
      if (t.content.includes("--")) {
        t.content = t.content.replace(/---/g, "—").replace(/--/g, "–");
      }
      // kramdown's smart_quotes also converts `<<` and `>>` to
      // left/right guillemets (« / »). markdown-it's typographer
      // doesn't, so do it here. Same `text`-token-only restriction
      // keeps code spans and code blocks untouched.
      if (t.content.includes("<<")) t.content = t.content.replace(/<<(?!=)/g, "«").replace(/<<=/g, "«=");
      if (t.content.includes(">>")) t.content = t.content.replace(/>>(?!=)/g, "»").replace(/>>=/g, "»=");
    });
  });

  // kramdown converts a straight ASCII `'` to a right-curly `’` whenever
  // it follows non-whitespace and precedes a word character -- so
  // `C/C++'s typedef` becomes `C/C++’s typedef`. markdown-it's
  // smartquotes rule is stricter (requires word-char on both sides), so
  // possessive apostrophes after punctuation stay straight. Run a
  // post-smartquotes sweep on text tokens to fix the gap.
  md.core.ruler.after("smartquotes", "kramdown-possessive", (state) => {
    walkTokens(state.tokens, (t) => {
      if (t.type !== "text") return;
      if (!t.content.includes("'")) return;
      t.content = t.content.replace(/(\S)'(?=\w)/g, "$1’");
    });
  });

  // Kramdown's smart_quotes parser operates on the raw source string,
  // so quotes adjacent to emphasis markers (`**"foo"**`) end up curled
  // via rules that markdown-it's typographer (which operates on parsed
  // text tokens, blind to siblings) can't reach. The result: Jekyll
  // renders `<strong>"foo"</strong>` while we emit `<strong>&quot;foo&quot;</strong>`.
  //
  // Translate kramdown's two relevant patterns into token-stream rules:
  //
  // * Text ending with `"` / `'` followed by strong_close or em_close
  //   (`**...X"**`). Source scanner is positioned at X (the char before
  //   the quote, in the same text); rule 6 `(SQ_CLOSE)(quote)` fires
  //   when X is in SQ_CLOSE = `[^ \\\t\r\n\[{(-]`, otherwise rule 9
  //   catchall renders it as the opening curly form. Mirror: rdquo /
  //   rsquo if X is a "closing-friendly" char, ldquo / lsquo otherwise.
  //
  // * Text starting with `"` / `'` preceded by strong_open or em_open
  //   (`**"X...**`). Source scanner is positioned at the quote (the
  //   `**` was already consumed). Rules in order:
  //     - rule 1 (rquote1, SQ_PUNCT lookahead) -> rdquo if next char
  //       in same text is one of [!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~].
  //     - rule 7 (rquote1, \s|s\b|$ lookahead) -> rdquo if next char
  //       is whitespace, `s` at word boundary, or end of content.
  //     - else falls through to rule 9 catchall -> ldquo.
  md.core.ruler.after("smartquotes", "kramdown-quote-near-emphasis", (state) => {
    walkInlineChildren(state.tokens, (children) => {
      for (let i = 0; i < children.length; i++) {
        const t = children[i];
        if (t.type !== "text" || !t.content) continue;
        const last = t.content[t.content.length - 1];
        if ((last === '"' || last === "'") && isEmphasisClose(children[i + 1])) {
          // Char before the quote, in the same text token.
          const charBefore = t.content.length >= 2 ? t.content[t.content.length - 2] : "";
          const closing = !SQ_CLOSE_EXCLUDED.has(charBefore) && charBefore !== "";
          if (closing) {
            t.content = t.content.slice(0, -1) + (last === '"' ? "”" : "’");
          } else {
            t.content = t.content.slice(0, -1) + (last === '"' ? "“" : "‘");
          }
        }
        const first = t.content[0];
        if ((first === '"' || first === "'") && isEmphasisOpen(children[i - 1])) {
          const charAfter = t.content.length >= 2 ? t.content[1] : "";
          let closing = false;
          if (charAfter === "") closing = true;                       // rule 7 EOL branch
          else if (SQ_PUNCT_RE.test(charAfter)) closing = true;        // rule 1
          else if (/\s/.test(charAfter)) closing = true;               // rule 7 \s branch
          if (closing) {
            t.content = (first === '"' ? "”" : "’") + t.content.slice(1);
          } else {
            t.content = (first === '"' ? "“" : "‘") + t.content.slice(1);
          }
        }
        // Text starting with a quote whose previous sibling is an
        // emphasis CLOSE (e.g. `*foo*'th` or `**foo**'s`). markdown-it
        // already curls this as `’` / `”` (closing). kramdown's
        // scanner at this position runs the same rule cascade as text
        // after emphasis_open above:
        //   - rule 1 (next char SQ_PUNCT)              -> closing
        //   - rule 7 EOL / `\s` / `s\b` lookahead      -> closing
        //   - else (word char follows, not `s\b`)      -> rule 9 -> opening
        // The `s\b` branch of rule 7 fires for the apostrophe-s
        // possessive (`*foo*'s`), keeping it closing. Other word
        // characters fall through to rule 9 and flip to opening.
        if ((first === "’" || first === "”") && isEmphasisClose(children[i - 1])) {
          const charAfter = t.content.length >= 2 ? t.content[1] : "";
          const charAfter2 = t.content.length >= 3 ? t.content[2] : "";
          let closing = false;
          if (charAfter === "") closing = true;
          else if (SQ_PUNCT_RE.test(charAfter)) closing = true;
          else if (/\s/.test(charAfter)) closing = true;
          else if (first === "’" && charAfter === "s" && !/\w/.test(charAfter2)) closing = true;
          if (!closing) {
            t.content = (first === "’" ? "‘" : "“") + t.content.slice(1);
          }
        }
      }
    });
  });
}

// kramdown's SQ_CLOSE = `[^ \\\t\r\n\[{(-]`: characters that, when they
// appear just before a quote, mark that quote as "closing" via rule 6.
// Encode the EXCLUDED set so a positive lookup gives us the inverse.
const SQ_CLOSE_EXCLUDED = new Set([" ", "\\", "\t", "\r", "\n", "[", "{", "(", "-"]);

// kramdown's SQ_PUNCT character class.
const SQ_PUNCT_RE = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;

// Any straight or curly quote character.
const QUOTE_ANY_RE = /["'“”‘’]/;

// Apply kramdown-style smart-quote conversion to a raw HTML body --
// used for content inside `<summary markdown=span>...</summary>` and
// similar inline elements where kramdown's HTML parser descends and
// applies inline conversions. Implements the same SQ_RULES cascade
// (rules 1, 6, 7, 9) on the raw text outside of nested tags:
//   - `<context-char>"`  -> rdquo   (rule 6: SQ_CLOSE before quote)
//   - `"<word-like>`     -> rdquo via rule 7 (s\b) or fall to ldquo
// Conservative scan -- only converts straight `'` / `"` that look like
// English text quotes; leaves HTML attribute quotes alone by skipping
// content inside `<...>` brackets.
function applyKramdownSmartQuotes(body) {
  if (!/['"]/.test(body)) return body;
  // Walk char-by-char, skipping anything between `<` and `>` (inline
  // tags) and any HTML entity. Track "previous visible char" so we can
  // decide whether each `'` / `"` is opening or closing.
  let out = "";
  let i = 0;
  let prev = ""; // last non-tag char emitted (or "" at start)
  while (i < body.length) {
    const ch = body[i];
    if (ch === "<") {
      const end = body.indexOf(">", i);
      if (end < 0) { out += body.slice(i); break; }
      out += body.slice(i, end + 1);
      i = end + 1;
      prev = ">";
      continue;
    }
    if (ch === "'" || ch === '"') {
      const next = body[i + 1] || "";
      const isDouble = ch === '"';
      // Rule 1 (kramdown SQ rule 126): quote followed by SQ_PUNCT -> rquote.
      // Rule 7 (rule 139): quote followed by whitespace / `s\b` / EOL -> rquote.
      // Rule 6 (rule 137): SQ_CLOSE before quote -> rquote.
      // Default fall-through: ldquo.
      const closingByPunct = SQ_PUNCT_RE.test(next);
      const closingByWS = /\s/.test(next) || next === "";
      const closingByS = !isDouble && next === "s" && !/\w/.test(body[i + 2] || "");
      const closingByPrev = prev !== "" && !SQ_CLOSE_EXCLUDED.has(prev);
      const closing = closingByPunct || closingByWS || closingByS || closingByPrev;
      out += closing ? (isDouble ? "”" : "’") : (isDouble ? "“" : "‘");
      prev = ch;
      i++;
      continue;
    }
    out += ch;
    prev = ch;
    i++;
  }
  return out;
}

function isEmphasisOpen(tok) {
  return tok && (tok.type === "strong_open" || tok.type === "em_open");
}
function isEmphasisClose(tok) {
  // Treat `code_inline` like an emphasis_close for smart-quote purposes:
  // kramdown's source-position scanner sees `\`...\`'word` the same as
  // `*...*'word` -- the backtick is consumed first, scanner lands AT
  // the quote, and the same rule cascade fires.
  return tok && (tok.type === "strong_close" || tok.type === "em_close" || tok.type === "code_inline");
}

// Walk inline-token children arrays so a visitor can examine adjacent
// siblings. The plain walkTokens helper recurses but only sees one token
// at a time -- this variant invokes the visitor once per inline token's
// children array (the level at which siblings live).
function walkInlineChildren(tokens, visit) {
  for (const t of tokens) {
    if (t.type === "inline" && Array.isArray(t.children)) {
      visit(t.children);
    }
  }
}

// ---------- standalone IAL forward attachment -------------------------------
//
// kramdown rule: a standalone block IAL (an IAL that takes up an entire
// paragraph) attaches to the FOLLOWING block, not the preceding one.
// markdown-it-attrs attaches them to the paragraph itself, leaving the
// paragraph's inline children empty. Detect that, move the attrs to the
// next block-level token, and splice out the now-empty paragraph triplet.

function standaloneIalForwardPlugin(md) {
  // kramdown's standalone-IAL attachment is direction-sensitive:
  //   - IAL adjacent to the previous block (no blank line between)
  //     attaches BACKWARD to that block.
  //   - IAL separated by a blank line attaches FORWARD to the next
  //     block.
  // markdown-it-attrs always parses the IAL as its own paragraph and
  // sets the attrs on it -- losing both behaviours. Detect the
  // standalone shape (paragraph whose inline content was entirely
  // consumed as attrs) and re-target the attrs onto the right
  // neighbour using token.map to look up the source-line gap.
  md.core.ruler.after("curly_attributes", "standalone-ial-attach", (state) => {
    const srcLines = state.src.split("\n");
    const toks = state.tokens;
    // Lines previously occupied by a now-removed standalone IAL --
    // counts as "non-blank" when checking adjacency for a following
    // IAL (so multiple consecutive IALs all attach to the same
    // preceding block, as kramdown does).
    const consumedLines = new Set();
    for (let i = 0; i < toks.length; i++) {
      const open = toks[i];
      if (open.type !== "paragraph_open") continue;
      if (!open.attrs || open.attrs.length === 0) continue;
      const inline = toks[i + 1];
      if (inline?.type !== "inline") continue;
      const hasVisibleContent = (inline.children || []).some(
        (c) => c.type !== "text" || c.content !== "",
      );
      if (hasVisibleContent) continue;
      const close = toks[i + 2];
      if (close?.type !== "paragraph_close") continue;

      const prev = toks[i - 1];
      const next = toks[i + 3];

      let target = null;
      if (prev && isHeadingOrParagraphClose(prev)) {
        const prevOpen = findBlockOpenFor(toks, i - 1);
        if (prevOpen && ialAdjacentToPrev(prevOpen, open, consumedLines)) {
          target = prevOpen;
        }
      }
      if (!target && next) target = next;

      if (!target) continue;
      // markdown-it-attrs collapses consecutive standalone IALs into the
      // attrs of the first paragraph but emits them in REVERSE source
      // order. Detect the multi-line IAL paragraph (map spans 2+ lines)
      // and reverse to match kramdown's source-order output.
      const attrsList = open.map && open.map[1] - open.map[0] > 1
        ? [...open.attrs].reverse()
        : open.attrs;
      mergeAttrs(target, attrsList);
      // Record the IAL's source line range so a following IAL one
      // line away still counts as adjacent to the heading.
      if (open.map) {
        for (let ln = open.map[0]; ln < open.map[1]; ln++) consumedLines.add(ln);
      }
      toks.splice(i, 3);
      i--;
    }
  });
}

// True when the IAL paragraph's first source line is the line right
// after the previous block's last source line (no blank line gap).
// Consumed lines (occupied by removed earlier IALs) count as belonging
// to the previous block so that consecutive `{: ... }` IALs all attach
// to the same heading.
function ialAdjacentToPrev(prevOpen, ialOpen, consumedLines) {
  if (!prevOpen.map || !ialOpen.map) return false;
  let line = prevOpen.map[1];
  while (line < ialOpen.map[0]) {
    if (!consumedLines.has(line)) return false;
    line++;
  }
  return true;
}

function isHeadingOrParagraphClose(t) {
  return t.type === "heading_close" || t.type === "paragraph_close";
}

// Walk back from a close token to its matching open token at the same
// nesting level. Tag matches (h1 close -> h1 open, p close -> p open).
function findBlockOpenFor(toks, closeIdx) {
  const close = toks[closeIdx];
  const openType = close.type.replace("_close", "_open");
  let depth = 0;
  for (let k = closeIdx; k >= 0; k--) {
    const t = toks[k];
    if (t.type === close.type && t.tag === close.tag) depth++;
    else if (t.type === openType && t.tag === close.tag) {
      depth--;
      if (depth === 0) return t;
    }
  }
  return null;
}

// ---------- loose-deflist <p> rewrap ----------------------------------------
//
// markdown-it-deflist emits paragraph_open / paragraph_close around every
// <dd> body but marks them `hidden=true` when the list parses as "tight".
// kramdown's rule is per-item: a definition that's separated from its
// term by a blank line wraps in <p>. Detect that gap by comparing the dt
// term's end line to the inner paragraph_open's start line and unhide
// the wrapper pair when the gap is >1.

// ---------- list-item paragraph unwrap (kramdown tightness) -----------------
//
// markdown-it determines tightness at the LIST level: any blank line
// between top-level items makes the entire list loose, which adds
// `<p>...</p>` around every item's inline content. kramdown's rule is
// per-item: an item gets `<p>` wrap only when it actually contains
// multiple paragraph blocks (e.g. inline + blank + more inline). An
// item that's just "inline + nested list" stays unwrapped.
//
// We post-process after block parsing: for each list_item_open, count
// the top-level paragraph_open tokens. If there's exactly one (the
// initial inline content), hide its paragraph_open / paragraph_close
// to match kramdown's tight emit.

function tightLooseListPlugin(md) {
  md.core.ruler.after("block", "tight-loose-list", (state) => {
    const srcLines = state.src.split("\n");
    const toks = state.tokens;
    // Records per-item tightness decisions so the post-pass can apply
    // kramdown's "last item is loose unless an earlier sibling is
    // tight" rule (see kramdown/parser/kramdown/list.rb#132-139).
    // Keyed by list_item_open token index; value = { wouldBeTight,
    // listListOpenIdx, paraOpenIdx, paraCloseIdx }.
    const decisions = new Map();
    // Map of list_open index -> array of contained item indices.
    const listItems = new Map();

    for (let i = 0; i < toks.length; i++) {
      if (toks[i].type !== "list_item_open") continue;
      const itemLevel = toks[i].level;
      const itemMap = toks[i].map;
      let firstParaOpenIdx = -1;
      let extraParagraphs = false;
      let nextBlockAfterParaMap = null;
      let close = -1;
      for (let j = i + 1; j < toks.length; j++) {
        const t = toks[j];
        if (t.level === itemLevel && t.type === "list_item_close") { close = j; break; }
        if (t.type === "paragraph_open" && t.level === itemLevel + 1) {
          if (firstParaOpenIdx < 0) firstParaOpenIdx = j;
          else extraParagraphs = true;
        }
        // First level-+1 block AFTER the first paragraph (nested list,
        // code block, etc.). Captures the start line so we can tell
        // whether the paragraph and that block are blank-separated.
        if (firstParaOpenIdx >= 0 && nextBlockAfterParaMap === null &&
            t.level === itemLevel + 1 &&
            j > firstParaOpenIdx &&
            t.type !== "inline" && t.type !== "paragraph_close" &&
            t.type !== "paragraph_open") {
          nextBlockAfterParaMap = t.map;
        }
      }
      if (close < 0 || firstParaOpenIdx < 0 || extraParagraphs) continue;
      const pOpen = toks[firstParaOpenIdx];
      const hasNested = nextBlockAfterParaMap !== null;
      const internalBlank = paragraphHasTrailingBlank(srcLines, pOpen.map, nextBlockAfterParaMap);
      const siblingBlank = !hasNested && hasSiblingBlank(srcLines, toks, i, close, itemMap);
      // Find the enclosing list_open by walking back to a token of
      // level itemLevel - 1 with type list_open / bullet_list_open /
      // ordered_list_open.
      let listOpenIdx = -1;
      for (let k = i - 1; k >= 0; k--) {
        const t = toks[k];
        if (t.level === itemLevel - 1 &&
            (t.type === "bullet_list_open" || t.type === "ordered_list_open")) {
          listOpenIdx = k;
          break;
        }
      }
      if (!listItems.has(listOpenIdx)) listItems.set(listOpenIdx, []);
      listItems.get(listOpenIdx).push(i);
      // Find this item's paragraph_close.
      let paraCloseIdx = -1;
      for (let j = firstParaOpenIdx + 1; j < close; j++) {
        if (toks[j].type === "paragraph_close" && toks[j].level === pOpen.level) {
          paraCloseIdx = j;
          break;
        }
      }
      const wouldBeTight = !internalBlank && !siblingBlank && paraCloseIdx >= 0;
      decisions.set(i, { wouldBeTight, paraOpenIdx: firstParaOpenIdx, paraCloseIdx, listOpenIdx });
    }

    // Apply kramdown's last-item rule: if the LAST item in a list would
    // be tight, but NO earlier item is tight, leave it loose. This
    // matches the condition 3 third sub-branch in kramdown's source:
    // tight only if some earlier sibling has already been marked
    // transparent (or has a non-paragraph first child).
    for (const [, items] of listItems) {
      if (items.length < 2) continue;
      const lastIdx = items[items.length - 1];
      const lastDecision = decisions.get(lastIdx);
      if (!lastDecision || !lastDecision.wouldBeTight) continue;
      let anyEarlierTight = false;
      for (let k = 0; k < items.length - 1; k++) {
        const d = decisions.get(items[k]);
        if (d && d.wouldBeTight) { anyEarlierTight = true; break; }
      }
      if (!anyEarlierTight) {
        lastDecision.wouldBeTight = false;
      }
    }

    // Apply decisions: hide the paragraph open/close for tight items.
    for (const d of decisions.values()) {
      if (d.wouldBeTight) {
        toks[d.paraOpenIdx].hidden = true;
        toks[d.paraCloseIdx].hidden = true;
      }
    }
  });
}

function paragraphHasTrailingBlank(srcLines, paraMap, nextBlockMap) {
  // Returns true only when there's a following block within the item
  // AND a blank line separates the paragraph from it. The trailing
  // blank line that just marks the item's end (no following sibling
  // block inside the item) is the LIST's separator, not internal.
  if (!paraMap || !nextBlockMap) return false;
  if (nextBlockMap[0] <= paraMap[1]) return false;
  return (srcLines[paraMap[1]] ?? "").trim() === "";
}

function hasSiblingBlank(srcLines, toks, openIdx, closeIdx, itemMap) {
  if (!itemMap) return false;
  const lastIdx = itemMap[1] - 1;
  if (lastIdx >= itemMap[0] && (srcLines[lastIdx] ?? "").trim() === "" &&
      toks[closeIdx + 1]?.type === "list_item_open") {
    return true;
  }
  const prevClose = toks[openIdx - 1];
  if (prevClose?.type === "list_item_close" && prevClose.level === toks[openIdx].level) {
    let depth = 0;
    for (let k = openIdx - 1; k >= 0; k--) {
      const t = toks[k];
      if (t.type === "list_item_close" && t.level === toks[openIdx].level) depth++;
      else if (t.type === "list_item_open" && t.level === toks[openIdx].level) {
        depth--;
        if (depth === 0) {
          const prevMap = t.map;
          if (prevMap) {
            const prevLast = prevMap[1] - 1;
            if (prevLast >= prevMap[0] && (srcLines[prevLast] ?? "").trim() === "") {
              return true;
            }
          }
          break;
        }
      }
    }
  }
  return false;
}

function looseDeflistPlugin(md) {
  // Per-dd looseness, equivalent to the per-item rule we apply on
  // bullet/ordered lists:
  //   - The first <p> inside a <dd> is wrapped IFF the source has a
  //     blank line between the term and the definition (loose form).
  //   - Otherwise the <p> is suppressed.
  // markdown-it-deflist tracks looseness at the LIST level, so any
  // multi-block <dd> in the list flips every other <dd>'s paragraph
  // to visible. Override both directions: hide when tight, unhide
  // when loose.
  md.core.ruler.after("block", "deflist-tightness", (state) => {
    const srcLines = state.src.split("\n");
    const toks = state.tokens;
    let dtEndLine = -1;
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (t.type === "dt_open") {
        dtEndLine = -1;
      } else if (t.type === "dt_close") {
        const inline = toks[i - 1];
        dtEndLine = inline?.map?.[1] ?? -1;
      } else if (t.type === "dd_open") {
        const inner = toks[i + 1];
        if (inner?.type !== "paragraph_open") continue;
        const ddLevel = t.level;
        let ddClose = -1;
        let nextBlockAfterParaMap = null;
        for (let j = i + 1; j < toks.length; j++) {
          const u = toks[j];
          if (u.level === ddLevel && u.type === "dd_close") { ddClose = j; break; }
          if (j > i + 1 && u.level === ddLevel + 1 &&
              u.type !== "paragraph_close" && u.type !== "inline" &&
              u.type !== "paragraph_open" && nextBlockAfterParaMap === null) {
            nextBlockAfterParaMap = u.map;
          }
        }
        if (ddClose < 0) continue;
        // kramdown's deflist looseness, observed empirically: ONLY the
        // dt -> dd blank line counts. An internal blank between the
        // definition's first paragraph and a nested list inside the
        // same dd does NOT make the dd loose (unlike bullet/ordered
        // list items, where it does). Keep the rule narrow.
        const wantsLoose = dtEndLine >= 0 && inner.map && inner.map[0] > dtEndLine + 1;
        if (inner.hidden === !wantsLoose) continue;
        inner.hidden = !wantsLoose;
        for (let j = i + 2; j < ddClose; j++) {
          if (toks[j].type === "paragraph_close" && toks[j].level === inner.level) {
            toks[j].hidden = inner.hidden;
            break;
          }
        }
      }
    }
  });
}

function mergeAttrs(token, addAttrs) {
  for (const [key, value] of addAttrs) {
    if (key === "class") {
      const cur = token.attrGet("class");
      token.attrSet("class", cur ? `${cur} ${value}` : value);
    } else {
      token.attrSet(key, value);
    }
  }
}

// ---------- §5.5 footnote rendering overrides -------------------------------
//
// markdown-it-footnote emits `fnref-N` (hyphen) + `footnote-backref` /
// `<section class="footnotes">` shapes. kramdown emits `fnref:N` (colon) +
// `reversefootnote` / `<div class="footnotes">`. Five render-rule
// overrides line up with the kramdown shapes verified against
// docs/_site/Features/index.html.

function configureFootnotes(md) {
  md.renderer.rules.footnote_ref = (tokens, idx) => {
    const id = tokens[idx].meta.id;
    const n = id + 1;
    return `<sup id="fnref:${n}"><a href="#fn:${n}" class="footnote" rel="footnote" role="doc-noteref">${n}</a></sup>`;
  };

  md.renderer.rules.footnote_anchor = (tokens, idx) => {
    const id = tokens[idx].meta.id;
    const n = id + 1;
    // Leading U+00A0 (nbsp) matches kramdown's footnote_anchor output --
    // kramdown emits a nbsp before the backref so the arrow doesn't
    // line-wrap away from the footnote text.
    return ` <a href="#fnref:${n}" class="reversefootnote" role="doc-backlink">&#8617;</a>`;
  };

  md.renderer.rules.footnote_open = (tokens, idx) => {
    const id = tokens[idx].meta.id;
    const n = id + 1;
    return `<li id="fn:${n}">\n`;
  };

  md.renderer.rules.footnote_block_open = () =>
    `<div class="footnotes" role="doc-endnotes">\n<ol>\n`;

  md.renderer.rules.footnote_block_close = () => `</ol>\n</div>\n`;
}

// ---------- §5.6 header-id plugin -------------------------------------------
//
// Auto-assign kramdown-style id="..." on every heading that doesn't carry
// an explicit `{: #foo }`. Slug algorithm: lowercase, runs of non-alnum
// collapse to `-`, strip leading/trailing `-`, "section" fallback for
// empty, suffix duplicates with `-1`, `-2`, ...

function headerIdPlugin(md) {
  md.core.ruler.push("header-id", (state) => {
    const used = new Map();
    let openHeading = null;
    for (const t of state.tokens) {
      if (t.type === "heading_open") {
        openHeading = t;
      } else if (t.type === "heading_close") {
        openHeading = null;
      } else if (openHeading && t.type === "inline") {
        if (openHeading.attrGet("id")) continue;
        const text = headingText(t.children);
        const base = kramdownSlug(text);
        openHeading.attrSet("id", uniqueSlug(base, used));
      }
    }
  });
}

function headingText(children) {
  // Concatenate the visible text content from inline tokens. Skip markup
  // wrappers (em, strong, link openers) and pick up text + code spans --
  // matches kramdown's `output_text(heading)`.
  let out = "";
  for (const c of children) {
    if (c.type === "text" || c.type === "code_inline") out += c.content;
  }
  return out;
}

// kramdown-parser-gfm's generate_gfm_header_id algorithm:
//   1. lowercase
//   2. drop every char that's NOT a Unicode word char (\p{L} / \p{N} /
//      \p{M} / \p{Pc}), a hyphen, or a space
//   3. replace each space with `-`
// Notably this does NOT collapse runs of `-` and does NOT strip
// leading/trailing `-`. Emoji and punctuation drop out; the surrounding
// spaces still become hyphens, which is why headings like "🎮 X" emit
// id="-x" (leading dash).
export function kramdownSlug(text) {
  const lower = text.toLowerCase();
  const filtered = [...lower].filter((c) => GFM_HEADER_CHAR_RE.test(c)).join("");
  return filtered.replaceAll(" ", "-") || "section";
}

const GFM_HEADER_CHAR_RE = /[\p{L}\p{N}\p{M}\p{Pc}\- ]/u;

function uniqueSlug(base, used) {
  const count = used.get(base) ?? 0;
  used.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}

// ---------- §5.8 TOC plugin -------------------------------------------------
//
// Kramdown's `* TOC\n{:toc}` pattern. Scans for the marker bullet-list,
// collects every h2..h6 heading_open after it, emits a nested <ul
// id="markdown-toc"> with one item per heading. markdown-it-attrs sees
// `{:toc}` first and stores `toc` on the next paragraph's token; we
// detect that flag.

function tocPlugin(md) {
  md.core.ruler.after("header-id", "toc", (state) => {
    const toks = state.tokens;
    // Collect all qualifying headings up front; kramdown's TOC includes
    // every page heading regardless of position relative to the
    // `{:toc}` marker.
    const headings = collectHeadings(toks, 0);
    for (let i = 0; i < toks.length; i++) {
      const markerEnd = matchTocMarker(toks, i);
      if (markerEnd < 0) continue;
      const html = renderTocList(headings);
      const tocTok = new state.Token("html_block", "", 0);
      tocTok.content = html;
      toks.splice(i, markerEnd - i, tocTok);
    }
  });
}

// A TOC marker is the kramdown `* TOC\n{:toc}` pattern: a single-item
// bullet list whose item is "TOC", followed by a `{:toc}` IAL that
// markdown-it-attrs has applied as an attribute on the bullet list.
// We treat any bullet_list_open with a `toc` attribute as the marker.
// The standaloneIalForwardPlugin would otherwise move the `{:toc}` to
// the FOLLOWING block; we run before it (`after("curly_attributes")`).
function matchTocMarker(toks, i) {
  const open = toks[i];
  if (open?.type !== "bullet_list_open") return -1;
  if (!open.attrs) return -1;
  if (!open.attrs.some(([k]) => k === "toc")) return -1;

  // The TOC marker consists of bullet_list_open, list_item_open,
  // paragraph_open, inline ("TOC"), paragraph_close, list_item_close,
  // bullet_list_close -- seven tokens total.
  if (toks[i + 1]?.type !== "list_item_open") return -1;
  if (toks[i + 6]?.type !== "bullet_list_close") return -1;
  return i + 7;
}

function collectHeadings(toks, from) {
  const out = [];
  for (let i = from; i < toks.length; i++) {
    const t = toks[i];
    if (t.type !== "heading_open") continue;
    const level = Number(t.tag.slice(1));
    if (level < 2 || level > 6) continue;
    const inline = toks[i + 1];
    if (inline?.type !== "inline") continue;
    const id = t.attrGet("id");
    if (!id) continue;
    // kramdown's TOC builder filters headings whose IAL set `no_toc` on
    // them. Match that.
    const cls = t.attrGet("class") ?? "";
    if (cls.split(/\s+/).includes("no_toc")) continue;
    out.push({ level, id, html: headingTocHtml(inline.children) });
  }
  return out;
}

// kramdown's TOC keeps inline `<code>` (and other inline markup) inside
// each `<li>` link's text. Mirror that by rendering a minimal subset of
// inline tokens to HTML: text, code spans, and emphasis/strong wrappers.
// Other tokens (links, images, html_inline) fall back to their visible
// text content -- kramdown drops them too.
function headingTocHtml(children) {
  let out = "";
  for (const c of children) {
    if (c.type === "text") out += escapeHtml(c.content);
    else if (c.type === "code_inline") {
      out += `<code class="language-plaintext highlighter-rouge">${escapeHtmlMinimal(c.content)}</code>`;
    } else if (c.type === "strong_open") out += "<strong>";
    else if (c.type === "strong_close") out += "</strong>";
    else if (c.type === "em_open") out += "<em>";
    else if (c.type === "em_close") out += "</em>";
    else if (c.type === "softbreak" || c.type === "hardbreak") out += " ";
  }
  return out;
}

function renderTocList(headings) {
  if (headings.length === 0) return `<ul id="markdown-toc"></ul>`;
  // Build a tree of TocNode from the flat heading list, then render with
  // kramdown's indentation: each <li> on its own line, leaf items
  // collapsed to one line, parent items split open-tag, nested <ul>,
  // close-tag across three lines.
  const root = { children: [] };
  const stack = [{ level: 1, node: root }];
  for (const h of headings) {
    while (stack.length > 1 && stack[stack.length - 1].level >= h.level) {
      stack.pop();
    }
    const node = { ...h, children: [] };
    stack[stack.length - 1].node.children.push(node);
    stack.push({ level: h.level, node });
  }
  const out = [`<ul id="markdown-toc">`];
  renderTocItems(root.children, "  ", out);
  out.push(`\n</ul>\n`);
  return out.join("");
}

function renderTocItems(items, indent, out) {
  for (const item of items) {
    const link = `<a href="#${item.id}" id="markdown-toc-${item.id}">${item.html}</a>`;
    if (item.children.length === 0) {
      out.push(`\n${indent}<li>${link}</li>`);
    } else {
      out.push(`\n${indent}<li>${link} <ul>`);
      renderTocItems(item.children, indent + "  ", out);
      out.push(`\n${indent}</ul>\n${indent}</li>`);
    }
  }
}

// ---------- §5.3 relative-links plugin --------------------------------------

export function buildLinkTables(pages) {
  const byPath = new Map();
  const byUrl = new Map();
  const byRedirect = new Map();

  for (const p of pages) {
    putOnce(byPath, p.srcRel, p);

    const url = p.permalink.replace(/^\//, "");
    if (url !== "") {
      putOnce(byUrl, url, p);
      if (url.endsWith("/")) putOnce(byUrl, url.replace(/\/$/, ""), p);
    }

    const redirects = [].concat(p.frontmatter.redirect_from ?? []);
    for (const r of redirects) {
      const key = String(r).replace(/^\//, "").replace(/\/$/, "");
      if (key) putOnce(byRedirect, key, p);
    }
  }

  return { byPath, byUrl, byRedirect };
}

// Serialize linkTables for cross-thread transfer. resolveLink() only reads
// .permalink from each page, so shipping [key, permalink] pairs is sufficient.
// Workers reconstruct minimal { permalink } stubs via reconstructLinkTables.
export function serializeLinkTables(lt) {
  const pairs = (m) => [...m.entries()].map(([k, p]) => [k, p.permalink]);
  return { byPath: pairs(lt.byPath), byUrl: pairs(lt.byUrl), byRedirect: pairs(lt.byRedirect) };
}

function putOnce(map, key, value) {
  if (!map.has(key)) map.set(key, value);
}

function resolveLink(href, tables, baseurl) {
  let path;
  try {
    path = decodeURIComponent(href);
  } catch {
    path = href;
  }
  const trimmed = path.replace(/\/$/, "");
  const target = tables.byPath.get(path)
              ?? tables.byUrl.get(trimmed)
              ?? tables.byRedirect.get(trimmed);
  return target ? `${baseurl}${target.permalink}` : null;
}

function relativeLinksPlugin(md, ctx) {
  md.core.ruler.push("relative-links", (state) => {
    const fromPage = state.env?.page;
    if (!fromPage) return;
    walkTokens(state.tokens, (token) => {
      let attrName;
      if (token.type === "link_open") attrName = "href";
      else if (token.type === "image") attrName = "src";
      else return;

      const idx = token.attrIndex(attrName);
      if (idx < 0) return;
      const value = token.attrs[idx][1];
      if (/^([a-z][a-z0-9+.\-]*:|#|\/\/)/i.test(value)) return;

      const [pathPart, fragPart] = splitFragment(value);
      let resolved;
      if (value.startsWith("/")) {
        // Root-absolute (`/tB/Packages/VB/Label`). jekyll-relative-links
        // still resolves these against the page tables, picking up the
        // canonical permalink form (with trailing slash for folder-
        // style index pages). Strip leading slash and look up directly.
        resolved = pathPart.replace(/^\//, "");
      } else {
        const fromDir = fromPage.srcRel.replace(/[^/]+$/, "");
        resolved = resolveBelowRoot(fromDir, pathPart);
        if (resolved === null) return;
      }
      const newValue = resolveAsset(resolved, ctx) ?? resolveLink(resolved, ctx.linkTables, ctx.baseurl);
      if (newValue) {
        token.attrs[idx][1] = fragPart ? `${newValue}#${fragPart}` : newValue;
      }
    });
  });
}

// Static assets aren't in the page-permalink tables; resolve them as
// root-absolute paths so <img src="Images/x.svg"> becomes
// <img src="/Tutorials/CEF/Images/x.svg"> the way jekyll-relative-links
// rewrites them.
function resolveAsset(resolved, ctx) {
  if (!ctx.staticFiles) return null;
  // The relative-link plugin may receive a URL-encoded `resolved` (e.g.
  // when encodeSpacesInMediaUrls() rewrote `path with space` to
  // `path%20with%20space`). The staticFiles set keys on the unencoded
  // POSIX path Phase 1 stashed; decode before lookup.
  let key = resolved;
  try { key = decodeURIComponent(resolved); } catch {}
  if (ctx.staticFiles.has(key)) {
    return `${ctx.baseurl}/${resolved}`;
  }
  return null;
}

function splitFragment(href) {
  const i = href.indexOf("#");
  if (i < 0) return [href, null];
  return [href.slice(0, i), href.slice(i + 1)];
}

function normalizePosixPath(p) {
  const parts = p.split("/");
  const out = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") { out.pop(); continue; }
    out.push(part);
  }
  return out.join("/");
}

// Mirrors jekyll-relative-links's File.expand_path-based resolution: a
// link whose `..` segments would escape the docs/ root (the Jekyll
// source directory) is left unrewritten by the upstream gem because the
// computed absolute path falls outside Dir.pwd. Return null for those
// to match that behaviour.
function resolveBelowRoot(fromDir, pathPart) {
  const parts = (fromDir + pathPart).split("/");
  const out = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (out.length === 0) return null;
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join("/");
}

function walkTokens(tokens, fn) {
  for (const t of tokens) {
    fn(t);
    if (t.children) walkTokens(t.children, fn);
  }
}

// ---------- §5.2 GFM admonitions (pre-render text rewrite) ------------------
//
// Octicon SVG strings ported from the Ruby Octicons gem (v19.21.2) --
// the same source jekyll-gfm-admonitions calls into via
// `Octicons::Octicon.new(name).to_svg`. Two cosmetic differences from
// the gem's raw output are needed for byte parity with Jekyll's final
// HTML:
//
//   1. The gem emits `<path d="..."/>` (self-closing). Kramdown's HTML
//      parser normalises self-closing tags on non-void elements to
//      `<tag>...</tag>` -- so the path lands in the rendered HTML as
//      `<path d="..."></path>`. We pre-write the explicit-close form.
//   2. Attribute order: class, viewBox, version, width, height,
//      aria-hidden -- the order the gem's `to_svg` walks `@options`.

const ICON_INFO = '<svg class="octicon octicon-info" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg>';
const ICON_LIGHT_BULB = '<svg class="octicon octicon-light-bulb" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"></path></svg>';
const ICON_REPORT = '<svg class="octicon octicon-report" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path></svg>';
const ICON_ALERT = '<svg class="octicon octicon-alert" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path></svg>';
const ICON_STOP = '<svg class="octicon octicon-stop" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg>';

const ADMONITION_TYPES = {
  note:      { title: "Note",      icon: ICON_INFO },
  tip:       { title: "Tip",       icon: ICON_LIGHT_BULB },
  important: { title: "Important", icon: ICON_REPORT },
  warning:   { title: "Warning",   icon: ICON_ALERT },
  caution:   { title: "Caution",   icon: ICON_STOP },
};

// Matches an admonition fence with optional leading indent. Indented
// admonitions inside a list item or blockquote share the parent's
// indentation; the gem's regex captures that into \1 and uses it as a
// per-line anchor on the body lines.
const ADMONITION_RE = /(^|\n)([ \t]*)>[ \t]*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][^\n]*\n((?:\2[ \t]*>[ \t]*[^\n]*(?:\n|$))(?:(?![ \t]*>[ \t]*\[!)\2[ \t]*>[ \t]*[^\n]*(?:\n|$))*)?/g;
const CODE_FENCE_RE = /(?:^|\n)(?<!>)[ \t]*```[\s\S]*?```/g;

export function rewriteAdmonitions(src) {
  // CommonMark's normalisation pass converts CRLF/CR to LF before block
  // parsing. We do it up-front so our regexes operate on LF-only input.
  src = src.replace(/\r\n?/g, "\n");

  const stashed = [];
  let work = src.replace(CODE_FENCE_RE, (match) => {
    // Preserve any leading whitespace so the placeholder lands in the
    // same column the fence did -- prevents the placeholder from being
    // appended to a preceding line and pulled into an admonition body
    // capture. Mirrors the patched gem's process_doc behaviour.
    stashed.push(match);
    const lead = match.match(/^[ \t\n]+/)?.[0] ?? "";
    const body = match.slice(lead.length);
    return `${lead}\`\`\`{{CODE_BLOCK_${stashed.length - 1}}}\`\`\``;
  });

  work = work.replace(ADMONITION_RE, (m, leading, indent, typeRaw, bodyRaw) => {
    const type = typeRaw.toLowerCase();
    const meta = ADMONITION_TYPES[type];
    // The body lines all share the same leading indent; strip it plus
    // the `>` marker. Matches the gem's `gsub(/^#{indent}\s*>\s*/, "")`.
    const stripRe = indent
      ? new RegExp(`^${escapeRegExp(indent)}\\s*>\\s*`, "gm")
      : /^\s*>\s*/gm;
    const body = (bodyRaw ?? "").replace(stripRe, "").trimEnd();

    // The gem emits the replacement <div> at column 0 regardless of how
    // far the source admonition was indented -- so an admonition inside
    // a list item BREAKS the list (the HTML block at column 0 closes
    // any open list/blockquote context). Mirror that. Body wrapped in
    // blank lines so the inner kramdown-style block descent (via
    // blockHtmlRecursionPlugin) parses it as an independent block.
    // The trailing blank line ensures any following text is parsed as
    // a separate markdown block rather than absorbed into the html_block.
    return `${leading}<div class="markdown-alert markdown-alert-${type}" markdown="1">\n<p class="markdown-alert-title">${meta.icon} ${meta.title}</p>\n\n${body}\n</div>\n\n`;
  });

  return work.replace(/```\{\{CODE_BLOCK_(\d+)\}\}```/g, (_, n) => stashed[Number(n)]);
}

// ---------- markdown="1" attribute strip -----------------------------------
//
// With `html: true`, markdown-it already parses blank-line-separated
// content inside HTML wrappers as markdown -- which is what kramdown
// does when the wrapper has `markdown="1"`. Our admonition rewrite
// produces wrappers that are always blank-line-separated from their
// body, so no explicit recursive re-parse is required. All we need to
// do is strip the `markdown="1"` attribute kramdown would strip itself
// once it had recursed.

function blockHtmlRecursionPlugin(md) {
  md.core.ruler.push("strip-markdown-attr", (state) => {
    for (const t of state.tokens) {
      if (t.type !== "html_block") continue;
      // kramdown treats `markdown=X` (X in {1, span, block}) as a
      // parser directive on the enclosing element and strips the
      // attribute from output. Match the same three forms with
      // optional quoting.
      //
      // For `markdown=span` specifically, kramdown also descends INTO
      // the element's body and applies inline-level conversions
      // (smart-quotes, dashes). Mirror by running a smart-quote pass
      // over the body BEFORE we strip the attribute.
      t.content = t.content.replace(
        /(<([a-zA-Z][\w-]*)\b[^>]*?)\s+markdown=(?:"span"|'span'|span)([^>]*>)([\s\S]*?)(<\/\2\s*>)/g,
        (_, openHead, _tag, openTail, body, closing) => {
          return `${openHead}${openTail}${applyKramdownSmartQuotes(body)}${closing}`;
        },
      );
      t.content = t.content.replace(
        /\s+markdown=(?:"(?:1|span|block)"|'(?:1|span|block)'|(?:1|span|block))(?=[\s/>])/g,
        "",
      );
    }
  });

  // Detect fences that live between admonition-opening and -closing
  // html_blocks. markdown-it splits those out as level-0 siblings
  // (blank lines around the fence break the html_block), but kramdown
  // treats them as nested-inside-the-div blocks and adds the same
  // inter-`</div>` newline it adds for list-item-nested fences.
  // Tag those fences with a meta flag so the fence renderer can mirror.
  md.core.ruler.push("tag-admonition-fences", (state) => {
    const toks = state.tokens;
    let inAdmonition = false;
    for (const t of toks) {
      if (t.type === "html_block") {
        if (/<div\s+class="markdown-alert/.test(t.content)) inAdmonition = true;
        else if (/^<\/div>/.test(t.content.trim())) inAdmonition = false;
      } else if (t.type === "fence" && inAdmonition) {
        t.meta = { ...(t.meta || {}), nestedInBlock: true };
      }
    }
  });

  // kramdown wraps a standalone inline HTML element (e.g. <br />,
  // <img ...>) in a <p> -- which markdown-it doesn't, because it
  // detects them as block HTML and passes them through verbatim.
  // Detect that shape (an html_block whose entire content is an inline
  // tag), and wrap its content in <p>...</p>.
  md.core.ruler.push("wrap-standalone-inline-html", (state) => {
    for (const t of state.tokens) {
      if (t.type !== "html_block") continue;
      const trimmed = t.content.trim();
      if (STANDALONE_INLINE_HTML_RE.test(trimmed)) {
        t.content = `<p>${trimmed}</p>\n`;
      }
    }
  });

  // kramdown parses raw HTML and re-emits it through a normaliser that
  // (a) expands bareword attributes to `attr=""` form (parser at
  // kramdown/parser/html.rb#parse_html_attributes maps missing values
  // to ""; converter at kramdown/utils/html.rb#html_attributes emits
  // ` attr="value"`), and (b) for HTML elements whose body is empty or
  // whitespace-only, emits `<tag></tag>` with no inner whitespace
  // (converter at kramdown/converter/html.rb#convert_html_element).
  // markdown-it instead passes block HTML through verbatim, so the
  // bareword attrs and inter-tag whitespace survive. Apply the same
  // normalisation here so HTML5-bare `<iframe ... allowfullscreen>\n
  // </iframe>` renders the same as kramdown's parsed form.
  md.core.ruler.push("normalise-block-html", (state) => {
    for (const t of state.tokens) {
      if (t.type !== "html_block") continue;
      t.content = normaliseBlockHtml(t.content);
    }
  });
}

// Subset of HTML5 boolean attributes that appear in the corpus. Keep this
// list small -- bareword expansion is a syntactic kramdown quirk, not a
// validation step, and over-broad matching would rewrite arbitrary
// author-written HTML.
const HTML_BOOL_ATTRS = new Set([
  "allowfullscreen", "async", "autofocus", "autoplay", "checked",
  "controls", "default", "defer", "disabled", "formnovalidate", "hidden",
  "inert", "ismap", "itemscope", "loop", "multiple", "muted", "nomodule",
  "novalidate", "open", "playsinline", "readonly", "required", "reversed",
  "selected",
]);

// Match a start tag: `<tag attrs...>`. Captures tag name and the full
// attribute span (between tag name and the closing `>`).
const START_TAG_RE = /<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^>]*)?)>/g;

// Match a single attribute inside the attribute span. Order: name,
// optional `=value` (with quoted or unquoted value).
const ATTR_RE = /([a-zA-Z_][a-zA-Z0-9_:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

function expandBoolAttrs(attrSpan) {
  return attrSpan.replace(ATTR_RE, (whole, name, dq, sq, uq) => {
    if (dq !== undefined || sq !== undefined || uq !== undefined) return whole;
    if (HTML_BOOL_ATTRS.has(name.toLowerCase())) return `${name}=""`;
    return whole;
  });
}

// HTML elements whose whitespace-only body kramdown collapses to
// `<tag></tag>` with no inner whitespace or newline. Drawn from
// kramdown's HTML_CONTENT_MODEL_BLOCK list (most relevant: iframe,
// details, summary, video, audio).
const WS_COLLAPSE_TAGS_RE = /<(iframe|details|summary|video|audio|object|figure|figcaption|aside|section|nav|header|footer|article|main|form|fieldset)(\s[^>]*)?>\s+<\/\1>/gi;

function normaliseBlockHtml(content) {
  let out = content.replace(START_TAG_RE, (whole, tag, attrSpan) => {
    if (!attrSpan) return whole;
    const expanded = expandBoolAttrs(attrSpan);
    return `<${tag}${expanded}>`;
  });
  out = out.replace(WS_COLLAPSE_TAGS_RE, (_, tag, attrs) => `<${tag}${attrs || ""}></${tag}>`);
  return out;
}

// Match an html_block whose content is one or more self-closing inline
// tags (separated by whitespace): <br>, <br/>, <br />, <hr ...>,
// <img ...>. kramdown wraps any such sequence in a single <p>.
const STANDALONE_INLINE_HTML_RE = /^(?:<(br|hr|img)\b[^>]*\/?>\s*)+$/i;

// ---------- helpers ---------------------------------------------------------

const HTML_ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPE[c]);
}

const HTML_ESCAPE_MIN = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };
function escapeHtmlMinimal(s) {
  return s.replace(/[&<>]/g, (c) => HTML_ESCAPE_MIN[c]);
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
