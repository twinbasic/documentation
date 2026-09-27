#!/usr/bin/env node
// Gate: no pre-render source rewrite may alter the contents of a code region.
//
//     node scripts/check_code_regions.mjs              # the gate
//     node scripts/check_code_regions.mjs --verbose    # per-finding detail
//     node scripts/check_code_regions.mjs --self-test  # prove it still detects
//
// Exit: 0 clean, 1 a code region changed or a probe failed, 2 the gate itself
// could not run.
//
// WHY THIS EXISTS
//
// builder/render.mjs applies several kramdown-parity rewrites to raw markdown
// source, before markdown-it has parsed anything. A rewrite at that layer has
// no idea what is code, and this site's subject matter IS code. Four separate
// defects of exactly that shape shipped:
//
//   * stripLiquidRawTags removed `{% raw %}` inside fenced blocks, so no page
//     could show the tag it existed to handle (deleted in 3fc95ee).
//   * rewriteAdmonitions' body strip ate the indentation of code inside an
//     admonition -- Reference/Default/VBA/Interaction/InputBox shipped its
//     If/ElseIf/Else bodies flush left.
//   * encodeSpacesInMediaUrls turned `Items[1](a, b)` into `Items[1](a,%20b)`.
//   * rewriteListItemSetextHeadings DELETED the closing `---` of a YAML sample
//     and promoted the line above it to a heading.
//
// None of them was caught by anything. The link check, integrity check,
// publish allowlist, regex-safety gate and axe scan all pass on a tree with
// corrupted code samples in it, because the corruption is inside <code> and no
// gate inspects that.
//
// HOW IT WORKS
//
// For every markdown file: tokenise the source, apply the real rewrite chain,
// tokenise the result, and compare the literal regions -- `fence`, `code_block`
// and `code_inline` token contents, in order. Any difference is a finding. No
// browser, no built tree.
//
// KNOWN GAP 1, stated rather than hidden: an indented (4-space) code block is
// compared as a `code_block` token, so corruption of one IS caught here -- but
// the chain's mask in render.mjs does not protect indented blocks, and never
// has. So a future rewrite that damages an indented block will be reported by
// this gate and will need fixing at the rewrite.
//
// KNOWN GAP 2: code inside a RAW HTML BLOCK is invisible here. markdown-it
// emits such a block as a single `html_block` token, which is none of the three
// types compared below, so a `<code>` written inside raw HTML is not a code
// region as far as this gate is concerned. That matters because
// `blockHtmlRecursionPlugin` does rewrite html_block content: for
// `markdown=span` it runs a smart-quote pass over the element's body with no
// code awareness, so `<summary markdown=span>a `x "q"` b</summary>` comes out
// with the quotes inside the backticks curled.
//
// Measured rather than assumed: the corpus has 32 `markdown=span` usages, all
// on <summary> elements in FAQs.md and IDE/Menu/Window.md, and not one body
// contains a backtick -- and markdown-it does not build a code span inside that
// context anyway, so there is no code region there to damage today. If a page
// ever does put code inside raw HTML, this gate will not speak up.
//
// THE MODULES
//
// It is also the gate on lib/markdown.mjs and lib/frontmatter.mjs, which the
// tools ask what in a page is code and where its frontmatter ends. Their
// probes ride along too, and the sweep checks on every page that
// blockRegions, which parses blocks only, finds exactly the fences, code
// blocks and HTML blocks of the full parse the comparison already makes. One
// probe holds builder/counts.mjs's count validator, which asks the same module
// what is code, another builder/discover.mjs's warning about a frontmatter
// value that ends in `#`, and a set holds scripts/convert_em_dash_separators.mjs,
// which rewrites page source outside the build and asks it too.

