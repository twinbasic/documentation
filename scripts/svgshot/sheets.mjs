// The two sheets sheet.mjs writes, and where it may write them. The sheet of the pictures
// with no SVG (sheetHtml): each drawn again from its bundle (redraw.mjs) and judged, worst
// first. The sheet of changes against a git revision (changeSheetHtml, sheet.mjs --against):
// the comparison of each picture (compareRevisionPicture, scripts/lib/shot-change.mjs), their
// order and the commands that put the ones within noise back; the list of them is
// changedPictures, in scripts/lib/shot-revision.mjs. Both pages are made of the pieces in
// scripts/lib/shot-views.mjs.
//
// Nothing here writes a file: sheet.mjs writes the page and its pictures.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { decodePng } from "../lib/png.mjs";
import { changeMap, compareImages, NOISE_LEVELS, NOISE_SHARE } from "../lib/shot-change.mjs";
import {
  allowancesOf,
  cardHtml,
  esc,
  figuresIn,
  meterHtml,
  pageHtml,
  pctText,
  sizeText,
  tocItem,
} from "../lib/shot-views.mjs";
import { slugOf } from "../lib/shot-apply.mjs";
import { pngDecision } from "../lib/shot-manifest.mjs";
import { cleanupResets, pngRule } from "../lib/shot-policy.mjs";
import { pngSize, themeOf } from "./redraw.mjs";

/** The generator a sheet names in its <meta>, by which a folder is known to hold one. */
export const SHEET_GENERATOR = "scripts/svgshot/sheet.mjs";

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

// ---- the sheet of the pictures with no SVG ----------------------------------------------

/** What the converter reports it did not draw (stats.unsupported), as [[kind, count]] sorted by kind. */
export const notDrawn = (unsupported) =>
  Object.entries(unsupported ?? {}).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

/** The judged rows worst first; a row that could not be judged after them; ties by path. */
export const sortRows = (rows) =>
  [...rows].sort((a, b) => (b.pct96 ?? -1) - (a.pct96 ?? -1) || (a.out < b.out ? -1 : a.out > b.out ? 1 : 0));

/**
 * The sheet, a page that needs no other file but the pictures it links: `rows` the
 * judged pictures, each {out, theme, size, pct96, pct32, pct8, faithful, by, allowance,
 * own, source ("bundle" or "file"), notes, notDrawn, files: {png, render, diff, svg}} or
 * {out, theme, size, error, files: {png}}, `by` "decision" or "rule" (decideSvg's),
 * `allowance` the SVG's allowance as text or null, and `own` {share, bar} when it has one:
 * the share off by its own bar's levels and rectangles, and its bar's share (percent);
 * `plain` the pictures with no drawing, each
 * {out, size, files: {png}}; `bar` SVG_FAITHFUL; `all` whether pictures with an SVG
 * are included; `folder` the folder the files are in, relative to the page.
 */
