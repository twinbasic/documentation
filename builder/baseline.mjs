// The drift guard builder/page-baseline.mjs and builder/symbol-baseline.mjs
// share. A committed JSON file records what the last build of the
// documentation published, and each build compares what it publishes with it:
//
//   something lost     the build fails and names it
//   something gained   the file is rewritten, and the changed file turns up in
//                      `git status` to be committed with what gained it
//
// A loss fails the build even when it is meant; accepting one is a flagged
// run, `--update-<name>-baseline`, which puts the file in the same commit as
// the change. Each guard's module says why its figures are guarded, and gives
// checkBaseline what to compare.
//
// Two restrictions on the write, both deliberate:
//
//   - **CI never writes.** A CI run that rewrote a baseline would bless the
//     loss it was asked to catch. It compares, and an absent file is a failure
//     there rather than a bootstrap: the guard's own artifact going missing is
//     a regression of the guard.
//   - **`--serve` never writes.** Its watcher rebuilds on every save under
//     `docs/`, so a page half-deleted in an editor would ratchet a baseline
//     down and a half-added one would ratchet it up. The comparison still
//     runs, so the console still says what happened.
//
// **A baseline describes one source tree, and the guard says which.** tbdocs
// is not only run over `docs/`: scripts/check_links_diff.mjs spawns it over
// test/fixtures/check-src, three pages, to compare the link check's two front
// ends. A baseline keyed to nothing would meet that build with "905 pages
// missing" -- a loud, confident, entirely wrong finding, on a harness whose
// whole job is to notice when two front ends disagree. So GUARDED_SRC names
// the tree the figures are of, each file records it, and every other source
// root is skipped in silence rather than measured against figures that were
// never about it.

import { readFile, writeFile } from "node:fs/promises";

// Repo-relative, forward slashes. The documentation site is the only tree the
// guards have figures for.
export const GUARDED_SRC = "docs";

async function readBaseline(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

// Two-space indent, one value to a line and a trailing newline, so a diff of
// the file reads as the figures or URLs that changed rather than as a
// rewritten blob.
async function writeBaseline(file, record) {
  await writeFile(file, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

// The commands that accept a loss, as a failure gives them. Relative, because
// that is how someone runs them. `--check-audit-index` is part of the command:
// it implies `--check`, and build.bat passes it on every build, so the bare
// `--src docs` form would hand the reader a build with no link or integrity
// check, on the change most likely to have broken links. Both forms are given
// because the wrapper is Windows-only and the docs are not.
function acceptCommands(name) {
  return `         build.bat --update-${name}-baseline\n`
    + `         node builder/tbdocs.mjs --src ${GUARDED_SRC} --check-audit-index --update-${name}-baseline\n`;
}

/**
 * Compare this build's record with the committed baseline.
 *
 * @param {object} guard  what is compared, and the words for it
 * @param {string} guard.name  "page" or "symbol": the file is
 *        builder/<name>-baseline.json, and --update-<name>-baseline accepts a loss
 * @param {string} guard.missing  the rest of the sentence that says the file
 *        is missing: what goes unchecked without it
 * @param {(record: object) => string} guard.created  the figures a new file holds
 * @param {(baseline: object|null, record: object) => string} guard.updated
 *        what a forced write changed; `baseline` is null when there was none
 * @param {(baseline: object, record: object) => string} guard.lost  the
 *        failure's text, up to the commands, or "" when nothing is lost
 * @param {(baseline: object, record: object) => string} guard.gained  what was
 *        gained, or "" when nothing was
 * @param {object} o
 * @param {object} o.record  what this build publishes, as the file holds it;
 *        its `src` is this build's source root, repo-relative with forward
 *        slashes, and anything but GUARDED_SRC is skipped
 * @param {boolean} o.write  may the file be rewritten? (false under CI,
 *        --serve and --dry-run)
 * @param {boolean} [o.force]  write it whatever changed (--update-<name>-baseline)
 * @param {URL|string} o.file  the file to read and write
 * @returns {Promise<{failed: boolean, text: string}>}
 */
export async function checkBaseline(guard, { record, write, force = false, file }) {
  if (record.src !== GUARDED_SRC) return { failed: false, text: "" };
  const baseline = await readBaseline(file);

  if (force) {
    await writeBaseline(file, record);
    return { failed: false, text: `${guard.name} baseline updated: ${guard.updated(baseline, record)}\n` };
  }

  if (!baseline) {
    if (!write) {
      return {
        failed: true,
        text: `ERROR: builder/${guard.name}-baseline.json is missing, ${guard.missing}`
            + "       Restore it from git, or regenerate it with:\n"
            + acceptCommands(guard.name),
      };
    }
    await writeBaseline(file, record);
    return { failed: false, text: `${guard.name} baseline created: ${guard.created(record)}\n` };
  }

  const lost = guard.lost(baseline, record);
  if (lost) return { failed: true, text: lost + acceptCommands(guard.name) };

  const gained = guard.gained(baseline, record);
  if (gained && write) {
    await writeBaseline(file, record);
    return {
      failed: false,
      text: `${guard.name} baseline raised: ${gained} (commit builder/${guard.name}-baseline.json)\n`,
    };
  }
  return { failed: false, text: "" };
}
