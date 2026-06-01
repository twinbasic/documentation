// tbdocs orchestrator. Phases 1-4 pipeline + Phase 5-7 SAB scheduler.
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
import pc   from "picocolors";

import { WorkerPool } from "./worker-pool.mjs";
import { Scheduler }  from "./scheduler.mjs";
import { renderGantt } from "./gantt.mjs";

import { discover } from "./discover.mjs";
import { computeNav } from "./nav.mjs";
import { precomputeSeo } from "./seo.mjs";
import { resolveBookChapters } from "./book.mjs";
import { loadData } from "./data.mjs";
import {
  createMarkdownIt,
  buildLinkTables, serializeLinkTables,
} from "./render.mjs";
import { loadHighlightTheme } from "./highlight-theme.mjs";
import { buildInitConfig, renderSidebar } from "./template.mjs";
import { writePhase, prepareDestinations, preparePageDirs } from "./write.mjs";
import { writeRedirects, deriveRedirectStubs } from "./redirects.mjs";
import { writeSitemap, deriveSitemapUrls } from "./sitemap.mjs";
import { writeSearchData } from "./search.mjs";
import { writeOffline, enumerateVendoredThemeAssets } from "./offline.mjs";
import { buildSitePathsSync } from "./offline-rewrite.mjs";
import { writePdf } from "./pdf.mjs";
import { packShared } from "./sab-broadcast.mjs";
import { allocSchedulerSAB, verifySchedulerSAB, SLICES_PER_WORKER } from "./sab-scheduler.mjs";

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
// Seeds (config, buildInfo → mermaid, scssLight + scssDark → scssJoin,
// highlighterInit), the main-thread spine (config → discover → nav (sidebar) + buildInit (chrome);
// nav + buildInit → dispatch; config → loadData; discover → markdownInit → seo;
// deriveRedirects off discover; deriveSitemap + resolveBookChapters + prepDest deferred to dispatch),
// the render fan-out (dispatch → render:0..N, each worker stashes html locally),
// the per-worker flush (prepPageDirs → flush [per worker] → flushJoin [counter barrier]),
// and write/post-write tasks
// (flushJoin + prepPageDirs → writeAssets + searchData;
// writeAssets + searchData → writeAux → writeOffline; flushJoin + mermaid → writePdf)
// are scheduler tasks.
// runBuild() constructs the pool + scheduler, awaits start(), logs the
// summary, and returns.

