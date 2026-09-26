#!/usr/bin/env node
// Query the site's own search box from the command line.
//
// This is a faithful replica, not an approximation: it loads the real
// search-data.json the build emitted and the real vendored lunr, and it
// reproduces just-the-docs.js's index configuration and query construction
// exactly (field boosts, trailing wildcard, the edit-distance fallback).
//
// It exists because navigation and search fail on DIFFERENT pages, so judging
// discoverability by either one alone is misleading. Round 1 measured a page
// that is search rank #1 and six navigation hops away, and another that is two
// navigation hops away and missed by four of four searches.
//
//     node eval/site_search.mjs "how do I add a build task"
//     node eval/site_search.mjs --composition
//
// Requires build.bat (or `node builder/tbdocs.mjs --src docs`) to have run.
//
// `resolvePaths`, `loadLunr`, `buildIndex`, `load` and `search` are exported
// so eval/search_quality.mjs can measure ranking quality against this exact
// index setup and query logic, instead of forking its own copy that could
// drift from what the CLI below actually runs.

import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../lib/repo-paths.mjs";

const require = createRequire(import.meta.url);

function parseArgs(argv) {
  const o = { site: path.join(REPO_ROOT, "docs/_site"), n: 8, terms: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--site") o.site = path.resolve(argv[++i]);
    else if (argv[i] === "--n") o.n = Number(argv[++i]);
    else if (argv[i] === "--composition") o.composition = true;
    else if (argv[i] === "--help" || argv[i] === "-h") o.help = true;
    else o.terms.push(argv[i]);
  }
  return o;
}

export function resolvePaths(site) {
  return {
    dataPath: path.join(site, "assets/js/search-data.json"),
    lunrPath: path.join(site, "assets/js/vendor/lunr.min.js"),
  };
}

// Mirrors just-the-docs.js exactly. Do not "improve" this weight: the point
// is to measure what a reader's search actually returns, not what a
// better-tuned index would.
//
// The client's initSearch() (just-the-docs.js, and offline.mjs's copy of it)
// sets the tokenizer separator to /[\s\-\/]+/, so `/` splits tokens too.
// Without this, lunr's default /[\s\-]+/ tokenises differently from the real
// site and this replica cannot reproduce what it claims to.
//
// Mirrors the dot-run-split patch too (WIP.Search.md rollout step 5B, "Design"
// section): titles like "Do...Loop" and "For Each...Next" tokenise as one
// opaque token ("do...loop") because lunr's tokenizer tests one character at
// a time against `separator`, so a `\.{2,}` alternative in that regex can't
// work. Wrapping lunr.tokenizer instead: a run of 2+ dots in a string input
// becomes the same number of spaces (keeping character positions valid),
// then the original tokenizer runs as usual. The wrapper carries `separator`
// itself, since the original tokenizer reads `lunr.tokenizer.separator` at
// call time, which after this reassignment resolves to the wrapper's own
// property. test/search.test.mjs's drift guard checks this installs in all
// three copies (this file, just-the-docs.js, offline.mjs).
export function loadLunr(lunrPath) {
  const lunr = require(lunrPath);
  const originalTokenizer = lunr.tokenizer;
  const dotRunSplitTokenizer = function (input) {
    if (typeof input === "string") {
      input = input.replace(/\.{2,}/g, (m) => new Array(m.length + 1).join(" "));
    }
    return originalTokenizer(input);
  };
  dotRunSplitTokenizer.dotRunSplit = true;
  dotRunSplitTokenizer.separator = /[\s\-\/]+/;
  lunr.tokenizer = dotRunSplitTokenizer;
  return lunr;
}

// The two symbol-index fields (see builder/search.mjs's
// joinSymbolsToEntries and WIP.Search.md's "Design" §2), at the same
// boosts as both patched copies of just-the-docs.js
// (builder/vendor/just-the-docs/assets/js/just-the-docs.js and
// builder/offline.mjs's JTD_INITSEARCH_FN_REPLACEMENT). test/search.test.mjs
// checks all three field lists agree.
export function buildIndex(lunr, docs) {
  return lunr(function () {
    this.ref("id");
    this.field("title", { boost: 200 });
    this.field("content", { boost: 2 });
    this.field("names", { boost: 100 });
    this.field("qualified", { boost: 50 });
    this.field("relUrl");
    this.metadataWhitelist = ["position"];
    // Mirrors the stop-word patch (step 5A, "Design" section): lunr's index
    // pipeline runs lunr.stopWordFilter by default, but the search pipeline
    // never did, so English stop words -- many of them twinBASIC keywords
    // (Do, For, If, Is, On, With, Each...) -- were dropped from the index
    // while a query still carried them and could never match.
    this.pipeline.remove(lunr.stopWordFilter);
    for (const id in docs) {
      this.add({
        id,
        title: docs[id].title,
        content: docs[id].content,
        names: docs[id].names || "",
        qualified: docs[id].qualified || "",
        relUrl: docs[id].relUrl,
      });
    }
  });
}

