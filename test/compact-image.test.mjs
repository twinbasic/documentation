// Tests for what an embedded image keeps: scripts/lib/compact-image.mjs (compactImage, stripFile
// and the functions behind them), and scripts/imagestrip/, the twinBASIC tool that does to a CSS or
// SVG file what stripFile does. An editor's metadata goes, and a notice of whose a picture is and
// on what terms stays. The IDE's own icons carry both kinds: GIMP's EXIF, IPTC and XMP profiles
// around a few hundred bytes of pixels, CorelDRAW's and Illustrator's comments in its SVG icons,
// a PNG with an ICC profile inside one of those, and the CC BY-NC-SA attribution of the lock icon
// it took from fileformat.info, which must go wherever the icon does.
//
// Every image is built here. The module's tests need nothing else: `node --test
// test/compact-image.test.mjs`. The tool's need a built imagestrip exe and Windows, and are
// skipped without them: set IMAGESTRIP_EXE to the exe that
// `node scripts/tbbuild.mjs scripts/imagestrip/imagestrip.twinproj --build` prints. They run a CSS
// file and SVG files of every image built here through the tool, and check that it writes, prints
// and reports what stripFile says, byte for byte.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import zlib from "node:zlib";
import {
  compactGif,
  compactImage,
  compactJpeg,
  compactPng,
  compactSvgText,
  decodeBase64,
  exifOrientation,
  isSrgbProfile,
  stripFile,
} from "../scripts/lib/compact-image.mjs";
import { decodePng, encodePng } from "../scripts/lib/png.mjs";
import { findIde } from "../scripts/lib/tb-install.mjs";

// --- PNG --------------------------------------------------------------------

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "latin1");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
  return Buffer.concat([head, data, crc]);
}

const text = (keyword, value) => chunk("tEXt", Buffer.from(`${keyword}\0${value}`, "latin1"));
const ztext = (keyword, value) =>
  chunk(
    "zTXt",
    Buffer.concat([Buffer.from(`${keyword}\0\0`, "latin1"), zlib.deflateSync(Buffer.from(value, "latin1"))]),
  );
const itext = (keyword, value) => chunk("iTXt", Buffer.from(`${keyword}\0\0\0\0\0${value}`, "utf8"));

// A 2 by 2 picture with `extra` chunks after its header.
function png(extra) {
  const base = encodePng({
    width: 2,
    height: 2,
    rgba: Buffer.from([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 9, 9, 9, 128]),
  });
  const ihdrEnd = 8 + 25;
  return Buffer.concat([base.subarray(0, ihdrEnd), ...extra, base.subarray(ihdrEnd)]);
}

const chunksOf = (b) => {
  const out = [];
  for (let p = 8; p + 12 <= b.length; ) {
    const len = b.readUInt32BE(p);
    const type = b.toString("latin1", p + 4, p + 8);
    const data = b.subarray(p + 8, p + 8 + len);
    const z = data.indexOf(0);
    out.push(["tEXt", "zTXt", "iTXt"].includes(type) ? `${type}:${data.toString("latin1", 0, z)}` : type);
    p += 12 + len;
  }
  return out;
};

const dataUrl = (type, b) => `data:${type};base64,${b.toString("base64")}`;
const bytesOf = (url) => Buffer.from(url.slice(url.indexOf(",") + 1), "base64");
const b64 = (s) => Buffer.from(s).toString("base64");

