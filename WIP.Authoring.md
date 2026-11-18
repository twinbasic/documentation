# twinBASIC Documentation --- Authoring a Page

The page-writing contract. **Read this before writing or editing any page under
`docs/`.** WIP.md keeps the placement rules, the plain-English principle in brief
and the Don'ts; everything about the shape of a page, and the full plain-English
prose rules, are here. Its public distillation,
[docs/Documentation/Authoring.md](docs/Documentation/Authoring.md), is kept in
step with it (WIP.md, *Authoring a page*).

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

- Heading levels: the page title is `#` (a *chapter* -- a page may legitimately have more than one). Top-level sections (Example, See Also, ...) are `##`; subsections `###`. Do **not** skip `##` with the `# Title` -> `### Example` pattern many older pages use: it is a heading-order defect on the built site. `headingLevelNormalizePlugin` in [builder/render.mjs](builder/render.mjs) repairs those pages at build time (it raises `h3`->`h2` on any page that uses h1 and h3 but no h2), so existing pages need no mass edit -- but new content must use correct levels, and pages that already mix `##` and `###` are left untouched. A mixed page that skips a level is a real defect the normalizer does not repair; axe's `heading-order` rule guards the sample against it.
- `**...**` for keywords/literal tokens; `*...*` for placeholders/arguments.
- Code blocks use ` ```tb ` (highlighted via Shiki using the vendored `builder/twinbasic.tmLanguage.json` grammar).
- Parameter lists use the deflist `term` + `: definition` indentation pattern (NOT the MS-style markdown table).
- **The page of a control that has a Toolbox tile starts its opening sentence with the tile's icon** (owner, 2026-11-18): `![](../../../Images/Toolbox/<Control>.png){:width="24" height="24"} A **<Control>** is ...`, the path from the page's folder to `docs/Reference/Images/Toolbox/`. Controls.md has the same image before the control's link. The alt text is empty, since the name stands beside the icon. The pictures come from `shoot_docs.mjs` (setup `toolbox-icons`, [WIP.Screenshots.md](WIP.Screenshots.md#project-setup-pictures-owner)), never from a file made by hand.
- An image names the dark `X.png` only, never `X.light.png`, `X.svg` or `X.light.svg`: the build pairs the two themes and shows each theme's SVG where `shoot_docs --svg` wrote one. `png` in the attribute block (`{:width="190" height="337" png}`) keeps that picture's PNG in every output, and `secondary` shows it at 3/4 of its size in the column (`SECONDARY_SCALE` in `builder/render.mjs`): **an IDE page that shows a picture of the Help Add-In marks it `secondary`** (owner). **Everything an IDE page says about an add-in goes in a `> [!ADDIN] <title>` box** (owner: it does not document the product directly), after the IDE's own behaviour, linking to the section of the add-in's page that has the details ([Authoring, What an add-in adds to the IDE](docs/Documentation/Authoring.md#what-an-add-in-adds-to-the-ide)). It is grey, and a `<details open>` outside the book; the book unwraps it. The rules are in [Authoring, A picture in both themes](docs/Documentation/Authoring.md#a-picture-in-both-themes) and the section after it.

### Attribution policy

The attribution rule is **per-page**, determined by content provenance — not by package membership. A symbol existing in VBA is not sufficient to require the flag: the twinBASIC page must have been derived (verbatim or paraphrased) from a specific VBA-Docs source page. Many symbols that exist in VBA have no dedicated VBA-Docs page at all, and even where one exists the twinBASIC page may have been written independently. In particular, `VBA/HiddenModule`, `VBA/Compilation`, `VBA/TbExpressionService`, and twinBASIC-specific additions within VBA modules (`CType`, `If`, `CallByDispId`, `RaiseEventByName`, `ObjPtr`, `VarPtr`, `StrPtr`, ...) are twinBASIC-original and correctly omit `vba_attribution: true` regardless of their package location. So do fully original pages such as the VB package's. The flag adds a line to the site footer.

### Authoring-only frontmatter

These keys on a package's `index.md` are **provenance for the authoring pass**. None of
them reaches the HTML --- `grep -r indexed_from docs/_site` returns nothing, because nothing
in `template.mjs` iterates frontmatter generically; every consumer reads a named field. The
build reads one of them, `exclude_from_docs`, for one purpose: the symbol index's count of
public symbols that no page documents leaves those names out (`reportableGaps` in
[builder/symbols.mjs](builder/symbols.mjs); `--symbol-gaps` writes the list). Leave them
all in place.

| Key | Means |
|-----|-------|
| `package_name` | The packages in the indexer's store that the section documents, by their names there, when the folder's name is not theirs: `WebView2Package` for `WebView2`, `CustomControls, CustomControlsPackage` for `CustomControls`, `cefPackage145` for `CEF`. Absent, the folder's name is the package's. `indexer/lib/doc-pages.mjs` reads it. |
| `indexed_from` | The twinBASIC build whose package download the documentation was indexed against, as its release tag (`beta-x-<n>`): the build whose `indexer/snapshots/` the pages are compared with. A contributed section's is the package's four-part TWINSERV version. |
| `exclude_from_docs` | Modules or classes in that package deliberately left undocumented --- internals, private helpers, API shims. |
| `exclude_kinds` | Member *kinds* deliberately left undocumented. Only `WinEventLogLib` uses it, for `Declare`. |

Together they say what a completeness check should expect: **re-index the package from a
newer build, and anything new that is not named in `exclude_from_docs` or `exclude_kinds` is
a documentation gap.** Without them a re-index cannot tell "not yet written" from
"deliberately omitted".

Every package landing page carries `indexed_from`. The CEF builds are one section with one snapshot; why, and
how the indexer ties a section to its snapshots: [indexer/README.md](indexer/README.md#documented-packages).

**Bump `indexed_from` whenever a package is re-indexed against a newer build**, in the same
commit as the content it adds, and write the new snapshots into `indexer/snapshots/` in it
(`node indexer/twin-index.mjs sync`), with `builder/package-api.json` for a built-in or
default package (`node indexer/twin-index.mjs derive`). A stale value is worse than none: it asserts a
completeness check was run against a build that no longer matches the package.

`has_children`, on a few pages, is a just-the-docs leftover: tbdocs derives the nav
tree itself and never reads it, so nobody needs to maintain it.

### `symbols:` --- what a page documents, for the symbol index

The build's symbol index (`tB/symbols.json`, [WIP.HelpAddin.md](WIP.HelpAddin.md#stage-3-the-symbol-index-generated-by-the-docs-build))
learns what a page documents from its title, less a trailing `Module`, `class` and the
like, and the comma-separated names of its first heading --- `# Left, LeftB` documents
both. A page whose title cannot name its subject says so with `symbols:`, which replaces
those names. These pages need it: the (Default) module (`[_HiddenModule]`) and the comparison
operators (`["=", "<>", "<", "<=", ">", ">="]`, quoted, since a bare `>` is YAML). On a
Core statement page the first name is the statement and the rest its keywords; on an
operator page each is an operator. **Quote `True`, `False` and `Null` too**: YAML reads them
bare as a boolean and as null, and `symbolPages` fails the build on any entry that is not a
string, rather than index it as `true`.

