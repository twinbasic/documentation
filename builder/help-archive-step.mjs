// The help add-in's documentation archive. The add-in in add-in/ embeds the
// offline tree as a zip, add-in/Resources/HELP/site.zip, which lib/help-archive.mjs
// writes and reads back; its format and checks are there. The archive is
// gitignored, so a local build is what produces it. The add-in's project file,
// the download, carries the same bytes (addin-project.mjs).
//
// `helpArchiveStep` is the build's `helpArchive` task. It waits for every task
// that writes into the offline tree, and runs before the Gantt injection, which
// rewrites BuildInfo.html in both trees after the task graph is done and
// writes assets/images/gantt.svg. So the archive holds BuildInfo.html without
// the chart, and gantt.svg as the placeholder the offline tree copied from the
// sources. Two builds of one tree write the same archive, and the same project
// file with it, which the chart (it holds the build's timings) would prevent.
//
// `recheckHelpArchive` runs at the end of runBuild, after the Gantt injection,
// and checks that the offline tree on disk still lists the archive's files and
// that only the two files the injection writes differ in content. A tree that
// drifted from its archive, because some task wrote into it after the archive
// task ran, fails the build.
//
// Only a build of the documentation tree into docs/_site-offline writes the
// archive. A build of any other source tree (tbdocs also builds test fixtures),
// or into another --dest (compare_trees, check_links_diff), leaves the add-in's
// archive alone, as does `--serve`, `--dry-run` and a build without an offline
// tree. `--no-help-archive` skips it too; CI does not pass it, because the
// download published from CI's build holds the archive. The step does not look
// at $CI.

import path from "node:path";
import { checkHelpArchive, writeHelpArchive } from "../lib/help-archive.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import { GUARDED_SRC } from "./baseline.mjs";

export const HELP_ARCHIVE_REL = "add-in/Resources/HELP/site.zip";

const mb = (n) => (n / 1048576).toFixed(1);

// The offline tree the archive is made from, and the only one: Windows paths
// compare without case.
const OFFLINE_TREE = path.join(REPO_ROOT, GUARDED_SRC, "_site-offline");
const sameDir = (a, b) => path.relative(a, b) === "";

const NOT_WRITTEN = { text: "", failed: false, zip: null, out: null };

/**
 * Write the add-in's archive of the offline tree this build wrote.
 *
 * @param {object} o
 * @param {string} o.src          the source tree built, repo-relative with forward slashes
 * @param {string} o.offlineRoot  the offline tree this build wrote, or null when it built none
 * @param {boolean} o.serve       the build is a `--serve` session
 * @param {boolean} o.dryRun      the build wrote no trees
 * @param {boolean} o.disabled    `--no-help-archive` was given
 * @param {string} [o.out]        the zip; the add-in's by default
 * @returns {Promise<{text: string, failed: boolean, zip: Buffer | null, out: string | null}>} what to
 *   print, "" when the step did not run; the archive's bytes and path, null when this build wrote none
 */
export async function helpArchiveStep({
  src,
  offlineRoot,
  serve,
  dryRun,
  disabled,
  out = path.join(REPO_ROOT, HELP_ARCHIVE_REL),
}) {
  if (src !== GUARDED_SRC || serve || dryRun || disabled || !offlineRoot) return NOT_WRITTEN;
  if (!sameDir(path.resolve(offlineRoot), OFFLINE_TREE)) return NOT_WRITTEN;
  try {
    const s = await writeHelpArchive({ src: path.resolve(offlineRoot), out });
    return {
      text: `help archive: ${HELP_ARCHIVE_REL}, ${s.entries} entries, ${mb(s.zipBytes)} MB (${(s.ms / 1000).toFixed(1)} s)\n`,
      failed: false,
      zip: s.zip,
      out,
    };
  } catch (err) {
    if (err.verifyFailed) {
      const shown = err.problems.slice(0, 50).map((p) => `  ${p}\n`);
      const more = err.problems.length > 50 ? `  ... and ${err.problems.length - 50} more\n` : "";
      return {
        ...NOT_WRITTEN,
        text: `help archive: ${HELP_ARCHIVE_REL} does not match the offline tree: ${err.problems.length} problem(s)\n${shown.join("")}${more}`,
        failed: true,
      };
    }
    return { ...NOT_WRITTEN, text: `help archive: not written: ${err.message}\n`, failed: true };
  }
}

/**
 * Check, after the Gantt injection, that the offline tree still matches the
 * archive this build wrote: the same files, the same bytes in each but the
 * `mayDiffer` ones.
 *
 * @param {object} o
 * @param {{zip: Buffer | null, out: string | null}} o.archive  the task's result
 * @param {string} o.offlineRoot  the offline tree
 * @param {string[]} o.mayDiffer  the files the Gantt injection wrote, relative to the tree
 * @returns {Promise<{text: string, failed: boolean}>} "" when the archive was not written or matches
 */
export async function recheckHelpArchive({ archive, offlineRoot, mayDiffer }) {
  if (!archive?.zip || !archive.out) return { text: "", failed: false };
  let problems;
  try {
    problems = await checkHelpArchive({ src: path.resolve(offlineRoot), zip: archive.out, mayDiffer });
  } catch (err) {
    return { text: `help archive: the offline tree could not be checked against it: ${err.message}\n`, failed: true };
  }
  if (problems.length === 0) return { text: "", failed: false };
  const shown = problems.slice(0, 50).map((p) => `  ${p}\n`);
  const more = problems.length > 50 ? `  ... and ${problems.length - 50} more\n` : "";
  return {
    text:
      `help archive: the offline tree on disk differs from the archive, beyond ${mayDiffer.join(" and ")}: ` +
      `${problems.length} problem(s)\n${shown.join("")}${more}`,
    failed: true,
  };
}
