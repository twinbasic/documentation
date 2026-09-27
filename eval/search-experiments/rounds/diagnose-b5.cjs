// Phase 3.5 -- confirm the "*" query crash under the REAL client separator
// (lunr.tokenizer.separator = /[\s\-/]+/), and find the minimal crashing
// input set. Also documents a gap in eval/site_search.mjs (read-only check;
// that file is not modified): it never sets lunr.tokenizer.separator, so it
// silently falls back to lunr's OWN default (/[\s\-]+/, no '/'), which does
// NOT reproduce the client's actual index/tokenization and does NOT crash on
// "*" -- the real client (which does set the separator) would.
"use strict";
const fs = require("fs");
const path = require("path");
const { H, NORMALSEP } = require("./config-b.cjs");

const SCRIPT_DIR = __dirname;
const docs = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, "data-h2.json"), "utf8"));

function buildWithSeparator(sep) {
  // NOTE: does not call H.buildIndex, which hardcodes the client separator
  // internally -- built manually so this script can vary it freely.
  const lunr = H.loadLunr(H.defaultLunrPath());
  lunr.tokenizer.separator = sep;
  const index = lunr(function () {
    this.ref("id");
    this.field("title", { boost: 200 });
    this.field("content", { boost: 2 });
    this.field("relUrl");
    this.metadataWhitelist = ["position"];
    for (const i in docs) this.add({ id: i, title: docs[i].title, content: docs[i].content, relUrl: docs[i].relUrl });
  });
  return { lunr, index };
}

function tryQuery(lunr, index, input) {
  try {
    const results = index.query((q) => {
      const tokens = lunr.tokenizer(input);
      q.term(tokens, { boost: 10 });
      q.term(tokens, { wildcard: lunr.Query.wildcard.TRAILING });
    });
    return { ok: true, n: results.length };
  } catch (err) {
    return { ok: false, err: err.message };
  }
}

console.log("=== eval/site_search.mjs's ACTUAL separator (its default, /[\\s\\-]+/ -- it never overrides lunr's own default) ===");
{
  const { lunr, index } = buildWithSeparator(/[\s-]+/);
  console.log("  lunr.tokenizer.separator (default):", lunr.tokenizer.separator);
}

console.log("\n=== real client separator (/[\\s\\-/]+/, from just-the-docs.js) -- what eval/site_search.mjs SHOULD be using but isn't ===");
const candidates = ["*", "**", "a*", "^", "~", ":", "+", "-", "a~", "a:", "a+", "*a", "a*b", "~1", "AND", "field:foo", "\\", "?", "/", "//"];
{
  const { lunr, index } = buildWithSeparator(NORMALSEP);
  const crashing = [];
  const ok = [];
  for (const q of candidates) {
    const r = tryQuery(lunr, index, q);
    if (r.ok) ok.push(`${JSON.stringify(q)} (${r.n} results)`);
    else crashing.push(JSON.stringify(q));
  }
  console.log("  CRASHING:", crashing.join(", ") || "(none)");
  console.log("  ok:", ok.join(", "));
}

// Minimal isolation: which of the two query.term() clauses actually causes
// it -- the plain boost term, or the wildcard-TRAILING term?
console.log("\n=== isolating which clause crashes, for \"*\" ===");
{
  const { lunr, index } = buildWithSeparator(NORMALSEP);
  const tokens = lunr.tokenizer("*");
  try { index.query((q) => q.term(tokens, { boost: 10 })); console.log("  boost-only: OK"); }
  catch (e) { console.log("  boost-only: CRASH -", e.message); }
}
{
  const { lunr, index } = buildWithSeparator(NORMALSEP);
  const tokens = lunr.tokenizer("*");
  try { index.query((q) => q.term(tokens, { wildcard: lunr.Query.wildcard.TRAILING })); console.log("  wildcard-only: OK"); }
  catch (e) { console.log("  wildcard-only: CRASH -", e.message); }
}
