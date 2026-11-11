// Draws each picture's SVG again from its bundle (bundle.mjs), the converter as it
// is now, without taking the picture again: what to run after a change to the
// converter, in place of shoot_docs.mjs --svg. Each SVG is judged against its PNG
// and written or removed as shoot_docs.mjs does (keep.mjs, lib/shot-policy.mjs's decideSvg,
// lib/shot-apply.mjs's applySvg).
//
// A bundle answers only what the converter asked when the picture was taken. A
// picture is left as it is, and listed as needing a retake, when its PNG is no
// longer the one its bundle was taken with, when its bundle is of another format
// (BUNDLE_VERSION: the converter reads more from the page than that bundle holds,
// and nothing shows which pictures it reaches), when its bundle lacks a computed
// style the converter now reads, or when the converter asks a question its bundle
// has no answer for (a miss the capture did not have). The list ends with the
// shoot_docs.mjs command that takes them again.

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  exitOnCrash,
  numberOption,
  parseCli,
  printHelpAndExit,
  refuseTogether,
  regexOption,
  withUsageError,
} from "../../lib/cli.mjs";
import { REPO_ROOT } from "../../lib/repo-paths.mjs";
import { BUNDLE_CACHE, defaultBundleCache, listBundles } from "./bundle.mjs";
import { useSubsetCache } from "./fonts.mjs";
import { applySvg, restoreSvg, svgOf } from "../lib/shot-apply.mjs";
import { hashOf, MANIFEST, openManifest } from "../lib/shot-manifest.mjs";
import { openRevision } from "../lib/shot-revision.mjs";
import { SVG_FAITHFUL } from "../lib/shot-policy.mjs";
import { reviewSvg } from "../lib/shot-queue.mjs";
import { stageFolders, stageRefusal, stageSvg, svgVerdict, writeVerdict } from "../lib/shot-stage.mjs";
import { onStop, writeRecord } from "../lib/record-lines.mjs";
import { judgeSvg, sameSvgAs, sameWhy } from "./keep.mjs";
import { privateWords } from "./private-list.mjs";
import {
  defaultJobs,
  inBrowser,
  redraw,
  reportShard,
  retakeText,
  runShards,
  shardOf,
  shareOf,
  writeJudged,
} from "./redraw.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/svgshot/replay.mjs [--only <regex>] [--bundles <dir>] [--out <dir>] [--diffs <dir> | --stage <dir>] [--events] [--recheck] [--against <rev>] [--jobs N] [-h, --help]

Draws each picture's SVG again from the bundle shoot_docs.mjs --svg saved when it
took the picture, with the converter as it is now, and writes it beside its PNG
as shoot_docs.mjs does: written when no more than ${SVG_FAITHFUL}% of its pixels
are far off the PNG's and its bytes differ from the file's, else not written and
an older one removed. An SVG that draws the same pixels as the revision's
SVG (--against) puts the revision's bytes back, and one that draws the same
pixels as the file's leaves the file as it is. Takes no picture and starts no IDE; needs Python with
fontTools, as --svg does.

A picture's entry in test/shots/manifest.json changes its bar, and a review's
decision about the same SVG against the same PNG takes the bar's place, as in
shoot_docs.mjs. The manifest is read only for the default --out.

A picture whose PNG is not the one its bundle was taken with, whose bundle is of
another format than the converter reads, whose bundle lacks a computed style the
converter now reads, or for which the converter asks something its bundle cannot
answer, is left as it is and listed as needing a retake, with the shoot_docs.mjs
command that takes them again.

  --only <regex>   only the pictures whose path under docs (with .light for a
                   light one) matches
  --bundles <dir>  the bundle cache (default .svgshot-bundles in the repository)
  --out <dir>      the folder the pictures are in (default docs)
  --diffs <dir>    write each SVG's difference map there, as <name>.svg-diff.png
  --against <rev>  the git revision whose SVG a drawn SVG is compared with
                   first (default HEAD); git runs in the --out folder, and a
                   folder outside a git working tree compares with the file only
  --recheck        compare every SVG with its PNG, also one that is the same
                   bytes as the file (which the bar passed when it was written)
  --stage <dir>    write nothing under the output folder: put each SVG drawn
                   (faithful or not), its difference map, its strength map and
                   what was decided about it into <dir> instead, for the
                   screenshot review tool to apply (scripts/lib/shot-stage.mjs).
                   <dir> must be new or empty, and neither under docs nor where
                   git would take it. Not with --diffs, which it holds
  --events         also write a line per event on stdout, @@shot-event {json}
                   (the run, each SVG's verdict, a retake, a failure, the
                   summary), among the lines meant for a person; and stop when a
                   line "stop" arrives on stdin: no further SVG is drawn
  --jobs N         processes drawing at once, each with a browser of its own
                   (default: half the logical processors, at most 8)
  -h, --help       print this text and exit

