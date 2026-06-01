// SAB-based scheduling data structures and worker-pull primitives.
// Phase 7: workers pull tasks via atomics; main-thread tasks scan the SAB
// for READY work and claim via CAS. See PLAN-sab-pull-scheduler.md.

// ── Constants ────────────────────────────────────────────────────────────────

export const MAX_TASKS  = 256;
export const MAX_LANES  = 64;
export const MAX_EDGES  = 512;
export const SLICES_PER_WORKER = 10;
export const MAX_RENDER_CHUNKS = MAX_LANES * SLICES_PER_WORKER;

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
    chunkOffset:     a(MAX_RENDER_CHUNKS),
    chunkLength:     a(MAX_RENDER_CHUNKS),
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
    chunkOffset:     v(L.chunkOffset,     MAX_RENDER_CHUNKS),
    chunkLength:     v(L.chunkLength,     MAX_RENDER_CHUNKS),
  };
}

// ── Allocation ───────────────────────────────────────────────────────────────

export function allocSchedulerSAB(taskDefs, workerCount) {
  // 1. Assign indices to static tasks in definition order
  const nameToIdx = new Map();
  const idxToName = [];

  for (const name of Object.keys(taskDefs)) {
    nameToIdx.set(name, idxToName.length);
    idxToName.push(name);
  }

  const DYNAMIC_BASE = idxToName.length;
  const maxChunks    = workerCount * SLICES_PER_WORKER;
  const RENDER_JOIN_IDX = DYNAMIC_BASE + maxChunks;

  // Pre-reserve render chunk and renderJoin slots
  for (let i = 0; i < maxChunks; i++) {
    nameToIdx.set(`render:${i}`, DYNAMIC_BASE + i);
    idxToName.push(`render:${i}`);
  }
  nameToIdx.set("renderJoin", RENDER_JOIN_IDX);
  idxToName.push("renderJoin");

  const totalTasks = RENDER_JOIN_IDX + 1;
  if (totalTasks > MAX_TASKS)
    throw new Error(`${totalTasks} tasks exceeds MAX_TASKS (${MAX_TASKS})`);

  // 2. Build successor adjacency list by inverting expected[] predecessors
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

  // 3. Allocate SAB and create views
  const sab   = new SharedArrayBuffer(SAB_BYTE_LENGTH);
  const views = createViews(sab);

  Atomics.store(views.taskCount, 0, totalTasks);

  // 4. Populate per-task arrays
  let edgePos = 0;

  for (let i = 0; i < totalTasks; i++) {
    const name = idxToName[i];
    const def  = taskDefs[name];   // undefined for dynamic slots

    // depCount: static tasks use expected.length; dynamic slots start at 0
    if (def) views.depCount[i] = def.expected.length;

    // flags
    let f = 0;
    if (def?.on_demand)           f |= F_ON_DEMAND;
    if (def?.unique_per_worker)   f |= F_UNIQUE_PER_WORKER;
    if (def?.runOnMain)           f |= F_RUN_ON_MAIN;
    if (def?.pin_to_predecessor)  f |= F_PIN_TO_PRED;
    if (def?.run_when_idle)       f |= F_RUN_WHEN_IDLE;
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
    if (def?.pin_to_predecessor) {
      const pinIdx = nameToIdx.get(def.pin_to_predecessor);
      if (pinIdx == null)
        throw new Error(`"${name}" pinned to unknown "${def.pin_to_predecessor}"`);
      views.pinnedTo[i] = pinIdx;
    } else {
      views.pinnedTo[i] = -1;
    }

    // status: non-on_demand seeds get READY
    if (def && def.expected.length === 0 && !def.on_demand) {
      views.status[i] = READY;
    }
  }

  Atomics.store(views.edgeCount, 0, edgePos);

  // 5. Build taskMeta
  const renderEnvInitIdx = nameToIdx.get("renderEnvInit");
  const taskMeta         = new Array(totalTasks).fill(null);

  for (const [name, def] of Object.entries(taskDefs)) {
    // Map perWorkerDeps from definition (if any) through nameToIdx.
    let perWorkerDeps = [];
    if (def.perWorkerDeps) {
      perWorkerDeps = def.perWorkerDeps.map(depName => {
        const depIdx = nameToIdx.get(depName);
        if (depIdx == null)
          throw new Error(`"${name}" has unknown perWorkerDep "${depName}"`);
        return depIdx;
      });
    }

    // Map expected predecessors to indices for precondition checking
    // on unique_per_worker tasks (Phase 10).
    let expectedIdxs = [];
    if (def.unique_per_worker && def.expected.length > 0) {
      expectedIdxs = def.expected.map(predName => {
        const predIdx = nameToIdx.get(predName);
        if (predIdx == null)
          throw new Error(`"${name}" has unknown expected predecessor "${predName}"`);
        return predIdx;
      });
    }

    taskMeta[nameToIdx.get(name)] = {
      handler:        def.handler ?? name,
      perWorkerDeps,
      expectedIdxs,
      name,
    };
  }

  for (let i = 0; i < maxChunks; i++) {
    taskMeta[DYNAMIC_BASE + i] = {
      handler:        "render",
      perWorkerDeps:  renderEnvInitIdx != null ? [renderEnvInitIdx] : [],
      expectedIdxs:   [],
      name:           `render:${i}`,
    };
  }

  taskMeta[RENDER_JOIN_IDX] = {
    handler:        "renderJoin",
    perWorkerDeps:  [],
    expectedIdxs:   [],
    name:           "renderJoin",
  };

  const idMapping = {
    nameToIdx,
    idxToName,
    DYNAMIC_BASE,
    RENDER_JOIN_IDX,
    maxRenderChunks: maxChunks,
  };

  return { sab, views, idMapping, taskMeta };
}

