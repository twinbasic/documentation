// Worker harness for the tbdocs build pipeline.  Phase 15: SAB-based task
// metadata (no JS-side taskMeta array), priority-aware claiming, per-chunk
// flush via FIFO _pendingFlush queue, generic payload SAB.
// See PLAN-sab-pull-scheduler.md §Phase 15.

import { promises as fsP } from "node:fs";
import path from "node:path";
import { parentPort, workerData } from "node:worker_threads";
import { compileLightScss, compileDarkScss } from "./scss.mjs";
import { regenerateDot }     from "./dot.mjs";
import { captureBuildInfo }  from "./build-info.mjs";

import { createMarkdownIt, renderPhase }      from "./render.mjs";
import { templatePhase }                      from "./template.mjs";
import { unpackShared }                       from "./sab-broadcast.mjs";
import { deriveSearchEntries }                from "./search.mjs";
import { computeChunkSeo }                    from "./seo.mjs";
import { deriveOfflinePage, deriveOfflinePageCached,
         sliceNavBlock, normalizeBaseurl,
         posixDirname }                       from "./offline-rewrite.mjs";

import {
  createViews, scanAndClaim, onTaskDone, readTaskMeta,
  HANDLERS,
  READY, CLAIMED, DONE, F_ON_DEMAND, F_RUN_ON_MAIN,
  F_RUN_WHEN_IDLE, F_UNIQUE_PER_WORKER,
  MAX_LANES,
} from "./sab-scheduler.mjs";

if (workerData?.spawnTime) parentPort.postMessage({ coldBoot: { start: workerData.spawnTime, end: Date.now() } });

const myLane = workerData?.lane ?? 0;

// ── Mutable state set by init / dynamicData messages ────────────────────────

let views     = null;   // Int32Array views into the scheduling SAB
let ctx       = null;   // { srcRoot, destRoot, opts, workerCount }
let idMapping = null;   // { nameToIdx, idxToName, DYNAMIC_BASE, … }

