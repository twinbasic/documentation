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
// user name unless its caller turns the check off; and the pictures listed. And sheets.mjs:
// the folders a sheet is refused, and the sheet's page, made of lib/shot-views.mjs's pieces.
// And the sheet of changes against a git revision
// (sheet.mjs --against): git's change list, the comparison of two pictures over two sizes,
// the noise rule, the order and the page. And the url()s of a frozen page's style sheets
// (lib/shot-freeze.mjs; the freezing itself is in the page). And lib/record-lines.mjs, the records a child
// process writes among its lines, which runShards reads. And what becomes of a picture and
// its SVG: lib/shot-policy.mjs's decisions, with a picture's allowances and a review's
// decisions, and lib/shot-apply.mjs's writing of them, in a scratch folder and a scratch
// repository. And the Chrome extension, without a Chrome: that what it loads can be loaded
// there, its connection, how it lays a page out at 1x, its file, its list of private words,
// and chromeshot.mjs's refusals. And lib/shot-manifest.mjs, the manifest those come from: its text, what it
// refuses, and its saving. And a run's stage (lib/shot-stage.mjs), the strength map and its
// regions (lib/shot-change.mjs) and which pictures need a look (lib/shot-queue.mjs). The
// screenshot review tool's own modules are tested in test/shot-review.test.mjs.
//
// Runs with a bare `node --test test/svgshot.test.mjs`: no tree, no build.

import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import { describe, test } from "node:test";
import { gunzipSync, gzipSync } from "node:zlib";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import {
  BUNDLE_VERSION,
  bundleFile,
  copyBundle,
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
import { attachDebugger } from "../scripts/svgshot/chrome/conn.mjs";
import { browserShot, SHOTS } from "../scripts/svgshot/chrome/shots.mjs";
import {
  captureWatcher,
  extensionStep,
  installExtension,
  takeRefusal,
  tellPanel,
} from "../scripts/svgshot/chrome-take.mjs";
import { extensionFiles, extensionModules } from "../scripts/svgshot/extension-files.mjs";
import {
  AVATAR,
  captureBlob,
  captureName,
  layoutPlan,
  logName,
  markPrimitives,
  pngSizeOf,
  unionWithin,
  wholeBox,
} from "../scripts/svgshot/chrome/take.mjs";
import { findElement, matches, trimArea, trimPicture } from "../scripts/svgshot/trim.mjs";
import { privateEntries, privateWords } from "../scripts/svgshot/private-list.mjs";
import {
  drawnStrings,
  drawnWords,
  heldPaths,
  heldWords,
  holdsUserName,
  maskText,
  scrubBundle,
  wordList,
} from "../scripts/svgshot/private-words.mjs";
import { cssUrls, rewriteCssUrls } from "../scripts/lib/shot-freeze.mjs";
import { decodePng, encodePng, pngSize } from "../scripts/lib/png.mjs";
import { onStop, parseRecord, readRecords, recordLine, sendStop, STOP_LINE } from "../scripts/lib/record-lines.mjs";
import {
  readStrength,
  readVerdict,
  readVerdicts,
  stagedFiles,
  stageRefusal,
  writeStrength,
  writeVerdict,
} from "../scripts/lib/shot-stage.mjs";
import {
  applyPicture,
  applySvg,
  dropPicture,
  heldOf,
  holdPicture,
  restorePictures,
  slugOf,
  unholdPicture,
} from "../scripts/lib/shot-apply.mjs";
import {
  bundleFollowsSvg,
  cleanupResets,
  decidePicture,
  decideSvg,
  pngRule,
  SIZE_SLACK,
  SVG_FAITHFUL,
  svgFollowsPng,
  svgRule,
  themeTextDifference,
} from "../scripts/lib/shot-policy.mjs";
import { holdsRoot, rootPattern, SHOWN_ROOT, showRoot, TOOL_ROOT } from "../scripts/lib/shot-root.mjs";
import {
  earlierPngDecision,
  earlierSvgDecision,
  hashOf,
  manifestText,
  openManifest,
  parseManifest,
  pngDecision,
  svgDecision,
} from "../scripts/lib/shot-manifest.mjs";
import {
  changeMap,
  changeRegions,
  compareImages,
  NOISE_LEVELS,
  NOISE_SHARE,
  pixelDiff,
  pngsNear,
  regionMasks,
  shareOff,
  strengthOf,
  withinNoise,
} from "../scripts/lib/shot-change.mjs";
import { allowancesOf, meterHtml } from "../scripts/lib/shot-views.mjs";
import {
  FAINT_LEVEL,
  pngLook,
  pngRegions,
  reviewPicture,
  reviewSvg,
  SURVIVES,
  surviving,
  svgLook,
  svgRegions,
  WORD_CORE,
} from "../scripts/lib/shot-queue.mjs";
import {
  changedBetween,
  changedPictures,
  commitPaths,
  openRevision,
  outputRefusal,
  parseCatFileBatch,
  parseNameStatus,
  parseStatus,
  parseUntracked,
  pictureFate,
  planCleanup,
  restoreFromRevision,
  revisionOf,
  svgFate,
  workingChanges,
} from "../scripts/lib/shot-revision.mjs";
import {
  judgedFiles,
  listPictures,
  redraw,
  retakeText,
  shareOf,
  staleBundle,
  themeOf,
} from "../scripts/svgshot/redraw.mjs";
import {
  cleanupCommand,
  changeFiles,
  changeSheetHtml,
  compareRevisionPicture,
  restoreCommand,
  sortChangeRows,
  mayWriteSheet,
  notDrawn,
  SHEET_GENERATOR,
  sheetHtml,
  sortRows,
} from "../scripts/svgshot/sheets.mjs";
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
  accentInk,
  accentUnknown,
  backgroundClip,
  bordersCover,
  canvasColor,
  decodeSnapshot,
  blendWithWhite,
  decoratingBoxes,
  ELLIPSIS,
  ellipsisLines,
  elementTransform,
  embeddedImage,
  frameGeometry,
  lineThroughAbove,
  framesIn,
  frameView,
  inlineSvgsIn,
  nativeTextField,
  naturalSize,
  oneLine,
  renderSvg,
  scopeIds,
  selectedParts,
  selectLabel,
  shadowShowsThrough,
  textNeeds,
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

describe("lineThroughAbove", () => {
  test("puts the line where Chromium draws it, from the rounded ascent and the thickness before rounding", () => {
    // [font size, rounded ascent, the line's top above the baseline], measured in headless Chromium
    const measured = [
      [8, 9, 3], // Segoe UI
      [11, 12, 5],
      [19, 21, 8],
      [26, 28, 11],
      [48, 52, 20],
      [64, 69, 26],
      [10, 9, 3], // Consolas
      [40, 37, 14],
      [13.5, 12, 5], // Arial
    ];
    for (const [size, ascent, above] of measured)
      assert.equal(lineThroughAbove(ascent, size / 10), above, `${size} px`);
  });
});

describe("text-overflow: ellipsis", () => {
  // A <div> 100 px wide at 10, 10 whose one line of text, at 20, is 200 px wide.
  const TEXT = "Datatype has not been explicitly declared";
  const KEY = JSON.stringify(["normal", "400", "13px", "Arial"]);
  function page({ overflow = "hidden", textOverflow = "ellipsis" } = {}) {
    const names = ["display", "visibility", "color", "font-family", "font-size", "font-weight", "font-style"];
    const styleNames = [...names, "overflow-x", ...(textOverflow ? ["text-overflow"] : [])];
    const strings = [];
    const s = (v) => {
      const i = strings.indexOf(v);
      return i >= 0 ? i : strings.push(v) - 1;
    };
    const style = (clip) => [
      ...["block", "visible", "rgb(0, 0, 0)", "Arial", "13px", "400", "normal"].map(s),
      s(clip ? overflow : "visible"),
      ...(textOverflow ? [s(clip ? textOverflow : "clip")] : []),
    ];
    const nodeNames = ["#document", "HTML", "BODY", "DIV", "#text"];
    const snapshot = {
      strings,
      documents: [
        {
          documentURL: s("http://localhost:1/"),
          frameId: s("PAGE"),
          nodes: {
            parentIndex: [-1, 0, 1, 2, 3],
            nodeType: [9, 1, 1, 1, 3],
            nodeName: nodeNames.map(s),
            nodeValue: nodeNames.map((n) => (n === "#text" ? s(TEXT) : -1)),
            attributes: nodeNames.map(() => []),
          },
          layout: {
            nodeIndex: [1, 2, 3, 4],
            styles: [style(false), style(false), style(true), []],
            bounds: [
              [0, 0, 400, 100],
              [0, 0, 400, 100],
              [10, 10, 100, 16],
              [20, 10, 200, 16],
            ],
            text: [-1, -1, -1, s(TEXT)],
            paintOrders: [0, 1, 2, 3],
          },
          textBoxes: { layoutIndex: [3], bounds: [[20, 10, 200, 16]], start: [0], length: [TEXT.length] },
        },
      ],
    };
    return decodeSnapshot(snapshot, styleNames);
  }
  const text = (doc) => doc.layouts.find((l) => l.text !== undefined);
  const draw = (doc, cut) =>
    renderSvg(doc, {
      clip: { x: 0, y: 0, w: 400, h: 100 },
      metrics: () => ({ ascent: 12, height: 15, line: 15 }),
      textWidth: (_key, s) => (s === ELLIPSIS ? 8 : null),
      cut,
    }).svg;

  test("cuts a line its block clips and ends in an ellipsis, past its content box", () => {
    const doc = page();
    const line = ellipsisLines(doc).lineOf(text(doc), 0);
    assert.equal(line.end, 110);
    assert.equal(line.frags.length, 1);
    const needs = textNeeds(doc, { x: 0, y: 0, w: 400, h: 100 });
    assert.deepEqual(needs.cuts, [[KEY, TEXT, KEY, 90, true]]);
    assert.ok(needs.runs.some(([key, s]) => key === KEY && s === ELLIPSIS));
  });

  test("draws what fits, then the ellipsis after it", () => {
    const svg = draw(page(), (...need) => {
      assert.deepEqual(need, [KEY, TEXT, KEY, 90, true]);
      return [8, 50];
    });
    assert.match(svg, /<text [^>]*x="20"[^>]*>Datatype<\/text>/);
    assert.match(svg, new RegExp(`<text [^>]*x="70"[^>]*>${ELLIPSIS}</text>`));
    assert.doesNotMatch(svg, /explicitly/);
  });

  test("draws the line whole where the page was not asked", () => {
    assert.match(
      draw(page(), () => null),
      /explicitly declared<\/text>/,
    );
  });

  test("leaves a line alone that is not clipped or not set to ellipsis", () => {
    for (const doc of [page({ overflow: "visible" }), page({ textOverflow: "clip" })]) {
      const { lineOf, unknown } = ellipsisLines(doc);
      assert.equal(lineOf(text(doc), 0), null);
      assert.equal(unknown, 0);
    }
  });

  test("counts a clipped line as unknown in a snapshot without text-overflow", () => {
    const doc = page({ textOverflow: null });
    const { lineOf, unknown } = ellipsisLines(doc);
    assert.equal(lineOf(text(doc), 0), null);
    assert.equal(unknown, 1);
  });
});

describe("checkboxes and radio buttons", () => {
  // An <input type> 13 by 13 at 10, 10 with the attributes `attrs`, [name, value or -1], -1 being
  // how DevTools writes an empty string (the value of `disabled`).
  function page(type, attrs = [], checked = false) {
    const strings = [];
    const s = (v) => {
      const i = strings.indexOf(v);
      return i >= 0 ? i : strings.push(v) - 1;
    };
    const style = ["block", "visible", "auto"].map(s);
    const names = ["#document", "HTML", "BODY", "INPUT"];
    const own = [s("type"), s(type), ...attrs.flatMap(([name, value]) => [s(name), value === -1 ? -1 : s(value)])];
    const snapshot = {
      strings,
      documents: [
        {
          documentURL: s("http://localhost:1/"),
          frameId: s("PAGE"),
          nodes: {
            parentIndex: [-1, 0, 1, 2],
            nodeType: [9, 1, 1, 1],
            nodeName: names.map(s),
            nodeValue: names.map(() => -1),
            attributes: [[], [], [], own],
            ...(checked ? { inputChecked: { index: [3] } } : {}),
          },
          layout: {
            nodeIndex: [1, 2, 3],
            styles: [style, style, style],
            bounds: [
              [0, 0, 100, 50],
              [0, 0, 100, 50],
              [10, 10, 13, 13],
            ],
            text: [-1, -1, -1],
            paintOrders: [0, 1, 2],
          },
          textBoxes: { layoutIndex: [], bounds: [], start: [], length: [] },
        },
      ],
    };
    return decodeSnapshot(snapshot, ["display", "visibility", "appearance"]);
  }
  const draw = (doc) => renderSvg(doc, { clip: { x: 0, y: 0, w: 100, h: 50 }, metrics: () => ({}) }).svg;

  test("an attribute DevTools gives with no value is there, as an empty string", () => {
    const input = page("radio", [["disabled", -1]]).nodes[3];
    assert.equal(input.attrs.disabled, "");
    assert.equal(input.attrs.type, "radio");
  });

  test("a checked one is in the accent #0075ff", () => {
    assert.match(draw(page("checkbox", [], true)), /<rect width="13" height="13" rx="2" fill="#0075ff"\/>/);
    assert.match(draw(page("radio", [], true)), /<circle cx="6\.5" cy="6\.5" r="3\.75" fill="#0075ff"\/>/);
  });

  test("a disabled one is translucent: its fill, then its border and a checked one's dot or ground at 30%", () => {
    const fill = 'fill="rgba(245, 245, 245, 0.68)"';
    const line = "rgba(118, 118, 118, 0.3)";
    const radio = draw(page("radio", [["disabled", -1]]));
    assert.match(radio, new RegExp(`<circle cx="6\\.5" cy="6\\.5" r="6\\.5" ${fill.replace(/[().]/g, "\\$&")}/>`));
    assert.ok(radio.includes(`<circle cx="6.5" cy="6.5" r="6" fill="none" stroke="${line}" stroke-width="1"/>`));
    assert.doesNotMatch(radio, /opacity/);
    assert.ok(
      draw(page("radio", [["disabled", -1]], true)).includes(`<circle cx="6.5" cy="6.5" r="3.75" fill="${line}"/>`),
    );
    const box = draw(page("checkbox", [["disabled", -1]], true));
    assert.ok(
      box.includes(`<rect width="13" height="13" rx="2" ${fill}/><rect width="13" height="13" rx="2" fill="${line}"/>`),
    );
    assert.ok(box.includes('stroke="rgba(255, 255, 255, 0.6)"'));
    // with no disabled attribute, it is drawn opaque
    assert.match(draw(page("radio")), /<circle cx="6\.5" cy="6\.5" r="6\.5" fill="#767676"\/>/);
  });
});

describe("list markers", () => {
  // An <li> whose ::marker has the text `text` in one fragment at `box`, in a font of `size` px
  // whose ascent is `ascent`, as DevTools gives it: the marker a node of its own with the pseudo
  // type, holding a box and the text.
  function page(text, box, size = "13px", ascent = 14.03) {
    const strings = [];
    const s = (v) => {
      const i = strings.indexOf(v);
      return i >= 0 ? i : strings.push(v) - 1;
    };
    const names = ["display", "visibility", "color", "font-family", "font-size", "font-weight", "font-style"];
    const style = ["block", "visible", "rgb(97, 97, 97)", "Segoe UI", size, "400", "normal"].map(s);
    const nodeNames = ["#document", "HTML", "BODY", "LI", "::marker"];
    const snapshot = {
      strings,
      documents: [
        {
          documentURL: s("http://localhost:1/"),
          frameId: s("PAGE"),
          nodes: {
            parentIndex: [-1, 0, 1, 2, 3],
            nodeType: [9, 1, 1, 1, 1],
            nodeName: nodeNames.map(s),
            nodeValue: nodeNames.map(() => -1),
            attributes: [[], [], [], [], []],
            pseudoType: { index: [4], value: [s("marker")] },
          },
          layout: {
            nodeIndex: [1, 2, 3, 4, 4],
            styles: [style, style, style, style, style],
            bounds: [[0, 0, 500, 400], [0, 0, 500, 400], [0, 0, 500, 400], box, box],
            text: [-1, -1, -1, -1, s(text)],
            paintOrders: [0, 1, 2, 3, 4],
          },
          textBoxes: { layoutIndex: [4], bounds: [box], start: [0], length: [text.length] },
        },
      ],
    };
    const doc = decodeSnapshot(snapshot, names);
    return renderSvg(doc, { clip: { x: 0, y: 0, w: 500, h: 400 }, metrics: () => ({ ascent, height: 17, line: 17 }) })
      .svg;
  }

  test("a disc is a circle sized from the ascent, not the bullet's glyph", () => {
    // Help_Hover's marker: an ascent of 14 makes a disc 5 px across, 1 px in and 7 px down, snapped
    const svg = page("\u{2022} ", [398.65625, 294.625, 7, 17]);
    assert.ok(svg.includes('<ellipse cx="402.5" cy="304.5" rx="2.5" ry="2.5" fill="rgb(97, 97, 97)"/>'), svg);
    assert.doesNotMatch(svg, /<text/);
  });

  test("a circle is stroked 1 px wide on the same circle, a square fills its square", () => {
    assert.ok(
      page("\u{25E6} ", [10, 20, 7, 17]).includes(
        '<ellipse cx="13.5" cy="29.5" rx="2.5" ry="2.5" fill="none" stroke="rgb(97, 97, 97)" stroke-width="1"/>',
      ),
    );
    assert.ok(
      page("\u{25A0} ", [10, 20, 7, 17]).includes('<rect x="11" y="27" width="5" height="5" fill="rgb(97, 97, 97)"/>'),
    );
  });

  test("a disclosure triangle is 0.66 of the font size, its foot on the ascent", () => {
    // 6.6 px for a 10 px font, its top at 20 + 10 - 6.6
    const closed = page("\u{25B8} ", [10, 20, 7, 13], "10px", 10);
    assert.ok(closed.includes('<path d="M10 23.4L15.676 26.7L10 30Z" fill="rgb(97, 97, 97)"/>'), closed);
    const open = page("\u{25BE} ", [10, 20, 7, 13], "10px", 10);
    assert.ok(open.includes('<path d="M10 23.862L13.3 29.538L16.6 23.862Z"'), open);
  });

  test("other marker text is drawn as text", () => {
    assert.match(page("1. ", [10, 20, 14, 17]), /<text[^>]*>1\. <\/text>/);
  });
});

describe("a search field's clear button", () => {
  // A bundle of an <input type="search"> 200 by 25 at 10.5, 10 that shows "format", with the
  // clear buttons `buttons` read ([layout object's key, what searchButton read] pairs), or none
  // read when undefined (a bundle taken before they were).
  function bundleOf(buttons) {
    const strings = [];
    const s = (v) => {
      const i = strings.indexOf(v);
      return i >= 0 ? i : strings.push(v) - 1;
    };
    const styles = [
      "display",
      "visibility",
      "color",
      "font-family",
      "font-size",
      "font-weight",
      "font-style",
      "-webkit-text-fill-color",
      ...["top", "right", "bottom", "left"].flatMap((side) => [`padding-${side}`, `border-${side}-width`]),
    ];
    const style = [
      "block",
      "visible",
      "rgb(214, 214, 214)",
      "Segoe UI",
      "13px",
      "400",
      "normal",
      "rgb(214, 214, 214)",
      ...Array(8).fill("0px"),
    ].map(s);
    const names = ["#document", "HTML", "BODY", "INPUT"];
    const snapshot = {
      strings,
      documents: [
        {
          documentURL: s("http://localhost:1/"),
          frameId: s("PAGE"),
          nodes: {
            parentIndex: [-1, 0, 1, 2],
            nodeType: [9, 1, 1, 1],
            nodeName: names.map(s),
            nodeValue: names.map(() => -1),
            backendNodeId: names.map((_, i) => 100 + i),
            attributes: [[], [], [], [s("type"), s("search")]],
            inputValue: { index: [3], value: [s("format")] },
          },
          layout: {
            nodeIndex: [1, 2, 3],
            styles: [style, style, style],
            bounds: [
              [0, 0, 300, 50],
              [0, 0, 300, 50],
              [10.5, 10, 200, 25],
            ],
            text: [-1, -1, -1],
            paintOrders: [0, 1, 2],
          },
          textBoxes: { layoutIndex: [], bounds: [], start: [], length: [] },
        },
      ],
    };
    const key = JSON.stringify(["normal", "400", "13px", "Segoe UI"]);
    return {
      version: BUNDLE_VERSION,
      styles,
      view: { x: 0, y: 0, w: 300, h: 50 },
      background: true,
      snapshot,
      docs: [
        {
          frameId: "PAGE",
          scale: null,
          inner: null,
          page: {
            allRuns: [[key, "format"]],
            widths: [37],
            metrics: { [key]: { ascent: 14, height: 18, line: 18 } },
            gaps: [],
            overlays: [],
            marked: [],
            canvases: [],
            placeholderColor: "rgb(117, 117, 117)",
          },
          skips: [],
          platform: [],
          webFonts: {},
          fontFiles: {},
          svgs: [],
          scrollbars: [],
          ...(buttons ? { searchButtons: buttons } : {}),
          selection: null,
        },
      ],
    };
  }
  // The help pane's button as searchButton reads it: 9 px square, 8.5 px in from the field's right.
  const shown = {
    x: 182.5,
    y: 8,
    w: 9,
    h: 9,
    opacity: 1,
    visibility: "visible",
    display: "block",
    appearance: "auto",
    dark: false,
  };
  const X =
    /<g transform="translate\(193 18\) scale\(1\)"><path d="M1\.5 1\.5L7\.5 7\.5M7\.5 1\.5L1\.5 7\.5" fill="none" stroke="([^"]+)" stroke-width="2\.1" stroke-linecap="round"\/><\/g>/;

  test("is drawn in its box, snapped, in the light scheme's blue, shaded from top to bottom", () => {
    const { drawn, misses } = drawBundle(bundleOf([["0:2", shown]]));
    const [, paint] = drawn.svg.match(X) ?? [];
    assert.match(paint ?? "", /^url\(#d\d+\)$/, drawn.svg);
    assert.match(
      drawn.svg,
      /<linearGradient id="d\d+" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="9"><stop offset="0\.1" stop-color="rgb\(64, 121, 187\)"\/>/,
    );
    assert.ok(!misses.some((m) => m.includes("clear button")));
  });

  test("is white in a dark scheme, faded as the page fades it, and not drawn while hidden", () => {
    assert.equal(drawBundle(bundleOf([["0:2", { ...shown, dark: true }]])).drawn.svg.match(X)?.[1], "#fff");
    assert.match(drawBundle(bundleOf([["0:2", { ...shown, opacity: 0.5 }]])).drawn.svg, /scale\(1\)" opacity="0\.5">/);
    for (const hidden of [{ opacity: 0 }, { visibility: "hidden" }, { display: "none" }])
      assert.doesNotMatch(drawBundle(bundleOf([["0:2", { ...shown, ...hidden }]])).drawn.svg, /stroke-linecap/);
    assert.doesNotMatch(drawBundle(bundleOf([["0:2", null]])).drawn.svg, /stroke-linecap/);
  });

  test("is a question a bundle taken before the buttons were read has no answer for", () => {
    const { drawn, misses } = drawBundle(bundleOf(undefined));
    assert.ok(misses.includes("the clear button of a search field that shows text"), misses.join("; "));
    assert.doesNotMatch(drawn.svg, /stroke-linecap/);
  });
});

describe("a text field whose own text is transparent", () => {
  // An <input> 100 by 17 at 10, 10 with a placeholder, its own text transparent, as GitHub's search
  // box has it and a code editor's field does; `value` what it holds.
  const NAMES = [
    "display",
    "visibility",
    "color",
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "text-align",
    "-webkit-text-fill-color",
  ];
  const CLEAR = "rgba(0, 0, 0, 0)";
  function page(value) {
    const strings = [];
    const s = (v) => {
      const i = strings.indexOf(v);
      return i >= 0 ? i : strings.push(v) - 1;
    };
    const style = ["block", "visible", CLEAR, "Arial", "13px", "400", "normal", "start", CLEAR].map(s);
    const names = ["#document", "HTML", "BODY", "INPUT"];
    const snapshot = {
      strings,
      documents: [
        {
          documentURL: s("http://localhost:1/"),
          frameId: s("PAGE"),
          nodes: {
            parentIndex: [-1, 0, 1, 2],
            nodeType: [9, 1, 1, 1],
            nodeName: names.map(s),
            nodeValue: names.map(() => -1),
            backendNodeId: [1, 2, 3, 4],
            attributes: [[], [], [], [s("placeholder"), s("Search runs")]],
            inputValue: { index: value ? [3] : [], value: value ? [s(value)] : [] },
          },
          layout: {
            nodeIndex: [1, 2, 3],
            styles: [style, style, style],
            bounds: [
              [0, 0, 200, 100],
              [0, 0, 200, 100],
              [10, 10, 100, 17],
            ],
            text: [-1, -1, -1],
            paintOrders: [0, 1, 2],
          },
          textBoxes: { layoutIndex: [], bounds: [], start: [], length: [] },
        },
      ],
    };
    return decodeSnapshot(snapshot, NAMES);
  }
  const CLIP = { x: 0, y: 0, w: 200, h: 100 };
  const draw = (value) =>
    renderSvg(page(value), {
      clip: CLIP,
      metrics: () => ({ ascent: 12, height: 15, line: 17 }),
      textWidth: () => 70,
      placeholderColor: "rgb(145, 152, 161)",
    }).svg;

  test("leaves the placeholder, which has a colour of its own, drawn and measured", () => {
    assert.match(draw(""), />Search runs<\/text>/);
    assert.match(draw(""), /fill:rgb\(145, 152, 161\)/);
    assert.deepEqual(
      textNeeds(page(""), CLIP, {}).runs.map(([, text]) => text),
      ["Search runs"],
    );
  });

  test("does not draw the value: an editor lays its own text under it", () => {
    assert.doesNotMatch(draw("360 x"), />360 x<\/text>/);
    assert.doesNotMatch(draw("360 x"), />Search runs<\/text>/);
    assert.deepEqual(textNeeds(page("360 x"), CLIP, {}).runs, []);
  });
});

describe("a text field's selection", () => {
  test("selectedParts splits each line at the selection, a tab expanded from the line's start", () => {
    assert.deepEqual(selectedParts("360", false, "8", 0, 3), [{ before: "", selected: "360", after: "" }]);
    assert.deepEqual(selectedParts("abcdef", false, "8", 2, 4), [{ before: "ab", selected: "cd", after: "ef" }]);
    // a textarea's lines, the range across their break, a tab of 4
    assert.deepEqual(selectedParts("ab\r\n\tcd\nef", true, "4", 1, 6), [
      { before: "a", selected: "b", after: "" },
      { before: "", selected: "    c", after: "d" },
      // a line after the range is after the selection whole
      { before: "", selected: "", after: "ef" },
    ]);
  });

  test("blendWithWhite makes Chromium's own selection colour translucent, as Color::BlendWithWhite does", () => {
    // WebView2's SelectedItem, which paints rgb(51, 103, 209) over white
    assert.equal(blendWithWhite("rgb(25, 103, 210)"), "rgba(0, 65, 198, 0.8)");
    // a light colour blends at the first alpha
    assert.equal(blendWithWhite("rgb(200, 200, 200)"), "rgba(163, 163, 163, 0.6)");
    assert.equal(blendWithWhite("rgba(1, 2, 3, 0.5)"), "rgba(1, 2, 3, 0.5)");
  });

  // An <input> 100 by 17 at 10, 10, its node's backend id 4, holding "360 x".
  const NAMES = [
    "display",
    "visibility",
    "color",
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "text-align",
    "-webkit-text-fill-color",
  ];
  function page() {
    const strings = [];
    const s = (v) => {
      const i = strings.indexOf(v);
      return i >= 0 ? i : strings.push(v) - 1;
    };
    const style = ["block", "visible", "rgb(0, 0, 0)", "Arial", "13px", "400", "normal", "start", "rgb(0, 0, 0)"].map(
      s,
    );
    const names = ["#document", "HTML", "BODY", "INPUT"];
    const snapshot = {
      strings,
      documents: [
        {
          documentURL: s("http://localhost:1/"),
          frameId: s("PAGE"),
          nodes: {
            parentIndex: [-1, 0, 1, 2],
            nodeType: [9, 1, 1, 1],
            nodeName: names.map(s),
            nodeValue: names.map(() => -1),
            backendNodeId: [1, 2, 3, 4],
            attributes: names.map(() => []),
            inputValue: { index: [3], value: [s("360 x")] },
          },
          layout: {
            nodeIndex: [1, 2, 3],
            styles: [style, style, style],
            bounds: [
              [0, 0, 200, 100],
              [0, 0, 200, 100],
              [10, 10, 100, 17],
            ],
            text: [-1, -1, -1],
            paintOrders: [0, 1, 2],
          },
          textBoxes: { layoutIndex: [], bounds: [], start: [], length: [] },
        },
      ],
    };
    return decodeSnapshot(snapshot, NAMES);
  }
  const KEY = JSON.stringify(["normal", "400", "13px", "Arial"]);
  const WIDTHS = { "360 x": 34, 360: 21, " x": 13, "": 0 };
  const draw = (selection) =>
    renderSvg(page(), {
      clip: { x: 0, y: 0, w: 200, h: 100 },
      metrics: () => ({ ascent: 12, height: 15, line: 17 }),
      textWidth: (key, text) => (key === KEY ? (WIDTHS[text] ?? null) : null),
      selection,
    });
  // what was not drawn, but for the text's fonts, which the fixture gives none of
  const notDrawn = ({ stats }) =>
    Object.fromEntries(Object.entries(stats.unsupported).filter(([what]) => what !== "text in an unembedded font"));
  const selected = {
    backendNodeId: 4,
    start: 0,
    end: 3,
    focused: true,
    given: false,
    background: "rgb(25, 103, 210)",
    color: "rgb(255, 255, 255)",
  };

  test("textNeeds measures the parts of a selected line", () => {
    const { runs } = textNeeds(page(), { x: 0, y: 0, w: 200, h: 100 }, { selection: selected });
    assert.deepEqual(runs.map(([, text]) => text).sort(), ["360", "360 x", " x"].sort());
  });

  test("the selected part is drawn on the selection's ground, blended as Chromium blends it, in its colour", () => {
    const drawn = draw(selected);
    const { svg } = drawn;
    assert.match(svg, /<rect x="10" y="10" width="21" height="17" fill="rgba\(0, 65, 198, 0\.8\)"\/>/);
    assert.match(svg, /<text class="(t\d+)" x="10" y="[\d.]+" textLength="21" lengthAdjust="spacing">360<\/text>/);
    assert.match(svg, /<text class="t\d+" x="31" y="[\d.]+" textLength="13" lengthAdjust="spacing"> x<\/text>/);
    // the selected text in the selection's colour, the rest in the field's
    assert.match(svg, /fill:rgb\(255, 255, 255\)/);
    assert.deepEqual(notDrawn(drawn), {});
    // a colour the page gives is drawn as it is
    assert.match(draw({ ...selected, given: true, background: "rgb(1, 2, 3)" }).svg, /fill="rgb\(1, 2, 3\)"\/>/);
  });

  test("a selection in a window without focus, or outside a field, is reported as not drawn", () => {
    const blurred = draw({ ...selected, focused: false });
    assert.doesNotMatch(blurred.svg, /<rect x="10" y="10" width="21"/);
    assert.match(blurred.svg, />360 x<\/text>/);
    assert.deepEqual(notDrawn(blurred), { "a text selection in a window without focus": 1 });
    assert.deepEqual(notDrawn(draw({ outside: true })), { "a text selection outside a text field": 1 });
    // another field's selection, or none, draws the field's text whole
    assert.match(draw({ ...selected, backendNodeId: 9 }).svg, />360 x<\/text>/);
    assert.match(draw(null).svg, />360 x<\/text>/);
  });
});

describe("outlines", () => {
  // A <div> 100 by 20 at 10, 10 with the outline `outline` (style width colour) and the radius `radius`.
  const NAMES = [
    "display",
    "visibility",
    "outline-style",
    "outline-width",
    "outline-color",
    "outline-offset",
    ...["top-left", "top-right", "bottom-right", "bottom-left"].map((c) => `border-${c}-radius`),
  ];
  function page(style, width, radius = "0px", offset = "0px", image = null) {
    const strings = [];
    const s = (v) => {
      const i = strings.indexOf(v);
      return i >= 0 ? i : strings.push(v) - 1;
    };
    const plain = ["block", "visible", "none", "0px", "rgb(0, 0, 0)", "0px", "0px", "0px", "0px", "0px"].map(s);
    const names = ["#document", "HTML", "BODY", image ? "IMG" : "DIV"];
    const snapshot = {
      strings,
      documents: [
        {
          documentURL: s("http://localhost:1/"),
          frameId: s("PAGE"),
          nodes: {
            parentIndex: [-1, 0, 1, 2],
            nodeType: [9, 1, 1, 1],
            nodeName: names.map(s),
            nodeValue: names.map(() => -1),
            attributes: names.map(() => []),
            currentSourceURL: image ? { index: [3], value: [s(image)] } : undefined,
          },
          layout: {
            nodeIndex: [1, 2, 3],
            styles: [
              plain,
              plain,
              ["block", "visible", style, width, "rgba(0, 0, 0, 0.47)", offset, radius, radius, radius, radius].map(s),
            ],
            bounds: [
              [0, 0, 200, 100],
              [0, 0, 200, 100],
              [10, 10, 100, 20],
            ],
            text: [-1, -1, -1],
            paintOrders: [0, 1, 2],
          },
          textBoxes: { layoutIndex: [], bounds: [], start: [], length: [] },
        },
      ],
    };
    return decodeSnapshot(snapshot, NAMES);
  }
  const draw = (doc) =>
    renderSvg(doc, { clip: { x: 0, y: 0, w: 200, h: 100 }, metrics: () => ({ ascent: 12, height: 15, line: 15 }) }).svg;

  test("an image is cut to its box's rounded corners, a page's round avatar", () => {
    const png = encodePng({ width: 1, height: 1, rgba: new Uint8Array(4).fill(255) }).toString("base64");
    const image = `data:image/png;base64,${png}`;
    const round = draw(page("none", "0px", "10px", "0px", image));
    const id =
      /<g clip-path="url\(#([^)]*)\)"><use href="#[^"]*" transform="translate\(10 10\) scale\(100 20\)"\/><\/g>/.exec(
        round,
      );
    assert.ok(id, round);
    assert.match(round, new RegExp(`<clipPath id="${id[1]}"><path d="M`));
    const square = draw(page("none", "0px", "0px", "0px", image));
    assert.match(square, /<use href="#[^"]*" transform="translate\(10 10\) scale\(100 20\)"\/>/);
    assert.doesNotMatch(square, /<clipPath/);
  });

  test("a solid one with square corners is one stroked rectangle round the box", () => {
    assert.match(
      draw(page("solid", "1px")),
      /<rect x="9\.5" y="9\.5" width="101" height="21" fill="none" stroke="rgba\(0, 0, 0, 0\.47\)" stroke-width="1"\/>/,
    );
    // moved out by its offset
    assert.match(draw(page("solid", "2px", "0px", "3px")), /<rect x="6" y="6" width="108" height="28" fill="none"/);
  });

  test("a dashed one is drawn as a dashed border round the box, each side's dashes laid out as a border's", () => {
    const svg = draw(page("dashed", "1px"));
    assert.doesNotMatch(svg, /<rect [^>]*stroke=/);
    const sides = svg.match(
      /<path d="[^"]*" fill="none" stroke="rgba\(0, 0, 0, 0\.47\)" stroke-width="1" stroke-dasharray="[^"]*"\/>/g,
    );
    assert.equal(sides?.length, 4);
    assert.match(svg, /<path d="M9 9\.5H111"/);
  });

  test("a solid one follows the box's rounded corners, moved out with it", () => {
    const svg = draw(page("solid", "1px", "4px"));
    assert.doesNotMatch(svg, /<rect [^>]*stroke=/);
    assert.match(svg, /<path fill-rule="evenodd" fill="rgba\(0, 0, 0, 0\.47\)" d="M14 9H106A5 5 0 0 1 111 14/);
  });

  test("a focus ring round square corners is rounded by Chromium's default radius, moved out with each band", () => {
    const svg = draw(page("auto", "1px"));
    // the white band from 1 to 2 px out, the path's 2.85 px radius grown by each
    assert.match(
      svg,
      /<path fill-rule="evenodd" fill="#fff" d="M12\.85 8H107\.15A4\.85 4\.85 0 0 1 112 12\.85[^"]*M12\.85 9H107\.15A3\.85 3\.85 0 0 1 111 12\.85/,
    );
    // the band in the outline colour from 1 px in to 1 px out
    assert.match(
      svg,
      /fill="rgba\(0, 0, 0, 0\.47\)" d="M12\.85 9H[^"]*M12\.85 11H107\.15A1\.85 1\.85 0 0 1 109 12\.85/,
    );
    // a box's own rounded corners are the ring's, not the default
    assert.match(draw(page("auto", "1px", "4px")), /fill="#fff" d="M14 8H106A6 6 0 0 1 112 14/);
  });
});

