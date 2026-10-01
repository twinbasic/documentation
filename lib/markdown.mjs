// What in a markdown source is code, asked of markdown-it rather than of a
// private regex.
//
//     blockRegions(src, { md })        every fence, code block and HTML block, with its lines
//     maskCode(src, { md, indented })  hide the code, rewrite the prose, restore the code
//     splitCodeSpans(line)             one line cut into prose and code-span segments
//     splitOnMarker(src, isMarker)     sections split on a marker line outside any region
//     mapLines(src, fn)                rewrite each line, keeping its own line ending
//
// Every tool that rewrites or scans page source takes what is code from here,
// because private copies disagree: one accepts a backtick fence whose info
// string holds a backtick, which CommonMark refuses, and another splits a fenced
// `---` as though it ended a section. A block parse settles it the way the
// renderer will.
//
// LINES. A line ends at CRLF, LF or a lone CR, as in CommonMark, and every line
// index here is 0-based. `blockRegions` numbers lines as markdown-it does, and
// `mapLines` and `splitOnMarker` split the same way, so a region's `start` and
// `end` index straight into what they see. The source is never normalised on
// its way back out: `maskCode`'s restore and `mapLines` return every line
// ending as it came in.

import MarkdownIt from "markdown-it";

let bare;

// A bare CommonMark parser with raw HTML on, for a caller that passes none. A
// caller whose own parser adds block syntax passes that one instead: the
// site's definition-list plugin, for one, makes a fence after `: ` a fence.
function bareParser() {
  bare ??= new MarkdownIt({ html: true });
  return bare;
}

// markdown-it's own `normalize` core rule, which a block-only parse skips.
// Without it a CRLF line ends in a CR, and a closing fence followed by one is
// not a closing fence. Neither replacement changes the number of lines.
const NEWLINES_RE = /\r\n?|\n/g;
// biome-ignore lint/suspicious/noControlCharactersInRegex: markdown-it replaces NUL, and so must this.
const NULL_RE = /\u0000/g;

const REGION_TYPES = new Set(["fence", "code_block", "html_block"]);

/**
 * Every fence, indented code block and HTML block in `src`, in document order.
 *
 * Each is `{ type, start, end, markup, info, content }`: `type` is markdown-it's
 * token type, `start` and `end` a half-open range of 0-based lines, and the
 * rest the token's own fields. The range includes the lines' blockquote and
 * list-item prefixes, which `content` has had removed. A fence that is never
 * closed runs to the end of its container, as in CommonMark.
 *
 * The parse is block-only -- inline content is never tokenised -- so a whole
 * corpus costs tens of milliseconds. Frontmatter is not recognised: markdown-it
 * reads a leading `---` block as a rule and a setext heading, which holds no
 * region unless the YAML has an indented line after a blank one.
 */
export function blockRegions(src, { md = bareParser() } = {}) {
  const tokens = [];
  md.block.parse(src.replace(NEWLINES_RE, "\n").replace(NULL_RE, "\u{FFFD}"), md, {}, tokens);
  const regions = [];
  for (const t of tokens) {
    if (!REGION_TYPES.has(t.type)) continue;
    regions.push({
      type: t.type,
      start: t.map[0],
      end: t.map[1],
      markup: t.markup,
      info: t.info,
      content: t.content,
    });
  }
  return regions;
}

// Each line's text and the ending that followed it, which is "" only for a
// last line with none. An empty source has no lines, and a final line ending
// starts no line after it: markdown-it counts the same way.
function splitLines(src) {
  const lines = [];
  let i = 0;
  while (i < src.length) {
    let j = i;
    while (j < src.length && src[j] !== "\n" && src[j] !== "\r") j++;
    const eol = src[j] === "\r" && src[j + 1] === "\n" ? "\r\n" : src.slice(j, j + 1);
    lines.push({ text: src.slice(i, j), eol });
    i = j + eol.length;
  }
  return lines;
}

/** `fn(text, index)` for every line, rejoined with each line's own ending. */
export function mapLines(src, fn) {
  return splitLines(src)
    .map(({ text, eol }, i) => fn(text, i) + eol)
    .join("");
}

