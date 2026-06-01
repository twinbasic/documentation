// Worker harness for the tbdocs build pipeline.  Phase 6: persistent pull
// loop over the scheduling SAB.  Workers claim tasks via Atomics, execute
// the named handler, post the output, and update successor dep counts ---
// no main-thread round-trip for worker-to-worker transitions.
// See PLAN-sab-pull-scheduler.md §Worker pull loop.

import { parentPort, workerData } from "node:worker_threads";
import { compileLightScss, compileDarkScss } from "./scss.mjs";
import { regenerateMermaid } from "./mermaid.mjs";
import { captureBuildInfo }  from "./build-info.mjs";

import { createMarkdownIt, renderPhase }      from "./render.mjs";
import { templatePhase }                      from "./template.mjs";
import { unpackShared }                       from "./sab-broadcast.mjs";
import { deriveOfflinePage, deriveOfflinePageCached,
         sliceNavBlock, normalizeBaseurl,
         posixDirname }                       from "./offline-rewrite.mjs";

import {
  createViews, scanAndClaim, onTaskDone,
  READY, F_ON_DEMAND, F_RUN_ON_MAIN,
  MAX_LANES,
} from "./sab-scheduler.mjs";

if (workerData?.spawnTime) parentPort.postMessage({ coldBoot: { start: workerData.spawnTime, end: Date.now() } });

const myLane = workerData?.lane ?? 0;

// ── Mutable state set by init / renderData messages ─────────────────────────

let views    = null;   // Int32Array views into the scheduling SAB
let taskMeta = null;   // per-index { handler, perWorkerDeps, name }
let ctx      = null;   // { srcRoot, destRoot, opts, workerCount }
let idMapping = null;  // { nameToIdx, idxToName, DYNAMIC_BASE, … }

let _chunkDataSAB = null;   // SharedArrayBuffer with packed render chunks
let _sharedSAB    = null;   // SharedArrayBuffer with packed shared payload

// ── Handler table ───────────────────────────────────────────────────────────

