// The page-count drift guard: does this build publish fewer pages than the
// last build anyone committed?
//
// It replaces `if (pages.length < 836)` in tbdocs.mjs, a constant written when
// the site had 836 pages and never touched again. By the time anyone measured,
// the site had 908, so the guard was carrying a 72-page margin -- and the
// failure it exists to catch was a 37-page loss. `_config.yml`'s `exclude:`
// once held a blanket `**/_*/**` rule that swallowed the whole `_App/` folder
// of AppGlobalClassObject; 37 pages stopped being published and nothing said
// so. Repeat that today and the count lands at 871, comfortably above 836, and
// the guard stays silent through the whole thing. A floor is not a drift
// check.
//
// Raising the constant to a tight floor is not the fix either: it would then
// fire on every legitimate page removal, and a gate that fires on ordinary work
// gets switched off. What is needed is a figure that moves with the tree, which
// means a committed artifact rather than a literal -- the same shape as
// builder/inter-metrics.json, and what PLAN-counts.md predicts this would need.
//
// So:
//
//   count >= baseline   the baseline is rewritten, and the changed file turns
//                       up in `git status` to be committed alongside whatever
//                       added the pages
//   count <  baseline   the build fails and names the shortfall
//
// A rise is never a fault, so accepting one costs nothing. A fall always is,
// even when it is intended -- "intended" is exactly what a discover regression
// looks like from inside the build, which is the whole reason the `_App` loss
// went unnoticed. Accepting a real removal is one flagged run, which puts the
// lowered number in the same commit as the deletion that caused it.
//
// Two restrictions on the write, both deliberate:
//
//   - **CI never writes.** A CI run that rewrote the baseline would bless the
//     drop it was asked to catch. It compares, and an absent file is a failure
//     there rather than a bootstrap: the guard's own artifact going missing is
//     a regression of the guard.
//   - **`--serve` never writes.** Its watcher rebuilds on every save under
//     `docs/`, so a page half-deleted in an editor would ratchet the baseline
//     down and a half-added one would ratchet it up. The comparison still runs,
//     so the console still says what happened.
//
// staticFiles is guarded the same way and for the same reason: it is the other
// half of the publish surface, and an image tree that stops being copied is as
// silent as a page tree that stops being discovered.
//
// **The baseline describes one source tree, and the guard says which.** tbdocs
// is not only run over `docs/`: scripts/check_links_diff.mjs spawns it over
// test/fixtures/check-src, three pages, to compare the two link checkers. A
// baseline keyed to nothing would meet that build with "905 pages missing" --
// a loud, confident, entirely wrong finding, on a harness whose whole job is to
// notice when two implementations disagree. So GUARDED_SRC names the tree these
// numbers are of, the file records it, and every other source root is skipped
// in silence rather than measured against figures that were never about it.

import { readFile, writeFile } from "node:fs/promises";

export const BASELINE_PATH = new URL("./page-baseline.json", import.meta.url);

// Repo-relative, forward slashes. The documentation site is the only tree this
// guard has numbers for.
export const GUARDED_SRC = "docs";

// Shown in the failure message. Relative, because that is how someone runs it.
const ACCEPT_CMD = "node builder/tbdocs.mjs --src docs --update-page-baseline";

const METRICS = [
  ["pages", "pages"],
  ["staticFiles", "static files"],
];

async function readBaseline(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

async function writeBaseline(file, counts) {
  // Trailing newline and two-space indent so a diff of this file reads as one
  // changed line per metric rather than as a rewritten blob.
  await writeFile(file, `${JSON.stringify(counts, null, 2)}\n`, "utf8");
}

/**
 * Compare this build's inventory against the committed baseline.
 *
 * @param {object} o
 * @param {string} o.src          this build's source root, repo-relative with
 *                                forward slashes; anything but GUARDED_SRC is
 *                                skipped outright
 * @param {number} o.pages        this build's page count
 * @param {number} o.staticFiles  this build's static-file count
 * @param {boolean} o.write       may the baseline be rewritten? (false under
 *                                CI, --serve and --dry-run)
 * @param {boolean} o.force       write whatever the counts are, up or down
 *                                (--update-page-baseline)
 * @param {URL|string} [o.file]   the baseline to read and write. Only
 *                                check_page_baseline.mjs passes it; the seam
 *                                exists so the probes can exercise every path
 *                                without touching the committed file.
 * @returns {Promise<{failed: boolean, text: string}>}
 */
export async function checkPageBaseline({
  src, pages, staticFiles, write, force = false, file = BASELINE_PATH,
}) {
  if (src !== GUARDED_SRC) return { failed: false, text: "" };

  const counts = { src, pages, staticFiles };
  const baseline = await readBaseline(file);

  if (force) {
    await writeBaseline(file, counts);
    const was = baseline
      ? METRICS.map(([k, label]) => `${label} ${baseline[k]} -> ${counts[k]}`).join(", ")
      : METRICS.map(([k, label]) => `${label} ${counts[k]}`).join(", ");
    return { failed: false, text: `page baseline updated: ${was}\n` };
  }

  if (!baseline) {
    if (!write) {
      return {
        failed: true,
        text: "ERROR: builder/page-baseline.json is missing, so the page-count "
            + "drift guard has nothing to compare against.\n"
            + `       Restore it from git, or regenerate it with:\n         ${ACCEPT_CMD}\n`,
      };
    }
    await writeBaseline(file, counts);
    return {
      failed: false,
      text: `page baseline created: ${METRICS.map(([k, l]) => `${l} ${counts[k]}`).join(", ")}\n`,
    };
  }

  const dropped = METRICS
    .filter(([k]) => Number.isFinite(baseline[k]) && counts[k] < baseline[k])
    .map(([k, label]) => `${label} ${counts[k]}, was ${baseline[k]} (${counts[k] - baseline[k]})`);

  if (dropped.length) {
    return {
      failed: true,
      text: `ERROR: fewer than the last committed build -- ${dropped.join("; ")}\n`
          + "       Something stopped being discovered, or content was removed on purpose.\n"
          + `       If the removal is intended, record it in the same commit:\n         ${ACCEPT_CMD}\n`,
    };
  }

  const risen = METRICS.filter(([k]) => counts[k] > (baseline[k] ?? -1));
  if (risen.length && write) {
    await writeBaseline(file, counts);
    const moved = risen
      .map(([k, label]) => `${label} ${baseline[k] ?? "-"} -> ${counts[k]}`)
      .join(", ");
    return { failed: false, text: `page baseline raised: ${moved} (commit builder/page-baseline.json)\n` };
  }

  return { failed: false, text: "" };
}
