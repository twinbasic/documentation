// SAB-based scheduling data structures and worker-pull primitives.
// Phase 15: generic dynamic tasks, SAB-based task metadata, per-chunk flush,
// priority-aware scanning. See PLAN-sab-pull-scheduler.md §Phase 15.

// ── Constants ────────────────────────────────────────────────────────────────

export const MAX_TASKS  = 512;
export const MAX_LANES  = 64;
export const MAX_EDGES  = 2048;
export const SLICES_PER_WORKER = 10;

// Status values (Int32)
export const NOT_READY = 0;
export const READY     = 1;
export const CLAIMED   = 2;
export const DONE      = 3;
export const FAILED    = 4;

// Flag bits
export const F_ON_DEMAND         = 1;
export const F_UNIQUE_PER_WORKER = 2;
export const F_RUN_ON_MAIN       = 4;
export const F_PIN_TO_PRED       = 8;
export const F_RUN_WHEN_IDLE    = 16;

// Handler name → integer ID registry.  Workers build the reverse table
// (handlerById) at startup from the imported HANDLERS constant.
export const HANDLERS = {
  warmInit: 0, renderEnvInit: 1, flush: 2,
  scssLight: 3, scssDark: 4, dot: 5,
  buildInfo: 6, render: 7,
};

// ── SAB layout ───────────────────────────────────────────────────────────────
//
// All arrays are Int32. Offsets are in Int32 elements (multiply by 4 for bytes).

const L = (() => {
  let o = 0;
  const a = n => { const off = o; o += n; return off; };
  return {
    taskCount:       a(1),
    depCount:        a(MAX_TASKS),
    status:          a(MAX_TASKS),
    flags:           a(MAX_TASKS),
    succOffset:      a(MAX_TASKS),
    succCount:       a(MAX_TASKS),
    succList:        a(MAX_EDGES),
    affinityLane:    a(MAX_TASKS),
    pinnedTo:        a(MAX_TASKS),
    completedOnLane: a(MAX_TASKS),
    perWorkerDone:   a(MAX_TASKS * MAX_LANES),
    edgeCount:       a(1),
    notify:          a(1),
    firstReady:      a(1),
    buildDone:       a(1),
    handlerIdx:      a(MAX_TASKS),
    perWorkerDep:    a(MAX_TASKS * 2),
    expectedDep:     a(MAX_TASKS * 2),
    idlePriority:    a(MAX_TASKS),
    priority:        a(MAX_TASKS),
    payloadOffset:   a(MAX_TASKS),
    payloadLength:   a(MAX_TASKS),
    TOTAL: o,
  };
})();

export const SAB_BYTE_LENGTH = L.TOTAL * 4;

// ── View creation ────────────────────────────────────────────────────────────

export function createViews(sab) {
  const v = (off, len) => new Int32Array(sab, off * 4, len);
  return {
    taskCount:       v(L.taskCount,       1),
    depCount:        v(L.depCount,        MAX_TASKS),
    status:          v(L.status,          MAX_TASKS),
    flags:           v(L.flags,           MAX_TASKS),
    succOffset:      v(L.succOffset,      MAX_TASKS),
    succCount:       v(L.succCount,       MAX_TASKS),
    succList:        v(L.succList,        MAX_EDGES),
    affinityLane:    v(L.affinityLane,    MAX_TASKS),
    pinnedTo:        v(L.pinnedTo,        MAX_TASKS),
    completedOnLane: v(L.completedOnLane, MAX_TASKS),
    perWorkerDone:   v(L.perWorkerDone,   MAX_TASKS * MAX_LANES),
    edgeCount:       v(L.edgeCount,       1),
    notify:          v(L.notify,          1),
    firstReady:      v(L.firstReady,      1),
    buildDone:       v(L.buildDone,       1),
    handlerIdx:      v(L.handlerIdx,      MAX_TASKS),
    perWorkerDep:    v(L.perWorkerDep,    MAX_TASKS * 2),
    expectedDep:     v(L.expectedDep,     MAX_TASKS * 2),
    idlePriority:    v(L.idlePriority,    MAX_TASKS),
    priority:        v(L.priority,        MAX_TASKS),
    payloadOffset:   v(L.payloadOffset,   MAX_TASKS),
    payloadLength:   v(L.payloadLength,   MAX_TASKS),
  };
}

