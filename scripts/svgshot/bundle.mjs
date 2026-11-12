// A picture's bundle: everything the SVG converter reads from the live page, as
// data, so that an SVG can be drawn again after the converter changes without
// taking the picture again (replay.mjs).
//
// capture.mjs's collectBundle reads it from the page; renderBundle draws the SVG
// from it alone. svgOfPage is the one followed by the other, so a picture drawn
// live and the same picture drawn from its bundle are the same bytes.
//
// What a bundle holds: the DOM snapshot as DevTools gave it, with the names of
// the computed styles it holds (by position); the clip; and for
// each document measured (the page's, and each frame of the same process in the
// clip, by frame id) the answers its measuring layer gave -- font metrics, run
// widths, the ink an underline skips, where an ellipsis cuts a line (`cuts`, the
// questions, as `skips` are kept beside their answers), the text a focused field has
// selected and its colours (`selection`), the placeholder colour, the canvases'
// pixels, the annotation layer (its box already in the document's coordinates,
// so that a scrolled page needs nothing more) -- the platform fonts of each run,
// the web fonts a run was drawn with, each scrolling box's scrollbar styles, each
// inline <svg>'s markup, each search field's clear button (`searchButtons`,
// [layout object's key, what capture.mjs's searchButton read] pairs; a bundle
// taken before they were read has none, and a field with text is a miss), and a
// frame's viewport and zoom.
//
// A web font is kept as the @font-face rules of its family that some run was
// drawn with: per font key, `webFonts[key]` lists them in the page's order, each
// {family, range, lo, hi} -- its unicode-range text, and the weights it holds --
// with `family` naming its file in `fontFiles`, which holds each file's bytes
// once (a data: URL), or null where the file could not be read. Which rule draws
// a character is decided when the SVG is drawn (webRulesFor), as it is in the page.
// An inline <svg> is kept as `svgs`, [layout object's key, markup] pairs: what
// capture.mjs's inlineSvg read, its text runs among the runs measured.
//
// A bundle answers only the questions the converter asked when it was taken:
// textNeeds lists the runs to measure. A converter that asks another (a run it
// did not draw before) gets no answer; renderBundle counts each such miss, and
// replay.mjs names the pictures that need taking again. A change to what is
// read from the page, the kind that no miss shows (the rules of a split font, an
// <svg>'s markup), raises BUNDLE_VERSION, and an older bundle is not read: replay.mjs
// lists it as needing a retake, since it cannot tell which pictures the change
// reaches. A bundle holds URLs into the IDE's work folder, and so the Windows user
// name: bundles stay in a cache that is never committed or published.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { brotliCompressSync, brotliDecompressSync, constants } from "node:zlib";
import { REPO_ROOT } from "../../lib/repo-paths.mjs";
import { compactImage } from "../lib/compact-image.mjs";
import { pngSize } from "../lib/png.mjs";
import { collectBundle } from "./capture.mjs";
import { PictureFonts, webRulesFor, withFaces } from "./fonts.mjs";
import {
  accentUnknown,
  decodeSnapshot,
  ellipsisLines,
  oneLine,
  renderSvg,
  unzoom,
  useImageTools,
} from "./snapshot-svg.mjs";
import { BUNDLE_VERSION } from "./snapshot-trim.mjs";

export { BUNDLE_VERSION, trimSnapshot } from "./snapshot-trim.mjs";

useImageTools({ compactImage, pngSize });

/** The bundle cache: gitignored, outside docs/, since a bundle holds the Windows user name. */
export const BUNDLE_CACHE = path.join(REPO_ROOT, ".svgshot-bundles");

/**
 * A worktree's bundle cache, filled from the main checkout's the first time a tool uses it
 * (owner, WIP.ShotReview.md (c)), so that a new worktree does not redraw every SVG whose bundle it
 * lacks. Nothing happens in the main checkout itself, outside a git working tree, when the cache
 * is there already (even empty: it has been used), or when the main checkout has none. The files
 * are copied, never linked: writeBundle rewrites a file in place, and a link would rewrite the main
 * checkout's. The copy goes to a folder beside the cache and is renamed into place, so a copy cut
 * short leaves no cache that looks used.
 *
 * @param {string} [cache]  the worktree's cache folder
 * @param {object} [o]
 * @param {string} [o.repo]  the working tree to ask git about
 * @returns {string | null}  the folder copied from, or null when nothing was copied
 */
