// Teach Graphviz what Inter actually measures.
//
// Graphviz has no font machinery. The WASM build carries zero occurrences of
// pango, fontconfig, freetype or harfbuzz -- only the built-in core-
// PostScript width tables from `lib/common/textspan_lut.c`:
//
//     struct FontFamilyMetrics {
//       const char **font_name;
//       double units_per_em;
//       short widths_regular[128], widths_bold[128],
//             widths_italic[128], widths_bold_italic[128];
//     };
//
// `get_metrics_for_font_family()` matches names permissively and falls back
// to Times for anything it does not know, so `fontname="Inter"` measures
// byte-identically to `fontname="NoSuchFontXYZ"`. Times is much narrower than
// Inter through the lowercase -- Inter's `a` is 557/1000 em against Times'
// 444 -- so every box came out too small: 11.4% under on average, 18.0% at
// worst, which put 27 labels past their box edges across the three diagrams
// that shipped before this existed.
//
// WHAT THIS DOES.  After `Graphviz.load()`, the table lives in the module's
// linear memory, which `_module.HEAPU8` exposes, and it is read on every
// layout rather than cached -- so overwriting the Times family's four arrays
// with Inter's advances is enough, and Inter's own fallback to Times is what
// routes the lookup there. Verified end to end by `assertMeasuresInter()`
// below, which lays out a real string and checks the resulting box.
//
// WHY NOT RECOMPILE.  Adding an `Inter` entry to `all_font_metrics` upstream
// is the tidier fix and is upstreamable to Graphviz, but it needs an
// emscripten toolchain plus @hpcc-js's packaging to rebuild the WASM, and
// `npm install` would stop being enough to build the docs -- which is exactly
// what dot.mjs's setup-failure path exists to preserve. This gets the same
// numbers with no toolchain and no fork. If the source route is ever taken,
// builder/inter-metrics.json is already the table it needs.
//
// WHAT THE ASSERTIONS HERE DO AND DO NOT COVER.  They answer "did the table
// we have get installed", not "is the table right". `assertBytesLanded()`
// compares the heap against inter-metrics.json and `assertMeasuresInter()`
// derives its expectation from the same file, so a wrong-but-well-formed
// width passes both -- verified by corrupting one entry and watching nothing
// fire. Two other gates cover that case: `build_dot_metrics.mjs --check`
// reports the file stale against the committed fonts, and
// `scripts/check_dot_fit.mjs` catches any label the bad width pushes out of
// its box. Don't fold those jobs in here; they need a browser.
//
// WHAT WILL BREAK IT.  An @hpcc-js/wasm-graphviz bump that changes the table.
// That is deliberate: `locateTimesFamily()` asserts an exact match against
// the Times AFM widths and an exact hit count, so a bump fails loudly instead
// of silently reverting to Times metrics. See WIP.Typography.md, "Teaching
// Graphviz what Inter measures".

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const METRICS = require("./inter-metrics.json");

// Times-Roman AFM widths for ASCII 33..46, in 2048ths of an em -- the
// signature the table is found by. These are stable published values
// (`!`=333, `"`=408, `#`=500 ... `.`=250 per 1000), not measurements.
const TIMES_SIGNATURE = [682, 836, 1024, 1024, 1706, 1593, 369, 682, 682, 1024, 1155, 512, 682, 512];
const SIGNATURE_FIRST_CHAR = 33;

// Verified separately per array, so a table that matched on its regular
// widths but had a different variant order would still be caught.
const TIMES_SPOT_CHECKS = [
  { variant: 0, ch: "A", afm: 722 }, { variant: 0, ch: "a", afm: 444 },
  { variant: 1, ch: "A", afm: 722 }, { variant: 1, ch: "a", afm: 500 },
  { variant: 2, ch: "A", afm: 611 }, { variant: 2, ch: "a", afm: 500 },
  { variant: 3, ch: "A", afm: 667 }, { variant: 3, ch: "a", afm: 500 },
];

const VARIANT_ORDER = ["regular", "bold", "italic", "boldItalic"];
const ARRAY_LEN = 128;
const ARRAY_BYTES = ARRAY_LEN * 2;

export class DotMetricsError extends Error {}

// `Graphviz.load()` memoises its module, so serve.bat's second and every
// later rebuild hand back the instance already patched. Searching that heap
// for the Times signature finds nothing -- Inter's widths are sitting where
// it used to be -- and the failure reads like an upstream bump, which is the
// wrong place to go looking. Remember what has been patched instead, and
// re-verify rather than re-write.
const patched = new WeakSet();

/**
 * Overwrite the Times family's width tables with Inter's advances.
 * Idempotent: a repeat call on the same instance re-verifies and returns.
 * Returns a short summary for the build log.
 */