// ── Task metadata API ────────────────────────────────────────────────────────
//
// Encapsulates the SAB layout for per-task metadata.  All callers —
// allocSchedulerSAB (static), dispatch.submit (dynamic), the pull loop
// and idle scan (reads) — go through these two functions.

export function writeTaskMeta(views, idx, {
  handlerIdx, perWorkerDeps, expectedDeps, idlePriority, priority,
}) {
  Atomics.store(views.handlerIdx,   idx, handlerIdx);
  Atomics.store(views.perWorkerDep, idx * 2,     perWorkerDeps?.[0] ?? -1);
  Atomics.store(views.perWorkerDep, idx * 2 + 1, perWorkerDeps?.[1] ?? -1);
  Atomics.store(views.expectedDep,  idx * 2,     expectedDeps?.[0]  ?? -1);
  Atomics.store(views.expectedDep,  idx * 2 + 1, expectedDeps?.[1]  ?? -1);
  Atomics.store(views.idlePriority, idx, idlePriority ?? 0);
  Atomics.store(views.priority,     idx, priority ?? 0);
}

export function readTaskMeta(views, idx) {
  const d0 = Atomics.load(views.perWorkerDep, idx * 2);
  const d1 = Atomics.load(views.perWorkerDep, idx * 2 + 1);
  const e0 = Atomics.load(views.expectedDep,  idx * 2);
  const e1 = Atomics.load(views.expectedDep,  idx * 2 + 1);
  return {
    handlerIdx:    Atomics.load(views.handlerIdx, idx),
    perWorkerDeps: d1 !== -1 ? [d0, d1] : d0 !== -1 ? [d0] : [],
    expectedDeps:  e1 !== -1 ? [e0, e1] : e0 !== -1 ? [e0] : [],
    idlePriority:  Atomics.load(views.idlePriority, idx),
    priority:      Atomics.load(views.priority, idx),
  };
}

// ── Allocation ───────────────────────────────────────────────────────────────

