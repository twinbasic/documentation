// Phase 4 HTML whitespace compression. Port of _plugins/html-compress.rb.
//
// One pass over the fully-assembled page document, splitting on
// `<pre>...</pre>` blocks. Pre-block bodies are preserved verbatim
// (code-block whitespace matters); everything outside collapses every
// run of whitespace to a single space (Ruby's awk-mode `split(" ")
// .join(" ")`, character-for-character).
//
// See builder/PLAN-4.md §5.14. The `<pre>` boundary is by element, not
// by class; standalone `<code>` (no `<pre>`) is NOT preserved, matching
// the upstream behaviour. Trailing newline preserved when the input had
// one (Liquid's vendor/compress.html template ends with a newline).

const PRE_BLOCK_RE = /<pre\b[\s\S]*?<\/pre>/g;
// Anchor the split capture-group regex to the same body. Reusing the
// instance is safe because String.prototype.split builds a fresh
// internal exec state on every call.
const PRE_BLOCK_SPLIT_RE = new RegExp(`(${PRE_BLOCK_RE.source})`, "g");

export function compressHtml(html) {
  if (html === "") return "";
  const hadTrailingNl = html.endsWith("\n");
  // The capture group keeps the matched <pre>...</pre> bodies in the
  // result array, alternating with the outside-of-pre segments. Even
  // indices = outside (collapse whitespace); odd = pre body (verbatim).
  const parts = html.split(PRE_BLOCK_SPLIT_RE);
  for (let i = 0; i < parts.length; i += 2) {
    parts[i] = collapseWhitespace(parts[i]);
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
function collapseWhitespace(s) {
  return s.replace(/[ \t\n\r\f\v]+/g, " ").trim();
}