export function load(site) {
  const { dataPath, lunrPath } = resolvePaths(site);
  for (const p of [dataPath, lunrPath]) {
    if (!fs.existsSync(p)) {
      console.error(
        `missing ${path.relative(REPO_ROOT, p)}\n` +
        "Run build.bat (or `node builder/tbdocs.mjs --src docs`) first."
      );
      process.exit(1);
    }
  }
  const lunr = loadLunr(lunrPath);
  const docs = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const index = buildIndex(lunr, docs);
  return { lunr, docs, index };
}

// Matches just-the-docs.js's smart dot split exactly (see that file and
// WIP.Search.md's "Design" §3): a token is kept whole, and where a `.`
// sits between identifier characters on both sides it is also split into
// parts, dropping parts of one character, so `Debug.Print` still matches
// its own entry first while `1.0`, `e.g.` and `i.e.` add nothing. Marked
// with a NUL and split there, not found with a lookbehind, exactly as the
// client does it (the client must run on Safari before 16.4).
const DOT_SPLIT = /([A-Za-z_]\w*)\.(?=[A-Za-z_])/g;

export function search({ lunr, index }, input) {
  // Patched, matching just-the-docs.js: drop tokens made only of asterisks.
  // Unfiltered, a bare `*` or `**` reaches lunr.Query.wildcard.TRAILING and
  // throws inside lunr's query engine instead of matching nothing.
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
  let results = queryTokens.length
    ? index.query((q) => {
        q.term(queryTokens, { boost: 10 });
        q.term(queryTokens, { wildcard: lunr.Query.wildcard.TRAILING });
      })
    : [];
  if (results.length === 0 && input.length > 2 && queryTokens.length) {
    const tokens = queryTokens.filter((t) => t.str.length < 20);
    if (tokens.length) {
      // Capped at 2, as the patched just-the-docs.js is. Uncapped, a query of
      // three unindexed API names ran this replica out of memory.
      results = index.query((q) =>
        q.term(tokens, { editDistance: Math.min(2, Math.round(Math.sqrt(input.length / 2 - 1))) })
      );
    }
  }
  return results;
}

// The composition report is why round 1's worst discoverability scores were
// structural rather than per-page: the developer documentation competes for its
// own search against the language reference, which shares its entire
// vocabulary -- font, add, download, colour, build and image are all twinBASIC
// API names.
function composition(docs) {
  const slice = (u) =>
    u.startsWith("/Documentation") ? "Documentation (developer docs)"
    : u.startsWith("/tB") ? "twinBASIC reference"
    : u.startsWith("/Features") ? "Features"
    : u.startsWith("/Tutorials") ? "Tutorials"
    : "other";
  const counts = new Map();
  const ids = Object.keys(docs);
  for (const id of ids) {
    const k = slice(String(docs[id].relUrl ?? ""));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  console.log(`search index: ${ids.length} entries\n`);
  for (const [k, n] of [...counts].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${((100 * n) / ids.length).toFixed(1).padStart(5)}%  ${k}`);
  }
  console.log(
    "\nOnly published pages are indexed. builder/*.md, perf/*.md, test/README.md" +
    "\nand the repository-root notes are unreachable by site search entirely."
  );
}

// Only run the CLI when this file is executed directly -- eval/search_quality.mjs
// imports load()/buildIndex()/search() from here and must not trigger it.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || (!opts.composition && !opts.terms.length)) {
    console.log(
      'Usage: node eval/site_search.mjs "<query>" [--n <count>] [--site <path>]\n' +
      "       node eval/site_search.mjs --composition\n\n" +
      "Queries the built site's real lunr index with the real query logic.\n" +
      "See eval/README.md."
    );
    process.exit(opts.help ? 0 : 1);
  }

  const ctx = load(opts.site);
  if (opts.composition) {
    composition(ctx.docs);
  } else {
    const input = opts.terms.join(" ");
    const hits = search(ctx, input);
    console.log(`query: ${JSON.stringify(input)} -- ${hits.length} result(s), showing ${Math.min(opts.n, hits.length)}\n`);
    hits.slice(0, opts.n).forEach((h, i) => {
      const d = ctx.docs[h.ref];
      const snippet = String(d.content ?? "").replace(/\s+/g, " ").slice(0, 130);
      console.log(`${String(i + 1).padStart(2)}. ${d.title}`);
      console.log(`    ${d.relUrl}`);
      if (snippet) console.log(`    ${snippet}...`);
      console.log();
    });
  }
}
