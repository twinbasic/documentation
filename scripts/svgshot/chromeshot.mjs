// Turns what the Chrome extension (chrome/) saved into a picture: X.png and X.light.png under
// docs/, the SVG drawn from each one's bundle, judged against its PNG and written or removed as
// shoot_docs.mjs --svg does, and the bundle in the bundle cache, from which replay.mjs draws the
// SVG again after a change to the converter. A capture holds what the page held, so it is read
// only from outside docs/ and from where git would not take it, and no word of private-list.mjs
// may be in what is published: every picture of a capture is checked before any file is written.
//
// With --take it is how such a picture is taken, as far as a tool can take one: only the person
// signed in can (WIP.Screenshots.md). It brings the extension in its own folder up to date, opens
// each picture's page in the default browser, says what to set up, and waits for the capture
// the person saves. With --stage and --events it is a run of the screenshot review tool, as
// shoot_docs.mjs is, and reports each picture as that does.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import {
  CliError,
  exitOnCrash,
  parseCli,
  printHelpAndExit,
  refuseTogether,
  regexOption,
  withUsageError,
} from "../../lib/cli.mjs";
import { REPO_ROOT } from "../../lib/repo-paths.mjs";
import { onStop, writeRecord } from "../lib/record-lines.mjs";
import { applyPicture, applySvg, restoreSvg, svgOf } from "../lib/shot-apply.mjs";
import { decodePng } from "../lib/png.mjs";
import { NOISE_LEVELS, pngsNear, shareOff, strengthOf } from "../lib/shot-change.mjs";
import { hashOf, MANIFEST, openManifest, svgDecision } from "../lib/shot-manifest.mjs";
import { bundleFollowsSvg, decidePicture, svgFollowsPng } from "../lib/shot-policy.mjs";
import { reviewPicture, reviewSvg } from "../lib/shot-queue.mjs";
import { openRevision, outputRefusal } from "../lib/shot-revision.mjs";
import {
  pngVerdict,
  stageCapture,
  stageFolders,
  stageRefusal,
  stageSvg,
  svgVerdict,
  writeVerdict,
} from "../lib/shot-stage.mjs";
import { BUNDLE_CACHE, BUNDLE_VERSION, defaultBundleCache, renderBundle, writeBundle } from "./bundle.mjs";
import {
  captureWatcher,
  capturesFolder,
  DEFAULT_EXTENSION,
  extensionStep,
  installExtension,
  openPage,
  takeRefusal,
  tellPanel,
} from "./chrome-take.mjs";
import { useSubsetCache } from "./fonts.mjs";
import { judgeSvg, sameSvgAs, sameWhy } from "./keep.mjs";
import { PRIVATE_FILE, privateWords } from "./private-list.mjs";
import { drawnWords, heldWords } from "./private-words.mjs";
import { inBrowser, staleBundle, writeJudged } from "./redraw.mjs";
import { SHOTS } from "./chrome/shots.mjs";
import { trimArea, trimPicture } from "./trim.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/svgshot/chromeshot.mjs <capture | folder>... [--out <dir>] [--bundles <dir>] [--diffs <dir>] [--words <file>] [--no-trim] [-h, --help]
       node scripts/svgshot/chromeshot.mjs --take <regex> [--captures <dir>] [--extension <dir>] [--no-open] [--stage <dir>] [--events] [--against <rev>] [--out <dir>] [--bundles <dir>] [--diffs <dir>] [--words <file>]

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

