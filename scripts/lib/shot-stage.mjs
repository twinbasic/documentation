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
//
// `<slug>` is the picture's path with its folders joined by __ (slugOf, shot-apply.mjs). A
// stage may hold the Windows user name (a bundle holds the page's text), so it is refused
// under docs/ and wherever git would take it (outputRefusal).

import { deflateRawSync, inflateRawSync } from "node:zlib";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
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
  writeFileSync(file, bytes);
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

/** Every verdict in the stage `dir`, sorted by path: [{out, png, svg}]. */
export function readVerdicts(dir) {
  const folder = stageFolders(dir).verdicts;
  if (!existsSync(folder)) return [];
  return readdirSync(folder)
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(path.join(folder, name), "utf8")))
    .sort((a, b) => (a.out < b.out ? -1 : a.out > b.out ? 1 : 0));
}