export function seedBundleCache(cache = BUNDLE_CACHE, { repo = REPO_ROOT } = {}) {
  if (existsSync(cache)) return null;
  const git = (...args) => {
    const r = spawnSync("git", ["-C", repo, "rev-parse", "--path-format=absolute", ...args], {
      encoding: "utf8",
      windowsHide: true,
    });
    return r.status === 0 ? path.resolve(r.stdout.trim()) : null;
  };
  const common = git("--git-common-dir");
  const own = git("--git-dir");
  if (!common || !own || common.toLowerCase() === own.toLowerCase()) return null;
  if (path.basename(common).toLowerCase() !== ".git") return null;
  const from = path.join(path.dirname(common), path.basename(cache));
  if (!existsSync(from) || path.resolve(from).toLowerCase() === path.resolve(cache).toLowerCase()) return null;
  const filling = `${cache}.filling-${process.pid}`;
  try {
    cpSync(from, filling, { recursive: true });
    renameSync(filling, cache);
  } catch (e) {
    rmSync(filling, { recursive: true, force: true });
    if (existsSync(cache)) return null; // another tool of this worktree filled it first
    throw e;
  }
  return from;
}

/**
 * BUNDLE_CACHE, seeded first (seedBundleCache) and said so on `tool`'s behalf: what a tool uses
 * when no --bundles names another cache.
 */
export function defaultBundleCache(tool) {
  const from = seedBundleCache();
  if (from) console.log(`${tool}: this worktree's bundle cache was filled from the main checkout's (${from})`);
  return BUNDLE_CACHE;
}

/**
 * The SVG picture of `clip` ({x, y, width, height} CSS px; null for the whole
 * viewport) of the page `conn` is attached to. `background` is false for a
 * cut-out. Returns {svg, stats, misses, bundle}: the picture drawn from the
 * bundle read from the page (capture.mjs), and the bundle.
 */
export async function svgOfPage(conn, clip, options = {}) {
  const bundle = await collectBundle(conn, clip, options);
  return { ...(await renderBundle(bundle)), bundle };
}

// Every document of a decoded snapshot, the page's first, with its frames' after it.
function documentsOf(page) {
  const out = [page];
  for (let i = 0; i < out.length; i++) for (const n of out[i].nodes) if (n.frame) out.push(n.frame);
  return out;
}

/**
 * The SVG of a bundle: {svg, stats, misses}, `misses` the questions the bundle had
 * no answer for (sorted), each once.
 */
export async function renderBundle(bundle) {
  const { drawn, fonts, misses } = drawBundle(bundle);
  const svg = oneLine(await withFaces(drawn.svg, fonts));
  const failed = fonts.failed?.length ?? 0;
  if (failed) drawn.stats.unsupported["text in a font that could not be cut"] = failed;
  return { svg, stats: drawn.stats, misses };
}

/**
 * A bundle drawn, before its fonts are cut: {drawn, fonts, misses}, `drawn`
 * renderSvg's result and `fonts` the PictureFonts its text was set in. Two bundles
 * that draw the same here make the same SVG.
 */
