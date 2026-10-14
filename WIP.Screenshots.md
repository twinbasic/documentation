# Screenshots — `shoot_docs.mjs`

The documentation's IDE screenshots go stale with every beta. `scripts/shoot_docs.mjs` retakes
them from a live IDE: every picture of the IDE the documentation holds, annotations included,
and the program windows and web pages that sit beside them. The owner's decisions behind it are marked (owner).

## What there is to retake

Every menu, dialog, panel and editor view of the IDE is HTML in the IDE's page, so all are
reachable over CDP; annotations (arrows, boxes, rings, numbers, labels) are drawn on top by the
tool, and a composite is assembled from several clips. Running programs' windows and a few web
pages are taken beside them.

### Pictures still outside the tool

Ten images under `docs/`, each for a stated reason:

- **The six GitHub walkthrough pictures** of `Documentation/Building.md` (compare-changes,
  create-pull-request, merge-pull-request, confirm-merge, choose-workflow, run-workflow): the
  owner's to retake by hand, with a signed-in account (owner); no agent touches them
  or their prose. They show base `main` and the old workflow name, and confirm-merge an e-mail
  address, until then.
- **`packPublishPackage1`**: `packagePublisherPublish` opens the sign-in form when no publisher
  is signed in, before the confirmation box, and a package is never actually published, so the
  old file stays. **`packPublishComplete1`** is the result of a real publish, so it stays too.
- **`Tutorials/WebView2/Images/tbWebView2InAForm.gif`** is skipped (owner).
- **`favicon.png`** is never changed by this work (owner).

## Decisions (owner)

- **One tool.** `shoot_docs.mjs`; the help add-in's pictures are one setup among the others.
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
- **What the user's machine leaks into a picture**, and the answer for each:
  - the recent-projects lists (twinBASIC and VB6) read the user's registry: overridden in the
    page (`HostGetRecentsList`, `HostGetVB6RecentProjects`), nothing read or written;
  - the IDE's settings (View's ticks, IDE Options' values, the debugger options, the language
    tick, user panel layouts) live in `HKCU\...\twinBASIC_IDE\IDESettings`, not in the lane's
    private APPDATA — see Machine state in the pictures;
  - the licence line on About (`LICENCE: tB Licence: NOT READY` when the licence check has not
    finished) — the same section;
  - the Windows user name: the visible-text check (text boxes included) covers every picture,
    run before the first capture and again when a capture is chosen, with the SVG under
    `--svg`: the page can draw again in between, as Project Settings does, putting the real
    build path back over the template a shot had set in the page only (a shot that sets a
    value types it, `input` and `change`, so the page keeps it).

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
  usable. `capture` waits 1 s before the first capture (without it rounded-corner pixels come out a
  grey level off and stay so), then takes up to 8, 150 ms apart: it keeps one equal to the file on
  disk, else the first two in a row that agree, and fails if none agree. So a picture is rewritten
  when the IDE draws something different, not when the noise flips.
  Under the full parallel load a run now and then settles on the other version of one or two
  pictures (1-3 grey levels, a few pixels to a few hundred along an edge) and keeps it through
  every capture, so a longer wait in `capture` does not help; each is unchanged when its setup
  runs alone, and which one varies from run to run. So **a picture within a capture's noise of
  its file is left as it is** (`nearly`: one size, no channel more than 16 levels apart, at most
  0.5% of the pixels apart), reported `unchanged but for a capture's noise`, with a `.noise`
  picture under `--diffs`. The same test decides that a light picture is the dark one.