With --take, for each picture of the panel's table that <regex> matches, in the
table's order: brings the extension up to date in its own folder, opens the
picture's page in the default browser, says what to set up, and waits for its
capture in the folder the browser saves to, which it treats as above. A capture that
is refused is said why, and the picture is waited for again. Stop with Ctrl+C, or
with --events a line "stop" on stdin: pictures not taken are left as they are.

  --out <dir>        the folder the pictures are in (default docs)
  --bundles <dir>    the bundle cache (default .svgshot-bundles in the repository);
                     refused under docs and where git would take it
  --diffs <dir>      write each SVG's render, the picture drawn again as a PNG, and
                     its difference map there, as <name>.svg-render.png and
                     <name>.svg-diff.png, and say how far the render is from the
                     screenshot by the rule for two captures
  --words <file>     the list of private words (default scripts/svgshot/private.json)
  --no-trim          keep the whole window
  --take <regex>     take the pictures of the table whose path under docs matches
  --captures <dir>   where the browser saves captures (default svgshot in Windows'
                     Downloads folder)
  --extension <dir>  the extension's own folder, which Chrome loads
                     (default ${DEFAULT_EXTENSION})
  --no-open          open no page: a person is to, or a test stands in for one
  --stage <dir>      with --take: write nothing under the pictures' folder or to the
                     bundle cache: put each candidate in <dir> for the screenshot
                     review tool to apply (scripts/lib/shot-stage.mjs). Not with --diffs
  --events           with --take: also write a line per event on stdout, @@shot-event
                     {json}, and stop when a line "stop" arrives on stdin
  --against <rev>    compare with the pictures of this revision (default HEAD)
  -h, --help         print this text and exit

