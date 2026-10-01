#!/usr/bin/env node
// Normalise literal en-/em-dashes in `docs/` markdown source to the ASCII forms
// markdown-it's typographer converts at build time.
//
//     node scripts/convert_em_dash_separators.mjs            # rewrite in place
//     node scripts/convert_em_dash_separators.mjs --check    # report, change nothing
//
// Exit codes: 0 nothing to report, or converted; 1 --check found a literal
// dash; 2 a refused command line or a crash, so that a crash cannot read as a
// finding.
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
// Code is skipped as the site's own parser finds it: every fence, indented code
// block and HTML block that lib/markdown.mjs's blockRegions reports, and every
// code span on the other lines. The typographer converts none of them, so a
// dash there is literal on the page and must stay literal in the source.
// Frontmatter is not recognised, so its lines are prose here. Not followed:
// the two gaps splitCodeSpans states, and an attribute inside inline HTML,
// which the typographer also leaves alone.
//
// LINE ENDINGS ARE PRESERVED BYTE-FOR-BYTE, which the Python predecessor did
// not do. `Path.read_text` / `write_text` apply universal-newline translation,
// so on Windows a touched LF file came back CRLF and the diff was the whole
// file. 882 of this repo's 906 markdown files are CRLF and 24 are not, so the
// hazard was real; it never fired only because the tree has been clean.

import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createMarkdownIt } from "../builder/render.mjs";
import { exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { blockRegions, mapLines, splitCodeSpans } from "../lib/markdown.mjs";
import { markdownFiles } from "../lib/markdown-files.mjs";
import { DOCS_DIR } from "../lib/repo-paths.mjs";

const EM_DASH = "—";
const EN_DASH = "–";

// First em-dash after a `[link](url)` on a bullet line. The negated class stops
// at a backtick so the match cannot reach into an inline-code span.
const SEPARATOR_RE = new RegExp(String.raw`^(- \[.*?\]\(.*?\)[^` + EM_DASH + String.raw`\x60]*)` + EM_DASH);

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
  const parts = splitCodeSpans(line).map(({ code, text }) => {
    if (code) return text;
    em += countOf(text, EM_DASH);
    en += countOf(text, EN_DASH);
    return text.split(EM_DASH).join("---").split(EN_DASH).join("--");
  });

  return { line: parts.join(""), sep, em, en };
}

// `md` is the site's markdown-it instance: its definition-list plugin makes a
// fence after `: ` that a bare parser reads as prose.
export function convertText(text, md) {
  if (!md) throw new TypeError("convertText: pass the site's markdown-it instance");
  let sep = 0;
  let em = 0;
  let en = 0;

  const regions = blockRegions(text, { md });
  let r = 0;
  const out = mapLines(text, (line, i) => {
    while (regions[r] && regions[r].end <= i) r++;
    if (regions[r] && regions[r].start <= i) return line;
    const p = processLine(line);
    sep += p.sep;
    em += p.em;
    en += p.en;
    return p.line;
  });

  return { text: out, sep, em, en };
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

const USAGE = `usage: node scripts/convert_em_dash_separators.mjs [--check] [-h, --help]

Rewrites literal en- and em-dashes in docs/ markdown source to the ASCII forms
the typographer converts at build time, leaving code as it is.

  --check     report the files that hold a literal dash and change nothing
  -h, --help  print this text and exit

Exit codes:
  0  the dashes were converted, or with --check there were none
  1  with --check, a file holds a literal dash
  2  a refused command line, or a crash`;

async function main(argv) {
  const { values } = withUsageError(() =>
    parseCli(argv, {
      options: { check: { type: "boolean" }, help: { type: "boolean", short: "h" } },
      stopAt: ["help"],
    }),
  );
  if (values.help) printHelpAndExit(USAGE);
  const check = values.check;
  let files = 0;
  let sep = 0;
  let em = 0;
  let en = 0;
  const md = createMarkdownIt({ highlighter: null, linkTables: null, baseurl: "", staticFiles: new Set() });

  for (const rel of (await markdownFiles(DOCS_DIR)).sort(byPathParts)) {
    const abs = path.join(DOCS_DIR, rel);
    const r = convertText(await fs.readFile(abs, "utf8"), md);
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
  exitOnCrash();
  process.exit(await main(process.argv.slice(2)));
}
