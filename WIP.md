# twinBASIC Documentation — Working Notes

Static site (`just-the-docs` theme look-and-feel) deploying to `docs.twinbasic.com`. Source under `docs/`, build pipeline (`tbdocs`) under [builder/](builder/).

## Status

Reference documentation is **complete** for all thirteen packages, adapted from primary sources (Microsoft VBA-Docs CC-BY-4.0 for the runtime library, `.twin` source for the twinBASIC-specific packages). The CEF and WebView2 packages also carry a tutorial set.

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
| AppGlobalClassObject                 | done        | —         |

The rest of this file is the maintenance guide for updating existing pages or adding new ones — high-level package surface notes, page templates, cross-section linking conventions, and the integrity check.

## Where things live

> **Packages are nested one level deeper than a bare `docs/Reference/<Package>/`.**
> `58a5e1c` split them into `docs/Reference/Default/` --- the three packages every
> project references (`VB`, `VBA`, `VBRUN`) --- and `docs/Reference/Built-In/` --- the ten
> that ship with the IDE but are referenced on demand (`AppGlobalClassObject`, `CEF`,
> `CustomControls`, `TwinBasicAssertions`, `WebView2`, `WinEventLogLib`,
> `WinNamedPipesLib`, `WinNativeCommonCtls`, `WinServicesLib`, `tbIDE`). `Core/` did
> not move.
>
> **The reorg moved files, not URLs.** Every `permalink:` is unchanged, so the
> [Cross-section linking](#cross-section-linking) tables below are unaffected --- they
> resolve against the rendered URL, never the file path. Only the on-disk paths in this
> section and in [Per-symbol workflow](#per-symbol-workflow) carry the prefix.
>
> Note also that the `Assert` package's folder is `Built-In/TwinBasicAssertions/`,
> though its title, nav parent and permalinks all still say `Assert`.

- `docs/Reference/Core/` — language statements/keywords (`Dim`, `For-Next`, `Sub`, ...).
- `docs/Reference/Default/<Package>/<Mod>/` — runtime library (VBA, VBRUN), grouped by modules.
- `docs/Reference/Default/<Package>/<Mod>/index.md` — module landing page listing its members.
- `docs/Reference/Default/VB/<Class>.md` — single-file class page. No current VB class uses this shape; all VB classes are folder-style.
- `docs/Reference/Default/VB/<Class>/index.md` — folder-style class page (e.g. [`CheckBox/index.md`](docs/Reference/Default/VB/CheckBox/index.md), [`CheckMark/index.md`](docs/Reference/Default/VB/CheckMark/index.md)).
- `docs/Reference/Built-In/WebView2/` — WebView2 package: the **WebView2** control class plus its small wrapper classes (request / response / headers / environment options) and the `wv2…` enumerations.
- `docs/Reference/Built-In/CustomControls/` — CustomControls package: the eight **Waynes…** custom controls, their shared `Styles/` helper classes (`Fill`, `Borders`, `Corners`, `TextRendering`, …), the `Framework/` DESIGNER surface (interfaces, CoClasses, the `Canvas` / `SerializeInfo` UDTs), and the `Enumerations/` (`CornerShape`, `FillPattern`, `DockMode`, …).
- `docs/Reference/Built-In/CEF/` — CEF (Chromium Embedded Framework) package: the **CefBrowser** control, its `EnvironmentOptions` sub-page, and the two user-facing enumerations (`CefLogSeverity`, `cefPrintOrientation`). This is a much smaller surface than WebView2 — the package is currently BETA and many WebView2-equivalent features are not yet exposed.
- `docs/Reference/Built-In/WinEventLogLib/` — Windows Event Log package: the generic `EventLog(Of T1, T2)` class and the `EventLogHelperPublic` module with its single `RegisterEventLogInternal` helper. Three pages total — `index.md`, `EventLog.md`, `EventLogHelperPublic.md`.
- `docs/Reference/Built-In/WinNamedPipesLib/` — Windows Named Pipes package: the IOCP-based async pipe framework — `NamedPipeServer` + `NamedPipeServerConnection` on the server side, `NamedPipeClientManager` + `NamedPipeClientConnection` on the client side. Five pages total (`index.md` + one per class).
- `docs/Reference/Built-In/WinServicesLib/` — Windows Services package: a thin OS-services wrapper. `Services` (predeclared singleton) coordinates one or more `ServiceManager` configurations; `ServiceCreator(Of T)` is the generic factory the dispatcher uses to instantiate each user-defined `ITbService` class; `ServiceState` is a read-only state snapshot for an installed service. Four public enums (`ServiceTypeConstants`, `ServiceStartConstants`, `ServiceControlCodeConstants`, `ServiceStatusConstants`) live under `Enumerations/`.
- `docs/Reference/Built-In/WinNativeCommonCtls/` — Windows Native Common Controls compatibility package: a VB6-compatible Microsoft Common Controls 6.0 (`MSCOMCTL.OCX`) replacement, written on top of the Win32 ComCtl32 controls. Eight controls (**DTPicker**, **ImageList**, **ListView**, **MonthView**, **ProgressBar**, **Slider**, **TreeView**, **UpDown**), plus eight sub-object classes (**ListImages** / **ListImage**, **ListItems** / **ListItem**, **ColumnHeaders** / **ColumnHeader**, **Nodes** / **Node**) reached through container properties on the three collection-bearing controls, plus ~16 user-facing enumerations. Each control is a `<Name>BaseCtl` (`[COMCreatable(False)]`) plus a thin `<Name>` leaf tagged `[WindowsControl(...)]` — the same split VB-package and CEF use.
- `docs/Reference/Built-In/AppGlobalClassObject/` — the `App` global object available in every twinBASIC project: the `_App` interface plus its property pages under `_App/` (`Build`, `Comments`, `CompanyName`, `EXEName`, …). 38 files.

  > **This package published nothing at all until it was fixed**, and the two
  > causes are both worth knowing about.
  >
  > The 37 pages under `_App/` were swallowed by a blanket `**/_*/**` rule in
  > `_config.yml`'s `exclude:`, which existed to drop `_Images`. The twinBASIC
  > interface really is named `_App`, after the COM hidden-interface convention,
  > so the folder name and the build convention collided. The rule is now scoped
  > to `**/_Images/**` (plus `**/*.af`), and underscore-prefixed *pages* such as
  > `CustomControls/Framework/_CustomControlContext.md` were never affected --
  > the pattern matches a directory.
  >
  > Separately `index.md` carried a UTF-8 BOM, which sits in front of the `---`
  > and stops `gray-matter` recognising any frontmatter. `discover` then filed it
  > as a *static file*, so its raw markdown was copied into the output tree and
  > served verbatim on the live site, frontmatter keys and all. `discover.mjs`
  > now strips a leading BOM before parsing, so no source file can fail that way
  > again; editors on Windows add one without being asked.
- `docs/Reference/Built-In/tbIDE/` — IDE Extensibility package (this is the **addin SDK**). The package is type-only — it ships **public interfaces + CoClasses** that an addin DLL binds to; every implementation behind them lives in the twinBASIC IDE itself. The user-facing surface is one entry-point factory (`tbCreateCompilerAddin`) plus 23 CoClasses grouped by role: the addin contract (`AddIn`), the root API (`Host`), the loaded `Project`, the editors collection (`Editor` / `CodeEditor` / `Editors`), the virtual file system (`FileSystem` / `FileSystemItem` / `Folder` / `File`), the in-IDE UI surface (`Toolbar` / `Toolbars` / `Button` / `ToolWindow` / `ToolWindows`), the HTML DOM inside a tool window (`HtmlElement` / `HtmlElements` / `HtmlElementProperty` / `HtmlElementProperties` / `HtmlEventProperty` / `HtmlEventProperties`), the `DebugConsole`, `KeyboardShortcuts`, `Themes`, and the single concrete user-instantiable helper class `AddinTimer`. Flat layout — one page per CoClass / Class plus the index landing.
- `docs/Reference/Statements.md` — alphabetical index of language statements.
- `docs/Reference/Procedures and Functions.md` — alphabetical index of procedures/functions.
- Footer rendering — [builder/template.mjs](builder/template.mjs)'s `renderFooterCustom()` renders the copyright line and, when `vba_attribution: true` is set in a page's frontmatter, an additional CC-BY-4.0 attribution line beneath it.
- Contributor authoring guide — [docs/Documentation/Authoring.md](docs/Documentation/Authoring.md) is the public "start here" page that distils this file's authoring conventions (page template, heading levels, formatting, plain-English prose, attribution policy, cross-section linking) for a new contributor. This file remains the exhaustive maintainer source of truth; keep the two in sync when a convention changes.

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
- VBA module function: `docs/Reference/Default/VBA/Interaction/AppActivate.md`, `docs/Reference/Default/VBA/Interaction/Beep.md`.
- VBA property with `Core/` redirect: `docs/Reference/Default/VBA/DateTime/Date.md`.
- VBRUN module member: `docs/Reference/Default/VBRUN/AmbientProperties/BackColor.md`, `docs/Reference/Default/VBRUN/PropertyBag/index.md`.
- VB control class (folder-style; all current VB classes): `docs/Reference/Default/VB/CheckBox/index.md`, `docs/Reference/Default/VB/CheckMark/index.md`.
- Assert module page (single-file, all members inline): `docs/Reference/Built-In/TwinBasicAssertions/Exact.md`.
- CEF control class (folder-style with a sub-page): `docs/Reference/Built-In/CEF/CefBrowser/index.md` + `docs/Reference/Built-In/CEF/CefBrowser/EnvironmentOptions.md`.
- Generic class (single-file, `(Of T1, T2)`): `docs/Reference/Built-In/WinEventLogLib/EventLog.md`.
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

## Example

This example...

```tb
' code
```

## See Also

- [Other](OtherSymbol)
````

Formatting conventions:

- Heading levels: the page title is `#` (a *chapter* -- a page may legitimately have more than one). Top-level sections (Example, See Also, ...) are `##`; subsections `###`. Do **not** skip `##` with the old `# Title` -> `### Example` "house style". That pattern (h1 straight to h3) exists on many older pages only to keep GitHub's raw-markdown view at a modest heading size; it is a heading-order defect on the built site. `headingLevelNormalizePlugin` in [builder/render.mjs](builder/render.mjs) repairs those legacy pages at build time (it raises `h3`->`h2` on any page that uses h1 and h3 but no h2), so existing pages are not being churned all at once -- but new content must use correct levels, and pages that already mix `##` and `###` are left untouched. A mixed page that skips a level is a real defect the normalizer will not save you from: five were found and fixed this way, and axe's `heading-order` rule now guards the sample against more.
- `**...**` for keywords/literal tokens; `*...*` for placeholders/arguments.
- Code blocks use ` ```tb ` (highlighted via Shiki using the vendored `builder/twinbasic.tmLanguage.json` grammar).
- Parameter lists use the deflist `term` + `: definition` indentation pattern (NOT the MS-style markdown table).
- Set `vba_attribution: true` in the frontmatter on any page derived from VBA-Docs; omit it on fully original content (e.g. VB package pages). The flag drives an extra line in the site footer.

#### Attribution policy

The attribution rule is **per-page**, determined by content provenance — not by package membership. A symbol existing in VBA is not sufficient to require the flag: the twinBASIC page must have been derived (verbatim or paraphrased) from a specific VBA-Docs source page. Many symbols that exist in VBA have no dedicated VBA-Docs page at all, and even where one exists the twinBASIC page may have been written independently. In particular, `VBA/HiddenModule`, `VBA/Compilation`, `VBA/TbExpressionService`, and twinBASIC-specific additions within VBA modules (`CType`, `If`, `CallByDispId`, `RaiseEventByName`, `ObjPtr`, `VarPtr`, `StrPtr`, ...) are twinBASIC-original and correctly omit `vba_attribution: true` regardless of their package location.

#### Authoring-only frontmatter

Three keys on a package's `index.md` are **provenance for the authoring pass, not build
input**. The build never reads them and they do not reach the HTML --- `grep -r indexed_from docs/_site`
returns nothing, because nothing in `template.mjs` iterates frontmatter generically; every
consumer reads a named field. Leave them in place.

| Key | Means |
|-----|-------|
| `indexed_from` | The twinBASIC build whose package download the documentation was indexed against. Currently `beta-x-0983` on all six. |
| `exclude_from_docs` | Modules or classes in that package deliberately left undocumented --- internals, private helpers, API shims. |
| `exclude_kinds` | Member *kinds* deliberately left undocumented. Only `WinEventLogLib` uses it, for `Declare`. |

Together they say what a completeness check should expect: **re-index the package from a
newer build, and anything new that is not named in `exclude_from_docs` or `exclude_kinds` is
a documentation gap.** Without them a re-index cannot tell "not yet written" from
"deliberately omitted", which is the whole point of recording them.

The six packages carrying `indexed_from` are `AppGlobalClassObject`, `CustomControls`,
`TwinBasicAssertions`, `WinEventLogLib`, `WinNamedPipesLib` and `WinServicesLib`, all set by
the 2026-06-04 pass: `9f406eb`, `05ed96b`, `77c6a03`, `4cd4f4b`, `3429b97`, `6a68815`.
`exclude_from_docs` is on three of them (`InternalStuff`; `EventLogHelperPrivate` +
`EventLogAPIs`; `ServicesConstantsPublic`).

**Bump `indexed_from` whenever a package is re-indexed against a newer build**, in the same
commit as the content it adds. A stale value is worse than none: it asserts a completeness
check was run against a build that no longer matches the package.

> **These keys are also in active use by package documentation work that has not landed
> yet**, covering packages beyond the six above. If you are about to document a package
> from scratch, ask first --- it may already be written and waiting to merge.

One other inert key exists, and is a different thing: `has_children` on four pages is a
just-the-docs leftover. tbdocs derives the nav tree itself and never reads it. Harmless, but
it is theme residue rather than something anyone is meant to maintain.

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

### `Description` attributes are not connected to this documentation

Package `.twin` sources carry `[Description("...")]` attributes whose content is Markdown,
rendered in the IDE's own information popups. They look like documentation and they are not
part of this project: **there is no sync between them and these pages, in either direction,
and the `/tB/` permalinks have nothing to do with them.**

Keeping them in step is deliberate future work, waiting on a proper help IDE plugin. Until
that exists, do not write anything implying the two are connected --- not a "see also", not a
claim that a permalink is referenced from source, not an obligation to update one when the
other changes. A reviewer looking at a `Description` string and at a reference page for the
same symbol will reach for that connection; there isn't one yet.

Related: **`[Documentation(...)]` is not a twinBASIC attribute.** It does not exist. It was
asserted in eight places, including a `tb` code sample teaching it, as the in-source consumer
of the `/tB/` URL contract. The real attribute is `[Description(...)]`, which is not that.
The IDE help system remains a genuine consumer of the permalinks.

## Per-symbol workflow

1. **Decide placement** — pick the package's section convention:
   - Pure language keyword (parsed by the compiler, no runtime call) → `docs/Reference/Core/`.
   - Runtime function/property → `docs/Reference/<Package>/<Mod>/`. Add `redirect_from: /tB/Core/<name>` so legacy `tB/Core/<name>` links still work.
   - VB control class → `docs/Reference/Default/VB/<Class>.md` (single-file) or `docs/Reference/Default/VB/<Class>/index.md` (folder-style).
   - WebView2 → `docs/Reference/Built-In/WebView2/<Class>.md` (single-file) or `<Class>/index.md` (folder-style; the main `WebView2` class uses it). Enums under `WebView2/Enumerations/`; the one public Type under `WebView2/Types/`.
   - Assert module → `docs/Reference/Built-In/TwinBasicAssertions/<Mod>.md` — one page per module with all 15 members inline.
   - CustomControls control → single-file under `docs/Reference/Built-In/CustomControls/<Control>.md`, or folder-style when a state-holder / options sub-page is required. Shared style helpers under `Styles/`, framework symbols under `Framework/`, enums under `Enumerations/`.
   - CEF → `docs/Reference/Built-In/CEF/CefBrowser/index.md` (folder-style with the `EnvironmentOptions` sub-page); enums under `CEF/Enumerations/`.
   - WinEventLogLib / WinNamedPipesLib / WinServicesLib → flat, one page per public class under `docs/Reference/<Pkg>/<Class>.md`. WinServicesLib enums live under `WinServicesLib/Enumerations/`.
   - tbIDE → flat, one page per CoClass / Class under `docs/Reference/Built-In/tbIDE/<Class>.md`; nested enums fold onto their declaring class's page (no `Enumerations/` sub-folder).
   - WinNativeCommonCtls → single-file (`DTPicker`, `MonthView`, `ProgressBar`, `Slider`, `UpDown`) or folder-style (`ImageList/`, `ListView/`, `TreeView/`) when the control has sub-object companions. Module-level enums under `Enumerations/`; per-control nested enums fold onto the declaring control's page.
   - Pick `<Mod>` from VBA's grouping (Information, Interaction, Strings, FileSystem, DateTime, Math, Financial, Conversion, ...) and the existing folders under `Reference/<Package>/`.
2. **Flag tB deviations** with a `> [!NOTE]` callout (see next section).
3. **Update the parent index** — turn an unlinked bullet into a link with a short blurb. Match the existing style of the page. If a new package is being added, also add a bullet to `docs/Reference/Built-In.md` (or `Default.md`) and bump the count on `docs/Reference/Packages.md` and `docs/Reference/index.md`. `Packages.md` itself only links to those two landing pages -- it does not enumerate packages, which is how `AppGlobalClassObject` went unlisted for months.
4. **Add the page** to `Reference/Statements.md` or `Reference/Procedures and Functions.md` if it's a statement or callable and not already listed there.
5. **Run the [site integrity check](#site-integrity-check)** after the batch and before committing.

## twinBASIC deviations from VBA to flag

Add a `> [!NOTE]` callout or rewrite the affected section when source diverges. Known cases:

- `Date`, `Date$`, `Time`, `Time$` are **properties** in twinBASIC, not functions/statements — see `docs/Reference/Default/VBA/DateTime/Date.md` for the pattern.
- `Decimal` is a **full data type** in twinBASIC, not just a **Variant** subtype: `Dim x As Decimal` compiles and runs. VBA-Docs text that calls it unsupported, or reachable only through `CDec`, must be rewritten --- see [Features → New Data Types](docs/Features/Language/Data-Types.md).
- twinBASIC adds `Continue`, attribute syntax `[Description("...")]`, and other features documented under `docs/Features/`.
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

7. **See Also.** Last section on the page, after `Example`. Format: `- [Symbol](Symbol) <noun>` where `<noun>` is the kind: statement, function, property, method, class, module, package. Pages with annotations use `- [Symbol](Symbol) -- short description` — the `--` source renders as a typographic dash via markdown-it's typographer (en-dash for `--`, em-dash for `---`). Don't write literal `—` in source; keep `--` for consistency across the docs. Order by conceptual proximity, not strict alphabetical.

8. **Name the fault directly; never build up to it.** Setting up a contrast and then withholding the point is coy, and it makes the reader parse the sentence twice to extract one fact. *Avoid:* "double-clicking it is the obvious shortcut, and it is the one that misleads"; "the specificity trap --- which is the one thing that reliably catches people out". *Use:* "double-clicking it is obvious, and wrong"; "the specificity trap: a rule that loses it applies in light mode and silently does not in dark". Say what the thing is and what it does, in that order, in one clause. The same applies to "and that is the one that…", "which is precisely the…" and "therein lies the…".

### Replace

| Term | Use instead |
|------|-------------|
| `at rest` (idle state) | idle, in its default state |
| `bake in` / `baked into` | embedded, stored, included |
| `bite` / `bites` (figurative) | affects, matters, goes wrong |
| `broker` (as verb) | manages, handles |
| `carry` / `carries` (figurative) | has, contains, includes |
| `catches up` | resumes, processes the queue |
| `comes up` (a connection) | is established, becomes ready |
| `drive` / `driven` (figurative) | controlled by, determined by, powered by |
| `footgun` / `footguns` | easy mistake to make, hazard, pitfall |
| `for free` (figurative) | as a side effect, without extra effort |
| `hand off` / `hand over` / `hand back` | returns, passes, delivers |
| `hand-rolled` | manually constructed, custom-built |
| `handful` / `handy` | a few; useful |
| `heavy hitter` / `heavy-hitter` (figurative) | main items, biggest items, most significant |
| `in flight` / `in-flight` | pending, in progress |
| `in one shot` | in a single call |
| `in order to` | to |
| `keep honest` / `keeps it honest` | verifies, guards against silent failure |
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

Some kept terms are referenced by in-doc anchors. The most prominent is `idiom` / `idiomatic` — the published package pages reference anchors like `#service-host-idiom` (defined in `docs/Reference/Built-In/WinNamedPipesLib/index.md`, linked from `NamedPipeServer.md` and `WinServicesLib/index.md`) and `#composition-delegation-idiom` (defined in `docs/Reference/Built-In/WinEventLogLib/`, linked from `WinServicesLib/index.md`). Don't rename these casually; and note that `redirect_from` cannot rescue one --- `builder/redirects.mjs` emits whole-*page* stubs and has no fragment remapping, so a renamed anchor simply breaks every link into it.

### Source dashes

markdown-it's typographer (enabled in `builder/render.mjs`) converts the ASCII source forms to typographic characters at build time:

| Source | Rendered | Use for |
|--------|----------|---------|
| `--`   | en-dash `–`  | bullet-list separator (rule 7), ranges |
| `---`  | em-dash `—`  | parenthetical asides (rule 3), breaks in thought |

The source uses the ASCII forms; the rendered HTML uses the typographic characters. Literal `–` or `—` in `docs/` markdown source is forbidden — see the Don'ts at the end of this file. `scripts/convert_em_dash_separators.py` is the canonical normaliser if any literals slip back in.

WIP.md itself (and other files outside `docs/`) is not rendered through tbdocs and is exempt — literal em-dashes here render directly in the GitHub viewer, which is fine.

## Typography

Three self-hosted faces, one system, everywhere the docs render. All SIL OFL 1.1,
all committed as subset `.woff2` under [docs/assets/fonts/](docs/assets/fonts/)
alongside their licence files.

| Face | Where | Variable axes | Subset size |
|------|-------|---------------|-------------|
| **Inter** | all web text; PDF headings, running heads and captions; DOT diagram labels | `wght 100-900` | 152 KB + 166 KB italic |
| **Cascadia Mono** | all code, inline and block, web and PDF | `wght 200-700` | 67 KB + 77 KB italic |
| **Source Serif 4** | PDF body text only | `wght 200-900` | 138 KB + 109 KB italic |

Inter is the brand face: twinbasic.com has always named it first in its own
stack, it just never shipped a `@font-face` to deliver it, so it rendered as
Inter only for visitors who happened to have it installed. Cascadia Mono is the
ligature-free cut of Microsoft's terminal font --- the Windows/Visual Studio
lineage twinBASIC sits in, and in a *language* reference the literal characters
are the subject matter, so a face that draws `->` as one mark is working against
the text. Source Serif is the book's body face and nothing else's; a sans at
10.5pt over nearly two thousand printed pages is tiring, and no web stylesheet
references it, so no reader ever downloads it.

Reader cost on the web is 219 KB on a cold visit --- the two roman faces, both
preloaded --- then 166 KB the first time a page sets italic text, and 77 KB more
only if some of that italic text is code, which most pages never do. All of it
is cached across the other 868 pages. For scale, the search index every page
already pulls is 3.4 MB.

### Why this is not only a cosmetic change

An inline element's measured height is its font's content area, so WCAG 2.5.8
`target-size` results moved with whatever `system-ui` resolved to on the machine
running the scan --- measured at the mobile h3 size: 19px on Segoe UI, 17px on
Inter and Verdana, 16px on Arial, 15px on CI's Liberation Sans, all at the same
declared size. That is how the heading-link hit box shipped clearing the 24px
floor by 0.8px on Windows and missing it on CI. Pinning the face settles the
number at 17px everywhere.

It does **not** make the generous paddings unnecessary, and they must not be
trimmed back. `font-display: swap` means even a normal load spends its first
frames on the fallback, and a reader whose font request fails --- or who turns
webfonts off --- stays there. The rule that actually cannot be unsettled by a
font is one that meets the floor on *declared size*, which is what
`.footer-actions > *` does; prefer that shape where the layout allows it.

**Changing the face broke one `target-size` check, and that is worth reading as
a warning rather than a one-off.** The full sweep found `target-size` failing
on the footnote back-link of `Features/GUI-Components/Windowless`, footnote 3,
at the mobile viewport, in both themes --- one node, one page out of 869.

The back-link is a bare inline `<a>` holding a single U+21A9 with no padding,
so its target is whatever box the font gives that glyph: 12.09 x 19 on Segoe
UI, 12.09 x 15 on Liberation Sans, 15.97 x 17 on Inter. **None of those has
ever met 24 x 24.** The rule was passing on axe's *spacing* exception --- a
24px circle centred on the target happened to clear its neighbours --- and
Inter's arrow is 3.9px wider than the system fonts', which moved the centre far
enough on that one footnote to intersect a neighbour.

So the font change did not introduce the defect; it collected on one that had
been marginal all along, and it did so on exactly one page, which is what a
spacing pass looks like just before it stops passing. The fix sizes the link
outright (`display: inline-block; min-width/min-height: 24px`) rather than
restoring the clearance, and it now measures 24 x 24 under Inter, Segoe UI,
Arial and Liberation Sans alike.

Two things to take from it. **Run the full sweep after any change that moves
type metrics** --- the thirteen-page sample was clean through all of this, in
both themes and both viewports, and would have shipped the regression. And
**treat a target that passes only on the spacing exception as unfixed**: it is
a measurement standing on the font, the surrounding layout and the viewport at
once, and any of the three can move.

### Where the wiring lives

- [docs/_sass/custom/_fonts.scss](docs/_sass/custom/_fonts.scss) --- the
  `@font-face` rules (as a **mixin**, see below) and the `$tb-body-font-family`
  / `$tb-mono-font-family` stacks.
- [docs/assets/css/just-the-docs-combined.scss](docs/assets/css/just-the-docs-combined.scss)
  --- includes `fonts.emit-font-faces` and passes the stacks into JTD's
  `$body-font-family` / `$mono-font-family` through the `meta.load-css` `$with`
  map.
- [docs/_sass/modules-dark.scss](docs/_sass/modules-dark.scss) --- passes the
  same two stacks again. **This is not redundant.** The dark compilation
  re-emits every JTD base rule under `html[data-theme="dark"]`, which lifts
  `body { font-family: ... }` from (0,0,1) to (0,1,2); leave the dark side on
  the defaults and the site renders Inter in light mode and system fonts in
  dark. It is the same specificity trap `modules-dark.scss`'s own header warns
  about, and it is invisible unless you check both themes.
- [builder/template.mjs](builder/template.mjs) --- `fontPreloads()` emits the
  two `<link rel="preload">` tags. `crossorigin` is mandatory even same-origin:
  font fetches are always CORS-mode, and a preload whose mode does not match
  the later `@font-face` fetch is not reused, so the file downloads twice.
- [docs/assets/css/print.css](docs/assets/css/print.css) --- the book's own
  `@font-face` block and three stacks.
- [builder/pdf.mjs](builder/pdf.mjs) --- `REQUIRED_FONTS`, copied into the
  sparse `_site-pdf/` tree. Keep it in step with print.css's `@font-face` block.

Two rules that are easy to get wrong:

1. **`@font-face` is emitted exactly once, from the light compilation.** That is
   why `_fonts.scss` exposes a mixin rather than bare CSS: the dark entry point
   emits its whole payload twice, once per dark selector, and an `@font-face`
   nested inside a selector is invalid.
2. **`url()` in both stylesheets is relative (`../fonts/...`), never
   root-absolute.** The compiled CSS lands at `assets/css/` in all four trees,
   so a relative URL resolves identically online, in the `file://` offline
   mirror, in the `--baseurl` tree, and in the PDF source. A root-absolute path
   would depend on the offline rewrite catching it and would break under a base
   path.

### Regenerating the fonts

[scripts/build_fonts.py](scripts/build_fonts.py) downloads the pinned upstream
releases (SHA-256 verified), pins the optical-size axis, subsets, and writes
`docs/assets/fonts/`. It is dev tooling --- `build.bat` needs neither Python nor
a network connection, exactly like the committed DOT SVGs.

```sh
python -m pip install "fonttools[woff]"
python scripts/build_fonts.py
```

**Regenerating Inter means regenerating the diagram metrics too.**
`builder/inter-metrics.json` is Inter's advance widths, measured from these
exact `.woff2` files and handed to Graphviz so it can size diagram boxes
correctly --- so a new subset with different advances leaves it stale:

```sh
node scripts/build_dot_metrics.mjs      # or --check, which fails if stale
```

Forgetting is not silent. Stale widths move the boxes, and
`scripts/check_dot_fit.mjs` --- in `check.bat` and in the PR checks workflow (`checks.yml`, though not the deploy workflow) --- fails as soon as a
label outgrows one. See [Teaching Graphviz what Inter
measures](#teaching-graphviz-what-inter-measures).

`opsz` is pinned and `wght` is not. Keeping the optical-size axis costs ~70 KB
per face in `gvar`/`CFF2` delta data --- more than trimming the character set
would save --- and buys a subtle refinement at display sizes. Keeping `wght`
variable is what lets the vendored `layout.scss` and `navigation.scss` go on asking
for `font-weight: 350` (one occurrence each) and get a real 350 rather than a
browser-dependent snap to 300 or 400. Note it is the *vendored* theme sources that
ask, not `custom/custom.scss`, which declares no `font-weight` at all ---
`_fonts.scss`'s own comment gets this wrong too.

The subset is specified as whole Unicode blocks rather than the exact character
census, deliberately: an uncovered codepoint falls back to a system font, which
is the precise inconsistency this whole exercise removes, so the blocks carry
headroom for pages not yet written. Emoji are excluded --- a colour emoji font is
several megabytes and every platform ships one --- and the stacks end with
`"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"` to make that fallback
deterministic rather than leaving it to each UA's last-resort lookup.

Two content changes fell out of the coverage audit and should not be reverted:
U+2714 HEAVY CHECK MARK (14 uses) became U+2713 CHECK MARK, because no text face
in the stack carries U+2714 and it therefore rendered from the platform emoji
font --- coloured on Windows, monochrome elsewhere; and one U+22EE VERTICAL
ELLIPSIS inside a box-drawing ASCII diagram became `:`, because Cascadia has no
U+22EE and a fallback glyph of a different advance width shears the box borders.

### Diagrams

Inline SVG inherits the page's font environment, so the self-hosted faces apply
to diagram labels too --- `svg-inline.js` puts the SVG in the DOM rather than
behind an `<img src>`, which would isolate it from the document's `@font-face`
rules. The DOT sources --- `docs/assets/images/dot/` for shared diagrams,
`Images/` beside a page for one that belongs to it --- and `builder/gantt.mjs`
name the Inter stack directly.

**Every diagram is Graphviz DOT now, and the font hazard moved rather than
went away.** Mermaid used to render the two Monaco diagrams; it measured every
label in the browser and sized each node box to fit, so a committed export was
only correct for the font it was measured with. Graphviz has the same coupling
from the other end, and worse: it measures with a font it has never seen.

The WASM build carries **no font machinery at all** --- zero occurrences of
pango, fontconfig, freetype or harfbuzz --- only the built-in width tables for
the core PostScript families, and `get_metrics_for_font_family()` falls back to
Times for anything else. So `fontname="Inter"` produced byte-identical geometry
to `fontname="NoSuchFontXYZ"` (194.00 against Helvetica's 208.00, Courier's
254.00). Times is far narrower than Inter through the lowercase --- `a` is 444
per 1000 em against 557 --- so every box came out about 11% too small.

That shipped. **Twenty-seven labels across the three DOT diagrams were painted
outside their boxes**, by up to 17.9 user units, and every label sat right of
centre; `toolchain-overview.svg` had the `s` of "book.html + CSS + images"
clipped by the box edge. It had been that way since the diagrams were written,
through the whole font migration, and nothing reported it: axe does not
evaluate SVG `<text>` geometry, so the full-site sweep passed over it.

[builder/dot-metrics.mjs](builder/dot-metrics.mjs) fixes the cause. See
[Teaching Graphviz what Inter measures](#teaching-graphviz-what-inter-measures)
below for the mechanism, and run the gate after touching any of it:

```sh
node scripts/check_dot_fit.mjs           # also runs inside check.bat
```

It renders every committed diagram with the real webface and fails if a label
sits outside the box Graphviz drew for it. With the metrics installed, the
worst off-centre across all five diagrams is 1.1 units; with them reverted, the
check reports the CEF diagram's three longest labels overflowing by 8.5 to 15.7
--- verified by writing a deliberately Times-measured SVG and watching it fail.

### Teaching Graphviz what Inter measures

`lib/common/textspan_lut.c` stores widths as:

```c
struct FontFamilyMetrics {
  const char **font_name;
  double units_per_em;
  short widths_regular[128], widths_bold[128],
        widths_italic[128], widths_bold_italic[128];
};
```

`applyInterMetrics()` overwrites the Times family's four arrays with Inter's
advances after `Graphviz.load()`. Three facts make that work, and each was
measured rather than assumed:

- **The table is reachable.** `_module.HEAPU8` exposes the module's 16.3 MB
  linear memory.
- **It is read on every layout, not cached.** Writing a new width for `A`
  moved the laid-out box for `AAAA` from 43.00 pt to 80.00 pt.
- **Inter already routes there.** The name lookup is permissive and falls back
  to Times, so patching Times is what makes `fontname="Inter"` correct. Nothing
  in the docs asks for Times; a diagram that did would now get Inter's metrics.

Widths are in the family's **own em units** (2048 for this table), not AFM
thousandths --- which is why a first search of the WASM for the AFM values
found nothing. `builder/inter-metrics.json` is in the same scale, generated by
`scripts/build_dot_metrics.mjs` from the committed webfonts, measured in a
browser rather than read out of the font binary: the browser's shaped advance
is the number we are trying to match.

Result across the site's diagram labels: **-11.4% mean / -18.0% worst becomes
+0.5% mean / +2.8% worst**. The residual is kerning, which a per-character
table cannot express, and it errs *wide* --- boxes come out slightly generous
rather than slightly tight, which is the safe direction.

**Why not recompile Graphviz instead.** Adding an `Inter` entry to
`all_font_metrics` upstream is tidier and is upstreamable, but it needs an
emscripten toolchain plus @hpcc-js's packaging, and `npm install` would stop
being enough to build the docs --- which is exactly what dot.mjs's
setup-failure path exists to preserve. A binary patch of the shipped `.wasm`
is no better: `Graphviz.load()` takes no arguments, so delivering one means
monkeypatching `WebAssembly.instantiate` or vendoring the 800 KB generated
loader. If the source route is ever taken, `inter-metrics.json` is already the
table it needs.

**It has to be idempotent, and that is not obvious.** `Graphviz.load()`
memoises its module, so serve.bat hands the same instance back on every
rebuild. A second unconditional patch searches a heap where Inter's widths are
already sitting in the Times slot, finds no signature, and fails --- reading
exactly like an upstream bump, which is the wrong place to go looking.
`applyInterMetrics()` keeps a `WeakSet` of patched instances and re-verifies
instead of re-writing. Three in-process rebuilds with a `.dot` edit between
each now come back clean; before the WeakSet, the second one threw.

**What will break it.** An `@hpcc-js/wasm-graphviz` bump that moves the table.
That is deliberate: `locateTimesFamily()` requires exactly one signature match
against the published Times AFM widths and spot-checks all four arrays, and
`assertMeasuresInter()` lays out a real string afterwards to prove the patch
took. On failure `regenerateDot` emits nothing and flips the exit code --- a
stale but correct SVG beats a freshly wrong one.

#### Diagram scale on the web: never stretch a diagram up

`custom.scss` used to say `.svg-container svg { width: 100% }`, which stretched
every diagram to the column whatever its own size. Label size then became an
accident of how wide Graphviz happened to draw the thing --- measured against
16px body text in a 736px column:

| diagram | natural | rendered | label vs body |
|---------|--------:|---------:|--------------:|
| toolchain-overview | 636px | 736px | **1.16x** |
| pdf-render-pipeline | 767px | 736px | 0.96x |
| WebView2 Monaco | 981px | 736px | 0.75x |
| scheduler-dag | 1048px | 736px | 0.70x |
| CEF Monaco | 1259px | 736px | 0.58x |

A 2x spread with no typographic intent in it, and one diagram set larger than
the prose beside it. The rule is now `width: auto; max-width: 100%`.

**Natural size is the correct target, and not by luck.** Graphviz writes labels
at `fontsize=12` in a space where one user unit is one point, and sizes the root
`<svg width="NNNpt">` to match --- so at 1:1 a label is 12pt, which is 16px at
96dpi, which is the site's body size. `toolchain-overview` lands on exactly
1.00x, not approximately.

`max-width` still shrinks anything too wide for the column, and that scales
geometry and labels together, so wide diagrams stay small-but-aligned; the Zoom
control is what covers reading them. Nothing else moved: the four capped
diagrams are unchanged, the Gantt chart (which has no `width` attribute) does
not collapse, and at mobile every diagram is capped anyway so the rule is a
no-op there.

The lesson is the same one the print stylesheet had to learn, from the opposite
direction: **scale the whole SVG or nothing.** Stretching it up inflates the
labels; shrinking the text alone unmoors them from their boxes.

Once a diagram can be narrower than the column, it also has to be **centred**,
in both stylesheets: an `<svg>` is inline-level by default, so it would sit
against the left margin with the whole shortfall pooled on the right, which
reads as a layout mistake rather than as a small diagram. `display: block` plus
`margin-inline: auto` in `custom/custom.scss` and `print.css` does it, and is a
no-op for a diagram that reaches `max-width` --- there is no shortfall to
distribute. Measured on `toolchain-overview`: 636px in a 736px column, 50px of
gap each side, on screen and on the printed page alike.

#### The PDF used to shrink diagram labels out from under their boxes

`print.css` carried `.svg-container text { font-size: 75%; }`, added to stop
diagram labels dominating the page. It is gone, and it must not come back.

It was the width-table defect arriving from the stylesheet instead. Graphviz
sizes each box to the text it measured and positions the label with
`text-anchor="start"` at an x computed for that size, so shrinking only the
text leaves it undersized *and* left of centre in a box that did not move.
Measured across the book's five diagrams: **worst off-centre 15.6px with the
rule, 1.4px without**.

It was also unnecessary. `max-width: 100%` scales any diagram wider than the
170mm text column down to fit, and that scales its labels too --- which is
four of the five. Label size against 10.5pt body text, with the rule removed:

| diagram | natural width | label | vs body |
|---------|--------------:|------:|--------:|
| CEF Monaco | 944pt | 6.1pt | 0.58x |
| WebView2 Monaco | 736pt | 7.9pt | 0.75x |
| scheduler-dag | 786pt | 7.4pt | 0.70x |
| pdf-render-pipeline | 575pt | 10.1pt | 0.96x |
| toolchain-overview | 477pt | 12.0pt | 1.14x |

Only `toolchain-overview` sits above body size, because at 477pt it is the one
diagram that fits the column at natural size. The rule bought that single case
1.14x -> 1.00x and paid for it with the worst misalignment in the book.

**A diagram that needs to be smaller in print is scaled whole, never by its
text alone** --- and one does, for a reason worth keeping straight.

Graphviz authors labels at 12pt. On the web that *is* the 16px body size, so a
diagram at natural size matches the prose beside it for nothing. The book sets
body text at 10.5pt, so the same diagram comes out at **1.14x the prose**. It
only affects `toolchain-overview`, the one diagram narrow enough (477pt) to
render at natural size in the 170mm column; the other four are already scaled
down to fit and land below body size on their own.

`print.css` closes it with `zoom: 0.875`, which is 10.5/12 exactly:

| diagram | as it was | with `zoom` | with `max-width: 87.5%` |
|---------|----------:|------------:|------------------------:|
| toolchain-overview | 1.14x | **1.00x** | 1.01x |
| pdf-render-pipeline | 0.96x | unchanged | 0.84x |
| WebView2 Monaco | 0.75x | unchanged | 0.65x |
| scheduler-dag | 0.70x | unchanged | 0.61x |
| CEF Monaco | 0.58x | unchanged | 0.51x |

**`zoom`, not `max-width` and not `transform`.** A `max-width` percentage is
relative to the column, so it shrinks the four diagrams that were already
correct. `transform` does not change the layout box, so paged.js would break
pages around space the diagram no longer occupies. `zoom` scales geometry and
labels together, relative to the diagram's own size, and does change the
layout box. The four wide diagrams are untouched by it because they are wider
than the column either way, so `max-width: 100%` still decides their size.

### Diagram labels that sit on the page background

Graphviz emits `<text>` with no `fill` attribute, so it inherits SVG's initial
black. For a node label that is right: those sit on the diagrams' light amber
fill in both themes. A **cluster label and an edge label sit on the page
background**, and black on the dark theme's background measures **1.40:1**.

This was also shipping unreported, for the same reason as the overflow: axe's
colour-contrast rule does not evaluate SVG text. `custom/custom.scss` now gives
`g.cluster > text` and `g.edge > text` `fill: currentColor`, which tracks the
body text colour without hardcoding either palette --- the same thing
`admonitions.scss` does for its icons. Scoped to **direct** children, because
node text must keep the dark ink its own light fill needs. Measured after:
15.02:1 light, 11.66:1 dark, against 19.59:1 for the node labels in both.

Do not widen that selector to all `text`. The node labels would go light on a
light fill in dark mode, which is the same defect with the themes swapped.

### Diagram exports carry their own font

The four buttons above each inlined diagram (Download / Copy, SVG / PNG) all
route through `serializeWithFonts` in
[docs/assets/js/svg-inline.js](docs/assets/js/svg-inline.js), which embeds the
faces the diagram paints with as `data:` URIs in an inline `@font-face`.

This is necessary because **an exported diagram is cut off from the page's
`@font-face` rules**. An SVG handed to `new Image()` renders in the browser's
"secure static mode", which fetches no external resource at all, and a
downloaded `.svg` opened somewhere else has no access to this site's
stylesheet either. Both fall back to whatever the viewer has installed.
Measured on a machine with no local Inter: an exported PNG asking for
`font-family="Inter"` rasterised *pixel-identical* to one asking for a font
that does not exist --- same ink count, same extent.

A `data:` URI is not an external fetch, so secure static mode permits it, and
the bytes come from the HTTP cache because the page already downloaded them.
The whole thing costs ~25 ms per click and nothing over the wire. Two details
are load-bearing:

- **Only the faces the diagram actually uses are embedded**, decided from the
  live element's computed styles rather than from the markup. Every diagram
  needs Inter roman; the two Monaco ones also carry italic label text, and that
  is a second 203 KB. An export runs ~243 KB roman-only, ~449 KB with italic.
- **Font paths resolve against the script's own URL**
  (`document.currentScript.src`), not a hard-coded root-absolute path, which
  is what makes them work unchanged in the offline mirror and under a
  `--baseurl` deployment. In the offline mirror `fetch()` cannot read a
  `file://` URL at all, so the embed silently degrades to the old behaviour;
  that is the one context where an export still uses the viewer's fonts.

#### PNG export, and the constraint that decided the diagram format

All four buttons work on all five diagrams. That is a property of the *format*,
not of the export code, and it is worth knowing why before anyone reaches for a
diagram tool that emits HTML-in-SVG.

Chromium taints a canvas that has had an SVG containing `<foreignObject>` drawn
into it, and a tainted canvas refuses `toBlob()` with a `SecurityError`. Mermaid
puts every node label in a `foreignObject`, so *Download PNG* and *Copy PNG*
never worked on the two Monaco diagrams for as long as they were Mermaid. The
throw happened inside an `img.onload` handler where nothing surfaced it, so the
click simply appeared to do nothing.

`flowchart: { htmlLabels: false }` does **not** fix it --- tested against
Mermaid 11, which moves only the edge labels to `<text>` and keeps node labels
in `foreignObject` regardless. Graphviz emits plain `<text>`, which is why the
DOT diagrams always exported fine and why the Monaco pair was redrawn as DOT
rather than patched.

Measured through the real export path, all five now rasterise: 65--403 KB per
PNG, and 6.4--13.6% more ink than the same SVG with the `@font-face` stripped,
which is what says the embedded Inter is being used rather than a fallback.

The failure path stays, because it is still reachable --- a hand-authored SVG
could reintroduce `foreignObject`: it is caught, logged, and announced through
a `role="status"` live region naming *Download SVG* as the alternative.

Driving the real buttons turned up one more silence of the same kind: the
`copy-png` branch called `navigator.clipboard.write()` with no `.catch()`,
unlike `copy-svg` beside it, so an unfocused document or a denied permission
rejected into nothing and the click looked like it had worked. It now reports
through the same live region.

### The PDF, and two things the book pipeline does differently

**The forked paged.js asserts that fonts have settled** before the page-breaking
pass, and it used to reject any face not in state `loaded`. A CSS-connected
`FontFace` is only fetched when the layout demands one, so a face print.css
declares but a given render never exercises --- Cascadia Mono Italic, when no
code sample is italicised --- sits at `unloaded` forever and tripped it. The
assertion now rejects `loading` and `error` only; see `loadFonts()` in
[book/lib/paged.browser.js](book/lib/paged.browser.js).

**The book's fallback chains are self-hosted all the way down.** `Source Serif 4,
Inter, Georgia, ...` rather than dropping straight to a system serif, and
`"Cascadia Mono", monospace` with no named local face. The book is rendered once,
on one machine, so a named local fallback bakes *that machine's* fonts into the
artifact.

Checking which fonts the PDF *actually embedded* is what found the remaining
gaps, and it found two the CSS review had not:

- Source Serif 4 covers 603 of the codepoints this book uses against Inter's
  1103, so dropping straight from it to a system serif pulled a Times New Roman
  subset in for seven footnote back-arrows and four U+2194. Putting Inter second
  in the chain fixed it.
- normalize.scss puts `pre`, `code`, `kbd` and `samp` on generic `monospace` and
  JTD overrides only `code`; print.css loads no normalize but the UA default is
  the same. Eleven pages use `<kbd>`, and every one of them was setting keys in
  whatever the machine called `monospace` --- Consolas here. Fixed in both
  stylesheets; `samp` is included although nothing uses it yet.

What is left in 1,991 pages is three glyphs: a clock emoji, and the U+2714 and
U+22EE that [Authoring](docs/Documentation/Authoring.md) prints as examples of
characters the subsets do not carry. Those two are deliberate and the page says
so --- but they are why a font census of the book reports a Segoe UI Symbol and a
Cambria Math subset, which is otherwise a mystery worth an hour.

To check what a built PDF actually embedded:

```sh
node -e "const z=require('zlib'),f=require('fs'),b=f.readFileSync('docs/_pdf/twinBASIC Book.pdf'),s=b.toString('latin1'),h={},a=t=>{for(const m of t.matchAll(/\/(BaseFont|FontFamily)\s*(?:\/|\()([\w+\-,. ]+)/g))h[m[2]]=(h[m[2]]||0)+1};a(s);for(const m of s.matchAll(/stream\r?\n/g)){const i=m.index+m[0].length,e=s.indexOf('endstream',i);try{a(z.inflateSync(b.subarray(i,e)).toString('latin1'))}catch{}}console.log(h)"
```

### The offline tree drops the preloads

A font preload is a CORS-mode fetch. Under `file://` there is no origin to
match, so Chrome fails it with `ERR_FAILED` and logs it, while the `@font-face`
fetch beside it succeeds and the faces load anyway. The preload therefore buys
an offline reader nothing and costs two red lines in the console, so
`stripFontPreloads` in [builder/offline-rewrite.mjs](builder/offline-rewrite.mjs)
removes it from that tree only.

## Scripts and tooling

**Anything that participates in rendering the online site, the offline site, or the PDF book is handled by [tbdocs](builder/), the in-tree Node.js static site generator.** Module-level documentation lives next to the code under `builder/`; the user-facing summary is on the [tbdocs Internals](docs/Documentation/Builder.md) page.

Python scripts are reserved for non-render concerns: one-off content conversion (e.g. `scripts/convert_em_dash_separators.py`), repo audits, dev tooling, link checks beyond `check.bat`. They are never a prerequisite for the render pipeline.

`wisdom/` — Discord knowledge-harvesting tool (three-phase: export → process → extract). Plans in `wisdom/PLAN-{1,2,3}.md`; implementation under `wisdom/`. Uses only Node.js built-in APIs.

`eval/` — use-case evaluation of the developer documentation. `build_corpus.mjs` mirrors the
repository with every non-prose file stubbed unreadable, so "documentation only" is a property
of the tree rather than an instruction; `site_search.mjs` replays the site's real lunr index
and query logic, because search and navigation fail on different pages. `usecases.md` is the
catalogue, `protocol.md` is what an evaluator is given. **This asks whether the docs *work*,
which is orthogonal to whether they are accurate** — most findings so far involve sentences
that are individually true. Mine this file for cases: it is substantially a catalogue of
"this shipped broken and nobody noticed", and each entry is a use case waiting to be written.

### The published docs assume manual work — and Wisdom is the exception

**Nothing under `docs/Documentation/` should require Claude, an agent or a skill to follow.**
The audience is a contributor with an editor and a terminal; agent-assisted authoring is a
local convenience, not part of the contract the published documentation makes. That is why
the `document-symbol` skill lives under the gitignored `.claude/` and is described only here.

**[Wisdom](docs/Documentation/Wisdom.md) is a deliberate exception and stays public.** The
tool has no manual mode to document — Phase 3 *is* a set of Claude agents, and a page
describing it without them would describe nothing. A reviewer applying the rule above will
read its "tell Claude: …" instructions as a scope violation and propose relocating it to a
`WIP.Wisdom.md`. That has been considered and declined; leave it where it is.

### Wisdom Phase 3 --- Extract invocation

Phase 3 runs Claude agents over the processed thread `.md` files and drafts documentation additions. The default flow is **incremental**: only threads whose Discord-side content has actually changed since the last successful merge are re-extracted. Combined with the incremental `export` and `process` phases, the routine update is three commands with no flags:

```
node wisdom/wisdom.mjs export
node wisdom/wisdom.mjs process
node wisdom/wisdom.mjs extract
```

The `extract` step itself is a three-stage flow that Claude orchestrates: prep → workflow → merge. The merge step grafts new findings into the long-lived `staging.md`, replacing matching sections in place and emitting `[REFINED?]` markers for findings whose prior version has been reviewed and removed --- so pending review work is never clobbered.

1. **Prep**: `node wisdom/wisdom.mjs extract` filters threads against `wisdom/data/findings/extract-state.json` (the per-thread `last_message_id` + `message_count` watermark, advanced on each successful merge). Only changed threads survive the filter. Shared reference files (`package-summary.txt`, `page-index.json`) are written once; per-batch files contain thread file paths, per-thread file sizes, config, and a `mode` field (`incremental`, `since`, `all`, or `force`) consumed by the merge step.
   - If the filter is empty (no threads have changed), prep exits with `No new threads since the last successful merge` and the merge step is unnecessary.
2. **Run the workflow**: check which prep layout was produced:
   - **Single-batch** (≤200 threads) --- `extract-prep.json` exists: read it, pass its parsed contents as `args` to the Workflow tool with `scriptPath: "wisdom/extract/workflow.mjs"`. Write the returned `{ additions: [...] }` array to `wisdom/data/findings/extract-results-0.json`.
   - **Multi-batch** (>200 threads) --- `extract-manifest.json` exists: read it, then for each entry in `manifest.batches`, read the corresponding `extract-batch-{i}.json`, pass it as `args` to the Workflow tool, and write the returned additions array to `extract-results-{i}.json`. Skip batches whose result file already exists (resumability).
3. **Merge**: `node wisdom/wisdom.mjs extract --merge` reads every `extract-results-*.json`, grafts the additions into `staging.md` per the merge semantics in [wisdom/PLAN-3.md](wisdom/PLAN-3.md#merge-semantics), and advances `extract-state.json`. Atomic write via temp+rename; previous `staging.md` retained as `staging.md.bak` for one generation.
4. **Review**: `wisdom/data/findings/staging.md` is the long-lived human-review file --- grouped by target page, with `[DUPLICATE?]` markers for cross-thread overlaps, `[REFINED?]` markers for previously-processed findings whose source thread has grown, and an `Unmapped Findings` section for findings with no existing doc page. The reviewer can append `[LOCKED]` to any section header to prevent auto-replacement on the next merge.

**Diagnostic modes** (mutually exclusive primary flags):
- `extract --since 2026-06-04` --- filter by thread `created` date instead of watermark. State is not touched; merge writes to `staging-since-2026-06-04.md` rather than grafting into the canonical staging file.
- `extract --all` --- bootstrap / re-baseline. Processes every thread regardless of state and ignores the channel filter. Merge still grafts (replacing matching sections, inserting new ones) so an existing `staging.md` is not lost.
- `extract --force` --- ignores the watermark filter but respects `--channel`. Useful when the agent prompt changes and specific channels need re-extraction.
- `extract --dry-run` --- writes the prep file but does not invoke the workflow; state is not touched.

## Build pipeline

The site builds via [builder/](builder/), a custom Node.js static site generator (`tbdocs`). See [builder/PLAN.md](builder/PLAN.md) for the architecture overview, [builder/README.md](builder/README.md) for the quickstart, and the [tbdocs Internals](docs/Documentation/Builder.md) site page for the high-level tour.

A task-graph scheduler / parallelisation pass is designed in [builder/PLAN-scheduler.md](builder/PLAN-scheduler.md) and has been implemented (Phases 0--4).

**Before adding a fan-out to the task graph, read [why a dep count of zero does not mean the submits have run](builder/PLAN-sab-pull-scheduler.md#a-dep-count-of-zero-does-not-mean-the-submits-have-run).** A worker posts its result and *then* decrements its successors' dependency counts in shared memory, so a barrier's count can reach zero while results are still queued and the `submit()` calls that merge them into build state have not run --- the shared counter orders the work, not the state. A dynamic barrier must therefore list every chunk task in its `expected`, even when its own `execute()` ignores the inputs; that list is the only thing the scheduler checks before it lets the barrier proceed. `renderJoin` went without it and silently dropped ~6 pages from `search-data.json` on about one build in three, because the index is built by flattening a `new Array(N)` and `Array.prototype.flat()` skips holes without reporting anything. Two silent failures combining into one invisible one. Both halves are fixed, and every skip on the chunk-merge path that used to tolerate a missing piece now refuses to continue --- see [where the completeness checks are](builder/PLAN-sab-pull-scheduler.md#where-the-completeness-checks-are). Keep it that way: on this path, "the piece is missing" is a bug, not a case to handle.

Folding `check.bat`'s gates into that same graph is designed in [builder/PLAN-checks.md](builder/PLAN-checks.md). Phase A, the link checker, is **implemented**: extraction runs inside `flush`, where both trees' final HTML is already in worker memory, so the build no longer writes ~270 MB out only to read it back and re-parse it. The `pick_a11y_sample.mjs --check` census and the axe scan's orchestration are follow-ons, seeded with measurements and open questions but not yet designed.

Historical engineering notes from the Jekyll era --- the original build pipeline, the HTML-compress plugin, the per-phase optimisation passes that preceded the JS port, the migration notes, and the Phase 11 parity-update retrospective --- live in [WIP.OldJekyll.md](WIP.OldJekyll.md).

## Build / preview

- `build.bat` — runs `node builder\tbdocs.mjs --src docs --check-audit-index` (which implies `--check`) and produces three trees in one pass: the online copy at `_site/`, a `file://`-browsable copy at `_site-offline/`, and the sparse pagedjs source at `_site-pdf/`. The offline pass adds ~700 ms and the PDF pass adds ~150 ms on top of the ~2 s online build. Toggle `also_build_offline` / `also_build_pdf` in `_config.yml` (or pass `--no-offline` / `--no-pdf`) to skip a sibling output. `--check` adds ~1.7 s and runs the link + integrity check over the HTML while it is still in worker memory; `build.bat --no-check` gets a plain build.
- `serve.bat` — runs `tbdocs --serve`: initial build, then a long-lived process with watcher, debounced rebuilds, and SSE-driven browser auto-reload. Writes to `docs/_serve/` (disjoint from `build.bat`'s `_site*/`) and skips the offline + PDF passes — so a one-off `build.bat` for the PDF or offline mirror doesn't disturb the live preview. Ctrl+C to stop.
- `check.bat` — the gates that need a browser or a second pass over the built tree: the publish-allowlist self-test (`scripts/check_publish_policy.mjs`, which needs neither and goes first), a freshness check that refuses a stale tree (`scripts/check_tree_fresh.mjs`), the DOT diagram fit check (`scripts/check_dot_fit.mjs`), the axe source-patch verification (`scripts/check_axe_patch_equiv.mjs`), the a11y sample-coverage check (`scripts/pick_a11y_sample.mjs --check`), then the accessibility check (`scripts/check_a11y.mjs`). The link + integrity check moved into `build.bat`.
- `book.bat` — renders the PDF from `docs\_site-pdf\book.html` via `node book\render-book.mjs` into `docs\_pdf\twinBASIC Book.pdf`. Run `build.bat` first to populate `_site-pdf/`.

Two generators sit outside that loop and produce committed artifacts rather than build output — neither runs during a build, and neither is needed for one. `python scripts/build_fonts.py` rebuilds the subset webfaces under `docs/assets/fonts/` and needs a network connection; `node scripts/build_dot_metrics.mjs` regenerates `builder/inter-metrics.json` from those webfaces and needs only a browser. See [Typography](#typography).


## Site integrity check

After a batch of changes, verify the site builds clean and all links resolve:

```sh
build.bat && check.bat
```

On the dev box that is ~4 s of build against ~23 s of check, of which the axe scan is ~20 s. [builder/PLAN-checks.md](builder/PLAN-checks.md) records how the link checker got folded into the build's task graph, what it cost and what it saved; the axe follow-ons are designed there but not implemented.

**The link and integrity check runs inside the build.** `build.bat` passes `--check-audit-index`, which implies `--check`, and the check walks the HTML on the worker lanes that produced it -- both trees' final strings are already decoded and in memory at `flush()`, so the ~270 MB the two trees weigh is never written out only to be read back. It also audits the tree index the build derives from its own records against what landed on disk -- the one direction the two-checker comparison structurally cannot see, since a spurious entry makes the oracle answer "exists" for a path that 404s in production. It catches broken intra-site links, missing pages, malformed `redirect_from` entries (the most common breakage when adding new pages or moving content between sections), duplicate ids, remote `<img src>`, badly nested tags, sitemap and search-index gaps, canonical mismatches, and (via a forbidden-prefix rule on the offline tree) any extracted link that still points at the live docs site after the offlinify rewrite. A clean `build.bat && check.bat` is the bar for "ready to commit".

A failing check never aborts the build: a broken link still produces a site you want on disk to inspect. It sets the exit code instead, using the same scheme `check_links.mjs` has always used -- 1 for link failures, 2 for integrity failures, 3 for both -- so CI can tell them apart.

The remote-asset rule fails the run on any `<img src>` resolving off-box (`http://`, `https://`, or protocol-relative `//host`). In the build it is unconditional -- `checkRemoteAssets: true` on both trees in `builder/check.mjs`'s `TREES` -- and is *not* reachable by a flag: `tbdocs` rejects `--check-remote-assets` as an unknown argument. That name belongs to the standalone `scripts/check_links.mjs`, where it is opt-in. The PDF pass over `book.html` is informational, so enforcement comes from the `_site/` pass -- every page in the book is also in `_site/`, making it a superset. The check is deliberately scoped to `<img>` only; `<iframe>` is untouched.

### The two link checkers, and the gate that catches divergence

[scripts/check_links.mjs](scripts/check_links.mjs) is still the tool for a tree the build did not produce -- a release zip, a bisect, someone else's artifact -- and both CI workflows still run it, though not directly: they invoke `check_links_diff.mjs`, which calls the script in-process as its `script` side (only the `fused` side spawns, and it spawns `tbdocs`). It is exercised only against the fixtures, never against the real trees. The pure core both front ends share lives in [builder/link-check.mjs](builder/link-check.mjs); the build-side plumbing is [builder/check.mjs](builder/check.mjs) and [builder/check-tree.mjs](builder/check-tree.mjs).

Two implementations of one check is exactly the shape that rots quietly: **a checker that silently checks less reports a clean pass.** [scripts/check_links_diff.mjs](scripts/check_links_diff.mjs) is the gate against that, and it plays the same role on this side that `check_a11y_fingerprint.mjs` plays on the axe side. Run it whenever `link-check.mjs`, `check.mjs` or `check_links.mjs` changes:

```sh
node scripts/check_links_diff.mjs --a script --b fused
```

It diffs the two implementations' findings category by category across the real invocations -- `_site/` with sitemap + search + canonical, `_site-offline/` with the forbidden-prefix rule, `book.html`, and a `--baseurl` tree checked with the matching base path. It is deliberately *not* in `check.bat`: the script side costs ~3 s, which is the whole saving.

Two further modes matter:

- `--self-test` diffs the script against a deliberately corrupted side and fails unless the difference is reported. Everything else the harness prints reduces to "the two sides agreed", which is also what a harness comparing nothing says.
- `tbdocs --src docs --check-audit-index` diffs the tree index the build derives from its own records against what actually landed on disk. This is the one failure mode the findings comparison structurally cannot see: a *missing* index entry turns a working link into a reported break, which is loud, but a *spurious* one masks a real break, and on a clean site nothing links to a path that does not exist, so nothing would ever notice.

The harness carries a synthetic `fixture` case for the same reason -- the real site is clean, so every other case compares empty against empty in eight of the nine categories. The fixture provokes one fault of each kind and asserts the count, so a fixture that stops provoking one fails loudly instead of quietly going back to empty-vs-empty.

### The publish allowlist

**`discover()` files every non-page it finds under `docs/` as a static file, and
`write.mjs` copies it verbatim, so the source tree's shape *is* the site's shape.**
The only filter used to be `_config.yml`'s `exclude:`, and a denylist can only
refuse what someone thought to name in advance. Measured against the real config
before this landed, every one of these published at a public URL on a green build:

| planted in `docs/` | published at |
|---|---|
| `Reference/NOTES.md` (a scratch file, no frontmatter) | `/Reference/NOTES.md`, as raw markdown |
| `Reference/Core/Dim.md.bak` | `/Reference/Core/Dim.md.bak` |
| `Features/sample.twin` | `/Features/sample.twin` |
| `Features/secrets.json` | `/Features/secrets.json` |
| `Tutorials/draft.docx` | `/Tutorials/draft.docx` |
| `assets/deploy.pem` | `/assets/deploy.pem` |
| `Thumbs.db` | `/Thumbs.db` |
| `IDE/build.log` | `/IDE/build.log` |

Two publish surfaces reach the world from those trees: the deploy workflow
uploads `docs/_site/` wholesale to Pages, and the manual-dispatch path zips
`docs/_site-offline/` onto a GitHub release. Neither looks at what it is
carrying.

[builder/publish-policy.mjs](builder/publish-policy.mjs) inverts the rule ---
name what may ship, refuse the rest --- and is enforced at two points, both
**unconditional**, because a build run with `--no-check` is exactly when nothing
else is watching:

- **Source**, in the `discover` task, over the static-file inventory. Names the
  file on disk and aborts before anything is written.
- **Tree**, in the `dispatch` task, over each tree's derived inventory
  (`deriveTreeRels`). Covers what the source sweep structurally cannot see:
  redirect stubs, vendored theme assets, and the generated auxiliaries
  (`sitemap.xml`, `search-data.json`) are all minted by the build, not found in
  `docs/`.

Unlike the link check, **a finding here aborts the build**. A broken link still
leaves a tree worth inspecting; a tree with a private key in it is a tree nobody
should be one `upload-pages-artifact` away from publishing.

Three details of the policy are load-bearing:

- **`SOURCE_EXTENSIONS` and `BUILD_EXTENSIONS` are separate sets, and must stay
  separate.** The build emits `.xml` and `.json`; a contributor has no business
  dropping either into `docs/`, and `.json` is among the extensions most worth
  refusing at source. Folding the two together would pass every other assertion
  in the self-test, so the self-test asserts the disjointness directly.
- **`.md` is deliberately absent from both.** A markdown file that reaches the
  check is one `gray-matter` found no frontmatter block in --- the
  AppGlobalClassObject shape, where the raw markdown was served verbatim for
  months. Be careful what the message claims, though: the two faults that come
  to mind first are both handled elsewhere. A **UTF-8 BOM** is stripped before
  parsing, so a BOM'd page renders normally and never reaches here (`stripBom()`
  fixed that cause; this refuses the class it belonged to). **Malformed YAML**
  inside the block throws `Failed to parse frontmatter in <file>` from
  `discover.mjs` and never falls through. What is actually left is a file with
  no block at all, or one where something precedes the opening `---` --- a blank
  line is enough. The message names that, and an earlier draft naming the BOM
  would have sent every reader looking for something that cannot happen.
- **`bundle_extra` is exempt by *path*, not by extension.** `_config.yml`
  declares `Features/Packages/downloads/impexp.py` and `impexp.mjs` with both
  ends spelled out, which is what makes them shippable. The same extension
  anywhere else still fails --- otherwise declaring one entry would quietly bless
  a whole type.

**A clean build says only that nothing in `docs/` is currently refused, which is
also what an allowlist widened until it refuses nothing says.** The interesting
assertion is the other one, and no build over a clean tree can make it, so
[scripts/check_publish_policy.mjs](scripts/check_publish_policy.mjs) makes it
against named probes --- a `.bak`, a `.pem`, a `.docx`, a frontmatter-less `.md`,
a `Thumbs.db` --- plus the reverse (a `.png`, a `.PNG`, a `.woff2`, `CNAME` must
still publish, or a policy that refuses everything would also report a clean
sweep). No browser, no built tree, ~40 ms. It runs first in `check.bat` and in
both CI workflows.

```sh
node scripts/check_publish_policy.mjs
```

**Adding a new asset type is a one-line edit to `publish-policy.mjs`, and that is
the point** --- the cost is paid once, by the person who knows they are adding it,
instead of being paid silently by whoever drops a key file into `docs/` three
years from now.

### Remote-asset vendoring

[builder/vendor-assets.mjs](builder/vendor-assets.mjs) is a seed task (`vendorAssets`, modelled on `dot`) that scans the discovered markdown for YouTube video markers and GitHub user-attachment URLs, downloads anything missing into `docs/assets/thumbnails/` or `docs/assets/attachments/`, and hands the new files to the static-file copy pass. It is idempotent -- a present file is never re-fetched -- and the artifacts are committed to git exactly like the generated DOT SVGs.

**CI never downloads.** `process.env.CI` selects offline mode (`--fetch-assets` / `--no-fetch-assets` override it), and in offline mode a referenced-but-uncommitted asset throws rather than fetching. If CI could fetch, an author who wrote the markdown but forgot to commit the image would get a green build while the published site went on hotlinking a third party -- the exact failure the whole mechanism exists to prevent. A fetch *failure* in dev mode is softer: warn, keep building, and flip the exit code, so one dead video doesn't block a local preview.

The render-side halves are `videoLinkPlugin` (marked link -> poster frame + outbound link) and `remoteImagePlugin` (user-attachment `<img src>` -> the vendored copy), both in [builder/render.mjs](builder/render.mjs). Both emit **root-absolute** paths, because the PDF book flattens every page into one document and a page-relative src resolves against the book root there.

It then runs [scripts/check_tree_fresh.mjs](scripts/check_tree_fresh.mjs), which refuses a tree older than the sources that produced it, then [scripts/check_axe_patch_equiv.mjs](scripts/check_axe_patch_equiv.mjs) -- see [Changing the scan](#changing-the-scan) for why -- then [scripts/pick_a11y_sample.mjs --check](scripts/pick_a11y_sample.mjs) -- see [Choosing the sample](#choosing-the-sample) -- and then [scripts/check_a11y.mjs](scripts/check_a11y.mjs), which runs puppeteer + axe-core over thirteen sample pages against WCAG 2.0/2.1/2.2 at Level A + AA (plus the `heading-order` best-practice rule) and exits non-zero on any violation. What the scan actually *is* -- the page list, the viewports, the themes, the blocked requests and the axe run options -- lives in [scripts/lib/axe-scan.mjs](scripts/lib/axe-scan.mjs), shared with the correctness gate and the measurement rig below; `check_a11y.mjs` itself is only the reporting front end. Note that all five WCAG tags — `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` — must be listed: axe matches tags literally with no version rollup, so a rule tagged only `wcag21aa` does **not** match `wcag22aa`. Three details of that script matter and are easy to break:

- It scans **`_site-offline/`, not `_site/`**. The online tree references its assets with root-absolute URLs (`/assets/css/…`), which resolve to nothing under `file://` — every page would load unstyled and every colour-contrast result would be a meaningless black-on-white pass. The offline tree uses relative asset paths and renders for real.
- It scans each page **in both themes and at two viewports** (`--theme`, `--viewport`). Dark mode is a separate stylesheet with its own palette, and defects such as horizontally scrolling code blocks only appear once the layout is narrow enough to overflow. The dark half is not a formality: the dark compilation re-emits every JTD base rule under `html[data-theme=dark]`, which raises its specificity from (0,0,1) to (0,1,2) -- so a root-level single-class rule in `custom/custom.scss` that overrides a bare element selector **applies in light mode and silently does not in dark**. That is exactly how the footnote-underline fix shipped half-broken, and only the dark pass caught it. Prefix such rules with `.main-content` to clear the bar.
- It injects a **patched** axe bundle. `SOURCE_PATCHES['plain-color-fields']` in `axe-scan.mjs` replaces `Color2`'s six WeakMap-emulated `#private` fields with plain own properties, worth **-26 %** across a realistic page set and **-30 %** on large pages. Patches need the unminified bundle, which costs ~6 ms more per page to inject. Two obligations come with it: every axe-core upgrade re-runs both `check_a11y_fingerprint.mjs --patches plain-color-fields` and `check_axe_patch_equiv.mjs` (CI and `check.bat` run the second for you), and if a result ever looks wrong, re-run with `--stock-axe` first -- that injects the unmodified bundle and says in one command whether the patch is implicated.
- It **blocks the search index** (`search-data.js` + `lunr.min.js`) via request interception — see `BLOCKED_REQUESTS`. Every page pulls in ~3.4 MB of index that never touches the DOM axe walks; loading it was 18.9 s of a 27.1 s run, and aborting it cuts the scan to ~9 s with byte-identical results (every rule id and node count, violations and incomplete alike, across every page/theme/viewport combination -- 24 of them when that was measured, 60 audits today). Do **not** extend the block list to `just-the-docs.js` — it installs the search combobox ARIA, and blocking it makes axe see *less* (colour-contrast nodes on `Select-Case` drop 54 → 2), silently masking coverage.

**A local pass on the geometry rules used not to be authoritative, and the reason is worth keeping in mind.** `target-size` measures rendered boxes, and an inline element's measured height is its font's content area --- so it moved with whatever `system-ui` resolved to. Measured at the mobile h3 size: Segoe UI 19px, Inter / Verdana / Tahoma 17px, Arial 16px, Liberation Sans / DejaVu Sans / Roboto 15px. A heading link topped up with `padding-block: 3px` therefore cleared the 24px floor by 0.8px on Windows and missed it on CI's Linux fonts, and the local scan reported a clean pass throughout.

[Self-hosting the text face](#typography) pins that number at 17px on every machine, which is what closed the gap between a local pass and CI's. It does not licence trimming the paddings back: `font-display: swap` puts the first frames of every load on the fallback, and a reader whose font request fails stays there, so the 15--19px band is still the range a fix has to clear. Give a font-dependent measurement margin against the *smallest* of those numbers, prefer a rule that meets the floor on declared size where the layout allows one, and check the whole site for the rule rather than the sample --- one rule over every page at one viewport takes about two minutes.

**axe does not evaluate whether a focus ring is actually visible**, only that focusable things are reachable and labelled --- so a ring that is drawn and then clipped away passes every rule. The aux nav is where that matters. `.aux-nav` is `overflow-x: auto` (navigation.scss:182), and the overflow spec turns the other axis from `visible` to `auto` when one axis is not `visible`, so the nav is a scroll container that clips at its padding box on all four sides; its items are `height: 100%` and the first one starts at the left content edge. An outset ring on anything in there therefore loses every side that sits on the clip edge. The theme toggle shipped that way --- `.btn-reset`'s 2px ring at 2px offset survived only on the right, where the aux-nav link leaves room --- and a manual keyboard pass is what found it. The fix is an inset ring (`outline-offset: -2px` on `#theme-toggle`, in `custom/custom.scss`), which needs an id selector to out-rank the dark compilation's `html[data-theme=dark] .btn-reset:focus-visible` at (0,3,1).

The "twinBASIC Home" link next to it had the same defect, and this file used to say it did not -- that Chrome's UA `outline: auto` on it "renders in full". Measured at 1280x900 in both themes, the nav's box is top 0 / bottom 59 and the link's is identical, so the UA ring's `+1px` offset puts its top and bottom segments outside the clip box exactly as the toggle's did; only the left and right bars survive, because the link starts 50px inboard of the nav's left edge. It now takes an author ring at `outline-offset: -2px` too (`.aux-nav a.site-button:focus-visible`), with a dark-mode colour override -- the link is not a `.btn-reset`, so nothing in either compilation competes with it.

### Heading permalinks

The chain icon beside every heading is **deliberately `aria-hidden="true" tabindex="-1"`**, which looks like a defect and is not. It used to carry `aria-labelledby` pointing at its own enclosing heading, so Chrome computed its accessible name as the heading text verbatim: every heading turned up a second time in a screen reader's links list, named identically, with nothing marking it as a permalink. Over 7,000 of them across the site's 869 content pages -- 867 carry at least one -- and 172 on `tB/Gloss.html` alone. axe passed `link-name` throughout, because the rule asks whether a name exists, not whether it is worth announcing.

It stays a real `<a href>` so the mouse affordances that people actually use to copy these -- right-click Copy Link Address, middle-click, the status-bar URL preview -- are untouched. The keyboard and screen-reader equivalent is `renderSectionLinks` in [builder/template.mjs](builder/template.mjs): one `<details class="section-links">` per page, listing every heading. Since `e045ab5` it sits at the top of the page footer, immediately after `</main>` closes (`renderFooter` places it; see `template.mjs`), and it is omitted on a page with fewer than two headings -- 452 of the 1,159 built files lack it, 290 redirect stubs and 162 content pages. **A closed `<details>` subtree is `notRendered`** -- it contributes nothing to the accessibility tree and no tab stop beyond the `<summary>` -- so the whole feature costs one tab stop per page and expands on demand. Verified on the built tree: `Gloss.html` exposes 166 links closed and 338 open.

Two things about that placement are load-bearing:

- **It is emitted from the template, not from the markdown render.** The PDF book assembles its chapters from `page.renderedContent` ([book.mjs](builder/book.mjs)) and the search index reads the same field ([search.mjs](builder/search.mjs)); both are upstream of the template, so the block reaches neither and nothing has to be marked or stripped downstream. The same is true of the anchor icons themselves, and of `renderChildrenNav`. If a future page-level addition *does* need to reach the book, that is the field to put it in -- not a marker attribute.
- **`min-height` for target-size belongs to `.main-content summary`**, which is same-specificity and later in `custom/custom.scss`. A local `min-height` on `.section-links > summary` silently loses to it. And the summary keeps the UA's `display: list-item`: giving a `<summary>` `display: flex` makes Chrome drop the disclosure triangle, which is the only thing marking it as openable.

One caveat on how this was checked. axe excludes `aria-hidden` subtrees from rule evaluation wholesale, so the icon vanishing from `link-name` and `target-size` is axe seeing less, not the markup being better -- exactly the pattern the rest of this section warns about. What makes the change sound is that the element was confirmed gone from the accessibility tree (Chrome CDP: ignored, `ariaHiddenElement`) and from the tab order (real Tab presses), independently of what axe reports.

#### State audits, and the hole they close

**A closed `<details>` is invisible to the scan.** Its subtree is `notRendered`, so axe never walks it -- the same property that makes the section-links disclosure cheap is what hides it. The construct went out on 707 pages with `target-size` violations on every link inside it (69.6x14 against a 24px floor) and `check.bat` reported a clean pass, because the state a reader sees after one click was never audited at all.

`STATE_AUDITS` in [scripts/lib/axe-scan.mjs](scripts/lib/axe-scan.mjs) closes that: entries layered onto the page x theme x viewport matrix that apply a DOM mutation from `PAGE_STATES` after navigation and before the audit. Two entries, each run across both themes and both viewports --- eight extra audits on top of the 52 the thirteen sample pages produce, for the 60 the scan reports.

Three things about it are load-bearing:

- **Every `PAGE_STATES` function must assert it found what it expected.** A state that silently no-ops degrades into a second audit of the default page: slower, still green, covering nothing. The `section-links-open` applier throws unless it finds exactly one disclosure holding at least two links, and returns the count so `check_a11y.mjs` can print what was actually exposed. Verified both ways -- it throws on a page with no disclosure and on one whose disclosure has been emptied.
- **The gate cannot vouch for this.** `check_a11y_fingerprint.mjs` compares a candidate against a baseline produced by that same scheme's element set, so a change to *which DOM is walked* is its documented blind spot. Adding elements is the safe direction, but it still has to be argued from source and demonstrated: the open audit walks 57 more nodes than the closed one, and with the fix reverted in-page it reports `target-size` x14 where the closed audit reports nothing. Run the A/A control (`--baseline production --candidate production`) after touching the matrix -- a nondeterministic state audit would surface there.
- **Item count buys nothing; pick the cheap host.** Menu/Window hosts it at 14 items and 0.41 s per audit rather than Pipeline-Stages at 72 and 1.28 s. The defect class is per-link geometry, identical for every item -- spacing between two consecutive items does not change with how many follow, and the long labels that make the big page look like the stress case only *wrap* at mobile, which makes a target taller and easier to pass. Both catch a reverted fix at both viewports.

`sweep_a11y.mjs` still audits every page closed only; the full-site sweep does not cover the open state.

Syntax-highlight token colours are kept above 4.5:1 automatically: [builder/highlight-theme.mjs](builder/highlight-theme.mjs) clamps any colour from the vendored `.theme` files that fails against the code-block background, moving lightness away from the background while preserving hue and saturation. The vendored themes stay faithful to the IDE; the emitted rule carries a `raised to 4.5:1` comment naming the original colour.

Requires `build.bat` to have produced an up-to-date `_site/`.

### Choosing the sample

The scan audits thirteen pages out of ~1,160, so its page list decides what it can report at all -- and a page list that stops being representative fails *silently*. That happened: the original six were picked by hand, the site grew around them, and by the time anyone measured, all six sat between 2,175 and 2,694 elements against a site maximum of 5,231 and not one carried a table, an image, a `<details>` widget or a video card. `image-alt`, the table rules and `scrollable-region-focusable` were all in the run options with nothing to run on, and the gate reported a clean pass.

A full-site sweep ([scripts/sweep_a11y.mjs](scripts/sweep_a11y.mjs) — every page, both themes, both viewports, 3,476 audits, ~20 min) settled what that pass had been hiding: **six violation classes on 54 pages**, every one of them in a construct the sample could not see. `scrollable-region-focusable` on 44 pages (table wrappers carried no `tabindex`), `link-in-text-block` on the footnote back-links, `target-size` on the FAQ's `<summary>` elements at the phone viewport, `heading-order` on five pages, `role-img-alt` on two unlabelled diagrams, and one `color-contrast` failure at 4.43:1 inside a Mermaid export (both Mermaid diagrams have since been redrawn as DOT). All fixed; the sweep is clean.

So the sample is derived rather than maintained by hand. [scripts/pick_a11y_sample.mjs](scripts/pick_a11y_sample.mjs) holds a list of **construct families** — markup shapes some axe rule keys on, each recording the rule that would otherwise have nothing to run on — and three modes:

- `--check` (the default, and what `check.bat` and both CI workflows run): every family the site uses is covered by at least one sample page, or exit 1 naming the gaps and the cheapest page that would close each. No browser, ~1 s.
- `--propose`: greedy set cover, seeded from the current `SAMPLE_PAGES`, so it prints what to *add*. `--fresh` ignores the current set and covers from scratch, which is how to ask whether the existing pages still earn their place.
- `--census`: what each family is, how many pages use it, which page uses it most.

Cost is part of the choice, not an afterthought: audit cost is super-linear in element count (k = 2.73), so the cheapest cover is not the smallest one, and `--propose` ranks candidates by measured per-page cost from the sweep's JSONL when one has been run. Measured across the full matrix, the thirteen-page sample costs 18.7 s of audit against 6.3 s for the original six -- 2.96x for a bit over twice the pages, because cost tracks element count super-linearly rather than page count. `Pipeline-Stages.html` alone is 26 % of it, and earns that as the site's largest and most table-dense page.

**When the docs start using a construct they have not used before** — a new admonition shape, a figure, a widget — add a family for it in `FAMILIES` and let `--check` say whether the sample already covers it. Leaving it out is not neutral: it means the rule for that construct never runs anywhere.

### Changing the scan

axe is the site's correctness oracle, which makes it a dangerous thing to tune: a change can make axe see *less* and still report a clean pass. This nearly happened once -- blocking `just-the-docs.js` during the scan looked like a 130 ms win and quietly dropped the colour-contrast node count on `Select-Case` from 54 to 2.

So any change to *what the scan runs* goes through [scripts/check_a11y_fingerprint.mjs](scripts/check_a11y_fingerprint.mjs) first. It runs the full page x theme x viewport matrix twice, once under each of two named configurations from the scheme registry in `axe-scan.mjs`, against one build in one process, and diffs the findings audit by audit -- violations by `ruleId:nodeCount`, incomplete by rule-id set.

```sh
node scripts/check_a11y_fingerprint.mjs --list
node scripts/check_a11y_fingerprint.mjs --candidate no-html
```

It has one blind spot worth knowing: it compares a candidate against a baseline produced by that same scheme's element set, so it cannot detect a change that stops auditing elements *entirely*. Anything touching which DOM is walked -- viewport, visibility, request blocking -- has to be argued from source instead.

One thing the gate structurally cannot catch: it compares *which* findings axe produces, never their shape. The `no-html` scheme passes the gate on every audit and would still crash the reporter, because `noHtml: true` makes `node.html` null and `check_a11y.mjs` calls `.slice()` on it. Treat the gate as necessary, not sufficient.

Cost attribution for the scan lives in [perf/ab-axe.mjs](perf/ab-axe.mjs), with [perf/probe-axe-dom.mjs](perf/probe-axe-dom.mjs) for DOM operation counts and [perf/probe-axe-scaling.mjs](perf/probe-axe-scaling.mjs) for the size curve. The investigation is [builder/PLAN-axe-perf.md](builder/PLAN-axe-perf.md), and it is **complete**. Its conclusion: one vendored source patch is worth **26 %** across a realistic page set and **30 %** on large pages -- `SOURCE_PATCHES['plain-color-fields']` in `axe-scan.mjs`, which replaces `Color2`'s WeakMap-emulated `#private` fields with plain properties. It is gated audit-by-audit by [check_a11y_fingerprint.mjs](scripts/check_a11y_fingerprint.mjs) and verified value-by-value by [check_axe_patch_equiv.mjs](scripts/check_axe_patch_equiv.mjs) -- both are needed, because the fingerprint gate compares `incomplete` as a rule-id set and would not notice a colour error that shifted ratios without flipping a pass/fail. The patch asserts an exact occurrence count at each substitution point, so an axe-core bump fails loudly rather than silently reverting. Three results are worth knowing before touching the scan:

- **Audit cost is super-linear in page size** -- `k = 2.73` on real pages, almost entirely inside `color-contrast`. The four largest pages in the site cost ~5.9x an average sample page each.
- **`SAMPLE_PAGES` used to contain only small pages** (2,175--2,694 elements, against a site maximum of 5,231) and none of the site's tables, images, disclosure widgets or video cards. Widening it -- see [Choosing the sample](#choosing-the-sample) -- found six violation classes on 54 pages, and cost 2.96x the audit time for 2.2x the pages, because cost tracks element count rather than page count.
- **Every axe-core upgrade needs the fingerprint gate run across it** -- axe ships new and revised WCAG rules between minors, and the source patches are pinned to the bundle's current text.
- **`ab-axe.mjs` cannot resolve an effect under ~20 %** -- its tracer overhead plus GC timing swamps the signal, and it has now mis-read a real ~10 % effect as noise twice (`plain-color-fields`, then `config-only`). Use [perf/ab-axe-pages.mjs](perf/ab-axe-pages.mjs) to decide anything modest, and run `--scheme production` as an A/A control before believing a small delta. `config-only` measures **-10.7 %** there against a **-0.4 %** A/A, and is declined anyway: `noHtml` and `selectors: false` remove the `html` and `target` fields that say which element failed.

The build itself includes an additional guard: tbdocs's nav integrity check ([builder/nav.mjs](builder/nav.mjs)) runs during the COMPUTE phase and aborts the build if any nav-visible page has a `parent:` (or `parent:` + `grand_parent:`) that does not resolve to exactly one page in the nav tree. It catches two failure modes:

- **Ambiguity** — multiple pages share the title declared in `parent:` and `grand_parent:` is either absent or insufficient to disambiguate. The page would silently appear under every matching parent.
- **Orphan** — no page has the title declared in `parent:`. The page would silently disappear from the navigation sidebar.

## Repository Use

Favor concise one-line git commit messages.

## Don'ts

- Don't commit `.claude/` or `CLAUDE.md` — both gitignored. (`WIP.md` is committed; `CLAUDE.md` is just a local `@WIP.md` import shim.)
- Don't touch `_site/` or `_site-offline/` (build outputs, gitignored).
- **Don't judge rendered styling by opening a built page as a `file://` URL in the in-app browser pane.** It does not apply the page's stylesheets, so everything renders unstyled and any conclusion about colour, spacing, layout or contrast drawn from it is worthless. Use `serve.bat`, which serves over HTTP at localhost and renders for real. The confusing part is that `file://` is fine *through puppeteer* -- `scripts/check_a11y.mjs`, `scripts/sweep_a11y.mjs` and the `perf/` rigs all load `_site-offline/` over `file://` and get correct computed styles, which is the entire reason the offline tree exists (see [Site integrity check](#site-integrity-check)). So: puppeteer for measuring, `serve.bat` for looking. Never the preview pane on a `file://` path.
- Don't write literal en-dash `–` or em-dash `—` in `docs/` markdown source. Use `--` (renders as en-dash) or `---` (renders as em-dash) — markdown-it's typographer does the conversion at build time. `scripts/convert_em_dash_separators.py` normalises any strays.
- Don't push or force-push without explicit user request.
- Don't leave a remote image URL in a finished page. A pasted `https://github.com/user-attachments/assets/...` link is fine to write --- [builder/vendor-assets.mjs](builder/vendor-assets.mjs) downloads it to `docs/assets/attachments/gh-<uuid>.<ext>` on the next local build and rewrites the render to point there; commit the downloaded file with the edit. Any other remote host has no such handling: download it yourself and commit it under the section's `Images/` folder. Remote images cost a network round trip per page view, break the `file://` offline mirror, and **abort the PDF book render** -- the forked paged.js in `book/lib/` dropped async image loading, so an image still in flight when the page-breaking pass runs raises instead of degrading. The build enforces this unconditionally (see [Site integrity check](#site-integrity-check)); `--check-remote-assets` is the standalone checker's flag, not a `tbdocs` one. The check is scoped to `<img>`; `<iframe>` is untouched, but the site no longer has any embeds. A video is authored as a marked link -- `[Title](https://www.youtube.com/watch?v=<id>){: .video }` -- which `videoLinkPlugin` ([builder/render.mjs](builder/render.mjs)) renders as a locally vendored poster frame linking out to the video page, styled by `.video-link` in `docs/_sass/custom/custom.scss`. That makes the site free of third-party requests entirely; don't reintroduce an embed or a hotlinked `img.youtube.com` thumbnail.
- **Don't hand-edit a diagram's `.svg`, and don't change its `font-family` anywhere but the `.dot`.** The `.svg` is a build artifact; the next build overwrites it. More to the point, Graphviz sizes every box to the text *it* measured, so a face the layout never saw leaves labels hanging outside their boxes --- which is exactly how 27 labels shipped that way across three diagrams. Edit the `.dot`, rebuild, and let `node scripts/check_dot_fit.mjs` confirm it; see [Diagrams](#diagrams).
- **Don't add a `@font-face` to `docs/_sass/custom/_fonts.scss` without also adding the stack to `modules-dark.scss`,** and don't move the `@font-face` block out of the `emit-font-faces` mixin. The dark compilation re-emits its whole payload under two selectors at raised specificity: a face declared there would be invalid, and a stack left out there applies in light mode and silently does not in dark.
- **Don't widen `SOURCE_EXTENSIONS` in [builder/publish-policy.mjs](builder/publish-policy.mjs) to make a build pass.** The build refusing a file is the gate working. Remove the file from `docs/`, or add a pattern to `exclude:` in `_config.yml`; widen the allowlist only when the type genuinely belongs on the published site, and never by folding `BUILD_EXTENSIONS` into it. See [The publish allowlist](#the-publish-allowlist).
- Don't invent semantics — read the relevant primary source before paraphrasing (VBA-Docs for VBA-derived pages; the package's `.twin` sources for twinBASIC-specific ones).
- Don't add boilerplate sections (Remarks, See Also) if the source has nothing meaningful for them.
- **Never add `Co-Authored-By:` (or any "Co-authored by" / "Generated with Claude" / similar) trailers to commit messages.** Repository policy. Plain commit messages only.
