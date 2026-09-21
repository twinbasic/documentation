// tbdocs orchestrator. Phases 1-4 pipeline + Phase 5-7 SAB scheduler.
//
// Usage: node builder/tbdocs.mjs [--src <path>] [--dest <path>]
//        [--baseurl <prefix>] [--url <origin>] [--dry-run]
//        [--no-offline] [--no-pdf] [--tolerate-missing-images]
//        [--fetch-assets | --no-fetch-assets] [--profile-offline]
//        [--check | --no-check] [--check-audit-index]
//        [--check-findings <path>] [--serve] [--port <N>]
//
// --check runs the link + integrity check over the HTML the build
// already holds in worker memory, instead of writing ~270 MB out and
// reading it back through scripts/check_links.mjs. Findings are
// identical -- scripts/check_links_diff.mjs is the gate that says so.
// A failing check sets the exit code but never aborts the build: a
// broken link still produces a site worth having on disk.
// --check-audit-index additionally diffs the derived tree index against
// what actually landed on disk; see builder/check.mjs.
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
import { deriveCounts, validateCountNames } from "./counts.mjs";
import { computeNav } from "./nav.mjs";
import { vendorAssets } from "./vendor-assets.mjs";
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
// Only the index derivation is a static import: it runs inside dispatch,
// on the render fan-out's critical path, and check-tree.mjs pulls
// nothing heavier than node:path. The rest of the check -- and with it
// htmlparser2 -- is imported dynamically by the tasks that need it, so a
// build without --check pays nothing.
import { deriveTreeRels } from "./check-tree.mjs";
import { checkPageBaseline } from "./page-baseline.mjs";
import { publishPolicyFor, unpublishableSourceFiles,
         unpublishableTreePaths, formatPublishRefusal } from "./publish-policy.mjs";
import { packShared } from "./sab-broadcast.mjs";
import {
  allocSchedulerSAB, verifySchedulerSAB, SLICES_PER_WORKER,
  HANDLERS, F_PIN_TO_PRED,
  writeTaskMeta,
  allocDynamicSlots, wireDynamicEdges, appendDynamicSuccessors,
  setDepCount, activateDynamicTasks, packPayloads,
} from "./sab-scheduler.mjs";

const CPU_WORKER_URL = new URL("./cpu-worker.mjs", import.meta.url);

