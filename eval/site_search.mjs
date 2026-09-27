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
    return originalTokenizer(input).map(decodeTokenEntities);
  };
  dotRunSplitTokenizer.dotRunSplit = true;
  dotRunSplitTokenizer.separator = /[\s\-\/]+/;
  lunr.tokenizer = dotRunSplitTokenizer;
  separateTokenSetKeys(lunr);
  accumulateSetUnions(lunr);
  return lunr;
}

// Matches just-the-docs.js's decodeTokenEntities(): the search data keeps
// the page's HTML entities, which the client needs for display, so each
// token's are decoded after the split, keeping its position in the escaped
// text: `&amp;H80004005` indexes as `h80004005`, not `amp;h80004005`.
const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeTokenEntities(token) {
  if (token.str.indexOf("&") === -1) return token;
  return token.update((str) =>
    str.replace(/&(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-f]+);/g, (m, name) => {
      if (name.charAt(0) !== "#") return NAMED_ENTITIES[name];
      const code = name.charAt(1) === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      // Lowercased, as lunr's tokenizer lowercases everything else.
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code).toLowerCase() : m;
    })
  );
}

// Matches just-the-docs.js's separateTokenSetKeys(): lunr 2.3.9 keys a token
// set's nodes for minimisation by TokenSet#toString(), which writes each
// edge's label and its child's id with nothing between them. `{1 -> 656}`
// and `{1 -> 6, 5 -> 6}` both key as `01656`, minimisation merges the two
// nodes, and the index's token set then holds words no entry has and loses
// real ones (`amp;h80004001`). A trailing-wildcard query that reaches an
// invented word throws inside lunr: any query with the word `a` did. A `,`
// after each id keeps the keys apart. Installed once.
function separateTokenSetKeys(lunr) {
  if (lunr.TokenSet.prototype.toString.separated) return;
  const separated = function () {
    if (this._str) return this._str;
    let str = this.final ? "1" : "0";
    for (const label of Object.keys(this.edges).sort()) str += label + this.edges[label].id + ",";
    return str;
  };
  separated.separated = true;
  lunr.TokenSet.prototype.toString = separated;
}

// Matches just-the-docs.js's accumulateSetUnions(): lunr 2.3.9's Index#query
// gathers a REQUIRED clause's entries as a running total, `c = c.union(S)`,
// once per expanded term and field, and Set#union copies both sets every
// time, which made a short wildcard word quadratic (`a page`, about 800 ms).
// A set that union() made takes the next set into itself, in place, with
// lunr's own length. Installed once.
function accumulateSetUnions(lunr) {
  const union = lunr.Set.prototype.union;
  if (union.accumulates) return;
  const accumulating = function (other) {
    if (other === lunr.Set.complete || other === lunr.Set.empty) return union.call(this, other);
    let set = this;
    if (set.distinct === undefined) {
      set = new lunr.Set(Object.keys(this.elements));
      set.distinct = set.length;
    }
    const keys = Object.keys(other.elements);
    set.length = set.distinct + keys.length;
    for (const key of keys) {
      if (!set.elements[key]) {
        set.elements[key] = true;
        set.distinct++;
      }
    }
    return set;
  };
  accumulating.accumulates = true;
  lunr.Set.prototype.union = accumulating;
}

