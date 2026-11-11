// The size a page declares for a screenshot, `{:width="..." height="..."}` after its image
// (WIP.ShotReview.md, One way to take pictures, rule 4): a picture's pixels divided by the scale
// it was taken at, rounded. A page picture is taken at 2x (shoot_docs.mjs's SCALE); a picture of
// a program's window at the display's DPI, which the manifest records as the picture's `scale`
// when it is not 2 (shot-manifest.mjs). Whatever writes a dark picture under docs/ --- the review
// tool's applier, shoot_docs.mjs, its --cleanup --- sets the size of every reference to it with
// syncSizes; the review tool's commit takes a page's size changes alone (withShownSizes on HEAD's
// text); and check_shot_sizes.mjs fails a manifest picture whose declared size is not this.
//
// A reference is an image in markdown, `![alt](src)`, outside code (lib/markdown.mjs's maskCode),
// with or without its attribute list; only the dark picture is referenced, the light one being
// paired with it by name. A light picture's size may differ by a few pixels (SIZE_SLACK), and the
// page declares the dark one's.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { markdownFilesSync } from "../../lib/markdown-files.mjs";
import { maskCode } from "../../lib/markdown.mjs";
import { pngSize } from "./png.mjs";
import { SHOT_SCALE } from "./shot-manifest.mjs";

export { SHOT_SCALE };

/** The scale the picture of `entry` (its manifest entry, or null) was taken at. */
export const scaleOf = (entry) => entry?.scale ?? SHOT_SCALE;

/** The size a page declares for a picture of `[w, h]` pixels taken at `scale`: {width, height}. */
export const shownSize = ([w, h], scale = SHOT_SCALE) => ({
  width: Math.round(w / scale),
  height: Math.round(h / scale),
});

/**
 * The size a page declares for the picture `out` under `docsRoot`, from its file and its scale
 * (`entry`, its manifest entry), or null when there is no such PNG.
 */
export function shownSizeOfFile(docsRoot, out, entry) {
  const file = path.join(docsRoot, out);
  if (!existsSync(file)) return null;
  const size = pngSize(readFileSync(file));
  return size ? shownSize(size, scaleOf(entry)) : null;
}

const LIGHT = /\.light\.png$/i;
/** Whether `out` is a dark picture, the one pages reference. */
export const isDark = (out) => /\.png$/i.test(out) && !LIGHT.test(out);

// An image whose source is a PNG, and its attribute list when it has one. The alt text is on one
// line, as every page writes it; a source may hold spaces ("project settings description
// text.png") and be in angle brackets.
const REF = /!\[(?:[^\]\\\n]|\\.)*\]\(\s*<?([^()<>\n]+?\.png)>?\s*\)(\{:([^}\n]*)\})?/gi;

/**
 * The picture under docs/ that `src`, written on the page `page` (its path under docs/ with
 * forward slashes), names, or null for a URL with a scheme. A source starting with a slash is
 * from docs/ itself, where a picture is served at its source path.
 */
export function targetOf(page, src) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith("//")) return null;
  let s = src;
  try {
    s = decodeURI(src);
  } catch {}
  const joined = s.startsWith("/") ? s.slice(1) : path.posix.join(path.posix.dirname(page), s);
  const out = path.posix.normalize(joined);
  return out.startsWith("../") ? null : out;
}

const sizeIn = (attrs, key) => {
  const m = new RegExp(`(?:^|\\s)${key}="(\\d+)"`).exec(attrs ?? "");
  return m ? Number(m[1]) : null;
};

/**
 * The references to pictures on the page `page` whose text is `text`: [{line, src, out, width,
 * height, attrs}], `line` from 1, `width` and `height` as declared (null when not), `attrs` the
 * attribute list's text, or null when the image has none. Code is left out.
 */
export function pictureRefs(text, page) {
  const { masked, restore } = maskCode(text);
  const refs = [];
  for (const m of masked.matchAll(REF)) {
    const out = targetOf(page, m[1]);
    if (!out) continue;
    const line = restore(masked.slice(0, m.index)).split("\n").length;
    refs.push({
      line,
      src: m[1],
      out,
      width: sizeIn(m[3], "width"),
      height: sizeIn(m[3], "height"),
      attrs: m[3] ?? null,
    });
  }
  return refs;
}

