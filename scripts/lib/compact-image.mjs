// What an embedded image keeps: its pixels and any notice of whose it is. scripts/imagestrip/ does what stripFile does, in twinBASIC.

import { inflateSync } from "node:zlib";
import { encodePng } from "./png.mjs";

// The chunks that decide what a PNG looks like: the critical ones and the
// colour-space ones, unless these say only that the picture is sRGB
// (saysOnlySrgb). The rest is an editor's metadata (EXIF, IPTC and XMP
// profiles, "Created with GIMP", the software, times, resolution, a suggested
// background) and is dropped, but for a notice of whose the picture is and on
// what terms (rightsChunk): the IDE's toolbar icons carry ~13 KB of GIMP
// metadata around ~1 KB of pixels, and its lock icon, from fileformat.info,
// the CC BY-NC-SA attribution that must go wherever it does.
const PNG_KEEP = new Set([
  "IHDR",
  "PLTE",
  "tRNS",
  "IDAT",
  "IEND",
  "cHRM",
  "gAMA",
  "iCCP",
  "sBIT",
  "sRGB",
  "cICP",
  "mDCV",
  "cLLI",
  // An animated PNG's frames.
  "acTL",
  "fcTL",
  "fdAT",
]);

// The chunks that say what colour space a PNG is in, dropped together when they
// say only sRGB.
const PNG_COLOUR = new Set(["iCCP", "sRGB", "gAMA", "cHRM"]);

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// sRGB's colourants adapted to D50, as an ICC profile states them.
const SRGB_COLOURANTS = {
  rXYZ: [0.4360747, 0.2225045, 0.0139322],
  gXYZ: [0.3850649, 0.7168786, 0.0971045],
  bXYZ: [0.1430804, 0.0606169, 0.7141733],
};

// sRGB's curve from linear light to the encoded level, 0 to 1.
const srgbEncode = (y) => (y <= 0.0031308 ? 12.92 * y : 1.055 * y ** (1 / 2.4) - 0.055);

// An ICC tone curve tag as a function from the encoded level to linear light,
// or null for a form this does not read (parametric types 1 and 2, which have
// no linear toe and so cannot be sRGB's).
function toneCurve(t) {
  const kind = t?.toString("latin1", 0, 4);
  if (kind === "curv") {
    const n = t.readUInt32BE(8);
    if (n === 0) return (x) => x;
    if (n === 1) {
      const g = t.readUInt16BE(12) / 256;
      return (x) => x ** g;
    }
    const v = Array.from({ length: n }, (_, k) => t.readUInt16BE(12 + 2 * k) / 65535);
    return (x) => {
      const at = x * (n - 1);
      const k = Math.min(Math.floor(at), n - 2);
      return v[k] + (v[k + 1] - v[k]) * (at - k);
    };
  }
  if (kind !== "para") return null;
  const type = t.readUInt16BE(8);
  const p = (k) => t.readInt32BE(12 + 4 * k) / 65536;
  if (type === 0) {
    const g = p(0);
    return (x) => x ** g;
  }
  if (type !== 3 && type !== 4) return null;
  const [g, a, b, c, d] = [0, 1, 2, 3, 4].map(p);
  const [e, f] = type === 4 ? [p(5), p(6)] : [0, 0];
  return (x) => (x >= d ? (a * x + b) ** g + e : c * x + f);
}

/**
 * Whether an ICC profile is sRGB: an RGB profile with sRGB's colourants and
 * three tone curves that each put every 8-bit level within half a level of
 * where sRGB's does, and no lookup table that a colour engine would use
 * instead of them. GIMP embeds its built-in sRGB profile, 672 bytes, in every
 * PNG it saves.
 */
export function isSrgbProfile(p) {
  try {
    if (p.toString("latin1", 16, 20) !== "RGB " || p.toString("latin1", 20, 24) !== "XYZ ") return false;
    const tags = new Map();
    for (let i = 0, n = p.readUInt32BE(128); i < n; i++) {
      const e = 132 + i * 12;
      const at = p.readUInt32BE(e + 4);
      tags.set(p.toString("latin1", e, e + 4), p.subarray(at, at + p.readUInt32BE(e + 8)));
    }
    if ([...tags.keys()].some((sig) => /^(A2B|B2A|D2B|B2D)\d$/.test(sig))) return false;
    for (const [sig, want] of Object.entries(SRGB_COLOURANTS)) {
      const t = tags.get(sig);
      if (t?.toString("latin1", 0, 4) !== "XYZ ") return false;
      if (!want.every((v, k) => Math.abs(t.readInt32BE(8 + 4 * k) / 65536 - v) <= 0.001)) return false;
    }
    for (const sig of ["rTRC", "gTRC", "bTRC"]) {
      const curve = toneCurve(tags.get(sig));
      if (!curve) return false;
      // Written as a test that a NaN fails.
      for (let i = 0; i <= 255; i++) if (!(Math.abs(srgbEncode(curve(i / 255)) - i / 255) <= 0.5 / 255)) return false;
    }
    return true;
  } catch {
    // A profile cut short is not one this can vouch for.
    return false;
  }
}

/**
 * Whether a PNG's colour-space chunks say only that it is sRGB, which is what
 * a browser takes a PNG that says nothing to be: an ICC profile that
 * isSrgbProfile, or, with no profile, an sRGB chunk. A profile outranks the
 * sRGB chunk, and gAMA and cHRM are only a fallback for a reader that knows
 * neither, so they go with them. A cICP chunk outranks all of them and is
 * left to say what it says.
 */
function saysOnlySrgb(chunks) {
  const find = (type) => chunks.find((c) => c.type === type);
  if (find("cICP")) return false;
  const icc = find("iCCP");
  if (!icc) return Boolean(find("sRGB"));
  const name = icc.data.indexOf(0);
  if (name < 0 || icc.data[name + 1] !== 0) return false;
  try {
    return isSrgbProfile(inflateSync(icc.data.subarray(name + 2)));
  } catch {
    // A profile that does not inflate is not one this can vouch for.
    return false;
  }
}

// The keywords of a PNG text chunk that name a picture, its author, its source
// or its terms: what a licence such as CC BY requires shown with the picture.
// Of the PNG specification's own, only Software, Comment, Creation Time and
// Warning are left out.
const RIGHTS_KEYWORDS = new Set(["Title", "Author", "Description", "Source", "Copyright", "Disclaimer"]);

