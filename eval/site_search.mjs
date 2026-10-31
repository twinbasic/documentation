#!/usr/bin/env node
// Query the site's own search box from the command line.
//
// This is a faithful replica, not an approximation: it loads the real
// search-index.json the build emitted (the search entries and their index,
// as the page loads them) and the real vendored lunr, and it reproduces
// just-the-docs.js's query construction exactly (trailing wildcard, the
// edit-distance fallback). The index is the build's own: built by
// builder/search-index.mjs, the one definition of its fields, boosts and
// patches, which this file imports; a site with no search-index.json (a
// snapshot from before it existed) has its index built here from
// search-data.json, by the same code.
//
// It exists because navigation and search fail on DIFFERENT pages, so judging
// discoverability by either one alone is misleading. A page can be search
// rank #1 and six navigation hops away, and another two navigation hops away
// and missed by every search.
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

import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { CliError, exitOnCrash, numberOption, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import { buildIndex, exactName, indexTermKey, loadSearchLunr, phraseKey } from "../builder/search-index.mjs";

export { buildIndex };

function parseArgs(argv) {
  const { values, positionals, n } = withUsageError(() => {
    const cli = parseCli(argv, {
      options: {
        site: { type: "string" },
        n: { type: "string" },
        composition: { type: "boolean" },
        help: { type: "boolean", short: "h" },
      },
      positionals: { min: 0 },
      stopAt: ["help"],
    });
    if (cli.stopped === "help") return cli;
    const n = "n" in cli.values ? numberOption(cli.values.n, { option: "--n", integer: true, min: 1 }) : 8;
    if (cli.values.composition && cli.positionals.length) {
      throw new CliError("conflict", "--composition takes no search terms", { option: "--composition" });
    }
    return { ...cli, n };
  });
  return {
    site: "site" in values ? path.resolve(values.site) : path.join(REPO_ROOT, "docs/_site"),
    n,
    composition: values.composition,
    help: values.help,
    terms: positionals,
  };
}

export function resolvePaths(site) {
  return {
    dataPath: path.join(site, "assets/js/search-data.json"),
    indexPath: path.join(site, "assets/js/search-index.json"),
    lunrPath: path.join(site, "assets/js/vendor/lunr.min.js"),
  };
}

// The site's lunr with the site's patches installed (builder/search-index.mjs's
// loadSearchLunr): the tokenizer the index was built with, which a query must
// tokenize with too, and the two query patches the page installs.
export function loadLunr(lunrPath) {
  return loadSearchLunr(lunrPath);
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
// that thing. Exported for eval/search_quality.mjs's name-and-kind set.
export const KIND_WORDS = [
  "operator",
  "statement",
  "attribute",
  "keyword",
  "directive",
  "class",
  "method",
  "property",
  "module",
  "function",
  "constant",
  "enum",
  "object",
  "member",
  "sub",
  "package",
  "interface",
  "control",
  "event",
  "type",
  "field",
];

// The site's index as the page loads it: the build's search-index.json, or,
// for a site from before the build wrote one, built here by the same code.
export function load(site) {
  const { dataPath, indexPath, lunrPath } = resolvePaths(site);
  for (const p of [dataPath, lunrPath]) {
    if (!fs.existsSync(p)) {
      console.error(
        `missing ${path.relative(REPO_ROOT, p)}\n` + "Run build.bat (or `node builder/tbdocs.mjs --src docs`) first.",
      );
      process.exit(2);
    }
  }
  const lunr = loadLunr(lunrPath);
  // search-index.json holds the entries and their index, `{docs, index}`.
  if (fs.existsSync(indexPath)) {
    const { docs, index } = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    return { lunr, docs, index: lunr.Index.load(index) };
  }
  const docs = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  return { lunr, docs, index: buildIndex(lunr, docs) };
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

// Matches just-the-docs.js's namesTheThing(): a result matched the name in
// `exact` or `primary`, or every word of it in `title`.
function namesTheThing(lunr, result, name) {
  const metadata = result.matchData.metadata;
  if (Object.values(metadata).some((m) => m.exact || m.primary)) return true;
  const keys = lunr
    .tokenizer(name)
    .map((t) => lunr.stemmer(lunr.trimmer(t)).toString())
    .filter(Boolean);
  return keys.length > 0 && keys.every((k) => metadata[k] && metadata[k].title);
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
  const baseTokens = lunr
    .tokenizer(input)
    .map((t) => lunr.trimmer(t))
    .filter((t) => t.str !== "");
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
    if (!qualifiedTokens.includes(a) && !qualifiedTokens.includes(b))
      pairTokens.push(a.clone(() => `${a.str}.${b.str}`));
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
  const allWords = (optionalKinds) =>
    index.query((q) => {
      anyWords(q);
      for (const token of baseTokens) {
        const stem = lunr.stemmer(token.clone()).toString();
        const wildcard = lunr.Query.wildcard.TRAILING;
        if (!optionalKinds || !KIND_WORDS.includes(token.str)) {
          q.term(stem, {
            fields: TEXT_FIELDS,
            wildcard,
            usePipeline: false,
            presence: lunr.Query.presence.REQUIRED,
            boost: 0,
          });
        }
        q.term(stem, {
          fields: qualifiedTokens.includes(token) ? TEXT_FIELDS : PLAIN_FIELDS,
          wildcard,
          usePipeline: false,
        });
      }
    });
  // Kind words, matching just-the-docs.js: a query naming one thing and its
  // kind (`MaxHeight property`, `Continue statement`) requires the kind word
  // only while some entry found has that name in its title or as its exact
  // name. A member's section rarely says "property" or "event", so requiring
  // the word dropped the very entry the reader named; then the pass runs
  // again with the kind words optional, and they still score.
  let results = [];
  if (baseTokens.length >= 2) {
    results = allWords(false);
    if (name && words.length > 1 && !results.some((r) => namesTheThing(lunr, r, name))) {
      const again = allWords(true);
      if (again.length) results = again;
    }
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
        q.term(tokens, { editDistance: Math.min(2, Math.round(Math.sqrt(input.length / 2 - 1))) }),
      );
    }
  }
  if (!titleKeys.has(docs)) titleKeys.set(docs, new Map());
  return boostWholeTitles(lunr, results, docs, baseTokens, titleKeys.get(docs));
}

// The composition report shows why the worst discoverability scores are
// structural rather than per-page: the developer documentation competes for its
// own search against the language reference, which shares its entire
// vocabulary -- font, add, download, colour, build and image are all twinBASIC
// API names.
function composition(docs) {
  const slice = (u) =>
    u.startsWith("/Documentation")
      ? "Documentation (developer docs)"
      : u.startsWith("/tB")
        ? "twinBASIC reference"
        : u.startsWith("/Features")
          ? "Features"
          : u.startsWith("/Tutorials")
            ? "Tutorials"
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
      "\nand the repository-root notes are unreachable by site search entirely.",
  );
}

