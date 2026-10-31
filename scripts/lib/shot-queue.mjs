// Which pictures the screenshot review tool shows first, in Needs a look (WIP.ShotReview.md,
// The queue): those whose verdict the rule may well have got wrong. The changed pixels are
// grouped into regions (shot-change.mjs's changeRegions) and eroded: a fringe or a caret,
// a line a few pixels thick, is gone after the erosion; text that changed, or a part the SVG
// lacks, is a block, part of which survives. The measure chooses what is shown first and
// decides nothing: the verdicts are shot-policy.mjs's.

import { changeRegions } from "./shot-change.mjs";
import { svgRule } from "./shot-policy.mjs";

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
 * any difference, 23).
 */
export const pngRegions = (strength, rule) =>
  changeRegions(strength, { level: 1, close: QUEUE_CLOSE, erode: QUEUE_ERODE, rects: rule?.rects ?? [] });

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

/**
 * Why a picture's PNG needs a look, or null: the first argument is decidePicture's verdict
 * ({state, by, earlier}), `regions` pngRegions' for the capture against the picture it was
 * judged against: for `noise` and `restored`, the one it was found within noise of.
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
  if (state === "noise" || state === "restored")
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