- **A shot may name where the page flickers of its own accord** (`unsteady` in `capture`'s
  options): a list of `{on, pad}`, `on` an annotation anchor (see [Annotations](#annotations))
  and `pad` how far round its box, in CSS px (1 by default, an edge's anti-aliasing). Every
  comparison `capture` makes leaves those pixels out (`same`, and `nearly`'s `rects`), and a
  capture that matches the file or the dark picture outside them keeps that picture's bytes,
  so the flicker never rewrites the file. Use it for a pixel no condition settles, as small as
  the element allows: the WebView2 download page's Version arrow (`#version
  .px-dropdown__icon`, 8 by 9) changes a pixel by more than the noise between any two
  captures, animations and transitions off. A shot without it compares byte for byte.
- **Settle by condition, not by sleep.** Fixed sleeps would be most of a run (a closed menu leaves a
  2x8 px empty `#contextMenu`, so a wait for it to vanish always runs out its 2 s).
  A menu is closed when it holds no items; a dialog is still when a MutationObserver has seen no
  change and its images and fonts are loaded; a floated panel when the IDE's `.flashElement` class
  is gone; a help page when its fonts, images and body are settled. The page size is set only once
  `body` has its `scale100` class: the IDE picks 48 or 32 px New Project tiles from it.
- **A picture that shows state sets that state itself** rather than relying on the shots before it,
  so a picture is the same whichever IDE or order takes it.

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
22 px with a white bold numeral. The dark pill is `#8E161A`. No hollow block arrows, no hand-drawn strokes. **A label's
tone follows the theme** unless the shot names one: dark in the dark theme, light in Light,
read from the page's panel colour. Every label today sits on what follows the theme (a panel's
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

`scripts/shoot_docs.mjs [--only <regex>] [--out <dir>] [--port N] [--ide <path>] [--jobs N] [--diffs <dir>] [--svg]`,
Exit codes: 0 every picture written or unchanged, 1 a picture failed, 2 the tool could not run,
3 not put back.

- **Setups**: one IDE each --- `no-project` (menus, dialogs, panels), `help` (the add-in's eight,
  `test/addin/helpdemo`), `project`, `sample`, the `settings` setups, `glyphs`, `global-search`
  (Sample 15 exported from the install, built into the lane's copy as an add-in, its own project
  opened), `sample6` (Sample 6 exported and opened) and `designer` (the sample fixture with
  `test/shots/designer/` staged onto it, plus the Global Search add-in for Toolbar_3; it sets the
  page's `currentDPI` to the 2x ratio, or the IDE's 5 s DPI check covers every designer with
  RESYNC), and `forms` (the same without the add-in), `community` (the demo, its compiler
  restarted on an empty licence key in the page) and `splash` (the demo, for the splash
  alone), `programs`, `codelens`, `memory`, `package` and `fusion` (pictures of a running program),
  `package-server`, `settings-linked` and `package-check`, `import`, `webpage` and `web` (a
  Chrome, not an IDE), `featuremap`, `code-chapter`, `debugging`, `forms-chapter`, `customcontrols`, `code` and `sample9` (all described
  below). A setup is `{name, start, prepare}`.
  Every add-in a setup loads has its `SaveSetting` key snapshotted, emptied and restored
  (`tbDocsHelp`, `GlobalSearchAddIn`).
- **Jobs**: `--jobs N` (default 6) runs setups at once, each IDE on its own claimed ports and
  private desktop, and splits the big setups into parts, longest first; a full run with `--svg` is
  about 17 minutes in both themes on BETA 1005: the jobs add up to about 5,900 s, and the longest
  part, `forms-chapter`, takes about 450 s on its own, so six IDEs cannot do much better.
  `--jobs 1` runs one IDE per setup in table order. Per-run
  state lives on the connection (`c.shot`), never in module variables.
- **Diffs**: `--diffs <dir>` (never under `docs/`) writes, for each picture that differs from the
  file on disk, the committed picture, the new one and an amplified difference map side by side
  (`scripts/lib/shot-diff.mjs`, `composeComparison` with `amplify` in `scripts/lib/png.mjs`).
- **Shots**: a table of `{out, setup, take, annotate?}`, `out` the picture's path under
  `docs/`; `--only` matches it or its `.light.png`, and selects the shot in both themes.
  `take(ctx)` brings the IDE to the state and returns the clip (or the parts of a composite);
  `annotate` is a list of primitives.
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
  same way twice is a real fault.
- **`Features/Images/a6525b1d...png` changes width from run to run** (1512 or 1514 px); its
  light picture is narrower again (1498). Each comes out within the 32-pixel tolerance, so the
  run passes, but the file can be rewritten for the width alone.

## Standing rules for what a picture shows (owner)

- **A state is reproduced as the IDE reaches it, never by editing what it draws.** The tool
  inspects the IDE's page first to see how a state can be reached.
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

## The "Writing code" chapter

Setup `code-chapter` (three parts): FeatureTour, the feature map's Inventory project, with
`test/shots/codechapter/` staged onto it (`Helpers`, `Ev`/`Ev2`, `Watcher`) and the project's
warnings set so that TB0016 is a hint and TB0012 information. Its 20 pictures are under
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

## The "Running and debugging" chapter

Setup `debugging` (three parts): the code-chapter project with `test/shots/debugging/`
staged onto it as well, a module `Checks` with the chapter's `FillTable` (a Subscript error on
its fourth pass), `PingLater` (`Shell "ping -n 20 127.0.0.1", vbHide`) and `WaitAWhile` (a
`DoEvents` loop of a minute at most). It is a setup of its own because the code chapter's
combo boxes list the project's modules. Its 16 pictures are under `docs/IDE/Debugging/Images/`,
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
  pixels shorter than the dark one. The form at 50 % is not in it: its scaled dots differ in
  every capture, even with the ground left out.
- **The Toolbox is scrolled with the mouse wheel**: a capture never holds more than the real
  window's height, so a taller page does not show more of it. Show Control Names is set from the
  panel's `...` menu and put back afterwards (saved nowhere). The search of Toolbox_Search is
  ended (the box focused, Escape) after the capture, or every later picture's Toolbox lacks
  tools.
- **A report's PAGE WIDTH, LEFT MARGIN and RIGHT MARGIN bars show only under the pointer**
  (opacity 0, 1 on hover): Report_Controls rests the pointer on PAGE WIDTH.
- **Preview_Window** is a running program's window, taken once with `captureWindow` from the
  IDE's desktop. The File menu is not open in it: a native menu is a window
  of its own (`#32768`), which the tool cannot yet capture and lay over the form's window.
- PROPERTIES shows no description line: in BETA 1005 its text is set in a footer of the
  designer's own properties box, which is 0 pixels wide, so nothing is drawn.

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
  registry value is never read, changed or removed by the tool, and the save call is one
  `PAGE_DEFAULTS` has made do nothing. `doCommunityNagScreens` runs; its only screen is dated
  1-7 January 2026.
- **`Services_Limited`** (setup `community`): LIMITED is never a lasting state. The page draws it
  for about 0.6 s while a compiler starts (its own connection up, the page then connecting FS,
  LSP and the debugger one after another, once the compiler has loaded the project). Closing one
  connection from the page is no route: the browser takes 60 s to close it (the compiler never
  answers the closing handshake), the IDE then draws LIMITED for 0.1 s, the compiler ends, and
  the IDE starts another. `Network.setBlockedURLs` does not stop a WebSocket, and throttling the
  page's CPU (`Emulation.setCPUThrottlingRate` 40) holds LIMITED but makes every evaluation time
  out. The shot holds the page's `fs.connect` call of a restart (the toolbar's button) until the
  capture and then makes it as the IDE did. The restart's DEBUG CONSOLE line names the project's
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
  client area and a layered window's key and alpha. `tb-launch.ps1` is 28,576 characters of the
  30,000 its environment variable allows.

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
  takes the focus (`TabStop` off), since a focused one drew a caret or, now and then, a focus
  rectangle. With both, repeated runs are unchanged.
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
  console names are on `PACKAGE_ROOT`, `\tbshots` at the root of the temp folder's drive
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

## Package server

Taken on BETA 1005, in both themes where the theme shows.

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
- **`packPublishPackage1`** is not retaken: `packagePublisherPublish` opens the sign-in form when no
  publisher is signed in, before the confirmation box.
- **`e749e10f`**: the gear is the Project Explorer's;
  the dialog is shown whole with the gear beside it (2324 px wide; a smaller page does not make
  the dialog narrower, it covers the gear). The full dialog fills Available COM References
  (hidden, its text in the page), whose paths name the user: the shot waits for that list and
  then renames the user in the page.
- **`f48a7254`** starts at the question's left edge: the row being ticked shows an animated
  spinner no two captures hold alike. **`e2a65dfe`**: the completion list is the IDE's own
  (`.debugConsoleEntryIntellisenseBox`), shows types as `...` until the compiler gives them
  (now and then never: the dot is retyped), and is placed by the list the name before the dot
  opened unless that is closed first.
- **Compiler crash, not narrowed**: about 3 runs in 10 of the setup, an Apply that embeds or
  removes CSharpishStringFormater meets `NATIVE EXCEPTION: ACCESS_VIOLATION {no-basic-code}
  [twinBASIC_win32.dll+0010BD3F]`; ten probe cycles of the same steps did not reproduce it. Not
  queued. `applyChanges` clears the DEBUG CONSOLE first, so one crash does not fail every later
  Apply, and prints the crash lines.
- All pictures are page captures, so the page-text check for the user name covers them.

## Not of the IDE

Taken on BETA 1005.

- **`16833fae`** (setup `import`): the sample open, and `test/shots/vbp` (ImportDemo: a form,
  a module, `..\Shared\modShared.bas` for `{PARENT-FOLDER}`) staged with CRLF on
  `PACKAGE_ROOT\Projects` (the path the dialog shows, `C:\tbshots\Projects\ImportDemo\ImportDemo.vbp`),
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
  or written), floats the pane at 340x500, captures the pane's target with
  `setDeviceMetricsOverride` at the body's size less 2 (the host puts the WebView2 one pixel
  inside it, `syncPosition`) at 2x, and pastes it into the page's capture of the pane. The page's
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
  does not name them; its install-size entry says about 40 MB and 120 MB (the BETA 1005 folder
  less the runtime's `.WebView2` data folder).
- `test/addin/help.test.mjs` fetches `/favicon.png` as its sample PNG, so `favicon.png` must stay
  a PNG.

## Machine state in the pictures (owner)

- **The IDE's settings** (View's ticks, IDE Options' values, the debugger options, user panel
  layouts and keyboard groups) are set to their defaults **in the page only** — `liveIDEOptions`
  and the like, in memory, never saved — so no picture shows the user's choices and nothing is
  written to the registry.
