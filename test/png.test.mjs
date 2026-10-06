// Tests for the pictures of a bug reproducer: scripts/lib/png.mjs (decoding, encoding, comparing
// and the side-by-side image), scripts/lib/repro-images.mjs (the files and judgements behind
// repro.json's `images` and `expect.imagesDiffer`) and what scripts/bug_repro.mjs makes of them
// (`new --with-images`, and the refusals of `verify`).
//
// Nothing here starts twinBASIC or VB6. bug_repro.mjs runs over fixtures in a temp folder, named
// by BUG_REPRO_BUGS, and the commands used refuse or finish before they look for an IDE.
//
// Runs with a bare `node --test test/png.test.mjs`: no tree, no build.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import zlib from "node:zlib";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import {
  comparePngs,
  composeComparison,
  decodePng,
  encodePng,
  glyphRows,
  GUTTER,
  LABEL_CHARS,
} from "../scripts/lib/png.mjs";
import {
  addPngModule,
  collectImages,
  compareWithKept,
  comparisonLine,
  copyImageTemplates,
  embedProblems,
  hasPngModule,
  ImageError,
  imageFile,
  imageSourceCheck,
  imagesDifferProblems,
  imagesKeyProblem,
  imageZipEntries,
  normaliseEol,
  PNG_TEMPLATES,
  PNGDUMP_BAS,
  PNGDUMP_TWIN,
  recordedBeta,
  tbLabel,
  writeComparison,
} from "../scripts/lib/repro-images.mjs";

const scratch = mkdtempSync(path.join(tmpdir(), "png-test-"));
after(() => rmSync(scratch, { recursive: true, force: true }));
let counter = 0;
const folder = () => {
  const dir = path.join(scratch, String(++counter));
  mkdirSync(dir, { recursive: true });
  return dir;
};

