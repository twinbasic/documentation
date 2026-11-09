// A run's stage (WIP.ShotReview.md, Runs). With --stage, shoot_docs.mjs and replay.mjs write
// nothing under docs/, nothing to the bundle cache and nothing to the manifest: each
// candidate goes into the stage instead, with what was decided about it, and the screenshot
// review tool applies the verdicts (shot-apply.mjs), so that it is the only writer under
// docs/. A stage is a folder of its own for one run:
//
//   pictures/<out>             the capture, at its path under docs/ (X.png, X.light.png)
//   pictures/<X.svg>           its SVG, written whether it was found faithful or not
//   bundles/                   the bundles, laid out as the bundle cache is (bundle.mjs)
//   diffs/                     the difference pictures, named as --diffs names them
//   maps/<slug>.png.strength   the strength map of the capture against the picture it was
//                              judged against (reviewPicture), and of the SVG against its
//   maps/<slug>.svg.strength   PNG (diffSvg): see writeStrength
//   verdicts/<slug>.json       what was decided, {out, png, svg}: each part as the run's
//                              event about it carries it (shoot_docs.mjs, replay.mjs)
//   review/verdicts/<slug>.json  the review tool's own: the verdict as it applied it under
//                              docs/ (shot-verdicts.mjs), {out, png, svg, done}, each part
//                              judged again when a review decided otherwise or changed an
//                              allowance, and `done` the parts applied
//   review/maps/<slug>.png.strength  the capture's strength map measured again, when a
//                              verdict judged again names another picture to measure against
//
// `<slug>` is the picture's path with its folders joined by __ (slugOf, shot-apply.mjs). A
// stage may hold the Windows user name (a bundle holds the page's text), so it is refused
// under docs/ and wherever git would take it (outputRefusal).

import { deflateRawSync, inflateRawSync } from "node:zlib";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { slugOf, svgOf } from "./shot-apply.mjs";
import { outputRefusal } from "./shot-revision.mjs";

/** The folders of the stage `dir`. */
export const stageFolders = (dir) => ({
  pictures: path.join(dir, "pictures"),
  bundles: path.join(dir, "bundles"),
  diffs: path.join(dir, "diffs"),
  maps: path.join(dir, "maps"),
  verdicts: path.join(dir, "verdicts"),
});

/**
 * The files of the picture `out` (its path under docs/) in the stage `dir`: {capture, svg,
 * pngStrength, svgStrength, verdict}, absolute.
 */
export function stagedFiles(dir, out) {
  const f = stageFolders(dir);
  const s = slugOf(out);
  return {
    capture: path.join(f.pictures, out),
    svg: path.join(f.pictures, svgOf(out)),
    pngStrength: path.join(f.maps, `${s}.png.strength`),
    svgStrength: path.join(f.maps, `${s}.svg.strength`),
    verdict: path.join(f.verdicts, `${s}.json`),
  };
}

/**
 * Why `dir` may not be a stage, or null: under one of `docsRoots` or where git would take
 * it (outputRefusal), or a file, or a folder that holds anything: a stage is one run's.
 */
export function stageRefusal(dir, docsRoots) {
  const refused = outputRefusal(dir, docsRoots);
  if (refused) return refused;
  if (!existsSync(dir)) return null;
  if (!statSync(dir).isDirectory()) return `${path.resolve(dir)} is a file`;
  if (readdirSync(dir).length) return `${path.resolve(dir)} is not empty: a stage is one run's`;
  return null;
}

/** Writes `bytes` (a Buffer or text) to `file`, making its folder. */
export function writeStaged(file, bytes) {
  mkdirSync(path.dirname(file), { recursive: true });
  // Written whole and renamed into place: the review tool reads a verdict as its event
  // arrives, while the run may be writing the file again with its other part, and a file
  // written in place is empty for a moment.
  const temp = `${file}.${process.pid}.tmp`;
  writeFileSync(temp, bytes);
  for (let tries = 0; ; tries++) {
    try {
      renameSync(temp, file);
      return;
    } catch (e) {
      // a reader holding the file open on Windows: wait a moment and try again
      if (tries >= 50 || !["EPERM", "EACCES", "EBUSY"].includes(e.code)) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    }
  }
}

// A staged file's path as a verdict names it: relative to the stage, with forward slashes.
const named = (dir, file) => path.relative(dir, file).replace(/\\/g, "/");

/**
 * Puts a capture of the picture `out` into the stage `dir`, with its strength map against
 * the picture it was judged against when there is one (reviewPicture). Returns the names of
 * the files written, {capture, strength}, `strength` null when there is no map.
 */
export function stageCapture(dir, out, png, strength) {
  const files = stagedFiles(dir, out);
  writeStaged(files.capture, png);
  if (strength) writeStrength(files.pngStrength, strength);
  return { capture: named(dir, files.capture), strength: strength ? named(dir, files.pngStrength) : null };
}

/**
 * Puts the SVG of the picture `out` into the stage `dir`, with its strength map against its
 * PNG (diffSvg), whether or not it was found faithful. Returns the names of the files
 * written, {svg, strength}.
 */
export function stageSvg(dir, out, svg, strength) {
  const files = stagedFiles(dir, out);
  writeStaged(files.svg, svg);
  writeStrength(files.svgStrength, strength);
  return { svg: named(dir, files.svg), strength: named(dir, files.svgStrength) };
}

/**
 * The most regions a verdict lists, the largest cores first: the loupes show the first few,
 * and a change over a whole window can make thousands. The rest are in the strength map.
 */
export const STAGED_REGIONS = 64;

