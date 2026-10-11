// Draws each picture's SVG again from its bundle (bundle.mjs), the converter as it
// is now, without taking the picture again: what to run after a change to the
// converter, in place of shoot_docs.mjs --svg. Each SVG is judged against its PNG
// and written or removed as shoot_docs.mjs does (keep.mjs).
//
// A bundle answers only what the converter asked when the picture was taken. A
// picture is left as it is, and listed as needing a retake, when its PNG is no
// longer the one its bundle was taken with, when its bundle is of another format
// (BUNDLE_VERSION: the converter reads more from the page than that bundle holds,
// and nothing shows which pictures it reaches), when its bundle lacks a computed
// style the converter now reads, or when the converter asks a question its bundle
// has no answer for (a miss the capture did not have). The list ends with the
// shoot_docs.mjs command that takes them again.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { availableParallelism, userInfo } from "node:os";
import path from "node:path";
import { exitOnCrash, numberOption, parseCli, printHelpAndExit, regexOption, withUsageError } from "../../lib/cli.mjs";
import { REPO_ROOT } from "../../lib/repo-paths.mjs";
import { LAUNCH_ARGS, launchBrowser } from "../lib/browser.mjs";
import { BUNDLE_VERSION, listBundles, pngHash, readBundle, renderBundle } from "./bundle.mjs";
import { SNAPSHOT_STYLES } from "./capture.mjs";
import { useSubsetCache } from "./fonts.mjs";
import { holdsUserName, judgeSvg, SVG_FAITHFUL, writeSvg } from "./keep.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/svgshot/replay.mjs [--only <regex>] [--bundles <dir>] [--out <dir>] [--diffs <dir>] [--jobs N] [-h, --help]

Draws each picture's SVG again from the bundle shoot_docs.mjs --svg saved when it
took the picture, with the converter as it is now, and writes it beside its PNG
as shoot_docs.mjs does: written when no more than ${SVG_FAITHFUL}% of its pixels
are far off the PNG's and its bytes differ from the file's, else not written and
an older one removed. Takes no picture and starts no IDE; needs Python with
fontTools, as --svg does.

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
  --recheck        compare every SVG with its PNG, also one that is the same
                   bytes as the file (which the bar passed when it was written)
  --jobs N         processes drawing at once, each with a browser of its own
                   (default: half the logical processors, at most 8)
  -h, --help       print this text and exit

Exit codes:
  0  every picture was drawn again: written, unchanged, or left as a PNG
  1  a picture needs a retake, could not be drawn, or its SVG holds the Windows
     user name
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
      jobs: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    stopAt: ["help"],
  }),
);
if (values.help) printHelpAndExit(USAGE);
const only = values.only === undefined ? null : withUsageError(() => regexOption(values.only, { option: "--only" }));
const jobs = withUsageError(() =>
  numberOption(values.jobs ?? String(Math.min(8, Math.max(1, Math.floor(availableParallelism() / 2)))), {
    option: "--jobs",
    integer: true,
    min: 1,
    max: 32,
  }),
);
const bundlesRoot = path.resolve(values.bundles ?? path.join(REPO_ROOT, ".svgshot-bundles"));
const outRoot = path.resolve(values.out ?? path.join(REPO_ROOT, "docs"));
const diffsRoot = values.diffs === undefined ? null : path.resolve(values.diffs);
if (!existsSync(bundlesRoot)) {
  console.error(`replay: no bundle cache at ${bundlesRoot}; shoot_docs.mjs --svg writes it`);
  process.exit(2);
}
const USER = userInfo().username;
// The fonts' cuts are kept beside the bundles: a picture drawn again mostly cuts what it did.
useSubsetCache(path.join(bundlesRoot, "subsets"));

// A child process the parent started (below) has its share of the pictures in this
// variable, "k/n", and ends its output with one line that starts with RESULT.
const SHARD_ENV = "SVGSHOT_REPLAY_SHARD";
const SHARD = (() => {
  const m = /^(\d+)\/(\d+)$/.exec(process.env[SHARD_ENV] ?? "");
  return m ? { k: Number(m[1]), of: Number(m[2]) } : null;
})();
const RESULT = "@@replay-result ";
const IN_FLIGHT = 2;

// Every picture with a bundle under the cache, as its path under docs with forward slashes.
const outs = listBundles(bundlesRoot).filter((out) => !only || only.test(out));

