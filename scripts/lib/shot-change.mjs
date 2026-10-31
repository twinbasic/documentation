// How two versions of a screenshot differ, as numbers and as a picture: the rule that
// shoot_docs.mjs uses to tell a new capture from the file on disk only by a capture's
// noise (withinNoise), and the comparison that svgshot/sheet.mjs --against shows for a
// picture and the same file at a git revision (compareImages, changeMap).
//
// Images are what png.mjs's decodePng returns: {width, height, rgba}.

import { decodePng, encodePng } from "./png.mjs";

/** The most grey levels a channel of a pixel may differ by, in a capture's noise. */
export const NOISE_LEVELS = 16;
/** The most pixels, as a share of all, that may differ at all, in a capture's noise. */
export const NOISE_SHARE = 0.005;

/** Whether the pixel (x, y) is inside one of `rects`, each {x0, y0, x1, y1} (x1 and y1 not included). */
export const inRects = (rects, x, y) => rects.some((r) => x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1);

// The largest difference of any channel (alpha included) of two pixels, by index into each rgba.
const pixelDiff = (A, i, B, j) => {
  let d = 0;
  for (let k = 0; k < 4; k++) d = Math.max(d, Math.abs(A.rgba[i + k] - B.rgba[j + k]));
  return d;
};

/**
 * Whether two images are the same picture but for a capture's noise: one size, no
 * channel of any pixel more than `levels` grey levels apart (NOISE_LEVELS), and no
 * more than `share` of the pixels apart at all (NOISE_SHARE; at least one pixel). The noise seen: 1 to 14
 * levels, along a shadow's or an arrow's edge, at a rounded corner, in a scaled
 * bitmap (34 pixels; 81 on About's Close button; the most, 563 along a dialog's top
 * edge, 0.13% of it). A change the IDE draws moves text or colour by far more than
 * 16 levels. The pixels inside `rects` are left out. Identical images are within it.
 */
export function withinNoise(A, B, { levels = NOISE_LEVELS, share = NOISE_SHARE, rects = [] } = {}) {
  if (A.width !== B.width || A.height !== B.height) return false;
  const most = Math.max(1, Math.floor(A.width * A.height * share));
  let apart = 0;
  for (let i = 0; i < A.rgba.length; i += 4) {
    const d = pixelDiff(A, i, B, i);
    if (!d || inRects(rects, (i / 4) % A.width, Math.floor(i / 4 / A.width))) continue;
    if (d > levels || ++apart > most) return false;
  }
  return true;
}

/**
 * withinNoise of two PNG files (bytes), `rule` its limits and rectangles: the `near` that
 * decidePicture and cleanupResets (shot-policy.mjs) take.
 */
export const pngsNear = (a, b, rule = {}) => withinNoise(decodePng(a), decodePng(b), rule);

// ---- the strength map and its regions ---------------------------------------------------
//
// A strength map is how far each pixel of one picture is from another's, a byte per pixel,
// row by row: {width, height, data}. strengthOf makes one of two PNG captures; diff.mjs's
// diffSvg returns one of an SVG against its PNG. The share at any level and the regions of
// change are worked out from it without comparing the pictures again.

/**
 * The strength map of two images of one size: each pixel's largest difference of any
 * channel, alpha included, as withinNoise measures it.
 */
export function strengthOf(A, B) {
  if (A.width !== B.width || A.height !== B.height)
    throw new Error(`the pictures are of two sizes, ${A.width} x ${A.height} and ${B.width} x ${B.height}`);
  const data = new Uint8Array(A.width * A.height);
  for (let i = 0; i < data.length; i++) data[i] = pixelDiff(A, i * 4, B, i * 4);
  return { width: A.width, height: A.height, data };
}

// A mask of the pixels of `strength` at `level` or more, those inside `rects` left out.
function maskAt({ width, data }, level, rects) {
  const mask = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++)
    if (data[i] >= level && !(rects.length && inRects(rects, i % width, Math.floor(i / width)))) mask[i] = 1;
  return mask;
}

/**
 * The share of the pixels of `strength` at `level` or more, as a percentage rounded to
 * three places, as diffSvg reports it. The pixels inside `rects` ({x0, y0, x1, y1}) are not
 * counted, and still count in the whole, as in withinNoise.
 */
export function shareOff(strength, { level, rects = [] }) {
  const mask = maskAt(strength, level, rects);
  let n = 0;
  for (let i = 0; i < mask.length; i++) n += mask[i];
  return +((100 * n) / mask.length).toFixed(3);
}

