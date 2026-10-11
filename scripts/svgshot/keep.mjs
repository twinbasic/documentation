// Whether a picture's SVG is written beside its PNG, shared by shoot_docs.mjs --svg,
// which draws it from the live page, and replay.mjs, which draws it from its bundle.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { diffSvg, svgClip } from "./diff.mjs";

// The most an SVG may differ from its PNG and still be written: the share of
// its pixels (percent) more than 96 grey levels off the PNG's, a shift of one
// pixel allowed. Past it something is drawn wrongly or not at all -- a part
// the converter does not draw, the help pane's page from another origin --
// and the page goes on showing the PNG.
export const SVG_FAITHFUL = 0.25;

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
 * {diff, faithful, measures}, `measures` the line that says how far off it is
 * and what the converter did not draw (`stats.unsupported`).
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
  return { diff, faithful: diff.stats.pct96 < SVG_FAITHFUL, measures };
}

/**
 * Writes `svg` to `file` unless it holds it already: "new", "updated" or
 * "unchanged". The file may have been checked out with CRLF line endings, on its
 * last line alone (the SVG is on one line, oneLine in snapshot-svg.mjs).
 */
export function writeSvg(file, svg) {
  let state = "new";
  if (existsSync(file)) state = readFileSync(file, "utf8").replace(/\r\n/g, "\n") === svg ? "unchanged" : "updated";
  if (state !== "unchanged") writeFileSync(file, svg);
  return state;
}
