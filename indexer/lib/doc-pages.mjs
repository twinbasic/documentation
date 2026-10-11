import fs from "node:fs/promises";
import path from "node:path";

/**
 * The reference's package sections, as the indexer reads them. A package's
 * landing page, `docs/Reference/<Group>/<Section>/index.md`, ties the section to
 * the packages in the store through three frontmatter keys:
 *
 * - `package_name:` the store packages the section documents, comma-separated.
 *   Without it, the section's own folder name is the package's.
 * - `indexed_from:` the release tag the section was last brought up to date
 *   with, which is the `version` of the committed snapshot `analyze` compares
 *   the current packages with.
 * - `exclude_from_docs:` and `exclude_kinds:` what `analyze` leaves out.
 *
 * The site's builder ignores all of them.
 */

// A store group and the folder of the reference that holds its sections.
const GROUP_FOLDERS = [
  ["default", "Default"],
  ["built-in", "Built-In"],
  ["contributed", "Contributed"],
];

/** The folder of the reference a store group's sections are in, `Built-In` for `built-in`. */
export const groupFolder = (group) => new Map(GROUP_FOLDERS).get(group);

/**
 * Every page of a section, `{ rel, title, parent, permalink }`, `rel` relative
 * to the section's folder with `/` separators, in path order. A frontmatter
 * value in quotes is read without them.
 */
export async function sectionPages(dir) {
  const pages = [];
  const unquote = (v) => (v && /^(["']).*\1$/.test(v) ? v.slice(1, -1) : v);
  const walk = async (sub) => {
    let entries;
    try {
      entries = await fs.readdir(path.join(dir, sub), { withFileTypes: true });
    } catch {
      return; /* no such folder */
    }
    for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      const rel = sub ? `${sub}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(rel);
      else if (entry.name.endsWith(".md")) {
        const block = frontmatterOf(await fs.readFile(path.join(dir, rel), "utf-8"));
        if (!block) continue;
        pages.push({
          rel,
          title: unquote(frontmatterValue(block, "title")),
          parent: unquote(frontmatterValue(block, "parent")),
          permalink: unquote(frontmatterValue(block, "permalink")),
        });
      }
    }
  };
  await walk("");
  return pages;
}

/** The text of a page's frontmatter block, or null when the page has none. */
export function frontmatterOf(text) {
  const m = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
  return m ? m[1] : null;
}

/** The value of a top-level `key: value` line of a frontmatter block, or null. */
export function frontmatterValue(block, key) {
  const m = new RegExp(`^${key}:[ \\t]*(\\S.*?)[ \\t]*$`, "m").exec(block ?? "");
  return m ? m[1] : null;
}

/** The items of a top-level `key:` block list of a frontmatter block. */
export function frontmatterList(block, key) {
  const m = new RegExp(`^${key}:[ \\t]*\\r?\\n((?:[ \\t]+- .+(?:\\r?\\n|$))*)`, "m").exec(block ?? "");
  if (!m) return [];
  return m[1]
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s+-\s*/, "").trim())
    .filter(Boolean);
}

/** The store packages a section documents: its `package_name:`, else its folder's name. */
export function packageNames(block, folderName) {
  const named = frontmatterValue(block, "package_name");
  const names = named
    ?.split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  return names?.length ? names : [folderName];
}

/**
 * What a section's landing page says about the packages it documents:
 * `{ dir, packages, indexedFrom, exclusions }`, `exclusions` being the sets
 * `containers` (the types of `exclude_from_docs:`) and `kinds`
 * (`exclude_kinds:`).
 */
export function readSection(dir, folderName, text) {
  const block = frontmatterOf(text);
  return {
    dir,
    packages: packageNames(block, folderName),
    indexedFrom: frontmatterValue(block, "indexed_from"),
    exclusions: {
      containers: new Set(frontmatterList(block, "exclude_from_docs")),
      kinds: new Set(frontmatterList(block, "exclude_kinds")),
    },
  };
}

/**
 * Every package the reference documents, as a Map from `<group>/<package>`
 * (`built-in/WebView2Package`) to its section, as readSection returns it. A
 * package is documented when a section of its group names it; a folder with no
 * `index.md` is no section. The reference is read from `docs/Reference/`, given
 * as `referenceDir`.
 */
export async function documentedPackages(referenceDir) {
  const documented = new Map();
  for (const [group, folder] of GROUP_FOLDERS) {
    const groupDir = path.join(referenceDir, folder);
    let entries;
    try {
      entries = await fs.readdir(groupDir, { withFileTypes: true });
    } catch {
      continue; /* the group has no folder */
    }
    for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(groupDir, entry.name);
      let text;
      try {
        text = await fs.readFile(path.join(dir, "index.md"), "utf-8");
      } catch {
        continue; /* no index.md */
      }
      const section = readSection(dir, entry.name, text);
      for (const name of section.packages) documented.set(`${group}/${name}`, section);
    }
  }
  return documented;
}