// ----------------------------------------------------------- helpers: building PNGs by hand

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "latin1");
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(zlib.crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function ihdr(width, height, { depth = 8, colour = 6, interlace = 0 } = {}) {
  const h = Buffer.alloc(13);
  h.writeUInt32BE(width, 0);
  h.writeUInt32BE(height, 4);
  h[8] = depth;
  h[9] = colour;
  h[12] = interlace;
  return chunk("IHDR", h);
}

/** A PNG file from filtered scanlines (each already with its filter byte), and extra chunks before IDAT. */
function pngFile(width, height, rawScanlines, { extra = [], ...header } = {}) {
  return Buffer.concat([
    SIGNATURE,
    ihdr(width, height, header),
    ...extra,
    chunk("IDAT", zlib.deflateSync(rawScanlines)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
};

/** One scanline filtered with filter type `kind`, written here and not taken from the code under test. */
function filtered(kind, row, prev, bpp) {
  const out = Buffer.alloc(row.length + 1);
  out[0] = kind;
  for (let x = 0; x < row.length; x++) {
    const a = x >= bpp ? row[x - bpp] : 0;
    const b = prev[x];
    const c = x >= bpp ? prev[x - bpp] : 0;
    const predictor = [0, a, b, (a + b) >> 1, paeth(a, b, c)][kind];
    out[x + 1] = (row[x] - predictor) & 255;
  }
  return out;
}

/** An image of pseudo-random pixels, the same each time. */
function noise(width, height, seed = 1) {
  const rgba = new Uint8Array(width * height * 4);
  let s = seed;
  for (let i = 0; i < rgba.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    rgba[i] = (s >> 16) & 255;
  }
  return { width, height, rgba };
}

/** An image of one colour. */
function flat(width, height, [r, g, b, a = 255]) {
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) rgba.set([r, g, b, a], i * 4);
  return { width, height, rgba };
}

const copyImage = (img) => ({ ...img, rgba: Uint8Array.from(img.rgba) });
const pixel = (img, x, y) => Array.from(img.rgba.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4));
const plant = (img, x, y, colour) => img.rgba.set(colour, (y * img.width + x) * 4);

// ---------------------------------------------------------------------------- png.mjs

describe("encodePng and decodePng", () => {
  test("an image survives the round trip", () => {
    const img = noise(7, 5);
    const back = decodePng(encodePng(img));
    assert.equal(back.width, 7);
    assert.equal(back.height, 5);
    assert.deepEqual(Array.from(back.rgba), Array.from(img.rgba));
  });

  test("the file starts with the PNG signature and holds colour type 6 at 8 bits", () => {
    const file = encodePng(noise(3, 2));
    assert.ok(file.subarray(0, 8).equals(SIGNATURE));
    assert.equal(file[24], 8, "bit depth");
    assert.equal(file[25], 6, "colour type");
  });

  test("each filter type is decoded as it was applied", () => {
    const img = noise(9, 6, 7);
    const stride = img.width * 4;
    for (const kind of [0, 1, 2, 3, 4]) {
      const lines = [];
      for (let y = 0; y < img.height; y++) {
        const row = Buffer.from(img.rgba.subarray(y * stride, (y + 1) * stride));
        const prev = y ? Buffer.from(img.rgba.subarray((y - 1) * stride, y * stride)) : Buffer.alloc(stride);
        lines.push(filtered(kind, row, prev, 4));
      }
      const decoded = decodePng(pngFile(img.width, img.height, Buffer.concat(lines)));
      assert.deepEqual(Array.from(decoded.rgba), Array.from(img.rgba), `filter type ${kind}`);
    }
  });

  test("a different filter on each row decodes too", () => {
    const img = noise(5, 10, 3);
    const stride = img.width * 4;
    const lines = [];
    for (let y = 0; y < img.height; y++) {
      const row = Buffer.from(img.rgba.subarray(y * stride, (y + 1) * stride));
      const prev = y ? Buffer.from(img.rgba.subarray((y - 1) * stride, y * stride)) : Buffer.alloc(stride);
      lines.push(filtered(y % 5, row, prev, 4));
    }
    const decoded = decodePng(pngFile(img.width, img.height, Buffer.concat(lines)));
    assert.deepEqual(Array.from(decoded.rgba), Array.from(img.rgba));
  });

  test("an RGB image gets an opaque alpha, under each filter", () => {
    const width = 4;
    const height = 3;
    const rgb = Buffer.from(noise(width, height, 11).rgba.filter((_, i) => i % 4 !== 3));
    const stride = width * 3;
    for (const kind of [0, 1, 2, 3, 4]) {
      const lines = [];
      for (let y = 0; y < height; y++) {
        const row = rgb.subarray(y * stride, (y + 1) * stride);
        const prev = y ? rgb.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
        lines.push(filtered(kind, row, prev, 3));
      }
      const decoded = decodePng(pngFile(width, height, Buffer.concat(lines), { colour: 2 }));
      for (let i = 0; i < width * height; i++) {
        assert.deepEqual(
          Array.from(decoded.rgba.subarray(i * 4, i * 4 + 4)),
          [rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2], 255],
          `filter ${kind}, pixel ${i}`,
        );
      }
    }
  });

  test("a palette image takes its colours from PLTE and its alpha from tRNS", () => {
    const plte = chunk("PLTE", [255, 0, 0, 0, 255, 0, 0, 0, 255]);
    const trns = chunk("tRNS", [128, 0]);
    // 3 by 2: indices 0 1 2 / 2 1 0, filter 0.
    const raw = Buffer.from([0, 0, 1, 2, 0, 2, 1, 0]);
    const img = decodePng(pngFile(3, 2, raw, { colour: 3, extra: [plte, trns] }));
    assert.deepEqual(pixel(img, 0, 0), [255, 0, 0, 128]);
    assert.deepEqual(pixel(img, 1, 0), [0, 255, 0, 0]);
    assert.deepEqual(pixel(img, 2, 0), [0, 0, 255, 255], "an index past the end of tRNS is opaque");
    assert.deepEqual(pixel(img, 0, 1), [0, 0, 255, 255]);
    assert.deepEqual(pixel(img, 2, 1), [255, 0, 0, 128]);
  });

  test("a palette index the palette does not have is refused", () => {
    const plte = chunk("PLTE", [255, 0, 0]);
    assert.throws(
      () => decodePng(pngFile(2, 1, Buffer.from([0, 0, 1]), { colour: 3, extra: [plte] })),
      /palette entry 1/,
    );
  });

  test("a wrong CRC is refused, in IHDR and in IDAT", () => {
    const good = encodePng(noise(4, 4));
    const inHeader = Buffer.from(good);
    inHeader[16] ^= 1; // a byte of the width
    assert.throws(() => decodePng(inHeader), /bad CRC in the IHDR chunk/);
    const inData = Buffer.from(good);
    inData[good.length - 12 - 6] ^= 0xff; // a byte inside IDAT's data
    assert.throws(() => decodePng(inData), /bad CRC in the IDAT chunk/);
  });

  test("what is not a supported PNG is refused, and the message says why", () => {
    const good = encodePng(noise(2, 2));
    assert.throws(() => decodePng(Buffer.from("not a png at all")), /signature/);
    assert.throws(() => decodePng(good.subarray(0, good.length - 5)), /truncated/);
    assert.throws(() => decodePng(good.subarray(0, good.length - 12)), /no IEND/);
    assert.throws(() => decodePng(pngFile(1, 1, Buffer.from([0, 0, 0]), { colour: 0 })), /colour type 0 \(greyscale\)/);
    assert.throws(
      () => decodePng(pngFile(1, 1, Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]), { depth: 16, colour: 6 })),
      /bit depth 16/,
    );
    assert.throws(() => decodePng(pngFile(1, 1, Buffer.from([0, 0, 0, 0, 0]), { interlace: 1 })), /interlaced/);
    assert.throws(() => decodePng(pngFile(2, 2, Buffer.from([0, 1, 2]))), /pixel data is 3 bytes/);
    assert.throws(() => decodePng(pngFile(1, 1, Buffer.from([9, 0, 0, 0, 0]))), /filter type 9/);
  });
});

describe("comparePngs", () => {
  test("equal pictures have no differing pixel", () => {
    const a = noise(6, 4);
    assert.deepEqual(comparePngs(a, copyImage(a)), { sameSize: true, differing: 0 });
  });

  test("it counts each pixel that differs once, whatever channel differs", () => {
    const a = noise(6, 4);
    const b = copyImage(a);
    b.rgba[0] ^= 1; // red of (0,0)
    b.rgba[(2 * 6 + 3) * 4 + 3] ^= 1; // alpha of (3,2)
    b.rgba[(3 * 6 + 5) * 4 + 1] ^= 1;
    b.rgba[(3 * 6 + 5) * 4 + 2] ^= 1; // two channels of (5,3): still one pixel
    assert.deepEqual(comparePngs(a, b), { sameSize: true, differing: 3 });
  });

  test("it reads PNG files as well as images", () => {
    const a = noise(5, 5);
    const b = copyImage(a);
    plant(b, 2, 2, [1, 2, 3, 255]);
    assert.deepEqual(comparePngs(encodePng(a), encodePng(b)), { sameSize: true, differing: 1 });
  });

  test("pictures of different sizes are never equal: a pixel only one has differs", () => {
    const a = flat(10, 10, [9, 9, 9]);
    const b = flat(12, 10, [9, 9, 9]);
    assert.deepEqual(comparePngs(a, b), { sameSize: false, differing: 20 });
    assert.deepEqual(comparePngs(b, a), { sameSize: false, differing: 20 });
  });
});

