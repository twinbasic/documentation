#!/usr/bin/env node
// Generate the Inter width table that builder/dot-metrics.mjs feeds to
// Graphviz.
//
//     node scripts/build_dot_metrics.mjs            # regenerate
//     node scripts/build_dot_metrics.mjs --check    # fail if stale
//
// Dev tooling, not part of the render pipeline -- tbdocs never runs this, and
// builder/inter-metrics.json is a committed artifact exactly like the DOT
// SVGs and the subset webfonts. It needs puppeteer; build.bat does not.
//
// WHY IT EXISTS.  Graphviz has no font machinery at all: the WASM build
// carries zero occurrences of pango, fontconfig, freetype or harfbuzz, only
// the built-in core-PostScript width tables. An unknown family falls back to
// Times, so `fontname="Inter"` measures byte-identically to
// `fontname="NoSuchFontXYZ"` -- and Times is much narrower than Inter, so
// every box came out too small. Measured across the site's diagram labels,
// Graphviz under-sized them by 11.4% on average and 18.0% at worst, which put
// 27 labels past their box edges on the three diagrams that shipped before
// this existed.
//
// The numbers below come from the browser rather than from the font binary on
// purpose: the browser's shaped advance is what actually gets painted, so
// measuring it is measuring the thing we are trying to match. fontTools would
// give the `hmtx` advances of a variable font at a default instance, which is
// a different number.
//
// Kerning is the one thing a per-character table cannot express. On the real
// labels it costs +0.50% on average and +2.79% at worst, and it errs *wide*
// -- the table over-estimates, so boxes come out slightly generous rather
// than slightly tight. That is the safe direction, and scripts/check_dot_fit.mjs
// is what proves it stayed safe.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

const REPO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(REPO, "builder", "inter-metrics.json");

// Graphviz stores widths as `short`, in the family's own em units. The Times
// family it falls back to declares 2048, and builder/dot-metrics.mjs writes
// into that family's arrays, so the table has to be in the same scale.
const UNITS_PER_EM = 2048;

// struct FontFamilyMetrics's four arrays, in declaration order.
const VARIANTS = [
  { key: "regular", weight: 400, style: "normal" },
  { key: "bold", weight: 700, style: "normal" },
  { key: "italic", weight: 400, style: "italic" },
  { key: "boldItalic", weight: 700, style: "italic" },
];

const check = process.argv.includes("--check");

const fontDirUrl = pathToFileURL(path.join(REPO, "docs/assets/fonts")).href;
const hostHtml = `<!doctype html><meta charset="utf-8"><title>metrics</title><style>
@font-face{font-family:"Inter";font-style:normal;font-weight:100 900;
  src:url("${fontDirUrl}/inter-variable.woff2") format("woff2")}
@font-face{font-family:"Inter";font-style:italic;font-weight:100 900;
  src:url("${fontDirUrl}/inter-variable-italic.woff2") format("woff2")}
body{margin:0}</style>`;

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--allow-file-access-from-files"],
});

let table;
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("[page error]", e.message));

  const tmp = path.join(REPO, "docs", "_dot-metrics-host.html");
  await fs.writeFile(tmp, hostHtml, "utf8");
  try {
    await page.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
  } finally {
    await fs.rm(tmp, { force: true });
  }

  table = await page.evaluate(async (variants, upm) => {
    for (const v of variants) {
      await document.fonts.load(`${v.style === "italic" ? "italic " : ""}${v.weight} 16px Inter`);
    }
    await document.fonts.ready;

    const ctx = document.createElement("canvas").getContext("2d");
    const font = (v, px) => `${v.style === "italic" ? "italic " : ""}${v.weight} ${px}px Inter`;

    // Advances must scale linearly with size, or a table measured at one size
    // cannot stand in for every size Graphviz will ask about. Chromium's
    // canvas uses unhinted advances, so they do -- but assert it rather than
    // assume it, because a hinted path would silently skew the whole table.
    const v0 = variants[0];
    ctx.font = font(v0, 2048);
    const big = ctx.measureText("Hamburgefonstiv").width;
    ctx.font = font(v0, 128);
    const small = ctx.measureText("Hamburgefonstiv").width * 16;
    const drift = Math.abs(big - small) / big;
    if (drift > 0.002) {
      throw new Error(`advances are not linear in size (drift ${(drift * 100).toFixed(3)}%) -- ` +
        `the table cannot be measured at a single size`);
    }

    const out = {};
    for (const v of variants) {
      // Measuring at exactly `upm` px makes the returned advance the em-unit
      // value directly, with no scaling step to get wrong.
      ctx.font = font(v, upm);
      const arr = new Array(128).fill(-1);
      for (let cc = 32; cc < 127; cc++) {
        arr[cc] = Math.round(ctx.measureText(String.fromCharCode(cc)).width);
      }
      out[v.key] = arr;
    }
    return { unitsPerEm: upm, widths: out, probe: Math.round(big) };
  }, VARIANTS, UNITS_PER_EM);
} finally {
  await browser.close();
}

for (const v of VARIANTS) {
  const arr = table.widths[v.key];
  if (!arr || arr.length !== 128) throw new Error(`${v.key}: expected 128 entries`);
  const bad = arr.slice(32, 127).filter((w) => !(w > 0 && w < 32767));
  if (bad.length) throw new Error(`${v.key}: ${bad.length} width(s) outside the int16 range`);
}

const next = JSON.stringify({
  _comment: [
    "Generated by scripts/build_dot_metrics.mjs -- do not hand-edit.",
    "Inter advance widths in em units, for Graphviz's FontFamilyMetrics.",
    "Indexed by ASCII code point; -1 means 'no data', as Graphviz uses it.",
  ],
  unitsPerEm: table.unitsPerEm,
  widths: table.widths,
}, null, 1) + "\n";

const prev = await fs.readFile(OUT, "utf8").catch(() => null);
const rel = path.relative(REPO, OUT).replace(/\\/g, "/");
if (prev === next) {
  console.log(`  unchanged  ${rel}`);
} else if (check) {
  console.error(`  STALE      ${rel}`);
  console.error("\nRun `node scripts/build_dot_metrics.mjs` to regenerate.");
  process.exitCode = 1;
} else {
  await fs.writeFile(OUT, next, "utf8");
  const sample = ["A", "M", "a", "i", "W"].map((c) => `${c}=${table.widths.regular[c.charCodeAt(0)]}`).join(" ");
  console.log(`  wrote      ${rel}  (upm ${table.unitsPerEm}; regular ${sample})`);
}
