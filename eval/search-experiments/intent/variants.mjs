// X1/X2/X3 variant index-build and query-construction, layered on top of
// the shipped configuration (names/qualified fields, stopwords kept in the
// index, smart dot-split query, asterisk guard) copied from eval/site_search.mjs.
//
// X1: exact-name field. Derived from `names` at index time: every
//     space-separated name, lowercased, with marker suffix '_' (verified
//     safe against lunr's trimmer/stemmer -- see intent_gt.mjs's header and
//     the mechanism check in the report). Query side adds, for every
//     original whitespace token, a term `token.toLowerCase()+'_'` on
//     ['exact'] only, no wildcard, boost B.
// X2: page-title field `page` = the entry's `doc` (page title), boost P.
// X3: AND-first: for 2+ whitespace tokens, first run with every token
//     REQUIRED (matched either by its wildcard clause or the boosted exact
//     clause); if that returns nothing, fall back to the normal query.

import { resolvePaths, loadLunr } from "./site_search.mjs";
import fs from "node:fs";

export { resolvePaths, loadLunr };

export function loadDocs(site) {
  const { dataPath } = resolvePaths(site);
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

const DOT_SPLIT = /([A-Za-z_]\w*)\.(?=[A-Za-z_])/g;

// opts: { x1: B|0, x2: P|0, x3: bool, x1t: {b1,b2,b3}|null }
// x1t requires docs entries to already carry exact1/exact2/exact3 strings
// (see eval_variants.mjs's buildTieredExactFields) -- this file has no
// symbol-kind data of its own.
export function buildIndex(lunr, docs, opts = {}) {
  const { x1 = 0, x2 = 0, x1t = null } = opts;
  return lunr(function () {
    this.ref("id");
    this.field("title", { boost: 200 });
    this.field("content", { boost: 2 });
    this.field("names", { boost: 100 });
    this.field("qualified", { boost: 50 });
    if (x1) this.field("exact");
    if (x1t) { this.field("exact1"); this.field("exact2"); this.field("exact3"); }
    if (x2) this.field("page");
    this.field("relUrl");
    this.metadataWhitelist = ["position"];
    this.pipeline.remove(lunr.stopWordFilter);
    for (const id in docs) {
      const d = docs[id];
      const doc = {
        id,
        title: d.title,
        content: d.content,
        names: d.names || "",
        qualified: d.qualified || "",
        relUrl: d.relUrl,
      };
      if (x1) {
        const names = (d.names || "").split(/\s+/).filter(Boolean);
        doc.exact = names.map((n) => n.toLowerCase() + "_").join(" ");
      }
      if (x1t) {
        doc.exact1 = d.exact1 || "";
        doc.exact2 = d.exact2 || "";
        doc.exact3 = d.exact3 || "";
      }
      if (x2) doc.page = d.doc || "";
      this.add(doc);
    }
  });
}

function smartTokens(lunr, input) {
  const baseTokens = lunr.tokenizer(input).filter((t) => !/^\*+$/.test(t.str));
  const queryTokens = [];
  for (const token of baseTokens) {
    queryTokens.push(token);
    const marked = token.str.replace(DOT_SPLIT, "$1\u0000");
    if (marked !== token.str) {
      for (const part of marked.split("\u0000")) {
        if (part.length > 1) queryTokens.push(token.clone(() => part));
      }
    }
  }
  return queryTokens;
}

// opts: { x1: B, x2: P, x3: bool }
export function search({ lunr, index }, input, opts = {}) {
  const { x1 = 0, x3 = false, x1t = null } = opts;
  const queryTokens = smartTokens(lunr, input);
  const wsTokens = input.split(/\s+/).filter(Boolean);

  function buildOptional(q) {
    q.term(queryTokens, { boost: 10 });
    q.term(queryTokens, { wildcard: lunr.Query.wildcard.TRAILING });
    if (x1) {
      for (const t of wsTokens) {
        q.term([t.toLowerCase() + "_"], { fields: ["exact"], boost: x1 });
      }
    }
    if (x1t) {
      for (const t of wsTokens) {
        const marker = t.toLowerCase() + "_";
        if (x1t.b1) q.term([marker], { fields: ["exact1"], boost: x1t.b1 });
        if (x1t.b2) q.term([marker], { fields: ["exact2"], boost: x1t.b2 });
        if (x1t.b3) q.term([marker], { fields: ["exact3"], boost: x1t.b3 });
      }
    }
  }

  let results = [];
  if (queryTokens.length) {
    if (x3 && wsTokens.length >= 2) {
      // AND-first: every whitespace token required, satisfied by its
      // wildcard clause (dot-split parts stay optional); boosted exact
      // clause also stays optional.
      results = index.query((q) => {
        buildOptional(q);
        for (const t of wsTokens) {
          q.term([t], { wildcard: lunr.Query.wildcard.TRAILING, presence: lunr.Query.presence.REQUIRED });
        }
      });
      if (results.length === 0) {
        results = index.query((q) => buildOptional(q));
      }
    } else {
      results = index.query((q) => buildOptional(q));
    }
  }

  if (results.length === 0 && input.length > 2 && queryTokens.length) {
    const tokens = queryTokens.filter((t) => t.str.length < 20);
    if (tokens.length) {
      results = index.query((q) =>
        q.term(tokens, { editDistance: Math.min(2, Math.round(Math.sqrt(input.length / 2 - 1))) })
      );
    }
  }
  return results;
}
