// The screenshot review tool's writes under docs/ (WIP.ShotReview.md, Runs): while its runs are
// staged the tool is the only writer there, and it applies each run's verdict on a picture as
// it arrives, and again, judged anew, when a review decides otherwise, changes an allowance
// (Remembered overrides) or moves the session to another baseline. Every judgement is
// shot-policy.mjs's and shot-queue.mjs's, and every write shot-apply.mjs's, as in shoot_docs.mjs
// and replay.mjs: what is here is the order they are made in.
//
// A picture's verdicts are layers, one for each run that reported it, applied in the runs'
// order. Before a run's verdict on a picture is applied, what the picture holds is kept in the
// run's folder (holdPicture, as `held/`). To apply a layer again, the picture is put back as
// that layer found it (unholdPicture), which undoes it and every later layer, and each is
// applied again from there, judged with what the picture then holds:
//
//   a capture       decidePicture: the baseline's picture, the file as the layer found it,
//                   the run's capture of the dark picture (else the dark file as the layer found
//                   it, else as it is) and the picture's entry in the manifest
//   its SVG         decideSvg on its strength map, written when its PNG is (svgFollowsPng),
//                   its bundle into the cache naming the PNG the file then holds
//   a replay's SVG  decideSvg against the file's PNG; dropped when that PNG is no longer the one
//                   the replay compared it with
//
// A verdict as it arrives is applied as the run decided it: the run judged it with the same
// inputs. What was applied is in the stage's review/ (shot-stage.mjs), which the server shows in
// place of the run's own verdicts.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { copyBundle, readBundle } from "../svgshot/bundle.mjs";
import { applyPicture, applySvg, heldOf, heldPictures, holdPicture, svgOf, unholdPicture } from "./shot-apply.mjs";
import { pngsNear } from "./shot-change.mjs";
import { decidePicture, decideSvg, svgFollowsPng } from "./shot-policy.mjs";
import { reviewPicture, reviewSvg } from "./shot-queue.mjs";
import { optionOf, runPaths } from "./shot-session.mjs";
import {
  pngVerdict,
  readReviewed,
  readStrength,
  readVerdict,
  readVerdicts,
  reviewedFiles,
  stageFolders,
  svgVerdict,
  writeReviewed,
  writeStrength,
} from "./shot-stage.mjs";

const LIGHT = /\.light\.png$/i;
const themeOf = (out) => (LIGHT.test(out) ? "light" : "dark");
const darkOut = (out) => out.replace(LIGHT, ".png");
const readIf = (file) => (existsSync(file) ? readFileSync(file) : null);
const written = (state) => state === "new" || state === "updated";

/** The revision a run's captures were compared with (its --against), or null. */
export const againstOf = (run) => optionOf(run, "--against");

/**
 * The applier of the session `session` (openSession): `docsRoot` the pictures' folder,
 * `bundlesRoot` the bundle cache, `revision()` the baseline as openRevision gives it now, and
 * `manifest()` the manifest as it is now (openManifest). Returns:
 *
 *   arrive(n, out, part)   applies the part ("png" or "svg") of the run `n`'s verdict on `out`,
 *                          unless it is applied already
 *   pending()              applies every part of every run's verdicts not applied yet, in the
 *                          runs' order: the session opened again after the tool stopped
 *                          between a verdict and its application. Returns how many
 *   rejudge(out, from)     applies again every layer of `out` from the run `from` on
 *   undo(n)                undoes the run `n`'s layers, as if it had not run: each picture it
 *                          held put back as its layer found it, and the later layers applied
 *                          again from there. Returns {outs, later, failed}: the pictures it
 *                          held, those of them a later run has a verdict on, and a Map from
 *                          each that could not be put back to why
 *   reviewed(n, out)       the verdict applied, {out, png, svg, done}, or null
 *   heldPng(n, out)        the PNG the run `n`'s layer found, or null
 *   errors                 a Map from a picture to why its last application failed
 *
 * An application that fails is recorded in `errors` and leaves the picture as far as it got;
 * judging it again (rejudge) tries again. So does a verdict that cannot be read: arrive then
 * applies nothing, and can be called again.
 */