// The attribute list `attrs` (null for none) with its width and height set to `size`; every other
// word kept where it is (`png`, a class).
function withSize(attrs, { width, height }) {
  if (attrs === null) return `{:width="${width}" height="${height}"}`;
  const hasW = /(^|\s)width="\d*"/.test(attrs);
  const hasH = /(^|\s)height="\d*"/.test(attrs);
  if (hasW && hasH)
    return `{:${attrs.replace(/(^|\s)width="\d*"/, `$1width="${width}"`).replace(/(^|\s)height="\d*"/, `$1height="${height}"`)}}`;
  const rest = attrs.replace(/(^|\s)(width|height)="\d*"/g, "").trim();
  return `{:width="${width}" height="${height}"${rest ? ` ${rest}` : ""}}`;
}

/**
 * `text`, the page `page`'s, with the declared size of every reference to a picture set to
 * `sizeOf(out)` ({width, height}), and left as it is where `sizeOf` gives null. Code and every
 * other character are kept, line endings included.
 */
export function withShownSizes(text, page, sizeOf) {
  const { masked, restore } = maskCode(text);
  const rewritten = masked.replace(REF, (whole, src, list, attrs) => {
    const out = targetOf(page, src);
    const size = out ? sizeOf(out) : null;
    if (!size) return whole;
    if (sizeIn(attrs, "width") === size.width && sizeIn(attrs, "height") === size.height) return whole;
    const head = list === undefined ? whole : whole.slice(0, -list.length);
    return head + withSize(attrs ?? null, size);
  });
  return rewritten === masked ? text : restore(rewritten);
}

/**
 * The pages under `docsRoot` that reference each picture: a Map from a picture's path under
 * docs/ to the pages (paths under docs/, sorted). Reads every page once.
 */
export function referenceIndex(docsRoot) {
  const index = new Map();
  for (const page of markdownFilesSync(docsRoot)) {
    const text = readFileSync(path.join(docsRoot, page), "utf8");
    if (!/\.png/i.test(text)) continue;
    for (const { out } of pictureRefs(text, page)) {
      if (!index.has(out)) index.set(out, []);
      const pages = index.get(out);
      if (!pages.includes(page)) pages.push(page);
    }
  }
  return index;
}

/**
 * Sets the declared size of every reference to the dark pictures among `outs` to the size their
 * files under `docsRoot` are shown at (shownSizeOfFile, `entry(out)` the manifest's entry). The
 * pages are those `index` (referenceIndex's, made when not given) names, each read again before
 * it is written, and written only when it changes. With `dryRun` nothing is written. Returns the
 * pages that change, [{page, outs}], `outs` the pictures whose declared size changes there.
 */
export function syncSizes(docsRoot, outs, entry, { index = null, dryRun = false } = {}) {
  const darks = [...new Set(outs.filter(isDark))];
  if (!darks.length) return [];
  const refs = index ?? referenceIndex(docsRoot);
  const sizes = new Map(darks.map((out) => [out, shownSizeOfFile(docsRoot, out, entry(out))]));
  const pages = new Map();
  for (const out of darks)
    for (const page of refs.get(out) ?? []) {
      if (!pages.has(page)) pages.set(page, []);
      pages.get(page).push(out);
    }
  const changed = [];
  for (const [page, pageOuts] of [...pages].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const file = path.join(docsRoot, page);
    if (!existsSync(file)) continue;
    const text = readFileSync(file, "utf8");
    const next = withShownSizes(text, page, (out) => (pageOuts.includes(out) ? sizes.get(out) : null));
    if (next === text) continue;
    if (!dryRun) writeFileSync(file, next);
    // the pictures whose size the page now declares otherwise
    const resized = pictureRefs(text, page)
      .filter((r) => {
        const s = pageOuts.includes(r.out) ? sizes.get(r.out) : null;
        return s && (r.width !== s.width || r.height !== s.height);
      })
      .map((r) => r.out);
    changed.push({ page, outs: [...new Set(resized)].sort() });
  }
  return changed;
}

/**
 * The references under `docsRoot` to the dark pictures `outs` whose declared size is not what
 * their files are shown at: [{page, line, out, declared, shown}], `declared` {width, height}
 * (null parts for one not declared). A picture with no file is left out.
 */
export function sizeMismatches(docsRoot, outs, entry, { index = null } = {}) {
  const refs = index ?? referenceIndex(docsRoot);
  const wrong = [];
  for (const out of [...new Set(outs.filter(isDark))].sort()) {
    const shown = shownSizeOfFile(docsRoot, out, entry(out));
    if (!shown) continue;
    for (const page of refs.get(out) ?? []) {
      const text = readFileSync(path.join(docsRoot, page), "utf8");
      for (const r of pictureRefs(text, page))
        if (r.out === out && (r.width !== shown.width || r.height !== shown.height))
          wrong.push({ page, line: r.line, out, declared: { width: r.width, height: r.height }, shown });
    }
  }
  return wrong;
}
