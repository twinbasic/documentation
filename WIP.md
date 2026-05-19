# twinBASIC Documentation — Working Notes

Jekyll site (`just-the-docs` theme) deploying to `docs.twinbasic.com`. Source under `docs/`.

## Status

Reference documentation is **complete** for all twelve packages, adapted from primary sources (Microsoft VBA-Docs CC-BY-4.0 for the runtime library, `.twin` source for the twinBASIC-specific packages). The CEF and WebView2 packages also carry a tutorial set.

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
| WinNativeCommonCtls                  | done        | —         |

The rest of this file is the maintenance guide for updating existing pages or adding new ones — high-level package surface notes, page templates, cross-section linking conventions, and the integrity check.

## Where things live

- `docs/Reference/Core/` — language statements/keywords (`Dim`, `For-Next`, `Sub`, ...).
- `docs/Reference/<Package>/<Mod>/` — runtime library (VBA, VBRUN), grouped by modules.
- `docs/Reference/<Package>/<Mod>/index.md` — module landing page listing its members.
- `docs/Reference/VB/<Class>.md` — single-file class page. No current VB class uses this shape; all VB classes are folder-style.
- `docs/Reference/VB/<Class>/index.md` — folder-style class page (e.g. [`CheckBox/index.md`](docs/Reference/VB/CheckBox/index.md), [`CheckMark/index.md`](docs/Reference/VB/CheckMark/index.md)).
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

## Package API notes

Per-package content-shape references live in sibling files. Open the relevant one when updating an existing page or adding a new one; the actual rendered docs under `docs/Reference/<Package>/` remain the source of truth.

- [WebView2 Package](WIP.WebView2.md) — the `WebView2` control + wrapper classes + `wv2…` enums.
- [Assert Package](WIP.Assert.md) — three sibling modules (`Exact` / `Strict` / `Permissive`) with identical 15-member APIs but different comparison semantics.
- [CustomControls Package](WIP.CustomControls.md) — eight `Waynes…` custom controls + shared `Styles/` helpers + `Framework/` DESIGNER surface + `Enumerations/`.
- [CEF Package](WIP.CEF.md) — the `CefBrowser` control + `EnvironmentOptions` sub-page + two enums; smaller surface than WebView2 (currently BETA).
- [WinEventLogLib Package](WIP.WinEventLogLib.md) — the generic `EventLog(Of T1, T2)` class + `EventLogHelperPublic` module + the message-table backing pattern.
- [WinNamedPipesLib Package](WIP.WinNamedPipesLib.md) — IOCP-based async pipe framework: server + client manager + per-side connection classes + the `Cookie` / transient-`Data()` / `ManualMessageLoop` idioms.
- [WinServicesLib Package](WIP.WinServicesLib.md) — thin OS-services wrapper: `Services` singleton + `ServiceManager` + `ServiceCreator(Of T)` + `ServiceState` + `ITbService` + four enums.
- [tbIDE Package](WIP.tbIDE.md) — the addin SDK (type-only compiler package): 23 CoClasses + `AddinTimer` + the HTML/DOM `[COMExtensible]` surface + samples 10–15 idiom map.
- [WinNativeCommonCtls Package](WIP.WinNativeCommonCtls.md) — VB6-compatible `MSCOMCTL.OCX` replacement: 8 controls + 8 sub-objects + per-control nested enums + 10 module-level enums.

The three "winlibs" packages — [WinServicesLib](WIP.WinServicesLib.md), [WinEventLogLib](WIP.WinEventLogLib.md), and [WinNamedPipesLib](WIP.WinNamedPipesLib.md) — share an essential set of integration idioms: composition-delegation on `EventLog(Of …)`, the `ManualMessageLoopEnter` / `Leave` pattern coupling `NamedPipeServer` to a service's `ChangeState` handler, and `PropertyBag` as the canonical pipe payload. When working on any of the three, check the other two for cross-references.

