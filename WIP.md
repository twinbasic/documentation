# twinBASIC Documentation — Working Notes

Jekyll site (`just-the-docs` theme) deploying to `docs.twinbasic.com`. Source under `docs/`.

## Status

Reference documentation is **mostly complete**. Eleven packages have full reference coverage adapted from primary sources (Microsoft VBA-Docs CC-BY-4.0 for the runtime library, `.twin` source for the twinBASIC-specific packages); a twelfth (WinNativeCommonCtls) is in progress. The CEF and WebView2 packages also carry a tutorial set.

| Package                              | Reference   | Tutorials |
|--------------------------------------|-------------|-----------|
| VBA package                          | done        | —         |
| VBRUN package                        | done        | —         |
| VB package                           | done        | —         |
| WebView2Package                      | done        | done      |
| Assert package                       | done        | —         |
| CustomControls / CustomControlsPackage | done      | —         |
| cefPackage (CEF)                     | done        | done      |
| WinEventLogLib                       | done        | —         |
| WinNamedPipesLib                     | done        | —         |
| WinServicesLib                       | done        | —         |
| tbIDE                                | done        | —         |
| WinNativeCommonCtls                  | in progress | —         |

The rest of this file is the maintenance guide for adding new pages or updating existing ones — primary-source paths, page templates, cross-section linking conventions, the per-symbol workflow, and the integrity check.

When working from a primary source: always read it first — **never paraphrase from memory.**

## Where things live

- `docs/Reference/Core/` — language statements/keywords (`Dim`, `For-Next`, `Sub`, ...).
- `docs/Reference/<Package>/<Mod>/` — runtime library (VBA, VBRUN), grouped by modules.
- `docs/Reference/<Package>/<Mod>/index.md` — module landing page listing its members.
- `docs/Reference/VB/<Class>.md` — single-file class page (e.g. [`CheckBox.md`](docs/Reference/VB/CheckBox.md)).
- `docs/Reference/VB/<Class>/index.md` — folder-style class page when sub-pages may follow (e.g. [`CheckMark/index.md`](docs/Reference/VB/CheckMark/index.md)).
- `docs/Reference/WebView2/` — WebView2 package: the **WebView2** control class plus its small wrapper classes (request / response / headers / environment options) and the `wv2…` enumerations.
- `docs/Reference/CustomControls/` — CustomControls package: the eight **Waynes…** custom controls, their shared `Styles/` helper classes (`Fill`, `Borders`, `Corners`, `TextRendering`, …), the `Framework/` DESIGNER surface (interfaces, CoClasses, the `Canvas` / `SerializeInfo` UDTs), and the `Enumerations/` (`CornerShape`, `FillPattern`, `DockMode`, …).
- `docs/Reference/CEF/` — CEF (Chromium Embedded Framework) package: the **CefBrowser** control, its `EnvironmentOptions` sub-page, and the two user-facing enumerations (`CefLogSeverity`, `cefPrintOrientation`). This is a much smaller surface than WebView2 — the package is currently BETA and many WebView2-equivalent features are not yet exposed.
- `docs/Reference/WinEventLogLib/` — Windows Event Log package: the generic `EventLog(Of T1, T2)` class and the `EventLogHelperPublic` module with its single `RegisterEventLogInternal` helper. Three pages total — `index.md`, `EventLog.md`, `EventLogHelperPublic.md`.
- `docs/Reference/WinNamedPipesLib/` — Windows Named Pipes package: the IOCP-based async pipe framework — `NamedPipeServer` + `NamedPipeServerConnection` on the server side, `NamedPipeClientManager` + `NamedPipeClientConnection` on the client side. Five pages total (`index.md` + one per class).
- `docs/Reference/WinServicesLib/` — Windows Services package: a thin OS-services wrapper. `Services` (predeclared singleton) coordinates one or more `ServiceManager` configurations; `ServiceCreator(Of T)` is the generic factory the dispatcher uses to instantiate each user-defined `ITbService` class; `ServiceState` is a read-only state snapshot for an installed service. Four public enums (`ServiceTypeConstants`, `ServiceStartConstants`, `ServiceControlCodeConstants`, `ServiceStatusConstants`) live under `Enumerations/`.
- `docs/Reference/WinNativeCommonCtls/` — Windows Native Common Controls compatibility package: a VB6-compatible Microsoft Common Controls 6.0 (`MSCOMCTL.OCX`) replacement, written on top of the Win32 ComCtl32 controls. Eight controls (**DTPicker**, **ImageList**, **ListView**, **MonthView**, **ProgressBar**, **Slider**, **TreeView**, **UpDown**), plus eight sub-object classes (**ListImages** / **ListImage**, **ListItems** / **ListItem**, **ColumnHeaders** / **ColumnHeader**, **Nodes** / **Node**) reached through container properties on the three collection-bearing controls, plus ~16 user-facing enumerations. Each control is a `<Name>BaseCtl` (`[COMCreatable(False)]`) plus a thin `<Name>` leaf tagged `[WindowsControl(...)]` — the same split VB-package and CEF use.
- `docs/Reference/tbIDE/` — IDE Extensibility package (this is the **addin SDK**). The package is type-only — it ships **public interfaces + CoClasses** that an addin DLL binds to; every implementation behind them lives in the twinBASIC IDE itself. The user-facing surface is one entry-point factory (`tbCreateCompilerAddin`) plus ~20 CoClasses grouped by role: the addin contract (`AddIn`), the root API (`Host`), the loaded `Project`, the editors collection (`Editor` / `CodeEditor` / `Editors`), the virtual file system (`FileSystem` / `FileSystemItem` / `Folder` / `File`), the in-IDE UI surface (`Toolbar` / `Toolbars` / `Button` / `ToolWindow` / `ToolWindows`), the HTML DOM inside a tool window (`HtmlElement` / `HtmlElements` / `HtmlElementProperty` / `HtmlElementProperties` / `HtmlEventProperty` / `HtmlEventProperties`), the `DebugConsole`, `KeyboardShortcuts`, `Themes`, and the single concrete user-instantiable helper class `AddinTimer`. Flat layout — one page per CoClass / Class plus the index landing.
- `docs/Reference/Statements.md` — alphabetical index of language statements.
- `docs/Reference/Procedures and Functions.md` — alphabetical index of procedures/functions.
- `docs/_includes/footer_custom.html` — overrides the theme's footer slot; renders the copyright line and, when `vba_attribution: true` is set in a page's frontmatter, an additional CC-BY-4.0 attribution line beneath it.

## VBA-Docs source (read-only)

Cloned as a sibling of this repo. All paths below are relative to the repo root:

```
../VBA-Docs/Language/Reference/User-Interface-Help/<symbol>-<kind>.md
```

Common kinds: `-statement`, `-function`, `-property`, `-method`, `-object`, `-operator`. Find the file with `ls ../VBA-Docs/Language/Reference/User-Interface-Help/ | grep -i <name>` before drafting.

Used for: Core statements/keywords, the VBA package, and the VBRUN package.

## TwinBASIC Package source (read-only)

All of twinbasic's package sources are at:

```
..\tb-export\NewProject\Packages\VB\Sources\CONTROLS\STANDARD\<Class>.twin
..\tb-export\NewProject\Packages\VB\Sources\CONTROLS\OTHER\<Class>.twin
..\tb-export\NewProject\Packages\VB\Sources\BASE\Base*.twin
..\tb-export\NewProject\Packages\VBA\Sources\
..\tb-export\NewProject\Packages\VBRUN\Sources\
..\tb-export\NewProject\Packages\WebView2Package\Sources\
..\tb-export\NewProject\Packages\Assert\Sources\
..\tb-export\NewProject\Packages\CustomControls\Sources\
..\tb-export\NewProject\Packages\CustomControlsPackage\Sources\
..\tb-export\NewProject\Packages\cefPackages\Sources\
..\tb-export\NewProject\Packages\WinEventLogLib\Sources\
..\tb-export\NewProject\Packages\WinNamedPipesLib\Sources\
..\tb-export\NewProject\Packages\WinServicesLib\Sources\
..\tb-export\NewProject\Packages\WinNativeCommonCtls\Sources\
etc.
```

For the **tbIDE** package, the sources are not in `..\tb-export\`. They live inside one of the six addin sample projects (any will do — the package is a binary-only compiler package and ships its `.twin` declarations alongside each sample). Use sample10's copy as the canonical path:

```
..\tbrepro\sample10\WaynesWorldAddInTest1\Packages\tbIDE\Sources\     ← 24 flat .twin files
..\tbrepro\sample10\WaynesWorldAddInTest1\Packages\tbIDE\LICENCE.md   ← MIT, Wayne Phillips, 2022
..\tbrepro\sample10\WaynesWorldAddInTest1\Packages\tbIDE\Settings     ← project.name = "tbIDE", buildType = Package TWINPACK
```

The six matching consumer-side example addins live at:

```
..\tbrepro\sample10\WaynesWorldAddInTest1\Sources\MainModule.twin     ← kitchen-sink: toolbar / toolwindow / DOM / events / Evaluate / ActiveEditors
..\tbrepro\sample11\WaynesWorldCPUMonitorTest1\Sources\MainModule.twin ← AddinTimer + chartjs custom-element + onClose cleanup
..\tbrepro\sample12\WaynesWorldMonacoEditorTest1\Sources\MainModule.twin ← monaco custom-element + .editor.AddEventListener
..\tbrepro\sample13\WaynesListViewAddIn\Sources\MainModule.twin       ← listview custom-element + ApplyCss + raiseEvent() from inline HTML
..\tbrepro\sample14\WaynesVirtualListViewAddIn\Sources\MainModule.twin ← virtuallistview + onAsyncGetItemHTML + setAsyncResult + notifyChangedItem
..\tbrepro\sample15\tbGlobalSearchAddIn1\Sources\MainModule.twin      ← real-world: FS traversal + ReadText + ActiveEditors.Open + persistent settings
```

Read them in roughly that order — sample10 introduces the addin idioms one by one, samples 11–14 each focus on a single advanced custom-element widget (chartjs / monaco / listview / virtuallistview), and sample15 is a complete, polished addin that exercises the file system + editor-navigation surface.

For the CEF package, the examples live in a different folder:

```
..\tbrepro\cef\CEFSampleProject\Sources\                        ← four worked examples + MainForm
```

For the WinServicesLib package — and the canonical integration story across **all three** "winlibs" packages (services + event log + named pipes wired together end-to-end) — the worked example lives at:

```
..\tbrepro\winlibs\tbServiceTest2\Sources\
  Startup.twin                                                  ← Sub Main: configures two services + dispatches
  SERVICES\TBSERVICE001.twin, TBSERVICE002.twin                 ← user-implemented ITbService classes
  FORMS\MainForm.twin                                           ← non-service mode: control-panel UI
  FORMS\InProcessNamedPipeServerForm.twin                       ← in-process pipe server (no service)
  MISC\MESSAGETABLE.twin                                        ← [PopulateFrom("json",...)] enums for the event log
