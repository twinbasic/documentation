// Unit tests for builder/search.mjs -- the search-data.json generator.
// See WIP.Search.md's "Design" §1 and §5: raising `search.heading_level`
// to 3 finds API members (`### PaintPicture`) as their own entries, and
// `search.fold_headings` folds boilerplate sub-sections ("See Also",
// "Example", ...) back into the member they belong to instead of letting
// them dilute the index with short, generic-titled entries.
//
// Before this file, nothing checked what a search entry *contains* --
// only URL coverage was checked (`checkSearch`, which strips `#` and so
// never saw section granularity at all).
//
// Runs with a bare `node --test test/search.test.mjs`, unlike test/addin's
// scenarios: it exercises pure functions over synthetic pages, needs no
// lane, no IDE, no build.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { checkIndexTerms, deriveSearchEntries, joinSymbolsToEntries, renderEntryString } from "../builder/search.mjs";
import { createMarkdownIt } from "../builder/render.mjs";
import { buildIndex, loadLunr, search } from "../eval/site_search.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// A minimal tbdocs page, holding exactly the fields deriveSearchEntries
// and extractSections read: frontmatter.title (+ optional
// search_exclude), renderedContent (post-render HTML, as
// headingLevelNormalizePlugin would have left it), and permalink.
// destPath is only read inside an error message for a page with no
// renderedContent, which these tests never trigger.
function page({ title, content, permalink = "/Widget/", searchExclude, frontmatter = {}, marks }) {
  return {
    frontmatter: {
      title,
      ...(searchExclude === undefined ? {} : { search_exclude: searchExclude }),
      ...frontmatter,
    },
    renderedContent: content,
    permalink,
    destPath: permalink,
    ...(marks ? { searchIndexMarks: marks } : {}),
  };
}

// A minimal tbdocs site: only site.config.search.* and site.config.baseurl
// are read by deriveSearchEntries / extractSections.
function site(searchConfig, baseurl = "") {
  return { config: { search: searchConfig, baseurl } };
}

describe("deriveSearchEntries: heading_level split", () => {
  const content =
    `<h1 id="widget">Widget</h1><p>Intro paragraph.</p>` +
    `<h2 id="methods">Methods</h2><p>Methods body.</p>` +
    `<h3 id="paintpicture">PaintPicture</h3><p>Paint body.</p>`;

  test("heading_level 2 leaves h3 headings embedded in their h2 parent (unchanged behaviour)", () => {
    const entries = deriveSearchEntries(
      [page({ title: "Widget", content })],
      site({ heading_level: 2 }),
    );

    // Title heading matches the page title with nothing before it, so
    // titleFound suppresses the prefix entry: just the title section and
    // the one h2 section. The h3 heading text is still there, but only as
    // text inside the h2 section's content -- it never becomes its own
    // entry.
    assert.deepEqual(entries.map((e) => e.title), ["Widget", "Methods"]);
    const methods = entries.find((e) => e.title === "Methods");
    assert.match(methods.content, /PaintPicture/);
    assert.match(methods.content, /Paint body/);
  });

  test("heading_level 3 splits the h3 into its own entry", () => {
    const entries = deriveSearchEntries(
      [page({ title: "Widget", content })],
      site({ heading_level: 3 }),
    );

    assert.deepEqual(entries.map((e) => e.title), ["Widget", "Methods", "PaintPicture"]);
    const methods = entries.find((e) => e.title === "Methods");
    const member = entries.find((e) => e.title === "PaintPicture");
    // The split moved the member's body out of "Methods" and into its own
    // entry -- exactly the granularity fix WIP.Search.md measures.
    assert.doesNotMatch(methods.content, /Paint body/);
    assert.match(member.content, /Paint body/);
    assert.equal(member.relUrl, "/Widget/#paintpicture");
  });
});

describe("deriveSearchEntries: fold_headings", () => {
  test("a generic section folds into the section before it", () => {
    const content =
      `<h1 id="widget">Widget</h1>` +
      `<h2 id="methods">Methods</h2>` +
      `<h3 id="paintpicture">PaintPicture</h3><p>Paint body.</p>` +
      `<h3 id="see-also">See Also</h3><p>See also body.</p>`;
    const entries = deriveSearchEntries(
      [page({ title: "Widget", content })],
      site({ heading_level: 3, fold_headings: ["See Also", "Example"] }),
    );

    // No standalone "See Also" entry: it was appended to PaintPicture's
    // section, which keeps PaintPicture's own title and url.
    assert.deepEqual(entries.map((e) => e.title), ["Widget", "Methods", "PaintPicture"]);
    const member = entries.find((e) => e.title === "PaintPicture");
    assert.equal(member.relUrl, "/Widget/#paintpicture");
    assert.match(member.content, /Paint body/);
    assert.match(member.content, /See also body/);
  });

  test("a generic section with nothing before it on the page keeps its own entry", () => {
    // "See Also" is the page's very first heading (parts[0], the prefix
    // content, is empty) -- there is nothing to fold it into, so it stays
    // a section of its own, and the page-title prefix entry still fires
    // because the title heading was never seen.
    const content = `<h2 id="see-also">See Also</h2><p>orphan generic body.</p>`;
    const entries = deriveSearchEntries(
      [page({ title: "Widget", content })],
      site({ heading_level: 2, fold_headings: ["See Also"] }),
    );

    assert.deepEqual(entries.map((e) => e.title), ["See Also", "Widget"]);
    const seeAlso = entries.find((e) => e.title === "See Also");
    assert.match(seeAlso.content, /orphan generic body/);
    // The trailing prefix entry (titleFound stayed false) points at the
    // bare page permalink, with the (empty) prefix content.
    const prefix = entries.find((e) => e.title === "Widget");
    assert.equal(prefix.relUrl, "/Widget/");
  });

  test("matching is case-insensitive and ignores surrounding whitespace", () => {
    const content =
      `<h1 id="widget">Widget</h1>` +
      `<h2 id="paintpicture">PaintPicture</h2><p>Paint body.</p>` +
      `<h2 id="see-also">  sEe AlSo  </h2><p>See also body.</p>`;
    const entries = deriveSearchEntries(
      [page({ title: "Widget", content })],
      site({ heading_level: 2, fold_headings: [" See Also "] }),
    );

    assert.deepEqual(entries.map((e) => e.title), ["Widget", "PaintPicture"]);
    const member = entries.find((e) => e.title === "PaintPicture");
    assert.match(member.content, /See also body/);
  });

  test("an absent fold_headings list folds nothing", () => {
    const content =
      `<h1 id="widget">Widget</h1>` +
      `<h2 id="paintpicture">PaintPicture</h2><p>Paint body.</p>` +
      `<h2 id="see-also">See Also</h2><p>See also body.</p>`;
    const entries = deriveSearchEntries(
      [page({ title: "Widget", content })],
      site({ heading_level: 2 }),
    );

    assert.deepEqual(entries.map((e) => e.title), ["Widget", "PaintPicture", "See Also"]);
  });

  test("an empty fold_headings list folds nothing", () => {
    const content =
      `<h1 id="widget">Widget</h1>` +
      `<h2 id="paintpicture">PaintPicture</h2><p>Paint body.</p>` +
      `<h2 id="see-also">See Also</h2><p>See also body.</p>`;
    const entries = deriveSearchEntries(
      [page({ title: "Widget", content })],
      site({ heading_level: 2, fold_headings: [] }),
    );

    assert.deepEqual(entries.map((e) => e.title), ["Widget", "PaintPicture", "See Also"]);
  });
});