## Page template

Match the existing style. Worked examples to imitate:

- Core statement: `docs/Reference/Core/Const.md`, `docs/Reference/Core/Dim.md`, `docs/Reference/Core/Call.md`.
- VBA module function: `docs/Reference/VBA/Interaction/AppActivate.md`, `docs/Reference/VBA/Interaction/Beep.md`.
- VBA property with `Core/` redirect: `docs/Reference/VBA/DateTime/Date.md`.
- VBRUN module member: `docs/Reference/VBRUN/AmbientProperties/BackColor.md`, `docs/Reference/VBRUN/PropertyBag/index.md`.
- VB control class (folder-style; all current VB classes): `docs/Reference/VB/CheckBox/index.md`, `docs/Reference/VB/CheckMark/index.md`.
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

1. **Decide placement** — pick the package's section convention:
   - Pure language keyword (parsed by the compiler, no runtime call) → `docs/Reference/Core/`.
   - Runtime function/property → `docs/Reference/<Package>/<Mod>/`. Add `redirect_from: /tB/Core/<name>` so legacy `tB/Core/<name>` links still work.
   - VB control class → `docs/Reference/VB/<Class>.md` (single-file) or `docs/Reference/VB/<Class>/index.md` (folder-style).
   - WebView2 → `docs/Reference/WebView2/<Class>.md` (single-file) or `<Class>/index.md` (folder-style; the main `WebView2` class uses it). Enums under `WebView2/Enumerations/`; the one public Type under `WebView2/Types/`.
   - Assert module → `docs/Reference/Assert/<Mod>.md` — one page per module with all 15 members inline.
   - CustomControls control → single-file under `docs/Reference/CustomControls/<Control>.md`, or folder-style when a state-holder / options sub-page is required. Shared style helpers under `Styles/`, framework symbols under `Framework/`, enums under `Enumerations/`.
   - CEF → `docs/Reference/CEF/CefBrowser/index.md` (folder-style with the `EnvironmentOptions` sub-page); enums under `CEF/Enumerations/`.
   - WinEventLogLib / WinNamedPipesLib / WinServicesLib → flat, one page per public class under `docs/Reference/<Pkg>/<Class>.md`. WinServicesLib enums live under `WinServicesLib/Enumerations/`.
   - tbIDE → flat, one page per CoClass / Class under `docs/Reference/tbIDE/<Class>.md`; nested enums fold onto their declaring class's page (no `Enumerations/` sub-folder).
   - WinNativeCommonCtls → single-file (`DTPicker`, `MonthView`, `ProgressBar`, `Slider`, `UpDown`) or folder-style (`ImageList/`, `ListView/`, `TreeView/`) when the control has sub-object companions. Module-level enums under `Enumerations/`; per-control nested enums fold onto the declaring control's page.
   - Pick `<Mod>` from VBA's grouping (Information, Interaction, Strings, FileSystem, DateTime, Math, Financial, Conversion, ...) and the existing folders under `Reference/<Package>/`.