// An XMP property that names a picture's author or terms, when it has a value.
const XMP_RIGHTS =
  /^(dc:rights|dc:creator|xmpRights:\w+|cc:\w+|plus:(?:Licensor|CopyrightOwner|ImageCreator|ImageSupplier)|photoshop:(?:Credit|Source|AuthorsPosition))$/;

/** Whether an XMP packet gives a value to a property that names the picture's author or terms. */
export function xmpHasRights(xml) {
  // As an attribute: xmpRights:WebStatement="...".
  for (const m of xml.matchAll(/\s([\w-]+:[\w-]+)="([^"]*)"/g)) if (XMP_RIGHTS.test(m[1]) && m[2].trim()) return true;
  // As an element, with text inside it however deep, or with a value in an attribute of its own
  // (<cc:license rdf:resource="..."/>).
  for (const m of xml.matchAll(/<([\w-]+:[\w-]+)\b([^>]*?)(\/?)>/g)) {
    if (!XMP_RIGHTS.test(m[1])) continue;
    if (/="[^"]*\S[^"]*"/.test(m[2])) return true;
    if (m[3]) continue;
    const start = m.index + m[0].length;
    const end = xml.indexOf(`</${m[1]}>`, start);
    if (
      end > 0 &&
      xml
        .slice(start, end)
        .replace(/<[^>]*>/g, "")
        .trim()
    )
      return true;
  }
  return false;
}

/**
 * Whether an EXIF block (a TIFF header and its first IFD, with or without the
 * "Exif\0\0" before it) gives an Artist (0x013B) or a Copyright (0x8298) tag a
 * value longer than its closing NUL.
 */
export function exifHasRights(b) {
  const start = b.subarray(0, 6).toString("latin1") === "Exif\0\0" ? 6 : 0;
  const order = b.toString("latin1", start, start + 2);
  if (order !== "II" && order !== "MM") return false;
  const u16 = (p) => (order === "II" ? b.readUInt16LE(start + p) : b.readUInt16BE(start + p));
  const u32 = (p) => (order === "II" ? b.readUInt32LE(start + p) : b.readUInt32BE(start + p));
  try {
    const ifd = u32(4);
    const n = u16(ifd);
    for (let k = 0; k < n; k++) {
      const e = ifd + 2 + k * 12;
      const tag = u16(e);
      if ((tag === 0x013b || tag === 0x8298) && u32(e + 4) > 1) return true;
    }
  } catch {
    // A block cut short holds nothing this can read.
  }
  return false;
}

// IPTC datasets that name the author or the terms: By-line (2:80), Credit
// (2:110), Source (2:115), Copyright Notice (2:116).
const IPTC_RIGHTS = new Set([80, 110, 115, 116]);

/** Whether an IPTC block holds a By-line, Credit, Source or Copyright Notice with a value. */
export function iptcHasRights(b) {
  for (let p = 0; p + 5 <= b.length; p++)
    if (b[p] === 0x1c && b[p + 1] === 2 && IPTC_RIGHTS.has(b[p + 2]) && b.readUInt16BE(p + 3) > 0) return true;
  return false;
}

// The bytes of an ImageMagick "Raw profile type" text: a line naming the
// profile, one with its length, and the bytes in hexadecimal.
function rawProfile(text) {
  const lines = text.trim().split(/\n/);
  return Buffer.from(lines.slice(2).join("").replace(/\s+/g, ""), "hex");
}

/**
 * Whether a PNG chunk is a notice of whose the picture is and on what terms:
 * a text chunk (tEXt, zTXt, iTXt) with a keyword of RIGHTS_KEYWORDS or one
 * naming a licence or rights, or an EXIF, IPTC or XMP profile (in a text
 * chunk, or eXIf) that holds such a notice of its own. A chunk that cannot be
 * read is kept: dropping a notice is the mistake to avoid.
 */
export function rightsChunk(type, data) {
  try {
    if (type === "eXIf") return exifHasRights(data);
    if (type !== "tEXt" && type !== "zTXt" && type !== "iTXt") return false;
    const z = data.indexOf(0);
    const keyword = data.toString("latin1", 0, z);
    if (RIGHTS_KEYWORDS.has(keyword) || /licen[cs]e|rights/i.test(keyword)) return true;
    let text;
    if (type === "tEXt") text = data.toString("latin1", z + 1);
    else if (type === "zTXt") text = inflateSync(data.subarray(z + 2)).toString("latin1");
    else {
      // iTXt: keyword, NUL, compression flag, method, language, NUL, translated keyword, NUL, text.
      const lang = data.indexOf(0, z + 3);
      const rest = data.subarray(data.indexOf(0, lang + 1) + 1);
      text = (data[z + 1] ? inflateSync(rest) : rest).toString("utf8");
    }
    if (keyword === "XML:com.adobe.xmp") return xmpHasRights(text);
    if (/^Raw profile type (exif|APP1)$/i.test(keyword)) return exifHasRights(rawProfile(text));
    // Bare or inside Photoshop's 8BIM resources, which GIMP writes: the scan finds the datasets either way.
    if (/^Raw profile type iptc$/i.test(keyword)) return iptcHasRights(rawProfile(text));
    return false;
  } catch {
    return true;
  }
}

/**
 * A BMP file as RGBA pixels, or null when it is not one this reads: the
 * uncompressed 24 and 32 bits per pixel forms (BI_RGB, BI_BITFIELDS and
 * BI_ALPHABITFIELDS), which is what a canvas or a GDI capture writes.
 * Chromium sniffs a data: image by its bytes, so a BMP is found behind any
 * image/ type, the IDE's report designer calls its page background image/png.
 */
