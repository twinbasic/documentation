// The help add-in's documentation archive. The add-in in add-in/ embeds the
// offline tree as a zip, add-in/Resources/HELP/site.zip, which lib/help-archive.mjs
// writes and reads back; its format and checks are there. The archive is
// gitignored, so a local build is what produces it. The add-in's project file,
// the download, carries the same bytes (addin-project.mjs).
//
// The archive is the offline tree less HELP_ARCHIVE_SKIP: what nobody looks up
// from the IDE, and the files readers download, which stay on the website. The
// pages left out are still linked from every page's navigation, from the
// search and from prose; the add-in's server answers a request for a file the
// archive lacks with a redirect to the website.
//
// The build makes the archive in four tasks (tbdocs.mjs), so that its deflating
// runs on the lanes and starts before the search index is done:
//
//   - archivePlan, once every task that writes into the offline tree but
//     searchIndex is done (planHelpArchive): it decides whether this build
//     writes the archive, refuses one that would hold a download, lists the
//     tree less LATE_FILES and deals the deflating into one group of units per
//     lane, which its submit fans out as archiveDeflate:i;
//   - archiveLate, once searchIndex has written search-index.js (planLateFiles):
//     the same for LATE_FILES, fanned out as archiveLateDeflate:i;
//   - archiveDeflate:i and archiveLateDeflate:i, on the lanes (deflateGroup);
//   - helpArchive, once every group is done (finishHelpArchive): it joins the
//     units into entries, writes the zip and reads it back.
//
// It all runs before the Gantt injection, which rewrites BuildInfo.html in both
// trees after the task graph is done and writes assets/images/gantt.svg. Both
// are left out of the archive; were they not, the archive would hold
// BuildInfo.html without the chart, and gantt.svg as the placeholder the
// offline tree copied from the sources. Two builds of one tree write the same
// archive, and the same project file with it, which the chart (it holds the
// build's timings) would prevent.
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

import { statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  checkHelpArchive,
  checkZipLimits,
  collectEntries,
  deflateUnit,
  groupUnits,
  listFiles,
  planUnits,
  writeArchive,
} from "../lib/help-archive.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import { GUARDED_SRC } from "./baseline.mjs";
import { offlineExcluded } from "./offline-rewrite.mjs";
import { OFFLINE_SEARCH_INDEX_REL } from "./search-index.mjs";

export const HELP_ARCHIVE_REL = "add-in/Resources/HELP/site.zip";

// What the archive leaves out of the offline tree: fnmatch patterns with
// PATHNAME semantics, as offline_exclude in _config.yml (`*` stays within one
// folder, `**` crosses them), against each file's path in the tree.
export const HELP_ARCHIVE_SKIP = [
  // The documentation's own development: its tools, build and authoring, and
  // BuildInfo. Its pictures are in Documentation/Images.
  "Documentation/**",
  // BuildInfo's chart.
  "assets/images/gantt.svg",
  // Links to videos, which YouTube does not let the help pane show in its
  // frame, and their poster frames, which only these pages and the
  // documentation's own show.
  "Videos.html",
  "Videos/**",
  "assets/thumbnails/**",
  // Contests that are over.
  "Challenges.html",
  "Challenges/**",
  // The files readers download: they stay on the website. Each is in a
  // `downloads` folder beside the page that documents it, and the step
  // refuses an archive that holds a file the Downloads page offers.
  "**/downloads/**",
];

/** True for a file of the offline tree (relative, forward slashes) that the archive leaves out. */
export const helpArchiveSkips = (name) => offlineExcluded(name, HELP_ARCHIVE_SKIP);

// The page that offers every file the documentation publishes for readers.
const DOWNLOADS_PAGE = "Downloads.html";

/**
 * The files of the offline tree that the Downloads page offers (a same-site
 * link with the `download` attribute) and `skip` keeps in the archive.
 *
 * @param {string} offlineRoot  the offline tree
 * @param {(name: string) => boolean} skip
 * @returns {Promise<string[]>} relative, forward slashes; empty when the tree has no Downloads page
 */
export async function downloadsKept(offlineRoot, skip) {
  let html;
  try {
    html = await readFile(path.join(offlineRoot, DOWNLOADS_PAGE), "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
  const base = new URL(`file:///tree/${DOWNLOADS_PAGE}`);
  const kept = new Set();
  for (const [tag] of html.matchAll(/<a\s[^>]*>/g)) {
    if (!/\sdownload(?:[\s>=]|$)/.test(tag)) continue;
    const href = /\shref="([^"]*)"/.exec(tag)?.[1];
    if (!href) continue;
    const url = new URL(href.replaceAll("&amp;", "&"), base);
    if (url.protocol !== "file:" || !url.pathname.startsWith("/tree/")) continue;
    const name = decodeURIComponent(url.pathname.slice("/tree/".length));
    if (!skip(name)) kept.add(name);
  }
  return [...kept].sort();
}

const mb = (n) => (n / 1048576).toFixed(1);

// The offline tree the archive is made from, and the only one: Windows paths
// compare without case.
const OFFLINE_TREE = path.join(REPO_ROOT, GUARDED_SRC, "_site-offline");
const sameDir = (a, b) => path.relative(a, b) === "";

// The files of the offline tree that a task archivePlan does not wait for
// writes: searchIndex writes search-index.js, and archivePlan does not wait
// for it, so that the rest of the tree is deflated while the index is built.
// archiveLate deflates these once their task is done. A file here that is in
// the tree when archivePlan runs is a previous build's, and is left alone.
export const LATE_FILES = [OFFLINE_SEARCH_INDEX_REL];
const isLate = (name) => LATE_FILES.includes(name);

