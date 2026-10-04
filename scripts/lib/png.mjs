// PNG files in Node, for scripts/bug_repro.mjs: a graphical bug report is best shown
// by what twinBASIC drew beside what VB6 drew, and `verify` can judge by the same
// two pictures. The capture modules (test/repro-templates/png/PngDump.twin and
// PngDump.bas) write the pictures; this reads them, compares them and writes the
// side-by-side image that goes into the issue.
//
// Only `zlib` is used, no dependency. zlib.crc32 is the checksum PNG chunks carry.
//
//   decodePng(buf)       -> { width, height, rgba }   8-bit RGB, RGBA and palette, not interlaced
//   encodePng(image)     -> Buffer                    RGBA, filter 0 on every row
//   comparePngs(a, b)    -> { sameSize, differing }
//   composeComparison(tb, vb6, labels, options)       three panels with labels, as an image
//
// WHAT IT REFUSES. A PNG that is not 8 bits to the channel, is grey, grey with alpha,
// interlaced or truncated, has a chunk whose CRC is wrong, or whose pixel data does not
// inflate to the size its header says. GDI+ writes none of those from PngDump's 24-bit
// bitmap, so refusing is a statement that the file is not what the capture module
// wrote, and each refusal says which of these it was.

import zlib from "node:zlib";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// Colour types decoded, and the channels each stores per pixel.
const CHANNELS = { 2: 3, 3: 1, 6: 4 };
const COLOUR_NAMES = { 0: "greyscale", 4: "greyscale with alpha" };
const MAX_PIXELS = 100_000_000;

const isImage = (x) => x !== null && typeof x === "object" && !Buffer.isBuffer(x) && !(x instanceof Uint8Array);

