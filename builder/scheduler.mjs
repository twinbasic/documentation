// Task-graph scheduler for the tbdocs build pipeline. See PLAN-scheduler.md
// for the full design, data-flow diagram, and task placement rationale.

import pc from "picocolors";

export class SharedState {
  pages       = [];        // master copy; mutated in place by [M] tasks and render delta merges
  staticFiles = [];        // master copy; mermaid.submit appends new SVG descriptors
  site        = {};        // config, navTree, seoSiteTitle, seoLogoUrl, bookData, data, markdown, …
  pageByDest  = new Map(); // destPath → page; built once in discover.submit
}

export class Scheduler {
  constructor({ pool, tasks }) {
    this.pool     = pool;
    this.tasks    = new Map(Object.entries(tasks));
    this.pending  = new Map();
    this.ready    = [];
    this.results  = new Map();
    this.timings  = new Map();
    this.state    = new SharedState();
    this.inFlight = 0;
    [this._doneP, this._doneResolve, this._doneReject] = deferred();
    for (const [id, def] of this.tasks) this._initPending(id, def);
  }

  _initPending(id, def) {
    this.pending.set(id, { expected: def.expected.length, received: new Map() });
  }

  register(id, def) {
    this.tasks.set(id, def);
    this._initPending(id, def);
  }

  // Seed a freshly-registered task directly (used by dispatch.submit to feed
  // each render:i its chunk without going through emit()).
  seed(id, inputs) {
    this.pending.delete(id);
    this.ready.push({ id, def: this.tasks.get(id), inputs });
    this._flush();
  }

  emit(targetId, data, sourceId) {
    const entry = this.pending.get(targetId);
    if (!entry) throw new Error(`unknown or already-dispatched task: ${targetId}`);
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
      if (def.expected.length === 0) {
        this.pending.delete(id);   // seeds have no inputs; remove from pending before dispatching
        this.ready.push({ id, def, inputs: {} });
      }
    }
    this._flush();
    this.pool.warmup();
    return this._doneP;
  }

  _flush() {
    while (this.ready.length > 0) this._run(this.ready.shift());
  }

  _run(task) {
    const start = Date.now();
    this.inFlight++;
    const p = task.def.runOnMain
      ? Promise.resolve(task.def.execute(task.inputs, this._ctx, this.state))
      : this.pool.run({ inputs: task.inputs, ctx: this._ctx },
                      { name: task.def.handler ?? task.id });
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
    // submit() must be synchronous; async work belongs in execute().
    task.def.submit(
      output,
      (tgt, data) => this.emit(tgt, data, task.id),
      this.state,
      this,
    );
    if (this.inFlight === 0 && this.ready.length === 0 && this.pending.size === 0) {
      this._doneResolve(this.results);
    }
  }

  _onError(task, err) {
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
