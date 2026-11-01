// What the tools that draw a picture's SVG again from its bundle have in common:
// replay.mjs, which writes the SVGs beside their PNGs, and sheet.mjs, which writes a
// sheet of them to look at. Finding the pictures and their bundles, drawing one again
// and judging it (keep.mjs, against lib/shot-policy.mjs's bar), writing what the judge made
// into a folder, and running the pictures in processes of their own. The sheets' pages are
// in sheets.mjs.
//
// Nothing here writes under docs/: each writer is given its folder.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import path from "node:path";
import { isOutputTree } from "../../lib/markdown-files.mjs";
import { LAUNCH_ARGS, launchBrowser } from "../lib/browser.mjs";
import { readRecords, sendStop, writeRecord } from "../lib/record-lines.mjs";
import { BUNDLE_VERSION, pngHash, readBundle, renderBundle } from "./bundle.mjs";
import { MISSABLE_STYLES, SNAPSHOT_STYLES } from "./capture.mjs";
import { holdsUserName } from "./keep.mjs";
import { slugOf } from "../lib/shot-apply.mjs";

/** A picture's theme from its path under docs/: "light" for X.light.png, else "dark". */
export const themeOf = (out) => (/\.light\.png$/i.test(out) ? "light" : "dark");

/**
 * The files a judged picture can have in a flat folder, relative to it: the PNG's
 * copy, the SVG, the SVG's render and the difference map. The SVG and the
 * difference map are named as shoot_docs.mjs --diffs names them.
 */
export const judgedFiles = (out) => {
  const s = slugOf(out);
  return { png: `${s}.png`, svg: `${s}.svg`, render: `${s}.svg-render.png`, diff: `${s}.svg-diff.png` };
};

/**
 * Every PNG under `docsRoot`, the build's output trees left out, as its path under
 * it with forward slashes, sorted, each with whether an SVG of the same name is
 * beside it: [{out, svg}].
 */
export function listPictures(docsRoot) {
  const found = [];
  const walk = (dir, rel) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!rel && isOutputTree(e.name)) continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(dir, e.name), r);
      else if (e.isFile() && /\.png$/i.test(e.name)) found.push(r);
    }
  };
  walk(docsRoot, "");
  return found
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((out) => ({ out, svg: existsSync(path.join(docsRoot, out.replace(/\.png$/i, ".svg"))) }));
}

/**
 * Draws the SVG of the picture `out` (its path under `docsRoot`) again from its
 * bundle under `bundlesRoot`, with the converter as it is now. Returns
 * {retake, detail} when it cannot be drawn faithfully to its PNG -- `retake` the
 * reason in the tool's own words, `detail` text from the bundle that a console
 * may show and a sheet must not -- else {png, svg, stats, notes}.
 *
 * A PNG that is not the one the bundle was taken with, or a question the bundle has
 * no answer for, is a retake; with `stale`, the SVG is drawn all the same and the
 * reason is one of its `notes`. An SVG that holds `user` (the Windows user name)
 * throws, unless `checkUserName` is false: only sheet.mjs passes that, whose sheet is
 * for its owner alone and is never written where git would take it (outputRefusal).
 */
export async function redraw({ bundlesRoot, docsRoot, out, user, stale = false, checkUserName = true }) {
  const bundle = readBundle(bundlesRoot, out);
  if (!bundle) return { retake: "there is no bundle" };
  const pngFile = path.join(docsRoot, out);
  if (!existsSync(pngFile)) return { retake: "the PNG is gone" };
  const png = readFileSync(pngFile);
  const notes = [];
  if (pngHash(png) !== bundle.png) {
    const why = "the PNG is not the one the bundle was taken with";
    if (!stale) return { retake: why };
    notes.push(why);
  }
  if (bundle.version !== BUNDLE_VERSION)
    return { retake: `the bundle is of format ${bundle.version}, the converter reads ${BUNDLE_VERSION}` };
  const lacking = SNAPSHOT_STYLES.filter((s) => !bundle.styles.includes(s) && !MISSABLE_STYLES.has(s));
  if (lacking.length) return { retake: `the bundle has no ${lacking.join(", ")}` };
  const { svg, stats, misses } = await renderBundle(bundle);
  const had = new Set(bundle.misses ?? []);
  const fresh = misses.filter((m) => !had.has(m));
  if (fresh.length) {
    const why = `no answer for ${fresh.length} question${fresh.length > 1 ? "s" : ""}`;
    if (!stale) return { retake: why, detail: fresh.slice(0, 3).join("; ") };
    notes.push(why);
  }
  if (checkUserName && holdsUserName(svg, user)) throw new Error("the SVG holds the Windows user name");
  return { png, svg, stats, notes };
}

