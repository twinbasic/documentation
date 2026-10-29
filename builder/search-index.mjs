// The site search's lunr index, built once by the build rather than in every
// reader's browser on every page. The build writes it as lunr's own JSON
// (lunr.Index#toJSON), to assets/js/search-index.json beside search-data.json;
// the page loads it with lunr.Index.load on the first keystroke. See
// WIP.Search.md, "The pre-built index".
//
// This file is the one definition of the index: its fields and boosts, what
// each field holds (exactName, qualifiedField, indexField, ...), and the
// patches to lunr that change what a word becomes (the tokenizer). The page
// keeps its own copies of what a query needs too -- the tokenizer, exactName,
// indexTermKey -- and test/search.test.mjs checks that they agree with these.
//
// The index is built on several threads. lunr has no way to merge two
// indexes, but most of a build is independent per entry, so:
//
//   1. each worker adds a contiguous run of the entries to a lunr.Builder of
//      its own, and returns its postings, its counts and its field lengths;
//   2. the postings are merged, every term numbered as one build would number
//      it (in order of first appearance, entry by entry), and each term's
//      document count and each field's average length are worked out over all
//      the entries;
//   3. each worker makes its entries' field vectors (lunr's own
//      createFieldVectors) with those totals;
//   4. the JSON is written as lunr's toJSON writes it.
//
// The result is byte for byte what lunr(config) and JSON.stringify make on
// one thread, which test/search-index.test.mjs checks, for any number of
// workers. The token set, a third of a one-thread build, is never made here:
// it is not part of the JSON, and Index.load makes it in the page.

import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";

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

// How many threads the build gives an index of `entries` entries: about half
// the machine, since the build's own lanes are busy writing and checking the
// trees meanwhile; at most eight (on 16 threads, the site's index took 1.9 s
// on four, 1.6 s on six, 1.4 s on eight); and one for every 500 entries, so
// that a small tree (a test fixture) starts no thread at all.
export function defaultIndexWorkers(entries = Infinity) {
  return Math.max(1, Math.min(8, Math.floor(os.availableParallelism() / 2), Math.floor(entries / 500)));
}

// The index of `docs` as lunr's JSON, built on `workers` threads (one: on
// this thread, by lunr itself). Every worker count gives the same bytes.
export async function buildIndexJson(docs, { workers = defaultIndexWorkers(), lunrPath = LUNR_PATH } = {}) {
  const lunr = loadSearchLunr(lunrPath);
  const ids = Object.keys(docs);
  const n = Math.max(1, Math.min(workers, ids.length));
  if (n === 1) return JSON.stringify(buildIndex(lunr, docs));

  const twins = [...stemTwins(lunr, docs)];
  const slices = Array.from({ length: n }, (_, s) =>
    ids.slice(Math.floor((s * ids.length) / n), Math.floor(((s + 1) * ids.length) / n)),
  );
  const pool = slices.map(() => new IndexWorker());
  try {
    // 1. Each worker adds its entries.
    const added = await Promise.all(
      pool.map((worker, s) => {
        const slice = {};
        for (const id of slices[s]) slice[id] = docs[id];
        return worker.request({ step: "add", lunrPath, docs: JSON.stringify(slice), twins });
      }),
    );

    // 2. The postings merged, each term numbered as one build numbers it:
    //    a worker's terms come in the order it met them, and the slices in
    //    the order of their entries.
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

    // 3. Each worker makes its entries' field vectors.
    const vectors = await Promise.all(
      pool.map((worker, s) =>
        worker.request({ step: "vectors", numbers: numbers[s], idf, documentCount, averageFieldLength }),
      ),
    );

    // 4. lunr's toJSON: the terms sorted, the postings as JSON.stringify
    //    writes them (`_index`, then each field, its refs in numeric order).
    const invertedIndex = [...merged.keys()].sort().map((term) => {
      const m = merged.get(term);
      let s = `[${JSON.stringify(term)},{"_index":${m.number}`;
      for (let f = 0; f < fields.length; f++) s += `,${JSON.stringify(fields[f])}:{${m.parts[f].join(",")}}`;
      return `${s}}]`;
    });
    const pipeline = newBuilder(lunr).searchPipeline.toJSON();
    return (
      `{"version":${JSON.stringify(lunr.version)},"fields":${JSON.stringify(fields)},` +
      `"fieldVectors":[${vectors.filter(Boolean).join(",")}],` +
      `"invertedIndex":[${invertedIndex.join(",")}],"pipeline":${JSON.stringify(pipeline)}}`
    );
  } finally {
    await Promise.all(pool.map((worker) => worker.close()));
  }
}

