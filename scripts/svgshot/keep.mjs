// How far a picture's SVG is from its PNG, shared by shoot_docs.mjs --svg, which draws it
// from the live page, and replay.mjs, which draws it from its bundle. Whether that is close
// enough is decideSvg's (lib/shot-policy.mjs), and the SVG is written by applySvg
// (lib/shot-apply.mjs).

import { decideSvg } from "../lib/shot-policy.mjs";
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
 * {diff, faithful, measures}, `faithful` decideSvg's verdict and `measures` the line
 * that says how far off it is and what the converter did not draw (`stats.unsupported`).
 */
export async function judgeSvg(browser, svg, png, stats) {
  const page = await browser.newPage();
  let diff;
  try {
    const clip = svgClip(svg);
    diff = await diffSvg(page, svg, png, { refOrigin: { x: clip.x, y: clip.y } });
  } finally {
    await page.close();
  }
  const unsupported = Object.entries(stats.unsupported).map(([k, n]) => `${k} x${n}`);
  const measures =
    `${diff.stats.pct32}% of pixels differ, ${diff.stats.pct96}% strongly` +
    `${unsupported.length ? `; not drawn: ${unsupported.join(", ")}` : ""}`;
  return { diff, faithful: decideSvg(diff.stats).faithful, measures };
}
