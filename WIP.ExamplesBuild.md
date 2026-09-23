# Compiling the Documentation's Code Samples

See [WIP.md](WIP.md) for the maintenance guide. This file covers the tool that answers *does
this sample actually build*, which nothing used to ask.

**Status: implemented.** `examples.bat` over
[scripts/check_examples.mjs](scripts/check_examples.mjs), with
[scripts/lib/tb-fences.mjs](scripts/lib/tb-fences.mjs) holding the half that needs no
compiler and [test/example-projects/](test/example-projects/) holding the template trees.
Reader-facing documentation is the [`check_examples.mjs`
entry](docs/Documentation/Tools.md) in Tools.md and [Checking that a sample
compiles](docs/Documentation/Authoring.md) in Authoring.md.

**931 samples are marked today** and the gate over them takes ~59 s. That is up from 401,
and the arithmetic of how it got there is [the second pass](#the-second-pass-604-to-818),
which is also where the one claim this file got badly wrong is corrected.

Of the 1,110 classifiable fences, 931 compile. Every gain since 826 came from editing pages
rather than from marking them, which is [the editorial
pass](#the-editorial-pass-826-to-931); what remains is
[what is left](#what-is-left-179-samples-and-no-lever).

## The problem

Round 6 pointed `tbbuild` at the reference for the first time and found two samples that do
not run: `WinNativeCommonCtls/ListView`'s flagship example passes an icon key the same
package's prose says raises 35613, and `Core/Event`'s first sample is a `Sub` with no name.
Both shipped. Every gate was green over them, because a `tb` fence is something
`check_code_regions.mjs` protects the *contents* of and never evaluates.

The five `Dim X As New Worksheet` samples in `Core/` (`Dim`, `New`, `Private`, `Public`,
`Static`) are the same class arriving from the import side: `Worksheet` is an Excel type,
and in a bare twinBASIC project that line does not compile at all.

## Why this is not part of a build

Stated first, because it is the constraint everything else bends around.

- **Cost.** An IDE cold start is 8--11 s per project and flat in project size (WIP.md,
  measured). A normal `build.bat` is ~4 s.
- **`npm install` must remain sufficient** to build the docs. A twinBASIC install is not on
  that path, and `dot.mjs`'s setup-failure behaviour exists to preserve exactly that.
- **CI cannot run it.** The harness needs Windows, a private desktop, and a CDP-reachable
  WebView2. None of that exists on the CI box.

So this is a **separate on-demand tool**, never invoked from `build.bat`, `check.bat`,
`test.bat`, or either CI workflow. A sample regression is caught when someone runs it, which
is the same deal `sweep_a11y.mjs` (~20 min, full site) already makes.

## Opt-in, because the corpus says so

`check_examples.mjs --census` is the live version of the table below, so there is one
reproducible number rather than three prose ones. Against 1,134 `tb` fences in 603 pages:

| shape | count | share | what is generated around it |
|---|---:|---:|---|
| whole `Class` / `Module` / `Interface` | 67 | 5.9% | nothing --- it becomes its own `.twin` |
| procedures and module-level declarations | 370 | 32.6% | a `Module tbx_<hash>` |
| loose statements | 607 | 53.5% | a `Module` and a `Private Sub` in it |
| class code-behind --- declarations, then statements | 54 + 12 | 5.8% | a `Class`, and a `Private Sub` in it |
| fragment --- no wrapper rescues it | 24 | 2.1% | --- |

The census also prints **which classifiable fences carry no marker, by section and by
page**, because that is the question the marking work is actually planned from and it needs
no compiler to answer. What it deliberately does not claim is that any of them would
compile; only `--propose` knows that.

**Two earlier censuses disagreed with this one and with each other**, at 36 / 357 / 457 /
250 and 103 / 349 / 22 / 621. The `procedure` row is the one all three agree on. The
fragment row is where they differ most, and the reason is worth keeping: a fence that reads
as unbalanced is usually a classifier that does not know the language rather than a sample
that is genuinely incomplete. Three gaps accounted for nearly all of it, and each is now a
probe in `check_examples.mjs`:

- **an `Interface` body holds prototypes.** `Sub Bar()` inside one has no `End Sub`, so
  pushing it as a block eats the `End Interface` after it. Seven fences.
- **a `Type` is a container in twinBASIC**, unlike VBA: a UDT may declare
  `Type_Initialize`, `Type_Assignment` and `Type_Conversion`, which is what
  `Features/Language/UDTs.md` is about. But a UDT *field* may also be called `Type As Long`,
  which reads as an opener that never closes --- the trap
  `builder/census_attributes.mjs` records paying for, so every opener demands a name after
  the keyword.
- **`Overridable` is a modifier**, with 32 uses in the shipped packages and 3 in `docs/`.
  Leaving it out of the list cost three fences, and they came back as *"End Function closing
  Class"* --- a missed opener always surfaces as a mismatch somewhere later, never where it
  happened.

What is left after those fixes really is fragmentary: an elision (`...`), a signature shown
without a body, a syntax skeleton with `<placeholders>`.

**Opt-in is still right**, but not for the reason the design gave. It is not that most of the
corpus is unclassifiable --- 98% of it is. It is that when this was decided **54% compiled
and 46% did not**, and the 46% was overwhelmingly samples that are correct as documentation
and incomplete as programs: a `With MyLabel` block with no `MyLabel`, a handler for a class
the page does not define. Marking those would be wrong, and opting them out one by one would
be a list of five hundred exceptions. Two marking passes and an editorial one have taken the
compiling share to 84%; what is left is the part where the sample really is not a program.

## The markup

**In the fence info string.** `builder/render.mjs`'s fence renderer is why:

```js
const lang = tok.info ? tok.info.trim().split(/\s+/)[0] : "";
```

The first whitespace-separated token is the language and the rest is discarded, so anything
after `tb` is already invisible. Verified against the real pipeline --- `createMarkdownIt`
plus `initHighlighter`, not a bare markdown-it, which is the distinction WIP.md's [Source
dashes](WIP.md#source-dashes) section was burned by --- and the four properties are probes
that ride along on every run:

| property | result |
|---|---|
| a marked fence renders byte-identical HTML to a plain one | **true** |
| `maskCodeRegions` still hides the body | **true** |
| the mask round-trips the marked fence | **true** |
| `applyPreRenderRewrites` leaves it byte-identical | **true** |

So the markup costs nothing at render time, cannot reach the HTML, and cannot perturb
`check_code_regions.mjs`, which compares fence *contents* and never sees the info string.

Shape --- bare flags and `key=value` pairs after the language token:

    ```tb check_build slot=module id=getobject-1

**No backticks in it.** CommonMark forbids them in a backtick fence's info string, and
`maskCodeRegions` skips such a fence outright.

| token | meaning | default |
|---|---|---|
| `check_build` | compile this sample | --- |
| `check_run` | compile it *and* run it, capturing Debug output. **Not implemented**; such a fence is compiled only, and the run says so | --- |
| `hidden` | context for the page's samples, compiled with them and rendered to nothing. Implies `check_build` | --- |
| `slot=` | `file`, `module`, `sub`, `class` or `method` --- what to generate around it | inferred |
| `inherits=` | the class the sample is code-behind *of*; forces the Class row | --- |
| `project=` | which template project to build into | inferred from the page's path |
| `projname=` | build these samples as one project | each sample is its own unit |
| `id=` | stable name for reporting | `<page>#<ordinal>` |
| `expect-error=` | the sample is *meant* not to compile; assert this error | --- |
| `resource=` | **on a fence in any language**: stage this fence's contents into the project at that path, instead of compiling it | --- |
| `inert=` | this fence is not a program, or cannot be one: `skeleton`, `excerpt`, `pseudo`, `contrast`, `external`, `designer` or `blocked` | --- |

### `inert` is a decision, not a suppression

Before it, an unmarked fence meant two different things --- nobody has looked, and somebody
looked and concluded there is nothing to compile --- and the census could not tell them
apart. So every pass re-triaged the same hundred skeletons, and the backlog never appeared
to move.

`inert=<reason>` records the second. It **takes a reason rather than being a bare flag**,
because a bare flag would only hide the fence; the reason is what makes the count readable,
and what lets a later reader disagree with a specific judgement rather than with a silence.
An unknown reason is refused the way a bad `slot=` is, and `inert` beside `check_build` is
refused as a contradiction: those are opposite claims about the same fence.

The census prints three numbers now --- marked, inert by reason, and **undecided**. Only the
last is a backlog, and it is the one to drive to zero; the inert count is supposed to grow
and then sit still.

**`blocked` is the one reason that is not about the fence**, and **nothing carries it
today** --- which is the point worth keeping. It marks correct code that a *product* defect
stops compiling, and it exists so that the alternative, rewriting the sample until the
compiler accepts it, is not taken by accident.

Six fences carried it for about an hour: `ImlDrawTransparent` (WinNativeCommonCtls),
`CefLogWarning` (cefPackage), `vbDirectionHorizontal` and `vbQRCodegenEccHigh` (VB) are enum
members a default project cannot name, because each enum sits inside a `Private Module` or a
private base class. Then the obvious question got asked --- *what would a reader actually
do?* --- and the answer was the asterisk: `*WinNativeCommonCtls` exposes the package's
private half, and `WinNativeCommonCtls.ImlDrawTransparent` compiles. Two more templates
(`wnc-private`, `cef-private`) join `vb-private` and `cc-private`, every one of the six
samples is checked again, and each page now carries an IMPORTANT saying which library symbol
to set and why.

**The lesson is the rule, not the reason:** documenting a call and leaving no way to make it
work is worse than either fixing it or deleting it. `blocked` is for a defect with no
workaround at all, and reaching for it is a signal that the workaround has not been looked
for hard enough. The package defect is still a defect --- BUGS-TO-REPORT.md carries it, since
a documented enum should not need the asterisk --- but the reader is no longer stuck.

### A sample can be compiled against a file

`[PopulateFrom("json", "/Resources/MESSAGETABLE/Strings.json", "events", "name", "id")]`
fills an empty `Enum` with members read from a project file **while compiling**. A page
documenting it therefore has samples whose symbols exist only if that file does, and
`WinEventLogLib/index.md` is the case: its `Class MyService` names
`MESSAGETABLE.EVENTS.service_started`, which comes from the JSON the page prints two
sections further down.

`resource=<project-relative path>` on that ` ```json ` fence stages it. Measured before any
of it was built, by hand: **`import` packs a `Resources/` tree into the `.twinproj`, the
attribute reads it, and a module referring to `MESSAGETABLE.EVENTS.service_started` compiles
with 0 errors** --- so the member names really are produced from the file rather than merely
tolerated.

Four rules, each a consequence rather than a preference:

- **It is a file, not a sample.** Never compiled, never counted, absent from the census, and
  it cannot pass or fail. The run header says `N staged file(s)` so the count is visible.
- **It travels with its page**, exactly as `hidden` does, which is why no `projname` is
  needed for it to reach the page's group.
- **It keeps its own id series** (`<page>#r1`). Collecting a `json` fence into the same
  numbering as the `tb` fences would renumber every sample below it on the page, and a
  sample's generated module name is a hash of its id.
- **The path may not leave the project.** No `..`, no drive letter, no UNC --- eight probes,
  and the first version of the guard failed one of them: it stripped the leading slashes
  before testing for `//`, so `//server/share/x.json` passed as `server/share/x.json`.

What this buys is not the tick. It is that the JSON's shape --- which array, which field
supplies the name, which supplies the value --- is now checked against the code that reads
it, on the page that documents both.

**`project=` and `projname=` are one character apart and mean different things** --- the
template to build into, and the group to build with. Worth renaming if it ever trips
anybody.

**The names say what is asked for, not what has happened to the sample.**

**`slot` and `project` are inferred and stated only when inference is wrong.** A
misinference is self-reporting --- it produces a compile error rather than a silent pass ---
and the reporter names the slot it used in every finding, so a wrong guess reads as a wrong
guess rather than as a broken sample. `project` follows the page: anything under
`Reference/Built-In/` or in a package tutorial gets the template that references every
package, because the package a sample needs is what the page is *about*, and stating
`project=` on 263 fences would be markup that repeats the directory name above it.

**A mistyped marker is a finding.** `check_bild` renders identically to no marker at all, so
a sample carrying one would never be compiled and nothing would say so. That is the one
failure mode of this design that is invisible by construction, which is why it is checked in
every mode including `--census`.

## Template projects

Version-controlled exported trees under `test/example-projects/<name>/` --- a `Settings`
file plus `Sources/`, exactly what `twinBASIC_win32.exe export` produces and what `tbrun`
already consumes. Two exist:

| template | references | for |
|---|---|---|
| `console` | stdole, VB (Forms), AppGlobalClassObject | everything by default |
| `packages` | the above plus all eleven other shipped packages | `Reference/Built-In/` and the package tutorials |

**`project.references` is a plain JSON array, and a hand-written entry works.** Measured:
an entry composed by hand from a package's own `Settings` --- id, name, version,
`symbolId`, `isCompilerPackage: true` --- resolves the package's symbols exactly as the
IDE's package manager's does. So a template is made by appending to that array; no IDE
session is needed, and the result is diffable.

### The stage set

Each template carries a `Sources/tbxStage.twin` declaring the control instances the samples
assume --- `Text1`, `ListView1`, `CefBrowser1`, and so on. A sample that says
`Text1.Text = "hi"` is form code-behind: complete as documentation, because the reader has a
form with a `TextBox` on it, and impossible to compile alone, because the designer rather
than the code is what declares `Text1`. Declaring those instances lets the compiler check
what the sample is actually asserting --- that the member exists, that it takes those
arguments, that the types line up.

Measured on the 263 `Reference/Built-In` fences: **99% fail against a bare template, 78%
with every package referenced, 67% with the stage set**, and per package CEF goes 85% → 15%,
WebView2 73% → 27%, WinNativeCommonCtls 100% → 45%.

**The list is written out rather than inferred, and that is the point.** A rule over "an
identifier ending in a digit" was the obvious shortcut; a census of the corpus says it would
also have declared `Var1`, `Arg1`, `Line2`, `SQLITE3`, `VBA7`, `MySub1` and `IShellView2`,
none of which is a control. The stage set is the tool's one deliberate fiction, so it stays
explicit and greppable.

## Batching, which is the whole cost question

One project per fence is unaffordable. What makes it tractable is that **IDE cost is flat in
project size** --- what is paid for is startup, not compilation. Measured on this corpus:
1,082 auto-wrapped fences across 16 projects on four concurrent lanes, **36.6 s wall**
including packing. Today the 826 marked samples take ~45 s over 16 projects, and the full
1,103-fence survey ~90 s over 21 --- the survey's extra includes the three builds it spends
isolating the one diagnostic that lands outside every sample.

**Fill the lanes, not the batches.** Filling each batch to `--batch` before opening another
put 120, 55, 4 and 3 samples on four lanes --- and a run takes as long as its biggest batch.
The batcher sizes to `ceil(total / jobs)` instead. On the VBA reference that was 28 s → 10.7
s for the same result.

### A sample could pass on its neighbour's declarations

Several samples share a generated project, and a `module`-slot sample's declarations are
**visible to every other sample in it**. So a sample can compile because an unrelated one
defined what it referenced --- and which samples share a project depends on the selection,
so the same page passes one run and fails the next.

**Measured, on the first page it was pointed at.** `Tutorials/Testing-with-Assert.md`
defines `PadLeft` in one fence and tests it in three others. Surveying the page with
`--propose` compiled all 30 of its fences together, so the tests resolved `PadLeft` and
passed; the gate run afterwards selected only the marked ones, the definition landed in a
different project, and the same three samples failed on `Unrecognized symbol 'PadLeft'`.
A tool whose survey and gate disagree about one page is worth less than either.

`projname=` is the answer, and it is markup rather than a heuristic because the grouping is
a fact about the page that no scan recovers:

- samples sharing a `projname` are compiled **as one project**;
- **and nothing else is compiled with them**, so the result depends on what the author
  grouped and the template, not on what the run happened to pack beside it;
- a group that is only **half marked** is a finding naming the missing members, because the
  alternative is an error about a missing symbol in the sample that is fine.

A page-atomic rule was the obvious alternative --- keep every page's fences together --- and
it is worse twice over: it would silently merge samples on pages that deliberately show two
versions of one class, and it would still leave a page passing on another page's
declarations. Three probes cover the batcher now, since a grouping that stops holding
produces a green run whose samples were compiled apart.

**The residual is stated rather than closed:** two *ungrouped* samples still share a
project and can still see each other. Nothing in twinBASIC hides a module's public members
from the rest of a project, so the only complete fix is a project per sample, at 8--11 s
each. What removes the risk where it matters is that a real dependency is now written down.

Collision rules, all forced by putting unrelated samples in one compilation unit:

- **One generated `Module tbx_<hash>` per fence.** The hash covers the fence's id, so it is
  stable across runs and traceable without a lookup table.
- **Everything generated is `Private`.** Eleven pages declare a `MyString`.
- **`Sub Main` comes from the template, never from a fence.**
- **A generated module must not share a name with the project.** `project.name = "ProbeWS"`
  beside `Module ProbeWS` makes `[RunAfterBuild]`'s `ProbeWS.ProbeWS.Probe` ambiguous, and
  the IDE refuses it at *execution* time --- so the build is green and nothing runs.

**What actually collides is narrower than it looks, and guessing it wide is expensive.**
Measured: two generated modules may each declare `Public Function Foo`, `Public Type Rec`
and `Public Const Answer`, and two different Enums may each have a member called `Red`; two
Enums with the *same name* are `TB5000 duplicate definition in the current scope`. So only
type-level names (`Class`, `Module`, `Interface`, `CoClass`, `Library`, `Namespace`, `Enum`)
force two samples apart, and a rule that also tracked procedures would split batches --- each
costing a whole IDE startup --- for nothing.

**`[RunAfterBuild]` is one per project.** `TB5114 encountered too many [RunAfterBuild]
attributes. Only allowed one per-project.` So `check_run` cannot batch the naive way: either
a project per sample, or one generated dispatcher that calls each sample's Sub in turn, with
a marker line printed around each call so the output can be attributed and a sample that
throws does not silently swallow the rest.

Two things a batch runner must do that a single-fence runner need not:

- **Keep a source map.** Errors return against a generated file and line; the report names
  the page, the fence and the line within the page. Emitted while generating, not
  reconstructed afterwards. The offset differs per slot and the arithmetic must come out the
  same for all three, which is a probe.
- **Bisect on a compiler crash.** twinBASIC runs the compiler in-process with user code, so
  a bad sample can take it down --- and in a batch that loses all hundred with it. On crash,
  split and recurse: O(log n) extra builds, paid only on failure. Verified against the real
  case, with the crashing sample isolated out of a batch and the rest of the batch still
  reporting.

### A diagnostic that lands in a package's own source

**A sample can produce a compiler error that appears in no file the sample is in.** Measured
shape: a generic instantiated with a type the project does not have is reported against the
*generic's own type parameter*, inside the package's source ---
`Packages/WinServicesLib/Sources/ServiceCreator.twin [10,20]: TB5079 Unrecognized datatype
symbol 'T'` for a sample writing `New ServiceCreator(Of MyService)` with no `MyService`
anywhere. The sample gets **no diagnostic of its own at all**.

That row matches no generated file, so it used to be filed as a template fault: the run
failed with a row naming no page, and **the sample was counted as one that compiled**. One
sample in the corpus is in that shape (`WinServicesLib/index.md#1`) and it is unmarked, so
the gate was green rather than wrong --- but a marked sample there would have been a false
pass of exactly the kind this tool exists to end.

Three parts to the fix, each forced:

- **An unreadable row and an unattributable one are different.** A row this cannot parse
  names no file, so no amount of splitting finds its cause; an ERROR against a file that is
  not one of the batch's generated samples has a cause among them.
- **One build of the template with nothing in it decides whose row it is**, memoised per
  template and shared across lanes. Without that the leaf is ambiguous --- a sample that
  provoked the row and a template that emits it unprompted look identical --- and guessing
  the first would bisect every batch to a single sample, hundreds of IDE starts, and then
  blame an arbitrary one. The probe is lazy, so a clean run pays nothing for it.
- **The split goes by unit, not by slicing the fence array.** A `projname` group is one
  program, and a page's `hidden` fences are appended at the *end* of `batch.fences`, so a
  plain halving took a group apart and dropped one half's context --- manufacturing the
  failure it then reported. The crash bisect had this fault and nobody had hit it, because a
  group is rare and a crash is rarer.

Cost on this corpus: **one blame in 1,103 samples, three extra builds.**

**`--only` cuts a `projname` group, and that silence cost an hour.** Narrowing to
`WinServicesLib/ServiceCreator` left the page that declares `MyService` out of the run while
keeping three pages that instantiate `ServiceCreator(Of MyService)`, so the isolation blamed
a sample the full gate passes --- and it was read as a real false pass. `checkGroups` kept
quiet about it deliberately, on the grounds that the filter is the caller's own doing. It now
says so as an advisory finding. **A narrowed run's results are not a full run's, and the tool
has to be the thing that says which.**

## Traps already paid for

Each cost a run, either during the probing that produced this file or during the
implementation.

- **`tbbuild` reported a clean build on a project that crashed the compiler.** This is the
  one that mattered most, because every number in this file depends on it. A 275-fence
  project reported `0 errors, 0 warnings` and exit 0 --- twice, reproducibly --- while its
  quarters reported 129, 0, 294 and 448 errors. The console of the quarter that reported
  zero held three `NATIVE EXCEPTION: ACCESS_VIOLATION` lines and three
  `restarting from MEMORY`. `tbbuild`'s crash detector needed the status bar to leave
  OPERATIONAL twice at 1 Hz sampling, and the whole crash-restart cycle takes about 1.3 s,
  so it slipped through; after the third restart the IDE gives up and leaves the status at
  OPERATIONAL with the counters at zero, which is byte-identical to a clean build. It now
  reads the DEBUG CONSOLE, which nothing removes an entry from, and exits 4 naming the file
  the compiler died parsing. **Treat any tooling that infers "finished" from "stopped
  changing" as suspect on this compiler.**
- **A two-line syntax skeleton crashes the compiler**, and it is in the corpus:
  `Interface <name> Extends <base-interface>` / `End Interface`, in
  `Reference/Attributes.md`. Neither half crashes alone. Recorded in
  [BUGS-TO-REPORT.md](BUGS-TO-REPORT.md); the classifier now refuses a `<placeholder>` as a
  declaration name, so it takes an explicit `slot=` to reach the compiler with one.
- **`project.buildPath` must be an explicit file.** The default `${SourcePath}\Build\...`
  template opens a native Save dialog, which on the private desktop is invisible and
  unreachable, so the build silently never happens --- and the WebView2 renderer stays
  responsive throughout, so every health check says the IDE is fine. The generator pins it
  in the staged copy.
- **`MsgBox` hangs a run-mode probe, invisibly.** The HelloWorld template's `Main` is a
  `MsgBox`; the templates here have an empty one. Run-mode fences must be screened for
  `MsgBox` / `InputBox` and refused, not discovered at the timeout.
- **Two IDEs must not hold one source tree.** `tbbuild` takes the project directory as given
  and does not stage a copy the way `tbrun` does, so two concurrent builds pointed at the
  same folder --- distinct `--port`s, distinct desktops, everything else correct --- both
  wedge and neither ever returns. Each lane owns a workspace, not just a port.
- **`export` needs the output folder to exist** (one level only), and stdin redirected
  (`</dev/null`) when looping, or the executable eats the loop's input.
- **Paths handed to the compiler must be pure Windows.** It prefixes `\\?\`, which does not
  accept forward slashes: a `C:\Users\x/Desktop/...` mix fails with `input twinproj file
  does not exist`.
- **`import` exits 0 whether it worked or not.** Its output is the only test: a successful
  pack ends `... DONE`.
- **Office examples leak one process per run, and it is not self-limiting.** Each
  `CreateObject` starts a *separate* `EXCEL.EXE`, calling `Quit` is not sufficient --- the
  process exits only once every COM reference is released --- and they sit on the user's
  real desktop rather than the private one, hidden only because `Visible` is `False`.
  `tbrun` harvests them with a before/after snapshot diff restricted to processes that are
  new, on an image allowlist, *and* windowless; a run-mode batch inherits that and must pass
  `--no-reap` while running concurrently, sweeping once at the end.
- **DCOM does not reclaim it on a timer**, which is the first thing anyone asks. COM's ping
  protocol is for *remote* references; a same-machine client has no ping GC. Measured: a
  force-killed `CreateObject` holder's `EXCEL.EXE` was still running 563 s later. A job
  object is no answer either --- the server is not a descendant.

## What the first full run found

586 of 1,095 classifiable fences compile. The other 509, by first error:

| n | first diagnostic |
|---:|---|
| 70 | `TB5182 Syntax error. No handler for this symbol` |
| 35 | `TB5079 Unrecognized symbol 'WebView'` |
| 27 | `TB5025 [Me] cannot be used in standard modules` |
| 21 | `TB5079 Unrecognized symbol 'Host'` |
| 19 | `TB5079 Unrecognized symbol 'UserControl'` |
| 13 | `TB5079 Unrecognized symbol 'Data'` |
| 21 | `TB5079 Unrecognized symbol 'Exact' / 'Strict' / 'Permissive'` |

Three of those are actionable as a group rather than one page at a time:

- **`[Me]` wants a fourth slot.** 27 samples are class code-behind wrapped in a `Module`,
  and the compiler says so precisely. A `slot=class` that wraps in a `Class` instead is a
  small change and the largest single win available.
- **`WebView`, `Host`, `UserControl`, `Data`** are stage-set entries that do not exist yet
  --- the WebView2 tutorials' own variable names, tbIDE's addin `Host`, and the
  `UserControl` a CustomControls sample is written inside.
- **`TB5182` is not one fault.** It is where the 70 different ways a sample can be an
  excerpt end up, and it needs reading page by page.

> **The first of those three is wrong, and the way it is wrong is the useful part.**
> `slot=class` was built and measured: a bare `Class` wrapper fixes **5** samples, not 27.
> It removes TB5025 and replaces it with `TB5027 [tbx_…] does not contain 'Caption'`,
> because `Me` becoming legal does not make `Me.Caption` resolve --- the wrapper has no
> `Caption`. Only the samples whose `Me.<member>` is a member they declare themselves were
> ever one wrapper away from compiling.
>
> **"Largest single win available" was a guess dressed as a finding**, arrived at by
> counting diagnostics rather than by trying the fix. The actual largest win was the stage
> set, at 97 --- the second bullet, which was right. See [the second
> pass](#the-second-pass-604-to-818).

## The second pass: 604 to 818

The numbers below are all measured against BETA 983, each as a before/after of the same
survey (`--propose --json`, diffed by fence id) so that "newly passing" and "newly failing"
are counted rather than asserted. **No change in this pass regressed a sample.**

| change | newly passing |
|---|---:|
| the `class` / `method` slots, bare wrapper | 5 |
| `inherits=`, applied where a base is honest | 7 |
| stage-set extension (controls, `UserControl`, `Ambient`, tbIDE, CustomControls) | 97 |
| `cef` / `webview2` template split | 36 |
| `WithEvents` added to the Class inference | ~30 |
| declaring the locals VBA-derived samples left implicit | ~25 |
| `hidden` context fences, on the pages that had one-page fictions | 6 |
| reading an access modifier as a declaration, not a statement | 8 |

### The Class row, and why it needs a base

`class` and `method` are `module` and `sub` with a `Class` container instead of a `Module`.
The two are inferred rather than stated, from two signals that are language rules rather
than guesses:

- **`Me`** --- TB5025 reads *"[Me] cannot be used in standard modules. [Me] is only
  applicable to class modules."*
- **a top-level `WithEvents` field** --- not legal in a standard module at all. The
  compiler reports `TB5182` on the declaration and then `TB5079` on every later use of the
  name, so one wrong container produces four diagnostics and none of them names the cause.
  The whole WinNamedPipesLib reference is this shape, because the `WithEvents` field *is*
  the subject of those pages.

**Neither inference can regress a passing sample**, which is what makes it safe to apply
without markup: a module- or sub-slot fence carrying either signal is already failing, so
moving it to the Class row can only change which diagnostic it gets, or fix it. A file-slot
fence brings its own container and is never reclassified. Verified by diffing the survey:
0 newly failing.

**`inherits=` is what actually pays.** Measured across the 46 class/method fences:
**5 compile in a bare `Class`, 12 in one that `Inherits Form`.** A sample reaching
`Me.Caption`, `Me.Arrange`, `Me.Controls` or `Me.Print` needs the wrapper to *be* a form,
and `Inherits Form` gives it one --- `Me.Caption = "Welcome"` resolves, checked against the
real `Form` type. `inherits=PropertyPage` and `inherits=MDIForm` work the same way.

Three things the base cannot rescue, all measured:

- **A `Handles X.Y` clause binds to a field named `X` in the same class.** In a generated
  `Class … Inherits Form` there is no field called `Form`, so `Handles Form.Load` fails
  with TB5019 --- while the *same clause in a generated Module* compiles. So a sample using
  both `Handles` and a form intrinsic cannot be made to compile under any wrapper this tool
  can synthesize; it needs a real designer form, which needs designer JSON (TB5247).
- **A `WithEvents` handler has the same requirement**, which is why the browser stage sets
  declare `WebView` plainly: a handler in a generated module could never bind to a
  `WithEvents` in a shared stage module anyway.
- **`UserControl.PreKeyEvents = True` is `TB5096 ReadOnly binder`** against the stage's
  `UserControl` variable, though the unqualified form is what a real UserControl writes.
  The fiction does not reach that far; the sample stays unmarked.

### Two templates for one control name

`WebView` was the single most common undeclared symbol, at 65 uses. Both browser tutorials
open by telling the reader to *"drop a control onto a Form and rename it `WebView`"* ---
one a **CefBrowser**, one a **WebView2**. One name, two types, on pages that shared a
template, so no single stage set could carry it.

The templates split instead: `cef` and `webview2`, each with its own `tbxStageBrowser.twin`,
routed by path in `defaultProject`. 36 samples.

**Template inheritance came with it**, because five templates meant five copies of a stage
set that is mostly the same list --- the duplication this file predicted would bite once a
third appeared. `TEMPLATE_BASE` in `check_examples.mjs` names each template's base and the
stager copies base-first, delta-over; a template now holds only the files that *differ*.
`vb-private` is one `Settings`, `cef` and `webview2` are one stage file each.

The relation lives in the tool rather than in the tree deliberately: a template directory is
an exported twinBASIC project that `import` has to accept, so a marker file in it is a thing
to test rather than a thing to declare.

### `overrideSymbol`, and the package's private half

`VB.IVBPrint` does not resolve in an ordinary project: the VB package's top-level components
can be `Private`, and the IVBPrint page tells the reader to prefix the library symbol with
an asterisk --- `*VB` --- to expose them. The project-settings key for that is
**`overrideSymbol`**, alongside (not instead of) `symbolId`; the IDE resolves
`r.overrideSymbol ? r.overrideSymbol : r.symbolId`. Found by grepping `ide/main.js`, then
verified by building the page's own sample against it.

That is the `vb-private` template, and it is the right shape for this: the page is
documenting a project configured differently from the default, so the samples build in a
project configured that way rather than in one where the docs would have to be wrong.

### A page can carry its own context: `hidden`

A fence marked `hidden` is compiled with the page's other samples and **rendered to
nothing** --- `builder/render.mjs`'s fence rule returns `""` for it, so it is absent from
the HTML and therefore from everything downstream that reads the rendered string: the
search index, the offline mirror, the PDF book. Verified across all three trees: zero
occurrences of any string unique to a hidden block.

It exists because the alternative was worse. `MyServiceA` / `MyServiceB` are fiction
invented for one page; `ClientSession` for two. Putting them in the shared stage set meant
a template read by six hundred pages carrying declarations that serve one --- which is the
"templates super specific to one or two pages" smell. Both are now hidden fences on the
pages that need them, and two template source files are gone.

Three rules, each of which cost something to find:

- **A hidden fence is the PAGE's context, not a unit.** It joins every batch holding a
  sample from that page, and is never compiled alone --- a hidden block compiled by itself
  passes and helps nobody.
- **Its declared names are charged per page, not per unit.** The first version folded them
  into each unit's own names, so the *second* sample on a page "collided" with the context
  the first had just brought, and every page with hidden context split into one project per
  sample --- each costing a whole IDE start. WinServicesLib went from 2 projects to 4-of-2
  before this was fixed.
- **They still have to be counted.** Two pages whose hidden blocks both declare a
  `ClientSession` must not share a project. They do not, and a probe says so.

**`hidden` implies `check_build`**, because a hidden fence nobody compiles is text nobody
can read and nothing checks.

**A page cannot hide what it also shows --- so rename the placeholder.** Hidden context
joins every project holding a sample from its page, so a *visible* sample on that page
declaring the same name meets it. `Reference/Core/CoClass.md` is the case, and it looks like
a hidden-fence job right up until you try it: its first example names `IFoo` and `IBar`
without declaring them, and the page's *next* example is a complete custom-constructor
sample declaring `IFoo`, `IBar` and `CoClass Foo` in full. Measured:
`TB5137 'IFoo' is ambiguous. Could be: [Class] DocSamples1.IFoo [Class] DocSamples1.IFoo`.

The way out is neither duplicating the ten lines that already appear ten lines below, nor
giving up and calling the fence an excerpt. **`IFoo` and `IBar` are arbitrary placeholder
names**: the first example is now a `CoClass Shape` over `IShape` and `IDrawable`, with
those two interfaces in a hidden fence, and both examples compile. The rename also does
something for the reader, which is why it is the right answer rather than a trick --- two
examples that shared a cast of characters now look as different as they are.

The general rule: **when hidden context collides with a visible sample, check whether the
name is load-bearing before working around it.** A placeholder can simply be something else.

### A collision rule that was measured too narrowly

`COLLIDES` excluded `Type` on the strength of a real measurement: two generated modules may
each declare `Public Type Rec` without complaint. True, and beside the point. A
module-scoped `Type Foo` and a project-scoped `CoClass Foo` are **both in scope inside that
module**, so a reference to `Foo` there is `TB5137 'Foo' is ambiguous`.

`Features/Language/Pointers.md#1` declares the Type and
`Features/Language/Interfaces-CoClasses.md#5` the CoClass. They compiled apart for as long
as nothing put them in one project, and the marking pass put them in one. `Type` and
`Structure` are in the set now.

**The lesson generalises:** a collision rule has to cover the names a sample can be made
ambiguous *by*, not only the ones two samples would duplicate.

**And it is still too narrow, in a way the editorial pass found.** `COLLIDES` reads a
fence's *outermost container* names, so `Module MESSAGETABLE` is what it records --- not the
`Enum EVENTS` inside it, and not that enum's members. twinBASIC puts enum members in project
scope whatever container declares them, so two pages whose hidden context each declared an
`EVENTS` enum landed in one batch and produced `TB5000 duplicate definition [EVENTS]` and
`TB5073 'status_changed' is ambiguous`. The fix taken was `projname=` on each page, which
buys an isolated project; tracking nested enum names in `COLLIDES` would be the general
version, at the cost of splitting batches for names that usually do not collide.

### `expect-error` has its first use

`Reference/Core/Option.md`'s module-level example exists to show that `Option Explicit`
makes an undeclared variable an error --- the sample is *supposed* not to compile, and its
own comment says so. It carries `expect-error=TB5079`.

The open question was whether to assert the code or only the failure. The code, because a
renumbering in a future BETA then fails the gate loudly and somebody updates it, which is
the better failure mode than a sample that quietly stops demonstrating anything.

### Measurement traps from this pass

- **`@($null).Count` is 1 in PowerShell.** A sweep counting `Select-String … | Measure-Object`
  results reported the hidden fence reaching all three built trees. It was not; `@()` around
  a null yields a one-element array. `grep -c` said 0 and was right. **Count with the tool
  whose empty result is empty.**
- **The shell ate the backslashes** in a regex passed through `node -e` from bash, turning
  `'...symbol .(.+?).'` into a pattern that matched one character --- and produced a
  plausible-looking table of single-letter "undeclared symbols" that was entirely an
  artifact. This is the heredoc trap in WIP.md's Don'ts arriving through `-e` instead. Write
  the script to a file.
- **A `--propose` pass and the gate disagree by construction**, and it is not a bug. The
  survey compiles every classifiable fence together, so a sample can resolve a neighbour's
  declaration; the gate compiles only marked ones, and the neighbour may not be among them.
  Two samples were caught this way after marking --- `WithEvents.md#1` needing a class
  `#2` declares, and `IVBPrint.md#3` needing `#2`'s. Both are `projname` groups now.
  **Always run the gate after `--apply`.**

### An Assert call needs both qualifiers

**A package's members are reached through its namespace symbol, exactly as `VB`'s are**,
so the form that compiles is `Assert.Exact.AreEqual`. The two prefixes are separate
requirements: `Assert.` is the package namespace, and the `Exact.` below it is there
because each module in the package carries `[MustBeQualified(True)]`. Every form is
verified rather than asserted:

| form | result |
|---|---|
| `Assert.Strict.IsTrue x > 0` | compiles |
| `Strict.IsTrue x > 0` | `TB5079 Unrecognized symbol 'Strict'` |
| `Assert.IsTrue x > 0` | `TB5027 Unrecognized member 'IsTrue' on type 'Assert'` |
| `IsTrue x > 0` | `TB5079 Unrecognized symbol 'IsTrue'` |

Five pages wrote the bare form at 66 sites and none of them compiled; 116 calls carry the
namespace now. **The root of it was one sentence** on the package index, which presented
`Assert.` as disambiguation needed only on a clash, and every page was written to it ---
so prefixing the calls without rewriting that sentence would have left a reader reading
the prefixes as optional noise. When a sample is wrong across a whole package, check
whether a sentence taught it.

**The harness could not have told you which way to fix it**, and that is the general shape:
it says a sample does not compile, and what the page should say instead is still a
judgement about the reader. Here the alternative was to prefix only the runnable fences and
leave the 45 `Syntax:` lines short under a stated convention --- rejected because a
`Syntax:` line is the first thing a reader copies, and a mixed convention cannot be checked
by grep.

## Settled since

- **Should `slot=class` exist?** Yes, and it is `class` + `method` --- the Module row of
  the slot table with a `Class` container. Inferred from `Me` and from `WithEvents`. But it
  buys 5 on its own; `inherits=` is the part that pays.
- **Is `expect-error`'s number stable enough to assert?** Assert it. A renumbering fails
  the gate loudly, which beats a sample that quietly stops demonstrating anything.
- **The stage set wants sharing rather than copying.** Done, two ways: `TEMPLATE_BASE`
  makes a template a delta over a base, and `hidden` lets a page keep context that was only
  ever specific to it.

## Open questions

- Where does compile time stop being flat in fence count? 120 per project is the current
  default and 275 worked; the measured evidence does not say where the knee is.
- `check_run` needs the dispatcher design above, plus the `MsgBox` screen, plus a decision
  about what a sample's *output* is compared against. A sample that prints is a sample whose
  printed value the page probably states, and that is the check worth having. Deliberately
  not started --- see [What is left](#what-is-left-179-samples-and-no-lever) for why the
  editorial pass comes first.
- A `projname` is global, so two pages choosing `demo` would merge without saying so. Scoping
  it to the page would prevent that and would also prevent a group spanning pages, which a
  multi-page tutorial wants. Left global and documented; revisit if a collision happens.
- **Should the remaining single-page stage entries move into `hidden` fences?** About a
  dozen control instances are used by exactly one page --- `picCanvas`, `hsbVolume`,
  `mfPanels`, `lblCoords`. They are one line each in a list whose stated purpose is
  precisely "the control instances the samples assume", so they were left. The invented
  *classes* moved, because a class is not a control instance and a page is where it
  belongs. The line between the two is a judgement, not a rule.
## The editorial pass: 826 to 931

The survey said no unmarked sample compiled, so every one of these came from changing a
page. Five moves did the work, and the order matters --- the cheap mechanical ones first,
because each makes the next survey's report shorter:

| move | what it is |
|---|---|
| **declare the local** | `Dim I As Long` in a VBA-derived loop, `Dim obj As Object` above the reference the sample tests. A reader would write it; the VBA original left it implicit |
| **`hidden` fence** | for what a reader has *elsewhere* in their program --- a helper procedure, a module-level flag, the class the page's prose asks them to insert |
| **stage entry** | for a control instance. 50 added this pass, and they are the biggest single lever in it |
| **put the statements in a `Sub`** | a fence mixing a `Type` or `Enum` with executable code is not a module a reader can paste; wrapping the code is what they would actually write |
| **`projname`** | when a page's fences really are one program, which two of them turned out to be |

The rule that decides between the first two: **a local goes in the sample, and anything the
reader already has goes in a `hidden` fence.** A single-letter name in a hidden fence is the
shape to avoid --- nothing separates two pages that both declare a module-level `A`, because
`COLLIDES` tracks type names only.

**The stage set is where the volume was.** 45 undeclared names in the survey were VB control
instances, each on one or two pages --- `lblName`, `mnuFileSaveAs`, `optPlain`, `dlgOptions`,
`fraLeft`. Adding them to the two stage modules bought **22 samples in `Default/VB` alone**
for one file edit, against a tail where no single *name* was worth more than three. A flat
tail of names is not the same as a flat tail of *work*.

Four things this pass found that are not about any one page:

- **`Dim x As New Foo(args)` is not valid twinBASIC.** Constructor arguments need the
  expression form, `Set x = New Foo(args)`. Seven sites across three pages wrote the invalid
  form, and one of them was `twinBASIC-Additions.md`'s **Parameterised New** section --- the
  page that introduces the feature, illustrating it with a class whose constructor is
  internal to its package. That section now shows a class the reader defines, carries
  `[COMCreatable(False)]` because a class whose only constructor takes arguments cannot
  supply the parameterless one COM creation wants, and says in a NOTE that `As New` with
  arguments is a syntax error.
- **A generated `Class` wrapper needs `[COMCreatable(False)]` too**, for exactly that reason:
  tbIDE's `Host.md` sample declares `Public Sub New(ByVal Host As Host)` and failed with
  `TB5135`, which is a diagnostic about the wrapper rather than about the sample.
- **`Implements` and `Inherits` at fence top level mean class code-behind**, the same kind of
  language rule as `Me` and `WithEvents`, and are read that way now.
- **The elision the VBA-derived pages use is `. . .`, spaced.** The classifier knew only
  `...`, so three pages were proposed as markable and failed on *"Expected a symbol following
  the dot operator"* --- a diagnostic about a line that is not code at all.

**Two latent neighbour-dependencies surfaced, both by repacking rather than by editing.**
`Core/New.md` compiled only because some other page's fence declared a `Class Form1`, and
`Core/RaiseEvent.md`'s handler sample needed the `TimerState` its own page declares two
fences earlier. The first is a `hidden` fence now and the second a `projname` group. This is
the residual [A sample could pass on its neighbour's
declarations](#a-sample-could-pass-on-its-neighbours-declarations) states, biting twice in
one afternoon: **the gate is the detector, so run it after every `--apply`.**

## What is left: 179 samples, and no lever

Live against BETA 983, and reproducible: `--propose --json` writes the survey and
`--report <file>` groups it. **931 of 1,110 compile.**

Where it sits now: `Reference/Core` 27, `Default/VB` 24, `Built-In/CustomControls` 22,
`Features/Language` 21, `Attributes.md` 12, `WinServicesLib` 8, `Default/VBA` 8,
`Built-In/tbIDE` 6, `Tutorials/Arrays.md` 6.

**The tail was flat before this pass and is flatter now.** What remains is dominated by
fences that are not programs and were never going to be: syntax skeletons with
`<placeholder>` names (`Features/Language/Interfaces-CoClasses.md` writes
`Inherits base_interface`), property-assignment lines shown outside their `With`
(`WinServicesLib/ServiceManager.md` documents each property as `.Name = "..."`), and
continuation fences that deliberately reuse the previous fence's variables.

Three groups, unchanged in kind from the first survey:

- **`TB5182`** --- a genuine fragment: an elision, a signature with no body, or pseudo-code
  sitting in a `tb` fence. `VB/MDIForm/index.md` had one of the last kind, a
  menu-item-to-action table written with `=>`; it is four real handlers now, which both
  compiles and is what a reader would actually write. The rest want the same judgement, page
  by page.
- **The CustomControls `Framework/` pages**, about nine samples that are one method of a
  control class. **An `implements=` key cannot rescue them, and that is measured:**
  `Implements CustomControls.ICustomControl` with only `Initialize` supplied is
  `TB5000 Missing implementation of member Sub Destroy()` and the same for `Paint()`. A
  wrapper would have to synthesize stubs for every other member of an interface whose shape
  the tool does not know. Nor can a `hidden` fence help --- the class has to be one
  compilation unit, and a hidden fence is a separate one. The fix is editorial: show the
  enclosing class, which these pages' own prose already half-describes ("custom controls
  store the **CustomControlContext** in a private field, typically called
  **ControlContext**").
- **One-off helper procedures a sample calls** --- `ProcessMessage`, `Sleep`,
  `InitializeDefaultValues`. These *are* `hidden`-fence work, and cheap. Most of them were
  done in the editorial pass; `InitializeDefaultValues` is left because it belongs to the
  CustomControls `Framework/` group above.

One page deserves its own line, because its shape recurs in tutorials.
`Tutorials/Arrays.md` presents two implementations of the same helper --- a naive `ArrayLen`
and a better one --- and a later fence calls it: `TB5073 'ArrayLen' is ambiguous. Could be:
tbx_7bd542b06b.ArrayLen / tbx_3dc70092ea.ArrayLen`. A `projname` group cannot fix this,
because grouping puts the two definitions in *one* project rather than keeping them apart,
and `COLLIDES` does not track procedure names. The page also calls `SaveLongData` while
declaring `SaveData`, which is a defect in the page rather than in the harness.

**`check_run` waits for this work rather than the other way round.** No fence in `docs/`
carries the marker, so it gates nothing today; and its open question --- what a sample's
printed output is compared against --- is answered by pages that state a printed value, which
is what the editorial pass produces. Building the dispatcher first would be building for
candidates that do not exist yet.

## What is in the `tb` fences, and why opt-in

Moved here from [WIP.md](WIP.md), which keeps the invocation and the two
harness lessons under [Compiling the reference's own code
samples](WIP.md#compiling-the-references-own-code-samples). This is the census
that decided the design, printed by `--census`.

The census of what is in the fences, which `--census` prints and which decided the design
--- 1,134 `tb` blocks across 603 pages:

| shape | count | share | wrapper |
|---|---:|---:|---|
| whole `Class` / `Module` / `Interface` | 67 | 5.9% | none --- its own `.twin` |
| procedures and module-level declarations | 370 | 32.6% | a generated `Module` |
| loose statements | 607 | 53.5% | a generated `Module` and `Private Sub` |
| class code-behind --- declarations | 54 | 4.8% | a generated `Class` |
| class code-behind --- loose statements | 12 | 1.1% | a generated `Class` and `Private Sub` |
| fragment --- no wrapper rescues it | 24 | 2.1% | --- |

The two Class rows are inferred from `Me` and from a top-level `WithEvents`, neither of
which a standard module may contain; a sample reaching a member of the thing it is
code-behind *of* also needs `inherits=` to say which class that is. A `hidden` fence
carries a page's own context and is rendered to nothing.

**Two earlier censuses in this file disagreed with that and with each other** (36 / 357 /
457 / 250, then 103 / 349 / 22 / 621), and the fragment row is where they differed most.
Nearly all of the difference was classifier gaps rather than corpus facts: an `Interface`
body holds prototypes with no `End Sub`, a twinBASIC `Type` may hold procedures *and* a
field called `Type As Long`, and `Overridable` is a modifier. Those are probes now, and the
table above comes from a script rather than from prose.

**Opt-in is right, but not for the reason first given.** It is not that the corpus resists
classification --- 98% of it classifies. It is that when this was decided **54% compiled and
46% did not**, and the 46% was overwhelmingly samples that are correct as documentation and
incomplete as programs: a `With MyLabel` block with no `MyLabel`, a handler for a class the
page does not define. Marking those would be wrong, and opting them out one by one would be a
list of five hundred exceptions nobody maintains. Two passes of harness work and page edits
have since taken the compiling share to **84% of the classifiable corpus**, which changes the
size of the argument and not its shape --- see
[What is left](#what-is-left-277-samples-and-no-lever).
