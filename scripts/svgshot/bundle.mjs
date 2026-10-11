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
// widths, the ink an underline skips, the placeholder colour, the canvases'
// pixels, the annotation layer (its box already in the document's coordinates,
// so that a scrolled page needs nothing more) -- the platform fonts of each run,
// the web fonts a run was drawn with, each scrolling box's scrollbar styles, each
// inline <svg>'s markup, and a frame's viewport and zoom.
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

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { brotliCompressSync, brotliDecompressSync, constants } from "node:zlib";
import { PictureFonts, webRulesFor, withFaces } from "./fonts.mjs";
import { decodeSnapshot, oneLine, parseShadows, renderSvg, unzoom } from "./snapshot-svg.mjs";

/**
 * The format of a bundle; one of another version is not read. Version 2 keeps a
 * web font as its rules and files (webFonts, fontFiles) where version 1 kept the
 * one file picked, and adds the inline <svg>s.
 */
export const BUNDLE_VERSION = 2;

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
    const platform = new Map(m.platform);
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
      inner: m.inner,
    };
  };

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

// How far past a layout object's box its painting can reach, beyond its shadows
// and its outline: a glyph's overhang, a focus ring.
const REACH = 8;

/**
 * The snapshot cut down to what a picture of `view` (page CSS px) draws from, and
 * the same picture: the layout objects whose box, with its shadows and outline,
 * comes near the view, every layout object of an element one of them belongs to,
 * and those of all their ancestors (an ancestor gives its styles, clip,
 * transform, opacity and stacking); a frame's document only when its <iframe>
 * keeps a layout object; the text of a <style> and a <script> emptied; and the
 * strings no longer used dropped. Every DOM node is kept, so that a <select>'s
 * options and a control's text are there. `styles` are the names of the
 * snapshot's computed styles, in order.
 */
export function trimSnapshot(snapshot, view, styles) {
  const S = snapshot.strings;
  const at = (name) => styles.indexOf(name);
  const [shadowAt, widthAt, offsetAt] = ["box-shadow", "outline-width", "outline-offset"].map(at);
  const px = (v) => Number.parseFloat(v) || 0;
  const near = ([x, y, w, h], st) => {
    const shadow = parseShadows(S[st[shadowAt]] ?? "none").reduce(
      (m, s) => Math.max(m, s.blur * 1.5 + s.spread + Math.abs(s.x) + Math.abs(s.y)),
      0,
    );
    const r = shadow + Math.abs(px(S[st[offsetAt]])) + px(S[st[widthAt]]) + REACH;
    return x - r < view.x + view.w && x + w + r > view.x && y - r < view.y + view.h && y + h + r > view.y;
  };
  // A document of a frame and the node of the <iframe> it is drawn in, in its parent's document.
  const owners = new Map();
  for (const [di, d] of snapshot.documents.entries()) {
    const c = d.nodes.contentDocumentIndex;
    for (const [k, n] of (c?.index ?? []).entries()) owners.set(c.value[k], { di, n });
  }
  const keptNodes = snapshot.documents.map(() => new Set());
  const docs = snapshot.documents.map((d, di) => {
    const L = d.layout;
    const N = d.nodes;
    const owner = owners.get(di);
    let keep;
    if (di === 0) {
      const nodes = new Set();
      for (const [li, n] of L.nodeIndex.entries()) if (near(L.bounds[li], L.styles[li])) nodes.add(n);
      for (const n of [...nodes]) for (let a = N.parentIndex[n]; a >= 0; a = N.parentIndex[a]) nodes.add(a);
      keep = L.nodeIndex.map((n) => nodes.has(n));
      keptNodes[di] = nodes;
    } else {
      // A frame's document is in its own coordinates: it is kept whole, or not at all.
      const shown = owner && keptNodes[owner.di].has(owner.n);
      keep = L.nodeIndex.map(() => shown);
      keptNodes[di] = shown ? new Set(L.nodeIndex) : new Set();
    }
    // Each layout object kept keeps the index it had, which its key is made of (decodeSnapshot):
    // what was measured of it at the capture (its scrollbars) is found by that key.
    const layout = pick(L, keep);
    layout.originalIndex = (L.originalIndex ?? L.nodeIndex.map((_, li) => li)).filter((_, li) => keep[li]);
    return { ...d, nodes: emptyStyleText(N, S), layout, textBoxes: pickTextBoxes(d.textBoxes, keep) };
  });
  return compactStrings({ ...snapshot, documents: docs });
}