describe("bordersCover", () => {
  const side = (width, style = "solid", color = "rgb(153, 153, 153)") => ({ width, style, color });
  test("is true where every side of a width is opaque and fills it, and the background is then drawn in the padding box", () => {
    // the menu separator: four 1 px sides of an inset border, as borders() gives them
    const separator = [
      side(1),
      side(1, "solid", "rgb(238, 238, 238)"),
      side(1, "solid", "rgb(255, 255, 255)"),
      side(1),
    ];
    const square = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];
    assert.equal(bordersCover(separator), true);
    assert.equal(backgroundClip("border-box", separator, square), "padding-box");
    // a rounded box keeps its background under its borders: its curved inner edge is antialiased
    const round = square.map(() => [8, 8]);
    assert.equal(backgroundClip("border-box", separator, round), "border-box");
    // a side of no width is no gap; groove and ridge fill their side too
    assert.equal(bordersCover([side(0), side(2, "groove"), side(0), side(2, "ridge")]), true);
    // the background shows between double, dotted and dashed marks, and through a translucent side
    for (const style of ["double", "dotted", "dashed"])
      assert.equal(bordersCover([side(1), side(1, style), side(1), side(1)]), false);
    assert.equal(bordersCover([side(1), side(1, "solid", "rgba(0, 0, 0, 0.5)"), side(1), side(1)]), false);
    // no border at all: nothing to avoid, and the clip asked for is kept
    assert.equal(bordersCover([side(0), side(0), side(0), side(0)]), false);
    assert.equal(backgroundClip("border-box", [side(0), side(0), side(0), side(0)], square), "border-box");
    assert.equal(backgroundClip("content-box", separator, square), "content-box");
  });
});

