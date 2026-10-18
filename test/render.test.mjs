// Unit tests for builder/render.mjs's markdown-it plugins, one plugin's
// behaviour at a time, through the site's own createMarkdownIt; and for the
// offline tree's URL rewrite when a link names a file only the website holds
// (builder/offline-rewrite.mjs); and for a picture in two themes, X.png with
// X.light.png beside it (themePairPlugin, and the book's lightOnly from
// builder/theme-pictures.mjs); and for a diagram's SVG as it is inlined, its
// boxes linking or not (builder/inline-diagram.mjs), on what Graphviz itself
// writes; and for a callout's label, `> [!WARNING] BETA 1005`
// (lib/callout-labels.mjs).
//
// The build compares whole pages, so a plugin that goes wrong only on input
// the corpus does not hold passes it: kramdownEllipsisPlugin shortened every
// dot run after a `..` or a code span in the same paragraph, and no page had
// one. These pin such inputs.
//
// Runs with a bare `node --test test/render.test.mjs`: no tree, no build.

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { Graphviz } from "@hpcc-js/wasm-graphviz";
import { stripXmlPrologue } from "../builder/dot.mjs";
import { inlineDiagram } from "../builder/inline-diagram.mjs";
import { isWebsiteOnlyLink, rewriteHtml, websiteOf } from "../builder/offline-rewrite.mjs";
import { assignPackageVersions, calloutLabelsOf, parseCalloutLabel } from "../lib/callout-labels.mjs";
import { applyPreRenderRewrites, createMarkdownIt, initHighlighter } from "../builder/render.mjs";
import {
  lightOnly,
  pairSizes,
  pictureSvgOutputs,
  pngPictures,
  unpairedLightPictures,
} from "../builder/theme-pictures.mjs";
import { encodePng } from "../scripts/lib/png.mjs";

const md = createMarkdownIt({
  highlighter: null,
  linkTables: { byPath: new Map() },
  baseurl: "",
  staticFiles: new Set(),
});
const inline = (src) => md.renderInline(src, { page: {} });

// A picture's figure (figurePlugin) as the paragraph it took the place of: the pairing
// tests are about the images in it, and the figure has tests of its own. A diagram's
// figure, whose container carries the diagram's source, is left as it is.
const bare = (html) =>
  html.replace(
    /^<div class="fig-wrap"[^>]*><div class="fig-controls">[\s\S]*?<\/div><div class="fig-container">([\s\S]*)<\/div><\/div>$/,
    "<p>$1</p>",
  );

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
describe("stripHtmlCommentsPlugin", async () => {
  const withFences = createMarkdownIt({
    highlighter: await initHighlighter(),
    linkTables: { byPath: new Map() },
    baseurl: "",
    staticFiles: new Set(),
  });
  // The page as the build renders it: the pre-render rewrites first, which join a
  // comment line to the paragraph above it.
  const render = (src) => withFences.render(applyPreRenderRewrites(src, withFences), { page: { srcRel: "A.md" } });

  const cases = [
    ["a comment block between paragraphs", "before\n\n<!-- SHOT: x -->\n\nafter\n", "<p>before</p>\n<p>after</p>\n"],
    ["a multi-line comment block", "before\n\n<!--\nnote\nmore\n-->\n\nafter\n", "<p>before</p>\n<p>after</p>\n"],
    ["a comment line under a paragraph", "text\n<!-- note -->\n\nnext\n", "<p>text</p>\n<p>next</p>\n"],
    ["a comment inside a paragraph", "a <!-- c --> b\n", "<p>a b</p>\n"],
    ["a comment at the end of a paragraph", "a <!-- c -->\n", "<p>a</p>\n"],
    ["a comment in a heading", "## Head <!-- c -->\n", '<h2 id="head-">Head</h2>\n'],
    [
      "a comment inside a raw HTML block",
      "<div>\n<!-- c -->\n<p>x</p> <!-- d -->\n</div>\n",
      "<div>\n<p>x</p>\n</div>\n",
    ],
    ["a comment in a list item", "- one\n  <!-- c -->\n- two\n", "<ul>\n<li>one</li>\n<li>two</li>\n</ul>\n"],
    [
      "a comment before a callout",
      "<!-- test: A.B -->\n> [!NOTE] BETA 1010\n> body\n",
      (html) => !html.includes("<!--") && html.includes("<p>body</p>"),
    ],
    [
      "a comment inside a callout",
      "> [!NOTE] BETA 1010\n> <!-- c -->\n> body\n",
      (html) => !html.includes("<!--") && html.includes("<p>body</p>"),
    ],
    [
      "a raw script element keeps its text",
      "<script>\n<!-- x\n// -->\n</script>\n",
      "<script>\n<!-- x\n// -->\n</script>\n",
    ],
    ["an unterminated comment is not one", "<!-- open\n\nafter\n", "<!-- open\n\nafter\n"],
  ];
  for (const [name, src, want] of cases) {
    test(name, () => {
      const html = render(src);
      if (typeof want === "function") assert.ok(want(html), html);
      else assert.equal(html, want);
    });
  }

  test("a fence and a code span show a comment as text", () => {
    const html = render("```html\n<!-- keep -->\n```\n\n`<!-- keep -->` and <!-- go -->done\n");
    assert.equal(html.match(/&lt;!-- keep --&gt;/g).length, 2);
    assert.ok(!html.includes("go"), html);
  });
});

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

