// What becomes of a picture and of its SVG: the decisions shoot_docs.mjs, replay.mjs and the
// screenshot review tool make the same way, as pure functions. They read nothing and write
// nothing: the caller passes in the files and the noise rule, and acts on the verdict
// through shot-apply.mjs.

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

/** A PNG's width and height, from its header: {w, h}. */
export const pngSize = (png) => ({ w: png.readUInt32BE(16), h: png.readUInt32BE(20) });

/**
 * What becomes of a new capture `png` (PNG bytes) of the picture in `theme`. `dark` is the
 * dark picture (this run's, or the file's) when `theme` is "light", else null; `revision`,
 * `disk` and `near(a, b)` are pictureFate's. A light picture is compared with the dark one
 * first. Returns {state, write, size, dark}, `size` the capture's {w, h} and `dark` the dark
 * picture's when it is another size, else null:
 *
 *   too-far    a light picture more than SIZE_SLACK off the dark one's size: a failure
 *   dark       a light picture with the dark one's pixels, but for a capture's noise: no
 *              light file is kept, and one there is removed (the page shows X.png in both)
 *   restored, unchanged, noise, updated, new
 *              as pictureFate says, `write` the bytes the file is to hold or null
 */
export function decidePicture({ png, theme, dark, revision, disk, near }) {
  const size = pngSize(png);
  let other = null;
  if (theme === "light" && dark) {
    const d = pngSize(dark);
    if (Math.abs(d.w - size.w) > SIZE_SLACK || Math.abs(d.h - size.h) > SIZE_SLACK)
      return { state: "too-far", write: null, size, dark: d };
    if (d.w !== size.w || d.h !== size.h) other = d;
    if (near(dark, png)) return { state: "dark", write: null, size, dark: other };
  }
  return { ...pictureFate(png, revision, disk, near), size, dark: other };
}

/**
 * Whether an SVG is close enough to its PNG to be written, from the shares diffSvg reports
 * (`stats.pct96`, percent): {faithful}. `bar` is the share it must stay below.
 */
export const decideSvg = (stats, { bar = SVG_FAITHFUL } = {}) => ({ faithful: stats.pct96 < bar });
