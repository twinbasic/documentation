// Worker harness for the tbdocs build pipeline.  Phase 6+7: persistent pull
// loop over the scheduling SAB.  Workers claim tasks via Atomics, execute
// the named handler, post the output, and update successor dep counts ---
// no main-thread round-trip for worker-to-worker transitions.
// See PLAN-sab-pull-scheduler.md §Worker pull loop.

import { promises as fsP } from "node:fs";
import path from "node:path";
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
  READY, DONE, F_ON_DEMAND, F_RUN_ON_MAIN,
  F_RUN_WHEN_IDLE, F_UNIQUE_PER_WORKER,
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

  async renderEnvInit() {
    while (!_sharedSAB) {
      await new Promise(resolve => setImmediate(resolve));
    }

    const { siteData, initData, linkTablesData, staticFilesArr,
            baseurl, buildInfo, sitePathsArr,
            skipOffline } = unpackShared(_sharedSAB);

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

    _renderEnv = { site, initData, offlineBase };
    return {};
  },

  async flush() {
    let written = 0, offlineWritten = 0, offlineMisses = 0;
    if (!ctx.opts.dryRun) {
      const items = _pageStash;
      let next = 0;
      const limit = 64;
      const workers = Array.from({ length: Math.min(limit, items.length || 1) }, async () => {
        while (next < items.length) {
          const p = items[next++];
          await fsP.writeFile(path.join(ctx.destRoot, p.destPath), p.html, "utf8");
          written++;
          if (p.offlineHtml !== undefined) {
            await fsP.writeFile(path.join(ctx.destRoot + "-offline", p.destPath), p.offlineHtml, "utf8");
            offlineWritten++;
          }
          offlineMisses += p.offlineMisses ?? 0;
        }
      });
      await Promise.all(workers);
    }
    _pageStash = [];
    return { written, offlineWritten, offlineMisses };
  },

  async scssLight() {
    const scssLightResult = await compileLightScss(ctx.srcRoot);
    return { scssLightResult };
  },

  async scssDark() {
    const scssDarkResult = await compileDarkScss(ctx.srcRoot);
    return { scssDarkResult };
  },

  async mermaid() {
    const mermaidStats = await regenerateMermaid(ctx.srcRoot);
    return { mermaidStats };
  },

  async buildInfo() {
    const buildInfo = await captureBuildInfo();
    return { buildInfo };
  },

  async render(taskIdx) {

    const chunkIndex = taskIdx - idMapping.DYNAMIC_BASE;
    const offset = Atomics.load(views.chunkOffset, chunkIndex);
    const length = Atomics.load(views.chunkLength, chunkIndex);
    const chunk = JSON.parse(
      new TextDecoder().decode(new Uint8Array(_chunkDataSAB, offset, length)),
    );

    const env = _renderEnv;

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

    // Stash writable pages for flush (avoids structured-clone of
    // html + offlineHtml across the worker boundary).
    for (const p of chunk) {
      if (p.html !== undefined) {
        _pageStash.push({
          destPath:      p.destPath,
          html:          p.html,
          offlineHtml:   p.offlineHtml,
          offlineMisses: p.offlineMisses,
        });
      }
    }

    return {
      pages: chunk.map(p => ({
        destPath:        p.destPath,
        renderedContent: p.renderedContent,
        offlineMisses:   p.offlineMisses,
      })),
    };
  },
};

let _renderEnv  = null;
let _pageStash  = [];

// ── Message handler (init + renderData only) ────────────────────────────────

parentPort.on("message", (msg) => {
  if (msg.init) {
    views     = createViews(msg.sab);
    taskMeta  = msg.taskMeta;
    ctx       = msg.ctx;
    idMapping = msg.idMapping;
    _chunkDataSAB = null;
    _sharedSAB    = null;
    _renderEnv    = null;
    _pageStash    = [];
    pullLoop();
    return;
  }
  if (msg.renderData) {
    _chunkDataSAB = msg.chunkDataSAB;
    _sharedSAB    = msg.sharedSAB;
    return;
  }
});

// ── Idle-task scan (speculative warmup) ─────────────────────────────────────

function findIdleTask(views, lane) {
  const count = Atomics.load(views.taskCount, 0);
  let bestIdx = -1;
  let bestPri = Infinity;
  for (let i = 0; i < count; i++) {
    if (!(Atomics.load(views.flags, i) & F_RUN_WHEN_IDLE)) continue;
    const meta = taskMeta[i];
    const pri  = meta?.idlePriority ?? 0;
    if (pri >= bestPri) continue;
    if (Atomics.load(views.flags, i) & F_UNIQUE_PER_WORKER) {
      if (Atomics.load(views.perWorkerDone, i * MAX_LANES + lane) !== 0)
        continue;
      if (meta?.expectedIdxs) {
        let skip = false;
        for (const predIdx of meta.expectedIdxs) {
          if (Atomics.load(views.status, predIdx) !== DONE) { skip = true; break; }
        }
        if (skip) continue;
      }
      if (meta?.perWorkerDeps) {
        let skip = false;
        for (const depIdx of meta.perWorkerDeps) {
          if (Atomics.load(views.perWorkerDone, depIdx * MAX_LANES + lane) === 0) { skip = true; break; }
        }
        if (skip) continue;
      }
      bestIdx = i;
      bestPri = pri;
    } else {
      if (Atomics.load(views.status, i) !== READY) continue;
      bestIdx = i;
      bestPri = pri;
    }
  }
  // For non-unique_per_worker tasks, CAS-claim at the end.
  if (bestIdx !== -1 && !(Atomics.load(views.flags, bestIdx) & F_UNIQUE_PER_WORKER)) {
    if (Atomics.compareExchange(views.status, bestIdx, READY, CLAIMED) !== READY)
      return -1;
  }
  return bestIdx;
}

