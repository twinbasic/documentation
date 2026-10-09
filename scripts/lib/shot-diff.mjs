// A picture of how two versions of a screenshot differ, for a person to look at:
// shoot_docs.mjs --diffs writes one for each picture it would rewrite, and one for each
// pair of captures of one state that disagree.
//
// The first row is the two versions and their difference side by side, at their own size
// (composeComparison with `amplify`: matching pixels a dark grey copy, a differing pixel
// yellow for one grey level of difference, shading to red at 128). Under it, magnified,
// the region where the pixels differ when it is small, or else up to three small windows
// round the first differing pixels, each three panels again.

import { composeComparison, decodePng, encodePng, GUTTER } from "./png.mjs";

// A region small enough to magnify whole, in pixels, and the side of a window round a
// differing pixel otherwise.
const SMALL = 240;
const WINDOW = 64;
const WINDOWS = 3;

const differs = (A, B, x, y) => {
  const i = (y * A.width + x) * 4;
  return (
    A.rgba[i] !== B.rgba[i] ||
    A.rgba[i + 1] !== B.rgba[i + 1] ||
    A.rgba[i + 2] !== B.rgba[i + 2] ||
    A.rgba[i + 3] !== B.rgba[i + 3]
  );
};

// The box round the differing pixels of two pictures of one size, or null.
function differingBox(A, B) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < A.height; y++) {
    for (let x = 0; x < A.width; x++) {
      if (!differs(A, B, x, y)) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

// Windows of WINDOW pixels round the first differing pixels, in reading order, none
// holding the pixel the next starts from.
function windows(A, B) {
  const out = [];
  for (let y = 0; y < A.height && out.length < WINDOWS; y++) {
    for (let x = 0; x < A.width && out.length < WINDOWS; x++) {
      if (!differs(A, B, x, y)) continue;
      if (out.some((w) => x >= w.x && x < w.x + w.width && y >= w.y && y < w.y + w.height)) continue;
      out.push(within({ x: x - WINDOW / 2, y: y - WINDOW / 2, width: WINDOW, height: WINDOW }, A));
    }
  }
  return out;
}

// A box moved and cut to lie inside the picture.
function within(box, img) {
  const x = Math.max(0, Math.min(box.x, img.width - 1));
  const y = Math.max(0, Math.min(box.y, img.height - 1));
  return {
    x,
    y,
    width: Math.min(box.width, img.width - x),
    height: Math.min(box.height, img.height - y),
  };
}

function crop(img, box) {
  const rgba = new Uint8Array(box.width * box.height * 4);
  for (let y = 0; y < box.height; y++) {
    const from = ((box.y + y) * img.width + box.x) * 4;
    rgba.set(img.rgba.subarray(from, from + box.width * 4), y * box.width * 4);
  }
  return { width: box.width, height: box.height, rgba };
}

/**
 * The difference picture of two PNG files, as a PNG file.
 *
 * @param {Buffer} before  the picture on disk
 * @param {Buffer} after   the new one
 * @param {{before?: string, after?: string}} [labels]  the labels of the two (the label font's characters)
 * @returns {Buffer}
 */
export function diffPicture(before, after, { before: labelA = "ON DISK", after: labelB = "NEW" } = {}) {
  const A = decodePng(before);
  const B = decodePng(after);
  const rows = [composeComparison(A, B, { tb: labelA, vb6: labelB }, { amplify: true, scale: 1 })];
  if (A.width === B.width && A.height === B.height) {
    const box = differingBox(A, B);
    // a small region with at least 16 pixels round its middle, so that what is round it shows
    const grown = (b) => {
      const w = Math.max(b.width + 8, 32);
      const h = Math.max(b.height + 8, 32);
      return within(
        { x: b.x + Math.floor((b.width - w) / 2), y: b.y + Math.floor((b.height - h) / 2), width: w, height: h },
        A,
      );
    };
    const parts = !box ? [] : box.width <= SMALL && box.height <= SMALL ? [grown(box)] : windows(A, B);
    for (const part of parts) {
      const s = Math.max(2, Math.min(12, Math.floor(480 / Math.max(part.width, part.height))));
      // the labels are drawn at the magnification too, so they are short
      const labels = { tb: `X${s}`, vb6: `AT ${part.x},${part.y}`, diff: "DIFF" };
      rows.push(composeComparison(crop(A, part), crop(B, part), labels, { amplify: true, scale: s }));
    }
  }
  // the rows one under another on white, each at the left
  const width = Math.max(...rows.map((r) => r.width));
  const height = rows.reduce((h, r) => h + r.height, 0) + GUTTER * (rows.length - 1);
  const rgba = new Uint8Array(width * height * 4).fill(255);
  let top = 0;
  for (const r of rows) {
    for (let y = 0; y < r.height; y++)
      rgba.set(r.rgba.subarray(y * r.width * 4, (y + 1) * r.width * 4), (top + y) * width * 4);
    top += r.height + GUTTER;
  }
  return encodePng({ width, height, rgba });
}
