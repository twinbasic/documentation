// The site search's lunr index, built once by the build rather than in every
// reader's browser on every page. The build writes it as lunr's own JSON
// (lunr.Index#toJSON), with the search entries it indexes, to
// assets/js/search-index.json; the page loads it with lunr.Index.load on the
// first keystroke. See WIP.Search.md, "The pre-built index".
//
// This file is the one definition of the index: its fields and boosts, what
// each field holds (exactName, qualifiedField, indexField, ...), and the
// patches to lunr that change what a word becomes (the tokenizer). The page
// keeps its own copies of what a query needs too -- the tokenizer, exactName,
// indexTermKey -- and test/search.test.mjs checks that they agree with these.
//
// The index is built in slices, which the build runs on its lanes as tasks
// of its graph (tbdocs.mjs: indexSlices, indexAdd:i, indexMerge, indexTerms,
// indexVectors:i, searchIndex). lunr has no way to merge two indexes, but
// most of a build is independent per entry, so:
//
//   1. each slice, a contiguous run of the entries, is added to a
//      lunr.Builder of its own (addSlice), which returns its postings, its
//      counts and its field lengths;
//   2. the postings are merged (mergeSlices), every term numbered as one
//      build would number it (in order of first appearance, entry by entry),
//      and each term's document count and each field's average length are
//      worked out over all the entries;
//   3. each slice's builder makes its entries' field vectors (sliceVectors,
//      lunr's own createFieldVectors) with those totals;
//   4. the JSON is written as lunr's toJSON writes it (invertedIndexJson,
//      assembleIndexJson).
//
// The result is byte for byte what lunr(config) and JSON.stringify make on
// one thread, which test/search-index.test.mjs checks, for any number of
// slices. The token set, a third of a one-thread build, is never made here:
// it is not part of the JSON, and Index.load makes it in the page.
//
// Nothing here starts a thread: every step runs on the thread that calls it,
// and the build's graph decides where (WIP.Build.md, "No task starts a
// thread"). buildIndexJson runs every step on one thread, for the tests and
// for any tool that wants the index outside a build.

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { writeFileMkdirp } from "./write.mjs";

const require = createRequire(import.meta.url);

// The vendored lunr the site publishes as assets/js/vendor/lunr.min.js.
export const LUNR_PATH = fileURLToPath(new URL("./vendor/just-the-docs/assets/js/vendor/lunr.min.js", import.meta.url));

// The index's fields, in order, at their boosts. `exact`, `primary` and
// `index` are searched only by the clauses written for them (see doSearch() in
// just-the-docs.js); the rest are the text fields. See WIP.Search.md, "Index
// fields".
export const FIELDS = [
  ["title", { boost: 200 }],
  ["content", { boost: 2 }],
  // Joined in from the symbol index (builder/search.mjs's
  // joinSymbolsToEntries): bare names, and their `Container.Name` forms.
  // Two fields, since BM25 discounts a match inside a long field
  // (WIP.Search.md, "Design" §2).
  ["names", { boost: 100 }],
  ["qualified", { boost: 500 }],
  // Each name whole, as exactName() writes it; the same for the types and
  // language elements; the page's title (WIP.Search.md, "Reader intent").
  ["exact", { boost: 50 }],
  ["primary", { boost: 1000 }],
  ["page", { boost: 5 }],
  // The hand-marked index terms, as indexField() writes them
  // (WIP.Search.md, "Hand-marked index entries").
  ["index", { boost: 1000 }],
  ["relUrl", {}],
];

// ── lunr, patched ──────────────────────────────────────────────────────────

// The vendored lunr with the site's patches installed, once per copy of
// lunr (require() caches it, so per path and per thread). The page installs
// the same patches (installSearchPatches() in just-the-docs.js).
export function loadSearchLunr(lunrPath = LUNR_PATH) {
  const lunr = require(lunrPath);
  installPatches(lunr);
  return lunr;
}

function installPatches(lunr) {
  // The tokenizer splits on `/` as well as on whitespace and hyphens, turns
  // a run of two or more dots into spaces first ("Do...Loop", "For
  // Each...Next"), and decodes each token's HTML entities after the split.
  // The wrapper carries `separator` itself, since the original tokenizer
  // reads lunr.tokenizer.separator when it runs, and that is now the
  // wrapper's. A Builder takes lunr.tokenizer when it is made, so this comes
  // before any build. WIP.Search.md, "Design §5" B and "lunr patches".
  if (!lunr.tokenizer.dotRunSplit) {
    const originalTokenizer = lunr.tokenizer;
    const dotRunSplitTokenizer = (input) => {
      if (typeof input === "string") input = input.replace(/\.{2,}/g, (m) => " ".repeat(m.length));
      return originalTokenizer(input).map(decodeTokenEntities);
    };
    dotRunSplitTokenizer.dotRunSplit = true;
    dotRunSplitTokenizer.separator = /[\s\-/]+/;
    lunr.tokenizer = dotRunSplitTokenizer;
  }
  separateTokenSetKeys(lunr);
  accumulateSetUnions(lunr);
}

