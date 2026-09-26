// Phase 2.B -- post-process data-h3.json into design-variant search-data
// files. Pure post-processing of the already-built h3 index; never touches
// the repo or rebuilds the site.
//
//   V1 = data-h3.json unchanged (alias, for convenience in eval.cjs runs).
//   V2 = generic subsection entries (See Also, Example, Examples, Remarks,
//        Parameters, Return value, Syntax, Notes) folded into the
//        preceding entry of the same page (content appended, entry dropped).
//   V3 = like V2, but the generic entry is kept as its own entry, retitled
//        "<preceding title> - <generic title>", instead of folded away.
//   V4 = V2's data (folding), for use with an extended client tokenizer
//        separator (handled at query time in run-variants.cjs, not here --
//        the data file is identical to V2's).
//
// Usage: node make-variants.cjs
"use strict";
const fs = require("fs");
const path = require("path");

const SCRIPT_DIR = __dirname;
const GENERIC_TITLES = new Set([
  "see also", "example", "examples", "remarks", "parameters", "return value", "syntax", "notes",
]);

function loadDocs(name) {
  return JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, name), "utf8"));
}
function pagePath(relUrl) {
  const h = relUrl.indexOf("#");
  return h === -1 ? relUrl : relUrl.slice(0, h);
}

function buildFolded(docs) {
  // Entries preserve original relative order (object insertion order follows
  // numeric key order in JS, which matches the original "i" sequence).
  const ids = Object.keys(docs).sort((a, b) => Number(a) - Number(b));
  const out = {};
  let lastIdOnPage = new Map(); // pagePath -> last surviving entry id on that page
  let foldedCount = 0;
  for (const id of ids) {
    const e = docs[id];
    const page = pagePath(e.relUrl);
    const isGeneric = GENERIC_TITLES.has(e.title.trim().toLowerCase());
    if (isGeneric && lastIdOnPage.has(page)) {
      const targetId = lastIdOnPage.get(page);
      out[targetId].content = (out[targetId].content + " " + e.content).replace(/\s+/g, " ");
      foldedCount++;
      continue; // dropped; does not become the new "last" entry
    }
    out[id] = { ...e };
    lastIdOnPage.set(page, id);
  }
  return { docs: out, foldedCount };
}

function buildRetitled(docs) {
  const ids = Object.keys(docs).sort((a, b) => Number(a) - Number(b));
  const out = {};
  let lastTitleOnPage = new Map(); // pagePath -> preceding entry's original title
  let retitledCount = 0;
  for (const id of ids) {
    const e = docs[id];
    const page = pagePath(e.relUrl);
    const isGeneric = GENERIC_TITLES.has(e.title.trim().toLowerCase());
    if (isGeneric && lastTitleOnPage.has(page)) {
      out[id] = { ...e, title: `${lastTitleOnPage.get(page)} - ${e.title}` };
      retitledCount++;
    } else {
      out[id] = { ...e };
    }
    if (!isGeneric) lastTitleOnPage.set(page, e.title);
  }
  return { docs: out, retitledCount };
}

const h3 = loadDocs("data-h3.json");
console.log(`h3 baseline: ${Object.keys(h3).length} entries`);

const v2 = buildFolded(h3);
console.log(`V2 (folded): ${Object.keys(v2.docs).length} entries, ${v2.foldedCount} generic entries folded away`);
fs.writeFileSync(path.join(SCRIPT_DIR, "data-v2.json"), JSON.stringify(v2.docs));
// V4 uses the same data as V2; the tokenizer change is applied at query
// time by run-variants.cjs. Keep a named copy for clarity in file listings.
fs.writeFileSync(path.join(SCRIPT_DIR, "data-v4.json"), JSON.stringify(v2.docs));

const v3 = buildRetitled(h3);
console.log(`V3 (retitled): ${Object.keys(v3.docs).length} entries, ${v3.retitledCount} generic entries retitled`);
fs.writeFileSync(path.join(SCRIPT_DIR, "data-v3.json"), JSON.stringify(v3.docs));

console.log("\nSample folded entries (V2), showing what got merged into what:");
{
  const ids = Object.keys(h3).sort((a, b) => Number(a) - Number(b));
  let shown = 0;
  let lastId = new Map();
  for (const id of ids) {
    const e = h3[id];
    const page = pagePath(e.relUrl);
    const isGeneric = GENERIC_TITLES.has(e.title.trim().toLowerCase());
    if (isGeneric && lastId.has(page) && shown < 5) {
      console.log(`  [${h3[lastId.get(page)].title}] <- folded [${e.title}] (${page})`);
      shown++;
    }
    if (!isGeneric) lastId.set(page, id);
  }
}
