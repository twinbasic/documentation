// Worker pool over node:worker_threads.  Lifecycle manager: spawns workers,
// sends them the scheduling SAB, forwards output/error/mainTaskReady
// messages to the scheduler, and terminates workers on destroy.  Workers pull
// tasks from the SAB; the pool has no dispatch or queue logic.

import { Worker } from "node:worker_threads";

export class WorkerPool {
  constructor(size, workerUrl) {
    this._workerUrl = workerUrl;
    this.bootTimings = [];

    // Callbacks wired by the caller after construction.
    this.onWorkerDone      = null;      // ({ done, output, timing, lane }) => void
    this.onWorkerError     = null;      // ({ taskFailed, message, stack }) => void
    this.onPerWorkerTiming = null;      // ({ perWorkerTiming, taskIdx, timing, lane }) => void
    this.onMainTaskReady   = null;      // () => void

    this._workers = Array.from({ length: size }, (_, i) => this._spawn(i));
  }

  _spawn(lane) {
    const spawnTime = Date.now();
    const w = new Worker(this._workerUrl, { workerData: { lane, spawnTime } });
    w.on("message", (msg) => {
      if (msg.coldBoot) { this.bootTimings.push({ lane, type: "cold", ...msg.coldBoot }); return; }
      if (msg.perWorkerTiming) { this.onPerWorkerTiming?.(msg); return; }
      if (msg.done != null)   { this.onWorkerDone?.(msg); return; }
      if (msg.taskFailed != null) { this.onWorkerError?.(msg); return; }
      if (msg.mainTaskReady || msg.triggerMainTask != null) { this.onMainTaskReady?.(); return; }
    });
    w.on("error", (err) => {
      this.onWorkerError?.({ taskFailed: -1, message: err.message, stack: err.stack });
    });
    return w;
  }

  sendInit(sab, ctx, idMapping) {
    for (const w of this._workers) {
      w.postMessage({ init: true, sab, ctx, idMapping });
    }
  }

  broadcastDynamicData(payloadSAB, sharedSAB) {
    for (const w of this._workers) {
      w.postMessage({ dynamicData: true, payloadSAB, sharedSAB });
    }
  }

  destroy() {
    return Promise.all(this._workers.map(w => w.terminate()));
  }
}
