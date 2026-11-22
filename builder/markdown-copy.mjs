// Each page's markdown, published in the online tree beside its HTML, for agents and other
// tools that read markdown rather than HTML. The page at /tB/Core/Dim is also at
// /tB/Core/Dim.md, and the one at /tB/Packages/VB/ at /tB/Packages/VB/index.md. Each page's
// head names its copy (template.mjs, `<link rel="alternate" type="text/markdown">`), and
// /llms.txt links to them (llms-txt.mjs). The offline tree holds no copy: its pages' links to
// one go to the website (offline-rewrite.mjs, computeWebsiteUrl).
//
// The copy is the page's own source. What the source says differently from the page a reader
// sees is changed, outside code only (maskCode, with indented code blocks masked as well as
// fences and code spans):
//
//   * the front matter goes, and a page whose text does not start with a level-1 heading gets
//     one, from its title;
//   * {{tbdocs:...}} placeholders are expanded, as the render expands them (counts.mjs);
//   * HTML comments go, as stripHtmlCommentsPlugin takes them out of the HTML: they are notes
//     for the documentation's maintainers, test markers above all;
//   * a fence marked `hidden` or `probe` goes, as the render's fence rule leaves it out of the
//     HTML (isHiddenFence): it is context or a check for the compile gate, not a sample;
//   * a link to a page goes to that page's copy, `/tB/Core/Dim.md#syntax`, so a reader of the
//     copies stays in markdown (copyHref). Which page a link goes to is the page's HTML's
//     answer: the build's (render.mjs, resolveTarget) for a `tb:` shortcut or a path from the
//     source file's folder, and the browser's, against the page's URL, for a link the HTML
//     keeps as written. A link to anything else is left as the HTML has it, and a copy sits in
//     the folder its page is served from, so a relative one resolves the same from either.
//
// The rest is the markdown as written: kramdown attribute lists (`{: .no_toc }`), GitHub
// alerts (`> [!NOTE]`) and definition lists stay.
//
// The render workers make each page's copy after rendering it, and write it with the page
// (cpu-worker.mjs, flush). dispatch puts each copy's path in the online tree's index and
// exempts it from the publish allowlist, which refuses a `.md` file anywhere else.

import { maskCode } from "../lib/markdown.mjs";
import { expandDownloadPlaceholders, substituteCounts } from "./counts.mjs";
import { posix } from "./paths.mjs";
import { encodeSpaces, splitFragment } from "./url.mjs";

/**
 * Where a page's copy goes in the online tree, beside its HTML, or null for a page that has
 * none: one not written from markdown (404.html), and the book's combined page.
 */
export function markdownCopyRel(page) {
  if (page.ext !== ".md" || page.frontmatter?.layout === "book-combined") return null;
  const dest = posix(page.destPath);
  return dest.endsWith(".html") ? `${dest.slice(0, -".html".length)}.md` : null;
}

/** The site path of a page's copy, as `/` and markdownCopyRel's path, or null. */
export function markdownCopyUrl(page) {
  const rel = markdownCopyRel(page);
  return rel === null ? null : `/${rel}`;
}

/**
 * A page's copy. `md` is the site's markdown-it instance, which decides what is code, and
 * carries what the placeholders and the links resolve against (createMarkdownIt: `downloads`,
 * `counts`, `links`). `href(value)` gives the copy's URL for a link's destination, or null to
 * leave it as written: copyHref unless the caller passes its own, as
 * scripts/check_code_regions.mjs does.
 *
 * @param {{rawContent: string, frontmatter: object, permalink: string, srcRel: string}} page
 */
export function markdownCopy(page, md, { href = (value) => copyHref(value, page, md) } = {}) {
  const source = withoutHiddenFences(page.rawContent.replace(/\r\n?/g, "\n"), md);
  const code = maskCode(source, { md, indented: true });
  let work = code.masked;
  if (work.includes("{{tbdocs:")) {
    if (md.downloads) work = expandDownloadPlaceholders(work, md.downloads, page.permalink);
    if (md.counts) work = substituteCounts(work, md.counts);
  }
  work = withoutComments(work);
  work = withLinksResolved(work, (value) => {
    // A destination the scan finds where markdown-it sees no link (inside a raw HTML block) may
    // name no shortcut, and the HTML shows it as text; the copy leaves it as written, as the
    // HTML does.
    try {
      return href(value);
    } catch {
      return null;
    }
  });
  const body = code.restore(work).replace(/^\s*\n/, "");
  return startsWithTitle(body) ? body : `# ${page.frontmatter?.title ?? ""}\n\n${body}`;
}

