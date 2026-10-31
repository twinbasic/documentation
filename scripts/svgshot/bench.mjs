// The converter's test pages. Each page under scripts/svgshot/bench/ is opened
// in a browser, taken as a PNG at device scale 2 as shoot_docs takes the IDE,
// and drawn as an SVG by capture.mjs's svgOfPage; diff.mjs compares the two.
// So a change that draws a replicated part or a text decoration wrongly -- a
// scrollbar, a drop-down list, a native text field, an underline, a focus ring, a frame, a web font
// split by unicode-range, an inline <svg>, the annotation layer on a scrolled
// page -- shows here without an IDE, in seconds. The documents of the frames page
// are under bench/frames/, which is no page of its own.
//
// The pages are served from 127.0.0.1 (the folder, and /fonts/ is the site's
// docs/assets/fonts/, the fonts a page may use), not opened as files: a page's
// script cannot read the bytes of a font a file: page names, and capture.mjs does.
// A page that scrolls is taken as the window shows it: the picture's clip starts
// at the scroll offset, as a shot's does.
//
// No page comes out exact: text is shaped by two renderers, and a replica is
// close rather than equal. A fixed limit cannot tell that residue from a new
// fault -- an arrow drawn a quarter too tall moves a page's figures from 0.025%
// to 0.064% -- so each page is held to the figures recorded for it in
// bench/baseline.json, and fails when it differs more than they say by more
// than TOLERANCE. --update records a run's figures as the new baseline, for a
// page added, a fault fixed, or a browser updated.
//
// It also checks the one fact about Chromium that the converter assumes and no
// page property shows: how long a custom scrollbar thumb of auto height is
// (snapshot-svg.mjs's AUTO_THUMB). A thumb two pixels off moves a page's
// figures too little to see.
//
// Needs what shoot_docs --svg needs: Python with fontTools for the font
// subsets, and the Windows fonts the pages name; and Microsoft Edge. Outside
// every gate, as the other svgshot tools are.

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { exitOnCrash, parseCli, printHelpAndExit, regexOption, withUsageError } from "../../lib/cli.mjs";
import { REPO_ROOT } from "../../lib/repo-paths.mjs";
import { LAUNCH_ARGS, withBrowser } from "../lib/browser.mjs";
import { decodePng } from "../lib/png.mjs";
import { svgOfPage } from "./capture.mjs";
import { diffSvg } from "./diff.mjs";
import { AUTO_THUMB } from "./snapshot-svg.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/svgshot/bench.mjs [--only <regex>] [--out <dir>] [--update] [-h, --help]

Draws each test page under scripts/svgshot/bench/ as an SVG, as shoot_docs --svg
draws the IDE, and compares it with the browser's own picture of the page, in
Microsoft Edge, whose Chromium is the IDE's. A page fails when it differs more
than its figures in bench/baseline.json say: the share of its pixels 32 grey
levels or more off, of those 96 or more off, and of its worst 16-pixel tile.
Also checks that the browser draws a custom scrollbar thumb of auto height as
long as the converter assumes.

  --only <regex>  only the pages whose file name matches
  --out <dir>     write each page's picture (<page>.png), its SVG (<page>.svg),
                  the SVG as the browser renders it (<page>.render.png) and the
                  difference map (<page>.diff.png) into <dir>
  --update        record this run's figures as the pages' baseline
  -h, --help      print this text and exit