let _payloadSAB = null;   // SharedArrayBuffer with packed per-task payloads
let _sharedSAB  = null;   // SharedArrayBuffer with packed shared payload

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
            skipOffline, svgContentsMap } = unpackShared(_sharedSAB);

    const { initHighlighter } = await import("./highlight.mjs");
    const highlighter = await initHighlighter();
    const linkTables  = reconstructLinkTables(linkTablesData);
    const staticFiles = new Set(staticFilesArr);
    const svgContents = new Map(Object.entries(svgContentsMap ?? {}));
    const markdown    = createMarkdownIt({ highlighter, linkTables, baseurl, staticFiles, svgContents });
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
    const items = _pendingFlush.shift() ?? [];
    let written = 0, offlineWritten = 0, offlineMisses = 0;
    if (!ctx.opts.dryRun) {
      let next = 0;
      const limit = Math.min(64, items.length || 1);
      const workers = Array.from({ length: limit }, async () => {
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

  async dot() {
    const dotStats = await regenerateDot(ctx.srcRoot);
    return { dotStats };
  },

  async buildInfo() {
    const buildInfo = await captureBuildInfo();
    return { buildInfo };
  },

  async render(taskIdx) {
    const offset = Atomics.load(views.payloadOffset, taskIdx);
    const length = Atomics.load(views.payloadLength, taskIdx);
    const chunk = JSON.parse(
      new TextDecoder().decode(new Uint8Array(_payloadSAB, offset, length)),
    );

    const env = _renderEnv;

    await renderPhase(chunk, env.site);
    computeChunkSeo(chunk, env.site.seoSiteTitle, env.site.config, env.site.markdown);
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

    // Stash writable pages for the matching flush:i (FIFO; one batch per
    // render:i, drained by exactly one flush:i on the same worker).
    const batch = [];
    for (const p of chunk) {
      if (p.html !== undefined) {
        batch.push({
          destPath:      p.destPath,
          html:          p.html,
          offlineHtml:   p.offlineHtml,
          offlineMisses: p.offlineMisses,
        });
      }
    }
    _pendingFlush.push(batch);

    // Per-chunk search entries; consolidated on main during searchData.
    // Drop `sourcePage` (workers hold cloned page objects, not master
    // refs) and `i` (chunk-local indices are meaningless; main assigns
    // global indices during consolidation).
    const searchEntries = deriveSearchEntries(chunk, env.site)
      .map(e => ({ doc: e.doc, title: e.title, content: e.content,
                   url: e.url, relUrl: e.relUrl }));

    return {
      pages: chunk.map(p => ({
        destPath:        p.destPath,
        renderedContent: p.renderedContent,
        offlineMisses:   p.offlineMisses,
      })),
      searchEntries,
    };
  },
};

// Reverse handler table: HANDLERS maps name → integer, handlerById maps
// integer → function.  Built once at module load.
const handlerById = [];
for (const [name, id] of Object.entries(HANDLERS)) handlerById[id] = handlers[name];

let _renderEnv    = null;
let _pendingFlush = [];

// ── Message handler (init + dynamicData only) ───────────────────────────────

parentPort.on("message", (msg) => {
  if (msg.init) {
    views     = createViews(msg.sab);
    ctx       = msg.ctx;
    idMapping = msg.idMapping;
    _payloadSAB   = null;
    _sharedSAB    = null;
    _renderEnv    = null;
    _pendingFlush = [];
    pullLoop();
    return;
  }
  if (msg.dynamicData) {
    _payloadSAB = msg.payloadSAB;
    _sharedSAB  = msg.sharedSAB;
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
    const meta = readTaskMeta(views, i);
    const pri  = meta.idlePriority;
    if (pri >= bestPri) continue;
    if (Atomics.load(views.flags, i) & F_UNIQUE_PER_WORKER) {
      if (Atomics.load(views.perWorkerDone, i * MAX_LANES + lane) !== 0)
        continue;
      let skip = false;
      for (const predIdx of meta.expectedDeps) {
        if (Atomics.load(views.status, predIdx) !== DONE) { skip = true; break; }
      }
      if (skip) continue;
      for (const depIdx of meta.perWorkerDeps) {
        if (Atomics.load(views.perWorkerDone, depIdx * MAX_LANES + lane) === 0) { skip = true; break; }
      }
      if (skip) continue;
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
      // Speculative: run idle-eligible tasks before sleeping.
      const idleTask = findIdleTask(views, myLane);
      if (idleTask !== -1) {
        const idleMeta = readTaskMeta(views, idleTask);
        const t0 = Date.now();
        let idleResult;
        try {
          idleResult = await handlerById[idleMeta.handlerIdx]();
        } catch (err) {
          parentPort.postMessage({ taskFailed: idleTask, message: err.message, stack: err.stack });
          return;
        }
        const t1 = Date.now();
        Atomics.store(views.perWorkerDone, idleTask * MAX_LANES + myLane, 1);
        parentPort.postMessage({
          perWorkerTiming: true,
          taskIdx: idleTask,
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
    const meta = readTaskMeta(views, taskIdx);
    let unsatisfied = null;
    for (const depIdx of meta.perWorkerDeps) {
      if (Atomics.load(views.perWorkerDone, depIdx * MAX_LANES + myLane) === 0) {
        unsatisfied = depIdx;
        break;
      }
    }

    if (unsatisfied !== null) {
      const depFlags = Atomics.load(views.flags, unsatisfied);

      if ((depFlags & F_ON_DEMAND) && !(depFlags & F_RUN_ON_MAIN)) {
        const depMeta = readTaskMeta(views, unsatisfied);

        // Check the dep's own perWorkerDeps (e.g. renderEnvInit → warmInit).
        let nestedUnsatisfied = null;
        for (const nestedIdx of depMeta.perWorkerDeps) {
          if (Atomics.load(views.perWorkerDone, nestedIdx * MAX_LANES + myLane) === 0) {
            nestedUnsatisfied = nestedIdx;
            break;
          }
        }

        if (nestedUnsatisfied !== null) {
          const nestedFlags = Atomics.load(views.flags, nestedUnsatisfied);
          if ((nestedFlags & F_ON_DEMAND) && !(nestedFlags & F_RUN_ON_MAIN)) {
            Atomics.store(views.status, taskIdx, READY);
            Atomics.add(views.notify, 0, 1);
            Atomics.notify(views.notify, 0, 1);

            const nestedMeta = readTaskMeta(views, nestedUnsatisfied);
            const t0 = Date.now();
            let nestedResult;
            try {
              nestedResult = await handlerById[nestedMeta.handlerIdx]();
            } catch (err) {
              parentPort.postMessage({ taskFailed: nestedUnsatisfied, message: err.message, stack: err.stack });
              return;
            }
            const t1 = Date.now();
            Atomics.store(views.perWorkerDone, nestedUnsatisfied * MAX_LANES + myLane, 1);
            parentPort.postMessage({
              perWorkerTiming: true,
              taskIdx: nestedUnsatisfied,
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
        for (const predIdx of depMeta.expectedDeps) {
          if (Atomics.load(views.status, predIdx) !== DONE) {
            precondFailed = true;
            break;
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
          depResult = await handlerById[depMeta.handlerIdx]();
        } catch (err) {
          parentPort.postMessage({ taskFailed: unsatisfied, message: err.message, stack: err.stack });
          return;
        }
        const t1 = Date.now();
        Atomics.store(views.perWorkerDone, unsatisfied * MAX_LANES + myLane, 1);

        parentPort.postMessage({
          perWorkerTiming: true,
          taskIdx: unsatisfied,
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
    const handler = handlerById[meta.handlerIdx];
    if (!handler) {
      parentPort.postMessage({ taskFailed: taskIdx, message: `unknown handlerIdx: ${meta.handlerIdx}`, stack: "" });
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
