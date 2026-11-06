// Trims a capture of the whole window to its picture's own area: what chromeshot.mjs does to a
// picture the panel's table gives a trim (chrome/shots.mjs). A rectangle dragged by hand comes out
// a little different at every retake, and a picture's place on the page should not. So the area
// is worked out from the page: the box round the elements the table names, as the capture's
// DOM snapshot has them, and the marks drawn, with the same padding each time. It is worked out
// here and not in the page, so that a table changed later trims the same capture again, and
// no picture has to be taken for it.

import { decodePng, encodePng } from "../lib/png.mjs";
import { decodeSnapshot } from "./snapshot-svg.mjs";
import { trimSnapshot } from "./snapshot-trim.mjs";

/** Device pixels to the CSS pixel in a capture (chrome/take.mjs's SCALE). */
const SCALE = 2;

/** The room left round a picture's elements, in CSS px, as shoot_docs.mjs leaves round its marks. */
const PAD = 8;

const norm = (s) => s.replace(/\s+/g, " ").trim();

// A node's text, as an anchor's `text` means it.
const textOf = (n) => (n.type === 3 ? (n.value ?? "") : n.children.map(textOf).join(""));

// The test of one element against one compound selector: a tag, .class, #id, [attribute] and
// [attribute=value], ^= and *=, a value quoted or not.
function compound(text) {
  const tests = [];
  const parts = /([.#]?)([-\w]+)|\[([-\w]+)(?:([*^]?=)"?([^\]"]*)"?)?\]/gy;
  let at = 0;
  for (let m = parts.exec(text); m; m = parts.exec(text)) {
    at = parts.lastIndex;
    const [, sigil, name, attr, op, value] = m;
    if (sigil === ".") tests.push((n) => (n.attrs.class ?? "").split(/\s+/).includes(name));
    else if (sigil === "#") tests.push((n) => n.attrs.id === name);
    else if (name) tests.push((n) => n.name.toLowerCase() === name.toLowerCase());
    else if (!op) tests.push((n) => n.attrs[attr] !== undefined);
    else if (op === "=") tests.push((n) => n.attrs[attr] === value);
    else if (op === "^=") tests.push((n) => (n.attrs[attr] ?? "").startsWith(value));
    else tests.push((n) => (n.attrs[attr] ?? "").includes(value));
  }
  if (at !== text.length) throw new Error(`a selector this tool cannot read: ${text}`);
  return (n) => tests.every((t) => t(n));
}

/**
 * Whether the element `node` of a decoded snapshot matches `selector`, of the part of CSS the
 * table's anchors use: compounds (compound above), descendants of each other, in a comma list.
 */
export function matches(node, selector) {
  return selector.split(",").some((one) => {
    const steps = one.trim().split(/\s+/).map(compound);
    if (!steps.at(-1)(node)) return false;
    let at = node;
    for (let k = steps.length - 2; k >= 0; k--) {
      for (at = at.parent; at && !(at.type === 1 && steps[k](at)); at = at.parent);
      if (!at) return false;
    }
    return true;
  });
}

// The box an element is laid out in, document CSS px, or null when it shows none.
function boxOf(node) {
  const b = node.layouts[0]?.bounds;
  return b && b.w > 0 && b.h > 0 ? b : null;
}

/**
 * The element of the decoded document `doc` that the anchor {css, text?} names, as annotate.mjs
 * finds it in the page: the first with a box that matches `css`, and with `text`, the first
 * whose text equals it, else the first that starts with it. Null when there is none.
 */
export function findElement(doc, { css, text }) {
  const all = doc.nodes.filter((n) => n.type === 1 && boxOf(n) && matches(n, css));
  if (text === undefined) return all[0] ?? null;
  const want = norm(text);
  const said = (n) => norm(textOf(n));
  return all.find((n) => said(n) === want) ?? all.find((n) => said(n).startsWith(want)) ?? null;
}

/**
 * The area to trim the capture `bundle` to, as a bundle's view ({x, y, w, h}, whole document CSS
 * px): the box round each anchor of `trim.of` and round `marked`, the marks drawn ({x, y, width,
 * height}, or null), `trim.pad` CSS px larger on each side, inside what the capture holds.
 * Throws when an anchor finds nothing, or when the box runs past what the capture holds, naming
 * which: the picture's area was not in the window.
 */
export function trimArea(bundle, { of, pad = PAD }, marked = null) {
  const doc = decodeSnapshot(bundle.snapshot, bundle.styles);
  const boxes = of.map((anchor) => {
    const node = findElement(doc, anchor);
    if (!node) throw new Error(`the capture has no element ${JSON.stringify(anchor)}`);
    return boxOf(node);
  });
  if (marked) boxes.push({ x: marked.x, y: marked.y, w: marked.width, h: marked.height });
  const x0 = Math.min(...boxes.map((b) => b.x));
  const y0 = Math.min(...boxes.map((b) => b.y));
  const x1 = Math.max(...boxes.map((b) => b.x + b.w));
  const y1 = Math.max(...boxes.map((b) => b.y + b.h));
  const { view } = bundle;
  const past = [
    [view.x - x0, "left"],
    [view.y - y0, "top"],
    [x1 - (view.x + view.w), "right"],
    [y1 - (view.y + view.h), "bottom"],
  ].filter(([by]) => by > 0.5);
  if (past.length) {
    const [by, side] = past[0];
    throw new Error(`the picture's area runs ${Math.ceil(by)} px past the ${side} of the window: scroll to it`);
  }
  const left = Math.max(Math.ceil(view.x), Math.floor(x0 - pad));
  const top = Math.max(Math.ceil(view.y), Math.floor(y0 - pad));
  const right = Math.min(Math.floor(view.x + view.w), Math.ceil(x1 + pad));
  const bottom = Math.min(Math.floor(view.y + view.h), Math.ceil(y1 + pad));
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/**
 * The picture of a capture ({theme, png, bundle}, `png` in base64) trimmed to `area`: its PNG cut
 * down, and its bundle's view and snapshot, so that the SVG is what a capture of that area
 * draws. Its measurements are kept: they answer for more than the area needs.
 */
export function trimPicture(picture, area) {
  const { bundle } = picture;
  const image = decodePng(Buffer.from(picture.png, "base64"));
  const left = Math.round((area.x - bundle.view.x) * SCALE);
  const top = Math.round((area.y - bundle.view.y) * SCALE);
  const [width, height] = [area.w * SCALE, area.h * SCALE];
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const from = ((top + y) * image.width + left) * 4;
    rgba.set(image.rgba.subarray(from, from + width * 4), y * width * 4);
  }
  return {
    ...picture,
    png: encodePng({ width, height, rgba }).toString("base64"),
    bundle: { ...bundle, view: area, snapshot: trimSnapshot(bundle.snapshot, area, bundle.styles) },
  };
}
