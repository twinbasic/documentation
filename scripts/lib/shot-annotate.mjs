// The annotation overlay of shoot_docs.mjs: arrows, boxes, rings, underlines, labels
// and numbered badges drawn over the IDE's page, in one house style, anchored to
// what they point at, so that a retake after a new BETA redraws them where the
// things now are. The plan and the owner's decisions are in WIP.Screenshots.md.
//
//     const { box } = await annotate(conn, [
//       { type: "ring", on: { css: ".buttonGroupItem", text: "Samples" } },
//       { type: "badge", n: 1, on: { css: ".buttonGroupItem", text: "Samples" }, side: "left" },
//       { type: "arrow", from: { of: A, at: "bottom", dy: 60 }, to: A, bend: 20 },
//     ]);
//     ... capture a clip grown to include `box` ...
//     await unannotate(conn);
//
// One SVG layer is added to the document: `position: fixed`, over everything,
// `pointer-events: none`, drawn in CSS pixels, so it scales with a 2x capture. Its id
// is LAYER_ID, which a cut-out's `keep` list can name.
//
// An anchor is one of
//   { css, text?, own? }  the first visible element matching `css`, in the document or in any
//                         open shadow root in it (in document order), whose text, with its
//                         white space collapsed, equals `text`, else starts with it
//                         (an exact match beats a prefix match; ties go to the first in
//                         document order, so the outermost). `own` takes the box of the
//                         element's own text nodes, leaving out the boxes of its children
//                         (a list row's title, without its icon)
//   { code, nth? }        a text search in the editor's model, the `nth` match (1 by
//                         default), placed with the editor's scrolled position, never a
//                         line number. The first use is in increment 4: untested
//   { span: [anchor, ...] } the box that holds the boxes of all the anchors (a row's label
//                         and its input, boxed as one)
//   { of, at, dx?, dy? }  a point of another anchor's box: `at` is center, top, bottom,
//                         left, right, top-left, top-right, bottom-left or bottom-right,
//                         moved by dx, dy
//
// A primitive is `{ type, ... }`, with `on` the anchor it marks:
//   arrow      from, to (an anchor, or a list of them: a fork, one arrow to each), bend?
//              An end that is a box (not a point) is the box's edge on the line to the
//              other end; the head stops 6 px short of it. `bend` curves the line by that
//              many pixels, a positive one to the right of the direction of travel;
//              `elbow: true` curves it to leave the start level and meet the tip vertically.
//              `tipGap` and `fromGap` replace the 6 and 4 px of clearance at the two ends,
//              for a target that has a box drawn round it (4 px of padding and a halo).
//   box        on, pad? (4)
//   ring       on, pad? (4): a box whose corners are round to half its height
//   underline  on, gap? (3): a line under the anchor's box
//   label      text, on, side? (right; left, above, below), gap? (8), dx?, dy?, tone?
//              (light, a white pill with red text; dark, a dark red pill with white text,
//              for a dark UI)
//   badge      n, on, side? (left), gap? (8), dx?, dy?: a numbered red circle
// All take `halo: false` to leave out the white outline. An anchor that is not found
// rejects the call, naming it, and leaves no layer behind.

export const LAYER_ID = "tbShotAnnotation";

// The house style, in CSS pixels at 1x.
const STYLE = {
  red: "#E5252A",
  darkRed: "#8E161A",
  stroke: 3,
  haloStroke: 5, // white, drawn under the red: 1 px beyond it each side
  head: 15, // 5x the stroke
  headHalfWidth: 7.5,
  pad: 4,
  tipGap: 6,
  fromGap: 4,
  labelSize: 15,
  labelWeight: 600,
  labelPadX: 11,
  labelHeight: 27,
  badge: 22,
};