// The two symbol-index fields (see builder/search.mjs's
// joinSymbolsToEntries and WIP.Search.md's "Design" §2), at the same
// boosts as both patched copies of just-the-docs.js
// (builder/vendor/just-the-docs/assets/js/just-the-docs.js and
// builder/offline.mjs's JTD_INITSEARCH_FN_REPLACEMENT). test/search.test.mjs
// checks all three field lists agree.
export function buildIndex(lunr, docs) {
  const twins = stemTwins(lunr, docs);
  return lunr(function () {
    this.ref("id");
    this.field("title", { boost: 200 });
    this.field("content", { boost: 2 });
    this.field("names", { boost: 100 });
    this.field("qualified", { boost: 500 });
    // Mirrors the exact-name, primary-name and page-title patches
    // (WIP.Search.md, "Reader intent"). `exact` and `primary` hold names as
    // exactName() writes them, from `names` and `primary`; `page` holds
    // `doc`.
    this.field("exact", { boost: 50 });
    this.field("primary", { boost: 1000 });
    this.field("page", { boost: 5 });
    // Mirrors the index-term patch: hand-marked terms written whole in
    // `index` (see indexField()), with its average length pinned at one term
    // (see pinIndexFieldLengths()).
    this.field("index", { boost: 1000 });
    this.field("relUrl");
    this.metadataWhitelist = ["position"];
    pinIndexFieldLengths(this);
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
        content: indexedContent(docs[id]),
        names: docs[id].names || "",
        qualified: qualifiedField(lunr, docs[id], twins),
        exact: (docs[id].names || "").split(/\s+/).filter(Boolean).map(exactName).join(" "),
        primary: (docs[id].primary || "").split(/\s+/).filter(Boolean).map(exactName).join(" "),
        page: docs[id].doc || "",
        index: indexField(lunr, docs[id]),
        relUrl: docs[id].relUrl,
      });
    }
  });
}

// Matches just-the-docs.js's exactName(): a name, lowercased, with every
// non-word character spelled as `_` and its hex code, and `_` appended.
// lunr's trimmer would strip those characters from the ends, turning
// `#If` into `if` and `<>` into nothing; spelled out, they survive, so
// `#If`, `Time$` and the operators stay distinct names. The final `_`
// keeps a whole-name query off every longer name that starts with it
// (`Node` against `Nodes`); no Porter stemmer rule touches a word ending
// in it.
function exactName(name) {
  return name.toLowerCase().replace(/\W/g, (c) => "_" + c.charCodeAt(0).toString(16)) + "_";
}

// Matches just-the-docs.js's stemTwins(): the qualified names that the
// stemmer merges with another name's (`Printer.Font` and `Printer.Fonts`
// both stem to `printer.font`), which would otherwise tie in `qualified`.
// Keyed by the name as the tokenizer writes it.
function stemTwins(lunr, docs) {
  const byStem = new Map();
  for (const id in docs) {
    for (const token of lunr.tokenizer(docs[id].qualified || "")) {
      const stem = lunr.stemmer(lunr.trimmer(token.clone())).toString();
      if (!byStem.has(stem)) byStem.set(stem, new Set());
      byStem.get(stem).add(token.str);
    }
  }
  return new Set([...byStem.values()].filter((names) => names.size > 1).flatMap((names) => [...names]));
}

// Matches just-the-docs.js's qualifiedField(): the qualified names, and
// those of them that have a stem twin also whole, as exactName() writes
// them, so a query naming one finds it and not its twin.
function qualifiedField(lunr, doc, twins) {
  const qualified = doc.qualified || "";
  const whole = lunr.tokenizer(qualified).filter((t) => twins.has(t.str)).map((t) => exactName(t.str));
  return whole.length ? `${qualified} ${whole.join(" ")}` : qualified;
}

// Matches just-the-docs.js's phraseKey() and indexTermKey(): a hand-marked
// index term as `index` holds it, its words as the index holds words
// (tokenized, trimmed, stemmed) joined by `_`, with `_` appended, so the
// whole term is one token that a query matches only by naming all of it.
function phraseKey(lunr, tokens) {
  return tokens.map((t) => lunr.stemmer(t.clone()).toString()).join("_") + "_";
}

function indexTermKey(lunr, term) {
  const tokens = lunr.tokenizer(term).map((t) => lunr.trimmer(t)).filter((t) => t.str !== "");
  return tokens.length ? phraseKey(lunr, tokens) : "";
}

// Matches just-the-docs.js's indexField(): the main terms as
// indexTermKey() writes them, the secondary ones (`index_also`) with one
// more `_`, in one field, since every field costs a slot on every term in
// the index.
function indexField(lunr, doc) {
  const main = (doc.index || []).map((t) => indexTermKey(lunr, t)).filter(Boolean);
  const also = (doc.index_also || []).map((t) => indexTermKey(lunr, t)).filter(Boolean).map((k) => k + "_");
  return main.concat(also).join(" ");
}

// Matches just-the-docs.js's indexedContent(): the content with the index
// terms appended as plain words, so an entry marked `late binding` still
// has both words when a query requires all of them.
function indexedContent(doc) {
  const terms = (doc.index || []).concat(doc.index_also || []);
  return terms.length ? doc.content + " " + terms.join(" ") : doc.content;
}