import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import MarkdownIt from "markdown-it";
import deflist from "markdown-it-deflist";
import { validateCountNames } from "../builder/counts.mjs";
import { discover } from "../builder/discover.mjs";
import { applyPreRenderRewrites, createMarkdownIt } from "../builder/render.mjs";
import { parseFrontmatter, unquotedHashValues } from "../lib/frontmatter.mjs";
import { blockRegions, mapLines, maskCode, splitCodeSpans, splitOnMarker } from "../lib/markdown.mjs";
import { markdownFiles } from "../lib/markdown-files.mjs";
import { convertText } from "./convert_em_dash_separators.mjs";

const REPO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ROOT = path.join(REPO, "docs");

// A bare CommonMark parser: this gate asks what the *source* says is code, so
// it must not inherit the site's plugin stack (which rewrites content itself).
const md = new MarkdownIt({ html: true });

// The literal regions of a source, in document order, as type-tagged strings.
function codeRegions(src) {
  const out = [];
  const walk = (tokens) => {
    for (const t of tokens) {
      if (t.type === "fence" || t.type === "code_block" || t.type === "code_inline") {
        out.push(`${t.type}:${t.content}`);
      }
      if (t.children) walk(t.children);
    }
  };
  walk(md.parse(src, {}));
  return out;
}

// The block regions of a full parse, in the form regionsOf gives blockRegions'.
const REGION_TYPES = new Set(["fence", "code_block", "html_block"]);
function parsedRegions(src) {
  return md.parse(src, {}).filter((t) => REGION_TYPES.has(t.type)).map((t) => `${t.type} ${t.map[0]}-${t.map[1]}`);
}

// The real chain, imported from render.mjs rather than reconstructed here.
// That is what makes this gate mean something: unmasking any one of the
// rewrites changes what this function does, and the comparison below sees it.
// It masks with the site's parser, as renderPage does; only its block rules
// run, so the options that matter to rendering are left empty.
const siteMd = createMarkdownIt({ highlighter: null, linkTables: null, baseurl: "", staticFiles: new Set() });
const applyRewrites = (src) => applyPreRenderRewrites(src, siteMd);

function compare(src) {
  const before = codeRegions(src);
  const after = codeRegions(applyRewrites(src));
  const findings = [];
  const n = Math.max(before.length, after.length);
  for (let i = 0; i < n; i++) {
    if (before[i] !== after[i]) findings.push({ i, before: before[i], after: after[i] });
  }
  return findings;
}

// Probes ride along inside the normal run rather than behind a flag nobody
// remembers: a green line saying "no rewrite touches code" is otherwise
// indistinguishable from a gate that has stopped detecting. Each is a real
// defect this repository shipped.
const PROBES = [
  ["admonition strips code indent",
    "> [!NOTE]\n> text\n>\n> ```tb\n> If x Then\n>     y\n> End If\n> ```\n"],
  ["admonition swallows blank line",
    "> [!NOTE]\n> text\n>\n> ```tb\n> a\n>\n> b\n> ```\n"],
  ["media-url spaces inside a fence",
    "```tb\nv = Matrix[0](a, b)\n```\n"],
  ["triple asterisk inside a fence",
    "```tb\n' *** banner ***\n```\n"],
  ["list setext deletes a yaml ---",
    "```yaml\nredirect_from:\n- /tB/Core/Dim\n---\n```\n"],
  ["liquid raw tag inside a fence",
    "```liquid\n{% raw %}\nHello {{ name }}\n{% endraw %}\n```\n"],
  ["code span with a doubled backtick run",
    "prose ``a *** b`` prose\n"],
];

