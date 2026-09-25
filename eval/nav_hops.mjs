#!/usr/bin/env node
// The navigation channel, measured from the links rather than from a report.
//
//     node eval/nav_hops.mjs [--from <page>] [--src <root>] <url-regex> [...]
//
// Breadth-first from a start page --- docs/index.md, the published welcome page,
// unless --from names another, such as README.md for a repo-protocol case ---
// over the links a reader can click, and prints the shortest path to the first
// page whose permalink matches each regex. See eval/README.md.
//
// WHY
//
// Search ranks have always been re-measured mechanically, with site_search.mjs.
// Navigation had nothing: an evaluator's hop count was checked by hand or not at
// all, and it is no more reliable than the rest of a report. In round 9, UC-63
// reported that pure link-following STALLED on a link "broken in three places";
// the link works, and the table it was after is two hops from the welcome page.
// The evaluator's permalink lookup had failed on the corpus's line endings, not
// on the site. Two other evaluators navigated by directory listing, which a
// reader of the published site does not have.
//
// HOW A LINK RESOLVES
//
// Against the page's rendered URL, its permalink, exactly as a browser resolves
// it --- not against the file's path, which is how a link written by analogy
// with a neighbouring page goes wrong. A link to a redirect_from alias counts,
// because the site serves a redirect there. From a file outside docs/ (the
// repository README), a relative link names a file and a docs.twinbasic.com URL
// names a page. The sidebar and directory listings are not links and are not
// followed, so a page reachable only through the sidebar reports as unreachable.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import matter from "gray-matter";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE_HOST = /^https?:\/\/docs\.twinbasic\.com/i;

const USAGE =
  "Usage: node eval/nav_hops.mjs [--from <page>] [--src <root>] <url-regex> [...]\n\n" +
  "Shortest path by links from the start page (default docs/index.md) to the first page\n" +
  "whose permalink matches each regex. See eval/README.md.";

function parseArgs(argv) {
  const o = { src: REPO_ROOT, from: "docs/index.md", targets: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--from") o.from = argv[++i];
    else if (a === "--src") o.src = path.resolve(argv[++i]);
    else if (a === "--help" || a === "-h") o.help = true;
    else o.targets.push(a);
  }
  return o;
}

/** A URL reduced to what identifies a page: no fragment, query, extension or trailing slash. */
const pageKey = (url) =>
  decodeURI(url.replace(/[#?].*$/, "").replace(/\.(html|md)$/i, "").replace(/\/+$/, "")).toLowerCase() || "/";

/** Every page under docs/: permalink by file, and file by permalink or redirect alias. */
async function loadPages(src) {
  // The walker comes from this repository, never from --src: a corpus built by
  // eval/build_corpus.mjs holds every script only as an unreadable stub, so
  // importing it from there failed with "markdownFiles is not a function".
  const { markdownFiles } = await import(pathToFileURL(path.join(REPO_ROOT, "lib/markdown-files.mjs")).href);
  const docs = path.join(src, "docs");
  const urlOf = new Map();
  const byKey = new Map();
  const aliases = [];
  for (const rel of await markdownFiles(docs)) {
    const file = path.join(docs, rel);
    // A BOM in front of the frontmatter hides it from gray-matter; builder/discover.mjs strips it too.
    const { data } = matter(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
    if (typeof data.permalink !== "string") continue;
    urlOf.set(file, data.permalink);
    byKey.set(pageKey(data.permalink), file);
    const from = data.redirect_from;
    for (const alias of Array.isArray(from) ? from : from ? [from] : []) aliases.push([pageKey(String(alias)), file]);
  }
  for (const [key, file] of aliases) if (!byKey.has(key)) byKey.set(key, file);
  return { urlOf, byKey };
}

/** The link targets a reader can click on a page, code fences left out. */
function hrefs(file) {
  const text = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")
    .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, "");
  const out = [];
  for (const m of text.matchAll(/\]\(\s*<?([^()\s<>]+)>?(?:\s+"[^"]*")?\s*\)/g)) out.push(m[1]);
  for (const m of text.matchAll(/^[ \t]*\[[^\]\n]+\]:[ \t]*<?(\S+?)>?[ \t]*$/gm)) out.push(m[1]);
  for (const m of text.matchAll(/href="([^"]+)"/g)) out.push(m[1]);
  return out;
}

function resolve(pages, from, href) {
  if (/^(#|mailto:)/i.test(href)) return null;
  let key;
  if (SITE_HOST.test(href)) key = pageKey(href.replace(SITE_HOST, "") || "/");
  else if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return null;
  else if (pages.urlOf.has(from)) key = pageKey(new URL(href, "https://site" + pages.urlOf.get(from)).pathname);
  else {
    const file = path.resolve(path.dirname(from), decodeURI(href.replace(/[#?].*$/, "")));
    return file.endsWith(".md") && fs.existsSync(file) ? file : null;
  }
  return pages.byKey.get(key) ?? null;
}

async function main(argv) {
  const o = parseArgs(argv);
  if (o.help || !o.targets.length) {
    console.log(USAGE);
    return o.help ? 0 : 2;
  }
  // Git Bash turns an argument that looks like a POSIX path into a Windows one,
  // so '^/tB/Core/Open$' arrives as '^C:/Program Files/Git/tB/Core/Open$', and
  // every target then reports as unreachable, which reads as a finding.
  const mangled = o.targets.filter((t) => /^\^?[A-Za-z]:[\\/]/.test(t));
  if (mangled.length) {
    console.error(`these patterns arrived as Windows paths: ${mangled.join(", ")}\n` +
      "Git Bash converted them. Run with MSYS_NO_PATHCONV=1 set, or from another shell.");
    return 2;
  }
  const start = path.resolve(o.src, o.from);
  if (!fs.existsSync(start)) {
    console.error(`no start page: ${start}`);
    return 2;
  }
  const pages = await loadPages(o.src);

  const prev = new Map([[start, null]]);
  const queue = [start];
  while (queue.length) {
    const page = queue.shift();
    for (const href of hrefs(page)) {
      const next = resolve(pages, page, href);
      if (!next || prev.has(next)) continue;
      prev.set(next, page);
      queue.push(next);
    }
  }

  const show = (f) => path.relative(o.src, f).split(path.sep).join("/");
  let unreachable = 0;
  for (const t of o.targets) {
    const re = new RegExp(t, "i");
    // Breadth-first order: the first reachable match is a nearest one.
    const hit = [...prev.keys()].find((f) => re.test(pages.urlOf.get(f) ?? ""));
    if (!hit) {
      unreachable++;
      console.log(`${t}: not reachable by links from ${show(start)}`);
      continue;
    }
    const chain = [];
    for (let f = hit; f; f = prev.get(f)) chain.unshift(f);
    console.log(`${t}: ${chain.length - 1} hop(s)`);
    chain.forEach((f, i) => { console.log(`  ${i}. ${show(f)}${pages.urlOf.has(f) ? `  ${pages.urlOf.get(f)}` : ""}`); });
  }
  return unreachable ? 1 : 0;
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (e) => { console.error(e.stack ?? e.message); process.exit(2); },
);
