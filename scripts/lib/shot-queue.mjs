// Which pictures the screenshot review tool shows first, in Needs a look (WIP.ShotReview.md,
// The queue): those whose verdict the rule may well have got wrong. The changed pixels are
// grouped into regions (shot-change.mjs's changeRegions) and eroded: a fringe or a caret,
// a line a few pixels thick, is gone after the erosion; text that changed, or a part the SVG
// lacks, is a block, part of which survives. The measure chooses what is shown first and
// decides nothing: the verdicts are shot-policy.mjs's.

import { decodePng } from "./png.mjs";
import { changeRegions, strengthOf } from "./shot-change.mjs";
import { pngRule, svgRule } from "./shot-policy.mjs";

// The pixels a region's gaps are closed by and it is eroded by. Closing first joins a word's
// strokes into one block: a stroke of the IDE's text at 2x is 2 or 3 pixels thick, and the
// erosion alone takes every one of them (Designer_Zoom50's SVG, its text drawn at the wrong
// size, keeps no core without the closing, and ten regions with it).
export const QUEUE_CLOSE = 2;
export const QUEUE_ERODE = 2;

/**
 * The fewest pixels of core that make a region survive: a block of 4 by 4 device pixels, 2 by
 * 2 CSS pixels. Where two fringes cross, the closing leaves a few pixels of core (1 to 15
 * in the SVGs of the 476 bundles of 2026-10-31, none of them a part missing).
 */
export const SURVIVES = 16;

/**
 * The most core a surviving region of a small change may have: a word of the IDE's text.
 * A version number changing in the call stack or a title bar leaves 224 to 265 pixels of
 * core, a name 127 pixels wide 781.
 */
export const WORD_CORE = 1200;

/** How many surviving regions a small change may have: "a block or two the size of a word". */
export const WORD_BLOCKS = 2;

/**
 * The regions of change between a new capture and the picture it was judged against, from
 * their strength map (strengthOf): every pixel that differs at all counts, those inside the
 * noise rule's `rects` (pngRule) left out. Not the pixels beyond noise: a retake on a new
 * build often shifts a colour by a few levels over a whole window, which withinNoise rightly
 * calls a change and which, counted beyond noise, leaves nothing and would read as noise (in
 * the retake on BETA 1010, 294 of the 361 pictures it changed at their old size; counted at
 * any difference, 23). With `level`, only the pixels that many levels off or more count
 * (FAINT_LEVEL, for a capture kept as within noise).
 */
export const pngRegions = (strength, rule, level = 1) =>
  changeRegions(strength, { level, close: QUEUE_CLOSE, erode: QUEUE_ERODE, rects: rule?.rects ?? [] });

/**
 * The fewest levels a pixel of a capture kept as within noise (noise, restored) must be off to
 * count towards a faint change (owner, 2026-10-31). A capture's own noise is often a whole row
 * of text one level off: Menu_File_Project.light, kept as noise on BETA 1034, had 1,258 pixels
 * (0.49%) off, every one by exactly 1 level, and its menu text survived the erosion with cores
 * of 37 to 96 pixels. A tint of 2 to 16 levels still counts.
 */
export const FAINT_LEVEL = 2;

/**
 * The regions where an SVG is off its PNG, from diffSvg's strength map: the pixels at the
 * bar's levels or more, its rectangles left out (svgRule, from the picture's `entry`).
 */
export function svgRegions(strength, entry = null) {
  const { levels, rects } = svgRule(entry);
  return changeRegions(strength, { level: levels, close: QUEUE_CLOSE, erode: QUEUE_ERODE, rects });
}

/** The regions of `regions` that survive the erosion. */
export const surviving = (regions) => regions.filter((r) => r.core >= SURVIVES);

// Whether the surviving regions are a small change: a block or two the size of a word.
const small = (kept) => kept.length <= WORD_BLOCKS && kept.every((r) => r.core <= WORD_CORE);

/** Whether decidePicture's `state` keeps the old picture as within noise of the capture. */
export const keptAsNoise = (state) => state === "noise" || state === "restored";

