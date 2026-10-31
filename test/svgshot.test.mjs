// Tests for scripts/svgshot/snapshot-svg.mjs that need no browser: oneLine, which keeps a
// picture's SVG on one line, so that a CRLF checkout changes only its last line ending, and
// underlineBand and decoratingBoxes, which place an underline as Chromium does: the figures
// below are the ones scripts/svgshot/bench/decoration.html was fitted to in Edge; and
// naturalSize, which sizes a background image by its bytes; and the frames: decodeSnapshot's
// documents of <iframe>s, and where a frame's document is drawn in its parent (frameGeometry,
// frameView, unzoom, viewportScroller, canvasColor). What a picture's SVG keeps of an
// image it embeds is compactImage's, in scripts/lib/compact-image.mjs, and
// test/compact-image.test.mjs tests it. The web fonts a frame's text is drawn in:
// webFontFiles, which finds the @font-face rules a run's font means by the names its document
// gives (given a document of its own here), webRulesFor, which picks of a family split into
// files by unicode-range the ones that hold a run's characters, and fonts.mjs's reading of a
// WOFF2 font and its faces for a variable one, tested on the site's own fonts. Inline <svg>s:
// inlineSvgsIn, which lists the ones to read in the page, and scopeIds, which keeps the ids of
// two icons apart in one picture; the reading of an <svg> itself is in the page and is
// measured by the bench pages. And colour-filter.mjs, which bakes a filter of colour functions
// into the colours its group paints. And redraw.mjs, which replay.mjs and sheet.mjs share:
// redraw, which draws a picture again from its bundle or names its retake, and fails on the
// user name unless its caller turns the check off; the pictures listed; the folders a sheet
// is refused; and the sheet's page. And the sheet of changes against a git revision
// (sheet.mjs --against): git's change list, the comparison of two pictures over two sizes,
// the noise rule, the order and the page.
//
// Runs with a bare `node --test test/svgshot.test.mjs`: no tree, no build.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import {
  BUNDLE_VERSION,
  bundleFile,
  dropBundle,
  drawBundle,
  listBundles,
  pngHash,
  readBundle,
  renderBundle,
  trimSnapshot,
  writeBundle,
} from "../scripts/svgshot/bundle.mjs";
import { SNAPSHOT_STYLES, webFontFiles } from "../scripts/svgshot/capture.mjs";
import { decodePng, encodePng } from "../scripts/lib/png.mjs";
import { changeMap, compareImages, withinNoise } from "../scripts/lib/shot-change.mjs";
import {
  openRevision,
  parseCatFileBatch,
  pictureFate,
  planCleanup,
  restoreFromRevision,
  revisionOf,
  svgFate,
} from "../scripts/lib/shot-revision.mjs";
import {
  changedPictures,
  cleanupCommand,
  changeFiles,
  changeSheetHtml,
  compareRevisionPicture,
  judgedFiles,
  listPictures,
  parseNameStatus,
  parseUntracked,
  restoreCommand,
  sortChangeRows,
  mayWriteSheet,
  notDrawn,
  outputRefusal,
  pngSize,
  redraw,
  retakeText,
  SHEET_GENERATOR,
  sheetHtml,
  shareOf,
  slugOf,
  sortRows,
  themeOf,
} from "../scripts/svgshot/redraw.mjs";
import {
  bakeable,
  bakeColour,
  bakeMarkup,
  colourSteps,
  filterSteps,
  mapColour,
  stepsOpacity,
} from "../scripts/svgshot/colour-filter.mjs";
import {
  cmapCoverage,
  faceStyle,
  isVariable,
  parseUnicodeRange,
  PictureFonts,
  readable,
  subsetKey,
  useSubsetCache,
  webRulesFor,
} from "../scripts/svgshot/fonts.mjs";
import {
  canvasColor,
  decodeSnapshot,
  decoratingBoxes,
  elementTransform,
  frameGeometry,
  framesIn,
  frameView,
  inlineSvgsIn,
  nativeTextField,
  naturalSize,
  oneLine,
  scopeIds,
  selectLabel,
  shadowShowsThrough,
  underlineBand,
  untransformBox,
  unzoom,
  viewportGutters,
  viewportScroller,
  viewportStyleSources,
} from "../scripts/svgshot/snapshot-svg.mjs";

