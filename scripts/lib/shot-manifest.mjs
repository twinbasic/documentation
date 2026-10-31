// The screenshot manifest, test/shots/manifest.json: for each picture under docs/, the build
// it was taken on and what a review remembered about it (WIP.ShotReview.md, Remembered
// overrides). shoot_docs.mjs, its --cleanup, replay.mjs and the screenshot review tool read
// it, so that a picture is judged the same way from a terminal and from the tool, and
// shoot_docs.mjs records the build of each capture it writes.
//
// A picture's entry, keyed by its path under docs/ (a light picture's with .light: each
// theme is a picture of its own), holds only what differs from the defaults:
//
//   build            the twinBASIC build the file was taken on
//   png.noise        {levels, share}: the noise rule's limits for this picture (withinNoise;
//                    NOISE_LEVELS, and NOISE_SHARE as a percentage)
//   png.ignore       [[x0, y0, x1, y1], ...]: rectangles left out of the comparison, in the
//                    picture's device pixels (x1 and y1 not included)
//   png.decision     {keep: "old" | "new", capture}: what a review decided about the capture
//                    whose SHA-1 is `capture`; any other capture is judged by the rule
//   svg.bar          {levels, share}: the SVG's bar (SVG_FAITHFUL at 96 levels)
//   svg.decision     {accept, svg, png}: whether the SVG whose SHA-1 is `svg`, compared with
//                    the PNG whose SHA-1 is `png`, is written whatever the bar says
//
// An allowance (noise, ignore, bar) lasts until it is removed; a decision lasts as long as
// the bytes it was made on.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../../lib/repo-paths.mjs";

/** The repository's manifest, for the pictures under docs/. */
export const MANIFEST = path.join(REPO_ROOT, "test", "shots", "manifest.json");

export const MANIFEST_FORMAT = 1;

/** The levels at which an SVG's difference from its PNG is counted (diff.mjs): its bar's `levels` is one of them. */
export const SVG_LEVELS = [8, 32, 96];

/** The SHA-1 of a file's bytes, or of a text as UTF-8 with its line endings LF, as hex. */
export const hashOf = (data) =>
  createHash("sha1")
    .update(typeof data === "string" ? data.replace(/\r\n/g, "\n") : data)
    .digest("hex");

const HASH = /^[0-9a-f]{40}$/;

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function checkKeys(where, value, keys) {
  if (!isObject(value)) throw new Error(`${where} is not an object`);
  for (const k of Object.keys(value)) if (!keys.includes(k)) throw new Error(`${where} has an unknown key, ${k}`);
}

function checkShare(where, share) {
  if (typeof share !== "number" || !(share >= 0 && share <= 100)) throw new Error(`${where} is not a percentage`);
}

function checkRects(where, rects) {
  if (!Array.isArray(rects)) throw new Error(`${where} is not a list`);
  rects.forEach((r, k) => {
    const ok =
      Array.isArray(r) && r.length === 4 && r.every((n) => Number.isInteger(n) && n >= 0) && r[0] < r[2] && r[1] < r[3];
    if (!ok) throw new Error(`${where}[${k}] is not [x0, y0, x1, y1] with x0 < x1 and y0 < y1`);
  });
}

function checkEntry(where, e) {
  checkKeys(where, e, ["build", "png", "svg"]);
  if (e.build !== undefined && !(Number.isInteger(e.build) && e.build > 0))
    throw new Error(`${where}.build is not a build number`);
  if (e.png !== undefined) {
    const w = `${where}.png`;
    checkKeys(w, e.png, ["noise", "ignore", "decision"]);
    const { noise, ignore, decision } = e.png;
    if (noise !== undefined) {
      checkKeys(`${w}.noise`, noise, ["levels", "share"]);
      if (noise.levels !== undefined && !(Number.isInteger(noise.levels) && noise.levels >= 0 && noise.levels <= 255))
        throw new Error(`${w}.noise.levels is not a number of grey levels, 0 to 255`);
      if (noise.share !== undefined) checkShare(`${w}.noise.share`, noise.share);
    }
    if (ignore !== undefined) checkRects(`${w}.ignore`, ignore);
    if (decision !== undefined) {
      checkKeys(`${w}.decision`, decision, ["keep", "capture"]);
      if (decision.keep !== "old" && decision.keep !== "new")
        throw new Error(`${w}.decision.keep is not "old" or "new"`);
      if (!HASH.test(decision.capture ?? "")) throw new Error(`${w}.decision.capture is not a SHA-1`);
    }
  }
  if (e.svg !== undefined) {
    const w = `${where}.svg`;
    // A rectangle left out of an SVG's comparison needs the strength map, which diff.mjs
    // does not return yet (WIP.ShotReview.md, step 3): svg.ignore is refused until it does.
    checkKeys(w, e.svg, ["bar", "decision"]);
    const { bar, decision } = e.svg;
    if (bar !== undefined) {
      checkKeys(`${w}.bar`, bar, ["levels", "share"]);
      if (bar.levels !== undefined && !SVG_LEVELS.includes(bar.levels))
        throw new Error(`${w}.bar.levels is not one of ${SVG_LEVELS.join(", ")}`);
      if (bar.share !== undefined) checkShare(`${w}.bar.share`, bar.share);
    }
    if (decision !== undefined) {
      checkKeys(`${w}.decision`, decision, ["accept", "svg", "png"]);
      if (typeof decision.accept !== "boolean") throw new Error(`${w}.decision.accept is not true or false`);
      if (!HASH.test(decision.svg ?? "")) throw new Error(`${w}.decision.svg is not a SHA-1`);
      if (!HASH.test(decision.png ?? "")) throw new Error(`${w}.decision.png is not a SHA-1`);
    }
  }
}