// Matches just-the-docs.js's pinIndexFieldLengths(): `index` is empty on
// nearly every entry, so BM25's average length for it is near zero and a
// marked entry's match would count for almost nothing. The average is
// pinned at one term.
function pinIndexFieldLengths(builder) {
  const averageLengths = builder.calculateAverageFieldLengths;
  builder.calculateAverageFieldLengths = function () {
    averageLengths.call(this);
    this.averageFieldLength.index = 1;
  };
}

// Every field but `exact`, `primary` and `index`, which only their own
// clauses may search: otherwise the trailing wildcard `node*` matches
// `nodes_`.
// A plain word, one that isn't a qualified name, completes with the
// trailing wildcard in all of them but `qualified` (see search()).
const TEXT_FIELDS = ["title", "content", "names", "qualified", "page", "relUrl"];
const PLAIN_FIELDS = ["title", "content", "names", "page", "relUrl"];

// Matches just-the-docs.js: the kinds tB/symbols.json gives its symbols,
// less `enumvalue`, which nobody types. A query naming one thing plus its
// kind -- `With statement`, `AddressOf operator` -- is treated as naming
// that thing.
const KIND_WORDS = ["operator", "statement", "attribute", "keyword", "directive", "class", "method", "property", "module", "function", "constant", "enum", "object", "member", "sub", "package", "interface", "control", "event", "type", "field"];

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

// Matches just-the-docs.js's boostWholeTitles(): a query of two or more
// words that reads the same as a result's whole title, or its page title and
// title together, scores WHOLE_TITLE_BOOST times as much (`Return Syntax`,
// `DTPicker Properties`). Compared as indexTermKey() writes both. `keys`
// holds each entry's two keys once computed, by ref.
const WHOLE_TITLE_BOOST = 3;

function boostWholeTitles(lunr, results, docs, baseTokens, keys) {
  if (baseTokens.length < 2) return results;
  const key = phraseKey(lunr, baseTokens);
  let boosted = false;
  for (const result of results) {
    let k = keys.get(result.ref);
    if (!k) {
      const doc = docs[result.ref];
      k = [indexTermKey(lunr, doc.title || ""), indexTermKey(lunr, `${doc.doc || ""} ${doc.title || ""}`)];
      keys.set(result.ref, k);
    }
    if (k[0] === key || k[1] === key) {
      result.score *= WHOLE_TITLE_BOOST;
      boosted = true;
    }
  }
  return boosted ? results.sort((a, b) => b.score - a.score) : results;
}

// The whole-title keys, per docs object, as the client keeps them for its
// one docs object.
const titleKeys = new WeakMap();

