// Spike: an SVG picture of a page, built from a DOMSnapshot.captureSnapshot
// result instead of from pixels.
//
// The snapshot gives every layout object's border box in page CSS px, the text
// fragments of every line, the requested computed styles, and a paint-order
// index that already resolves stacking contexts. Each layout object becomes one
// paint item; the items are sorted by that index and written out with page
// coordinates, under a viewBox that is the clip. Whatever an item inherits from
// its ancestors -- opacity, filter, an overflow clip -- is a <g> around it, and
// consecutive items that share a chain share the groups.
//
// What is deliberately approximate, and the reason it is good enough here:
// - an overflow clip is a rectangle (its radius is dropped): the IDE rounds few
//   scrolling boxes;
// - a transform: the snapshot gives every box, text included, as the box it
//   covers after the transforms of its element and its ancestors; it is put back
//   to where it is before them (untransformBox: exact for a quarter turn, a flip
//   and a scale, the IDE's uses) and painted under them;
// - group opacity and filters split when paint order interleaves two subtrees;
// - a filter of colour functions (brightness, invert...) is baked into the
//   colours its group paints rather than drawn as a <filter>
//   (colour-filter.mjs): the same picture to the rounding of a channel, and one
//   a PDF keeps as vector paths and text; a drop-shadow last in such a filter is
//   a copy of the element's group under a filter that draws the shadow alone,
//   with the group itself over it unfiltered (closeGroup);
// - a dotted border of a width other than 1 px lays out its dots a pixel or
//   two differently from Chromium, which no pattern found in the corpus
//   explains; a dashed one, and a dotted one 1 px wide, are exact;
// - an underline is placed and sized as Chromium does (decoratingBoxes,
//   underlineBand), and cut where a descender crosses it by what a canvas shows
//   of the ink (inkBand), which agrees with Chromium on 994 of 1,000 columns
//   of a line (the rest mostly a device pixel off). Each fragment draws its
//   own line, so raised or lowered text (sub, sup) draws one at its own
//   baseline where Chromium draws one for the box that sets the decoration;
//   the spaces that white-space: pre keeps at the start and the end of a line
//   are underlined, where Chromium leaves them out; and a thickness of
//   from-font is drawn as auto (and counted as not drawn, as it is the font's
//   own).
//
// What the snapshot lacks, drawn as replicas of what Chromium paints: the
// closed <select> (paintSelect), a checkbox and a radio button
// (paintCheckable), the text of an <input> and a <textarea> (paintTextControl),
// scrollbars styled with ::-webkit-scrollbar (paintScrollbars, from styles the
// page resolves) and Windows' own, the Fluent ones, where nothing styles them
// (paintNativeScrollbars), and the focus ring of outline-style: auto
// (paintFocusRing). Not drawn: the thinner native scrollbar
// (scrollbar-width: thin), a resize grip, a number input's spin buttons, an
// indeterminate checkbox (the snapshot does not say), conic gradients, the 2011
// -webkit-radial-gradient and the filter blur(); an overline, a
// line-through, a dotted, dashed, wavy or double text decoration, and an
// underline placed by text-underline-position (decorationsOf). Drawn wrongly: a
// collapsed table border, doubled.
//
// A frame: the snapshot holds the document of an <iframe> of the same process as
// a document of its own, in its own coordinates (decodeSnapshot). It is drawn at
// the iframe's place in paint order as a group (paintFrame): clipped to the
// iframe's content box, which is the frame's viewport, moved by the iframe's
// place and the frame's scroll offset, and scaled when the frame is zoomed; its
// canvas colour under it and its viewport scrollbars over it. Not drawn: a frame
// of another process, which has no document in the snapshot (a cross-site
// <iframe> has a DevTools target of its own), a transformed frame, the scrollbars
// of a zoomed frame, and the rounded corners of a frame's clip.
//
// An inline <svg> in the page is not converted from its layout objects, which
// hold no path data. It is a replaced element: the caller reads the markup of each
// one in the view, with the page's styles resolved on its elements (`svgs`, by the
// <svg>'s layout object; capture.mjs's inlineSvg), and paintInlineSvg draws it
// at the element's place in paint order, as a nested <svg> in the content box,
// which scales its viewBox as the page does; its CSS transform, opacity and
// filter are the element's, as for any box. Its ids are given a prefix of its
// own (scopeIds), since two icons both have an `id="a"`; an <image> in it passes
// through compactImage; its text is set in the picture's faces. Not drawn: a
// <foreignObject>, an <image> that cannot be read, a <use> of another file, an
// animation (its state when the snapshot was taken is drawn), and a CSS mask or
// clip-path on the <svg> element itself. The annotation layer and the mouse
// pointer are the exceptions: the caller passes their markup as `overlays`,
// painted last.

import { compactImage } from "../lib/compact-image.mjs";
import { bakeable, bakeMarkup, colourSteps, filterSteps, stepPrimitive, stepsOpacity } from "./colour-filter.mjs";
import { FACES_MARK } from "./fonts.mjs";
import { gradientSvg, parseGradient } from "./gradient.mjs";
import { esc, num, px, rgba, splitTop } from "./util.mjs";

const INF = { x: -1e9, y: -1e9, w: 2e9, h: 2e9 };

// What a scrollbar part is painted as: a box of no element.
const SCROLLBAR_NODE = { name: "::-webkit-scrollbar", attrs: {} };

// The length of a custom scrollbar thumb of auto height: Windows' thumb length
// at 96 DPI (SM_CYVTHUMB), which the IDE runs at. No page property shows it,
// unlike the auto length of the other parts (capture.mjs measures that); it is
// what Chromium draws, in WebView2 and headless alike. bench.mjs checks it
// against the pixels.
export const AUTO_THUMB = 17;

// The colours of Windows' own scrollbar where the page gives none (scrollbar-color
// auto), by the colour scheme in use: the thumb and the arrows, and the track.
const NATIVE_COLOURS = {
  light: { thumb: "rgb(139, 139, 139)", track: "rgb(252, 252, 252)" },
  dark: { thumb: "rgb(159, 159, 159)", track: "rgb(44, 44, 44)" },
};

export { esc, num, splitTop };

/**
 * An SVG with no line break but its last: one inside a tag becomes the space an
 * XML parser makes of it, and one in text the reference to the same character.
 * A checkout that turns LF into CRLF (core.autocrlf) then changes the file's
 * last line ending alone, which can change nothing that is drawn. Assumes what
 * this module writes: no `>` in an attribute value, and no CDATA.
 */
export function oneLine(svg) {
  const body = svg.endsWith("\n") ? svg.slice(0, -1) : svg;
  const flat = body.replace(/<[^>]*>|[^<]+/g, (m) =>
    m[0] === "<" ? m.replace(/\r\n|\r|\n/g, " ") : m.replace(/\r\n|\r|\n/g, "&#10;"),
  );
  return svg.endsWith("\n") ? `${flat}\n` : flat;
}

export function transparent(c) {
  if (!c || c === "transparent") return true;
  const m = /^rgba\((.*)\)$/.exec(c);
  return m ? Number.parseFloat(m[1].split(",")[3]) === 0 : false;
}

function intersect(a, b) {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.w, b.x + b.w) - x;
  const h = Math.min(a.y + a.h, b.y + b.h) - y;
  return { x, y, w: Math.max(0, w), h: Math.max(0, h) };
}

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * The snapshot as linked nodes and layout objects: {nodes, layouts, ...}, the
 * first document's. The document of each <iframe> that has one in the snapshot
 * (a frame of the same process) is decoded the same way and hangs off the
 * iframe's node as `frame`, with what a frame has of its own: `id` (its place in
 * the snapshot), `url`, `frameId` (the DevTools frame it is), `scroll` (how far
 * it is scrolled) and `content` (how large it is). Its layout boxes are in its
 * own coordinates, whatever the iframe's place in its parent.
 *
 * A layout object's box is snapped as Chromium snaps it when it paints, each
 * edge to the nearest pixel of the grid it lays out on, so a border lands on
 * the pixels the IDE drew it on rather than across two. `grid` is that grid's
 * pixels per CSS pixel: 1 for the IDE, which lays out at 1x (it runs with
 * --force-device-scale-factor=1) and is only rasterised at 2x by the emulated
 * device metrics -- a menu 188.59 px wide is painted 189 wide, not 188.5.
 * Text fragments keep their exact positions: glyphs are not snapped so, and
 * nor is the text a control draws, which is placed from the box's exact
 * bounds (`exact`).
 */
export function decodeSnapshot(snapshot, styleNames, { grid = 1 } = {}) {
  return decodeDocument(snapshot, 0, styleNames, grid, new Set());
}

function decodeDocument(snapshot, di, styleNames, grid, seen) {
  seen.add(di);
  const snap = (v) => Math.round(v * grid) / grid;
  const S = snapshot.strings;
  const str = (i) => (i >= 0 ? S[i] : undefined);
  const doc = snapshot.documents[di];
  const N = doc.nodes;
  const L = doc.layout;
  const T = doc.textBoxes;
  const rare = (r) => new Map((r?.index ?? []).map((n, k) => [n, r.value ? r.value[k] : true]));
  const content = rare(N.contentDocumentIndex);
  const pseudo = rare(N.pseudoType);
  const inputValue = rare(N.inputValue);
  const textValue = rare(N.textValue);
  const src = rare(N.currentSourceURL);
  const selected = rare(N.optionSelected);
  const checked = rare(N.inputChecked);
  const nodes = N.parentIndex.map((parent, i) => {
    const attrs = {};
    const a = N.attributes[i] ?? [];
    for (let k = 0; k < a.length; k += 2) attrs[S[a[k]]] = S[a[k + 1]];
    return {
      i,
      parentIndex: parent,
      backendNodeId: N.backendNodeId?.[i],
      type: N.nodeType[i],
      name: str(N.nodeName[i]),
      value: str(N.nodeValue[i]),
      selected: selected.has(i),
      checked: checked.has(i),
      attrs,
      pseudo: pseudo.has(i) ? S[pseudo.get(i)] : undefined,
      inputValue: inputValue.has(i) ? S[inputValue.get(i)] : undefined,
      textValue: textValue.has(i) ? S[textValue.get(i)] : undefined,
      src: src.has(i) ? S[src.get(i)] : undefined,
      // The decoded document of an <iframe> (and the like) that has one in the snapshot.
      frame: null,
      layouts: [],
    };
  });
  for (const n of nodes) {
    n.parent = n.parentIndex >= 0 ? nodes[n.parentIndex] : null;
    n.children = [];
  }
  for (const n of nodes) n.parent?.children.push(n);
  const layouts = L.nodeIndex.map((n, li) => {
    const st = L.styles[li];
    const style = st.length ? Object.fromEntries(styleNames.map((p, k) => [p, str(st[k])])) : null;
    const [bx, by, bw, bh] = L.bounds[li];
    const [x, y] = [snap(bx), snap(by)];
    const o = L.offsetRects?.[li];
    const c = L.clientRects?.[li];
    const s = L.scrollRects?.[li];
    return {
      li,
      // Unique across the documents of a snapshot (a map of layout objects is keyed by it); in
      // a snapshot cut down to a picture (bundle.mjs trimSnapshot), the index it had before.
      key: `${di}:${L.originalIndex?.[li] ?? li}`,
      node: nodes[n],
      bounds: { x, y, w: snap(bx + bw) - x, h: snap(by + bh) - y },
      // Unsnapped, as the text a control draws inside it is placed.
      exact: { x: bx, y: by, w: bw, h: bh },
      offset: o?.length ? { w: o[2], h: o[3] } : null,
      // The padding box without its scrollbars.
      client: c?.length ? { w: c[2], h: c[3] } : null,
      // How far the content is scrolled (x, y), and how large it is (w, h).
      scroll: s?.length ? { x: s[0], y: s[1], w: s[2], h: s[3] } : null,
      text: str(L.text[li]),
      paint: L.paintOrders?.[li] ?? 0,
      style,
      boxes: [],
    };
  });
  for (let t = 0; t < T.layoutIndex.length; t++) {
    const [x, y, w, h] = T.bounds[t];
    layouts[T.layoutIndex[t]].boxes.push({ x, y, w, h, start: T.start[t], length: T.length[t] });
  }
  for (const l of layouts) {
    l.node.layouts.push(l);
    if (l.style && l.text === undefined && !l.node.box) l.node.box = l;
  }
  for (const n of nodes) n.style = n.box?.style ?? n.layouts.find((l) => l.style)?.style ?? null;
  const decoded = {
    id: di,
    url: str(doc.documentURL),
    frameId: str(doc.frameId),
    // How far the document is scrolled, and how large it is (the viewport's scrollbars follow from these).
    scroll: { x: doc.scrollOffsetX ?? 0, y: doc.scrollOffsetY ?? 0 },
    content: { w: doc.contentWidth ?? 0, h: doc.contentHeight ?? 0 },
    owner: null,
    nodes,
    layouts,
  };
  // The document of a frame, when the snapshot holds it: a frame of another process is no document here.
  for (const [i, k] of content) {
    if (seen.has(k) || !snapshot.documents[k]) continue;
    nodes[i].frame = decodeDocument(snapshot, k, styleNames, grid, seen);
    nodes[i].frame.owner = nodes[i];
  }
  return decoded;
}

/** Whether `n`, or an element above it, is an <svg>. */
function insideSvg(n) {
  for (; n; n = n.parent) if (n.name === "svg") return true;
  return false;
}

/**
 * The layout objects of the inline <svg>s that show in `clip`: the outermost
 * <svg> of each, visible and with a size, which are the ones to read in the page
 * (capture.mjs's inlineSvg) and to draw (renderSvg's `svgs`).
 */
export function inlineSvgsIn(decoded, clip) {
  const out = [];
  for (const l of decoded.layouts) {
    const n = l.node;
    if (n.name !== "svg" || n.box !== l || !l.style || insideSvg(n.parent)) continue;
    if (l.style.visibility !== "visible" || l.bounds.w <= 0 || l.bounds.h <= 0 || !overlaps(l.bounds, clip)) continue;
    out.push(l);
  }
  return out;
}