export function decodeBmp(b) {
  if (b.length < 54 || b[0] !== 0x42 || b[1] !== 0x4d) return null;
  const headerSize = b.readUInt32LE(14);
  if (headerSize < 40) return null;
  const width = b.readInt32LE(18);
  const rawHeight = b.readInt32LE(22);
  const height = Math.abs(rawHeight);
  const bpp = b.readUInt16LE(28);
  const compression = b.readUInt32LE(30);
  if (width < 1 || height < 1 || (bpp !== 24 && bpp !== 32) || ![0, 3, 6].includes(compression)) return null;
  if (bpp === 24 && compression !== 0) return null;
  const offset = b.readUInt32LE(10);
  const stride = ((width * bpp + 31) >> 5) * 4;
  if (offset + stride * height > b.length) return null;
  // The channel masks: in the header from V3 on (56 bytes), else after the 40-byte one.
  let masks = [0x00ff0000, 0x0000ff00, 0x000000ff, 0xff000000];
  if (bpp === 32 && compression !== 0) {
    if (b.length < 14 + 40 + 12) return null;
    masks = [b.readUInt32LE(54), b.readUInt32LE(58), b.readUInt32LE(62), 0];
    if (headerSize >= 56 || compression === 6) masks[3] = b.readUInt32LE(66);
  }
  const channel = (mask) => {
    if (!mask) return null;
    let shift = 0;
    while (!((mask >>> shift) & 1)) shift++;
    let bits = 0;
    while ((mask >>> (shift + bits)) & 1) bits++;
    return { mask, shift, max: 2 ** bits - 1 };
  };
  const [cr, cg, cb, ca] = masks.map(channel);
  if (!cr || !cg || !cb) return null;
  const rgba = Buffer.alloc(width * height * 4);
  let anyAlpha = false;
  for (let y = 0; y < height; y++) {
    const src = offset + (rawHeight > 0 ? height - 1 - y : y) * stride;
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      if (bpp === 24) {
        rgba[o] = b[src + x * 3 + 2];
        rgba[o + 1] = b[src + x * 3 + 1];
        rgba[o + 2] = b[src + x * 3];
        rgba[o + 3] = 255;
      } else {
        const v = b.readUInt32LE(src + x * 4);
        const get = (c) => Math.round((((v & c.mask) >>> c.shift) * 255) / c.max);
        rgba[o] = get(cr);
        rgba[o + 1] = get(cg);
        rgba[o + 2] = get(cb);
        rgba[o + 3] = ca ? get(ca) : 255;
        if (ca && rgba[o + 3]) anyAlpha = true;
      }
    }
  }
  // As Chromium decodes it: a 32-bit image whose alpha is all zero is opaque.
  if (bpp === 32 && ca && !anyAlpha) for (let o = 3; o < rgba.length; o += 4) rgba[o] = 255;
  return { width, height, rgba };
}

/**
 * The orientation an EXIF block (as exifHasRights takes it) gives the picture:
 * its Orientation tag (0x0112), 1 (as stored) when it has none. Chromium turns
 * a JPEG, and a PNG with an eXIf chunk, by it.
 */
export function exifOrientation(b) {
  const start = b.subarray(0, 6).toString("latin1") === "Exif\0\0" ? 6 : 0;
  const order = b.toString("latin1", start, start + 2);
  if (order !== "II" && order !== "MM") return 1;
  const u16 = (p) => (order === "II" ? b.readUInt16LE(start + p) : b.readUInt16BE(start + p));
  const u32 = (p) => (order === "II" ? b.readUInt32LE(start + p) : b.readUInt32BE(start + p));
  try {
    const ifd = u32(4);
    for (let k = 0, n = u16(ifd); k < n; k++) {
      const e = ifd + 2 + k * 12;
      if (u16(e) === 0x0112) return u16(e + 8);
    }
  } catch {
    // A block cut short gives no orientation.
  }
  return 1;
}

// Whether a comment holds a notice of whose a picture is: a copyright or a licence.
const noticeText = (text) => /©|\(c\)|copyright|licen[cs]e|all rights reserved/i.test(text);

/**
 * A PNG without its metadata: the chunks of PNG_KEEP, but for colour-space
 * chunks that say only sRGB, rightsChunk's, and an eXIf that turns it.
 */
export function compactPng(b) {
  const chunks = [];
  for (let p = 8; p + 12 <= b.length; ) {
    const len = b.readUInt32BE(p);
    const type = b.toString("latin1", p + 4, p + 8);
    chunks.push({ type, data: b.subarray(p + 8, p + 8 + len), bytes: b.subarray(p, p + 12 + len) });
    p += 12 + len;
  }
  const srgb = saysOnlySrgb(chunks);
  const keep = ({ type, data }) =>
    srgb && PNG_COLOUR.has(type)
      ? false
      : PNG_KEEP.has(type) || rightsChunk(type, data) || (type === "eXIf" && exifOrientation(data) !== 1);
  return Buffer.concat([b.subarray(0, 8), ...chunks.filter(keep).map((c) => c.bytes)]);
}

/**
 * A JPEG without its metadata: the segments that decode it (the frame, the
 * tables, JFIF, the ICC profile in APP2 and Adobe's colour transform in APP14)
 * stay, and EXIF, XMP, Photoshop's IPTC, comments and other applications'
 * segments go, but for one that holds a notice of whose the picture is, and an
 * EXIF that turns it. The image data from the start of the scan is untouched.
 * A JPEG this cannot follow is returned as it was.
 */
export function compactJpeg(b) {
  const kept = [b.subarray(0, 2)];
  let p = 2;
  while (p + 4 <= b.length) {
    if (b[p] !== 0xff) return b;
    const marker = b[p + 1];
    if (marker === 0xda || marker === 0xd9) {
      kept.push(b.subarray(p));
      return Buffer.concat(kept);
    }
    // A fill byte before a marker, and the markers that have no length.
    if (marker === 0xff) {
      p++;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      kept.push(b.subarray(p, p + 2));
      p += 2;
      continue;
    }
    const len = b.readUInt16BE(p + 2);
    const segment = b.subarray(p, p + 2 + len);
    const data = b.subarray(p + 4, p + 2 + len);
    let keep = true;
    if (marker === 0xe1) {
      const exif = data.subarray(0, 6).toString("latin1") === "Exif\0\0";
      const xmp = data.toString("latin1", 0, 29) === "http://ns.adobe.com/xap/1.0/\0";
      if (exif) keep = exifHasRights(data) || exifOrientation(data) !== 1;
      else if (xmp) keep = xmpHasRights(data.toString("utf8", 29));
      else keep = false;
    } else if (marker === 0xed) keep = iptcHasRights(data);
    else if (marker === 0xfe) keep = noticeText(data.toString("utf8"));
    else if (marker >= 0xe3 && marker <= 0xef && marker !== 0xee) keep = false;
    if (keep) kept.push(segment);
    p += 2 + len;
  }
  return b;
}