..\tbrepro\winlibs\tbServiceTest2\Resources\MESSAGETABLE\Strings.json   ← message-table backing JSON
```

Read this project end-to-end before extending the docs for any of WinServicesLib, WinEventLogLib, or WinNamedPipesLib — the three packages share a load-bearing set of idioms (composition-delegation on `EventLog(Of T1, T2)`, the manual-message-loop pattern coupling `NamedPipeServer` to a service's `ChangeState` handler, `PropertyBag` as the canonical pipe payload) that only become visible when you see them used together.

### VB Controls

The `STANDARD/` folder holds the leaf control classes. The `BASE/` folder defines the inheritance chain (e.g. `BaseControlWindowlessNoFocus` → `BaseControlRectDockable` → `BaseControlRect` → `BaseControl`); read those alongside the leaf class to know which `Public` members are actually visible. Members marked `Protected` or hidden behind `[Unimplemented]` should be flagged with a `> [!NOTE]` callout.

These pages are fully original content — **omit** the `vba_attribution: true` frontmatter flag.

### WebView2Package

Layout of `..\tb-export\NewProject\Packages\WebView2Package\Sources\`:

- `Classes/` — the implementation classes. Only a few are part of the user-facing surface; the rest are `Private` plumbing.
- `Abstract/` — raw `ICoreWebView2*` COM interfaces. Every one is declared `Private Interface`; these are pure implementation detail and get **no documentation page**.
- `Support/Enumerations.twin` — the `wv2…` enumerations, all in the `WebViewEnums` module.
- `Support/Types.twin` — the `WebViewTypes` module; currently only `COREWEBVIEW2_PHYSICAL_KEY_STATUS`.
- `Support/WebView2Misc.twin` — `Private Module`; helpers, no public surface.
- `EventCallbacks/` — currently empty.

Public user-facing surface (from `grep '^Public Class' Classes/*.twin` plus the top-level `WebView2` class which has no explicit modifier):

| Class                       | Role                                                                                                  |
|-----------------------------|-------------------------------------------------------------------------------------------------------|
| `WebView2`                  | the control itself (`Inherits VB.BaseControlFocusableNoFont`, `[WindowsControl(...)]`)                |
| `WebView2Header`            | one HTTP header (Name / Value); value type returned by header iteration                               |
| `WebView2HeadersCollection` | enumerable wrapper used by `For Each` over request / response headers                                 |
| `WebView2Request`           | request side of a `WebResourceRequested` event — Method, Uri, Headers, ContentBytes, ContentUTF8     |
| `WebView2RequestHeaders`    | mutable request-header collection — `GetHeader`, `Contains`, `AppendHeader`, `RemoveHeader`, …       |
| `WebView2Response`          | response side of a `WebResourceRequested` event — StatusCode, ReasonPhrase, Headers, ContentBytes…   |
| `WebView2ResponseHeaders`   | mutable response-header collection                                                                    |

`WebView2EnvironmentOptions` is declared `Private Class`, **but** the `WebView2` control exposes it via `Public EnvironmentOptions As WebView2EnvironmentOptions = New WebView2EnvironmentOptions`. Document it as a sub-page of the `WebView2` control class — its `Public` fields (`BrowserExecutableFolder`, `UserDataFolder`, `AdditionalBrowserArguments`, `Language`, `TargetCompatibleBrowserVersion`, `AllowSingleSignOnUsingOSPrimaryAccount`, `ExclusiveUserDataFolderAccess`, `EnableTrackingPrevention`) are user-set before / during the `Create` event.

The other `Private Class` files (`WebView2DeferredCallback`, `WebView2DeferredRaiseEvent`, `WebView2DevToolsProtocolCallback`, `WebView2ExecuteScriptCompleteHandler`, `WebView2ExecuteScriptCompleteHandler2`) and their helper interfaces (`IDeferredCallback`, `IExecuteScriptCompleteCallback`) are deferral / callback plumbing — skip.

The `WebView2` class itself is large (~1450 lines) and exposes Properties / Methods / Events plus the `EnvironmentOptions` member. Use the **folder-style** layout (`WebView2/index.md`) like `CheckBox/index.md` so the page can carry a TOC and the optional sub-pages (`WebView2/EnvironmentOptions.md`, etc.) sit beside it.

Enumerations live in `Support/Enumerations.twin` (module `WebViewEnums`) and currently number ten: `wv2PermissionKind`, `wv2PermissionState`, `wv2ErrorStatus`, `wv2KeyEventKind`, `wv2WebResourceContext`, `wv2ProcessFailedKind`, `wv2ScriptDialogKind`, `wv2HostResourceAccessKind`, `wv2PrintOrientation`, `wv2DefaultDownloadCornerAlign`. Group them under `WebView2/Enumerations/` following the VBRUN `Constants/` precedent — one page per enum, with `AlignConstants.md` as the formatting model.

`COREWEBVIEW2_PHYSICAL_KEY_STATUS` is a public `Type` in the `WebViewTypes` module; it surfaces through the `AcceleratorKeyPressed` event arguments. One page (`WebView2/Types/COREWEBVIEW2_PHYSICAL_KEY_STATUS.md`) is enough.

The package is licensed **MIT** (copyright Wayne Phillips T/A iTech Masters, 2022) — independent of the CC-BY-4.0 VBA-Docs sources. These pages are fully original content; **omit** the `vba_attribution: true` flag, the same as VB-package pages.

**Naming:** the source-side package symbol is `WebView2Package` (and the source folder is `..\tB-export\NewProject\Packages\WebView2Package\`), but the doc folder, URL segment, and page title all drop the doubled "Package" suffix — folder `docs/Reference/WebView2/`, permalink `/tB/Packages/WebView2/`, title `WebView2 Package` (space-separated, the same `<Name> Package` convention VB / VBRUN / Assert use). Every child page sets `parent: WebView2 Package` (matching the title, not the URL segment).

Pre-existing `WebView2` references on the site to keep aligned:

- [`docs/Tutorials/WebView2/`](docs/Tutorials/WebView2) — task-oriented tutorial; new reference pages should cross-link to it where useful, and vice versa.
- [`docs/Reference/VBRUN/Constants/ControlTypeConstants.md`](docs/Reference/VBRUN/Constants/ControlTypeConstants.md) — already lists `vbWebView2 = 18`; the new `WebView2` reference page should link to that constant.

### Assert

Layout of `..\tb-export\NewProject\Packages\Assert\Sources\` is flat — three sibling files, no sub-folders, no `Abstract\` / `Support\` plumbing:

- `Exact.twin` — module **Exact**
- `Strict.twin` — module **Strict**
- `Permissive.twin` — module **Permissive**

All three modules expose the **same 15-member API**; only the comparison semantics differ. The differentiating semantics are spelled out in the module-level `[Description("...")]` block at the top of each `.twin`:

| Module        | String comparisons | Other comparisons                                                              |
|---------------|--------------------|--------------------------------------------------------------------------------|
| `Exact`       | case-sensitive     | no implicit conversions; datatypes must match exactly (`5 <> 5.0`); `vbNullString <> ""`; `Empty` distinct from `0` / `False` / `""`; object default members **not** evaluated |
| `Strict`      | case-sensitive     | evaluated as if written directly in twinBASIC; object default members **not** evaluated |
| `Permissive`  | case-insensitive   | evaluated as if written directly in twinBASIC                                  |

`Null` is never equal to anything (not even itself) under any of the three flavours — use `IsNull` / `IsNotNull` to test for it.

The 15 members per module (identical signatures across all three):

| Member                                          | Purpose                                                          |
|-------------------------------------------------|------------------------------------------------------------------|
| `Succeed()`                                     | unconditionally records a pass                                   |
| `Fail([Message])`                               | unconditionally records a failure                                |
| `Inconclusive([Message])`                       | records an inconclusive / skipped result                         |
| `AreEqual(Expected, Actual, [Message])`         | value-equality assertion                                         |
| `AreNotEqual(Expected, Actual, [Message])`      | inverse of `AreEqual`                                            |
| `AreSame(Expected, Actual, [Message])`          | reference-identity (`Is`) assertion for objects                  |
| `AreNotSame(Expected, Actual, [Message])`       | inverse of `AreSame`                                             |
| `IsTrue(Condition, [Message])`                  | asserts the condition is `True`                                  |
| `IsFalse(Condition, [Message])`                 | asserts the condition is `False`                                 |
| `IsNothing(Value, [Message])`                   | asserts the object reference is `Nothing`                        |
| `IsNotNothing(Value, [Message])`                | inverse of `IsNothing`                                           |
| `IsNull(Value, [Message])`                      | asserts the value is `Null`                                      |
| `IsNotNull(Value, [Message])`                   | inverse of `IsNull`                                              |
| `SequenceEquals(Expected, Actual, [FailMessage])`    | element-by-element comparison of two sequences / arrays      |
| `NotSequenceEquals(Expected, Actual, [FailMessage])` | inverse of `SequenceEquals`                                  |

Source-side every member is declared as `Public DeclareWide PtrSafe Sub <Name> Lib "<assert{exact,strict,permissive}>" Alias "#N" (...)` and tagged `[DebugOnly(True), MustBeQualified(True), PreserveSig(False), UseGetLastError(False)]`. The `Lib` / `Alias` / `PreserveSig` / `UseGetLastError` decoration is internal pseudo-DLL plumbing for the runtime — **do not** surface it on the doc pages. The `[DebugOnly(True)]` tag matters to users (assertions compile out of release builds) and **should** be called out. The `[MustBeQualified(True)]` tag means callers must write the module name, e.g. `Strict.IsTrue(x)`.

The module-level `[Description("…")]` is the only non-empty description on the source side — the per-member `[Description("")]` blocks are all empty placeholders, so member descriptions are fully original prose.

**Layout decision** — deviation from the per-symbol pattern used elsewhere:

Because the three modules share an *identical* API, replicating 15 member-pages × 3 modules = 45 near-duplicate pages would add noise without value. Use **one page per module** instead, listing all 15 members inline under `## <Member>` headings (deep-linkable as `…/Strict#areequal`). The package landing page collects the three module pages and shows the semantics comparison table.

So the layout is:

- `docs/Reference/Assert/index.md` — package landing page; the three modules + side-by-side semantics table + a one-paragraph "what is this for" intro pointing at unit testing
- `docs/Reference/Assert/Exact.md` — single-file module page, all 15 members
- `docs/Reference/Assert/Strict.md` — same shape
- `docs/Reference/Assert/Permissive.md` — same shape

That's 4 pages total. (If a future release of the package adds more modules or non-module classes, revisit.)

**Naming:**

- Folder / URL segment: `Assert/` (the package name is `Assert` per `Settings` → `project.name`; no doubled "Package" awkwardness like WebView2Package had).
- Index title: `Assert Package` — same `<Name> Package` convention as VB / VBRUN / WebView2.
- Module page title: `<Name>` (just `Exact`, `Strict`, `Permissive` — they're modules, not classes, and "Module" is implied by context).
- Permalinks: `/tB/Packages/Assert/` for the index, `/tB/Packages/Assert/<Mod>` for each module page.
- `parent: Assert Package` on each module page (matching the index `title:`, the same split VB / VBRUN / WebView2 use).

**License:** MIT (copyright Wayne Phillips T/A iTech Masters, 2022) — same situation as WebView2Package. Pages are fully original; **omit** the `vba_attribution: true` flag.

### CustomControls / CustomControlsPackage

Two source-side packages, **one** doc-side package. They always ship together and are co-versioned with twinBASIC — `CustomControlsPackage` lists `CustomControls` as a `isCompilerPackage` reference in its `Settings`, and neither is usable without the other. Document the union as `docs/Reference/CustomControls/`.

The split on the source side is by *role*:

- `..\tb-export\NewProject\Packages\CustomControls\Sources\CustomControls.twin` — the **DESIGNER** framework. A single file with `Module Constants` (the enums + the `SerializeInfo` / `Canvas` UDTs) plus the abstract surface a custom control hooks into (`ICustomControl`, `ICustomForm` interfaces; `CustomControlContext`, `CustomFormContext`, `CustomControlTimer`, `CustomControlsCollection` CoClasses). Project `appTitle` is `"CustomControls DESIGNER Package"`.
- `..\tb-export\NewProject\Packages\CustomControlsPackage\Sources\` — the **runtime**: eight concrete `Waynes…` controls plus `zTemporarySupport.twin`, a bag of shared appearance helpers and three mixin base classes. Project `appTitle` is `"Custom Controls Package"`.

Public user-facing surface, grouped by role.

#### Concrete controls (`CustomControlsPackage\Sources\Waynes*.twin`)

Each is `Class <Name>` (no `Public` modifier — implicitly public), tagged `[CustomControl("/miscellaneous/frm<X>.png")]` (designer icon) and `[COMCreatable(False)]` (cannot be `New`'d through COM; instantiated by the designer).

| Control          | Implements                                                | Co-located public types                          |
|------------------|-----------------------------------------------------------|--------------------------------------------------|
| `WaynesButton`   | `ICustomControl` + `BaseControlFocusable` (mixin)         | `WaynesButtonState` (private, but exposed)       |
| `WaynesForm`     | `ICustomControl` + `BaseForm` (mixin)                     | — (uses `WindowsFormOptions` from support file)  |
| `WaynesFrame`    | `ICustomControl` + `BaseControl` (mixin)                  | —                                                |
| `WaynesGrid`     | `ICustomControl` + `BaseControlFocusable` (mixin)         | `Column`, `CellRenderingOptions`                 |
| `WaynesLabel`    | `ICustomControl` + `BaseControl` (mixin)                  | —                                                |
| `WaynesSlider`   | `ICustomControl` + `BaseControlFocusable` (mixin)         | `WaynesSliderState`, `SliderDirection` & `SliderDisplayValueFormat` (nested enums) |
| `WaynesTextBox`  | `ICustomControl` + `BaseControlFocusable` (mixin)         | `WaynesTextBoxState`                             |
| `WaynesTimer`    | `ICustomControl` + `BaseControl` (mixin)                  | —                                                |

The "mixin" base classes (`BaseControl`, `BaseControlFocusable`, `BaseForm`) are declared `Private Class` in `zTemporarySupport.twin` and pulled into each control via the twinBASIC `Implements <Base> Via _BaseControl = New <Base>` syntax. The base classes themselves get **no doc page** (they're private and never named by user code), but the inherited members **must be folded into each control's Properties listing** the same way VB-package controls list their inherited surface. The visible inherited surface, by mixin:

- `BaseControl` → `Name`, `Left`, `Top`, `Width`, `Height`, `Anchors`, `Dock`, `Visible`.
- `BaseControlFocusable` → all of `BaseControl` + `TabIndex`, `TabStop`.
- `BaseForm` → `FormDesignerId`, `Name`, `Left`, `Top`, `Width`, `Height`, `Controls`.

The state-holder classes (`WaynesButtonState`, `WaynesSliderState`, `WaynesTextBoxState`) and `WindowsFormOptions` are declared `Private Class` but are exposed on the parent control via `Public WithEvents NormalState As WaynesButtonState` (etc.). Same situation as `WebView2EnvironmentOptions` — document them as **sub-pages** of the parent control using the folder-style layout.

#### Shared appearance helpers (`CustomControlsPackage\Sources\zTemporarySupport.twin`)

Every helper in this file is `Private Class`, but the ones below are reachable through `Public WithEvents …` properties on one or more of the eight controls and **must be documented**:

| Class           | Reached as                                                                          |
|-----------------|-------------------------------------------------------------------------------------|
| `Anchors`       | `<control>.Anchors` (via the mixin base)                                            |
| `Corners`       | `<state>.Corners`, `CellRenderingOptions.Corners`, `<sliderState>.BackgroundCorners`, `BlockCorners` |
| `Corner`        | `Corners.TopLeft` / `.TopRight` / `.BottomLeft` / `.BottomRight`                    |
| `Borders`       | `<state>.Borders`, `CellRenderingOptions.Borders`, `<sliderState>.BackgroundBorders`, `BlockBorders` |
| `Border`        | element of `Borders.Elements()`; also `TextRendering.Outlines()`                    |
| `Fill`          | `<state>.BackgroundFill`, `<sliderState>.BlockFill`, `CellRenderingOptions.Fill`, `Border.Fill`, `Line.Fill`, `TextRendering.Fill` |
| `FillColorPoint`  | element of `FillColorPoints.Values()`                                             |
| `FillColorPoints` | `Fill.ColorPoints`                                                                |
| `Line`          | `WaynesGrid.VerticalLineOptions` / `.HorizontalLineOptions` / `.ResizerBar`         |
| `Padding`       | `TextRendering.Padding`                                                             |
| `TextRendering` | `<state>.TextRendering`, `WaynesLabel.TextRendering`, `CellRenderingOptions.TextRendering` |
| `FontStyle`     | `TextRendering.Font`                                                                |
| `WindowsFormOptions` | `WaynesForm.WindowsOptions` (only one consumer)                                |

Document these under `docs/Reference/CustomControls/Styles/`. Pair small helpers with their containers on a single page (the pairings happen to be self-evident from the table — `Corner` inlines under `Corners.md`, `Border` under `Borders.md`, `FillColorPoint` and `FillColorPoints` under `Fill.md`, `FontStyle` under `TextRendering.md`). `WindowsFormOptions` is the exception: it has exactly one consumer (`WaynesForm`), so put it as a sub-page of `WaynesForm/` (folder-style), parallel to how WebView2 carries `EnvironmentOptions`.

The remaining `Private Class` / `Private Module` content in `zTemporarySupport.twin` is implementation-detail and gets **no doc page**:

- `TextDecorator`, `TextDecorators` — used only inside `ElementDescriptor`, not surfaced on any control property.
- `UDTs` — a wrapper class whose `Public Type` declarations (`MouseEvent`, `KeyEvent`, `FocusEvent`, `ElementDescriptor`) and `Public Enum` declarations (`CaretPosition`, `SpecialKeyCodes`) only matter to someone writing a *new* custom control (they're passed to `AddressOf`-registered callbacks on `ElementDescriptor`). Defer documenting these until / unless an "authoring a custom control" tutorial calls for them.
- `BaseControl`, `BaseControlFocusable`, `BaseForm` — the mixin bases (covered above; members surface on each control, but the bases themselves are private).
- `Private Module MathSupport` / `Private Module ColorSupport` — internal.

#### DESIGNER framework surface (`CustomControls\Sources\CustomControls.twin`)

The framework half — what a *control author* writes against. Document at `docs/Reference/CustomControls/Framework/`:

| Symbol                       | Kind                | Role                                                                                  |
|------------------------------|---------------------|---------------------------------------------------------------------------------------|
| `ICustomControl`             | `Interface`         | what every concrete control implements: `Initialize(Context)`, `Destroy()`, `Paint(Canvas)` |
| `ICustomForm`                | `Interface`         | analogous surface for form-class custom controls                                      |
| `CustomControlContext`       | `CoClass`           | passed to `ICustomControl.Initialize`; offers `GetSerializer()`, `Repaint()`, `CreateTimer()`, `ChangeFocusedElement()` |
| `CustomFormContext`          | `CoClass`           | extends `CustomControlContext` with `Show()` / `Close()`                              |
| `CustomControlTimer`         | `CoClass`           | returned by `CustomControlContext.CreateTimer()`; `Interval`, `Enabled`, `OnTimer` event |
| `CustomControlsCollection`   | `CoClass`           | the `Controls` collection on a form — `Count`, `Item`, `Add`, `Remove`, `_NewEnum`    |
| `SerializeInfo`              | UDT                 | obtained from `Context.GetSerializer()`; exposes `RuntimeUISrz*` operations (deserialize, mode flags, …) |
| `Canvas`                     | UDT                 | parameter to `ICustomControl.Paint`; exposes `RuntimeUICCCanvasAddElement` + DPI / size getters |

Both UDTs follow a pattern unique to twinBASIC: a `Pointer As LongPtr` field plus `Public DeclareWide PtrSafe Function/Sub … Lib "<runtimeuisrz>" Alias "#N"` pseudo-DLL declarations bound directly into the type. From a *caller* perspective these read as instance methods on the UDT (`Canvas.RuntimeUICCCanvasAddElement(descriptor)`); document them as methods, and **do not** surface the `Lib "<…>"` / `Alias "#N"` / `PreserveSig` / `DLLStackCheck` decoration (same treatment as Assert's pseudo-DLL plumbing). The verbose `RuntimeUISrz*` / `RuntimeUICC*` names are unfortunate but they *are* the public API — keep them as-is.

The two underscore-prefixed default interfaces of each CoClass (`_CustomControlTimer`, `_CustomControlContext`, `_CustomFormContext`, `_CustomControlsCollection`, `_CustomControlTimerEvents`) are an implementation detail of the COM `[Default]`/`[Default, Source]` pattern — fold their members onto the CoClass page, **don't** give the interfaces their own pages.

#### Enumerations (`CustomControls.twin`, module `Constants`)

Public enums to surface, one page each, under `docs/Reference/CustomControls/Enumerations/`:

- `CornerShape`, `FillPattern`, `TextAlignment`, `TextOverflowMode`, `DockMode`, `FontWeight`, `StartupPosition`, `BorderStyle`, `WindowState` — straightforward value enums.
- `Customtate` — **probable typo** for `CustomState`. Has the same three members as `WindowState` (`tbNormal` / `tbMinimized` / `tbMaximized`) and isn't referenced anywhere else in the package. Document it (since it's `Public`), but add a `> [!NOTE]` callout flagging the typo and pointing readers to `WindowState`.
- `ColorRGBA`, `PixelCount`, `PointSize` — these are declared as `Enum` only because twinBASIC doesn't yet have a `Type Foo = Long` alias syntax. Each carries a `FIXME` comment ("Substitute for an ALIAS to Long") and a single `[_MAX] = 0` placeholder member. Document them as **typedefs for `Long`** (the underlying storage type), not as real enums. Note in each that the alias is what user code actually sees on `Public Width As CustomControls.PixelCount` (etc.) — when the alias syntax lands, these enum stand-ins go away.

Plus the two enums nested inside `WaynesSlider`: `SliderDirection` and `SliderDisplayValueFormat`. Document them on the `WaynesSlider/index.md` page rather than under `Enumerations/` (they're locally scoped to the slider).

#### Doc-side layout (folders / files)

Compact form:

```
docs/Reference/CustomControls/
  index.md                                  ← package landing; intro + role split + cross-links to the four groups
  WaynesButton/index.md, WaynesButton/WaynesButtonState.md
  WaynesForm/index.md, WaynesForm/WindowsFormOptions.md
  WaynesFrame.md
  WaynesGrid/index.md, WaynesGrid/Column.md, WaynesGrid/CellRenderingOptions.md
  WaynesLabel.md
  WaynesSlider/index.md, WaynesSlider/WaynesSliderState.md
  WaynesTextBox/index.md, WaynesTextBox/WaynesTextBoxState.md
  WaynesTimer.md
  Styles/index.md, Styles/Anchors.md, Styles/Borders.md, Styles/Corners.md,
    Styles/Fill.md, Styles/Line.md, Styles/Padding.md, Styles/TextRendering.md
  Framework/index.md, Framework/Canvas.md, Framework/CustomControlContext.md,
    Framework/CustomControlsCollection.md, Framework/CustomControlTimer.md,
    Framework/CustomFormContext.md, Framework/ICustomControl.md,
    Framework/ICustomForm.md, Framework/SerializeInfo.md
  Enumerations/index.md, Enumerations/BorderStyle.md, Enumerations/ColorRGBA.md,
    Enumerations/CornerShape.md, Enumerations/Customtate.md, Enumerations/DockMode.md,
    Enumerations/FillPattern.md, Enumerations/FontWeight.md, Enumerations/PixelCount.md,
    Enumerations/PointSize.md, Enumerations/StartupPosition.md, Enumerations/TextAlignment.md,
    Enumerations/TextOverflowMode.md, Enumerations/WindowState.md
```

**Naming:**

- Folder / URL segment: `CustomControls/` (drops the "Package" suffix; collapses the two source packages, same simplification WebView2 used).
- Index title: `CustomControls Package` — the `<Name> Package` convention.
- Permalinks: `/tB/Packages/CustomControls/` for the landing; `/tB/Packages/CustomControls/<Control>` and `/tB/Packages/CustomControls/<Control>/` for single-file vs folder-style controls; `/tB/Packages/CustomControls/Styles/<Name>`, `/tB/Packages/CustomControls/Framework/<Name>`, `/tB/Packages/CustomControls/Enumerations/<Name>` for the three sub-groups.
- `parent: CustomControls Package` on every child page (matching the index `title:`).
- The `Styles/`, `Framework/`, `Enumerations/` index pages set `parent: CustomControls Package` and `has_children: true`; their children set `parent: <Styles | Framework | Enumerations>` (the grouped-page pattern). Mirror exactly the structure WebView2 uses for its `Enumerations/`.

**License:** MIT (copyright Wayne Phillips T/A iTech Masters, 2022) — same situation as WebView2Package and Assert. Pages are fully original; **omit** the `vba_attribution: true` flag.

### cefPackage (CEF)

Layout of `..\tb-export\NewProject\Packages\cefPackages\Sources\`:

- `CefControl.twin` — contains three classes: the private `CefBrowserBaseCtl` (where every event / method / property is declared), the private `CefEnvironmentOptions` (a bare-field options class), and the public `CefBrowser` control which only inherits from `CefBrowserBaseCtl` and sets the design-time icon. This single file is the entire user-facing surface of the package.
- `CefControlGlobalWnd.twin` — private internal message-window plumbing; no doc page.
- `APIs.twin` — private Win32 API declarations; no doc page.
- `MainModule.twin` — `PreSubMain` module that intercepts CEF sub-process launches; no doc page.
- `Registry.twin` — Win32 registry helpers; no doc page.
- `SpecialFolders.twin` — `KnownFolders_CSIDLs` enum + `GetSpecialFolder` helper; `Private Module`, no doc page (used only by the sample project, not exported from the package).
- `CEF/Aliases.twin`, `CEF/ApiEntryPoints.twin`, `CEF/Globals.twin`, `CEF/Initialize.twin`, `CEF/Misc.twin` — `Private Module` implementation detail; no doc pages.
- `CEF/Enums/_cef_*_t.twin` — internal C-ABI enums wrapped in `Private Module _cef_*_t`; one file (`_cef_log_severity_t.twin`) also declares the user-facing `CefLogSeverity` enum. The other 29 `_cef_*_t` enums never surface in the public API and get **no doc page**.
- `CEF/Structs/_cef_*_t.twin` — internal C-ABI structs (`cef_browser_settings_t`, `cef_pdf_print_settings_t`, …) wrapped in `Private Module`; no doc pages. `Structs/TODO.twin` declares an empty placeholder `Class CefRequestHeaders` — also no doc page (see the alias note below).
- `CEF/CrossProcessIPC/BrowserOM.twin`, `RendererOM.twin`, `RendererAsyncOM.twin` — `Private Class` (or unmarked-but-effectively-private) classes that broker IPC between the host and the CEF browser / renderer processes; no doc pages. **Exception:** `BrowserOM.twin` declares the user-facing `cefPrintOrientation` enum inline (used by `CefBrowser.PrintToPdf`); document it under `Enumerations/`.
- `CEF/Implementations/*.twin` — every file is `Private Class` / `Private Module`; CEF callback handlers (`Client`, `ClientLifeSpanHandler`, `ClientLoadHandler`, `AppRender…`, the `Exposed*Javascript*` and `*Task` classes, the `PrintToPDFCallback`, …). All implementation detail; no doc pages.

Public user-facing surface (one control + one options class + two enums):

| Symbol                       | Kind                                  | Role                                                                                          |
|------------------------------|---------------------------------------|-----------------------------------------------------------------------------------------------|
| `CefBrowser`                 | Class (inherits `CefBrowserBaseCtl`)  | the control itself, tagged `[WindowsControl("/Miscellaneous/cef64.png")]`                     |
| `CefEnvironmentOptions`      | `Private Class`, exposed              | reached via `Public EnvironmentOptions As CefEnvironmentOptions = New CefEnvironmentOptions` on the control |
| `CefLogSeverity`             | `Enum` (in `_cef_log_severity_t.twin`)| used by `CefEnvironmentOptions.LogSeverity`                                                   |
| `cefPrintOrientation`        | `Enum` (in `BrowserOM.twin`)          | used by the `Orientation` parameter of `CefBrowser.PrintToPdf`                                |

`CefBrowserBaseCtl` is `Private Class` but is where every public member is *declared* — `CefBrowser` itself adds nothing beyond inheriting from it. Document everything on the `CefBrowser/index.md` page (folder-style, parallel to `WebView2/`) and treat the base class as an internal split that doesn't surface.

`CefBrowser` inherits from `VB.BaseControlRectDockable`, so its Properties listing must fold in the dockable-rect surface (`Name`, `Left`, `Top`, `Width`, `Height`, `Anchors`, `Dock`, ...) the same way VB-package control pages and CustomControls control pages do.

`CefBrowserRequestHeaders` is declared at the top of `CefControl.twin` as `Alias CefBrowserRequestHeaders As Object` and appears in the `NavigationStarting` event signature. The underlying `Class CefRequestHeaders` lives at the bottom of `Structs/TODO.twin` with an empty body — it's a placeholder for a future header collection. **No doc page;** mention on the `NavigationStarting` event entry that the parameter is currently typed `Object` and reserved for future use.

The `CefBrowser` public surface, from `grep '^\s*Public' CefControl.twin` plus a walk through `CefBrowserBaseCtl`:

- **Events (12):** `Create`, `Ready`, `Error`, `NavigationStarting`, `NavigationComplete`, `SourceChanged`, `DocumentTitleChanged`, `DOMContentLoaded`, `PrintToPdfCompleted`, `PrintToPdfFailed`, `JsAsyncResult`, `JsMessage`.
- **Methods (14):** `Initialize`, `Navigate`, `NavigateToString`, `Reload`, `GoBack`, `GoForward`, `ExecuteScript`, `JsRun`, `JsRunAsync`, `PostWebMessage`, `SetVirtualHostNameToFolderMapping`, `ClearVirtualHostNameToFolderMapping`, `OpenDevToolsWindow`, `PrintToPdf`.
- **Properties (12):** `DocumentURL` (Get/Let), `DocumentTitle` (Get), `ZoomFactor` (Get/Let), `UserAgent` (Get/Let), `CanGoBack` (Get), `CanGoForward` (Get), `CefMajorVersion` (Get), `Visible` (Get/Let), `hWnd` (Get), `Parent` (Get), `EnvironmentOptions` (field), `CreateInitialized` (field, `Boolean`, defaults `True`). Plus a `Hidden` `Align` (Get/Let) inherited boilerplate. Plus the inherited rect-dockable surface (`Name`, `Left`, `Top`, `Width`, `Height`, `Anchors`, `Dock`, …).

`CefEnvironmentOptions` is four bare `Public` fields:

| Field                      | Type             |
|----------------------------|------------------|
| `BrowserExecutableFolder`  | `String`         |
| `UserDataFolder`           | `String`         |
| `LogFilePath`              | `String`         |
| `LogSeverity`              | `CefLogSeverity` |

`CefLogSeverity` members: `CefLogDisable = 0`, `CefLogVerbose = 1`, `CefLogInfo = 2`, `CefLogWarning = 3`, `CefLogError = 4`, `CefLogFatal = 5`.

`cefPrintOrientation` members: `cefPrintPortrait = 0`, `cefPrintLandscape = 1`.

**WebView2-parity gap list** (call out on `CEF/index.md`, drawn from `Sources\Example1..4.twin` where these are commented out as *"Sorry, this feature is not yet available in the CEF package"*):

- Methods: `OpenTaskManagerWindow`, `AddObject` (host-object publication), the request-filter machinery (`AddWebResourceRequestedFilter`).
- Events: `AcceleratorKeyPressed`, `PermissionRequested`, `WebResourceRequested`, `ProcessFailed`, `ScriptDialogOpening`, `UserContextMenu`, `SuspendCompleted`, `SuspendFailed`, `DownloadStarting`, `NewWindowRequested`.

`CefBrowser.NavigationComplete` carries `IsSuccess` and `WebErrorStatus` parameters, but the source (`OnNavigationComplete_UI` in `CefControl.twin`) currently hard-codes `IsSuccess = True` and `WebErrorStatus = 0` with `FIXME` comments — note this on the event page.

**Multi-version source.** The same `.twin` sources compile against three CEF runtimes (v49 / v109 / v145) selected via the `CEF_VERSION` conditional-compilation argument on the project. At runtime, `CefBrowser.CefMajorVersion` returns the value picked at compile time. The user picks a runtime at deploy time by downloading the matching ZIP from `github.com/twinbasic/cef-runtimes` and extracting to `%LocalAppData%\twinBASIC_CEF_Runtime\`, or by overriding `CefBrowser.EnvironmentOptions.BrowserExecutableFolder` before / during the `Create` event. The wiki entry will redirect to the new docs, so the runtime download + version-picking section lives on `CEF/index.md`.

#### Doc-side layout (folders / files)

Six pages total:

```
docs/Reference/CEF/
  index.md                                  ← package landing; intro + WebView2 comparison + version table + runtime install + WebView2-parity gap list + class & enum lists
  CefBrowser/index.md                       ← the control (folder-style, like WebView2/WebView2/index.md)
  CefBrowser/EnvironmentOptions.md          ← parallel to WebView2/WebView2/EnvironmentOptions.md
  Enumerations/index.md
  Enumerations/CefLogSeverity.md
  Enumerations/cefPrintOrientation.md
```

**Naming:**

- Folder / URL segment: `CEF/` (uppercase acronym, matches the wiki spelling; drops the `Package` suffix, same simplification as WebView2 and Assert).
- Index title: `CEF Package` — the `<Name> Package` convention.
- Permalinks: `/tB/Packages/CEF/` for the landing, `/tB/Packages/CEF/CefBrowser/` for the control (folder-style), `/tB/Packages/CEF/CefBrowser/EnvironmentOptions` for the sub-page, `/tB/Packages/CEF/Enumerations/<Enum>` for the enums.
- `parent: CEF Package` on every top-level child page. The two enum pages set `parent: Enumerations` and `grand_parent: CEF Package` (the grouped-page pattern; mirror exactly the structure WebView2 uses for its `Enumerations/`). The `EnvironmentOptions` sub-page sets `parent: CefBrowser` and `grand_parent: CEF Package`.

**License:** MIT (Wayne Phillips T/A iTech Masters) — same situation as WebView2Package, Assert, and CustomControls. The Settings file doesn't carry an explicit `licence:` field but every other package by this author is MIT and the wiki implies the same. Pages are fully original; **omit** the `vba_attribution: true` flag.

### WinEventLogLib

Layout of `..\tb-export\NewProject\Packages\WinEventLogLib\Sources\` is flat — four `.twin` files plus three text files (`_README.txt`, `_LICENCE.txt`, `_RELEASE_HISTORY.txt`):

- `APIs.twin` — `Private Module EventLogAPIs` wrapping six `advapi32.dll` entry points (`RegCreateKeyExW`, `RegSetValueExW`, `RegCloseKey`, `RegDeleteKeyExW`, `RegisterEventSourceW`, `ReportEventW`). No doc page.
- `Constants.twin` — `Private Module EventLogConstants` carrying `Public Enum EventLogTypeConstants` (`vbEventLogTypeSuccess`, `vbEventLogTypeAuditFailure`, `vbEventLogTypeAuditSuccess`, `vbEventLogTypeError`, `vbEventLogTypeWarning`). The module is `Private`, so the enum does not surface in the public API; no doc page.
- `EventLog.twin` — the generic `Public Class EventLog(Of T1, T2)`. The only user-facing class.
- `Helper.twin` — two modules: `Public Module EventLogHelperPrivate` (one helper `VariantArrayToStringArray`, used only by `EventLog.LogArray` internally — its name signals *intended* private but the module is declared `Public`; treat as internal and skip) and `Public Module EventLogHelperPublic` (one user-facing helper `RegisterEventLogInternal`).

Public user-facing surface (one generic class + one helper module):

| Symbol                          | Kind                | Role                                                                                  |
|---------------------------------|---------------------|---------------------------------------------------------------------------------------|
| `EventLog(Of T1, T2)`           | Generic class       | Main user-facing class. `T1` is the event-ID enum, `T2` is the category enum.         |
| `EventLogHelperPublic`          | Public module       | Holds the low-level `RegisterEventLogInternal` helper.                                |
| `RegisterEventLogInternal`      | `Sub` on the module | Registry-write helper; `EventLog.Register()` is the normal entry point.               |

`EventLog(Of T1, T2)` public members:

- `Public Sub New(LogName As String)` — constructor. `LogName` is either a leaf name (`"MyService"`, registered under `Application\MyService`) or a full path (`"System\MyService"`, registered under `System\MyService`).
- `Public Sub LogSuccess(ByVal EventId As T1, ByVal CategoryId As T2, ParamArray AdditionalStrings())` — writes an **Information**-type event (`EVENTLOG_SUCCESS = 0`). The name "Success" is the Win32 SDK constant's literal name, *not* the audit-success category — the underlying event type is **Information**.
- `Public Sub LogFailure(ByVal EventId As T1, ByVal CategoryId As T2, ParamArray AdditionalStrings())` — writes an **Error**-type event (`EVENTLOG_ERROR_TYPE = 1`).
- `Public Sub Register()` — writes the registry entries under `HKLM\SYSTEM\CurrentControlSet\Services\EventLog\…` to declare this EXE as the message provider for the source. Calls `RegisterEventLogInternal(LogName, GetDeclaredMaxEnumValue(Of T2))` — the category count is derived from `T2`'s declared maximum value at compile time.

Class-level decoration on `EventLog`: `[COMCreatable(False)]`, `[ClassId("4AEA12E8-…-EAEAEAEAEAEA")]` (the `EA` suffix triggers special compiler handling for generic classes). The `[Description]` attribute on the class is the basis for the page intro: *"This is the main event log (generic) class."*

`EventLogHelperPublic` public members:

- `Public Sub RegisterEventLogInternal(ByVal LogPath As String, ByVal CategoryCount As Long)` — the registry-write helper. Prepends `"Application\"` to *LogPath* if no backslash is present, opens `HKLM\SYSTEM\CurrentControlSet\Services\EventLog\<LogPath>` with `KEY_WRITE`, then writes `EventMessageFile` and `CategoryMessageFile` (both set to `App.ModulePath`) and `CategoryCount`. Requires admin rights (registry writes to HKLM). Raises run-time error 5 with the message *"Failed to register event log source (\<LogName\>)"* if the open fails. Normally callers use `EventLog.Register()`, which fills *CategoryCount* automatically.

**Gaps and quirks** to surface on the docs (drawn from a static read of the source):

- The `EventLogTypeConstants` enum has five values (`Success`, `Warning`, `Error`, `AuditSuccess`, `AuditFailure`) but the public class only exposes Information and Error event types — Warning and Audit events are not currently reachable.
- Method names follow the Win32 SDK constants verbatim: `LogSuccess` writes an *Information* event (because `EVENTLOG_SUCCESS = 0` is the Win32 spelling for the information type), and `LogFailure` writes an *Error* event. Call this out on the per-method entries.
- Message resources: the registry entries point at `App.ModulePath` (the running EXE) for both `EventMessageFile` and `CategoryMessageFile`. Windows therefore expects a message-table resource keyed by the `T1` and `T2` enum values to be embedded in the EXE. The `.twin` source does not itself synthesise that resource — there is no `mc.exe` invocation or message-table emit visible in `WinEventLogLib\Sources\`; whatever mechanism populates the resource sits in the compiler's special-handling path for the `[ClassId("…EAEAEAEAEAEA")]` magic-byte pattern. The docs describe what Windows expects without making strong claims about how the compiler delivers it.
- `Register()` requires elevation. Normal usage is to call it once during install (from an elevated installer), then call `LogSuccess` / `LogFailure` at runtime without elevation.
- The package is described in `_README.txt` with a copy-pasted "NAMED PIPES PACKAGE" header (clearly an unintentional carry-over from another sister package); the body correctly says *"A simple framework for creating Windows event log entries from twinBASIC"*. Use the body, not the header.

#### Canonical usage idiom — composition-delegation onto a service class

`tbServiceTest2` (`..\tbrepro\winlibs\tbServiceTest2\Sources\`) shows the package's intended usage pattern, which is *not* obvious from the bare API:

```tb
Class TBSERVICE001
    Implements ITbService
    Implements EventLog(Of MESSAGETABLE.EVENTS, MESSAGETABLE.CATEGORIES) Via _
        EventLog = New EventLog(Of MESSAGETABLE.EVENTS, MESSAGETABLE.CATEGORIES)("Application\" & CurrentComponentName)
    …
    LogSuccess(service_started, status_changed, CurrentComponentName)   ' surfaces directly
End Class
```

The `Implements <Class> Via <field> = <expression>` form is twinBASIC's composition-delegation syntax (see [`docs/Features/Language/Delegation.md`](docs/Features/Language/Delegation.md) if/once that page exists, or the [`CustomControls` mixin pattern](docs/Reference/CustomControls/index.md) for an analogous use). The class declares it `Implements EventLog(Of …)` and gives the compiler a private field plus a constructor expression; the compiler then auto-forwards every `Public` member of `EventLog` (`LogSuccess`, `LogFailure`, `Register`) through that field. The result: a service class that *contains* an `EventLog` instance and exposes its logging methods as if they were its own.

Surface this on the `EventLog` page (and on the package index) as the **recommended pattern** for service / long-running classes. Spell out:

- The constructor expression evaluates *once* (the first time the delegating class is instantiated, per twinBASIC's `Implements ... Via` semantics).
- The `T1` / `T2` type arguments must be identical at the `Implements` declaration and the constructor (the compiler enforces this).
- The `LogPath` is typically `"Application\" & CurrentComponentName` — `CurrentComponentName` is the compile-time class name, so the log path automatically tracks renames.
- The delegating class transparently inherits all three of `LogSuccess` / `LogFailure` / `Register`. Calling code can use them unqualified.

#### Message-table backing: `[PopulateFrom("json", …)]` on the enums

The `T1` / `T2` enums are typically auto-populated from a JSON resource via the `[PopulateFrom]` attribute. `tbServiceTest2`'s `Sources\MISC\MESSAGETABLE.twin`:

```tb
Module MESSAGETABLE
    [PopulateFrom("json", "/Resources/MESSAGETABLE/Strings.json", "events", "name", "id")]
    Enum EVENTS
    End Enum

    [PopulateFrom("json", "/Resources/MESSAGETABLE/Strings.json", "categories", "name", "id")]
    Enum CATEGORIES
    End Enum
End Module
```

…with `Resources\MESSAGETABLE\Strings.json`:

```json
{
    "events": [
        { "id": -1073610751, "name": "service_started",        "LCID_0000": "%1 service started" },
        { "id": -1073610750, "name": "service_startup_failed", "LCID_0000": "%1 service startup failed" },
        …
    ],
    "categories": [
        { "id": 1, "name": "status_changed", "LCID_0000": "Status Changed" }
    ]
}
```

Two things are happening here:

1. **The enum bodies are populated at compile time** — `Enum EVENTS` starts empty in the source, but after compilation it has members `service_started = -1073610751`, `service_startup_failed = -1073610750`, … (one per `"events"` entry in the JSON, keyed `name → id`).
2. **The same JSON is consumed by the compiler's `mc.exe`-equivalent** that emits the message-table resource into `App.ModulePath`. The `LCID_0000` strings are the message-table entries, and the `%1`, `%2`, … placeholders are filled at log time from the `AdditionalStrings` `ParamArray` to `LogSuccess` / `LogFailure`. The `CategoryCount` registry value (written by `Register()`) is the highest declared `id` in the `categories` block, which is what `GetDeclaredMaxEnumValue(Of T2)` recovers at compile time.

So the round-trip is: JSON → compile-time enum population + message-table resource emission → registry entries that point Windows at the EXE → runtime `LogSuccess(EventId, CategoryId, …)` writes an event the Event Viewer can format using the embedded message-table strings.

Surface this on the index page (under "Setting up message resources" or similar) with the JSON skeleton and the cross-reference to `[PopulateFrom]` (which is documented under `docs/Features/`, not in the reference set — link to that page if it exists, otherwise describe in-place).

The negative event-ID values in the JSON (`-1073610751`) are the standard Win32 event-ID encoding: the high bits encode severity (`0xC0000000` = Error), facility (`0x...`), and customer bit. Don't unpack this on the docs; just note that *"event IDs follow the Win32 documented encoding — see Microsoft's 'Event Identifiers' reference"*.

#### Why `T1` / `T2` and not separate `EventIds` / `Categories` classes

A class can only `Implements EventLog(Of T1, T2) Via …` *once*. If a service needs events from multiple unrelated message tables, it can compose multiple `EventLog` instances **as named fields** (no `Via`), accepting a small loss of ergonomics (calls become `MyEventLog.LogSuccess(…)` instead of `LogSuccess(…)`). Surface this as a one-line note on the index — most services share a single `MESSAGETABLE` module across all their classes (as the example does), so the limitation rarely bites.

**Layout decision** — three pages total, mirroring the small-package approach used by Assert:

- `docs/Reference/WinEventLogLib/index.md` — landing page: intro, lifecycle (define enums → instantiate → Register once → LogSuccess / LogFailure), gaps and quirks, the class and module lists.
- `docs/Reference/WinEventLogLib/EventLog.md` — the generic class, single-file (no sub-pages — the surface is small).
- `docs/Reference/WinEventLogLib/EventLogHelperPublic.md` — the helper module, single-file (one Sub listed under a `## RegisterEventLogInternal` heading, same shape as Assert per-member sections).

**Naming:**

- Folder / URL segment: `WinEventLogLib/` (matches the source-side package name; no `Package` suffix to drop, the package isn't named with that suffix in `Settings`).
- Index title: `WinEventLogLib Package` — the `<Name> Package` convention used by every other package landing.
- Permalinks: `/tB/Packages/WinEventLogLib/` for the landing; `/tB/Packages/WinEventLogLib/EventLog` and `/tB/Packages/WinEventLogLib/EventLogHelperPublic` for the two member pages.
- `parent: WinEventLogLib Package` on each child page (matching the index `title:`, the same split every other package uses).

**License:** MIT (copyright Wayne Phillips T/A iTech Masters, 2025; first release v0.1, 04-FEB-2025) — same situation as WebView2Package, Assert, CustomControls, and CEF. Pages are fully original content; **omit** the `vba_attribution: true` flag.

### WinNamedPipesLib

Layout of `..\tb-export\NewProject\Packages\WinNamedPipesLib\Sources\` is flat — seven `.twin` files plus three text files (`_README.txt`, `_LICENCE.txt`, `_RELEASE_HISTORY.txt`):

- `APIs.twin` — `Private Module NamedPipesAPIs` wrapping Win32 declarations from `kernel32.dll`, `user32.dll`, and `oleaut32.dll` (`CreateNamedPipeW`, `ConnectNamedPipe`, `ReadFile` / `WriteFile`, `CreateIoCompletionPort`, `GetQueuedCompletionStatus`, `PostQueuedCompletionStatus`, `CreateThread`, …) plus the supporting `Type` declarations (`POINT`, `MSG`, `SAFEARRAYBOUND`, `SAFEARRAY_1D`, `OVERLAPPED_CUSTOM`, `FILETIME`, `WIN32_FIND_DATAW`) and a 32/64-bit `SetWindowLongPtrW` alias. No doc page.
- `Constants.twin` — `Private Module NamedPipesConstants` carrying Win32 constants (`PIPE_ACCESS_DUPLEX`, `PIPE_TYPE_MESSAGE`, `FILE_FLAG_OVERLAPPED`, `ERROR_IO_PENDING`, `ERROR_MORE_DATA`, …) and the package-internal `Enum OverlappedTypeConstants` (`tbOverlappedConnect`, `tbOverlappedRead`, `tbOverlappedWrite`). Module is private, so none of these surface in the public API; no doc page.
- `Helper.twin` — `Private Module NamedPipesHelper` with `ObjectFromPointer_*` and `ObjPtrRef` / `ObjReleaseRef` reference-counting helpers used internally to ferry COM pointers across IOCP worker threads. Module is private; no doc page.
- `NamedPipeServer.twin` — `Public Class NamedPipeServer`. The server-side entry point. Also declares the private `INamedPipeServerInternal` interface (implementation detail; no doc page).
- `NamedPipeServerConnection.twin` — `Public Class NamedPipeServerConnection`. Per-client connection object surfaced through `NamedPipeServer` events. Also declares the private `INamedPipeServerConnectionInternal` interface (no doc page).
- `NamedPipeClientManager.twin` — `Public Class NamedPipeClientManager`. Owns the client-side IOCP machinery and the `Connect` / `Stop` / `FindNamedPipes` entry points. Also declares the private `INamedPipeClientManagerInternal` interface (no doc page).
- `NamedPipeClientConnection.twin` — `Public Class NamedPipeClientConnection`. Returned by `NamedPipeClientManager.Connect`. Carries the `Connected` / `Disconnected` / `MessageReceived` / `MessageSent` events and the `AsyncWrite` / `AsyncRead` / `AsyncClose` methods. Also declares the private `INamedPipeClientConnectionInternal` interface (no doc page).

The four classes are each tagged `[COMCreatable(False)]` — only the manager / server classes can be instantiated by user code (with `New`); the two `Connection` classes are constructed internally and handed back through events / return values.

The private `INamedPipe*Internal` interfaces serve a marshalling-only role: each public class implements its matching internal interface so that the IOCP worker threads can refcount and dispatch through `stdole.IUnknown` without taking a strong reference to the parent class. They are *not* user-facing surface and get no documentation page.

Public user-facing surface (four classes — two on each side):

| Class                       | Role                                                                                                          |
|-----------------------------|---------------------------------------------------------------------------------------------------------------|
| `NamedPipeServer`           | The server. User-instantiated. Sets `PipeName`, calls `Start`, listens for events; one server hosts many clients. |
| `NamedPipeServerConnection` | One server-side per-client connection. Surfaced through `NamedPipeServer` events; carries `AsyncRead` / `AsyncWrite` / `AsyncClose`. |
| `NamedPipeClientManager`    | The client-side coordinator. User-instantiated. Owns the IOCP worker threads; the `Connect` method returns a `NamedPipeClientConnection`. |
| `NamedPipeClientConnection` | One client-side connection. Returned by `NamedPipeClientManager.Connect`; carries `Connected` / `Disconnected` / `MessageReceived` / `MessageSent` events and `AsyncRead` / `AsyncWrite` / `AsyncClose`. |

#### `NamedPipeServer` public members

Tagged `[COMCreatable(False)]`, `[InterfaceId(...)]`, `[EventInterfaceId(...)]`, `[ClassId(...)]`. No `[Description("...")]` on the class itself.

**Public fields** (each carries a `[Description("...")]`):

- `PipeName As String` — *"the discoverable pipe name"*. Set this before `Start()` or `Start()` raises run-time error 5 (*"cannot start without specifying a pipe name"*). The Win32 pipe namespace path is `\\.\pipe\<PipeName>` (the package prepends `\\.\pipe\` itself).
- `NumThreadsIOCP As Long = 1` — *"the number of IOCP worker threads that will be created"*. Read once when `Start()` is called; the in-source `FIXME` notes that this should become read-only once started.
- `FreeThreadingEvents As Boolean = False` — *"set to TRUE to allow the server events ClientConnected / ClientReceivedDataAsync etc to be fired directly from the IOCP worker threads. set to FALSE to ensure the events get fired on the main UI thread."* The free-threaded path skips a Win32 message-loop round-trip; the marshalled path is safer because the events fire on the UI thread.
- `ContinuouslyReadFromPipe As Boolean = True` — *"set to TRUE to ensure ClientReceivedDataAsync events always fire without having to call AsyncRead manually."* When `False`, the consumer must call `AsyncRead` after each `ClientMessageReceived` to keep receiving.
- `MessageBufferSize As Long = 131072` — *"sets the initial size for ReadFile() buffers. does not affect the maximum message receive size, but can affect performance."* On `ERROR_MORE_DATA` the IOCP loop allocates a larger overflow buffer and re-issues the read, so messages larger than this size do work — but with one extra allocation per overflowed message.

**Public events**:

- `ServerReady()` — fires once after `Start()` when every IOCP worker has joined.
- `ClientConnected(Connection As NamedPipeServerConnection)` — a new client connection has completed.
- `ClientDisconnected(Connection As NamedPipeServerConnection)` — the connection has dropped and every outstanding async operation has returned.
- `ClientMessageReceived(Connection As NamedPipeServerConnection, ByRef Cookie As Variant, ByRef Data() As Byte)` — a message arrived. *Data* is a transient view over the IOCP read buffer (a hand-rolled `SAFEARRAY` whose backing memory is reused after the event); copy it if you need to keep it past the event handler.
- `ClientMessageSent(Connection As NamedPipeServerConnection, ByRef Cookie As Variant)` — a previously-issued `AsyncWrite` has completed.

**Public methods**:

- `Sub New()` — constructor; creates the hidden marshalling-window used for UI-thread event delivery.
- `Public Sub Start()` — creates the IOCP completion port and `NumThreadsIOCP` worker threads, then issues the first connection listener. Idempotent: calling `Start()` while already started is a no-op.
- `Public Sub Stop()` — cancels every outstanding I/O, joins the IOCP threads, closes pipe handles. Idempotent. Called automatically from `Class_Terminate`.
- `Sub AsyncBroadcast(ByRef Data() As Byte, Optional ByRef Cookie As Variant = Empty)` — issues `AsyncWrite` against every currently-connected `NamedPipeServerConnection`.
- `Public Sub ManualMessageLoopEnter()` / `Public Sub ManualMessageLoopLeave()` — drive a Win32 message loop manually (rare; only needed when the host process does not naturally pump messages — e.g. an unattended Windows service that wants the marshalled-event semantics rather than the free-threaded ones). `Leave` posts `WM_USER_QUITTING`, which `Enter` reads to break the loop.

#### `NamedPipeServerConnection` public members

Tagged `[COMCreatable(False)]`. Not directly user-instantiable.

**Public fields**:

- `Handle As LongPtr` — the underlying Win32 pipe handle. Exposed but not normally needed; useful for low-level operations or debugging.
- `IsOpening As Boolean` — true while `Open()` is in progress (race-condition window between adding to the linked list and finishing `ConnectNamedPipe`).
- `IsConnected As Boolean` — true between the client connecting and the connection dropping.
- `CustomData As Variant` — *"free for use"*: opaque per-connection slot the consumer can attach state to.

**Public methods**:

- `Sub New(...)` — internal constructor; takes the parent server + pipe info. Never called by user code.
- `Public Sub AsyncClose()` — cancels outstanding I/O and closes the pipe handle. Called automatically from `Class_Terminate`.
- `Public Sub AsyncWrite(ByRef Data() As Byte, Optional ByRef Cookie As Variant = Empty)` — writes a message back to this specific client. Returns immediately; `NamedPipeServer.ClientMessageSent` fires when the write completes.
- `Public Sub AsyncRead(Optional ByRef Cookie As Variant = Empty, Optional OverlappedStruct As LongPtr)` — manually issues a read. Only needed when `NamedPipeServer.ContinuouslyReadFromPipe = False`; otherwise the server keeps the read pump fed automatically.

No public events — message-received and connection-dropped notifications come through the parent `NamedPipeServer`. The class declares an internal `INamedPipeServerConnectionInternal` interface that the IOCP loop uses for refcounting; that interface is `Private` and gets no doc page.

#### `NamedPipeClientManager` public members

Tagged `[COMCreatable(False)]`, `[InterfaceId(...)]`, `[EventInterfaceId(...)]`, `[ClassId(...)]`.

**Public fields** (each carries `[Description("...")]`, mirror the server's):

- `NumThreadsIOCP As Long = 1`
- `MessageBufferSize As Long = 131072`
- `FreeThreadingEvents As Boolean = False`
- `ContinuouslyReadFromPipe As Boolean = True`

These four are read once on the first `Connect()` call and propagated to every `NamedPipeClientConnection` created through that manager; subsequent changes do not affect connections that already exist. Source comment in `NamedPipeClientConnection` confirms: *"tip: set it in NamedPipeClientConnections before Connect()"*.

**Public methods**:

- `Sub New()` — constructor; creates the hidden marshalling window.
- `Public Function Connect(ByVal PipeName As String) As NamedPipeClientConnection` — opens a connection to a server (`\\.\pipe\<PipeName>`). Lazy on first call: creates the IOCP port and the worker threads. Returns a connection object that fires `Connected` once the async `CreateFileW` completes.
- `Public Sub Stop()` — cancels every outstanding I/O on every managed connection, joins the IOCP threads, frees the resources. Idempotent. Called automatically from `Class_Terminate`.
- `Public Function FindNamedPipes(Optional Pattern As String = "*") As Collection` — enumerates the named pipes currently published on the local machine (via `FindFirstFileW("\\.\pipe\<Pattern>")`). Returns a `Collection` of `String`. Useful as a discovery helper before calling `Connect`.

No events on the manager itself — per-connection events live on the returned `NamedPipeClientConnection` objects.

#### `NamedPipeClientConnection` public members

Tagged `[COMCreatable(False)]`, `[InterfaceId(...)]`, `[ClassId(...)]`, `[EventInterfaceId(...)]`. Not directly user-instantiable — `NamedPipeClientManager.Connect` returns it.

**Public fields**:

- `PipeName As String` — the pipe name the connection targets.
- `Handle As LongPtr` — the underlying Win32 file handle. Same caveats as on the server-side connection.
- `CustomData As Variant` — *"free for use"*.

**Public events**:

- `Connected()` — the async `CreateFileW` has succeeded.
- `Disconnected()` — the connection has dropped and every outstanding async operation has returned.
- `MessageReceived(ByRef Cookie As Variant, ByRef Data() As Byte)` — a message arrived. *Data* has the same transient-view semantics as on the server.
- `MessageSent(ByRef Cookie As Variant)` — a previously-issued `AsyncWrite` has completed.

**Public methods**:

- `Sub New(...)` — internal constructor; never called by user code directly.
- `Public Sub AsyncClose()` — **critical:** the README says *"you MUST call AsyncClose on the client side, otherwise the connection is left alive when the object goes out of scope"*. Surface this on every relevant page.
- `Public Sub AsyncWrite(ByRef Data() As Byte, Optional ByRef Cookie As Variant = Empty)` — sends a message to the server.
- `Public Sub AsyncRead(Optional ByRef Cookie As Variant = Empty, Optional OverlappedStruct As LongPtr)` — manually issues a read. Same gating as on the server-side: only call this when `ContinuouslyReadFromPipe = False`.

**Documented gaps / TODOs from `_README.txt`** (surface on the landing page):

- *"we need a method to allow closing a client connection from the server side"* — there is no `NamedPipeServerConnection.Disconnect` or `.Close` user-method today. The server can stop the whole pipe (`NamedPipeServer.Stop`) but cannot selectively drop one client.
- *"named pipe error should be raised via Error events (rather than throwing an error on the worker threads)"* — internal IOCP errors currently bubble up as VBA run-time errors on worker threads rather than as `Error` events. No `Error` event exists on any of the four classes yet.
- *"remove max size 131072 of messages"* — the `MessageBufferSize` initial-buffer default is 131072 bytes. The IOCP overflow path (`ERROR_MORE_DATA` → larger buffer → re-issue read) does handle larger messages, but there may be a hard cap somewhere the author wants to remove; surface this as *"see TODO list in `_README.txt`"* rather than making a stronger claim.
- *"currently a lot of duplicate code in server + client"* — internal-refactor note. **Not** surfaced on the docs.

**Cookie pattern.** Every `AsyncRead` and `AsyncWrite` accepts an optional *Cookie* (`Variant`). Whatever the consumer passes in flows through the IOCP completion buffer and is handed back out on the matching `MessageReceived` / `MessageSent` event. This is the package's mechanism for correlating individual writes with their completion notifications when many are in flight.

**`Data() As Byte` transience.** Inside `MessageReceived` / `ClientMessageReceived`, *Data* is **not** a real `Byte` array — it is a hand-rolled `SAFEARRAY` whose `pvData` field points at the IOCP overlapped buffer. The buffer is recycled back into a free-list at the end of the event handler. Copy the bytes out (`ReDim`-and-copy, or `CStrConv` for text payloads) if you need them after returning from the handler. The source uses `PutMemPtr(VarPtr(safeArrayPtr), VarPtr(safeArrayPsuedo))` and clears it afterwards — surface this lifetime caveat on every event-page entry that carries *Data*.

**Hidden message window.** Each `NamedPipeServer` and `NamedPipeClientManager` instance creates an invisible `STATIC`-class window with a subclassed `WndProc`, used to marshal IOCP-thread completions back to the UI thread when `FreeThreadingEvents = False`. Mention this on each class's intro paragraph — it explains why the consumer's process must be pumping a message loop for the default event-delivery semantics to work, and why `ManualMessageLoopEnter` / `ManualMessageLoopLeave` exist on `NamedPipeServer` for service / console hosts.

#### Canonical service-host idiom — `ManualMessageLoopEnter` paired with `ChangeState`

`tbServiceTest2`'s `Sources\SERVICES\TBSERVICE001.twin` shows the standard pattern for a Windows service that hosts a `NamedPipeServer`. Surface this on the `NamedPipeServer.md` page (under a "Hosting inside a Windows service" sub-heading) and on the index landing:

```tb
' On the service thread (ITbService.EntryPoint):
Set NamedPipeServer = New NamedPipeServer
NamedPipeServer.PipeName = "WaynesPipe_" & CurrentComponentName
ServiceManager.ReportStatus(vbServiceStatusRunning)

NamedPipeServer.Start()
NamedPipeServer.ManualMessageLoopEnter()    ' blocks until ManualMessageLoopLeave
NamedPipeServer.Stop()

ServiceManager.ReportStatus(vbServiceStatusStopped)

' On the dispatcher thread (ITbService.ChangeState):
Select Case dwControl
    Case vbServiceControlStop, vbServiceControlShutdown
        ServiceManager.ReportStatus(vbServiceStatusStopPending)
        NamedPipeServer.ManualMessageLoopLeave()    ' wakes the service thread
End Select
```

Key facts that aren't obvious from the per-method `[Description]`s:

- The service-thread `EntryPoint` and the dispatcher-thread `ChangeState` are **different threads**. The `NamedPipeServer` member field is shared between them; the dispatcher-thread `ChangeState` calls `ManualMessageLoopLeave` on it to wake the service thread out of `ManualMessageLoopEnter`.
- `ManualMessageLoopLeave` is the **only** way to wake `ManualMessageLoopEnter` cleanly. There is no timeout, no second blocking primitive. If the service needs to react to other wake-up sources (paused state, custom control codes), it sets a shared flag *then* calls `ManualMessageLoopLeave` to break out, inspects the flag, and decides whether to re-enter the loop or proceed to shutdown. The `TBSERVICE002` variant in the same example demonstrates this with `IsPaused` / `IsStopping` shared `Public` fields and a `While IsStopping = False` outer loop.
- Pause / continue support uses the same pattern: `ChangeState` flips `IsPaused = True` and calls `ManualMessageLoopLeave`; the service thread sees the flag, reports `vbServiceStatusPaused`, enters a `Do While IsPaused : Sleep(500) : Loop`, then re-enters `ManualMessageLoopEnter` once `Continue` flips the flag back.
- `FreeThreadingEvents = False` (the default) is **required** for this pattern — events are marshalled to whichever thread is currently inside `ManualMessageLoopEnter`. Setting `FreeThreadingEvents = True` would deliver events on the IOCP worker thread instead and bypass the manual loop entirely (advanced; not the documented service idiom).

The non-service equivalent — hosting the same `NamedPipeServer` inside a Form — is in `Sources\FORMS\InProcessNamedPipeServerForm.twin`: the Form's regular message loop pumps the marshalling window automatically, so the Form just calls `Server.Start()` in `Form_Load` and `Server.Stop` in `Form_Unload` without ever touching `ManualMessageLoopEnter` / `Leave`. Cross-reference both patterns on the `NamedPipeServer.md` page so the reader sees the choice point.

#### PropertyBag as the canonical message carrier

Every example serialises structured payloads through the pipe as a `PropertyBag.Contents` `Byte()`:

```tb
' Sender:
Dim propertyBag As New PropertyBag
propertyBag.WriteProperty("CommandID", "WHAT_TIME_IS_IT")
propertyBag.WriteProperty("Data", payload)
SelectedNamedPipe.AsyncWrite propertyBag.Contents

' Receiver (inside MessageReceived event):
Dim propertyBag As New PropertyBag
propertyBag.Contents = Data          ' deep-copies the bytes; safe past the event handler
Dim commandID As String = propertyBag.ReadProperty("CommandID")
…
```

Two reasons this pattern matters and should be surfaced on the docs:

1. **The transient-`Data()` problem is solved by `PropertyBag`.** Assigning to `PropertyBag.Contents` deep-copies the byte buffer; once the assignment returns, the original IOCP buffer can be recycled without invalidating the data. This is the cleanest answer to *"how do I keep the data past the event handler?"* — call out on every `MessageReceived` / `ClientMessageReceived` page entry as the recommended capture mechanism.
2. **`PropertyBag` provides typed multi-field payloads** without the consumer having to design a wire protocol. Both sides agree on the property names (`"CommandID"`, `"ResponseCommandID"`, `"ResponseData"`, `"Data"`) and `PropertyBag` handles the encoding / decoding. Cross-link [`PropertyBag` reference](docs/Reference/VBRUN/PropertyBag/index.md) from the index landing.

Surface as the **recommended** carrier; nothing in the package mandates it, raw `Byte()` works too, but every worked example uses `PropertyBag` and the integration story reads much more cleanly with it.

#### Discovery loop — `FindNamedPipes`

`tbServiceTest2`'s `MainForm` shows the canonical client-side discovery pattern: a low-frequency `Timer` (the form uses `timerRefreshNamedPipes` with a multi-second interval) that calls `NamedPipeClients.FindNamedPipes("WaynesPipe_*")`, repopulates a `ListBox`, and preserves the user's current selection:

```tb
For Each namePipeName In NamePipeClients.FindNamedPipes("WaynesPipe_*")
    If namePipeName = NamedPipeSelected Then namedPipeSelectedIndex = Index
    lstNamedPipes.AddItem(namePipeName)
    Index += 1
Next
```

Surface on the `NamedPipeClientManager.md` page (under the `FindNamedPipes` entry) as the recommended polling loop — the underlying `FindFirstFileW("\\.\pipe\…")` call is cheap enough to invoke every few seconds without measurable cost, and pipes appear / disappear too quickly for any event-driven discovery to be reliable. Don't claim there's no faster API; just say *"polling is the documented approach"*.

#### Service-side broadcast

`InProcessNamedPipeServerForm.twin` demonstrates `Server.AsyncBroadcast("BROADCAST")` (string coerced to `Byte()` via twinBASIC's implicit `String → Byte()` conversion). Useful when the same server has multiple concurrent connections and wants to push an update to all of them — the alternative is iterating over a user-maintained list of `NamedPipeServerConnection`s and calling `AsyncWrite` on each. The package handles the iteration internally. Mention on the `NamedPipeServer.AsyncBroadcast` entry.

**Layout decision** — five pages total, one per public class plus the landing page:

```
docs/Reference/WinNamedPipesLib/
  index.md                          ← package landing; intro + IOCP model + cookie + transient-data caveat + gap list + class table
  NamedPipeServer.md                ← single-file: fields, events, methods
  NamedPipeServerConnection.md      ← single-file
  NamedPipeClientManager.md         ← single-file
  NamedPipeClientConnection.md      ← single-file
```

All four class pages are single-file (no folder-style — no natural sub-pages; the surface per class is medium-small, on the order of WebView2 wrapper classes).

**Naming:**

- Folder / URL segment: `WinNamedPipesLib/` (matches the source-side package name; no `Package` suffix to drop, same as `WinEventLogLib`).
- Index title: `WinNamedPipesLib Package` — the `<Name> Package` convention.
- Permalinks: `/tB/Packages/WinNamedPipesLib/` for the landing; `/tB/Packages/WinNamedPipesLib/<Class>` for each of the four class pages.
- `parent: WinNamedPipesLib Package` on each child page (matching the index `title:`).

**License:** MIT (copyright Wayne Phillips T/A iTech Masters, 2025; first release v0.1, 04-FEB-2025) — same situation as WebView2Package, Assert, CustomControls, CEF, and WinEventLogLib. Pages are fully original content; **omit** the `vba_attribution: true` flag.

### WinServicesLib

Layout of `..\tb-export\NewProject\Packages\WinServicesLib\Sources\` is flat — eight `.twin` files plus three text files (`_README.txt`, `_LICENCE.txt`, `_RELEASE_HISTORY.txt`):

- `APIs.twin` — `Private Module ServicesAPIs` wrapping fourteen `advapi32.dll` / `kernel32.dll` / `ole32.dll` / `oleaut32.dll` entry points (`StartServiceCtrlDispatcherW`, `OpenSCManagerW`, `CreateServiceW`, `RegisterServiceCtrlHandlerExW`, `SetServiceStatus`, `OpenServiceW`, `DeleteService`, `CloseServiceHandle`, `QueryServiceStatusEx`, `StartServiceW`, `ControlServiceExW`, `ChangeServiceConfig2W`, `CoInitializeEx`, `SysAllocStringPtr`) plus the supporting `Type` declarations (`SERVICE_STATUS`, `SERVICE_STATUS_PROCESS`, `SERVICE_CONTROL_STATUS_REASON_PARAMSW`, `SERVICE_CONFIG_DESCRIPTION`). No doc page.
- `Constants.twin` — two modules. `Private Module ServicesConstants` carries the Win32 access-flag constants (`SC_MANAGER_*`, `SERVICE_*` permission bits, `SERVICE_CONTROL_*` control codes, `SERVICE_ACCEPT_*` accepted-controls flags, etc.) plus the `SC_STATUS_TYPE` enum. **Public** module `ServicesConstantsPublic` carries the four user-facing enumerations (`ServiceTypeConstants`, `ServiceStartConstants`, `ServiceControlCodeConstants`, `ServiceStatusConstants`). The private module is internal; the public module's enums surface and need their own doc pages.
- `Helper.twin` — `Private Module ServicesHelper` with the IOCP-style trampoline (`ServiceControlHandlerCallback_Trampoline`) used in place of class-`AddressOf` plus a `VariantArrayToStringArray` helper. No doc page.
- `Interfaces.twin` — three interfaces: `Public Interface ITbService` (user-implemented), `Private Interface IServiceCreator` (internal — the public `ServiceCreator(Of T)` class implements it), `Private Interface IServiceManagerInternal` (internal). Only `ITbService` gets a doc page.
- `Services.twin` — the predeclared `Class Services` (no `Public`/`Private` modifier — `Class` defaults to public; tagged `[PredeclaredId]`, so it's used singleton-style as `Services.ConfigureNew`). The package's main entry point.
- `ServiceManager.twin` — `Public Class ServiceManager`. Per-service configuration + runtime status reporting. `[COMCreatable(False)]`. User code never instantiates this directly — it's returned by `Services.ConfigureNew()`.
- `ServiceCreator.twin` — `Public Class ServiceCreator(Of T)`. Generic factory `T → New T As ITbService`. `[COMCreatable(False)]`. Has the EA magic-byte `ClassId("66170220-FEF3-4257-8FBA-EAEAEAEAEAEA")` pattern, same compiler-special-handling as `WinEventLogLib`'s `EventLog(Of T1, T2)`.
- `ServiceState.twin` — `Class ServiceState` (no modifier — public by default). Read-only state snapshot for an installed service. `[COMCreatable(False)]`. Returned by `Services.QueryStateOfService`.

Public user-facing surface (three concrete classes + one generic class + one interface + four enums):

| Symbol                          | Kind                  | Role                                                                                              |
|---------------------------------|-----------------------|---------------------------------------------------------------------------------------------------|
| `Services`                      | `[PredeclaredId]` Class | The singleton coordinator: `ConfigureNew`, `RunServiceDispatcher`, `InstallAll`, `UninstallAll`, `LaunchService`, `ControlService`, `QueryStateOfService`, `GetConfiguredService`, `_NewEnum`. Used as `Services.X` without `New`. |
| `ServiceManager`                | Class                 | Per-service configuration + runtime status reporting. Returned by `Services.ConfigureNew()`.      |
| `ServiceCreator(Of T)`          | Generic class         | The dispatcher's factory: `T` must implement `ITbService`; `CreateInstance` returns `New T`.       |
| `ServiceState`                  | Class                 | Read-only state snapshot. Constructor (called via `Services.QueryStateOfService(Name)`) queries the SCM.  |
| `ITbService`                    | Public Interface      | The contract every service class implements: `EntryPoint`, `StartupFailed`, `ChangeState`.        |
| `ServiceTypeConstants`          | Enum                  | `tbServiceTypeOwnProcess`, `tbServiceTypeShareProcess`, etc.                                       |
| `ServiceStartConstants`         | Enum                  | `tbServiceStartAuto`, `tbServiceStartOnDemand`, etc.                                              |
| `ServiceControlCodeConstants`   | Enum                  | `vbServiceControlStop`, `vbServiceControlPause`, `vbServiceControlContinue`, etc.                  |
| `ServiceStatusConstants`        | Enum                  | `vbServiceStatusRunning`, `vbServiceStatusStartPending`, `vbServiceStatusStopped`, etc.            |

The two private interfaces (`IServiceCreator`, `IServiceManagerInternal`) are pure implementation detail — same situation as `WinNamedPipesLib`'s `INamedPipe*Internal` interfaces. **No doc page**, and don't surface the underscored implementing members on the concrete classes either.

The two `Private Module` declarations (`ServicesAPIs`, `ServicesConstants`) and the `Private Module ServicesHelper` are all internal — **no doc page**.

#### `Services` public members

`[PredeclaredId]` Class. The compiler instantiates a singleton named `Services` at program start; user code calls `Services.X` directly without `New`. The class also doubles as an enumerable collection of the `ServiceManager` instances that have been configured (`For Each manager In Services`).

**Public methods**:

- `Function ConfigureNew() As ServiceManager` — *"Use this method to configure a service. Usually used during app startup."* Allocates a new `ServiceManager`, adds it to the internal collection, returns it. Typical use: `With Services.ConfigureNew : .Name = "MyService" : .InstanceCreator = New ServiceCreator(Of MyServiceClass) : End With`.
- `Sub RunServiceDispatcher()` — *"This method hands over to the OS for managing the starting/stopping of services via the main thread. This is a BLOCKING call, until the OS wants to shutdown the service EXE."* Builds a `SERVICE_TABLE_ENTRYW` from every configured `ServiceManager` and calls `StartServiceCtrlDispatcherW`. Returns only when the OS terminates the service host. Raises run-time error 5 if the dispatcher cannot start (typically when the EXE was launched normally rather than by the SCM).
- `Sub InstallAll()` — *"This method tries to register ALL of the configured services onto the system."* Iterates the configured `ServiceManager`s and calls `.Install()` on each. Requires admin.
- `Sub UninstallAll()` — *"This method tries to unregister ALL of the configured services off the system."* Iterates and calls `.Uninstall()` on each. Requires admin.
- `Function QueryStateOfService(ByVal ServiceName As String) As ServiceState` — returns a fresh `ServiceState` snapshot. Raises run-time error 5 if the service isn't installed.
- `Sub LaunchService(ByVal ServiceName As String, ParamArray LaunchArgs())` — start an installed service by name, optionally passing launch arguments through to its `ServiceManager.LaunchArgs()` field. Wraps `OpenServiceW(SERVICE_START)` + `StartServiceW`. Raises run-time error 5 on permission / not-installed / already-running.
- `Sub ControlService(ByVal ServiceName As String, ByVal ControlCode As ServiceControlCodeConstants)` — send an SCM control code to a running service. The required SCM permission is derived from the control code automatically (`SERVICE_STOP` for `vbServiceControlStop`, `SERVICE_PAUSE_CONTINUE` for the pause / continue / netbind / paramchange family, `SERVICE_INTERROGATE` for `vbServiceControlInterrogate`, `SERVICE_USER_DEFINED_CONTROL` for codes 128–255, `SERVICE_ALL_ACCESS` otherwise). For `vbServiceControlStop` the wrapper fills `SERVICE_CONTROL_STATUS_REASON_PARAMSW` with `SERVICE_STOP_REASON_FLAG_PLANNED | MAJOR_NONE | MINOR_NONE` — there is a `FIXME` to allow customising the reason code.

**Public properties**:

- `Property Get GetConfiguredService(ByVal Name As String) As ServiceManager` — look up a previously-configured `ServiceManager` by its `Name`. Raises run-time error 5 if not found. (Despite the `Get` syntax the lookup is parameterised by name; it's a property in name only.)

**Public enumerator**:

- `Property Get _NewEnum() As Variant` — `[Enumerator]`-tagged; enables `For Each manager In Services` over the configured `ServiceManager`s. *"Provides For-Each support for the services collection, exposing each configured service as a ServiceManager instance."*

#### `ServiceManager` public members

`[COMCreatable(False)]`. User code never instantiates this directly — `Services.ConfigureNew()` returns it. The source-side constructor carries `[Description("For internal use. Dont create instances of ServiceManager manually, use Services.ConfigureNew instead")]` — surface that on the page intro.

**Public field** (one):

- `LaunchArgs() As String` — populated by `ServiceEntryPoint` from the `argv` the SCM hands over. `LaunchArgs(0)` is the *first user-supplied* argument (the SCM-supplied service name at `argv[0]` is dropped). The example uses it to gate startup: `If Join(ServiceManager.LaunchArgs) <> "MySecretPassword" Then …`.

**Public properties** (each carries a `[Description("...")]`):

- `InstanceCreator As IServiceCreator` (Get / Let / Set) — *"Set this to an instance of the ServiceCreator class to allow the OS to launch the instance of your service."* Typically `.InstanceCreator = New ServiceCreator(Of MyServiceClass)`.
- `Name As String` (Get / Let) — *"The name of the service, as listed in the OS services database."*
- `Description As String` (Get / Let) — *"The description of the service, as listed in the OS services database."* Applied via `ChangeServiceConfig2W(SERVICE_CONFIG_DESCRIPTION)` on every successful `Install()`.
- `Type As ServiceTypeConstants` (Get / Let) — *"The type of the service, typically `tbServiceTypeOwnProcess` or `tbServiceTypeShareProcess`."* Defaults to `tbServiceTypeOwnProcess`.
- `InstallStartMode As ServiceStartConstants` (Get / Let) — *"The start-mode of the service, typically `tbServiceStartOnDemand` or `tbServiceStartAuto`."* Defaults to `tbServiceStartOnDemand`.
- `InstallCmdLine As String` (Get / Let) — *"The command line arguments passed to the service EXE when the OS launches the service."* Defaults to `"""<App.ModulePath>"""`. **Usually overridden to add a discriminator argument** like `-startService` so the EXE knows whether it was launched by the SCM (run dispatcher) or by a user (show UI). Example: `.InstallCmdLine = """" & App.ModulePath & """ -startService"`.
- `DependentServices() As Variant` (Get / Let) — *"A list of dependent services that this service requires to be started before this service is launched (dependent services are auto-launched by the OS)."* Pass an `Array("OtherSvc1", "OtherSvc2")`. The setter stashes it; `Install()` packs it into a double-null-terminated string and hands it to `CreateServiceW`.
- `AutoInitializeCOM As Boolean` (Get / Let) — *"When TRUE, COM will be initialized for you on the new service thread in STA mode."* Defaults to `True`. Set to `False` if your service needs a different apartment model (call `CoInitializeEx` yourself from `EntryPoint`).
- `SupportsPausing As Boolean` (Get / Let) — *"When TRUE, the SCM will send `SERVICE_CONTROL_PAUSE` / `SERVICE_CONTROL_CONTINUE` notifications."* Defaults to `False`. The setter calls `ResyncStatus()` so toggling it mid-run takes effect immediately. (Most services set this to `True` once inside `EntryPoint` and then handle `vbServiceControlPause` / `vbServiceControlContinue` in `ChangeState`.)

**Public methods**:

- `Sub Install()` — *"This method attempts to install the configured service on the system."* Opens the SCM with `SC_MANAGER_CONNECT Or SC_MANAGER_CREATE_SERVICE`, calls `CreateServiceW`. If the service already exists, deletes it (via `OpenServiceW(SERVICE_DELETE)` + `DeleteService`) and **retries** the create — so `Install()` is effectively re-entrant / safe to call multiple times. On successful create, sets the description via `ChangeServiceConfig2W`. Raises run-time error 5 on permissions failure or unrecoverable create failure. **Requires admin elevation.**
- `Sub Uninstall()` — *"This method attempts to uninstall the configured service on the system."* Opens the SCM, opens the service with `SERVICE_DELETE`, calls `DeleteService`. Raises run-time error 5 if the service isn't registered or on permissions failure. **Requires admin elevation.**
- `Sub ReportStatus(ByVal dwCurrentState As ServiceStatusConstants, Optional ByVal dwWin32ExitCode As Long = ERRORCODE_NO_ERROR, Optional ByVal dwWaitHint As Long = 0)` — *"This method informs the OS of the current state of the service."* The user's `EntryPoint` is **required** to call `ReportStatus(vbServiceStatusRunning)` once steady-state is reached and `ReportStatus(vbServiceStatusStopped)` once shut-down completes; long start-up sequences should also call `ReportStatus(vbServiceStatusStartPending, , <waitHint_ms>)` periodically to keep the SCM from killing the service. The `dwControlsAccepted` field of `SERVICE_STATUS` is filled automatically from the state and from `SupportsPausing` (Stop is always accepted except during `StartPending`; Pause/Continue is gated on `SupportsPausing`). The `dwCheckPoint` field auto-increments for pending states and resets on `Running`/`Stopped`.
- `Sub ResyncStatus()` — re-applies the cached `SERVICE_STATUS` to the SCM via `SetServiceStatus`. Called automatically from `ReportStatus` and from the `SupportsPausing` setter. User code rarely needs to call this directly; mention it for completeness.

The class also carries two methods that are technically `Public`-by-default (no modifier) but are invoked only by the OS dispatcher / the package's own trampoline — `ServiceEntryPoint(ByVal dwArgc As Long, ByVal lpszArgv As LongPtr)` and `ServiceControlHandlerCallback(ByVal dwControl As Long, ByVal dwEventType As Long, ByVal lpEventData As LongPtr)`. **Do not list these as user-facing methods**; mention them at the very end of the page under "Internal hooks" with a `> [!NOTE]` saying the OS / package infrastructure invokes them and user code never calls them.

#### `ServiceCreator(Of T)` public members

Generic class. `[COMCreatable(False)]`. `[Description("This class allows the service manager to create an instance of a particular service on-demand as needed")]` is the source intro. Tagged with the EA magic-byte `[ClassId("66170220-FEF3-4257-8FBA-EAEAEAEAEAEA")]` — same compiler-special-handling treatment as `WinEventLogLib`'s `EventLog(Of T1, T2)`. Do not surface the `ClassId` on the page.

Type parameter constraint: `T` must implement `ITbService`. There is no syntactic `Where T : ITbService` constraint expressed in the source, but `Function CreateInstance() As ITbService` returning `New T` only compiles when `T` implements `ITbService` — flag this as the practical constraint on the page.

**Public method**:

- `Function CreateInstance() As ITbService` — `Implements IServiceCreator.CreateInstance`. Returns `New T`. Called once per service start by the package's dispatcher trampoline. User code never calls this directly; the typical usage is `.InstanceCreator = New ServiceCreator(Of MyServiceClass)` on a freshly-allocated `ServiceManager`.

The page should be small (the surface is one method) and largely focused on explaining the `Of T` parameterisation + the `T : ITbService` constraint + how it slots into `ServiceManager.InstanceCreator`.

#### `ServiceState` public members

`[COMCreatable(False)]`. Returned by `Services.QueryStateOfService(Name)`. The constructor takes the service name, opens the SCM with `SC_MANAGER_CONNECT`, opens the service with `SERVICE_QUERY_STATUS`, calls `QueryServiceStatusEx(SC_STATUS_PROCESS_INFO, ...)`, and snapshots a `SERVICE_STATUS_PROCESS` struct. **The snapshot is taken once at construction time and never refreshed** — to see updated state, call `Services.QueryStateOfService` again.

The constructor raises run-time error 5 with descriptive messages on three failure modes: SCM open failed (*"Unable to open the Service manager..."*), service not installed (*"Service '<Name>' is not installed on this system"*), status query failed (*"Unable to query the service state"*).

**Public properties** (all read-only `Get`):

- `Type As ServiceTypeConstants` — the SCM-reported service type.
- `CurrentState As Long` — the SCM-reported state, but typed `Long` rather than `ServiceStatusConstants`. **Source carries a `' FIXME` comment** — surface as a `> [!NOTE]` that this returns the underlying `Long` value (which happens to match the `ServiceStatusConstants` enum values), and that callers wanting type-safety can `CType(state.CurrentState, ServiceStatusConstants)`.
- `CurrentStateText As String` — human-readable text: `"RUNNING"`, `"STOPPED"`, `"STARTING"`, `"STOPPING"`, `"PAUSED"`, `"PAUSING"`, `"CONTINUING"`, `"UNKNOWN STATE (<n>)"`.
- `ControlsAccepted As Long` — bitmask of `SERVICE_ACCEPT_*` flags. **Source carries a `' FIXME` comment** — surface the same way as `CurrentState`.
- `ExitCode As Long` — the `dwWin32ExitCode` field. The Win32 documented sentinel `ERROR_SERVICE_SPECIFIC_ERROR` (`1066`) means "see `ServiceSpecificExitCode`".
- `ServiceSpecificExitCode As Long` — the service-defined exit code when `ExitCode = ERROR_SERVICE_SPECIFIC_ERROR`. Otherwise meaningless.
- `CheckPoint As Long` — the `dwCheckPoint` field; increments while the service is in a pending state and resets at steady state.
- `WaitHint As Long` — the `dwWaitHint` milliseconds field.
- `ProcessId As Long` — the OS process ID hosting the service (0 if not running).
- `Flags As Long` — the `dwServiceFlags` field (currently `SERVICE_RUNS_IN_SYSTEM_PROCESS = 1` is the only documented bit).

#### `ITbService` public members

`Public Interface`. Tagged `[InterfaceId("5F137E12-5164-452E-911A-6FD9BF20EC81")]`. Description: *"All services must implement `ITbService`."* The contract is three subs:

- `Sub EntryPoint(ByVal ServiceContext As ServiceManager)` — the main service body. Called by the package's dispatcher trampoline once the SCM has finished start-up handshaking. **Runs on the service thread** (a separate thread from the dispatcher). Inside this sub the implementor:
  1. Optionally validates startup conditions (e.g. checks `ServiceContext.LaunchArgs`).
  2. Calls `ServiceContext.ReportStatus(vbServiceStatusRunning)` once steady-state is reached (the dispatcher trampoline reports `vbServiceStatusStartPending` automatically before calling `EntryPoint`).
  3. Runs the long-running work loop. For pipe-server services this is the `NamedPipeServer.ManualMessageLoopEnter()` blocking call; for other services it might be a `Do While IsStopping = False` loop with a wait primitive.
  4. Calls `ServiceContext.ReportStatus(vbServiceStatusStopped)` before returning.
- `Sub StartupFailed(ByVal ServiceContext As ServiceManager)` — called if `RegisterServiceCtrlHandlerExW` failed (the control handler couldn't be hooked, e.g. the service was launched outside the SCM context). Typical implementation: log a failure event. Don't try to `ReportStatus` from here — the status handle is invalid.
- `Sub ChangeState(ByVal ServiceContext As ServiceManager, ByVal dwControl As ServiceControlCodeConstants, ByVal dwEventType As Long, ByVal lpEventData As LongPtr)` — the control-code dispatcher. **Runs on the main (dispatcher) thread**, not on the service thread. Typical pattern: `Select Case dwControl` over `vbServiceControlStop` / `vbServiceControlShutdown` / `vbServiceControlPause` / `vbServiceControlContinue`, set shared `Public` flags (`IsStopping`, `IsPaused`), call `ServiceContext.ReportStatus` to acknowledge the transition, signal the service thread to react (e.g. `NamedPipeServer.ManualMessageLoopLeave()`). The `dwEventType` + `lpEventData` parameters carry the event-specific payload for the codes that need it (`SERVICE_CONTROL_DEVICEEVENT`, `SERVICE_CONTROL_POWEREVENT`, `SERVICE_CONTROL_SESSIONCHANGE`, `SERVICE_CONTROL_HARDWAREPROFILECHANGE` — see Microsoft's `HandlerEx` documentation for the data layouts).

**The two-thread split is the single most important fact about the interface** — every page entry should reinforce it. The example uses `Public IsPaused As Boolean` + `Public IsStopping As Boolean` shared fields on the service class to ferry state between the two threads, which is the documented pattern.

#### Enumerations

Public enums (in `Public Module ServicesConstantsPublic`), one page each under `docs/Reference/WinServicesLib/Enumerations/`:

- `ServiceTypeConstants` — `tbServiceTypeAdapter`, `tbServiceTypeSystemDriver`, `tbServiceTypeKernelDriver`, `tbServiceTypeRecognizerDriver`, `tbServiceTypeOwnProcess`, `tbServiceTypeShareProcess`, `tbServiceTypeOwnProcessInteractive`, `tbServiceTypeShareProcessInteractive`. The driver values (`tbServiceTypeSystemDriver`, `tbServiceTypeKernelDriver`, `tbServiceTypeRecognizerDriver`, `tbServiceTypeAdapter`) are only meaningful when registering a kernel-mode driver — twinBASIC services compile to a user-mode EXE and should use `tbServiceTypeOwnProcess` (one service per EXE) or `tbServiceTypeShareProcess` (multiple services hosted in one EXE; the example uses this). The `Interactive` variants are kept for compatibility but Windows Vista and later disallow them; flag with a `> [!NOTE]`.
- `ServiceStartConstants` — `tbServiceStartAuto`, `tbServiceStartBoot`, `tbServiceStartOnDemand`, `tbServiceStartDisabled`, `tbServiceStartDriverSystem`. `tbServiceStartBoot` and `tbServiceStartDriverSystem` only apply to kernel drivers.
- `ServiceControlCodeConstants` — 18 values mirroring the Win32 `SERVICE_CONTROL_*` constants. Source-side prefix is `vbServiceControl*` (carried over from VB6 — note the prefix is `vb`, not `tb`, in this enum; surface as-is, don't try to rationalise).
- `ServiceStatusConstants` — `vbServiceStatusStopped`, `vbServiceStatusStartPending`, `vbServiceStatusStopPending`, `vbServiceStatusRunning`, `vbServiceStatusContinuePending`, `vbServiceStatusPausePending`, `vbServiceStatusPaused`. Same `vb` prefix.

Format pages like `WebView2/Enumerations/wv2PrintOrientation.md` — single intro paragraph, a value table with `{: #vbServiceXxx }` anchors per row for deep-linking.

#### Doc-side layout (folders / files)

Ten pages total:

```
docs/Reference/WinServicesLib/
  index.md                                  ← package landing; lifecycle + dual-thread model + install / launch flows + integration cross-links (event log + named pipes)
  Services.md                               ← the predeclared singleton
  ServiceManager.md                         ← per-service configuration + ReportStatus
  ServiceCreator.md                         ← Of T generic factory
  ServiceState.md                           ← read-only state snapshot
  ITbService.md                             ← interface every service implements
  Enumerations/index.md
  Enumerations/ServiceTypeConstants.md
  Enumerations/ServiceStartConstants.md
  Enumerations/ServiceControlCodeConstants.md
  Enumerations/ServiceStatusConstants.md
```

All five concrete pages are single-file (no folder-style — no natural sub-pages; each class's surface is medium-sized).

The `index.md` should be substantial and walk the reader through:

1. **What a Windows service is** (one paragraph: long-running background process supervised by the SCM, started before/independently of user logon, controlled via the Services control panel applet or `sc.exe`).
2. **Lifecycle**: configure (`Services.ConfigureNew`) → install (`Services.InstallAll` or per-manager `.Install`, **elevated**) → run (`Services.RunServiceDispatcher` blocks the EXE's main thread; SCM launches the service thread on demand). The example's `If InStr(Command, "-startService") > 0` branch is the canonical "same EXE for install-time UI and run-time service" pattern.
3. **The two-thread split**: `EntryPoint` and `ChangeState` run on different threads; surface this prominently with a small diagram or numbered explanation.
4. **Integration with the sister packages**: cross-link `Implements EventLog(Of …) Via EventLog = New EventLog(…)` (see `WinEventLogLib`) and the `NamedPipeServer.ManualMessageLoopEnter`/`Leave` service-hosting idiom (see `WinNamedPipesLib`). The worked example at `..\tbrepro\winlibs\tbServiceTest2\Sources\` ties all three together.

**Naming:**

- Folder / URL segment: `WinServicesLib/` (matches the source-side package name; no `Package` suffix to drop, same as `WinEventLogLib` and `WinNamedPipesLib`).
- Index title: `WinServicesLib Package` — the `<Name> Package` convention.
- Permalinks: `/tB/Packages/WinServicesLib/` for the landing; `/tB/Packages/WinServicesLib/<Class>` for each class page; `/tB/Packages/WinServicesLib/Enumerations/<Enum>` for each enum page.
- `parent: WinServicesLib Package` on each top-level child page. The four enum pages set `parent: Enumerations` and `grand_parent: WinServicesLib Package` (the grouped-page pattern; same shape as the WebView2 / CEF / CustomControls `Enumerations/` directories).

**License:** MIT (copyright Wayne Phillips T/A iTech Masters, 2025; first release v0.1, 04-FEB-2025) — same situation as every other Wayne Phillips package. Pages are fully original content; **omit** the `vba_attribution: true` flag.

### tbIDE

The **addin SDK** — a type-only compiler package. Every public symbol is an interface or a CoClass; the actual implementations live in the IDE binary, and an addin DLL binds against the type declarations and lets the IDE marshal calls into its implementations at run time. Twenty-four flat `.twin` files in `..\tbrepro\sample10\WaynesWorldAddInTest1\Packages\tbIDE\Sources\`, each 8–57 lines (501 lines total) — there is no plumbing to skip, every file declares user-facing types.

The `CHANGELOG.md` shipped in the package is a leftover copy-paste from a different package ("twinBASIC WinNativeForms") and is **not** about tbIDE — **do not** propagate that history onto the docs.

#### How an addin is built and loaded

From any of the six sample `Settings` files (the structure is identical across them):

- `project.buildType`: **Standard DLL** — addins are not packages, they are DLLs that the IDE loads.
- `project.buildPath`: `${IdePath}\addins\${Architecture}\${ProjectName}.${FileExtension}` — the build output drops directly into `<IDE>\addins\Win32\` or `<IDE>\addins\Win64\`. The IDE scans this folder on startup.
- `project.references` includes the tbIDE compiler package: `id: {99DEC38C-75F6-4488-8EE7-2D52D83881D2}`, `isCompilerPackage: true`, `publisher: TWINBASIC-COMPILER`, `symbolId: tbIDE`. Same shape that `CustomControls` uses.

The DLL **must** export a single factory function the IDE will call:

```tb
Module MainModule
    [DllExport]
    Public Function tbCreateCompilerAddin(ByVal Host As Host) As AddIn
        Return New MyAddinClass(Host)
    End Function
End Module
```

The returned object must implement the [`AddIn`](#addin) interface (a single read-only `Name` property). The IDE releases the object when the addin is disabled or the IDE shuts down. Every sample uses this exact `tbCreateCompilerAddin` skeleton — surface it on the index landing as the canonical entry point.

#### Public user-facing surface

Twenty-four files declaring twenty-three public CoClasses + one concrete `Class` + one interface-only declaration:

| File                         | Public symbols                                                        | Role                                                                                                              |
|------------------------------|-----------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| `Addin.twin`                 | `IAddInV1` + `AddIn` CoClass                                          | The contract every addin's main class implements. One member: `Property Get Name() As String`.                    |
| `Host.twin`                  | `IHostV1` + `ItbHostEventsV1/V2/V3` + `Host` CoClass                  | Root of the API — passed to `tbCreateCompilerAddin`. Versioned events (see "Versioned event interfaces" below).   |
| `AddinTimer.twin`            | `Class AddinTimer` (no CoClass)                                       | **The only concrete instantiable class** in the package. `New AddinTimer`; sets `Interval` (ms) + `Enabled`; fires `Timer` event. Internally wraps `SetTimer`/`KillTimer`. |
| `Button.twin`                | `IButtonV1` + `IButtonEventsV1` + `Button` CoClass                    | Toolbar button. Returned by `Toolbar.AddButton`. `OnClick` event.                                                 |
| `CodeEditor.twin`            | `ICodeEditorV1 Extends IEditorV1` + `CodeEditor` CoClass              | A code-pane editor — selection, text, Monaco passthrough, `AddMonacoWidget` for inline overlay HTML. Nested `RevealArea` enum. |
| `DebugConsole.twin`          | `IDebugConsoleV1` + `DebugConsole` CoClass                            | The DEBUG CONSOLE pane. `PrintText` (with optional colour), `Clear`, `SetFocus`.                                  |
| `Editor.twin`                | `IEditorV1` + `Editor` CoClass                                        | Base interface for editors. Source-side comment: *"Castable to CodeEditor etc."* — i.e. `Dim ce As CodeEditor = editor` works because the underlying object implements both. |
| `Editors.twin`               | `IEditorsV1` + `Editors` CoClass                                      | Collection of active editors. `Item(Index)` default member, `Count`, `Open(Path, Line, Col, Options)`. Source-side note: *"There is currently only ONE active editor, accessible via Editors(0) syntax"*. |
| `File.twin`                  | `IFileV1` + `IFileV2 Extends IFileV1` + `File` CoClass                | A virtual-FS file. V1: `Data` / `DataLen` / `Text` / `IsDirty`. V2 adds `ReadText(ReadTextFlags)`. Nested `ReadTextFlags` enum (one flag: `CommentsToWhitespace`). |
| `FileSystem.twin`            | `IFileSystemV1` + `FileSystem` CoClass                                | Tiny — `RootFolder` and `ResolvePath(Path)` (path needs the `twinbasic:/` prefix).                                |
| `FileSystemItem.twin`        | `IFileSystemItemV1` + `FileSystemItem` CoClass                        | Base for `File` and `Folder`. `Name`, `Path`, `Type`, `Parent`. Nested `FileSystemItemType` enum (`Folder`, `FileVIRTUALDOC`, `FileOTHER`, `FileTWIN`, `FileBAS`, `FileCLS`, `FileUIDESIGNER`, `FileJSON`). |
| `Folder.twin`                | `IFolderV1 Extends IFileSystemItemV1` + `Folder` CoClass              | `Count`, `Item(IndexOrName)`, `IsPackagesFolder`, plus for-each enumeration over `FileSystemItem` children.       |
| `HtmlElement.twin`           | `IHtmlElementV1` + `HtmlElement` CoClass                              | A DOM element inside a tool window. `Properties` (default member — see below), `ChildDomElements`, `Remove`, `AddEventListener(DomEventName, CallbackFunc, Optional Data)`. Plus one `[Hidden]` legacy `AddEventListenerOLD1`. |
| `HtmlElementProperties.twin` | `IHtmlElementPropertiesV1` (`[COMExtensible(True)]`) + CoClass         | The dynamic property bag on a DOM element. `Item(DomPropertyName)` is the default member; the `[COMExtensible(True)]` attribute is what makes `.style.display = "flex"` resolve through `Item("style").Item("display")` at run time. |
| `HtmlElementProperty.twin`   | `IHtmlElementPropertyV1` (`[COMExtensible(True)]`) + CoClass           | One value in the bag. `Value` (Get/Let, default member), plus nested `Properties` for chained access (`.style.color = "white"`). |
| `HtmlElements.twin`          | `IHtmlElementsV1` + `HtmlElements` CoClass                            | The `ChildDomElements` collection. `Item(ID)` default, `Add(ElementID, TagName)` returns the new child. Note `TagName` accepts both standard HTML tags AND the IDE's custom widget tags `chartjs` / `monaco` / `listview` / `virtuallistview`. |
| `IHtmlEventProperties.twin`  | `IHtmlEventPropertiesV1` (`[COMExtensible(True)]`) + `HtmlEventProperties` CoClass | The event-payload bag. Like `HtmlElementProperties` but read-only and used inside event handler callbacks. |
| `IHtmlEventProperty.twin`    | `IHtmlEventPropertyV1` (`[COMExtensible(True)]`) + `HtmlEventProperty` CoClass | One value in the event bag.                                                                                  |
| `KeyboardShortcuts.twin`     | `IKeyboardShortcutsV1` + `KeyboardShortcuts` CoClass                  | Single member: `Add(keyString, Callback As LongPtr)`. `keyString` is a literal key like `"{CTRL}{SHIFT}d"` (prefixes `{CTRL}` / `{SHIFT}` / `{ALT}`). |
| `Project.twin`               | `IProjectV1` + `Project` CoClass                                      | The currently-loaded project. Lifecycle (`Save`, `Close`, `Build`, `Clean`), introspection (`Path`, `Name`, `BaseFolderPath`, `ProjectID`, version + architecture + build-output info), `Evaluate(ExprString)` (debug-console-style expression evaluation), `RootFolder` (entry into the virtual FS), and `LoadMetaData`/`SaveMetaData` (persistent per-addin key/value storage inside the `.twinproj`). Nested `VbBuildType` enum. |
| `Themes.twin`                | `IThemesV1` + `Themes` CoClass                                        | `ActiveThemeName` ("Classic" / "Dark" / "Light"), `ActiveThemeNameGroup` ("dark" / "light"). The `Host` events interface fires `OnChangedTheme` when this flips. |
| `ToolWindow.twin`            | `IToolWindowV1` + `IToolWindowEventsV1` + `ToolWindow` CoClass        | A dockable / floating tool window. `Title`, `Visible`, `Resizable`, `Close`, `ApplyCss(stylesString)`, `RootDomElement` (default member — the entry into the DOM tree). `OnClose` event. |
| `ToolWindows.twin`           | `IToolWindowsV1` + `ToolWindows` CoClass                              | Single member: `Add(Name, Optional UniqueIdForPositionPersistance) As ToolWindow`. The second argument lets the IDE remember the floating-window position across IDE restarts. |
| `Toolbar.twin`               | `IToolbarV1` + `Toolbar` CoClass                                      | `AddSplitter` (vertical-bar separator), `AddButton(Id, Caption, Optional IconData)`.                              |
| `Toolbars.twin`              | `IToolbarsV1` + `Toolbars` CoClass                                    | `Item(Index)` default, `Count`. Source-side note: *"There is currently only ONE toolbar, accessible via the Toolbars(0) syntax"*. |

#### The interface/CoClass split — what it means for the doc layout

Almost every `.twin` declares one or two `Public Interface I<X>V1 Extends stdole.IUnknown` followed by `Public CoClass <X>` with `[Default] Interface I<X>V1` (and optionally `[Default, Source] Interface I<X>EventsV1`). The pattern is the standard COM idiom for late-binding-friendly extensibility — the IDE implements the interfaces, the addin holds references typed at the CoClass.

**The interfaces themselves get no doc page.** Users type their variables `As Host` / `As Button` / `As ToolWindow` (the CoClass), not `As IHostV1`. Fold the interface's members onto the CoClass's page; do not list both. Same convention CustomControls uses for its `_…` default interfaces.

**Versioning is conveyed by interface chains.** Two cases visible in the source:

- `IFileV1` → `IFileV2 Extends IFileV1` (V2 adds `ReadText(ReadTextFlags)`). The `File` CoClass declares `[Default] Interface IFileV2`. Document the V2 surface as the canonical `File` page; do not split V1 vs V2. (Mention in passing that `ReadText` is V2-only and consequently won't bind against very early IDE builds — though in practice every shipping IDE is V2+.)
- `IHostV1` → `ItbHostEventsV1` → `ItbHostEventsV2 Extends V1` → `ItbHostEventsV3 Extends V2`. The `Host` CoClass declares `[Default, Source] Interface ItbHostEventsV3`. The new members on V2 / V3 (`OnChangedActiveEditor`, `OnChangedTheme`) are each tagged **`[AllowUnpopulatedVtableEntry]`**, which is the mechanism that lets a newer addin compile against `ItbHostEventsV3` and still load against an older IDE that only implements `V1` — the IDE doesn't have to provide the V2/V3 entries.

Document all `Host` events together on the `Host.md` page (the per-version split is a compatibility detail, not a user-facing concept).

#### `AddinTimer` is the only user-instantiable class

Every other public symbol is a CoClass exposed *to* the addin by the IDE — the addin receives instances via `Host`, never constructs them. `AddinTimer` is the exception: it's a concrete `Class AddinTimer` (not a CoClass) and the addin instantiates it with `New AddinTimer`. Internally it wraps `SetTimer` / `KillTimer` with a private `TimerCallback`, exposes `Interval` (ms) + `Enabled`, and fires a `Timer` event.

Sample 11's CPU-monitor demonstrates the typical pattern:

```tb
Private WithEvents Timer As AddinTimer
…
Set Timer = New AddinTimer
Timer.Interval = 500
Timer.Enabled = True
…
Private Sub Timer_Timer()
    ' fires every 500 ms
End Sub
Private Sub myToolWindow_OnClose()
    Set Timer = Nothing       ' stop the timer when the window closes
End Sub
```

The class uses the `Handles` syntax internally (`Private Sub Changed() Handles Enabled.OnPropertyLet, Interval.OnPropertyLet`) so any change to `Enabled` or `Interval` re-arms the underlying timer — surface this as *"set `Enabled = False` to stop, change `Interval` at any time"*, not as an implementation detail.

`Class_Terminate` calls `KillTimer` so a dropped reference is sufficient to stop. Sample 15 demonstrates that direct Win32 `SetTimer` / `KillTimer` is also fine if `AddinTimer` doesn't fit — both patterns are valid; the package doesn't *require* the helper.

#### The HTML / DOM surface

Tool windows are rendered as HTML inside the IDE (the same browser surface the IDE uses for its own panes). The `HtmlElement` / `HtmlElements` / `HtmlElementProperty` / `HtmlElementProperties` quartet is the addin's keyhole into the DOM.

Three things make this surface unusual and have to be surfaced on the docs:

1. **`[COMExtensible(True)]` on `HtmlElementProperties` / `HtmlElementProperty` / `HtmlEventProperties` / `HtmlEventProperty`.** The attribute opts the interface into IDispatch dynamic-member resolution, which is what makes `.style.display = "flex"` work — at compile time the right-hand `.style.display` resolves to `Item("style").Item("display").Value = "flex"` (the default-member dance), and the IDE resolves the names against the live DOM at run time. No member named `style` is *declared* on `IHtmlElementPropertiesV1`. Surface this on each of the four pages with a `> [!IMPORTANT]` callout: the property names accepted are **every DOM property of the underlying tag** (standard HTML attributes, CSS-style properties under `.style.…`, plus any custom-element-specific surface like `.chart.data.datasets(0).borderWidth` on a `chartjs` element or `.editor.setOption(...)` on a `monaco` element). The docs cannot enumerate them — refer the reader to the relevant DOM / library reference.
2. **The custom-element tags.** `HtmlElements.Add(id, tagName)` accepts standard HTML tags (`"div"`, `"input"`, `"span"`, `"h1"`, …) AND four IDE-specific widget tags: `"chartjs"` (Chart.js wrapper — surfaces a `.chart` property), `"monaco"` (the Monaco editor — surfaces a `.editor` property), `"listview"` (the IDE's listview widget — surfaces a `.listview` property with `addItem` / `removeItem` / etc.), and `"virtuallistview"` (the same with `setItemCount` + the `onAsyncGetItemHTML` event). All four are demonstrated in samples 11–14. Surface as *"the tag name is forwarded to the IDE's tool-window renderer, which understands the standard HTML tags plus the custom widget tags … see sample 11 / 12 / 13 / 14"*.
3. **`AddEventListener(DomEventName As String, CallbackFunc As LongPtr, Optional Data As Variant)`.** The callback is passed as `AddressOf SomeSub`, and `SomeSub` must have the signature `Sub(ByVal eventInfo As HtmlEventProperties)`. The `eventInfo` parameter is the IDE-marshalled equivalent of the JavaScript `Event` object — `eventInfo.key` / `eventInfo.target.value` / `eventInfo.target.id` are the usual fields, but again the property names are resolved against the *actual* event object at run time, not declared statically. Sample 13 also demonstrates **custom event names raised from inline HTML** via the IDE-side `raiseEvent("name", event, stopPropagation, …customData)` JavaScript helper; the custom-data values become `eventInfo.customData0`, `eventInfo.customData1`, … and are demonstrated in sample 15's `ClickedMatch` handler. Sample 14 demonstrates **async events** via `eventInfo.setAsyncResult("<html>")` (the listener returns the requested HTML asynchronously back into the virtual list view's render cycle).

Document the four `Html*` classes as the *contract* (`Item` default member, the `Value` accessor, the `Properties` chaining) and use the samples to illustrate the dynamic-resolution mechanism. Do not try to enumerate the resolved property surface — it's open-ended.

The `HtmlEvent*` half of the quartet declares `Value` as **read-only Get** (vs `HtmlElementProperty`'s `Value` which has Get + Let) — that's the contract distinction between an inbound event payload and an outbound DOM property setter. Note this on each page.

#### ToolWindow as a jQuery-style selector

`ToolWindow` is the *root* of a tool window's DOM and **also doubles as a member-by-ID accessor**: `myToolWindow("#dataEntry").Value` (see sample 13) returns the `Value` of the child element whose `id` is `dataEntry`. There is no explicit member on `IToolWindowV1` that takes a string argument — the source-side `RootDomElement` carries `[DefaultMember]`, so `myToolWindow("#dataEntry")` resolves to `RootDomElement.Properties.Item("#dataEntry")`, which the dynamic resolver then interprets as a CSS-style selector against the rendered DOM. Surface this as *"the tool window's default member is `RootDomElement`, which is COM-extensible — string indexing accepts CSS selectors"* and call out the `#id` (single element by ID) form as the most common case.

`ApplyCss(styles As String)` injects a `<style>` element scoped to the tool window. Samples 13 / 14 / 15 load CSS from an embedded resource via `StrConv(LoadResDataInternal("styles.css", "STYLESHEETS"), VbStrConv.vbFromUTF8)` and pass it through — surface that pattern on `ToolWindow.ApplyCss`.

`.RootDomElement.Properties.suggestedWidth = "350px"` and `.suggestedHeight = "600px"` are *one-shot* hints — they're used the **first time** the tool window opens as a floating window, then the IDE persists the user's resize. The source-side comments make this explicit (*"used on first opening as a floating tool window"*) — surface as a `> [!NOTE]` on the `ToolWindow.md` page.

#### `Project.Evaluate` — the debug-console hook

`Project.Evaluate(EvalString, Options)` runs an arbitrary expression in the project's context, as if the user typed it into the DEBUG CONSOLE. The `Options` parameter is `DebuggerEvaluateOptions` — currently a single-value enum (`NONE = 0`) declared on `IHostV1` itself, not on `IProjectV1`, which is an oddity worth noting. The return is `Variant`. Sample 10's `CurrentProjectKeyUp` handler shows it in action — entering `10.5 * 4` in a textbox and pressing Enter passes the string to `Evaluate` and pops up the result in a message box. Surface as *"this is the same engine that powers the DEBUG CONSOLE; it can call any `Public` symbol the user can see at run time"*.

The reason `DebuggerEvaluateOptions` is declared on `IHostV1` rather than `IProjectV1` looks like a source-side oversight (the only consumer is `IProjectV1.Evaluate`) — surface the enum on the `Host.md` page (where it's declared) and link to it from the `Project.Evaluate` entry, rather than rationalising the layout.

#### `Project.LoadMetaData` / `SaveMetaData`

Per-addin persistent key/value storage inside the `.twinproj` file. `LoadMetaData(Key) As String`, `SaveMetaData(Key, Value)`. Surface as *"the storage is associated with the loaded project, not with the addin globally — close the project, the storage goes with it; open a different project, you get a different store. For addin-wide persistence (e.g. checkbox state across all projects), use VBA's `GetSetting` / `SaveSetting` against the registry — see sample 15 for that pattern."*

#### `Host.ShowMessageBox` and `Host.ShowNotification`

Both are on `IHostV1`.

- `ShowMessageBox(Prompt, Buttons, Title) As Long` — modal. `Buttons` is a single string with button captions delimited by `|`, e.g. `"OK"` or `"Yes|No|Cancel"`. Return is the zero-based index of the pressed button, or `-1` if the box was closed without picking one. Sample 10's `ShowMessageBoxClick` demonstrates the three-button case and the `-1` close path together — surface as the canonical example.
- `ShowNotification(Prompt)` — non-modal, "discreet" toast-style notification.

The convention is that `ShowMessageBox` is for "user must answer something" and `ShowNotification` is for "user should know but doesn't need to react".

#### `Folder` for-each, thread-safety, and traversal

The source-side `[Description]` on `Folder.Count` says: *"CAREFUL: tb IDE is multi-threaded, and so the Count can potentially change after you've read the value. For example, using it for a loop counter is wrong, use For-Each syntax instead."* The matching `Item` carries an analogous warning: *"try to avoid accessing entries by their index positions since the index might change by another thread. Use the For-Each syntax instead."*

Surface this **as the primary fact** on `Folder.md` — the for-each path is the supported one; index-based iteration is technically supported (the methods exist) but races against the IDE's own background threads. Sample 15's `PopulateFolderResultsRecursive` is the canonical traversal pattern:

```tb
For Each folderItem In Folder
    If TypeOf folderItem Is Folder Then
        PopulateFolderResultsRecursive(folderItem, …)
    Else
        Dim file As File = folderItem
        If (file.Type <> FileOTHER) And (file.Type <> FileJSON) Then
            CheckAndPopulateTextFileResults(file, …)
        End If
    End If
Next
```

— for-each yields each child as a `FileSystemItem`; `TypeOf … Is Folder` discriminates folder-vs-file; a folder gets recursed; a file gets a `Type` check against `FileSystemItemType` to skip non-text content before reading it.

`Folder.IsPackagesFolder` returns `True` for the magic Packages folder at the project root — sample 15 uses it to skip package-internal sources when the user has "Search in packages" off. Surface as a usage hint on `Folder.IsPackagesFolder`.

#### `File.ReadText` flags

`IFileV2.ReadText(Options As ReadTextFlags) As String` — the V2-only "text view of the file, with options" accessor. Currently one flag: `CommentsToWhitespace` (replace every byte that's part of a comment with a space, preserving line numbers + column positions). Sample 15 uses it for the "exclude comments" search option. Surface as *"call `ReadText(0)` for raw text, `ReadText(ReadTextFlags.CommentsToWhitespace)` to mask comments out — the line/column positions of every non-comment character are preserved, which makes the flag suitable for indexers"*.

`Text` and `Data` (on `IFileV1`) have `Property Let` declarations tagged `[Unimplemented]` — flag with the usual `> [!NOTE]` on each, pointing out that the file system is currently read-only from the addin's perspective.

`File.Type` values that the addin cares about, in practice:

- `FileTWIN` (`.twin`, Unicode UTF-8 source)
- `FileBAS` / `FileCLS` (ANSI-encoded VB6 source)
- `FileUIDESIGNER` (Unicode JSON — the designer surface for a Form)
- `FileJSON` (Unicode JSON — `Settings`, `.twinproj` data)
- `FileOTHER` (binary or unrecognised)
- `FileVIRTUALDOC` (read-only virtual document — surface as *"e.g. the placeholder documents the IDE shows for unrecognised file types"*)
- `Folder` (a `FileSystemItem.Type` of `0` — included in the enum because it's the per-item type discriminator)

`ReadText` works on every text type (`FileTWIN` / `FileBAS` / `FileCLS` / `FileVIRTUALDOC` / `FileUIDESIGNER` / `FileJSON`); calling it on `FileOTHER` is unsupported. Surface on the method entry.

#### `CodeEditor.AddMonacoWidget` and `ExecuteMonacoCommand`

`CodeEditor` is the editor-pane subtype; the source-side comment on `IEditorV1` says *"Castable to CodeEditor etc."* — i.e. an `Editor` returned from `Host.ActiveEditors(0)` is actually a `CodeEditor` for code panes, and `Dim ce As CodeEditor = activeEditor` (or `TypeOf editor Is CodeEditor`) is the cast pattern. Sample 15's `GetActiveCodeEditorSelectedText` demonstrates the guarded cast:

```tb
If Host.ActiveEditors.Count > 0 Then
    If TypeOf Host.ActiveEditors(0) Is CodeEditor Then
        Dim activeCodeEditor As CodeEditor = Host.ActiveEditors(0)
        Return activeCodeEditor.SelectedText
    End If
End If
```

Surface as the canonical safe-cast pattern on `CodeEditor.md`.

`ExecuteMonacoCommand(Command As String, ParamArray Args())` sends a raw command to the underlying Monaco editor — e.g. `"actions.find"` opens the Find widget, `"closeFindWidget"` closes it (sample 10). The full list of Monaco commands is in Monaco's own documentation; the docs reference that without trying to enumerate.

`AddMonacoWidget(LineNumber, ColumnNumber, Html, Optional Css) As HtmlElement` attaches an inline HTML overlay to a line of code; if `ColumnNumber` is zero, the widget is rendered below the line and the editor scrolls to make room rather than overlapping the next line. The return value is a normal `HtmlElement` — the same `Properties` / `ChildDomElements` / `AddEventListener` surface applies. Surface as *"the same DOM surface as a tool-window's elements; the widget lives inside the code editor but otherwise behaves identically"*.

`CodeEditor.SelectedText` (Get + Let), `Text` (Get + Let), `GetSelectionInfo(ByRef StartLine, ByRef StartColumn, ByRef EndLine, ByRef EndColumn)`, `SetSelectionInfo(...)`, `RevealRange(... SmoothScroll, Area As RevealArea)` — all straightforward. The `RevealArea` enum is nested on `ICodeEditorV1` itself (six values: `Any` / `Top` / `Center` / `CenterIfNotVisible` / `NearTop` / `NearTopIfNotVisible`) — fold onto the `CodeEditor.md` page rather than spinning off a separate enum file.

#### `KeyboardShortcuts.Add` callback signature

The `keyString` argument is a literal key with optional `{CTRL}` / `{SHIFT}` / `{ALT}` prefixes, e.g. `"{CTRL}{SHIFT}d"` (the source-side `[Description]` is the canonical example). The `Callback` is `AddressOf` an addin function; the function takes no arguments and returns nothing. Surface as *"the callback fires on the IDE's UI thread; do everything Host-related synchronously"*.

The samples don't actually use `KeyboardShortcuts.Add` — that's a feature documented through its declaration only. Cross-link to the relevant Win32 / IDE keyboard-handling section once available.

#### `Themes.ActiveThemeNameGroup` and `OnChangedTheme`

`Themes` is two members: `ActiveThemeName` (the specific theme — `"Classic"`, `"Dark"`, `"Light"`, …) and `ActiveThemeNameGroup` (which collapses to `"dark"` or `"light"`). The grouping is useful for addins that just want to invert colours.

The `Host` event `OnChangedTheme(ThemeName As String)` fires when the user picks a new theme — the parameter is the new value of `ActiveThemeName`. Surface the pair as *"check `ActiveThemeNameGroup` once at startup for initial colour selection, then refresh in `OnChangedTheme`"*.

#### Sample-by-sample idioms to surface

Each sample exercises a different slice. Pick which idioms surface where:

- **Sample 10 (kitchen sink)** — the canonical "Hello, World" structure: `Private WithEvents Host As Host` + a `Host_OnProjectLoaded` handler that sets up the toolbar via `Host.Toolbars(0).AddSplitter()` + `.AddButton(...)`. **Every** sample uses this. Surface as the canonical addin-startup pattern on `Host.md` (and on the index landing).
- **Sample 10 (DOM walkthrough)** — the bulk of the file is a single `Button_OnClick` that builds a vertical-flex tool window populated with 22 styled "buttons" (each one a `div` with click handlers), exercising `.style.display = "flex"`, `.style.flexDirection = "column"`, `.style.gap`, `.style.backgroundImage` with a linear-gradient, `.style.borderRadius`, `.style.cursor = "pointer"`, etc. Surface as a *cross-link* from `HtmlElement.md` / `HtmlElementProperties.md` / `ToolWindow.md` rather than as primary content — the file is too long to inline.
- **Sample 11 (AddinTimer + chartjs)** — the canonical `AddinTimer` example AND the canonical custom-element example. Surface on `AddinTimer.md` as the timer example; cross-link to `HtmlElement.md` for the `"chartjs"` custom-element note.
- **Sample 12 (monaco editor)** — the in-window Monaco editor example. Surface the *"add event handlers to the editor, not the DOM element"* fact (`.editor.AddEventListener("onDidChangeModelContent", …)` not `monacoDivElement.AddEventListener(…)`) as a `> [!IMPORTANT]` on `HtmlElement.AddEventListener`. Cross-link to `CodeEditor.md` so the reader understands the two ways Monaco surfaces: built-in code editor via `CodeEditor`, embedded user-controlled editor via a `"monaco"` tag.
- **Sample 13 (listview + raiseEvent)** — surface as the canonical `ApplyCss` + `myToolWindow("#dataEntry")`-selector example. The inline HTML `raiseEvent("dataEntryKeyDown", event, true)` JS-side helper is what brings custom event names to the addin via `AddEventListener` — surface as a cross-link from `HtmlElement.AddEventListener` to a brief explanation on the `HtmlEventProperties` page. The IDE-side JS helper is documented as *"available to inline HTML inside an addin's tool window: `raiseEvent(eventName, event, stopPropagation, …customData)`"* — it has no twinBASIC declaration.
- **Sample 14 (virtual listview)** — the canonical async-event example. `onAsyncGetItemHTML` fires with `eventInfo.asyncArgument` (the row index the IDE wants HTML for) and the handler responds via `eventInfo.setAsyncResult("<html>")`. `listview.notifyChangedItem(idx)` invalidates the IDE's internal cache so the next render calls `onAsyncGetItemHTML` again. Surface on `HtmlEventProperties.md` as the asynchronous-event-handler pattern.
- **Sample 15 (Global Search addin)** — the canonical end-to-end addin: FS traversal (`Folder` for-each + `TypeOf … Is Folder` recursion), text reading with comment-stripping (`File.ReadText(ReadTextFlags.CommentsToWhitespace)`), editor navigation (`Host.ActiveEditors.Open(path, line, col)` + `.Item(0).SetFocus`), persistent options (registry-side via `GetSetting` / `SaveSetting`, **not** via `Project.SaveMetaData` — flag the difference). The dwell-time pattern (`SetTimer` / `KillTimer` directly from Win32 to debounce keystrokes) is a *"could have used `AddinTimer`"* alternative — surface both options on `AddinTimer.md`.

#### Layout decision — flat, one page per CoClass / Class

Twenty-five pages total — landing + 24 type pages:

```
docs/Reference/tbIDE/
  index.md                ← package landing; addin model + build setup + entry point + class groupings + sample list
  AddIn.md                ← the contract: Property Get Name
  AddinTimer.md           ← the one concrete instantiable class
  Button.md
  CodeEditor.md           ← + RevealArea enum + AddMonacoWidget + ExecuteMonacoCommand
  DebugConsole.md
  Editor.md               ← + cast-to-CodeEditor pattern
  Editors.md              ← + EditorOpenOptions enum
  File.md                 ← V1 + V2 folded; ReadTextFlags enum
  FileSystem.md
  FileSystemItem.md       ← + FileSystemItemType enum
  Folder.md               ← + for-each idiom + IsPackagesFolder
  Host.md                 ← + ItbHostEventsV1-V3 events folded + DebuggerEvaluateOptions enum + ShowMessageBox / ShowNotification
  HtmlElement.md          ← + DOM model + AddEventListener
  HtmlElementProperties.md ← + dynamic-resolution note
  HtmlElementProperty.md  ← + chained access
  HtmlElements.md         ← + custom-element-tag note
  HtmlEventProperties.md  ← + async-event pattern (setAsyncResult) + customData fan-out
  HtmlEventProperty.md
  KeyboardShortcuts.md
  Project.md              ← + VbBuildType enum + Evaluate + LoadMetaData / SaveMetaData
  Themes.md
  ToolWindow.md           ← + ApplyCss + suggested-size + jQuery-style selector via the default member
  ToolWindows.md
  Toolbar.md
  Toolbars.md
```

All flat — no `Enumerations/` sub-folder; the four nested enums (`RevealArea`, `EditorOpenOptions`, `ReadTextFlags`, `FileSystemItemType`, `VbBuildType`, `DebuggerEvaluateOptions`) each live on their declaring class's page rather than getting their own file. The package is small enough that the navigation reads better with no second level.

**Naming:**

- Folder / URL segment: `tbIDE/` (the source-side `project.name` is exactly `tbIDE`; no `Package` suffix to drop because the package isn't named with it — same as `WinEventLogLib` / `WinNamedPipesLib` / `WinServicesLib`).
- Index title: `tbIDE Package` — the `<Name> Package` convention.
- Permalinks: `/tB/Packages/tbIDE/` for the landing; `/tB/Packages/tbIDE/<Class>` for each child.
- `parent: tbIDE Package` on every child page (matching the index `title:`).

**License:** MIT (copyright Wayne Phillips T/A iTech Masters, 2022) — same situation as WebView2Package, Assert, CustomControls, CEF, and the three winlibs. Pages are fully original content; **omit** the `vba_attribution: true` flag.

### WinNativeCommonCtls

The package's `Settings` describes it as the *"twinBASIC - Common Controls Compatibility Package"* — a VB6-compatible replacement for **Microsoft Common Controls 6.0** (`MSCOMCTL.OCX`), written on top of the Win32 ComCtl32 controls (`COMCTL32.DLL` / `MSFTEDIT.DLL`). It ships eight controls that mirror the MSCOMCTL surface name-for-name where possible. The package was first released v0.0.1.0 on 18-FEB-2023 and is independent of (but co-versioned with) the VB compatibility package.

Layout of `..\tb-export\NewProject\Packages\WinNativeCommonCtls\Sources\` — two sub-folders:

- `CONTROLS\` — one `.twin` per control. Each file declares two classes: the heavy `<Name>BaseCtl` (where every event / method / property is implemented, tagged `[COMCreatable(False)]` + `[EventsUseDispInterface]`) and the thin `<Name>` leaf (`Inherits <Name>BaseCtl`, tagged `[WindowsControl("/miscellaneous/ICONS??/<Name>??.png")]`). The leaf adds only a `Class_BeforeFirstMethodAccess` that calls `[_HiddenModule].EnsureContainerIsLoaded(Me)` — same `<Name>BaseCtl` / `<Name>` leaf split that CEF and the VB controls use.
- `SUPPORT\` — the sub-object classes (`ListItem` / `ListItems`, `ColumnHeader` / `ColumnHeaders`, `Node` / `Nodes`, `ListImage` / `ListImages`), the per-control `<Name>Consts.twin` modules holding Win32 SDK plumbing (with a small minority of user-facing enums mixed in), the `Interfaces.twin` private interfaces, the design-time `ImageListPropertyPage` form, and a couple of private helper modules.

Eight controls (one `.twin` per pair):

| File              | `<Name>BaseCtl` inherits        | Role                                                                                          |
|-------------------|---------------------------------|-----------------------------------------------------------------------------------------------|
| `DTPicker.twin`   | `VB.BaseControlFocusable`       | Date / time picker — calendar drop-down, single-date `Value`, custom format strings           |
| `ImageList.twin`  | `VB.BaseControlNotFocusable`    | Off-screen image collection — feeds `ListView` / `TreeView` icons via `Icons` / `ImageList` properties |
| `ListView.twin`   | `VB.BaseControlFocusable`       | Multi-column list — four `View` modes (Icon / SmallIcon / List / Report), label-edit, checkboxes |
| `MonthView.twin`  | `VB.BaseControlFocusable`       | Full-month calendar grid — multi-select, bold-day callbacks, week-number / today display      |
| `ProgressBar.twin`| `VB.BaseControlNotFocusable2`   | Standard / Smooth / Marquee progress indicator with three visual states (Normal / Error / Paused) |
| `Slider.twin`     | `VB.BaseControlFocusableNoFont` | Trackbar / slider — tick marks, range selection, vertical or horizontal orientation           |
| `TreeView.twin`   | `VB.BaseControlFocusable`       | Hierarchical tree of `Node` objects — sorting, label-edit, checkboxes, image lists            |
| `UpDown.twin`     | `VB.BaseControlFocusableNoFont` | Spin control (up / down arrows) — pure Increment / Min / Max / Value; no auto-buddy binding   |

Every `<Name>BaseCtl` carries `[WithDispatchForwarding] Implements Control` (where `Control` is `Private Interface` in `Interfaces.twin`, marked `[COMExtensible]` — essentially an `Object` alias that makes the dispatch forwarding behave). They also implement a chorus of `VB.IWindowsControl`, `VB.IWindowElementEventsCommon`, `VB.IWindowElementEventsCommonControls`, `VB.IWindowElementEventsUC`, `VB.IWindowElementEventsAX` — these are the VB-package event-dispatch interfaces; do **not** surface them on the docs. Each control also implements one private `Tb<Name>Private` interface (declared `[ComImport(True)]` inside the same `.twin`) that the package's collection sub-objects use to refcount and reach internal state without taking a strong reference; **no doc page** for those.

#### Public user-facing surface

The eight leaf classes `DTPicker`, `ImageList`, `ListView`, `MonthView`, `ProgressBar`, `Slider`, `TreeView`, `UpDown` are what user code references at design time (via `[WindowsControl(...)]`) and at run time (`Dim lv As ListView`). The `<Name>BaseCtl` base classes are the implementation half — `[COMCreatable(False)]` and not user-instantiable, but **the entire user-visible surface is declared on them**. Document on the leaf's name (`ListView.md`), describe the full surface, and don't surface the `<Name>BaseCtl` split.

The package also surfaces eight sub-object classes — collection plus item:

| Class           | Reached via                                              | Notes                                                                              |
|-----------------|----------------------------------------------------------|------------------------------------------------------------------------------------|
| `ListImages`    | `ImageList.ListImages` (Get-only)                        | Enumerable; `Item(Index or Key)` default member; `Add`, `Remove`, `Clear`, `Exists` |
| `ListImage`     | element of `ListImages` (returned from `Add`, indexed)   | `Index` (read-only), `Key`, `Picture`, `Tag`, plus `Draw(hDC, x, y, Style)` and `ExtractIcon` |
| `ListItems`    | `ListView.ListItems` (Get-only)                          | Enumerable; `Item(Index or Key)` default member; `Add`, `Remove`, `Clear`          |
| `ListItem`     | element of `ListItems`                                   | `Text` (default), `SubItems(Index)`, `Icon`, `SmallIcon`, `Checked`, `Selected`, `Ghosted`, `Bold`, `BackColor`, `ForeColor`, `Tag`, `ToolTipText`, `EnsureVisible`, `Left` / `Top` / `Width` / `Height`, `Index` (RO), `Key`, `CreateDragImage` (`[Unimplemented]`) |
| `ColumnHeaders` | `ListView.ColumnHeaders` (Get-only)                      | Same shape as `ListItems`; `Add(Index, Key, Text, Width, Alignment, Icon)` returns `ColumnHeader` |
| `ColumnHeader`  | element of `ColumnHeaders`                               | `Text` (default), `Width`, `Left` (RO), `Alignment` (typed `ListColumnAlignmentConstants`), `Position`, `SubItemIndex`, `Icon`, `Index` (RO), `Key`, `Tag` |
| `Nodes`        | `TreeView.Nodes` (Get-only)                              | Enumerable; `Item(Index or Key)` default; `Add(Relative, Relationship, Key, Text, Image, SelectedImage)` returns `Node` |
| `Node`         | element of `Nodes`                                       | `Text` (default), `Parent`, `Child`, `Next`, `Previous`, `Root`, `FirstSibling`, `LastSibling`, `Children` (count), `Expanded`, `Selected`, `Checked`, `Bold`, `BackColor`, `ForeColor`, `Image`, `SelectedImage`, `Tag`, `FullPath`, `Visible` (RO), `Sorted`, `SortOrder`, `SortType`, `EnsureVisible`, `Index` (RO), `Key` |

Every sub-object is `[COMCreatable(False)]` — its constructor takes a `<Name>BaseCtl` reference, so user code never instantiates these directly. They are returned from container methods (`Add`, `Item`) and reached through container properties.

Container cross-references (typed as the `<Name>BaseCtl` parent, since the controls accept either the base or the leaf — but document the parameter as the **leaf**):

- `TreeView.ImageList` / `Let` / `Set` — typed `As ImageListBaseCtl`; the user assigns an `ImageList`.
- `ListView.Icons` / `Let` / `Set`, `ListView.SmallIcons` / `Let` / `Set`, `ListView.ColumnHeaderIcons` / `Let` / `Set` — all three typed `As ImageListBaseCtl`; the user assigns an `ImageList`.

`ListView.BorderStyle` is unusually typed `As TreeBorderStyleConstants` (declared in `TreeViewPublic`, not in a `ListView*` module) — the enum is shared across both controls. Surface this on the `BorderStyle` entry without trying to rationalise it.

#### Per-control highlights

These are the points worth surfacing on each control's page that are *not* obvious from a flat property list:

- **DTPicker** — the only control where most behaviour is in the calendar drop-down, not the inline display. The `Calendar*` colour properties (`CalendarBackColor`, `CalendarForeColor`, `CalendarTitleBackColor`, `CalendarTitleForeColor`, `CalendarTrailingForeColor`) act on the dropped-down month grid via `DTM_SETMCCOLOR`. `Format` (`DTPickerFormatConstants`) chooses between long-date / short-date / time / custom; when set to `dtpCustom`, the picker pulls `CustomFormat` (a `GetDateFormat`-style picture string). The control exposes `Year` / `Month` / `Week` / `Day` / `Hour` / `Minute` / `Second` accessors that decompose the current `Value`. `Value` is `Variant` — it can be `Null` (no date selected) when `CheckBox = True` and the user unchecks the box. Events `Format`, `FormatSize`, `CallbackKeyDown` fire when `Format = dtpCustom` and the format string contains a callback token.
- **ImageList** — purely off-screen; `Visible` does nothing user-meaningful (it's a "store of pictures" control). The `ImageWidth` / `ImageHeight` properties are read/write **only while empty** — once any image is added, the setter raises run-time error 35611 (*"Property is read-only if image list contains images"*). `ColorDepth` is fixed at construction time. `MaskColor` + `UseMaskColor = True` makes the masked pixels transparent when rendered into a control that consumes the image list. `Overlay(Key1, Key2)` composes two list-images into a single `StdPicture`. Bound-count tracking: an `ImageList` cannot be modified (clear / remove) while any control has it bound as `Icons` / `SmallIcons` / `ColumnHeaderIcons` / `ImageList`, throwing error 35617.
- **ListView** — the largest of the eight. `View` switches the visual mode (`lvwIcon` / `lvwSmallIcon` / `lvwList` / `lvwReport`); `Arrange` (`lvwNone` / `lvwAutoLeft` / `lvwAutoTop`) auto-flows the icon mode; `Report` mode is the only one that shows the `ColumnHeaders`. `LabelEdit` defaults to `lvwAutomatic` — F2 / click-and-wait edits a label in place; `lvwManual` requires `StartLabelEdit()` and `lvwDisabled` blocks editing. `TextBackground` (`lvwTransparent` / `lvwOpaque`) acts on the *item* text rendering, not the control's `BackColor`. `MultiSelect = True` enables Ctrl+click / Shift+click range selection. `CheckBoxes = True` adds a leading checkbox per row and fires `ItemCheck`. `AllowColumnReorder` only matters in Report view. `BorderStyle` is `TreeBorderStyleConstants` (`ccNone` / `ccFixedSingle`). The control surfaces `hWnd` and `hWndHeader` (the embedded `SysHeader32` window) separately. `Scroll` is `[Unimplemented]` per the source. `GetFirstVisible() As ListItem`, `SelectedItem` / `SelectedItemIndex` — the latter is read-only (assign through `ListItem.Selected = True` instead).
- **MonthView** — `MonthColumns` / `MonthRows` lay out a grid of side-by-side month panels (`ResizeToFit` auto-sizes the control to fit them). `Day` / `Month` / `Week` / `Year` are the same decomposition pattern as DTPicker. `MaxSelCount` is the upper bound of a multi-day selection (default 7, max ≈ 366 per the Win32 control); `SelStart` and `SelEnd` are the inclusive range. `MinDate` / `MaxDate` bound the navigable range. `Value` is the *current selection's start date* (same as `SelStart` when `MultiSelect = False`). The control fires both `Click` (any click) and `DateClick` (only when a date cell is hit, with the date passed as a parameter); same split for `DblClick` / `DateDblClick`. `GetDayBold` is an event-driven callback — the control fires it for each visible month asking for a `State()` array of which days to render bold; this is the mechanism for highlighting holidays, schedule entries, etc. `DayBold` is an alternative per-date setter. `GetMonthRange(IncludeTrailing, StartDate, EndDate)` returns the visible date span.
- **ProgressBar** — three orthogonal axes. `Min` / `Max` / `Value` are the standard range. `Step` + `StepIt()` advances the bar by `Step` units (typical loop pattern: `Min = 0`, `Max = N`, then `StepIt()` per iteration). `Scrolling = PrbScrollingStandard` (default) animates the bar in segments; `PrbScrollingSmooth` is the continuous block; `PrbScrollingMarquee` is the indeterminate animation (drive with `MarqueeAnimation = True` + `MarqueeSpeed`). `State` (`PrbStateNormal` / `Error` / `Paused`) tints the bar red / yellow per the OS theme. `Orientation` is `PrbOrientation` (`Horizontal` / `Vertical`). The control has `Click` / `DblClick` / `Mouse*` events but **no** `Change` despite the declaration — verify with the source if surfaced (`Change` is declared in the events region but not fired by any Win32 progress-bar notification).
- **Slider** — `Min` / `Max` / `Value` like a scrollbar; `SmallChange` is the arrow-key step, `LargeChange` is the PgUp / PgDn step. `SelStart` + `SelLength` create a highlighted selection range (visible when `SelectRange = True`). `TickFrequency` controls how often tick marks appear; `TickStyle` (`sldBottomRight` / `sldTopLeft` / `sldBoth` / `sldNoTicks`) chooses which side(s) of the channel they render on. `TextPosition` (`sldAboveLeft` / `sldBelowRight`) is for the optional tip text. `HideThumb = True` removes the draggable indicator. `ShowTip = True` enables the floating tooltip showing the current value during drag. `Orientation` is `OrientationConstants` (the shared horizontal / vertical enum used also by `UpDown`).
- **TreeView** — the second-largest control. `Style` (`TreeStyleConstants`, 8 values) is a composite of *show / hide* flags for tree-lines / plus-minus boxes / icons / text — the values name what's shown. `LineStyle` chooses `tvwRootLines` (lines from root nodes) or `tvwTreeLines` (lines only from children). `Sorted` / `SortOrder` / `SortType` apply at the root level; each `Node` has its own per-subtree `Sorted` / `SortOrder` / `SortType`. `LabelEdit` is the same gating as `ListView.LabelEdit` (`tvwAutomatic` / `Manual` / `Disabled`). `CheckBoxes = True` adds per-node checkboxes; `FullRowSelect` extends the selection highlight across the full row width. `Indentation` is in twips. `HitTest(x, y)` returns the `Node` at a point (for hover effects, drag-drop). `SelectedItem` (`Get` / `Let` / `Set`) and `DropHighlight` (`Get` / `Let` / `Set`) are both `Node`-typed. `StartLabelEdit()` for `Manual` mode. `GetVisibleCount()` returns how many full nodes the visible area shows. `Scroll` event new to tB.
- **UpDown** — pure spin control: `Min` / `Max` / `Value` / `Increment`. `Orientation` is `OrientationConstants` (horizontal pair of arrows or vertical, the more common). Events are `Change` (any time `Value` changes), `UpClick`, `DownClick`. There is *no* auto-buddy / partner-control facility in this version (the Win32 `UDS_AUTOBUDDY` flag is in the source enums but not exposed) — user code wires `UpClick` / `DownClick` to update the partner control manually.

Common surface across every control: `Public Opacity As Double = 100` (with the *"REQUIRES TARGET OS 6.2+ FOR CHILD CONTROLS."* description), `Public TransparencyKey As OLE_COLOR = -1` (same OS requirement), and (where `FEATURE_OLEDRAGDROP` is enabled at compile time) `Public OLEDropMode As VBRUN.OLEDropConstants` plus the `OLECompleteDrag` / `OLEDragDrop` / `OLEDragOver` / `OLEGiveFeedback` / `OLESetData` / `OLEStartDrag` events. `Public OLEDrag()` method on every control. `Public Property Get Parent() As Object` and `Public Property Get Object() As Object` on every control. The inherited surface from `VB.BaseControl*` includes `Name`, `Left`, `Top`, `Width`, `Height`, `Anchors`, `Dock`, `Visible`, `Enabled`, `BackColor` / `ForeColor` / `Font` (where focusable), `Appearance`, `MousePointer` / `MouseIcon`, `ToolTipText`, `DragMode` / `DragIcon`, `Drag()`, `Refresh()`, `SetFocus()` (focusable variants), `ZOrder()`, `CausesValidation`, `TabIndex` / `TabStop` (focusable variants), `VisualStyles`, `hWnd`, `HelpContextID` / `WhatsThisHelpID`. Walk the relevant `Inherits VB.BaseControl*` chain in `..\tb-export\NewProject\Packages\VB\Sources\BASE\` to enumerate exactly what each control's variant adds.

#### Per-control nested enums (fold onto the declaring control's page)

These enums are declared *inside* each `<Name>BaseCtl` (`Enum <Name>` without `Public`, which still surfaces because the enclosing class is public). Following the CustomControls convention for `WaynesSlider.SliderDirection`, document each on its declaring control's page rather than under `Enumerations/`:

| Enum                            | Declared on                | Members                                                                       |
|---------------------------------|----------------------------|-------------------------------------------------------------------------------|
| `ImageListColorDepth`           | `ImageListBaseCtl`         | `ColorDepth4Bit = 4`, `ColorDepth8Bit = 8`, `ColorDepth16Bit = 16`, `ColorDepth24Bit = 24`, `ColorDepth32Bit = 32` |
| `ListViewConstants`             | `ListViewBaseCtl`          | `lvwIcon = 0`, `lvwSmallIcon = 1`, `lvwList = 2`, `lvwReport = 3`             |
| `ListArrangeConstants`          | `ListViewBaseCtl`          | `lvwNone = 0`, `lvwAutoLeft = 1`, `lvwAutoTop = 2`                            |
| `ListTextBackgroundConstants`   | `ListViewBaseCtl`          | `lvwTransparent = 0`, `lvwOpaque = 1`                                         |
| `ListLabelEditConstants`        | `ListViewBaseCtl`          | `lvwAutomatic = 0`, `lvwManual = 1`, `lvwDisabled = 2`                        |
| `ListColumnAlignmentConstants`  | `ColumnHeader`             | `lvwColumnLeft = 0`, `lvwColumnRight = 1`, `lvwColumnCenter = 2`              |
| `PrbOrientation`                | `ProgressBarBaseCtl`       | `PrbOrientationHorizontal = 0`, `PrbOrientationVertical = 1`                  |
| `PrbScrolling`                  | `ProgressBarBaseCtl`       | `PrbScrollingStandard = 0`, `PrbScrollingSmooth = 1`, `PrbScrollingMarquee = 2` |
| `PrbState`                      | `ProgressBarBaseCtl`       | `PrbStateNormal = 1`, `PrbStateError = 2`, `PrbStatePaused = 3`               |
| `TickStyleConstants`            | `SliderBaseCtl`            | `sldBottomRight = 0`, `sldTopLeft = 1`, `sldBoth = 2`, `sldNoTicks = 3`       |
| `TextPositionConstants`         | `SliderBaseCtl`            | `sldAboveLeft = 0`, `sldBelowRight = 1`                                       |

Source-side spelling note: every enum is named `<Name>` (no `Public` modifier) but the *member* names use the historical VB6 prefix conventions — `lvw` for ListView, `tvw` for TreeView, `sld` for Slider, `dtp` for DTPicker, `Prb` for ProgressBar, `cc` for cross-control. Mixed casing in member names (`SldAboveLeft` literal in the source defaults vs `sldAboveLeft` declaration) is a source-side issue; surface members with the declared casing.

#### Module-level enums (under `Enumerations/`)

Five `<Name>Consts.twin` modules in `SUPPORT/` carry Win32 SDK plumbing (message IDs, notification IDs, style flags, Win32 types like `NMHDR` / `SYSTEMTIME` / `LVCOLUMNW`) **plus** a small fraction of user-facing enums. The plumbing is unreachable by user code (mostly inside `Private Module …Consts`); the user-facing enums are split into a separate `Public Module` (TreeView's clean case) or coexist with the plumbing in an effectively-public bare `Module` (the rest). Either way, surface only the user-facing enums:

| Enum                          | Declared in / module                                       | Members                                                              |
|-------------------------------|------------------------------------------------------------|----------------------------------------------------------------------|
| `DTPickerFormatConstants`     | `DTPickerConsts.twin` (module `DTPickerConsts`)            | `dtpLongDate = 0`, `dtpShortDate = 1`, `dtpTime = 2`, `dtpCustom = 3` |
| `TreeBorderStyleConstants`    | `TreeViewConsts.twin` (`Public Module TreeViewPublic`)     | `ccNone = 0`, `ccFixedSingle = 1`                                    |
| `TreeLabelEditConstants`      | `TreeViewConsts.twin` (`TreeViewPublic`)                   | `tvwAutomatic = 0`, `tvwManual = 1`, `tvwDisabled = 2`               |
| `TreeLineStyleConstants`      | `TreeViewConsts.twin` (`TreeViewPublic`)                   | `tvwTreeLines = 0`, `tvwRootLines = 1`                               |
| `TreeStyleConstants`          | `TreeViewConsts.twin` (`TreeViewPublic`)                   | 8 members: `tvwTextOnly`, `tvwPictureText`, `tvwPlusMinusText`, `tvwPlusMinusPictureText`, `tvwTreelinesText`, `tvwTreelinesPictureText`, `tvwTreelinesPlusMinusText`, `tvwTreelinesPlusMinusPictureText` |
| `TreeRelationshipConstants`   | `TreeViewConsts.twin` (`TreeViewPublic`)                   | `tvwFirst = 0`, `tvwLast = 1`, `tvwNext = 2`, `tvwPrevious = 3`, `tvwChild = 4` |
| `TreeSortOrderConstants`      | `TreeViewConsts.twin` (`TreeViewPublic`)                   | `tvwAscending = 0`, `tvwDescending = 1`                              |
| `TreeSortTypeConstants`       | `TreeViewConsts.twin` (`TreeViewPublic`)                   | `tvwBinary = 0`, `tvwText = 1`                                       |
| `OrientationConstants`        | `Misc.twin` (`Private Module Miscellaneous`)               | `ccOrientationHorizontal = 0`, `ccOrientationVertical = 1` — used by both **Slider** and **UpDown** |
| `ImlDrawConstants`            | `ImageListConsts.twin` (`Private Module ImageListConsts`)  | `ImlDrawNormal = 1`, `ImlDrawTransparent = 2`, `ImlDrawSelected = 4`, `ImlDrawFocus = 8`, `ImlDrawNoMask = 16` — flag combination; used as `[TypeHint(ImlDrawConstants)]` on `ListImage.Draw`'s `Style` parameter |

For `OrientationConstants` and `ImlDrawConstants` (declared `Public Enum` inside a `Private Module`): the enclosing module is unreachable by name from user code, but the enum members are reachable because they're tagged through `[TypeHint]` on the consuming method's parameter and are also surfaced by the IDE's "implicit member visibility" — i.e. user code writes `Slider1.Orientation = ccOrientationVertical` and `ListImage.Draw(hdc, 0, 0, ImlDrawTransparent Or ImlDrawSelected)`. Document the enum and don't worry about qualification — the user's call site never needs `Module.Enum.Member` form.

The remaining `<Name>Consts.twin` modules (`ImageListConsts`, `ListViewConsts`, `ProgressBarConsts`, `TreeViewConsts.TreeViewConsts` (the private half), `UpDownConsts`, `SliderConsts`, `MonthViewConsts`, `DTPickerConsts` non-`DTPickerFormatConstants` content) are package-internal — Win32 message IDs, style flags, notification structures (`NMHDR`, `NMLISTVIEW`, `NMDATETIMECHANGE`, …) that the controls use to talk to ComCtl32 but that the user never references. **No doc pages** for those; do not document `LVMessages`, `TVMessages`, `MonthViewMessages`, `SliderMessages`, `UpDownMessages`, `DTPickerMessages` and the associated `*Notifications` / `*Styles` enums.

#### Private classes (no doc page)

- `Private Class ListViewHeaderSubclasser` (in `ListView.twin`) — subclasses the embedded `SysHeader32` window to intercept `HDM_LAYOUT` notifications for the column-resize handler. Implementation detail.
- `Private Class TreeViewNodeCheckState` / `ListViewNodeCheckState` / `TreeViewNodeClick` / `TreeViewNodeDblClick` (in `TreeViewNodeCheckState.twin`) — four `IScheduledCallback`-implementing dispatch helpers that the controls schedule onto the message loop to fire `NodeCheck` / `ItemCheck` / `NodeClick` / `DblClick` events at the right point in the click-handling sequence. Same role as the `…Internal` classes in WinNamedPipesLib; no doc page.
- `Class ImageListPropertyPage` (in `ImageListPropertyPage.twin`) — `[FormDesignerId]` `[PredeclaredId]` `[COMCreatable(False)]` Form class that's the IDE's design-time property editor for `ImageList` (the "Custom Properties..." button). Invoked from `ImageListBaseCtl.HandleInvokePropertyExtension`. Pure design-time tooling, never appears at run-time; no doc page.
- `Private Interface Control` / `IScheduledCallback` / `ITwinBasicDesignerExtensions` (in `Interfaces.twin`) — internal interfaces. `Control` is the empty marker interface that `[WithDispatchForwarding]` resolves names through. No doc pages.
- `Private Module Miscellaneous` (in `Misc.twin`) — `StrPtrSafe`, `CommonTreeViewGetNodeFromHandle`, `SyncBorderStyle` — internal helpers. `OrientationConstants` does surface from this module (see above) but the module itself doesn't get a doc page.
- `Private Module ImagesHelper` (in `ImagesHelper.twin`) — `GetBitsPerPixelFromPic`. Internal helper. No doc page.
- `Private Module ImageListConsts`, `ListViewConsts`, `ProgressBarConsts`, `TreeViewConsts` (the private half), and the bare `Module DTPickerConsts` / `MonthViewConsts` / `SliderConsts` / `UpDownConsts` (effectively public but Win32-plumbing-only) — covered above; no per-module doc page.

#### `[Unimplemented]` and `[Hidden]` members to flag

- **DTPicker.RightToLeft** — tagged `[Unimplemented]`; flag with `> [!NOTE]`.
- **MonthView.RightToLeft** — same.
- **ListView.Scroll** event — tagged `[Unimplemented]`; flag on the event entry.
- **ListItem.CreateDragImage** — tagged `[Unimplemented]`; flag with `> [!NOTE]`.
- **ListImages.ControlDefault** — tagged `[Unimplemented]` and `[Hidden]`; **do not document** (`[Hidden]` means the IDE intentionally suppresses it).
- **ListView.AllowColumnReorder** — implemented but only takes effect in Report view; surface as a note on the property.

#### Doc-side layout (folders / files)

Twenty-eight pages total, mixing single-file controls with folder-style controls (used when the control has sub-object companion pages):

```
docs/Reference/WinNativeCommonCtls/
  index.md                                    ← landing; intro + control table + sub-object map + cross-references (VBRUN/ControlTypeConstants)
  DTPicker.md                                 ← single-file
  ImageList/index.md
  ImageList/ListImage.md
  ImageList/ListImages.md
  ListView/index.md
  ListView/ColumnHeader.md
  ListView/ColumnHeaders.md
  ListView/ListItem.md
  ListView/ListItems.md
  MonthView.md                                ← single-file
  ProgressBar.md                              ← single-file
  Slider.md                                   ← single-file
  TreeView/index.md
  TreeView/Node.md
  TreeView/Nodes.md
  UpDown.md                                   ← single-file
  Enumerations/index.md
  Enumerations/DTPickerFormatConstants.md
  Enumerations/ImlDrawConstants.md
  Enumerations/OrientationConstants.md
  Enumerations/TreeBorderStyleConstants.md
  Enumerations/TreeLabelEditConstants.md
  Enumerations/TreeLineStyleConstants.md
  Enumerations/TreeRelationshipConstants.md
  Enumerations/TreeSortOrderConstants.md
  Enumerations/TreeSortTypeConstants.md
  Enumerations/TreeStyleConstants.md
```

Decisions explained:

- **Folder-style for `ImageList/`, `ListView/`, `TreeView/`** — each has 2–4 sub-object companions (`ListImage` + `ListImages`; `ListItem` + `ListItems` + `ColumnHeader` + `ColumnHeaders`; `Node` + `Nodes`) that are 1:1 with the container. Same pattern as `CustomControls/WaynesButton/WaynesButtonState.md`. Each container's index page covers the control's surface; the sub-pages cover the collection / item details.
- **Single-file for the remaining five controls** (`DTPicker.md`, `MonthView.md`, `ProgressBar.md`, `Slider.md`, `UpDown.md`) — no sub-objects to host. Surface large but flat. Same shape as `WebView2/WebView2Request.md` or `CheckBox.md`.
- **`Enumerations/` folder** for the 10 module-level / shared enums. Per-control nested enums (the 11 in the table above) fold onto their declaring control's page.
- **No `Types/` folder** — every `Public Type` in the package (the Win32-flavoured `NMHDR`-derived notification structures, `SYSTEMTIME`, `LVITEMW`, etc.) is internal-only; nothing user-facing matches the WebView2 `COREWEBVIEW2_PHYSICAL_KEY_STATUS` precedent.

#### Naming

- Folder / URL segment: `WinNativeCommonCtls/` (matches the source-side package name; no `Package` suffix to drop, same as the three winlibs and tbIDE).
- Index title: `WinNativeCommonCtls Package` — the `<Name> Package` convention.
- Permalinks: `/tB/Packages/WinNativeCommonCtls/` for the landing; `/tB/Packages/WinNativeCommonCtls/<Class>` for single-file control pages (`DTPicker`, `MonthView`, `ProgressBar`, `Slider`, `UpDown`); `/tB/Packages/WinNativeCommonCtls/<Container>/` and `/tB/Packages/WinNativeCommonCtls/<Container>/<SubObject>` for the folder-style controls (`ImageList/`, `ListView/`, `TreeView/`); `/tB/Packages/WinNativeCommonCtls/Enumerations/<Enum>` for each enum page.
- `parent: WinNativeCommonCtls Package` on every top-level child page. The enum pages set `parent: Enumerations` and `grand_parent: WinNativeCommonCtls Package` (the grouped-page pattern; same shape as the WebView2 / CEF / CustomControls / WinServicesLib `Enumerations/` directories). The sub-object pages set `parent: <Container>` and `grand_parent: WinNativeCommonCtls Package` (the same shape CustomControls uses for `WaynesButton/WaynesButtonState.md`).

#### Pre-existing cross-references on the site

- [`docs/Reference/VBRUN/Constants/ControlTypeConstants.md`](docs/Reference/VBRUN/Constants/ControlTypeConstants.md) already lists every control's `vb<Name>` constant: `vbProgressBar = 21`, `vbTreeView = 22`, `vbSlider = 26`, `vbUpDown = 27`, `vbDTPicker = 28`, `vbMonthView = 29`, `vbListView = 30`, `vbImageList = 31`. Each control's reference page should link back to its constant.
- [`docs/Reference/VBRUN/Constants/OLEDropConstants.md`](docs/Reference/VBRUN/Constants/OLEDropConstants.md) and the `OLEDragDrop` events are inherited surface — link the `OLEDropMode` entries to the constant.
- [`docs/Reference/Packages.md`](docs/Reference/Packages.md) — add a new bullet between `tbIDE Package` and the closing of the "Built-In Packages" list.

**License:** MIT (copyright Wayne Phillips T/A iTech Masters, 2023; first release v0.0.1.0 on 18-FEB-2023) — same situation as every other Wayne Phillips package. Pages are fully original content; **omit** the `vba_attribution: true` flag.

## Page template

Match the existing style. Worked examples to imitate:

- Core statement: `docs/Reference/Core/Const.md`, `docs/Reference/Core/Dim.md`, `docs/Reference/Core/Call.md`.
- VBA module function: `docs/Reference/VBA/Interaction/AppActivate.md`, `docs/Reference/VBA/Interaction/Beep.md`.
- VBA property with `Core/` redirect: `docs/Reference/VBA/DateTime/Date.md`.
- VBRUN module member: `docs/Reference/VBRUN/AmbientProperties/BackColor.md`, `docs/Reference/VBRUN/PropertyBag/index.md`.
- VB control class (single-file): `docs/Reference/VB/CheckBox.md`.
- VB control class (folder-style): `docs/Reference/VB/CheckMark/index.md`.
- Assert module page (single-file, all members inline): `docs/Reference/Assert/Exact.md`.
- CEF control class (folder-style with a sub-page): `docs/Reference/CEF/CefBrowser/index.md` + `docs/Reference/CEF/CefBrowser/EnvironmentOptions.md`.
- Generic class (single-file, `(Of T1, T2)`): `docs/Reference/WinEventLogLib/EventLog.md`.
- Folder-style control with collection sub-objects: pattern to follow for WinNativeCommonCtls's `ImageList/`, `ListView/`, `TreeView/` — `<Container>/index.md` for the control's own surface plus sibling `<Container>/<SubObject>.md` per collection / item. Mirror CustomControls's `WaynesButton/` + `WaynesButton/WaynesButtonState.md` shape.

Skeleton:

````markdown
---
title: <Symbol>
parent: <Statements | Procedures and Functions | <Mod> Module | <Package> Package>
# Pick the permalink that matches the section:
#   Core                       → /tB/Core/<Symbol>
#   VBA module                 → /tB/Modules/<Mod>/<Symbol>           (legacy URL scheme retained)
#   VBRUN module               → /tB/Packages/VBRUN/<Mod>/<Symbol>
#   VB class                   → /tB/Packages/VB/<Class>              (or /tB/Packages/VB/<Class>/ for folder-style)
#   WinNativeCommonCtls control → /tB/Packages/WinNativeCommonCtls/<Class> (single-file)
#                                  or /tB/Packages/WinNativeCommonCtls/<Container>/ (folder-style)
permalink: /tB/Core/<Symbol>
redirect_from:                          # only if relocated; e.g. moved from Core/ to a Module/
-  /tB/Core/<Symbol>
vba_attribution: true                   # omit for VB package pages (fully original content)
---
# <Symbol>
{: .no_toc }

<one-line description>

Syntax: **<Symbol>** [ *args* ]

*arg1*
: *required* | *optional*  description.

<remarks paragraphs>

### Example

This example...

```tb
' code
```

### See Also

- [Other](OtherSymbol)
````

Formatting conventions:

- `**...**` for keywords/literal tokens; `*...*` for placeholders/arguments.
- Code blocks use ` ```tb ` (the twinBASIC lexer registered in `docs/_plugins/twinbasic.rb`).
- Parameter lists use the kramdown `term` + `: definition` indentation pattern (NOT the MS-style markdown table).
- Set `vba_attribution: true` in the frontmatter on any page derived from VBA-Docs; omit it on fully original content (e.g. VB package pages). The flag drives an extra line in the site footer.

### Cross-section linking

Relative links resolve against the **rendered URL** (the page's `permalink:`), not the file path. Pages that share a URL folder can use bare names (`[Y](Y)`); crossing folders needs `../` to climb out.

The URL prefixes are *not* uniform across packages — VBA pages live one segment shallower than VBRUN pages, so cross-package links are asymmetric:

- Core statement → `/tB/Core/<Symbol>`
- VBA module member → `/tB/Modules/<Mod>/<Symbol>` (legacy scheme retained)
- VBRUN module member → `/tB/Packages/VBRUN/<Mod>/<Symbol>`
- VB class → `/tB/Packages/VB/<Class>`, or `/tB/Packages/VB/<Class>/` for folder-style classes (one extra segment)
- WebView2 class → `/tB/Packages/WebView2/<Class>` (or `/tB/Packages/WebView2/<Class>/` for folder-style — used by `WebView2/`)
- WebView2 enumeration → `/tB/Packages/WebView2/Enumerations/<Enum>` (one segment deeper than a class, parallel to VBRUN's `Constants/<Enum>`)
- Assert module → `/tB/Packages/Assert/<Mod>` (single-page-per-module; same depth as a single-file VB class)
- CustomControls control → `/tB/Packages/CustomControls/<Control>` (single-file) or `/tB/Packages/CustomControls/<Control>/` (folder-style — used by `WaynesButton/`, `WaynesForm/`, `WaynesGrid/`, `WaynesSlider/`, `WaynesTextBox/`)
- CustomControls style helper → `/tB/Packages/CustomControls/Styles/<Name>`
- CustomControls framework symbol → `/tB/Packages/CustomControls/Framework/<Name>`
- CustomControls enumeration → `/tB/Packages/CustomControls/Enumerations/<Enum>`
- CEF `CefBrowser` class → `/tB/Packages/CEF/CefBrowser/` (folder-style — has the `EnvironmentOptions` sub-page)
- CEF `EnvironmentOptions` sub-page → `/tB/Packages/CEF/CefBrowser/EnvironmentOptions`
- CEF enumeration → `/tB/Packages/CEF/Enumerations/<Enum>`
- WinEventLogLib class → `/tB/Packages/WinEventLogLib/EventLog` (single-file; same depth as a single-file VB class)
- WinEventLogLib module → `/tB/Packages/WinEventLogLib/EventLogHelperPublic` (single-file; same depth as an Assert module)
- WinNamedPipesLib class → `/tB/Packages/WinNamedPipesLib/<Class>` (single-file; same depth as a single-file VB class)
- WinServicesLib class / interface → `/tB/Packages/WinServicesLib/<Class>` (single-file; same depth as a single-file VB class)
- WinServicesLib enumeration → `/tB/Packages/WinServicesLib/Enumerations/<Enum>` (one segment deeper, parallel to WebView2 / CEF / CustomControls)
- tbIDE class / CoClass → `/tB/Packages/tbIDE/<Class>` (single-file; same depth as a single-file VB class — no `Enumerations/` sub-folder, the nested enums live on their declaring class's page)
- WinNativeCommonCtls control → `/tB/Packages/WinNativeCommonCtls/<Class>` (single-file — used by `DTPicker`, `MonthView`, `ProgressBar`, `Slider`, `UpDown`) or `/tB/Packages/WinNativeCommonCtls/<Container>/` (folder-style — used by `ImageList/`, `ListView/`, `TreeView/`, each carrying their sub-object companion pages)
- WinNativeCommonCtls sub-object → `/tB/Packages/WinNativeCommonCtls/<Container>/<SubObject>` (e.g. `ImageList/ListImage`, `ListView/ListItem`, `TreeView/Node`)
- WinNativeCommonCtls enumeration → `/tB/Packages/WinNativeCommonCtls/Enumerations/<Enum>` (one segment deeper, parallel to WebView2 / CEF / CustomControls / WinServicesLib)

Common patterns:

| From                                       | To                                          | Link                                       |
|--------------------------------------------|---------------------------------------------|--------------------------------------------|
| any page                                   | sibling in same URL folder                  | `[Y](Y)`                                   |
| VBA `Modules/<Mod>/X`                      | VBA `Modules/<OtherMod>/Y`                  | `[Y](../<OtherMod>/Y)`                     |
| VBA `Modules/<Mod>/X`                      | `Core/Y`                                    | `[Y](../../Core/Y)`                        |
| VBA `Modules/<Mod>/X`                      | VBRUN `Packages/VBRUN/<Mod>/Y`              | `[Y](../../Packages/VBRUN/<Mod>/Y)`        |
| VBA `Modules/<Mod>/X`                      | VB `Packages/VB/Y`                          | `[Y](../../Packages/VB/Y)`                 |
| VBA `Modules/<Mod>/X`                      | WebView2 `Packages/WebView2/Y`       | `[Y](../../Packages/WebView2/Y)`    |
| VBRUN `Packages/VBRUN/<Mod>/X`             | VBRUN `Packages/VBRUN/<OtherMod>/Y`         | `[Y](../<OtherMod>/Y)`                     |
| VBRUN `Packages/VBRUN/<Mod>/X`             | `Core/Y`                                    | `[Y](../../../Core/Y)`                     |
| VBRUN `Packages/VBRUN/<Mod>/X`             | VBA `Modules/<Mod>/Y`                       | `[Y](../../../Modules/<Mod>/Y)`            |
| VBRUN `Packages/VBRUN/<Mod>/X`             | WebView2 `Packages/WebView2/Y`       | `[Y](../../WebView2/Y)`                    |
| VB `Packages/VB/X` (single-file)           | VB `Packages/VB/Y` (sibling)                | `[Y](Y)`                                   |
| VB `Packages/VB/X` (single-file)           | VBRUN `Packages/VBRUN/<Mod>/Y`              | `[Y](../VBRUN/<Mod>/Y)`                    |
| VB `Packages/VB/X` (single-file)           | `Core/Y`                                    | `[Y](../../Core/Y)`                        |
| VB `Packages/VB/<Class>/index`             | VB `Packages/VB/<OtherClass>`               | `[Y](../<OtherClass>)`                     |
| VB `Packages/VB/<Class>/index`             | VBRUN `Packages/VBRUN/<Mod>/Y`              | `[Y](../../VBRUN/<Mod>/Y)`                 |
| VB `Packages/VB/<Class>/index`             | `Core/Y`                                    | `[Y](../../../Core/Y)`                     |
| WebView2 `Packages/WebView2/X` (single-file) | sibling `Packages/WebView2/Y` | `[Y](Y)`                                   |
| WebView2 `Packages/WebView2/X` (single-file) | `Packages/WebView2/Enumerations/Y` | `[Y](Enumerations/Y)`                     |
| WebView2 `Packages/WebView2/X` (single-file) | VBRUN `Packages/VBRUN/<Mod>/Y`       | `[Y](../VBRUN/<Mod>/Y)`                    |
| WebView2 `Packages/WebView2/X` (single-file) | VB `Packages/VB/Y`                   | `[Y](../VB/Y)`                             |
| WebView2 `Packages/WebView2/X` (single-file) | `Core/Y`                             | `[Y](../../Core/Y)`                        |
| WebView2 `Packages/WebView2/<Class>/index`   | sibling `Packages/WebView2/Y` | `[Y](../Y)`                                |
| WebView2 `Packages/WebView2/<Class>/index`   | `Packages/WebView2/Enumerations/Y` | `[Y](../Enumerations/Y)`                  |
| WebView2 `Packages/WebView2/<Class>/index`   | VBRUN `Packages/VBRUN/<Mod>/Y`       | `[Y](../../VBRUN/<Mod>/Y)`                 |
| WebView2 `Packages/WebView2/<Class>/index`   | `Core/Y`                             | `[Y](../../../Core/Y)`                     |
| WebView2 `Packages/WebView2/Enumerations/X`  | sibling `Enumerations/Y`             | `[Y](Y)`                                   |
| WebView2 `Packages/WebView2/Enumerations/X`  | `Packages/WebView2/<Class>` (single-file) | `[Y](../<Class>)`                |
| Assert `Packages/Assert/<Mod>`             | sibling `Packages/Assert/<OtherMod>`        | `[Y](<OtherMod>)`                          |
| Assert `Packages/Assert/<Mod>`             | VBRUN `Packages/VBRUN/<Mod>/Y`              | `[Y](../VBRUN/<Mod>/Y)`                    |
| Assert `Packages/Assert/<Mod>`             | VBA `Modules/<Mod>/Y`                       | `[Y](../../Modules/<Mod>/Y)`               |
| Assert `Packages/Assert/<Mod>`             | `Core/Y`                                    | `[Y](../../Core/Y)`                        |
| CC `Packages/CustomControls/X` (single-file) | sibling `Packages/CustomControls/Y`       | `[Y](Y)`                                   |
| CC `Packages/CustomControls/X` (single-file) | `Packages/CustomControls/Styles/Y`        | `[Y](Styles/Y)`                            |
| CC `Packages/CustomControls/X` (single-file) | `Packages/CustomControls/Framework/Y`     | `[Y](Framework/Y)`                         |
| CC `Packages/CustomControls/X` (single-file) | `Packages/CustomControls/Enumerations/Y`  | `[Y](Enumerations/Y)`                      |
| CC `Packages/CustomControls/X` (single-file) | VB `Packages/VB/Y`                        | `[Y](../VB/Y)`                             |
| CC `Packages/CustomControls/X` (single-file) | `Core/Y`                                  | `[Y](../../Core/Y)`                        |
| CC `Packages/CustomControls/<Control>/index` | sibling `Packages/CustomControls/Y`       | `[Y](../Y)`                                |
| CC `Packages/CustomControls/<Control>/index` | `Packages/CustomControls/Styles/Y`        | `[Y](../Styles/Y)`                         |
| CC `Packages/CustomControls/<Control>/index` | `Packages/CustomControls/Enumerations/Y`  | `[Y](../Enumerations/Y)`                   |
| CC `Packages/CustomControls/<Control>/index` | `Core/Y`                                  | `[Y](../../../Core/Y)`                     |
| CC `Packages/CustomControls/Styles/X`      | sibling `Styles/Y`                          | `[Y](Y)`                                   |
| CC `Packages/CustomControls/Styles/X`      | `Packages/CustomControls/<Control>` (single-file) | `[Y](../<Control>)`                  |
| CC `Packages/CustomControls/Styles/X`      | `Packages/CustomControls/Enumerations/Y`    | `[Y](../Enumerations/Y)`                   |
| CC `Packages/CustomControls/Styles/X`      | `Core/Y`                                    | `[Y](../../../Core/Y)`                     |
| CC `Packages/CustomControls/Framework/X`   | sibling `Framework/Y`                       | `[Y](Y)`                                   |
| CC `Packages/CustomControls/Framework/X`   | `Packages/CustomControls/<Control>` (single-file) | `[Y](../<Control>)`                  |
| CC `Packages/CustomControls/Enumerations/X` | sibling `Enumerations/Y`                   | `[Y](Y)`                                   |
| CC `Packages/CustomControls/Enumerations/X` | `Packages/CustomControls/<Control>` (single-file) | `[Y](../<Control>)`                 |
| CEF `Packages/CEF/index`                   | CEF `Packages/CEF/CefBrowser/`              | `[Y](CefBrowser/)`                         |
| CEF `Packages/CEF/index`                   | CEF `Packages/CEF/Enumerations/Y`           | `[Y](Enumerations/Y)`                      |
| CEF `Packages/CEF/index`                   | WebView2 `Packages/WebView2/Y`              | `[Y](../WebView2/Y)`                       |
| CEF `Packages/CEF/CefBrowser/index`        | CEF `Packages/CEF/CefBrowser/EnvironmentOptions` | `[Y](EnvironmentOptions)`             |
| CEF `Packages/CEF/CefBrowser/index`        | CEF `Packages/CEF/Enumerations/Y`           | `[Y](../Enumerations/Y)`                   |
| CEF `Packages/CEF/CefBrowser/index`        | WebView2 `Packages/WebView2/Y`              | `[Y](../../WebView2/Y)`                    |
| CEF `Packages/CEF/CefBrowser/index`        | VB `Packages/VB/Y`                          | `[Y](../../VB/Y)`                          |
| CEF `Packages/CEF/CefBrowser/index`        | `Core/Y`                                    | `[Y](../../../Core/Y)`                     |
| CEF `Packages/CEF/CefBrowser/EnvironmentOptions` | CEF `Packages/CEF/CefBrowser/` (parent)| `[Y](.)`                                   |
| CEF `Packages/CEF/CefBrowser/EnvironmentOptions` | CEF `Packages/CEF/Enumerations/Y`    | `[Y](../Enumerations/Y)`                   |
| CEF `Packages/CEF/Enumerations/X`          | sibling `Enumerations/Y`                    | `[Y](Y)`                                   |
| CEF `Packages/CEF/Enumerations/X`          | CEF `Packages/CEF/CefBrowser/` (folder-style) | `[Y](../CefBrowser/)`                    |
| CEF `Packages/CEF/Enumerations/X`          | CEF `Packages/CEF/CefBrowser/EnvironmentOptions` | `[Y](../CefBrowser/EnvironmentOptions)` |
| WinEventLogLib `Packages/WinEventLogLib/X` | sibling `Packages/WinEventLogLib/Y`         | `[Y](Y)`                                   |
| WinEventLogLib `Packages/WinEventLogLib/X` | VBA `Modules/<Mod>/Y`                       | `[Y](../../Modules/<Mod>/Y)`               |
| WinEventLogLib `Packages/WinEventLogLib/X` | `Core/Y`                                    | `[Y](../../Core/Y)`                        |
| WinNamedPipesLib `Packages/WinNamedPipesLib/X` | sibling `Packages/WinNamedPipesLib/Y`   | `[Y](Y)`                                   |
| WinNamedPipesLib `Packages/WinNamedPipesLib/X` | VBA `Modules/<Mod>/Y`                   | `[Y](../../Modules/<Mod>/Y)`               |
| WinNamedPipesLib `Packages/WinNamedPipesLib/X` | `Core/Y`                                | `[Y](../../Core/Y)`                        |
| WinNamedPipesLib `Packages/WinNamedPipesLib/X` | WinServicesLib `Packages/WinServicesLib/Y` | `[Y](../WinServicesLib/Y)`              |
| WinNamedPipesLib `Packages/WinNamedPipesLib/X` | WinEventLogLib `Packages/WinEventLogLib/Y` | `[Y](../WinEventLogLib/Y)`              |
| WinServicesLib `Packages/WinServicesLib/X` (single-file) | sibling `Packages/WinServicesLib/Y` | `[Y](Y)`                              |
| WinServicesLib `Packages/WinServicesLib/X` (single-file) | `Packages/WinServicesLib/Enumerations/Y` | `[Y](Enumerations/Y)`              |
| WinServicesLib `Packages/WinServicesLib/X` (single-file) | WinEventLogLib `Packages/WinEventLogLib/Y` | `[Y](../WinEventLogLib/Y)`        |
| WinServicesLib `Packages/WinServicesLib/X` (single-file) | WinNamedPipesLib `Packages/WinNamedPipesLib/Y` | `[Y](../WinNamedPipesLib/Y)`  |
| WinServicesLib `Packages/WinServicesLib/X` (single-file) | VBRUN `Packages/VBRUN/<Mod>/Y`     | `[Y](../VBRUN/<Mod>/Y)`                    |
| WinServicesLib `Packages/WinServicesLib/X` (single-file) | `Core/Y`                            | `[Y](../../Core/Y)`                        |
| WinServicesLib `Packages/WinServicesLib/Enumerations/X` | sibling `Enumerations/Y`             | `[Y](Y)`                                   |
| WinServicesLib `Packages/WinServicesLib/Enumerations/X` | `Packages/WinServicesLib/<Class>`    | `[Y](../<Class>)`                          |
| WinServicesLib `Packages/WinServicesLib/Enumerations/X` | WinEventLogLib `Packages/WinEventLogLib/Y` | `[Y](../../WinEventLogLib/Y)`        |
| tbIDE `Packages/tbIDE/X`                   | sibling `Packages/tbIDE/Y`                  | `[Y](Y)`                                   |
| tbIDE `Packages/tbIDE/X`                   | VBA `Modules/<Mod>/Y`                       | `[Y](../../Modules/<Mod>/Y)`               |
| tbIDE `Packages/tbIDE/X`                   | VBRUN `Packages/VBRUN/<Mod>/Y`              | `[Y](../VBRUN/<Mod>/Y)`                    |
| tbIDE `Packages/tbIDE/X`                   | VB `Packages/VB/Y`                          | `[Y](../VB/Y)`                             |
| tbIDE `Packages/tbIDE/X`                   | `Core/Y`                                    | `[Y](../../Core/Y)`                        |
| WNCC `Packages/WinNativeCommonCtls/X` (single-file) | sibling `Packages/WinNativeCommonCtls/Y` | `[Y](Y)`                            |
| WNCC `Packages/WinNativeCommonCtls/X` (single-file) | `Packages/WinNativeCommonCtls/<Container>/` (folder-style) | `[Y](<Container>/)`     |
| WNCC `Packages/WinNativeCommonCtls/X` (single-file) | `Packages/WinNativeCommonCtls/Enumerations/Y` | `[Y](Enumerations/Y)`           |
| WNCC `Packages/WinNativeCommonCtls/X` (single-file) | VBRUN `Packages/VBRUN/<Mod>/Y`         | `[Y](../VBRUN/<Mod>/Y)`                    |
| WNCC `Packages/WinNativeCommonCtls/X` (single-file) | VB `Packages/VB/Y`                     | `[Y](../VB/Y)`                             |
| WNCC `Packages/WinNativeCommonCtls/X` (single-file) | `Core/Y`                               | `[Y](../../Core/Y)`                        |
| WNCC `Packages/WinNativeCommonCtls/<Container>/index` | sibling `Packages/WinNativeCommonCtls/Y` (single-file) | `[Y](../Y)`           |
| WNCC `Packages/WinNativeCommonCtls/<Container>/index` | `Packages/WinNativeCommonCtls/<OtherContainer>/` | `[Y](../<OtherContainer>/)` |
| WNCC `Packages/WinNativeCommonCtls/<Container>/index` | `Packages/WinNativeCommonCtls/Enumerations/Y`    | `[Y](../Enumerations/Y)`     |
| WNCC `Packages/WinNativeCommonCtls/<Container>/index` | VBRUN `Packages/VBRUN/<Mod>/Y`           | `[Y](../../VBRUN/<Mod>/Y)`                 |
| WNCC `Packages/WinNativeCommonCtls/<Container>/index` | `Core/Y`                                 | `[Y](../../../Core/Y)`                     |
| WNCC `Packages/WinNativeCommonCtls/<Container>/<Sub>`  | sibling `<Container>/<OtherSub>`        | `[Y](<OtherSub>)`                          |
| WNCC `Packages/WinNativeCommonCtls/<Container>/<Sub>`  | parent `<Container>/` (index)           | `[Y](.)`                                   |
| WNCC `Packages/WinNativeCommonCtls/<Container>/<Sub>`  | sibling control (single-file)           | `[Y](../<OtherControl>)`                   |
| WNCC `Packages/WinNativeCommonCtls/<Container>/<Sub>`  | `Packages/WinNativeCommonCtls/Enumerations/Y` | `[Y](../Enumerations/Y)`             |
| WNCC `Packages/WinNativeCommonCtls/Enumerations/X`  | sibling `Enumerations/Y`                   | `[Y](Y)`                                   |
| WNCC `Packages/WinNativeCommonCtls/Enumerations/X`  | `Packages/WinNativeCommonCtls/<Class>` (single-file) | `[Y](../<Class>)`                |
| WNCC `Packages/WinNativeCommonCtls/Enumerations/X`  | `Packages/WinNativeCommonCtls/<Container>/` (folder-style) | `[Y](../<Container>/)`     |
| WinEventLogLib `Packages/WinEventLogLib/X` | WinServicesLib `Packages/WinServicesLib/Y` | `[Y](../WinServicesLib/Y)`             |
| WinEventLogLib `Packages/WinEventLogLib/X` | WinNamedPipesLib `Packages/WinNamedPipesLib/Y` | `[Y](../WinNamedPipesLib/Y)`       |
| `Core/X`                                   | VBA `Modules/<Mod>/Y`                       | `[Y](../Modules/<Mod>/Y)`                  |
| `Core/X`                                   | VBRUN `Packages/VBRUN/<Mod>/Y`              | `[Y](../Packages/VBRUN/<Mod>/Y)`           |
| `Core/X`                                   | VB `Packages/VB/Y`                          | `[Y](../Packages/VB/Y)`                    |
| `Core/X`                                   | WebView2 `Packages/WebView2/Y`       | `[Y](../Packages/WebView2/Y)`       |
| `Core/X`                                   | Assert `Packages/Assert/<Mod>`              | `[Y](../Packages/Assert/<Mod>)`            |
| `Core/X`                                   | CC `Packages/CustomControls/Y`              | `[Y](../Packages/CustomControls/Y)`        |
| `Core/X`                                   | CEF `Packages/CEF/Y`                        | `[Y](../Packages/CEF/Y)`                   |
| `Core/X`                                   | WinEventLogLib `Packages/WinEventLogLib/Y`  | `[Y](../Packages/WinEventLogLib/Y)`        |
| `Core/X`                                   | WinNamedPipesLib `Packages/WinNamedPipesLib/Y` | `[Y](../Packages/WinNamedPipesLib/Y)`   |
| `Core/X`                                   | WinServicesLib `Packages/WinServicesLib/Y` | `[Y](../Packages/WinServicesLib/Y)`     |
| `Core/X`                                   | tbIDE `Packages/tbIDE/Y`                    | `[Y](../Packages/tbIDE/Y)`                 |
| `Core/X`                                   | WNCC `Packages/WinNativeCommonCtls/Y`       | `[Y](../Packages/WinNativeCommonCtls/Y)`   |
| `Core/X`                                   | `Core/Y` (sibling)                          | `[Y](Y)`                                   |

Always link to the **canonical** location (the page's `permalink:`), not to a `redirect_from` alias. Pages that have moved out of `Core/` retain a `redirect_from: /tB/Core/<X>` so legacy links still work, but forward-style links should point at the new home.

## Per-symbol workflow

1. **Locate the source**:
   - Core / VBA / VBRUN symbols → `ls ../VBA-Docs/Language/Reference/User-Interface-Help/ | grep -i <name>`.
   - VB control classes → `..\tb-export\NewProject\Packages\VB\Sources\CONTROLS\STANDARD\<Class>.twin` (and the relevant `BASE/Base*.twin` files for inherited members).
   - WebView2Package items → `..\tb-export\NewProject\Packages\WebView2Package\Sources\Classes\<Class>.twin`, with enumerations in `Support\Enumerations.twin` and the one user-type in `Support\Types.twin`. Ignore everything under `Abstract\` (private COM interfaces).
   - Assert package → `..\tb-export\NewProject\Packages\Assert\Sources\<Mod>.twin` (one file per module — `Exact.twin`, `Strict.twin`, `Permissive.twin`).
   - CustomControls — framework half: `..\tb-export\NewProject\Packages\CustomControls\Sources\CustomControls.twin` (a single file with `Module Constants`, the interfaces, and the CoClasses). Runtime half: `..\tb-export\NewProject\Packages\CustomControlsPackage\Sources\Waynes<X>.twin` for each control + `zTemporarySupport.twin` for the shared style helpers and the mixin base classes.
   - CEF package → `..\tbrepro\cef\CEFSampleProject\Packages\cefPackage\Sources\CefControl.twin` for the whole public surface (the `CefBrowser` control, its `CefBrowserBaseCtl` base, and `CefEnvironmentOptions`). For the two surfaced enums: `CEF\Enums\_cef_log_severity_t.twin` (declares both the internal `cef_log_severity_t` and the user-facing `CefLogSeverity`) and `CEF\CrossProcessIPC\BrowserOM.twin` (declares `cefPrintOrientation` inline, around line 29). Everything else under `cefPackage\Sources\` and `cefPackage\Sources\CEF\` is `Private Class` / `Private Module` plumbing — skip. The sample project's `Sources\Example1..4.twin` are the source-of-truth for which features are *not* yet exposed (commented-out event handlers with *"Sorry, this feature is not yet available in the CEF package"*).
   - WinEventLogLib package → `..\tb-export\NewProject\Packages\WinEventLogLib\Sources\EventLog.twin` (the generic `EventLog(Of T1, T2)` class) and `Helper.twin` (`EventLogHelperPublic.RegisterEventLogInternal`). Skip `APIs.twin` (`Private Module`), `Constants.twin` (`Private Module` — the `EventLogTypeConstants` enum is unreachable from outside the package), and the `EventLogHelperPrivate` module in `Helper.twin` (named "Private" though declared `Public`; only used internally by `EventLog.LogArray`).
   - WinNamedPipesLib package → `..\tb-export\NewProject\Packages\WinNamedPipesLib\Sources\` — one `.twin` per public class: `NamedPipeServer.twin`, `NamedPipeServerConnection.twin`, `NamedPipeClientManager.twin`, `NamedPipeClientConnection.twin`. Each `.twin` also declares a `Private Interface INamedPipe*Internal` (refcount / dispatch helper used by the IOCP threads); skip those. Skip `APIs.twin`, `Constants.twin`, and `Helper.twin` (all `Private Module`).
   - WinServicesLib package → `..\tb-export\NewProject\Packages\WinServicesLib\Sources\` — one `.twin` per public class: `Services.twin` (the `[PredeclaredId]` coordinator), `ServiceManager.twin`, `ServiceCreator.twin`, `ServiceState.twin`. Plus `Interfaces.twin` for the `Public Interface ITbService` (the file also declares `Private Interface IServiceCreator` and `Private Interface IServiceManagerInternal` — skip both). Enumerations live in `Constants.twin` under `Public Module ServicesConstantsPublic` (four enums: `ServiceTypeConstants`, `ServiceStartConstants`, `ServiceControlCodeConstants`, `ServiceStatusConstants`). Skip `APIs.twin`, `Helper.twin`, and the `Private Module ServicesConstants` half of `Constants.twin` (all package-internal). The worked integration example — services + event log + named pipes wired together — is at `..\tbrepro\winlibs\tbServiceTest2\Sources\` (read `Startup.twin` and `SERVICES\TBSERVICE001.twin` first; the latter is the canonical `ITbService` implementation).
   - tbIDE package → `..\tbrepro\sample10\WaynesWorldAddInTest1\Packages\tbIDE\Sources\` — twenty-four flat `.twin` files, one per CoClass / Class. Read every file (none is `Private` plumbing; even `AddinTimer.twin` — the only `Class` without an explicit `Public` modifier — is user-instantiated). The six consumer-side example addins are at `..\tbrepro\sample10\…\Sources\MainModule.twin` through `..\tbrepro\sample15\…\Sources\MainModule.twin` — read sample10 first (the kitchen-sink "Hello, World" addin), then samples 11–14 (each one focuses on a single advanced custom-element widget — `chartjs` / `monaco` / `listview` / `virtuallistview`), then sample15 (the complete Global Search addin — exercises the file-system traversal + editor-navigation surface). Ignore the `CHANGELOG.md` inside the package source (it's a copy-paste from `WinNativeForms` and unrelated).
   - WinNativeCommonCtls package → `..\tb-export\NewProject\Packages\WinNativeCommonCtls\Sources\` — two sub-folders: `CONTROLS\` (eight `.twin` files, one per control; each declares the heavy `<Name>BaseCtl` + the thin `<Name>` leaf — read both halves), and `SUPPORT\` for the sub-object classes (`ListImage.twin`, `ListImages.twin`, `ListItem.twin`, `ListItems.twin`, `ColumnHeader.twin`, `ColumnHeaders.twin`, `Node.twin`, `Nodes.twin`). For inherited surface, walk the relevant `VB.BaseControl*` chain in `..\tb-export\NewProject\Packages\VB\Sources\BASE\` — each control inherits one of `BaseControlFocusable`, `BaseControlFocusableNoFont`, `BaseControlNotFocusable`, or `BaseControlNotFocusable2`. Skip `SUPPORT\Anchors.twin` (entirely commented out), `SUPPORT\Misc.twin` (private — but `OrientationConstants` surfaces from it), `SUPPORT\ImagesHelper.twin` (private), `SUPPORT\Interfaces.twin` (three private interfaces — no doc page), `SUPPORT\TreeViewNodeCheckState.twin` (four private scheduled-callback helpers — no doc page), `SUPPORT\ImageListPropertyPage.twin` + `.tbform` (design-time `[FormDesignerId]` form — no doc page), and the Win32-plumbing halves of the `<Name>Consts.twin` modules. The user-facing enums in `SUPPORT\TreeViewConsts.twin` live in the `Public Module TreeViewPublic` block (line 327+); the user-facing `DTPickerFormatConstants` is at the bottom of `SUPPORT\DTPickerConsts.twin` (line 94+); `OrientationConstants` is in `SUPPORT\Misc.twin`; `ImlDrawConstants` is in `SUPPORT\ImageListConsts.twin`.
2. **Decide placement**:
   - Pure language keyword (parsed by the compiler, no runtime call) → `docs/Reference/Core/`.
   - Runtime function/property → `docs/Reference/<Package>/<Mod>/`. Add `redirect_from: /tB/Core/<name>` so legacy `tB/Core/<name>` links still work.
   - VB control class → `docs/Reference/VB/<Class>.md` for a single-file page, or `docs/Reference/VB/<Class>/index.md` if sub-pages are likely. No `Core/` redirect — these were never under `Core/`.
   - WebView2 control / wrapper class → `docs/Reference/WebView2/<Class>.md` (single-file) or `docs/Reference/WebView2/<Class>/index.md` (folder-style; use this for the main `WebView2` class because of its size).
   - WebView2 enumeration → `docs/Reference/WebView2/Enumerations/<Enum>.md`, mirroring `docs/Reference/VBRUN/Constants/`.
   - WebView2 user-type → `docs/Reference/WebView2/Types/<Name>.md`.
   - Assert module → `docs/Reference/Assert/<Mod>.md` — one single-file page per module, with all 15 members listed inline under `## <Member>` headings. **Do not** create per-member sub-pages; the three modules share an identical API and per-member duplication would add noise.
   - CustomControls concrete control → `docs/Reference/CustomControls/<Control>.md` (single-file, e.g. `WaynesFrame`, `WaynesLabel`, `WaynesTimer`) or `docs/Reference/CustomControls/<Control>/index.md` (folder-style — required when the control has a state-holder or options sub-page, i.e. `WaynesButton/`, `WaynesForm/`, `WaynesGrid/`, `WaynesSlider/`, `WaynesTextBox/`).
   - CustomControls shared style helper → `docs/Reference/CustomControls/Styles/<Name>.md`. Pair small helpers with their containers on a single page (`Corner` inline under `Corners.md`, `Border` under `Borders.md`, `FillColorPoint` + `FillColorPoints` under `Fill.md`, `FontStyle` under `TextRendering.md`).
   - CustomControls framework symbol (interface, CoClass, UDT) → `docs/Reference/CustomControls/Framework/<Name>.md`.
   - CustomControls enumeration → `docs/Reference/CustomControls/Enumerations/<Enum>.md` (mirrors `WebView2/Enumerations/` and `VBRUN/Constants/`). The three `Long`-alias enums (`ColorRGBA`, `PixelCount`, `PointSize`) live here too, even though they're really typedefs.
   - CEF control → `docs/Reference/CEF/CefBrowser/index.md` (folder-style; carries the `EnvironmentOptions` sub-page). Pre-creation options class → `docs/Reference/CEF/CefBrowser/EnvironmentOptions.md` (parallel to `WebView2/WebView2/EnvironmentOptions.md`). CEF enumeration → `docs/Reference/CEF/Enumerations/<Enum>.md`.
   - WinEventLogLib generic class → `docs/Reference/WinEventLogLib/EventLog.md` (single-file; the surface is small — constructor + three methods). WinEventLogLib helper module → `docs/Reference/WinEventLogLib/EventLogHelperPublic.md` (single-file; one Sub).
   - WinNamedPipesLib class → `docs/Reference/WinNamedPipesLib/<Class>.md` (single-file; one page per public class — `NamedPipeServer.md`, `NamedPipeServerConnection.md`, `NamedPipeClientManager.md`, `NamedPipeClientConnection.md`). No folder-style — none of the four classes have sub-pages.
   - WinServicesLib class → `docs/Reference/WinServicesLib/<Class>.md` (single-file; one page each for `Services.md`, `ServiceManager.md`, `ServiceCreator.md`, `ServiceState.md`, `ITbService.md`). WinServicesLib enumeration → `docs/Reference/WinServicesLib/Enumerations/<Enum>.md` — one page each for `ServiceTypeConstants`, `ServiceStartConstants`, `ServiceControlCodeConstants`, `ServiceStatusConstants` (mirrors `WebView2/Enumerations/`, `CEF/Enumerations/`, `CustomControls/Enumerations/`, `VBRUN/Constants/`).
   - tbIDE class / CoClass → `docs/Reference/tbIDE/<Class>.md` — one single-file page per CoClass (or per concrete `Class` for `AddinTimer`). No folder-style, no `Enumerations/` sub-folder — the package's six nested enums (`RevealArea`, `EditorOpenOptions`, `ReadTextFlags`, `FileSystemItemType`, `VbBuildType`, `DebuggerEvaluateOptions`) each live on the declaring class's page (e.g. `RevealArea` on `CodeEditor.md`).
   - WinNativeCommonCtls control without sub-objects → `docs/Reference/WinNativeCommonCtls/<Class>.md` (single-file; used by `DTPicker.md`, `MonthView.md`, `ProgressBar.md`, `Slider.md`, `UpDown.md`). WinNativeCommonCtls control *with* sub-objects → `docs/Reference/WinNativeCommonCtls/<Container>/index.md` (folder-style; used by `ImageList/`, `ListView/`, `TreeView/`). Sub-object → `docs/Reference/WinNativeCommonCtls/<Container>/<SubObject>.md` (e.g. `ImageList/ListImage.md`, `ListView/ListItem.md`, `ListView/ColumnHeaders.md`, `TreeView/Node.md`). WinNativeCommonCtls module-level enumeration → `docs/Reference/WinNativeCommonCtls/Enumerations/<Enum>.md`. **Per-control nested enums** (`ImageListColorDepth`, `ListViewConstants`, `ListArrangeConstants`, `ListTextBackgroundConstants`, `ListLabelEditConstants`, `ListColumnAlignmentConstants`, `PrbOrientation`, `PrbScrolling`, `PrbState`, `TickStyleConstants`, `TextPositionConstants`) fold onto the declaring control's page rather than getting their own `Enumerations/` file — same pattern as CustomControls's `WaynesSlider.SliderDirection`.
   - Pick `<Mod>` from VBA's grouping (Information, Interaction, Strings, FileSystem, DateTime, Math, Financial, Conversion, ...) and the existing folders under `Reference/<Package>/`.
3. **Adapt content** (VBA-Docs sources):
   - Strip MS frontmatter (`ms.assetid`, `f1_keywords`, `keywords`, `ms.date`, `ms.localizationpriority`).
   - Strip the `[!include[Support and feedback]...]` footer.
   - Replace MS parameter tables with the `*name*` + `: definition` style.
   - Replace VBA-specific phrasing (e.g. "Visual Basic for Applications") with twinBASIC where it changes meaning; otherwise leave as-is.
   - Trim Mac/Windows 95/NT trivia unless historically illuminating.
4. **Adapt content** (VB control `.twin` sources):
   - Walk the `Inherits` chain to enumerate the actually-public surface; private/protected helpers don't belong in user-facing docs.
   - List members alphabetically within Properties / Methods / Events sections (see `CheckBox.md`).
   - Members marked `[Unimplemented]` get a `> [!NOTE]` callout saying so.
   - Omit the `vba_attribution: true` frontmatter flag — these pages are fully original.
5. **Adapt content** (WebView2Package `.twin` sources):
   - For the `WebView2` control: same approach as VB controls — walk the `Inherits VB.BaseControlFocusableNoFont` chain (`..\tb-export\NewProject\Packages\VB\Sources\BASE\BaseControlFocusableNoFont.twin` and ancestors) to know which inherited members are visible. Document the `Public` properties / events declared on `WebView2` itself, plus its `Public Sub` / `Public Function` methods.
   - For the wrapper classes (`WebView2Request`, …): they're flat — no inheritance to walk — so list every `Public` member in source order, grouped alphabetically into Properties / Methods. Many `Public` properties on `WebView2EnvironmentOptions` are bare fields, not `Property Get`/`Property Let` pairs; document them as properties of the corresponding type.
   - The `[Description("…")]` attribute on each `Public Event` / `Public` field gives the user-visible one-liner from the IDE — use it as the basis for the page's description, then expand.
   - Omit the `vba_attribution: true` frontmatter flag — these pages are fully original (the WebView2Package itself is MIT-licensed; CC-BY-4.0 doesn't apply).
6. **Adapt content** (Assert `.twin` sources):
   - The module-level `[Description("...")]` block (built up from `vbCrLf`-joined string fragments) is the *only* prose on the source side — use it as the basis for the per-module page's intro / semantics summary. The per-member `[Description("")]` strings are empty placeholders, so member descriptions are fully original.
   - **Do not** surface the `Lib "<assert{exact,strict,permissive}>"`, `Alias "#N"`, `PreserveSig`, `UseGetLastError`, `DeclareWide PtrSafe Sub` decoration on the page — that's internal pseudo-DLL plumbing. Show each member as if it were an ordinary `Sub`: `Sub AreEqual(Expected, Actual, [Message])`.
   - **Do** mention `[DebugOnly(True)]` (assertions compile out of release builds) and `[MustBeQualified(True)]` (callers must write the module name, e.g. `Strict.IsTrue(x)`).
   - Omit the `vba_attribution: true` frontmatter flag — these pages are fully original (the Assert package is MIT-licensed).
7. **Adapt content** (CustomControls `.twin` sources):
   - For each concrete control: walk the `Implements <Base> Via _BaseControl = New <Base>` mixin to know which inherited members surface on the control. The base classes are `Private Class` in `zTemporarySupport.twin` and never get their own doc page; their public members fold into the control's Properties listing. The visible inherited surface is small and fixed — see the "Concrete controls" sub-section above for the exact lists per base.
   - List own + inherited members alphabetically within Properties / Methods / Events sections (mirror VB-package control pages like `CheckBox.md`).
   - State-holder classes (`WaynesButtonState`, `WaynesSliderState`, `WaynesTextBoxState`) and `WindowsFormOptions` are declared `Private Class` but are reachable through `Public WithEvents …` properties — document them as **sub-pages** of the parent control (folder-style layout, parallel to `WebView2/EnvironmentOptions.md`).
   - For shared style helpers in `zTemporarySupport.twin` (`Corners`, `Fill`, `Borders`, `TextRendering`, `Anchors`, `Padding`, `Line`): list `Public` fields in source order, grouped into Properties / Methods. They have no `Property Get`/`Property Let` pairs — they're bare-field UDT-style classes that raise an `OnChanged` event when any field is set. Document the fields as properties; mention the `OnChanged` event once at the end.
   - For the DESIGNER framework: fold the underscore-prefixed default interface (`_CustomControlTimer`, `_CustomControlContext`, …) onto the CoClass page — don't give the `_…` interfaces their own pages. The `[Default]` / `[Default, Source]` decoration is COM detail; show members as if they were declared directly on the CoClass.
   - For the `SerializeInfo` and `Canvas` UDTs: each carries a `Pointer As LongPtr` field plus `Public DeclareWide PtrSafe Function/Sub … Lib "<…>" Alias "#N"` pseudo-DLL members. Document those members as instance methods on the UDT (`Canvas.RuntimeUICCCanvasAddElement(descriptor)`); **do not** surface the `Lib` / `Alias` / `PreserveSig` / `DLLStackCheck` / `SimplerByVals` decoration (same treatment as Assert).
   - The `[Description("…")]` attribute on `Public` fields / properties / events gives the user-visible one-liner from the IDE — use it as the basis for the page's description, then expand.
   - For the three `Long`-alias enums (`ColorRGBA`, `PixelCount`, `PointSize`): document each as a typedef for `Long` (the underlying storage is `Long`), with a callout that they're currently declared as empty `Enum` blocks pending real alias support — the carrying `FIXME` comment confirms this is transitional.
   - For `Customtate`: document the enum, but include a `> [!NOTE]` callout flagging the typo (the name appears to be a slip for `CustomState`) and pointing readers to the active `WindowState` enum, which carries identical members.
   - For `BaseControl` / `BaseControlFocusable` / `BaseForm`, `TextDecorator(s)`, the `UDTs` wrapper class (`MouseEvent`, `KeyEvent`, `FocusEvent`, `ElementDescriptor`, `CaretPosition`, `SpecialKeyCodes`), and `MathSupport` / `ColorSupport` modules: **no doc page** — implementation-detail private content. The mixin bases' members surface on the controls; the UDT-class members only matter for someone authoring a *new* custom control and can wait for an "authoring tutorial" pass.
   - Omit the `vba_attribution: true` frontmatter flag — these pages are fully original (both source packages are MIT-licensed).
8. **Adapt content** (CEF `.twin` sources):
   - `CefBrowser` is `Class CefBrowser` at the bottom of `CefControl.twin`, but inherits *everything* from the private `CefBrowserBaseCtl` declared at the top of the same file. Document the union as the `CefBrowser` page; don't surface the base-class split. Then walk `Inherits VB.BaseControlRectDockable` (`..\tb-export\NewProject\Packages\VB\Sources\BASE\BaseControlRectDockable.twin` and ancestors) to fold the inherited rect-dockable surface (`Name`, `Left`, `Top`, `Width`, `Height`, `Anchors`, `Dock`, …) into the Properties listing, the same way VB-package and CustomControls control pages do.
   - List own + inherited members alphabetically within Properties / Methods / Events sections (mirror `CheckBox.md`, `WebView2/WebView2/index.md`).
   - The `[Description("…")]` attribute on each `Public Event` / `Public` method / `Public Property` gives the user-visible one-liner from the IDE — use it as the basis for the page entry, then expand. The `[Description("")]` blocks with empty strings (the `Initialize` method, the bare-field properties like `CreateInitialized`) need fully original prose.
   - `CefEnvironmentOptions` is `Private Class` but reached via `Public EnvironmentOptions As CefEnvironmentOptions = New CefEnvironmentOptions` on the control — same pattern as WebView2's `EnvironmentOptions`. Document it as the **sub-page** `CefBrowser/EnvironmentOptions.md` (folder-style layout on the parent). Its four fields are bare `Public` (no `Property Get`/`Let` pairs) — list them as properties.
   - Settings on `CefEnvironmentOptions` only take effect *before or during* the `Create` event (the source `CreateCEFBrowser` reads them once when launching the helper process); call this out on the sub-page.
   - For the two enums: `CefLogSeverity` and `cefPrintOrientation` (note the lowercase `c` on the second — it's declared `Enum cefPrintOrientation` in `BrowserOM.twin`; document it with its source-side spelling). Format pages like `WebView2/Enumerations/wv2PrintOrientation.md` — single intro paragraph, a value table with `{: #cefXxx }` anchors on each row for deep-linking.
   - The `cefPrintOrientation` enum is declared *inside* the private `BrowserOM` class but accessed from user code unqualified (`cefPrintOrientation.cefPrintPortrait`) — it surfaces because `CefBrowser.PrintToPdf` exposes it as a parameter type. Don't surface the `BrowserOM` enclosing class; document the enum at top level under `Enumerations/`.
   - `NavigationStarting` carries a `RequestHeaders As CefBrowserRequestHeaders` parameter. `CefBrowserRequestHeaders` is `Alias … As Object` (the underlying class is an empty placeholder) — call this out on the event entry as *"currently typed Object; reserved for a future request-headers collection"* and don't link out to a non-existent page.
   - `NavigationComplete` carries `IsSuccess` and `WebErrorStatus` — but `OnNavigationComplete_UI` in `CefControl.twin` hard-codes both to placeholder values with `FIXME` comments. Document the signature as designed but add a `> [!NOTE]` saying the values are currently fixed pending implementation.
   - WebView2-parity gap list lives on `CEF/index.md` (one bulleted section). Methods / events not yet exposed get **no per-page stub** — they don't exist on `CefBrowser` and have no place to land.
   - Multi-version source: the same `.twin` files compile for CEF v49 / v109 / v145 via the `CEF_VERSION` compiler constant. Mention this on `CEF/index.md` together with the runtime download story; reference `CefBrowser.CefMajorVersion` as the runtime-side query.
   - Omit the `vba_attribution: true` frontmatter flag — these pages are fully original (the package is MIT-licensed, same as WebView2 / Assert / CustomControls).
9. **Adapt content** (WinEventLogLib `.twin` sources):
   - The generic class declaration `Public Class EventLog(Of T1, T2)` follows the same syntax described in `docs/Features/Language/Generics.md` (look there for the parameterisation rules). Show the constructor as `New EventLog(Of <EventIds>, <Categories>)(LogName)` — both type arguments are required because twinBASIC does not deduce them from the `LogName` constructor argument.
   - The `[Description("…")]` attributes on the class and on each `Public Sub` are the IDE one-liner — use them as the basis for each entry, then expand.
   - The class itself is tagged `[COMCreatable(False)]` and `[ClassId("4AEA12E8-…-EAEAEAEAEAEA")]`. The `EA` byte sequence is *compiler magic* for generic classes — do not surface it on the page (it's an implementation detail of how generics are exposed to COM).
   - Method-name quirk: `LogSuccess` writes a Windows *Information* event (`EVENTLOG_SUCCESS = 0` is the Win32 SDK spelling for the information event type). `LogFailure` writes a Windows *Error* event. Call this out on each method entry — readers familiar with the Windows Event Log will otherwise expect `LogSuccess` to write an Audit Success entry.
   - `Register()` requires elevation (it writes to `HKLM`); typical usage is *"call once during install"*. Call this out on the method entry.
   - For `EventLogHelperPublic.RegisterEventLogInternal`: do not surface the `Const HKEY_LOCAL_MACHINE` / `Const KEY_WRITE` declarations or the `RegCreateKeyExW` / `RegSetValueExW` Win32 calls — those are implementation detail. Describe what the function *does* at the registry (writes the source key with `EventMessageFile = App.ModulePath`, `CategoryMessageFile = App.ModulePath`, `CategoryCount = <value>`).
   - On the index page, mention the package's current gaps in passing: the `EventLogTypeConstants` enum has five entries (Information / Warning / Error / AuditSuccess / AuditFailure) but the public API surfaces only Information and Error event types — Warning and the two Audit variants are not yet reachable.
   - The index page's *Message resources* section should describe what Windows *expects* (a message-table resource in the EXE pointed at by `EventMessageFile`, keyed by the `T1` / `T2` enum values), **not** make strong claims about how twinBASIC delivers it. The `.twin` source does not contain visible `mc.exe`-equivalent emit; whatever populates the resource lives in the compiler's special-handling path for the `[ClassId("…EAEAEAEAEAEA")]` magic-byte pattern, and that is not directly observable from the package's own sources.
   - The README copy-paste mistake (header says "NAMED PIPES PACKAGE", body is correct) is *not* surfaced on the docs — write the actual description ("a simple framework for creating Windows event log entries"), don't propagate the wrong name.
   - Omit the `vba_attribution: true` frontmatter flag — these pages are fully original (the package is MIT-licensed, same situation as the other Wayne Phillips packages).
10. **Adapt content** (WinNamedPipesLib `.twin` sources):
   - The four `Public Class …` files are flat — there is no inheritance to walk, so list each class's surface in the order *Fields → Events → Methods*, with members within each group alphabetised. Mirror the shape of `WebView2/WebView2Request.md` (similar size + flat layout).
   - `[COMCreatable(False)]` is on every class, but its user-facing implication differs by role:
     - On the *coordinator* classes (`NamedPipeServer`, `NamedPipeClientManager`) the attribute only blocks late-binding `CreateObject`; user code still instantiates with `New`. **Do not mention** `[COMCreatable(False)]` on these pages — write `"Instantiate with **New**."` instead. (Note: `Reference/Attributes.md` describes `[COMCreatable(True)]` as *"this coclass can be created with the **New** keyword"*, which suggests `False` blocks `New`. That description is misleading — `New` from a project that references the package works on `[COMCreatable(False)]` classes; the attribute only governs external COM creation. Don't propagate the misleading wording.)
     - On the *Connection* classes (`NamedPipeServerConnection`, `NamedPipeClientConnection`) the attribute pairs with the design choice that user code doesn't construct these directly — each `Sub New` takes a package-`Private Interface` parameter, so the constructor is effectively unreachable from outside the package anyway. Mention `[COMCreatable(False)]` on the intro paragraph the same way [`CustomControls/WaynesTextBox/WaynesTextBoxState.md`](docs/Reference/CustomControls/WaynesTextBox/WaynesTextBoxState.md) does: *"The class is tagged `[COMCreatable(False)]` and its constructor takes a package-private interface — reach instances only through …"*.
   - Do not list `[InterfaceId]`, `[ClassId]`, `[EventInterfaceId]` on the page; they are COM-plumbing decoration.
   - Each `Public` field carries a `[Description("…")]` attribute — use it as the basis for the field entry, then expand. There is no `[Description]` on events, on methods, or on classes; that prose is fully original.
   - The `INamedPipe*Internal` interfaces at the top of each `.twin` are `Private Interface` and only exist so the IOCP worker threads can refcount the corresponding class via `stdole.IUnknown`. **No doc page** — do not surface the underscored implementing properties (`_Handle`, `_IsConnected`, …) either; they're the interface-implementation half of the `Public` field of the same name.
   - For events with a `Data() As Byte` parameter (server `ClientMessageReceived`, client `MessageReceived`): document the parameter as **Byte()** but include a `> [!IMPORTANT]` callout saying the array is a transient `SAFEARRAY` view over the IOCP read buffer and must be **copied** if its contents are needed past the event handler. The source uses a hand-rolled `SAFEARRAY_1D` UDT and clears the array pointer at the end of `NotifyClientDataReceived` / `NotifyReceivedDataAsync` — that lifetime is real and trips up consumers who store the array reference.
   - The optional *Cookie* parameter on `AsyncRead` / `AsyncWrite` (and the corresponding event parameter) is the package's correlation handle. Document it as a **Variant** opaque token whose value flows through unchanged from the issuing call to the matching `MessageSent` / `MessageReceived` event. Use this as the example pattern when illustrating tracked writes.
   - `MessageBufferSize` is the *initial* buffer size, not a cap on message size — the IOCP loop handles `ERROR_MORE_DATA` by allocating a larger buffer and re-issuing the read. Surface this on each `MessageBufferSize` entry (server and client manager). The `_README.txt` TODO *"remove max size 131072 of messages"* suggests a future hard cap removal; surface as a TODO without making a stronger claim.
   - `NamedPipeServer.PipeName` must be set before `Start()` (or `Start()` raises run-time error 5). Surface as a `> [!IMPORTANT]` callout on the field entry.
   - `NamedPipeServer.Start()` is idempotent (no-op if already started); `Stop()` is idempotent (no-op if not started). Both call back into themselves from `Class_Terminate`. Mention this on each method.
   - `NamedPipeClientConnection.AsyncClose()`: the `_README.txt` says *"you MUST call AsyncClose on the client side, otherwise the connection is left alive when the object goes out of scope"*. This is a required-call: surface as a `> [!IMPORTANT]` callout on the class intro AND on the `AsyncClose` method entry. Note that `Class_Terminate` also calls `AsyncClose`, so the contract is technically *"either let the object terminate, or call `AsyncClose` first"* — but the README's wording is what users will look for, so quote it.
   - `NamedPipeServer.ManualMessageLoopEnter` / `ManualMessageLoopLeave`: explain why these exist — when `FreeThreadingEvents = False` (the default) events are marshalled to the UI thread via a hidden `STATIC`-class window's `WndProc`, which requires a Win32 message loop to be running. UI hosts (Forms) already pump; services / console hosts don't, so they call `ManualMessageLoopEnter` from their entry point and `ManualMessageLoopLeave` from a shutdown handler.
   - `Handle` is `Public` on both connection classes — it is the underlying Win32 pipe handle. Document it as informational (useful for low-level / debugging access), not as something user code typically reads or writes.
   - The README TODO list lives on the **landing page** ("Known limitations" or "Roadmap" section), not on the per-class pages. Reproduce only the user-facing items (no method to drop a single client from the server side; no `Error` events on the IOCP worker thread; suspected hard cap on message size). Skip the *"currently a lot of duplicate code in server + client"* note — it's an internal-refactor concern.
   - Omit the `vba_attribution: true` frontmatter flag — these pages are fully original (the package is MIT-licensed).
11. **Adapt content** (WinServicesLib `.twin` sources):
   - The five public classes are flat — `Services` (PredeclaredId), `ServiceManager`, `ServiceCreator(Of T)`, `ServiceState`, and the `ITbService` interface. List each class's surface in the order *Fields → Properties → Methods → Events* (the package has no events on the public classes; the `ITbService` interface defines callbacks that the user implements, not events on a class).
   - `Services` is `[PredeclaredId]` — surface this on the page intro. The class is used singleton-style as `Services.X` without `New`, and also doubles as an enumerable collection (`For Each manager In Services`). The `[Description("...")]` attribute on each method is the IDE one-liner — use it as the basis for the entry, then expand.
   - `ServiceManager` carries `[COMCreatable(False)]` plus an `[Description("For internal use. Dont create instances of ServiceManager manually, use Services.ConfigureNew instead")]` on its constructor. Surface that on the intro paragraph (*"Instantiate via `Services.ConfigureNew`, not directly"*) — same shape as the WinNamedPipesLib `Connection` classes. Two methods on `ServiceManager` are technically `Public`-by-default but only invoked by the OS / package infrastructure (`ServiceEntryPoint`, `ServiceControlHandlerCallback`) — list them at the bottom of the page under "Internal hooks" with a `> [!NOTE]` saying user code never calls them; do not list them at the top with the user-facing methods. `ResyncStatus` is borderline — list it under Methods but note that `ReportStatus` calls it automatically.
   - `ServiceCreator(Of T)` is a single-method generic class. Surface the constraint clearly: `T` must implement `ITbService` (the source has no syntactic `Where T : ITbService` clause, but `Return New T As ITbService` only compiles when `T` does). Do not surface the `[ClassId("66170220-...-EAEAEAEAEAEA")]` — same compiler-special-handling rule as `WinEventLogLib`'s `EventLog(Of T1, T2)`.
   - `ServiceState` is read-only and constructed via `Services.QueryStateOfService(Name)`. Surface that the snapshot is taken **once at construction time** and never refreshed — to see updated state, call `QueryStateOfService` again. Two properties (`CurrentState`, `ControlsAccepted`) carry `' FIXME` comments noting they return raw `Long` rather than the typed enum; surface as a `> [!NOTE]` on each, with a `CType` example.
   - `ITbService` is the user-implemented contract. Three subs (`EntryPoint`, `StartupFailed`, `ChangeState`). The page **must** prominently flag the two-thread split: `EntryPoint` runs on the service thread (spawned by the SCM dispatcher), `ChangeState` runs on the main dispatcher thread. The canonical inter-thread coordination pattern uses shared `Public` flags (`IsStopping`, `IsPaused`) on the implementing class — surface this as the recommended idiom, with the `tbServiceTest2\Sources\SERVICES\TBSERVICE002.twin` `IsStopping` / `IsPaused` example.
   - For the four enums under `ServicesConstantsPublic`: format pages like `WebView2/Enumerations/wv2PrintOrientation.md` — single intro paragraph, a value table with `{: #vbServiceXxx }` / `{: #tbServiceXxx }` anchors per row for deep-linking. The mixed `vb` / `tb` prefix across enums is source-side inconsistency — surface as-is, don't try to rationalise. Call out on `ServiceTypeConstants` that the driver values (`tbServiceTypeSystemDriver`, `tbServiceTypeKernelDriver`, `tbServiceTypeRecognizerDriver`, `tbServiceTypeAdapter`) are only meaningful for kernel-mode drivers (twinBASIC services compile to user-mode EXEs); the `Interactive` variants are kept for compatibility but Windows Vista and later disallow them (note with a `> [!NOTE]`).
   - Do not list `[InterfaceId]`, `[ClassId]`, `[EventInterfaceId]` on any page; they are COM-plumbing decoration.
   - The package-internal `IServiceCreator` and `IServiceManagerInternal` interfaces (both `Private Interface` in `Interfaces.twin`) are pure marshalling-and-trampoline plumbing — **no doc page**, and do not surface the underscored implementing members on the concrete classes either.
   - The index landing page must walk the integration story: configure-during-`Sub Main` → install (elevated, one-time) → run-as-service (the `-startService` discriminator pattern) → service-thread `EntryPoint` reports running → `ChangeState` handles stop on the dispatcher thread. Cross-link the [`EventLog` composition-delegation idiom](docs/Reference/WinEventLogLib/EventLog.md) (the `Implements EventLog(Of …) Via …` pattern from `tbServiceTest2\Sources\SERVICES\TBSERVICE001.twin`) and the [`NamedPipeServer` service-host idiom](docs/Reference/WinNamedPipesLib/NamedPipeServer.md) (the `ManualMessageLoopEnter` / `Leave` pattern).
   - Omit the `vba_attribution: true` frontmatter flag — these pages are fully original (the package is MIT-licensed, same as every other Wayne Phillips package).
12. **Adapt content** (tbIDE `.twin` sources):
   - Every public symbol is either an **interface + CoClass pair** (the IDE implements the interface; the addin holds a reference typed at the CoClass) or, in one case, a concrete **`Class`** (`AddinTimer` — user-instantiated with `New`). Document the CoClass, not the underlying interface — users type their variables `As Host`, not `As IHostV1`. Fold the interface's members onto the CoClass page.
   - Do not list `[InterfaceId]`, `[ClassId]`, `[EventInterfaceId]`, `[CoClassId]`, `[Default]`, `[Default, Source]` on the page; they are COM-plumbing decoration.
   - The `[Description("…")]` attribute on most `Public` properties / methods / fields gives the user-visible IDE tooltip — use it as the basis for the entry, then expand. A handful of members have no `[Description]` (every property on `Themes`, several on `Editor` / `Toolbars` / `Editors`); for those, write fully original prose.
   - **`Public Interface I<X>V1 Extends stdole.IUnknown`** is the package's convention for the per-CoClass primary interface. `Extends stdole.IUnknown` is COM plumbing (the standard COM base interface) — do not surface; treat as if the interface had no base. The `V1` suffix is per-version; the CoClass declares `[Default] Interface I<X>V1` and the user types `As <X>`.
   - **Interface versioning**: two cases visible in the source — `IFileV1` → `IFileV2 Extends IFileV1` (V2 adds `ReadText`), and `IHostV1` paired with the four-step `ItbHostEventsV1` → `V2` → `V3` events chain. For `File`, document the V2 surface as a single `File.md` page — do not surface the V1/V2 split. For `Host`, fold all three event interfaces onto `Host.md` as a single events listing; the per-version split is a compile-vs-run-time compatibility detail, surfaced as a brief `> [!NOTE]` mentioning the `[AllowUnpopulatedVtableEntry]` mechanism but not enumerated per-event.
   - **`[AllowUnpopulatedVtableEntry]`** on `ItbHostEventsV2.OnChangedActiveEditor` and `ItbHostEventsV3.OnChangedTheme` is the compiler attribute that lets a newer addin compile against the newer events interface and still load against an older IDE that lacks the corresponding vtable slot — the IDE simply leaves the slot null and the addin never receives the event. Surface as a single sentence on `Host.md` together with the events listing: *"these events are tagged with the compile-time `[AllowUnpopulatedVtableEntry]` attribute so the addin works against older IDE builds that don't yet fire them"*.
   - **`[COMExtensible(True)]`** on `HtmlElementProperties` / `HtmlElementProperty` / `HtmlEventProperties` / `HtmlEventProperty` is **load-bearing** for the dynamic-DOM surface — the whole `.style.display = "flex"` shorthand depends on it. Surface on each of the four pages with a `> [!IMPORTANT]` callout: *"this interface is `[COMExtensible(True)]`; property names are resolved against the underlying DOM element at run time, so you may write any property name that the JavaScript-side element supports"*. Do not try to enumerate the resolved property surface — it's open-ended (every DOM property of the underlying tag + custom-widget extras like `.chart` / `.editor` / `.listview`).
   - **`[Hidden]`** on `IHtmlElementV1.AddEventListenerOLD1` marks an obsolete legacy method that the IDE retains for back-compatibility but doesn't want addins to call. **Do not document it**; the canonical method is `AddEventListener` (without the suffix).
   - **`[DefaultMember]`** on `Item` (in collection-like interfaces) is what makes `Editors(0)`, `Toolbars(0)`, `Folder("MyFile.twin")`, etc. work syntactically. Surface on the relevant `Item` entry with the prose *"this is the default member, so `editors(0)` is equivalent to `editors.Item(0)`"*. Similarly, `ToolWindow.RootDomElement` carries `[DefaultMember]` — that's what makes `myToolWindow("#dataEntry")` resolve to a CSS-style selector lookup (RootDomElement → its Properties bag → dynamic resolution).
   - **`[Unimplemented]`** on `IFileV1.Data` (Let) and `IFileV1.Text` (Let) means writing to the file is not currently supported. Surface as a `> [!NOTE]` on each Let-half saying the file system is read-only from the addin's perspective today.
   - **Nested enums** (`RevealArea` on `ICodeEditorV1`, `EditorOpenOptions` on `IEditorsV1`, `ReadTextFlags` on `IFileV2`, `FileSystemItemType` on `IFileSystemItemV1`, `VbBuildType` on `IProjectV1`, `DebuggerEvaluateOptions` on `IHostV1`) live on the declaring class's page — give each a short `## <EnumName>` section near the bottom with the value table, anchor each value with `{: #<EnumName>_<MemberName> }` for deep-linking from the using-class's parameter entries. Do not split into separate enum pages; the package is small enough that the navigation reads better with the enums in-place.
   - **Editor castability**: the source-side comment on `IEditorV1` (*"Castable to CodeEditor etc."*) is the contract — an `Editor` returned by `Host.ActiveEditors(0)` is actually a `CodeEditor` for code panes, and the cast `Dim ce As CodeEditor = editor` (or `TypeOf editor Is CodeEditor`) works because the underlying object implements both interfaces. Surface on `Editor.md` as a `> [!NOTE]` and demonstrate the guarded-cast pattern (sample 15's `GetActiveCodeEditorSelectedText` is the canonical example).
   - **`AddinTimer` is the only user-instantiable class** — every other CoClass is handed to the addin by the IDE. Surface this prominently on `AddinTimer.md` and on the index landing. The class uses the `Handles` syntax internally to re-arm the underlying Win32 timer whenever `Enabled` or `Interval` changes — surface as the user-visible behaviour (*"changing `Interval` at runtime takes effect immediately"*) rather than as an implementation note.
   - **Folder iteration is thread-sensitive** — surface the `[Description]` warnings on `Folder.Count` / `Folder.Item` verbatim with a `> [!IMPORTANT]` callout, and recommend for-each as the supported traversal pattern. Sample 15's `PopulateFolderResultsRecursive` is the canonical example to inline on `Folder.md`.
   - The package's `CHANGELOG.md` is a copy-paste error (header says "twinBASIC WinNativeForms"); **do not** propagate it to the docs. There is no usable version history in-package.
   - Omit the `vba_attribution: true` frontmatter flag — these pages are fully original (the package is MIT-licensed, same as every other Wayne Phillips package).
13. **Adapt content** (WinNativeCommonCtls `.twin` sources):
   - Each control is a `<Name>BaseCtl` (where every member is declared) plus a thin `<Name>` leaf (`Inherits <Name>BaseCtl`, tagged `[WindowsControl(...)]`). Document on the leaf's name and treat the split as invisible — same approach as CEF's `CefBrowser` / `CefBrowserBaseCtl`.
   - Walk `Inherits VB.BaseControl*` (one of `BaseControlFocusable` / `BaseControlFocusableNoFont` / `BaseControlNotFocusable` / `BaseControlNotFocusable2`) and its ancestors (`BaseControlRectDockable` → `BaseControlRect` → `BaseControl`, plus `BaseFont` for non-`NoFont` variants) to fold the inherited surface (`Name`, `Left`, `Top`, `Width`, `Height`, `Anchors`, `Dock`, `Visible`, `Enabled`, `BackColor` / `ForeColor` / `Font`, `Appearance`, `MousePointer` / `MouseIcon`, `ToolTipText`, `DragMode` / `DragIcon`, `Drag()`, `Refresh()`, `SetFocus()` for focusable, `ZOrder()`, `CausesValidation`, `TabIndex` / `TabStop` for focusable, `VisualStyles`, `hWnd`, `HelpContextID` / `WhatsThisHelpID`, …) into the control's Properties listing, same way VB-package and CEF / CustomControls control pages do.
   - List own + inherited members alphabetically within Properties / Methods / Events sections (mirror `CheckBox.md`).
   - The `[Description("…")]` attribute on each `Public` field / property / event gives the user-visible IDE one-liner — use it as the basis for the page entry, then expand. Some `[Description("")]` blocks are empty placeholders; write fully original prose for those.
   - Do not list `[ClassId]`, `[InterfaceId]`, `[EventInterfaceId]`, `[COMCreatable(False)]`, `[EventsUseDispInterface]`, `[ComImport(True)]`, `[CustomDesigner(...)]`, `[Serialize(...)]`, `[NonBrowsable(...)]`, `[WithDispatchForwarding]` on any page — they are all COM / designer plumbing.
   - **Do** mention `[WindowsControl(...)]` on the leaf class's intro paragraph as the marker that places the control on the form designer toolbox. **Do** mention `[Unimplemented]` (via `> [!NOTE]`) and `[Hidden]` (suppress the member entirely).
   - Sub-object classes (`ListImage`, `ListImages`, `ListItem`, `ListItems`, `ColumnHeader`, `ColumnHeaders`, `Node`, `Nodes`) are all `[COMCreatable(False)]` and constructed by their container — write the intro paragraph as *"reached via `<Container>.<Property>`"* and don't surface the constructor signature.
   - The collection classes (`ListImages`, `ListItems`, `ColumnHeaders`, `Nodes`) all have the same shape: `Count` property, `Item(Index|Key)` default member, `Add(…)`, `Clear`, `Remove`, plus `[Enumerator] Public Function _NewEnum() As stdole.IUnknown` for For-Each support. Document the shape consistently across all four pages.
   - The container's typed property is `As <Sub>BaseCtl` for cross-control parameters (e.g. `TreeView.ImageList As ImageListBaseCtl`, `ListView.Icons As ImageListBaseCtl`), but the user assigns the leaf type (`ImageList`). On the doc page, type the parameter as the **leaf** (`ImageList`) — the `BaseCtl` split is invisible to user code.
   - `TbImageListPrivate` / `TbListViewPrivate` / `TbTreeViewPrivate` interfaces (declared `[ComImport(True)] Interface` at the top of each control's `.twin`) are package-internal refcount / dispatch helpers — **no doc page**, and do not surface their `Protected ... Implements <Interface>.<Member>` half on the control's surface.
   - **Common surface to surface once per control**: `Opacity` (with the OS 6.2+ caveat), `TransparencyKey` (same caveat), `OLEDropMode` + the six OLE drag-drop events + `OLEDrag()` method (only when `FEATURE_OLEDRAGDROP` is enabled — currently always is in the shipping build, so include them), `Parent` (`As Object`), `Object` (`As Object`).
   - **Per-control nested enums**: list each on its declaring control's page under a `## <EnumName>` section near the bottom, with a value table and `{: #<EnumName>_<MemberName> }` anchors per row for deep-linking from properties / parameters using the enum. Do not split into separate `Enumerations/` pages — there are too many small enums and the navigation reads better with them in-place.
   - For `ListView.BorderStyle` and `TreeView.BorderStyle`: both use `TreeBorderStyleConstants` (declared in `TreeViewPublic`). Surface the enum on `Enumerations/TreeBorderStyleConstants.md`; from each control's `BorderStyle` entry, link to the shared enum.
   - The `Class_BeforeFirstMethodAccess` calling `[_HiddenModule].EnsureContainerIsLoaded(Me)` on every leaf is internal twinBASIC infrastructure; **do not** surface.
   - The leaf class has its own `[ClassId]` / `[InterfaceId]` distinct from the base class's `[ClassId]` / `[InterfaceId]`. Both are internal — don't document either.
   - Per-control idioms worth surfacing (see the WinNativeCommonCtls section above for the long list): `ImageList`'s bound-count guard against modification, `ListView`'s `View` / `Arrange` / `LabelEdit` interaction, `MonthView`'s `GetDayBold` callback event for highlighting holidays, `ProgressBar`'s three-axis configuration, `Slider`'s `SelStart` / `SelLength`, `TreeView`'s per-node `Sorted` overriding the control-level setting, `UpDown`'s lack of auto-buddy (manual partner-control wiring).
   - The `CHANGELOG.md` is a placeholder (single bullet for v0.0.1.0); use the LICENCE.md copyright year (2023) as the package version reference, not the WIP table.
   - Omit the `vba_attribution: true` frontmatter flag — these pages are fully original (the package is MIT-licensed, same as every other Wayne Phillips package).
14. **Flag tB deviations** with a `> [!NOTE]` callout (see next section).
15. **Update the parent index** (`<Package>/<Mod>/index.md`, `docs/Reference/VB/index.md`, `docs/Reference/WebView2/index.md`, `docs/Reference/Assert/index.md`, `docs/Reference/CustomControls/index.md` (and its `Styles/`, `Framework/`, `Enumerations/` sub-indices), `docs/Reference/CEF/index.md` (and its `Enumerations/` sub-index), `docs/Reference/WinEventLogLib/index.md`, `docs/Reference/WinNamedPipesLib/index.md`, `docs/Reference/WinServicesLib/index.md` (and its `Enumerations/` sub-index), `docs/Reference/tbIDE/index.md`, `docs/Reference/WinNativeCommonCtls/index.md` (and its `Enumerations/` sub-index, plus the per-container index pages for `ImageList/`, `ListView/`, `TreeView/`), `Reference/Statements.md`, or `Reference/Procedures and Functions.md`) — turn an unlinked bullet into a link with a short blurb. Match the existing style of the page. If a new package is being added, also extend `docs/Reference/Packages.md` to list it.
16. **Add the page** to `Reference/Statements.md` or `Reference/Procedures and Functions.md` if it's a statement or callable and not already listed there.
17. **Run the [site integrity check](#site-integrity-check)** after the batch and before committing.

## twinBASIC deviations from VBA to flag

Add a `> [!NOTE]` callout or rewrite the affected section when source diverges. Known cases:

- `Date`, `Date$`, `Time`, `Time$` are **properties** in twinBASIC, not functions/statements — see `docs/Reference/VBA/DateTime/Date.md` for the pattern.
- `Decimal` data type is reserved but not currently supported. Note where applicable.
- twinBASIC adds `Continue`, attribute syntax `[Documentation("...")]`, and other features documented under `docs/Features/`.
- Some VBA-Docs pages have Office-host-specific Application objects — irrelevant; omit.
- Mac-specific notes from VBA-Docs are typically irrelevant; trim.

When in doubt about a tB-specific behavior, check `docs/Features/` and `docs/Reference/index.md` before assuming VBA semantics carry over.

## Scripts and tooling

Any new helper script (content conversion, link checks beyond `check.bat`, etc.) should be written in **Python**. Do not add new Ruby code to this repo. The only Ruby allowed is the existing Jekyll/`just-the-docs` build chain (`Gemfile`, `Gemfile.lock`, `_plugins/`) — that stays as-is.

## Build / preview

From `docs/`:

- `bundle exec jekyll build` (or `build.bat`) — build to `_site/`.
- `bundle exec jekyll serve` (or `serve.bat`) — local server at `localhost:4000`.
- `check.bat` — link check (offline Lychee against `_site/`).

## Site integrity check

After a batch of changes, verify the site builds clean and all links resolve. From the `docs/` folder, run:

```sh
build.bat && check.bat
```

`check.bat` runs Lychee in offline mode against the built `_site/` tree — it catches broken intra-site links, missing pages, and malformed `redirect_from` entries (the most common breakage when adding new pages or moving content between sections). A clean run is the bar for "ready to commit".

Requires `build.bat` to have produced an up-to-date `_site/`.

## Repository Use

Favor concise one-line git commit messages.

## Don'ts

- Don't commit `.claude/` or `CLAUDE.md` — both gitignored. (`WIP.md` is committed; `CLAUDE.md` is just a local `@WIP.md` import shim.)
- Don't touch `_site/` (build output, gitignored).
- Don't push or force-push without explicit user request.
- Don't invent semantics — read the source file in `../VBA-Docs/` first. For twinBASIC-specific packages not documented in VBA-Docs, read the `.twin` sources under `..\tb-export\NewProject\Packages\<package>\Sources\` first.
- Don't add boilerplate sections (Remarks, See Also) if the source has nothing meaningful for them.
- **Never add `Co-Authored-By:` (or any "Co-authored by" / "Generated with Claude" / similar) trailers to commit messages.** Repository policy. Plain commit messages only.
