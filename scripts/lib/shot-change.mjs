// How two versions of a screenshot differ, as numbers and as a picture: the rule that
// shoot_docs.mjs uses to tell a new capture from the file on disk only by a capture's
// noise (withinNoise), and the comparison that svgshot/sheet.mjs --against shows for a
// picture and the same file at a git revision (compareImages, changeMap).
//
// Images are what png.mjs's decodePng returns: {width, height, rgba}.

import { encodePng } from "./png.mjs";

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
 * channel of any pixel more than NOISE_LEVELS grey levels apart, and no more than
 * NOISE_SHARE of the pixels apart at all (at least one). The noise seen: 1 to 14
 * levels, along a shadow's or an arrow's edge, at a rounded corner, in a scaled
 * bitmap (34 pixels; 81 on About's Close button; the most, 563 along a dialog's top
 * edge, 0.13% of it). A change the IDE draws moves text or colour by far more than
 * 16 levels. The pixels inside `rects` are left out. Identical images are within it.
 */
export function withinNoise(A, B, rects = []) {
  if (A.width !== B.width || A.height !== B.height) return false;
  const most = Math.max(1, Math.floor(A.width * A.height * NOISE_SHARE));
  let apart = 0;
  for (let i = 0; i < A.rgba.length; i += 4) {
    const d = pixelDiff(A, i, B, i);
    if (!d || inRects(rects, (i / 4) % A.width, Math.floor(i / 4 / A.width))) continue;
    if (d > NOISE_LEVELS || ++apart > most) return false;
  }
  return true;
}

/**
 * Compares two images aligned at the top left, over the area they share; a pixel only
 * one of them has counts as changed beyond noise. Returns
 * {sameSize, old: [w, h], new: [w, h], canvas: [w, h], common: [w, h], total, differing,
 * beyond, faint, pctBeyond, pctDiffering, noiseOnly}: `total` the pixels of the larger
 * canvas, `differing` those that differ at all, `beyond` those that differ by more
 * than NOISE_LEVELS or exist in one picture only, `faint` those that differ by 1 to
 * NOISE_LEVELS, the two percentages of `total` (not rounded), and `noiseOnly` whether
 * the pictures are of one size and within noise (withinNoise), identical ones included.
 */
export function compareImages(A, B) {
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
      if (d > NOISE_LEVELS) beyond++;
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
    noiseOnly: sameSize && withinNoise(A, B),
  };
}

// A pixel over white, as [r, g, b].
const overWhite = (img, i) => {
  const a = img.rgba[i + 3];
  const over = (c) => Math.round((c * a + 255 * (255 - a)) / 255);
  return [over(img.rgba[i]), over(img.rgba[i + 1]), over(img.rgba[i + 2])];
};

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
        const d = pixelDiff(A, (y * A.width + x) * 4, B, j);
        if (!d) {
          const [r, g, b] = overWhite(B, j);
          const v = 24 + Math.round((0.299 * r + 0.587 * g + 0.114 * b) * 0.25);
          colour = [v, v, v];
        } else {
          const t = Math.min(1, Math.log2(d) / 7);
          colour = [255, Math.round(255 * (1 - t)), 0];
        }
      }
      rgba[o] = colour[0];
      rgba[o + 1] = colour[1];
      rgba[o + 2] = colour[2];
      rgba[o + 3] = 255;
    }
  }
  return encodePng({ width: w, height: h, rgba });
}
