# Screenshots — `shoot_docs.mjs`

The documentation's IDE screenshots go stale with every beta. `scripts/shoot_docs.mjs` retakes
them from a live IDE: every picture of the IDE the documentation holds, annotations included,
and the program windows and web pages that sit beside them. The owner's decisions behind it are marked (owner).
A run is reviewed, and its decisions overridden, with `node scripts/shot_review.mjs`: [WIP.ShotReview.md](WIP.ShotReview.md).

## Rules

- **A run that would write under `docs/` is a run of the review session** (owner; `scripts/lib/shot-front.mjs`, [WIP.ShotReview.md](WIP.ShotReview.md#one-way-to-take-pictures), rule 1), and so is one of `replay.mjs` and `chromeshot.mjs`. Typed in a terminal, such a run is handed to `shot_review.mjs` when that is open for the checkout and followed there; otherwise the terminal's process opens the session and runs it as the tool would, staged, its verdicts applied as they arrive. It refuses `--diffs`, `--bundles` and `--against-disk`, which only `--out` elsewhere or `--stage` take.
- **The Windows user name must never be in a published picture**, and a path on the tool's own folder is virtual (owner): how each run checks and rewrites, under [The IDE the tool drives](#the-ide-the-tool-drives) and [Capture](#capture).
- **Every picture is taken in two themes by one IDE, and both must say the same**; **the reference is the picture at git `HEAD` first, then the file** (owner). [Capture](#capture) and [The tool](#the-tool) say how.
- **Settle by a condition, never a fixed sleep, and a picture that shows some state sets it itself** rather than relying on the shots before it.
- **Every setup runs on a private desktop**, started only when a shot in it is selected; `web` is puppeteer's Chrome on one of its own, never headless and never on the user's desktop. `web`, `webpage` and the package-server setups need the network, and never publish.
- No wrapper; outside every gate and CI, as `try-help-addin.bat` is. Run `build.bat` first. Options and exit codes: [The tool](#the-tool).
- **The GitHub pictures of `Documentation/Building.md` are taken by the Chrome extension in `scripts/svgshot/` and by no session** (owner: only the owner signs in to GitHub; no session opens a pull request, posts anything on GitHub or uses the owner's account): [Pictures from a signed-in Chrome](#pictures-from-a-signed-in-chrome). **The folder `scripts/svgshot/` is the extension's root, and Chrome loads nothing from outside it and no Node module**: `capture.mjs`, `annotate.mjs`, `private-words.mjs`, `snapshot-svg.mjs`, `snapshot-trim.mjs`, `font-rules.mjs`, `colour-filter.mjs`, `gradient.mjs`, `util.mjs` and `chrome/` import nothing else, which `test/svgshot.test.mjs` checks by following the imports. **A capture or a bundle never goes under `docs/`**, and what is published is checked for the Windows user name, git's `user.name` and `user.email` and each `find` of `scripts/svgshot/private.json`, which git ignores: by `chromeshot.mjs` before it writes anything, and by `replay.mjs`.

## What there is to retake

Every menu, dialog, panel and editor view of the IDE is HTML in the IDE's page, so all are
reachable over CDP; annotations (arrows, boxes, rings, numbers, labels) are drawn on top by the
tool, and a composite is assembled from several clips. Running programs' windows and a few web
pages are taken beside them.

### Pictures still outside the tool

Each for a stated reason:

- **The six GitHub walkthrough pictures** of `Documentation/Building.md` (compare-changes,
  create-pull-request, merge-pull-request, confirm-merge, choose-workflow, run-workflow): the
  owner's to take with the Chrome extension, signed in (owner, 2026-11-05;
  [Pictures from a signed-in Chrome](#pictures-from-a-signed-in-chrome)); no agent touches them
  or their prose. They show base `main`, the merge's target, the workflow's present name, and
  no e-mail address in confirm-merge.
- **`packPublishPackage1`**: `packagePublisherPublish` opens the sign-in form when no publisher
  is signed in, before the confirmation box, and a package is never actually published, so the
  old file stays. **`packPublishComplete1`** is the result of a real publish, so it stays too.
- **`Tutorials/WebView2/Images/tbWebView2InAForm.webp`** is skipped (owner). It is an
  animated WebP made from a GIF (Pillow, `quality=80, method=4, allow_mixed=True,
  minimize_size=True`: 1.08 MB against the GIF's 3.74 MB, the same 12,260 ms); a lossless
  WebP of it is larger than the GIF, because the GIF's dithering changes every frame.
- **`favicon.png`** is never changed by this work (owner).

## Decisions (owner)

- **One tool.** `shoot_docs.mjs`; the help add-in's pictures are one setup among the others.
- **2x pictures, shown at half size**: every retaken picture gets `{:width="W" height="H"}` (half
  its pixel size) on its page, as `docs/IDE/AddIns/Help.md` has. A JPG retaken becomes a PNG.
- **Menus are transparent cut-outs**: the bar item and its drop-downs opaque, the rest
  alpha 0.
- **Annotations are redrawn by the tool in one house style**, anchored to what they point at,
  including the ones that only repeat the prose.
- **Composites are assembled by the tool** from element clips.
- **`fafaloneIDEscreenshot1.png`** (a community author's own annotated picture) and its downscaled
  copy are not used: a project-made full-IDE feature map with the same labels stands in their place.

## The IDE the tool drives

Measured:

- **Fixed device scale.** The IDE page otherwise takes the host's scaling (1.5 on the dev box:
  `body.scale150`, 22.67 px menu rows). `--force-device-scale-factor=1` in the WebView2 browser
  arguments (`Lane`'s `browserArgs`) gives `scale100` and integer sizes;
  `Emulation.setDeviceMetricsOverride` at `deviceScaleFactor: 2` then gives a clean 2x. Menus and
  dialogs come out at their 1x CSS sizes (File 189x336, Manage Keyboard Shortcuts 1016x736).
- **No-project start.** `Lane.open` always opens a project. `Lane.openNoProject()`
  (`launchOnDesktop` with no argument, then `attachIde`) starts the IDE as it shows its splash and
  then New / Open Project, with every menu in its no-project state. The lane's copy of the
  install leaves out `projects\` (29 MB): New Project then shows 2 templates and no samples, so
  a setup that shows them copies `projects\` into the lane's copy.
- **Theme** (owner). Every picture is taken in the dark theme
  (`tbTheme_SwitchToDarkMode`) as `X.png`, and in the
  **Light** theme (`tbTheme_SwitchToLightMode`, not Classic) as `X.light.png` beside it. The
  site shows the light one in its light theme and the dark one in its dark theme, following the
  toggle and, with no choice stored, the OS; pages are not edited, the build pairs the files by
  name ([WIP.Build.md, Pictures in two themes](WIP.Build.md#pictures-in-two-themes)); the PDF
  has the light ones only. The menu bar and dialog title bars follow the theme; drop-downs and
  dialog bodies are light in every theme. Light lays the window out a few pixels differently
  (the toolbar 4 CSS px shorter, a panel's title bar 3, the Global Search button narrower), so
  a light picture can be a few pixels off the dark one's size; the build shows each at its own
  size, at one scale.
- **Opening things.** Menus open on a real mouse press on `#rootMenu<Title>`; submenus on a real
  mouse move onto the item (~500 ms; wait for `#contextMenuSUB > .contextMenuItem`). Dialogs by
  `executeIdeCommand` (`tbHelp_ShowAboutWindow`, `tbIde_ShowIDEOptions`,
  `tbKeyboardShortcuts_ShowManageKeyboardShortcuts`, `tbPanels_ShowManagePanelLayouts`,
  `tbProject_New`, `tbToolbox_ShowMoreComponents`), closed by a real click on their Close /
  Cancel / OK button.
- **The New / Open Project dialog**, from BETA 1033, is `#fp2root` (its classes
  `fp2-*`, the whole module at the end of `ide/main.js`): a search box, a rail of sections
  (New, Samples, Recent, and Recent (VB6) only when that list has entries) with counts, cards
  for New and Samples (`.fp2-card`) and rows for Recent (`.fp2-row`), 970 by 728 CSS px. A
  card or row carries its item as `fp2Item` (`name`, `projectPath`): a sample's card shows its
  name without "Sample N.", so the tool finds a sample by `fp2Item.name` and anchors on the
  name as drawn (`SAMPLE_TITLE`). `.fp2-content` is what scrolls.
- **What the user's machine leaks into a picture**, and the answer for each:
  - the recent-projects lists (twinBASIC and VB6) read the user's registry: every tool's IDE has
    them answered by the defaults hook (`scripts/lib/tb-defaults.mjs`), from the page's
    `window.__tbRecents` and `window.__tbVb6Recents`, or empty, whichever way the build asks
    (`GetRecentsList` and `GetVB6RecentProjects` on the host object, and since BETA 1042
    `ReadFileDataBase64("GetRecentsList")`), nothing read or written. A shot sets them before it
    opens the New / Open Project dialog (`setRecents`), and that dialog's remembered section, the
    setting `NEWFRONTPAGE`, is neither read nor saved (`PAGE_DEFAULTS`);
  - the IDE's settings and About's licence line (`NOT READY` until the licence check has
    finished): [Machine state in the pictures](#machine-state-in-the-pictures-owner);
  - the Windows user name: the page's visible text, text boxes included, is searched before
    the first capture and again when a capture is chosen, with the SVG under `--svg`, and for a
    program's window the texts of the window and its children; the run fails when it is there.
    The page can draw again in between, as Project Settings does, putting the real
    build path back over the template a shot had set in the page only (a shot that sets a
    value types it, `input` and `change`, so the page keeps it). The `settings` setups open
    their project with the templates' own build path (`startSettings`), so that a row drawn
    again holds no user name either: without it, `llvmdoc1` fails the check now and then.

## Capture

- **Opaque clip**: `Page.captureScreenshot` with a clip, snapped outward to whole device pixels
  (`floor(v*2)/2`, `ceil((v+w)*2)/2`). Dialogs clip `.modalDialogContainer` (its 40 px shadow
  falls outside).
- **Cut-out**: a style sheet sets `html, body, #bodyInner` transparent and `body *` hidden
  except the kept elements (`#rootMenu<Title>`, `#contextMenu`, `#contextMenuSUB`, or an
  annotation layer), plus `Emulation.setDefaultBackgroundColorOverride` to alpha 0; both undone
  after. Corners are alpha 0, the interior 255, the rounded bottom corners partial.
- **Quiet page**: the style sheet against carets and animations goes into every shot,
  opaque ones included (IDE Options shows a caret without it).
- **Write only on change.** The tool prints, for each picture, the
  `{:width height}` its page should have and warns where the page disagrees; it does not edit
  markdown.
- **A capture is not byte-stable.** `Page.captureScreenshot` of an unchanged screen alternates
  between versions a few pixels apart by 1-14 grey levels: dialog shadow edges, the status bar's
  scaled Ko-fi bitmap, panel dividers, rounded corners. `captureBeyondViewport` and
  `fromSurface: false` are stable but drop the scrollbars and the cut-outs' alpha, so neither is
  usable. Measured on BETA 1010 (194 shots, about 35,000 captures, alone and with six IDEs at
  once), a picture of a still state is final at its first capture once the page is quiet and two
  frames are drawn. So `capture` has no rest: it
  captures back to back until one equals the file on disk or two in a row agree, and a picture
  that has not changed costs one capture. **A picture two captures agree on that is not the file
  is not kept at once** (owner): `capture` captures on at `CAPTURE_GAPS` (150 ms rising to 1.5 s)
  until one equals the file or 5.5 s have gone, and keeps the last two that agreed. Keeping it at
  once fails a second run (BETA 1010), in two ways: a raster drawn in several versions that
  turn over in the idle time between captures, not under captures back to back (the striped
  ground round a designer, 47,000 pixels apart; About's gradient boxes, dithered 10,000 pixels
  apart; a submenu's shadow corner; the splash's rounded corner, 4 pixels by many levels); and
  a state still on its way when the shot's own condition is met (Rename_Box's box red for a
  moment, a designer readout fading in). With no two
  agreeing in 5.5 s it fails. So a picture is rewritten when the IDE draws something different,
  not when the noise flips, and a changed picture costs about 5.5 s.
  Under the full parallel load a run now and then settles on the other version of one or two
  pictures (1-3 grey levels, a few pixels to a few hundred along an edge) and keeps it through
  every capture, so longer captures in `capture` do not help; each is unchanged when its setup
  runs alone, and which one varies from run to run. So **a picture within a capture's noise of
  its file is left as it is** (`nearly`: one size, no channel more than 16 levels apart, at most
  0.5% of the pixels apart), reported `unchanged but for a capture's noise`, with a `.noise`
  picture under `--diffs`. The same test decides that a light picture is the dark one.
- **A picture's two themes say the same.** A shot's passes show one state in two colours, so
  a picture whose text differs is a wrong state, not the theme, and fails as one of another size
  does, naming the words on each side, and is not kept (`runJob`, with or without `--svg`). A
  size alone misses it: Options_ActiveX once showed an import's rows at the dark picture's size.
  `TEXT_IN_CLIP` reads the page, not the SVG, as each capture is chosen, since the same text wraps
  and is cut short differently in each theme: each block of text inside the clip, across the shadow
  roots, with the text boxes' values and each closed select's choice. A line shows where part
  of it is inside the clip and inside its ancestors' clipping boxes and is on top there, and a
  block counts all its text once any line of it shows, so a line of code the clip cuts off
  reads the same in both. A block is `whole` when a line of it shows its full height and half
  its width, or 40 px of it, and otherwise `cut`. `themeTextDifference`
  (`scripts/lib/shot-policy.mjs`) ignores white space and refuses only what one side has `whole`
  and the other shows none of, since Light lays a window out a few pixels differently and a row at
  the clip's edge shows more in one theme (Paused_Line's `price: 3`, Editor_Panel's `25`). A
  composite's layer is not read; its parts are, as they are captured. A shot whose words must
  differ says so in `themeWords`, naming them: First_Run_Options and Menu_Tools_IDEOptions show the
  theme's own name (`SHOWS_ITS_THEME`). A window taken once has no pair.
- **The tool's folder is virtual in a picture** (owner). Nothing writes at a drive's root, so
  `PACKAGE_ROOT` is `TOOL_ROOT`, `.claude\tbshots` in the checkout (gitignored, removed at the end
  of a run), and every picture shows it as `SHOWN_ROOT`, `C:\tbshots`, which is never created
  (`scripts/lib/shot-root.mjs`).
  `Lane`'s `onAttach` installs the rewrite before a project loads, and `capture` again, for a
  page that has reloaded: the DOM's text setters and the page's `TEXTtoHTML`, whose `&#92;` no pattern
  would find, rewrite what they are given at once, because the console measures a row in the
  task that writes it and a path 40 characters longer leaves it a line too tall; a
  MutationObserver on each root takes the rest. A text box's value is rewritten just before each
  capture and SVG and put back after, so that the page never reads the shown name back and acts on
  it. A part that starts with a dot may have no slash before it, because Markdown, which draws
  the import log, reads `\.` as an escape. A capture fails when the real folder is in the page's
  text, its text boxes, the SVG or a window's texts: what cannot be rewritten is fixed, and the guard
  is not relaxed. `startTidy` sweeps the folder's `ProjectState` entries; `asTempFolder` allows
  a `.claude\tbshots` folder outside the temp folder, any checkout's, by name, so that a dead run's
  record from another worktree, or one spelt by a subst drive, is swept by the next run to start
  alone; a dead record naming any other folder is dropped with a note rather than blocking every
  run after it.
- **The reference is the picture at `HEAD`, then the file** (owner; `pictureFate` in
  `scripts/lib/shot-revision.mjs`). Compared with the file alone, a picture drifts from
  `HEAD` over the runs of one retake, each step within noise of the file before it, and a run
  can keep the other noise version of a picture. So
  `capture` stops at a capture equal to `HEAD`'s picture or the file's, and `keep` compares
  with `HEAD`'s first: within noise of it (or equal), the file becomes `HEAD`'s bytes, reported
  `restored as HEAD has it` when it held anything else, and its SVG goes back to `HEAD`'s, or
  is removed when `HEAD` has none, so the pair stays matched (`restorePictures` in `scripts/lib/shot-apply.mjs`, the SVG written by
  `git restore --worktree`, so that its line endings are a checkout's; no SVG is drawn and the
  bundle stays as it is). Not near `HEAD`'s but within noise of the file: an earlier run of the
  retake wrote that change, unchanged. Else written. A picture `HEAD` lacks (a new shot, an
  untracked file) has the file as its only reference. The run's pictures at `HEAD` are read in
  one `git cat-file --batch` at the start, in the `--out` folder. `--against <rev>` takes
  another revision, `--against-disk` turns it off; with the default, an `--out` outside git
  falls back to the file. `--cleanup` applies the same rule with no IDE (see [The
  tool](#the-tool)).
- **A shot may name where the page flickers of its own accord** (`unsteady` in `capture`'s
  options): a list of `{on, pad}`, `on` an annotation anchor (see [Annotations](#annotations))
  and `pad` how far round its box, in CSS px (1 by default, an edge's anti-aliasing). Every
  comparison `capture` makes leaves those pixels out (`same`, and `nearly`'s `rects`), and a
  capture that matches the file or the dark picture outside them keeps that picture's bytes,
  so the flicker never rewrites the file. Use it for a pixel no condition settles, as small as
  the element allows: the WebView2 download page's Version arrow (`#version
  .px-dropdown__icon`, 8 by 9) changes a pixel by more than the noise between any two
  captures, animations and transitions off. So do the two "See your logo here!" boxes of About
  and the splash (owner; `VIP_GOLD_SPARES`, the last two `.vipGoldX`): their gradient is
  dithered differently from capture to capture, a level or two over thousands of pixels,
  beyond a capture's noise. So does the time of the GitHub release's zip ("8 hours ago",
  "yesterday"; owner), which moves on by itself: an `{rect}` from the Assets list's
  `relative-time`, widened leftward to the widest it is drawn, since it is right-aligned. So
  do the splash's four rounded corners in the dark theme (owner; 4 by 4 CSS px each: 4 pixels
  flipped), and the shadow round each TabIndex circle of Designer_TabIndex (owner;
  `tabIndexRings`, a ring from 2 px inside the circle to 6 px beyond it, so the number is still
  compared): the shadow over the grid's dots is dithered in one of two versions, about 600
  pixels apart, the same two bytes for bytes in every run. A shot without it compares byte for
  byte. **Never use it for what differs between runs and shows**: the file keeps the old
  pixels there, and an SVG written in a later run (a review's, or a stale bundle's) shows the
  new ones beside them. Settle it instead: every project a setup opens has one id,
  `DOCS_PROJECT_ID` (Lane's `projectId`), so Settings_Close's Project ID box is compared: with
  an id per slot left out there, a later SVG would show another id than its PNG.
- **Settle by condition, not by sleep.** Fixed sleeps would be most of a run (a closed menu leaves a
  2x8 px empty `#contextMenu`, so a wait for it to vanish always runs out its 2 s).
  A menu is closed when it holds no items; a dialog is still when a MutationObserver has seen no
  change and its images and fonts are loaded; a floated panel when the IDE's `.flashElement` class
  is gone; a help page when its fonts, images and body are settled. The page size is set only once
  `body` has its `scale100` class: the IDE picks 48 or 32 px New Project tiles from it.
- **A picture that shows state sets that state itself** rather than relying on the shots before it,
  so a picture is the same whichever IDE or order takes it.

## Annotations

An SVG layer `scripts/svgshot/annotate.mjs` adds to the IDE page above everything (`z-index`
max, `pointer-events: none`) before the capture and removes after it, the clip growing to hold
it. It is drawn in CSS pixels, so it scales with the 2x capture and survives a cut-out as a kept
element.

**Anchors**, resolved in the page at shot time:
- an element: a CSS selector, optionally narrowed by its text (`{css: ".buttonGroupItem", text: "Samples"}`);
- a span of code in the editor: a text search in the model (`{code: "NormalState", nth: 2}`), placed
  with `editor.getScrolledVisiblePosition`, never a line number;
- a point of a rect: `center`, an edge or corner, with an offset (`{of: anchor, at: "top-left", dx, dy}`).

**Primitives**: `arrow` (from, to; `bend` for a curve; several `to` for a fork), `box` (a row),
`ring` (an icon or a short word; a box with `rx` half its height), `underline`, `label` (text
beside an anchor: `left`/`right`/`above`/`below`), `badge` (a number).

**House style** (CSS px at 1x): one red, `#E5252A`; 3 px strokes, round caps and joins, with a
1 px white halo so a stroke reads on light and dark UI; one solid triangular head, 5x the stroke
long; boxes and rings 3 px with 4 px padding; labels in the page's font (Segoe UI) 600 at 15 px on a pill (dark red
with white text over dark UI, white with red text over light); badges a filled red circle of
22 px with a white bold numeral. The dark pill is `#8E161A`. No hollow block arrows, no hand-drawn strokes. **A label's
tone follows the theme** unless the shot names one: dark in the dark theme, light in Light,
read from the page's panel colour. Every label sits on what follows the theme (a panel's
ground, the window), so none names a tone; one over a drop-down or a dialog's body, light in
every theme, would say `tone: "light"`.

**Composites** (the five CustomControls code-to-property pictures, `Editor.png`, `DebugConsole.png`):
each part is captured as its own clip; the tool then lays the parts out in a full-window layer
in the same page (`<img>` of each part on a plain background, with a gap), maps each part's
anchors through its placement, draws the overlay across, and captures the layer.
**Native `<select>` lists** (Editor.png's four, a FAQ picture, one tutorial) open in an OS
window no CDP capture holds: the tool draws a replica list from the select's options, styled
as the IDE's own pop-up list, beside the select.

## The tool

`scripts/shoot_docs.mjs [--only <regex>] [--out <dir>] [--ide <path>] [--jobs N] [--diffs <dir>] [--svg] [--against <rev> | --against-disk]`,
Exit codes: 0 every picture written or unchanged, 1 a picture failed, 2 the tool could not run,
3 not put back.

- **Cleanup** (owner): `shoot_docs.mjs --cleanup [--dry-run] [--only] [--out] [--against]`
  starts no IDE and no browser. Each PNG git reports modified against the revision (`HEAD`)
  that is within noise of the revision's is reset to its bytes, with its SVG as `restored` does
  (the SVGs in one `git restore --worktree`), so that only real changes stay in the tree.
  Added and deleted PNGs, one beyond noise, and one whose SVG alone changed are left alone.
  `--dry-run` lists; the IDE options (`--ide`, `--jobs`, `--svg`, `--bundles`, `--diffs`,
  `--against-disk`) are refused with it. One noise rule: the capture's `nearly`, `--cleanup`
  and the review tool all call `withinNoise` (`scripts/lib/shot-change.mjs`).
- **Setups**: one IDE each --- `no-project` (`Lane.openNoProject` with `includeProjects`: the
  menus, cut out with alpha, the dialogs that need no project, and the empty panels, each floated
  on its own, after the dialogs), `help` (builds the add-in as `try-help-addin.bat` does, opens
  `test/addin/helpdemo`, `TB_DOCS_HELP_REAL_TITLEBAR=0`: the `docs/IDE/AddIns/Images/Help_<Name>.png`
  pictures), `project` (the demo without the add-in: About, which needs the compiler's licence
  answer, and IDE Options, whose font lists need a project), `sample`, the `settings` setups, `glyphs`, `global-search`
  (Sample 15 exported from the install, built into the lane's copy as an add-in, its own project
  opened; once a search settles, its results list is told through its own `notifyChangedItem`
  that every row changed, so that it measures them again (owner): it keeps a row's height from
  its first measure and sets its scroll range from those, and under load a thumb shows over
  two results that fit), `sample6` (Sample 6 exported and opened) and `designer` (the sample fixture with
  `test/shots/designer/` staged onto it, plus the Global Search add-in for Toolbar_3; it sets the
  page's `currentDPI` to the 2x ratio, or the IDE's 5 s DPI check covers every designer with
  RESYNC), and `forms` (the same without the add-in), `community` (the demo, its compiler
  restarted on an empty licence key in the page) and `splash` (the demo, for the splash
  alone), `programs`, `vbflexgrid`, `xcalendar`, `dialogs`, `webview2`, `cef`, `codelens`, `memory`, `package` and `fusion` (pictures of a running program),
  `package-server`, `settings-linked` and `package-check`, `import`, `webpage` and `web` (a
  Chrome, not an IDE), `featuremap`, `tour`, `code-chapter`, `debugging`, `assert`, `forms-chapter`, `toolbox-icons`, `projects`, `projects-refs`,
  `projects-start`, the `building`, `starting` and `troubleshooting` setups, `customcontrols`, `code` and `sample9` (all described
  below). A setup is `{name, start, prepare}`, with `closing` to read what only its page can say
  before the IDE ends, `end` to check or give back what it holds after, and `noPage` for a setup with
  no IDE page, whose `start` returns a stand-in for the connection and whose shots are `once`.
  Every add-in a setup loads has its `SaveSetting` key snapshotted, emptied and restored
  (`tbDocsHelp`, `GlobalSearchAddIn`).
- **Jobs**: `--jobs N` (default 6) runs setups at once, each IDE in a slot of its own from
  `tbbroker` (a private desktop; the help setup's slot also carries the detached window's port)
  with a DevTools port Windows picks, and splits the big setups into parts, longest first; a full run with `--svg` is
  about 12 minutes in both themes on BETA 1010: the jobs add up to about 4,100 s, and the longest
  part, `forms-chapter`, takes about 270 s on its own, so six IDEs cannot do much better.
  `--jobs 1` runs one IDE per setup in table order. Per-run
  state lives on the connection (`c.shot`), never in module variables.
- **Diffs**: `--diffs <dir>` (never under `docs/`) writes, for each picture that differs from the
  file on disk, the committed picture, the new one and an amplified difference map side by side
  (`scripts/lib/shot-diff.mjs`, `composeComparison` with `amplify` in `scripts/lib/png.mjs`);
  `.noise` for one left as it is, `.restored` (the file and `HEAD`'s) for one put back.
- **Shots**: a table of `{out, setup, take, annotate?}`, `out` the picture's path under
  `docs/`; `--only` matches it or its `.light.png`, and selects the shot in both themes.
  `take(ctx)` brings the IDE to the state and returns the clip (or the parts of a composite);
  `annotate` is a list of primitives. A shot of a program's window says `window: true`, and one
  whose take and table disagree fails. The tool finds each name it presses F1 on by searching
  the demo's source, not by line. **`--list`** starts no IDE: it prints the table as one line of
  JSON (`[{out, setup, once, window}]`), which the review tool's page of every picture reads.
- **The manifest, `test/shots/manifest.json`** (`scripts/lib/shot-manifest.mjs`;
  [WIP.ShotReview.md](WIP.ShotReview.md#remembered-overrides)), records the build of each picture
  a run writes, and holds each picture's allowances (its noise rule's limits and rectangles left
  out, its SVG's bar) and a review's decisions, each tied to the bytes it was made on;
  `decidePicture` and `decideSvg` (`scripts/lib/shot-policy.mjs`) judge with them, in a run, in
  `--cleanup` and in `replay.mjs`, so a run from a terminal and one from the review tool come out
  the same. It is read and written only for the default `--out`.
- **`--stage <dir>`** (a new or empty folder git ignores) writes nothing under `docs/`, to the
  bundle cache or to the manifest, and puts each capture, its SVG, bundle, difference pictures,
  strength maps and verdict there (`scripts/lib/shot-stage.mjs`), for the review tool to apply;
  **`--events`** prints a `@@shot-event` line per event, and a line `stop` on stdin then ends the
  run as at its normal end. `replay.mjs` takes both ([WIP.ShotReview.md](WIP.ShotReview.md#runs)).
- **Two themes**: each job takes its shots in dark, then `backToPrepared` (no menu
  or dialog, the tabs opened since closed with their changes discarded, the Tabs List's
  Recently Closed as it was, and the keys the takes added to `ctx` dropped), the IDE switched to
  Light by `tbTheme_SwitchToLightMode` (`ensureTheme`, settled by the panels' colour, the
  page's images and fonts), and the same shots again: no second IDE start. A shot that leaves
  something only it can undo puts it back itself: `Help_Window` attaches the help again with
  the window's Attach, `addReport` opens the report the dark pass added rather than adding
  another. A light picture with no file yet prefers a capture equal to the dark picture while
  its first is within a capture's noise of it; one with the dark picture's pixels is not kept (a light
  file there is removed); one more than 32 device pixels off the dark one's size fails, since
  that is a wrong state, not the theme. `--diffs` names a file `<path>.dark…` or
  `<path>.light…`; the run ends with a count per theme of each state.
- Shared helpers: `openMenu`, `hoverItem`, `closeMenus`, `waitModal`, `closeModal`, the cut-out,
  the snap.
- **Retry a failure once before looking into it.** These setups fail now and then and pass on
  a second run of the same selection: `package-server` ("typing fmt. opened no completion
  list", "OLE Guid and interface definitions stayed ticked"; it needs the network), `help`
  ("the pane did not show /tB/Modules/Interaction/MsgBox", the setup taking minutes instead of
  about 90 s), `sample6` ("the Project Explorer has no row Sources" or "Packages"), and `web`
  and `webpage`, whose pages are live and change of their own accord. A picture that fails the
  same way twice is a real fault. Under load (six IDEs starting at once, once at three) a setup
  now and then fails with "the IDE's settings were not made the defaults: its page ran no hook,
  even after a reload": `checkDefaults` fails closed, so nothing of the user's reaches a picture.
  Retry such a setup once in a fresh IDE; if the retry fails too, stop and leave it to the owner
  (owner).
- **`Features/Images/a6525b1d...png` changes width from run to run** (1512 or 1514 px); its
  light picture is narrower again (1498). Each comes out within the 32-pixel tolerance, so the
  run passes, but the file can be rewritten for the width alone.

## Standing rules for what a picture shows (owner)

- **A state is reproduced as the IDE reaches it, never by editing what it draws.** The tool
  inspects the IDE's page first to see how a state can be reached. An image taken from the files
  under `ide/`, such as a badge's, counts as reached the way the IDE reaches it; what the page's
  DOM holds must be captured.
- **A picture of a running program comes from a program written to illustrate what the picture
  depicts, run while the picture is taken.** A running program's window is taken once, as the
  program draws it.
- **Network access is fine for the package-server pictures. Never actually publish a package**;
  everything short of that is allowed.
- **A picture not of the IDE is retaken where it can be reproduced.** A `.vbp` import uses a
  synthetic `.vbp` project, and the path is scrubbed from the picture.
- **Licence and LIMITED states are reached only by a route that never touches the user's real
  licence**, or the old pictures stay.
- **Byte-identical pictures are one file**, each page keeping its own alt text.
- `Documentation/Building.md`'s "Editing screenshots" section points at `shoot_docs.mjs`.

## The feature map

`Features/Images/IDE-FeatureMap.png` (2880x1800, setup `featuremap`, fixture
`test/shots/featuremap/` FeatureTour) is a project-made full-IDE feature map. Twelve labels, each
anchored to an element or code span; Problems is labelled Diagnostics, the panel's title. Sticky
scroll, advanced hover info, inline hints, folding always shown and the debugger's memory figures
are switched on in the page only; the memory figures, which change from run to run, are fixed in
the page once real ones are shown, as History's times are.

## The tour

`IDE/Images/IDE_Tour.png` (2560x1760, setup `tour`, fixture `test/shots/forms/` FormsDemo), the picture
the IDE's landing page opens on, is the whole window in the default layout with `frmMain` in its
designer, so that the Toolbox and Properties have something to show. Its status bar is in the picture,
so the compiler is restarted on `licenceKey = ""` as in `community`, and the take fails on any other
badge. A bar's label stands on the bar and a panel's in its own empty part; the Toolbox and Properties
are full, so theirs stand on the ground round the form, each with an arrow. The anchors are read from
the page, so that the labels follow the layout. `IDE/Images/IDE.png`, the window with no project, is
on First Launch.

## The "Writing code" chapter

Setup `code-chapter` (three parts): FeatureTour, the feature map's Inventory project, with
`test/shots/codechapter/` staged onto it (`Helpers`, `Ev`/`Ev2`, `Watcher`) and the project's
warnings set so that TB0016 is a hint and TB0012 information. Its pictures are under
`docs/IDE/Code/Images/`, plus `Menu_Edit` and `Menu_View`, taken with the code focused.

- **Each picture starts from the default layout and its own tabs** (`chapterTabs`), and closes
  Monaco's find widget first: the editor is one for every file, so a widget left open shows over
  the next file's code.
- **The minimap is left out of every crop but Editor_Panel**: it is drawn a little differently
  according to what the editor showed before, so a crop with it changes with the shots' order.
- **A tab is tinted only when the compiler sends the file's diagnostics while it is open**, not
  when it opens on a file already reported: Tabs_States edits Inventory and undoes it.
- Edits are made in the page and undone (`editedThenUndone`) or discarded with their tab; the
  clipboard is the tool's own text (`FAKE_CLIPBOARD`), never the host's.
- **The Object Browser opens with its default settings** (view, filters, sorts, pane sizes) in
  every IDE: the setting `OBJECT_BROWSER` is in `BLANKED_KEYS`, and the IDE saves nothing, so the
  light pass opens it as the dark one did. `Object_Browser` chooses Inventory and Total by real
  clicks, so that the Description shows a declaration and its line.

## The "Running and debugging" chapter

Setup `debugging` (three parts): the code-chapter project with `test/shots/debugging/`
staged onto it as well, a module `Checks` with the chapter's `FillTable` (a Subscript error on
its fourth pass), `PingLater` (`Shell "ping -n 20 127.0.0.1", vbHide`) and `WaitAWhile` (a
`DoEvents` loop of a minute at most). It is a setup of its own because the code chapter's
combo boxes list the project's modules. Its pictures are under `docs/IDE/Debugging/Images/`,
plus `Menu_Debug` (paused, the code focused) and `Menu_Run` (WaitAWhile running).

- **Each picture starts from nothing** (`debugReset`: the program stopped, no breakpoint, no
  watch, no tab, the default layout, an empty DEBUG CONSOLE) and leaves the IDE so. Most stop
  `Main` in `Inventory.Total` at the loop line (`pausedInTotal`, first or second pass);
  `pausedInMain` stops it on Main's last line.
- **What changes from run to run is set in the page before the capture**: an object's
  `{object: N}` (`OBJECT_ADDRESS`), the Variables tooltip's `Pointer` (`POINTER_TEXT`), the
  PROCESS box's id (`PROCESS_ID`), and the console's times and `time taken` (`fixConsoleTimes`).
- **The ping ends with the run**: the box's own Terminate, else `killTree` on the id the console
  printed (`endPing`).
- A tree row is expanded with a click on its plus box, made again until the flip holds
  (`toggleRow`); the Variables edit box opens with a double-click made again the same way.
- The Variables tooltip is taken with the panel docked (a floating panel is drawn over it), once
  it has the class `visibleTooltip` and its fade has ended: before that it is laid out, hidden,
  at another place.
- The DEBUG CONSOLE is never cut out: a cut-out shows the line it measures text with. Its menu
  is opened inside the panel instead.
- A line for the console is put in its input row whole and entered (`consoleRun`): a space typed
  while the row's completion list is open accepts the list's first entry.
- **`Tutorials/Images/Assert_Failed`** (setup `assert`, `test/shots/assert`, AssertDemo): the
  Testing with Assert tutorial's StringUtils and TestStringUtils, with Assert referenced and
  `PadLeft` given a bug (it pads on the right), taken as Error_Panel is: `RunAllTests` run with
  F6 and stopped at `TestPadLeft_Normal`'s assertion. The caret goes at the start of the
  `Debug.Print` line's code: four characters in, it is past the column where `End Sub` ends, and
  F6 finds no procedure (the defect Running.md states).

## The "Designing forms and reports" chapter

Setup `forms-chapter`: the fixture `test/shots/forms/`, FormsDemo, which refers to VB, the App
global object and WinNativeCommonCtls (for the Toolbox's COMMON CONTROLS group). `frmMain` (380 by
270, multi-coloured grabbers on) has a File menu (Open, a separator, Exit), Text1, Label1,
Command1, Check1, Frame1 holding Text2, and the control array Command2(0) and (1); `MyReport`
has a Label in Report Header and a Line and a Label in Report Detail. Its pictures are under
`docs/IDE/Forms/Images/` and `docs/IDE/Reports/Images/`, plus `Menu_Format_HorizontalSpacing`,
taken with Command1, Check1 and Command2(0) selected (the page's own example of **Left** 10,
140 and 250), so that Make Equal is live. `Designer_PackageNeeded` is taken in setup `settings`,
whose project does not refer to the VB package.

- **Each picture starts from nothing** (`formsReset`: no menu or dialog, every tab closed with its
  changes discarded, the default layout), then opens its designer (`formsDesigner`) and selects
  with real clicks (`selectNamed`: a click, then Shift+clicks; `Command2(1)` names an array
  member).
- **The striped ground round a designer is not steady**: it differs by a few dozen pixels from
  one capture to the next, so a picture with much of it never gets two equal captures.
  `groundUnsteady(c, clip, over)` gives `capture` the editor area under the tab row as
  `unsteady`, less the form's boxes, the tabs and `over` (a menu, a list, the panel and, in an
  annotated picture, each label and arrow of the overlay from `layerBoxes`; the overlay's own
  box is too big for it). The form, its menu bar and its readouts are compared only 2 pixels in
  from their edges, a readout only between its rounded ends: the ground shows through their
  edges and shadows, and a 2-pixel band there fails Designer_Locked now and then. A cut-out
  (`keep`) avoids the ground altogether.
- **The container's red outline is an animation** (`borderBlink`, the outline red half the
  time), which the quiet style sheet stops where the outline is transparent. Controls_Container
  holds it at its middle with a style of its own (`tbShotBlink`, `animation ... -0.25s paused`),
  removed afterwards.
- **The TabIndex circles show while Ctrl is held**: a `rawKeyDown` of Control, settled by the
  designer's class `designerShowTabIndex`, and the key released after the capture. The pointer
  stays on the form where it clicked, and the shot waits for its readout: moved away, the
  readout shows or not by the moment the pointer left, and the picture changed between runs. A circle is
  drawn only on a control whose **TabStop** is True (the designer sets `data-tabindex` only for
  those), so Label1 and Frame1 have none.
- **The designer reverses a menu's children from the file**: the fixture lists Exit, `-`, Open
  so that the drop-down shows Open, the separator, Exit.
- **The zoom box is set by a `change` event on `#zoomSelect`**, never by the arrow keys, which
  also move the selected controls. Designer_Zoom shows the box and its list only, four rows of
  it: the Light theme's list has a smaller font, and the whole list makes the light picture 100
  pixels shorter than the dark one. The form at 50 % is a picture of its own, Designer_Zoom50,
  taken `once` (dark only, owner): the grid is turned off for it first with the command
  `tbFormDesigner_TurnGridIndicatorsOff` (what the toolbar's grid button toggles; settled by the
  form's style changing), because the scaled dots differ in every capture even with the ground
  left out. The change is the form's (its tab shows it changed, so the clip is formStateShot's,
  without the tab row), and `formsReset` discards it: the shots after it keep their dots. The
  designer scales the form with an inline `zoom: 50%`, under which the snapshot gives the boxes
  zoomed and the computed lengths not (font-size 13px in a control 55 px wide); the converter
  scales them by each element's effective zoom (`applyZoom`, `snapshot-svg.mjs`), and the SVG is
  0% strongly off its PNG.
- **The Toolbox is scrolled with the mouse wheel**: a capture never holds more than the real
  window's height, so a taller page does not show more of it. Show Control Names is set from the
  panel's `...` menu and put back afterwards (saved nowhere). The search of Toolbox_Search is
  ended (the box focused, Escape) after the capture, or every later picture's Toolbox lacks
  tools.
- **A report's PAGE WIDTH, LEFT MARGIN and RIGHT MARGIN bars show only under the pointer**
  (opacity 0, 1 on hover): Report_Controls rests the pointer on PAGE WIDTH.
- **Preview_Window** is a running program's window, taken once with `captureWindow` from the
  IDE's desktop, with its File menu open. A key pressed on a private desktop reaches no window,
  so the menu is opened as Alt+F opens it: `postWindowMessage` (`tb-ide.mjs`, the `post` mode
  of `tb-launch.ps1`) posts `WM_SYSCOMMAND` `SC_KEYMENU` `'f'` to the form's window. The menu is
  then a top-level window of class `#32768` of the same process (`openMenuWindow`); both windows
  are captured (`windowPicture`, whose user-name check covers the menu's window texts too) and
  `withMenu` lays the menu's picture over the form's where it is on the desktop, the ground
  beyond the form transparent. The menu is drawn with its mnemonics underlined, as the keyboard
  opens it. `WM_CANCELMODE` posted to the form closes it before the run is stopped.
- PROPERTIES shows no description line: in BETA 1005 its text is set in a footer of the
  designer's own properties box, which is 0 pixels wide, so nothing is drawn.

## The "Projects and files" chapter

Setup `projects`: the fixture `test/shots/projects/`, MyProject (a form, `Legacy.bas`, `Startup`,
and `Util` and `Thing` in a `Helpers` folder, `Resources/MANIFEST/#1.xml`), with
`Resources/ICON/AppIcon.ico` staged from the install's template icon, as the sample's is. The
project file the lane opens is `project.twinproj`, the name the title shows. `projects-refs` is
the same project with Microsoft Scripting Runtime's symbol overridden as `SR` and a type library
that is not on the machine (`MISSING_LIBRARY`) put in the staged `Settings`; the IDE opens
Project Settings by itself a second after loading it, and the setup's prepare closes it.
`projects-start` is the IDE with no project. Its pictures are under `docs/IDE/Projects/Images/`;
`Menu_File_Project` is the File menu with the project open (the Menu pages keep `Menu_File`, with
none, which `New Project.md` also shows).

- **Each picture starts from nothing** (`projectsReset`: no menu or dialog, no tab, the default
  layout, the file view) and opens the tree's folders it shows itself (`peFolders`).
- **What a picture changes in the project it undoes**: frmMain.tbform renamed frmA.tbform is
  renamed back after NO; the folder Tree_Tints adds and the module Title_Changed adds are deleted
  (`peDelete`: the row clicked first, so that Delete goes to the tree, then the box's Delete); the
  lines Tree_Tints puts in Util and Startup (an undeclared variable, a `ReDim` that declares one)
  are undone. The project stays changed from the first of them on, which only Title_Changed and
  Close_Question show, and each of those makes the change itself when the title has no dot
  (`projectChanged`).
- **`headerButton` and `panelSel` name a floating panel only.** The docked Project Explorer's
  title-bar buttons are found inside `PE_SCOPE` (`peButton`); its Search button is drawn only in
  the object view, which is how `peObjectView` tells the views apart.
- **The tree's tints are text colours and dots, not row colours**: an error row has a red dot at
  its right, and in the dark theme its name and its folders' names are a light red (255, 230, 230
  against 216, 203, 203); in Light only the dot shows. A warning row has a yellow dot and a yellow
  name in both.
- **A rename box selects the base name a moment after it takes the focus**: Rename_Box waits for
  the selection, not the focus.
- **A row's priority arrows in Enabled Libraries show only under the pointer** (CSS `:hover`),
  grey until the pointer is on the arrow: References_Detail rests the pointer on Microsoft
  Scripting Runtime's name. It has no SVG (`c.shot.svg = null`): the converter does not draw a
  line-through, and the struck `Scripting` is what the picture shows.
- **The Recent tab's double-click on a project that is gone closes the New / Open dialog** before
  the box opens, so Failed_To_Load is the box alone. The entries are `RECENT_GONE`, set with
  `setRecents` in the page; Keep It closes the box (its Remove It would call `RemoveRecentsList`,
  which `PAGE_DEFAULTS` blocks anyway).
- Settings_Close types into the description box with real keys, after `templateBuildPath`, and
  closes the question with Yes, close, which keeps nothing.
- **Export_Console** is File > Export Project with Export Verbose off (owner: the verbose `DONE`
  lines show `&#92;` for each backslash). `stageProjects` sets `project.exportPath` in the
  staged `Settings` of both projects setups to `PACKAGE_ROOT\Export` (`PJ_EXPORT`), so that the
  first line names no user; the shot removes that folder before the export and after it, because
  a second export without Export Verbose into the folder the first one filled wrote no `COMPLETED`
  line within 60 s (BETA 1010; not narrowed, not queued: owner, record only). The
  console is floated (docked, it is too narrow for the first line) and emptied with its Clear
  button before the export, and emptied again afterwards; the shot is the setup's last. The
  times are set in the page (`fixConsoleTimes`). Both lines fit with no scrolling.

## The "Building" chapter

Several setups, their fixtures under `test/shots/building/`, copied from the Building lanes'
`test/ide/probes/building-{exe,ax,pkg}`: `exe` is Program, a Standard EXE whose Sub Main waits a
minute (so that a second build finds its file in use), `ax` is ShotActiveX, an ActiveX DLL whose
class has GUIDs of its own (`B01D...B001` to `B003`, not the lanes', so that a lane and a shot run
at once never share a registration), and `pkg` is MyPackage, a PRIVATE package. Each project is
staged in a folder of the tool's own on `PACKAGE_ROOT` named for its setup (shown as
`C:\tbshots\Building` and so on), with the templates' build path, so that a console line names no user; the setup's
`end` removes the folder once its IDE has ended. Its pictures
are under `docs/IDE/Building/Images/`.

- **`building`** (exe): the console after a build, a failed build and a build refused by the
  running exe, the configuration box's list, and the safe-mode box. **`building-new`**: an IDE with
  no project, then New Project's Standard EXE tile, Open and Continue, for the box Build opens on a
  project with no file. **`building-ax`**: Clean after a build of `ax`. **`building-hklm`**: `ax`
  with Register DLLs to HKLM, packed before an IDE with no project starts and opened from the
  Recent list by the warning's picture (the IDE is not elevated, so nothing registers).
  **`building-llvm`**: `exe` with `+llvm`. **`building-pkg`**: `pkg`.
- **The console is floated 900 wide and grown a row at a time until the picture's lines show
  whole** (`fitConsole`): its rows are in a `.listItems` box that clips them, and its list keeps
  copies of rows that are not shown, so a row or a link is judged by where it is drawn
  (`elementFromPoint` for a link). Then it settles, and only then are its times set in the page,
  and the LOCKED BY pid set to 4120 (the page's own example): a resize draws the rows again.
- **The console's scroll bar thumb is put at the top of its track in the page**
  (`fixConsoleThumb`). Its lines fit, so the thumb is the track's whole height, but the console
  leaves it a few pixels up or down where an earlier length of the list put it, differently from
  run to run; the shot fails if the thumb is not the whole track.
- **The IDE behind the console is hidden for the capture**, its ancestors' other children marked
  and set `visibility: hidden`, on a ground of the panel's colour, with no shadow. The SVG
  otherwise draws the IDE under the panel, and the editor there is laid out a pixel taller or
  shorter from run to run. It is not a cut-out (`keep`): that sets everything inside the panel
  visible, and the console's hidden copies of its rows would show over the real ones.
- **The locked exe is started with Launch EXE** (a real click; the compiler runs it on the IDE's
  desktop) and ended with Terminate after the capture; the shot waits for the exe's end by its pid
  and the console's `exited` line, and ends it by its pid if it still runs.
- **Safe_Mode** opens the box with a click and chooses with Down and Enter, twice (win64, then
  safeMode, each a compiler restart), and goes back with Ctrl+F2. **Configuration_List** is the
  toolbar's group between its splitters, the list a replica (`listClip`); the Light theme's list
  is shorter.
- **Every ActiveX build is followed by Clean**, in a `finally`. The HKLM project's Clean shows the
  Delete It And Continue box, whose Cancel stops it, and the DLL (registered nowhere) is deleted from
  the setup's folder. A setup's `end`, run once its IDE has ended, checks that none of the
  fixture's keys (`axShotKeys`: class, interface, type library and ProgID, both views, HKCU and
  HKLM) exists, and reports one that does; nothing removes a key.
- **Compiling** holds the build's last progress event (-1) in the page until the capture, so the
  box stays at the 0.0% the compiler sends before it (LLVM sends no other value). The setup leases
  the LLVM cache before its IDE starts (`holdLlvmCache`) and its `end` releases it; a Community or
  Personal licence fails the setup.
- **Nothing reaches the package server**: `building-pkg` installs the Building lanes' `guard`
  (CDP blocks `*everythingaccess*`, the page's XMLHttpRequest and fetch send nowhere and record), and
  each picture fails on a recorded request or a `[PUBLISH] attempting` line. The saved publisher
  name and password are emptied in the page; Publish_Confirm sets a made-up publisher
  (`ExamplePublisher`) and a session id in the page and cancels the box; Publish_Result is the
  IDE's own `showModalNotification` with the success text. The pane floats at the bottom left, out
  from behind the boxes.

## The "Starting a project" chapter

Several setups, their fixtures under `test/shots/starting/`: `Throwaway` is the Starting lanes'
`test/ide/probes/starting`, `Ledger` (a form, a module and a class, no manifest) and `Missing` (a
`.vbp` naming `Gone.bas`) come from the trial's cases C, G and K. The `.vbp` fixtures are staged
with CRLF, and every project is in a folder of the tool's own on `PACKAGE_ROOT`, named for its
setup, which the setup's `end` removes. Its pictures are under `docs/IDE/Starting/Images/`.

- **`starting-first-run`**: the licence agreement, the reporting question and the first-run IDE
  Options. The IDE reads `--no-save-ide-settings` in `parseCommandLine`, after those dialogs, so
  they run over the guard of `scripts/lib/shot-first-run.mjs`, in from the document's start
  (`Page.addScriptToEvaluateOnNewDocument`, then `Page.reload`), in front of the defaults hook:
  it answers the three first-run keys, and records and blocks every `SaveIDESetting` and every
  other call that writes or ends the IDE. A second proxy under the hook records any of those
  that reached it. The setup's `end` prints the record, and fails on an entry in `through` or on a
  changed hash of `IDESettings` (`settingsHash`, `reg query` read in memory, nothing written).
- **The guard's answers follow a real call to the host.** The page reads its theme files by host
  calls made before it asks for `GENERAL`, and the host answers in order, so a first start draws
  its dialogs in the theme. An answer made in the page alone overtakes those reads:
  `buildThemeData` finds no theme, and the dialogs have no frame and no background.
- **Each take makes a first start and ends with a page past it** (`SETTLED`: agreed, reporting
  off), however it goes, so that no first-run page runs on. The reporting question is answered
  **NO**: it leads to the same IDE Options, and `g_ErrorReporting` is never set.
- **Light**: a first start is always in the dark theme, so the Light picture is that dialog with
  the theme switched by its own command at the agreement, which is why the IDE Options read
  Light. The clip is the dialog and 40 CSS px of the banner round it.
- **`starting`**: Enter Licence Key, the search, Recent (VB6) and the three New Project Options
  boxes, each cancelled, so that no ActiveX project is ever made; the shot checks the licence box
  is empty. The picker `OpenProjectVBP` is answered from `__shotAnswers`, VB6's list from
  `__tbVb6Recents`, which the defaults hook answers. A box's clip starts at the next whole CSS pixel: it can
  start half a pixel into the progress box behind it.
- **`starting-new`**: a new Standard EXE and an import, each made again by its take, since a take
  leaves the project changed. Its compiler starts on `licenceKey = ""` in the page, as in
  `community`, and the take fails on any badge but COMMUNITY EDITION. `FormDesignerId` is a new
  GUID in each new project and the log's first line holds the time, so each is set in the page
  once the real one shows (`fixDesignerId`, `fixImportTime`). `Title_Unsaved` is a composite of two
  crops of `#rootMenuText`.
- **`starting-boxes`**: the compiler's two native boxes, `once: true`, `window: true`, found by
  `compilerBox` and closed with `BM_CLICK`. Each is a window alone. Over a maximized IDE the box
  stands on the text of the progress box, and it is unaware of the display's scaling, so PrintWindow
  draws it at 96 DPI in the corner of a bitmap of its scaled size, black round it (`drawnPart`),
  where the IDE's window is 1.5x. It is made the active window, and sent `WM_UPDATEUISTATE` to hide
  its focus cues, which came and went from run to run.
- **`Damaged_Box`**: `Throwaway` packed, its `Settings` entry moved to the front (impexp writes it
  last, the IDE first) and the file cut in the middle of its last source, so that `Settings` is
  read whole: damage inside that entry is an endless loop of the box. It is opened from the
  tool's own Recent list and closed unsaved, and the take fails if the file changed.
- **Nothing of a project reaches the registry.** These setups add `AddRecentsList` and
  `SaveProjectMetaState` to `PAGE_DEFAULTS`' blocked calls.

## The "When something goes wrong" chapter

The setups `troubleshooting` and `troubleshooting-box`, the fixture `test/shots/troubleshooting/Trouble`, the lanes' `test/ide/probes/troubleshooting`
under another name: `Sub Crash` calls `RtlMoveMemory` with two bad addresses at line 10 of `MainMod`, the
line the page quotes. Its pictures are under `docs/IDE/Troubleshooting/Images/`.

- **`troubleshooting`**: one IDE, the project in a folder of the tool's own on `PACKAGE_ROOT`, its
  compiler restarted on `licenceKey = ""` as in `community` (`communityCompiler`), and
  `AddRecentsList` and `SaveProjectMetaState` blocked as in `starting`. Every take that shows the
  status bar fails on any licence badge but COMMUNITY EDITION, after its restarts too (`communityBadge`).
  It calls `defaultLayout` once as it prepares, because `Native_Exception`'s float ends with that
  call and the call moves Light's panels a device pixel: without it a picture comes out one way
  alone and another after that take.
- **`Services_Limited_Tooltip`, `Please_Wait`**: `whileConnectHeld`, which `Services_Limited` also
  uses, restarts with the button and holds one of the page's three `connect` calls. The tooltip's
  picture holds `lspSocket.connect`, so that FS reads OPERATIONAL and LSP and DEBUGGER Disconnected
  (LSP reads Connecting only once the call is made), and it shows the badge's own `title` in the
  replica. Its clip takes in the licence badge whole, which the tooltip stands over, and stops 3 CSS
  px above the tooltip, since a line of the console is cut there. `Please_Wait` holds `fs.connect`:
  the box stays at 10.0%, no missing package and no native box needed, and the clip is the editor's
  width and 190 CSS px above and below the box.
- **`Crash_Loop`** (the whole window): a restart by the button starts the count again with its one
  entry, then three kills, each by the pid in `g_CurrentCompilerProcessId` (`killTree`), the first
  two waiting for the project to be back. The take then has the float and the box together, its
  console's times set in the page, and ends on the box's OK and Ctrl+F2, about eleven seconds
  (`leaveSafeMode`). Start is never pressed in Safe Mode.
- **`Safe_Mode_Bar`** is a composite as `Title_Unsaved` is, the left 474 CSS px of the toolbar over the
  left 474 of the status bar: in a whole window the box and the badge are at opposite ends and shrink
  with the page. The box is set in the page, OK is pressed, and each theme's take comes back to win32.
- **`Native_Exception`**: `Crash` run as a line of the console runs it, the console floated 1060 CSS
  px wide so that each line is one row. `debugConsoleContent` keeps a row's height from when it was
  first measured, in whatever width the console had, and draws only the rows that show, so the lines
  are read from its `dataNodes` and the take calls `recalcCachedItemHeights`, as a resize does, and
  waits for three rows of one line each. The time and the address differ from run to run and from
  boot to boot, and are set in the page to the page's values (`fixNativeLine`). The two yellow lines
  come only from the first exception with `g_TraceMode` off, and it then stays on: the take fails
  unless there are one red line and two yellow ones, and ends with TRACE mode off by Help's
  command, with the restart that brings.
- **Lane.close and the exception.** `Lane.close` counts the console's `NATIVE EXCEPTION` lines and
  throws; a kill writes none. `Native_Exception` asserts that its own one is the only one and
  clears the console, and that is the whole allowance: any other exception stays in the console, and
  `closing` fails the setup on it, since `endRun` only prints what `Lane.close` throws.
- **`Menu_Help_Trace`**: `menuShot` with `Menu_Help`'s clip, TRACE mode switched by `before` and back
  by `after`, each with its restart; its `check` fails the picture unless the item reads Enabled with
  its `codicon-check`.
- **`Floating_Boxes`**: three messages the IDE gives, sent by `msgBox` in the take. The middle
  one, `msgBox2` (`msgBox1` is the newest, at the bottom), is the IDE's *Backend compiler seems to be
  busy* message, the only one here long enough for a click to change what shows; it gets a real
  click. The boxes last 60 s, so the take closes them with their own close calls.
- **`closing`** prints `__tbDefaults.reports`. The defaults hook answers `ALLOWERRORREPORTINGV3` no, so
  `postError` returns at once and the exceptions explain 0: anything else fails the setup, as does
  a request for the report's address, which CDP's `Fetch` stops and counts, and a JavaScript dialog.
  A take fails on a dialog too (`noAlert`): an alert cannot be captured.
- **`troubleshooting-box`** (`noPage`): the lane's copy with `bin\twinBASIC_ide_win32.dll` renamed,
  `launchOnDesktop` with `IDE_FLAGS`, and `boxPicture` of `starting-boxes`, `once`, `window`. The take
  fails unless the box's text is the one the page describes; it names `bin\twinBASIC_win64.dll`,
  which is there. OK ends the process, and one that outlives the box is ended by its pid.

## Special IDE states

- **`Services_Unavailable`**: the badge in the `no-project` setup. With no project the badge's
  title reads each service `Not initialized`; all four read `Disconnected` only for the 0.1 s
  between a compiler ending and the IDE starting the next.
- **`Splash_Screen`** is not a window of its own: it is the IDE's modal dialog
  (`showSplashWindow`, HTML in the page), shown only when the IDE starts with no project and
  closed after 2.5 s by a timer, which then shows New / Open Project. The shot calls
  `showSplashWindow` itself and holds the one 2.5 s timer the call starts until the capture,
  then runs it. It has a setup of its own (`splash`): the sponsors' logos are scaled one of two
  ways by what drew them earlier in the same IDE (8,795 pixels apart; in `no-project` by whether
  the start-up splash came before or after the 2x override, and in `project` About's light
  picture changed with the splash taken before it), and the New / Open Project dialog its close
  shows leaves the status bar's badges a pixel shorter for the shots after it.
- **`Licence_CommunityEdition`** (setup `community`): the IDE reads the key from IDESettings
  into the page's `licenceKey` and passes it to each compiler it starts; the compiler answers
  with the edition and hands the key back, and the IDE saves it only when it differs. The tool
  sets `licenceKey = ""` in the page and restarts the compiler with the toolbar's button: the
  registry value is never read, changed or removed by the tool, and the save is one
  `--no-save-ide-settings` stops (`LicenceKey`). `doCommunityNagScreens` runs; its only screen is dated
  1-7 January 2026.
- **`Services_Limited`** (setup `community`): LIMITED is never a lasting state. The page draws it
  for about 0.6 s while a compiler starts (its own connection up, the page then connecting FS,
  LSP and the debugger one after another, once the compiler has loaded the project). Closing one
  connection from the page is no route: the browser takes 60 s to close it (the compiler never
  answers the closing handshake), the IDE then draws LIMITED for 0.1 s, the compiler ends, and
  the IDE starts another. `Network.setBlockedURLs` does not stop a WebSocket, and throttling the
  page's CPU (`Emulation.setCPUThrottlingRate` 40) holds LIMITED but makes every evaluation time
  out. The shot holds the page's `fs.connect` call of a restart (the toolbar's button) until the
  capture and then makes it as the IDE did (`whileConnectHeld`). The restart's DEBUG CONSOLE line names the project's
  folder, under the user's, and Clear does nothing until the compiler is connected, so
  `nameUserAsUserIn(c, ".debugConsoleOuter")` replaces the name there in the page; the console
  is cleared with its button once the compiler is back.
- **The tooltips** (`Services_Unavailable_Tooltip`, `Services_Operational_Tooltip`) are
  **replicas** (owner). A native
  `title` tooltip never appears on a private desktop: neither a CDP mouse move
  over the badge nor a `WM_MOUSEMOVE` posted or sent to any of the page's three windows
  (`Chrome_WidgetWin_0`, `Chrome_WidgetWin_1`, `Chrome_RenderWidgetHostHWND`) made a new
  top-level window appear in 3 s, and the page saw no hover from the messages. Real input
  reaches only the desktop on screen. So `tooltipOn` (`shoot_docs.mjs`) puts one `div` into the
  page, holding the badge's own `title` read live, styled by `TOOLTIP_CSS`, placed as Windows
  places a tooltip by the cursor (cursor taken at the badge's middle; the badge is at the
  window's bottom, so it goes above), captured alone and removed, in the badge's own setups
  (`project` for OPERATIONAL, `no-project` for UNAVAILABLE). The style is fitted to a real
  Windows tooltip (154x73 and 158x73 px) by rendering the same text in puppeteer's Chrome at 1x: Segoe
  UI 12 px (9 pt), 16 px lines, `#242424` for the 1 px border **and** the text (a real
  tooltip's darkest text pixel is 36 grey levels, not black), 7 px side padding, 3 above and 4
  below, the width rounded up to whole pixels. That gives the same size to the pixel and a mean
  luminance difference of 0.4 grey levels (maximum 9). In the
  IDE at 2x, shown at half size, OPERATIONAL is 158x73 (its text a
  little softer than a 1x ClearType picture: mean difference 8 after a box-filter to 1x).
  **The text is the IDE's live one**: with no project the badge's title reads each service
  `Not initialized` (`Disconnected` is the state for 0.1 s between
  compilers), so the UNAVAILABLE picture is 155x73 and its alt text says Not initialized. The
  replica does not follow the theme, so the Light pass takes the dark pixels and keeps no
  `.light.png` file.
- **Window capture, for the running programs and the Webpage pane**: `desktopWindows(desktop, {children})` and
  `captureWindow(desktop, hwnd, file, {flags})` in `tb-ide.mjs`, through `tb-launch.ps1`'s
  `TBBUILD_WINDOWS` mode (a thread put on the desktop with `SetThreadDesktop`, per-monitor DPI
  aware). On a private desktop `PrintWindow` with `PW_RENDERFULLCONTENT` (2) gives the IDE's
  window as drawn, WebView2 content included, and Notepad with its Windows 10 frame; flag 0 leaves
  the WebView2 areas white and black and draws a Windows 7 style frame. The picture is the
  window's rectangle at the desktop's DPI (144 here, so 1.5x, not 2x), including the invisible
  resize borders (`DWMWA_EXTENDED_FRAME_BOUNDS` would trim them). It returns the window's and
  its children's texts for the user-name check; text a window draws itself is not among them.
  About 0.5 s a call (a PowerShell start). The IDE's window class is `ThunderForm`; the Webpage
  pane's second WebView2 is a `Chrome_WidgetWin_1` child (title `Google`) of zero size until the
  pane shows. The capture also returns the visible frame (`DWMWA_EXTENDED_FRAME_BOUNDS`), the
  client area, a layered window's key and alpha, and whether the caption is drawn active
  (`WS_ACTIVECAPTION`). `activateWindow(desktop, hwnd)` makes a window the active one of its
  desktop (its thread's input attached for `BringWindowToTop`, `SetForegroundWindow`,
  `SetActiveWindow` and `SetFocus`) and says whether its caption then is. `tb-launch.ps1` is
  24,771 characters, its comment lines emptied, of the 30,000 its environment variable allows.

## Pictures of a running program

- **The program's window is captured by the harness** (`captureWindow`), not by the program:
  no fixture needs a capture module, and the frame is the system's.
- **Sizing.** The picture is the window's pixels at the desktop's DPI (144 here, 1.5x), cropped
  to its visible frame (the invisible resize borders are left out), and shown at its size at
  96 DPI: `keep` takes a `scale` from the shot (`{png, scale}`), 2 for every page picture.
  Not upscaled to 2x, which would add nothing. A run on a display at 100% writes 1x pictures
  with the same `{:width height}`. A shot is `once: true`: taken in the dark pass only, any
  `.light.png` removed; a job of them has no light pass.
- **Setup `programs`**: `test/shots/programs`, ShotPrograms, opened and built in the IDE; each
  picture starts the exe on a private desktop of its own (`launchOnDesktop`) with its command
  line naming the form, and the two take turns through files (`TB_SHOT_SIGNALS`: `shown`,
  `grow`, `grown`, `end`). An anchoring picture is one window before and after the program makes
  it 100 by 80 pixels larger (96 DPI), side by side 16 pixels apart on a transparent ground: no
  size pill, no hatched desktop. **The foreground is not dependable on a private desktop**: a program started on its own takes
  it and loses it again now and then, and one run from the IDE never gets it, so the form draws
  its frame as active (`WM_NCACTIVATE`) whenever it is not the foreground window; and no control
  takes the focus (`TabStop` off), since a focused one draws a caret or, now and then, a focus
  rectangle. Even so a form can draw its caption inactive now and then, so `programShot` makes
  the form the active window (`activateWindow`) before its
  captures and again whenever a capture finds the caption inactive (owner).
- **Setup `vbflexgrid`**: `test/shots/vbflexgrid`, FlexGridShots, the pictures of the
  VBFLXGRD18 section, taken as the `programs` setup's are (`flexShot`), one scene per command
  line. The fixture commits none of the package: `startWithPackages` stages a copy with VBFLXGRD18 at
  the version its Settings names, from TWINSERV through the `%TEMP%\tb-twinserv` cache. The grid's
  drop-down list and calendar are top-level windows of the program, laid over the form where they
  are (`overlaid`). **An edit closes when its box loses the focus** (the package destroys it on
  `WM_KILLFOCUS`, with no event to cancel), and the form, when `activateWindow` makes it active,
  gives the focus back to the grid: the fixture opens the edit again whenever it finds it closed
  (`KeepEditing`). The calendar's "Today:" line is set to a fixed date (`MCM_SETTODAY`), or the
  picture would change every day.
- **Setup `xcalendar`**: `test/shots/xcalendar`, XCalendarShots, the pictures of the xCalendar
  section, one scene per command line, taken by `sceneShot`, the package embedded by
  `startWithPackages` as `vbflexgrid`'s is. Its forms (`frmOne`, `frmTwo`, `frmThree`: one, two
  and three calendars, with hidden Labels) are written by a kit script. The
  calendars are reached through the form's extender (`As Object`): the type `xCalendar.xCalendar`
  has no `Move`, `Left` or `Width` (TB5027). Every calendar shows March 15, 2026, set as `Value`
  to the 16th and then `PreviousDay`, since `Value` in another month and `FirstDay` leave the
  grid's dates as they were until the selection moves (the page's Known problems). The areas
  picture's labels are Labels of the form, in the IDE labels' dark red, with lines drawn by the
  form (`AutoRedraw`): the annotation layer draws on the IDE's page only, and a line ends at the
  control's edge, since the form draws nothing over a child window. The heights it labels are
  worked out as the control does (a line of the font plus the margins).
- **Setup `vbccr`**: `test/shots/vbccr`, VBCCRShots, the VBCCR18 section's picture of each
  control, the package embedded by `startWithPackages`. **A picture of one control has no form
  round it** (owner, 2026-11-19): a scene is a *sheet*, a form with several controls on it, each
  as a program would use it, and `clipShot` cuts each control's picture out of the sheet's one
  capture, with `CLIP_MARGIN` pixels of the form's ground round it. The program writes the
  rectangles to the file `clips` in the folder of the signals before `shown`: a line for each
  picture, its name and its left, top, width and height in pixels of the client area at 96 DPI
  (`Place` writes a control's, `Clip` any other, such as two option buttons together).
  `sheetOf` takes a sheet once for a setup's run and keeps it by the setup's `ctx`, so a sheet
  of five controls is one program start. A control whose picture needs a pop-up (a dropped list,
  a calendar) gets a scene of its own, taken by `sceneShot`: on a sheet the pop-up would cover
  its neighbours. Any program setup can use `clipShot`. The sheets' forms (`frm<Sheet>`) and
  Settings are written by `kit/vbccr/make-shots.mjs`; `MainModule.twin` is written by hand. A
  control's own designer properties, such as a Style that raises 382 at run time, go in its
  property bag (`_IPersistStreamData`), which make-shots writes from a `bag`
  ([WIP.VBCCR18.md](WIP.VBCCR18.md), *The package*).
  **A picture of states, styles or an enumeration's values is a whole form** (owner), taken by
  `sceneShot`: one control per value side by side, each labelled by the program with its
  setting. A folder control's pictures go in `<Control>/Images/`, as VBFlexGrid's do. A tree
  draws its selection in the highlight colour only with the focus: `FocusOn` gives it the focus
  once the form is shown. No fixed wait stills a progress bar: at 0.6 s a bar at 60 was
  once taken at 48, at 1.5 s with its light running along it. `StillBars` gives each bar one
  more than its value and then its value (a themed bar shrinks without an animation), and stops
  its timers at once.
  **The fixture has the visual-styles manifest** (`Resources/MANIFEST/#1.xml`): without it the
  package finds version 5 of the common controls, and LinkLabel and CommandLink make no window
  (LinkLabel draws a hatch in its place). The sheet's controls are reached through
  `f.Controls(name)`, late bound, so a wrong member name is a run-time error, which the tool
  prints with the control's name. Progress bars are stilled as `commonctls`'s are.
- **Setup `dialogs`**: `test/shots/dialogs`, DialogShots, the pictures of the VBComDlg and
  AutoCompleteLib sections, both packages embedded by `startWithPackages`. A CommonDialog's dialog
  is taken as the `vb` setup's MsgBox is (`programDialogShot`, which `vbDialogShot` calls too): a
  timer in the program finds it by its title, keeps it active and in a mouse user's state, and the
  tool ends the program. The Find and Replace dialogs are modeless and kept by the program's own
  loop. The Folder Browser's root is a folder Projects that the program makes in the folder of the
  signals, so the tree shows nothing of the machine; the new-style tree fades its expand buttons
  with the focus, so the fading is switched off (`TVS_EX_FADEINOUTEXPANDOS`). **The Font dialog
  lists the machine's fonts**: its list is scrolled to start at Microsoft Himalaya
  (`CB_SETTOPINDEX`), so that the rows around Microsoft Sans Serif hold only fonts that come with
  Windows or Office, and none of the novelty fonts this machine has. **File Open and File Save are
  taken hooked** (`HookEvents` True with `CdlOFNExplorer`): a hooked dialog is Windows' older one,
  whose places bar names no folder of the user's, while the newer one (no hook) has a navigation
  pane of the user's own folders and a breadcrumb of the real path, user name included: not
  taken (owner's idea, not started: intercept, in the program, the shell calls that fill both).
  Their folder Reports is the program's, its files' times set to 15 March 2026 10:30
  (`TheTime`), and the dialogs show their access keys again after the first `WM_CHANGEUISTATE`,
  so it is sent at every tick and the picture waits ten. **Page Setup** uses Microsoft Print to
  PDF (`PrinterDefaultInit` False), not the machine's default printer. **The Print dialog is not
  taken** (owner): it lists the machine's printers by name. The AutoComplete scenes type
  `Ap` into a text box (`WM_CHAR`, as the package's test cases do) and lay the suggestion list
  (`Auto-Suggest Dropdown`) over the form, three runs in a row (`sceneRuns`); the caret is hidden,
  since it blinks.
- **Setup `vb`**: `test/shots/vb`, VBShots, the pictures of the VB, VBRUN and VBA sections
  (the VB package's controls, a form's drawing, its menus and MDI forms, MsgBox and InputBox),
  one scene per command line, taken by `sceneShot` as `vbflexgrid`'s are; the VB reference's
  library symbol is `*VB`, for the QRCode's members. Each scene lays its form out in pixels at 96
  DPI (`FitClient`: the form's client made the size in twips, then `Scale`d to those pixels).
  Most controls are made in code (`Controls.Add`), which in BETA 1042 makes only a class that
  some form already holds (else error -2147467259): `frmScene` holds one hidden control of each
  class, the ListBox whose `Columns` needs design time, and the five QRCodes, which `Controls.Add`
  does not make at all. A control inside a Frame is placed in twips (a Frame has no scale). The
  forms of `formborders` are `frmBorder0` to `frmBorder7`, each with its `BorderStyle` at design
  time: set at run time, it gives the tool windows and the fixed dialog no extended style
  (`WS_EX_TOOLWINDOW`, `WS_EX_DLGMODALFRAME`), so they draw as ordinary windows; `Show` puts a form
  with `vbStartUpScreen` in the middle of the screen whatever `Move` said, so the forms are moved
  after. A `.tbform` lists a menu's items last first, and `ShortcutId` shows its text only when
  set in the `.tbform`. The menu is opened by the tool (`vbMenuShot`, SC_KEYMENU 'f', as
  `Preview_Window`). A dialog's scene shows no form: `vbDialogShot` starts the program once per
  dialog, takes its one window and ends it, laying several out in rows (`inRows`); a timer in the
  program, which runs inside MsgBox's modal loop, keeps the box's caption active and puts it in a
  mouse user's state (`WM_CHANGEUISTATE`: no focus rectangle, no access-key underlines), which
  differs from box to box otherwise, then writes `shown`. The MousePointer picture draws the
  cursor each value makes the form set (`WM_SETCURSOR` sent, `GetCursor` read): vbIconPointer and
  vbSizePointer are left out, since for them the form sets a null cursor (BETA 1042). The system
  colours are Labels' `BackColor`, as twinBASIC paints them: `OleTranslateColor` refuses the
  indexes from 26 on. Not taken: the Report preview, whose first `DoEvents` after `Show` never
  returns on the tool's desktop, with or without a recordset, with the forms fixture's MyReport
  unchanged too (not narrowed).
- **Setup `commonctls`**: `test/shots/commonctls`, CommonCtlsShots, the pictures of the
  WinNativeCommonCtls section, one scene per command line, taken by `sceneShot` as `vb`'s are.
  `frmScene` holds hidden controls of each class (`lv0`--`lv3`, `tv0`--`tv7`, `pb0`--`pb11`,
  `sl0`--`sl7`, `mv0`, `dt0`--`dt5`, `ud0`, three ImageLists), which a scene places and shows;
  its `GetDayBold` handler bolds the MonthView's days (`DayBold` raises 380 for a month just
  scrolled into view, the visible range being cached at the last `MCN_GETDAYSTATE`). Every date is
  January 14, 2025, 3:45 PM, the calendars' "Today:" included (`MCM_SETTODAY`, `&H100C`; the
  DTPicker's calendar is dropped by `WM_KEYDOWN` F4 and dropped again whenever it has closed, its
  `DropDown` window laid over the form). A ListView is filled once visible: filled while hidden,
  `lvwIcon` shows none of its items and `lvwSmallIcon` places them oddly (BETA 1042, not
  narrowed). **A progress bar drawn with visual styles animates** (its growth to a value, the
  marquee, a light running along a normal bar) with timers of its own window: the fixture waits
  0.6 s for the bars to grow, starts the marquee, stops every timer (`KillTimer` on ids 0 to
  1000), gives the marquee's 30 ticks, and stops the timers again while it waits, since a bar
  moved again once the tool had the window. The marquee's block still lands a few pixels apart
  from run to run (its step is timed), so its track is left out of the picture's comparison
  (`png.ignore` in the manifest, owner). The ImageList picture draws one list of the default
  ColorDepth32Bit (icons) and one of ColorDepth24Bit (bitmaps on silver, the default
  MaskColor): an icon added to a 24-bit list draws on black (not narrowed: the stock icon's own
  mask, or the package's `RuntimeCreateScaledPicture`).
- **Setup `webview2`**: `test/shots/webview2`, WebView2Shots, the WebView2 section's one
  picture, taken by `sceneShot`: frmWeb's control `Web1` shows the page `Page` returns, passed to
  `NavigateToString` on Ready, and once NavigationComplete reports success, `Main` calls the
  page's `setNote` with `JsRun` and waits a second before "shown"; a control's Error or a failed
  navigation is written to "error". The control's user data folder is set on Create to
  `wv2data` in the run's signals folder (under `%TEMP%`), not beside the exe. The WebView2
  runtime starts on a private desktop, and `PW_RENDERFULLCONTENT` captures its content, byte for
  byte alike from run to run (BETA 1042). The control is 300 px high: at 280 the page shows a
  scrollbar.
- **Setup `cef`**: `test/shots/cef`, CefShots, the CEF section's one picture, taken by
  `sceneShot` as webview2's is, with the same page and the same `JsRun` line. The CEF runtime is
  not part of twinBASIC: the setup downloads the release the CEF page links
  (`cefRuntime145_win32.zip`, the exe's architecture) into `%TEMP%\tb-cef` once, and names its
  folder to the program in `TB_SHOT_CEF_RUNTIME`, which the form passes to
  `BrowserExecutableFolder` with a trailing backslash (the package joins it and `libcef.dll`
  with nothing between); `UserDataFolder` is in the run's signals folder, never
  `%LocalAppData%`, the package's default for both. `TB_SHOT_CEF_LOG` names a file for CEF's
  verbose log. **The control's place and size are in the `.tbform`, never set in code**: a
  CefBrowser moved before it raises Ready crashes its browser process, and raises neither
  Ready nor Error (BUGS-TO-REPORT, `bugs/cef-move-before-ready`, BETA 1042). The private
  desktop is no obstacle: CEF logs "No displays detected" and uses a fake display, and draws;
  two runs give the same bytes (BETA 1042). A browser process that
  crashes is the exe itself, so its dump has no names: run the exe under `cdb -o` on a leased
  desktop (`launchOnDesktop`) and dump with `/ma`, then match the faulting procedure's calls
  (imports, constants) against the package's source, exported with `impexp`.
- **Setup `waynes`**: `test/shots/waynes`, WaynesShots, the pictures of the CustomControls
  section, taken by `sceneShot`, or by `waynesRuns` for a picture of several runs in rows (the
  button's states, the six border styles). A form of the package is a window of class `tbForm`
  (in `FORM_CLASS`), has no default instance and is shown modally only, so `Sub Main` makes the
  scene's form with `New` and each form does its work on the ticks of its WaynesTimer
  `tmrScene` (`Shots.Tick`: SetUp on the first, "shown" after six more, then "end"). **A
  control's place and size must be in the `.tbform`**: one moved at run time is not drawn where
  it moves to, and the form's size and BorderStyle are fixed there too, so there is one form per
  scene. The forms are written by a kit script (geometry, names and texts only), and each form's
  code sets the styles. **A control read from a `.tbform` takes no defaults of its own**
  (`InitializeDefaultValues` runs only when there is nothing to read), so `Shots.Defaults` calls
  the public default routines of each state (`InitializeDefaults`, `InitializeDefaultValues`,
  `InitializeDefaultValues_Focused`) to give the look a control has when it is put on a form; a
  colour in a `.tbform` is ABGR, its alpha in the top byte (`&HFFD0D0D0`, the form's grey;
  without the alpha the form is black). `Controls` is Nothing at run time, so a control is
  reached by name with `CallByName`. A WaynesFrame keeps no ControlContext, so a fill set at run
  time is never drawn: the overview's frame has its fill in the `.tbform`. A form's Caption set
  at run time does not retitle its window, and nothing else of the window set in code reaches it
  (BUGS-TO-REPORT, `bugs/waynesform-window-ignores-code`): give a scene's form its caption, size
  and frame in its `.tbform`. Hover and focus are shown by mouse messages the
  program sends itself (with the thread's key state set to match); **PressedState and a text
  selection cannot be shown**: the controls read the mouse button and Shift from the hardware,
  so a button is told the button is up as soon as it is down. FontWeight is left out: with the
  renderer's one font, 100 to 500 draw alike and 600 to 900 alike (no FontStyle names a font).
- **85f25aa2** (Opacity 75, TransparencyKey red): `PW_RENDERFULLCONTENT` draws the key colour
  black and every pixel opaque, so the tool reads the key's pixels from a client-only capture
  (flags 1) and gives the picture the window's own alpha (191) and alpha 0 there: the page is
  what lies under the form, a plain background in each site theme.
- **021f6cbf** is the project run from the IDE (F5) with `debugger.immediateMemoryInvalidation`
  and `debugger.runtimeCommandLineArguments` "listview" in the fixture's Settings: a Win32
  ListView whose column headers get the pointer of a String freed on return (`DanglingPtr`)
  shows rows of warning signs; built as an exe, the same code shows the old text.
- **CodeLens** (`b0724fe2`, `351d0147`; setup `codelens`, `test/shots/codelens`, CodeLensDemo):
  the bar clicked for real, the editor above the DEBUG CONSOLE in a layout set in the page. The
  line times (the page's clock for some lines, the compiler's for `Debug.Print`) and the time
  taken are set in the page once shown. `Scale factor` prints what the lane's compiler reads,
  1.50 on this machine.
- **`Memory_String`** (setup `memory`, `test/shots/memory`, MemoryDemo): Sub Main run with
  Start to its `Stop`, the MEMORY 1 pane floated and sized to two rows, `s` typed into its box,
  which the IDE turns into `StrPtr(s)`; the fifteen characters and their terminating null fill
  the two rows, so no other memory shows. The string's address changes from run to run and is
  set in the page once the rows are read (`MEMORY_ADDRESSES`). The box can already read
  `StrPtr(s)` from the theme before, so the shot waits for the cell at the address to take the
  focus, which happens only once the rows are drawn for the new answer, and then blurs it.
- **`Toolbar_4`**: setup `designer`, the sample run with Start (`context.codeExecuting`) and
  stopped after.
- **`8d74d820`** (setup `package`) and **Fusion's `569099635`** (setup `fusion`): the paths the
  console names are on `PACKAGE_ROOT`, shown as `C:\tbshots`
  (`Lane.open`'s `buildPath`; the fixture's `project.fusionBuildPath` in the staged copy),
  removed at the end unless it was there before.
- **A Fusion host needs a Fusion reference that holds an ActiveX control.** `settings-fusion`'s
  three Fusion references (Windows Script Host Object Model, Shell Controls and Automation, ADO
  6.1) hold no ActiveX controls; each on its own makes the host build fail, with no cause
  given, in the lane's staging, with the IDE's placeholders, with the `Build` folder made first,
  with `projects\` copied, as a package or a Standard EXE, win32 or win64. A reference to
  MSCOMCTL.OCX (32-bit only, registered by VB6) with `fusionAllTo32` builds the host, win32 and
  win64: `test/shots/fusion` uses it, so the shot needs MSCOMCTL.OCX registered. Not queued:
  Fusion is documented for controls; a failure message that names no cause may be worth an
  issue.

## The tbIDE package's pictures

- **Setup `tbide`**: `test/shots/tbide`, MyAddInDemo, an add-in built into the lane's copy as
  `global-search` builds Sample 15, with `test/shots/sample` open: the tbIDE section's pictures
  of what an add-in makes. Each part of it is the sample of the page its picture goes on, so the
  picture shows that code at work: Toolbar.md's splitter and two buttons (`Toolbar`, also on
  Button.md), ToolWindow.md's window, which Action 1 adds (`ToolWindow`, and
  `ToolWindow_Docked`), and DebugConsole.md's two PrintText lines, which Action 2 prints into
  the floated console (`DebugConsole_PrintText`). Its icon is the install's Sample 10's
  `button1.png`, copied into the staged tree, not committed. **An add-in reads its resources
  with `LoadResDataInternal`**, as the install's add-in samples do: `LoadResData` is the VB
  package's, which neither an add-in sample nor the Standard DLL template references (TB5079
  without it); the class and the project must not share a name (TB5139).
- **Docking is a real drag** (`dockAboveProperties`): the grip at the left of a floating
  panel's title bar starts the IDE's own drag on the press (a `dragstart` it makes itself), and
  the docked panels take HTML drag events, so the mouse is pressed on the grip and moved with
  `Input.setInterceptDrags` on, and the drag Chromium begins is delivered with
  `Input.dispatchDragEvent` (enter, over, drop) near the top edge of PROPERTIES. The shot closes
  the window with its close button, and `defaultLayout` puts the layout back.
- **Setup `tbide-sample10`**: Sample 10 built and loaded, for its window of styled `div`
  elements on HtmlElement.md (`Sample10`). Sample 10 prints the project's path, under the
  user's profile, as it loads, so the setup empties the console first.
- The console picture shows the sample's "orange" line in yellow: PrintText ignores its
  colour (BUGS-TO-REPORT, `printtext-colorrgb-ignored`, a NOTE on DebugConsole.md).

## Package server

Taken on BETA 1010, in both themes where the theme shows.

- **Setup `package-server`**: the sample with `test/shots/packages` (Greeting, a class to type
  `fmt.` into), signed out, TWINSERV's live list. Its APPDATA is `PACKAGE_ROOT\AppData\Roaming`,
  a neutral root for the path the two linked-package questions name (`f48a7254`, `8cf72685`);
  removed at the end. Every shot ticks what it shows and unticks it again before it leaves the
  dialog (the IDE deletes the project's copy of an embedded package at once, BETA 1005 asks
  nothing), and `packagesClean` empties the local packages folder (never the folder itself: the
  IDE writes into it and does not make it, and an export fails with an alert) and fails a shot
  when an earlier one left a package. Only `e2a65dfe` applies (the completion list needs the
  compiler to have the package).
- **The linked-package sequence is one project**, not two: the IDE asks "Local Package exists"
  whenever a package with a local copy is ticked (`g_UserPackagesInfo`), so tick, untick
  Embedded (the IDE writes the copy), untick, tick again gives `f48a7254`, and Download it from
  TWINSERV (EMBED) then Embedded unticked gives `8cf72685`. One IDE per setup could not run two
  projects in order anyway.
- **`f66fb240`** (setup `settings-linked`): the sample with `test/shots/settings/linked.json`,
  linking OLEGuids, and an APPDATA with no copy: as a project opened on a machine without the
  package. Opening reaches it; Restart the compiler (from MEMORY) with the copy deleted hangs at
  5% then UNAVAILABLE for good, Apply Changes (from FILE) does not: an IDE defect, not yet in
  BUGS-TO-REPORT.md.
- **`db4636f6`** (setup `package-check`): the IDE downloads only the newest build, and a package
  imported from a file has no publisher, which the check needs. The tool downloads OLEGuids
  1.0.0.9 from TWINSERV by the IDE's own address, unpacks it into the staged project's
  `Packages\OLEGuids` and adds the reference the IDE writes for a TWINSERV package: the check
  on load says 1.0.0.10 is available. OLEGuids replaces WinDevLib in the page (WinDevLib
  publishes weekly, so its line would change every run, and it is 23 MB).
- **`a1331a0e`** is the Enabled Libraries tab with the embedded package's tick ringed: BETA 1005
  deletes the copy at once and asks nothing, and `Updating a package.md` says so.
- **`e749e10f`**: the gear is the Project Explorer's;
  the dialog is shown whole with the gear beside it (2324 px wide; a smaller page does not make
  the dialog narrower, it covers the gear). The full dialog fills Available COM References
  (hidden, its text in the page), whose paths name the user: the shot waits for that list and
  then renames the user in the page.
- **`f48a7254`** starts at the question's left edge: the row being ticked shows an animated
  spinner no two captures hold alike. **`e2a65dfe`**: the completion list is the IDE's own
  (`.debugConsoleEntryIntellisenseBox`), shows types as `...` until the compiler gives them,
  never asks for the row with lazy index 0 (`bugs/completion-row-zero-no-type`: the shot asks for
  it, and retyping the dot would not help, since the indexes stay), and is placed by the list the
  name before the dot opened unless that is closed first. It is 500 px wide (its CSS); `triggerIntellisense`
  places it at the text cursor's box as drawn at the time, which is at the dot or, now and then,
  already after it (the picture 1198 px wide against 1184): the shot moves it to where the
  cursor's box stood at the dot (owner).
- **Compiler crash, not narrowed**: about 3 runs in 10 of the setup, an Apply that embeds or
  removes CSharpishStringFormater meets `NATIVE EXCEPTION: ACCESS_VIOLATION {no-basic-code}
  [twinBASIC_win32.dll+0010BD3F]`; ten probe cycles of the same steps did not reproduce it. Not
  queued. `applyChanges` clears the DEBUG CONSOLE first, so one crash does not fail every later
  Apply, and prints the crash lines.
- All pictures are page captures, so the page-text check for the user name covers them.

## Not of the IDE

Taken on BETA 1010.

- **`16833fae`** (setup `import`): the sample open, and `test/shots/vbp` (ImportDemo: a form,
  a module, `..\Shared\modShared.bas` for `{PARENT-FOLDER}`) staged with CRLF on
  `PACKAGE_ROOT\Projects` (the dialog shows it as `C:\tbshots\Projects\ImportDemo\ImportDemo.vbp`),
  with a `.res` the tool writes (`scripts/lib/res-file.mjs`: three icons and the fixture's
  manifest). The IDE's Open dialog is native, so the take calls `importFileByPath` with the
  file, what the IDE calls with the file chosen; the form's two files are ticked with real
  clicks. Cancel ends the import's compiler and the IDE then restarts its own, writing a
  DEBUG CONSOLE line that names the work folder: the take waits for the restart and clears the
  console, or the light pass's page fails the user-name check. Both themes (the title bar).
- **`IDE/Images/Webpage.png`** (setup `webpage`): the pane's page is a second WebView2 on the
  IDE's DevTools port (its own `page` target, title the page's). The take sets
  `liveWebpanelSettings` in the page (the IDE's defaults, zoom 0.7, with
  `https://docs.twinbasic.com/`; the user's saved settings are read by the IDE but never shown
  or written), floats the pane at 340x500, freezes the pane's page from its target
  (`scripts/lib/shot-freeze.mjs`) and shows the copy in a frame of the IDE's page at the pane
  body's place, zoomed as the pane's page is ([Pictures as SVG](#pictures-as-svg), Frames). The
  host puts the WebView2 one pixel inside the body (`syncPosition`). The page's
  `prefers-color-scheme` follows the picture's theme, so the dark picture shows the docs dark.
  The IDE itself draws a host screenshot into the pane when something covers it
  (`AskForAdditionalWebview2Screenshot`, `checkObscured`), at the host's 1.5x: not used.
  The target's text is searched for the user name with the page's.
- **`94490c87`, `ac019c1a`** (setup `web`): no IDE; puppeteer's Chrome started by
  `launchOnDesktop` on a private desktop (not headless, so its user agent is the ordinary one)
  with `CalculateNativeWinOcclusion` and the backgrounding of occluded windows off: on a desktop
  nobody sees, Chrome otherwise draws no frame and a capture waits forever or holds a blank page.
  Both `once`, at 2x, light. A clip is in document coordinates (`pageClip`): nothing else in the
  tool scrolls. Microsoft's page rebuilds itself after `load` and puts its scroll back to the
  top, so `scrolledTo` waits for the page to stay still and scrolls until the element stays
  put. Its cookie banner is at the top of the page and outside the crop; nothing is clicked on
  it. The arrow and ring are the overlay's. The GitHub page is the repository's release list,
  whose first release is the newest (`releases/latest` skips pre-releases); Assets is opened
  with a real click. Its numbers (size, "yesterday", the version) are the day's, so the FAQ's alt
  does not name them; its install-size entry says about 40 MB and 120 MB (the BETA 1010 folder, 121.6 MB,
  less the runtime's `.WebView2` data folder).
- `test/addin/help.test.mjs` fetches `/favicon.png` as its sample PNG, so `favicon.png` must stay
  a PNG.

## Machine state in the pictures (owner)

- **The IDE's settings** (View's ticks, IDE Options' values, the debugger options, user panel
  layouts and keyboard groups) are set to their defaults **in the page only** — `liveIDEOptions`
  and the like, in memory, never saved (`--no-save-ide-settings`, and the page's `PAGE_DEFAULTS`
  also blocks `RemoveRecentsList`, which the flags do not guard) — so no picture shows the
  user's choices and nothing is written to the registry.
- **About's licence line**: the tool waits for `licenceIsSet` before opening About, so it shows
  the edition, never NOT READY.
- **The window is shown maximized** (owner): the title bar's Restore button, not Maximize,
  whatever the user's own IDE window was. `PAGE_DEFAULTS` calls the page's
  `cefWindowChangeNotification("WINDOW-MAXIMIZED")`, what the host calls when it maximizes the
  window; the window itself is left alone, since the IDE saves its place in the registry
  (the `Window` key) whenever it is maximized or restored.
- **The language tick** stays on whatever language the IDE runs in.
- **`llvmdoc2`** shows the default thread count, 1.

## Project-setup pictures (owner)

Project Settings, the panels, Project Explorer, Sample 6, Sample 15 and Global Search.
Sample 6's control images are in the CustomControls package's Miscellaneous folder, not
the project's, and the tutorial says so.

- **History's times are fixed in the page**, as the recent lists are, and its project is a
  project-made fixture.
- **The glyph crops** are element clips, 2x, shown at half size.
- **A control's Toolbox icon is a picture of its own** (owner, 2026-11-18), taken like a glyph:
  setup `toolbox-icons`, FormsDemo with `frmMain` in its designer and the Toolbox showing icons
  only, each tile's 24-pixel icon box clipped (`toolboxIconShot`, the names in `TOOLBOX_ICONS`)
  into `docs/Reference/Images/Toolbox/<Control>.png`. With `--svg` the SVG holds the IDE's own
  icon file, so it stays sharp at any zoom. The control's class page shows it before its opening
  sentence and Controls.md before the control's link, with an empty alt text, since the name
  stands beside it ([WIP.Authoring.md](WIP.Authoring.md#page-template)). A control added to the
  Toolbox gets a name in `TOOLBOX_ICONS`; one of a package FormsDemo does not reference
  (CustomControls, WebView2, CEF) has no picture yet.
- **A machine or account value becomes a neutral one** (Publisher blank or a project-made name;
  the COM list shows this machine's, under the username check), and prose that names the old
  value is changed to match.
- **An old-design picture is retaken in today's look**, with alt text and prose rechecked.

## Designers, code and composites (owner)

- **Composites** lay their parts out on the IDE's background in the picture's theme, with a gap,
  code on the left and the panel on the right, one red arrow across.
- **Replica select lists** take one style: a white list, 1 px grey border, the IDE's font, the
  current option on mid-grey `#6E6E6E` with white text.
- **The CustomControls tutorial's pictures** come from a project-made fixture,
  `test/shots/customcontrols/`, referencing the CustomControls package, with a class using the
  tutorial's names (`MyField`, `MyEnum`); the Toolbox may list two grids.
- **No mouse pointer** is drawn in any picture.
- The designer pictures come from a `designer` setup that stages files onto the sample fixture at
  run time; controls are put on forms by hand-written `.tbform` files.
- **Designers and the Format menu.** The report is made in the page by Sources > Add > Add
  Windows Report. Toolbox_Report is the *docked* Toolbox: a floating one lists every tool even
  with a report active (`reportDesignerMode` is set on `#bodyInner`, which a floating panel is
  outside) -- a possible IDE defect, not yet reproduced or queued. After the Format shots the
  designer marks frmControls changed with no control moved (cause unknown), so those shots close
  it with Discard Changes.
- **Properties and Toolbox.** Setup `forms` is `designer` without the add-in;
  `settings-webview2` also stages `test/shots/designer/webview2/` (frmWeb, a WebView2 `Web1`
  with no DocumentURL, so the designer loads nothing), since only that setup references the
  package. `MyOwnIcon.ico` is the template's icon copied at run time. 8611d12a's panels are put
  in place by `restorePanelLayout` in the page and the default layout put back after; the crop
  stops at History's title bar (its entries carry the real time) and left of the IDE's title.
  PROPERTIES is grouped by category only (Anchors in LAYOUT, WebView2's own properties in
  GENERAL), and **a property's description is never shown at the panel's foot**: it goes to the
  designer's own `.proprtiesBoxFooter` inside the code panel, not the tool window -- a possible
  IDE defect, not reproduced or queued. The WebView2 tutorial points to the class reference
  instead. A floating Toolbox for a form lists what the docked one does.
- **Replicas and composites.** **Replicas** are the overlay's `list` primitive: the
  select's options, current index and font, drawn as SVG at its bottom-left in the owner's
  style, a scroll bar when only a window of rows shows; its rows are anchors. **Composites** are
  `scripts/lib/shot-composite.mjs`: each part captured alone (a code part is the real editor
  with the other lines hidden and the line, bracket and occurrence highlights off in the page;
  a panel part a cut-out of PROPERTIES), anchors resolved while it shows, then laid out in
  columns 40 px apart on the IDE background, drawn one to one, one arrow, captured. The fixture
  `test/shots/customcontrols/` (setup `customcontrols`, two parts) has controls `MyGrid` and
  `MyButton` and classes `GridColumn` and `MyButtonState` (the package has `Column`). 1b adds
  ` = 42` in the page and reopens the form: an open designer never takes a new default and
  shows no RESYNC (the page's TIP says it does; only a default value was tested). A custom
  control's Left/Top/Width/Height read in twips, its `PixelCount` fields in pixels.
- **Code views.** `codePart` wraps `codeLines` (any open file; `include`, `extraRight`,
  `annotate`, `hover`, `view`, `bare`). Setup `code` stages `test/shots/code/` (ConstantsDemo,
  FlagsDemo); `buildConfiguration` changes `buildConfigSelector`, waits for the greying to move,
  and clears the DEBUG CONSOLE, whose compiler-restart line names the user's folder. Inline
  hints need *Always show IDE Inline Code Hints* (`codeHintsVisibility2`, off by default), set
  in the page only. The ClassId hint shows only for `[ ClassId () ]` above a class, put in by
  `executeEdits`: typed, the IDE reformats it to `[ClassId()]` with no hint. The JSON view shows
  the file's text, so `frmCustomJson.tbform` holds `"MyField": 0` (in `frmCustom` it would
  override `= 42` in 1b). Setup `sample9` opens Sample 9, whose `WebView_Create` is unchanged.

## Pictures as SVG

`--svg` writes each picture a second time, as `X.svg` (and `X.light.svg`), drawn from the page
the PNG was just captured from, and the build shows it in place of the PNG
([WIP.Build.md, Pictures as SVG](WIP.Build.md#pictures-as-svg)).

**Owner's decisions:**

- Text is real text, in per-picture subsets of the fonts the IDE drew it with, cut by fontTools
  (`scripts/subset_font.py`, which needs Python with fontTools), hinting kept. Glyph outlines render poorly and are not used;
  nor is harfbuzzjs ("don't mess with harfbuzz").
- The PNG and the SVG are both committed. One SVG per theme, not a single SVG switching on CSS
  variables.
- Pages name `X.png` and the build substitutes; `png` in the attribute block keeps the PNG.
- `picture_svg` in `_config.yml` per output: online and book on, offline (and so the help
  archive) off.
- No `<picture>` fallback for old browsers; the per-picture `png` instead.

**How a picture is drawn** (`scripts/svgshot/`):

- `capture.mjs`'s `collectBundle` reads, while the page is as captured: a DOM snapshot (layout, text
  fragments, computed styles, paint order); then, from a measuring layer added after it, each
  font's ascent and the fonts Chromium drew each run with (`CSS.getPlatformFontsForNode`); the
  canvases' pixels, the web fonts' bytes, the annotation layer as XML; and the styles of each
  scrolling box's scrollbar parts.
- `snapshot-svg.mjs`'s `renderSvg` makes one paint item per layout object, in the snapshot's
  paint order. Boxes are snapped to whole CSS px, since the IDE lays out at 1x and is only drawn
  at 2x; text, and the text a control draws, keeps its exact position. What the snapshot lacks is
  drawn as replicas of what Chromium paints: a closed `<select>`, a checkbox and a radio button,
  an input's and a textarea's text (scrolled), and scrollbars styled with `::-webkit-scrollbar`.
- **An embedded image keeps its pixels and any notice of whose it is, and nothing else**
  (owner). `renderSvg` passes each through `compactImage` from
  `scripts/lib/compact-image.mjs`, which `scripts/imagestrip/` matches; what it keeps and why
  is in [WIP.Build.md](WIP.Build.md) beside `imagestrip`, and `test/compact-image.test.mjs`
  tests it. The icons whose sRGB profile it drops decode to the same pixels in Edge 155 and
  Chromium 148; a `gAMA` 1.0 control does not. The 318 by 346 pixels of a 16-pixel icon such
  as tB-Red are the IDE's own asset at its own size, and stay so (owner).
- `fonts.mjs` gives each run's characters to the font files Chromium used for them, and
  `subset_font.py` cuts each file to the characters drawn, as WOFF2.
- `diff.mjs` renders the SVG as an `<img>` at 2x and compares it with the PNG by luminance, a
  shift of one device pixel allowed, so that the PNGs' ClearType fringes mostly cancel
  out. **The luminance is each pixel's as seen over black and over white**, the larger of the
  two distances: the colour of a pixel nearly transparent is rounding, and compared on its own
  (with alpha beside it) it put a cut-out's shadow edge, alpha 1 at 255,255,255 in the PNG and
  0,0,0,0 in the render, 255 levels off.
- **The SVG's size is the PNG's.** A clip half a CSS pixel past a whole one (a menu 168.5 wide)
  is captured a device pixel short of it, 168 wide, from the same origin; an SVG of the whole
  clip shows the half of the edge the PNG cuts off. That column alone put a small picture past
  the bar (a 16-pixel icon at 11%, a menu at 0.5%), so `capture` gives `svgOfPage` the clip
  with the PNG's width and height.
- **The judge draws a half-pixel picture at the whole size above it** (`diffSvg`). BETA 1033
  centres its dialogs at half pixels (Close_Question 397 by 161.5), and Chromium, laying the
  judge's page out at 1x under the emulated scale, snaps an `<img>` of 161.5 to 162 and
  stretches the picture a device pixel taller: every message box comes out 0.29--0.39% strongly
  off, the 16-pixel glyphs 2.9%. So its copy of the SVG gets the whole size and a viewBox
  widened by as much, and the render is cut to the PNG's pixels; a whole-size picture is drawn
  at its size. A canvas `drawImage` at the PNG's size is no answer: without the GPU (replay's
  browsers) it draws an SVG otherwise than an `<img>`. The boxes stay snapped to whole CSS px
  (`grid` 1) even where the IDE lays them out at half pixels: snapping to device pixels made
  95 pictures worse and let none more pass the bar.
- **A converter change is tried with `replay.mjs`, not a retake** (owner).
  `capture.mjs`'s `collectBundle` reads everything the converter needs from the page into a
  *bundle*: the snapshot, its style names (positional, so a bundle carries its own list), and
  per document the measuring layer's answers, the runs' platform fonts, the web fonts, the
  scrollbar styles, each inline `<svg>`'s markup and a frame's viewport and zoom. A web font is
  kept as the `@font-face` rules of its family that some run was drawn with (`webFonts[key]`,
  in the page's order, each `{family, range, lo, hi}`) and the files' bytes once by name
  (`fontFiles`), so `webRulesFor` picks a character's file at replay as it does at capture;
  an inline `<svg>` is `svgs`, pairs of a layout object's key and what `inlineSvg` read. The
  annotation layer's box is already in document coordinates in its markup, so a scrolled page
  needs nothing more. `bundle.mjs`'s `renderBundle` draws the
  SVG from it alone, and `svgOfPage` is the one then the other, so a replay with the converter
  unchanged gives the same bytes. `--svg` saves every picture's bundle, faithful or not, in
  `.svgshot-bundles/` (gitignored, never under `docs/`: a bundle holds the user name), **one
  file per picture holding both themes** (`X.bundle.json.br`, `{dark, light}`, the dark one's
  text first), **Brotli** at quality 9 with a 16 MB window: the light bundle is mostly the dark
  one, which a long window finds and gzip's 32 KB does not, so the 370 bundles are 21.8 MB in
  189 files (gzip: 57.7 MB), about 115 KB a picture. A light picture not kept (the
  same as the dark) has its slot dropped (`dropBundle`). `trimSnapshot` cuts the snapshot to the clip (the layout objects near
  it, every ancestor's, a frame's document only when its `<iframe>` is kept, `<style>` and
  `<script>` text emptied, unused strings dropped; every DOM node kept), 97 MB to 58 MB for
  the 370, and all 370 draw the same SVG trimmed as whole. A trimmed layout object keeps its
  old index in `layout.originalIndex`, which its key is made of: the scrollbar styles
  measured at the capture are found by it. **A replay takes about 20 s for the 370**: an SVG that comes out byte-identical to its file beside the PNG its
  bundle names is not compared again (`--recheck` compares all); the fonts' cuts, about two
  thirds of an SVG's time, are kept in `.svgshot-bundles/subsets/` under a hash of the font
  (file, face, size, time, or a web font's bytes), its weight, the characters, the hinting and
  `subset_font.py` (`fonts.mjs` `useSubsetCache`; `shoot_docs` uses it too); and `--jobs`
  are processes, each with a browser started with `--disable-gpu`, half the logical
  processors and at most 8 by default. Drawing is synchronous, so one process gains nothing
  from more pictures in flight; with the GPU on, every browser shares it, four processes
  are as fast as fourteen, and fourteen time a screenshot out. A bundle answers only what the converter asked at capture; a question
  it has no answer for is a *miss*, counted by `renderBundle`, and replay lists a picture whose
  misses are new since its capture, whose PNG hash changed, or whose bundle lacks a style now
  read, with the `--only` command that retakes them. **A change to what is read from the page
  that no miss shows raises `BUNDLE_VERSION`**, in the same change: a bundle of an older version
  is not read, and replay lists it as needing a retake, since nothing in it says which pictures
  the change affects. Answering misses offline in headless
  Chromium, and drawing bundles in `tbdocs`, are later steps, not done: the second needs the
  bundles committed, so cleaned of the user name, and complete, since CI
  has no Windows fonts to measure with.
- **A filter of colour functions is baked, not drawn** (`colour-filter.mjs`; owner).
  Chromium's PDF backend cannot express an SVG `<filter>` and draws the whole filtered group as a
  300 dpi bitmap, text included: the book would lose the text of 44 of its 110 SVGs that way. Every CSS
  filter function but `blur()` and `drop-shadow()` is an affine colour map, which commutes with
  antialiasing, so mapping each fill, stroke, gradient stop and text class under the group paints
  the same picture on screen, to a channel's rounding; `opacity()` becomes the group's opacity,
  and a filter of `opacity()` alone bakes nothing (`bakeMarkup`: wrapped in a filter of no
  primitive, which draws nothing, the form designer's padlock, `filter: opacity(0.5)` on a
  `::before`, would not show). A real filter stays only round an embedded image (a `<g filter>` def wrapping it) and over a
  group that blends or already holds a real filter group. A `drop-shadow()` last in the list
  (the IDE's toolbar codicons glow with one) is split the same way: the shadow alone, from a
  copy of the group under a filter that blurs its alpha, then the group over it unfiltered,
  which is what the filter's own merge paints. One SVG serves screen and book, since the
  bake is exact. Blurred shadows stay bitmaps in
  the PDF, which loses nothing.
- **The bar** (`SVG_FAITHFUL` in `scripts/lib/shot-policy.mjs`): an SVG with more than 0.25% of its pixels 96
  grey levels or more off is not written, and an older one is removed. Anything not drawn falls
  to it. A picture's entry in `test/shots/manifest.json` can move it, to any level and share,
  and leave rectangles out (`svgRule`): it is counted on `diffSvg`'s strength map, a byte per
  pixel, so no level needs the picture drawn again.
- **An SVG changes with its PNG** (owner). The SVG of a picture whose PNG is not rewritten
  (unchanged, or within a capture's noise) stays as it is, with its bundle, when there is one
  (unless the SVG the run drew is the file's to the byte, line endings aside: its bundle then
  replaces the cache's, which it keeps drawing the file's SVG and naming the file's PNG, and
  answers what the converter has learnt to ask since; `bundleFollowsSvg`, owner, 2026-11-02):
  it is drawn from the whole page, layers the picture does not show included, and those
  differ from run to run (PackagePublishing_1, a floating panel over a form designer still
  drawing; CallStack_Frames.light), and one sitting on the bar (Properties_SystemColours.light
  at 0.251%, 94490c87) would be written in one run and removed in the next. `replay.mjs` draws it
  again after a change to the converter. **A review that accepts a run's SVG writes it all the
  same** (owner, 2026-11-01; `svgFollowsPng`'s `accepted`, which `shoot_docs.mjs` and the review
  tool's applier both ask): that is the way to replace an SVG drawn from a bundle the capture
  recorded wrongly, which a replay redraws as wrongly. **So does a
  run whose picture's cached bundle cannot draw it again** (owner, 2026-11-02; `svgFollowsPng`'s
  `stale`, from `redraw.mjs`'s `staleBundle`: no bundle, another format, another PNG, or a question
  it has no answer for, what replay lists as needing a retake): the run's SVG is then what a
  replay would write and cannot, so it is judged and written as with its PNG, and its bundle
  cached. Without it the file would keep an older converter's SVG for as long as its PNG did not
  change. The applier asks `staleBundle` itself, as the picture and the cache
  are when it applies the verdict (up to 0.35 s for the largest bundle, Help_Pane's, one per turn
  of the server's event loop).
- **One line** (`oneLine`). Git checks a picture's SVG out with CRLF where `core.autocrlf` says
  so, since no `.gitattributes` rule can tell it from a diagram's SVG. An SVG icon embedded as
  text and the annotation layer's XML hold line breaks; so each is written as the space an XML
  parser makes of a break inside a tag, or `&#10;` in text, the same character. A checkout then
  changes only the last line ending, which `writeSvg` (`scripts/lib/shot-apply.mjs`) ignores when it compares.

**Scrollbars.** The IDE styles every scrollbar with `::-webkit-scrollbar` rules
(`ide/styles.css`, coloured by theme variables), a second family under `.modalDialogContainer`.
`getComputedStyle` cannot name a scrollbar part or a state such as `:vertical`, and a rule's text
cannot be copied onto an element of the tool's own: Chromium drops a `var()` shorthand from
`cssText` once a longhand overrides part of it, as the thumb's `background-clip` does its
`background: var(...)`. So `scrollbarParts` gives each rule that styles this element's
scrollbars, for a moment, one more selector, matching a probe element per part with the
specificity of the selector it stands for; Chromium cascades and resolves the `var()`s, and the
rules are put back. The probes hang under the root element, not the body: there a cut-out's
`body *{visibility:hidden !important}` would match them, and every part of the scrollbar would
come out hidden, undrawn (`bench/scrollbars-cutout.html`). The parts are laid out as Chromium's custom scrollbar theme does: a button's
length its `height` (vertical) or `width`, `auto` being the platform's scrollbar thickness, which
the page measures; the thumb as long as its share of the content, never shorter than its own
length, whose `auto` is 17 px (Windows' thumb length at 96 DPI; no page property shows it, and
the bench checks it); its place from the snapshot's scroll offset. A corner rule left with no
declaration (the IDE's `background-color: transaprent`) still gives the corner a style of its
own, transparent. The buttons' arrows blend into the track with `background-blend-mode:
hard-light`, drawn as an isolated group with `mix-blend-mode`.

**Drop-down lists.** The label is set from the box's exact position: a table cell can put a
select at x.5, where Chromium snaps the border to the pixel grid but not the text. It sits in the
content box less 4 px at the start and the arrow's 16 px box at the end, aligned by
`text-align-last`, else `text-align` (a select does not take it from its cell), and is cut at
that box. The chevron is 8 by 4 px, stroked 2 px wide, centred in the 16 px box at the padding
box's right edge whatever the padding, its top 2 px above the box's middle rounded down: fitted
against Chromium's own arrow in Edge.

**Underlines** (`decoratingBoxes`, `underlineBand`, `inkBand` in `snapshot-svg.mjs`). A text
decoration is not inherited: the converter walks up from the text and takes the line of every box
that sets one, through blocks, stopping after an atomic inline box, a float or a positioned box.
Fitted in Edge 155 on `bench/decoration.html`, in whole CSS px since Chromium snaps the line at
1x: the baseline rounded; an auto thickness `max(1, floor(size/10))`, a given one rounded; an auto
offset `max(1, ceil(size/10/2))` below the baseline, a given one rounded with no gap of its own
(the package-server tip is 13 px with the IDE's `text-underline-offset: 2px`, so 2 px down, 1
thick); the sizes and the colour (`text-decoration-color`) from the box that sets the line. Chromium
cuts a gap round each descender, as wide as the unrounded thickness on each side; `capture.mjs`
finds the ink by drawing the run 16 times as large on a canvas in the measuring layer
(`convert.mjs`, which runs no measuring layer, draws lines whole). Reported as not drawn:
overline, line-through, every style but solid, and `text-underline-position` other than auto.
`test/svgshot.test.mjs` holds the fitted figures.

**An ellipsis cuts a line as Chromium's `NGLineTruncator` does** (`ellipsisLines`, `cutNeed`,
`cutPlan` in `snapshot-svg.mjs`; otherwise the DIAGNOSTICS pane of IDE-FeatureMap draws its
messages whole, cut by the block's clip, where the PNG ends them in `...`). The snapshot gives
the whole text of an elided line, so the converter finds the lines itself: the block that holds
the line (the nearest box above the text that is not inline) clips its overflow, sets
`text-overflow: ellipsis`, and the line's text reaches past its content box. The fragments that
end before the line's end less the ellipsis are drawn whole, the first that does not is cut, the
rest are hidden, and the ellipsis, in the block's style, follows the last one shown. Where the
fragment is cut is the page's answer (`capture.mjs`'s `measure`, `cuts`): the longest start of the
run, at a grapheme's end, measured with a Range over the run as laid out, no wider than its room
less the ellipsis; the line's first fragment keeps one grapheme if none fits. Left out: right to
left, an atomic inline on the line, and a block scrolled sideways. `text-overflow` is in
`MISSABLE_STYLES`: a bundle that lacks it is still drawn, and replay asks for a retake
only of a picture with a line its block clips (the miss `text-overflow of a line its block
clips`), some of which may clip with no ellipsis.

**A CSS zoom scales the computed lengths** (`applyZoom` in `snapshot-svg.mjs`; without it
Designer_Zoom50's text comes out at twice its size). Chromium's snapshot gives the layout and text
boxes under a `zoom` as drawn, but the computed styles as getComputedStyle does, before the zoom,
and each element's `zoom` as its own factor (1 below the zoomed element; a text node reports its
element's). The converter multiplies the element's own factors down the tree and scales by the
product every px length it reads (`ZOOMED_LENGTHS`: font size, line height, borders, radii,
outline, shadows, padding, background size and position, transform origin, filter, clip path)
and a transform matrix's translation, and its offset, client and scroll rects, which are before
the zoom too (a scroller's scrollbar is its box less its borders and client width); a px inside a
`url()` is left alone. Not scaled: a scrollbar's part styles, which the page reads itself, and the
zoom of an element with no box (`display: contents`). `zoom` is in `MISSABLE_STYLES`: replay asks for a retake only
of a picture whose bundle has an element with an inline zoom other than 1 (the miss `zoom of an
element its inline style zooms`): Designer_Zoom, Designer_Zoom50 and Webpage.

**A background image is sized by its bytes** (`naturalSize`), not by the type its URL names:
the IDE calls a JPEG and a BMP `image/png`. The About dialog's EXCALIBUR logo is such a JPEG,
drawn with `background-size: contain`; read as a PNG, its JFIF header gives 4,718,592 by about 4.3
billion pixels, and the logo would come out 0.054 px wide.

**A background stops at the borders that cover it** (`backgroundClip`, `bordersCover`): a box
with square corners whose sides are all opaque and fill their width (solid, inset, outset,
groove, ridge) has its background drawn in its padding box, not under its borders. Drawn under
them, it shows at their antialiased edges wherever the SVG is drawn at a scale other than 2x
(a seam of two antialiased edges): Menu_File_Project's separators, an inset border 2 px tall
over `rgb(89, 89, 89)`, come out 159 and 209 at 1.5x where the PNG, and the same borders drawn
as CSS, are 197 and 247; clipped, 196 and 247. At 2x the edges fall on whole pixels. A rounded
box keeps its background under its borders: a curved inner edge is antialiased at any scale,
and the clip would leave a seam there at 2x (the designer's round selection handles).

**An image is cut to its box's rounded corners** (`paintBox`): uncut, a page's round avatars
come out square. The IDE has no such image.

**A clip of one axis** (`span` in `renderSvg`). `overflow-y: clip` beside `overflow-x:
visible` clips one axis, which no other overflow can, and the IDE has none. The open axis gets
the picture's own span, not `INF`: Chromium draws nothing through a `<rect>` two billion px
wide, so everything under such a clip would go, with no word in `stats` (GitHub's merge box,
3.98% of `merge-pull-request.light` strongly off).

**A disc that clips** (`round` in `clipForDescendants`): Chromium cuts what a box clips to its
rounded corners, and uncut a round icon's ground comes out square. Only a box whose corners
meet at the middle of each side is cut, a disc or a pill, and clips of those add up; a smaller
radius stays square. Cutting at every radius does not pay: on the 575 bundles of 2026-11-06 it
changed the bytes of 120 SVGs, 7 closer, 2 further by 0.001%, 110 the same, and a changed
SVG lapses a review tied to its bytes (tB-Blue's, its pixels the same). `bench/overflow-clip.html` holds both
this and the clip of one axis.

**An `<embed>` of an image is drawn as an `<img>`** (`embeddedImage`): Chromium stretches the
image to the element's box, as for an `<img>` (checked in headless Chromium: a 10 by 10 PNG in a
100 by 60 `<embed>` filled it), and an ICO draws in an SVG `<image>`. The resource preview shows
an `.ico` so (Resource_Preview: the tB icon, an `<embed>` of a `data:image/x-icon` URL). Only a `data:` image is taken; the
snapshot's `currentSourceURL` is an `<img>`'s alone, so the URL is the `src` attribute.

**A CSS mask is an SVG `<mask>`** (`maskDef` in `snapshot-svg.mjs`, 2026-11-22). The shipped
add-ins (BETA 1045) draw their toolbar icons, Hex Editor's Undo and Redo and ICO Editor's four, as
a 20 px `::before` whose background is the text colour, shown through a `mask-image` of an SVG.
Before `mask-image` was read, each came out a square of that colour, and the picture still passed
the bar (HexEditor.light 0.14% strongly off: two small squares are few pixels). The mask's layers
are laid out by `paintBackgroundImages` from the `mask-*` properties, origin and clip the border
box unless they say otherwise, and kept to the clip box they name even where opaque borders
cover a background (`exactClip`); the mask is the border box's size, and masks by alpha unless
`mask-mode` is luminance. Its group encloses the element's filter group, as CSS applies the
filter first. The `mask-*` styles are in `MISSABLE_STYLES`: a bundle without them draws as
before, and has the miss `mask-image of a ::before or ::after in its own text colour` where such
a box shows (`maskUnknown`); on the 601 bundles of 2026-11-22 that was HexEditor and IcoEditor
alone, in both themes. `bench/mask.html` holds the idiom and the properties, 0.004% off in Edge
158. Not drawn: `mask-composite` other than add, `mask-border`, and a mask under a transform
other than a translation (reported).

**An image keeps its element's `image-rendering`** (`rendering` in `snapshot-svg.mjs`,
2026-11-22): the `<use>` that draws a canvas's picture, an `<img>` or a background tile gets
`style="image-rendering:..."` unless the value is auto or smooth, and the `<image>` inherits it.
ICO Editor shows its 48 px icon as a background of 100% of a 384 px box, pixelated; drawn smooth
it came out a blur, 3% of the picture mildly off and none strongly, so the bar passed it.
`image-rendering` is in `MISSABLE_STYLES`, with the miss `image-rendering of an image scaled up 2
times or more` (`renderingUnknown`): a canvas's picture, an `<img>` or a background of a given
size drawn at least twice its pixels in CSS px. A smaller scale is left out: every icon drawn at
its size is twice its pixels at device scale 2, and the code editor's canvases are at the
device's scale, so counting them would ask for a retake of nearly every picture with a code
editor. On the 601 bundles of 2026-11-22 the miss was IcoEditor's alone, in both themes.
`bench/image-rendering.html` holds a canvas pixelated, smooth and crisp, an `<img>` and a
background, the same as Edge 158 to the pixel.

**Frames** (owner: cross-origin frames in general). A frame of the same site (the
docked help pane: the documentation on another `localhost` port) is in the IDE's process, and
`DOMSnapshot.captureSnapshot` returns its document beside the page's: the `<iframe>` node's
`contentDocumentIndex` names it, and its boxes are in its own coordinates. `decodeSnapshot`
decodes every document and hangs a frame's on its `<iframe>` node (`node.frame`); `renderSvg`
draws it at the iframe's place in paint order, as one group moved to the iframe's content box
less the frame's scroll, clipped to it, scaled when the frame is zoomed (its `innerWidth` against
the box; `unzoom` puts boxes Chromium gives in the parent's px back into the frame's), over its
canvas colour (the root's background, else the body's, else none) and under its viewport's
scrollbars. `svgOfPage` measures each frame in an isolated world of its own
(`Page.createIsolatedWorld`), so its `@font-face` rules and styles apply; one `PictureFonts`
serves the whole picture. A frame of another site is a target of its own and is not in the
snapshot: it is reported as "a frame of another process". A picture that would have one is
taken another way (owner, 2026-11-02: the shot substitutes a local copy for the remote page):
`scripts/lib/shot-freeze.mjs` freezes the page from its own target into one document (its
scripts left out, its style sheets from the CSSOM, each `url()` and `<img>` a `data:` URL, its
form values as attributes, its scroll put back), and `showFrozen` shows it in an `<iframe
srcdoc>` of the page the picture is taken of, which is that page's own process. Help_Window's
docs frame takes the copy by srcdoc (its `src` comes back after the picture); the Webpage pane,
a second WebView2 the host lays over the pane and no frame at all, gets a frame of the IDE's
page at the pane body's place, zoomed by CSS as the pane's page is (70%: the frame is 1/0.7 of
the pane's size, so the copy is laid out as wide as the page was), so its PNG is one capture.
A copy of the docs home page and of MsgBox, in a frame, is the live page to the pixel in
Chrome, and its SVG 0.011% strongly off at most.

**The viewport scrollbars of a zoomed frame** are given by `viewportScroller` in the parent's
px (a bar is as thick there as in a frame that is not zoomed; the gutters, scroll and extent
times the frame's scale). **A scrollbar rule in an `@media` or `@supports` that does not hold**
(the site's dark theme only, in a light picture) is skipped: `scrollbarParts` visits only the
blocks in force, and a sheet whose own media does not match not at all; otherwise it takes
the viewport's bar as custom and draws it transparent. **The help window's WebView2 gets
`--force-device-scale-factor=1` too**: without it it follows the display's scaling (144 DPI
on the dev box), its DOM snapshot is in the display's px, 1.5 times its CSS px, and the whole
SVG is drawn that much too large, the shell's title bar included. The add-in takes further
browser arguments for its window under the test switch, `TB_DOCS_HELP_WINDOW_ARGS`, and the
help setup passes that flag.

**Web fonts** are found by CSS font matching on the run's `font-family` list, style and weight
(`webFontFiles`, in the page), not by the face's own name: the site's Inter calls itself "Inter
Variable", and the last rule of a family can be its italic file. A family split by
`unicode-range` (Microsoft's Segoe UI Variable: five files per weight, Latin, Latin Extended,
Cyrillic, Greek, symbols) gives a run every rule whose range holds one of its characters
(`webRulesFor`, every such rule per character, the later first, as CSS does), only those files
are read, and `PictureFonts.css` gives each file only the characters in its own range even
where its cmap has more. Where two rules hold a character, the later file draws it and one
with no glyph for it passes it to the earlier (CSS Fonts 4, the composite face): the IDE
declares `codicon` twice, its own `codicon.ttf` (`codicon.css`) and then Monaco's
(`editor.main.css`), which has no coffee cup, so Menu_Help's cup is the IDE's file's
(`bench/webfont-twice.html`). A variable WOFF2 is read in `fonts.mjs` and cut at each weight the picture uses,
held to the weights its rule declares (`subset_font.py`'s `weight`); its other axes stay
variable. A font fontTools cannot cut gets no face and its text falls back, reported
as "text in a font that could not be cut" (`subset_font.py` answers that job with an error
instead of failing the run).

**fontTools is patched** for that weight cut (`patch_gvar_subset` in `subset_font.py`). Pinning
one axis of a font that keeps another (Segoe UI Variable: `wght` and `opsz`) leaves `gvar`
without entries for the glyphs left with no variation, which the rest of fontTools reads as
none; the subsetter's `gvar` step (4.65.0) looks every kept glyph up and fails with `KeyError
'.notdef'`. The patch reads a missing glyph as none; with no axis pinned it writes the same
bytes as fontTools' own. Delete it once fontTools does the same (no issue filed upstream yet).

**The platform's own scrollbar** (`paintNativeScrollbars`) is the Fluent one Edge and the
IDE's WebView2 draw (on this Windows 10 machine too): 15 px, a round-ended 9 px thumb, arrows
9.5 by 4.75, `scrollbar-color` where it is set, else the
light or dark default by `color-scheme`; the docs site's dark theme sets `scrollbar-color`, which
turns its own `::-webkit-scrollbar` rules off. **A focus ring** (`outline-style: auto`,
`paintFocusRing`) is a 2 px band in the outline colour and a 1 px white one outside it. Both were
fitted in Edge on bench pages of their own. Round a box with no rounded corner the ring is not
square: Chromium gives its path a default radius (Help_Search's focused field, owner).
`FOCUS_RING_RADIUS`, 2.85 px at the path and grown or shrunk
with each band, is fitted to Edge's pixels round square boxes with no border, borders of 1 and 2 px,
an outline 3 px wide and an offset of 4 px, which all came out alike (the squared error 6% of a
square ring's; 3 px gives 17% more). **An outline of any other style** (`paintOutline`) is
drawn as Chromium's OutlinePainter draws it, through the border painter: a border of the
outline's style, width and colour round the border box moved out by the offset, its rounded
corners moved out with it; so the form designer's `1px dashed` outline of each control is dashed
as a border is, and a menu's or dialog's rounded outline is rounded. A solid one with square
corners is one stroked `<rect>`. **A text field's selection** (`selectedParts`, `blendWithWhite`,
`paintTextControl`) is painted by Chromium outside the DOM, so the snapshot does not hold it:
`capture.mjs` asks each document for its focused field (inside shadow roots too) with text
selected, the range, whether the window has focus, and the colours, before the text is measured,
so that the parts before, in and after the selection are runs of their own. The colours are the
field's `::selection` when the page gives it a ground, drawn as given, else the system colours
`SelectedItem` and `SelectedItemText` (WebView2's, rgb(25, 103, 210); `Highlight` is Windows',
rgb(0, 120, 215), which no selection is drawn in), the ground made translucent as Chromium's
`Color::BlendWithWhite` makes it: rgba(0, 65, 198, 0.8), which over white is the PNG's
rgb(51, 103, 209) to the level. The ground is the selected part's width and the line's height,
clipped to the field. A selection in a window without focus (other colours, which no page
property gives) and one of the document's own text are reported as not drawn. Every bundle of
version 3 records the selection; the PNGs that show one, found by its colour, are
Variables_Edit, Designer_AddName and Rename_Box, both themes. **An attribute with no
value** (`disabled`) is the empty string, which DevTools writes as -1, the index of no string;
`decodeSnapshot` reads it as an attribute, since read as none no control would be drawn disabled
(Find_Project's greyed "Current Module", set `.disabled` by the IDE). **A disabled checkbox or
radio button** (`paintCheckable`) is translucent, fitted by `bench/checkable.html` over white and
over rgb(43, 43, 43), each part to the level: a fill of rgba(245, 245, 245, 0.68), its border, a
checked box's ground and a radio's dot in #767676 at 30% over it, a check mark in white at 60%
over that. A checked control's accent is #0075ff (sampled in Find_Project and in Edge), not
#0078d7. **A native text field** (`nativeTextField`,
`paintNativeTextField`): Chromium draws an `<input>` whose border and background the page leaves
as its own (`2px inset rgb(118, 118, 118)` on white, which BETA 1033 leaves its dialogs' text
boxes) as its Fluent text field, not by that border: a white ground and a 1 px border of the same
grey along the border box, rounded, with no antialiasing, the ground's corners showing what is
under them, a focused field (outline none) the same. The CSS border's 2 px still place the text.
Drawn as two `crispEdges` paths, rounded 2.2 and 1.2 px: any outer radius from 2.1 to 2.3 gives
every pixel of Edge's border (`bench/textfield.html`). A field the page styles in either way is
drawn from its style.

**A list marker that is a symbol** (`paintSymbolMarker`, `SYMBOL_MARKERS`): Chromium paints a
`::marker` of disc, circle, square or a disclosure triangle as a shape, not as the glyph of its
text (`NGTextFragmentPainter::PaintSymbol`); drawn as the glyph, Help_Hover's bullets would be
Segoe UI's "•", about half as wide (owner, 2026-11-01). Each is known by its text (the symbol and a
space; square is U+25A0, not the spec's U+25AA), which a bundle has, so a replay redraws it with
no retake. A disc, circle or square is ((2a/3) + 1)/2 px across in whole-number arithmetic, `a`
the font's ascent rounded, 1 px from the fragment's left and 3(a - 2a/3)/2 below its top, snapped
to whole CSS px (`ListMarker::RelativeSymbolMarkerRect`); a circle is stroked 1 px wide on it. A
disclosure triangle is Chromium's canonical one in a square of 0.66 times the font size, its foot
on the ascent, unsnapped. On `bench/list-marker.html` (Segoe UI 9 to 24 px, Inter 10.5 px) every
marker's box is Edge's to the pixel.

**A search field's clear button** (`paintSearchButton`; `searchButtonOf` and `searchButton` in
`capture.mjs`): Chromium draws the X of an `<input type="search">` that shows text from the
field's user-agent shadow tree, which DOMSnapshot leaves out, so without this Help_Search's
SVG has no X (owner, 2026-11-01). The capture finds the button with `DOM.describeNode` (`pierce`, its `pseudo`
`-webkit-search-cancel-button`), and reads in the page, on the element `DOM.resolveNode` gives, its
box from the field's border box, its opacity (0 for an empty field, 1 with the focus or the
pointer: `html.css`), visibility, display, appearance and used colour scheme; the bundle keeps
them as `searchButtons`. A bundle without them has no answer, a miss, which replay lists for a
retake (Help_Search and Help_Choices, both themes). The X is the button's box snapped, two round-capped
strokes 0.235 of it wide, their ends a sixth in from its corners (fitted to the coverage of Edge's
picture at 18 and 42 device px, the squared error from 278 to 34 at 42 against strokes a third
wide); for a light scheme in Edge's blue, shaded from rgb(64, 121, 187) at the top to rgb(35, 66,
114) at the bottom (five stops read row by row), for a dark one white. The help pane's field is
in a light scheme on the IDE's dark ground, so its X is blue. `bench/search.html` is at 0.034% of
its pixels off, none strongly.

**An inline `<svg>`** in the page is drawn as a nested `<svg>` in its box's content box, in its
place in paint order (`paintInlineSvg`, from `paintBox`), so a CSS transform, opacity, border and
padding apply as to any box. `inlineSvg` (`capture.mjs`) reads it in the page, in a frame's
document too: its subtree with each element's styles resolved (paint, stroke, opacity,
visibility, transform with its origin and box, clip, mask, filter, markers, text and font; a
paint written `currentColor` stays so, and an inherited property is written only where it
changes, so a `<use>`'s target inherits from the `<use>`), what it refers to outside itself
(sprite symbols, gradients, clip paths, masks, markers) copied into a `<defs>`, its ids
scoped per svg (`scopeIds`), its `<image>`s through `compactImage`, its `<text>` in the picture's
faces. As in Chromium, a gradient, clip path, mask or marker inside a `display: none` tree is
not found by `url()`, and a `<use>` still finds its target there. **The annotation layer** is
`position: fixed`, so on a scrolled page its box is moved by the scroll into the document's
coordinates, which the picture's `viewBox` is in.

**The bench** (`node scripts/svgshot/bench.mjs`, outside every gate, needs Edge and fontTools)
draws the pages under `scripts/svgshot/bench/` (scrollbars, a scrollbar in a cut-out, native scrollbars, drop-down lists,
native text fields, checkboxes and radio buttons, list markers, a search field's clear button, underlines, focus rings, clips of one axis and of a disc, frames, a web font split by range, inline SVG, a scrolled page with an
annotation layer, SVG in frames), served from `127.0.0.1` with the site's fonts under `/fonts/`
(a `file:` page cannot `fetch` its font bytes), with the converter
and compares them with the browser's own picture: in Edge, whose Chromium is the IDE's WebView2's
(Puppeteer's trails it, and draws the select's arrow otherwise), laid out at 1x and drawn at 2x
as the IDE is, text without ClearType. Each page is held to the figures recorded in
`bench/baseline.json` (`--update` records them): no page comes out exact, and a fixed limit
would miss a small fault (arrows a quarter too tall move a page from 0.025% to 0.064%). `node scripts/svgshot/pixels.mjs <png> x y w h --beside <png>` prints a
rectangle of two pictures as letters, one per colour: how an edge, a stroke or a blend came out.
A new replica gets a page there; `linethrough.html` is the line-through's.

**Edge is started without `__COMPAT_LAYER`** (`withoutCompatLayer` in `bench.mjs`). Windows'
application-health detection can put `__COMPAT_LAYER=DetectorsAppHealth` on a process, and its
children inherit it (on every Bash and Node process of a session, in neither the user's nor
the machine's environment). Edge 156.0.4314.58 started under a
compatibility layer starts itself again without it (`--edge-skip-compat-layer-relaunch`, the
first process exiting with code 0 after about 20 ms), so Puppeteer reports "Failed to launch the
browser process: Code: 0" and the browser it started runs on, holding its temporary profile.
No Puppeteer flag has a part in it; Edge stays
when started without the variable. Puppeteer's own Chrome, which the other tools use, does not
start itself again. A new Edge can move the pages' figures a little with the converter
unchanged (156.0.4314.58: svg-frame 0.098% to 0.110% at 32 levels, outline 0.071% to 0.078%);
the baseline is then recorded again (`--update`).

**Not drawn yet:** a thin platform scrollbar (`scrollbar-width: thin`), a textarea's resize
grip, a number input's spin buttons, an indeterminate checkbox, conic gradients, the 2011
`-webkit-radial-gradient`, `filter: hue-rotate`, an inset shadow's blur, and a frame of another
process (which is why Help_Window's docs frame and the Webpage pane are shown from a frozen
copy: Frames, above). In an inline `<svg>`: a `<foreignObject>`, an `<image>`
the page cannot read, a `<use>` of another file, a CSS `clip-path` on the root, text
decoration, geometry set by CSS (`d`, `width`, `x`), and animation (the state at the snapshot
is drawn). A duplicate id in one document resolves inside the svg first, where the browser
takes the document's first. The WebView2 download page's Version arrow is an `unsteady`
region. Drawn wrongly: a collapsed table
border, doubled (the IDE has none); text is set on its exact baseline, where Chromium rounds
the baseline to a whole CSS pixel (a device pixel off at most; an underline uses the rounded
one). A canvas is a raster (the editor's minimap is drawn with
`putImageData`). The run reports each under "not drawn".

## Pictures from a signed-in Chrome

The six GitHub pictures need the owner's account, so no agent can take them, and pictures
taken by hand are PNGs that cannot be drawn again. The owner's decision (2026-11-05): a Chrome
extension that does what `shoot_docs.mjs --svg` does in the IDE's WebView, so that a capture can
be replayed later. How to use it is in
[Tools-IDE](docs/Documentation/Tools-IDE.md#svgshot-extension).
`node scripts/svgshot/chromeshot.mjs <capture | folder>` turns what the extension saves into
`X.png`, `X.light.png`, their SVGs and their bundles, a capture of the whole window trimmed first
to the area `chrome/shots.mjs` names (`trim.mjs`); `chrome_try.mjs` tries the extension on a
public page in a Chrome of its own.

**The folder `scripts/svgshot/` is the extension** (`manifest.json` there; its own files in
`chrome/`). An unpacked extension loads nothing from outside its root, and a build step that
copied the modules would be a second copy to go stale, so the capture code is one set of files,
and the two callers differ in their `conn`: `lib/tb-cdp.mjs`'s socket, and `chrome/conn.mjs`'s
`chrome.debugger.sendCommand`. So what the extension needs lives where it can load it:
`BUNDLE_VERSION` and `trimSnapshot` in `snapshot-trim.mjs`, `webRulesFor` and
`parseUnicodeRange` in `font-rules.mjs`, `svgOfPage` in `bundle.mjs`, the annotation overlay in
`svgshot/annotate.mjs`; the SHA-1 of a web font is the platform's `crypto.subtle`, and
`compactImage` and `pngSize`, which need zlib, are reached through `useImageTools`, which
`bundle.mjs` calls. Nothing in the extension draws. `test/svgshot.test.mjs` follows the imports from the manifest and
fails on a Node module or a path outside the folder.

**A side panel, not a popup**: it stays open while the page is set up, and a click in the page
does not close it. It is also a page: a service worker has no `URL.createObjectURL`, and a
`data:` URL over 2 MB does not reach `chrome.downloads`. Permissions are `debugger`, `downloads`
and `sidePanel`, with no host permission and no `tabs`; a capture works on those alone.

**Every CDP call the capture needs answers through `chrome.debugger`** (Chrome for Testing 148,
2026-11-06, at display scales 1, 1.25 and 1.5). GitHub's style sheets are all readable
(`crossorigin`), and its page has no web font file to fetch.

**The display's scale is the one thing that differs from the IDE.** The IDE gets
`--force-device-scale-factor=1`; the owner's Chrome cannot, and the dev box is at 144 DPI. At
150% a snapshot's boxes are 1.5 times the CSS pixels, whatever the emulated scale says (a page
1280 wide, boxes 1920 wide), so the converter would draw everything that much too large, as
for a help window without the flag (Frames, under Pictures as SVG). A tab's zoom of 1 over the display's scale brings the layout back to 1x
(`bounds` equals `innerWidth`). It changes what the override means, each of these checked:
an emulated width w is w/zoom CSS pixels, `devicePixelRatio` is the emulated scale times the zoom,
so the emulated scale is 2/zoom, and a clip is in the emulated size's units, not in CSS pixels.
`take.mjs`'s `layoutPlan` does this, and each capture checks the first layout box against
`innerWidth` and refuses a page not at 1x. The zoom is per tab, and goes back after the capture.
The override's `scale` is left out: Chrome keeps the view its emulated size and enlarges the page
inside it, which cuts off the right and the bottom (the window, captured on a private desktop,
showed it). So on a display at 150% the page takes two thirds of the tab during a capture, in its
top left corner, and shows whole. A clip that starts left of the page comes back with the page
drawn at half its size and the rest black: a badge past the left edge did that to
`choose-workflow`, so a drag's clip stays inside the window (`unionWithin`). A real mouse maps right: `chrome_try --os-drag` posts Windows'
own mouse messages to Chrome's window, and 600 by 300 device pixels at 150% came out a clip of
600 by 300 CSS pixels at the right place.

**Masking** (2026-11-06). A black box would show that something was hidden, and a
crop would limit what a picture can show, so a private word is replaced in the page by a stand-in
before the capture, and the PNG and the SVG are of the same masked page. The list is
`scripts/svgshot/private.json`, in the extension's folder, so that the panel can read it, and
ignored by git; `private.example.json` shows its form. `maskPage` replaces text nodes (a
`<select>`'s options among them), text box values and attributes in every shadow root and in each
frame of the same process, and shows a grey head for an `<img>` whose alternative text, address,
link or hover card holds a word: `confirm-merge`'s e-mail address needs no `noreply` choice and no
crop. It is undone afterwards. A page can draw a word again, as React does, so `maskPage` runs again
just before and just after each PNG, and a capture is taken again when the second pass finds
anything, four times at most. Then come two checks and a scrub: `drawnWords` refuses a capture
whose layout text, field values or option text still holds a word (a `::before` of
`content: attr(...)`, which no mask reaches, is in the layout's text); `scrubBundle` replaces the
words in every string of the bundle, so that a link's address and a `<meta>` are not kept either;
and a search of the bundle's JSON, base64 left out, must find none. `chromeshot.mjs` then asks the
same of a wider list, with the Windows user name and git's `user.name` and `user.email`
(`private-list.mjs`), of the bundle and of the SVG, before it writes anything, whether or not the
SVG is written: the PNG shows what it was drawn from. `replay.mjs` asks it of each SVG.

**What the mask cannot do:** text in a raster or a canvas, and a frame of another process, which
is not in the snapshot. No OCR reads a PNG, so the owner looks at the preview. A bundle holds the
rest of the page, ids and all: it stays in the gitignored cache, and `chromeshot.mjs` refuses to
read a capture under `docs/` or from where git would take it.

**Images.** The converter draws only a `data:` image, which is all the IDE has, so `take.mjs` reads
each `<img>` in the clip with `Page.getResourceContent`, which no Content-Security-Policy or CORS
header can refuse, and shows it as a `data:` URL for the capture. A font goes the same way when
the page's own fetch of it is refused (`capture.mjs`'s `fontBytes`). A CSS `background-image` of
another address is not embedded: the judge sees it missing, and GitHub's six pictures have none.

**A theme** is `Emulation.setEmulatedMedia`, and on GitHub the attributes `data-color-mode`,
`data-light-theme` and `data-dark-theme`, since the account's own setting can name one theme
whatever the preference says. `quietPage` is a constructed style sheet, because the page's
Content-Security-Policy can refuse a `<style>` a script adds.

**A picture is trimmed from the whole window** (owner, 2026-11-06). A rectangle dragged by hand
comes out a little different at every retake, and a set of pictures should line up, so a shot of
the table is taken with **Whole viewport** and `chromeshot.mjs` cuts it down (`trim.mjs`). The
area is the box round the anchors of the shot's `trim` and the marks drawn (`capture.marked`), with
8 CSS px round it, as `shoot_docs` leaves round its marks, in document coordinates, so that a
scroll changes nothing. The area is worked out from the capture and not in the page, so that a
change to the table trims the same file again, which is also why `trim.mjs` has its own small CSS
matcher: tag, class, id, `[a]`, `[a=v]`, `^=`, `*=` and descendants, what the anchors use. The
six are laid out at `PAGE_WIDTH`, 1280, so that the window's width does not change the layout.
Cutting costs nothing: `encodePng` wrote `confirm-merge` in 53 KB against Chrome's 64 KB. A cut area
is on whole CSS px, so it is free of the steps of a clip's size at 150%.

**A take is driven from the tools** (owner, 2026-11-06). `chromeshot.mjs --take`, which
`shot_review.mjs` runs ([WIP.ShotReview.md, Runs](WIP.ShotReview.md#runs)), does what a person did
by hand round the capture, and nothing of the capture: only the person signed in takes it.
`chrome-take.mjs` keeps the extension in `%LOCALAPPDATA%\svgshot\extension`, a folder of its own,
so that Chrome's unpacked copy does not go when a worktree does and any checkout can bring it up
to date. What is copied is followed from the manifest (`extension-files.mjs`, which the test of
what the extension loads shares), as `scripts/svgshot` also holds the converter's Node tools.
The word list goes with it, and stays when a checkout has none. A folder that is not the
extension is refused, since files are removed from it. Each shot has its `url` in the table, and
the page is opened with `rundll32 url.dll,FileProtocolHandler`, which is what `start` does with no
shell to parse the address. A capture is noticed by the download folder's mtimes, from the
user's known folder for downloads, read from the registry since the owner's is on D:; the
browser saves under another name and renames, so a capture that shows is whole. The extension
keeps the permissions it had: it reports through the download folder, needing no host
permission for a local server. For the same reason the run tells the panel which picture is next
in `next.json`, in the extension's own folder, which the panel reads every two seconds; a panel
loaded from a checkout finds no such file. `chrome_try.mjs --follow` is what shows that this
works in a real panel.

**The signed-in pages** (2026-11-06) differ from logged-out ones. A capture holds the page's
whole DOM, so the anchors are read from it. `run-workflow`'s top button is a `BUTTON`, not a
`summary`. An anchor that finds nothing asks the owner to click, and a click can take a whole
drop-down, round which a ring, round to half its height, is a great ellipse over everything:
so a mark on anything over 48 px tall is a box. Two buttons say **Run workflow**, the first in
the DOM the one in `#__primerPortalRoot__`. GitHub's class names are hashed, so an anchor uses
`data-testid`, `data-component`, an id or `[class*=...]`. All the table's anchors find their
elements in the signed-in captures. **A mark is drawn on whole CSS px** (`wholeBox`).
`run-workflow`'s button stands at y = 195.25, and in the owner's Chrome a mark there is drawn
on device pixels in the PNG and half a device pixel away in the SVG: a white halo on a dark
ground, 0.292% of that small picture strongly off. Chrome for Testing 148 does not show this:
a test page with marks at a quarter of a pixel was 0% strongly off either way, so `chrome_try`
cannot catch it. A trim's `pad`
can name a side, and two anchors are there for what stood cut at a picture's edge: the merge
box's green tile and the next workflow. A badge on the left of a link covers the
word before it, and each mark has a `side`.

**The result**, a page drawn again from the bundle against its screenshot:

| Page | Display | Picture | Dark, pixels off (strongly) | Light |
|---|---|---|---|---|
| public | 100% | whole window, 2180 by 1698 | 0.165% (0%) | |
| public | 150% | whole window, 2166 by 1701 | 0.167% (0%) | 0.077% (0%) |
| public | 150% | whole window, scrolled 700 px | 0.128% (0%) | 0.034% (0%) |
| public | 150% | `compare-changes`, dragged, with its marks | 0.177% (0%) | 0.042% (0%) |
| public | 150% | a rectangle dragged with Windows' own mouse | 0.096% (0%) | 0.035% (0%) |
| signed in | 150% | `compare-changes` | 0.103% (0%) | 0.030% (0%) |
| signed in | 150% | `create-pull-request` | 0.095% (0%) | 0.032% (0%) |
| signed in | 150% | `merge-pull-request`, 1159 px down the page | 0.153% (0%) | 0.043% (0%) |
| signed in | 150% | `run-workflow` | 0.335% (0.110%) | 0.180% (0%) |

Two trims of one `compare-changes` came out the same to the byte, PNG and SVG, in both themes.
That page is too short to scroll, so they show the area repeats. That a scroll leaves it alone
rests on the area being in document coordinates and on the scrolled rows above; no pair of
trims of one scrolled page has been compared. `chrome_try --scroll` refuses a page that did not
scroll, since a `scrollTo` made before the tab shows does nothing, and is scrolled last for that.

The bar is 0.25% strongly off, and each is well inside it. Drawn again as a PNG and held to the
noise rule for two captures, the render does not pass: 2.9% of its pixels are over 16 levels off,
which is 0% once the SVG judge's shift of one pixel is allowed, so it is the edges of glyphs, as
with the IDE's pictures; that rule is for two captures of one state. `replay.mjs` draws the SVGs
again byte for byte from the cached bundle, with the files removed.

**Not tested by a session:** the trim of a signed-in capture from end to end, since those of
2026-11-06 were dragged; the anchors are tested on their DOM, and the trim on public pages.
`chrome_try` cannot drive the owner's branded Chrome, which ignores `--load-extension` since
Chrome 137, and signs in to nothing. An anchor that finds nothing asks the owner to click the
target, so a wrong one costs a click. Marks use `ring`, `box` and `badge`; the old pictures'
arrows are not copied.

**A second address.** `confirm-merge`'s Commit email list holds every address of the account,
and only the selected one is drawn. `chromeshot.mjs` counts each option as shown, so an address
`private.json` does not list refuses the capture, though neither its PNG nor its SVG shows it.
That is kept strict: it costs a line in the list, and that address is in the capture file.

**After the six are retaken** (the owner's): the page's `{:width height}`, which `chromeshot.mjs`
prints, the alt text of each picture against what it now shows, and any other mention of `main`
as the base branch.

**Open, the owner's:**
- The SVGs are to be checked in browsers other than Chromium's, with an online tool; leave
  them as they are until then.
- fontTools' `gvar` subsetting bug, worked round by `patch_gvar_subset`, is to be reported
  upstream: one line in `subset/__init__.py` (a glyph missing from `gvar.variations` read as
  having no variation), with a reproducer on a font with two axes under a free licence, such as
  Inter 4's variable file, never a Microsoft font.
- Whether the licences of the Microsoft fonts the pictures embed subsets of allow publishing
  them in the SVGs. Their embedding flags (OS/2 `fsType`) allow it: Segoe UI (regular, bold,
  semilight), Consolas, Segoe MDL2 Assets, Segoe UI Symbol and the web's Segoe UI Variable are
  0x8, editable embedding; Cascadia Mono is 0x0, installable. The flags are not the licence.