const handlers = {
  async warmInit() {
    const { initHighlighter } = await import("./highlight.mjs");
    await initHighlighter();
    return {};
  },

  async scssLight() {
    const workerStart = Date.now();
    const scssLightResult = await compileLightScss(ctx.srcRoot);
    return { workerStart, workerEnd: Date.now(), scssLightResult };
  },

  async scssDark() {
    const workerStart = Date.now();
    const scssDarkResult = await compileDarkScss(ctx.srcRoot);
    return { workerStart, workerEnd: Date.now(), scssDarkResult };
  },

  async mermaid() {
    const workerStart = Date.now();
    const mermaidStats = await regenerateMermaid(ctx.srcRoot);
    return { workerStart, workerEnd: Date.now(), mermaidStats };
  },

  async buildInfo() {
    const workerStart = Date.now();
    const buildInfo = await captureBuildInfo();
    return { workerStart, workerEnd: Date.now(), buildInfo };
  },

  async render(taskIdx) {
    const workerStart = Date.now();

    // The renderData broadcast may not yet have been processed (it was
    // posted before the SAB set these tasks READY, but message delivery
    // is async).  Yield until the data arrives.
    while (!_chunkDataSAB || !_sharedSAB) {
      await new Promise(resolve => setImmediate(resolve));
    }

    const chunkIndex = taskIdx - idMapping.DYNAMIC_BASE;
    const offset = Atomics.load(views.chunkOffset, chunkIndex);
    const length = Atomics.load(views.chunkLength, chunkIndex);
    const chunk = JSON.parse(
      new TextDecoder().decode(new Uint8Array(_chunkDataSAB, offset, length)),
    );

    const env = await getOrInitRenderEnv(_sharedSAB);

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

// ── Cached per-worker render environment ────────────────────────────────────

let _renderSAB = null;
let _renderEnv = null;

async function getOrInitRenderEnv(sharedSAB) {
  if (_renderSAB === sharedSAB) return _renderEnv;

  const { siteData, initData, linkTablesData, staticFilesArr,
          baseurl, buildInfo, sitePathsArr,
          skipOffline } = unpackShared(sharedSAB);

  const { initHighlighter } = await import("./highlight.mjs");
  const highlighter = await initHighlighter();
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

// ── Message handler (init + renderData only) ────────────────────────────────

parentPort.on("message", (msg) => {
  if (msg.init) {
    views     = createViews(msg.sab);
    taskMeta  = msg.taskMeta;
    ctx       = msg.ctx;
    idMapping = msg.idMapping;
    _chunkDataSAB = null;
    _sharedSAB    = null;
    _renderSAB    = null;
    _renderEnv    = null;
    pullLoop();
    return;
  }
  if (msg.renderData) {
    _chunkDataSAB = msg.chunkDataSAB;
    _sharedSAB    = msg.sharedSAB;
    return;
  }
});

// ── Pull loop ───────────────────────────────────────────────────────────────

async function pullLoop() {
  while (true) {
    if (Atomics.load(views.buildDone, 0) !== 0) return;

    let taskIdx = scanAndClaim(views, myLane);

    if (taskIdx === -1) {
      const gen = Atomics.load(views.notify, 0);
      // Double-check after reading gen (race: a task may have become
      // READY between the failed scan and this load).
      taskIdx = scanAndClaim(views, myLane);
      if (taskIdx === -1) {
        Atomics.wait(views.notify, 0, gen, 50);
        continue;
      }
    }

    // ── Per-worker deps (unique_per_worker) ──
    const meta = taskMeta[taskIdx];
    let unsatisfied = null;
    if (meta?.perWorkerDeps) {
      for (const depIdx of meta.perWorkerDeps) {
        if (Atomics.load(views.perWorkerDone, depIdx * MAX_LANES + myLane) === 0) {
          unsatisfied = depIdx;
          break;
        }
      }
    }

    if (unsatisfied !== null) {
      const depFlags = Atomics.load(views.flags, unsatisfied);

      if ((depFlags & F_ON_DEMAND) && !(depFlags & F_RUN_ON_MAIN)) {
        // On-demand worker dep (warmInit).  Release the claimed task so
        // other workers can pick it up, then execute the dep inline.
        Atomics.store(views.status, taskIdx, READY);
        Atomics.add(views.notify, 0, 1);
        Atomics.notify(views.notify, 0, 1);

        const depMeta   = taskMeta[unsatisfied];
        const depStart  = Date.now();
        try {
          await handlers[depMeta.handler]();
        } catch (err) {
          parentPort.postMessage({ taskFailed: unsatisfied, message: err.message, stack: err.stack });
          return;
        }
        Atomics.store(views.perWorkerDone, unsatisfied * MAX_LANES + myLane, 1);

        parentPort.postMessage({
          warmInit: true,
          timing:  { start: depStart, end: Date.now() },
          lane:    myLane,
        });
        continue;
      }

      // Other unsatisfied dep types: release and re-scan.
      Atomics.store(views.status, taskIdx, READY);
      Atomics.add(views.notify, 0, 1);
      Atomics.notify(views.notify, 0, 1);
      continue;
    }

    // ── Execute task ──
    const handler = handlers[meta.handler];
    if (!handler) {
      parentPort.postMessage({ taskFailed: taskIdx, message: `unknown handler: ${meta.handler}`, stack: "" });
      return;
    }

    const start = Date.now();
    let result;
    try {
      result = await handler(taskIdx);
    } catch (err) {
      parentPort.postMessage({ taskFailed: taskIdx, message: err.message, stack: err.stack });
      Atomics.store(views.status, taskIdx, 4); // FAILED
      return;
    }

    // Post output BEFORE the SAB update (ordering constraint: the merge
    // message must arrive on the main thread before any downstream
    // main-thread task could be claimed).
    parentPort.postMessage({
      done:   taskIdx,
      output: result,
      timing: { start, end: Date.now() },
      lane:   myLane,
    });

    const { readyCount, wakeMain } = onTaskDone(views, taskIdx, myLane);
    if (readyCount > 0) {
      Atomics.add(views.notify, 0, 1);
      Atomics.notify(views.notify, 0, readyCount);
    }
    if (wakeMain) {
      parentPort.postMessage({ mainTaskReady: true });
    }
  }
}

function reconstructLinkTables({ byPath, byUrl, byRedirect }) {
  const make = (pairs) => new Map(pairs.map(([k, pl]) => [k, { permalink: pl }]));
  return { byPath: make(byPath), byUrl: make(byUrl), byRedirect: make(byRedirect) };
}
