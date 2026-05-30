// tbdocs orchestrator. Phases 1+2+3+4+5+6+7+8: DISCOVER + COMPUTE +
// RENDER + TEMPLATE + WRITE ONLINE + AUXILIARIES + WRITE OFFLINE + WRITE PDF.
//
// Usage: node builder/tbdocs.mjs [--src <path>] [--dest <path>]
//        [--baseurl <prefix>] [--url <origin>] [--dry-run]
//        [--serve] [--port <N>]
//
// Default --src is "docs" relative to the current working directory.
// Default --dest is "<src>/_site". --dry-run skips all filesystem writes.
// --baseurl overrides _config.yml's baseurl (used by CI to inject the
// Pages base path).
// --url overrides _config.yml's url (used by CI to inject the Pages
// origin -- e.g. https://kubao.github.io -- so canonical URLs match
// the actual deployment instead of the configured production host).

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

import { WorkerPool } from "./worker-pool.mjs";
import { Scheduler }  from "./scheduler.mjs";

import { discover } from "./discover.mjs";
import { computeNav } from "./nav.mjs";
import { precomputeSeo } from "./seo.mjs";
import { resolveBookChapters } from "./book.mjs";
import { loadData } from "./data.mjs";
import {
  renderPhase, createMarkdownIt, initHighlighter,
  buildLinkTables, serializeLinkTables,
} from "./render.mjs";
import { templatePhase, buildInitFn } from "./template.mjs";
import { writePhase } from "./write.mjs";
import { writeRedirects, deriveRedirectStubs } from "./redirects.mjs";
import { writeSitemap, deriveSitemapUrls } from "./sitemap.mjs";
import { writeSearchData } from "./search.mjs";
import { writeOffline } from "./offline.mjs";
import { writePdf } from "./pdf.mjs";

const CPU_WORKER_URL = new URL("./cpu-worker.mjs", import.meta.url);

