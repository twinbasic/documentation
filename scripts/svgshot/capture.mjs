// An SVG picture of a clip of a live page, over a CDP connection: what
// shoot_docs.mjs --svg writes beside each PNG. collectBundle reads what the
// converter needs from the page into a bundle, data alone; bundle.mjs's
// renderBundle draws the SVG from it, and replay.mjs draws it again later.
//
// Everything is read from the page as it stands when the PNG has just been
// captured, in this order:
//   1. the DOM snapshot (layout, text fragments, computed styles, paint order);
//   2. in a measuring layer added only after the snapshot, so it is in no
//      picture: each font's ascent and the fonts Chromium draws each run of
//      text with (CSS.getPlatformFontsForNode), and the same for the
//      annotation layer's text; and, on a canvas, where an underlined run's ink
//      is in the band its underline skips;
//   3. the pixels of each <canvas> in the clip, and the bytes of each web
//      font a run was drawn with (the @font-face rules the page's own CSS picks
//      for the run's font, which need not be named as the font names itself:
//      a family split into files by unicode-range is every file whose range
//      holds a character of the run);
//   4. the annotation layer (svg#tbShotAnnotation) as XML, its text moved onto
//      the picture's own faces, and each other inline <svg> in the clip as XML
//      with the styles the page gives its elements resolved (inlineSvg), read
//      before step 2 so that its text is measured too.
// The measuring layer is removed again before this returns.
//
// Steps 2 and 3, and the scrollbar styles, are done in each document that shows
// in the clip: the page's, and the <iframe>s of the same process (the ones that
// are documents of their own in the snapshot), each in a world of its own that
// DevTools makes in the frame (Page.createIsolatedWorld), because a font name,
// a style rule and a canvas mean what their own document says. A frame of
// another process is not reached: it has a DevTools target of its own.

import { createHash } from "node:crypto";
import { BUNDLE_VERSION, renderBundle, trimSnapshot } from "./bundle.mjs";
import { webRulesFor } from "./fonts.mjs";
import {
  decodeSnapshot,
  frameGeometry,
  framesIn,
  frameView,
  inlineSvgsIn,
  scrollbarPartList,
  scrollersIn,
  textNeeds,
  unzoom,
  viewportScroller,
  viewportStyleSources,
} from "./snapshot-svg.mjs";

// The computed styles the converter reads.
export const SNAPSHOT_STYLES = [
  "display",
  "visibility",
  "opacity",
  "color",
  "background-color",
  "background-image",
  "background-size",
  "background-position",
  "background-repeat",
  "background-clip",
  "background-origin",
  "background-blend-mode",
  ...["top", "right", "bottom", "left"].flatMap((s) => [`border-${s}-width`, `border-${s}-style`, `border-${s}-color`]),
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-right-radius",
  "border-bottom-left-radius",
  "outline-width",
  "outline-style",
  "outline-color",
  "outline-offset",
  "box-shadow",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "text-align",
  "text-align-last",
  "tab-size",
  "text-decoration-line",
  "text-decoration-style",
  "text-decoration-color",
  "text-decoration-thickness",
  "text-decoration-skip-ink",
  "text-underline-offset",
  "text-underline-position",
  "float",
  "appearance",
  "overflow-x",
  "overflow-y",
  "resize",
  "border-collapse",
  "transform",
  "transform-origin",
  "filter",
  "clip-path",
  "position",
  ...["top", "right", "bottom", "left"].map((s) => `padding-${s}`),
  "-webkit-text-fill-color",
];

// What a scrollbar part's box is drawn from: its styles, and its size along the bar.
const PART_STYLES = [
  ...SNAPSHOT_STYLES,
  ...["width", "height", "min-width", "min-height", "max-width", "max-height"],
  ...["top", "right", "bottom", "left"].map((s) => `margin-${s}`),
];

const MEASURE_ID = "tbSvgMeasure";
const OVERLAYS = ["svg#tbShotAnnotation", "#tbShotPointer svg"];

