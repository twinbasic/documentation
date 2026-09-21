// Graphviz/DOT preprocessor: regenerates `<name>.svg` from the matching
// `<name>.dot` source when the SVG is missing or older than its source.
// Runs as a seed task concurrently with the rest of the build so the
// freshly-emitted SVGs land in dispatch's site-paths set and the
// static-file copy pass.
//
// Sources are found anywhere under `<srcRoot>` rather than in one fixed
// folder, so a diagram can sit beside the page that uses it --
// `docs/Tutorials/CEF/Images/MonacoArchitecture.dot` next to
// `Driving Monaco.md` -- the way the rest of the tree is already
// organised. `**/*.dot` in _config.yml's exclude list is depth-
// independent, so a source is never published wherever it lives.
//
// Idempotent: a second build with no source changes is a no-op (mtime
// check). The `.dot` is the canonical source; the SVG is a build
// artifact -- editing the .dot by one character regenerates the SVG on
// the next build.
//
// Drives `@hpcc-js/wasm-graphviz` directly -- a WebAssembly build of
// Graphviz. No puppeteer, no headless Chromium, no in-tree patches.
// `Graphviz.load()` initialises the WASM module once per build (~50 ms);
// `gv.dot(src)` is synchronous after that.
//
// Failure modes split into three:
//   - SETUP (@hpcc-js/wasm-graphviz not installed): warn + leave on-disk
//     SVGs intact + return early with setupSkipped: true. The
//     orchestrator does NOT flip the exit code so a fresh checkout
//     without `npm install` still builds against the previous SVGs.
//   - METRICS (Inter widths could not be installed -- see
//     dot-metrics.mjs): warn + leave on-disk SVGs intact + flip the exit
//     code. Rendering anyway would silently fall back to Times metrics
//     and emit diagrams whose boxes are ~11% too small, so a stale but
//     correct SVG beats a fresh wrong one.
//   - CONTENT (one .dot has a syntax error, gv.dot throws): warn + keep
//     that diagram's old SVG + continue the rest of the batch. The
//     orchestrator (tbdocs.mjs) flips process.exitCode = 1 on the
//     returned `failed` count so a broken diagram surfaces in CI.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { applyInterMetrics } from "./dot-metrics.mjs";

export async function regenerateDot(srcRoot) {
  const sources = await listDotSources(srcRoot);
  if (sources.length === 0) {
    return { processed: 0, regenerated: 0, svgFiles: [] };
  }

  const stale = [];
  for (const src of sources) {
    const svg = svgFor(src);
    if (!(await isUpToDate(svg, src))) stale.push({ src, svg });
  }
  if (stale.length === 0) {
    return { processed: sources.length, regenerated: 0,
             svgFiles: await statSvgFiles(sources, srcRoot) };
  }

  let Graphviz;
  try {
    ({ Graphviz } = await import("@hpcc-js/wasm-graphviz"));
  } catch (err) {
    console.warn(
      `dot: skipped batch (${explainLoadFailure(err)}); existing SVGs retained`,
    );
    return { processed: sources.length, regenerated: 0, failed: 0, setupSkipped: true,
             svgFiles: await statSvgFiles(sources, srcRoot) };
  }

  let gv;
  try {
    gv = await Graphviz.load();
  } catch (err) {
    console.warn(
      `dot: skipped batch (WASM load failed: ${err.message}); existing SVGs retained`,
    );
    return { processed: sources.length, regenerated: 0, failed: 0, setupSkipped: true,
             svgFiles: await statSvgFiles(sources, srcRoot) };
  }

  // Graphviz measures with Times unless told otherwise, and the diagrams are
  // drawn in Inter. Install the real widths before laying anything out; if
  // that fails, emit nothing rather than a batch of under-sized boxes.
  try {
    applyInterMetrics(gv);
  } catch (err) {
    console.warn(
      `dot: skipped batch (Inter metrics unavailable: ${err.message}); existing SVGs retained`,
    );
    return { processed: sources.length, regenerated: 0, failed: stale.length,
             svgFiles: await statSvgFiles(sources, srcRoot) };
  }

  let regenerated = 0;
  let failed = 0;
  for (const { src, svg } of stale) {
    try {
      const source = await fs.readFile(src, "utf8");
      const svgXml = stripXmlPrologue(gv.dot(source), path.basename(src));
      await fs.writeFile(svg, svgXml, "utf8");
      regenerated++;
    } catch (err) {
      console.warn(
        `dot: skipped ${path.basename(src)} (${err.message}); existing SVG retained`,
      );
      failed++;
    }
  }
  return { processed: sources.length, regenerated, failed,
           svgFiles: await statSvgFiles(sources, srcRoot) };
}