- **About's licence line**: the tool waits for `licenceIsSet` before opening About, so it shows
  the edition, never NOT READY.
- **The language tick** stays on whatever language the IDE runs in.
- **`llvmdoc2`** shows the default thread count, 1.

## Project-setup pictures (owner)

Project Settings, the panels, Project Explorer, Sample 6, Sample 15 and Global Search.
Sample 6's control images are in the CustomControls package's Miscellaneous folder, not
the project's, and the tutorial says so.

- **History's times are fixed in the page**, as the recent lists are, and its project is a
  project-made fixture.
- **The glyph crops** are element clips, 2x, shown at half size.
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
  (`scripts/subset_font.py`), hinting kept. Glyph outlines render poorly and are not used;
  nor is harfbuzzjs ("don't mess with harfbuzz").
- The PNG and the SVG are both committed. One SVG per theme, not a single SVG switching on CSS
  variables.
- Pages name `X.png` and the build substitutes; `png` in the attribute block keeps the PNG.
- `picture_svg` in `_config.yml` per output: online and book on, offline (and so the help
  archive) off.
- No `<picture>` fallback for old browsers; the per-picture `png` instead.

**How a picture is drawn** (`scripts/svgshot/`):

- `capture.mjs`'s `svgOfPage` reads, while the page is as captured: a DOM snapshot (layout, text
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
- `diff.mjs` renders the SVG as an `<img>` at 2x and compares it with the PNG by luminance and
  alpha, a shift of one device pixel allowed, so that the PNGs' ClearType fringes mostly cancel
  out.