describe("deriveSearchEntries: titleFound / prefix entry", () => {
  test("a title heading with no preceding prose suppresses the prefix entry", () => {
    const content = `<h1 id="widget">Widget</h1><p>body.</p>`;
    const entries = deriveSearchEntries(
      [page({ title: "Widget", content })],
      site({ heading_level: 2 }),
    );

    assert.deepEqual(entries.map((e) => e.title), ["Widget"]);
    assert.equal(entries[0].relUrl, "/Widget/");
  });

  test("prose before the first heading, or a first heading that isn't the title, adds a prefix entry", () => {
    const content = `<p>Some intro prose.</p><h1 id="widget">Widget</h1><p>body.</p>`;
    const entries = deriveSearchEntries(
      [page({ title: "Widget", content })],
      site({ heading_level: 2 }),
    );

    // Two "Widget"-titled entries: the heading section itself (titleFound
    // stays false because prose precedes it, so it gets its own #id url,
    // same as any other heading), then the prefix entry -- prose before
    // the first heading -- appended after every section, pointing at the
    // bare permalink.
    assert.deepEqual(entries.map((e) => e.title), ["Widget", "Widget"]);
    assert.match(entries[1].content, /Some intro prose/);
    assert.equal(entries[0].relUrl, "/Widget/#widget");
    assert.equal(entries[1].relUrl, "/Widget/");
  });

  test("a later heading that reads like the title is a section, not the title", () => {
    // The Shape page: its h1 is "Shape class", and `### Shape` documents
    // the Shape property. Taken for the title, the property lost its
    // #shape entry, so `Shape.Shape` found nothing.
    const content =
      `<h1 id="widget-class">Widget class</h1><p>Intro.</p>` +
      `<h2 id="properties">Properties</h2>` +
      `<h3 id="widget">Widget</h3><p>The Widget property.</p>`;
    const entries = deriveSearchEntries(
      [page({ title: "Widget", content })],
      site({ heading_level: 3 }),
    );

    assert.deepEqual(
      entries.map((e) => `${e.title} ${e.relUrl}`),
      ["Widget class /Widget/#widget-class", "Properties /Widget/#properties", "Widget /Widget/#widget", "Widget /Widget/"],
    );
    assert.match(entries[2].content, /The Widget property/);
  });
});

describe("deriveSearchEntries: deterministic output", () => {
  test("the same pages in the same order produce byte-identical entries", () => {
    const pages = [
      page({
        title: "Widget",
        content:
          `<h1 id="widget">Widget</h1>` +
          `<h2 id="methods">Methods</h2>` +
          `<h3 id="paintpicture">PaintPicture</h3><p>Paint body.</p>` +
          `<h3 id="see-also">See Also</h3><p>See also body.</p>`,
        permalink: "/Widget/",
      }),
      page({
        title: "Gadget",
        content: `<h1 id="gadget">Gadget</h1><p>Gadget body.</p>`,
        permalink: "/Gadget/",
      }),
    ];
    const cfg = { heading_level: 3, fold_headings: ["See Also"] };

    const a = deriveSearchEntries(pages, site(cfg));
    const b = deriveSearchEntries(pages, site(cfg));

    // Compare the emitted fields, not sourcePage (a fresh page object
    // each call would fail a deep-equal on identity alone, which isn't
    // what "deterministic" is claiming here).
    const strip = (entries) => entries.map(({ sourcePage, ...rest }) => rest);
    assert.deepEqual(strip(a), strip(b));
    // Entry indices (`i`) are sequential and stable across runs.
    assert.deepEqual(a.map((e) => e.i), b.map((e) => e.i));
  });
});

describe("deriveSearchEntries: search_exclude and no-title skips", () => {
  test("search_exclude: true drops a page entirely", () => {
    const entries = deriveSearchEntries(
      [page({ title: "Widget", content: `<h1 id="widget">Widget</h1>`, searchExclude: true })],
      site({ heading_level: 2 }),
    );
    assert.deepEqual(entries, []);
  });
});

// joinSymbolsToEntries -- the symbol-index join described in
// WIP.Search.md's "Design" §2: entries whose relUrl matches a symbol's
// url gain "names" (bare names) and "qualified" ("Container.Name" forms),
// both space-separated and deduplicated, and "primary", the names that are
// types or language elements ("Reader intent"). See builder/tbdocs.mjs's
// searchData task for how this runs against the real symbolIndex output.
describe("joinSymbolsToEntries", () => {
  function symbol({ name, container = null, url }) {
    return { name, package: null, container, kind: "method", url };
  }

  test("a matching symbol attaches names and qualified", () => {
    const entries = [{ i: 0, title: "PaintPicture", relUrl: "/Form/#paintpicture" }];
    const symbols = [symbol({ name: "PaintPicture", container: "Form", url: "/Form/#paintpicture" })];

    const [entry] = joinSymbolsToEntries(entries, symbols);
    assert.equal(entry.names, "PaintPicture");
    assert.equal(entry.qualified, "Form.PaintPicture");
  });

  test("a symbol with no container contributes to names but not qualified", () => {
    const entries = [{ i: 0, title: "Do...Loop", relUrl: "/Core/Do/" }];
    const symbols = [symbol({ name: "Do", container: null, url: "/Core/Do/" })];

    const [entry] = joinSymbolsToEntries(entries, symbols);
    assert.equal(entry.names, "Do");
    assert.equal(entry.qualified, undefined);
  });

  test("URL normalisation: a trailing /index or /index.html, then the trailing slash, joins the same as a bare permalink", () => {
    const variants = ["/Widget/", "/Widget", "/Widget/index", "/Widget/index.html"];
    for (const relUrl of variants) {
      const entries = [{ i: 0, title: "Widget", relUrl }];
      const symbols = [symbol({ name: "Widget", container: null, url: "/Widget/index.html" })];
      const [entry] = joinSymbolsToEntries(entries, symbols);
      assert.equal(entry.names, "Widget", `relUrl ${relUrl} should join`);
    }
  });

  test("a #fragment is compared exactly -- normalising the path around it does not blur two headings on the same page", () => {
    const entries = [
      { i: 0, title: "PaintPicture", relUrl: "/Form/#paintpicture" },
      { i: 1, title: "Refresh", relUrl: "/Form/#refresh" },
    ];
    const symbols = [symbol({ name: "PaintPicture", container: "Form", url: "/Form/index.html#paintpicture" })];

    const [paintPicture, refresh] = joinSymbolsToEntries(entries, symbols);
    assert.equal(paintPicture.names, "PaintPicture");
    assert.equal(refresh.names, undefined);
  });

  test("no matching symbol leaves the entry untouched", () => {
    const entries = [{ i: 0, title: "Unrelated", relUrl: "/Unrelated/" }];
    const symbols = [symbol({ name: "PaintPicture", container: "Form", url: "/Form/#paintpicture" })];

    const [entry] = joinSymbolsToEntries(entries, symbols);
    assert.equal(entry.names, undefined);
    assert.equal(entry.qualified, undefined);
  });

  test("symbols documented on the same URL are deduplicated by name and by qualified form", () => {
    // PaintPicture is a member of six classes, but only Form and
    // PictureBox's URLs are exercised here; both symbols land on the
    // same URL twice (a same-named override, or the join simply running
    // twice over identical input) and must not repeat in the joined
    // string.
    const entries = [{ i: 0, title: "PaintPicture", relUrl: "/Form/#paintpicture" }];
    const symbols = [
      symbol({ name: "PaintPicture", container: "Form", url: "/Form/#paintpicture" }),
      symbol({ name: "PaintPicture", container: "Form", url: "/Form/#paintpicture" }),
    ];

    const [entry] = joinSymbolsToEntries(entries, symbols);
    assert.equal(entry.names, "PaintPicture");
    assert.equal(entry.qualified, "Form.PaintPicture");
  });

  test("multiple symbols on one URL join into one space-separated field each", () => {
    const entries = [{ i: 0, title: "Methods", relUrl: "/Form/#methods" }];
    const symbols = [
      symbol({ name: "PaintPicture", container: "Form", url: "/Form/#methods" }),
      symbol({ name: "Refresh", container: "Form", url: "/Form/#methods" }),
    ];

    const [entry] = joinSymbolsToEntries(entries, symbols);
    assert.equal(entry.names, "PaintPicture Refresh");
    assert.equal(entry.qualified, "Form.PaintPicture Form.Refresh");
  });

  test("primary holds types and language elements, not class members or enum constants", () => {
    const entries = [
      { i: 0, title: "Left", relUrl: "/Strings/Left" },
      { i: 1, title: "Left", relUrl: "/CheckBox/#left" },
      { i: 2, title: "BorderStyle", relUrl: "/Enums/BorderStyle" },
      { i: 3, title: "With", relUrl: "/Core/With" },
      { i: 4, title: "Implements", relUrl: "/Pkg/Implements" },
    ];
    const symbols = [
      { name: "Strings", kind: "module", package: "VBA", container: null, url: "/Strings/" },
      { name: "Left", kind: "function", package: "VBA", container: "Strings", url: "/Strings/Left" },
      { name: "CheckBox", kind: "control", package: "VB", container: null, url: "/CheckBox/" },
      { name: "Left", kind: "property", package: "VB", container: "CheckBox", url: "/CheckBox/#left" },
      { name: "BorderStyle", kind: "enum", package: "VB", container: null, url: "/Enums/BorderStyle" },
      { name: "tbNone", kind: "enumvalue", package: "VB", container: "BorderStyle", url: "/Enums/BorderStyle" },
      { name: "With", kind: "statement", package: null, container: null, url: "/Core/With" },
      // A statement that belongs to a package is not a language element.
      { name: "Implements", kind: "statement", package: "Pkg", container: null, url: "/Pkg/Implements" },
    ];

    const [left, checkBoxLeft, borderStyle, withEntry, pkgStatement] = joinSymbolsToEntries(entries, symbols);
    assert.equal(left.primary, "Left");
    assert.equal(checkBoxLeft.primary, undefined);
    assert.equal(borderStyle.names, "BorderStyle tbNone");
    assert.equal(borderStyle.primary, "BorderStyle");
    assert.equal(withEntry.primary, "With");
    assert.equal(pkgStatement.primary, undefined);
  });
});

