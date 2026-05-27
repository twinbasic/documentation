// One-off tool: assign explicit `nav_order` to .md frontmatter to lock
// in Jekyll's current effective nav order for sibling groups where
// Ruby's unstable `sort_by!` would otherwise produce a different
// ordering than ours.
//
// Usage:
//   node _assign_nav_order.mjs          -- dry-run, lists planned changes
//   node _assign_nav_order.mjs --apply  -- write the changes
//
// Algorithm:
//   1. Parse Jekyll's rendered sidebar (from docs/_site/index.html) to
//      get the authoritative children order for every parent.
//   2. Build our nav tree (Phase 1 + Phase 2) and compare children
//      lists per parent.
//   3. For each parent whose children order differs from Jekyll's,
//      assign explicit nav_order to each of that parent's children in
//      the nav_num bucket. The first child keeps its existing
//      nav_order (or gets `10` if unset); subsequent children get
//      incremented values, skipping anything already in use among the
//      siblings.
//   4. Children that already have NO nav_order (and currently sort
//      into the title_* bucket after the nav_num children) stay
//      unset. Jekyll's title_* sort is by title, which is unique per
//      parent on this site, so it's already deterministic.
//
// The fix is targeted: only the children of mismatched parents change.
// Run after each Jekyll re-render to catch any new ties.

import { promises as fs } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import matter from "gray-matter";

import { discover } from "../discover.mjs";
import { computeNav } from "../nav.mjs";

const apply = process.argv.includes("--apply");
// Run from builder/one-offs/, so docs/ is two levels up.
const srcRoot = path.resolve(process.cwd(), "../../docs");
const siteRoot = path.join(srcRoot, "_site");

const { pages } = await discover(srcRoot);
const config = yaml.load(await fs.readFile(path.join(srcRoot, "_config.yml"), "utf8"));
const { navTree } = computeNav(pages, config);

// ---------- parse Jekyll's sidebar -------------------------------------

const indexHtml = await fs.readFile(path.join(siteRoot, "index.html"), "utf8");
const navMatch = indexHtml.match(/<nav aria-label="Main" id="site-nav"[^>]*>([\s\S]*?)<\/nav>/);
const navHtml = navMatch[1];

function findMatchingClose(s, start, openPrefix, closeTag) {
  let depth = 0, i = start;
  while (i < s.length) {
    if (s.startsWith(openPrefix, i)) { depth++; i += openPrefix.length; continue; }
    if (s.startsWith(closeTag, i)) { depth--; if (depth === 0) return i; i += closeTag.length; continue; }
    i++;
  }
  return -1;
}

function parseUl(s) {
  // s is one `<ul>...</ul>` snippet (already extracted).
  const items = [];
  let depth = 0, i = 0;
  while (i < s.length) {
    if (s.startsWith("<ul", i)) { depth++; i = s.indexOf(">", i) + 1; continue; }
    if (s.startsWith("</ul>", i)) { depth--; i += "</ul>".length; continue; }
    if (depth === 1 && s.startsWith('<li class="nav-list-item', i)) {
      const liEnd = findMatchingClose(s, i, "<li", "</li>");
      items.push(parseLi(s.slice(i, liEnd + "</li>".length)));
      i = liEnd + "</li>".length;
      continue;
    }
    i++;
  }
  return items.filter(Boolean);
}

function parseLi(item) {
  const m = item.match(/<a href="([^"]+)" class="nav-list-link[^"]*">([\s\S]*?)<\/a>/);
  if (!m) return null;
  if (m[0].includes("external")) return null;
  const url = decodeURIComponent(m[1]);
  const title = m[2].trim();
  const ulStart = item.indexOf('<ul class="nav-list">', m.index + m[0].length);
  let children = [];
  if (ulStart >= 0) {
    const ulEnd = findMatchingClose(item, ulStart, "<ul", "</ul>");
    children = parseUl(item.slice(ulStart, ulEnd + "</ul>".length));
  }
  return { url, title, children };
}

// First top-level <ul> is the main nav; anything after is external links.
const firstUlStart = navHtml.indexOf('<ul class="nav-list">');
const firstUlEnd = findMatchingClose(navHtml, firstUlStart, "<ul", "</ul>");
const jekyllTree = parseUl(navHtml.slice(firstUlStart, firstUlEnd + "</ul>".length));

// ---------- compare and collect proposed changes -----------------------

const byUrl = new Map(pages.map(p => [p.permalink, p]));
const proposals = []; // [{srcRel, oldNavOrder, newNavOrder, parentTitle, url}]

