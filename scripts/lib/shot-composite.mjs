// Composite pictures for shoot_docs.mjs: a picture made of parts of the IDE that are never on
// the screen together (the code that declares a property, and the PROPERTIES panel that lists
// it), with an annotation drawn across them. The plan and the owner's decisions are in
// WIP.Screenshots.md (Annotations; Designers, code and composites).
//
//     const parts = [
//       { png, clip, anchors: { field: rect }, column: 0 },   // each captured as its own clip
//       { png, clip, anchors: { row: rect }, column: 1 },
//     ];
//     const { box } = await composite(conn, parts, [{ type: "arrow", from: { ref: "field" }, to: { ref: "row" } }], {
//       align: { from: "field", to: "row", dy: -40 },
//     });
//     ... capture `box` ...
//     await uncomposite(conn);
//
// Each part is a capture of the page at 2x (`png`) of the rectangle `clip` (CSS pixels), with
// the boxes of the anchors it holds, resolved while it was showing (resolveAnchors in
// lib/shot-annotate.mjs). The parts are laid out in a layer over the whole page, in the same
// page, as <img> elements drawn one to one, on the IDE's background in its theme: by columns, left to
// right, each column's parts one under another, `gap` apart, `margin` round them all. `align`
// moves the columns up or down so that the centre of the anchor `from` is `dy` from that of
// `to` (the code is placed against the row the arrow ends at, so that the arrow is short). A
// primitive's anchor `{ ref: name }` is the named part anchor moved with its part, and can be
// used wherever an anchor can (`{ of: { ref }, at }` too). The layer is then captured like any
// other part of the page; the annotation layer is over it.

import { annotate, unannotate } from "./shot-annotate.mjs";

export const COMPOSITE_ID = "tbShotComposite";

// The device pixels to a CSS pixel of the parts' captures.
const SCALE = 2;

// The IDE's background, as its page has it in the theme it is in (body, rgb(43, 43, 43) in the
// dark theme), so that a light picture's parts are on the Light theme's.
const GROUND = "getComputedStyle(document.body).backgroundColor";

// Where each part goes, and the layer's size: whole CSS pixels.
function layOut(parts, { gap, margin, align }) {
  const columns = [];
  for (const p of parts) (columns[p.column ?? 0] ??= []).push(p);
  let x = margin;
  const placed = new Map();
  for (const col of columns) {
    if (!col) continue;
    let y = 0;
    for (const p of col) {
      placed.set(p, { x, y });
      y += Math.ceil(p.clip.height) + gap;
    }
    x += Math.ceil(Math.max(...col.map((p) => p.clip.width))) + gap;
  }
  // the column holding `from` moves so that it is `dy` from `to`
  if (align) {
    const holder = (name) => parts.find((p) => p.anchors?.[name]);
    const pf = holder(align.from);
    const pt = holder(align.to);
    if (!pf || !pt) throw new Error(`no part holds the anchor ${pf ? align.to : align.from}`);
    const centre = (p, name) => placed.get(p).y + p.anchors[name].y - p.clip.y + p.anchors[name].height / 2;
    const shift = Math.round(centre(pt, align.to) + (align.dy ?? 0) - centre(pf, align.from));
    for (const p of columns[pf.column ?? 0]) placed.get(p).y += shift;
  }
  const top = Math.min(...[...placed.values()].map((q) => q.y));
  for (const q of placed.values()) q.y += margin - top;
  const width = x - gap + margin;
  const height = Math.max(...parts.map((p) => placed.get(p).y + Math.ceil(p.clip.height))) + margin;
  return { placed, width, height };
}

// Replaces each `{ ref }` anchor in the primitives with the moved box it names.
function mapRefs(value, refs) {
  if (Array.isArray(value)) return value.map((v) => mapRefs(v, refs));
  if (value && typeof value === "object") {
    if (typeof value.ref === "string") {
      if (!refs[value.ref]) throw new Error(`no part holds the anchor ${value.ref}`);
      return { rect: refs[value.ref] };
    }
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapRefs(v, refs)]));
  }
  return value;
}

// Lays the parts out in a layer over the page and draws `primitives` over it. Returns the
// layer's box, the annotations' box joined to it.
export async function composite(conn, parts, primitives = [], { gap = 40, margin = 16, align = null } = {}) {
  const { placed, width, height } = layOut(parts, { gap, margin, align });
  const refs = {};
  for (const p of parts) {
    const at = placed.get(p);
    for (const [name, r] of Object.entries(p.anchors ?? {})) {
      refs[name] = { x: at.x + r.x - p.clip.x, y: at.y + r.y - p.clip.y, width: r.width, height: r.height };
    }
  }
  // each at its own pixel size, halved: a capture of a clip a half pixel wide can come out a
  // device pixel narrower than the clip, and drawn at the clip's size it would be resampled
  const images = parts.map((p) => ({
    src: `data:image/png;base64,${p.png.toString("base64")}`,
    ...placed.get(p),
    width: p.png.readUInt32BE(16) / SCALE,
    height: p.png.readUInt32BE(20) / SCALE,
  }));
  await conn.evaluate(
    `(async () => {
  document.getElementById(${JSON.stringify(COMPOSITE_ID)})?.remove();
  const layer = document.createElement("div");
  layer.id = ${JSON.stringify(COMPOSITE_ID)};
  layer.style.cssText = "position:fixed;left:0;top:0;width:${width}px;height:${height}px;z-index:2147483646;pointer-events:none;background:" + ${GROUND};
  for (const i of ${JSON.stringify(images)}) {
    const img = document.createElement("img");
    img.src = i.src;
    // pixelated: each part is drawn one to one, and a sampling a fraction of a pixel off (which
    // varies from frame to frame) still takes each pixel from its own source pixel
    img.style.cssText = "position:absolute;image-rendering:pixelated;left:" + i.x + "px;top:" + i.y + "px;width:" + i.width + "px;height:" + i.height + "px";
    layer.appendChild(img);
  }
  document.body.appendChild(layer);
  await Promise.all([...layer.querySelectorAll("img")].map((i) => i.decode()));
})()`,
    { awaitPromise: true },
  );
  let box = { x: 0, y: 0, width, height };
  if (primitives.length) {
    const { box: drawn } = await annotate(conn, mapRefs(primitives, refs));
    if (drawn) {
      const x0 = Math.min(box.x, drawn.x);
      const y0 = Math.min(box.y, drawn.y);
      const x1 = Math.max(box.x + box.width, drawn.x + drawn.width);
      const y1 = Math.max(box.y + box.height, drawn.y + drawn.height);
      box = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
    }
  }
  return { box };
}

// Removes the layer and the annotations over it, whether or not they are there.
export async function uncomposite(conn) {
  await unannotate(conn);
  await conn.evaluate(`document.getElementById(${JSON.stringify(COMPOSITE_ID)})?.remove()`);
}
