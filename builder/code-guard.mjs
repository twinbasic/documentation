// Rewriting rendered HTML without touching code.
//
// An inline code span is escaped with `escapeMarkup`, which keeps quotes, so
// `id="`, `href="#` and `src="` all match inside a code sample, and a
// rewrite over a whole rendered page that does not skip code corrupts the
// sample. A highlighted block is protected only by accident, because the
// highlighter splits attributes across `<span>` boundaries; nothing should
// rest on that.
//
// The guard is a leading alternative. CODE_OR_PRE comes first in the pattern
// and consumes a `<code>` or `<pre>` element whole, so the rest of the
// pattern never sees inside one, and a match of it is kept as it is. Compose
// a pattern from `CODE_OR_PRE.source`, or give replaceOutsideCode the bare
// pattern.

export const CODE_OR_PRE = /<code\b[^>]*>[\s\S]*?<\/code>|<pre\b[^>]*>[\s\S]*?<\/pre>/;

// `html` with each match of `pattern` outside code replaced by `replacer`,
// which is called as `String.prototype.replace` calls it. Every match is
// replaced, whether or not `pattern` has the `g` flag.
export function replaceOutsideCode(html, pattern, replacer) {
  const flags = pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g";
  const re = new RegExp(`${CODE_OR_PRE.source}|${pattern.source}`, flags);
  return html.replace(re, (m, ...rest) =>
    (m.startsWith("<code") || m.startsWith("<pre")) ? m : replacer(m, ...rest));
}