// Runs in the page: the measuring layer, the canvases and the overlays.
function measure({ keys, runs, skips, view, measureId, overlays }) {
  const layer = document.createElement("div");
  layer.id = measureId;
  layer.style.cssText = "position:fixed;left:0;top:0;opacity:0;pointer-events:none;z-index:-2147483647";
  document.body.append(layer);
  const font = ([style, weight, size, family]) =>
    `white-space:pre;line-height:normal;font-family:${family};font-size:${size};font-weight:${weight};font-style:${style}`;

  const metrics = {};
  const probes = keys.map((key) => {
    const d = document.createElement("div");
    d.style.cssText = font(JSON.parse(key));
    const t = document.createElement("span");
    t.textContent = "Hxg";
    const b = document.createElement("span");
    b.style.cssText = "display:inline-block;width:0;height:0";
    d.append(t, b);
    layer.append(d);
    return [key, t, b, d];
  });

  // The overlays, serialised with their text marked for the picture's faces.
  const marked = [];
  const outOverlays = [];
  for (const sel of overlays) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    const clone = el.cloneNode(true);
    const texts = [...el.querySelectorAll("text")];
    const cloneTexts = [...clone.querySelectorAll("text")];
    for (const [i, t] of texts.entries()) {
      const cs = getComputedStyle(t);
      const key = JSON.stringify([cs.fontStyle, cs.fontWeight, cs.fontSize, cs.fontFamily]);
      const k = marked.length;
      marked.push({ key, text: t.textContent });
      cloneTexts[i].style.removeProperty("font-family");
      cloneTexts[i].style.setProperty("--tbk", String(k));
    }
    for (const a of ["style", "class", "id"]) clone.removeAttribute(a);
    // The layer is fixed to the window and drawn in the window's coordinates, as is the box
    // read here, while the picture is in the document's: a scrolled page moves it by the scroll.
    clone.setAttribute("x", String(r.x + scrollX));
    clone.setAttribute("y", String(r.y + scrollY));
    clone.setAttribute("width", String(r.width));
    clone.setAttribute("height", String(r.height));
    clone.setAttribute("overflow", "visible");
    outOverlays.push(new XMLSerializer().serializeToString(clone));
  }

  const allRuns = [...runs, ...marked.map((m) => [m.key, m.text])];
  for (const [k, [key, text]] of allRuns.entries()) {
    const s = document.createElement("span");
    s.dataset.k = String(k);
    s.style.cssText = font(JSON.parse(key));
    s.textContent = text;
    layer.append(s, document.createElement("br"));
  }

  return document.fonts.ready.then(() => {
    // `line` is the height of a line with line-height: normal, `height` the font's content area.
    for (const [key, t, b, d] of probes) {
      const box = t.getClientRects()[0];
      metrics[key] = {
        ascent: b.getBoundingClientRect().bottom - box.top,
        height: box.height,
        line: d.getBoundingClientRect().height,
      };
    }
    // How wide each run of text is laid out, for the text that is aligned in its box.
    const widths = [...layer.querySelectorAll("span[data-k]")].map((s) => s.getBoundingClientRect().width);
    // Where each run's ink is in a band of `height` CSS px that starts `top` px below
    // the baseline, as stretches [from, to] in CSS px from the run's start: the run
    // drawn 16 times as large on a canvas, whose columns with ink in the band (at
    // least a quarter covered) are read back. Chromium reads the same from the
    // outlines, and rounds what it cuts to device pixels. A canvas is at most 32767
    // px wide, so a long run is drawn smaller; a run that cannot be drawn has no gaps.
    const gaps = skips.map(([key, text, top, height]) => {
      const [style, weight, size, family] = JSON.parse(key);
      const font = (scale) => `${style} ${weight} ${Number.parseFloat(size) * scale}px ${family}`;
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.font = font(1);
        const advance = ctx.measureText(text).width;
        const scale = Math.max(1, Math.min(16, Math.floor(30000 / (advance + 8))));
        const edge = 4 * scale;
        // Resizing a canvas resets its font.
        canvas.width = Math.ceil(advance * scale) + 2 * edge;
        canvas.height = Math.max(1, Math.round(height * scale));
        ctx.font = font(scale);
        ctx.fillText(text, edge, -top * scale);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const inked = (x) => {
          for (let y = 0; y < canvas.height; y++) if (data[(y * canvas.width + x) * 4 + 3] >= 64) return true;
          return false;
        };
        const out = [];
        let from = -1;
        for (let x = 0; x <= canvas.width; x++) {
          const ink = x < canvas.width && inked(x);
          if (ink && from < 0) from = x;
          else if (!ink && from >= 0) {
            out.push([(from - edge) / scale, (x - edge) / scale]);
            from = -1;
          }
        }
        return out;
      } catch {
        return [];
      }
    });
    const roots = [document];
    for (let i = 0; i < roots.length; i++)
      for (const e of roots[i].querySelectorAll("*")) if (e.shadowRoot) roots.push(e.shadowRoot);
    // The colour a placeholder is drawn in: the first one in the page's, else a new input's.
    const probe = document.createElement("input");
    probe.placeholder = "x";
    layer.append(probe);
    const holder =
      roots.flatMap((root) => [...root.querySelectorAll("input[placeholder], textarea[placeholder]")])[0] ?? probe;
    const placeholderColor = getComputedStyle(holder, "::placeholder").color;
    const canvases = [];
    for (const root of roots)
      for (const c of root.querySelectorAll("canvas")) {
        const r = c.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        // The view and the layout boxes are in document coordinates, a rectangle is in the viewport's.
        const [x, y] = [r.x + scrollX, r.y + scrollY];
        if (x + r.width <= view.x || y + r.height <= view.y || x >= view.x + view.w || y >= view.y + view.h) continue;
        try {
          canvases.push({ x, y, w: r.width, h: r.height, href: c.toDataURL("image/png") });
        } catch {
          // A tainted canvas cannot be read; the converter says it has no picture.
        }
      }
    return { metrics, widths, gaps, placeholderColor, canvases, overlays: outOverlays, marked, allRuns };
  });
}

