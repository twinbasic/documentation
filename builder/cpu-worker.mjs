// Worker harness for the tbdocs build pipeline. Routes named tasks to the
// appropriate handler and posts back { result } or { error, stack }.
// See PLAN-scheduler.md §Worker for the full handler set.

import { parentPort } from "node:worker_threads";

import { compileLightScss, compileDarkScss } from "./scss.mjs";
import { regenerateMermaid } from "./mermaid.mjs";
import { captureBuildInfo }  from "./build-info.mjs";

import { initHighlighter }                         from "./highlight.mjs";
import { createMarkdownIt, buildLinkTables,
         renderPhase }                             from "./render.mjs";
import { templatePhase }                           from "./template.mjs";
import { unpackShared }                            from "./sab-broadcast.mjs";

import { deriveOfflinePage, deriveOfflinePageCached,
         sliceNavBlock, normalizeBaseurl,
         posixDirname }                            from "./offline-rewrite.mjs";

// Start WASM init immediately, do NOT await. Module evaluation finishes
// synchronously so the parentPort.on('message') dispatcher is installed
// before the pool sends any work. Only the `render` handler awaits.
const highlighterP = initHighlighter();

const handlers = {
  async scssLight({ ctx }) {
    return { scssLightResult: await compileLightScss(ctx.srcRoot) };
  },

  async scssDark({ ctx }) {
    return { scssDarkResult: await compileDarkScss(ctx.srcRoot) };
  },

  async mermaid({ ctx }) {
    return { mermaidStats: await regenerateMermaid(ctx.srcRoot) };
  },

  async buildInfo() {
    return { buildInfo: await captureBuildInfo() };
  },

  async render({ inputs }) {
    const workerStart = Date.now();
    const { sharedSAB, chunk } = inputs;
    const { siteData, initData, linkTablesData, staticFilesArr,
            baseurl, buildInfo, sitePathsArr,
            skipOffline } = unpackShared(sharedSAB);

    const highlighter = await highlighterP;
    const linkTables  = reconstructLinkTables(linkTablesData);
    const staticFiles = new Set(staticFilesArr);
    const markdown    = createMarkdownIt({ highlighter, linkTables, baseurl, staticFiles });

    const site = { ...siteData, markdown, buildInfo };
    await renderPhase(chunk, site);
    await templatePhase(chunk, site, initData);

    // Offline rewrite pass (Phase III of PLAN-scheduler-offline.md).
    // Runs the per-page URL rewrite inside the worker so it
    // parallelises across CPUs. When skipOffline is true the entire
    // pass is skipped — no Set construction, no rewriting.
    if (!skipOffline) {
      const sitePaths = new Set(sitePathsArr);
      const caches = { rawResolution: new Map(), seg: new Map(), result: new Map() };
      const offlineState = { sitePaths, caches, baseurl: normalizeBaseurl(baseurl) };

      // Nav-cache pre-pass: group chunk pages by dest dir, derive the
      // first page per dir, cache nav block slices. Same logic as
      // writeOfflinePages in offline.mjs.
      const writable = chunk.filter(p => p.html !== undefined);
      const byDir = new Map();
      for (const p of writable) {
        const destDir = posixDirname(p.destPath);
        let g = byDir.get(destDir);
        if (!g) { g = []; byDir.set(destDir, g); }
        g.push(p);
      }
      const navCache = new Map();
      for (const [destDir, group] of byDir) {
        const first = group[0];
        const input = sliceNavBlock(first.html);
        if (input === null) continue;
        const { html: rendered } = deriveOfflinePage(first, offlineState);
        const output = sliceNavBlock(rendered);
        if (output === null) continue;
        navCache.set(destDir, { input, output });
      }
      offlineState.navCache = navCache;

      for (const p of writable) {
        const { html, misses } = deriveOfflinePageCached(p, offlineState);
        p.offlineHtml = html;
        p.offlineMisses = misses;
      }
    }

    const workerEnd = Date.now();
    // book-combined pages have renderedContent but no html (Phase 8
    // handles them from renderedContent); send html: undefined for those.
    return {
      workerStart, workerEnd,
      pages: chunk.map(p => ({
        destPath:        p.destPath,
        renderedContent: p.renderedContent,
        html:            p.html,
        offlineHtml:     p.offlineHtml,
        offlineMisses:   p.offlineMisses,
      })),
    };
  },
};

parentPort.on("message", async (msg) => {
  const { name, ...payload } = msg;
  const handler = handlers[name];
  if (!handler) {
    parentPort.postMessage({ error: `unknown task: ${name}` });
    return;
  }
  try {
    const result = await handler(payload);
    parentPort.postMessage({ result });
  } catch (err) {
    parentPort.postMessage({ error: err.message, stack: err.stack });
  }
});

// linkTables values are page objects in the main pipeline, but
// resolveLink() in the relative-links plugin only reads .permalink.
// The serialized form ships [key, permalink] pairs; we reconstruct
// minimal { permalink } stubs in the worker.
function reconstructLinkTables({ byPath, byUrl, byRedirect }) {
  const make = (pairs) => new Map(pairs.map(([k, pl]) => [k, { permalink: pl }]));
  return { byPath: make(byPath), byUrl: make(byUrl), byRedirect: make(byRedirect) };
}