async function statSvgFiles(sources, srcRoot) {
  const results = [];
  for (const src of sources) {
    const svgPath = svgFor(src);
    try {
      const stat = await fs.stat(svgPath);
      const srcRel = path.relative(srcRoot, svgPath).replace(/\\/g, "/");
      results.push({ srcPath: svgPath, srcRel, destRel: srcRel, size: stat.size });
    } catch {
      // SVG not on disk (render failed or never generated); skip.
    }
  }
  return results;
}

// Every `.dot` under srcRoot, at any depth. Underscore-prefixed directories
// are skipped for the same reason _config.yml's `exclude` skips them: they
// hold build output (`_site`, `_site-offline`, `_site-pdf`, `_serve`, `_pdf`)
// and source that is not itself a page. Walking into `_site*` would also mean
// rendering each diagram once per output tree.
async function listDotSources(srcRoot) {
  const found = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err) {
      if (err.code === "ENOENT") return;
      throw err;
    }
    for (const e of entries) {
      if (e.name.startsWith("_") || e.name.startsWith(".")) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.isFile() && e.name.endsWith(".dot")) found.push(full);
    }
  }
  await walk(srcRoot);
  found.sort();
  return found;
}

// Graphviz emits a standalone XML document: an XML declaration and an SVG 1.1
// DOCTYPE ahead of the root element. Both are wrong once the file is inlined,
// which is what happens to every one of these -- render.mjs's svgInlinePlugin
// drops the whole thing into the page, where an HTML parser turns the
// `<?xml ...?>` into a bogus comment node and discards the in-body DOCTYPE as
// a parse error. It rendered anyway, which is why it went unnoticed on the
// three diagrams that shipped with it.
//
// They buy nothing in a standalone file either: the XML declaration is
// optional for UTF-8, and the W3C discourages the SVG 1.1 DOCTYPE outright.
//
// The `Generated by graphviz version ...` comment is deliberately kept. It is
// the only record of which Graphviz produced the committed artifact -- so a
// version bump shows up in the diff -- and a comment is valid in both XML and
// HTML, which is the whole problem with the two lines above it.
function stripXmlPrologue(svgXml, label) {
  const out = svgXml
    .replace(/^\uFEFF/, "")
    .replace(/^\s*<\?xml[\s\S]*?\?>\s*/i, "")
    .replace(/^\s*<!DOCTYPE[\s\S]*?>\s*/i, "");

  // Assert rather than hope: a Graphviz that changed its preamble would
  // otherwise slip a parse error back into six pages, silently again.
  if (/<\?xml|<!DOCTYPE/i.test(out)) {
    throw new Error(
      `${label}: an XML declaration or DOCTYPE survived stripping -- ` +
      "Graphviz's preamble has changed shape; update stripXmlPrologue()",
    );
  }
  if (!out.includes("<svg")) {
    throw new Error(`${label}: no <svg> element left after stripping the prologue`);
  }
  return out;
}

function svgFor(src) {
  return src.replace(/\.dot$/, ".svg");
}

// An SVG is stale against its `.dot` *and* against whatever produced it. The
// second half is not pedantry: changing this module or the width table leaves
// every `.dot` untouched, so an mtime check that only looked at sources would
// call the whole batch fresh and quietly keep serving output the current code
// would no longer produce. That happened twice while this was being written --
// once installing the Inter metrics, once stripping the XML prologue -- and
// both times the build reported "regenerated: 0" on a change that altered
// every diagram.
//
// Cost of getting it wrong is a silent stale artifact; cost of the guard is
// re-rendering five diagrams, which is sub-millisecond each after the WASM
// load. A fresh clone regenerates once and then settles.
const GENERATOR_FILES = ["dot.mjs", "dot-metrics.mjs", "inter-metrics.json"]
  .map((f) => fileURLToPath(new URL(f, import.meta.url)));

let generatorMtimePromise = null;
function generatorMtime() {
  generatorMtimePromise ??= Promise.all(
    GENERATOR_FILES.map((f) => fs.stat(f).then((s) => s.mtimeMs, () => 0)),
  ).then((times) => Math.max(0, ...times));
  return generatorMtimePromise;
}

async function isUpToDate(svg, src) {
  try {
    const [srcStat, svgStat, genMtime] = await Promise.all([
      fs.stat(src),
      fs.stat(svg),
      generatorMtime(),
    ]);
    return svgStat.mtimeMs >= srcStat.mtimeMs && svgStat.mtimeMs >= genMtime;
  } catch {
    return false;
  }
}

function explainLoadFailure(err) {
  const msg = err?.message ?? String(err);
  if (/cannot find module ['"]@hpcc-js\/wasm-graphviz|cannot find package ['"]@hpcc-js\/wasm-graphviz/i.test(msg)) {
    return "@hpcc-js/wasm-graphviz not installed; run `npm install`";
  }
  return msg;
}