describe("renderEntryString: byte stability", () => {
  test("an entry with no names/qualified renders identically to before the join existed", () => {
    const entry = {
      i: 0,
      doc: "Widget",
      title: "Widget",
      content: "Widget body. ",
      url: "/Widget/",
      relUrl: "/Widget/",
    };

    assert.equal(
      renderEntryString(entry),
      `"0": {\n` +
      `    "doc": "Widget",\n` +
      `    "title": "Widget",\n` +
      `    "content": "Widget body. ",\n` +
      `    "url": "/Widget/",\n` +
      `    \n` +
      `    "relUrl": "/Widget/"\n` +
      `  }`,
    );
  });

  test("an entry with primary renders it after qualified", () => {
    const entry = {
      i: 0,
      doc: "Left",
      title: "Left",
      content: "Left body. ",
      url: "/Strings/Left",
      relUrl: "/Strings/Left",
      names: "Left",
      primary: "Left",
    };

    assert.equal(
      renderEntryString(entry),
      `"0": {\n` +
      `    "doc": "Left",\n` +
      `    "title": "Left",\n` +
      `    "content": "Left body. ",\n` +
      `    "names": "Left",\n` +
      `    "primary": "Left",\n` +
      `    "url": "/Strings/Left",\n` +
      `    \n` +
      `    "relUrl": "/Strings/Left"\n` +
      `  }`,
    );
  });

  test("an entry with names/qualified inserts both fields right after content", () => {
    const entry = {
      i: 0,
      doc: "Form",
      title: "PaintPicture",
      content: "Paint body. ",
      url: "/Form/%23paintpicture",
      relUrl: "/Form/#paintpicture",
      names: "PaintPicture",
      qualified: "Form.PaintPicture",
    };

    assert.equal(
      renderEntryString(entry),
      `"0": {\n` +
      `    "doc": "Form",\n` +
      `    "title": "PaintPicture",\n` +
      `    "content": "Paint body. ",\n` +
      `    "names": "PaintPicture",\n` +
      `    "qualified": "Form.PaintPicture",\n` +
      `    "url": "/Form/%23paintpicture",\n` +
      `    \n` +
      `    "relUrl": "/Form/#paintpicture"\n` +
      `  }`,
    );
  });
});