// Separates a term's per-field postings in what a worker returns. JSON text
// never holds a raw control character: JSON.stringify escapes them.
export const FIELD_SEPARATOR = "\u0001";

// One worker thread (search-index-worker.mjs), which keeps its builder between
// the two steps. A request's answer, or the worker's failure, settles it.
class IndexWorker {
  constructor() {
    this.worker = new Worker(new URL("./search-index-worker.mjs", import.meta.url));
    this.pending = null;
    const fail = (err) => {
      this.failure = err;
      this.pending?.reject(err);
      this.pending = null;
    };
    this.worker.on("message", (msg) => {
      const pending = this.pending;
      this.pending = null;
      if (!pending) return;
      if (msg.error) pending.reject(new Error(`search index worker: ${msg.error}`));
      else pending.resolve(msg.result);
    });
    this.worker.on("error", fail);
    this.worker.on("exit", (code) => fail(new Error(`search index worker exited with code ${code}`)));
  }

  request(msg) {
    if (this.failure) return Promise.reject(this.failure);
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject };
      this.worker.postMessage(msg);
    });
  }

  async close() {
    this.worker.removeAllListeners("exit");
    await this.worker.terminate();
  }
}

// ── The file the page loads ────────────────────────────────────────────────

// A check that search-index.json and search-data.json are of the same build:
// a reader's browser may hold one of them in its cache from before a deploy
// and fetch the other after it, and an index's entries are numbers into the
// data. The digest is FNV-1a over each entry's number, title, URL and the
// length of its content; the page computes it the same way (docsDigest() in
// just-the-docs.js), which test/search.test.mjs checks.
export function docsDigest(docs) {
  let h = 0x811c9dc5;
  const mix = (s) => {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
  };
  for (const id in docs) {
    const doc = docs[id];
    mix(`${id}\n${doc.title}\n${doc.relUrl}\n${String(doc.content).length}\n`);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

// search-index.json: lunr's JSON with the check above as one more key, which
// lunr.Index.load ignores.
export function searchIndexFile(indexJson, docs) {
  const tbdocs = { entries: Object.keys(docs).length, digest: docsDigest(docs) };
  return `${indexJson.slice(0, -1)},"tbdocs":${JSON.stringify(tbdocs)}}\n`;
}

// search-index.json as a script that sets window.SEARCH_INDEX, for the
// offline tree: a page under file:// can load a script but not fetch a file.
// Written as JSON.parse of a string rather than as an object literal: a
// browser parses JSON text faster than the same data as script, and the
// index is 38 MB. lunr's JSON is minified, so it goes into the string as it
// is, with `\` and `'` escaped; it holds no line break (JSON.stringify
// escapes one inside a string).
export function offlineSearchIndexJs(fileText) {
  const literal = fileText.trimEnd().replace(/[\\']/g, "\\$&");
  return `window.SEARCH_INDEX = JSON.parse('${literal}');\n`;
}

// The build's searchIndex task (cpu-worker.mjs): reads the search-data.json
// the build wrote under `destRoot`, and writes search-index.json beside it
// and, when `offline`, search-index.js in the offline tree.
export async function writeSearchIndex(destRoot, { offline }) {
  const docs = JSON.parse(await fs.readFile(path.join(destRoot, "assets/js/search-data.json"), "utf8"));
  const entries = Object.keys(docs).length;
  const workers = defaultIndexWorkers(entries);
  const text = searchIndexFile(await buildIndexJson(docs, { workers }), docs);
  await writeFileMkdirp(path.join(destRoot, "assets/js/search-index.json"), text);
  if (offline) {
    await writeFileMkdirp(path.join(`${destRoot}-offline`, "assets/js/search-index.js"), offlineSearchIndexJs(text));
  }
  return { entries, workers, bytes: Buffer.byteLength(text) };
}