describe("composeComparison", () => {
  // 300 by 20 is wide enough that no label is wider than its panel, and too wide for the doubled scale.
  const tb = flat(300, 20, [10, 20, 30]);
  const vb6 = flat(300, 20, [10, 20, 30]);
  plant(tb, 5, 3, [200, 100, 50, 255]);

  test("three panels, a gutter and a margin of 8, a label strip over them", () => {
    const out = composeComparison(tb, vb6);
    assert.equal(out.scale, 1);
    assert.equal(GUTTER, 8);
    assert.equal(out.width, 2 * 8 + 3 * 300 + 2 * 8);
    assert.equal(out.height, 2 * 8 + (7 + 6) + 20);
    assert.equal(out.rgba.length, out.width * out.height * 4);
    assert.deepEqual(pixel(out, 0, 0), [255, 255, 255, 255], "the ground is white");
    assert.deepEqual(pixel(out, 8 + 300 + 4, 30), [255, 255, 255, 255], "so is a gutter");
  });

  test("the planted difference is pure red in the difference panel, and the rest is a faint grey", () => {
    const out = composeComparison(tb, vb6);
    const left = 8 + 2 * (300 + 8);
    const top = 8 + 13;
    assert.deepEqual(pixel(out, left + 5, top + 3), [255, 0, 0, 255]);
    const match = pixel(out, left + 6, top + 3);
    assert.ok(match[0] === match[1] && match[1] === match[2] && match[0] > 150 && match[0] < 255, `grey, got ${match}`);
    // The first two panels show the pictures themselves.
    assert.deepEqual(pixel(out, 8 + 5, top + 3), [200, 100, 50, 255]);
    assert.deepEqual(pixel(out, 8 + 300 + 8 + 5, top + 3), [10, 20, 30, 255]);
  });

  test("it says how many pixels differ, and that nothing does", () => {
    assert.equal(composeComparison(tb, vb6).differing, 1);
    assert.equal(composeComparison(vb6, copyImage(vb6)).differing, 0);
    const same = composeComparison(vb6, copyImage(vb6));
    assert.equal(same.differing, 0);
    const where = pixel(same, 8 + 2 * (300 + 8) + 5, 8 + 13 + 3);
    assert.notDeepEqual(where, [255, 0, 0, 255], "no red in an identical comparison");
  });

  test("a small picture is doubled, a large one is not, and the scale can be given", () => {
    const small = flat(50, 10, [0, 0, 0]);
    assert.equal(composeComparison(small, small).scale, 2);
    assert.equal(composeComparison(flat(199, 199, [0, 0, 0]), flat(199, 199, [0, 0, 0])).scale, 2);
    assert.equal(composeComparison(flat(200, 10, [0, 0, 0]), flat(200, 10, [0, 0, 0])).scale, 1);
    assert.equal(composeComparison(small, small, {}, { scale: 3 }).scale, 3);
    assert.throws(() => composeComparison(small, small, {}, { scale: 0 }), /whole number/);
    const doubled = composeComparison(small, small);
    const left = 8;
    const top = 8 + (7 * 2 + 6);
    assert.deepEqual(pixel(doubled, left + 1, top + 1), [0, 0, 0, 255]);
    assert.deepEqual(
      pixel(doubled, left + 2 * 49 + 1, top + 2 * 9 + 1),
      [0, 0, 0, 255],
      "the last pixel fills two by two",
    );
  });

  test("a panel is never narrower than its label", () => {
    const tiny = flat(4, 4, [0, 0, 0]);
    const out = composeComparison(tiny, tiny, { tb: "TWINBASIC BETA 995" });
    const labelWidth = (18 * 6 - 1) * out.scale;
    assert.ok(out.width >= 3 * labelWidth + 4 * 8, `width ${out.width}`);
  });

  test("pictures of different sizes are laid on the larger canvas, grey and red where one is missing", () => {
    const a = flat(300, 20, [0, 0, 0]);
    const b = flat(310, 20, [0, 0, 0]);
    const out = composeComparison(a, b);
    assert.equal(out.sameSize, false);
    assert.equal(out.differing, 20 * 10);
    const top = 8 + 13;
    const panel = 310;
    assert.deepEqual(pixel(out, 8 + 305, top + 5), [224, 224, 224, 255], "the smaller picture's panel is padded grey");
    assert.deepEqual(
      pixel(out, 8 + 2 * (panel + 8) + 305, top + 5),
      [255, 0, 0, 255],
      "and the difference is red there",
    );
  });

  test("it accepts PNG files, and its own result can be encoded and decoded", () => {
    const out = composeComparison(encodePng(tb), encodePng(vb6));
    const back = decodePng(encodePng(out));
    assert.equal(back.width, out.width);
    assert.deepEqual(Array.from(back.rgba), Array.from(out.rgba));
  });

  test("every character of the label font draws, and every glyph is five by seven", () => {
    const blank = flat(300, 20, [255, 255, 255]);
    for (const ch of LABEL_CHARS) {
      const rows = glyphRows(ch);
      assert.equal(rows.length, 7, `glyph ${ch}`);
      for (const row of rows) assert.match(row, /^[.#]{5}$/, `glyph ${ch}`);
      const out = composeComparison(blank, blank, { tb: ch, vb6: "", diff: "" });
      // The strip over the first panel: rows 8 + 3 to 8 + 3 + 6, columns 8 to 8 + 4.
      let ink = 0;
      for (let y = 11; y <= 17; y++) for (let x = 8; x <= 12; x++) if (pixel(out, x, y)[0] < 128) ink++;
      if (ch === " ") assert.equal(ink, 0, "a space draws nothing");
      else assert.ok(ink > 0, `${JSON.stringify(ch)} draws nothing`);
    }
  });

  test("lower case is drawn as upper case, and an unknown character as a question mark", () => {
    assert.deepEqual(glyphRows("a"), glyphRows("A"));
    assert.deepEqual(glyphRows("~"), glyphRows("?"));
    assert.notDeepEqual(glyphRows("O"), glyphRows("0"));
  });
});

// ---------------------------------------------------------------------- repro-images.mjs

describe("imagesKeyProblem", () => {
  test("accepts a list of names of letters, digits, - and _", () => {
    assert.equal(imagesKeyProblem(["main"]), null);
    assert.equal(imagesKeyProblem(["a", "B-2", "c_3"]), null);
  });

  test("refuses everything else, and names the key", () => {
    assert.match(imagesKeyProblem([]).why, /non-empty list/);
    assert.match(imagesKeyProblem("main").why, /non-empty list/);
    assert.equal(imagesKeyProblem(["ok", "bad name"]).key, "images[1]");
    assert.equal(imagesKeyProblem(["a.png"]).key, "images[0]");
    assert.equal(imagesKeyProblem([""]).key, "images[0]");
    assert.equal(imagesKeyProblem([3]).key, "images[0]");
    assert.deepEqual(imagesKeyProblem(["a", "b", "a"]), { key: "images[2]", why: "names a twice" });
  });
});

describe("the PngDump modules and the Probe.vbp line", () => {
  test("a Probe.vbp gets the line after its last Module line, in its own line endings", () => {
    const vbp = 'Type=Exe\r\nModule=Module1; Module1.bas\r\nModule=Other; Other.bas\r\nStartup="Sub Main"\r\n';
    const out = addPngModule(vbp);
    assert.equal(
      out,
      'Type=Exe\r\nModule=Module1; Module1.bas\r\nModule=Other; Other.bas\r\nModule=PngDump; PngDump.bas\r\nStartup="Sub Main"\r\n',
    );
    assert.ok(hasPngModule(out));
    assert.equal(addPngModule(out), out, "a project that has it is left alone");
    assert.ok(addPngModule("Type=Exe\nStartup=x\n").includes("\nModule=PngDump; PngDump.bas\n"));
    assert.ok(!hasPngModule("Module=PngDumper; PngDump.bas\r\n"));
    assert.ok(!hasPngModule("' Module=PngDump; PngDump.bas\r\n"));
  });

  test("the templates exist, are CRLF, and are what the reproducers are compared with", () => {
    for (const name of [PNGDUMP_TWIN, PNGDUMP_BAS]) {
      const text = readFileSync(path.join(PNG_TEMPLATES, name), "latin1");
      assert.ok(text.includes("\r\n"), `${name} is CRLF`);
      assert.ok(!/(?<!\r)\n/.test(text), `${name} has no bare LF`);
      assert.ok(!/[^\t\r\n -~]/.test(text), `${name} is ASCII`);
    }
    assert.match(readFileSync(path.join(PNG_TEMPLATES, PNGDUMP_BAS), "latin1"), /^Attribute VB_Name = "PngDump"/);
    assert.match(readFileSync(path.join(PNG_TEMPLATES, PNGDUMP_TWIN), "latin1"), /^Module PngDump/);
  });

  test("both templates ask for the same things of GDI+ and agree on the folder rule", () => {
    const twin = readFileSync(path.join(PNG_TEMPLATES, PNGDUMP_TWIN), "latin1");
    const bas = readFileSync(path.join(PNG_TEMPLATES, PNGDUMP_BAS), "latin1");
    for (const text of [twin, bas]) {
      for (const needle of [
        "GdiplusStartup",
        "GdipCreateBitmapFromHBITMAP",
        "GdipSaveImageToFile",
        "GdipDisposeImage",
        "GdiplusShutdown",
        "{557CF406-1A04-11D3-9A73-0000F81EF32E}",
        'Environ$("BUGREPRO_IMAGES")',
        "App.Path",
      ]) {
        assert.ok(text.includes(needle), `${needle} is missing`);
      }
      assert.ok(!/\b(MsgBox|InputBox)\b/i.test(text), "no prompt");
      assert.match(text, /PngPrintWindow\(hWnd, memDC, 3\)/, "PW_CLIENTONLY Or PW_RENDERFULLCONTENT");
      assert.match(text, /Err\.Raise 5, "PngDump", failure/, "the failure is error 5 with a description");
    }
    assert.ok(twin.includes("PtrSafe") && twin.includes("LongPtr"));
    assert.ok(!bas.includes("PtrSafe") && !bas.includes("LongPtr"));
  });
});

/** A reproducer folder with the layout `new --with-images --with-vb6` makes, built from the templates. */
function reproducer({ vb6 = true } = {}) {
  const dir = folder();
  mkdirSync(path.join(dir, "src", "Sources"), { recursive: true });
  writeFileSync(path.join(dir, "src", "Settings"), "{}");
  if (vb6) {
    mkdirSync(path.join(dir, "vb6"));
    writeFileSync(
      path.join(dir, "vb6", "Probe.vbp"),
      'Type=Exe\r\nModule=Module1; Module1.bas\r\nStartup="Sub Main"\r\n',
    );
  }
  copyImageTemplates(dir, { withVb6: vb6 });
  return dir;
}

describe("imageSourceCheck", () => {
  test("a reproducer made from the templates has neither error nor warning", () => {
    assert.deepEqual(imageSourceCheck(reproducer()), { errors: [], warnings: [] });
    assert.deepEqual(imageSourceCheck(reproducer({ vb6: false })), { errors: [], warnings: [] });
  });

  test("a copy with other line endings is the same copy", () => {
    const dir = reproducer();
    const file = path.join(dir, "src", "Sources", PNGDUMP_TWIN);
    writeFileSync(file, normaliseEol(readFileSync(file, "latin1")), "latin1");
    assert.deepEqual(imageSourceCheck(dir), { errors: [], warnings: [] });
  });

  test("a missing PngDump.twin is an error, found anywhere under Sources", () => {
    const dir = reproducer({ vb6: false });
    rmSync(path.join(dir, "src", "Sources", PNGDUMP_TWIN));
    assert.match(imageSourceCheck(dir).errors[0], /needs a PngDump\.twin under src\/Sources/);
    mkdirSync(path.join(dir, "src", "Sources", "Deep", "Er"), { recursive: true });
    copyFileSync(path.join(PNG_TEMPLATES, PNGDUMP_TWIN), path.join(dir, "src", "Sources", "Deep", "Er", PNGDUMP_TWIN));
    assert.deepEqual(imageSourceCheck(dir), { errors: [], warnings: [] });
  });

  test("with vb6/, PngDump.bas and the Probe.vbp line are errors when missing", () => {
    const dir = reproducer();
    rmSync(path.join(dir, "vb6", PNGDUMP_BAS));
    assert.match(imageSourceCheck(dir).errors[0], /needs vb6\/PngDump\.bas/);
    const other = reproducer();
    writeFileSync(path.join(other, "vb6", "Probe.vbp"), "Type=Exe\r\nModule=Module1; Module1.bas\r\n");
    assert.match(imageSourceCheck(other).errors[0], /Probe\.vbp needs the line Module=PngDump; PngDump\.bas/);
  });

  test("a copy that differs from its template is a warning, not an error", () => {
    const dir = reproducer();
    const twin = path.join(dir, "src", "Sources", PNGDUMP_TWIN);
    writeFileSync(twin, `${readFileSync(twin, "latin1")}' changed\r\n`, "latin1");
    const bas = path.join(dir, "vb6", PNGDUMP_BAS);
    writeFileSync(bas, `${readFileSync(bas, "latin1")}' changed\r\n`, "latin1");
    const { errors, warnings } = imageSourceCheck(dir);
    assert.deepEqual(errors, []);
    assert.equal(warnings.length, 2);
    assert.match(warnings[0], /^src\/Sources\/PngDump\.twin differs from test\/repro-templates\/png\/PngDump\.twin$/);
    assert.match(warnings[1], /^vb6\/PngDump\.bas differs/);
  });
});

describe("keeping and comparing pictures", () => {
  test("collectImages copies each picture to its name with the kind, and reports the missing", () => {
    const from = folder();
    const to = path.join(folder(), "images");
    writeFileSync(path.join(from, "a.png"), encodePng(noise(2, 2)));
    const { found, missing } = collectImages(from, to, ["a", "b"], "tb");
    assert.deepEqual(found, ["a"]);
    assert.deepEqual(missing, ["b"]);
    assert.ok(existsSync(imageFile(to, "a", "tb")));
    assert.ok(!existsSync(imageFile(to, "b", "tb")));
  });

  test("writeComparison waits for both pictures, then writes the third and says what it shows", () => {
    const dir = folder();
    const a = noise(40, 20);
    const b = copyImage(a);
    writeFileSync(imageFile(dir, "p", "tb"), encodePng(a));
    assert.equal(writeComparison(dir, "p"), null);
    plant(b, 1, 1, [1, 2, 3, 255]);
    plant(b, 2, 2, [1, 2, 3, 255]);
    writeFileSync(imageFile(dir, "p", "vb6"), encodePng(b));
    writeFileSync(path.join(dir, "tb-beta.txt"), "995\n");
    const made = writeComparison(dir, "p");
    assert.equal(made.line, "image p: 2 pixels differ");
    assert.equal(made.differing, 2);
    assert.equal(made.file, imageFile(dir, "p", "compare"));
    const picture = decodePng(readFileSync(made.file));
    assert.equal(
      picture.width,
      2 * 8 + 3 * Math.max(40 * 2, ("DIFFERENCE: 2 PIXELS".length * 6 - 1) * 2) + 2 * 8,
      "scaled twice, labels wider than the picture",
    );
    assert.equal(recordedBeta(dir), 995);
    assert.equal(tbLabel(995), "TWINBASIC BETA 995");
    assert.equal(tbLabel(null), "TWINBASIC");
  });

  test("identical pictures say identical; different sizes say so", () => {
    const a = flat(10, 10, [1, 1, 1]);
    assert.equal(comparisonLine("n", a, a, comparePngs(a, a)), "image n: identical");
    const b = flat(12, 10, [1, 1, 1]);
    assert.equal(
      comparisonLine("n", a, b, comparePngs(a, b)),
      "image n: sizes differ (twinBASIC 10x10, VB6 12x10), 20 pixels differ",
    );
  });

  test("a picture that is not a PNG is an ImageError that names the file", () => {
    const dir = folder();
    writeFileSync(imageFile(dir, "p", "tb"), "junk");
    writeFileSync(imageFile(dir, "p", "vb6"), encodePng(noise(2, 2)));
    assert.throws(
      () => writeComparison(dir, "p"),
      (e) => e instanceof ImageError && /p-tb\.png cannot be read: not a PNG/.test(e.message),
    );
  });

  test("compareWithKept judges fresh pictures against the kept VB6 ones, and names what is missing", () => {
    const fresh = folder();
    const kept = folder();
    const a = noise(8, 8);
    const b = copyImage(a);
    plant(b, 0, 0, [9, 9, 9, 255]);
    writeFileSync(path.join(fresh, "same.png"), encodePng(a));
    writeFileSync(imageFile(kept, "same", "vb6"), encodePng(a));
    writeFileSync(path.join(fresh, "diff.png"), encodePng(a));
    writeFileSync(imageFile(kept, "diff", "vb6"), encodePng(b));
    writeFileSync(path.join(fresh, "size.png"), encodePng(noise(9, 8)));
    writeFileSync(imageFile(kept, "size", "vb6"), encodePng(a));
    assert.deepEqual(compareWithKept(fresh, kept, ["same", "diff", "size"]), [
      { name: "same", sameSize: true, differing: 0 },
      { name: "diff", sameSize: true, differing: 1 },
      { name: "size", sameSize: false, differing: comparePngs(noise(9, 8), a).differing },
    ]);
    assert.throws(
      () => compareWithKept(fresh, kept, ["gone"]),
      (e) => e instanceof ImageError && /wrote no picture gone\.png/.test(e.message),
    );
    writeFileSync(path.join(fresh, "nokept.png"), encodePng(a));
    assert.throws(
      () => compareWithKept(fresh, kept, ["nokept"]),
      (e) => e instanceof ImageError && /no images\/nokept-vb6\.png/.test(e.message),
    );
  });

  test("imagesDiffer true reproduces when one picture differs, a size counting; false when every one matches", () => {
    const match = { name: "a", sameSize: true, differing: 0 };
    const differ = { name: "b", sameSize: true, differing: 5 };
    const resized = { name: "c", sameSize: false, differing: 9 };
    assert.deepEqual(imagesDifferProblems(true, [match, differ]), []);
    assert.deepEqual(imagesDifferProblems(true, [match, resized]), []);
    assert.equal(imagesDifferProblems(true, [match]).length, 1);
    assert.deepEqual(imagesDifferProblems(false, [match]), []);
    assert.match(imagesDifferProblems(false, [match, differ])[0], /picture b differs .* 5 pixels/);
    assert.match(imagesDifferProblems(false, [resized])[0], /picture c is not the size/);
  });

  test("the zip holds every file of images/, flat, in name order", () => {
    const dir = folder();
    assert.deepEqual(imageZipEntries(dir), []);
    mkdirSync(path.join(dir, "images", "sub"), { recursive: true });
    writeFileSync(path.join(dir, "images", "b-vb6.png"), "2");
    writeFileSync(path.join(dir, "images", "a-tb.png"), "1");
    writeFileSync(path.join(dir, "images", "tb-beta.txt"), "995\n");
    assert.deepEqual(
      imageZipEntries(dir).map((e) => e.name),
      ["images/a-tb.png", "images/b-vb6.png", "images/tb-beta.txt"],
    );
  });
});

// --------------------------------------------------------------- bug_repro.mjs over fixtures

const BUG_REPRO = path.join(REPO_ROOT, "scripts", "bug_repro.mjs");

/** bug_repro.mjs over a fixture folder, with no IDE and no VB6 to find. */
function bugRepro(bugs, ...args) {
  const env = { ...process.env, BUG_REPRO_BUGS: bugs, TB_IDE: path.join(bugs, "no-ide", "twinBASIC.exe") };
  delete env.TBBUILD_SHOW;
  const r = spawnSync(process.execPath, [BUG_REPRO, ...args], { env, encoding: "utf8", cwd: scratch });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

describe("bug_repro.mjs", () => {
  const bugs = folder();
  const reproFile = (slug) => path.join(bugs, slug, "repro.json");
  /** A reproducer made by `new --with-images --with-vb6`, its repro.json then rewritten. */
  function made(slug, repro) {
    const r = bugRepro(bugs, "new", slug, "A picture", "--with-vb6", "--with-images");
    assert.equal(r.code, 0, r.stderr);
    if (repro) writeFileSync(reproFile(slug), `${JSON.stringify(repro, null, 2)}\n`);
    return slug;
  }
  const verifyMessage = (slug) => bugRepro(bugs, "verify", slug);

  test("new --with-images --with-vb6 copies both modules, adds the line and lists main", () => {
    const r = bugRepro(bugs, "new", "pic-new", "A picture", "--with-vb6", "--with-images");
    assert.equal(r.code, 0, r.stderr);
    const dir = path.join(bugs, "pic-new");
    assert.deepEqual(readJson(reproFile("pic-new")).images, ["main"]);
    assert.equal(readJson(reproFile("pic-new")).mode, "manual");
    assert.ok(
      readFileSync(path.join(dir, "src", "Sources", PNGDUMP_TWIN)).equals(
        readFileSync(path.join(PNG_TEMPLATES, PNGDUMP_TWIN)),
      ),
    );
    assert.ok(
      readFileSync(path.join(dir, "vb6", PNGDUMP_BAS)).equals(readFileSync(path.join(PNG_TEMPLATES, PNGDUMP_BAS))),
    );
    assert.ok(hasPngModule(readFileSync(path.join(dir, "vb6", "Probe.vbp"), "latin1")));
    assert.ok(readFileSync(path.join(dir, "vb6", "Probe.vbp"), "latin1").includes("\r\n"), "Probe.vbp stays CRLF");
    assert.deepEqual(imageSourceCheck(dir), { errors: [], warnings: [] });
    assert.match(r.stdout, /pictures: src\/Sources\/PngDump\.twin and vb6\/PngDump\.bas/);
    // A manual reproducer with images is valid, and says nothing on stderr.
    const v = verifyMessage("pic-new");
    assert.equal(v.code, 0, v.stderr);
    assert.match(v.stdout, /pic-new: manual/);
    assert.equal(v.stderr, "");
  });

  test("new --with-images without --with-vb6 copies the twinBASIC module only", () => {
    const r = bugRepro(bugs, "new", "pic-tb-only", "A picture", "--with-images");
    assert.equal(r.code, 0, r.stderr);
    assert.ok(existsSync(path.join(bugs, "pic-tb-only", "src", "Sources", PNGDUMP_TWIN)));
    assert.ok(!existsSync(path.join(bugs, "pic-tb-only", "vb6")));
    assert.equal(verifyMessage("pic-tb-only").code, 0);
  });

  test("new without --with-images has no images key", () => {
    assert.equal(bugRepro(bugs, "new", "pic-plain", "A picture").code, 0);
    assert.ok(!("images" in readJson(reproFile("pic-plain"))));
  });

  test("--with-images belongs to new alone", () => {
    const r = bugRepro(bugs, "pack", "pic-plain", "--with-images");
    assert.equal(r.code, 2);
    assert.match(r.stderr, /^--with-images does not apply to pack\n/);
  });

  test("images is refused when it is not a list of valid names", () => {
    for (const [images, key] of [
      [[], '"images"'],
      ["main", '"images"'],
      [["a b"], '"images[0]"'],
      [["a", "a"], '"images[1]"'],
    ]) {
      const slug = made("pic-bad-list", { mode: "manual", steps: "x", images });
      const r = verifyMessage(slug);
      assert.equal(r.code, 2, JSON.stringify(images));
      assert.ok(r.stderr.includes(key), r.stderr);
      rmSync(path.join(bugs, slug), { recursive: true });
    }
  });

  test("images applies to the run and manual modes only", () => {
    const slug = made("pic-compile", { mode: "compile", expect: { noDiagnostics: true }, images: ["main"] });
    const r = verifyMessage(slug);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /"images" applies to the run and manual modes only/);
  });

  test("images needs the modules that draw it", () => {
    const slug = made("pic-nomodule", { mode: "manual", steps: "x", images: ["main"] });
    rmSync(path.join(bugs, slug, "src", "Sources", PNGDUMP_TWIN));
    assert.match(verifyMessage(slug).stderr, /"images" images needs a PngDump\.twin under src\/Sources/);
    const other = made("pic-novbp", { mode: "manual", steps: "x", images: ["main"] });
    writeFileSync(path.join(bugs, other, "vb6", "Probe.vbp"), "Type=Exe\r\nModule=Module1; Module1.bas\r\n");
    assert.match(verifyMessage(other).stderr, /Probe\.vbp needs the line Module=PngDump; PngDump\.bas/);
  });

  test("a module that has drifted from the template warns, once, and is accepted", () => {
    const slug = made("pic-drift", { mode: "manual", steps: "x", images: ["main"] });
    const twin = path.join(bugs, slug, "src", "Sources", PNGDUMP_TWIN);
    writeFileSync(twin, `${readFileSync(twin, "latin1")}' filed this way\r\n`, "latin1");
    const r = verifyMessage(slug);
    assert.equal(r.code, 0, r.stderr);
    assert.match(
      r.stderr,
      /^warning: .*pic-drift.*repro\.json: src\/Sources\/PngDump\.twin differs from test\/repro-templates\/png\/PngDump\.twin\n$/,
    );
  });

  test("expect.imagesDiffer needs a boolean, the images list and the kept VB6 pictures", () => {
    const run = (imagesDiffer, extra = {}) => ({
      mode: "run",
      images: ["main"],
      expect: { output: ["x"], imagesDiffer },
      ...extra,
    });
    const slug = made("pic-differ", run(true));
    const noPicture = verifyMessage(slug);
    assert.equal(noPicture.code, 2);
    assert.match(noPicture.stderr, /"expect\.imagesDiffer" needs .*main-vb6\.png, the VB6 picture to compare with/);

    writeFileSync(reproFile(slug), `${JSON.stringify(run("yes"), null, 2)}\n`);
    assert.match(verifyMessage(slug).stderr, /"expect\.imagesDiffer" must be true or false/);

    const without = made("pic-differ-noimages", { mode: "run", expect: { imagesDiffer: true } });
    rmSync(path.join(bugs, without, "src", "Sources", PNGDUMP_TWIN));
    writeFileSync(reproFile(without), `${JSON.stringify({ mode: "run", expect: { imagesDiffer: true } }, null, 2)}\n`);
    assert.match(verifyMessage(without).stderr, /"expect\.imagesDiffer" needs an images list/);

    // With the VB6 picture kept, the file is valid: the next thing refused is the missing IDE.
    mkdirSync(path.join(bugs, slug, "images"));
    writeFileSync(imageFile(path.join(bugs, slug, "images"), "main", "vb6"), encodePng(noise(4, 4)));
    for (const flag of [true, false]) {
      writeFileSync(reproFile(slug), `${JSON.stringify(run(flag), null, 2)}\n`);
      const valid = verifyMessage(slug);
      assert.equal(valid.code, 2);
      assert.match(valid.stderr, /no twinBASIC IDE at /, `imagesDiffer ${flag}: ${valid.stderr}`);
    }
  });

  test("expect.imagesDiffer is for the run mode alone", () => {
    const slug = made("pic-differ-compile", { mode: "compile", expect: { imagesDiffer: true } });
    assert.match(verifyMessage(slug).stderr, /"expect\.imagesDiffer" does not apply to the compile mode/);
  });

  test("an attachment may not be a file of images/", () => {
    const slug = made("pic-attach", { mode: "manual", steps: "x", images: ["main"], attach: ["images/main-tb.png"] });
    mkdirSync(path.join(bugs, slug, "images"));
    writeFileSync(path.join(bugs, slug, "images", "main-tb.png"), encodePng(noise(2, 2)));
    assert.match(
      verifyMessage(slug).stderr,
      /"attach\[0\]" names images\/main-tb\.png, which goes into pic-attach\.zip/,
    );
  });
});

describe("embedProblems", () => {
  const withPicture = () => {
    const dir = folder();
    mkdirSync(path.join(dir, "bugs", "x", "images"), { recursive: true });
    writeFileSync(path.join(dir, "bugs", "x", "images", "main-compare.png"), encodePng(noise(2, 2)));
    return dir;
  };

  test("a picture embedded by a path from the report's folder shows", () => {
    const dir = withPicture();
    const images = path.join(dir, "bugs", "x", "images");
    assert.deepEqual(embedProblems("![a](bugs/x/images/main-compare.png)", dir, images, ["main"]), []);
    assert.deepEqual(embedProblems("![](images/main-compare.png)", path.join(dir, "bugs", "x"), images, ["main"]), []);
  });

  test("a link, a code span or another picture is not an embedded picture", () => {
    const dir = withPicture();
    const images = path.join(dir, "bugs", "x", "images");
    for (const text of [
      "[a](bugs/x/images/main-compare.png)",
      "`bugs/x/images/main-compare.png`",
      "![a](bugs/x/images/main-tb.png)",
      "![a](images/main-compare.png)",
    ]) {
      assert.deepEqual(embedProblems(text, dir, images, ["main"]), [
        "main: no ![...](bugs/x/images/main-compare.png) embeds the picture",
      ]);
    }
  });

  test("an embedded picture whose file is missing is named, and so is each name not embedded", () => {
    const dir = withPicture();
    const images = path.join(dir, "bugs", "x", "images");
    assert.deepEqual(embedProblems("![a](bugs/x/images/side-compare.png)", dir, images, ["main", "side"]), [
      "main: no ![...](bugs/x/images/main-compare.png) embeds the picture",
      "side: it embeds bugs/x/images/side-compare.png, which does not exist",
    ]);
  });
});

// The reports themselves: every reproducer whose repro.json names pictures shows each of them in
// its entry of BUGS-TO-REPORT.md, or in its REPORT.md once filed. The pictures are part of the
// report, so a reproducer that makes them and an entry that does not show them is a fault here.
describe("the bug reports show their pictures", () => {
  const queueText = normaliseEol(readFileSync(path.join(REPO_ROOT, "BUGS-TO-REPORT.md"), "utf8"));
  const entries = queueText.split(/^---$/m).slice(1);
  const reproducers = (base) =>
    existsSync(base)
      ? readdirSync(base, { withFileTypes: true })
          .filter((e) => e.isDirectory() && existsSync(path.join(base, e.name, "repro.json")))
          .map((e) => ({ slug: e.name, dir: path.join(base, e.name) }))
      : [];
  const bugsDir = path.join(REPO_ROOT, "bugs");
  const all = [...reproducers(bugsDir).filter((r) => r.slug !== "filed"), ...reproducers(path.join(bugsDir, "filed"))];
  const withImages = all
    .map((r) => ({ ...r, images: JSON.parse(readFileSync(path.join(r.dir, "repro.json"), "utf8")).images }))
    .filter((r) => Array.isArray(r.images));

  // A queue can hold no graphical entry; the tests above cover embedProblems itself.
  test("the scan finds reproducers, so this check reads something", (t) => {
    assert.ok(all.length > 0);
    if (withImages.length === 0) t.diagnostic("no reproducer names pictures today");
  });

  for (const r of withImages) {
    test(`${path.relative(REPO_ROOT, r.dir).split(path.sep).join("/")} shows each picture in its report`, () => {
      const images = path.join(r.dir, "images");
      const report = path.join(r.dir, "REPORT.md");
      if (existsSync(report)) {
        assert.deepEqual(embedProblems(readFileSync(report, "utf8"), r.dir, images, r.images), []);
        return;
      }
      const mine = entries.filter((e) => e.includes(`bugs/${r.slug}/`));
      assert.equal(mine.length, 1, `one entry of BUGS-TO-REPORT.md names bugs/${r.slug}/`);
      assert.deepEqual(embedProblems(mine[0], REPO_ROOT, images, r.images), []);
    });
  }
});