// The mirror of the probes above, and the region comparison structurally
// cannot make it: a rewrite that misreads what is code can also fail to fire
// on real prose, and the regions still come back identical because the text
// was merely stashed and restored. Reference/Attributes.md shipped all six of
// its admonitions as the literal text "[!NOTE]" for exactly that reason -- a
// [Description(...)] sample whose argument is a Markdown string containing
// "```basic" and "```" as twinBASIC string literals, which the fence stasher
// closed the surrounding ```tb fence on. Every pairing after it was off by
// one, so for the rest of the page prose and code were the wrong way round.
//
// Each probe is a source that MUST produce an admonition.
//
// The first one needs a fence on BOTH sides of the admonition, and that is not
// decoration. A mis-paired opener swallows text only as far as the next ```,
// so with nothing after it the run simply ends and the admonition survives --
// the first draft of this probe had no trailing fence and passed happily
// against the very stasher it was written to catch. The page it is modelled on
// has 22 fences; the damage is always to the prose BETWEEN two of them.
const ADMONITION_PROBES = [
  ["admonition between a fence whose body contains a fence marker, and the next fence",
    'prose\n\n```tb\nx = "```basic" & vbCrLf & _\n    "```"\n```\n\n' +
    "> [!NOTE]\n> body\n\n```tb\nDim y As Long\n```\n"],
  ["admonition between two ordinary fences",
    "```tb\nDim x As Long\n```\n\n> [!NOTE]\n> body\n\n```tb\nDim y As Long\n```\n"],
  ["admonition after a fence closed by a longer run",
    "prose\n\n````tb\n```\n````\n\n> [!WARNING]\n> body\n\n```tb\nDim y\n```\n"],
  ["admonition before any fence",
    "> [!IMPORTANT]\n> body\n\n```tb\nDim x\n```\n"],
  // A tilde fence holding an ODD number of standalone ``` lines. stashCodeFences
  // recognised backtick fences only, so the tilde opener was invisible, the ```
  // inside it was read as an opener, and the pairing ran past the sample and
  // swallowed the admonition -- the Attributes.md failure, reached by a
  // construct CommonMark allows. docs/ has no tilde fence today, so the corpus
  // sweep would never have found it.
  ["admonition after a tilde fence holding a lone fence marker",
    "prose\n\n~~~markdown\nsample\n```\n~~~\n\n> [!NOTE]\n> body\n\n```tb\nDim y\n```\n"],
  // A3-1. A backtick in a backtick fence's info string opens no fence, so the
  // admonition after it is prose. An opener test that took the line for one,
  // as the chain's old mask did, closes it on the last line here and hides the
  // admonition inside.
  ["admonition after a line that a backtick in its info string keeps from opening a fence",
    "```abc`def\n> [!NOTE]\n> body\n\n```tb\nDim y\n```\n"],
];

// Sources the whole chain must return byte for byte. The first holds the chain
// to the site's parser: the definition-list plugin makes a fence after `: `
// that a bare parser reads as a paragraph, and masked with a bare parser, the
// fence's body is rewritten (`a,%20b`). The region comparison cannot see that,
// because it parses bare too and finds no fence there to compare. The second
// holds the admonition rewrite, which runs outside the mask, to the same
// parser: the line scan it had never saw a fence open after `: `, and turned
// the sample inside into a live admonition.
const UNCHANGED_PROBES = [
  ["a fence the definition-list plugin makes",
    "Term\n: ```tb\n  v = Items[1](a, b)\n  ```\n"],
  ["an admonition written inside a fence the definition-list plugin makes",
    "Term\n: ```md\n  > [!NOTE]\n  > body\n  ```\n"],
];

