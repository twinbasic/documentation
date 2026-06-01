# SAB-based worker-pull scheduler

Replaces the current push-based scheduler (main thread decides what's
ready, dispatches to workers via `pool.run()`) with a pull-based
model where workers resolve dependencies themselves via
SharedArrayBuffer atomics and claim the next task immediately after
completing one --- no main-thread round-trip for worker-to-worker
transitions.

## Problem

The scheduler runs on the main thread. When a `runOnMain` task's
`execute()` is running (e.g. `discover` at ~135 ms), the event loop is
blocked. Worker completion messages queue; no new tasks are dispatched
until the main-thread work finishes. On a 16-core machine, the idle
time across all threads sums to ~1 s --- significant against a <2 s
build. Worse on CI (4 threads) because fewer workers share the same
blocking windows.

## Solution

Put the mutable scheduling state (dependency counts, task status) in a
SharedArrayBuffer visible to all threads. Workers update dep counts and
claim ready tasks via `Atomics` operations. The main thread only
participates for `runOnMain` tasks and output merges into `SharedState`.

Three new scheduling primitives handle the warmup case and
future worker-affinity needs:

1. **`on_demand`** --- a seed task (no prerequisites) that is NOT
   started at build start. It is triggered only when a dependent task
   would otherwise be ready to run. Applies to both worker and
   main-thread tasks.

2. **`unique_per_worker`** --- instead of one global "done" flag, the
   task has a done flag per worker lane. From worker W's perspective,
   the task is done iff lane W's instance ran. Only applies to worker
   tasks.

3. **`pin_to_predecessor`** --- the task must run on the same worker
   lane that ran a named predecessor. Applies to worker tasks.

4. **`run_when_idle`** --- when a worker has no claimable tasks and
   would otherwise sleep, it speculatively executes this task. This
   is distinct from `on_demand` (triggered by a dependent) --- it is
   triggered by worker idleness. The primary use case is overlapping
   `warmInit` with the main-thread spine: workers finish their seed
   tasks (scss, buildInfo) well before render chunks appear, and
   would otherwise sit idle. With `run_when_idle`, they warm up
   during that dead time. Applies to worker tasks.

### warmInit under the new model

`warmInit` is declared as an explicit task with both `unique_per_worker`
and `on_demand`. All `render` chunks list it as a per-worker dependency.
This replaces the current ad-hoc mechanism: the two-tier idle queue
(`_idleWarm` / `_idleCold`), the `warmup()` call in `scheduler.start()`,
the `deferHighlighter` flag on task defs, the `warmedUp` message
protocol, and the conditional `ensureHighlighterInit()` calls in
`cpu-worker.mjs`.

## SAB memory layout

A single SharedArrayBuffer allocated by the main thread before the
build starts. All arrays are Int32 for `Atomics` compatibility.

```
Constants:
  MAX_TASKS  = 256    // static tasks + max dynamic tasks (render chunks + renderJoin)
  MAX_LANES  = 64     // max worker threads
  MAX_EDGES  = 512    // total successor edges across all tasks

Status values:
  NOT_READY  = 0
  READY      = 1
  CLAIMED    = 2
  DONE       = 3

Flag bits:
  F_ON_DEMAND        = 1
  F_UNIQUE_PER_WORKER = 2
  F_RUN_ON_MAIN      = 4
  F_PIN_TO_PRED      = 8
  F_RUN_WHEN_IDLE    = 16

Arrays (all Int32Array views into the SAB):
  taskCount                                  // [1]  — current number of registered tasks (atomic)
  depCount    [MAX_TASKS]                    // remaining normal predecessor count per task
  status      [MAX_TASKS]                    // NOT_READY | READY | CLAIMED | DONE
  flags       [MAX_TASKS]                    // bitmask of F_* constants
  succOffset  [MAX_TASKS]                    // index into succList where this task's successors start
  succCount   [MAX_TASKS]                    // number of successors for this task
  succList    [MAX_EDGES]                    // flat array of successor task indices
  affinityLane[MAX_TASKS]                    // -1 = any worker, 0..N-1 = pinned to this lane
  pinnedTo    [MAX_TASKS]                    // -1 = no pin, else = predecessor task index whose lane to inherit
  completedOnLane[MAX_TASKS]                 // which lane completed this task (-1 = not done / ran on main)
  perWorkerDone[MAX_TASKS * MAX_LANES]       // 0 = not done, 1 = done (for unique_per_worker tasks)
  edgeCount                                  // [1]  — current successor edge count (for dynamic append)
  notify                                     // [1]  — generation counter for worker wakeup (see §Notify protocol)
  firstReady                                 // [1]  — low-water mark: all tasks below this index are DONE (optimization)
  buildDone                                  // [1]  — 0 = running, 1 = done, 2 = error (workers check and exit)
  chunkOffset [MAX_RENDER_CHUNKS]            // byte offset into chunkDataSAB for render chunk i
  chunkLength [MAX_RENDER_CHUNKS]            // byte length of render chunk i's JSON in chunkDataSAB
```

  MAX_RENDER_CHUNKS = MAX_LANES * 10  // SLICES_PER_WORKER = 10

Total size: `(MAX_TASKS * 9 + MAX_EDGES + MAX_TASKS * MAX_LANES
+ MAX_RENDER_CHUNKS * 2 + 6) * 4` bytes.
With the defaults above: ~73 KB. Negligible.

### Task ID mapping

The SAB uses integer indices. A bidirectional mapping (name -> index,
index -> name) is built at startup for static tasks and extended by
`dispatch` for dynamic tasks.

Static tasks get indices 0..N-1 in definition order. Dynamic task
slots (render chunks + renderJoin) are pre-reserved starting at index
`DYNAMIC_BASE`. The maximum number of render chunks is known:
`workerCount * SLICES_PER_WORKER` (currently 10 slices/worker).
`renderJoin` gets the slot after the last possible render chunk.

### Graph metadata (init message to workers)

The SAB encodes mutable scheduling state (dep counts, status, flags).
Immutable graph structure that workers also need is sent once at build
start via a `postMessage` init message. This includes:

- **`taskMeta[]`** --- per-task-index metadata array:
  - `handler`: string name of the worker handler function to call
    (e.g. `"render"`, `"scssLight"`, `"warmInit"`). Workers use this
    to look up the right function after claiming a task by index.
  - `perWorkerDeps`: array of task indices that are
    `unique_per_worker` dependencies. Empty for most tasks; render
    chunks have `[renderEnvInitIdx]`. Workers check these after
    claiming.
  - `expectedIdxs`: array of predecessor task indices used as
    preconditions for `unique_per_worker` tasks (Phase 10). Workers
    verify each predecessor is DONE before executing the per-worker
    instance. Empty for tasks without predecessors (e.g. `warmInit`);
    `renderEnvInit` has `[dispatchIdx]`.
  - `name`: string task name (for timing / error messages).

- **`ctx`** --- the build context (`{ srcRoot, destRoot, opts,
  workerCount }`). Small, immutable within a build. Workers cache it
  and use it for seed handlers (`buildInfo`, `scssLight`, `scssDark`,
  `mermaid`).

- **`sabRef`** --- the scheduling SharedArrayBuffer itself.

- **`idMapping`** --- task name to index and index to name maps
  (for debug logging; not needed for the hot path).

The init message is sent once per build. In serve mode, each rebuild
sends a fresh init message with a new SAB and ctx. Workers detect
the new init message, switch to the new SAB, reset their cached
`chunkDataSAB` / `renderEnv`, and re-enter the pull loop.

Dynamic task registration (`dispatch` creating `render:i` tasks)
extends the metadata: `dispatch.submit()` broadcasts an update
message with the new task entries' metadata (handler names,
perWorkerDeps) for the dynamically-registered index range. Workers
merge this into their local `taskMeta` array. This arrives before
the render tasks become READY in the SAB (dispatch sets their status
to READY after broadcasting).

## Task definition format

Existing fields (`expected`, `handler`, `runOnMain`, `execute`,
`submit`) are retained. New fields:

```js
warmInit: {
  expected: [],
  on_demand: true,          // not started until a dependent needs it
  unique_per_worker: true,  // one instance per worker lane
  run_when_idle: true,      // speculatively run when worker has no other work
  handler: "warmInit",
  // No submit --- unique_per_worker tasks don't participate in the
  // normal dependency graph.
},

'render:0': {
  expected: ["dispatch"],   // normal dep (dispatch must complete)
  perWorkerDeps: ["warmInit"],  // checked at claim time, per-lane
  handler: "render",
  // ...
},

someTask: {
  expected: ["priorTask"],
  pin_to_predecessor: "priorTask",  // must run on priorTask's worker lane
  handler: "someHandler",
  // ...
},
```

### `submit()` split

`submit()` currently does two things: (a) signal dependency completion
via `emit()`, and (b) mutate `SharedState`. Under the new model:

- **(a) Dependency signaling** moves to the SAB. The completing thread
  (worker or main) atomically decrements successor dep counts. This
  is encoded in the SAB's successor adjacency list, not in `submit()`.

- **(b) State mutation** stays in `submit()`, which runs on the main
  thread as before. Worker tasks fire-and-forget their output via
  `postMessage`; the main thread runs `submit()` to merge the output
  into `SharedState` when it processes the message.

The ordering constraint: a worker posts the output message BEFORE
updating successor dep counts in the SAB. Since worker-to-main
messages are FIFO, the merge message arrives before the main thread
would claim any downstream `runOnMain` task. The main thread drains
all pending messages before scanning the SAB for ready main-thread
tasks, ensuring merges complete first.

For **worker-to-worker chains** (e.g. render:i -> renderJoin where
renderJoin is a trivial barrier), the successor dep count update
happens directly in the SAB with no main-thread involvement. If
`render:i.submit()` has state mutations (merging page deltas), the
merge message is fire-and-forget --- it doesn't gate the next worker
task because the downstream workers don't read `SharedState`.

### How submit() is triggered

Worker tasks: the main thread's message handler calls `submit()`
when it processes the output message. This is asynchronous relative
to the worker's progress (the worker has already moved on to its next
task via SAB).

Main-thread tasks: `submit()` is called inline after `execute()`
completes, as today.

## Worker pull loop

Each worker runs a persistent loop after receiving the SAB and graph
metadata at startup:

```
function pullLoop(sab, views, myLane, handlers, graphMeta):
  loop:
    if Atomics.load(views.buildDone, 0) !== 0: return

    taskIdx = scanAndClaim(views, myLane)
    if taskIdx === -1:
      gen = Atomics.load(views.notify, 0)
      // Double-check after reading gen — a task may have become READY
      // between our scan and this load.
      taskIdx = scanAndClaim(views, myLane)
      if taskIdx === -1:
        Atomics.wait(views.notify, 0, gen, 50)  // sleep until gen changes, 50ms fallback
        continue

    // Check per-worker deps (unique_per_worker)
    unsatisfied = null
    for each perWorkerDep D of graphMeta[taskIdx]:
      if Atomics.load(views.perWorkerDone, D * MAX_LANES + myLane) === 0:
        unsatisfied = D
        break

    if unsatisfied !== null:
      if flags[unsatisfied] & F_ON_DEMAND && !(flags[unsatisfied] & F_RUN_ON_MAIN):
        // On-demand worker dep (e.g. warmInit): per-worker, no contention.
        // Release the original task BEFORE executing the dep.
        Atomics.store(views.status, taskIdx, READY)
        Atomics.add(views.notify, 0, 1)
        Atomics.notify(views.notify, 0, 1)       // wake one worker for the released task

        execute handlers[unsatisfied]
        Atomics.store(views.perWorkerDone, unsatisfied * MAX_LANES + myLane, 1)
        continue  // re-enter pull loop; may reclaim original task or get a different one

      if flags[unsatisfied] & F_ON_DEMAND && flags[unsatisfied] & F_RUN_ON_MAIN:
        // On-demand main-thread dep: trigger it, release our task, wait.
        Atomics.store(views.status, unsatisfied, READY)
        postMessage({ triggerMainTask: unsatisfied })
        Atomics.store(views.status, taskIdx, READY)
        Atomics.add(views.notify, 0, 1)
        Atomics.notify(views.notify, 0, 1)       // wake one worker for the released task

        // Check for other non-dependent work before sleeping
        altTask = scanAndClaim(views, myLane)     // may find unrelated work
        if altTask !== -1:
          // ... execute altTask (same path as below) ...
        else:
          // Wait on the dep's status slot rather than spinning claim-release cycles
          Atomics.wait(views.status, unsatisfied, READY)
        continue  // re-enter pull loop

      // unique_per_worker without on_demand: should already be done
      // (was started eagerly). Spin-wait.
      Atomics.store(views.status, taskIdx, READY)
      Atomics.add(views.notify, 0, 1)
      Atomics.notify(views.notify, 0, 1)
      waitForPerWorkerDone(views, unsatisfied, myLane)
      continue

    // All deps satisfied --- execute
    result = await handlers[graphMeta[taskIdx].handler](taskPayload)
    postMessage({ done: taskIdx, output: result })    // fire-and-forget
    onTaskDone(views, taskIdx, myLane, graphMeta)
```

### scanAndClaim

```
function scanAndClaim(views, myLane):
  start = Atomics.load(views.firstReady, 0)
  count = Atomics.load(views.taskCount, 0)
  for i = start to count - 1:
    if Atomics.load(views.status, i) !== READY: continue
    if Atomics.load(views.flags, i) & F_RUN_ON_MAIN: continue
    aff = Atomics.load(views.affinityLane, i)
    if aff !== -1 && aff !== myLane: continue
    if Atomics.compareExchange(views.status, i, READY, CLAIMED) === READY:
      return i
  return -1
```

### onTaskDone (successor dep count update)

```
function onTaskDone(views, taskIdx, lane, graphMeta):
  Atomics.store(views.status, taskIdx, DONE)
  Atomics.store(views.completedOnLane, taskIdx, lane)
  advanceFirstReady(views, taskIdx)

  readyCount = 0
  wakeMain   = false

  off   = Atomics.load(views.succOffset, taskIdx)
  count = Atomics.load(views.succCount, taskIdx)
  for i = off to off + count - 1:
    succ = Atomics.load(views.succList, i)

    // Skip unique_per_worker successors (not tracked via depCount)
    if Atomics.load(views.flags, succ) & F_UNIQUE_PER_WORKER: continue

    remaining = Atomics.sub(views.depCount, succ, 1) - 1
    if remaining === 0:
      // Set affinity if successor is pinned
      pin = Atomics.load(views.pinnedTo, succ)
      if pin !== -1:
        srcLane = Atomics.load(views.completedOnLane, pin)
        Atomics.store(views.affinityLane, succ, srcLane)

      Atomics.store(views.status, succ, READY)

      if Atomics.load(views.flags, succ) & F_RUN_ON_MAIN:
        wakeMain = true
      else:
        readyCount++

  // Bump generation counter and wake the right number of workers
  if readyCount > 0:
    Atomics.add(views.notify, 0, 1)
    Atomics.notify(views.notify, 0, readyCount)
  if wakeMain:
    postMessage({ mainTaskReady: true })
```

### advanceFirstReady

`firstReady` is a low-water mark: all task indices below it are DONE.
It only advances forward (monotonic). After any task transitions to
DONE, the completing thread tries to advance past consecutive DONE
tasks starting from the current value:

```
function advanceFirstReady(views, taskIdx):
  count = Atomics.load(views.taskCount, 0)
  cur   = Atomics.load(views.firstReady, 0)
  if taskIdx !== cur: return                  // not at the frontier; nothing to advance
  next = cur
  while next < count && Atomics.load(views.status, next) === DONE:
    next++
  if next > cur:
    Atomics.compareExchange(views.firstReady, 0, cur, next)
    // CAS may fail if another thread advanced it further; that's fine.
```

This is a best-effort optimization. The CAS failure case is harmless
--- the competing thread advanced the pointer at least as far, so no
scan work is wasted. The scan is already microseconds, so this avoids
re-checking the early spine tasks (config, discover, nav, ...) once
they've completed and the build is in the render fan-out or write
phase.

### Anti-thundering-herd for on-demand main-thread deps

When a worker discovers an unsatisfied on-demand main-thread dep, it:

1. Claims the dep (CAS on its status, or just sets it READY if it's
   on_demand + not yet triggered --- first writer wins since
   READY is idempotent)
2. Releases its original task back to READY
3. **Waits on the dep's status slot** (`Atomics.wait(status, depIdx, ...)`)
   rather than re-entering the scan loop

This prevents N workers from cycling through claim-release on render
chunks while the main thread runs the dep. When the dep completes
(main thread sets its status to DONE + notifies), all waiting workers
wake and re-scan productively.

Workers first check if other non-dependent work is available before
waiting. The check is cheap (one scan of the status array) and avoids
unnecessary sleeping when there's useful work to do.

## Main thread protocol

The main thread is event-loop driven. It does NOT spin or use
`Atomics.wait` (which would block the event loop). Instead:

### Input accumulation (results map)

Main-thread tasks receive an `inputs` object keyed by predecessor
name: `{ predecessor1: output1, predecessor2: output2, ... }`. Under
the current push scheduler, `emit()` accumulates these in a
`pending.received` map. Under the SAB model, dependency *counting*
moves to the SAB, but the actual *data* still flows through the main
thread.

The main thread maintains a `results` map:
`Map<taskIndex, output>`. Every task's output is stored here ---
both worker tasks (when the `{ done, output }` message is processed)
and main-thread tasks (inline after execute). When a main-thread
task becomes READY and the main thread claims it, it assembles the
inputs:

```
function assembleInputs(taskIdx, taskDef, results, idMapping):
  inputs = {}
  for predName of taskDef.expected:
    predIdx = idMapping.nameToIdx[predName]
    inputs[predName] = results.get(predIdx)
  return inputs
```

This is simpler than the current `pending` machinery --- no received
counting, no emit routing. The SAB dep count handles "when is it
ready"; the results map handles "what data does it get."

Worker tasks do NOT read from the results map. They get their inputs
from the SAB (chunk data, shared payload) or from `ctx`. The results
map is main-thread-only.

### Message handler

```
worker.on('message', msg => {
  if (msg.done != null) {
    // Store output for downstream main-thread tasks' input assembly
    results.set(msg.done, msg.output)
    // Run submit() to merge into SharedState
    taskDef = tasks[msg.done]
    taskDef.submit(msg.output, state)
  }
  if (msg.mainTaskReady != null || msg.triggerMainTask != null) {
    scheduleMainScan()
  }
})
```

`scheduleMainScan()` uses `queueMicrotask()` (coalesced --- skip if
already scheduled) so all pending messages are processed (output
stored + merges complete) before the scan runs.

### Main-thread task execution

```
function mainScan():
  start = Atomics.load(views.firstReady, 0)
  count = Atomics.load(views.taskCount, 0)
  for i = start to count - 1:
    if Atomics.load(views.status, i) !== READY: continue
    if !(Atomics.load(views.flags, i) & F_RUN_ON_MAIN): continue
    if Atomics.compareExchange(views.status, i, READY, CLAIMED) !== READY: continue

    // Check on-demand deps (main-thread on_demand deps are global, not per-worker)
    unsatisfied = checkOnDemandDeps(i)
    if unsatisfied !== null:
      // Run the on-demand dep inline (single-threaded, no concurrency concern)
      output = await executeMainTask(unsatisfied)
      results.set(unsatisfied, output)
      Atomics.store(views.status, unsatisfied, DONE)
      advanceFirstReady(views, unsatisfied)
      Atomics.notify(views.status, unsatisfied)  // wake waiting workers

    inputs = assembleInputs(i, taskDef, results, idMapping)
    output = await taskDef.execute(inputs, ctx, state)
    results.set(i, output)
    Atomics.store(views.status, i, DONE)
    taskDef.submit(output, state)  // mutate SharedState
    onTaskDone(views, i, -1, graphMeta)  // -1 = main thread lane

    // Re-scan: the task we just completed may have made more main tasks ready
    scheduleMainScan()
    return
```