export function createApplier({ session, docsRoot, bundlesRoot, revision, manifest }) {
  const stageOf = (n) => runPaths(session.root, n).stage;
  const heldDir = (n) => path.join(runPaths(session.root, n).dir, "held");
  const errors = new Map();
  const cache = new Map();
  const reviewed = (n, out) => {
    const key = `${n}\u0000${out}`;
    if (!cache.has(key)) cache.set(key, readReviewed(stageOf(n), out));
    return cache.get(key);
  };
  const keepReviewed = (n, r) => {
    writeReviewed(stageOf(n), r);
    cache.set(`${n}\u0000${r.out}`, r);
  };

  const hold = (n, out, m) => holdPicture(heldDir(n), docsRoot, out, bundlesRoot, m.entry(out)?.build ?? null);
  function unhold(n, out, m) {
    const build = unholdPicture(heldDir(n), docsRoot, out, bundlesRoot);
    if (build === null) m.clearBuild(out);
    else if (build !== undefined) m.setBuild(out, build);
  }

  // The dark picture a light capture of the run `n` is compared with, as shoot_docs.mjs
  // compares it: the run's own capture, else the dark file as the run's layer found it.
  function darkFor(n, out) {
    const d = darkOut(out);
    const capture = readVerdict(stageOf(n), d)?.png?.capture;
    const staged = capture ? readIf(path.join(stageOf(n), capture)) : null;
    if (staged) return staged;
    const held = heldOf(heldDir(n), d);
    return held ? held.pngBytes : readIf(path.join(docsRoot, d));
  }

  // The png part of the run `n`'s verdict on `out` applied: as the run decided it (`staged`),
  // or judged again. Returns the part as applied.
  function applyPng(n, out, staged, rejudge, m) {
    if (staged.state === "failed") return staged;
    const run = session.run(n);
    const svg = run?.tool === "shoot_docs" && run.args.includes("--svg");
    const rev = revision();
    if (staged.state === "once") {
      const { removed } = applyPicture(docsRoot, out, { state: "once", write: null }, rev, { bundlesRoot });
      if (removed) m.clearBuild(out);
      return staged;
    }
    const stage = stageOf(n);
    const capture = staged.capture ? readIf(path.join(stage, staged.capture)) : null;
    if (!capture) throw new Error(`run ${n} staged no capture of ${out}`);
    let part = { ...staged, baseline: againstOf(run) ?? rev.hash };
    if (rejudge) {
      const held = heldOf(heldDir(n), out);
      const entry = m.entry(out);
      const atRevision = rev.bytes(out);
      const dark = themeOf(out) === "light" ? darkFor(n, out) : null;
      const fate = decidePicture({
        png: capture,
        theme: themeOf(out),
        dark,
        revision: atRevision,
        disk: held?.pngBytes ?? null,
        near: pngsNear,
        entry,
      });
      if (fate.state === "too-far")
        throw new Error(
          `the light picture is ${fate.size.w}x${fate.size.h} px and the dark one ${fate.dark.w}x${fate.dark.h} px`,
        );
      const reference = { revision: atRevision, disk: held?.pngBytes ?? null, dark }[fate.against] ?? null;
      const review = reviewPicture(fate, capture, reference, entry);
      let strength = null;
      if (review.strength) {
        const files = reviewedFiles(stage, out);
        writeStrength(files.pngStrength, review.strength);
        strength = files.pngStrengthName;
      }
      part = {
        ...pngVerdict({
          decision: fate,
          review,
          build: staged.build,
          diffs: staged.diffs ?? [],
          staged: { capture: staged.capture, strength },
        }),
        baseline: rev.hash,
      };
    }
    const applied = applyPicture(
      docsRoot,
      out,
      { state: part.state, write: written(part.state) ? capture : null },
      rev,
      { svg, bundlesRoot },
    );
    if (written(part.state)) m.setBuild(out, part.build);
    if (applied.removed) m.clearBuild(out);
    return { ...part, restoredSvg: applied.svg };
  }

  // The svg part of the run `n`'s verdict on `out` applied, its PNG's part as applied `png`
  // (null for a replay's). Returns the part as applied.
  function applySvgPart(n, out, staged, png, m) {
    const held = heldOf(heldDir(n), out);
    const stays = (state, why) => ({ ...staged, state, why, look: null });
    if (png?.state === "failed") return stays("unchanged", "its PNG failed");
    if (png?.state === "dark") return stays(held?.svg ? "removed" : "not written", "the light picture is the dark one");
    if (png?.state === "restored") {
      const fate = png.restoredSvg?.fate;
      return stays(
        fate === "write" ? "updated" : fate === "remove" ? "removed" : "unchanged",
        "its PNG is the baseline's",
      );
    }
    if (png && !svgFollowsPng({ written: written(png.state), svgOnDisk: !!held?.svg }))
      return stays("unchanged", "its PNG is not written");
    const stage = stageOf(n);
    const svgOut = svgOf(out);
    if (!staged.svg) {
      // a replay's SVG the same as the file's: nothing to write
      if (!png) return staged;
      // no SVG drawn of a capture written: one there goes with the PNG it was of
      const state = applySvg(docsRoot, svgOut, null);
      return { ...staged, state, why: staged.why ?? "no SVG was drawn of the capture", look: null };
    }
    const svgText = readFileSync(path.join(stage, staged.svg), "utf8");
    const strength = readStrength(path.join(stage, staged.strength));
    const compared = png
      ? readFileSync(path.join(stage, png.capture))
      : (held?.pngBytes ?? readIf(path.join(docsRoot, out)));
    const entry = m.entry(out);
    const verdict = decideSvg(strength, { entry, svg: svgText, png: compared });
    const state = applySvg(docsRoot, svgOut, verdict.faithful ? svgText : null);
    // the bundle names the PNG the file holds, which replay.mjs compares with
    const holds = readIf(path.join(docsRoot, out));
    const bundles = stageFolders(stage).bundles;
    if (bundlesRoot && holds && readBundle(bundles, out)) copyBundle(bundles, bundlesRoot, out, holds);
    return svgVerdict({
      state,
      why: verdict.faithful ? null : (staged.measures ?? staged.why),
      verdict,
      review: reviewSvg(verdict, strength, entry),
      stats: staged.stats,
      measures: staged.measures,
      diffs: staged.diffs ?? [],
      staged: { svg: staged.svg, strength: staged.strength },
    });
  }

  function arrive(n, out, part) {
    let staged;
    try {
      staged = readVerdict(stageOf(n), out);
    } catch (e) {
      errors.set(out, `run ${n}'s verdict could not be read: ${e.message}`);
      return false;
    }
    if (!staged?.[part]) return false;
    const r = reviewed(n, out) ?? { out, png: null, svg: null, done: [] };
    if (r.done.includes(part)) return false;
    const m = manifest();
    try {
      if (!heldOf(heldDir(n), out)) hold(n, out, m);
      if (part === "png") r.png = applyPng(n, out, staged.png, false, m);
      else r.svg = applySvgPart(n, out, staged.svg, r.done.includes("png") ? r.png : (staged.png ?? null), m);
      keepReviewed(n, { ...r, done: [...r.done, part] });
      m.save();
      errors.delete(out);
      return true;
    } catch (e) {
      m.save();
      errors.set(out, e.message);
      return false;
    }
  }

  function pending() {
    let count = 0;
    for (const { n } of [...session.data.runs].sort((a, b) => a.n - b.n))
      for (const v of readVerdicts(stageOf(n)))
        for (const part of ["png", "svg"]) if (v[part] && arrive(n, v.out, part)) count++;
    return count;
  }

  // The runs after `from` (or from it on, with `inclusive`) that have a verdict on `out`, in order.
  const layersOf = (out, from, inclusive) =>
    session.data.runs
      .map((r) => r.n)
      .filter((n) => (inclusive ? n >= from : n > from) && readVerdict(stageOf(n), out))
      .sort((a, b) => a - b);

  // Applies the layers `layers` of `out` again, in order, each judged anew with what the
  // picture holds when it is reached; the first finds the picture as it is now.
  function reapply(out, layers, m) {
    for (const n of layers) {
      const staged = readVerdict(stageOf(n), out);
      // the PNG the layer found when it was applied, which a replay compared its SVG with
      const found = heldOf(heldDir(n), out)?.pngBytes ?? null;
      hold(n, out, m);
      const r = { out, png: null, svg: null, done: [] };
      if (staged.png) {
        r.png = applyPng(n, out, staged.png, true, m);
        r.done.push("png");
      }
      if (staged.svg) {
        const now = readIf(path.join(docsRoot, out));
        const moved = !staged.png && found && !(now && now.equals(found));
        // a replay's SVG of a PNG that is no longer the file's is dropped
        if (!moved) r.svg = applySvgPart(n, out, staged.svg, r.png, m);
        r.done.push("svg");
      }
      keepReviewed(n, r);
    }
  }

  function rejudge(out, from) {
    const layers = layersOf(out, from, true);
    if (!layers.length) return;
    const m = manifest();
    try {
      unhold(layers[0], out, m);
      reapply(out, layers, m);
      m.save();
      errors.delete(out);
    } catch (e) {
      m.save();
      errors.set(out, e.message);
    }
  }

  // Undoes the run `n`'s layers: each picture it held put back as the layer found it, and the
  // later runs' layers on it applied again from there. The dark pictures go first, since a
  // light one is judged against its dark one as the layer finds it.
  function undo(n) {
    const outs = heldPictures(heldDir(n)).sort((a, b) => Number(LIGHT.test(a)) - Number(LIGHT.test(b)));
    const failed = new Map();
    const later = [];
    const m = manifest();
    for (const out of outs) {
      try {
        unhold(n, out, m);
        const layers = layersOf(out, n, false);
        if (layers.length) later.push(out);
        reapply(out, layers, m);
        errors.delete(out);
      } catch (e) {
        failed.set(out, e.message);
        errors.set(out, e.message);
      }
    }
    m.save();
    for (const key of [...cache.keys()]) if (key.startsWith(`${n}\u0000`)) cache.delete(key);
    return { outs, later, failed };
  }

  return {
    arrive,
    pending,
    rejudge,
    undo,
    reviewed,
    heldPng: (n, out) => heldOf(heldDir(n), out)?.pngBytes ?? null,
    errors,
  };
}