Exit codes:
  0  every capture was written, or left the pictures as they are
  1  a capture was refused, or could not be drawn
  2  the tool could not run: a refused command line, or a capture that cannot be read`;

const { values, positionals } = withUsageError(() => {
  const parsed = parseCli(process.argv.slice(2), {
    options: {
      out: { type: "string" },
      bundles: { type: "string" },
      diffs: { type: "string" },
      words: { type: "string" },
      "no-trim": { type: "boolean", default: false },
      take: { type: "string" },
      captures: { type: "string" },
      extension: { type: "string" },
      "no-open": { type: "boolean", default: false },
      stage: { type: "string" },
      events: { type: "boolean", default: false },
      against: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    positionals: { min: 0 },
    stopAt: ["help"],
  });
  if (parsed.values.help) return parsed;
  const taking = parsed.values.take !== undefined;
  // What a run of --take is told and a run over named captures is not, and the other way about.
  for (const [option, given] of [
    ["--captures", parsed.values.captures !== undefined],
    ["--extension", parsed.values.extension !== undefined],
    ["--no-open", parsed.values.noOpen],
    ["--stage", parsed.values.stage !== undefined],
    ["--events", parsed.values.events],
    ["--against", parsed.values.against !== undefined],
  ])
    if (given && !taking) throw new CliError("conflict", `${option} goes with --take`);
  if (taking) {
    refuseTogether(parsed.values, ["take", "no-trim"]);
    refuseTogether(parsed.values, ["stage", "diffs"]);
    regexOption(parsed.values.take, { option: "--take" });
    if (parsed.positionals.length) throw new CliError("conflict", "--take takes no capture: it waits for them");
  } else if (!parsed.positionals.length)
    throw new CliError("missing-positional", "expected at least 1 argument, got 0", { count: 0 });
  return parsed;
});
if (values.help) printHelpAndExit(USAGE);
const die = (text) => {
  console.error(`chromeshot: ${text}`);
  process.exit(2);
};
const docs = path.join(REPO_ROOT, "docs");
const outRoot = path.resolve(values.out ?? docs);
const stageRoot = values.stage === undefined ? null : path.resolve(values.stage);
if (stageRoot) {
  const refused = stageRefusal(stageRoot, [docs, outRoot]);
  if (refused) die(`--stage: ${refused}`);
  mkdirSync(stageRoot, { recursive: true });
}
const staged = stageRoot ? stageFolders(stageRoot) : null;
const dryRun = !!stageRoot;
const bundleCache = path.resolve(values.bundles ?? BUNDLE_CACHE);
const bundlesRoot = staged ? staged.bundles : bundleCache;
const diffsRoot = staged ? staged.diffs : values.diffs === undefined ? null : path.resolve(values.diffs);
// The cache itself is ignored, and git says so of a folder only once it is there.
const refused = values.bundles && outputRefusal(bundleCache, [docs, outRoot]);
if (refused) die(`--bundles: ${refused}`);
// Each file named, and each capture in a folder named.
const files = positionals.flatMap((name) => {
  if (!existsSync(name)) die(`no such capture: ${name}`);
  if (!statSync(name).isDirectory()) return [name];
  const found = readdirSync(name).filter((f) => f.endsWith(".capture.json.gz"));
  if (!found.length) die(`no capture in ${name}`);
  return found.map((f) => path.join(name, f));
});
const capturesRoot = values.take === undefined ? null : path.resolve(values.captures ?? capturesFolder());
for (const file of files) {
  const why = outputRefusal(path.dirname(path.resolve(file)), [docs, outRoot]);
  if (why) die(`${file}: a capture holds what the page held, and ${why}`);
}
if (capturesRoot) {
  const why = outputRefusal(capturesRoot, [docs, outRoot]);
  if (why) die(`--captures: a capture holds what the page held, and ${why}`);
}

// --events: a record per event on stdout (lib/record-lines.mjs).
const event = (type, value = {}) => {
  if (values.events) writeRecord("shot-event", { type, ...value });
};

// The picture of each theme of a capture of `out`: X.png, and X.light.png beside a dark one. One
// light picture alone is X.png, which the site shows in both themes.
const themedOut = (out, theme, count) => (theme === "light" && count > 1 ? out.replace(/\.png$/i, ".light.png") : out);

/** The capture in the file `file`, read and checked: {out, url, taken, pictures}. Throws on what is none. */
function readCapture(file) {
  let capture;
  try {
    capture = JSON.parse(gunzipSync(readFileSync(file)).toString("utf8"));
  } catch (e) {
    throw new Error(`${file} is no capture: ${e.message}`);
  }
  if (capture.format !== 1 || !Array.isArray(capture.pictures)) throw new Error(`${file} is no capture of format 1`);
  const { out } = capture;
  if (
    typeof out !== "string" ||
    !/\.png$/i.test(out) ||
    out.split("/").some((p) => p === ".." || !p) ||
    /[\\:]/.test(out)
  )
    throw new Error(`${file} names a picture no path under docs can be: ${out}`);
  return capture;
}

// A worktree's default cache is filled from the main checkout's the first time, once the command
// line has passed.
if (values.bundles === undefined) defaultBundleCache("chromeshot");
const manifest = outRoot === docs ? openManifest(MANIFEST) : null;
const words = privateWords({ file: values.words ? path.resolve(values.words) : PRIVATE_FILE });
useSubsetCache(path.join(bundleCache, "subsets"));
const AGAINST = values.against ?? "HEAD";
let revision = null;
try {
  revision = openRevision(outRoot, AGAINST);
} catch (e) {
  // A folder outside the repository has no revision to compare with.
  if (values.against !== undefined) die(`--against: ${e.message}`);
}

const say = (out, line) => console.log(`${out}: ${line}`);
const entryOf = (out) => manifest?.entry(out) ?? null;

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

// With --stage or --events, the verdict on the picture `p`'s capture (decidePicture's `fate`), as
// shoot_docs.mjs's reportPicture has it: `reference` the picture it was judged against. A picture
// of a browser was taken on no build of the IDE.
function reportPicture(job, p, fate, reference, restoredSvg = null) {
  if (!stageRoot && !values.events) return;
  const review = reviewPicture(fate, p.png, reference, entryOf(p.out));
  const files = stageRoot ? stageCapture(stageRoot, p.out, p.png, review.strength) : null;
  const part = { ...pngVerdict({ decision: fate, review, build: null, diffs: [], staged: files }), restoredSvg };
  if (stageRoot) writeVerdict(stageRoot, p.out, "png", part);
  event("picture", { job, out: p.out, ...part });
}

// How many SVGs a run wrote, and how many were left out, for its summary.
const svgCounts = { written: 0, left: 0 };

// The SVG of the picture `p`, whose PNG went as `fate` says: written with its PNG, as shoot_docs.mjs's
// keepSvg says, and its bundle kept with it. With --stage the SVG, its strength map and its bundle
// go to the stage, whether or not it is faithful, and nothing else is written.
async function keepSvg(job, p, fate, holds, browser) {
  const svgOut = svgOf(p.out);
  const file = path.join(outRoot, svgOut);
  const report = (part) => {
    if (stageRoot) writeVerdict(stageRoot, p.out, "svg", part);
    event("svg", { job, out: p.out, ...part });
  };
  if (fate.state === "restored") {
    report(svgVerdict({ state: "unchanged", why: `its PNG is ${AGAINST}'s` }));
    return;
  }
  const entry = entryOf(p.out);
  const svgOnDisk = existsSync(file);
  const written = fate.state === "new" || fate.state === "updated";
  const accepted = svgDecision(entry, p.svg, p.png) === true;
  let stale = null;
  if (!written && svgOnDisk && !accepted) {
    try {
      stale = staleBundle({ bundlesRoot: bundleCache, docsRoot: outRoot, out: p.out });
    } catch (e) {
      stale = { retake: e.message };
    }
  }
  let staysWhy = null;
  // The baseline's SVG, which an SVG the same picture as it, to the pixel, goes back to
  // (keep.mjs's sameSvgAs), as shoot_docs.mjs's keepSvg has it; and what a run says of one found so.
  const baseText = revision?.bytes(svgOut)?.toString("utf8") ?? null;
  const reportSame = (same, fileText, judged = {}) => {
    const why = sameWhy(same, AGAINST);
    const state = same === "baseline" ? restoreSvg(outRoot, revision, svgOut, { dryRun }) : "unchanged";
    say(svgOut, `${state} (${why})`);
    report(
      svgVerdict({
        ...judged,
        state,
        why,
        same:
          same === "baseline" ? { as: "baseline", baseline: revision.hash } : { as: "file", file: hashOf(fileText) },
      }),
    );
  };
  const follows = svgFollowsPng({ written, svgOnDisk, accepted, stale });
  if (!follows && svgOnDisk && baseText !== null) {
    // the file's SVG stays with its PNG, but when it is the baseline's picture its bytes go back
    const fileText = readFileSync(file, "utf8");
    if ((await sameSvgAs(browser, { file: fileText, baseline: baseText })) === "baseline") {
      reportSame("baseline", fileText);
      return;
    }
  }
  if (!follows) {
    staysWhy = "its PNG is not written";
    const same = !stageRoot && bundleFollowsSvg({ svg: p.svg, svgOnDisk: readFileSync(file, "utf8") });
    if (same) writeBundle(bundlesRoot, p.out, p.bundle, holds, p.misses);
    say(svgOut, `unchanged, as its PNG is${same ? "; the same SVG, its bundle cached" : ""}`);
    if (!stageRoot) {
      report(svgVerdict({ state: "unchanged", why: staysWhy }));
      return;
    }
  }
  writeBundle(bundlesRoot, p.out, p.bundle, holds, p.misses);
  const { diff, verdict, faithful, measures } = await judgeSvg(browser, p.svg, p.png, p.stats, entry);
  // With --diffs, the picture drawn again as a PNG, and how far that is from the screenshot by
  // the rule for two captures, which has no shift of a pixel to allow for the edge of a glyph.
  let asPng = "";
  let diffs = [];
  if (diffsRoot) {
    diffs = Object.values(writeJudged(diffsRoot, p.out, diff, { render: true }));
    const off = shareOff(strengthOf(decodePng(diff.render), decodePng(p.png)), { level: NOISE_LEVELS });
    asPng = `; as a PNG, ${off}% of its pixels are over ${NOISE_LEVELS} levels off the screenshot`;
  }
  const judged = {
    verdict,
    review: stageRoot || values.events ? reviewSvg(verdict, diff.strength, entry) : null,
    stats: diff.stats,
    measures,
    diffs,
    staged: stageRoot ? stageSvg(stageRoot, p.out, p.svg, diff.strength) : null,
  };
  if (staysWhy) {
    // what stays with its PNG needs no look until a review takes the capture
    report(svgVerdict({ state: "unchanged", why: staysWhy, ...judged, review: { ...judged.review, look: null } }));
    return;
  }
  if (faithful) {
    // the same picture as the baseline's SVG or the file's, to the pixel: those bytes stay
    const fileText = svgOnDisk ? readFileSync(file, "utf8") : null;
    const same = await sameSvgAs(browser, { svg: p.svg, file: fileText, baseline: baseText });
    if (same) {
      svgCounts.written++;
      reportSame(same, fileText, judged);
      return;
    }
  }
  const state = applySvg(outRoot, svgOut, faithful ? p.svg : null, { dryRun });
  svgCounts[faithful ? "written" : "left"]++;
  say(svgOut, `${faithful ? state : `${state}, the PNG is kept`} (${measures}${asPng})`);
  report(svgVerdict({ state, why: faithful ? null : measures, ...judged }));
}