// A picture in two themes: the page names X.png, and the build writes the light picture and
// the dark one when X.light.png is among the static files, the book the light one alone.
describe("themePairPlugin and lightOnly", () => {
  const paired = createMarkdownIt({
    highlighter: null,
    linkTables: { byPath: new Map(), byUrl: new Map(), byRedirect: new Map() },
    baseurl: "",
    staticFiles: new Set([
      "IDE/Images/A.png",
      "IDE/Images/A.light.png",
      "IDE/Images/B.png",
      "IDE/Images/S p.png",
      "IDE/Images/S p.light.png",
    ]),
  });
  const render = (src) => bare(paired.render(src, { page: { srcRel: "IDE/Page.md" } }).trim());
  const pair = (src, alt, attrs) =>
    `<img src="/IDE/Images/${src}.light.png" alt="${alt}"${attrs} class="pic-light" loading="lazy" />` +
    `<img src="/IDE/Images/${src}.png" alt="${alt}"${attrs} class="pic-dark" loading="lazy" />`;

  test("a picture with a light sibling is two lazy images, light first, with one alt and size", () => {
    assert.equal(
      render('![The *File* menu](Images/A.png){:width="10" height="5"}'),
      `<p>${pair("A", "The File menu", ' width="10" height="5"')}</p>`,
    );
  });

  test("a picture with no light sibling is one image, as written", () => {
    assert.equal(
      render('![x](Images/B.png){:width="10" height="5"}'),
      '<p><img src="/IDE/Images/B.png" alt="x" width="10" height="5" /></p>',
    );
  });

  test("a picture in a heading, and one whose name is URL-encoded, are paired the same way", () => {
    assert.equal(render("## Folder ![i](Images/A.png)"), `<h2 id="folder-">Folder ${pair("A", "i", "")}</h2>`);
    assert.equal(
      render("![s](Images/S%20p.png)"),
      `<p><img src="/IDE/Images/S%20p.light.png" alt="s" class="pic-light" loading="lazy" />` +
        '<img src="/IDE/Images/S%20p.png" alt="s" class="pic-dark" loading="lazy" /></p>',
    );
  });

  test("the attributes the page gives are copied to both, a class of its own kept beside the theme's", () => {
    assert.equal(
      render('![x](Images/A.png){: .wide width="10" title="t"}'),
      '<p><img src="/IDE/Images/A.light.png" alt="x" class="wide pic-light" width="10" title="t" loading="lazy" />' +
        '<img src="/IDE/Images/A.png" alt="x" class="wide pic-dark" width="10" title="t" loading="lazy" /></p>',
    );
  });

  test("a light picture of another size is shown at the page's scale of its own size", () => {
    const sized = createMarkdownIt({
      highlighter: null,
      linkTables: { byPath: new Map(), byUrl: new Map(), byRedirect: new Map() },
      baseurl: "",
      staticFiles: new Set(["IDE/Images/A.png", "IDE/Images/A.light.png"]),
      pictureSizes: { "IDE/Images/A.light.png": [2432, 62, 2456, 70] },
    });
    assert.equal(
      bare(sized.render('![t](Images/A.png){:width="1228" height="35"}', { page: { srcRel: "IDE/Page.md" } }).trim()),
      '<p><img src="/IDE/Images/A.light.png" alt="t" width="1216" height="31" class="pic-light" loading="lazy" />' +
        '<img src="/IDE/Images/A.png" alt="t" width="1228" height="35" class="pic-dark" loading="lazy" /></p>',
    );
  });

  test("a link to a paired picture is two links, each opening its theme's picture", () => {
    assert.equal(
      render("[Full size](Images/A.png)"),
      '<p><a href="/IDE/Images/A.light.png" class="pic-light">Full size</a>' +
        '<a href="/IDE/Images/A.png" class="pic-dark">Full size</a></p>',
    );
  });

  test("the book keeps the light picture alone, as a plain image, and the light link", () => {
    assert.equal(
      lightOnly(render('![x](Images/A.png){:width="10" height="5"} and [Full size](Images/A.png)')),
      '<p><img src="/IDE/Images/A.light.png" alt="x" width="10" height="5" /> and ' +
        '<a href="/IDE/Images/A.light.png">Full size</a></p>',
    );
    assert.equal(
      lightOnly(render("![x](Images/A.png){: .wide}")),
      '<p><img src="/IDE/Images/A.light.png" alt="x" class="wide" /></p>',
    );
    const unpaired = render("![x](Images/B.png)");
    assert.equal(lightOnly(unpaired), unpaired);
  });

  test("the book leaves code that shows the markup as written", () => {
    const html = '<p><code>&lt;img class="pic-dark" src="A.png" /&gt;</code></p><pre><a class="pic-dark">x</a></pre>';
    assert.equal(lightOnly(html), html);
  });

  test("a page that names a light picture itself is refused, in markdown or raw HTML", () => {
    for (const src of [
      "![x](Images/A.light.png)",
      "[x](Images/A.light.png)",
      "[x](/IDE/Images/A.light.png#top)",
      '<img src="Images/A.light.png">',
      'Text <a href="Images/A.light.png">x</a>.',
    ]) {
      assert.throws(() => render(src), /IDE\/Page\.md: .* names a light picture directly/, src);
    }
  });

  test("a light picture named in code is not a link, and is not refused", () => {
    assert.match(render("`![x](Images/A.light.png)`"), /<code[^>]*>!\[x\]\(Images\/A\.light\.png\)<\/code>/);
  });

  test("the two pictures' sizes are read from their headers", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "theme-pictures-"));
    try {
      const png = (w, h) => encodePng({ width: w, height: h, rgba: new Uint8Array(w * h * 4) });
      writeFileSync(path.join(dir, "A.png"), png(6, 4));
      writeFileSync(path.join(dir, "A.light.png"), png(5, 3));
      writeFileSync(path.join(dir, "B.light.png"), png(1, 1));
      const files = ["A.png", "A.light.png", "B.light.png"].map((f) => ({
        srcRel: `x/${f}`,
        srcPath: path.join(dir, f),
      }));
      assert.deepEqual({ ...(await pairSizes(files)) }, { "x/A.light.png": [5, 3, 6, 4] });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a light picture with no dark picture beside it is found", () => {
    assert.deepEqual(unpairedLightPictures(["a/X.png", "a/X.light.png", "b/Y.light.png", "a/Z.light.png"]), [
      "a/Z.light.png",
      "b/Y.light.png",
    ]);
  });
});

