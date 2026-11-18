# twinBASIC Documentation — Working Notes

Static site (`just-the-docs` theme look-and-feel) deploying to `docs.twinbasic.com`. Source under `docs/`, build pipeline (`tbdocs`) under [builder/](builder/).

## Which file to open

This file is the contract: what a session needs before touching anything. Its
siblings hold the rules that only one kind of work needs, and say why a tool is
built the way it is: the reason, and any measurement that still decides
something. **None of them is loaded automatically.** Open the one covering what
you are about to change.

| About to | Read first |
|---|---|
| write or edit any page under `docs/` | [WIP.Authoring.md](WIP.Authoring.md) --- page template, frontmatter, the plain-English prose rules and callouts, cross-section linking tables, per-symbol workflow |
| write or restructure a page under `docs/IDE/` | [WIP.IDE.md](WIP.IDE.md) --- the plan for finishing the IDE section: its structure, conventions, fact sources and chapter workflow |
| document a specific package | that package's own file, listed under [Package API notes](#package-api-notes) |
| write, update or judge a contributed package's section, its test cases or its Experimental status, or draft an issue about one of its defects | [WIP.Contributed.md](WIP.Contributed.md) --- the rules for contributed packages and what each section decided; then [test/package-tests/README.md](test/package-tests/README.md) to write a case |
| run `tbbuild`, `tbrun`, a lane of `addin-test` or `ide-test`, or `ide_js`, or change the twinBASIC compiler harness | [WIP.Harness.md](WIP.Harness.md) --- its rules, then `export`, the attribute census, `tbbuild`, `tbrun`, the add-in test runner |
| start an IDE or a program on a private desktop, choose a port for one, or change `tbbroker` | [WIP.Broker.md](WIP.Broker.md) --- the broker that hands out desktops, slots and ports, and its protocol |
| a new twinBASIC BETA has been installed | [WIP.NewBeta.md](WIP.NewBeta.md) --- the checklist, in order |
| change `builder/`, `scripts/`, or any gate | [WIP.Build.md](WIP.Build.md) --- the pipeline and why each gate exists |
| make the build faster, or measure it | [WIP.BuildSpeed.md](WIP.BuildSpeed.md) --- the rules, how to measure, where the time is, and the work that is open |
| touch fonts, diagrams, or the PDF's type | [WIP.Typography.md](WIP.Typography.md), then [WIP.Fonts.md](WIP.Fonts.md) for the generator |
| change the accessibility scan | [WIP.A11y.md](WIP.A11y.md) --- the axe scan, the sample, the fingerprint gate |
| work on the sample-compiling harness | [WIP.ExamplesBuild.md](WIP.ExamplesBuild.md) |
| change test/harness.json, a timeout, an exclusion or the stage rules | [test/harness.md](test/harness.md) |
| write, run or change a contributed package's test cases, or the tools behind them | [test/package-tests/README.md](test/package-tests/README.md) --- how a case is written, marked and run; [WIP.PackageTests.md](WIP.PackageTests.md) --- why the design is what it is |
| run or change Wisdom, the Discord harvester | [WIP.Wisdom.md](WIP.Wisdom.md) --- the three-phase pipeline and the Phase 3 extract flow |
| retake the documentation's IDE screenshots, or change the tool that takes them | [WIP.Screenshots.md](WIP.Screenshots.md) --- `shoot_docs.mjs`: its rules, setups and the owner's decisions |
| review a screenshot run, override what `shoot_docs` or `replay` decided, or change how they decide what to keep | [WIP.ShotReview.md](WIP.ShotReview.md) --- `node scripts/shot_review.mjs`, the review tool, and the modules it shares with the command-line tools |
| work on the IDE help add-in, or on testing IDE add-ins by machine | [WIP.HelpAddin.md](WIP.HelpAddin.md) --- the plan, the IDE facts it rests on, and the probes still open |
| make the site read better in text browsers (w3m, lynx), or change how a picture in two themes is written | [WIP.TextBrowsers.md](WIP.TextBrowsers.md) --- the benchmark, the measurements, the recommended way to write a two-theme picture, and the other problems surveyed |
| change the site search, or add an index term | [WIP.Search.md](WIP.Search.md) --- the design, the eval, and the rules for index and term entries |
| find the documentation work a new twinBASIC build leaves, or change the package indexer (`indexer/`) | [WIP.Indexer.md](WIP.Indexer.md) --- its rules, then the store, the snapshots, the scanner and the owner's decisions |
| write down a suspected twinBASIC or package defect met while documenting, pick one up to investigate, or write, run or verify a reproducer under `bugs/` | [WIP.BugHunt.md](WIP.BugHunt.md) --- the leads not yet investigated, the steps that take a lead to a reproducer, a package's failing case or nothing, and `bug_repro.mjs` |
| add or check the run-time errors a procedure, statement or operator raises | [WIP.Errors.md](WIP.Errors.md) --- the owner's decisions, the data-driven design, and the batches with their status |
| look up what a `TBnnnn` diagnostic code is, or document a compiler warning | [upstream/twinbasic-diagnostic-ids.h](upstream/twinbasic-diagnostic-ids.h) --- the compiler's full list of diagnostic codes and their internal names, from Wayne Phillips (current as of BETA 1007); `docs/Features/Compiler-IDE/Compiler-Warnings.md` is the public page for the warnings |
| run a use-case evaluation round | [eval/README.md](eval/README.md) --- start every evaluator with `eval/run_case.mjs`, **never as a subagent**: a subagent inherits this session's `CLAUDE.md`, and with it this file, which is the answer key the corpus withholds |

The rule that decides where a new note belongs: **this file holds what every
session must follow.** A rule that only one kind of work needs goes in the
sibling that work opens first, listed above with the work that opens it. The
reason for a rule, and a measurement that still decides something, go in a
sibling. History goes nowhere: git keeps it.

## Status