// builder/ sits one level under the repository root. Used to state a build's
// source root the same way however it was invoked, for the page-count drift
// guard -- see page-baseline.mjs.
const REPO_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

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
    check: false,
    auditIndex: false,
    updatePageBaseline: false,
    checkFindings: null,
    serve: false,
    port: 4000,
    // Wall-clock with no task completing before the build gives up and
    // reports what was outstanding. Generous on purpose: the longest
    // single task here is worker cold boot at ~1.6 s, and a loaded CI
    // box is allowed to be an order of magnitude slower than that
    // without being called stalled. 0 disables the watchdog.
    stallTimeoutMs: 120000,
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
    } else if (a === "--fetch-assets") {
      args.fetchAssets = true;
    } else if (a === "--no-fetch-assets") {
      args.fetchAssets = false;
    } else if (a === "--profile-offline") {
      args.profileOffline = true;
    } else if (a === "--check") {
      args.check = true;
    } else if (a === "--no-check") {
      // build.bat bakes in --check; this is how to ask for a plain
      // build without editing it. Flags are read in order, so a later
      // --no-check wins.
      args.check = false;
      args.auditIndex = false;
      args.checkFindings = null;
    } else if (a === "--check-audit-index") {
      args.check = true;
      args.auditIndex = true;
    } else if (a === "--check-findings") {
      args.check = true;
      args.checkFindings = argv[++i];
    } else if (a === "--update-page-baseline") {
      // Record the current inventory as the drift guard's new baseline,
      // whichever direction it moved. The build only ever raises it on its
      // own; lowering it is a deliberate act, so it takes a deliberate flag.
      args.updatePageBaseline = true;
    } else if (a === "--serve") {
      args.serve = true;
    } else if (a === "--port") {
      args.port = Number(argv[++i]);
    } else if (a.startsWith("--port=")) {
      args.port = Number(a.slice("--port=".length));
    } else if (a === "--stall-timeout" || a.startsWith("--stall-timeout=")) {
      const raw = a === "--stall-timeout" ? argv[++i] : a.slice("--stall-timeout=".length);
      const secs = Number(raw);
      if (!Number.isFinite(secs) || secs < 0) {
        throw new Error(`--stall-timeout expects seconds (0 disables), got: ${raw}`);
      }
      args.stallTimeoutMs = secs * 1000;
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
// Seeds (config, buildInfo, dot, scssLight + scssDark → scss,
// highlighterInit), the main-thread spine (config → discover → nav (sidebar) + buildInit (chrome);
// nav + buildInit → dispatch; config → loadData; discover → markdownInit;
// deriveRedirects off discover; deriveSitemap + resolveBookChapters + prepDest deferred to dispatch),
// the render fan-out (dispatch → render:0..N, each worker stashes html locally),
// the per-worker flush (prepPageDirs → flush [per worker] → flushJoin [counter barrier]),
// and write/post-write tasks
// (flushJoin + prepPageDirs → writeAssets + searchData;
// writeAssets + searchData → writeAux → writeOffline; flushJoin + dot → writePdf)
// are scheduler tasks.
// runBuild() constructs the pool + scheduler, awaits start(), logs the
// summary, and returns.

const workerCount = os.availableParallelism();

// Register a dynamic fan-in barrier: BOTH halves of its invariant, in
// one call, because writing one without the other is a data-loss bug
// that reproduces about one build in three and reports nothing.
//
// Half one is the SAB dep count, which is what orders the work. Half two
// is the `expected` list, which is what orders the STATE. A barrier
// becomes READY when the *workers* decrement its dep count, and they do
// that right after posting their result -- so the main thread can see a
// count of zero while a result message is still in its queue and the
// matching submit() has not run. The only thing holding the barrier back
// in that window is _claimMainTask's check that every name in `expected`
// is already in the results map.
//
// renderJoin went without it and silently lost data: render:i's submit()
// is what fills scheduler.state.searchChunks[i], the array starts life
// as `new Array(N)` (holes, not undefined), and Array.prototype.flat()
// skips holes without a word. One chunk arriving late meant ~6 pages
// quietly missing from search-data.json.
//
// The Map entry is replaced with a shallow clone bearing a fresh
// `expected` array, so the shared TASKS def stays untouched across
// rebuilds -- mutating it in place would leave the next build's
// allocSchedulerSAB looking at leftover "render:N" / "flush:N" names.
function registerBarrier(scheduler, views, join, joinIdx, prefix, n) {
  const def = scheduler.tasks.get(join);
  if (!def) throw new Error(`registerBarrier: no task def for '${join}'`);
  const expected = [];
  for (let i = 0; i < n; i++) expected.push(`${prefix}:${i}`);
  scheduler.tasks.set(join, { ...def, expected });
  setDepCount(views, joinIdx, n);
}

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

  // Stale DOT/Graphviz SVG regeneration. WASM-based; no headless browser,
  // no in-tree patches. Runs on a worker as a seed so the Graphviz.load()
  // WASM init (~50 ms) hides behind the main spine.
  dot: {
    expected: [],
    handler: "dot",
    submit(out, state) {
      const known = new Set(state.staticFiles.map((f) => f.srcRel));
      for (const f of out.dotStats.svgFiles ?? []) {
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
  //
  // The SAB dep count alone does NOT make this a barrier over the
  // *submits* -- see dispatch.submit, which populates `expected`.
  renderJoin: {
    expected: [],   // populated by dispatch.submit
    on_demand: true,
    runOnMain: true,
    execute(_inputs, _ctx, state) {
      // This barrier's entire meaning is "every page now has
      // renderedContent". Its consumers -- the search index, the PDF
      // book -- skip a page that has none rather than fail, so one that
      // slipped through would vanish from their output without a word.
      // That is precisely how the missing-expected-list bug stayed
      // hidden. Assert the claim once, here, where it is made.
      const missing = state.pages.filter(p => typeof p.renderedContent !== "string");
      if (missing.length) {
        throw new Error(
          `${missing.length} of ${state.pages.length} pages have no renderedContent ` +
          `(${missing.slice(0, 5).map(p => p.destPath).join(", ")}` +
          `${missing.length > 5 ? ", ..." : ""}). A render chunk's submit() did not run ` +
          `before the barrier -- see the expected-list wiring in dispatch.submit().`,
        );
      }
      return {};
    },
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
      for (const [name, r] of Object.entries(inputs)) {
        // Asserted, not defaulted. A flush result that never arrived
        // would otherwise contribute zero and the totals would simply
        // read low -- a number nobody can tell apart from a smaller
        // site.
        if (!r || typeof r.written !== "number") {
          throw new Error(
            `flushJoin: ${name} produced no write stats; the page count ` +
            `would silently read low`
          );
        }
        written        += r.written;
        offlineWritten += r.offlineWritten ?? 0;
        offlineMisses  += r.offlineMisses  ?? 0;
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
      for (const entry of config.bundle_extra ?? []) {
        const srcPath = path.resolve(ctx.srcRoot, entry.src);
        const stat = await fs.stat(srcPath);
        staticFiles.push({ srcPath, srcRel: entry.dest, destRel: entry.dest, size: stat.size });
      }
      // Everything discover() could not parse frontmatter from is about to
      // be copied verbatim into a public tree. `exclude:` is a denylist and
      // only refuses what someone named in advance, so the allowlist runs
      // here -- before any write, while the source path is still in hand.
      const policy = publishPolicyFor(config);
      const strays = unpublishableSourceFiles(staticFiles, policy);
      if (strays.length) {
        throw new Error(formatPublishRefusal(strays, { surface: "source", label: ctx.srcRoot }));
      }
      return { pages, staticFiles, config };
    },
    submit(out, state) {
      state.pages       = out.pages;
      state.staticFiles = out.staticFiles;
      state.site.config = out.config;
      for (const p of out.pages) state.pageByDest.set(p.destPath, p);
    },
  },

  // Download third-party images (YouTube poster frames, GitHub
  // user-attachment screenshots) into the committed source tree so the
  // rendered site contacts nobody. Same shape as `dot`: idempotent,
  // writes into <srcRoot>/assets/, and hands newly created files to the
  // static-file copy pass. CI never fetches -- see vendor-assets.mjs.
  vendorAssets: {
    expected: ["discover"],
    runOnMain: true,
    async execute(_, ctx, state) {
      // CI must never download: an author who wrote the markdown but
      // forgot to commit the image would otherwise get a green build
      // while the site went on hotlinking a third party. Explicit flags
      // win; otherwise presence of $CI decides.
      const allowFetch = ctx.opts.fetchAssets ?? !process.env.CI;
      return await vendorAssets(ctx.srcRoot, state.pages, {
        baseurl: String(state.site.config.baseurl || ""),
        allowFetch,
      });
    },
    submit(out, state) {
      state.site.vendoredVideos = out.videos;
      state.site.vendoredImages = out.images;
      const known = new Set(state.staticFiles.map((f) => f.srcRel));
      for (const f of out.files) {
        if (!known.has(f.srcRel)) state.staticFiles.push(f);
      }
      if (out.failed > 0) process.exitCode = 1;
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
    // deriveRedirects is here for the counts registry alone: {{tbdocs:redirectStubs}}
    // is derived from the stub set, and nothing else on this task needs it.
    expected: ["discover", "vendorAssets", "deriveRedirects"],
    runOnMain: true,
    execute({ deriveRedirects: { stubs } }, ctx, state) {
      const linkTables    = buildLinkTables(state.pages);
      const baseurl       = String(state.site.config.baseurl || "");
      const staticFileSet = new Set(state.staticFiles.map(s => s.srcRel));

      // Derived here, on main, because a count has to exist before any page
      // renders -- and validated here for the same reason. An unknown name
      // cannot be an error inside the substitution rule: markdown-it emits an
      // unrecognised inline verbatim, so the rule would publish the typo to
      // readers rather than fail. See counts.mjs.
      state.site.counts = deriveCounts(state, { redirectStubs: stubs.length });
      const badNames = validateCountNames(state.pages, state.site.counts);
      if (badNames.length) {
        throw new Error(
          `unknown {{tbdocs:...}} count name in ${badNames.length} place(s):\n\n` +
          badNames.join("\n\n"));
      }

      state.site.markdown             = createMarkdownIt({
        highlighter: null, linkTables, baseurl, staticFiles: staticFileSet,
        vendoredVideos: state.site.vendoredVideos,
        vendoredImages: state.site.vendoredImages,
        counts: state.site.counts,
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
    submit(out, state) {
      // linkJoin needs the stub set: redirect stubs are excluded from
      // the sitemap / search / canonical checks, and the build knows
      // exactly which pages it generated as stubs -- the standalone
      // script has to sniff for a meta refresh instead.
      state.checkStubs = out.stubs;
    },
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
    expected: ["nav", "buildInit", "buildInfo", "dot", "deriveRedirects", "markdownInit"],
    runOnMain: true,
    async execute({ nav: { sidebar }, buildInit: { initData }, buildInfo: { buildInfo }, dot: _dotSignal, markdownInit: _markdownInitSignal, deriveRedirects: { stubs } }, ctx, state) {
      void _dotSignal;   // dependency signal only -- static files already appended in dot.submit
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

      // Everything deriveTreeRels needs is settled at this point: pages
      // from discover, stubs from deriveRedirects, staticFiles after dot
      // and vendorAssets have appended theirs, and the theme assets right
      // above. Two consumers below share it.
      const common = {
        pages: state.pages, staticFiles: state.staticFiles, stubs,
        themeAssetRels, excludePatterns,
      };
      const treeNames = skipOffline ? ["online"] : ["online", "offline"];
      const treeRels = new Map(treeNames.map(w => [w, deriveTreeRels(w, common)]));

      // Second enforcement point for the publish allowlist, over the
      // inventory each tree will actually receive. The source sweep in
      // `discover` cannot see any of this: redirect stubs, vendored theme
      // assets and the generated auxiliaries (sitemap.xml,
      // search-data.json) are all minted by the build, not found in docs/.
      // Runs unconditionally, not under --check: a build with checks off
      // is exactly when nothing else is watching.
      const policy = publishPolicyFor(state.site.config);
      for (const [which, rels] of treeRels) {
        const strays = unpublishableTreePaths(rels, policy);
        if (strays.length) {
          throw new Error(formatPublishRefusal(strays, {
            surface: "tree", label: `the ${which} tree`,
          }));
        }
      }

      // --check: what each output tree will receive, derived from the
      // build's own records. This is the treeIndex step, computed here
      // rather than as its own task because the workers can only be
      // handed data that goes into dispatch's shared payload -- it is
      // packed and broadcast in submit() below.
      const checkTrees = ctx.opts.check && !ctx.opts.dryRun ? {} : null;
      if (checkTrees) {
        // Only the online tree carries a base path. The offline tree's
        // links are all relative after the rewrite, which is why the
        // deploy workflow passes --base-path to the online pass alone.
        checkTrees.online = {
          rels: treeRels.get("online"),
          baseurl: String(state.site.config.baseurl || ""),
        };
        if (!skipOffline) {
          checkTrees.offline = { rels: treeRels.get("offline"), baseurl: "" };
        }
        state.checkTrees = checkTrees;
      }
      const svgContentsMap = Object.create(null);
      for (const f of state.staticFiles) {
        if (f.srcRel.endsWith(".svg")) {
          try {
            svgContentsMap[f.srcRel] = await fs.readFile(path.join(ctx.srcRoot, f.srcRel), "utf8");
          } catch {}
        }
      }
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
        svgContentsMap,
        checkTrees,
        // Plain objects, not Maps -- packShared serialises to JSON.
        vendoredVideosObj: Object.fromEntries(state.site.vendoredVideos ?? []),
        vendoredImagesObj: Object.fromEntries(state.site.vendoredImages ?? []),
        counts: state.site.counts,
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
      scheduler.state.checkChunks  = [];
      // linkJoin compares against this: a chunk that never arrived would
      // otherwise mean the link check quietly examined fewer pages and
      // still reported a clean pass.
      scheduler.state.checkChunkCount = N;

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

      // 4. Set dep counts and pinning. The two barriers go through
      //    registerBarrier so the dep count cannot be written without
      //    the matching `expected` list -- see its comment.
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
          // Only consulted by the stall watchdog. "render:33 never
          // returned" is not actionable on its own; the six source
          // paths in that chunk are, because the fault is nearly always
          // one page's content.
          describe: () => out.chunks[i].map(p => p.srcRel ?? p.srcPath),
          submit(renderOut, state) {
            for (const r of renderOut.pages) {
              const p = state.pageByDest.get(r.destPath);
              // Dropping the result would lose this page's
              // renderedContent, and every consumer of that skips a page
              // that has none rather than complaining. pageByDest is
              // built from the same page list the chunks were sliced
              // from, so a miss is a bug, not a condition to tolerate.
              if (!p) {
                throw new Error(
                  `render:${i} returned a page the build does not know: ${r.destPath}`,
                );
              }
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
          describe: () => out.chunks[i].map(p => p.srcRel ?? p.srcPath),
          submit(flushOut, state) {
            // --check: the per-chunk reduction rides back on flush's
            // result. Sized by findings, not by the 793k occurrences --
            // those never cross the thread boundary.
            if (flushOut?.check) state.checkChunks.push(flushOut.check);
          },
        });
      }

      registerBarrier(scheduler, views, "renderJoin", renderJoinIdx, "render", N);
      registerBarrier(scheduler, views, "flushJoin",  flushJoinIdx,  "flush",  N);

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
    // vendorAssets is listed for the same reason `dot` is: it appends
    // the files it downloaded to the static-file list, and writeAssets
    // copies that list. The chain prepPageDirs <- prepDest <- dispatch
    // <- markdownInit happens to order them today; naming the dependency
    // is what keeps that true.
    expected: ["dot", "vendorAssets", "prepPageDirs", "highlighterInit"],
    runOnMain: true,
    async execute({ dot: _dotSignal, highlighterInit: _highlightSignal }, ctx, state) {
      void _dotSignal;        // dependency signal only; append already happened in dot.submit
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
        check: !!state.checkTrees,
      });
    },
    submit() { /* terminal */ },
  },

  // Produce _site-pdf/. Depends on flushJoin (pages have renderedContent),
  // resolveBookChapters (bookData._chapters refs into state.pages), and
  // dot (SVG descriptors in staticFiles). Sources CSS directly:
  // tb-highlight.css from state.site.highlighter, print.css from staticFiles.
  // Runs in parallel with writeAssets → searchData → writeAux → writeOffline.
  writePdf: {
    // renderJoin is listed although execute() ignores it. writePdf reads
    // page.renderedContent, which render:i.submit fills -- and a dep
    // count reaching zero is not a promise that those submits have run.
    // It holds transitively today via flush:i being lane-pinned to
    // render:i, which is not something to rely on in a list whose whole
    // job is to say what must have merged. renderJoin is DONE by this
    // point, so it costs nothing.
    expected: ["flushJoin", "renderJoin", "dot", "resolveBookChapters"],
    runOnMain: true,
    async execute(_, ctx, state) {
      const skipPdf = ctx.opts.skipPdf ?? (state.site.config.also_build_pdf === false);
      if (ctx.opts.dryRun || skipPdf) return null;
      return writePdf(state.pages, state.staticFiles, state.site, ctx.destRoot, {
        tolerateMissingImages: ctx.opts.tolerateMissingImages,
        highlightCss: state.site.highlightCss,
        check: !!state.checkTrees,
      });
    },
    submit() { /* terminal */ },
  },

  // ── Checks ────────────────────────────────────────────────────────
  //
  // Gated on --check. Without it these three are no-ops that return
  // immediately, so a plain build keeps its shape.
  //
  // None of them may abort the graph: Scheduler._abort() rejects the
  // whole build on a task failure, and nav.mjs is right to do that
  // because a nav ambiguity means the *output* is wrong. A broken link
  // does not -- it produces a site you want on disk to inspect. So
  // these collect and report, and runBuild sets the exit code after
  // the trees are complete.

  // Merge the per-chunk reductions, settle the cross-page fragments no
  // chunk could decide alone, and run the three cross-file checks.
  //
  // Depends on writeAux rather than merely on flushJoin because the
  // sitemap and search-index checks need sitemap.xml and
  // search-data.json -- and takes them as the strings the build wrote,
  // not as bytes read back, so what is checked is what the tree got.
  // Depends on writeOffline as well because the offline tree's redirect
  // stubs only exist as strings inside it -- deriveOfflineRedirect
  // rewrites each stub's URLs, and those 290 files carry 580 link
  // occurrences the standalone script checks.
  linkJoin: {
    expected: ["flushJoin", "writeAux", "writeOffline"],
    runOnMain: true,
    async execute({ writeAux, writeOffline: offlineResult }, ctx, state) {
      if (!state.checkTrees) return null;
      const { checkChunk, joinChunks, treeIndexFor, normalizeBasePath: normBase, TREES } =
        await import("./check.mjs");
      const { sitemapIncludes } = await import("./sitemap.mjs");
      const { searchIncludes }  = await import("./search.mjs");

      const stubs     = state.checkStubs ?? [];
      const stubRels  = new Set(stubs.map(s => s.destPath.replaceAll("\\", "/")));
      const contentPages = state.pages
        .filter(p => p.frontmatter?.layout !== "book-combined");
      const relOf     = p => p.destPath.replaceAll("\\", "/");
      const pageRels  = contentPages.map(relOf);
      const relFiles  = [...pageRels, ...stubRels];

      // The cross-file checks enforce "every page the generator was asked
      // to emit", so they need the generators' own opt-out predicates --
      // otherwise the first page carrying `sitemap: false` (documented in
      // Pipeline-Stages.md) or `search_exclude: true` fails the build with
      // no hint why.
      const sitemapOptOut = new Set(
        contentPages.filter(p => !sitemapIncludes(p)).map(relOf)
      );
      const searchOptOut = new Set(
        contentPages.filter(p => !searchIncludes(p)).map(relOf)
      );

      // Redirect stubs never went through flush -- writeRedirects and
      // writeOfflineRedirects emit them -- so they are one extra chunk
      // per tree, checked here on main. 290 tiny files.
      const stubHtml = {
        online:  stubs,
        offline: offlineResult?.checkStubs ?? [],
      };

      // A check that silently examined less than the whole site is the
      // failure this design exists to prevent, so a short chunk list is
      // reported rather than tolerated. It cannot abort the build --
      // check tasks collect and report -- so it rides back as an error
      // on every tree, which formatReport turns into a failing exit code.
      const short = state.checkChunks.length !== state.checkChunkCount
        ? `only ${state.checkChunks.length} of ${state.checkChunkCount} page chunks ` +
          `reached the link check; findings are incomplete`
        : null;

      const results = {};
      for (const [which, { rels, baseurl }] of Object.entries(state.checkTrees)) {
        const root     = ctx.destRoot + TREES[which].suffix;
        const basePath = normBase(baseurl);
        const chunks   = state.checkChunks.map((c, i) => {
          // No optional chaining here on purpose: every lane builds the
          // same tree-key set, so a chunk with no entry for this tree
          // means a lane produced something else entirely. Name the
          // chunk rather than letting joinChunks report it generically.
          if (!c) throw new Error(`link check: chunk ${i} produced no result`);
          if (!c[which]) {
            throw new Error(`link check: chunk ${i} produced no '${which}' result`);
          }
          return c[which];
        });
        if (short) chunks.push({ error: short });

        if (stubHtml[which]?.length) {
          const env = { root, tree: TREES[which], basePath, index: treeIndexFor(root, rels) };
          try {
            chunks.push(checkChunk(stubHtml[which], env));
          } catch (err) {
            chunks.push({ error: `${which} redirect-stub check failed: ${err.message}` });
          }
        }

        results[which] = joinChunks(chunks, {
          root, tree: TREES[which], basePath, relFiles, stubRels,
          aux: which === "online" ? {
            sitemapXml: writeAux?.sitemapStats?.xml ?? null,
            searchJson: writeAux?.searchStats?.json ?? null,
            sitemapOptOut,
            searchOptOut,
          } : {},
        });
      }
      return results;
    },
    submit() {},
  },

  // The book is one 6.5 MB document with almost entirely internal
  // fragments, written by a different task from a different string.
  // Keeping it its own pass is cheaper than special-casing the chunk
  // path for a single file.
  checkBook: {
    expected: ["writePdf"],
    runOnMain: true,
    async execute({ writePdf: pdfResult }, ctx, state) {
      if (!state.checkTrees || !pdfResult?.checkBook) return null;
      const { checkChunk, joinChunks, treeIndexFor, TREES } = await import("./check.mjs");
      const root = ctx.destRoot + TREES.pdf.suffix;
      const env  = { root, tree: TREES.pdf, basePath: "",
                     index: treeIndexFor(root, pdfResult.checkBook.rels) };
      let chunk;
      try {
        chunk = checkChunk([{ destPath: "book.html", html: pdfResult.checkBook.html }], env);
      } catch (err) {
        chunk = { error: `book check failed: ${err.message}` };
      }
      return joinChunks([chunk], { root, tree: TREES.pdf, relFiles: ["book.html"] });
    },
    submit() {},
  },

  // Formats every tree's result and decides the exit code. Terminal:
  // nothing depends on it, so a slow report never delays an output.
  checkReport: {
    // `scss` is listed because --check-audit-index reads the tree off
    // disk, and the combined stylesheet is in the index from the moment
    // dispatch builds it. Without this edge the audit can run first and
    // report the file as "indexed but not on disk" -- which it was, for
    // another few milliseconds. On the real site scss happens to finish
    // long before the check; on a three-page fixture it does not, and
    // the audit failed the build over nothing.
    expected: ["linkJoin", "checkBook", "scss"],
    runOnMain: true,
    async execute({ linkJoin: trees, checkBook: book }, ctx, state) {
      if (!state.checkTrees) return null;
      const { formatReport, findingsFor, auditIndex, TREES } = await import("./check.mjs");

      const parts = [];
      const byTree = { ...(trees ?? {}) };
      if (book) byTree.pdf = book;
      let linksFailed = false, integrityFailed = false;
      for (const r of Object.values(byTree)) {
        const f = formatReport(r);
        parts.push(f.text);
        linksFailed     ||= f.linksFailed;
        integrityFailed ||= f.integrityFailed;
      }

      // --check-findings: the machine-readable view, for
      // scripts/check_links_diff.mjs to diff against the standalone
      // script's. Written before the exit code is decided so a failing
      // check still produces the file that says what it found.
      if (ctx.opts.checkFindings) {
        const out = {};
        for (const [which, r] of Object.entries(byTree)) out[which] = findingsFor(r);
        await fs.writeFile(ctx.opts.checkFindings, JSON.stringify(out, null, 1), "utf8");
      }

      // Opt-in: the one failure mode the findings comparison cannot see,
      // because a spurious index entry only matters once something links
      // to the path it wrongly claims exists.
      if (ctx.opts.auditIndex) {
        for (const [which, { rels }] of Object.entries(state.checkTrees)) {
          const root = ctx.destRoot + TREES[which].suffix;
          const { missing, spurious } = await auditIndex(root, rels);
          parts.push(`  ${TREES[which].label.padEnd(14)} index audit: ` +
                     `${missing.length} on disk but not indexed, ` +
                     `${spurious.length} indexed but not on disk\n`);
          for (const r of missing.slice(0, 20))  parts.push(`      on disk only: ${r}\n`);
          for (const r of spurious.slice(0, 20)) parts.push(`      indexed only: ${r}\n`);
          if (missing.length || spurious.length) integrityFailed = true;
        }
      }

      return { text: parts.join(""), linksFailed, integrityFailed };
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
  config: "Seeds", buildInfo: "Seeds", scssLight: "Seeds", scssDark: "Seeds", scss: "Write", dot: "Spine",
  highlighterInit: "Seeds", loadData: "Seeds",
  discover: "Spine", nav: "Spine", markdownInit: "Spine", buildInit: "Spine",
  resolveBookChapters: "Spine",
  deriveRedirects: "Spine", deriveSitemap: "Spine",
  dispatch: "Render", prepDest: "Render", prepPageDirs: "Render",
  renderJoin: "Render", flushJoin: "Write",
  writeAssets: "Write", searchData: "Write", writeAux: "Write", writeOffline: "Write", writePdf: "Write",
  linkJoin: "Check", checkBook: "Check", checkReport: "Check",
};
const GANTT_SECTION_ORDER = ["Seeds", "Spine", "Render", "Write", "Check"];
const CHECK_TASKS = new Set(["linkJoin", "checkBook", "checkReport"]);

function groupGanttTimings(timings, { check = false } = {}) {
  if (timings.size === 0) return null;
  const t0 = Math.min(...[...timings.values()].map(t => t.start));

  const grouped = new Map(GANTT_SECTION_ORDER.map(s => [s, []]));
  for (const [id, { start, end, t3, workerStart, workerEnd, lane, consolidate, ganttSection }] of [...timings.entries()].sort((a, b) => a[1].start - b[1].start)) {
    if (id.endsWith("Join")) continue;
    // Without --check these are no-ops; charting three zero-width bars
    // would only make a plain build's Gantt harder to read.
    if (!check && CHECK_TASKS.has(id)) continue;
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

// The Gantt is rendered from the scheduler's own timings, so it cannot
// exist until every task -- including the check -- has finished. That
// makes it the one page whose shipped bytes the check never saw. It
// carries no links and no ids today, which is exactly the kind of fact
// that stops being true without anyone noticing, so the patched HTML
// comes back for recheckInjected to run through the same check path.
async function injectGanttChart(pages, destRoot, svgContent) {
  const injected = [];
  if (!svgContent) return injected;
  const page = pages.find(p => p.permalink === "/Documentation/Development/BuildInfo");
  if (!page) return injected;

  for (const root of [destRoot, `${destRoot}-offline`]) {
    const htmlPath = path.join(root, page.destPath);
    let html;
    try { html = await fs.readFile(htmlPath, "utf8"); }
    catch (e) { if (e.code !== "ENOENT") throw e; continue; }
    const marker = 'data-svg-src="assets/images/gantt.svg"';
    const idx = html.indexOf(marker);
    if (idx < 0) continue;
    const svgStart = html.indexOf("<svg", idx);
    const svgEnd = html.indexOf("</svg>", svgStart);
    if (svgStart < 0 || svgEnd < 0) continue;
    const patched = html.slice(0, svgStart) + svgContent + html.slice(svgEnd + 6);
    await fs.writeFile(htmlPath, patched, "utf8");
    await fs.writeFile(path.join(root, "assets", "images", "gantt.svg"), svgContent, "utf8");
    injected.push({
      which: root === destRoot ? "online" : "offline",
      destPath: page.destPath.replaceAll("\\", "/"),
      html: patched,
    });
  }
  return injected;
}

// Run the injected pages back through checkChunk and report anything the
// pre-injection pass did not already report for the same page. Only the
// delta: the page was checked once already, and printing its existing
// findings a second time would read as a regression.
async function recheckInjected(injected, linkResults, state, destRoot) {
  if (!injected.length || !linkResults) return { text: "", failed: false };
  const { checkChunk, treeIndexFor, normalizeBasePath: normBase, TREES } =
    await import("./check.mjs");

  const out = [];
  let failed = false;
  for (const { which, destPath, html } of injected) {
    const prior = linkResults[which];
    const treeCfg = state.checkTrees?.[which];
    if (!prior || !treeCfg) continue;
    const root = destRoot + TREES[which].suffix;
    const env = {
      root, tree: TREES[which], basePath: normBase(treeCfg.baseurl),
      index: treeIndexFor(root, treeCfg.rels),
    };

    let now;
    try { now = checkChunk([{ destPath, html }], env); }
    catch (err) {
      out.push(`  ERROR  ${TREES[which].label}: rechecking the injected ` +
               `${destPath} failed: ${err.message}
`);
      failed = true;
      continue;
    }

    const was = JSON.stringify(prior.integrityByFile.get(destPath) ?? null);
    const is  = JSON.stringify(now.integrity.find(([p]) => p === destPath)?.[1] ?? null);
    if (was !== is) {
      out.push(`  ${TREES[which].label}/${destPath}: the injected Gantt SVG ` +
               `changed this page's integrity findings: ${is}
`);
      failed = true;
    }

    // Fragment references into other pages come back as `pending` from a
    // one-page chunk and are not decidable here; the SVG carries no
    // links at all, so anything in `broken` or `forbidden` is new.
    const priorBroken = new Set();
    for (let i = 0; i < prior.broken.length; i += 3) {
      if (prior.broken[i] === destPath) priorBroken.add(prior.broken[i + 1]);
    }
    for (let i = 0; i < now.broken.length; i += 3) {
      if (priorBroken.has(now.broken[i + 1])) continue;
      out.push(`  ${TREES[which].label}/${destPath}: the injected Gantt SVG ` +
               `added a broken reference: ${now.broken[i + 1]} -- ${now.broken[i + 2]}
`);
      failed = true;
    }
    for (let i = 0; i < now.forbidden.length; i += 3) {
      out.push(`  ${TREES[which].label}/${destPath}: the injected Gantt SVG ` +
               `added a forbidden URL: ${now.forbidden[i + 1]}
`);
      failed = true;
    }
  }
  return { text: out.join(""), failed };
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
  const scheduler = new Scheduler({
    pool, tasks: TASKS, views, idMapping,
    ganttSections: GANTT_SECTION,
    stallMs: opts.stallTimeoutMs ?? 120000,
  });

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

  const { dotStats }   = results.get("dot");
  const { scssResult } = results.get("scss");

  if (dotStats.regenerated > 0 || dotStats.failed > 0) {
    const parts = [`regenerated ${dotStats.regenerated}`];
    if (dotStats.failed > 0) parts.push(`failed ${dotStats.failed}`);
    console.log(`dot: ${parts.join(", ")} of ${dotStats.processed} SVG(s)`);
  }
  if (dotStats.failed > 0) process.exitCode = 1;
  if (scssResult.failed)   process.exitCode = 1;

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
  // The Gantt injection rewrites BuildInfo.html in both trees, so it has
  // to happen before the check report is printed -- otherwise the check
  // has reported on bytes that no longer exist. It cannot happen before
  // the check RUNS (it is built from that run's timings), so the patched
  // pages go back through the same check path instead.
  //
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

  const grouped = groupGanttTimings(scheduler.timings, { check: !!opts.check });

  const injectStart = Date.now();
  const injected = await injectGanttChart(
    scheduler.state.pages, destRoot, grouped ? renderGantt(grouped) : ""
  );
  const injectMs = Date.now() - injectStart;
  const recheck = await recheckInjected(
    injected, results.get("linkJoin"), scheduler.state, destRoot
  );

  const checkResult = results.get("checkReport");
  if (checkResult) {
    console.log(`  ${pc.bold("check:")}`);
    process.stdout.write(checkResult.text);
    process.stdout.write(recheck.text);
    // Same code scheme scripts/check_links.mjs uses -- 1 for link
    // failures, 2 for integrity failures, 3 for both -- so CI can still
    // tell "broken link" from "malformed output" after check.bat stops
    // invoking the script. OR'd in rather than assigned: the build's own
    // failures (dot, scss, vendorAssets) already claim bit 0.
    const code = (checkResult.linksFailed ? 1 : 0)
      | ((checkResult.integrityFailed || recheck.failed) ? 2 : 0);
    if (code) process.exitCode = (process.exitCode ?? 0) | code;
  } else if (recheck.failed) {
    process.stdout.write(recheck.text);
    process.exitCode = (process.exitCode ?? 0) | 2;
  }

  console.log(scheduler.summary());
  console.log(pc.dim(`gantt-inject=${injectMs}ms`));

  // Drift guard from PLAN-1.md §1, against a committed baseline rather than
  // the literal 836 it was written with -- see page-baseline.mjs for why a
  // floor could not do the job. OR'd into the exit code rather than assigned:
  // the check above claims bits 1 and 2, and the old `= 1` here clobbered
  // them, so a build with both an integrity failure and a page drop reported
  // only the drop.
  const drift = await checkPageBaseline({
    // Repo-relative and forward-slashed, so it matches GUARDED_SRC however the
    // build was invoked. tbdocs also runs over test/fixtures/check-src, which
    // has no baseline and must not be measured against the site's.
    src: path.relative(REPO_ROOT, path.resolve(opts.src ?? "docs")).replaceAll(path.sep, "/"),
    pages: pages.length,
    staticFiles: staticFiles.length,
    write: !process.env.CI && !opts.serve && !opts.dryRun,
    force: !!opts.updatePageBaseline,
  });
  if (drift.text) process.stdout.write(drift.text);
  if (drift.failed) process.exitCode = (process.exitCode ?? 0) | 1;

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
    // A stall report is the diagnostic; the Error wrapping it carries a
    // stack pointing at the watchdog's own setInterval, which tells the
    // reader nothing and buries the part that does.
    if (err?.stalled && err.cause?.message) console.error(err.cause.message);
    else console.error(err);
    process.exit(1);
  });
}