describe("naturalSize", () => {
  const png = (bytes) => `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;
  // A JFIF header, a quantisation table segment, then a baseline frame of 480 by 240.
  const jpeg = [
    ...[0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x48, 0x00, 0x48],
    ...[0x00, 0x00, 0xff, 0xdb, 0x00, 0x04, 0x00, 0x00],
    ...[
      0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0xf0, 0x01, 0xe0, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    ],
  ];

  test("reads a JPEG the IDE calls image/png from its frame header, not as a PNG", () => {
    assert.deepEqual(naturalSize(png(jpeg)), { w: 480, h: 240 });
  });

  test("reads a PNG and a GIF from their headers", () => {
    const ihdr = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52];
    assert.deepEqual(naturalSize(png([...ihdr, 0, 0, 0, 16, 0, 0, 0, 9, 8, 6, 0, 0, 0])), { w: 16, h: 9 });
    const gif = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 20, 0, 10, 0, 0, 0, 0];
    assert.deepEqual(naturalSize(png(gif)), { w: 20, h: 10 });
  });
});

describe("colour filters", () => {
  const steps = (v) => colourSteps(filterSteps(v));

  test("map a colour as the filter primitives do, each step clamped", () => {
    const c = { r: 236, g: 236, b: 236 };
    assert.deepEqual(mapColour(steps("brightness(0.95)"), c), { r: 224, g: 224, b: 224 });
    assert.deepEqual(mapColour(steps("invert(1)"), { r: 0, g: 120, b: 215 }), { r: 255, g: 135, b: 40 });
    assert.deepEqual(mapColour(steps("contrast(3)"), { r: 50, g: 100, b: 200 }), { r: 0, g: 45, b: 255 });
    // In order: inverted, then darkened; the other way round gives another colour.
    assert.deepEqual(mapColour(steps("invert(1) brightness(0.4)"), c), { r: 8, g: 8, b: 8 });
    assert.deepEqual(mapColour(steps("brightness(0.4) invert(1)"), c), { r: 161, g: 161, b: 161 });
    const hue = (v) => mapColour(steps(`hue-rotate(${v})`), { r: 200, g: 40, b: 90 });
    assert.deepEqual(hue("0.5turn"), hue("180deg"));
    assert.deepEqual(hue("200grad"), hue("180deg"));
    assert.deepEqual(hue("0deg"), { r: 200, g: 40, b: 90 });
    assert.equal(bakeColour(steps("invert(100%)"), "#fff"), "rgb(0, 0, 0)");
    assert.equal(bakeColour(steps("invert(1)"), "rgba(255, 0, 0, 0.5)"), "rgba(0, 255, 255, 0.5)");
    assert.equal(bakeColour(steps("invert(1)"), "currentColor"), null);
  });

  test("bake colour functions, keep opacity apart, and refuse a blur, a drop-shadow and a url()", () => {
    const all = filterSteps("opacity(0.5) grayscale(1) opacity(50%)");
    assert.ok(bakeable(all));
    assert.equal(stepsOpacity(all), 0.25);
    assert.deepEqual(
      colourSteps(all).map((s) => s.fn),
      ["grayscale"],
    );
    assert.ok(!bakeable(filterSteps("drop-shadow(rgb(0, 0, 0) 1px 1px 2px) invert(1)")));
    assert.ok(!bakeable(filterSteps("blur(2px)")));
    assert.equal(filterSteps("url(#x) invert(1)"), null);
  });

  // The converter's side of a bake, in miniature: defs by id, text classes by rule.
  function converter(defs, classes) {
    const ids = new Map();
    const notes = [];
    const ctx = {
      defOf: (id) => defs[Number(id.slice(1))],
      def: (key, make) => {
        if (!ids.has(key)) {
          ids.set(key, `d${defs.length}`);
          defs.push(make(`d${defs.length}`));
        }
        return ids.get(key);
      },
      cssOf: (cls) => [...classes].find(([, c]) => c === cls)?.[0],
      classFor: (css) => {
        if (!classes.has(css)) classes.set(css, `t${classes.size}`);
        return classes.get(css);
      },
      filterFor: () => "dF",
      wrappers: new Set(),
      note: (what) => notes.push(what),
    };
    return { ctx, notes };
  }

  test("bakeMarkup maps fills, strokes, text classes and gradient stops, and wraps a picture in a real filter", () => {
    const defs = [
      '<clipPath id="d0"><rect x="0" y="0" width="5" height="5"/></clipPath>',
      '<linearGradient id="d1"><stop offset="0" stop-color="rgb(255,255,255)"/></linearGradient>',
      '<image id="d2" width="1" height="1" href="data:image/png;base64,AA=="/>',
    ];
    const classes = new Map([["font-size:12px;fill:rgb(0, 0, 0)", "t0"]]);
    const { ctx, notes } = converter(defs, classes);
    const bake = { key: "invert(1)", steps: steps("invert(1)") };
    const out = bakeMarkup(
      '<g clip-path="url(#d0)"><rect fill="rgb(236, 236, 236)" stroke="#0078d7"/><rect fill="url(#d1)"/>' +
        '<text class="t0">Left</text><use href="#d2"/><rect fill="none" stroke="currentColor"/></g>',
      bake,
      ctx,
    );
    // A clip path has no colour: the same def. The gradient and the picture: new ones.
    assert.equal(
      out,
      '<g clip-path="url(#d0)"><rect fill="rgb(19, 19, 19)" stroke="rgb(255, 135, 40)"/><rect fill="url(#d3)"/>' +
        '<text class="t1">Left</text><use href="#d4"/><rect fill="none" stroke="currentColor"/></g>',
    );
    assert.equal(defs[3], '<linearGradient id="d3"><stop offset="0" stop-color="rgb(0, 0, 0)"/></linearGradient>');
    assert.equal(defs[4], '<g id="d4" filter="url(#dF)"><use href="#d2"/></g>');
    assert.equal(ctx.cssOf("t1"), "font-size:12px;fill:rgb(255, 255, 255)");
    assert.deepEqual(notes, ["colour currentColor under a filter"]);
    // Baked a second time, by an outer filter: the wrapper is wrapped again, outside it.
    assert.equal(
      bakeMarkup('<use href="#d4"/>', { key: "brightness(0.5)", steps: steps("brightness(0.5)") }, ctx),
      '<use href="#d5"/>',
    );
    assert.equal(defs[5], '<g id="d5" filter="url(#dF)"><use href="#d4"/></g>');
  });
});

describe("bundles", () => {
  // A page of a <select> 200 by 20 at 10, 10, whose selected option reads "Shown": a
  // run the converter measures (its font's metrics, the label's width).
  const STYLES = ["visibility", "background-color", "color", "font-family", "font-size", "font-weight", "font-style"];
  function bundleOf(page, weight = "400") {
    const strings = [];
    const s = (v) => {
      const i = strings.indexOf(v);
      return i >= 0 ? i : strings.push(v) - 1;
    };
    const names = ["#document", "HTML", "BODY", "SELECT", "OPTION", "#text"];
    const style = (bg) => [s("visible"), s(bg), s("rgb(0, 0, 0)"), s("Arial"), s("13px"), s(weight), s("normal")];
    const snapshot = {
      strings,
      documents: [
        {
          documentURL: s("http://localhost:1/"),
          baseURL: s("http://localhost:1/"),
          frameId: s("PAGE"),
          contentWidth: 400,
          contentHeight: 100,
          scrollOffsetX: 0,
          scrollOffsetY: 0,
          nodes: {
            parentIndex: [-1, 0, 1, 2, 3, 4],
            nodeType: [9, 1, 1, 1, 1, 3],
            nodeName: names.map(s),
            nodeValue: names.map((n) => (n === "#text" ? s("Shown") : -1)),
            backendNodeId: names.map((_, i) => 100 + i),
            attributes: names.map(() => []),
            optionSelected: { index: [4] },
          },
          layout: {
            nodeIndex: [1, 2, 3],
            styles: [style("rgb(255, 255, 255)"), style("rgba(0, 0, 0, 0)"), style("rgb(240, 240, 240)")],
            bounds: [
              [0, 0, 400, 100],
              [0, 0, 400, 100],
              [10, 10, 200, 20],
            ],
            text: [-1, -1, -1],
            paintOrders: [0, 1, 2],
            offsetRects: [[], [], []],
            clientRects: [[], [], []],
            scrollRects: [[], [], []],
          },
          textBoxes: { layoutIndex: [], bounds: [], start: [], length: [] },
        },
      ],
    };
    const key = JSON.stringify(["normal", weight, "13px", "Arial"]);
    return {
      version: BUNDLE_VERSION,
      styles: STYLES,
      view: { x: 0, y: 0, w: 400, h: 100 },
      background: true,
      snapshot,
      docs: [
        {
          frameId: "PAGE",
          scale: null,
          inner: null,
          page: page(key),
          skips: [],
          platform: [],
          webFonts: {},
          fontFiles: {},
          svgs: [],
          scrollbars: [],
        },
      ],
    };
  }
  const measured = (key) => ({
    allRuns: [[key, "Shown"]],
    widths: [34],
    metrics: { [key]: { ascent: 12, height: 15, line: 15 } },
    gaps: [],
    overlays: [],
    marked: [],
    canvases: [],
    placeholderColor: "rgb(117, 117, 117)",
  });

  test("is drawn the same from the bundle and from its file, and asks nothing it has no answer for", async () => {
    const bundle = bundleOf(measured);
    const live = await renderBundle(bundle);
    assert.match(live.svg, /<text [^>]*textLength="34"[^>]*>Shown<\/text>/);
    // Its platform fonts were not read: the one question the bundle cannot answer.
    assert.deepEqual(
      live.misses.map((m) => m.split(" ")[0]),
      ["fonts"],
    );
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-test-"));
    try {
      const png = Buffer.from("not a real picture");
      writeBundle(root, "Images/x.light.png", bundle, png, live.misses);
      const back = readBundle(root, "Images/x.light.png");
      assert.equal(back.png, pngHash(png));
      assert.deepEqual(back.misses, live.misses);
      assert.equal((await renderBundle(back)).svg, live.svg);
      // Both themes of a picture are one file, each slot written and dropped on its own.
      assert.equal(readBundle(root, "Images/x.png"), null);
      writeBundle(root, "Images/x.png", bundle, Buffer.from("dark"), []);
      assert.equal(bundleFile(root, "Images/x.png"), bundleFile(root, "Images/x.light.png"));
      assert.deepEqual(listBundles(root), ["Images/x.light.png", "Images/x.png"]);
      assert.equal(readBundle(root, "Images/x.light.png").png, pngHash(png));
      dropBundle(root, "Images/x.light.png");
      assert.deepEqual(listBundles(root), ["Images/x.png"]);
      dropBundle(root, "Images/x.png");
      assert.equal(fs.existsSync(bundleFile(root, "Images/x.png")), false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("is drawn again by redraw, which checks for the user name unless told not to", async () => {
    // redraw wants every style the converter reads: the rest are given as absent.
    const short = bundleOf(measured);
    const bundle = structuredClone(short);
    const extra = SNAPSHOT_STYLES.filter((s) => !STYLES.includes(s));
    bundle.styles = [...STYLES, ...extra];
    for (const row of bundle.snapshot.documents[0].layout.styles) row.push(...extra.map(() => -1));
    const { svg, misses } = await renderBundle(bundle);
    assert.equal(svg, (await renderBundle(short)).svg);
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "redraw-test-"));
    try {
      const bundlesRoot = path.join(root, "bundles");
      const docsRoot = path.join(root, "docs");
      fs.mkdirSync(path.join(docsRoot, "Images"), { recursive: true });
      const png = Buffer.from("the picture");
      fs.writeFileSync(path.join(docsRoot, "Images/x.png"), png);
      writeBundle(bundlesRoot, "Images/x.png", short, png, misses);
      const args = { bundlesRoot, docsRoot, out: "Images/x.png" };
      assert.match((await redraw({ ...args, user: "nobody" })).retake, /^the bundle has no display, /);
      writeBundle(bundlesRoot, "Images/x.png", bundle, png, misses);
      const drawn = await redraw({ ...args, user: "nobody" });
      assert.deepEqual(drawn.notes, []);
      assert.match(drawn.svg, />Shown<\/text>/);
      // The page's text holds "Shown": as a user name, it fails the picture, unless the
      // caller (sheet.mjs alone) turns the check off.
      await assert.rejects(redraw({ ...args, user: "SHOWN" }), /holds the Windows user name/);
      assert.equal((await redraw({ ...args, user: "SHOWN", checkUserName: false })).svg, drawn.svg);
      // A PNG that is not the bundle's is a retake, or with `stale` a note on a drawing.
      fs.writeFileSync(path.join(docsRoot, "Images/x.png"), Buffer.from("another picture"));
      const why = "the PNG is not the one the bundle was taken with";
      assert.deepEqual(await redraw({ ...args, user: "nobody" }), { retake: why });
      assert.deepEqual((await redraw({ ...args, user: "nobody", stale: true })).notes, [why]);
      // A question the bundle has no answer for: its text is the detail, kept out of the reason.
      writeBundle(bundlesRoot, "Images/x.png", bundle, png, []);
      fs.writeFileSync(path.join(docsRoot, "Images/x.png"), png);
      const asked = await redraw({ ...args, user: "nobody" });
      assert.equal(asked.retake, "no answer for 1 question");
      assert.equal(retakeText(asked), `no answer for 1 question: ${misses[0]}`);
      assert.deepEqual(await redraw({ ...args, out: "Images/y.png", user: "nobody" }), {
        retake: "there is no bundle",
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("counts each question a bundle has no answer for, once", async () => {
    const { misses } = await renderBundle(
      bundleOf((key) => ({ ...measured(key), allRuns: [], widths: [], metrics: {} })),
    );
    assert.deepEqual(
      misses.map((m) => m.split(" ")[0]),
      ["fonts", "metrics", "width"],
    );
  });

  // The select's box with a blurred outer shadow and the background colour `bg`: the shadow
  // is drawn outside the border box only, as Chromium paints it (shadowShowsThrough).
  const shadowed = (bg, clip = "border-box") => {
    const bundle = bundleOf(measured);
    bundle.styles = [...STYLES, "box-shadow", "background-clip"];
    const { strings, documents } = bundle.snapshot;
    const s = (v) => {
      const i = strings.indexOf(v);
      return i >= 0 ? i : strings.push(v) - 1;
    };
    const styles = documents[0].layout.styles;
    for (const st of styles) st.push(s("none"), s("border-box"));
    styles[2][1] = s(bg);
    styles[2][STYLES.length] = s("rgba(0, 0, 0, 0.5) 2px 2px 3px 0px");
    styles[2][STYLES.length + 1] = s(clip);
    return renderBundle(bundle);
  };

  test("clips an outer shadow to outside a box whose background does not cover it", async () => {
    // Transparent, translucent, or clipped inside the border box: the shadow would show through.
    for (const [bg, clip] of [
      ["rgba(0, 0, 0, 0)", "border-box"],
      ["rgba(240, 240, 240, 0.5)", "border-box"],
      ["rgb(240, 240, 240)", "padding-box"],
    ]) {
      const { svg } = await shadowed(bg, clip);
      assert.match(
        svg,
        /<clipPath id="(\w+)"><path clip-rule="evenodd" d="M7\.5 7\.5H216\.5V36\.5H7\.5ZM10 10h200v20h-200Z"\/><\/clipPath>/,
        `${bg} ${clip}`,
      );
      assert.match(
        svg,
        /<g clip-path="url\(#\w+\)"><rect x="12" y="12" width="200" height="20" fill="rgba\(0, 0, 0, 0\.5\)" filter=/,
      );
    }
    assert.equal(shadowShowsThrough({ "background-color": "rgb(1, 2, 3)" }), false);
    assert.equal(
      shadowShowsThrough({ "background-color": "rgb(1, 2, 3)", "background-clip": "border-box, content-box" }),
      true,
    );
    // An opaque colour over the whole border box hides the shadow under it: no clip.
    const { svg } = await shadowed("rgb(240, 240, 240)");
    assert.doesNotMatch(svg, /clip-rule="evenodd"/);
    assert.match(svg, /<rect x="12" y="12" width="200" height="20" fill="rgba\(0, 0, 0, 0\.5\)" filter=/);
  });

  test("draws a text field left with the browser's border and background as Chromium's native one", () => {
    const own = {
      appearance: "auto",
      "background-color": "rgb(255, 255, 255)",
      "background-image": "none",
      ...Object.fromEntries(
        ["top", "right", "bottom", "left"].flatMap((s) => [
          [`border-${s}-style`, "inset"],
          [`border-${s}-width`, "2px"],
          [`border-${s}-color`, "rgb(118, 118, 118)"],
        ]),
      ),
    };
    const field = (style, attrs = {}, name = "INPUT") => ({ style: { ...own, ...style }, node: { name, attrs } });
    assert.equal(nativeTextField(field({})), true);
    assert.equal(nativeTextField(field({}, { type: "password" })), true);
    // Styled, or not a text field: drawn from its style.
    assert.equal(nativeTextField(field({ "border-left-color": "rgb(0, 0, 0)" })), false);
    assert.equal(nativeTextField(field({ "background-color": "rgb(250, 250, 250)" })), false);
    assert.equal(nativeTextField(field({ "border-top-left-radius": "3px" })), false);
    assert.equal(nativeTextField(field({ appearance: "none" })), false);
    assert.equal(nativeTextField(field({}, { type: "checkbox" })), false);
    assert.equal(nativeTextField(field({}, {}, "TEXTAREA")), false);
  });

  test("refuses a bundle of another version, the one before this format included", async () => {
    await assert.rejects(renderBundle({ ...bundleOf(measured), version: BUNDLE_VERSION + 1 }), /a bundle of version/);
    assert.equal(BUNDLE_VERSION, 2);
    await assert.rejects(renderBundle({ ...bundleOf(measured), version: 1 }), /a bundle of version 1, not 2/);
  });

  describe("web fonts in a bundle", () => {
    const font = (name) =>
      `data:font/woff2;base64,${fs.readFileSync(`${REPO_ROOT}/docs/assets/fonts/${name}`).toString("base64")}`;
    // The rules of one family split in two by unicode-range, as a site serves it: Inter has
    // capitals and punctuation, Cascadia Mono the space and lower case, though both have them all.
    const rules = [
      { family: "inter", range: "U+21-5A", lo: 100, hi: 900 },
      { family: "cascadia", range: "U+20, U+61-7A", lo: 200, hi: 700 },
    ];
    const files = { inter: font("inter-variable.woff2"), cascadia: font("cascadia-mono-variable.woff2") };
    // A page whose label "Shown" is drawn by a web font at `weight`, kept in `webFonts`.
    function withWebFonts(weight, webFonts, fontFiles) {
      const bundle = bundleOf(measured, weight);
      const key = JSON.stringify(["normal", weight, "13px", "Arial"]);
      const platform = [[`${key}\u0000Shown`, [{ postScriptName: "Web", isCustomFont: true, glyphCount: 5 }]]];
      Object.assign(bundle.docs[0], { platform, webFonts: { [key]: webFonts }, fontFiles });
      return bundle;
    }
    const used = (face) =>
      [...face.used]
        .map((cp) => String.fromCodePoint(cp))
        .sort()
        .join("");

    test("each file is the face of the characters its rule holds, whichever file has glyphs for more", () => {
      const { fonts, misses } = drawBundle(withWebFonts("400", rules, files));
      assert.deepEqual(misses, []);
      // The later rule is listed first, and so is the first face; each face keeps the space.
      assert.deepEqual(fonts.faces.map(used), [" hnow", " S"]);
    });

    test("a variable file is cut at the run's weight, held to the weights its rule declares", () => {
      const { fonts } = drawBundle(withWebFonts("800", rules, files));
      assert.deepEqual(
        fonts.faces.map((f) => f.job.weight),
        [700, 800],
      );
    });

    test("a rule whose file could not be read draws nothing, and the rest is drawn", () => {
      const { fonts, misses } = drawBundle(withWebFonts("400", [{ ...rules[0], family: null }, rules[1]], files));
      assert.deepEqual(misses, []);
      // The capital, whose rule has no file, goes to the one face there is.
      assert.deepEqual(fonts.faces.map(used), [" Shnow"]);
    });

    test("a font of a key the bundle has no rules for is not drawn", () => {
      const { fonts } = drawBundle(withWebFonts("400", [], files));
      assert.equal(fonts.faces.length, 0);
    });

    test("the rules and the files are kept in the bundle file, and draw the same from it", async () => {
      const bundle = withWebFonts("400", rules, files);
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-test-"));
      try {
        writeBundle(root, "Images/w.png", bundle, Buffer.from("png"), []);
        const back = readBundle(root, "Images/w.png");
        assert.deepEqual(back.docs[0].webFonts, bundle.docs[0].webFonts);
        assert.deepEqual(back.docs[0].fontFiles, files);
        assert.deepEqual(drawBundle(back).fonts.faces.map(used), [" hnow", " S"]);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  });

  describe("inline svgs in a bundle", () => {
    const key = JSON.stringify(["normal", "400", "13px", "Arial"]);
    // The page's <select>, renamed to an <svg> (its layout object, 200 by 20 at 10, 10, has the key 0:2),
    // read as capture.mjs's inlineSvg reads one: a path with an id, a use of it, and a run of text.
    function withSvg(extra = {}) {
      const bundle = bundleOf((k) => ({
        ...measured(k),
        allRuns: [
          [k, "Shown"],
          [k, "Hi"],
        ],
        widths: [34, 10],
      }));
      bundle.snapshot.strings[bundle.snapshot.strings.indexOf("SELECT")] = "svg";
      const read = {
        attrs: { viewBox: "0 0 16 16", preserveAspectRatio: null, overflow: "visible" },
        style: "fill:rgb(255, 0, 0)",
        inner: '<path id="a" d="M0 0h8v8z"/><use href="#a" style="fill:url(#a)"/><text style="--tbk:0">Hi</text>',
        texts: [{ key, text: "Hi" }],
        foreign: 1,
        dropped: 0,
        ...extra,
      };
      bundle.docs[0].svgs = [["0:2", read]];
      return bundle;
    }

    test("is drawn in its box at its place, with its ids given a prefix of its own", () => {
      const { drawn, misses } = drawBundle(withSvg());
      assert.match(
        drawn.svg,
        /<svg x="10" y="10" width="200" height="20" viewBox="0 0 16 16" overflow="visible" style="fill:rgb\(255, 0, 0\)">/,
      );
      assert.match(drawn.svg, /<path id="v0-a" d="M0 0h8v8z"\/><use href="#v0-a" style="fill:url\(#v0-a\)"\/>/);
      // Its text is set in the picture's faces, and its marker is gone; no font was read here.
      assert.ok(!drawn.svg.includes("--tbk"));
      assert.deepEqual(
        misses.map((m) => m.split(" ")[0]),
        ["fonts"],
      );
      assert.equal(drawn.stats.svgs, 1);
      assert.deepEqual(drawn.stats.unsupported, {
        "foreignObject in an inline svg": 1,
        "text in an unembedded font": 1,
      });
    });

    test("an svg the page could not read is reported, and one with no entry is left to the overlays", () => {
      const bundle = withSvg();
      bundle.docs[0].svgs = [["0:2", { failed: "gone" }]];
      assert.equal(drawBundle(bundle).drawn.stats.unsupported["an inline svg that could not be read"], 1);
      bundle.docs[0].svgs = [];
      const none = drawBundle(bundle).drawn;
      assert.equal(none.stats.svgs, 0);
      assert.deepEqual(none.stats.unsupported, {});
    });

    test("is drawn the same from the bundle file, and from the bundle trimmed to its view", () => {
      const bundle = withSvg();
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-test-"));
      try {
        writeBundle(root, "Images/s.png", bundle, Buffer.from("png"), []);
        const back = readBundle(root, "Images/s.png");
        assert.deepEqual(back.docs[0].svgs, bundle.docs[0].svgs);
        assert.equal(drawBundle(back).drawn.svg, drawBundle(bundle).drawn.svg);
        const trimmed = trimSnapshot(bundle.snapshot, bundle.view, bundle.styles);
        assert.equal(drawBundle({ ...bundle, snapshot: trimmed }).drawn.svg, drawBundle(bundle).drawn.svg);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  });

  test("trimmed to its view, draws the same picture, and drops what is far from it", () => {
    const bundle = bundleOf(measured);
    const trimmed = trimSnapshot(bundle.snapshot, bundle.view, bundle.styles);
    assert.equal(drawBundle({ ...bundle, snapshot: trimmed }).drawn.svg, drawBundle(bundle).drawn.svg);
    // A view of the page's corner, away from the <select>: the select's layout object goes,
    // and its own background's string with it; the root's and the body's stay, each with
    // the index it had, by which what was measured of it is found.
    const corner = trimSnapshot(bundle.snapshot, { x: 300, y: 60, w: 10, h: 10 }, bundle.styles);
    const layout = corner.documents[0].layout;
    assert.deepEqual(layout.nodeIndex, [1, 2]);
    assert.deepEqual(layout.originalIndex, [0, 1]);
    assert.ok(!corner.strings.includes("rgb(240, 240, 240)"));
    assert.ok(bundle.snapshot.strings.includes("rgb(240, 240, 240)"));
    // Every node stays, the option's text with it.
    assert.equal(corner.documents[0].nodes.parentIndex.length, 6);
    assert.ok(corner.strings.includes("Shown"));
  });
});

describe("selectLabel", () => {
  const text = (value) => ({ type: 3, value, children: [] });
  const el = (name, children, attrs = {}) => ({ type: 1, name, attrs, children });
  const select = (option) => el("SELECT", [el("OPTION", [text("other")]), { ...option, selected: true }]);

  test("is the selected option's whole text, an element's included, with its no-break spaces", () => {
    // The IDE's Properties panel: "<b>" + Name + "</b> &nbsp;&nbsp;&nbsp;" + _className.
    const option = el("OPTION", [el("B", [text("Text1")]), text(" \u{A0}\u{A0}\u{A0}TextBox")]);
    assert.equal(selectLabel(select(option)), "Text1 \u{A0}\u{A0}\u{A0}TextBox");
  });

  test("collapses and trims HTML whitespace only, and prefers a label attribute", () => {
    assert.equal(selectLabel(select(el("OPTION", [text("\n  a \t b  ")]))), "a b");
    assert.equal(selectLabel(select(el("OPTION", [text("text")], { label: " shown " }))), "shown");
    assert.equal(selectLabel(select(el("OPTION", [text("text")], { label: "  " }))), "text");
    assert.equal(selectLabel(el("SELECT", [el("OPTION", [text("x")])])), "");
  });
});

describe("transforms", () => {
  // What Chromium's DOMSnapshot gives for a 12 by 18 inline-block at 100, 50 with transform:
  // rotate(90deg): its box and its text's box after the turn, its own size before it.
  const quarter = [0, 1, -1, 0, 0, 0];
  const t = elementTransform({ x: 97, y: 53, w: 18, h: 12 }, { w: 12, h: 18 }, quarter, [6, 9]);

  test("an element's box before its transform, and the matrix taking it to after", () => {
    assert.deepEqual(t.box, { x: 100, y: 50, w: 12, h: 18 });
    // Its top-left corner turns to the top-right of the box after.
    const [a, b, c, d, tx, ty] = t.m;
    assert.deepEqual([a * 100 + c * 50 + tx, b * 100 + d * 50 + ty], [115, 53]);
    assert.equal(t.svg, "matrix(0 1 -1 0 165 -47)");
    // With no transform-origin given, the centre: the same here.
    assert.deepEqual(elementTransform({ x: 97, y: 53, w: 18, h: 12 }, { w: 12, h: 18 }, quarter, null).box, t.box);
  });

  test("a text box after the transform is put back where an unturned twin has it", () => {
    const back = untransformBox({ x: 98, y: 53, w: 17, h: 21.34375, start: 0, length: 2 }, t.m);
    assert.deepEqual(Object.fromEntries(Object.entries(back).map(([k, v]) => [k, Math.round(v * 1000) / 1000])), {
      x: 100,
      y: 50,
      w: 21.344,
      h: 17,
      start: 0,
      length: 2,
    });
  });

  test("a box turned 45 degrees keeps its size, as no single size gives the one after", () => {
    const s = Math.SQRT1_2;
    const back = untransformBox({ x: 0, y: 0, w: 10, h: 10 }, [s, s, -s, s, 0, 0]);
    assert.equal(back.w, 10);
    assert.equal(back.h, 10);
  });
});

describe("oneLine", () => {
  test("puts a break in a tag as a space and one in text as a character reference", () => {
    assert.equal(
      oneLine('<svg>\n<image href="data:image/svg+xml,<svg\nwidth=1>"/>\r\n<text>a\nb</text></svg>\n'),
      '<svg>&#10;<image href="data:image/svg+xml,<svg width=1>"/>&#10;<text>a&#10;b</text></svg>\n',
    );
  });
});

describe("underlineBand", () => {
  const band = (size, more = {}) => {
    const { offset, thickness } = underlineBand({ "font-size": `${size}px`, ...more });
    return [offset, thickness];
  };

  test("an auto thickness is a tenth of the font size cut down, at least 1", () => {
    assert.deepEqual(
      [8, 19, 20, 29, 30, 40, 64].map((s) => band(s)[1]),
      [1, 1, 2, 2, 3, 4, 6],
    );
  });

  test("an auto offset is half the unrounded thickness rounded up, at least 1", () => {
    assert.deepEqual(
      [13, 20, 21, 40, 44].map((s) => band(s)[0]),
      [1, 1, 2, 2, 3],
    );
  });

  test("a given thickness is rounded, and a percentage is of the font size", () => {
    assert.equal(band(13, { "text-decoration-thickness": "1.5px" })[1], 2);
    assert.equal(band(13, { "text-decoration-thickness": "2.5px" })[1], 3);
    assert.equal(band(13, { "text-decoration-thickness": "20%" })[1], 3);
  });

  test("a given offset is rounded and adds no gap: the IDE's tip, 13px with 2px", () => {
    assert.deepEqual(band(13, { "text-underline-offset": "2px" }), [2, 1]);
    assert.equal(band(13, { "text-underline-offset": "0px" })[0], 0);
  });
});

describe("decoratingBoxes", () => {
  const chain = (...styles) => {
    let node = null;
    for (const style of styles) node = { style, parent: node };
    return node;
  };
  const u = { "text-decoration-line": "underline" };

  test("collects every decorating ancestor, nearest first, through blocks", () => {
    const outer = { ...u, display: "block", color: "red" };
    const inner = { ...u, display: "inline", color: "blue" };
    assert.deepEqual(decoratingBoxes(chain(outer, { display: "block" }, inner)), [inner, outer]);
  });

  test("stops at an atomic inline box, a float or a positioned box, whose own line counts", () => {
    for (const stop of [{ display: "inline-block" }, { float: "left" }, { position: "absolute" }]) {
      const own = { ...u, display: "inline", ...stop };
      assert.deepEqual(decoratingBoxes(chain({ ...u, display: "block" }, own)), [own]);
    }
  });
});

describe("frames", () => {
  // A snapshot of a page and a frame in it: the page's <iframe> is at 100, 50 and 300 by 200;
  // the frame's document is 300 by 500, scrolled 30px down, its boxes in its own coordinates.
  function snapshotOfFrame({ document: withDocument = true, scroll = [0, 30] } = {}) {
    const strings = [];
    const s = (v) => {
      const i = strings.indexOf(v);
      return i >= 0 ? i : strings.push(v) - 1;
    };
    const build = ({ url, frameId, nodes, layout, scroll, content, frames = [] }) => ({
      documentURL: s(url),
      baseURL: s(url),
      frameId: s(frameId),
      contentWidth: content[0],
      contentHeight: content[1],
      scrollOffsetX: scroll[0],
      scrollOffsetY: scroll[1],
      nodes: {
        parentIndex: nodes.map(([, parent]) => parent),
        nodeType: nodes.map(([name]) => (name === "#document" ? 9 : 1)),
        nodeName: nodes.map(([name]) => s(name)),
        nodeValue: nodes.map(() => -1),
        backendNodeId: nodes.map((_, i) => 100 + i),
        attributes: nodes.map(() => []),
        contentDocumentIndex: { index: frames.map(([n]) => n), value: frames.map(([, d]) => d) },
      },
      layout: {
        nodeIndex: layout.map(({ node }) => node),
        styles: layout.map(({ background = "rgba(0, 0, 0, 0)" }) => [s("visible"), s(background)]),
        bounds: layout.map(({ bounds }) => bounds),
        text: layout.map(() => -1),
        paintOrders: layout.map((_, i) => i),
        offsetRects: layout.map(() => []),
        clientRects: layout.map(({ client = [] }) => client),
        scrollRects: layout.map(({ scrolls = [] }) => scrolls),
      },
      textBoxes: { layoutIndex: [], bounds: [], start: [], length: [] },
    });
    const page = build({
      url: "http://localhost:1/main.htm",
      frameId: "PAGE",
      nodes: [
        ["#document", -1],
        ["HTML", 0],
        ["BODY", 1],
        ["IFRAME", 2],
      ],
      layout: [
        { node: 1, bounds: [0, 0, 800, 600] },
        { node: 2, bounds: [0, 0, 800, 600], background: "rgb(1, 2, 3)" },
        { node: 3, bounds: [100, 50, 300, 200] },
      ],
      scroll: [0, 0],
      content: [800, 600],
      frames: withDocument ? [[3, 1]] : [],
    });
    const frame = build({
      url: "http://localhost:2/page.htm",
      frameId: "FRAME",
      nodes: [
        ["#document", -1],
        ["HTML", 0],
        ["BODY", 1],
      ],
      layout: [
        { node: 1, bounds: [0, 0, 300, 500], client: [0, 0, 273, 188], scrolls: [0, 30, 300, 500] },
        { node: 2, bounds: [0, 0, 300, 500], background: "rgb(9, 8, 7)" },
      ],
      scroll,
      content: [300, 500],
    });
    return { strings, documents: withDocument ? [page, frame] : [page] };
  }
  const NAMES = ["visibility", "background-color"];
  // An <iframe>'s layout object, with a 2px border and 4px padding.
  const iframe = (bounds, extra = {}) => ({
    bounds,
    style: {
      ...Object.fromEntries(
        ["top", "right", "bottom", "left"].flatMap((s) => [
          [`border-${s}-width`, "2px"],
          [`border-${s}-style`, "solid"],
          [`padding-${s}`, "4px"],
        ]),
      ),
      ...extra,
    },
  });

  test("the document of an iframe hangs off its node, in its own coordinates, with its scroll and size", () => {
    const page = decodeSnapshot(snapshotOfFrame(), NAMES);
    const owner = page.nodes.find((n) => n.name === "IFRAME");
    const doc = owner.frame;
    assert.equal(doc.frameId, "FRAME");
    assert.equal(doc.url, "http://localhost:2/page.htm");
    assert.equal(doc.owner, owner);
    assert.deepEqual(doc.scroll, { x: 0, y: 30 });
    assert.deepEqual(doc.content, { w: 300, h: 500 });
    assert.deepEqual(doc.layouts[0].bounds, { x: 0, y: 0, w: 300, h: 500 });
    // A layout object is keyed by its document too: two documents both have a layout object 0.
    assert.notEqual(doc.layouts[0].key, page.layouts[0].key);
    assert.equal(page.nodes.find((n) => n.name === "BODY").frame, null);
  });

  test("an iframe whose document the snapshot lacks (another process) has none", () => {
    const page = decodeSnapshot(snapshotOfFrame({ document: false }), NAMES);
    assert.equal(page.nodes.find((n) => n.name === "IFRAME").frame, null);
    assert.deepEqual(framesIn(page, { x: 0, y: 0, w: 800, h: 600 }), []);
  });

  test("framesIn lists the frames that show in the view", () => {
    const page = decodeSnapshot(snapshotOfFrame(), NAMES);
    assert.equal(framesIn(page, { x: 0, y: 0, w: 800, h: 600 }).length, 1);
    assert.equal(framesIn(page, { x: 0, y: 0, w: 90, h: 600 }).length, 0);
  });

  test("a frame's viewport is the iframe's border box less border and padding", () => {
    const { box, scale } = frameGeometry(iframe({ x: 100, y: 50, w: 300, h: 200 }), { w: 288, h: 188 });
    assert.deepEqual(box, { x: 106, y: 56, w: 288, h: 188 });
    assert.equal(scale, 1);
  });

  test("a frame is scaled by its viewport's width over its own innerWidth, once they differ by a pixel", () => {
    const l = iframe({ x: 100, y: 50, w: 300, h: 200 });
    assert.equal(frameGeometry(l, { w: 288.6, h: 188 }).scale, 1);
    assert.equal(frameGeometry(l, { w: 576, h: 376 }).scale, 0.5);
    assert.equal(frameGeometry(l, null).scale, 1);
  });

  test("what shows of a frame is the part of the view in its viewport, as the frame's own points, scrolled", () => {
    const geometry = { box: { x: 106, y: 56, w: 288, h: 188 }, scale: 1 };
    const doc = { scroll: { x: 5, y: 30 } };
    // The whole view: the viewport, from the frame's scroll offset.
    assert.deepEqual(frameView({ x: 0, y: 0, w: 800, h: 600 }, geometry, doc), { x: 5, y: 30, w: 288, h: 188 });
    // A view that starts inside it.
    assert.deepEqual(frameView({ x: 116, y: 66, w: 100, h: 50 }, geometry, doc), { x: 15, y: 40, w: 100, h: 50 });
    assert.equal(frameView({ x: 0, y: 0, w: 100, h: 600 }, geometry, doc), null);
    // A frame at half scale shows twice what its viewport holds.
    const half = { box: geometry.box, scale: 0.5 };
    assert.deepEqual(frameView({ x: 106, y: 56, w: 288, h: 188 }, half, { scroll: { x: 0, y: 0 } }), {
      x: 0,
      y: 0,
      w: 576,
      h: 376,
    });
  });

  test("unzoom puts a zoomed frame's boxes into its own px, once, and leaves its client sizes", () => {
    const doc = {
      layouts: [
        {
          bounds: { x: 0, y: 3, w: 165, h: 109.5 },
          exact: { x: 0, y: 3, w: 165, h: 109.5 },
          boxes: [{ x: 6, y: 9, w: 30, h: 15, start: 0, length: 4 }],
          client: { w: 220, h: 140 },
        },
      ],
    };
    unzoom(doc, 0.75);
    unzoom(doc, 0.75);
    assert.deepEqual(doc.layouts[0].bounds, { x: 0, y: 4, w: 220, h: 146 });
    assert.deepEqual(doc.layouts[0].boxes[0], { x: 8, y: 12, w: 40, h: 20, start: 0, length: 4 });
    assert.deepEqual(doc.layouts[0].client, { w: 220, h: 140 });
  });

  test("the viewport's scrollbars are what the root's client box leaves out of the frame's viewport", () => {
    const page = decodeSnapshot(snapshotOfFrame(), NAMES);
    const doc = page.nodes.find((n) => n.name === "IFRAME").frame;
    const inner = { w: 288, h: 188 };
    const geometry = frameGeometry(iframe({ x: 100, y: 50, w: 300, h: 200 }), inner);
    assert.deepEqual(viewportGutters(doc, inner), { v: 15, h: 0 });
    const bars = viewportScroller(doc, geometry, inner);
    assert.equal(bars.key, "1:viewport");
    assert.deepEqual(bars.viewport, { v: 15, h: 0 });
    assert.deepEqual(bars.client, { w: 273, h: 188 });
    assert.deepEqual(bars.scroll, { x: 0, y: 30, w: 300, h: 500 });
    assert.deepEqual(bars.bounds, geometry.box);
    // A viewport the document fits in has none, and nor does a zoomed frame (not drawn).
    assert.equal(viewportGutters(doc, { w: 273, h: 188 }), null);
    assert.equal(viewportScroller(doc, { ...geometry, scale: 0.75 }, inner), null);
    // The <body> is the first element whose scrollbar rules style the viewport, then the root element.
    assert.deepEqual(
      viewportStyleSources(doc).map((n) => n.name),
      ["BODY", "HTML"],
    );
  });

  test("a document fills its viewport with the root's background, else the body's, else nothing", () => {
    const page = decodeSnapshot(snapshotOfFrame(), NAMES);
    const doc = page.nodes.find((n) => n.name === "IFRAME").frame;
    assert.equal(canvasColor(doc), "rgb(9, 8, 7)");
    assert.equal(canvasColor(page), "rgb(1, 2, 3)");
    page.nodes.find((n) => n.name === "HTML").style["background-color"] = "rgb(4, 4, 4)";
    assert.equal(canvasColor(page), "rgb(4, 4, 4)");
    for (const n of doc.nodes) if (n.style) n.style["background-color"] = "rgba(0, 0, 0, 0)";
    assert.equal(canvasColor(doc), null);
  });
});

describe("webFontFiles", () => {
  // A document of its own, with the @font-face rules of one style sheet.
  function inDocument(faces, run) {
    class FontFace {}
    const rule = ({ family, src, weight, style, range }) =>
      Object.assign(new FontFace(), {
        style: {
          getPropertyValue: (name) =>
            ({
              "font-family": family,
              src: `url("${src}") format("woff2")`,
              "font-weight": weight ?? "",
              "font-style": style ?? "",
              "unicode-range": range ?? "",
            })[name],
        },
      });
    const before = [globalThis.document, globalThis.CSSFontFaceRule];
    globalThis.CSSFontFaceRule = FontFace;
    globalThis.document = {
      baseURI: "http://localhost/page",
      styleSheets: [{ href: "http://localhost/assets/css/site.css", cssRules: faces.map(rule) }],
    };
    try {
      return run();
    } finally {
      [globalThis.document, globalThis.CSSFontFaceRule] = before;
    }
  }
  const key = (style, weight, family) => JSON.stringify([style, String(weight), "13px", family]);
  const SITE = [
    { family: '"Inter"', src: "../fonts/inter.woff2", weight: "100 900" },
    { family: '"Inter"', src: "../fonts/inter-italic.woff2", weight: "100 900", style: "italic" },
  ];
  const pick = (faces, ...keys) => inDocument(faces, () => webFontFiles(keys));

  const names = (got, k) => got[k]?.map((f) => f.url.split("/").pop());

  test("a font is found by the name the page gives it, from the first family of its list that has a rule", () => {
    const k = key("normal", 600, 'system-ui, Inter, "Segoe UI"');
    assert.deepEqual(pick(SITE, k)[k], [
      { url: "http://localhost/assets/fonts/inter.woff2", italic: false, range: "", lo: 100, hi: 900 },
    ]);
    const none = key("normal", 400, "Arial, sans-serif");
    assert.equal(pick(SITE, none)[none], null);
  });

  test("an italic run takes the italic rule, and an upright one the upright, whichever is written last", () => {
    const [up, it] = [key("normal", 400, "Inter"), key("italic", 400, "Inter")];
    const got = pick(SITE, up, it);
    assert.deepEqual(names(got, up), ["inter.woff2"]);
    assert.deepEqual(names(got, it), ["inter-italic.woff2"]);
  });

  test("of rules for single weights, the one that holds the weight, else the nearest from the side CSS prefers", () => {
    const faces = [
      { family: "Foo", src: "regular.woff2", weight: "400" },
      { family: "Foo", src: "bold.woff2", weight: "bold" },
    ];
    const at = (w) => names(pick(faces, key("normal", w, "Foo")), key("normal", w, "Foo"))[0];
    assert.deepEqual([300, 400, 500, 600, 700, 900].map(at), [
      "regular.woff2",
      "regular.woff2",
      "regular.woff2",
      "bold.woff2",
      "bold.woff2",
      "bold.woff2",
    ]);
  });

  test("every rule that matches alike is listed, in the page's order, with its range and weights", () => {
    // A family split into files by unicode-range: one rule each, for each weight.
    const split = ["400", "600"].flatMap((weight) => [
      { family: "Seg", src: `latin.woff2`, weight, range: "U+0-FF, U+131" },
      { family: "Seg", src: `ext.woff2`, weight, range: "U+100-24F" },
      { family: "Seg", src: `greek.woff2`, weight, range: "U+370-3FF" },
    ]);
    const k = key("normal", 600, "Seg, sans-serif");
    const got = pick(split, k)[k];
    assert.deepEqual(
      got.map((f) => [f.url.split("/").pop(), f.range, f.lo, f.hi]),
      [
        ["latin.woff2", "U+0-FF, U+131", 600, 600],
        ["ext.woff2", "U+100-24F", 600, 600],
        ["greek.woff2", "U+370-3FF", 600, 600],
      ],
    );
    // A weight between two declared ones takes the nearest, with all its files.
    const k500 = key("normal", 500, "Seg");
    assert.equal(pick(split, k500)[k500].length, 3);
    assert.equal(pick(split, k500)[k500][0].lo, 400);
  });

  test("rules that match alike with no range are all listed too: which one draws is webRulesFor's", () => {
    const faces = [
      { family: "Foo", src: "one.woff2", weight: "400" },
      { family: "Foo", src: "two.woff2", weight: "400" },
    ];
    const k = key("normal", 400, "Foo");
    assert.deepEqual(names(pick(faces, k), k), ["one.woff2", "two.woff2"]);
  });
});

describe("unicode-range", () => {
  test("a descriptor is a list of ranges, single code points and wildcards", () => {
    assert.deepEqual(parseUnicodeRange("U+0-FF, U+131, u+4??, U+1F600-1F64F"), [
      [0, 0xff],
      [0x131, 0x131],
      [0x400, 0x4ff],
      [0x1f600, 0x1f64f],
    ]);
  });

  test("an empty descriptor, and one with a token that is no range, is every code point", () => {
    const all = [[0, 0x10ffff]];
    assert.deepEqual(parseUnicodeRange(""), all);
    assert.deepEqual(parseUnicodeRange(undefined), all);
    assert.deepEqual(parseUnicodeRange("U+0-FF, nonsense"), all);
    assert.deepEqual(parseUnicodeRange("U+4??-4FF"), all);
  });

  // The files of one family, as Microsoft's page splits Segoe UI Variable.
  const files = [
    { name: "latin", range: "U+0-FF, U+131, U+2000-206F" },
    { name: "ext", range: "U+100-24F, U+300-36F" },
    { name: "greek", range: "U+370-3FF" },
    { name: "symbols", range: "U+530-5FF, U+2070-209F" },
  ];
  const chosen = (text, rules = files) => webRulesFor(rules, text).map((r) => r.name);

  test("a run is drawn with the files whose range holds one of its characters", () => {
    assert.deepEqual(chosen("Hello, world"), ["latin"]);
    assert.deepEqual(chosen("Hello Ω"), ["greek", "latin"]);
    // A superscript is in the symbols file, though none of the run's letters are.
    assert.deepEqual(chosen("x²⁴"), ["symbols", "latin"]);
  });

  test("a character no rule holds is drawn in another family, and no file", () => {
    assert.deepEqual(chosen("一"), []);
    assert.deepEqual(chosen(""), []);
  });

  test("where ranges overlap the later rule has the character, and comes first", () => {
    const overlap = [
      { name: "all", range: "" },
      { name: "latin", range: "U+0-7F" },
    ];
    assert.deepEqual(chosen("ab", overlap), ["latin"]);
    assert.deepEqual(chosen("a一", overlap), ["latin", "all"]);
  });
});

describe("inline svgs", () => {
  // A layout object for an element: `name`, in a chain of parents.
  const layout = (name, parent, extra = {}) => {
    const node = { name, parent };
    const l = {
      node,
      key: `0:${name}`,
      style: { visibility: "visible" },
      bounds: { x: 10, y: 10, w: 8, h: 9 },
      ...extra,
    };
    node.box = l;
    return l;
  };
  const view = { x: 0, y: 0, w: 100, h: 100 };

  test("the outermost svg of each, visible, with a size, in the view", () => {
    const body = layout("BODY", null);
    const icon = layout("svg", body.node);
    const path = layout("path", icon.node);
    const nested = layout("svg", icon.node);
    const hidden = layout("svg", body.node, { style: { visibility: "hidden" } });
    const empty = layout("svg", body.node, { bounds: { x: 10, y: 10, w: 0, h: 9 } });
    const away = layout("svg", body.node, { bounds: { x: 500, y: 10, w: 8, h: 9 } });
    const found = inlineSvgsIn({ layouts: [body, icon, path, nested, hidden, empty, away] }, view);
    assert.deepEqual(found, [icon]);
  });

  test("an svg inside an HTML element deep in the page is found, and an svg's own box is the one", () => {
    const body = layout("BODY", null);
    const button = layout("BUTTON", body.node);
    const icon = layout("svg", button.node);
    // A second layout object of the same node (its text or a pseudo-element) is no box of its own.
    const other = { ...icon, key: "0:svg2", node: icon.node };
    assert.deepEqual(inlineSvgsIn({ layouts: [body, button, icon, other] }, view), [icon]);
  });

  test("ids and the references to them get a prefix, in tags only", () => {
    const markup =
      '<defs><linearGradient id="g"><stop style="stop-color:red"/></linearGradient><symbol id="s"><path d="M0 0"/></symbol></defs>' +
      '<use href="#s" style="fill:url(#g)"/><path style="clip-path:url(#c);stroke:url(#g)"/><text id="t">id="g" url(#g) href="#s"</text>' +
      '<image href="data:image/png;base64,AAAA#x"/><a data-id="n" href="https://x/#s"/>';
    assert.equal(
      scopeIds(markup, "v3-"),
      '<defs><linearGradient id="v3-g"><stop style="stop-color:red"/></linearGradient><symbol id="v3-s"><path d="M0 0"/></symbol></defs>' +
        '<use href="#v3-s" style="fill:url(#v3-g)"/><path style="clip-path:url(#v3-c);stroke:url(#v3-g)"/><text id="v3-t">id="g" url(#g) href="#s"</text>' +
        '<image href="data:image/png;base64,AAAA#x"/><a data-id="n" href="https://x/#s"/>',
    );
  });
});

describe("web fonts as WOFF2", () => {
  const read = (name) => fs.readFileSync(`${REPO_ROOT}/docs/assets/fonts/${name}`);
  const dataUrl = (name) => `data:font/woff2;base64,${read(name).toString("base64")}`;

  test("the tables a face is chosen by are read from the compressed font", () => {
    const upright = readable(read("inter-variable.woff2"));
    assert.equal(isVariable(upright), true);
    assert.equal(cmapCoverage(upright).has("A".codePointAt(0)), true);
    assert.equal(cmapCoverage(upright).has(0x4e00), false);
    assert.deepEqual(faceStyle(upright), { weight: 400, italic: false });
    assert.equal(faceStyle(readable(read("inter-variable-italic.woff2"))).italic, true);
    // Any other font is left as it is.
    const plain = Buffer.from("not woff2");
    assert.equal(readable(plain), plain);
  });

  test("a font's cut comes from the subset cache when it is there, and no Python runs", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "subsets-test-"));
    useSubsetCache(root);
    try {
      // No such Python: a cut that is not in the cache cannot be made.
      const fonts = new PictureFonts({ python: "no-such-python-anywhere" });
      fonts.css("Aa", [{ family: "inter", data: dataUrl("inter-variable.woff2"), weight: "400" }], "400", "normal");
      await assert.rejects(fonts.faceRules(), /subset_font\.py could not run/);
      // The same cut in the cache, under the key of everything that decides it.
      const [face] = fonts.faces;
      const job = { ...face.job, unicodes: [...face.used].sort((a, b) => a - b), hinting: fonts.hinting };
      fs.writeFileSync(path.join(root, `${subsetKey(job)}.json`), JSON.stringify({ woff2: "QUJD" }));
      assert.equal(await fonts.faceRules(), '@font-face{font-family:"f0";src:url(data:font/woff2;base64,QUJD)}');
      // Other characters are another cut.
      assert.notEqual(subsetKey({ ...job, unicodes: [66, 98] }), subsetKey(job));
    } finally {
      useSubsetCache(null);
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("a variable font is one face for each weight a picture draws it at, and a run at that weight needs no bold", () => {
    const fonts = new PictureFonts();
    const inter = { family: "inter", data: dataUrl("inter-variable.woff2") };
    const css400 = fonts.css("Aa", [{ ...inter, weight: "400" }], "400", "normal");
    const css700 = fonts.css("Aa", [{ ...inter, weight: "700" }], "700", "normal");
    const again = fonts.css("Bb", [{ ...inter, weight: "700" }], "700", "normal");
    assert.deepEqual(
      fonts.faces.map((f) => [f.name, f.weight, f.job.weight]),
      [
        ["f0", 400, 400],
        ["f1", 700, 700],
      ],
    );
    assert.equal(css400, 'font-family:"f0";font-weight:normal;font-style:normal');
    assert.equal(css700, 'font-family:"f1";font-weight:normal;font-style:normal');
    assert.equal(again, css700);
    // The characters go to the face that has them: both are Latin, and Inter has them.
    assert.equal(fonts.faces[1].used.has("B".codePointAt(0)), true);
  });

  test("a web font split by unicode-range: each file is the face of the characters in its rule's range, whichever has glyphs for more", () => {
    const fonts = new PictureFonts();
    // Inter and Cascadia Mono both have the whole of Basic Latin; the rules share it out.
    const inter = { family: "inter", data: dataUrl("inter-variable.woff2"), weight: "400", range: "U+21-5A" };
    const cascadia = {
      family: "cascadia",
      data: dataUrl("cascadia-mono-variable.woff2"),
      weight: "400",
      range: "U+20, U+61-7A",
    };
    const css = fonts.css("Ab c, D", [inter, cascadia], "400", "normal");
    const [first, second] = fonts.faces;
    const used = (face) =>
      [...face.used]
        .map((cp) => String.fromCodePoint(cp))
        .sort()
        .join("");
    assert.equal(used(first), " ,AD");
    assert.equal(used(second), " bc");
    // A space is drawn by the first face of the list that has one, and every face keeps one: the
    // face whose range holds it is listed first, whatever order the rules came in.
    assert.equal(css, 'font-family:"f1","f0";font-weight:normal;font-style:normal');
    // The same files in the other order share the characters out the same way.
    const again = new PictureFonts();
    again.css("Ab c, D", [cascadia, inter], "400", "normal");
    assert.deepEqual(again.faces.map(used), [" bc", " ,AD"]);
  });

  test("a source with no range is the face of every character its font has, the first font first", () => {
    const fonts = new PictureFonts();
    const inter = { family: "inter", data: dataUrl("inter-variable.woff2"), weight: "400" };
    const cascadia = { family: "cascadia", data: dataUrl("cascadia-mono-variable.woff2"), weight: "400" };
    const css = fonts.css("Ab", [cascadia, inter], "400", "normal");
    assert.equal(css, 'font-family:"f0","f1";font-weight:normal;font-style:normal');
    assert.equal(fonts.faces[1].used.has("A".codePointAt(0)), false);
    assert.equal(fonts.faces[0].used.has("A".codePointAt(0)), true);
  });

  test("an italic file is not slanted again", () => {
    const fonts = new PictureFonts();
    const css = fonts.css(
      "a",
      [{ family: "inter-italic", data: dataUrl("inter-variable-italic.woff2"), weight: "400" }],
      "400",
      "italic",
    );
    assert.equal(css, 'font-family:"f0";font-weight:normal;font-style:normal');
  });
});

// redraw.mjs's parts that need no browser: what sheet.mjs lists, where it may write, and the page.
describe("the sheet", () => {
  const PNG = (w, h) => {
    const b = Buffer.alloc(33);
    b.writeUInt32BE(0x89504e47, 0);
    b.write("IHDR", 12, "latin1");
    b.writeUInt32BE(w, 16);
    b.writeUInt32BE(h, 20);
    return b;
  };

  test("names a picture's files by its path and theme", () => {
    assert.equal(slugOf("IDE/Menu/Images/Menu_File.light.png"), "IDE__Menu__Images__Menu_File.light");
    assert.equal(themeOf("a/X.light.png"), "light");
    assert.equal(themeOf("a/X.png"), "dark");
    assert.deepEqual(judgedFiles("a/X.png"), {
      png: "a__X.png",
      svg: "a__X.svg",
      render: "a__X.svg-render.png",
      diff: "a__X.svg-diff.png",
    });
    assert.deepEqual(pngSize(PNG(800, 600)), [800, 600]);
    assert.equal(pngSize(Buffer.from("not a png at all, but long enough")), null);
    assert.deepEqual(shareOf(["a", "b", "c", "d", "e"], { k: 1, of: 2 }), ["b", "d"]);
  });

  test("lists every PNG with whether an SVG is beside it, the output trees left out", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sheet-list-"));
    try {
      for (const f of ["b/Y.png", "b/Y.svg", "a/X.light.png", "_site/Z.png", "_site-offline/Z.png", "c/d.txt"]) {
        fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
        fs.writeFileSync(path.join(root, f), "x");
      }
      assert.deepEqual(listPictures(root), [
        { out: "a/X.light.png", svg: false },
        { out: "b/Y.png", svg: true },
      ]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("is never written under docs or where git would take it", () => {
    const docs = path.join(REPO_ROOT, "docs");
    assert.match(outputRefusal(path.join(docs, "sheet"), [docs]), /is under/);
    assert.match(outputRefusal(docs, [docs]), /is under/);
    // A docs folder given elsewhere is refused the same way.
    const elsewhere = path.join(os.tmpdir(), "sheet-docs");
    assert.match(outputRefusal(path.join(elsewhere, "x"), [elsewhere]), /is under/);
    // Inside the repository: a folder git ignores is allowed, any other refused.
    assert.equal(outputRefusal(path.join(REPO_ROOT, ".svgshot-bundles", "sheet"), [docs]), null);
    assert.match(outputRefusal(path.join(REPO_ROOT, "scripts", "sheet"), [docs]), /does not ignore/);
    assert.match(outputRefusal(REPO_ROOT, [docs]), /root of the git working tree/);
    // Outside any working tree, as git answers it (here, a stand-in).
    const noRepo = () => ({ status: 128, stdout: "" });
    assert.equal(outputRefusal(path.join(os.tmpdir(), "sheet"), [docs], noRepo), null);
    const unsure = (args) =>
      args[0] === "rev-parse" ? { status: 0, stdout: os.tmpdir() } : { status: 128, stdout: "" };
    assert.match(outputRefusal(path.join(os.tmpdir(), "sheet"), [docs], unsure), /could not say/);
  });

  test("replaces only a folder that is new, empty or a sheet", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sheet-out-"));
    try {
      assert.equal(mayWriteSheet(path.join(root, "new")), true);
      assert.equal(mayWriteSheet(root), true);
      fs.writeFileSync(path.join(root, "index.html"), "<p>someone's page</p>");
      assert.equal(mayWriteSheet(root), false);
      fs.writeFileSync(path.join(root, "index.html"), sheetHtml({ rows: [], plain: [], bar: 0.25, all: false }));
      assert.equal(mayWriteSheet(root), true);
      assert.equal(mayWriteSheet(path.join(root, "index.html")), false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("puts the judged pictures worst first, those not drawn after them", () => {
    const rows = [
      { out: "b.png", pct96: 0.3 },
      { out: "c.png", error: "x" },
      { out: "a.png", pct96: 5 },
      { out: "d.png", pct96: 0.3 },
    ];
    assert.deepEqual(
      sortRows(rows).map((r) => r.out),
      ["a.png", "b.png", "d.png", "c.png"],
    );
    assert.deepEqual(notDrawn({ resizer: 1, "a frame of another process": 2 }), [
      ["a frame of another process", 2],
      ["resizer", 1],
    ]);
  });

  test("writes a page that links each picture's files and escapes what it shows", () => {
    const files = (out) => ({ ...judgedFiles(out) });
    const html = sheetHtml({
      rows: [
        {
          out: "IDE/A&B.png",
          theme: "dark",
          size: [800, 600],
          pct96: 0.4,
          pct32: 1,
          pct8: 2,
          faithful: false,
          source: "bundle",
          notes: [],
          notDrawn: [["filter <x>", 2]],
          files: files("IDE/A&B.png"),
        },
        {
          out: "IDE/Z.light.png",
          theme: "light",
          size: [10, 10],
          pct96: 9,
          pct32: 9,
          pct8: 9,
          source: "file",
          files: files("IDE/Z.light.png"),
        },
        {
          out: "IDE/Gone.png",
          theme: "dark",
          size: null,
          error: "the bundle is of format 1",
          files: { png: "IDE__Gone.png" },
        },
      ],
      plain: [{ out: "Other/P.png", size: [5, 6], files: { png: "Other__P.png" } }],
      bar: 0.25,
      all: false,
    });
    assert.ok(html.includes(`<meta name="generator" content="${SHEET_GENERATOR}">`));
    assert.ok(html.includes("<title>Pictures with no SVG</title>"));
    // Worst first, and the one not drawn after the drawn ones.
    const order = ["IDE/Z.light.png", "IDE/A&amp;B.png", "IDE/Gone.png"].map((t) => html.indexOf(`<h3>${t}</h3>`));
    assert.ok(
      order.every((i, k) => i > 0 && (k === 0 || i > order[k - 1])),
      String(order),
    );
    assert.ok(html.includes('href="pictures/IDE__A%26B.svg-diff.png"'));
    assert.ok(html.includes('src="pictures/IDE__A%26B.svg-render.png"'));
    assert.ok(html.includes("the converter did not draw: filter &lt;x&gt; x2"));
    assert.ok(html.includes("<b>not drawn: the bundle is of format 1</b>"));
    assert.ok(html.includes("the SVG file beside the PNG"));
    assert.ok(html.includes("Other/P.png, 5 x 6 px"));
    assert.ok(!html.includes("IDE__Gone.svg"));
    assert.ok(sheetHtml({ rows: [], plain: [], bar: 0.25, all: true }).includes("Every picture against its SVG"));
  });
});

// The sheet of changes against a git revision (sheet.mjs --against): the change list from git's
// output, the comparison of two pictures over two sizes, the noise rule, the order and the page.
describe("the change sheet", () => {
  // An image of one colour, `w` by `h`, and a PNG file of it; `paint` changes pixels.
  const image = (w, h, grey = 100, paint = () => {}) => {
    const rgba = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        rgba.set([grey, grey, grey, 255], i);
        paint(rgba, x, y, i);
      }
    return { width: w, height: h, rgba };
  };
  const setGrey = (x0, y0, x1, y1, grey) => (rgba, x, y, i) => {
    if (x >= x0 && x < x1 && y >= y0 && y < y1) rgba.set([grey, grey, grey, 255], i);
  };

  test("reads the change list from git's output, the PNGs only", () => {
    const text = [
      "M",
      "IDE/A.png",
      "A",
      "IDE/B.light.png",
      "D",
      "IDE/C.png",
      "M",
      "IDE/page.md",
      "T",
      "x/D.PNG",
      "",
    ].join("\0");
    assert.deepEqual(parseNameStatus(text), [
      { out: "IDE/A.png", status: "modified" },
      { out: "IDE/B.light.png", status: "added" },
      { out: "IDE/C.png", status: "deleted" },
      { out: "x/D.PNG", status: "modified" },
    ]);
    assert.deepEqual(parseNameStatus(""), []);
    // The build's output trees are not pictures of the docs, and a path listed twice is one.
    assert.deepEqual(parseNameStatus(["A", "_site/Z.png", "A", "a.png", "M", "a.png", ""].join("\0")), [
      { out: "a.png", status: "added" },
    ]);
    assert.deepEqual(parseUntracked("n/New.png\0n/note.txt\0"), [{ out: "n/New.png", status: "added" }]);
  });

  test("asks git, in the docs folder, for the revision's commit and what differs from it", () => {
    const calls = [];
    const git = (args, cwd) => {
      calls.push({ args, cwd });
      const a = args.join(" ");
      if (a === "rev-parse --show-prefix") return { status: 0, stdout: "docs/\n" };
      if (a === "rev-parse --verify --quiet main^{commit}") return { status: 0, stdout: `${"ab12".repeat(10)}\n` };
      if (a === "rev-parse --verify --quiet nope^{commit}") return { status: 1, stdout: "" };
      if (args[0] === "rev-parse" && args[1] === "--short=8") return { status: 0, stdout: "ab12ab12\n" };
      if (args[0] === "diff") return { status: 0, stdout: "M\0a.png\0D\0b.png\0" };
      if (args[0] === "ls-files") return { status: 0, stdout: "c.png\0" };
      return { status: 128, stdout: "" };
    };
    const found = changedPictures("/some/docs", "main", git);
    assert.equal(found.hash, "ab12".repeat(10));
    assert.equal(found.short, "ab12ab12");
    assert.equal(found.prefix, "docs/");
    assert.deepEqual(found.pictures, [
      { out: "a.png", status: "modified" },
      { out: "b.png", status: "deleted" },
      { out: "c.png", status: "added" },
    ]);
    assert.ok(calls.every((c) => c.cwd === "/some/docs"));
    // It compares the working tree with the commit, named by its hash, relative to the folder.
    const diff = calls.find((c) => c.args[0] === "diff").args;
    assert.deepEqual(diff.slice(0, 5), ["diff", "--name-status", "--no-renames", "--relative", "-z"]);
    assert.ok(diff.includes("ab12".repeat(10)));
    assert.throws(() => changedPictures("/some/docs", "nope", git), /no revision nope/);
    assert.throws(() => changedPictures("/some/docs", "--output=x", git), /not a revision/);
    assert.throws(() => changedPictures("/some/docs", "", git), /not a revision/);
    assert.throws(
      () => changedPictures("/x", "main", () => ({ status: 128, stdout: "" })),
      /not in a git working tree/,
    );
  });

  test("applies the noise rule the screenshotter applies", () => {
    const a = image(100, 100);
    assert.equal(withinNoise(a, image(100, 100)), true);
    // 50 pixels (0.5%) off by 16 levels: noise; 51 pixels, or 17 levels: not.
    const patch = (n, grey) =>
      image(100, 100, 100, (rgba, x, y, i) => (y * 100 + x < n ? rgba.set([grey, grey, grey, 255], i) : 0));
    assert.equal(withinNoise(a, patch(50, 116)), true);
    assert.equal(withinNoise(a, patch(51, 116)), false);
    assert.equal(withinNoise(a, patch(1, 117)), false);
    // Pictures of two sizes are never the same picture.
    assert.equal(withinNoise(a, image(100, 101)), false);
    // A rectangle left out is not looked at: row 0 holds all 80 changed pixels, a smaller one not.
    assert.equal(withinNoise(a, patch(80, 200), [{ x0: 0, y0: 0, x1: 100, y1: 1 }]), true);
    assert.equal(withinNoise(a, patch(80, 200), [{ x0: 0, y0: 0, x1: 79, y1: 1 }]), false);
  });

  test("compares two pictures of one size over their pixels", () => {
    const a = image(10, 10);
    const b = image(10, 10, 100, setGrey(0, 0, 2, 5, 220)); // 10 pixels, 120 levels
    const c = image(10, 10, 100, setGrey(0, 0, 1, 1, 105)); // 1 pixel, 5 levels
    const st = compareImages(a, b);
    assert.deepEqual([st.sameSize, st.total, st.differing, st.beyond, st.faint], [true, 100, 10, 10, 0]);
    assert.equal(st.pctBeyond, 10);
    assert.equal(st.noiseOnly, false);
    const faint = compareImages(a, c);
    assert.deepEqual([faint.differing, faint.beyond, faint.faint, faint.pctBeyond], [1, 0, 1, 0]);
    assert.equal(faint.noiseOnly, true);
    assert.equal(compareImages(a, image(10, 10)).noiseOnly, true);
  });

  test("compares two pictures of two sizes aligned at the top left, and the map shows the larger", () => {
    const small = image(4, 2);
    const large = image(6, 5, 100, setGrey(0, 0, 1, 1, 250));
    const st = compareImages(small, large);
    assert.equal(st.sameSize, false);
    assert.deepEqual(
      [st.old, st.new, st.canvas, st.common],
      [
        [4, 2],
        [6, 5],
        [6, 5],
        [4, 2],
      ],
    );
    // The one pixel of the shared area that differs, and the 22 that only the larger has.
    assert.deepEqual([st.total, st.differing, st.beyond], [30, 23, 23]);
    assert.equal(st.noiseOnly, false);
    // The same the other way round: the shared area is the same, the others are only the old picture's.
    assert.equal(compareImages(large, small).differing, 23);
    const map = decodePng(changeMap(small, large));
    assert.deepEqual([map.width, map.height], [6, 5]);
    const at = (x, y) => [...map.rgba.subarray((y * 6 + x) * 4, (y * 6 + x) * 4 + 3)];
    assert.deepEqual(at(0, 0), [255, 0, 0]); // 150 levels: red
    assert.deepEqual(at(1, 0), at(2, 1)); // the same pixel: dark grey
    assert.ok(at(1, 0)[0] === at(1, 0)[1] && at(1, 0)[0] < 60);
    assert.deepEqual(at(5, 4), [220, 0, 220]); // only the new picture has it: magenta
    assert.deepEqual(
      [...decodePng(changeMap(large, small)).rgba.subarray((4 * 6 + 5) * 4, (4 * 6 + 5) * 4 + 3)],
      [0, 190, 220],
    );
    // One grey level is yellow.
    const one = decodePng(changeMap(image(2, 2), image(2, 2, 100, setGrey(0, 0, 1, 1, 101))));
    assert.deepEqual([...one.rgba.subarray(0, 3)], [255, 255, 0]);
  });

  test("makes a row for each kind of picture, the map only for one in both", () => {
    const png = (img) => encodePng(img);
    const same = compareRevisionPicture({ out: "a/X.png", status: "modified" }, png(image(8, 8)), png(image(8, 8)));
    assert.equal(same.row.kind, "noise");
    assert.equal(same.row.stats.differing, 0);
    assert.deepEqual(same.row.files, { old: "a__X.old.png", new: "a__X.new.png", map: "a__X.change.png" });
    assert.ok(Buffer.isBuffer(same.map));
    const moved = compareRevisionPicture(
      { out: "a/Y.light.png", status: "modified" },
      png(image(8, 8)),
      png(image(8, 8, 100, setGrey(0, 0, 8, 8, 200))),
    );
    assert.equal(moved.row.kind, "changed");
    assert.equal(moved.row.theme, "light");
    const added = compareRevisionPicture({ out: "n.png", status: "added" }, null, png(image(3, 3)));
    assert.deepEqual(
      [added.row.kind, added.map, added.row.sizeNew, added.row.files],
      ["added", null, [3, 3], { new: "n.new.png" }],
    );
    const gone = compareRevisionPicture({ out: "g.png", status: "deleted" }, png(image(3, 4)), null);
    assert.deepEqual([gone.row.kind, gone.row.sizeOld, gone.row.files], ["deleted", [3, 4], { old: "g.old.png" }]);
    const bad = compareRevisionPicture(
      { out: "b.png", status: "modified" },
      Buffer.from("not a png"),
      png(image(2, 2)),
    );
    assert.equal(bad.row.kind, "error");
    assert.match(bad.row.error, /not a PNG/);
    assert.equal(bad.map, null);
    assert.deepEqual(changeFiles("a/X.light.png"), {
      old: "a__X.light.old.png",
      new: "a__X.light.new.png",
      map: "a__X.light.change.png",
    });
  });

  test("puts the most changed first, then the noise, the added and the deleted", () => {
    const row = (out, kind, pctBeyond, pctDiffering = pctBeyond) => ({
      out,
      kind,
      stats: pctBeyond === undefined ? undefined : { pctBeyond, pctDiffering },
    });
    const rows = [
      row("d.png", "deleted"),
      row("n2.png", "noise", 0, 0.2),
      row("a.png", "added"),
      row("c1.png", "changed", 5),
      row("e.png", "error"),
      row("n1.png", "noise", 0, 0.4),
      row("c3.png", "changed", 40),
      row("c2.png", "changed", 5, 9),
      row("b.png", "added"),
    ];
    assert.deepEqual(
      sortChangeRows(rows).map((r) => r.out),
      ["c3.png", "c2.png", "c1.png", "e.png", "n1.png", "n2.png", "a.png", "b.png", "d.png"],
    );
  });

  test("quotes a path with a space in the command that restores pictures", () => {
    assert.equal(
      restoreCommand("HEAD", "docs/", ["IDE/A.png", "Two Words/B.light.png"]),
      'git checkout HEAD -- docs/IDE/A.png "docs/Two Words/B.light.png"',
    );
    assert.equal(restoreCommand("HEAD~1", "", ["a.png"]), "git checkout HEAD~1 -- a.png");
  });

  test("writes a page that names the revision, orders its sections and shows the restore command", () => {
    const rows = [
      { out: "IDE/Gone.png", kind: "deleted", theme: "dark", sizeOld: [5, 6], files: { old: "IDE__Gone.old.png" } },
      { out: "IDE/New&.png", kind: "added", theme: "dark", sizeNew: [7, 8], files: { new: "IDE__New&.new.png" } },
      {
        out: "IDE/Noisy one.png",
        kind: "noise",
        theme: "dark",
        sizeOld: [10, 10],
        sizeNew: [10, 10],
        stats: compareImages(image(10, 10), image(10, 10, 100, setGrey(0, 0, 1, 1, 104))),
        files: { old: "o.png", new: "n.png", map: "m.png" },
      },
      {
        out: "IDE/Big.png",
        kind: "changed",
        theme: "dark",
        sizeOld: [4, 2],
        sizeNew: [6, 5],
        stats: compareImages(image(4, 2), image(6, 5, 100, setGrey(0, 0, 1, 1, 250))),
        files: { old: "big.old.png", new: "big.new.png", map: "big.change.png" },
      },
    ];
    const html = changeSheetHtml({ rows, rev: "HEAD", hash: "abcdef0123456789", short: "abcdef01", prefix: "docs/" });
    assert.ok(html.includes(`<meta name="generator" content="${SHEET_GENERATOR}">`));
    assert.ok(html.includes("<title>Pictures changed since HEAD (abcdef01)</title>"));
    assert.ok(html.includes("abcdef0123456789"));
    const at = (t) => html.indexOf(t);
    const order = [
      '<h2 id="changed">',
      "<h3>IDE/Big.png</h3>",
      '<h2 id="noise">',
      "<h3>IDE/Noisy one.png</h3>",
      '<h2 id="added">',
      "<h3>IDE/New&amp;.png</h3>",
      '<h2 id="deleted">',
      "<h3>IDE/Gone.png</h3>",
    ].map(at);
    assert.ok(
      order.every((i, k) => i > 0 && (k === 0 || i > order[k - 1])),
      String(order),
    );
    assert.ok(html.includes("most likely rewritten in error"));
    assert.ok(html.includes("<pre>git checkout HEAD -- &quot;docs/IDE/Noisy one.png&quot;</pre>"));
    assert.ok(html.includes("<pre>node scripts/shoot_docs.mjs --cleanup</pre>"));
    assert.ok(html.includes("size changed from 4 x 2 px to 6 x 5 px"));
    assert.ok(html.includes("compared aligned at the top left over the common 4 x 2 px"));
    assert.ok(html.includes('href="pictures/big.change.png"'));
    assert.ok(html.includes('href="pictures/IDE__New%26.new.png"'));
    // One figure for an added or a deleted picture.
    assert.ok(!html.includes("IDE__Gone.new.png"));
    // With nothing within noise there is no command.
    const none = changeSheetHtml({
      rows: rows.filter((r) => r.kind !== "noise"),
      rev: "v1",
      hash: "h",
      short: "s",
      prefix: "",
    });
    assert.ok(!none.includes("git checkout"));
    assert.ok(!none.includes("--cleanup"));
    assert.ok(none.includes("<title>Pictures changed since v1 (s)</title>"));
  });

  test("names the cleanup command with the sheet's revision, --only and --docs", () => {
    assert.equal(cleanupCommand("HEAD"), "node scripts/shoot_docs.mjs --cleanup");
    assert.equal(
      cleanupCommand("HEAD~1", { only: "^IDE/(A|B)", docs: "D:/two words/docs" }),
      'node scripts/shoot_docs.mjs --cleanup --against HEAD~1 --only "^IDE/(A|B)" --out "D:/two words/docs"',
    );
  });
});

describe("the picture at a git revision", () => {
  const png = (tag) => Buffer.from(`png ${tag}`);
  // The noise rule as a table: a capture is near the pictures named beside it.
  const nearTo = (pairs) => (a, b) =>
    pairs.some(([x, y]) => (a.equals(x) && b.equals(y)) || (a.equals(y) && b.equals(x)));
  const HEAD = png("head");
  const DRIFT = png("drift"); // within noise of HEAD
  const CHANGE = png("change"); // an earlier run's real change
  const CHANGE2 = png("change2"); // within noise of CHANGE, not of HEAD
  const OTHER = png("other"); // near nothing
  const near = nearTo([
    [HEAD, DRIFT],
    [CHANGE, CHANGE2],
  ]);
  const fate = (capture, revision, disk) => pictureFate(capture, revision, disk, near);

  test("a capture within noise of the revision's picture leaves the file as the revision has it", () => {
    // the file drifted, or is gone: put back
    assert.deepEqual(fate(HEAD, HEAD, DRIFT), { state: "restored", write: HEAD });
    assert.deepEqual(fate(DRIFT, HEAD, DRIFT), { state: "restored", write: HEAD });
    assert.deepEqual(fate(DRIFT, HEAD, null), { state: "restored", write: HEAD });
    // an earlier run's real change goes too, when the IDE draws the revision's picture again
    assert.deepEqual(fate(HEAD, HEAD, CHANGE), { state: "restored", write: HEAD });
    // the file is the revision's already
    assert.deepEqual(fate(HEAD, HEAD, HEAD), { state: "unchanged", write: null });
    assert.deepEqual(fate(DRIFT, HEAD, HEAD), { state: "noise", write: null });
  });

  test("a capture beyond noise of the revision's picture is compared with the file", () => {
    assert.deepEqual(fate(CHANGE, HEAD, CHANGE), { state: "unchanged", write: null });
    assert.deepEqual(fate(CHANGE2, HEAD, CHANGE), { state: "noise", write: null });
    assert.deepEqual(fate(OTHER, HEAD, CHANGE), { state: "updated", write: OTHER });
    assert.deepEqual(fate(OTHER, HEAD, HEAD), { state: "updated", write: OTHER });
    assert.deepEqual(fate(OTHER, HEAD, null), { state: "new", write: OTHER });
  });

  test("with no picture at the revision, the file is the only reference", () => {
    assert.deepEqual(fate(DRIFT, null, DRIFT), { state: "unchanged", write: null });
    assert.deepEqual(fate(DRIFT, null, HEAD), { state: "noise", write: null });
    assert.deepEqual(fate(OTHER, null, HEAD), { state: "updated", write: OTHER });
    assert.deepEqual(fate(OTHER, null, null), { state: "new", write: OTHER });
  });

  test("a picture put back takes the revision's SVG, or loses its own when the revision has none", () => {
    const svg = Buffer.from("<svg/>\n");
    assert.equal(svgFate(svg, Buffer.from("<svg/>\r\n")), "keep");
    assert.equal(svgFate(svg, svg), "keep");
    assert.equal(svgFate(svg, Buffer.from("<svg>x</svg>\n")), "write");
    assert.equal(svgFate(svg, null), "write");
    assert.equal(svgFate(null, svg), "remove");
    assert.equal(svgFate(null, null), "keep");
  });

  test("cleanup resets a modified picture within noise, and leaves real changes, added and deleted ones", () => {
    const before = new Map([
      ["a.png", HEAD],
      ["b.png", HEAD],
      ["c.png", HEAD],
    ]);
    const after = new Map([
      ["a.png", DRIFT],
      ["b.png", OTHER],
      ["c.png", null],
    ]);
    const plan = planCleanup(
      [
        { out: "a.png", status: "modified" },
        { out: "b.png", status: "modified" },
        { out: "c.png", status: "modified" },
        { out: "n.png", status: "added" },
        { out: "d.png", status: "deleted" },
      ],
      (out) => before.get(out),
      (out) => after.get(out),
      (a, b) => {
        if (!b) throw new Error("not a PNG");
        return near(a, b);
      },
    );
    assert.deepEqual(plan, {
      reset: ["a.png"],
      real: ["b.png"],
      added: ["n.png"],
      deleted: ["d.png"],
      unreadable: [{ out: "c.png", error: "not a PNG" }],
    });
  });

  test("reads git cat-file's batch output, a missing name and a name with spaces included", () => {
    const names = ["h:docs/a.png", "h:docs/two words.svg", "h:docs/b.png"];
    const buf = Buffer.concat([
      Buffer.from(`${"a".repeat(40)} blob 3\nPNG\n`),
      Buffer.from("h:docs/two words.svg missing\n"),
      Buffer.from(`${"b".repeat(40)} blob 4\n\n\0\n\n\n`),
    ]);
    const got = parseCatFileBatch(buf, names);
    assert.equal(got.get(names[0]).toString(), "PNG");
    assert.equal(got.get(names[1]), null);
    assert.deepEqual([...got.get(names[2])], [10, 0, 10, 10]);
    assert.throws(() => parseCatFileBatch(Buffer.from(""), ["x"]), /ends before x/);
  });

  test("names the revision's commit and the folder's place in the repository", () => {
    const git = (args) => {
      const a = args.join(" ");
      if (a === "rev-parse --show-prefix") return { status: 0, stdout: "docs/\n" };
      if (a === "rev-parse --verify --quiet HEAD^{commit}") return { status: 0, stdout: `${"cd34".repeat(10)}\n` };
      if (args[1] === "--short=8") return { status: 0, stdout: "cd34cd34\n" };
      return { status: 1, stdout: "" };
    };
    assert.deepEqual(revisionOf("/r/docs", "HEAD", git), {
      hash: "cd34".repeat(10),
      short: "cd34cd34",
      prefix: "docs/",
    });
    assert.throws(() => revisionOf("/r/docs", "nope", git), /no revision nope/);
    assert.throws(() => revisionOf("/r/docs", "-x", git), /not a revision/);
  });

  test("reads a revision's files in one process and puts a text file back as a checkout writes it", (t) => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), "shot-revision-"));
    t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
    const git = (...args) => execFileSync("git", args, { cwd: repo, stdio: ["ignore", "pipe", "ignore"] });
    try {
      git("init", "-q");
    } catch {
      t.skip("no git");
      return;
    }
    // the same line endings on every machine; the index is written from the same files
    git("config", "core.autocrlf", "false");
    const docs = path.join(repo, "docs");
    fs.mkdirSync(path.join(docs, "two words"), { recursive: true });
    fs.writeFileSync(path.join(docs, "two words", "a.png"), Buffer.from([137, 80, 0, 10, 13, 10]));
    fs.writeFileSync(path.join(docs, "a.svg"), "<svg/>\n");
    git("add", ".");
    git("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "x");
    const rev = openRevision(docs, "HEAD");
    assert.equal(rev.prefix, "docs/");
    const got = rev.read(["two words/a.png", "a.svg", "none.png"]);
    assert.deepEqual([...got.get("two words/a.png")], [137, 80, 0, 10, 13, 10]);
    assert.equal(got.get("a.svg").toString(), "<svg/>\n");
    assert.equal(got.get("none.png"), null);
    assert.equal(rev.bytes("a.svg").toString(), "<svg/>\n");
    // put back by git, as a checkout writes it, and the index left alone
    fs.writeFileSync(path.join(docs, "a.svg"), "<svg>changed</svg>\n");
    restoreFromRevision(docs, rev.hash, ["a.svg"]);
    assert.equal(fs.readFileSync(path.join(docs, "a.svg"), "utf8"), "<svg/>\n");
    assert.equal(git("status", "--porcelain").toString(), "");
  });
});