export function drawBundle(bundle) {
  if (bundle.version !== BUNDLE_VERSION)
    throw new Error(`a bundle of version ${bundle.version}, not ${BUNDLE_VERSION}`);
  const decoded = decodeSnapshot(bundle.snapshot, bundle.styles);
  const byFrame = new Map(documentsOf(decoded).map((d) => [d.frameId, d]));
  const misses = new Set();
  const measured = new Map();
  for (const m of bundle.docs) {
    const doc = byFrame.get(m.frameId);
    if (!doc) continue;
    if (m.scale !== null) unzoom(doc, m.scale);
    measured.set(doc, m);
  }

  const fonts = new PictureFonts();
  const envOf = (m) => {
    const { page } = m;
    const widths = new Map(page.allRuns.map(([key, text], k) => [`${key}\u0000${text}`, page.widths[k]]));
    const gaps = new Map(m.skips.map((skip, k) => [skip.join("\u0000"), page.gaps[k]]));
    const cuts = new Map((m.cuts ?? []).map((cut, k) => [cut.join("\u0000"), page.cuts[k]]));
    const platform = new Map(m.platform);
    const buttons = m.searchButtons ? new Map(m.searchButtons) : null;
    const miss = (what) => {
      misses.add(what);
      return null;
    };
    return {
      metrics: (key) => page.metrics[key] ?? (miss(`metrics ${key}`) || { ascent: 0, height: 0, line: 0 }),
      textWidth: (key, text) => {
        const id = `${key}\u0000${text}`;
        return widths.has(id) ? widths.get(id) : miss(`width ${key} ${JSON.stringify(text)}`);
      },
      inkGaps: (...skip) => {
        const id = skip.join("\u0000");
        return gaps.has(id) ? gaps.get(id) : miss(`ink ${JSON.stringify(skip)}`);
      },
      cut: (...cut) => {
        const id = cut.join("\u0000");
        return cuts.has(id) ? cuts.get(id) : miss(`cut ${JSON.stringify(cut)}`);
      },
      placeholderColor: page.placeholderColor,
      canvases: page.canvases,
      fontsFor: (key, text) => {
        const id = `${key}\u0000${text}`;
        if (!platform.has(id)) return miss(`fonts ${key} ${JSON.stringify(text)}`) ?? [];
        // A variable file is drawn at the weight asked for, held to the weights its rule declares.
        const weight = Number(JSON.parse(key)[1]) || 400;
        const web = webRulesFor(m.webFonts[key] ?? [], text).flatMap((rule) => {
          const data = rule.family && m.fontFiles[rule.family];
          // `range` makes each file the face of the characters of its own rule only.
          return data
            ? [
                {
                  family: rule.family,
                  data,
                  weight: String(Math.min(Math.max(weight, rule.lo), rule.hi)),
                  range: rule.range,
                },
              ]
            : [];
        });
        let placed = false;
        return platform
          .get(id)
          .toSorted((a, b) => b.glyphCount - a.glyphCount)
          .flatMap((f) => {
            if (!f.isCustomFont) return [{ ps: f.postScriptName }];
            // The web font's files, all at the place of the first font Chromium reported
            // for it, whichever names it gave.
            if (placed) return [];
            placed = true;
            return web;
          })
          .filter((s) => s?.ps || s?.data);
      },
      scrollbars: new Map(m.scrollbars),
      svgs: new Map(m.svgs),
      // a bundle taken before the clear buttons were read cannot say whether one shows
      searchButton: (key) =>
        buttons ? (buttons.get(key) ?? null) : miss("the clear button of a search field that shows text"),
      selection: m.selection,
      inner: m.inner,
    };
  };

  // A bundle taken before text-overflow was read cannot say whether a line its block
  // clips ends in an ellipsis: the question is one it has no answer for.
  for (const doc of measured.keys())
    if (ellipsisLines(doc).unknown) misses.add("text-overflow of a line its block clips");
  // Nor, before accent-color was read, the colour of a checked checkbox or radio button.
  for (const doc of measured.keys())
    if (accentUnknown(doc)) misses.add("accent-color of a checked checkbox or radio button");
  // Nor, before zoom was read, the size of what an element its inline style zooms holds.
  for (const doc of measured.keys()) if (doc.zoomUnknown) misses.add("zoom of an element its inline style zooms");

  const mine = measured.get(decoded);
  if (!mine) throw new Error("the bundle has no measurements of the page");
  const page = envOf(mine);
  const overlays = mine.page.overlays.map((xml) =>
    xml.replace(/--tbk:\s*(\d+);?/g, (_, k) => {
      const { key, text } = mine.page.marked[Number(k)];
      const [style, weight] = JSON.parse(key);
      // Into a style="..." attribute: the face names' quotes must not end it.
      const css = fonts.css(text, page.fontsFor(key, text), weight, style)?.replace(/"/g, "'");
      return css ? `${css};` : "";
    }),
  );
  const drawn = renderSvg(decoded, {
    clip: bundle.view,
    ...page,
    fonts,
    background: bundle.background,
    overlays,
    frames: (doc) => (measured.has(doc) ? envOf(measured.get(doc)) : null),
  });
  return { drawn, fonts, misses: [...misses].sort() };
}

// --- the bundle files ----------------------------------------------------------------
//
// One file per picture holds both its themes, {dark, light} (either null), the dark one's
// text first: the two are mostly the same page, and Brotli with a 16 MB window finds the
// light one's repeats in the dark one, which gzip's 32 KB window cannot. Measured on three
// pictures, the pair takes 30% of what two gzipped files took.

const SUFFIX = ".bundle.json.br";
const LIGHT = /\.light\.png$/i;

// A picture's theme, and the path of the dark picture, which names its file.
const themeOf = (out) =>
  LIGHT.test(out) ? { theme: "light", base: out.replace(LIGHT, ".png") } : { theme: "dark", base: out };

/** The bundle file of a picture `out` (its path under docs/, ".light" for a light one) under `root`. */
export const bundleFile = (root, out) => path.join(root, themeOf(out).base.replace(/\.png$/i, SUFFIX));

/** The SHA-1 of a picture's bytes, which a bundle records to tell when it no longer matches. */
export const pngHash = (png) => createHash("sha1").update(png).digest("hex");

function readPair(file) {
  if (!existsSync(file)) return { dark: null, light: null };
  return JSON.parse(brotliDecompressSync(readFileSync(file)).toString("utf8"));
}

function writePair(file, pair) {
  if (!pair.dark && !pair.light) {
    rmSync(file, { force: true });
    return;
  }
  const text = Buffer.from(JSON.stringify({ dark: pair.dark, light: pair.light }));
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(
    file,
    brotliCompressSync(text, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 9,
        [constants.BROTLI_PARAM_LGWIN]: 24,
        [constants.BROTLI_PARAM_SIZE_HINT]: text.length,
      },
    }),
  );
}