Exit codes:
  0  every page is within its baseline, and the thumb is as long as assumed;
     or, with --update, the baseline is written
  1  a page differs past its baseline or has none, or the thumb is not as
     long as assumed
  2  the tool could not run: a refused command line, no Edge, a crash`;

const cli = withUsageError(() =>
  parseCli(process.argv.slice(2), {
    options: {
      only: { type: "string" },
      out: { type: "string" },
      update: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
    stopAt: ["help"],
  }),
);
if (cli.values.help) printHelpAndExit(USAGE);
const only =
  cli.values.only === undefined ? null : withUsageError(() => regexOption(cli.values.only, { option: "--only" }));
const out = cli.values.out ?? null;

const PAGES = path.join(import.meta.dirname, "bench");
const FONTS = path.join(REPO_ROOT, "docs", "assets", "fonts");
const BASELINE = path.join(PAGES, "baseline.json");
// Each page is laid out in this viewport.
const VIEW = { width: 800, height: 400 };
// How far past its baseline a page may go: percentage points of its pixels 32
// and 96 grey levels or more off (a pixel's shift allowed), and of the share of
// its worst tile. A run repeats its figures exactly; these cover a browser's
// small updates.
const TOLERANCE = { pct32: 0.01, pct96: 0.005, tile: 0.01 };

// Chromium's length for a custom scrollbar thumb of auto height, read from the
// pixels of a bar whose thumb would be under a pixel long by its proportion.
async function autoThumb(page) {
  await page.setViewport({ width: 300, height: 300, deviceScaleFactor: 1 });
  await page.setContent(
    "<style>body{margin:0}#s::-webkit-scrollbar{width:16px}#s::-webkit-scrollbar-thumb{background:#f00}" +
      '#s::-webkit-scrollbar-track{background:#00f}</style><div id="s" style="width:200px;height:200px;' +
      'overflow-y:scroll"><div style="height:100000px"></div></div>',
  );
  const { width, rgba } = decodePng(Buffer.from(await page.screenshot()));
  let n = 0;
  for (let y = 0; y < 200; y++) {
    const p = (y * width + 192) * 4;
    if (rgba[p] > 200 && rgba[p + 2] < 50) n++;
  }
  return n;
}

// Edge's executable, in the folders it installs into, for the machine or for the user.
function edge() {
  const roots = [process.env["ProgramFiles(x86)"], process.env.ProgramFiles, process.env.LOCALAPPDATA];
  for (const root of roots.filter(Boolean)) {
    const exe = path.join(root, "Microsoft", "Edge", "Application", "msedge.exe");
    if (fs.existsSync(exe)) return exe;
  }
  return null;
}

// The CDP connection capture.mjs drives a page through.
function connection(cdp) {
  return {
    send: (method, params = {}) => cdp.send(method, params),
    evaluate: async (expression, { awaitPromise = false } = {}) => {
      const r = await cdp.send("Runtime.evaluate", { expression, awaitPromise, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    },
  };
}

// The pages and the fonts, over HTTP on a free port of this machine.
function serve() {
  const types = { ".html": "text/html; charset=utf-8", ".woff2": "font/woff2" };
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
    const [root, rest] = url.startsWith("/fonts/") ? [FONTS, url.slice("/fonts/".length)] : [PAGES, url.slice(1)];
    const file = path.resolve(root, rest);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

const pages = fs
  .readdirSync(PAGES)
  .filter((f) => f.endsWith(".html") && (!only || only.test(f)))
  .sort();
if (!pages.length) {
  console.error(`no page under ${PAGES} matches`);
  process.exit(2);
}
const executablePath = edge();
if (!executablePath) {
  console.error("Microsoft Edge is not installed: the bench compares in Edge, whose Chromium is the IDE's");
  process.exit(2);
}
const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, "utf8")) : { pages: {} };
if (out) fs.mkdirSync(out, { recursive: true });

const server = await serve();
const origin = `http://127.0.0.1:${server.address().port}`;
let failed = false;
const figures = {};
let browserVersion;
// Edge, whose Chromium is the IDE's WebView2's or a version from it; Puppeteer's
// own trails it, and draws some parts otherwise (a drop-down list's arrow).
// Laid out at 1x and drawn at 2x, as shoot_docs runs the IDE, so that boxes
// snap to whole pixels as there. Text without ClearType, as an SVG shown as an
// image draws it, so that what differs is the drawing and not the
// antialiasing. The scrollbars must be shown: Puppeteer starts a browser with
// them hidden.
await withBrowser(
  async (browser) => {
    browserVersion = await browser.version();
    const since =
      baseline.browser && baseline.browser !== browserVersion ? `; the baseline is ${baseline.browser}'s` : "";
    console.log(`in ${browserVersion}${since}`);
    const page = await browser.newPage();
    const thumb = await autoThumb(page);
    if (thumb === AUTO_THUMB) console.log(`a thumb of auto height is ${thumb}px long, as snapshot-svg.mjs assumes`);
    else {
      console.log(
        `FAILED: a thumb of auto height is ${thumb}px long; AUTO_THUMB in snapshot-svg.mjs says ${AUTO_THUMB}`,
      );
      failed = true;
    }
    const compare = await browser.newPage();
    for (const file of pages) {
      const name = file.replace(/\.html$/, "");
      await page.setViewport({ ...VIEW, deviceScaleFactor: 2 });
      await page.goto(`${origin}/${file}`);
      await page.evaluate(() => document.fonts.ready);
      const png = Buffer.from(await page.screenshot());
      // The window's part of the page: the picture's clip, and the page point the PNG starts at.
      const win = await page.evaluate(() => ({ x: scrollX, y: scrollY, width: innerWidth, height: innerHeight }));
      const { svg, stats } = await svgOfPage(connection(await page.createCDPSession()), win);
      const diff = await diffSvg(compare, svg, png, { refOrigin: { x: win.x, y: win.y } });
      const worst = diff.stats.worst[0] ?? { share: 0, x: 0, y: 0 };
      const got = { pct32: diff.stats.pct32, pct96: diff.stats.pct96, tile: worst.share };
      figures[name] = got;
      const base = baseline.pages[name];
      const worse = base ? Object.keys(TOLERANCE).filter((k) => got[k] > base[k] + TOLERANCE[k]) : [];
      const better = base ? Object.keys(TOLERANCE).filter((k) => got[k] < base[k] - TOLERANCE[k]) : [];
      let verdict = "ok    ";
      let note = "";
      if (cli.values.update) verdict = "record";
      else if (!base) {
        verdict = "FAILED";
        note = "; no baseline: run with --update to record one";
      } else if (worse.length) {
        verdict = "FAILED";
        note = `; worse than its baseline (${worse.map((k) => `${k} ${base[k]}`).join(", ")})`;
      } else if (better.length)
        note = `; better than its baseline (${better.map((k) => `${k} ${base[k]}`).join(", ")}): run with --update`;
      if (verdict === "FAILED") failed = true;
      const unsupported = Object.entries(stats.unsupported).map(([k, n]) => `${k} x${n}`);
      console.log(
        `${verdict} ${name}: ${got.pct32}% of pixels differ, ${got.pct96}% strongly; ` +
          `the worst tile ${(got.tile * 100).toFixed(1)}% at ${worst.x},${worst.y}` +
          `${unsupported.length ? `; not drawn: ${unsupported.join(", ")}` : ""}${note}`,
      );
      if (out) {
        fs.writeFileSync(path.join(out, `${name}.png`), png);
        fs.writeFileSync(path.join(out, `${name}.svg`), svg);
        fs.writeFileSync(path.join(out, `${name}.render.png`), diff.render);
        fs.writeFileSync(path.join(out, `${name}.diff.png`), diff.diff);
      }
    }
  },
  {
    executablePath,
    args: [...LAUNCH_ARGS, "--force-device-scale-factor=1", "--disable-lcd-text"],
    ignoreDefaultArgs: ["--hide-scrollbars"],
  },
);
server.close();
if (cli.values.update) {
  // The pages not run keep what they had.
  const next = { browser: browserVersion, pages: { ...baseline.pages, ...figures } };
  next.pages = Object.fromEntries(Object.entries(next.pages).toSorted(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(BASELINE, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`${path.relative(process.cwd(), BASELINE)} written`);
}
process.exit(failed ? 1 : 0);