/**
 * Cut one line into `{ code, text }` segments that rejoin to the line.
 *
 * A code span is a run of N backticks, the shortest possible content, then a
 * run of exactly N backticks, so ``a `b` c`` is one span. A run with no
 * partner is literal text, as in CommonMark. Only backticks: a code span
 * cannot be written with tildes.
 *
 * markdown-it cannot supply this, because an inline token has no offset into
 * its line. Two things CommonMark allows are not followed. A span that
 * continues onto the next line is not seen, since the scan is per line. And a
 * backslash before a backtick does not stop it opening a span: in
 * `` \`a `b` `` the scan pairs the escaped backtick with the one before `b`.
 */
export function splitCodeSpans(line) {
  const parts = [];
  let buf = "";
  let k = 0;
  while (k < line.length) {
    if (line[k] !== "`") {
      buf += line[k++];
      continue;
    }
    let n = 0;
    while (line[k + n] === "`") n++;
    let p = k + n;
    let found = -1;
    while (p < line.length) {
      if (line[p] === "`") {
        let m = 0;
        while (line[p + m] === "`") m++;
        if (m === n) {
          found = p;
          break;
        }
        p += m;
      } else p++;
    }
    if (found < 0) {
      buf += line.slice(k, k + n);
      k += n;
      continue;
    }
    if (buf) {
      parts.push({ code: false, text: buf });
      buf = "";
    }
    parts.push({ code: true, text: line.slice(k, found + n) });
    k = found + n;
  }
  if (buf) parts.push({ code: false, text: buf });
  return parts;
}

// NUL delimits a placeholder because page text never holds one: markdown-it
// replaces it. The backticks around it are deliberate -- see maskCode.
const placeholder = (n) => `\`\u0000CM${n}\u0000\``;
// biome-ignore lint/suspicious/noControlCharactersInRegex: NUL delimits the placeholders because page text never contains one.
const PLACEHOLDER_RE = /`\u0000CM(\d+)\u0000`/g;

/**
 * Hide every fence and code span in `src` behind a placeholder, so a rewrite of
 * the prose cannot reach the code. Returns `{ masked, restore }`; `restore`
 * puts the code back into a rewritten `masked`, and `restore(masked)` is `src`.
 *
 * A fence is masked whole, its lines' blockquote and list prefixes included,
 * as one line that starts with a backtick. So a rewrite that decides what a
 * line is from its first character reads it as it read the fence's own lines:
 * never a paragraph, a list item or a blockquote. Code spans are masked on
 * every line outside a masked block, HTML blocks included.
 *
 * `indented: true` masks indented code blocks as well. It is off by default
 * because the site's pre-render rewrites have never masked them, and turning it
 * on changes what they may rewrite.
 */
export function maskCode(src, { md, indented = false } = {}) {
  const stash = [];
  const lines = splitLines(src);
  const regions = blockRegions(src, { md }).filter((r) => r.type === "fence" || (indented && r.type === "code_block"));
  const out = [];
  let r = 0;
  for (let i = 0; i < lines.length; ) {
    const region = regions[r];
    if (region?.start === i) {
      const block = lines.slice(region.start, region.end);
      const last = block.pop();
      stash.push(block.map((l) => l.text + l.eol).join("") + last.text);
      out.push(placeholder(stash.length - 1) + last.eol);
      i = region.end;
      r++;
      continue;
    }
    const spans = splitCodeSpans(lines[i].text).map(({ code, text }) => {
      if (!code) return text;
      stash.push(text);
      return placeholder(stash.length - 1);
    });
    out.push(spans.join("") + lines[i].eol);
    i++;
  }
  return {
    masked: out.join(""),
    restore: (s) => s.replace(PLACEHOLDER_RE, (_, n) => stash[Number(n)] ?? ""),
  };
}

/**
 * Split `src` into sections at every line for which `isMarker(text, index)` is
 * true, except a line inside a fence, code block or HTML block. Returns
 * `{ marker, start, lines }[]`: the first section is whatever precedes the
 * first marker, with `marker` null and `start` 0; each other has the marker
 * line's text and 0-based index, and `lines` the lines after it, up to the next
 * marker. Line endings are not kept.
 */
export function splitOnMarker(src, isMarker, { md } = {}) {
  const lines = splitLines(src).map((l) => l.text);
  const inRegion = new Uint8Array(lines.length);
  for (const r of blockRegions(src, { md })) inRegion.fill(1, r.start, r.end);
  const sections = [{ marker: null, start: 0, lines: [] }];
  for (let i = 0; i < lines.length; i++) {
    if (!inRegion[i] && isMarker(lines[i], i)) sections.push({ marker: lines[i], start: i, lines: [] });
    else sections[sections.length - 1].lines.push(lines[i]);
  }
  return sections;
}