### Draining messages before scanning

The main thread processes worker messages in the event loop's message
handler. `scheduleMainScan()` posts a microtask. Since microtasks run
after the current handler but before the next event, and multiple
worker messages in the same event-loop tick are processed sequentially,
all pending merges complete before the scan.

If messages arrive while a `runOnMain` execute() is in progress, they
queue until execute() yields (await) or completes. This is the
irreducible cost of main-thread tasks --- same as today, but worker-
to-worker transitions no longer pay it.

## Dynamic task registration (dispatch)

`dispatch` runs on the main thread. After computing chunks:

1. Write render:i task entries into pre-reserved SAB slots:
   - `depCount[slot]` = 0 (render chunks are seeded directly)
   - `flags[slot]` = 0 (worker task, not on_demand/unique_per_worker)
   - `perWorkerDeps` metadata = `[warmInitIdx]`
   - successor entries pointing to `renderJoinIdx`

2. Write renderJoin entry:
   - `depCount[renderJoinIdx]` = N (one per render chunk)
   - `flags[renderJoinIdx]` = F_RUN_ON_MAIN
   - successor entries to write, writePdf, searchData

3. Append successor edges for render:i -> renderJoin to `succList`.

4. Update `Atomics.store(views.taskCount, 0, newCount)`.

5. Set each render:i's status to READY and notify workers.

Workers that are waiting (Atomics.wait) wake up and see the new
render tasks.

### Task inputs for render chunks

The render chunks need their page data (the chunk array + the shared
SAB broadcast payload). The approach: extend the existing
`sab-broadcast.mjs` pattern.

After `dispatch` creates chunks on the main thread:

1. JSON-serialize each chunk, concatenate the byte arrays into one
   buffer.
2. Pack into a single `chunkDataSAB` (SharedArrayBuffer).
3. Write offset/length per chunk into the scheduling SAB's
   `chunkOffset` / `chunkLength` arrays.
4. Broadcast `{ chunkDataSAB }` to all workers in a single
   postMessage (the SAB is a shared reference, not cloned).

Workers store the `chunkDataSAB` reference when they receive the
message. When a worker claims `render:i`, it reads
`chunkOffset[i]` / `chunkLength[i]` from the scheduling SAB and
deserializes its slice from `chunkDataSAB`. Same cost as today's
structured clone per chunk, but without the main thread serializing
N copies and without blocking on per-worker postMessage delivery.

The existing shared payload SAB (site data, initData, link tables)
is packed separately by `dispatch` as today and included in the same
broadcast message.

Workers that are busy with non-render work (scss, buildInfo) when the
broadcast arrives queue the message and read it when they first claim
a render chunk.

### Task inputs for non-render worker tasks

`buildInfo`, `scssLight`, `scssDark`, and `mermaid` need `ctx`
(mainly `ctx.srcRoot`). The `ctx` object is small and immutable
within a build. It is sent once at build start alongside the
scheduling SAB as part of the init message. Workers cache it.

In serve mode, a fresh `ctx` is sent with each rebuild's new SAB.

## Build start sequence

Step-by-step from `runBuild()` entry to the first task executing:

1. **Allocate the scheduling SAB.** `allocSchedulerSAB(TASKS,
   workerCount)` reads the task definitions, assigns integer indices,
   computes the successor adjacency list, and writes all static
   fields (depCount, flags, succOffset/succCount/succList, pinnedTo,
   affinityLane initialized to -1, completedOnLane initialized to -1,
   perWorkerDone zeroed, firstReady = 0, notify = 0, buildDone = 0).
   Returns `{ sab, views, idMapping, taskMeta }`.

   Seed tasks (expected.length === 0 AND NOT on_demand) have their
   status set to READY. All others are NOT_READY. On-demand seeds
   stay NOT_READY until triggered.

2. **Construct or reuse the worker pool.** In `runBuild()`, the pool
   is created fresh (and destroyed after the build). In serve mode,
   the pool persists and is reused.

3. **Post init message to all workers.** Each worker receives:
   ```
   { init: true, sab, taskMeta, ctx, idMapping }
   ```
   Workers store these, create Int32Array views over the SAB, and
   enter the pull loop. Workers that were sleeping from a previous
   build (serve mode) receive this as a regular message, detect the
   `init` flag, switch to the new SAB, reset cached state
   (`chunkDataSAB`, `renderEnv`), and re-enter the pull loop.

4. **Main thread enters its scan loop.** `scheduleMainScan()` is
   called once to kick off the first scan. Seed `runOnMain` tasks
   (e.g. `config`) are already READY in the SAB, so the first
   `mainScan()` claims and executes them.

5. **Workers wake and scan.** Workers see seed worker tasks
   (`buildInfo`, `scssLight`, `scssDark`, optionally `mermaid`) as
   READY in the SAB and claim them.

6. **Build proceeds.** Workers and main thread independently claim
   and execute tasks via the SAB. Worker outputs flow to the main
   thread as fire-and-forget messages. The main thread merges,
   accumulates results, and claims main-thread tasks as they become
   ready.

7. **Dispatch phase.** When `dispatch` (runOnMain) executes, it:
   - Computes render chunks and builds the chunkDataSAB + sharedSAB.
   - Writes dynamic task entries (render:i, renderJoin) into the
     pre-reserved SAB slots.
   - Broadcasts `{ renderData: true, chunkDataSAB, sharedSAB,
     taskMeta: [...new entries...] }` to all workers.
   - Sets render:i status to READY and bumps the notify generation
     counter: `Atomics.add(views.notify, 0, 1)` +
     `Atomics.notify(views.notify, 0, Infinity)`.
   - Workers wake, merge the new taskMeta entries, store the
     chunkDataSAB, and claim render chunks.

8. **Completion.** The main thread detects all tasks DONE (or
   untriggered on_demand). Sets `buildDone = 1` in the SAB, notifies
   all workers. Workers exit the pull loop. `runBuild()` resolves.

## What gets removed

| Current code | Replacement |
|---|---|
| `WorkerPool._idleWarm` / `_idleCold` / `_warm` | Workers are equal; warmth is emergent |
| `WorkerPool._onWarmedUp()` | No warm/cold distinction |
| `WorkerPool._drain()` + `_queue` | Workers pull from SAB; no push queue |
| `WorkerPool.warmup()` | `warmInit` task (on_demand + unique_per_worker) |
| `WorkerPool.run()` for worker tasks | Workers self-schedule; main-thread tasks still use a thin dispatch |
| `Scheduler._flush()` / `_run()` push logic | SAB atomics |
| `Scheduler.pending` / `ready` / `emit()` | SAB depCount + status |
| `deferHighlighter` flag on task defs | Gone; warmInit is explicit |
| `ensureHighlighterInit()` in cpu-worker.mjs | `warmInit` handler |
| `warmedUp` / `warmBoot` message protocol | Gone |
| `warmup: true` message handling | Gone |

`WorkerPool` reduces to a lifecycle manager: spawn workers at
construction, send them the SAB + metadata, terminate on destroy.
The message forwarding (output merges, main-task signals) remains.

## Serve mode

The pool persists across rebuilds. Per rebuild:

1. Main thread allocates a new scheduling SAB (new dep counts, fresh
   status array).
2. Main thread posts the new SAB to all workers as a "new build"
   message.
3. Workers switch to the new SAB and enter the pull loop.
4. Build completes (main thread detects: all tasks DONE, no pending
   work).
5. Workers go idle (`Atomics.wait` on the status array --- nothing
   is READY).

On the next rebuild, step 2 wakes all workers (they're waiting) and
they switch to the fresh SAB.

The `chunkDataSAB` from the previous build is garbage-collected once
no worker holds a reference.

## Completion detection

The build is complete when:

- All tasks have status DONE (or are unreachable --- e.g. on_demand
  tasks that were never triggered).
- No worker is executing (all are in Atomics.wait or have exited
  the pull loop).

The main thread tracks this by counting: every time a task transitions
to DONE, increment a `doneCount` atomic. When `doneCount` equals the
number of non-on_demand tasks plus the number of triggered on_demand
tasks, the build is done.

Simpler approach: the main thread's `mainScan()` checks after each
task completion whether any tasks remain (status != DONE, excluding
untriggered on_demand). When none remain, resolve the build promise.

Workers are notified of build completion via a `buildDone` atomic in
the SAB. Workers check this in their pull loop and exit cleanly.

## Error handling

### Worker task failure

Worker catches the error in its handler, posts
`{ error: taskIdx, message, stack }` to the main thread, and sets
the task's SAB status to a new `FAILED` state (value 4). The main
thread's error handler rejects the build promise (same as today's
`_onError`). All other workers see `FAILED` when scanning and skip
the task.

Workers do NOT abort on a sibling's failure --- they continue
processing ready tasks until the main thread signals build abort
via the `buildDone` atomic (set to an error sentinel). Workers
check `buildDone` in their pull loop and exit.

### Main-thread task failure

Same as today: the main thread catches the error in `execute()`,
rejects the build promise, and signals workers to stop via
`buildDone`.

### Worker crash

Same as today: the crashed worker is not respawned; the pool
degrades. The worker's in-progress task stays CLAIMED forever
(no successor dep counts are decremented). The main thread
detects a stalled build via a timeout or the worker's `exit` event,
and aborts.

## Timing / instrumentation

Workers post timing data alongside their output:
`{ done: taskIdx, output, timing: { start, end } }`. The main
thread collects these into the existing `timings` map. The summary
and Gantt chart code are unchanged.

For `unique_per_worker` tasks (`warmInit`), each worker posts its own
timing. The summary consolidates these per-lane, same as render chunks.

## Migration phases

### Current state (phases 0--4 are done)

Phases 0--4 from [PLAN-scheduler.md](PLAN-scheduler.md) are fully
implemented. The codebase already has:

- `builder/scheduler.mjs` --- push-based `Scheduler` class with
  `SharedState`, `pending`/`ready` maps, `_flush()`/`_run()` dispatch.
- `builder/worker-pool.mjs` --- `WorkerPool` with two-tier idle queue
  (`_idleWarm` / `_idleCold`), `warmup()`, `run()` push dispatch.
- `builder/cpu-worker.mjs` --- worker harness with `parentPort`
  message loop, `ensureHighlighterInit()`, `getOrInitRenderEnv()`,
  named handlers (`scssLight`, `scssDark`, `mermaid`, `buildInfo`,
  `render`).
- `builder/sab-broadcast.mjs` --- `packShared()` / `unpackShared()`
  for the render fan-out's shared payload SAB.
- `builder/tbdocs.mjs` --- full task DAG (`TASKS` object) with all
  static and dynamic task definitions, `dispatch.submit()` dynamic
  registration of `render:i` + `renderJoin`, Gantt chart instrumentation.
- `builder/serve.mjs` --- dev server reusing the pool across rebuilds.

The build runs end-to-end through the push scheduler with worker
fan-out. `build.bat && check.bat` is clean at baseline.

The phases below (5--8) replace the push scheduler internals with
the SAB-based pull model while preserving the task definitions,
handler functions, and external behavior.

### Phase 5: SAB scheduler skeleton

**Files:** new `builder/sab-scheduler.mjs`, modifications to
`scheduler.mjs`, `worker-pool.mjs`, `cpu-worker.mjs`.

1. Define SAB constants (`MAX_TASKS`, `MAX_LANES`, `MAX_EDGES`,
   `MAX_RENDER_CHUNKS`, status values, flag bits), byte-offset
   calculations, and a `createViews(sab)` helper that returns an
   object of named Int32Array views over the SAB.

2. Add `allocSchedulerSAB(taskDefs, workerCount)`:
   - Assigns integer indices to each static task (definition order).
   - Pre-reserves `DYNAMIC_BASE` through
     `DYNAMIC_BASE + MAX_RENDER_CHUNKS` for render chunks, plus one
     slot for `renderJoin`.
   - Builds the successor adjacency list from `taskDef.expected`
     (inverting predecessor lists to successor lists).
   - Writes depCount, flags (from `runOnMain`, `on_demand`,
     `unique_per_worker`, `pin_to_predecessor`), succOffset/succCount/
     succList, pinnedTo, affinityLane (-1), completedOnLane (-1).
   - Sets seed tasks' status to READY (except on_demand seeds).
   - Returns `{ sab, views, idMapping, taskMeta }`.

3. `idMapping` contains:
   - `nameToIdx`: `Map<string, number>` (task name -> SAB index).
   - `idxToName`: `string[]` (SAB index -> task name).
   - `DYNAMIC_BASE`, `RENDER_JOIN_IDX`: constants for dispatch.

4. `taskMeta` is a plain array indexed by task index:
   - `taskMeta[i].handler`: handler function name (string).
   - `taskMeta[i].perWorkerDeps`: array of task indices (for
     unique_per_worker deps). Empty for most tasks.
   - `taskMeta[i].expectedIdxs`: array of predecessor task indices
     (for precondition checking on unique_per_worker tasks with
     `expected` predecessors, Phase 10). Empty for most tasks.
     Populated by mapping `def.expected` names through `nameToIdx`.
   - `taskMeta[i].name`: task name (for debug/timing).

5. Add the `warmInit` task definition to `TASKS` in `tbdocs.mjs`:
   ```js
   warmInit: {
     expected: [],
     on_demand: true,
     unique_per_worker: true,
     handler: "warmInit",
     submit() {},
   },
   ```
   No runtime behavior change yet --- the push scheduler ignores the
   new flags and the warmInit handler is not wired up.

6. No runtime behavior change. The existing push scheduler still
   runs. This phase adds data structures only.

**Verification:** assert at build time that the SAB encodes the
expected dep counts and successor edges for the static task graph.
`build.bat && check.bat` clean; output unchanged.

### Phase 6: Worker pull loop

**This is the critical phase.** Worker-to-worker transitions move
to the SAB. Main-thread tasks still run via the existing push
scheduler, bridged into the SAB.

1. **Init message handling.** `WorkerPool` sends `{ init: true, sab,
   taskMeta, ctx, idMapping }` to each worker after construction (or
   after each rebuild in serve mode). Workers store these and create
   SAB views.

2. **Handler table.** `cpu-worker.mjs` keeps its existing named
   handlers (`scssLight`, `scssDark`, `mermaid`, `buildInfo`,
   `render`) and adds `warmInit`:
   ```js
   async warmInit() {
     const start = Date.now();
     const highlighter = await (await import("./highlight.mjs")).initHighlighter();
     return { warmInit: true, timing: { start, end: Date.now() } };
   }
   ```
   The pull loop looks up the handler by name:
   `handlers[taskMeta[taskIdx].handler]`.

3. **Pull loop.** Replace the `parentPort.on('message')` dispatch
   with the persistent pull loop (§Worker pull loop pseudocode).
   The message handler is retained only for:
   - `{ init }` --- switch to new SAB + metadata.
   - `{ renderData, chunkDataSAB, sharedSAB, taskMeta }` --- store
     chunk data and merge new taskMeta entries from dispatch.

4. **Output posting.** After executing a task, the worker posts:
   ```
   { done: taskIdx, output: result, timing: { start, end } }
   ```
   Then calls `onTaskDone()` to update the SAB. The `postMessage`
   happens BEFORE the SAB update (ordering constraint from §submit()
   split).

5. **Bridge: main thread updates SAB after its tasks.** The existing
   push scheduler's `_onDone()` is extended: after running `submit()`
   and `emit()` as today, it also calls `onTaskDone(views, taskIdx,
   -1, graphMeta)` to decrement successor dep counts in the SAB and
   set newly-ready tasks to READY. This lets workers see downstream
   tasks become ready immediately after a main-thread task completes,
   without waiting for the push scheduler's `_flush()`.

   The push scheduler's `_flush()` / `_run()` still handles
   main-thread tasks. Worker tasks are no longer dispatched through
   `pool.run()` --- they're pulled from the SAB.

6. **warmInit replaces ensureHighlighterInit().** The `warmInit`
   handler does the same work (dynamic import of highlight.mjs +
   initHighlighter). The on-demand + unique_per_worker flags ensure
   it runs once per lane, only when needed. The `deferHighlighter`
   flag and `ensureHighlighterInit()` calls are removed.

**Verification:** `build.bat && check.bat` clean. Timing summary
shows render chunks starting without main-thread gaps. `warmInit`
appears in per-lane timing (consolidated like render chunks).

### Phase 7: Main-thread SAB integration

Replace the push scheduler's main-thread dispatch with SAB-based
claiming. The `Scheduler` class is rewritten.

1. **`results` map.** The scheduler maintains
   `results: Map<taskIndex, output>`. Populated in two places:
   - Worker output messages: `results.set(msg.done, msg.output)`.
   - Main-thread task completion: `results.set(idx, output)` inline.

2. **`assembleInputs()`.** Before executing a `runOnMain` task, the
   scheduler reads the task definition's `expected` array, maps each
   predecessor name to its index via `idMapping`, looks up the output
   in `results`, and builds the `inputs` object:
   ```js
   function assembleInputs(taskIdx, taskDef, results, idMapping) {
     const inputs = {};
     for (const predName of taskDef.expected) {
       const predIdx = idMapping.nameToIdx.get(predName);
       inputs[predName] = results.get(predIdx);
     }
     return inputs;
   }
   ```
   This replaces the current `pending.received` accumulation and
   `emit()` routing.

3. **`mainScan()`.** Replaces `_flush()` / `_run()`. Scans the SAB
   for READY + F_RUN_ON_MAIN tasks, claims via CAS, assembles inputs,
   executes, runs `submit()`, calls `onTaskDone()` to update successor
   dep counts. See §Main-thread task execution pseudocode.

4. **Message handler.** Replaces the pool's completion callback.
   Processes `{ done, output }` (store + submit), `{ mainTaskReady }`
   and `{ triggerMainTask }` (schedule scan), `{ error }` (abort).
   Uses `queueMicrotask` coalescing so all pending messages drain
   before scanning.

5. **Completion detection.** After each `onTaskDone()` call from the
   main thread, check: scan the SAB for any task that is not DONE
   and not an untriggered on_demand task. If none remain, set
   `buildDone = 1`, notify all workers, resolve the build promise.

6. **Remove push machinery.** Delete `Scheduler.pending`, `ready`,
   `emit()`, `_flush()`, `_run()`, `seed()`, `register()`.
   `dispatch.submit()` now writes directly to the SAB and broadcasts
   to workers (see §Build start sequence step 7) instead of calling
   `scheduler.register()` / `scheduler.seed()`.

**Verification:** `build.bat && check.bat` clean. Full build runs
through the SAB scheduler with no push-based code paths. The timing
summary and Gantt chart are identical to Phase 6 (same tasks, same
concurrency, different dispatch mechanism).

### Phase 8: Cleanup

1. Remove `WorkerPool._idleWarm`, `_idleCold`, `_warm`,
   `_onWarmedUp`, `_drain`, `_queue`, `warmup()`.
2. Remove `deferHighlighter` from task defs and cpu-worker.
3. Remove `warmedUp` / `warmBoot` message protocol.
4. Remove `warmup: true` handling in cpu-worker.
5. `WorkerPool` becomes a thin lifecycle manager: spawn, forward
   messages, terminate.
6. Update `serve.mjs` per-rebuild SAB reallocation.
7. Update Gantt chart to include `warmInit` per-lane entries.

**Verification:** `build.bat && check.bat` clean. Serve mode works
(rebuild on file change, workers reuse across rebuilds). No
warmup-related code remains.

### Phase 9: Speculative idle execution (`run_when_idle`)

After Phase 8, `warmInit` is on-demand: it runs only when a worker
claims a render chunk and discovers the per-worker dep is unsatisfied.
This is correct but leaves performance on the table --- workers that
finish seed tasks (scss, buildInfo, mermaid) sit idle during the
main-thread spine (~200 ms) when they could be warming up.

This phase adds `F_RUN_WHEN_IDLE` and wires `warmInit` to use it.

1. **Flag bit.** Add `F_RUN_WHEN_IDLE = 16` to the SAB flag
   constants and `run_when_idle` to the task definition schema.
   `allocSchedulerSAB` sets the bit when the task def has
   `run_when_idle: true`.

