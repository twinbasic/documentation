# twinBASIC Documentation — Working Notes

Jekyll site (`just-the-docs` theme) deploying to `docs.twinbasic.com`. Source under `docs/`.

## Status

Initial reference documentation is **complete**. All eight packages have full reference coverage adapted from primary sources (Microsoft VBA-Docs CC-BY-4.0 for the runtime library, `.twin` source for the twinBASIC-specific packages); the CEF and WebView2 packages also carry a tutorial set.

| Package                              | Reference | Tutorials |
|--------------------------------------|-----------|-----------|
| VBA package                          | done      | —         |
| VBRUN package                        | done      | —         |
| VB package                           | done      | —         |
| WebView2Package                      | done      | done      |
| Assert package                       | done      | —         |
| CustomControls / CustomControlsPackage | done    | —         |
| cefPackage (CEF)                     | done      | done      |
| WinEventLogLib                       | done      | —         |

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
etc.
```

For the CEF package, the examples live in a different folder:

```
..\tbrepro\cef\CEFSampleProject\Sources\                        ← four worked examples + MainForm
```

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

Skeleton:

````markdown
---
title: <Symbol>
parent: <Statements | Procedures and Functions | <Mod> Module | <Package> Package>
# Pick the permalink that matches the section:
#   Core            → /tB/Core/<Symbol>
#   VBA module      → /tB/Modules/<Mod>/<Symbol>           (legacy URL scheme retained)
#   VBRUN module    → /tB/Packages/VBRUN/<Mod>/<Symbol>
#   VB class        → /tB/Packages/VB/<Class>              (or /tB/Packages/VB/<Class>/ for folder-style)
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
| `Core/X`                                   | VBA `Modules/<Mod>/Y`                       | `[Y](../Modules/<Mod>/Y)`                  |
| `Core/X`                                   | VBRUN `Packages/VBRUN/<Mod>/Y`              | `[Y](../Packages/VBRUN/<Mod>/Y)`           |
| `Core/X`                                   | VB `Packages/VB/Y`                          | `[Y](../Packages/VB/Y)`                    |
| `Core/X`                                   | WebView2 `Packages/WebView2/Y`       | `[Y](../Packages/WebView2/Y)`       |
| `Core/X`                                   | Assert `Packages/Assert/<Mod>`              | `[Y](../Packages/Assert/<Mod>)`            |
| `Core/X`                                   | CC `Packages/CustomControls/Y`              | `[Y](../Packages/CustomControls/Y)`        |
| `Core/X`                                   | CEF `Packages/CEF/Y`                        | `[Y](../Packages/CEF/Y)`                   |
| `Core/X`                                   | WinEventLogLib `Packages/WinEventLogLib/Y`  | `[Y](../Packages/WinEventLogLib/Y)`        |
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
10. **Flag tB deviations** with a `> [!NOTE]` callout (see next section).
11. **Update the parent index** (`<Package>/<Mod>/index.md`, `docs/Reference/VB/index.md`, `docs/Reference/WebView2/index.md`, `docs/Reference/Assert/index.md`, `docs/Reference/CustomControls/index.md` (and its `Styles/`, `Framework/`, `Enumerations/` sub-indices), `docs/Reference/CEF/index.md` (and its `Enumerations/` sub-index), `docs/Reference/WinEventLogLib/index.md`, `Reference/Statements.md`, or `Reference/Procedures and Functions.md`) — turn an unlinked bullet into a link with a short blurb. Match the existing style of the page. If a new package is being added, also extend `docs/Reference/Packages.md` to list it.
12. **Add the page** to `Reference/Statements.md` or `Reference/Procedures and Functions.md` if it's a statement or callable and not already listed there.
13. **Run the [site integrity check](#site-integrity-check)** after the batch and before committing.

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