// Writes one capture's pictures, the dark one's first; with --stage, stages them. `job` is what
// its events are under. Returns whether all went well.
async function writeCapture({ file, drawn }, browser, job) {
  let dark = null;
  for (const p of drawn) {
    const was = existsSync(path.join(outRoot, p.out)) ? readFileSync(path.join(outRoot, p.out)) : null;
    const atRevision = revision?.bytes(p.out) ?? null;
    const fate = decidePicture({
      png: p.png,
      theme: p.theme,
      dark,
      revision: atRevision,
      disk: was,
      near: pngsNear,
      entry: entryOf(p.out),
    });
    if (fate.state === "too-far") {
      console.error(
        `${file}: refused: the light picture is ${fate.size.w}x${fate.size.h} px, the dark one ${fate.dark.w}x${fate.dark.h} px`,
      );
      return false;
    }
    // the picture the capture was judged against, which its regions of change are measured on
    const reference = { revision: atRevision, disk: was, dark }[fate.against] ?? null;
    if (fate.state === "dark") {
      const { removed } = applyPicture(outRoot, p.out, fate, revision, { svg: true, bundlesRoot, dryRun });
      say(p.out, `the dark picture's pixels, but for a capture's noise: ${removed ? "removed" : "not written"}`);
      reportPicture(job, p, fate, reference);
      continue;
    }
    const applied = applyPicture(outRoot, p.out, fate, revision, { dryRun });
    const { w, h } = fate.size;
    say(p.out, `${fate.state} (${w}x${h} px; shown at {:width="${Math.round(w / 2)}" height="${Math.round(h / 2)}"})`);
    reportPicture(job, p, fate, reference, applied.svg);
    await keepSvg(job, p, fate, fate.write ?? was ?? p.png, browser);
    if (p.theme === "dark") dark = p.png;
  }
  return true;
}

