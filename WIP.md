# twinBASIC Documentation — Working Notes

Static site (`just-the-docs` theme look-and-feel) deploying to `docs.twinbasic.com`. Source under `docs/`, build pipeline (`tbdocs`) under [builder/](builder/).

## Which file to open

This file is the contract: what a session needs before touching anything. Its
siblings say why a tool is built the way it is: the reason, and any measurement
that still decides something. **None of them is loaded automatically.** Open the
one covering what you are about to change.

| About to | Read first |
|---|---|
| write or edit any page under `docs/` | [WIP.Authoring.md](WIP.Authoring.md) --- page template, frontmatter, cross-section linking tables, per-symbol workflow |
| document a specific package | that package's own file, listed under [Package API notes](#package-api-notes) |
| run or change the twinBASIC compiler harness | [WIP.Harness.md](WIP.Harness.md) --- `export`, the attribute census, `tbbuild`, `tbrun`, the add-in test runner |
| change `builder/`, `scripts/`, or any gate | [WIP.Build.md](WIP.Build.md) --- the pipeline and why each gate exists |
| touch fonts, diagrams, or the PDF's type | [WIP.Typography.md](WIP.Typography.md), then [WIP.Fonts.md](WIP.Fonts.md) for the generator |
| change the accessibility scan | [WIP.A11y.md](WIP.A11y.md) --- the axe scan, the sample, the fingerprint gate |
| work on the sample-compiling harness | [WIP.ExamplesBuild.md](WIP.ExamplesBuild.md) |
| run or change Wisdom, the Discord harvester | [WIP.Wisdom.md](WIP.Wisdom.md) --- the three-phase pipeline and the Phase 3 extract flow |
| retake the documentation's IDE screenshots, or change the tool that takes them | [WIP.Screenshots.md](WIP.Screenshots.md) --- `shoot_docs.mjs`: the setups, cut-outs, the annotation overlay and the owner's decisions |
| work on the IDE help add-in, or on testing IDE add-ins by machine | [WIP.HelpAddin.md](WIP.HelpAddin.md) --- the plan, the IDE facts it rests on, and the probes still open |
| run a use-case evaluation round | [eval/README.md](eval/README.md) --- start every evaluator with `eval/run_case.mjs`, **never as a subagent**: a subagent inherits this session's `CLAUDE.md`, and with it this file, which is the answer key the corpus withholds |

The rule that decides where a new note belongs: **this file says what to do, a
sibling says why it is done that way.** A rule you must follow goes here. The
reason for a rule, and a measurement that still decides something, go in a
sibling. History goes nowhere: git keeps it.

## Status

Reference documentation is **complete** for all thirteen packages: VBA, VBRUN, VB, WebView2, Assert, CustomControls, CEF, WinEventLogLib, WinNamedPipesLib, WinServicesLib, tbIDE, WinNativeCommonCtls and AppGlobalClassObject. It is adapted from primary sources: Microsoft VBA-Docs (CC-BY-4.0) for the runtime library, `.twin` source for the twinBASIC-specific packages. The CEF and WebView2 packages also carry a tutorial set.

The rest of this file is the maintenance guide for updating existing pages or adding new ones: package surface notes, page conventions, and the integrity check.

## Where things live

