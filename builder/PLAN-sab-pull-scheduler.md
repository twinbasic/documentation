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
    chunks have `[warmInitIdx]`. Workers check these after claiming.
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