/** A retake as a line of console output: its reason, then the bundle's text, if any. */
export const retakeText = ({ retake, detail }) => `${retake}${detail ? `: ${detail}` : ""}`;

/**
 * Writes what judgeSvg made of the picture `out` into `dir`, named by judgedFiles:
 * `diff` (judgeSvg's diff) always, and when asked for, its render and the `svg`
 * itself. Returns the names written.
 */
export function writeJudged(dir, out, diff, { render = false, svg = null } = {}) {
  const names = judgedFiles(out);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, names.diff), diff.diff);
  const written = { diff: names.diff };
  if (render) {
    writeFileSync(path.join(dir, names.render), diff.render);
    written.render = names.render;
  }
  if (svg !== null) {
    writeFileSync(path.join(dir, names.svg), svg);
    written.svg = names.svg;
  }
  return written;
}

// ---- the pictures in processes of their own -------------------------------------------

/** How many processes draw at once by default: half the logical processors, at most 8. */
export const defaultJobs = () => Math.min(8, Math.max(1, Math.floor(availableParallelism() / 2)));

// the kind of the record a child ends its output with (lib/record-lines.mjs)
const RESULT = "svgshot-result";

/**
 * This process's share of the pictures when it is a child runShards started, as
 * {k, of}: the variable `envName` holds "k/of". Null in the parent.
 */
export function shardOf(envName) {
  const m = /^(\d+)\/(\d+)$/.exec(process.env[envName] ?? "");
  return m ? { k: Number(m[1]), of: Number(m[2]) } : null;
}

/** The items of `items` that are the share `shard` of them. */
export const shareOf = (items, shard) => items.filter((_, i) => i % shard.of === shard.k);

/**
 * Runs `fn(item, browser)` over `items`, two at a time (one drawn while the other is
 * judged), in one browser started without the GPU, and closes it. `fn` handles its
 * own errors. Without the GPU: the browsers of every process share one, which held a
 * replay to the speed of four processes; drawn in software, eight go faster. An SVG's
 * bytes do not depend on it, only how close its render comes to the PNG, which the
 * bar judges. Once `stopped()` is true no further item is started. Resolves to the items
 * not started.
 */
export async function inBrowser(items, fn, { stopped = () => false } = {}) {
  const browser = await launchBrowser({ args: [...LAUNCH_ARGS, "--disable-gpu"] });
  let next = 0;
  try {
    await Promise.all(
      Array.from({ length: Math.min(2, items.length) }, async () => {
        while (next < items.length && !stopped()) await fn(items[next++], browser);
      }),
    );
  } finally {
    await browser.close();
  }
  return items.slice(next);
}

/** Ends a child's output with what it found, on a line of its own that runShards reads. */
export const reportShard = (result) => writeRecord(RESULT, result);

/**
 * Starts `jobs` children of this script, with its arguments, each told its share in
 * the variable `envName`, since drawing a picture is JavaScript that one process runs
 * one at a time. Their output is passed on, line by line, but for the line each ends
 * with (reportShard). Resolves to [{result, code}] in the children's order, `result`
 * null for a child that reported nothing. When `signal` (an AbortSignal) aborts, each
 * child is sent the stop line on its stdin (lib/record-lines.mjs's sendStop).
 */
export function runShards(envName, jobs, { signal = null } = {}) {
  return Promise.all(
    Array.from(
      { length: jobs },
      (_, k) =>
        new Promise((resolve) => {
          const child = spawn(process.execPath, process.argv.slice(1), {
            env: { ...process.env, [envName]: `${k}/${jobs}` },
            stdio: [signal ? "pipe" : "ignore", "pipe", "inherit"],
          });
          if (signal) {
            const stop = () => sendStop(child);
            if (signal.aborted) stop();
            else signal.addEventListener("abort", stop, { once: true });
            child.on("close", () => signal.removeEventListener("abort", stop));
          }
          let result = null;
          readRecords(child.stdout, [RESULT], {
            onRecord: (_, value) => {
              result = value;
            },
            onLine: (line) => console.log(line),
          });
          child.on("close", (code) => resolve({ result, code }));
        }),
    ),
  );
}