// The dash normaliser: a source, what the tool must make of it, and how many
// separator, em-dash and en-dash replacements it counts. Its own line scan
// closed no fence, because the closing test ended in `$` and every line still
// carried its ending, so after a page's first fence it converted nothing; the
// first probe is that shape. The scan also never saw a fence indented four
// spaces or more, or behind `> ` or `: `, an indented code block or an HTML
// block, and the typographer converts none of them.
const DASH_PROBES = [
  ["a fence after an earlier fence, with CRLF and lone CR endings",
    "```tb\r\na \u{2014} b\r\n```\r\n\r\nc \u{2014} d\re \u{2013} f\r\n",
    "```tb\r\na \u{2014} b\r\n```\r\n\r\nc --- d\re -- f\r\n", "0/1/1"],
  ["a doubled-backtick code span holding a single backtick",
    "x ``a \u{2014} `b` c`` y \u{2013} z\n", "x ``a \u{2014} `b` c`` y -- z\n", "0/0/1"],
  ["a fence in a nested list item, five spaces in",
    "1. a\n\n   - b\n\n     ```tb\n     x \u{2014} y\n     ```\n",
    "1. a\n\n   - b\n\n     ```tb\n     x \u{2014} y\n     ```\n", "0/0/0"],
  ["a fence inside an admonition",
    "> [!NOTE]\n> ```tb\n> a \u{2014} b\n> ```\n> c \u{2014} d\n",
    "> [!NOTE]\n> ```tb\n> a \u{2014} b\n> ```\n> c --- d\n", "0/1/0"],
  ["an indented code block and an HTML block",
    "text\n\n    a \u{2014} b\n\n<div>\nc \u{2014} d\n</div>\n",
    "text\n\n    a \u{2014} b\n\n<div>\nc \u{2014} d\n</div>\n", "0/0/0"],
  ["a fence the definition-list plugin makes",
    "Term\n: ```tb\n  a \u{2014} b\n  ```\n", "Term\n: ```tb\n  a \u{2014} b\n  ```\n", "0/0/0"],
  ["a See Also separator, then an em-dash in prose",
    "- [X](X) \u{2014} one \u{2014} two\n", "- [X](X) -- one --- two\n", "1/1/0"],
];

// The regions blockRegions reports, in a form assert can compare at a glance.
const regionsOf = (src, options) => blockRegions(src, options).map((r) => `${r.type} ${r.start}-${r.end}`);

// A line's code-span segments, code in braces, segments joined by "|".
const spansOf = (line) => splitCodeSpans(line).map((s) => (s.code ? `{${s.text}}` : s.text)).join("|");

// One per shape the scanner has to get right: an empty line, none, runs of one,
// two and four, an unmatched run, runs of another length inside a span, spans
// side by side and at either end of the line, and three lengths on one line.
const CODE_SPAN_CASES = [
  ["", ""],
  ["no backticks here", "no backticks here"],
  ["a `b` c", "a |{`b`}| c"],
  ["``a ` b``", "{``a ` b``}"],
  ["x ````y```` z", "x |{````y````}| z"],
  ["a ` b", "a ` b"],
  ["`a``b`", "{`a``b`}"],
  ["``a`b``", "{``a`b``}"],
  ["`a` `b`", "{`a`}| |{`b`}"],
  ["`a`x`b`", "{`a`}|x|{`b`}"],
  ["`x` at the start", "{`x`}| at the start"],
  ["at the end `x`", "at the end |{`x`}"],
  ["``", "``"],
  ["` `", "{` `}"],
  ["``a`", "``a`"],
  ["`a` ``b`` ```c```", "{`a`}| |{``b``}| |{```c```}"],
];

