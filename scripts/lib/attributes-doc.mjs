// What Reference/Attributes.md documents: each attribute's `Syntax:` line and
// the first `Applicable to:` line after it. census_attributes.mjs reports each
// attribute's documented targets beside its uses, and gen_attribute_probes.mjs
// generates a probe from each target.
//
// A line inside a fence, an indented code block or an HTML block is not read,
// so an example that shows the page's own format is not taken for an
// attribute. The regions come from the site's parser, since the page is the
// site's.

import { createMarkdownIt } from "../../builder/render.mjs";
import { blockRegions } from "../../lib/markdown.mjs";

const LINK_BOLD = /\[\*\*([^\]]*)\*\*\]\([^)]*\)/g;
const LINK = /\[([^\]]*)\]\([^)]*\)/g;

/** The text with its links, bold markers and backslashes removed. */
function clean(s) {
  return s
    .replace(LINK_BOLD, "$1")
    .replace(LINK, "$1")
    .replaceAll("**", "")
    .replaceAll("\\", "")
    .trim();
}

let siteMd;

/**
 * Every attribute `src` documents, in page order, as `{ name, syntax, line, app }`:
 * the name a `Syntax: **[Name` line gives, the rest of that line cleaned, its
 * 1-based line number, and the first `Applicable to:` line after it, cleaned,
 * or null. A `Syntax:` line that names no attribute is skipped, so an
 * `Applicable to:` line after it still belongs to the attribute before.
 */
export function parseAttributes(src) {
  siteMd ??= createMarkdownIt({ highlighter: null, linkTables: null, baseurl: "", staticFiles: new Set() });
  // CRLF and a lone CR end a line as LF does, as they do for blockRegions, so
  // the two index the same lines and no line keeps a CR.
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const inRegion = new Uint8Array(lines.length);
  for (const r of blockRegions(src, { md: siteMd })) inRegion.fill(1, r.start, r.end);

  const entries = [];
  let cur = null;
  lines.forEach((line, i) => {
    if (inRegion[i]) return;
    const m = /^Syntax:\s*(.*)$/.exec(line);
    if (m) {
      const name = /^Syntax:\s*\*\*\[(\w+)/.exec(line);
      if (!name) return;
      cur = { name: name[1], syntax: clean(m[1]), line: i + 1, app: null };
      entries.push(cur);
      return;
    }
    const a = /^Applicable to:\s*(.*)$/.exec(line);
    if (a && cur !== null && cur.app === null) cur.app = clean(a[1]);
  });
  return entries;
}