// A picture also drawn as SVG (shoot_docs.mjs --svg): each theme shows its SVG where there is
// one, unless the attribute block says png; a picture's SVG is an image, never inlined the
// way a diagram's SVG is.
describe("themePairPlugin with pictures drawn as SVG", () => {
  const md = createMarkdownIt({
    highlighter: null,
    linkTables: { byPath: new Map(), byUrl: new Map(), byRedirect: new Map() },
    baseurl: "",
    staticFiles: new Set([
      "IDE/Images/A.png",
      "IDE/Images/A.light.png",
      "IDE/Images/A.svg",
      "IDE/Images/A.light.svg",
      "IDE/Images/B.png",
      "IDE/Images/B.svg",
      "IDE/Images/C.png",
      "IDE/Images/C.light.png",
      "IDE/Images/C.svg",
      "IDE/Images/D.svg",
    ]),
    pictureSizes: { "IDE/Images/A.light.png": [12, 6, 20, 10] },
    svgContents: new Map([
      ["IDE/Images/B.svg", "<svg/>"],
      ["IDE/Images/D.svg", "<svg/>"],
    ]),
  });
  const render = (src) => bare(md.render(src, { page: { srcRel: "IDE/Page.md" } }).trim());

  test("each theme's SVG takes its PNG's place, the light one still sized by the PNGs", () => {
    assert.equal(
      render('![x](Images/A.png){:width="10" height="5"}'),
      '<p><img src="/IDE/Images/A.light.svg" alt="x" width="6" height="3" class="pic-light" loading="lazy" />' +
        '<img src="/IDE/Images/A.svg" alt="x" width="10" height="5" class="pic-dark" loading="lazy" /></p>',
    );
  });

  test("a theme with no SVG keeps its PNG", () => {
    assert.equal(
      render("![x](Images/C.png)"),
      '<p><img src="/IDE/Images/C.light.png" alt="x" class="pic-light" loading="lazy" />' +
        '<img src="/IDE/Images/C.svg" alt="x" class="pic-dark" loading="lazy" /></p>',
    );
  });

  test("a picture with no light sibling gets its SVG, as an image rather than inlined", () => {
    assert.equal(
      render('![x](Images/B.png){:width="10"}'),
      '<p><img src="/IDE/Images/B.svg" alt="x" width="10" /></p>',
    );
  });

  test("png in the attribute block keeps the PNGs, and is not written out", () => {
    assert.equal(
      render('![x](Images/A.png){:width="10" height="5" png}'),
      '<p><img src="/IDE/Images/A.light.png" alt="x" width="6" height="3" class="pic-light" loading="lazy" />' +
        '<img src="/IDE/Images/A.png" alt="x" width="10" height="5" class="pic-dark" loading="lazy" /></p>',
    );
    assert.equal(render("![x](Images/B.png){: png}"), '<p><img src="/IDE/Images/B.png" alt="x" /></p>');
  });

  test("a link to the picture opens each theme's SVG", () => {
    assert.equal(
      render("[Full size](Images/A.png)"),
      '<p><a href="/IDE/Images/A.light.svg" class="pic-light">Full size</a>' +
        '<a href="/IDE/Images/A.svg" class="pic-dark">Full size</a></p>',
    );
  });

  test("an SVG with no PNG beside it is a diagram, and is still inlined", () => {
    assert.match(render("![d](Images/D.svg)"), /fig-wrap" data-kind="diagram"/);
  });

  test("a page that names a light SVG itself is refused", () => {
    assert.throws(() => render("![x](Images/A.light.svg)"), /names a light picture directly/);
  });

  test("an output that shows PNGs gets each picture's SVG named back as its PNG, and nothing else", () => {
    const files = new Set(["IDE/Images/A.png", "IDE/Images/A.light.png", "IDE/Images/A.svg", "IDE/Images/D.svg"]);
    const html =
      '<p><img src="/b/IDE/Images/A.light.svg" class="pic-light" /><img src="/b/IDE/Images/A.svg" class="pic-dark" />' +
      '<a href="/b/IDE/Images/A.svg#top">Full size</a><img src="/b/IDE/Images/D.svg" /></p>' +
      '<pre><code>src="/b/IDE/Images/A.svg"</code></pre>';
    assert.equal(
      pngPictures(html, files, "/b"),
      '<p><img src="/b/IDE/Images/A.light.png" class="pic-light" /><img src="/b/IDE/Images/A.png" class="pic-dark" />' +
        '<a href="/b/IDE/Images/A.png#top">Full size</a><img src="/b/IDE/Images/D.svg" /></p>' +
        '<pre><code>src="/b/IDE/Images/A.svg"</code></pre>',
    );
  });

  test("picture_svg says which outputs show the SVGs, each on unless set false", () => {
    assert.deepEqual(pictureSvgOutputs({}), { online: true, offline: true, book: true });
    assert.deepEqual(pictureSvgOutputs({ picture_svg: { offline: false } }), {
      online: true,
      offline: false,
      book: true,
    });
  });
});

describe("callout labels", () => {
  const title = (src, options) => {
    const out = applyPreRenderRewrites(src, md, options);
    return /<p class="markdown-alert-title">.*?<\/svg> (.*?)<\/p>/.exec(out)?.[1];
  };
  const tag = (t) => `<span class="markdown-alert-label">${t}</span>`;

  test("no label is the title alone", () => {
    assert.equal(title("> [!NOTE]\n> body\n"), "Note");
    assert.equal(title("> [!NOTE]   \n> body\n"), "Note");
  });

  test("each item is a tag, the package version first", () => {
    assert.equal(title("> [!WARNING] BETA 1005\n> body\n"), `Warning ${tag("BETA 1005")}`);
    assert.equal(title("> [!NOTE] since BETA 984\n> body\n"), `Note ${tag("since BETA 984")}`);
    assert.equal(
      title("> [!WARNING] BETA 1005, 1.6.151.1\n> body\n", { packageVersion: "1.6.151.1" }),
      `Warning ${tag("1.6.151.1")} ${tag("BETA 1005")}`,
    );
  });

  test("an indented callout keeps its label", () => {
    assert.equal(title("- item\n\n  > [!NOTE] BETA 1005\n  > body\n"), `Note ${tag("BETA 1005")}`);
  });

  test("a label in a code sample is left as written", () => {
    const src = "```md\n> [!NOTE] whatever\n> body\n```\n";
    assert.equal(applyPreRenderRewrites(src, md), src);
  });

  for (const [name, label, why] of [
    ["lower-case beta", "beta 1005", /not a callout label/],
    ["free text", "fixed soon", /not a callout label/],
    ["a three-part version", "1.0.4", /not a callout label/],
    ["two builds", "BETA 1005, since BETA 984", /twice/],
    ["two versions", "1.0.0.1, 1.0.0.2", /twice/],
    ["an empty item", "BETA 1005,", /not a callout label/],
    ["timeless with a build", "timeless, BETA 1005", /stands alone/],
    ["timeless with a version", "1.0.0.4, timeless", /stands alone/],
    ["timeless in capitals", "Timeless", /not a callout label/],
  ]) {
    test(`refused: ${name}`, () => assert.throws(() => title(`> [!NOTE] ${label}\n> body\n`), why));
  }

  test("a package version must be the section's", () => {
    const src = "> [!WARNING] 1.0.0.4\n> body\n";
    assert.equal(title(src, { packageVersion: "1.0.0.4" }), `Warning ${tag("1.0.0.4")}`);
    assert.throws(() => title(src, { packageVersion: "1.0.0.5" }), /section documents 1\.0\.0\.5/);
    assert.throws(() => title(src, { packageVersion: "" }), /no section/);
    // In a package section a callout has a label, and a build alone is one.
    assert.throws(() => title("> [!NOTE]\n> body\n", { packageVersion: "1.0.0.4" }), /has a label: 1\.0\.0\.4/);
    assert.equal(title("> [!NOTE] BETA 1005\n> body\n", { packageVersion: "1.0.0.4" }), `Note ${tag("BETA 1005")}`);
    assert.equal(title("> [!NOTE]\n> body\n", { packageVersion: "" }), "Note");
    // timeless is a label, drawn as nothing, in a package section or out of one.
    for (const packageVersion of ["1.0.0.4", "", undefined])
      assert.equal(
        applyPreRenderRewrites("> [!WARNING] timeless\n> body\n", md, { packageVersion }),
        applyPreRenderRewrites("> [!WARNING]\n> body\n", md),
      );
    // Left out, as the code-region gate's sweep leaves it, it is not checked.
    assert.equal(title(src), `Warning ${tag("1.0.0.4")}`);
  });

  test("parseCalloutLabel reads each kind", () => {
    assert.deepEqual(
      parseCalloutLabel(" BETA  1005 , 2.3.1.1 ").items.map((i) => [i.kind, i.value]),
      [
        ["version", "2.3.1.1"],
        ["beta", "1005"],
      ],
    );
    assert.equal(parseCalloutLabel("since BETA 984").items[0].kind, "since");
  });

  test("calloutLabelsOf finds labelled callouts outside code samples, by line", () => {
    const src = [
      "---",
      "title: X",
      "---",
      "> [!NOTE]",
      "> no label",
      "",
      "> [!WARNING] BETA 1005",
      "> body",
      "",
      "```md",
      "> [!NOTE] BETA 1",
      "```",
      "",
      "  > [!NOTE] 1.2.3.4, BETA 1005",
      "  > body",
      "",
      "> [!TIP] whatever",
    ].join("\r\n");
    assert.deepEqual(
      calloutLabelsOf(src).map((c) => [c.line, c.type, c.label, c.items.map((i) => i.kind).join("+"), !!c.error]),
      [
        [7, "WARNING", "BETA 1005", "beta", false],
        [14, "NOTE", "1.2.3.4, BETA 1005", "version+beta", false],
        [17, "TIP", "whatever", "", true],
      ],
    );
  });

  test("assignPackageVersions takes the nearest section with a four-part indexed_from", () => {
    const pages = [
      { srcRel: "Reference/Contributed/Pkg/index.md", frontmatter: { indexed_from: "1.2.3.4" } },
      { srcRel: "Reference/Contributed/Pkg/Cls/index.md", frontmatter: {} },
      { srcRel: "Reference/Contributed/Pkg/Cls/Member.md", frontmatter: {} },
      { srcRel: "Reference/Default/VBA/index.md", frontmatter: { indexed_from: "beta-x-0997" } },
      { srcRel: "Reference/Default/VBA/Strings/Left.md", frontmatter: {} },
      { srcRel: "Reference/Contributed.md", frontmatter: {} },
    ];
    assignPackageVersions(pages);
    assert.deepEqual(
      pages.map((p) => p.packageVersion),
      ["1.2.3.4", "1.2.3.4", "1.2.3.4", undefined, undefined, undefined],
    );
  });
});

describe("figurePlugin", () => {
  const md = createMarkdownIt({
    highlighter: null,
    linkTables: { byPath: new Map(), byUrl: new Map(), byRedirect: new Map() },
    baseurl: "",
    staticFiles: new Set([
      "IDE/Images/A.png",
      "IDE/Images/A.light.png",
      "IDE/Images/A.svg",
      "IDE/Images/A.light.svg",
      "IDE/Images/B.png",
      "IDE/Images/J.jpg",
      "IDE/Images/D.svg",
      "IDE/Images/S.svg",
      "IDE/Images/L.svg",
    ]),
    svgContents: new Map([
      ["IDE/Images/D.svg", '<svg width="600pt" height="300pt" viewBox="0 0 600 300"></svg>'],
      ["IDE/Images/S.svg", '<svg width="600pt" height="60pt" viewBox="0 0 600 60"></svg>'],
      [
        "IDE/Images/L.svg",
        '<!-- Generated by graphviz -->\n<svg width="600pt" height="60pt" viewBox="0 0 600 60"><title>g</title>' +
          '<a xlink:href="Other#x" xlink:title="x"><text>x</text></a></svg>',
      ],
    ]),
  });
  const render = (src) => md.render(src, { page: { srcRel: "IDE/Page.md" } }).trim();
  const actions = (html) => [...html.matchAll(/data-action="([a-z-]+)"/g)].map((m) => m[1]);
  const labels = (html) => [...html.matchAll(/aria-label="([^"]+)"/g)].map((m) => m[1]);

  test("a picture drawn as SVG offers both formats and Zoom, around both of its images", () => {
    const html = render('![x](Images/A.png){:width="400" height="300"}');
    assert.match(html, /^<div class="fig-wrap" data-kind="picture" data-tall>/);
    assert.deepEqual(actions(html), ["download-svg", "copy-svg", "download-png", "copy-png", "zoom"]);
    assert.match(
      html,
      /<div class="fig-container"><img src="\/IDE\/Images\/A\.light\.svg"[^>]*\/><img src="\/IDE\/Images\/A\.svg"[^>]*\/><\/div><\/div>$/,
    );
  });

  test("a raster image offers its own format, copied as PNG", () => {
    assert.deepEqual(actions(render("![x](Images/B.png)")), ["download-png", "copy-png", "zoom"]);
    assert.deepEqual(labels(render("![x](Images/J.jpg)")), ["Download JPEG", "Copy as PNG", "Zoom"]);
  });

  test("an image with text beside it, or inside a link, stays in its paragraph with no bar", () => {
    assert.doesNotMatch(render("See ![x](Images/B.png) here."), /fig-wrap/);
    assert.doesNotMatch(render("[![x](Images/B.png)](https://example.com/)"), /fig-wrap/);
  });

  test("a figure is tall when the page shows it at least as tall as its bar on end", () => {
    // The bar of a picture drawn as SVG is 220px on end; of a raster, 126px.
    assert.match(render('![x](Images/A.png){:width="400" height="220"}'), /data-tall/);
    assert.doesNotMatch(render('![x](Images/A.png){:width="400" height="219"}'), /data-tall/);
    assert.match(render('![x](Images/B.png){:width="400" height="126"}'), /data-tall/);
    // Shown in the 736px column, a 1472px-wide picture is half as tall as it says.
    assert.doesNotMatch(render('![x](Images/B.png){:width="1472" height="250"}'), /data-tall/);
    // A size the page does not state is taken as short.
    assert.doesNotMatch(render("![x](Images/B.png)"), /data-tall/);
  });

  test("a diagram is inlined, tall or short by its own size in pt", () => {
    const tall = render("![d](Images/D.svg)");
    assert.match(tall, /^<div class="fig-wrap" data-kind="diagram" data-tall>/);
    assert.match(tall, /<div class="fig-container" data-svg-src="IDE\/Images\/D\.svg" role="img" aria-label="d"><svg /);
    assert.doesNotMatch(tall, /<img/);
    assert.doesNotMatch(render("![s](Images/S.svg)"), /data-tall/);
  });

  test("a diagram that links is a group, not an image, its links in href and its titles gone", () => {
    const html = render("![l](Images/L.svg)");
    assert.match(
      html,
      /<div class="fig-container" data-svg-src="IDE\/Images\/L\.svg" role="group" aria-label="l"><!-- Generated by graphviz -->\n<svg /,
    );
    assert.match(html, /<a href="Other#x"/);
    assert.doesNotMatch(html, /xlink:href|<title>/);
  });
});

describe("inlineDiagram", async () => {
  const gv = await Graphviz.load();
  // What the build inlines: Graphviz's SVG as dot.mjs writes it.
  const dot = (src) => stripXmlPrologue(gv.dot(src), "test");
  const linkDiagram = (svg) => {
    const out = inlineDiagram(svg);
    assert.equal(out.linked, true);
    return out.svg;
  };
  const shapes = (svg) => [...svg.matchAll(/\s(?:d|points)="[^"]*"/g)].map((m) => m[0]).sort();
  const labels = (svg) => [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
  const balanced = (svg) => (svg.match(/<g[\s>]/g) ?? []).length === (svg.match(/<\/g>/g) ?? []).length;

  test("each cluster comes just before its first node, nodes in the order declared", () => {
    const svg = dot(`digraph {
      outputorder=nodesfirst
      subgraph cluster_a { label="A" URL="A" a1 [URL="A#1"] a2 [URL="A#2"] }
      subgraph cluster_b { label="B" URL="B" b1 [URL="B#1"] }
      c1 [URL="C#1"]
    }`);
    // Graphviz emits every cluster first.
    assert.deepEqual(labels(svg), ["A", "B", "a1", "a2", "b1", "c1"]);
    const out = linkDiagram(svg);
    assert.deepEqual(labels(out), ["A", "a1", "a2", "B", "b1", "c1"]);
    assert.deepEqual(shapes(out), shapes(svg));
    assert.ok(balanced(out));
    assert.doesNotMatch(out, /xlink:href|<title>/);
    assert.equal((out.match(/<a href="/g) ?? []).length, 6);
  });

  test("an outer cluster comes before an inner one, and one with no node stays first", () => {
    const svg = dot(`digraph {
      outputorder=nodesfirst
      subgraph cluster_e { label="E" e [style=invis label=""] }
      subgraph cluster_o { label="O" subgraph cluster_i { label="I" i1 [URL="I#1"] } o1 [URL="O#1"] }
    }`);
    const out = linkDiagram(svg);
    // i1 is the first node of both O and I.
    assert.deepEqual(labels(out), ["E", "O", "I", "i1", "o1"]);
    assert.deepEqual(shapes(out), shapes(svg));
    assert.ok(balanced(out));
  });

  test("a diagram that does not link loses only Graphviz's titles; an SVG of other origin keeps its own", () => {
    const svg = dot(`digraph { subgraph cluster_a { label="A" a1 } a1 -> b1 }`);
    const out = inlineDiagram(svg);
    assert.equal(out.linked, false);
    assert.match(svg, /<title>cluster_a<\/title>/);
    assert.equal(out.svg, svg.replace(/<title>[^<]*<\/title>\r?\n?/g, ""));
    assert.doesNotMatch(out.svg, /<title>/);
    const own = '<svg viewBox="0 0 9 1"><title>Build task timeline</title></svg>';
    assert.deepEqual(inlineDiagram(own), { svg: own, linked: false });
  });
});
