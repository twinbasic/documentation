// What becomes of a picture and of its SVG: the decisions shoot_docs.mjs, replay.mjs and the
// screenshot review tool make the same way, as pure functions. They read nothing and write
// nothing: the caller passes in the files, the noise rule and the picture's entry in the
// manifest (shot-manifest.mjs), whose allowances change the rule and whose decisions, made
// by a review on the same bytes, take its place; and acts on the verdict through
// shot-apply.mjs.

import { pngSize } from "./png.mjs";
import { NOISE_LEVELS, NOISE_SHARE, shareOff } from "./shot-change.mjs";
import { earlierPngDecision, earlierSvgDecision, pngDecision, svgDecision } from "./shot-manifest.mjs";
import { pictureFate } from "./shot-revision.mjs";

// How far, in device pixels, a light picture's width or height may be from the dark one's.
// The Light theme lays the window out a little differently (its toolbar is 4 CSS pixels
// shorter, a panel's title bar 3, some buttons narrower), so a clip worked out from the page's
// elements comes out up to a few pixels off, and the page shows each picture at its own size
// (builder/theme-pictures.mjs). A larger difference is not the theme's: most likely the IDE
// was not in the state the dark picture shows.
export const SIZE_SLACK = 32;

// The most an SVG may differ from its PNG and still be written: the share of
// its pixels (percent) more than 96 grey levels off the PNG's, a shift of one
// pixel allowed. Past it something is drawn wrongly or not at all -- a part
// the converter does not draw, the help pane's page from another origin --
// and the page goes on showing the PNG.
export const SVG_FAITHFUL = 0.25;

/** The level at which the SVG's bar counts its pixels off by default (diff.mjs's pct96). */
const SVG_BAR_LEVELS = 96;

// A manifest's rectangles, [x0, y0, x1, y1], as withinNoise and shareOff take them.
const rectsOf = (list) => (list ?? []).map(([x0, y0, x1, y1]) => ({ x0, y0, x1, y1 }));

/**
 * The noise rule for a picture, from its entry in the manifest (or null): {levels, share,
 * rects}, as withinNoise takes it (`share` a fraction, `rects` {x0, y0, x1, y1}).
 */
export function pngRule(entry) {
  const noise = entry?.png?.noise ?? {};
  return {
    levels: noise.levels ?? NOISE_LEVELS,
    share: noise.share === undefined ? NOISE_SHARE : noise.share / 100,
    rects: rectsOf(entry?.png?.ignore),
  };
}

/**
 * The SVG's bar for a picture, from its entry (or null): {levels, share, rects}, `share` a
 * percentage and `rects` the rectangles left out ({x0, y0, x1, y1}).
 */
export function svgRule(entry) {
  const bar = entry?.svg?.bar ?? {};
  return { levels: bar.levels ?? SVG_BAR_LEVELS, share: bar.share ?? SVG_FAITHFUL, rects: rectsOf(entry?.svg?.ignore) };
}

/** A capture's width and height, from its header (png.mjs's pngSize): {w, h}, as a verdict gives them. */
function sizeOf(png) {
  const size = pngSize(png);
  if (!size) throw new Error("a capture that is not a PNG");
  return { w: size[0], h: size[1] };
}

/**
 * What becomes of a new capture `png` (PNG bytes) of the picture in `theme`. `dark` is the
 * dark picture (this run's, or the file's) when `theme` is "light", else null; `revision` and
 * `disk` are pictureFate's, and `near(a, b, rule)` whether two PNG files are within the noise
 * rule `rule` of each other (pngRule). `entry` is the picture's entry in the manifest, or
 * null. A light picture is compared with the dark one first.
 *
 * A review's decision about these bytes takes the place of the rule: "new" counts the capture
 * as differing from every picture it is compared with, "old" as within noise of the one it
 * would go back to (the revision's, else the file); a light picture with the dark one's
 * pixels is still found by the rule. Returns {state, write, against, size, dark, by, earlier},
 * `against` pictureFate's, or "dark" for a light picture judged against the dark one, `size`
 * the capture's {w, h}, `dark` the dark picture's when it is another size, else null, `by`
 * "decision" or "rule", and `earlier` a review's decision about other bytes ("old" or
 * "new"), which the rule judged this capture without, else null:
 *
 *   too-far    a light picture more than SIZE_SLACK off the dark one's size: a failure
 *   dark       a light picture with the dark one's pixels, but for a capture's noise: no
 *              light file is kept, and one there is removed (the page shows X.png in both)
 *   restored, unchanged, noise, updated, new
 *              as pictureFate says, `write` the bytes the file is to hold or null
 */