/**
 * A GIF without its comments, nor an XMP packet that names no author or terms:
 * every other block, the animation's included, stays as it was. A GIF this
 * cannot follow is returned as it was.
 */
export function compactGif(b) {
  try {
    let p = 13;
    if (b[10] & 0x80) p += 3 * 2 ** ((b[10] & 7) + 1);
    const kept = [b.subarray(0, p)];
    // The end of the sub-blocks that start at q.
    const blocks = (q) => {
      while (b[q]) q += b[q] + 1;
      return q + 1;
    };
    while (p < b.length) {
      if (b[p] === 0x3b) {
        kept.push(b.subarray(p, p + 1));
        return Buffer.concat(kept);
      }
      let end;
      let keep = true;
      if (b[p] === 0x21) {
        end = blocks(p + 2);
        if (b[p + 1] === 0xfe) {
          const parts = [];
          for (let q = p + 2; b[q]; q += b[q] + 1) parts.push(b.subarray(q + 1, q + 1 + b[q]));
          keep = noticeText(Buffer.concat(parts).toString("latin1"));
        } else if (b[p + 1] === 0xff && b.toString("latin1", p + 3, p + 14) === "XMP DataXMP")
          keep = xmpHasRights(b.toString("utf8", p + 14, end));
      } else if (b[p] === 0x2c) {
        let q = p + 10;
        if (b[p + 9] & 0x80) q += 3 * 2 ** ((b[p + 9] & 7) + 1);
        end = blocks(q + 1);
      } else return b;
      if (end > b.length) return b;
      if (keep) kept.push(b.subarray(p, end));
      p = end;
    }
  } catch {
    // Fall through: a GIF cut short is left as it was.
  }
  return b;
}

/**
 * Which UTF-16 units of an SVG's text are the SVG's own and not only its
 * editor's: 1 for each kept, 0 for each of the XML declaration (<?xml and
 * white space: <?xml-stylesheet?> styles the picture and stays), a DOCTYPE that
 * declares nothing (one whose internal subset declares the entities an
 * Illustrator file uses stays), comments ("Creator: CorelDRAW", "Generator:
 * Adobe Illustrator") and metadata elements, but for a comment or metadata
 * that holds a notice of whose the picture is, and for the white space then
 * left at either end. A CDATA section, in which a comment is text (CorelDRAW
 * writes its styles in one), is left as it is, and so is a metadata element
 * with one inside it. Each step reads what the one before left, as a chain of
 * String.replace calls would.
 */
function svgKeep(text) {
  const keep = new Uint8Array(text.length).fill(1);
  const part = (s, e, first) => {
    let w = text.slice(s, e);
    let wo = Array.from({ length: e - s }, (_, k) => s + k);
    const step = (matches, drop) => {
      const cut = new Uint8Array(w.length);
      for (const m of matches) if (m && drop(m)) cut.fill(1, m.index, m.index + m[0].length);
      let out = "";
      const outo = [];
      for (let k = 0; k < w.length; k++) {
        if (cut[k]) keep[wo[k]] = 0;
        else {
          out += w[k];
          outo.push(wo[k]);
        }
      }
      w = out;
      wo = outo;
    };
    if (first) {
      step([/^\u{FEFF}?\s*<\?xml\s[^?]*\?>\s*/u.exec(w)], () => true);
      step([/<!DOCTYPE\s[^[>]*>\s*/i.exec(w)], () => true);
    }
    step(w.matchAll(/<!--([\s\S]*?)-->/g), (m) => !noticeText(m[1]));
    step(
      w.matchAll(/<metadata\b[^>]*\/>|<metadata\b[^>]*>[\s\S]*?<\/metadata>/gi),
      (m) => !(noticeText(m[0]) || xmpHasRights(m[0]) || /<cc:(License|license)\b/.test(m[0])),
    );
  };
  let from = 0;
  for (const m of text.matchAll(/<!\[CDATA\[[\s\S]*?\]\]>/g)) {
    part(from, m.index, from === 0);
    from = m.index + m[0].length;
  }
  part(from, text.length, from === 0);
  // String.trim over what is kept.
  for (let k = 0; k < text.length && !(keep[k] && !/\s/.test(text[k])); k++) keep[k] = 0;
  for (let k = text.length - 1; k >= 0 && !(keep[k] && !/\s/.test(text[k])); k--) keep[k] = 0;
  return keep;
}

/**
 * An SVG's text without what only its editor needs (svgKeep), and with each
 * image it embeds as a data: URI stripped by the rules of stripFile.
 */
export function compactSvgText(text) {
  const b = Buffer.from(text, "utf8");
  const edits = stripSvgBytes(b, { images: 0, stripped: 0, relabelled: 0, report() {} }, () => 0);
  return applyEdits(b, edits).toString("utf8");
}

/**
 * A data: image as small as it can be without changing a pixel or losing a
 * notice of whose it is. A PNG, a JPEG and a GIF lose their metadata but those
 * notices, and are named by what their bytes are rather than by the type the
 * page gave them (the IDE calls a JPEG and BMPs image/png); a BMP becomes a
 * PNG; an SVG loses what only its editor needs and is stored as text rather
 * than base64, so that the picture's own compression reaches it. Anything else
 * is returned as it was.
 */
export function compactImage(url) {
  const m = /^data:(image\/[a-z.+-]+)(;[^,]*)?,(.*)$/s.exec(url);
  if (!m) return url;
  const base64 = /;base64$/.test(m[2] ?? "");
  if (m[1] !== "image/svg+xml") {
    if (!base64) return url;
    const b = Buffer.from(m[3].trim(), "base64");
    const bmp = decodeBmp(b);
    const as = (type, bytes) => `data:${type};base64,${bytes.toString("base64")}`;
    if (bmp) return as("image/png", encodePng(bmp));
    if (b.subarray(0, 8).equals(PNG_SIGNATURE)) return as("image/png", compactPng(b));
    if (b[0] === 0xff && b[1] === 0xd8) return as("image/jpeg", compactJpeg(b));
    if (b.toString("latin1", 0, 4) === "GIF8") return as("image/gif", compactGif(b));
    return url;
  }
  let text;
  try {
    text = base64 ? Buffer.from(m[3].trim(), "base64").toString("utf8") : decodeURIComponent(m[3]);
  } catch {
    // A stray % that is no escape: the URL as it is, which a browser reads the same way.
    return url;
  }
  return `data:image/svg+xml,${compactSvgText(text).replace(/%/g, "%25").replace(/#/g, "%23")}`;
}

// --- Whole files ----------------------------------------------------------------
//
// What scripts/imagestrip/ makes of a CSS file or an SVG file, byte for byte, which is what its
// tests check it against. Each image embedded as a data: URI is stripped as compactImage strips
// it, and an SVG image is stripped as an SVG file is, so an image inside an SVG inside a CSS file
// is reached. An image keeps the encoding it has: base64 is written again only when its image
// changed, and an SVG written as text has the characters it loses cut out of the text as the file
// has it, CSS escapes and percent escapes and all. Where compactImage would make a BMP a PNG,
// this only labels it image/bmp.

// A change to a file's bytes: [start, end) replaced by text, which is ASCII.
// applyEdits takes them in any order, and lets them overlap.
function applyEdits(b, edits) {
  const drop = new Uint8Array(b.length);
  const insert = new Map();
  for (const { start, end, text } of edits) {
    drop.fill(1, start, end);
    if (text) insert.set(start, (insert.get(start) ?? "") + text);
  }
  // run is where the bytes not yet copied start.
  const parts = [];
  let run = 0;
  for (let i = 0; i < b.length; i++) {
    if (!insert.has(i) && !drop[i]) continue;
    parts.push(b.subarray(run, i));
    if (insert.has(i)) parts.push(Buffer.from(insert.get(i), "latin1"));
    run = drop[i] ? i + 1 : i;
  }
  parts.push(b.subarray(run));
  return Buffer.concat(parts);
}

const hexDigit = (c) => (c >= 48 && c <= 57 ? c - 48 : c >= 65 && c <= 70 ? c - 55 : c >= 97 && c <= 102 ? c - 87 : -1);

// A code point as UTF-8; a lone surrogate as the three bytes of its value.
function utf8Of(cp) {
  if (cp < 0x80) return [cp];
  if (cp < 0x800) return [0xc0 | (cp >> 6), 0x80 | (cp & 63)];
  if (cp < 0x10000) return [0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)];
  return [0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)];
}