// Each probe throws an assert.AssertionError when the module answers wrongly.
const MODULE_PROBES = [
  // A3-1. CommonMark refuses a backtick in a backtick fence's info string, so
  // this opens no fence and the admonition is prose. maskCodeRegions masked it
  // as a fence while stashCodeFences did not, so one rewrite saw code where
  // the next saw prose.
  ["a backtick in a backtick fence's info string opens no fence", () => {
    const src = "```abc`def\n> [!NOTE]\n> body\n";
    assert.deepEqual(regionsOf(src), []);
    assert.equal(maskCode(src).masked, src);
    assert.deepEqual(regionsOf("~~~abc`def\nx\n~~~\n"), ["fence 0-3"]);
  }],
  ["a fence inside a blockquote is masked whole, markers and all", () => {
    const src = "> text\n> ```tb\n> *** x ***\n> ```\n";
    assert.deepEqual(regionsOf(src), ["fence 1-4"]);
    const { masked, restore } = maskCode(src);
    assert.equal(masked, "> text\n`\u0000CM0\u0000`\n");
    assert.equal(restore(masked), src);
  }],
  ["a fence inside a list item, and inside a blockquote inside one", () => {
    assert.deepEqual(regionsOf("- item\n\n  ```tb\n  x\n  ```\n"), ["fence 2-5"]);
    assert.deepEqual(regionsOf("- item\n\n  > ```tb\n  > x\n  > ```\n"), ["fence 2-5"]);
  }],
  ["an indented code block is masked only when asked", () => {
    const src = "text\n\n    *** x ***\n";
    assert.deepEqual(regionsOf(src), ["code_block 2-3"]);
    assert.equal(maskCode(src).masked, src);
    assert.equal(maskCode(src, { indented: true }).masked, "text\n\n`\u0000CM0\u0000`\n");
  }],
  ["the parser a caller passes decides what is a block", () => {
    // Only a parser with the site's definition-list plugin sees a fence after
    // `: `. A bare one reads the closing marker as an opener instead.
    const src = "Term\n: ```tb\n  x\n  ```\n";
    assert.deepEqual(regionsOf(src), ["fence 3-4"]);
    assert.deepEqual(regionsOf(src, { md: new MarkdownIt({ html: true }).use(deflist) }), ["fence 1-4"]);
  }],
  ["code spans: sixteen shapes", () => {
    for (const [line, want] of CODE_SPAN_CASES) assert.equal(spansOf(line), want, JSON.stringify(line));
  }],
  ["CRLF and lone CR line endings come back as they went in", () => {
    const src = "a\r\n\r\n```tb\r\n*** x ***\r\n```\r\nb `c` d\r\n";
    assert.deepEqual(regionsOf(src), ["fence 2-5"]);
    const { masked, restore } = maskCode(src);
    assert.equal(masked, "a\r\n\r\n`\u0000CM0\u0000`\r\nb `\u0000CM1\u0000` d\r\n");
    assert.equal(restore(masked), src);
    assert.equal(mapLines("a\r\nb\nc\rd", (s) => s.toUpperCase()), "A\r\nB\nC\rD");
    assert.deepEqual(regionsOf("x\r```tb\ry\r```\rz"), ["fence 1-4"]);
  }],
  ["a fenced --- does not start a section", () => {
    const src = "top\n---\n```yaml\nk: v\n---\n```\ntail\n";
    assert.deepEqual(splitOnMarker(src, (line) => line === "---"), [
      { marker: null, start: 0, lines: ["top"] },
      { marker: "---", start: 1, lines: ["```yaml", "k: v", "---", "```", "tail"] },
    ]);
  }],
  ["frontmatter that markdown-it would read as a heading", () => {
    const src = "---\ntitle: X\npermalink: /y\n---\n\n# Heading\n";
    assert.deepEqual(parseFrontmatter(src), { data: { title: "X", permalink: "/y" }, content: "\n# Heading\n" });
  }],
  ["frontmatter behind a BOM, and content with CRLF endings", () => {
    assert.deepEqual(parseFrontmatter("\u{FEFF}---\ntitle: X\n---\nbody\n"), { data: { title: "X" }, content: "body\n" });
    assert.deepEqual(parseFrontmatter("---\r\ntitle: X\r\n---\r\nbody\r\n"), { data: { title: "X" }, content: "body\r\n" });
    assert.deepEqual(parseFrontmatter("---\n# only a comment\n---\n"), { data: {}, content: "" });
  }],
  ["what is not frontmatter, and what is broken frontmatter", () => {
    assert.equal(parseFrontmatter("----\nx: 1\n----\n"), null);
    assert.equal(parseFrontmatter("text\n---\nx: 1\n---\n"), null);
    assert.throws(() => parseFrontmatter("---\nx: 1\n"), /never closed/);
    assert.throws(() => parseFrontmatter("---\n- a list\n---\n"), /not a mapping/);
    assert.throws(() => parseFrontmatter("---\nok: 1\nbad: [\n---\n"), /\(4:1\)/);
  }],
  ["an unquoted value that ends in # is reported, a quoted one is not", () => {
    assert.equal(parseFrontmatter("---\ntitle: Input #\n---\n").data.title, "Input");
    const src = [
      "\u{FEFF}---",
      "title: Input #",
      "parent: Statements",
      'quoted: "Write #"',
      "lang: C#  ",
      "comment: x # a note",
      "# title: y #",
      "list:",
      "  - Line Input #",
      "  - 'kept #'",
      "  - key: v #",
      '  - key: "v #"',
      "text: |",
      "  a line #",
      "",
      "  - key: v #",
      "after: z #",
      'tail: "quoted" #',
      "---",
      "body: b #",
    ].join("\r\n");
    assert.deepEqual(unquotedHashValues(src).map((f) => f.line), [2, 5, 9, 11, 17]);
    assert.equal(unquotedHashValues(src)[0].text, "title: Input #");
    assert.deepEqual(unquotedHashValues("body: b #\n"), []);
    assert.throws(() => unquotedHashValues("---\nx: 1 #\n"), /never closed/);
  }],
];

