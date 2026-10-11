// CSS gradients as SVG gradients (CSS Images 3), from the computed value of a
// `background-image` layer.
//
// A gradient is an image with no size of its own: the caller gives the size of
// the box it fills (the background-size result) and gets a gradient defined
// over (0, 0)-(w, h), to be drawn by a shape in that coordinate system and
// moved to each tile with a transform.
//
// What differs between the two languages, and how it is bridged:
// - CSS puts the line of a linear gradient through the centre of the box at
//   the angle given, long enough that the corners take the end colours; its
//   stops are percentages of that length. SVG is told the line's two points.
//   Both go through the first and the last stop, whose spans the SVG gradient
//   covers with `pad` or, for a repeating gradient, `repeat`.
// - CSS interpolates in premultiplied alpha, SVG does not, so a pair of stops
//   that differ in alpha as well as in colour is cut into steps that are
//   interpolated here, and a fully transparent stop takes its neighbour's
//   colour (`transparent` is not black).
// - A radial gradient's ending shape is an ellipse in SVG as a circle
//   scaled by gradientTransform; its first stop is the focal radius (`fr`).
// Not drawn: conic gradients, -webkit-radial-gradient (the 2011 syntax),
// colour hints and colours that are not rgb()/rgba().

import { num, px, rgba, splitTop } from "./util.mjs";

const ANGLE_UNITS = { deg: 1, grad: 0.9, rad: 180 / Math.PI, turn: 360 };
const SIDE = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] };
const NUMBER = "-?(?:\\d+\\.?\\d*|\\.\\d+)(?:e-?\\d+)?";
const MIX_STEPS = 8;

function angleDeg(s) {
  const m = new RegExp(`^(${NUMBER})(deg|grad|rad|turn)$`).exec(s);
  return m ? Number(m[1]) * ANGLE_UNITS[m[2]] : null;
}

function stopPosition(s) {
  const m = new RegExp(`^(${NUMBER})(px|%)?$`).exec(s);
  return m ? { v: Number(m[1]), pct: m[2] === "%" } : null;
}

/**
 * The parts of a gradient's computed value: {css, kind, repeating, legacy,
 * config, stops: [{color, pos}]}, `config` being the direction or the shape
 * as written, or null for anything not drawn.
 */
export function parseGradient(css) {
  const m = /^(-webkit-)?(repeating-)?(linear|radial)-gradient\((.*)\)$/s.exec(css.trim());
  if (!m) return null;
  const [, legacy, repeating, kind, inner] = m;
  if (legacy && kind === "radial") return null;
  const args = splitTop(inner);
  const config = args.length && !/^rgba?\(/.test(args[0]) ? args.shift() : "";
  const stops = [];
  for (const a of args) {
    const sm = /^(rgba?\([^)]*\))((?:\s+\S+){0,2})$/.exec(a);
    if (!sm) {
      if (new RegExp(`^${NUMBER}`).test(a)) continue; // a colour hint: the midpoint stays at the middle
      return null;
    }
    const color = rgba(sm[1]);
    const rest = sm[2].trim();
    // Two positions are two stops of one colour; stopPosition says null for a
    // position it cannot read (a calc()).
    const ats = rest ? rest.split(/\s+/).map(stopPosition) : [null];
    if (!color || (rest && ats.includes(null))) return null;
    for (const pos of ats) stops.push({ color, pos });
  }
  if (stops.length < 2) return null;
  return { css, kind, repeating: Boolean(repeating), legacy: Boolean(legacy), config, stops };
}

/** Where the stops sit, in px along the gradient line or ray of length `len` (CSS Images 3, 3.4.3). */
function resolveStops(stops, len) {
  const list = stops.map(({ color, pos }) => ({
    color,
    at: pos ? (pos.pct ? (pos.v / 100) * len : pos.v) : null,
  }));
  list[0].at ??= 0;
  list.at(-1).at ??= len;
  let top = Number.NEGATIVE_INFINITY;
  for (const s of list)
    if (s.at !== null) {
      s.at = Math.max(s.at, top);
      top = s.at;
    }
  for (let i = 1; i < list.length; ) {
    if (list[i].at !== null) {
      i++;
      continue;
    }
    let j = i;
    while (list[j].at === null) j++;
    const a = list[i - 1].at;
    const b = list[j].at;
    for (let k = i; k < j; k++) list[k].at = a + ((b - a) * (k - i + 1)) / (j - i + 1);
    i = j + 1;
  }
  return list;
}