export function allocSchedulerSAB(taskDefs, workerCount, opts = {}) {
  // Validate: survives_reset only makes sense on unique_per_worker tasks
  // (it pre-fills perWorkerDone, which only those tasks consult).
  for (const [name, def] of Object.entries(taskDefs)) {
    if (def.survives_reset && !def.unique_per_worker)
      throw new Error(
        `"${name}" has survives_reset without unique_per_worker`);
  }

  // 1. Assign indices to static tasks in definition order.
  const nameToIdx = new Map();
  const idxToName = [];

  for (const name of Object.keys(taskDefs)) {
    nameToIdx.set(name, idxToName.length);
    idxToName.push(name);
  }

  const DYNAMIC_BASE = idxToName.length;
  const totalTasks   = DYNAMIC_BASE;  // dynamic slots allocated at runtime
  if (totalTasks > MAX_TASKS)
    throw new Error(`${totalTasks} static tasks exceeds MAX_TASKS (${MAX_TASKS})`);

  // 2. Build successor adjacency list by inverting expected[] predecessors.
  const successors = Array.from({ length: totalTasks }, () => []);

  for (const [name, def] of Object.entries(taskDefs)) {
    const taskIdx = nameToIdx.get(name);
    for (const pred of def.expected) {
      const predIdx = nameToIdx.get(pred);
      if (predIdx == null)
        throw new Error(`"${name}" expects unknown predecessor "${pred}"`);
      successors[predIdx].push(taskIdx);
    }
  }

  // 3. Allocate SAB and create views.
  const sab   = new SharedArrayBuffer(SAB_BYTE_LENGTH);
  const views = createViews(sab);

  Atomics.store(views.taskCount, 0, totalTasks);

  // Initialize "-1 = unassigned" arrays.  The SAB is zero-initialized, so
  // dynamic slots would otherwise look like {affinityLane: 0, pinnedTo: 0,
  // completedOnLane: 0, handlerIdx: 0, perWorkerDep: 0, expectedDep: 0},
  // which would (a) constrain dynamic tasks to lane 0 only, (b) make every
  // dynamic task look pinned to task 0, (c) make readTaskMeta see fake deps.
  views.affinityLane.fill(-1);
  views.completedOnLane.fill(-1);
  views.pinnedTo.fill(-1);
  views.handlerIdx.fill(-1);
  views.perWorkerDep.fill(-1);
  views.expectedDep.fill(-1);

  // 4. Populate per-task arrays.
  let edgePos = 0;

  for (let i = 0; i < totalTasks; i++) {
    const name = idxToName[i];
    const def  = taskDefs[name];

    views.depCount[i] = def.expected.length;

    // flags
    let f = 0;
    if (def.on_demand)           f |= F_ON_DEMAND;
    if (def.unique_per_worker)   f |= F_UNIQUE_PER_WORKER;
    if (def.runOnMain)           f |= F_RUN_ON_MAIN;
    if (def.pin_to_predecessor)  f |= F_PIN_TO_PRED;
    if (def.run_when_idle)       f |= F_RUN_WHEN_IDLE;
    views.flags[i] = f;

    // successor edges
    const succs = successors[i];
    views.succOffset[i] = edgePos;
    views.succCount[i]  = succs.length;
    for (const s of succs) {
      if (edgePos >= MAX_EDGES)
        throw new Error(`Edge count exceeds MAX_EDGES (${MAX_EDGES})`);
      views.succList[edgePos++] = s;
    }

    // defaults
    views.affinityLane[i]    = -1;
    views.completedOnLane[i] = -1;

    // pinnedTo
    if (def.pin_to_predecessor) {
      const pinIdx = nameToIdx.get(def.pin_to_predecessor);
      if (pinIdx == null)
        throw new Error(`"${name}" pinned to unknown "${def.pin_to_predecessor}"`);
      views.pinnedTo[i] = pinIdx;
    } else {
      views.pinnedTo[i] = -1;
    }

    // status: non-on_demand seeds get READY
    if (def.expected.length === 0 && !def.on_demand) {
      views.status[i] = READY;
    }
  }

  Atomics.store(views.edgeCount, 0, edgePos);

  // 5. Write task metadata into SAB for worker tasks (main-thread tasks
  //    keep the initialized defaults: handlerIdx = -1, deps = -1).
  for (const [name, def] of Object.entries(taskDefs)) {
    if (def.runOnMain) continue;

    const idx         = nameToIdx.get(name);
    const handlerName = def.handler ?? name;
    const hIdx        = HANDLERS[handlerName];
    if (hIdx == null)
      throw new Error(`"${name}" has unknown handler "${handlerName}"`);

    const perWorkerDeps = (def.perWorkerDeps ?? []).map(depName => {
      const depIdx = nameToIdx.get(depName);
      if (depIdx == null)
        throw new Error(`"${name}" has unknown perWorkerDep "${depName}"`);
      return depIdx;
    });

    let expectedDeps = [];
    if (def.unique_per_worker && def.expected.length > 0) {
      expectedDeps = def.expected.map(predName => {
        const predIdx = nameToIdx.get(predName);
        if (predIdx == null)
          throw new Error(`"${name}" has unknown expected predecessor "${predName}"`);
        return predIdx;
      });
    }

    writeTaskMeta(views, idx, {
      handlerIdx:   hIdx,
      perWorkerDeps,
      expectedDeps,
      idlePriority: def.idle_priority ?? 0,
    });
  }

  // 6. Pre-fill perWorkerDone for survives_reset tasks on rebuilds.  The
  //    handler's side effects (e.g. loading a WASM module into the worker's
  //    module scope) persist across init messages, so the dep check passes
  //    immediately and the handler never re-fires.  Validated above to be
  //    unique_per_worker, so perWorkerDone is the right slot to flip.
  if (opts.rebuild) {
    for (const [name, def] of Object.entries(taskDefs)) {
      if (!def.survives_reset) continue;
      const idx = nameToIdx.get(name);
      for (let lane = 0; lane < workerCount; lane++) {
        views.perWorkerDone[idx * MAX_LANES + lane] = 1;
      }
    }
  }

  const idMapping = {
    nameToIdx,
    idxToName,
    DYNAMIC_BASE,
    nextDynamic: 0,
  };

  return { sab, views, idMapping };
}