// Runs in the page, on a scrolling element (`this`): the computed style of
// each part of its scrollbars that has a ::-webkit-scrollbar style, as
// {custom, parts: {key: style | null}}; `parts` lists the parts Chromium makes,
// each with its pseudo-element (the part of the name after
// "::-webkit-scrollbar") and the scrollbar pseudo-classes it matches.
//
// getComputedStyle cannot name a scrollbar part, nor a state like :vertical,
// and a rule's text cannot be copied to an element of our own: Chromium drops
// a var() shorthand from cssText once a longhand overrides part of it. So each
// rule that styles a part of this element's scrollbars gets, for a moment, one
// more selector: one that matches a probe element standing for that part, with
// the specificity of the selector it stands for, so that Chromium itself
// cascades the rules and resolves their var()s. The probe is an element of an
// unknown name, which no page rule but a `*` one matches, under a hidden
// parent that carries what the part inherits from the element.
//
// `viewport` is set for the scrollbars of a document's viewport, whose style
// source is the <body> or the root element (`this`): they take the standard
// properties from the root element, wherever the rules are.
//
// The result also has `standard`, what the platform's own scrollbar is drawn
// from where nothing custom styles it: {color, width, dark}, the computed
// scrollbar-color and scrollbar-width, and whether the colour scheme in use
// is dark.
function scrollbarParts({ styleNames, parts, viewport = false }) {
  const el = this;
  const cs = getComputedStyle(el);
  const source = viewport ? getComputedStyle(document.documentElement) : cs;
  const schemes = source.getPropertyValue("color-scheme").split(/\s+/);
  const standard = {
    color: source.getPropertyValue("scrollbar-color"),
    width: source.getPropertyValue("scrollbar-width"),
    dark:
      schemes.includes("dark") && (!schemes.includes("light") || matchMedia("(prefers-color-scheme: dark)").matches),
  };
  // The standard properties turn the ::-webkit-scrollbar styles off.
  if (standard.width !== "auto" || standard.color !== "auto") return { custom: false, standard, parts: {} };
  const top = (s) => {
    const out = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === "\\") i++;
      else if (c === '"' || c === "'") {
        for (i++; i < s.length && s[i] !== c; i++) if (s[i] === "\\") i++;
      } else if (c === "(" || c === "[") depth++;
      else if (c === ")" || c === "]") depth--;
      else if (c === "," && !depth) {
        out.push(s.slice(start, i).trim());
        start = i + 1;
      }
    }
    out.push(s.slice(start).trim());
    return out;
  };
  const specificity = (sel) => {
    let [a, b, c] = [0, 0, 0];
    const n = sel.length;
    const ident = (i) => {
      while (i < n && (/[-\w]/.test(sel[i]) || sel[i] === "\\" || sel[i] > "\u007f")) i += sel[i] === "\\" ? 2 : 1;
      return i;
    };
    const close = (i, open, shut) => {
      for (let d = 0; i < n; i++) {
        const ch = sel[i];
        if (ch === "\\") i++;
        else if (ch === '"' || ch === "'") {
          for (i++; i < n && sel[i] !== ch; i++) if (sel[i] === "\\") i++;
        } else if (ch === open) d++;
        else if (ch === shut && --d === 0) return i;
      }
      return n;
    };
    for (let i = 0; i < n; ) {
      const ch = sel[i];
      if (ch === "#") {
        a++;
        i = ident(i + 1);
      } else if (ch === ".") {
        b++;
        i = ident(i + 1);
      } else if (ch === "[") {
        b++;
        i = close(i, "[", "]") + 1;
      } else if (ch === ":" && sel[i + 1] === ":") {
        c++;
        i = ident(i + 2);
        if (sel[i] === "(") i = close(i, "(", ")") + 1;
      } else if (ch === ":") {
        const j = ident(i + 1);
        const name = sel.slice(i + 1, j).toLowerCase();
        if (sel[j] === "(") {
          const k = close(j, "(", ")");
          // :is(), :not() and :has() count as their most specific argument, :where() as nothing.
          if (["is", "not", "has", "matches", "-webkit-any"].includes(name)) {
            const best = top(sel.slice(j + 1, k))
              .map(specificity)
              .reduce((m, s) => ((s[0] - m[0] || s[1] - m[1] || s[2] - m[2]) > 0 ? s : m), [0, 0, 0]);
            a += best[0];
            b += best[1];
            c += best[2];
          } else if (name !== "where") b++;
          i = k + 1;
        } else {
          if (["before", "after", "first-line", "first-letter"].includes(name)) c++;
          else b++;
          i = j;
        }
      } else if (/[-\w\\]/.test(ch) || ch > "\u007f") {
        c++;
        i = ident(i);
      } else i++;
    }
    return [a, b, c];
  };

  // The probes, under a parent that hands down what a part inherits from the element.
  const scope = el.getRootNode();
  const host = document.createElement("tbsb-probes");
  const inherit = ["color", "font-size", "font-family", "visibility", "direction"];
  host.style.setProperty("display", "none");
  for (const name of cs)
    if (name.startsWith("--") || inherit.includes(name)) host.style.setProperty(name, cs.getPropertyValue(name));
  const probes = parts.map((_, k) => {
    const probe = document.createElement("tbsb-probe");
    probe.className = `tbsb-p${k}`;
    host.append(probe);
    return probe;
  });
  const inactive = !document.hasFocus();
  const matched = parts.map(() => false);
  let custom = false;

  // Every style rule that names a scrollbar part, in the element's own scope.
  const rules = [];
  const visit = (list) => {
    for (const r of list) {
      if (r instanceof CSSStyleRule) {
        if (r.selectorText.includes("::-webkit-scrollbar")) rules.push(r);
      } else if (r instanceof CSSImportRule) {
        if (r.styleSheet) visit(r.styleSheet.cssRules);
      } else if (r.cssRules) visit(r.cssRules);
    }
  };
  const sheets =
    scope instanceof ShadowRoot
      ? [...scope.styleSheets, ...scope.adoptedStyleSheets]
      : [...document.styleSheets, ...document.adoptedStyleSheets];
  for (const sheet of sheets) {
    try {
      visit(sheet.cssRules);
    } catch {
      // A cross-origin sheet's rules cannot be read.
    }
  }
  const restore = [];
  try {
    for (const rule of rules) {
      const added = [];
      for (const item of top(rule.selectorText)) {
        const m = /::-webkit-scrollbar(-button|-track-piece|-track|-thumb|-corner)?((?::[-\w]+)*)$/i.exec(item);
        if (!m) continue;
        const prefix = item.slice(0, m.index);
        const owner = prefix === "" || /[\s>+~]$/.test(prefix) ? `${prefix}*` : prefix;
        let mine;
        try {
          mine = el.matches(owner);
        } catch {
          mine = false;
        }
        if (!mine) continue;
        const pseudo = (m[1] ?? "").toLowerCase();
        if (pseudo === "") custom = true;
        const states = m[2].toLowerCase().split(":").filter(Boolean);
        const [a, b, c] = specificity(item);
        for (const [k, p] of parts.entries()) {
          if (p.pseudo !== pseudo) continue;
          if (!states.every((s) => p.states.includes(s) || (s === "window-inactive" && inactive))) continue;
          // A rule with no declarations still gives the part a style of its own.
          matched[k] = true;
          // One class of the probe's own stands in for the pseudo-element, and adds
          // the same to every rule; the rest pad it to the selector's specificity.
          added.push(
            `.tbsb-p${k}${":not(#tbsb-none)".repeat(a)}${`.tbsb-p${k}`.repeat(b)}${":not(tbsb-none)".repeat(c > 0 ? c - 1 : 0)}`,
          );
        }
      }
      if (added.length) {
        restore.push([rule, rule.selectorText]);
        rule.selectorText = `${rule.selectorText}, ${added.join(", ")}`;
      }
    }
    (scope instanceof ShadowRoot ? scope : document.body).append(host);
    const out = {};
    for (const [k, p] of parts.entries()) {
      if (!matched[k]) {
        out[p.key] = null;
        continue;
      }
      const pcs = getComputedStyle(probes[k]);
      out[p.key] = Object.fromEntries(styleNames.map((name) => [name, pcs.getPropertyValue(name)]));
    }
    // The length a part of auto size takes: the platform's classic scrollbar
    // thickness, which is not the thickness of the scrollbar the platform
    // draws now (17 against 15 on Windows). It is the thickness of a custom
    // scrollbar of auto width: one in a shadow root, where no page rule reaches.
    const shadowHost = document.createElement("tbsb-native");
    shadowHost.style.cssText = "position:fixed;left:0;top:0;visibility:hidden";
    const sheet = document.createElement("style");
    sheet.textContent = "div::-webkit-scrollbar{background:transparent}";
    const box = document.createElement("div");
    box.style.cssText = "width:100px;height:100px;overflow:scroll";
    shadowHost.attachShadow({ mode: "open" }).append(sheet, box);
    document.body.append(shadowHost);
    const native = box.offsetWidth - box.clientWidth;
    shadowHost.remove();
    return { custom, standard, native, parts: out };
  } finally {
    for (const [rule, text] of restore) rule.selectorText = text;
    host.remove();
  }
}

