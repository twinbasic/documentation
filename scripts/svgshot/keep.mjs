// How far a picture's SVG is from its PNG, shared by shoot_docs.mjs --svg, which draws it
// from the live page, and replay.mjs, which draws it from its bundle. Whether that is close
// enough is decideSvg's (lib/shot-policy.mjs), and the SVG is written by applySvg
// (lib/shot-apply.mjs).

import { decideSvg, svgRule } from "../lib/shot-policy.mjs";
import { diffSvg, svgClip } from "./diff.mjs";

/**
 * Whether `svg` holds `user` (the Windows user name), ignoring case. The search
 * skips base64 payloads (fonts, images), in which four given letters turn up by
 * chance often enough to fail runs.
 */
export const holdsUserName = (svg, user) =>
  svg
    .replace(/;base64,[A-Za-z0-9+/=]+/g, ";base64,")
    .toLowerCase()
    .includes(user.toLowerCase());

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
