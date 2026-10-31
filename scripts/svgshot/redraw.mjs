// What the tools that draw a picture's SVG again from its bundle have in common:
// replay.mjs, which writes the SVGs beside their PNGs, and sheet.mjs, which writes a
// sheet of them to look at. Finding the pictures and their bundles, drawing one again
// and judging it (keep.mjs's bar), writing what the judge made into a folder, running
// the pictures in processes of their own, and the sheet's HTML. And what sheet.mjs --against
// uses to show the pictures that differ from a git revision: the change list from git, the
// comparison of each picture (scripts/lib/shot-change.mjs), their order and the page, which
// shares its skeleton with the other sheet.
//
// Nothing here writes under docs/: each writer is given its folder.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import path from "node:path";
import { isOutputTree } from "../../lib/markdown-files.mjs";
import { LAUNCH_ARGS, launchBrowser } from "../lib/browser.mjs";
import { decodePng } from "../lib/png.mjs";
import { changeMap, compareImages, NOISE_LEVELS, NOISE_SHARE } from "../lib/shot-change.mjs";
import { revisionOf, runGit } from "../lib/shot-revision.mjs";
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

const SHEET_STYLE = `:root{color-scheme:light dark;--bg:#fff;--fg:#1b1b1b;--mut:#666;--line:#ccc;--card:#f6f6f6;--bar:#d33;--lim:#080;--link:#2a6ed8}
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
`;

/**
 * The page both sheets share: the head with the generator mark that identifies a sheet,
 * the title and `intro` (HTML), the `summary` table ([[label, value]], text), the
 * `contents` (the <li>s of the list), and `body` (HTML).
 */
