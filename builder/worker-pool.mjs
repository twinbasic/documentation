// Worker pool over node:worker_threads. Spawns `size` workers eagerly at
// construction, routes named tasks to whichever worker is idle, queues the
// rest. No dynamic scaling, no recycling, no abort signals.
//
// Idle workers are split into two tiers: _idleWarm (Shiki-initialized) and
// _idleCold. _drain() pulls from warm first so render chunks land on
// workers that can start immediately; cold workers only get work when no
// warm ones are available.

import { Worker } from "node:worker_threads";

export class WorkerPool {
  constructor(size, workerUrl) {
    this._workerUrl = workerUrl;
    this._idleWarm  = [];               // Worker[] — Shiki ready
    this._idleCold  = [];               // Worker[] — not yet initialized
    this._warm      = new Set();        // all workers that have signalled warmedUp
    this._busy      = new Map();        // Worker → { resolve, reject }
    this._queue     = [];               // pending { message, transferList, resolve, reject }
    this.bootTimings = [];              // { lane, type, start, end }[]
    this._workers   = Array.from({ length: size }, (_, i) => this._spawn(i));
  }

  _spawn(lane) {
    const spawnTime = Date.now();
    const w = new Worker(this._workerUrl, { workerData: { lane, spawnTime } });
    w.on("message", (msg) => {
      if (msg.coldBoot) { this.bootTimings.push({ lane, type: "cold", ...msg.coldBoot }); return; }
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
