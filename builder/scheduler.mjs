// Task-graph scheduler for the tbdocs build pipeline.  Phase 7: main-thread
// tasks scan the scheduling SAB for READY work and claim via CAS; worker
// tasks are pulled from the SAB by workers (Phase 6).  The push-based
// pending/ready/emit/flush mechanism is removed entirely.
// See PLAN-sab-pull-scheduler.md §Phase 7.

import pc from "picocolors";
import {
  onTaskDone as sabOnTaskDone,
  registerDynamicRender, packChunkData, activateRenderTasks,
  READY, CLAIMED, DONE, F_RUN_ON_MAIN,
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
    this.results    = new Map();   // task name → output
    this.timings    = new Map();
    this.state      = new SharedState();
    this._views     = views;
    this._idMapping = idMapping;

    // Count non-on_demand static tasks for completion detection.
    // Dynamic tasks (render:i, renderJoin) are added via addDynamicTasks().
    this._remaining = 0;
    for (const [, def] of this.tasks) {
      if (!def.on_demand) this._remaining++;
    }

    this._scanning          = false;
    this._mainScanScheduled = false;
    this._finished          = false;

    [this._doneP, this._doneResolve, this._doneReject] = deferred();
  }

  // Write render SAB entries, broadcast chunk data, and activate tasks.
  dispatchRender(chunks, sharedSAB) {
    const N = chunks.length;
    registerDynamicRender(this._views, this._idMapping, N);
    const chunkDataSAB = packChunkData(chunks, this._views);
    this.pool.broadcastRenderData(chunkDataSAB, sharedSAB);
    activateRenderTasks(this._views, this._idMapping, N);
  }

  // Increment remaining-task count for dynamically-registered tasks.
  addDynamicTasks(count) {
    this._remaining += count;
  }

  async start(ctx) {
    this._ctx = ctx;
    this._scheduleMainScan();
    return this._doneP;
  }

  // ── Main-thread SAB scan (replaces _flush / _run) ─────────────────────────

  _scheduleMainScan() {
    if (this._mainScanScheduled) return;
    this._mainScanScheduled = true;
    // setImmediate lets pending worker messages drain before scanning.
    setImmediate(() => {
      this._mainScanScheduled = false;
      this._mainScan();
    });
  }

  async _mainScan() {
    if (this._scanning || this._finished) return;
    this._scanning = true;
    try {
      while (this._remaining > 0 && !this._finished) {
        const claimed = this._claimMainTask();
        if (!claimed) break;
        await this._executeMainTask(claimed);
      }
    } finally {
      this._scanning = false;
    }
  }

  // Scan the SAB for a READY main-thread task whose predecessor outputs are
  // all available in the results map.  Returns { taskIdx, name, def, inputs }
  // or null if nothing is claimable.
  _claimMainTask() {
    const views = this._views;
    const start = Atomics.load(views.firstReady, 0);
    const count = Atomics.load(views.taskCount, 0);
    for (let i = start; i < count; i++) {
      if (Atomics.load(views.status, i) !== READY) continue;
      if (!(Atomics.load(views.flags, i) & F_RUN_ON_MAIN)) continue;
      if (Atomics.compareExchange(views.status, i, READY, CLAIMED) !== READY) continue;

      const name = this._idMapping.idxToName[i];
      const def  = this.tasks.get(name);
      if (!def) {
        Atomics.store(views.status, i, DONE);
        continue;
      }

      const inputs = this._assembleInputs(def);
      if (inputs === null) {
        // Predecessor output not yet received (message in flight); release.
        Atomics.store(views.status, i, READY);
        continue;
      }
      return { taskIdx: i, name, def, inputs };
    }
    return null;
  }

  async _executeMainTask({ taskIdx, name, def, inputs }) {
    const views = this._views;
    const t0 = Date.now();
    let output;
    try {
      output = await def.execute(inputs, this._ctx, this.state);
    } catch (err) {
      this._abort(name, err);
      return;
    }
    if (this._finished) return;
    const t1 = Date.now();

    // Timing.
    const timing = { start: t0, end: t1 };
    if (output?.workerStart != null) { timing.workerStart = output.workerStart; timing.workerEnd = output.workerEnd; }
    if (output?.lane != null) timing.lane = output.lane;
    if (def.consolidate)  timing.consolidate  = true;
    if (def.ganttSection) timing.ganttSection = def.ganttSection;
    this.timings.set(name, timing);

    // Store result.
    this.results.set(name, output);

    // State mutation.
    def.submit(output, this.state, this);

    // Update SAB: mark DONE, decrement successor dep counts.
    const { readyCount } = sabOnTaskDone(views, taskIdx, -1);
    if (readyCount > 0) {
      Atomics.add(views.notify, 0, 1);
      Atomics.notify(views.notify, 0, readyCount);
    }

    this._remaining--;
    if (this._remaining === 0) this._finish();
  }

  _assembleInputs(def) {
    const inputs = {};
    for (const predName of def.expected) {
      if (!this.results.has(predName)) return null;
      inputs[predName] = this.results.get(predName);
    }
    return inputs;
  }

  // ── Worker output handling ────────────────────────────────────────────────

  _onWorkerDone({ done: taskIdx, output, timing, lane }) {
    const name = this._idMapping.idxToName[taskIdx];
    const def  = this.tasks.get(name);

    // Timing.
    const t = { start: timing.start, end: timing.end };
    if (output?.workerStart != null) { t.workerStart = output.workerStart; t.workerEnd = output.workerEnd; }
    if (lane != null) t.lane = lane;
    if (def?.consolidate)  t.consolidate  = true;
    if (def?.ganttSection) t.ganttSection = def.ganttSection;
    this.timings.set(name, t);

    // Store result.
    this.results.set(name, output);

    // State mutation.
    if (def) def.submit(output, this.state, this);

    this._remaining--;
    if (this._remaining === 0) {
      this._finish();
      return;
    }

    // A newly-stored result may satisfy a previously-blocked main task.
    this._scheduleMainScan();
  }

  _onWorkerError({ taskFailed: taskIdx, message, stack }) {
    const name = this._idMapping.idxToName[taskIdx] ?? `task#${taskIdx}`;
    const err  = Object.assign(new Error(message), { stack });
    this._abort(name, err);
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

  _onMainTaskReady() {
    this._scheduleMainScan();
  }

  // ── Completion / abort ────────────────────────────────────────────────────

  _finish() {
    if (this._finished) return;
    this._finished = true;
    Atomics.store(this._views.buildDone, 0, 1);
    Atomics.add(this._views.notify, 0, 1);
    Atomics.notify(this._views.notify, 0, Infinity);
    this._doneResolve(this.results);
  }

  _abort(taskName, err) {
    if (this._finished) return;
    this._finished = true;
    Atomics.store(this._views.buildDone, 0, 2);
    Atomics.add(this._views.notify, 0, 1);
    Atomics.notify(this._views.notify, 0, Infinity);
    this._doneReject(new Error(`task ${taskName} failed`, { cause: err }));
  }

  // ── Summary ───────────────────────────────────────────────────────────────

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