2. **Pull loop change.** In the worker pull loop, after
   `scanAndClaim` returns -1 (no claimable work) and before the
   sleep path, insert a speculative-execution check:

   ```
   if taskIdx === -1:
     // Speculative: run idle-eligible tasks before sleeping
     idleTask = findIdleTask(views, myLane)
     if idleTask !== -1:
       execute handlers[idleTask]
       Atomics.store(views.perWorkerDone, idleTask * MAX_LANES + myLane, 1)
       postMessage({ done: idleTask, output, timing: { start, end } })
       continue  // re-enter pull loop (real work may have appeared)

     // Nothing to do — sleep
     gen = Atomics.load(views.notify, 0)
     taskIdx = scanAndClaim(views, myLane)  // double-check
     if taskIdx === -1:
       Atomics.wait(views.notify, 0, gen, 50)
       continue
   ```

3. **`findIdleTask`.** Scans task indices for tasks with
   `F_RUN_WHEN_IDLE` set:

   ```
   function findIdleTask(views, myLane):
     count = Atomics.load(views.taskCount, 0)
     for i = 0 to count - 1:
       if !(Atomics.load(views.flags, i) & F_RUN_WHEN_IDLE): continue
       if Atomics.load(views.flags, i) & F_UNIQUE_PER_WORKER:
         if Atomics.load(views.perWorkerDone, i * MAX_LANES + myLane) === 0:
           return i   // per-worker: no contention, no CAS needed
       else:
         if Atomics.load(views.status, i) !== DONE:
           if Atomics.compareExchange(views.status, i, NOT_READY, CLAIMED) === NOT_READY:
             return i
     return -1
   ```

   In practice, only `warmInit` has this flag, and it's
   `unique_per_worker`, so the scan hits one task and checks one
   per-worker-done flag. After a worker has run its `warmInit`, the
   check short-circuits on every subsequent idle pass.

4. **`warmInit` task def.** Add `run_when_idle: true` alongside the
   existing `on_demand: true` and `unique_per_worker: true`.

5. **No change to the render claim path.** Render chunks still list
   `warmInit` in `perWorkerDeps`. If a render chunk becomes ready
   before the idle-speculative path ran (e.g. the worker was busy
   with scss the whole time), the existing on-demand claim-release
   protocol handles it. The two paths are complementary, not
   alternatives.

**Verification:** `build.bat && check.bat` clean. Timing summary
shows `warmInit` per-lane timings overlapping with the main-thread
spine (starting around t=100--200 ms, while discover/nav/seo are
running), rather than clustering at render-chunk claim time
(t=400+ ms). This is the same overlap the old `pool.warmup()`
achieved, now expressed declaratively.

### Phase 10: Explicit render env init (`renderEnvInit`)

After Phase 9, the first render chunk on each worker pays a hidden
startup cost inside `getOrInitRenderEnv`: unpack ~300 KB shared
payload (JSON.parse), reconstruct three link-table Maps (~857 entries
each), instantiate markdown-it with plugins, build two Sets
(`staticFilesArr`, `sitePathsArr`). This cost is invisible in
timing --- it's buried inside the first render chunk's wall-clock ---
and it front-loads onto one chunk per worker, making that chunk
appear ~10--15 ms slower than the rest.

This phase extracts the init into an explicit per-worker task,
making the cost visible, moving it off the render hot path, and
eliminating the `while (!_chunkDataSAB)` polling loop from the
render handler.

#### Design extension: `unique_per_worker` tasks with predecessors