// The search data keeps the page's HTML entities, which the results panel
// needs, so each token's are decoded after the split, keeping its position
// in the escaped text: `&amp;H80004005` indexes as `h80004005`. A decoded
// character that would separate words doesn't split its token.
// `&nbsp;` decodes to a no-break space, U+00A0, as in the page.
const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u{A0}" };

export function decodeTokenEntities(token) {
  if (token.str.indexOf("&") === -1) return token;
  return token.update((str) =>
    str.replace(/&(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-f]+);/g, (m, name) => {
      if (name.charAt(0) !== "#") return NAMED_ENTITIES[name];
      const code = name.charAt(1) === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      // Lowercased, as lunr's tokenizer lowercases everything else.
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code).toLowerCase() : m;
    }),
  );
}

// lunr 2.3.9 keys a token set's nodes for minimisation by TokenSet#toString(),
// which writes each edge's label and its child's id with nothing between
// them, so `{1 -> 656}` and `{1 -> 6, 5 -> 6}` both key as `01656`: the token
// set then holds words no entry has and loses real ones. A `,` after each id
// keeps the keys apart. The build never makes a token set, but a query of the
// index this file makes (eval/site_search.mjs) does, in Index.load.
function separateTokenSetKeys(lunr) {
  if (lunr.TokenSet.prototype.toString.separated) return;
  const separated = function () {
    if (this._str) return this._str;
    let str = this.final ? "1" : "0";
    for (const label of Object.keys(this.edges).sort()) str += label + this.edges[label].id + ",";
    return str;
  };
  separated.separated = true;
  lunr.TokenSet.prototype.toString = separated;
}

// lunr 2.3.9's Index#query gathers a REQUIRED clause's entries as a running
// total, and Set#union copies both sets every time, which made a short
// wildcard word quadratic. A set that union() made takes the next set into
// itself, in place, with lunr's own length. Query-only, like the one above.
function accumulateSetUnions(lunr) {
  const union = lunr.Set.prototype.union;
  if (union.accumulates) return;
  const accumulating = function (other) {
    if (other === lunr.Set.complete || other === lunr.Set.empty) return union.call(this, other);
    let set = this;
    if (set.distinct === undefined) {
      set = new lunr.Set(Object.keys(this.elements));
      set.distinct = set.length;
    }
    const keys = Object.keys(other.elements);
    set.length = set.distinct + keys.length;
    for (const key of keys) {
      if (!set.elements[key]) {
        set.elements[key] = true;
        set.distinct++;
      }
    }
    return set;
  };
  accumulating.accumulates = true;
  lunr.Set.prototype.union = accumulating;
}

// ── What each field holds ──────────────────────────────────────────────────

// A name as `exact` and `primary` hold it: lowercased, with every non-word
// character spelled as `_` and its hex code, and `_` appended. lunr's trimmer
// would strip those characters from the ends (`#If` to `if`, `<>` to
// nothing); spelled out, they survive. The final `_` keeps a whole-name query
// off every longer name that starts with it (`Node` against `Nodes`).
export function exactName(name) {
  return name.toLowerCase().replace(/\W/g, (c) => "_" + c.charCodeAt(0).toString(16)) + "_";
}

// The qualified names that the stemmer merges with another name's
// (`Printer.Font` and `Printer.Fonts` both stem to `printer.font`), which
// would otherwise tie in `qualified`. Keyed by the name as the tokenizer
// writes it.
export function stemTwins(lunr, docs) {
  const byStem = new Map();
  for (const id in docs) {
    for (const token of lunr.tokenizer(docs[id].qualified || "")) {
      const stem = lunr.stemmer(lunr.trimmer(token.clone())).toString();
      if (!byStem.has(stem)) byStem.set(stem, new Set());
      byStem.get(stem).add(token.str);
    }
  }
  return new Set([...byStem.values()].filter((names) => names.size > 1).flatMap((names) => [...names]));
}

