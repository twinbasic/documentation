# Compiling the Documentation's Code Samples — Design Notes

See [WIP.md](WIP.md) for the maintenance guide. This file designs the tool that answers
*does this sample actually build*, which nothing currently asks.

**Status: design. Nothing here is implemented.** Measurements are marked as measured;
everything else is a decision or an open question.

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

- **Cost.** An IDE cold start is 8–11 s per project and flat in project size (WIP.md,
  measured). A normal `build.bat` is ~4 s. One probe project would triple it.
- **`npm install` must remain sufficient** to build the docs. A twinBASIC install is not on
  that path, and `dot.mjs`'s setup-failure behaviour exists to preserve exactly that.
- **CI cannot run it.** The harness needs Windows, a private desktop, and a CDP-reachable
  WebView2. None of that exists on the CI box.

So this is a **separate on-demand tool** — `examples.bat` over `scripts/check_examples.mjs`
— never invoked from `build.bat`, `check.bat`, `test.bat`, or either CI workflow. A sample
regression is caught when someone runs it, which is the same deal `sweep_a11y.mjs` (~20 min,
full site) already makes.

## Opt-in, because the corpus says so

A census of the 1,097 `tb` fences, classified by top-level shape:

| shape | count | share | wrapper needed |
|---|---:|---:|---|
| whole `Class` / `Module` | 103 | 9.4% | none — drop in as its own file |
| whole procedure | 349 | 31.8% | a generated `Module` |
| declarations only | 22 | 2.0% | a generated module's declaration section |
| loose statements | 621 | 56.6% | a generated `Private Sub` |
| empty | 2 | 0.2% | — |

**This disagrees with the census in WIP.md**, which reported 36 / 357 / 457 / 250. The
`procedure` figures agree closely (349 against 357), which suggests the difference is in how
the other three were split rather than in the extraction. The consequence is load-bearing:
WIP.md's taxonomy implies the second-largest bucket wants a *module declaration section*,
and the re-run says the largest bucket by far — 57% — is loose statements wanting a **`Sub`
body**. A generator built to the old numbers picks the wrong wrapper for most of the corpus.

Neither census can tell a wrappable statement sequence from a true fragment (an `If` with an
elision, a snippet containing `...`). WIP.md put those at 250; they are distributed through
the `statements` row above.

That is the argument for **opt-in**. A gate demanding every fence compile needs ~250 opt-outs
on day one, and a list of 250 exceptions is a list nobody maintains. Mark the fences that
claim to be complete and leave the rest alone — which makes the marker the thing to get
right, not the harness.

## The markup

**In the fence info string.** `builder/render.mjs:393` is why:

```js
const lang = tok.info ? tok.info.trim().split(/\s+/)[0] : "";
```