- **The SVG's size is the PNG's.** A clip half a CSS pixel past a whole one (a menu 168.5 wide)
  is captured a device pixel short of it, 168 wide, from the same origin; an SVG of the whole
  clip shows the half of the edge the PNG cuts off. That column alone put a small picture past
  the bar (a 16-pixel icon at 11%, a menu at 0.5%), so `capture` gives `svgOfPage` the clip
  with the PNG's width and height.
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
  from more pictures in flight; with the GPU on, every browser shared it and four processes
  were as fast as fourteen, and fourteen timed a screenshot out. A bundle answers only what the converter asked at capture; a question
  it has no answer for is a *miss*, counted by `renderBundle`, and replay lists a picture whose
  misses are new since its capture, whose PNG hash changed, or whose bundle lacks a style now
  read, with the `--only` command that retakes them. **A change to what is read from the page
  that no miss shows raises `BUNDLE_VERSION`**: version 2 (the web font rules, `fontFiles`,
  `svgs`) does not read a version 1 bundle, and replay lists every one as needing a retake.
  Reading version 1 would replay a split font with the one file it
  kept, and a picture with an inline `<svg>` without it, and nothing in a version 1 bundle
  says which pictures have either. Answering misses offline in headless
  Chromium, and drawing bundles in `tbdocs`, are later steps, not done: the second needs the
  bundles committed, so cleaned of the user name, and complete, since CI
  has no Windows fonts to measure with.
