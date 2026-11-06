// Turns what the Chrome extension (chrome/) saved into a picture: X.png and X.light.png under
// docs/, the SVG drawn from each one's bundle, judged against its PNG and written or removed as
// shoot_docs.mjs --svg does, and the bundle in the bundle cache, from which replay.mjs draws the
// SVG again after a change to the converter. A capture holds what the page held, so it is read
// only from outside docs/ and from where git would not take it, and no word of private-list.mjs
// may be in what is published: every picture of a capture is checked before any file is written.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../../lib/cli.mjs";
import { REPO_ROOT } from "../../lib/repo-paths.mjs";
import { applyPicture, applySvg, svgOf } from "../lib/shot-apply.mjs";
import { decodePng } from "../lib/png.mjs";
import { NOISE_LEVELS, pngsNear, shareOff, strengthOf } from "../lib/shot-change.mjs";
import { MANIFEST, openManifest, svgDecision } from "../lib/shot-manifest.mjs";
import { bundleFollowsSvg, decidePicture, svgFollowsPng } from "../lib/shot-policy.mjs";
import { openRevision, outputRefusal } from "../lib/shot-revision.mjs";
import { BUNDLE_CACHE, BUNDLE_VERSION, renderBundle, writeBundle } from "./bundle.mjs";
import { useSubsetCache } from "./fonts.mjs";
import { judgeSvg } from "./keep.mjs";
import { PRIVATE_FILE, privateWords } from "./private-list.mjs";
import { drawnWords, heldWords } from "./private-words.mjs";
import { inBrowser, staleBundle, writeJudged } from "./redraw.mjs";
import { SHOTS } from "./chrome/shots.mjs";
import { trimArea, trimPicture } from "./trim.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/svgshot/chromeshot.mjs <capture | folder>... [--out <dir>] [--bundles <dir>] [--diffs <dir>] [--words <file>] [--no-trim] [-h, --help]