2. **Flag tB deviations** with a `> [!NOTE]` callout (see next section).
3. **Update the parent index** — turn an unlinked bullet into a link with a short blurb. Match the existing style of the page. If a new package is being added, also extend `docs/Reference/Packages.md` to list it.
4. **Add the page** to `Reference/Statements.md` or `Reference/Procedures and Functions.md` if it's a statement or callable and not already listed there.
5. **Run the [site integrity check](#site-integrity-check)** after the batch and before committing.

## twinBASIC deviations from VBA to flag

Add a `> [!NOTE]` callout or rewrite the affected section when source diverges. Known cases:

- `Date`, `Date$`, `Time`, `Time$` are **properties** in twinBASIC, not functions/statements — see `docs/Reference/VBA/DateTime/Date.md` for the pattern.
- `Decimal` data type is reserved but not currently supported. Note where applicable.
- twinBASIC adds `Continue`, attribute syntax `[Documentation("...")]`, and other features documented under `docs/Features/`.
- Some VBA-Docs pages have Office-host-specific Application objects — irrelevant; omit.
- Mac-specific notes from VBA-Docs are typically irrelevant; trim.

When in doubt about a tB-specific behavior, check `docs/Features/` and `docs/Reference/index.md` before assuming VBA semantics carry over.

## Plain-English prose

The audience is international: standard-English readers worldwide, often non-native, who may not parse idiomatic software-developer jargon. Use plain English in reference and tutorial prose.

The guiding principle: **replace metaphors imported from outside programming; keep vocabulary with a specific technical meaning inside Win32 / COM / event-driven programming.** If a phrase is the kind of thing a reader would have to look up in a tech blog, it doesn't belong in reference prose.

### Sentence and structure

The vocabulary tables further down cover word choice. The rules in this subsection cover sentence shape and voice — the structural side of writing for an international audience.

1. **Page opening.** One-sentence verb-phrase summary directly under the H1, in present tense, no preamble. *Good:* "Activates an application window." / "Writes an **Error**-type entry to the log." *Avoid:* "The **Const** statement is used to declare constants in place of literal values." For class pages, a noun-phrase descriptor is acceptable — *"A **CheckBox** is a Win32 native control that displays..."*

2. **Voice and tense.** Active voice by default. Passive only for subjectless operations where there is no obvious agent — "the entry is written", "the constant is private by default". Present tense for behavior — `returns`, not `will return`. Don't give the class human traits: it doesn't "decide", "want", or "know" — it returns, raises, contains.

3. **Sentence shape.** One idea per sentence. Prefer two short sentences over one compound sentence with nested clauses. Em-dash (`—`) for parenthetical asides; reserve parentheses for code-ish notation like `(default)`.

4. **Person and pronouns.** Reference body prose uses third-person impersonal — "the constant", "the source", "the entry". Rewrite "you" to the impersonal form even in VBA-derived pages. "You" is acceptable inside `Example` lead-ins and in tutorial prose. Avoid first-person ("we", "I").

5. **Parameter descriptions.** Italic `*required*` / `*optional*` flag, then a short prose description. Lead with the type when it matters — "A **String** naming the source...", "A *T1* value naming the event...". Don't restate the parameter's name inside its own definition. Property setters omit the flag — the `[ = *value* ]` brackets on the syntax line carry that information.

6. **Callout severity.** Three severity levels, used distinctly:
   - `> [!NOTE]` — twinBASIC-vs-VBA deviations, behavior clarifications, useful caveats. Not for marketing/why-bother prose — that should be a plain paragraph.
   - `> [!IMPORTANT]` — requirements that affect correctness: admin rights, threading constraints, ordering.
   - `> [!WARNING]` — operations that can corrupt state or lose data.

   One callout per concern; don't stack a NOTE and an IMPORTANT for the same point.

7. **See Also.** Last section on the page, after `Example`. Format: `- [Symbol](Symbol) <noun>` where `<noun>` is the kind: statement, function, property, method, class, module, package. Pages with annotations use `- [Symbol](Symbol) -- short description` — the `--` source renders as a typographic dash via kramdown's smart_quotes (en-dash for `--`, em-dash for `---`). Don't write literal `—` in source; keep `--` for consistency across the docs. Order by conceptual proximity, not strict alphabetical.

### Replace

| Term | Use instead |
|------|-------------|
| `at rest` (idle state) | idle, in its default state |
| `bake in` / `baked into` | embedded, stored, included |
| `broker` (as verb) | manages, handles |
| `carry` / `carries` (figurative) | has, contains, includes |
| `catches up` | resumes, processes the queue |
| `comes up` (a connection) | is established, becomes ready |
| `drive` / `driven` (figurative) | controlled by, determined by, powered by |
| `for free` (figurative) | as a side effect, without extra effort |
| `hand off` / `hand over` / `hand back` | returns, passes, delivers |
| `hand-rolled` | manually constructed, custom-built |
| `handful` / `handy` | a few; useful |
| `heavy hitter` / `heavy-hitter` (figurative) | main items, biggest items, most significant |
| `in flight` / `in-flight` | pending, in progress |
| `in one shot` | in a single call |
| `in order to` | to |
| `kick off` / `kicks off` | start, begin |
| `land` (figurative — "where the call lands") | appears, arrives, ends up at |
| `leverage` / `leveraging` | use, take advantage of |
| `load-bearing` (figurative) | essential, critical, central |
| `mid-call` | during the call |
| `on the wire` | transmitted, over the network |
| `orchestration` / `orchestrate` | coordination, manual handling |
| `picks up` (figurative) | receives, reads, captures, inherits |
| `pinned to` (UI layout) | attached to, fixed to |
| `reach for` / `reaching into` | use, access |
| `sensible defaults` | reasonable defaults, or list them inline |
| `spin up` / `spins up` | start, create |
| `stash` (as verb) | store, save |
| `sticks` (figurative — "the zoom sticks") | is preserved, is retained |
| `surface` (as verb) | expose, appear as, make available, raise |
| `surface area` (figurative API surface) | set of members, interface |
| `swallow` (a keystroke) | consume, discard |
| `taps into` | hooks into, intercepts |
| `tear down` (figurative) | destroy, unload |
| `twirling` (UI animation) | spinning, or describe concretely |
| `under the hood` | internally |
| `utilize` | use |
| `walk` (as verb — "walk the chain", "walks the children") | traverse, go through, iterate over |
| `walks through` (tutorials) | demonstrates, explains, describes step by step |
| `wire up` / `wired up` / `wired in` | connect, attach, link |

### Delete outright

Vague compliments that add no information. Be concrete instead — if a feature is fast, say what it is faster than; if an API is small, say how many members it has.

- `powerful`
- `robust`
- `clean` (as a vague compliment — "clean architecture"; literal uses like "clean shutdown" stay)
- `rich` (vague — "rich information"; literal "Rich Text Format" stays)
- `easily` (filler — "easily share" → "share")

### Keep as-is

Don't over-correct these — they are precise technical vocabulary or otherwise pull their weight:

- **Programming / Win32 / COM:** `no-op`, `round-trip` / `round-tripping`, `fire-and-forget`, `marshal` / `marshalled` (between threads), `pump` (messages) / `message pump`, `spawn` (a thread or process), `mixin`, `first-class` (type), `boilerplate`, `falls through`, `short-circuit`, `idiom` / `idiomatic`, `canonical`.
- **Standard prose:** `ends up`, `modern`, `lightweight`, `talk to` (interop), `out of the box`, `on the fly`, `work around` / `workaround`.
- **Vivid but tolerable:** `ship` / `ships with`, `bridge` (figurative), `cascade` (figurative), `fold in` (compile-time emit).
- **Audience-appropriate VB6 vocabulary:** `drop it onto a form`.
- **Marketing register (Videos section only — promotional copy):** `sneak peek`, `game-changing`, `drop-in`, `seamless`.

### Anchors

Some kept terms are referenced by in-doc anchors. The most prominent is `idiom` / `idiomatic` — `WIP.WinEventLogLib.md` and `WIP.WinServicesLib.md` reference anchors like `#service-host-idiom` and `#composition-delegation-idiom`. Don't rename these casually; if you do, add `redirect_from` aliases to preserve legacy links.

### Source dashes

Kramdown's `smart_quotes` feature (enabled by default in this site) converts the ASCII source forms to typographic characters at build time:

| Source | Rendered | Use for |
|--------|----------|---------|
| `--`   | en-dash `–`  | bullet-list separator (rule 7), ranges |
| `---`  | em-dash `—`  | parenthetical asides (rule 3), breaks in thought |

The source uses the ASCII forms; the rendered HTML uses the typographic characters. Literal `–` or `—` in `docs/` markdown source is forbidden — see the Don'ts at the end of this file. `scripts/convert_em_dash_separators.py` is the canonical normaliser if any literals slip back in.

WIP.md itself (and other files outside `docs/`) is not part of the Jekyll site and is exempt — literal em-dashes here render directly in the GitHub viewer, which is fine.

## Scripts and tooling

**Anything that participates in rendering the online site, the offline site, or the PDF book is handled by Jekyll** — Liquid templates, includes, layouts, data files (`_data/*.yml`), and Ruby plugins under `_plugins/`. Build-time concerns tightly coupled to Jekyll's internal model (URL knowledge, page model, render order, `site.data` injection) belong in a `_plugins/*.rb` plugin. Existing examples: `_plugins/offlinify.rb` (the offline-site link rewriter) and `_plugins/build-info.rb` (the git commit-hash capture that stamps the PDF title page). Adding a Python pre-build step that writes a YAML file into `_data/` and then invokes Jekyll is **not** the way — `bundle exec jekyll build` and `book.bat` must remain self-contained.

Python scripts are reserved for non-render concerns: one-off content conversion (e.g. `scripts/convert_em_dash_separators.py`), repo audits, dev tooling, link checks beyond `check.bat`, anything that runs *outside* a Jekyll build. They should never be a prerequisite for the render pipeline.

## Build / preview

From `docs/`:

- `bundle exec jekyll build` (or `build.bat`) — builds three trees in a single Jekyll run: the online copy at `_site/`, a `file://`-browsable copy at `_site-offline/`, and the sparse pagedjs source at `_site-pdf/`. The offline pass (`_plugins/offlinify.rb`, activated by `also_build_offline: true` in `_config.yml`) adds ~3-5s and the PDF pass (`_plugins/pdfify.rb`, activated by `also_build_pdf: true`) adds <1s on top of the normal ~13s build. The PDF plugin captures `book.html`'s rendered output (the concatenated chapter document built via `_layouts/book-combined.html`) at `:pages, :post_render`, drops the page from `site.pages` at `:site, :post_render` so `_site/book.html` is never written, and at `:site, :post_write` writes the captured bytes into `_site-pdf/book.html` along with `assets/css/print.css`, `assets/css/rouge.css`, and every relative `<img src=>` target -- just what pagedjs needs to render the book PDF. The companion `offline_exclude: [..., book.html]` entry in `_config.yml` keeps `offlinify.rb` from copying book.html into `_site-offline/`: offlinify's per-page hook fires before pdfify's `:site, :post_render` (Jekyll fires every per-page hook before any site-level post-render hook), so during offlinify's pass `book.html` is still in `site.pages` and the exclude is what makes it skip writing the offline copy. When `also_build_pdf: false` the exclude does the same job from a different angle -- pdfify never runs, `book.html` renders normally to `_site/`, and the exclude still keeps it out of `_site-offline/`. After Jekyll's WRITE phase, the offline plugin walks `_site/`, copies binary assets verbatim into `_site-offline/`, and for each HTML and CSS file rewrites every root-absolute `href` / `src` / `url()` to a page-relative path with the resolved file extension (`/FAQ` → `../../FAQ.html`, `/Tutorials/CEF/` → `../../Tutorials/CEF/index.html`). It also patches the offline copy of `assets/js/just-the-docs.js` in two places — `navLink()` to match the active nav entry by resolved DOM `link.href` rather than `document.location.pathname` (the upstream pathname-vs-attribute compare returns no match under `file://`, leaving the sidebar with no `.active` class so the nav appears collapsed on every navigation), and `initSearch()` to read the lunr index from `window.SEARCH_DATA` rather than fetching `search-data.json` over `XMLHttpRequest` (XHR to `file://` resources is blocked by browsers; classic `<script src=>` is not). To support that, the plugin (a) generates `_site-offline/assets/js/search-data.js` once per build by wrapping the rendered `search-data.json` in `window.SEARCH_DATA = {...};`, and (b) injects two `<script>` tags per page right before `just-the-docs.js`: one that sets `window.OFFLINE_SITE_ROOT` to the per-page relative prefix to the offline site root, and one that loads `search-data.js`. The patched `initSearch()` rewrites every `doc.url` from a root-absolute permalink (`/tB/Core/Const`) to a page-relative path (`<OFFLINE_SITE_ROOT>tB/Core/Const.html`) so search-result clicks land on the actual file regardless of which page the user is on.
- `bundle exec jekyll serve` (or `serve.bat`) — local server at `localhost:4000`. Note that `_site-offline/` is also produced on the initial build, but live-reload only updates `_site/`; manual rebuild needed for offline updates.
- `check.bat` — link check (offline Lychee against `_site/`).
- `book.bat` — renders the PDF from `_site-pdf/book.html` via `pagedjs-cli` into `_pdf/book.pdf`. Run `build.bat` first to populate `_site-pdf/`.

The HTML whitespace compression that wraps every page's render chain is handled by `_plugins/html-compress.rb` rather than the just-the-docs theme's `vendor/compress.html` Liquid layout — see [_plugins/html-compress.md](docs/_plugins/html-compress.md) for the full writeup. The Liquid layout's per-page cost in the profile was ~2.4s of Liquid filter dispatch (a `split: " " | join: " "` over the outside-of-`<pre>` content, lowering to a per-page Array allocation of every whitespace-delimited token across 837 pages — millions of small `String` objects). The layout is short-circuited via `compress_html.ignore.envs: all` in `_config.yml`; it then outputs a bare `{{ content }}` and the plugin takes over at `:pages, :post_render` / `:documents, :post_render` with `priority :high`, doing the same pre-block-protected whitespace collapse via `content.split(PRE_BLOCK_RE).each { |s| s.split(" ").join(" ") }` in C-implemented Ruby. The `priority :high` annotation places this hook before offlinify and pdfify (both `:normal`) so they see the compressed bytes. Pages whose layout chain doesn't reach `vendor/compress` are gated out via a `:site, :pre_render` precompute that walks `site.layouts[name].data["layout"]` for every layout key and marks the entire compress-reaching chain (default → table_wrappers → vendor/compress) -- jekyll-redirect-from stubs, the SCSS-derived CSS pages, `assets/js/zzzz-search-data.json`, and `book.html` (which uses the minimal `book-combined` layout that has no parent) all stay un-gated and pass through verbatim, matching exactly what the Liquid layout would have processed. Output is byte-identical to the layout-based version: a recursive `diff -rq` of `_site/` against a vendor/compress.html baseline reports zero differences across all ~840 HTML pages, 290 redirect stubs, every CSS / JSON / SVG / image asset. The plugin's correctness depended on two non-obvious details that broke an earlier cut -- the layout-chain walk has to compare against the layout *key* (`"vendor/compress"`) rather than `layout.name` (which carries the `.html` extension), and the per-segment `split(" ").join(" ")` strips trailing whitespace that the Liquid layout's *template* re-adds via its trailing-newline source character, so the plugin captures `content.end_with?("\n")` before the split and re-appends a `\n` after the join. Both regressions surfaced as nonzero `diff -rq` counts during development and are flagged in the plugin's header comment and [_plugins/html-compress.md](docs/_plugins/html-compress.md).

### Profiling the build

Two profilers are wired in for diagnosing slow builds. Both run a full Jekyll build with all three trees (`_site/`, `_site-offline/`, `_site-pdf/`) and write results into `_profile/out/` (gitignored).

- `profile-rbspy.bat` — sampling profiler (99 Hz, ~1.7x slowdown). Writes `_profile/out/jekyll-build.speedscope.json`. Drop into [speedscope.app](https://www.speedscope.app/) for timeline / sandwich / left-heavy views — the closest thing to vernier's Firefox-profiler UI you can get on Windows. Requires `_profile/rbspy.exe` (gitignored, ~6 MB); on a fresh checkout grab it from rbspy's [GitHub releases](https://github.com/rbspy/rbspy/releases) — the `rbspy-x86_64-pc-windows-msvc.exe.zip` asset, renamed to `rbspy.exe` and placed in `_profile/`.
- `profile-rubyprof.bat` — instrumentation profiler (TracePoint-based, ~2.2x slowdown). Writes `_profile/out/callgrind.out.*` (open in KCachegrind / QCachegrind), plus `jekyll-build.flat.txt` and `jekyll-build.graph.txt` for quick text-based inspection. Activated by `gem "ruby-prof", force_ruby_platform: true` in the Gemfile — the platform-precompiled gem ships no `.so` for Ruby 3.4+ on `x64-mingw-ucrt`, so the extension is built from source at `bundle install` time.

The shared runner `_profile/build.rb` invokes `Jekyll::Commands::Build.process({})` directly. rbspy's `CreateProcess`-based launcher on Windows cannot resolve the `bundle.cmd` / `bundle.bat` shims, so both wrappers spawn `ruby.exe` against this script rather than going through `bundle exec`. `_profile/profile.rb` wraps the same `build.rb` in a `RubyProf::Profile`. Neither wrapper auto-activates inside normal `build.bat` / `serve.bat` runs.

The first useful finding from a baseline profile: `Offlinify#rewrite_html!` is the single largest non-library hotspot (~6% self-time, ~3s of a ~30s instrumented build), with `Offlinify#compute_relative` a distant second; everything else is Liquid rendering (`BlockBody#render`, `Context#evaluate`, `Variable#render`) inside the Jekyll/Liquid stack itself.

## Site integrity check

After a batch of changes, verify the site builds clean and all links resolve. From the `docs/` folder, run:

```sh
build.bat && check.bat
```

`check.bat` runs Lychee in offline mode against the built `_site/` tree — it catches broken intra-site links, missing pages, and malformed `redirect_from` entries (the most common breakage when adding new pages or moving content between sections). A clean run is the bar for "ready to commit".

Requires `build.bat` to have produced an up-to-date `_site/`.

The build itself includes an additional guard: `_plugins/nav-integrity-check.rb` runs during the GENERATE phase and aborts the build if any nav-visible page has a `parent:` (or `parent:` + `grand_parent:`) that does not resolve to exactly one page in the nav tree. It catches two failure modes:

- **Ambiguity** — multiple pages share the title declared in `parent:` and `grand_parent:` is either absent or insufficient to disambiguate. The page would silently appear under every matching parent.
- **Orphan** — no page has the title declared in `parent:`. The page would silently disappear from the navigation sidebar.

## Repository Use

Favor concise one-line git commit messages.

## Don'ts

- Don't commit `.claude/` or `CLAUDE.md` — both gitignored. (`WIP.md` is committed; `CLAUDE.md` is just a local `@WIP.md` import shim.)
- Don't touch `_site/` or `_site-offline/` (build outputs, gitignored).
- Don't write literal en-dash `–` or em-dash `—` in `docs/` markdown source. Use `--` (renders as en-dash) or `---` (renders as em-dash) — kramdown's smart_quotes does the conversion at build time. `scripts/convert_em_dash_separators.py` normalises any strays.
- Don't push or force-push without explicit user request.
- Don't invent semantics — read the relevant primary source before paraphrasing (VBA-Docs for VBA-derived pages; the package's `.twin` sources for twinBASIC-specific ones).
- Don't add boilerplate sections (Remarks, See Also) if the source has nothing meaningful for them.
- **Never add `Co-Authored-By:` (or any "Co-authored by" / "Generated with Claude" / similar) trailers to commit messages.** Repository policy. Plain commit messages only.