> **Packages are nested one level deeper than a bare `docs/Reference/<Package>/`.**
> They sit in `docs/Reference/Default/` --- the three packages every
> project references (`VB`, `VBA`, `VBRUN`) --- or in `docs/Reference/Built-In/` --- the ten
> that ship with the IDE but are referenced on demand (`AppGlobalClassObject`, `CEF`,
> `CustomControls`, `TwinBasicAssertions`, `WebView2`, `WinEventLogLib`,
> `WinNamedPipesLib`, `WinNativeCommonCtls`, `WinServicesLib`, `tbIDE`). `Core/` is not
> nested.
>
> **The folder layout does not affect URLs.** Every `permalink:` is independent of it, so the
> [Cross-section linking](WIP.Authoring.md#cross-section-linking) tables are unaffected --- they
> resolve against the rendered URL, never the file path. Only the on-disk paths in this
> section and in [Per-symbol workflow](WIP.Authoring.md#per-symbol-workflow) carry the prefix.
>
> The `Assert` package's folder is `Built-In/TwinBasicAssertions/`,
> though its title, nav parent and permalinks all say `Assert`.

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

  > **Two rules come from this package.** First, **never widen an `exclude:` entry in
  > `_config.yml` to a bare underscore prefix.** The twinBASIC interface is named `_App`
  > (the COM hidden-interface convention), so a blanket `**/_*/**` would drop all 37
  > pages under `_App/`. The exclude is scoped to `**/_Images/**` (plus `**/*.af`).
  > Second, a UTF-8 BOM in front of a page's `---` hides its frontmatter: `discover`
  > would file the page as a *static file* and serve the raw markdown. Editors on
  > Windows add a BOM unasked. `lib/frontmatter.mjs` strips a leading BOM before parsing.
- `docs/Reference/Built-In/tbIDE/` — IDE Extensibility package (this is the **addin SDK**). The package is type-only — it ships **public interfaces + CoClasses** that an addin DLL binds to; every implementation behind them lives in the twinBASIC IDE itself. The user-facing surface is one entry-point factory (`tbCreateCompilerAddin`) plus 23 CoClasses grouped by role: the addin contract (`AddIn`), the root API (`Host`), the loaded `Project`, the editors collection (`Editor` / `CodeEditor` / `Editors`), the virtual file system (`FileSystem` / `FileSystemItem` / `Folder` / `File`), the in-IDE UI surface (`Toolbar` / `Toolbars` / `Button` / `ToolWindow` / `ToolWindows`), the HTML DOM inside a tool window (`HtmlElement` / `HtmlElements` / `HtmlElementProperty` / `HtmlElementProperties` / `HtmlEventProperty` / `HtmlEventProperties`), the `DebugConsole`, `KeyboardShortcuts`, `Themes`, and the single concrete user-instantiable helper class `AddinTimer`. Flat layout — one page per CoClass / Class plus the index landing.
- `docs/Reference/Statements.md` — alphabetical index of language statements.
- `docs/Reference/Procedures and Functions.md` — alphabetical index of procedures/functions.
- `docs/LLVM/` — the LLVM section: compiling with the LLVM back end. A top-level section between Features and Reference Section in the nav, at `nav_order: 6` (Features is 5). `index.md` is the landing page and `Getting-Started.md` the only page so far, with its screenshots under `Images/`. Everything it describes arrived in **BETA 984**. Its language claims are measured on BETA 995 with `tbrun --llvm` and `--exe`: the comma, space and comma-space spellings of `[CompilerOptions]` all turn LLVM and `+optimize` on, `[CompilerOptions("")]` turns it off under project-wide LLVM, the long CPU-flag sample runs, and an error is lost between procedures when either the callee or the caller is LLVM-compiled. Its samples are marked `check_build`, which compiles them; `examples.bat --llvm` also builds them with LLVM.

  **A new top-level section needs four things besides its folder**, and nothing checks the first and the third: a `nav_order` between its neighbours; an entry in `docs/_book.yml` for every page, in a part or in `left_out:` with a reason, which the build warns about under its `pdf:` summary when one is missing; a line in *Where content lives* in `docs/Documentation/Authoring.md`; and the page-count rise that `build.bat` writes to `builder/page-baseline.json`, committed with the pages. The Challenges and Videos sections are in `left_out:`, and so are the IDE pages that are still screenshots and labels; the IDE part names its pages one by one, so a new IDE page warns until it goes into the part or into `left_out:`. A link from the book to a left-out page opens the website, and the pass over `book.html` lists it as `OUT OF BOOK`. A section index lists its topics by hand and sets `has_toc: false`, or the template appends a second, automatic list of its children.
- Footer rendering — [builder/template.mjs](builder/template.mjs)'s `renderFooterCustom()` renders the copyright line and, when `vba_attribution: true` is set in a page's frontmatter, an additional CC-BY-4.0 attribution line beneath it.
- Contributor authoring guide --- see [Authoring a page](#authoring-a-page).

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

### Driving the twinBASIC compiler

The package sources are not in this repository --- they are inside the
`.twinproj` files an IDE install ships. Exported sources are the strongest
evidence for anything the documentation asserts about legal syntax. For a
question no shipped source answers, the construct has to go to the compiler.
Four tools do that. Each finds the IDE itself: the newest
`twinBASIC_IDE_BETA_<n>` on the Desktop, with `--ide` or `TB_IDE` overriding.
**No install path is hardcoded anywhere in the tooling**, because an install
path contains a username.

```sh
node scripts/impexp.mjs export <some>.twinproj <out-dir>   # a project's or package's sources
node scripts/census_attributes.mjs --out census.md   # every attribute, by enclosing construct
node scripts/sweep_attributes.mjs --out sweep.md --dump-results sweep.json   # every attribute at every site, 8 to 16 min
node scripts/tbbuild.mjs C:/probe/Thing.twinproj     # does it compile
node scripts/tbrun.mjs <exported-source-dir>         # what does it print
```

- **Pack and unpack projects with `impexp`, never with the compiler executable's `import` or `export` verbs.** The tooling does both in process, through `packTree` and `unpackProject` in `scripts/lib/tb-project.mjs`; by hand it is `node scripts/impexp.mjs`. The compiler's `import` refuses a project that embeds a package (exit 999, twinbasic/twinbasic#841), and both verbs exit 0 after the failures they report. The reasons, and the path and stdin rules for anything that does run the executable (`bug_repro`'s `cli` mode), are in [WIP.Harness.md](WIP.Harness.md#getting-at-the-twin-sources).
- **`tbbuild` exit codes:** 0 clean, 1 the project has errors, 2 the harness failed or the project file cannot be read (empty, cut short, not a project: it is read before an IDE starts), 3 the compile never settled, 4 the project crashes the compiler, 5 the build failed after a clean compile. `--json` returns one object, `--keep` leaves the IDE running. **`--build` and `--llvm` (which implies it) build the project after a clean compile**, because LLVM code generation runs in a build and a compile never asks for it. They first stage a copy with an explicit build path (`%TEMP%\tbbuild\<port>\`), so the given `.twinproj` is untouched. A plain `--build` is the control for an `--llvm` run. `--llvm` refuses a Community or Personal licence.
- **It runs the IDE on a private Windows desktop**, so it cannot seize focus. Set `TBBUILD_SHOW=1` while working interactively and leave it unset for unattended runs: a wedged IDE nobody can see is expensive to diagnose.
- **One project per IDE**, 6--8 seconds each and flat in project size. Reusing a live IDE for a second project wedges it, so the cold start is the unit of work, not overhead to optimise away. Run concurrently to go faster: distinct `--port` values give distinct DevTools ports, user-data folders, temp folders (`%TEMP%\tbbuild-tmp-<port>`; IDEs building in one temp folder fail now and then to write the type library) and desktops.
- **Keep a probe that might crash the compiler in a project of its own.** twinBASIC runs the compiler in the same process as user code, so one bad probe can take the run down and cost the other probes their answer.
- **`tbrun` takes an exported tree, not a `.twinproj`**, because it has to pin `project.buildPath` in its own staged copy. A project still on the default template opens a native Save dialog that is invisible on the private desktop: the build never happens, while every health check says the IDE is fine. The probe is a module with a `[RunAfterBuild]` Sub, and must start with `Debug.Cls`. Its exit codes: 0 the probe ran and its output was captured, 1 the project has compile errors, 2 the harness failed or the build did after a clean compile, or the probe's module holds a procedure named like the module, which stops the `[RunAfterBuild]` Sub from running (BETA 997; `--allow-name-clash` runs it anyway), 3 no output, 4 the compiler crashed, as `tbbuild` reports it, 5 the probe ended before it returned (`End`, or an error raised with no handler in LLVM-compiled code, which ends the run silently), 6 with `--exe`, the exe exited with a code other than 0, the event log records that it faulted, it opened a box (an unhandled error opens one, and `tbrun` closes it), or it was still running at `--timeout`.
- **Measuring LLVM: `tbrun --llvm`** (or `--compiler-options "<s>"`) compiles the whole probe with LLVM, by setting `compiler.debugOptions` --- what a `[RunAfterBuild]` run is compiled with; `compiler.buildOptions` alone does not reach it (BETA 995) --- and `compiler.buildOptions`, for the exe. It refuses a Community or Personal licence. `--exe` also runs the built exe on a private desktop; the exe runs `Sub Main` and prints with `TbRun.Out`, a module `tbrun` adds, because `Debug.Print` writes nothing in an exe.
- **A census is evidence, not applicability.** The corpus not using an attribute somewhere does not mean the compiler refuses it there, and the reverse also holds. Only a probe settles that.
- **The sweep is the probe for a whole attribute.** Before writing or changing an attribute's `Applicable to:` line, run `sweep_attributes.mjs --names <Name>` (a minute or a few; the once-per-project ones, `RunAfterBuild` and `RunBeforeStartupObject`, take several); it tries every declaration site, not only the ones already claimed. **Always pass `--out` and `--dump-results`**: a run piped through `tail` keeps one line of a report that takes ten minutes. A clean build there means the compiler accepts the attribute, not that it does anything, and an Enum member cannot be tested at all (see [WIP.Harness.md](WIP.Harness.md#sweeping-every-attribute-at-every-site)).
- **End an IDE by its pid, never by image name.** `taskkill /IM twinBASIC.exe` ends every other run's IDE, another session's included, and the user's own. `tbbuild --keep` prints the pid for this reason.

Why each of those is true, what the WebView/CDP route costs, why the harness
drives the IDE rather than the compiler's own websockets, and the seven ways a
sweep of this corpus returns a wrong answer: [WIP.Harness.md](WIP.Harness.md).

**Testing an IDE add-in** is `addin-test.bat`, run by a person as `examples.bat` is. Each
lane in `test/addin/lanes.mjs` builds the add-ins it tests into a private copy of the
install and operates an IDE; the plan it serves is [WIP.HelpAddin.md](WIP.HelpAddin.md), and
how it works is [WIP.Harness.md, The add-in test
runner](WIP.Harness.md#the-add-in-test-runner).

```sh
addin-test.bat                     # every lane
addin-test.bat --only sample15     # one lane; --port N moves where the lanes' ports start
```

- **Never build or copy a test add-in into the real install's `addins\`, or into `%APPDATA%\twinBASIC\addins\`.** Either way it loads into the user's own IDE (measured for the second). A test add-in goes only into a lane's own folders: its copy of the install, where `addAddin` refuses anywhere else, or the `APPDATA` the lane gives every IDE it starts. That private `APPDATA` is also what keeps the user's own add-ins out of the test IDEs; never start a lane IDE without it.
- **A test never opens a real browser.** Every IDE the harness starts has `TB_ADDIN_TEST=1`, and an add-in under test prints `open <url>` to the DEBUG CONSOLE instead. Never start a test IDE with the variable removed unless its add-in opens nothing either way.
- **A test never starts a program on the user's desktop.** An IDE goes through `launchIde`, and any other executable --- the compiler's command line included --- through `launchOnDesktop` (`scripts/lib/tb-ide.mjs`), which puts it on a private desktop and closes any dialog it opens. A plain `spawn` or `spawnSync` of a twinBASIC executable shows on the user's desktop. Only `try-help-addin` shows an IDE, and only the one it opens the project in.
- **Name in `lanes.mjs` every application an add-in under test passes to `SaveSetting`**, or its settings stay changed after the run: `SaveSetting` writes the key the user's own copy of the add-in reads.

**Testing the IDE itself** (the debugger, Export Project, the Packages dialog) is
`ide-test.bat`, the same runner (`scripts/lib/lane-runner.mjs`) over `test/ide/lanes.mjs`,
with base port 9660 against the add-in runner's 9560. Each run claims the first free ports from
its base with a lock file in `%TEMP%\tb-ports` (`scripts/lib/tb-ports.mjs`), passing over one
another run claimed or something listens on. Every rule above applies to it
unchanged: the private `APPDATA`, `TB_ADDIN_TEST=1`, and ending an IDE by its pid. Its
scenario files import `scenario` from `test/addin/scenario.mjs`.

**Trying the help add-in by hand** is `try-help-addin.bat` (`scripts/try_help_addin.mjs`):
one IDE set up as a lane is (`Lane` from `scripts/lib/tb-lane.mjs`), on the user's desktop,
DevTools port 9590, opened on `test/addin/helphost` with `docs/_site` served to the pane.
It waits for the IDE to close, then puts the registry and `tbDocsHelp` back. The lanes stay
on the private desktop by default (owner, 2026-10-04); only this tool shows its IDE, and only
the one it opens the project in: the IDE that builds the add-in stays on a private desktop.

## Authoring a page

**[WIP.Authoring.md](WIP.Authoring.md) is required reading before writing or
editing any page under `docs/`.** It carries the page template and its
frontmatter keys, the attribution policy, the per-symbol workflow, the
twinBASIC-vs-VBA deviations to flag, and the cross-section linking tables.

Those tables are not optional guidance. Relative links resolve against the
**rendered URL** --- the page's `permalink:` --- not the file path. The URL
prefixes are not uniform across packages: VBA pages sit one segment shallower
than VBRUN pages, and folder-style classes one deeper than single-file ones. A
cross-section link written by analogy with a neighbouring page is usually
wrong, and the build's link check reports it.

Three things are short enough to state here, because they decide whether a page
is in the right place at all:

- **Placement.** A pure language keyword, parsed by the compiler with no runtime call, goes in `docs/Reference/Core/`. A runtime function or property goes under its package and module, with `redirect_from: /tB/Core/<name>` so legacy links still work. Packages are nested one level deeper than a bare `docs/Reference/<Package>/` --- see [Where things live](#where-things-live).
- **Attribution is per page, decided by content provenance, not by package membership.** Set `vba_attribution: true` only on a page actually derived from a specific VBA-Docs source page. A symbol merely existing in VBA is not sufficient.
- **Link to the canonical location**, meaning the page's own `permalink:`, never to one of its `redirect_from` aliases.

The public "start here" page for a new contributor, [docs/Documentation/Authoring.md](docs/Documentation/Authoring.md),
distils the same conventions (page template, heading levels, formatting,
plain-English prose, attribution policy, cross-section linking). Keep the two
in step when a convention changes; this file and its authoring sibling remain
the exhaustive maintainer source of truth.

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

   **Where twinBASIC and VB6 behave differently, say what VB6 does** (owner's rule, 2026-10-06), checked with `scripts/vb6run.mjs` or a reproducer's `vb6/` side, never from memory. Where twinBASIC's behaviour is the nominal one, the VB6 behaviour goes in a `> [!NOTE]`; inside a defect's WARNING it is one sentence, such as "VB6 raises error 6, *Overflow*."

   **A known twinBASIC defect that silently gives a wrong result is a `> [!WARNING]` until a fixed build is released** (owner's rule): a wrong value with no error raised is data corruption the reader cannot see. A crash is a WARNING too (unsaved data is lost), and so is an error that hides a silent part (a procedure run twice before the error). A defect the reader cannot miss and that loses nothing --- an error raised, a statement refused --- is a `> [!NOTE]`. Name the build in either. **Once a fixed build is released, the callout goes** (owner's rule, 2026-10-05): the documentation is not a record of past defects, so the page then states the correct behaviour with no mention of the defect. The defect's BUGS-TO-REPORT entry says in its HTML comment which page carries the callout, so the callout is removed when the entry is retired.

7. **See Also.** Last section on the page, after `Example`. Format: `- [Symbol](Symbol) <noun>` where `<noun>` is the kind: statement, function, property, method, class, module, package. Pages with annotations use `- [Symbol](Symbol) -- short description` — the `--` source renders as a typographic dash via markdown-it's typographer (en-dash for `--`, em-dash for `---`). Don't write literal `—` in source; keep `--` for consistency across the docs. Order by conceptual proximity, not strict alphabetical.

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

**Alt text converts too.** markdown-it's own `replacements` rule does not descend into an
image token's children, but `kramdownDashesPlugin` ([builder/render.mjs](builder/render.mjs),
registered after it) walks with `walkTokens`, which recurses, so it reaches image alt and
converts the dash like any other text. Measured: **zero literal `--` survives in any `alt=`
anywhere in the built site**, in all three trees.

> **Verify through `builder/`, never a bare markdown-it.** A plain `markdown-it` with
> `typographer: true` leaves `--` in alt text untouched, so a test against the npm
> dependency tells you nothing about this site. Render through the pipeline, or read
> the built HTML.

The source uses the ASCII forms; the rendered HTML uses the typographic characters. Literal `–` or `—` in `docs/` markdown source is forbidden — see the Don'ts at the end of this file. `scripts/convert_em_dash_separators.mjs` is the canonical normaliser if any literals slip back in.

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

Inter is the brand face: twinbasic.com names it first in its own stack. Cascadia Mono is the
**ligature-free** cut of Microsoft's terminal font --- in a *language* reference
the literal characters are the subject matter, so a face that draws `->` as one
mark is working against the text, and any replacement must be ligature-free too.
Source Serif is the book's body face and nothing else's; no web stylesheet
references it, so no reader ever downloads it.

Reader cost is 219 KB cold (both roman faces, preloaded), 166 KB more the first
time a page sets italic text and 77 KB beyond that only if the italic is code
--- against the 3.4 MB search index every page already pulls.

### Regenerating the fonts

How the six `.woff2` files are produced --- the generator, the Unicode coverage, why
`opsz` is pinned and `wght` is not, the two content changes that fell out of the coverage
audit, and the state of the JavaScript port --- lives in [WIP.Fonts.md](WIP.Fonts.md).
Two things from it that touch the rest of this file: **regenerating Inter means
regenerating `builder/inter-metrics.json` too** (see [Teaching Graphviz what Inter
measures](WIP.Typography.md#teaching-graphviz-what-inter-measures)), and the generator is Python for a
reason that is documented there and should be read before anyone tries to port it.

### Diagrams, and the rest of the type system

Every diagram is Graphviz DOT --- sources under `docs/assets/images/dot/` for
shared diagrams, `Images/` beside a page for one that belongs to it. The `.svg`
is a build artifact.

- **Edit the `.dot`, never the `.svg`**, and never set a diagram's `font-family` anywhere else. Graphviz sizes every box to the text *it* measured, and its WASM build has no font machinery at all --- it falls back to Times for any face it does not know. A face the layout never saw leaves labels painted outside their boxes.
- `node scripts/check_dot_fit.mjs` is the gate on exactly that, and runs inside `check.bat`. Run it after touching any diagram.
- **Scale a diagram whole, or not at all.** Stretching an SVG up inflates its labels; shrinking the text alone unmoors the labels from their boxes.
- **A `@font-face` added to [docs/_sass/custom/_fonts.scss](docs/_sass/custom/_fonts.scss) needs its stack added to [docs/_sass/modules-dark.scss](docs/_sass/modules-dark.scss) as well**, and must stay inside the `emit-font-faces` mixin. The dark compilation re-emits its whole payload under two selectors at raised specificity: a face declared there would be invalid, and a stack left out there applies in light mode and silently does not in dark.
- **Run the full a11y sweep after any change that moves type metrics.** An inline element's measured height is its font's content area, so `target-size` results move with the face. The thirteen-page sample can stay clean while the full sweep regresses.

Why Graphviz needs Inter's widths patched into its Times table and what breaks
that patch, why the web rule is `width: auto` and the PDF's is `zoom: 0.875`,
how an exported diagram carries its own font, why cluster and edge labels take
`currentColor` while node labels must not, and what the book's fallback chains
must never do: [WIP.Typography.md](WIP.Typography.md).

## Scripts and tooling

**Anything that participates in rendering the online site, the offline site, or the PDF book is handled by [tbdocs](builder/), the in-tree Node.js static site generator.** Module-level documentation lives next to the code under `builder/`; the user-facing summary is on the [tbdocs Internals](docs/Documentation/Builder.md) page.

### Tooling is JavaScript

Everything under `scripts/`, `builder/`, `lib/`, `book/`, `eval/` and `wisdom/` is
Node.js, and a new tool joins them there. Three files are not, each for a stated
reason rather than by oversight: `scripts/impexp.py` is a published download
offered to readers rather than tooling, `scripts/build_fonts.py` stays Python
because the JavaScript HarfBuzz build produces wrong CFF2 metrics
([WIP.Fonts.md](WIP.Fonts.md)), and `scripts/lib/tb-launch.ps1` is Win32 calls
Node cannot make without a native FFI addon --- a private desktop, and the job
object the IDE runs in --- and is never run as a file, so the execution policy
never comes into it. The full accounting, and what the two ports gained, is in
[WIP.Build.md](WIP.Build.md).

### The published docs assume manual work

**Nothing under `docs/Documentation/` should require Claude, an agent or a skill to follow.**
The audience is a contributor with an editor and a terminal; agent-assisted authoring is a
local convenience, not part of the contract the published documentation makes. That is why
the `document-symbol` skill lives under the gitignored `.claude/` and is described only here.

**[Wisdom](docs/Documentation/Wisdom.md) is the one deliberate exception, and its public
page stays public** --- Phase 3 *is* a set of Claude agents, so a page describing the tool
without them would describe nothing. That has been settled once; do not re-propose
relocating it. The reasoning, and everything about running the tool, is in
[WIP.Wisdom.md](WIP.Wisdom.md).

## Build pipeline

The site builds via [builder/](builder/), a custom Node.js static site generator (`tbdocs`). See [builder/PLAN.md](builder/PLAN.md) for the architecture overview, [builder/README.md](builder/README.md) for the quickstart, and the [tbdocs Internals](docs/Documentation/Builder.md) site page for the high-level tour.

The task-graph scheduler and parallelisation are described in [builder/PLAN-scheduler.md](builder/PLAN-scheduler.md).

### Compiling the reference's own code samples

No build gate evaluates a `tb` fence: `check_code_regions.mjs` only protects its
*contents* from rewrites. A sample that does not compile therefore passes every gate.

`examples.bat` over [scripts/check_examples.mjs](scripts/check_examples.mjs) asks
the compiler. A sample opts in by carrying `check_build` in its fence info string. The
tool works out what to generate around it, packs many samples into one project, builds them
through `tbbuild` on concurrent lanes, and reports each diagnostic against the line in the
page it came from. **1,197 samples are marked, and the run takes about 110 seconds.**

It is **never** wired into `build.bat`, `check.bat`, `test.bat` or CI: it needs a twinBASIC
install, which `npm install` is not, and Windows with a private desktop and a
CDP-reachable WebView2, which CI has not. `sweep_a11y.mjs` has the same arrangement.
Its probes need none of that, and `test.bat` runs them (`test/example-batches.test.mjs`).
**So a pull request that adds or changes a sample pastes the run's command and summary
line into its description** --- the contributor-facing statement is
[Checking that a sample compiles](docs/Documentation/Authoring.md#checking-that-a-sample-compiles).

**[WIP.ExamplesBuild.md](WIP.ExamplesBuild.md) is the file for this** --- the markup, the
slots, the template projects and their stage sets, the batching and bisect-on-crash rules,
what actually collides inside one project, and what the first full run found. Two results
from it concern the harness rather than the samples:
`[RunAfterBuild]` is **one per project** (TB5114), which `check_run` has to be
designed around; and **a project that crashes the compiler can look like a clean build**
(`tbbuild` reads the DEBUG CONSOLE to catch it and exits 4). Distrust any "it stopped
changing, so it must be done" heuristic against this compiler.

### A hung build times out

A task a worker claims and never finishes wedges the whole graph in silence: its
successors' dependency counts never drop, the scheduler's promise never settles,
and the process sits there with its last log line on screen. `Scheduler` watches
for it. No task completing for `--stall-timeout` seconds (default **120**,
`0` disables) prints what was outstanding, including the source pages behind a
wedged `render:i` chunk, and fails the build. Readers get this at [When a build
stops instead of failing](docs/Documentation/Building.md).

Why the report separates the wedged task from the merely blocked ones, and why
`--serve` replaces its whole worker pool rather than the one bad lane:
[WIP.Build.md](WIP.Build.md).

## Build / preview

- `build.bat` — runs `node builder\tbdocs.mjs --src docs --check-audit-index` (which implies `--check`) and produces three trees in one pass: the online copy at `_site/`, a `file://`-browsable copy at `_site-offline/`, and the sparse pagedjs source at `_site-pdf/`. The offline pass adds ~700 ms and the PDF pass adds ~150 ms on top of the ~2 s online build. Toggle `also_build_offline` / `also_build_pdf` in `_config.yml` (or pass `--no-offline` / `--no-pdf`) to skip a sibling output. `--check` adds ~1.7 s and runs the link + integrity check over the HTML while it is still in worker memory; `build.bat --no-check` gets a plain build. A local build also ends by writing the help add-in's archive, `add-in/Resources/HELP/site.zip` (see the help-archive bullet below); `--no-help-archive` skips it.
- `serve.bat` — runs `tbdocs --serve`: initial build, then a long-lived process with watcher, debounced rebuilds, and SSE-driven browser auto-reload. Writes to `docs/_serve/` (disjoint from `build.bat`'s `_site*/`) and skips the offline + PDF passes — so a one-off `build.bat` for the PDF or offline mirror doesn't disturb the live preview. Ctrl+C to stop.
- `check.bat` — the gates that read the built site: a freshness check that refuses a stale tree (`scripts/check_tree_fresh.mjs`), the DOT diagram fit check (`scripts/check_dot_fit.mjs`), the a11y sample-coverage check (`scripts/pick_a11y_sample.mjs --check`), then the accessibility check (`scripts/check_a11y.mjs`). The link + integrity check runs in `build.bat`. ~37 s.
- `test.bat` — the tests the *toolchain* has to pass: the publish-allowlist self-test (`scripts/check_publish_policy.mjs`), the gate-list check (`scripts/check_gate_lists.mjs`), the CI-workflow roster check (`scripts/check_ci_workflows.mjs`), the lint gate (`scripts/check_lint.mjs`), the site-search unit tests (`node --test test/search.test.mjs`), the markdown-plugin unit tests (`node --test test/render.test.mjs`), the date-formatter unit tests (`node --test test/strftime.test.mjs`), the bug-reproducer picture tests (`node --test test/png.test.mjs`), `check_examples.mjs`'s probes (`node --test test/example-batches.test.mjs`), the port-claim unit tests (`node --test test/ports.test.mjs`), the regex-safety gate (`scripts/check_regex_safety.mjs`), the code-region gate (`scripts/check_code_regions.mjs`), the page-count drift-guard probes (`scripts/check_page_baseline.mjs`), the book-coverage probes (`scripts/check_book_coverage.mjs`), the symbol-index probes (`scripts/check_symbol_index.mjs`), the twinBASIC-scanner probes (`scripts/check_twin_parsers.mjs`), the attribute-sweep probes (`scripts/check_attribute_sweep.mjs`), the command-line probes and cases (`scripts/check_cli.mjs`), the pdf-lib shim comparison (`scripts/check_pdf_shims_equiv.mjs`), the impexp parity check (`scripts/check_impexp_parity.mjs`), and the axe source-patch verification (`scripts/check_axe_patch_equiv.mjs`). ~23 s, of which the regex-safety gate is ~10 s and the impexp check ~4 s. See [What belongs in test.bat rather than check.bat](WIP.Build.md#what-belongs-in-testbat-rather-than-checkbat).
- `book.bat` — renders the PDF from `docs\_site-pdf\book.html` via `node book\render-book.mjs` into `docs\_pdf\twinBASIC Book.pdf`. Run `build.bat` first to populate `_site-pdf/`; `book.bat` refuses a tree older than its sources rather than rendering the previous book (see [The book refuses a stale source tree](WIP.Build.md#the-book-refuses-a-stale-source-tree)).

- `examples.bat` — compiles the documentation's own twinBASIC code samples, every `tb` fence marked `check_build`, and reports the ones the compiler refuses against the line in the page they came from; a statement sample also marked `check_run` is built and run, and what it prints is checked against the page. Needs a twinBASIC install and Windows, so it is outside every gate and outside CI; ~110 s over the 1,197 samples marked (33 of them `check_run`). `--build` also builds each project that compiles clean, and `--llvm` builds it with LLVM (see [WIP.ExamplesBuild.md](WIP.ExamplesBuild.md)). Two modes need no compiler at all: `--census` classifies every fence and says how many classifiable ones are still unmarked, and `--report <survey.json>` groups a saved `--propose --json` survey by diagnostic, section and unresolved name. `--propose` itself does compile. See [Compiling the reference's own code samples](#compiling-the-references-own-code-samples) and [WIP.ExamplesBuild.md](WIP.ExamplesBuild.md).
- `addin-test.bat` — tests IDE add-ins by operating an IDE: every lane in `test/addin/lanes.mjs` builds the add-ins it tests into a private copy of the install, opens a project and checks what the add-in does. Outside every gate and outside CI for the same reasons as `examples.bat`; about two minutes for the seventeen lanes today (BETA 997): Samples 10 and 15, the thirteen probe lanes behind Stage 2's answers in [WIP.HelpAddin.md](WIP.HelpAddin.md), and the help add-in in `add-in/` twice, built with its committed copy of the symbol index, `add-in/Resources/SYMBOLS/symbols.json`, which a local build rewrites whenever the index changes. The `help` lane serves the built `docs/_site` on localhost to the add-in's pane; `help-offline` builds the add-in with a help archive of `docs/_site-offline` and the pane's pages come from the add-in's own server. So run `build.bat` first. Exit 0 every lane passed and the registry is as it was found, 1 a lane failed, 2 the harness failed, 3 the registry or a work folder was not put back. See [Driving the twinBASIC compiler](#driving-the-twinbasic-compiler) for its rules.
- `ide-test.bat` --- the same runner for scenarios that operate the IDE itself rather than an add-in: every lane in `test/ide/lanes.mjs`, base port 9660. Same exit codes, same standing outside every gate and outside CI, same rules.
- `try-help-addin.bat` --- opens one IDE on the user's desktop with the help add-in built and loaded, to try it by hand, and puts the registry back once it is closed (see [Driving the twinBASIC compiler](#driving-the-twinbasic-compiler)). Needs `build.bat` first. Exit 0 closed and put back, 1 the add-in or the project did not compile, 2 the tool could not run, 3 not put back.
- `node scripts/shoot_docs.mjs` --- writes the documentation's IDE screenshots (plan and owner's decisions: [WIP.Screenshots.md](WIP.Screenshots.md)). Each picture is a shot in a table, `out` its path under `docs/` (`--only` matches it), in one of three setups, each one IDE on a **private** desktop started only when a shot in it is selected: `help` (builds the add-in as `try-help-addin.bat` does, opens `test/addin/helpdemo`, `TB_DOCS_HELP_REAL_TITLEBAR=0`: the eight `docs/IDE/AddIns/Images/Help_<Name>.png`), `no-project` (`Lane.openNoProject` with `includeProjects`: the menus, cut out with alpha, the dialogs that need no project, and the empty panels, each floated on its own, after the dialogs) and `project` (the demo without the add-in: About, which needs the compiler's licence answer, and IDE Options, whose font lists need a project). Every IDE gets `--force-device-scale-factor=1` (`Lane`'s `browserArgs`), else the page follows the display's scaling; the page is overridden to 1280x880 at 2x, dark theme, and `PAGE_DEFAULTS` puts the IDE's options, panel layouts and keyboard groups to their defaults and the recent lists to the tool's own **in the page only**, its save calls replaced first so nothing is written. Each picture is a `Page.captureScreenshot` with a `clip`; a page showing it gives it `{:width height}` of half its pixel size. A shot's `annotate` list (arrows, rings, badges...) is drawn by `scripts/lib/shot-annotate.mjs` as one SVG layer over the page before the capture and removed after it, the clip growing to hold it. A picture is rewritten only when its bytes differ, and a second run reports every one `unchanged`; a capture is not byte-stable, so `capture` takes up to eight and keeps one equal to the file on disk. `--jobs N` (default 6) runs the setups at once on their own ports and desktops, a full run in about a minute (`--jobs 1`: one at a time); `--diffs <dir>` writes the old picture, the new one and an amplified difference map for each that changed. Settle by a condition, never a fixed sleep, and a picture that shows some state sets it itself rather than relying on the shots before it. The page's animations and carets are switched off through a style sheet put into the document and every shadow root; no picture holds the DEBUG CONSOLE (its lines carry a time). **The Windows user name must never be in a published picture**: the visible text of the page is searched for it before a picture is kept, and the run fails when it is there. The tool finds each name it presses F1 on by searching the demo's source, not by line. The add-in is built on a port of its own (`Lane.addAddin`'s `port`): the building IDE's WebView2 process can hold its port after the IDE ends for longer than `launchIde`'s ten seconds. No wrapper; outside every gate and outside CI, as `try-help-addin.bat` is. Exit 0 every picture written or unchanged, 1 a picture failed, 2 the tool could not run, 3 not put back. Run `build.bat` first.
- **The help archive is written by `build.bat` itself, as its last step.** `builder/help-archive-step.mjs` writes `add-in/Resources/HELP/site.zip` from `docs/_site-offline` through `lib/help-archive.mjs`, after the Gantt injection (which rewrites `BuildInfo.html` in the tree), and reads the file back to verify it. A mismatch fails the build (exit 1). The help add-in embeds the zip as a resource and serves the pages from it with its own server; a build of the add-in without it uses the live site. The file is gitignored (about 21 MB), so a build of the add-in from a clean clone is the online one until `build.bat` has run. **`--no-help-archive` turns the step off, and both CI workflows pass it** (`check_ci_workflows.mjs` requires it, in `ALLOWED.requiredBuildFlags`). It runs only for the guarded source tree (`docs`) built into the default `docs/_site-offline` (not another `--dest`, so `compare_trees` and `check_links_diff` leave it alone), never under `--serve` or `--dry-run`, never without an offline tree, and not keyed on `$CI`. There is no command-line tool for the archive: the `help-offline` lane makes its own with `writeHelpArchive`. The zip's format is fixed by the add-in's reader, which does no inflating ([WIP.HelpAddin.md](WIP.HelpAddin.md), Stage 4, increment 5).
- `node scripts/bug_repro.mjs` --- the reproducer projects under `bugs/<slug>/` for the entries of [BUGS-TO-REPORT.md](BUGS-TO-REPORT.md): `new`, `pack` (impexp, then the zip, written in Node), `compile`, `build` and `run` through `tbbuild` and `tbrun`, `vb6` (builds the optional `vb6/` VB6 project beside the twinBASIC one in a temp copy, runs its exe on a private desktop, and prints its `out.txt`; a project with a form or a user control is built without Unattended Execution, which VB6 refuses for it; `pack` zips its sources into `<slug>-vb6.zip`; VB6 is started only by `scripts/lib/vb6.mjs`, never from a shell; a graphical defect's `images` key makes `run` and `vb6` keep what the `PngDump` modules of `test/repro-templates/png/` draw as `images/<name>-tb.png` and `-vb6.png`, with a `-compare.png` of both, tested by `test/png.test.mjs`), `file` (moves a filed entry and its reproducer to `bugs/filed/<slug>/`; `file --marked` does every marked entry), and `verify`, which reads each `bugs/*/repro.json` and `bugs/filed/*/repro.json` and says whether the bug still reproduces on the newest beta; a `lane` reproducer names the `ide-test` or `addin-test` lane and tests that assert its bug, which `verify` runs last through that runner, and a `probe` one a script under `scripts/`. **No reproducer should need a person at the IDE** (owner, 2026-10-05): a bug the IDE has to be operated for gets a lane test, and `manual` is left for what cannot be automated at all. It has no wrapper. **`verify` is run by a person only**, never by a gate or CI: it needs a twinBASIC install, like `examples.bat`. Default port 9440, and `--jobs N` takes N ports from there. Its command-line cases are in `scripts/lib/cli-cases.mjs`, and need no IDE.
- `node scripts/vb6run.mjs <file | ->` and `node scripts/vb6run.mjs --docs [--only <regex>]` --- build and run VB6 code, so that what a sample prints in twinBASIC can be compared with VB6: a stand-alone file of statements or a `.bas` module, or `--docs`, which builds the documentation's `check_run` fences in VB6 and says for each whether it prints what its page says (`same`, `differs`, `not VB6`, `error`, `refused`; a `projname=` group is built as a project of its own, its `slot=file` fences translated into VB6 `.cls` and `.bas` components). It has no wrapper and is outside every gate and outside CI: it needs VB6 (`--vb6`, `VB6_EXE`, or the standard install folder). **Never start `VB6.EXE` from a shell**: in Git Bash `/make` is rewritten as a path and VB6 answers with a modal box on the desktop; the tool spawns it from Node with an argument array, and a sample that calls `MsgBox` or `InputBox` or contains `End` is refused. Its `Debug.Print` rewrite and its file translation have probes in `test/example-batches.test.mjs`, and its command-line cases are in `scripts/lib/cli-cases.mjs`; both need no VB6. What it relies on is in [WIP.ExamplesBuild.md](WIP.ExamplesBuild.md).

Three generators sit outside that loop and produce committed artifacts rather than build output — none runs during a build, and none is needed for one. `python scripts/build_fonts.py` rebuilds the subset webfaces under `docs/assets/fonts/` and needs a network connection; `node scripts/build_dot_metrics.mjs` regenerates `builder/inter-metrics.json` from those webfaces and needs only a browser. See [Typography](#typography). `node scripts/build_package_api.mjs` regenerates `builder/package-api.json`, the packages' declared API that the build's symbol index (`tB/symbols.json`, for the IDE help add-in) is annotated from; it needs a twinBASIC install, so **run it when the reference is re-indexed against a newer build** and commit it with the pages. See [WIP.HelpAddin.md, Stage 3](WIP.HelpAddin.md#stage-3-the-symbol-index-generated-by-the-docs-build).

## Site integrity check

After a batch of changes, verify the site builds clean and all links resolve:

```sh
build.bat && check.bat
```

On the dev box that is ~4 s of build against ~37 s of check, of which the axe scan is ~20 s. [builder/PLAN-checks.md](builder/PLAN-checks.md) records how the link checker sits in the build's task graph and its cost; the axe follow-ons are designed there but not implemented.

**If the change touched `builder/`, `scripts/`, `lib/`, `book/`, `eval/`, `wisdom/`, `test/`, the site's scripts in `docs/assets/js/`, a wrapper or a workflow, run `test.bat` as well** --- another ~23 s. Eighteen of its twenty-one gates cannot be affected by an edit under `docs/` at all. **Three can.** `check_lint.mjs` lints the site's two scripts in `docs/assets/js/` along with the tooling. `check_gate_lists.mjs` reads `README.md` and every page under `docs/Documentation/`, so an edit to any developer page that states a gate count can fail it. **`check_code_regions.mjs` has two halves, and a content edit reaches only one.** Its corpus sweep reads `DOCS_DIR`, which is `<repo>/docs`, and tokenises every markdown file in it, so a page that provokes a rewrite into *altering* a code region fails it --- that half is content-dependent. Its fixed probes are not: they run against their own sources whatever the tree holds, and they cover the **mirror** fault, where a rewrite silently stops firing. The sweep cannot see that fault, because text the rewrite skipped is masked and restored unchanged and every region still matches. So run `test.bat` after adding an unusual code construct --- a fence whose contents include a fence marker, a 4-space indented block, an admonition wrapping a fence --- and read the built page as well, because for the mirror fault the gate is asserting that the mask and the admonition scan still work rather than checking your page:

```sh
build.bat && check.bat && test.bat
```

**If the change touched `builder/`, compare the output as well.** `node
scripts/compare_trees.mjs` builds `HEAD` and the working tree from two git
worktrees and compares the three trees byte for byte, in about ten seconds. A
refactor must come out identical; any other change should differ exactly where
it meant to and nowhere else. See [WIP.Build.md](WIP.Build.md#the-pipeline).

### The gates, and where their internals are

[Tools and Scripts](docs/Documentation/Tools.md) owns the authoritative lists,
and `scripts/check_gate_lists.mjs` fails the run if `README.md` or any page
under `docs/Documentation/` disagrees with them --- **so do not state a gate
count in prose on those pages** unless you mean to maintain it. The roster, by
wrapper:

| wrapper | gate | asks |
|---|---|---|
| `build.bat` | link + integrity check | broken intra-site links, missing pages, malformed `redirect_from`, duplicate ids, remote `<img src>`, sitemap / search-index gaps, canonical mismatches. Runs on the worker lanes that produced the HTML, so neither tree is written out only to be read back |
| `build.bat` | publish allowlist | refuses any file that may not ship. It aborts the build rather than flipping an exit code, because a tree with a private key in it is one `upload-pages-artifact` from being published |
| `build.bat` | page-count baseline | a rise rewrites `builder/page-baseline.json` and says so; a fall fails the build |
| `build.bat` | symbol-index URLs | every URL `tB/symbols.json` has published is still in it: a new one rewrites `builder/symbol-baseline.json`, a lost one --- most often a reworded member heading --- fails the build |
| `build.bat` | nav integrity | every nav-visible `parent:` resolves to exactly one page |
| `build.bat` | Gantt sections | every task handed to the build's Gantt chart has a section, and the chart has a place for it: a band for a main-thread task, a colour for a worker's |
| `check.bat` | `check_tree_fresh` | the tree is not older than the sources that produced it |
| `check.bat` | `check_dot_fit` | every diagram label sits inside the box Graphviz drew for it |
| `check.bat` | `pick_a11y_sample --check`, `check_a11y` | see [WIP.A11y.md](WIP.A11y.md) |
| `test.bat` | `check_code_regions` | no source or HTML rewrite altered a code region, and the rewrites over rendered HTML leave a raw `<pre>` or `<code>` as written; a rewrite still fires on prose beside a fence (the mirror fault); `lib/markdown.mjs` and `lib/frontmatter.mjs` pass their probes, and the block parse finds what the full parse finds; the count-name check skips code and names the file's line; `discover` warns about an unquoted frontmatter value that ends in `#`; the dash normaliser converts only prose |
| `test.bat` | `check_regex_safety` | no regex in the tree can backtrack exponentially |
| `test.bat` | `check_symbol_index` | the symbol index still places each kind of symbol, from fixtures |
| `test.bat` | `check_twin_parsers` | every word of the shared modifier list reaches all three scanners of twinBASIC source; the census's declaration kinds and `parseTargets`' targets hold for the shapes each is known to misread |
| `test.bat` | `check_attribute_sweep` | the sweep's site skeletons render and are each in a family of `Applicable to:` targets or listed as in none; its reading of a probe's diagnostics puts the refusals, the control's fold and a skeleton's own errors in the right states; every real `Applicable to:` line reads to its pinned targets; probes batch once each and never two of a once-per-project attribute; a cell missing a form is not reported refused; and the isolating runner, against a scripted fake in place of the IDE, finds a crash, a hang, a disturbed canary or a stray row and stops at each cap |
| `test.bat` | `check_cli` | `lib/cli.mjs` parses as a strict `parseArgs` does, and also refuses an empty value unless the option allows one; every tool refuses an unknown flag, and every tool with a value option an empty value; each tool's recorded command-line errors still exit and print as recorded, run with an IDE and a browser that do not exist; every tool's `--help` and `-h` print its usage to stdout with exit 0 and start nothing, and each usage text ends in one `Exit codes:` block |
| `test.bat` | `check_ci_workflows` | both CI workflows run every wrapper gate, with the same arguments and order, and build with `build.bat`'s flags |
| `test.bat` | `check_lint` | Biome finds nothing in the tooling, warnings included, the formatter would change no file, and it checked at least one script |
| `test.bat` | `test/search.test.mjs` | the search entries `builder/search.mjs` writes hold what they should, and the copies of the search client still agree. Run by `node --test`; the gate roster reads such a line as a gate, named by its path |
| `test.bat` | `test/render.test.mjs` | `builder/render.mjs`'s markdown-it plugins, one at a time, on inputs no page holds --- today the ellipsis plugin's dot counting. Run by `node --test` |
| `test.bat` | `test/strftime.test.mjs` | `builder/strftime.mjs`'s `formatDate`, which no build calls because no page sets `last_modified_date`. Run by `node --test` |
| `test.bat` | `test/example-batches.test.mjs` | `check_examples.mjs`'s probes, from `scripts/lib/example-batches.mjs`: batching, crash isolation through a fake lane, the canaries, the fence classifier and `check_run`'s refusals, expected output, dispatcher and marker reading, with no IDE. Run by `node --test` |
| `test.bat` | `test/ports.test.mjs` | `scripts/lib/tb-ports.mjs` claims ports as the lane runners need: two claims at once are disjoint, a port in use and a live lock are passed over, a stale lock is taken over, a lock goes when its process exits. Run by `node --test` |
| `test.bat` | `check_pdf_shims_equiv` | the book's pdf-lib shims write what stock pdf-lib writes: one document written by the gate and one built with `PDFDocument.create` are each saved both ways in child processes, and each pair of files is compared object by object with streams inflated and their cross-reference entries checked; every shim must run, and the members of pdf-lib the shims patch must be those its `PATCHES` lists, each run in one document or the other unless marked there as not reached; each of them must also be in the target table its shim passes to `checkTargets`, which `book/lib/shim-targets.mjs` records for the side to ask |
| `test.bat` | `check_impexp_parity` | `impexp.mjs` and `impexp.py` pass the same built-in tests, and one sequence of commands through each gives the exit code each command is there for, the same output and the same files. Without Python it reports itself skipped and passes, but fails when `CI=true` |
| `test.bat` | `check_publish_policy`, `check_gate_lists`, `check_page_baseline`, `check_book_coverage`, `check_axe_patch_equiv` | the gates on the gates |

**A gate belongs in `test.bat` rather than `check.bat` if it would still mean
something with no documentation in the tree.** That is the whole rule; it is
about what a gate interrogates, not about what it happens to open.

Both CI workflows run every one of these as its own step, unconditionally and
without invoking the `.bat` files --- so skipping `test.bat` locally changes
what a content edit costs you, never what reaches `staging`. The steps are one
list, the composite action `.github/actions/run-gates/action.yml`, which both
workflows call: **a new gate goes into its wrapper, that action and Tools.md's
list**, and `check_ci_workflows.mjs` fails `test.bat` until CI matches.

The nav integrity check ([builder/nav.mjs](builder/nav.mjs)) runs during COMPUTE and aborts the build on two failure modes, both otherwise silent:

- **Ambiguity** — multiple pages share the title declared in `parent:` and `grand_parent:` is either absent or insufficient to disambiguate. The page would silently appear under every matching parent.
- **Orphan** — no page has the title declared in `parent:`. The page would silently disappear from the navigation sidebar.

[WIP.Build.md](WIP.Build.md) says why each gate exists and what it must catch.
Two of its rules bind every session and are repeated under [Don'ts](#donts):
never rewrite markdown source or rendered HTML without a code guard, and
whitespace inside inline `<code>` is content.

## Repository Use

Favor concise one-line git commit messages.

**Lint before every commit:** `node scripts/check_lint.mjs`, a fraction of a second. It
runs Biome's linter and formatter check over the tooling and the site's two scripts, and
fails on a warning as well as an error, because Biome reports an unused import as a warning,
and on any file the formatter would change: run `npx biome format --write` before committing.
A hand-laid-out literal table keeps its layout under `// biome-ignore format: <reason>`.
`.git-blame-ignore-revs` lists the commit that applied the formatter; tell a clone to read it
with `git config blame.ignoreRevsFile .git-blame-ignore-revs`. `test.bat` and CI run the gate
too.
The pre-commit hook in `.githooks/` runs it on the staged scripts and nothing else; enable it
in a clone with `git config core.hooksPath .githooks`.

**A bug in twinBASIC itself goes in [BUGS-TO-REPORT.md](BUGS-TO-REPORT.md)**, which is a
queue rather than a record: an entry that has been filed upstream is marked and moved to `bugs/filed/<slug>/` by `bug_repro.mjs file --marked`, and deleted only once a fix is released and `verify` says it no longer reproduces. Each one
carries the build it was seen on and a *narrowed* reproduction --- the compiler crash
recorded there is two lines, and neither line reproduces it alone. Documentation defects
do not go there; they are fixed in `docs/`, or recorded in the relevant `WIP.*.md` until
they are.

## Don'ts

- Don't commit `.claude/` or `CLAUDE.md` — both gitignored. (`WIP.md` is committed; `CLAUDE.md` is just a local `@WIP.md` import shim.)
- Don't touch `_site/` or `_site-offline/` (build outputs, gitignored).
- **Don't walk `docs/` for its markdown with a private `readdir`.** Call `markdownFiles` from [lib/markdown-files.mjs](lib/markdown-files.mjs), which never enters the build's output trees. A walk that does enter them crashes whenever a running `serve.bat` rewrites `_serve`; see [The code-region gate](WIP.Build.md#the-code-region-gate). Any other walk of `docs/` decides what is an output tree with the same module's `isOutputTree`, as `check_tree_fresh.mjs` does, rather than a list of its own.
- **Don't judge rendered styling by opening a built page as a `file://` URL in the in-app browser pane.** It does not apply the page's stylesheets, so everything renders unstyled and any conclusion about colour, spacing, layout or contrast drawn from it is worthless. Use `serve.bat`, which serves over HTTP at localhost and renders for real. `file://` does work *through puppeteer* -- `scripts/check_a11y.mjs`, `scripts/sweep_a11y.mjs` and the `perf/` rigs all load `_site-offline/` over `file://` and get correct computed styles, which is the reason the offline tree exists (see [Site integrity check](#site-integrity-check)). So: puppeteer for measuring, `serve.bat` for looking. Never the preview pane on a `file://` path.
- Don't write literal en-dash `–` or em-dash `—` in `docs/` markdown source. Use `--` (renders as en-dash) or `---` (renders as em-dash) — markdown-it's typographer does the conversion at build time. `scripts/convert_em_dash_separators.mjs` normalises any strays.
- **Never write or edit a file with a shell heredoc.** No `cat > file <<'EOF'`, no
  `printf` into a file, no `sed -i` for a content edit. Use the file-writing and
  file-editing tools. A heredoc mangles exactly the characters this repository is made
  of --- `—`, `–`, `§`, `→`, `×` in the prose, and every backslash in a regex --- breaks
  on the shell's own metacharacters, and fails late and partially, which is worse than
  not writing the file at all. The shell is for running things, not for authoring them.

  **It fails silently.** Through `<<'EOF'` a regex written `"\\s+"` is delivered as
  `"\s+"`, matches nothing, and the tool reports a wrong count: a number that reads as
  a finding about the corpus and is a finding about the quoting.

  **The file tools decode a `\u` escape of four hex digits** into the character it
  names: a BOM, an em-dash and a replacement character arrive raw, and only NUL is
  left as written. A doubled backslash arrives doubled, which is a different string.
  Write the brace form, `\u{FEFF}`, which arrives intact (a regex needs the `u` flag
  for it), and check a file you have written for raw non-ASCII.
- Don't push or force-push without explicit user request.
- **Use `gh` read-only.** Viewing, listing and searching are fine: `gh issue view`, `gh pr view`,
  `gh run list`, `gh search`, `gh api` with GET. Anything that writes to GitHub is the owner's
  alone, who has full authority over it: creating, editing, commenting on, closing or labelling
  an issue or a pull request, `gh pr create` and `gh pr merge`, `gh release`, `gh workflow run`,
  and `gh api` with any other method. A session prepares the text --- an entry's issue body, a
  pull request's description --- and leaves posting it to the owner. Once the owner has filed an
  entry, `bug_repro.mjs file <slug> <issue>` records it, which writes only to this repository.
- Don't leave a remote image URL in a finished page. A pasted `https://github.com/user-attachments/assets/...` link is fine to write --- [builder/vendor-assets.mjs](builder/vendor-assets.mjs) downloads it to `docs/assets/attachments/gh-<uuid>.<ext>` on the next local build and rewrites the render to point there; commit the downloaded file with the edit. Any other remote host has no such handling: download it yourself and commit it under the section's `Images/` folder. Remote images cost a network round trip per page view, break the `file://` offline mirror, and **abort the PDF book render** -- the forked paged.js in `book/lib/` has no async image loading, so an image still pending when the page-breaking pass runs raises instead of degrading. The build enforces this unconditionally (see [Site integrity check](#site-integrity-check)); `--check-remote-assets` is the standalone checker's flag, not a `tbdocs` one. The check is scoped to `<img>`; `<iframe>` is untouched, but the site has no embeds. A video is authored as a marked link -- `[Title](https://www.youtube.com/watch?v=<id>){: .video }` -- which `videoLinkPlugin` ([builder/render.mjs](builder/render.mjs)) renders as a locally vendored poster frame linking out to the video page, styled by `.video-link` in `docs/_sass/custom/custom.scss`. That makes the site free of third-party requests entirely; don't reintroduce an embed or a hotlinked `img.youtube.com` thumbnail.
- **Don't hand-edit a diagram's `.svg`, and don't change its `font-family` anywhere but the `.dot`.** The `.svg` is a build artifact; the next build overwrites it. Graphviz also sizes every box to the text *it* measured, so a face the layout never saw leaves labels hanging outside their boxes. Edit the `.dot`, rebuild, and let `node scripts/check_dot_fit.mjs` confirm it; see [Diagrams](WIP.Typography.md#diagrams).
- **Don't add a `@font-face` to `docs/_sass/custom/_fonts.scss` without also adding the stack to `modules-dark.scss`,** and don't move the `@font-face` block out of the `emit-font-faces` mixin. The dark compilation re-emits its whole payload under two selectors at raised specificity: a face declared there would be invalid, and a stack left out there applies in light mode and silently does not in dark.
- **Don't widen `SOURCE_EXTENSIONS` in [builder/publish-policy.mjs](builder/publish-policy.mjs) to make a build pass.** The build refusing a file is the gate working. Remove the file from `docs/`, or add a pattern to `exclude:` in `_config.yml`; widen the allowlist only when the type genuinely belongs on the published site, and never by folding `BUILD_EXTENSIONS` into it. See [The publish allowlist](WIP.Build.md#the-publish-allowlist).
- **Don't add a rewrite over markdown source or rendered HTML without a code guard.** A pre-render source rewrite goes inside `applyPreRenderRewrites`, between `maskCode` and its `restore`; a rendered-HTML rewrite uses `replaceOutsideCode`, or a pattern led by `CODE_OR_PRE`, both from `builder/code-guard.mjs`. An unguarded rewrite corrupts real code samples: control-flow indentation in a language reference, code spans in the PDF. `node scripts/check_code_regions.mjs` is the gate. See [Never rewrite markdown source without knowing what is code](WIP.Build.md#never-rewrite-markdown-source-without-knowing-what-is-code).
- Don't invent semantics — read the relevant primary source before paraphrasing (VBA-Docs for VBA-derived pages; the package's `.twin` sources for twinBASIC-specific ones).
- Don't add boilerplate sections (Remarks, See Also) if the source has nothing meaningful for them.
- **Never add `Co-Authored-By:` (or any "Co-authored by" / "Generated with Claude" / similar) trailers to commit messages.** Repository policy. Plain commit messages only.