// An entry's `qualified`: its qualified names, and those of them that have a
// stem twin also whole, as exactName() writes them, so that a query naming
// one finds it and not its twin. Only those: held for every qualified name,
// the whole names took 19 MB more heap in the page.
export function qualifiedField(lunr, doc, twins) {
  const qualified = doc.qualified || "";
  const whole = lunr
    .tokenizer(qualified)
    .filter((t) => twins.has(t.str))
    .map((t) => exactName(t.str));
  return whole.length ? `${qualified} ${whole.join(" ")}` : qualified;
}

// A hand-marked index term as `index` holds it: its words as the index holds
// words (tokenized, trimmed, stemmed) joined by `_`, with `_` appended, so the
// whole term is one token that a query matches only by naming all of it. No
// stemmer rule touches a word ending in `_`, and the trimmer keeps it.
export function phraseKey(lunr, tokens) {
  return tokens.map((t) => lunr.stemmer(t.clone()).toString()).join("_") + "_";
}

export function indexTermKey(lunr, term) {
  const tokens = lunr
    .tokenizer(term)
    .map((t) => lunr.trimmer(t))
    .filter((t) => t.str !== "");
  return tokens.length ? phraseKey(lunr, tokens) : "";
}

// An entry's `index`: its main terms (`index`) as indexTermKey() writes them,
// and its secondary ones (`index_also`) with one more `_`, so that a query
// can weigh the two apart within one field. One field, not two, since lunr
// gives every term in the index a slot for every field.
export function indexField(lunr, doc) {
  const main = (doc.index || []).map((t) => indexTermKey(lunr, t)).filter(Boolean);
  const also = (doc.index_also || [])
    .map((t) => indexTermKey(lunr, t))
    .filter(Boolean)
    .map((k) => k + "_");
  return main.concat(also).join(" ");
}

// An entry's content, with its index terms appended as plain words, so an
// entry marked `late binding` still has both words when a query requires all
// of them.
export function indexedContent(doc) {
  const terms = (doc.index || []).concat(doc.index_also || []);
  return terms.length ? doc.content + " " + terms.join(" ") : doc.content;
}

// The document lunr adds for docs[id].
export function entryFor(lunr, docs, id, twins) {
  const doc = docs[id];
  return {
    id,
    title: doc.title,
    content: indexedContent(doc),
    names: doc.names || "",
    qualified: qualifiedField(lunr, doc, twins),
    exact: (doc.names || "").split(/\s+/).filter(Boolean).map(exactName).join(" "),
    primary: (doc.primary || "").split(/\s+/).filter(Boolean).map(exactName).join(" "),
    page: doc.doc || "",
    index: indexField(lunr, doc),
    relUrl: doc.relUrl,
  };
}

// ── Building ───────────────────────────────────────────────────────────────

// BM25 scales a match by its field's length against the average length of
// that field, and `index` is empty on nearly every entry, so its average is
// near zero and a marked entry looked a thousand times too long. A term
// fills the field on its own, so the average is pinned at one term.
function pinIndexFieldLengths(builder) {
  const averageLengths = builder.calculateAverageFieldLengths;
  builder.calculateAverageFieldLengths = function () {
    averageLengths.call(this);
    this.averageFieldLength.index = 1;
  };
}

// The index's configuration, called on a new builder as lunr(config) calls
// config. lunr's index pipeline drops English stop words, and its search
// pipeline never did, so a query for `Do`, `For` or `With` (twinBASIC
// keywords) could never match: the filter comes out.
function configure(lunr, builder) {
  builder.ref("id");
  for (const [name, attributes] of FIELDS) builder.field(name, attributes);
  builder.metadataWhitelist = ["position"];
  pinIndexFieldLengths(builder);
  builder.pipeline.remove(lunr.stopWordFilter);
}

// A builder as lunr(config) makes one, before it adds anything.
export function newBuilder(lunr) {
  const builder = new lunr.Builder();
  builder.pipeline.add(lunr.trimmer, lunr.stopWordFilter, lunr.stemmer);
  builder.searchPipeline.add(lunr.stemmer);
  configure(lunr, builder);
  return builder;
}

// The index of `docs` (search-data.json, parsed), on this thread, by lunr
// itself: the one the split build must equal.
export function buildIndex(lunr, docs) {
  const twins = stemTwins(lunr, docs);
  return lunr(function () {
    configure(lunr, this);
    for (const id in docs) this.add(entryFor(lunr, docs, id, twins));
  });
}