// The field-list drift guard for WIP.Search.md's "Design" §4: the online
// client (builder/vendor/just-the-docs/assets/js/just-the-docs.js), the
// offline client's own copy (JTD_INITSEARCH_FN_REPLACEMENT in
// builder/offline.mjs) and the eval replica (eval/site_search.mjs) each
// build their own lunr index and so each declare the field list by hand.
// Nothing at build time compares them -- this test is what stands in for
// that, extracting each one's {field: boost} pairs by regex and asserting
// all three agree. A change to one field list without the others is
// exactly the drift this exists to catch.
describe("field list drift guard: online client, offline client, eval replica", () => {
  // Matches `this.field('name', { boost: N })` (also bare `this.field('name')`,
  // which has no explicit boost -- none of the three sources currently do
  // that, but a bare field is still a field the other two must declare).
  const FIELD_RE = /this\.field\(\s*['"]([\w]+)['"]\s*(?:,\s*\{\s*boost:\s*(\d+)\s*\})?\s*\)/g;

  function extractFields(src) {
    const fields = {};
    for (const m of src.matchAll(FIELD_RE)) {
      fields[m[1]] = m[2] === undefined ? null : Number(m[2]);
    }
    return fields;
  }

  test("just-the-docs.js, offline.mjs and site_search.mjs declare the same fields at the same boosts", () => {
    const onlineSrc = fs.readFileSync(
      path.join(REPO_ROOT, "builder/vendor/just-the-docs/assets/js/just-the-docs.js"),
      "utf8",
    );
    const offlineSrc = fs.readFileSync(path.join(REPO_ROOT, "builder/offline.mjs"), "utf8");
    const evalSrc = fs.readFileSync(path.join(REPO_ROOT, "eval/site_search.mjs"), "utf8");

    const online = extractFields(onlineSrc);
    // offline.mjs has two initSearch-shaped functions in view once you count
    // comments mentioning `this.field(...)`: only JTD_INITSEARCH_FN_REPLACEMENT
    // actually calls it, so extracting over the whole file is safe -- there is
    // exactly one declaration site.
    const offline = extractFields(offlineSrc);
    const evalReplica = extractFields(evalSrc);

    assert.ok(Object.keys(online).length >= 4, "sanity: expected at least title/content/names/qualified");
    assert.deepEqual(offline, online, "offline.mjs's field list has drifted from just-the-docs.js");
    assert.deepEqual(evalReplica, online, "eval/site_search.mjs's field list has drifted from just-the-docs.js");
  });
});

// Sibling to the field-list drift guard above, for WIP.Search.md's rollout
// step 5 (parts A and B): the online client, the offline client and the
// eval replica must all (1) remove lunr's stop-word filter from the index
// pipeline, so English stop words that double as twinBASIC keywords (Do,
// For, If, Is, On, With, Each...) stay searchable, and (2) install the
// dot-run-split tokenizer wrapper, so titles like "Do...Loop" and "For
// Each...Next" tokenise into words instead of one opaque token. Neither
// shows up in a field/boost pair, so extractFields() above can't catch a
// drift here -- this checks for the two patches by name instead.
describe("stop-word and dot-run-split guard: online client, offline client, eval replica", () => {
  test("just-the-docs.js, offline.mjs and site_search.mjs all remove the stop-word filter", () => {
    const onlineSrc = fs.readFileSync(
      path.join(REPO_ROOT, "builder/vendor/just-the-docs/assets/js/just-the-docs.js"),
      "utf8",
    );
    const offlineSrc = fs.readFileSync(path.join(REPO_ROOT, "builder/offline.mjs"), "utf8");
    const evalSrc = fs.readFileSync(path.join(REPO_ROOT, "eval/site_search.mjs"), "utf8");

    const STOP_WORD_RE = /this\.pipeline\.remove\(\s*lunr\.stopWordFilter\s*\)/;
    assert.match(onlineSrc, STOP_WORD_RE, "just-the-docs.js no longer removes lunr.stopWordFilter");
    assert.match(offlineSrc, STOP_WORD_RE, "offline.mjs's JTD_INITSEARCH_FN_REPLACEMENT no longer removes lunr.stopWordFilter");
    assert.match(evalSrc, STOP_WORD_RE, "eval/site_search.mjs no longer removes lunr.stopWordFilter");
  });

  test("just-the-docs.js, offline.mjs and site_search.mjs all install the dot-run-split tokenizer wrapper", () => {
    const onlineSrc = fs.readFileSync(
      path.join(REPO_ROOT, "builder/vendor/just-the-docs/assets/js/just-the-docs.js"),
      "utf8",
    );
    const offlineSrc = fs.readFileSync(path.join(REPO_ROOT, "builder/offline.mjs"), "utf8");
    const evalSrc = fs.readFileSync(path.join(REPO_ROOT, "eval/site_search.mjs"), "utf8");

    // Loose on purpose -- the wrapper's exact variable names may reasonably
    // differ between the three copies. What must agree is: a marker flag
    // (`dotRunSplit`) so the wrapper installs only once, a replace of 2+
    // dot runs, and the wrapper carrying its own `separator`.
    for (const [label, src] of [
      ["just-the-docs.js", onlineSrc],
      ["offline.mjs", offlineSrc],
      ["eval/site_search.mjs", evalSrc],
    ]) {
      assert.match(src, /dotRunSplit/, `${label} has no dotRunSplit marker -- the dot-run-split wrapper looks missing`);
      assert.match(src, /\\\.\{2,\}/, `${label} has no /\\.{2,}/ dot-run pattern -- the dot-run-split wrapper looks missing`);
      // Loose on the exact escaping (offline.mjs's copy lives inside a JS
      // template literal, so its backslashes are doubled) -- just checks
      // for "<something>.separator = /[<char class>]+/" somewhere in the
      // wrapper.
      assert.match(
        src,
        /\.separator\s*=\s*\/\[[^\]]*\]\+\//,
        `${label}'s dot-run-split wrapper doesn't set its own .separator`,
      );
    }
  });
});

// Sibling to the guards above, for WIP.Search.md's "Reader intent" changes.
// The `exact`, `primary` and `page` fields are covered by the field-list
// guard; what it can't see is how they are filled and queried. The index
// side lives in each copy's own lunr builder, so all three must derive
// `exact` and `primary` with exactName() and `page` from `doc`. The query
// side lives in update() (the offline build inherits it) and in the eval
// replica, so those two must write names the same way, share the kind
// words, trim tokens, keep the name fields out of the ordinary clauses,
// add the exact-name clause, and require every word first as a stem with a
// trailing wildcard.
describe("reader-intent guard: online client, offline client, eval replica", () => {
  const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
  const onlineSrc = read("builder/vendor/just-the-docs/assets/js/just-the-docs.js");
  const offlineSrc = read("builder/offline.mjs");
  const evalSrc = read("eval/site_search.mjs");

  test("all three derive `exact` with exactName() and `page` from `doc`", () => {
    for (const [label, src] of [
      ["just-the-docs.js", onlineSrc],
      ["offline.mjs", offlineSrc],
      ["eval/site_search.mjs", evalSrc],
    ]) {
      assert.match(src, /exact:\s*\(docs\[\w+\]\.names \|\| ['"]{2}\)[^\n]*\.map\(exactName\)/, `${label} doesn't fill \`exact\` from names via exactName()`);
      assert.match(src, /primary:\s*\(docs\[\w+\]\.primary \|\| ['"]{2}\)[^\n]*\.map\(exactName\)/, `${label} doesn't fill \`primary\` via exactName()`);
      assert.match(src, /page:\s*docs\[\w+\]\.doc \|\| ['"]{2}/, `${label} doesn't fill \`page\` from doc`);
    }
  });

  // exactName() and the kind-word list are compared by what they produce,
  // not by their text: the online copy is ES5 and the replica is not.
  function extractExactName(src, label) {
    const m = src.match(/function exactName\(name\) \{[\s\S]*?\n\}/);
    assert.ok(m, `${label} has no exactName()`);
    return new Function(`return (${m[0]});`)();
  }
  function extractKindWords(src, label) {
    const m = src.match(/KIND_WORDS = (\[[^\]]*\])/);
    assert.ok(m, `${label} has no KIND_WORDS`);
    return JSON.parse(m[1].replaceAll("'", '"'));
  }

  test("the online client and the eval replica write names and kind words the same way", () => {
    const online = extractExactName(onlineSrc, "just-the-docs.js");
    const replica = extractExactName(evalSrc, "eval/site_search.mjs");
    for (const n of ["Node", "Time$", "#If", "<>", "<<=", "Form.PaintPicture", "vb_Name", "Straße"]) {
      assert.equal(online(n), replica(n), `exactName(${JSON.stringify(n)}) differs`);
    }
    // lunr's trimmer strips non-word characters from both ends of a token,
    // so a written name must start and end with a word character.
    for (const n of ["#If", "<>", "Time$", "*"]) assert.match(online(n), /^\w.*\w$/, `exactName(${JSON.stringify(n)}) would be trimmed`);
    assert.notEqual(online("#If"), online("If"));
    assert.notEqual(online("Time$"), online("Time"));
    assert.deepEqual(extractKindWords(evalSrc, "eval/site_search.mjs"), extractKindWords(onlineSrc, "just-the-docs.js"));
  });

  test("the online client and the eval replica build the same query", () => {
    for (const [label, src] of [
      ["just-the-docs.js", onlineSrc],
      ["eval/site_search.mjs", evalSrc],
    ]) {
      assert.match(src, /lunr\.trimmer\(/, `${label} doesn't trim query tokens`);
      assert.match(src, /\[\s*['"]title['"],\s*['"]content['"],\s*['"]names['"],\s*['"]qualified['"],\s*['"]page['"],\s*['"]relUrl['"]\s*\]/, `${label} has no field list without the name fields for the ordinary clauses`);
      assert.match(src, /exactName\(name\),\s*\{\s*fields:\s*\[\s*['"]exact['"],\s*['"]primary['"]\s*\]\s*\}/, `${label} has no exact-name clause`);
      assert.match(src, /lunr\.stemmer\(token\.clone\(\)\)\.toString\(\)/, `${label} doesn't require words as stems`);
      assert.match(src, /presence:\s*lunr\.Query\.presence\.REQUIRED/, `${label} doesn't require every word first`);
      assert.match(src, /usePipeline:\s*false/, `${label}'s required stems would be stemmed again`);
      // A plural kind word names a topic ("Delegate Types"), so it counts
      // as a named word (WIP.Search.md, "Fixed: whole titles").
      assert.match(src, /KIND_WORDS\.(includes|indexOf)\(w\.toLowerCase\(\)\)/, `${label} doesn't compare kind words as typed`);
    }
  });
});

// Qualified names (WIP.Search.md, "What shipped, fourth round"): only a
// qualified name reaches `qualified`, typed with a dot or as two adjacent
// words, and there it outweighs a title naming its container.
describe("qualified-name guard: online client, eval replica", () => {
  const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
  const lunr = loadLunr(path.join(REPO_ROOT, "builder/vendor/just-the-docs/assets/js/vendor/lunr.min.js"));

  test("the online client and the eval replica keep plain words off `qualified` the same way", () => {
    for (const [label, src] of [
      ["just-the-docs.js", read("builder/vendor/just-the-docs/assets/js/just-the-docs.js")],
      ["eval/site_search.mjs", read("eval/site_search.mjs")],
    ]) {
      assert.match(src, /\[\s*['"]title['"],\s*['"]content['"],\s*['"]names['"],\s*['"]page['"],\s*['"]relUrl['"]\s*\]/, `${label} has no field list without \`qualified\` for plain words`);
      assert.match(src, /term\(plainTokens, \{\s*fields: (plainFields|PLAIN_FIELDS),\s*wildcard: lunr\.Query\.wildcard\.TRAILING\s*\}\)/, `${label}'s plain words complete in \`qualified\``);
      assert.match(src, /term\(qualifiedTokens, \{\s*fields: (textFields|TEXT_FIELDS),\s*wildcard: lunr\.Query\.wildcard\.TRAILING\s*\}\)/, `${label}'s qualified names don't complete in \`qualified\``);
      assert.match(src, /term\(pairTokens, \{ fields: \[['"]qualified['"]\], boost: 10 \}\)/, `${label} has no clause for two words naming a member`);
      assert.match(src, /presence: lunr\.Query\.presence\.REQUIRED,\s*boost: 0/, `${label}'s required words score in \`qualified\``);
    }
  });

  test("the replica ranks the member a qualified name names first", () => {
    const docs = {
      0: { doc: "FileListBox", title: "FileListBox", content: "A list of files. Name, Font.", names: "FileListBox", primary: "FileListBox", relUrl: "/FileListBox" },
      1: { doc: "FileListBox", title: "Name", content: "The control's name.", names: "Name", qualified: "FileListBox.Name", relUrl: "/FileListBox#name" },
      2: { doc: "Slider", title: "Slider", content: "A slider. KeyDown.", names: "Slider", primary: "Slider", relUrl: "/Slider" },
      3: { doc: "Slider", title: "KeyDown, KeyPress, KeyUp", content: "Raised when a key is pressed.", names: "KeyDown KeyPress KeyUp", qualified: "Slider.KeyDown Slider.KeyPress Slider.KeyUp", relUrl: "/Slider#keys" },
      4: { doc: "VbFileAttribute", title: "VbFileAttribute", content: "File attributes.", relUrl: "/VbFileAttribute" },
      5: { doc: "StorageTypeConstants", title: "StorageTypeConstants", content: "Storage types. vbFile.", names: "StorageTypeConstants vbFile", qualified: "StorageTypeConstants.vbFile", primary: "StorageTypeConstants", relUrl: "/StorageType" },
      6: { doc: "Input", title: "Input", content: "Reads from a file.", names: "Input", qualified: "_HiddenModule.Input", relUrl: "/Input" },
      7: { doc: "_HiddenModule", title: "_HiddenModule", content: "Holds Input and Width.", names: "_HiddenModule", primary: "_HiddenModule", relUrl: "/HiddenModule" },
      8: { doc: "Form", title: "Events", content: "The events a form raises.", relUrl: "/Form#events" },
      9: { doc: "Form", title: "OLEDragDrop, OLEDragOver, OLEStartDrag", content: "Raised during a drag. These events of the form...", names: "OLEDragDrop OLEDragOver OLEStartDrag", qualified: "Form.OLEDragDrop Form.OLEDragOver Form.OLEStartDrag", relUrl: "/Form#ole" },
    };
    const attributes = ["vbNormal", "vbReadOnly", "vbHidden", "vbSystem", "vbVolume", "vbDirectory", "vbArchive", "vbAlias"];
    Object.assign(docs[4], {
      names: ["VbFileAttribute", ...attributes].join(" "),
      qualified: attributes.map((a) => `VbFileAttribute.${a}`).join(" "),
      primary: "VbFileAttribute",
    });
    for (let k = 0; k < 30; k++) {
      docs[100 + k] = { doc: `Control${k}`, title: "KeyDown", content: "Raised when a key is pressed.", names: "KeyDown", qualified: `Control${k}.KeyDown`, relUrl: `/Control${k}#keydown` };
      docs[200 + k] = { doc: `Control${k}`, title: "Name", content: "The control's name.", names: "Name", qualified: `Control${k}.Name`, relUrl: `/Control${k}#name` };
      docs[300 + k] = { doc: "Form", title: `Member${k}`, content: "Runs before the form raises its other events.", names: `Member${k}`, qualified: `Form.Member${k}`, relUrl: `/Form#member${k}` };
    }
    const ctx = { lunr, index: buildIndex(lunr, docs), docs };
    const urls = (q) => search(ctx, q).map((r) => docs[r.ref].relUrl);
    // Before, the container's page came first, and a heading naming three
    // events fell behind every other control's KeyDown.
    assert.equal(urls("FileListBox.Name")[0], "/FileListBox#name");
    assert.equal(urls("Slider.KeyDown")[0], "/Slider#keys");
    // Two words name the member too.
    assert.equal(urls("FileListBox Name")[0], "/FileListBox#name");
    // A plain word that begins a container's name doesn't complete to its
    // members.
    assert.equal(urls("vbFile")[0], "/StorageType");
    // Nor does a required word, though it still counts where only
    // `qualified` holds it.
    assert.equal(urls("Form events")[0], "/Form#events");
    assert.ok(urls("_HiddenModule Input").includes("/Input"));
  });

  // Stem twins (WIP.Search.md, "Fixed: stem twins"): `Printer.Font` and
  // `Printer.Fonts` stem alike, so `qualified` also holds each whole.
  test("all three fill `qualified` via qualifiedField(), and both queries match a whole name there", () => {
    for (const [label, src] of [
      ["just-the-docs.js", read("builder/vendor/just-the-docs/assets/js/just-the-docs.js")],
      ["offline.mjs", read("builder/offline.mjs")],
      ["eval/site_search.mjs", read("eval/site_search.mjs")],
    ]) {
      assert.match(src, /twins = stemTwins\((lunr, )?docs\)/, `${label} doesn't find the stem twins`);
      assert.match(src, /qualified:\s*qualifiedField\((lunr, )?docs\[\w+\], twins\)/, `${label} doesn't fill \`qualified\` via qualifiedField()`);
      if (label === "offline.mjs") continue;
      assert.match(src, /term\(wholeQualified, \{ fields: \[['"]qualified['"]\], boost: 10 \}\)/, `${label} has no clause for a whole qualified name`);
    }
  });

  test("the online client and the eval replica find the same twins and write the same field", () => {
    const fn = (src, name, label) => {
      const m = src.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
      assert.ok(m, `${label} has no ${name}()`);
      return m[0];
    };
    const names = ["exactName", "stemTwins", "qualifiedField"];
    const load = (src, label) => names.map((n) => fn(src, n, label)).join("\n") + `\nreturn { ${names.join(", ")} };`;
    const online = new Function("lunr", load(read("builder/vendor/just-the-docs/assets/js/just-the-docs.js"), "just-the-docs.js"))(lunr);
    const replica = new Function(load(read("eval/site_search.mjs"), "eval/site_search.mjs"))();
    const docs = {
      0: { qualified: "Printer.Font Printer.FontCount" },
      1: { qualified: "Printer.Fonts" },
      2: { qualified: "Strings.Left Strings.Left$ Strings.LeftB" },
      3: { qualified: "Form.PaintPicture" },
      4: {},
    };
    const onlineTwins = online.stemTwins(docs);
    const replicaTwins = replica.stemTwins(lunr, docs);
    assert.deepEqual(Object.keys(onlineTwins).sort(), [...replicaTwins].sort());
    assert.deepEqual([...replicaTwins].sort(), ["printer.font", "printer.fonts", "strings.left", "strings.left$"]);
    for (const id in docs) {
      assert.equal(online.qualifiedField(docs[id], onlineTwins), replica.qualifiedField(lunr, docs[id], replicaTwins), `qualifiedField(${JSON.stringify(docs[id])}) differs`);
    }
    // A name with no twin is held as before.
    assert.equal(online.qualifiedField(docs[3], onlineTwins), "Form.PaintPicture");
    assert.equal(online.qualifiedField(docs[1], onlineTwins), "Printer.Fonts printer_2efonts_");
  });

  test("the replica tells stem twins apart, typed with a dot or as two words", () => {
    const docs = {
      0: { doc: "Printer", title: "Printer", content: "The printer. Font, Fonts.", names: "Printer", primary: "Printer", relUrl: "/Printer" },
      1: { doc: "Printer", title: "Font", content: "The font to print with.", names: "Font", qualified: "Printer.Font", relUrl: "/Printer#font" },
      2: { doc: "Printer", title: "Fonts", content: "The fonts the printer has.", names: "Fonts", qualified: "Printer.Fonts", relUrl: "/Printer#fonts" },
    };
    for (let k = 0; k < 30; k++) docs[100 + k] = { doc: `Page ${k}`, title: `Page ${k}`, content: "unrelated text", relUrl: `/P${k}` };
    const ctx = { lunr, index: buildIndex(lunr, docs), docs };
    const first = (q) => docs[search(ctx, q)[0].ref].relUrl;
    // Before, both names ranked their entries in the same order, since
    // every clause saw the one stem `printer.font`.
    assert.equal(first("Printer.Font"), "/Printer#font");
    assert.equal(first("Printer.Fonts"), "/Printer#fonts");
    assert.equal(first("Printer Font"), "/Printer#font");
    assert.equal(first("Printer Fonts"), "/Printer#fonts");
  });
});

// Hand-marked index entries (WIP.Search.md, "What shipped, third round: the
// index pilot"): the front matter's `index` / `index_also`, and the same on
// a heading, which render.mjs's searchIndexMarksPlugin lifts off it into
// page.searchIndexMarks, keyed by the heading's id.
describe("index marks: from the page to its entries", () => {
  const content =
    '<h1 id="widget">Widget</h1><p>Intro.</p>' +
    '<h2 id="methods">Methods</h2><p>Methods.</p>' +
    '<h3 id="paint">Paint</h3><p>Paints.</p>' +
    '<h4 id="deep">Deep</h4><p>Deep.</p>' +
    '<h3 id="see-also">See Also</h3><p>Links.</p>';
  const cfg = site({ heading_level: 3, fold_headings: ["See Also"] });
  const byUrl = (entries) => Object.fromEntries(entries.map((e) => [e.relUrl, e]));

  test("front matter marks the page's own entry", () => {
    const entries = deriveSearchEntries([page({
      title: "Widget", content, frontmatter: { index: "late binding", index_also: ["early binding", "binding"] },
    })], cfg);
    const e = byUrl(entries)["/Widget/"];
    assert.deepEqual(e.index, ["late binding"]);
    assert.deepEqual(e.index_also, ["early binding", "binding"]);
    assert.equal(byUrl(entries)["/Widget/#methods"].index, undefined);
  });

  test("a page whose first heading isn't its title marks its prefix entry", () => {
    const entries = deriveSearchEntries([page({
      title: "Other", content, frontmatter: { index: "late binding" },
    })], cfg);
    assert.deepEqual(byUrl(entries)["/Widget/"].index, ["late binding"]);
    assert.equal(byUrl(entries)["/Widget/#widget"].index, undefined);
  });

  test("a heading's mark goes to the entry holding that heading", () => {
    const entries = byUrl(deriveSearchEntries([page({
      title: "Widget", content, marks: [
        { id: "paint", index: "painting; drawing" },
        { id: "deep", index_also: "deep term" },
        { id: "see-also", index_also: "folded term" },
      ],
    })], cfg));
    assert.deepEqual(entries["/Widget/#paint"].index, ["painting", "drawing"]);
    // #deep is an h4, below heading_level, and See Also folds: both are
    // held by the #paint entry.
    assert.deepEqual(entries["/Widget/#paint"].index_also, ["deep term", "folded term"]);
  });

  test("terms are trimmed, kept once regardless of case, and a main term is not also secondary", () => {
    const [e] = deriveSearchEntries([page({
      title: "Widget", content: "<h1>Widget</h1>",
      frontmatter: { index: ["  late   binding ", "Late Binding"], index_also: "late binding; LATE binding; other" },
    })], cfg);
    assert.deepEqual(e.index, ["late binding"]);
    assert.deepEqual(e.index_also, ["other"]);
  });

  test("a value that isn't a term or a list of terms fails the build", () => {
    assert.throws(
      () => deriveSearchEntries([page({ title: "Widget", content, frontmatter: { index: 64 } })], cfg),
      /front matter `index`: expected a term or a list of terms/,
    );
  });

  test("a mark on a heading no entry holds fails the build", () => {
    assert.throws(
      () => deriveSearchEntries([page({ title: "Widget", content, marks: [{ id: "nowhere", index: "x" }] })], cfg),
      /heading #nowhere carries a search index entry/,
    );
  });

  test("an unmarked page produces no index fields", () => {
    for (const e of deriveSearchEntries([page({ title: "Widget", content })], cfg)) {
      assert.equal("index" in e, false);
      assert.equal("index_also" in e, false);
    }
  });
});

describe("index marks: one main entry per term", () => {
  test("two places claiming the same main term fail, ignoring case and hyphens", () => {
    assert.throws(
      () => checkIndexTerms([
        { relUrl: "/A/", index: ["64-bit compilation"] },
        { relUrl: "/B/#x", index: ["64 Bit Compilation"] },
      ]),
      /"64 bit compilation": \/A\/, \/B\/#x/,
    );
  });

  test("the same term as a secondary entry elsewhere is fine", () => {
    checkIndexTerms([
      { relUrl: "/A/", index: ["late binding"] },
      { relUrl: "/B/", index_also: ["late binding"] },
    ]);
  });

  test("renderEntryString writes the terms as lists after primary", () => {
    const out = renderEntryString({
      i: 0, doc: "W", title: "W", content: "", url: "/W/", relUrl: "/W/",
      primary: "W", index: ["late binding"], index_also: ["a", "b"],
    });
    assert.match(out, /"primary": "W",\n {4}"index": \["late binding"\],\n {4}"index_also": \["a","b"\],\n {4}"url"/);
  });
});

describe("index marks: render.mjs lifts them off headings", () => {
  const md = createMarkdownIt({ highlighter: null, linkTables: { byPath: new Map() }, baseurl: "", staticFiles: new Set() });

  test("a heading's index and index_also leave the HTML and land in env, keyed by id", () => {
    const env = { page: { srcRel: "t.md" } };
    const html = md.render('## Object\n{: index="late binding" index_also="object variable; COM object" }\n\ntext\n', env);
    assert.equal(html.includes("index"), false, html);
    assert.match(html, /<h2 id="object">Object<\/h2>/);
    assert.deepEqual(env.searchIndexMarks, [
      { id: "object", index: "late binding", index_also: "object variable; COM object" },
    ]);
  });

  test("a pinned id is the one the mark is keyed by", () => {
    const env = { page: { srcRel: "t.md" } };
    md.render('### Foo {: #custom index="x" }\n', env);
    assert.deepEqual(env.searchIndexMarks, [{ id: "custom", index: "x" }]);
  });

  test("the attribute on anything but a heading fails the build", () => {
    assert.throws(() => md.render('para\n{: index="x" }\n', { page: { srcRel: "p.md" } }), /p\.md: .* on <p>; only a heading/);
    assert.throws(() => md.render('a [link](x){: index_also="x" } b\n', { page: { srcRel: "p.md" } }), /on <a>; only a heading/);
  });
});

// The index-term patch in the three copies. indexTermKey(), indexField()
// and indexedContent() are compared by what they produce, like exactName()
// above, and the query side is checked to build the same key as the index
// side.
describe("index-term guard: online client, offline client, eval replica", () => {
  const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
  const onlineSrc = read("builder/vendor/just-the-docs/assets/js/just-the-docs.js");
  const offlineSrc = read("builder/offline.mjs");
  const evalSrc = read("eval/site_search.mjs");
  const lunr = loadLunr(path.join(REPO_ROOT, "builder/vendor/just-the-docs/assets/js/vendor/lunr.min.js"));

  const fn = (src, name, label) => {
    const m = src.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
    assert.ok(m, `${label} has no ${name}()`);
    return m[0];
  };

  test("all three fill the index field and the content with the terms, and pin the average length", () => {
    for (const [label, src] of [
      ["just-the-docs.js", onlineSrc],
      ["offline.mjs", offlineSrc],
      ["eval/site_search.mjs", evalSrc],
    ]) {
      assert.match(src, /index:\s*indexField\((lunr, )?docs\[\w+\]\)/, `${label} doesn't fill \`index\` via indexField()`);
      assert.match(src, /content:\s*indexedContent\(docs\[\w+\]\)/, `${label} doesn't fill \`content\` via indexedContent()`);
      assert.match(src, /pinIndexFieldLengths\(this\)/, `${label} doesn't pin the index field's average length`);
    }
    for (const [label, src] of [["just-the-docs.js", onlineSrc], ["eval/site_search.mjs", evalSrc]]) {
      assert.match(src, /term\(key, \{ fields: \[['"]index['"]\], boost: 5, usePipeline: false \}\)/, `${label} has no main index-term clause`);
      assert.match(src, /term\(key \+ ['"]_['"], \{ fields: \[['"]index['"]\], boost: 1, usePipeline: false \}\)/, `${label} has no secondary index-term clause`);
      assert.match(src, /b - a <= 4/, `${label} doesn't match runs of up to four words`);
    }
  });

  test("the online client and the eval replica write a term the same way, and a query names it the same way", () => {
    const names = ["phraseKey", "indexTermKey", "indexField", "indexedContent"];
    const load = (src, label) => names.map((n) => fn(src, n, label)).join("\n") + `\nreturn { ${names.join(", ")} };`;
    const online = new Function("lunr", load(onlineSrc, "just-the-docs.js"))(lunr);
    const replica = new Function(load(evalSrc, "eval/site_search.mjs"))();
    for (const t of ["late binding", "64-bit compilation", "File I/O", "Do...Loop", "#If directives", "conditional compilation", "  "]) {
      assert.equal(online.indexTermKey(t), replica.indexTermKey(lunr, t), `indexTermKey(${JSON.stringify(t)}) differs`);
    }
    for (const doc of [
      { content: "Body." },
      { content: "Body.", index: ["late binding"] },
      { content: "Body.", index: ["late binding", "  "], index_also: ["64-bit compilation", "File I/O"] },
    ]) {
      assert.equal(online.indexField(doc), replica.indexField(lunr, doc), `indexField(${JSON.stringify(doc)}) differs`);
      assert.equal(online.indexedContent(doc), replica.indexedContent(doc), `indexedContent(${JSON.stringify(doc)}) differs`);
    }
    assert.equal(online.indexedContent({ content: "Body." }), "Body.");
    // A secondary term is its main key with one more `_`, which is how the
    // query tells them apart.
    assert.equal(online.indexField({ index_also: ["late binding"] }), online.indexTermKey("late binding") + "_");
    assert.equal(online.indexTermKey("  "), "");
    const queryKey = (q) => online.phraseKey(lunr.tokenizer(q).map((t) => lunr.trimmer(t)).filter((t) => t.str !== ""));
    assert.equal(queryKey("Late-Binding"), online.indexTermKey("late binding"));
    assert.equal(queryKey("64 bit compilations"), online.indexTermKey("64-bit compilation"));
    // One token, so no field split or stemmer touches it again at index time.
    assert.equal(lunr.tokenizer(online.indexTermKey("64-bit compilation")).length, 1);
  });

  test("the replica ranks a marked entry first, and its secondary entry next", () => {
    const docs = {
      0: { doc: "Glossary", title: "late binding and early binding", content: "late binding late binding late binding", relUrl: "/Gloss#late" },
      1: { doc: "Data types", title: "Object", content: "Calls resolve at run time.", relUrl: "/Types#object", index: ["late binding"] },
      2: { doc: "CreateObject", title: "CreateObject", content: "Makes an object.", relUrl: "/CreateObject", index_also: ["late binding"] },
      3: { doc: "Filler", title: "Filler", content: "late words and binding words", relUrl: "/Filler" },
    };
    // Unmarked entries, as on the site, where nearly every entry is: without
    // pinIndexFieldLengths(), the index field's average length falls toward
    // zero and a marked entry's match counts for almost nothing.
    for (let k = 4; k < 200; k++) docs[k] = { doc: `Page ${k}`, title: `Page ${k}`, content: "unrelated text", relUrl: `/P${k}` };
    const ctx = { lunr, index: buildIndex(lunr, docs), docs };
    const urls = (q) => search(ctx, q).map((r) => docs[r.ref].relUrl);
    assert.deepEqual(urls("late binding").slice(0, 2), ["/Types#object", "/CreateObject"]);
    // Naming only part of a term doesn't match it.
    assert.notEqual(urls("binding")[0], "/Types#object");
  });
});

// lunr 2.3.9 keys token-set nodes for minimisation by TokenSet#toString(),
// which runs each edge's label into its child's id, so two different nodes
// can share a key and be merged: the index's token set then holds invented
// words, and a wildcard query reaching one throws (WIP.Search.md, "Fixed:
// lunr invented words"). All three copies install separated keys.
describe("token-set key guard: online client, offline client, eval replica", () => {
  const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
  const lunrPath = path.join(REPO_ROOT, "builder/vendor/just-the-docs/assets/js/vendor/lunr.min.js");
  const lunr = loadLunr(lunrPath);
  const lunrsOwn = new Function(`return ${read(path.relative(REPO_ROOT, lunrPath)).match(/TokenSet\.prototype\.toString=(function\(\)\{.*?return e\})/)[1]};`)();
  // From id 3, lunr's own keys give node `c` ({1 -> leaf, 5 -> leaf}) and
  // node `e` ({1 -> the node with id 656}) the one key `01656`.
  const words = ["c1", "c5", ...Array.from({ length: 491 }, (_, i) => `d${String(i).padStart(3, "0")}`), "e1x"];
  const tokenSet = (key) => {
    const [saved, nextId] = [lunr.TokenSet.prototype.toString, lunr.TokenSet._nextId];
    lunr.TokenSet.prototype.toString = key;
    lunr.TokenSet._nextId = 3;
    try {
      return new Set(lunr.TokenSet.fromArray(words).toArray());
    } finally {
      lunr.TokenSet.prototype.toString = saved;
      lunr.TokenSet._nextId = Math.max(nextId, lunr.TokenSet._nextId);
    }
  };
  const exact = (set) => set.size === words.length && words.every((w) => set.has(w));

  test("lunr's own keys still invent and lose words for the fixture", () => {
    const set = tokenSet(lunrsOwn);
    assert.ok(set.has("e1") && set.has("e5") && !set.has("e1x"), "the fixture no longer reproduces lunr's key collision; find a new one or drop the patch");
  });

  test("the online client's and the replica's keys keep the fixture exact", () => {
    const fake = { TokenSet: { prototype: { toString: lunrsOwn } } };
    const src = read("builder/vendor/just-the-docs/assets/js/just-the-docs.js").match(/function separateTokenSetKeys\(\) \{[\s\S]*?\n\}/);
    assert.ok(src, "just-the-docs.js has no separateTokenSetKeys()");
    new Function("lunr", `${src[0]}\nseparateTokenSetKeys();`)(fake);
    assert.notEqual(fake.TokenSet.prototype.toString, lunrsOwn);
    assert.ok(exact(tokenSet(fake.TokenSet.prototype.toString)), "the online client's keys still collide");
    assert.notEqual(lunr.TokenSet.prototype.toString, lunrsOwn);
    assert.ok(exact(tokenSet(lunr.TokenSet.prototype.toString)), "the replica's keys still collide");
  });

  test("all three install the separated keys when they build the index", () => {
    assert.match(read("builder/vendor/just-the-docs/assets/js/just-the-docs.js"), /lunr\.tokenizer = dotRunSplitTokenizer;\s*\}\s*separateTokenSetKeys\(\);/);
    assert.match(read("builder/offline.mjs"), /lunr\.tokenizer = dotRunSplitTokenizer;\s*\}\s*(\/\/[^\n]*\n\s*)*separateTokenSetKeys\(\);/);
    assert.match(read("eval/site_search.mjs"), /\s+separateTokenSetKeys\(lunr\);\s+(\w+\(lunr\);\s+)*return lunr;/);
  });
});

// Whole titles (WIP.Search.md, "Fixed: whole titles"): a query of two or more
// words that reads the same as a result's title, or its page title plus
// title, scores three times as much, after lunr ranks.
describe("whole-title guard: online client, eval replica", () => {
  const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
  const lunr = loadLunr(path.join(REPO_ROOT, "builder/vendor/just-the-docs/assets/js/vendor/lunr.min.js"));
  const onlineSrc = read("builder/vendor/just-the-docs/assets/js/just-the-docs.js");
  const evalSrc = read("eval/site_search.mjs");
  const fn = (src, name, label) => {
    const m = src.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\r?\\n\\}`));
    assert.ok(m, `${label} has no ${name}()`);
    return m[0];
  };
  const boost = (src, label) => {
    const m = src.match(/WHOLE_TITLE_BOOST = (\d+(\.\d+)?);/);
    assert.ok(m, `${label} has no WHOLE_TITLE_BOOST`);
    return m[0];
  };
  const names = ["phraseKey", "indexTermKey", "boostWholeTitles"];
  const load = (src, label) =>
    `var ${boost(src, label)}\n` + names.map((n) => fn(src, n, label)).join("\n") + "\nreturn boostWholeTitles;";

  test("both boost the same results by the same factor", () => {
    const online = new Function("lunr", load(onlineSrc, "just-the-docs.js"))(lunr);
    const replica = new Function(load(evalSrc, "eval/site_search.mjs"))();
    assert.equal(boost(onlineSrc, "just-the-docs.js"), boost(evalSrc, "eval/site_search.mjs"));
    const docs = {
      0: { doc: "DTPicker", title: "DTPicker class" },
      1: { doc: "Return Syntax", title: "Return Syntax" },
      2: { doc: "DTPicker", title: "Properties" },
      3: { doc: "Other", title: "DTPicker-Properties!" },
      4: {},
    };
    const results = () => [0, 1, 2, 3, 4].map((ref) => ({ ref: String(ref), score: [10, 6, 4, 1, 0.5][ref] }));
    const tokens = (q) => lunr.tokenizer(q).map((t) => lunr.trimmer(t)).filter((t) => t.str !== "");
    const run = (q) => {
      const a = online(results(), docs, tokens(q), {});
      const b = replica(lunr, results(), docs, tokens(q), new Map());
      assert.deepEqual(a, b, `the two rank ${JSON.stringify(q)} differently`);
      return a.map((r) => r.ref);
    };
    // The section, by its page title plus its own; and a title spelled
    // with other punctuation and case.
    assert.deepEqual(run("dtpicker properties"), ["2", "0", "1", "3", "4"]);
    assert.deepEqual(run("Return syntax"), ["1", "0", "2", "3", "4"]);
    // One word is never boosted, nor is part of a title.
    assert.deepEqual(run("DTPicker"), ["0", "1", "2", "3", "4"]);
    assert.deepEqual(run("DTPicker Properties class"), ["0", "1", "2", "3", "4"]);
  });

  test("both apply it to the final results", () => {
    assert.match(onlineSrc, /var titleKeys = \{\};/, "just-the-docs.js keeps no keys");
    assert.match(onlineSrc, /\}\s*results = boostWholeTitles\(results, docs, baseTokens, titleKeys\);\s*var statusEl/, "just-the-docs.js doesn't boost the final results");
    assert.match(evalSrc, /return boostWholeTitles\(lunr, results, docs, baseTokens, titleKeys\.get\(docs\)\);\s*\}/, "the replica doesn't boost the final results");
  });

  test("the replica ranks a page's section first by its whole title", () => {
    const docs = {
      0: { doc: "DTPicker", title: "DTPicker class", content: "A date and time picker control. The field shows the date, formatted per Format; its properties set the rest.", relUrl: "/DTPicker#dtpicker-class" },
      1: { doc: "DTPicker", title: "Properties", content: " ", relUrl: "/DTPicker#properties" },
    };
    // As on the site, a few percent of entries are a Properties section,
    // so lunr alone puts the class's heading first: it holds the rarer word
    // in `title`, the section only in `page`.
    for (let k = 2; k < 20; k++) docs[k] = { doc: `Control${k}`, title: "Properties", content: " ", relUrl: `/Control${k}#properties` };
    for (let k = 20; k < 1000; k++) docs[k] = { doc: `Page ${k}`, title: `Page ${k}`, content: "unrelated text", relUrl: `/P${k}` };
    const urls = (q) => search({ lunr, index: buildIndex(lunr, docs), docs }, q).map((r) => docs[r.ref].relUrl);
    assert.equal(urls("DTPicker Properties")[0], "/DTPicker#properties");
    assert.equal(urls("DTPicker")[0], "/DTPicker#dtpicker-class");
  });
});

// Entities (WIP.Search.md, "Fixed: entities in the index"): the search data
// keeps the page's HTML entities, which the results panel needs, so each
// copy's tokenizer wrapper decodes them per token, after the split.
describe("entity guard: online client, offline client, eval replica", () => {
  const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
  const lunr = loadLunr(path.join(REPO_ROOT, "builder/vendor/just-the-docs/assets/js/vendor/lunr.min.js"));
  const onlineSrc = read("builder/vendor/just-the-docs/assets/js/just-the-docs.js");
  const evalSrc = read("eval/site_search.mjs");

  test("all three decode each token in the tokenizer wrapper", () => {
    for (const [label, src] of [
      ["just-the-docs.js", onlineSrc],
      ["offline.mjs", read("builder/offline.mjs")],
      ["eval/site_search.mjs", evalSrc],
    ]) {
      assert.match(src, /return originalTokenizer\(input\)\.map\(decodeTokenEntities\);/, `${label}'s tokenizer wrapper doesn't decode entities`);
    }
  });

  test("the online client and the replica decode alike, keeping each token's position", () => {
    const load = (src, label) => {
      const table = src.match(/(var|const) NAMED_ENTITIES = \{[^}]*\};/);
      const fn = src.match(/function decodeTokenEntities\(token\) \{[\s\S]*?\r?\n\}/);
      assert.ok(table && fn, `${label} has no decodeTokenEntities()`);
      return new Function(`${table[0]}\n${fn[0]}\nreturn decodeTokenEntities;`)();
    };
    const online = load(onlineSrc, "just-the-docs.js");
    const replica = load(evalSrc, "eval/site_search.mjs");
    const text = "Err &amp;H80004005 at&amp;t &lt;&lt;= &#45;&gt; &#8617; &#x41; &bogus; &#1114112; plain";
    // Tokens as lunr's tokenizer makes them: lowercased, positioned in the
    // escaped text.
    const tokens = (decode) => text.split(" ").map((str) => decode(new lunr.Token(str.toLowerCase(), { position: [0, str.length] })));
    const a = tokens(online);
    const b = tokens(replica);
    assert.deepEqual(a.map((t) => t.str), b.map((t) => t.str));
    assert.deepEqual(a.map((t) => t.str), ["err", "&h80004005", "at&t", "<<=", "->", "↩", "a", "&bogus;", "&#1114112;", "plain"]);
    assert.deepEqual(a[1].metadata.position, [0, "&amp;H80004005".length], "a decoded token lost its position in the escaped text");
  });

  test("the replica finds an entity-escaped hex literal, and highlights it where it is written", () => {
    const docs = {
      0: { doc: "Printers", title: "Indexing", content: "An invalid index raises error 5 (&amp;H80004005).", relUrl: "/Printers#indexing" },
      1: { doc: "Other", title: "Other", content: "Nothing to see.", relUrl: "/Other" },
    };
    const ctx = { lunr, index: buildIndex(lunr, docs), docs };
    const results = search(ctx, "&H80004005");
    assert.deepEqual(results.map((r) => docs[r.ref].relUrl), ["/Printers#indexing"]);
    const [start, length] = results[0].matchData.metadata.h80004005.content.position[0];
    assert.equal(docs[0].content.slice(start, start + length), "(&amp;H80004005).");
  });
});

// lunr 2.3.9's Index#query gathers a REQUIRED clause's entries as a running
// total of set unions, and each union copied both sets, so a short wildcard
// word made a query quadratic (WIP.Search.md, "Fixed: slow multi-word
// queries"). All three copies install a union that adds in place.
describe("set-union guard: online client, offline client, eval replica", () => {
  const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
  const lunrPath = path.join(REPO_ROOT, "builder/vendor/just-the-docs/assets/js/vendor/lunr.min.js");
  const lunr = loadLunr(lunrPath);
  const ownSrc = read(path.relative(REPO_ROOT, lunrPath)).match(/Set\.prototype\.union=(function\(e\)\{return .*?\)\)\})/);
  const lunrsOwn = new Function("T", `return ${ownSrc[1]};`)(lunr);
  // A Set of its own, so the online client's patch can be installed on it
  // without touching the replica's lunr.
  const onlineUnion = () => {
    const OwnSet = function (elements) {
      lunr.Set.call(this, elements);
    };
    OwnSet.prototype = Object.create(lunr.Set.prototype);
    OwnSet.prototype.union = lunrsOwn;
    OwnSet.complete = lunr.Set.complete;
    OwnSet.empty = lunr.Set.empty;
    const src = read("builder/vendor/just-the-docs/assets/js/just-the-docs.js").match(/function accumulateSetUnions\(\) \{[\s\S]*?\r?\n\}/);
    assert.ok(src, "just-the-docs.js has no accumulateSetUnions()");
    const fake = { Set: OwnSet };
    new Function("lunr", `${src[0]}\naccumulateSetUnions();`)(fake);
    assert.notEqual(OwnSet.prototype.union, lunrsOwn);
    return OwnSet;
  };

  test("both give lunr's own sets and lengths, keep their inputs, and add in place", () => {
    const sets = [["d1", "d2"], ["d2", "d3", "d4"], ["d4"], ["d5", "d1", "d6"], []];
    const run = (SetClass, union) => {
      const inputs = sets.map((keys) => new SetClass(keys));
      // Each step's total as it stood then, and the total itself.
      const steps = [];
      const totals = [];
      let total = lunr.Set.empty;
      for (const s of inputs) {
        total = s === inputs[0] ? total.union(s) : union.call(total, s);
        steps.push([Object.keys(total.elements), total.length]);
        totals.push(total);
      }
      return { inputs, steps, totals };
    };
    const own = run(lunr.Set, lunrsOwn);
    const OwnSet = onlineUnion();
    for (const [label, got] of [["just-the-docs.js", run(OwnSet, OwnSet.prototype.union)], ["eval/site_search.mjs", run(lunr.Set, lunr.Set.prototype.union)]]) {
      assert.deepEqual(got.steps.map(([keys]) => keys), own.steps.map(([keys]) => keys), `${label}'s unions hold other elements than lunr's`);
      assert.deepEqual(got.steps.map(([, length]) => length), own.steps.map(([, length]) => length), `${label}'s unions have other lengths than lunr's`);
      assert.deepEqual(got.inputs.map((s) => [Object.keys(s.elements), s.length]), sets.map((keys) => [keys, keys.length]), `${label} changed a set it took in`);
      assert.ok(got.totals[1] !== got.inputs[0] && got.totals.slice(2).every((s) => s === got.totals[1]), `${label} copies the running total instead of adding to it`);
    }
    assert.equal(lunr.Set.complete.union(new lunr.Set(["1"])), lunr.Set.complete);
    assert.equal(lunr.Set.prototype.union.call(new lunr.Set(["1"]), lunr.Set.complete), lunr.Set.complete);
  });

  test("the replica ranks exactly as with lunr's own union", () => {
    const words = ["alpha", "able", "about", "page", "paging", "apart", "pane", "form", "the", "a"];
    const docs = {};
    for (let i = 0; i < 60; i++) {
      docs[i] = { doc: `Page ${i}`, title: `${words[i % 10]} ${words[(i * 7) % 10]}`, content: words.filter((_, w) => (i >> (w % 6)) & 1).join(" "), relUrl: `/P${i}` };
    }
    const ctx = { lunr, index: buildIndex(lunr, docs), docs };
    const queries = ["a page", "a p", "the form", "ab pa", "a"];
    const ranked = () => queries.map((q) => search(ctx, q).map((r) => `${r.ref}:${r.score}`));
    const patched = ranked();
    const saved = lunr.Set.prototype.union;
    lunr.Set.prototype.union = lunrsOwn;
    try {
      assert.deepEqual(patched, ranked());
    } finally {
      lunr.Set.prototype.union = saved;
    }
    assert.ok(patched[0].length > 1, "the fixture no longer exercises the all-words pass");
  });

  test("all three install it when they build the index", () => {
    assert.match(read("builder/vendor/just-the-docs/assets/js/just-the-docs.js"), /\s+separateTokenSetKeys\(\);\s*accumulateSetUnions\(\);/);
    assert.match(read("builder/offline.mjs"), /\s+separateTokenSetKeys\(\);\s*accumulateSetUnions\(\);/);
    assert.match(read("eval/site_search.mjs"), /\s+separateTokenSetKeys\(lunr\);\s+accumulateSetUnions\(lunr\);\s+return lunr;/);
  });
});
