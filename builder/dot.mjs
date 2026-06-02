// Graphviz/DOT preprocessor: regenerates
// `<srcRoot>/assets/images/dot/*.svg` from the matching `*.dot` source
// when the SVG is missing or older than its source. Runs as a seed task
// concurrently with the rest of the build so the freshly-emitted SVGs
// land in dispatch's site-paths set and the static-file copy pass.
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
// Failure modes split into two:
//   - SETUP (@hpcc-js/wasm-graphviz not installed): warn + leave on-disk
//     SVGs intact + return early with setupSkipped: true. The
//     orchestrator does NOT flip the exit code so a fresh checkout
//     without `npm install` still builds against the previous SVGs.
//   - CONTENT (one .dot has a syntax error, gv.dot throws): warn + keep
//     that diagram's old SVG + continue the rest of the batch. The
//     orchestrator (tbdocs.mjs) flips process.exitCode = 1 on the
//     returned `failed` count so a broken diagram surfaces in CI.

import { promises as fs } from "node:fs";
import path from "node:path";

const DOT_REL_DIR = path.join("assets", "images", "dot");

export async function regenerateDot(srcRoot) {
  const dotRoot = path.join(srcRoot, DOT_REL_DIR);
  const sources = await listDotSources(dotRoot);
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

  let regenerated = 0;
  let failed = 0;
  for (const { src, svg } of stale) {
    try {
      const source = await fs.readFile(src, "utf8");
      const svgXml = gv.dot(source);
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

async function listDotSources(dotRoot) {
  try {
    const entries = await fs.readdir(dotRoot);
    return entries
      .filter((n) => n.endsWith(".dot"))
      .map((n) => path.join(dotRoot, n));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

function svgFor(src) {
  return src.replace(/\.dot$/, ".svg");
}

async function isUpToDate(svg, src) {
  try {
    const [srcStat, svgStat] = await Promise.all([
      fs.stat(src),
      fs.stat(svg),
    ]);
    return svgStat.mtimeMs >= srcStat.mtimeMs;
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