// How many slices the build cuts an index of `entries` entries into:
// SLICES_PER_LANE for each lane, so that a lane that finishes early takes
// another while a lane still busy with something else catches up; and one for
// every 500 entries, so that a small tree (a test fixture) is one slice.
export const SLICES_PER_LANE = 2;
export function indexSliceCount(entries, lanes) {
  return Math.max(1, Math.min(lanes * SLICES_PER_LANE, Math.floor(entries / 500)));
}

// `docs` cut into `count` slices, contiguous runs of the entries in order,
// each with the stem twins of every entry (qualifiedField needs all of them).
// Each is what one addSlice takes: { slice, docs, twins }. The runs are of
// about equal text rather than of equal entries: adding an entry costs about
// as much as its text is long, and the entries run from a line to a page.
export function planIndexSlices(lunr, docs, count) {
  const ids = Object.keys(docs);
  const n = Math.max(1, Math.min(count, ids.length));
  const twins = [...stemTwins(lunr, docs)];
  const weight = (doc) => 64 + (doc.content?.length ?? 0) + (doc.title?.length ?? 0) + (doc.names?.length ?? 0);
  let total = 0;
  for (const id of ids) total += weight(docs[id]);
  const slices = Array.from({ length: n }, (_, s) => ({ slice: s, docs: {}, twins }));
  let s = 0;
  let inSlice = 0;
  let sofar = 0;
  ids.forEach((id, k) => {
    // Move on once this slice has an entry and its share, or once the
    // entries left are only enough for one in each slice still to come.
    if (s < n - 1 && inSlice > 0 && (sofar >= ((s + 1) * total) / n || ids.length - k <= n - 1 - s)) {
      s++;
      inSlice = 0;
    }
    slices[s].docs[id] = docs[id];
    inSlice++;
    sofar += weight(docs[id]);
  });
  return slices;
}

// Step 1: one slice's entries, added to a builder of its own. Returns the
// builder and its terms, which sliceVectors takes later on the same thread,
// and what mergeSlices takes: each term (in the order this builder met it)
// with its document count and its postings field by field, and each field's
// total length.
export function addSlice(lunr, docs, twins) {
  const builder = newBuilder(lunr);
  const twinSet = twins instanceof Set ? twins : new Set(twins);
  for (const id in docs) builder.add(entryFor(lunr, docs, id, twinSet));

  const fields = Object.keys(builder._fields);
  // In the order the builder met them (each posting's _index), not in key
  // order, which puts terms that look like numbers ("1", "2025") first.
  const terms = new Array(builder.termIndex);
  for (const term in builder.invertedIndex) terms[builder.invertedIndex[term]._index] = term;
  const df = new Int32Array(terms.length);
  const postings = new Array(terms.length);
  for (let k = 0; k < terms.length; k++) {
    const posting = builder.invertedIndex[terms[k]];
    const parts = [];
    // lunr.idf counts an entry once for each field it has the term in.
    for (const f of fields) {
      df[k] += Object.keys(posting[f]).length;
      parts.push(JSON.stringify(posting[f]).slice(1, -1));
    }
    postings[k] = parts.join(FIELD_SEPARATOR);
  }
  const lengths = Object.fromEntries(fields.map((f) => [f, [0, 0]]));
  for (const ref in builder.fieldLengths) {
    const field = lengths[lunr.FieldRef.fromString(ref).fieldName];
    field[0] += builder.fieldLengths[ref];
    field[1] += 1;
  }
  return {
    state: { builder, terms },
    added: { terms, df, postings, lengths, documentCount: builder.documentCount },
  };
}

// Separates a term's per-field postings in what addSlice returns. JSON text
// never holds a raw control character: JSON.stringify escapes them.
export const FIELD_SEPARATOR = "\u{1}";

