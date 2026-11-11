// Writing what was decided about a picture and its SVG (shot-policy.mjs) into the folder the
// pictures are in: the one place shoot_docs.mjs, its --cleanup, replay.mjs and the screenshot
// review tool write a picture, an SVG or a bundle from, so that each writes the same files
// for the same verdict. Paths are under `outRoot` with forward slashes, as a shot's `out`.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { copyBundle, dropBundle } from "../svgshot/bundle.mjs";
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
 * last line alone (the SVG is on one line, oneLine in snapshot-svg.mjs). With `dryRun`
 * nothing is written, and the state is what would be.
 */
export function writeSvg(file, svg, { dryRun = false } = {}) {
  let state = "new";
  if (existsSync(file)) state = readFileSync(file, "utf8").replace(/\r\n/g, "\n") === svg ? "unchanged" : "updated";
  if (state !== "unchanged" && !dryRun) writeFileSync(file, svg);
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
 * to hold, if any; for "dark" and "once", the light file removed, and its SVG and its bundle
 * under `bundlesRoot` (dropPicture), for "dark" only with `svg`; for "restored", the picture and its SVG put
 * back as `revision` has them (restorePictures). Returns {removed, svg}: whether the picture's
 * file was removed, and for "restored" restorePictures' answer for the picture, else null.
 * With `dryRun` nothing is written, and the answer is what would be done (a run's stage,
 * shot-stage.mjs, whose verdicts the review tool applies).
 */
export function applyPicture(
  outRoot,
  out,
  decision,
  revision,
  { dryRun = false, svg = false, bundlesRoot = null } = {},
) {
  const file = path.join(outRoot, out);
  if (decision.state === "dark" || decision.state === "once") {
    if (svg || decision.state === "once")
      return { removed: dropPicture(outRoot, out, bundlesRoot, { dryRun }), svg: null };
    const had = existsSync(file);
    if (had && !dryRun) rmSync(file);
    return { removed: had, svg: null };
  }
  if (decision.state === "restored")
    return { removed: false, svg: restorePictures(outRoot, revision, [out], { dryRun }).get(out) };
  if (decision.write && !dryRun) {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, decision.write);
  }
  return { removed: false, svg: null };
}

/**
 * Writes the SVG of a picture (`svgOut` its path) when it was found faithful, or removes the
 * one there when it was not (`svg` null): writeSvg's state, else "removed" or "not written".
 * With `dryRun` nothing is written, and the state is what would be.
 */
export function applySvg(outRoot, svgOut, svg, { dryRun = false } = {}) {
  const file = path.join(outRoot, svgOut);
  if (svg !== null) return writeSvg(file, svg, { dryRun });
  if (!existsSync(file)) return "not written";
  if (!dryRun) rmSync(file);
  return "removed";
}

/**
 * Puts the SVG `svgOut` back as `revision` (openRevision) has it, through git, as a checkout
 * writes it: an SVG that draws the same pixels as the revision's (keep.mjs's sameSvgAs).
 * "restored", or "unchanged" when the file holds the revision's text already (line endings
 * aside). With `dryRun` nothing is written, and the state is what would be. Throws when the
 * revision has no such SVG.
 */
export function restoreSvg(outRoot, revision, svgOut, { dryRun = false } = {}) {
  const atRevision = revision.bytes(svgOut);
  if (!atRevision) throw new Error(`${revision.short} has no ${svgOut}`);
  const file = path.join(outRoot, svgOut);
  const lf = (bytes) => bytes.toString("utf8").replace(/\r\n/g, "\n");
  if (existsSync(file) && lf(readFileSync(file)) === lf(atRevision)) return "unchanged";
  if (!dryRun) restoreFromRevision(outRoot, revision.hash, [svgOut]);
  return "restored";
}

// ---- what a picture held before a verdict was applied --------------------------------
//
// The screenshot review tool applies a run's verdicts as they arrive, and a review may then
// decide otherwise: it puts the picture back as it was before the run's verdict and applies
// the verdict decided. So before it applies a run's verdict on a picture it keeps what the
// picture held, in a folder of the run's (`dir`):
//
//   <slug>.json          {out, png, svg, bundle, build, scale}: whether each was there, and the
//                        build and scale the manifest recorded for the file (null for none; a
//                        record from before scales were recorded has no `scale`)
//   files/<out>          the PNG, and files/<X.svg> its SVG, when there
//   bundles/             its bundle, laid out as the bundle cache is (bundle.mjs)

const heldFiles = (dir, out) => ({
  record: path.join(dir, `${slugOf(out)}.json`),
  png: path.join(dir, "files", out),
  svg: path.join(dir, "files", svgOf(out)),
  bundles: path.join(dir, "bundles"),
});