/** An image `{ width, height, rgba }`, from one as it is or from the bytes of a PNG file. */
function asImage(x) {
  return isImage(x) ? x : decodePng(x);
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "latin1");
  data.copy(out, 8);
  out.writeUInt32BE(zlib.crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/**
 * The pixels of a PNG file.
 *
 * @param {Buffer | Uint8Array} input  the file's bytes
 * @returns {{ width: number, height: number, rgba: Uint8Array }}  four bytes a pixel, rows from the top
 * @throws {Error} with a message that says what is wrong with the file
 */
export function decodePng(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (buf.length < 8 || !buf.subarray(0, 8).equals(SIGNATURE)) throw new Error("not a PNG: the signature is wrong");
  let pos = 8;
  let header = null;
  let palette = null;
  let alphas = null;
  let ended = false;
  const idat = [];
  while (pos < buf.length && !ended) {
    if (pos + 12 > buf.length) throw new Error("the PNG is truncated inside a chunk header");
    const length = buf.readUInt32BE(pos);
    const type = buf.toString("latin1", pos + 4, pos + 8);
    if (pos + 12 + length > buf.length) throw new Error(`the PNG is truncated inside its ${type} chunk`);
    const data = buf.subarray(pos + 8, pos + 8 + length);
    const stored = buf.readUInt32BE(pos + 8 + length);
    if (zlib.crc32(buf.subarray(pos + 4, pos + 8 + length)) !== stored) throw new Error(`bad CRC in the ${type} chunk`);
    if (!header && type !== "IHDR") throw new Error(`the first chunk is ${type}, not IHDR`);
    if (type === "IHDR") {
      if (header) throw new Error("a second IHDR chunk");
      if (length !== 13) throw new Error(`the IHDR chunk is ${length} bytes, not 13`);
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        depth: data[8],
        colour: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12],
      };
    } else if (type === "PLTE") palette = data;
    else if (type === "tRNS") alphas = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") ended = true;
    pos += 12 + length;
  }
  if (!header) throw new Error("the PNG has no IHDR chunk");
  if (!ended) throw new Error("the PNG has no IEND chunk: it is truncated");
  const { width, height, depth, colour } = header;
  if (depth !== 8) throw new Error(`bit depth ${depth} is not supported: only 8 bits to the channel`);
  if (!(colour in CHANNELS)) {
    throw new Error(
      `colour type ${colour} (${COLOUR_NAMES[colour] ?? "unknown"}) is not supported: only RGB, RGBA and palette`,
    );
  }
  if (header.interlace !== 0) throw new Error("an interlaced PNG is not supported");
  if (header.compression !== 0 || header.filter !== 0)
    throw new Error("the PNG uses a compression or filter method this reader does not know");
  if (!width || !height) throw new Error(`the PNG is ${width} by ${height} pixels`);
  if (width * height > MAX_PIXELS) throw new Error(`the PNG is ${width} by ${height} pixels, too large to read`);
  if (colour === 3) {
    if (!palette || palette.length % 3 !== 0 || palette.length === 0)
      throw new Error("a palette PNG with no usable PLTE chunk");
  } else if (alphas && colour === 2) {
    throw new Error("a tRNS colour key on an RGB PNG is not supported");
  }

  const channels = CHANNELS[colour];
  const stride = width * channels;
  let raw;
  try {
    raw = zlib.inflateSync(Buffer.concat(idat));
  } catch (e) {
    throw new Error(`the PNG's pixel data does not inflate: ${e.message}`);
  }
  if (raw.length !== height * (stride + 1)) {
    throw new Error(`the PNG's pixel data is ${raw.length} bytes, where its header needs ${height * (stride + 1)}`);
  }
  const rows = Buffer.alloc(height * stride);
  const zero = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const kind = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = rows.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? rows.subarray((y - 1) * stride, y * stride) : zero;
    if (kind > 4) throw new Error(`row ${y} has filter type ${kind}, which PNG does not define`);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let predict = 0;
      if (kind === 1) predict = a;
      else if (kind === 2) predict = b;
      else if (kind === 3) predict = (a + b) >> 1;
      else if (kind === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        predict = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = line[x] + predict;
    }
  }

  const rgba = new Uint8Array(width * height * 4);
  const count = width * height;
  if (colour === 6) rgba.set(rows);
  else if (colour === 2) {
    for (let i = 0; i < count; i++) {
      rgba[i * 4] = rows[i * 3];
      rgba[i * 4 + 1] = rows[i * 3 + 1];
      rgba[i * 4 + 2] = rows[i * 3 + 2];
      rgba[i * 4 + 3] = 255;
    }
  } else {
    const entries = palette.length / 3;
    for (let i = 0; i < count; i++) {
      const index = rows[i];
      if (index >= entries) throw new Error(`pixel ${i} uses palette entry ${index}, and the palette has ${entries}`);
      rgba[i * 4] = palette[index * 3];
      rgba[i * 4 + 1] = palette[index * 3 + 1];
      rgba[i * 4 + 2] = palette[index * 3 + 2];
      rgba[i * 4 + 3] = alphas && index < alphas.length ? alphas[index] : 255;
    }
  }
  return { width, height, rgba };
}

/**
 * A PNG file: colour type 6 (RGBA), 8 bits, filter 0 on every row.
 *
 * @param {{ width: number, height: number, rgba: Uint8Array }} image
 * @returns {Buffer}
 */
export function encodePng({ width, height, rgba }) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error(`cannot encode an image ${width} by ${height} pixels`);
  }
  if (rgba.length !== width * height * 4) {
    throw new Error(`the image is ${width} by ${height} but holds ${rgba.length} bytes, not ${width * height * 4}`);
  }
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    // The filter byte stays 0.
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Whether two pictures are the same and, if not, how many pixels differ. Each is
 * an image or the bytes of a PNG file. Alpha is compared with the colour, which
 * changes nothing for the opaque pictures PngDump writes.
 *
 * When the sizes differ, the pictures are laid on one canvas as large as the
 * larger of each dimension, and a pixel that only one of them has counts as
 * differing, so that `differing` is never 0 for pictures of different sizes.
 *
 * @returns {{ sameSize: boolean, differing: number }}
 */