- **A filter of colour functions is baked, not drawn** (`colour-filter.mjs`; owner).
  Chromium's PDF backend cannot express an SVG `<filter>` and draws the whole filtered group as a
  300 dpi bitmap, text included: the book would lose the text of 44 of its 110 SVGs that way. Every CSS
  filter function but `blur()` and `drop-shadow()` is an affine colour map, which commutes with
  antialiasing, so mapping each fill, stroke, gradient stop and text class under the group paints
  the same picture on screen, to a channel's rounding; `opacity()` becomes the group's opacity.
  A real filter stays only round an embedded image (a `<g filter>` def wrapping it) and over a
  group that blends or already holds a real filter group. A `drop-shadow()` last in the list
  (the IDE's toolbar codicons glow with one) is split the same way: the shadow alone, from a
  copy of the group under a filter that blurs its alpha, then the group over it unfiltered,
  which is what the filter's own merge paints. One SVG serves screen and book, since the
  bake is exact. Blurred shadows stay bitmaps in
  the PDF, which loses nothing.
- **The bar** (`SVG_FAITHFUL` in `shoot_docs.mjs`): an SVG with more than 0.25% of its pixels 96
  grey levels or more off is not written, and an older one is removed. Anything not drawn falls
  to it.
- **One line** (`oneLine`). Git checks a picture's SVG out with CRLF where `core.autocrlf` says
  so, since no `.gitattributes` rule can tell it from a diagram's SVG. An SVG icon embedded as
  text and the annotation layer's XML hold line breaks; so each is written as the space an XML
  parser makes of a break inside a tag, or `&#10;` in text, the same character. A checkout then
  changes only the last line ending, which `keepSvg` ignores when it compares.

**Scrollbars.** The IDE styles every scrollbar with `::-webkit-scrollbar` rules
(`ide/styles.css`, coloured by theme variables), a second family under `.modalDialogContainer`.
`getComputedStyle` cannot name a scrollbar part or a state such as `:vertical`, and a rule's text
cannot be copied onto an element of the tool's own: Chromium drops a `var()` shorthand from
`cssText` once a longhand overrides part of it, as the thumb's `background-clip` does its
`background: var(...)`. So `scrollbarParts` gives each rule that styles this element's
scrollbars, for a moment, one more selector, matching a probe element per part with the
specificity of the selector it stands for; Chromium cascades and resolves the `var()`s, and the
rules are put back. The parts are laid out as Chromium's custom scrollbar theme does: a button's
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

**A background image is sized by its bytes** (`naturalSize`), not by the type its URL names:
the IDE calls a JPEG and a BMP `image/png`. The About dialog's EXCALIBUR logo is such a JPEG,
drawn with `background-size: contain`; read as a PNG, its JFIF header gave 4,718,592 by about 4.3
billion pixels, and the logo would come out 0.054 px wide.

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
snapshot: it is reported as "a frame of another process" (Help_Window's, the Webpage pane's).
Not done yet, and the way to do it: attach to that frame's own target (`Target.setAutoAttach`
with `flatten`, or the targets `shoot_docs` already finds for the PNGs), take its snapshot and
measure it there, and nest it at its `<iframe>`'s content box as a same-site frame is
(`DOM.getFrameOwner` names the `<iframe>` of a frame id). A bench page gets such a frame from
an `<iframe>` on `127.0.0.1` while the page is on `localhost`: another site, so its own process.

