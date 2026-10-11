// Spike: the fonts an SVG picture's text is drawn in, embedded as subsets.
//
// Chromium names, per node, the font files it drew the node's text with
// (CSS.getPlatformFontsForNode). Each file becomes one private face of the
// picture, "f0", "f1", ...; a run of text lists its faces in the order
// Chromium preferred them, and every character is given to the first face that
// has it -- which is the choice a viewer's own fallback then makes too. At the
// end each face is cut down to exactly the characters given to it, by
// scripts/subset_font.py (fontTools), so the picture carries nothing more.
//
// A web font may be split into files by unicode-range, one @font-face rule for
// each: a run is then drawn with every file whose range holds one of its
// characters (webRulesFor), and each of those files has only the characters of
// its own range, so that a character both files have glyphs for goes to the file
// the browser drew it with.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { REPO_ROOT } from "../../lib/repo-paths.mjs";

const SUBSET_SCRIPT = path.join(REPO_ROOT, "scripts", "subset_font.py");

// --- the subset cache -------------------------------------------------------------

// A cut is the same bytes for the same job (subset_font.py keeps the font's own
// timestamp), and a picture drawn again mostly cuts what it cut before: so each
// result is kept, in a folder replay.mjs and shoot_docs.mjs --svg name, under a
// hash of everything that decides it -- the font (its file's path, face, size and
// time, or a web font's bytes), the weight a variable font is cut at, the
// characters, the hinting, and subset_font.py itself.
let subsetCache = null;

/** Keep the fonts' cuts in `dir` from now on (null: no cache). */
export function useSubsetCache(dir) {
  subsetCache = dir;
  if (dir) fs.mkdirSync(dir, { recursive: true });
}

let scriptHash = null;
export function subsetKey(job) {
  scriptHash ??= sha1(fs.readFileSync(SUBSET_SCRIPT));
  let font;
  if (job.path) {
    const st = fs.statSync(job.path);
    font = { path: job.path, index: job.index, size: st.size, time: st.mtimeMs };
  } else font = { data: sha1(job.data), weight: job.weight };
  return sha1(JSON.stringify({ script: scriptHash, font, unicodes: job.unicodes, hinting: job.hinting }));
}

const sha1 = (v) => createHash("sha1").update(v).digest("hex");

function cachedCut(key) {
  try {
    return JSON.parse(fs.readFileSync(path.join(subsetCache, `${key}.json`), "utf8"));
  } catch {
    return null;
  }
}