/**
 * The URL a link's destination `value` has in `page`'s copy, or null to leave it as written.
 * A link to a page goes to that page's copy, with its fragment. Which page it goes to is what
 * the page's HTML says: the build resolves a `tb:` shortcut and a path from the source file's
 * folder (`md.links.target`), and a browser resolves a link the HTML keeps as written against
 * the page's URL (`md.links.pageAt`, which knows the pages' URLs and their `redirect_from:`
 * stubs). A link to a static file is as the HTML has it; a link to a page with no copy, as the
 * HTML has it too.
 */
export function copyHref(value, page, md) {
  const links = md.links;
  if (!links) return null;
  const hit = links.target(value, page);
  if (hit) return (hit.page && copyLink(hit.page, hit.fragment, links.baseurl)) || hit.url;
  if (/^([a-z][a-z0-9+.\-]*:|#|\/\/)/i.test(value) || value.includes("?")) return null;
  const [path, fragment] = splitFragment(value);
  let at;
  try {
    at = new URL(path, `https://site.invalid${page.permalink}`).pathname;
  } catch {
    return null;
  }
  const target = links.pageAt(at.slice(1));
  return target ? copyLink(target, fragment, links.baseurl) : null;
}

// The URL of a link table entry's copy, with `fragment`, or null for a page that has none. A
// worker's entry is a stub that carries its page's copy (render.mjs, serializeLinkTables); the
// main thread's is the page itself.
function copyLink(entry, fragment, baseurl) {
  const url = entry.markdownUrl !== undefined ? entry.markdownUrl : markdownCopyUrl(entry);
  if (!url) return null;
  return `${baseurl}${encodeSpaces(url)}${fragment ? `#${fragment}` : ""}`;
}

// ── hidden fences ───────────────────────────────────────────────────────

// `hidden` or `probe` as a whitespace-separated token anywhere after the language. Matched
// against the raw info string rather than parsed with scripts/lib/tb-fences.mjs's parseInfo:
// builder/ must not depend on scripts/, and these are the two tokens of that markup the render
// and the copy care about. The word has to stand alone, or a language called `hidden-x` or a key
// like `id=hidden` would suppress a fence the author meant to publish.
const HIDDEN_FENCE_RE = /^\S+(?:\s+\S+)*?\s+(?:hidden|probe)(?:\s|$)/;

/** Whether a fence with this info string is left out of the page: the render's rule and the copy's. */
export function isHiddenFence(info) {
  return HIDDEN_FENCE_RE.test(info ?? "");
}

// A line that could open such a fence, behind any container's markers: a cheap test, so that
// only the pages that have one are parsed.
const MAYBE_HIDDEN_OPEN = /^[ \t>:\-*+\d.]*(?:`{3,}|~{3,})[^\n]*?\s(?:hidden|probe)(?:\s|$)/m;

/**
 * `text` without its hidden fences, each with its lines, and with the blank line after them
 * when one is also before them, as a comment on lines of its own goes. Which lines a fence has
 * is markdown-it's answer, so a fence inside an alert, a list item or a definition goes as one
 * at the top level does.
 */
export function withoutHiddenFences(text, md) {
  if (!MAYBE_HIDDEN_OPEN.test(text)) return text;
  const drop = md
    .parse(text, {})
    .filter((t) => t.type === "fence" && t.map && isHiddenFence(t.info))
    .map((t) => t.map);
  if (!drop.length) return text;
  const lines = text.split("\n");
  const gone = new Set();
  for (const [from, to] of drop) {
    for (let i = from; i < to; i++) gone.add(i);
    const before = from === 0 || isBlankLine(lines[from - 1]);
    if (before && to < lines.length - 1 && isBlankLine(lines[to])) gone.add(to);
  }
  return lines.filter((_, i) => !gone.has(i)).join("\n");
}

// A blank line, or one that holds only a container's markers (`>` of an alert), which reads as
// blank inside it.
function isBlankLine(line) {
  return /^[ \t>]*$/.test(line);
}

// ── comments ────────────────────────────────────────────────────────────

/**
 * `text` without its HTML comments. A comment on lines of its own goes with its lines, and with
 * the blank line after them when one is also before them, so it leaves one blank line where it
 * had two around it. A comment inside a line goes with the white space before it when nothing
 * follows it on the line, so it leaves no trailing spaces, which would be a hard line break;
 * and with the white space after it when there is some before it, so it leaves one space. An
 * unterminated comment is left as written.
 */
export function withoutComments(text) {
  let out = "";
  let at = 0;
  for (;;) {
    const open = text.indexOf("<!--", at);
    if (open < 0) break;
    const close = text.indexOf("-->", open + 4);
    if (close < 0) break;
    const end = close + 3;
    const lineStart = text.lastIndexOf("\n", open - 1) + 1;
    const newline = text.indexOf("\n", end);
    const lineEnd = newline < 0 ? text.length : newline;
    const alone = isBlank(text, lineStart, open) && isBlank(text, end, lineEnd);
    if (!alone) {
      out += text.slice(at, open);
      at = end;
      const spaceBefore = out.endsWith(" ") || out.endsWith("\t");
      if (isBlank(text, end, lineEnd)) {
        let k = out.length;
        while (k > 0 && (out[k - 1] === " " || out[k - 1] === "\t")) k--;
        out = out.slice(0, k);
      } else if (spaceBefore) {
        while (at < lineEnd && (text[at] === " " || text[at] === "\t")) at++;
      }
      continue;
    }
    out += text.slice(at, Math.max(at, lineStart));
    at = newline < 0 ? text.length : newline + 1;
    if (endsWithBlankLine(out) && at < text.length) {
      const next = text.indexOf("\n", at);
      if (next >= 0 && isBlank(text, at, next)) at = next + 1;
    }
  }
  return out + text.slice(at);
}

function isBlank(text, from, to) {
  for (let i = from; i < to; i++) if (text[i] !== " " && text[i] !== "\t") return false;
  return true;
}

// Whether the last line of `out` is blank, or `out` is empty: what is before the comment's line.
function endsWithBlankLine(out) {
  if (out === "") return true;
  if (!out.endsWith("\n")) return false;
  let i = out.length - 2;
  while (i >= 0 && (out[i] === " " || out[i] === "\t")) i--;
  return i < 0 || out[i] === "\n";
}

// ── links ───────────────────────────────────────────────────────────────

// An inline link's or image's destination, `](dest)` or `](dest "title")`, with balanced
// parentheses in it one deep, as in a URL with `(...)` in it. No destination in the pages has
// white space in it, so this does not look for one.
const INLINE_LINK = /(\]\()([^()\s]*(?:\([^()\s]*\)[^()\s]*)*)((?:[ \t]+"[^"\n]*")?\))/g;
// A link reference definition, `[label]: dest`. Not a footnote's, `[^1]: text`, whose first
// word is no destination.
const REFERENCE_DEFINITION = /^([ \t]{0,3}\[(?!\^)[^\]\n]+\]:[ \t]*)(\S+)/gm;

/**
 * `text` with each link's destination replaced by what `resolve` gives for it, or left as
 * written where `resolve` gives null. The caller has masked `text` of code, so a `](` left in
 * it is a link's. A destination with masked code in it (`` [x](`y`) ``, which markdown-it reads
 * as a link to `` `y` ``) is left as written: the scan cannot read it, and replacing it would
 * drop the code the mask holds for it.
 */
export function withLinksResolved(text, resolve) {
  const swap = (whole, before, dest, after) => {
    if (dest === "" || dest.includes("\u{0}")) return whole;
    const url = resolve(dest);
    return url === null || url === undefined ? whole : `${before}${url}${after}`;
  };
  return text
    .replace(INLINE_LINK, swap)
    .replace(REFERENCE_DEFINITION, (whole, before, dest) => swap(whole, before, dest, ""));
}

// ── the title ───────────────────────────────────────────────────────────

// Whether the copy's first line of text is a level-1 heading, ATX (`# Title`) or setext
// (`Title` over `===`).
function startsWithTitle(body) {
  const lines = body.split("\n", 2);
  return /^ {0,3}#(?:[ \t]|$)/.test(lines[0]) || /^ {0,3}=+[ \t]*$/.test(lines[1] ?? "");
}