/**
 * Bytes as UTF-8, into UTF-16 units: unit k came from bytes [s[k], e[k]), the
 * low half of a pair from none of its own. valid is false when a byte begins
 * no valid sequence.
 */
function utf8Units(b) {
  const units = [];
  const s = [];
  const e = [];
  let valid = true;
  for (let p = 0; p < b.length; ) {
    const c0 = b[p];
    let cp = 0;
    let need = -1;
    let lo = 0x80;
    let hi = 0xbf;
    if (c0 < 0x80) [cp, need] = [c0, 0];
    else if (c0 >= 0xc2 && c0 <= 0xdf) [cp, need] = [c0 & 0x1f, 1];
    else if (c0 >= 0xe0 && c0 <= 0xef) {
      [cp, need] = [c0 & 0xf, 2];
      if (c0 === 0xe0) lo = 0xa0;
      if (c0 === 0xed) hi = 0x9f;
    } else if (c0 >= 0xf0 && c0 <= 0xf4) {
      [cp, need] = [c0 & 7, 3];
      if (c0 === 0xf0) lo = 0x90;
      if (c0 === 0xf4) hi = 0x8f;
    }
    let ok = need >= 0 && p + need < b.length;
    for (let i = 1; ok && i <= need; i++) {
      if (b[p + i] < lo || b[p + i] > hi) ok = false;
      cp = cp * 64 + (b[p + i] & 0x3f);
      lo = 0x80;
      hi = 0xbf;
    }
    if (!ok) {
      valid = false;
      units.push(0xfffd);
      s.push(p);
      e.push(p + 1);
      p++;
    } else if (cp >= 0x10000) {
      units.push(0xd800 + ((cp - 0x10000) >> 10), 0xdc00 + ((cp - 0x10000) & 1023));
      s.push(p, p + 4);
      e.push(p + 4, p + 4);
      p += 4;
    } else {
      units.push(cp);
      s.push(p);
      e.push(p + need + 1);
      p += need + 1;
    }
  }
  return { units, s, e, valid };
}

// UTF-16 units t[start, finish) as UTF-8: byte k came from units [s[k], e[k]).
function unitsUtf8(t, start, finish) {
  const bytes = [];
  const s = [];
  const e = [];
  for (let k = start; k < finish; ) {
    let cp = t[k];
    let width = 1;
    if (cp >= 0xd800 && cp <= 0xdbff && k + 1 < finish && t[k + 1] >= 0xdc00 && t[k + 1] <= 0xdfff) {
      cp = 0x10000 + (cp - 0xd800) * 1024 + (t[k + 1] - 0xdc00);
      width = 2;
    }
    for (const byte of utf8Of(cp)) {
      bytes.push(byte);
      s.push(k);
      e.push(k + width);
    }
    k += width;
  }
  return { bytes, s, e };
}

/**
 * The URL a CSS string or url() holds in bytes t[start, finish), its escapes
 * undone as CSS Syntax undoes them, as UTF-8: byte k came from t[s[k], e[k]).
 */
function cssUnescape(t, start, finish) {
  const bytes = [];
  const s = [];
  const e = [];
  const add = (byte, a, z) => {
    bytes.push(byte);
    s.push(a);
    e.push(z);
  };
  for (let i = start; i < finish; ) {
    if (t[i] !== 92) {
      add(t[i], i, i + 1);
      i++;
      continue;
    }
    const j = i + 1;
    if (j >= finish) {
      for (const byte of utf8Of(0xfffd)) add(byte, i, finish);
      i = finish;
    } else if (t[j] === 10 || t[j] === 12) i = j + 1;
    else if (t[j] === 13) i = j + 1 < finish && t[j + 1] === 10 ? j + 2 : j + 1;
    else if (hexDigit(t[j]) >= 0) {
      let cp = 0;
      let k = j;
      while (k < finish && k < j + 6 && hexDigit(t[k]) >= 0) cp = cp * 16 + hexDigit(t[k++]);
      if (k < finish && [9, 10, 12, 32].includes(t[k])) k++;
      else if (k < finish && t[k] === 13) k += k + 1 < finish && t[k + 1] === 10 ? 2 : 1;
      if (cp === 0 || (cp >= 0xd800 && cp <= 0xdfff) || cp > 0x10ffff) cp = 0xfffd;
      for (const byte of utf8Of(cp)) add(byte, i, k);
      i = k;
    } else {
      // The character after the backslash, as it is: all the bytes of its UTF-8.
      let n = t[j] >= 0xf0 ? 4 : t[j] >= 0xe0 ? 3 : t[j] >= 0xc0 ? 2 : 1;
      if (j + n > finish) n = finish - j;
      for (let k = j; k < j + n; k++) add(t[k], i, j + n);
      i = j + n;
    }
  }
  return { bytes, s, e };
}

