// Unit tests for builder/render.mjs's markdown-it plugins, one plugin's
// behaviour at a time, through the site's own createMarkdownIt; and for the
// offline tree's URL rewrite when a link names a file only the website holds
// (builder/offline-rewrite.mjs).
//
// The build compares whole pages, so a plugin that goes wrong only on input
// the corpus does not hold passes it: kramdownEllipsisPlugin shortened every
// dot run after a `..` or a code span in the same paragraph, and no page had
// one. These pin such inputs.
//
// Runs with a bare `node --test test/render.test.mjs`: no tree, no build.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isWebsiteOnlyLink, rewriteHtml, websiteOf } from "../builder/offline-rewrite.mjs";
import { createMarkdownIt } from "../builder/render.mjs";

const md = createMarkdownIt({
  highlighter: null,
  linkTables: { byPath: new Map() },
  baseurl: "",
  staticFiles: new Set(),
});
const inline = (src) => md.renderInline(src, { page: {} });

describe("kramdownEllipsisPlugin", () => {
  const cases = [
    ["three dots", "wait...", "wait…"],
    ["four dots keep the fourth", "wait....", "wait…."],
    ["six dots keep three", "a......", "a…..."],
    ["two dots before a long run", ".. and ....", "… and …."],
    ["several runs in one paragraph", "x.. y... z....", "x… y… z…."],
    [
      "a code span with dots before a long run",
      "`x..` y....",
      '<code class="language-plaintext highlighter-rouge">x..</code> y….',
    ],
    ["guillemets before a long run", "..<<....", "…«…."],
    ["dashes before a long run", "a -- b --- c....", "a – b — c…."],
    ["quotes around a long run", '"word...." x', "“word….” x"],
    ["after ? markdown-it's `?..` stands", "?.... x....", "?.. x…."],
  ];
  for (const [name, src, want] of cases) {
    test(name, () => assert.equal(inline(src), want));
  }

  test("an autolink's dots are left as written", () => {
    assert.equal(inline("<https://x.org/a....b> c...."), '<a href="https://x.org/a....b">https://x.org/a....b</a> c….');
  });

  test("a private-use U+E000 in the text stays as written", () => {
    assert.ok(inline("\u{E000} a....").includes("\u{E000}"));
  });
});

// The offline tree's URL rewrite (builder/offline-rewrite.mjs): a link to a
// file the offline tree holds becomes page-relative; one to a file only the
// website holds becomes the website's absolute URL; one to neither is a miss.
describe("rewriteHtml with a website behind the offline tree", () => {
  const offline = new Set(["/a/Page.html", "/a/b/Other.html", "/a/b/inner.txt"]);
  const online = new Set([...offline, "/a/downloads/File.zip", "/a/Space Name.zip"]);
  const website = websiteOf({ url: "https://site.example/" }, online);
  const rewrite = (html, baseurl = "", site = website) =>
    rewriteHtml(
      html,
      "a",
      ["a"],
      offline,
      { rawResolution: new Map(), seg: new Map(), result: new Map() },
      baseurl,
      site,
    );

  test("a link the offline tree holds is page-relative, as without a website", () => {
    const r = rewrite('<a href="/a/b/Other">x</a><a href="b/inner.txt">y</a>');
    assert.equal(r.rewritten, '<a href="b/Other.html">x</a><a href="b/inner.txt">y</a>');
    assert.equal(r.misses, 0);
  });

  test("a link only the online tree holds is the website's URL, and is no miss", () => {
    const r = rewrite('<a href="downloads/File.zip" download>x</a><a href="/a/downloads/File.zip?v=1#top">y</a>');
    assert.equal(
      r.rewritten,
      '<a href="https://site.example/a/downloads/File.zip" download>x</a>' +
        '<a href="https://site.example/a/downloads/File.zip?v=1#top">y</a>',
    );
    assert.equal(r.misses, 0);
  });

  test("the website's URL carries the base path, and encodes what a path must", () => {
    const r = rewrite('<a href="/base/a/downloads/File.zip">x</a><a href="Space Name.zip">y</a>', "/base");
    assert.equal(
      r.rewritten,
      '<a href="https://site.example/base/a/downloads/File.zip">x</a>' +
        '<a href="https://site.example/base/a/Space%20Name.zip">y</a>',
    );
    assert.equal(r.misses, 0);
  });

  test("a link in neither tree is a miss and is left as written", () => {
    const r = rewrite('<a href="/a/none/File.zip">x</a><a href="missing.zip">y</a>');
    assert.equal(r.rewritten, '<a href="/a/none/File.zip">x</a><a href="missing.zip">y</a>');
    assert.equal(r.misses, 2);
    assert.deepEqual(r.missed, ["/a/none/File.zip", "missing.zip"]);
  });

  test("with no website to point at, a link only the online tree holds is a miss", () => {
    const r = rewrite('<a href="downloads/File.zip">x</a>', "", websiteOf({}, online));
    assert.equal(r.misses, 1);
    assert.equal(r.rewritten, '<a href="downloads/File.zip">x</a>');
  });

  test("a link inside a code sample is left alone", () => {
    const html = '<code>href="downloads/File.zip"</code>';
    assert.equal(rewrite(html).rewritten, html);
  });

  test("only a website link to a file the offline tree lacks is expected there", () => {
    const state = { sitePaths: offline, website, baseurl: "" };
    assert.equal(isWebsiteOnlyLink("https://site.example/a/downloads/File.zip", state), true);
    assert.equal(isWebsiteOnlyLink("https://site.example/a/Page", state), false, "the offline tree holds the page");
    assert.equal(isWebsiteOnlyLink("https://site.example/a/none/File.zip", state), false, "neither tree holds it");
    assert.equal(isWebsiteOnlyLink("https://other.example/a/downloads/File.zip", state), false);
  });
});
