// What the tools that draw a picture's SVG again from its bundle have in common:
// replay.mjs, which writes the SVGs beside their PNGs, and sheet.mjs, which writes a
// sheet of them to look at. Finding the pictures and their bundles, drawing one again
// and judging it (keep.mjs's bar), writing what the judge made into a folder, running
// the pictures in processes of their own, and the sheet's HTML.
//
// Nothing here writes under docs/: each writer is given its folder.

import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import path from "node:path";
import { isOutputTree } from "../../lib/markdown-files.mjs";
import { LAUNCH_ARGS, launchBrowser } from "../lib/browser.mjs";
import { BUNDLE_VERSION, pngHash, readBundle, renderBundle } from "./bundle.mjs";
import { SNAPSHOT_STYLES } from "./capture.mjs";
import { holdsUserName } from "./keep.mjs";

/** A picture's theme from its path under docs/: "light" for X.light.png, else "dark". */
export const themeOf = (out) => (/\.light\.png$/i.test(out) ? "light" : "dark");

/**
 * A picture's name in a flat folder: its path under docs/ with the folders joined by
 * `__` and no `.png` (IDE__Menu__Images__Menu_File.light), as shoot_docs.mjs --diffs
 * and replay.mjs --diffs name their files.
 */
export const slugOf = (out) => out.replace(/[\\/]/g, "__").replace(/\.png$/i, "");

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

/** A PNG's size in pixels, [width, height], from its header; null for bytes that are not a PNG. */
export function pngSize(png) {
  if (png.length < 24 || png.readUInt32BE(0) !== 0x89504e47 || png.toString("latin1", 12, 16) !== "IHDR") return null;
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
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
  const lacking = SNAPSHOT_STYLES.filter((s) => !bundle.styles.includes(s));
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

const RESULT = "@@svgshot-result ";

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
 * bar judges.
 */
export async function inBrowser(items, fn) {
  const browser = await launchBrowser({ args: [...LAUNCH_ARGS, "--disable-gpu"] });
  try {
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(2, items.length) }, async () => {
        while (next < items.length) await fn(items[next++], browser);
      }),
    );
  } finally {
    await browser.close();
  }
}

/** Ends a child's output with what it found, on a line of its own that runShards reads. */
export const reportShard = (result) => console.log(`${RESULT}${JSON.stringify(result)}`);

/**
 * Starts `jobs` children of this script, with its arguments, each told its share in
 * the variable `envName`, since drawing a picture is JavaScript that one process runs
 * one at a time. Their output is passed on, line by line, but for the line each ends
 * with (reportShard). Resolves to [{result, code}] in the children's order, `result`
 * null for a child that reported nothing.
 */
export function runShards(envName, jobs) {
  return Promise.all(
    Array.from(
      { length: jobs },
      (_, k) =>
        new Promise((resolve) => {
          const child = spawn(process.execPath, process.argv.slice(1), {
            env: { ...process.env, [envName]: `${k}/${jobs}` },
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
          child.on("close", (code) => resolve({ result, code }));
        }),
    ),
  );
}

// ---- the sheet ------------------------------------------------------------------------

/** The generator a sheet names in its <meta>, by which a folder is known to hold one. */
export const SHEET_GENERATOR = "scripts/svgshot/sheet.mjs";

const inside = (dir, root) => {
  const rel = path.relative(root, dir);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
};

/**
 * Why `dir` may not take a sheet, or null: it is under one of `docsRoots`, or inside a
 * git working tree at a path git does not ignore: a sheet and its pictures may hold the
 * Windows user name (sheet.mjs draws them without the check), so they must never be
 * committed or published. `git` stands in for running git in the probes:
 * git(args, cwd) returns its exit code and output, {status, stdout}.
 */
export function outputRefusal(dir, docsRoots, git = runGit) {
  const abs = path.resolve(dir);
  for (const root of docsRoots) if (inside(abs, path.resolve(root))) return `${abs} is under ${path.resolve(root)}`;
  let near = abs;
  while (!existsSync(near) || !statSync(near).isDirectory()) {
    const up = path.dirname(near);
    if (up === near) return null;
    near = up;
  }
  const top = git(["rev-parse", "--show-toplevel"], near);
  if (top.status !== 0) return null;
  const root = path.resolve(top.stdout.trim());
  const rel = path.relative(root, abs).replace(/\\/g, "/");
  if (rel === "") return `${abs} is the root of the git working tree`;
  const ignored = git(["check-ignore", "-q", "--", rel], root);
  if (ignored.status === 0) return null;
  if (ignored.status === 1) return `${abs} is inside the git working tree ${root}, at a path git does not ignore`;
  return `git check-ignore could not say whether ${abs} is ignored`;
}

function runGit(args, cwd) {
  try {
    return {
      status: 0,
      stdout: execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }),
    };
  } catch (e) {
    return { status: typeof e.status === "number" ? e.status : 128, stdout: "" };
  }
}