// Runs in the page, on an inline <svg> (`this`): what a picture needs to draw it,
// as {attrs, style, inner, texts, foreign, dropped}, or null for an <svg> that
// matches `skip` (the annotation layer, which is drawn on its own).
//   - `inner` is the markup of its children, a copy with no class, no <style> and
//     no namespaced attribute, since the page's CSS does not reach the picture: each
//     element carries the styles the page gives it, resolved, in a style attribute;
//   - what a <use>, a gradient, a clip path, a mask or a marker refers to that is
//     elsewhere in the document (a sprite's <symbol>) is copied in, in a <defs> at the
//     end, and each reference is the plain `#id` (renderSvg gives each svg's ids a
//     prefix of its own, since two icons both have an `id="a"`);
//   - `attrs` and `style` are for the <svg> that holds `inner` in the picture: its
//     viewBox, preserveAspectRatio, overflow and the inherited properties that
//     differ from the initial ones, since nothing is inherited there;
//   - `texts` are the runs of text it draws, [{key, text}], with `key` as fontKey's: an
//     element with text of its own has `--tbk: <index>` in its style, where renderSvg
//     puts the picture's own faces for the run;
//   - `foreign` counts the <foreignObject>s left out, `dropped` the things that cannot be
//     embedded: an <image> the page cannot read, a <use> of a file.
// An inherited property is written on an element only when it differs from the
// parent's or the element sets it itself (an attribute or its own style): a <use>
// then still gives its target what it inherits, as it does in the page, where the
// target has what the sprite around it gives. For the same reason a paint the
// element sets as currentColor stays so, and `color` is written like the rest: it
// is the use that says what the target's currentColor is. An <image> that is not a
// data: URL is read by the page and embedded as one. As in Chromium, a gradient,
// a clip path, a mask or a marker in a tree that is display: none is not found
// by a url() (a <use> finds its target there), and the paint is none.
async function inlineSvg({ skip }) {
  const root = this;
  if (skip && root.matches(skip)) return null;
  // Each inherited property, with the value of an element that sets nothing.
  const INHERITED = {
    color: "rgb(0, 0, 0)",
    fill: "rgb(0, 0, 0)",
    "fill-opacity": "1",
    "fill-rule": "nonzero",
    stroke: "none",
    "stroke-width": "1px",
    "stroke-linecap": "butt",
    "stroke-linejoin": "miter",
    "stroke-miterlimit": "4",
    "stroke-dasharray": "none",
    "stroke-dashoffset": "0px",
    "stroke-opacity": "1",
    "clip-rule": "nonzero",
    visibility: "visible",
    "shape-rendering": "auto",
    "paint-order": "normal",
    "marker-start": "none",
    "marker-mid": "none",
    "marker-end": "none",
    "color-interpolation": "srgb",
    "text-anchor": "start",
    "letter-spacing": "normal",
    "word-spacing": "0px",
    direction: "ltr",
    "writing-mode": "horizontal-tb",
  };
  // Those that are not, written when they differ from their initial value.
  const OWN = {
    opacity: "1",
    "mix-blend-mode": "normal",
    isolation: "auto",
    "clip-path": "none",
    mask: "none",
    filter: "none",
    "stop-color": "rgb(0, 0, 0)",
    "stop-opacity": "1",
    "flood-color": "rgb(0, 0, 0)",
    "flood-opacity": "1",
    "lighting-color": "rgb(255, 255, 255)",
    "vector-effect": "none",
    "dominant-baseline": "auto",
    "alignment-baseline": "auto",
    "baseline-shift": "0px",
  };
  // What a picture has no use for, or cannot hold: elements dropped, and attributes
  // that the written styles replace.
  const DROP = new Set([
    "style",
    "script",
    "title",
    "desc",
    "metadata",
    "animate",
    "animatetransform",
    "animatemotion",
    "set",
  ]);
  const TEXTY = new Set(["text", "tspan", "textpath", "altglyph"]);
  const CLIPS = new Set(["svg", "symbol", "marker", "pattern", "image"]);
  const REPLACED = new Set([
    ...Object.keys(INHERITED),
    ...Object.keys(OWN),
    ...[
      "class",
      "style",
      "transform",
      "display",
      "font-family",
      "font-size",
      "font-weight",
      "font-style",
      "white-space",
    ],
    ...["overflow", "tabindex", "focusable", "role"],
  ]);
  const scope = root.getRootNode();
  const local = new Set([...root.querySelectorAll("[id]")].map((e) => e.id));
  const wanted = [];
  // The ids queued to be copied in, each with whether it is in a tree that is display: none.
  const queued = new Map();
  const inHidden = (e) => {
    for (let a = e.parentElement; a; a = a.parentElement) if (getComputedStyle(a).display === "none") return true;
    return false;
  };
  // Whether the element `#id` names is there to be used: in the subtree or in the document. If it
  // is outside the subtree it is queued once, with the ids it holds, to be copied in. A `paint`
  // (a url() of a style, not a <use>) does not find one in a display: none tree.
  const reference = (id, paint = false) => {
    if (local.has(id)) return true;
    if (queued.has(id)) return !(paint && queued.get(id));
    const target = scope.getElementById?.(id) ?? document.getElementById(id);
    if (!target) return false;
    wanted.push(target);
    queued.set(id, inHidden(target));
    for (const e of target.querySelectorAll("[id]")) queued.set(e.id, inHidden(e));
    return !(paint && queued.get(id));
  };
  const unescaped = (s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };
  // A computed value with each url() made the plain `url(#id)` of an element that is here, or none.
  const plain = (value) =>
    value.replace(/url\(\s*(["']?)([^"')]*)\1\s*\)/g, (_, _quote, url) => {
      const id = url.includes("#") ? unescaped(url.slice(url.indexOf("#") + 1)) : "";
      return id && reference(id, true) ? `url(#${id})` : "none";
    });
  const texts = [];
  let foreign = 0;
  let dropped = 0;
  const dataUrl = (href, base) =>
    fetch(new URL(href, base))
      .then((r) => r.blob())
      .then(
        (blob) =>
          new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result);
            fr.onerror = reject;
            fr.readAsDataURL(blob);
          }),
      );

  // The copy of `el`, whose parent's computed style is `parent` (null: nothing is inherited).
  async function build(el, parent) {
    const lower = el.localName.toLowerCase();
    if (el.namespaceURI !== "http://www.w3.org/2000/svg" || lower.includes(":") || DROP.has(lower)) return null;
    if (lower === "foreignobject") {
      foreign++;
      return null;
    }
    const cs = getComputedStyle(el);
    if (cs.display === "none") return null;
    const copy = el.cloneNode(false);
    const href = el.getAttribute("href") ?? el.getAttribute("xlink:href");
    for (const { name } of [...copy.attributes]) {
      const kept =
        name === "xml:space" || !(/^(?:on|data-|aria-)/.test(name) || name.includes(":") || REPLACED.has(name));
      if (!kept) copy.removeAttribute(name);
    }
    if (href !== null) {
      // An image is embedded; a reference is a plain #id of an element that is here; a file
      // (a sprite's icons.svg#a) cannot be, and a link is not followed.
      let link = null;
      if (lower === "image" && !href.startsWith("data:")) {
        try {
          link = await dataUrl(href, el.baseURI);
        } catch {
          dropped++;
          return null;
        }
      } else if (href.startsWith("#")) link = reference(unescaped(href.slice(1))) ? href : null;
      else if (lower === "image") link = href;
      else if (lower !== "a") {
        dropped++;
        return null;
      }
      if (link) copy.setAttribute("href", link);
    }
    const set = (name) => el.hasAttribute(name) || el.style.getPropertyValue(name) !== "";
    // A paint the element itself sets as currentColor, and that is the colour as it stands.
    const current = (name, value) =>
      /^currentcolor$/i.test((el.style.getPropertyValue(name) || el.getAttribute(name) || "").trim()) &&
      value === cs.color;
    const declare = (name, value) => `${name}:${current(name, value) ? "currentColor" : plain(value)}`;
    const css = [];
    for (const [name, initial] of Object.entries(INHERITED)) {
      const value = cs.getPropertyValue(name);
      if (value !== (parent ? parent.getPropertyValue(name) : initial) || set(name)) css.push(declare(name, value));
    }
    for (const [name, initial] of Object.entries(OWN)) {
      const value = cs.getPropertyValue(name);
      if (value !== initial) css.push(declare(name, value));
    }
    if (cs.transform !== "none") {
      css.push(
        `transform:${cs.transform}`,
        `transform-origin:${cs.transformOrigin}`,
        `transform-box:${cs.transformBox}`,
      );
    }
    if (CLIPS.has(lower) && cs.overflowX === "visible") css.push("overflow:visible");
    const texty = TEXTY.has(lower);
    if (texty) {
      css.push(`white-space:${cs.whiteSpace}`, `font-size:${cs.fontSize}`);
      if ([...el.childNodes].some((n) => n.nodeType === 3 && n.data.trim())) {
        const key = JSON.stringify([cs.fontStyle, cs.fontWeight, cs.fontSize, cs.fontFamily]);
        const own = [...el.childNodes]
          .filter((n) => n.nodeType === 3)
          .map((n) => n.data)
          .join("");
        css.push(
          `font-family:${cs.fontFamily}`,
          `font-weight:${cs.fontWeight}`,
          `font-style:${cs.fontStyle}`,
          `--tbk:${texts.length}`,
        );
        texts.push({ key, text: own });
      }
    }
    if (css.length) copy.setAttribute("style", css.join(";"));
    for (const child of el.childNodes) {
      if (child.nodeType === 1) {
        const built = await build(child, cs);
        if (built) copy.append(built);
      } else if (child.nodeType === 3 && texty) copy.append(child.cloneNode());
    }
    return copy;
  }

  // The markup of an element, without the namespace the serializer adds to the first.
  const markup = (node) => new XMLSerializer().serializeToString(node).replace(/^(<[^\s>/]+) xmlns="[^"]*"/, "$1");
  // The <svg> of the picture holds what the page's one inherits: what differs from the initial values.
  const rootStyle = getComputedStyle(root);
  const css = [];
  for (const [name, initial] of Object.entries(INHERITED)) {
    const value = rootStyle.getPropertyValue(name);
    if (value !== initial) css.push(`${name}:${plain(value)}`);
  }
  const inner = [];
  for (const child of root.childNodes) {
    if (child.nodeType !== 1) continue;
    const built = await build(child, rootStyle);
    if (built) inner.push(markup(built));
  }
  const defs = [];
  for (let i = 0; i < wanted.length; i++) {
    const target = wanted[i];
    const built = await build(target, target.parentElement ? getComputedStyle(target.parentElement) : null);
    if (built) defs.push(markup(built));
  }
  if (defs.length) inner.push(`<defs>${defs.join("")}</defs>`);
  return {
    attrs: {
      viewBox: root.getAttribute("viewBox"),
      preserveAspectRatio: root.getAttribute("preserveAspectRatio"),
      overflow: rootStyle.overflowX === "visible" && rootStyle.overflowY === "visible" ? "visible" : null,
    },
    style: css.join(";"),
    inner: inner.join(""),
    texts,
    foreign,
    dropped,
  };
}

