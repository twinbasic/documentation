// A picture in two themes: `X.png`, the dark picture, and beside it `X.light.png`, the light
// one. A page names only `X.png`; the build pairs the two by name. Online and offline, the
// renderer (render.mjs's themePairPlugin) writes both, each with a class that the stylesheet
// hides in the other theme (custom.scss, `.pic-light` and `.pic-dark`), and both lazy, so the
// browser fetches only the one it shows; the light one's width and height are the page's
// scaled by the two files' sizes (pairSizes). The book keeps the light one alone (lightOnly,
// from book.mjs). WIP.Build.md says why it is done this way.
//
// A picture may also have been drawn as SVG (shoot_docs.mjs --svg): `X.svg` beside `X.png`,
// `X.light.svg` beside `X.light.png`. The renderer shows each theme's SVG where it exists,
// unless the page's attribute block says `png`; the PNGs stay, as the SVGs' reference.

import { open } from "node:fs/promises";
import { replaceOutsideCode } from "./code-guard.mjs";

export const PIC_LIGHT = "pic-light";
export const PIC_DARK = "pic-dark";

const LIGHT_RE = /\.light\.png$/;
const DARK_RE = /\.png$/;

// Whether a path (a source path, or a URL's path) names a light picture, PNG or SVG.
export const isLightPicture = (p) => /\.light\.(?:png|svg)$/.test(p);

// The SVG of a picture's source path (X.svg for X.png), or null when it is no PNG.
export const svgOf = (rel) => (DARK_RE.test(rel) ? rel.replace(DARK_RE, ".svg") : null);

// Whether a static .svg is a picture's SVG rather than a diagram: it has its PNG beside it.
export const isPictureSvg = (rel, staticFiles) =>
  rel.endsWith(".svg") && staticFiles.has(rel.replace(/\.svg$/, ".png"));

// Which outputs show a picture's SVG in place of its PNG (_config.yml `picture_svg`): online,
// offline (which is also the help add-in's archive) and book, each true unless set false.
export function pictureSvgOutputs(config) {
  const c = config?.picture_svg ?? {};
  return { online: c.online !== false, offline: c.offline !== false, book: c.book !== false };
}

const SVG_URL = /\b(src|href)="([^"?#]+)\.svg((?:[?#][^"]*)?)"/;

// Rendered HTML with each picture's SVG named back as its PNG, for an output that shows the
// PNGs. The renderer shows the SVG wherever one exists and the page did not ask for `png`,
// and only then, so a src or href naming a picture's SVG (isPictureSvg) is one it swapped;
// a diagram's SVG has no PNG and is left as it is, and so is code. URLs are root-absolute
// under `baseurl`, as the renderer writes them.
export function pngPictures(html, staticFiles, baseurl = "") {
  if (!html.includes(".svg")) return html;
  const prefix = `${baseurl}/`;
  return replaceOutsideCode(html, SVG_URL, (m, attr, stem, tail) => {
    if (!stem.startsWith(prefix)) return m;
    let rel = `${stem.slice(prefix.length)}.svg`;
    try {
      rel = decodeURIComponent(rel);
    } catch {}
    return isPictureSvg(rel, staticFiles) ? `${attr}="${stem}.png${tail}"` : m;
  });
}

// The light sibling of a picture's source path, or null when it cannot have one.
export const lightSiblingOf = (rel) =>
  DARK_RE.test(rel) && !LIGHT_RE.test(rel) ? rel.replace(DARK_RE, ".light.png") : null;

// The light pictures among `rels` (source paths) with no dark picture beside them.
export function unpairedLightPictures(rels) {
  const all = new Set(rels);
  return rels.filter((r) => LIGHT_RE.test(r) && !all.has(r.replace(LIGHT_RE, ".png"))).sort();
}

// A PNG file's width and height in pixels, from its header; null when it is no PNG.
async function pngSize(file) {
  const fh = await open(file, "r");
  try {
    const b = Buffer.alloc(24);
    const { bytesRead } = await fh.read(b, 0, 24, 0);
    if (bytesRead < 24 || b.toString("latin1", 12, 16) !== "IHDR") return null;
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  } finally {
    await fh.close();
  }
}

// For each light picture among the static files ({ srcRel, srcPath }), its size and its dark
// picture's, in pixels: { "<light srcRel>": [lightW, lightH, darkW, darkH] }. The Light theme
// lays the IDE out a few pixels differently, so a light screenshot can be a little off the
// dark one's size; the renderer scales the page's width and height by it, so that each
// picture is shown at the same scale as the other. Read on the main thread, once, from the
// headers alone.
export async function pairSizes(staticFiles) {
  const byRel = new Map(staticFiles.map((s) => [s.srcRel, s.srcPath]));
  const out = Object.create(null);
  for (const [rel, file] of byRel) {
    if (!LIGHT_RE.test(rel)) continue;
    const dark = byRel.get(rel.replace(LIGHT_RE, ".png"));
    if (!dark) continue;
    const [l, d] = await Promise.all([pngSize(file), pngSize(dark)]);
    if (l && d) out[rel] = [...l, ...d];
  }
  return out;
}

// The light image's width and height, as the page's for the dark one scaled by the two
// pictures' sizes: `sizes` is pairSizes' entry. A value that is not a whole number of pixels
// (a percentage, an em) is left as it is.
export function lightDimension(value, light, dark) {
  if (!/^\d+$/.test(String(value)) || !dark) return value;
  return String(Math.round((Number(value) * light) / dark));
}

// A tag whose class list holds `name`.
const tagWithClass = (tag, name) =>
  new RegExp(String.raw`<${tag}\b[^>]*\sclass="(?:[^"]*\s)?${name}(?:\s[^"]*)?"[^>]*>`);

const DARK_IMG = tagWithClass("img", PIC_DARK);
const DARK_LINK = new RegExp(String.raw`${tagWithClass("a", PIC_DARK).source}[\s\S]*?<\/a>`);
const LIGHT_TAG = new RegExp(`${tagWithClass("img", PIC_LIGHT).source}|${tagWithClass("a", PIC_LIGHT).source}`);

// Takes `name` out of the class attribute of the tag `tag`, and the attribute with it when
// nothing is left.
const dropClass = (tag, name) =>
  tag.replace(/\sclass="([^"]*)"/, (_, list) => {
    const kept = list.split(/\s+/).filter((c) => c && c !== name);
    return kept.length ? ` class="${kept.join(" ")}"` : "";
  });

// Rendered HTML with each pair reduced to its light picture, as a plain image: the dark image
// and the dark link go, and the light ones lose their class and their `loading="lazy"` (the
// book's paged.js raises on an image that has not loaded when it breaks the pages).
export function lightOnly(html) {
  if (!html.includes(PIC_DARK)) return html;
  let out = replaceOutsideCode(html, DARK_LINK, () => "");
  out = replaceOutsideCode(out, DARK_IMG, () => "");
  return replaceOutsideCode(out, LIGHT_TAG, (tag) => dropClass(tag, PIC_LIGHT).replace(/\sloading="lazy"/, ""));
}
