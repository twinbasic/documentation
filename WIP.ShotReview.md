# Screenshot review — the plan

A localhost tool for reviewing what `shoot_docs.mjs` and `replay.mjs` decided about each
picture, overriding it, starting retakes and replays, and committing the result. **Design
agreed with the owner on 2026-10-31; steps 1 to 5 of [the order of work](#order-of-work) are
done (step 1 but for the commit helper, which step 8 makes): the tool runs, read-only, as
`node scripts/shot_review.mjs`.** The mockups it was agreed on were inline in that
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
- **The server listens on a fixed port, 4180, with `--port`** to choose another (owner,
  2026-10-31), so that a page's and a picture's address can be kept; not a port from `tbbroker`.
- **The overview also lists the pictures under `docs/` that differ from the baseline but that
  no run of the session reported** (a retake from a terminal, an edit), as a group of their own
  (owner, 2026-10-31): HEAD's picture against the file, with no verdict to override. The
  overview then covers what `sheet.mjs --against` covers.
- **The static sheets show a picture's allowances** (owner, 2026-10-31), as the overview does:
  `sheet.mjs` reads the manifest, as the command-line tools already do.
- **When HEAD moves under an open session** (a commit made outside the tool), the session keeps
  its baseline and the overview warns, as step 5 does; and the overview offers to **move the
  session to the new HEAD on demand** (owner, 2026-10-31). Moving makes the new HEAD the
  baseline (and its build the baseline's build); a verdict judged against the old baseline
  goes back to the queue, since the picture it was judged against has changed.

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

The changed pixels are grouped into connected regions, their gaps of up to 4 device pixels
closed first, and every region is eroded by 2 device pixels. A fringe (a line 1 to 3 px thick
along an edge, antialiasing or ClearType) or a caret is gone after the erosion; text that
changed, or a part the SVG lacks, is a block, and part of it survives. The closing is what
makes text a block: a stroke of the IDE's text at 2x is 2 or 3 px thick, so the erosion alone
takes every stroke of a word (Designer_Zoom50's SVG, its text drawn at the wrong size, keeps
no core without it and ten regions with it). A region survives with a core of 16 px or more
(`SURVIVES`): where two fringes cross, the closing leaves 1 to 15. A PNG's regions count every
pixel that differs at all, not only those beyond noise: a retake on a new build often shifts a
colour by a few levels over a whole window, which counted beyond noise leaves nothing and reads
as noise (294 of the 361 pictures the BETA 1010 retake changed at their old size; 23 at any
difference). A capture kept as within noise counts the pixels 2 levels off or more instead
(`FAINT_LEVEL`, owner, 2026-10-31): its own noise is often a row of text one level off
(Menu_File_Project.light on BETA 1034: every one of its 1,258 differing pixels 1 level off, and
cores of 37 to 96 px surviving at level 1, none at 2). An SVG's count the pixels at its bar's
levels. A picture is in **Needs a look** when:

- **PNG**: the tool took the new capture, but nothing survives (most likely noise: a caret, a
  clock, a fringe), or what survives is small (a block or two the size of a word: a real
  change small enough to miss); or the tool kept the old picture as within noise (`noise`, or
  `restored` to `HEAD`'s), but something survives (owner, 2026-10-31): a faint block, a tint over
  less than 0.5% of the picture, which *keep old → take new* is for. Its regions are those of the
  capture against the picture it was found within noise of.
- **SVG**: the tool accepted it, but something survives (a part missing, whatever the share);
  or the tool rejected it, and nothing survives (fringes only, most likely acceptable).

A decision a review made about other bytes of the picture sends it back too, whatever the
regions. "Small" is at most two surviving regions (`WORD_BLOCKS`) of at most 1,200 px of core
each (`WORD_CORE`): a version number changing in the call stack leaves 224 to 265, a name 127 px
wide 781. On the SVGs of the 476 bundles of 2026-10-31 the rules put 10 in the queue: 8
accepted with a part surviving, among them two that are wrong (Menu_Help's SVG lacks the
menu's cup icon, IDE-FeatureMap.light's draws in full a text the IDE cuts off with
an ellipsis), and tB-Blue's two, refused for 4 pixels of 1,024. The same regions give the
loupes. The closing, the erosion and "small" are constants of the tool (`scripts/lib/shot-queue.mjs`),
not of the decisions.

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
come out the same. It is **`test/shots/manifest.json`** (owner, 2026-10-31), outside `docs/`
so the publish allowlist never meets it, read and written by `scripts/lib/shot-manifest.mjs`
alone (its header has the format):

```json
{
  "format": 1,
  "pictures": {
    "IDE/Images/Options_Editor.png": {
      "build": 1501,
      "png": { "noise": { "levels": 16, "share": 0.5 }, "ignore": [[812, 40, 900, 64]],
               "decision": { "keep": "old", "capture": "<sha1>" } },
      "svg": { "bar": { "levels": 96, "share": 0.35 },
               "decision": { "accept": true, "svg": "<sha1>", "png": "<sha1>" } }
    }
  }
}
```

A picture of each theme is an entry of its own (`X.light.png`). Both shares are percentages,
as the rules are stated (0.5% of the pixels, 0.25%). `build` is written when a capture is
written to `docs/` (new, updated), stays when the file stays (noise, restored), and goes when
the file is removed (a light picture with the dark one's pixels, a `once` picture's light
file). A picture with no entry shows "build unknown" until it is next written. Only what
differs from the defaults is stored, and the file is written only when what it holds changes,
in a fixed order (pictures by path), so its diffs are small. An SVG's bar is at any level
from 1 to 255, and `svg.ignore` takes rectangles as `png.ignore` does, both counted on the
strength map. The manifest is read and written only for the default `--out`: its paths are under
`docs/`. A light picture decided "new" is kept even with the dark one's pixels; one decided
"old" is still found to be the dark one by the rule.

## Sessions

A session is a folder in the gitignored `.shot-review/` (beside `.svgshot-bundles/`; it can
hold the user name): `session/session.json` (the baseline commit and its build, the runs, every
decision with its time, the queue's place), `session/lock` (the process id of the tool that
holds it), and `session/runs/<n>/` per run: `stage/` (the run's `--stage`), `events.jsonl`
(each event as it arrived, for what the stage does not hold: failures, pictures not taken,
the jobs) and `log.txt` (its lines for a person). Closing the tool loses nothing; opening it
again opens the session, a run that had not ended marked interrupted. A commit archives it
into `archive/<id>/`. The folder is under the repository's root, so a worktree has a session of
its own.

## Runs

**The tool runs the command-line tools as child processes**, never their code in its own
process: `shoot_docs.mjs` is a script with effects at the top level (the registry tidy,
`exitOnCrash`, exit codes), and one code path for both is the point. Two options are added to
`shoot_docs.mjs` and `replay.mjs` for it:

- **`--stage <dir>`**: write nothing under `docs/`, nothing to the manifest and nothing to
  `.svgshot-bundles/` but the fonts' cuts in its `subsets` (a cache, which depends on the font
  and its characters alone); write
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
| Regions | none | `changeRegions(strength, {level, close, erode, rects})` in `shot-change.mjs`, for PNG and SVG alike |
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
   `replay.mjs` and `sheet.mjs` calling the shared modules. Done but for the commit helper: see
   [Where the work stands](#where-the-work-stands).
2. **The manifest**: read and written by one module; `shoot_docs.mjs` and `replay.mjs` judge
   with its allowances, honour its decisions and record `build`. Done.
3. **The strength map, the regions and the queue's rules**, tested on fixtures. Done.
4. **`--stage`, `--events` and stop** in `shoot_docs.mjs` and `replay.mjs`. Done.
5. **The server and the session store**, the overview and the detail page read-only, live.
   Done.
6. **Decisions and allowances** applied through `shot-apply.mjs`, judged again at once. With
   them, the group of pictures changed outside the session's runs, and the action that moves
   the session to a new HEAD ([Decisions](#decisions-owner)).
7. **The runs page**: retake, replay, clean up, stop.
8. **The commit panel**.
9. **`sheet.mjs` on the shared views**, showing each picture's allowances; the tool's entry in `Tools-IDE.md`, its node in
   `Tools-Groups.dot` (its command-line cases are in `scripts/lib/cli-cases.mjs` since step 5), its tests in
   `test.bat` (and so in Tools.md's list and the `run-gates` action), and the row in
   WIP.md's *Which file to open*.

## Where the work stands

On `staging` since 2026-10-31, step 1 but for the commit helper (step 8), and steps 2 to 5. Each move kept the command-line tools' output as it was, checked as
[below](#checking-a-move).

| Row of the factoring table | Where it is now |
|---|---|
| The noise rule | `withinNoise(A, B, {levels, share, rects})`, `scripts/lib/shot-change.mjs` |
| A PNG's verdict | `decidePicture({png, theme, dark, revision, disk, near, entry})` in `scripts/lib/shot-policy.mjs`, with `SIZE_SLACK`: pictureFate's states plus `too-far` and `dark` (a light picture with the dark one's pixels), and `by` ("decision" or "rule") and `earlier` (a decision about other bytes). `near(a, b, rule)` takes `pngRule(entry)`; `cleanupResets` is `--cleanup`'s verdict, with the path passed through `planCleanup` |
| An SVG's verdict | `decideSvg(strength, {entry, svg, png})` in `shot-policy.mjs`, with `SVG_FAITHFUL` and `svgRule(entry)` (`{levels, share, rects}`): `{faithful, by, share, earlier}`, `share` counted on the strength map at the bar's levels with its rectangles left out, `earlier` a review's decision about another SVG or PNG (`earlierSvgDecision`). `judgeSvg(browser, svg, png, stats, entry)` asks it |
| How far an SVG is off | `diffSvg` returns `strength`, `{width, height, data}`, a byte per device pixel of the clip (the distance with the one-pixel shift allowed, in whole levels, so a level's count is the same as from the distance); `stats.pct8`, `pct32` and `pct96` are `shareOff` of it, the same to the third place (a replay of the 476 bundles printed the same lines before and after) |
| Regions | `scripts/lib/shot-change.mjs`: `strengthOf(A, B)` (two captures' map, withinNoise's distance), `shareOff(strength, {level, rects})`, `changeRegions(strength, {level, close, erode, rects})` (`[{x0, y0, x1, y1, pixels, core}]`, most core first) and `regionMasks`, its three masks, for drawing them |
| The queue's rules | `scripts/lib/shot-queue.mjs`: `pngRegions(strength, pngRule, level)`, `svgRegions(strength, entry)`, `surviving`, `keptAsNoise(state)`, `pngLook(verdict, regions)` and `svgLook(verdict, regions)`, each `{why, text}` or null (`why` for a PNG: `earlier`, `noise`, `small`, `faint`); `reviewPicture(verdict, png, reference, entry)` (`{strength, regions, look}`, measured against the picture `verdict.against` names: decidePicture and pictureFate return `against`, "revision", "disk", "dark" or null) and `reviewSvg(verdict, strength, entry)`; the constants `QUEUE_CLOSE`, `QUEUE_ERODE`, `SURVIVES`, `WORD_CORE`, `WORD_BLOCKS`, `FAINT_LEVEL` |
| A run's stage and events | `scripts/lib/shot-stage.mjs`: `stageFolders(dir)` (`pictures`, `bundles`, `diffs`, `maps`, `verdicts`), `stagedFiles(dir, out)`, `stageRefusal(dir, docsRoots)` (outputRefusal, and a stage must be new or empty), `stageCapture`, `stageSvg`, `writeStrength` / `readStrength` (8 bytes of size, then the map deflated), `writeVerdict(dir, out, part, value)` / `readVerdicts(dir)`, and the verdict shapes `pngVerdict` and `svgVerdict`, which the `picture` and `svg` events carry too (at most `STAGED_REGIONS`, 64, regions, and `regionCount`). `shoot_docs.mjs` and `replay.mjs` write nothing else with `--stage`: `applyPicture`, `applySvg`, `writeSvg`, `dropPicture` and `restorePictures` take `{dryRun}`, and say what would be done. Events: `run`, `job` (`started`, `done`, `failed`), `picture`, `svg`, `failed`, `skipped`, `retake` (replay), `stopping`, `summary`. Stop: `STOP_LINE`, `onStop(stream, fn)`, `sendStop(child)` in `record-lines.mjs`; `runShards(env, jobs, {signal})` passes it to each child, `inBrowser(items, fn, {stopped})` returns the items not started |
| The manifest | `scripts/lib/shot-manifest.mjs`: `MANIFEST`, `openManifest(file)` (`entry`, `setBuild`, `clearBuild`, `save`, `text`), `parseManifest`, `manifestText`, `pngDecision`, `earlierPngDecision`, `svgDecision`, `hashOf`. `shoot_docs.mjs` passes each picture's rectangles to `capture` as `c.shot.ignore`, left out as its unsteady regions are, and records `build` (`buildNumber(ide)`) in `keep` and `dropLight` |
| Writing a verdict | `scripts/lib/shot-apply.mjs`: `applyPicture(outRoot, out, decision, revision)`, `applySvg(outRoot, svgOut, svg or null)`, `restorePictures(outRoot, revision, outs, {dryRun})` (the PNGs and their SVGs, the SVGs by one `git restore`; `--cleanup` and a `restored` picture both use it), `dropPicture(outRoot, out, bundlesRoot)`, `writeSvg`, `svgOf`. What stays in `shoot_docs.mjs`'s `keep` and `keepSvg`: the counts, the lines it prints, the `--diffs` pictures, the bundle written, the user-name check, and the rule that an SVG stays as it is when its PNG was not written |
| The git listing | `changedPictures`, `parseNameStatus`, `parseUntracked` in `scripts/lib/shot-revision.mjs` |
| A child's report | `scripts/lib/record-lines.mjs`: `recordLine`, `writeRecord`, `parseRecord`, `readRecords(stream, kinds, {onRecord, onLine})`; `runShards` reads `svgshot-result` records with it, and `--events` writes `shot-event` records the same way (a shard's pass through its parent as lines) |
| The sheets' HTML | the pieces in `scripts/lib/shot-views.mjs`: `pageHtml({generator, title, intro, summary, contents, body})`, `cardHtml({out, meta, meter, figures})`, `figuresIn(folder)` (`href`, `figure`, `thumb`), `meterHtml`, `tocItem`, `esc`, `anchor`, `sizeText`, `pctText`. The two pages, their rows, their order, their commands and the output-folder rules (`mayWriteSheet`, `SHEET_GENERATOR`) are in `scripts/svgshot/sheets.mjs`, and `outputRefusal`, which the stage shares, in `shot-revision.mjs`; `redraw.mjs` keeps drawing and the shards |
| Server-sent events | `createSseChannel()` in `lib/sse.mjs`: `handle(req, res)`, `send(event, data)`, `close()`; `builder/serve.mjs` uses one |
| The installs | `listIdes()` in `scripts/lib/tb-install.mjs`, newest first, `[{build, exe}]` |

What step 5 added, the tool itself:

| Part | Where it is |
|---|---|
| The tool | `scripts/shot_review.mjs [--port N] [--retake <regex> \| --replay <regex>] [--jobs N] [--ide <exe>]`: takes the session's lock, makes the session with HEAD as its baseline (`build` the newest the manifest at HEAD records) when there is none, serves it on `127.0.0.1:4180`, and starts a run when asked (a retake is `shoot_docs.mjs --svg --only`). Until step 7's runs page, a run is started only from its command line. Ctrl+C stops the runs by their stdin and waits, a second Ctrl+C kills them. Its command-line cases are in `scripts/lib/cli-cases.mjs` already |
| The session | `scripts/lib/shot-session.mjs`: `REVIEW_ROOT`, `RUN_TOOLS`, `sessionPaths`, `runPaths`, `openSession(root, baseline)` (`addRun`, `endRun`, `setPlace`, `run`), `acquireLock(file)`, `parseSession`, `commandOf(run)` (the command line without `--stage` and `--events`), `newestBuild`, `appendEvent`, `readEvents` |
| A run | `startRun(session, {tool, args}, {onEvent, onLine, onExit})` in `scripts/lib/shot-runs.mjs`: the tool spawned from the repository's root in a process group of its own (`detached`, so that the Ctrl+C that closes the review tool does not end the run before it puts the registry back), its events appended to `events.jsonl` and its other lines, stdout and stderr, to `log.txt`; `{run, stop, kill, exited}` |
| The model | `scripts/lib/shot-review.mjs`, pure: `runFacts(tool, events)` (listed, jobs and `jobOf`, failed, skipped, retakes, stopping, summary), `verdictOfEvent`, `reviewPictures(runs, {exists, measure})` (each part from the newest run that gave one, a newer PNG verdict dropping an older SVG; `progress` while a live run owes a part; a picture whose job failed before reaching it failed with the job's error), `groupOf`, `GROUPS`, `FILTERS`, `filterPictures`, `hasSvg`, `isOverridden`, `neighbours` |
| The pages | `scripts/lib/shot-pages.mjs`: `overviewHtml`, `detailHtml`, `chipsOf`, `loupesHtml` (a region cropped by CSS from the whole picture, enlarged up to 4 times, at most 360 by 240 CSS px), `hrefs` (every address the server answers); built on `pageHtml` (which now takes `head`, and leaves out the table or the contents when it is given none) and `chipHtml` in `shot-views.mjs`. A page fetches itself again 400 ms after an `update` event that names a picture it shows, and replaces its body; the detail page's comparison mode is kept in `sessionStorage` |
| The server | `createReviewServer({session, revision, manifest, docsRoot, headNow, newestIde, onLine, command})` in `scripts/lib/shot-server.mjs`: the pages, `/events`, `/api/state`, `/log/<n>`, the files (`/file/head`, `/file/docs`, `/file/run/<n>`, `/file/ref/<n>`, the picture the capture was judged against) and the difference maps drawn from a run's strength maps (`/map/<n>/png|svg/<out>`, `strengthPicture` in `shot-change.mjs`, which colours as `changeMap` does, the last 16 kept). It answers only a request whose Host is the loopback address at its port; a run's verdicts are read back from `readVerdicts` and its other events from `readEvents` when the session is opened again. The Changed group is ordered by the share of a PNG's pixels beyond its noise levels, from its strength map, else the SVG's share off its PNG |

**Next: step 6**, decisions and allowances. Still to write for it, where the tool applies a
verdict: moving a staged bundle into the cache (`readBundle` from the stage, `writeBundle` into
`.svgshot-bundles`), and the "dark" verdict's two calls (`applyPicture`, then `dropPicture` for
its SVG and bundle) as one function in `shot-apply.mjs`, so that `shoot_docs.mjs` and the tool
make the same calls. Today a run's verdicts are only shown: nothing is applied to `docs/`, so
until step 6 a retake through the tool changes nothing in the working tree. The actions go
into the detail page's PNG and SVG rows, and the server takes its first POST requests (it
answers 405 to any today).

Also in step 6, from the owner's answers of 2026-10-31:

- **The pictures changed outside the session's runs.** `changedPictures(DOCS_DIR,
  baseline.hash)` (`shot-revision.mjs`) lists them; those no run reported become a group of the
  overview (between Only noise and Unchanged is a reasonable place; it needs a key in `GROUPS`
  and a part in `reviewPictures` for pictures with no run). Their detail page compares HEAD's
  picture with the file, its map drawn by `changeMap` (there is no strength map staged), and
  has no verdict row. The list is read again when the overview is, since a terminal run can
  change it at any time.
- **Moving the session to a new HEAD.** A button beside the "HEAD is now ..." notice: a POST
  that sets `session.data.baseline` to HEAD (`revisionOf`, and the build from the manifest at
  it, as `shot_review.mjs` makes a baseline), reopens the server's `revision`, and clears
  `headNow`. A verdict whose `against` was `revision` was judged against the old baseline's
  picture, so it goes back to Needs a look (a new `why`, such as `baseline`, in `pngLook`'s
  sense, set by the model when a verdict's run is older than the move; record the move's time
  in the session).

Step 5 was checked with the tests in `test/svgshot.test.mjs` and with three real runs started
by the tool in one session, the tool closed between them: a retake of `Close_Question` whose
job failed in the harness (`the IDE's settings were not made the defaults: its page ran no
hook, even after a reload`, which a second run did not meet: a flake of `launchIde`'s hook, not
the tool's), which showed that a job's failure must reach its pictures; the same retake again
(both `unchanged`); and `Menu_File|Menu_Tools` (`Menu_File_Project.light` `noise`, its map the
one-level text rows the queue's `FAINT_LEVEL` is for). `git status` stayed clean under `docs/`.

Step 4 was checked with the runs [below](#checking-a-move), staged and not, which printed the
same lines, the staged ones writing nothing under `docs/` (`git status` clean) and their
verdicts saying the same (the restore case: `restored`, its SVG `keep` as HEAD has it, the light
SVG `new`); a staged `replay.mjs --recheck` of six pictures; and a stop sent after a few seconds
to `replay.mjs` over the 476 bundles (8 drawn, 467 `skipped`, its four children each stopped) and
to `shoot_docs.mjs --jobs 1` (one job finished, the two not started skipped, the registry put
back, exit 0).

Step 3 was checked with a replay of every bundle (`--recheck`), whose lines, sorted, were the
same before and after, and with `svg.ignore` on Properties_ColourPicker.light (a rectangle over
the strip at x 740 to 760 takes its 0.268% strongly off to 0.001%, and the SVG is kept) and a bar
at 200 levels. The constants were chosen from the pictures: each stage drawn over 8 SVGs and 5
retaken PNGs (the changed pixels, what the closing adds, the core, the boxes), and the counts
over every SVG and the PNGs of the BETA 1010 and 1033 retakes.

The PNG rule for a capture kept as within noise (owner, 2026-10-31; [the queue](#the-queue))
is `pngLook`'s `faint`: for `noise` and `restored`, when a region survives at `FAINT_LEVEL`.
`reviewPicture` measures it against the picture it was found within noise of.

Step 2 was checked with the runs [below](#checking-a-move), whose states it left as they were
with an empty manifest, and with an allowance and a decision on `Menu_Tools_IDEOptions`: the
light picture copied over the dark one (the same size; `withinNoise` never matches two sizes)
and `png.noise` at 255 levels and 100% leave it `unchanged but for a capture's noise` under
`--against-disk`, and `--cleanup --dry-run` puts it back; a `keep: "new"` decision on the
file's hash makes it a real change; and `svg.bar` at 8 levels and 0.001% has `replay.mjs`
remove the light SVG.

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

Nothing: the questions open after step 5 (the port, pictures changed outside the session,
allowances in the static sheets, HEAD moving under a session) were answered by the owner on
2026-10-31 and are under [Decisions](#decisions-owner).