**Web fonts** are found by CSS font matching on the run's `font-family` list, style and weight
(`webFontFiles`, in the page), not by the face's own name: the site's Inter calls itself "Inter
Variable", and the last rule of a family can be its italic file. A family split by
`unicode-range` (Microsoft's Segoe UI Variable: five files per weight, Latin, Latin Extended,
Cyrillic, Greek, symbols) gives a run every rule whose range holds one of its characters
(`webRulesFor`, the last such rule per character, as CSS does), only those files are read, and
`PictureFonts.css` gives each file only the characters in its own range even where its cmap
has more. A variable WOFF2 is read in `fonts.mjs` and cut at each weight the picture uses,
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
fitted in Edge on bench pages of their own.

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
draws the pages under `scripts/svgshot/bench/` (scrollbars, native scrollbars, drop-down lists,
underlines, focus rings, frames, a web font split by range, inline SVG, a scrolled page with an
annotation layer, SVG in frames), served from `127.0.0.1` with the site's fonts under `/fonts/`
(a `file:` page cannot `fetch` its font bytes), with the converter
and compares them with the browser's own picture: in Edge, whose Chromium is the IDE's WebView2's
(Puppeteer's trails it, and draws the select's arrow otherwise), laid out at 1x and drawn at 2x
as the IDE is, text without ClearType. Each page is held to the figures recorded in
`bench/baseline.json` (`--update` records them): no page comes out exact, and a fixed limit
would miss a small fault (arrows a quarter too tall move a page from 0.025% to 0.064%). `node scripts/svgshot/pixels.mjs <png> x y w h --beside <png>` prints a
rectangle of two pictures as letters, one per colour: how an edge, a stroke or a blend came out.
A new replica gets a page there.

**Not drawn yet:** a thin platform scrollbar (`scrollbar-width: thin`), a zoomed frame's
scrollbars, a textarea's resize grip, a number input's spin buttons, an indeterminate checkbox,
conic gradients, the 2011 `-webkit-radial-gradient`, `filter: hue-rotate`, an inset shadow's
blur, a search input's cancel button (the help pane's `#helpSearch`), and a frame of another
process: Help_Window's and the Webpage pane's (which `webpage` pastes into the PNG from its own
capture), so those pictures stay PNG. In an inline `<svg>`: a `<foreignObject>`, an `<image>`
the page cannot read, a `<use>` of another file, a CSS `mask` or `clip-path` on the root, text
decoration, geometry set by CSS (`d`, `width`, `x`), and animation (the state at the snapshot
is drawn). A duplicate id in one document resolves inside the svg first, where the browser
takes the document's first. The WebView2 download page's Version arrow is an `unsteady`
region. Drawn wrongly: a collapsed table
border, doubled (the IDE has none); text is set on its exact baseline, where Chromium rounds
the baseline to a whole CSS pixel (a device pixel off at most; an underline uses the rounded
one). A canvas is a raster (the editor's minimap is drawn with
`putImageData`). The run reports each under "not drawn".

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