const NOT_WRITTEN = { text: "", failed: false, zip: null, out: null };

/**
 * Where this build writes the add-in's archive, or null when it writes none.
 *
 * @param {object} o
 * @param {string} o.src          the source tree built, repo-relative with forward slashes
 * @param {string} o.offlineRoot  the offline tree this build wrote, or null when it built none
 * @param {boolean} o.serve       the build is a `--serve` session
 * @param {boolean} o.dryRun      the build wrote no trees
 * @param {boolean} o.disabled    `--no-help-archive` was given
 * @returns {string | null}
 */
export function helpArchiveOut({ src, offlineRoot, serve, dryRun, disabled }) {
  if (src !== GUARDED_SRC || serve || dryRun || disabled || !offlineRoot) return null;
  if (!sameDir(path.resolve(offlineRoot), OFFLINE_TREE)) return null;
  return path.join(REPO_ROOT, HELP_ARCHIVE_REL);
}

/**
 * The archivePlan task: the tree's files less LATE_FILES, and their deflating
 * dealt into at most `groups` groups, one archiveDeflate:i each. A plan with no
 * `out` writes nothing; its `text` and `failed` say why, when that is a fault.
 *
 * @param {object} o
 * @param {string | null} o.out   helpArchiveOut's answer
 * @param {string} o.offlineRoot  the offline tree
 * @param {number} o.groups       how many groups at most: the lanes
 * @param {(name: string) => boolean} [o.skip]  the files the archive leaves out
 */
export async function planHelpArchive({ out, offlineRoot, groups, skip = helpArchiveSkips }) {
  const started = Date.now();
  if (!out) return { ...NOT_WRITTEN, groups: [] };
  const root = path.resolve(offlineRoot);
  try {
    const kept = await downloadsKept(root, skip);
    if (kept.length > 0) {
      return {
        ...NOT_WRITTEN,
        groups: [],
        text:
          `help archive: not written: it would hold ${kept.length} file(s) the Downloads page offers, ` +
          `which stay on the website; put each in a downloads folder, or add it to HELP_ARCHIVE_SKIP:\n` +
          kept.map((k) => `  ${k}\n`).join(""),
        failed: true,
      };
    }
    const files = listFiles(root, (name) => skip(name) || isLate(name));
    checkZipLimits(files);
    return { ...NOT_WRITTEN, out, root, files, groups: groupUnits(planUnits(files), groups), started };
  } catch (err) {
    return { ...NOT_WRITTEN, groups: [], text: `help archive: not written: ${err.message}\n`, failed: true };
  }
}

/**
 * The archiveLate task: LATE_FILES, once their tasks have written them, dealt
 * as planHelpArchive deals the rest; none when the plan writes nothing.
 */
export function planLateFiles({ plan, groups, skip = helpArchiveSkips }) {
  if (!plan.out) return { files: [], groups: [] };
  try {
    const files = LATE_FILES.filter((name) => !skip(name))
      .map((name) => ({ name, file: path.join(plan.root, ...name.split("/")) }))
      .filter((f) => {
        try {
          f.size = statSync(f.file).size;
          return true;
        } catch (err) {
          if (err.code === "ENOENT") return false;
          throw err;
        }
      });
    return { files, groups: groupUnits(planUnits(files), groups) };
  } catch (err) {
    return { files: [], groups: [], error: err.message };
  }
}

/**
 * One archiveDeflate:i or archiveLateDeflate:i, on a lane: each unit of the
 * group deflated (lib/help-archive.mjs, deflateUnit). A failure comes back as
 * `{ error }` for finishHelpArchive to report, so that it fails the build
 * without stopping it: the trees are still written.
 */
export function deflateGroup({ root, units }) {
  try {
    return { results: units.map((unit) => deflateUnit(root, unit)) };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * The helpArchive task: every group's units joined into the archive's
 * entries, written to the plan's `out`, read back and checked.
 *
 * @param {object} o
 * @param {object} o.plan    archivePlan's result
 * @param {object} o.late    archiveLate's result
 * @param {object[]} o.groups  every archiveDeflate:i's and archiveLateDeflate:i's result
 * @returns {Promise<{text: string, failed: boolean, zip: Buffer | null, out: string | null}>} what to
 *   print, "" when the step did not run; the archive's bytes and path, null when this build wrote none
 */
export async function finishHelpArchive({ plan, late, groups }) {
  if (!plan.out) return { text: plan.text, failed: plan.failed, zip: null, out: null };
  try {
    if (late.error) throw new Error(late.error);
    const failed = groups.find((g) => g.error);
    if (failed) throw new Error(failed.error);
    const files = [...plan.files, ...late.files].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    const entries = collectEntries(
      files,
      groups.flatMap((g) => g.results),
    );
    const s = await writeArchive({ out: plan.out, files, entries });
    const secs = ((Date.now() - plan.started) / 1000).toFixed(1);
    return {
      text: `help archive: ${HELP_ARCHIVE_REL}, ${s.entries} entries, ${mb(s.zipBytes)} MB (${secs} s)\n`,
      failed: false,
      zip: s.zip,
      out: plan.out,
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
    problems = await checkHelpArchive({
      src: path.resolve(offlineRoot),
      zip: archive.out,
      mayDiffer,
      skip: helpArchiveSkips,
    });
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
