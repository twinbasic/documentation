# Screenshot review — the plan

A localhost tool for reviewing what `shoot_docs.mjs` and `replay.mjs` decided about each
picture, overriding it, starting retakes and replays, and committing the result:
`node scripts/shot_review.mjs`. It applies each verdict under `docs/` as it arrives, takes a
review's decisions and allowances, starts and stops its runs from its runs page, and commits
the session's own files from its commit page. The design was agreed with the owner on
2026-10-31. Its tests and documentation are listed at the end of [Where the code is](#where-the-code-is).

The tool covers everything the command-line screenshot tools do, interactively, with a person
deciding where a threshold cannot (owner). The tools that take and draw the pictures stay, and
both reach the same result for the same inputs: see [Factoring](#factoring). The tool's pages are
the one place to look at the pictures: there is no static page of them (owner, 2026-11-06).

## Why

Two decisions are made by fixed thresholds, and neither threshold holds for every picture:

- **Did the PNG change?** `withinNoise` (`scripts/lib/shot-change.mjs`): no channel more than
  16 levels off, and no more than 0.5% of the pixels off at all. A channel's difference is as
  seen over black and over white (`pixelDiff`), so a cut-out's shadow edge, its colour at
  alpha 1 being rounding, is 1 level off, not 255 (on the BETA 1010 retake that takes
  Properties_ColourPicker's pixels beyond noise from about 3,900 to 33). A pixel more than 16
  levels off fails it at once, so a real change ("Foo" to "Bar") is always caught, at any size.
  It fails the other way: one caret or clock pixel in a large window makes it "changed". So the
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
- **The decision rules keep their parameters** (levels, shares, rectangles left out). The
  region measure of [the queue](#the-queue) chooses what is shown first and decides nothing;
  adding it to the rules is a later enhancement.
- **The queue shows pictures by regions, fringe against block**, not by a band
  of percentages round the bar, which has the size dependence of the bar itself.
- **A capture that differs from one already decided goes back to the queue**, showing the
  last decision, instead of having that decision applied to it.
- **The queue is persistent**, with backward and forward navigation; an overview page shows
  every picture at once, and opens a detail page for any of them; the detail page moves backward and forward through the queue.
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
  share is in modules both call. See [Factoring](#factoring).
- **The server listens on a fixed port, 4180, with `--port`** to choose another (owner,
  2026-10-31), so that a page's and a picture's address can be kept; not a port from `tbbroker`.
- **The overview also lists the pictures under `docs/` that differ from the baseline but that
  no run of the session wrote** (a retake from a terminal, an edit), as a group of their own
  (owner, 2026-10-31): HEAD's picture against the file, with no verdict to override. **By file
  and by content** (owner, 2026-11-09): a picture's PNG or SVG that differs from the
  baseline and that no layer of the session wrote is changed outside the runs, *whether a run
  reported the picture or not* (a run that found a terminal's SVG and left it as it was does not
  make it the session's), and an SVG that changed with its PNG unchanged is listed too. Each has
  **Keep it as it is** (recorded against its bytes) and **Put back the baseline's**, and the commit
  waits until each is one or the other: see [One way to take pictures](#one-way-to-take-pictures).
- **When HEAD moves under an open session** (a commit made outside the tool), the session keeps
  its baseline and the overview warns; and the overview offers to **move the session to the new
  HEAD on demand** (owner, 2026-10-31). Moving makes the new HEAD the baseline (and its build
  the baseline's build); a verdict judged against the old baseline goes back to the queue, since
  the picture it was judged against has changed.

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
3. **Not taken yet** (owner, 2026-11-22: a shot written and not yet taken showed nowhere on the
   overview): the pictures the table of shots names with no file under docs, that no run of the
   session reported. The table is the one the page of every picture reads (`shoot_docs.mjs
   --list`, kept for `SHOTS_FRESH`); the model takes the table read last, starts a read that is
   due in the background, and tells the pages when the list changes (`untaken()` in
   `shot-server.mjs`). A card opens the plain page, with **Retake this picture**; a run's
   verdict takes the picture into the group it gives, a failure's included.
4. **Changed**, most changed first.
5. **Only noise**: the capture was within noise of `HEAD`'s and the file stays.
6. **Unchanged**, collapsed.
7. **Program windows: PNG only** (owner, 2026-11-01): a running program's window, which
   Windows draws, so there is no page to draw an SVG from (svgVerdict's `window`, `WINDOW_WHY`).
   One whose PNG changed or was added stays in that group; the *No SVG* filter leaves them out,
   and their page offers no replay.
8. **Added**, **deleted**.
9. **Needs a retake** (owner, 2026-11-01): pictures a replay could not draw again from their
   bundles (`retake` events), whatever their PNG's verdict, until a later run gives them one. A
   replay counts them as done in its progress and says how many beside the count.
10. **Failed**.

A row of counts at the top, filters (all, needs a look, overridden, no SVG), and **Resume at
*n* of *m*** to go back to where the queue was left.

### All pictures

Every picture `shoot_docs.mjs` takes, as the working tree has it, whatever any session did
(owner, 2026-11-01: after a commit the overview is empty, and the pictures with no SVG are worth
seeing). The pictures are the table's (`shoot_docs.mjs --list`, which starts no IDE; a shot of a
program's window says so in the table, `window: true`, and a shot whose take and table disagree
fails), each dark picture and the light one when it is under docs. A card shows the PNG, whether
it has an SVG, the manifest's build and its allowances, and for a picture with no SVG why: the
table's for a window, else the newest SVG verdict of this session or of an archived one that says
(owner: no drawing; `noSvgReason`, which takes "refused", "accepted" but not written,
and "none drawn", and passes over a verdict of an SVG left with its PNG and not judged), else
"unknown". Groups: no SVG of a program's window, no SVG, not under docs, an allowance or a
decision, with an SVG (collapsed). The No SVG group has **Judge their SVGs again from their
bundles**, a replay with `--recheck` of those with a bundle, on demand. A card opens the
picture's page of verdicts when the session has one, else a plain page: the baseline's picture,
the file, its SVG, why it has none, and Retake and Replay, previous and next in this page's order.

**The images no shot takes** (owner, 2026-11-06) are on the page too, in a group *No automated
capture*, before the collapsed *With an SVG*: every image under docs (`imagesUnder`) that is not a
shot's PNG, SVG or light picture. They are there to look at: a card has no selection, and the plain
page has no run, no chip of a build, no size, and shows the file at its own size (a shot is 2x and
is shown at half), the baseline's copy only when it differs. Left out (`NOT_LISTED`, owner): what a
script makes, a diagram's SVG beside its DOT, the build's Gantt chart and a video's poster frame,
and the favicon. The file routes and the plain page take any image type; a review's actions still
take only a PNG or an SVG (`isDocsPath`).

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
  Changing a parameter applies it and judges the picture again at once, and the page shows the
  verdict it gives; there is no preview of an allowance's verdict without applying it.
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
  nothing. Accepting a run's SVG on the SVG row puts its bundle there. A picture's page fetches
  itself again on an update that says the runs changed, not only on one that names it, since
  its run buttons wait for a run to end.
- **Back to the tool's verdicts**.

### Runs

The session's runs, newest first, each with its kind, its options, the command line it is the
same as (so it can be run again from a terminal), and while it runs a progress bar per job
(`help`, `no-project`, ...) and **Stop**. A run that has ended has **Remove**, which undoes it
as if it had not run (owner): each picture it held is put back as its layer found it, the
later runs' layers on that picture are applied again from there, judged anew (the applier's
`undo`, dark pictures before light ones), and its record moves to the session's `removed`, so
that its number is never given again, and its folder is deleted. Forgetting a run while
leaving its writes under `docs/` is not offered: a picture only it changed would then be
changed outside the runs, which the commit leaves out. A run that is running is stopped
first; while a clean-up runs or a commit is under way, Remove waits. A picture that cannot be
put back keeps the run, and Remove again tries again. A clean-up keeps no layers, so removing
one leaves what it put back. A retake that has ended with pictures it failed on (a failure
reported, a job that failed before reaching them, or a staged verdict that says so) has
**Retake what failed (N)**: a new retake of exactly those pictures, with the run's `--svg`
and its IDE (by its build among the installs found; disabled when that install is gone). A run
that named no IDE (`shot_review.mjs --retake` without `--ide`) is retaken on the build its run
event records, the newest install when it ran, not the newest now.
Continuing the failed run itself is not offered (owner): its layers would come after a later
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
it, taken against it; SVGs written (by allowance among them) and removed; pictures kept from
outside the runs; the manifest. Other changes in the working tree are listed as left out. **A
picture changed outside the runs that no review has kept or put back holds the commit back**
(owner, 2026-11-09; `undecidedRefusal`): the page lists it, and Commit is disabled with the reason,
so that once the tool has committed, no picture under `docs/` differs from HEAD. The message is one line by default
("Screenshots retaken on BETA 1501: 39 pictures changed, 3 kept at HEAD by review; 35 SVGs
written (2 by allowance), 1 removed"), can be edited, and **Back to the default message** is
enabled once it differs. **Commit** commits the session's own files and nothing else, named
one by one: added files are added first, a removed SVG is committed as a deletion. Never
`--no-verify`, and no trailers (WIP.md, Don'ts). A commit closes the session: the new commit
is the next session's baseline, and the old session is archived and can still be opened.

**A clean-up's pictures are not the session's to commit**: a clean-up puts a picture back as
the baseline has it, and the session is committed only while its baseline is HEAD, so what it
put back is as HEAD has it and git reports nothing. With HEAD moved under the session,
committing them would undo the pictures of the commit made outside it. A PNG kept at HEAD by a
review has nothing to commit either, but its decision is in the manifest, which is, and the
message counts it.

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
cores of 37 to 96 px surviving at level 1, none at 2). An SVG's regions count the pixels at its
bar's levels. A picture is in **Needs a look** when:

- **PNG**: the tool took the new capture, but nothing survives (most likely noise: a caret, a
  clock, a fringe), or what survives is small (a block or two the size of a word: a real
  change small enough to miss); or the tool kept the old picture as within noise (`noise`, or
  `restored` to `HEAD`'s), but something survives at `FAINT_LEVEL` (owner, 2026-10-31;
  `pngLook`'s `faint`): a faint block, a tint over less than 0.5% of the picture, which *keep
  old → take new* is for. Its regions are those of the capture against the picture it was found
  within noise of (`reviewPicture`).
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
not of the decisions. The constants were chosen from the pictures: each stage drawn over 8 SVGs
and 5 retaken PNGs (the changed pixels, what the closing adds, the core, the boxes), and the
counts over every SVG and the PNGs of the BETA 1010 and 1033 retakes.

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
in a fixed order (pictures by path), so its diffs are small; `save` writes the line endings
the file had (LF for a new one), so a CRLF checkout does not show it modified. An SVG's bar is
at any level from 1 to 255, and `svg.ignore` takes rectangles as `png.ignore` does, both
counted on the strength map. The manifest is read and written only for the default `--out`:
its paths are under `docs/`. A light picture decided "new" is kept even with the dark one's
pixels; one decided "old" is still found to be the dark one by the rule.

## Sessions

A session is a folder in the gitignored `.shot-review/` (beside `.svgshot-bundles/`; it can
hold the user name): `session/session.json` (the baseline commit and its build, the runs, every
decision with its time, the queue's place), `session/lock` (the process id of the tool that
holds it), and `session/runs/<n>/` per run: `stage/` (the run's `--stage`), `events.jsonl`
(each event as it arrived, for what the stage does not hold: failures, pictures not taken,
the jobs) and `log.txt` (its lines for a person). Closing the tool loses nothing; opening it
again opens the session, a run that had not ended marked interrupted. A commit archives it
into `archive/<id>/`.

**Every checkout of the clone shares one `.shot-review/`, the main checkout's** (owner,
2026-11-22). A worktree still has a session of its own, since a session's runs write under
that checkout's `docs/`, but it lives in `.shot-review/checkouts/<name>/` (`<name>` the
worktree's folder under `.git/worktrees/`), and the archive and the ledger are the shared
folder's. `reviewRoots` in `lib/shot-session.mjs` reads it from the checkout's `.git`.
**Why:** the worktree workflow of WIP.md removes the worktree once `staging` has its commits.
While each worktree kept its `.shot-review/` inside itself, removing it deleted the session, its
runs, its verdicts and its archive. Between 2026-11-14 and 2026-11-19, 268 picture files reached
`staging` that way, and the main checkout's session, opened on 2026-11-11, could only list them as
changed outside its runs, with nothing to show of their review.

## The ledger

`.shot-review/committed.jsonl` holds a line for each commit the tool makes, written before git
commits (`recordPictures`, `lib/shot-ledger.mjs`): each picture file of the commit with the git
blob it will have, or null for one it removes. A blob survives the rebase the worktree workflow
does before its fast-forward; a commit hash does not.

**`staging` moves only to commits whose screenshots are on record** (owner, 2026-11-22).
`.githooks/reference-transaction` runs `node scripts/shot_ledger.mjs --hook` whenever a
transaction moves `refs/heads/staging`, in the `prepared` state, the one in which a hook can
still refuse. `unrecordedPictures` takes the commits the new tip reaches and neither the old tip
nor a remote-tracking ref does, keeps the newest state of each screenshot file (a PNG the
manifest names at either end, and its SVGs), and lists those whose blob no line holds. The hook
covers a fast-forward, a reset, a rebase that ends on `staging` and a commit made on it.

- **Published commits are left out.** A commit a remote-tracking ref holds is not this clone's
  to review. A branch pushed before it is merged would therefore pass; pushing is the owner's
  alone (WIP.md, Don'ts).
- **A picture outside the manifest is not checked.** The vendored attachments and the hand-made
  images under `docs/` are no screenshots of the tool.
- **`SHOT_LEDGER_ALLOW=1` and `shot_ledger.mjs record` are the owner's**, never a session's: the
  first lets one move through, the second puts a range on record by hand. A session that meets
  the refusal takes or reviews the pictures through the review tool in its checkout and commits
  them from it.
- **A worktree made before the hook has no `scripts/shot_ledger.mjs`**, and the hook, which git
  runs from the top of whichever working tree the command runs in, lets it through. Staging is
  fast-forwarded in the main checkout, which has the script.

## Runs

**The tool runs the command-line tools as child processes**, never their code in its own
process: `shoot_docs.mjs` is a script with effects at the top level (the registry tidy,
`exitOnCrash`, exit codes), and one code path for both is the point. Two options of
`shoot_docs.mjs` and `replay.mjs` serve it:

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
  at most, and a stream holds one while its page is open, so a stream for each page would leave
  a seventh page, or its pictures, waiting for minutes. A shared worker cannot do it: in the
  desktop app's browser pane (Electron 44) a shared worker's `fetch` and `EventSource` never
  reach the server. A picture is answered with an ETag, its bytes' hash, and with 304 when
  the browser has those bytes.

**Only a page that is shown holds the event stream** (owner, 2026-11-11): a page takes the
lock only while `document.visibilityState` is "visible", gives it up when hidden, and fetches
itself once when shown again; a stream the browser has closed is opened again 2 s later, and
one that comes back after the server was away fetches every page. A page holding the lock in a
tab Chrome has frozen passes nothing on, and every other page, a reloaded one too, waits for
the lock behind it.

**Each page says whether it follows the runs** (owner, 2026-11-11), so that a stream that stopped
is not taken for the tool's fault. The server sends a `ping` event every 5 s (`createSseChannel`'s
`ping` in `lib/sse.mjs`, off for the builder's live reload), which the page holding the stream
passes on with the updates (`{kind: "update" | "ping" | "away"}` over the BroadcastChannel). A chip
at the foot of every page (`#live`) says **live**; **the server does not answer: connecting
again** while the stream is down; **the server has sent nothing for N s: it may be busy** on the
page that holds a stream that stays open and silent; and, on a shown page that has heard nothing for
15 s while another holds the stream, **no updates for N s: another tab of this tool held the
connection to the server and passed nothing on (a tab the browser froze?); this page has taken it
over**: it takes the lock with `steal: true`, the page it took it from closes its stream when it
runs again, and the chip says so for 20 s before **live**.

**Stop** is a line on the child's stdin: the child takes no further shot, finishes the one in
hand, ends its IDEs and puts the registry back, as at its normal end. Killing it would skip
that, so the tool offers a kill only after a stop has not ended it, with that warning.

**A run is never `detached` on Windows.** There `detached: true` is `DETACHED_PROCESS`: the run
has no console at all, and every console program it starts without `windowsHide` (`git` in
`shot-revision.mjs`, PowerShell, `reg`) opens a console window on the user's desktop.
`windowsHide` with no stdio inherited, as the lane runner spawns its children, is
`CREATE_NO_WINDOW`: a console of its own with no window, which those programs inherit and which
the terminal's Ctrl+C does not reach. `startRun` spawns that way (detached elsewhere only), and
the `git` calls of `shot-revision.mjs` pass `windowsHide` too (owner).

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
command-line tools, and reads and writes through modules they call too:

| What | Where it is |
|---|---|
| The noise rule | `withinNoise(A, B, {levels, share, rects})`, defaulting to `NOISE_LEVELS` and `NOISE_SHARE`, `scripts/lib/shot-change.mjs`; `pngsNear(a, b, rule)` over files, `shoot_docs.mjs`'s `nearly` |
| A PNG's verdict | `decidePicture({png, theme, dark, revision, disk, near, entry})` in `scripts/lib/shot-policy.mjs`, with `SIZE_SLACK`: pictureFate's states plus `too-far` and `dark` (a light picture with the dark one's pixels), and `by` ("decision" or "rule") and `earlier` (a decision about other bytes). `near(a, b, rule)` takes `pngRule(entry)`; `cleanupResets` is `--cleanup`'s verdict, with the path passed through `planCleanup` |
| An SVG's verdict | `decideSvg(strength, {entry, svg, png})` in `shot-policy.mjs`, with `SVG_FAITHFUL` and `svgRule(entry)` (`{levels, share, rects}`): `{faithful, by, share, earlier}`, `share` counted on the strength map at the bar's levels with its rectangles left out, `earlier` a review's decision about another SVG or PNG (`earlierSvgDecision`). `judgeSvg(browser, svg, png, stats, entry)` asks it |
| The SVG with its PNG | `svgFollowsPng({written, svgOnDisk})` in `shot-policy.mjs`, which `shoot_docs.mjs`'s `keepSvg` and the applier both ask. With `--stage`, `keepSvg` judges and stages the SVG of a picture whose PNG is not written too ("unchanged", `why` its reason, no look), and of one restored or the dark one's, so that a review that takes the capture can write the SVG as judged; the lines printed are the same |
| How far an SVG is off | `diffSvg` returns `strength`, `{width, height, data}`, a byte per device pixel of the clip (the distance with the one-pixel shift allowed, in whole levels, so a level's count is the same as from the distance); `stats.pct8`, `pct32` and `pct96` are `shareOff` of it |
| Regions | `scripts/lib/shot-change.mjs`: `strengthOf(A, B)` (two captures' map, withinNoise's distance), `shareOff(strength, {level, rects})`, `changeRegions(strength, {level, close, erode, rects})` (`[{x0, y0, x1, y1, pixels, core}]`, most core first) and `regionMasks`, its three masks, for drawing them |
| The queue's rules | `scripts/lib/shot-queue.mjs`: `pngRegions(strength, pngRule, level)`, `svgRegions(strength, entry)`, `surviving`, `keptAsNoise(state)`, `pngLook(verdict, regions)` and `svgLook(verdict, regions)`, each `{why, text}` or null (`why` for a PNG: `earlier`, `noise`, `small`, `faint`); `reviewPicture(verdict, png, reference, entry)` (`{strength, regions, look}`, measured against the picture `verdict.against` names: decidePicture and pictureFate return `against`, "revision", "disk", "dark" or null) and `reviewSvg(verdict, strength, entry)`; the constants `QUEUE_CLOSE`, `QUEUE_ERODE`, `SURVIVES`, `WORD_CORE`, `WORD_BLOCKS`, `FAINT_LEVEL` |
| A run's stage and events | `scripts/lib/shot-stage.mjs`: `stageFolders(dir)` (`pictures`, `bundles`, `diffs`, `maps`, `verdicts`), `stagedFiles(dir, out)`, `stageRefusal(dir, docsRoots)` (outputRefusal, and a stage must be new or empty), `stageCapture`, `stageSvg`, `writeStrength` / `readStrength` (8 bytes of size, then the map deflated), `writeVerdict(dir, out, part, value)` / `readVerdicts(dir)`, and the verdict shapes `pngVerdict` and `svgVerdict`, which the `picture` and `svg` events carry too (at most `STAGED_REGIONS`, 64, regions, and `regionCount`). `shoot_docs.mjs` and `replay.mjs` write nothing else with `--stage`: `applyPicture`, `applySvg`, `writeSvg`, `dropPicture` and `restorePictures` take `{dryRun}`, and say what would be done. Events: `run`, `job` (`started`, `done`, `failed`), `picture`, `svg`, `failed`, `skipped`, `retake` (replay), `stopping`, `summary`. Stop: `STOP_LINE`, `onStop(stream, fn)`, `sendStop(child)` in `record-lines.mjs`; `runShards(env, jobs, {signal})` passes it to each child, `inBrowser(items, fn, {stopped})` returns the items not started |
| The manifest | `scripts/lib/shot-manifest.mjs`: `MANIFEST`, `openManifest(file)` (`entry`, `setBuild`, `clearBuild`, `setPart`, `save`, `text`), `parseManifest`, `manifestText`, `pngDecision`, `earlierPngDecision`, `svgDecision`, `hashOf`. `setPart(out, part, key, value)` sets a decision or an allowance, or removes it with `undefined`, checked as `parseManifest` checks an entry. `shoot_docs.mjs` passes each picture's rectangles to `capture` as `c.shot.ignore`, left out as its unsteady regions are, and records `build` (`buildNumber(ide)`) in `keep` and `dropLight` |
| Writing a verdict | `scripts/lib/shot-apply.mjs`: `applyPicture(outRoot, out, decision, revision, {svg, bundlesRoot})` (for "dark", with `svg`, and for "once", the light file's SVG and bundle go too, through `dropPicture`), `applySvg(outRoot, svgOut, svg or null)`, `restorePictures(outRoot, revision, outs, {dryRun})` (the PNGs and their SVGs, the SVGs by one `git restore`; `--cleanup` and a `restored` picture both use it), `dropPicture(outRoot, out, bundlesRoot)`, `writeSvg`, `svgOf`. What stays in `shoot_docs.mjs`'s `keep` and `keepSvg`: the counts, the lines it prints, the `--diffs` pictures, the bundle written, the user-name check, and the rule that an SVG stays as it is when its PNG was not written |
| A bundle into the cache | `copyBundle(fromRoot, toRoot, out, png)` in `svgshot/bundle.mjs`, naming the PNG the file holds once a review has decided (the run named the one it expected); `BUNDLE_CACHE` there, the one default for `shoot_docs.mjs`, `replay.mjs` and the tool |
| The git listing | `changedPictures`, `parseNameStatus`, `parseUntracked` in `scripts/lib/shot-revision.mjs` |
| A child's report | `scripts/lib/record-lines.mjs`: `recordLine`, `writeRecord`, `parseRecord`, `readRecords(stream, kinds, {onRecord, onLine})`; `runShards` reads `svgshot-result` records with it, and `--events` writes `shot-event` records the same way (a shard's pass through its parent as lines) |
| The pages' HTML | the pieces in `scripts/lib/shot-views.mjs`: `pageHtml({generator, title, intro, summary, contents, body, head})`, `chipHtml`, `allowancesOf`, `esc`, `anchor`, `sizeText`; `outputRefusal`, which the stage uses, in `shot-revision.mjs`; `redraw.mjs` keeps drawing and the shards |
| Server-sent events | `createSseChannel()` in `lib/sse.mjs`: `handle(req, res)`, `send(event, data)`, `close()`; `builder/serve.mjs` uses one |
| The installs | `listIdes()` in `scripts/lib/tb-install.mjs`, newest first, `[{build, exe}]`, each at or above `MIN_BUILD`; `findIde` uses it |
| Commit | `workingChanges(root)` (`{top, changes}`, `parseStatus` of `git status --porcelain=v1 -z --no-renames --untracked-files=all`) and `commitPaths(root, {paths, added, message})` in `shot-revision.mjs`: `git add` of the paths git does not track, then `git commit --only` of every path named, literal pathspecs on stdin, hooks run; git's own words in the Error when it refuses |
| A PNG's size | `pngSize(bytes)` in `scripts/lib/png.mjs`: `[width, height]` from the header, null for bytes without the PNG signature and IHDR; the one reader under `scripts/` (`shot-policy.mjs`'s verdicts keep `{w, h}`, through `sizeOf`). `builder/theme-pictures.mjs` and `builder/vendor-assets.mjs` keep their own: `builder/` may import nothing under `scripts/` but `impexp.mjs` (`biome.jsonc`) |

A change to a shared module is made with no change in behaviour first, in a commit of its own,
before the tool uses it, and checked as [Checking a move](#checking-a-move) says.

### Checking a move

`shoot_docs.mjs` cannot run in a gate. A change that touches what it decides or writes is
checked by its unit tests in `test/svgshot.test.mjs` (pure functions) and by these runs, before
the change and after, in a worktree (they write under `docs/`; `git checkout -- docs` after
each). Every state line must be the same, bytes and percentages aside. The setups they use
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

The same runs with `--stage` must print the same lines, write nothing under `docs/` (`git
status` clean) and stage verdicts that say the same.

Read the whole log, not lines filtered out of it: an error raised in the page arrives with
the page's own stack on the lines after `FAILED`, and its line and column inside the evaluated
script name the helper that raised it. A tab the IDE is still loading or saving shows a spinner
in place of its close icon (the button's class is `progressSpinnerIcon`, `ide/main.js`), so
`closeTabs` waits for the icon with a MutationObserver (`tabCloseIcon`).

## Where the code is

The tool's own parts, besides the shared modules under [Factoring](#factoring).

**The tool, its session and its pages:**

| Part | Where it is |
|---|---|
| The tool | `scripts/shot_review.mjs [--port N] [--retake <regex> \| --replay <regex>] [--jobs N] [--ide <exe>]`: takes the session's lock, makes the session with HEAD as its baseline (`build` the newest the manifest at HEAD records) when there is none, serves it on `127.0.0.1:4180`, and starts a run when asked (`runOf`: a retake is `shoot_docs.mjs --svg --only`). Ctrl+C stops the runs by their stdin and waits, a second Ctrl+C kills them. Its command-line cases are in `scripts/lib/cli-cases.mjs` |
| The session | `scripts/lib/shot-session.mjs`: `REVIEW_ROOT`, `RUN_TOOLS`, `sessionPaths`, `runPaths`, `openSession(root, baseline)` (`addRun`, `endRun`, `setPlace`, `run`), `acquireLock(file)`, `parseSession`, `commandOf(run)` (the command line without `--stage` and `--events`), `newestBuild`, `appendEvent`, `readEvents` |
| A run | `startRun(session, {tool, args}, {onEvent, onLine, onExit})` in `scripts/lib/shot-runs.mjs`: the tool spawned from the repository's root, hidden, on a console of its own that the Ctrl+C closing the review tool does not reach (so that the run puts the registry back; never `detached` on Windows: the section Runs, above), its events appended to `events.jsonl` and its other lines, stdout and stderr, to `log.txt`; `{run, stop, kill, exited}` |
| The model | `scripts/lib/shot-review.mjs`, pure: `runFacts(tool, events)` (listed, jobs and `jobOf`, failed, skipped, retakes, stopping, summary), `verdictOfEvent`, `reviewPictures(runs, {exists, measure})` (each part from the newest run that gave one, a newer PNG verdict dropping an older SVG; `progress` while a live run owes a part; a picture whose job failed before reaching it failed with the job's error), `groupOf`, `GROUPS`, `FILTERS`, `filterPictures`, `hasSvg`, `isOverridden`, `neighbours` |
| The pages | `scripts/lib/shot-pages.mjs`: `overviewHtml`, `detailHtml`, `chipsOf`, `loupesHtml` (a region cropped by CSS from the whole picture, enlarged up to 4 times, at most 360 by 240 CSS px), `hrefs` (every address the server answers); built on `pageHtml` (which takes `head`, and leaves out the table or the contents when it is given none) and `chipHtml` in `shot-views.mjs`. A page fetches itself again 400 ms after an `update` event that names a picture it shows, and once in 400 ms at most while they keep coming, one fetch at a time, and replaces its body (owner, 2026-11-01: a fetch put off by each update never happens while a replay reports several pictures a second); the detail page's comparison mode is kept in `sessionStorage` |
| A picture's allowances as text | `allowancesOf(entry)` in `shot-views.mjs`, `{png, svg}`: the rule each allowance makes, with the defaults filled in from `pngRule` and `svgRule`, or null. The overview's cards and a picture's page show each as a chip, `PNG: allowance` and `SVG: allowance`, the rule as its tooltip (`chipsOf(p, entry)`; `overviewHtml` takes `entry(out)` from the server) |
| The server | `createReviewServer({session, revision, manifest, docsRoot, headNow, newestIde, onLine, command})` in `scripts/lib/shot-server.mjs`: the pages, `/events`, `/api/state`, `/log/<n>`, the files (`/file/head`, `/file/docs`, `/file/run/<n>`, `/file/ref/<n>`, the picture the capture was judged against) and the difference maps drawn from a run's strength maps (`/map/<n>/png|svg/<out>`, `strengthPicture` in `shot-change.mjs`, which colours as `changeMap` does, the last 16 kept). It answers only a request whose Host is the loopback address at its port; a run's verdicts are read back from `readVerdicts` and its other events from `readEvents` when the session is opened again. The Changed group is ordered by the share of a PNG's pixels beyond its noise levels, from its strength map, else the SVG's share off its PNG |
| The git reads | `scripts/lib/shot-git-worker.mjs`: `startGitReader({docsDir, repoRoot})` runs `head()` and `changed(baseline)`, the same sync code, in a worker thread, and answers with promises; `baselineAt(repoRoot, commit)` is shared with `shot_review.mjs`. **The pages never wait on git** (owner, 2026-11-11): read on the server's only thread (12 git processes, 1 to 2 s), the reads held a run's events in its pipe behind the pages |
| The value kept | `kept(read, fallback, onChange)` in `shot-server.mjs`: serves the last value at once and reads again once it is a second old; when a read's promise gives another value, every page is told to fetch itself (`{outs: [], runs: true}`). `again()`: the next call reads again, and a read under way is not kept. A `head` or `changed` that answers at once (the tests') is read at once. What still takes the server's thread is each verdict's arrival, which keeps what the picture held (`holdPicture`): its bundle is recompressed with brotli at quality 9, about 0.1 s a picture |

**Verdicts, decisions and the baseline:**

| Part | Where it is |
|---|---|
| Applying the verdicts | `createApplier({session, docsRoot, bundlesRoot, revision(), manifest()})` in `scripts/lib/shot-verdicts.mjs`: `arrive(n, out, part)` applies a part of a run's verdict as its event arrives, as the run decided it (the server queues each arrival and applies one per turn of its event loop, so that it answers between them: a replay's arrivals, each 0.1 s or more for its bundle copied into the cache, would otherwise hold every request up for as long as the replay runs, owner, 2026-11-01; a run that has exited stays live until its arrivals are applied, and `close()` applies what is left); `pending()` applies what was reported and not applied (the tool opened again); `rejudge(out, from)` applies every layer of a picture again from the run `from` on, judged anew with the manifest as it is and against the baseline; `reviewed(n, out)`, `heldPng(n, out)`, `errors`. Its header has the rules. What it applied is the stage's `review/` (`readReviewed`, `writeReviewed`, `reviewedFiles` in `shot-stage.mjs`), which the server shows in place of the run's own verdicts; a verdict judged again whose reference changed has its strength map measured again into `review/maps/` |
| What a picture held | before a run's verdict on a picture is applied, `holdPicture(dir, outRoot, out, bundlesRoot, build)` keeps its PNG, SVG, bundle and manifest build in `runs/<n>/held/`; `unholdPicture` puts them back (each removed that was not there) and returns the build; `heldOf`. Putting a picture back as its first layer found it undoes that layer and every later one, which is how a decision is applied and a run removed (`heldPictures(dir)` lists what a run held) |
| The actions | POSTs of JSON to `/api/picture/<out>` (`hrefs.act`), `{action}`: `png` (`keep` "old", "new" or null), `svg` (`accept` true, false or null), `allowance` (`png` and `svg`, each `{levels, share, ignore}`, empty for the default), `rule` (the picture's decisions removed: "Back to the tool's verdicts"), `judge`; and `/api/baseline` (`hrefs.moveBaseline`). Each changes the manifest, then `rejudge`s from the run the verdict is about. A POST is refused unless its Origin is the server's own and its body JSON, since a page of any origin can send a form to the loopback address. The detail page's PNG and SVG rows have the choices, an Allowances form (a rectangle is drawn by dragging on the picture, in device pixels) and Judge again; the page's script sends them and says "applying..." or the error beside the buttons |
| Changed outside the runs | the server's `changed()` (`changedPictures(..., {svgs: true})` against the baseline: each picture whose PNG or SVG differs, `{out, status, parts}`, an SVG counted when its PNG is under docs or among the changed, `pictureChanges`); `reviewPictures(runs, {outside, outsideKept})` marks each file no layer wrote (`wroteOf`: a PNG written, put back or removed takes its SVG with it; an SVG written or removed) as `outsideParts`, whether a run reported the picture or not, in the group `outside`, between Only noise and Unchanged; `outsideHtml` (no run reported it) compares HEAD's picture with the file when its PNG changed, its map `/map/outside/<out>` drawn by `changeMap`, and `detailHtml` takes `outside` for one a run reported; both show `outsideSectionHtml`, which compares the SVG at HEAD with the file's. Every comparison of a page is `compareHtml`'s, side by side, a swipe, blinking and a map (owner, 2026-11-09: without them a change is almost impossible to see), each driven by the page's script on its own; an SVG's map is drawn by the page (`canvas.diffmap`, `drawDiff`: both SVGs drawn at the picture's device size, coloured as `changeMap` colours), since the server cannot draw an SVG. `outsideSectionHtml` has **Keep it as it is** (`{action: "keep-outside"}`: `session.keepOutside(out, {png, svg})`, the files' hashes, `"absent"` for one removed, in `session.json`'s `outside`; it holds while the files hold those bytes, the server's `outsideKept`) and **Put back the baseline's** (`{action: "put-back"}`: the applier's `putBack(out, parts)`, which writes the baseline's file (an SVG through `git restore`) or removes it, gives the first layer on the picture the baseline's file as what it found (`setHeldPart`), and applies every layer again from there) |
| Moving to HEAD | `session.moveBaseline(baseline)` (`moved: {at, from}`); the server's `head()` and `revisionAt(hash)`; HEAD is read again at most once a second, so the notice follows a commit made while the tool is open. Each verdict as applied records the baseline it was judged against (`baseline`, a run's `--against` on arrival), and `reviewPictures(runs, {baseline, stale})` gives one judged against the revision of another baseline the look `baseline` until it is judged again, when `stale(out, hash)` says the picture differs between that commit and the baseline: the server's `changedBetween(a, b)`, one `git diff --name-only` per pair of commits, kept (judged by the baseline alone, a move to a commit that changed only code left 543 of 559 verdicts needing a look). A move changes no file, so it is undone by moving back: `moved` records `fromHash`, and the overview's notice offers **Move back to `<from>`** (`{action: "back"}`, the server's `baselineOf(rev)`) |
| A retake's revision | `shot_review.mjs --retake` passes `--against <baseline>`, so that a run judges against the session's baseline whatever HEAD is (`againstOf(run)`) |

**Runs:**

| Part | Where it is |
|---|---|
| A run from a request | `runOf({kind, only, pictures, svg, jobs, ide, recheck, dryRun}, baseline)` in `scripts/lib/shot-runs.mjs`, `{tool, args}`, for the runs page and `shot_review.mjs --retake / --replay` alike: `kind` "retake", "replay" or "cleanup" (`RUN_KINDS`), a retake and a clean-up `--against` the baseline, `pictures` made a pattern that matches each alone (`onlyOf`), and every option the kind does not take refused; `kindOf(run)` |
| A clean-up run | tool `cleanup` in `RUN_TOOLS` (`shoot_docs.mjs`, its args naming `--cleanup`), not in `STAGED_TOOLS`, so `runArgs(tool, args, stage)` gives it no `--stage` and no `--events`: it has only its log. `optionOf(run, option)` in `shot-session.mjs` (`againstOf` is one) |
| One run at a time | the server's `start` refuses while a run is live: a picture's layers are applied in the runs' order, which two runs at once would not keep. While a clean-up runs, a review's actions and the move to HEAD are refused (`refuseWhileCleaning`); when it ends, the pictures changed outside the runs are read again at once |
| Stop and kill | POST `/api/run/<n>` (`hrefs.runAct`), `{action}`: `stop` (not for a clean-up, which ends in seconds), and `kill` only once a stop has been asked for (`stopAsked`), behind the page's confirmation. Start is POST `/api/runs` (`hrefs.startRun`), the IDE named by its build among the installs (`ides`, `listIdes()`) |
| The runs page | `/runs`, `runsHtml` in `shot-pages.mjs`: a form for each kind (a retake's IDE, newest first, marked when newer than the baseline's build; its pictures, `--svg` and jobs; a replay's `--recheck`; a clean-up's dry run first, then **Put them back** on the newest one), and each run newest first with its command line, a progress bar for each job (`runRow`'s `jobs`), Stop or Kill, and its log: a clean-up's whole, the last 8 lines of one that runs. A form keeps its values when the page fetches itself again (`data-keep`) |
| Pictures selected | a checkbox on each card of the overview, kept in the browser (`localStorage`, `shot-review-selected`), and one on each group's heading (owner, 2026-11-01) that selects every picture the group shows or none, mixed (`indeterminate`) while some are, so that a click on it selects them all; the runs page's forms take the selection in place of a pattern, and a bar on both pages says how many and clears it. A picture's page has **Retake this picture** and **Replay its SVG**, and a picture changed outside the runs **Retake this picture**, each greyed while a run is live |

**The commit:**

| Part | Where it is |
|---|---|
| What a commit takes | `commitPlan({pictures, changes, docsPrefix, manifestPath, entry})` in `shot-review.mjs`, pure: of the session's own files (the PNG and the SVG of each picture a run reported, and the manifest), those git reports changed, each with what the session did to it; the working tree's other changes `leftOut`; the counts and the newest `build` of a PNG committed. `commitMessage(plan)` is the default message, one line, the example under [Commit](#commit) word for word. An SVG is "by allowance" when its picture's entry changes its bar and its `stats.pct96` is not below `SVG_FAITHFUL`: the default bar would have refused it. A PNG counts as kept at HEAD only when its picture's decision is "old": a "new" decision about a capture that is the file's own bytes (taken in an earlier session) is not one |
| The commit | the server's `commit(body)`: refused while a run runs, while HEAD is not the baseline (the refusal names HEAD, and the session is to be moved to it first), when `body.files` is not the list the page was drawn with, or for an empty message; then `commitPaths`, then `onCommit`, whose answer the server serves from then on (`session`, `revision`, a new applier, the runs read again). POST `/api/commit` (`hrefs.commit`), `{message, files}` |
| git as a child process | `commitPaths` in `shot-revision.mjs` is `async` (owner, 2026-11-01: the commit runs without blocking): `gitSaying` spawns git with its stdio piped and its window hidden, so it has a console of its own, which the tool's Ctrl+C does not reach. It finds the repository's root with `git rev-parse --show-toplevel`, not a second `git status` |
| The commit under way | the server's `committing` ({message, at, plan, done}): `commit(body)` checks what it checks at once, then sets it, sends an update and returns the promise of the commit; the POST answers when it has ended. Meanwhile the server answers every request: the commit page is drawn from `committing.plan` (no `git status`) with "committing..." in its status, the message read-only and Commit disabled; the overview and the runs page carry a notice (`committingNotice` in `shot-pages.mjs`); `busyRun()` is `{commit: true, message, at}`, so every run button is greyed with its reason; `refuseWhileCommitting` refuses a review's action, the move to HEAD, a run and a second commit; `headNow()` is null, since HEAD moves to the commit before the session is closed. Two waits are left on the server's thread, about 0.3 s before git starts (the checks: `git status` and the plan) and 0.4 s at the end (`onCommit`: the session archived, the next one opened); making those asynchronous too is not worth it. A commit takes several seconds on this repository (its hooks, and git over 5,000 files) |
| The commit's status | the commit form has `data-busy="committing..."`, and the page script's `post` says the `data-busy` text of the form or control that sent an action, else "applying..." |
| Ctrl+C | `app.committing()` is the promise of the commit under way, or null; `shot_review.mjs` waits for it before closing |
| The commit page | `/commit` (`hrefs.commitPage`), `commitHtml` in `shot-pages.mjs`: the counts, the message in a text box with its default as `data-default` and **Back to the default message**, enabled once the box differs (the page's script; a refresh keeps an edited message and takes a new default otherwise), the files with their status and why, what is left out (200 at most), and the archived sessions, each with the command that opens it. Overview, Runs and Commit link to each other at the top of each page |
| Closing the session | `session.archive(commit)` in `shot-session.mjs`: `closed` {hash, short, message, at} recorded, `session/` moved to `archive/<id>/session/` (copied and removed if a file in it is held open), its lock left out, `<id>` the commit's short hash (`-2`, `-3` after it when taken). `archiveRoot(root, id)` is a root `openSession` opens; `listArchived(root)` lists them, newest closed first, each with its `root`. In `shot_review.mjs`, `onCommit` archives, takes the lock again and opens the next session, the commit as its baseline |
| An archived session | `shot_review.mjs --archived <id> [--port N]`: the session opened from the archive with `readOnly`, no lock, no run, nothing applied; every POST is refused (403), the overview says it is archived and that the pictures under docs are shown as they are now, and the commit page lists the archived sessions only |

**The page of every picture** ([All pictures](#all-pictures)):

| Part | Where it is |
|---|---|
| The table | `shoot_docs.mjs --list` (`[{out, setup, once, window}]`, written with `writeSync` before `process.exit`, so a pipe gets all of it); `listShots()` in `shot-runs.mjs` runs it hidden; the server reads it when `/all` is first asked for, again after `SHOTS_FRESH` (30 s), one read at a time |
| The model | `allPictures({shots, exists, entry, verdicts})`, `noSvgReason(svg)`, `ALL_GROUPS` and `appliedVerdict(v, done)` (a run's verdict as the review applied it, which the server's `shownVerdict` asks too) in `shot-review.mjs` |
| The verdicts | the server's `verdictsOf()`: this session's model, then each archived session's pictures (`closedSessionPictures(root)`, its runs read as `loadRuns` reads them, through `readRun`), the newest closed first, each read once |
| The pages | `allHtml` and `plainHtml` in `shot-pages.mjs`, `hrefs.all`; *All pictures* in the top links and a picture's pager; `/picture/<out>` falls back to the plain page for a picture of the table no run of the session reported |

**Tests and documentation.** `test/shot-review.test.mjs` holds the tool's suites (session,
pages, writes under docs, server); the modules it shares with the command-line tools are
tested in `test/svgshot.test.mjs`. It is a step of `test.bat`, of the `run-gates` action, of
Tools.md's list and of Building.md's command, with an entry of its own in
`Tools-Toolchain-Tests.md` and a row in WIP.Build.md's roster. The tool is `shot_review.mjs` in
`Tools-IDE.md`, node `i10` in `Tools-Groups.dot` and `t29` for its tests, a line on the
landing page, and WIP.md's *Which file to open* row.

## One way to take pictures

Rules (owner, 2026-11-09), so that a retake from a terminal shows in the tool like any
other run, and the tool's commit leaves nothing behind:

1. **Every screenshot run is a run of the session**: `shoot_docs.mjs`, `replay.mjs`,
   `chromeshot.mjs --take` and `--cleanup`, typed in a terminal or started from the tool. A
   terminal run hands itself to the tool when the tool is open for the checkout, and otherwise
   opens the session itself (owner: open it itself, not refuse), runs the code the tool runs and
   records the run. There is no mode that writes under `docs/` outside a session.
2. **The tool shows every picture file that differs from the baseline**, PNG and SVG, light
   pictures included: each is explained by what a layer of the session wrote, or shown as changed
   outside the runs with Keep and Put back.
3. **After a commit from the tool, no picture under `docs/` differs from HEAD**: the commit takes
   what a review kept, and waits for every picture changed outside the runs to be kept or put
   back.
4. **When a picture's size changes, the tool updates its pages' `{:width height}`** in the same
   commit (owner: make the edits), and a build check fails a shot whose declared size is not its
   pixels' half.

And (c), owner: **a checkout's bundle cache is filled from the main checkout's** on first use
(`git rev-parse --git-common-dir`), so that a new worktree does not redraw every SVG whose bundle
it lacks. The cache is never committed: a bundle can hold the Windows user name, and the main
checkout's is 58 MB that a retake rewrites. `seedBundleCache` in `scripts/svgshot/bundle.mjs`,
called through `defaultBundleCache` by `shoot_docs.mjs --svg`, `replay.mjs`, `chromeshot.mjs` and
`shot_review.mjs` whenever no `--bundles` names another cache, once the command line has passed.
It copies only when the worktree has no cache at all (one emptied has been used), never links
(writeBundle rewrites a file in place), and copies into a folder beside it renamed into place,
so a copy cut short leaves nothing that looks used.

**Rule 1, every run a session run:**

| Part | Where it is |
|---|---|
| The run handling | `scripts/lib/shot-host.mjs`, `createRunHost`: the runs of a session, a run started (`startRun`), its events kept, its verdicts applied through the applier in the order they arrive, one per turn of the event loop, and its end once they are. The server adds its pages' updates as callbacks |
| A tool's entry | `sessionRun` in `scripts/lib/shot-front.mjs`, called by `shoot_docs.mjs` (twice: before the clean-up block for `--cleanup`, after the IDE is found for a retake), `replay.mjs` (after the cache check) and `chromeshot.mjs` (after the revision is read): after every check that needs no IDE, so that a mistake in the command line is said as before and no run is recorded for it (`check_cli`'s cases reach none). It returns at once when the run writes nothing under `docs/` (`--stage`, `--out` elsewhere, `--list`, `--cleanup --dry-run`, a replay's shard) or is a session's run already (`SHOT_SESSION_RUN`, which `startRun` sets in its child) |
| The tool open | `shot_review.mjs` writes `.shot-review/server.json`, `{pid, port}`, once it listens (not for `--archived`), and removes it as it closes; `openTool` takes it while its process lives. `handToTool` POSTs `{tool, args}` to `/api/terminal-run` with the tool's own Origin, then follows `/api/run/<n>/follow`: the run's log, its lines as they come, and `@@shot-exit {exit}` once its verdicts are applied. Ctrl+C posts the run's stop, a second its kill |
| The tool closed | `runHere`: the session's lock taken (a refusal names the holder), the session opened as the tool opens it, verdicts left unapplied applied, the run started through the host, its lines printed on the stream they came on, the lock given back at its end |
| The command line | `terminalRunOf` (shot-runs.mjs) keeps it as typed and adds `--against <baseline>`; it refuses `--stage`, `--events`, `--diffs`, `--bundles`, `--out`, `--against-disk`, and an `--against` that is not the baseline |
| Named captures | `chromeshot.mjs <capture>...` takes `--stage`, `--events` and `--against` too, each capture a job (named as in `chrome/shots.mjs`), so a session can run it; its file paths, `--words`, `--captures` and `--extension` are passed as full paths, since a run starts in the repository's root |

**An SVG that draws the same pixels is the same picture** (owner, 2026-11-09): keep.mjs's
`sameSvgAs`, which `shoot_docs.mjs --svg`, `replay.mjs` and `chromeshot.mjs` ask before an SVG is written, draws
the SVG as diffSvg does (`renderSvg`, an `<img>` at the device scale) beside the baseline's
(`--against`, which the tool passes to a replay too) and then the file's, and compares them
exactly, with no tolerance (a tolerance would bring back the threshold this tool exists for).
The same as the baseline's: its bytes go back (`restoreSvg`, through git), state `restored`, which
the review counts as the session's write and groups as Only noise. The same as the file's: it
stays. A staged verdict says so (`same`: `{as: "baseline", baseline}` or `{as: "file", file}`, the
hash of the file's text), and the applier honours it only while that still holds.

**Rule 4, the declared sizes.** `scripts/lib/shot-sizes.mjs` holds it all:

| Part | Where it is |
|---|---|
| The size | `shownSize([w, h], scale)`, round(pixels ÷ scale); `scaleOf(entry)`, the manifest's `scale` or `SHOT_SCALE` (2, defined in `shot-manifest.mjs`). The manifest records `scale` only when it is not 2: `setBuild(out, build, scale)` sets it with the build (undefined leaves it, 2 or null removes it), `clearBuild` drops both. A program window's picture is at 1.5 (a display at 150%), or at 1 for the compiler's boxes (a window unaware of the display's scaling draws at 96 DPI). `shoot_docs.mjs`'s `keep` passes its scale to `recordBuild` and to the verdict (`pngVerdict`'s `scale`), and the applier records it |
| A reference | `pictureRefs(text, page)`: an image, `![alt](src)`, whose source is a PNG, outside code (`maskCode`), with or without its attribute list, which has the form `{:width="N" height="N"}`, sometimes with ` png` after it; `targetOf(page, src)` resolves the source from the page's folder (from docs/ for one starting with a slash) |
| Setting them | `withShownSizes(text, page, sizeOf)` changes only the two numbers, or adds the list to an image without one, every other character kept (CRLF too); `referenceIndex(docsRoot)` (the pages that show each picture, through `markdownFilesSync`, 0.2 to 0.5 s over the whole tree) and `syncSizes(docsRoot, outs, entry, {index, dryRun})`, for the dark pictures among `outs`, from their files |
| Who sets them | `shoot_docs.mjs` at the end of a run without `--stage`, for each dark picture new, updated or restored (`resized`, `syncPageSizes`), and after `--cleanup` for each picture put back; the review tool's applier after each change to a dark picture's file (`resize`: a layer applied or undone, a picture put back), with the index read once per applier. A page that starts showing a picture while the tool is open is not in its index until the next session: the gate finds it |
| The commit | the server's `sizedPages(outs)`, commitPlan's `pages`: for each dark PNG committed, each page whose text at the baseline (HEAD, since a commit needs the baseline to be HEAD) declares another size than the file's, and whose working copy git reports changed; the text committed is the baseline's with those sizes set, in the working file's line endings. `commitPaths(root, {contents})` writes it into the file, commits, and puts the working text back whatever git did, a copy of it kept meanwhile under `%TEMP%\shot-commit-held-*`. A page with other changes is listed under Left out as well, and its file's row says "without the page's other changes"; the message ends "their sizes set on N pages" |
| The gate | `scripts/check_shot_sizes.mjs` in `check.bat` and the `run-gates` action: every reference to a dark picture of the manifest declares `shownSize` of its file (`sizeMismatches`). It covers the manifest's pictures only, as the owner put it. A picture that is in the table but not yet in the manifest gets an entry the next time a run writes it |

## Open

Adding the queue's region measure to the decision rules, a later enhancement
([Decisions](#decisions-owner)).
