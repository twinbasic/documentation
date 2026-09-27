// One-off check: does eval.cjs's replica return the same ranked ref order as
// the repo's own eval/site_search.mjs, for a handful of queries, against the
// current docs/_site build? Not part of the reusable harness; run manually.
const path = require("path");
const { execFileSync } = require("child_process");

const REPO = "D:/OCP/wc/twinBASIC-documentation/.claude/worktrees/hopeful-dewdney-03ae03";
const fs = require("fs");
const lunrPath = path.join(REPO, "builder/vendor/just-the-docs/assets/js/vendor/lunr.min.js");
const dataPath = path.join(REPO, "docs/_site/assets/js/search-data.json");

delete require.cache[lunrPath];
const lunr = require(lunrPath);
const docs = JSON.parse(fs.readFileSync(dataPath, "utf8"));

lunr.tokenizer.separator = /[\s\-/]+/;
const index = lunr(function () {
  this.ref("id");
  this.field("title", { boost: 200 });
  this.field("content", { boost: 2 });
  this.field("relUrl");
  this.metadataWhitelist = ["position"];
  for (const i in docs) this.add({ id: i, title: docs[i].title, content: docs[i].content, relUrl: docs[i].relUrl });
});

function runQuery(input) {
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

for (const q of ["PaintPicture", "Line", "Add"]) {
  const mine = runQuery(q).slice(0, 5).map((r) => r.ref);
  const out = execFileSync("node", [path.join(REPO, "eval/site_search.mjs"), q, "--n", "5"], { encoding: "utf8" });
  const theirsUrls = [...out.matchAll(/^\s{4}(\/\S*)$/gm)].map((m) => m[1]);
  const mineUrls = mine.map((ref) => docs[ref].relUrl);
  console.log(`query=${q}`);
  console.log("  mine:  ", mineUrls);
  console.log("  theirs:", theirsUrls);
  console.log("  match:", JSON.stringify(mineUrls) === JSON.stringify(theirsUrls));
}