Summary pages outside `/tB/` are read as well (`SUMMARY_PAGES` in
[builder/symbols.mjs](builder/symbols.mjs)): each name of their `symbols:` is at the `##`
heading of that name, a `type` on `Reference/Data-Types.md` and a `keyword` on
`Reference/Literal-Keywords.md` (owner, 2026-10-29: one page for **Nothing**, **Null**,
**Empty**, **True** and **False**, a section each). `keyword` rather than `constant`, because
the search ranks a keyword with no package first and a constant not; it is also VBA's word
for them. A name with no such heading fails the build.

The build names any page in a package folder that gives the index no entry, after its
summary line: the cue to give it `symbols:`. **Do not add `symbols:` to change how a page
ranks or to add a keyword a page merely mentions**: the index is what the page documents,
and a keyword such as `ElseIf` belongs on a page only when the page explains it.

### Compiler codes in the site search

**Every `TBnnnn` code a page explains has a search-index entry** (owner): `index` on the
section that says best when the compiler reports it, `index_also` on a strong second page, as
`docs/Documentation/Authoring.md` (*Index entries for the site search*) describes. A warning's
entry is its own heading on Compiler Warnings. TB5001, TB5027, TB5079 and TB5182, which code
of every kind gives, have theirs on the Diagnostics page's *Common errors* section, and a code
that only a contributed package's page mentions gets none (owner). A new page that explains a
code takes its entry, or takes it over from a weaker page; after `build.bat`,
`node eval/site_search.mjs TBnnnn` shows where a search for it lands.

