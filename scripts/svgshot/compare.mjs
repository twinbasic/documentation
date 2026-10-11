// Spike: how close an SVG screenshot comes to the PNG the IDE itself painted.
//
// The comparison is diff.mjs's: the SVG shown as an <img> at device scale 2,
// compared pixel by pixel with the bundle's page.png, cropped to the clip the
// SVG names on its root (`data-clip="x y w h"`, CSS px; the whole SVG at 0,0
// when it names none).
//
// Writes <svg>.render.png, <svg>.ref.png (the reference, cropped) and
// <svg>.diff.png beside the SVG and prints the statistics as JSON, with the
// worst tiles in page CSS px so a fault can be found in the snapshot without
// opening a picture.

import fs from "node:fs/promises";
import path from "node:path";
import { exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../../lib/cli.mjs";
import { withBrowser } from "../lib/browser.mjs";
import { diffSvg, svgClip, zoomPicture } from "./diff.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/svgshot/compare.mjs <bundle-dir> <svg-file> [--scale N] [--tile N] [--top N] [--zoom x,y,w,h] [-h, --help]

Renders <svg-file> as an image at the given device scale and compares it with
<bundle-dir>/page.png, cropped to the clip on the SVG's root.

  --scale N   device scale factor of page.png (default 2)
  --tile N    tile size in CSS px for the worst-tiles list (default 16)
  --top N     how many worst tiles to list (default 12)
  --zoom x,y,w,h  also write <svg>.zoom.png: that page area (CSS px) of the
              reference, the render and the difference, magnified
  --ref <png> compare with this PNG of the SVG's clip alone (as shoot_docs
              writes them) instead of <bundle-dir>/page.png
  -h, --help  print this text and exit

Exit codes:
  0  compared
  2  the tool could not run: a refused command line, no browser, a crash`;

const cli = withUsageError(() =>
  parseCli(process.argv.slice(2), {
    options: {
      scale: { type: "string" },
      tile: { type: "string" },
      top: { type: "string" },
      zoom: { type: "string" },
      ref: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    positionals: 2,
    stopAt: ["help"],
  }),
);
if (cli.values.help) printHelpAndExit(USAGE);
const [bundle, svgFile] = cli.positionals;
const scale = Number(cli.values.scale ?? 2);
const zoomList = cli.values.zoom?.split(",").map(Number);
const zoom = zoomList ? { x: zoomList[0], y: zoomList[1], w: zoomList[2], h: zoomList[3] } : null;

const svg = await fs.readFile(svgFile, "utf8");
// --ref: a PNG of the SVG's clip alone (as shoot_docs writes them), not of the whole page.
const ref = await fs.readFile(cli.values.ref ?? path.join(bundle, "page.png"));
const clip = svgClip(svg);
const base = svgFile.replace(/\.svg$/i, "");
const result = await withBrowser(async (browser) => {
  const page = await browser.newPage();
  const r = await diffSvg(page, svg, ref, {
    refOrigin: cli.values.ref ? { x: clip.x, y: clip.y } : { x: 0, y: 0 },
    scale,
    tile: Number(cli.values.tile ?? 16),
    top: Number(cli.values.top ?? 12),
  });
  await fs.writeFile(`${base}.render.png`, r.render);
  await fs.writeFile(`${base}.diff.png`, r.diff);
  await fs.writeFile(`${base}.ref.png`, r.refCrop);
  if (zoom) await fs.writeFile(`${base}.zoom.png`, await zoomPicture(page, r, zoom, scale));
  return r;
});

console.log(
  JSON.stringify({ svg: path.basename(svgFile), bytes: Buffer.byteLength(svg), clip: result.clip, ...result.stats }),
);