// One pass of a square window 2r + 1 wide along rows (dx 1) or columns: a pixel is set when
// every pixel of the window is (`all`, an erosion) or any is (a dilation). Outside the
// picture counts as not set.
function windowPass(mask, w, h, r, along, all) {
  const out = new Uint8Array(mask.length);
  const [lines, len] = along === "rows" ? [h, w] : [w, h];
  const at = along === "rows" ? (line, k) => line * w + k : (line, k) => k * w + line;
  const width = 2 * r + 1;
  for (let line = 0; line < lines; line++) {
    let n = 0;
    for (let k = 0; k < Math.min(r, len); k++) n += mask[at(line, k)];
    for (let k = 0; k < len; k++) {
      if (k + r < len) n += mask[at(line, k + r)];
      if (k - r - 1 >= 0) n -= mask[at(line, k - r - 1)];
      if (all ? n === width : n > 0) out[at(line, k)] = 1;
    }
  }
  return out;
}
const erodeMask = (mask, w, h, r) =>
  r ? windowPass(windowPass(mask, w, h, r, "rows", true), w, h, r, "cols", true) : mask;
const dilateMask = (mask, w, h, r) =>
  r ? windowPass(windowPass(mask, w, h, r, "rows", false), w, h, r, "cols", false) : mask;

/**
 * The three masks changeRegions works from, a byte per pixel (1 set, 0 not): `mask` the
 * pixels at `level` or more, `closed` with the gaps filled, and `core` what the erosion
 * leaves of `closed`. Options as changeRegions'.
 */
export function regionMasks(strength, { level, erode = 2, close = 2, rects = [] }) {
  const { width: w, height: h } = strength;
  const mask = maskAt(strength, level, rects);
  // Closing, the original pixels kept: the erosion after the dilation counts outside the
  // picture as not set, so it would take a closed region's pixels along the edge.
  const closed = close ? erodeMask(dilateMask(mask, w, h, close), w, h, close) : mask;
  if (close) for (let i = 0; i < mask.length; i++) closed[i] |= mask[i];
  return { mask, closed, core: erodeMask(closed, w, h, erode) };
}

/**
 * The regions of change in `strength`: its pixels at `level` or more (those inside `rects`
 * left out), with gaps of up to 2 * `close` pixels between them filled, grouped into
 * connected regions (a pixel touching another at a corner is connected to it). Each region
 * is eroded by `erode` pixels: a line up to 2 * `erode` pixels thick is gone after the
 * erosion, and a block keeps its middle. Returns [{x0, y0, x1, y1, pixels, core}], most core
 * first: the box of the region's changed pixels (x1 and y1 not included), how many there
 * are, and how many pixels of the region the erosion left.
 */
export function changeRegions(strength, options) {
  const { width: w, height: h } = strength;
  const { mask, closed, core } = regionMasks(strength, options);
  const label = new Int32Array(mask.length);
  const stack = new Int32Array(mask.length);
  const regions = [];
  for (let start = 0; start < mask.length; start++) {
    if (!closed[start] || label[start]) continue;
    const region = { x0: w, y0: h, x1: 0, y1: 0, pixels: 0, core: 0 };
    regions.push(region);
    label[start] = regions.length;
    let top = 0;
    stack[top++] = start;
    while (top) {
      const i = stack[--top];
      const x = i % w;
      const y = (i - x) / w;
      if (mask[i]) {
        region.pixels++;
        if (x < region.x0) region.x0 = x;
        if (y < region.y0) region.y0 = y;
        if (x + 1 > region.x1) region.x1 = x + 1;
        if (y + 1 > region.y1) region.y1 = y + 1;
      }
      region.core += core[i];
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const j = yy * w + xx;
          if (closed[j] && !label[j]) {
            label[j] = regions.length;
            stack[top++] = j;
          }
        }
      }
    }
  }
  return regions.sort((a, b) => b.core - a.core || b.pixels - a.pixels || a.y0 - b.y0 || a.x0 - b.x0);
}

/**
 * Compares two images aligned at the top left, over the area they share; a pixel only
 * one of them has counts as changed beyond noise. Returns
 * {sameSize, old: [w, h], new: [w, h], canvas: [w, h], common: [w, h], total, differing,
 * beyond, faint, pctBeyond, pctDiffering, levels, noiseOnly}: `total` the pixels of the larger
 * canvas, `differing` those that differ at all, `beyond` those that differ by more
 * than `levels` or exist in one picture only, `faint` those that differ by 1 to
 * `levels`, the two percentages of `total` (not rounded), and `noiseOnly` whether
 * the pictures are of one size and within the noise rule `rule` (withinNoise's, a picture's
 * pngRule; `levels` is its levels, NOISE_LEVELS by default), identical ones included. The
 * rule's rectangles are left out of `noiseOnly` only.
 */
