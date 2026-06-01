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

### Phase 13: Uniform task timing (t0 / t1 / t3)

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

1. **`_executeMainTask`.** Capture t3 after `def.submit()`:

   ```js
   const t0 = Date.now();
   output = await def.execute(inputs, this._ctx, this.state);
   const t1 = Date.now();

   // ... results.set, submit ...
   def.submit(output, this.state, this);
   const t3 = Date.now();

   const timing = { start: t0, end: t1, t3 };
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
   `renderEnvInit`, `flushPages`) arrive via this path.  The runner
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
   entry, render a second narrower or lighter-shaded rect from
   `end` to `t3` on main-thread task bars.  This makes the
   `dispatch.submit()` cost visible in the Gantt --- the gap that
   motivated this phase.  Only main-thread tasks carry `t3`, so
   worker lane bars are unaffected.

#### Changes to `groupGanttTimings` (`tbdocs.mjs`)

Pass through the `t3` field when present:

```js
const entry = { id, start: start - t0, end: end - t0 };
if (t3 != null) entry.t3 = t3 - t0;
```

The destructuring on line 601 gains `t3`.

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