function parseArgs(argv) {
  const args = {
    src: "docs",
    dest: null,
    baseurl: null,
    url: null,
    dryRun: false,
    skipOffline: null,
    skipPdf: null,
    tolerateMissingImages: false,
    profileOffline: false,
    serve: false,
    port: 4000,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--src") {
      args.src = argv[++i];
    } else if (a.startsWith("--src=")) {
      args.src = a.slice("--src=".length);
    } else if (a === "--dest") {
      args.dest = argv[++i];
    } else if (a.startsWith("--dest=")) {
      args.dest = a.slice("--dest=".length);
    } else if (a === "--baseurl") {
      args.baseurl = argv[++i];
    } else if (a.startsWith("--baseurl=")) {
      args.baseurl = a.slice("--baseurl=".length);
    } else if (a === "--url") {
      args.url = argv[++i];
    } else if (a.startsWith("--url=")) {
      args.url = a.slice("--url=".length);
    } else if (a === "--dry-run") {
      args.dryRun = true;
    } else if (a === "--no-offline") {
      args.skipOffline = true;
    } else if (a === "--no-pdf") {
      args.skipPdf = true;
    } else if (a === "--tolerate-missing-images") {
      args.tolerateMissingImages = true;
    } else if (a === "--profile-offline") {
      args.profileOffline = true;
    } else if (a === "--serve") {
      args.serve = true;
    } else if (a === "--port") {
      args.port = Number(argv[++i]);
    } else if (a.startsWith("--port=")) {
      args.port = Number(a.slice("--port=".length));
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  return args;
}

export function makeTimer() {
  const laps = [];
  let last = Date.now();
  return {
    lap(label) {
      const now = Date.now();
      laps.push({ label, ms: now - last });
      last = now;
    },
    summary() {
      return laps.map(l => `${l.label}=${l.ms}ms`).join(" ");
    },
  };
}

// ── Task graph ────────────────────────────────────────────────────────────────
//
// Phase 1 wires the seeds (config, buildInfo, scss, mermaid) and the main-
// thread spine (discover → nav → markdownInit / buildInit → seo / loadData →
// resolveBookChapters + deriveRedirects / deriveSitemap).
//
// Render, template, write, and post-write tasks are still the trailing serial
// block below scheduler.start(); they graduate to scheduler tasks in Phases 2–3.

const TASKS = {
  // ── Seeds ─────────────────────────────────────────────────────────────────

  // Reads and merges _config.yml + CLI overrides. Seed on main because the
  // output object flows directly into discover (identity matters, no worker
  // boundary crossing needed, and it's a trivial I/O read).
  config: {
    expected: [],
    runOnMain: true,
    async execute(_, ctx) {
      const text = await fs.readFile(path.join(ctx.srcRoot, "_config.yml"), "utf8");
      const config = yaml.load(text);
      if (ctx.opts.baseurl != null) config.baseurl = ctx.opts.baseurl;
      if (ctx.opts.url != null) config.url = ctx.opts.url;
      return { config };
    },
    submit(out, emit) { emit("discover", out); },
  },

  // Git rev-parse / log shell-outs. Worker so they overlap with the main spine.
  buildInfo: {
    expected: [],
    // execute() runs in cpu-worker.mjs as the "buildInfo" handler.
    submit() { /* Phase 2: emit("dispatch", out) */ },
  },

  // Sass compilation (~700 ms CPU). Worker so it overlaps with the main spine.
  scss: {
    expected: [],
    // execute() runs in cpu-worker.mjs as the "scss" handler.
    submit() { /* Phase 3: emit("write", out) */ },
  },

  // Stale mermaid SVG regeneration. Worker for the same reason.
  mermaid: {
    expected: [],
    // execute() runs in cpu-worker.mjs as the "mermaid" handler.
    submit(out, emit, state) {
      // Append any freshly-generated SVG descriptors that discover didn't see
      // (because mermaid and discover run concurrently). Dedup by srcRel so
      // SVGs already on disk at discover time aren't double-counted.
      const known = new Set(state.staticFiles.map((f) => f.srcRel));
      for (const f of out.mermaidStats.svgFiles ?? []) {
        if (!known.has(f.srcRel)) state.staticFiles.push(f);
      }
      /* Phase 3: emit("write", out) */
    },
  },

  // ── Main-thread spine ─────────────────────────────────────────────────────

  discover: {
    expected: ["config"],
    runOnMain: true,
    async execute({ config: { config } }, ctx) {
      const { pages, staticFiles } = await discover(ctx.srcRoot, config.exclude ?? []);
      return { pages, staticFiles, config };
    },
    submit(out, emit, state) {
      state.pages       = out.pages;
      state.staticFiles = out.staticFiles;
      state.site.config = out.config;
      for (const p of out.pages) state.pageByDest.set(p.destPath, p);
      emit("nav",             out);
      emit("deriveRedirects", out);
      emit("deriveSitemap",   out);
    },
  },

  nav: {
    expected: ["discover"],
    runOnMain: true,
    execute(_, ctx, state) {
      const { navTree } = computeNav(state.pages, state.site.config);
      state.site.navTree = navTree;
      return {};
    },
    submit(_, emit) {
      emit("markdownInit", {});
      emit("buildInit",    {});
    },
  },

  // Pre-renders the sidebar/header/svg-sprite HTML used by templatePhase.
  // Depends only on nav so it can start while markdownInit is in flight.
  buildInit: {
    expected: ["nav"],
    runOnMain: true,
    execute(_, ctx, state) {
      return { initData: buildInitFn(state.site) };
    },
    submit() { /* Phase 2: emit("dispatch", out) */ },
  },

  // Shiki WASM init + link-table build + markdown-it instance creation.
  // Not serializable (Shiki's highlighter is a live object), so it stays
  // on main. Workers initialize their own independent highlighter instances.
  markdownInit: {
    expected: ["nav"],
    runOnMain: true,
    async execute(_, ctx, state) {
      const highlighter   = await initHighlighter();
      const linkTables    = buildLinkTables(state.pages);
      const baseurl       = String(state.site.config.baseurl || "");
      const staticFileSet = new Set(state.staticFiles.map(s => s.srcRel));
      state.site.highlighter           = highlighter;
      state.site.markdown              = createMarkdownIt({
        highlighter, linkTables, baseurl, staticFiles: staticFileSet,
      });
      state.site.linkTablesSerialized  = serializeLinkTables(linkTables);
      return {};
    },
    submit(_, emit) {
      emit("seo",      {});
      emit("loadData", {});
    },
  },

  seo: {
    expected: ["markdownInit"],
    runOnMain: true,
    execute(_, ctx, state) {
      const { seoSiteTitle, seoLogoUrl } = precomputeSeo(
        state.pages, state.site.config, state.site.markdown);
      state.site.seoSiteTitle = seoSiteTitle;
      state.site.seoLogoUrl   = seoLogoUrl;
      return {};
    },
    submit(_, emit) { emit("resolveBookChapters", {}); },
  },

  loadData: {
    expected: ["markdownInit"],
    runOnMain: true,
    async execute(_, ctx, state) {
      const data = await loadData(ctx.srcRoot);
      state.site.data     = data;
      state.site.bookData = data.book ?? null;
      return {};
    },
    submit(_, emit) { emit("resolveBookChapters", {}); },
  },

  // Mutates bookData._chapters with refs into state.pages. Identity-critical:
  // the same page objects must be read by writePdf later (after renderPhase
  // fills in renderedContent on those same objects).
  resolveBookChapters: {
    expected: ["seo", "loadData"],
    runOnMain: true,
    execute(_, ctx, state) {
      resolveBookChapters(state.site.bookData, state.pages);
      return {};
    },
    submit() { /* Phase 2: emit("dispatch", {}) */ },
  },

  // Can run in parallel with nav/markdownInit -- only needs pages + config,
  // both available after discover. The layout-based filter (not p.html)
  // lets this run before templatePhase.
  deriveRedirects: {
    expected: ["discover"],
    runOnMain: true,
    execute(_, ctx, state) {
      return { stubs: deriveRedirectStubs(state.pages, state.site) };
    },
    submit() { /* Phase 3: emit("writeAux", out) */ },
  },

  deriveSitemap: {
    expected: ["discover"],
    runOnMain: true,
    execute(_, ctx, state) {
      return { urls: deriveSitemapUrls(state.pages, state.site) };
    },
    submit() { /* Phase 3: emit("writeAux", out) */ },
  },
};

// ── Build entry point ─────────────────────────────────────────────────────────

export async function runBuild(opts) {
  const { src, dest, dryRun, tolerateMissingImages, profileOffline } = opts;
  const srcRoot = path.resolve(process.cwd(), src);
  const destRoot = path.resolve(dest ?? path.join(srcRoot, "_site"));

  const workerCount = os.availableParallelism();
  const pool = new WorkerPool(workerCount, CPU_WORKER_URL);
  const scheduler = new Scheduler({ pool, tasks: TASKS });
  const ctx = { srcRoot, destRoot, opts, workerCount };

  // Run the scheduler (seeds + main-thread spine). Render/template/write
  // tasks are still the trailing serial block below; they graduate to
  // scheduler tasks in Phases 2–3.
  let results;
  try {
    results = await scheduler.start(ctx);
  } finally {
    await pool.destroy();
  }

  // ── Trailing serial block (Phases 2–3 will absorb these) ─────────────────

  const t = makeTimer();
  const { pages, staticFiles } = scheduler.state;
  const site = scheduler.state.site;

  // Wire in the three worker-task outputs that the serial block needs.
  const { mermaidStats } = results.get("mermaid");
  const { scssResult }   = results.get("scss");
  site.buildInfo         = results.get("buildInfo").buildInfo;

  if (mermaidStats.regenerated > 0 || mermaidStats.failed > 0) {
    const parts = [`regenerated ${mermaidStats.regenerated}`];
    if (mermaidStats.failed > 0) parts.push(`failed ${mermaidStats.failed}`);
    console.log(`mermaid: ${parts.join(", ")} of ${mermaidStats.processed} SVG(s)`);
  }
  if (mermaidStats.failed > 0) process.exitCode = 1;
  if (scssResult.failed)       process.exitCode = 1;

  const baseurl = String(site.config.baseurl || "");

  await renderPhase(pages, site, staticFiles);
  t.lap("render");

  await templatePhase(pages, site);
  t.lap("template");

  const generatedAssets = [];
  if (site.highlighter?.themeCss) {
    generatedAssets.push({ rel: "assets/css/tb-highlight.css", content: site.highlighter.themeCss });
  }
  if (scssResult.compiled) {
    generatedAssets.push({ rel: "assets/css/just-the-docs-combined.css", content: scssResult.css });
  }
  const writeStats = await writePhase(pages, staticFiles, {
    destRoot,
    dryRun,
    generatedAssets,
    baseurl,
  });
  t.lap("write");

  let auxStats = null;
  if (!dryRun) {
    // Use the pre-derived stubs/urls from the scheduler rather than re-deriving.
    const stubs = results.get("deriveRedirects").stubs;
    const urls  = results.get("deriveSitemap").urls;
    const [redirectStats, sitemapStats, searchStats] = await Promise.all([
      writeRedirects(pages, site, destRoot, stubs),
      writeSitemap(pages, site, destRoot, urls),
      writeSearchData(pages, site, destRoot),
    ]);
    auxStats = { redirects: redirectStats, sitemap: sitemapStats, search: searchStats };
  }
  t.lap("auxiliaries");

  // CLI flag takes precedence; fall back to the `also_build_offline` /
  // `also_build_pdf` config knobs.
  const skipOffline = opts.skipOffline ?? (site.config.also_build_offline === false);
  const skipPdf     = opts.skipPdf     ?? (site.config.also_build_pdf     === false);

  let offlineStats = null;
  let offlineTimer = null;
  if (!dryRun && !skipOffline) {
    offlineStats = await writeOffline(pages, staticFiles, site, destRoot, {
      auxStats,
      profileOffline,
    });
    if (profileOffline) offlineTimer = offlineStats.subT ?? null;
  }
  t.lap(skipOffline ? "offline:skipped" : "offline");

  let pdfStats = null;
  if (!dryRun && !skipPdf) {
    pdfStats = await writePdf(pages, staticFiles, site, destRoot, { tolerateMissingImages });
  }
  t.lap(skipPdf ? "pdf:skipped" : "pdf");

  console.log(`Phase 1+2+3+4+5+6+7+8 done: ${pages.length} pages, ${staticFiles.length} static files`);
  console.log(`  wrote: ${writeStats.pages.written} pages (${writeStats.pages.skipped} skipped), ` +
              `${writeStats.theme.copied} theme assets, ${writeStats.staticFiles.copied} static files ` +
              `-> ${destRoot}`);
  if (auxStats) {
    console.log(`  aux:   ${auxStats.redirects.written} redirect stubs, ` +
                `${auxStats.sitemap.entries} sitemap entries, ` +
                `${auxStats.search.entries} search-index entries`);
  }
  if (offlineStats) {
    console.log(`  offline: ${offlineStats.html} HTML, ${offlineStats.css} CSS, ` +
                `${offlineStats.redirects} redirect stubs, ` +
                `${offlineStats.statics + offlineStats.assets} assets, ` +
                `${offlineStats.excluded} excluded ` +
                `(${offlineStats.unresolved} unresolved) -> ${destRoot}-offline`);
  }
  if (pdfStats) {
    const mb = (pdfStats.bookBytes / (1024 * 1024)).toFixed(1);
    const missingClause = pdfStats.missing > 0 ? ` (${pdfStats.missing} missing)` : "";
    console.log(`  pdf:     book.html (${mb} MB), ${pdfStats.css} CSS, ` +
                `${pdfStats.images} images${missingClause} -> ${destRoot}-pdf`);
  }
  console.log(scheduler.summary());
  console.log(t.summary());
  if (offlineTimer) {
    console.log(`  offline: ${offlineTimer.summary()}`);
  }

  // Drift guard from PLAN-1.md §1.
  if (pages.length < 836) {
    console.error(`WARN: page count ${pages.length} below baseline 836`);
    process.exitCode = 1;
  }

  return { pages, staticFiles, site, destRoot };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.serve) {
    const { runServe } = await import("./serve.mjs");
    await runServe(opts);
    return;
  }
  await runBuild(opts);
}

const isEntry = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isEntry) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
