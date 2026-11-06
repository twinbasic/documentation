// What capture.mjs keeps of a DOM snapshot, and the version of what it keeps: the part of
// bundle.mjs that needs no Node, since the Chrome extension (chrome/) runs capture.mjs too.

import { parseShadows } from "./snapshot-svg.mjs";

/**
 * The format of a bundle; one of another version is not read. Version 2 keeps a
 * web font as its rules and files (webFonts, fontFiles) where version 1 kept the
 * one file picked, and adds the inline <svg>s. Version 3 keeps every rule whose range
 * holds a character a run draws (webRulesFor since 4e05975c), where version 2 kept the
 * last: a family the page declares twice (codicon) was drawn from one file.
 */
export const BUNDLE_VERSION = 3;

// How far past a layout object's box its painting can reach, beyond its shadows
// and its outline: a glyph's overhang, a focus ring.
const REACH = 8;

/**
 * The snapshot cut down to what a picture of `view` (page CSS px) draws from, and
 * the same picture: the layout objects whose box, with its shadows and outline,
 * comes near the view, every layout object of an element one of them belongs to,
 * and those of all their ancestors (an ancestor gives its styles, clip,
 * transform, opacity and stacking); a frame's document only when its <iframe>
 * keeps a layout object; the text of a <style> and a <script> emptied; and the
 * strings no longer used dropped. Every DOM node is kept, so that a <select>'s
 * options and a control's text are there. `styles` are the names of the
 * snapshot's computed styles, in order.
 */
export function trimSnapshot(snapshot, view, styles) {
  const S = snapshot.strings;
  const at = (name) => styles.indexOf(name);
  const [shadowAt, widthAt, offsetAt] = ["box-shadow", "outline-width", "outline-offset"].map(at);
  const px = (v) => Number.parseFloat(v) || 0;
  const near = ([x, y, w, h], st) => {
    const shadow = parseShadows(S[st[shadowAt]] ?? "none").reduce(
      (m, s) => Math.max(m, s.blur * 1.5 + s.spread + Math.abs(s.x) + Math.abs(s.y)),
      0,
    );
    const r = shadow + Math.abs(px(S[st[offsetAt]])) + px(S[st[widthAt]]) + REACH;
    return x - r < view.x + view.w && x + w + r > view.x && y - r < view.y + view.h && y + h + r > view.y;
  };
  // A document of a frame and the node of the <iframe> it is drawn in, in its parent's document.
  const owners = new Map();
  for (const [di, d] of snapshot.documents.entries()) {
    const c = d.nodes.contentDocumentIndex;
    for (const [k, n] of (c?.index ?? []).entries()) owners.set(c.value[k], { di, n });
  }
  const keptNodes = snapshot.documents.map(() => new Set());
  const docs = snapshot.documents.map((d, di) => {
    const L = d.layout;
    const N = d.nodes;
    const owner = owners.get(di);
    let keep;
    if (di === 0) {
      const nodes = new Set();
      for (const [li, n] of L.nodeIndex.entries()) if (near(L.bounds[li], L.styles[li])) nodes.add(n);
      for (const n of [...nodes]) for (let a = N.parentIndex[n]; a >= 0; a = N.parentIndex[a]) nodes.add(a);
      keep = L.nodeIndex.map((n) => nodes.has(n));
      keptNodes[di] = nodes;
    } else {
      // A frame's document is in its own coordinates: it is kept whole, or not at all.
      const shown = owner && keptNodes[owner.di].has(owner.n);
      keep = L.nodeIndex.map(() => shown);
      keptNodes[di] = shown ? new Set(L.nodeIndex) : new Set();
    }
    // Each layout object kept keeps the index it had, which its key is made of (decodeSnapshot):
    // what was measured of it at the capture (its scrollbars) is found by that key.
    const layout = pick(L, keep);
    layout.originalIndex = (L.originalIndex ?? L.nodeIndex.map((_, li) => li)).filter((_, li) => keep[li]);
    return { ...d, nodes: emptyStyleText(N, S), layout, textBoxes: pickTextBoxes(d.textBoxes, keep) };
  });
  return compactStrings({ ...snapshot, documents: docs });
}

// The text nodes of <style> and <script> elements, which no picture draws, emptied.
function emptyStyleText(N, S) {
  const value = N.nodeValue.map((v, i) => {
    const p = N.parentIndex[i];
    const parent = p >= 0 ? S[N.nodeName[p]] : null;
    return N.nodeType[i] === 3 && (parent === "STYLE" || parent === "SCRIPT") ? -1 : v;
  });
  return { ...N, nodeValue: value };
}

// The layout table's rows that `keep` says, every column alike: a column of one
// value per row, and a rare column ({index}) of row numbers, renumbered.
function pick(L, keep) {
  const map = [];
  let next = 0;
  for (const k of keep) map.push(k ? next++ : -1);
  const out = {};
  for (const [name, col] of Object.entries(L)) {
    if (Array.isArray(col) && col.length === keep.length) out[name] = col.filter((_, i) => keep[i]);
    else if (col && Array.isArray(col.index)) {
      const rows = col.index.map((r, k) => [map[r], k]).filter(([r]) => r >= 0);
      out[name] = { ...col, index: rows.map(([r]) => r) };
      if (Array.isArray(col.value)) out[name].value = rows.map(([, k]) => col.value[k]);
    } else out[name] = col;
  }
  return out;
}

function pickTextBoxes(T, keep) {
  const map = [];
  let next = 0;
  for (const k of keep) map.push(k ? next++ : -1);
  const rows = T.layoutIndex.map((l, k) => [map[l], k]).filter(([l]) => l >= 0);
  const out = { layoutIndex: rows.map(([l]) => l) };
  for (const name of Object.keys(T)) if (name !== "layoutIndex") out[name] = rows.map(([, k]) => T[name][k]);
  return out;
}

// The string table with only the strings still used, every reference renumbered:
// the documents' own strings, the nodes' names, values and attributes and their
// rare string columns, and the layout objects' styles and text.
const DOC_STRINGS = [
  "documentURL",
  "title",
  "baseURL",
  "contentLanguage",
  "encodingName",
  "publicId",
  "systemId",
  "frameId",
];
const RARE_STRINGS = [
  "textValue",
  "inputValue",
  "currentSourceURL",
  "originURL",
  "pseudoType",
  "pseudoIdentifier",
  "shadowRootType",
];
function compactStrings(snapshot) {
  const map = new Map();
  const strings = [];
  const id = (i) => {
    if (i === undefined || i === null || i < 0) return i;
    if (!map.has(i)) map.set(i, strings.push(snapshot.strings[i]) - 1);
    return map.get(i);
  };
  const documents = snapshot.documents.map((d) => {
    const out = { ...d };
    for (const k of DOC_STRINGS) if (k in d) out[k] = id(d[k]);
    const N = d.nodes;
    const nodes = { ...N, nodeName: N.nodeName.map(id), nodeValue: N.nodeValue.map(id) };
    if (N.attributes) nodes.attributes = N.attributes.map((a) => a.map(id));
    for (const k of RARE_STRINGS) if (N[k]) nodes[k] = { ...N[k], value: N[k].value.map(id) };
    out.nodes = nodes;
    const L = d.layout;
    out.layout = { ...L, styles: L.styles.map((st) => st.map(id)), text: L.text.map(id) };
    return out;
  });
  return { ...snapshot, strings, documents };
}