// Step 2: what every slice added, in slice order, merged. Each term is
// numbered as one build numbers it: a slice's terms come in the order it met
// them, and the slices in the order of their entries. Returns the merged
// postings (for invertedIndexJson), each slice's term numbers, each term's
// idf, and the totals createFieldVectors needs (for sliceVectors).
export function mergeSlices(added) {
  const fields = FIELDS.map(([name]) => name);
  const merged = new Map();
  const lengths = Object.fromEntries(fields.map((f) => [f, [0, 0]]));
  let documentCount = 0;
  const numbers = added.map(({ terms, df, postings, lengths: own, documentCount: count }) => {
    documentCount += count;
    for (const f of fields) {
      lengths[f][0] += own[f][0];
      lengths[f][1] += own[f][1];
    }
    const number = new Int32Array(terms.length);
    for (let k = 0; k < terms.length; k++) {
      let m = merged.get(terms[k]);
      if (!m) {
        m = { number: merged.size, df: 0, parts: fields.map(() => []) };
        merged.set(terms[k], m);
      }
      m.df += df[k];
      const parts = postings[k].split(FIELD_SEPARATOR);
      for (let f = 0; f < fields.length; f++) if (parts[f]) m.parts[f].push(parts[f]);
      number[k] = m.number;
    }
    return number;
  });
  // lunr.idf, from the term's document count over every entry.
  const idf = new Float64Array(merged.size);
  for (const m of merged.values()) {
    const x = (documentCount - m.df + 0.5) / (m.df + 0.5);
    idf[m.number] = Math.log(1 + Math.abs(x));
  }
  // calculateAverageFieldLengths(), and pinIndexFieldLengths().
  const averageFieldLength = {};
  for (const f of fields) averageFieldLength[f] = lengths[f][0] / lengths[f][1];
  averageFieldLength.index = 1;
  return { merged, totals: { numbers, idf, documentCount, averageFieldLength } };
}

// Step 3: lunr's createFieldVectors over one slice's builder (addSlice's
// state), with every term numbered as the whole index numbers it, and the
// counts and averages of every entry (`totals`, from mergeSlices, with
// `numbers` this slice's). Returns the vectors as toJSON writes them, in the
// order of the slice's entries; "" for a slice with none.
export function sliceVectors(lunr, { builder, terms }, { numbers, idf, documentCount, averageFieldLength }) {
  for (let k = 0; k < terms.length; k++) builder.invertedIndex[terms[k]]._index = numbers[k];
  builder.documentCount = documentCount;
  builder.averageFieldLength = averageFieldLength;
  const ownIdf = lunr.idf;
  lunr.idf = (posting) => idf[posting._index];
  try {
    builder.createFieldVectors();
  } finally {
    lunr.idf = ownIdf;
  }
  return Object.keys(builder.fieldVectors)
    .map((ref) => JSON.stringify([ref, builder.fieldVectors[ref].toJSON()]))
    .join(",");
}

// Step 4a: lunr's toJSON of the inverted index, from mergeSlices' merged
// postings: the terms sorted, the postings as JSON.stringify writes them
// (`_index`, then each field, its refs in numeric order). The text between
// the brackets.
export function invertedIndexJson(merged) {
  const fields = FIELDS.map(([name]) => name);
  return [...merged.keys()]
    .sort()
    .map((term) => {
      const m = merged.get(term);
      let s = `[${JSON.stringify(term)},{"_index":${m.number}`;
      for (let f = 0; f < fields.length; f++) s += `,${JSON.stringify(fields[f])}:{${m.parts[f].join(",")}}`;
      return `${s}}]`;
    })
    .join(",");
}

// Step 4b: the index's JSON, from each slice's vectors in slice order and
// invertedIndexJson's text.
export function assembleIndexJson(lunr, vectors, invertedIndex) {
  const fields = FIELDS.map(([name]) => name);
  const pipeline = newBuilder(lunr).searchPipeline.toJSON();
  return (
    `{"version":${JSON.stringify(lunr.version)},"fields":${JSON.stringify(fields)},` +
    `"fieldVectors":[${vectors.filter(Boolean).join(",")}],` +
    `"invertedIndex":[${invertedIndex}],"pipeline":${JSON.stringify(pipeline)}}`
  );
}

// The index of `docs` as lunr's JSON, every step on this thread, in `slices`
// slices. Every slice count gives the same bytes, and they are lunr()'s.
export function buildIndexJson(docs, { slices = 1, lunrPath = LUNR_PATH } = {}) {
  const lunr = loadSearchLunr(lunrPath);
  const plan = planIndexSlices(lunr, docs, slices);
  const states = [];
  const added = plan.map((p) => {
    const { state, added: a } = addSlice(lunr, p.docs, p.twins);
    states.push(state);
    return a;
  });
  const { merged, totals } = mergeSlices(added);
  const vectors = states.map((state, s) => sliceVectors(lunr, state, { ...totals, numbers: totals.numbers[s] }));
  return assembleIndexJson(lunr, vectors, invertedIndexJson(merged));
}

// ── Between threads ────────────────────────────────────────────────────────

