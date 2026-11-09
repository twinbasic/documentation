// How far a picture's SVG is from its PNG, shared by shoot_docs.mjs --svg, which draws it
// from the live page, and replay.mjs, which draws it from its bundle. Whether that is close
// enough is decideSvg's (lib/shot-policy.mjs), and the SVG is written by applySvg
// (lib/shot-apply.mjs).

import { decodePng } from "../lib/png.mjs";
import { decideSvg, svgRule } from "../lib/shot-policy.mjs";
import { diffSvg, renderSvg, svgClip } from "./diff.mjs";

export { holdsUserName } from "./private-words.mjs";

const lf = (text) => (text === null || text === undefined ? null : text.replace(/\r\n/g, "\n"));

/**
 * Which SVG already there an SVG is the same picture as (owner, 2026-11-09): one that draws the
 * same pixels, exactly, as diffSvg draws it (an <img> at the device scale, in a page of
 * `browser`). An SVG can change in bytes no one sees (the order of its attributes, the cut of a
 * font), and such a change is not kept. The baseline's SVG is asked first, then the file's, as
 * a capture is compared with the revision's picture first, then the file (pictureFate):
 *
 *   "baseline"  `baseline` (the revision's SVG) differs from the file, and the SVG draws as it
 *               does: the file is to hold the baseline's bytes
 *   "file"      the SVG differs from the file and draws as it does: the file stays
 *   null        neither: the SVG is judged as before
 *
 * `svg` is the SVG drawn (null asks of the file itself, for an SVG that stays with its PNG),
 * `file` the file's text and `baseline` the revision's, each null when there is none. Line
 * endings do not count. Nothing is drawn when the texts already answer.
 */
export async function sameSvgAs(browser, { svg = null, file, baseline }) {
  const [f, b] = [lf(file), lf(baseline)];
  const d = lf(svg) ?? f;
  if (d === null) return null;
  const askBaseline = b !== null && f !== b;
  const askFile = svg !== null && f !== null && d !== f;
  if (!askBaseline && !askFile) return null;
  const page = await browser.newPage();
  try {
    const drawn = new Map();
    const pixels = async (text) => {
      if (!drawn.has(text)) drawn.set(text, decodePng((await renderSvg(page, text)).render));
      return drawn.get(text);
    };
    const same = async (x, y) => {
      if (x === y) return true;
      const [p, q] = [await pixels(x), await pixels(y)];
      return p.width === q.width && p.height === q.height && Buffer.from(p.rgba).equals(Buffer.from(q.rgba));
    };
    if (askBaseline && (await same(d, b))) return "baseline";
    if (askFile && (await same(d, f))) return "file";
    return null;
  } finally {
    await page.close();
  }
}

/** What a run says of an SVG that sameSvgAs found the same as `as` ("baseline" or "file"), `rev` the baseline's name. */
export const sameWhy = (as, rev) => `draws the same pixels as ${as === "baseline" ? `${rev}'s` : "the file's"}`;

/**
 * `svg` against the PNG it was taken with, in a page of `browser`:
 * {diff, verdict, faithful, by, measures}, `diff` diffSvg's (its strength map among it),
 * `verdict` decideSvg's, with the picture's `entry` in the manifest (or null), `faithful`
 * and `by` from it, and `measures` the line that says how far off it is and what the
 * converter did not draw (`stats.unsupported`).
 */
export async function judgeSvg(browser, svg, png, stats, entry = null) {
  const page = await browser.newPage();
  let diff;
  try {
    const clip = svgClip(svg);
    diff = await diffSvg(page, svg, png, { refOrigin: { x: clip.x, y: clip.y } });
  } finally {
    await page.close();
  }
  const unsupported = Object.entries(stats.unsupported).map(([k, n]) => `${k} x${n}`);
  const verdict = decideSvg(diff.strength, { entry, svg, png });
  const { faithful, by, share } = verdict;
  // A picture with a bar of its own says so, with the share at that bar's levels.
  const rule = svgRule(entry);
  const left = rule.rects.length ? `, ${rule.rects.length} rectangle${rule.rects.length > 1 ? "s" : ""} left out` : "";
  const own =
    entry?.svg?.bar || rule.rects.length
      ? `; its own bar is ${rule.share}% at ${rule.levels} levels${left}, and ${share}% are off by that`
      : "";
  const measures =
    `${diff.stats.pct32}% of pixels differ, ${diff.stats.pct96}% strongly${own}` +
    `${unsupported.length ? `; not drawn: ${unsupported.join(", ")}` : ""}`;
  return { diff, verdict, faithful, by, measures };
}