/** The manifest in `text`, checked: {format, pictures}. Throws, naming `name` and the key, on anything else. */
export function parseManifest(text, name = "the manifest") {
  let m;
  try {
    m = JSON.parse(text);
  } catch (e) {
    throw new Error(`${name} is not JSON: ${e.message}`);
  }
  checkKeys(name, m, ["format", "pictures"]);
  if (m.format !== MANIFEST_FORMAT) throw new Error(`${name} is of format ${m.format}, not ${MANIFEST_FORMAT}`);
  if (m.pictures !== undefined && !isObject(m.pictures)) throw new Error(`${name}'s pictures is not an object`);
  for (const [out, e] of Object.entries(m.pictures ?? {})) {
    if (!/^[^\\]+\.png$/i.test(out) || out.startsWith("/") || out.split("/").includes(".."))
      throw new Error(`${name} has a picture that is not a path under docs with forward slashes: ${out}`);
    checkEntry(`${name}'s ${out}`, e);
  }
  return { format: m.format, pictures: m.pictures ?? {} };
}

// An object with its empty objects and lists left out, and its keys in `order` first.
function pruned(value, order = []) {
  if (Array.isArray(value)) return value.length ? value : undefined;
  if (!isObject(value)) return value;
  const keys = [
    ...order.filter((k) => k in value),
    ...Object.keys(value)
      .filter((k) => !order.includes(k))
      .sort(),
  ];
  const out = {};
  for (const k of keys) {
    const v = pruned(value[k], ENTRY_ORDER[k]);
    if (v !== undefined) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}
const ENTRY_ORDER = {
  png: ["noise", "ignore", "decision"],
  svg: ["bar", "decision"],
  noise: ["levels", "share"],
  bar: ["levels", "share"],
  decision: ["keep", "capture", "accept", "svg", "png"],
};

/**
 * The manifest as its file holds it: the pictures by path, each entry's keys in a fixed
 * order, empty parts left out, two spaces of indent, a rectangle on one line, LF.
 */
export function manifestText(m) {
  const pictures = {};
  for (const out of Object.keys(m.pictures).sort()) {
    const e = pruned(m.pictures[out], ["build", "png", "svg"]);
    if (e) pictures[out] = e;
  }
  const text = JSON.stringify({ format: m.format, pictures }, null, 2);
  // [x0, y0, x1, y1] on one line: JSON.stringify puts each number on a line of its own.
  return `${text.replace(/\[\s+(\d+),\s+(\d+),\s+(\d+),\s+(\d+)\s+\]/g, "[$1, $2, $3, $4]")}\n`;
}

/**
 * The decision a review made about the capture `png` (bytes): "old", "new", or null when it
 * made none, or made one about other bytes.
 */
export function pngDecision(entry, png) {
  const d = entry?.png?.decision;
  return d && png && d.capture === hashOf(png) ? d.keep : null;
}

/** The decision a review made about a capture other than `png`: "old", "new", or null. */
export function earlierPngDecision(entry, png) {
  const d = entry?.png?.decision;
  return d && png && d.capture !== hashOf(png) ? d.keep : null;
}

/**
 * The decision a review made about the SVG `svg` (text) compared with the PNG `png` (bytes):
 * true (written), false (not written), or null when it made none about this pair.
 */
export function svgDecision(entry, svg, png) {
  const d = entry?.svg?.decision;
  if (!d || svg === null || png === null) return null;
  return d.svg === hashOf(svg) && d.png === hashOf(png) ? d.accept : null;
}

/**
 * The manifest in `file`, or an empty one when there is none: `entry(out)` a picture's entry
 * or null; `setBuild(out, build)` and `clearBuild(out)`, for a capture written and a file
 * removed; and `save()`, which writes the file when what it holds has changed (a CRLF
 * checkout of the same text is the same), through a file beside it renamed over it.
 */
export function openManifest(file = MANIFEST) {
  const had = existsSync(file) ? readFileSync(file, "utf8") : null;
  const m = had === null ? { format: MANIFEST_FORMAT, pictures: {} } : parseManifest(had, file);
  const entry = (out) => m.pictures[out] ?? null;
  return {
    file,
    entry,
    setBuild(out, build) {
      if (build === null || build === undefined) return;
      m.pictures[out] = { ...entry(out), build };
    },
    clearBuild(out) {
      if (!entry(out)) return;
      const { build: _, ...rest } = entry(out);
      m.pictures[out] = rest;
    },
    text: () => manifestText(m),
    save() {
      const text = manifestText(m);
      const now = existsSync(file) ? readFileSync(file, "utf8").replace(/\r\n/g, "\n") : null;
      if (now === text) return false;
      const temp = `${file}.${process.pid}.tmp`;
      writeFileSync(temp, text);
      renameSync(temp, file);
      return true;
    },
  };
}
