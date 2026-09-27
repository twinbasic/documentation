// The build's escapers, one of each kind, each named for what it escapes.
//
// The two HTML escapers differ only in the quotes. markdown-it has a third
// kind of its own, `escapeHtml` (`& < > "`), which its default text rule
// uses; nothing in the build calls it directly.

const MARKUP = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };
const MARKUP_AND_QUOTES = { ...MARKUP, '"': "&quot;", "'": "&#39;" };

// `&`, `<` and `>`: for element content, where a quote is a literal
// character. Rouge's HTML formatter escapes only these three, and so do
// kramdown's code spans, so a string literal in code keeps its literal `"`.
export function escapeMarkup(s) {
  return String(s).replace(/[&<>]/g, (c) => MARKUP[c]);
}

// `&`, `<`, `>`, `"` and `'`: safe in element content and in an attribute
// value under either quote.
export function escapeMarkupAndQuotes(s) {
  return String(s).replace(/[&<>"']/g, (c) => MARKUP_AND_QUOTES[c]);
}

// Every character a RegExp reads as an operator, escaped, so the result
// matches `s` literally. `scripts/lib/regex-fold.mjs` recognises this shape,
// here and in a module that imports it, and models a call as text with no
// operator in it; keep the body a single `s.replace`.
export function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
