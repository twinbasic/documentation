// Worker pool over node:worker_threads. Spawns `size` workers eagerly at
// construction, routes named tasks to whichever worker is idle, queues the
// rest. No dynamic scaling, no recycling, no abort signals.

import { Worker } from "node:worker_threads";

export class WorkerPool {
  constructor(size, workerUrl) {
    this._workerUrl = workerUrl;
    this._idle    = [];               // Worker[]
    this._busy    = new Map();        // Worker → { resolve, reject }
    this._queue   = [];               // pending { message, transferList, resolve, reject }
    this._workers = Array.from({ length: size }, (_, i) => this._spawn(i));
  }

  _spawn(lane) {
    const w = new Worker(this._workerUrl);
    w.on("message", (msg) => {
      const entry = this._busy.get(w);
      if (!entry) return;
      this._busy.delete(w);
      this._idle.push(w);
      if (msg.error) entry.reject(Object.assign(new Error(msg.error), { stack: msg.stack }));
      else            entry.resolve(Object.assign(msg.result, { lane }));
      this._drain();
    });
    w.on("error", (err) => {
      const entry = this._busy.get(w);
      if (entry) { this._busy.delete(w); entry.reject(err); }
    });
    this._idle.push(w);
    return w;
  }

  run(payload, { name, transferList } = {}) {
    return new Promise((resolve, reject) => {
      this._queue.push({ message: { name, ...payload }, transferList, resolve, reject });
      this._drain();
    });
  }

  _drain() {
    while (this._queue.length && this._idle.length) {
      const w = this._idle.shift();
      const { message, transferList, resolve, reject } = this._queue.shift();
      this._busy.set(w, { resolve, reject });
      w.postMessage(message, transferList);
    }
  }

  // Send a no-response warmup signal to all currently idle workers.
  // Workers handle { warmup: true } without posting back, so the
  // pool's busy-tracking is unaffected.
  warmup() {
    for (const w of this._idle) w.postMessage({ warmup: true });
  }

  destroy() {
    return Promise.all(this._workers.map(w => w.terminate()));
  }
}