export function sheetHtml({ rows, plain, bar, all, folder = "pictures" }) {
  const { href, figure, thumb } = figuresIn(folder);
  const sorted = sortRows(rows);
  const judged = sorted.filter((r) => r.error === undefined);
  const title = all ? "Every picture against its SVG" : "Pictures with no SVG";
  const meter = (r) =>
    r.own
      ? meterHtml(r.own.share, 10, r.own.bar, `${r.own.share}% off by its own bar; the bar is ${r.own.bar}%`)
      : meterHtml(r.pct96, 10, bar, `${r.pct96}% strongly off; the bar is ${bar}%`);
  const card = (r) => {
    // Each fact is HTML: text from elsewhere is escaped as it is put in.
    const facts = [`${r.theme} theme`, sizeText(r.size)];
    if (r.error === undefined) {
      facts.push(
        `<b>${r.pct96}% strongly off</b> (the bar is ${bar}%), ${r.pct32}% off by 32 levels or more, ${r.pct8}% by 8 or more`,
      );
      if (r.allowance) facts.push(`${esc(r.allowance)}: <b>${r.own.share}% off by it</b>`);
      if (r.by === "decision") facts.push(`<b>${r.faithful ? "accepted" : "refused"} by a review's decision</b>`);
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
    return cardHtml({
      out: r.out,
      meta: `${facts.join(", ")}${r.files.svg ? ` (<a href="${href(r.files.svg)}">the SVG</a>)` : ""}`,
      meter: r.error === undefined ? meter(r) : "",
      figures,
    });
  };
  const thumbs = plain.map((p) => thumb(p.files.png, p.out, `${p.out}, ${sizeText(p.size)}`)).join("\n");
  const toc = sorted
    .map((r) => tocItem(r.out, `${r.pct96 ?? "not drawn"}${r.pct96 === undefined ? "" : "%"}`))
    .join("\n");
  return pageHtml({
    generator: SHEET_GENERATOR,
    title,
    intro: `${all ? "Every PNG under docs" : "Every PNG under docs with no SVG of the same name beside it"}, the build's output trees left out. A picture with a bundle is drawn again from it with the converter as it is now, and judged as the tools judge an SVG: the share of its pixels more than 96 grey levels off the PNG's, a shift of one pixel allowed. An SVG is kept only below ${bar}% (the green mark on each bar, whose full width is 10%), or below the bar of its own allowance in the manifest, which its bar then shows, unless a review decided otherwise. Select a picture to open it full size.`,
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
// The change list itself is changedPictures, in shot-revision.mjs.

/** The files a picture of the change sheet can have in a flat folder: the old PNG, the new one and the map. */
export const changeFiles = (out) => {
  const s = slugOf(out);
  return { old: `${s}.old.png`, new: `${s}.new.png`, map: `${s}.change.png` };
};

/**
 * Compares the picture `item` ({out, status}) as the revision has it (`before`, bytes, or
 * null) and as it is now (`after`), with `entry` its entry in the manifest (or null). Returns
 * {row, map}: the row of the change sheet -- {out, theme, status, kind, by, share, allowance,
 * sizeOld, sizeNew, stats, error, files} -- and the difference map as PNG bytes, null for an
 * added or deleted picture or one that could not be read. `kind` is "changed", "noise" (what
 * shoot_docs.mjs --cleanup puts back as the revision has it: within the picture's noise rule
 * of it, or kept old by a review's decision; cleanupResets), "added", "deleted" or "error" (a
 * file this tool cannot read as a PNG, with `error` the reason); `by` "decision" or "rule";
 * `share` the noise rule's share (percent) and `allowance` the PNG's allowance as text, or null.
 */
export function compareRevisionPicture(item, before, after, entry = null) {
  const { out, status } = item;
  const names = changeFiles(out);
  const rule = pngRule(entry);
  const row = {
    out,
    theme: themeOf(out),
    status,
    share: rule.share * 100,
    allowance: allowancesOf(entry).png,
    files: {},
  };
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
    const stats = compareImages(A, B, rule);
    const resets = cleanupResets({ before, after, entry, near: () => stats.noiseOnly });
    const by = pngDecision(entry, after) ? "decision" : "rule";
    row.files.map = names.map;
    return { row: { ...row, stats, by, kind: resets ? "noise" : "changed" }, map: changeMap(A, B) };
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
          : `<b>${pctText(st.pctBeyond)}% changed beyond noise</b> (by more than ${st.levels} grey levels${st.sameSize ? "" : ", or in one picture only"}), ${pctText((st.faint / st.total) * 100)}% by ${st.levels} or fewer`,
      );
    }
    if (r.allowance) facts.push(esc(r.allowance));
    if (r.by === "decision")
      facts.push(`<b>${r.kind === "noise" ? "kept old" : "taken new"} by a review's decision</b>`);
    const figures = [];
    if (r.files.old) figures.push(figure(r.files.old, `As ${short} has it`));
    if (r.files.new) figures.push(figure(r.files.new, "As it is now"));
    if (r.files.map)
      figures.push(
        figure(r.files.map, "Difference (yellow: 1 grey level, shading to red at 128 or more; dark grey: the same)"),
      );
    const mark = r.share ?? NOISE_SHARE * 100;
    const tip = st
      ? `${pctText(st.pctBeyond)}% changed beyond noise; the mark is ${mark}%, the share of the pixels the noise rule lets differ`
      : "";
    return cardHtml({
      out: r.out,
      meta: facts.join(", "),
      meter: st ? meterHtml(st.pctBeyond, 10, mark, tip) : "",
      figures,
    });
  };
  const toc = (list) => list.map((r) => tocItem(r.out, r.stats ? `${pctText(r.stats.pctBeyond)}%` : r.kind)).join("\n");
  const group = (id, heading, list, note = "") =>
    `<h2 id="${id}">${esc(heading)} (${list.length})</h2>
${note}${list.length ? list.map(card).join("\n") : "<p>None.</p>"}`;
  const noiseNote = `<p>These differ from ${esc(short)} within the noise rule the screenshotter applies (no pixel more than ${NOISE_LEVELS} grey levels off, and at most ${NOISE_SHARE * 100}% of the pixels off at all, unless the picture has an allowance of its own in the manifest), or a review decided to keep the old picture, and it never writes a capture that does: a run that kept the other version of the noise, or drift over several runs, left them.</p>
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
    generator: SHEET_GENERATOR,
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
