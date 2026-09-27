// A page's YAML frontmatter, split off and parsed with the one YAML library the
// rest of the tooling uses.
//
// markdown-it knows nothing of frontmatter and misreads it -- the opening `---`
// as a rule, and the YAML up to the closing `---` as a setext heading -- so it
// has to come off before any parse.

import yaml from "js-yaml";

const DELIMITER_RE = /^---[ \t]*$/;

/**
 * Split `raw` into its frontmatter and the rest. Returns `{ data, content }`,
 * or null when `raw` does not start with a frontmatter block.
 *
 * A block opens on the first line, which is `---`, and closes at the next line
 * that is `---`; either may carry trailing spaces or tabs. A leading BOM is
 * dropped first: editors on Windows add one unasked, and a `---` behind one is
 * not an opener, so the page would be published as a static file, raw
 * markdown and all.
 *
 * `data` is the block parsed as YAML, or `{}` for an empty block or one of only
 * comments. `content` is everything after the closing line's ending, with its
 * bytes untouched, CRLF included.
 *
 * Throws when the block is never closed, when its YAML does not parse, or when
 * it parses to something other than a mapping. A YAML error names the line of
 * `raw` it is on, counting the opening `---` as line 1.
 */
export function parseFrontmatter(raw) {
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  let pos = 0;
  let blockStart = -1;
  while (pos < text.length) {
    let end = pos;
    while (end < text.length && text[end] !== "\n" && text[end] !== "\r") end++;
    const next = text[end] === "\r" && text[end + 1] === "\n" ? end + 2 : end + 1;
    const isDelimiter = DELIMITER_RE.test(text.slice(pos, end));
    if (blockStart < 0) {
      if (!isDelimiter || end === text.length) return null;
      blockStart = next;
    } else if (isDelimiter) {
      return { data: parseBlock(text.slice(blockStart, pos)), content: text.slice(next) };
    }
    pos = next;
  }
  if (blockStart < 0) return null;
  throw new Error("the frontmatter opened on line 1 is never closed by a `---` line");
}

function parseBlock(block) {
  // The newline stands in for the opening `---`, so that js-yaml counts lines
  // from the top of the file.
  const data = yaml.load(`\n${block}`);
  if (data == null) return {};
  if (typeof data !== "object" || Array.isArray(data)) {
    throw new Error("the frontmatter is not a mapping of keys to values");
  }
  return data;
}
