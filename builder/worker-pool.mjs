// Worker pool over node:worker_threads.  Phase 6: workers pull tasks from a
// scheduling SAB; the pool is a lifecycle manager that spawns workers, sends
// them the SAB + metadata, forwards output/error messages to the scheduler,
// and terminates workers on destroy.
//
// Legacy push-model fields (_idleWarm, _idleCold, _warm, _busy, _queue,
// run, warmup, _drain, _pushIdle, _onWarmedUp) are retained as dead code;
// Phase 8 removes them.

import { Worker } from "node:worker_threads";

export class WorkerPool {
  constructor(size, workerUrl) {
    this._workerUrl = workerUrl;
    this._idleWarm  = [];               // (Phase 8 removes)
    this._idleCold  = [];               // (Phase 8 removes)
    this._warm      = new Set();        // (Phase 8 removes)
    this._busy      = new Map();        // (Phase 8 removes)
    this._queue     = [];               // (Phase 8 removes)
    this.bootTimings = [];

    // Callbacks wired by the caller after construction.
    this.onWorkerDone      = null;      // ({ done, output, timing, lane }) => void
    this.onWorkerError     = null;      // ({ taskFailed, message, stack }) => void
    this.onWarmInitTiming  = null;      // ({ warmInit, timing, lane }) => void

    this._workers = Array.from({ length: size }, (_, i) => this._spawn(i));
  }

  _spawn(lane) {
    const spawnTime = Date.now();
    const w = new Worker(this._workerUrl, { workerData: { lane, spawnTime } });
    w.on("message", (msg) => {
      // ── Phase 6 SAB-based message routing ──
      if (msg.coldBoot) { this.bootTimings.push({ lane, type: "cold", ...msg.coldBoot }); return; }
      if (msg.warmInit)       { this.onWarmInitTiming?.(msg); return; }
      if (msg.done != null)   { this.onWorkerDone?.(msg); return; }
      if (msg.taskFailed != null) { this.onWorkerError?.(msg); return; }
      if (msg.mainTaskReady)  { /* Phase 7 wires this up */ return; }

      // ── Legacy push-model routing (Phase 8 removes) ──
      if (msg.warmedUp) {
        if (msg.warmBoot) this.bootTimings.push({ lane, type: "warm", ...msg.warmBoot });
        this._onWarmedUp(w);
        return;
      }
      const entry = this._busy.get(w);
      if (!entry) return;
      this._busy.delete(w);
      this._pushIdle(w);
      if (msg.error) entry.reject(Object.assign(new Error(msg.error), { stack: msg.stack }));
      else            entry.resolve(Object.assign(msg.result, { lane }));
      this._drain();
    });
    w.on("error", (err) => {
      const entry = this._busy.get(w);
      if (entry) { this._busy.delete(w); entry.reject(err); }
    });
    this._idleCold.push(w);
    return w;
  }

  // ── Phase 6: SAB init + broadcast ──────────────────────────────────────────

  sendInit(sab, taskMeta, ctx, idMapping) {
    for (const w of this._workers) {
      w.postMessage({ init: true, sab, taskMeta, ctx, idMapping });
    }
  }

  broadcastRenderData(chunkDataSAB, sharedSAB) {
    for (const w of this._workers) {
      w.postMessage({ renderData: true, chunkDataSAB, sharedSAB });
    }
  }

  // ── Legacy push-model methods (Phase 8 removes) ───────────────────────────

  _pushIdle(w) {
    if (this._warm.has(w)) this._idleWarm.push(w);
    else                   this._idleCold.push(w);
  }

  _onWarmedUp(w) {
    this._warm.add(w);
    const idx = this._idleCold.indexOf(w);
    if (idx !== -1) {
      this._idleCold.splice(idx, 1);
      this._idleWarm.push(w);
      this._drain();
    }
  }

  run(payload, { name, transferList } = {}) {
    return new Promise((resolve, reject) => {
      this._queue.push({ message: { name, ...payload }, transferList, resolve, reject });
      this._drain();
    });
  }

  _drain() {
    while (this._queue.length) {
      const w = this._idleWarm.length ? this._idleWarm.shift()
              : this._idleCold.length ? this._idleCold.shift()
              : null;
      if (!w) break;
      const { message, transferList, resolve, reject } = this._queue.shift();
      this._busy.set(w, { resolve, reject });
      w.postMessage(message, transferList);
    }
  }

  warmup() {
    for (const w of this._idleCold) w.postMessage({ warmup: true });
  }

  destroy() {
    return Promise.all(this._workers.map(w => w.terminate()));
  }
}
