// Task-graph scheduler for the tbdocs build pipeline.  Phase 6: main-thread
// tasks still use the push-based pending/ready/flush mechanism; worker tasks
// are pulled from the scheduling SAB.  A bridge in _onDone() updates the SAB
// after each main-thread task so downstream worker tasks become READY
// immediately.  See PLAN-sab-pull-scheduler.md §Phase 6.

import pc from "picocolors";
import {
  onTaskDone as sabOnTaskDone,
  registerDynamicRender, packChunkData, activateRenderTasks,
} from "./sab-scheduler.mjs";

export class SharedState {
  pages       = [];
  staticFiles = [];
  site        = {};
  pageByDest  = new Map();
}

export class Scheduler {
  constructor({ pool, tasks, views, idMapping }) {
    this.pool       = pool;
    this.tasks      = new Map(Object.entries(tasks));
    this.pending    = new Map();   // only main-thread tasks
    this.ready      = [];
    this.results    = new Map();
    this.timings    = new Map();
    this.state      = new SharedState();
    this.inFlight   = 0;           // main-thread tasks currently executing
    this._views     = views;
    this._idMapping = idMapping;

    // Count static worker tasks (SAB-tracked, not on_demand).
    this._workerRemaining = 0;
    for (const [, def] of this.tasks) {
      if (!def.runOnMain && !def.on_demand) this._workerRemaining++;
    }

    [this._doneP, this._doneResolve, this._doneReject] = deferred();

    // Only main-thread tasks participate in the push scheduler's
    // pending/ready/flush mechanism.
    for (const [id, def] of this.tasks) {
      if (def.runOnMain) this._initPending(id, def);
    }
  }

  _initPending(id, def) {
    this.pending.set(id, { expected: def.expected.length, received: new Map() });
  }

  // Register a new main-thread task (used by dispatch.submit for renderJoin).
  register(id, def) {
    this.tasks.set(id, def);
    if (def.runOnMain) this._initPending(id, def);
  }

  // Register a worker task definition (for submit() lookup) without adding
  // it to the push scheduler's pending map.  Increments _workerRemaining.
  registerWorkerTask(id, def) {
    this.tasks.set(id, def);
    this._workerRemaining++;
  }

  // Write render SAB entries, broadcast chunk data, and activate tasks.
  dispatchRender(chunks, sharedSAB) {
    const N = chunks.length;
    registerDynamicRender(this._views, this._idMapping, N);
    const chunkDataSAB = packChunkData(chunks, this._views);
    this.pool.broadcastRenderData(chunkDataSAB, sharedSAB);
    activateRenderTasks(this._views, this._idMapping, N);
  }

  // Seed a freshly-registered main-thread task directly.
  seed(id, inputs) {
    this.pending.delete(id);
    this.ready.push({ id, def: this.tasks.get(id), inputs });
    this._flush();
  }

  emit(targetId, data, sourceId) {
    const entry = this.pending.get(targetId);
    if (!entry) {
      // Worker task or already-dispatched — SAB handles readiness.
      if (this.tasks.has(targetId)) return;
      throw new Error(`unknown or already-dispatched task: ${targetId}`);
    }
    entry.received.set(sourceId, data);
    if (entry.received.size === entry.expected) {
      this.pending.delete(targetId);
      const def = this.tasks.get(targetId);
      this.ready.push({ id: targetId, def, inputs: Object.fromEntries(entry.received) });
      this._flush();
    }
  }

  async start(ctx) {
    this._ctx = ctx;
    for (const [id, def] of this.tasks) {
      if (def.expected.length === 0 && !def.on_demand) {
        this.pending.delete(id);
        // Only seed main-thread tasks; worker seeds are already READY in
        // the SAB (set by allocSchedulerSAB).
        if (def.runOnMain) this.ready.push({ id, def, inputs: {} });
      }
    }
    this._flush();
    return this._doneP;
  }

  _flush() {
    while (this.ready.length > 0) this._run(this.ready.shift());
  }

  _run(task) {
    const start = Date.now();
    this.inFlight++;
    // Phase 6: only main-thread tasks reach _run().  Worker tasks are
    // SAB-pulled and never enter the ready queue.
    const p = Promise.resolve(task.def.execute(task.inputs, this._ctx, this.state));
    p.then(
      (output) => this._onDone(task, output, start),
      (err)    => this._onError(task, err),
    );
  }