/**
 * Whether the folder `dir` may be written over: it does not exist, is empty, or
 * holds a sheet (its index.html names SHEET_GENERATOR).
 */
export function mayWriteSheet(dir) {
  if (!existsSync(dir)) return true;
  if (!statSync(dir).isDirectory()) return false;
  if (readdirSync(dir).length === 0) return true;
  const index = path.join(dir, "index.html");
  return (
    existsSync(index) && readFileSync(index, "utf8").includes(`<meta name="generator" content="${SHEET_GENERATOR}">`)
  );
}

/** What the converter reports it did not draw (stats.unsupported), as [[kind, count]] sorted by kind. */
export const notDrawn = (unsupported) =>
  Object.entries(unsupported ?? {}).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

/** The judged rows worst first; a row that could not be judged after them; ties by path. */
export const sortRows = (rows) =>
  [...rows].sort((a, b) => (b.pct96 ?? -1) - (a.pct96 ?? -1) || (a.out < b.out ? -1 : a.out > b.out ? 1 : 0));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const anchor = (out) => `p-${out.replace(/[^A-Za-z0-9]+/g, "-")}`;
const sizeText = (size) => (size ? `${size[0]} x ${size[1]} px` : "size unknown");

/**
 * The sheet, a page that needs no other file but the pictures it links: `rows` the
 * judged pictures, each {out, theme, size, pct96, pct32, pct8, faithful, source
 * ("bundle" or "file"), notes, notDrawn, files: {png, render, diff, svg}} or {out,
 * theme, size, error, files: {png}}; `plain` the pictures with no drawing, each
 * {out, size, files: {png}}; `bar` SVG_FAITHFUL; `all` whether pictures with an SVG
 * are included; `folder` the folder the files are in, relative to the page.
 */