export function comparePngs(a, b) {
  const A = asImage(a);
  const B = asImage(b);
  const w = Math.max(A.width, B.width);
  const h = Math.max(A.height, B.height);
  let differing = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x >= A.width || y >= A.height || x >= B.width || y >= B.height) {
        differing++;
        continue;
      }
      const i = (y * A.width + x) * 4;
      const j = (y * B.width + x) * 4;
      if (
        A.rgba[i] !== B.rgba[j] ||
        A.rgba[i + 1] !== B.rgba[j + 1] ||
        A.rgba[i + 2] !== B.rgba[j + 2] ||
        A.rgba[i + 3] !== B.rgba[j + 3]
      ) {
        differing++;
      }
    }
  }
  return { sameSize: A.width === B.width && A.height === B.height, differing };
}

// ------------------------------------------------------------------ the label font

// A 5 by 7 bitmap font, for the labels above the panels. `#` is a lit pixel. It covers
// what the labels use: A to Z, 0 to 9, space and . - : ( ) /, and , and ? besides, ?
// being what any other character is drawn as.
// biome-ignore format: a table, one glyph to a line, each of its seven rows five characters
const GLYPHS = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  0: [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  1: ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  2: [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  3: [".###.", "#...#", "....#", "..##.", "....#", "#...#", ".###."],
  4: ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  5: ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  6: [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  7: ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  8: [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  9: [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
  ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  ",": [".....", ".....", ".....", ".....", ".##..", "..#..", ".#..."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
};

/** The characters the label font draws as themselves (any other is drawn as ?). Lower case is drawn as upper. */
export const LABEL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .-:()/,?";

/** The glyph rows for a character: five-character strings, seven of them, `#` lit. */
export function glyphRows(ch) {
  return GLYPHS[ch.toUpperCase()] ?? GLYPHS["?"];
}

const GLYPH_W = 5;
const GLYPH_H = 7;

/** The width in pixels of `text` drawn at `scale`: five columns a character and one between. */
const textWidth = (text, scale) => (text.length ? (text.length * (GLYPH_W + 1) - 1) * scale : 0);

/** Draws text into an RGBA buffer `width` pixels wide, with its top left at (x, y), each font pixel `scale` square. */
function drawText(rgba, width, x, y, text, scale, [r, g, b]) {
  const height = rgba.length / 4 / width;
  let left = x;
  for (const ch of text) {
    glyphRows(ch).forEach((row, gy) => {
      for (let gx = 0; gx < GLYPH_W; gx++) {
        if (row[gx] !== "#") continue;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const px = left + gx * scale + dx;
            const py = y + gy * scale + dy;
            if (px < 0 || py < 0 || px >= width || py >= height) continue;
            const i = (py * width + px) * 4;
            rgba[i] = r;
            rgba[i + 1] = g;
            rgba[i + 2] = b;
            rgba[i + 3] = 255;
          }
        }
      }
    });
    left += (GLYPH_W + 1) * scale;
  }
}

// -------------------------------------------------------------- the comparison image

/** The gap between the panels, and the margin round them, in pixels. */
export const GUTTER = 8;
/** Colour of the part of a panel that its picture does not cover, where the other is larger. */
const PAD = [224, 224, 224];
const RED = [255, 0, 0];
const INK = [32, 32, 32];

/**
 * One picture of the two: the twinBASIC picture, the VB6 picture and their difference
 * side by side on a white ground, each under a label. Matching pixels of the difference
 * panel are a faint grey copy of the VB6 picture, and every differing pixel is pure red.
 *
 * The panels are as large as the larger of the two pictures in each dimension, and a
 * picture smaller than that leaves a light grey margin in its panel, and red in the
 * difference panel, since a pixel only one picture has differs. The panel is also at
 * least as wide as its widest label, which a small picture would otherwise cut.
 * There is an 8-pixel margin round the whole and an 8-pixel gutter between panels.
 *
 * @param {{width: number, height: number, rgba: Uint8Array} | Buffer} tb   the twinBASIC picture, or its PNG file
 * @param {{width: number, height: number, rgba: Uint8Array} | Buffer} vb6  the VB6 picture, or its PNG file
 * @param {{tb?: string, vb6?: string, diff?: string}} [labels]  default TWINBASIC, VB6, and the count of
 *   differing pixels (IDENTICAL, or SIZES DIFFER with both sizes when they do)
 * @param {{scale?: number}} [options]  a whole number: each pixel is drawn that many pixels square. The
 *   default is 2 when both pictures are under 200 pixels in both dimensions, else 1.
 * @returns {{width: number, height: number, rgba: Uint8Array, sameSize: boolean, differing: number, scale: number}}
 */
export function composeComparison(tb, vb6, labels = {}, { scale } = {}) {
  const A = asImage(tb);
  const B = asImage(vb6);
  const { sameSize, differing } = comparePngs(A, B);
  const cw = Math.max(A.width, B.width);
  const ch = Math.max(A.height, B.height);
  const S = scale ?? (cw < 200 && ch < 200 ? 2 : 1);
  if (!Number.isInteger(S) || S < 1) throw new Error(`scale must be a whole number of at least 1, got ${scale}`);
  const noun = differing === 1 ? "PIXEL" : "PIXELS";
  const diffLabel = !differing
    ? "IDENTICAL"
    : sameSize
      ? `DIFFERENCE: ${differing} ${noun}`
      : `SIZES DIFFER: ${A.width}X${A.height} VS ${B.width}X${B.height}, ${differing} ${noun}`;
  const texts = [labels.tb ?? "TWINBASIC", labels.vb6 ?? "VB6", labels.diff ?? diffLabel];

  // The font scales with the picture, so that a label under a doubled picture is as legible as it.
  const fs = S;
  const strip = GLYPH_H * fs + 6;
  const panelW = Math.max(cw * S, ...texts.map((t) => textWidth(t, fs)));
  const width = 2 * GUTTER + 3 * panelW + 2 * GUTTER;
  const height = 2 * GUTTER + strip + ch * S;
  const rgba = new Uint8Array(width * height * 4).fill(255);

  const put = (x, y, [r, g, b]) => {
    const i = (y * width + x) * 4;
    rgba[i] = r;
    rgba[i + 1] = g;
    rgba[i + 2] = b;
    rgba[i + 3] = 255;
  };
  // A pixel of an image over white, or null where the image has none.
  const colourAt = (img, x, y) => {
    if (x >= img.width || y >= img.height) return null;
    const i = (y * img.width + x) * 4;
    const a = img.rgba[i + 3];
    const over = (c) => Math.round((c * a + 255 * (255 - a)) / 255);
    return [over(img.rgba[i]), over(img.rgba[i + 1]), over(img.rgba[i + 2])];
  };
  const faint = ([r, g, b]) => {
    const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    const v = 255 - Math.round((255 - luma) * 0.3);
    return [v, v, v];
  };

  const top = GUTTER + strip;
  for (let panel = 0; panel < 3; panel++) {
    const left = GUTTER + panel * (panelW + GUTTER);
    drawText(rgba, width, left, GUTTER + 3, texts[panel], fs, INK);
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const p = colourAt(A, x, y);
        const q = colourAt(B, x, y);
        let colour;
        if (panel === 0) colour = p ?? PAD;
        else if (panel === 1) colour = q ?? PAD;
        else if (!p || !q) colour = RED;
        else {
          // Differing as comparePngs counts it: any channel, alpha included.
          const ia = (y * A.width + x) * 4;
          const ib = (y * B.width + x) * 4;
          const equal =
            A.rgba[ia] === B.rgba[ib] &&
            A.rgba[ia + 1] === B.rgba[ib + 1] &&
            A.rgba[ia + 2] === B.rgba[ib + 2] &&
            A.rgba[ia + 3] === B.rgba[ib + 3];
          colour = equal ? faint(q) : RED;
        }
        for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) put(left + x * S + dx, top + y * S + dy, colour);
      }
    }
  }
  return { width, height, rgba, sameSize, differing, scale: S };
}
