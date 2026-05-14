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

The three "winlibs" packages — [WinServicesLib](WIP.WinServicesLib.md), [WinEventLogLib](WIP.WinEventLogLib.md), and [WinNamedPipesLib](WIP.WinNamedPipesLib.md) — share a load-bearing set of integration idioms: composition-delegation on `EventLog(Of …)`, the `ManualMessageLoopEnter` / `Leave` pattern coupling `NamedPipeServer` to a service's `ChangeState` handler, and `PropertyBag` as the canonical pipe payload. When working on any of the three, check the other two for cross-references.

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
- Don't invent semantics — read the relevant primary source before paraphrasing (VBA-Docs for VBA-derived pages; the package's `.twin` sources for twinBASIC-specific ones).
- Don't add boilerplate sections (Remarks, See Also) if the source has nothing meaningful for them.
- **Never add `Co-Authored-By:` (or any "Co-authored by" / "Generated with Claude" / similar) trailers to commit messages.** Repository policy. Plain commit messages only.