// Escapes what encodeURIComponent leaves and an unquoted url() cannot hold.
const urlText = (s) =>
  encodeURIComponent(s).replace(/[()'!*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

// An EXIF block: a little-endian TIFF header and one IFD of [tag, type, count, value] entries.
function exif(entries) {
  const b = Buffer.alloc(8 + 2 + entries.length * 12 + 4);
  b.write("II*\0", 0, "latin1");
  b.writeUInt32LE(8, 4);
  b.writeUInt16LE(entries.length, 8);
  for (const [k, [tag, type, count, value]] of entries.entries()) {
    const e = 10 + k * 12;
    b.writeUInt16LE(tag, e);
    b.writeUInt16LE(type, e + 2);
    b.writeUInt32LE(count, e + 4);
    b.writeUInt32LE(value, e + 8);
  }
  return b;
}
// The text ImageMagick and GIMP write a raw profile as.
const rawProfile = (name, bytes) => `\n${name}\n${String(bytes.length).padStart(8)}\n${bytes.toString("hex")}\n`;

// The chunks of a two-frame animation, with an editor's name among them.
const ANIMATION = [
  chunk("acTL", Buffer.from([0, 0, 0, 2, 0, 0, 0, 0])),
  chunk("fcTL", Buffer.from([0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 10, 0, 0])),
  text("Software", "APNG Assembler"),
  chunk("fdAT", Buffer.from([0, 0, 0, 1, 0x78, 0x9c, 0x63, 0, 0, 0, 1, 0, 1])),
];

const GIMP_XMP =
  '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF><rdf:Description rdf:about="" xmp:CreatorTool="GIMP 2.10" ' +
  'GIMP:Version="2.10.22"><plus:Licensor><rdf:Seq/></plus:Licensor><dc:title><rdf:Alt><rdf:li xml:lang="x-default"/>' +
  "</rdf:Alt></dc:title></rdf:Description></rdf:RDF></x:xmpmeta>";

// An icon as GIMP saves it, and the lock icon from fileformat.info with its attribution.
const GIMP_PNG = png([
  ztext("Raw profile type exif", rawProfile("exif", exif([[0x0100, 4, 1, 2]]))),
  ztext("Raw profile type iptc", rawProfile("iptc", Buffer.from("1c0237000a323032312d30372d3036", "hex"))),
  chunk("iCCP", Buffer.from("profile\0\0x", "latin1")),
  itext("XML:com.adobe.xmp", GIMP_XMP),
  chunk("bKGD", Buffer.from([0, 0, 0, 0, 0, 0])),
  chunk("pHYs", Buffer.alloc(9)),
  chunk("tIME", Buffer.alloc(7)),
  text("Comment", "Created with GIMP"),
  text("Software", "Paint.NET v3.5.10"),
]);
const LOCK_PNG = png([
  chunk("pHYs", Buffer.alloc(9)),
  text("Title", "LOCK (U+1F512)"),
  text("Author", "Andrew Marcuse"),
  text("Software", "info.fileformat.data.UnicodePngServlet"),
  text("Description", "http://www.fileformat.info/info/unicode/1f512/index.htm"),
  text("Copyright", "http://creativecommons.org/licenses/by-nc-sa/2.0/"),
]);

describe("compactImage, PNG", () => {
  test("drops an editor's metadata and keeps the colour space and the pixels", () => {
    const out = bytesOf(compactImage(dataUrl("image/png", GIMP_PNG)));
    assert.deepEqual(chunksOf(out), ["IHDR", "iCCP", "IDAT", "IEND"]);
    assert.deepEqual(decodePng(out).rgba, decodePng(GIMP_PNG).rgba);
  });

  test("keeps the fileformat.info lock icon's attribution, and drops the software that made it", () => {
    const out = bytesOf(compactImage(dataUrl("image/png", LOCK_PNG)));
    assert.deepEqual(chunksOf(out), [
      "IHDR",
      "tEXt:Title",
      "tEXt:Author",
      "tEXt:Description",
      "tEXt:Copyright",
      "IDAT",
      "IEND",
    ]);
    // Byte for byte: the notice is not rewritten.
    assert.ok(out.includes(text("Copyright", "http://creativecommons.org/licenses/by-nc-sa/2.0/")));
  });

  test("keeps a text chunk whose keyword names a licence", () => {
    const out = bytesOf(compactImage(dataUrl("image/png", png([ztext("License", "CC0")]))));
    assert.deepEqual(chunksOf(out), ["IHDR", "zTXt:License", "IDAT", "IEND"]);
  });

  test("keeps a profile that names an author or terms, and only such a one", () => {
    const rights = itext(
      "XML:com.adobe.xmp",
      '<x:xmpmeta><rdf:RDF><rdf:Description><dc:rights><rdf:Alt><rdf:li xml:lang="x-default">(c) 2021 A. Painter' +
        "</rdf:li></rdf:Alt></dc:rights></rdf:Description></rdf:RDF></x:xmpmeta>",
    );
    const webStatement = itext(
      "XML:com.adobe.xmp",
      '<rdf:Description xmpRights:WebStatement="https://example.org/terms"/>',
    );
    const artist = ztext("Raw profile type exif", rawProfile("exif", exif([[0x013b, 2, 10, 26]])));
    const emptyArtist = ztext("Raw profile type exif", rawProfile("exif", exif([[0x013b, 2, 1, 0]])));
    const copyrightNotice = ztext(
      "Raw profile type iptc",
      rawProfile("iptc", Buffer.from("1c0274000548656c6c6f", "hex")),
    );
    for (const [what, kept, expected] of [
      ["XMP with dc:rights", rights, true],
      ["XMP with a web statement", webStatement, true],
      ["XMP with empty rights fields", itext("XML:com.adobe.xmp", GIMP_XMP), false],
      ["EXIF with an Artist", artist, true],
      ["EXIF with an empty Artist", emptyArtist, false],
      ["IPTC with a Copyright Notice", copyrightNotice, true],
    ]) {
      const out = bytesOf(compactImage(dataUrl("image/png", png([kept]))));
      assert.equal(chunksOf(out).length === 4, expected, what);
    }
  });

  test("keeps an eXIf chunk that turns the picture, and drops one that does not", () => {
    const turned = png([chunk("eXIf", exif([[0x0112, 3, 1, 6]]))]);
    const upright = png([chunk("eXIf", exif([[0x0112, 3, 1, 1]]))]);
    assert.deepEqual(chunksOf(bytesOf(compactImage(dataUrl("image/png", turned)))), ["IHDR", "eXIf", "IDAT", "IEND"]);
    assert.deepEqual(chunksOf(bytesOf(compactImage(dataUrl("image/png", upright)))), ["IHDR", "IDAT", "IEND"]);
    assert.equal(exifOrientation(exif([[0x0112, 3, 1, 8]])), 8);
    assert.equal(exifOrientation(exif([])), 1);
  });

  test("keeps an animated PNG's frames", () => {
    const out = bytesOf(compactImage(dataUrl("image/png", png(ANIMATION))));
    assert.deepEqual(chunksOf(out), ["IHDR", "acTL", "fcTL", "fdAT", "IDAT", "IEND"]);
  });
});

// --- PNG colour space -------------------------------------------------------

const s15 = (v) => {
  const b = Buffer.alloc(4);
  b.writeInt32BE(Math.round(v * 65536));
  return b;
};
const xyz = (x, y, z) => Buffer.concat([Buffer.from("XYZ \0\0\0\0", "latin1"), s15(x), s15(y), s15(z)]);
const para = (type, ...params) =>
  Buffer.concat([Buffer.from("para\0\0\0\0", "latin1"), Buffer.from([0, type, 0, 0]), ...params.map(s15)]);
function curv(values) {
  const b = Buffer.alloc(12 + 2 * values.length);
  b.write("curv", 0, "latin1");
  b.writeUInt32BE(values.length, 8);
  for (const [k, v] of values.entries()) b.writeUInt16BE(v, 12 + 2 * k);
  return b;
}
const srgbDecode = (x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
const SRGB_CURVE = para(3, 2.4, 1 / 1.055, 0.055 / 1.055, 1 / 12.92, 0.04045);

// An RGB display profile with the given [signature, bytes] tags.
function iccProfile(tags) {
  const table = Buffer.alloc(4 + 12 * tags.length);
  table.writeUInt32BE(tags.length, 0);
  let at = 128 + table.length;
  for (const [k, [sig, body]] of tags.entries()) {
    table.write(sig, 4 + 12 * k, "latin1");
    table.writeUInt32BE(at, 8 + 12 * k);
    table.writeUInt32BE(body.length, 12 + 12 * k);
    at += body.length;
  }
  const header = Buffer.alloc(128);
  header.writeUInt32BE(at, 0);
  header.write("mntrRGB XYZ ", 12, "latin1");
  return Buffer.concat([header, table, ...tags.map(([, body]) => body)]);
}

// GIMP's built-in sRGB profile, as far as a colour engine reads it.
const srgbProfile = ({ r = [0.436035, 0.222488, 0.013916], curve = SRGB_CURVE, extra = [] } = {}) =>
  iccProfile([
    ["rXYZ", xyz(...r)],
    ["gXYZ", xyz(0.385117, 0.716904, 0.097061)],
    ["bXYZ", xyz(0.143051, 0.060608, 0.713928)],
    ["rTRC", curve],
    ["gTRC", curve],
    ["bTRC", curve],
    ...extra,
  ]);

const iccp = (profile) =>
  chunk("iCCP", Buffer.concat([Buffer.from("ICC profile\0\0", "latin1"), zlib.deflateSync(profile)]));
const SRGB = chunk("sRGB", Buffer.from([0]));
const GAMA = chunk("gAMA", Buffer.from([0, 0, 0xb1, 0x8f]));
const CHRM = chunk("cHRM", Buffer.alloc(32));

describe("compactImage, PNG colour space", () => {
  const chunksAfter = (extra) => chunksOf(bytesOf(compactImage(dataUrl("image/png", png(extra)))));

  test("drops an sRGB profile, and gAMA and cHRM with it, and keeps the pixels", () => {
    const input = png([iccp(srgbProfile()), GAMA, CHRM]);
    const out = bytesOf(compactImage(dataUrl("image/png", input)));
    assert.deepEqual(chunksOf(out), ["IHDR", "IDAT", "IEND"]);
    assert.deepEqual(decodePng(out).rgba, decodePng(input).rgba);
  });

  test("drops an sRGB chunk and its fallbacks", () => {
    assert.deepEqual(chunksAfter([SRGB, GAMA, CHRM]), ["IHDR", "IDAT", "IEND"]);
  });

  test("keeps a profile that is not sRGB, and the colour chunks beside it", () => {
    for (const [what, profile] of [
      ["Display P3's red", srgbProfile({ r: [0.515121, 0.241196, -0.001053] })],
      ["a gamma of 2.2", srgbProfile({ curve: curv([Math.round(2.2 * 256)]) })],
      ["a lookup table", srgbProfile({ extra: [["A2B0", Buffer.alloc(32)]] })],
      ["a profile cut short", srgbProfile().subarray(0, 140)],
    ]) {
      assert.equal(isSrgbProfile(profile), false, what);
      assert.deepEqual(
        chunksAfter([iccp(profile), SRGB, GAMA]),
        ["IHDR", "iCCP", "sRGB", "gAMA", "IDAT", "IEND"],
        what,
      );
    }
  });

  test("reads sRGB's curve as a table and as parametric type 4", () => {
    const table = curv(Array.from({ length: 1024 }, (_, k) => Math.round(srgbDecode(k / 1023) * 65535)));
    assert.ok(isSrgbProfile(srgbProfile({ curve: table })));
    assert.ok(isSrgbProfile(srgbProfile({ curve: para(4, 2.4, 1 / 1.055, 0.055 / 1.055, 1 / 12.92, 0.04045, 0, 0) })));
  });

  test("keeps gAMA alone, and every colour chunk beside a cICP", () => {
    assert.deepEqual(chunksAfter([GAMA]), ["IHDR", "gAMA", "IDAT", "IEND"]);
    assert.deepEqual(chunksAfter([chunk("cICP", Buffer.from([1, 13, 0, 1])), iccp(srgbProfile())]), [
      "IHDR",
      "cICP",
      "iCCP",
      "IDAT",
      "IEND",
    ]);
  });
});

// --- JPEG -------------------------------------------------------------------

function segment(marker, data) {
  const head = Buffer.from([0xff, marker, 0, 0]);
  head.writeUInt16BE(data.length + 2, 2);
  return Buffer.concat([head, data]);
}
const ascii = (s) => Buffer.from(s, "latin1");
const SCAN = Buffer.from([0xff, 0xda, 0, 2, 1, 2, 3, 0xff, 0xd9]);

function jpeg(segments) {
  return Buffer.concat([Buffer.from([0xff, 0xd8]), ...segments, SCAN]);
}

const JFIF = segment(0xe0, ascii("JFIF\0\x01\x01\0\0\x01\0\x01\0\0"));
const ICC = segment(0xe2, ascii("ICC_PROFILE\0\x01\x01profile"));
const ADOBE = segment(0xee, ascii("Adobe\0d\0\0\0\0\x01"));
const TABLES = segment(0xdb, Buffer.alloc(65));

// The IDE names a JPEG image/png.
const JPEG_WITH_METADATA = jpeg([
  JFIF,
  segment(0xe1, Buffer.concat([ascii("Exif\0\0"), exif([[0x0112, 3, 1, 1]])])),
  segment(0xe1, ascii(`http://ns.adobe.com/xap/1.0/\0${GIMP_XMP}`)),
  ICC,
  segment(0xed, ascii("Photoshop 3.0\x008BIM\x04\x04\0\0\0\0\0\x05\x1c\x027\0\0")),
  segment(0xec, ascii("Ducky")),
  segment(0xfe, ascii("Optimized with https://ezgif.com/optimize")),
  ADOBE,
  TABLES,
]);
const JPEG_WITH_NOTICES = jpeg([
  JFIF,
  segment(0xfe, ascii("Copyright 2020 A. Painter")),
  segment(0xe1, Buffer.concat([ascii("Exif\0\0"), exif([[0x0112, 3, 1, 6]])])),
  segment(0xe1, Buffer.concat([ascii("Exif\0\0"), exif([[0x8298, 2, 12, 26]])])),
  TABLES,
]);
const JPEG_BROKEN = Buffer.from([0xff, 0xd8, 0x00, 0x11, 0x22]);

describe("compactImage, JPEG", () => {
  test("drops EXIF, XMP, IPTC and an editor's comment, keeps what decodes it, and names it a JPEG", () => {
    const url = compactImage(dataUrl("image/png", JPEG_WITH_METADATA));
    assert.match(url, /^data:image\/jpeg;base64,/);
    assert.deepEqual(bytesOf(url), Buffer.concat([Buffer.from([0xff, 0xd8]), JFIF, ICC, ADOBE, TABLES, SCAN]));
  });

  test("keeps a comment or a profile that names an author or terms, and an EXIF that turns it", () => {
    assert.deepEqual(compactJpeg(JPEG_WITH_NOTICES), JPEG_WITH_NOTICES);
  });

  test("returns a JPEG it cannot follow as it was", () => {
    assert.equal(compactJpeg(JPEG_BROKEN), JPEG_BROKEN);
  });
});

// --- GIF --------------------------------------------------------------------

const GIF_HEADER = Buffer.concat([ascii("GIF89a"), Buffer.from([1, 0, 1, 0, 0x80, 0, 0]), Buffer.alloc(6)]);
const GIF_LOOP = Buffer.concat([Buffer.from([0x21, 0xff, 11]), ascii("NETSCAPE2.0"), Buffer.from([3, 1, 0, 0, 0])]);
const GIF_IMAGE = Buffer.from([0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 0x44, 0x01, 0]);
const gifComment = (s) => Buffer.concat([Buffer.from([0x21, 0xfe, s.length]), ascii(s), Buffer.from([0])]);
const GIF_WITH_COMMENT = Buffer.concat([
  GIF_HEADER,
  GIF_LOOP,
  gifComment("Optimized with https://ezgif.com/optimize"),
  GIF_IMAGE,
  ascii(";"),
]);
const GIF_WITH_NOTICE = Buffer.concat([GIF_HEADER, gifComment("(c) 2019 A. Painter"), GIF_IMAGE, ascii(";")]);

describe("compactImage, GIF", () => {
  test("drops a comment, and keeps the animation and the image", () => {
    const url = compactImage(dataUrl("image/png", GIF_WITH_COMMENT));
    assert.match(url, /^data:image\/gif;base64,/);
    assert.deepEqual(bytesOf(url), Buffer.concat([GIF_HEADER, GIF_LOOP, GIF_IMAGE, ascii(";")]));
  });

  test("keeps a comment that is a notice", () => {
    assert.deepEqual(compactGif(GIF_WITH_NOTICE), GIF_WITH_NOTICE);
  });
});

// --- SVG --------------------------------------------------------------------

const SVG_COREL =
  '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
  '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
  "<!-- Creator: CorelDRAW X6 -->\n" +
  '<svg xmlns="http://www.w3.org/2000/svg"><metadata id="CorelCorpID_0Corel-Layer"/><path d="M0 0h1"/></svg>';
const SVG_COREL_STRIPPED = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1"/></svg>';
const SVG_ILLUSTRATOR =
  '<!DOCTYPE svg [<!ENTITY ns_svg "http://www.w3.org/2000/svg">]>' +
  "<!-- Generator: Adobe Illustrator 24.2.0 --><!-- Copyright 2020 A. Painter -->" +
  '<svg xmlns="&ns_svg;"><metadata><rdf:RDF><cc:Work><cc:license rdf:resource="https://creativecommons.org/licenses/by/4.0/"/>' +
  "</cc:Work></rdf:RDF></metadata></svg>";
// As CorelDRAW writes its icons: the styles in CDATA, where a comment is the style sheet's.
const SVG_CDATA =
  '<?xml version="1.0" encoding="UTF-8"?>\n<!-- Creator: CorelDRAW X6 -->\n<svg><defs><style type="text/css">' +
  "<![CDATA[ <!-- .fil0 {fill:#373435} --> ]]></style></defs>" +
  '<metadata id="CorelCorpID_0Corel-Layer"/><path class="fil0" d="M0 0h1"/></svg>';
const SVG_ESCAPES = '<!-- Creator: CorelDRAW X6 --><svg><path fill="#f00" d="M0 0h100%"/></svg>';
// <?xml-stylesheet?> starts as the declaration does, and styles the picture.
const SVG_STYLESHEET = '<?xml-stylesheet href="style.css" type="text/css"?><svg><path class="a"/></svg>';

describe("compactImage, SVG", () => {
  test("drops the declaration, a DOCTYPE that declares nothing, comments and metadata", () => {
    assert.equal(compactSvgText(SVG_COREL), SVG_COREL_STRIPPED);
  });

  test("keeps a style sheet instruction, which is not the declaration, even first", () => {
    for (const svg of [SVG_STYLESHEET, `<?xml version="1.0"?>\n${SVG_STYLESHEET}`])
      assert.equal(compactSvgText(svg), SVG_STYLESHEET);
  });

  test("keeps a DOCTYPE that declares entities, and a comment or metadata that is a notice", () => {
    assert.equal(
      compactSvgText(SVG_ILLUSTRATOR),
      '<!DOCTYPE svg [<!ENTITY ns_svg "http://www.w3.org/2000/svg">]><!-- Copyright 2020 A. Painter -->' +
        '<svg xmlns="&ns_svg;"><metadata><rdf:RDF><cc:Work><cc:license rdf:resource="https://creativecommons.org/licenses/by/4.0/"/>' +
        "</cc:Work></rdf:RDF></metadata></svg>",
    );
  });

  test("drops around a CDATA section, and leaves its inside as it is", () => {
    assert.equal(
      compactSvgText(SVG_CDATA),
      '<svg><defs><style type="text/css"><![CDATA[ <!-- .fil0 {fill:#373435} --> ]]></style></defs>' +
        '<path class="fil0" d="M0 0h1"/></svg>',
    );
  });

  test("is stored as text, its % and # escaped", () => {
    assert.equal(
      compactImage(dataUrl("image/svg+xml", Buffer.from(SVG_ESCAPES))),
      'data:image/svg+xml,<svg><path fill="%23f00" d="M0 0h100%25"/></svg>',
    );
  });
});

// --- Images inside an SVG ---------------------------------------------------

// Base64 as Illustrator writes it inside an SVG: in lines of 76, each ended by CR LF.
const wrapped = (b) => b.toString("base64").replace(/.{76}/g, "$&\r\n");

// An SVG written as the IDE's Illustrator icons are, with images inside it: a PNG with GIMP's
// metadata in base64 broken into lines, as one of those icons has, a JPEG labelled image/png, a
// GIF in a style's url( ), and an SVG written as text.
const NESTED_SVG =
  '<?xml version="1.0" encoding="utf-8"?>\r\n' +
  "<!-- Generator: Adobe Illustrator 24.0.1, SVG Export Plug-In . SVG Version: 6.00 Build 0) -->\r\n" +
  '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 48 48">\r\n' +
  `\t<image width="39" height="37" xlink:href="data:image/png;base64,${wrapped(GIMP_PNG)}" transform="matrix(0.59 0 0 0.59 12 13)">\r\n` +
  "\t</image>\r\n" +
  `\t<image href='data:image/png;base64,${JPEG_WITH_METADATA.toString("base64")}'/>\r\n` +
  `\t<rect style="fill: url( data:image/gif;base64,${GIF_WITH_COMMENT.toString("base64")} )"/>\r\n` +
  `\t<image href="data:image/svg+xml,${urlText(SVG_COREL)}"/>\r\n` +
  "</svg>\r\n";

const JPEG_REPORT = "labelled image/png, but is a JPEG; now labelled image/jpeg";

describe("compactSvgText, images inside an SVG", () => {
  test("strips each image an SVG embeds, at any depth, and labels each by its bytes", () => {
    const out = compactSvgText(NESTED_SVG);
    assert.ok(out.startsWith('<svg version="1.1"'), out.slice(0, 80));
    assert.ok(out.includes(`xlink:href="data:image/png;base64,${compactPng(GIMP_PNG).toString("base64")}"`));
    assert.ok(out.includes(`href='data:image/jpeg;base64,${compactJpeg(JPEG_WITH_METADATA).toString("base64")}'`));
    assert.ok(out.includes(`url( data:image/gif;base64,${compactGif(GIF_WITH_COMMENT).toString("base64")} )`));
    const inner = /href="data:image\/svg\+xml,([^"]*)"/.exec(out)[1];
    assert.equal(decodeURIComponent(inner), SVG_COREL_STRIPPED);
    // The SVG inside keeps its percent escapes.
    assert.ok(urlText(SVG_COREL).includes(inner.slice(0, 20)));
  });
});

// --- Whole files ------------------------------------------------------------

// An SVG file: its own editor's metadata, a notice, a PNG in a style sheet's CDATA, and an SVG in
// base64 with images of its own.
const SVG_FILE = Buffer.from(
  '\u{FEFF}<?xml version="1.0" encoding="UTF-8"?>\n<!-- Creator: CorelDRAW X6 -->\n<!-- Copyright 2020 A. Painter -->\n' +
    '<svg xmlns="http://www.w3.org/2000/svg"><metadata id="CorelCorpID_0Corel-Layer"/>' +
    `<defs><style><![CDATA[ .a { fill: url("data:image/png;base64,${GIMP_PNG.toString("base64")}") } ]]></style></defs>` +
    `<image href="data:image/svg+xml;base64,${b64(NESTED_SVG)}"/><title>Zoë</title></svg>\n`,
);

// An SVG that writes its URIs with references, as a serializer writes a style attribute: a quote
// as &quot; around a URI, a line break as &#10; in base64, and an SVG written as text whose own
// quotes, as &quot;, do not end the attribute. In CDATA a reference is text, so the last URI is
// not read.
const SVG_REFERENCES =
  `<svg><g style="cursor: url(&quot;data:image/png;base64,${GIMP_PNG.toString("base64")}&quot;), auto"/>` +
  `<image href="data:image/png;base64,${GIMP_PNG.toString("base64").replace(/.{76}/g, "$&&#10;")}"/>` +
  '<image href="data:image/svg+xml,&lt;svg a=&quot;b&quot;&gt;&lt;!-- x --&gt;&lt;/svg&gt;"/>' +
  `<style><![CDATA[ .a { cursor: url(&quot;data:image/png;base64,${GIMP_PNG.toString("base64")}&quot;) } ]]></style></svg>`;
const SVG_REFERENCES_STRIPPED =
  `<svg><g style="cursor: url(&quot;data:image/png;base64,${compactPng(GIMP_PNG).toString("base64")}&quot;), auto"/>` +
  `<image href="data:image/png;base64,${compactPng(GIMP_PNG).toString("base64")}"/>` +
  '<image href="data:image/svg+xml,&lt;svg a=&quot;b&quot;&gt;&lt;/svg&gt;"/>' +
  `<style><![CDATA[ .a { cursor: url(&quot;data:image/png;base64,${GIMP_PNG.toString("base64")}&quot;) } ]]></style></svg>`;

// A style sheet that embeds a PNG, and what it is with the PNG stripped, and the two in a CSS file
// that imports it in base64 and as text, as it imports one it cannot read, and in an SVG's
// <?xml-stylesheet?>. In the text, only the PNG's characters change: those around it stay escaped.
const SHEET = `.a { background: url(data:image/png;base64,${GIMP_PNG.toString("base64")}) }`;
const [SHEET_HEAD, SHEET_TAIL] = SHEET.split(GIMP_PNG.toString("base64"));
const LEAN_PNG = compactPng(GIMP_PNG).toString("base64");
const SHEETS_CSS =
  `@import url("data:text/css;base64,${b64(SHEET)}");\n` +
  `@import url("data:text/css,${encodeURIComponent(SHEET)}");\n` +
  '@import url("data:text/css,%ZZ");\n' +
  '@import url("data:text/css;base64,A===");\n';
const SHEETS_CSS_STRIPPED =
  `@import url("data:text/css;base64,${b64(SHEET_HEAD + LEAN_PNG + SHEET_TAIL)}");\n` +
  `@import url("data:text/css,${encodeURIComponent(SHEET_HEAD)}${LEAN_PNG}${encodeURIComponent(SHEET_TAIL)}");\n` +
  '@import url("data:text/css,%ZZ");\n' +
  '@import url("data:text/css;base64,A===");\n';
const SVG_SHEET = `<?xml-stylesheet type="text/css" href="data:text/css,${encodeURIComponent(SHEET)}"?><svg/>`;

// An SVG's own CSS, read by CSS's rules: a <style> element with a CSS escape in a URI, a style
// attribute whose base64 is broken over lines, which XML reads as spaces, a namespaced <svg:style>
// that imports a style sheet, and a style attribute holding an SVG as text.
const SVG_CSS =
  `<svg><style>.a { cursor: url("data:image/png;base64,\\69 ${GIMP_PNG.toString("base64").slice(1)}") }</style>` +
  `<g style="cursor: url('data:image/png;base64,${wrapped(GIMP_PNG)}')"/>` +
  `<svg:style xmlns:svg="http://www.w3.org/2000/svg">@import url("data:text/css,${encodeURIComponent(SHEET)}");</svg:style>` +
  `<g style='fill: url("data:image/svg+xml,%3Csvg%3E%3C!-- x --%3E%3C/svg%3E")'/></svg>`;
const SVG_CSS_STRIPPED =
  `<svg><style>.a { cursor: url("data:image/png;base64,${LEAN_PNG}") }</style>` +
  `<g style="cursor: url('data:image/png;base64,${LEAN_PNG}')"/>` +
  `<svg:style xmlns:svg="http://www.w3.org/2000/svg">@import url("data:text/css,${encodeURIComponent(SHEET_HEAD)}${LEAN_PNG}${encodeURIComponent(SHEET_TAIL)}");</svg:style>` +
  `<g style='fill: url("data:image/svg+xml,%3Csvg%3E%3C/svg%3E")'/></svg>`;

describe("stripFile", () => {
  test("reads base64 as a browser reads a data: URI", () => {
    const decode = (s) => decodeBase64(Buffer.from(s, "latin1"));
    assert.deepEqual(decode("AAEC\r\n AwQ="), Buffer.from([0, 1, 2, 3, 4]));
    assert.deepEqual(decode("AA=="), Buffer.from([0]));
    assert.deepEqual(decode("AAA"), Buffer.from([0, 0]));
    for (const s of ["", " \r\n", "A", "AA=", "A===", "AA*A", "AA==AA=="])
      assert.equal(decode(s), null, JSON.stringify(s));
  });

  test("strips an image inside an SVG inside a CSS file, and keeps the encoding of each", () => {
    const css = Buffer.from(`.a { background: url("data:image/svg+xml,${urlText(NESTED_SVG)}"); }\n`);
    const r = stripFile(css);
    const payload = /url\("data:image\/svg\+xml,([^"]*)"\)/.exec(r.output.toString("latin1"))[1];
    assert.equal(decodeURIComponent(payload), compactSvgText(NESTED_SVG));
    assert.doesNotMatch(payload, /[<>"' ]/);
    assert.deepEqual([r.images, r.stripped, r.relabelled], [5, 5, 1]);
    assert.deepEqual(r.reports, [{ line: 1, message: JPEG_REPORT }]);
  });

  test("reports on an image inside another on the line of the outer one's data: URI", () => {
    const css = Buffer.from(
      `/* one */\n/* two */\n.a { background: url("data:image/svg+xml;base64,${b64(NESTED_SVG)}"); }\n`,
    );
    const r = stripFile(css);
    assert.deepEqual(r.reports, [{ line: 3, message: JPEG_REPORT }]);
    assert.ok(r.output.toString().includes(b64(compactSvgText(NESTED_SVG))));
  });

  test("finds a data: URI just after a quote, or after url( and white space, and nowhere else", () => {
    const gimp = GIMP_PNG.toString("base64");
    const css = `a { b: url(  data:image/png;base64,${gimp}  ) }\nc { d: x data:image/png;base64,${gimp}; }\ne { f: url(" data:image/png;base64,${gimp}") }\n`;
    const r = stripFile(Buffer.from(css));
    assert.equal(r.images, 1);
    assert.equal(r.output.toString(), css.replace(gimp, compactPng(GIMP_PNG).toString("base64")));
  });

  test("strips an SVG file of its own metadata and of the images inside it", () => {
    const r = stripFile(SVG_FILE, { svg: true });
    assert.equal(
      r.output.toString(),
      "<!-- Copyright 2020 A. Painter -->\n" +
        '<svg xmlns="http://www.w3.org/2000/svg">' +
        `<defs><style><![CDATA[ .a { fill: url("data:image/png;base64,${compactPng(GIMP_PNG).toString("base64")}") } ]]></style></defs>` +
        `<image href="data:image/svg+xml;base64,${b64(compactSvgText(NESTED_SVG))}"/><title>Zoë</title></svg>`,
    );
    assert.deepEqual([r.images, r.stripped, r.relabelled], [7, 7, 1]);
    assert.deepEqual(r.reports, [{ line: 4, message: JPEG_REPORT }]);
  });

  test("leaves an SVG file that is not UTF-8 as it is", () => {
    const latin1 = ascii("<svg><title>Zo\xeb</title></svg>");
    const r = stripFile(latin1, { svg: true });
    assert.ok(r.output.equals(latin1));
    assert.deepEqual(r.reports, [{ line: 1, message: "an SVG that is not UTF-8; left unchanged" }]);
    assert.equal(r.images, 0);
  });

  test("reads a URI an SVG writes with references, and keeps them in what stays", () => {
    const r = stripFile(Buffer.from(SVG_REFERENCES), { svg: true });
    assert.equal(r.output.toString(), SVG_REFERENCES_STRIPPED);
    // The SVG, the two PNGs it reads, and the SVG written with references; not the PNG in CDATA.
    assert.deepEqual([r.images, r.stripped, r.relabelled], [4, 3, 0]);
  });

  test("reads an SVG's style elements and style attributes as CSS", () => {
    const r = stripFile(Buffer.from(SVG_CSS), { svg: true });
    assert.equal(r.output.toString(), SVG_CSS_STRIPPED);
    // The SVG, three PNGs and the SVG in a style attribute.
    assert.deepEqual([r.images, r.stripped, r.relabelled], [5, 4, 0]);
    assert.deepEqual(r.reports, []);
  });

  test("strips the images of a style sheet in a data: URI, in base64 and as text", () => {
    const r = stripFile(Buffer.from(SHEETS_CSS));
    assert.equal(r.output.toString(), SHEETS_CSS_STRIPPED);
    // A style sheet is not an image: the two PNGs are.
    assert.deepEqual([r.images, r.stripped, r.relabelled], [2, 2, 0]);
    assert.deepEqual(r.reports, [
      { line: 3, message: "a style sheet this cannot read; left unchanged" },
      { line: 4, message: "labelled text/css, but its base64 cannot be read; left unchanged" },
    ]);
    assert.equal(
      stripFile(Buffer.from(SVG_SHEET), { svg: true }).output.toString(),
      SVG_SHEET.replace(
        encodeURIComponent(SHEET),
        encodeURIComponent(SHEET_HEAD) + LEAN_PNG + encodeURIComponent(SHEET_TAIL),
      ),
    );
  });
});

// --- imagestrip -------------------------------------------------------------
//
// The twinBASIC tool, run on a private desktop over a CSS file and SVG files that embed every
// image built in this file, and over the IDE's own stylesheets. stripFile says what it must write,
// print and report.

const EXE = process.env.IMAGESTRIP_EXE;
let toolSkip = false;
if (process.platform !== "win32") toolSkip = "imagestrip is a Windows program";
else if (!EXE) toolSkip = "set IMAGESTRIP_EXE to a built imagestrip exe to test the tool";

const IDE_CSS = (() => {
  const ide = findIde();
  return ide ? path.join(path.dirname(ide), "ide") : null;
})();

// A one-pixel BMP, which the IDE's report designer would call image/png.
function bmp() {
  const b = Buffer.alloc(58);
  b.write("BM", 0, "latin1");
  b.writeUInt32LE(58, 2);
  b.writeUInt32LE(54, 10);
  b.writeUInt32LE(40, 14);
  b.writeInt32LE(1, 18);
  b.writeInt32LE(1, 22);
  b.writeUInt16LE(1, 26);
  b.writeUInt16LE(24, 28);
  b.writeUInt32LE(4, 34);
  b[54] = 255;
  return b;
}

// Every image this file builds, each in a rule of its own, with what the tool must leave alone
// around them.
function corpusCss() {
  const table = curv(Array.from({ length: 1024 }, (_, k) => Math.round(srgbDecode(k / 1023) * 65535)));
  const images = [
    ["image/png", GIMP_PNG],
    ["image/png", LOCK_PNG],
    ["image/png", png([ztext("License", "CC0")])],
    [
      "image/png",
      png([
        itext(
          "XML:com.adobe.xmp",
          '<x:xmpmeta><rdf:RDF><rdf:Description><dc:rights><rdf:Alt><rdf:li xml:lang="x-default">(c) 2021 A. Painter' +
            "</rdf:li></rdf:Alt></dc:rights></rdf:Description></rdf:RDF></x:xmpmeta>",
        ),
      ]),
    ],
    [
      "image/png",
      png([itext("XML:com.adobe.xmp", '<rdf:Description xmpRights:WebStatement="https://example.org/terms"/>')]),
    ],
    ["image/png", png([itext("XML:com.adobe.xmp", GIMP_XMP)])],
    ["image/png", png([ztext("Raw profile type exif", rawProfile("exif", exif([[0x013b, 2, 10, 26]])))])],
    ["image/png", png([ztext("Raw profile type exif", rawProfile("exif", exif([[0x013b, 2, 1, 0]])))])],
    [
      "image/png",
      png([ztext("Raw profile type iptc", rawProfile("iptc", Buffer.from("1c0274000548656c6c6f", "hex")))]),
    ],
    ["image/png", png([chunk("eXIf", exif([[0x0112, 3, 1, 6]]))])],
    ["image/png", png([chunk("eXIf", exif([[0x0112, 3, 1, 1]]))])],
    ["image/png", png(ANIMATION)],
    ["image/png", png([iccp(srgbProfile()), GAMA, CHRM])],
    ["image/png", png([SRGB, GAMA, CHRM])],
    ["image/png", png([iccp(srgbProfile({ r: [0.515121, 0.241196, -0.001053] })), SRGB, GAMA])],
    ["image/png", png([iccp(srgbProfile({ curve: curv([Math.round(2.2 * 256)]) })), SRGB, GAMA])],
    ["image/png", png([iccp(srgbProfile({ extra: [["A2B0", Buffer.alloc(32)]] })), SRGB, GAMA])],
    ["image/png", png([iccp(srgbProfile().subarray(0, 140)), SRGB, GAMA])],
    ["image/png", png([iccp(srgbProfile({ curve: table }))])],
    [
      "image/png",
      png([iccp(srgbProfile({ curve: para(4, 2.4, 1 / 1.055, 0.055 / 1.055, 1 / 12.92, 0.04045, 0, 0) }))]),
    ],
    ["image/png", png([GAMA])],
    ["image/png", png([chunk("cICP", Buffer.from([1, 13, 0, 1])), iccp(srgbProfile())])],
    ["image/png", png([])],
    ["image/png", GIMP_PNG.subarray(0, GIMP_PNG.length - 20)],
    ["image/png", Buffer.concat([png([]), ascii("trailing junk")])],
    ["application/octet-stream", LOCK_PNG],
    ["IMAGE/PNG", GIMP_PNG],
    ["image/png", JPEG_WITH_METADATA],
    ["image/jpeg", JPEG_WITH_NOTICES],
    ["image/jpeg", JPEG_BROKEN],
    ["image/png", GIF_WITH_COMMENT],
    ["image/gif", GIF_WITH_NOTICE],
    ["image/png", bmp()],
    ["image/png", ascii("not a picture")],
    ["image/webp", ascii("RIFF\x04\0\0\0WEBP")],
    ["font/woff2", ascii("wOF2, not an image")],
    ["image/svg+xml", Buffer.from(SVG_COREL)],
    ["image/svg+xml", Buffer.from(SVG_ILLUSTRATOR)],
    ["image/svg+xml", Buffer.from(SVG_CDATA)],
    ["image/svg+xml", Buffer.from(`\u{FEFF}  ${SVG_ESCAPES.replace("<svg>", "<svg><title>Zoë</title>")}  `)],
    ["image/svg+xml", Buffer.from(NESTED_SVG)],
    ["image/svg+xml", Buffer.from([0x3c, 0x73, 0x76, 0x67, 0xff, 0x2f, 0x3e])],
  ];
  const lines = ['/* Zoë Łódź → ✓, and "data:" in a comment */'];
  for (const [k, [label, bytes]] of images.entries()) {
    lines.push(`.i${k} { background: url("data:${label};base64,${bytes.toString("base64")}"); }`);
  }
  const partly = (s) =>
    s.replace(/%/g, "%25").replace(/#/g, "%23").replace(/\r/g, "%0D").replace(/\n/g, "%0A").replace(/'/g, "\\'");
  const gimp = GIMP_PNG.toString("base64");
  lines.push(
    `.t0 { background: url("data:image/svg+xml;charset=utf-8,${urlText(SVG_COREL)}"); }`,
    `.t1 { background: url('data:image/svg+xml;utf8,${partly(SVG_CDATA)}'); }`,
    `.t2 { background: url(data:image/svg+xml,${urlText(SVG_ILLUSTRATOR)} ); }`,
    '.t3 { background: url("data:image/svg+xml,%3Csvg%3E%3C!-- %ZZ --%3E%3C/svg%3E"); }',
    '.t4::after { content: "data:image/png;base64,"; }',
    // As the IDE's stylesheet writes one: quotes escaped for CSS inside a quoted url().
    ".t5 { background: url('data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\'><!-- Creator: CorelDRAW X6 --><path d=\\'M0 0h1\\'/></svg>'); }",
    '.t6 { background: url("data:image/svg+xml,\\3Csvg\\3E\\3C!-- Generator: Adobe Illustrator \\31 0 --\\3E\\3C/svg\\3E"); }',
    ".t7 { background: url(data:image/svg+xml,%3Csvg%3E%3C!--\\)--%3E%3C/svg%3E); }",
    // Images inside SVGs, written as text in the three ways above.
    `.n0 { background: url("data:image/svg+xml,${urlText(NESTED_SVG)}"); }`,
    `.n1 { background: url('data:image/svg+xml;utf8,${partly(NESTED_SVG)}'); }`,
    `.n2 { background: url(data:image/svg+xml;base64,${b64(SVG_FILE.toString())}); }`,
    `.n3 { background: url("data:image/svg+xml,${urlText(SVG_REFERENCES)}"); }`,
    `.n4 { background: url("data:image/svg+xml,${urlText(SVG_CSS)}"); }`,
    // Base64 after white space, with white space and a CSS escape inside it, and padded wrongly.
    `.b0 { background: url(  data:image/png;base64,${gimp}  ); }`,
    `.b1 { background: url("data:image/png;base64,${gimp.replace(/.{60}/g, "$& ")}"); }`,
    `.b2 { background: url("data:image/png;base64,\\69 ${gimp.slice(1)}"); }`,
    '.b3 { background: url("data:image/png;base64,A==="); }',
    `.b4 { background: x data:image/png;base64,${gimp}; }`,
    // Style sheets in base64 and as text, as @import writes them, and two that cannot be read.
    ...SHEETS_CSS.trimEnd().split("\n"),
  );
  return Buffer.from(`${lines.join("\r\n")}\r\n`, "utf8");
}

// Where two outputs first differ, for a message.
function firstDifference(a, b) {
  let k = 0;
  while (k < a.length && k < b.length && a[k] === b[k]) k++;
  const around = (x) => JSON.stringify(x.toString("latin1", Math.max(0, k - 40), k + 40));
  return `byte ${k} of ${a.length} and ${b.length}: ${around(a)} where stripFile writes ${around(b)}`;
}

describe("imagestrip", { skip: toolSkip }, () => {
  let work;
  let launchOnDesktop;

  before(async () => {
    ({ launchOnDesktop } = await import("../scripts/lib/tb-ide.mjs"));
    work = fs.mkdtempSync(path.join(os.tmpdir(), "imagestrip test "));
  });
  after(() => fs.rmSync(work, { recursive: true, force: true }));

  async function run(...args) {
    const out = path.join(work, "stdout.txt");
    const err = path.join(work, "stderr.txt");
    fs.rmSync(out, { force: true });
    fs.rmSync(err, { force: true });
    const launched = await launchOnDesktop({
      exe: EXE,
      args,
      desktop: "imagestrip-test",
      env: process.env,
      stdout: out,
      stderr: err,
      dialogs: "close",
    });
    const { code, dialogs } = await launched.finished;
    assert.deepEqual(dialogs, [], "the tool opened no box");
    const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "latin1").replace(/\r\n/g, "\n").trimEnd() : "");
    return { code, stdout: read(out), stderr: read(err) };
  }

  // Writes bytes to a file called name in the work folder, strips it into another, and checks that
  // the tool wrote, printed and reported what stripFile says. Returns stripFile's answer.
  async function strip(name, bytes) {
    const input = path.join(work, name);
    const output = path.join(work, `stripped ${name}`);
    fs.writeFileSync(input, bytes);
    const r = await run(input, output);
    const e = stripFile(bytes, { svg: /\.svg$/i.test(name) });
    assert.equal(r.code, 0, r.stderr);
    const written = fs.readFileSync(output);
    assert.ok(written.equals(e.output), `${name}: ${firstDifference(written, e.output)}`);
    assert.equal(
      r.stdout,
      `${input}: ${e.images} images, ${e.stripped} stripped, ${e.relabelled} relabelled; ${bytes.length} -> ${e.output.length} bytes`,
    );
    assert.equal(r.stderr, e.reports.map((x) => `${input}:${x.line}: ${x.message}`).join("\n"));
    return e;
  }

  test("strips every image built here in a CSS file, at any depth, as stripFile does", async () => {
    const e = await strip("images.css", corpusCss());
    // The corpus reaches every report there is.
    for (const kind of [
      /but is a JPEG; now/,
      /but is a GIF; now/,
      /but is a BMP; now/,
      /but is no image this reads/,
      /but its base64 cannot be read/,
      /an SVG this cannot read/,
      /an SVG that is not UTF-8/,
      /a style sheet this cannot read/,
    ])
      assert.ok(
        e.reports.some((x) => kind.test(x.message)),
        `a report like ${kind}`,
      );
  });

  test("strips an SVG file, and the images inside it at any depth, as stripFile does", async () => {
    await strip("icon.svg", SVG_FILE);
    await strip("NESTED.SVG", Buffer.from(NESTED_SVG));
    await strip("latin1.svg", ascii("<svg><title>Zo\xeb</title><!-- x --></svg>"));
    await strip("stylesheet.svg", Buffer.from(`\r\n${SVG_STYLESHEET}\r\n<!-- x -->`));
    await strip("references.svg", Buffer.from(SVG_REFERENCES));
    await strip("sheet.svg", Buffer.from(SVG_SHEET));
    await strip("css.svg", Buffer.from(SVG_CSS));
  });

  test("changes nothing when run on what it wrote", async () => {
    for (const [name, bytes] of [
      ["again.css", corpusCss()],
      ["again.svg", SVG_FILE],
    ]) {
      const first = stripFile(bytes, { svg: name.endsWith(".svg") }).output;
      const second = await strip(`2 ${name}`, first);
      assert.ok(second.output.equals(first), name);
      assert.equal(second.stripped + second.relabelled, 0, name);
    }
  });

  test("writes over its input, and empties a longer output first", async () => {
    const css = corpusCss();
    const reference = stripFile(css).output;
    const inPlace = path.join(work, "in place.css");
    fs.writeFileSync(inPlace, css);
    assert.equal((await run(inPlace, inPlace)).code, 0);
    assert.ok(fs.readFileSync(inPlace).equals(reference));
    const source = path.join(work, "source.css");
    const longer = path.join(work, "longer.css");
    fs.writeFileSync(source, css);
    fs.writeFileSync(longer, Buffer.alloc(css.length * 2, 0x41));
    assert.equal((await run(source, longer)).code, 0);
    assert.ok(fs.readFileSync(longer).equals(reference));
  });

  test("strips the IDE's own stylesheets as stripFile does", {
    skip: !IDE_CSS && "no twinBASIC install",
  }, async () => {
    for (const name of fs.readdirSync(IDE_CSS).filter((n) => n.endsWith(".css")))
      await strip(name, fs.readFileSync(path.join(IDE_CSS, name)));
  });

  test("writes an empty file for an empty one", async () => {
    assert.equal((await strip("empty.css", Buffer.alloc(0))).output.length, 0);
    assert.equal((await strip("empty.svg", Buffer.alloc(0))).output.length, 0);
  });

  test("refuses a wrong command line", async () => {
    for (const args of [[], [path.join(work, "a.css")]]) {
      const r = await run(...args);
      assert.equal(r.code, 2);
      assert.match(r.stderr, /^Usage: imagestrip /);
    }
  });

  test("refuses a file it cannot read or write, and creates none", async () => {
    const input = path.join(work, "input.css");
    fs.writeFileSync(input, "a { color: red }");
    const missing = path.join(work, "no such file.css");
    const output = path.join(work, "not written.css");
    const readOnly = path.join(work, "read only.css");
    fs.writeFileSync(readOnly, "x");
    fs.chmodSync(readOnly, 0o444);
    for (const [args, message] of [
      [[missing, output], /^imagestrip: no such file: /],
      [[input, path.join(work, "no such folder", "x.css")], /^imagestrip: no such folder: /],
      [[work, output], /^imagestrip: not a file: /],
      [[input, work], /^imagestrip: not a file: /],
      [[input, readOnly], /^imagestrip: cannot write /],
    ]) {
      const r = await run(...args);
      assert.equal(r.code, 1, args.join(" "));
      assert.match(r.stderr, message);
    }
    fs.chmodSync(readOnly, 0o666);
    assert.ok(!fs.existsSync(missing));
    assert.ok(!fs.existsSync(output));
  });
});
