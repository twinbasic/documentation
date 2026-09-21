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

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

function load(site) {
  const dataPath = path.join(site, "assets/js/search-data.json");
  const lunrPath = path.join(site, "assets/js/vendor/lunr.min.js");
  for (const p of [dataPath, lunrPath]) {
    if (!fs.existsSync(p)) {
      console.error(
        `missing ${path.relative(REPO_ROOT, p)}\n` +
        "Run build.bat (or `node builder/tbdocs.mjs --src docs`) first."
      );
      process.exit(1);
    }
  }
  const lunr = require(lunrPath);
  const docs = JSON.parse(fs.readFileSync(dataPath, "utf8"));

  // Mirrors just-the-docs.js exactly. Do not "improve" these weights: the
  // point is to measure what a reader's search actually returns, not what a
  // better-tuned index would.
  const index = lunr(function () {
    this.ref("id");
    this.field("title", { boost: 200 });
    this.field("content", { boost: 2 });
    this.field("relUrl");
    this.metadataWhitelist = ["position"];
    for (const id in docs) {
      this.add({ id, title: docs[id].title, content: docs[id].content, relUrl: docs[id].relUrl });
    }
  });
  return { lunr, docs, index };
}

function search({ lunr, index }, input) {
  let results = index.query((q) => {
    const tokens = lunr.tokenizer(input);
    q.term(tokens, { boost: 10 });
    q.term(tokens, { wildcard: lunr.Query.wildcard.TRAILING });
  });
  if (results.length === 0 && input.length > 2) {
    const tokens = lunr.tokenizer(input).filter((t) => t.str.length < 20);
    if (tokens.length) {
      results = index.query((q) =>
        q.term(tokens, { editDistance: Math.round(Math.sqrt(input.length / 2 - 1)) })
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