function mixPremultiplied(c0, c1, t) {
  const a = c0.a + (c1.a - c0.a) * t;
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const ch = (k) => (c0[k] * c0.a * (1 - t) + c1[k] * c1.a * t) / a;
  return { r: ch("r"), g: ch("g"), b: ch("b"), a };
}

/** The <stop> elements for stops at px `at`, spanning `from` to `to`. */
function stopMarkup(list, from, to) {
  const span = Math.max(to - from, 1e-3);
  const entries = [];
  for (let i = 0; i + 1 < list.length; i++) {
    let c0 = list[i].color;
    let c1 = list[i + 1].color;
    const a0 = list[i].at;
    const a1 = list[i + 1].at;
    const mids = [];
    if (c0.a !== c1.a) {
      if (c0.a === 0) c0 = { ...c1, a: 0 };
      else if (c1.a === 0) c1 = { ...c0, a: 0 };
      else if (c0.r !== c1.r || c0.g !== c1.g || c0.b !== c1.b)
        for (let k = 1; k < MIX_STEPS; k++)
          mids.push([a0 + ((a1 - a0) * k) / MIX_STEPS, mixPremultiplied(c0, c1, k / MIX_STEPS)]);
    }
    entries.push([a0, c0], ...mids, [a1, c1]);
  }
  const out = [];
  let prev = "";
  for (const [at, c] of entries) {
    const off = Math.min(1, Math.max(0, (at - from) / span));
    const s =
      `<stop offset="${num(off)}" stop-color="rgb(${[c.r, c.g, c.b].map(Math.round).join(",")})"` +
      `${c.a === 1 ? "" : ` stop-opacity="${num(c.a)}"`}/>`;
    if (s !== prev) out.push(s);
    prev = s;
  }
  return out.join("");
}

function linearLine(g, w, h) {
  let dx;
  let dy;
  if (/^[-\d.]/.test(g.config)) {
    let deg = angleDeg(g.config);
    if (deg === null) return null;
    // The 2011 syntax counts the angle anticlockwise from the x axis.
    if (g.legacy) deg = 90 - deg;
    dx = Math.sin((deg * Math.PI) / 180);
    dy = -Math.cos((deg * Math.PI) / 180);
  } else {
    const words = g.config
      .replace(/^to\s+/, "")
      .split(/\s+/)
      .filter(Boolean);
    let sx = 0;
    let sy = 0;
    for (const word of words) {
      if (!SIDE[word]) return null;
      sx += SIDE[word][0];
      sy += SIDE[word][1];
    }
    // In the 2011 syntax a keyword names the side the line starts at.
    if (g.legacy) {
      sx = -sx;
      sy = -sy;
    }
    if (!words.length) sy = 1;
    if (sx && sy && g.legacy) {
      dx = sx * Math.SQRT1_2;
      dy = sy * Math.SQRT1_2;
    } else if (sx && sy) {
      // A corner: the 50% line runs through the two other corners.
      const n = Math.hypot(w, h);
      dx = (sx * h) / n;
      dy = (sy * w) / n;
    } else {
      dx = sx;
      dy = sy;
    }
  }
  return { dx, dy, len: Math.abs(w * dx) + Math.abs(h * dy) };
}

/** The centre of a radial gradient, from its `at <position>` tokens. */
function centre(tokens, w, h) {
  if (!tokens.length) return [w / 2, h / 2];
  const FRACTION = { left: 0, top: 0, center: 0.5, right: 1, bottom: 1 };
  const dist = (t, size) => (t.endsWith("%") ? (px(t) / 100) * size : px(t));
  const isY = (t) => t === "top" || t === "bottom";
  if (tokens.length <= 2) {
    let [a, b = "center"] = tokens;
    if (tokens.length === 1 && isY(a)) [a, b] = ["center", a];
    if (isY(a) || b === "left" || b === "right") [a, b] = [b, a];
    return [a in FRACTION ? FRACTION[a] * w : dist(a, w), b in FRACTION ? FRACTION[b] * h : dist(b, h)];
  }
  // Four values: each side keyword is followed by an offset from that side.
  let x = w / 2;
  let y = h / 2;
  for (let i = 0; i < tokens.length; i += 2) {
    const side = tokens[i];
    const horizontal = side === "left" || side === "right";
    const size = horizontal ? w : h;
    const off = dist(tokens[i + 1] ?? "0px", size);
    const v = side === "right" || side === "bottom" ? size - off : off;
    if (horizontal) x = v;
    else y = v;
  }
  return [x, y];
}