// The text nodes of <style> and <script> elements, which no picture draws, emptied.
function emptyStyleText(N, S) {
  const value = N.nodeValue.map((v, i) => {
    const p = N.parentIndex[i];
    const parent = p >= 0 ? S[N.nodeName[p]] : null;
    return N.nodeType[i] === 3 && (parent === "STYLE" || parent === "SCRIPT") ? -1 : v;
  });
  return { ...N, nodeValue: value };
}

// The layout table's rows that `keep` says, every column alike: a column of one
// value per row, and a rare column ({index}) of row numbers, renumbered.
function pick(L, keep) {
  const map = [];
  let next = 0;
  for (const k of keep) map.push(k ? next++ : -1);
  const out = {};
  for (const [name, col] of Object.entries(L)) {
    if (Array.isArray(col) && col.length === keep.length) out[name] = col.filter((_, i) => keep[i]);
    else if (col && Array.isArray(col.index)) {
      const rows = col.index.map((r, k) => [map[r], k]).filter(([r]) => r >= 0);
      out[name] = { ...col, index: rows.map(([r]) => r) };
      if (Array.isArray(col.value)) out[name].value = rows.map(([, k]) => col.value[k]);
    } else out[name] = col;
  }
  return out;
}

function pickTextBoxes(T, keep) {
  const map = [];
  let next = 0;
  for (const k of keep) map.push(k ? next++ : -1);
  const rows = T.layoutIndex.map((l, k) => [map[l], k]).filter(([l]) => l >= 0);
  const out = { layoutIndex: rows.map(([l]) => l) };
  for (const name of Object.keys(T)) if (name !== "layoutIndex") out[name] = rows.map(([, k]) => T[name][k]);
  return out;
}

// The string table with only the strings still used, every reference renumbered:
// the documents' own strings, the nodes' names, values and attributes and their
// rare string columns, and the layout objects' styles and text.
const DOC_STRINGS = [
  "documentURL",
  "title",
  "baseURL",
  "contentLanguage",
  "encodingName",
  "publicId",
  "systemId",
  "frameId",
];
const RARE_STRINGS = [
  "textValue",
  "inputValue",
  "currentSourceURL",
  "originURL",
  "pseudoType",
  "pseudoIdentifier",
  "shadowRootType",
];
function compactStrings(snapshot) {
  const map = new Map();
  const strings = [];
  const id = (i) => {
    if (i === undefined || i === null || i < 0) return i;
    if (!map.has(i)) map.set(i, strings.push(snapshot.strings[i]) - 1);
    return map.get(i);
  };
  const documents = snapshot.documents.map((d) => {
    const out = { ...d };
    for (const k of DOC_STRINGS) if (k in d) out[k] = id(d[k]);
    const N = d.nodes;
    const nodes = { ...N, nodeName: N.nodeName.map(id), nodeValue: N.nodeValue.map(id) };
    if (N.attributes) nodes.attributes = N.attributes.map((a) => a.map(id));
    for (const k of RARE_STRINGS) if (N[k]) nodes[k] = { ...N[k], value: N[k].value.map(id) };
    out.nodes = nodes;
    const L = d.layout;
    out.layout = { ...L, styles: L.styles.map((st) => st.map(id)), text: L.text.map(id) };
    return out;
  });
  return { ...snapshot, strings, documents };
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
