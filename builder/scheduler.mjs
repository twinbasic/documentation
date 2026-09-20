// Task-graph scheduler for the tbdocs build pipeline.  Phase 15: generic
// dynamic tasks via SAB primitives; no render/flush-specific counters or
// name-prefix matching.  See PLAN-sab-pull-scheduler.md §Phase 15.

import pc from "picocolors";
import {
  READY, CLAIMED, DONE, F_RUN_ON_MAIN, F_PIN_TO_PRED,
  onTaskDone as sabOnTaskDone,
} from "./sab-scheduler.mjs";

export class SharedState {
  pages        = [];
  staticFiles  = [];
  site         = {};
  pageByDest   = new Map();
  searchChunks = [];   // Phase 17: per-chunk search entries from render workers
}

export class Scheduler {
  constructor({ pool, tasks, views, idMapping, ganttSections, stallMs }) {
    this.pool       = pool;
    this.tasks      = new Map(Object.entries(tasks));
    this.results    = new Map();   // task name → output
    this.timings    = new Map();
    this.state      = new SharedState();
    this._views     = views;
    this._idMapping = idMapping;
    this._ganttSections = ganttSections ?? {};

    // Stall watchdog. A worker that never returns from its handler
    // leaves its task CLAIMED forever: the successors' dep counts never
    // drop, `_remaining` never reaches zero, `_doneP` never settles, and
    // the build sits there having printed its last line. Nothing in the
    // SAB protocol can notice -- the scheduler is waiting on a message
    // that is not coming. So time it out and say what was outstanding.
    this._stallMs = stallMs ?? 0;
    this._stallTimer = null;
    this._lastProgressAt = Date.now();

    // Count non-on_demand static tasks for completion detection.
    // Dynamic tasks (render:i, flush:i) are added via addDynamicTasks().
    this._remaining = 0;
    for (const [, def] of this.tasks) {
      if (!def.on_demand) this._remaining++;
    }

    this._scanning          = false;
    this._mainScanScheduled = false;
    this._finished          = false;

    [this._doneP, this._doneResolve, this._doneReject] = deferred();
  }

  // Increment remaining-task count for dynamically-registered tasks.
  addDynamicTasks(count) {
    this._remaining += count;
  }

  async start(ctx) {
    this._ctx = ctx;
    this._startStallWatchdog();
    this._scheduleMainScan();
    return this._doneP;
  }

  // ── Stall watchdog ────────────────────────────────────────────────────────

  _noteProgress() {
    this._lastProgressAt = Date.now();
  }

  _startStallWatchdog() {
    if (!(this._stallMs > 0)) return;
    this._lastProgressAt = Date.now();
    // Poll rather than arm one long timer: every progress event would
    // otherwise have to reschedule it, and this runs a few dozen times
    // per build at most.
    const tick = Math.max(1000, Math.min(5000, Math.floor(this._stallMs / 4)));
    this._stallTimer = setInterval(() => {
      if (this._finished) return;
      if (Date.now() - this._lastProgressAt < this._stallMs) return;
      this._abort("<stalled>", new Error(this._stallReport()), { stalled: true });
    }, tick);
    // Never let the watchdog itself be the reason the process stays up.
    this._stallTimer.unref?.();
  }

  _stopStallWatchdog() {
    if (this._stallTimer) { clearInterval(this._stallTimer); this._stallTimer = null; }
  }

  // The diagnostic a stalled build prints. Splits the outstanding tasks
  // into the ones a worker is still inside (the cause) and the ones
  // merely waiting on them (the consequence) -- reporting them as one
  // list buries the two names that matter under a dozen that do not.
  _stallReport() {
    const views = this._views;
    const count = Atomics.load(views.taskCount, 0);
    const secs  = Math.round((Date.now() - this._lastProgressAt) / 1000);

    const running = [];   // CLAIMED: a worker is inside the handler
    const ready   = [];   // READY but nothing claimed it
    const waiting = [];   // dep count not yet zero
    for (let i = 0; i < count; i++) {
      const status = Atomics.load(views.status, i);
      if (status === DONE) continue;
      const name = this._idMapping.idxToName[i] ?? `task#${i}`;
      const def  = this.tasks.get(name);
      if (status === CLAIMED) { running.push({ name, def }); continue; }
      if (status === READY) {
        // A pinned task can only run on the lane its predecessor ran
        // on. If that lane is the wedged one, the task is runnable and
        // permanently unrunnable at the same time -- which looks like a
        // second, unrelated fault unless the pinning is spelled out.
        const pin = (Atomics.load(views.flags, i) & F_PIN_TO_PRED)
          ? this._idMapping.idxToName[Atomics.load(views.pinnedTo, i)] : null;
        ready.push({ name, pin });
        continue;
      }
      const missing = (def?.expected ?? []).filter(p => !this.results.has(p));
      waiting.push({ name, missing, deps: Atomics.load(views.depCount, i) });
    }

    const out = [];
    out.push(`BUILD STALLED -- no task completed for ${secs}s.`);
    out.push(`${running.length + ready.length + waiting.length} of ${count} tasks outstanding.`);

    if (running.length) {
      out.push("");
      out.push("Claimed by a worker that never returned -- start here:");
      for (const { name, def } of running) {
        out.push(`  ${name}`);
        for (const line of def?.describe?.() ?? []) out.push(`    ${line}`);
      }
    }
    if (ready.length) {
      out.push("");
      out.push("Runnable, but nothing picked it up:");
      for (const { name, pin } of ready.slice(0, 20)) {
        out.push(`  ${name}${pin ? `  (pinned to the lane that ran ${pin})` : ""}`);
      }
      if (ready.length > 20) out.push(`  ... and ${ready.length - 20} more`);
    }
    if (waiting.length) {
      out.push("");
      out.push("Blocked on a predecessor (consequence, not cause):");
      for (const { name, missing, deps } of waiting.slice(0, 20)) {
        const why = missing.length ? missing.join(", ")
          : deps > 0 ? `${deps} dep(s) outstanding`
          : "on-demand, never activated";
        out.push(`  ${name}  <- ${why}`);
      }
      if (waiting.length > 20) out.push(`  ... and ${waiting.length - 20} more`);
    }

    out.push("");
    if (running.length) {
      out.push("A task stays CLAIMED when the worker is still inside its handler:");
      out.push("an unbounded loop, a regex backtracking exponentially, or a promise");
      out.push("that never settles. Start with the named task, not the waiters --");
      out.push("for a render or flush chunk the fault is nearly always one of the");
      out.push("source pages listed under it.");
    } else {
      out.push("Nothing is CLAIMED, so no worker is busy -- the graph itself is");
      out.push("wedged. Look for a dep count that never reached zero, or a task");
      out.push("whose `expected` list names a predecessor that never submits.");
    }
    out.push("");
    out.push("Pass --stall-timeout 0 to disable this watchdog, or");
    out.push("--stall-timeout <seconds> to give a slow machine more room.");
    return out.join("\n");
  }

