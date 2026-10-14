// A callout's label: what the rest of its `> [!NOTE]` line says it applies to.
//
//   > [!WARNING] BETA 1005             true of this twinBASIC build
//   > [!NOTE] since BETA 984           true from this build on
//   > [!WARNING] 1.0.0.4               true of this version of the page's package
//   > [!WARNING] 1.6.151.1, BETA 1005  both
//   > [!WARNING] timeless              true of every build and version: drawn as no tag
//
// `timeless` is for a fact no new build or version can change: of Windows or COM, of what the
// package exists to reproduce (the Scripting Runtime's behaviour, for an FSO replacement), or
// a stated design decision. It stands alone, satisfies a package section's need for a label,
// and is never listed to check again. Only the tooling sees it.
//
// The label replaces "In twinBASIC BETA 1005, ..." and "In version 1.0.0.4, ..." in the
// callout's text, so that a tool, and not a reader, can find what a new build or a new
// version of a package leaves to re-check. A package version must be the one the section
// documents, its landing page's `indexed_from`, so moving a section to a new version fails the
// build until each of its labelled callouts has been checked again and its label moved. In such
// a section every callout has a label.
// `twin-index analyze` lists both kinds of callout to check again.
//
// The grammar is closed: anything else after `[!TYPE]` is an error, since the renderer used to
// drop such text silently. The build renders labels (builder/render.mjs) and the indexer
// reads them; both parse them here.

import { blockRegions } from "./markdown.mjs";

const BETA_RE = /^(since )?BETA (\d+)$/;
const VERSION_RE = /^\d+\.\d+\.\d+\.\d+$/;
const CALLOUT_RE = /^[ \t]*>[ \t]*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]([^\n]*)$/;

/**
 * Parses a label, the text after `[!TYPE]` on its line.
 *
 * @param {string} text
 * @returns {{items: {kind: "beta" | "since" | "version" | "timeless", value: string, text: string}[],
 *            error?: string}}  `items` is empty for an empty label; `error` says what is wrong
 *   with one that does not parse, and then `items` is empty too.
 */
export function parseCalloutLabel(text) {
  const label = text.trim();
  if (label === "") return { items: [] };
  const parts = label.split(",");
  const items = [];
  for (const part of parts) {
    const item = part.trim().replace(/[ \t]+/g, " ");
    if (item === "timeless") {
      if (parts.length > 1)
        return { items: [], error: `"${label}": timeless stands alone, since it is true of every build and version` };
      items.push({ kind: "timeless", value: "", text: item });
      continue;
    }
    const beta = BETA_RE.exec(item);
    if (beta) {
      if (items.some((i) => i.kind !== "version"))
        return { items: [], error: `"${label}" names twinBASIC's build twice` };
      items.push({ kind: beta[1] ? "since" : "beta", value: beta[2], text: item });
      continue;
    }
    if (VERSION_RE.test(item)) {
      if (items.some((i) => i.kind === "version"))
        return { items: [], error: `"${label}" names a package version twice` };
      items.push({ kind: "version", value: item, text: item });
      continue;
    }
    return {
      items: [],
      error:
        `"${item}" is not a callout label: write BETA <n>, since BETA <n>, or a package's ` +
        "four-part version, separated by commas, or timeless alone",
    };
  }
  // The package version first, then the build, whatever order the source has.
  items.sort((a, b) => (a.kind === "version" ? 0 : 1) - (b.kind === "version" ? 0 : 1));
  return { items };
}

/**
 * Checks a parsed label against the page it is on. In a package section every callout has a
 * label: what it says is true of the version documented, or of a twinBASIC build, and a new
 * version or build is a reason to check it again.
 *
 * @param {{kind: string, value: string}[]} items
 * @param {string | undefined} packageVersion  the `indexed_from` of the page's package
 *   section, when it is a four-part version
 * @returns {string | undefined}  what is wrong, if anything
 */
export function checkCalloutLabel(items, packageVersion) {
  if (packageVersion && items.length === 0)
    return `a callout in a package section has a label: ${packageVersion}, the version it is true of, BETA <n> for a fact of twinBASIC alone, or timeless for one no version can change`;
  const version = items.find((i) => i.kind === "version");
  if (!version) return undefined;
  if (!packageVersion)
    return `the label names package version ${version.value}, but the page is in no section with a four-part indexed_from`;
  if (version.value !== packageVersion)
    return `the label names version ${version.value}, but the section documents ${packageVersion} (its indexed_from): check the callout against ${packageVersion} and move its label`;
  return undefined;
}

/**
 * The labelled callouts of a page's markdown, outside code samples.
 *
 * @param {string} src
 * @returns {{line: number, type: string, label: string, items: object[], error?: string}[]}
 *   `line` is 1-based; a callout with no label is left out.
 */
export function calloutLabelsOf(src) {
  const lines = src.split(/\r\n?|\n/);
  const inCode = [];
  for (const r of blockRegions(src)) for (let i = r.start; i < r.end; i++) inCode[i] = true;
  const found = [];
  for (let i = 0; i < lines.length; i++) {
    if (inCode[i]) continue;
    const m = CALLOUT_RE.exec(lines[i]);
    if (!m || m[2].trim() === "") continue;
    found.push({ line: i + 1, type: m[1], label: m[2].trim(), ...parseCalloutLabel(m[2]) });
  }
  return found;
}

/**
 * Stamps each page under a package section with that section's version, as `packageVersion`:
 * the `indexed_from` of the nearest `index.md` above it (or the page itself) whose
 * `indexed_from` is a four-part version. The render workers check labels against it.
 *
 * @param {{srcRel: string, frontmatter?: object}[]} pages
 */
export function assignPackageVersions(pages) {
  const byDir = new Map();
  for (const page of pages) {
    const rel = page.srcRel.replaceAll("\\", "/");
    if (!rel.endsWith("/index.md")) continue;
    const v = String(page.frontmatter?.indexed_from ?? "");
    if (VERSION_RE.test(v)) byDir.set(rel.slice(0, -"/index.md".length), v);
  }
  for (const page of pages) {
    let dir = page.srcRel.replaceAll("\\", "/");
    for (;;) {
      const cut = dir.lastIndexOf("/");
      if (cut < 0) break;
      dir = dir.slice(0, cut);
      const v = byDir.get(dir);
      if (v) {
        page.packageVersion = v;
        break;
      }
    }
  }
}