const workerCount    = os.availableParallelism();
const mermaidIsSeed  = workerCount > 4;

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
    submit() {},
  },

  // Git rev-parse / log shell-outs. Worker so they overlap with the main spine.
  // When workerCount <= 4, chains into mermaid so the two don't compete with
  // discover on the CI runners. When workerCount > 4, mermaid is a seed.
  buildInfo: {
    expected: [],
    handler: "buildInfo",
    submit(out, state) {
      state.site.buildInfo = out.buildInfo;
    },
  },

  // Sass compilation split across two workers so light + dark run in parallel.
  // Each half is ~700 ms total serially; running concurrently saves ~200 ms.
  scssLight: {
    expected: [],
    handler: "scssLight",
    submit() {},
  },

  scssDark: {
    expected: [],
    handler: "scssDark",
    submit() {},
  },

  // Joins the two parallel SCSS results.
  scssJoin: {
    expected: ["scssLight", "scssDark"],
    runOnMain: true,
    execute({ scssLight: { scssLightResult }, scssDark: { scssDarkResult } }) {
      if (scssLightResult.failed || scssDarkResult.failed) {
        return { scssResult: { compiled: false, failed: true } };
      }
      return { scssResult: { compiled: true, css: scssLightResult.css + "\n" + scssDarkResult.css } };
    },
    submit() {},
  },

  // Stale mermaid SVG regeneration. Seed when workerCount > 4 (enough cores
  // to run without contention); chained after buildInfo otherwise so it
  // doesn't compete with discover on 4-thread CI.
  mermaid: {
    expected: mermaidIsSeed ? [] : ["buildInfo"],
    handler: "mermaid",
    submit(out, state) {
      const known = new Set(state.staticFiles.map((f) => f.srcRel));
      for (const f of out.mermaidStats.svgFiles ?? []) {
        if (!known.has(f.srcRel)) state.staticFiles.push(f);
      }
    },
  },

  // Clean and recreate _site/, _site-offline/, _site-pdf/. Deferred to after
  // dispatch so the wipe doesn't contend with discover's source-file reads.
  // Joined by write and searchData.
  prepDest: {
    expected: ["dispatch"],
    runOnMain: true,
    async execute(_, ctx) {
      const r = ctx.destRoot;
      await prepareDestinations([r, r + "-offline", r + "-pdf"], ctx.opts.dryRun);
      return {};
    },
    submit() {},
  },

  // Pre-create all page output directories while render workers are busy.
  // Lets writePages skip mkdir entirely — pure writeFile.
  prepPageDirs: {
    expected: ["prepDest"],
    runOnMain: true,
    async execute(_, ctx, state) {
      if (ctx.opts.dryRun) return {};
      const skipOffline = ctx.opts.skipOffline ?? (state.site.config.also_build_offline === false);
      const offlineRoot = skipOffline ? null : ctx.destRoot + "-offline";
      await preparePageDirs(state.pages, state.staticFiles, ctx.destRoot, offlineRoot);
      return {};
    },
    submit() {},
  },

  // Theme CSS load. Reads the vendored .theme files and generates the
  // tb-highlight.css palette; does NOT init Shiki WASM (unneeded on main
  // since no code blocks are rendered here). Workers init their own full
  // highlighter instances independently. Runs after config so it sits in
  // the discover I/O window; chains to loadData for the same reason.
  highlighterInit: {
    expected: ["config"],
    runOnMain: true,
    async execute() {
      const theme = await loadHighlightTheme();
      return { highlightCss: theme.css };
    },
    submit(out, state) {
      state.site.highlightCss = out.highlightCss;
    },
  },

  // On-demand per-worker Shiki initializer. Workers execute it the first
  // time they claim a render chunk (per-worker dep in the SAB).
  warmInit: {
    expected: [],
    on_demand: true,
    unique_per_worker: true,
    run_when_idle: true,
    handler: "warmInit",
    submit() {},
  },

  // On-demand per-worker render environment init: unpacks the shared
  // payload, reconstructs link-table Maps, instantiates markdown-it.
  // Depends on dispatch (sharedSAB must exist) and warmInit (Shiki
  // must be loaded). Moves the hidden first-chunk init cost off the
  // render hot path.
  renderEnvInit: {
    expected: ["dispatch"],
    perWorkerDeps: ["warmInit"],
    on_demand: true,
    unique_per_worker: true,
    handler: "renderEnvInit",
    submit() {},
  },

  // On-demand per-worker page flush: writes stashed html + offlineHtml
  // to disk, overlapping I/O with the render tail. Activated by
  // prepPageDirs (directories must exist). Counter-based flushJoin
  // barrier fires when all workers complete.
  flush: {
    expected: ["prepPageDirs"],
    on_demand: true,
    unique_per_worker: true,
    run_when_idle: true,
    idle_priority: 1,
    handler: "flush",
    submit() {},
  },

  // Barrier: all workers have flushed their stashed pages to disk.
  // Activated by counter in _onPerWorkerTiming, not by SAB dep counts.
  flushJoin: {
    expected: [],
    on_demand: true,
    runOnMain: true,
    execute() { return {}; },
    submit() {},
  },

  // ── Main-thread spine ─────────────────────────────────────────────────────

  discover: {
    expected: ["config"],
    runOnMain: true,
    async execute({ config: { config } }, ctx) {
      const { pages, staticFiles } = await discover(ctx.srcRoot, config.exclude ?? []);
      return { pages, staticFiles, config };
    },
    submit(out, state) {
      state.pages       = out.pages;
      state.staticFiles = out.staticFiles;
      state.site.config = out.config;
      for (const p of out.pages) state.pageByDest.set(p.destPath, p);
    },
  },

  nav: {
    expected: ["discover"],
    runOnMain: true,
    execute(_, ctx, state) {
      const { navTree } = computeNav(state.pages, state.site.config);
      state.site.navTree = navTree;
      return { sidebar: renderSidebar(state.site) };
    },
    submit() {},
  },

  // Pre-renders the config-only chrome (SVG sprites, header, search footer,
  // mermaid script, favicon, GA). No nav-tree dependency -- runs after
  // discover in parallel with nav. dispatch assembles the final initData
  // by merging this with the sidebar from nav.
  buildInit: {
    expected: ["discover"],
    runOnMain: true,
    execute(_, ctx, state) {
      return { initData: buildInitConfig(state.site) };
    },
    submit() {},
  },

  // Link-table build + markdown-it assembly. Only needs discover (pages +
  // config + staticFiles). Synchronous: all async work is done upstream.
  markdownInit: {
    expected: ["discover"],
    runOnMain: true,
    execute(_, ctx, state) {
      const linkTables    = buildLinkTables(state.pages);
      const baseurl       = String(state.site.config.baseurl || "");
      const staticFileSet = new Set(state.staticFiles.map(s => s.srcRel));
      state.site.markdown             = createMarkdownIt({
        highlighter: null, linkTables, baseurl, staticFiles: staticFileSet,
      });
      state.site.linkTablesSerialized = serializeLinkTables(linkTables);
      return {};
    },
    submit() {},
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
    submit() {},
  },

  loadData: {
    expected: ["highlighterInit"],
    runOnMain: true,
    async execute(_, ctx, state) {
      const data = await loadData(ctx.srcRoot);
      state.site.data     = data;
      state.site.bookData = data.book ?? null;
      return {};
    },
    submit() {},
  },

  // Mutates bookData._chapters with refs into state.pages. Identity-critical:
  // the same page objects must be read by writePdf later (after renderPhase
  // fills in renderedContent on those same objects). Deferred to after
  // deriveSitemap so it runs while the main thread is idle waiting for workers.
  resolveBookChapters: {
    expected: ["deriveSitemap"],
    runOnMain: true,
    execute(_, ctx, state) {
      resolveBookChapters(state.site.bookData, state.pages);
      return {};
    },
    submit() {},
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
    submit() {},
  },

  // Deferred to after dispatch so it runs while the main thread is idle
  // waiting for render workers, rather than contending during the spine.
  deriveSitemap: {
    expected: ["dispatch"],
    runOnMain: true,
    execute(_, ctx, state) {
      return { urls: deriveSitemapUrls(state.pages, state.site) };
    },
    submit() {},
  },

  // ── Render fan-out ─────────────────────────────────────────────────────────

  // Slices state.pages into chunks and dynamically registers render:0..N
  // worker tasks plus a renderJoin barrier. Assembles initData from the
  // two parallel halves: nav (sidebar) + buildInit (config-only chrome).
  dispatch: {
    expected: ["nav", "buildInit", "buildInfo", "mermaid", "deriveRedirects", "seo"],
    runOnMain: true,
    execute({ nav: { sidebar }, buildInit: { initData }, buildInfo: { buildInfo }, mermaid: { mermaidStats }, seo: _seoSignal, deriveRedirects: { stubs } }, ctx, state) {
      void mermaidStats; // dependency signal only -- static files already appended in mermaid.submit
      void _seoSignal;  // dependency signal only -- SEO fields already written to state.site
      const chunks = chunkPages(state.pages, ctx.workerCount);
      const excludePatterns = Array.isArray(state.site.config?.offline_exclude)
        ? state.site.config.offline_exclude.map(String)
        : [];
      const themeAssetRels = [
        ...enumerateVendoredThemeAssets(),
        "assets/css/tb-highlight.css",
        "assets/css/just-the-docs-combined.css",
      ];
      const sitePaths = buildSitePathsSync(state.pages, state.staticFiles, excludePatterns, stubs, themeAssetRels);
      state.sitePaths = sitePaths;
      const skipOffline = ctx.opts.skipOffline ?? (state.site.config.also_build_offline === false);
      const shared = {
        siteData: {
          config:       state.site.config,
          seoSiteTitle: state.site.seoSiteTitle,
          seoLogoUrl:   state.site.seoLogoUrl,
        },
        initData: { ...initData, sidebar },
        buildInfo,
        linkTablesData: state.site.linkTablesSerialized,
        staticFilesArr: state.staticFiles.map(f => f.srcRel),
        baseurl:        String(state.site.config.baseurl || ""),
        sitePathsArr:           [...sitePaths],
        offlineExcludePatterns: excludePatterns,
        skipOffline,
      };
      const sharedSAB = packShared(shared);
      return { chunks, sharedSAB };
    },
    submit(out, _state, scheduler) {
      const N = out.chunks.length;

      for (let i = 0; i < N; i++) {
        scheduler.tasks.set(`render:${i}`, {
          expected: [],
          handler:  "render",
          consolidate: true,
          ganttSection: "Render",
          submit(renderOut, state) {
            for (const r of renderOut.pages) {
              const p = state.pageByDest.get(r.destPath);
              if (!p) continue;
              p.renderedContent = r.renderedContent;
              if (r.offlineMisses !== undefined) p.offlineMisses = r.offlineMisses;
            }
          },
        });
      }

      scheduler.addDynamicTasks(N);
      scheduler.dispatchRender(out.chunks, out.sharedSAB);
    },
  },

  // ── Write and post-write tasks ─────────────────────────────────────────────

  // Materialise static files + generated CSS to _site/. Page HTML is
  // written by per-worker flush; this task handles theme, static
  // files, and generated CSS only.
  writeAssets: {
    expected: ["scssJoin", "mermaid", "prepPageDirs", "highlighterInit"],
    runOnMain: true,
    async execute({ scssJoin: { scssResult }, mermaid: { mermaidStats }, highlighterInit: _highlightSignal }, ctx, state) {
      void mermaidStats;      // dependency signal only; append already happened in mermaid.submit
      void _highlightSignal;  // dependency signal only; highlightCss already written to state.site
      const generatedAssets = [];
      if (state.site.highlightCss) {
        generatedAssets.push({ rel: "assets/css/tb-highlight.css", content: state.site.highlightCss });
      }
      if (scssResult.compiled) {
        generatedAssets.push({ rel: "assets/css/just-the-docs-combined.css", content: scssResult.css });
      }
      return writePhase(state.pages, state.staticFiles, {
        destRoot:  ctx.destRoot,
        dryRun:    ctx.opts.dryRun,
        generatedAssets,
        baseurl:   String(state.site.config.baseurl || ""),
        skipPages: true,
      });
    },
    submit() {},
  },

  // Write search-data.json. Depends on flushJoin (pages have
  // renderedContent) and prepDest (_site/ exists). Result passes
  // through to writeAux so its search.json field reaches writeOffline.
  searchData: {
    expected: ["flushJoin", "prepDest"],
    runOnMain: true,
    async execute(_, ctx, state) {
      if (ctx.opts.dryRun) return { entries: 0, json: "" };
      return writeSearchData(state.pages, state.site, ctx.destRoot);
    },
    submit() {},
  },

  // Write redirect stubs + sitemap/robots. Waits for writeAssets (theme on
  // disk), searchData, deriveRedirects, and deriveSitemap.
  // Passes searchStats through to writeOffline (for search-data.js).
  writeAux: {
    expected: ["writeAssets", "searchData", "flushJoin", "deriveRedirects", "deriveSitemap"],
    runOnMain: true,
    async execute({ searchData: searchStats, deriveRedirects: { stubs }, deriveSitemap: { urls } }, ctx, state) {
      if (ctx.opts.dryRun) return { redirectStats: null, sitemapStats: null, searchStats };
      const [redirectStats, sitemapStats] = await Promise.all([
        writeRedirects(state.pages, state.site, ctx.destRoot, stubs),
        writeSitemap(state.pages, state.site, ctx.destRoot, urls),
      ]);
      return { redirectStats, sitemapStats, searchStats };
    },
    submit() {},
  },

  // Produce _site-offline/. Depends on writeAux (redirects + sitemap on
  // disk) and writeAssets (theme assets on disk for the CSS-rewrite +
  // JTD-patch passes). Offline page HTML is already on disk from flush.
  writeOffline: {
    expected: ["writeAux", "writeAssets"],
    runOnMain: true,
    async execute({ writeAux: { redirectStats, sitemapStats, searchStats } }, ctx, state) {
      const skipOffline = ctx.opts.skipOffline ?? (state.site.config.also_build_offline === false);
      if (ctx.opts.dryRun || skipOffline) return null;
      const auxStats = { redirects: redirectStats, sitemap: sitemapStats, search: searchStats };
      return writeOffline(state.pages, state.staticFiles, state.site, ctx.destRoot, {
        auxStats,
        precomputed: true,
        sitePaths: state.sitePaths,
        profileOffline: ctx.opts.profileOffline,
      });
    },
    submit() { /* terminal */ },
  },

  // Produce _site-pdf/. Depends on flushJoin (pages have renderedContent),
  // resolveBookChapters (bookData._chapters refs into state.pages), and
  // mermaid (SVG descriptors in staticFiles). Sources CSS directly:
  // tb-highlight.css from state.site.highlighter, print.css from staticFiles.
  // Runs in parallel with writeAssets → searchData → writeAux → writeOffline.
  writePdf: {
    expected: ["flushJoin", "mermaid", "resolveBookChapters"],
    runOnMain: true,
    async execute(_, ctx, state) {
      const skipPdf = ctx.opts.skipPdf ?? (state.site.config.also_build_pdf === false);
      if (ctx.opts.dryRun || skipPdf) return null;
      return writePdf(state.pages, state.staticFiles, state.site, ctx.destRoot, {
        tolerateMissingImages: ctx.opts.tolerateMissingImages,
        highlightCss: state.site.highlightCss,
      });
    },
    submit() { /* terminal */ },
  },
};

