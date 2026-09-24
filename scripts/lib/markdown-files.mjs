// Every markdown file under docs/, found one way. Shared, because three tools
// walk docs/ for its pages and their private copies had come to disagree: two
// filtered the build's output trees out of a recursive readdir that had already
// descended into them, and one did not skip them at all.
//
// The output trees are skipped before they are entered, and that is the point
// rather than a nicety. serve.bat deletes and rewrites docs/_serve on every
// rebuild, so a walk that is inside it when one starts finds a folder gone from
// under it and dies with ENOENT -- check_code_regions.mjs failed test.bat that
// way, over nothing in the content, while a preview was running.
//
// Which trees are outputs is shared further than the walk. check_tree_fresh.mjs
// skips the same ones when it looks for sources newer than a build; it used to
// keep a list of its own, which missed four folders sitting beside the ones it
// named.

import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * The trees the build writes inside docs/, matched by name prefix: _site,
 * _site-offline and _site-pdf from build.bat, _serve from serve.bat, _pdf from
 * book.bat, and the same three from a build given another --dest under docs/,
 * such as _site-basepath. None of them holds source.
 */
export const OUTPUT_TREES = ["_site", "_serve", "_pdf"];

/** Whether a folder directly under docs/ is one of the build's output trees. */
export const isOutputTree = (name) => OUTPUT_TREES.some((prefix) => name.startsWith(prefix));

/** Every markdown file under `root`, as sorted `/`-separated relative paths. */
export async function markdownFiles(root) {
  const rels = [];
  const walk = async (dir, rel) => {
    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
      if (!rel && isOutputTree(e.name)) continue;
      const entryRel = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) await walk(path.join(dir, e.name), entryRel);
      else if (e.isFile() && e.name.endsWith(".md")) rels.push(entryRel);
    }
  };
  await walk(root, "");
  return rels.sort();
}