Reference documentation is **complete** for every default and built-in package: VBA, VBRUN, VB, WebView2, Assert, CustomControls, CEF, WinEventLogLib, WinNamedPipesLib, WinServicesLib, tbIDE, WinNativeCommonCtls and AppGlobalClassObject. It is adapted from primary sources: Microsoft VBA-Docs (CC-BY-4.0) for the runtime library, `.twin` source for the twinBASIC-specific packages. The CEF and WebView2 packages also carry a tutorial set.

The **contributed** packages from TWINSERV have sections under `docs/Reference/Contributed/`; the Experimental ones are listed in `docs/Reference/Experimental.md`. What each package's section decided is in [WIP.Contributed.md](WIP.Contributed.md#per-package).

## Where things live

> **Packages are nested one level deeper than a bare `docs/Reference/<Package>/`.**
> They sit in `docs/Reference/Default/` --- the three packages every
> project references (`VB`, `VBA`, `VBRUN`) --- or in `docs/Reference/Built-In/` --- those
> that ship with the IDE but are referenced on demand (`AppGlobalClassObject`, `CEF`,
> `CustomControls`, `TwinBasicAssertions`, `WebView2`, `WinEventLogLib`,
> `WinNamedPipesLib`, `WinNativeCommonCtls`, `WinServicesLib`, `tbIDE`). `Core/` is not
> nested. The contributed packages from TWINSERV sit in `docs/Reference/Contributed/`, and
> unlike the others their URLs say so: `/tB/Packages/Contributed/<Package>/`.
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
- `docs/Reference/Default/VB/<Class>/index.md` — a VB class page; every VB class is folder-style (e.g. [`CheckBox/index.md`](docs/Reference/Default/VB/CheckBox/index.md), [`CheckMark/index.md`](docs/Reference/Default/VB/CheckMark/index.md)).
- `docs/Reference/Built-In/<Package>/` — one folder per built-in package; what each holds, and how its pages are laid out, is in the package's file under [Package API notes](#package-api-notes).
- `docs/Reference/Built-In/AppGlobalClassObject/` — the `App` global object available in every twinBASIC project: the `_App` interface plus its property pages under `_App/` (`Build`, `Comments`, `CompanyName`, `EXEName`, …).

  > **Two rules come from this package.** First, **never widen an `exclude:` entry in
  > `_config.yml` to a bare underscore prefix.** The twinBASIC interface is named `_App`
  > (the COM hidden-interface convention), so a blanket `**/_*/**` would drop every
  > page under `_App/`. The underscore entries match at the source root only.
  > Second, a UTF-8 BOM in front of a page's `---` hides its frontmatter: `discover`
  > would file the page as a *static file* and serve the raw markdown. Editors on
  > Windows add a BOM unasked. `lib/frontmatter.mjs` strips a leading BOM before parsing.
