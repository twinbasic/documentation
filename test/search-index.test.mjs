// The gate on builder/search-index.mjs's split build: the search index the
// build writes on several threads must be, byte for byte, the index lunr
// itself makes on one (lunr(config) and JSON.stringify), for any number of
// threads. lunr has no way to merge two indexes, so the build merges what
// each thread's lunr.Builder holds and makes the vectors from totals of its
// own (WIP.Search.md, "The pre-built index"); a change to how it does that,
// or a lunr whose builder keeps its state otherwise, gives a slightly
// different ranking that nothing else would notice.
//
// The fixture is made to reach the merge's corners: terms that look like
// numbers (which JavaScript orders before other keys), terms a later thread
// meets first, terms only one thread has, empty fields, HTML entities, stem
// twins, hand-marked index terms and a thread with a single entry.
//
// Runs with a bare `node --test test/search-index.test.mjs`; no build needed.

import assert from "node:assert/strict";
import vm from "node:vm";
import { describe, test } from "node:test";

import {
  buildIndex,
  buildIndexJson,
  defaultIndexWorkers,
  loadSearchLunr,
  offlineSearchIndexJs,
  searchIndexFile,
} from "../builder/search-index.mjs";

// A deterministic fixture of `count` entries.
function fixture(count) {
  const words = [
    "form",
    "forms",
    "window",
    "print",
    "debug",
    "1",
    "10",
    "2025",
    "0",
    "007",
    "x86",
    "&amp;H80004005",
    "a&nbsp;b",
    "Do...Loop",
    "a/b",
    "Straße",
    "is",
    "the",
    "with",
    "Time$",
    "#If",
    "<>",
    "late-binding",
  ];
  let seed = 7;
  const next = (n) => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed % n;
  };
  const text = (n) => Array.from({ length: n }, () => words[next(words.length)]).join(" ");
  const docs = {};
  for (let i = 0; i < count; i++) {
    const doc = {
      doc: `Page ${i % 9}`,
      title: i % 5 === 0 ? "" : text(1 + next(3)),
      content: i % 11 === 0 ? "" : text(next(25)),
      relUrl: `/P${i}#s${i}`,
    };
    if (i % 3 === 0) doc.names = `Name${i % 4} Font Fonts`;
    if (i % 3 === 0) doc.qualified = `Printer.Font Printer.Fonts C${i % 4}.Name${i % 4}`;
    if (i % 7 === 0) doc.primary = `Name${i % 4}`;
    if (i % 13 === 0) doc.index = [`term ${i}`];
    if (i % 17 === 0) doc.index_also = ["late binding", "File I/O"];
    // A word only the last entries hold, so the last thread meets it first.
    if (i > count - 3) doc.content += ` onlylast${i} 99999`;
    docs[i] = doc;
  }
  return docs;
}

describe("the split build is lunr()'s", () => {
  const lunr = loadSearchLunr();
  const docs = fixture(120);
  const reference = JSON.stringify(buildIndex(lunr, docs));

  test("on one thread it is lunr()'s own", async () => {
    assert.equal(await buildIndexJson(docs, { workers: 1 }), reference);
  });

  for (const workers of [2, 3, 7, 119]) {
    test(`on ${workers} threads it is lunr()'s, byte for byte`, async () => {
      assert.equal(await buildIndexJson(docs, { workers }), reference);
    });
  }

  test("more threads than entries gives one entry each", async () => {
    const few = fixture(4);
    assert.equal(await buildIndexJson(few, { workers: 16 }), JSON.stringify(buildIndex(lunr, few)));
  });

  test("an index loaded from it answers as lunr()'s does", async () => {
    const loaded = lunr.Index.load(JSON.parse(await buildIndexJson(docs, { workers: 3 })));
    const built = buildIndex(lunr, docs);
    for (const q of ["form", "f*", "window print", "1", "h80004005", "loop", "printer.font", "onlylast119"]) {
      assert.deepEqual(
        loaded.search(q).map((r) => [r.ref, r.score]),
        built.search(q).map((r) => [r.ref, r.score]),
        `${JSON.stringify(q)} finds other results`,
      );
    }
  });

  test("a thread that fails fails the build", async () => {
    // Only a thread reads `index` (indexField()), and a string has no map().
    const broken = { ...docs, 119: { ...docs[119], index: "not a list" } };
    await assert.rejects(buildIndexJson(broken, { workers: 2 }), /search index worker: TypeError/);
  });
});

describe("the files the build writes", () => {
  const lunr = loadSearchLunr();
  const docs = fixture(20);

  test("search-index.json is lunr's JSON with the check added", () => {
    const json = JSON.stringify(buildIndex(lunr, docs));
    const file = JSON.parse(searchIndexFile(json, docs));
    const { tbdocs, ...lunrsOwn } = file;
    assert.deepEqual(lunrsOwn, JSON.parse(json));
    assert.equal(tbdocs.entries, 20);
    assert.match(tbdocs.digest, /^[0-9a-f]{8}$/);
  });

  test("search-index.js sets window.SEARCH_INDEX to the same index", () => {
    const text = searchIndexFile(JSON.stringify(buildIndex(lunr, docs)), docs);
    const window = {};
    vm.runInNewContext(offlineSearchIndexJs(text), { window, JSON });
    assert.deepEqual(window.SEARCH_INDEX, JSON.parse(text));
  });

  test("a site of a few hundred entries starts no thread", () => {
    assert.equal(defaultIndexWorkers(10), 1);
    assert.equal(defaultIndexWorkers(499), 1);
    assert.ok(defaultIndexWorkers(12000) >= 1 && defaultIndexWorkers(12000) <= 8);
  });
});
