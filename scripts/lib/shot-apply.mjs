// Writing what was decided about a picture and its SVG (shot-policy.mjs) into the folder the
// pictures are in: the one place shoot_docs.mjs, its --cleanup, replay.mjs and the screenshot
// review tool write a picture, an SVG or a bundle from, so that each writes the same files
// for the same verdict. Paths are under `outRoot` with forward slashes, as a shot's `out`.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { dropBundle } from "../svgshot/bundle.mjs";
import { restoreFromRevision, svgFate } from "./shot-revision.mjs";

/** The SVG beside the picture `out`. */
export const svgOf = (out) => out.replace(/\.png$/i, ".svg");

/**
 * A picture's name in a flat folder: its path under docs/ with the folders joined by
 * `__` and no `.png` (IDE__Menu__Images__Menu_File.light), as shoot_docs.mjs --diffs
 * and replay.mjs --diffs name their files, and a stage its maps and verdicts (shot-stage.mjs).
 */
export const slugOf = (out) => out.replace(/[\\/]/g, "__").replace(/\.png$/i, "");

/**
 * Writes `svg` to `file` unless it holds it already: "new", "updated" or
 * "unchanged". The file may have been checked out with CRLF line endings, on its
 * last line alone (the SVG is on one line, oneLine in snapshot-svg.mjs).
 */
export function writeSvg(file, svg) {
  let state = "new";
  if (existsSync(file)) state = readFileSync(file, "utf8").replace(/\r\n/g, "\n") === svg ? "unchanged" : "updated";
  if (state !== "unchanged") writeFileSync(file, svg);
  return state;
}

/**
 * Puts the pictures `outs` back as `revision` (openRevision) has them, each with its SVG:
 * the revision's SVG goes in its place, or the file's is removed when the revision has none
 * (svgFate), so that the pair stays matched. The SVGs are written by git, as a checkout
 * writes them (line endings), in one process. With `dryRun` nothing is written. Returns a
 * Map from each picture to {fate, atRevision}: svgFate's answer, and whether the revision
 * has an SVG. Throws when the revision lacks a picture or git cannot write the SVGs.
 */
export function restorePictures(outRoot, revision, outs, { dryRun = false } = {}) {
  const pngs = revision.read(outs);
  const svgs = revision.read(outs.map(svgOf));
  const fates = new Map();
  const writes = [];
  for (const out of outs) {
    const svgOut = svgOf(out);
    const svgFile = path.join(outRoot, svgOut);
    const atRevision = svgs.get(svgOut);
    const fate = svgFate(atRevision, existsSync(svgFile) ? readFileSync(svgFile) : null);
    fates.set(out, { fate, atRevision: !!atRevision });
    if (dryRun) continue;
    const png = pngs.get(out);
    if (!png) throw new Error(`${revision.short} has no ${out}`);
    const file = path.join(outRoot, out);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, png);
    if (fate === "write") writes.push(svgOut);
    if (fate === "remove") rmSync(svgFile);
  }
  try {
    restoreFromRevision(outRoot, revision.hash, writes);
  } catch (e) {
    throw new Error(`git could not put the SVGs back: ${e.message}`);
  }
  return fates;
}

/**
 * Writes the verdict on a capture of the picture `out` (decidePicture): the bytes the file is
 * to hold, if any; for "dark", the light file removed; for "restored", the picture and its SVG
 * put back as `revision` has them (restorePictures). Returns {removed, svg}: whether a file
 * was removed, and for "restored" restorePictures' answer for the picture, else null.
 */
export function applyPicture(outRoot, out, decision, revision) {
  const file = path.join(outRoot, out);
  if (decision.state === "dark") {
    const had = existsSync(file);
    if (had) rmSync(file);
    return { removed: had, svg: null };
  }
  if (decision.state === "restored") return { removed: false, svg: restorePictures(outRoot, revision, [out]).get(out) };
  if (decision.write) {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, decision.write);
  }
  return { removed: false, svg: null };
}

/**
 * Writes the SVG of a picture (`svgOut` its path) when it was found faithful, or removes the
 * one there when it was not (`svg` null): writeSvg's state, else "removed" or "not written".
 */
export function applySvg(outRoot, svgOut, svg) {
  const file = path.join(outRoot, svgOut);
  if (svg !== null) return writeSvg(file, svg);
  if (!existsSync(file)) return "not written";
  rmSync(file);
  return "removed";
}

/**
 * Removes the picture `out`, its SVG and, when there is a bundle cache (`bundlesRoot`), its
 * bundle. Returns whether the picture's file was there.
 */
export function dropPicture(outRoot, out, bundlesRoot) {
  const svg = path.join(outRoot, svgOf(out));
  if (existsSync(svg)) rmSync(svg);
  if (bundlesRoot) dropBundle(bundlesRoot, out);
  const file = path.join(outRoot, out);
  if (!existsSync(file)) return false;
  rmSync(file);
  return true;
}