// ── Worker pull-loop primitives ──────────────────────────────────────────────

// Priority-aware best-match scan.  Finds the READY worker task with the
// highest priority value and claims it via CAS.  Retries on CAS loss.
export function scanAndClaim(views, myLane) {
  const count = Atomics.load(views.taskCount, 0);
  while (true) {
    const start = Atomics.load(views.firstReady, 0);
    let bestIdx = -1, bestPri = -1;
    for (let i = start; i < count; i++) {
      if (Atomics.load(views.status, i) !== READY) continue;
      if (Atomics.load(views.flags, i) & F_RUN_ON_MAIN) continue;
      const aff = Atomics.load(views.affinityLane, i);
      if (aff !== -1 && aff !== myLane) continue;
      const pri = Atomics.load(views.priority, i);
      if (pri > bestPri) { bestPri = pri; bestIdx = i; }
    }
    if (bestIdx === -1) return -1;
    if (Atomics.compareExchange(views.status, bestIdx, READY, CLAIMED) === READY)
      return bestIdx;
    // CAS lost: another worker claimed bestIdx.  Retry full scan.
  }
}

export function onTaskDone(views, taskIdx, lane) {
  Atomics.store(views.status, taskIdx, DONE);
  Atomics.store(views.completedOnLane, taskIdx, lane);
  advanceFirstReady(views, taskIdx);

  let readyCount = 0;
  let wakeMain   = false;

  const off = Atomics.load(views.succOffset, taskIdx);
  const cnt = Atomics.load(views.succCount, taskIdx);
  for (let i = off; i < off + cnt; i++) {
    const succ = Atomics.load(views.succList, i);
    if (Atomics.load(views.flags, succ) & F_UNIQUE_PER_WORKER) continue;

    const remaining = Atomics.sub(views.depCount, succ, 1) - 1;
    if (remaining === 0) {
      const pin = Atomics.load(views.pinnedTo, succ);
      if (pin !== -1) {
        const srcLane = Atomics.load(views.completedOnLane, pin);
        Atomics.store(views.affinityLane, succ, srcLane);
      }
      Atomics.store(views.status, succ, READY);

      if (Atomics.load(views.flags, succ) & F_RUN_ON_MAIN) wakeMain = true;
      else readyCount++;
    }
  }

  return { readyCount, wakeMain };
}

export function advanceFirstReady(views, taskIdx) {
  const count = Atomics.load(views.taskCount, 0);
  const cur   = Atomics.load(views.firstReady, 0);
  if (taskIdx !== cur) return;
  let next = cur;
  while (next < count && Atomics.load(views.status, next) === DONE) next++;
  if (next > cur) Atomics.compareExchange(views.firstReady, 0, cur, next);
}

// ── Generic dynamic task primitives ──────────────────────────────────────────
//
// Used by dispatch.submit() (and any future fan-out submitter) to allocate
// slots, wire edges, set dep counts, pack payloads, and activate tasks.
// The scheduler has zero knowledge of what any specific task does.