// Runs in the IDE's page: resolves the anchors, draws the layer and returns its
// bounding box. Self-contained (it is sent as source), so no name from outside it.
function draw(prims, S) {
  const NS = "http://www.w3.org/2000/svg";
  document.getElementById("tbShotAnnotation")?.remove();
  const svg = document.createElementNS(NS, "svg");
  svg.id = "tbShotAnnotation";
  svg.setAttribute("xmlns", NS);
  svg.style.cssText =
    "position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:2147483647;pointer-events:none;overflow:visible";
  document.body.appendChild(svg);
  const font = getComputedStyle(document.body).fontFamily;

  let bounds = null;
  const note = (x, y, w, h, m = 0) => {
    const b = { x0: x - m, y0: y - m, x1: x + w + m, y1: y + h + m };
    bounds = bounds
      ? {
          x0: Math.min(bounds.x0, b.x0),
          y0: Math.min(bounds.y0, b.y0),
          x1: Math.max(bounds.x1, b.x1),
          y1: Math.max(bounds.y1, b.y1),
        }
      : b;
  };
  const el = (name, attrs, parent = svg) => {
    const e = document.createElementNS(NS, name);
    for (const k of Object.keys(attrs)) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  };
  const fail = (what, a) => {
    throw new Error(`annotation ${what}: ${JSON.stringify(a)}`);
  };

  // ---- anchors
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  const boxOf = (r) => ({ x: r.x, y: r.y, width: r.width, height: r.height });
  const shown = (e) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const ownTextBox = (e) => {
    let box = null;
    for (const n of e.childNodes) {
      if (n.nodeType !== 3 || !n.textContent.trim()) continue;
      const rg = document.createRange();
      rg.selectNodeContents(n);
      const r = rg.getBoundingClientRect();
      box = box
        ? {
            x: Math.min(box.x, r.x),
            y: Math.min(box.y, r.y),
            width: Math.max(box.x + box.width, r.right) - Math.min(box.x, r.x),
            height: Math.max(box.y + box.height, r.bottom) - Math.min(box.y, r.y),
          }
        : boxOf(r);
    }
    return box;
  };
  const codeBox = (a) => {
    // the IDE's page keeps its Monaco editor in the global `editor`
    const ed = window.editor;
    const hits = ed.getModel().findMatches(a.code, false, false, true, null, false);
    const m = hits[(a.nth ?? 1) - 1];
    if (!m) fail("finds no such code", a);
    const s = ed.getScrolledVisiblePosition(m.range.getStartPosition());
    const e = ed.getScrolledVisiblePosition(m.range.getEndPosition());
    if (!s) fail("has its code out of view", a);
    const d = ed.getDomNode().getBoundingClientRect();
    return {
      x: d.x + s.left,
      y: d.y + s.top,
      width: e && e.top === s.top ? Math.max(0, e.left - s.left) : 0,
      height: s.height,
    };
  };
  // The elements matching `css` in the document and in every open shadow root in it
  // (a tool window is one), in document order: a host's own match, then what is in its
  // shadow root, then its other descendants.
  const queryAll = (css) => {
    const out = [];
    const walk = (root) => {
      for (const e of root.querySelectorAll("*")) {
        if (e.matches(css)) out.push(e);
        if (e.shadowRoot) walk(e.shadowRoot);
      }
    };
    walk(document);
    return out;
  };
  const AT = {
    center: [0.5, 0.5],
    top: [0.5, 0],
    bottom: [0.5, 1],
    left: [0, 0.5],
    right: [1, 0.5],
    "top-left": [0, 0],
    "top-right": [1, 0],
    "bottom-left": [0, 1],
    "bottom-right": [1, 1],
  };
  // An anchor's box; a point is a box of no size, marked `point`.
  const box = (a) => {
    if (!a) fail("has no anchor", a);
    if (a.of) {
      const r = box(a.of);
      const f = AT[a.at ?? "center"];
      if (!f) fail("has an unknown `at`", a);
      return {
        x: r.x + r.width * f[0] + (a.dx ?? 0),
        y: r.y + r.height * f[1] + (a.dy ?? 0),
        width: 0,
        height: 0,
        point: true,
      };
    }
    if (a.span) {
      const rs = a.span.map(box);
      const x0 = Math.min(...rs.map((r) => r.x));
      const y0 = Math.min(...rs.map((r) => r.y));
      return {
        x: x0,
        y: y0,
        width: Math.max(...rs.map((r) => r.x + r.width)) - x0,
        height: Math.max(...rs.map((r) => r.y + r.height)) - y0,
      };
    }
    if (a.code !== undefined) return codeBox(a);
    if (a.css) {
      const all = queryAll(a.css).filter(shown);
      let e = all[0];
      if (a.text !== undefined) {
        const want = norm(a.text);
        const text = (x) => norm(x.innerText ?? x.textContent);
        e = all.find((x) => text(x) === want) ?? all.find((x) => text(x).startsWith(want));
      }
      if (!e) fail("finds no element", a);
      const r = a.own ? ownTextBox(e) : boxOf(e.getBoundingClientRect());
      if (!r) fail("finds no text of its own", a);
      return r;
    }
    return fail("has an anchor that is not one", a);
  };
  const centre = (r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  // Where the line from a box's centre to `toward` leaves the box grown by `gap`.
  const edge = (r, toward, gap) => {
    if (r.point) return { x: r.x, y: r.y };
    const c = centre(r);
    const dx = toward.x - c.x;
    const dy = toward.y - c.y;
    const hw = r.width / 2 + gap;
    const hh = r.height / 2 + gap;
    const k = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
    return k >= 1 ? { x: toward.x, y: toward.y } : { x: c.x + dx * k, y: c.y + dy * k };
  };

  // ---- strokes: a white one under, the red one over, so that a mark reads on light and dark
  const shape = (name, attrs, p) => {
    const g = el("g", {});
    const common = { fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" };
    if (p.halo !== false) el(name, { ...attrs, ...common, stroke: "#fff", "stroke-width": S.haloStroke }, g);
    el(name, { ...attrs, ...common, stroke: S.red, "stroke-width": S.stroke }, g);
  };
  const place = (r, w, h, side, gap, dx, dy) => {
    const c = centre(r);
    let x = c.x - w / 2;
    let y = c.y - h / 2;
    if (side === "left") x = r.x - gap - w;
    else if (side === "right") x = r.x + r.width + gap;
    else if (side === "above") y = r.y - gap - h;
    else if (side === "below") y = r.y + r.height + gap;
    else fail("has an unknown `side`", { side });
    return { x: x + (dx ?? 0), y: y + (dy ?? 0) };
  };
  const text = (parent, s, x, y, fill, size, weight) => {
    const t = el(
      "text",
      {
        x,
        y,
        fill,
        "font-family": font,
        "font-size": size,
        "font-weight": weight,
        "text-anchor": "middle",
        "dominant-baseline": "central",
      },
      parent,
    );
    t.textContent = s;
    return t;
  };

  // ---- primitives
  const arrow = (p) => {
    const tos = Array.isArray(p.to) ? p.to : [p.to];
    for (const toAnchor of tos) {
      const a = box(p.from);
      const b = box(toAnchor);
      const from = edge(a, centre(b), p.fromGap ?? S.fromGap);
      const tip = edge(b, centre(a), p.tipGap ?? S.tipGap);
      const dx = tip.x - from.x;
      const dy = tip.y - from.y;
      const len = Math.hypot(dx, dy);
      if (len < S.head + 4) fail("has an arrow too short for its head", { from: p.from, to: toAnchor });
      // `elbow` leaves the start level and arrives at the tip upright or downright: its
      // control point is level with the start and plumb with the tip
      const bend = p.elbow ? 1 : (p.bend ?? 0);
      const ctl = p.elbow
        ? { x: tip.x, y: from.y }
        : { x: (from.x + tip.x) / 2 - (dy / len) * bend, y: (from.y + tip.y) / 2 + (dx / len) * bend };
      // The head points along the curve's end (from the control point to the tip); the
      // line stops at the head's base, which is on that same line, so the curve meets
      // the head along its axis.
      const end = bend ? ctl : from;
      const l = Math.hypot(tip.x - end.x, tip.y - end.y);
      const d = { x: (tip.x - end.x) / l, y: (tip.y - end.y) / l };
      const base = { x: tip.x - d.x * S.head, y: tip.y - d.y * S.head };
      const line = bend
        ? `M${from.x} ${from.y} Q${ctl.x} ${ctl.y} ${base.x} ${base.y}`
        : `M${from.x} ${from.y} L${base.x} ${base.y}`;
      const hw = S.headHalfWidth;
      const head = `M${tip.x} ${tip.y} L${base.x - d.y * hw} ${base.y + d.x * hw} L${base.x + d.y * hw} ${base.y - d.x * hw} Z`;
      const g = el("g", {});
      if (p.halo !== false) {
        el(
          "path",
          { d: line, fill: "none", stroke: "#fff", "stroke-width": S.haloStroke, "stroke-linecap": "round" },
          g,
        );
        el("path", { d: head, fill: "#fff", stroke: "#fff", "stroke-width": 2, "stroke-linejoin": "round" }, g);
      }
      el("path", { d: line, fill: "none", stroke: S.red, "stroke-width": S.stroke, "stroke-linecap": "round" }, g);
      el("path", { d: head, fill: S.red }, g);
      for (const q of [
        from,
        ctl,
        tip,
        { x: base.x - d.y * hw, y: base.y + d.x * hw },
        { x: base.x + d.y * hw, y: base.y - d.x * hw },
      ]) {
        note(q.x, q.y, 0, 0, 3);
      }
    }
  };
  const outline = (p, round) => {
    const r = box(p.on);
    const pad = p.pad ?? S.pad;
    const x = r.x - pad;
    const y = r.y - pad;
    const w = r.width + 2 * pad;
    const h = r.height + 2 * pad;
    shape("rect", { x, y, width: w, height: h, rx: round ? h / 2 : 3 }, p);
    note(x, y, w, h, S.haloStroke / 2);
  };
  const underline = (p) => {
    const r = box(p.on);
    const y = r.y + r.height + (p.gap ?? 3);
    shape("path", { d: `M${r.x} ${y} L${r.x + r.width} ${y}` }, p);
    note(r.x, y, r.width, 0, S.haloStroke / 2);
  };
  const label = (p) => {
    const r = box(p.on);
    const dark = p.tone === "dark";
    const g = el("g", {});
    const t = text(g, p.text, 0, 0, dark ? "#fff" : S.red, S.labelSize, S.labelWeight);
    const w = Math.ceil(t.getComputedTextLength()) + 2 * S.labelPadX;
    const h = S.labelHeight;
    const at = place(r, w, h, p.side ?? "right", p.gap ?? 8, p.dx, p.dy);
    const pill = el(
      "rect",
      {
        x: at.x,
        y: at.y,
        width: w,
        height: h,
        rx: h / 2,
        fill: dark ? S.darkRed : "#fff",
        stroke: dark ? "#fff" : S.red,
        "stroke-width": 1.5,
      },
      g,
    );
    g.insertBefore(pill, t);
    t.setAttribute("x", at.x + w / 2);
    t.setAttribute("y", at.y + h / 2);
    note(at.x, at.y, w, h, 1);
  };
  const badge = (p) => {
    const r = box(p.on);
    const d = S.badge;
    const at = place(r, d, d, p.side ?? "left", p.gap ?? 8, p.dx, p.dy);
    const g = el("g", {});
    if (p.halo !== false) el("circle", { cx: at.x + d / 2, cy: at.y + d / 2, r: d / 2 + 1, fill: "#fff" }, g);
    el("circle", { cx: at.x + d / 2, cy: at.y + d / 2, r: d / 2, fill: S.red }, g);
    text(g, String(p.n), at.x + d / 2, at.y + d / 2, "#fff", 14, 700);
    note(at.x, at.y, d, d, 1);
  };
  const DRAW = {
    arrow,
    box: (p) => outline(p, false),
    ring: (p) => outline(p, true),
    underline,
    label,
    badge,
  };
  try {
    for (const p of prims) (DRAW[p.type] ?? (() => fail("has an unknown type", p)))(p);
  } catch (e) {
    svg.remove();
    throw e;
  }
  return bounds && { x: bounds.x0, y: bounds.y0, width: bounds.x1 - bounds.x0, height: bounds.y1 - bounds.y0 };
}

// Draws the primitives over the page, replacing an earlier layer. Returns the drawn
// layer's bounding box in CSS pixels (null when there is nothing), halos included.
export async function annotate(conn, primitives) {
  return { box: await conn.evaluate(`(${draw})(${JSON.stringify(primitives)}, ${JSON.stringify(STYLE)})`) };
}

// Removes the layer, whether or not there is one.
export const unannotate = (conn) => conn.evaluate(`document.getElementById(${JSON.stringify(LAYER_ID)})?.remove()`);
