// The page-count drift guard: does this build publish fewer pages than the
// last build anyone committed?
//
// A fixed constant floor is not a drift check: the site outgrows it, leaving a
// wide margin, and a blanket `exclude:` rule that swallows a whole folder of
// pages (the `_App/` folder of AppGlobalClassObject is the example) drops the
// count well above the floor, so the guard stays silent through the whole
// thing.
//
// A tight constant floor is not the fix either: it would fire on every
// legitimate page removal, and a gate that fires on ordinary work gets
// switched off. What is needed is a figure that moves with the tree, which
// means a committed artifact rather than a literal -- the same shape as
// builder/inter-metrics.json.
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
// looks like from inside the build, which is why a loss like `_App` goes
// unnoticed. Accepting a real removal is one flagged run, which puts the
// lowered number in the same commit as the deletion that caused it.
//
// staticFiles is guarded the same way and for the same reason: it is the other
// half of the publish surface, and an image tree that stops being copied is as
// silent as a page tree that stops being discovered.
//
// builder/baseline.mjs holds the read, the write and the comparison, which the
// symbol index's guard shares, and says when the file is written and for which
// source tree.

import { checkBaseline } from "./baseline.mjs";

export const BASELINE_PATH = new URL("./page-baseline.json", import.meta.url);

const METRICS = [
  ["pages", "pages"],
  ["staticFiles", "static files"],
];

const figures = (record) => METRICS.map(([k, label]) => `${label} ${record[k]}`).join(", ");

const PAGE_GUARD = {
  name: "page",
  missing: "so the page-count drift guard has nothing to compare against.\n",
  created: figures,
  updated: (baseline, record) =>
    baseline ? METRICS.map(([k, label]) => `${label} ${baseline[k]} -> ${record[k]}`).join(", ") : figures(record),
  lost(baseline, record) {
    const dropped = METRICS.filter(([k]) => Number.isFinite(baseline[k]) && record[k] < baseline[k]).map(
      ([k, label]) => `${label} ${record[k]}, was ${baseline[k]} (${record[k] - baseline[k]})`,
    );
    if (!dropped.length) return "";
    return (
      `ERROR: fewer than the last committed build -- ${dropped.join("; ")}\n` +
      "       Something stopped being discovered, or content was removed on purpose.\n" +
      "       If the removal is intended, record it in the same commit:\n"
    );
  },
  gained: (baseline, record) =>
    METRICS.filter(([k]) => record[k] > (baseline[k] ?? -1))
      .map(([k, label]) => `${label} ${baseline[k] ?? "-"} -> ${record[k]}`)
      .join(", "),
};

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
export async function checkPageBaseline({ src, pages, staticFiles, write, force = false, file = BASELINE_PATH }) {
  return checkBaseline(PAGE_GUARD, { record: { src, pages, staticFiles }, write, force, file });
}