const encoder = new TextEncoder();

// Reserve `count` contiguous slots from the dynamic pool.  Returns the base index.
export function allocDynamicSlots(views, idMapping, count) {
  const base = idMapping.DYNAMIC_BASE + idMapping.nextDynamic;
  if (base + count > MAX_TASKS)
    throw new Error(`dynamic tasks exceed MAX_TASKS (${MAX_TASKS})`);
  idMapping.nextDynamic += count;
  const newCount = base + count;
  if (newCount > Atomics.load(views.taskCount, 0))
    Atomics.store(views.taskCount, 0, newCount);
  return base;
}

// Append successor edges for dynamic tasks to the global succList.
// Each `from` must have no prior successors (succCount === 0); use
// appendDynamicSuccessors to extend a task that already has successors.
export function wireDynamicEdges(views, edges) {
  let edgePos = Atomics.load(views.edgeCount, 0);
  for (const { from, to } of edges) {
    if (edgePos + to.length > MAX_EDGES)
      throw new Error(`dynamic edges exceed MAX_EDGES (${MAX_EDGES})`);
    Atomics.store(views.succOffset, from, edgePos);
    Atomics.store(views.succCount,  from, to.length);
    for (const s of to) views.succList[edgePos++] = s;
  }
  Atomics.store(views.edgeCount, 0, edgePos);
}

// Extend a task's successor list with new dynamic successors.  Relocates
// the task's existing successors to the end of succList (the old slots
// become dead space) so the contiguous-range invariant holds.  Used when
// a static task needs to fan out to dynamically-registered successors.
export function appendDynamicSuccessors(views, edges) {
  let edgePos = Atomics.load(views.edgeCount, 0);
  for (const { from, to } of edges) {
    const oldOff = Atomics.load(views.succOffset, from);
    const oldCnt = Atomics.load(views.succCount,  from);
    const total  = oldCnt + to.length;
    if (edgePos + total > MAX_EDGES)
      throw new Error(`dynamic edges exceed MAX_EDGES (${MAX_EDGES})`);
    for (let i = 0; i < oldCnt; i++)
      views.succList[edgePos + i] = views.succList[oldOff + i];
    for (let i = 0; i < to.length; i++)
      views.succList[edgePos + oldCnt + i] = to[i];
    Atomics.store(views.succOffset, from, edgePos);
    Atomics.store(views.succCount,  from, total);
    edgePos += total;
  }
  Atomics.store(views.edgeCount, 0, edgePos);
}

// Set a task's predecessor count (for join barriers whose count is unknown
// at allocation time).
export function setDepCount(views, idx, count) {
  Atomics.store(views.depCount, idx, count);
}

// Activate tasks whose depCount is 0.  Tasks with unsatisfied predecessors
// stay NOT_READY and are activated later by onTaskDone.
export function activateDynamicTasks(views, base, count) {
  let readyCount = 0;
  for (let i = 0; i < count; i++) {
    const idx = base + i;
    if (Atomics.load(views.depCount, idx) === 0) {
      Atomics.store(views.status, idx, READY);
      readyCount++;
    }
  }
  if (readyCount > 0) {
    Atomics.add(views.notify, 0, 1);
    Atomics.notify(views.notify, 0, Infinity);
  }
}

// JSON-serialize each payload, concatenate into one SharedArrayBuffer, and
// write per-task payloadOffset / payloadLength into the scheduling SAB.
export function packPayloads(views, base, payloads) {
  const buffers = payloads.map(p => encoder.encode(JSON.stringify(p)));
  const totalBytes = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const sab = new SharedArrayBuffer(totalBytes);
  const full = new Uint8Array(sab);
  let offset = 0;
  for (let i = 0; i < buffers.length; i++) {
    full.set(buffers[i], offset);
    Atomics.store(views.payloadOffset, base + i, offset);
    Atomics.store(views.payloadLength, base + i, buffers[i].byteLength);
    offset += buffers[i].byteLength;
  }
  return sab;
}