  _onDone(task, output, start) {
    const end = Date.now();
    const timing = { start, end };
    if (output?.workerStart != null) { timing.workerStart = output.workerStart; timing.workerEnd = output.workerEnd; }
    if (output?.lane != null) timing.lane = output.lane;
    if (task.def.consolidate)  timing.consolidate  = true;
    if (task.def.ganttSection) timing.ganttSection = task.def.ganttSection;
    this.timings.set(task.id, timing);
    this.results.set(task.id, output);
    this.inFlight--;
    task.def.submit(
      output,
      (tgt, data) => this.emit(tgt, data, task.id),
      this.state,
      this,
    );

    // Bridge: update the SAB so downstream worker tasks become READY
    // without waiting for the push scheduler's _flush().
    const taskIdx = this._idMapping.nameToIdx.get(task.id);
    if (taskIdx != null) {
      const { readyCount } = sabOnTaskDone(this._views, taskIdx, -1);
      if (readyCount > 0) {
        Atomics.add(this._views.notify, 0, 1);
        Atomics.notify(this._views.notify, 0, readyCount);
      }
    }

    this._checkDone();
  }

  // Called by the pool's message handler when a worker posts { done }.
  _onWorkerDone({ done: taskIdx, output, timing, lane }) {
    const name = this._idMapping.idxToName[taskIdx];
    const def  = this.tasks.get(name);
    if (!def) return;

    const t = { start: timing.start, end: timing.end };
    if (output?.workerStart != null) { t.workerStart = output.workerStart; t.workerEnd = output.workerEnd; }
    if (lane != null) t.lane = lane;
    if (def.consolidate)  t.consolidate  = true;
    if (def.ganttSection) t.ganttSection = def.ganttSection;
    this.timings.set(name, t);
    this.results.set(name, output);

    def.submit(
      output,
      (tgt, data) => this.emit(tgt, data, name),
      this.state,
      this,
    );

    this._workerRemaining--;
    this._checkDone();
  }

  _onWorkerError({ taskFailed: taskIdx, message, stack }) {
    const name = this._idMapping.idxToName[taskIdx] ?? `task#${taskIdx}`;
    const err  = Object.assign(new Error(message), { stack });

    // Signal workers to stop.
    Atomics.store(this._views.buildDone, 0, 2);
    Atomics.add(this._views.notify, 0, 1);
    Atomics.notify(this._views.notify, 0, Infinity);

    this._doneReject(new Error(`task ${name} failed`, { cause: err }));
  }

  _onWarmInitTiming({ timing, lane }) {
    this.timings.set(`warmInit:w${lane}`, {
      start: timing.start, end: timing.end,
      workerStart: timing.start, workerEnd: timing.end,
      lane,
      consolidate: true,
      ganttSection: "Boot",
    });
  }

  _checkDone() {
    if (this.inFlight === 0 && this._workerRemaining === 0
        && this.ready.length === 0 && this.pending.size === 0) {
      // Signal workers to exit.
      Atomics.store(this._views.buildDone, 0, 1);
      Atomics.add(this._views.notify, 0, 1);
      Atomics.notify(this._views.notify, 0, Infinity);

      this._doneResolve(this.results);
    }
  }

  _onError(task, err) {
    // Signal workers to stop.
    Atomics.store(this._views.buildDone, 0, 2);
    Atomics.add(this._views.notify, 0, 1);
    Atomics.notify(this._views.notify, 0, Infinity);

    this._doneReject(new Error(`task ${task.id} failed`, { cause: err }));
  }

  summary() {
    const sorted = [...this.timings.entries()]
      .sort((a, b) => a[1].start - b[1].start);

    const consolidated = new Map();
    const parts = [];
    for (const [id, timing] of sorted) {
      if (timing.consolidate && timing.lane != null) {
        const section = timing.ganttSection ?? "worker";
        if (!consolidated.has(section)) consolidated.set(section, new Map());
        const byLane = consolidated.get(section);
        const prev = byLane.get(timing.lane);
        if (!prev) byLane.set(timing.lane, { start: timing.start, end: timing.end });
        else { prev.start = Math.min(prev.start, timing.start); prev.end = Math.max(prev.end, timing.end); }
      } else {
        parts.push(`${id}=${timing.end - timing.start}ms`);
      }
    }

    let result = pc.dim(parts.join(" "));
    for (const [section, byLane] of consolidated) {
      const lanes = [...byLane.entries()].sort((a, b) => a[0] - b[0]);
      const wallMs = Math.max(...lanes.map(([, t]) => t.end))
                   - Math.min(...lanes.map(([, t]) => t.start));
      const inner = lanes.map(([i, t]) => `w${i}=${t.end - t.start}ms`).join(", ");
      result += `\n${pc.bold(pc.yellow(`${section.toLowerCase()}:`))} ${pc.white(`${wallMs}ms,`)} ${pc.dim(inner)}`;
    }
    return result;
  }
}

function deferred() {
  let res, rej;
  const p = new Promise((r1, r2) => { res = r1; rej = r2; });
  return [p, res, rej];
}