  // ── Main-thread SAB scan ─────────────────────────────────────────────────

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

    // Store result.
    this.results.set(name, output);

    // State mutation. Inside the same try as execute(), because a
    // submit() is where a merge assertion lives -- render:i.submit is
    // what refuses to lose a page from the search index -- and an
    // assertion that escapes as an uncaught exception skips _abort
    // entirely: the pool is never destroyed, and under --serve the dev
    // server dies with a raw Node stack instead of "task render:3
    // failed".
    try {
      def.submit(output, this.state, this);
    } catch (err) {
      this._abort(name, err);
      return;
    }
    const t3 = Date.now();

    // Timing.
    const timing = { start: t0, end: t1, t3 };
    if (def.consolidate)  timing.consolidate  = true;
    if (def.ganttSection) timing.ganttSection = def.ganttSection;
    this.timings.set(name, timing);

    // Update SAB: mark DONE, decrement successor dep counts.
    const { readyCount } = sabOnTaskDone(views, taskIdx, -1);
    if (readyCount > 0) {
      Atomics.add(views.notify, 0, 1);
      Atomics.notify(views.notify, 0, readyCount);
    }

    this._noteProgress();
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
    if (lane != null) {
      t.workerStart = timing.start;
      t.workerEnd   = timing.end;
      t.lane = lane;
    }
    if (def?.consolidate)  t.consolidate  = true;
    if (def?.ganttSection) t.ganttSection = def.ganttSection;
    this.timings.set(name, t);

    // Store result.
    this.results.set(name, output);

    // State mutation. Wrapped for the same reason as the main-task
    // path: this runs from worker-pool.mjs's message listener, where an
    // uncaught throw does not reach _abort at all.
    if (def) {
      try {
        def.submit(output, this.state, this);
      } catch (err) {
        this._abort(name, err);
        return;
      }
    }

    this._noteProgress();
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

  _onPerWorkerTiming({ taskIdx, timing, lane }) {
    // A per-worker task (warmInit, renderEnvInit) reports here rather
    // than through _onWorkerDone, and boot can outrun the stall window
    // on a cold CI box. Count it as progress or the watchdog fires on a
    // build that is merely starting up.
    this._noteProgress();
    const taskName = this._idMapping.idxToName[taskIdx];
    this.timings.set(`${taskName}:w${lane}`, {
      start: timing.start, end: timing.end,
      workerStart: timing.start, workerEnd: timing.end,
      lane,
      consolidate: true,
      ganttSection: this._ganttSections[taskName] ?? "Boot",
    });
  }

  _onMainTaskReady() {
    this._scheduleMainScan();
  }

  // ── Completion / abort ────────────────────────────────────────────────────

  _finish() {
    if (this._finished) return;
    this._finished = true;
    this._stopStallWatchdog();
    Atomics.store(this._views.buildDone, 0, 1);
    Atomics.add(this._views.notify, 0, 1);
    Atomics.notify(this._views.notify, 0, Infinity);
    this._doneResolve(this.results);
  }

  _abort(taskName, err, extra) {
    if (this._finished) return;
    this._finished = true;
    this._stopStallWatchdog();
    Atomics.store(this._views.buildDone, 0, 2);
    Atomics.add(this._views.notify, 0, 1);
    Atomics.notify(this._views.notify, 0, Infinity);
    const wrapped = new Error(`task ${taskName} failed`, { cause: err });
    // serve.mjs reuses one pool across rebuilds, so it needs to know a
    // worker is wedged rather than merely that a task threw.
    if (extra) Object.assign(wrapped, extra);
    this._doneReject(wrapped);
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