/**
 * `markup` (what capture.mjs's inlineSvg gives) with every id given `prefix`,
 * and each reference to one: `href="#id"` and `url(#id)`, in a tag and nowhere
 * else, so that a text that says `id="a"` is left as it is. Two icons in a page
 * that both define `id="a"` are two ids once they share one picture.
 */
export function scopeIds(markup, prefix) {
  return markup.replace(/<[^>]*>/g, (tag) =>
    tag
      .replace(/(\sid=")([^"]*)"/g, (_, head, id) => `${head}${prefix}${id}"`)
      .replace(/(\shref="#)([^"]*)"/g, (_, head, id) => `${head}${prefix}${id}"`)
      .replace(/url\(#([^)]*)\)/g, (_, id) => `url(#${prefix}${id})`),
  );
}

/** The nearest node at or above `n` that has a computed style. */
function styled(n) {
  while (n && !n.style) n = n.parent;
  return n;
}

/** The style a text layout object is drawn with. */
export function textStyle(l) {
  return l.style ?? styled(l.node.parent)?.style ?? null;
}

export function fontKey(st) {
  return JSON.stringify([st["font-style"], st["font-weight"], st["font-size"], st["font-family"]]);
}

/** Every font a text fragment in the clip is drawn with, as fontKey strings. */
/** The text a closed drop-down list shows: its selected option's. */
export function selectLabel(select) {
  const option = (function find(n) {
    for (const c of n.children) {
      if (c.name === "OPTION" && c.selected) return c;
      const hit = find(c);
      if (hit) return hit;
    }
    return null;
  })(select);
  if (!option) return "";
  // As HTMLOptionElement's display label: the label attribute when it has more than
  // whitespace, else the text of every descendant but a <script>'s (the IDE puts the name
  // in a <b>, which a closed select draws in its own font); HTML whitespace collapsed and
  // trimmed, and no other: the IDE spaces the name from the type with no-break spaces.
  const html = (s) => s.replace(/[ \t\n\f\r]+/g, " ").replace(/^ | $/g, "");
  const label = html(option.attrs?.label ?? "");
  if (label) return label;
  const text = (n) =>
    n.type === 3 ? (n.value ?? "") : n.name === "SCRIPT" ? "" : (n.children ?? []).map(text).join("");
  return html(text(option));
}

const TEXT_INPUTS = new Set(["text", "search", "email", "url", "tel", "number", "password"]);
const BUTTON_INPUTS = new Set(["button", "submit", "reset"]);
const CHECKABLE_INPUTS = new Set(["checkbox", "radio"]);

/**
 * The text a native <input> or <textarea> shows, which is no DOM text:
 * {text, placeholder} (placeholder is true when it is the placeholder's, shown
 * while the value is empty), or null when it shows none, as a checkbox does.
 */
export function controlText(node) {
  const type = (node.attrs.type ?? "text").toLowerCase();
  const textarea = node.name === "TEXTAREA";
  if (node.name !== "INPUT" && !textarea) return null;
  if (!textarea && !TEXT_INPUTS.has(type) && !BUTTON_INPUTS.has(type)) return null;
  const value =
    (textarea ? node.textValue : (node.inputValue ?? (BUTTON_INPUTS.has(type) ? node.attrs.value : ""))) ?? "";
  if (value) return { text: type === "password" ? "•".repeat([...value].length) : value, placeholder: false };
  const hint = node.attrs.placeholder;
  return hint && !BUTTON_INPUTS.has(type) ? { text: hint, placeholder: true } : null;
}

/**
 * The lines of a text control's text, as they are drawn: a textarea's split at
 * its newlines, and a tab (it advances to the next multiple of 8 spaces) as
 * spaces, which an SVG text would draw as one.
 */
function controlLines(text, textarea, tabSize) {
  const lines = textarea ? text.split(/\r?\n/) : [text];
  const size = /^\d+$/.test(tabSize ?? "") ? Number(tabSize) : 8;
  return lines.map((line) => {
    let out = "";
    for (const ch of line) out += ch === "\t" ? " ".repeat(size - (out.length % size)) : ch;
    return out;
  });
}

/**
 * controlText of a layout object that is visible and large enough to show it:
 * the code editor's hidden 1 by 1 textarea holds the module's whole text and
 * shows none of it.
 */
function shownControlText(l) {
  const st = l.style;
  if (st.visibility !== "visible" || l.bounds.w < 4 || l.bounds.h < 4) return null;
  // A transparent text is there for the caret: an editor lays its own text under it.
  if (transparent(st.color) || transparent(st["-webkit-text-fill-color"])) return null;
  return controlText(l.node);
}

/**
 * What the picture's text needs measured in a browser: every font (as
 * fontKey strings), every run of text with its font, [fontKey, text], and every
 * run an underline has to skip the ink of, [fontKey, text, top, height]: the band
 * below the baseline (CSS px) in which Chromium looks for it (inkBand).
 */
export function textNeeds(decoded, clip) {
  const keys = new Set();
  const runs = new Map();
  const skips = new Map();
  const add = (st, s) => {
    const key = fontKey(st);
    keys.add(key);
    if (s.trim()) runs.set(`${key}\u0000${s}`, [key, s]);
  };
  for (const l of decoded.layouts) {
    if (l.node.name === "SELECT" && l.style && overlaps(l.bounds, clip)) add(l.style, selectLabel(l.node));
    if (l.style && l.node.box === l && overlaps(l.bounds, clip)) {
      const c = shownControlText(l);
      if (c)
        for (const line of controlLines(c.text, l.node.name === "TEXTAREA", l.style["tab-size"])) add(l.style, line);
    }
    if (l.text === undefined) continue;
    const st = textStyle(l);
    if (!st) continue;
    const { lines } = st.visibility === "visible" ? decorationsOf(l) : { lines: [] };
    for (const b of l.boxes) {
      if (!overlaps(b, clip)) continue;
      const s = l.text.substr(b.start, b.length);
      add(st, s);
      if (s.trim())
        for (const u of lines)
          if (u.skipInk) {
            const [top, height] = inkBand(u);
            skips.set(`${fontKey(st)}\u0000${s}\u0000${top}\u0000${height}`, [fontKey(st), s, top, height]);
          }
    }
  }
  return { keys: [...keys], runs: [...runs.values()], skips: [...skips.values()] };
}

// --- text decorations --------------------------------------------------------

// A box that passes no text decoration down to its text, and takes none from
// above: an atomic inline-level box, a float or a positioned box.
const ATOMIC_INLINE = /^(?:-webkit-)?inline-(?:block|box|flex|grid|table)$/;

/**
 * The computed styles of the boxes whose text-decoration applies to the text of
 * `node`'s element, nearest first. text-decoration is not inherited, but
 * Chromium draws a decoration on the text of the in-flow descendants of the box
 * that sets it -- blocks and flex items included -- and stops at an atomic
 * inline-level box, a float or a positioned box, whose own decoration still
 * counts for its text. Each box draws its own line, so an outer one runs on
 * under an inner one that sets none.
 */
export function decoratingBoxes(node) {
  const out = [];
  for (let a = node; a; a = a.parent) {
    const st = a.style;
    if (!st) continue;
    const line = st["text-decoration-line"];
    if (line && line !== "none") out.push(st);
    if (ATOMIC_INLINE.test(st.display) || (st.float ?? "none") !== "none") break;
    if (st.position === "absolute" || st.position === "fixed") break;
  }
  return out;
}

/**
 * Where Chromium draws the solid underline of the box `st` that sets it, below
 * the baseline and in whole CSS px, as {offset, thickness}: the top of the line
 * and its height. Fitted against Edge at font sizes from 8 to 64 px, fractional
 * ones included, at fractional positions, and in six fonts, which it does not
 * depend on; bench/decoration.html holds the sizes where the figures step. The
 * page is laid out at 1x and Chromium snaps the line there, so the rule holds at
 * any scale it is rasterised at.
 *   - auto thickness is a tenth of the box's font size, cut down to whole px and
 *     at least 1; a thickness given is rounded to whole px, at least 1;
 *   - auto offset is half the thickness as it was before rounding, rounded up
 *     to whole px and at least 1; an offset given is rounded to whole px;
 *   - sizes come from the box that sets the decoration, not from the text under it.
 * `reach` is the thickness before rounding, which is how far Chromium widens the
 * gap it cuts round a glyph.
 */
export function underlineBand(st) {
  const size = px(st["font-size"]);
  const asked = st["text-decoration-thickness"] ?? "auto";
  const given = asked.endsWith("%") ? (px(asked) / 100) * size : asked.endsWith("px") ? px(asked) : null;
  const reach = given ?? size / 10;
  const shift = st["text-underline-offset"] ?? "auto";
  return {
    offset:
      shift === "auto"
        ? Math.max(1, Math.ceil(reach / 2))
        : Math.round(shift.endsWith("%") ? (px(shift) / 100) * size : px(shift)),
    thickness: Math.max(1, given === null ? Math.floor(reach) : Math.round(reach)),
    reach,
  };
}

/**
 * The band below the baseline in which Chromium looks for the ink an underline
 * skips, as [top, height] in CSS px: the line, drawn in 0.5 px from its top and
 * 0.3 px from its bottom, so that a glyph that only grazes it is not skipped.
 * Fitted against Edge on two pangrams at 13, 20, 30 and 40 px, as the share of
 * the line's columns on the wrong side of a gap: 61 in 9,721 for this band, 100
 * for the line less 0.5 px at both ends and 180 for the line itself.
 */
export function inkBand({ offset, thickness }) {
  return [offset + 0.5, thickness - 0.8];
}

/**
 * The decorations of a text layout object that are drawn and those that are
 * not: {lines, undrawn}. `lines` are its solid underlines, outermost box first,
 * each as {offset, thickness, reach, color, skipInk} (underlineBand's, the
 * colour, and whether the line gives way to ink); `undrawn` names what the
 * decorations ask for that is not drawn, for note(): every line but a solid
 * underline, and an underline where Chromium does not put it by default.
 *
 * The line is the colour of the box that sets it, not of the text under it, and
 * by default that is the fill colour of its text, which a transparent fill takes
 * with it.
 */
export function decorationsOf(l) {
  const lines = [];
  const undrawn = [];
  for (const d of decoratingBoxes(l.node.type === 3 ? l.node.parent : l.node)) {
    const style = d["text-decoration-style"] ?? "solid";
    for (const line of d["text-decoration-line"].split(/\s+/)) {
      if (line !== "underline") undrawn.push(`text-decoration-line ${line}`);
      else if (style !== "solid") undrawn.push(`text-decoration-style ${style}`);
      else if ((d["text-underline-position"] ?? "auto") !== "auto") undrawn.push("text-underline-position");
      else {
        if (d["text-decoration-thickness"] === "from-font") undrawn.push("text-decoration-thickness from-font");
        const fill = d["-webkit-text-fill-color"];
        const color = d["text-decoration-color"] === d.color && fill ? fill : d["text-decoration-color"];
        if (!transparent(color))
          lines.push({ ...underlineBand(d), color, skipInk: (d["text-decoration-skip-ink"] ?? "auto") !== "none" });
      }
    }
  }
  // The outermost box paints first, so that an inner line is over an outer one.
  return { lines: lines.reverse(), undrawn };
}

// --- computed-value parsers ------------------------------------------------

function radii(st, w, h) {
  const one = (v) => {
    const [a, b = a] = (v ?? "0px").split(/\s+/);
    const conv = (s, ref) => (s.endsWith("%") ? (px(s) / 100) * ref : px(s));
    return [conv(a, w), conv(b, h)];
  };
  const r = [
    one(st["border-top-left-radius"]),
    one(st["border-top-right-radius"]),
    one(st["border-bottom-right-radius"]),
    one(st["border-bottom-left-radius"]),
  ];
  // CSS scales all radii down together when adjacent ones overlap.
  const f = Math.min(
    1,
    w / (r[0][0] + r[1][0] || 1),
    w / (r[3][0] + r[2][0] || 1),
    h / (r[0][1] + r[3][1] || 1),
    h / (r[1][1] + r[2][1] || 1),
  );
  return r.map(([a, b]) => [a * f, b * f]);
}

const SIDES = ["top", "right", "bottom", "left"];

const rgbaCss = ({ r, g, b, a }) => (a === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`);

// Blink's Color::Dark and Color::Light, which shade the sides of an inset or
// outset border (blink/renderer/platform/graphics/color.cc).
const SCALE = 255.99998474121094; // nextafterf(256, 0)
function shade(c, darken) {
  const { r, g, b, a } = c;
  if (r === 0 && g === 0 && b === 0) return { r: 0x54, g: 0x54, b: 0x54, a };
  const v = Math.max(r, g, b) / SCALE;
  const k = darken ? Math.max(0, (v - 0.33) / v) : Math.min(1, v + 0.33) / v;
  return { r: Math.trunc(k * r), g: Math.trunc(k * g), b: Math.trunc(k * b), a };
}

// box_border_painter.cc: an inset border darkens its top and left sides and
// lightens the others, an outset one the reverse -- each only when the colour
// is far enough from black (or white) for the change to show.
function borderColor(style, side, color) {
  if (style !== "inset" && style !== "outset") return color;
  const c = rgba(color);
  if (!c) return color;
  const d2 = (x, v) => (x.r - v) ** 2 + (x.g - v) ** 2 + (x.b - v) ** 2;
  const darken = (side === "top" || side === "left") === (style === "inset");
  if (darken) return d2(c, 0) > 3 * 0x20 ** 2 ? rgbaCss(shade(c, true)) : color;
  return d2(c, 255) > 3 * (255 - 0xeb) ** 2 ? rgbaCss(shade(c, false)) : color;
}

function borders(st) {
  return SIDES.map((s) => {
    const style = st[`border-${s}-style`];
    const width = style === "none" || style === "hidden" ? 0 : px(st[`border-${s}-width`]);
    const plain = style === "inset" || style === "outset" ? "solid" : style;
    return { width, color: borderColor(style, s, st[`border-${s}-color`]), style: plain };
  });
}

const SCROLLS = new Set(["auto", "scroll", "overlay"]);

/**
 * The scrollbars of a layout object: {v, h}, the thickness of its vertical and
 * horizontal scrollbar, 0 where it has none. A scrollbar is the part of the
 * padding box that the client box leaves out; a difference of a pixel or two
 * is the two boxes rounded differently. The root's scrollbars are the
 * viewport's, which the picture of the page itself does not draw (the IDE's
 * page has none); a frame's are drawn from viewportScroller's object, which
 * says its own.
 */
export function gutters(l) {
  const st = l.style;
  if (l.viewport) return l.viewport;
  if (!st || !l.client || l.node.box !== l || l.node.name === "HTML" || l.node.name === "BODY") return { v: 0, h: 0 };
  const bw = borders(st);
  const b = l.bounds;
  const v = SCROLLS.has(st["overflow-y"]) ? Math.round(b.w - bw[1].width - bw[3].width - l.client.w) : 0;
  const h = SCROLLS.has(st["overflow-x"]) ? Math.round(b.h - bw[0].width - bw[2].width - l.client.h) : 0;
  return { v: v > 2 ? v : 0, h: h > 2 ? h : 0 };
}

/** Every layout object in the clip with a scrollbar, as {l, v, h} (gutters). */
export function scrollersIn(decoded, clip) {
  const out = [];
  for (const l of decoded.layouts) {
    if (!overlaps(l.bounds, clip)) continue;
    const g = gutters(l);
    if (g.v || g.h) out.push({ l, ...g });
  }
  return out;
}

// The parts of one scrollbar Chromium makes (CustomScrollbar::UpdateScrollbarParts):
// [name, pseudo-element after "::-webkit-scrollbar", the pseudo-classes the part
// matches]. The buttons are placed as on Windows, one at each end: only the
// back button at the start and the forward one at the end are single buttons.
const SCROLLBAR_PARTS = [
  ["scrollbar", "", []],
  ["back-button-start", "-button", ["decrement", "start", "single-button"]],
  ["forward-button-start", "-button", ["increment", "start"]],
  ["back-button-end", "-button", ["decrement", "end"]],
  ["forward-button-end", "-button", ["increment", "end", "single-button"]],
  ["track", "-track", []],
  ["back-track", "-track-piece", ["decrement", "start", "single-button"]],
  ["forward-track", "-track-piece", ["increment", "end", "single-button"]],
  ["thumb", "-thumb", []],
];

/**
 * The scrollbar parts of a scrolling layout object whose styles the page must
 * resolve: [{key, pseudo, states}], `key` being "v:thumb" and the like, and
 * "corner" for the corner between two scrollbars. Nothing is hovered or pressed.
 */
export function scrollbarPartList(l) {
  const g = gutters(l);
  const corner = g.v > 0 && g.h > 0;
  const list = [];
  for (const [o, orientation] of [
    ["v", "vertical"],
    ["h", "horizontal"],
  ]) {
    if (!g[o]) continue;
    const enabled = l.scroll && (o === "v" ? l.scroll.h > l.client.h : l.scroll.w > l.client.w);
    const common = [orientation, enabled ? "enabled" : "disabled", ...(corner ? ["corner-present"] : [])];
    for (const [part, pseudo, states] of SCROLLBAR_PARTS)
      list.push({ key: `${o}:${part}`, pseudo, states: [...common, ...states] });
  }
  if (corner) list.push({ key: "corner", pseudo: "-corner", states: [] });
  return list;
}

// --- frames ------------------------------------------------------------------

/**
 * The frames in `decoded` that show in `view` (page CSS px) and whose document
 * the snapshot holds: [{l, doc}], `l` the <iframe>'s layout object. A frame of
 * another process has no document here (renderSvg says so); one that is hidden
 * or has no size shows nothing.
 */
export function framesIn(decoded, view) {
  const out = [];
  for (const l of decoded.layouts) {
    const doc = l.node.frame;
    if (!doc || !l.style || l.node.box !== l || l.style.visibility !== "visible") continue;
    if (l.bounds.w > 0 && l.bounds.h > 0 && overlaps(l.bounds, view)) out.push({ l, doc });
  }
  return out;
}

/**
 * Where an <iframe>'s document is drawn in its parent: {box, scale}. `box` is
 * the iframe's content box, its border box less border and padding, in the
 * parent's coordinates, and is the frame's viewport. `scale` is how large one
 * CSS px of the frame is in the parent's: the viewport's width over `inner`'s,
 * the frame's own innerWidth ({w, h}; null when it is not known), which is 1
 * unless the frame is zoomed. A point (x, y) of the frame's document is drawn
 * at box.x + (x - doc.scroll.x) * scale, and the same down the page.
 */
export function frameGeometry(l, inner) {
  const st = l.style;
  const bw = borders(st);
  const pad = SIDES.map((s) => px(st[`padding-${s}`]));
  const box = deflate(l.bounds, bw[0].width + pad[0], bw[1].width + pad[1], bw[2].width + pad[2], bw[3].width + pad[3]);
  const zoomed = inner && inner.w > 0 && Math.abs(box.w - inner.w) >= 1;
  return { box, scale: zoomed ? box.w / inner.w : 1 };
}

/**
 * Puts the layout boxes and text boxes of a zoomed frame's document into the
 * frame's own px. The snapshot gives them in the parent's, one CSS px of the
 * frame being `scale` of those, while the computed styles and the scroll,
 * offset and client sizes are in the frame's: left alone, the boxes would
 * be scaled twice. Done once.
 */
export function unzoom(doc, scale) {
  if (doc.unzoomed || scale === 1 || !(scale > 0)) return;
  doc.unzoomed = true;
  for (const l of doc.layouts)
    for (const r of [l.bounds, l.exact, ...l.boxes]) {
      r.x /= scale;
      r.y /= scale;
      r.w /= scale;
      r.h /= scale;
    }
}

/**
 * What of `view` (the parent's coordinates) shows of a frame, in the frame's
 * own coordinates; null where the frame is out of view.
 */
export function frameView(view, { box, scale }, doc) {
  const seen = intersect(view, box);
  if (!(seen.w > 0 && seen.h > 0)) return null;
  return {
    x: (seen.x - box.x) / scale + doc.scroll.x,
    y: (seen.y - box.y) / scale + doc.scroll.y,
    w: seen.w / scale,
    h: seen.h / scale,
  };
}

/** The style the viewport's scrollbars are drawn with: nothing of a box. */
const VIEWPORT_STYLE = {
  resize: "none",
  "overflow-x": "scroll",
  "overflow-y": "scroll",
  ...Object.fromEntries(SIDES.map((s) => [`border-${s}-style`, "none"])),
};

/** The root element's layout object of a document. */
export function rootBox(doc) {
  return doc.nodes.find((n) => n.name === "HTML")?.box ?? null;
}

/**
 * The elements whose ::-webkit-scrollbar rules style a frame's viewport
 * scrollbars, in the order Chromium looks at them: the <body>, then the root
 * element.
 */
export function viewportStyleSources(doc) {
  return ["BODY", "HTML"].map((name) => doc.nodes.find((n) => n.name === name)).filter((n) => n?.backendNodeId);
}

/**
 * The thickness of the scrollbars of a document's viewport, {v, h}, 0 for a
 * bar it has not got; null when it has none: what the root element's client
 * box leaves out of the viewport (`inner`, the frame's innerWidth and
 * innerHeight in its own px), a difference of a pixel or two being rounding.
 */
export function viewportGutters(doc, inner) {
  const root = rootBox(doc);
  if (!root?.client || !inner) return null;
  const v = Math.round(inner.w - root.client.w);
  const h = Math.round(inner.h - root.client.h);
  return v > 2 || h > 2 ? { v: v > 2 ? v : 0, h: h > 2 ? h : 0 } : null;
}

/**
 * A frame's viewport scrollbars, as a stand-in for the scrolling box they would
 * be if the viewport were one: a layout-object-like {key, bounds, client,
 * scroll, style, viewport: {v, h}} that gutters, scrollbarPartList and
 * paintScrollbars take as they take a scrolling box, or null where the frame
 * shows none. The scrollbars are the part of the frame's viewport (`inner`, its
 * innerWidth and innerHeight) that the root element's client box leaves out.
 * `bounds` is the frame's viewport in the parent: the bars are drawn there, at
 * the scale of the parent and not the frame's. A zoomed frame has none here:
 * a bar is as thick in the parent's px as in a frame that is not zoomed.
 */
export function viewportScroller(doc, geometry, inner) {
  const viewport = viewportGutters(doc, inner);
  if (!viewport || geometry.scale !== 1) return null;
  const root = rootBox(doc);
  return {
    key: `${doc.id}:viewport`,
    node: { name: "#viewport", attrs: {} },
    bounds: geometry.box,
    client: { w: inner.w - viewport.v, h: inner.h - viewport.h },
    scroll: {
      x: doc.scroll.x,
      y: doc.scroll.y,
      w: root.scroll?.w ?? doc.content.w,
      h: root.scroll?.h ?? doc.content.h,
    },
    style: VIEWPORT_STYLE,
    viewport,
  };
}

/**
 * The colour a document fills its viewport with: the root element's
 * background, else the <body>'s, which is propagated to it; null for none. A
 * frame with none is transparent, and a page with none shows the browser's
 * own white (renderSvg).
 */
export function canvasColor(doc) {
  const root = doc.nodes.find((n) => n.name === "HTML");
  const body = doc.nodes.find((n) => n.name === "BODY");
  return [root, body].map((n) => n?.style?.["background-color"]).find((c) => !transparent(c)) ?? null;
}

export function parseShadows(v) {
  if (!v || v === "none") return [];
  return splitTop(v).map((s) => {
    const inset = /\binset\b/.test(s);
    const color = /^(rgba?\([^)]*\)|#[0-9a-f]+|[a-z]+)/i.exec(s)?.[1] ?? "black";
    const lens = (s.replace(color, "").match(/-?[\d.]+px/g) ?? []).map(px);
    const [x = 0, y = 0, blur = 0, spread = 0] = lens;
    return { inset, color, x, y, blur, spread };
  });
}

function parseMatrix(v) {
  const m = /^matrix\(([^)]*)\)$/.exec(v ?? "");
  return m ? m[1].split(",").map(Number) : null;
}

/**
 * The transform of an element, from what the snapshot gives: `bounds` its box after the
 * transform (every layout object's bounds are), `size` its own size before it (offsetRects),
 * `m` its computed matrix and `origin` its computed transform-origin in px from the box's
 * corner (null: the centre, the initial value). Returns {box, svg}: the box before the
 * transform, and the SVG matrix taking a point before it to the point after it.
 */
export function elementTransform(bounds, size, m, origin) {
  const [a, b, c, d, e, f] = m;
  const [ox, oy] = origin ?? [size.w / 2, size.h / 2];
  const corners = [
    [0, 0],
    [size.w, 0],
    [0, size.h],
    [size.w, size.h],
  ].map(([u, v]) => [a * (u - ox) + c * (v - oy), b * (u - ox) + d * (v - oy)]);
  const x = bounds.x - ox - e - Math.min(...corners.map((p) => p[0]));
  const y = bounds.y - oy - f - Math.min(...corners.map((p) => p[1]));
  const O = [x + ox, y + oy];
  const tx = O[0] + e - (a * O[0] + c * O[1]);
  const ty = O[1] + f - (b * O[0] + d * O[1]);
  return {
    box: { x, y, w: size.w, h: size.h },
    m: [a, b, c, d, tx, ty],
    svg: `matrix(${[a, b, c, d, tx, ty].map(num).join(" ")})`,
  };
}

/**
 * A box after a transform (elementTransform's `m`) put back to where it is before it: its
 * centre mapped back, and its size the one whose box the transform turns into one of this
 * size (exact for a quarter turn, a flip and a scale); the size as it is where no single
 * size does (a turn of 45 degrees).
 */
export function untransformBox(r, [a, b, c, d, tx, ty]) {
  const det = a * d - b * c;
  const X = r.x + r.w / 2 - tx;
  const Y = r.y + r.h / 2 - ty;
  const cx = (d * X - c * Y) / det;
  const cy = (-b * X + a * Y) / det;
  const [pa, pb, pc, pd] = [a, b, c, d].map(Math.abs);
  const k = pa * pd - pb * pc;
  let w = r.w;
  let h = r.h;
  if (Math.abs(k) > 1e-6) {
    const sw = (pd * r.w - pc * r.h) / k;
    const sh = (pa * r.h - pb * r.w) / k;
    if (sw >= 0 && sh >= 0) [w, h] = [sw, sh];
  }
  return { ...r, x: cx - w / 2, y: cy - h / 2, w, h };
}

function rrectPath({ x, y, w, h }, r) {
  if (r.every(([a, b]) => a === 0 && b === 0)) return null;
  const [tl, tr, br, bl] = r;
  const arc = ([rx, ry], ex, ey) =>
    rx && ry ? `A${num(rx)} ${num(ry)} 0 0 1 ${num(ex)} ${num(ey)}` : `L${num(ex)} ${num(ey)}`;
  return (
    `M${num(x + tl[0])} ${num(y)}H${num(x + w - tr[0])}${arc(tr, x + w, y + tr[1])}` +
    `V${num(y + h - br[1])}${arc(br, x + w - br[0], y + h)}` +
    `H${num(x + bl[0])}${arc(bl, x, y + h - bl[1])}` +
    `V${num(y + tl[1])}${arc(tl, x + tl[0], y)}Z`
  );
}

// The length of the outline rrectPath draws.
function rrectLength({ w, h }, r) {
  const [tl, tr, br, bl] = r;
  const arc = ([a, b]) => (Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)))) / 4;
  const straight = 2 * (w + h) - (tl[0] + tr[0] + br[0] + bl[0]) - (tl[1] + tr[1] + br[1] + bl[1]);
  return straight + arc(tl) + arc(tr) + arc(br) + arc(bl);
}

const rectAttrs = ({ x, y, w, h }) => `x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}"`;

function shape(box, r, attrs) {
  const d = rrectPath(box, r);
  return d ? `<path d="${d}" ${attrs}/>` : `<rect ${rectAttrs(box)} ${attrs}/>`;
}

const deflate = (b, t, r, bt, l) => ({
  x: b.x + l,
  y: b.y + t,
  w: Math.max(0, b.w - l - r),
  h: Math.max(0, b.h - t - bt),
});
const innerRadii = (r, bw) =>
  r.map(([a, b], k) => {
    const hz = k === 0 || k === 3 ? bw[3].width : bw[1].width;
    const vt = k < 2 ? bw[0].width : bw[2].width;
    return [Math.max(0, a - hz), Math.max(0, b - vt)];
  });

// Chromium's dash gap (StrokeData::SelectBestDashGap): the gap, near the
// nominal one, that lets a whole number of dashes fill the line, so that it
// starts and ends with a dash (a closed outline has as many gaps as dashes).
function selectBestDashGap(length, dash, gap, closed) {
  const available = closed ? length : length + gap;
  const min = Math.floor(available / (dash + gap));
  const max = min + 1;
  const gapFor = (n) => (length - n * dash) / (closed ? n : n - 1);
  const [minGap, maxGap] = [gapFor(min), gapFor(max)];
  return maxGap <= 0 || Math.abs(minGap - gap) < Math.abs(maxGap - gap) ? minGap : maxGap;
}

/**
 * How Chromium dashes a border line `length` long and `width` thick
 * (StrokeData::SetupPaintDashPathEffect): {dash, gap}, or null for a line too
 * short to be dashed, which is drawn solid.
 */
function dashPattern(length, width, dotted, closed) {
  // Dots are squares, and keep their nominal spacing; the line is laid out from its far end.
  if (dotted) return length <= width * 2 ? null : { dash: width, gap: width };
  // A dash is three times the width, and a gap twice, up to a width of 3; wider, two and one.
  const wide = width >= 3;
  let dash = width * (wide ? 2 : 3);
  let gap = width * (wide ? 1 : 2);
  if (length <= dash * 2) return null;
  if (length <= 2 * dash + gap) {
    // Room for two dashes only, scaled to fill it.
    const f = length / (2 * dash + gap);
    dash *= f;
    gap *= f;
    return { dash, gap };
  }
  return { dash, gap: selectBestDashGap(length, dash, gap, closed) };
}

/**
 * The three boxes a background is placed in and clipped to, each as {box, r}
 * (rectangle and corner radii): the border box, the padding box inside the
 * borders and the content box inside the padding.
 */
function backgroundBoxes(st, b, r, bw) {
  const pad = SIDES.map((s) => px(st[`padding-${s}`]));
  const paddingBox = deflate(b, bw[0].width, bw[1].width, bw[2].width, bw[3].width);
  const contentWidths = bw.map((s, k) => ({ width: s.width + pad[k] }));
  return {
    "border-box": { box: b, r },
    "padding-box": { box: paddingBox, r: innerRadii(r, bw) },
    "content-box": {
      box: deflate(paddingBox, pad[0], pad[1], pad[2], pad[3]),
      r: innerRadii(r, contentWidths),
    },
  };
}

// The size a JPEG's frame header (a SOF marker) gives, or null when the segments
// before it cannot be followed.
function jpegSize(b) {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    // Fill bytes, and the markers that have no length: RSTn, TEM.
    if (marker === 0xff) i += 1;
    else if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) i += 2;
    else if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc)
      return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
    else i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

// Natural size of a data: image, or null when it has none (an SVG with only a viewBox).
export function naturalSize(url) {
  const m = /^data:([^;,]+)((?:;[^;,]*)*),(.*)$/s.exec(url);
  if (!m) return null;
  let body;
  try {
    body = /;base64$/i.test(m[2]) ? Buffer.from(m[3].trim(), "base64") : Buffer.from(decodeURIComponent(m[3]));
  } catch {
    // A stray % that is no escape: the text as it stands.
    body = Buffer.from(m[3]);
  }
  // A raster is told by its bytes, not by the type the URL names: the IDE calls a
  // JPEG and a BMP image/png, and a JPEG's header read as a PNG's gives a size
  // 4 million wide by 4 billion tall.
  if (body.length > 26 && body[0] === 0x42 && body[1] === 0x4d && body.readUInt32LE(14) >= 40)
    return { w: Math.abs(body.readInt32LE(18)), h: Math.abs(body.readInt32LE(22)) };
  if (body.length > 24 && body.readUInt32BE(0) === 0x89504e47)
    return { w: body.readUInt32BE(16), h: body.readUInt32BE(20) };
  if (body.length > 10 && body.toString("latin1", 0, 4) === "GIF8")
    return { w: body.readUInt16LE(6), h: body.readUInt16LE(8) };
  if (body.length > 4 && body[0] === 0xff && body[1] === 0xd8) return jpegSize(body);
  if (m[1].startsWith("image/svg")) {
    const root = /<svg\b[^>]*>/.exec(body.toString("utf8"))?.[0] ?? "";
    const a = (n) => new RegExp(`\\s${n}=["']([\\d.]+)(px)?["']`).exec(root)?.[1];
    if (a("width") && a("height")) return { w: Number(a("width")), h: Number(a("height")) };
    const vb = /\sviewBox=["']([^"']*)["']/
      .exec(root)?.[1]
      ?.split(/[\s,]+/)
      .map(Number);
    if (vb) return { w: vb[2], h: vb[3], ratioOnly: true };
  }
  return null;
}

// A CSS filter's steps (colour-filter.mjs filterSteps) as SVG primitives, in the
// sRGB space CSS uses; null for a blur(), which is not drawn.
function filterPrimitives(steps) {
  const prims = [];
  let input = "SourceGraphic";
  let n = 0;
  for (const s of steps) {
    const o = `r${n++}`;
    if (s.fn === "blur") return null;
    if (s.fn === "drop-shadow") {
      const [sh] = parseShadows(s.arg);
      prims.push(
        `<feGaussianBlur in="${input}" stdDeviation="${num(sh.blur / 2)}" result="${o}b"/>` +
          `<feOffset in="${o}b" dx="${num(sh.x)}" dy="${num(sh.y)}" result="${o}c"/>` +
          `<feFlood flood-color="${sh.color}" result="${o}d"/><feComposite in="${o}d" in2="${o}c" operator="in" result="${o}e"/>` +
          `<feMerge result="${o}"><feMergeNode in="${o}e"/><feMergeNode in="${input}"/></feMerge>`,
      );
    } else prims.push(stepPrimitive(s, input, o));
    input = o;
  }
  return prims;
}

// --- the converter -----------------------------------------------------------

/**
 * @param decoded   decodeSnapshot's result
 * @param clip      {x, y, w, h} in page CSS px; the picture's viewBox
 * @param metrics   (fontKey) => {ascent, height, line}: a text fragment's baseline below its top, its
 *                  height, and the height of a line of that font with line-height: normal
 * @param textWidth (fontKey, text) => the width the run is laid out in, or null (text aligned in its box)
 * @param inkGaps   (fontKey, text, top, height) => [[from, to]] the stretches of the run, in CSS px from
 *                  its start, where its ink is in the band (inkBand) an underline skips; null draws
 *                  every underline whole
 * @param placeholderColor  what an empty <input> shows its placeholder in
 * @param canvases  [{x, y, w, h, href}] pictures of the page's <canvas> elements
 * @param fonts     a PictureFonts (fonts.mjs): text is set in subsets of its fonts, embedded
 * @param fontsFor  (fontKey, text) => [{ps} | {family, data}]: the fonts Chromium drew that run with
 * @param background  draw the root background under everything (false for a cut-out)
 * @param overlays  markup of inline <svg>s drawn over everything, in the picture's coordinates
 * @param scrollbars  Map(layout object's key => {custom, parts}): the styles of a scrolling box's
 *                  scrollbar parts (capture.mjs scrollbarParts), by scrollbarPartList's keys; a
 *                  frame's viewport is keyed by viewportScroller's
 * @param svgs      Map(layout object's key => {attrs, style, inner, texts, foreign, dropped}): the
 *                  inline <svg>s of the document that show in the view (inlineSvgsIn), as
 *                  capture.mjs's inlineSvg reads them, or {failed} where it could not; an <svg>
 *                  with no entry is drawn by other means (the annotation layer). null: none was
 *                  read, and each is reported as not drawn
 * @param frames    (document) => what was measured in that frame's own document, {metrics, textWidth,
 *                  inkGaps, placeholderColor, canvases, fontsFor, scrollbars, svgs}, as the parameters
 *                  of the same names (the page's own are the defaults) and {inner}, the frame's viewport
 *                  {w, h}; null or no function: the frame is drawn with the page's own. The frame
 *                  is measured in its own document because a font name and a style rule mean what
 *                  that document says
 */
export function renderSvg(
  decoded,
  {
    clip,
    metrics,
    textWidth = null,
    inkGaps = null,
    placeholderColor = "rgb(117, 117, 117)",
    canvases = [],
    fonts = null,
    fontsFor = null,
    background = true,
    overlays = [],
    scrollbars = null,
    svgs = null,
    frames = null,
  },
) {
  // What was measured in the document being painted: the page's, and in a frame its own.
  const pageEnv = { metrics, textWidth, inkGaps, placeholderColor, canvases, fontsFor, scrollbars, svgs, inner: null };
  let env = pageEnv;
  const defs = [];
  const ids = new Map();
  const def = (key, make) => {
    if (!ids.has(key)) {
      const id = `d${ids.size}`;
      ids.set(key, id);
      defs.push(make(id));
    }
    return ids.get(key);
  };
  const stats = { boxes: 0, texts: 0, images: 0, canvases: 0, svgs: 0, frames: 0, unsupported: {} };
  const note = (what) => {
    stats.unsupported[what] = (stats.unsupported[what] ?? 0) + 1;
  };

  // The root element's overflow, or the <body>'s where the root's is visible, is
  // the viewport's: it scrolls the document and clips nothing of the element.
  const toViewport = (n) =>
    n.name === "HTML" ||
    (n.name === "BODY" &&
      n.parent?.name === "HTML" &&
      (n.parent.style?.["overflow-x"] ?? "visible") === "visible" &&
      (n.parent.style?.["overflow-y"] ?? "visible") === "visible");

  // The overflow clip an element's descendants are painted under, memoised.
  const descClip = new Map();
  const ownClip = new Map();
  const isCB = (n, fixed) => {
    const st = n.style;
    if (!st) return false;
    if (st.transform !== "none" || st.filter !== "none") return true;
    return !fixed && st.position !== "static";
  };
  function clipOf(n) {
    if (ownClip.has(n)) return ownClip.get(n);
    const st = n.style;
    let base = INF;
    const pos = st?.position;
    if (pos === "fixed" || pos === "absolute") {
      let cb = n.parent;
      while (cb && !isCB(cb, pos === "fixed")) cb = cb.parent;
      base = cb ? clipForDescendants(cb) : INF;
    } else if (n.parent) base = clipForDescendants(n.parent);
    ownClip.set(n, base);
    return base;
  }
  function clipForDescendants(n) {
    if (descClip.has(n)) return descClip.get(n);
    let c = clipOf(n);
    const st = n.style;
    if (st && n.box && !toViewport(n) && (st["overflow-x"] !== "visible" || st["overflow-y"] !== "visible")) {
      const b = n.box.bounds;
      const bw = borders(st);
      // The scrollbars are outside the clip: the vertical one on the right, the horizontal at the bottom.
      const g = gutters(n.box);
      const pad = deflate(b, bw[0].width, bw[1].width + g.v, bw[2].width + g.h, bw[3].width);
      const r = {
        x: st["overflow-x"] === "visible" ? INF.x : pad.x,
        w: st["overflow-x"] === "visible" ? INF.w : pad.w,
        y: st["overflow-y"] === "visible" ? INF.y : pad.y,
        h: st["overflow-y"] === "visible" ? INF.h : pad.h,
      };
      c = intersect(c, r);
    }
    descClip.set(n, c);
    return c;
  }

  // Elements hidden as a whole: clip-path: inset(50%) is the visually-hidden idiom.
  const hiddenMemo = new Map();
  function hidden(n) {
    if (!n) return false;
    if (hiddenMemo.has(n)) return hiddenMemo.get(n);
    const st = n.style;
    const own = st ? st["clip-path"] === "inset(50%)" || (st.opacity !== undefined && px(st.opacity) === 0) : false;
    const h = own || hidden(n.parent);
    hiddenMemo.set(n, h);
    return h;
  }

  // A real <filter> of a CSS filter's steps, keyed by what they are.
  const filterDef = (steps) => {
    const prims = filterPrimitives(steps);
    const drop = steps.some((s) => s.fn === "drop-shadow");
    const region = drop ? 'x="-30%" y="-30%" width="160%" height="160%"' : "";
    return def(
      `f${steps.map((s) => `${s.fn}(${s.arg})`).join(" ")}`,
      (id) => `<filter id="${id}" color-interpolation-filters="sRGB" ${region}>${prims.join("")}</filter>`,
    );
  };

  // The effects an element passes to everything it paints: opacity and filter.
  // A filter of colour functions alone carries `bake` ({key, steps, opacity}):
  // the paint loop maps the colours of what it paints instead, where it can
  // (colour-filter.mjs), and opens `open()` where it cannot.
  function chain(n) {
    const out = [];
    for (let a = n; a; a = a.parent) {
      const st = a.style;
      if (!st || !a.box) continue;
      if (st.opacity !== undefined && px(st.opacity) < 1)
        out.push({ key: `o${a.i}`, open: `<g opacity="${num(px(st.opacity))}">` });
      if (st.filter && st.filter !== "none") {
        const steps = filterSteps(st.filter);
        if (!steps || steps.some((s) => s.fn === "blur")) {
          note(`filter ${st.filter}`);
          continue;
        }
        const open = () => `<g filter="url(#${filterDef(steps)})">`;
        // A drop-shadow last, after colour functions alone: its shadow under the group, drawn
        // from a copy of it, and the group itself over the shadow with no filter.
        const last = steps.at(-1);
        const shadow =
          last?.fn === "drop-shadow" && bakeable(steps.slice(0, -1)) && stepsOpacity(steps) === 1 ? last : null;
        const colours = shadow ? steps.slice(0, -1) : steps;
        out.push(
          bakeable(colours)
            ? {
                key: `f${a.i}`,
                i: a.i,
                open,
                bake: { key: st.filter, steps: colourSteps(colours), opacity: stepsOpacity(colours), shadow },
              }
            : { key: `f${a.i}`, open: open() },
        );
      }
    }
    return out.reverse();
  }

  // A drop-shadow's shadow alone: the group's alpha blurred, moved and filled with
  // its colour. An outer colour filter maps that colour (bakeMarkup bakes the def).
  const shadowDef = (step) => {
    const [sh] = parseShadows(step.arg);
    return def(
      `s${step.arg}`,
      (id) =>
        `<filter id="${id}" color-interpolation-filters="sRGB" x="-30%" y="-30%" width="160%" height="160%">` +
        `<feGaussianBlur in="SourceAlpha" stdDeviation="${num(sh.blur / 2)}" result="b"/>` +
        `<feOffset in="b" dx="${num(sh.x)}" dy="${num(sh.y)}" result="o"/>` +
        `<feFlood flood-color="${sh.color}"/><feComposite in2="o" operator="in"/></filter>`,
    );
  };

  // The transforms an element and its ancestors paint it under, outermost first: those whose
  // linear part is not the identity (a translation is in the snapshot's boxes already). Each
  // ancestor's own box is put back through the transforms outside it before its own is read.
  const transformMemo = new Map();
  function transformsOf(n) {
    if (!n) return [];
    if (transformMemo.has(n)) return transformMemo.get(n);
    const outer = transformsOf(n.parent);
    const m = n.box ? parseMatrix(n.style?.transform) : null;
    let ts = outer;
    if (m && (m[0] !== 1 || m[1] !== 0 || m[2] !== 0 || m[3] !== 1)) {
      const bounds = outer.reduceRight((r, t) => untransformBox(r, t.m), n.box.bounds);
      const size = n.box.offset ?? { w: bounds.w, h: bounds.h };
      const origin = /^(-?[\d.]+)px (-?[\d.]+)px/.exec(n.style["transform-origin"] ?? "");
      const t = elementTransform(bounds, size, m, origin ? [Number(origin[1]), Number(origin[2])] : null);
      ts = [...outer, { node: n, ...t }];
    }
    transformMemo.set(n, ts);
    return ts;
  }

  // A layout object's boxes put back through `ts`, innermost first; the box of the element
  // whose transform is the innermost (`own`) is that transform's own box.
  function untransformLayout(l, ts, own) {
    const back = (r) => (r ? ts.reduceRight((q, t) => untransformBox(q, t.m), r) : r);
    const last = ts.at(-1);
    const bounds = own && last.node === own ? last.box : back(l.bounds);
    const exact = own && last.node === own ? last.box : back(l.exact);
    return { ...l, bounds, exact, boxes: l.boxes?.map(back) };
  }

  // What bakeMarkup needs of the converter.
  const defIndex = (id) => (/^d\d+$/.test(id) ? Number(id.slice(1)) : -1);
  const bakeCtx = {
    defOf: (id) => defs[defIndex(id)],
    def,
    cssOf: (cls) => [...textClasses].find(([, c]) => c === cls)?.[0],
    classFor: (css) => {
      if (!textClasses.has(css)) textClasses.set(css, `t${textClasses.size}`);
      return textClasses.get(css);
    },
    filterFor: (steps) => filterDef(steps),
    wrappers: new Set(),
    note,
  };

  // An item's groups, with its filters of colour functions baked into `content`
  // (innermost first, as they apply) and their opacity() as group opacity. A
  // group that blends, or holds a real filter group, keeps its filters real:
  // neither commutes with a colour map.
  function applyChain(want, content) {
    if (!want.some((g) => g.bake)) return { want, content };
    const real = content.some((s) => s.includes("blend-mode") || s.includes("<g filter="));
    if (real) return { want: want.map((g) => (g.bake ? { key: g.key, open: g.open() } : g)), content };
    let baked = content;
    for (const g of [...want].reverse()) if (g.bake) baked = baked.map((s) => bakeMarkup(s, g.bake, bakeCtx));
    // A drop-shadow stays a group, a plain one: closeGroup draws its shadow under what it holds,
    // in the colour the filters outside it map the shadow's colour to.
    const groups = want.flatMap((g, k) => {
      if (!g.bake) return [g];
      if (g.bake.shadow) {
        const outer = want.slice(0, k).flatMap((o) => (o.bake ? [o.bake] : []));
        return [{ key: g.key, open: "<g>", shadow: g.bake.shadow, outer: outer.reverse() }];
      }
      return g.bake.opacity < 1 ? [{ key: `p${g.i}`, open: `<g opacity="${num(g.bake.opacity)}">` }] : [];
    });
    return { want: groups, content: baked };
  }

  // The end of a group in `body`. A drop-shadow's group gets, under what it holds, a copy of
  // it drawn through a filter that paints the shadow alone: the union of what the element
  // paints is shadowed once, as the filter's own merge does.
  function closeGroup(body, g) {
    if (g.shadow) {
      const inner = body.splice(g.start);
      let open = `<g filter="url(#${shadowDef(g.shadow)})">`;
      for (const b of g.outer) open = bakeMarkup(open, b, bakeCtx);
      body.push(open, ...inner, "</g>", ...inner);
    }
    body.push("</g>");
  }

  // Inside an inline <svg>: its elements' names are lower case, HTML's upper.
  const svgMemo = new Map();
  const inSvg = (n) => {
    if (!n) return false;
    if (!svgMemo.has(n)) svgMemo.set(n, n.name === "svg" || inSvg(n.parent));
    return svgMemo.get(n);
  };

  const textClasses = new Map();
  // `face` is the run's CSS in the picture's own faces (PictureFonts.css), or
  // null to name the computed font-family instead.
  const textClass = (st, face) => {
    const fill =
      st["-webkit-text-fill-color"] && st["-webkit-text-fill-color"] !== st.color
        ? st["-webkit-text-fill-color"]
        : st.color;
    const css = face
      ? `${face};font-size:${st["font-size"]};fill:${fill}`
      : `font-family:${st["font-family"]};font-size:${st["font-size"]};font-weight:${st["font-weight"]}` +
        `${st["font-style"] === "normal" ? "" : `;font-style:${st["font-style"]}`};fill:${fill}`;
    if (!textClasses.has(css)) textClasses.set(css, `t${textClasses.size}`);
    return textClasses.get(css);
  };

  const imageDef = (url) =>
    def(
      `i${url}`,
      (id) => `<image id="${id}" width="1" height="1" preserveAspectRatio="none" href="${esc(compactImage(url))}"/>`,
    );

  function paintBox(l) {
    const st = l.style;
    const b = l.bounds;
    const out = [];
    if (st.visibility !== "visible" || b.w <= 0 || b.h <= 0) return out;
    const r = radii(st, b.w, b.h);
    const bw = borders(st);
    const shadows = parseShadows(st["box-shadow"]);
    for (const s of [...shadows].reverse()) {
      if (s.inset || transparent(s.color)) continue;
      const sb = { x: b.x + s.x - s.spread, y: b.y + s.y - s.spread, w: b.w + 2 * s.spread, h: b.h + 2 * s.spread };
      let attrs = `fill="${s.color}"`;
      if (s.blur > 0) {
        const m = s.blur * 1.5;
        const id = def(
          `b${s.blur}|${sb.x}|${sb.y}|${sb.w}|${sb.h}`,
          (id) =>
            `<filter id="${id}" filterUnits="userSpaceOnUse" x="${num(sb.x - m)}" y="${num(sb.y - m)}" width="${num(sb.w + 2 * m)}" height="${num(sb.h + 2 * m)}"><feGaussianBlur stdDeviation="${num(s.blur / 2)}"/></filter>`,
        );
        attrs += ` filter="url(#${id})"`;
      }
      out.push(shape(sb, r, attrs));
    }
    const ground = [];
    if (!transparent(st["background-color"])) {
      // The colour fills the last layer's clip box.
      const under = backgroundBoxes(st, b, r, bw)[splitTop(st["background-clip"] ?? "border-box").at(-1)];
      ground.push(shape(under?.box ?? b, under?.r ?? r, `fill="${st["background-color"]}"`));
    }
    const bg = st["background-image"];
    if (bg && bg !== "none") ground.push(...paintBackgroundImages(l, r, bw));
    // A layer with a blend mode blends with the layers under it, not with the page.
    if (ground.length && splitTop(st["background-blend-mode"] || "normal").some((m) => m !== "normal"))
      out.push(`<g style="isolation:isolate">${ground.join("")}</g>`);
    else out.push(...ground);
    for (const s of shadows) {
      if (!s.inset || transparent(s.color)) continue;
      const pad = deflate(b, bw[0].width, bw[1].width, bw[2].width, bw[3].width);
      const hole = deflate({ ...pad, x: pad.x + s.x, y: pad.y + s.y }, s.spread, s.spread, s.spread, s.spread);
      if (s.blur > 0) note("inset shadow blur");
      const id = def(
        `c${pad.x}|${pad.y}|${pad.w}|${pad.h}`,
        (id) => `<clipPath id="${id}"><rect ${rectAttrs(pad)}/></clipPath>`,
      );
      out.push(
        `<path clip-path="url(#${id})" fill-rule="evenodd" fill="${s.color}" d="M${num(pad.x)} ${num(pad.y)}h${num(pad.w)}v${num(pad.h)}h${num(-pad.w)}Z` +
          `M${num(hole.x)} ${num(hole.y)}h${num(hole.w)}v${num(hole.h)}h${num(-hole.w)}Z"/>`,
      );
    }
    if (bw.some((s) => s.width > 0)) {
      // A collapsed table border is shared between two cells, and drawn here by each.
      if ((l.node.name === "TD" || l.node.name === "TH") && st["border-collapse"] === "collapse")
        note("collapsed table border");
      out.push(...paintBorders(b, r, bw));
    }
    if (l.node.name === "CANVAS") {
      const c = env.canvases.find(
        (c) => Math.abs(c.x - b.x) < 0.5 && Math.abs(c.y - b.y) < 0.5 && Math.abs(c.w - b.w) < 0.5,
      );
      if (c) {
        const id = imageDef(c.href);
        out.push(`<use href="#${id}" transform="translate(${num(b.x)} ${num(b.y)}) scale(${num(b.w)} ${num(b.h)})"/>`);
        stats.canvases++;
      } else note("canvas without a picture");
    }
    if (l.node.name === "IMG" && l.node.src) {
      const id = imageDef(l.node.src);
      out.push(`<use href="#${id}" transform="translate(${num(b.x)} ${num(b.y)}) scale(${num(b.w)} ${num(b.h)})"/>`);
      stats.images++;
    }
    if (l.node.name === "svg") out.push(...paintInlineSvg(l, bw));
    if (l.node.name === "SELECT") out.push(...paintSelect(l, bw));
    else if (l.node.name === "INPUT" && CHECKABLE_INPUTS.has(l.node.attrs.type?.toLowerCase())) {
      if (st.appearance !== "none") out.push(...paintCheckable(l));
    } else if (l.node.name === "INPUT" || l.node.name === "TEXTAREA") out.push(...paintTextControl(l, bw));
    if (st["outline-style"] === "auto" && px(st["outline-width"]) > 0) out.push(...paintFocusRing(st, b, r, bw));
    else if (st["outline-style"] !== "none" && px(st["outline-width"]) > 0) {
      const w = px(st["outline-width"]);
      const o = px(st["outline-offset"]) + w / 2;
      out.push(
        `<rect ${rectAttrs({ x: b.x - o, y: b.y - o, w: b.w + 2 * o, h: b.h + 2 * o })} fill="none" stroke="${st["outline-color"]}" stroke-width="${num(w)}"/>`,
      );
    }
    stats.boxes++;
    return out;
  }

  // An inline <svg> as a replaced element: its content, which the page was asked to
  // read (`svgs`), is a nested <svg> in the element's content box (the border box
  // less border and padding, as the snapshot snaps it, which is where Chromium
  // puts the content too), and scales its viewBox into it. Each svg's ids have a
  // prefix of its own, its images are compacted, and each run of its text is set in
  // the picture's faces.
  let svgCount = 0;
  const unescaped = (s) => s.replace(/&(amp|lt|gt|quot);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"' })[e]);
  function paintInlineSvg(l, bw) {
    if (!env.svgs) {
      note("an inline svg");
      return [];
    }
    const got = env.svgs.get(l.key);
    // No entry: the annotation layer, drawn over everything.
    if (!got) return [];
    if (got.failed) {
      note("an inline svg that could not be read");
      return [];
    }
    if (got.foreign) for (let i = 0; i < got.foreign; i++) note("foreignObject in an inline svg");
    if (got.dropped)
      for (let i = 0; i < got.dropped; i++) note("an image or file in an inline svg that cannot be embedded");
    const st = l.style;
    const pad = SIDES.map((s) => px(st[`padding-${s}`]));
    const box = deflate(
      l.bounds,
      bw[0].width + pad[0],
      bw[1].width + pad[1],
      bw[2].width + pad[2],
      bw[3].width + pad[3],
    );
    if (box.w <= 0 || box.h <= 0) return [];
    const inner = got.inner.replace(/--tbk:\s*(\d+);?/g, (_, k) => {
      const { key, text } = got.texts[Number(k)];
      const [style, weight] = JSON.parse(key);
      stats.texts++;
      const sources = fonts && env.fontsFor ? env.fontsFor(key, text) : null;
      const face = sources?.length ? fonts.css(text, sources, weight, style) : null;
      if (!face) note("text in an unembedded font");
      // Into a style="..." attribute: the face names' quotes must not end it.
      return face ? `${face.replace(/"/g, "'")};` : "";
    });
    const attr = (name, value) => (value ? ` ${name}="${esc(value)}"` : "");
    // The element's own style names ids too (fill: url(#grad)), so the prefix goes on the whole.
    const drawn =
      `<svg ${rectAttrs(box)}${attr("viewBox", got.attrs.viewBox)}${attr("preserveAspectRatio", got.attrs.preserveAspectRatio)}` +
      `${attr("overflow", got.attrs.overflow)}${attr("style", got.style)}>${inner}</svg>`;
    stats.svgs++;
    return [
      scopeIds(drawn, `v${svgCount++}-`).replace(/<[^>]*>/g, (tag) =>
        tag.replace(/(\shref=")(data:[^"]*)"/, (_, head, url) => {
          stats.images++;
          return `${head}${esc(compactImage(unescaped(url)))}"`;
        }),
      ),
    ];
  }

  // The focus ring of outline-style: auto, as Chromium draws it whatever the
  // outline's width: two bands round a path, an inner one 2px wide in the
  // outline colour, centred on the path, and an outer one 1px wide in white
  // against it. The path is the border box moved out by the outline offset, and
  // in by the width of the border, up to 1px a side (so a control's own 1px border
  // lies under the inner band, and a box with none has the ring astride its
  // edge); a corner's radius moves with the path. Fitted against Edge by
  // bench/outline.html.
  function paintFocusRing(st, b, r, bw) {
    const sides = bw.map((s) => px(st["outline-offset"]) - Math.min(1, s.width));
    const mean = sides.reduce((sum, v) => sum + v, 0) / 4;
    // The path moved out by `d` more: its box, and its radii (a square corner stays square).
    const band = (d) => {
      const [t, rt, bt, lt] = sides.map((v) => v + d);
      const box = { x: b.x - lt, y: b.y - t, w: Math.max(0, b.w + lt + rt), h: Math.max(0, b.h + t + bt) };
      const radii = r.map(([rx, ry]) =>
        rx > 0 && ry > 0 ? [Math.max(0, rx + mean + d), Math.max(0, ry + mean + d)] : [0, 0],
      );
      return rrectPath(box, radii) ?? `M${num(box.x)} ${num(box.y)}h${num(box.w)}v${num(box.h)}h${num(-box.w)}Z`;
    };
    return [
      `<path fill-rule="evenodd" fill="#fff" d="${band(2)}${band(1)}"/>`,
      `<path fill-rule="evenodd" fill="${st["outline-color"]}" d="${band(1)}${band(-1)}"/>`,
    ];
  }

  function paintBorders(b, r, bw) {
    const uniform = bw.every(
      (s) => s.width === 0 || (s.color === bw.find((t) => t.width > 0).color && s.style === "solid"),
    );
    if (uniform) {
      const color = bw.find((s) => s.width > 0).color;
      if (transparent(color)) return [];
      const inner = deflate(b, bw[0].width, bw[1].width, bw[2].width, bw[3].width);
      const outerD = rrectPath(b, r) ?? `M${num(b.x)} ${num(b.y)}h${num(b.w)}v${num(b.h)}h${num(-b.w)}Z`;
      const innerD =
        rrectPath(inner, innerRadii(r, bw)) ??
        `M${num(inner.x)} ${num(inner.y)}h${num(inner.w)}v${num(inner.h)}h${num(-inner.w)}Z`;
      return [`<path fill-rule="evenodd" fill="${color}" d="${outerD}${innerD}"/>`];
    }
    // Sides of different colours: a trapezoid each, with the radius dropped.
    const [t, rt, bt, lt] = bw.map((s) => s.width);
    const X0 = b.x;
    const Y0 = b.y;
    const X1 = b.x + b.w;
    const Y1 = b.y + b.h;
    const quads = [
      [X0, Y0, X1, Y0, X1 - rt, Y0 + t, X0 + lt, Y0 + t],
      [X1, Y0, X1, Y1, X1 - rt, Y1 - bt, X1 - rt, Y0 + t],
      [X1, Y1, X0, Y1, X0 + lt, Y1 - bt, X1 - rt, Y1 - bt],
      [X0, Y1, X0, Y0, X0 + lt, Y0 + t, X0 + lt, Y1 - bt],
    ];
    if (bw.some((s) => s.width > 0 && !["solid", "dashed", "dotted"].includes(s.style))) note("border style");
    const out = [];
    const rounded = r.some(([a, c]) => a > 0 || c > 0);
    const dashed = (s) => s.width > 0 && (s.style === "dashed" || s.style === "dotted") && !transparent(s.color);
    // Four dashed sides alike are one outline; Chromium strokes the whole path.
    const one =
      rounded &&
      bw.every((s) => dashed(s) && s.width === bw[0].width && s.color === bw[0].color && s.style === bw[0].style);
    for (const [k, s] of bw.entries()) {
      if (s.width <= 0 || transparent(s.color)) continue;
      if (dashed(s)) {
        if (one && k > 0) continue;
        // A side is cut at the corner by the diagonal unless both neighbours have its colour.
        const matches = [3, 1].every((d) => {
          const n = bw[(k + d) % 4];
          return n.width > 0 && n.color === s.color;
        });
        const clip =
          matches || one
            ? ""
            : ` clip-path="url(#${def(`k${quads[k].join("|")}`, (id) => `<clipPath id="${id}"><polygon points="${quads[k].map(num).join(" ")}"/></clipPath>`)})"`;
        out.push(rounded ? dashedRounded(b, r, bw, s, clip) : dashedSide(b, k, s, bw, clip));
      } else out.push(`<polygon points="${quads[k].map(num).join(" ")}" fill="${s.color}"/>`);
    }
    return out;
  }

  // The stroke attributes of a dashed or dotted line `length` long.
  function dashStroke(length, s, closed) {
    const pattern = dashPattern(length, s.width, s.style === "dotted", closed);
    const dash = pattern ? ` stroke-dasharray="${num(pattern.dash)} ${num(pattern.gap)}"` : "";
    return `fill="none" stroke="${s.color}" stroke-width="${num(s.width)}"${dash}`;
  }

  // A dashed or dotted side as Chromium draws it with no rounded corner
  // (GraphicsContext::DrawLine): a line of the border's width down the middle
  // of the strip, along the whole side corner to corner, so that it starts and
  // ends with a dash. A dotted line is laid out from its far end, so a dot
  // always ends at the corner, and the squares at its two ends are filled
  // whatever the pattern does.
  function dashedSide(b, k, s, bw, clip) {
    const w = s.width;
    const [t, rt, bt, lt] = bw.map((x) => x.width);
    const x2 = b.x + b.w;
    const y2 = b.y + b.h;
    const [from, to, ends] = [
      [
        [b.x, b.y + t / 2],
        [x2, b.y + t / 2],
        [
          [b.x, b.y],
          [x2 - w, b.y],
        ],
      ],
      [
        [x2 - rt / 2, b.y],
        [x2 - rt / 2, y2],
        [
          [x2 - rt, b.y],
          [x2 - rt, y2 - w],
        ],
      ],
      [
        [b.x, y2 - bt / 2],
        [x2, y2 - bt / 2],
        [
          [b.x, y2 - bt],
          [x2 - w, y2 - bt],
        ],
      ],
      [
        [b.x + lt / 2, b.y],
        [b.x + lt / 2, y2],
        [
          [b.x, b.y],
          [b.x, y2 - w],
        ],
      ],
    ][k];
    const dotted = s.style === "dotted";
    const [a, c] = dotted ? [to, from] : [from, to];
    const d = `M${num(a[0])} ${num(a[1])}${k % 2 ? "V" : "H"}${num(c[k % 2 ? 1 : 0])}`;
    const out = [`<path d="${d}" ${dashStroke(k % 2 ? b.h : b.w, s, false)}${clip}/>`];
    if (dotted)
      for (const [x, y] of ends)
        out.push(`<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(w)}" fill="${s.color}"${clip}/>`);
    return out.join("");
  }

  // With a rounded corner Chromium strokes the border's whole outline, a closed
  // path starting at the top edge's left end, whose dashes are fitted to its
  // length, and shows the part that lies in the side's mitred strip.
  function dashedRounded(b, r, bw, s, clip) {
    const half = bw.map((x) => ({ width: x.width / 2 }));
    const box = deflate(b, half[0].width, half[1].width, half[2].width, half[3].width);
    const radii = innerRadii(r, half);
    const d = rrectPath(box, radii) ?? `M${num(box.x)} ${num(box.y)}h${num(box.w)}v${num(box.h)}h${num(-box.w)}Z`;
    return `<path d="${d}" ${dashStroke(rrectLength(box, radii), s, true)}${clip}/>`;
  }

  function paintBackgroundImages(l, r, bw) {
    const st = l.style;
    const b = l.bounds;
    const boxes = backgroundBoxes(st, b, r, bw);
    const layers = splitTop(st["background-image"]);
    const sizes = splitTop(st["background-size"] ?? "auto");
    const positions = splitTop(st["background-position"] ?? "0% 0%");
    const repeats = splitTop(st["background-repeat"] ?? "repeat");
    const origins = splitTop(st["background-origin"] ?? "padding-box");
    const clips = splitTop(st["background-clip"] ?? "border-box");
    const blends = splitTop(st["background-blend-mode"] || "normal");
    const out = [];
    for (let k = layers.length - 1; k >= 0; k--) {
      const one = [];
      backgroundLayer(k, one);
      const mode = blends[k % blends.length];
      if (one.length)
        out.push(mode === "normal" ? one.join("") : `<g style="mix-blend-mode:${mode}">${one.join("")}</g>`);
    }
    return out;

    function backgroundLayer(k, out) {
      const m = /^url\("?(.*?)"?\)$/s.exec(layers[k]);
      const gradient = m ? null : parseGradient(layers[k]);
      if (!m && !gradient) {
        note(`background ${layers[k].slice(0, 16)}`);
        return;
      }
      // Where the image is placed (the origin box) and where it shows (the clip box).
      const area = (boxes[origins[k % origins.length]] ?? boxes["padding-box"]).box;
      const { box: cb, r: cr } = boxes[clips[k % clips.length]] ?? boxes["border-box"];
      if (cb.w <= 0 || cb.h <= 0) return;
      const url = m ? m[1].replace(/\\"/g, '"') : null;
      const nat = url ? naturalSize(url) : null;
      const [sw = "auto", sh = "auto"] = (sizes[k % sizes.length] ?? "auto").split(/\s+/);
      let w;
      let h;
      if (sw === "contain" || sw === "cover") {
        // A gradient has no ratio: it fills the area whatever the keyword.
        const ratio = gradient ? null : nat ? nat.w / nat.h : 1;
        const fit = sw === "contain" ? Math.min : Math.max;
        const s = ratio ? fit(area.w / ratio, area.h) : area.h;
        h = s;
        w = ratio ? s * ratio : area.w;
      } else {
        const len = (v, ref) => (v === "auto" ? null : v.endsWith("%") ? (px(v) / 100) * ref : px(v));
        w = len(sw, area.w);
        h = len(sh, area.h);
        const ratio = nat ? nat.w / nat.h : null;
        if (w === null && h === null) {
          w = nat && !nat.ratioOnly ? nat.w : area.w;
          h = nat && !nat.ratioOnly ? nat.h : area.h;
        } else if (w === null) w = ratio ? h * ratio : area.w;
        else if (h === null) h = ratio ? w / ratio : area.h;
      }
      const [pxs = "0%", pys = "0%"] = (positions[k % positions.length] ?? "0% 0%").split(/\s+/);
      const pos = (v, free) => {
        if (v.endsWith("%")) return (px(v) / 100) * free;
        const c = /^calc\(([-\d.]+)%\s*([+-])\s*([\d.]+)px\)$/.exec(v);
        if (c) return (Number(c[1]) / 100) * free + (c[2] === "-" ? -1 : 1) * Number(c[3]);
        return px(v);
      };
      const x0 = area.x + pos(pxs, area.w - w);
      const y0 = area.y + pos(pys, area.h - h);
      const rep = repeats[k % repeats.length] ?? "repeat";
      const rx = rep === "repeat" || rep === "repeat-x";
      const ry = rep === "repeat" || rep === "repeat-y";
      // The element that paints one tile at (x, y): the image or the gradient's rectangle.
      let tile;
      if (gradient) {
        const g = gradientSvg(gradient, w, h);
        if (!g) {
          note(`background ${layers[k].slice(0, 16)}`);
          return;
        }
        const gid = def(g.key, g.make);
        const rid = def(
          `r${g.key}`,
          (id) => `<rect id="${id}" width="${num(w)}" height="${num(h)}" fill="url(#${gid})"/>`,
        );
        tile = (x, y) => `<use href="#${rid}" transform="translate(${num(x)} ${num(y)})"/>`;
      } else {
        const id = imageDef(url);
        tile = (x, y) => `<use href="#${id}" transform="translate(${num(x)} ${num(y)}) scale(${num(w)} ${num(h)})"/>`;
      }
      // The first tile that reaches the box, and how many it takes to cover it.
      const startOf = (v0, size, lo) => v0 - Math.ceil((v0 - lo) / size) * size;
      const xStart = rx && w > 0 ? startOf(x0, w, cb.x) : x0;
      const yStart = ry && h > 0 ? startOf(y0, h, cb.y) : y0;
      const nx = rx && w > 0 ? Math.max(1, Math.ceil((cb.x + cb.w - xStart) / w)) : 1;
      const ny = ry && h > 0 ? Math.max(1, Math.ceil((cb.y + cb.h - yStart) / h)) : 1;
      const clipId = () => {
        const d = rrectPath(cb, cr);
        return def(`k${d ?? `${cb.x}|${cb.y}|${cb.w}|${cb.h}`}`, (id) =>
          d
            ? `<clipPath id="${id}"><path d="${d}"/></clipPath>`
            : `<clipPath id="${id}"><rect ${rectAttrs(cb)}/></clipPath>`,
        );
      };
      if (nx * ny > 400) {
        // Too many tiles to list: a <pattern> repeats one across the run of tiles.
        const run = {
          x: rx ? cb.x : x0,
          y: ry ? cb.y : y0,
          w: rx ? cb.w : w,
          h: ry ? cb.h : h,
        };
        const pid = def(
          `p${num(w)}|${num(h)}|${num(xStart)}|${num(yStart)}|${tile(0, 0)}`,
          (id) =>
            `<pattern id="${id}" patternUnits="userSpaceOnUse" x="${num(xStart)}" y="${num(yStart)}" width="${num(w)}" height="${num(h)}">${tile(0, 0)}</pattern>`,
        );
        out.push(`<g clip-path="url(#${clipId()})"><rect ${rectAttrs(run)} fill="url(#${pid})"/></g>`);
        stats.images++;
        return;
      }
      const uses = [];
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) uses.push(tile(xStart + i * w, yStart + j * h));
      const spills =
        xStart < cb.x || yStart < cb.y || xStart + nx * w > cb.x + cb.w + 0.01 || yStart + ny * h > cb.y + cb.h + 0.01;
      if (spills) out.push(`<g clip-path="url(#${clipId()})">${uses.join("")}</g>`);
      else out.push(...uses);
      stats.images++;
    }
  }

  // A closed drop-down list draws its selected option and its arrow outside the
  // DOM. The text is set in the content box less Chromium's internal padding
  // (LayoutThemeDefault::PopupInternalPadding*): 4px at the start, and at the
  // end the 16px box the arrow is drawn in; it is centred vertically, aligned
  // by text-align-last, else text-align, and cut at the ends of that box. The
  // arrow is a chevron 8px wide and 4px tall in the text colour, stroked 2px
  // wide, centred in a 16px box at the right edge of the padding box whatever
  // the padding, its top 2px above the box's middle rounded down
  // (ThemePainterDefault::SetupMenuListArrow, NativeThemeBase::PaintMenuList);
  // fitted against Chromium's own arrow by scripts/svgshot/bench.mjs's page.
  function paintSelect(l, bw) {
    const st = l.style;
    const b = l.bounds;
    const out = [];
    const right = b.x + b.w - Math.floor(bw[1].width);
    const arrowBox = 16;
    const label = selectLabel(l.node);
    if (label) {
      const key = fontKey(st);
      const m = env.metrics(key);
      const e = l.exact ?? b;
      const x = e.x + bw[3].width + px(st["padding-left"]) + 4;
      const end = e.x + e.w - bw[1].width - px(st["padding-right"]) - arrowBox;
      const last = st["text-align-last"] ?? "auto";
      const align = last === "auto" ? (st["text-align"] ?? "start") : last;
      const w = env.textWidth?.(key, label) ?? null;
      let tx = x;
      if (w !== null && align.endsWith("center")) tx = x + (end - x - w) / 2;
      else if (w !== null && (align.endsWith("right") || align === "end")) tx = end - w;
      const top = b.y + (b.h - m.height) / 2;
      // A label too long is cut where the arrow's box begins (LayoutMenuList::ControlClipRect).
      const cut = { x, y: b.y, w: end - x, h: b.h };
      const id = def(
        `s${cut.x}|${cut.y}|${cut.w}|${cut.h}`,
        (id) => `<clipPath id="${id}"><rect ${rectAttrs(cut)}/></clipPath>`,
      );
      out.push(`<g clip-path="url(#${id})">${textRun(st, label, tx, top + m.ascent, w)}</g>`);
    }
    const cx = right - arrowBox / 2;
    const top = b.y + Math.floor(b.h / 2) - 2;
    out.push(
      `<path d="M${num(cx - 4)} ${num(top)}L${num(cx)} ${num(top + 4)}L${num(cx + 4)} ${num(top)}" fill="none" stroke="${st.color}" stroke-width="2"/>`,
    );
    return out;
  }

  const noNative = () => {
    note("native scrollbar");
    return [];
  };

  // The scrollbars Chromium draws where a page styles none, Windows' own (Fluent)
  // ones: a bar 15px thick whose track is the full bar; an arrow, a triangle 9.5px
  // wide and 4.75 high, near each end; and a thumb 9px wide with round ends, as
  // long as the share of the content in view makes of the track (the bar less 18px
  // at each end, and at least 17px), at the place the scroll offset gives. The
  // arrows are the thumb's colour, and an arrow is drawn whether or not there is
  // anything to scroll. The colours are scrollbar-color's, else those of the
  // colour scheme in use. The far arrow is not the near one mirrored: it lies 1px
  // nearer the middle, and the arrows of a bar along the page lie 1px nearer
  // its end than a bar down the page's. Fitted against Edge by
  // bench/scrollbars-native.html. The thinner scrollbar (scrollbar-width: thin)
  // is not drawn.
  function paintNativeScrollbars(l, g, pad, std) {
    if (std.width !== "auto" || (g.v && g.v !== 15) || (g.h && g.h !== 15)) return noNative();
    const scheme = NATIVE_COLOURS[std.dark ? "dark" : "light"];
    const [thumb, track] = std.color === "auto" ? [scheme.thumb, scheme.track] : splitTop(std.color, " ");
    const out = [];
    for (const o of ["v", "h"]) {
      if (!g[o]) continue;
      const vert = o === "v";
      const bar = vert
        ? { x: pad.x + pad.w - g.v, y: pad.y, w: g.v, h: pad.h - g.h }
        : { x: pad.x, y: pad.y + pad.h - g.h, w: pad.w - g.v, h: g.h };
      const length = vert ? bar.h : bar.w;
      out.push(`<rect ${rectAttrs(bar)} fill="${track}"/>`);
      // A triangle on the bar's middle line: its tip and its base `along` the bar.
      const arrow = (tip, base) => {
        const mid = vert ? bar.x + bar.w / 2 : bar.y + bar.h / 2;
        const at = (along, across) =>
          vert ? `${num(mid + across)} ${num(along)}` : `${num(along)} ${num(mid + across)}`;
        return `<path d="M${at(tip, 0)}L${at(base, -4.75)}L${at(base, 4.75)}Z" fill="${thumb}"/>`;
      };
      const start = vert ? bar.y : bar.x;
      if (length >= 36) {
        out.push(arrow(start + (vert ? 7.25 : 6.25), start + (vert ? 12 : 11)));
        out.push(arrow(start + length - (vert ? 8.25 : 7.25), start + length - (vert ? 13 : 12)));
      }
      const total = l.scroll ? (vert ? l.scroll.h : l.scroll.w) : 0;
      const visible = vert ? l.client.h : l.client.w;
      const offset = l.scroll ? (vert ? l.scroll.y : l.scroll.x) : 0;
      const run = length - 36;
      if (total > visible && run > 0) {
        const size = Math.min(run, Math.max(17, Math.round((visible / total) * run)));
        const at = start + 18 + (Math.max(0, offset) * (run - size)) / (total - visible);
        const rect = vert ? { x: bar.x + 3, y: at, w: 9, h: size } : { x: at, y: bar.y + 3, w: size, h: 9 };
        out.push(`<rect ${rectAttrs(rect)} rx="4.5" fill="${thumb}"/>`);
      }
    }
    if (g.v && g.h)
      out.push(
        `<rect ${rectAttrs({ x: pad.x + pad.w - g.v, y: pad.y + pad.h - g.h, w: g.v, h: g.h })} fill="${track}"/>`,
      );
    return out;
  }

  // The scrollbars of a scrolling box, which Chromium draws outside the DOM. A
  // custom one (::-webkit-scrollbar) is drawn as CustomScrollbarTheme lays it
  // out: each part a box painted with its pseudo-element's style, in the order
  // background, buttons, track, track pieces, thumb; the corner between two
  // scrollbars with its own style, else white. A scrollbar without a custom
  // style is the platform's (paintNativeScrollbars).
  function paintScrollbars(l) {
    if ((l.style.resize ?? "none") !== "none" && SCROLLS.has(l.style["overflow-x"])) note("resizer");
    const g = gutters(l);
    if (!g.v && !g.h) return [];
    const sb = env.scrollbars?.get(l.key);
    const bw = borders(l.style);
    const pad = deflate(l.bounds, bw[0].width, bw[1].width, bw[2].width, bw[3].width);
    if (!sb?.custom) return sb?.standard ? paintNativeScrollbars(l, g, pad, sb.standard) : noNative();
    const out = [];
    const shown = (key) => {
      const st = sb.parts[key];
      return st && st.display !== "none" ? st : null;
    };
    const paint = (key, rect) => {
      const st = shown(key);
      if (st && rect.w > 0 && rect.h > 0) out.push(...paintBox({ style: st, bounds: rect, node: SCROLLBAR_NODE }));
    };
    for (const o of ["v", "h"]) {
      if (!g[o]) continue;
      const vert = o === "v";
      const bar = vert
        ? { x: pad.x + pad.w - g.v, y: pad.y, w: g.v, h: pad.h - g.h }
        : { x: pad.x, y: pad.y + pad.h - g.h, w: pad.w - g.v, h: g.h };
      const length = vert ? bar.h : bar.w;
      const thickness = vert ? bar.w : bar.h;
      // A rectangle `from` along the bar and `len` long, as thick as the bar.
      const span = (from, len) =>
        vert ? { x: bar.x, y: bar.y + from, w: bar.w, h: len } : { x: bar.x + from, y: bar.y, w: len, h: bar.h };
      const [size, min, max, start, end] = vert
        ? ["height", "min-height", "max-height", "margin-top", "margin-bottom"]
        : ["width", "min-width", "max-width", "margin-left", "margin-right"];
      const len = (v, auto) => (!v || v === "auto" ? auto : v.endsWith("%") ? (px(v) / 100) * length : px(v));
      // A part's length along the bar (LayoutCustomScrollbarPart::ComputeLength):
      // its size; auto is the platform's scrollbar thickness, and for the thumb
      // the platform's thumb length.
      const partLength = (key) => {
        const st = shown(`${o}:${key}`);
        if (!st) return 0;
        const want = len(st[size], key === "thumb" ? AUTO_THUMB : sb.native || thickness);
        const most = st[max] === "none" ? want : len(st[max], want);
        return Math.trunc(Math.max(len(st[min], 0), Math.min(most, want)));
      };
      const margin = (key, side) => {
        const st = shown(`${o}:${key}`);
        return st ? Math.trunc(px(st[side])) : 0;
      };
      const backStart = partLength("back-button-start");
      const forwardStart = partLength("forward-button-start");
      const backEnd = partLength("back-button-end");
      const forwardEnd = partLength("forward-button-end");
      // Buttons that do not fit are not drawn, and the track takes the whole bar.
      const buttons = backStart + forwardStart + backEnd + forwardEnd <= length;
      let trackFrom = 0;
      let trackLength = length;
      if (buttons) {
        trackFrom = backStart + forwardStart + margin("track", start);
        trackLength =
          length - backStart - forwardStart - backEnd - forwardEnd - margin("track", start) - margin("track", end);
      }
      // The track pieces' margins narrow the run the thumb moves along.
      const runFrom = trackFrom + margin("back-track", start);
      const run = trackLength - margin("back-track", start) - margin("forward-track", end);
      // ScrollbarTheme::ThumbLength and ThumbPosition. The thumb is never
      // shorter than its own length (CustomScrollbar::MinimumThumbLength).
      const total = l.scroll ? (vert ? l.scroll.h : l.scroll.w) : 0;
      const visible = vert ? l.client.h : l.client.w;
      const offset = l.scroll ? (vert ? l.scroll.y : l.scroll.x) : 0;
      let thumb = 0;
      let at = 0;
      if (total > visible) {
        thumb = Math.max(Math.round((visible / total) * run), partLength("thumb"));
        if (thumb > run) thumb = 0;
        const p = (Math.max(0, offset) * (run - thumb)) / (total - visible);
        at = p > 0 && p < 1 ? 1 : Math.trunc(p);
      }
      paint(`${o}:scrollbar`, bar);
      if (buttons) {
        paint(`${o}:back-button-start`, span(0, backStart));
        paint(`${o}:back-button-end`, span(length - forwardEnd - backEnd, backEnd));
        paint(`${o}:forward-button-start`, span(backStart, forwardStart));
        paint(`${o}:forward-button-end`, span(length - forwardEnd, forwardEnd));
      }
      paint(`${o}:track`, span(trackFrom, trackLength));
      // The pieces meet under the middle of the thumb (ScrollbarTheme::SplitTrack).
      const before = at + Math.trunc(thumb / 2);
      paint(`${o}:back-track`, span(runFrom, before));
      paint(`${o}:forward-track`, span(runFrom + before, run - before));
      paint(`${o}:thumb`, span(runFrom + at, thumb));
    }
    if (g.v && g.h) {
      const corner = { x: pad.x + pad.w - g.v, y: pad.y + pad.h - g.h, w: g.v, h: g.h };
      if (sb.parts.corner) paint("corner", corner);
      else out.push(`<rect ${rectAttrs(corner)} fill="#fff"/>`);
    }
    return out;
  }

  // A native checkbox or radio button, as Chromium's default theme draws them:
  // a square (a circle) as wide as the box is wide and tall, whichever is
  // less, centred in it, designed on a 13 by 13 grid and scaled to fit. A
  // disabled one is the same, faded.
  function paintCheckable(l) {
    const b = l.bounds;
    const side = Math.min(b.w, b.h);
    if (!(side > 0)) return [];
    const radio = l.node.attrs.type.toLowerCase() === "radio";
    const on = l.node.checked;
    const blue = "#0078d7";
    const art = radio
      ? `<circle cx="6.5" cy="6.5" r="6.5" fill="${on ? blue : "#767676"}"/><circle cx="6.5" cy="6.5" r="5.5" fill="#fff"/>` +
        (on ? `<circle cx="6.5" cy="6.5" r="3.75" fill="${blue}"/>` : "")
      : on
        ? `<rect width="13" height="13" rx="2" fill="${blue}"/>` +
          `<path d="M3.1 6.3L5.3 10L10.3 2.7" fill="none" stroke="#fff" stroke-width="1.8"/>`
        : `<rect width="13" height="13" rx="2" fill="#767676"/><rect x="1" y="1" width="11" height="11" rx="1" fill="#fff"/>`;
    const fade = l.node.attrs.disabled === undefined ? "" : ' opacity="0.5"';
    return [
      `<g transform="translate(${num(b.x + (b.w - side) / 2)} ${num(b.y + (b.h - side) / 2)}) scale(${num(side / 13)})"${fade}>${art}</g>`,
    ];
  }

  // The text of a native <input> or <textarea> is not DOM text. It is set in the
  // content box (the border box less border and padding): in one line centred
  // vertically for an input, from the top for a textarea (a long line is cut
  // at the edge, not wrapped), aligned by text-align, and moved by how far the
  // control is scrolled. An input's text is clipped to the content box, a
  // textarea's to the padding box, which it scrolls in.
  function paintTextControl(l, bw) {
    const c = shownControlText(l);
    if (!c) return [];
    const st = l.style;
    const b = l.bounds;
    const pad = SIDES.map((s) => px(st[`padding-${s}`]));
    // A scrollbar takes its width from the right and its height from the bottom.
    const scrollbarW = l.client ? Math.max(0, b.w - bw[1].width - bw[3].width - l.client.w) : 0;
    const scrollbarH = l.client ? Math.max(0, b.h - bw[0].width - bw[2].width - l.client.h) : 0;
    const content = (r) =>
      deflate(
        r,
        bw[0].width + pad[0],
        bw[1].width + pad[1] + scrollbarW,
        bw[2].width + pad[2] + scrollbarH,
        bw[3].width + pad[3],
      );
    // The text is set in the exact content box and clipped to the snapped one.
    const box = content(b);
    const at = content(l.exact ?? b);
    if (box.w <= 0 || box.h <= 0) return [];
    const key = fontKey(st);
    const m = env.metrics(key);
    const lh = st["line-height"]?.endsWith("px") ? px(st["line-height"]) : m.line || m.height;
    const textarea = l.node.name === "TEXTAREA";
    const shows = textarea
      ? deflate(b, bw[0].width, bw[1].width + scrollbarW, bw[2].width + scrollbarH, bw[3].width)
      : box;
    const align = BUTTON_INPUTS.has((l.node.attrs.type ?? "").toLowerCase()) ? "center" : (st["text-align"] ?? "start");
    const shown = c.placeholder
      ? { ...st, color: env.placeholderColor, "-webkit-text-fill-color": env.placeholderColor }
      : st;
    const lines = controlLines(c.text, textarea, st["tab-size"]);
    // The text moves by how far the control is scrolled; only a textarea scrolls down.
    const sx = l.scroll?.x ?? 0;
    const top = textarea ? at.y - (l.scroll?.y ?? 0) : at.y + (at.h - lh) / 2;
    const runs = [];
    for (const [i, line] of lines.entries()) {
      if (!line.trim()) continue;
      const y = top + i * lh;
      if (y + lh < shows.y || y > shows.y + shows.h) continue;
      const w = env.textWidth?.(key, line) ?? null;
      let x = at.x - sx;
      if (w !== null && align.endsWith("center")) x = at.x + (at.w - w) / 2 - sx;
      else if (w !== null && (align === "right" || align === "end")) x = at.x + at.w - w - sx;
      runs.push(textRun(shown, line, x, y + (lh - m.height) / 2 + m.ascent, w));
    }
    if (!runs.length) return [];
    const id = def(
      `c${shows.x}|${shows.y}|${shows.w}|${shows.h}`,
      (id) => `<clipPath id="${id}"><rect ${rectAttrs(shows)}/></clipPath>`,
    );
    return [`<g clip-path="url(#${id})">${runs.join("")}</g>`];
  }

  // Chromium rounds the baseline to whole CSS px before it puts a line under it,
  // and draws a line from the left edge of a fragment to the right one, in the
  // exact (fractional) positions of the fragment, whitespace included. The line
  // goes under the glyphs, and leaves a gap round each stretch of the fragment's
  // ink that is in its band (inkBand), as wide as the line is thick on each side.
  // Only the fragments in `view` are drawn: textNeeds measures only those.
  function paintText(l, view) {
    const st = textStyle(l);
    if (!st || st.visibility !== "visible") return [];
    const key = fontKey(st);
    const base = env.metrics(key).ascent;
    const { lines, undrawn } = decorationsOf(l);
    for (const what of undrawn) note(what);
    const out = [];
    for (const t of l.boxes) {
      if (!overlaps(t, view)) continue;
      const s = l.text.substr(t.start, t.length);
      for (const u of lines) {
        const gaps = u.skipInk && s.trim() ? (env.inkGaps?.(key, s, ...inkBand(u)) ?? []) : [];
        const line = underline(t, Math.round(t.y + base) + u.offset, u, gaps);
        if (line) out.push(line);
      }
      if (s.trim()) out.push(textRun(st, s, t.x, t.y + base, t.w));
    }
    return out;
  }

  // The line under a text fragment `t`, at `y`, as one rect, or as one path where
  // the gaps cut it into pieces.
  function underline(t, y, u, gaps) {
    let pieces = t.w > 0 ? [[t.x, t.x + t.w]] : [];
    for (const [from, to] of gaps) {
      const lo = t.x + from - u.reach;
      const hi = t.x + to + u.reach;
      pieces = pieces.flatMap(([a, b]) => [
        [a, Math.min(b, lo)],
        [Math.max(a, hi), b],
      ]);
      pieces = pieces.filter(([a, b]) => b > a);
    }
    if (!pieces.length) return "";
    if (pieces.length === 1)
      return `<rect ${rectAttrs({ x: pieces[0][0], y, w: pieces[0][1] - pieces[0][0], h: u.thickness })} fill="${u.color}"/>`;
    const d = pieces.map(([a, b]) => `M${num(a)} ${num(y)}h${num(b - a)}v${u.thickness}h${num(a - b)}z`).join("");
    return `<path d="${d}" fill="${u.color}"/>`;
  }

  // One run of text, in the picture's own subset faces when the run's fonts can
  // be loaded and in the computed font-family otherwise. `width` is the run's
  // laid-out width: textLength holds a viewer that shapes it differently to it.
  function textRun(st, s, x, baseline, width) {
    stats.texts++;
    const sources = fonts && env.fontsFor ? env.fontsFor(fontKey(st), s) : null;
    const face = sources?.length ? fonts.css(s, sources, st["font-weight"], st["font-style"]) : null;
    if (!face) note("text in an unembedded font");
    const fit = width && [...s].length > 1 ? ` textLength="${num(width)}" lengthAdjust="spacing"` : "";
    return `<text class="${textClass(st, face)}" x="${num(x)}" y="${num(baseline)}"${fit}>${esc(s)}</text>`;
  }

  // The document of an <iframe>, drawn at the iframe's place in paint order, after
  // its own background and border, as a group of its own: the iframe's content box
  // is the frame's viewport and clips it; the document is drawn in that box as the
  // frame has scrolled and scaled it; its canvas colour fills the viewport (a frame
  // with none is transparent); the viewport's scrollbars are over it. What the
  // frame shows is measured in the frame's own document (`frames`).
  function paintFrame(l, view) {
    const doc = l.node.frame;
    const st = l.style;
    if (st.visibility !== "visible") return [];
    // With a way to measure frames, a frame it did not measure is not drawn: its
    // text would be set with the page's measures.
    const measured = frames ? frames(doc) : {};
    if (!measured) {
      note("a frame that was not measured");
      return [];
    }
    const mine = { ...pageEnv, ...measured };
    const geometry = frameGeometry(l, mine.inner);
    const { box, scale } = geometry;
    unzoom(doc, scale);
    const shown = frameView(view, geometry, doc);
    if (!shown) return [];
    if (scale !== 1 && viewportGutters(doc, mine.inner)) note("scrollbars of a zoomed frame");
    if (radii(st, l.bounds.w, l.bounds.h).some(([a, b]) => a > 0 || b > 0)) note("frame with rounded corners");
    const outer = env;
    env = mine;
    try {
      const parts = [];
      const color = canvasColor(doc);
      if (color) parts.push(`<rect ${rectAttrs(box)} fill="${color}"/>`);
      const inside = paintDocument(doc, shown);
      if (inside.length) {
        const at = `translate(${num(box.x - doc.scroll.x * scale)} ${num(box.y - doc.scroll.y * scale)})`;
        parts.push(`<g transform="${at}${scale === 1 ? "" : ` scale(${num(scale)})`}">${inside.join("")}</g>`);
      }
      const bars = viewportScroller(doc, geometry, mine.inner);
      if (bars) parts.push(...paintScrollbars(bars));
      if (!parts.length) return [];
      stats.frames++;
      const id = def(
        `c${box.x}|${box.y}|${box.w}|${box.h}`,
        (id) => `<clipPath id="${id}"><rect ${rectAttrs(box)}/></clipPath>`,
      );
      return [`<g clip-path="url(#${id})">${parts.join("")}</g>`];
    } finally {
      env = outer;
    }
  }

  // The items of a document in paint order, as `view` (the document's own
  // coordinates) shows them, opening and closing the groups each one inherits.
  function paintDocument(doc, view) {
    const items = [];
    for (const l of doc.layouts) {
      const n = l.node;
      if (n.type === 1 && hidden(n)) continue;
      // An <svg> is one box (paintInlineSvg); what is in it is not drawn from its layout objects.
      if (inSvg(n.parent)) continue;
      if (n.type === 3 && hidden(n.parent)) continue;
      if (l.text !== undefined) {
        if (l.boxes.length) items.push({ l, kind: "text" });
      } else if (l.style && n.box === l) items.push({ l, kind: "box" });
    }
    items.sort((a, b) => a.l.paint - b.l.paint || a.l.li - b.l.li);
    const body = [];
    const open = [];
    for (const it of items) {
      const l = it.l;
      const n = l.node;
      const owner = it.kind === "text" && n.type === 3 ? styled(n.parent) : n;
      if (!owner) continue;
      if (it.kind === "text" && !l.boxes.some((t) => overlaps(t, view))) continue;
      const c = it.kind === "box" ? clipOf(owner) : clipForDescendants(owner);
      const shadowReach = parseShadows(l.style?.["box-shadow"]).reduce(
        (m, s) => Math.max(m, s.blur * 1.5 + s.spread + Math.abs(s.x) + Math.abs(s.y)),
        0,
      );
      const ext = {
        x: l.bounds.x - shadowReach,
        y: l.bounds.y - shadowReach,
        w: l.bounds.w + 2 * shadowReach,
        h: l.bounds.h + 2 * shadowReach,
      };
      if (!overlaps(ext, view) || !overlaps(intersect(c, ext), view)) continue;
      const ts = transformsOf(owner);
      let content;
      if (ts.length) {
        // Painted where it is before the transforms of its element and its ancestors, then
        // transformed: the snapshot's boxes, the text's included, are where they are after.
        const lu = untransformLayout(l, ts, it.kind === "box" ? n : null);
        const inner =
          it.kind === "box"
            ? [...paintBox(lu), ...(l.style.visibility === "visible" ? paintScrollbars(lu) : [])]
            : paintText(lu, INF);
        content = inner.length ? [...ts.map((t) => `<g transform="${t.svg}">`), ...inner, ...ts.map(() => "</g>")] : [];
        if (n.frame) note("a transformed frame");
      } else if (it.kind === "box") {
        content = paintBox(l);
        if (l.style.visibility === "visible") content.push(...paintScrollbars(l));
        if (n.frame) content.push(...paintFrame(l, view));
        else if (n.name === "IFRAME" && l.style.visibility === "visible" && l.bounds.w > 0 && l.bounds.h > 0)
          note("a frame of another process");
      } else content = paintText(l, view);
      if (!content.length) continue;
      const chained = applyChain(chain(owner), content);
      const want = chained.want;
      content = chained.content;
      if (c !== INF && (c.x > view.x || c.y > view.y || c.x + c.w < view.x + view.w || c.y + c.h < view.y + view.h)) {
        const id = def(
          `c${c.x}|${c.y}|${c.w}|${c.h}`,
          (id) => `<clipPath id="${id}"><rect ${rectAttrs(c)}/></clipPath>`,
        );
        want.push({ key: `c${id}`, open: `<g clip-path="url(#${id})">` });
      }
      let same = 0;
      while (same < open.length && same < want.length && open[same].key === want[same].key) same++;
      while (open.length > same) closeGroup(body, open.pop());
      for (const g of want.slice(same)) {
        open.push(g);
        body.push(g.open);
        g.start = body.length;
      }
      body.push(...content);
    }
    while (open.length) closeGroup(body, open.pop());
    return body;
  }

  // The canvas takes the root's background, else the body's; a page with
  // neither shows the browser's white, unless `background` is off (a cut-out,
  // whose default background is transparent).
  const view = { x: clip.x, y: clip.y, w: clip.w, h: clip.h };
  const body = paintDocument(decoded, view);
  const color = canvasColor(decoded) ?? (background ? "white" : null);
  const ground = color ? `<rect ${rectAttrs(view)} fill="${color}"/>` : "";
  const css = FACES_MARK + [...textClasses.entries()].map(([css, cls]) => `.${cls}{${css}}`).join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${num(clip.w)}" height="${num(clip.h)}" ` +
    `viewBox="${num(clip.x)} ${num(clip.y)} ${num(clip.w)} ${num(clip.h)}" data-clip="${num(clip.x)} ${num(clip.y)} ${num(clip.w)} ${num(clip.h)}">` +
    `<style>text{white-space:pre}${css}</style><defs>${defs.join("")}</defs>${ground}${body.join("")}${overlays.join("")}</svg>\n`;
  return { svg, stats };
}
