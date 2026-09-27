// Shared helper: build the "B" configuration (V2 folded data + V4b query-
// time '.'-splitting tokenizer, index built with the client's normal
// separator). Reused by phase-3 diagnostic scripts.
"use strict";
const fs = require("fs");
const path = require("path");
const H = require("./eval.cjs");

const SCRIPT_DIR = __dirname;
const DOTSEP = /[\s\-/.]+/;
const NORMALSEP = /[\s\-/]+/;

function buildB(docsFileName = "data-v2.json") {
  const rawText = fs.readFileSync(path.join(SCRIPT_DIR, docsFileName), "utf8");
  const docs = JSON.parse(rawText);
  const lunr = H.loadLunr(H.defaultLunrPath());
  lunr.tokenizer.separator = NORMALSEP; // index built with the real client separator
  const index = H.buildIndex(lunr, docs);

  function runQueryB(input) {
    const saved = lunr.tokenizer.separator;
    lunr.tokenizer.separator = DOTSEP; // query-time only: V4b
    const tokens = lunr.tokenizer(input);
    lunr.tokenizer.separator = saved;
    let results;
    try {
      results = index.query(function (query) {
        query.term(tokens, { boost: 10 });
        query.term(tokens, { wildcard: lunr.Query.wildcard.TRAILING });
      });
    } catch (err) {
      // Known pre-existing lunr crash for certain literal query-syntax
      // characters (see Phase 3.5) -- treat as zero results rather than
      // aborting a whole diagnostic run.
      results = [];
    }
    if (results.length === 0 && input.length > 2) {
      const filtered = tokens.filter((t) => t.str.length < 20);
      if (filtered.length) {
        try {
          results = index.query((q) => q.term(filtered, { editDistance: Math.min(2, Math.round(Math.sqrt(input.length / 2 - 1))) }));
        } catch (err) {
          results = [];
        }
      }
    }
    return results;
  }

  return { lunr, docs, index, runQueryB, rawText };
}

module.exports = { buildB, DOTSEP, NORMALSEP, H };
