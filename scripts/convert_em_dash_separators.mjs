#!/usr/bin/env node
// Normalise literal en-/em-dashes in `docs/` markdown source to the ASCII forms
// markdown-it's typographer converts at build time.
//
//     node scripts/convert_em_dash_separators.mjs            # rewrite in place
//     node scripts/convert_em_dash_separators.mjs --check    # report, change nothing
//
// The typographer (enabled in builder/render.mjs) renders:
//
//     source `--`   ->  en-dash
//     source `---`  ->  em-dash
//
// so a literal en-dash or em-dash character in source is redundant. Nothing in
// the build rejects one -- the typographer passes a literal straight through --
// so a stray ships silently and only the source becomes inconsistent. This is
// the normaliser, and it is run by hand.
//
// Three conversions, chosen to preserve the rendered output:
//
//   * The bullet-list separator em-dash (the first one on a `- [link](url) ...`
//     line) becomes `--`, matching the See Also convention, which renders as an
//     en-dash. This is the one case that changes what is rendered, deliberately.
//   * Every other em-dash becomes `---` (renders as em-dash, unchanged).
//   * Every en-dash becomes `--` (renders as en-dash, unchanged).
//
// Code is skipped: fenced blocks are left intact, and so is anything inside an
// inline code span on a prose line.
//
// LINE ENDINGS ARE PRESERVED BYTE-FOR-BYTE, which the Python predecessor did
// not do. `Path.read_text` / `write_text` apply universal-newline translation,
// so on Windows a touched LF file came back CRLF and the diff was the whole
// file. 882 of this repo's 906 markdown files are CRLF and 24 are not, so the
// hazard was real; it never fired only because the tree has been clean.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ROOT = path.join(REPO, "docs");

const EM_DASH = "—";
const EN_DASH = "–";

// First em-dash after a `[link](url)` on a bullet line. The negated class stops
// at a backtick so the match cannot reach into an inline-code span.
const SEPARATOR_RE = new RegExp(
  String.raw`^(- \[.*?\]\(.*?\)[^` + EM_DASH + String.raw`\n\x60]*)` + EM_DASH,
);

// A fenced-code-block opener / closer.
const FENCE_RE = /^```/;

// Split a line into alternating prose / inline-code segments. The capture group
// keeps the code spans in the output, so joining restores the line.
const INLINE_CODE_SPLIT = /(`[^`\n]*`)/;

// Split keeping line terminators, so the text rejoins unchanged. Python's
// `splitlines(keepends=True)` also breaks on a bare CR; this matches that
// without splitting CRLF in two.
const KEEP_ENDS = /(?<=\n)|(?<=\r)(?!\n)/;

function countOf(haystack, needle) {
  let n = 0;
  for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + 1)) n++;
  return n;
}

// Returns the rewritten line plus the three counts it contributed.
function processLine(line) {
  let sep = 0;

  // Step 1: bullet-list separator em-dash -> `--`. The regex is not global, so
  // at most one substitution -- the Python `count=1`.
  const separated = line.replace(SEPARATOR_RE, "$1--");
  if (separated !== line) sep = 1;
  line = separated;

  // Step 2: remaining em-dash -> `---`, en-dash -> `--`, outside code spans.
  let em = 0;
  let en = 0;
  const parts = line.split(INLINE_CODE_SPLIT).map((part) => {
    if (part.length >= 2 && part.startsWith("`") && part.endsWith("`")) return part;
    em += countOf(part, EM_DASH);
    en += countOf(part, EN_DASH);
    return part.split(EM_DASH).join("---").split(EN_DASH).join("--");
  });

  return { line: parts.join(""), sep, em, en };
}

export function convertText(text) {
  const out = [];
  let inFence = false;
  let sep = 0;
  let em = 0;
  let en = 0;

  for (const line of text.split(KEEP_ENDS)) {
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }
    const r = processLine(line);
    sep += r.sep;
    em += r.em;
    en += r.en;
    out.push(r.line);
  }

  return { text: out.join(""), sep, em, en };
}

// Python sorts `Path` objects, which on Windows compare as a tuple of
// case-folded components. Sorting the joined string instead puts `a-x/c.md`
// before `a/b.md`, because `-` sorts below `/`, and a case-sensitive compare
// puts every capitalised folder ahead of every lowercase file. Only the report
// order depends on this, but matching the predecessor is free.
function byPathParts(a, b) {
  const x = a.toLowerCase().split("/");
  const y = b.toLowerCase().split("/");
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  }
  return x.length - y.length;
}

async function markdownFiles(root) {
  const entries = await fs.readdir(root, { recursive: true, withFileTypes: true });
  const rels = [];
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".md")) continue;
    const abs = path.join(e.parentPath ?? e.path, e.name);
    rels.push(path.relative(root, abs).split(path.sep).join("/"));
  }
  return rels.sort(byPathParts);
}

async function main(argv) {
  const check = argv.includes("--check");
  let files = 0;
  let sep = 0;
  let em = 0;
  let en = 0;

  for (const rel of await markdownFiles(ROOT)) {
    const abs = path.join(ROOT, rel);
    const r = convertText(await fs.readFile(abs, "utf8"));
    if (r.sep + r.em + r.en === 0) continue;

    if (!check) await fs.writeFile(abs, r.text, "utf8");
    files++;
    sep += r.sep;
    em += r.em;
    en += r.en;
    console.log(`  docs/${rel}: sep=${r.sep}, prose-em=${r.em}, en=${r.en}`);
  }

  console.log();
  console.log(`Files ${check ? "affected" : "changed"}: ${files}`);
  console.log(`Separator em-dash -> --:  ${sep}`);
  console.log(`Prose em-dash    -> ---:  ${em}`);
  console.log(`En-dash          -> --:   ${en}`);
  console.log(`Total replacements:       ${sep + em + en}`);

  // --check is a gate: a literal dash in source is a defect, so say so loudly.
  return check && files > 0 ? 1 : 0;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exit(await main(process.argv.slice(2)));
}