// mergeSlices' totals, packed into one SharedArrayBuffer for the lanes that
// make the vectors: a header (its length, then JSON of where each slice's term
// numbers are), then as float64 the document count, each field's average
// length in FIELDS order, and each term's idf, then as int32 every slice's term
// numbers. A lane reads it in place (unpackTotals).
export function packTotals({ numbers, idf, documentCount, averageFieldLength }) {
  const fields = FIELDS.map(([name]) => name);
  const ranges = [];
  let ints = 0;
  for (const n of numbers) {
    ranges.push([ints, n.length]);
    ints += n.length;
  }
  const head = new TextEncoder().encode(JSON.stringify({ ranges, terms: idf.length }));
  const headBytes = 8 + Math.ceil(head.length / 8) * 8;
  const floats = 1 + fields.length + idf.length;
  const sab = new SharedArrayBuffer(headBytes + floats * 8 + ints * 4);
  new Uint32Array(sab, 0, 1)[0] = head.length;
  new Uint8Array(sab, 8, head.length).set(head);
  const f64 = new Float64Array(sab, headBytes, floats);
  f64[0] = documentCount;
  fields.forEach((f, i) => {
    f64[1 + i] = averageFieldLength[f];
  });
  f64.set(idf, 1 + fields.length);
  const i32 = new Int32Array(sab, headBytes + floats * 8, ints);
  for (let s = 0; s < numbers.length; s++) i32.set(numbers[s], ranges[s][0]);
  return sab;
}

// packTotals' SharedArrayBuffer, read in place, with `numbers` slice `s`'s.
export function unpackTotals(sab, s) {
  const fields = FIELDS.map(([name]) => name);
  const headLength = new Uint32Array(sab, 0, 1)[0];
  const { ranges, terms } = JSON.parse(new TextDecoder().decode(new Uint8Array(sab, 8, headLength).slice()));
  if (!ranges[s]) throw new Error(`search index: no term numbers for slice ${s}`);
  const headBytes = 8 + Math.ceil(headLength / 8) * 8;
  const floats = 1 + fields.length + terms;
  const f64 = new Float64Array(sab, headBytes, floats);
  const averageFieldLength = {};
  fields.forEach((f, i) => {
    averageFieldLength[f] = f64[1 + i];
  });
  const [at, length] = ranges[s];
  return {
    documentCount: f64[0],
    averageFieldLength,
    idf: f64.subarray(1 + fields.length),
    numbers: new Int32Array(sab, headBytes + floats * 8 + at * 4, length),
  };
}

// ── The file the page loads ────────────────────────────────────────────────

// search-index.json, the one file the page loads: the search entries
// (search-data.json, minified) and their index, `{"docs": ..., "index": ...}`.
// One file, so that the page can never hold entries of one build beside an
// index of another, whatever a browser or a CDN keeps from before a deploy:
// an index's entries are numbers into the entries. search-data.json stays
// beside it for the build's own checks and the eval tools, which read it.
export function searchIndexFile(indexJson, docs) {
  return `{"docs":${JSON.stringify(docs)},"index":${indexJson}}\n`;
}

// search-index.json as a script that sets window.SEARCH_INDEX, for the
// offline tree: a page under file:// can load a script but not fetch a file.
// Written as JSON.parse of a string rather than as an object literal: a
// browser parses JSON text faster than the same data as script, and the
// file is 48 MB. Its JSON is minified, so it goes into the string as it is,
// with `\` and `'` escaped; it holds no line break (JSON.stringify escapes
// one inside a string).
export function offlineSearchIndexJs(fileText) {
  const literal = fileText.trimEnd().replace(/[\\']/g, "\\$&");
  return `window.SEARCH_INDEX = JSON.parse('${literal}');\n`;
}

// Where the two files go: search-index.json in the online tree, and
// search-index.js in the offline one.
export const SEARCH_INDEX_REL = "assets/js/search-index.json";
export const OFFLINE_SEARCH_INDEX_REL = "assets/js/search-index.js";

// The build's searchIndex task (tbdocs.mjs): writes search-index.json under
// `destRoot` and, when `offline`, search-index.js in the offline tree, from
// the index's JSON and the entries it indexes.
export async function writeSearchIndex(destRoot, indexJson, docs, { offline }) {
  const text = searchIndexFile(indexJson, docs);
  await writeFileMkdirp(path.join(destRoot, SEARCH_INDEX_REL), text);
  if (offline) {
    await writeFileMkdirp(path.join(`${destRoot}-offline`, OFFLINE_SEARCH_INDEX_REL), offlineSearchIndexJs(text));
  }
  return { entries: Object.keys(docs).length, bytes: Buffer.byteLength(text) };
}