Phases 5--9 treat `unique_per_worker` tasks as seeds (no `expected`
predecessors). `renderEnvInit` needs `dispatch` to be DONE before it
can run (the sharedSAB doesn't exist until then). This requires
allowing `expected` on `unique_per_worker` tasks.

The semantics: `expected` predecessors on a `unique_per_worker` task
are **preconditions**, checked as read-only SAB status reads before
the per-worker instance executes. They are NOT tracked via depCount
(the task still doesn't participate in normal dependency counting).
The worker simply verifies each predecessor is DONE:

```
// About to run on-demand unique_per_worker dep D:
for each predIdx of taskMeta[D].expectedIdxs:
  if Atomics.load(views.status, predIdx) !== DONE:
    // Precondition not met; release original task and re-scan.
    Atomics.store(views.status, taskIdx, READY)
    Atomics.add(views.notify, 0, 1)
    Atomics.notify(views.notify, 0, 1)
    continue outer loop
```

The precondition check runs after the per-worker dep check (nested
deps are checked first). If `renderEnvInit` depends on `warmInit`
via `perWorkerDeps`, the flow for a render chunk is:

1. Worker claims render:i
2. Checks perWorkerDeps: `renderEnvInit[W]` not done
3. About to run renderEnvInit on-demand; checks its perWorkerDeps:
   `warmInit[W]` not done
4. Runs warmInit[W] (on-demand, releases render:i first)
5. Re-enters pull loop, claims render:i again
6. Checks perWorkerDeps: `renderEnvInit[W]` not done
7. About to run renderEnvInit; checks its perWorkerDeps:
   `warmInit[W]` done
8. Checks renderEnvInit's preconditions: `dispatch` DONE? Yes
9. Runs renderEnvInit[W] (releases render:i first)
10. Re-enters pull loop, claims render:i again
11. Checks perWorkerDeps: `renderEnvInit[W]` done
12. Executes render:i --- env already initialized, no polling

If Phase 9's `run_when_idle` already ran warmInit during the spine,
steps 3--5 are skipped (warmInit[W] is already done).

#### Task definitions

```js
warmInit: {
  expected: [],
  on_demand: true,
  unique_per_worker: true,
  run_when_idle: true,
  handler: "warmInit",
  submit() {},
},

renderEnvInit: {
  expected: ["dispatch"],         // precondition: sharedSAB exists
  perWorkerDeps: ["warmInit"],    // needs Shiki loaded
  on_demand: true,
  unique_per_worker: true,
  handler: "renderEnvInit",
  submit() {},
},
```

Render chunks change from `perWorkerDeps: ["warmInit"]` to
`perWorkerDeps: ["renderEnvInit"]`. This chains the dependency:
render → renderEnvInit → warmInit.

#### Handler

The `renderEnvInit` handler does what `getOrInitRenderEnv` does
today, minus the highlighter init (already done by warmInit):

```js
async renderEnvInit() {
  // Wait for renderData message (sharedSAB delivered via postMessage
  // after dispatch; may not be processed yet if we were in
  // Atomics.wait when it arrived).
  while (!_sharedSAB) {
    await new Promise(resolve => setImmediate(resolve));
  }

  const { siteData, initData, linkTablesData, staticFilesArr,
          baseurl, buildInfo, sitePathsArr,
          skipOffline } = unpackShared(_sharedSAB);

  const { initHighlighter } = await import("./highlight.mjs");
  const highlighter = await initHighlighter();  // cached; instant after warmInit
  const linkTables  = reconstructLinkTables(linkTablesData);
  const staticFiles = new Set(staticFilesArr);
  const markdown    = createMarkdownIt({ highlighter, linkTables, baseurl, staticFiles });
  const site        = { ...siteData, markdown, buildInfo };

  let offlineBase = null;
  if (!skipOffline) {
    offlineBase = {
      sitePaths: new Set(sitePathsArr),
      baseurl:   normalizeBaseurl(baseurl),
    };
  }

  _renderEnv = { site, initData, offlineBase };
  return {};
}
```

The render handler simplifies --- no lazy init, no polling:

```js
async render(taskIdx) {
  const workerStart = Date.now();

  const chunkIndex = taskIdx - idMapping.DYNAMIC_BASE;
  const offset = Atomics.load(views.chunkOffset, chunkIndex);
  const length = Atomics.load(views.chunkLength, chunkIndex);
  const chunk = JSON.parse(
    new TextDecoder().decode(new Uint8Array(_chunkDataSAB, offset, length)),
  );

  // _renderEnv guaranteed initialized by renderEnvInit (perWorkerDep).
  const env = _renderEnv;

  await renderPhase(chunk, env.site);
  await templatePhase(chunk, env.site, env.initData);
  // ... offline rewriting ...
}
```

`getOrInitRenderEnv` is deleted.

#### Changes to `findIdleTask` (Phase 9)

`findIdleTask` must respect preconditions for `run_when_idle` tasks
that have `expected` predecessors. `renderEnvInit` is NOT
`run_when_idle` (no benefit --- there's no idle window between
dispatch and render chunks), so this doesn't apply to it. But if a
future `run_when_idle` task has predecessors, `findIdleTask` should
check them:

```
function findIdleTask(views, myLane, taskMeta):
  count = Atomics.load(views.taskCount, 0)
  for i = 0 to count - 1:
    if !(Atomics.load(views.flags, i) & F_RUN_WHEN_IDLE): continue
    if Atomics.load(views.flags, i) & F_UNIQUE_PER_WORKER:
      if Atomics.load(views.perWorkerDone, i * MAX_LANES + myLane) !== 0:
        continue   // already done on this lane

      // Check preconditions and perWorkerDeps before running
      if !preconditionsMet(views, i, taskMeta): continue
      if !perWorkerDepsMet(views, i, myLane, taskMeta): continue

      return i
    // ... non-unique_per_worker case unchanged ...
  return -1
```

For `warmInit` (no predecessors, no perWorkerDeps), these checks
are no-ops. The guard exists for forward-compatibility.

#### Implementation steps

1. Extend the on-demand dep execution path in the pull loop:
   before executing an on-demand `unique_per_worker` dep, check
   its `expected` predecessors against SAB status. If any
   predecessor is not DONE, release the original task and
   re-scan.

2. Extend the on-demand dep execution path to recursively check
   `perWorkerDeps` on the dep itself. If `renderEnvInit` has
   `perWorkerDeps: ["warmInit"]`, and warmInit is not done on
   this lane, handle warmInit first (same on-demand protocol).

3. Add the `renderEnvInit` task definition to `TASKS`.

4. Add the `renderEnvInit` handler to `cpu-worker.mjs`.

5. Move the `while (!_sharedSAB)` polling from the render handler
   to `renderEnvInit`.

6. Simplify the render handler: read `_renderEnv` directly.

7. Delete `getOrInitRenderEnv` and the `_renderSAB` cache-check
   variable.

8. Update render chunk `perWorkerDeps` from `["warmInit"]` to
   `["renderEnvInit"]` (in `allocSchedulerSAB`'s taskMeta
   construction and in any task def that references it).

9. Update `findIdleTask` to check preconditions and perWorkerDeps
   for `run_when_idle` tasks (forward-compatibility).

**Verification:** `build.bat && check.bat` clean. Timing summary
shows `renderEnvInit:w0`, `renderEnvInit:w1`, ... per-lane entries
(consolidated in the Boot section, ~10--15 ms each) appearing after
dispatch. First render chunk per worker no longer shows an inflated
wall-clock relative to subsequent chunks. Total render wall-clock
is unchanged (the init cost moved, not eliminated).

### Phase 11: Amortize chunk packing into discover I/O gaps — DECLINED

**Decision:** precondition is false; pages are mutated between
discover and dispatch.

The plan assumed page objects are NOT mutated between
`discover.submit()` and `dispatch.submit()`, so JSON serialized
during discover would be identical to what `JSON.stringify` would
produce at pack time.  In practice, `nav` mutates every page in
place (adding `navPath`, `breadcrumbs`, `children`, `navLevels`)
and `seo` adds `seoTitle`, `seoFullTitle`, `seoCanonical`,
`seoIsHome`.  Both run between discover and dispatch.  A debug
assertion (`TBDOCS_DEBUG=1`) confirmed the mismatch immediately
on the first chunk.

The ~40 ms `packChunkData` cost is real but cannot be amortized
into discover's I/O gaps without either (a) serializing only the
discover-time fields and reconstructing the full page on the worker
(fragile, couples the cache to every future spine mutation), or
(b) re-serializing after the last mutation (which puts the work
back on the critical path and defeats the purpose).  Neither is
worth the complexity for a 40 ms saving.

---

*Original plan text retained below for reference.*

`packChunkData` runs inside `dispatch.submit()`, after the dispatch
timing window closes.  It JSON-serializes every chunk array (~858
pages across ~16 chunks), creating a ~40 ms gap between the dispatch
bar and the first render bar in the Gantt.  The serialization is
pure synchronous CPU work on the main thread.

`discover` spends ~200 ms in async disk I/O (`fs.readFile` on every
source file via `Promise.all`).  During each I/O wait the main
thread's event loop is idle.  This phase pre-serializes page objects
inside discover's `Promise.all` callbacks, overlapping the ~40 ms of
CPU work with the ~200 ms of libuv reads.  At dispatch time,
`packChunkData` concatenates pre-serialized strings instead of
re-traversing the page data.

Independent of Phase 10 --- neither changes code the other touches.

#### Precondition

Page objects are NOT mutated between `discover.submit()` and
`dispatch.submit()`.  The spine tasks (`nav`, `seo`, `markdownInit`,
`deriveRedirects`, `buildInit`) all read `state.pages` but write
their results to `state.site.*`, not back to individual page
objects.  JSON serialized during discover is therefore identical to
what `JSON.stringify` would produce at pack time.

A debug assertion (step 6) guards this invariant.

#### Side-table, not page property

Pre-serialized strings are stored in a `Map<page, string>` returned
alongside `{ pages, staticFiles }` from `discover()` --- NOT as a
`_json` property on the page object.  A property would be included
by `JSON.stringify(page)`, embedding a JSON-escaped copy of the
whole page inside itself and roughly doubling the payload.

#### Data flow

1. **`discover()` returns the cache.**  After `buildPage()` creates
   a page object, `JSON.stringify(page)` produces the pre-serialized
   string.  Both happen in the same `Promise.all` callback, right
   after `await fs.readFile()`:

   ```
   await Promise.all(allFiles.map(async (srcRel) => {
     ...
     const raw = await fs.readFile(srcPath, "utf8")
     const page = buildPage(srcRoot, srcRel, parsed)
     jsonCache.set(page, JSON.stringify(page))
     pages.push(page)
   }))
   return { pages, staticFiles, jsonCache }
   ```

   Each `JSON.stringify` takes ~47 μs (40 ms / 858 pages).  The
   libuv thread pool continues servicing reads while the main thread
   does this work.

   Object identity is preserved through `pages.sort()` and
   `chunkPages()` --- both reorder or slice the same objects --- so
   `jsonCache.get(page)` resolves correctly at pack time.

2. **`discover.submit()` stores the cache on `state`.**

   ```
   submit(out, state) {
     state.pages       = out.pages
     state.staticFiles = out.staticFiles
     state.site.config = out.config
     state.jsonCache   = out.jsonCache          // new
     for (const p of out.pages) state.pageByDest.set(p.destPath, p)
   }
   ```

3. **`Scheduler.dispatchRender()` passes the cache to
   `packChunkData`.**

   ```
   dispatchRender(chunks, sharedSAB) {
     ...
     const chunkDataSAB = packChunkData(chunks, this._views,
                                        this.state.jsonCache)
     ...
   }
   ```

4. **`packChunkData` concatenates instead of serializing.**

   ```
   export function packChunkData(chunks, views, jsonCache) {
     const buffers = jsonCache
       ? chunks.map(chunk =>
           encoder.encode("[" + chunk.map(p => jsonCache.get(p)).join(",") + "]"))
       : chunks.map(c => encoder.encode(JSON.stringify(c)))
     ...  // remainder unchanged: allocate SAB, copy buffers, write offsets
   }
   ```

   The fallback path (no cache) is retained so any caller that omits
   the argument gets the original behavior.

#### Why `Promise.all` still works

The current `discover` fires all reads at once via
`Promise.all(allFiles.map(async ...))`.  Adding `JSON.stringify`
inside each callback does not reduce I/O concurrency --- all reads
are already dispatched to libuv before any callback runs.  As I/O
completions arrive, the event loop runs each callback synchronously
(parse frontmatter, build page, serialize).  Each ~47 μs serialize
is invisible between I/O completions; libuv workers keep reading
disk in the background.

#### Memory

The cache holds ~858 JSON strings averaging ~4 KB each --- ~3.4 MB
total.  Negligible.  The cache is dropped when the build state is
GC'd (after each build, or after each rebuild in serve mode).

#### Implementation steps

**Files:** `builder/discover.mjs`, `builder/tbdocs.mjs` (the
`discover` task definition and `SharedState`), `builder/scheduler.mjs`
(`Scheduler` class), `builder/sab-scheduler.mjs` (`packChunkData`).

1. Add a `jsonCache` field to `SharedState` in
   `builder/scheduler.mjs` (initialized to `null`).

2. In `discover()` (`builder/discover.mjs`), create a `new Map()`,
   populate it inside the `Promise.all` callback after
   `buildPage()`, and include it in the return value.

3. In the `discover` task definition in `builder/tbdocs.mjs`, update
   `execute()` to destructure `jsonCache` from `discover()`'s
   return value and pass it through in the output object.  Update
   `submit()` to store `state.jsonCache = out.jsonCache`.

4. Add a `jsonCache` parameter to `packChunkData` in
   `builder/sab-scheduler.mjs`.  When present, use string
   concatenation (`"[" + ... + "]"`); otherwise fall back to
   `JSON.stringify`.

5. In `Scheduler.dispatchRender()` (`builder/scheduler.mjs`), pass
   `this.state.jsonCache` to `packChunkData`.

6. Add a debug assertion (gated on `process.env.TBDOCS_DEBUG`) that
   compares each concatenated chunk JSON with
   `JSON.stringify(chunk)` to catch any unexpected page mutation
   between discover and dispatch.

**Verification:** `build.bat && check.bat` clean.  The dispatch-to-
first-render gap in the Gantt shrinks from ~40 ms to <5 ms.
Discover's wall-clock time does not increase meaningfully (~1--3 ms).
Rendered output is byte-identical to the pre-change build.  Run once
with `TBDOCS_DEBUG=1` to exercise the assertion.

### Phase 12: Per-worker page flush

**Suggested model:** Opus.

**Motivation.** Today the entire `writePages` pass --- ~1,080 files to
disk --- waits behind `renderJoin`, then runs on the main thread.  The
per-page I/O is embarrassingly parallel and the data is already in
worker memory after `render`.  This phase moves page writes into
workers, overlapping I/O with the render tail and eliminating the
`html` / `offlineHtml` fields from the render delta (the two largest
structured-clone payloads per chunk).

**Design.** Three changes:

1. **Page stash.** Each worker keeps a module-scope array
   (`_pageStash = []`) initialized empty at startup.  The `render`
   handler appends `{ destPath, html, offlineHtml }` for each rendered
   page to the stash instead of returning those fields in the delta.
   The render delta shrinks to `{ destPath, renderedContent,
   offlineMisses }`.

2. **`flushPages` task.** A new `unique_per_worker` + `on_demand` task.
   When activated (by `prepPageDirs` completing on main), it becomes
   eligible in the idle-task scan.  The handler writes every stashed
   page to `_site/` and `_site-offline/`, clears the stash, and returns
   write stats.  A `flushJoin` barrier on main collects all per-worker
   flush completions.

3. **Priority-ordered idle scan.** The current `F_RUN_WHEN_IDLE`
   boolean becomes a numeric priority (`idle_priority`).
   `findIdleTask` picks the eligible task with the lowest
   (= highest-priority) value.  Assignment: `warmInit` = 0 (run first
   --- Shiki must load before rendering), `flushPages` = 1 (run after
   render drains).  In practice they never compete (`warmInit` finishes
   long before `flushPages` becomes eligible), but the priority makes
   the ordering explicit and defensive.

   Implementation: store `idle_priority` in `taskMeta` (the JS-side
   per-task metadata already sent to workers at init), not in the SAB
   layout.  `findIdleTask` keeps the flag-bit scan
   (`F_RUN_WHEN_IDLE`) to identify idle-eligible tasks, then among
   eligible candidates picks the one with the lowest
   `taskMeta[i].idlePriority`.  With only 2--3 idle tasks the extra
   comparison is negligible.

**Edge case: worker with zero render chunks.** Under high worker
counts (or small page sets), one or more workers may never claim a
render task.  Their stash stays at the initialized-empty `[]`.
`flushPages` on such a worker writes zero pages and returns
`{ written: 0, offlineWritten: 0 }`.  This is safe --- `flushJoin`
counts it as done.  Guard: `_pageStash` must be preset to `[]` both
at module scope and in the `msg.init` handler (serve-mode pool reuse
across rebuilds).

**Graph changes.** `renderJoin` is removed entirely.  All downstream
tasks that depended on it switch to `flushJoin`:

```
render:i [W]  (stashes pages locally; delta carries renderedContent + offlineMisses only)
    render:i.submit()  merges renderedContent into state.pages on main

prepPageDirs [M]  →  activates flushPages ON_DEMAND slots

flushPages [W, unique_per_worker, on_demand, idle_priority: 1]
    writes stashed html       → _site/<destPath>
    writes stashed offlineHtml → _site-offline/<destPath>
    → flushJoin [M]

flushJoin + scssJoin + mermaid + highlighterInit  → writeAssets [M]
    (copyTheme + copyStaticFiles + writeGeneratedAssets --- no page writes)

flushJoin + prepDest  → searchData [M]

flushJoin + searchData + deriveRedirects + deriveSitemap  → writeAux [M]

writeAux + writeAssets  → writeOffline [M]
    (offline theme / static / aux only --- page HTML already on disk from flush)

flushJoin + mermaid  → writePdf [M]
    (reads renderedContent from state.pages --- not html)
```

**Why `flushJoin` subsumes `renderJoin`.** Messages from a single
worker to main are FIFO.  Each worker posts all `render:i` completion
messages (triggering `render:i.submit()` delta merges on main) before
posting its `flushPages` completion.  By the time main processes the
last worker's flush-done --- which is when `flushJoin` fires --- every
`render:i.submit()` has already executed.  So `flushJoin` implies all
render deltas are merged, and `searchData` / `writePdf` can safely
read `renderedContent` from `state.pages`.

**Implementation details.**

- **Stash initialization.** `let _pageStash = []` at module scope in
  `cpu-worker.mjs`.  Reset to `[]` in the `msg.init` handler (for
  serve-mode pool reuse across rebuilds).

- **Render handler change.** After `renderPhase` + `templatePhase` +
  offline derivation, the handler pushes `{ destPath, html,
  offlineHtml }` onto `_pageStash` for each writable page
  (`html !== undefined`).  The return value drops `html` and
  `offlineHtml`:
  ```js
  return {
    workerStart, workerEnd,
    pages: chunk.map(p => ({
      destPath:        p.destPath,
      renderedContent: p.renderedContent,
      offlineMisses:   p.offlineMisses,
    })),
  };
  ```

- **`flushPages` handler.** Reads `ctx.destRoot` (already available on
  the worker via the init message).  Writes each stashed page to
  `path.join(destRoot, p.destPath)` and, when `offlineHtml` is
  defined, to `path.join(destRoot + '-offline', p.destPath)`.  Skips
  actual writes when `ctx.opts.dryRun` is true.  Returns
  `{ written, offlineWritten, offlineMisses }` (`offlineMisses` is
  the sum of per-page `offlineMisses` counts from the stash).

  **Stats delivery.** The `perWorkerTiming` message format gains an
  optional `output` field.  The `flushPages` completion path in
  `cpu-worker.mjs` sets it to the handler's return value so the stats
  reach main alongside the timing.  Existing per-worker tasks
  (`warmInit`, `renderEnvInit`) omit the field; the main-thread
  handler ignores it when absent.

- **`flushPages` task definition.**
  ```js
  flushPages: {
    expected: ["prepPageDirs"],
    on_demand: true,
    unique_per_worker: true,
    run_when_idle: true,
    idle_priority: 1,
    handler: "flushPages",
    submit() {},
  },
  ```
- **`flushJoin` task definition and activation.**  `flushJoin` is
  `on_demand` + `runOnMain`.  It does not participate in the normal
  SAB successor system (because `flushPages` is `unique_per_worker`,
  which uses `perWorkerDone` + `perWorkerTiming` --- not the regular
  task-completion path that decrements successor dep counts).

  Instead, **counter-based activation in `_onPerWorkerTiming`:**
  the scheduler keeps a `_flushCount` counter (initialized to 0) and
  a `_flushStats` accumulator.  When `_onPerWorkerTiming` receives a
  message with `taskName === "flushPages"`, it increments the counter
  and folds the message's `output` into the accumulator (summing
  `written`, `offlineWritten`, `offlineMisses`).  When the counter
  reaches `workerCount`, it:

  1. Stores the aggregated stats on `this.results` under
     `"flushPages"` so downstream tasks can read them.
  2. Calls `addDynamicTasks(1)` (so `_remaining` includes
     `flushJoin`).
  3. Sets `flushJoin`'s SAB status to `READY`.
  4. Calls `_scheduleMainScan()`.

  `flushJoin` then runs as a no-op barrier; its `submit()` is empty
  (downstream tasks declare `"flushJoin"` in their `expected` arrays
  and the scheduler's `_assembleInputs` resolves it from
  `this.results`).

  ```js
  flushJoin: {
    expected: [],
    on_demand: true,
    runOnMain: true,
    execute() { return {}; },
    submit() {},
  },
  ```

  Reset `_flushCount` and `_flushStats` in the constructor (and on
  each rebuild in serve mode).

- **`render:i.submit()` change.** Drops the `html` and `offlineHtml`
  assignments from the delta merge.  Only merges `renderedContent` and
  `offlineMisses`.

- **`prepPageDirs` extension.** Currently creates directories under
  `destRoot` only.  Extended to also create the corresponding
  directories under `destRoot + '-offline'` so `flushPages` workers
  can write without per-file mkdir.

- **`write` → `writeAssets`.** The current `write` task is renamed.
  Its `expected` changes from
  `["renderJoin", "scssJoin", "mermaid", "prepPageDirs",
  "highlighterInit"]` to
  `["flushJoin", "scssJoin", "mermaid", "prepPageDirs",
  "highlighterInit"]`.  It no longer calls `writePages` --- only
  `copyTheme`, `copyStaticFiles`, and `writeGeneratedAssets`.

- **`writeOffline` change.** The `writeOfflinePages` call is removed
  from `writeOffline`'s `Promise.all` orchestration.  With
  `offlineHtml` no longer merged back into `state.pages` (it stays on
  the worker), the `precomputed` branch at `offline.mjs:235` would
  filter to zero pages --- the offline page HTML is already on disk
  from the flush.  `writeOffline` keeps: JS patches
  (`just-the-docs.js`), `search-data.js` wrapper, redirect-stub
  rewrites, theme-asset copy, static-file copy.

  The `deps.counters.html` and `deps.counters.unresolved` tallies
  that `writeOfflinePages` used to maintain move to `flushPages`
  return stats, aggregated on main via `flushJoin`.

  `writeOffline` gains a direct dependency on `writeAssets` (in
  addition to `writeAux`): it reads `_site/assets/js/just-the-docs.js`
  to produce the patched offline copy, and walks `_site/assets/` to
  mirror theme files with CSS URL rewrites.  Today this is covered
  transitively through `writeAux → write`; with `write` split into
  `flushPages` + `writeAssets`, the edge must be explicit.

- **`searchData`, `writePdf` dependency change.** Both switch from
  `renderJoin` to `flushJoin` in their `expected` arrays.  No other
  changes --- `searchData` reads `renderedContent` from
  `state.pages`; `writePdf` reads `renderedContent` via
  `bookData._chapters` refs.  Neither reads `html`.

- **`GANTT_SECTION` map** (`tbdocs.mjs`).  Remove `write`, add
  `writeAssets: "Write"`, `flushJoin: "Write"`.  Per-worker
  `flushPages` timings are recorded by `_onPerWorkerTiming` under
  `"flushPages:wN"` with `ganttSection: "Write"` (update the
  hard-coded `"Boot"` section in `_onPerWorkerTiming` to read from
  taskMeta, or special-case `flushPages`).

- **Summary output** (`tbdocs.mjs`).  The build summary currently
  reports write stats from the `write` task result.  With the split,
  page-write stats come from the aggregated `flushPages` result
  (stored under `"flushPages"` in `this.results` by the counter
  activation), and asset-write stats come from `writeAssets`.

**Files touched:**

| File | Changes |
|---|---|
| `cpu-worker.mjs` | `_pageStash` module var + reset in `msg.init`; render handler: push to stash, drop `html`/`offlineHtml` from return; new `flushPages` handler; `perWorkerTiming` message gains `output` field for flush stats |
| `tbdocs.mjs` | New `flushPages` + `flushJoin` task defs; rename `write` → `writeAssets` and strip `writePages` call; update `expected` arrays (`searchData`, `writePdf`, `writeOffline`); `GANTT_SECTION` map; summary output |
| `scheduler.mjs` | `_flushCount` / `_flushStats` counter; `_onPerWorkerTiming` extension for flush activation + stats aggregation; Gantt section for per-worker flush timings |
| `sab-scheduler.mjs` | `idlePriority` in `taskMeta` wire-up (minor --- already passed to workers, just needs to be populated from the task def); `flushJoin` SAB slot allocation |
| `write.mjs` | `preparePageDirs` extended to create dirs under `destRoot + '-offline'` |
| `offline.mjs` | Remove `writeOfflinePages` call from `writeOffline`'s `Promise.all`; adjust counter reporting |

**Expected savings.**

Three sources:
1. **Wall-clock overlap.** Pages start hitting disk as soon as a worker
   exhausts its render tasks, instead of waiting for `renderJoin` +
   main-thread `writePages`.  The overlap between the render tail and
   the first flush is the direct win.
2. **Reduced structured-clone cost.** `html` (~5--15 KB per page) and
   `offlineHtml` (similar size) no longer cross the worker boundary.
   On ~1,080 pages across ~16 chunks, this drops the total return-path
   clone volume substantially.
3. **Decoupled `writeAssets`.** Theme and static-file copies no longer
   wait for rendered pages.  They start as soon as `flushJoin` + their
   seed deps are ready.

Conservative estimate: 50--100 ms wall-clock on a 16-core machine.
The main value is architectural --- the write pipeline is no longer a
main-thread bottleneck gated on the render barrier.

**Verification.** `build.bat && check.bat` clean.  The timing summary
should show:
- Per-worker `flushPages` timings appearing after the last `render:i`
  per worker, with earlier workers' flushes overlapping later workers'
  render tails.
- `writeAssets` replacing `write` in the Write section, with a shorter
  duration (no `writePages`).
- `writeOffline` duration dropping (no per-page HTML writing).
- `renderJoin` absent from the summary.

### Phase 13: Uniform task timing (t0 / t1 / t3) — DONE

**Suggested model:** Opus.

**Motivation.** The Gantt chart shows a gap between `dispatch` ending
and the first `renderEnvInit` starting.  Investigation reveals the
gap is real but uncharted: `dispatch.submit()` runs *after* the
execute timing window closes (t1), and it does substantial work ---
`packChunkData`, `broadcastRenderData`, `activateRenderTasks` --- that
is invisible in the timeline.  The same blind spot exists for every
main-thread task: `submit()` is never timed.

A secondary problem: every worker handler (`scssLight`, `scssDark`,
`mermaid`, `buildInfo`, `render`) redundantly captures its own
`workerStart` / `workerEnd` timestamps, near-identical to the pull
loop's `start` / `end` that already wrap the same call.  The timing
should live in one place --- the runner (pull loop on the worker side,
`_executeMainTask` / `_onWorkerDone` on main) --- with handlers
unaware of timing.

**Design.** Two boundary timestamps per task, with a third on
main-thread tasks only:

| Timestamp | Main-thread tasks | Worker tasks |
|-----------|-------------------|--------------|
| t0 | before `execute()` | before `handler()` |
| t1 | after `execute()` | after `handler()` |
| *(t2)* | *(reserved, unused)* | *(reserved, unused)* |
| t3 | after `submit()` | *(not captured --- see below)* |

t2 is reserved for a future split (e.g. timing `results.set()`
separately) but not captured now.

**Why t3 is main-thread only.** For main-thread tasks, `submit()`
runs between t1 and `sabOnTaskDone` --- it gates successor activation,
so its cost is on the critical path.  For worker tasks, the worker
itself calls `onTaskDone` (SAB update) *before* posting the result
message; `submit()` runs later on the main thread when
`_onWorkerDone` processes the message, off the critical path.
Worker-side `postMessage` cost (structured-clone serialization)
cannot be included in the message it is measuring; the gap between
t1 and the main thread's receipt time serves as a proxy if needed.

The `workerStart` / `workerEnd` fields on handler return values are
removed.  Handlers no longer capture timing; the runner does it
uniformly.

#### Changes to `scheduler.mjs`

1. **`_executeMainTask`.** Move the timing-entry construction below
   `def.submit()` and capture t3 after it.  Currently the timing
   object is built between t1 and `results.set`; it must move so that
   t3 is available.  Preserve the existing `consolidate` /
   `ganttSection` / `lane` properties on the timing entry:

   ```js
   const t0 = Date.now();
   output = await def.execute(inputs, this._ctx, this.state);
   const t1 = Date.now();

   this.results.set(name, output);
   def.submit(output, this.state, this);
   const t3 = Date.now();

   const timing = { start: t0, end: t1, t3 };
   // keep consolidate, ganttSection, lane as before
   if (def.consolidate)  timing.consolidate  = true;
   if (def.ganttSection) timing.ganttSection = def.ganttSection;
   this.timings.set(name, timing);
   ```

   The existing `start` / `end` semantics are preserved (t0 / t1) for
   backwards compatibility with the summary and Gantt.  `t3` is a new
   optional field.

2. **`_onWorkerDone`.** Drop the `output.workerStart` /
   `output.workerEnd` extraction.  Populate `workerStart` /
   `workerEnd` from the timing message (t0 / t1):

   ```js
   const t = { start: timing.start, end: timing.end };
   if (lane != null) {
     t.workerStart = timing.start;
     t.workerEnd   = timing.end;
     t.lane = lane;
   }
   ```

   No t3 --- worker `submit()` is off the critical path.

3. **`_onPerWorkerTiming`.** Per-worker tasks (`warmInit`,
   `renderEnvInit`, `flush`) arrive via this path.  The runner
   sends `{ start, end }` (t0 / t1).  No change to the timing
   fields stored --- `workerStart` / `workerEnd` are already
   populated from `timing.start` / `timing.end`:

   ```js
   _onPerWorkerTiming({ taskName, timing, lane, output }) {
     this.timings.set(`${taskName}:w${lane}`, {
       start: timing.start, end: timing.end,
       workerStart: timing.start, workerEnd: timing.end,
       lane,
       consolidate: true,
       ganttSection: this._ganttSections[taskName] ?? "Boot",
     });
   ```

   This is unchanged from the current code.

4. **Drop `workerStart` / `workerEnd` extraction from output.**  The
   lines in `_executeMainTask` and `_onWorkerDone` that read
   `output.workerStart` / `output.workerEnd` are deleted.  The runner
   provides these timestamps; handlers no longer carry them.

#### Changes to `cpu-worker.mjs`

1. **Pull loop --- regular task path** (~line 427).  Capture t0 / t1
   as explicit variables.  The timing object sent to main carries
   `{ start, end }` = t0 / t1:

   ```js
   const t0 = Date.now();
   result = await handler(taskIdx);
   const t1 = Date.now();

   parentPort.postMessage({
     done: taskIdx,
     output: result,
     timing: { start: t0, end: t1 },
     lane: myLane,
   });
   ```

   This is the same data the current code sends (it evaluates
   `Date.now()` inside the postMessage args); the only change is
   naming the variable `t1` before the call instead of inlining it.

2. **Pull loop --- per-worker dep and idle paths.**  Three distinct
   `perWorkerTiming` send sites need the same t0 / t1 treatment:

   a. **Idle-task completion** (~line 281).  Currently:
      `timing: { start: idleStart, end: Date.now() }`.
      Change to capture t1 before the postMessage:
      ```js
      const t0 = Date.now();
      idleResult = await handlers[idleMeta.handler]();
      const t1 = Date.now();
      Atomics.store(views.perWorkerDone, idleTask * MAX_LANES + myLane, 1);
      parentPort.postMessage({
        perWorkerTiming: true,
        taskName: idleMeta.name,
        timing: { start: t0, end: t1 },
        lane: myLane,
        output: idleResult,
      });
      ```

   b. **Nested per-worker dep completion** (~line 347).  Currently:
      `timing: { start: nestedStart, end: Date.now() }`.
      Same pattern --- capture t1, send `{ start: t0, end: t1 }`.

   c. **Direct per-worker dep completion** (~line 393).  Currently:
      `timing: { start: depStart, end: Date.now() }`.
      Same pattern.

3. **Remove `workerStart` / `workerEnd` from handlers.**  Delete the
   `workerStart = Date.now()` / `workerEnd: Date.now()` boilerplate
   from: `scssLight`, `scssDark`, `mermaid`, `buildInfo`, `render`.
   Each handler returns only its domain data (e.g. `{ scssLightResult }`,
   `{ buildInfo }`, `{ pages: [...] }`).

#### Changes to `gantt.mjs`

1. **Worker lane bars.**  Currently uses `t.workerStart` /
   `t.workerEnd`.  After Phase 13, these are populated from the
   runner's t0 / t1 in `_onWorkerDone` and `_onPerWorkerTiming`
   (see scheduler changes above), so the Gantt renderer needs no
   change for basic rendering.

2. **Submit / dispatch overlay.**  When `t3` is present on a timing
   entry, render a half-height rect from `end` to `t3`, aligned to
   the bottom of the bar, using the same fill class as the main bar.
   This makes the `dispatch.submit()` cost visible in the Gantt ---
   the gap that motivated this phase.  Only main-thread tasks carry
   `t3`, so worker lane bars are unaffected.

#### Changes to `groupGanttTimings` (`tbdocs.mjs`)

Pass through the `t3` field when present:

```js
const entry = { id, start: start - t0, end: end - t0 };
if (t3 != null) entry.t3 = t3 - t0;
```

The destructuring on line ~662 gains `t3`.

#### Implementation steps

1. Remove `workerStart` / `workerEnd` from the five worker handlers
   (`scssLight`, `scssDark`, `mermaid`, `buildInfo`, `render`).

2. Update the pull loop's regular-task path (~line 427) to capture
   t0 / t1 as named variables.  Send `{ start: t0, end: t1 }` in
   the timing object.

3. Update all three per-worker timing send sites in the pull loop:
   idle-task completion (~line 281), nested per-worker dep completion
   (~line 347), direct per-worker dep completion (~line 393).  Each
   gets the same t0 / t1 pattern.

4. In `_executeMainTask`, capture t3 after `submit()`.  Store it on
   the timing entry.

5. In `_onWorkerDone`, stop reading `output.workerStart` /
   `output.workerEnd`.  Populate `workerStart` / `workerEnd` from
   the timing message's `start` / `end`.

6. In `groupGanttTimings`, pass through t3.

7. In `gantt.mjs`, render the `end`--`t3` overlay rect on
   main-thread task bars when `t3` is present.

**Files touched:**

| File | Changes |
|---|---|
| `cpu-worker.mjs` | Remove `workerStart` / `workerEnd` from 5 handlers; name t0 / t1 in pull loop regular-task path; same pattern in all 3 per-worker timing send sites |
| `scheduler.mjs` | `_executeMainTask`: capture t3 after submit; `_onWorkerDone`: drop `output.workerStart` extraction, populate from timing message; `_onPerWorkerTiming`: no change |
| `tbdocs.mjs` | `groupGanttTimings`: pass through t3 |
| `gantt.mjs` | Render end--t3 overlay rect on main-thread task bars |

**Verification.** `build.bat && check.bat` clean.  The timing summary
is unchanged (it reads `start` / `end`, which remain t0 / t1).  The
Gantt chart shows a visible submit-phase tail on main-thread task
bars --- most notably on `dispatch`, where the end--t3 overlay accounts
for the previously invisible gap before `renderEnvInit`.

## Notify protocol

Workers sleep on a single generation-counter slot (`views.notify`)
rather than per-task status slots. The protocol:

```
// Worker (after scanAndClaim returns -1):
gen = Atomics.load(views.notify, 0)
taskIdx = scanAndClaim(views, myLane)      // double-check: race window
if taskIdx === -1:
  Atomics.wait(views.notify, 0, gen, 50)   // sleep until gen changes, 50ms fallback

// Any thread making N worker tasks READY (in onTaskDone):
Atomics.add(views.notify, 0, 1)            // bump generation
Atomics.notify(views.notify, 0, readyCount) // wake exactly readyCount workers

// dispatch seeding N render chunks:
Atomics.add(views.notify, 0, 1)
Atomics.notify(views.notify, 0, Infinity)  // wake all workers
```

The double-check in the worker's sleep path prevents a race: a task
could become READY between the failed scan and the `Atomics.load` of
the generation counter. Without the double-check, the worker would
sleep with stale `gen` and miss the notification.

The 50 ms timeout is a safety net for edge cases where a notification
is lost (e.g. the bump and notify happen between the worker's
`Atomics.load` and `Atomics.wait`, and no other notification follows).
50 ms is long enough to avoid busy-spinning but short enough to not
stall a build.

**Exception: on-demand main-thread deps.** When a worker is waiting
for a specific on-demand main-thread task to complete, it waits on
that task's **status slot** (`Atomics.wait(views.status, depIdx,
READY)`) --- not the generation counter. This is targeted: the worker
knows exactly what it's waiting for, and wakes as soon as the main
thread sets the task to DONE and notifies the slot. Before waiting,
the worker checks if other non-dependent work is available (one scan);
if so, it does that work instead of sleeping.

### Phase 14: Move `writePdf` to a worker --- DEFERRED

**Motivation.** `writePdf` depends on `flushJoin` + `mermaid` +
`resolveBookChapters` --- no data dependency on the offline pipeline
(`searchData` → `writeAux` → `writeOffline`).  But both `writePdf` and
the offline pipeline are `runOnMain`, so they serialize on the main
thread.  On a machine where `flushJoin` lands at ~1.2 s, the ~150 ms
`writePdf` cost is 12 % of the build.

**Investigation.** Splitting `writePdf` into two main-thread tasks
(`assemblePdf` + `writePdfFiles`) to measure the compute-vs-I/O
breakdown showed:

```
assemblePdf=160ms  writePdfFiles=30ms
```

The compute half (`assembleBook`: chapter walking, body transforms,
href rewriting, html-compress) is ~84 % of the cost.  The file-write
half (one `book.html` + 2 CSS files + ~100 images) is only ~30 ms.

**Consequence.** Moving just the file writes to a worker saves ~30 ms
--- not enough to justify the SAB broadcast plumbing.  The real win
requires moving `assembleBook` itself off main.  Two blockers prevent
that:

1. **Live page-object references.**  `resolveBookChapters` stores page
   objects in `bookData._chapters[]`, `_foreword`, `_landing`.  These
   are identity-linked to `state.pages` entries where `renderedContent`
   was merged after render.  Structured clone to a worker breaks the
   identity link.

2. **`site.markdown` dependency.**  `assembleBook` →
   `renderPartDivider` calls `site.markdown.render()` for part
   subtitles and intros.  The markdown-it instance is not serializable.

**Paths forward (not yet committed to):**

- **Index-based chapter references.**  `resolveBookChapters` stores
  permalink strings instead of page objects; `assembleBook` builds a
  `Map<permalink, Page>` at the start and resolves refs through it.
  Removes blocker 1.

- **Pre-render book text.**  Pre-render subtitles/intros during
  `resolveBookChapters` (which runs after `markdownInit`), storing the
  HTML on `bookData` entries.  `renderPartDivider` reads the
  pre-rendered strings instead of calling `site.markdown`.  Removes
  blocker 2.

- **Full worker migration.**  With both blockers removed, the entire
  `writePdf` (compute + I/O) can run on a worker via SAB broadcast of
  a page projection (~10 MB: all pages' `permalink`, `navPath`,
  `renderedContent`, `frontmatter` subset).  Packing cost ~30--50 ms;
  net main-thread savings ~100--120 ms.

Deferred: the refactoring cost is significant for a ~120 ms saving on
a 4 s build.  Revisit if the build wall-clock shrinks enough that the
PDF task becomes a larger fraction.

### Phase 15: Generic dynamic tasks and per-chunk flush --- DONE

**Suggested model:** Opus.

**Outcome.** Landed as designed.  `build.bat` runs all worker lanes in
parallel through both render and flush.  `check.bat` reports zero
intra-site issues (only the 8 pre-existing PDF broken links remain).
Two divergences from the design surfaced during implementation; both
are folded into the description below.

1. **`flush:i` is gated on `prepPageDirs` as well as `render:i`** (so
   `setDepCount(views, flushBase + i, 2)`, not 1).  The design's
   `depCount = 1` trusted that `prepPageDirs` would always finish
   before any render chunk did.  On Windows, `mkdir` over ~100 nested
   subdirectories takes longer than the first render chunk and the
   first `flush:i` `ENOENT`s on a missing output directory.  A new
   `appendDynamicSuccessors(views, edges)` primitive in
   `sab-scheduler.mjs` extends `prepPageDirs`'s successor list with
   `flush:0..N-1` without overwriting its static `writeAssets` edge
   (it relocates the existing successors to the end of `succList`,
   appends the new ones, and updates `succOffset` / `succCount`; the
   old slots become dead space, ~4 bytes each).

2. **`affinityLane`, `pinnedTo`, and `completedOnLane` are pre-filled
   to `-1` for the whole array, not just static slots.**
   `SharedArrayBuffer` is zero-initialized, so a dynamic slot's
   `affinityLane[idx] === 0` made `scanAndClaim`'s
   `aff !== -1 && aff !== myLane` filter treat every dynamic task as
   pinned to lane 0.  Only `w0` ever claimed work; the other 15
   workers sat idle through the entire render fan-out (build still
   "succeeded" because `w0` ran all 160 chunks sequentially --- ~4 s
   instead of ~250 ms on the render bar).  The design only specified
   pre-filling the metadata arrays (`handlerIdx`, `perWorkerDep`,
   `expectedDep`); the three identity-coordinates need the same
   treatment.

**Motivation.** Three coupled problems:

1. **Flush clustering.**  All `render:i` tasks become READY
   simultaneously after `dispatch`.  Workers pull them greedily via
   `scanAndClaim`, which claims the first READY task it finds.  The
   per-worker `flush` task is `run_when_idle` --- it only fires when
   `scanAndClaim` returns -1, i.e. every render task is already
   CLAIMED or DONE.  With `SLICES_PER_WORKER = 10` and 8--16
   workers, that means 80--160 render tasks drain before any worker
   goes idle.  All workers finish within moments of each other, so
   all flushes cluster at the tail --- the I/O burst that Phase 12
   was meant to spread.

2. **Special-cased join barriers.**  `renderJoin` and `flushJoin` use
   hand-rolled counters in `_onWorkerDone` and `_onPerWorkerTiming`
   with manual `Atomics.store(status, joinIdx, READY)`.  Each new
   fan-out pattern requires a new counter, a new name-matching branch,
   and a new stats accumulator.  The SAB already has a general
   dep-count mechanism (`onTaskDone` decrements successor dep counts
   and sets READY at zero); the joins should use it.

3. **Render-specific infrastructure.**  Three layers of the scheduler
   know about `render` by name:

   - `allocSchedulerSAB` pre-reserves named `render:${i}` slots and
     hardcodes their `taskMeta` (handler `"render"`, `perWorkerDeps`
     `[renderEnvInitIdx]`).
   - `scheduler.mjs` name-matches `startsWith("render:")` in
     `_onWorkerDone` and `taskName === "flush"` in
     `_onPerWorkerTiming`.
   - `cpu-worker.mjs` computes `taskIdx - idMapping.DYNAMIC_BASE` to
     index into render-specific `chunkOffset` / `chunkLength` SAB
     arrays.

   The scheduler should know about *tasks* (static or dynamic) and
   their metadata (handler, deps, successors, priority) --- not about
   what any specific task does.

This phase solves all three by introducing a generic dynamic task pool,
SAB-based task metadata, a generic payload mechanism, and per-task
priority --- and uses them to replace the current `render:i` /
`flush` / `renderJoin` / `flushJoin` infrastructure with per-chunk
`flush:i` tasks and SAB dep-count-gated barriers.

#### Design overview

Four pillars:

1. **SAB-based task metadata.**  The `taskMeta` JS array (sent once
   to workers via `workerData`, frozen at worker creation) is replaced
   by SAB arrays that the main thread can write at any time and
   workers read atomically at claim time.  A pair of functions ---
   `writeTaskMeta` / `readTaskMeta` --- encapsulates the layout so
   call sites never touch raw offsets.  `taskMeta` is deleted.

2. **Generic dynamic pool.**  `allocSchedulerSAB` no longer
   pre-reserves named slots for any specific task type.  Static tasks
   get indices `0..S-1`.  Slots `S..MAX_TASKS-1` are a blank pool.
   Any task's `submit()` can allocate slots from it at runtime via
   `allocDynamicSlots`.

3. **Generic payload.**  The render-specific `chunkOffset` /
   `chunkLength` SAB arrays are replaced by `payloadOffset[MAX_TASKS]`
   / `payloadLength[MAX_TASKS]`, indexed by `taskIdx` directly.  A
   `packPayloads` function packs data into a `SharedArrayBuffer` and
   writes the per-task offsets.  Any dynamic task handler can read its
   payload; handlers with no payload (like `flush`) ignore the
   zero-length entry.

4. **Per-task priority + per-chunk flush.**  An Int32 `priority` field
   in the SAB makes `scanAndClaim` prefer higher-priority tasks.
   The single `unique_per_worker` `flush` task is replaced by N
   dynamic `flush:i` tasks, each pinned to its predecessor `render:i`
   and assigned `priority: 1` (above render's default 0).  Both
   `renderJoin` and `flushJoin` become normal dep-count-gated
   barriers --- no counters, no name-matching.

#### SAB layout changes

**Bump constants.**

| Constant | Old | New | Reason |
|---|---|---|---|
| `MAX_TASKS` | 256 | 512 | 2N dynamic tasks (render + flush) at 16 cores = 320; need headroom |
| `MAX_EDGES` | 512 | 2048 | 3N dynamic edges + ~37 static; worst case (64 lanes × 10 slices) = 1957 |
| `MAX_RENDER_CHUNKS` | 640 | *(deleted)* | Replaced by `payloadOffset` / `payloadLength` sized to `MAX_TASKS` |
| `SLICES_PER_WORKER` | 10 | 10 | Unchanged |

**New arrays** (all Int32, alongside existing arrays):

```
handlerIdx     [MAX_TASKS]          // handler function ID; -1 = unassigned
perWorkerDep   [MAX_TASKS * 2]      // up to 2 per-worker dep indices; -1 = none
expectedDep    [MAX_TASKS * 2]      // up to 2 precondition pred indices; -1 = none
idlePriority   [MAX_TASKS]          // idle-task ordering; 0 = default
priority       [MAX_TASKS]          // scanAndClaim ordering; 0 = default, higher = first
payloadOffset  [MAX_TASKS]          // byte offset into payloadSAB for this task's data
payloadLength  [MAX_TASKS]          // byte length of this task's data; 0 = no payload
```

**Removed arrays:** `chunkOffset`, `chunkLength`.

**Total SAB size.**  With MAX_TASKS = 512, MAX_EDGES = 2048,
MAX_LANES = 64:

```
existing:  taskCount(1) + depCount(512) + status(512) + flags(512) +
           succOffset(512) + succCount(512) + succList(2048) +
           affinityLane(512) + pinnedTo(512) + completedOnLane(512) +
           perWorkerDone(512 × 64 = 32768) + edgeCount(1) +
           notify(1) + firstReady(1) + buildDone(1)