const counts = {};
const retakes = [];
let failed = 0;
const say = (out, line) => console.log(`${out.replace(/\.png$/i, ".svg")}: ${line}`);
async function replay(out, browser) {
  const bundle = readBundle(bundlesRoot, out);
  const pngFile = path.join(outRoot, out);
  const svgFile = pngFile.replace(/\.png$/i, ".svg");
  const retake = (why) => {
    retakes.push({ out, why });
    counts["need a retake"] = (counts["need a retake"] ?? 0) + 1;
    say(out, `left as it is, needs a retake (${why})`);
  };
  if (!existsSync(pngFile)) return retake("the PNG is gone");
  const png = readFileSync(pngFile);
  if (pngHash(png) !== bundle.png) return retake("the PNG is not the one the bundle was taken with");
  if (bundle.version !== BUNDLE_VERSION)
    return retake(`the bundle is of format ${bundle.version}, the converter reads ${BUNDLE_VERSION}`);
  const lacking = SNAPSHOT_STYLES.filter((s) => !bundle.styles.includes(s));
  if (lacking.length) return retake(`the bundle has no ${lacking.join(", ")}`);
  const { svg, stats, misses } = await renderBundle(bundle);
  const had = new Set(bundle.misses ?? []);
  const fresh = misses.filter((m) => !had.has(m));
  if (fresh.length)
    return retake(
      `no answer for ${fresh.length} question${fresh.length > 1 ? "s" : ""}: ${fresh.slice(0, 3).join("; ")}`,
    );
  if (holdsUserName(svg, USER)) throw new Error("the SVG holds the Windows user name");
  // The same bytes as the file, beside the PNG its bundle was taken with: the bar passed this
  // SVG against that PNG when it was written, and would again. Most of a replay is this.
  if (!values.recheck && existsSync(svgFile) && readFileSync(svgFile, "utf8").replace(/\r\n/g, "\n") === svg) {
    say(out, "unchanged (the same SVG as the file)");
    counts.unchanged = (counts.unchanged ?? 0) + 1;
    return;
  }
  const { diff, faithful, measures } = await judgeSvg(browser, svg, png, stats);
  if (diffsRoot) {
    mkdirSync(diffsRoot, { recursive: true });
    writeFileSync(
      path.join(diffsRoot, `${out.replace(/[\\/]/g, "__").replace(/\.png$/i, "")}.svg-diff.png`),
      diff.diff,
    );
  }
  let state;
  if (!faithful) {
    state = existsSync(svgFile) ? "removed" : "not written";
    if (state === "removed") rmSync(svgFile);
    say(out, `${state}, the PNG is kept (${measures})`);
  } else {
    state = writeSvg(svgFile, svg);
    say(out, `${state} (${measures})`);
  }
  counts[state] = (counts[state] ?? 0) + 1;
}

if (SHARD) {
  // A child: its share of the pictures, two at a time (one drawn while the other is
  // judged), then what it found, on a line of its own.
  const mine = outs.filter((_, i) => i % SHARD.of === SHARD.k);
  // Without the GPU: the browsers of every process share one, which held a replay to the
  // speed of four processes; drawn in software, eight go faster. The SVG's bytes do not
  // depend on it, only how close its render comes to the PNG, which the bar judges.
  const browser = await launchBrowser({ args: [...LAUNCH_ARGS, "--disable-gpu"] });
  try {
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(IN_FLIGHT, mine.length) }, async () => {
        while (next < mine.length) {
          const out = mine[next++];
          try {
            await replay(out, browser);
          } catch (e) {
            failed++;
            counts.failed = (counts.failed ?? 0) + 1;
            say(out, `FAILED: ${e.message}`);
          }
        }
      }),
    );
  } finally {
    await browser.close();
  }
  console.log(`${RESULT}${JSON.stringify({ counts, retakes, failed })}`);
  process.exit(0);
}

// The parent: `jobs` children, each with a browser of its own, since drawing a picture
// is JavaScript that one process runs one at a time.
const children = await Promise.all(
  Array.from(
    { length: Math.min(jobs, outs.length) },
    (_, k) =>
      new Promise((resolve) => {
        const child = spawn(process.execPath, process.argv.slice(1), {
          env: { ...process.env, [SHARD_ENV]: `${k}/${Math.min(jobs, outs.length)}` },
          stdio: ["ignore", "pipe", "inherit"],
        });
        let result = null;
        let rest = "";
        child.stdout.on("data", (d) => {
          const lines = (rest + d).split("\n");
          rest = lines.pop();
          for (const line of lines) {
            if (line.startsWith(RESULT)) result = JSON.parse(line.slice(RESULT.length));
            else console.log(line.replace(/\r$/, ""));
          }
        });
        child.on("close", (code) => resolve(result ?? { counts: { failed: 1 }, retakes: [], failed: code || 1 }));
      }),
  ),
);
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
if (retakes.length) {
  // shoot_docs.mjs --only matches a shot's out, the dark picture's path: one regex for all.
  const names = [...new Set(retakes.map((r) => path.posix.basename(r.out).replace(/(\.light)?\.png$/i, "")))];
  const regex = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  console.log(`to take them again: node scripts/shoot_docs.mjs --svg --only "${regex}"`);
}
process.exit(failed || retakes.length ? 1 : 0);
