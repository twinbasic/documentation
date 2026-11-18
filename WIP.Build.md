# twinBASIC Documentation --- The Build Pipeline and Its Gates

Why the pipeline and each gate are built the way they are: what each one checks,
the failure it guards against, and the rule that follows. It keeps the roster,
under [The gate roster](#the-gate-roster); [WIP.md](WIP.md) keeps the wrapper
commands and the rules every session follows, under [The gates, and where their
internals are](WIP.md#the-gates-and-where-their-internals-are).

**Read this before adding a gate, changing one, or adding any rewrite over
markdown source or rendered HTML.** Each gate here guards a failure that every
other gate passes. The recurring shape is a check that quietly stops checking,
which reports exactly what a healthy tree reports.

## The gate roster

**The Tools and Scripts page is a landing page and group pages.**
`Tools.md` holds the batch wrappers (and with them the two numbered gate lists
`check_gate_lists.mjs` reads from that file and no other), the command-line
conventions and the configuration files. Every other tool's entry is on one of
`docs/Documentation/Tools-<Group>.md` --- Build, Site-Checks, Toolchain-Tests,
Compiler, Samples, IDE, Defects --- published at
`/Documentation/Development/Tools-<Group>`. The permalinks are flat, as the
tbdocs Builder's children are, because a `Tools/` folder beside `Tools.html`
makes the link check resolve `Tools#anchor` to the folder. **A new tool gets an
entry on the group page it fits and a node in
`docs/Documentation/Images/Tools-Groups.dot`**, the map on the landing page; a
link to a tool's entry names the group page, never `Tools#<tool>`.

The roster, by wrapper ([Tools and Scripts](docs/Documentation/Tools.md) owns the lists;
[WIP.md](WIP.md#the-gates-and-where-their-internals-are) says what that means for a page):

| wrapper | gate | asks |
|---|---|---|
| `build.bat` | link + integrity check | broken intra-site links, missing pages, malformed `redirect_from`, duplicate ids, remote `<img src>`, sitemap / search-index gaps, canonical mismatches; it runs on the worker lanes that produced the HTML |
| `build.bat` | publish allowlist | refuses any file that may not ship, and aborts the build rather than flipping an exit code |
| `build.bat` | page-count baseline | a rise rewrites `builder/page-baseline.json` and says so; a fall fails the build. Only a build into `docs/_site` writes it |
| `build.bat` | symbol-index URLs | every URL `tB/symbols.json` has published is still in it; a lost one (most often a reworded member heading) fails the build |
| `build.bat` | nav integrity | every nav-visible `parent:` resolves to exactly one page |
| `build.bat` | Gantt sections | every task handed to the build's Gantt chart has a section and a place in the chart |
| `check.bat` | `check_tree_fresh` | the tree is not older than the sources that produced it |
| `check.bat` | `check_dot_fit` | every diagram label sits inside the box Graphviz drew for it |
| `check.bat` | `pick_a11y_sample --check`, `check_a11y` | see [WIP.A11y.md](WIP.A11y.md) |
| `check.bat` | `check_shot_sizes` | every page that shows a screenshot of `test/shots/manifest.json` declares the size its pixels and scale give ([WIP.ShotReview.md](WIP.ShotReview.md#one-way-to-take-pictures), rule 4) |
| `test.bat` | `check_code_regions` | no source or HTML rewrite alters a code region, and a rewrite still fires on prose beside a fence (the mirror fault) |
| `test.bat` | `check_regex_safety` | no regex in the tree can backtrack exponentially |
| `test.bat` | `check_package_tests` | every NOTE and WARNING of a contributed section with a test project names its cases, every case is named and well formed, `expect.json` is for the documented version, `RunAll.twin` is current; `PENDING` only shrinks |
| `test.bat` | `check_callout_evidence` | every callout labelled `BETA <n>` names what checks it, every marker's item exists, and `scripts/lib/recheck.mjs` relabels as it should |
| `test.bat` | `check_symbol_index` | the symbol index still places each kind of symbol, from fixtures |
| `test.bat` | `check_twin_parsers` | the three scanners of twinBASIC source agree on the shared modifiers, and hold for the shapes each is known to misread |
| `test.bat` | `check_attribute_sweep` | the attribute sweep's skeletons, its reading of diagnostics and its isolating runner behave, against fixtures and a scripted fake IDE |
| `test.bat` | `check_cli` | every tool parses its command line strictly, refuses an unknown flag or an empty value, prints its recorded errors, and has a `--help` that ends in one `Exit codes:` block |
| `test.bat` | `check_ci_workflows` | both CI workflows run every wrapper gate, with the same arguments and order, and build with `build.bat`'s flags |
| `test.bat` | `check_lint` | Biome finds nothing in the tooling, warnings included, and the formatter would change no file |
| `test.bat` | `test/search.test.mjs` | the search entries, the page's tokenizer and query code, and the index all behave as the build's (a `node --test` line is a gate, named by its path) |
| `test.bat` | `test/search-index.test.mjs` | the search index built on several threads is, byte for byte, the one `lunr()` builds on one |
| `test.bat` | `test/render.test.mjs` | `builder/render.mjs`'s markdown-it plugins, and the links of a page's markdown copy, on inputs no page holds |
| `test.bat` | `test/strftime.test.mjs` | `builder/strftime.mjs`'s `formatDate`, which no build calls |
| `test.bat` | `test/compact-image.test.mjs` | what an embedded image keeps (`scripts/lib/compact-image.mjs`), and, with `IMAGESTRIP_EXE` set, that `scripts/imagestrip/` does the same |
| `test.bat` | `test/svgshot.test.mjs` | the SVG screenshot converter, its bundles and font cuts, and the shared screenshot modules (`shot-change`, `shot-queue`, `shot-stage`, `shot-policy`, `shot-manifest`, `shot-revision`) |
| `test.bat` | `test/shot-review.test.mjs` | the screenshot review tool (`scripts/shot_review.mjs`): its session, pages, runs, writes under docs and commit. Needs git |
| `test.bat` | `test/example-batches.test.mjs` | `check_examples.mjs`'s probes: batching, crash isolation, the canaries, the fence classifier and `check_run`, with no IDE |
| `test.bat` | `test/ide-folders.test.mjs` | `shutdownIde` and `shutdownIdeAsync` remove the IDE's temp folder and profile once it is gone, and no other folder |
| `test.bat` | `test/broker.test.mjs` | `tbbroker` and its client (`scripts/lib/tb-broker.mjs`); skipped unless `TBBROKER_EXE` names a built broker |
| `test.bat` | `test/addin-project.test.mjs` | `builder/addin-project.mjs` packs exactly the files git tracks in `add-in/`, the same bytes from a CRLF and an LF checkout. Needs git |
| `test.bat` | `test/indexer.test.mjs` | the package indexer (`indexer/lib/`) changes a snapshot only when the API changes |
| `test.bat` | `test/ide-js.test.mjs` | `scripts/ide_js.mjs` and `scripts/ide-js/lib.mjs` on a few lines of minified JavaScript, and that the tool writes only under `%TEMP%` |
| `test.bat` | `test/discover.test.mjs` | the source tree's inventory (`builder/discover.mjs`, `discover-read.mjs`) is the same in any number of pieces, with a picture pair that has a `bundle_extra` file |
| `test.bat` | `test/build-speed.test.mjs` | `scripts/build_speed.mjs` reads from a Gantt chart the times `builder/gantt.mjs` drew, and totals a CPU profile by function |
| `test.bat` | `check_pdf_shims_equiv` | the book's pdf-lib shims write what stock pdf-lib writes, and patch only the members `PATCHES` lists |
| `test.bat` | `check_impexp_parity` | the Node and Python editions of `impexp` (and, with `IMPEXP_EXE`, the twinBASIC one) behave alike |
| `test.bat` | `check_publish_policy`, `check_gate_lists`, `check_page_baseline`, `check_book_coverage`, `check_axe_patch_equiv` | the gates on the gates |

What each gate checks in full is in its entry on its `Tools-<Group>.md` page. Which
wrapper a new gate goes in, and how CI runs them: [What belongs in test.bat rather than
check.bat](#what-belongs-in-testbat-rather-than-checkbat).

The nav integrity check ([builder/nav.mjs](builder/nav.mjs)) runs during COMPUTE and aborts the build on two failure modes, both otherwise silent:

- **Ambiguity** — multiple pages share the title declared in `parent:` and `grand_parent:` is either absent or insufficient to disambiguate. The page would silently appear under every matching parent.
- **Orphan** — no page has the title declared in `parent:`. The page would silently disappear from the navigation sidebar.

## The pipeline

**Before adding a fan-out to the task graph, read [why a dep count of zero does not mean the submits have run](builder/PLAN-sab-pull-scheduler.md#a-dep-count-of-zero-does-not-mean-the-submits-have-run).** A worker posts its result and *then* decrements its successors' dependency counts in shared memory. A barrier's count can therefore reach zero while results are still queued and the `submit()` calls that merge them into build state have not run: the shared counter orders the work, not the state.

A dynamic barrier must list every chunk task in its `expected`, even when its own `execute()` ignores the inputs. That list is the only thing the scheduler checks before it lets the barrier proceed. Without it, some builds drop pages from `search-data.json`: the index is built by flattening a `new Array(N)`, and `Array.prototype.flat()` skips holes without reporting anything. A race and a silent skip combine into one invisible failure.

So every skip on the chunk-merge path refuses to continue when a piece is missing --- see [where the completeness checks are](builder/PLAN-sab-pull-scheduler.md#where-the-completeness-checks-are). On this path, "the piece is missing" is a bug, not a case to handle.

**A sort key on this path must be total.** The pages arrive piece by piece (see
[The source tree is read on the lanes](#the-source-tree-is-read-on-the-lanes)),
not in the listing's order. `pages.sort(byName)` is stable and Jekyll's key is the
*basename*, so a tie would keep the order of arrival --- and over a hundred
folder-style classes are all named `index.md`. Tied pages would reorder the
chunking and make `search-data.json` differ between two builds of one commit.
`byName` breaks ties on `srcRel`. Two builds of a commit are byte-identical
except for `BuildInfo.html` and `gantt.svg`, which record build timings and
cannot be.

**`scripts/compare_trees.mjs` relies on that.** It builds a commit and the
working tree from two git worktrees and compares all three trees byte for byte.
It replaces those two regions and the PDF title page's build line, which also
differs when the sides are different commits or were built on different days.
Run it after any change to `builder/` that should leave the output alone. A
change meant to alter the output is checked the same way: the report should show
the intended differences and nothing else. Build the working tree from a
checkout, never in place: under `core.autocrlf` a file a tool has rewritten holds
LF where a fresh checkout writes CRLF, so every file the build copies verbatim
would differ.

Measured on the dev box: the online build takes about 2 s; the offline pass adds about 700 ms,
the PDF pass about 150 ms, and `--check` about 1.7 s.

### No task starts a thread

**The lanes are the build's only threads** (owner, 2026-11-17: "That's what the lanes
are for, and we lose important diagnostics that way too"). A task whose work can run in
parallel splits it into pieces and adds each to the graph as a lane task, with `fanOut`
(`builder/fan-out.mjs`) from the `submit()` of the main-thread task that plans them. The
search index (`indexAdd:i`, `indexVectors:i`) and the help archive (`archiveDeflate:i`,
`archiveLateDeflate:i`) are the models; `render:i` and `flush:i` are the same idea, wired
by `dispatch.submit`.

So a task never:

- starts a worker thread (`node:worker_threads`), a cluster or a process for its work;
- puts CPU work on Node's thread pool: the functions of `node:zlib` whose name does not
  end in `Sync` run there, as do the asynchronous key-derivation functions of
  `node:crypto`. File reads and writes may use the pool: that is I/O.

**Why.** A thread a task starts is one the scheduler cannot place and the Gantt chart
does not show. The search index once built on threads of its own: two on a 4-core CI
runner (half the machine), beside lanes that had nothing to do, and the chart showed one
bar on one lane for the whole of it. The help archive deflated on the thread pool, so its
one bar hid a 55 MB file deflating on a single thread for most of its length. As lane
tasks, the index runs on every lane, the archive is deflated while the index is built,
and each piece is a bar on the lane that ran it.

**The gate is `check_lint.mjs`**, through `noRestrictedImports` in `biome.jsonc`:
`builder/` may not import `worker_threads`, `cluster` or `child_process`, and `builder/`
and `lib/` may import from `node:zlib` only the `Sync` functions, `crc32` and
`constants`, by name (a default import would hide which function is called). The files
that may are named there, each with its reason: `worker-pool.mjs` and `cpu-worker.mjs`
are the lanes, and `build-info.mjs` and `addin-project.mjs` run `git`. The rule reads
imports, so it cannot see a function of another module that does the same; a new
dependency that starts threads is a review matter.

**`fanOut`'s own rules** are in its header: every piece waits for the task whose
`submit` adds it, so none can run while its edges are written; a join lists that task in
its `expected`, and `fanOut` adds the pieces to that list, which is what holds the join
until every piece's `submit` has run. `book/` is not the build: `book.bat`'s renderer
deflates on the thread pool (`book/lib/parallel-deflate.mjs`), and has no lanes.

### The source tree is read on the lanes

`discover` was one main-thread task: a glob, then every page read and its frontmatter
parsed, every static file sized and every picture pair's two headers read, all through
the asynchronous file calls. On a four-CPU CI runner it took about 1.0 s, as a fifth
thread beside four lanes that were booting, and everything up to the first render waits
for it. It is three steps now (`builder/discover.mjs`): `discoverList` lists the tree on
the main thread and cuts the listing into pieces, each `discoverRead:i` does a piece on
a lane (`builder/discover-read.mjs`, every file opened there, synchronously), and
`discover` puts the results together. `discover()` is the same code in one piece, for
the tools.

What makes it worth doing, and what to keep when changing it:

- **A lane boots in two stages** (`builder/cpu-worker.mjs`). The first loads the
  scheduler and what `discoverRead` needs, and the lane is in the pull loop after it. The
  second (`loadRest`: the renderer, the search index, the archive) runs before the
  lane's first task that is not a `discoverRead`. Without the split a piece would start
  only after a whole boot, later than the main thread used to start reading. **A module
  `discover-read.mjs` imports is paid for by every lane before the first piece**: keep it
  to the YAML parser and `paths.mjs`. The glob library stays in `discover.mjs`.
- **The other early lane tasks wait for `discoverList`**: `scssLight`, `scssDark`, `dot`,
  `packTests` and `warmInit`. They are READY at the start otherwise, the first lanes up
  would take them and load the second stage, and the pieces would wait for a lane. The
  listing takes a few hundredths of a second, less than a lane takes to start. The
  pieces have the highest priority, so the first lanes that look take them.
  `buildInfo` is no lane task since: see
  [git is started by the main thread and awaited where it is needed](#git-is-started-by-the-main-thread-and-awaited-where-it-is-needed).
- **Two pieces below eight CPUs, four from eight on** (`discoverPieces`; owner,
  2026-11-18). On four CPUs the other two lanes compile the stylesheets meanwhile; with
  four pieces there `dot` and `packTests` queued behind the reads and `dispatch`, which
  waits for `dot`, started late. With eight lanes or more, four of them reading leave
  lanes for the rest. On the dev box (16 CPUs) `discover` ended at 0.10 to 0.11 s in a
  serve rebuild with four pieces, 0.14 to 0.19 s with two; in a one-off build at 0.23 to
  0.38 s against 0.32 to 0.46 s.
- **The reads are synchronous.** Asynchronous calls from every lane queue on libuv's one
  pool of four threads; synchronous ones on two lanes are two reads at a time, and the
  lane has nothing else to do. Alone, every page read on one thread takes 67 ms on the
  dev box, 40 ms on two and 23 ms on four.

Measured, each `discover` ending at:

| | before | two pieces |
|---|---|---|
| CI (Linux, four CPUs): one run before, two after | 1.05 s | 0.26 s, 0.38 s |
| dev box (Windows, 16 CPUs), one-off build | 0.48 to 0.50 s | 0.43 to 0.51 s |
| dev box, four CPUs (`start /affinity F`) | 0.51 to 0.59 s | 0.35 to 0.46 s |
| dev box, serve rebuild | 0.16 to 0.22 s | 0.14 to 0.16 s |

On CI the first render started at about 1.2 s in the first run after and about 1.65 s in
the second, where it had started at 2.05 s. The first run's runner was about a quarter
faster than the one before (render itself took 10 s against 13 s); the second's was as
slow as it (render 14 s), so about 0.4 s is the change. `dispatch` ended at 1.45 s in the
second run against 2.0 s. The whole build's time did not change beyond what the runners
differ by (24.6 s against 24.2 s on the two slow ones). **On Windows a one-off build gains nothing**:
while the other lanes boot, a lane's piece takes 0.2 to 0.3 s for half the tree, where
the same reads alone take 40 ms, and `markdownInit` and `dispatch` then run beside
every lane's second stage and `warmInit` and take longer than they did. The first
render started at 1.15 to 1.28 s against 0.96 to 0.99 s in the prototype's runs, on a
machine that was not quiet; not measured again since. The change is for CI and for
serve rebuilds.

### The pages' text does not go through the main thread's JSON

`dispatch.submit` packed every page into the render chunks' payloads as JSON
(`packPayloads`): 12 MB, nearly all of it the pages' text, 50 to 60 ms on the main thread
of the dev box between the end of `dispatch` and the lanes' first look at a chunk. The
timing line's `dispatch=` does not count a `submit`; in the chart it is the gap between
`dispatch`'s bar and `prepDest`'s.

The text is now packed where it is read. Each `discoverRead:i` lane writes its pages'
`rawContent` as UTF-8 into one SharedArrayBuffer (`packPageText`,
`builder/discover-read.mjs`) and returns it beside the pages; a shared buffer is not
copied on the way back. `discover` broadcasts the buffers (`"pageText:<piece>"`) and
keeps where each page's text is (`state.pageTextAt`). A chunk's payload is
`{ pages, texts }`: the pages without `rawContent`, and each one's piece, offset and
length. `render:i` reads the text back (`pageText`) before it renders.

What to keep when changing it:

- **The main thread still has every page's `rawContent`**: the pages come back from the
  lanes with it, and `vendorAssets`, `markdownInit` and the later tasks read it. Only the
  chunks' payloads lost it.
- **Nothing may change a page's `rawContent` after `discoverRead`**: the render lanes
  would not see the change. Nothing does today (the one assignment is `buildPage`'s). A
  page with no place in `state.pageTextAt` keeps its text in the payload, so a page
  added later still renders.
- **The gap is a `submit`'s**, so it is on the main thread whatever the lanes do.

Measured on the dev box, from the end of `dispatch`'s bar to the start of `prepDest`'s:
0.05 to 0.13 s before, 0.01 to 0.02 s since, in one-off builds on sixteen CPUs and on
four. In a serve rebuild the first render started at 0.27 to 0.35 s before and at 0.23
to 0.27 s since (builds 2 to 5 on one pool). A one-off build's first render is within
the noise of the runs (0.78 to 0.88 s against 0.82 to 0.84 s): the lanes are still
loading their second stage and Shiki then. `discover` ends when it did. Not measured: CI.

### dispatch does not wait for buildInfo

`buildInfo` is two `git` processes, and only the book's title page states what they
return (`book.mjs`, `renderTitlePage`). `dispatch` listed it in `expected` and put its
result in the shared payload, from when every lane held the whole site object; no render
reads it. On Windows a process takes long to start while every lane boots: `buildInfo`
took 0.34 to 0.61 s in a one-off build on the dev box (0.15 s in the best run of eight),
ended later than `markdownInit` did, and `dispatch` started only then, 0.1 to 0.25 s
late. In a serve rebuild it took 0.03 to 0.3 s, with the same effect. On CI's Linux it
was done long before.

`bookPayload` waits for it now, which reads `state.site.buildInfo` and runs after the
render; the shared payload and the lanes' site object hold it no longer. (`buildInfo`
was a lane task then; it is a main-thread task now, see the next section.)

Measured on the dev box, with four pieces of the source tree as well (the two changes
were measured together), the first render starting at:

| | before | since |
|---|---|---|
| serve rebuild (builds 2 to 5 on one pool) | 0.25 to 0.27 s | 0.16 to 0.20 s |
| one-off build, 16 CPUs (4 runs) | 0.76 to 0.87 s | 0.66 to 0.78 s |
| one-off build, 4 CPUs (8 runs) | 0.91 to 1.20 s | 0.79 to 1.17 s |

On four CPUs nothing changes: the lanes are not up before `dispatch` ends either way,
and `dispatch` there still waits a few hundredths of a second for `dot` in some runs.
Not measured: CI, where neither change should show (four CPUs, and `git` is quick).

**`nav` was looked at and gains nothing in a build.** `computeNav` sorted every page's
children twice and built a map for each page's levels; it now sorts once and the walk
carries the levels, which takes 6 ms alone on its first call where it took 19 to 24 ms.
In a build the task still reads 29 to 69 ms (28 to 64 ms before): its time there is
not its own work but the main thread's share of a machine whose lanes are all booting.

### git is started by the main thread and awaited where it is needed

On Windows a `git` process takes 0.15 to 1.0 s to start and answer, alone on a quiet
machine, and up to 2.3 s while the lanes boot. The build asks `git` two things, and both
waited for it in the wrong place:

- **`buildInfo` was a lane task.** A lane that awaits a process does no other work, so
  one lane was out of the build for 0.47 to 0.88 s on sixteen CPUs and 0.50 to 2.33 s on
  four, where render starts at about 1.5 s. It was also two processes
  (`rev-parse --short HEAD` and `log -1 --format=%cs`) where `log -1 --format="%h %cs"`
  answers both.
- **`addinProject` listed the add-in's files at the very end of the build**, two
  `git ls-files` after `helpArchive`, with nothing else left to run: 0.21 to 1.55 s in
  a one-off build, 0.22 to 0.55 s in a serve rebuild.

Both are now main-thread tasks that start one process and return: `buildInfo` keeps
the promise in `state.buildInfoPending` and `bookPayload` awaits it; `addinFiles`
keeps `state.addinListing` (`listAddinFiles`: one `git ls-files -t --cached --others`,
where `?` marks a file git does not track) and `addinProject` awaits it. By then each
has long answered. What to keep:

- **A main-thread task must not await the process itself**: the main thread finishes a
  task before it claims the next, so the await belongs in the task that needs the
  answer, which runs late.
- **Both wait for `dispatch`**, only so that the processes start after the main
  thread's work for the first render. Starting a process takes the main thread 3 to
  31 ms.
- **A build that writes no PDF starts no `buildInfo` process** (`--serve`, `--no-pdf`,
  `--dry-run`): only the title page reads it.
- **The chart shows the two tasks as slivers**, not how long `git` took. The add-in's
  line in the build's report still gives `addinProject`'s time.
- `compare_trees` replaces the title page's build line, so check the commit there by
  reading `_site-pdf/book.html` after a change to `build-info.mjs`.

Measured on the dev box, three runs of each, base against branch in the same session:

| | before | since |
|---|---|---|
| `addinProject`, one-off, 16 CPUs | 0.48 to 0.64 s | 0.08 to 0.09 s |
| `addinProject`, one-off, 4 CPUs | 0.21 to 1.55 s | 0.09 to 0.10 s |
| `addinProject`, serve rebuild (builds 2 to 5) | 0.22 to 0.55 s | 0.01 to 0.02 s |
| first render, one-off, 16 CPUs | 0.81 to 0.95 s | 0.70 to 0.88 s |
| first render, one-off, 4 CPUs | 1.38 to 1.69 s | 1.07 to 1.34 s |
| whole build, 16 CPUs | 9.2 to 10.8 s | 8.6 to 9.4 s |
| whole build, serve rebuild (builds 2 to 5) | 3.96 to 4.66 s | 3.55 to 4.27 s |

The whole build on four CPUs is within the runs' noise (15.2 to 18.2 s against 15.5 to
17.3 s). Not measured: CI, where `git` is quick and little should show.

### What markdownInit is made of

Every render waits for `markdownInit`. On the dev box it took 117 to 151 ms in a one-off
build, of which `checkPlaceholders` was 70 to 80 ms and `deriveCounts` 20 to 48 ms; the
link tables, the parser, the SEO constants and the rest are a few milliseconds each.
Both are scans of page source that need a block parse, and they are the first block
parses of the build, so they run before the engine has compiled the parser: alone and
warm, the same two take about 15 ms and 3 ms.

- **`findCountRefs` cuts into code spans only the lines that hold a placeholder.** It
  called `maskCode` on the whole of each page that holds one, and those are the longest
  pages of the site (the developer pages: 0.6 MB in all). A placeholder cannot span
  lines, so a line of a fence is skipped and any other line with a placeholder is cut
  with `splitCodeSpans`. The block parse remains: it is what says where the fences are.
  `checkPlaceholders` is 30 to 43 ms since, and `markdownInit` 78 to 109 ms.
- **`maskCode` finds line ends and backticks with a regular expression and `indexOf`**
  (`lib/markdown.mjs`: `splitLines`, `splitCodeSpans`), where it read one character at a
  time. Over every page it took about 200 ms on one thread and takes about 115 ms, of
  which the block parse is 80 ms. The render lanes call it on every page
  (`applyPreRenderRewrites`), so that is about 85 ms of CPU off the render, shared among
  the lanes. Old and new were compared over every page of the site: the same masked
  text, the same segments of every line, the same placeholders.
- **The package tests' folders are listed once.** `packageTestRels` is a few dozen
  synchronous file calls (5 to 20 ms); `markdownInit` keeps its result
  (`state.site.packageTestRels`) for `dispatch`, which made the listing again.

What is left is the two cold block parses: of `Reference/Attributes.md` and
`Reference/Enumerations.md` in `deriveCounts`, and of the pages with a placeholder in
`checkPlaceholders`. Giving them to a lane would need the site's parser there, which is
the second stage of a lane's boot: on Windows a one-off build's lanes are still loading
it when `markdownInit` runs, so it would wait for them. Not done.

### A hung build times out and says where it hung

Readers get this at [When a build stops instead of
failing](docs/Documentation/Building.md), with a `--stall-timeout` row in
`Tools.md`'s flag table and an entry in `Builder.md`'s failure-mode list. Keep
those in step with any change here.

**A task that a worker claims and never finishes wedges the whole graph in
silence.** Its successors' dep counts never drop, `_remaining` never reaches
zero, the scheduler's promise never settles, and the process sits there with its
last log line on screen. Nothing in the SAB protocol can notice, because the
scheduler is waiting on a message that is not coming.

`Scheduler` watches for that. If no task completes for `--stall-timeout`
seconds (default **120**, `0` disables), it prints what was outstanding and
fails the build. The default is generous: the longest single task is worker cold
boot at ~1.6 s, and a loaded CI box may be an order of magnitude slower than the
dev box without being stalled.

The report splits the outstanding tasks three ways, because one list buries the
two names that matter under a dozen that do not:

- **Claimed by a worker that never returned** --- the cause. For a `render:i` or
  `flush:i` chunk it also prints the chunk's source pages, via an optional
  `describe()` on the task def that nothing but this report reads. "render:33
  never returned" is not actionable; the six paths under it are, because the
  fault is nearly always one page's content.
- **Runnable, but nothing picked it up** --- including the `F_PIN_TO_PRED` case.
  A pinned `flush:i` can only run on the lane its `render:i` ran on. When that
  lane is the wedged one, the task is runnable and permanently unrunnable at
  once; unlabelled, it reads as a second, unrelated fault.
- **Blocked on a predecessor** --- the consequence, with the missing input names.

Two details:

- `Worker.terminate()` kills a thread spinning inside a regex, so the abort ends
  the process rather than adding a second hang.
- Under `--serve` the pool outlives a rebuild, so a wedged worker would poison
  every later build (the per-worker tasks wait on every lane). The stall error
  carries a `stalled` flag and `serve.mjs` replaces the whole pool when it sees
  one. Replacing just the wedged lane would need to identify it, and the SAB
  records the lane a task *completed* on, not the one that claimed it.

[builder/PLAN-checks.md](builder/PLAN-checks.md) designs folding `check.bat`'s
gates into the task graph. The link checker runs there already, inside `flush`
([The link check runs inside the build](#what-belongs-in-testbat-rather-than-checkbat)).
The `pick_a11y_sample.mjs --check` census and the axe scan's orchestration are not
yet designed; the plan holds measurements and open questions for them.

## Tooling policy

### Tooling is JavaScript, and the three remaining `.py` files each have a reason

**A tool that rewrites a file must preserve its line endings byte-exactly.** Python's `Path.read_text` / `write_text` round-trip applies
universal-newline translation, rewriting any LF file it touches to CRLF on Windows
--- a whole-file diff for a one-character fix. Some of the tree's markdown files
are LF, so the trap is live.

These `.py` files stay, each for a reason:

- **`scripts/impexp.py`** is not tooling. It is a published download, declared in
  `_config.yml`'s `bundle_extra` beside `impexp.mjs` and offered to readers on
  [Import/Export Tool](docs/Features/Packages/Import-export%20tool.md) as the Python edition
  of the same standalone tool. Porting it would delete a deliberate offering. The tool has
  a third edition, `scripts/impexp/`, in twinBASIC (see the folder paragraph below).
- **`scripts/build_fonts.py`** stays because the JavaScript build of HarfBuzz it would
  use produces wrong CFF2 metrics --- a one-line build-configuration defect in harfbuzzjs,
  documented with the evidence in [WIP.Fonts.md](WIP.Fonts.md), which also holds the full
  account of the blocked JavaScript port.
- **`scripts/subset_font.py`** cuts each font an SVG screenshot embeds down to the
  characters it draws (`shoot_docs --svg`, [WIP.Screenshots.md](WIP.Screenshots.md)). It is
  fontTools, the subsetter `build_fonts.py` already relies on. It does not use harfbuzzjs
  (owner: "don't mess with harfbuzz"). It loads a font without recalculating glyph bounds, because the
  IDE's icon font stores loose glyph boxes and recalculating them moved icons a pixel, and it
  keeps the hinting (owner's decision) and the font's timestamp, so a picture's SVG is the same
  bytes from one run to the next.

One `.ps1` exists. **`scripts/lib/tb-launch.ps1`** is Win32
calls --- `CreateDesktop`, `CreateProcess` with `STARTUPINFO.lpDesktop`, and the job object
the IDE runs in (`CreateJobObject`, `AssignProcessToJobObject`) --- which Node cannot make
without a native FFI addon. Adding one for a few calls would mean
`npm install` no longer suffices to run the tooling. It is also not a script anyone runs:
`scripts/lib/tb-ide.mjs` reads the text and passes it through `-EncodedCommand`, so it never meets the
execution policy. See [Compiling a twinBASIC project without the IDE in front of
you](WIP.Harness.md#compiling-a-twinbasic-project-without-the-ide-in-front-of-you).

Some folders hold a program written in twinBASIC itself, each for a reason of its own.
**`scripts/imagestrip/`** strips the metadata from an SVG file and from the images a CSS or
SVG file embeds as `data:` URIs, at any depth, for the IDE's own stylesheets. Its users are
the twinBASIC developers, who run it in their own build, which has twinBASIC and need not
have Node, so a Node edition of the program would serve nobody. Nothing in this repository
runs it but the half of `test/compact-image.test.mjs` that is skipped unless `IMAGESTRIP_EXE`
names its exe, because no gate can build it. It is laid out as a reproducer under `bugs/`
is, an exported tree in `src/` with `imagestrip.twinproj` packed from it beside it, and
both are checked out byte for byte so that the two agree; nothing checks that they do, so
a change to `src/` is packed again by hand. See [Tools and
Scripts](docs/Documentation/Tools-IDE.md#imagestrip).

**Its own unit tests are twinBASIC `[TestFixture]` modules in `src/Sources/Tests/`**, with
the images they build in `TestImages`, run by `tbrun --tests` (owner), which reads
every `.twin` under `Sources/`. `TestImages.Cat` copies each `ParamArray` element through a
`Variant` before assigning it to an array, around a twinBASIC defect queued in
BUGS-TO-REPORT.md.

**Its reference is `stripFile` in `scripts/lib/compact-image.mjs`.** The test runs the program
over a corpus of CSS and SVG files and the newest install's stylesheets, and compares its
output, summary line and reports with `stripFile`'s byte for byte; the negative control (a
build without one rule) fails it. The two are kept in step by hand: a change to what one
strips is a change to both. `compactImage` in the same module is what the SVG screenshots
(`scripts/svgshot/snapshot-svg.mjs`, [Pictures as SVG](#pictures-as-svg)) embed their images
through, so a change to what it strips reaches their SVGs on the next `shoot_docs --svg` run.
What both strip was decided by the owner:

- **An embedded image keeps its pixels and any notice of whose it is, and nothing else.**
  The IDE's icons carry GIMP's EXIF, IPTC and XMP profiles (12 KB around a 28-pixel icon),
  "Created with GIMP", Paint.NET's and ImageReady's names, CorelDRAW's and Illustrator's
  comments and metadata, "Optimized with ezgif" in a GIF; its lock icon, from fileformat.info,
  carries a CC BY-NC-SA attribution (Title, Author, Description with the source, Copyright)
  that must stay with it. So a PNG keeps its image and colour chunks and the text chunks that
  name a picture, its author, source or terms; its colour chunks go when they say only sRGB
  (GIMP's built-in profile, 672 bytes in every PNG it saves, known by its colourants and
  curves, with `gAMA` and `cHRM`). A JPEG keeps its coding segments, JFIF, ICC and Adobe's; a
  GIF all but its comments; an SVG all but its declaration, an empty DOCTYPE, comments and
  metadata; and any profile, comment or metadata that gives a value to an author or a rights
  field stays whole, as does an EXIF that turns the picture.
- **An image is named by its bytes**, because a `data:` URI's label can name another type, or
  none (`/png`).
- **Recursive, so that CSS and SVG are handled alike.** An SVG image is stripped as an SVG
  file is, images inside it included; one of the IDE's Illustrator icons holds a PNG with a
  2.6 KB ICC profile in base64 broken by CR LF, which is why base64 is read as a browser
  reads it.

Two differences between the program and `compactImage` are deliberate and are `stripFile`'s
too: a BMP is only relabelled, not converted to a PNG (that is compaction, and would need a
PNG encoder in twinBASIC), and an image keeps its encoding --- base64 rewritten only when its
image changed, a text SVG cut in place, escapes and all --- where `compactImage` writes every
SVG as percent-encoded text.

**`scripts/impexp/`** is the third edition of the impexp tool, a twinBASIC console program,
for a reason of its own: it is a published download for readers who have twinBASIC and
neither Node nor Python, offered on [Import/Export
Tool](docs/Features/Packages/Import-export%20tool.md) as `impexp.twinproj`, which the reader
opens in the IDE and builds (`bundle_extra`, `docs/_config.yml`). It is laid out as
`scripts/imagestrip/` is, `src/` and `impexp.twinproj` packed from it, both checked out byte
for byte; nothing checks that they agree, so a change to `src/` is packed again by hand
([below](#what-is-not-javascript-and-how-each-is-rebuilt)). It has the same command line,
output, exit codes and `--self-test` as `impexp.mjs` and `impexp.py`, and writes
byte-identical project files. `check_impexp_parity.mjs` compares it only when `IMPEXP_EXE`
names its built exe, because no gate can build it; CI never sets the variable. The check runs the exe through `launchOnDesktop` with `cwd` (`TBBUILD_CWD` in
`tb-launch.ps1`) set to each case's scratch folder, so it never runs on the user's desktop.
See [Tools and Scripts](docs/Documentation/Tools-Compiler.md#impexp).

Two `.mjs` files also run a little PowerShell inline, for Windows state Node has no API
for, and neither adds a file: `scripts/tbrun.mjs` takes a process snapshot with
`Get-Process`, and `scripts/lib/tb-registry.mjs` reads and restores the IDE's registry
keys through .NET, because `reg.exe` mangles names outside the console code page. See
[What a run leaves in the registry](WIP.Harness.md#what-a-run-leaves-in-the-registry-and-putting-it-back).

`lib/` — modules that every other tooling folder may import, and that import none of them.
`builder/` may not import `scripts/`, so code that both need lives here;
[lib/README.md](lib/README.md) states the rule, and `biome.jsonc` refuses an import that
breaks either one. The rule has one exception, named in `biome.jsonc`:
`scripts/impexp.mjs`, a published standalone tool that must stay one dependency-free
file, which the build packs the help add-in's project file with (see [The help add-in's
project file](#the-help-add-ins-project-file)).

`wisdom/` — Discord knowledge-harvesting tool (three-phase: export → process → extract). Plans in `wisdom/PLAN-{1,2,3}.md`; implementation under `wisdom/`. Uses only Node.js built-in APIs. Running it is [WIP.Wisdom.md](WIP.Wisdom.md).

`indexer/` — package indexer: reads the twinBASIC packages (the built-in and default ones from the local install, or with `--release` from the GitHub release; the community ones from TWINSERV), parses their `.twin` sources and writes an `api.json` snapshot per package into a local git store. The build does not use it. Uses only Node.js built-in APIs. Its layout and commands are in `indexer/README.md`, and why it is built as it is in [WIP.Indexer.md](WIP.Indexer.md). It is under the lint, format and regex-safety gates like the other tooling folders; `sample.twinpack` and the committed snapshots are data, not scripts; the sync state lives in the gitignored store, not in the repository.

`eval/` — use-case evaluation of the developer documentation. `build_corpus.mjs` mirrors the
repository with every non-prose file stubbed unreadable, so "documentation only" is a property
of the tree rather than an instruction. `site_search.mjs` replays the site's real lunr index
and query logic, because search and navigation fail on different pages. `usecases.md` is the
catalogue, `protocol.md` is what an evaluator is given. **This asks whether the docs *work*,
which is orthogonal to whether they are accurate** — most findings involve sentences
that are individually true. Mine this file for cases: much of it is a catalogue of
"this shipped broken and nobody noticed", and each entry is a use case to write.

### What is not JavaScript, and how each is rebuilt

The section above says why each exception exists. What a change to each needs, since no gate
can build the twinBASIC ones:

- **`scripts/lib/tb-launch.ps1`** also lists and captures the windows on a private desktop
  (`desktopWindows`, `captureWindow` in `tb-ide.mjs`).
- **`scripts/imagestrip/`**: after a change to its `src/`, pack `imagestrip.twinproj` again
  with `impexp`, run its own `[TestCase]`s with `tbrun --tests`, and run the half of
  `test/compact-image.test.mjs` that tests it with `IMAGESTRIP_EXE` set to its exe.
- **`scripts/impexp/`**: after a change to its `src/`, pack `impexp.twinproj` again with
  `impexp` (`node scripts/impexp.mjs import scripts/impexp/impexp.twinproj scripts/impexp/src --overwrite`)
  and run `node scripts/check_impexp_parity.mjs` with `IMPEXP_EXE` set to its exe, whose
  `--self-test` and command sequence are its tests. **A change to what impexp does, or to its
  self-test, is made in all three editions** in one commit; CI compares only the Node and
  Python ones.
- **`scripts/broker/`** is a twinBASIC program too, `tbbroker`, which hands out private
  desktops, slots and ports to every tool on the machine, launcher-re's `tblaunch` among them,
  and needs desktops, process handles and overlapped pipes, which Node cannot make without a
  native addon (owner: twinBASIC). It is laid out as imagestrip is. After a change to its
  `src/`, pack it (`node scripts/impexp.mjs import scripts/broker/tbbroker.twinproj scripts/broker/src --overwrite`),
  install it with `node scripts/tbbroker.mjs install`, and run `test/broker.test.mjs` with
  `TBBROKER_EXE` set to `%LOCALAPPDATA%\tbbroker\tbbroker.exe`.
- **tblaunch (the launcher repository) compiles every file of `scripts/impexp/src/Sources/` but
  `Program.twin`, by name, from this checkout**, under a `Sub Main` of its own: renaming or
  adding a module there, or giving one a public name tblaunch also has (`Json`, `Launcher`,
  `Container`, `Pack`, `Session`, `Install`, `Fmt`, `StdIo` and others), breaks its build, so
  tell the tblaunch session first. tblaunch packs a folder with `Impexp.PackTree`, through a
  class of its own that implements `ImpexpSource`: a change to the members of either is made
  with the tblaunch session too.
- **tblaunch compiles every file of `scripts/broker/src/Sources/` but `Program.twin` and
  `BrokerHost.twin`, by name, from this checkout**, as it does impexp's, and has a `BrokerHost`
  of its own: what differs between the two programs (the name in messages, the output, the
  version's suffix, the server's command line) is in `BrokerHost` and nowhere else, so a change
  to its members, a renamed or added module, or a public name tblaunch also has, is made with
  the tblaunch session.

## The gates, and the machinery they guard

### What belongs in test.bat rather than check.bat

**The split is by what a gate interrogates, not by what it happens to open.** `check_axe_patch_equiv.mjs` loads a built page, but only because its probe needs some document to run inside --- what it tests is the axe source patch, and it would be worth running against an empty `docs/`. That is the test: a new gate belongs in `test.bat` if it would still mean something with no documentation in the tree.

`check_publish_policy.mjs` and `check_axe_patch_equiv.mjs` are in `test.bat`, whatever a note under `builder/PLAN-*.md` says.

**Both CI workflows run every one of these scripts as its own step, unconditionally** --- CI never invokes the `.bat` files. The steps are one list, the composite action `.github/actions/run-gates/action.yml`, which both workflows call; adding a gate is in [WIP.md](WIP.md#the-gates-and-where-their-internals-are). So the split changes what a *local* content edit has to pay for and nothing about what reaches `staging`; a tooling regression cannot get in by someone skipping `test.bat`.

**The link and integrity check runs inside the build.** `build.bat` passes `--check-audit-index`, which implies `--check`. The check walks the HTML on the worker lanes that produced it: both trees' final strings are already decoded and in memory at `flush()`, so the ~270 MB the two trees weigh is never written out only to be read back. It also audits the tree index the build derives from its own records against what landed on disk (`--check-audit-index`, [below](#the-link-checks-two-front-ends-and-the-gate-that-catches-divergence)).

It catches broken intra-site links, missing pages, malformed `redirect_from` entries (the most common breakage when adding new pages or moving content between sections), duplicate ids, remote `<img src>`, badly nested tags, sitemap and search-index gaps, canonical mismatches, and (via a forbidden-prefix rule on the offline tree) any extracted link that still points at the live docs site after the offlinify rewrite. A clean `build.bat && check.bat` is the bar for "ready to commit".

A failing check never aborts the build: a broken link still produces a site you want on disk to inspect. It sets the exit code to 1 instead, whether the check found link failures, integrity failures or both (the summary lines say which). It keeps 2 for a build that could not do its job: a refused command line, a stall or a crash. `check_links.mjs` uses the same scheme.

The remote-asset rule fails the run on any `<img src>` resolving off-box (`http://`, `https://`, or protocol-relative `//host`). In the build it is unconditional --- `checkRemoteAssets: true` on both trees in `builder/check.mjs`'s `TREES` --- and *not* reachable by a flag: `tbdocs` rejects `--check-remote-assets` as an unknown argument. That name belongs to the standalone `scripts/check_links.mjs`, where it is opt-in. The PDF pass over `book.html` is informational, so enforcement comes from the `_site/` pass; every page in the book is also in `_site/`, making it a superset. The check is scoped to `<img>` only; `<iframe>` is untouched.

### The link check's two front ends, and the gate that catches divergence

[scripts/check_links.mjs](scripts/check_links.mjs) is the tool for a tree the build did not produce --- a release zip, a bisect, someone else's artifact. Both CI workflows run it, though not directly: the shared gates action invokes `check_links_diff.mjs --case fixture --a script --b index`, which calls the script in-process as its `script` side (only a `fused` side spawns, and it spawns `tbdocs`). In CI it is exercised only against fixtures, never against the real trees.

Both front ends run the check in [builder/check.mjs](builder/check.mjs), over the pure core in [builder/link-check.mjs](builder/link-check.mjs). The script keeps only its command line, its walk and reads of the tree, and its report's summary lines. [builder/check-tree.mjs](builder/check-tree.mjs) is the build's alone.

The two read the tree differently --- the build from memory, through an index of what it wrote and in chunks across its workers --- and **a checker that silently checks less reports a clean pass.** [scripts/check_links_diff.mjs](scripts/check_links_diff.mjs) is the gate against that, and it plays the same role on this side that `check_a11y_fingerprint.mjs` plays on the axe side. Run it whenever `link-check.mjs`, `check.mjs` or `check_links.mjs` changes:

```sh
node scripts/check_links_diff.mjs --a script --b fused
```

It diffs the two front ends' findings category by category across the real invocations: `_site/` with sitemap + search + canonical, `_site-offline/` with the forbidden-prefix rule, `book.html` with the same rule (there it collects the links that leave the book for the website, reported as `OUT OF BOOK`), and a `--baseurl` tree checked with the matching base path.

It is deliberately *not* in `check.bat`. CI runs only its fixture cases: `fixture` in the shared gates action, and `fixture-built` and `fixture-built-offline` against a `fused` side in `checks.yml` alone. The script side over the real trees costs ~3 s, which is the whole saving.

Two further modes matter:

- `--self-test` diffs the script against a deliberately corrupted side and fails unless the difference is reported. Everything else the harness prints reduces to "the two sides agreed", which is also what a harness comparing nothing says.
- `tbdocs --src docs --check-audit-index` diffs the tree index the build derives from its own records against what actually landed on disk. The findings comparison structurally cannot see this failure mode: a *missing* index entry turns a working link into a reported break, which is loud, but a *spurious* one masks a real break, and on a clean site nothing links to a path that does not exist.

The harness carries synthetic cases for the same reason: the real site is clean, so every real case compares empty against empty in eight of the nine categories. `fixture` is a hand-written tree. `fixture-built` and `fixture-built-offline` are trees the build produces from `test/fixtures/check-src`, which is the only way the fused side is held to a fault. Each provokes faults of known kinds and asserts the count, so a fixture that stops provoking one fails loudly instead of quietly going back to empty-vs-empty.

### The publish allowlist

**`discover()` files every non-page it finds under `docs/` as a static file, and
`write.mjs` copies it verbatim, so the source tree's shape *is* the site's shape.**
`_config.yml`'s `exclude:` alone is a denylist, and a denylist can only
refuse what someone thought to name in advance: a scratch `.md` with no
frontmatter, a `.bak`, a `.twin`, a `secrets.json`, a `.docx`, a `deploy.pem`,
`Thumbs.db` or a `build.log` planted in `docs/` would each be published at a
public URL on a green build.

Two publish surfaces reach the world from those trees: the deploy workflow
uploads `docs/_site/` wholesale to Pages, and the manual-dispatch path zips
`docs/_site-offline/` onto a GitHub release. Neither looks at what it is
carrying.

[builder/publish-policy.mjs](builder/publish-policy.mjs) inverts the rule ---
name what may ship, refuse the rest --- and is enforced at two points, both
**unconditional**, because a build run with `--no-check` is exactly when nothing
else is watching:

- **Source**, in the `discover` task, over the static-file inventory. Names the
  file on disk and aborts before anything is written.
- **Tree**, in the `dispatch` task, over each tree's derived inventory
  (`deriveTreeRels`). Covers what the source sweep structurally cannot see:
  redirect stubs, vendored theme assets, and the generated auxiliaries
  (`sitemap.xml`, `search-data.json`) are all minted by the build, not found in
  `docs/`.

Unlike the link check, **a finding here aborts the build**. A broken link still
leaves a tree worth inspecting; a tree with a private key in it is a tree nobody
should be one `upload-pages-artifact` away from publishing.

Details of the policy that matter:

- **`SOURCE_EXTENSIONS` and `BUILD_EXTENSIONS` are separate sets, and must stay
  separate.** The build emits `.xml` and `.json`; a contributor has no business
  dropping either into `docs/`, and `.json` is among the extensions most worth
  refusing at source. Folding the two together would pass every other assertion
  in the self-test, so the self-test asserts the disjointness directly.
- **`.md` is deliberately absent from both.** A markdown file that reaches the
  check is one `discover` found no frontmatter block in, so it would be
  served as raw markdown. The two likeliest causes are handled upstream: a
  **UTF-8 BOM** is stripped before parsing, and **malformed YAML** inside the
  block throws `Failed to parse frontmatter in <file>` from `discover.mjs`. What
  reaches here is a file with no block at all, or one where something precedes
  the opening `---` --- a blank line is enough --- so keep the message naming
  that and not the BOM.
- **`bundle_extra` is exempt by *path*, not by extension.** `_config.yml`
  declares `Features/Packages/downloads/impexp.py`, `impexp.mjs` and
  `impexp.twinproj` with both ends spelled out, which is what makes them shippable. The same extension
  anywhere else still fails; otherwise declaring one entry would bless a whole
  type.
- **`addin_project` is exempt by path too, and on the tree surface only.** The
  help add-in's `.twinproj` is written by the build, not found in `docs/`, so
  `publishPolicyFor` puts its `dest` in a set of its own, `generated`, which only
  `unpublishableTreePaths` reads. A `.twinproj` found in `docs/`, even at that
  path, is refused at source: the build writes the file there, and a copy in the
  source tree could only be a stale one. `check_publish_policy.mjs` asserts all
  three: the path publishes from a tree, a `.twinproj` elsewhere does not, and
  one at that path in `docs/` does not.

**A clean build says only that nothing in `docs/` is currently refused, which is
also what an allowlist widened until it refuses nothing says.** No build over a
clean tree can make the other assertion, so
[scripts/check_publish_policy.mjs](scripts/check_publish_policy.mjs) makes it
against named probes --- a `.bak`, a `.pem`, a `.docx`, a frontmatter-less `.md`,
a `Thumbs.db` --- plus the reverse (a `.png`, a `.PNG`, a `.woff2`, `CNAME` must
still publish, or a policy that refuses everything would also report a clean
sweep). No browser, no built tree, ~40 ms. It runs first in `test.bat` and in
both CI workflows.

```sh
node scripts/check_publish_policy.mjs
```

**Adding a new asset type is a one-line edit to `publish-policy.mjs`**, paid once by
the person who knows they are adding it, instead of silently by whoever drops a key
file into `docs/` later.

### Never rewrite markdown source without knowing what is code

**[lib/markdown.mjs](lib/markdown.mjs) is the one answer to what is code in a
markdown source.** Its exports: `blockRegions` (every fence, indented code block
and HTML block, with its lines, from a block-only markdown-it parse), `maskCode`
(hide the code, rewrite the prose, restore the code), `splitCodeSpans` (one line
cut into prose and code-span segments), `splitOnMarker` (sections split on a
marker line outside any region) and `mapLines` (rewrite each line, keeping its own
line ending). A tool that decides for itself what is code disagrees with the
renderer somewhere --- on a backtick fence whose info string holds a backtick, on
a fence a definition list makes --- so every tool that rewrites or scans page
source asks this module, with the site's parser when the site's syntax matters. Its
importers: `builder/render.mjs` (`applyPreRenderRewrites`, `rewriteAdmonitions`),
`builder/counts.mjs` (the count validator), `scripts/check_code_regions.mjs` (the
gate), `scripts/convert_em_dash_separators.mjs`, `scripts/check_examples.mjs` and
`scripts/lib/example-batches.mjs`, `scripts/check_gate_lists.mjs`,
`scripts/lib/attributes-doc.mjs`, `eval/nav_hops.mjs`, `eval/run_case.mjs` and
`wisdom/extract/merger.mjs`. A new one joins them; it does not write a private
fence regex. [lib/frontmatter.mjs](lib/frontmatter.mjs) plays the same part for
where a page's frontmatter ends.

`render.mjs` applies several kramdown-parity rewrites to **raw markdown**, before
markdown-it has parsed anything. A rewrite at that layer cannot tell prose from
code, and this site's subject matter *is* code, so an unguarded rewrite corrupts
code samples. What each one does when it is not guarded:

| rewrite | damage without a guard |
|---|---|
| `rewriteAdmonitions` body strip | eats the indentation of code inside an admonition, leaving `If`/`ElseIf`/`Else` bodies flush left --- wrong control flow, in a language reference. The same greedy strip also merges paragraphs inside admonition *prose*, which a code-focused audit never thinks to look for |
| `encodeSpacesInMediaUrls` | turns `Items[1](a, b)` into `Items[1](a,%20b)` |
| `rewriteTripleAsteriskEmphasis` | turns `' *** banner ***` into `' **_ banner _**` |
| `rewriteListItemSetextHeadings` | **deletes** a YAML sample's closing `---` and promotes the line above it to a heading |
| a Liquid-tag strip | removes `{% raw %}` inside fences, so no page could show the tag; no rewrite does this, and a probe in `check_code_regions.mjs` keeps it so |

**The same class exists on rendered HTML.** `book.mjs`'s chapter transforms
rewrite `id="`, `href="#` and `src="/` across a whole body. An inline code span
is emitted through `escapeMarkup`, which escapes only `&`, `<` and `>`, so
quotes survive as literal bytes and all three patterns match inside a sample:
`<style id="jtd-nav-activation">` would read `<style id="ch-...-jtd-nav-activation">`
in the PDF.

Highlighted *blocks* escape this only by accident: the highlighter splits
attributes across `<span>` boundaries, so `src="/vs/loader.js"` never appears as
a contiguous byte sequence. Inline spans get no such treatment. **Do not rely on
that accident.**

A new rewrite must use one of these mechanisms:

- **Source rewrites** go inside `applyPreRenderRewrites` in
  [builder/render.mjs](builder/render.mjs), between `maskCode` and its
  `restore`. The chain between them is `rewriteTripleAsteriskEmphasis`,
  `encodeSpacesInMediaUrls`, `rewriteListItemSetextHeadings` and
  `absorbTrailingHtmlComments`. `maskCode` masks every fence the site's parser
  finds --- including one inside a blockquote or admonition, inside a list item,
  or one the definition-list plugin makes after `: ` --- plus every inline code
  span outside a fence. `applyPreRenderRewrites` takes the site's markdown-it
  instance and throws without one, because a bare parser would mask differently from the build.
- **Rendered-HTML rewrites** use `replaceOutsideCode` from
  [builder/code-guard.mjs](builder/code-guard.mjs), or compose their pattern
  from its `CODE_OR_PRE`, a leading alternative that consumes `<code>` and
  `<pre>` atomically, as `offline-rewrite.mjs`'s `HTML_COMBINED_RE`,
  `book.mjs`'s `IMG_SRC_RE_BOOK` and `counts.mjs`'s `SURVIVING_PLACEHOLDER_RE` do.
  The three that rewrite every page, `normaliseVoidTags` and `padEmptyCells`
  (`render.mjs`'s `applyPostRenderRewrites`) and `template.mjs`'s
  `injectAnchorHeadings`, go through `replaceOutsideCode` too. Code the
  renderer produced cannot match their patterns, since its `<` is escaped, but
  a `<pre>` or `<code>` written as raw HTML reaches them as written, and
  whitespace inside one is content.
- **Token rules**: an `md.core` rule that rewrites only `text` tokens, as
  `kramdown-dashes`, `kramdown-ellipsis` and `kramdown-possessive` do, never
  sees code, because markdown-it gives code spans, fences and indented blocks
  token types of their own (`code_inline`, `fence`, `code_block`).

**One gap is deliberate:** the chain does not
mask **indented** (4-space) code blocks or HTML blocks, since it calls `maskCode`
without `indented: true` (which masks indented blocks; HTML blocks are never
masked). `check_code_regions.mjs` *does* compare indented blocks, so a rewrite that
damages one is reported --- and must be fixed at the rewrite, not by widening the
mask. Code inside a raw HTML block is invisible to the gate: it is one `html_block`
token, which the comparison does not read.

`rewriteAdmonitions` deliberately runs **outside** the mask. It finds an
admonition's lines by their `>` markers and strips them, and a masked fence
inside an admonition takes its markers with it into the stash. It asks
`blockRegions`, with the same parser, which lines are code instead.

It also reads the label, the rest of the `[!TYPE]` line (`lib/callout-labels.mjs`),
and throws on one it cannot parse, because dropping that text silently would let
a typo in a label vanish. A package version in a label is checked against
`page.packageVersion`, the section's `indexed_from`, which the main thread stamps
on every page before the render chunks go to the workers, since a chunk need not
hold the section's landing page. The code-region gate calls the chain with no
`packageVersion` at all, which skips that check rather than failing every
labelled page: "" means a page in no section.

### Whitespace inside inline code is content

A documented value can be a padded string: [Partition](docs/Reference/Default/VBA/Interaction/Partition.md)
returns fixed-width, space-padded range strings, and `Debug.Print` with comma
separators emits print-zone padding that *is* the behaviour a page shows. A
pipeline that collapses whitespace runs inside inline `<code>` renders
`"  0:  4"` as `" 0: 4"` and states a wrong return value. Matching Jekyll's
compressor is not a reason to do it.

**The padding has to be in the page's source, and be the measured value.** A
pipeline can only preserve padding that reaches it. Check a claim about padding
by running the page's own sample through `tbrun`: a positive number carries a
leading space where its sign would be, and a trailing space, and a print zone is
thirteen spaces wide.

**An inline code span cannot carry a leading or trailing space naively.**
CommonMark strips one space from each end of a code span whose content is not all
spaces, so writing `` ` 1 … 3 ` `` renders as `1 … 3` --- the exact value the page
is trying to state, silently de-padded by the parser rather than by anything in
`builder/`. Double the outer spaces to defeat it, and verify in the built HTML
rather than by eye.

**Two behaviours, and neither works alone:**

- `compress.mjs` treats inline `<code>` as a preserved region as well as `<pre>`
  (`CODE_BLOCK_RE`), so the bytes survive compression.
- `custom/custom.scss` and `print.css` give inline code `white-space: pre-wrap`,
  because a browser collapses runs inside inline code by default. `pre-wrap`
  rather than `pre` so a long snippet still wraps instead of forcing a
  horizontal scroll.

**Making `<code>` a split boundary has one trap.** The collapse function trims
each segment's ends, which is harmless beside a block-level `<pre>` but, beside
an inline `<code>`, welds the code to the word next to it --- `a <code>x</code> b`
would come out as `ax b`. Trimming is conditional on which element bounds the
segment, so `<pre>` boundaries still trim.

### Source dashes in alt text

**Alt text converts too.** markdown-it's own `replacements` rule does not descend into an
image token's children, but `kramdownDashesPlugin` ([builder/render.mjs](builder/render.mjs),
registered after it) walks with `walkTokens`, which recurses, so it reaches image alt and
converts the dash like any other text. Measured: **zero literal `--` survives in any `alt=`
anywhere in the built site**, in all three trees.

> **Verify through `builder/`, never a bare markdown-it.** A plain `markdown-it` with
> `typographer: true` leaves `--` in alt text untouched, so a test against the npm
> dependency tells you nothing about this site. Render through the pipeline, or read
> the built HTML.

### HTML comments never reach the output

`stripHtmlCommentsPlugin` (a core rule in `builder/render.mjs`, owner's request) drops every
`<!-- ... -->` the markdown holds from all three trees: the SHOT markers, the `<!-- test: ... -->`
region markers and notes. It edits `html_block` and `html_inline` tokens only, which is why a
comment shown in a fence or a code span is untouched: those are `fence` and `code_inline` tokens,
escaped by their own renderers. It is registered after `tightLooseListPlugin` and must stay
there, because that rule sees a comment block as a block of its own when it decides a list item's
tightness. **Nothing downstream reads a comment from rendered HTML**: `check_package_tests.mjs` and
`package-test-cases.mjs` read the markdown source, and what the build needs from a comment is
written by the templates, not by markdown, so it stays: the `Begin/End Jekyll SEO tag` pair
(`offline-rewrite.mjs` finds the block by it) and the two icon licences in `template.mjs`. A rule
that needs a marker in a page's output uses an element or an attribute, never a comment.

The pages' markdown copies (`builder/markdown-copy.mjs`) keep the rule: `withoutComments` takes
every comment out of the source with code masked, fences, code spans and indented code blocks
alike, so a comment a sample shows stays and a maintainer's note does not reach `<page>.md`.

### Markdown copies and llms.txt

Each page's source is published beside its HTML in the online tree as `<page>.md` (`index.md` for
a URL ending in `/`), named by `<link rel="alternate" type="text/markdown">` directly after the
page's `<meta charset>`, and `/llms.txt` lists them by the nav tree's top level. Both are for
agents: the footer's "Edit this page on GitHub" link is at the end of a long file, and goes to
GitHub's HTML view of the source.

The copies are on the site rather than on `raw.githubusercontent.com` (owner) because the sources'
links are written against the page's URL, not the file's: `[Option](../../Core/Option)` on
`Reference/Default/VBA/Strings/InStr.md` resolves from `/tB/Modules/Strings/InStr` and 404s from
the raw file.

**A copy's link to a page goes to that page's copy** (owner), root-absolute with the baseurl and
the link's fragment, so an agent following links stays in markdown. Which page is the HTML's
answer, never the copy's own: `resolveTarget` (render.mjs, the function `relativeLinksPlugin`
calls through `resolveHref`) for a `tb:` shortcut and a path from the source file's folder, and
for a link the HTML keeps as written, the URL API resolving it against the page's permalink, as a
browser does, then `pageAtSitePath`: a page's URL, its `redirect_from:` alias, or `/`, which
`byUrl` leaves out (its key would be "", which `resolveLink` must not match). A link table entry
carries its page's copy across to the workers (`serializeLinkTables`: `[key, permalink,
markdownUrl]`). A link to a file is the HTML's URL; a pure fragment stays, since the copy is the
same document. Measured 2026-11-16, markdown-it's links in each copy, against those of the
same copy with its links as written, gave on 1,538 pages: 19,783 to the
copy of the page the HTML reaches, 9,358 to where the HTML's go (in-page fragments, other sites,
484 files), none wrong. The link scan finds `](dest)` and `[label]: dest`, not a footnote's
`[^1]: text`; markdown-it finds the same links on every page but those inside comments, which the
copy drops first. A destination with white space in it is not looked for, since no page has one;
`encodeSpacesInMediaUrls` would be the model if one appears.

The copies cost about 13 MB in the online tree and nothing in the offline tree or the help archive:
an offline page's `<link>` goes to the website's copy, by the general rule for a file only the
website holds (`computeWebsiteUrl`), which the offline check excuses (`isWebsiteOnlyLink`). The
recheck of the page the Gantt chart is injected into builds the same exemption
(`websiteOnlyExemption` in `tbdocs.mjs`), since `BuildInfo.html` has such a link too.

`llms.txt`'s note for a page is the first sentence of its introduction, the part above its first
`<h2>`, from `renderedContent` (`pageSummary`, `seo.mjs`), which is also the page's
`<meta name="description">`: the Glossary's first paragraph defines its first term, and is no
summary of the page. A page whose introduction has no summary sentence gets a link with no note
and no description; the fix is the sentence the authoring rules ask for under the H1, not a rule
here. `llms.txt` also names `tB/symbols.json`, the lookup an agent needs (the site's search runs
in the browser, on a 55 MB index), and `nav.html`.

The copies and `llms.txt` are made by `builder/markdown-copy.mjs` and `builder/llms-txt.mjs`. A copy is the page's source with what reads differently on the page changed, outside code: the front matter, the HTML comments, the `{{tbdocs:...}}` placeholders and the links. **A new syntax that the render turns into something else** (a placeholder, a link scheme like `tb:`) **is handled in the copy too, through the same function** (`resolveTarget`, `expandDownloadPlaceholders`, `substituteCounts`), or the copy publishes it as written. `check_code_regions.mjs` holds the copy to the source's code. `llms_txt.optional` in `docs/_config.yml` names top-level pages by title, so renaming one fails the build until it is edited.

### The nav: a part on each page, the whole in one file

**A page holds only its part of the nav tree, in both trees** (owner): the top level and its
own branch. Online, the whole tree is `/nav.html`, a page of its own that `writeAux` writes, which
`docs/assets/js/nav-tree.js` grafts in once the page has loaded and the "Contents" link after the
nav opens; offline it is `assets/js/nav.js`. **Never put the whole tree back into the online
pages**: measured on 2026-11-16, it was 223 KB of `InStr.html`'s 247 KB (19 of its 25 KB
gzipped, 1,539 links), all before `<main>` (byte 236,127), and agents' fetch tools ignore
`<link rel="alternate">`, convert the HTML and cut it at a budget, so they saw the nav and not
the page. With its part only, `InStr.html` is 38 KB (7 KB gzipped), `<main>` at byte 27,522,
and the link check reads 195,476 link occurrences in the online tree, not 2,463,234.

A page of its own online, rather than a `nav.js` as offline, is the owner's choice:

- **A reader without JavaScript keeps the whole tree,** one link away: the "Contents" link after
  each page's nav opens `nav.html`, every branch shown (its expanders hidden by its own style,
  since nothing could expand one). It is also a list of every page for an agent, which `llms.txt` names.
- **Nothing blocks the page.** `nav.js` is a 241 KB script loaded before the page's own; online,
  `nav-tree.js` is deferred and fetches `nav.html` when the browser is idle, or when an entry is
  expanded first. The part each page holds is exactly what shows when it opens (an entry off the
  path keeps its expander, not its branch), so the graft adds only hidden branches, and nothing
  moves. It appends to the page's own nodes rather than swapping the list, which would undo what
  just-the-docs did at load: the current page's mark (`activateNav`, which also takes the link's
  `href` away) and the scroll (`scrollNav`). just-the-docs expands an entry from a click handler on
  the document, so a grafted entry expands like any other, and one expanded before the tree came
  shows its branch when it comes (checked in a browser with `fetch` slowed by 2 s).
- **A stale `nav.html` is never grafted in the wrong place.** The two trees are walked side by side
  and the walk stops where an entry's title differs (a cached file from before a deploy, or a deploy
  between the page and the fetch); the page also asks for its own build's file, `nav.html?v=<hash
  of the tree>` (`navTreeVersion`), which GitHub Pages serves as `nav.html` and a browser caches
  apart.
- **An `<iframe>` was ruled out:** the frame cannot know the page it is in, so it could not mark the
  current page or open its branch, and the theme, the mobile menu and focus would need bridging.

`withOnlineNav` runs after the offline page is derived from the templated HTML, which still holds
the whole tree, so `withPartialNav` and the offline tree are unchanged; both cut through `trimNav`.
`nav.html` is checked by `linkJoin` with the online tree's redirect stubs, since nothing else would
read its links; it has no canonical link and is in neither the sitemap nor the search index. The
help add-in's pane hides the nav, and `nav-tree.js` fetches nothing there.

### The book refuses a stale source tree

Testing only that `docs\_site-pdf\book.html` **exists** is not enough: edit a
page, run `book.bat` without `build.bat`, and it would spend two minutes rendering
the *previous* book and report success. Nothing downstream can notice --- the PDF is
internally consistent, correctly paginated and correctly bookmarked, simply the
wrong book. So the freshness gate runs first:

```sh
node scripts/check_tree_fresh.mjs --tree docs/_site-pdf --marker book.html
```

**`--marker` is what makes that work on this tree.** The script identifies a tree
by its `index.html`, which every output tree has *except* `_site-pdf/` --- that one
holds a single `book.html`. Exit codes are the script's: **2** when the tree is
absent, **1** when it is older than one of its sources (`DEFAULT_SOURCES`). The renderer that runs after it
has no 1, so `book.bat`'s 1 means a stale tree (or a failed `npm install`) and nothing about the render.

> **Batch detail:** `%ERRORLEVEL%` inside a parenthesised `if errorlevel 1 (...)`
> block expands when the block is **parsed**, not when it runs, so the value
> captured there is the one from before the check. The guard uses
> `goto :fail` and captures outside the block, which is the same shape
> `test.bat` uses, and for the same reason.

**Known false positive.** `DEFAULT_SOURCES` is `docs`, `builder`, `lib`, `add-in`
and `scripts/impexp.mjs`, and does not distinguish code from notes, so editing a
`builder/PLAN-*.md` or `REVIEW-*.md` marks every tree stale even though nothing in
the build reads those files; so does a file under `add-in/` that git does not track,
which the add-in's project file leaves out. It errs toward refusing, which is the
safe direction, and a rebuild is ~4 s --- but a pure note edit blocks a `book.bat`
render until you rebuild. `add-in/` and `impexp.mjs` are there because they decide
the bytes of the [help add-in's project file](#the-help-add-ins-project-file).

**Which folders under `docs/` are outputs comes from one list.** A build given
`--dest docs/_site-basepath` writes `_site-basepath-offline` and
`_site-basepath-pdf` as well, unless `--no-offline` and `--no-pdf` skip them, so
naming output folders one at a time misses some and reads them as sources. The
script skips the top-level folders that `isOutputTree` in
[lib/markdown-files.mjs](lib/markdown-files.mjs) names --- the prefix list
(`_site`, `_serve`, `_pdf`) the markdown walk uses --- and keeps only `.git` and
`node_modules` as names of its own. `prepDest` in `builder/tbdocs.mjs` prepares
only the trees whose passes run (`destinationTrees` in `builder/write.mjs`): a
build removes a skipped sibling rather than leaving it empty, and serve mode
prepares `_serve` alone, so it leaves no `_serve-offline` or `_serve-pdf` beside
it. `check_cli.mjs` probes the rule, because nothing else would notice two empty
folders beside a `--no-offline --no-pdf` build.

**Files the build writes into a source folder are not sources.**
`page-baseline.json` and `symbol-baseline.json` (`IGNORED_FILES`) are written
after the tree, so counting them would mark every tree that added a page or a
heading stale on the next `check.bat`. `package-api.json` is an input: the build
reads it and it decides the bytes of `tB/symbols.json`. Under `add-in/` two paths are
skipped by their place in the repository (`IGNORED_PATHS`): `Resources/HELP/`, where
the build writes the help archive, and `Resources/SYMBOLS/symbols.json`,
the copy of the index the build rewrites. Neither is an input, since the project file is
packed with the index the build wrote rather than with that copy.

### The code-region gate

[scripts/check_code_regions.mjs](scripts/check_code_regions.mjs) tokenises every
markdown file under `docs/` (`markdownFiles`), applies the real
`applyPreRenderRewrites` chain, re-tokenises, and compares the `fence` /
`code_block` / `code_inline` contents in order. Any difference fails. It also
checks on every page that `blockRegions`, which parses blocks only, finds exactly
the fences, code blocks and HTML blocks of the full parse. It is the gate on
`lib/markdown.mjs` and `lib/frontmatter.mjs` too (the module probes), and
holds the tools that ask them what is code: `builder/counts.mjs`'s count
validator, `builder/discover.mjs`'s warning about an unquoted frontmatter value
that ends in `#`, and `scripts/convert_em_dash_separators.mjs`'s dash normaliser.
Its other probes run `applyPostRenderRewrites` and `injectAnchorHeadings` over a
raw `<pre>` and `<code>`, which must come through as written. In `test.bat` and
both CI workflows; a few seconds, no browser, no built tree. Exit 0 clean, 1 a
code region changed or a probe failed, 2 the gate could not run.

```sh
node scripts/check_code_regions.mjs
node scripts/check_code_regions.mjs --verbose
node scripts/check_code_regions.mjs --self-test
```

**It imports the chain rather than reconstructing
it**, so removing the mask from one rewrite changes what the gate runs and is
caught --- a gate that exercised `maskCode` alone would pass. And **its probes
ride along in the normal run**, because the corpus is clean: a sweep that finds
nothing is otherwise indistinguishable from a gate that has stopped detecting. A
rewrite moved outside the mask is caught by the region probes (one or two
per damage in the table above, and a doubled-backtick span) while the sweep still
reports zero. After changing the chain or `maskCode`, move one rewrite outside the
mask and confirm a probe fails.

**The mirror fault needs probes of its own.** A rewrite that mistakes prose for
code corrupts nothing --- the text is stashed and restored unchanged, so every
region matches --- it simply never runs, and the sweep structurally cannot see
that. The case to hold in mind is a fence marker in the middle of a line:
[Reference/Attributes.md](docs/Reference/Attributes.md)'s `[Description(...)]`
sample builds a Markdown string out of twinBASIC string literals, two of which
are triple-backtick markers. A scan that pairs an opening fence with the next
marker *anywhere* closes the `tb` fence on the literal and mis-pairs every fence
after it. The page's admonitions then render as the literal text `[!NOTE]` in a
plain blockquote, and every other gate stays green: the region comparison
matches, the links resolve and axe has no opinion about a blockquote.

CommonMark closes a fence only on a line holding nothing but the fence character,
repeated at least as often as in the opener --- a rule about lines, not something
to express as one regex over a document. That is why `rewriteAdmonitions` asks
`blockRegions`, with the site's parser, which lines are code. It sees a fence a
definition list's `: ` makes, and leaves an admonition alone when its `[!TYPE]`
line is in a region. A fence *inside* an admonition is a region too, and the
rewrite still strips its `>` markers.

The admonition probes and the "chain leaves alone" probes assert this. An
admonition must still be converted between two ordinary fences, beside a fence
whose body holds a fence marker, after a tilde fence, after a fence closed by a
longer run, after a line whose backtick info string keeps it from opening a fence,
and before any fence, and must be left alone inside a fence the definition-list
plugin makes. **Writing one correctly is not obvious**: a mis-paired fence opener
swallows text only as far as the next fence marker, so a probe with no fence
*after* the admonition passes against the very fault it was written to catch. The
damage is always to the prose **between** two fences. The docs corpus holds no
tilde fence, so the sweep could never find a fault there.

**Nothing else can see this class.** The link check, integrity check, publish
allowlist, regex-safety gate and axe scan all pass on a tree with corrupted code
samples in the published book, because the corruption is inside `<code>` and none
of them looks there.

**Walk `docs/` for markdown with `markdownFiles`** ([WIP.md](WIP.md#donts)). A
recursive `readdir` that drops the output trees from its results afterwards has
already descended into `_serve`, which a running preview deletes and rewrites on
every rebuild, and dies with `ENOENT` when a folder vanishes under it.
[lib/markdown-files.mjs](lib/markdown-files.mjs) skips the top-level `_site*`,
`_serve*` and `_pdf*` folders before entering them.

**A content edit reaches only the corpus sweep**, which reads `DOCS_DIR` (`<repo>/docs`):
a page that provokes a rewrite into *altering* a code region fails it. The fixed probes run
against their own sources whatever the tree holds. So after adding an unusual code construct
--- a fence whose contents include a fence marker, a 4-space indented block, an admonition
wrapping a fence --- run `test.bat` and read the built page as well: for the mirror fault the
gate asserts that the mask and the admonition scan still work, not that your page renders.

### The page-count drift guard

**A floor is not a drift check.** A constant floor on the page count catches a
loss only while the site is close to it: a site of 914 pages that loses 37 to a
blanket `**/_*/**` exclude (the AppGlobalClassObject pages live under `_App/`)
still clears a floor written for 836, and the build says nothing at all. The
guard is `builder/page-baseline.json`, a committed artifact of the same kind as
`inter-metrics.json`, holding the page and static-file counts:
**a rise rewrites it and says so, a fall fails the build.** A tight floor is the
wrong alternative: it fires on every legitimate page removal, and a gate that
fires on ordinary work gets switched off. A rise costs nothing, so the number
stays current by itself; only a fall wants a decision, and
`--update-page-baseline` records it, in the same commit as the deletion.

Its rules, each a comment where it is decided: the first and third in
[builder/baseline.mjs](builder/baseline.mjs), which holds the comparison the page
and symbol guards share, and the second in
[scripts/check_tree_fresh.mjs](scripts/check_tree_fresh.mjs):

- **The baseline is keyed to a source tree.** `tbdocs` is not only run over
  `docs/`: `check_links_diff.mjs` spawns it over `test/fixtures/check-src`, three
  pages. Against an unkeyed baseline that build would report hundreds of pages
  missing --- a loud, confident, entirely wrong finding, on the one harness whose
  job is noticing when two front ends disagree. `GUARDED_SRC` names the tree the
  numbers are of and every other root is skipped in silence.
- **The build writes a tracked file, so `check_tree_fresh.mjs` must not count
  it.** The write happens after the tree, so without `IGNORED_FILES` the next
  `check.bat` would call the tree it had just built stale, on exactly the builds
  that added a page. The script's sources are "the inputs that decide the built
  bytes", and a baseline decides none of them. `dot` and `vendorAssets` write into
  `docs/` and escape this only because they run early.
- **Neither CI nor `--serve` may write, nor a build into another `--dest`.** A
  CI run that rewrote the file would record the drop it was asked to catch, so
  there a missing baseline is an error rather than a first run. `--serve`
  rebuilds on every save under `docs/`, so a page half-deleted in an editor
  would lower the baseline and a half-added one would raise it. A build into a
  `--dest` other than `docs/_site` is a private copy: agents building side by
  side into `.claude/<name>-site` would each rewrite the committed file, and
  every other checkout would have to undo it after every build. Such a build
  compares and prints `page baseline not raised: ...` for a rise; a fall still
  fails it. `baselineWrites` decides all three, and the symbol baseline and the
  add-in's index copy follow it too. `--update-page-baseline` writes whatever
  the destination.

**Mark a build failed through `failBuild`, never by assigning
`process.exitCode`.** `failBuild` is the one place `runBuild` sets the found-problems
exit code (1), so no later step can clear it; a refused command line or a crash
exits 2 instead.

`scripts/check_page_baseline.mjs` is the gate on the gate, in `test.bat` and
both CI workflows: probes against a scratch baseline, no browser, no
built tree, some of them on who may write. **It is needed because the guard is silent
on a healthy tree**, so a green build is exactly what a guard that has stopped working
produces. One probe replays the loss of 37 pages; the two that look redundant
(foreign source root, missing baseline under CI) each guard one of the rules
above.

### The book-coverage warnings

**A page no `_book.yml` entry selects is left out of the PDF without a word**
unless something says so. Some pages are out deliberately --- the 404 page,
Videos, Challenges --- and some would be left out by accident; with nothing
recorded, the two look the same. The book pass of the link check lists the links
from the book to pages it does not carry, but on a pass marked informational that
list reads as noise.

**`left_out:` in `_book.yml` names every page that is out on purpose, with a
`reason:`**, and `bookCoverage()` in `builder/book.mjs` warns about a page that is
in neither. Every page has an entry one way or the other, so a warning is a
decision nobody has made. Without the list the warning fires for dozens of pages
on every build, which is a warning nobody reads.

It reports, all empty on a consistent manifest: a page in no entry, a page
in the book and in `left_out:`, a book entry that selects no page, a `left_out:` entry
that matches none (a page renamed or deleted), and a landing or foreword URL no page
publishes at. **They are warnings, not failures**: the book is complete for the
manifest it was given, and a new page should not stop a build. They print under the
`pdf:` summary, and only when the book is built, so `--serve` does not repeat them on
every save. A link from the book to a page left out opens the website instead, and the
link check lists it as `OUT OF BOOK` --- which left-out pages the book still links to.

**"In the book" has to mirror `emitPart`, not the selectors.** A chaptered part's
`landing_page` and a `foreword_page` are emitted by URL rather than selected, so a
check that walked only `_chapters` would report the Features landing and the Packages
foreword on every build. The emission sites are listed once, in `bookCoverage()`, and
two probes pin them.

`scripts/check_book_coverage.mjs` is the gate on it, in `test.bat` and both CI
workflows: probes over pages and a manifest built in memory, so it reads nothing
under `docs/`. Dropping the chaptered-landing site fails ten of the twelve; ignoring
`left_out:` fails nine.

### The symbol index, and the drift guard on its URLs

`tB/symbols.json` is written by the `symbolIndex` task
([builder/symbols.mjs](builder/symbols.mjs)) for the IDE help add-in; why it exists and
what it has to say is [WIP.HelpAddin.md, Stage 3](WIP.HelpAddin.md#stage-3-the-symbol-index-generated-by-the-docs-build).
Decisions about the build side, each with the alternative it rules out:

- **The entries come from the rendered pages, and the packages only annotate them.** A
  URL is a `permalink:` as written or that plus the id the render gave a heading, read
  out of `renderedContent` --- never recomputed with `kramdownSlug`, which would
  disagree with the page on every pinned `{: #id }` and every `-1` duplicate. What the
  pages cannot say comes from `builder/package-api.json`, a committed snapshot. An
  index built the other way round, from the packages, would list thousands of symbols
  with no page and put the docs' own layout (Array filed under Information, the Styles
  classes documented though declared `Private`) in the wrong place.
- **The snapshot is committed, like `inter-metrics.json`, because making it needs a
  twinBASIC install.** `node indexer/twin-index.mjs derive` reads the packages' `.twinproj`
  files as `sync` does, scans them with `scripts/lib/twin-api.mjs`, and writes ~255 KB. `package-api.json` is a build *input*, so `check_tree_fresh.mjs`
  watches it; `symbol-baseline.json` is an output and is in its `IGNORED_FILES`.
- **The heading scan is `indexOf`, not a regex.** `/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/`
  is cubic in the regex gate's census, and it runs over every reference page; the scan
  gives a byte-identical index.

**The drift guard is the page-count guard's shape applied to URLs**
([builder/symbol-baseline.mjs](builder/symbol-baseline.mjs)): `builder/symbol-baseline.json`
lists every URL the index has published, one to a line. A build that loses one fails and
names it; a build that adds one rewrites the list; CI, `--serve`, `--dry-run` and a build
into another `--dest` never write; a source root other than `docs` is skipped; `--update-symbol-baseline` records a
removal. It exists because **an anchor has no `redirect_from:`** --- a reworded member
heading moves its id, an installed add-in keeps the old URL, and the link check only
follows links made inside the site, so nothing else would notice. The failure message
leads with the usual fix, pinning the old id on the reworded heading.

**The help add-in's copy of the index** ([builder/addin-index.mjs](builder/addin-index.mjs)):
`add-in/Resources/SYMBOLS/symbols.json` is committed so that the add-in builds from its
tree as it is, and a build of `docs` rewrites it whenever it differs from the index the
build wrote, under the guards' write rules (not CI, not `--serve`, not `--dry-run`, not
another `--dest`). A
difference is reported, never a failure: a stale copy is an older index, not a broken one.
The comparison is byte for byte, which is why `.gitattributes` checks `add-in/Resources/`
out `-text`: a CRLF checkout of the copy would differ from the LF the build writes on every
build.

`scripts/check_symbol_index.mjs` is the gate on all three pieces, in `test.bat` and both
CI workflows: probes on fixtures, no tree, no install. The scanner's probes are
the traps the packages' `.twin` sources contain, the community packages' included, and what
a declaration's record says (signature, attributes with their arguments, description, return
type, accessor, the project name). A block of them holds the forms `parseTwin` could lose
without a word (lists after `Inherits` and `Implements`, a qualified CoClass
interface, `[Hidden(False)]`, modifier-named and initialised fields, brackets in a Type, a
result type before `Overrides`, an unmodified `Declare`, and the `#If` branches as
alternatives), each with the compiler's answer in its comment, checked with `tbrun --tests`
on BETA 1010. A second block holds the second step's: declarations joined by colons,
identifiers with characters past ASCII (the compiler takes every one as part of a name, a
no-break space included, so `\b` is no word boundary for them), a type-declaration
character on a name, and the condition each `#If` branch gives its members. The derivation's are each a rule the real
site exercises only once or twice (`symbols:`, a section heading named like a member, the
ellipsis the typographer puts in a Core H1).

Two placement rules each hold a probe, because the wrong answer is a URL that leaves
the index or moves. **A heading is a member only when it is one level under its
Properties or Methods section and is not named like prose** (`### Example` and
`#### Example` among a class's members are prose). **Headings under a section of
members are placed before the rest**, so a member's URL is the heading under
Properties and not a prose section of the same name above it (`Screen.Fonts` is
`#fonts-1`, its `### Fonts`, not a prose `#fonts`).

### The Downloads page

Cards are `<div class="download-card">` inside `<div class="download-grid">` (styles at the end of `custom.scss`), with the theme's `.btn` for each file. The release job publishes every same-site link on the built page that has the `download` attribute, beside the zip and the PDF, so a new download needs no change to the workflow. `{{tbdocs:size:<site path>}}` gives a published file's size and `{{tbdocs:packageTestRows}}` the test projects' rows, both expanded before render; the help add-in's size is prose ("about 61 MB"; it is also on the Help Add-In page, with the archive's "about 60 MB"), because its project embeds the offline tree, this page included, so it cannot be known before render. The PDF's release URL spells it `twinBASIC.Book.pdf`: GitHub turns the space into a dot, and the spaced name 404s. The footer's **Read Offline** link (`read_offline_link` in `_config.yml`) goes to the page's `#read-offline`.

### The help add-in's project file

Every build of `docs`, CI's included, writes `tB/IDE/AddIns/downloads/tbDocsHelp.twinproj`
into the online tree: the `addinProject` task
([builder/addin-project.mjs](builder/addin-project.mjs)), declared by `addin_project` in
`_config.yml`, so the test fixtures' configs get none. The Help Add-In page offers it.
The decisions, each with what it rules out:

- **What goes in is `git ls-files` of `add-in/`, read from the working folder.** A plain
  walk of the folder packs whatever lies there: a stale `Resources/HELP/site.zip`
  (gitignored, from some earlier build), a `Build/` folder an IDE wrote, a
  scratch module. Reading git's blobs instead would leave a local build's download one
  commit behind the add-in being edited. `Resources/HELP/` is also refused by name, in
  case it is ever added. A file git does not track is named in the build's output.
- **The archive in the project is the one this build wrote, handed over in memory.**
  The `helpArchive` task returns the zip it wrote, as bytes, and
  `addinProject` waits for it and packs those bytes as `Resources/HELP/site.zip`. Reading the file back from
  `add-in/Resources/HELP/` could pick up the archive of an earlier build whenever this
  one wrote none (`--no-help-archive`, `--serve`, another `--dest`, a fixture): that
  case packs no archive, and the summary line says `without the offline archive`.
  The archive is made **before** the Gantt injection and leaves out both files the
  injection writes, `BuildInfo.html` and `assets/images/gantt.svg`
  ([The help archive](#the-help-archive)): the chart holds the build's timings, and a
  download that held it would differ from one build of a tree to the next.
  `recheckHelpArchive` checks at the end of `runBuild` that the offline tree still lists
  the archive's files and that only those two differ.
- **The archive waits for every writer of the offline tree.** `archivePlan` waits for
  `flushJoin` (the render lanes write each page's offline HTML in their flush), `scss`
  (the offline stylesheet) and `writeOffline` (statics, theme assets, redirect stubs,
  `nav.js`); `archiveLate` waits for `searchIndex` (`search-index.js`, the one file in
  `LATE_FILES`). Nothing else writes there before the injection; a writer added
  later and missed here fails the build in `recheckHelpArchive`, which is why that
  check compares every file's size and CRC-32. **A file a new task writes into the
  offline tree after `archivePlan` goes in `LATE_FILES`**, with `archiveLate` waiting
  for that task.
- **The offline tree has no copy, and its link goes to the website.** The project
  carries the offline tree's archive, so a copy in that tree would be inside its own
  archive. `deriveTreeRels` takes the path as an online-only file. The page links to
  it relatively, and the offline rewrite (`computeWebsiteUrl` in `offline-rewrite.mjs`)
  writes any URL the offline tree lacks and the online tree holds as `site.url` + base
  path + path, without counting a miss. The offline link check would flag that URL
  (the `forbid` prefix is the site's origin), so its worker env carries `forbidExempt`
  (`isWebsiteOnlyLink`), which excuses a website URL only when the online tree holds
  the path and the offline tree does not: a live-site link to a page the offline tree
  holds is still a missed rewrite. `scripts/check_links.mjs`, which reads trees from
  disk, makes the same exemption when `--online-root` names the online tree, and
  `check_links_diff.mjs`'s two offline cases pass it.
- **Line endings are git's, not the checkout's.** `.gitattributes` checks
  `add-in/Resources/` out `-text`, but not `Settings`, `Sources/*.twin` or the `.tbform`:
  under `core.autocrlf` a Windows checkout holds them with CRLF and CI's Linux one with
  LF, and `impexp` stores `Settings` and the `.tbform` byte for byte. So CRLF becomes LF
  outside `Resources/` before packing, and `impexp` then gives the code files CRLF. Without
  it the published file (built on Linux) and a local build differ, and so do
  `compare_trees` sides built on different machines.
- **The index is the build's, not the committed copy.** `syncAddinIndex` never writes in
  CI, so packing `add-in/Resources/SYMBOLS/symbols.json` would publish the committed copy,
  one build behind whenever a page changed. The task packs `symbolIndex`'s `json`, so
  the download holds the index of the pages it is published with; that is also why it
  runs after `symbolIndex` and why `checkReport` waits for it.
- **The path is in the online tree from `dispatch` on.** It goes into the list
  `deriveTreeRels` takes (`onlineOnlyRels`), so the link check resolves the page's link to
  it and the publish sweep sees it. If the task stops writing,
  `--check-audit-index` reports the file as indexed but not on disk.
- **The pack is `impexp.mjs`'s `packFiles`, in process and in memory.** It packs the
  files as `importProject` packs them from a folder (`test/addin-project.test.mjs` pins
  the two to the same bytes), with no copy through `%TEMP%`: staging the 53 MB there
  took 200 ms to 1.9 s on a busy disk, against about 100 ms in memory. `builder/` may not import
  `scripts/` (`biome.jsonc`), because `check_tree_fresh.mjs` would not see a change to
  what the build imports. `impexp.mjs` is the one exception, by name in the rule: it
  imports nothing, the build already publishes it through `bundle_extra`, and
  `check_tree_fresh.mjs` watches it and `add-in/`. Not the compiler executable,
  which CI does not have, and not `impexp.py`, which CI's Node job need not have.
- **`--serve` writes it, `--dry-run` does not.** The preview has the page that links to
  it, and packing takes about 100 ms; the help archive is skipped under `--serve` because
  it takes seconds and writes into `add-in/`, which this writes nowhere near. The `--serve`
  download holds no archive.
- **Deterministic by construction.** `impexp` writes no time, numbers every revision with
  a constant and sorts every folder by code point; `git ls-files` is sorted too.
  `test/addin-project.test.mjs` packs the real `add-in/` and fixture repositories:
  exactly the tracked files, no `Resources/HELP/` file from the disk, the given archive
  byte for byte (and none when none is given), a CRLF and an LF checkout giving the
  same bytes, and the file in exactly the trees it is given; and `checkHelpArchive`
  against small trees.

The download is about 61 MB with the archive, 1 MB without. The publish allowlist exempts
its one path in the trees only ([The publish allowlist](#the-publish-allowlist)). A failure
(no git) fails the build with exit 1 and the index audit names the missing file. **Don't
build the DLLs in CI from it**: that needs a twinBASIC install; the download is the project,
and the reader builds it. `test/addin-project.test.mjs` is the gate.

### The help archive

- **The help archive is made by tasks of the build's graph, its deflating on the lanes.** `builder/help-archive-step.mjs` writes `add-in/Resources/HELP/site.zip` from `docs/_site-offline` through `lib/help-archive.mjs`, **before** the Gantt injection. `archivePlan` runs once `flushJoin`, `scss` and `writeOffline` have finished, lists the tree less `LATE_FILES` (`search-index.js`) and deals the deflating into one group of units for each lane (`archiveDeflate:i`), so the tree is deflated while the search index is built. `archiveLate` does the same for `search-index.js` once `searchIndex` has written it (`archiveLateDeflate:i`), and `helpArchive` writes the zip from every group. A unit is a whole file or one 1 MB piece of a larger one; a large file's pieces are one deflate stream, each ending with a sync flush and primed with the 32 KB before it (pigz's method), so the bytes depend only on the piece size. Measured on the 55 MB `search-index.js` at level 9: 3.2 s as one stream, 0.8 s as pieces on four threads, at the same size to within 0.02%. **A piece is deflated at level 6, a whole file at level 9** (owner, 2026-11-18): the pieces are `search-index.js`'s, the last file the build writes, so their deflating is on the way to the build's end. Measured on the dev box, three builds each, from the end of `searchIndex` to the start of `helpArchive`: 0.60 to 0.63 s at level 9 and 0.13 to 0.16 s at level 6 on sixteen CPUs, 1.17 to 1.29 s and 0.37 to 0.41 s on four; the whole build 8.6 to 9.4 s and 7.7 to 8.3 s, 15.5 to 17.3 s and 14.5 to 15.0 s. The archive is 206 KB larger (77.66 MB, 77.87 MB). Not measured: CI. Each unit inflates what it deflated and compares it with the bytes it read; the zip is read back and compared with what was assembled. **The archive leaves out `HELP_ARCHIVE_SKIP`** (`builder/help-archive-step.mjs`): the Documentation Development section (`BuildInfo.html` and `assets/images/gantt.svg` with it, so the chart never reaches the zip), Videos and their poster frames, Challenges, and **every download, which stays online** (owner): a file readers download goes in a `downloads` folder beside its page, and the step fails the build when the Downloads page offers a file the archive would hold. The add-in's server redirects any file the archive lacks to the website, because pages link to all of these; a new entry needs nothing else. A mismatch fails the build (exit 1). After the Gantt injection `recheckHelpArchive` checks that the offline tree on disk lists the same files as the archive and differs from it, in size or CRC-32, only in `BuildInfo.html` and `gantt.svg`; a task that wrote into the offline tree late fails the build there. The help add-in embeds the zip as a resource and serves the pages from it with its own server; a build of the add-in without it uses the live site. The file is gitignored (about 60 MB, 10 MB of it the search index's `search-index.js`, deflated), so a build of the add-in from a clean clone is the online one until `build.bat` has run. The download carries the same zip ([The help add-in's project file](#the-help-add-ins-project-file)). **`--no-help-archive` turns the step off, and neither CI workflow may pass it** (`check_ci_workflows.mjs` refuses it, in `ALLOWED.forbiddenBuildFlags`), because CI's published download would then hold no archive. It runs only for the guarded source tree (`docs`) built into the default `docs/_site-offline` (not another `--dest`, so `compare_trees` and `check_links_diff` leave it alone), never under `--serve` or `--dry-run`, never without an offline tree, and not keyed on `$CI`. There is no command-line tool for the archive: the `help-offline` lane makes its own with `writeHelpArchive`. The zip's format is fixed by the add-in's reader, which does no inflating ([WIP.HelpAddin.md](WIP.HelpAddin.md), Stage 4, increment 5).

### Build-time counts as named values

`{{tbdocs:pages}}` in a page renders as the number of pages the build
discovered. Design: [builder/PLAN-counts.md](builder/PLAN-counts.md);
code: [builder/counts.mjs](builder/counts.mjs); documented for
contributors at [Authoring
Pages](docs/Documentation/Authoring.md#counts-the-build-fills-in). The names are
those `counts.mjs` defines, and most of the prose is still hand-written.

`enumerations` counts the bullets in `Reference/Enumerations.md`'s alphabetical index
--- the `attributeAnchors` shape, a scan of one page's `rawContent`, legitimate because
the page *is* the list. It reads the index alone, so an entry added only to the
by-package section above it is still a half-edit that nothing reports.

`defaultPackages` and `builtInPackages` exist because `packages` alone cannot
express both sentences the site writes: all the packages, and the ones the IDE
ships but a project references on demand, for which "built-in" is reserved. A
sentence that says `{{tbdocs:builtInPackages}}` cannot drift into the other set's
number. **A count name is also a way of naming the set**, besides not going stale.

**A name is a derivation over build state, never a constant.** A registry
holding a fixed page count would not remove the stale figure, only move it
from a page a contributor reads into a module nobody opens. If a number cannot
be derived it does not get a name.

**The substitution is a core rule over the inline token stream**, and that
layer is the whole design. Code is immune without a rule for it, because a
fence and an indented block are *block* tokens with no children and an inline
code span is a token type of its own --- so an inline walk cannot reach any of
them. It is the hazard of [Never rewrite markdown source
without knowing what is code](#never-rewrite-markdown-source-without-knowing-what-is-code),
avoided by construction rather than by a mask.

Consequences of that design:

- **The walk has to recurse, for image alt.** An `image` token carries its alt
  as its own children, so a flat walk stops at the image. markdown-it's own
  `replacements` rule does not descend, which is why `kramdownDashesPlugin`
  recurses as well --- see [Source dashes](WIP.md#source-dashes).
- **A raw HTML block is unreachable, and source validation cannot see it.**
  `html_block` is one opaque token with no children, and a placeholder inside
  one has a perfectly good *name* --- so the validator passes it and the page
  publishes `{{tbdocs:pages}}` to readers, which is the exact failure the
  feature exists to prevent, arriving by a new route. It takes a second check
  on the other side of the render: `findSurvivingPlaceholder` scans the
  rendered HTML for a placeholder outside `<code>` and `<pre>`. One string
  scan per page, and it catches every cause rather than the anticipated ones.
- **`markdownInit` depends on `deriveRedirects`**, for `redirectStubs` alone.
  No cycle, but it is a task-graph edge that exists for a count.

**Validation is on main, before any worker renders**, because an unknown name
cannot be an error inside the rule: markdown-it emits an unrecognised inline
verbatim, so the rule would publish the typo rather than fail. The message
names the file, the line and the nearest match.

Nothing checks this, because a gate on counts in prose does not pay: a list-count rule (the number before a list against its items) flags about 50 paragraphs, 2 of them wrong, and a rule checking member counts against the indexer's API snapshots (following `interfaces`, `implements` and `extends`) agrees on 35 of 42 and finds none wrong, the rest being own-versus-inherited, a named subset or another subject. A count that restates a list is stale about as often as not; one of a product's API, written once per package version, almost never.

### The gate-list gate, and a gate that guarded one file

[scripts/check_gate_lists.mjs](scripts/check_gate_lists.mjs) compares
`check.bat` and `test.bat` against the two numbered lists on
[Tools and Scripts](docs/Documentation/Tools.md) --- membership, order, and the
step count each section states --- and then sweeps `README.md` and every page
under `docs/Documentation/` for a gate count asserted anywhere in prose. In
`test.bat` and both CI workflows; ~50 ms, no browser, no built tree.

**A gate scoped to one page guards one file, not a class.** One page, `Tools.md`,
owns the lists and the others cite it, but nothing enforces that convention: any
page can restate a count, wrongly. Hence the sweep over `README.md` and every
developer page.

The shapes recognised, each a form a count can take in prose:

| shape | example |
|---|---|
| possessive | ``two of `check.bat`'s four steps`` |
| verb | ``` `test.bat` is six more ```, ``` `check.bat` runs six further gates ``` |
| line-initial | `check.bat     # six more gates`, a table cell restating a wrapper |
| section total | a wrapper's own section opening *"Five gates that ..."* |
| back-reference | "four of the five", where the number matches the section's own total |

**The section total is why the sweep is per section.** A section can state the count where its only mention of the
wrapper is the indented command under its heading, so nothing on that line names a
wrapper and a line-by-line scan reports nothing. A section's subject is the
wrapper in its heading, else the wrapper on the first command line beneath it ---
and **the kramdown attribute block has to be skipped to get there**
(`{: #tests-of-the-toolchain }` sits between the two), or the rule silently skips
the one section it exists for.

Judgement calls:

- **Only the *first* bare `N gates` in a wrapper's section counts as its
  total.** Later ones are legitimate subset claims. The cost runs the other
  way: a section that *opens* with a subset claim is reported, and the fix is
  to delete the number rather than correct it --- which is what the failure
  message says, because a subset count restated in prose is what drifts.
- **Verbs, not proximity.** Developer pages may quote a past wrong number as
  history, such as *"found `test.bat` documented as three gates when it had
  four"*. A proximity rule reads that true sentence as a false claim, so the
  verb list is explicit.

Which gates a wrapper runs is read by `scripts/lib/gate-roster.mjs`
(`gatesFromBat`); `check_ci_workflows.mjs` reads the wrappers and workflows
through the same module.

A change to the sweep is checked on real pages, not only on the probes: put a wrong
count back into a page, in each shape, and confirm the gate names every
site.

Most of its probes cover the sweep, positive and negative. One puts a fenced `## ` line, the shape of Wisdom.md's `staging.md`
example, inside a wrapper's section, since sections are split through
`lib/markdown.mjs`'s `splitOnMarker` and a heading-shaped line in a region starts
none.

**Its patterns are built with `new RegExp(...)` from shared constants, which is
why [check_regex_safety.mjs](#the-regex-safety-gate) reads constructed regexes**
--- a literals-only scan cannot see them, and a gate whose own patterns escape the
regex gate is not covered by it. The line-initial rule is two steps, anchored at
the head of the line and then a bounded search of what follows, because one regex
with a lazy gap and the count after it can divide the same text, which is
polynomial. Every one of the constructions classifies `safe`.

### The regex-safety gate

[scripts/check_regex_safety.mjs](scripts/check_regex_safety.mjs) parses every
`.mjs` under `builder/`, `scripts/`, `lib/`, `book/`, `eval/`, `wisdom/` and `indexer/` with
acorn, takes the regex literals *and* every `new RegExp(...)` whose arguments the
source decides, and refuses any that can backtrack exponentially. In `test.bat`
and both CI workflows; ~10 s, no browser, no built tree. Exit 0 no exponential
regex, 1 one found or a probe wrong, 2 the gate could not run.

```sh
node scripts/check_regex_safety.mjs           # the gate
node scripts/check_regex_safety.mjs --census  # full classification, by kind
node scripts/check_regex_safety.mjs --self-test
```

**An exponential regex does not fail a build, it stops one.** A void tag's
attribute list written as `(?:\s+[^>/]+...)*` is exponential: `[^>/]` matches a
space and so does `\s`, so one run of attribute text can be partitioned in
exponentially many ways, and every partition is tried whenever the match fails ---
on any `/` the quoted-value alternative does not cover. An alt string such as
`Line/Column` in a page then hangs a render worker outright: its chunk stays
CLAIMED, the barriers behind it never reach a dep count of zero, and the build
prints its last line and sits there.

Nothing else catches it. The regex looks ordinary, the corpus passes for as long
as no page happens to contain the trigger, and the failure is a hang rather than
an error. This gate asks the question of the regex itself, so it does not wait for
content to ask it. Its probes hold two shapes:

- `[^>]*\/?` spells an optional slash that `[^>]` already covers, so each tag
  parses two ways and an html_block of *n* of them parses 2^n ways.
- Narrowing the name class to `[^\s>/]+` still leaves it exponential, because
  `[^\s>/]` still matches `=`, `"` and `'`, so an attribute can be consumed either
  by the name class or by the quoted-value alternative --- the same 2^n one level
  down, which hand-reasoning pronounces fixed. The witness is `<BR\tG=` followed
  by `""\t"=''\t=='/">'\tG=` repeated.

`VOID_TAGS_RE` and `STANDALONE_INLINE_HTML_RE` in
[builder/render.mjs](builder/render.mjs) therefore match to the first `>` and
nothing else --- `<(br|hr|...)\b([^>]*)>` --- with the trailing `/` removed
afterwards by `stripSelfClose()`. `[^>]*` and the `>` after it share no character,
so there is nothing to partition. A change to either regex is checked with
`compare_trees.mjs`, and must leave every void tag in the built site byte-identical.

> **Do not reintroduce a per-attribute sub-pattern in either of them.** Both
> natural ways of writing one are exponential.

**It gates on exponential only.** recheck also reports polynomial blowup, and
about one regex in eight here is polynomial --- nearly all the ordinary
`<tag[^>]*>` shape, low degree, on bounded input. A gate that failed on those would
fail on day one against dozens of findings, and a gate that fails on day one gets
switched off. Exponential is the class that turns a content edit into an
unbounded hang.

**Never quote a `degN` from a census.** The two backends disagree on it ---
the native agent says polynomial degree 2 where the pure-JavaScript fallback says
degree 3 on the same pattern --- while agreeing on exponential-or-not, which is
what the gate rests on, and on every classification probe. A degree is a
ranking aid for reading a census, not a number to write into prose.

Implementation details that matter:

- **The self-test probes ride along inside the normal run**, not behind a
  `--self-test` nobody remembers. Classification probes, both directions:
  the two exponential shapes above (the narrowed name class included),
  `^(a+)+$`, and some that must *not* be flagged --- plus the fold probes,
  below. A green line saying "no exponential regex" is otherwise
  indistinguishable from a gate that has stopped detecting.
- **Parallelism comes from separate processes.** Importing `recheck` spawns one
  long-lived agent and feeds it requests one at a time, so awaiting several
  checks concurrently in a single process buys nothing --- measured at 42.5 s for
  concurrency 1 against 37.5 s for 16. Sharding across the CPUs, each shard its
  own process and its own agent, brings the run from tens of seconds to
  about ten.
- **recheck 4.5.0 cannot find its own backend on Windows**, and the failure is
  quiet. It locates both `recheck-jar` and `recheck-<platform>-<arch>` by
  stripping `/package.json` with a forward-slash regex from a path Node returns
  with backslashes, so the strip does nothing and it tries to execute
  `package.json`: an "Invalid or corrupt jarfile" line, then `spawn EFTYPE`, then
  a silent fall back to the pure-JS implementation --- correct, but roughly a
  hundred times slower. The script resolves the binary properly and sets
  `RECHECK_BIN` itself. If no native backend is found it says so in its summary
  line rather than just being slow. Both backends classify every probe
  identically, so the fallback is slower, not weaker.

Limitation: a regex recheck cannot decide comes back `unknown`, and an unknown is
an *unchecked* regex rather than a passing one (`--census` prints them).

#### It reads constructed regexes too

**Building a pattern out of shared fragments is the ordinary way to avoid writing
a sub-pattern several times**, and a literals-only scan cannot see one.
`check_gate_lists.mjs` builds all its patterns this way.

[scripts/lib/regex-fold.mjs](scripts/lib/regex-fold.mjs) folds a construction to
the pattern it builds, where the source decides that: string and template
literals, `+` concatenation, `String.raw`, a `const` declared once in the file,
`X.source` of a `const` regex, `A.join(sep)` over a `const` array of string
literals, and a ternary (checked as both branches). A `const` imported by a
relative path resolves too, when its module declares it with a string or regex
literal, which is how `builder/code-guard.mjs`'s `CODE_OR_PRE` reaches the patterns
composed from it. Most of the tree's constructions resolve, and the summary line
counts the rest; each one resolved is checked exactly as a literal is.

**One rule is a model rather than an exact fold, and it is marked as one.** A
call to an escaping helper --- `escapeRegExp(x)` and anything written to the same
shape, recognised by body rather than by name, in the file or in a module it
imports by a relative path, so no list of names is kept --- yields a fixed
character sequence with no regex operator in it, whatever `x` holds. Those fold
to a one-character placeholder and are tagged `modelled`, in the census and in
any finding. The gap: an escaped splice *inside a quantified alternation* could be ambiguous with a sibling branch in a way the
placeholder is not --- `(${esc}|a)+` is exponential when `esc` holds `a` and safe
when it holds `x`. A fixed sequence cannot be a quantified atom by itself, so the
surrounding pattern has to quantify a group containing it; none of the tree's
modelled calls does (`--census` lists them).

**The unresolved constructions are a list with a reason each, not a count.**
*`pattern` is a function parameter --- check the call sites* says where to look;
*`re` is a `let`, so its value is not fixed* says not to bother, because it is a
glob compiler building a pattern character by character.

Fold probes ride along in the normal run, some that must resolve to an
exact pattern and some that must be refused with a reason. **The negative ones
are the ones that matter**: a folder that resolves less than it claims does not fail,
it moves constructions into the unresolved list, where nothing checks them and
the run goes green. A folder that resolves *more* than it can know is worse, and the negatives
are what say it does not.

### Remote-asset vendoring

[builder/vendor-assets.mjs](builder/vendor-assets.mjs) is a seed task (`vendorAssets`, modelled on `dot`) that scans the discovered markdown for YouTube video markers and GitHub user-attachment URLs, downloads anything missing into `docs/assets/thumbnails/` or `docs/assets/attachments/`, and hands the new files to the static-file copy pass. It is idempotent -- a present file is never re-fetched -- and the artifacts are committed to git exactly like the generated DOT SVGs.

**CI never downloads.** `process.env.CI` selects offline mode (`--fetch-assets` / `--no-fetch-assets` override it), and in offline mode a referenced-but-uncommitted asset throws rather than fetching. If CI could fetch, an author who wrote the markdown but forgot to commit the image would get a green build while the published site went on hotlinking a third party -- the exact failure the whole mechanism exists to prevent. A fetch *failure* in dev mode is softer: warn, keep building, and flip the exit code, so one dead video doesn't block a local preview.

The render-side halves are `videoLinkPlugin` (marked link -> poster frame + outbound link) and `remoteImagePlugin` (user-attachment `<img src>` -> the vendored copy), both in [builder/render.mjs](builder/render.mjs). Both emit **root-absolute** paths, because the PDF book flattens every page into one document and a page-relative src resolves against the book root there.

Remote images cost a network round trip per page view, break the `file://` offline mirror, and **abort the PDF book render** -- the forked paged.js in `book/lib/` has no async image loading, so an image still pending when the page-breaking pass runs raises instead of degrading. The build refuses a remote `<img src>` unconditionally ([how](#what-belongs-in-testbat-rather-than-checkbat)); the site has no embeds.

### Pictures in two themes

**The rule:** `X.png` is the dark picture, `X.light.png` beside it the light one, and a page
names only `X.png`. `themePairPlugin` ([builder/render.mjs](builder/render.mjs)) writes an
image whose file has a light sibling as two `<img>`, light then dark, with the same alt and
attributes (the light one's width and height scaled, below), classes `pic-light` / `pic-dark` and both `loading="lazy"`; a link to such a picture
becomes two links the same way (the feature map's "Full size" opens the picture the reader
sees). The online and offline trees, and so the help archive, carry both; the book carries the
light one alone, a plain `<img>` (`lightOnly` in
[builder/theme-pictures.mjs](builder/theme-pictures.mjs), step 0 of `bookChapterTransform`).
`scripts/shoot_docs.mjs` writes the pairs ([WIP.Screenshots.md](WIP.Screenshots.md)). Why:

- **Not `<picture>` with a media query.** It follows the OS only, never the toggle.
- **Lazy, because a hidden lazy image is never fetched.** Checked with puppeteer in all four modes (light and
  dark stored, system with each OS scheme): only the shown theme's images are requested, and
  toggling requests the other theme's images in view, and nothing else. The book's must not be
  lazy: paged.js raises on an image that has not loaded. **Anything that waits for a page's
  images must skip the hidden one**, whose `decode()` never settles: `gotoPage` in
  `scripts/lib/axe-scan.mjs` waits only for images that are laid out, made eager (else
  `check.bat` hangs until the protocol timeout).
- **CSS, no script.** The head script sets `data-theme` before first paint, so there is no
  flash. `custom.scss` hides `.pic-light` under `dark-theme` (both of its selectors, so both
  dark modes) and `.pic-dark` under `light-theme`, its exact complement in
  `docs/_sass/custom/_theme.scss`. No rule gives the shown image a `display` of its own.
- **The sibling comes from the static-file list**, the set `relativeLinksPlugin` already
  resolves against, never from the disk: a worker has the list and no business reading the tree.
- **A page that names a `.light.png` fails the build** (markdown image or link, or raw HTML
  `src`/`href`): it would show the light picture in both themes. **A `.light.png` with no
  `X.png` beside it fails `discover`**: it would never be shown. Nothing else needs to know: a
  `.light.png` is an ordinary static file to the publish allowlist, the link check and the index
  audit, and each one adds one to the page baseline's static-file count.
- **Each is shown at its own size, at one scale.** The page's `{:width height}` is the dark
  picture's; the light `<img>` gets it scaled by the two files' pixel sizes, which the
  `discoverRead:i` lanes read from their PNG headers (`picturePairs` names the pairs) and the
  workers receive with the shared render data. The Light theme lays the IDE out a few pixels differently (the toolbar
  4 CSS px shorter, a panel's title bar 3, some buttons narrower), so a light screenshot is up to
  a few pixels off the dark one's size. Forcing the dark size on it instead either pulls
  neighbouring UI into the frame (a line of the blue title bar over every light toolbar) or
  crops the subject.

### Pictures as SVG

**The rule:** `X.svg` beside `X.png`, and `X.light.svg` beside `X.light.png`, is the picture
drawn as SVG by `shoot_docs --svg` ([WIP.Screenshots.md](WIP.Screenshots.md#pictures-as-svg)).
A page still names `X.png`. `themePairPlugin` names each theme's SVG in its place when that is
among the static files, an image and a link alike, unless the attribute block holds `png`,
which it takes out of the output. `picture_svg` in `_config.yml` says which outputs show the
SVGs: online and book do, offline (and so the help archive) does not. Why:

- **The page names the PNG.** The PNG stays as the picture the SVG was checked against, and as
  the picture of an output that shows PNGs; and `shoot_docs` does not write an SVG that falls
  short of its PNG, so a page cannot count on one existing.
- **The renderer always writes the SVG, and an output that shows PNGs takes it back after.**
  `pngPictures` ([builder/theme-pictures.mjs](builder/theme-pictures.mjs)) names each picture's
  SVG back as its PNG in the rendered HTML: a `src` or `href` naming an `.svg` with its `.png`
  beside it can only be one the renderer swapped, since a diagram's SVG has no PNG; it rewrites
  outside code only (`replaceOutsideCode`). `cpu-worker.mjs` makes the offline page from the
  SVG HTML and swaps it when offline shows PNGs, and the online page the same way;
  `book.mjs` swaps before `pdf.mjs` collects the book's images. One rendering, three outputs.
- **An offline tree that shows PNGs holds no picture SVG.** `tbdocs.mjs` adds each one's path
  to `offline_exclude` in memory, so the offline copy, the help archive, the offline link check
  and the index audit agree without knowing about pictures. That adds a few hundred literal
  patterns, and `dispatch` tests every path of both trees against the list, so the list is
  compiled once (`matchesAny`, [builder/fnmatch.mjs](builder/fnmatch.mjs), which
  `offlineExcluded` and `check-tree.mjs` both call): the patterns with no wildcard in a `Set`,
  the others as regular expressions. Testing each path against each pattern, with a regular
  expression made for every test, was most of `dispatch`: 0.32 to 0.39 s on four CPUs
  (`start /affinity F`), 0.07 to 0.12 s since; 0.14 s and 0.05 s on sixteen. On CI (one run
  each, the second on a faster runner: 16.5 s against 24 s in all) about 0.6 s became about
  0.1 s, and the first render started near 0.9 s where it had started near 1.5 s. What is left in
  `dispatch` is the JSON of the shared payload (about 10 ms); its `submit` is the subject of
  [The pages' text does not go through the main thread's JSON](#the-pages-text-does-not-go-through-the-main-threads-json).
  The archive is a stored zip, 37 MB without
  the SVGs, and the 310 of them would add 18 MB.
- **A picture's SVG is never inlined.** `figurePlugin` inlines a diagram's SVG in its figure; a
  picture's (`isPictureSvg`: an `.svg` with its `.png` beside it) stays an `<img>` in the
  figure's container, and `tbdocs.mjs` does not put it in the `svgContentsMap` the workers
  receive.
- **What becomes a figure.** An image that is its paragraph's only content (or the two images of
  a light and dark pair), of any kind: a diagram, a picture, a raster. `figurePlugin`'s `figures`
  core rule decides it on the token stream, so an image with text beside it or inside a link
  stays a plain `<img>`. The bar's groups (vector, raster, zoom) are chosen when `figure_open`
  renders, from the image's `src` as `remoteImagePlugin` will write it.
- **`data-tall` is decided at build time, so nothing moves after load.** The wrapper gets it when
  the figure at the 736 px content column is at least as tall as its bar stood on end (220 px
  with both groups, 126 px with the raster group only); the size is the page's `{:width height}`
  for a picture and the root `<svg>`'s width and height (pt) for a diagram, and a picture with
  no stated size counts as short. Measuring in the browser instead would reflow the page after
  the first paint, and the sticky bar needs to know its side before layout.
- **On `file://` a picture's bar keeps only Zoom.** The browser can neither fetch a `file://`
  URL to put on the clipboard nor honour `download` on a `file://` link, so `figure.js` hides
  a picture's download and copy groups there; the offline tree shows pictures as PNG, so its
  vector group is hidden anyway. A diagram's actions serialise the SVG already in the page and
  work offline.
- **No `<picture>` with a PNG fallback** (owner): every browser the site supports shows an SVG
  in an `<img>`. The fallback a page needs is the per-picture `png`.
- **A page that names `X.light.svg` fails the build**, as one that names `X.light.png` does.
