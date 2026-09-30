// Unit tests for builder/render.mjs's markdown-it plugins, one plugin's
// behaviour at a time, through the site's own createMarkdownIt.
//
// The build compares whole pages, so a plugin that goes wrong only on input
// the corpus does not hold passes it: kramdownEllipsisPlugin shortened every
// dot run after a `..` or a code span in the same paragraph, and no page had
// one. These pin such inputs.
//
// Runs with a bare `node --test test/render.test.mjs`: no tree, no build.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createMarkdownIt } from "../builder/render.mjs";

const md = createMarkdownIt({ highlighter: null, linkTables: { byPath: new Map() }, baseurl: "", staticFiles: new Set() });
const inline = (src) => md.renderInline(src, { page: {} });

describe("kramdownEllipsisPlugin", () => {
  const cases = [
    ["three dots", "wait...", "wait…"],
    ["four dots keep the fourth", "wait....", "wait…."],
    ["six dots keep three", "a......", "a…..."],
    ["two dots before a long run", ".. and ....", "… and …."],
    ["several runs in one paragraph", "x.. y... z....", "x… y… z…."],
    ["a code span with dots before a long run", "`x..` y....",
      '<code class="language-plaintext highlighter-rouge">x..</code> y….'],
    ["guillemets before a long run", "..<<....", "…«…."],
    ["dashes before a long run", "a -- b --- c....", "a – b — c…."],
    ["quotes around a long run", '"word...." x', "“word….” x"],
    ["after ? markdown-it's `?..` stands", "?.... x....", "?.. x…."],
  ];
  for (const [name, src, want] of cases) {
    test(name, () => assert.equal(inline(src), want));
  }

  test("an autolink's dots are left as written", () => {
    assert.equal(inline("<https://x.org/a....b> c...."),
      '<a href="https://x.org/a....b">https://x.org/a....b</a> c….');
  });

  test("a private-use U+E000 in the text stays as written", () => {
    assert.ok(inline("\u{E000} a....").includes("\u{E000}"));
  });
});