export function decidePicture({ png, theme, dark, revision, disk, near, entry = null }) {
  const size = sizeOf(png);
  const decided = pngDecision(entry, png);
  const why = { by: decided ? "decision" : "rule", earlier: earlierPngDecision(entry, png) };
  const rule = pngRule(entry);
  const byRule = (a, b) => near(a, b, rule);
  let other = null;
  if (theme === "light" && dark) {
    const d = sizeOf(dark);
    if (Math.abs(d.w - size.w) > SIZE_SLACK || Math.abs(d.h - size.h) > SIZE_SLACK)
      return { state: "too-far", write: null, against: "dark", size, dark: d, ...why };
    if (d.w !== size.w || d.h !== size.h) other = d;
    if (decided !== "new" && byRule(dark, png))
      return { state: "dark", write: null, against: "dark", size, dark: other, ...why };
  }
  const nearBy = decided === "new" ? () => false : decided === "old" ? () => true : byRule;
  return { ...pictureFate(png, revision, disk, nearBy), size, dark: other, ...why };
}

/**
 * Whether a picture's SVG is judged and written with its PNG: when its PNG is written
 * (`written`), or when there is no SVG to keep (`svgOnDisk` false). An SVG drawn from the whole
 * page can differ from run to run in layers the picture does not show, so the SVG of a
 * picture whose PNG stays stays with it (owner): it changes with its PNG, or when replay.mjs
 * draws it again, or when a review accepts the new one (`accepted`: svgDecision of this SVG
 * against this capture is true; owner, 2026-11-01). That is how an SVG drawn from a bundle
 * the capture recorded wrongly is replaced, which a replay of that bundle cannot do: the
 * scrollbars of a cut-out recorded hidden before 59b14ac0.
 */
export const svgFollowsPng = ({ written, svgOnDisk, accepted = false }) => !!written || !svgOnDisk || !!accepted;

/**
 * Whether the bundle of a picture whose SVG stays with its PNG (svgFollowsPng false) goes into
 * the bundle cache all the same: when the SVG drawn from it (`svg`) is the file's (`svgOnDisk`,
 * its text, or null), line endings aside (owner, 2026-11-02). The cache keeps each picture's
 * bundle with the SVG drawn from it and naming the PNG the file holds, which a bundle that draws
 * the file's SVG to the byte keeps true; and a newer bundle answers what the converter has
 * learnt to ask since the older was taken (a text field's selection), which replay.mjs would
 * otherwise list as needing a retake after every retake that leaves the PNG as it is.
 */
export const bundleFollowsSvg = ({ svg, svgOnDisk }) =>
  svgOnDisk !== null && svg.replace(/\r\n/g, "\n") === svgOnDisk.replace(/\r\n/g, "\n");

/**
 * Whether --cleanup puts the file `after` (bytes) back as the revision has it (`before`):
 * a review's decision about these bytes ("old" puts it back, "new" leaves it), else
 * whether it is within the picture's noise rule of the revision's (`near` as decidePicture's).
 */
export function cleanupResets({ before, after, near, entry = null }) {
  const decided = pngDecision(entry, after);
  if (decided) return decided === "old";
  return near(before, after, pngRule(entry));
}

/**
 * Whether an SVG is close enough to its PNG to be written, from the strength map diffSvg
 * returns: the share of its pixels at the bar's levels or more, its rectangles left out
 * (shareOff), must stay below the bar's share (svgRule, from the picture's `entry` in the
 * manifest, or null). A review's decision about this SVG (`svg`, its text) against this PNG
 * (`png`, bytes) takes the bar's place. Returns {faithful, by, share, earlier}, `by`
 * "decision" or "rule", `share` the share at the bar's levels (percent), and `earlier` a
 * review's decision about another SVG or PNG (true or false), which the bar judged this one
 * without, else null.
 */
export function decideSvg(strength, { entry = null, svg = null, png = null } = {}) {
  const { levels, share: bar, rects } = svgRule(entry);
  const share = shareOff(strength, { level: levels, rects });
  const earlier = earlierSvgDecision(entry, svg, png);
  const decided = svgDecision(entry, svg, png);
  if (decided !== null) return { faithful: decided, by: "decision", share, earlier };
  return { faithful: share < bar, by: "rule", share, earlier };
}
