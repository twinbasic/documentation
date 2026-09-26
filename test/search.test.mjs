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
import { deriveSearchEntries, joinSymbolsToEntries, renderEntryString } from "../builder/search.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// A minimal tbdocs page, holding exactly the fields deriveSearchEntries
// and extractSections read: frontmatter.title (+ optional
// search_exclude), renderedContent (post-render HTML, as
// headingLevelNormalizePlugin would have left it), and permalink.
// destPath is only read inside an error message for a page with no
// renderedContent, which these tests never trigger.
function page({ title, content, permalink = "/Widget/", searchExclude }) {
  return {
    frontmatter: {
      title,
      ...(searchExclude === undefined ? {} : { search_exclude: searchExclude }),
    },
    renderedContent: content,
    permalink,
    destPath: permalink,
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
// both space-separated and deduplicated. See builder/tbdocs.mjs's
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
