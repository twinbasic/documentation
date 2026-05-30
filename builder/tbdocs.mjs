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
  createMarkdownIt, initHighlighter,
  buildLinkTables, serializeLinkTables,
} from "./render.mjs";
import { buildInitFn } from "./template.mjs";
import { writePhase, prepareDestination } from "./write.mjs";
import { writeRedirects, deriveRedirectStubs } from "./redirects.mjs";
import { writeSitemap, deriveSitemapUrls } from "./sitemap.mjs";
import { writeSearchData } from "./search.mjs";
import { writeOffline, enumerateVendoredThemeAssets } from "./offline.mjs";
import { buildSitePathsSync } from "./offline-rewrite.mjs";
import { writePdf } from "./pdf.mjs";
import { packShared } from "./sab-broadcast.mjs";

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
// Seeds (config, buildInfo, scss, mermaid, prepDest), the main-thread spine (discover →
// nav → markdownInit / buildInit → seo / loadData → resolveBookChapters +
// deriveRedirects / deriveSitemap), the render fan-out (dispatch →
// render:0..N → renderJoin), and write/post-write tasks
// (renderJoin + prepDest → searchData; write + searchData → writeAux →
// writeOffline; renderJoin + mermaid → writePdf) are scheduler tasks.
// runBuild() constructs the pool + scheduler, awaits start(), logs the
// summary, and returns.

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
    submit(out, emit, state) {
      state.site.buildInfo = out.buildInfo;
      emit("dispatch", out);
    },
  },

  // Sass compilation (~700 ms CPU). Worker so it overlaps with the main spine.
  scss: {
    expected: [],
    // execute() runs in cpu-worker.mjs as the "scss" handler.
    submit(out, emit) { emit("write", out); },
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
      emit("write",    out);
      emit("writePdf", out);
      emit("dispatch", out);
    },
  },

  // Clean and recreate _site/. No dependencies -- overlaps with the entire
  // main-thread spine and worker seeds. Joined by write and searchData.
  prepDest: {
    expected: [],
    runOnMain: true,
    async execute(_, ctx) {
      await prepareDestination(ctx.destRoot, ctx.opts.dryRun);
      return {};
    },
    submit(_, emit) {
      emit("write",      {});
      emit("searchData", {});
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
    submit(out, emit) { emit("dispatch", out); },
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
    submit(_, emit) { emit("dispatch", {}); },
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
    submit(out, emit) { emit("writeAux", out); emit("dispatch", out); },
  },

  deriveSitemap: {
    expected: ["discover"],
    runOnMain: true,
    execute(_, ctx, state) {
      return { urls: deriveSitemapUrls(state.pages, state.site) };
    },
    submit(out, emit) { emit("writeAux", out); },
  },

  // ── Render fan-out ─────────────────────────────────────────────────────────

  // Slices state.pages into chunks and dynamically registers render:0..N
  // worker tasks plus a renderJoin barrier. Waits for buildInit (template
  // chrome), resolveBookChapters (identity-critical page refs), and
  // buildInfo (git metadata for the footer).
  dispatch: {
    expected: ["buildInit", "resolveBookChapters", "buildInfo", "mermaid", "deriveRedirects"],
    runOnMain: true,
    execute({ buildInit: { initData }, buildInfo: { buildInfo }, mermaid: { mermaidStats }, deriveRedirects: { stubs } }, ctx, state) {
      void mermaidStats; // dependency signal only -- static files already appended in mermaid.submit
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
        initData,
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
    submit(out, emit, _state, scheduler) {
      const N = out.chunks.length;

      scheduler.register("renderJoin", {
        expected: Array.from({ length: N }, (_, i) => `render:${i}`),
        runOnMain: true,
        execute() { return {}; },
        submit(_, emit) {
          emit("write",      {});
          emit("writePdf",   {});
          emit("searchData", {});
        },
      });

      for (let i = 0; i < N; i++) {
        const id = `render:${i}`;
        scheduler.register(id, {
          expected: [],
          handler:  "render",
          submit(renderOut, emit, state) {
            for (const r of renderOut) {
              const p = state.pageByDest.get(r.destPath);
              if (!p) continue;
              p.renderedContent = r.renderedContent;
              if (r.html !== undefined) p.html = r.html;
              if (r.offlineHtml !== undefined) p.offlineHtml = r.offlineHtml;
              if (r.offlineMisses !== undefined) p.offlineMisses = r.offlineMisses;
            }
            emit("renderJoin", renderOut);
          },
        });
        scheduler.seed(id, {
          sharedSAB: out.sharedSAB,
          chunk:     out.chunks[i],
        });
      }
    },
  },

  // ── Write and post-write tasks ─────────────────────────────────────────────

  // Materialise pages + static files + generated CSS to _site/.
  // Waits for renderJoin (pages rendered + templated), scss (generated CSS),
  // mermaid (SVG descriptors appended to state.staticFiles by mermaid.submit),
  // and prepDest (_site/ cleaned and recreated).
  write: {
    expected: ["renderJoin", "scss", "mermaid", "prepDest"],
    runOnMain: true,
    async execute({ scss: { scssResult }, mermaid: { mermaidStats } }, ctx, state) {
      void mermaidStats; // dependency signal only; append already happened in mermaid.submit
      const generatedAssets = [];
      if (state.site.highlighter?.themeCss) {
        generatedAssets.push({ rel: "assets/css/tb-highlight.css", content: state.site.highlighter.themeCss });
      }
      if (scssResult.compiled) {
        generatedAssets.push({ rel: "assets/css/just-the-docs-combined.css", content: scssResult.css });
      }
      return writePhase(state.pages, state.staticFiles, {
        destRoot:  ctx.destRoot,
        dryRun:    ctx.opts.dryRun,
        generatedAssets,
        baseurl:   String(state.site.config.baseurl || ""),
      });
    },
    submit(out, emit) { emit("writeAux", out); },
  },

  // Write search-data.json. Depends on renderJoin (pages have
  // renderedContent) and prepDest (_site/ exists). Result passes
  // through to writeAux so its search.json field reaches writeOffline.
  searchData: {
    expected: ["renderJoin", "prepDest"],
    runOnMain: true,
    async execute(_, ctx, state) {
      if (ctx.opts.dryRun) return { entries: 0, json: "" };
      return writeSearchData(state.pages, state.site, ctx.destRoot);
    },
    submit(out, emit) { emit("writeAux", out); },
  },

  // Write redirect stubs + sitemap/robots. Waits for write (pages on disk),
  // searchData, deriveRedirects, and deriveSitemap.
  // Passes searchStats through to writeOffline (for search-data.js).
  writeAux: {
    expected: ["write", "searchData", "deriveRedirects", "deriveSitemap"],
    runOnMain: true,
    async execute({ searchData: searchStats, deriveRedirects: { stubs }, deriveSitemap: { urls } }, ctx, state) {
      if (ctx.opts.dryRun) return { redirectStats: null, sitemapStats: null, searchStats };
      const [redirectStats, sitemapStats] = await Promise.all([
        writeRedirects(state.pages, state.site, ctx.destRoot, stubs),
        writeSitemap(state.pages, state.site, ctx.destRoot, urls),
      ]);
      return { redirectStats, sitemapStats, searchStats };
    },
    submit(out, emit) {
      emit("writeOffline", out);
    },
  },

  // Produce _site-offline/. Runs in parallel with writePdf on the main thread;
  // the gain is interleaved async I/O windows.
  writeOffline: {
    expected: ["writeAux"],
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

  // Produce _site-pdf/. Depends on renderJoin (pages have renderedContent)
  // and mermaid (SVG descriptors in staticFiles). Sources CSS directly:
  // tb-highlight.css from state.site.highlighter, print.css from staticFiles.
  // Runs in parallel with write → searchData → writeAux → writeOffline.
  writePdf: {
    expected: ["renderJoin", "mermaid"],
    runOnMain: true,
    async execute(_, ctx, state) {
      const skipPdf = ctx.opts.skipPdf ?? (state.site.config.also_build_pdf === false);
      if (ctx.opts.dryRun || skipPdf) return null;
      return writePdf(state.pages, state.staticFiles, state.site, ctx.destRoot, {
        tolerateMissingImages: ctx.opts.tolerateMissingImages,
        highlightCss: state.site.highlighter?.themeCss,
      });
    },
    submit() { /* terminal */ },
  },
};

function chunkPages(pages, workers) {
  const n = Math.min(workers, pages.length);
  if (n === 0) return [];
  const size = Math.ceil(pages.length / n);
  const chunks = [];
  for (let i = 0; i < pages.length; i += size) chunks.push(pages.slice(i, i + size));
  return chunks;
}

// ── Build entry point ─────────────────────────────────────────────────────────

export async function runBuild(opts) {
  const { src, dest } = opts;
  const srcRoot = path.resolve(process.cwd(), src);
  const destRoot = path.resolve(dest ?? path.join(srcRoot, "_site"));

  const workerCount = os.availableParallelism();
  const pool = new WorkerPool(workerCount, CPU_WORKER_URL);
  const scheduler = new Scheduler({ pool, tasks: TASKS });
  const ctx = { srcRoot, destRoot, opts, workerCount };

  let results;
  try {
    results = await scheduler.start(ctx);
  } finally {
    await pool.destroy();
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

  const writeStats    = results.get("write");
  const auxResult     = results.get("writeAux");
  const offlineResult = results.get("writeOffline");
  const pdfResult     = results.get("writePdf");

  console.log(`Phase 1+2+3+4+5+6+7+8 done: ${pages.length} pages, ${staticFiles.length} static files`);
  console.log(`  wrote: ${writeStats.pages.written} pages (${writeStats.pages.skipped} skipped), ` +
              `${writeStats.theme.copied} theme assets, ${writeStats.staticFiles.copied} static files ` +
              `-> ${destRoot}`);
  if (auxResult?.redirectStats) {
    console.log(`  aux:   ${auxResult.redirectStats.written} redirect stubs, ` +
                `${auxResult.sitemapStats.entries} sitemap entries, ` +
                `${auxResult.searchStats.entries} search-index entries`);
  }
  if (offlineResult) {
    console.log(`  offline: ${offlineResult.html} HTML, ${offlineResult.css} CSS, ` +
                `${offlineResult.redirects} redirect stubs, ` +
                `${offlineResult.statics + offlineResult.assets} assets, ` +
                `${offlineResult.excluded} excluded ` +
                `(${offlineResult.unresolved} unresolved) -> ${destRoot}-offline`);
    if (opts.profileOffline && offlineResult.subT) {
      console.log(`  offline: ${offlineResult.subT.summary()}`);
    }
  }
  if (pdfResult) {
    const mb = (pdfResult.bookBytes / (1024 * 1024)).toFixed(1);
    const missingClause = pdfResult.missing > 0 ? ` (${pdfResult.missing} missing)` : "";
    console.log(`  pdf:     book.html (${mb} MB), ${pdfResult.css} CSS, ` +
                `${pdfResult.images} images${missingClause} -> ${destRoot}-pdf`);
  }
  console.log(scheduler.summary());

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