function radialShape(g, w, h) {
  const at = g.config.search(/(^|\s)at\s/);
  const shapeText = (at < 0 ? g.config : g.config.slice(0, at)).trim();
  const posText = at < 0 ? "" : g.config.slice(at).replace(/^\s*at\s+/, "");
  const toks = shapeText.split(/\s+/).filter(Boolean);
  const lens = toks.filter((t) => /^-?[\d.]/.test(t));
  const keyword =
    toks.find((t) => /^(closest|farthest)-(side|corner)$/.test(t)) ?? (lens.length ? null : "farthest-corner");
  const circle = toks.includes("circle") || (!toks.includes("ellipse") && lens.length === 1);
  const [cx, cy] = centre(posText.split(/\s+/).filter(Boolean), w, h);
  const dl = Math.abs(cx);
  const dr = Math.abs(w - cx);
  const dt = Math.abs(cy);
  const db = Math.abs(h - cy);
  let rx;
  let ry;
  if (!keyword) {
    const len = (t, size) => (t.endsWith("%") ? (px(t) / 100) * size : px(t));
    rx = len(lens[0], w);
    ry = circle ? rx : len(lens[1] ?? lens[0], h);
  } else {
    const near = keyword.startsWith("closest");
    const pick = near ? Math.min : Math.max;
    const [sx, sy] = [pick(dl, dr), pick(dt, db)];
    if (keyword.endsWith("side")) {
      rx = circle ? pick(sx, sy) : sx;
      ry = circle ? rx : sy;
    } else {
      rx = circle ? Math.hypot(sx, sy) : sx * Math.SQRT2;
      ry = circle ? rx : sy * Math.SQRT2;
    }
  }
  return rx > 0 && ry > 0 ? { cx, cy, rx, ry } : null;
}

/**
 * The SVG gradient for `g` (parseGradient's result) filling a w by h image:
 * {key, make(id)}, `make` giving the element for the id the caller picks, or
 * null when the gradient is not drawn.
 */
export function gradientSvg(g, w, h) {
  if (!(w > 0 && h > 0)) return null;
  const key = `g${g.css}|${num(w)}|${num(h)}`;
  if (g.kind === "linear") {
    const line = linearLine(g, w, h);
    if (!line || !(line.len > 0)) return null;
    const list = resolveStops(g.stops, line.len);
    const from = list[0].at;
    const to = list.at(-1).at;
    if (g.repeating && !(to > from)) return null;
    const point = (t) => [num(w / 2 + line.dx * (t - line.len / 2)), num(h / 2 + line.dy * (t - line.len / 2))];
    const [x1, y1] = point(from);
    const [x2, y2] = point(to > from ? to : from + 1e-3);
    return {
      key,
      make: (id) =>
        `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"` +
        `${g.repeating ? ' spreadMethod="repeat"' : ""}>${stopMarkup(list, from, to)}</linearGradient>`,
    };
  }
  const shape = radialShape(g, w, h);
  if (!shape) return null;
  const list = resolveStops(g.stops, shape.rx);
  const from = Math.max(0, list[0].at);
  const to = list.at(-1).at;
  if (!(to > from) && g.repeating) return null;
  const squash =
    shape.ry === shape.rx
      ? ""
      : ` gradientTransform="matrix(1 0 0 ${num(shape.ry / shape.rx)} ${num(shape.cx)} ${num(shape.cy)})"`;
  const place =
    shape.ry === shape.rx
      ? `cx="${num(shape.cx)}" cy="${num(shape.cy)}" fx="${num(shape.cx)}" fy="${num(shape.cy)}"`
      : 'cx="0" cy="0" fx="0" fy="0"';
  return {
    key,
    make: (id) =>
      `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" ${place} r="${num(to > from ? to : from + 1e-3)}"` +
      `${from > 0 ? ` fr="${num(from)}"` : ""}${squash}${g.repeating ? ' spreadMethod="repeat"' : ""}>` +
      `${stopMarkup(list, from, to)}</radialGradient>`,
  };
}
