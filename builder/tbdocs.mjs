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
import { computeSiteSeo } from "./seo.mjs";
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
import { writeSearchDataFromChunks } from "./search.mjs";
import { writeOffline, enumerateVendoredThemeAssets } from "./offline.mjs";
import { buildSitePathsSync, deriveOfflineCss,
         normalizeBaseurl }  from "./offline-rewrite.mjs";
import { writePdf } from "./pdf.mjs";
import { packShared } from "./sab-broadcast.mjs";
import {
  allocSchedulerSAB, verifySchedulerSAB, SLICES_PER_WORKER,
  HANDLERS, F_PIN_TO_PRED,
  writeTaskMeta,
  allocDynamicSlots, wireDynamicEdges, appendDynamicSuccessors,
  setDepCount, activateDynamicTasks, packPayloads,
} from "./sab-scheduler.mjs";

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
// Seeds (config, buildInfo → mermaid, scssLight + scssDark → scss,
// highlighterInit), the main-thread spine (config → discover → nav (sidebar) + buildInit (chrome);
// nav + buildInit → dispatch; config → loadData; discover → markdownInit;
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

  // Joins the two parallel SCSS results and writes the combined CSS to
  // _site/ and _site-offline/. Depends on prepDest so the output dirs
  // exist (prepDest cleans them first).
  scss: {
    expected: ["scssLight", "scssDark", "prepDest"],
    runOnMain: true,
    async execute({ scssLight: { scssLightResult }, scssDark: { scssDarkResult } }, ctx, state) {
      if (scssLightResult.failed || scssDarkResult.failed) {
        return { scssResult: { compiled: false, failed: true } };
      }
      const combined = scssLightResult.css + "\n" + scssDarkResult.css;
      if (ctx.opts.dryRun) {
        return { scssResult: { compiled: true, css: combined } };
      }

      const rel = "assets/css/just-the-docs-combined.css";
      const baseurl = String(state.site.config.baseurl || "");
      const online = baseurl
        ? combined.replace(
            /url\((["']?)\/(?!\/)([^)"']*)\1\)/g,
            (_, q, rest) => `url(${q}${baseurl}/${rest}${q})`,
          )
        : combined;
      const dest = path.join(ctx.destRoot, rel);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, online, "utf8");

      const skipOffline = ctx.opts.skipOffline ?? (state.site.config.also_build_offline === false);
      let offlineMisses = 0;
      if (!skipOffline) {
        const offlineState = {
          sitePaths: state.sitePaths,
          caches: { rawResolution: new Map(), seg: new Map(), result: new Map() },
          baseurl: normalizeBaseurl(baseurl),
        };
        const { css: offlineCss, misses } = deriveOfflineCss(online, rel, offlineState);
        offlineMisses = misses;
        const offDest = path.join(ctx.destRoot + "-offline", rel);
        await fs.mkdir(path.dirname(offDest), { recursive: true });
        await fs.writeFile(offDest, offlineCss, "utf8");
      }
      return { scssResult: { compiled: true, css: combined }, offlineMisses };
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
  // time they claim a render chunk (per-worker dep in the SAB).  Once a
  // worker has run it, the highlighter persists in module scope across
  // init messages, so survives_reset lets rebuilds skip it.
  warmInit: {
    expected: [],
    on_demand: true,
    unique_per_worker: true,
    run_when_idle: true,
    survives_reset: true,
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

  // Barrier: all render:i deltas merged into state.pages (renderedContent
  // available). Dep count is set to N by dispatch.submit(); each render:i
  // completion decrements via the SAB successor edge. Tasks that only
  // need renderedContent (not page HTML on disk) depend on this.
  renderJoin: {
    expected: [],
    on_demand: true,
    runOnMain: true,
    execute() { return {}; },
    submit() {},
  },

  // Barrier: all per-chunk flush:i tasks have written their pages to disk.
  // Dep count is set to N by dispatch.submit(); each flush:i completion
  // decrements via the SAB successor edge. Aggregates the per-chunk write
  // stats from all flush:i results.
  flushJoin: {
    expected: [],   // populated by dispatch.submit
    on_demand: true,
    runOnMain: true,
    execute(inputs) {
      let written = 0, offlineWritten = 0, offlineMisses = 0;
      for (const r of Object.values(inputs)) {
        written        += r?.written        ?? 0;
        offlineWritten += r?.offlineWritten ?? 0;
        offlineMisses  += r?.offlineMisses  ?? 0;
      }
      return { written, offlineWritten, offlineMisses };
    },
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

  // Link-table build + markdown-it assembly + site-level SEO constants
  // (seoSiteTitle / seoLogoUrl). Only needs discover (pages + config +
  // staticFiles). Per-page SEO fields are computed on render workers in
  // computeChunkSeo between renderPhase and templatePhase.
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
      const { seoSiteTitle, seoLogoUrl } = computeSiteSeo(state.site.config, state.site.markdown);
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
    expected: ["nav", "buildInit", "buildInfo", "mermaid", "deriveRedirects", "markdownInit"],
    runOnMain: true,
    execute({ nav: { sidebar }, buildInit: { initData }, buildInfo: { buildInfo }, mermaid: { mermaidStats }, markdownInit: _markdownInitSignal, deriveRedirects: { stubs } }, ctx, state) {
      void mermaidStats; // dependency signal only -- static files already appended in mermaid.submit
      void _markdownInitSignal;  // dependency signal only -- markdown + linkTablesSerialized + seoSiteTitle/seoLogoUrl already on state.site
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
      const N      = out.chunks.length;
      const views  = scheduler._views;
      const idMap  = scheduler._idMapping;
      const renderJoinIdx    = idMap.nameToIdx.get("renderJoin");
      const flushJoinIdx     = idMap.nameToIdx.get("flushJoin");
      const renderEnvInitIdx = idMap.nameToIdx.get("renderEnvInit");
      const prepPageDirsIdx  = idMap.nameToIdx.get("prepPageDirs");

      // Phase 17: pre-allocate searchChunks so each render:i.submit() can
      // assign by chunk index regardless of completion order.  After
      // renderJoin fires, scheduler.state.searchChunks[0..N-1] holds every
      // worker's per-chunk entries in pages-order.
      scheduler.state.searchChunks = new Array(N);

      // 1. Allocate 2N slots from the generic pool.
      const renderBase = allocDynamicSlots(views, idMap, N);
      const flushBase  = allocDynamicSlots(views, idMap, N);

      // 2. Write metadata into the SAB.
      for (let i = 0; i < N; i++) {
        writeTaskMeta(views, renderBase + i, {
          handlerIdx:    HANDLERS.render,
          perWorkerDeps: [renderEnvInitIdx],
        });
        writeTaskMeta(views, flushBase + i, {
          handlerIdx: HANDLERS.flush,
          priority:   1,
        });
      }

      // 3. Wire edges: render:i → [renderJoin, flush:i],
      //                flush:i  → [flushJoin].
      const edges = [];
      for (let i = 0; i < N; i++) {
        edges.push({ from: renderBase + i, to: [renderJoinIdx, flushBase + i] });
        edges.push({ from: flushBase + i,  to: [flushJoinIdx] });
      }
      wireDynamicEdges(views, edges);

      // Append prepPageDirs → flush:0..N-1 (so flush:i waits until the
      // output dirs exist; prepPageDirs already has writeAssets as a
      // static successor, so use the append helper).
      const prepPageDirsToFlush = [];
      for (let i = 0; i < N; i++) prepPageDirsToFlush.push(flushBase + i);
      appendDynamicSuccessors(views, [{ from: prepPageDirsIdx, to: prepPageDirsToFlush }]);

      // 4. Set dep counts and pinning.
      setDepCount(views, renderJoinIdx, N);
      setDepCount(views, flushJoinIdx,  N);
      for (let i = 0; i < N; i++) {
        setDepCount(views, flushBase + i, 2);  // gated on render:i + prepPageDirs
        Atomics.store(views.pinnedTo, flushBase + i, renderBase + i);
        views.flags[flushBase + i] |= F_PIN_TO_PRED;
      }

      // 5. Register names + task defs on the main-thread scheduler so
      //    _onWorkerDone can look up consolidate/ganttSection/submit and
      //    _assembleInputs can resolve flushJoin's expected list.
      for (let i = 0; i < N; i++) {
        const rName = `render:${i}`;
        idMap.nameToIdx.set(rName, renderBase + i);
        idMap.idxToName[renderBase + i] = rName;
        scheduler.tasks.set(rName, {
          expected: [],
          consolidate: true,
          ganttSection: "Render",
          submit(renderOut, state) {
            for (const r of renderOut.pages) {
              const p = state.pageByDest.get(r.destPath);
              if (!p) continue;
              p.renderedContent = r.renderedContent;
              if (r.offlineMisses !== undefined) p.offlineMisses = r.offlineMisses;
            }
            state.searchChunks[i] = renderOut.searchEntries;
          },
        });

        const fName = `flush:${i}`;
        idMap.nameToIdx.set(fName, flushBase + i);
        idMap.idxToName[flushBase + i] = fName;
        scheduler.tasks.set(fName, {
          expected: [`render:${i}`],
          consolidate: true,
          ganttSection: "Write",
          submit() {},
        });
      }

      // Populate flushJoin's expected so _assembleInputs delivers all
      // flush results to its execute().  Replace the Map entry with a
      // shallow clone bearing a fresh expected array so the shared
      // TASKS.flushJoin def stays untouched across rebuilds -- if we
      // mutated it in place, the next build's allocSchedulerSAB would
      // see leftover "flush:N" names and fail.
      const flushJoinDef = scheduler.tasks.get("flushJoin");
      const flushJoinExpected = [];
      for (let i = 0; i < N; i++) flushJoinExpected.push(`flush:${i}`);
      scheduler.tasks.set("flushJoin", { ...flushJoinDef, expected: flushJoinExpected });

      // 6. Pack payload, broadcast, account, activate.
      const payloadSAB = packPayloads(views, renderBase, out.chunks);
      scheduler.addDynamicTasks(2 * N + 2);   // N render + N flush + renderJoin + flushJoin
      scheduler.pool.broadcastDynamicData(payloadSAB, out.sharedSAB);
      activateDynamicTasks(views, renderBase, 2 * N);  // render:i activate (depCount 0);
                                                       // flush:i stay NOT_READY (depCount 1)
    },
  },

  // ── Write and post-write tasks ─────────────────────────────────────────────

  // Materialise theme JS, static files, and highlight CSS to _site/.
  // Page HTML is written by per-worker flush; combined SCSS is written
  // by the scss task.
  writeAssets: {
    expected: ["mermaid", "prepPageDirs", "highlighterInit"],
    runOnMain: true,
    async execute({ mermaid: { mermaidStats }, highlighterInit: _highlightSignal }, ctx, state) {
      void mermaidStats;      // dependency signal only; append already happened in mermaid.submit
      void _highlightSignal;  // dependency signal only; highlightCss already written to state.site
      const generatedAssets = [];
      if (state.site.highlightCss) {
        generatedAssets.push({ rel: "assets/css/tb-highlight.css", content: state.site.highlightCss });
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

  // Write search-data.json. Depends on renderJoin (every render:i.submit
  // has stored its searchEntries in state.searchChunks[i]) and prepDest
  // (_site/ exists). Result passes through to writeAux so its search.json
  // field reaches writeOffline.  Heavy lifting (extractSections, stripHtml,
  // sanitiseContent) ran on the workers; this task only concatenates and
  // renumbers.
  searchData: {
    expected: ["renderJoin", "prepDest"],
    runOnMain: true,
    async execute(_, ctx, state) {
      if (ctx.opts.dryRun) return { entries: 0, json: "" };
      return writeSearchDataFromChunks(state.searchChunks, ctx.destRoot);
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
  config: "Seeds", buildInfo: "Seeds", scssLight: "Seeds", scssDark: "Seeds", scss: "Write", mermaid: "Spine",
  highlighterInit: "Seeds", loadData: "Seeds",
  discover: "Spine", nav: "Spine", markdownInit: "Spine", buildInit: "Spine",
  resolveBookChapters: "Spine",
  deriveRedirects: "Spine", deriveSitemap: "Spine",
  dispatch: "Render", prepDest: "Render", prepPageDirs: "Render",
  renderJoin: "Render", flushJoin: "Write",
  writeAssets: "Write", searchData: "Write", writeAux: "Write", writeOffline: "Write", writePdf: "Write",
};
const GANTT_SECTION_ORDER = ["Seeds", "Spine", "Render", "Write"];

function groupGanttTimings(timings) {
  if (timings.size === 0) return null;
  const t0 = Math.min(...[...timings.values()].map(t => t.start));

  const grouped = new Map(GANTT_SECTION_ORDER.map(s => [s, []]));
  for (const [id, { start, end, t3, workerStart, workerEnd, lane, consolidate, ganttSection }] of [...timings.entries()].sort((a, b) => a[1].start - b[1].start)) {
    if (id.endsWith("Join")) continue;
    const section = ganttSection ?? GANTT_SECTION[id] ?? "Other";
    if (!grouped.has(section)) grouped.set(section, []);
    const entry = { id, start: start - t0, end: end - t0 };
    if (t3 != null) entry.t3 = t3 - t0;
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
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
    const ls = `font-size:0.85em;float:right;margin-left:1em`;
    const downloadLink = `<a href="${dataUrl}" download="gantt.svg" style="${ls}">Download SVG</a>`;
    const copyLink = `<a href="javascript:;" onclick="navigator.clipboard.writeText(document.querySelector('#gantt-chart>svg').outerHTML)" style="${ls}">Copy SVG</a>`;
    const downloadPng = `<a href="javascript:;" onclick="_ganttPng(1)" style="${ls}">Download PNG</a>`;
    const copyPng = `<a href="javascript:;" onclick="_ganttPng(0)" style="${ls}">Copy PNG</a>`;
    const pngFn = [
      `<script>function _ganttPng(dl){`,
      `var svg=document.querySelector('#gantt-chart>svg');if(!svg)return;`,
      `var vb=svg.viewBox.baseVal,w=2048,h=Math.round(vb.height*(w/vb.width));`,
      `var data=new XMLSerializer().serializeToString(svg);`,
      `var blob=new Blob([data],{type:'image/svg+xml;charset=utf-8'});`,
      `var url=URL.createObjectURL(blob);var img=new Image();`,
      `img.onload=function(){`,
      `var c=document.createElement('canvas');c.width=w;c.height=h;`,
      `var ctx=c.getContext('2d');`,
      `ctx.drawImage(img,0,0,w,h);URL.revokeObjectURL(url);`,
      `c.toBlob(function(b){`,
      `if(dl){var a=document.createElement('a');a.href=URL.createObjectURL(b);`,
      `a.download='gantt.png';a.click();URL.revokeObjectURL(a.href)}`,
      `else{navigator.clipboard.write([new ClipboardItem({'image/png':b})])}`,
      `},'image/png')};img.src=url}<` + `/script>`,
    ].join("");
    const header = `${pngFn}<style>@media print{#gantt-controls{display:none}}</style><div id="gantt-controls" style="overflow:hidden">${downloadLink}${copyLink}${downloadPng}${copyPng}</div>`;
    const zoomScript = [
      `<script>(function(){`,
      `var c=document.getElementById('gantt-chart');`,
      `if(!c)return;`,
      `c.style.cursor='zoom-in';`,
      `function toggle(){`,
      `  var svg=c.querySelector('svg');`,
      `  if(c.dataset.zoomed){`,
      `    c.removeAttribute('style');c.style.cursor='zoom-in';`,
      `    if(svg)svg.style.maxWidth='';`,
      `    delete c.dataset.zoomed;`,
      `  }else{`,
      `    var bg=getComputedStyle(document.body).backgroundColor;`,
      `    Object.assign(c.style,{position:'fixed',top:'0',left:'0',width:'100vw',height:'100vh',`,
      `      zIndex:'9999',background:bg,padding:'1rem',boxSizing:'border-box',overflow:'auto',cursor:'zoom-out'});`,
      `    if(svg)svg.style.maxWidth='100%';`,
      `    c.dataset.zoomed='1';c.scrollTop=0;`,
      `  }`,
      `}`,
      `c.addEventListener('click',toggle);`,
      `document.addEventListener('keydown',function(e){if(e.key==='Escape'&&c.dataset.zoomed)toggle();},{capture:true});`,
      `})();<` + `/script>`,
    ].join("");
    const patched = html.replace("<!-- gantt-chart -->", `${header}\n<div id="gantt-chart">${svgContent}</div>\n${zoomScript}`);
    if (patched !== html) await fs.writeFile(htmlPath, patched, "utf8");
  }
}

// ── Build entry point ─────────────────────────────────────────────────────────

// Factory exposed so serve.mjs can create a pool once at startup and pass it
// to every runBuild() call without importing WorkerPool/CPU_WORKER_URL itself.
export function createWorkerPool() {
  return new WorkerPool(workerCount, CPU_WORKER_URL);
}

export async function runBuild(opts) {
  const buildStart = Date.now();
  const { src, dest } = opts;
  const srcRoot = path.resolve(process.cwd(), src);
  const destRoot = path.resolve(dest ?? path.join(srcRoot, "_site"));

  // When serve.mjs reuses a pool across rebuilds, opts.pool is passed in;
  // runBuild() then skips pool create/destroy.  rebuild === true means this
  // is at least the second build on this pool, so warmInit's perWorkerDone
  // gets pre-filled (workers keep the highlighter in module scope) and
  // boot timings are not re-injected.
  //
  // The pool is stripped from the opts that lands on ctx -- ctx travels to
  // workers via postMessage's structured clone, which cannot serialize the
  // Worker handles inside the pool.
  const { pool: externalPool = null, ...ctxOpts } = opts;
  const rebuild = externalPool != null && externalPool._buildCount > 0;

  const ctx = { srcRoot, destRoot, opts: ctxOpts, workerCount };

  const { sab, views, idMapping } =
    allocSchedulerSAB(TASKS, workerCount, { rebuild });
  verifySchedulerSAB(TASKS, views, idMapping);

  const pool = externalPool ?? new WorkerPool(workerCount, CPU_WORKER_URL);
  const scheduler = new Scheduler({ pool, tasks: TASKS, views, idMapping, ganttSections: GANTT_SECTION });

  pool.onWorkerDone     = (msg) => scheduler._onWorkerDone(msg);
  pool.onWorkerError    = (msg) => scheduler._onWorkerError(msg);
  pool.onPerWorkerTiming = (msg) => scheduler._onPerWorkerTiming(msg);
  pool.onMainTaskReady  = ()    => scheduler._onMainTaskReady();

  pool.sendInit(sab, ctx, idMapping);

  let results;
  try {
    results = await scheduler.start(ctx);
  } finally {
    if (!externalPool) await pool.destroy();
  }

  const { pages, staticFiles } = scheduler.state;
  const site = scheduler.state.site;

  const { mermaidStats } = results.get("mermaid");
  const { scssResult }   = results.get("scss");

  if (mermaidStats.regenerated > 0 || mermaidStats.failed > 0) {
    const parts = [`regenerated ${mermaidStats.regenerated}`];
    if (mermaidStats.failed > 0) parts.push(`failed ${mermaidStats.failed}`);
    console.log(`mermaid: ${parts.join(", ")} of ${mermaidStats.processed} SVG(s)`);
  }
  if (mermaidStats.failed > 0) process.exitCode = 1;
  if (scssResult.failed)       process.exitCode = 1;

  const flushStats    = results.get("flushJoin");
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

  // Boot timings come from the workers' very first message after spawn.
  // On rebuilds the workers are alive from the previous build and never
  // emit them again, so only inject on the first build to keep the Gantt
  // honest.
  if (!rebuild) {
    for (const bt of pool.bootTimings) {
      scheduler.timings.set(`${bt.type}:w${bt.lane}`, {
        start: bt.start, end: bt.end,
        workerStart: bt.start, workerEnd: bt.end,
        lane: bt.lane,
        ganttSection: "Boot",
      });
    }
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