// Percent-decodes a URL as decodeURIComponent does, its spans carried through; null for a % that
// is no escape.
function percentDecode({ bytes: u, s: us, e: ue }) {
  const bytes = [];
  const s = [];
  const e = [];
  for (let i = 0; i < u.length; ) {
    if (u[i] !== 37) {
      bytes.push(u[i]);
      s.push(us[i]);
      e.push(ue[i]);
      i++;
      continue;
    }
    if (i + 2 >= u.length || hexDigit(u[i + 1]) < 0 || hexDigit(u[i + 2]) < 0) return null;
    bytes.push(hexDigit(u[i + 1]) * 16 + hexDigit(u[i + 2]));
    s.push(us[i]);
    e.push(ue[i + 2]);
    i += 3;
  }
  return { bytes, s, e };
}

/**
 * Base64 as a browser decodes a data: URI (forgiving-base64): white space
 * ignored, and up to two = at the end of a multiple of four; null for what it
 * refuses, and for nothing at all.
 */
export function decodeBase64(bytes) {
  let s = "";
  for (const c of bytes) if (![9, 10, 12, 13, 32].includes(c)) s += String.fromCharCode(c);
  if (s.length % 4 === 0) s = s.replace(/==?$/, "");
  if (s.length === 0 || s.length % 4 === 1 || /[^A-Za-z0-9+/]/.test(s)) return null;
  return Buffer.from(s, "base64");
}

// The type an image's bytes say it is, of those this strips; null for any other.
function imageKind(b) {
  if (b.length >= 8 && b.subarray(0, 8).equals(PNG_SIGNATURE)) return "image/png";
  if (b.length >= 2 && b[0] === 0xff && b[1] === 0xd8) return "image/jpeg";
  if (b.toString("latin1", 0, 4) === "GIF8") return "image/gif";
  if (b.length >= 54 && b[0] === 0x42 && b[1] === 0x4d && b.readUInt32LE(14) >= 40) return "image/bmp";
  return null;
}

const DESCRIBE = { "image/png": "a PNG", "image/jpeg": "a JPEG", "image/gif": "a GIF", "image/bmp": "a BMP" };

const isHeaderChar = (c) =>
  c === 43 || (c >= 45 && c <= 57) || c === 59 || c === 61 || (c >= 65 && c <= 90) || c === 95 || (c >= 97 && c <= 122);

const isSpace = (c) => c === 9 || c === 10 || c === 12 || c === 13 || c === 32;

// The references XML defines without a DTD.
const XML_ENTITIES = { lt: 60, gt: 62, amp: 38, quot: 34, apos: 39 };

/**
 * The character reference or predefined entity reference at t[i], which is
 * "&": { cp, end }, or null when there is none there, or one for no character
 * (a reference to an entity a DTD declares, such as Illustrator's &ns_svg;,
 * stays as it is written).
 */
function xmlReference(t, i) {
  let k = i + 1;
  let cp = 0;
  if (t[k] === 35) {
    const hex = t[k + 1] === 120;
    k += hex ? 2 : 1;
    const from = k;
    for (; k < t.length && k < from + 8; k++) {
      const v = hex ? hexDigit(t[k]) : t[k] >= 48 && t[k] <= 57 ? t[k] - 48 : -1;
      if (v < 0) break;
      cp = cp * (hex ? 16 : 10) + v;
    }
    if (k === from || t[k] !== 59 || cp < 1 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) return null;
    return { cp, end: k + 1 };
  }
  let name = "";
  for (; k < t.length && k < i + 6 && t[k] >= 97 && t[k] <= 122; k++) name += String.fromCharCode(t[k]);
  if (t[k] !== 59 || !Object.hasOwn(XML_ENTITIES, name)) return null;
  return { cp: XML_ENTITIES[name], end: k + 1 };
}

/**
 * An SVG's text t with its references undone, as an XML parser undoes them,
 * but in CDATA sections: unit k came from t[s[k], e[k]), and ref[k] says
 * whether it was written as a reference. A quote written as one does not end
 * an attribute's value, so payloadEnd tells the two apart.
 */
function xmlDecode(t) {
  const units = [];
  const s = [];
  const e = [];
  const ref = [];
  const push = (u, a, z, r) => {
    units.push(u);
    s.push(a);
    e.push(z);
    ref.push(r);
  };
  const at = (k, text) => [...text].every((c, j) => t[k + j] === c.charCodeAt(0));
  for (let i = 0; i < t.length; ) {
    if (t[i] === 60 && at(i, "<![CDATA[")) {
      let close = -1;
      for (let k = i + 9; k + 3 <= t.length; k++)
        if (at(k, "]]>")) {
          close = k;
          break;
        }
      if (close >= 0) {
        for (; i < close + 3; i++) push(t[i], i, i + 1, 0);
        continue;
      }
    }
    const r = t[i] === 38 ? xmlReference(t, i) : null;
    if (!r) {
      push(t[i], i, i + 1, 0);
      i++;
    } else if (r.cp >= 0x10000) {
      push(0xd800 + ((r.cp - 0x10000) >> 10), i, r.end, 1);
      push(0xdc00 + ((r.cp - 0x10000) & 1023), i, r.end, 1);
      i = r.end;
    } else {
      push(r.cp, i, r.end, 1);
      i = r.end;
    }
  }
  return { units, s, e, ref };
}

