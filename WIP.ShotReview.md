# Screenshot review — the plan

A localhost tool for reviewing what `shoot_docs.mjs` and `replay.mjs` decided about each
picture, overriding it, starting retakes and replays, and committing the result. **Design
agreed with the owner on 2026-10-31; step 1 of [the order of work](#order-of-work) is done
but for three rows that later steps make, and the tool itself is not started.** The mockups it was agreed on were inline in that
session and are not kept: the pages are described below instead.

The tool covers everything the command-line screenshot tools do, interactively, with a person
deciding where a threshold cannot (owner). The command-line tools stay, and both reach the
same result for the same inputs: see [Factoring](#factoring).

## Why

Two decisions are made by fixed thresholds, and neither threshold holds for every picture:

- **Did the PNG change?** `withinNoise` (`scripts/lib/shot-change.mjs`): no channel more than
  16 levels off, and no more than 0.5% of the pixels off at all. A pixel more than 16 levels
  off fails it at once, so a real change ("Foo" to "Bar") is always caught, at any size. It
  fails the other way: one caret or clock pixel in a large window makes it "changed". So the
  usual override here is *take new → keep old*; *keep old → take new* is for a faint change
  (a tint of 16 levels or less).
- **Is the SVG close enough?** `SVG_FAITHFUL` (`scripts/svgshot/keep.mjs`): no more than
  0.25% of the pixels 96 levels or more off. This one depends on size. The pictures are 2x:

  | Picture | Device pixels | 0.25% is | A missing word (about 1,000 strongly-off px) is |
  |---|---|---|---|
  | Options_Editor, 1280 x 880 | 4.5 M | 11,264 px | 0.02%: accepted |
  | Close_Question, 397 x 161.5 | 256 k | 641 px | 0.4%: rejected |

  Both directions need an override: a missing word accepted in a large picture, a half-pixel
  fringe rejected in a small one.

## Decisions (owner)

- **A separate localhost tool**, not part of `serve.bat`: it can show the Windows user name
  and works on files that are not under `docs/`.
- **Two decisions per picture, each theme on its own**: did the PNG change enough, and is the
  SVG close enough.
- **An override is remembered, as a decision or as an allowance.** Either the decision itself
  is overridden, or the parameters it was made on. See [Remembered overrides](#remembered-overrides).
- **The decision rules keep the parameters they have today** (levels, shares, rectangles left
  out). The region measure of [the queue](#the-queue) chooses what is shown first and decides
  nothing; adding it to the rules is a later enhancement, not part of this work.
- **The queue shows pictures by regions, fringe against block** ("option 3"), not by a band
  of percentages round the bar, which has the size dependence of the bar itself.
- **A capture that differs from one already decided goes back to the queue**, showing the
  last decision, instead of having that decision applied to it.
- **The queue is persistent**, with backward and forward navigation; an overview page shows
  every picture at once, as the `sheet.mjs --against` page does, and opens a detail page for
  any of them; the detail page moves backward and forward through the queue.
- **The tool starts and stops its own retakes and replays**, and their results show as they
  arrive. A picture can be decided as soon as it arrives, while the run goes on.
- **Which build a picture was taken on is recorded**, in a committed manifest.
- **The tool commits**, with a default message that can be edited and a button that puts the
  default back.
- **One session at a time.**
- **No code is duplicated between the tool and the command-line tools** (owner): what they
  share is moved into modules both call. See [Factoring](#factoring).

## The pages

Every page and every picture has its own URL, so the browser's back and forward buttons work,
and a picture's address can be kept or passed on. Each change made on a page is shown as it
happens: a status chip for the picture goes from the tool's verdict, to the change in progress
("take new → keep old"), to the result ("keep old"), or to a failure with a retry.

### Overview

Every picture of the session at once, as cards: a thumbnail, its path, and a chip for each of
its two decisions (the tool's verdict, an override, an allowance, or *retaking* while a run
has it). Grouped, in this order:

1. **In progress**: pictures a run is taking or drawing now.
2. **Needs a look**: the queue's rules, below.
3. **Changed**, most changed first.
4. **Only noise**: the capture was within noise of `HEAD`'s and the file stays.
5. **Unchanged**, collapsed.
6. **Added**, **deleted**, **failed**.

A row of counts at the top, filters (all, needs a look, overridden, no SVG), and **Resume at
*n* of *m*** to go back to where the queue was left. The two pages of `sheet.mjs` become views
of this one: `--against` is the overview itself, the pictures with no SVG a filter.

### Detail

One picture: previous and next (in the order of the overview, within the filter it was opened
from), its place ("4 of 17 · Needs a look"), and the keys j/k.

- **The comparison**: `HEAD` and the new capture side by side, a swipe, blinking, the
  difference map, and the SVG against the new PNG with its own map. Below them, a **loupe**
  for each region of change: the region cropped and enlarged, old and new, so that a small
  change in a large window is as easy to see as in a small dialog.
- **The PNG row**: the tool's verdict and its reason, the choice *keep old / take new*, and
  the parameters: noise levels, share, and the rectangles left out (drawn on the picture).
  Changing a parameter judges the picture again at once and shows the verdict it gives.
- **The SVG row**: the share strongly off, the verdict, the choice *accept / no SVG*, and the
  parameters: levels, share, rectangles left out. When the PNG goes back to `HEAD`'s, the row
  is greyed out and reads that the SVG goes back with it (an SVG changes with its PNG, owner,
  [WIP.Screenshots.md](WIP.Screenshots.md#pictures-as-svg)).
- **Retake this picture** and **Replay its SVG**: a run of one picture.
- **Back to the tool's verdicts**.

### Runs

The session's runs, newest first, each with its kind, its options, the command line it is the
same as (so it can be run again from a terminal), and while it runs a progress bar per job
(`help`, `no-project`, ...) and **Stop**. Below, a form for a new run:

- **Retake**: `shoot_docs.mjs`, with the IDE chosen from the installs found (the newest
  offered when it is newer than the session's baseline: "BETA 1501 found"), the pictures
  (`--only`, or the pictures selected on the overview), SVG on or off, and the jobs.
- **Replay**: `replay.mjs`, with `--only` and `--recheck`.
- **Clean up**: `--cleanup`, its `--dry-run` list shown first.

### Commit

What the session changed, counted: PNGs updated by the tool's verdict, kept at `HEAD` against
it, taken against it; SVGs written (by allowance among them) and removed; the manifest. Other
changes in the working tree are listed as left out. The message is one line by default
("Screenshots retaken on BETA 1501: 39 pictures changed, 3 kept at HEAD by review; 35 SVGs
written (2 by allowance), 1 removed"), can be edited, and **Back to the default message** is
enabled once it differs. **Commit** commits the session's own files and nothing else, named
one by one: added files are added first, a removed SVG is committed as a deletion. Never
`--no-verify`, and no trailers (WIP.md, Don'ts). A commit closes the session: the new commit
is the next session's baseline, and the old session is archived and can still be opened.

## The queue

The changed pixels are grouped into connected regions, and every region is eroded by 2 device
pixels. A fringe (a line 1 to 3 px thick along an edge, antialiasing or ClearType) is gone
after the erosion; text that changed, or a part the SVG lacks, is a block, and part of it
survives. A picture is in **Needs a look** when:

- **PNG**: the tool took the new capture, but nothing survives (most likely noise: a caret, a
  clock, a fringe), or what survives is small (a block or two the size of a word: a real
  change small enough to miss).
- **SVG**: the tool accepted it, but something survives (a part missing, whatever the share);
  or the tool rejected it, and nothing survives (fringes only, most likely acceptable).

The same regions give the loupes. The erosion and "small" are constants of the tool, not of
the decisions.

## Remembered overrides

Two kinds, which last for different times:

- **A decision override** ("keep old", "accept this SVG") is tied to the exact files it was
  made on: the capture's hash for the PNG, the SVG's and its PNG's hashes for the SVG. A later
  capture with other bytes goes back to the queue, showing the decision. Captures are rarely
  byte-identical from run to run, so a PNG decision mostly lasts within a session; an SVG
  decision lasts through replays, which draw the same SVG from the same bundle.
- **An allowance** changes a parameter for one picture and one theme: the PNG's noise levels,
  share or rectangles left out; the SVG's levels, share or rectangles left out. It stays across
  retakes until it is removed. A rectangle is in the picture's device pixels, drawn by hand,
  and is shown on the picture, so that a layout that moved shows it misplaced. It is the
  manual counterpart of a shot's `unsteady` regions, which are anchored to page elements in
  the shot table and resolved to rectangles at the capture; both reach `withinNoise` as its
  `rects`.

Both are kept in **the manifest**, with the build each picture was taken on. **The
command-line tools read it too**: `shoot_docs.mjs` and `replay.mjs` judge with each picture's
allowances and honour its decisions, so that a run from a terminal and a run from the tool
come out the same. Proposed shape, outside `docs/` so the publish allowlist never meets it
(the path is open):

```json
{
  "format": 1,
  "pictures": {
    "IDE/Images/Options_Editor.png": {
      "build": 1501,
      "png": { "noise": { "levels": 16, "share": 0.5 }, "ignore": [[812, 40, 900, 64]],
               "decision": { "keep": "old", "capture": "<sha1>" } },
      "svg": { "bar": { "levels": 96, "share": 0.35 }, "ignore": [],
               "decision": { "accept": true, "svg": "<sha1>", "png": "<sha1>" } }
    }
  }
}
```

`build` is written when a capture is written to `docs/`, and stays when the file stays (noise,
restored). A picture with no entry shows "build unknown" until it is next written. Only what
differs from the defaults is stored.

## Sessions

A session is a folder in the gitignored `.shot-review/` (beside `.svgshot-bundles/`; it can
hold the user name): `session.json` (the baseline commit and its build, the runs, every
decision with its time, the queue's place) and a folder per run with what the run produced
(below). Closing the tool loses nothing; opening it again opens the session. A commit
archives it.

## Runs

**The tool runs the command-line tools as child processes**, never their code in its own
process: `shoot_docs.mjs` is a script with effects at the top level (the registry tidy,
`exitOnCrash`, exit codes), and one code path for both is the point. Two options are added to
`shoot_docs.mjs` and `replay.mjs` for it:

- **`--stage <dir>`**: write nothing under `docs/` and nothing to `.svgshot-bundles/`; write
  each candidate into `<dir>` instead: the capture, its SVG (accepted or not), its bundle, its
  difference maps, its strength map and its verdict. **The tool is then the only writer under
  `docs/`**: it applies each verdict as it arrives, and each override, through the same code
  the command-line tools use (`applyPicture`, below), one picture at a time, so an override
  and a run never write one picture at once.
- **`--events`**: a line per event on stdout, `@@shot-event {json}` (run started, job started,
  picture verdict, SVG verdict, job done, summary), beside the lines meant for a person. The
  tool reads them and sends them to the pages over server-sent events.

**Stop** is a line on the child's stdin: the child takes no further shot, finishes the one in
hand, ends its IDEs and puts the registry back, as at its normal end. Killing it would skip
that, so the tool offers a kill only after a stop has not ended it, with that warning.

## Factoring

The rule: **the tool decides nothing and writes nothing by code of its own.** It runs the
command-line tools, and reads and writes through modules they call too. Today the decisions
and the writes are inline in `shoot_docs.mjs` (`keep`, `keepSvg`, `restoreSvg`, the
`--cleanup` block) and the SVG half is repeated in `replay.mjs`'s `replay`.

| What | Today | After |
|---|---|---|
| The noise rule | `withinNoise(A, B, rects)`, its limits constants | `withinNoise(A, B, {levels, share, rects})`, defaulting to `NOISE_LEVELS` and `NOISE_SHARE` |
| A PNG's verdict | `pictureFate` (pure), wrapped in `keep()` in `shoot_docs.mjs` with the light-against-dark rule, `SIZE_SLACK`, the writes and the diffs | `decidePicture` (pure): the light rule, `pictureFate`, the manifest's allowance and decision; in a new `scripts/lib/shot-policy.mjs` |
| An SVG's verdict | `judgeSvg`'s `faithful` against `SVG_FAITHFUL`, acted on in `keepSvg` and again in `replay` | `decideSvg` (pure) in `shot-policy.mjs`, from the strength map and the allowance |
| Writing a verdict | `keep`, `keepSvg`, `restoreSvg`, `dropLight` in `shoot_docs.mjs`; `replay` in `replay.mjs` | `applyPicture` / `applySvg` in a new `scripts/lib/shot-apply.mjs` (PNG, SVG, bundle, the SVG going back with its PNG through `svgFate`), called by `shoot_docs.mjs`, `replay.mjs`, `--cleanup` and the tool |
| How far an SVG is off | `diff.mjs` counts pixels at 8, 32 and 96 levels in the page | also returns the strength map (a byte per pixel, the one-pixel shift allowed), from which any level's share, rectangles left out and regions are worked out in Node, without drawing again; `pct8`/`pct32`/`pct96` derived from it |
| Regions | none | `changeRegions(strength, w, h, {level, erode})` in `shot-change.mjs`, for PNG and SVG alike |
| The sheets' HTML | `sheetHtml`, `changeSheetHtml` and their pieces in `redraw.mjs` | the pieces (card, figure, meter, page) in a views module shared by `sheet.mjs` and the tool; a static sheet is the overview without its actions |
| `redraw.mjs`'s other contents | git change listing (`changedPictures`, `parseNameStatus`, ...) beside drawing | the git listing to `shot-revision.mjs`; `redraw.mjs` keeps drawing and the shards |
| A child's report | `reportShard` / `runShards`, the `@@svgshot-result` line | one module for the prefixed-line protocol, used by the shards and by `--events` |
| Server-sent events | `sseHandler` inside `builder/serve.mjs` | lifted to `lib/`, used by `serve.mjs` and the tool |
| The installs | `findIde` (the newest) | `listIdes()` (each at or above `MIN_BUILD`), which `findIde` uses |
| Commit | none | a commit helper beside `runGit` in `shot-revision.mjs` |

Each move is made with no change in behaviour first, in commits of its own, before the tool
uses it. `shoot_docs.mjs` cannot run in a gate, so a move is checked by its tests in
`test/svgshot.test.mjs` (pure functions) and by a retake of a few pictures before and after
(`--only`, `--svg`), which must report the same states.

## Order of work

Each step ends tested and usable on its own.

1. **The moves**, no behaviour changed: the table's *After* column, with `shoot_docs.mjs`,
   `replay.mjs` and `sheet.mjs` calling the shared modules. Done but for three rows: see
   [Where the work stands](#where-the-work-stands).
2. **The manifest**: read and written by one module; `shoot_docs.mjs` and `replay.mjs` judge
   with its allowances, honour its decisions and record `build`.
3. **The strength map, the regions and the queue's rules**, tested on fixtures.
4. **`--stage`, `--events` and stop** in `shoot_docs.mjs` and `replay.mjs`.
5. **The server and the session store**, the overview and the detail page read-only, live.
6. **Decisions and allowances** applied through `shot-apply.mjs`, judged again at once.
7. **The runs page**: retake, replay, clean up, stop.
8. **The commit panel**.
9. **`sheet.mjs` on the shared views**; the tool's entry in `Tools-IDE.md`, its node in
   `Tools-Groups.dot`, its command-line cases in `scripts/lib/cli-cases.mjs`, its tests in
   `test.bat` (and so in Tools.md's list and the `run-gates` action), and the row in
   WIP.md's *Which file to open*.

## Where the work stands

On `staging` since 2026-10-31, step 1 but for the three rows that are new code (below). Each
move kept the command-line tools' output as it was, checked as
[below](#checking-a-move).

| Row of the factoring table | Where it is now |
|---|---|
| The noise rule | `withinNoise(A, B, {levels, share, rects})`, `scripts/lib/shot-change.mjs` |
| A PNG's verdict | `decidePicture({png, theme, dark, revision, disk, near})` in `scripts/lib/shot-policy.mjs`, with `SIZE_SLACK`: pictureFate's states plus `too-far` and `dark` (a light picture with the dark one's pixels). It does not read the manifest yet (step 2) |
| An SVG's verdict | `decideSvg(stats, {bar})` in `shot-policy.mjs`, with `SVG_FAITHFUL` (moved from `keep.mjs`); `judgeSvg` asks it. It reads `stats.pct96` until the strength map exists (step 3) |
| Writing a verdict | `scripts/lib/shot-apply.mjs`: `applyPicture(outRoot, out, decision, revision)`, `applySvg(outRoot, svgOut, svg or null)`, `restorePictures(outRoot, revision, outs, {dryRun})` (the PNGs and their SVGs, the SVGs by one `git restore`; `--cleanup` and a `restored` picture both use it), `dropPicture(outRoot, out, bundlesRoot)`, `writeSvg`, `svgOf`. What stays in `shoot_docs.mjs`'s `keep` and `keepSvg`: the counts, the lines it prints, the `--diffs` pictures, the bundle written, the user-name check, and the rule that an SVG stays as it is when its PNG was not written |
| The git listing | `changedPictures`, `parseNameStatus`, `parseUntracked` in `scripts/lib/shot-revision.mjs` |
| A child's report | `scripts/lib/record-lines.mjs`: `recordLine`, `writeRecord`, `parseRecord`, `readRecords(stream, kinds, {onRecord, onLine})`; `runShards` reads `svgshot-result` records with it. `--events` is to write `shot-event` records the same way |
| The sheets' HTML | the pieces in `scripts/lib/shot-views.mjs`: `pageHtml({generator, title, intro, summary, contents, body})`, `cardHtml({out, meta, meter, figures})`, `figuresIn(folder)` (`href`, `figure`, `thumb`), `meterHtml`, `tocItem`, `esc`, `anchor`, `sizeText`, `pctText`. The two pages, their rows, their order, their commands and the output-folder rules (`outputRefusal`, `mayWriteSheet`, `SHEET_GENERATOR`) are in `scripts/svgshot/sheets.mjs`; `redraw.mjs` keeps drawing and the shards |
| Server-sent events | `createSseChannel()` in `lib/sse.mjs`: `handle(req, res)`, `send(event, data)`, `close()`; `builder/serve.mjs` uses one |
| The installs | `listIdes()` in `scripts/lib/tb-install.mjs`, newest first, `[{build, exe}]` |

**Next: step 2**, the manifest. The three rows left in the table are new code, made in the
steps that need them: the strength map and `changeRegions` in step 3, the commit helper in
step 8. The tool's pages will add their actions to the pieces in `shot-views.mjs` (step 5);
until then only `sheets.mjs` calls them.

**A small cleanup, in no step:** a PNG's size is read from its header by four copies of one
line (`pngSize` in `shot-policy.mjs` as `{w, h}`, in `redraw.mjs` as `[w, h]` or null, in
`svgshot/probe.mjs` as `{width, height}`, and the test's `PNG` helper writes one); one reader
in `scripts/lib/png.mjs` would replace the first three.

### Checking a move

`shoot_docs.mjs` cannot run in a gate. A move that touches what it decides or writes is
checked by its unit tests in `test/svgshot.test.mjs` and by these runs, before the change and
after, in a worktree (they write under `docs/`; `git checkout -- docs` after each). Every
state line must be the same, bytes and percentages aside. The three setups they use
(`no-project`, `projects`, `project`) do not need the built site.

```sh
node scripts/shoot_docs.mjs --svg --only "Menu_Tools|Close_Question|Menu_File" --jobs 2
```

All `unchanged` (one light picture may be `unchanged but for a capture's noise`). Then, with
`Menu_Tools_IDEOptions` alone (`--only "Menu_Tools_IDEOptions" --jobs 1`):

- `Menu_File.png` copied over `Menu_Tools_IDEOptions.png` and `Menu_Tools_IDEOptions.light.svg`
  deleted: the dark picture `restored as HEAD has it`, its SVG `as HEAD has it`, the light SVG
  `new`.
- The same copy, with `--against-disk`: the dark picture `updated` and its SVG `updated`.

Read the whole log, not lines filtered out of it: an error raised in the page arrives with
the page's own stack on the lines after `FAILED`, and its line and column inside the evaluated
script name the helper that raised it. That is how the `Close_Question` crash was found: a
tab the IDE is still loading or saving shows a spinner in place of its close icon (the button's
class is `progressSpinnerIcon`, `ide/main.js`), and `closeTabs` now waits for the icon with a
MutationObserver (`tabCloseIcon`).

## Open

- **The manifest's path.** Outside `docs/`; beside `shoot_docs.mjs` is one choice.
- **The server's port.** A stable default with `--port`, as bookmarks need, or a port from
  `tbbroker`, which today leases one only with a desktop.
- **Allowances in the static sheets**: whether `sheet.mjs` shows them, as the overview does.
