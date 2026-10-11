// A CSS filter of colour functions, baked into the colours it paints.
//
// Every CSS filter function but blur() and drop-shadow() is an affine map of a
// pixel's colour, in sRGB, clamped: brightness, contrast, grayscale, hue-rotate,
// invert, saturate, sepia, and opacity, which scales alpha alone. An affine map
// commutes with the blending that antialiasing does at an edge, so a group whose
// fills, strokes, gradient stops and text are each mapped paints what the same
// group under the filter paints, to the rounding of a channel. The picture then
// needs no <filter> for them, and a PDF keeps the group as vector paths and
// text: Chromium's PDF backend cannot express an SVG filter and draws the whole
// group as a bitmap, text and all.
//
// What a bake cannot reach keeps a real filter: an embedded image (its pixels are
// not recoloured), and a group that blends (mix-blend-mode is not affine). An
// opacity() becomes the group's opacity, which a PDF keeps too.

import { num, px, rgba } from "./util.mjs";

const LUMA = [0.2126, 0.7152, 0.0722];

// The 3x3 colour matrices of the Filter Effects spec, by amount.
const MATRICES = {
  grayscale: (a) => {
    const g = 1 - Math.min(1, a);
    return [
      [LUMA[0] + 0.7874 * g, LUMA[1] - 0.7152 * g, LUMA[2] - 0.0722 * g],
      [LUMA[0] - 0.2126 * g, LUMA[1] + 0.2848 * g, LUMA[2] - 0.0722 * g],
      [LUMA[0] - 0.2126 * g, LUMA[1] - 0.7152 * g, LUMA[2] + 0.9278 * g],
    ];
  },
  sepia: (a) => {
    const s = 1 - Math.min(1, a);
    return [
      [0.393 + 0.607 * s, 0.769 - 0.769 * s, 0.189 - 0.189 * s],
      [0.349 - 0.349 * s, 0.686 + 0.314 * s, 0.168 - 0.168 * s],
      [0.272 - 0.272 * s, 0.534 - 0.534 * s, 0.131 + 0.869 * s],
    ];
  },
  saturate: (s) => [
    [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s],
    [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s],
    [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s],
  ],
  "hue-rotate": (deg) => {
    const c = Math.cos((deg * Math.PI) / 180);
    const s = Math.sin((deg * Math.PI) / 180);
    return [
      [0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928],
      [0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283],
      [0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072],
    ];
  },
};

const ANGLE = { deg: 1, rad: 180 / Math.PI, grad: 0.9, turn: 360 };

/**
 * The steps of a computed `filter` value, in the order they apply:
 * {fn, arg, slope, intercept} for a per-channel line, {fn, arg, matrix} for a
 * colour matrix, {fn, arg, alpha} for opacity(), {fn, arg} for a blur or a
 * drop-shadow; null when a function is not one of these (a url(), say).
 */
export function filterSteps(v) {
  const steps = [];
  for (const m of v.matchAll(/([a-z-]+)\(((?:[^()]|\([^()]*\))*)\)/g)) {
    const [, fn, arg] = m;
    const a = arg.endsWith("%") ? px(arg) / 100 : px(arg);
    if (fn === "invert") {
      const k = Math.min(1, a);
      steps.push({ fn, arg, slope: 1 - 2 * k, intercept: k });
    } else if (fn === "brightness") steps.push({ fn, arg, slope: a, intercept: 0 });
    else if (fn === "contrast") steps.push({ fn, arg, slope: a, intercept: 0.5 - 0.5 * a });
    else if (fn === "opacity") steps.push({ fn, arg, alpha: Math.min(1, a) });
    else if (fn === "hue-rotate") {
      const unit = /[a-z]+$/.exec(arg.trim())?.[0] ?? "deg";
      steps.push({ fn, arg, matrix: MATRICES[fn](px(arg) * (ANGLE[unit] ?? 1)) });
    } else if (MATRICES[fn]) steps.push({ fn, arg, matrix: MATRICES[fn](a) });
    else if (fn === "blur" || fn === "drop-shadow") steps.push({ fn, arg });
    else return null;
  }
  return steps;
}

/** Whether every step maps a colour alone, so that the filter can be baked. */
export const bakeable = (steps) => steps.every((s) => s.fn !== "blur" && s.fn !== "drop-shadow");

/** The opacity the steps' opacity() functions give the group, together. */
export const stepsOpacity = (steps) => steps.reduce((o, s) => (s.alpha === undefined ? o : o * s.alpha), 1);

/** The colour steps alone, without opacity(). */
export const colourSteps = (steps) => steps.filter((s) => s.alpha === undefined);

const clamp = (v) => Math.min(1, Math.max(0, v));

