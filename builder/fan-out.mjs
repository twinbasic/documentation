// Lane tasks added to the graph while it runs. A main-thread task whose work
// splits into pieces calls fanOut from its submit() with one payload per
// piece; each becomes a task `${prefix}:${i}` that a lane runs with `handler`
// (cpu-worker.mjs), drawn on its lane in the Gantt chart. This is how the build
// runs work in parallel: no task starts a thread of its own (WIP.Build.md, "No
// task starts a thread").
//
// dispatch.submit adds render:i and flush:i with the same primitives
// (sab-scheduler.mjs); this wraps them for a fan-out that has its submitter and
// any other main-thread task as predecessors, may be pinned piece by piece to
// an earlier fan-out's lanes, and feeds one or more static joins.
//
// The order the pieces are wired in is what makes it safe:
//
//   - Every piece waits for `from`, the task whose submit() is running. That
//     task is CLAIMED until submit returns, so no piece can become READY, let
//     alone finish, while the edges are still being written. A predecessor in
//     `after` must be a main-thread task, or a piece of a fan-out made in the
//     same submit; a lane task could finish between the check of its status
//     and the edge, and the edge would never be counted down.
//   - A join's dep count grows by the number of pieces, and its `expected` list
//     by their names, before `from` finishes; the join lists `from`, so it
//     cannot run before then. Its `expected` list is what holds it back until
//     every piece's submit has run (PLAN-sab-pull-scheduler.md, "A dep count of
//     zero does not mean the submits have run").
//
// Each piece's payload is JSON, packed with the others into one
// SharedArrayBuffer that every lane is sent under the key `fan:<base>:<count>`;
// cpu-worker.mjs's fanOutPayload finds a task's by its index. The payload is
// broadcast before `from` is marked done, so it is queued on every lane before
// one can claim a piece.

import {
  allocDynamicSlots,
  appendDynamicSuccessors,
  DONE,
  F_PIN_TO_PRED,
  F_RUN_ON_MAIN,
  HANDLERS,
  NOT_READY,
  packPayloads,
  setDepCount,
  wireDynamicEdges,
  writeTaskMeta,
} from "./sab-scheduler.mjs";

/**
 * @param {import("./scheduler.mjs").Scheduler} scheduler
 * @param {object} o
 * @param {string} o.from        the main-thread task whose submit() this is
 * @param {string} o.prefix      the pieces are `${prefix}:0` ...
 * @param {string} o.handler     the lane handler that runs each piece (HANDLERS)
 * @param {unknown[]} o.payloads one per piece, JSON
 * @param {string[]} [o.after]   tasks each piece waits for besides `from`
 * @param {string} [o.pinTo]     the prefix of an earlier fan-out from the same
 *                               submit: piece i runs on the lane that ran its piece i
 * @param {string[]} [o.joins]   static tasks that wait for every piece
 * @param {string} [o.ganttSection]  the chart's colour for the pieces
 * @param {number} [o.priority]  a lane takes the READY task of highest priority
 * @param {(payload: unknown) => string[]} [o.describe]  lines for the stall report
 * @returns {string[]} the pieces' names
 */
export function fanOut(
  scheduler,
  { from, prefix, handler, payloads, after = [], pinTo = null, joins = [], ganttSection, priority = 0, describe },
) {
  const views = scheduler._views;
  const idMap = scheduler._idMapping;
  const count = payloads.length;
  if (count === 0) return [];
  const handlerIdx = HANDLERS[handler];
  if (handlerIdx == null) throw new Error(`fanOut ${prefix}: unknown handler "${handler}"`);
  const indexOf = (name) => {
    const idx = idMap.nameToIdx.get(name);
    if (idx == null) throw new Error(`fanOut ${prefix}: no task "${name}"`);
    return idx;
  };
  const fromIdx = indexOf(from);
  if (Atomics.load(views.status, fromIdx) === DONE) throw new Error(`fanOut ${prefix}: "${from}" is done already`);

  const base = allocDynamicSlots(views, idMap, count);
  const names = Array.from({ length: count }, (_, i) => `${prefix}:${i}`);

  // Predecessors: `from`, the `after` tasks not yet done, and each piece's pin.
  const waits = [from];
  for (const name of after) {
    const idx = indexOf(name);
    if (Atomics.load(views.status, idx) === DONE) continue;
    const isMain = (Atomics.load(views.flags, idx) & F_RUN_ON_MAIN) !== 0;
    if (!isMain && Atomics.load(views.status, idx) !== NOT_READY) {
      throw new Error(`fanOut ${prefix}: "${name}" is a lane task that may finish before it is wired`);
    }
    waits.push(name);
  }
  const successors = new Map(); // predecessor index -> the pieces it gains
  const gain = (predIdx, idx) => {
    if (!successors.has(predIdx)) successors.set(predIdx, []);
    successors.get(predIdx).push(idx);
  };

  const joinIdxs = joins.map((join) => {
    const idx = indexOf(join);
    const def = scheduler.tasks.get(join);
    if (!def?.expected.includes(from)) {
      throw new Error(`fanOut ${prefix}: join "${join}" must list "${from}" in its expected`);
    }
    if (Atomics.load(views.status, idx) !== NOT_READY) throw new Error(`fanOut ${prefix}: join "${join}" has started`);
    return idx;
  });

  const edges = [];
  for (let i = 0; i < count; i++) {
    const idx = base + i;
    const name = names[i];
    idMap.nameToIdx.set(name, idx);
    idMap.idxToName[idx] = name;
    writeTaskMeta(views, idx, { handlerIdx, priority });

    const expected = [...waits];
    for (const w of waits) gain(indexOf(w), idx);
    if (pinTo) {
      const pin = `${pinTo}:${i}`;
      const pinIdx = indexOf(pin);
      if (Atomics.load(views.status, pinIdx) !== NOT_READY) {
        throw new Error(`fanOut ${prefix}: "${pin}" has started; pin only to a fan-out of the same submit`);
      }
      expected.push(pin);
      gain(pinIdx, idx);
      Atomics.store(views.pinnedTo, idx, pinIdx);
      Atomics.or(views.flags, idx, F_PIN_TO_PRED);
    }
    setDepCount(views, idx, expected.length);
    edges.push({ from: idx, to: joinIdxs });

    const payload = payloads[i];
    scheduler.tasks.set(name, {
      expected,
      consolidate: true,
      ganttSection,
      describe: describe ? () => describe(payload) : undefined,
      submit() {},
    });
  }
  wireDynamicEdges(views, edges);
  appendDynamicSuccessors(
    views,
    [...successors].map(([predIdx, to]) => ({ from: predIdx, to })),
  );

  for (const join of joins) {
    const def = scheduler.tasks.get(join);
    scheduler.tasks.set(join, { ...def, expected: [...def.expected, ...names] });
    Atomics.add(views.depCount, indexOf(join), count);
  }

  scheduler.addDynamicTasks(count);
  scheduler.pool.broadcastTaskData(`fan:${base}:${count}`, packPayloads(views, base, payloads));
  return names;
}