/**
 * Where the text of the data: URI at t[start] ends: at the quote just before
 * it, or at the ) of a url( before it, white space between them allowed, with
 * the white space before that ) left out. In CSS a backslash escapes the
 * character after it, and a string ends at a line end; in an SVG neither, and
 * a quote written as a reference (ref) is ended only by a quote written as
 * one, a quote written as itself only by itself. -1 for no such end, or no
 * such opener.
 */
function payloadEnd(t, n, css, start, comma, ref) {
  let p = start - 1;
  while (p >= 0 && isSpace(t[p])) p--;
  const q = p >= 0 ? t[p] : -1;
  const closer = p === start - 1 && (q === 34 || q === 39) ? q : q === 40 ? 41 : -1;
  if (closer < 0) return -1;
  const byRef = ref && closer !== 41 ? ref[p] : 0;
  let k = comma + 1;
  while (k < n && !(t[k] === closer && (!ref || closer === 41 || ref[k] === byRef))) {
    if (css && t[k] === 92) k += 2;
    else if (css && closer !== 41 && (t[k] === 10 || t[k] === 12 || t[k] === 13)) return -1;
    else k++;
  }
  if (k >= n) return -1;
  if (closer === 41) while (k > comma + 1 && isSpace(t[k - 1])) k--;
  return k;
}

/**
 * The edits that strip each image embedded as a data: URI in t[0, n): bytes
 * of a CSS file (css), or the UTF-16 units of an SVG. A URI's header runs from
 * data: to a comma, in at most 127 characters; its text, to its closer. An
 * image in base64 is known by its bytes, whatever its label, and an SVG by its
 * label, as is a style sheet (text/css), whose images are stripped in turn.
 * at(i) is the offset in the file a report on a URI at t[i] names; ref,
 * for an SVG, says which units were written as references (xmlDecode).
 */
function scanUris(t, n, css, ctx, at, ref = null) {
  const edits = [];
  for (let i = 0; i + 5 <= n; ) {
    let end = -1;
    if (
      (t[i] | 32) === 100 &&
      (t[i + 1] | 32) === 97 &&
      (t[i + 2] | 32) === 116 &&
      (t[i + 3] | 32) === 97 &&
      t[i + 4] === 58
    ) {
      let comma = -1;
      for (let j = i + 5; j <= i + 132 && j < n; j++) {
        if (t[j] === 44) comma = j;
        if (!isHeaderChar(t[j])) break;
      }
      if (comma >= 0) end = stripUri(t, n, css, i, comma, edits, ctx, at(i), ref);
    }
    i = end >= 0 ? end : i + 1;
  }
  return edits;
}

// Adds the edits for the data: URI at t[start], whose header ends at t[comma], and returns where
// its text ends; -1 when it is none this reads.
function stripUri(t, n, css, start, comma, edits, ctx, pos, ref) {
  let header = "";
  for (let k = start + 5; k < comma; k++) header += String.fromCharCode(t[k]);
  const label = header.split(";")[0].toLowerCase();
  const base64 = header.toLowerCase().endsWith(";base64");
  // A style sheet is stripped as a CSS file is: the images it embeds.
  const sheet = label === "text/css";
  if (!base64 && label !== "image/svg+xml" && !sheet) return -1;
  const end = payloadEnd(t, n, css, start, comma, ref);
  if (end <= comma + 1) return -1;
  const url = css ? cssUnescape(t, comma + 1, end) : unitsUtf8(t, comma + 1, end);
  if (!base64) {
    const text = url.bytes.length ? percentDecode(url) : null;
    const inner = !text
      ? null
      : sheet
        ? scanUris(text.bytes, text.bytes.length, true, ctx, () => pos)
        : stripSvgBytes(Buffer.from(text.bytes), ctx, () => pos);
    if (!inner) ctx.report(pos, `${sheet ? "a style sheet" : "an SVG"} this cannot read; left unchanged`);
    else for (const x of inner) edits.push({ start: text.s[x.start], end: text.e[x.end - 1], text: x.text });
    return end;
  }
  const data = decodeBase64(url.bytes);
  if (!data) {
    if (label.startsWith("image/") || sheet)
      ctx.report(pos, `labelled ${label}, but its base64 cannot be read; left unchanged`);
    return end;
  }
  if (sheet) {
    const out = applyEdits(
      data,
      scanUris(data, data.length, true, ctx, () => pos),
    );
    if (!out.equals(data)) edits.push({ start: comma + 1, end, text: out.toString("base64") });
    return end;
  }
  let kind = label;
  let out;
  if (label === "image/svg+xml") {
    const inner = stripSvgBytes(data, ctx, () => pos);
    if (!inner) {
      ctx.report(pos, "an SVG that is not UTF-8; left unchanged");
      return end;
    }
    out = applyEdits(data, inner);
  } else {
    kind = imageKind(data);
    if (!kind) {
      if (["image/png", "image/jpeg", "image/jpg", "image/gif", "image/bmp"].includes(label))
        ctx.report(pos, `labelled ${label}, but is no image this reads; left unchanged`);
      return end;
    }
    ctx.images++;
    out = { "image/png": compactPng, "image/jpeg": compactJpeg, "image/gif": compactGif }[kind]?.(data) ?? data;
    if (out.length < data.length) ctx.stripped++;
  }
  if (kind !== label) {
    edits.push({ start: start + 5, end: start + 5 + label.length, text: kind });
    ctx.relabelled++;
    ctx.report(pos, `labelled ${label}, but is ${DESCRIBE[kind]}; now labelled ${kind}`);
  }
  if (!out.equals(data)) edits.push({ start: comma + 1, end, text: out.toString("base64") });
  return end;
}

