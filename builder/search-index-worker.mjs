// A worker thread of the search index's split build (search-index.mjs, which
// describes the steps). It keeps its builder between the two requests.

import { parentPort } from "node:worker_threads";
import { entryFor, FIELD_SEPARATOR, loadSearchLunr, newBuilder } from "./search-index.mjs";

let lunr = null;
let builder = null;
let terms = null;

const steps = {
  // Adds the entries, and returns each term (in the order this builder met
  // it) with its document count, its postings field by field, and each
  // field's total length.
  add({ lunrPath, docs, twins }) {
    lunr = loadSearchLunr(lunrPath);
    builder = newBuilder(lunr);
    const entries = JSON.parse(docs);
    const twinSet = new Set(twins);
    for (const id in entries) builder.add(entryFor(lunr, entries, id, twinSet));

    const fields = Object.keys(builder._fields);
    // In the order the builder met them (each posting's _index), not in key
    // order, which puts terms that look like numbers ("1", "2025") first.
    terms = new Array(builder.termIndex);
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
    return { terms, df, postings, lengths, documentCount: builder.documentCount };
  },

  // lunr's createFieldVectors, with every term numbered as the whole index
  // numbers it, and the counts and averages of every entry; returns the
  // vectors as toJSON writes them, in the order of this worker's entries.
  vectors({ numbers, idf, documentCount, averageFieldLength }) {
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
  },
};

parentPort.on("message", (msg) => {
  try {
    parentPort.postMessage({ result: steps[msg.step](msg) });
  } catch (err) {
    parentPort.postMessage({ error: err?.stack ?? String(err) });
  }
});
