// Phase 3.4 -- literal-'.' queries: B (V2+V4b dot-splitting) vs V2 (no dot
// splitting) top-3, to sanity-check the V4b periods caveat.
"use strict";
const fs = require("fs");
const path = require("path");
const { buildB, H, NORMALSEP } = require("./config-b.cjs");

const SCRIPT_DIR = __dirname;
const v2docs = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, "data-v2.json"), "utf8"));

const b = buildB("data-v2.json"); // B: dot-splitting at query time
const lunrV2 = H.loadLunr(H.defaultLunrPath());
lunrV2.tokenizer.separator = NORMALSEP;
const idxV2 = H.buildIndex(lunrV2, v2docs);
function runV2(input) { return H.runQuery(lunrV2, idxV2, input); }

const QUERIES = [
  "e.g. array", "VB.Form", "BETA 403", "1.0", "App.Path", "Me.Hide",
  "Debug.Print", "Err.Raise", "String.Format", "3.9", "i.e. pointer",
  "Form.Left", "Collection.Add", "v2.0 release", "Assert.Exact.AreEqual",
];

function top3(results, docs) {
  return results.slice(0, 3).map((r) => `${docs[r.ref].title} (${docs[r.ref].relUrl})`);
}

for (const q of QUERIES) {
  console.log(`\n=== "${q}" ===`);
  const rV2 = runV2(q);
  const rB = b.runQueryB(q);
  console.log(`  V2 (${rV2.length} results): ${JSON.stringify(top3(rV2, v2docs))}`);
  console.log(`  B  (${rB.length} results): ${JSON.stringify(top3(rB, b.docs))}`);
}