export function applyInterMetrics(graphviz) {
  if (patched.has(graphviz)) {
    assertMeasuresInter(graphviz);
    return { alreadyPatched: true };
  }
  const heap = graphviz?._module?.HEAPU8;
  if (!heap) {
    throw new DotMetricsError(
      "@hpcc-js/wasm-graphviz no longer exposes _module.HEAPU8; " +
      "Inter metrics cannot be installed (see builder/dot-metrics.mjs)",
    );
  }
  if (METRICS.unitsPerEm !== 2048) {
    throw new DotMetricsError(
      `builder/inter-metrics.json declares unitsPerEm ${METRICS.unitsPerEm}; ` +
      "the Times family Graphviz falls back to uses 2048",
    );
  }

  const view = new DataView(heap.buffer, heap.byteOffset, heap.byteLength);
  const base = locateTimesFamily(view);

  const before = readAfm(view, base, 0, "a");
  for (let v = 0; v < VARIANT_ORDER.length; v++) {
    const widths = METRICS.widths[VARIANT_ORDER[v]];
    if (!Array.isArray(widths) || widths.length !== ARRAY_LEN) {
      throw new DotMetricsError(`inter-metrics.json: ${VARIANT_ORDER[v]} is not a ${ARRAY_LEN}-entry array`);
    }
    for (let i = 0; i < ARRAY_LEN; i++) {
      view.setInt16(base + v * ARRAY_BYTES + i * 2, widths[i], true);
    }
  }
  const after = readAfm(view, base, 0, "a");

  assertBytesLanded(view, base);
  assertMeasuresInter(graphviz);
  patched.add(graphviz);
  return { base, sample: { char: "a", timesAfm: before, interAfm: after } };
}

// Find widths_regular[0]. Requires exactly one match: a second would mean the
// signature no longer identifies the Times family uniquely, and patching the
// wrong one would silently do nothing.
function locateTimesFamily(view) {
  const hits = [];
  const end = view.byteLength - TIMES_SIGNATURE.length * 2;
  for (let off = 0; off <= end; off += 2) {
    let ok = true;
    for (let i = 0; i < TIMES_SIGNATURE.length; i++) {
      if (view.getInt16(off + i * 2, true) !== TIMES_SIGNATURE[i]) { ok = false; break; }
    }
    if (ok) hits.push(off - SIGNATURE_FIRST_CHAR * 2);
    if (hits.length > 4) break;
  }
  if (hits.length !== 1) {
    throw new DotMetricsError(
      `expected exactly one Times width table in the Graphviz heap, found ${hits.length}. ` +
      "@hpcc-js/wasm-graphviz has probably changed; re-derive the signature " +
      "(see builder/dot-metrics.mjs) before trusting DOT diagram geometry.",
    );
  }
  const base = hits[0];
  for (const { variant, ch, afm } of TIMES_SPOT_CHECKS) {
    const got = readAfm(view, base, variant, ch);
    if (Math.abs(got - afm) > 1) {
      throw new DotMetricsError(
        `Times table at 0x${base.toString(16)} has ${VARIANT_ORDER[variant]} '${ch}' = ${got}/1000, ` +
        `expected ${afm}. The struct layout has changed; do not patch blind.`,
      );
    }
  }
  return base;
}

function readAfm(view, base, variant, ch) {
  const raw = view.getInt16(base + variant * ARRAY_BYTES + ch.charCodeAt(0) * 2, true);
  return Math.round(raw / 2048 * 1000);
}

// Read all four arrays back. `assertMeasuresInter()` alone cannot stand in for
// this: it measures one probe string, and any character the probe happens not
// to use is unverified -- a partial write would pass it. This covers every
// entry, and costs 512 reads.
function assertBytesLanded(view, base) {
  for (let v = 0; v < VARIANT_ORDER.length; v++) {
    const want = METRICS.widths[VARIANT_ORDER[v]];
    for (let i = 0; i < ARRAY_LEN; i++) {
      const got = view.getInt16(base + v * ARRAY_BYTES + i * 2, true);
      if (got !== want[i]) {
        throw new DotMetricsError(
          `${VARIANT_ORDER[v]}[${i}] read back as ${got}, wrote ${want[i]}. ` +
          "The Graphviz heap did not keep the width table.",
        );
      }
    }
  }
}

// The end-to-end proof: lay a string out and check the box came back
// Inter-sized. This is what says the table Graphviz consults is the one that
// was patched, rather than that some bytes were written somewhere.
// This exercises the whole chain -- the `Inter` -> Times name fallback, the
// patched table, and the layout pass -- rather than trusting that writing
// bytes into the heap had the intended effect.
function assertMeasuresInter(graphviz) {
  const probe = "Hamburgefonstiv";
  const src = `digraph{node[shape=box margin=0 width=0 height=0 fontsize=2048 ` +
    `fontname="Inter"] N[label="${probe}"]}`;
  const svg = graphviz.layout(src, "svg", "dot");
  const m = svg.match(/viewBox="0\.00 0\.00 ([\d.]+) /);
  if (!m) throw new DotMetricsError("could not read a viewBox back from the metrics probe");
  const measured = parseFloat(m[1]) - 8; // 4pt of graph pad on each side

  let expected = 0;
  for (const ch of probe) expected += METRICS.widths.regular[ch.charCodeAt(0)];

  const err = Math.abs(measured - expected) / expected;
  if (err > 0.005) {
    throw new DotMetricsError(
      `Graphviz measured "${probe}" as ${measured.toFixed(1)} em units, expected ` +
      `${expected} from the Inter table (${(err * 100).toFixed(1)}% off). The patch did not take.`,
    );
  }
}