function chunkPages(pages, workers) {
  const n = Math.min(workers * SLICES_PER_WORKER, pages.length);
  if (n === 0) return [];
  const size = Math.ceil(pages.length / n);
  const chunks = [];
  for (let i = 0; i < pages.length; i += size) chunks.push(pages.slice(i, i + size));
  return chunks;
}

// ── Gantt chart ───────────────────────────────────────────────────────────────

const GANTT_SECTION = {
  config: "Seeds", buildInfo: "Seeds", scssLight: "Seeds", scssDark: "Seeds", mermaid: "Spine",
  highlighterInit: "Seeds", loadData: "Seeds",
  discover: "Spine", nav: "Spine", markdownInit: "Spine", buildInit: "Spine",
  seo: "Spine", resolveBookChapters: "Spine",
  deriveRedirects: "Spine", deriveSitemap: "Spine",
  dispatch: "Render", prepDest: "Render", prepPageDirs: "Render",
  flush: "Write", flushJoin: "Write",
  writeAssets: "Write", searchData: "Write", writeAux: "Write", writeOffline: "Write", writePdf: "Write",
};
const GANTT_SECTION_ORDER = ["Seeds", "Spine", "Render", "Write"];

function groupGanttTimings(timings) {
  if (timings.size === 0) return null;
  const t0 = Math.min(...[...timings.values()].map(t => t.start));

  const grouped = new Map(GANTT_SECTION_ORDER.map(s => [s, []]));
  for (const [id, { start, end, workerStart, workerEnd, lane, consolidate, ganttSection }] of [...timings.entries()].sort((a, b) => a[1].start - b[1].start)) {
    if (id.endsWith("Join")) continue;
    const section = ganttSection ?? GANTT_SECTION[id] ?? "Other";
    if (!grouped.has(section)) grouped.set(section, []);
    const entry = { id, start: start - t0, end: end - t0 };
    if (workerStart != null) { entry.workerStart = workerStart - t0; entry.workerEnd = workerEnd - t0; }
    if (lane != null) entry.lane = lane;
    if (consolidate)  entry.consolidate = true;
    grouped.get(section).push(entry);
  }
  return grouped;
}