// Written beside and renamed into place, so that a picture drawn at the same time
// never reads half a file.
function keepCut(key, result) {
  const file = path.join(subsetCache, `${key}.json`);
  const temp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}`;
  fs.writeFileSync(temp, JSON.stringify(result));
  fs.renameSync(temp, file);
}

// --- reading a font's tables ----------------------------------------------------

// The tags a WOFF2 table directory names by number (WOFF2 spec, 5.1); 63 says
// the tag follows.
const WOFF2_TAGS = (
  "cmap head hhea hmtx maxp name OS/2 post cvt fpgm glyf loca prep CFF VORG EBDT EBLC gasp hdmx kern LTSH PCLT VDMX " +
  "vhea vmtx BASE GDEF GPOS GSUB EBSC JSTF MATH CBDT CBLC COLR CPAL SVG sbix acnt avar bdat bloc bsln cvar fdsc feat " +
  "fmtx fvar gvar hsty just lcar mort morx opbd prop trak Zapf Silf Glat Gloc Feat Sill"
)
  .split(" ")
  .map((t) => t.padEnd(4, " "));

// The tables of a WOFF2 font that the readers below use, and that WOFF2 does not transform.
const WOFF2_READ = new Set(["cmap", "OS/2", "fvar"]);

/**
 * `buf` as something `cmapCoverage`, `faceStyle` and `isVariable` can read: a
 * WOFF2 font is read into a minimal sfnt that holds only the tables they use
 * (WOFF2 compresses all the tables as one brotli stream, which Node inflates;
 * only glyf, loca and hmtx are transformed), and any other font is returned
 * as it is.
 */
export function readable(buf) {
  if (buf.toString("latin1", 0, 4) !== "wOF2") return buf;
  const count = buf.readUInt16BE(12);
  let p = 48;
  const base128 = () => {
    let v = 0;
    for (let i = 0; i < 5; i++) {
      const b = buf[p++];
      v = v * 128 + (b & 0x7f);
      if (!(b & 0x80)) break;
    }
    return v;
  };
  const list = [];
  for (let i = 0; i < count; i++) {
    const flags = buf[p++];
    const index = flags & 0x3f;
    const tag = index === 63 ? buf.toString("latin1", p, (p += 4)) : WOFF2_TAGS[index];
    const version = flags >> 6;
    const original = base128();
    // glyf and loca are transformed unless their version is 3, the other tables if it is not 0.
    const transformed = tag === "glyf" || tag === "loca" ? version !== 3 : version !== 0;
    list.push({ tag, length: transformed ? base128() : original });
  }
  const data = zlib.brotliDecompressSync(buf.subarray(p, p + buf.readUInt32BE(20)));
  const kept = [];
  let at = 0;
  for (const t of list) {
    if (WOFF2_READ.has(t.tag)) kept.push({ tag: t.tag, bytes: data.subarray(at, at + t.length) });
    at += t.length;
  }
  const head = Buffer.alloc(12 + 16 * kept.length);
  head.writeUInt32BE(0x00010000, 0);
  head.writeUInt16BE(kept.length, 4);
  let offset = head.length;
  for (const [i, t] of kept.entries()) {
    head.write(t.tag, 12 + 16 * i, "latin1");
    head.writeUInt32BE(offset, 12 + 16 * i + 8);
    head.writeUInt32BE(t.bytes.length, 12 + 16 * i + 12);
    offset += t.bytes.length;
  }
  return Buffer.concat([head, ...kept.map((t) => t.bytes)]);
}

/** Whether the font in `buf` (as `readable` gives it) has variation axes. */
export function isVariable(buf, index = 0) {
  return tables(buf, index).has("fvar");
}

function tables(buf, index) {
  const off = buf.toString("latin1", 0, 4) === "ttcf" ? buf.readUInt32BE(12 + 4 * index) : 0;
  const out = new Map();
  for (let i = 0; i < buf.readUInt16BE(off + 4); i++) {
    const p = off + 12 + i * 16;
    out.set(buf.toString("latin1", p, p + 4), { offset: buf.readUInt32BE(p + 8), length: buf.readUInt32BE(p + 12) });
  }
  return out;
}

// The PostScript name (name ID 6) of face `index`.
function postScriptName(buf, index) {
  const t = tables(buf, index).get("name");
  if (!t) return null;
  const base = t.offset;
  const strings = base + buf.readUInt16BE(base + 4);
  let mac = null;
  for (let r = 0; r < buf.readUInt16BE(base + 2); r++) {
    const p = base + 6 + r * 12;
    if (buf.readUInt16BE(p + 6) !== 6) continue;
    const s = strings + buf.readUInt16BE(p + 10);
    const e = s + buf.readUInt16BE(p + 8);
    if (buf.readUInt16BE(p) === 3) return Buffer.from(buf.subarray(s, e)).swap16().toString("utf16le");
    if (buf.readUInt16BE(p) === 1) mac = buf.toString("latin1", s, e);
  }
  return mac;
}

/** Face `index`'s own weight class and italic flag, from its OS/2 table. */
export function faceStyle(buf, index = 0) {
  const t = tables(buf, index).get("OS/2");
  if (!t) return { weight: 400, italic: false };
  return { weight: buf.readUInt16BE(t.offset + 4), italic: (buf.readUInt16BE(t.offset + 62) & 0x201) !== 0 };
}

/** Every code point face `index` of the font in `buf` maps to a glyph. */
export function cmapCoverage(buf, index = 0) {
  const out = new Set();
  const t = tables(buf, index).get("cmap");
  if (!t) return out;
  const base = t.offset;
  let best = 0;
  let rank = 0;
  for (let i = 0; i < buf.readUInt16BE(base + 2); i++) {
    const p = base + 4 + i * 8;
    const sub = base + buf.readUInt32BE(p + 4);
    const format = buf.readUInt16BE(sub);
    const r = format === 12 ? 3 : format === 4 && buf.readUInt16BE(p) === 3 ? 2 : format === 4 ? 1 : 0;
    if (r > rank) [best, rank] = [sub, r];
  }
  if (!rank) return out;
  if (buf.readUInt16BE(best) === 12) {
    for (let g = 0; g < buf.readUInt32BE(best + 12); g++) {
      const p = best + 16 + g * 12;
      const first = buf.readUInt32BE(p);
      const gid = buf.readUInt32BE(p + 8);
      for (let c = first; c <= buf.readUInt32BE(p + 4); c++) if (gid + c - first) out.add(c);
    }
    return out;
  }
  const segs = buf.readUInt16BE(best + 6) / 2;
  const ends = best + 14;
  const starts = ends + segs * 2 + 2;
  const deltas = starts + segs * 2;
  const ranges = deltas + segs * 2;
  for (let s = 0; s < segs; s++) {
    const end = buf.readUInt16BE(ends + 2 * s);
    const delta = buf.readInt16BE(deltas + 2 * s);
    const ro = buf.readUInt16BE(ranges + 2 * s);
    for (let c = buf.readUInt16BE(starts + 2 * s); c <= end && c !== 0xffff; c++) {
      let gid = ro ? buf.readUInt16BE(ranges + 2 * s + ro + 2 * (c - buf.readUInt16BE(starts + 2 * s))) : c;
      if (gid) gid = (gid + delta) & 0xffff;
      if (gid) out.add(c);
    }
  }
  return out;
}

// --- web fonts split by unicode-range ---------------------------------------------------

/**
 * The code point ranges of a `unicode-range` descriptor, as [from, to] pairs:
 * "U+0-FF, U+131, U+4??". A descriptor that is empty, or has a token that is no
 * range, is every code point: an invalid descriptor is ignored, and its initial
 * value is U+0-10FFFF.
 */
export function parseUnicodeRange(text) {
  const all = [[0, 0x10ffff]];
  if (!text?.trim()) return all;
  const out = [];
  for (const token of text.split(",")) {
    const m = /^\s*u\+([0-9a-f?]{1,6})(?:-([0-9a-f]{1,6}))?\s*$/i.exec(token);
    if (!m || (m[2] !== undefined && m[1].includes("?"))) return all;
    if (m[1].includes("?"))
      out.push([Number.parseInt(m[1].replace(/\?/g, "0"), 16), Number.parseInt(m[1].replace(/\?/g, "f"), 16)]);
    else out.push([Number.parseInt(m[1], 16), Number.parseInt(m[2] ?? m[1], 16)]);
  }
  return out;
}

/**
 * Of the @font-face rules of one family and one style and weight, `rules` in
 * the order the page declares them ({range, ...}, `range` the rule's
 * unicode-range text), the ones a browser draws `text` with: for each character,
 * the last rule whose range holds it (a later rule wins where ranges overlap),
 * as Chromium looks it up in a font split into files by range. A character no
 * rule holds is drawn in the next family of the list, which is not a web font.
 * Later rules come first, so that a character both files have goes to the later,
 * as PictureFonts.css gives it to the first face that has it.
 */
export function webRulesFor(rules, text) {
  const ranges = rules.map((r) => parseUnicodeRange(r.range));
  const chosen = new Set();
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    for (let i = rules.length - 1; i >= 0; i--) {
      if (ranges[i].some(([from, to]) => cp >= from && cp <= to)) {
        chosen.add(i);
        break;
      }
    }
  }
  return [...chosen].sort((a, b) => b - a).map((i) => rules[i]);
}

/** Map from PostScript name to {file, index} for every font installed for this user. */
export function systemFonts() {
  const dirs = [path.join(process.env.WINDIR ?? "C:/Windows", "Fonts")];
  if (process.env.LOCALAPPDATA) dirs.push(path.join(process.env.LOCALAPPDATA, "Microsoft", "Windows", "Fonts"));
  const index = new Map();
  for (const dir of dirs) {
    let names = [];
    try {
      names = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const n of names) {
      if (!/\.(ttf|otf|ttc)$/i.test(n)) continue;
      const file = path.join(dir, n);
      try {
        const buf = fs.readFileSync(file);
        const count = buf.toString("latin1", 0, 4) === "ttcf" ? buf.readUInt32BE(8) : 1;
        for (let k = 0; k < count; k++) {
          const ps = postScriptName(buf, k);
          if (ps && !index.has(ps)) index.set(ps, { file, index: k });
        }
      } catch {
        // An unreadable or malformed file is not a font this tool can use.
      }
    }
  }
  return index;
}

// --- the picture's faces ----------------------------------------------------------

export class PictureFonts {
  constructor({ python = process.env.PYTHON ?? "python", hinting = true } = {}) {
    this.python = python;
    this.hinting = hinting;
    this.system = null;
    this.loaded = new Map();
    // What was read of each web font, by its name: {buf (readable), variable}.
    this.web = new Map();
    this.faces = [];
  }

  /**
   * A source is {ps} for an installed font or {family, data, weight} for a web
   * font (a data: URL; `family` names it, and `weight` is the weight the run
   * asks for). A web font with a weight axis becomes one face for each weight
   * the picture draws it at, cut at that weight: a variable font cannot be
   * given a weight from a face rule's own.
   */
  load(src) {
    let key = src.ps ? `ps:${src.ps}` : `web:${src.family}`;
    const weight = Number(src.weight) || 400;
    let web = null;
    if (!src.ps && src.data) {
      if (!this.web.has(src.family)) {
        const buf = readable(Buffer.from(src.data.slice(src.data.indexOf(",") + 1), "base64"));
        this.web.set(src.family, { buf, variable: isVariable(buf) });
      }
      web = this.web.get(src.family);
      if (web.variable) key += `@${weight}`;
    }
    if (this.loaded.has(key)) return this.loaded.get(key);
    let face = null;
    if (src.ps) {
      this.system ??= systemFonts();
      const hit = this.system.get(src.ps);
      if (hit) {
        const buf = fs.readFileSync(hit.file);
        face = {
          job: { path: hit.file, index: hit.index },
          covers: cmapCoverage(buf, hit.index),
          ...faceStyle(buf, hit.index),
        };
      }
    } else if (web) {
      const data = src.data.slice(src.data.indexOf(",") + 1);
      face = { job: { data }, covers: cmapCoverage(web.buf), ...faceStyle(web.buf) };
      // Cut at the weight asked for, so the face is exactly that weight.
      if (web.variable) Object.assign(face, { job: { data, weight }, weight });
    }
    if (face) {
      Object.assign(face, { name: `f${this.faces.length}`, used: new Set([0x20]) });
      this.faces.push(face);
    }
    this.loaded.set(key, face);
    return face;
  }

  /**
   * The CSS a run needs to be drawn in its faces, with each character of
   * `text` recorded against the first face that has it; null when none of the
   * run's fonts can be loaded. A source that names a `range` (the unicode-range
   * text of the @font-face rule it is, for a web font split into files) is the
   * face of only the characters in that range, however many more its font has:
   * a browser draws a character with the file whose rule holds it, and the
   * other file may have a glyph for it too. `weight` and `style` are the
   * computed ones: like Blink (FontPlatformData), a weight of 600 or more on a
   * face lighter than that is emboldened, and italic on an upright face is
   * slanted, so only then does the run ask for bold or italic -- a face
   * declared without descriptors is normal, and the viewer synthesises the same
   * way.
   */
  css(text, sources, weight, style) {
    const owned = sources
      .map((s) => ({ face: this.load(s), ranges: s.range === undefined ? null : parseUnicodeRange(s.range) }))
      .filter((o) => o.face);
    if (!owned.length) return null;
    const takes = (cp) =>
      owned.find((o) => o.face.covers.has(cp) && (!o.ranges || o.ranges.some(([from, to]) => cp >= from && cp <= to)));
    // A font that two rules name is one face, listed once. Every face keeps a space, and a
    // viewer draws a space with the first face of the list that has one, so with ranges the
    // face whose range holds the space comes first.
    const first = owned.some((o) => o.ranges) ? takes(0x20)?.face : undefined;
    const faces = [...new Set([first, ...owned.map((o) => o.face)].filter(Boolean))];
    for (const ch of text) {
      const cp = ch.codePointAt(0);
      (takes(cp)?.face ?? faces[0]).used.add(cp);
    }
    const [primary] = faces;
    const bold = Number(weight) >= 600 && primary.weight < 600;
    const slant = style !== "normal" && !primary.italic;
    // Stated even when normal: the run may sit where a weight is inherited (the
    // annotation layer's text asks for 600, and gets the Semibold face).
    return `font-family:${faces.map((f) => `"${f.name}"`).join(",")};font-weight:${bold ? "bold" : "normal"};font-style:${slant ? "italic" : "normal"}`;
  }

  /**
   * One @font-face rule per face a run drew with, each a subset of what it
   * drew. Asynchronous: shoot_docs runs several IDEs on one event loop, and a
   * blocking subprocess would stall all of them.
   */
  async faceRules() {
    const used = this.faces.filter((f) => f.used.size > 1);
    if (!used.length) return "";
    const jobs = used.map((f) => ({ ...f.job, unicodes: [...f.used].sort((a, b) => a - b), hinting: this.hinting }));
    const keys = jobs.map((j) => (subsetCache ? subsetKey(j) : null));
    const results = keys.map((k) => (k ? cachedCut(k) : null));
    const todo = results.flatMap((r, i) => (r ? [] : [i]));
    if (todo.length) {
      const fresh = await this.cut(todo.map((i) => jobs[i]));
      for (const [k, i] of todo.entries()) {
        results[i] = fresh[k];
        if (keys[i]) keepCut(keys[i], fresh[k]);
      }
    }
    // A font fontTools cannot cut gets no rule: its text falls back to the viewer's
    // own font, which the comparison with the PNG then judges, and the run says why.
    this.failed = results.filter((r) => r.error).map((r) => r.error);
    return used
      .map((f, i) =>
        results[i].woff2
          ? `@font-face{font-family:"${f.name}";src:url(data:font/woff2;base64,${results[i].woff2})}`
          : "",
      )
      .join("");
  }

  /** The cuts of `jobs` by subset_font.py, in order: {woff2} or {error} each. */
  async cut(jobs) {
    const stdout = await new Promise((resolve, reject) => {
      const child = spawn(this.python, [SUBSET_SCRIPT], { windowsHide: true });
      const out = [];
      const err = [];
      child.stdout.on("data", (d) => out.push(d));
      child.stderr.on("data", (d) => err.push(d));
      child.on("error", (e) => reject(new Error(`subset_font.py could not run: ${e.message}`)));
      child.on("close", (code) => {
        if (code === 0) resolve(Buffer.concat(out).toString("utf8"));
        else reject(new Error(`subset_font.py failed: ${Buffer.concat(err).toString("utf8").trim()}`));
      });
      child.stdin.end(JSON.stringify(jobs));
    });
    return JSON.parse(stdout);
  }
}

/** Where renderSvg leaves the picture's @font-face rules to be filled in. */
export const FACES_MARK = "/*@font-face*/";

/** `svg` with its @font-face rules filled in: the subsets of what `fonts` drew. */
export async function withFaces(svg, fonts) {
  return svg.replace(FACES_MARK, fonts ? await fonts.faceRules() : "");
}