The fence renderer takes the first whitespace-separated token as the language and discards
the rest, so anything after `tb` is already invisible. Verified against the real pipeline
(`createMarkdownIt` + `initHighlighter`, not a bare markdown-it — the distinction WIP.md's
[Source dashes](WIP.md#source-dashes) section was burned by):

| property | result |
|---|---|
| marked fence renders byte-identical HTML to a plain one | **true** |
| `maskCodeRegions` still hides the body | **true** |
| mask round-trips the marked fence | **true** |
| `applyPreRenderRewrites` leaves it byte-identical | **true** |

So the markup costs nothing at render time, cannot reach the HTML, and cannot perturb
`check_code_regions.mjs`, which compares fence *contents* and never sees the info string.

Shape — space-separated `key=value` pairs and bare flags after the language token:

    ```tb project=office-late slot=procedure id=getobject-1 run

**No backticks in it.** CommonMark forbids them in a backtick fence's info string, and
`maskCodeRegions` skips such a fence outright (`render.mjs:1697`).

| key | meaning | default |
|---|---|---|
| `project` | which template project to build into | `console` |
| `slot` | where the code goes | inferred |
| `id` | stable name for reporting and pinning | derived from file + ordinal |
| `run` | execute and capture Debug output, not merely compile | compile only |
| `expect-error` | the sample is *meant* not to compile; assert this error | — |

**`slot` is inferred by default** by the classifier above, stated only when inference is
wrong. A misinference is self-reporting — it produces a compile error rather than a silent
pass — but the reporter must name the inferred slot in any error, or the author is left
debugging code that is correct.

`expect-error` exists because the docs legitimately show code that does not compile, in order
to say why. Without it those pages could never carry a marker.

## Template projects

Version-controlled exported trees under `test/example-projects/<name>/` — a `Settings` file
plus `Sources/`, exactly what `twinBASIC_win32.exe export` produces and what `tbrun` already
consumes.

| template | extra references | for |
|---|---|---|
| `console` | as shipped (stdole + VB package) | the large majority |
| `office-late` | none | `CreateObject` / `GetObject` Office examples |
| `office-early` | Excel + Word type libraries | early-bound `Excel.Application` |
| `forms` | VB Forms package + a blank form | control and event examples |
| `win32` | stdole only | `Declare` / API examples |

`project.references` in `Settings` is a plain JSON array, so a template is made by appending
an entry. No IDE needed:

```json
{
  "id": "{00020813-0000-0000-C000-000000000046}",
  "name": "Microsoft Excel 16.0 Object Library",
  "path32": "C:\\Program Files\\Microsoft Office\\Root\\Office16\\EXCEL.EXE",
  "path64": "C:\\Program Files\\Microsoft Office\\Root\\Office16\\EXCEL.EXE",
  "symbolId": "Excel", "versionMajor": 1, "versionMinor": 9, "lcid": 0
}
```

**Measured, on 64-bit Office 16 with no `win32` typelib registered at all.** The default
build is 32-bit (`Len(CLngPtr(0))` = 4), and both binding styles reach Excel from it:

| probe | result |
|---|---|
| `CreateObject("Excel.Application")`, no reference | `TypeName` = `Application`, `Version` = `16.0`, clean `Quit` |
| `New Excel.Application` with the reference above | same, plus `Excel.Worksheet` resolves and a real `Range("A1")` round-trip |
| `Dim X As New Excel.Worksheet` | compiles, then **raises `0x80004002` E_NOINTERFACE** on first use |

So **`office-early` does not need pinning to x64**, which was the initial assumption and was
wrong.

Note carefully what this does *not* show. `Excel.Application` is an out-of-process
`LocalServer32`, so Windows marshals across the bitness boundary natively. It says nothing
about twinBASIC's own 32/64 bridge — a 64-bit host process plus IPC — which is what matters
for **in-process**, 64-bit-only DLLs, the case VB6 genuinely cannot do. A template needing
one of those has to be measured separately.

**`New Excel.Worksheet` does not work, and the declaration compiling proves nothing.**
`Worksheet` is a non-creatable *interface*, not a coclass. Measured in the IDE debugger with
the Excel reference present: the `Dim a As New Excel.Worksheet` line raises nothing, and then
both `a.Name` (which forces `As New`'s deferred instantiation) and an explicit
`Set b = New Excel.Worksheet` raise **-2147467262 / 0x80004002, “No such interface
supported”**.

This matters editorially, because the tempting minimal fix for the five `Core/` pages is to
qualify the existing line as `Excel.Worksheet` and add a reference — which would preserve
VBA-Docs' original nonsense in a form that merely type-checks. The honest ports are
`Excel.Application`, which *is* a creatable coclass, or reaching a worksheet through the
object model the way real code does:

```tb
Dim app As New Excel.Application
Dim wb As Excel.Workbook: Set wb = app.Workbooks.Add()
Dim ws As Excel.Worksheet: Set ws = wb.Worksheets(1)
```

That path is measured working end to end — `TypeName(ws)` = `Worksheet`, with a real
`Range("A1")` round-trip — from the default 32-bit build against 64-bit Office.

## Batching, which is the whole cost question

One project per fence is unaffordable: 1,097 fences at ~10 s is over three hours serially.
What makes it tractable is the measurement that **IDE cost is flat in project size** (WIP.md:
a one-file project and a 32-probe project both land at ~10 s, because what is paid for is IDE
startup, not compilation).

So pack many fences into one project. At ~100 per project that is ~11 projects: roughly two
minutes serially, well under a minute at concurrency 8.

Collision rules, all forced by putting unrelated samples in one compilation unit:

- **One generated `Module tbx_<hash>` per fence.** The hash covers source path plus fence
  ordinal, so it is stable across runs and traceable without a lookup table.
- **Everything generated is `Private`.** Two samples both declaring `MyString` must not see
  each other.
- **`Sub Main` comes from the template, never from a fence.** A `module`-slot fence bringing
  its own `Main` needs renaming on the way in.
- **A generated module must not share a name with the project.** `project.name = "ProbeWS"`
  beside `Module ProbeWS` makes `[RunAfterBuild]`'s `ProbeWS.ProbeWS.Probe` ambiguous, and
  the IDE refuses it with *"'ProbeWS' is ambiguous. Could be: [Module] ProbeWS.ProbeWS /
  [Library] ProbeWS"*. Cost three probes that looked like hangs before the cause was seen,
  because the error arrives at *execution* time and not at build time — `tbbuild` reports
  zero errors and the run simply produces nothing. The `tbx_<hash>` scheme avoids it by
  construction, but the template's `project.name` is the other half and has to be checked.
- **`[RunAfterBuild]` is exclusive.** Whether twinBASIC accepts more than one is untested;
  assume not, so `run` fences get their own project, or one generated dispatcher calls each
  in turn.

Two things a batch runner must do that a single-fence runner need not:

- **Keep a source map.** Errors return against generated file and line; the report has to
  name the `.md` file, the fence, and the line within it. Emitted while generating, not
  reconstructed afterwards.
- **Bisect on a compiler crash.** twinBASIC runs the compiler in-process with user code, so a
  bad probe can take it down (WIP.md; `tbbuild` exits 4 for it) — and in a batch that loses
  all hundred fences with it. On crash, split and recurse: O(log n) extra builds, paid only
  on failure.

## Traps already paid for

Each cost a run during the probing that produced this file, or is recorded in `tbrun.mjs`
from earlier work.

- **`project.buildPath` must be an explicit file.** The default `${SourcePath}\Build\...`
  template opens a native Save dialog, which on the private desktop is invisible and
  unreachable, so the build silently never happens — and the WebView2 renderer stays
  responsive throughout, so every health check says the IDE is fine.
- **`MsgBox` hangs a run-mode probe, invisibly.** The HelloWorld template's `Main` is a
  `MsgBox` and had to come out before probing. Run-mode fences must be screened for `MsgBox`
  / `InputBox` and refused, not discovered at the timeout.
- **`tbrun` could not run concurrently, though WIP.md said it could — now fixed.** It staged
  into a fixed `%TEMP%\tbrun\src` with a fixed `tbrun-probe.exe`, so a second invocation
  `rmSync`d the first one's tree (reproduced: `EPERM` on a path the failing script had never
  touched). Worse, shutdown was `taskkill /F /T /IM twinBASIC.exe` — machine-wide, so it ended
  every concurrent run's IDE *and* the one the user had open. The workspace and `project.id`
  are now keyed to `--port`, and `tbbuild` reports the IDE pid (`ide-pid:` in text, `idePid`
  in `--json`) so the kill is by pid tree. Verified: two runs at once, 25 s wall, each
  capturing its own output.
- **A probe's quiet period must outlast what it waits on.** The default 2500 ms expires while
  Excel is still starting, and the run reports success having captured nothing. Anything
  driving an out-of-process server needs a much longer `--quiet`. **A post-build error can
  land after the window closes too**: the ambiguity error above surfaced 17.5 s after
  `[BUILD] Executing`, roughly 6 s past a `--quiet 12000` capture, so the console the harness
  read was silent while the console the IDE ended up holding named the fault outright. When a
  probe comes back empty, re-read the live console (`--keep`, then CDP) before concluding it
  hung.
- **`export` needs the output folder to exist** (one level only), and stdin redirected
  (`</dev/null`) when looping, or the executable eats the loop's input.
- **Paths handed to the compiler must be pure Windows.** It prefixes `\\?\`, which does not
  accept forward slashes: a `C:\Users\x/Desktop/...` mix fails with `input twinproj file
  does not exist`.
- **Office examples leak one process per run, and it is not self-limiting.** Three things
  were measured, and each removes a reason to shrug at it. Each `CreateObject` starts a
  *separate* `EXCEL.EXE` — 0, 1, 2 across two activations — so a batch of a hundred Office
  fences leaves a hundred processes rather than reusing one. Calling `Quit` is **not**
  sufficient: the process exits only once every COM reference is released, and two instances
  survived an explicit `Quit()` in the same session that issued it. And they sit on the
  **user's real desktop**, not `tbbuild`'s private one — `EnumWindows` from the default
  desktop finds their `XLMAIN` windows — so they are hidden only because `Visible` is
  `False`, and a fence that sets it `True` puts Excel on the user's screen mid-run.
  `tbrun` now harvests them (see the reaper note below); the batch runner inherits that, but
  must pass `--no-reap` while running concurrently and sweep once at the end.
- **The reaper cannot be a tree kill, and has to be conservative.** A DCOM-activated server's
  parent is `svchost.exe` — itself a child of `services.exe`, started at boot — so there is
  no ancestry from the probe to the server at all, and a before/after snapshot diff is the
  only instrument available. `tbrun` kills only what is new, on an image allowlist, *and*
  windowless; anything new and on the list but windowed is reported and spared, because that
  is indistinguishable from a copy the user opened. Verified both directions with a timed
  injection: a process started mid-run was reaped, one present beforehand was not.
- **DCOM does not reclaim it on a timer, and that is the first thing anyone will ask.**
  COM's ping protocol — 2-minute pings, three missed pings and the reference is collected —
  is for *remote* object references. A same-machine client has no ping GC: release depends
  on the LRPC channel teardown being noticed and on the server choosing to exit at refcount
  zero, and Excel does not. Measured directly: a `CreateObject` holder was force-killed with
  no other client anywhere, and its `EXCEL.EXE` was **still running 563 s later** — past the
  2-minute interval and past the 6-minute collection deadline, invisible and idle the whole
  time. A job object is no answer either: `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` reaches
  descendants, and the server is not one. So there is no native mechanism that does this,
  which is why the snapshot diff exists rather than being a shortcut around one.
  Probes should still `Quit` and release their references — the reaper is the backstop for
  the ones that throw or get killed, not a licence to skip cleanup.

## Open questions

- Does twinBASIC accept more than one `[RunAfterBuild]` per project? Decides whether `run`
  fences batch at all.
- Where does compile time stop being flat in fence count? 100 per project is a guess; the
  measured evidence covers 32.
- Should slot inference run in the checker, or be precomputed into the markup by a one-off
  pass? Explicit markup is greppable and reviewable; inferred markup is shorter and cannot
  rot.
- Is `expect-error`'s error number stable across BETA builds, or should it assert only *that*
  compilation failed?
- How should a fence needing a specific package (CEF, WebView2, WinNativeCommonCtls) select
  it — a template per package, or a `needs=` key that composes references?
- Does `Dim X As New Excel.Worksheet` raise on touch, as expected? Settles the editorial
  question for the five `Core/` pages.