// ── Pull loop ───────────────────────────────────────────────────────────────

async function pullLoop() {
  while (true) {
    if (Atomics.load(views.buildDone, 0) !== 0) return;

    let taskIdx = scanAndClaim(views, myLane);

    if (taskIdx === -1) {
      // Speculative: run idle-eligible tasks before sleeping
      const idleTask = findIdleTask(views, myLane);
      if (idleTask !== -1) {
        const idleMeta = taskMeta[idleTask];
        const t0 = Date.now();
        let idleResult;
        try {
          idleResult = await handlers[idleMeta.handler]();
        } catch (err) {
          parentPort.postMessage({ taskFailed: idleTask, message: err.message, stack: err.stack });
          return;
        }
        const t1 = Date.now();
        Atomics.store(views.perWorkerDone, idleTask * MAX_LANES + myLane, 1);
        parentPort.postMessage({
          perWorkerTiming: true,
          taskName: idleMeta.name,
          timing:  { start: t0, end: t1 },
          lane:    myLane,
          output:  idleResult,
        });
        continue;
      }

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
        const depMeta = taskMeta[unsatisfied];

        // Check the dep's own perWorkerDeps (e.g. renderEnvInit → warmInit).
        let nestedUnsatisfied = null;
        if (depMeta?.perWorkerDeps) {
          for (const nestedIdx of depMeta.perWorkerDeps) {
            if (Atomics.load(views.perWorkerDone, nestedIdx * MAX_LANES + myLane) === 0) {
              nestedUnsatisfied = nestedIdx;
              break;
            }
          }
        }

        if (nestedUnsatisfied !== null) {
          const nestedFlags = Atomics.load(views.flags, nestedUnsatisfied);
          if ((nestedFlags & F_ON_DEMAND) && !(nestedFlags & F_RUN_ON_MAIN)) {
            Atomics.store(views.status, taskIdx, READY);
            Atomics.add(views.notify, 0, 1);
            Atomics.notify(views.notify, 0, 1);

            const nestedMeta = taskMeta[nestedUnsatisfied];
            const t0 = Date.now();
            let nestedResult;
            try {
              nestedResult = await handlers[nestedMeta.handler]();
            } catch (err) {
              parentPort.postMessage({ taskFailed: nestedUnsatisfied, message: err.message, stack: err.stack });
              return;
            }
            const t1 = Date.now();
            Atomics.store(views.perWorkerDone, nestedUnsatisfied * MAX_LANES + myLane, 1);
            parentPort.postMessage({
              perWorkerTiming: true,
              taskName: nestedMeta.name,
              timing:  { start: t0, end: t1 },
              lane:    myLane,
              output:  nestedResult,
            });
            continue;
          }
          Atomics.store(views.status, taskIdx, READY);
          Atomics.add(views.notify, 0, 1);
          Atomics.notify(views.notify, 0, 1);
          continue;
        }

        // Check preconditions (expected predecessors on the dep).
        let precondFailed = false;
        if (depMeta?.expectedIdxs) {
          for (const predIdx of depMeta.expectedIdxs) {
            if (Atomics.load(views.status, predIdx) !== DONE) {
              precondFailed = true;
              break;
            }
          }
        }
        if (precondFailed) {
          Atomics.store(views.status, taskIdx, READY);
          Atomics.add(views.notify, 0, 1);
          Atomics.notify(views.notify, 0, 1);
          continue;
        }

        // All dep's deps satisfied. Release original task, execute the dep.
        Atomics.store(views.status, taskIdx, READY);
        Atomics.add(views.notify, 0, 1);
        Atomics.notify(views.notify, 0, 1);

        const t0 = Date.now();
        let depResult;
        try {
          depResult = await handlers[depMeta.handler]();
        } catch (err) {
          parentPort.postMessage({ taskFailed: unsatisfied, message: err.message, stack: err.stack });
          return;
        }
        const t1 = Date.now();
        Atomics.store(views.perWorkerDone, unsatisfied * MAX_LANES + myLane, 1);

        parentPort.postMessage({
          perWorkerTiming: true,
          taskName: depMeta.name,
          timing:  { start: t0, end: t1 },
          lane:    myLane,
          output:  depResult,
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

    const t0 = Date.now();
    let result;
    try {
      result = await handler(taskIdx);
    } catch (err) {
      parentPort.postMessage({ taskFailed: taskIdx, message: err.message, stack: err.stack });
      Atomics.store(views.status, taskIdx, 4); // FAILED
      return;
    }
    const t1 = Date.now();

    // Post output BEFORE the SAB update (ordering constraint: the merge
    // message must arrive on the main thread before any downstream
    // main-thread task could be claimed).
    parentPort.postMessage({
      done:   taskIdx,
      output: result,
      timing: { start: t0, end: t1 },
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
