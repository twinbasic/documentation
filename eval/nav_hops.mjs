#!/usr/bin/env node
// The navigation channel, measured from the links rather than from a report.
//
//     node eval/nav_hops.mjs [--from <page>] [--repo <root>] <url-regex> [...]
//
// Breadth-first from a start page --- docs/index.md, the published welcome page,
// unless --from names another, such as README.md for a repo-protocol case ---
// over the links a reader can click, and prints the shortest path to the first
// page whose permalink matches each regex. See eval/README.md.
//
// WHY
//
// Search ranks are re-measured mechanically, with site_search.mjs. An
// evaluator's hop count is no more reliable than the rest of a report, so this
// measures navigation the same way. An evaluator can report that pure
// link-following STALLED on a link "broken in three places" when its own
// permalink lookup failed on the corpus's line endings, not the site; or
// navigate by directory listing, which a reader of the published site does
// not have.
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
import { pathToFileURL } from "node:url";
import { parseCli, printHelpAndExit, regexOption, withUsageError } from "../lib/cli.mjs";
import { parseFrontmatter } from "../lib/frontmatter.mjs";
import { blockRegions } from "../lib/markdown.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";

const SITE_HOST = /^https?:\/\/docs\.twinbasic\.com/i;

const USAGE =
  "Usage: node eval/nav_hops.mjs [--from <page>] [--repo <root>] [-h, --help] <url-regex> [...]\n\n" +
  "Shortest path by links from the start page (default docs/index.md) to the first page\n" +
  "whose permalink matches each regex. A regex that starts with a dash goes after --.\n" +
  "See eval/README.md.\n\n" +
  "Exit codes:\n" +
  "  0  every target is reachable by links\n" +
  "  1  a target is not reachable by links from the start page\n" +
  "  2  a refused command line (no targets, a pattern Git Bash turned into a Windows\n" +
  "     path included), no start page, or a crash";

function parseArgs(argv) {
  const { values, positionals, patterns } = withUsageError(() => {
    const cli = parseCli(argv, {
      options: {
        from: { type: "string", default: "docs/index.md" },
        repo: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
      positionals: { min: 0, max: Infinity },
      stopAt: ["help"],
    });
    if (cli.stopped === "help") return cli;
    return { ...cli, patterns: cli.positionals.map((t) => regexOption(t, { option: "<url-regex>", flags: "i" })) };
  });
  return {
    from: values.from,
    repo: "repo" in values ? path.resolve(values.repo) : REPO_ROOT,
    help: values.help,
    targets: positionals,
    patterns,
  };
}

/** A URL reduced to what identifies a page: no fragment, query, extension or trailing slash. */
const pageKey = (url) =>
  decodeURI(url.replace(/[#?].*$/, "").replace(/\.(html|md)$/i, "").replace(/\/+$/, "")).toLowerCase() || "/";

/** Every page under docs/: permalink by file, and file by permalink or redirect alias. */
async function loadPages(repo) {
  // The walker comes from this repository, never from --repo: a corpus built by
  // eval/build_corpus.mjs holds every script only as an unreadable stub, so
  // importing it from there failed with "markdownFiles is not a function".
  const { markdownFiles } = await import(pathToFileURL(path.join(REPO_ROOT, "lib/markdown-files.mjs")).href);
  const docs = path.join(repo, "docs");
  const urlOf = new Map();
  const byKey = new Map();
  const aliases = [];
  for (const rel of await markdownFiles(docs)) {
    const file = path.join(docs, rel);
    const data = parseFrontmatter(fs.readFileSync(file, "utf8"))?.data ?? {};
    if (typeof data.permalink !== "string") continue;
    urlOf.set(file, data.permalink);
    byKey.set(pageKey(data.permalink), file);
    const from = data.redirect_from;
    for (const alias of Array.isArray(from) ? from : from ? [from] : []) aliases.push([pageKey(String(alias)), file]);
  }
  for (const [key, file] of aliases) if (!byKey.has(key)) byKey.set(key, file);
  return { urlOf, byKey };
}

/**
 * The link targets a reader can click on a page, fences and indented code
 * left out. An HTML block stays, since its `href`s are links. The bare parser
 * finds the code: on the site's pages it finds what the site's parser finds.
 */
function hrefs(file) {
  const src = fs.readFileSync(file, "utf8");
  const lines = src.split(/\r\n|\r|\n/);
  for (const r of blockRegions(src)) if (r.type !== "html_block") lines.fill("", r.start, r.end);
  const text = lines.join("\n");
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
  if (o.help) return printHelpAndExit(USAGE);
  if (!o.targets.length) return printHelpAndExit(USAGE, { stream: "stderr", exitCode: 2 });
  // Git Bash turns an argument that looks like a POSIX path into a Windows one,
  // so '^/tB/Core/Open$' arrives as '^C:/Program Files/Git/tB/Core/Open$', and
  // every target then reports as unreachable, which reads as a finding.
  const mangled = o.targets.filter((t) => /^\^?[A-Za-z]:[\\/]/.test(t));
  if (mangled.length) {
    console.error(`these patterns arrived as Windows paths: ${mangled.join(", ")}\n` +
      "Git Bash converted them. Run with MSYS_NO_PATHCONV=1 set, or from another shell.");
    return 2;
  }
  const start = path.resolve(o.repo, o.from);
  if (!fs.existsSync(start)) {
    console.error(`no start page: ${start}`);
    return 2;
  }
  const pages = await loadPages(o.repo);

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

  const show = (f) => path.relative(o.repo, f).split(path.sep).join("/");
  let unreachable = 0;
  for (const [i, t] of o.targets.entries()) {
    const re = o.patterns[i];
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
