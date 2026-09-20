#!/usr/bin/env node
// Re-export the committed Mermaid diagrams from their `_Images/*.md` sources.
//
//     node scripts/render_mermaid.mjs                 # all diagrams
//     node scripts/render_mermaid.mjs --check         # fail if any is stale
//
// Dev tooling, not part of the render pipeline -- tbdocs never runs this, and
// the `.svg` files it writes are committed artifacts like the DOT diagrams.
// It needs a network connection (it pulls the pinned mermaid build from a CDN
// inside headless Chromium) and is therefore never run in CI.
//
// WHY IT EXISTS.  These diagrams used to be exported by hand, which is fine
// until the site's typeface changes: Mermaid measures every label in the
// browser and sizes each node box to fit, so a committed SVG is only correct
// for the font it was measured with.  Re-pointing the font-family in an
// existing export -- the obvious edit -- silently overflows every box, because
// the geometry stays where the old font put it.  Inter needed 5-9 user units
// more per label than the `sans-serif` the previous export was measured
// against, and every label in both diagrams was clipped.
//
// THE ONE THING THAT WILL CATCH YOU OUT.  Every *style* Mermaid will measure
// has to be resident before render() is called.  `document.fonts.ready` does
// not fetch a face nothing on the page has used yet, and these labels carry
// <b> and <i>, so roman, bold, italic and bold-italic are all loaded
// explicitly below.  Miss one and only the labels in that style come out
// clipped -- which looks like a Mermaid bug rather than a font-loading one.
//
// The light theme is deliberate and is not a default worth changing: the
// previous CEF export was made on the dark theme and its edge labels came out
// at 4.43:1, under WCAG AA, and had to be hand-corrected afterwards.  On the
// light theme the same labels measure 10.3:1 with no intervention.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

const REPO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MERMAID_CDN = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";

// Kept in step with $tb-body-font-family in docs/_sass/custom/_fonts.scss.
const FONT_STACK = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';

// source markdown (holds the ```mermaid block)  ->  committed svg
const DIAGRAMS = [
  {
    src: "docs/Tutorials/CEF/_Images/MonacoArchitecture.md",
    out: "docs/Tutorials/CEF/Images/MonacoArchitecture.svg",
    id: "mermaidChart_cef_monaco",
  },
  {
    src: "docs/Tutorials/WebView2/_Images/MonacoArchitecture.md",
    out: "docs/Tutorials/WebView2/Images/MonacoArchitecture.svg",
    id: "mermaidChart_wv2_monaco",
  },
];

const FENCE = /^```mermaid\r?\n([\s\S]*?)^```/m;

async function readSource(rel) {
  const text = await fs.readFile(path.join(REPO, rel), "utf8");
  const m = text.match(FENCE);
  if (!m) throw new Error(`${rel}: no \`\`\`mermaid fenced block`);
  return m[1].trimEnd();
}

// A minimal host page. The @font-face rules point at the committed webfonts by
// file:// URL, which is why this loads from disk rather than over the dev
// server: no server has to be running for a re-export.
function hostPage(fontDirUrl) {
  return `<!doctype html><meta charset="utf-8"><title>mermaid</title><style>
@font-face{font-family:"Inter";font-style:normal;font-weight:100 900;
  src:url("${fontDirUrl}/inter-variable.woff2") format("woff2")}
@font-face{font-family:"Inter";font-style:italic;font-weight:100 900;
  src:url("${fontDirUrl}/inter-variable-italic.woff2") format("woff2")}
body{font-family:${FONT_STACK};margin:0}
</style><div id="host" style="width:1600px"></div>`;
}

const check = process.argv.includes("--check");

const browser = await puppeteer.launch({
  headless: true,
  // --allow-file-access-from-files: the host page is a file:// document and
  // has to fetch the woff2 files beside it. book/render-book.mjs needs the
  // same flag for the same reason.
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--allow-file-access-from-files"],
});

let stale = 0;
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("[page error]", e.message));

  const fontDirUrl = pathToFileURL(path.join(REPO, "docs/assets/fonts")).href;
  const tmp = path.join(REPO, "docs", "_mermaid-host.html");
  await fs.writeFile(tmp, hostPage(fontDirUrl), "utf8");
  try {
    await page.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
  } finally {
    await fs.rm(tmp, { force: true });
  }

  await page.evaluate(async (cdn, stack) => {
    const mermaid = (await import(cdn)).default;
    await Promise.all([
      document.fonts.load("400 16px Inter"),
      document.fonts.load("700 16px Inter"),
      document.fonts.load("italic 400 16px Inter"),
      document.fonts.load("italic 700 16px Inter"),
    ]);
    await document.fonts.ready;
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",          // light -- see the header comment
      securityLevel: "loose",    // the node labels contain <b> and <i>
      fontFamily: stack,
      flowchart: { htmlLabels: true, useMaxWidth: true },
    });
    window.__mermaid = mermaid;
  }, MERMAID_CDN, FONT_STACK);

  for (const d of DIAGRAMS) {
    const src = await readSource(d.src);
    const svg = await page.evaluate(async (id, text) => {
      const { svg } = await window.__mermaid.render(id, text);
      // Render into the document as well, so the overflow assertion below
      // measures a laid-out tree rather than a detached string.
      document.getElementById("host").innerHTML = svg;
      return svg;
    }, d.id, src);

    // Assert what the hand-export could not: every label fits its box. This
    // is the failure mode a font change causes, and it is invisible in the
    // markup -- the text is simply clipped at the foreignObject edge.
    const overflow = await page.evaluate(() => {
      const el = document.querySelector("#host svg");
      const k = el.getBoundingClientRect().width / el.viewBox.baseVal.width;
      return [...el.querySelectorAll("foreignObject")]
        .map((f) => ({
          txt: f.textContent.trim().slice(0, 40),
          box: +f.getAttribute("width"),
          needs: f.firstElementChild.getBoundingClientRect().width / k,
        }))
        .filter((r) => r.needs > r.box + 0.5);
    });
    if (overflow.length) {
      throw new Error(
        `${d.out}: ${overflow.length} label(s) overflow their node box:\n` +
        overflow.map((r) => `  "${r.txt}" box=${r.box.toFixed(1)} needs=${r.needs.toFixed(1)}`).join("\n") +
        `\nThis means a font used by the labels was not loaded before render().`,
      );
    }

    const outPath = path.join(REPO, d.out);
    const prev = await fs.readFile(outPath, "utf8").catch(() => null);
    const next = svg.endsWith("\n") ? svg : svg + "\n";
    if (prev === next) {
      console.log(`  unchanged  ${d.out}`);
      continue;
    }
    if (check) {
      console.error(`  STALE      ${d.out}`);
      stale++;
      continue;
    }
    await fs.writeFile(outPath, next, "utf8");
    console.log(`  wrote      ${d.out}  (${next.length} bytes)`);
  }
} finally {
  await browser.close();
}

if (stale) {
  console.error(`\n${stale} diagram(s) differ from their source. Run without --check to re-export.`);
  process.exitCode = 1;
}
