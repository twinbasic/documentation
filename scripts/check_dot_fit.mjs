#!/usr/bin/env node
// Does every DOT diagram's text still fit the boxes Graphviz drew for it?
//
//     node scripts/check_dot_fit.mjs            # check every committed .svg
//     node scripts/check_dot_fit.mjs --verbose  # print every run, not just failures
//
// WHY THIS EXISTS.  Graphviz lays out boxes from a width table; the browser
// paints the text with a real font. Those are two different measurements of
// the same string, and nothing inside the build compares them -- so when they
// disagree, the SVG is still well-formed, the build is still green, and the
// only symptom is a label hanging out of its box on the rendered page.
//
// That is not hypothetical. Graphviz has no font machinery at all and falls
// back to Times for any family it does not know, so `fontname="Inter"`
// measured identically to `fontname="NoSuchFontXYZ"` and every box came out
// ~11% too narrow. Twenty-seven labels across three diagrams were hanging
// past their edges, on pages that had been through the full accessibility
// sweep, because axe does not evaluate SVG <text> geometry either.
// builder/dot-metrics.mjs fixed the cause; this is what proves it stayed
// fixed.
//
// It runs in check.bat rather than in the build for the same reason the axe
// scan does: it needs a browser, and builder/dot.mjs is deliberately free of
// one.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

const REPO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = path.join(REPO, "docs");

// A label may sit this far past its box edge before it counts as a failure.
// Kerning is the irreducible part: a per-character table cannot express it,
// and on the site's labels it makes Graphviz over-estimate by up to 2.8% --
// which errs wide, so it does not push text out. This budget is for the
// rounding either side of that, not for a font mismatch, which shows up as
// tens of units rather than ones.
const TOLERANCE = 1.0;

const verbose = process.argv.includes("--verbose");

async function findDotSvgs(dir, out = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === "ENOENT") return out;
    throw err;
  }
  for (const e of entries) {
    if (e.name.startsWith("_") || e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await findDotSvgs(full, out);
    else if (e.isFile() && e.name.endsWith(".dot")) {
      const svg = full.replace(/\.dot$/, ".svg");
      if (await fs.stat(svg).then(() => true, () => false)) out.push(svg);
    }
  }
  return out;
}

const svgs = (await findDotSvgs(SRC)).sort();
if (svgs.length === 0) {
  console.log("check_dot_fit: no DOT diagrams found");
  process.exit(0);
}

const fontDirUrl = pathToFileURL(path.join(REPO, "docs/assets/fonts")).href;
const hostHtml = `<!doctype html><meta charset="utf-8"><title>dot fit</title><style>
@font-face{font-family:"Inter";font-style:normal;font-weight:100 900;
  src:url("${fontDirUrl}/inter-variable.woff2") format("woff2")}
@font-face{font-family:"Inter";font-style:italic;font-weight:100 900;
  src:url("${fontDirUrl}/inter-variable-italic.woff2") format("woff2")}
body{font-family:Inter,system-ui,sans-serif;margin:0}
#host{width:1200px}#host svg{width:1200px;height:auto}</style><div id="host"></div>`;

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--allow-file-access-from-files"],
});

let failures = 0;
let checked = 0;
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("[page error]", e.message));

  const tmp = path.join(SRC, "_dot-fit-host.html");
  await fs.writeFile(tmp, hostHtml, "utf8");
  try {
    await page.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
  } finally {
    await fs.rm(tmp, { force: true });
  }
  await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load("400 12px Inter"),
      document.fonts.load("700 12px Inter"),
      document.fonts.load("italic 400 12px Inter"),
      document.fonts.load("italic 700 12px Inter"),
    ]);
    await document.fonts.ready;
  });

  for (const svgPath of svgs) {
    const rel = path.relative(REPO, svgPath).replace(/\\/g, "/");
    const svg = await fs.readFile(svgPath, "utf8");

    const result = await page.evaluate((markup, tol) => {
      document.getElementById("host").innerHTML = markup;
      const root = document.querySelector("#host svg");
      if (!root) return { error: "no <svg> element" };

      const runs = [];
      // Nodes: the label is centred in its box, so both edges matter and the
      // off-centre figure is meaningful.
      for (const g of root.querySelectorAll("g.node")) {
        const shape = g.querySelector("path, polygon, ellipse, rect");
        if (!shape) continue;
        const sb = shape.getBBox();
        for (const t of g.querySelectorAll("text")) {
          const tb = t.getBBox();
          runs.push({
            txt: t.textContent.trim().slice(0, 44),
            over: Math.max((tb.x + tb.width) - (sb.x + sb.width), sb.x - tb.x),
            skew: (tb.x + tb.width / 2) - (sb.x + sb.width / 2),
          });
        }
      }
      // Clusters: the label is left-justified along the top edge, so only the
      // right edge can be outrun and `skew` would mean nothing. Worth checking
      // even though the cluster is sized by its contents -- shorten the nodes
      // inside one and the label becomes the widest thing in it.
      for (const g of root.querySelectorAll("g.cluster")) {
        const shape = g.querySelector("path, polygon, ellipse, rect");
        if (!shape) continue;
        const sb = shape.getBBox();
        for (const t of g.querySelectorAll("text")) {
          const tb = t.getBBox();
          runs.push({
            txt: t.textContent.trim().slice(0, 44),
            over: (tb.x + tb.width) - (sb.x + sb.width),
            skew: 0,
          });
        }
      }
      if (runs.length === 0) return { error: "no text runs -- did the SVG render?" };
      return {
        total: runs.length,
        bad: runs.filter((r) => r.over > tol).sort((a, b) => b.over - a.over),
        maxSkew: runs.reduce((a, r) => (Math.abs(r.skew) > Math.abs(a) ? r.skew : a), 0),
      };
    }, svg, TOLERANCE);

    checked++;
    if (result.error) {
      console.error(`  ERROR      ${rel}: ${result.error}`);
      failures++;
      continue;
    }
    if (result.bad.length) {
      failures++;
      console.error(`  OVERFLOW   ${rel}: ${result.bad.length} of ${result.total} label(s) past the box edge`);
      for (const b of result.bad.slice(0, 6)) {
        console.error(`               +${b.over.toFixed(1)}  "${b.txt}"`);
      }
      if (result.bad.length > 6) console.error(`               ... and ${result.bad.length - 6} more`);
    } else {
      console.log(`  ok         ${rel}  (${result.total} runs, max off-centre ${result.maxSkew.toFixed(1)})`);
      if (verbose) console.log(`               tolerance ${TOLERANCE}`);
    }
  }
} finally {
  await browser.close();
}

if (failures) {
  console.error(
    `\ncheck_dot_fit: ${failures} of ${checked} diagram(s) have text outside their boxes.\n` +
    "Graphviz sized those boxes with a different font from the one the page paints with.\n" +
    "Check that builder/dot-metrics.mjs still installs Inter's widths -- a bump of\n" +
    "@hpcc-js/wasm-graphviz is the usual cause -- then re-render with build.bat.",
  );
  process.exit(1);
}
console.log(`\ncheck_dot_fit: ${checked} diagram(s) clean`);