const isTagStart = (c) => (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95 || c === 58 || c >= 128;
const isTagChar = (c) => isTagStart(c) || (c >= 48 && c <= 57) || c === 45 || c === 46;

/**
 * Where an SVG's text t holds CSS: the text of each <style> element, CDATA and
 * all, and the value of each style attribute (attribute: true), as
 * [{ start, end, attribute }] in t. Comments, CDATA sections, processing
 * instructions and declarations are passed over, and so is the rest of a tag.
 */
function cssRegions(t) {
  const n = t.length;
  const regions = [];
  const at = (k, text) => [...text].every((c, j) => t[k + j] === c.charCodeAt(0));
  const indexOf = (text, from) => {
    for (let k = from; k + text.length <= n; k++) if (at(k, text)) return k;
    return -1;
  };
  const skipTo = (text, from) => {
    const k = indexOf(text, from);
    return k < 0 ? n : k + text.length;
  };
  const name = (a, z) => String.fromCharCode(...t.slice(a, z));
  for (let i = 0; i < n; ) {
    if (t[i] !== 60) i++;
    else if (at(i, "<!--")) i = skipTo("-->", i + 4);
    else if (at(i, "<![CDATA[")) i = skipTo("]]>", i + 9);
    else if (at(i, "<?")) i = skipTo("?>", i + 2);
    else if (at(i, "<!") || at(i, "</")) i = skipTo(">", i + 2);
    else if (!isTagStart(t[i + 1])) i++;
    else {
      // A start tag: its name, and each attribute, its value quoted or not.
      let k = i + 1;
      while (k < n && isTagChar(t[k])) k++;
      const tag = name(i + 1, k);
      let empty = false;
      for (;;) {
        while (k < n && isSpace(t[k])) k++;
        if (k >= n) break;
        if (t[k] === 62) {
          k++;
          break;
        }
        if (t[k] === 47 && t[k + 1] === 62) {
          empty = true;
          k += 2;
          break;
        }
        const a = k;
        while (k < n && !isSpace(t[k]) && t[k] !== 61 && t[k] !== 62 && t[k] !== 47) k++;
        if (k === a) {
          k++;
          continue;
        }
        const attribute = name(a, k);
        while (k < n && isSpace(t[k])) k++;
        if (t[k] !== 61) continue;
        k++;
        while (k < n && isSpace(t[k])) k++;
        if (t[k] === 34 || t[k] === 39) {
          let z = k + 1;
          while (z < n && t[z] !== t[k]) z++;
          if (attribute === "style") regions.push({ start: k + 1, end: z, attribute: true });
          k = Math.min(z + 1, n);
        } else while (k < n && !isSpace(t[k]) && t[k] !== 62) k++;
      }
      i = k;
      if ((tag === "style" || tag.endsWith(":style")) && !empty) {
        const close = indexOf(`</${tag}`, i);
        const end = close < 0 ? n : close;
        regions.push({ start: i, end, attribute: false });
        i = end;
      }
    }
  }
  return regions;
}

/**
 * The edits that strip an SVG given as UTF-8 bytes: what is only its editor's
 * (svgKeep), and each image it embeds, at any depth, read with the SVG's
 * references undone (xmlDecode), and its CSS (cssRegions) read as CSS, its
 * escapes undone. null when it is not UTF-8. at(p) is the offset in the file a
 * report on its byte p names.
 */
function stripSvgBytes(b, ctx, at) {
  const { units, s, e, valid } = utf8Units(b);
  if (!valid) return null;
  ctx.images++;
  const keep = svgKeep(b.toString("utf8"));
  const edits = [];
  const w = [];
  const wo = [];
  for (let k = 0; k < units.length; ) {
    if (keep[k]) {
      w.push(units[k]);
      wo.push(k++);
      continue;
    }
    const first = k;
    while (k < units.length && !keep[k]) k++;
    edits.push({ start: s[first], end: e[k - 1], text: "" });
  }
  if (edits.length) ctx.stripped++;
  // d's units come from w's [d.s, d.e), and w's from the SVG's units wo.
  const d = xmlDecode(w);
  const regions = cssRegions(w);
  const region = new Int32Array(w.length).fill(-1);
  for (const [k, r] of regions.entries()) region.fill(k, r.start, r.end);
  // Each run of d in the same region, or in none, is read on its own: CSS by CSS's rules, as
  // UTF-8, and the rest by an SVG's. scanned holds the edits in d.
  const scanned = [];
  for (let a = 0; a < d.units.length; ) {
    const id = region[d.s[a]];
    let z = a + 1;
    while (z < d.units.length && region[d.s[z]] === id) z++;
    if (id < 0) {
      const found = scanUris(d.units.slice(a, z), z - a, false, ctx, (i) => at(s[wo[d.s[a + i]]]), d.ref.slice(a, z));
      for (const x of found) scanned.push({ start: a + x.start, end: a + x.end, text: x.text });
    } else {
      // An attribute's value has its line breaks and tabs read as spaces, as XML reads them.
      const raw = (j) =>
        regions[id].attribute && !d.ref[j] && (d.units[j] === 9 || d.units[j] === 10 || d.units[j] === 13);
      const units = d.units.slice(a, z).map((c, j) => (raw(a + j) ? 32 : c));
      const text = unitsUtf8(units, 0, units.length);
      for (const x of scanUris(text.bytes, text.bytes.length, true, ctx, (i) => at(s[wo[d.s[a + text.s[i]]]])))
        scanned.push({ start: a + text.s[x.start], end: a + text.e[x.end - 1], text: x.text });
    }
    a = z;
  }
  for (const x of scanned) {
    const from = d.s[x.start];
    const to = d.e[x.end - 1];
    edits.push({ start: s[wo[from]], end: e[wo[to - 1]], text: x.text });
  }
  return edits;
}

/**
 * A CSS file, or an SVG file (svg), with every image it embeds stripped, and,
 * for an SVG, what is only its editor's: { output, images, stripped,
 * relabelled, reports }, a report being { line, message }. images counts each
 * image read, an SVG file and each image inside another included; stripped,
 * those that lost something of their own; relabelled, those whose label
 * changed. A file that is neither comes out as it went in.
 */
export function stripFile(bytes, { svg = false } = {}) {
  const reports = [];
  const ctx = {
    images: 0,
    stripped: 0,
    relabelled: 0,
    report(pos, message) {
      let line = 1;
      for (let i = 0; i < pos; i++) if (bytes[i] === 10) line++;
      reports.push({ line, message });
    },
  };
  let edits = [];
  if (!svg) edits = scanUris(bytes, bytes.length, true, ctx, (i) => i);
  else {
    edits = stripSvgBytes(bytes, ctx, (p) => p);
    if (!edits) {
      ctx.report(0, "an SVG that is not UTF-8; left unchanged");
      edits = [];
    }
  }
  const { images, stripped, relabelled } = ctx;
  return { output: applyEdits(bytes, edits), images, stripped, relabelled, reports };
}