export function search({ lunr, index, docs }, input) {
  // Patched, matching just-the-docs.js: trim each token as the index's own
  // pipeline did (lunr.trimmer), so `Date$` finds `date`, and drop tokens
  // left empty. That includes tokens made only of asterisks, which would
  // otherwise reach lunr.Query.wildcard.TRAILING and throw inside lunr's
  // query engine instead of matching nothing.
  const baseTokens = lunr.tokenizer(input).map((t) => lunr.trimmer(t)).filter((t) => t.str !== "");
  const queryTokens = [];
  const qualifiedTokens = [];
  for (const token of baseTokens) {
    queryTokens.push(token);
    const marked = token.str.replace(DOT_SPLIT, "$1\u0000");
    if (marked !== token.str) {
      qualifiedTokens.push(token);
      for (const part of marked.split("\u0000")) {
        if (part.length > 1) queryTokens.push(token.clone(() => part));
      }
    }
  }
  // Qualified names, matching just-the-docs.js: `qualified` holds each
  // `Container.Name` whole, so only a qualified name may complete there
  // with the trailing wildcard. A plain word would complete to every member
  // of each container its name begins (`vbfile*` to `vbfileattribute.*`).
  // Two adjacent words, joined with a dot, name a member as a qualified
  // name does (`FileListBox Name`). Both also match a whole name, for the
  // names `qualified` holds whole (see qualifiedField()).
  const plainTokens = queryTokens.filter((t) => !qualifiedTokens.includes(t));
  const pairTokens = [];
  for (let i = 0; i + 1 < baseTokens.length; i++) {
    const [a, b] = [baseTokens[i], baseTokens[i + 1]];
    if (!qualifiedTokens.includes(a) && !qualifiedTokens.includes(b)) pairTokens.push(a.clone(() => `${a.str}.${b.str}`));
  }
  // Exact name, matching just-the-docs.js: a query naming one thing also
  // matches that whole name, in `exact` and, if it is a type or language
  // element, in `primary`. One thing is one word, not counting words that
  // name a kind: in a phrase such as "error handling", `error` on its own
  // isn't what the reader named, but in "With statement", `With` is. Only
  // in the singular: "Delegate Types" and "New Functions" name a topic, not
  // the one thing `Delegate` or `New`.
  const words = input.split(/\s+/).filter(Boolean);
  const named = words.filter((w) => !KIND_WORDS.includes(w.toLowerCase()));
  const name = named.length === 1 ? named[0] : words.length === 1 ? words[0] : null;
  const wholeQualified = [];
  words.forEach((word, w) => {
    if (word.includes(".")) wholeQualified.push(exactName(word));
    if (w + 1 < words.length) wholeQualified.push(exactName(`${word}.${words[w + 1]}`));
  });
  // Index terms, matching just-the-docs.js: every run of up to four
  // consecutive words, written as indexTermKey() writes a term, so a query
  // matches a term by naming all of it, alone or among other words. A
  // secondary term (one more `_`) weighs a fifth of a main one.
  const indexKeys = [];
  for (let a = 0; a < baseTokens.length; a++) {
    for (let b = a + 1; b <= baseTokens.length && b - a <= 4; b++) {
      indexKeys.push(phraseKey(lunr, baseTokens.slice(a, b)));
    }
  }
  const anyWords = (q) => {
    q.term(queryTokens, { fields: TEXT_FIELDS, boost: 10 });
    q.term(plainTokens, { fields: PLAIN_FIELDS, wildcard: lunr.Query.wildcard.TRAILING });
    q.term(qualifiedTokens, { fields: TEXT_FIELDS, wildcard: lunr.Query.wildcard.TRAILING });
    q.term(pairTokens, { fields: ["qualified"], boost: 10 });
    q.term(wholeQualified, { fields: ["qualified"], boost: 10 });
    if (name) q.term(exactName(name), { fields: ["exact", "primary"] });
    for (const key of indexKeys) {
      q.term(key, { fields: ["index"], boost: 5, usePipeline: false });
      q.term(key + "_", { fields: ["index"], boost: 1, usePipeline: false });
    }
  };
  // All words first, matching just-the-docs.js: with two or more words, look
  // for entries that contain every one of them, and only if there are none,
  // for entries that contain any. Each word is required as its stem with a
  // trailing wildcard, since the index holds stems (an unstemmed `operator*`
  // would miss `oper`); a whole word and a partly typed one both match. A
  // word found only in `qualified` still counts (an entry may name its
  // container nowhere else), but scores there only if it is a qualified
  // name, as in anyWords: so the REQUIRED clause, which scores too, has
  // boost 0, and a second clause scores the word.
  let results = [];
  if (baseTokens.length >= 2) {
    results = index.query((q) => {
      anyWords(q);
      for (const token of baseTokens) {
        const stem = lunr.stemmer(token.clone()).toString();
        const wildcard = lunr.Query.wildcard.TRAILING;
        q.term(stem, { fields: TEXT_FIELDS, wildcard, usePipeline: false, presence: lunr.Query.presence.REQUIRED, boost: 0 });
        q.term(stem, { fields: qualifiedTokens.includes(token) ? TEXT_FIELDS : PLAIN_FIELDS, wildcard, usePipeline: false });
      }
    });
  }
  // A name with no word characters (`<>`, `*`) leaves no tokens, but its
  // exact-name clause can still match.
  if (results.length === 0 && (queryTokens.length || name)) results = index.query(anyWords);
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
  if (!titleKeys.has(docs)) titleKeys.set(docs, new Map());
  return boostWholeTitles(lunr, results, docs, baseTokens, titleKeys.get(docs));
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