async function injectGanttChart(pages, destRoot, svgContent) {
  if (!svgContent) return;
  const page = pages.find(p => p.permalink === "/Documentation/Development/BuildInfo");
  if (!page) return;

  for (const root of [destRoot, `${destRoot}-offline`]) {
    const htmlPath = path.join(root, page.destPath);
    let html;
    try { html = await fs.readFile(htmlPath, "utf8"); }
    catch (e) { if (e.code !== "ENOENT") throw e; continue; }
    const patched = html.replace("<!-- gantt-chart -->", svgContent);
    if (patched !== html) await fs.writeFile(htmlPath, patched, "utf8");
  }
}

// ── Build entry point ─────────────────────────────────────────────────────────

export async function runBuild(opts) {
  const buildStart = Date.now();
  const { src, dest } = opts;
  const srcRoot = path.resolve(process.cwd(), src);
  const destRoot = path.resolve(dest ?? path.join(srcRoot, "_site"));

  const ctx = { srcRoot, destRoot, opts, workerCount };

  // Allocate the scheduling SAB before the pool so workers receive it at
  // init and start pulling tasks immediately.
  const { sab, views, idMapping, taskMeta } = allocSchedulerSAB(TASKS, workerCount);
  verifySchedulerSAB(TASKS, views, idMapping);

  const pool = new WorkerPool(workerCount, CPU_WORKER_URL);
  const scheduler = new Scheduler({ pool, tasks: TASKS, views, idMapping, ganttSections: GANTT_SECTION });

  pool.onWorkerDone     = (msg) => scheduler._onWorkerDone(msg);
  pool.onWorkerError    = (msg) => scheduler._onWorkerError(msg);
  pool.onPerWorkerTiming = (msg) => scheduler._onPerWorkerTiming(msg);
  pool.onMainTaskReady  = ()    => scheduler._onMainTaskReady();

  pool.sendInit(sab, taskMeta, ctx, idMapping);

  let results;
  try {
    results = await scheduler.start(ctx);
  } finally {
    await pool.destroy();
  }

  const { pages, staticFiles } = scheduler.state;
  const site = scheduler.state.site;

  const { mermaidStats } = results.get("mermaid");
  const { scssResult }   = results.get("scssJoin");

  if (mermaidStats.regenerated > 0 || mermaidStats.failed > 0) {
    const parts = [`regenerated ${mermaidStats.regenerated}`];
    if (mermaidStats.failed > 0) parts.push(`failed ${mermaidStats.failed}`);
    console.log(`mermaid: ${parts.join(", ")} of ${mermaidStats.processed} SVG(s)`);
  }
  if (mermaidStats.failed > 0) process.exitCode = 1;
  if (scssResult.failed)       process.exitCode = 1;

  const flushStats    = results.get("flush");
  const assetStats    = results.get("writeAssets");
  const auxResult     = results.get("writeAux");
  const offlineResult = results.get("writeOffline");
  const pdfResult     = results.get("writePdf");

  console.log(`Done in ${pc.bold(pc.green(`${Date.now() - buildStart}ms`))}: ${pages.length} pages, ${staticFiles.length} static files`);
  console.log(`  ${pc.bold("wrote:")} -> ${pc.cyan(destRoot)}`);
  console.log(`         ${flushStats.written} pages, ` +
              `${assetStats.theme.copied} theme assets, ${assetStats.staticFiles.copied} static files`);
  if (auxResult?.redirectStats) {
    console.log(`  ${pc.bold("aux:")}   ${auxResult.redirectStats.written} redirect stubs, ` +
                `${auxResult.sitemapStats.entries} sitemap entries, ` +
                `${auxResult.searchStats.entries} search-index entries`);
  }
  if (offlineResult) {
    console.log(`  ${pc.bold("offline:")} -> ${pc.cyan(`${destRoot}-offline`)}`);
    console.log(`           ${flushStats.offlineWritten} HTML, ${offlineResult.css} CSS, ` +
                `${offlineResult.redirects} redirect stubs, ` +
                `${offlineResult.statics + offlineResult.assets} assets, ` +
                `${offlineResult.excluded} excluded ` +
                `(${flushStats.offlineMisses} unresolved)`);
    if (opts.profileOffline && offlineResult.subT) {
      console.log(`  ${pc.bold("offline:")} ${offlineResult.subT.summary()}`);
    }
  }
  if (pdfResult) {
    const mb = (pdfResult.bookBytes / (1024 * 1024)).toFixed(1);
    const missingClause = pdfResult.missing > 0 ? ` (${pdfResult.missing} missing)` : "";
    console.log(`  ${pc.bold("pdf:")}     -> ${pc.cyan(`${destRoot}-pdf`)}`);
    console.log(`           book.html (${mb} MB), ${pdfResult.css} CSS, ` +
                `${pdfResult.images} images${missingClause}`);
  }
  console.log(scheduler.summary());

  for (const bt of pool.bootTimings) {
    scheduler.timings.set(`${bt.type}:w${bt.lane}`, {
      start: bt.start, end: bt.end,
      workerStart: bt.start, workerEnd: bt.end,
      lane: bt.lane,
      ganttSection: "Boot",
    });
  }

  const grouped = groupGanttTimings(scheduler.timings);

  const injectStart = Date.now();
  await injectGanttChart(scheduler.state.pages, destRoot, grouped ? renderGantt(grouped) : "");
  console.log(pc.dim(`gantt-inject=${Date.now() - injectStart}ms`));

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
