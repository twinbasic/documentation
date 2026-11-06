# Screenshot review — the plan

A localhost tool for reviewing what `shoot_docs.mjs` and `replay.mjs` decided about each
picture, overriding it, starting retakes and replays, and committing the result. **Design
agreed with the owner on 2026-10-31; all nine steps of [the order of work](#order-of-work) are
done: the tool runs as `node scripts/shot_review.mjs`, applies each verdict under `docs/` as it
arrives, takes a review's decisions and allowances, starts and stops its runs from its runs
page, and commits the session's own files from its commit page; `sheet.mjs` judges and shows
each picture's allowances; the tool is documented in `Tools-IDE.md` and its tests are a gate of
`test.bat`.** The mockups it was agreed
on were inline in that session and are not kept: the pages are described below instead.

The tool covers everything the command-line screenshot tools do, interactively, with a person
deciding where a threshold cannot (owner). The command-line tools stay, and both reach the
same result for the same inputs: see [Factoring](#factoring).

## Why

Two decisions are made by fixed thresholds, and neither threshold holds for every picture:

- **Did the PNG change?** `withinNoise` (`scripts/lib/shot-change.mjs`): no channel more than
  16 levels off, and no more than 0.5% of the pixels off at all. A channel's difference is as
  seen over black and over white (`pixelDiff`), so a cut-out's shadow edge, its colour at
  alpha 1 being rounding, is 1 level off, not 255 (2026-11-01; on the BETA 1010 retake it took
  Properties_ColourPicker's pixels beyond noise from about 3,900 to 33, and changed no
  verdict, nor anything on the BETA 1033 retake or run of 2026-11-01). A pixel more than 16 levels
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
- **A picture only a person can take is retaken from the tool too** (owner, 2026-11-06): it brings
  the extension up to date on disk, opens the page in the default browser, says what to set up, and
  takes in the result the person saves. See [Runs](#runs).
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
6. **Program windows: PNG only** (owner, 2026-11-01): a running program's window, which
   Windows draws, so there is no page to draw an SVG from (svgVerdict's `window`, `WINDOW_WHY`).
   A run before the mark gave them the reason it gave References_Detail, whose shot turned its
   SVG off, so their verdicts are not taken as one: a retake marks them. One whose PNG changed or was
   added stays in that group; the *No SVG* filter leaves them out, and their page offers no replay.
7. **Added**, **deleted**.
8. **Needs a retake** (owner, 2026-11-01): pictures a replay could not draw again from their
   bundles (`retake` events), whatever their PNG's verdict, until a later run gives them one. A
   replay counts them as done in its progress and says how many beside the count; before, they
   showed as in progress for as long as the replay ran, then under their PNG's group, Unchanged
   for most, which is collapsed.
9. **Failed**.

A row of counts at the top, filters (all, needs a look, overridden, no SVG), and **Resume at
*n* of *m*** to go back to where the queue was left. The two pages of `sheet.mjs` become views
of this one: `--against` is the overview itself, the pictures with no SVG a filter.

### All pictures

Every picture `shoot_docs.mjs` takes, as the working tree has it, whatever any session did
(owner, 2026-11-01: after a commit the overview is empty, and the pictures with no SVG are worth
seeing). The pictures are the table's (`shoot_docs.mjs --list`, which starts no IDE; a shot of a
program's window says so in the table, `window: true`, and a shot whose take and table disagree
fails), each dark picture and the light one when it is under docs. A card shows the PNG, whether
it has an SVG, the manifest's build and its allowances, and for a picture with no SVG why: the
table's for a window, else the newest SVG verdict of this session or of an archived one that says
(owner's option 1: no drawing; `noSvgReason`, which takes "refused", "accepted" but not written,
and "none drawn", and passes over a verdict of an SVG left with its PNG and not judged), else
"unknown". Groups: no SVG of a program's window, no SVG, not under docs, an allowance or a
decision, with an SVG (collapsed). The No SVG group has **Judge their SVGs again from their
bundles**, a replay with `--recheck` of those with a bundle: option 2 on demand. A card opens the
picture's page of verdicts when the session has one, else a plain page: the baseline's picture,
the file, its SVG, why it has none, and Retake and Replay, previous and next in this page's order.

### Detail

One picture: previous and next (in the order of the overview, within the filter it was opened
from), its place ("4 of 17 · Needs a look"), and the keys j and → for the next picture, k and
← for the previous (j/k as in vi and most lists of the web, the arrows for left and right on the
keyboard; owner).

- **The comparison**: `HEAD` and the new capture side by side, a swipe, blinking, the
  difference map, and the SVG against the new PNG with its own map. Below them, a **loupe**
  for each region of change: the region cropped and enlarged, old and new, so that a small
  change in a large window is as easy to see as in a small dialog.
- **The PNG row**: the tool's verdict and its reason, the choice *keep old / take new* (not
  offered when the capture is HEAD's picture byte for byte, where both write the same file), and
  the parameters: noise levels, share, and the rectangles left out (drawn on the picture).
  Changing a parameter judges the picture again at once and shows the verdict it gives.
- **The SVG row**: the share strongly off, the verdict, the choice *accept / no SVG*, and the
  parameters: levels, share, rectangles left out. When the SVG stays with its PNG (the PNG not
  written), the choice is *accept this SVG in place of the file's* alone, which writes it
  (owner, 2026-11-01): a refusal would refuse the run's SVG, not the file's, and change nothing.
  When the PNG goes back to `HEAD`'s, the row is greyed out and reads that the SVG goes back with
  it (an SVG changes with its PNG, owner, [WIP.Screenshots.md](WIP.Screenshots.md#pictures-as-svg)).
  A click on any of the row's three pictures (the PNG, the SVG, the map) opens a zoom of that
  place in all three (owner, 2026-11-01; `zoomedTrio`, the page script's `renderZoom`): each
  drawn at the picture's device size, the SVG rasterised there as the judge compares it, and
  enlarged 2, 4, 8 or 16 times without smoothing, with each one's colour at the centre; a click
  in the zoom moves it, + and - change the level, Escape closes it.
- **Retake this picture** and **Replay its SVG**: a run of one picture. Replay is greyed out,
  with the reason, when the bundle cache has no bundle of the picture: a bundle goes there only
  with the SVG drawn from it (a retake whose PNG stays writes one only when the SVG it drew is
  the file's to the byte, line endings aside, `bundleFollowsSvg`, or when the cache's bundle
  cannot draw the picture again, `staleBundle`, which writes the SVG too; owner, 2026-11-02), so a
  picture whose PNG and SVG stayed may have none until its next retake, and a replay would draw
  nothing. Accepting a run's SVG
  on the SVG row puts its bundle there. 54 of the 513 SVGs under docs had none on 2026-11-01. A picture's page fetches itself again on an update that says
  the runs changed, not only on one that names it, since its run buttons wait for a run to end.
- **Back to the tool's verdicts**.

### Runs

The session's runs, newest first, each with its kind, its options, the command line it is the
same as (so it can be run again from a terminal), and while it runs a progress bar per job
(`help`, `no-project`, ...) and **Stop**. A run that has ended has **Remove**, which undoes it
as if it had not run (owner): each picture it held is put back as its layer found it, the
later runs' layers on that picture are applied again from there, judged anew (the applier's
`undo`, dark pictures before light ones), and its record moves to the session's `removed`, so
that its number is never given again, and its folder is deleted. Forgetting a run while
leaving its writes under `docs/` was turned down: a picture only it changed would then be
changed outside the runs, which the commit leaves out. A run that is running is stopped
first; while a clean-up runs or a commit is under way, Remove waits. A picture that cannot be
put back keeps the run, and Remove again tries again. A clean-up keeps no layers, so removing
one leaves what it put back. A retake that has ended with pictures it failed on (a failure
reported, a job that failed before reaching them, or a staged verdict that says so) has
**Retake what failed (N)**: a new retake of exactly those pictures, with the run's `--svg`
and its IDE (by its build among the installs found; disabled when that install is gone). A run
that named no IDE (`shot_review.mjs --retake` without `--ide`) is retaken on the build its run
event records, the newest install when it ran, not the newest now.
Continuing the failed run itself was turned down (owner): its layers would come after a later
run's, and a run has one start, one end and one summary. The failed pictures have no verdict
of that run, so the new run's are their only ones, and they leave the Failed group. A replay
that has ended with pictures it failed on, or that it says need a retake (their bundles cannot
answer what the converter now asks), has **Retake what failed (N)** too (owner, 2026-11-01): a
retake of those pictures with `--svg`, on the newest install, since a replay runs no IDE. Below, a
form for a new run:

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
  tool reads them and sends them to the pages over server-sent events. **The browser holds one
  stream for all the tool's pages**: the page that holds the Web Lock `shot-review-events`
  holds it and passes each update to the others over a BroadcastChannel of that name, and the
  lock passes to another page when it goes. A browser opens six HTTP/1.1 connections to a host
  at most, and a stream holds one while its page is open, so a stream for each page left a
  seventh page, or its pictures, waiting for minutes. A shared worker cannot do it: in the
  desktop app's browser pane (Electron 44) a shared worker's `fetch` and `EventSource` never
  reach the server. A picture is answered with an ETag, its bytes' hash, and with 304 when
  the browser has those bytes.

**Stop** is a line on the child's stdin: the child takes no further shot, finishes the one in
hand, ends its IDEs and puts the registry back, as at its normal end. Killing it would skip
that, so the tool offers a kill only after a stop has not ended it, with that warning.

**A browser retake is `chromeshot.mjs --take`**, a run like the others, with `--stage` and
`--events`, so that the tool and the command line reach the same result, and a capture goes
through what `shoot_docs.mjs` does with one: `decidePicture`, `reviewPicture`, the stage, the
verdicts. `runOf` makes any retake of a picture of `chrome/shots.mjs` one, so every Retake button
works unchanged; a retake of those and of the IDE's together is refused, being two tools. It
differs in waiting for a person. Its `run` event has `setup: "browser"` jobs, `await` says what it
waits for and `refused` why a capture was no good, which `runFacts` keeps for the runs page, and
a refusal is no failure: the picture is waited for again. Stop ends the wait at once. A refusal
names what a look at the picture finds late: one theme (which the site then shows in both), no
marks, a dragged rectangle, or another repository, whose crop does not show it. Its verdicts
carry `build: null`, a picture of a browser being of no build of the IDE.

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
   `replay.mjs` and `sheet.mjs` calling the shared modules. Done (the commit helper with step
   8): see [Where the work stands](#where-the-work-stands).
2. **The manifest**: read and written by one module; `shoot_docs.mjs` and `replay.mjs` judge
   with its allowances, honour its decisions and record `build`. Done.
3. **The strength map, the regions and the queue's rules**, tested on fixtures. Done.
4. **`--stage`, `--events` and stop** in `shoot_docs.mjs` and `replay.mjs`. Done.
5. **The server and the session store**, the overview and the detail page read-only, live.
   Done.
6. **Decisions and allowances** applied through `shot-apply.mjs`, judged again at once. With
   them, the group of pictures changed outside the session's runs, and the action that moves
   the session to a new HEAD ([Decisions](#decisions-owner)). Done.
7. **The runs page**: retake, replay, clean up, stop. Done.
8. **The commit panel**. Done.
9. **`sheet.mjs` on the shared views**, showing each picture's allowances; the tool's entry in `Tools-IDE.md`, its node in
   `Tools-Groups.dot` (its command-line cases are in `scripts/lib/cli-cases.mjs` since step 5), its tests in
   `test.bat` (and so in Tools.md's list and the `run-gates` action), and the row in
   WIP.md's *Which file to open*. Done.

## Where the work stands

On `staging` since 2026-10-31, steps 1 to 9. Each move kept the command-line tools' output as it was, checked as
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
| Writing a verdict | `scripts/lib/shot-apply.mjs`: `applyPicture(outRoot, out, decision, revision, {svg, bundlesRoot})` (for "dark", with `svg`, and for "once", the light file's SVG and bundle go too, through `dropPicture`: the "dark" verdict's two calls of step 5 made one), `applySvg(outRoot, svgOut, svg or null)`, `restorePictures(outRoot, revision, outs, {dryRun})` (the PNGs and their SVGs, the SVGs by one `git restore`; `--cleanup` and a `restored` picture both use it), `dropPicture(outRoot, out, bundlesRoot)`, `writeSvg`, `svgOf`. What stays in `shoot_docs.mjs`'s `keep` and `keepSvg`: the counts, the lines it prints, the `--diffs` pictures, the bundle written, the user-name check, and the rule that an SVG stays as it is when its PNG was not written |
| The git listing | `changedPictures`, `parseNameStatus`, `parseUntracked` in `scripts/lib/shot-revision.mjs` |
| A child's report | `scripts/lib/record-lines.mjs`: `recordLine`, `writeRecord`, `parseRecord`, `readRecords(stream, kinds, {onRecord, onLine})`; `runShards` reads `svgshot-result` records with it, and `--events` writes `shot-event` records the same way (a shard's pass through its parent as lines) |
| The sheets' HTML | the pieces in `scripts/lib/shot-views.mjs`: `pageHtml({generator, title, intro, summary, contents, body})`, `cardHtml({out, meta, meter, figures})`, `figuresIn(folder)` (`href`, `figure`, `thumb`), `meterHtml`, `tocItem`, `esc`, `anchor`, `sizeText`, `pctText`. The two pages, their rows, their order, their commands and the output-folder rules (`mayWriteSheet`, `SHEET_GENERATOR`) are in `scripts/svgshot/sheets.mjs`, and `outputRefusal`, which the stage shares, in `shot-revision.mjs`; `redraw.mjs` keeps drawing and the shards |
| Server-sent events | `createSseChannel()` in `lib/sse.mjs`: `handle(req, res)`, `send(event, data)`, `close()`; `builder/serve.mjs` uses one |
| The installs | `listIdes()` in `scripts/lib/tb-install.mjs`, newest first, `[{build, exe}]` |
| Commit | `workingChanges(root)` (`{top, changes}`, `parseStatus` of `git status --porcelain=v1 -z --no-renames --untracked-files=all`) and `commitPaths(root, {paths, added, message})` in `shot-revision.mjs`: `git add` of the paths git does not track, then `git commit --only` of every path named, literal pathspecs on stdin, hooks run; git's own words in the Error when it refuses |

What step 5 added, the tool itself:

| Part | Where it is |
|---|---|
| The tool | `scripts/shot_review.mjs [--port N] [--retake <regex> \| --replay <regex>] [--jobs N] [--ide <exe>]`: takes the session's lock, makes the session with HEAD as its baseline (`build` the newest the manifest at HEAD records) when there is none, serves it on `127.0.0.1:4180`, and starts a run when asked (`runOf`, step 7: a retake is `shoot_docs.mjs --svg --only`). Ctrl+C stops the runs by their stdin and waits, a second Ctrl+C kills them. Its command-line cases are in `scripts/lib/cli-cases.mjs` already |
| The session | `scripts/lib/shot-session.mjs`: `REVIEW_ROOT`, `RUN_TOOLS`, `sessionPaths`, `runPaths`, `openSession(root, baseline)` (`addRun`, `endRun`, `setPlace`, `run`), `acquireLock(file)`, `parseSession`, `commandOf(run)` (the command line without `--stage` and `--events`), `newestBuild`, `appendEvent`, `readEvents` |
| A run | `startRun(session, {tool, args}, {onEvent, onLine, onExit})` in `scripts/lib/shot-runs.mjs`: the tool spawned from the repository's root, hidden, on a console of its own that the Ctrl+C closing the review tool does not reach (so that the run puts the registry back; see step 7 below for why it is never `detached` on Windows), its events appended to `events.jsonl` and its other lines, stdout and stderr, to `log.txt`; `{run, stop, kill, exited}` |
| The model | `scripts/lib/shot-review.mjs`, pure: `runFacts(tool, events)` (listed, jobs and `jobOf`, failed, skipped, retakes, stopping, summary), `verdictOfEvent`, `reviewPictures(runs, {exists, measure})` (each part from the newest run that gave one, a newer PNG verdict dropping an older SVG; `progress` while a live run owes a part; a picture whose job failed before reaching it failed with the job's error), `groupOf`, `GROUPS`, `FILTERS`, `filterPictures`, `hasSvg`, `isOverridden`, `neighbours` |
| The pages | `scripts/lib/shot-pages.mjs`: `overviewHtml`, `detailHtml`, `chipsOf`, `loupesHtml` (a region cropped by CSS from the whole picture, enlarged up to 4 times, at most 360 by 240 CSS px), `hrefs` (every address the server answers); built on `pageHtml` (which now takes `head`, and leaves out the table or the contents when it is given none) and `chipHtml` in `shot-views.mjs`. A page fetches itself again 400 ms after an `update` event that names a picture it shows, and once in 400 ms at most while they keep coming, one fetch at a time, and replaces its body (put off by each update, as it first was, it never fetched while a replay reported several pictures a second, owner, 2026-11-01); the detail page's comparison mode is kept in `sessionStorage` |
| The server | `createReviewServer({session, revision, manifest, docsRoot, headNow, newestIde, onLine, command})` in `scripts/lib/shot-server.mjs`: the pages, `/events`, `/api/state`, `/log/<n>`, the files (`/file/head`, `/file/docs`, `/file/run/<n>`, `/file/ref/<n>`, the picture the capture was judged against) and the difference maps drawn from a run's strength maps (`/map/<n>/png|svg/<out>`, `strengthPicture` in `shot-change.mjs`, which colours as `changeMap` does, the last 16 kept). It answers only a request whose Host is the loopback address at its port; a run's verdicts are read back from `readVerdicts` and its other events from `readEvents` when the session is opened again. The Changed group is ordered by the share of a PNG's pixels beyond its noise levels, from its strength map, else the SVG's share off its PNG |

What step 6 added:

| Part | Where it is |
|---|---|
| Applying the verdicts | `createApplier({session, docsRoot, bundlesRoot, revision(), manifest()})` in `scripts/lib/shot-verdicts.mjs`: `arrive(n, out, part)` applies a part of a run's verdict as its event arrives, as the run decided it (the server queues each arrival and applies one per turn of its event loop, so that it answers between them: applied as their events were read, a replay's, each 0.1 s or more for its bundle copied into the cache, held every request up for as long as the replay ran, owner, 2026-11-01; a run that has exited stays live until its arrivals are applied, and `close()` applies what is left); `pending()` applies what was reported and not applied (the tool opened again); `rejudge(out, from)` applies every layer of a picture again from the run `from` on, judged anew with the manifest as it is and against the baseline; `reviewed(n, out)`, `heldPng(n, out)`, `errors`. Its header has the rules. What it applied is the stage's `review/` (`readReviewed`, `writeReviewed`, `reviewedFiles` in `shot-stage.mjs`), which the server shows in place of the run's own verdicts; a verdict judged again whose reference changed has its strength map measured again into `review/maps/` |
| What a picture held | before a run's verdict on a picture is applied, `holdPicture(dir, outRoot, out, bundlesRoot, build)` keeps its PNG, SVG, bundle and manifest build in `runs/<n>/held/`; `unholdPicture` puts them back (each removed that was not there) and returns the build; `heldOf`. Putting a picture back as its first layer found it undoes that layer and every later one, which is how a decision is applied and a run removed (`heldPictures(dir)` lists what a run held) |
| A bundle into the cache | `copyBundle(fromRoot, toRoot, out, png)` in `svgshot/bundle.mjs`, naming the PNG the file holds once a review has decided (the run named the one it expected); `BUNDLE_CACHE` there, the one default for `shoot_docs.mjs`, `replay.mjs`, `sheet.mjs` and the tool |
| The SVG with its PNG | `svgFollowsPng({written, svgOnDisk})` in `shot-policy.mjs`, which `shoot_docs.mjs`'s `keepSvg` and the applier both ask. With `--stage`, `keepSvg` judges and stages the SVG of a picture whose PNG is not written too ("unchanged", `why` its reason, no look), and of one restored or the dark one's, so that a review that takes the capture can write the SVG as judged; the lines printed are the same, and without `--stage` nothing changed |
| The noise rule over files | `pngsNear(a, b, rule)` in `shot-change.mjs`, `shoot_docs.mjs`'s `nearly` |
| The manifest's setter | `setPart(out, part, key, value)` on `openManifest`'s object: a decision or an allowance set, or removed with `undefined`, checked as `parseManifest` checks an entry |
| The actions | POSTs of JSON to `/api/picture/<out>` (`hrefs.act`), `{action}`: `png` (`keep` "old", "new" or null), `svg` (`accept` true, false or null), `allowance` (`png` and `svg`, each `{levels, share, ignore}`, empty for the default), `rule` (the picture's decisions removed: "Back to the tool's verdicts"), `judge`; and `/api/baseline` (`hrefs.moveBaseline`). Each changes the manifest, then `rejudge`s from the run the verdict is about. A POST is refused unless its Origin is the server's own and its body JSON, since a page of any origin can send a form to the loopback address. The detail page's PNG and SVG rows have the choices, an Allowances form (a rectangle is drawn by dragging on the picture, in device pixels) and Judge again; the page's script sends them and says "applying..." or the error beside the buttons |
| Changed outside the runs | the server's `changed()` (`changedPictures` against the baseline, read at most once a second); `reviewPictures(runs, {outside})` puts those no run reported in the group `outside`, between Only noise and Unchanged; `outsideHtml` compares HEAD's picture with the file, its map `/map/outside/<out>` drawn by `changeMap` |
| Moving to HEAD | `session.moveBaseline(baseline)` (`moved: {at, from}`); the server's `head()` and `revisionAt(hash)`; HEAD is read again at most once a second, so the notice follows a commit made while the tool is open. Each verdict as applied records the baseline it was judged against (`baseline`, a run's `--against` on arrival), and `reviewPictures(runs, {baseline, stale})` gives one judged against the revision of another baseline the look `baseline` until it is judged again, when `stale(out, hash)` says the picture differs between that commit and the baseline: the server's `changedBetween(a, b)`, one `git diff --name-only` per pair of commits, kept (a move to a commit that changed only code left 543 of 559 verdicts needing a look under the old rule, and 0 under this one). A move changes no file, so it is undone by moving back: `moved` records `fromHash`, and the overview's notice offers **Move back to `<from>`** (`{action: "back"}`, the server's `baselineOf(rev)`) |
| A retake's revision | `shot_review.mjs --retake` passes `--against <baseline>`, so that a run judges against the session's baseline whatever HEAD is (`againstOf(run)`) |

What step 7 added:

| Part | Where it is |
|---|---|
| A run from a request | `runOf({kind, only, pictures, svg, jobs, ide, recheck, dryRun}, baseline)` in `scripts/lib/shot-runs.mjs`, `{tool, args}`, for the runs page and `shot_review.mjs --retake / --replay` alike: `kind` "retake", "replay" or "cleanup" (`RUN_KINDS`), a retake and a clean-up `--against` the baseline, `pictures` made a pattern that matches each alone (`onlyOf`), and every option the kind does not take refused; `kindOf(run)` |
| A clean-up run | tool `cleanup` in `RUN_TOOLS` (`shoot_docs.mjs`, its args naming `--cleanup`), not in `STAGED_TOOLS`, so `runArgs(tool, args, stage)` gives it no `--stage` and no `--events`: it has only its log. `optionOf(run, option)` in `shot-session.mjs` (`againstOf` is one) |
| One run at a time | the server's `start` refuses while a run is live: a picture's layers are applied in the runs' order, which two runs at once would not keep. While a clean-up runs, a review's actions and the move to HEAD are refused (`refuseWhileCleaning`); when it ends, the pictures changed outside the runs are read again at once |
| Stop and kill | POST `/api/run/<n>` (`hrefs.runAct`), `{action}`: `stop` (not for a clean-up, which ends in seconds), and `kill` only once a stop has been asked for (`stopAsked`), behind the page's confirmation. Start is POST `/api/runs` (`hrefs.startRun`), the IDE named by its build among the installs (`ides`, `listIdes()`) |
| The runs page | `/runs`, `runsHtml` in `shot-pages.mjs`: a form for each kind (a retake's IDE, newest first, marked when newer than the baseline's build; its pictures, `--svg` and jobs; a replay's `--recheck`; a clean-up's dry run first, then **Put them back** on the newest one), and each run newest first with its command line, a progress bar for each job (`runRow`'s `jobs`), Stop or Kill, and its log: a clean-up's whole, the last 8 lines of one that runs. A form keeps its values when the page fetches itself again (`data-keep`) |
| Pictures selected | a checkbox on each card of the overview, kept in the browser (`localStorage`, `shot-review-selected`), and one on each group's heading (owner, 2026-11-01) that selects every picture the group shows or none, mixed (`indeterminate`) while some are, so that a click on it selects them all; the runs page's forms take the selection in place of a pattern, and a bar on both pages says how many and clears it. A picture's page has **Retake this picture** and **Replay its SVG**, and a picture changed outside the runs **Retake this picture**, each greyed while a run is live |

**A run is never `detached` on Windows.** Step 5 started each run with `detached: true` to keep
the review tool's Ctrl+C from it. On Windows that is `DETACHED_PROCESS`: the run has no console
at all, and every console program it starts without `windowsHide` (`git` in
`shot-revision.mjs`, PowerShell, `reg`) opens a console window on the user's desktop, which the
owner saw flash during a retake. `windowsHide` with no stdio inherited, as the lane runner
spawns its children, is `CREATE_NO_WINDOW`: a console of its own with no window, which those
programs inherit and which the terminal's Ctrl+C does not reach. `startRun` now spawns that way
(detached elsewhere only), and the three `git` calls of `shot-revision.mjs` pass `windowsHide`
too; a retake and a stopped retake run so flashed nothing (owner).

What step 8 added:

| Part | Where it is |
|---|---|
| What a commit takes | `commitPlan({pictures, changes, docsPrefix, manifestPath, entry})` in `shot-review.mjs`, pure: of the session's own files (the PNG and the SVG of each picture a run reported, and the manifest), those git reports changed, each with what the session did to it; the working tree's other changes `leftOut`; the counts and the newest `build` of a PNG committed. `commitMessage(plan)` is the default message, one line, the plan's own example word for word. An SVG is "by allowance" when its picture's entry changes its bar and its `stats.pct96` is not below `SVG_FAITHFUL`: the default bar would have refused it |
| The commit | the server's `commit(body)`: refused while a run runs, while HEAD is not the baseline (the refusal names HEAD, and the session is to be moved to it first), when `body.files` is not the list the page was drawn with, or for an empty message; then `commitPaths`, then `onCommit`, whose answer the server serves from then on (`session`, `revision`, a new applier, the runs read again). POST `/api/commit` (`hrefs.commit`), `{message, files}` |
| The commit page | `/commit` (`hrefs.commitPage`), `commitHtml` in `shot-pages.mjs`: the counts, the message in a text box with its default as `data-default` and **Back to the default message**, enabled once the box differs (the page's script; a refresh keeps an edited message and takes a new default otherwise), the files with their status and why, what is left out (200 at most), and the archived sessions, each with the command that opens it. Overview, Runs and Commit link to each other at the top of each page |
| Closing the session | `session.archive(commit)` in `shot-session.mjs`: `closed` {hash, short, message, at} recorded, `session/` moved to `archive/<id>/session/` (copied and removed if a file in it is held open), its lock left out, `<id>` the commit's short hash (`-2`, `-3` after it when taken). `archiveRoot(root, id)` is a root `openSession` opens; `listArchived(root)` lists them, newest closed first. In `shot_review.mjs`, `onCommit` archives, takes the lock again and opens the next session, the commit as its baseline |
| An archived session | `shot_review.mjs --archived <id> [--port N]`: the session opened from the archive with `readOnly`, no lock, no run, nothing applied; every POST is refused (403), the overview says it is archived and that the pictures under docs are shown as they are now, and the commit page lists the archived sessions only |

**A clean-up's pictures are not the session's to commit**, as the note before this step
guessed they might be: a clean-up puts a picture back as the baseline has it, and the session is
committed only while its baseline is HEAD, so what it put back is as HEAD has it and git reports
nothing. With HEAD moved under the session, committing them would undo the pictures of the
commit made outside it. A PNG kept at HEAD by a review has nothing to commit either, but its
decision is in the manifest, which is, and the message counts it.

Step 8 was checked with the tests in `test/svgshot.test.mjs` (`parseStatus`; `commitPaths` in a
scratch repository, a new file added, a removed one a deletion, another change and a staged file
left as they were; `archive` and `listArchived`; `commitPlan` and `commitMessage` over every kind
of picture; and the server in a scratch repository with the stand-in run: refused while it runs,
for another list of files and for an empty message, then committed, archived, the next session
served, and the archived one opened read-only), and with the real tool in this worktree, on port
4183: a retake of `Menu_File_Project` (dark `unchanged`, light `noise`, as in steps 6 and 7), the
commit page with nothing to commit and the working tree's one other change left out; the light
capture taken on its page, after which the commit page listed it and the manifest (1 taken by
review; the default message `Screenshots retaken on BETA 1034: 1 taken by review`); Back to the
default message enabled by an edit and putting the default back; an edited message kept while
the page fetched itself again; Commit, which committed those two files and nothing else, with the
edited message, archived the session as the commit's hash and showed the next session's empty
page with the archived one listed; and `--archived <id>` on port 4181, which showed the session
as committed and refused a POST. The commit took several seconds on this repository (its hooks,
and git over 5,000 files), during which the page says "applying...". The test commit was then
dropped from the branch (`git reset --keep`).

What step 9 added:

| Part | Where it is |
|---|---|
| A picture's allowances as text | `allowancesOf(entry)` in `shot-views.mjs`, `{png, svg}`: the rule each allowance makes, with the defaults filled in from `pngRule` and `svgRule`, or null. The overview's cards and a picture's page show each as a chip, `PNG: allowance` and `SVG: allowance`, the rule as its tooltip (`chipsOf(p, entry)`; `overviewHtml` takes `entry(out)` from the server) |
| The sheet of pictures with no SVG | `sheet.mjs` reads the manifest when `--docs` is `docs` (as `shoot_docs.mjs` and `replay.mjs` do for their `--out`) and passes each picture's entry to `judgeSvg`, so an SVG is judged by its own bar and a review's decision. A row has `by`, `allowance` and `own` ({share, bar}: the share off at its bar's levels with its rectangles left out, and its bar); its card shows the allowance with that share, or "accepted/refused by a review's decision", and its meter is drawn against its own bar |
| The sheet of changes | `compareRevisionPicture(item, before, after, entry)` compares by `pngRule(entry)` (`compareImages(A, B, rule)` takes the rule: its `levels` split beyond from faint, and `noiseOnly` is `withinNoise` with the whole rule) and files a picture as noise by `cleanupResets`, so the group is exactly what the `--cleanup` command it shows puts back. A row has `by`, `share` and `allowance`; the card says "kept old" or "taken new by a review's decision", and the meter's mark is the rule's share. `meterHtml` clamps a mark past the meter's full width to its end (an allowance of 100% is past the 10% the bar shows) |
| The commit's status | the commit form has `data-busy="committing..."`, and the page script's `post` says the `data-busy` text of the form or control that sent an action, else "applying..." |
| The tests | the review tool's four suites moved from `test/svgshot.test.mjs` into `test/shot-review.test.mjs` (session, pages, writes under docs, server), each file keeping the imports it uses; the modules the tool shares with the command-line tools stay tested in `svgshot.test.mjs`. The new file is a step of `test.bat`, of the `run-gates` action, of Tools.md's list (31 steps; `check_gate_lists.mjs` now reads number words up to forty) and of Building.md's command, with an entry of its own in `Tools-Toolchain-Tests.md` and a row in WIP.md's roster |
| The documentation | `shot_review.mjs` in `Tools-IDE.md` (after `sheet.mjs`, which now says how it reads the manifest), node `i10` in `Tools-Groups.dot` and `t29` for its tests (the next row's edge to the samples moved to it), the landing page's line, and WIP.md's *Which file to open* row naming the tool |

Step 9 was checked with the tests (121 in `svgshot.test.mjs`, 22 in `shot-review.test.mjs`:
the allowances as text and as chips, the overview's chips after an allowance through the server,
the change sheet with an allowance, a rectangle left out and a decision each way, the no-SVG
sheet's card with its own bar and a decision, the clamped mark, and the commit form's
`data-busy` and the script that reads it), with `build.bat`, `check.bat` and `test.bat`, and by
running both sheets with an entry put in the manifest for the run and taken out after (`git
checkout` of it): `--against 16765345^ --only IDE/Menu/` filed `Menu_View.light.png`, with a PNG
allowance of 255 levels and 100%, under noise (0 changed beyond noise, its card naming the rule)
and `Menu_Edit.png`, with a "keep old" decision on its file, as kept old by a review although its
size changed; `--all --only Menu_Add-Ins` judged `Menu_Add-Ins.png` by an SVG bar of 32 levels
and 5% (0.081% off by it, the same as its `pct32`), and its light picture, with no entry, by the
default bar.

**The commit runs without blocking** (owner, 2026-11-01, after step 9):

| Part | Where it is |
|---|---|
| git as a child process | `commitPaths` in `shot-revision.mjs` is `async`: `gitSaying` spawns git with its stdio piped and its window hidden, so it has a console of its own, which the tool's Ctrl+C does not reach. It finds the repository's root with `git rev-parse --show-toplevel`, not a second `git status` |
| The commit under way | the server's `committing` ({message, at, plan, done}): `commit(body)` checks what it checks at once, then sets it, sends an update and returns the promise of the commit; the POST answers when it has ended. Meanwhile the server answers every request: the commit page is drawn from `committing.plan` (no `git status`) with "committing..." in its status, the message read-only and Commit disabled; the overview and the runs page carry a notice (`committingNotice` in `shot-pages.mjs`); `busyRun()` is `{commit: true, message, at}`, so every run button is greyed with its reason; `refuseWhileCommitting` refuses a review's action, the move to HEAD, a run and a second commit; `headNow()` is null, since HEAD moves to the commit before the session is closed |
| Ctrl+C | `app.committing()` is the promise of the commit under way, or null; `shot_review.mjs` waits for it before closing |
| The default message | `commitPlan` counts a PNG as kept at HEAD only when its picture's decision is "old": a "new" decision about a capture that is the file's own bytes (taken in an earlier session) had made it say "1 kept at HEAD by review" for a commit of an allowance |

It was checked with the tests (a timer that fires while `commitPaths` runs; the server's commit
held open by a `pre-commit` hook that waits for a file, while the commit page, the overview and
the runs page say it is under way and a review's action, a run and a second commit are refused;
`commitPlan` with both decisions), and with the real tool in a scratch worktree, on port 4183,
whose test commits were then thrown away with the worktree's branch:

- In the browser, a recorder put into the commit page logged every text of its status and notices
  while **Commit** was clicked: "committing..." from the click, with the buttons disabled, then the
  notice as the page fetched itself again, then the next session's page with its "Committed" notice.
  The overview, fetched every 700 ms meanwhile, said the commit was under way. No answer came for
  about 4 s after the click: that was the recorder's own load, overview renders of about half a
  second each queued behind the browser's six connections to the host, not the commit.
- A script committing through the API while it fetched `/runs` every 100 ms: while git and the
  hook ran, `/runs` answered in 1 to 3 ms. Two waits remain, of about 0.3 s before git starts (the
  checks: `git status` and the plan) and 0.4 s at the end (`onCommit`: the session archived, the
  next one opened); making those asynchronous too is not worth it.

Nothing of the plan is left. The two small things left after step 9 are fixed:

- **The manifest keeps its line endings.** `openManifest().save` wrote LF, so a manifest checked
  out with CRLF showed as modified with no diff once the tool (or `shoot_docs.mjs`) had saved it,
  even after a decision was removed again. It now writes the line endings the file had (LF for a
  new one); the manifest test saves a CRLF file, changes it and puts it back byte for byte.
- **One reader of a PNG's size**, `pngSize(bytes)` in `scripts/lib/png.mjs`: `[width, height]`
  from the header, null for bytes without the PNG signature and IHDR. It replaced the copies in
  `shot-policy.mjs` (whose verdicts keep `{w, h}`, through `sizeOf`), `shot-server.mjs`,
  `svgshot/redraw.mjs`, `svgshot/probe.mjs`, `shot-composite.mjs`, `shoot_docs.mjs` and
  `snapshot-svg.mjs`'s `naturalSize`; the tests' fake headers carry the whole signature now.
  `builder/theme-pictures.mjs` and `builder/vendor-assets.mjs` keep theirs: `builder/` may import
  nothing under `scripts/` but `impexp.mjs` (`biome.jsonc`).

**The page of every picture** (owner, 2026-11-01, after the plan; [All pictures](#all-pictures)):

| Part | Where it is |
|---|---|
| The table | `shoot_docs.mjs --list` (`[{out, setup, once, window}]`, written with `writeSync` before `process.exit`, so a pipe gets all of it); `listShots()` in `shot-runs.mjs` runs it hidden; the server reads it when `/all` is first asked for, again after `SHOTS_FRESH` (30 s), one read at a time |
| The model | `allPictures({shots, exists, entry, verdicts})`, `noSvgReason(svg)`, `ALL_GROUPS` and `appliedVerdict(v, done)` (a run's verdict as the review applied it, which the server's `shownVerdict` now asks too) in `shot-review.mjs` |
| The verdicts | the server's `verdictsOf()`: this session's model, then each archived session's pictures (`closedSessionPictures(root)`, its runs read as `loadRuns` reads them, through `readRun`), the newest closed first, each read once; `listArchived` now gives each one's `root` |
| The pages | `allHtml` and `plainHtml` in `shot-pages.mjs`, `hrefs.all`; *All pictures* in the top links and a picture's pager; `/picture/<out>` falls back to the plain page for a picture of the table no run of the session reported |

An allowance is applied as soon as it is submitted; there is no preview of the verdict it would
give without applying it (the plan's "shows the verdict it gives" is met by the page showing the
new verdict).

Step 7 was checked with the tests in `test/svgshot.test.mjs` (`runOf` on its own, and the
server with a stand-in clean-up and run: the dry run's list and its button, a second run
refused, a review's actions held while a clean-up runs, the outside group read again after it,
a retake of selected pictures on an install named by its build, its progress by job, Kill
refused before Stop), and with the real tool in a worktree, each run started from the page or
its API: a dry-run clean-up (nothing to put back), a retake of `Menu_File_Project` typed into the
form (dark `unchanged`, light `noise`, as in step 6), a replay of the picture selected on the
overview (the pattern `^(?:IDE/Projects/Images/Menu_File_Project\.light\.png)$`; a new
worktree's bundle cache has none), and retakes of `IDE/Menu/Images/Menu_` stopped by the page's
Stop after their first job (the IDEs ended, the registry put back, the rest `not taken`), Kill
shown in Stop's place with its warning. `docs/` stayed as HEAD has it.

Step 6 was checked with the tests in `test/svgshot.test.mjs` (the applier on its own, and the
server with a stand-in run: a verdict applied as it arrives, decisions, allowances, the
outside group, the move), and with the real tool in a worktree: a retake of
`Menu_File_Project` (dark `unchanged`, light `noise`, both SVGs judged and staged as
"unchanged"), nothing written under `docs/`; the light picture taken through a POST and through
the page's own button (the PNG written, the decision and BETA 1034 in the manifest, the SVG as
judged the same as the file), a rectangle drawn on the SVG's picture and applied as an
allowance, then the defaults and the rule again, after which `docs/` was as HEAD has it. The
[checks of a move](#checking-a-move) printed the states listed there, and the restore case
staged the same lines, its verdicts as listed.

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
