// SAB-based scheduling data structures. Phase 5: layout, allocation, and
// verification only; the push scheduler still runs the build.
// See PLAN-sab-pull-scheduler.md for the full design.

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

// Flag bits
export const F_ON_DEMAND         = 1;
export const F_UNIQUE_PER_WORKER = 2;
export const F_RUN_ON_MAIN       = 4;
export const F_PIN_TO_PRED       = 8;

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
  const warmInitIdx = nameToIdx.get("warmInit");
  const taskMeta    = new Array(totalTasks).fill(null);

  for (const [name, def] of Object.entries(taskDefs)) {
    taskMeta[nameToIdx.get(name)] = {
      handler:        def.handler ?? name,
      perWorkerDeps:  [],
      name,
    };
  }

  for (let i = 0; i < maxChunks; i++) {
    taskMeta[DYNAMIC_BASE + i] = {
      handler:        "render",
      perWorkerDeps:  warmInitIdx != null ? [warmInitIdx] : [],
      name:           `render:${i}`,
    };
  }

  taskMeta[RENDER_JOIN_IDX] = {
    handler:        "renderJoin",
    perWorkerDeps:  [],
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