// Only run the CLI when this file is executed directly -- eval/search_quality.mjs
// imports load()/buildIndex()/search() from here and must not trigger it.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  exitOnCrash();
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || (!opts.composition && !opts.terms.length)) {
    printHelpAndExit(
      'Usage: node eval/site_search.mjs "<query>" [--n <count>] [--site <path>] [-h, --help]\n' +
        "       node eval/site_search.mjs --composition\n\n" +
        "Queries the built site's real lunr index with the real query logic.\n" +
        "A term that starts with a dash goes after --. See eval/README.md.\n\n" +
        "Exit codes:\n" +
        "  0  the query ran, even with no results\n" +
        "  2  a refused command line, a site with no search index (run build.bat first),\n" +
        "     or a crash",
      opts.help ? {} : { stream: "stderr", exitCode: 2 },
    );
  }

  const ctx = load(opts.site);
  if (opts.composition) {
    composition(ctx.docs);
  } else {
    const input = opts.terms.join(" ");
    const hits = search(ctx, input);
    console.log(
      `query: ${JSON.stringify(input)} -- ${hits.length} result(s), showing ${Math.min(opts.n, hits.length)}\n`,
    );
    hits.slice(0, opts.n).forEach((h, i) => {
      const d = ctx.docs[h.ref];
      const snippet = String(d.content ?? "")
        .replace(/\s+/g, " ")
        .slice(0, 130);
      console.log(`${String(i + 1).padStart(2)}. ${d.title}`);
      console.log(`    ${d.relUrl}`);
      if (snippet) console.log(`    ${snippet}...`);
      console.log();
    });
  }
}