/**
 * Why a picture's PNG needs a look, or null: the first argument is decidePicture's verdict
 * ({state, by, earlier}), `regions` pngRegions' for the capture against the picture it was
 * judged against: for `noise` and `restored`, the one it was found within noise of, at
 * FAINT_LEVEL (keptAsNoise; reviewPicture passes the level). Null
 * `regions`, for a capture with nothing to measure it against (a new picture, or one of
 * another size), needs a look only for an earlier decision.
 * Returns {why, text}, `why` one of:
 *
 *   earlier   a review decided about other bytes of this picture; the rule judged these
 *   noise     the capture was taken, and nothing survives: most likely a caret, a clock or
 *             a fringe
 *   small     the capture was taken, and what survives is a block or two the size of a word:
 *             a real change small enough to miss
 *   faint     the old picture was kept as within noise, but something survives: a tint of
 *             a few levels, or a change over less than the noise rule's share
 */
export function pngLook({ state, by, earlier }, regions) {
  if (by === "decision") return null;
  if (earlier) return { why: "earlier", text: `a review kept the ${earlier} picture of other bytes` };
  if (!regions) return null;
  if (keptAsNoise(state))
    return surviving(regions).length
      ? { why: "faint", text: "kept as within noise, but a part of the change survives the erosion" }
      : null;
  if (state !== "updated") return null;
  const kept = surviving(regions);
  if (!kept.length) return { why: "noise", text: "taken, but nothing survives the erosion: most likely noise" };
  if (small(kept)) return { why: "small", text: "taken, and the change is a word or two: small enough to miss" };
  return null;
}

/**
 * Why a picture's SVG needs a look, or null: the first argument is decideSvg's verdict
 * ({faithful, by, earlier}), `regions` svgRegions'. Returns {why, text}, `why` one of:
 *
 *   earlier   a review decided about another SVG or PNG of this picture
 *   part      accepted, but something survives: a part drawn wrongly or not at all,
 *             whatever the share
 *   fringe    refused, and nothing survives: fringes only, most likely acceptable
 */
export function svgLook({ faithful, by, earlier }, regions) {
  if (by === "decision") return null;
  if (earlier !== null && earlier !== undefined)
    return { why: "earlier", text: `a review ${earlier ? "accepted" : "refused"} an SVG of other bytes` };
  const kept = surviving(regions);
  if (faithful && kept.length) return { why: "part", text: "accepted, but a part of it survives the erosion" };
  if (!faithful && !kept.length) return { why: "fringe", text: "refused, but nothing survives the erosion: fringes" };
  return null;
}

/**
 * What the review shows of a capture `png` (PNG bytes) that decidePicture judged (`verdict`):
 * its strength map and its regions of change against `reference`, the picture
 * `verdict.against` names (the revision's, the file or the dark picture, as PNG bytes; null
 * for a new picture), with the picture's noise rule (pngRule of its `entry`), counted at
 * FAINT_LEVEL for a capture kept as within noise, and why it needs a look (pngLook). Returns {strength, regions, look}: `strength` is null when there is
 * nothing to measure (no reference, one of another size, or the same bytes), and `regions`
 * null when the capture cannot be measured, [] when it is the reference.
 */
export function reviewPicture(verdict, png, reference, entry = null) {
  let strength = null;
  let regions = null;
  if (reference?.equals(png)) regions = [];
  else if (reference) {
    const A = decodePng(reference);
    const B = decodePng(png);
    if (A.width === B.width && A.height === B.height) {
      strength = strengthOf(A, B);
      regions = pngRegions(strength, pngRule(entry), keptAsNoise(verdict.state) ? FAINT_LEVEL : 1);
    }
  }
  return { strength, regions, look: pngLook(verdict, regions) };
}

/**
 * What the review shows of an SVG that decideSvg judged (`verdict`), from diffSvg's
 * `strength` map: its regions at the bar's levels (svgRegions, with the picture's `entry`)
 * and why it needs a look (svgLook). Returns {regions, look}.
 */
export function reviewSvg(verdict, strength, entry = null) {
  const regions = svgRegions(strength, entry);
  return { regions, look: svgLook(verdict, regions) };
}