/** Writes `bundle` for the picture `out`, with the hash of the PNG it was taken with and its misses. */
export function writeBundle(root, out, bundle, png, misses) {
  const file = bundleFile(root, out);
  const pair = readPair(file);
  pair[themeOf(out).theme] = { ...bundle, out, png: pngHash(png), misses };
  writePair(file, pair);
  return file;
}

/** Removes the bundle of the picture `out`, as when the picture is no longer kept. */
export function dropBundle(root, out) {
  const file = bundleFile(root, out);
  if (!existsSync(file)) return;
  const pair = readPair(file);
  pair[themeOf(out).theme] = null;
  writePair(file, pair);
}

/** The bundle of the picture `out`, or null. */
export const readBundle = (root, out) => readPair(bundleFile(root, out))[themeOf(out).theme];

/**
 * Puts the bundle of the picture `out` under `fromRoot` in its place under `toRoot` as it is,
 * or, when `png` is given, naming that PNG as the one it was taken with; removes the one under
 * `toRoot` when `fromRoot` has none. The other theme's bundle under `toRoot` is kept. Returns
 * whether there was one to copy. The screenshot review tool moves a run's staged bundles into
 * the cache with it, naming the PNG the file holds once a review has decided.
 */
export function copyBundle(fromRoot, toRoot, out, png = null) {
  const bundle = readBundle(fromRoot, out);
  const file = bundleFile(toRoot, out);
  const pair = readPair(file);
  pair[themeOf(out).theme] = bundle && png ? { ...bundle, png: pngHash(png) } : bundle;
  writePair(file, pair);
  return !!bundle;
}

/** Every picture with a bundle under `root`, as its path under docs/ with forward slashes. */
export function listBundles(root) {
  const outs = [];
  for (const f of readdirSync(root, { recursive: true }).map((p) => String(p).replace(/\\/g, "/"))) {
    if (!f.endsWith(SUFFIX)) continue;
    const pair = readPair(path.join(root, f));
    const base = f.slice(0, -SUFFIX.length);
    if (pair.dark) outs.push(`${base}.png`);
    if (pair.light) outs.push(`${base}.light.png`);
  }
  return outs.sort();
}
