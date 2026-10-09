# Screenshots — the plan for `shoot_docs.mjs`

The documentation's IDE screenshots go stale with every beta. `scripts/shoot_docs.mjs` (until
increment 1, `shoot_help_addin.mjs`, which took only the help add-in's eight pictures) retakes
them from a live IDE; this plan grows it to every picture of the IDE the documentation holds,
annotations included. The owner's decisions behind it are dated 2026-10-08.

## What there is to retake

About 212 raster images under `docs/` besides the help add-in's eight. By what producing them
needs:

| class | count | what |
|---|---|---|
| IDE UI, plain | ~150 | every menu, dialog, panel and editor view is HTML in the IDE's page, so all are reachable over CDP |
| IDE UI, annotated | ~43 | arrows, boxes, rings, numbers and labels drawn on top; 8 of them composites of several crops |
| not IDE UI | ~18 | running exe windows, GitHub pages, the splash window, one GIF: out of scope |

Stale already: About (BETA 953), New Project (BETA 950), `CallStack.png` (compiler v0.15.957),
`fafaloneIDEscreenshot1.png` (BETA 407), several package pictures (BETA 730).

## Decisions (owner, 2026-10-08)

- **One tool.** `shoot_help_addin.mjs` is renamed `shoot_docs.mjs`; the help add-in's pictures
  become one setup among the others.
- **2x pictures, shown at half size**: every retaken picture gets `{:width="W" height="H"}` (half
  its pixel size) on its page, as `docs/IDE/AddIns/Help.md` has. A JPG retaken becomes a PNG.
- **Menus are transparent cut-outs**, as today: the bar item and its drop-downs opaque, the rest
  alpha 0.
- **Annotations are redrawn by the tool in one house style**, anchored to what they point at,
  including the ones that only repeat the prose.
- **Composites are assembled by the tool** from element clips.
- **`fafaloneIDEscreenshot1.png`** (a community author's own annotated picture) and its downscaled
  copy are replaced by a project-made full-IDE feature map with the same labels.

## The IDE the tool drives

Measured by the s103 probe (8 IDE runs, BETA 997):

- **Fixed device scale.** The IDE page otherwise takes the host's scaling (1.5 here:
  `body.scale150`, 22.67 px menu rows). `--force-device-scale-factor=1` added to the WebView2
  browser arguments gives `scale100` and integer sizes; `Emulation.setDeviceMetricsOverride` at
  `deviceScaleFactor: 2` then gives a clean 2x. Menus and dialogs come out at the old pictures'
  CSS sizes to the pixel (File 189x336, Manage Keyboard Shortcuts 1016x736). **The help add-in's
  pictures change once when this goes in**: until now they followed the host's scaling.
- **No-project start.** `Lane.open` always opens a project. Started with no argument, the IDE
  shows its splash and then New / Open Project, with every menu in its no-project state. Needs a
  `Lane.openNoProject()` (`launchOnDesktop` with no argument, then `attachIde`). The lane's copy
  of the install leaves out `projects\` (29 MB): New Project then shows 2 templates and no
  samples, so a setup that shows them copies `projects\` into the lane's copy.
- **Theme.** The pictures are of the dark theme (`tbTheme_SwitchToDarkMode`, as now). The menu
  bar and dialog title bars follow the theme; drop-downs and dialog bodies are light in every
  theme.
- **Opening things.** Menus open on a real mouse press on `#rootMenu<Title>`; submenus on a real
  mouse move onto the item (~500 ms; wait for `#contextMenuSUB > .contextMenuItem`). Dialogs by
  `executeIdeCommand` (`tbHelp_ShowAboutWindow`, `tbIde_ShowIDEOptions`,
  `tbKeyboardShortcuts_ShowManageKeyboardShortcuts`, `tbPanels_ShowManagePanelLayouts`,
  `tbProject_New`, `tbToolbox_ShowMoreComponents`), closed by a real click on their Close /
  Cancel / OK button.
- **What the user's machine leaks into a picture**, and the answer for each:
  - the recent-projects lists (twinBASIC and VB6) read the user's registry: overridden in the
    page (`HostGetRecentsList`, `HostGetVB6RecentProjects`), nothing read or written;
  - the IDE's settings (View's ticks, IDE Options' values, the debugger options, the language
    tick, user panel layouts) live in `HKCU\...\twinBASIC_IDE\IDESettings`, not in the lane's
    private APPDATA — see Machine state in the pictures;
  - the licence line on About (`LICENCE: tB Licence: NOT READY` when the licence check has not
    finished) — the same section;
  - the Windows user name: the existing visible-text check stays and covers every picture.