export function compareImages(A, B, rule = {}) {
  const levels = rule.levels ?? NOISE_LEVELS;
  const cw = Math.min(A.width, B.width);
  const ch = Math.min(A.height, B.height);
  const w = Math.max(A.width, B.width);
  const h = Math.max(A.height, B.height);
  const total = w * h;
  let differing = 0;
  let beyond = 0;
  let faint = 0;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const d = pixelDiff(A, (y * A.width + x) * 4, B, (y * B.width + x) * 4);
      if (!d) continue;
      differing++;
      if (d > levels) beyond++;
      else faint++;
    }
  }
  const only = total - cw * ch;
  differing += only;
  beyond += only;
  const sameSize = A.width === B.width && A.height === B.height;
  return {
    sameSize,
    old: [A.width, A.height],
    new: [B.width, B.height],
    canvas: [w, h],
    common: [cw, ch],
    total,
    differing,
    beyond,
    faint,
    pctBeyond: (beyond / total) * 100,
    pctDiffering: (differing / total) * 100,
    levels,
    noiseOnly: sameSize && withinNoise(A, B, rule),
  };
}

// A pixel over white, as [r, g, b].
const overWhite = (img, i) => {
  const a = img.rgba[i + 3];
  const over = (c) => Math.round((c * a + 255 * (255 - a)) / 255);
  return [over(img.rgba[i]), over(img.rgba[i + 1]), over(img.rgba[i + 2])];
};

// A difference map's colour of a pixel of `B` (its offset `j`) that differs by `d` levels: a
// dark grey copy of it when `d` is 0, else yellow for one level, shading to red at 128 and more.
function mapColour(d, B, j) {
  if (!d) {
    const [r, g, b] = overWhite(B, j);
    const v = 24 + Math.round((0.299 * r + 0.587 * g + 0.114 * b) * 0.25);
    return [v, v, v];
  }
  const t = Math.min(1, Math.log2(d) / 7);
  return [255, Math.round(255 * (1 - t)), 0];
}

/** The map's colour of a pixel only the old picture has, and of one only the new picture has. */
export const ONLY_OLD = [0, 190, 220];
export const ONLY_NEW = [220, 0, 220];

/**
 * The difference map of two images, aligned at the top left, as a PNG file as large as
 * the larger of each dimension: a pixel that matches is a dark grey copy of the new
 * picture's; one that differs is yellow for a difference of one grey level in its most
 * different channel, shading to red at 128 and more; a pixel only the old picture has
 * is cyan, one only the new picture has magenta.
 */
export function changeMap(A, B) {
  const w = Math.max(A.width, B.width);
  const h = Math.max(A.height, B.height);
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const inA = x < A.width && y < A.height;
      const inB = x < B.width && y < B.height;
      let colour;
      if (!inB) colour = ONLY_OLD;
      else if (!inA) colour = ONLY_NEW;
      else {
        const j = (y * B.width + x) * 4;
        colour = mapColour(pixelDiff(A, (y * A.width + x) * 4, B, j), B, j);
      }
      rgba[o] = colour[0];
      rgba[o + 1] = colour[1];
      rgba[o + 2] = colour[2];
      rgba[o + 3] = 255;
    }
  }
  return encodePng({ width: w, height: h, rgba });
}

/**
 * A strength map (strengthOf, or diffSvg's) drawn as changeMap draws two pictures of one
 * size, as a PNG file: `B` is the picture it was measured on (decodePng), of the map's size,
 * whose dark grey copy shows where nothing differs. The screenshot review tool draws its
 * difference maps from the strength maps a run stages.
 */
export function strengthPicture(strength, B) {
  const { width: w, height: h, data } = strength;
  if (B.width !== w || B.height !== h)
    throw new Error(`the map is ${w} x ${h} px and the picture ${B.width} x ${B.height} px`);
  const rgba = new Uint8Array(w * h * 4);
  for (let i = 0; i < data.length; i++) {
    const colour = mapColour(data[i], B, i * 4);
    rgba[i * 4] = colour[0];
    rgba[i * 4 + 1] = colour[1];
    rgba[i * 4 + 2] = colour[2];
    rgba[i * 4 + 3] = 255;
  }
  return encodePng({ width: w, height: h, rgba });
}