describe("embeddedImage", () => {
  const node = (name, attrs) => ({ name, attrs });
  test("is the data: image an <embed> shows, which Chromium draws as an <img>", () => {
    const ico = "data:image/x-icon;base64,AAABAAEAQD8Q";
    assert.equal(embeddedImage(node("EMBED", { src: ico, class: "embeddedPreview" })), ico);
    assert.equal(embeddedImage(node("EMBED", { src: "data:IMAGE/PNG;base64,iVBO" })), "data:IMAGE/PNG;base64,iVBO");
    // a plugin's resource, a file the SVG cannot reach, no source, or another element: none
    assert.equal(embeddedImage(node("EMBED", { src: "data:application/pdf;base64,JVBE" })), null);
    assert.equal(embeddedImage(node("EMBED", { src: "http://localhost/a.ico" })), null);
    assert.equal(embeddedImage(node("EMBED", {})), null);
    assert.equal(embeddedImage(node("IMG", { src: ico })), null);
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

  test("bakeMarkup with no colour step (opacity() alone) changes nothing, and wraps no picture", () => {
    const defs = ['<image id="d0" width="1" height="1" href="data:image/svg+xml,x"/>'];
    const { ctx } = converter(defs, new Map());
    const markup = '<use href="#d0"/><rect fill="rgb(1, 2, 3)"/>';
    assert.equal(bakeMarkup(markup, { key: "opacity(0.5)", steps: steps("opacity(0.5)") }, ctx), markup);
    assert.equal(defs.length, 1);
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

  test("is trimmed to a picture's area, found in the capture, whole CSS px inside what it holds", async () => {
    const bundle = bundleOf(measured);
    // The list's box is 10,10 200x20 in a view of 0,0 400x100.
    const shown = { css: "select", text: "Shown" };
    assert.deepEqual(trimArea(bundle, { of: [shown] }), { x: 2, y: 2, w: 216, h: 36 });
    assert.deepEqual(trimArea(bundle, { of: [shown], pad: 0 }), { x: 10, y: 10, w: 200, h: 20 });
    // The padding stops at what the capture holds.
    assert.deepEqual(trimArea(bundle, { of: [shown], pad: 30 }), { x: 0, y: 0, w: 240, h: 60 });
    // A side can have room of its own, and the others keep theirs.
    assert.deepEqual(trimArea(bundle, { of: [shown], pad: { left: 1, top: 2 } }), { x: 9, y: 8, w: 209, h: 30 });
    // The marks count, and may be at half a pixel.
    const marked = { x: 300.5, y: 40, width: 20, height: 22.5 };
    assert.deepEqual(trimArea(bundle, { of: [shown], pad: 0 }, marked), { x: 10, y: 10, w: 311, h: 53 });
    assert.throws(() => trimArea(bundle, { of: [{ css: "button" }] }), /has no element \{"css":"button"\}/);
    // An area that was not in the window asks for a scroll, and says which way.
    const low = structuredClone(bundle);
    low.view = { x: 0, y: 0, w: 400, h: 25 };
    assert.throws(() => trimArea(low, { of: [shown] }), /runs 5 px past the bottom of the window/);

    const [width, height] = [800, 200];
    const rgba = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) rgba.set([x % 256, y % 256, (x >> 8) * 40, 255], (y * width + x) * 4);
    const picture = { theme: "dark", png: encodePng({ width, height, rgba }).toString("base64"), bundle };
    const area = trimArea(bundle, { of: [shown] });
    const trimmed = trimPicture(picture, area);
    const image = decodePng(Buffer.from(trimmed.png, "base64"));
    assert.deepEqual([image.width, image.height], [432, 72]);
    // Each pixel is the one it was, at 2 device px to the CSS px.
    assert.deepEqual([...image.rgba.subarray(0, 4)], [4, 4, 0, 255]);
    assert.deepEqual([...image.rgba.subarray((71 * 432 + 431) * 4)], [435 % 256, 75, 40, 255]);
    assert.deepEqual(trimmed.bundle.view, area);
    // The SVG is what a capture of that area draws: its text, in that view.
    const { svg } = await renderBundle(trimmed.bundle);
    assert.match(svg, />Shown<\/text>/);
    assert.match(svg, /\swidth="216" height="36" viewBox="2 2 216 36"/);
  });

  describe("taken in a person's browser, by chromeshot.mjs --take", () => {
    const TOOL = path.join(REPO_ROOT, "scripts", "svgshot", "chromeshot.mjs");
    const OUT = "Documentation/Images/compare-changes.png";
    // A window as the extension takes it: 400 by 100 at 2x, its <select> the two elements the
    // table trims compare-changes to, and the mark on it.
    function window(themes, over = {}) {
      const paint = (v) =>
        encodePng({ width: 800, height: 200, rgba: new Uint8Array(640000).fill(v) }).toString("base64");
      const bundle = structuredClone(bundleOf(measured));
      const doc = bundle.snapshot.documents[0];
      const { strings } = bundle.snapshot;
      strings.push("class", "Subhead range-editor");
      doc.nodes.attributes[3] = [strings.length - 2, strings.length - 1];
      return {
        format: 1,
        out: OUT,
        area: "viewport",
        marked: { x: 10, y: 10, width: 200, height: 20 },
        url: "https://github.com/twinbasic/documentation/compare",
        pictures: themes.map((theme) => ({ theme, png: paint(theme === "dark" ? 40 : 250), bundle })),
        ...over,
      };
    }
    // Starts a take in the folder `root`, with a person's part left to the test: {say(what),
    // until(type), child, ended}: `until` resolves to the first event of `type` not yet read.
    function start(root, pattern) {
      const captures = path.join(root, "captures");
      const extension = path.join(root, "extension");
      fs.mkdirSync(captures, { recursive: true });
      fs.mkdirSync(path.join(root, "out"), { recursive: true });
      const words = path.join(root, "words.json");
      fs.writeFileSync(words, JSON.stringify({ words: [] }));
      const child = spawn(
        process.execPath,
        [
          TOOL,
          "--take",
          pattern,
          "--no-open",
          "--events",
          ...["--captures", captures, "--extension", extension],
          ...["--stage", path.join(root, "stage")],
          ...["--out", path.join(root, "out"), "--bundles", path.join(root, "bundles"), "--words", words],
        ],
        { stdio: ["pipe", "pipe", "pipe"] },
      );
      const events = [];
      const waiting = [];
      let log = "";
      const check = () => {
        for (const w of [...waiting]) {
          const k = events.findIndex((e) => e.type === w.type);
          if (k < 0) continue;
          waiting.splice(waiting.indexOf(w), 1);
          w.resolve(events.splice(k, 1)[0]);
        }
      };
      readRecords(child.stdout, ["shot-event"], {
        onRecord: (_, value) => {
          events.push(value);
          check();
        },
        onLine: (line) => {
          log += line + "\n";
        },
      });
      child.stderr.on("data", (d) => {
        log += d;
      });
      const ended = new Promise((resolve) => child.on("close", resolve));
      return {
        child,
        ended,
        log: () => log,
        // As a browser saves a download: under another name, then renamed.
        say(what) {
          const file = path.join(captures, "compare-changes.capture.json.gz");
          fs.writeFileSync(file + ".part", gzipSync(JSON.stringify(what)));
          fs.renameSync(file + ".part", file);
        },
        until: (type) =>
          new Promise((resolve) => {
            waiting.push({ type, resolve });
            check();
          }),
      };
    }

    test("refuses a capture it cannot use, waits for the next, and stages what it takes", {
      timeout: 120000,
    }, async () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "chromeshot-take-"));
      const take = start(root, "compare-changes");
      try {
        const run = await take.until("run");
        assert.equal(run.tool, "chromeshot");
        assert.deepEqual(run.jobs[0].pictures, [OUT, OUT.replace(".png", ".light.png")]);
        // The extension is in its folder, and its panel is told which picture is next.
        const waits = await take.until("await");
        assert.equal(
          waits.url,
          "https://github.com/twinbasic/documentation/compare/main...twinbasic:documentation:main",
        );
        assert.ok(fs.existsSync(path.join(root, "extension", "manifest.json")));
        const next = JSON.parse(fs.readFileSync(path.join(root, "extension", "next.json"), "utf8"));
        assert.deepEqual(next, { shot: "compare-changes" });
        // Each mistake is said, and the picture is waited for again.
        take.say(window(["dark", "light"], { area: "drag" }));
        assert.match((await take.until("refused")).error, /a dragged rectangle/);
        take.say(window(["light"]));
        assert.match((await take.until("refused")).error, /only the light theme/);
        take.say(window(["dark", "light"], { marked: null }));
        assert.match((await take.until("refused")).error, /no marks/);
        take.say(window(["dark", "light"], { url: "https://github.com/contributor/twinBASIC-docs/compare" }));
        assert.match((await take.until("refused")).error, /another repository/);
        take.say(window(["dark", "light"]));
        const pictures = [await take.until("picture"), await take.until("picture")];
        assert.deepEqual(pictures.map((p) => p.out).sort(), [OUT.replace(".png", ".light.png"), OUT]);
        assert.ok(pictures.every((p) => p.state === "new" && p.build === null));
        assert.equal((await take.until("svg")).out, OUT);
        assert.equal((await take.until("job")).state, "started");
        assert.equal((await take.until("job")).state, "done");
        assert.equal((await take.until("summary")).taken, 1);
        assert.equal(await take.ended, 0, take.log());
        // With --stage, the capture is in the stage, trimmed, and nothing is under the pictures' folder.
        assert.deepEqual(fs.readdirSync(path.join(root, "out")), []);
        const staged = decodePng(fs.readFileSync(stagedFiles(path.join(root, "stage"), OUT).capture));
        assert.deepEqual([staged.width, staged.height], [432, 72]);
        assert.equal(readVerdict(path.join(root, "stage"), OUT).png.state, "new");
        assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, "extension", "next.json"), "utf8")), {
          shot: null,
        });
      } finally {
        take.child.kill();
        await take.ended;
        fs.rmSync(root, { recursive: true, force: true });
      }
    });

    test("stops at a line on its stdin, and says which pictures it did not take", { timeout: 60000 }, async () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "chromeshot-take-"));
      const take = start(root, "merge-pull-request|run-workflow");
      try {
        await take.until("await");
        sendStop(take.child);
        await take.until("stopping");
        const skipped = [
          await take.until("skipped"),
          await take.until("skipped"),
          await take.until("skipped"),
          await take.until("skipped"),
        ];
        assert.deepEqual(
          skipped.map((e) => e.job),
          ["merge-pull-request", "merge-pull-request", "run-workflow", "run-workflow"],
        );
        const summary = await take.until("summary");
        assert.deepEqual([summary.taken, summary.stopped], [0, true]);
        assert.equal(await take.ended, 0, take.log());
      } finally {
        take.child.kill();
        await take.ended;
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  });

  test("goes through chromeshot.mjs, which refuses what shows a private word before it writes", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "chromeshot-test-"));
    try {
      const png = encodePng({ width: 4, height: 2, rgba: new Uint8Array(32).fill(255) }).toString("base64");
      const capture = (over = {}) => ({
        format: 1,
        out: "Images/x.png",
        pictures: [{ theme: "dark", png, bundle: { ...bundleOf(measured), ...over } }],
      });
      const out = path.join(root, "out");
      const write = (name, what) => {
        const file = path.join(root, name);
        fs.writeFileSync(file, gzipSync(JSON.stringify(what)));
        return file;
      };
      const words = path.join(root, "words.json");
      fs.writeFileSync(words, JSON.stringify({ words: [{ find: "shown", show: "seen" }] }));
      const run = (...args) => {
        const tool = path.join(REPO_ROOT, "scripts", "svgshot", "chromeshot.mjs");
        const bundles = path.join(root, "bundles");
        return spawnSync(process.execPath, [tool, ...args, "--out", out, "--bundles", bundles, "--words", words], {
          encoding: "utf8",
        });
      };
      fs.mkdirSync(out);
      // The page's text is "Shown": in any case, a private word, and nothing is written.
      const shown = run(write("shown.capture.json.gz", capture()));
      assert.equal(shown.status, 1);
      assert.match(shown.stderr, /refused, nothing written: Images\/x\.png: its page shows shown/);
      assert.deepEqual(fs.readdirSync(out), []);
      // A format the converter does not read is refused too, whatever it holds.
      const old = run(write("old.capture.json.gz", capture({ version: BUNDLE_VERSION - 1 })));
      assert.equal(old.status, 1);
      assert.match(old.stderr, /a bundle of format 2, and the converter reads 3/);
      // What is no capture, and a capture lying where pictures are, are no captures to read.
      assert.equal(run(write("none.capture.json.gz", { format: 2 })).status, 2);
      fs.writeFileSync(path.join(root, "bad.gz"), "not gzip");
      assert.equal(run(path.join(root, "bad.gz")).status, 2);
      const inside = path.join(out, "a.capture.json.gz");
      fs.writeFileSync(inside, gzipSync(JSON.stringify(capture())));
      const under = run(inside);
      assert.equal(under.status, 2);
      assert.match(under.stderr, /a capture holds what the page held/);
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
      await assert.rejects(redraw({ ...args, user: ["nobody", "SHOWN"] }), /holds the Windows user name/);
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

  test("staleBundle says why the cache's bundle cannot draw a picture again, as redraw does, or null", async () => {
    const bundle = structuredClone(bundleOf(measured));
    const extra = SNAPSHOT_STYLES.filter((s) => !STYLES.includes(s));
    bundle.styles = [...STYLES, ...extra];
    for (const row of bundle.snapshot.documents[0].layout.styles) row.push(...extra.map(() => -1));
    const { misses } = await renderBundle(bundle);
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "stale-test-"));
    try {
      const bundlesRoot = path.join(root, "bundles");
      const docsRoot = path.join(root, "docs");
      fs.mkdirSync(path.join(docsRoot, "Images"), { recursive: true });
      const png = Buffer.from("the picture");
      fs.writeFileSync(path.join(docsRoot, "Images/x.png"), png);
      const args = { bundlesRoot, docsRoot, out: "Images/x.png" };
      assert.deepEqual(staleBundle(args), { retake: "there is no bundle" });
      writeBundle(bundlesRoot, "Images/x.png", bundle, png, misses);
      assert.equal(staleBundle(args), null);
      // a question its capture had no answer for either is no reason
      writeBundle(bundlesRoot, "Images/x.png", bundle, png, []);
      assert.deepEqual(staleBundle(args), { retake: "no answer for 1 question", detail: misses[0] });
      writeBundle(bundlesRoot, "Images/x.png", { ...bundle, version: BUNDLE_VERSION - 1 }, png, misses);
      assert.match(staleBundle(args).retake, /^the bundle is of format /);
      writeBundle(bundlesRoot, "Images/x.png", bundle, Buffer.from("another picture"), misses);
      assert.deepEqual(staleBundle(args), { retake: "the PNG is not the one the bundle was taken with" });
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

  // The select's box with a picture for its background, `size` and centred, and its corners
  // rounded by `radius`.
  const PICTURE =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAIAAAADnC86AAAARklEQVRYw+3WIQoAIBBFQRWbyfsfyuBBTHaPIChomdeXgZ829tbCaXOM49sUPgUGg8FgMBj8vnzzN5VaTQ0Gg8FgMBi8bwFG0AiWOjVj3QAAAABJRU5ErkJggg==";
  const pictured = (size, radius) => {
    const bundle = bundleOf(measured);
    const corners = ["top-left", "top-right", "bottom-right", "bottom-left"].map((c) => `border-${c}-radius`);
    const extra = ["background-image", "background-size", "background-position", "background-repeat", ...corners];
    bundle.styles = [...STYLES, ...extra];
    const { strings, documents } = bundle.snapshot;
    const s = (v) => {
      const i = strings.indexOf(v);
      return i >= 0 ? i : strings.push(v) - 1;
    };
    const styles = documents[0].layout.styles;
    for (const st of styles) st.push(s("none"), s("auto"), s("0% 0%"), s("repeat"), ...corners.map(() => s("0px")));
    const own = [`url("${PICTURE}")`, size, "50% 50%", "no-repeat", ...corners.map(() => radius)];
    own.forEach((v, k) => {
      styles[2][STYLES.length + k] = s(v);
    });
    return renderBundle(bundle);
  };

  test("clips a background picture that reaches into a rounded corner to the corner", async () => {
    const { svg } = await pictured("200px 20px", "3px");
    const clip =
      /<clipPath id="(\w+)"><path d="M13 10H207A3 3 0 0 1 210 13V27A3 3 0 0 1 207 30H13A3 3 0 0 1 10 27V13A3 3 0 0 1 13 10Z"\/><\/clipPath>/;
    const [, id] = clip.exec(svg) ?? [];
    assert.ok(id, svg);
    assert.match(
      svg,
      new RegExp(
        `<g clip-path="url\\(#${id}\\)"><use href="#\\w+" transform="translate\\(10 10\\) scale\\(200 20\\)"/></g>`,
      ),
    );
    // Clear of the corners, or in a square box: drawn as it is.
    for (const [size, radius] of [
      ["16px 16px", "3px"],
      ["200px 20px", "0px"],
    ]) {
      const { svg } = await pictured(size, radius);
      assert.doesNotMatch(svg, /<g clip-path="url\(#\w+\)"><use/, `${size} ${radius}`);
      assert.match(svg, /<use href="#\w+" transform="translate\([\d.]+ [\d.]+\) scale\([\d.]+ [\d.]+\)"\/>/);
    }
  });

  // The select's box with 1px solid borders, grey at the top and left and black at the right
  // and bottom (the IDE's Import from file... button), its corners rounded by `radius`.
  const bordered = (radius) => {
    const bundle = bundleOf(measured);
    const sides = ["top", "right", "bottom", "left"];
    const corners = ["top-left", "top-right", "bottom-right", "bottom-left"].map((c) => `border-${c}-radius`);
    const extra = [
      ...sides.flatMap((s) => [`border-${s}-width`, `border-${s}-style`, `border-${s}-color`]),
      ...corners,
    ];
    bundle.styles = [...STYLES, ...extra];
    const { strings, documents } = bundle.snapshot;
    const s = (v) => {
      const i = strings.indexOf(v);
      return i >= 0 ? i : strings.push(v) - 1;
    };
    const styles = documents[0].layout.styles;
    for (const st of styles)
      st.push(...sides.flatMap(() => [s("0px"), s("none"), s("rgb(0, 0, 0)")]), ...corners.map(() => s("0px")));
    const colours = ["rgb(133, 133, 133)", "rgb(0, 0, 0)", "rgb(0, 0, 0)", "rgb(133, 133, 133)"];
    const own = [...colours.flatMap((c) => ["1px", "solid", c]), ...corners.map(() => radius)];
    own.forEach((v, k) => {
      styles[2][STYLES.length + k] = s(v);
    });
    return renderBundle(bundle);
  };

  test("draws rounded sides of different colours as the rounded ring, each in its side's wedge", async () => {
    const { svg } = await bordered("5px");
    const ring =
      "M15 10H205A5 5 0 0 1 210 15V25A5 5 0 0 1 205 30H15A5 5 0 0 1 10 25V15A5 5 0 0 1 15 10Z" +
      "M15 11H205A4 4 0 0 1 209 15V25A4 4 0 0 1 205 29H15A4 4 0 0 1 11 25V15A4 4 0 0 1 15 11Z";
    const drawn = [
      ...svg.matchAll(/<path fill-rule="evenodd" fill="([^"]+)" d="([^"]+)" clip-path="url\(#(\w+)\)"\/>/g),
    ];
    assert.deepEqual(
      drawn.map((m) => [m[1], m[2]]),
      ["rgb(133, 133, 133)", "rgb(0, 0, 0)", "rgb(0, 0, 0)", "rgb(133, 133, 133)"].map((c) => [c, ring]),
    );
    // The top's wedge reaches 5px in along each diagonal, past the corners' curves.
    const top = new RegExp(`<clipPath id="${drawn[0][3]}"><polygon points="10 10 210 10 205 15 15 15"/></clipPath>`);
    assert.match(svg, top);
    // Square corners keep their trapezoids.
    const square = (await bordered("0px")).svg;
    assert.match(square, /<polygon points="10 10 210 10 209 11 11 11" fill="rgb\(133, 133, 133\)"\/>/);
    assert.doesNotMatch(square, /fill-rule="evenodd" fill="rgb\(133, 133, 133\)"/);
  });

  test("draws a checked control's white parts in the ink its accent-color gives", () => {
    // The fitted points: white down to a 3:1 contrast with white, dark below it.
    assert.equal(accentInk("rgb(71, 116, 164)"), "#fff");
    assert.equal(accentInk("rgb(148, 148, 148)"), "#fff");
    assert.equal(accentInk("rgb(150, 150, 150)"), "rgb(59, 59, 59)");
    assert.equal(accentInk("rgb(255, 0, 0)"), "#fff");
    assert.equal(accentInk("rgb(0, 192, 192)"), "rgb(59, 59, 59)");
    assert.equal(accentInk("#0075ff"), "#fff");
  });

  test("knows when a bundle cannot say a checked control's accent-color", () => {
    const control = (attrs, checked, style) => ({
      layouts: [{ node: { name: "INPUT", attrs: { type: "checkbox", ...attrs }, checked }, style }],
    });
    const shown = { visibility: "visible", appearance: "auto" };
    assert.equal(accentUnknown(control({}, true, shown)), true);
    assert.equal(accentUnknown(control({}, true, { ...shown, "accent-color": "auto" })), false);
    // Unchecked or disabled, it is drawn without its accent.
    assert.equal(accentUnknown(control({}, false, shown)), false);
    assert.equal(accentUnknown(control({ disabled: "" }, true, shown)), false);
    assert.equal(accentUnknown(control({}, true, { ...shown, appearance: "none" })), false);
  });

  test("puts the styles under a CSS zoom into the space of the boxes, or says it cannot", () => {
    // What Chromium's snapshot gives: each element's own zoom, and its lengths before the zoom.
    const names = ["display", "font-size", "border-top-width", "background-image", "transform", "transform-origin"];
    const snapshotOf = (styleNames) => {
      const strings = [];
      const s = (v) => {
        const i = strings.indexOf(v);
        return i >= 0 ? i : strings.push(v) - 1;
      };
      const style = (zoom) =>
        [
          "block",
          "13px",
          "2px",
          'url("data:x/2px")',
          "matrix(1, 0, 0, 1, 10, 6)",
          "800px 26px",
          ...(styleNames.includes("zoom") ? [zoom] : []),
        ].map(s);
      const nodeNames = ["#document", "HTML", "DIV", "DIV", "#text", "SPAN", "#text"];
      return {
        strings,
        documents: [
          {
            documentURL: s("http://localhost:1/"),
            frameId: s("PAGE"),
            nodes: {
              parentIndex: [-1, 0, 1, 2, 3, 3, 5],
              nodeType: [9, 1, 1, 1, 3, 1, 3],
              nodeName: nodeNames.map(s),
              nodeValue: nodeNames.map((n) => (n === "#text" ? s("x") : -1)),
              attributes: nodeNames.map((_n, i) => (i === 2 ? [s("style"), s("zoom: 50%;")] : [])),
            },
            // A text layout object has its element's style, own zoom and all.
            layout: {
              nodeIndex: [1, 2, 3, 4, 5, 6],
              styles: ["1", "0.5", "1", "1", "2", "2"].map(style),
              bounds: [[0, 0, 400, 100], ...Array(5).fill([0, 0, 50, 10])],
              text: [-1, -1, -1, s("x"), -1, s("x")],
              offsetRects: [[], [0, 0, 100, 20], [], [], [], []],
              clientRects: [[], [0, 0, 96, 16], [], [], [], []],
              scrollRects: [[], [8, 4, 300, 16], [], [], [], []],
            },
            textBoxes: { layoutIndex: [], bounds: [], start: [], length: [] },
          },
        ],
      };
    };
    const doc = decodeSnapshot(snapshotOf([...names, "zoom"]), [...names, "zoom"]);
    const [html, zoomed, inner, text, span, spanText] = doc.layouts.map((l) => l.style);
    assert.equal(doc.zoomUnknown, false);
    assert.equal(html["font-size"], "13px");
    for (const st of [zoomed, inner, text]) {
      assert.equal(st["font-size"], "6.5px");
      assert.equal(st["border-top-width"], "1px");
      assert.equal(st.transform, "matrix(1, 0, 0, 1, 5, 3)");
      assert.equal(st["transform-origin"], "400px 13px");
      // a px inside a url() is not a length
      assert.equal(st["background-image"], 'url("data:x/2px")');
    }
    // offsetWidth, clientWidth and scrollWidth are before the zoom too.
    const box = doc.layouts[1];
    assert.deepEqual(
      [box.offset, box.client, box.scroll],
      [
        { w: 50, h: 10 },
        { w: 48, h: 8 },
        { x: 4, y: 2, w: 150, h: 8 },
      ],
    );
    // zoom: 2 inside zoom: 50% draws at 1.
    assert.equal(span["font-size"], "13px");
    assert.equal(spanText["font-size"], "13px");
    // A bundle taken before zoom was read: nothing scaled, and the inline zoom says so.
    const old = decodeSnapshot(snapshotOf(names), names);
    assert.equal(old.zoomUnknown, true);
    assert.equal(old.layouts[2].style["font-size"], "13px");
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
    assert.equal(BUNDLE_VERSION, 3);
    await assert.rejects(renderBundle({ ...bundleOf(measured), version: 2 }), /a bundle of version 2, not 3/);
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

describe("a closed <select>", () => {
  // A <select> 200 by 20 at 10, 10, padded 12 px at each side, that reads "Shown", the browser's
  // own or, with `appearance: none`, one whose page draws its arrow, as GitHub's does.
  const NAMES = [
    "display",
    "visibility",
    "color",
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "text-align",
    "padding-left",
    "padding-right",
    "appearance",
  ];
  function page(appearance) {
    const strings = [];
    const s = (v) => {
      const i = strings.indexOf(v);
      return i >= 0 ? i : strings.push(v) - 1;
    };
    const style = (a, pad) =>
      ["block", "visible", "rgb(0, 0, 0)", "Arial", "13px", "400", "normal", "start", pad, pad, a].map(s);
    const names = ["#document", "HTML", "BODY", "SELECT", "OPTION", "#text"];
    const plain = style("auto", "0px");
    const snapshot = {
      strings,
      documents: [
        {
          documentURL: s("http://localhost:1/"),
          frameId: s("PAGE"),
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
            styles: [plain, plain, style(appearance, "12px")],
            bounds: [
              [0, 0, 400, 100],
              [0, 0, 400, 100],
              [10, 10, 200, 20],
            ],
            text: [-1, -1, -1],
            paintOrders: [0, 1, 2],
          },
          textBoxes: { layoutIndex: [], bounds: [], start: [], length: [] },
        },
      ],
    };
    return decodeSnapshot(snapshot, NAMES);
  }
  const draw = (appearance) =>
    renderSvg(page(appearance), {
      clip: { x: 0, y: 0, w: 400, h: 100 },
      metrics: () => ({ ascent: 12, height: 15, line: 17 }),
      textWidth: () => 34,
    }).svg;
  const clip = (svg) => svg.match(/<clipPath id="[^"]+"><rect ([^/]+)\/><\/clipPath>/)?.[1] ?? "";

  test("of the browser's own has its padding, and its chevron in a box at the end", () => {
    const svg = draw("auto");
    assert.match(svg, /<text class="t\d+" x="26" /);
    // The text is cut where the arrow's box begins: 10 + 200 - 12 - 16.
    assert.match(clip(svg), /x="26" y="10" width="156" height="20"/);
    // The chevron is centred in the 16 px box at the padding box's right edge, whatever the padding.
    assert.match(svg, /<path d="M198 18L202 22L206 18" fill="none"/);
  });

  test("with appearance none has neither: the page lays its arrow over the padding", () => {
    const svg = draw("none");
    assert.match(svg, /<text class="t\d+" x="22" /);
    assert.match(clip(svg), /x="22" y="10" width="176" height="20"/);
    assert.doesNotMatch(svg, /fill="none"/);
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
    // A viewport the document fits in has none.
    assert.equal(viewportGutters(doc, { w: 273, h: 188 }), null);
    // A zoomed frame's bars are as thick in the parent's px as any, and the rest of the
    // stand-in is in the parent's px too: a frame at 0.75 whose viewport is 293 by 188 of
    // its own px, 20 of them its bar, has a bar 15 px thick in a box of 219.75 by 141.
    const box = { x: 106, y: 56, w: 219.75, h: 141 };
    const zoomed = viewportScroller(doc, { box, scale: 0.75 }, { w: 293, h: 188 });
    assert.deepEqual(zoomed.viewport, { v: 15, h: 0 });
    assert.deepEqual(zoomed.client, { w: 204.75, h: 141 });
    assert.deepEqual(zoomed.scroll, { x: 0, y: 22.5, w: 225, h: 375 });
    assert.deepEqual(zoomed.bounds, box);
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

describe("a frozen page's style sheets (shot-freeze.mjs)", () => {
  test("the url()s of a sheet are found as Chromium writes them and as an author does, references into the document left out", () => {
    const text = `@font-face{src:url("../fonts/a \\"b\\".woff2") format("woff2")} .x{background:url('i.png')} .y{background-image:url( bare.svg )} .z{filter:url(#f)} .w{mask:url("#m")}`;
    assert.deepEqual(
      cssUrls(text).map((u) => u.url),
      ['../fonts/a "b".woff2', "i.png", "bare.svg"],
    );
    for (const u of cssUrls(text)) assert.match(text.slice(u.start, u.end), /^url\(.*\)$/);
  });

  test("each url() is replaced by what it is given, quoted and escaped, and one given null stays as it was", async () => {
    const text = `a{b:url(x.png)} c{d:url("y.woff2")} e{f:url(#g)}`;
    const out = await rewriteCssUrls(text, async (u) => (u === "x.png" ? 'data:image/png;base64,QQ"' : null));
    assert.equal(out, `a{b:url("data:image/png;base64,QQ\\"")} c{d:url("y.woff2")} e{f:url(#g)}`);
    assert.equal(await rewriteCssUrls("no urls here", async () => "z"), "no urls here");
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

  test("where ranges overlap the later rule comes first, and the earlier is kept for what it lacks", () => {
    const overlap = [
      { name: "all", range: "" },
      { name: "latin", range: "U+0-7F" },
    ];
    // a character the later file has no glyph for is drawn from the earlier one
    assert.deepEqual(chosen("ab", overlap), ["latin", "all"]);
    assert.deepEqual(chosen("一", overlap), ["all"]);
    // the IDE's codicon twice, its own file and then Monaco's, with no range
    const codicon = [
      { name: "ide", range: "" },
      { name: "monaco", range: "" },
    ];
    assert.deepEqual(chosen("\u{EC15}", codicon), ["monaco", "ide"]);
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

// redraw.mjs's parts that need no browser, what sheet.mjs lists, and sheets.mjs: where it may write, and the page.
describe("the sheet", () => {
  const PNG = (w, h) => {
    const b = Buffer.alloc(33);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b);
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
    assert.deepEqual(pngSize(new Uint8Array(PNG(3, 4))), [3, 4]);
    assert.deepEqual(pngSize(encodePng({ width: 2, height: 5, rgba: new Uint8Array(40) })), [2, 5]);
    assert.equal(pngSize(Buffer.from("not a png at all, but long enough")), null);
    assert.equal(pngSize(PNG(8, 8).subarray(0, 23)), null);
    // A JPEG's bytes read as a PNG's header would give a size of millions: not a PNG.
    assert.equal(pngSize(Buffer.from("ffd8ffe000104a46494600010100000100010000ff", "hex")), null);
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

  test("describes a picture's allowances, and nothing for an entry with none", () => {
    assert.deepEqual(allowancesOf(null), { png: null, svg: null });
    assert.deepEqual(allowancesOf({ build: 1501, png: { decision: { keep: "old", capture: "x" } } }), {
      png: null,
      svg: null,
    });
    const both = allowancesOf({
      png: {
        noise: { share: 0.8 },
        ignore: [
          [0, 0, 4, 4],
          [8, 8, 9, 9],
        ],
      },
      svg: { bar: { levels: 200 } },
    });
    assert.equal(
      both.png,
      `PNG allowance: within noise when no pixel is more than ${NOISE_LEVELS} levels off and at most 0.8% are off at all, 2 rectangles left out`,
    );
    assert.equal(both.svg, `SVG allowance: written below ${SVG_FAITHFUL}% of the pixels 200 levels or more off`);
    assert.match(allowancesOf({ svg: { ignore: [[0, 0, 1, 1]] } }).svg, /96 levels or more off, 1 rectangle left out$/);
    // A limit of its own past the meter's full width is marked at its end.
    assert.ok(meterHtml(0, 10, 100, "").includes('<b style="left:100%">'));
  });

  test("shows a picture's own bar and a review's decision on its card", () => {
    const row = {
      out: "IDE/A.png",
      theme: "dark",
      size: [10, 10],
      pct96: 0.4,
      pct32: 1,
      pct8: 2,
      source: "bundle",
      files: judgedFiles("IDE/A.png"),
    };
    const html = sheetHtml({
      rows: [
        {
          ...row,
          faithful: true,
          by: "rule",
          allowance: "SVG allowance: written below 0.5% of the pixels 96 levels or more off",
          own: { share: 0.4, bar: 0.5 },
        },
        { ...row, out: "IDE/B.png", faithful: true, by: "decision", allowance: null, own: null },
      ],
      plain: [],
      bar: 0.25,
      all: false,
    });
    assert.ok(
      html.includes("SVG allowance: written below 0.5% of the pixels 96 levels or more off: <b>0.4% off by it</b>"),
    );
    assert.ok(html.includes('title="0.4% off by its own bar; the bar is 0.5%"'));
    assert.ok(html.includes('<b style="left:5%">'));
    assert.ok(html.includes("<b>accepted by a review's decision</b>"));
    assert.ok(html.includes('title="0.4% strongly off; the bar is 0.25%"'));
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
    assert.equal(withinNoise(a, patch(80, 200), { rects: [{ x0: 0, y0: 0, x1: 100, y1: 1 }] }), true);
    assert.equal(withinNoise(a, patch(80, 200), { rects: [{ x0: 0, y0: 0, x1: 79, y1: 1 }] }), false);
    // Other limits: 17 levels within 17, 51 pixels within a share of 0.51%.
    assert.equal(withinNoise(a, patch(1, 117), { levels: 17 }), true);
    assert.equal(withinNoise(a, patch(51, 116), { share: 0.0051 }), true);
  });

  test("measures two pixels as seen over black and over white", () => {
    const px = (...rgba) => ({ rgba: new Uint8Array(rgba) });
    const d = (p, q) => pixelDiff(p, 0, q, 0);
    // opaque: the largest channel's difference
    assert.equal(d(px(10, 20, 30, 255), px(10, 25, 27, 255)), 5);
    // a shadow's last pixel, its colour rounding: 1 of opacity apart, not 255 levels
    assert.equal(d(px(255, 255, 255, 1), px(0, 0, 0, 0)), 1);
    assert.equal(d(px(255, 255, 255, 2), px(0, 0, 0, 2)), 2);
    // transparent pixels of any colour are the same
    assert.equal(d(px(255, 0, 9, 0), px(0, 0, 0, 0)), 0);
    // black at alpha 100 and 200: the same over black, 100 apart over white
    assert.equal(d(px(0, 0, 0, 100), px(0, 0, 0, 200)), 100);
    // opaque white and nothing: 255 apart over black
    assert.equal(d(px(255, 255, 255, 255), px(0, 0, 0, 0)), 255);
    // a cut-out's shadow edge within noise, though its colours are 255 apart
    const edge = (grey, alpha) => ({ width: 1, height: 1, rgba: new Uint8Array([grey, grey, grey, alpha]) });
    assert.equal(withinNoise(edge(255, 1), edge(0, 1), { share: 1 }), true);
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

  test("judges a picture with its allowance and a review's decision, as --cleanup does", () => {
    const png = (img) => encodePng(img);
    const before = png(image(10, 10));
    // One pixel 30 levels off: a change by the default rule.
    const after = png(image(10, 10, 100, setGrey(0, 0, 1, 1, 130)));
    const item = { out: "a/X.png", status: "modified" };
    const plain = compareRevisionPicture(item, before, after);
    assert.deepEqual(
      [plain.row.kind, plain.row.by, plain.row.share, plain.row.allowance],
      ["changed", "rule", NOISE_SHARE * 100, null],
    );
    // Within noise at 32 levels, as --cleanup judges it with the same entry.
    const loose = { png: { noise: { levels: 32, share: 1 } } };
    const allowed = compareRevisionPicture(item, before, after, loose);
    assert.deepEqual([allowed.row.kind, allowed.row.by, allowed.row.share], ["noise", "rule", 1]);
    assert.equal(allowed.row.stats.levels, 32);
    assert.equal(allowed.row.stats.beyond, 0);
    assert.equal(cleanupResets({ before, after, entry: loose, near: pngsNear }), true);
    assert.match(allowed.row.allowance, /^PNG allowance: within noise when no pixel is more than 32 levels off/);
    // The pixel left out by a rectangle.
    const left = compareRevisionPicture(item, before, after, { png: { ignore: [[0, 0, 1, 1]] } });
    assert.equal(left.row.kind, "noise");
    assert.match(left.row.allowance, /1 rectangle left out$/);
    // A review's decision about these bytes takes the rule's place, both ways.
    const kept = compareRevisionPicture(item, before, after, {
      png: { decision: { keep: "old", capture: hashOf(after) } },
    });
    assert.deepEqual([kept.row.kind, kept.row.by, kept.row.allowance], ["noise", "decision", null]);
    const taken = compareRevisionPicture(item, before, after, {
      png: { noise: { levels: 32 }, decision: { keep: "new", capture: hashOf(after) } },
    });
    assert.deepEqual([taken.row.kind, taken.row.by], ["changed", "decision"]);
    // The page says so on the card, and the meter's mark is the picture's own share.
    const html = changeSheetHtml({
      rows: [allowed.row, { ...kept.row, out: "a/K.png" }, { ...taken.row, out: "a/T.png" }],
      rev: "HEAD",
      hash: "h",
      short: "s",
      prefix: "docs/",
    });
    assert.ok(html.includes("by more than 32 grey levels"));
    assert.ok(html.includes("<b>kept old by a review's decision</b>"));
    assert.ok(html.includes("<b>taken new by a review's decision</b>"));
    assert.ok(html.includes('<b style="left:10%">'));
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
    assert.deepEqual(fate(HEAD, HEAD, DRIFT), { state: "restored", write: HEAD, against: "revision" });
    assert.deepEqual(fate(DRIFT, HEAD, DRIFT), { state: "restored", write: HEAD, against: "revision" });
    assert.deepEqual(fate(DRIFT, HEAD, null), { state: "restored", write: HEAD, against: "revision" });
    // an earlier run's real change goes too, when the IDE draws the revision's picture again
    assert.deepEqual(fate(HEAD, HEAD, CHANGE), { state: "restored", write: HEAD, against: "revision" });
    // the file is the revision's already
    assert.deepEqual(fate(HEAD, HEAD, HEAD), { state: "unchanged", write: null, against: "revision" });
    assert.deepEqual(fate(DRIFT, HEAD, HEAD), { state: "noise", write: null, against: "revision" });
  });

  test("a capture beyond noise of the revision's picture is compared with the file", () => {
    assert.deepEqual(fate(CHANGE, HEAD, CHANGE), { state: "unchanged", write: null, against: "disk" });
    assert.deepEqual(fate(CHANGE2, HEAD, CHANGE), { state: "noise", write: null, against: "disk" });
    assert.deepEqual(fate(OTHER, HEAD, CHANGE), { state: "updated", write: OTHER, against: "disk" });
    assert.deepEqual(fate(OTHER, HEAD, HEAD), { state: "updated", write: OTHER, against: "disk" });
    assert.deepEqual(fate(OTHER, HEAD, null), { state: "new", write: OTHER, against: null });
  });

  test("with no picture at the revision, the file is the only reference", () => {
    assert.deepEqual(fate(DRIFT, null, DRIFT), { state: "unchanged", write: null, against: "disk" });
    assert.deepEqual(fate(DRIFT, null, HEAD), { state: "noise", write: null, against: "disk" });
    assert.deepEqual(fate(OTHER, null, HEAD), { state: "updated", write: OTHER, against: "disk" });
    assert.deepEqual(fate(OTHER, null, null), { state: "new", write: OTHER, against: null });
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
    // what differs between two commits, under the folder only: a commit outside it changes nothing
    fs.writeFileSync(path.join(repo, "tool.mjs"), "x\n");
    git("add", ".");
    git("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "y");
    const second = openRevision(docs, "HEAD").hash;
    assert.deepEqual([...changedBetween(docs, rev.hash, second)], []);
    fs.writeFileSync(path.join(docs, "two words", "a.png"), Buffer.from([1]));
    git("add", ".");
    git("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "z");
    assert.deepEqual([...changedBetween(docs, rev.hash, openRevision(docs, "HEAD").hash)], ["two words/a.png"]);
  });

  test("reads git's status of the working tree, sorted by path", () => {
    assert.deepEqual(parseStatus(" M b.txt\0 D a b.svg\0A  staged.txt\0?? e/z.txt\0D  gone.png\0AM n.txt\0"), [
      { path: "a b.svg", status: "deleted" },
      { path: "b.txt", status: "modified" },
      { path: "e/z.txt", status: "added" },
      { path: "gone.png", status: "deleted" },
      { path: "n.txt", status: "added" },
      { path: "staged.txt", status: "added" },
    ]);
    assert.deepEqual(parseStatus(""), []);
  });

  test("commits the paths named and nothing else, a new one added first and one removed as a deletion, without blocking", async (t) => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), "shot-commit-"));
    t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
    const git = (...args) => execFileSync("git", args, { cwd: repo, stdio: ["ignore", "pipe", "ignore"] }).toString();
    try {
      git("init", "-q");
    } catch {
      t.skip("no git");
      return;
    }
    // commitPaths runs git with the repository's own settings
    for (const [k, v] of [
      ["core.autocrlf", "false"],
      ["user.name", "t"],
      ["user.email", "t@t"],
      ["commit.gpgsign", "false"],
    ])
      git("config", k, v);
    const docs = path.join(repo, "docs");
    fs.mkdirSync(path.join(docs, "two words"), { recursive: true });
    fs.writeFileSync(path.join(docs, "two words", "a.png"), "a");
    fs.writeFileSync(path.join(docs, "a.svg"), "<svg/>\n");
    fs.writeFileSync(path.join(repo, "other.txt"), "o\n");
    git("add", ".");
    git("commit", "-q", "-m", "x");
    fs.writeFileSync(path.join(docs, "two words", "a.png"), "b");
    fs.rmSync(path.join(docs, "a.svg"));
    fs.mkdirSync(path.join(docs, "new"));
    fs.writeFileSync(path.join(docs, "new", "n.png"), "n");
    fs.writeFileSync(path.join(repo, "other.txt"), "changed\n");
    fs.writeFileSync(path.join(repo, "staged.txt"), "s\n");
    git("add", "staged.txt");

    const { top, changes } = workingChanges(docs);
    assert.equal(fs.realpathSync.native(top), fs.realpathSync.native(repo));
    assert.deepEqual(changes, [
      { path: "docs/a.svg", status: "deleted" },
      { path: "docs/new/n.png", status: "added" },
      { path: "docs/two words/a.png", status: "modified" },
      { path: "other.txt", status: "modified" },
      { path: "staged.txt", status: "added" },
    ]);
    // A timer set before the commit fires while git runs: the process is not held up.
    let ticked = false;
    setTimeout(() => {
      ticked = true;
    }, 0);
    const done = await commitPaths(docs, {
      paths: ["docs/a.svg", "docs/new/n.png", "docs/two words/a.png"],
      added: ["docs/new/n.png"],
      message: "Screenshots: 2 pictures",
    });
    assert.equal(ticked, true);
    assert.equal(done.hash, git("rev-parse", "HEAD").trim());
    assert.equal(done.short, done.hash.slice(0, 8));
    assert.equal(git("log", "-1", "--format=%B").trim(), "Screenshots: 2 pictures");
    assert.equal(
      git("show", "--name-status", "--format=", "HEAD"),
      "D\tdocs/a.svg\nA\tdocs/new/n.png\nM\tdocs/two words/a.png\n",
    );
    // what the commit did not name is as it was: changed, and staged
    assert.equal(git("status", "--porcelain"), " M other.txt\nA  staged.txt\n");
    await assert.rejects(commitPaths(docs, { paths: ["other.txt"], message: "" }), /^Error: git commit failed/);
    await assert.rejects(commitPaths(docs, { paths: [], message: "m" }), /no file to commit/);
  });
});

describe("the records a child writes among its lines (record-lines.mjs)", () => {
  test("reads a record of a kind it is told, and passes any other line on", () => {
    const line = recordLine("svgshot-result", { counts: { new: 2 }, why: "a b" });
    assert.equal(line, '@@svgshot-result {"counts":{"new":2},"why":"a b"}');
    assert.deepEqual(parseRecord(line, ["svgshot-result"]), {
      kind: "svgshot-result",
      value: { counts: { new: 2 }, why: "a b" },
    });
    assert.equal(parseRecord(line, ["shot-event"]), null);
    assert.equal(parseRecord("a/b.svg: unchanged", ["svgshot-result"]), null);
    assert.throws(() => parseRecord("@@svgshot-result {", ["svgshot-result"]), SyntaxError);
  });

  test("splits a stream into lines across its chunks, CRLF or LF, the last one too", async () => {
    const stream = new PassThrough();
    const lines = [];
    const records = [];
    readRecords(stream, ["k"], {
      onRecord: (kind, value) => records.push([kind, value]),
      onLine: (text) => lines.push(text),
    });
    const ended = new Promise((resolve) => stream.on("end", resolve));
    stream.write("one\r\ntw");
    stream.write('o\n@@k {"n":');
    stream.write("1}\n@@other 2\nlast");
    stream.end();
    await ended;
    assert.deepEqual(lines, ["one", "two", "@@other 2", "last"]);
    assert.deepEqual(records, [["k", { n: 1 }]]);
  });

  test("a child is stopped once by a line on its stdin, across chunks, and by nothing else", () => {
    const stream = new PassThrough();
    let stops = 0;
    onStop(stream, () => stops++);
    stream.write("go\nsto");
    assert.equal(stops, 0);
    stream.write("p\r\nstop\n");
    assert.equal(stops, 1);
    // a child started with a piped stdin is sent the line; one without is not
    const sent = [];
    sendStop({ stdin: { writable: true, write: (text) => sent.push(text) } });
    sendStop({ stdin: null });
    assert.deepEqual(sent, [`${STOP_LINE}\n`]);
  });
});

describe("a run's stage (shot-stage.mjs)", () => {
  test("names each picture's files, and keeps both parts of its verdict", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shot-stage-"));
    try {
      const out = "IDE/Images/Menu_File.light.png";
      const files = stagedFiles(dir, out);
      assert.equal(files.capture, path.join(dir, "pictures", "IDE", "Images", "Menu_File.light.png"));
      assert.equal(files.svg, path.join(dir, "pictures", "IDE", "Images", "Menu_File.light.svg"));
      assert.equal(files.verdict, path.join(dir, "verdicts", "IDE__Images__Menu_File.light.json"));
      assert.equal(files.pngStrength, path.join(dir, "maps", "IDE__Images__Menu_File.light.png.strength"));
      assert.deepEqual(writeVerdict(dir, out, "png", { state: "updated" }), {
        out,
        png: { state: "updated" },
        svg: null,
      });
      writeVerdict(dir, out, "svg", { faithful: true });
      writeVerdict(dir, "A/b.png", "png", { state: "new" });
      assert.deepEqual(readVerdicts(dir), [
        { out: "A/b.png", png: { state: "new" }, svg: null },
        { out, png: { state: "updated" }, svg: { faithful: true } },
      ]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a strength map is written and read back, and a file that is not one refused", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shot-stage-"));
    try {
      const map = paintMap(300, 200, blocks([10, 10, 40, 30]));
      const file = path.join(dir, "maps", "x.png.strength");
      writeStrength(file, map);
      assert.ok(fs.statSync(file).size < 1000);
      assert.deepEqual(readStrength(file), map);
      const bad = Buffer.from(fs.readFileSync(file));
      bad.writeUInt32BE(301, 0);
      fs.writeFileSync(file, bad);
      assert.throws(() => readStrength(file), /not 301 by 200/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("is one run's: never under docs, where git would take it, or in a folder that holds anything", () => {
    const docs = path.join(REPO_ROOT, "docs");
    assert.match(stageRefusal(path.join(docs, "stage"), [docs]), /is under/);
    assert.match(stageRefusal(path.join(REPO_ROOT, "scripts", "stage"), [docs]), /does not ignore/);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shot-stage-"));
    try {
      assert.equal(stageRefusal(path.join(dir, "new"), [docs]), null);
      assert.equal(stageRefusal(dir, [docs]), null);
      fs.writeFileSync(path.join(dir, "x"), "");
      assert.match(stageRefusal(dir, [docs]), /is not empty/);
      assert.match(stageRefusal(path.join(dir, "x"), [docs]), /is a file/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// A strength map `w` by `h` whose pixels, in reading order, are the [count, level] runs of
// `runs`, the rest 0.
function strengthMap(runs, w = 100, h = 100) {
  const data = new Uint8Array(w * h);
  let at = 0;
  for (const [n, level] of runs) {
    data.fill(level, at, at + n);
    at += n;
  }
  return { width: w, height: h, data };
}

// A strength map `w` by `h` with `level(x, y)` at each pixel (0, or undefined, for none).
function paintMap(w, h, level) {
  const data = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data[y * w + x] = level(x, y) ?? 0;
  return { width: w, height: h, data };
}

// A level of 200 inside each of `rects`, [x0, y0, x1, y1] (x1 and y1 not included).
const blocks =
  (...rects) =>
  (x, y) =>
    rects.some(([x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1) ? 200 : 0;

// Five strokes 2 pixels thick and 3 apart, 14 high: what a word of the IDE's text at 2x leaves.
const word = (x0, y0) => (x, y) => (y >= y0 && y < y0 + 14 && x >= x0 && x < x0 + 25 && (x - x0) % 5 < 2 ? 200 : 0);

describe("the strength map and its regions (shot-change.mjs)", () => {
  test("a strength map of two pictures is each pixel's largest difference of a channel", () => {
    const A = { width: 2, height: 1, rgba: new Uint8Array([10, 10, 10, 255, 0, 0, 0, 255]) };
    const B = { width: 2, height: 1, rgba: new Uint8Array([10, 40, 10, 255, 0, 0, 0, 200]) };
    assert.deepEqual([...strengthOf(A, B).data], [30, 55]);
    assert.throws(() => strengthOf(A, { width: 1, height: 2, rgba: A.rgba }), /two sizes/);
  });

  test("the share at a level counts the pixels at it or more, rounded as diffSvg rounds", () => {
    const m = strengthMap([
      [3, 8],
      [2, 32],
      [1, 96],
    ]);
    assert.deepEqual(
      [8, 32, 96, 97].map((level) => shareOff(m, { level })),
      [0.06, 0.03, 0.01, 0],
    );
    // a rectangle left out still counts in the whole
    assert.equal(shareOff(m, { level: 8, rects: [{ x0: 0, y0: 0, x1: 3, y1: 1 }] }), 0.03);
    assert.equal(shareOff(strengthMap([[1, 50]], 3, 1), { level: 1 }), 33.333);
  });

  test("a line up to 4 pixels thick leaves no core, a block keeps its middle", () => {
    const one = (level) => changeRegions(paintMap(60, 40, level), { level: 1 });
    // a fringe, a caret, a line 4 thick
    assert.deepEqual(one(blocks([5, 10, 55, 11])), [{ x0: 5, y0: 10, x1: 55, y1: 11, pixels: 50, core: 0 }]);
    assert.equal(one(blocks([20, 5, 22, 35]))[0].core, 0);
    assert.equal(one(blocks([5, 10, 55, 14]))[0].core, 0);
    // 5 thick is the thinnest that survives, as a line 1 pixel thick
    assert.equal(one(blocks([5, 10, 55, 15]))[0].core, 46);
    // a block 10 by 10 keeps 6 by 6
    assert.deepEqual(one(blocks([10, 10, 20, 20])), [{ x0: 10, y0: 10, x1: 20, y1: 20, pixels: 100, core: 36 }]);
  });

  test("closing joins a word's strokes into one block, which survives", () => {
    const m = paintMap(60, 40, word(10, 10));
    const open = changeRegions(m, { level: 1, close: 0 });
    assert.equal(open.length, 5);
    assert.ok(open.every((r) => r.core === 0));
    const closed = changeRegions(m, { level: 1 });
    assert.equal(closed.length, 1);
    // the box and the count are the changed pixels', the core the closed region's
    assert.deepEqual(closed[0], { x0: 10, y0: 10, x1: 32, y1: 24, pixels: 140, core: 180 });
    // a gap of 5 is not closed
    const apart = paintMap(60, 40, blocks([10, 10, 20, 20], [25, 10, 35, 20]));
    assert.equal(changeRegions(apart, { level: 1 }).length, 2);
    assert.equal(changeRegions(paintMap(60, 40, blocks([10, 10, 20, 20], [24, 10, 34, 20])), { level: 1 }).length, 1);
  });

  test("closing keeps every changed pixel, along the picture's edge too", () => {
    const m = paintMap(20, 20, blocks([0, 0, 20, 6]));
    const { mask, closed, core } = regionMasks(m, { level: 1 });
    for (let i = 0; i < mask.length; i++) assert.ok(closed[i] >= mask[i]);
    // outside the picture counts as unchanged: the erosion takes 2 rows from the edge
    assert.equal(
      core.reduce((a, b) => a + b, 0),
      16 * 2,
    );
    assert.deepEqual(changeRegions(m, { level: 1 }), [{ x0: 0, y0: 0, x1: 20, y1: 6, pixels: 120, core: 32 }]);
  });

  test("regions touching at a corner are one, and the most core comes first", () => {
    const corner = paintMap(20, 20, (x, y) => ((x === 3 && y === 3) || (x === 4 && y === 4) ? 99 : 0));
    assert.equal(changeRegions(corner, { level: 1, close: 0 }).length, 1);
    const two = paintMap(80, 40, blocks([2, 2, 4, 30], [40, 5, 60, 25]));
    assert.deepEqual(
      changeRegions(two, { level: 1 }).map((r) => [r.x0, r.core]),
      [
        [40, 256],
        [2, 0],
      ],
    );
  });

  test("counts only the pixels at the level, and leaves the rectangles out", () => {
    const m = paintMap(60, 40, (x, y) => (x >= 10 && x < 20 && y >= 10 && y < 20 ? (x < 15 ? 50 : 150) : 0));
    assert.deepEqual(
      changeRegions(m, { level: 100 }).map((r) => [r.x0, r.x1, r.pixels]),
      [[15, 20, 50]],
    );
    assert.deepEqual(changeRegions(m, { level: 1, rects: [{ x0: 0, y0: 0, x1: 60, y1: 40 }] }), []);
    assert.deepEqual(changeRegions(strengthMap([]), { level: 1 }), []);
  });
});

describe("which pictures need a look (shot-queue.mjs)", () => {
  const region = (core) => ({ x0: 0, y0: 0, x1: 10, y1: 10, pixels: 100, core });
  const taken = { state: "updated", by: "rule", earlier: null };

  test("a region survives with a core of SURVIVES pixels", () => {
    assert.deepEqual(surviving([region(SURVIVES), region(SURVIVES - 1), region(0)]), [region(SURVIVES)]);
  });

  test("a capture taken needs a look when nothing survives, or a word or two does", () => {
    assert.equal(pngLook(taken, []).why, "noise");
    assert.equal(pngLook(taken, [region(SURVIVES - 1), region(3)]).why, "noise");
    assert.equal(pngLook(taken, [region(WORD_CORE), region(SURVIVES)]).why, "small");
    assert.equal(pngLook(taken, [region(WORD_CORE + 1)]), null);
    assert.equal(pngLook(taken, [region(100), region(100), region(100)]), null);
    // a picture not taken, or decided by a review, does not
    for (const state of ["new", "noise", "restored", "unchanged", "dark", "too-far"])
      assert.equal(pngLook({ ...taken, state }, []), null);
    assert.equal(pngLook({ ...taken, by: "decision" }, []), null);
  });

  test("a capture kept as within noise needs a look when something survives", () => {
    for (const state of ["noise", "restored"]) {
      assert.equal(pngLook({ ...taken, state }, [region(SURVIVES)]).why, "faint");
      assert.equal(pngLook({ ...taken, state }, [region(SURVIVES - 1), region(3)]), null);
      assert.equal(pngLook({ ...taken, state, by: "decision" }, [region(5000)]), null);
    }
    for (const state of ["unchanged", "dark", "new"]) assert.equal(pngLook({ ...taken, state }, [region(5000)]), null);
    // a tint of 3 levels over a block, within noise, survives; the same over a 2-pixel line does not
    const rule = pngRule(null);
    const tint = paintMap(200, 100, (x, y) => (blocks([20, 20, 60, 40])(x, y) ? 3 : 0));
    assert.equal(pngLook({ ...taken, state: "noise" }, pngRegions(tint, rule)).why, "faint");
    const line = paintMap(200, 100, (x, y) => (blocks([20, 20, 120, 22])(x, y) ? 3 : 0));
    assert.equal(pngLook({ ...taken, state: "noise" }, pngRegions(line, rule)), null);
    // a review's decision about other bytes sends it back, whatever the regions
    assert.equal(pngLook({ ...taken, state: "noise", earlier: "new" }, [region(5000)]).why, "earlier");
  });

  test("an SVG needs a look when accepted with something surviving, or refused with nothing", () => {
    const rule = { faithful: true, by: "rule", earlier: null };
    assert.equal(svgLook(rule, [region(SURVIVES)]).why, "part");
    assert.equal(svgLook(rule, [region(SURVIVES - 1)]), null);
    assert.equal(svgLook({ ...rule, faithful: false }, [region(3)]).why, "fringe");
    assert.equal(svgLook({ ...rule, faithful: false }, [region(SURVIVES)]), null);
    assert.equal(svgLook({ ...rule, by: "decision" }, [region(5000)]), null);
    assert.equal(svgLook({ ...rule, earlier: false }, []).why, "earlier");
  });

  test("a capture is measured against the picture its verdict names, when there is one of its size", () => {
    // a picture 60 by 40, grey and opaque, with a block of 12 by 12 a level or many off
    const image = (level, w = 60, h = 40) => {
      const rgba = new Uint8Array(w * h * 4).fill(128);
      for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255;
      for (let y = 10; y < 22; y++)
        for (let x = 10; x < 22; x++) rgba.fill(128 + level, (y * w + x) * 4, (y * w + x) * 4 + 3);
      return encodePng({ width: w, height: h, rgba });
    };
    const base = image(0);
    const faint = reviewPicture({ state: "noise", by: "rule", earlier: null }, image(3), base);
    assert.equal(faint.strength.data.length, 60 * 40);
    assert.equal(faint.regions.length, 1);
    assert.equal(faint.look.why, "faint");
    // kept as within noise, a pixel counts from FAINT_LEVEL: a block one level off is a capture's noise
    assert.equal(FAINT_LEVEL, 2);
    const one = reviewPicture({ state: "restored", by: "rule", earlier: null }, image(1), base);
    assert.deepEqual([one.regions, one.look], [[], null]);
    assert.equal(reviewPicture({ state: "restored", by: "rule", earlier: null }, image(2), base).look.why, "faint");
    // a capture taken counts every pixel off: the same block one level off is a change, not noise
    assert.equal(reviewPicture(taken, image(1), base).regions.length, 1);
    // the same bytes: nothing to measure, and no region
    assert.deepEqual(reviewPicture({ ...taken, state: "unchanged" }, base, base), {
      strength: null,
      regions: [],
      look: null,
    });
    // a new picture, or one of another size: nothing measured, and no look but an earlier decision's
    assert.deepEqual(reviewPicture({ ...taken, state: "new" }, base, null), {
      strength: null,
      regions: null,
      look: null,
    });
    assert.equal(reviewPicture(taken, image(0, 61), base).look, null);
    assert.equal(reviewPicture({ ...taken, earlier: "old" }, image(0, 61), base).look.why, "earlier");
    // the picture's rectangles left out
    const left = reviewPicture({ state: "noise", by: "rule", earlier: null }, image(3), base, {
      png: { ignore: [[0, 0, 30, 30]] },
    });
    assert.deepEqual(left.regions, []);
    // an SVG's from its strength map
    const icon = paintMap(200, 100, blocks([20, 20, 52, 52]));
    assert.equal(reviewSvg({ faithful: true, by: "rule", earlier: null }, icon).look.why, "part");
  });

  test("from the strength maps: a word changed, a caret, a part missing and a fringe", () => {
    const rule = pngRule(null);
    assert.equal(pngLook(taken, pngRegions(paintMap(200, 100, word(20, 20)), rule)).why, "small");
    assert.equal(pngLook(taken, pngRegions(paintMap(200, 100, blocks([50, 10, 52, 40])), rule)).why, "noise");
    // a whole window a few levels off is a change, not noise
    assert.equal(
      pngLook(
        taken,
        pngRegions(
          paintMap(200, 100, () => 3),
          rule,
        ),
      ),
      null,
    );
    // the caret inside a rectangle left out leaves nothing at all
    const caret = paintMap(200, 100, (x, y) => blocks([50, 10, 52, 40])(x, y) || word(100, 20)(x, y));
    const left = pngRule({ png: { ignore: [[40, 0, 60, 100]] } });
    assert.equal(pngRegions(caret, left).length, 1);
    // an SVG at its bar's level: an icon missing survives, a fringe at 95 levels is not counted
    const icon = paintMap(200, 100, blocks([20, 20, 52, 52]));
    assert.equal(svgLook({ faithful: true, by: "rule", earlier: null }, svgRegions(icon)).why, "part");
    const faint = paintMap(200, 100, (x, y) => (blocks([20, 20, 52, 52])(x, y) ? 95 : 0));
    assert.deepEqual(svgRegions(faint), []);
    assert.equal(svgRegions(faint, { svg: { bar: { levels: 32 } } }).length, 1);
    assert.equal(
      svgLook({ faithful: false, by: "rule", earlier: null }, svgRegions(paintMap(200, 100, blocks([0, 50, 200, 51]))))
        .why,
      "fringe",
    );
  });
});

describe("the tool's folder as a picture shows it (shot-root.mjs)", () => {
  const REAL = "D:\\Work\\docs.v2\\.claude\\tbshots";
  const SHOWN = "C:\\tbshots";
  const pattern = rootPattern(REAL);
  const show = (text) => showRoot(text, pattern, SHOWN);

  test("the real folder becomes the shown name, whatever follows it", () => {
    assert.equal(show(`${REAL}\\Building\\project.twinproj`), "C:\\tbshots\\Building\\project.twinproj");
    assert.equal(show(`File: ${REAL}\\a.vbp, and ${REAL}\\b.vbp`), "File: C:\\tbshots\\a.vbp, and C:\\tbshots\\b.vbp");
    assert.equal(show(REAL), SHOWN);
  });

  test("in any case, with either slash, and with a doubled one", () => {
    assert.equal(show("d:\\work\\DOCS.V2\\.CLAUDE\\TBSHOTS\\x"), "C:\\tbshots\\x");
    assert.equal(show("D:/Work/docs.v2/.claude/tbshots/x"), "C:\\tbshots/x");
    assert.equal(show("D:\\\\Work\\\\docs.v2\\\\.claude\\\\tbshots\\\\x"), "C:\\tbshots\\\\x");
    assert.equal(show("D:/Work\\docs.v2/.claude\\tbshots"), SHOWN);
  });

  test("with no slash before a part that starts with a dot, as Markdown leaves it", () => {
    assert.equal(show("File: D:\\Work\\docs.v2.claude\\tbshots\\Ledger.vbp"), "File: C:\\tbshots\\Ledger.vbp");
    assert.equal(show("D:Work\\docs.v2\\.claude\\tbshots"), "D:Work\\docs.v2\\.claude\\tbshots");
  });

  test("a folder beside it, and text that only looks like it, stay as they are", () => {
    for (const text of [`${REAL}2\\x`, `${REAL}-old\\x`, "D:\\Work\\docsXv2\\.claude\\tbshots", "C:\\tbshots\\x", ""]) {
      assert.equal(show(text), text);
    }
  });

  test("the same pattern works twice running, as a global one must", () => {
    assert.equal(show(REAL), SHOWN);
    assert.equal(show(REAL), SHOWN);
    assert.equal(holdsRoot(REAL, pattern), true);
    assert.equal(holdsRoot(REAL, pattern), true);
  });

  test("the guard finds the real folder, and not in an embedded image's bytes", () => {
    assert.equal(holdsRoot(`<text>${REAL.toUpperCase()}\\x</text>`, pattern), true);
    assert.equal(holdsRoot("<text>C:\\tbshots\\x</text>", pattern), false);
    assert.equal(holdsRoot("data:image/png;base64,D+Work+docs/v2/tbshots==", rootPattern("D:/Work")), false);
  });

  test("the folder is in the checkout and the name shown is no real one", () => {
    assert.equal(path.relative(REPO_ROOT, TOOL_ROOT), path.join(".claude", "tbshots"));
    assert.equal(SHOWN_ROOT, SHOWN);
  });
});

describe("what a picture's two themes say (themeTextDifference)", () => {
  const OPTIONS = ["Project Name", "Option Explicit ON"];
  // What a pass read: blocks that show whole, and blocks an edge of the clip cuts.
  const read = (whole, cut = []) => ({ whole, cut });
  const differ = (dark, light, allow) => themeTextDifference(read(dark), read(light), allow);

  test("the same text is no difference", () => {
    assert.equal(differ(OPTIONS, [...OPTIONS]), null);
    assert.equal(differ([], []), null);
  });

  test("white space does not count, wherever a theme wraps the text", () => {
    assert.equal(differ(["More components..."], ["More\ncomponents..."]), null);
    assert.equal(differ(["More components..."], ["More compon ents. .."]), null);
    assert.equal(differ(["Project", "Name"], ["Project Name"]), null);
  });

  test("the same blocks in another order are no difference", () => {
    assert.equal(differ(["Alpha", "Beta"], ["Beta", "Alpha"]), null);
  });

  test("a real difference names the words on each side", () => {
    const include = ["Include Common Controls", "(adds a reference to WinNativeCommonCtls)"];
    const unicode = ["Unicode Common Control Notifications", "(affects manual WM_NOTIFY handling)"];
    assert.deepEqual(differ([...OPTIONS, ...include], [...OPTIONS, ...unicode]), {
      dark: ["Include", "Controls", "(adds", "a", "reference", "to", "WinNativeCommonCtls)"],
      light: ["Unicode", "Control", "Notifications", "(affects", "manual", "WM_NOTIFY", "handling)"],
    });
  });

  test("a word shown more often on one side counts", () => {
    assert.deepEqual(differ(["Sub Sub"], ["Sub"]), { dark: ["Sub"], light: [] });
  });

  test("a line an edge cuts in one theme answers for the same line whole in the other", () => {
    assert.equal(themeTextDifference(read(["24", "25"]), read(["24"], ["25"])), null);
    assert.equal(themeTextDifference(read(["24"], ["25"]), read(["24", "25"])), null);
  });

  test("a line an edge cuts in one theme and the other does not show is no difference", () => {
    assert.equal(themeTextDifference(read(["24"], ["25"]), read(["24"])), null);
    assert.equal(themeTextDifference(read(["24"]), read(["24"], ["price: 3"])), null);
  });

  test("a line whole in one theme and not shown in the other is a difference", () => {
    assert.deepEqual(themeTextDifference(read(["24", "25"], ["26"]), read(["24"], ["26"])), {
      dark: ["25"],
      light: [],
    });
  });

  test("an allowance takes out the words it names, each on its own side, and no others", () => {
    const allow = { dark: ["Dark"], light: ["Light"] };
    assert.equal(differ(["Colour Theme", "Dark"], ["Colour Theme", "Light"], allow), null);
    assert.deepEqual(differ(["Colour Theme", "Dark", "win32"], ["Colour Theme", "Light"], allow), {
      dark: ["win32"],
      light: [],
    });
    assert.deepEqual(differ(["Light"], ["Dark"], allow), { dark: ["Light"], light: ["Dark"] });
  });
});

describe("what becomes of a picture and its SVG (shot-policy.mjs, shot-apply.mjs)", () => {
  // A PNG's header with its size, and a tag that tells two of one size apart.
  const shot = (w, h, tag) => {
    const b = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b);
    b.write("IHDR", 12, "latin1");
    b.writeUInt32BE(w, 16);
    b.writeUInt32BE(h, 20);
    return Buffer.concat([b, Buffer.from(tag)]);
  };
  const DARK = shot(100, 50, "dark");
  const NEAR = shot(100, 50, "near"); // within noise of DARK
  const SHIFTED = shot(103, 50, "shifted"); // within noise of DARK, a few pixels wider
  const OTHER = shot(100, 50, "other"); // near nothing
  const isNear = (x) => x.equals(NEAR) || x.equals(SHIFTED);
  const near = (a, b) => a.equals(b) || (a.equals(DARK) && isNear(b)) || (b.equals(DARK) && isNear(a));
  const decide = (png, theme, dark, revision = null, disk = null) =>
    decidePicture({ png, theme, dark, revision, disk, near });

  test("a dark picture is pictureFate's, with its size", () => {
    assert.deepEqual(decide(OTHER, "dark", null, DARK, DARK), {
      state: "updated",
      write: OTHER,
      against: "disk",
      size: { w: 100, h: 50 },
      dark: null,
      by: "rule",
      earlier: null,
    });
    assert.deepEqual(decide(NEAR, "dark", null, DARK, OTHER).state, "restored");
  });

  test("a light picture is compared with the dark one first", () => {
    // the dark one's pixels: no light file
    assert.deepEqual(decide(NEAR, "light", DARK, null, OTHER), {
      state: "dark",
      write: null,
      against: "dark",
      size: { w: 100, h: 50 },
      dark: null,
      by: "rule",
      earlier: null,
    });
    // of another size, within the theme's slack: named, then judged
    const wider = decide(SHIFTED, "light", DARK);
    assert.equal(wider.state, "dark");
    assert.deepEqual(wider.dark, { w: 100, h: 50 });
    assert.deepEqual(decide(shot(103, 50, "x"), "light", DARK).state, "new");
    // beyond it: a failure, whatever the files hold
    const far = decide(shot(100 + SIZE_SLACK + 1, 50, "x"), "light", DARK, DARK, DARK);
    assert.deepEqual([far.state, far.write, far.against, far.dark], ["too-far", null, "dark", { w: 100, h: 50 }]);
    assert.equal(decide(shot(100 + SIZE_SLACK, 50, "x"), "light", DARK).state, "new");
    // with no dark picture, as a dark one
    assert.equal(decide(NEAR, "light", null, null, DARK).state, "noise");
  });

  test("an SVG is faithful below the bar, the default one or a picture's own", () => {
    // 10,000 pixels: SVG_FAITHFUL (0.25%) is 25 of them
    assert.deepEqual(decideSvg(strengthMap([[24, 96]])), { faithful: true, by: "rule", share: 0.24, earlier: null });
    assert.equal(decideSvg(strengthMap([[25, 255]])).faithful, false);
    assert.equal(decideSvg(strengthMap([[1000, 95]])).faithful, true);
    const wider = { svg: { bar: { share: 0.35 } } };
    assert.equal(decideSvg(strengthMap([[30, 96]]), { entry: wider }).faithful, true);
    // a bar at another level counts the pixels at that level or more, at any level
    const at32 = { svg: { bar: { levels: 32, share: 1 } } };
    assert.equal(decideSvg(strengthMap([[150, 40]]), { entry: at32 }).faithful, false);
    assert.equal(
      decideSvg(
        strengthMap([
          [50, 31],
          [50, 200],
        ]),
        { entry: at32 },
      ).share,
      0.5,
    );
    const at50 = { svg: { bar: { levels: 50, share: 0.5 } } };
    assert.equal(
      decideSvg(
        strengthMap([
          [30, 60],
          [100, 49],
        ]),
        { entry: at50 },
      ).faithful,
      true,
    );
    assert.equal(decideSvg(strengthMap([[60, 50]]), { entry: at50 }).faithful, false);
    // the pixels inside a rectangle left out are not counted: the first 100 are row 0
    const row0 = { svg: { ignore: [[0, 0, 100, 1]] } };
    assert.deepEqual(decideSvg(strengthMap([[100, 255]]), { entry: row0 }).share, 0);
    assert.deepEqual(decideSvg(strengthMap([[101, 255]]), { entry: row0 }).share, 0.01);
    assert.deepEqual(svgRule(null), { levels: 96, share: SVG_FAITHFUL, rects: [] });
    assert.deepEqual(svgRule(row0).rects, [{ x0: 0, y0: 0, x1: 100, y1: 1 }]);
  });

  test("a review's decision takes the rule's place for the bytes it was made on, and no others", () => {
    const decision = (keep, png) => ({ png: { decision: { keep, capture: hashOf(png) } } });
    // "old": within noise of what it would go back to; "new": unlike everything
    assert.equal(
      decidePicture({
        png: OTHER,
        theme: "dark",
        dark: null,
        revision: DARK,
        disk: DARK,
        near,
        entry: decision("old", OTHER),
      }).state,
      "noise",
    );
    const old = decidePicture({
      png: OTHER,
      theme: "dark",
      dark: null,
      revision: DARK,
      disk: NEAR,
      near,
      entry: decision("old", OTHER),
    });
    assert.deepEqual([old.state, old.write, old.by], ["restored", DARK, "decision"]);
    const fresh = decidePicture({
      png: NEAR,
      theme: "dark",
      dark: null,
      revision: DARK,
      disk: DARK,
      near,
      entry: decision("new", NEAR),
    });
    assert.deepEqual([fresh.state, fresh.write, fresh.by], ["updated", NEAR, "decision"]);
    // a light picture kept "new" is kept even with the dark one's pixels; "old" is still found to be the dark one
    assert.equal(
      decidePicture({
        png: NEAR,
        theme: "light",
        dark: DARK,
        revision: null,
        disk: null,
        near,
        entry: decision("new", NEAR),
      }).state,
      "new",
    );
    assert.equal(
      decidePicture({
        png: NEAR,
        theme: "light",
        dark: DARK,
        revision: null,
        disk: null,
        near,
        entry: decision("old", NEAR),
      }).state,
      "dark",
    );
    // a decision about other bytes: judged by the rule, and named
    const other = decidePicture({
      png: NEAR,
      theme: "dark",
      dark: null,
      revision: DARK,
      disk: DARK,
      near,
      entry: decision("new", OTHER),
    });
    assert.deepEqual([other.state, other.by, other.earlier], ["noise", "rule", "new"]);
    assert.equal(pngDecision(decision("old", OTHER), OTHER), "old");
    assert.equal(pngDecision(decision("old", OTHER), NEAR), null);
    assert.equal(earlierPngDecision(decision("old", OTHER), NEAR), "old");
    assert.equal(earlierPngDecision(decision("old", OTHER), OTHER), null);
    assert.equal(pngDecision(decision("old", OTHER), null), null);
    // an SVG's: the SVG's text, line endings aside, against the same PNG
    const svgEntry = { svg: { decision: { accept: true, svg: hashOf("<svg/>"), png: hashOf(OTHER) } } };
    assert.equal(svgDecision(svgEntry, "<svg/>", OTHER), true);
    assert.equal(svgDecision(svgEntry, "<svg/>", NEAR), null);
    assert.equal(svgDecision(svgEntry, "<svg />", OTHER), null);
    const half = strengthMap([[5000, 255]]);
    assert.deepEqual(decideSvg(half, { entry: svgEntry, svg: "<svg/>", png: OTHER }), {
      faithful: true,
      by: "decision",
      share: 50,
      earlier: null,
    });
    // the same SVG against another PNG: judged by the bar, the decision shown as an earlier one
    assert.deepEqual(decideSvg(half, { entry: svgEntry, svg: "<svg/>", png: NEAR }), {
      faithful: false,
      by: "rule",
      share: 50,
      earlier: true,
    });
    assert.equal(earlierSvgDecision(svgEntry, "<svg />", OTHER), true);
    assert.equal(earlierSvgDecision(svgEntry, "<svg/>", OTHER), null);
    assert.equal(earlierSvgDecision(null, "<svg/>", OTHER), null);
    assert.equal(decideSvg(half, { svg: "<svg/>", png: OTHER }).earlier, null);
  });

  test("an allowance changes the noise rule the picture is judged with", () => {
    assert.deepEqual(pngRule(null), { levels: NOISE_LEVELS, share: NOISE_SHARE, rects: [] });
    const entry = { png: { noise: { levels: 40, share: 1.5 }, ignore: [[1, 2, 30, 40]] } };
    assert.deepEqual(pngRule(entry), { levels: 40, share: 0.015, rects: [{ x0: 1, y0: 2, x1: 30, y1: 40 }] });
    // decidePicture hands the rule to near
    const seen = [];
    const spy = (_a, _b, rule) => {
      seen.push(rule);
      return false;
    };
    decidePicture({ png: OTHER, theme: "dark", dark: null, revision: DARK, disk: DARK, near: spy, entry });
    assert.ok(seen.length > 0 && seen.every((r) => r.levels === 40 && r.rects.length === 1));
    // --cleanup: the decision about the file's bytes, else the rule
    const rule = (_a, _b, r) => r.levels === 40;
    assert.equal(cleanupResets({ before: DARK, after: OTHER, near: rule, entry }), true);
    assert.equal(cleanupResets({ before: DARK, after: OTHER, near: rule, entry: null }), false);
    const kept = { ...entry, png: { ...entry.png, decision: { keep: "new", capture: hashOf(OTHER) } } };
    assert.equal(cleanupResets({ before: DARK, after: OTHER, near: rule, entry: kept }), false);
  });

  test("writes a verdict into the folder, and removes what is not kept", (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shot-apply-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const at = (out) => path.join(root, out);
    // a new picture in a folder not there yet; a picture within noise writes nothing
    assert.deepEqual(applyPicture(root, "a/X.png", { state: "new", write: OTHER }, null), {
      removed: false,
      svg: null,
    });
    assert.ok(fs.readFileSync(at("a/X.png")).equals(OTHER));
    applyPicture(root, "a/X.png", { state: "noise", write: null }, null);
    assert.ok(fs.readFileSync(at("a/X.png")).equals(OTHER));
    // a light picture that is the dark one: its file removed, if there
    fs.writeFileSync(at("a/X.light.png"), NEAR);
    assert.equal(applyPicture(root, "a/X.light.png", { state: "dark", write: null }, null).removed, true);
    assert.equal(fs.existsSync(at("a/X.light.png")), false);
    assert.equal(applyPicture(root, "a/X.light.png", { state: "dark", write: null }, null).removed, false);
    // an SVG: written, the same but for a checkout's last line ending, changed, then dropped
    assert.equal(applySvg(root, "a/X.svg", "<svg/>"), "new");
    fs.writeFileSync(at("a/X.svg"), "<svg/>\r\n");
    assert.equal(applySvg(root, "a/X.svg", "<svg/>\n"), "unchanged");
    assert.equal(applySvg(root, "a/X.svg", "<svg>x</svg>"), "updated");
    assert.equal(applySvg(root, "a/X.svg", null), "removed");
    assert.equal(applySvg(root, "a/X.svg", null), "not written");
    // a picture dropped: its PNG, its SVG and its bundle, the other theme's bundle kept
    const bundles = path.join(root, "bundles");
    writeBundle(bundles, "a/X.png", { v: 1 }, OTHER, []);
    writeBundle(bundles, "a/X.light.png", { v: 2 }, OTHER, []);
    fs.writeFileSync(at("a/X.light.png"), OTHER);
    fs.writeFileSync(at("a/X.light.svg"), "<svg/>");
    assert.equal(dropPicture(root, "a/X.light.png", bundles), true);
    assert.equal(fs.existsSync(at("a/X.light.png")) || fs.existsSync(at("a/X.light.svg")), false);
    assert.equal(readBundle(bundles, "a/X.light.png"), null);
    assert.equal(readBundle(bundles, "a/X.png").v, 1);
    assert.equal(dropPicture(root, "a/X.light.png", null), false);
    // a light picture that is the dark one, with --svg: its SVG and bundle go with it
    writeBundle(bundles, "a/X.light.png", { v: 3 }, OTHER, []);
    fs.writeFileSync(at("a/X.light.png"), NEAR);
    fs.writeFileSync(at("a/X.light.svg"), "<svg/>");
    const darkVerdict = { state: "dark", write: null };
    assert.equal(
      applyPicture(root, "a/X.light.png", darkVerdict, null, { dryRun: true, svg: true, bundlesRoot: bundles }).removed,
      true,
    );
    assert.ok(fs.existsSync(at("a/X.light.svg")));
    assert.equal(
      applyPicture(root, "a/X.light.png", darkVerdict, null, { svg: true, bundlesRoot: bundles }).removed,
      true,
    );
    assert.equal(fs.existsSync(at("a/X.light.png")) || fs.existsSync(at("a/X.light.svg")), false);
    assert.equal(readBundle(bundles, "a/X.light.png"), null);
    // a once picture's light file goes with its SVG, --svg or not
    fs.writeFileSync(at("a/X.light.png"), NEAR);
    fs.writeFileSync(at("a/X.light.svg"), "<svg/>");
    assert.equal(applyPicture(root, "a/X.light.png", { state: "once", write: null }, null).removed, true);
    assert.equal(fs.existsSync(at("a/X.light.svg")), false);
  });

  test("an SVG is judged with its PNG when the PNG is written, there is no SVG to keep, or a review accepted it", () => {
    assert.equal(svgFollowsPng({ written: true, svgOnDisk: true }), true);
    assert.equal(svgFollowsPng({ written: false, svgOnDisk: false }), true);
    assert.equal(svgFollowsPng({ written: false, svgOnDisk: true }), false);
    assert.equal(svgFollowsPng({ written: false, svgOnDisk: true, accepted: true }), true);
    assert.equal(svgFollowsPng({ written: false, svgOnDisk: true, stale: { retake: "there is no bundle" } }), true);
    assert.equal(svgFollowsPng({ written: false, svgOnDisk: true, stale: null }), false);
  });

  test("the bundle of an SVG that stays goes into the cache when the SVG is the file's, line endings aside", () => {
    assert.equal(bundleFollowsSvg({ svg: "<svg>a</svg>\n", svgOnDisk: "<svg>a</svg>\r\n" }), true);
    assert.equal(bundleFollowsSvg({ svg: "<svg>a</svg>\n", svgOnDisk: "<svg>b</svg>\n" }), false);
    assert.equal(bundleFollowsSvg({ svg: "<svg>a</svg>\n", svgOnDisk: null }), false);
  });

  test("keeps what a picture held, and puts it back, its build and bundle included", (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shot-hold-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const docs = path.join(root, "docs");
    const bundles = path.join(root, "bundles");
    const held = path.join(root, "held");
    const at = (out) => path.join(docs, out);
    fs.mkdirSync(path.join(docs, "a"), { recursive: true });
    fs.writeFileSync(at("a/X.png"), DARK);
    fs.writeFileSync(at("a/X.svg"), "<svg>old</svg>\r\n");
    writeBundle(bundles, "a/X.png", { v: 1 }, DARK, []);
    writeBundle(bundles, "a/X.light.png", { v: 2 }, DARK, []);
    holdPicture(held, docs, "a/X.png", bundles, 1010);
    holdPicture(held, docs, "a/Y.png", bundles, null);
    const kept = heldOf(held, "a/X.png");
    assert.deepEqual([kept.png, kept.svg, kept.bundle, kept.build], [true, true, true, 1010]);
    assert.ok(kept.pngBytes.equals(DARK));
    assert.deepEqual([heldOf(held, "a/Y.png").png, heldOf(held, "a/Z.png")], [false, null]);
    // the picture changed, its SVG removed, its bundle replaced; and a picture added
    fs.writeFileSync(at("a/X.png"), OTHER);
    fs.rmSync(at("a/X.svg"));
    writeBundle(bundles, "a/X.png", { v: 9 }, OTHER, []);
    fs.writeFileSync(at("a/Y.png"), OTHER);
    assert.equal(unholdPicture(held, docs, "a/X.png", bundles), 1010);
    assert.ok(fs.readFileSync(at("a/X.png")).equals(DARK));
    assert.equal(fs.readFileSync(at("a/X.svg"), "utf8"), "<svg>old</svg>\r\n");
    assert.deepEqual([readBundle(bundles, "a/X.png").v, readBundle(bundles, "a/X.light.png").v], [1, 2]);
    assert.equal(unholdPicture(held, docs, "a/Y.png", bundles), null);
    assert.equal(fs.existsSync(at("a/Y.png")), false);
    assert.equal(unholdPicture(held, docs, "a/Z.png", bundles), undefined);
    // a bundle copied naming another PNG; one copied from where there is none removes it
    copyBundle(bundles, path.join(root, "b2"), "a/X.png", OTHER);
    assert.equal(readBundle(path.join(root, "b2"), "a/X.png").png, pngHash(OTHER));
    assert.equal(copyBundle(path.join(root, "none"), bundles, "a/X.light.png"), false);
    assert.equal(readBundle(bundles, "a/X.light.png"), null);
    assert.equal(readBundle(bundles, "a/X.png").v, 1);
  });

  test("puts pictures back as a revision has them, each with its SVG", (t) => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), "shot-apply-git-"));
    t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
    const git = (...args) => execFileSync("git", args, { cwd: repo, stdio: ["ignore", "pipe", "ignore"] });
    try {
      git("init", "-q");
    } catch {
      t.skip("no git");
      return;
    }
    git("config", "core.autocrlf", "false");
    const docs = path.join(repo, "docs");
    const at = (out) => path.join(docs, out);
    fs.mkdirSync(docs);
    // a.png has an SVG at the revision, b.png has none
    fs.writeFileSync(at("a.png"), DARK);
    fs.writeFileSync(at("a.svg"), "<svg/>\n");
    fs.writeFileSync(at("b.png"), DARK);
    git("add", ".");
    git("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "x");
    const rev = openRevision(docs, "HEAD");
    // a.png drifted and its SVG changed; b.png drifted and gained an SVG
    fs.writeFileSync(at("a.png"), NEAR);
    fs.writeFileSync(at("a.svg"), "<svg>x</svg>\n");
    fs.writeFileSync(at("b.png"), NEAR);
    fs.writeFileSync(at("b.svg"), "<svg/>\n");
    const expected = new Map([
      ["a.png", { fate: "write", atRevision: true }],
      ["b.png", { fate: "remove", atRevision: false }],
    ]);
    // a dry run says what it would do and writes nothing
    assert.deepEqual(restorePictures(docs, rev, ["a.png", "b.png"], { dryRun: true }), expected);
    assert.ok(fs.readFileSync(at("a.png")).equals(NEAR));
    assert.equal(fs.existsSync(at("b.svg")), true);
    assert.deepEqual(restorePictures(docs, rev, ["a.png", "b.png"]), expected);
    assert.equal(git("status", "--porcelain").toString(), "");
    // through applyPicture, for a capture it put back
    fs.writeFileSync(at("a.png"), NEAR);
    assert.deepEqual(applyPicture(docs, "a.png", { state: "restored", write: DARK }, rev), {
      removed: false,
      svg: { fate: "keep", atRevision: true },
    });
    assert.equal(git("status", "--porcelain").toString(), "");
    assert.throws(() => restorePictures(docs, rev, ["none.png"]), /has no none\.png/);
  });
});

describe("the screenshot manifest (shot-manifest.mjs)", () => {
  const H = "a".repeat(40);
  const full = {
    format: 1,
    pictures: {
      "IDE/Images/B.png": { build: 1010 },
      "IDE/Images/A.light.png": {
        svg: { decision: { accept: true, svg: H, png: H }, ignore: [[0, 0, 8, 8]], bar: { levels: 50, share: 0.35 } },
        png: { decision: { keep: "old", capture: H }, ignore: [[812, 40, 900, 64]], noise: { share: 0.5 } },
        build: 1501,
      },
    },
  };

  test("is written by path, each entry's keys in order, a rectangle on one line, and read back the same", () => {
    const text = manifestText(full);
    assert.equal(
      text,
      `{
  "format": 1,
  "pictures": {
    "IDE/Images/A.light.png": {
      "build": 1501,
      "png": {
        "noise": {
          "share": 0.5
        },
        "ignore": [
          [812, 40, 900, 64]
        ],
        "decision": {
          "keep": "old",
          "capture": "${H}"
        }
      },
      "svg": {
        "bar": {
          "levels": 50,
          "share": 0.35
        },
        "ignore": [
          [0, 0, 8, 8]
        ],
        "decision": {
          "accept": true,
          "svg": "${H}",
          "png": "${H}"
        }
      }
    },
    "IDE/Images/B.png": {
      "build": 1010
    }
  }
}
`,
    );
    assert.equal(manifestText(parseManifest(text)), text);
    assert.equal(manifestText(parseManifest(text.replace(/\n/g, "\r\n"))), text);
    // an entry left with nothing in it goes
    assert.equal(
      manifestText({ format: 1, pictures: { "a.png": { png: { ignore: [] } } } }),
      manifestText({ format: 1, pictures: {} }),
    );
  });

  test("refuses what it cannot read, naming the key", () => {
    const bad = (pictures, why) =>
      assert.throws(() => parseManifest(JSON.stringify({ format: 1, pictures }), "m"), why);
    assert.throws(() => parseManifest("{", "m"), /m is not JSON/);
    assert.throws(() => parseManifest('{"format": 2, "pictures": {}}', "m"), /m is of format 2, not 1/);
    assert.throws(() => parseManifest('{"format": 1, "extra": 0}', "m"), /m has an unknown key, extra/);
    bad({ "a\\b.png": {} }, /not a path under docs with forward slashes/);
    bad({ "../a.png": {} }, /not a path under docs/);
    bad({ "a.jpg": {} }, /not a path under docs/);
    bad({ "a.png": { build: 0 } }, /m's a\.png\.build is not a build number/);
    bad({ "a.png": { png: { noise: { levels: 300 } } } }, /png\.noise\.levels/);
    bad({ "a.png": { png: { noise: { share: 101 } } } }, /png\.noise\.share is not a percentage/);
    bad({ "a.png": { png: { ignore: [[5, 0, 5, 9]] } } }, /png\.ignore\[0\] is not \[x0, y0, x1, y1\]/);
    bad({ "a.png": { png: { decision: { keep: "both", capture: H } } } }, /png\.decision\.keep/);
    bad({ "a.png": { png: { decision: { keep: "old", capture: "x" } } } }, /png\.decision\.capture is not a SHA-1/);
    bad({ "a.png": { svg: { bar: { levels: 0 } } } }, /svg\.bar\.levels is not a number of grey levels, 1 to 255/);
    bad({ "a.png": { svg: { bar: { levels: 32.5 } } } }, /svg\.bar\.levels/);
    bad({ "a.png": { svg: { ignore: [[0, 9, 4, 3]] } } }, /svg\.ignore\[0\] is not \[x0, y0, x1, y1\]/);
    bad({ "a.png": { svg: { other: [] } } }, /svg has an unknown key, other/);
    bad({ "a.png": { svg: { decision: { accept: "yes", svg: H, png: H } } } }, /svg\.decision\.accept/);
  });

  test("records a build, and is saved only when what it holds changes", (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shot-manifest-"));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const file = path.join(dir, "manifest.json");
    const m = openManifest(file);
    assert.equal(m.entry("a.png"), null);
    assert.equal(m.save(), true); // a new file, with no pictures
    assert.equal(m.save(), false);
    m.setBuild("a.png", 1010);
    m.setBuild("b.png", null); // a build that could not be read records nothing
    assert.equal(m.save(), true);
    assert.deepEqual(openManifest(file).entry("a.png"), { build: 1010 });
    // a CRLF checkout of the same text is the same
    fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace(/\n/g, "\r\n"));
    const again = openManifest(file);
    assert.equal(again.save(), false);
    // ... and a CRLF file stays CRLF when it is written
    again.setBuild("a.png", 1034);
    assert.equal(again.save(), true);
    const crlf = fs.readFileSync(file, "utf8");
    assert.equal(crlf, manifestText({ format: 1, pictures: { "a.png": { build: 1034 } } }).replace(/\n/g, "\r\n"));
    // a change made and taken back leaves it as it was, byte for byte
    const back = openManifest(file);
    back.setBuild("a.png", 1010);
    assert.equal(back.save(), true);
    back.setBuild("a.png", 1034);
    assert.equal(back.save(), true);
    assert.equal(fs.readFileSync(file, "utf8"), crlf);
    // an LF file stays LF
    fs.writeFileSync(file, crlf.replace(/\r\n/g, "\n"));
    const lf = openManifest(file);
    lf.clearBuild("a.png");
    lf.clearBuild("c.png");
    assert.equal(lf.save(), true);
    assert.equal(fs.readFileSync(file, "utf8"), manifestText({ format: 1, pictures: {} }));
    assert.deepEqual(fs.readdirSync(dir), ["manifest.json"]);
  });

  test("the repository's own manifest reads", () => {
    const m = openManifest();
    assert.equal(m.text(), fs.readFileSync(m.file, "utf8").replace(/\r\n/g, "\n"));
  });
});

describe("the Chrome extension, with no Chrome", () => {
  const FOLDER = path.join(REPO_ROOT, "scripts", "svgshot");

  test("what it loads needs no Node, and is inside its folder", () => {
    const modules = extensionModules(FOLDER);
    assert.ok(modules.has(path.join(FOLDER, "capture.mjs")), "the extension runs capture.mjs itself");
    assert.ok(modules.has(path.join(FOLDER, "annotate.mjs")));
    for (const [file, names] of modules) {
      for (const name of names) {
        assert.ok(name.startsWith("."), `${file} imports ${name}, which no extension page can`);
        const target = path.resolve(path.dirname(file), name);
        assert.ok(target.startsWith(FOLDER + path.sep), `${file} imports ${name}, outside the extension's folder`);
      }
    }
  });

  // A small extension in the folder `dir`: what it loads, and one module of the converter's that it does not.
  function fakeExtension(dir) {
    const write = (name, text) => {
      fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
      fs.writeFileSync(path.join(dir, name), text);
    };
    write(
      "manifest.json",
      JSON.stringify({
        name: "svgshot",
        side_panel: { default_path: "chrome/panel.html" },
        background: { service_worker: "chrome/background.mjs" },
      }),
    );
    write(
      "chrome/panel.html",
      '<link rel="stylesheet" href="panel.css" /><script type="module" src="panel.mjs"></script>',
    );
    write("chrome/panel.css", "body {}");
    write("chrome/panel.mjs", 'import { a } from "../shared.mjs";\nconsole.log(a);\n');
    write("chrome/background.mjs", "");
    write("shared.mjs", "export const a = 1;\n");
    write("chromeshot.mjs", "// Node only\n");
    write("private.json", '{"words":[]}');
  }

  test("finds what Chrome needs by following its manifest", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "extension-test-"));
    try {
      fakeExtension(dir);
      assert.deepEqual(extensionFiles(dir), [
        "chrome/background.mjs",
        "chrome/panel.css",
        "chrome/panel.html",
        "chrome/panel.mjs",
        "manifest.json",
        "shared.mjs",
      ]);
      // The real one: its pages' modules and its style sheet, and none of the converter's Node tools.
      const real = extensionFiles(FOLDER);
      for (const file of ["manifest.json", "chrome/panel.css", "chrome/panel.mjs", "capture.mjs", "chrome/shots.mjs"])
        assert.ok(real.includes(file), file);
      assert.ok(!real.includes("chromeshot.mjs"));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("is kept up to date in a folder of its own, and leaves alone what is not it", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "extension-test-"));
    try {
      const source = path.join(root, "source");
      const target = path.join(root, "target");
      fakeExtension(source);
      const first = installExtension(target, { source });
      assert.equal(first.first, true);
      assert.match(extensionStep(first), /Load unpacked and choose .*target/);
      assert.ok(first.changed.includes("private.json"));
      assert.ok(!fs.existsSync(path.join(target, "chromeshot.mjs")));
      // Nothing to do a second time, and so nothing to ask of the person.
      const again = installExtension(target, { source });
      assert.deepEqual([again.changed, again.first], [[], false]);
      assert.equal(extensionStep(again), null);
      // What changed is copied, what went is removed, and the panel's note stays.
      fs.writeFileSync(path.join(target, "chrome", "panel.mjs"), "stale");
      fs.writeFileSync(path.join(target, "chrome", "gone.mjs"), "old");
      tellPanel(target, "run-workflow");
      const fixed = installExtension(target, { source });
      assert.deepEqual(fixed.changed.sort(), ["chrome/gone.mjs", "chrome/panel.mjs"]);
      assert.match(extensionStep(fixed), /press reload/);
      assert.ok(!fs.existsSync(path.join(target, "chrome", "gone.mjs")));
      assert.deepEqual(JSON.parse(fs.readFileSync(path.join(target, "next.json"), "utf8")), { shot: "run-workflow" });
      // A checkout with no word list leaves the one that is there.
      fs.rmSync(path.join(source, "private.json"));
      installExtension(target, { source });
      assert.ok(fs.existsSync(path.join(target, "private.json")));
      // A folder that holds anything else is not written to, and nothing in it is deleted.
      const other = path.join(root, "other");
      fs.mkdirSync(other);
      fs.writeFileSync(path.join(other, "mine.txt"), "keep");
      assert.throws(() => installExtension(other, { source }), /not the extension/);
      assert.deepEqual(fs.readdirSync(other), ["mine.txt"]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("notices a capture saved from now on, and not one that was there", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "capture-watch-"));
    try {
      const name = (n) => path.join(dir, `${n}.capture.json.gz`);
      fs.writeFileSync(name("old"), "x");
      fs.writeFileSync(path.join(dir, "old.log.txt"), "not a capture");
      const watcher = captureWatcher(dir);
      const stop = new AbortController();
      const waiting = watcher.next(stop.signal);
      fs.writeFileSync(name("new"), "x");
      assert.equal(await waiting, name("new"));
      // The same name saved again is a new capture.
      const later = watcher.next(stop.signal);
      fs.utimesSync(name("new"), new Date(), new Date(Date.now() + 5000));
      assert.equal(await later, name("new"));
      const none = watcher.next(stop.signal);
      stop.abort();
      assert.equal(await none, null);
      // A folder the browser has yet to make is no fault.
      const nowhere = new AbortController();
      nowhere.abort();
      assert.equal(await captureWatcher(path.join(dir, "not-yet")).next(nowhere.signal), null);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("what a take is refused for: what a look at the picture finds late", () => {
    const shot = { url: "https://github.com/twinbasic/documentation/pulls" };
    const good = {
      area: "viewport",
      marked: { x: 0, y: 0, width: 1, height: 1 },
      url: "https://github.com/twinbasic/documentation/pull/263",
      pictures: [{ theme: "dark" }, { theme: "light" }],
    };
    assert.equal(takeRefusal(good, shot), null);
    assert.match(takeRefusal({ ...good, area: "drag" }, shot), /dragged rectangle/);
    assert.match(takeRefusal({ ...good, marked: null }, shot), /no marks/);
    assert.match(takeRefusal({ ...good, pictures: [{ theme: "light" }] }, shot), /only the light theme/);
    assert.match(takeRefusal({ ...good, url: "https://github.com/someone/fork/pull/1" }, shot), /another repository/);
    // A name that only starts the same is another repository.
    const close = { ...good, url: "https://github.com/twinbasic/documentation2/pull/1" };
    assert.match(takeRefusal(close, shot), /another repository/);
  });

  test("names the page each picture is taken on, under the repository", () => {
    for (const shot of SHOTS) assert.match(shot.url, /^https:\/\/github\.com\/twinbasic\/documentation\//, shot.name);
    assert.equal(browserShot("Documentation/Images/run-workflow.light.png")?.name, "run-workflow");
    assert.equal(browserShot("IDE/Images/x.png"), null);
  });

  test("its folder holds what the manifest names, and nothing Chrome refuses", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(FOLDER, "manifest.json"), "utf8"));
    assert.equal(manifest.manifest_version, 3);
    assert.deepEqual([...manifest.permissions].sort(), ["debugger", "downloads", "sidePanel"]);
    assert.equal(manifest.host_permissions, undefined);
    for (const file of [manifest.background.service_worker, manifest.side_panel.default_path])
      assert.ok(fs.existsSync(path.join(FOLDER, file)), file);
    // Chrome will not load a folder with a name of its own at the top that starts with _.
    assert.deepEqual(
      fs.readdirSync(FOLDER).filter((n) => n.startsWith("_")),
      [],
    );
  });

  test("lays a page out at 1x and draws it at 2x, on a display of any scale", () => {
    const at = (dpr, zoom, width = 1200, height = 900, pageWidth = null) =>
      layoutPlan({ dpr, zoom, width, height, pageWidth });
    assert.deepEqual(at(1, 1), {
      display: 1,
      zoom: 1,
      metrics: { width: 1200, height: 900, deviceScaleFactor: 2, mobile: false },
    });
    // At 150% the zoom brings the layout to 1x, and the emulated size is in the zoomed px.
    assert.deepEqual(at(1.5, 1), {
      display: 1.5,
      zoom: 2 / 3,
      metrics: { width: 800, height: 600, deviceScaleFactor: 3, mobile: false },
    });
    assert.equal(at(1.25, 1).zoom, 0.8);
    assert.equal(at(1.25, 1).metrics.deviceScaleFactor, 2.5);
    // The tab's own zoom is no part of the display's scale, and is replaced.
    assert.equal(at(1.1, 1.1).display, 1);
    assert.equal(at(1.1, 1.1).zoom, 1);
    assert.equal(at(1.5, 1, 900, 600, 1280).metrics.width, 853);
  });

  test("reads a capture's size from its PNG, and saves a capture as chromeshot.mjs reads it", async () => {
    const png = encodePng({ width: 7, height: 5, rgba: new Uint8Array(140) });
    assert.deepEqual(pngSizeOf(png.toString("base64")), [7, 5]);
    const capture = { format: 1, out: "Documentation/Images/x.png", pictures: [] };
    const blob = await captureBlob(capture);
    assert.deepEqual(JSON.parse(gunzipSync(Buffer.from(await blob.arrayBuffer())).toString("utf8")), capture);
    assert.equal(captureName(capture.out), "svgshot/Documentation__Images__x.capture.json.gz");
    assert.equal(logName(capture.out), "svgshot/Documentation__Images__x.log.txt");
  });

  test("talks to a tab as lib/tb-cdp.mjs talks to the IDE", async () => {
    const sent = [];
    const answers = { "Runtime.evaluate": { result: { value: 7 } }, "Page.enable": undefined };
    const detached = [];
    const was = globalThis.chrome;
    globalThis.chrome = {
      debugger: {
        attach: async (target, version) => sent.push(["attach", target, version]),
        detach: async (target) => detached.push(target),
        sendCommand: async (_target, method, params) => {
          sent.push([method, params]);
          if (method === "Page.fail") throw new Error("no such thing");
          return answers[method];
        },
      },
    };
    try {
      const conn = await attachDebugger(5);
      assert.deepEqual(sent[0], ["attach", { tabId: 5 }, "1.3"]);
      // A member that is undefined is left out, as on a socket; an answer of nothing is an empty one.
      assert.deepEqual(await conn.send("Page.enable", { contextId: undefined, a: 1 }), {});
      assert.deepEqual(sent[1], ["Page.enable", { a: 1 }]);
      assert.equal(await conn.evaluate("1"), 7);
      assert.deepEqual(sent[2][1], { expression: "1", returnByValue: true, awaitPromise: false });
      await assert.rejects(conn.send("Page.fail"), /^Error: Page\.fail: no such thing$/);
      answers["Runtime.evaluate"] = { exceptionDetails: { exception: { description: "ReferenceError: x" } } };
      await assert.rejects(conn.evaluate("x"), /ReferenceError: x/);
      await conn.detach();
      assert.deepEqual(detached, [{ tabId: 5 }]);
    } finally {
      globalThis.chrome = was;
    }
  });

  test("keeps a clip inside the window, since Chrome draws one left of the page at half size", () => {
    const window = { x: 0, y: 700, width: 1000, height: 800 };
    const area = { x: 10, y: 720, width: 300, height: 100 };
    assert.deepEqual(unionWithin(area, { x: -15, y: 690, width: 40, height: 40.5 }, window), {
      x: 0,
      y: 700,
      width: 310,
      height: 120,
    });
    assert.deepEqual(unionWithin(area, { x: 950, y: 1490, width: 100, height: 100 }, window), {
      x: 10,
      y: 720,
      width: 990,
      height: 780,
    });
  });

  test("puts a mark on whole CSS px, as the page snaps the element it stands for", () => {
    assert.deepEqual(wholeBox({ x: 10.25, y: 195.25, width: 121.75, height: 32.5 }), {
      x: 10,
      y: 195,
      width: 122,
      height: 33,
    });
    assert.deepEqual(wholeBox({ x: 4, y: 8, width: 15, height: 16 }), { x: 4, y: 8, width: 15, height: 16 });
  });

  test("rings what is small and boxes what is tall, whose ring would be a great ellipse", () => {
    const mark = { n: "a" };
    const types = (height) => markPrimitives(mark, { css: "x" }, { height }).map((p) => p.type);
    assert.deepEqual(types(32), ["ring", "badge"]);
    assert.deepEqual(types(48), ["ring", "badge"]);
    assert.deepEqual(types(270), ["box", "badge"]);
    assert.equal(markPrimitives({ n: "a", side: "right" }, { css: "x" }, { height: 9 })[1].side, "right");
  });

  test("finds an anchor as the page does, in the part of CSS the table uses", () => {
    const element = (name, attrs, parent = null) => ({ type: 1, name, attrs, parent, layouts: [], children: [] });
    const root = element("DIV", { id: "__primerPortalRoot__" });
    const card = element("DIV", { class: "Overlay__e1QdMe big", "data-component": "PH_Actions" }, root);
    const button = element("BUTTON", { "data-testid": "go" }, card);
    assert.equal(matches(button, "button"), true);
    assert.equal(matches(button, "a, button"), true);
    assert.equal(matches(button, "a"), false);
    assert.equal(matches(card, ".big"), true);
    assert.equal(matches(card, ".bi"), false);
    assert.equal(matches(card, "div.big"), true);
    assert.equal(matches(card, "[class*=Overlay]"), true);
    assert.equal(matches(card, "[class^=Overlay]"), true);
    assert.equal(matches(card, "[class^=big]"), false);
    assert.equal(matches(button, "[data-testid=go]"), true);
    assert.equal(matches(button, '[data-testid="go"]'), true);
    assert.equal(matches(button, "[data-testid]"), true);
    assert.equal(matches(button, "[data-testid=stop]"), false);
    // Descendants, through what lies between; and an ancestor that is not there.
    assert.equal(matches(button, "#__primerPortalRoot__ button"), true);
    assert.equal(matches(button, "[data-component=PH_Actions] button"), true);
    assert.equal(matches(button, "#other button"), false);
    assert.throws(() => matches(button, "a > b"), /cannot read: >/);

    const shown = (name, text, w = 10) => {
      const n = element(name, {});
      n.children = [{ type: 3, value: text, children: [] }];
      n.layouts = [{ bounds: { x: 0, y: 0, w, h: 10 } }];
      return n;
    };
    const [hidden, prefix, exact] = [shown("A", " Actions ", 0), shown("A", "Actions and more"), shown("A", "Actions")];
    const doc = { nodes: [hidden, prefix, exact] };
    // Text as annotate.mjs compares it: an element with no box is passed over, and the
    // whole text beats the start of a longer one.
    assert.equal(findElement(doc, { css: "a", text: "Actions" }), exact);
    assert.equal(findElement(doc, { css: "a", text: "Actions and" }), prefix);
    assert.equal(findElement(doc, { css: "a" }), prefix);
    assert.equal(findElement(doc, { css: "a", text: "Nothing" }), null);
  });

  test("names each of the six pictures, with marks that say what to point at", () => {
    assert.deepEqual(
      SHOTS.map((s) => s.name),
      [
        "compare-changes",
        "create-pull-request",
        "merge-pull-request",
        "confirm-merge",
        "choose-workflow",
        "run-workflow",
      ],
    );
    for (const shot of SHOTS) {
      assert.ok(fs.existsSync(path.join(REPO_ROOT, "docs", shot.out)), shot.out);
      assert.ok(shot.marks.length);
      for (const mark of shot.marks) assert.ok(mark.what && mark.on && mark.n !== undefined);
      // Every anchor a trim names is one the tool can read.
      assert.ok(shot.trim.of.length);
      for (const { css } of shot.trim.of)
        assert.equal(typeof matches({ type: 1, name: "A", attrs: {} }, css), "boolean");
    }
  });

  test("shows a person a picture of no one", () => {
    assert.match(decodeURIComponent(AVATAR), /^data:image\/svg\+xml,<svg /);
  });
});

describe("a clip of one axis, and of a disc", () => {
  const NAMES = [
    "display",
    "visibility",
    "overflow-x",
    "overflow-y",
    "background-color",
    ...["top-left", "top-right", "bottom-right", "bottom-left"].map((c) => `border-${c}-radius`),
  ];
  // A box of 100 by 100 at 10,10 that clips, with a child of its size and a ground.
  function page(overflowX, overflowY, radius) {
    const strings = [];
    const s = (v) => {
      const i = strings.indexOf(v);
      return i >= 0 ? i : strings.push(v) - 1;
    };
    const style = (ox, oy, ground, r) => ["block", "visible", ox, oy, ground, r, r, r, r].map(s);
    const plain = style("visible", "visible", "rgba(0, 0, 0, 0)", "0px");
    const names = ["#document", "HTML", "BODY", "DIV", "P"];
    const snapshot = {
      strings,
      documents: [
        {
          documentURL: s("http://localhost:1/"),
          frameId: s("PAGE"),
          nodes: {
            parentIndex: [-1, 0, 1, 2, 3],
            nodeType: [9, 1, 1, 1, 1],
            nodeName: names.map(s),
            nodeValue: names.map(() => -1),
            attributes: names.map(() => []),
          },
          layout: {
            nodeIndex: [1, 2, 3, 4],
            styles: [
              plain,
              plain,
              style(overflowX, overflowY, "rgba(0, 0, 0, 0)", radius),
              style("visible", "visible", "rgb(9, 9, 9)", "0px"),
            ],
            bounds: [
              [0, 0, 200, 200],
              [0, 0, 200, 200],
              [10, 10, 100, 100],
              [10, 10, 100, 100],
            ],
            text: [-1, -1, -1, -1],
            paintOrders: [0, 1, 2, 3],
            offsetRects: [[], [], [], []],
            clientRects: [[], [], [], []],
            scrollRects: [[], [], [], []],
          },
          textBoxes: { layoutIndex: [], bounds: [], start: [], length: [] },
        },
      ],
    };
    return decodeSnapshot(snapshot, NAMES);
  }
  const draw = (doc) =>
    renderSvg(doc, { clip: { x: 0, y: 0, w: 200, h: 200 }, metrics: () => ({ ascent: 12, height: 15, line: 15 }) }).svg;

  test("a clip of one axis takes the picture's span on the other, not an unbounded one", () => {
    const svg = draw(page("visible", "clip", "0px"));
    assert.match(svg, /<clipPath id="[^"]*"><rect x="0" y="10" width="200" height="100"\/>/);
    assert.doesNotMatch(svg, /1000000000/);
  });

  test("a box too thin to see and with no radius is no disc, whose clip would have no path", () => {
    const thin = page("hidden", "hidden", "0px");
    thin.layouts[2].bounds.h = 0;
    assert.doesNotMatch(draw(thin), /d="null"/);
  });

  test("a disc cuts what it clips to its shape, and a smaller radius leaves it square", () => {
    const clips = (radius) => (draw(page("hidden", "hidden", radius)).match(/<clipPath /g) ?? []).length;
    assert.equal(clips("0px"), 1);
    assert.equal(clips("8px"), 1);
    assert.doesNotMatch(draw(page("hidden", "hidden", "0px")), /d="null"/);
    const disc = draw(page("hidden", "hidden", "50px"));
    assert.equal((disc.match(/<clipPath /g) ?? []).length, 2);
    assert.match(disc, /<clipPath id="[^"]*"><path d="M60 10[^"]*A50 50 0 0 1/);
  });
});

describe("the private words", () => {
  const list = wordList([
    { find: "pat", show: "someone" },
    { find: "pat@example.org", show: "someone@users.noreply.github.com" },
  ]);

  test("are masked longest first, in any case, and every time", () => {
    assert.deepEqual(
      list.map((w) => w.find),
      ["pat@example.org", "pat"],
    );
    assert.equal(maskText("Pat <PAT@Example.org>", list), "someone <someone@users.noreply.github.com>");
    assert.equal(maskText("pat pat", list), "someone someone");
    assert.equal(maskText("nothing here", list), "nothing here");
    assert.equal(maskText("anything", []), "anything");
  });

  test("are refused with no stand-in, or a stand-in that shows a word", () => {
    assert.throws(() => wordList("pat"), /is not a list/);
    assert.throws(() => wordList([{ show: "x" }]), /has no `find`/);
    assert.throws(() => wordList([{ find: "  ", show: "x" }]), /has no `find`/);
    assert.throws(() => wordList([{ find: "pat" }]), /has no `show`/);
    assert.throws(() => wordList([{ find: "pat", show: "pattern" }]), /holds pat/);
  });

  test("are found in any case, and not in what is base64", () => {
    assert.deepEqual(heldWords("by PAT, on the page", ["pat", "kim"]), ["pat"]);
    assert.deepEqual(heldWords('href="data:image/png;base64,cGF0pat+AAA=" x', ["pat"]), []);
    assert.equal(holdsUserName("a Pat", "pat"), true);
  });

  test("count as shown where a picture can draw them, and only there", () => {
    const strings = ["#document", "OPTION", "#text", "pat@a", "HTML", "http://x/pat", "typed pat", "text pat"];
    const bundle = {
      snapshot: {
        strings,
        documents: [
          {
            layout: { text: [-1, 7] },
            nodes: {
              parentIndex: [-1, 0, 1],
              nodeName: [4, 1, 2],
              nodeValue: [-1, -1, 3],
              inputValue: { index: [1], value: [6] },
            },
          },
        ],
      },
    };
    assert.deepEqual(drawnStrings(bundle).sort(), ["pat@a", "text pat", "typed pat"]);
    assert.deepEqual(drawnWords(bundle, ["pat@a", "kim"]), ["pat@a"]);
    // The address of a link is no text a picture draws, and is scrubbed all the same.
    assert.deepEqual(drawnWords(bundle, ["http"]), []);
  });

  test("are found by the path they stand at, a member's name among them, for the panel's log", () => {
    const bundle = { strings: ["clean", "by pat"], docs: [{ pat: 1 }, { a: { b: "PAT" } }] };
    assert.deepEqual(heldPaths(bundle, ["pat"]), [
      "bundle.strings[1]",
      "a name in bundle.docs[0]",
      "bundle.docs[1].a.b",
    ]);
    assert.deepEqual(heldPaths(bundle, ["pat"], 1), ["bundle.strings[1]"]);
    assert.deepEqual(heldPaths(bundle, ["kim"]), []);
  });

  test("leave nothing in a bundle but what is no text", () => {
    const bundle = {
      strings: ["by pat", "plain"],
      numbers: [1, -1, null, true],
      docs: [{ page: { allRuns: [["k", "Pat"]] }, fontFiles: { a: "pat in a font's bytes" } }],
    };
    assert.deepEqual(scrubBundle(bundle, list), {
      strings: ["by someone", "plain"],
      numbers: [1, -1, null, true],
      docs: [{ page: { allRuns: [["k", "someone"]] }, fontFiles: { a: "pat in a font's bytes" } }],
    });
  });

  test("are the Windows user, what git says and what the list says", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "private-test-"));
    try {
      const file = path.join(dir, "private.json");
      const git = ([, key]) =>
        key === "user.email" ? { status: 0, stdout: "pat@example.org\n" } : { status: 1, stdout: "" };
      // No list is no failure: a checkout need not have one.
      assert.deepEqual(privateEntries(file), []);
      assert.deepEqual(privateWords({ file, user: "pat", git }), ["pat", "pat@example.org"]);
      fs.writeFileSync(file, JSON.stringify({ words: [{ find: "kim", show: "someone" }] }));
      assert.deepEqual(privateWords({ file, user: "pat", git }), ["pat", "kim", "pat@example.org"]);
      fs.writeFileSync(file, "{");
      assert.throws(() => privateWords({ file, user: "pat", git }), /private\.json/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("the example list reads, and the real one is ignored", () => {
    const example = path.join(REPO_ROOT, "scripts", "svgshot", "private.example.json");
    assert.equal(privateEntries(example).length, 3);
    const ignored = spawnSync("git", ["check-ignore", "-q", "scripts/svgshot/private.json"], { cwd: REPO_ROOT });
    assert.equal(ignored.status, 0);
  });
});
