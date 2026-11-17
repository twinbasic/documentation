// The gate on builder/search-index.mjs's split build: the search index the
// build writes in slices on its lanes must be, byte for byte, the index lunr
// itself makes in one (lunr(config) and JSON.stringify), for any number of
// slices. lunr has no way to merge two indexes, so the build merges what
// each slice's lunr.Builder holds and makes the vectors from totals of its
// own (WIP.Search.md, "The pre-built index"); a change to how it does that,
// or a lunr whose builder keeps its state otherwise, gives a slightly
// different ranking that nothing else would notice.
//
// The fixture is made to reach the merge's corners: terms that look like
// numbers (which JavaScript orders before other keys), terms a later slice
// meets first, terms only one slice has, empty fields, HTML entities, stem
// twins, hand-marked index terms and a slice with a single entry.
//
// Runs with a bare `node --test test/search-index.test.mjs`; no build needed.

import assert from "node:assert/strict";
import vm from "node:vm";
import { describe, test } from "node:test";

import {
  addSlice,
  assembleIndexJson,
  buildIndex,
  buildIndexJson,
  indexSliceCount,
  invertedIndexJson,
  loadSearchLunr,
  mergeSlices,
  offlineSearchIndexJs,
  packTotals,
  planIndexSlices,
  searchIndexFile,
  sliceVectors,
  unpackTotals,
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

  test("in one slice it is lunr()'s own", () => {
    assert.equal(buildIndexJson(docs, { slices: 1 }), reference);
  });

  for (const slices of [2, 3, 7, 119]) {
    test(`in ${slices} slices it is lunr()'s, byte for byte`, () => {
      assert.equal(buildIndexJson(docs, { slices }), reference);
    });
  }

  test("more slices than entries gives one entry each", () => {
    const few = fixture(4);
    assert.equal(buildIndexJson(few, { slices: 16 }), JSON.stringify(buildIndex(lunr, few)));
  });

  // As the build runs it: each slice's builder kept for its vectors, and the
  // totals read back from the SharedArrayBuffer the lanes are sent.
  test("through the totals the lanes are sent it is lunr()'s, byte for byte", () => {
    const plan = planIndexSlices(lunr, JSON.parse(JSON.stringify(docs)), 5);
    // Each slice's payload as JSON, as fanOut packs it.
    const lanes = plan.map((p) => JSON.parse(JSON.stringify(p))).map((p) => addSlice(lunr, p.docs, p.twins));
    const { merged, totals } = mergeSlices(lanes.map((l) => l.added));
    const sab = packTotals(totals);
    const vectors = lanes.map((l, s) => sliceVectors(lunr, l.state, unpackTotals(sab, s)));
    assert.equal(assembleIndexJson(lunr, vectors, invertedIndexJson(merged)), reference);
  });

  test("the slices hold every entry once, in order, none of them empty", () => {
    const ids = Object.keys(docs);
    for (const count of [1, 2, 5, 37, 119, 120, 500]) {
      const plan = planIndexSlices(lunr, docs, count);
      assert.equal(plan.length, Math.min(count, ids.length));
      assert.deepEqual(
        plan.flatMap((p) => Object.keys(p.docs)),
        ids,
      );
      assert.ok(plan.every((p) => Object.keys(p.docs).length > 0));
    }
  });

  test("an index loaded from it answers as lunr()'s does", () => {
    const loaded = lunr.Index.load(JSON.parse(buildIndexJson(docs, { slices: 3 })));
    const built = buildIndex(lunr, docs);
    for (const q of ["form", "f*", "window print", "1", "h80004005", "loop", "printer.font", "onlylast119"]) {
      assert.deepEqual(
        loaded.search(q).map((r) => [r.ref, r.score]),
        built.search(q).map((r) => [r.ref, r.score]),
        `${JSON.stringify(q)} finds other results`,
      );
    }
  });
});

describe("the files the build writes", () => {
  const lunr = loadSearchLunr();
  const docs = fixture(20);

  test("search-index.json holds the entries and lunr's JSON of their index, and nothing else", () => {
    const json = JSON.stringify(buildIndex(lunr, docs));
    const text = searchIndexFile(json, docs);
    assert.deepEqual(JSON.parse(text), { docs, index: JSON.parse(json) });
    // The index exactly as lunr wrote it, and the entries in their order.
    assert.equal(text, `{"docs":${JSON.stringify(docs)},"index":${json}}\n`);
    assert.deepEqual(Object.keys(JSON.parse(text).docs), Object.keys(docs));
  });

  test("search-index.js sets window.SEARCH_INDEX to the same entries and index", () => {
    const text = searchIndexFile(JSON.stringify(buildIndex(lunr, docs)), docs);
    const window = {};
    vm.runInNewContext(offlineSearchIndexJs(text), { window, JSON });
    assert.deepEqual(window.SEARCH_INDEX, JSON.parse(text));
  });

  test("a site of a few hundred entries is one slice, a larger one a few for each lane", () => {
    assert.equal(indexSliceCount(10, 16), 1);
    assert.equal(indexSliceCount(499, 4), 1);
    assert.equal(indexSliceCount(1500, 4), 3);
    assert.equal(indexSliceCount(13000, 4), 8);
    assert.equal(indexSliceCount(13000, 64), 26);
  });
});
