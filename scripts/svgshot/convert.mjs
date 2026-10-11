// Spike: turn a probe bundle (scripts/svgshot/probe.mjs) into an SVG picture.
//
// A text fragment in the snapshot is the font's content area, so its baseline
// is the font's ascent below the fragment's top. The ascent is read here, in
// headless Chromium, from an inline box set in the same font: on the machine
// that took the bundle that is the same font file Chromium measured in the IDE.
// An underline is drawn whole here: the gaps Chromium cuts in it round a
// descender are measured on a canvas by capture.mjs, which this does not run.

import fs from "node:fs/promises";
import path from "node:path";
import { withBrowser } from "../lib/browser.mjs";
import { exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../../lib/cli.mjs";
import { PictureFonts, withFaces } from "./fonts.mjs";
import { decodeSnapshot, renderSvg, textNeeds } from "./snapshot-svg.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/svgshot/convert.mjs <bundle-dir> [--full] [--cutout] [--out <file>] [-h, --help]

Writes an SVG picture of the bundle's page, clipped to the bundle's clip.

  --full        the whole page, even when the bundle names a clip
  --cutout      no root background (the picture is transparent where the page is bare)
  --text        name the fonts instead of embedding subsets (renders right only
                where they are installed)
  --unhinted    embed the subsets without their hinting
  --out <file>  where to write it (default <bundle-dir>/page.svg)
  -h, --help    print this text and exit

Exit codes:
  0  written
  2  the tool could not run: a refused command line, no browser, a crash`;

const cli = withUsageError(() =>
  parseCli(process.argv.slice(2), {
    options: {
      full: { type: "boolean" },
      cutout: { type: "boolean" },
      text: { type: "boolean" },
      unhinted: { type: "boolean" },
      out: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    positionals: 1,
    stopAt: ["help"],
  }),
);
if (cli.values.help) printHelpAndExit(USAGE);
const [bundle] = cli.positionals;
const read = async (name) => JSON.parse(await fs.readFile(path.join(bundle, name), "utf8"));

const [snapshot, meta, census, fonts] = await Promise.all(
  ["snapshot.json", "meta.json", "census.json", "fonts.json"].map(read),
);
const page = { x: 0, y: 0, w: meta.viewport?.width ?? 1280, h: meta.viewport?.height ?? 880 };
const clip =
  meta.clip && !cli.values.full ? { x: meta.clip.x, y: meta.clip.y, w: meta.clip.width, h: meta.clip.height } : page;

const canvases = [];
for (const [k, c] of (census.canvases ?? []).entries()) {
  const file = path.join(bundle, `canvas-${k}.png`);
  const png = await fs.readFile(file).catch(() => null);
  if (!png || !c.visible) continue;
  const r = c.rect;
  canvases.push({ x: r.x, y: r.y, w: r.width, h: r.height, href: `data:image/png;base64,${png.toString("base64")}` });
}

// Web fonts the page declares, by family: the first face that has its bytes.
const faces = [];
for (const f of fonts.faces ?? []) {
  const data = f.sources?.map((s) => fonts.files?.[s.url]).find(Boolean);
  if (data && !faces.some((g) => g.family === f.family)) faces.push({ family: f.family, data });
}

const decoded = decodeSnapshot(snapshot, meta.stylesRequested);
const { keys, runs } = textNeeds(decoded, clip);
const fontStyle = (key) => {
  const [style, weight, size, family] = JSON.parse(key);
  return `white-space:pre;line-height:normal;font-family:${family};font-size:${size};font-weight:${weight};font-style:${style}`;
};
const { ascents, platform } = await withBrowser(async (browser) => {
  const tab = await browser.newPage();
  const css = faces.map((f) => `@font-face{font-family:"${f.family}";src:url("${f.data}")}`).join("");
  await tab.setContent(`<!doctype html><style>${css}body{margin:0}</style><body></body>`);

  // The fonts Chromium draws each run with: one span per run, then CDP.
  await tab.evaluate(
    async (spans) => {
      for (const [k, [style, text]] of spans.entries()) {
        const s = document.createElement("span");
        s.dataset.k = k;
        s.style.cssText = style;
        s.textContent = text;
        document.body.append(s, document.createElement("br"));
      }
      await document.fonts.ready;
    },
    runs.map(([key, text]) => [fontStyle(key), text]),
  );
  const cdp = await tab.createCDPSession();
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument", { depth: 0 });
  const { nodeIds } = await cdp.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: "span[data-k]" });
  const platform = new Map();
  for (const [k, nodeId] of nodeIds.entries()) {
    const { fonts: used } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
    platform.set(`${runs[k][0]}\u0000${runs[k][1]}`, used);
  }
  await tab.evaluate(() => {
    document.body.textContent = "";
  });

  const ascents = await tab.evaluate(async (keys) => {
    const out = {};
    for (const key of keys) {
      const [style, weight, size, family] = JSON.parse(key);
      const d = document.createElement("div");
      d.style.cssText = `position:absolute;left:0;top:0;white-space:pre;line-height:normal;font-family:${family};font-size:${size};font-weight:${weight};font-style:${style}`;
      const t = document.createElement("span");
      t.textContent = "Hxg";
      const b = document.createElement("span");
      b.style.cssText = "display:inline-block;width:0;height:0";
      d.append(t, b);
      document.body.append(d);
      await document.fonts.load(`${style} ${weight} ${size} ${family}`);
      const box = t.getClientRects()[0];
      out[key] = { ascent: b.getBoundingClientRect().bottom - box.top, height: box.height };
      d.remove();
    }
    return out;
  }, keys);
  return { ascents, platform };
});

// Most glyphs first: the primary font, then what Chromium fell back to.
const fontsFor = (key, text) =>
  (platform.get(`${key}\u0000${text}`) ?? [])
    .toSorted((a, b) => b.glyphCount - a.glyphCount)
    .map((f) =>
      f.isCustomFont
        ? { family: f.familyName, data: faces.find((g) => g.family === f.familyName)?.data }
        : { ps: f.postScriptName },
    )
    .filter((s) => s.ps || s.data);

const pictureFonts = cli.values.text ? null : new PictureFonts({ hinting: !cli.values.unhinted });
const drawn = renderSvg(decoded, {
  clip,
  metrics: (key) => ascents[key] ?? { ascent: 0, height: 0 },
  canvases,
  fonts: pictureFonts,
  fontsFor,
  background: !cli.values.cutout,
});
const svg = await withFaces(drawn.svg, pictureFonts);
const { stats } = drawn;
const out = cli.values.out ?? path.join(bundle, "page.svg");
await fs.writeFile(out, svg);
console.log(JSON.stringify({ out, bytes: Buffer.byteLength(svg), fonts: keys.length, ...stats }));
