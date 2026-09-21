#!/usr/bin/env node
// Gate: no pre-render source rewrite may alter the contents of a code region.
//
//     node scripts/check_code_regions.mjs              # the gate
//     node scripts/check_code_regions.mjs --verbose    # per-finding detail
//     node scripts/check_code_regions.mjs --self-test  # prove it still detects
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
// KNOWN GAP, stated rather than hidden: an indented (4-space) code block is
// compared as a `code_block` token, so corruption of one IS caught here -- but
// maskCodeRegions in render.mjs deliberately does not protect indented blocks,
// because distinguishing one from a list-item continuation needs block context
// a pre-render pass does not have. So a future rewrite that damages an indented
// block will be reported by this gate and will need fixing at the rewrite, not
// by widening the mask.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import MarkdownIt from "markdown-it";
import { applyPreRenderRewrites } from "../builder/render.mjs";

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

// The real chain, imported from render.mjs rather than reconstructed here.
// That is what makes this gate mean something: unmasking any one of the
// rewrites changes what this function does, and the comparison below sees it.
const applyRewrites = applyPreRenderRewrites;

async function markdownFiles(root) {
  const entries = await fs.readdir(root, { recursive: true, withFileTypes: true });
  const rels = [];
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".md")) continue;
    const abs = path.join(e.parentPath ?? e.path, e.name);
    const rel = path.relative(root, abs).split(path.sep).join("/");
    if (rel.startsWith("_site") || rel.startsWith("_serve") || rel.startsWith("_pdf")) continue;
    rels.push(rel);
  }
  return rels.sort();
}

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
  if (!failed) console.log(`ok    ${PROBES.length} probes: no rewrite alters a code region`);

  const files = await markdownFiles(ROOT);
  let touched = 0;
  for (const rel of files) {
    const src = await fs.readFile(path.join(ROOT, rel), "utf8");
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
    `check_code_regions: ${files.length} file(s), ${touched} with altered code regions`
    + (failed ? "" : " -- clean"),
  );
  process.exit(failed ? 1 : 0);
}

main(process.argv.slice(2)).catch((err) => {
  console.error(err);
  process.exit(1);
});
