// Phase 4 HTML whitespace compression. Port of _plugins/html-compress.rb.
//
// One pass over the fully-assembled page document, splitting on code
// elements. Their bodies are preserved verbatim; everything outside
// collapses every run of whitespace to a single space (Ruby's awk-mode
// `split(" ").join(" ")`, character-for-character).
//
// See builder/PLAN-4.md §5.14. `<pre>` was originally the only boundary,
// and standalone inline `<code>` was collapsed "matching the upstream
// behaviour" -- i.e. Jekyll's. That parity is no longer a reason for
// anything, and it was destroying real content: **Partition** returns
// fixed-width, space-padded range strings, its reference page documents
// exactly that padding in prose, and the table demonstrating it rendered
// `" 0: 4"` where the function returns `"  0:  4"`. Thirteen spans on
// that page alone stated wrong return values.
//
// Inline `<code>` is therefore preserved too. Note this is necessary but
// not sufficient: a browser collapses runs inside inline code by default,
// so `_sass/custom/custom.scss` and `print.css` also give it
// `white-space: pre-wrap`. Preserving the bytes here without that CSS
// changes nothing on screen.

const CODE_BLOCK_RE = /<pre\b[\s\S]*?<\/pre>|<code\b[^>]*>[\s\S]*?<\/code>/g;
// Anchor the split capture-group regex to the same body. Reusing the
// instance is safe because String.prototype.split builds a fresh
// internal exec state on every call.
const PRE_BLOCK_SPLIT_RE = new RegExp(`(${CODE_BLOCK_RE.source})`, "g");

export function compressHtml(html) {
  if (html === "") return "";
  const hadTrailingNl = html.endsWith("\n");
  // The capture group keeps the matched <pre>...</pre> bodies in the
  // result array, alternating with the outside-of-pre segments. Even
  // indices = outside (collapse whitespace); odd = pre body (verbatim).
  const parts = html.split(PRE_BLOCK_SPLIT_RE);
  // Odd indices are the matched code elements, even indices the text between
  // them. Whether a boundary may be trimmed depends on WHICH kind of element
  // sits on it, and getting this wrong is not subtle: trimming beside an
  // inline `<code>` welds it to the word next to it, so `a <code>x</code> b`
  // renders as `ax b`. A `<pre>` is block-level and its surrounding
  // whitespace is not rendered, so those boundaries keep the original trim
  // and the output stays byte-identical there.
  const isPre = (i) => typeof parts[i] === "string" && /^<pre\b/i.test(parts[i]);
  for (let i = 0; i < parts.length; i += 2) {
    parts[i] = collapseWhitespace(parts[i], {
      trimStart: i === 0 || isPre(i - 1),
      trimEnd: i === parts.length - 1 || isPre(i + 1),
    });
  }
  let result = parts.join("");
  if (hadTrailingNl && !result.endsWith("\n")) result += "\n";
  return result;
}

// Mirror of Ruby's `split(" ").join(" ")` (awk-mode split): collapses
// every run of whitespace AND strips leading / trailing whitespace.
//
// Use an explicit ASCII whitespace class, NOT JS's `\s` shorthand --
// per ECMA-262 `\s` also matches U+00A0 (nbsp) plus a dozen other
// Unicode space characters. Ruby's awk-mode `split(" ")` only
// considers ASCII space/tab/newline/CR/FF/VT to be whitespace.
// Treating nbsp as collapsible would destroy `&nbsp;` characters
// legitimately emitted by the renderer -- the indented syntax forms
// in Class.md / CoClass.md (`<br />&nbsp;&nbsp;&nbsp;&nbsp;[ ...`),
// kramdown's nbsp before footnote backrefs, and `<kbd>&nbsp;Enter
// </kbd>` markup. Jekyll's compress preserves all of those.
//
// String.prototype.trim DOES strip U+00A0, but that only matters at
// the leading / trailing edges of a non-pre segment between two
// `<pre>` blocks. No page on this site has a stray nbsp at a
// `<pre>`-segment boundary in practice; the tiny edge-case
// divergence isn't worth reimplementing trim.
function collapseWhitespace(s, { trimStart = true, trimEnd = true } = {}) {
  const collapsed = s.replace(/[ \t\n\r\f\v]+/g, " ");
  // Both ends trimmed is the original path, and uses String.prototype.trim so
  // the output stays byte-identical to what it produced. The one-sided forms
  // are new, for inline-code boundaries, and use the same explicit ASCII class
  // as the collapse above rather than `\s` -- see the note on nbsp.
  if (trimStart && trimEnd) return collapsed.trim();
  let out = collapsed;
  if (trimStart) out = out.replace(/^[ \t\n\r\f\v]+/, "");
  if (trimEnd) out = out.replace(/[ \t\n\r\f\v]+$/, "");
  return out;
}