// The count validator asks the same module what is code, with the site's
// parser, and must name the line of the file. One page through the real
// discover and validateCountNames: CRLF frontmatter, count names in a fence, a
// code span and a definition-list fence, none of them references, then an
// unknown name in prose on line 16. Counted in the masked content after the
// frontmatter, where each fence is one line, it was reported at line 9.
const COUNT_PAGE = [
  "---", "title: T", "---", "",
  "```tb", "{{tbdocs:a}}", "```", "",
  "x `{{tbdocs:b}}` y", "",
  "T", ": ```", "  {{tbdocs:c}}", "  ```", "",
  "prose {{tbdocs:d}}", "",
].join("\r\n");

async function countProbe() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "check-code-regions-"));
  try {
    await fs.writeFile(path.join(dir, "x.md"), COUNT_PAGE);
    const { pages } = await discover(dir);
    const problems = validateCountNames(pages, { pages: 1 }, siteMd);
    assert.deepEqual(problems.map((p) => p.split("\n").slice(0, 2).join(" ")),
      ["x.md:16   unknown count name {{tbdocs:d}}"]);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

// discover warns about a frontmatter value left unquoted that ends in `#`,
// naming the page and the line, and reads the page as YAML does: the `#` after
// a space is a comment. A quoted value, and a `#` in the content, say nothing.
async function hashProbe() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "check-code-regions-"));
  const warn = console.warn;
  const warned = [];
  console.warn = (message) => warned.push(message);
  try {
    await fs.writeFile(path.join(dir, "x.md"), '---\r\ntitle: Input #\r\nparent: "Write #"\r\n---\r\nbody #\r\n');
    const { pages } = await discover(dir);
    assert.equal(pages[0].frontmatter.title, "Input");
    assert.deepEqual(warned.map((message) => message.split(": an unquoted")[0]), ["discover: x.md:2"]);
  } finally {
    console.warn = warn;
    await fs.rm(dir, { recursive: true, force: true });
  }
}

const DISCOVER_PROBES = [
  ["the count validator's references and lines", countProbe],
  ["discover's warning about an unquoted value that ends in #", hashProbe],
];