// Runs in the page (exported for test/svgshot.test.mjs, which gives it a
// document of its own): the files of the web font each [style, weight, size,
// family] key was drawn with, as {key: [{url, italic, range, lo, hi}] | null}. The
// font is the @font-face rules that CSS font matching picks for the first family
// of the key's list that has any: the style asked for, else the other; then the
// weight, as the rules' ranges hold it, else the nearest, which is the one above
// for a weight over 500 and the one below for under. Every rule that matches so
// is listed, in the page's order: a family split into files by unicode-range is
// one rule for each, and which of them draws a character is decided by `range`,
// the rule's unicode-range text (webRulesFor), with `lo` and `hi`, the weights it
// holds, which bound the weight a variable file is drawn at. The name a font
// reports for itself ("Inter Variable") need not be the name the page gives it
// ("Inter"), so the rules are found by the page's names.
export function webFontFiles(keys) {
  const unq = (s) => s.trim().replace(/^["']|["']$/g, "");
  const faces = [];
  const visit = (rules, base) => {
    for (const r of rules) {
      if (r instanceof CSSFontFaceRule) {
        const m = /url\(\s*["']?([^"')]+)["']?\s*\)/.exec(r.style.getPropertyValue("src"));
        if (!m) continue;
        const weight = r.style.getPropertyValue("font-weight").trim() || "normal";
        const [lo, hi = lo] = weight.split(/\s+/).map((w) => (w === "normal" ? 400 : w === "bold" ? 700 : Number(w)));
        const style = r.style.getPropertyValue("font-style").trim() || "normal";
        faces.push({
          family: unq(r.style.getPropertyValue("font-family")).toLowerCase(),
          url: new URL(m[1], base).href,
          italic: style !== "normal",
          range: r.style.getPropertyValue("unicode-range").trim(),
          lo: lo || 400,
          hi: hi || 400,
        });
      } else if (r.cssRules) visit(r.cssRules, base);
    }
  };
  for (const sheet of document.styleSheets) {
    try {
      visit(sheet.cssRules, sheet.href ?? document.baseURI);
    } catch {
      // A cross-origin sheet's rules cannot be read.
    }
  }
  const out = {};
  for (const key of keys) {
    const [style, weightText, , list] = JSON.parse(key);
    const weight = Number(weightText) || 400;
    const italic = style !== "normal";
    // Commas inside quotes are not separators.
    const names = (list.match(/"[^"]*"|'[^']*'|[^,]+/g) ?? []).map((n) => unq(n).toLowerCase());
    const family = names.find((n) => faces.some((f) => f.family === n));
    // Ranked by [style missed, weight missed, the wrong side of the weight]; the lowest wins.
    let best = [];
    let rank = null;
    for (const f of faces.filter((f) => f.family === family)) {
      const miss = weight < f.lo ? f.lo - weight : weight > f.hi ? weight - f.hi : 0;
      const wrongSide = weight > 500 ? (f.lo > weight ? 0 : 1) : f.hi < weight ? 0 : 1;
      const candidate = [f.italic === italic ? 0 : 1, miss, wrongSide];
      const before = rank ? candidate.findIndex((v, i) => v !== rank[i]) : 0;
      if (!rank || (before >= 0 && candidate[before] < rank[before])) {
        best = [f];
        rank = candidate;
      } else if (before < 0) best.push(f);
    }
    out[key] = best.length ? best.map(({ url, italic, range, lo, hi }) => ({ url, italic, range, lo, hi })) : null;
  }
  return out;
}

// Runs in the page: the bytes of the file at `url` as a data: URL.
async function webFontData(url) {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.readAsDataURL(blob);
  });
}

/**
 * The SVG picture of `clip` ({x, y, width, height} CSS px; null for the whole
 * viewport) of the page `conn` is attached to. `background` is false for a
 * cut-out. Returns {svg, stats, misses, bundle}: the picture drawn from the
 * bundle read from the page (bundle.mjs), and the bundle.
 */
export async function svgOfPage(conn, clip, options = {}) {
  const bundle = await collectBundle(conn, clip, options);
  return { ...(await renderBundle(bundle)), bundle };
}

/** Everything the converter reads from the page for `clip`, as data (bundle.mjs). */
export async function collectBundle(conn, clip, { background = true } = {}) {
  const snapshot = await conn.send(
    "DOMSnapshot.captureSnapshot",
    { computedStyles: SNAPSHOT_STYLES, includePaintOrder: true, includeDOMRects: true },
    { timeout: 30000 },
  );
  const decoded = decodeSnapshot(snapshot, SNAPSHOT_STYLES);
  let view;
  if (clip) view = { x: clip.x, y: clip.y, w: clip.width, h: clip.height };
  else {
    const { w, h } = await conn.evaluate("({ w: innerWidth, h: innerHeight })");
    view = { x: 0, y: 0, w, h };
  }

  // Runs `expression` in a frame's own world, or in the page's when `context` is undefined.
  const run = async (context, expression, awaitPromise = false) => {
    if (context === undefined) return conn.evaluate(expression, { awaitPromise });
    const r = await conn.send("Runtime.evaluate", {
      expression,
      contextId: context,
      awaitPromise,
      returnByValue: true,
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };

  // The documents measured: the page's, and each frame of the same process that
  // shows in the picture, each in its own world, with the part of it that shows.
  const docs = [{ doc: decoded, view, context: undefined, geometry: null, inner: null }];
  const measured = new Map();
  conn.svgWebFonts ??= new Map();
  try {
    await conn.send("DOM.enable");
    await conn.send("CSS.enable");
    await conn.send("DOM.getDocument", { depth: 0 });
    for (let i = 0; i < docs.length; i++) {
      const entry = docs[i];
      try {
        measured.set(entry.doc, {
          frameId: entry.doc.frameId,
          scale: entry.geometry ? entry.geometry.scale : null,
          ...(await measureDocument(entry)),
        });
      } catch (error) {
        // A frame that cannot be measured is left out, and renderSvg says so; the page must be.
        if (i === 0) throw error;
        continue;
      }
      for (const { l, doc } of framesIn(entry.doc, entry.view)) {
        let context;
        let inner;
        try {
          ({ executionContextId: context } = await conn.send("Page.createIsolatedWorld", {
            frameId: doc.frameId,
            worldName: "svgshot",
          }));
          inner = await run(context, "({ w: innerWidth, h: innerHeight })");
        } catch {
          // A frame that has gone since the snapshot is not drawn.
          continue;
        }
        const geometry = frameGeometry(l, inner);
        unzoom(doc, geometry.scale);
        const shown = frameView(entry.view, geometry, doc);
        if (shown) docs.push({ doc, view: shown, context, geometry, inner });
      }
    }
  } finally {
    for (const { context } of docs)
      await run(context, `document.getElementById(${JSON.stringify(MEASURE_ID)})?.remove()`).catch(() => {});
    await conn.send("CSS.disable").catch(() => {});
    await conn.send("DOM.disable").catch(() => {});
  }

  // What a document's text needs, measured in the document itself: the page's
  // own fonts, styles and canvases are what its runs are drawn with.
  async function measureDocument({ doc, view, context, geometry, inner }) {
    const { keys, runs, skips } = textNeeds(doc, view);
    const overlays = context === undefined ? OVERLAYS : [];

    // Each inline <svg> in the view (the annotation layer apart), as its own element in the
    // document reads it, and the runs of its text, to be measured with the rest.
    const svgs = new Map();
    for (const l of inlineSvgsIn(doc, view)) {
      let object;
      try {
        ({ object } = await conn.send("DOM.resolveNode", { backendNodeId: l.node.backendNodeId }));
        const { result, exceptionDetails } = await conn.send("Runtime.callFunctionOn", {
          objectId: object.objectId,
          functionDeclaration: String(inlineSvg),
          arguments: [{ value: { skip: OVERLAYS.join(",") } }],
          awaitPromise: true,
          returnByValue: true,
        });
        if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
        if (result.value) svgs.set(l.key, result.value);
      } catch (error) {
        // An element that has gone since the snapshot, or that the page's script cannot read: the picture says so.
        svgs.set(l.key, { failed: String(error.message ?? error) });
      } finally {
        if (object) await conn.send("Runtime.releaseObject", { objectId: object.objectId }).catch(() => {});
      }
    }
    const known = new Set(runs.map(([key, text]) => `${key}\u0000${text}`));
    for (const { texts = [] } of svgs.values()) {
      for (const { key, text } of texts) {
        if (!keys.includes(key)) keys.push(key);
        if (!known.has(`${key}\u0000${text}`)) {
          known.add(`${key}\u0000${text}`);
          runs.push([key, text]);
        }
      }
    }

    const args = JSON.stringify({ keys, runs, skips, view, measureId: MEASURE_ID, overlays });
    const page = await run(context, `(${measure})(${args})`, true);
    // The measuring layer's runs, as DevTools nodes, for the fonts Chromium drew them with.
    const { result: layer } = await conn.send("Runtime.evaluate", {
      expression: `document.getElementById(${JSON.stringify(MEASURE_ID)})`,
      contextId: context,
    });
    const platform = new Map();
    try {
      const { nodeId } = await conn.send("DOM.requestNode", { objectId: layer.objectId });
      const { nodeIds } = await conn.send("DOM.querySelectorAll", { nodeId, selector: "span[data-k]" });
      for (const [k, id] of nodeIds.entries()) {
        const { fonts: used } = await conn.send("CSS.getPlatformFontsForNode", { nodeId: id });
        const [key, text] = page.allRuns[k];
        platform.set(`${key}\u0000${text}`, used);
      }
    } finally {
      await conn.send("Runtime.releaseObject", { objectId: layer.objectId }).catch(() => {});
    }

    // The files of each web font a run was drawn with, which the document's rules pick
    // for the run's font (by the names the document gives, and not the font's own): of a
    // family split into files by unicode-range, those whose range holds a character of
    // the run. Their bytes are read once per connection and origin.
    const origin = new URL(doc.url).origin;
    const custom = new Map();
    for (const [id, used] of platform) {
      if (!used.some((f) => f.isCustomFont)) continue;
      const [key, text] = id.split("\u0000");
      custom.set(key, [...(custom.get(key) ?? []), text]);
    }
    const rules = custom.size ? await run(context, `(${webFontFiles})(${JSON.stringify([...custom.keys()])})`) : {};
    for (const [key, texts] of custom) {
      for (const file of texts.flatMap((text) => webRulesFor(rules[key] ?? [], text))) {
        const cached = `${origin}|${file.url}`;
        if (conn.svgWebFonts.has(cached)) continue;
        const data = await run(context, `(${webFontData})(${JSON.stringify(file.url)})`, true);
        // Named by its bytes, so that one font the page and a frame both use is one face of the picture.
        conn.svgWebFonts.set(cached, data && { family: createHash("sha1").update(data).digest("hex"), data });
      }
    }
    // What the bundle keeps of them: for each font key, the rules some run of it was drawn
    // with, in the page's order (webRulesFor decides from that order which rule draws a
    // character), each naming its file by `family` (null: the file could not be read);
    // and the files' bytes once, by that name.
    const webFonts = {};
    const fontFiles = {};
    for (const [key, texts] of custom) {
      if (!rules[key]) continue;
      const drawn = new Set(texts.flatMap((text) => webRulesFor(rules[key], text)));
      webFonts[key] = rules[key]
        .filter((rule) => drawn.has(rule))
        .map(({ url, range, lo, hi }) => {
          const font = conn.svgWebFonts.get(`${origin}|${url}`);
          if (font) fontFiles[font.family] = font.data;
          return { family: font ? font.family : null, range, lo, hi };
        });
    }

    // Each scrolling box's scrollbar styles, and the frame's viewport's.
    const scrollbars = new Map();
    const partsOf = async (l, nodes, viewport) => {
      for (const node of nodes) {
        if (!node.backendNodeId) continue;
        const { object } = await conn.send("DOM.resolveNode", { backendNodeId: node.backendNodeId });
        try {
          const { result } = await conn.send("Runtime.callFunctionOn", {
            objectId: object.objectId,
            functionDeclaration: String(scrollbarParts),
            arguments: [{ value: { styleNames: PART_STYLES, parts: scrollbarPartList(l), viewport } }],
            returnByValue: true,
          });
          scrollbars.set(l.key, result.value);
          if (result.value.custom) return;
        } finally {
          await conn.send("Runtime.releaseObject", { objectId: object.objectId }).catch(() => {});
        }
      }
    };
    for (const { l } of scrollersIn(doc, view)) await partsOf(l, [l.node], false);
    const bars = geometry && viewportScroller(doc, geometry, inner);
    if (bars) await partsOf(bars, viewportStyleSources(doc), true);

    return {
      page,
      skips,
      platform: [...platform],
      webFonts,
      fontFiles,
      svgs: [...svgs],
      scrollbars: [...scrollbars],
      inner,
    };
  }

  return {
    version: BUNDLE_VERSION,
    styles: SNAPSHOT_STYLES,
    view,
    background,
    // Cut down to what the picture is drawn from: the same picture, a bundle about half the size.
    snapshot: trimSnapshot(snapshot, view, SNAPSHOT_STYLES),
    docs: [...measured.values()],
  };
}