## Capture

- **Opaque clip**: `Page.captureScreenshot` with a clip, snapped outward to whole device pixels
  (`floor(v*2)/2`, `ceil((v+w)*2)/2`). Dialogs clip `.modalDialogContainer` (its 40 px shadow
  falls outside).
- **Cut-out**: a style sheet sets `html, body, #bodyInner` transparent and `body *` hidden
  except the kept elements (`#rootMenu<Title>`, `#contextMenu`, `#contextMenuSUB`, or an
  annotation layer), plus `Emulation.setDefaultBackgroundColorOverride` to alpha 0; both undone
  after. Verified: corners alpha 0, interior 255, the rounded bottom corners partial.
- **Quiet page**: the existing style sheet against carets and animations goes into every shot,
  opaque ones included (the probe's IDE Options sample showed a caret without it).
- **Write only on change**: kept from the current tool. The tool prints, for each picture, the
  `{:width height}` its page should have and warns where the page disagrees; it does not edit
  markdown.
- **A capture is not byte-stable.** `Page.captureScreenshot` of an unchanged screen alternates
  between versions a few pixels apart by 1-14 grey levels: dialog shadow edges, the status bar's
  scaled Ko-fi bitmap, panel dividers, rounded corners. `captureBeyondViewport` and
  `fromSurface: false` are stable but drop the scrollbars and the cut-outs' alpha, so neither is
  usable. `capture` waits 1 s before the first capture (without it rounded-corner pixels come out a
  grey level off and stay so), then takes up to 8, 150 ms apart: it keeps one equal to the file on
  disk, else the first two in a row that agree, and fails if none agree. So a picture is rewritten
  when the IDE draws something different, not when the noise flips.
  **Left over, under the full parallel load:** a run now and then settles on the other version of
  one or two pictures and keeps it through every capture, so a longer wait in `capture` does not
  help: Diagnostics (34 pixels along an arrow's edge), 6ad7a172 (4 title-bar corner pixels),
  Menu_Window_PanelLayouts (one submenu corner pixel), 1-3 grey levels each; each is unchanged
  when its setup runs alone, and which one varies from run to run (`JOB_SECONDS` moves it, but is
  not the whole cause). Put such a picture back rather than commit it; diffs in
  `.claude/tooling-review-scratch/s103-shots/perf/diffs-final/`.
- **Settle by condition, not by sleep.** Fixed sleeps were most of a run (a closed menu leaves a
  2x8 px empty `#contextMenu`, so a wait for it to vanish always ran out its 2 s; ~3,000 calls).
  A menu is closed when it holds no items; a dialog is still when a MutationObserver has seen no
  change and its images and fonts are loaded; a floated panel when the IDE's `.flashElement` class
  is gone; a help page when its fonts, images and body are settled. The page size is set only once
  `body` has its `scale100` class: the IDE picks 48 or 32 px New Project tiles from it.
- **A picture that shows state sets that state itself** rather than relying on the shots before it
  (9eeffbcf, PackagePublishing_1, packLicenceFiles), so a picture is the same whichever IDE or
  order takes it.

## Annotations

An SVG layer the tool adds to the IDE page above everything (`z-index` max,
`pointer-events: none`), drawn in CSS pixels, so it scales with the 2x capture and survives a
cut-out as a kept element.

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
22 px with a white bold numeral. No hollow block arrows, no hand-drawn strokes.

**Composites** (the five CustomControls code-to-property pictures, `Editor.png`, `DebugConsole.png`):
each part is captured as its own clip; the tool then lays the parts out in a full-window layer
in the same page (`<img>` of each part on a plain background, with a gap), maps each part's
anchors through its placement, draws the overlay across, and captures the layer.
**Native `<select>` lists** (Editor.png's four, a FAQ picture, one tutorial) open in an OS
window no CDP capture holds: the tool draws a replica list from the select's options, styled
as the IDE's own pop-up list, beside the select.

## The tool

`scripts/shoot_docs.mjs [--only <regex>] [--port N] [--ide <path>] [--jobs N] [--diffs <dir>]`,
with the current tool's exit codes (0, 1 a picture failed, 2 the tool could not run, 3 not put
back).

- **Setups**: one IDE each --- `no-project` (menus, dialogs, panels), `help` (the add-in's eight,
  `test/addin/helpdemo`), `project`, `sample`, the `settings` setups, `glyphs`, `global-search`
  (Sample 15 exported from the install, built into the lane's copy as an add-in, its own project
  opened), `sample6` (Sample 6 exported and opened) and `designer` (the sample fixture with
  `test/shots/designer/` staged onto it, plus the Global Search add-in for Toolbar_3; it sets the
  page's `currentDPI` to the 2x ratio, or the IDE's 5 s DPI check covers every designer with
  RESYNC), and `forms` (the same without the add-in). A setup is `{name, start, prepare}`.
  Every add-in a setup loads has its `SaveSetting` key snapshotted, emptied and restored
  (`tbDocsHelp`, `GlobalSearchAddIn`).
- **Jobs**: `--jobs N` (default 6) runs setups at once, each IDE on its own claimed ports and
  private desktop, and splits the big setups into parts, longest first; a full run is about
  110 s (it was ~765 s sequential; the jobs add up to over 600 s, so six IDEs cannot do much
  better). `--jobs 1` runs one IDE per setup in table order. Per-run
  state lives on the connection (`c.shot`), never in module variables.
- **Diffs**: `--diffs <dir>` (never under `docs/`) writes, for each picture that differs from the
  file on disk, the committed picture, the new one and an amplified difference map side by side
  (`scripts/lib/shot-diff.mjs`, `composeComparison` with `amplify` in `scripts/lib/png.mjs`).
- **Shots**: a table of `{out, setup, take, annotate?}`, `out` the picture's path under
  `docs/`; `--only` matches it. `take(ctx)` brings the IDE to the state and returns the clip
  (or the parts of a composite); `annotate` is a list of primitives.
- Shared helpers move from the probe kit (`.claude/tooling-review-scratch/s103-shots/ui.mjs`):
  `openMenu`, `hoverItem`, `closeMenus`, `waitModal`, `closeModal`, the cut-out, the snap.

## Increments

1. **Rename and the no-project setup**: `shoot_docs.mjs`; the device-scale fix and
   `Lane.openNoProject`; cut-out capture; the 19 menu pictures, `Menu.png` and the 13 dialogs
   (About, IDE Options, the two Manage dialogs x2, New Project's tabs, Recent x2, Components
   message, the FAQ's New Project Options and Samples, `llvmdoc2`); pages get their
   `{:width height}`; alt text and prose checked against each new picture (the Tools menu has
   two new entries; About's text changed). Retake the help add-in's eight with the scale fix.
2. **Done: the overlay** (`scripts/lib/shot-annotate.mjs`), on the annotated pictures of the
   same setup (`7e1cb69c` New tab, `6ad7a172` and `ccSampleProject` Samples tab,
   `tbWebView2Sample0`). Labels and badges take the IDE page's own font, Segoe UI, since the page
   has no Inter and none is injected; the dark pill is `#8E161A`. The anchors search the main
   document only, so increment 3's tool windows need shadow roots added. `label`, `box`,
   `underline`, `bend`, forks and `{code}` anchors work in a probe but are in no picture yet.
3. **Project setups**: Project Settings with a filter, the panels, Project Explorer, the
   Global Search add-in (Sample 15), and their annotated pictures.
4. **Designers and code**: a form with controls, the CustomControls sample project, Compiler
   Constants; the composites and the replica select lists.
5. **The feature map**, replacing `fafaloneIDEscreenshot1.png` and `014a1d28`.

6. **The rest**: the pictures left out of increments 1-5, by the owner's disposition below.

## Increment 6 (owner, 2026-10-09)

**Increment 5 is done**: `Features/Images/IDE-FeatureMap.png` (2880x1800, setup `featuremap`,
fixture `test/shots/featuremap/` FeatureTour) replaces `fafaloneIDEscreenshot1.png` and
`014a1d28`, both deleted. Twelve labels, each anchored to an element or code span; Problems is
labelled Diagnostics, its 997 title. Sticky scroll, advanced hover info, inline hints, folding
always shown and the debugger's memory figures are switched on in the page only; the memory
figures, which change from run to run, are fixed in the page once real ones are shown, as
History's times are. `Services_Operational` was retaken (setup `project`). Two of the three
pictures added to increment 5 were left: **`Services_Operational_Tooltip` is the badge's native
`title`**, which no capture holds; **Fusion's 569099635**: the `settings-fusion` project only ever
writes `[BUILD] failed to build Fusion server file '...'` (on load and after a compiler restart),
never the "successfully built" line -- a possible IDE defect, or the lane's staged layout; not
reproduced elsewhere.

After increment 5, 53 images under `docs/` are outside the tool; the unreferenced
`Documentation/Images/environment-variables.png` was deleted (`7d5b5633`). The two left from
increment 5 join the groups below: the tooltip the special IDE states, Fusion the running
programs (it needs a project whose Fusion host really builds). The owner's
disposition, group by group:

- **Special IDE states** (`IDE/Status Bar.md`'s `Services_Limited`, `Services_Unavailable` and
  the three badges' tooltips -- native `title` tooltips, which no CDP capture holds, so these need
  another route --, `Licence_CommunityEdition`; `IDE/Splash Screen.md`'s `Splash_Screen`): **inspect
  the IDE page first to see how each state can be reproduced**, then generate them. A state is
  reproduced as the IDE reaches it, never by editing what it draws.
- **Pictures of a running program** (`Anchoring-Docking.md`'s 3fa1cf2b, 0aeb25f6, fddbffa9,
  4829696d, bc9f3756, 599a66ad, 80185a8d; `GUI-Components/New.md`'s 4ad9c774, 5fc60b7b;
  `Forms.md`'s 85f25aa2; `Inheritance.md`'s b0724fe2; `CodeLens.md`'s 351d0147; `Debugging.md`'s
  021f6cbf; `Toolbar_4`; `Creating a TWINPACK package.md`'s 8d74d820 and packPublishComplete1;
  `Fusion.md`'s 569099635, a successful Fusion host build):
  **write the program or programs that illustrate what each picture depicts, and run them while
  the pictures are taken.**
- **Package server** (the other Features/Packages pictures: Importing from TWINSERV, Importing from
  a TWINPACK file, Linked Packages, Updating a package, packPublishPackage1): **network access is
  fine. Never actually publish a package**; everything short of that is allowed. The
  byte-identical pair d9f1e4d9 / e749e10f is still the open question below.
- **Not of the IDE**: retake what can be reproduced. A `.vbp` import uses a **synthetic `.vbp`
  project**, and the path is **scrubbed** from the picture (16833fae). The others in the group
  (`Documentation/Building.md`'s GitHub and Affinity screenshots, `IDE/Webpage.md`'s `Webpage`,
  `FAQs.md`'s 94490c87 and ac019c1a, `Package-Server.md`'s 5951dab6) get the same treatment where
  they can be reproduced. **`Tutorials/WebView2/Images/tbWebView2InAForm.gif` is skipped**, and
  **`favicon.png` is never changed** by this work.

## Machine state in the pictures (owner, 2026-10-08)

- **The IDE's settings** (View's ticks, IDE Options' values, the debugger options, user panel
  layouts and keyboard groups) are set to their defaults **in the page only** — `liveIDEOptions`
  and the like, in memory, never saved — so no picture shows the user's choices and nothing is
  written to the registry.
- **About's licence line**: the tool waits for `licenceIsSet` before opening About, so it shows
  the edition, never NOT READY.
- **The language tick** stays on whatever language the IDE runs in.
- **`llvmdoc2`** shows the default thread count, 1 (the old picture's 10 was its author's
  setting); the LLVM page's prose is checked for any reliance on 10.

## Increment 3 (owner, 2026-10-08)

Survey of its 61 pictures and 17 glyph crops: `.claude/tooling-review-scratch/s103-shots/INC3-SURVEY.md`.
Built in three batches, one after another: no-project panels; a Standard EXE fixture with Project
Settings; Sample 6, Sample 15 and Global Search. **All three batches are done** (`b958f18a`,
`079185d0`, `74c6ed4d`, and batch 3 after `f916a99c`). In BETA 997 Sample 6's control images
are in the CustomControls package's Miscellaneous folder, not the project's, and the tutorial
says so.

- **History's times are fixed in the page**, as the recent lists are, and its project is a
  project-made fixture; left out only if the times cannot be overridden.
- **The glyph crops are retaken** (element clips, 2x, shown at half size).
- **A machine or account value becomes a neutral one** (Publisher blank or a project-made name;
  the COM list shows this machine's, under the username check), and prose that names the old
  value is changed to match.
- **Old-design pictures are retaken in today's look**, with alt text and prose rechecked.

## Increment 4 (owner, 2026-10-09)

Survey: `.claude/tooling-review-scratch/s103-shots/INC4-SURVEY.md`, four batches (designers and
Format menu; Properties and Toolbox; replicas and composites; code views).

- **Composites** lay their parts out on the IDE's dark background (not white), with a gap, code
  on the left and the panel on the right, one red arrow across.
- **Replica select lists** take one style: a white list, 1 px grey border, the IDE's font, the
  current option on mid-grey `#6E6E6E` with white text.
- **The CustomControls tutorial's pictures** come from a project-made fixture,
  `test/shots/customcontrols/`, referencing the CustomControls package, with a class using the
  tutorial's names (`MyField`, `MyEnum`); the Toolbox may list two grids.
- **No mouse pointer** is drawn in any picture.
- (Main session) The designer pictures come from a `designer` setup that stages files onto the
  sample fixture at run time; controls are put on forms by hand-written `.tbform` files.
- **Batch 1 is done** (designers, the Format menu, Toolbar_3). The report is made in the page by
  Sources > Add > Add Windows Report. Toolbox_Report is the *docked* Toolbox: a floating one
  lists every tool even with a report active (`reportDesignerMode` is set on `#bodyInner`, which
  a floating panel is outside) -- a possible IDE defect, not yet reproduced or queued. After the
  Format shots the designer marks frmControls changed with no control moved (cause unknown), so
  those shots close it with Discard Changes.
- **Batch 2 is done** (the Anchors pair, the QR code beside the Toolbox, the FAQ's ICON crop, the
  WebView2 tutorial's Toolbox and PROPERTIES). Setup `forms` is `designer` without the add-in;
  `settings-webview2` also stages `test/shots/designer/webview2/` (frmWeb, a WebView2 `Web1`
  with no DocumentURL, so the designer loads nothing), since only that setup references the
  package. `MyOwnIcon.ico` is the template's icon copied at run time. 8611d12a's panels are put
  in place by `restorePanelLayout` in the page and the default layout put back after; the crop
  stops at History's title bar (its entries carry the real time) and left of the IDE's title.
  In 997 PROPERTIES is grouped by category only (Anchors in LAYOUT, WebView2's own properties in
  GENERAL), and **a property's description is never shown at the panel's foot**: it goes to the
  designer's own `.proprtiesBoxFooter` inside the code panel, not the tool window -- a possible
  IDE defect, not reproduced or queued. The WebView2 tutorial now points to the class reference
  instead. A floating Toolbox for a form lists what the docked one does.
- **Batch 3 is done** (Editor.png, FindReplace_Direction, 2a1c71fd, 4c8b881e and the six
  CustomControls property-sheet pictures). **Replicas** are the overlay's `list` primitive: the
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
- **Batch 4 is done** (the Compiler Constants pair, flags-attribute, the CustomControls code
  crops, ClassId insert, the ICustomControl hover, the custom property, the form JSON,
  tbWebView2CreateEvent). `codePart` wraps `codeLines` (any open file; `include`, `extraRight`,
  `annotate`, `hover`, `view`, `bare`). Setup `code` stages `test/shots/code/` (ConstantsDemo,
  FlagsDemo); `buildConfiguration` changes `buildConfigSelector`, waits for the greying to move,
  and clears the DEBUG CONSOLE, whose compiler-restart line names the user's folder. Inline
  hints need *Always show IDE Inline Code Hints* (`codeHintsVisibility2`, off by default), set
  in the page only. The ClassId hint shows only for `[ ClassId () ]` above a class, put in by
  `executeEdits`: typed, the IDE reformats it to `[ClassId()]` with no hint. The JSON view shows
  the file's text, so `frmCustomJson.tbform` holds `"MyField": 0` (in `frmCustom` it would
  override `= 42` in 1b). Setup `sample9` opens Sample 9, whose `WebView_Create` is unchanged.

## Open questions

1. **The byte-identical pair** `d9f1e4d9` / `e749e10f` (Features/Packages/Images): merge into one
   file when it is retaken (recommendation).