Exit codes:
  0  every picture was drawn again: written, unchanged, or left as a PNG; a run
     stopped (--events) exits as for the pictures it drew
  1  a picture needs a retake, could not be drawn, or its SVG holds a word no
     published picture may show: the Windows user name, git's user.name and
     user.email, or a word of scripts/svgshot/private.json
  2  the tool could not run: a refused command line, no bundle cache, no browser,
     or a crash`;

const { values } = withUsageError(() =>
  parseCli(process.argv.slice(2), {
    options: {
      only: { type: "string" },
      bundles: { type: "string" },
      out: { type: "string" },
      diffs: { type: "string" },
      recheck: { type: "boolean", default: false },
      against: { type: "string" },
      stage: { type: "string" },
      events: { type: "boolean", default: false },
      jobs: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    stopAt: ["help"],
  }),
);
if (values.help) printHelpAndExit(USAGE);
withUsageError(() => refuseTogether(values, ["stage", "diffs"]));
const only = values.only === undefined ? null : withUsageError(() => regexOption(values.only, { option: "--only" }));
const jobs = withUsageError(() =>
  numberOption(values.jobs ?? String(defaultJobs()), {
    option: "--jobs",
    integer: true,
    min: 1,
    max: 32,
  }),
);
const bundlesRoot = path.resolve(values.bundles ?? BUNDLE_CACHE);
const outRoot = path.resolve(values.out ?? path.join(REPO_ROOT, "docs"));
// The revision whose SVG a drawn SVG is compared with first (keep.mjs's sameSvgAs): none for a
// folder outside a git working tree, unless --against names one.
const AGAINST = values.against ?? "HEAD";
let revision = null;
try {
  revision = openRevision(outRoot, AGAINST);
} catch (e) {
  if (values.against !== undefined) {
    console.error(`replay: --against: ${e.message}`);
    process.exit(2);
  }
}
// A child process the parent started (below) has its share of the pictures in this
// variable, "k/n" (redraw.mjs runShards).
const SHARD_ENV = "SVGSHOT_REPLAY_SHARD";
const SHARD = shardOf(SHARD_ENV);
// With --stage, the run's stage (lib/shot-stage.mjs), which holds the difference maps: nothing
// is written under the output folder. The parent checks it and makes it; its children share it.
const stageRoot = values.stage === undefined ? null : path.resolve(values.stage);
if (stageRoot && !SHARD) {
  const refused = stageRefusal(stageRoot, [path.join(REPO_ROOT, "docs"), outRoot]);
  if (refused) {
    console.error(`replay: --stage: ${refused}`);
    process.exit(2);
  }
  mkdirSync(stageRoot, { recursive: true });
}
const diffsRoot = stageRoot
  ? stageFolders(stageRoot).diffs
  : values.diffs === undefined
    ? null
    : path.resolve(values.diffs);
// --events: a record per event on stdout (lib/record-lines.mjs); a child's pass through its parent.
const event = (type, value = {}) => {
  if (values.events) writeRecord("shot-event", { type, ...value });
};
// The manifest's entries are for the pictures under docs/: another folder is judged without them.
let manifest = null;
if (outRoot === path.resolve(REPO_ROOT, "docs")) {
  try {
    manifest = openManifest(MANIFEST);
  } catch (e) {
    console.error(`replay: ${e.message}`);
    process.exit(2);
  }
}
// A worktree's default cache is filled from the main checkout's the first time; a child process
// (SVGSHOT_REPLAY_SHARD) finds the cache its parent filled.
if (values.bundles === undefined) defaultBundleCache("replay");
if (!existsSync(bundlesRoot)) {
  console.error(`replay: no bundle cache at ${bundlesRoot}; shoot_docs.mjs --svg writes it`);
  process.exit(2);
}
const WORDS = privateWords();
// The fonts' cuts are kept beside the bundles: a picture drawn again mostly cuts what it did.
useSubsetCache(path.join(bundlesRoot, "subsets"));

// Every picture with a bundle under the cache, as its path under docs with forward slashes.
const outs = listBundles(bundlesRoot).filter((out) => !only || only.test(out));

const counts = {};
const retakes = [];
let failed = 0;
const say = (out, line) => console.log(`${out.replace(/\.png$/i, ".svg")}: ${line}`);
// The verdict on a picture's SVG, as --stage keeps it and --events says it (lib/shot-stage.mjs).
const report = (out, part) => {
  if (stageRoot) writeVerdict(stageRoot, out, "svg", part);
  event("svg", { out, ...part });
};
async function replay(out, browser) {
  const svgFile = path.join(outRoot, svgOf(out));
  const drawn = await redraw({ bundlesRoot, docsRoot: outRoot, out, user: WORDS });
  if (drawn.retake) {
    const why = retakeText(drawn);
    retakes.push({ out, why });
    counts["need a retake"] = (counts["need a retake"] ?? 0) + 1;
    say(out, `left as it is, needs a retake (${why})`);
    event("retake", { out, why });
    return;
  }
  const { png, svg, stats } = drawn;
  const entry = manifest?.entry(out) ?? null;
  // The same picture as the revision's SVG, or the file's, to the pixel: the bytes there stay
  // (the revision's put back), whatever they differ in.
  const fileText = existsSync(svgFile) ? readFileSync(svgFile, "utf8") : null;
  const baseText = revision?.bytes(svgOf(out))?.toString("utf8") ?? null;
  const same = await sameSvgAs(browser, { svg, file: fileText, baseline: baseText });
  if (same) {
    const why = sameWhy(same, AGAINST);
    const state =
      same === "baseline" ? restoreSvg(outRoot, revision, svgOf(out), { dryRun: !!stageRoot }) : "unchanged";
    say(out, `${state} (${why})`);
    counts[state] = (counts[state] ?? 0) + 1;
    report(
      out,
      svgVerdict({
        state,
        why,
        same:
          same === "baseline" ? { as: "baseline", baseline: revision.hash } : { as: "file", file: hashOf(fileText) },
      }),
    );
    return;
  }
  // The same bytes as the file, beside the PNG its bundle was taken with: the bar passed this
  // SVG against that PNG when it was written, and would again. Most of a replay is this. A
  // picture whose entry names its SVG is judged again: its bar or its decision may have changed.
  if (
    !values.recheck &&
    !entry?.svg &&
    existsSync(svgFile) &&
    readFileSync(svgFile, "utf8").replace(/\r\n/g, "\n") === svg
  ) {
    say(out, "unchanged (the same SVG as the file)");
    counts.unchanged = (counts.unchanged ?? 0) + 1;
    report(out, svgVerdict({ state: "unchanged", why: "the same SVG as the file" }));
    return;
  }
  const { diff, verdict, faithful, by, measures } = await judgeSvg(browser, svg, png, stats, entry);
  const diffs = diffsRoot ? Object.values(writeJudged(diffsRoot, out, diff)) : [];
  const state = applySvg(outRoot, svgOf(out), faithful ? svg : null, { dryRun: !!stageRoot });
  const how = by === "decision" ? `; ${faithful ? "accepted" : "refused"} by a review` : "";
  say(out, faithful ? `${state} (${measures}${how})` : `${state}, the PNG is kept (${measures}${how})`);
  counts[state] = (counts[state] ?? 0) + 1;
  if (!stageRoot && !values.events) return;
  report(
    out,
    svgVerdict({
      state,
      why: faithful ? null : measures,
      verdict,
      review: reviewSvg(verdict, diff.strength, entry),
      stats: diff.stats,
      measures,
      diffs,
      staged: stageRoot ? stageSvg(stageRoot, out, svg, diff.strength) : null,
    }),
  );
}

// --events: a line "stop" on stdin stops the run (lib/record-lines.mjs). The parent passes it on
// to its children, and each draws no further picture.
const stop = new AbortController();
if (values.events) onStop(process.stdin, () => stop.abort());

if (SHARD) {
  // A child: its share of the pictures, then what it found, on a line of its own.
  const left = await inBrowser(
    shareOf(outs, SHARD),
    async (out, browser) => {
      try {
        await replay(out, browser);
      } catch (e) {
        failed++;
        counts.failed = (counts.failed ?? 0) + 1;
        say(out, `FAILED: ${e.message}`);
        event("failed", { out, error: e.message });
      }
    },
    { stopped: () => stop.signal.aborted },
  );
  for (const out of left) event("skipped", { out });
  if (left.length) counts["not drawn: the run was stopped"] = left.length;
  reportShard({ counts, retakes, failed });
  process.exit(0);
}

// The parent: `jobs` children, each with a browser of its own.
event("run", { tool: "replay", pictures: outs, stage: stageRoot, recheck: values.recheck });
if (values.events)
  stop.signal.addEventListener("abort", () => {
    console.log("stopping: no further SVG is drawn");
    event("stopping");
  });
const children = (
  await runShards(SHARD_ENV, Math.min(jobs, outs.length), { signal: values.events ? stop.signal : null })
).map(({ result, code }) => result ?? { counts: { failed: 1 }, retakes: [], failed: code || 1 });
for (const c of children) {
  for (const [k, n] of Object.entries(c.counts)) counts[k] = (counts[k] ?? 0) + n;
  retakes.push(...c.retakes);
  failed += c.failed;
}
retakes.sort((a, b) => a.out.localeCompare(b.out));

console.log(
  `\n${outs.length} bundle${outs.length === 1 ? "" : "s"}: ${
    Object.entries(counts)
      .map(([k, n]) => `${n} ${k}`)
      .join(", ") || "none"
  }`,
);
if (!outs.length && only)
  console.log(
    `no bundle in ${path.relative(process.cwd(), bundlesRoot) || "."} matches --only: a bundle is kept with the SVG drawn from it`,
  );
if (retakes.length) {
  // shoot_docs.mjs --only matches a shot's out, the dark picture's path: one regex for all.
  const names = [...new Set(retakes.map((r) => path.posix.basename(r.out).replace(/(\.light)?\.png$/i, "")))];
  const regex = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  console.log(`to take them again: node scripts/shoot_docs.mjs --svg --only "${regex}"`);
}
const exitCode = failed || retakes.length ? 1 : 0;
event("summary", { counts, retakes, stopped: stop.signal.aborted, exit: exitCode });
process.exit(exitCode);
