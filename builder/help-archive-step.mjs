// The build's last step: the help add-in's documentation archive. The add-in in
// add-in/ embeds the offline tree as a zip, add-in/Resources/HELP/site.zip, which
// lib/help-archive.mjs writes and reads back; its format and checks are there.
// The archive is gitignored, so a local build is what produces it.
//
// It runs at the very end of runBuild, after injectGanttChart and recheckInjected.
// They rewrite BuildInfo.html in both trees once the task graph is done, so an
// archive written any earlier would hold the page as it was before the Gantt
// chart went in, and differ from the tree on disk.
//
// Only a build of the documentation tree into docs/_site-offline writes the
// archive. A build of any other source tree (tbdocs also builds test fixtures),
// or into another --dest (compare_trees, check_links_diff), leaves the add-in's
// archive alone, as does `--serve`, `--dry-run`, a build without an offline
// tree, and `--no-help-archive`, which CI passes. The step does not look at
// $CI: the flag is how CI turns it off.

import path from "node:path";
import { writeHelpArchive } from "../lib/help-archive.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import { GUARDED_SRC } from "./baseline.mjs";

export const HELP_ARCHIVE_REL = "add-in/Resources/HELP/site.zip";

const mb = (n) => (n / 1048576).toFixed(1);

// The offline tree the archive is made from, and the only one: Windows paths
// compare without case.
const OFFLINE_TREE = path.join(REPO_ROOT, GUARDED_SRC, "_site-offline");
const sameDir = (a, b) => path.relative(a, b) === "";

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
 * @returns {Promise<{text: string, failed: boolean}>} what to print, "" when the step did not run
 */
export async function helpArchiveStep({
  src,
  offlineRoot,
  serve,
  dryRun,
  disabled,
  out = path.join(REPO_ROOT, HELP_ARCHIVE_REL),
}) {
  if (src !== GUARDED_SRC || serve || dryRun || disabled || !offlineRoot) return { text: "", failed: false };
  if (!sameDir(path.resolve(offlineRoot), OFFLINE_TREE)) return { text: "", failed: false };
  try {
    const s = await writeHelpArchive({ src: path.resolve(offlineRoot), out });
    return {
      text: `help archive: ${HELP_ARCHIVE_REL}, ${s.entries} entries, ${mb(s.zipBytes)} MB (${(s.ms / 1000).toFixed(1)} s)\n`,
      failed: false,
    };
  } catch (err) {
    if (err.verifyFailed) {
      const shown = err.problems.slice(0, 50).map((p) => `  ${p}\n`);
      const more = err.problems.length > 50 ? `  ... and ${err.problems.length - 50} more\n` : "";
      return {
        text: `help archive: ${HELP_ARCHIVE_REL} does not match the offline tree: ${err.problems.length} problem(s)\n${shown.join("")}${more}`,
        failed: true,
      };
    }
    return { text: `help archive: not written: ${err.message}\n`, failed: true };
  }
}
