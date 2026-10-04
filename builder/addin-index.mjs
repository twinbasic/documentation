// The help add-in's copy of the symbol index. The add-in in add-in/ embeds
// tB/symbols.json as a resource, add-in/Resources/SYMBOLS/symbols.json, and the
// copy is committed so that the add-in builds from its tree as it is. Every
// build of the documentation compares the index it wrote with that copy, and
// rewrites the copy when they differ, so the changed file turns up in
// `git status` to be committed with the pages that changed it.
//
// The rules are the drift guards' (baseline.mjs): only a build of the
// documentation tree touches the copy, and neither CI nor `--serve` writes it;
// they say that it differs. A difference is never a failure: a copy one build
// behind gives the add-in an older index, not a broken one.
//
// The comparison is byte for byte. .gitattributes checks add-in/Resources/
// out as committed, so a CRLF checkout does not differ from the LF the build
// writes.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import { GUARDED_SRC } from "./baseline.mjs";

export const ADDIN_INDEX_REL = "add-in/Resources/SYMBOLS/symbols.json";

/**
 * Bring the add-in's copy of the index into step with this build's.
 *
 * @param {object} o
 * @param {string} o.src    the source tree built, repo-relative with forward slashes
 * @param {string} o.json   the index this build wrote, as written
 * @param {boolean} o.write may the copy be written (not in CI, not under --serve)
 * @param {string} [o.file] the copy; the add-in's by default
 * @returns {Promise<string>} what to print, "" when nothing changed
 */
export async function syncAddinIndex({ src, json, write, file = path.join(REPO_ROOT, ADDIN_INDEX_REL) }) {
  if (src !== GUARDED_SRC || !json) return "";
  let current = null;
  try {
    current = await readFile(file, "utf8");
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  if (current === json) return "";
  if (!write) return `add-in index: ${ADDIN_INDEX_REL} differs from this build's index; a local build rewrites it\n`;
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, json, "utf8");
  return `add-in index ${current === null ? "created" : "updated"}: ${ADDIN_INDEX_REL} (commit it)\n`;
}