new:       handlerIdx(512) + perWorkerDep(1024) + expectedDep(1024) +
           idlePriority(512) + priority(512) +
           payloadOffset(512) + payloadLength(512)
total:     ~42,000 Int32 slots × 4 = ~164 KB
```

Roughly double the current ~80 KB.  Negligible for a build tool.

#### Handler registry

A shared integer mapping, defined once in `sab-scheduler.mjs`:

```js
export const HANDLERS = {
  warmInit: 0, renderEnvInit: 1, flush: 2,
  scssLight: 3, scssDark: 4, mermaid: 5,
  buildInfo: 6, render: 7,
};
```

`allocSchedulerSAB` resolves `def.handler ?? name` through this table
when writing static task metadata.  `registerDynamicTasks` (below)
receives the integer directly.

Workers build the reverse table at init:

```js
const handlerById = [
  handlers.warmInit, handlers.renderEnvInit, handlers.flush,
  handlers.scssLight, handlers.scssDark, handlers.mermaid,
  handlers.buildInfo, handlers.render,
];
```

#### Task metadata API

Two functions in `sab-scheduler.mjs`, encapsulating the SAB layout
for per-task metadata.  Every caller --- `allocSchedulerSAB` for
static tasks, dynamic task registration for dynamic tasks, pull loop
and idle scan for reads --- goes through these.

```js
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
```

Static tasks: `allocSchedulerSAB` calls `writeTaskMeta` in its
existing per-task loop, replacing the `taskMeta[idx] = { ... }`
assignment.  Name resolution (`HANDLERS[name]`, `nameToIdx.get(dep)`)
happens in the same loop as today.  Main-thread tasks (`runOnMain`)
are skipped --- workers never read their metadata (`scanAndClaim`
skips `F_RUN_ON_MAIN` tasks), so writing `handlerIdx` is unnecessary.
Their SAB metadata slots stay at the initialized defaults
(`handlerIdx = -1`, deps = -1, priorities = 0).

Dynamic tasks: `dispatch.submit()` calls `writeTaskMeta` for each
allocated slot before activation.

Workers: the pull loop calls `readTaskMeta` after `scanAndClaim`
returns a task index.  `findIdleTask` calls it per candidate.
On-demand dep execution calls it on the dep.

#### Dynamic task API

Five primitives in `sab-scheduler.mjs`.  Together with `writeTaskMeta`,
they replace the pre-reservation loop, the `taskMeta` pre-fill loop,
`activateRenderTasks`, and `packChunkData`.

**`allocDynamicSlots(views, idMapping, count)`** --- reserves `count`
contiguous slots from the dynamic pool.  Returns the base index.
Advances `idMapping.nextDynamic` and updates `taskCount` in the SAB
so workers scan the new slots.  Does not write metadata or edges.

```js
export function allocDynamicSlots(views, idMapping, count) {
  const base = idMapping.DYNAMIC_BASE + idMapping.nextDynamic;
  if (base + count > MAX_TASKS)
    throw new Error(`dynamic tasks exceed MAX_TASKS`);
  idMapping.nextDynamic += count;
  const newCount = base + count;
  if (newCount > Atomics.load(views.taskCount, 0))
    Atomics.store(views.taskCount, 0, newCount);
  return base;
}
```

**`wireDynamicEdges(views, edges)`** --- appends successor edges for
dynamic tasks to the global `succList`.  Each entry in `edges` is
`{ from, to: [succIdx, ...] }`.  Called once after all slots are
allocated and metadata written.  Each `from` must have no prior
successors (`succCount === 0`); to extend a task that already has
static successors, use `appendDynamicSuccessors` below.

```js
export function wireDynamicEdges(views, edges) {
  let edgePos = Atomics.load(views.edgeCount, 0);
  for (const { from, to } of edges) {
    if (edgePos + to.length > MAX_EDGES)
      throw new Error(`dynamic edges exceed MAX_EDGES`);
    Atomics.store(views.succOffset, from, edgePos);
    Atomics.store(views.succCount,  from, to.length);
    for (const s of to) views.succList[edgePos++] = s;
  }
  Atomics.store(views.edgeCount, 0, edgePos);
}
```

**`appendDynamicSuccessors(views, edges)`** --- extends a task's
successor list with new dynamic successors.  Relocates the task's
existing successors to the end of `succList` (the old slots become
dead space) so the contiguous-range invariant
`succOffset[t]..succOffset[t]+succCount[t]` holds.  Used when a
static task needs to fan out to dynamically-registered successors
--- specifically `prepPageDirs → flush:0..N-1` while preserving
`prepPageDirs → writeAssets`.

```js
export function appendDynamicSuccessors(views, edges) {
  let edgePos = Atomics.load(views.edgeCount, 0);
  for (const { from, to } of edges) {
    const oldOff = Atomics.load(views.succOffset, from);
    const oldCnt = Atomics.load(views.succCount,  from);
    const total  = oldCnt + to.length;
    if (edgePos + total > MAX_EDGES)
      throw new Error(`dynamic edges exceed MAX_EDGES`);
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
```

**`setDepCount(views, idx, count)`** --- sets a task's predecessor
count.  Used for join barriers whose dep count is not known at
allocation time.

```js
export function setDepCount(views, idx, count) {
  Atomics.store(views.depCount, idx, count);
}
```

**`activateDynamicTasks(views, base, count)`** --- sets status to
READY for `count` tasks starting at `base`.  Replaces
`activateRenderTasks`.  Only activates tasks whose current `depCount`
is 0 (tasks with unsatisfied predecessors stay NOT_READY and are
activated later by `onTaskDone`).

```js
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
```

This is more general than `activateRenderTasks` (which assumed all
tasks have `depCount = 0`).  `flush:i` tasks have `depCount = 1`
(gated on `render:i`), so they stay NOT_READY and are activated by
`onTaskDone` when their `render:i` completes.

**`packPayloads(views, base, payloads)`** --- JSON-serializes each
payload, concatenates into one `SharedArrayBuffer`, and writes
per-task `payloadOffset` / `payloadLength` into the scheduling SAB.
Replaces `packChunkData`.

```js
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
```

Indexed by `base + i` (= `taskIdx`), not by a separate chunk index.
Tasks with no payload (flush, static tasks) have `payloadLength = 0`.

#### Priority-aware `scanAndClaim`

Replace the first-match scan with a best-match scan.  `priority` is
immutable after task registration, so it can be read without
`Atomics` (plain array access).

```js
export function scanAndClaim(views, myLane) {
  const count = Atomics.load(views.taskCount, 0);
  while (true) {
    const start = Atomics.load(views.firstReady, 0);
    let bestIdx = -1, bestPri = -1;   // -1 is below valid range (0+); any real task wins
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
    // CAS lost: retry full scan.
  }
}
```

**Cost.**  The scan becomes O(taskCount - firstReady) instead of
O(first-READY), but with MAX_TASKS = 512 and mostly NOT_READY or
DONE slots, the difference is microseconds.  The CAS retry
terminates quickly: the claimed task is no longer READY, so the next
scan finds the second-best.

**Priority assignment.**  `render:i` tasks get priority 0 (default).
`flush:i` tasks get priority 1.  When both a `flush:i` and a
`render:j` are READY on the same worker, the flush runs first ---
clearing the stash before the next render fills it.

#### Per-chunk `flush:i` design

Replace the single `unique_per_worker` `flush` task with N dynamic
`flush:i` tasks, one per render chunk:

- `depCount = 1`, gated on `render:i` --- becomes READY when
  `render:i` completes.
- `pin_to_predecessor = render:i` --- runs on the worker that
  rendered the chunk, so the stashed HTML is local.
- `priority = 1` --- picked before any render task (priority 0)
  when both are READY on the same worker.
- Successor edge to `flushJoin` --- the join fires when all N
  flush tasks complete.

**FIFO stash invariant.**  The worker-local `_pageStash` flat array
is replaced by a FIFO queue `_pendingFlush`.  The `render` handler
pushes one batch; the `flush` handler shifts one batch.  The priority
mechanism guarantees the queue depth is always exactly 1 when `flush`
runs and exactly 0 afterward.

Proof: the pull loop is sequential --- a worker awaits one handler at
a time.  After `render:i` completes on worker W, `onTaskDone` runs
synchronously, decrementing `flush:i`'s dep count to 0 and setting it
READY with affinity pinned to W.  Worker W then calls `scanAndClaim`.
`flush:i` (priority 1, pinned to W) is preferred over any remaining
`render:j` (priority 0).  So the next task W executes is `flush:i`,
which shifts the single queued batch.  No second render can
interleave.

#### Graph changes

```
render:i [W]  (stashes pages locally; delta carries renderedContent + offlineMisses only)
    render:i.submit()  merges renderedContent into state.pages on main
       |
       |--- [successor edge] --→  renderJoin [M]  (pure barrier, no-op execute)
       |
       +--- [successor edge] --→  flush:i [W, pin_to_predecessor, priority: 1]
                                     writes stashed html       → _site/<destPath>
                                     writes stashed offlineHtml → _site-offline/<destPath>
                                        |
                                        +--- [successor edge] --→  flushJoin [M]
                                                aggregates write stats from all flush:i results

renderJoin + prepDest                              → searchData [M]

flushJoin + mermaid + prepPageDirs + highlighterInit → writeAssets [M]

flushJoin + searchData + deriveRedirects + deriveSitemap → writeAux [M]

writeAux + writeAssets                             → writeOffline [M]

flushJoin + mermaid + resolveBookChapters          → writePdf [M]
```

`searchData` depends on `renderJoin` (not `flushJoin`): it needs
`renderedContent` in memory, which requires all `render:i.submit()`
calls to have run.  `renderJoin` provides that guarantee --- it
becomes READY only after all `render:i` are DONE, and by that point
the main thread has processed every `render:i` result message (FIFO
property of worker-to-main postMessage: each worker's render-done
messages precede its flush-done messages, and `_onWorkerDone`
processes them in order).

#### `dispatch.submit()` redesign

The single orchestration point.  All render- and flush-specific
knowledge lives here --- the scheduler sees only generic dynamic tasks.

```js
submit(out, _state, scheduler) {
  const N = out.chunks.length;
  const views = scheduler._views;
  const idMap = scheduler._idMapping;
  const renderJoinIdx    = idMap.nameToIdx.get("renderJoin");
  const flushJoinIdx     = idMap.nameToIdx.get("flushJoin");
  const renderEnvInitIdx = idMap.nameToIdx.get("renderEnvInit");
  const prepPageDirsIdx  = idMap.nameToIdx.get("prepPageDirs");

  // 1. Allocate 2N slots from the generic pool.
  const renderBase = allocDynamicSlots(views, idMap, N);
  const flushBase  = allocDynamicSlots(views, idMap, N);

  // 2. Write metadata into the SAB.
  for (let i = 0; i < N; i++) {
    writeTaskMeta(views, renderBase + i, {
      handlerIdx:    HANDLERS.render,
      perWorkerDeps: [renderEnvInitIdx],
    });
    writeTaskMeta(views, flushBase + i, {
      handlerIdx: HANDLERS.flush,
      priority:   1,
    });
  }

  // 3a. Wire dynamic-only edges: render:i → [renderJoin, flush:i],
  //                              flush:i  → [flushJoin].
  const edges = [];
  for (let i = 0; i < N; i++) {
    edges.push({ from: renderBase + i, to: [renderJoinIdx, flushBase + i] });
    edges.push({ from: flushBase + i,  to: [flushJoinIdx] });
  }
  wireDynamicEdges(views, edges);

  // 3b. Append prepPageDirs → flush:0..N-1 (output directories must
  // exist before flush writes a page).  prepPageDirs already has
  // writeAssets as a static successor, so use the append helper that
  // preserves the existing edge.
  const prepToFlush = [];
  for (let i = 0; i < N; i++) prepToFlush.push(flushBase + i);
  appendDynamicSuccessors(views, [{ from: prepPageDirsIdx, to: prepToFlush }]);

  // 4. Set dep counts and pinning.
  setDepCount(views, renderJoinIdx, N);
  setDepCount(views, flushJoinIdx,  N);
  for (let i = 0; i < N; i++) {
    setDepCount(views, flushBase + i, 2);   // gated on render:i + prepPageDirs
    Atomics.store(views.pinnedTo, flushBase + i, renderBase + i);
    views.flags[flushBase + i] |= F_PIN_TO_PRED;
  }

  // 5. Register names + submit callbacks on the main-thread task map.
  for (let i = 0; i < N; i++) {
    const rName = `render:${i}`;
    idMap.nameToIdx.set(rName, renderBase + i);
    idMap.idxToName[renderBase + i] = rName;
    scheduler.tasks.set(rName, {
      expected: [],
      consolidate: true,
      ganttSection: "Render",
      submit(renderOut, state) {
        for (const r of renderOut.pages) {
          const p = state.pageByDest.get(r.destPath);
          if (!p) continue;
          p.renderedContent = r.renderedContent;
          if (r.offlineMisses !== undefined) p.offlineMisses = r.offlineMisses;
        }
      },
    });

    const fName = `flush:${i}`;
    idMap.nameToIdx.set(fName, flushBase + i);
    idMap.idxToName[flushBase + i] = fName;
    scheduler.tasks.set(fName, {
      expected: [`render:${i}`],
      consolidate: true,
      ganttSection: "Write",
      submit() {},
    });
  }

  // Populate flushJoin's expected array so _assembleInputs delivers
  // all flush results to its execute().  Reset first --- in serve mode
  // the task def object is reused across rebuilds; without the reset,
  // names from the previous build would accumulate.
  const flushJoinDef = scheduler.tasks.get("flushJoin");
  flushJoinDef.expected = [];
  for (let i = 0; i < N; i++) flushJoinDef.expected.push(`flush:${i}`);

  // 6. Pack payload, broadcast, and activate.
  const payloadSAB = packPayloads(views, renderBase, out.chunks);
  scheduler.addDynamicTasks(2 * N + 2);  // N render + N flush + renderJoin + flushJoin
  scheduler.pool.broadcastDynamicData(payloadSAB, out.sharedSAB);
  activateDynamicTasks(views, renderBase, 2 * N);  // render tasks activate (depCount 0);
                                                    // flush tasks stay NOT_READY (depCount 1)
},
```

No `_renderExpected`, no `wireJoins()`, no name-prefix matching.
The successor edges, dep counts, and pinning are all explicit data
written into the SAB before any task activates.

**Ordering guarantee.**  `wireDynamicEdges` and `setDepCount` run
before `activateDynamicTasks`.  No render task can *complete* before
its successor edges and the join dep counts are in place.

#### `allocSchedulerSAB` changes

1. **Remove the render pre-reservation loop** (current lines 98--103)
   and the `taskMeta` pre-fill loop (lines 216--223).

2. **Replace `taskMeta` construction** with `writeTaskMeta` calls in
   the existing per-task loop.  For each static task that is NOT
   `runOnMain`, resolve the handler name through `HANDLERS`, resolve
   dep names through `nameToIdx`, and call `writeTaskMeta`.  Skip
   main-thread tasks (their metadata slots stay at initialized
   defaults; workers never read them).

3. **Initialize `idMapping.nextDynamic = 0`.**  Dynamic slots start
   at `DYNAMIC_BASE` (= static task count) and grow upward.

4. **Remove `taskMeta` from the return value.**  Return
   `{ sab, views, idMapping }` only.

5. **Remove `MAX_RENDER_CHUNKS`.**  `payloadOffset` and
   `payloadLength` are sized to `MAX_TASKS`.

6. **Pre-fill the `-1`-default arrays for the whole table, not just
   the static slots.**  `SharedArrayBuffer` is zero-initialized, so
   any dynamic slot whose `affinityLane`, `pinnedTo`, or
   `completedOnLane` is not explicitly written looks pinned to lane
   0 / task 0.  Add `views.affinityLane.fill(-1)`,
   `views.pinnedTo.fill(-1)`, `views.completedOnLane.fill(-1)` (and
   `handlerIdx.fill(-1)`, `perWorkerDep.fill(-1)`,
   `expectedDep.fill(-1)` --- already required for the metadata
   arrays).  The existing per-static-task assignments become no-ops
   that overwrite with the same value.

7. **Update `verifySchedulerSAB`.**  The current verification
   function checks `taskMeta`-derived properties (dep counts, flags,
   successor edges, seed status).  Extend it to verify the new SAB
   arrays: `handlerIdx` matches `HANDLERS[def.handler]` for worker
   tasks, `perWorkerDep` / `expectedDep` match the resolved indices,
   and main-thread task slots have `handlerIdx = -1`.

#### `cpu-worker.mjs` changes

1. **Remove `taskMeta`** from the init message handler and module
   scope.

2. **Build `handlerById` at init** from the `HANDLERS` constant (or
   receive it in the init message and invert).

3. **Replace all `taskMeta[idx]` reads with `readTaskMeta(views, idx)`.**
   Five call sites: pull loop after claim (~line 311), idle-task scan
   (~line 232), nested dep check (~line 330), direct dep check
   (~line 326), idle-task execution (~line 280).

4. **Replace `meta.handler` lookup** (`handlers[meta.handler]`) with
   `handlerById[meta.handlerIdx]`.

5. **Replace `perWorkerTiming` name field** in all three send sites.
   Send `taskIdx` instead of `taskName`:

   ```js
   parentPort.postMessage({
     perWorkerTiming: true,
     taskIdx: idleTask,       // was: taskName: idleMeta.name
     timing: { start: t0, end: t1 },
     lane: myLane,
     output: idleResult,
   });
   ```

6. **Render handler: read payload from SAB.**  Replace:
   ```js
   const chunkIndex = taskIdx - idMapping.DYNAMIC_BASE;
   const offset = Atomics.load(views.chunkOffset, chunkIndex);
   const length = Atomics.load(views.chunkLength, chunkIndex);
   ```
   with:
   ```js
   const offset = Atomics.load(views.payloadOffset, taskIdx);
   const length = Atomics.load(views.payloadLength, taskIdx);
   ```
   No `DYNAMIC_BASE` arithmetic.

7. **`_pageStash` → `_pendingFlush` FIFO.**  The render handler
   pushes one batch per chunk; the flush handler shifts one batch:

   ```js
   let _pendingFlush = [];

   // In render handler, after templatePhase + offline derivation:
   const batch = [];
   for (const p of chunk) {
     if (p.html !== undefined)
       batch.push({ destPath: p.destPath, html: p.html,
                    offlineHtml: p.offlineHtml, offlineMisses: p.offlineMisses });
   }
   _pendingFlush.push(batch);

   // flush handler:
   async flush() {
     const items = _pendingFlush.shift() ?? [];
     let written = 0, offlineWritten = 0, offlineMisses = 0;
     if (!ctx.opts.dryRun) {
       let next = 0;
       const limit = Math.min(64, items.length || 1);
       const workers = Array.from({ length: limit }, async () => {
         while (next < items.length) {
           const p = items[next++];
           await fsP.writeFile(path.join(ctx.destRoot, p.destPath), p.html, "utf8");
           written++;
           if (p.offlineHtml !== undefined) {
             await fsP.writeFile(
               path.join(ctx.destRoot + "-offline", p.destPath), p.offlineHtml, "utf8");
             offlineWritten++;
           }
           offlineMisses += p.offlineMisses ?? 0;
         }
       });
       await Promise.all(workers);
     }
     return { written, offlineWritten, offlineMisses };
   },
   ```

   Reset `_pendingFlush = []` in the `msg.init` handler (serve-mode
   reuse across rebuilds).

8. **Receive `payloadSAB` via `dynamicData` message** (renamed from
   `renderData`).  Store as `_payloadSAB`.

#### `scheduler.mjs` changes

1. **Remove `taskMeta` from init message** to workers.  Send
   `{ init: true, sab, ctx, idMapping }`.

2. **Remove `_renderCount`, `_renderExpected`** fields and their
   constructor initialization.

3. **Remove `_flushCount`, `_flushStats`** fields, constructor
   initialization, and serve-mode reset.

4. **Remove the `startsWith("render:")` branch** in `_onWorkerDone`.

5. **Remove the `taskName === "flush"` branch** in
   `_onPerWorkerTiming`.

6. **Resolve task names from indices** in `_onPerWorkerTiming`.
   Replace `taskName` (received from worker) with:
   ```js
   const taskName = this._idMapping.idxToName[msg.taskIdx];
   ```

7. **Rename `dispatchRender` → `broadcastDynamicData`** (or make it
   a pass-through to `pool.broadcastDynamicData`).

8. **Summary output.**  Read flush stats from
   `this.results.get("flushJoin")` instead of `_flushStats`.

#### `renderJoin` and `flushJoin` task definitions

No `joins` field, no `wireJoins()`.  Both are plain `on_demand`
barrier tasks activated by the normal SAB dep-count mechanism:

```js
renderJoin: {
  expected: [],           // no static predecessors
  on_demand: true,
  runOnMain: true,
  execute() { return {}; },
  submit() {},
},

flushJoin: {
  expected: [],           // populated by dispatch.submit
  on_demand: true,
  runOnMain: true,
  execute(inputs) {
    let written = 0, offlineWritten = 0, offlineMisses = 0;
    for (const r of Object.values(inputs)) {
      written        += r?.written        ?? 0;
      offlineWritten += r?.offlineWritten ?? 0;
      offlineMisses  += r?.offlineMisses  ?? 0;
    }
    return { written, offlineWritten, offlineMisses };
  },
  submit() {},
},
```

`renderJoin`'s `expected` stays empty --- it has no static
predecessors, and its dep count is set dynamically by
`dispatch.submit`.  It receives no inputs.

`flushJoin`'s `expected` is populated by `dispatch.submit` with
`flush:0`..`flush:N-1`, so `_assembleInputs` delivers all flush
results to `execute(inputs)`.

Note: `flush:i` is a regular dynamic task, not `unique_per_worker`.
Its results flow through `_onWorkerDone` (the normal worker
completion path), not through `_onPerWorkerTiming`.  The worker
posts `{ done: taskIdx, output: { written, ... } }`, the main
thread stores the result, and `onTaskDone` decrements `flushJoin`'s
dep count.  When the last `flush:i` completes, `flushJoin` becomes
READY and the main thread aggregates the stats.

#### `flush` static task definition

Removed.  The single `unique_per_worker` / `run_when_idle` `flush`
entry in `TASKS` is deleted.  Per-chunk `flush:i` tasks are
registered dynamically in `dispatch.submit()`.

#### What gets deleted

| Current code | Status |
|---|---|
| `taskMeta` array in `allocSchedulerSAB` | Deleted; replaced by `writeTaskMeta` calls |
| `taskMeta` in `workerData` / init message | Deleted; workers read from SAB |
| `taskMeta` module var in `cpu-worker.mjs` | Deleted |
| `render:${i}` pre-reservation loop in `allocSchedulerSAB` | Deleted |
| `render:${i}` taskMeta pre-fill loop in `allocSchedulerSAB` | Deleted |
| `chunkOffset` / `chunkLength` SAB arrays | Replaced by `payloadOffset` / `payloadLength` |
| `MAX_RENDER_CHUNKS` constant | Deleted |
| `packChunkData` function | Replaced by `packPayloads` |
| `activateRenderTasks` function | Replaced by `activateDynamicTasks` |
| `_renderCount` / `_renderExpected` in `Scheduler` | Deleted |
| `_flushCount` / `_flushStats` in `Scheduler` | Deleted |
| `startsWith("render:")` branch in `_onWorkerDone` | Deleted |
| `taskName === "flush"` branch in `_onPerWorkerTiming` | Deleted |
| `flush` static task definition | Deleted |
| `taskIdx - idMapping.DYNAMIC_BASE` in render handler | Replaced by direct `payloadOffset[taskIdx]` |

#### Init message simplification

Workers receive:

```
{ init: true, sab, ctx, idMapping }
```

`taskMeta` is gone.  `idMapping` is retained for `DYNAMIC_BASE` (used
by `allocDynamicSlots` at build start, though workers do not need it)
and for debug/error messages.  Workers only strictly need the SAB and
`ctx`; `idMapping` can be trimmed in a future phase.

#### Edge case: worker with zero render chunks

Under high worker counts or small page sets, some workers claim no
render tasks.  No `flush:i` is pinned to them; their `_pendingFlush`
stays empty.  This is safe --- the joins count only the tasks that
exist, not the workers.

#### Files touched

| File | Changes |
|---|---|
| `sab-scheduler.mjs` | New SAB arrays (`handlerIdx`, `perWorkerDep`, `expectedDep`, `idlePriority`, `priority`, `payloadOffset`, `payloadLength`); remove `chunkOffset`, `chunkLength`, `MAX_RENDER_CHUNKS`; bump `MAX_TASKS` to 512, `MAX_EDGES` to 2048; `HANDLERS` registry; `writeTaskMeta` / `readTaskMeta`; `allocDynamicSlots` / `wireDynamicEdges` / `appendDynamicSuccessors` / `setDepCount` / `activateDynamicTasks` / `packPayloads`; `scanAndClaim` rewrite (priority + CAS retry); whole-array `-1` pre-fill for `affinityLane` / `pinnedTo` / `completedOnLane` / `handlerIdx` / `perWorkerDep` / `expectedDep`; remove render pre-reservation + taskMeta pre-fill; remove `packChunkData` + `activateRenderTasks` |
| `scheduler.mjs` | Remove `_renderCount`, `_renderExpected`, `_flushCount`, `_flushStats`; remove `startsWith("render:")` in `_onWorkerDone`; remove `taskName === "flush"` in `_onPerWorkerTiming`; resolve task names from indices in `_onPerWorkerTiming`; remove `taskMeta` from init message; rename `dispatchRender`; summary reads flush stats from `flushJoin` result |
| `tbdocs.mjs` | Remove `flush` static task def; `renderJoin` / `flushJoin` lose counter comments; `flushJoin.execute(inputs)` aggregates per-chunk write stats; `dispatch.submit()` rewritten per §dispatch.submit() redesign (including the `prepPageDirs → flush:i` append + `depCount = 2`); `GANTT_SECTION`: remove `flush`, `flushJoin` entry stays; summary output reads `flushJoin` result |
| `cpu-worker.mjs` | Remove `taskMeta` module var and init handling; build `handlerById`; replace all `taskMeta[idx]` with `readTaskMeta`; replace `meta.handler` with `handlerById[meta.handlerIdx]`; `perWorkerTiming` sends `taskIdx` not `taskName`; render handler reads `payloadOffset`/`payloadLength` directly; `_pageStash` → `_pendingFlush` FIFO; receive `dynamicData` message |
| `worker-pool.mjs` | `broadcastRenderData` → `broadcastDynamicData`; remove `taskMeta` from init message |

#### Expected savings

Four sources:

1. **Distributed I/O.**  Writes interleave with renders instead of
   clustering at the tail.  Each `render:i` is immediately followed
   by its `flush:i` on the same worker; libuv file-write operations
   from different workers overlap with CPU-bound renders on other
   workers.

2. **Reduced structured-clone cost.**  Unchanged from Phase 12:
   `html` and `offlineHtml` stay on the worker, never crossing the
   `postMessage` boundary.

3. **Scheduler simplification.**  ~60 lines of special-case counters,
   name-matching branches, pre-reservation loops, and `taskMeta`
   construction are replaced by generic primitives (`writeTaskMeta` /
   `readTaskMeta`, `allocDynamicSlots` / `wireDynamicEdges` /
   `appendDynamicSuccessors` / `activateDynamicTasks`, `packPayloads`).
   The scheduler has zero knowledge of what any task does.

4. **Extensibility.**  Any future fan-out pattern (`foo:0..N` with a
   `fooJoin` barrier) uses the same primitives --- allocate slots,
   write metadata, wire edges, set dep counts, activate.  No
   scheduler changes needed.

#### Verification

`build.bat && check.bat` clean (zero intra-site issues; the 8
pre-existing PDF broken links from `book.html` are unchanged).  The
Gantt chart shows:

- `flush:i` bars interleaved with `render:i` bars on each worker
  lane (consolidated via `consolidate: true`), instead of a single
  `flush` bar at the tail.
- `renderJoin` and `flushJoin` activated by dep-count (no manual
  `Atomics.store(status, joinIdx, READY)` outside of
  `sabOnTaskDone`).
- `flushJoin` result carrying aggregated write stats (`written`,
  `offlineWritten`, `offlineMisses`) matching the previous
  single-`flush` totals.
- Render section consolidated wall-clock dropped substantially
  versus the bug condition where every worker except `w0` sat idle
  (see "Outcome" at the top of this section for the two divergences
  that surfaced during implementation).

### Phase 16: Persistent pool and `survives_reset`

**Suggested model:** Opus.

**Motivation.**  In serve mode, every `runBuild()` call creates a
fresh `WorkerPool` (spawning N worker threads) and destroys it
afterward.  Each rebuild pays:

1. **Cold boot** (~100--200 ms): thread creation, `cpu-worker.mjs`
   module loading, V8 JIT compilation of the worker harness.
2. **`warmInit` scheduling overhead**: the on-demand dep chain
   (`render:i` → `renderEnvInit` → `warmInit`) fires on every build.
   `initHighlighter()` is a module-scope singleton and returns
   instantly after the first call, but the scheduling machinery
   (claim `render:i`, discover unsatisfied dep, release, execute
   `warmInit`, re-claim) still runs on every worker on every build.
3. **V8 JIT de-optimization**: fresh workers lose the optimized code
   from the previous build's hot paths (render, template,
   offline-rewrite).

Pool persistence was part of the original SAB scheduler design
(§Build start sequence step 2, §Serve mode) but was never
implemented --- `runBuild()` unconditionally creates and destroys the
pool.  This phase implements the reuse path and adds a generic
`survives_reset` flag so per-worker warm-up tasks are skipped on
rebuilds.

#### Design

Two pieces:

**1. Persistent pool.**  `runBuild()` accepts an optional `pool`
parameter.  When provided, it reuses the existing pool and skips
`pool.destroy()` at the end.  `serve.mjs` creates the pool once at
startup and passes it to every `runBuild()` call.  A convenience
factory `createWorkerPool()` is exported from `tbdocs.mjs` so the
pool-creation logic (worker count, worker URL) stays centralized.

The `WorkerPool` gains a `_buildCount` counter (initialized to 0,
incremented in `sendInit()`).  `runBuild()` reads
`pool._buildCount > 0` to determine whether this is a rebuild.

**2. `survives_reset` flag.**  A new boolean on task definitions.
Semantics: for `unique_per_worker` tasks with this flag, the
handler's side effects are build-independent (e.g. loading a WASM
module) and persist in the worker's memory across init messages.
On a rebuild (`pool._buildCount > 0`), `allocSchedulerSAB`
pre-fills their `perWorkerDone` slots to 1 for all active lanes.

Effect: the pull loop's dep check
(`perWorkerDone[task * MAX_LANES + lane] === 1`) passes
immediately.  The handler never fires.  The idle scan
(`findIdleTask`) skips the task (the `perWorkerDone !== 0`
short-circuit already exists).  Downstream `perWorkerDeps` chains
(e.g. `renderEnvInit` depending on `warmInit`) see the dep as
satisfied and proceed without delay.

`survives_reset` is only meaningful on `unique_per_worker` tasks.
Declaring it on a non-`unique_per_worker` task is a definition
error (caught by `allocSchedulerSAB`).  The flag is a declaration
by the task author that the handler's side effects do not depend on
per-build state --- the scheduler trusts it.

The task definition:

```js
warmInit: {
  expected: [],
  on_demand: true,
  unique_per_worker: true,
  run_when_idle: true,
  survives_reset: true,     // new
  handler: "warmInit",
  submit() {},
},
```

`renderEnvInit` does NOT get the flag --- it depends on per-build
data (link tables, config, site paths) and must re-run on each build.

#### Why no worker-side changes are needed

The init message handler (`cpu-worker.mjs` lines 201--209) already
resets only per-build state (`_payloadSAB`, `_sharedSAB`,
`_renderEnv`, `_pendingFlush`).  Module-scope singletons (the Shiki
highlighter inside `highlight.mjs`) persist naturally across init
messages because the worker thread and its module state survive.
The `perWorkerDone` pre-fill in the SAB is the only mechanism needed
to prevent the handler from re-executing --- the worker does not need
to know about `survives_reset`.

#### Why the pull loop exits cleanly between builds

When `_finish()` fires on the main thread, it sets `buildDone = 1`
in the SAB and calls `Atomics.notify(views.notify, 0, Infinity)`.
Workers that are sleeping in `Atomics.wait` wake immediately;
workers mid-iteration reach the `buildDone` check on the next loop
cycle.  All workers return from `pullLoop()` and re-enter their
event loop.

The next build's init message is sent after `runBuild()` returns (in
`serve.mjs`, after logging and Gantt injection).  Workers process the
init message on their now-idle event loops, create views over the new
SAB, and call `pullLoop()` again.  No overlap with the previous
`pullLoop()` instance is possible --- `pullLoop()` has already
returned before the init message is processed.

The 300 ms debounce in `serve.mjs` provides ample margin, but the
sequencing is safe even without it: `runBuild()` is `await`ed, so
the next `runBuild()` call (and its init messages) cannot begin until
the previous one has resolved.

#### Dependency chain correctness

`renderEnvInit` has `perWorkerDeps: ["warmInit"]`.  On a rebuild,
`warmInit`'s `perWorkerDone` is pre-filled to 1.  The pull loop's
dep check (cpu-worker.mjs line 305) reads
`perWorkerDone[warmInitIdx * MAX_LANES + myLane] === 1` and
proceeds.  `renderEnvInit` runs on-demand as before, using the same
handler --- which correctly rebuilds `_renderEnv` from the fresh
`sharedSAB` payload.  No chain short-circuiting beyond `warmInit`
occurs.

#### `runBuild()` changes (`tbdocs.mjs`)

Accept an optional `pool` in the `opts` parameter.  When present,
skip pool creation and destruction.  Detect rebuild mode from the
pool's build count.  Skip boot-timing injection on rebuilds (the
cold-boot timings are from the first build and stale).

```js
export async function runBuild(opts) {
  const buildStart = Date.now();
  const { src, dest } = opts;
  const srcRoot  = path.resolve(process.cwd(), src);
  const destRoot = path.resolve(dest ?? path.join(srcRoot, "_site"));

  const ctx = { srcRoot, destRoot, opts, workerCount };

  const externalPool = opts.pool ?? null;
  const rebuild = externalPool?._buildCount > 0;

  const { sab, views, idMapping } =
    allocSchedulerSAB(TASKS, workerCount, { rebuild });
  verifySchedulerSAB(TASKS, views, idMapping);

  const pool = externalPool ?? new WorkerPool(workerCount, CPU_WORKER_URL);
  const scheduler = new Scheduler({ pool, tasks: TASKS, views, idMapping,
                                     ganttSections: GANTT_SECTION });

  pool.onWorkerDone      = (msg) => scheduler._onWorkerDone(msg);
  pool.onWorkerError     = (msg) => scheduler._onWorkerError(msg);
  pool.onPerWorkerTiming = (msg) => scheduler._onPerWorkerTiming(msg);
  pool.onMainTaskReady   = ()    => scheduler._onMainTaskReady();

  pool.sendInit(sab, ctx, idMapping);

  let results;
  try {
    results = await scheduler.start(ctx);
  } finally {
    if (!externalPool) await pool.destroy();
  }

  // ... existing summary logging ...

  // Boot timings: only inject on first build.
  if (!rebuild) {
    for (const bt of pool.bootTimings) {
      scheduler.timings.set(`${bt.type}:w${bt.lane}`, {
        start: bt.start, end: bt.end,
        workerStart: bt.start, workerEnd: bt.end,
        lane: bt.lane, ganttSection: "Boot",
      });
    }
  }

  // ... Gantt injection, drift guard ...
}
```

Export a pool factory so `serve.mjs` does not import `WorkerPool`
or `CPU_WORKER_URL` directly:

```js
export function createWorkerPool() {
  return new WorkerPool(workerCount, CPU_WORKER_URL);
}
```

Add `survives_reset: true` to the `warmInit` task definition.

#### `allocSchedulerSAB` changes (`sab-scheduler.mjs`)

Third parameter gains `{ rebuild }`:

```js
export function allocSchedulerSAB(taskDefs, workerCount, opts = {}) {
  // ... existing allocation logic (indices, successor list,
  //     depCount, flags, succOffset/succCount/succList, status) ...

  // Validate: survives_reset only on unique_per_worker tasks.
  for (const [name, def] of Object.entries(taskDefs)) {
    if (def.survives_reset && !def.unique_per_worker)
      throw new Error(
        `"${name}" has survives_reset without unique_per_worker`);
  }

  // Pre-fill perWorkerDone for surviving tasks on rebuilds.
  if (opts.rebuild) {
    for (const [name, def] of Object.entries(taskDefs)) {
      if (!def.survives_reset || !def.unique_per_worker) continue;
      const idx = nameToIdx.get(name);
      for (let lane = 0; lane < workerCount; lane++) {
        views.perWorkerDone[idx * MAX_LANES + lane] = 1;
      }
    }
  }

  // ... existing writeTaskMeta loop and return ...
}
```

The pre-fill runs after all per-task arrays are written and before
the return.  `verifySchedulerSAB` does not check `perWorkerDone`,
so no changes needed there.

#### `serve.mjs` changes

Create the pool once at startup.  Pass it to every `runBuild()`
call.  Destroy on shutdown.

```js
import { runBuild, createWorkerPool } from "./tbdocs.mjs";

export async function runServe(opts) {
  // ... existing setup (srcRoot, destRoot, port) ...

  const pool = createWorkerPool();

  // Initial build
  try {
    await runBuild({ ...opts, dest: destRoot,
                     skipOffline: true, skipPdf: true, pool });
  } catch (err) {
    console.error("serve: initial build failed:", err.message);
    await pool.destroy();
    process.exit(1);
  }

  // ... existing server + SSE setup ...

  async function fire() {
    if (running) { pending = true; return; }
    running = true;
    const files = [...changedFiles].sort();
    changedFiles.clear();
    console.log(`\nChanged: ${files.join(", ")}`);
    try {
      await runBuild({ ...opts, dest: destRoot,
                       skipOffline: true, skipPdf: true, pool });
      notifyReload();
    } catch (err) {
      console.error("rebuild failed:", err.message);
    } finally {
      running = false;
      if (pending) { pending = false; schedule(); }
    }
  }

  // ... existing watcher ...

  // Shutdown
  process.on("SIGINT", () => {
    console.log("serve: shutting down.");
    ac.abort();
    for (const res of sseClients) {
      try { res.end(); } catch {}
    }
    sseClients.clear();
    pool.destroy();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 100).unref();
  });

  // ...
}
```

#### `WorkerPool` changes (`worker-pool.mjs`)

Add `_buildCount`, incremented in `sendInit()`:

```js
export class WorkerPool {
  constructor(size, workerUrl) {
    // ... existing fields ...
    this._buildCount = 0;
  }

  sendInit(sab, ctx, idMapping) {
    for (const w of this._workers) {
      w.postMessage({ init: true, sab, ctx, idMapping });
    }
    this._buildCount++;
  }
}
```

#### Edge cases

1. **First build in serve mode.**  `pool._buildCount === 0` →
   `rebuild = false`.  Workers run `warmInit` normally.  Pool is
   initialized.  Identical to current single-build behavior.

2. **Subsequent rebuilds.**  `pool._buildCount > 0` →
   `rebuild = true`.  `warmInit`'s `perWorkerDone` pre-filled.
   Workers skip it.  `renderEnvInit` re-runs with fresh data.

3. **Single-build mode (`build.bat`).**  No `pool` option.
   `externalPool = null`.  Pool created, used, destroyed.
   `rebuild = false`.  No change from current behavior.

4. **Worker crash during previous build.**  The pool does not
   respawn crashed workers.  On the next rebuild, `perWorkerDone` is
   pre-filled for the dead worker's lane.  No task is scheduled to
   that lane (the worker thread does not exist), so the pre-fill is
   harmless.  The render fan-out distributes across surviving
   workers.

5. **Build failure in serve mode.**  `runBuild()` rejects; the
   `finally` block does NOT destroy an external pool.  `serve.mjs`
   logs the error and waits for the next file change, which triggers
   a fresh `runBuild()` with the same pool.  Workers have already
   exited their pull loops (either from `buildDone = 2` on abort, or
   from the failed task's error propagation), and re-enter when the
   next init message arrives.

6. **Future `survives_reset` tasks.**  Any `unique_per_worker` +
   `on_demand` task that loads build-independent state (e.g. a WASM
   module, a compiled grammar, a vendored dataset) can declare
   `survives_reset: true`.  The mechanism is generic.

#### Interaction with Phase 15

Phase 15 landed.  `taskMeta` is gone --- task metadata lives in SAB
arrays written by `writeTaskMeta` / `readTaskMeta`.  The
`perWorkerDone` pre-fill loop added here operates on a separate SAB
array, independent of the task metadata layout.  The
`def.survives_reset` read stays in the JS task-definition loop.  No
conflict.

Phase 15 also renamed `_pageStash` to `_pendingFlush` (FIFO queue,
one batch per render chunk) and `_chunkDataSAB` to `_payloadSAB`.
The init handler in `cpu-worker.mjs` (lines 201--209) resets
`_payloadSAB`, `_sharedSAB`, `_renderEnv`, and `_pendingFlush` ---
exactly the per-build state.  Module-scope singletons (the Shiki
highlighter) persist naturally, so the `survives_reset` mechanism
works as designed.

#### Files touched

| File | Changes |
|---|---|
| `tbdocs.mjs` | `runBuild()`: accept `pool` option, detect rebuild, skip pool create/destroy, skip boot timings on rebuild; `warmInit` task def: add `survives_reset: true`; export `createWorkerPool()` factory |
| `sab-scheduler.mjs` | `allocSchedulerSAB`: accept `opts` parameter; validate `survives_reset` + `unique_per_worker` constraint; pre-fill `perWorkerDone` for surviving tasks in rebuild mode |
| `serve.mjs` | Create pool once at startup via `createWorkerPool()`; pass to `runBuild()`; destroy on shutdown |
| `worker-pool.mjs` | Add `_buildCount` counter, incremented in `sendInit()` |
| `cpu-worker.mjs` | No changes |
| `scheduler.mjs` | No changes |

#### Expected savings

Two sources:

1. **Cold boot elimination.**  ~100--200 ms per rebuild (worker
   thread creation, module loading, V8 compilation).  This is the
   dominant saving.

2. **`warmInit` scheduling overhead.**  Per worker per rebuild: one
   claim--release cycle on the first render chunk, one on-demand dep
   resolution, one `initHighlighter()` call (instant but not free).
   Roughly ~5--10 ms total across all workers.  Small, but the
   architectural benefit is that the on-demand dep chain is never
   entered for `warmInit` --- downstream tasks see the dep as already
   satisfied at SAB allocation time.

A secondary benefit: V8 JIT-optimized code persists across rebuilds.
The hot paths (render, template, offline-rewrite) stay in optimized
tier after the first build, rather than being re-compiled from
scratch on each rebuild.

#### Verification

`build.bat && check.bat` clean.  Single-build mode unchanged.

Serve mode (`serve.bat`):

- First build: timing summary shows normal `warmInit:wN` entries
  and `cold:wN` boot entries.
- Subsequent rebuilds: `warmInit:wN` entries absent (handlers never
  ran).  `cold:wN` entries absent (no boot).  `renderEnvInit:wN`
  entries present (re-runs with fresh data).
- Total rebuild time drops by ~100--200 ms (cold boot) on a 16-core
  machine.
- All rebuilds produce byte-identical output to fresh builds.

### Phase 17: Distribute search-data derivation to render workers

**Suggested model:** Sonnet.

**Motivation.**  `searchData` runs on the main thread after `renderJoin`
and takes 100--200 ms (dev machine to CI).  It sits on the critical
path to `writeAux` -> `writeOffline`.  The task does two things:
(1) derive search entries from `renderedContent` (CPU-heavy HTML
parsing, splitting on headings, stripping tags, sanitizing ---
~80--90% of the runtime), and (2) render to JSON and write one file
(~10--20% of the runtime).  The derivation is per-page with zero
cross-page dependencies, and each render worker already has the
rendered content and site config.  Moving the derivation onto workers
eliminates ~80--170 ms from the main-thread critical path.

#### Design

Two pieces: derive on workers, consolidate on main.

**Worker side.**  The `render` handler in `cpu-worker.mjs` calls
`deriveSearchEntries(chunk, site)` after render + template + offline,
producing per-chunk search entries.  The entries are returned
alongside the page delta, stripped of the `sourcePage` field (worker
pages are clones, not master refs) and the `i` field (chunk-local
indices are meaningless; the main thread assigns global indices during
consolidation).  Each entry is five short strings (`doc`, `title`,
`content`, `url`, `relUrl`) --- the structured-clone cost is
negligible (~400 KB total across all workers for ~2000 entries).

The worker already has everything `deriveSearchEntries` needs:

- `page.renderedContent` --- set by `renderPhase`.
- `page.frontmatter.title`, `page.frontmatter.search_exclude`,
  `page.permalink` --- on the chunk pages.
- `site.config.search.heading_level`, `site.config.baseurl` --- in
  the shared SAB payload (via `siteData.config`).

**Import.**  `cpu-worker.mjs` adds
`import { deriveSearchEntries } from "./search.mjs"`.  The transitive
import of `stripHtml` from `seo.mjs` and `writeFileMkdirp` from
`write.mjs` is harmless --- workers have full Node.js access and only
the pure-compute `deriveSearchEntries` function is called.

**Main-thread merge.**  `SharedState` gains a `searchChunks` field
(initialized to `[]`).  `dispatch.submit()` pre-allocates it as
`new Array(N)` so each `render:i.submit()` can assign by chunk index:
`state.searchChunks[chunkIdx] = renderOut.searchEntries`.  Indexed
assignment preserves page order across the chunks --- chunk 0's
entries come before chunk 1's, matching the serial iteration order
over `state.pages`.  By the time `renderJoin` fires, every slot is
populated.

**`searchData` task.**  Dependencies unchanged: `renderJoin` +
`prepDest`.  The `execute()` body changes from "derive from
state.pages + write" to "consolidate from state.searchChunks + write":

1. Flatten `state.searchChunks` into a single array (`.flat()`).
2. Assign sequential `i` values (0, 1, 2, ...).
3. Map through `renderEntryString` (the existing per-entry JSON
   formatter, newly exported from `search.mjs`).
4. Join, wrap, write.

The CPU-heavy work (steps inside `deriveSearchEntries`:
`extractSections`, `stripHtml`, `sanitiseContent`) is gone from the
main thread.  What remains is a linear scan over ~2000 small objects +
`JSON.stringify` per entry + one file write --- estimated ~5--15 ms.

**`searchData` output shape.**  Unchanged: `{ entries: number,
json: string }`.  Downstream consumers (`writeAux`, `writeOffline`)
see no difference.

**`search.mjs` changes.**  Export `renderEntryString` (currently
file-local) so the consolidated `searchData.execute` can import it.
Add a `writeSearchDataFromChunks(searchChunks, destRoot)` convenience
that encapsulates the consolidate + renumber + render + write
sequence, keeping the logic in `search.mjs` alongside the existing
`writeSearchData`.

#### Data flow

```
render:i [W]
   ├── renderPhase + templatePhase + offline  (existing)
   ├── deriveSearchEntries(chunk, site)       ← NEW
   └── return { pages: [...], searchEntries: [...] }
              │
              ▼
render:i.submit() [M]
   ├── merge renderedContent + offlineMisses into state.pages  (existing)
   └── state.searchChunks[i] = renderOut.searchEntries         ← NEW
              │
              ▼
renderJoin [M]  (barrier — all searchChunks slots populated)
              │
              ▼
searchData [M]
   ├── flatten state.searchChunks        (~5 ms)
   ├── assign sequential i
   ├── renderEntryString per entry
   ├── write search-data.json
   └── return { entries, json }
```

#### Ordering guarantee

The serial `deriveSearchEntries` iterates `state.pages` in master-
array order, producing entries with sequential `i` values (0, 1,
2, ...).  The distributed version preserves this ordering:

1. `chunkPages()` slices `state.pages` into consecutive, non-
   overlapping chunks: chunk 0 = pages[0..k), chunk 1 = pages[k..2k),
   etc.  Within each chunk, page order matches the master.
2. `deriveSearchEntries(chunk, site)` iterates the chunk in order,
   producing entries in the same relative order as the serial version.
3. `state.searchChunks[i]` uses indexed assignment keyed by chunk
   index, not push order.  `searchChunks.flat()` concatenates in
   index order: chunk 0, chunk 1, ..., chunk N-1.
4. Sequential `i` assignment after flattening produces the same
   numbering as the serial loop.

Result: byte-identical `search-data.json`.

#### Changes

**`cpu-worker.mjs`.**  Import `deriveSearchEntries` from
`./search.mjs`.  In the `render` handler, after the offline-derivation
block and the `_pendingFlush.push(batch)` line (Phase 15 added the
FIFO stash there), derive the per-chunk search entries and include
them in the return value:

```js
// Per-chunk search entries (consolidated on main during searchData).
// Drop `sourcePage` (workers hold cloned page objects, not master
// refs) and `i` (chunk-local indices are meaningless; main assigns
// global indices during consolidation).
const searchEntries = deriveSearchEntries(chunk, env.site)
  .map(e => ({ doc: e.doc, title: e.title, content: e.content,
               url: e.url, relUrl: e.relUrl }));

return {
  pages: chunk.map(p => ({
    destPath:        p.destPath,
    renderedContent: p.renderedContent,
    offlineMisses:   p.offlineMisses,
  })),
  searchEntries,
};
```

The five-field strip on each entry is what keeps the structured-clone
cost negligible (~400 KB total across all workers for ~2000 entries).

**`search.mjs`.**  Export `renderEntryString`.  Add:

```js
export async function writeSearchDataFromChunks(searchChunks, destRoot) {
  const allEntries = searchChunks.flat();
  for (let idx = 0; idx < allEntries.length; idx++) allEntries[idx].i = idx;
  const body = allEntries.map(renderEntryString).join(",");
  const json = `{` + body + `\n}\n`;
  await writeFileMkdirp(
    path.join(destRoot, "assets/js/search-data.json"), json);
  return { entries: allEntries.length, json };
}
```

**`scheduler.mjs`.**  Add `searchChunks = []` to `SharedState`.

**`tbdocs.mjs`.**  Four changes, all in `dispatch.submit()` and the
`searchData` task def:

1. Import: `writeSearchDataFromChunks` from `./search.mjs` (replaces
   the existing `writeSearchData` import --- the main-thread helper
   is no longer called).

2. At the top of `dispatch.submit()`, after `const N = out.chunks.length;`
   (the existing first statement in Phase 15's redesigned submit),
   pre-allocate the chunk array on `SharedState`:

   ```js
   scheduler.state.searchChunks = new Array(N);
   ```

   Pre-allocation is required: each `render:i.submit()` writes by
   chunk index, not push order, so `searchChunks.flat()` later
   produces entries in `pages` order regardless of completion order.

3. Inside the existing `for (let i = 0; i < N; i++)` loop in
   `dispatch.submit()` (the one that registers the per-chunk
   `render:${i}` task defs via `scheduler.tasks.set(rName, ...)`),
   extend the `submit(renderOut, state)` body with one indexed
   assignment.  `i` is already in scope via `let`, so no `chunkIdx`
   capture is needed:

   ```js
   scheduler.tasks.set(rName, {
     expected: [],
     consolidate: true,
     ganttSection: "Render",
     submit(renderOut, state) {
       for (const r of renderOut.pages) {
         const p = state.pageByDest.get(r.destPath);
         if (!p) continue;
         p.renderedContent = r.renderedContent;
         if (r.offlineMisses !== undefined) p.offlineMisses = r.offlineMisses;
       }
       state.searchChunks[i] = renderOut.searchEntries;   // NEW
     },
   });
   ```

   The `flush:${i}` registration in the same loop is unchanged.

4. `searchData.execute()` (currently calls `writeSearchData(state.pages,
   state.site, ctx.destRoot)`):

   ```js
   async execute(_, ctx, state) {
     if (ctx.opts.dryRun) return { entries: 0, json: "" };
     return writeSearchDataFromChunks(state.searchChunks, ctx.destRoot);
   },
   ```

   The `expected: ["renderJoin", "prepDest"]` dependency list is
   unchanged --- `renderJoin` still provides the "all render:i deltas
   merged" guarantee that gates the consolidation.

#### Files touched

| File | Changes |
|---|---|
| `cpu-worker.mjs` | Import `deriveSearchEntries` from `search.mjs`. In `render` handler, call it after offline pass, add `searchEntries` (sans `sourcePage`, sans `i`) to return value. |
| `search.mjs` | Export `renderEntryString`. Add `writeSearchDataFromChunks()`. |
| `scheduler.mjs` | Add `searchChunks = []` to `SharedState`. |
| `tbdocs.mjs` | Import `writeSearchDataFromChunks`. `dispatch.submit`: pre-allocate `state.searchChunks`. `render:i.submit`: store `searchEntries` by chunk index. `searchData.execute`: call `writeSearchDataFromChunks` instead of `writeSearchData`. |

#### Interaction with other phases

- **Phase 15 (generic dynamic tasks) --- LANDED.**  Phase 15
  rewrote `dispatch.submit()` into its current form:
  `allocDynamicSlots` for 2N render + flush slots, `writeTaskMeta`
  via the SAB metadata API, per-iteration `scheduler.tasks.set(rName,
  ...)` for each `render:${i}` / `flush:${i}` def, and
  `activateDynamicTasks` at the end.  Phase 17's edits drop straight
  into that structure: pre-allocate `state.searchChunks` once after
  `N` is known, and add one indexed assignment inside the existing
  per-chunk `render:${i}` submit closure.  No other Phase 15 surface
  (the generic payload SAB, the priority-aware claim, the FIFO
  `_pendingFlush`) is affected --- the worker's `searchEntries`
  ride out in the same `{ done, output }` message that already
  carries the render delta.

- **Phase 16 (persistent pool).**  Pool persistence is orthogonal.
  `searchChunks` lives on `SharedState`, which is fresh per build
  (new `Scheduler` = new `SharedState`).  No interaction.

- **Phase 18 (per-page SEO on workers).**  Phase 18 adds
  `computeChunkSeo` between `renderPhase` and `templatePhase` in the
  same render handler that Phase 17 extends.  Both are independent
  per-page transforms with no data dependency on each other; they
  compose without conflict regardless of landing order.

- **`_triage.mjs` / `_diff.mjs`.**  These dev tools call
  `deriveSearchEntries` directly on `state.pages` on the main thread.
  They are not part of the build pipeline and are unaffected.  The
  `sourcePage` field they rely on is only produced by main-thread
  calls to `deriveSearchEntries`, not by the worker path.

#### Expected savings

The derivation distributes across N workers in parallel with render +
template + offline.  Per-worker added time is
~(100--200 ms) / N.

| Machine | Per-worker added | Main-thread searchData | Net critical-path saving |
|---|---|---|---|
| 16-core (CI) | ~6--12 ms | drops to ~5--15 ms | ~85--185 ms |
| 4-core (dev) | ~25--50 ms | drops to ~5--15 ms | ~55--135 ms |

#### Verification

`build.bat && check.bat` clean.  `search-data.json` byte-identical
to pre-Phase-17 output (ordering guarantee above).  The timing
summary should show `searchData` at ~5--15 ms (down from
~100--200 ms).  `render:i` timings increase by a few ms each,
absorbed within the render fan-out.  Total build wall-clock drops by
the net saving.

### Phase 18: Move per-page SEO to render workers

**Suggested model:** Sonnet.

**Motivation.**  The `seo` task runs on the main thread after
`markdownInit`, computing four per-page fields (`seoTitle`,
`seoFullTitle`, `seoCanonical`, `seoIsHome`) and two site-level
constants (`seoSiteTitle`, `seoLogoUrl`).  It takes ~35 ms and sits
on the critical path between `markdownInit` and `dispatch`.  The
per-page fields are only consumed by `templatePhase` inside the
render workers --- no main-thread task reads them after `dispatch`
serializes them into the chunk payloads.  Moving the per-page
computation into the render workers removes the task from the
critical path and shrinks the serialized chunk payload by ~130 KB
(~150 bytes × ~858 pages).

#### Design

Split `precomputeSeo` into two functions:

1. **`computeSiteSeo(config, markdown)`** --- returns
   `{ seoSiteTitle, seoLogoUrl }`.  Called once on the main thread,
   folded into `markdownInit`.

2. **`computeChunkSeo(pages, seoSiteTitle, config, markdown)`** ---
   mutates pages in place with the four per-page fields.  Called on
   each render worker between `renderPhase` and `templatePhase`.

The `seo` task is deleted.  `dispatch.expected` drops `"seo"` and
gains `"markdownInit"` (the transitive dependency through `seo` is
gone; `dispatch` reads `state.site.seoSiteTitle`, `seoLogoUrl`, and
`linkTablesSerialized`, all written by `markdownInit`).

#### Data flow

```
markdownInit [M]
   ├── buildLinkTables + createMarkdownIt       (existing)
   └── computeSiteSeo(config, markdown)          ← NEW
       state.site.seoSiteTitle = ...
       state.site.seoLogoUrl   = ...
             │
             ▼
dispatch [M]  (expected: drops "seo", gains "markdownInit")
   └── packs seoSiteTitle + seoLogoUrl into sharedSAB  (unchanged)
             │
             ▼
render:i [W]
   ├── deserialize chunk
   ├── renderPhase(chunk, site)                  (existing)
   ├── computeChunkSeo(chunk, site.seoSiteTitle, ← NEW
   │                   site.config, site.markdown)
   ├── templatePhase(chunk, site, initData)      (existing)
   └── offline derivation                        (existing)
```

#### Why it's safe

- **No main-thread consumer.**  The four per-page SEO fields are set
  on `state.pages` before dispatch, serialized into chunks,
  deserialized on workers, used by `headSeoBlock` inside
  `templatePhase`, and never sent back to main.  No post-dispatch
  main-thread task reads them.  `searchData` reads
  `renderedContent`; `writePdf` reads `renderedContent` via
  `bookData._chapters` refs.  Neither reads any `seo*` field.

- **Identical markdown-it instance.**  The render worker's
  markdown-it instance is built from the same plugin stack as the
  main thread's (`seo.mjs` lines 36--45 document the equivalence).
  `renderTitle` produces byte-identical output.

- **Page data available.**  Each chunk page carries
  `frontmatter.title` and `permalink` --- the only per-page inputs
  to the SEO computation.  `site.config` (for `absoluteUrl`) and
  `site.seoSiteTitle` (for the full-title composition) are already
  in the shared payload.

#### Changes

**`seo.mjs`.**  Add two exported functions.  `precomputeSeo`
delegates to them:

```js
export function computeSiteSeo(config, markdown) {
  if (!markdown) {
    throw new Error(
      "computeSiteSeo requires a markdown-it instance");
  }
  const seoSiteTitle = renderTitle(config.title, markdown);
  const logo = config.logo;
  const seoLogoUrl = logo != null
    ? uriEscape(absoluteUrl(String(logo), config))
    : null;
  return { seoSiteTitle, seoLogoUrl };
}

export function computeChunkSeo(pages, seoSiteTitle, config,
                                markdown) {
  for (const page of pages) {
    const rawTitle = page.frontmatter.title;
    const seoTitle = isNonEmpty(rawTitle)
      ? renderTitle(rawTitle, markdown) : seoSiteTitle;
    page.seoTitle = seoTitle;
    page.seoFullTitle = seoTitle === seoSiteTitle
      ? seoTitle
      : `${seoTitle} | ${seoSiteTitle}`;
    const url = String(page.permalink);
    const canonicalInput = url
      .replace(/\/index\.html$/, "/")
      .replace(/\.html$/, "");
    page.seoCanonical = absoluteUrl(canonicalInput, config);
    page.seoIsHome = HOMEPAGE_URLS.has(url);
  }
}

export function precomputeSeo(pages, config, markdown) {
  const { seoSiteTitle, seoLogoUrl } =
    computeSiteSeo(config, markdown);
  computeChunkSeo(pages, seoSiteTitle, config, markdown);
  return { seoSiteTitle, seoLogoUrl };
}
```

`precomputeSeo` becomes a convenience wrapper.  The `seo` task that
called it is deleted, so it is effectively dead code --- retained for
dev tooling.

**`tbdocs.mjs`.**  Six changes:

1. Import: replace `precomputeSeo` with `computeSiteSeo`:
   ```js
   import { computeSiteSeo } from "./seo.mjs";
   ```

2. Delete the `seo` task definition (current lines 411--422).

3. Fold site-level SEO into `markdownInit.execute()`:
   ```js
   markdownInit: {
     expected: ["discover"],
     runOnMain: true,
     execute(_, ctx, state) {
       const linkTables    = buildLinkTables(state.pages);
       const baseurl       =
         String(state.site.config.baseurl || "");
       const staticFileSet =
         new Set(state.staticFiles.map(s => s.srcRel));
       state.site.markdown = createMarkdownIt({
         highlighter: null, linkTables, baseurl,
         staticFiles: staticFileSet,
       });
       state.site.linkTablesSerialized =
         serializeLinkTables(linkTables);
       const { seoSiteTitle, seoLogoUrl } =
         computeSiteSeo(state.site.config, state.site.markdown);
       state.site.seoSiteTitle = seoSiteTitle;
       state.site.seoLogoUrl   = seoLogoUrl;
       return {};
     },
     submit() {},
   },
   ```

4. Replace `"seo"` with `"markdownInit"` in `dispatch.expected`.
   Replace the `seo: _seoSignal` destructure + `void _seoSignal`
   with `markdownInit: _markdownInitSignal` +
   `void _markdownInitSignal` in `dispatch.execute`:
   ```js
   dispatch: {
     expected: ["nav", "buildInit", "buildInfo", "mermaid",
                "deriveRedirects", "markdownInit"],
     ...
     execute({ nav: { sidebar },
               buildInit: { initData },
               buildInfo: { buildInfo },
               mermaid: { mermaidStats },
               markdownInit: _markdownInitSignal,
               deriveRedirects: { stubs } }, ctx, state) {
       void mermaidStats;
       void _markdownInitSignal;
       ...
     },
   },
   ```
   The explicit edge replaces the transitive `markdownInit → seo →
   dispatch` chain.  `dispatch` reads `state.site.seoSiteTitle`,
   `state.site.seoLogoUrl`, and `state.site.linkTablesSerialized`,
   all written by `markdownInit`.

5. Remove `seo: "Spine"` from `GANTT_SECTION`.

6. Update the spine comment (~line 131) to remove the `→ seo`
   segment.

**`cpu-worker.mjs`.**  Import `computeChunkSeo` from `./seo.mjs`.
In the `render` handler, call it between `renderPhase` and
`templatePhase`:

```js
async render(taskIdx) {
  const offset = Atomics.load(views.payloadOffset, taskIdx);
  const length = Atomics.load(views.payloadLength, taskIdx);
  const chunk = JSON.parse(
    new TextDecoder().decode(
      new Uint8Array(_payloadSAB, offset, length)),
  );

  const env = _renderEnv;

  await renderPhase(chunk, env.site);
  computeChunkSeo(chunk, env.site.seoSiteTitle,
                   env.site.config, env.site.markdown);
  await templatePhase(chunk, env.site, env.initData);

  // ... offline derivation unchanged ...
}
```

#### Graph changes

Before:
```
discover → markdownInit → seo ──→ dispatch
discover → nav ──────────────────→ dispatch
```

After:
```
discover → markdownInit ─────────→ dispatch
discover → nav ──────────────────→ dispatch
```

`seo` is removed from the static task DAG.  A direct
`markdownInit → dispatch` edge replaces the two-hop
`markdownInit → seo → dispatch` chain, saving ~35 ms (the full
`seo` duration) from the critical path.

#### Interaction with other phases

- **Phase 11 (DECLINED).**  Phase 11 was declined because `nav` and
  `seo` both mutate page objects between discover and dispatch,
  breaking the precondition for pre-serializing chunks during
  discover.  This phase removes `seo` as a mutator --- only `nav`
  remains.  The precondition is still not met, but the gap narrows.
  If a future phase makes `nav` write its outputs to `state.site.*`
  rather than mutating pages in place, Phase 11 becomes viable.

- **Phase 15 (generic dynamic tasks --- DONE).**  Phase 15 rewrote
  `dispatch.submit()` to use the generic dynamic task API
  (`allocDynamicSlots`, `writeTaskMeta`, `wireDynamicEdges`) and
  replaced the JS `taskMeta` array with SAB-based metadata.
  Confirmed: `dispatch.execute()` and `dispatch.expected` were not
  changed by Phase 15, so the `seo` removal (replacing one
  `expected` entry with `"markdownInit"` and updating the
  destructure) applies cleanly.  No conflict.

- **Phase 17 (search data on workers).**  Phase 17 adds
  `deriveSearchEntries` to the render handler, after render +
  template + offline.  Phase 18 adds `computeChunkSeo` earlier
  (between `renderPhase` and `templatePhase`).  Both are independent
  per-page transforms; neither depends on the other's output.  They
  compose without conflict regardless of landing order.

#### Files touched

| File | Changes |
|---|---|
| `seo.mjs` | Add `computeSiteSeo` and `computeChunkSeo` exports; refactor `precomputeSeo` to delegate (retained as dead code for dev tooling) |
| `tbdocs.mjs` | Import `computeSiteSeo` instead of `precomputeSeo`; delete `seo` task; fold site-level SEO into `markdownInit`; replace `"seo"` with `"markdownInit"` in `dispatch.expected`; update destructure; remove `seo` from `GANTT_SECTION`; update spine comment |
| `cpu-worker.mjs` | Import `computeChunkSeo` from `./seo.mjs`; call between `renderPhase` and `templatePhase` in the render handler |

#### Expected savings

Two sources:

1. **Critical-path reduction.**  The `seo` task (~35 ms) is removed
   from the `markdownInit` → `dispatch` path.  If `seo` was the
   last `dispatch` dependency to complete (likely when `nav` finishes
   first), `dispatch` starts ~35 ms sooner.  If `nav` was the
   bottleneck, the saving is the difference between the `seo` path
   and the `nav` path --- still non-negative.

2. **Reduced chunk payload.**  Four fields per page (`seoTitle`,
   `seoFullTitle`, `seoCanonical`, `seoIsHome`) are no longer
   serialized into the chunks.  At ~150 bytes/page × ~858 pages,
   this saves ~130 KB from the `packPayloads` step --- both
   `JSON.stringify` CPU time and `TextEncoder` throughput.

The per-worker cost of `computeChunkSeo` is negligible: ~54
pages/worker × ~60 μs/page ≈ 3--4 ms per worker, absorbed within
the render fan-out.

#### Verification

`build.bat && check.bat` clean.  The `seo` entry disappears from
the timing summary and Gantt chart.  `dispatch` starts ~35 ms
sooner (visible as the gap between `markdownInit` and `dispatch`
shrinking).  Rendered output byte-identical --- `headSeoBlock` in
every page produces the same `<title>`, `<meta>`, canonical, and
JSON-LD.