// The picture of `shot` taken, waiting for its capture in `watcher` or finding it in `held`, the
// captures that came early: true once it is written, null when `stop` was aborted first. A
// capture that is refused is said why, and the next one is waited for.
async function takeShot(shot, watcher, held, wanted, stop) {
  const refuse = (why) => {
    say(shot.name, `refused: ${why}. Take it again.`);
    event("refused", { job: shot.name, out: shot.out, error: why });
  };
  for (;;) {
    const file = held.get(shot.out) ?? (await watcher.next(stop.signal));
    if (!file) return null;
    held.delete(shot.out);
    let capture;
    try {
      capture = readCapture(file);
    } catch (e) {
      refuse(e.message);
      continue;
    }
    if (capture.out !== shot.out) {
      if (wanted.has(capture.out)) held.set(capture.out, file);
      say(
        shot.name,
        `a capture of ${capture.out} arrived${wanted.has(capture.out) ? ": kept for its turn" : ", which this run does not take"}`,
      );
      continue;
    }
    const why = takeRefusal(capture, shot);
    if (why) {
      refuse(why);
      continue;
    }
    let drawn;
    try {
      const made = await drawCapture(trimCapture(capture));
      if (made.why) {
        refuse(made.why);
        continue;
      }
      drawn = made.drawn;
    } catch (e) {
      refuse(e.message);
      continue;
    }
    let written = false;
    let fault = null;
    await inBrowser([{ file, drawn }], async (ready, browser) => {
      try {
        written = await writeCapture(ready, browser, shot.name);
      } catch (e) {
        fault = e.message;
      }
    });
    if (written) return true;
    refuse(fault ?? "the light and the dark picture differ by more than the theme's layout moves");
  }
}