/** {r, g, b} (0--255) through the colour steps, each clamped as a filter primitive's result is. */
export function mapColour(steps, { r, g, b }) {
  let c = [r / 255, g / 255, b / 255];
  for (const s of steps) {
    if (s.matrix) c = s.matrix.map((row) => clamp(row[0] * c[0] + row[1] * c[1] + row[2] * c[2]));
    else if (s.slope !== undefined) c = c.map((v) => clamp(s.slope * v + s.intercept));
  }
  return { r: Math.round(c[0] * 255), g: Math.round(c[1] * 255), b: Math.round(c[2] * 255) };
}

const NAMED = { white: [255, 255, 255], black: [0, 0, 0] };

/** A colour as the converter writes one (rgb(), rgba(), #rgb, #rrggbb, white, black), or null. */
export function parseColour(v) {
  const c = rgba(v);
  if (c) return c;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v)?.[1];
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((h) => h + h).join("") : hex;
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4), 16),
      a: 1,
    };
  }
  const n = NAMED[v];
  return n ? { r: n[0], g: n[1], b: n[2], a: 1 } : null;
}

/** A colour value through the steps, written as a computed colour is; null when it is not a colour. */
export function bakeColour(steps, v) {
  const c = parseColour(v);
  if (!c) return null;
  const { r, g, b } = mapColour(steps, c);
  return c.a === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${num(c.a)})`;
}

/** The SVG primitive of one colour or opacity step, from `input` to `out`. */
export function stepPrimitive(s, input, out) {
  if (s.alpha !== undefined)
    return `<feComponentTransfer in="${input}" result="${out}"><feFuncA type="table" tableValues="0 ${num(s.alpha)}"/></feComponentTransfer>`;
  if (s.matrix) {
    const values = s.matrix.map((row) => `${row.map(num).join(" ")} 0 0`).join(" ");
    return `<feColorMatrix in="${input}" result="${out}" type="matrix" values="${values} 0 0 0 1 0"/>`;
  }
  const fn =
    s.fn === "invert"
      ? `type="table" tableValues="${num(s.intercept)} ${num(s.intercept + s.slope)}"`
      : `type="linear" slope="${num(s.slope)}"${s.intercept ? ` intercept="${num(s.intercept)}"` : ""}`;
  return `<feComponentTransfer in="${input}" result="${out}"><feFuncR ${fn}/><feFuncG ${fn}/><feFuncB ${fn}/></feComponentTransfer>`;
}

/**
 * One string of a group's markup with the colour steps baked in.
 *
 * @param s      the markup
 * @param bake   {key, steps}: the colour steps (no opacity), keyed by what they are
 * @param ctx    the converter's: {defOf(id) => a def's markup, def(key, make) => id,
 *               cssOf(cls) / classFor(css) => a text class's rule and back,
 *               filterFor(steps) => the id of a real <filter> of the steps,
 *               wrappers: Set of the defs that wrap a picture in one, note(what)}
 */
export function bakeMarkup(s, bake, ctx) {
  const out = s
    // What the group references: a paint server, a pattern, a tile, a picture.
    .replace(/(url\(#|href="#)(d\d+)/g, (_, pre, id) => pre + bakeDef(id, bake, ctx))
    .replace(/\b(fill|stroke|stop-color|flood-color)="([^"]*)"/g, (m, attr, v) => {
      if (v === "none" || v === "transparent" || v.startsWith("url(")) return m;
      const c = bakeColour(bake.steps, v);
      if (c === null) ctx.note(`colour ${v} under a filter`);
      return c === null ? m : `${attr}="${c}"`;
    })
    .replace(/\bclass="(t\d+)"/g, (m, cls) => {
      const css = ctx.cssOf(cls);
      const fill = /;fill:([^;]*)$/.exec(css ?? "");
      const c = fill && bakeColour(bake.steps, fill[1]);
      return c ? `class="${ctx.classFor(css.slice(0, fill.index) + `;fill:${c}`)}"` : m;
    });
  return out;
}

// A def baked: the same id when nothing in it changes (a clip path), a picture
// (or a def that already wraps one) wrapped in a real filter, else a copy with
// its colours baked.
function bakeDef(id, bake, ctx) {
  const body = ctx.defOf(id);
  if (!body) return id;
  if (body.startsWith("<image") || ctx.wrappers.has(id)) {
    const nid = ctx.def(
      `${bake.key}|${id}`,
      (nid) => `<g id="${nid}" filter="url(#${ctx.filterFor(bake.steps)})"><use href="#${id}"/></g>`,
    );
    ctx.wrappers.add(nid);
    return nid;
  }
  const baked = bakeMarkup(body, bake, ctx);
  if (baked === body) return id;
  return ctx.def(`${bake.key}|${id}`, (nid) => baked.replace(`id="${id}"`, `id="${nid}"`));
}