// ── Verification ─────────────────────────────────────────────────────────────

export function verifySchedulerSAB(taskDefs, views, idMapping) {
  const { nameToIdx, idxToName } = idMapping;
  const errors = [];

  // Verify dep counts for static tasks.
  for (const [name, def] of Object.entries(taskDefs)) {
    const idx    = nameToIdx.get(name);
    const actual = views.depCount[idx];
    if (actual !== def.expected.length)
      errors.push(`depCount "${name}": got ${actual}, want ${def.expected.length}`);
  }

  // Verify successor edges (rebuild expected set and compare).
  const expectedSucc = new Map();
  for (let i = 0; i < idxToName.length; i++) expectedSucc.set(i, new Set());

  for (const [name, def] of Object.entries(taskDefs)) {
    const taskIdx = nameToIdx.get(name);
    for (const pred of def.expected) {
      expectedSucc.get(nameToIdx.get(pred)).add(taskIdx);
    }
  }

  for (const [predIdx, want] of expectedSucc) {
    const off = views.succOffset[predIdx];
    const cnt = views.succCount[predIdx];
    const got = new Set();
    for (let i = off; i < off + cnt; i++) got.add(views.succList[i]);

    for (const s of want) {
      if (!got.has(s))
        errors.push(`missing edge: ${idxToName[predIdx]} -> ${idxToName[s]}`);
    }
    for (const s of got) {
      if (!want.has(s))
        errors.push(`extra edge: ${idxToName[predIdx]} -> ${idxToName[s]}`);
    }
  }

  // Verify flags.
  for (const [name, def] of Object.entries(taskDefs)) {
    const idx = nameToIdx.get(name);
    let want  = 0;
    if (def.on_demand)           want |= F_ON_DEMAND;
    if (def.unique_per_worker)   want |= F_UNIQUE_PER_WORKER;
    if (def.runOnMain)           want |= F_RUN_ON_MAIN;
    if (def.pin_to_predecessor)  want |= F_PIN_TO_PRED;
    if (def.run_when_idle)       want |= F_RUN_WHEN_IDLE;
    if (views.flags[idx] !== want)
      errors.push(`flags "${name}": got ${views.flags[idx]}, want ${want}`);
  }

  // Verify seed status.
  for (const [name, def] of Object.entries(taskDefs)) {
    const idx    = nameToIdx.get(name);
    const isSeed = def.expected.length === 0 && !def.on_demand;
    const status = views.status[idx];
    if (isSeed && status !== READY)
      errors.push(`seed "${name}" should be READY, got ${status}`);
    if (!isSeed && status !== NOT_READY)
      errors.push(`non-seed "${name}" should be NOT_READY, got ${status}`);
  }

  // Verify SAB-based task metadata.
  for (const [name, def] of Object.entries(taskDefs)) {
    const idx = nameToIdx.get(name);
    if (def.runOnMain) {
      if (views.handlerIdx[idx] !== -1)
        errors.push(`handlerIdx "${name}" (runOnMain): got ${views.handlerIdx[idx]}, want -1`);
    } else {
      const handlerName = def.handler ?? name;
      const wantH = HANDLERS[handlerName];
      if (wantH == null)
        errors.push(`"${name}" has unknown handler "${handlerName}"`);
      else if (views.handlerIdx[idx] !== wantH)
        errors.push(`handlerIdx "${name}": got ${views.handlerIdx[idx]}, want ${wantH}`);

      const wantPri = def.idle_priority ?? 0;
      if (Atomics.load(views.idlePriority, idx) !== wantPri)
        errors.push(`idlePriority "${name}": got ${Atomics.load(views.idlePriority, idx)}, want ${wantPri}`);
    }
  }

  if (errors.length > 0)
    throw new Error("SAB verification failed:\n  " + errors.join("\n  "));
}
