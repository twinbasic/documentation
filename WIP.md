# twinBASIC Documentation — Working Notes

Jekyll site (`just-the-docs` theme) deploying to `docs.twinbasic.com`. Source under `docs/`.

## Current Task

Fill out reference documentation by adapting Microsoft VBA-Docs (CC-BY-4.0) for twinBASIC, and document the twinBASIC-specific packages (`VB`, `WebView2Package`, …) from their `.twin` source. Always work from a primary source — never paraphrase from memory.

Status:

- **VBA package** — done.
- **VBRUN package** — done.
- **VB package** — done.
- **WebView2Package** — in progress.

## Where things live

- `docs/Reference/Core/` — language statements/keywords (`Dim`, `For-Next`, `Sub`, ...).
- `docs/Reference/<Package>/<Mod>/` — runtime library (VBA, VBRUN), grouped by modules.
- `docs/Reference/<Package>/<Mod>/index.md` — module landing page listing its members.
- `docs/Reference/VB/<Class>.md` — single-file class page (e.g. [`CheckBox.md`](docs/Reference/VB/CheckBox.md)).
- `docs/Reference/VB/<Class>/index.md` — folder-style class page when sub-pages may follow (e.g. [`CheckMark/index.md`](docs/Reference/VB/CheckMark/index.md)).
- `docs/Reference/VB/todo.md` — backlog tracker for the VB package; see [Backlog discovery](#backlog-discovery).
- `docs/Reference/WebView2Package/` — WebView2 package: the **WebView2** control class plus its small wrapper classes (request / response / headers / environment options) and the `wv2…` enumerations.
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
etc.
```

### VB Controls

The `STANDARD/` folder is the primary backlog. The `BASE/` folder defines the inheritance chain (e.g. `BaseControlWindowlessNoFocus` → `BaseControlRectDockable` → `BaseControlRect` → `BaseControl`); read those alongside the leaf class to know which `Public` members are actually visible. Members marked `Protected` or hidden behind `[Unimplemented]` should be flagged with a `> [!NOTE]` callout.

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

Enumerations live in `Support/Enumerations.twin` (module `WebViewEnums`) and currently number ten: `wv2PermissionKind`, `wv2PermissionState`, `wv2ErrorStatus`, `wv2KeyEventKind`, `wv2WebResourceContext`, `wv2ProcessFailedKind`, `wv2ScriptDialogKind`, `wv2HostResourceAccessKind`, `wv2PrintOrientation`, `wv2DefaultDownloadCornerAlign`. Group them under `WebView2Package/Enumerations/` following the VBRUN `Constants/` precedent — one page per enum, with `AlignConstants.md` as the formatting model.

`COREWEBVIEW2_PHYSICAL_KEY_STATUS` is a public `Type` in the `WebViewTypes` module; it surfaces through the `AcceleratorKeyPressed` event arguments. One page (`WebView2Package/Types/COREWEBVIEW2_PHYSICAL_KEY_STATUS.md`) is enough.

The package is licensed **MIT** (copyright Wayne Phillips T/A iTech Masters, 2022) — independent of the CC-BY-4.0 VBA-Docs sources. These pages are fully original content; **omit** the `vba_attribution: true` flag, the same as VB-package pages.

**Navigation title:** display the package as **`WebView2 Package`** (space-separated, dropping the doubled "Package"), even though the folder / URL segment and source-side symbol stay `WebView2Package`. So the index page carries `title: WebView2 Package` while keeping `permalink: /tB/Packages/WebView2Package/`, and every child page sets `parent: WebView2 Package` (matching the title, not the URL segment) — same split that VB / VBRUN already use (`title: VB Package` over `permalink: /tB/Packages/VB/`).

Pre-existing `WebView2` references on the site to keep aligned:

- [`docs/Tutorials/WebView2/`](docs/Tutorials/WebView2) — task-oriented tutorial; new reference pages should cross-link to it where useful, and vice versa.
- [`docs/Reference/VBRUN/Constants/ControlTypeConstants.md`](docs/Reference/VBRUN/Constants/ControlTypeConstants.md) — already lists `vbWebView2 = 18`; the new `WebView2` reference page should link to that constant.

## Page template

Match the existing style. Worked examples to imitate:

- Core statement: `docs/Reference/Core/Const.md`, `docs/Reference/Core/Dim.md`, `docs/Reference/Core/Call.md`.
- VBA module function: `docs/Reference/VBA/Interaction/AppActivate.md`, `docs/Reference/VBA/Interaction/Beep.md`.
- VBA property with `Core/` redirect: `docs/Reference/VBA/DateTime/Date.md`.
- VBRUN module member: `docs/Reference/VBRUN/AmbientProperties/BackColor.md`, `docs/Reference/VBRUN/PropertyBag/index.md`.
- VB control class (single-file): `docs/Reference/VB/CheckBox.md`.
- VB control class (folder-style): `docs/Reference/VB/CheckMark/index.md`.

Skeleton:

````markdown
---
title: <Symbol>
parent: <Statements | Procedures and Functions | <Mod> Module | VB Package>
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
- WebView2 class → `/tB/Packages/WebView2Package/<Class>` (or `/tB/Packages/WebView2Package/<Class>/` for folder-style — used by `WebView2/`)
- WebView2 enumeration → `/tB/Packages/WebView2Package/Enumerations/<Enum>` (one segment deeper than a class, parallel to VBRUN's `Constants/<Enum>`)

Common patterns:

| From                                       | To                                          | Link                                       |
|--------------------------------------------|---------------------------------------------|--------------------------------------------|
| any page                                   | sibling in same URL folder                  | `[Y](Y)`                                   |
| VBA `Modules/<Mod>/X`                      | VBA `Modules/<OtherMod>/Y`                  | `[Y](../<OtherMod>/Y)`                     |
| VBA `Modules/<Mod>/X`                      | `Core/Y`                                    | `[Y](../../Core/Y)`                        |
| VBA `Modules/<Mod>/X`                      | VBRUN `Packages/VBRUN/<Mod>/Y`              | `[Y](../../Packages/VBRUN/<Mod>/Y)`        |
| VBA `Modules/<Mod>/X`                      | VB `Packages/VB/Y`                          | `[Y](../../Packages/VB/Y)`                 |
| VBA `Modules/<Mod>/X`                      | WebView2 `Packages/WebView2Package/Y`       | `[Y](../../Packages/WebView2Package/Y)`    |
| VBRUN `Packages/VBRUN/<Mod>/X`             | VBRUN `Packages/VBRUN/<OtherMod>/Y`         | `[Y](../<OtherMod>/Y)`                     |
| VBRUN `Packages/VBRUN/<Mod>/X`             | `Core/Y`                                    | `[Y](../../../Core/Y)`                     |
| VBRUN `Packages/VBRUN/<Mod>/X`             | VBA `Modules/<Mod>/Y`                       | `[Y](../../../Modules/<Mod>/Y)`            |
| VBRUN `Packages/VBRUN/<Mod>/X`             | WebView2 `Packages/WebView2Package/Y`       | `[Y](../../WebView2Package/Y)`             |
| VB `Packages/VB/X` (single-file)           | VB `Packages/VB/Y` (sibling)                | `[Y](Y)`                                   |
| VB `Packages/VB/X` (single-file)           | VBRUN `Packages/VBRUN/<Mod>/Y`              | `[Y](../VBRUN/<Mod>/Y)`                    |
| VB `Packages/VB/X` (single-file)           | `Core/Y`                                    | `[Y](../../Core/Y)`                        |
| VB `Packages/VB/<Class>/index`             | VB `Packages/VB/<OtherClass>`               | `[Y](../<OtherClass>)`                     |
| VB `Packages/VB/<Class>/index`             | VBRUN `Packages/VBRUN/<Mod>/Y`              | `[Y](../../VBRUN/<Mod>/Y)`                 |
| VB `Packages/VB/<Class>/index`             | `Core/Y`                                    | `[Y](../../../Core/Y)`                     |
| WebView2 `Packages/WebView2Package/X` (single-file) | sibling `Packages/WebView2Package/Y` | `[Y](Y)`                                   |
| WebView2 `Packages/WebView2Package/X` (single-file) | `Packages/WebView2Package/Enumerations/Y` | `[Y](Enumerations/Y)`                     |
| WebView2 `Packages/WebView2Package/X` (single-file) | VBRUN `Packages/VBRUN/<Mod>/Y`       | `[Y](../VBRUN/<Mod>/Y)`                    |
| WebView2 `Packages/WebView2Package/X` (single-file) | VB `Packages/VB/Y`                   | `[Y](../VB/Y)`                             |
| WebView2 `Packages/WebView2Package/X` (single-file) | `Core/Y`                             | `[Y](../../Core/Y)`                        |
| WebView2 `Packages/WebView2Package/<Class>/index`   | sibling `Packages/WebView2Package/Y` | `[Y](../Y)`                                |
| WebView2 `Packages/WebView2Package/<Class>/index`   | `Packages/WebView2Package/Enumerations/Y` | `[Y](../Enumerations/Y)`                  |
| WebView2 `Packages/WebView2Package/<Class>/index`   | VBRUN `Packages/VBRUN/<Mod>/Y`       | `[Y](../../VBRUN/<Mod>/Y)`                 |
| WebView2 `Packages/WebView2Package/<Class>/index`   | `Core/Y`                             | `[Y](../../../Core/Y)`                     |
| WebView2 `Packages/WebView2Package/Enumerations/X`  | sibling `Enumerations/Y`             | `[Y](Y)`                                   |
| WebView2 `Packages/WebView2Package/Enumerations/X`  | `Packages/WebView2Package/<Class>` (single-file) | `[Y](../<Class>)`                |
| `Core/X`                                   | VBA `Modules/<Mod>/Y`                       | `[Y](../Modules/<Mod>/Y)`                  |
| `Core/X`                                   | VBRUN `Packages/VBRUN/<Mod>/Y`              | `[Y](../Packages/VBRUN/<Mod>/Y)`           |
| `Core/X`                                   | VB `Packages/VB/Y`                          | `[Y](../Packages/VB/Y)`                    |
| `Core/X`                                   | WebView2 `Packages/WebView2Package/Y`       | `[Y](../Packages/WebView2Package/Y)`       |
| `Core/X`                                   | `Core/Y` (sibling)                          | `[Y](Y)`                                   |

Always link to the **canonical** location (the page's `permalink:`), not to a `redirect_from` alias. Pages that have moved out of `Core/` retain a `redirect_from: /tB/Core/<X>` so legacy links still work, but forward-style links should point at the new home.

## Per-symbol workflow

1. **Locate the source**:
   - Core / VBA / VBRUN symbols → `ls ../VBA-Docs/Language/Reference/User-Interface-Help/ | grep -i <name>`.
   - VB control classes → `..\tb-export\NewProject\Packages\VB\Sources\CONTROLS\STANDARD\<Class>.twin` (and the relevant `BASE/Base*.twin` files for inherited members).
   - WebView2Package items → `..\tb-export\NewProject\Packages\WebView2Package\Sources\Classes\<Class>.twin`, with enumerations in `Support\Enumerations.twin` and the one user-type in `Support\Types.twin`. Ignore everything under `Abstract\` (private COM interfaces).
2. **Decide placement**:
   - Pure language keyword (parsed by the compiler, no runtime call) → `docs/Reference/Core/`.
   - Runtime function/property → `docs/Reference/<Package>/<Mod>/`. Add `redirect_from: /tB/Core/<name>` so legacy `tB/Core/<name>` links still work.
   - VB control class → `docs/Reference/VB/<Class>.md` for a single-file page, or `docs/Reference/VB/<Class>/index.md` if sub-pages are likely. No `Core/` redirect — these were never under `Core/`.
   - WebView2 control / wrapper class → `docs/Reference/WebView2Package/<Class>.md` (single-file) or `docs/Reference/WebView2Package/<Class>/index.md` (folder-style; use this for the main `WebView2` class because of its size).
   - WebView2 enumeration → `docs/Reference/WebView2Package/Enumerations/<Enum>.md`, mirroring `docs/Reference/VBRUN/Constants/`.
   - WebView2 user-type → `docs/Reference/WebView2Package/Types/<Name>.md`.
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
6. **Flag tB deviations** with a `> [!NOTE]` callout (see next section).
7. **Update the parent index** (`<Package>/<Mod>/index.md`, `docs/Reference/VB/index.md`, `docs/Reference/WebView2Package/index.md`, `Reference/Statements.md`, or `Reference/Procedures and Functions.md`) — turn an unlinked bullet into a link with a short blurb. Match the existing style of the page.
8. **Remove the symbol's path from `docs/Reference/VB/todo.md`** `redirect_from:` array (VB controls only — VBA/VBRUN backlogs are closed; WebView2Package has its own small backlog driven by the package's `Classes/`+`Support/` listing rather than a `todo.md`).
9. **Add the page** to `Reference/Statements.md` or `Reference/Procedures and Functions.md` if it's a statement or callable and not already listed there.
10. **Run the [site integrity check](#site-integrity-check)** after the batch and before committing.

## twinBASIC deviations from VBA to flag

Add a `> [!NOTE]` callout or rewrite the affected section when source diverges. Known cases:

- `Date`, `Date$`, `Time`, `Time$` are **properties** in twinBASIC, not functions/statements — see `docs/Reference/VBA/DateTime/Date.md` for the pattern.
- `Decimal` data type is reserved but not currently supported. Note where applicable.
- twinBASIC adds `Continue`, attribute syntax `[Documentation("...")]`, and other features documented under `docs/Features/`.
- Some VBA-Docs pages have Office-host-specific Application objects — irrelevant; omit.
- Mac-specific notes from VBA-Docs are typically irrelevant; trim.

When in doubt about a tB-specific behavior, check `docs/Features/` and `docs/Reference/index.md` before assuming VBA semantics carry over.

## Scripts and tooling

Any new helper script (backlog reconciliation, content conversion, link checks beyond htmlproofer, etc.) should be written in **Python**. Do not add new Ruby code to this repo. The only Ruby allowed is the existing Jekyll/`just-the-docs` build chain (`Gemfile`, `Gemfile.lock`, `_plugins/`) — that stays as-is.

## Build / preview

From `docs/`:

- `bundle exec jekyll build` (or `build.bat`) — build to `_site/`.
- `bundle exec jekyll serve` (or `serve.bat`) — local server at `localhost:4000`.
- `bundle exec htmlproofer ./_site --disable-external --no-enforce-https` (or `check.bat`) — link check. See [Site integrity check](#site-integrity-check).

## Site integrity check

After a batch of changes, verify the site builds clean and all links resolve. From the `docs/` folder, run **exactly** this command:

```sh
bundle exec htmlproofer ./_site --disable-external --no-enforce-https
```

Do not add, remove, or substitute flags. This catches broken intra-site links, missing pages, and malformed `redirect_from` entries — the most common breakage when adding new pages or moving content between sections. A clean run is the bar for "ready to commit".

Requires a prior `bundle exec jekyll build` so `_site/` is current.

## Repository Use

Favor concise one-line git commit messages.

## Don'ts

- Don't commit `.claude/` or `CLAUDE.md` — both gitignored. (`WIP.md` is committed; `CLAUDE.md` is just a local `@WIP.md` import shim.)
- Don't touch `_site/` (build output, gitignored).
- Don't push or force-push without explicit user request.
- Don't invent semantics — read the source file in `../VBA-Docs/` first. For twinBASIC-specific packages not documented in VBA-Docs, read the `.twin` sources under `..\tb-export\NewProject\Packages\<package>\Sources\` first.
- Don't add boilerplate sections (Remarks, See Also) if the source has nothing meaningful for them.
- **Never add `Co-Authored-By:` (or any "Co-authored by" / "Generated with Claude" / similar) trailers to commit messages.** Repository policy. Plain commit messages only.
