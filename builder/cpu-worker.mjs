// Worker harness for the tbdocs build pipeline. Routes named tasks to the
// appropriate handler and posts back { result } or { error, stack }.
// See PLAN-scheduler.md §Worker for the full handler set.

import { parentPort } from "node:worker_threads";
import { compileLightScss, compileDarkScss } from "./scss.mjs";
import { regenerateMermaid } from "./mermaid.mjs";
import { captureBuildInfo }  from "./build-info.mjs";

import { createMarkdownIt, renderPhase }      from "./render.mjs";
import { templatePhase }                      from "./template.mjs";
import { unpackShared }                       from "./sab-broadcast.mjs";
import { deriveOfflinePage, deriveOfflinePageCached,
         sliceNavBlock, normalizeBaseurl,
         posixDirname }                       from "./offline-rewrite.mjs";

// Shiki (highlight.mjs) is loaded lazily — its transitive import of the
// shiki package is the heaviest single module in the worker graph. A
// warmup signal from the pool triggers loading on idle workers so it
// overlaps with the main-thread discover phase; critical-path seeds
// (buildInfo, scss) finish before the import starts on their workers.
let _highlighterP = null;
function ensureHighlighterInit() {
  if (!_highlighterP) _highlighterP = import("./highlight.mjs").then(m => m.initHighlighter());
  return _highlighterP;
}

const handlers = {
  async scssLight({ ctx }) {
    const workerStart = Date.now();
    const scssLightResult = await compileLightScss(ctx.srcRoot);
    return { workerStart, workerEnd: Date.now(), scssLightResult };
  },

  async scssDark({ ctx }) {
    const workerStart = Date.now();
    const scssDarkResult = await compileDarkScss(ctx.srcRoot);
    return { workerStart, workerEnd: Date.now(), scssDarkResult };
  },

  async mermaid({ ctx }) {
    const workerStart = Date.now();
    const mermaidStats = await regenerateMermaid(ctx.srcRoot);
    return { workerStart, workerEnd: Date.now(), mermaidStats };
  },

  async buildInfo() {
    const workerStart = Date.now();
    const buildInfo = await captureBuildInfo();
    return { workerStart, workerEnd: Date.now(), buildInfo };
  },

  async render({ inputs }) {
    const workerStart = Date.now();
    const { sharedSAB, chunk } = inputs;
    const env = await getOrInitRenderEnv(sharedSAB);

    await renderPhase(chunk, env.site);
    await templatePhase(chunk, env.site, env.initData);

    if (env.offlineBase) {
      const offlineState = { ...env.offlineBase,
        caches: { rawResolution: new Map(), seg: new Map(), result: new Map() },
      };

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

// Cached per-worker render environment. The sharedSAB is identical for every
// chunk in a build, so we unpack + derive once and reuse across chunks.
let _renderSAB = null;
let _renderEnv = null;

async function getOrInitRenderEnv(sharedSAB) {
  if (_renderSAB === sharedSAB) return _renderEnv;

  const { siteData, initData, linkTablesData, staticFilesArr,
          baseurl, buildInfo, sitePathsArr,
          skipOffline } = unpackShared(sharedSAB);

  const highlighter = await ensureHighlighterInit();
  const linkTables  = reconstructLinkTables(linkTablesData);
  const staticFiles = new Set(staticFilesArr);
  const markdown    = createMarkdownIt({ highlighter, linkTables, baseurl, staticFiles });
  const site        = { ...siteData, markdown, buildInfo };

  let offlineBase = null;
  if (!skipOffline) {
    offlineBase = {
      sitePaths: new Set(sitePathsArr),
      baseurl:   normalizeBaseurl(baseurl),
    };
  }

  _renderSAB = sharedSAB;
  _renderEnv = { site, initData, offlineBase };
  return _renderEnv;
}

parentPort.on("message", async (msg) => {
  // Warmup signal from the pool — start Shiki init without posting a
  // response so the pool's busy-tracking is unaffected.
  if (msg.warmup) { ensureHighlighterInit(); return; }

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
  ensureHighlighterInit();
});

// linkTables values are page objects in the main pipeline, but
// resolveLink() in the relative-links plugin only reads .permalink.
// The serialized form ships [key, permalink] pairs; we reconstruct
// minimal { permalink } stubs in the worker.
function reconstructLinkTables({ byPath, byUrl, byRedirect }) {
  const make = (pairs) => new Map(pairs.map(([k, pl]) => [k, { permalink: pl }]));
  return { byPath: make(byPath), byUrl: make(byUrl), byRedirect: make(byRedirect) };
}