Turns each file the Chrome extension saved (<name>.capture.json.gz, in the svgshot
folder of the browser's downloads) into its picture: writes X.png, and X.light.png
when both themes were taken, as shoot_docs.mjs writes a capture (one within a
capture's noise of the picture is not written), draws each SVG from its bundle,
writes it beside its PNG when no more than the bar's share of its pixels are far
off, and keeps the bundle in the bundle cache for replay.mjs. Takes no picture;
needs Python with fontTools, as --svg does. A folder stands for every capture in it.

A capture of the whole window, of a picture the panel's table gives a trim
(chrome/shots.mjs), is cut down first to the box round the elements the table names
and the marks, found in the capture, so that each retake is aligned alike. A picture
whose area was not in the window is refused. A dragged rectangle is left as it is.

A capture is refused when it is under docs or where git would take it, is of a
format the converter does not read, or shows a word no published picture may show:
the Windows user name, git's user.name and user.email, and each word of
scripts/svgshot/private.json. Nothing of a refused capture is written.

  --out <dir>      the folder the pictures are in (default docs)
  --bundles <dir>  the bundle cache (default .svgshot-bundles in the repository);
                   refused under docs and where git would take it
  --diffs <dir>    write each SVG's render, the picture drawn again as a PNG, and
                   its difference map there, as <name>.svg-render.png and
                   <name>.svg-diff.png, and say how far the render is from the
                   screenshot by the rule for two captures
  --words <file>   the list of private words (default scripts/svgshot/private.json)
  --no-trim        keep the whole window
  -h, --help       print this text and exit

Exit codes:
  0  every capture was written, or left the pictures as they are
  1  a capture was refused, or could not be drawn
  2  the tool could not run: a refused command line, or a capture that cannot be read`;

const { values, positionals } = withUsageError(() =>
  parseCli(process.argv.slice(2), {
    options: {
      out: { type: "string" },
      bundles: { type: "string" },
      diffs: { type: "string" },
      words: { type: "string" },
      "no-trim": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    positionals: { min: 1 },
    stopAt: ["help"],
  }),
);
if (values.help) printHelpAndExit(USAGE);
const die = (text) => {
  console.error(`chromeshot: ${text}`);
  process.exit(2);
};
const docs = path.join(REPO_ROOT, "docs");
const outRoot = path.resolve(values.out ?? docs);
const bundlesRoot = path.resolve(values.bundles ?? BUNDLE_CACHE);
const diffsRoot = values.diffs === undefined ? null : path.resolve(values.diffs);
// The cache itself is ignored, and git says so of a folder only once it is there.
const refused = values.bundles && outputRefusal(bundlesRoot, [docs, outRoot]);
if (refused) die(`--bundles: ${refused}`);
// Each file named, and each capture in a folder named.
const files = positionals.flatMap((name) => {
  if (!existsSync(name)) die(`no such capture: ${name}`);
  if (!statSync(name).isDirectory()) return [name];
  const found = readdirSync(name).filter((f) => f.endsWith(".capture.json.gz"));
  if (!found.length) die(`no capture in ${name}`);
  return found.map((f) => path.join(name, f));
});
for (const file of files) {
  const why = outputRefusal(path.dirname(path.resolve(file)), [docs, outRoot]);
  if (why) die(`${file}: a capture holds what the page held, and ${why}`);
}

// The picture of each theme of a capture of `out`: X.png, and X.light.png beside a dark one. One
// light picture alone is X.png, which the site shows in both themes.
const themedOut = (out, theme, count) => (theme === "light" && count > 1 ? out.replace(/\.png$/i, ".light.png") : out);

/** The capture in the file `file`, read and checked: {out, url, taken, pictures}. */
function readCapture(file) {
  let capture;
  try {
    capture = JSON.parse(gunzipSync(readFileSync(file)).toString("utf8"));
  } catch (e) {
    die(`${file} is no capture: ${e.message}`);
  }
  if (capture.format !== 1 || !Array.isArray(capture.pictures)) die(`${file} is no capture of format 1`);
  const { out } = capture;
  if (
    typeof out !== "string" ||
    !/\.png$/i.test(out) ||
    out.split("/").some((p) => p === ".." || !p) ||
    /[\\:]/.test(out)
  )
    die(`${file} names a picture no path under docs can be: ${out}`);
  return capture;
}

const manifest = outRoot === docs ? openManifest(MANIFEST) : null;
const words = privateWords({ file: values.words ? path.resolve(values.words) : PRIVATE_FILE });
useSubsetCache(path.join(bundlesRoot, "subsets"));
let revision = null;
try {
  revision = openRevision(outRoot, "HEAD");
} catch {
  // A folder outside the repository has no revision to compare with.
}

const say = (out, line) => console.log(`${out}: ${line}`);

// The capture cut down to its picture's area, both themes alike, when it is of the whole window
// and the table gives the picture a trim.
function trimCapture(capture) {
  const trim = SHOTS.find((s) => s.out === capture.out)?.trim;
  if (trim && capture.area !== "viewport") say(capture.out, "not trimmed: this capture is a dragged rectangle");
  if (trim && !capture.marked) say(capture.out, "no marks: Draw the markings was off, or each was left out");
  if (values.noTrim || capture.area !== "viewport" || !trim) return capture;
  const area = trimArea(capture.pictures[0].bundle, trim, capture.marked);
  const pictures = capture.pictures.map((p) => trimPicture(p, area));
  say(capture.out, `trimmed to ${area.w}x${area.h} CSS px at ${area.x},${area.y} from the window`);
  return { ...capture, pictures };
}

// Why the capture cannot be published: {why}, else each picture with its SVG, drawn from the
// bundle as a later replay.mjs draws it, and its path under the output folder.
async function drawCapture(capture) {
  const drawn = [];
  for (const { theme, png, bundle } of capture.pictures) {
    const out = themedOut(capture.out, theme, capture.pictures.length);
    if (bundle.version !== BUNDLE_VERSION)
      return { why: `${out}: a bundle of format ${bundle.version}, and the converter reads ${BUNDLE_VERSION}` };
    const shown = drawnWords(bundle, words);
    if (shown.length) return { why: `${out}: its page shows ${shown.join(", ")}` };
    const { svg, stats, misses } = await renderBundle(bundle);
    const held = heldWords(svg, words);
    if (held.length) return { why: `${out}: its SVG holds ${held.join(", ")}` };
    drawn.push({ theme, out, png: Buffer.from(png, "base64"), bundle, svg, stats, misses });
  }
  return { drawn };
}

// The SVG of the picture `p`, whose PNG went as `fate` says: written with its PNG, as shoot_docs.mjs's
// keepSvg says, and its bundle kept with it.
async function keepSvg(p, fate, holds, browser) {
  const svgOut = svgOf(p.out);
  const file = path.join(outRoot, svgOut);
  if (fate.state === "restored") return;
  const entry = manifest?.entry(p.out) ?? null;
  const svgOnDisk = existsSync(file);
  const written = fate.state === "new" || fate.state === "updated";
  const accepted = svgDecision(entry, p.svg, p.png) === true;
  let stale = null;
  if (!written && svgOnDisk && !accepted) {
    try {
      stale = staleBundle({ bundlesRoot, docsRoot: outRoot, out: p.out });
    } catch (e) {
      stale = { retake: e.message };
    }
  }
  if (!svgFollowsPng({ written, svgOnDisk, accepted, stale })) {
    const same = bundleFollowsSvg({ svg: p.svg, svgOnDisk: readFileSync(file, "utf8") });
    if (same) writeBundle(bundlesRoot, p.out, p.bundle, holds, p.misses);
    say(svgOut, `unchanged, as its PNG is${same ? "; the same SVG, its bundle cached" : ""}`);
    return;
  }
  writeBundle(bundlesRoot, p.out, p.bundle, holds, p.misses);
  const { diff, faithful, measures } = await judgeSvg(browser, p.svg, p.png, p.stats, entry);
  // With --diffs, the picture drawn again as a PNG, and how far that is from the screenshot by
  // the rule for two captures, which has no shift of a pixel to allow for the edge of a glyph.
  let asPng = "";
  if (diffsRoot) {
    writeJudged(diffsRoot, p.out, diff, { render: true });
    const off = shareOff(strengthOf(decodePng(diff.render), decodePng(p.png)), { level: NOISE_LEVELS });
    asPng = `; as a PNG, ${off}% of its pixels are over ${NOISE_LEVELS} levels off the screenshot`;
  }
  const state = applySvg(outRoot, svgOut, faithful ? p.svg : null);
  say(svgOut, `${faithful ? state : `${state}, the PNG is kept`} (${measures}${asPng})`);
}

// Writes one capture's pictures, the dark one's first. Returns whether all went well.
async function writeCapture({ file, drawn }, browser) {
  let dark = null;
  for (const p of drawn) {
    const was = existsSync(path.join(outRoot, p.out)) ? readFileSync(path.join(outRoot, p.out)) : null;
    const fate = decidePicture({
      png: p.png,
      theme: p.theme,
      dark,
      revision: revision?.bytes(p.out) ?? null,
      disk: was,
      near: pngsNear,
      entry: manifest?.entry(p.out) ?? null,
    });
    if (fate.state === "too-far") {
      console.error(
        `${file}: refused: the light picture is ${fate.size.w}x${fate.size.h} px, the dark one ${fate.dark.w}x${fate.dark.h} px`,
      );
      return false;
    }
    if (fate.state === "dark") {
      const { removed } = applyPicture(outRoot, p.out, fate, revision, { svg: true, bundlesRoot });
      say(p.out, `the dark picture's pixels, but for a capture's noise: ${removed ? "removed" : "not written"}`);
      continue;
    }
    applyPicture(outRoot, p.out, fate, revision);
    const { w, h } = fate.size;
    say(p.out, `${fate.state} (${w}x${h} px; shown at {:width="${Math.round(w / 2)}" height="${Math.round(h / 2)}"})`);
    await keepSvg(p, fate, fate.write ?? was ?? p.png, browser);
    if (p.theme === "dark") dark = p.png;
  }
  return true;
}

// Every capture is read and checked before anything is written and before a browser starts.
let failed = 0;
const ready = [];
for (const file of files) {
  let why;
  let drawn;
  try {
    ({ why, drawn } = await drawCapture(trimCapture(readCapture(file))));
  } catch (e) {
    why = e.message;
  }
  if (why) {
    failed++;
    console.error(`${file}: refused, nothing written: ${why}`);
  } else ready.push({ file, drawn });
}
if (ready.length)
  await inBrowser(ready, async (capture, browser) => {
    try {
      if (!(await writeCapture(capture, browser))) failed++;
    } catch (e) {
      failed++;
      console.error(`${capture.file}: ${e.message}`);
    }
  });
process.exit(failed ? 1 : 0);
