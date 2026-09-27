// Ad-hoc diagnostic for Phase 2.A -- not part of the reusable harness.
const fs = require("fs");
const path = require("path");
const REPO = "D:/OCP/wc/twinBASIC-documentation/.claude/worktrees/hopeful-dewdney-03ae03";
const lunrPath = path.join(REPO, "builder/vendor/just-the-docs/assets/js/vendor/lunr.min.js");

function loadLunr() {
  delete require.cache[lunrPath];
  return require(lunrPath);
}

function buildIndex(lunr, docs, sep) {
  lunr.tokenizer.separator = sep || /[\s\-/]+/;
  return lunr(function () {
    this.ref("id");
    this.field("title", { boost: 200 });
    this.field("content", { boost: 2 });
    this.field("relUrl");
    this.metadataWhitelist = ["position"];
    for (const i in docs) this.add({ id: i, title: docs[i].title, content: docs[i].content, relUrl: docs[i].relUrl });
  });
}

function runQuery(lunr, index, input) {
  let results = index.query(function (query) {
    const tokens = lunr.tokenizer(input);
    query.term(tokens, { boost: 10 });
    query.term(tokens, { wildcard: lunr.Query.wildcard.TRAILING });
  });
  if (results.length === 0 && input.length > 2) {
    const tokens = lunr.tokenizer(input).filter((t) => t.str.length < 20);
    if (tokens.length) {
      results = index.query((q) => q.term(tokens, { editDistance: Math.min(2, Math.round(Math.sqrt(input.length / 2 - 1))) }));
    }
  }
  return results;
}

const docsH2 = JSON.parse(fs.readFileSync("data-h2.json", "utf8"));
const docsH3 = JSON.parse(fs.readFileSync("data-h3.json", "utf8"));

function inspect(label, docs, queries) {
  console.log(`\n############ ${label} ############`);
  const lunr = loadLunr();
  const index = buildIndex(lunr, docs);
  for (const q of queries) {
    console.log(`\n--- query: "${q}" ---`);
    const results = runQuery(lunr, index, q);
    results.slice(0, 8).forEach((r, i) => {
      const d = docs[r.ref];
      const mf = Object.keys(r.matchData.metadata || {});
      const fieldsMatched = new Set();
      for (const term of mf) {
        for (const f of Object.keys(r.matchData.metadata[term])) fieldsMatched.add(f);
      }
      console.log(
        `  ${i + 1}. score=${r.score.toFixed(3)} ref=${r.ref} title="${d.title}" contentLen=${d.content.length} relUrl=${d.relUrl} matchedTerms=${mf.join(",")} fields=${[...fieldsMatched].join("/")}`
      );
    });
  }
}

inspect("h3: vbSolid/vbCancel/vbDockLeft", docsH3, ["vbSolid", "vbCancel", "vbDockLeft"]);

// Where do the "winning" entries actually come from? Print the top hits' full title+content(trunc).
function dump(label, docs, refs) {
  console.log(`\n==== ${label} full entries ====`);
  for (const ref of refs) {
    const d = docs[ref];
    console.log(`ref=${ref} title="${d.title}" relUrl=${d.relUrl}`);
    console.log(`  content(${d.content.length} chars): ${d.content.slice(0, 300)}`);
  }
}