function pageHtml({ title, intro, summary, contents, body }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="${SHEET_GENERATOR}">
<title>${esc(title)}</title>
<style>
${SHEET_STYLE}</style></head><body>
<h1>${esc(title)}</h1>
<p>${intro}</p>
<table>
${summary.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("\n")}
</table>
<h2>Contents</h2>
<ol>
${contents}
</ol>
${body}
</body></html>
`;
}

/** The link and the figure (a linked picture with its caption) for files in `folder`, relative to the page. */
function figuresIn(folder) {
  const href = (name) => `${folder}/${encodeURIComponent(name)}`;
  const figure = (name, caption) =>
    `<figure><a href="${href(name)}"><img src="${href(name)}" loading="lazy" alt="${esc(caption)}"></a><figcaption>${esc(caption)}</figcaption></figure>`;
  return { href, figure };
}

/** A bar `pct` of the way to `full` percent, with a mark at `mark` percent; `title` is its tooltip (text). */
const meterHtml = (pct, full, mark, title) =>
  `<span class="bar" title="${esc(title)}"><i style="width:${Math.min(100, (pct / full) * 100)}%"></i><b style="left:${(mark / full) * 100}%"></b></span>`;

/**
 * The sheet, a page that needs no other file but the pictures it links: `rows` the
 * judged pictures, each {out, theme, size, pct96, pct32, pct8, faithful, source
 * ("bundle" or "file"), notes, notDrawn, files: {png, render, diff, svg}} or {out,
 * theme, size, error, files: {png}}; `plain` the pictures with no drawing, each
 * {out, size, files: {png}}; `bar` SVG_FAITHFUL; `all` whether pictures with an SVG
 * are included; `folder` the folder the files are in, relative to the page.
 */
export function sheetHtml({ rows, plain, bar, all, folder = "pictures" }) {
  const { href, figure } = figuresIn(folder);
  const sorted = sortRows(rows);
  const judged = sorted.filter((r) => r.error === undefined);
  const title = all ? "Every picture against its SVG" : "Pictures with no SVG";
  const meter = (pct) => meterHtml(pct, 10, bar, `${pct}% strongly off; the bar is ${bar}%`);
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
  return pageHtml({
    title,
    intro: `${all ? "Every PNG under docs" : "Every PNG under docs with no SVG of the same name beside it"}, the build's output trees left out. A picture with a bundle is drawn again from it with the converter as it is now, and judged as the tools judge an SVG: the share of its pixels more than 96 grey levels off the PNG's, a shift of one pixel allowed. An SVG is kept only below ${bar}% (the green mark on each bar, whose full width is 10%). Select a picture to open it full size.`,
    summary: [
      [all ? "PNGs" : "PNGs with no SVG", rows.length + plain.length],
      ["drawn and judged", judged.length],
      ["could not be drawn", rows.length - judged.length],
      ["with nothing to draw from", plain.length],
    ],
    contents: `${toc}
<li><a href="#plain">Pictures with nothing to draw from</a></li>`,
    body: `<h2>Drawn, worst first</h2>
${sorted.map(card).join("\n")}
<h2 id="plain">With nothing to draw from (no bundle${all ? " and no SVG" : ""})</h2>
<div class="thumbs">
${thumbs}
</div>`,
  });
}

// ---- the sheet of changes against a git revision ----------------------------------------

/**
 * The pictures git reports changed, from the text of `git diff --name-status
 * --no-renames -z` (status, path, status, path, ... separated by NUL): [{out,
 * status}], status "modified", "added" or "deleted", the PNGs only, the build's output
 * trees left out, sorted by path.
 */
export function parseNameStatus(text) {
  const parts = text.split("\0");
  const found = [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    const letter = parts[i].trim()[0];
    const status = letter === "A" ? "added" : letter === "D" ? "deleted" : "modified";
    found.push({ out: parts[i + 1], status });
  }
  return keepPictures(found);
}

/** The PNGs of a list of paths from `git ls-files -z` (NUL separated), as [{out, status: "added"}]. */
export const parseUntracked = (text) =>
  keepPictures(
    text
      .split("\0")
      .filter(Boolean)
      .map((out) => ({ out, status: "added" })),
  );

function keepPictures(list) {
  const seen = new Set();
  return list
    .filter(({ out }) => /\.png$/i.test(out) && !isOutputTree(out.split("/")[0]) && !seen.has(out) && seen.add(out))
    .sort((a, b) => (a.out < b.out ? -1 : a.out > b.out ? 1 : 0));
}

/**
 * The PNGs under `docsRoot` that differ from the revision `rev`, read with git run in
 * `docsRoot` (so its own repository answers, whichever checkout this script is in):
 * {hash, short, prefix, pictures}, `prefix` the folder's path from the repository's root
 * with a closing slash (empty at the root), `pictures` as parseNameStatus gives them,
 * with the PNGs git does not track yet, which are added. The working tree is compared,
 * not the index. Throws an Error that says why when `rev` is not a commit there or the
 * folder is not in a git working tree. `git` stands in for running git in the probes.
 */
export function changedPictures(docsRoot, rev, git = runGit) {
  const { hash: id, short, prefix } = revisionOf(docsRoot, rev, git);
  const diff = git(["diff", "--name-status", "--no-renames", "--relative", "-z", id, "--", "."], docsRoot);
  if (diff.status !== 0) throw new Error(`git diff against ${rev} failed in ${docsRoot}`);
  const untracked = git(["ls-files", "-z", "--others", "--exclude-standard", "--", "."], docsRoot);
  if (untracked.status !== 0) throw new Error(`git ls-files failed in ${docsRoot}`);
  const pictures = keepPictures([...parseNameStatus(diff.stdout), ...parseUntracked(untracked.stdout)]);
  return { hash: id, short, prefix, pictures };
}

/** The files a picture of the change sheet can have in a flat folder: the old PNG, the new one and the map. */
export const changeFiles = (out) => {
  const s = slugOf(out);
  return { old: `${s}.old.png`, new: `${s}.new.png`, map: `${s}.change.png` };
};

/**
 * Compares the picture `item` ({out, status}) as the revision has it (`before`, bytes, or
 * null) and as it is now (`after`). Returns {row, map}: the row of the change sheet --
 * {out, theme, status, kind, sizeOld, sizeNew, stats, error, files} -- and the difference
 * map as PNG bytes, null for an added or deleted picture or one that could not be read.
 * `kind` is "changed", "noise" (the same picture but for a capture's noise, which
 * shoot_docs.mjs never writes over a file, and puts back as HEAD has it; withinNoise, as
 * its --cleanup applies it), "added", "deleted" or "error" (a file this
 * tool cannot read as a PNG, with `error` the reason).
 */
export function compareRevisionPicture(item, before, after) {
  const { out, status } = item;
  const names = changeFiles(out);
  const row = { out, theme: themeOf(out), status, files: {} };
  if (before) {
    row.sizeOld = pngSize(before);
    row.files.old = names.old;
  }
  if (after) {
    row.sizeNew = pngSize(after);
    row.files.new = names.new;
  }
  if (status === "added") return { row: { ...row, kind: "added" }, map: null };
  if (status === "deleted") return { row: { ...row, kind: "deleted" }, map: null };
  try {
    const A = decodePng(before);
    const B = decodePng(after);
    const stats = compareImages(A, B);
    row.files.map = names.map;
    return { row: { ...row, stats, kind: stats.noiseOnly ? "noise" : "changed" }, map: changeMap(A, B) };
  } catch (e) {
    return { row: { ...row, kind: "error", error: e.message }, map: null };
  }
}

const KIND_RANK = { error: 0, changed: 0, noise: 1, added: 2, deleted: 3 };

/**
 * The change sheet's rows in the order it shows them: the changed pictures, most changed
 * first (the share changed beyond noise, then the share that differs at all, then the
 * path), those that could not be read after them; then the pictures that differ only by
 * a capture's noise, in the same order; then the added; then the deleted, by path.
 */
export const sortChangeRows = (rows) =>
  [...rows].sort((a, b) => {
    const k = KIND_RANK[a.kind] - KIND_RANK[b.kind];
    if (k) return k;
    const share = (r) => (r.stats ? [r.stats.pctBeyond, r.stats.pctDiffering] : [-1, -1]);
    const [ab, ad] = share(a);
    const [bb, bd] = share(b);
    return bb - ab || bd - ad || (a.out < b.out ? -1 : a.out > b.out ? 1 : 0);
  });

const shellQuote = (p) => (/[^A-Za-z0-9_./:@%+=,~^{}-]/.test(p) ? `"${p}"` : p);

/**
 * The command that puts the pictures `outs` (paths under the docs folder, which is
 * `prefix` from the repository's root) back as the revision `rev` has them, to be run
 * in the repository's root. The tool only shows it.
 */
export const restoreCommand = (rev, prefix, outs) =>
  `git checkout ${shellQuote(rev)} -- ${outs.map((o) => shellQuote(prefix + o)).join(" ")}`;

/**
 * The command that puts back, with no IDE, every picture that differs from the revision
 * `rev` only within the noise rule, its SVG with it (shoot_docs.mjs --cleanup), to be run in
 * the repository's root: `only` the sheet's --only, `docs` its --docs, each as given, or
 * undefined. The tool only shows it.
 */
export const cleanupCommand = (rev, { only, docs } = {}) =>
  [
    "node scripts/shoot_docs.mjs --cleanup",
    rev === "HEAD" ? "" : ` --against ${shellQuote(rev)}`,
    only === undefined ? "" : ` --only ${shellQuote(only)}`,
    docs === undefined ? "" : ` --out ${shellQuote(docs)}`,
  ].join("");

// A share of the pixels, as text: two decimals, and "under 0.01" for what would round to none.
const pctText = (pct) => (pct === 0 ? "0" : pct < 0.01 ? "under 0.01" : pct.toFixed(2));

/**
 * The change sheet, a page that needs no other file but the pictures it links: `rows`
 * from compareRevisionPicture; `rev` the revision as the command line gave it, `hash`
 * and `short` the commit it names, `prefix` the docs folder's path from the repository's
 * root; `folder` the folder the files are in, relative to the page.
 */
export function changeSheetHtml({ rows, rev, hash, short, prefix, folder = "pictures", only, docs }) {
  const { figure } = figuresIn(folder);
  const sorted = sortChangeRows(rows);
  const kinds = (...wanted) => sorted.filter((r) => wanted.includes(r.kind));
  const changed = kinds("changed", "error");
  const noise = kinds("noise");
  const added = kinds("added");
  const deleted = kinds("deleted");
  const title = `Pictures changed since ${rev} (${short})`;
  const sizes = (r) =>
    r.sizeOld && r.sizeNew && (r.sizeOld[0] !== r.sizeNew[0] || r.sizeOld[1] !== r.sizeNew[1])
      ? `size changed from ${sizeText(r.sizeOld)} to ${sizeText(r.sizeNew)}`
      : sizeText(r.sizeNew ?? r.sizeOld);
  const card = (r) => {
    // Each fact is HTML: text from elsewhere is escaped as it is put in.
    const facts = [`${r.theme} theme`, esc(sizes(r))];
    if (r.error !== undefined) facts.push(`<b>not compared: ${esc(r.error)}</b>`);
    const st = r.stats;
    if (st) {
      if (!st.sameSize)
        facts.push(
          `compared aligned at the top left over the common ${st.common[0]} x ${st.common[1]} px; the map shows the whole ${st.canvas[0]} x ${st.canvas[1]} px, a pixel only the old picture has cyan, one only the new picture has magenta`,
        );
      facts.push(
        st.differing === 0
          ? "the same pixels in a different file"
          : `<b>${pctText(st.pctBeyond)}% changed beyond noise</b> (by more than ${NOISE_LEVELS} grey levels${st.sameSize ? "" : ", or in one picture only"}), ${pctText((st.faint / st.total) * 100)}% by ${NOISE_LEVELS} or fewer`,
      );
    }
    const figures = [];
    if (r.files.old) figures.push(figure(r.files.old, `As ${short} has it`));
    if (r.files.new) figures.push(figure(r.files.new, "As it is now"));
    if (r.files.map)
      figures.push(
        figure(r.files.map, "Difference (yellow: 1 grey level, shading to red at 128 or more; dark grey: the same)"),
      );
    const tip = st
      ? `${pctText(st.pctBeyond)}% changed beyond noise; the mark is ${NOISE_SHARE * 100}%, the share of the pixels the noise rule lets differ`
      : "";
    return `<section id="${anchor(r.out)}">
<h3>${esc(r.out)}</h3>
<p class="meta">${facts.join(", ")}</p>
${st ? meterHtml(st.pctBeyond, 10, NOISE_SHARE * 100, tip) : ""}
<div class="trio">${figures.join("\n")}</div>
</section>`;
  };
  const toc = (list) =>
    list
      .map(
        (r) =>
          `<li><a href="#${anchor(r.out)}">${esc(r.out)}</a> <span class="pct">${r.stats ? `${pctText(r.stats.pctBeyond)}%` : esc(r.kind)}</span></li>`,
      )
      .join("\n");
  const group = (id, heading, list, note = "") =>
    `<h2 id="${id}">${esc(heading)} (${list.length})</h2>
${note}${list.length ? list.map(card).join("\n") : "<p>None.</p>"}`;
  const noiseNote = `<p>These differ from ${esc(short)} within the noise rule the screenshotter applies (no pixel more than ${NOISE_LEVELS} grey levels off, and at most ${NOISE_SHARE * 100}% of the pixels off at all), and it never writes a capture that does: a run that kept the other version of the noise, or drift over several runs, left them.</p>
${
  noise.length
    ? `<p>To put them all back as ${esc(short)} has them, run this in the repository's root (this page only shows it; nothing has been run):</p>
<pre>${esc(
        restoreCommand(
          rev,
          prefix,
          noise.map((r) => r.out),
        ),
      )}</pre>
<p>Or this, which also puts back each one's SVG as ${esc(short)} has it (removed where it has none) and starts no IDE; with <code>--dry-run</code> it only lists them:</p>
<pre>${esc(cleanupCommand(rev, { only, docs }))}</pre>
`
    : ""
}`;
  const section = (id, heading, list) =>
    `<li><a href="#${id}">${esc(heading)}</a> (${list.length})\n<ol>\n${toc(list)}\n</ol></li>`;
  return pageHtml({
    title,
    intro: `Every PNG under docs that differs from the commit ${esc(hash)} (${esc(rev)}): the picture as the commit has it, as it is now, and the difference between them, aligned at the top left. The change is the share of pixels that differ by more than ${NOISE_LEVELS} grey levels (or exist in one picture only). Select a picture to open it full size.`,
    summary: [
      ["changed", changed.length],
      ["differ only by capture noise", noise.length],
      ["added", added.length],
      ["deleted", deleted.length],
    ],
    contents: [
      section("changed", "Changed, most changed first", changed),
      section("noise", "Differ only by capture noise", noise),
      section("added", "Added", added),
      section("deleted", "Deleted", deleted),
    ].join("\n"),
    body: [
      group("changed", "Changed, most changed first", changed),
      group("noise", "Differ only by capture noise, most likely rewritten in error", noise, noiseNote),
      group("added", "Added", added),
      group("deleted", "Deleted", deleted),
    ].join("\n"),
  });
}