function pickNavOrders(children) {
  // Children is Jekyll's ordered list. We need to assign new nav_orders
  // to break ties. Strategy:
  //   - Look up each child's existing nav_order from our pages array.
  //   - For nav_num children (has numeric nav_order), assign sequential
  //     values starting from the smallest existing nav_order in the
  //     group, incrementing by 1 per child. Skip values that another
  //     child already has (only matters if they had distinct values
  //     and we're filling around them).
  //   - Children without nav_order are left untouched -- they stay in
  //     the title_* bucket, which sorts deterministically by unique
  //     titles.
  const navNumChildren = children
    .map(c => ({ child: c, page: byUrl.get(c.url) }))
    .filter(({ page }) => page && typeof page.frontmatter.nav_order === "number");

  if (navNumChildren.length === 0) return [];

  // Anchor: keep the existing nav_order of the FIRST child in Jekyll's
  // order. If they all currently tie at N, use N as the start.
  const start = navNumChildren[0].page.frontmatter.nav_order;
  const taken = new Set();
  const out = [];
  let next = start;
  for (const { child, page } of navNumChildren) {
    while (taken.has(next)) next++;
    const newOrder = next;
    taken.add(newOrder);
    next++;
    if (page.frontmatter.nav_order !== newOrder) {
      out.push({
        srcRel: page.srcRel,
        oldNavOrder: page.frontmatter.nav_order,
        newNavOrder: newOrder,
        url: child.url,
      });
    }
  }
  return out;
}

function compareAndCollect(ours, theirs, parentTitle) {
  if (!ours || !theirs) return;
  const ourUrls = ours.map(c => c.url);
  const theirUrls = theirs.map(c => c.url);
  if (ourUrls.join("|") !== theirUrls.join("|")) {
    const fixes = pickNavOrders(theirs);
    for (const f of fixes) proposals.push({ ...f, parentTitle });
  }
  for (const ourChild of ours) {
    const theirChild = theirs.find(t => t.url === ourChild.url);
    if (theirChild) compareAndCollect(ourChild.children, theirChild.children, ourChild.title);
  }
}

compareAndCollect(navTree, jekyllTree, "<root>");

console.log(`Proposed nav_order changes: ${proposals.length} files`);
for (const p of proposals) {
  console.log(`  ${p.srcRel}: nav_order ${p.oldNavOrder} -> ${p.newNavOrder}  (parent: ${p.parentTitle})`);
}

if (!apply) {
  console.log("\nDry run. Re-run with --apply to write the changes.");
  process.exit(0);
}

// ---------- apply changes ----------------------------------------------

for (const p of proposals) {
  const filePath = path.join(srcRoot, p.srcRel);
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = matter(raw);
  parsed.data.nav_order = p.newNavOrder;
  // gray-matter's stringify uses js-yaml to re-emit the frontmatter.
  // Force a stable key order matching the source by re-reading the
  // original and patching just the nav_order line in-place (preserves
  // YAML key order, comments, and indentation).
  const newRaw = patchFrontmatterNavOrder(raw, p.newNavOrder);
  if (newRaw === null) {
    console.error(`Could not patch nav_order in ${p.srcRel}; skipping.`);
    continue;
  }
  await fs.writeFile(filePath, newRaw, "utf8");
  console.log(`  wrote ${p.srcRel}`);
}

// Surgical patch: find the frontmatter block, replace or insert the
// nav_order line. Preserves all other lines verbatim.
function patchFrontmatterNavOrder(raw, newValue) {
  if (!raw.startsWith("---\n") && !raw.startsWith("---\r\n")) return null;
  const fmEnd = raw.indexOf("\n---", 4);
  if (fmEnd < 0) return null;
  const fmStart = raw.indexOf("\n", 0) + 1;
  const fmBlock = raw.slice(fmStart, fmEnd);
  const rest = raw.slice(fmEnd);
  const lines = fmBlock.split("\n");

  let replaced = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^nav_order\s*:/.test(lines[i])) {
      lines[i] = `nav_order: ${newValue}`;
      replaced = true;
      break;
    }
  }
  if (!replaced) {
    // Insert after the `parent:` line if present, else after title.
    let insertAt = lines.findIndex(l => /^parent\s*:/.test(l));
    if (insertAt < 0) insertAt = lines.findIndex(l => /^title\s*:/.test(l));
    if (insertAt < 0) insertAt = lines.length - 1;
    lines.splice(insertAt + 1, 0, `nav_order: ${newValue}`);
  }
  return raw.slice(0, fmStart) + lines.join("\n") + rest;
}