async function main(argv) {
  const verbose = argv.includes("--verbose");

  if (argv.includes("--self-test")) {
    // Prove the comparator detects corruption by corrupting a region itself.
    const src = "```tb\nIf x Then\n    y\nEnd If\n```\n";
    const before = codeRegions(src);
    const after = codeRegions(src.replace("    y", "y"));
    const detected = before[0] !== after[0];
    console.log(`${detected ? "ok  " : "FAIL"} comparator detects a de-indented fence body`);
    process.exit(detected ? 0 : 1);
  }

  let failed = 0;

  for (const [name, src] of PROBES) {
    const findings = compare(src);
    if (findings.length) {
      failed++;
      console.log(`FAIL  probe: ${name}`);
      for (const f of findings) {
        console.log(`        before ${JSON.stringify(f.before)}`);
        console.log(`        after  ${JSON.stringify(f.after)}`);
      }
    }
  }
  for (const [name, src] of ADMONITION_PROBES) {
    if (applyRewrites(src).includes("markdown-alert")) continue;
    failed++;
    console.log(`FAIL  probe: ${name}`);
    console.log(`        the admonition was not rewritten -- the chain`);
    console.log(`        mistook the prose around it for code`);
  }
  for (const [name, src] of UNCHANGED_PROBES) {
    const after = applyRewrites(src);
    if (after === src) continue;
    failed++;
    console.log(`FAIL  probe: ${name}`);
    console.log(`        before ${JSON.stringify(src)}`);
    console.log(`        after  ${JSON.stringify(after)}`);
  }
  for (const [name, src, want, counts] of DASH_PROBES) {
    const r = convertText(src, siteMd);
    const got = `${r.sep}/${r.em}/${r.en}`;
    if (r.text === want && got === counts) continue;
    failed++;
    console.log(`FAIL  probe: ${name}`);
    console.log(`        want ${JSON.stringify(want)} (${counts})`);
    console.log(`        got  ${JSON.stringify(r.text)} (${got})`);
  }
  // Anything but a failed assertion is the gate breaking, and goes to exit 2.
  for (const [name, probe] of MODULE_PROBES) {
    try {
      probe();
    } catch (err) {
      if (!(err instanceof assert.AssertionError)) throw err;
      failed++;
      console.log(`FAIL  probe: ${name}`);
      for (const line of err.message.split("\n")) console.log(`        ${line}`);
    }
  }
  for (const [name, probe] of DISCOVER_PROBES) {
    try {
      await probe();
    } catch (err) {
      if (!(err instanceof assert.AssertionError)) throw err;
      failed++;
      console.log(`FAIL  probe: ${name}`);
      for (const line of err.message.split("\n")) console.log(`        ${line}`);
    }
  }

  if (!failed) {
    console.log(`ok    ${PROBES.length} probes: no rewrite alters a code region`);
    console.log(`ok    ${ADMONITION_PROBES.length} probes: a rewrite still fires on prose beside code`);
    console.log(`ok    ${UNCHANGED_PROBES.length} probe(s): the chain leaves alone what the site's parser calls code`);
    console.log(`ok    ${DASH_PROBES.length} probes: the dash normaliser converts prose and nothing else`);
    console.log(`ok    ${MODULE_PROBES.length} probes: lib/markdown.mjs and lib/frontmatter.mjs`);
    console.log("ok    1 probe: the count validator skips code and names the file's line");
    console.log("ok    1 probe: discover warns about an unquoted value that ends in #");
  }

  const files = await markdownFiles(ROOT);
  let touched = 0;
  let fences = 0;
  for (const rel of files) {
    const src = await fs.readFile(path.join(ROOT, rel), "utf8");
    const parsed = parsedRegions(src);
    const found = regionsOf(src);
    fences += parsed.filter((r) => r.startsWith("fence ")).length;
    if (found.join("\n") !== parsed.join("\n")) {
      failed++;
      console.log(`FAIL  ${rel}: blockRegions finds ${found.length} region(s), the full parse ${parsed.length}`);
      if (verbose) {
        let i = 0;
        while (i < found.length && found[i] === parsed[i]) i++;
        console.log(`        first difference: ${found[i] ?? "none"} against ${parsed[i] ?? "none"}`);
      }
    }
    const findings = compare(src);
    if (!findings.length) continue;
    touched++;
    failed++;
    console.log(`FAIL  ${rel}: ${findings.length} code region(s) altered by a pre-render rewrite`);
    if (verbose) {
      for (const f of findings.slice(0, 3)) {
        console.log(`        before ${JSON.stringify(f.before?.slice(0, 120))}`);
        console.log(`        after  ${JSON.stringify(f.after?.slice(0, 120))}`);
      }
    }
  }

  console.log(
    `check_code_regions: ${files.length} file(s), ${touched} with altered code regions,`
    + ` ${fences} fence(s) in the full parse` + (failed ? "" : " -- clean"),
  );
  process.exit(failed ? 1 : 0);
}

// A crash is the harness failing, not a finding: exit 2, as Extending.md's
// gate conventions require, so it cannot read as an altered code region.
main(process.argv.slice(2)).catch((err) => {
  console.error(err);
  process.exit(2);
});