// A verdict's regions: the first STAGED_REGIONS, and how many there are (null for none measured).
const regionsOf = (regions) =>
  regions
    ? { regions: regions.slice(0, STAGED_REGIONS), regionCount: regions.length }
    : { regions: null, regionCount: null };

/**
 * The png part of a verdict, as a --stage file and an --events record carry it: what
 * decidePicture decided (`decision`, its `write` left out), the regions and the look
 * reviewPicture found (`review`), the build the capture was taken on, the difference
 * pictures written (their names in the diffs folder), and the files staged (stageCapture),
 * or null.
 */
export function pngVerdict({ decision, review, build, diffs = [], staged = null }) {
  const { write, ...rest } = decision;
  return {
    ...rest,
    writes: write !== null && write !== undefined,
    build,
    look: review?.look ?? null,
    ...regionsOf(review?.regions ?? null),
    diffs,
    ...(staged ?? {}),
  };
}

/** Why a picture of program windows has no SVG: the converter draws a page's DOM snapshot. */
export const WINDOW_WHY = "a program's window, which Windows draws: there is no page to draw an SVG from";

/**
 * The svg part of a verdict: `state` what is done with the file (applySvg's, or "unchanged"
 * when it stays with its PNG), `why` the reason it is not written, or null; `verdict`
 * decideSvg's and `review` reviewSvg's, null for an SVG not judged; `stats` diffSvg's
 * shares (pct8, pct32, pct96); `measures` the line a person reads; `diffs` the difference
 * pictures written; and the files staged (stageSvg), or null. `window` marks a picture of
 * program windows (`window: true`), of which no SVG is drawn (WINDOW_WHY). `same` says the SVG
 * drawn is the same picture as one already there (keep.mjs's sameSvgAs): {as: "baseline",
 * baseline} the revision's, by its hash, whose bytes the file is to hold (state "restored"), or
 * {as: "file", file} the file's, by the hash of its text (shot-manifest.mjs's hashOf), which
 * stays; the review tool applies it only while that is still so.
 */
export function svgVerdict({
  state,
  why = null,
  verdict = null,
  review = null,
  stats = null,
  measures = null,
  diffs = [],
  staged = null,
  window = false,
  same = null,
}) {
  return {
    state,
    why,
    ...(window ? { window: true } : {}),
    ...(same ? { same } : {}),
    faithful: verdict?.faithful ?? null,
    by: verdict?.by ?? null,
    share: verdict?.share ?? null,
    earlier: verdict?.earlier ?? null,
    stats: stats && { pct8: stats.pct8, pct32: stats.pct32, pct96: stats.pct96 },
    measures,
    look: review?.look ?? null,
    ...regionsOf(review?.regions ?? null),
    diffs,
    ...(staged ?? {}),
  };
}

/**
 * Writes a strength map ({width, height, data}, a byte per pixel: shot-change.mjs) to
 * `file`: its width and height, 4 bytes each, big-endian, then its bytes, deflated. Most of
 * a map is 0, so it comes to a few kilobytes.
 */
export function writeStrength(file, { width, height, data }) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(width, 0);
  head.writeUInt32BE(height, 4);
  writeStaged(file, Buffer.concat([head, deflateRawSync(data)]));
}

/** The strength map writeStrength wrote to `file`. Throws when it is not one. */
export function readStrength(file) {
  const bytes = readFileSync(file);
  const width = bytes.readUInt32BE(0);
  const height = bytes.readUInt32BE(4);
  const data = new Uint8Array(inflateRawSync(bytes.subarray(8)));
  if (data.length !== width * height) throw new Error(`${file} holds ${data.length} bytes, not ${width} by ${height}`);
  return { width, height, data };
}

/**
 * Sets the part `part` ("png" or "svg") of the verdict on the picture `out` in the stage
 * `dir` to `value`, keeping the other part, and returns the whole verdict, {out, png, svg}.
 * The jobs of a run share one process, and each write is synchronous.
 */
export function writeVerdict(dir, out, part, value) {
  const file = stagedFiles(dir, out).verdict;
  const verdict = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { out, png: null, svg: null };
  verdict[part] = value;
  writeStaged(file, `${JSON.stringify(verdict, null, 2)}\n`);
  return verdict;
}

/**
 * The verdict on the picture `out` in the stage `dir`, as the run wrote it ({out, png, svg}),
 * or null.
 */
export function readVerdict(dir, out) {
  const file = stagedFiles(dir, out).verdict;
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}

/**
 * The review tool's files of the picture `out` in the stage `dir`: {verdict, pngStrength},
 * absolute, and `pngStrengthName`, the map's name as a verdict names it.
 */
export function reviewedFiles(dir, out) {
  const s = slugOf(out);
  const pngStrength = path.join(dir, "review", "maps", `${s}.png.strength`);
  return {
    verdict: path.join(dir, "review", "verdicts", `${s}.json`),
    pngStrength,
    pngStrengthName: named(dir, pngStrength),
  };
}

/** The verdict the review tool applied on the picture `out` ({out, png, svg, done}), or null. */
export function readReviewed(dir, out) {
  const file = reviewedFiles(dir, out).verdict;
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}

/** Writes the verdict the review tool applied on a picture, {out, png, svg, done}. */
export function writeReviewed(dir, verdict) {
  writeStaged(reviewedFiles(dir, verdict.out).verdict, `${JSON.stringify(verdict, null, 2)}\n`);
}

/** Every verdict in the stage `dir`, sorted by path: [{out, png, svg}]. */
export function readVerdicts(dir) {
  const folder = stageFolders(dir).verdicts;
  if (!existsSync(folder)) return [];
  return readdirSync(folder)
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(path.join(folder, name), "utf8")))
    .sort((a, b) => (a.out < b.out ? -1 : a.out > b.out ? 1 : 0));
}
