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

**381 samples are marked today** --- everything in `Reference/Core/` and
`Reference/Default/VBA/` that compiles --- and the gate over them takes ~17 s. 586 of the
1,095 classifiable fences in the corpus would pass; the rest are the follow-up work, and
[what the first full run found](#what-the-first-full-run-found) says what is in the way.

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
reproducible number rather than three prose ones. Against 1,116 `tb` fences in 603 pages:

| shape | count | share | what is generated around it |
|---|---:|---:|---|
| whole `Class` / `Module` / `Interface` | 58 | 5.2% | nothing --- it becomes its own `.twin` |
| procedures and module-level declarations | 403 | 36.1% | a `Module tbx_<hash>` |
| loose statements | 634 | 56.8% | a `Module` and a `Private Sub` in it |
| fragment --- no wrapper rescues it | 21 | 1.9% | --- |

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
corpus is unclassifiable --- 98% of it is. It is that **54% compiles and 46% does not**, and
the 46% is overwhelmingly samples that are correct as documentation and incomplete as
programs: a `With MyLabel` block with no `MyLabel`, a handler for a class the page does not
define. Marking those would be wrong, and opting them out one by one would be a list of five
hundred exceptions.

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
| `slot=` | `file`, `module` or `sub` --- what to generate around it | inferred |
| `project=` | which template project to build into | inferred from the page's path |
| `id=` | stable name for reporting | `<page>#<ordinal>` |
| `expect-error=` | the sample is *meant* not to compile; assert this error | --- |

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
including packing. The 381 marked samples today take ~17 s; the full 1,095-fence survey
takes 30 s.

**Fill the lanes, not the batches.** Filling each batch to `--batch` before opening another
put 120, 55, 4 and 3 samples on four lanes --- and a run takes as long as its biggest batch.
The batcher sizes to `ceil(total / jobs)` instead. On the VBA reference that was 28 s → 10.7
s for the same result.

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

### The Assert package documentation does not compile, and that is not the tool's fault

Every Assert page writes `Exact.AreEqual`, `Strict.AreEqual`, `Permissive.AreEqual`
unqualified --- 50 sites in the reference plus the tutorial --- and that raises
`TB5079 Unrecognized symbol 'Strict'`. `Assert.Strict.AreEqual` compiles.

**Left alone deliberately, for now.** What is measured:

- the probe project *did* reference the package, by id, version and `symbolId`, composed
  from the package's own `Settings`;
- with that reference, `Assert.Strict.AreEqual 1, 1` compiles and `Strict.AreEqual 1, 1`
  does not, in the same project, in the same build;
- setting the reference's `symbolId` to the empty string does not make the bare form
  resolve;
- each module in the package carries `[MustBeQualified(True)]`, which is what makes the
  `Strict.` prefix necessary --- the question is only whether the `Assert.` above it is too.

**What has not been tested** is what the IDE's own package manager writes into
`project.references` when a person adds the package through it. If that differs from the
hand-composed entry in a way that changes symbol resolution, the pages are right and this
finding is a harness artifact. That is the one thing to check before touching 50 sites.

## Open questions

- Should `slot=class` exist? See above --- 27 samples say yes, and nothing says no.
- Where does compile time stop being flat in fence count? 120 per project is the current
  default and 275 worked; the measured evidence does not say where the knee is.
- Is `expect-error`'s error number stable across BETA builds, or should it assert only
  *that* compilation failed? Nothing uses the key yet.
- `check_run` needs the dispatcher design above, plus the `MsgBox` screen, plus a decision
  about what a sample's *output* is compared against. A sample that prints is a sample whose
  printed value the page probably states, and that is the check worth having.
- The stage set is a per-template file today. When a third template appears, the shared half
  wants to be shared rather than copied.