- `docs/Reference/Contributed/` — the contributed packages, one folder each, landing page `Contributed.md` beside it, at `/tB/Packages/Contributed/<Package>/`. **Before writing or changing a contributed section, its test project or its Experimental status, or drafting an issue about one of its defects, read [WIP.Contributed.md](WIP.Contributed.md#rules)**: some differences are a package's convention, not a defect.
- `docs/Downloads/index.md` — the Downloads page, `/Downloads`, a top-level page at `nav_order: 4` and in `_book.yml`'s `left_out:`. **Every file the documentation publishes for readers has a card or a row there**, and the page that documents it keeps its own link (owner). How the page is built and published: [WIP.Build.md](WIP.Build.md#the-downloads-page).
- `docs/Reference/Data-Types.md` and `docs/Reference/Data-Types/<Type>.md` — the intrinsic data types (owner, 2026-10-18): one page per type at `/tB/Core/<Type>` (`parent: Data Types`, `grand_parent: Reference Section`, since the Features page *New Data Types* has the same title), and the summary page, `/Reference/Data-Types`, with one `## <Type>` section per type that links to it. The summary's `symbols:` names the types, and the symbol index points each at its section (kind `type`, the one URL outside `/tB/`), so keep those headings' text. `Long.md` is the model page.
- `docs/Reference/Statements.md` — alphabetical index of language statements.
- `docs/Reference/Procedures and Functions.md` — alphabetical index of procedures/functions.
- `docs/LLVM/` — the LLVM section: compiling with the LLVM back end. A top-level section between Features and Reference Section in the nav, at `nav_order: 6` (Features is 5). `index.md` is the landing page and `Getting-Started.md` the only page so far, with its screenshots under `Images/`. Everything it describes arrived in **BETA 984**. Its language claims are checked by `node test/llvm/run.mjs` (its README lists each claim and its page; run it after a new BETA), and its callouts by the reproducers under `bugs/` that their markers name, both with `tbrun --llvm` and `--exe`. Its samples are marked `check_build`, which compiles them; `examples.bat --llvm` also builds them with LLVM.

## Package API notes

Each package's notes are in a file of its own. Open it when updating an existing page or adding a new one; the rendered docs under `docs/Reference/Default/`, `Built-In/` and `Contributed/` remain the source of truth.

- [WebView2](WIP.WebView2.md) — the `WebView2` control, its wrapper classes and the `wv2…` enums.
- [Assert](WIP.Assert.md) — sibling modules (`Exact` / `Strict` / `Permissive`) with identical APIs but different comparison semantics.
- [CustomControls](WIP.CustomControls.md) — the `Waynes…` custom controls, the shared `Styles/` helpers, the `Framework/` DESIGNER surface and `Enumerations/`.
- [CEF](WIP.CEF.md) — the `CefBrowser` control, its `EnvironmentOptions` sub-page and its enums.
- [WinEventLogLib](WIP.WinEventLogLib.md) — the generic `EventLog(Of T1, T2)` class, the `EventLogHelperPublic` module and the message-table backing pattern.
- [WinNamedPipesLib](WIP.WinNamedPipesLib.md) — the IOCP-based async pipe framework and its idioms.
- [WinServicesLib](WIP.WinServicesLib.md) — the thin OS-services wrapper: `Services`, `ServiceManager`, `ServiceCreator(Of T)`, `ServiceState`, `ITbService` and its enums.
- [tbIDE](WIP.tbIDE.md) — the addin SDK (type-only compiler package) and the idiom map of samples 10–15.
- [WinNativeCommonCtls](WIP.WinNativeCommonCtls.md) — the VB6-compatible `MSCOMCTL.OCX` replacement.
- The contributed packages --- one file each, listed under [Per package](WIP.Contributed.md#per-package) in WIP.Contributed.md.

The three "winlibs" packages — [WinServicesLib](WIP.WinServicesLib.md), [WinEventLogLib](WIP.WinEventLogLib.md), and [WinNamedPipesLib](WIP.WinNamedPipesLib.md) — share a set of integration idioms: composition-delegation on `EventLog(Of …)`, the `ManualMessageLoopEnter` / `Leave` pattern coupling `NamedPipeServer` to a service's `ChangeState` handler, and `PropertyBag` as the canonical pipe payload. When working on any of the three, check the other two for cross-references.

### Driving the twinBASIC compiler

The package sources are not in this repository --- they are inside the
`.twinproj` files an IDE install ships. Exported sources are the strongest
evidence for anything the documentation asserts about legal syntax. For a
question no shipped source answers, the construct has to go to the compiler.
These tools do that. Each finds the IDE itself: the newest
`twinBASIC_IDE_BETA_<n>` on the Desktop that is BETA 1007 or later, with `--ide`
or `TB_IDE` overriding.
**No install path is hardcoded anywhere in the tooling**, because an install
path contains a username.

```sh
node scripts/impexp.mjs export <some>.twinproj <out-dir>   # a project's or package's sources
node scripts/census_attributes.mjs --out census.md   # every attribute, by enclosing construct
node scripts/sweep_attributes.mjs --out sweep.md --dump-results sweep.json   # every attribute at every site, 8 to 16 min
node scripts/tbbuild.mjs "$TEMP/probe/Thing.twinproj"   # does it compile
node scripts/tbrun.mjs <exported-source-dir>         # what does it print
```

- **Every IDE the tools start is given `--no-save-ide-settings` and `--no-update-recent-files`, and BETA 1007 is the oldest build any tool runs** (owner: "we never run anything before that"). The two flags are `IDE_FLAGS` in `scripts/lib/tb-ide.mjs`, passed by `launchIde` on both its branches; any new code that starts `twinBASIC.exe` passes them too. **Never pass `--reset-ide-settings`** (it writes empty options to the real registry even after `--no-save-ide-settings`). **No tool's IDE reports its crashes to the developers.** How the flags and the settings hook work: [WIP.Harness.md](WIP.Harness.md#rules).
- **Pack and unpack projects with `impexp`, never with the compiler executable's `import` or `export` verbs.** The tooling does both in process, through `packTree` and `unpackProject` in `scripts/lib/tb-project.mjs`; by hand it is `node scripts/impexp.mjs`. The compiler's `import` refuses a project that embeds a package (exit 999, twinbasic/twinbasic#841), and both verbs exit 0 after the failures they report. The reasons, and the path and stdin rules for anything that does run the executable (`bug_repro`'s `cli` mode), are in [WIP.Harness.md](WIP.Harness.md#getting-at-the-twin-sources).
- **Every run takes a slot from `tbbroker`** ([WIP.Broker.md](WIP.Broker.md)) **and its IDE's DevTools port is one Windows picks.** Never choose a port for an IDE, and never make a desktop: `leaseSlot`, `launchIde` and `launchOnDesktop` (`scripts/lib/tb-ide.mjs`) take them from the broker.
- **Keep a probe that might crash the compiler in a project of its own.** twinBASIC runs the compiler in the same process as user code, so one bad probe can take the run down and cost the other probes their answer.
- **End an IDE by its pid, never by image name.** `taskkill /IM twinBASIC.exe` ends every other run's IDE, another session's included, and the user's own. `tbbuild --keep` prints the pid for this reason.

Why each of those is true, what the WebView/CDP route costs, why the harness
drives the IDE rather than the compiler's own websockets, and the seven ways a
sweep of this corpus returns a wrong answer: [WIP.Harness.md](WIP.Harness.md).

**Testing an IDE add-in** is `addin-test.bat`, and **testing the IDE itself** is `ide-test.bat`, the same runner; how both work, and the rest of their rules, are in [WIP.Harness.md](WIP.Harness.md#rules). These rules bind every session:

- **Never build or copy a test add-in into the real install's `addins\`, or into `%APPDATA%\twinBASIC\addins\`.** Either way it loads into the user's own IDE (measured for the second). A test add-in goes only into a lane's own folders: its copy of the install, where `addAddin` refuses anywhere else, or the `APPDATA` the lane gives every IDE it starts. That private `APPDATA` is also what keeps the user's own add-ins out of the test IDEs; never start a lane IDE without it.
- **A test never opens a real browser.** Every IDE the harness starts has `TB_ADDIN_TEST=1`, and an add-in under test prints `open <url>` to the DEBUG CONSOLE instead. Never start a test IDE with the variable removed unless its add-in opens nothing either way.
- **A test never starts a program on the user's desktop.** An IDE goes through `launchIde`, and any other executable --- the compiler's command line included --- through `launchOnDesktop` (`scripts/lib/tb-ide.mjs`), which puts it on a private desktop and closes any dialog it opens. A plain `spawn` or `spawnSync` of a twinBASIC executable shows on the user's desktop. Only `try-help-addin` shows an IDE, and only the one it opens the project in.

**Fixing the IDE itself** is `scripts/ide_js.mjs`, which reads, names and patches the IDE's
minified `ide/main.js`, so that an IDE entry of `BUGS-TO-REPORT.md` can carry a fix tested on a
patched copy of the install (modifying the IDE has Wayne Phillips' blessing; owner). How it
works, and what it rests on: [WIP.Harness.md](WIP.Harness.md#reading-and-patching-the-ides-mainjs).

- **Patch only a copy of an install, never one on the Desktop.** `patch --copy-to <dir>` makes the copy under `%TEMP%` (`makeIdeCopy`) and writes the patched `main.js` into it; pass the copy's `twinBASIC.exe` to `ide-test.bat --ide`, and delete the copy when done. `patch --out` refuses a file inside an install that is not under `%TEMP%`. Never write a patched `main.js` anywhere else, by this tool or by hand.
- **Wayne Phillips' own sources are never used** (owner): not fetched, not looked for (GitHub, the package server, caches), not kept on this machine. The tool works only from what an install ships. Every name in `scripts/ide-js/names.json` is ours, given from what the code does, and a fix shape says so.
- **No copy of `main.js`, whole or viewed, goes into the repository**: `patch --out` and `view --out` refuse a file inside it, and `test/ide-js.test.mjs` works on a few lines written in the test. A view goes under `%TEMP%`.

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

Four things are short enough to state here, because they decide whether a page
is in the right place at all, or may say what it says:

- **Placement.** A pure language keyword, parsed by the compiler with no runtime call, goes in `docs/Reference/Core/`. A runtime function or property goes under its package and module, with `redirect_from: /tB/Core/<name>` so legacy links still work. Packages are nested one level deeper than a bare `docs/Reference/<Package>/` --- see [Where things live](#where-things-live).
- **Attribution is per page, decided by content provenance, not by package membership.** Set `vba_attribution: true` only on a page actually derived from a specific VBA-Docs source page. A symbol merely existing in VBA is not sufficient.
- **Link to the canonical location**, meaning the page's own `permalink:`, never to one of its `redirect_from` aliases.
- **No public statement about the documentation's own testing** (owner). A page never says what this repository's tools could or could not check ("the samples harness cannot capture a console", "this was not probed"): that is a fact about the tooling, not the product. A claim nobody could check is written as the source supports it, or left out, and the reason goes in a WIP note. Any agent working on a section removes such a statement it finds there.

The public "start here" page for a new contributor, [docs/Documentation/Authoring.md](docs/Documentation/Authoring.md),
distils the same conventions (page template, heading levels, formatting,
plain-English prose, attribution policy, cross-section linking). Keep the two
in step when a convention changes; this file and its authoring sibling remain
the exhaustive maintainer source of truth.

## Plain-English prose

The audience is international: standard-English readers worldwide, often non-native, who may not parse idiomatic software-developer jargon. Use plain English in reference and tutorial prose.

The guiding principle: **replace metaphors imported from outside programming; keep vocabulary with a specific technical meaning inside Win32 / COM / event-driven programming.** If a phrase is the kind of thing a reader would have to look up in a tech blog, it doesn't belong in reference prose.

The full rules are in [WIP.Authoring.md, Plain-English prose](WIP.Authoring.md#plain-english-prose): the page opening, voice and tense, sentence shape, person, parameter descriptions, callouts (rule 6), See Also, and the word tables. In brief:

- **Active voice by default.** Present tense for behavior --- `returns`, not `will return`.
- **One idea per sentence.** Prefer two short sentences over one compound sentence with nested clauses.
- **Reference body prose uses third-person impersonal** --- "the constant", "the source", "the entry". "You" is acceptable inside `Example` lead-ins and in tutorial prose.
- **Name the fault directly; never build up to it.**
- **State what twinBASIC does; do not report having measured, probed or observed it.**
- **Delete vague compliments** (`powerful`, `robust`, `clean`, `rich`, `easily`): be concrete instead.
- **Never "cut a release"**, anywhere, comments included (owner): publish, make.

The words most often replaced:

| Term | Use instead |
|------|-------------|
| `bite` / `bites` (figurative) | affects, matters, goes wrong |
| `drive` / `driven` (figurative) | controlled by, determined by, powered by |
| `hand off` / `hand over` / `hand back` | returns, passes, delivers |
| `in order to` | to |
| `kick off` / `kicks off` | start, begin |
| `leverage` / `leveraging` | use, take advantage of |
| `spin up` / `spins up` | start, create |
| `surface` (as verb) | expose, appear as, make available, raise |
| `under the hood` | internally |
| `utilize` | use |
| `walk` (as verb — "walk the chain", "walks the children") | traverse, go through, iterate over |
| `wire up` / `wired up` / `wired in` | connect, attach, link |

### Source dashes

markdown-it's typographer (enabled in `builder/render.mjs`) converts the ASCII source forms to typographic characters at build time:

| Source | Rendered | Use for |
|--------|----------|---------|
| `--`   | en-dash `–`  | bullet-list separator (rule 7 in WIP.Authoring.md), ranges |
| `---`  | em-dash `—`  | parenthetical asides (rule 3 in WIP.Authoring.md), breaks in thought |

The source uses the ASCII forms; the rendered HTML uses the typographic characters. A literal dash in `docs/` markdown is forbidden: see the Don'ts.

WIP.md itself (and other files outside `docs/`) is not rendered through tbdocs and is exempt — literal em-dashes here render directly in the GitHub viewer, which is fine.

## Typography

Three self-hosted faces, one system, everywhere the docs render: **Inter** (web text, PDF headings, diagram labels), **Cascadia Mono** (all code) and **Source Serif 4** (PDF body text only), all SIL OFL 1.1, committed as subset `.woff2` under [docs/assets/fonts/](docs/assets/fonts/). Every diagram is Graphviz DOT, and its `.svg` is a build artifact (see the Don'ts). **Before touching fonts, diagrams or the PDF's type, read [WIP.Typography.md](WIP.Typography.md#rules)**: the faces, the rules for diagrams and fonts, and why.

## Scripts and tooling

**Anything that participates in rendering the online site, the offline site, or the PDF book is handled by [tbdocs](builder/), the in-tree Node.js static site generator.** Module-level documentation lives next to the code under `builder/`; the user-facing summary is on the [tbdocs Internals](docs/Documentation/Builder.md) page.

### Tooling is JavaScript

Everything under `scripts/`, `builder/`, `lib/`, `book/`, `eval/`, `wisdom/` and `indexer/` is
Node.js, and a new tool joins them there. A few files and folders are not, each for a stated reason: [WIP.Build.md](WIP.Build.md#what-is-not-javascript-and-how-each-is-rebuilt) lists them and says how each twinBASIC one is rebuilt, since no gate can build it.
**tblaunch (the launcher repository) compiles the sources of `scripts/impexp/` and `scripts/broker/` from this checkout**: renaming or adding a module there, giving one a public name tblaunch also has, or changing the members of `ImpexpSource` or `BrokerHost`, is done with the tblaunch session.
**No tool makes a desktop of its own**: each leases one
([WIP.Broker.md](WIP.Broker.md)).
`scripts/lib/llvm-cache/`, the lease on twinBASIC's LLVM cache server with its probes (one of them
PowerShell), is vendored from the launcher repository at the commit its `VENDORED.md` names, and is
changed only there: never edit the copy, and Biome leaves it alone.
The full accounting is in [WIP.Build.md](WIP.Build.md).

### The package indexer

`indexer/twin-index.mjs` is how a session finds the documentation work a twinBASIC build
leaves. `sync` indexes every package's sources into an `api.json`; `analyze` compares the
current ones with the snapshots committed in `indexer/snapshots/` (those of the build each
section's `indexed_from` names) and lists the public symbols to create, update and remove, in
`indexer/.packages/report.json`; `derive` writes `builder/package-api.json`, the package half
of the build's symbol index. It needs a twinBASIC install (or `--release`, for a machine
without one), is outside every gate and CI, and is documented in
[Tools-Build](docs/Documentation/Tools-Build.md#twin-index) and
[indexer/README.md](indexer/README.md); [WIP.Indexer.md](WIP.Indexer.md) says why it is built
as it is. Its rules (running `analyze` and `draft`, the pins, re-indexing a package, rechecking callouts after a new build, changing the scanner) are in [WIP.Indexer.md](WIP.Indexer.md#rules).

### The published docs assume manual work

**Nothing under `docs/Documentation/` should require Claude, an agent or a skill to follow.**
The audience is a contributor with an editor and a terminal; agent-assisted authoring is a
local convenience, not part of the contract the published documentation makes. That is why
the `document-symbol` skill lives under the gitignored `.claude/` and is described only here.

**[Wisdom](docs/Documentation/Wisdom.md) is the one deliberate exception, and its public
page stays public**: settled once, so do not re-propose relocating it. Why, and everything
about running the tool: [WIP.Wisdom.md](WIP.Wisdom.md).

## Build pipeline

The site builds via [builder/](builder/), a custom Node.js static site generator (`tbdocs`). See [builder/PLAN.md](builder/PLAN.md) for the architecture overview, [builder/README.md](builder/README.md) for the quickstart, and the [tbdocs Internals](docs/Documentation/Builder.md) site page for the high-level tour.

The task-graph scheduler and parallelisation are described in [builder/PLAN-scheduler.md](builder/PLAN-scheduler.md). A task that never finishes fails the build after `--stall-timeout` seconds ([WIP.Build.md](WIP.Build.md#a-hung-build-times-out-and-says-where-it-hung)).

**No task of the build starts a thread** (owner): the lanes are its only threads. Work that should run in parallel is split into lane tasks with `fanOut` (`builder/fan-out.mjs`), so that the scheduler places it and the Gantt chart shows it. A task starts no worker thread and no process for its work, and puts no CPU work on Node's thread pool, which zlib's functions without `Sync` in their name do. `check_lint.mjs` refuses the imports; the reasons and the exceptions are in [WIP.Build.md](WIP.Build.md#no-task-starts-a-thread).

### Compiling the reference's own code samples

No build gate evaluates a `tb` fence: `check_code_regions.mjs` only protects its
*contents* from rewrites. A sample that does not compile therefore passes every gate.

`examples.bat` over [scripts/check_examples.mjs](scripts/check_examples.mjs) asks
the compiler. A sample opts in by carrying `check_build` in its fence info string. The
tool works out what to generate around it, packs many samples into one project, builds them
through `tbbuild` on concurrent lanes, and reports each diagnostic against the line in the
page it came from. **The run takes about three minutes**; its summary line says how many samples it compiled.

It is **never** wired into `build.bat`, `check.bat`, `test.bat` or CI: it needs a twinBASIC
install, which `npm install` is not, and Windows with a private desktop and a
CDP-reachable WebView2, which CI has not. `sweep_a11y.mjs` has the same arrangement.
Its probes need none of that, and `test.bat` runs them (`test/example-batches.test.mjs`).
**So a pull request that adds or changes a sample pastes the run's command and summary
line into its description** --- the contributor-facing statement is
[Checking that a sample compiles](docs/Documentation/Authoring.md#checking-that-a-sample-compiles).

**[WIP.ExamplesBuild.md](WIP.ExamplesBuild.md) is the file for this** --- the markup, the
slots, the template projects and their stage sets, the batching and bisect-on-crash rules,
and what actually collides inside one project.

## Build / preview

- `build.bat` — runs `node builder\tbdocs.mjs --src docs --check-audit-index` (which implies `--check`) and produces three trees in one pass: the online copy at `_site/`, a `file://`-browsable copy at `_site-offline/`, and the sparse pagedjs source at `_site-pdf/`. Toggle `also_build_offline` / `also_build_pdf` in `_config.yml` (or pass `--no-offline` / `--no-pdf`) to skip a sibling output. `--check` runs the link + integrity check over the HTML while it is still in worker memory; `build.bat --no-check` gets a plain build. A build also writes the help add-in's archive, `add-in/Resources/HELP/site.zip` (see [The help archive](WIP.Build.md#the-help-archive) in WIP.Build.md); `--no-help-archive` skips it, and CI never passes it.
- `serve.bat` — runs `tbdocs --serve`: initial build, then a long-lived process with watcher, debounced rebuilds, and SSE-driven browser auto-reload. Writes to `docs/_serve/` (disjoint from `build.bat`'s `_site*/`) and skips the offline + PDF passes — so a one-off `build.bat` for the PDF or offline mirror doesn't disturb the live preview. Ctrl+C to stop.
- `check.bat` — the gates that read the built site: a freshness check that refuses a stale tree (`scripts/check_tree_fresh.mjs`), the DOT diagram fit check (`scripts/check_dot_fit.mjs`), the a11y sample-coverage check (`scripts/pick_a11y_sample.mjs --check`), the accessibility check (`scripts/check_a11y.mjs`), then the screenshot-size check (`scripts/check_shot_sizes.mjs`), which reads the pages, not the built site. The link + integrity check runs in `build.bat`. ~37 s.
- `test.bat` — the tests the *toolchain* has to pass; its list is [Tools.md](docs/Documentation/Tools.md#testbat)'s, and the [gate roster](WIP.Build.md#the-gate-roster) says what each asks. ~23 s, of which the regex-safety gate is ~10 s and the impexp check ~4 s. See [What belongs in test.bat rather than check.bat](WIP.Build.md#what-belongs-in-testbat-rather-than-checkbat).
- `book.bat` — renders the PDF from `docs\_site-pdf\book.html` via `node book\render-book.mjs` into `docs\_pdf\twinBASIC Book.pdf`. Run `build.bat` first to populate `_site-pdf/`; `book.bat` refuses a tree older than its sources rather than rendering the previous book (see [The book refuses a stale source tree](WIP.Build.md#the-book-refuses-a-stale-source-tree)).

- `examples.bat` — compiles the documentation's own twinBASIC code samples, every `tb` fence marked `check_build`, and reports the ones the compiler refuses against the line in the page they came from; a statement sample also marked `check_run` is built and run, and what it prints is checked against the page. Needs a twinBASIC install and Windows, so it is outside every gate and outside CI. Its options and modes are in [WIP.ExamplesBuild.md](WIP.ExamplesBuild.md); see [Compiling the reference's own code samples](#compiling-the-references-own-code-samples).
- `package-tests.bat` --- runs the test projects of the contributed packages (`scripts/package_tests.mjs`), outside every gate and CI, as `examples.bat` is: [WIP.Contributed.md](WIP.Contributed.md#rules).
- `addin-test.bat` — tests IDE add-ins by operating an IDE; outside every gate and outside CI; run `build.bat` first: [WIP.Harness.md](WIP.Harness.md#rules).
- `ide-test.bat` --- the same runner for scenarios that operate the IDE itself rather than an add-in: [WIP.Harness.md](WIP.Harness.md#rules).
- `try-help-addin.bat` --- opens one IDE on the user's desktop with the help add-in built and loaded, to try it by hand: [WIP.Harness.md](WIP.Harness.md#rules).
- `node scripts/shoot_docs.mjs` --- writes the documentation's IDE screenshots. **A run that would write under `docs/` is a run of the review session** (owner; [WIP.ShotReview.md](WIP.ShotReview.md#one-way-to-take-pictures), rule 1). **The Windows user name must never be in a published picture.** Read [WIP.Screenshots.md](WIP.Screenshots.md#rules) before running or changing it.
- The GitHub pictures of `Documentation/Building.md` are the owner's to take, with the Chrome extension in `scripts/svgshot/` (see the `gh` Don't): [WIP.Screenshots.md](WIP.Screenshots.md#rules).
- **The build also writes** the help add-in's project file and its archive, a markdown copy of each page with `/llms.txt`, and the whole nav as a file of its own: the rules for each are in WIP.Build.md ([The help add-in's project file](WIP.Build.md#the-help-add-ins-project-file), [The help archive](WIP.Build.md#the-help-archive), [Markdown copies and llms.txt](WIP.Build.md#markdown-copies-and-llmstxt), [The nav](WIP.Build.md#the-nav-a-part-on-each-page-the-whole-in-one-file)).
- `node scripts/bug_repro.mjs` --- the reproducer projects under `bugs/<slug>/` for the entries of [BUGS-TO-REPORT.md](BUGS-TO-REPORT.md): [WIP.BugHunt.md](WIP.BugHunt.md#reproducers).
- `node scripts/vb6run.mjs` --- builds and runs VB6 code, so that what a sample prints in twinBASIC can be compared with VB6 ([WIP.ExamplesBuild.md](WIP.ExamplesBuild.md#vb6runmjs)). **Never start `VB6.EXE` from a shell**: in Git Bash `/make` is rewritten as a path and VB6 answers with a modal box on the desktop.
- `node scripts/errors.mjs run|generate|write` --- the run-time errors of the documented procedures, as data under `errors/` ([WIP.Errors.md](WIP.Errors.md), [Tools-Defects](docs/Documentation/Tools-Defects.md#errorsmjs)): `run` builds and runs a probe of the cases in twinBASIC 32-bit and 64-bit (`tbrun --exe`), VB6 and 64-bit VBA (in 64-bit Access, `scripts/lib/vba.mjs`) and compares each with the data, `write` writes each page's Errors section. Its gate is `check_errors.mjs`; `run` is by hand, never CI.
- `node scripts/recheck_callouts.mjs` --- after a new BETA, checks again every callout labelled with an older one by running what its marker names, relabels what holds and lists the rest; by hand, never CI ([WIP.Indexer.md, Rules](WIP.Indexer.md#rules); [Tools-Defects](docs/Documentation/Tools-Defects.md#recheck-callouts)).
- `node scripts/build_speed.mjs <command>` --- measures the build for work on its speed: one-off builds and serve rebuilds of one checkout or two, the times read from each Gantt chart, a CPU profile by function, and one part of the build alone ([WIP.BuildSpeed.md](WIP.BuildSpeed.md), [Tools-Build](docs/Documentation/Tools-Build.md#build-speed)). By hand, never CI.
- `node scripts/ide_js.mjs <command>` --- reads, names and patches the IDE's minified `ide/main.js` (*Fixing the IDE itself*, under [Driving the twinBASIC compiler](#driving-the-twinbasic-compiler), and [WIP.Harness.md](WIP.Harness.md#rules)).

**After a new twinBASIC BETA**, work through [WIP.NewBeta.md](WIP.NewBeta.md).

Three generators sit outside that loop and produce committed artifacts rather than build output: `python scripts/build_fonts.py` and `node scripts/build_dot_metrics.mjs` ([WIP.Typography.md](WIP.Typography.md#rules)), and `node indexer/twin-index.mjs derive` ([WIP.Indexer.md](WIP.Indexer.md#rules)).

## Site integrity check

After a batch of changes, verify the site builds clean and all links resolve:

```sh
build.bat && check.bat
```

On the dev box that is ~4 s of build against ~37 s of check, of which the axe scan is ~20 s. [builder/PLAN-checks.md](builder/PLAN-checks.md) records how the link checker sits in the build's task graph and its cost; the axe follow-ons are designed there but not implemented.

**If the change touched `builder/`, `scripts/`, `lib/`, `book/`, `eval/`, `wisdom/`, `indexer/`, `test/`, `add-in/`, the site's scripts in `docs/assets/js/`, a wrapper or a workflow, run `test.bat` as well** --- another ~23 s. Most of its gates cannot be affected by an edit under `docs/` at all. **A few can.** `check_errors.mjs` compares the reference pages' Common Errors sections with the data under `errors/`, so edit the data and run `node scripts/errors.mjs write`, never the section. `check_package_tests.mjs` reads the callouts of the contributed packages' sections. `check_callout_evidence.mjs` reads every labelled callout and every marker, so a new callout labelled `BETA <n>` without its `<!-- test: ... -->` fails it. `check_lint.mjs` lints the site's scripts in `docs/assets/js/` along with the tooling. `check_gate_lists.mjs` reads `README.md` and every page under `docs/Documentation/`, so an edit to any developer page that states a gate count can fail it. `check_code_regions.mjs` reads every page too: after adding an unusual code construct (a fence whose contents include a fence marker, a 4-space indented block, an admonition wrapping a fence), run `test.bat` and read the built page ([WIP.Build.md](WIP.Build.md#the-code-region-gate)):

```sh
build.bat && check.bat && test.bat
```

**If the change touched `builder/`, compare the output as well.** `node
scripts/compare_trees.mjs` builds `HEAD` and the working tree from two git
worktrees and compares the three trees byte for byte, in about ten seconds. A
refactor must come out identical; any other change should differ exactly where
it meant to and nowhere else. See [WIP.Build.md](WIP.Build.md#the-pipeline).

### The gates, and where their internals are

[Tools and Scripts](docs/Documentation/Tools.md) owns the authoritative lists, and `scripts/check_gate_lists.mjs` fails the run if `README.md` or any page under `docs/Documentation/` disagrees with them --- **so do not state a gate count in prose on those pages** unless you mean to maintain it. **A new gate goes into its wrapper, the composite action `.github/actions/run-gates/action.yml` and Tools.md's list**, and `check_ci_workflows.mjs` fails `test.bat` until CI matches; a new tool gets an entry on the `Tools-<Group>.md` page it fits and a node in `docs/Documentation/Images/Tools-Groups.dot`. The roster, by wrapper, is in [WIP.Build.md](WIP.Build.md#the-gate-roster).

[WIP.Build.md](WIP.Build.md) says why each gate exists and what it must catch.
Two of its rules bind every session and are repeated under [Don'ts](#donts):
never rewrite markdown source or rendered HTML without a code guard, and
whitespace inside inline `<code>` is content.

## Repository Use

Favor concise one-line git commit messages.

**A piece of work goes in a short-lived worktree unless the owner says not to** (owner):
ask when starting, and without a no, proceed. `git worktree add -b <name>
.claude/worktrees/<name> staging` branches from the local `staging`, which holds commits
`origin` may not have yet; give it a `node_modules` junction to the main checkout's
(`New-Item -ItemType Junction`) and run `build.bat` once. When the work is done: rebase on
`staging`, fast-forward `staging` in the main checkout (git refuses while a file the branch
changes has uncommitted changes there), then remove the junction on its own (`cmd /c rmdir
<worktree>\node_modules`; a recursive delete would follow it into the main checkout's
`node_modules`), then the worktree and the branch.

**Lint before every commit:** `node scripts/check_lint.mjs`, a fraction of a second. It
runs Biome's linter and formatter check over the tooling and the site's scripts, and
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
recorded there is two lines, and neither line reproduces it alone. **A suspected defect that
has not been narrowed goes in [WIP.BugHunt.md](WIP.BugHunt.md)**, in a few lines, and the work
on the page goes on; it reaches BUGS-TO-REPORT only through the steps that file gives. **Before
drafting an issue about a contributed package, read [WIP.Contributed.md](WIP.Contributed.md#rules)**:
some differences are a package's convention, not a defect. Documentation defects
do not go there; they are fixed in `docs/`, or recorded in the relevant `WIP.*.md` until
they are.

## Don'ts

- **Nothing writes outside the cloned repository and the temp folder** (owner). A tool, a test, a probe, a fixture and a session keep their files in this checkout (`.claude/`, which git ignores, for what is not committed) or under `%TEMP%`: never at a drive's root (`C:\probe`, `C:\tbshots`), on the Desktop, in the user's profile or in another checkout. A path that a picture or a page must show is a virtual one, rewritten at the capture, not a real folder. Reading is not writing: an install on the Desktop, the Windows folder, VB6 and the installed fonts stay readable. The one exception is `tbbroker`, installed in `%LOCALAPPDATA%\tbbroker` because every checkout shares it ([WIP.Broker.md](WIP.Broker.md)). The registry has its own rule: a run leaves it as it found it ([WIP.Harness.md](WIP.Harness.md#what-a-run-leaves-in-the-registry-and-putting-it-back)).
- **A user name never reaches a committed file.** The manifests keep the BETA number, never an
  install's path; keep a path out of a snapshot, a note and a commit message too.
- Don't commit `.claude/` or `CLAUDE.md` — both gitignored. (`WIP.md` is committed; `CLAUDE.md` is just a local `@WIP.md` import shim.)
- Don't touch `_site/` or `_site-offline/` (build outputs, gitignored).
- **Don't walk `docs/` for its markdown with a private `readdir`.** Call `markdownFiles` from [lib/markdown-files.mjs](lib/markdown-files.mjs), which never enters the build's output trees. A walk that does enter them crashes whenever a running `serve.bat` rewrites `_serve`; see [The code-region gate](WIP.Build.md#the-code-region-gate). Any other walk of `docs/` decides what is an output tree with the same module's `isOutputTree`, as `check_tree_fresh.mjs` does, rather than a list of its own.
- **Don't judge rendered styling by opening a built page as a `file://` URL in the in-app browser pane.** It does not apply the page's stylesheets, so everything renders unstyled and any conclusion about colour, spacing, layout or contrast drawn from it is worthless. Use `serve.bat`, which serves over HTTP at localhost and renders for real. `file://` does work through puppeteer ([WIP.A11y.md](WIP.A11y.md#loading-the-offline-tree-over-file)). So: puppeteer for measuring, `serve.bat` for looking. Never the preview pane on a `file://` path.
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
- **Never filter a command's output without keeping the whole of it** (owner). Any command
  whose output goes through `tail`, `head`, `grep`, `Select-Object`, `Select-String` or the
  like is first teed to a file in the session's scratchpad or `%TEMP%`
  (`cmd 2>&1 | tee "$S/run.log" | tail -20`; in PowerShell, `Tee-Object -FilePath`), and the
  file is read when the filtered lines turn out not to be enough. A filter that keeps the
  wrong lines otherwise costs the whole run again. A tool that writes its report to a file of its own (`--out`, `--dump-results`) is
  given one as well.
- Don't push or force-push without explicit user request.
- **Use `gh` read-only.** Viewing, listing and searching are fine: `gh issue view`, `gh pr view`,
  `gh run list`, `gh search`, `gh api` with GET. Anything that writes to GitHub is the owner's
  alone, who has full authority over it: creating, editing, commenting on, closing or labelling
  an issue or a pull request, `gh pr create` and `gh pr merge`, `gh release`, `gh workflow run`,
  and `gh api` with any other method. A session prepares the text --- an entry's issue body, a
  pull request's description --- and leaves posting it to the owner. Once the owner has filed an
  entry, `bug_repro.mjs file <slug> <issue>` records it, which writes only to this repository.
- Don't leave a remote image URL in a finished page. A pasted `https://github.com/user-attachments/assets/...` link is fine to write --- [builder/vendor-assets.mjs](builder/vendor-assets.mjs) downloads it to `docs/assets/attachments/gh-<uuid>.<ext>` on the next local build and rewrites the render to point there; commit the downloaded file with the edit. Any other remote host has no such handling: download it yourself and commit it under the section's `Images/` folder. The build refuses a remote `<img>` ([WIP.Build.md](WIP.Build.md#remote-asset-vendoring) says why). A video is authored as a marked link -- `[Title](https://www.youtube.com/watch?v=<id>){: .video }` -- which `videoLinkPlugin` ([builder/render.mjs](builder/render.mjs)) renders as a locally vendored poster frame linking out to the video page, styled by `.video-link` in `docs/_sass/custom/custom.scss`. That makes the site free of third-party requests entirely; don't reintroduce an embed or a hotlinked `img.youtube.com` thumbnail.
- **Don't hand-edit a diagram's `.svg`, and don't change its `font-family` anywhere but the `.dot`.** The `.svg` is a build artifact; the next build overwrites it. Graphviz also sizes every box to the text *it* measured, so a face the layout never saw leaves labels hanging outside their boxes. Edit the `.dot`, rebuild, and let `node scripts/check_dot_fit.mjs` confirm it; see [Diagrams](WIP.Typography.md#diagrams).
- **Don't add a `@font-face` to `docs/_sass/custom/_fonts.scss` without also adding the stack to `modules-dark.scss`,** and don't move the `@font-face` block out of the `emit-font-faces` mixin. The dark compilation re-emits its whole payload under two selectors at raised specificity: a face declared there would be invalid, and a stack left out there applies in light mode and silently does not in dark.
- **Don't widen `SOURCE_EXTENSIONS` in [builder/publish-policy.mjs](builder/publish-policy.mjs) to make a build pass.** The build refusing a file is the gate working. Remove the file from `docs/`, or add a pattern to `exclude:` in `_config.yml`; widen the allowlist only when the type genuinely belongs on the published site, and never by folding `BUILD_EXTENSIONS` into it. See [The publish allowlist](WIP.Build.md#the-publish-allowlist).
- **Don't add a rewrite over markdown source or rendered HTML without a code guard.** A pre-render source rewrite goes inside `applyPreRenderRewrites`, between `maskCode` and its `restore`; a rendered-HTML rewrite uses `replaceOutsideCode`, or a pattern led by `CODE_OR_PRE`, both from `builder/code-guard.mjs`. An unguarded rewrite corrupts real code samples: control-flow indentation in a language reference, code spans in the PDF. `node scripts/check_code_regions.mjs` is the gate. See [Never rewrite markdown source without knowing what is code](WIP.Build.md#never-rewrite-markdown-source-without-knowing-what-is-code).
- **Don't state how many items a set has when the set can change** (owner, 2026-11-14): lanes, gates, probes, pictures, setups, samples, pages, packages, a package's members. Name the items, or let the list or table say what is there. A count a published page needs and the build can derive is a `{{tbdocs:<name>}}` placeholder ([Counts the build fills in](docs/Documentation/Authoring.md#counts), `builder/counts.mjs`); a measurement keeps its build or date (*"against BETA 1010: 34,648 probes"*). Nothing checks this ([WIP.Build.md](WIP.Build.md#build-time-counts-as-named-values) says why).
- Don't invent semantics — read the relevant primary source before paraphrasing (VBA-Docs for VBA-derived pages; the package's `.twin` sources for twinBASIC-specific ones).
- Don't add boilerplate sections (Remarks, See Also) if the source has nothing meaningful for them.
- **Never add `Co-Authored-By:` (or any "Co-authored by" / "Generated with Claude" / similar) trailers to commit messages.** Repository policy. Plain commit messages only.