### Cross-section linking

Relative links resolve against the **rendered URL** (the page's `permalink:`), not the file path. Pages that share a URL folder can use bare names (`[Y](Y)`); crossing folders needs `../` to climb out.

**A page many pages link to can have a shortcut** (owner, 2026-10-21): `shortcut: <Name>` in
its front matter, and every page links to it as `[x](tb:<Name>)` or `[x](tb:<Name>#anchor)`,
from any folder, with no `../`. The build (`relativeLinksPlugin` in `builder/render.mjs`)
writes the page's permalink; the fragment is kept as written, and the link check checks it. A
name is a word (letters, digits, `_`, `-`, starting with a letter); an unknown name, a name two
pages claim, and `tb:` as an image's source fail the build. Inside code a `tb:` link is left as
written. `shortcut: Errors` is on `Reference/Run-time-Errors.md`, whose anchors are the
error numbers themselves: `[5](tb:Errors#5)`. Any page that wants one may have one; a plain
markdown preview (GitHub, an editor) shows such a link as dead.

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
other changes.

**`[Documentation(...)]` is not a twinBASIC attribute.** Never present it, in prose or in a
`tb` sample, as the in-source consumer of the `/tB/` URL contract. The IDE help
system remains a genuine consumer of the permalinks.

## Plain-English prose

### Sentence and structure

Sentence shape and voice; the tables further down cover word choice.

1. **Page opening.** One-sentence verb-phrase summary directly under the H1, in present tense, no preamble. *Good:* "Activates an application window." / "Writes an **Error**-type entry to the log." *Avoid:* "The **Const** statement is used to declare constants in place of literal values." For class pages, a noun-phrase descriptor is acceptable — *"A **CheckBox** is a Win32 native control that displays..."*

2. **Voice and tense.** Active voice by default. Passive only for subjectless operations where there is no obvious agent — "the entry is written", "the constant is private by default". Present tense for behavior — `returns`, not `will return`. Don't give the class human traits: it doesn't "decide", "want", or "know" — it returns, raises, contains.

3. **Sentence shape.** One idea per sentence. Prefer two short sentences over one compound sentence with nested clauses. Em-dash (`---` in the source) for parenthetical asides; reserve parentheses for code-ish notation like `(default)`.

4. **Person and pronouns.** Reference body prose uses third-person impersonal — "the constant", "the source", "the entry". Rewrite "you" to the impersonal form even in VBA-derived pages. "You" is acceptable inside `Example` lead-ins and in tutorial prose. Avoid first-person ("we", "I").

5. **Parameter descriptions.** Italic `*required*` / `*optional*` flag, then a short prose description. Lead with the type when it matters — "A **String** naming the source...", "A *T1* value naming the event...". Don't restate the parameter's name inside its own definition. Property setters omit the flag — the `[ = *value* ]` brackets on the syntax line carry that information.

6. **Callout severity.** Three severity levels, used distinctly:
   - `> [!NOTE]` — twinBASIC-vs-VBA deviations, behavior clarifications, useful caveats. Not for marketing/why-bother prose — that should be a plain paragraph.
   - `> [!IMPORTANT]` — requirements that affect correctness: admin rights, threading constraints, ordering.
   - `> [!WARNING]` — operations that can corrupt state or lose data.

   One callout per concern; don't stack a NOTE and an IMPORTANT for the same point.

   **Where twinBASIC and VB6 behave differently, say what VB6 does** (owner's rule), checked with `scripts/vb6run.mjs` or a reproducer's `vb6/` side, never from memory. Where twinBASIC's behaviour is the nominal one, the VB6 behaviour goes in a `> [!NOTE]`; inside a defect's WARNING it is one sentence, such as "VB6 raises error 6, *Overflow*." **A 64-bit build answers to 64-bit VBA, not to VB6** (owner, 2026-10-22): what 64-bit VBA also does is no defect, and the page says the 64-bit build does as 64-bit VBA does (the text of infinity and of negative zero, `inf` and `-0`, on Double.md; `scripts/lib/vba.mjs` runs a module in 64-bit Access).

   **A known twinBASIC defect that silently gives a wrong result is a `> [!WARNING]` until a fixed build is released** (owner's rule): a wrong value with no error raised is data corruption the reader cannot see. A crash is a WARNING too (unsaved data is lost), and so is an error that hides a silent part (a procedure run twice before the error). A defect the reader cannot miss and that loses nothing --- an error raised, a statement refused --- is a `> [!NOTE]`. Name the build in either, in its label (next paragraph). **Once a fixed build is released, the callout goes** (owner's rule): the documentation is not a record of past defects, so the page then states the correct behaviour with no mention of the defect. The defect's BUGS-TO-REPORT entry says in its HTML comment which page carries the callout, so the callout is removed when the entry is retired.

   **A callout says what it applies to in its label, the rest of its `[!TYPE]` line, and never in its text** (owner's rule): `> [!WARNING] BETA 1010` for a fact of that twinBASIC build, `> [!NOTE] since BETA 984` for one true from that build on, `> [!WARNING] 1.0.0.4` for one of that version of the page's own package, and `> [!NOTE] 1.6.151.1, BETA 1010` for both. `BETA` is upper case and a package version is bare, all four parts. The text then starts with the fact: never "In twinBASIC BETA 1010, ...", "BETA 1010 has a defect: ..." or "In version 1.0.0.4, ...". The build draws each item as a tag after the title and fails on anything else after `[!TYPE]`, and on a package version other than the section's `indexed_from` (`lib/callout-labels.mjs`). A label belongs on what is true of one build or one version, a defect above all; a callout that holds as well as that something true of every build is split in two. **In a contributed package's section every callout has a label** (owner's rule), the section's version for what the package does, so that moving the section to a new version sends each one back to be checked; the build refuses one without. **`> [!WARNING] timeless`** (owner's rule) marks a callout no new build or version can change: a fact of Windows or COM, behaviour the package exists to reproduce (the Scripting Runtime's, for an FSO replacement), or a design decision the sources state. It stands alone, draws no tag, and is never listed to check again; the package's test cases still cover what the package itself does.

   **Every callout labelled `BETA <n>` names what checks it** (owner, 2026-11-03), in `<!-- test: ... -->` on the line directly above it or a region around it, the grammar of a contributed section's markers (`scripts/lib/test-markers.mjs`): `bug <slug>`, `lane <suite>:<lane>`, `sample <id>` (a fence with that `id=`), `errors <name>`, `llvm <mode>`, `static <mode>`, or `none -- <reason>` when no program can check it. A fixed bug's correct behaviour goes into an inline test, a `check_run` sample or the error data, not into prose alone. A statement that needs a run whose code would tell the reader nothing is checked by a **`probe`** fence: a sample the reader never sees, with an `id=` a marker names, and `arch=win32,win64` when the 64-bit half matters (`Tools-Samples.md#probes`; the FAQ's msvbvm60 list is one). The callouts of a generated Common Errors section need no marker. `check_callout_evidence.mjs` in `test.bat` refuses a labelled callout without one, an item naming what does not exist, and a probe no marker names; `recheck_callouts.mjs` runs the evidence on a new build ([WIP.Indexer.md, Rules](WIP.Indexer.md#rules)).

7. **See Also.** Last section on the page, after `Example`; only a contributed package's landing page has one after it, `## Test cases`. Format: `- [Symbol](Symbol) <noun>` where `<noun>` is the kind: statement, function, property, method, class, module, package. Pages with annotations use `- [Symbol](Symbol) -- short description` (`--`, never a literal dash: WIP.md, *Source dashes*). Order by conceptual proximity, not strict alphabetical.

8. **Name the fault directly; never build up to it.** Setting up a contrast and then withholding the point is coy, and it makes the reader parse the sentence twice to extract one fact. *Avoid:* "double-clicking it is the obvious shortcut, and it is the one that misleads"; "the specificity trap --- which is the one thing that reliably catches people out". *Use:* "double-clicking it is obvious, and wrong"; "the specificity trap: a rule that loses it applies in light mode and silently does not in dark". Say what the thing is and what it does, in that order, in one clause. The same applies to "and that is the one that…", "which is precisely the…" and "therein lies the…".

9. **State what twinBASIC does; do not report having measured, probed or observed it.** The documentation is the authority on what twinBASIC does and speaks from inside the project, so its prose states behaviour as fact, not as the outcome of an experiment on someone else's product. The same goes for *probed*, *observed*, *noticed*, *turns out* and *appears to*, when they report what twinBASIC does. *Avoid:* "measured on BETA 995, the comma form also turns LLVM on"; "as measured, the crash needs a variable declared `As Form`"; "probed against the compiler, the attribute is accepted on..."; "the value observed is 0". *Use:* "the comma form also turns LLVM on"; "the crash needs a variable declared `As Form`" --- and where the build matters, "in BETA 995" or "since BETA 984". When a sentence really must say that a claim was checked, write *checked*, *tested*, *confirmed* or *verified*, never *measured*. *Measure* keeps its literal sense: a size, a duration, a unit of measurement, **TextWidth** measuring a string, a benchmark's timings. This applies to every page under `docs/`, the developer pages under `docs/Documentation/` included; the `WIP.*.md` files are internal working notes and keep their own register.

### Replace

| Term | Use instead |
|------|-------------|
| `at rest` (idle state) | idle, in its default state |
| `bake in` / `baked into` | embedded, stored, included |
| `bite` / `bites` (figurative) | affects, matters, goes wrong |
| `broker` (as verb) | manages, handles |
| `carry` / `carries` (figurative) | has, contains, includes |
| `catches up` | resumes, processes the queue |
| `cut` / `cuts` / `cutting` (a release, a tag, a version) | publish, make (owner: never "cut a release", anywhere, comments included) |
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

## A new top-level section

**A new top-level section needs these besides its folder**, and nothing checks the `nav_order` or the *Where content lives* line: a `nav_order` between its neighbours; an entry in `docs/_book.yml` for every page, in a part or in `left_out:` with a reason, which the build warns about under its `pdf:` summary when one is missing; a line in *Where content lives* in `docs/Documentation/Authoring.md`; and the page-count rise that `build.bat` writes to `builder/page-baseline.json`, committed with the pages. The Challenges and Videos sections are in `left_out:`. The IDE part holds every IDE page, and names its chapters one by one, so a new page in a new IDE folder warns until it goes into the part. A link from the book to a left-out page opens the website, and the pass over `book.html` lists it as `OUT OF BOOK`. A section index lists its topics by hand and sets `has_toc: false`, or the template appends a second, automatic list of its children.

## An attribute's `Applicable to:` line

**A site goes on the line only where the attribute does what its section says** (owner): build the same code with and without it, beside the attribute at a documented site as a control. A site where it does something else, or half works, stays off the line and goes in the section's HTML comment.

## Per-symbol workflow

1. **Decide placement** — pick the package's section convention:
   - Pure language keyword (parsed by the compiler, no runtime call) → `docs/Reference/Core/`.
   - Runtime function/property → `docs/Reference/<Package>/<Mod>/`. Add `redirect_from: /tB/Core/<name>` so legacy `tB/Core/<name>` links still work.
   - VB control class → `docs/Reference/Default/VB/<Class>.md` (single-file) or `docs/Reference/Default/VB/<Class>/index.md` (folder-style).
   - WebView2 → `docs/Reference/Built-In/WebView2/<Class>.md` (single-file) or `<Class>/index.md` (folder-style; the main `WebView2` class uses it). Enums under `WebView2/Enumerations/`; the one public Type under `WebView2/Types/`.
   - Assert module → `docs/Reference/Built-In/TwinBasicAssertions/<Mod>.md` — one page per module with all its members inline.
   - CustomControls control → single-file under `docs/Reference/Built-In/CustomControls/<Control>.md`, or folder-style when a state-holder / options sub-page is required. Shared style helpers under `Styles/`, framework symbols under `Framework/`, enums under `Enumerations/`.
   - CEF → `docs/Reference/Built-In/CEF/CefBrowser/index.md` (folder-style with the `EnvironmentOptions` sub-page); enums under `CEF/Enumerations/`.
   - WinEventLogLib / WinNamedPipesLib / WinServicesLib → flat, one page per public class under `docs/Reference/<Pkg>/<Class>.md`. WinServicesLib enums live under `WinServicesLib/Enumerations/`.
   - tbIDE → flat, one page per CoClass / Class under `docs/Reference/Built-In/tbIDE/<Class>.md`; nested enums fold onto their declaring class's page (no `Enumerations/` sub-folder).
   - WinNativeCommonCtls → single-file (`DTPicker`, `MonthView`, `ProgressBar`, `Slider`, `UpDown`) or folder-style (`ImageList/`, `ListView/`, `TreeView/`) when the control has sub-object companions. Module-level enums under `Enumerations/`; per-control nested enums fold onto the declaring control's page.
   - Pick `<Mod>` from VBA's grouping (Information, Interaction, Strings, FileSystem, DateTime, Math, Financial, Conversion, ...) and the existing folders under `Reference/<Package>/`.
2. **Flag tB deviations** with a `> [!NOTE]` callout (see next section). A callout labelled `BETA <n>` names what checks it in `<!-- test: ... -->` on the line above it (rule 6; [Authoring](docs/Documentation/Authoring.md#a-callout-names-what-checks-it)).
3. **Update the parent index** — turn an unlinked bullet into a link with a short blurb. Match the existing style of the page. If a new package is being added, also add a bullet to `docs/Reference/Built-In.md` (or `Default.md`) and bump the count on `docs/Reference/Packages.md` and `docs/Reference/index.md`. `Packages.md` itself only links to those two landing pages -- it does not enumerate packages.
4. **Add the page** to `Reference/Statements.md` or `Reference/Procedures and Functions.md` if it's a statement or callable and not already listed there.
5. **Run the [site integrity check](WIP.md#site-integrity-check)** after the batch and before committing.

**Finding the symbols to write.** After a `sync`, `node indexer/twin-index.mjs analyze --package <name>`
lists what is public in the package and the section's pages lack, in
`indexer/.packages/report.json`. A section with `indexed_from` is compared with the snapshot of
that build: symbols **added** (create a page), **changed** (update it; the report gives the old
and the new signature) and **removed** (flagged: reword or remove the page by hand). A section
without it is audited: each public symbol is matched by name with the `title:` of the section's
pages, so a member documented inline on its container's page is listed as missing, and a name
that several types share counts as documented once any page has it. A symbol is a type or a
name a type declares, so a property's Get, Let and Set and the overloads of a name are one.
Anything deliberately undocumented belongs in the landing page's `exclude_from_docs` or
`exclude_kinds` (see [Authoring-only frontmatter](#authoring-only-frontmatter)), not left in
the list. When the batch is done, bump `indexed_from` and commit the new snapshots and
`derive`'s `builder/package-api.json` with it; the
rules and the reasons are in [WIP.Indexer.md](WIP.Indexer.md#rules).

## twinBASIC deviations from VBA to flag

Add a `> [!NOTE]` callout or rewrite the affected section when source diverges. Known cases:

- `Date`, `Date$`, `Time`, `Time$` are **properties** in twinBASIC, not functions/statements — see `docs/Reference/Default/VBA/DateTime/Date.md` for the pattern.
- `Decimal` is a **full data type** in twinBASIC, not just a **Variant** subtype: `Dim x As Decimal` compiles and runs. VBA-Docs text that calls it unsupported, or reachable only through `CDec`, must be rewritten --- see [Features → New Data Types](docs/Features/Language/Data-Types.md).
- twinBASIC adds `Continue`, attribute syntax `[Description("...")]`, and other features documented under `docs/Features/`.
- Some VBA-Docs pages have Office-host-specific Application objects — irrelevant; omit.
- Mac-specific notes from VBA-Docs are typically irrelevant; trim.

When in doubt about a tB-specific behavior, check `docs/Features/` and `docs/Reference/index.md` before assuming VBA semantics carry over.

**VBA-Docs content that twinBASIC and VB6 both contradict is commented out, not deleted**
(owner, 2026-10-21): the documentation is meant to become switchable between VB6, VBA and
twinBASIC, and the VBA text should not be lost. Put it in an HTML comment that starts
`<!-- VBA:` and says why it is out, outside any table (a comment line inside a markdown
table ends the table), and keep `--` out of it. The **vbUseCompareOption** rows of InStr and
InStrRev, which raise error 5 in both runtimes, are commented out this way.

## Document the product as it is, not as it was

**twinBASIC is in a long beta, so a superseded name is not history --- it is noise.**
Document the current API and nothing else. A reader cannot use a name that no longer
exists, cannot search for it, and would have to keep two names in mind to read one snippet.

Show the current name and no note about the old one. The CustomControls tutorials show
`SerializeInfo` and `RuntimeUISrzDeserialize()`, not the superseded `SerializationInfo`
and `Deserialize()` with a NOTE explaining the difference.

Version-skew notes earn their place when a reader may be *on* the older version --- a
behaviour that changed in a shipped BETA, where the page says which build changed it (see
`redirect_from` and the `[!NOTE]` conventions above). Nobody is on a pre-release draft of a
name. **From v1 this rule relaxes**: once there are releases people stay on, what changed
between them becomes something a reader needs.

## A script is findable only if its bare name is a token prefix somewhere

lunr's tokeniser splits on **whitespace and hyphens only** (`/[\s\-]+/`), and the site's
query adds a *trailing* wildcard. Put those together and a heading written
`### scripts/check_page_baseline.mjs` indexes as one token beginning `scripts/`, which a
reader's query `check_page_baseline` can never prefix-match. Measured:

| query | results |
|---|---|
| `scripts/check_page_baseline.mjs` | 4 |
| `check_page_baseline` | **0** |
| `check-page-baseline` | 420, as noise --- hyphens split, so it becomes three common words |

**So write each script's heading without the directory prefix**, so the token is
`check_page_baseline.mjs` and the trailing wildcard reaches it. Nothing is lost from the
page: each entry's anchor is pinned with `{: #... }` so no URL moves, and the synopsis
block on the next line still shows the full `node scripts/<name>.mjs`. Every script name
returns hits this way, and the index does not grow.

**Two other fixes were measured and rejected; do not re-propose them.**
Raising `search.heading_level` to 3 --- so each `###` becomes its own entry, which would
give a script section its own title boost and its own anchor in the results ---
**doubles the index, 3,742 entries to 7,524, and does not fix it**: the titles still carry
the `scripts/` prefix, so the bare query still misses. That doubles a 3.4 MB payload every
page already downloads, for nothing. Widening the tokeniser's separator to include
`/`, `_` and `.`: the `check-page-baseline` row above is what it would do to *every* path token on a site whose subject matter is `Debug.Print`
and `_App`.