// ── Worker pull-loop primitives ──────────────────────────────────────────────
//
// Used by cpu-worker.mjs (worker thread) and by the main-thread bridge in
// scheduler.mjs.  All operate directly on the SAB via Atomics so they are
// thread-safe without locks.

export function scanAndClaim(views, myLane) {
  const start = Atomics.load(views.firstReady, 0);
  const count = Atomics.load(views.taskCount, 0);
  for (let i = start; i < count; i++) {
    if (Atomics.load(views.status, i) !== READY) continue;
    if (Atomics.load(views.flags, i) & F_RUN_ON_MAIN) continue;
    const aff = Atomics.load(views.affinityLane, i);
    if (aff !== -1 && aff !== myLane) continue;
    if (Atomics.compareExchange(views.status, i, READY, CLAIMED) === READY)
      return i;
  }
  return -1;
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

// ── Dynamic task registration (called by dispatch on the main thread) ───────

const encoder = new TextEncoder();

export function registerDynamicRender(views, idMapping, numChunks) {
  let edgePos = Atomics.load(views.edgeCount, 0);
  for (let i = 0; i < numChunks; i++) {
    const idx = idMapping.DYNAMIC_BASE + i;
    views.succOffset[idx] = edgePos;
    views.succCount[idx]  = 1;
    if (edgePos >= MAX_EDGES)
      throw new Error(`Edge count exceeds MAX_EDGES (${MAX_EDGES})`);
    views.succList[edgePos++] = idMapping.RENDER_JOIN_IDX;
  }
  Atomics.store(views.edgeCount, 0, edgePos);
  Atomics.store(views.depCount, idMapping.RENDER_JOIN_IDX, numChunks);
  views.flags[idMapping.RENDER_JOIN_IDX] = F_RUN_ON_MAIN;
}

export function packChunkData(chunks, views) {
  const buffers = chunks.map(c => encoder.encode(JSON.stringify(c)));
  const totalBytes = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const sab = new SharedArrayBuffer(totalBytes);
  const full = new Uint8Array(sab);
  let offset = 0;
  for (let i = 0; i < buffers.length; i++) {
    full.set(buffers[i], offset);
    Atomics.store(views.chunkOffset, i, offset);
    Atomics.store(views.chunkLength, i, buffers[i].byteLength);
    offset += buffers[i].byteLength;
  }
  return sab;
}

export function activateRenderTasks(views, idMapping, numChunks) {
  for (let i = 0; i < numChunks; i++) {
    Atomics.store(views.status, idMapping.DYNAMIC_BASE + i, READY);
  }
  Atomics.add(views.notify, 0, 1);
  Atomics.notify(views.notify, 0, Infinity);
}

// ── Verification ─────────────────────────────────────────────────────────────

export function verifySchedulerSAB(taskDefs, views, idMapping) {
  const { nameToIdx, idxToName } = idMapping;
  const errors = [];

  // Verify dep counts for static tasks
  for (const [name, def] of Object.entries(taskDefs)) {
    const idx    = nameToIdx.get(name);
    const actual = views.depCount[idx];
    if (actual !== def.expected.length)
      errors.push(`depCount "${name}": got ${actual}, want ${def.expected.length}`);
  }

  // Verify successor edges (rebuild expected set and compare)
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

  // Verify flags
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

  // Verify seed status
  for (const [name, def] of Object.entries(taskDefs)) {
    const idx    = nameToIdx.get(name);
    const isSeed = def.expected.length === 0 && !def.on_demand;
    const status = views.status[idx];
    if (isSeed && status !== READY)
      errors.push(`seed "${name}" should be READY, got ${status}`);
    if (!isSeed && status !== NOT_READY)
      errors.push(`non-seed "${name}" should be NOT_READY, got ${status}`);
  }

  if (errors.length > 0)
    throw new Error("SAB verification failed:\n  " + errors.join("\n  "));
}