/** What `dir` keeps of the picture `out` (holdPicture), or null when it keeps nothing. */
export function heldOf(dir, out) {
  const f = heldFiles(dir, out);
  if (!existsSync(f.record)) return null;
  const held = JSON.parse(readFileSync(f.record, "utf8"));
  return {
    ...held,
    pngBytes: held.png ? readFileSync(f.png) : null,
    svgText: held.svg ? readFileSync(f.svg, "utf8") : null,
  };
}

/** The pictures `dir` keeps anything of (holdPicture), sorted. */
export function heldPictures(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(path.join(dir, name), "utf8")).out)
    .sort();
}

/**
 * Keeps in `dir` what the picture `out` under `outRoot` holds now: its PNG, its SVG, its
 * bundle under `bundlesRoot` (or none), and `build` and `scale`, the build and the scale the
 * manifest records for it. What `dir` kept of it before is replaced.
 */
export function holdPicture(dir, outRoot, out, bundlesRoot, build, scale = null) {
  const f = heldFiles(dir, out);
  const keep = (from, to) => {
    if (!existsSync(from)) {
      rmSync(to, { force: true });
      return false;
    }
    mkdirSync(path.dirname(to), { recursive: true });
    writeFileSync(to, readFileSync(from));
    return true;
  };
  const png = keep(path.join(outRoot, out), f.png);
  const svg = keep(path.join(outRoot, svgOf(out)), f.svg);
  const bundle = bundlesRoot ? copyBundle(bundlesRoot, f.bundles, out) : false;
  mkdirSync(dir, { recursive: true });
  writeFileSync(f.record, `${JSON.stringify({ out, png, svg, bundle, build: build ?? null, scale: scale ?? null })}\n`);
}

/**
 * The scale the manifest recorded for the picture `out` when `dir` kept it (holdPicture): a
 * number, null for none (SHOT_SCALE), or undefined when `dir` keeps nothing of it or kept it
 * before scales were recorded.
 */
export function heldScale(dir, out) {
  const f = heldFiles(dir, out);
  if (!existsSync(f.record)) return undefined;
  return JSON.parse(readFileSync(f.record, "utf8")).scale;
}

/**
 * Replaces one file of what `dir` keeps of the picture `out` (holdPicture): `part` "png" or
 * "svg", `bytes` what the picture held, or null when it held no such file. Used when a file
 * changed outside the session's runs is put back as the baseline has it: the layer that found
 * it then finds the baseline's. Returns false, and changes nothing, when `dir` keeps nothing of
 * the picture.
 */
export function setHeldPart(dir, out, part, bytes) {
  const f = heldFiles(dir, out);
  if (!existsSync(f.record)) return false;
  const record = JSON.parse(readFileSync(f.record, "utf8"));
  const to = part === "png" ? f.png : f.svg;
  if (bytes) {
    mkdirSync(path.dirname(to), { recursive: true });
    writeFileSync(to, bytes);
  } else rmSync(to, { force: true });
  record[part] = !!bytes;
  writeFileSync(f.record, `${JSON.stringify(record)}\n`);
  return true;
}

/**
 * Puts the picture `out` under `outRoot` back as `dir` keeps it (holdPicture): its PNG, its
 * SVG and its bundle, each removed when it was not there. Returns the build kept, or
 * undefined when `dir` keeps nothing of the picture and nothing was done.
 */
export function unholdPicture(dir, outRoot, out, bundlesRoot) {
  const held = heldOf(dir, out);
  if (!held) return undefined;
  const put = (bytes, to) => {
    if (bytes === null) rmSync(to, { force: true });
    else {
      mkdirSync(path.dirname(to), { recursive: true });
      writeFileSync(to, bytes);
    }
  };
  put(held.pngBytes, path.join(outRoot, out));
  put(held.svgText, path.join(outRoot, svgOf(out)));
  if (bundlesRoot) copyBundle(heldFiles(dir, out).bundles, bundlesRoot, out);
  return held.build;
}

/**
 * Removes the picture `out`, its SVG and, when there is a bundle cache (`bundlesRoot`), its
 * bundle. Returns whether the picture's file was there. With `dryRun` nothing is removed.
 */
export function dropPicture(outRoot, out, bundlesRoot, { dryRun = false } = {}) {
  const file = path.join(outRoot, out);
  const had = existsSync(file);
  if (dryRun) return had;
  const svg = path.join(outRoot, svgOf(out));
  if (existsSync(svg)) rmSync(svg);
  if (bundlesRoot) dropBundle(bundlesRoot, out);
  if (had) rmSync(file);
  return had;
}