// Takes the pictures of the table that --take matches, one after the other. Returns the exit code.
async function takeShots() {
  const started = Date.now();
  const only = regexOption(values.take, { option: "--take" });
  const shots = SHOTS.filter((s) => only.test(s.out));
  if (!shots.length) die(`--take: no picture of the table matches ${values.take}`);
  const lightOf = (out) => out.replace(/\.png$/i, ".light.png");
  const pictures = (shot) => [shot.out, lightOf(shot.out)];
  const folder = path.resolve(values.extension ?? DEFAULT_EXTENSION);
  let extension;
  try {
    extension = installExtension(folder);
    tellPanel(folder, null);
  } catch (e) {
    die(`--extension: ${e.message}`);
  }
  const step = extensionStep(extension);
  console.log(`the extension is in ${folder}: ${extension.changed.length} file(s) brought up to date`);
  if (step) console.log(step);
  event("run", {
    tool: "chromeshot",
    build: null,
    against: revision ? revision.short : null,
    svg: true,
    stage: stageRoot,
    captures: capturesRoot,
    extension: { folder, step },
    jobs: shots.map((s) => ({ name: s.name, setup: "browser", pictures: pictures(s) })),
  });
  const stop = new AbortController();
  if (values.events)
    onStop(process.stdin, () => {
      console.log("stopping: no further capture is waited for");
      event("stopping");
      stop.abort();
    });
  const watcher = captureWatcher(capturesRoot);
  const wanted = new Set(shots.map((s) => s.out));
  const held = new Map();
  let taken = 0;
  for (const shot of shots) {
    if (stop.signal.aborted) {
      for (const out of pictures(shot)) event("skipped", { job: shot.name, out });
      continue;
    }
    event("job", { job: shot.name, state: "started" });
    tellPanel(folder, shot.name);
    say(shot.name, shot.shows);
    event("await", { job: shot.name, out: shot.out, url: shot.url, shows: shot.shows });
    if (!values.noOpen) openPage(shot.url);
    say(
      shot.name,
      `${values.noOpen ? "take it on" : "opened"} ${shot.url}; waiting for its capture in ${capturesRoot}`,
    );
    const done = await takeShot(shot, watcher, held, wanted, stop);
    if (done) taken++;
    else for (const out of pictures(shot)) event("skipped", { job: shot.name, out });
    event("job", { job: shot.name, state: done ? "done" : "waiting" });
  }
  tellPanel(folder, null);
  event("summary", {
    taken,
    svg: svgCounts,
    seconds: (Date.now() - started) / 1000,
    stopped: stop.signal.aborted,
    problems: [],
    exit: 0,
  });
  return 0;
}

if (values.take !== undefined) process.exit(await takeShots());

// Every capture is read and checked before anything is written and before a browser starts.
let failed = 0;
const ready = [];
for (const file of files) {
  let capture;
  try {
    capture = readCapture(file);
  } catch (e) {
    die(e.message);
  }
  let why;
  let drawn;
  try {
    ({ why, drawn } = await drawCapture(trimCapture(capture)));
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
      if (!(await writeCapture(capture, browser, null))) failed++;
    } catch (e) {
      failed++;
      console.error(`${capture.file}: ${e.message}`);
    }
  });
process.exit(failed ? 1 : 0);
