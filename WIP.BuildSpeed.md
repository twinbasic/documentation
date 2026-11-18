# The build's speed --- Working Notes

What a session needs before it makes `tbdocs` faster: the rules, how to measure, and the
work that is open. What was done, and why each piece of the pipeline is built as it is, is in
[WIP.Build.md](WIP.Build.md#the-pipeline) and [WIP.Search.md](WIP.Search.md) (*The pre-built
index*), with every measurement that still decides something. History is in git.

The owner's standard for this work: "Our build's performance was achieved by relentlessly
slicing every 0.1s off until it was perfect. So a 0.1s win is just fine in my book."

## Rules

- **Measure before and after, in the same session, more than once.** The dev box is rarely
  quiet: one-off builds of one commit range over a second, and a `git` process alone takes
  0.15 to 1.0 s. Compare the base checkout with the branch in alternating runs
  (`bench.ps1 -Trees <branch>,<base>`), read each run's chart, and report ranges, never one
  total.
- **Measure each kind of build**, because a change that helps one often does nothing for
  another: a one-off build on every CPU, a one-off build on four (`start /affinity F`, the
  nearest thing to a CI runner), and rebuilds on one pool as `--serve` runs them. Say which
  were not measured; CI never is until the owner pushes.
- **Look for a gap before optimising a bar.** The gains so far came mostly from a task
  waiting for something it did not need, a lane held by a wait, or the main thread claiming
  a long task just before a critical one became ready. Read which task ran in a gap from the
  build's timing line: the chart does not draw every main-thread task (`linkJoin`), and a
  `submit`'s time is the paler stretch after its bar, not in `<task>=`.
- **A task's time in a build is not its own work while the lanes boot.** Measure a function
  alone first, then in the build, and report both.