export function sheetHtml({ rows, plain, bar, all, folder = "pictures" }) {
  const href = (name) => `${folder}/${encodeURIComponent(name)}`;
  const sorted = sortRows(rows);
  const judged = sorted.filter((r) => r.error === undefined);
  const title = all ? "Every picture against its SVG" : "Pictures with no SVG";
  const meter = (pct) => {
    const w = Math.min(100, (pct / 10) * 100);
    return `<span class="bar" title="${pct}% strongly off; the bar is ${bar}%"><i style="width:${w}%"></i><b style="left:${(bar / 10) * 100}%"></b></span>`;
  };
  const figure = (name, caption) =>
    `<figure><a href="${href(name)}"><img src="${href(name)}" loading="lazy" alt="${esc(caption)}"></a><figcaption>${esc(caption)}</figcaption></figure>`;
  const card = (r) => {
    // Each fact is HTML: text from elsewhere is escaped as it is put in.
    const facts = [`${r.theme} theme`, sizeText(r.size)];
    if (r.error === undefined) {
      facts.push(
        `<b>${r.pct96}% strongly off</b> (the bar is ${bar}%), ${r.pct32}% off by 32 levels or more, ${r.pct8}% by 8 or more`,
      );
      facts.push(r.source === "file" ? "the SVG file beside the PNG" : "drawn again from its bundle");
      if (r.notDrawn?.length)
        facts.push(
          `the converter did not draw: ${esc(r.notDrawn.map(([k, n]) => (n > 1 ? `${k} x${n}` : k)).join(", "))}`,
        );
    } else facts.push(`<b>not drawn: ${esc(r.error)}</b>`);
    if (r.notes?.length) facts.push(`note: ${esc(r.notes.join("; "))}`);
    const figures = [figure(r.files.png, "PNG")];
    if (r.files.render) figures.push(figure(r.files.render, "SVG render"));
    if (r.files.diff)
      figures.push(figure(r.files.diff, "Difference (red: 96 levels or more, orange: 32 or more, yellow: 8 or more)"));
    return `<section id="${anchor(r.out)}">
<h3>${esc(r.out)}</h3>
<p class="meta">${facts.join(", ")}${r.files.svg ? ` (<a href="${href(r.files.svg)}">the SVG</a>)` : ""}</p>
${r.error === undefined ? meter(r.pct96) : ""}
<div class="trio">${figures.join("\n")}</div>
</section>`;
  };
  const thumbs = plain
    .map(
      (p) =>
        `<figure class="thumb"><a href="${href(p.files.png)}"><img src="${href(p.files.png)}" loading="lazy" alt="${esc(p.out)}"></a><figcaption>${esc(p.out)}, ${sizeText(p.size)}</figcaption></figure>`,
    )
    .join("\n");
  const toc = sorted
    .map(
      (r) =>
        `<li><a href="#${anchor(r.out)}">${esc(r.out)}</a> <span class="pct">${r.pct96 ?? "not drawn"}${r.pct96 === undefined ? "" : "%"}</span></li>`,
    )
    .join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="${SHEET_GENERATOR}">
<title>${title}</title>
<style>
:root{color-scheme:light dark;--bg:#fff;--fg:#1b1b1b;--mut:#666;--line:#ccc;--card:#f6f6f6;--bar:#d33;--lim:#080;--link:#2a6ed8}
@media (prefers-color-scheme:dark){:root{--bg:#1b1b1b;--fg:#e6e6e6;--mut:#a0a0a0;--line:#444;--card:#262626;--bar:#e55;--lim:#4c4;--link:#7aaaff}}
body{margin:0 auto;max-width:1500px;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,Segoe UI,sans-serif}
h1{margin-top:0}h3{margin:0 0 4px;word-break:break-all}a{color:var(--link)}
section{border:1px solid var(--line);background:var(--card);border-radius:6px;padding:12px;margin:16px 0}
.meta{margin:0 0 6px;color:var(--mut)}
.trio{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start}
.trio figure{margin:0;flex:1 1 30%;min-width:260px}
.trio img{max-width:100%;max-height:520px;border:1px solid var(--line);background:repeating-conic-gradient(#8884 0 25%,#0000 0 50%) 0 0/16px 16px;display:block}
figcaption{font-size:12px;color:var(--mut);margin-top:2px;word-break:break-all}
.bar{position:relative;display:block;height:10px;max-width:500px;border:1px solid var(--line);margin:2px 0 8px}
.bar i{position:absolute;left:0;top:0;bottom:0;background:var(--bar)}
.bar b{position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--lim)}
.pct{color:var(--mut)}
.thumbs{display:flex;flex-wrap:wrap;gap:12px}
.thumb{margin:0;width:230px}.thumb img{max-width:230px;max-height:150px;border:1px solid var(--line);background:repeating-conic-gradient(#8884 0 25%,#0000 0 50%) 0 0/16px 16px}
table{border-collapse:collapse}td,th{border:1px solid var(--line);padding:3px 10px;text-align:left}
</style></head><body>
<h1>${title}</h1>
<p>${all ? "Every PNG under docs" : "Every PNG under docs with no SVG of the same name beside it"}, the build's output trees left out. A picture with a bundle is drawn again from it with the converter as it is now, and judged as the tools judge an SVG: the share of its pixels more than 96 grey levels off the PNG's, a shift of one pixel allowed. An SVG is kept only below ${bar}% (the green mark on each bar, whose full width is 10%). Select a picture to open it full size.</p>
<table>
<tr><th>${all ? "PNGs" : "PNGs with no SVG"}</th><td>${rows.length + plain.length}</td></tr>
<tr><th>drawn and judged</th><td>${judged.length}</td></tr>
<tr><th>could not be drawn</th><td>${rows.length - judged.length}</td></tr>
<tr><th>with nothing to draw from</th><td>${plain.length}</td></tr>
</table>
<h2>Contents</h2>
<ol>
${toc}
<li><a href="#plain">Pictures with nothing to draw from</a></li>
</ol>
<h2>Drawn, worst first</h2>
${sorted.map(card).join("\n")}
<h2 id="plain">With nothing to draw from (no bundle${all ? " and no SVG" : ""})</h2>
<div class="thumbs">
${thumbs}
</div>
</body></html>
`;
}