- **The output must not change unless it is meant to.** `node scripts/compare_trees.mjs`
  after every change to `builder/` or `lib/`; then `build.bat`, `check.bat`, `test.bat` and
  lint. A rewrite of an inner loop is compared with the old code over every page first (import
  both checkouts' modules in one script).
- **No task starts a thread**, and a new lane task or main-thread task needs its entry in
  `GANTT_SECTION` (`builder/gantt.mjs`), or the build fails after writing the trees
  ([WIP.Build.md](WIP.Build.md#no-task-starts-a-thread)).
- **A task that only waits does not belong on a lane**, and a main-thread task must not
  await a process: start it, keep the promise, and await it in the task that needs the answer
  ([WIP.Build.md](WIP.Build.md#git-is-started-by-the-main-thread-and-awaited-where-it-is-needed)).
- **Separate commits for code and for docs**, and the developer pages
  (`docs/Documentation/Builder.md`, `Pipeline-Stages.md`, `Extending.md`) are updated with the
  task graph.

## How to measure

The measuring tools are not in the repository yet: they are local, in
`.claude/resume-agents/kit/perf/` of the main checkout (gitignored). Each takes the
repository's Windows path as its first argument unless said.

| Tool | What it does |
|---|---|
| `bench.ps1 -Trees <dir>,<dir> -Runs 3 -Out <folder>` | builds each tree on every CPU and on four, prints each "Done in" line, keeps each build's log and `gantt.svg` |
| `serve-gantt.mjs <repo> <out> <label> [builds]` | builds on one pool, as `--serve` does (the first is cold), and keeps each chart |
| `gantt-times.mjs <gantt.svg>... --task a,b` | when render started and ended, and named main-thread tasks' times, read from a chart |
| `svg2png.mjs <gantt.svg>...` | a chart as a PNG beside it, to look at; run from the repository root |
| `prof-under.mjs <cpuprofile> <fn,fn,...> [depth]` | the inclusive time of named functions in a `--cpu-prof` profile (the main thread's ends `.0.001.cpuprofile`) |
| `mdinit-bench.mjs`, `instrument-mdinit.mjs` | `markdownInit`'s parts alone, and temporary marks in it printed as a line on stderr |
| `mask-diff.mjs`, `nav-diff.mjs <old repo> <new repo>` | two checkouts' `maskCode` and `computeNav` compared over the site, then timed |
| `nav-bench.mjs`, `slices-cpu.mjs`, `terms-bench.mjs`, `sibench3.mjs`, `pdeflate.mjs`, `habench2.mjs` | one part of the build alone: the nav, the index's add by slice count, its merge and terms, the add split into its parts, a file deflated as one stream and as pieces, the archive on one thread |

A base to compare with is the main checkout while the branch is ahead of it, or a detached
worktree of the commit with a `node_modules` junction.

What goes wrong when measuring:

- A build's timing line gives a lane task's duration as the main thread saw it; its bar in
  the chart is the lane's own.
- A profile inflates code that runs once and cannot tell one caller of a shared function
  from another: for a task's parts, marks printed to stderr are better.
- From Git Bash, `cmd //c "start \"\" /affinity F ..."` fails on quoting: run the four-CPU
  builds from PowerShell. `& .\test.bat` from PowerShell works; `cmd /c test.bat` does not.
- Never pipe a build into `Select-Object -First N`: it ends the process.
- `bench.ps1` copies the chart even when the build failed, so check each run's exit code.
- Two CI runners differ by a quarter in speed: compare a task's time with render's own
  length before believing a gain there.

## Where the time is

Against `952c9da1`, on the dev box (16 logical CPUs), three runs each:

| | first render | render ends | build ends |
|---|---|---|---|
| one-off, 16 CPUs | 0.7 to 0.9 s | 4.9 to 5.6 s | 7.7 to 8.3 s |
| one-off, 4 CPUs | 1.1 to 1.3 s | 9.1 to 10.1 s | 14.5 to 15.0 s |
| serve rebuild | 0.16 to 0.25 s | 2.3 to 2.8 s | 3.5 to 4.3 s |

After render the critical path is `indexAdd:i` -> `indexMerge` -> `indexTerms` ->
`searchIndex` -> the late deflate -> `helpArchive` -> `addinProject` -> `checkReport`,
mostly on the main thread while the lanes have little to do.

## Open work

None of these is started. A figure is of the runs named, so measure again before
believing an order.

### Render takes twice the lane time on 16 lanes that it does on 4

Render and flush take 4.1 to 4.9 s on sixteen lanes and 8.2 to 8.4 s on four: about 70
lane-seconds against 34. It is the largest block of the build and nobody has looked into
why. Candidates: the sixteen are hyperthreads of eight cores, the garbage collector, memory
traffic, or the file writes in `flush` (three trees, and a markdown copy of each page). The
first measurements to take: a build with eight lanes, and one whose flushes write nothing.

### The stylesheets are compiled in every build

`scssLight` takes 0.8 to 1.2 s and `scssDark` 0.9 to 2.4 s in a one-off build, each holding
a lane that then starts Shiki and joins the render late (about 0.7 s late on CI). In a serve
rebuild they still held two lanes until about 2 s in one run.

- A serve rebuild in which no `.scss` file changed could keep the previous result.
- A one-off build could take it from a cache on disk keyed by the sources' hash and the
  compiler's version. That is a larger decision: the build has no cache today.
- Compiling later instead (the lanes render first) moves the CPU and removes none: on four
  CPUs the lanes are idle only after `archivePlan`, which needs the stylesheet written.

### The main thread runs long tasks just before `searchIndex`

On sixteen CPUs `archivePlan` (0.1 to 0.25 s) and `linkJoin` (0.33 to 0.40 s) are claimed
between `indexTerms` and `searchIndex`, which started 0.13 and 0.54 s late in two runs. The
main thread never interrupts a task, and it claims ready tasks in declaration order. On four
CPUs and in a serve build it does not arise: the main thread is done long before.

- Ways: let the scheduler prefer a main-thread task on the critical path; or reorder; or
  shorten the tasks. `F_RUN_WHEN_IDLE` exists for lane tasks only (`warmInit`).
- `linkJoin`: `checkChunk` over the redirect stubs and `nav.html` is about 0.2 s of
  htmlparser2 on the main thread, a piece for the lanes (`fanOut`); `checkSearch` needs only
  the entries' URLs, which `searchEntries` has without parsing `search-data.json`.
- `bookPayload` (0.25 to 0.44 s): `packShared` makes JSON of every page's `renderedContent`.
  The render lanes hold that content and could pack it as they pack the search entries.
- `archivePlan`: `listFiles` is a `statSync` of every file of the offline tree, whose sizes
  the build knows, having written them.

### The index's main-thread end

- `indexTerms` (`invertedIndexJson`, 0.35 to 0.65 s) while the lanes idle. The merged
  postings are strings on the main thread, so a lane cannot build the JSON without a transfer
  that costs what the building does. What would work: each `indexAdd:i` writes its posting
  fragments (ASCII) into a SharedArrayBuffer, `indexMerge` numbers the terms only, and
  term-range tasks on the lanes build the JSON as bytes. Gain at most 0.4 s.
- `searchIndex` (0.35 to 0.45 s: escaping, `JSON.stringify(docs)`, `Buffer.byteLength` for a
  statistic, two 55 MB writes). The entries are packed as bytes already, so the `docs` part
  could be assembled from them as `search-data.json` is, and the file written as Buffers.
- **A faster replacement for lunr's `Builder.add`**, most of the index's CPU (4.5 to 5 s on
  one thread). Of 3.9 s profiled: tokenizing and stemming 0.84 s, `Builder.add`'s own
  bookkeeping 1.6 s (a `Token` used as an object key becomes a string at every lookup; every
  posting is an `Object.create(null)`), the postings' JSON 1.2 s, the garbage collector 0.4 s.
  A builder of our own with Maps and arrays could be two or three times faster. The test
  compares bytes with lunr's for any slice count, so the safety net exists. Keep lunr for the
  vectors and replace only `add` and the postings' JSON first.
- `deriveSymbolIndex` (about 45 ms after render): `placeOwnPages` goes through every page of
  a folder for every type and calls `cleanName` each time. The stem twins (about 20 ms) could
  run on a lane while the main thread settles the entries.
- About 0.2 s of idle lanes between the last render chunk and the first `indexAdd:i`
  (`symbolPlace`, `searchEntries`, `indexSlices`).

### Smaller things

- `markdownInit`'s two cold block parses (`deriveCounts`, `checkPlaceholders`): 50 to 70 ms
  in a build, about 10 ms alone and warm
  ([WIP.Build.md](WIP.Build.md#what-markdowninit-is-made-of)).
- On four CPUs `dispatch` waits a few hundredths of a second for `dot` in some runs.
- Start the late deflate from memory while `searchIndex` writes its files (about 0.2 s; it
  would tie the archive to the index's task); deflate the part of `search-index.js` that is
  known early during the adds (about 0.2 s, much wiring).
- The chart shows `buildInfo` and `addinFiles` as slivers, not how long `git` took.

## Considered and not done

- **Adding the search entries during render** (owner asked twice). An entry has its final
  form only after every page is rendered, and on four CPUs every lane is busy through render,
  so the index's CPU would lengthen render by what it took off the tail. How it could be done
  if ever wanted is in WIP.Search.md.
- **`prepDest`** is on no critical path; it is long in a cold serve build only because it
  wipes the previous tree (owner: no action).
- **`nav`**: `computeNav` is three times faster alone than it was and unchanged in a build.

## Owner's decisions

- A 0.1 s gain is worth a slice.
- The source tree is read in four pieces from eight logical CPUs on, in two below.
- Orange in the Gantt chart is for write tasks; indexing has its own colour.
- A file the help archive deflates in pieces is at level 6 (2026-11-18).
