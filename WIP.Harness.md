# twinBASIC Documentation --- The Compiler Harness

How the twinBASIC compiler is reached without a person driving the IDE: getting
at the package sources, censusing what they contain, compiling a probe,
capturing what one prints, and testing an IDE add-in. Split out of
[WIP.md](WIP.md), which keeps the invocations and the operational rules under
[Driving the twinBASIC compiler](WIP.md#driving-the-twinbasic-compiler) --- this
file is why they are what they are.

Read it before changing `scripts/tbbuild.mjs`, `scripts/tbrun.mjs`,
`scripts/addin_test.mjs`, `scripts/lib/tb-ide.mjs`, `scripts/lib/tb-cdp.mjs`,
`scripts/lib/tb-launch.ps1`, `scripts/lib/tb-registry.mjs`,
`scripts/lib/tb-ide-copy.mjs`, `scripts/lib/tb-project.mjs`,
`scripts/lib/tb-addin.mjs`, `scripts/lib/tb-operate.mjs`, `scripts/lib/tb-lane.mjs`,
anything under `test/addin/`, or `scripts/census_attributes.mjs`, and before
concluding anything about twinBASIC syntax from a sweep of exported sources.

## Getting at the `.twin` sources

"Read the package's `.twin` sources" is the rule everywhere below, and the sources are not
in this repository. They are inside the `.twinproj` files an IDE install ships, and the
compiler's `export` verb unpacks any of them without opening the IDE:

```sh
"$TB/bin/twinBASIC_win32.exe" export "<some>.twinproj" "C:\out\dir\" --overwrite
```

Against BETA 983 that yields **820 `.twin` files** --- 661 from the sixteen packages under
`packages/`, 159 from the thirty-two sample and template projects under `projects/` and
`addins/`. All of it is code the compiler accepts, which makes it the strongest available
evidence for anything the documentation asserts about legal syntax.

Two operational notes, both learned the annoying way. **Use backslashes.** A folder named
with forward slashes fails with `output folder does not exist and could not be created`
whether it exists or not. This note used to say that the folder must already exist and that
only one level of it is created; measured against BETA 983, `export` given backslashes
creates every missing level, three deep in the test. Its project path must also be a full
one, because it is prefixed with `\\?\`. And **redirect stdin** when looping (`</dev/null`),
or the executable consumes the loop's input and the second iteration never runs.

The samples matter as much as the packages: several constructs appear in exactly one sample
and nowhere else. `[PopulateFrom]`'s only real use in the whole corpus is in Sample 22, and
the only prose anywhere explaining `[WithDispatchForwarding]` is a comment in Sample 5.

> **A census of `[Name` at the start of a line over-reports.** twinBASIC spells an escaped
> identifier the same way --- `[_HiddenModule].vbaObjAddref(…)`, `[_MAX] = 0` --- so an
> expression can read as an attribute. What separates them is the tail after the closing
> bracket: an attribute is followed by a declaration, an escaped identifier by `.`, `=` or
> `(`. Argument text needs stripping too, or `[Description("Sets or returns, given …")]`
> contributes an attribute named `given`.

**A worked instance, because it caught a documentation regression.** Round 6's fix pass
unified two reference pages on bare form handlers, on the strength of two other pages that
write them that way. One `export` settles it --- every form code-behind in the shipped
samples is:

```
[Description("")]
[FormDesignerId("EAEAEAEA-EAEA-EAEA-EAEA-EAEAEAEAEA02")]
[PredeclaredId]
Class ChildBlue
    Private Sub Cascade_Click()
    ...
End Class
```

So a form's `.twin` file **is** a `Class` with designer attributes, the pages that wrapped
their samples were right, and the bare-handler pages are showing excerpts. `Form_Load` is
what the samples use; `UserForm_Initialize` appears in none of them. Two commands, two
minutes, against a question that four documentation pages could not settle between them
--- and the export is the only thing that can, because the pages are the thing in doubt.

## Censusing every attribute at once

[scripts/census_attributes.mjs](scripts/census_attributes.mjs) does the export above for
every package of the current install and reports, per attribute, **which enclosing
construct and which kind of declaration it decorates**. No arguments needed; it finds the
newest `twinBASIC_IDE_BETA_*` the same way `tbbuild` does, caches the export by build
number, and re-uses it.

```sh
node scripts/census_attributes.mjs --out census.md
node scripts/census_attributes.mjs --attr Hidden          # one attribute
node scripts/census_attributes.mjs --attr Hidden --dump-sites sites.json
```

Against BETA 983: **661 files, 9,701 attribute sites, 55 distinct attributes**, and every
one of the 55 is already in `Attributes.md` --- the "used but undocumented" section comes
back empty. Sixteen documented attributes are used by no package, which is not a defect
but does mean the census offers no evidence for those `Applicable to:` lines and a probe
is the only check available.

The figures first recorded here, 619 files and 9,673 sites, did not reproduce on a complete
export of all sixteen packages, and the cache they came from no longer exists to say why.
One way to undercount like that is now closed: until the census tested for `... DONE` it
trusted `export`'s exit code, which is 0 on failure, and scanned a partial export as though
it had finished --- see the path-length entry in [BUGS-TO-REPORT.md](BUGS-TO-REPORT.md).

**A census is evidence, not applicability, and the two disagree in both directions.** The
corpus contains no use of `[Hidden]` on a whole `Class`, yet the compiler accepts one; it
contains plenty on Class and Interface *members*, and the compiler refuses the same
attribute on the `Interface` lines inside a `CoClass` (TB5155). Neither fact is reachable
from the other tool. `gen_attribute_probes.mjs` records the converse trap under
`[RedirectToStaticImplementation]`, where a census grouped by *declaration keyword* said
"a Property Get, a Function and a Sub", the entry went out saying "procedure in a Class",
and the probe returned TB5155 because all 82 uses are inside an Interface. Grouping by
enclosing construct is the whole point.

**Seven ways a sweep of this corpus gets a wrong answer**, each measured rather than
imagined, and each now a comment in the file:

- A **line matcher misses 292 of 7,604 attribute lines (3.8%)**, because
  `[Description("..." & vbCrLf & _` closes several lines later. Silently, so the count
  still looks plausible.
- An attribute list is **comma-separated** --- `[DispId(126), Hidden]` --- and DAO.twin
  writes most of its `Hidden` uses that way.
- **Argument text has to go before the comma split**, or `[Description("Returns an array
  of child controls, given the container")]` contributes an attribute named `given`.
- An **escaped identifier is spelled like an attribute**: `[_HiddenModule].Foo`,
  `[_MAX] = 0`. The tail after the `]` is what separates them. An Enum member may *be*
  one --- `Report.twin` declares `[ ]`, `[A4 Portrait]`, `[Letter Landscape]` as member
  names.
- **A comment can sit anywhere**: inline `/* voffset &H00A8*/ Property Get X()` before a
  declaration (DAO.twin), a trailing `' NOTE: ...` after a `]`, a whole `'` line *between*
  two attribute groups (VBA/Strings.twin), or a `#If` between an attribute and what it
  decorates (DTPicker.twin). Each one cost sites until it was handled; the comment-between-
  groups case alone accounted for 142.
- **The block stack is where silent misattribution lives.** Four UDTs declare a field
  called `Type As Long`, which reads as an opener that never closes and swallows the rest
  of the file --- one put 368 `Declare`s inside a phantom `Type`. `Module [_HiddenModule]`
  names its block with an escaped identifier, so a bare-identifier pattern missed the open
  and its `End Module` 1,277 lines later popped somebody else's block. `NotDispatchable`
  is a modifier, and a modifier the list does not know has the same effect. An
  `Interface X` line inside a `CoClass` is a **member reference with no body**, and pushed
  as a block it ate the `End CoClass` after it --- 31 files.
- **Do not assume a row is impossible.** `Type / DeclareWide` looked like proof of a stack
  fault and is a real construct: `CustomControls.twin`'s `Type SerializeInfo` has a dozen
  `DeclareWide` members.

Anything it cannot resolve is **reported, never bucketed** --- a census that hides its own
confusion publishes a wrong number with nothing to notice it by. The bar is that the
report's unresolved count is **0**, which it currently is; a non-zero one is a scanner bug,
not a corpus oddity.

## Compiling a twinBASIC project without the IDE in front of you

Exported sources say what the compiler *accepts today*; they cannot answer a question no
shipped source happens to demonstrate. For those, something has to put the construct in
front of the compiler --- and until BETA 983 that meant a person opening the IDE, building,
and reading the DIAGNOSTICS pane by eye.

[scripts/tbbuild.mjs](scripts/tbbuild.mjs) does it unattended. Nothing appears on screen,
exit code 1 if the project has errors:

```sh
node scripts/tbbuild.mjs C:/probe/AttributeExplore.twinproj
```

It finds the IDE itself --- the newest `twinBASIC_IDE_BETA_<n>` on
`%USERPROFILE%/Desktop`, which is where the IDE's zip says to unpack it. `--ide` or `TB_IDE`
override that, and one of the two is needed for an install kept anywhere else. **No install
path is hardcoded**, here or anywhere in the tooling: an install path contains a username.

`--json` gives the same thing as one object and `--keep` leaves the IDE running. Exit codes
are 0 clean, 1 the project has errors, 2 the harness failed, 3 the compile never settled, 4
the project crashes the compiler.

**`--show` / `--hide`, and `TBBUILD_SHOW` for a whole session.** Hidden is the default, and
it has a real cost that only shows up when something goes wrong: a wedged IDE on a private
desktop is invisible to the person debugging it. That happened during the reuse experiment
below --- an IDE whose renderer was blocked, with no window either of us could look at, and
the only way to see anything was to re-run it visible. So `export TBBUILD_SHOW=1` while you
are working interactively and leave it unset for unattended runs; `--show` and `--hide`
override it per invocation.

**How it works, in one line:** the IDE's user interface is a WebView2 page, WebView2 honours
`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`, so the IDE starts with a Chrome DevTools port and is
driven over CDP. The diagnostics come from the IDE's own *copy compilation error report*
walk, minus the clipboard write, so the text is exactly what that command would hand a human.
The CDP client is [scripts/lib/tb-cdp.mjs](scripts/lib/tb-cdp.mjs) --- raw rather than
puppeteer, because a pending `alert()` blocks the renderer and puppeteer's `connect()`
handshake talks to the renderer, so it hangs on precisely the state you need to recover from.

**The mechanics are one library, [scripts/lib/tb-ide.mjs](scripts/lib/tb-ide.mjs)**:
starting the IDE, attaching, waiting for the compile, reading the diagnostics and the DEBUG
CONSOLE, clicking, building, and ending the process tree. `tbbuild` and `tbrun` are command lines
around it, and the add-in harness planned in [WIP.HelpAddin.md](WIP.HelpAddin.md) is built
on it. Moving the code there was checked against 14 fixture cases run before and after ---
every exit code and every line of output the same, apart from the two fixes below --- and
against a full `examples.bat` run.

Two bugs came out of the move, and neither had been noticed:

- **A relative project path never loaded.** The IDE is given the resolved path and echoes
  it back, and the wait loop compared that echo with the argument as typed, so
  `tbbuild clean.twinproj` waited out its whole timeout and exited 3, "the IDE never
  reported clean.twinproj as open". Every caller passed an absolute path, which is why
  nothing noticed. The comparison now resolves first.
- **`tbrun --ide` could pack with one install and build with another.** It ran `tbbuild` as
  a child process without passing `--ide` on, so the build found its own IDE. It also
  printed that child's `ide-pid:` line in its compile-error output, naming an IDE it had
  already killed. `tbrun` now calls the library directly.

**Do not reach for `--buildAndExit32` instead.** It exists, it is real (`parseCommandLine()`
reads it, and Personal Edition is refused by name), and it is useless unattended: **nothing
is written to stdout or stderr, ever**, it exits 0 on a project the IDE flags, and when the
build genuinely fails it does not exit at all --- it sits on a "Please wait…" dialog at 100%
forever. Silent, falsely green, and hanging on the one case worth catching. Measured all
three ways.

**It runs the IDE on a private Windows desktop, and that is not decoration.** A build tool
that seizes the keyboard mid-sentence is a build tool nobody runs while working. No window
style prevents it: the IDE calls `HostForceFocus()` from its own `window.onload`, so
`start /min` was tried and the window still came to the front. A process on another desktop
has no foreground to take, and the compile does not care whether anything is on screen ---
verified by reading the same diagnostics off an IDE nobody could see.

That is the one piece of the harness that cannot be JavaScript, because it is
`CreateDesktop` plus `CreateProcess` with `STARTUPINFO.lpDesktop` --- and, since the IDE
started running inside a job, the job object calls ([The IDE runs inside a
job](#the-ide-runs-inside-a-job)) --- and Node has no FFI without a native addon.
[scripts/lib/tb-launch.ps1](scripts/lib/tb-launch.ps1) holds those calls. It is **not run
as a file**: `tb-ide.mjs` reads the text and passes it through
`-EncodedCommand`, so the default execution policy --- which refuses `.ps1` files on this
machine, and which is the same policy [BOOKPLAN.md](BOOKPLAN.md) records blocking `npx.ps1`
--- never comes into it, and no `-ExecutionPolicy Bypass` has to be recommended to anyone.
Its inputs arrive as environment variables, so there is no argument quoting to get wrong.

Seven things about the harness were learned by getting them wrong, and each is a comment in
the file now:

- **Pass the project on the IDE's command line, and spawn with an argv array.**
  `parseCommandLine()` splits the raw command line on `" "` and pushes every token, so a
  *trailing space* becomes an empty second file argument and the IDE refuses the launch with
  `Bad command line syntax.` PowerShell's `Start-Process` appends exactly that space;
  `spawn(exe, [path])` does not. Loading through `root.loadProject` afterwards also works, but
  lets the IDE's no-project startup run first and flashes the splash and the New/Open Project
  dialog on screen.
- **Read every severity out of the problems panel, not the IDE's error-report helper.**
  The walk called `generateCopyPasteTextForProblem(node, true)`, and that second argument
  is an *errors-only* filter --- the function's body is `if (t && severity !== 1) return;`.
  The panel also hides hints and info by default (`hideGroup3` / `hideGroup4`). So `rows`
  could only ever hold errors while the status-bar counters held all four, and the
  invariant below was **unsatisfiable on any project with a warning**: 0 errors and 2
  warnings read as `0 rows against 0/2/0/0` and exited 3, which is indistinguishable from
  a compile that never settled. Warnings were also never reported at all. The walk now
  clears the four group flags, reads severity, line and character straight off each node's
  custom data, and restores the flags --- all inside one synchronous evaluate, so the IDE
  never renders the intermediate state. This is the same lesson as `tbrun`'s DEBUG CONSOLE
  fix one section down: **read the panel's backing data, not the view the IDE renders for a
  human.**
- **Read the counters and the diagnostic rows in one `Runtime.evaluate`.** Read as two calls
  they race: one run reported two diagnostics beside a zero error count, because the compile
  finished between them. The harness now refuses a sample where the two disagree rather than
  reporting either number.
- **Watch for the compiler going down, in the DEBUG CONSOLE and not in the status bar.**
  twinBASIC runs the compiler in the same process as user code, so a probe can crash it, and
  the IDE then restarts it three times before giving up. Untreated that is a silent
  two-minute wait; treated it is exit code 4. **Watching the status bar is not treating it.**
  The status does flap to UNAVAILABLE on the way, but the whole crash-restart cycle takes
  about 1.3 s against a 1 Hz sample, and after the third restart the IDE leaves the status at
  OPERATIONAL with the counters at zero --- byte-identical to a clean build. A 275-file
  project reported `0 errors, 0 warnings` and exit 0, twice, reproducibly, while its quarters
  reported 129, 0, 294 and 448 errors. The console is the record that sampling cannot miss,
  because nothing removes an entry from it: `NATIVE EXCEPTION` and `restarting from
  MEMORY`, three times over, with a thread dump naming the file being parsed from the second
  crash on, and that file is what the exit-4 message reports.
- **Poll for the crashed file's name; the first crash never carries it.** Only a compiler in
  TRACE-MODE writes the thread dump that names the file, and the IDE switches that on in
  answer to the first `NATIVE EXCEPTION` and passes it to a compiler as it starts, so the
  restarted compiler's crash is the first to name one. `waitForCompile` re-read the console
  once, 2 s after it saw the crash, and on 2026-09-24 one run in six against the crash
  fixture printed no file. Over 41 runs of that fixture on BETA 983, the second crash came
  1.6 to 1.9 s after the first on an idle machine and 1.8 to 3.0 s with four IDEs compiling
  at once, as `check_examples` runs them. Replayed over the four-lane runs at every phase of
  the 1 Hz sample, the single re-read missed the name 31% of the time; the poll that replaced
  it, every 250 ms for up to 5 s, missed none and needed at most 3.25 s. That poll is
  `awaitCrashName`, and the add-in lanes' `closeProject` had the same gap: closed right after
  a first crash, three times, it now waited 1.9 s and named the file where its single read
  had `crashed 1x` and no name. The failing run said
  `crashed 2x`, which that race does not explain --- a re-read that loses it has seen one
  crash --- and no run here had a second crash without a name. If one does, the third crash
  names the file as well, but under four lanes it came as late as 6.4 s, after the poll has
  given up.
- **Kill the process tree, forcibly.** An IDE showing a modal ignores a normal close, and the
  launcher is not the process holding the compiler, so `taskkill /T /F`. A tree kill still
  misses a process started while it runs, which a compiler restart can be; the job the IDE
  runs in is what catches that ([The IDE runs inside a job](#the-ide-runs-inside-a-job)).
- **Give each probe project its own `project.id`.** Two sharing one confuses the IDE's
  recents list.
- **Adopt the IDE's pid; do not assume it is the child.** Launched through the desktop
  helper the IDE is not a descendant of anything the harness spawned, so the helper reports
  the pid on stdout and the harness kills that.

**A crashing probe is a real risk, not a theoretical one.** Four `Debug.ExecuteHostCommand`
argument-shape probes in one project took the compiler down repeatedly. Keep a question that
might crash the compiler in a project of its own, so the answer is attributable and one bad
probe cannot cost the other thirty their run.

### Why it drives the WebView rather than the compiler directly

The obvious improvement is to cut the browser out --- the compiler has websockets, so why go
through a UI at all? **It cannot be done, and the reason is structural.** Recording it so
nobody spends another afternoon on it.

The IDE is three processes, and their command lines say how they relate:

| process | command line | role |
|---|---|---|
| `twinBASIC.exe` | `<project.twinproj>` | shell; hosts the WebView2, and the only one given the project |
| `twinBASIC_win32.exe` | `--ide=<shell pid>` | serves `ide/` over HTTP on an ephemeral port |
| `twinBASIC_win32_noDEP.exe` | `--compiler=<opaque token>` | the compiler; opens six websocket ports |

The page reaches the compiler at
`ws://localhost:<port>/<passKey>/{root,language,fs,debugger}`, and `language` really is LSP
--- it pushes `textDocument/publishDiagnostics` with per-file `diagnostics` and error,
warning, hint and info counts, alongside a `compilationStarted` event.

**But the port and the pass key are both minted inside the WebView.**
`hostAppObject.CreateCompilerInstance(...)` returns the port, `GetCompilerPassKey(...)`
returns a GUID, and both are WebView2 host objects --- reachable only from a page the shell
has loaded. Starting the compiler directly is no way round it either: `--compiler=` is not a
port but an opaque handle the shell hands it (`8591158` in one run, against compiler ports
`61917-61922`). So a proxy between the WebView and the HTTP server is possible --- the page
and its scripts come over plain HTTP, and a patched `main2.js` could be served --- but it
would not remove the WebView, it would only change what runs inside it. The thing you would
want to delete is the thing that mints the connection.

What the websockets *would* be good for, once an IDE is up, is replacing the poll-for-DOM-
stability heuristic with `compilationStarted` plus a quiet period of `publishDiagnostics`,
and taking structured diagnostics instead of scraped text. That is a robustness change, not
a speed one, and the current reader is the IDE's own report walk, so it is not urgent.

### One project per IDE, and that is the scaling unit

**Reusing a live IDE for a second project does not work.** `root.loadProject` against a
running IDE wedges it: `Runtime.evaluate` stops returning while browser-level CDP still
answers, and no javascript dialog is pending --- so the renderer is blocked inside a
synchronous host call, not on something dismissable. Reproduced twice. The IDE holds one
project at a time and closing the previous one is part of that path.

So the cold start is not overhead to be optimised away; it is the unit of work. `tbbuild`
starting a fresh IDE per project is the design, not a convenience.

**It costs less than it sounds like.** Measured on this box: **8 to 11 seconds per project,
and flat in project size** --- a one-file project and the 32-probe exploratory project both
land at about ten seconds, because what is being paid for is IDE startup and not
compilation. That number was once guessed at "roughly 40 seconds" and is out by a factor
of four: time it before quoting it.

**Concurrency works and is the route to a fast probe suite.** Distinct `--port` values give
distinct DevTools ports, WebView2 user-data folders and private desktops, so instances do
not collide. Three projects: **26 s sequentially, 10 s in parallel**, with each run
reporting its own diagnostics and no bleed between them.

**A port another IDE holds is refused.** The harness attaches to whatever page answers on
its port, so an IDE already there --- another lane's, or another session's, since several
sessions run this harness on one machine with ports of their own choosing --- would be the
one read and operated. `launchIde` binds the port for a moment first, and gives up after
ten seconds with a message saying which port and why. The wait is for the lane's own
previous IDE: after `shutdownIde` a port came free in 13 and 16 ms, and once in two
seconds.

### Capturing what a probe prints, not just whether it compiles

`tbbuild` answers *does this compile*. [scripts/tbrun.mjs](scripts/tbrun.mjs) answers *what
does this print*, which is the only way to settle a question no shipped source
demonstrates. It exists because one did: the width of a `Debug.Print` print zone, which
four documentation pages between them could not establish and which took ten minutes to
measure once there was a way to run code.

    node scripts/tbrun.mjs <source-dir>

It takes an **exported tree** rather than a `.twinproj`, stages a copy, pins the build path
in the copy, packs it, compiles it with the same library calls `tbbuild` makes, clicks
Build, then reads the DEBUG CONSOLE back over CDP. The staging is
[scripts/lib/tb-project.mjs](scripts/lib/tb-project.mjs), which the add-in harness shares.
The probe is a module with a `[RunAfterBuild]` Sub, which the IDE runs once the exe is
linked. Reader-facing documentation is the [`tbrun.mjs` entry in
Tools.md](docs/Documentation/Tools.md).

**The trap that cost two silent runs, and the reason the script owns the tree.** A project
whose `project.buildPath` is still the default `${SourcePath}\Build\...` template opens a
native *Save* dialog when you build it. On the private desktop `tbbuild` uses, that dialog
is invisible and unreachable, so the build simply never happens --- and **the WebView2
renderer stays responsive throughout**, so `Runtime.evaluate` answers normally and every
health check says the IDE is fine. It is the wedged-IDE failure mode from the section
above with the one symptom that detects it removed. `tbrun` pins the path in its staged
copy, which is why it insists on a source tree it can edit rather than a packed project it
cannot.

Four smaller things it knows, each of which cost a run:

- **`element.click()` on `#buildIcon` does nothing.** It is a plain DIV behind the IDE's own
  pointer handling and needs real `Input.dispatchMouseEvent` presses at its centre.
- **Read the console's backing array, not the pane.** The DEBUG CONSOLE is a
  `createListView()`, which keeps only the rows that fit in the DOM, so scraping its
  `innerText` returns the *tail* of a long probe and looks exactly like a complete capture
  --- measured that way, a probe printing 120 lines came back with 11.
  `debugConsoleContent.dataNodes` is the whole log (`addItem()` appends and nothing ever
  removes, so only `Debug.Cls` empties it), and the walk `tbrun` does over it is the IDE's
  own *Copy All* minus the clipboard write. The timestamp comes off in the same step,
  because it is a nested `<span>` in each entry rather than a line of its own, so `--raw`
  is a different slice of that string. Do not "fix" the old truncation by turning *Show
  Timestamps* off: that option only sets a CSS variable, and the row budget does not move
  --- see [WIP.ExamplesBuild.md](WIP.ExamplesBuild.md) for the measurement.
- **A probe must start with `Debug.Cls`.** The IDE logs its own build to the same console
  and the linker writes there *after* the build, so without a clear you capture your output
  interleaved with `[LINKER]` lines. The script warns rather than guessing which lines are
  yours.
- **A failed build is not output.** A build that fails after a clean compile never runs the
  probe, and the IDE's own log stays in the console: `[BUILD] Starting...`,
  `[TYPELIB] failed to finalize typelibrary.  Disk error?`, `[LINKER] FAILED to create type
  library`, `[BUILD] failed`. `tbrun` returned exactly that as the probe's output, with exit 0,
  twice in round 8's fix pass --- five runs going at once on ports 9740--9744, and both passed
  when repeated. It now exits 2 on a `[BUILD] failed` or `[LINKER] FAILED` line, which the
  probe's own `Debug.Cls` would have erased. What made the type library fail was not isolated.
  Since the tooling review's C16 it exits 2 on any line `buildProject`'s `BUILD_FAILED`
  matches, which adds `[BUILD] ERROR` and `[LINKER] compilation (codegen) error`. The second
  was measured: a `[RunAfterBuild]` Sub that shifts a `Single` (BUGS-TO-REPORT.md) builds with
  `[LINKER] SUCCESS`, the console adds `[BUILD] Executing 'DocSamples.Probe.Run'...` and the
  codegen line, and nothing in the Sub runs, so `tbrun` had returned that log with exit 0.
- **A callee's code-generation failure is invisible.** When the failing shift is in a
  procedure the probe calls, the codegen line naming that procedure comes straight after the
  `[BUILD] Executing` line, before the probe's first statement runs. The probe's `Debug.Cls`
  erases it, the probe prints what comes before the call and stops there, and `tbrun` exits 0
  with that partial output. Measured with and without `Debug.Cls` on BETA 983; not fixed.

A reader of the console that is not `tbrun` should **compare the whole console before and
after, not read on from an index**: new text can be appended to an entry that is still open.
Round 8's export probe missed the first `[EXPORT] exporting...` line of every session that
way. `tbrun` re-reads the whole backing array on every poll, which is why it never did.

`readConsole`'s `since` does compare, and it is what `buildProject` and `openedUrls` read
with: the mark `consoleMark` takes holds the last entry as well as the count, and the text
appended to that entry comes back as the first line, before the entries after it. The
mechanism is in `ide/main.js`. Everything the compiler's process writes, a program's
`Debug.Print` and an add-in's `PrintText` alike, arrives as an output event and goes through
`debugOutputPartial`, which adds to the last entry in place (`updateItem`) while its line is
open. Output that ends in a line break closes the line, which is why each `PrintText` makes
an entry of its own, and so does `debugOutputLine`, the IDE's own messages, which starts a
new entry. Measured by calling both from the page: from a mark taken on an open line, the
count-only read missed the text appended to it, and the new read returned it first. And
measured for `PrintText`: with a line left open, Sample 10's printed line was appended to
that entry, and the new read returned it. **The
IDE escapes that continued text twice** ([BUGS-TO-REPORT.md](BUGS-TO-REPORT.md)), so a probe
printing `&`, `<` or `>` after a `Debug.Print ...;` reads them back as `&amp;`, `&lt;` and
`&gt;`, which is also what the console shows.

It settles on a quiet period rather than a sentinel, so no probe has to print a marker the
script knows about. Distinct `--port` values let probes run concurrently, exactly as
`tbbuild`'s do.

**Two things make that safe, and both had to be built.** The workspace and `project.id`
are keyed to `--port`, so a second run cannot delete the first one's tree; and shutdown is
a kill by the pid the launch returned --- `tbbuild` reports it as `ide-pid:` in text and
`idePid` in `--json` for a caller that inherits a kept IDE --- rather than a machine-wide
`taskkill /F /T /IM twinBASIC.exe`, which would take out every concurrent run's IDE and the
one you had open yourself.

`tbrun` also **harvests COM servers a probe leaves behind**, because nothing else can: an
`EXCEL.EXE` from `CreateObject` has `svchost.exe` for a parent, so no tree kill reaches it,
every activation is its own process, and `Quit` does not end one while any reference is
outstanding. The sweep is a before/after snapshot diff restricted to processes that are new,
on an image allowlist, *and* windowless --- a new one that has a window is reported and left
alone, since that cannot be told from a copy the user opened. `--no-reap` turns it off, and
concurrent runs driving the same server should use it and sweep once at the end.

### Building for win64

**`tbrun` and `tbbuild` take `--arch win32|win64`, and set it on every run, win32
included.** Before the option they built whatever target the IDE had for the project, which
for a fresh probe is win32, so no probe could measure 64-bit behaviour --- and a target the
IDE remembered for a reused path decided the build without a word. `tbbuild` needs it as much
as `tbrun`: `#If Win64` and `LongPtr`'s size change what compiles. Measured with a module
declaring a variable of an undeclared type under both branches of `#If Win64`: win32
reported line 6's `OnlyUnder32Bit`, win64 line 4's `OnlyUnder64Bit`.

**The target is the toolbar's build configuration box**, the page global
`buildConfigSelector`, whose options are `win32`, `win64` and `nocompile` --- safe mode,
which the IDE sets itself after four compiler crashes in a minute, with a message box. The
IDE's own `tbBuild_SwitchToWin64` and `tbBuild_SwitchToWin32` (Ctrl+F1, Ctrl+F2) set the box
and call its `onchange`, and `setBuildTarget` in `tb-ide.mjs` does the same. The handler,
`changedActiveBuildConfig` in `ide/main2.js`, saves the target for the project's path and
calls `restartCompilerSafely`, which kills the compiler: **every switch restarts it**, as the
target's own compiler, `twinBASIC_win64_noDEP.exe` for win64, and the project compiles
again. A project opening with a remembered target goes through the same switch before it
loads.

**Wait for the restart by the compiler's pid, not by the clock.** Measured on BETA 983, at
50 ms: the status bar stayed OPERATIONAL for about 250 ms after the switch, read UNAVAILABLE
until the new compiler's pid appeared in `g_CurrentCompilerProcessId` at about 510 ms, and
LIMITED until OPERATIONAL at 1.4 s. `waitForCompile` started straight after the switch can
sample that second of downtime twice after having seen OPERATIONAL, and it counts that as
the compiler going down twice: exit 4, a crash that did not happen. A three-second pause
before it worked when this was first measured, and is a guess. `setBuildTarget` waits for
the pid to change, then for the compile. The wait is `awaitNewCompiler` in `tb-ide.mjs`,
which `restartCompiler` in `tb-operate.mjs` uses too, after the toolbar's restart button.

**A win64 probe runs as a 64-bit process.** `[RunAfterBuild]` code runs in the compiler that
built it, not in the binary:

| | win32 | win64 |
|---|---|---|
| `LenB` of a `LongPtr` | 4 | 8 |
| `#If Win64` | False | True |
| `ProcessorArchitecture()` | 0, `vbArchWin32` | 1, `vbArchWin64` |
| `Environ$("PROCESSOR_ARCHITECTURE")` | x86 | AMD64 |
| `IsWow64Process` | 1 | 0 |
| module path of the process | `bin\twinBASIC_win32_noDEP.exe` | `bin\twinBASIC_win64_noDEP.exe` |
| PE machine of the built file | 0x14c | 0x8664 |

The first three are decided when compiling; the last three can only come from the running
process, and they agree.

**The build path's folder has to be explicit; its file name need not be.** `tbrun` used to
pin the output to `tbrun-probe.exe` whatever the build type or target. It now builds into
its own `out` folder under the IDE's own name, `${ProjectName}_${Architecture}.${FileExtension}`,
which gave `ArchProbe_win32.exe` and `ArchProbe_win64.exe` with no Save dialog --- so the
trap above comes from the default `${SourcePath}\Build\...`, not from the variables. The
name is looked for after the build rather than assumed, because `${FileExtension}` follows
the build type.

**A switch writes the IDE's remembered target for the project's path**, so the registry tidy
has to put it back. Under a harness folder the entry is swept, as every entry there is. A
named project --- `tbbuild` on one of the user's own --- has its entry snapshotted and
restored, as its saved state is ([What a run leaves in the
registry](#what-a-run-leaves-in-the-registry-and-putting-it-back)). Measured end to end with
an entry of `win64` seeded for a named project: the default run said `target: win32 (the IDE
remembered win64 for this project)`, compiled for win32, and left the entry at `win64`; with
the seed removed, the whole value was byte-identical to before. Two limits. Under `--keep`
nothing is tidied, so a kept IDE's switch stays remembered. And the IDE's own save is an
unguarded read-modify-write of one JSON value (`setProjectLastUsedTargetArchitecture`), so two
IDEs switching at the same moment can lose one another's entry --- harmless for a harness
path, which the next sweep deletes anyway.

## What a run leaves in the registry, and putting it back

**Every IDE the harness starts writes to the user's own settings.** They live under
`HKCU\Software\VB and VBA Program Settings\twinBASIC_IDE`, and the same key serves every
installed build. An IDE records each project it opens as a `ProjectState` value (open tabs,
watch expressions, DEBUG CONSOLE history: up to 34 KB for a real project) and moves it to
the top of `RecentlyOpened`, a 21-slot list. Nothing removed either, so on 2026-09-23
**318 of 424 `ProjectState` values** were harness temp projects, and **all 21 recent slots**
were: the user's own recent projects had gone from the IDE entirely. One `examples.bat` run
adds 41 values and fills the list.

[scripts/lib/tb-registry.mjs](scripts/lib/tb-registry.mjs) puts it back. **The rule is to
leave everything as it was found**, and it takes four forms:

- **A folder only the harness writes to is swept by prefix** --- `check_examples`' and
  `tbrun`'s work folders. The sweep also runs at the start of a run, which catches what an
  earlier run left when it died. A prefix must lie inside the temp folder, or it is refused:
  a caller passing the wrong folder cannot sweep away real projects.
- **A named project is restored, not deleted.** `tbbuild` is pointed at the user's own
  projects too, and deleting one of those entries would throw away somebody's open tabs and
  watches. So it snapshots the project's entry first, and afterwards puts back the old state
  and the old place in the list if there was one, and deletes the entry only if there was
  not.
- **The `.twinproj` association is restored value by value**, writing only what differs,
  so an untouched key is never written. The IDE does not rewrite it on every launch: key
  timestamps show `DefaultIcon` and `shell\open\command` last written when BETA 983 was
  installed, through a day of launches of that build. It rewrites them when its own path
  differs, which was measured once there was a private copy of the IDE to start ([A private
  IDE for every lane](#a-private-ide-for-every-lane)).
- **The build target the IDE remembers for each project is deleted under the same
  folders**, before the run and after it. The IDE keeps the target it last built a project
  for as one JSON object in `IDESettings\targetArchitectureMemory`, keyed by the project's
  path, and a project it opens again starts in that target. A harness path is used run
  after run, so one run's entry decides every later run's target without a word: on
  2026-09-24 the object held `win64` for `tbrun`'s work folders on ports 9372 and 9373, so
  `tbrun` on either port built 64-bit. `sweepArchitectureMemory` deletes the entries under
  the run's folders and leaves every other entry alone, the user's among them. Opening a
  project only reads its entry; one is written when the target of an open project changes,
  which `--arch` does ([Building for win64](#building-for-win64)). So a **named** project's
  entry is snapshotted and put back as its saved state is, by
  `restoreArchitectureMemory`: its old value in its old place, and any other spelling of its
  path the IDE saved deleted. The object is edited in JavaScript and written back with
  `JSON.stringify`, which is how the IDE writes it, so the other entries keep their exact
  text and order, and the write is refused if the value changed after it was read.

**One process owns the registry per run.** `check_examples` runs four lanes of `tbbuild`
children at once; each restoring its own snapshot would put back whatever the registry held
when that lane started, in whatever order the lanes finished. `startTidy` sets
`TB_REGISTRY_OWNER`, the children inherit it and leave the registry alone, and the owner
sweeps once after the last lane. An owner pid that is no longer running does not count, or a
variable left set in a shell would switch tidying off for good. Under `--keep` nothing is
tidied, because the kept IDE is still writing. `shutdownIde` waits for the IDE's process to
be gone before anything is tidied, because `taskkill` only asks.

**Why .NET through PowerShell and not `reg.exe`.** Node has no registry API. `reg.exe`
prints value names in the console code page when its output is piped, so a path containing a
character outside that code page (an accented user name in `%TEMP%` is enough) comes back
mangled, and a value cannot be deleted by a name that no longer matches it. The request goes
in on stdin, because a project's state can reach 34 KB and an environment variable stops at
32 K characters. It is passed with `-EncodedCommand`, like `tb-launch.ps1`, and it is
inline in the `.mjs` rather than a second `.ps1`, like `tbrun`'s process snapshot.

**Three things went wrong on the way to it, and each is now handled in the file:**

- **PowerShell answers in XML when its streams are redirected.** Progress records ("Preparing
  modules for first use") arrive on stderr as `#< CLIXML`, and so do errors, so a failure
  whose message was taken from stderr read `#< CLIXML`. Progress is now silenced, and a
  failure comes back as `{"error": ...}` on stdout.
- **A restore near the root would be a disaster rather than a no-op.** Restoring deletes
  whatever the snapshot does not list, so an empty or short key path would have taken
  everything under `HKCU` or `Software`. Nothing passed one, and that is not a safeguard:
  anything shallower than three segments is now refused, in JavaScript and again inside the
  script.
- **Two runs deleting one value raced.** Three concurrent `tbbuild`s on the same fixture each
  listed the value, one deleted it, and the next `DeleteValue` threw "No value exists with that
  name". That aborted the whole tidy, recent list included, and the list was left holding one
  project eighteen times. Every delete now tolerates a missing value.

**The eighteen copies were the IDE's own bug**, and it is in
[BUGS-TO-REPORT.md](BUGS-TO-REPORT.md): when the recent list has fewer than 21 entries, the
IDE fills every empty slot with a copy of the last one. The tidy leaves a short list whenever
it removes harness projects, so the next project the user opens trips it. That is the same
list a new installation has, and it cannot be fixed from outside the IDE.

**Two limits remain, both about IDEs the tidy does not own:**

- Two *standalone* `tbbuild`s on the same project at once: the second sees the first's entry
  as the user's, and puts it back. `check_examples` is immune, because its lanes are owned,
  and the end-to-end check below ran its fixture cases one at a time for this reason.
- An IDE the user has open reads the recent list when it starts and writes its whole copy
  back when it opens a project, so it can bring back harness entries that were tidied after
  it started. So can an IDE of a run from another session, which is why a check of the
  registry waits until no other session's run is going.

**A third was closed: an association that named the temp folder is never put back.** A run
that starts while another run's IDE copy is open finds the association pointing at that
copy. Put back at the end, it would point `.twinproj` files at a folder that has been
deleted, and other sessions run `examples.bat` while add-in tests run copies, so the
overlap is ordinary. `startTidy` now notes whether the association it recorded names the
temp folder, and if it did, `finishTidy` leaves the association as the IDEs set it and says
so; the next IDE started from a real install points it at that install. A run still on
older code puts back what it found, so the guarantee holds once every checkout has it.

**Observed on 2026-09-24: older code in another checkout did exactly that.** An add-in run
put the association back, and a comparison straight afterwards found it as it had been. A
minute later it named that run's IDE copy, deleted by then: another session's harness run,
on the code from before this rule, had recorded the association while the copy held it, and
put that back when it ended. The next add-in run found it naming the temp folder and, by the
rule, left it as its own IDEs set it, which was at its own copy, deleted in turn. It was put
back by hand. So until every checkout has the rule, an association can be left naming a
deleted copy, and `.twinproj` files then open nothing until an IDE is started from a real
install.

**The recent list is put back as it was found, not only swept.** The sweep alone was exact
on an empty list, and the list was empty when the tidy was first verified. On a real one the
IDE changes the list by itself while a run's projects are on it, in two ways, both in
[BUGS-TO-REPORT.md](BUGS-TO-REPORT.md): it fills a short list's empty slots with copies of
its last entry, and a full list loses its oldest entry for every project the run opens.
Measured on 2026-09-24: an add-in run that began with one entry in the list ended with
seventeen copies of it. Its four IDEs had filled all 21 slots, and the sweep removed only
their four projects. So `snapshotProjects` records the whole list, and
`restoreProjects`, after deleting the run's entries and putting a named project back in its
place as before, keeps no more copies of any path than the list had, and puts the entries
that fell off the end back there. A change made for any other reason is kept: a project the
user opened meanwhile stays on top. **An entry in the temp folder is not brought back**,
because it belongs to some run, whose own tidy may have removed it meanwhile; bringing it
back would leave that run's entry in the list for good. That is also why a run that starts
with another run's leftovers in the list can end without them.

**Verified** by [scripts/check_tb_registry.mjs](scripts/check_tb_registry.mjs), which plays
out a run on a scratch key and checks every rule above, the guards and the ownership rule
included. For the recent list it has five cases: the copies of a short list's last entry, a
full list's lost entries, a project opened meanwhile, copies that were there before the run,
and another run's entry that its tidy removed meanwhile. It is not a gate: it needs Windows
and a real registry, and the CI runners are Ubuntu. Run it after changing `tb-registry.mjs`.

End to end, the 14 fixture cases, run one at a time, and a full `examples.bat` run leave
`ProjectState`, the recent list and the association keys exactly as they were, value for
value, though the recent list was empty when that was first shown. With the user's own
projects planted in it, two of them and then 21, an add-in run left it identical both times.
The add-in checks in [Building an add-in and loading it](#building-an-add-in-and-loading-it)
left `IDESettings` unchanged too, compared value by value through hashes, so that the
comparison copied no value out of the registry; the build targets they planted under their
own folders were gone afterwards.

## A private IDE for every lane

**The compiler loads every DLL in `<install>\addins\win32` or `\win64` as it starts.** A
test add-in put there would load into every IDE the user starts from that install, and two
lanes testing different add-ins could not share the folder at all. So the add-in harness
([WIP.HelpAddin.md](WIP.HelpAddin.md)) runs each lane on its own copy of the install, made
by [scripts/lib/tb-ide-copy.mjs](scripts/lib/tb-ide-copy.mjs), whose `addins` folders hold
exactly what the lane puts there. The compiler loads the DLLs in
`%APPDATA%\twinBASIC\addins\<arch>` as well (P6), and the `APPDATA` each lane gives its
IDEs keeps the user's out ([The add-in test runner](#the-add-in-test-runner)).

**Measured, against BETA 983:**

- **An IDE session writes nothing into its install.** A compile, a compiler crash and a
  `tbrun` build-and-run each left all 233 files byte-identical, down to the mtimes. A
  compile also left the per-user `%APPDATA%\twinBASIC` unchanged; that folder holds the
  user's downloaded packages and empty `addins`, `locale` and `themes` folders, and is
  shared by every install. So a compile's whole footprint outside its temp folders is the
  registry, which [the tidy](#what-a-run-leaves-in-the-registry-and-putting-it-back)
  already puts back.
- **The copy is isolated.** Asked which add-ins it had loaded (`loadedAddins`, below), the
  real install's compiler answered `GlobalSearchAddIn AddIn` and the copy's answered
  nothing. All 14 fixture cases gave the same output from the copy as from the real install,
  and the real install was byte-identical afterwards.
- **Starting the copy re-points the `.twinproj` association at it.** Read while the copy's
  IDE was running, the keys pointed into the copy; the real install's IDE, run the same way,
  left them alone. The tidy restored them with three writes. This was an inference in the
  registry section until then.

**A copy, not hardlinks.** The install is 233 files and 87 MB; leaving out `projects\` (the
samples and New Project templates, 29 MB, which a test that opens its project on the command
line never shows) and `addins\` (recreated), it copies in **380 ms**. Hardlinks would save
that at the price of sharing every file with the user's install, so that any write the IDE
made into its own folder would land in the real one. None was measured, but a copy makes
the question irrelevant instead of merely answered.

A copy keeps the install's folder name, `twinBASIC_IDE_BETA_<n>`, so that
`tb-install.mjs`'s `buildNumber()` still reads the build off its path. It is made and
deleted only inside the temp folder, and deleted only where the module left its marker
file, so a wrong path cannot empty a folder anybody cares about. Deleting one that an IDE
still holds fails with `EPERM`, and that is the right report: it is how the leak in the
next section was found.

**`removeTree` retries the delete itself, because `rmSync` does not.** An IDE ended a
moment ago still holds some of its files for a while, and `removeIdeCopy` always passed
`rmSync` a `maxRetries` of 10 for that. On Node 24.13 that option does nothing here:
`rmSync` failed with `EPERM` within a millisecond on a folder holding a file another
process had open, with `maxRetries` and `retryDelay` exactly as without them (measured).
It never showed while every caller ran a registry tidy, a second or more of PowerShell,
between ending the IDE and deleting the copy. The lane code deletes the copy the moment the
IDE has gone, and the first delete failed. `removeTree` in `tb-ide-copy.mjs` retries for up
to five seconds, and `removeIdeCopy` and the add-in runner both use it.

**`loadedAddins(c)`** in `tb-ide.mjs` is the check that the copy is what it claims to be.
It asks the page's `root.getAddinsList`, which asks the compiler over its root socket
(`RequestAddinsStateList`), so the answer is the compiler's own, not an inference from files
on disk. It is the same list the Add-Ins menu shows.

## The IDE runs inside a job

**A tree kill races the IDE's compiler restarts.** After a crash the IDE restarts its
compiler, and `tbbuild` ends the IDE as soon as it sees the crash. A compiler started while
`taskkill /T` is walking the tree is not in the tree it walked, so it outlives the kill: a
`twinBASIC_win32_noDEP.exe --compiler=...` whose parent is gone, with
`twinBASIC_nativedbg_win32.exe` attached, still holding the install's files open. It was
found as the `EPERM` above, when a lane copy would not delete after a fixture run. It
happened once in about a dozen crash-fixture runs, and the same kill had always been in
`tbbuild`, so earlier runs against the real install may have left the same thing, holding
the real install's files instead.

**The fix is a job object**, the Windows primitive for "this process and everything it ever
starts". [tb-launch.ps1](scripts/lib/tb-launch.ps1) creates one with
`JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`, starts the IDE suspended, puts it in the job before it
runs an instruction, and resumes it. Everything the IDE starts from then on is in the job,
and when the launcher's handle to the job closes, Windows ends everything still in it, at
once and with nothing to race. The evidence is what a kill does, not an `IsProcessInJob`
check, which cannot say *which* job a process is in and answers yes for every process this
session starts. Killing only `tbbuild` in the middle of a compile ended all thirteen
processes of its IDE: the shell, the page server, the compiler, the native debugger, seven
WebView2 processes and two console hosts. WebView2 runs inside the job without complaint.

**How long the launcher lives is how long the IDE lives, and Node decides that.** Node puts
the children it spawns into a kill-on-close job of its own, so when the Node process ends,
the launcher ends with it, closing the IDE's job. Normally that is exactly what is wanted:
killing only `tbbuild` in the middle of a compile now takes its whole IDE down with it,
where before the IDE lived on, on a desktop nobody could see. `check_examples` should get
the same protection one level up, since its `tbbuild` children die with it by the same
mechanism; that step has not been measured separately.

**A kept IDE is the exception, and it gets no job.** Both other arrangements were tried, and
both fail:

- **The job under `--keep`**: the kept IDE was gone before anything could attach to it. The
  launcher died with `tbbuild`, as above, and took the job with it.
- **The launcher detached from Node**, so that it would outlive `tbbuild`: PowerShell exited
  at once, printing no pid and nothing on stderr.

So under `--keep` the launcher makes no job, and the IDE escapes Node's job the way anything
the launcher starts does, which is how `--keep` always worked. A kept IDE is therefore
unprotected: killed while its compiler is restarting, it can still orphan one.

**Measured:** twelve crash-fixture runs in a row left no process behind; the 14 fixture
cases gave output identical to before the job, and a full `examples.bat` passed 1,116 of
1,116 with no process left afterwards. `--show` still starts the IDE directly, without a
launcher or a job: it is for a person watching, and it has not been moved onto the launcher
because that would mean putting an untested window on somebody's screen.

## Building an add-in and loading it

**An add-in is tested with two IDEs of the lane's copy, one after the other.** The compiler
loads add-ins only as it starts, and an IDE holds one project, so:

1. `buildAddin` in [scripts/lib/tb-addin.mjs](scripts/lib/tb-addin.mjs) stages the add-in's
   exported tree through [scripts/lib/tb-project.mjs](scripts/lib/tb-project.mjs) --- the
   staging `tbrun` does, moved there to be shared --- with the build path pinned to
   `<work>\out\<project name>.dll`. It starts the copy on it, with the lane's own `APPDATA`
   when given one (`appdata`), sets the build target, refuses a project with compile errors
   (exit code 1, every diagnostic listed), builds, and ends the IDE. `Lane.buildAddin` stops
   there and leaves the DLL in the work folder; `Lane.addAddin` goes on to step 2.
2. `addAddin` in `tb-ide-copy.mjs` puts the DLL in the copy's `addins\win32` or
   `addins\win64`, under its own name or one the caller gives (`Lane.placeAddin`). It
   refuses any folder that is not a marked copy, so a test add-in cannot reach the real
   install.
3. The copy starts again, on the project the test opens, and `loadedAddins` asks its
   compiler what it loaded.

Both shipped add-in samples went through it. Sample 10 and Sample 15 each built in about
nine seconds, IDE start included, and the next IDE reported `WaynesWorld AddIn` and
`GlobalSearchAddIn AddIn`, with Sample 10's five `OnProjectLoaded` lines in its DEBUG
CONSOLE and its two toolbar buttons on the page.

**The DLL is built into the work folder, not into `addins` as the samples' own build path
has it**, because the IDE that builds is the lane's copy too: on a rebuild its compiler
would hold the previous build, loaded from that folder, while the linker tried to replace
it. **A compiler holds every add-in it loaded** (P8 in WIP.HelpAddin.md): while the IDE
runs, overwriting the file fails with `EBUSY` and deleting it with `EPERM`, though renaming
it works. The hold also outlasts the process: with every process of the IDE gone, the first
overwrite still failed and one 25 ms later worked, four runs out of four. So `addAddin`
retries for two seconds. Its copy fails with `EIO` rather than `EBUSY`, and a retry that did
not listen for `EIO` failed three runs out of three.

**Whether the build worked is read from the build log.** `buildProject` in `tb-ide.mjs`
clicks Build, as `tbrun` does, and waits for the DEBUG CONSOLE. The wording is in the
compiler's strings: `[BUILD] Starting...`, then for a binary either `[LINKER] SUCCESS created
output file '<path>'` or one of about twenty failure lines --- `[LINKER] FAILED ...`,
`[BUILD] FAILED ...`, `[BUILD] ERROR ...`, `[BUILD] failed`, `[LINKER] compilation (codegen)
error ...`. An output file another process held open gave `[LINKER] FAILED to create output
file '...' (error code 32)`, then `LOCKED BY:` and a line naming the process, then `[BUILD]
failed`. Two details:

- **Only lines added after the click count.** Nothing removes a console entry but a clear.
  So the entries from the pre-click count on are new, unless the first entry changed or the
  count fell: that means a clear, and then everything is new. A previous build's SUCCESS
  line can never be taken for this build's. Text the IDE appends to the entry that was last
  at the click counts as new too, since the IDE adds to a line that is still open in place
  (`readConsole`'s `since`, under `tbrun` above).
- **A failure line waits two seconds for a success line after it.** The strings include
  `[BUILD] failed to use project.iconForm setting`, and whether a build goes on after that
  one has not been seen.

What a package build writes has not been looked at; `buildProject` knows binaries only.

**Either target, set on every build and checked in the file.** `buildAddin` takes `arch`,
`win32` by default, and sets it with `setBuildTarget` as `tbrun`'s `--arch` does, even
when the project opened in it: a project path the IDE has no memory of opens in win32, and
a target the tidy missed would otherwise decide the build without a word. A win64 build is
a switch, which restarts the compiler and compiles the add-in again before the build. It
was win32 only until P7 said which folder a switched compiler loads. Then
`dllInfo` reads the DLL's PE headers: its machine type has to be the target's (`0x14c`,
`0x8664`), and it has to export one of the three names the IDE's loader takes (P14),
which is what makes it an add-in at all. The linker's SUCCESS line alone had said only that
a file was written.

**The target decides which folder is read** (P7): a copy holding Sample 10 as
`InFolder_win32.dll` in `addins\win32` and `InFolder_win64.dll` in `addins\win64` loaded the
first alone when it opened a project with no memory. When it opened a project remembered as
win64, it started `twinBASIC_win64_noDEP.exe` with `twinBASIC_nativedbg_win64.exe`, which
tried the second alone and failed, since the add-in is 32-bit. A switch of an open project
loads the other folder; the P7 lane checks it with a build of each bitness.

**A DLL that fails to load still appears in `loadedAddins`, as `Unknown Addin`.** The DEBUG
CONSOLE says why, on a line that starts with the file name: `[InFolder_win64.dll] Failed to
load addin.  LoadLibrary() failed.` So a test looks for the name it expects rather than
counting, and reads the console for the reason when that name is missing.

**Verified** by a scratch driver, beyond the two samples. An add-in with an undeclared name
failed with exit code 1 and both of its diagnostics. An output file held open by another
process failed with exit code 2 and the linker's line. A lane whose add-in path was planted
in the registry as win64 still built win32, because the tidy deleted the entry first. The 14
fixture cases gave output identical to before, `tbrun`'s three included. A full
`examples.bat` passed 1,117 of 1,117, and the registry was identical afterwards,
`IDESettings` included.

## Operating the IDE and reading it

**A scenario is written with [scripts/lib/tb-operate.mjs](scripts/lib/tb-operate.mjs)**:
click, press keys, type, read the add-ins' tool windows, message boxes, notifications and
list views, open a file, move or read the code editor's cursor, and restart the compiler
with the toolbar's button (`restartCompiler`). A lane restarts it, or switches the build
target, through `Lane.restartCompiler` and `Lane.setBuildTarget`, which also refuse a
compile afterwards that crashed or has errors. `readCrash` in
`tb-ide.mjs` says whether the compiler crashed, from the same console record `tbbuild`
reads, and `awaitCrashName` waits for that record to name the file being parsed, which no
first crash does. Every call takes a connection from `attachIde`. Both of Stage 1's acceptance
scenarios were carried out with these calls alone, on a lab IDE with Samples 10 and 15
built in; [WIP.HelpAddin.md](WIP.HelpAddin.md), Stage 1 item 5, has what they did.

**Input is real input; reading is from the page's data.** A click is the pointer moving to
the element's centre, pressing and releasing, and a key press is the key-down and key-up a
keyboard sends, because the IDE's own controls ignore `element.click()` and an add-in's
shortcut is matched on the real pair of key events. Reading is the other way round: a list
view draws only the rows that fit, and a tool window is a shadow root that
`document.querySelector` cannot see into, so the calls read `toolWindowsById`, a list
view's `dataNodes` and `window.editor` rather than what is drawn.

Seven things about it were learned, the first six on the samples:

- **A click scrolls its target into view, and checks what is at the point before it
  clicks.** Sample 10's tool window is taller than it is shown. Its eleventh button had a
  size and a place, but the place was under the window's bottom edge, and the first click
  went to the window's resize handle and did nothing. `click` now calls `scrollIntoView`,
  finds the element at the centre point through every shadow root, and throws, naming both,
  when something else is there. It also throws when there is no such element, or the
  element has no size, which is what a hidden tool window's elements have.
- **A click waits for its target, up to five seconds.** What an add-in adds is in the page's
  data a moment before it is drawn. The first run of the Sample 15 scenario waited until
  the results list held both files' results, read from the list view's data, and clicked a
  match under a millisecond later: the list had not drawn the row yet, and the click failed
  with "there is no such element". Done by hand, a pause had always come between the two. So
  `click` now tries again every 100 ms until the target is there, has a size and is not
  covered, and only then throws, with the last reason.
- **Of the elements a selector finds, the target is the first one on screen.** Sample 15's
  results list held one file's entry twice in the page while its rendered text had it once:
  a list view keeps rows it has drawn before, and a kept row is not on screen. A target can
  also be narrowed by its exact text, and can take the last match rather than the first,
  for a dialog stacked on another.
- **Which element carries the handler decides what a click does.** Sample 15 puts each
  match's `[line,col]` label beside the clickable line, not inside it, so a click on the
  label runs the handler of the file's whole entry and opens the file's first match. The
  harness was right and the target was wrong; clicking the line opened `Haystack.twin` at
  line 4, column 13, as the result said.
- **Typing is one key press per character.** Sample 15 searches on key-up, once typing
  pauses for a second, so text put into its box any other way would never be searched.
  `pressKey` sends a US keyboard's `key`, `code` and virtual key code, since the IDE names
  an add-in shortcut's letters from `code` and every other key from `key`. Modifiers go down
  before the key and come up after it, in reverse. Measured in the code editor: End moved
  to the end of the line, Shift+End selected to it, Ctrl+A selected all 152 characters, and
  a typed `x` followed by Backspace left the text as it was.
- **The editor is `window.editor`**, one Monaco editor given the model of the selected
  tab, and `openEditors.selectedEditorNode.name` is that tab's file,
  `/<Project>/Sources/<file>`. Opening a file the way the IDE's Find in Files does ---
  `fs.tree.resolvePath("twinbasic:" + path)`, then `openEditors.openFile(node, false,
  false, false, line, column)` --- put the cursor at the line and column given, counted
  from 1.
- **Opening a file at a place leaves the cursor unsettled for 700 ms** (learned on P2 in
  WIP.HelpAddin.md). Whenever the compiler's decorations for the document arrive less than
  700 ms after the IDE's last `revealLineInEditor`, `parseDocumentDecorations` calls it
  again: the cursor goes back to the opened place, and the 700 ms start over. Every edit
  brings new decorations, so a `setCursor` made in that time is undone, and text typed in it
  goes in at the opened place, each key in front of the last: `MsgBox(` came out `gBox(s`.
  So `openFile` now waits for the IDE's own callback, `openEditors.openFile`'s eighth
  argument, and then for the 700 ms to pass --- about 0.8 s in all for a file not yet open.
  `setCursor` and `select` first wait out any time left from something else that opened a
  file, such as an add-in's `Editors.Open`, and `afterReveal` does the same wait for
  anything else. Measured: `xyz` typed at 3:1 of `Haystack.twin`, 0.3 s after opening it at
  4:9, went in as `x` at 3:1 and `zy` at 4:9; after the fixed `openFile` it went in as `xyz`
  at 3:1. The IDE's side of it is in BUGS-TO-REPORT.md.

**The connection itself changed in three ways.** They were the gaps item 1 found in
`tbbuild`, and they matter more once a harness clicks into dialogs on purpose:

- **Every CDP call has a time limit**, thirty seconds unless a call passes its own, and a
  connection that closes fails its waiting calls at once. Before, a page blocked by a dialog
  or a synchronous host call hung the caller for good. Measured: on a page an `alert()` was
  blocking, a call with a three-second limit failed after 3.0 s, with a message naming the
  likely causes.
- **`attachIde` records and dismisses every javascript dialog**, in `c.dialogs`, after
  sending `Page.enable`. `tbbuild` has always listened for dialogs, but nothing sent
  `Page.enable`, and without it CDP reports none, so its list could never fill. Measured:
  an `alert()` opened from the page was recorded with its type and text, and dismissed, and
  the page answered again. The IDE only ever calls `alert()`, from 37 places, so every
  dialog is accepted; a `confirm()` or `prompt()`, which only an add-in could open, would be
  cancelled.
- **An alert that opened before the connection existed cannot be answered.** Measured:
  `Page.enable` got no answer while it was open, the connection was told of no dialog, and
  `Page.handleJavaScriptDialog` replied "No dialog is showing" while the page stayed
  blocked. `attachIde` marks such a page (`c.pageBlocked`), and a compile that then never
  reports its project open says why, instead of looking like a slow compile. The IDE's
  candidates are its "IDE startup failure" alert and "Bad command line syntax.", which
  `launchIde`'s single argument never provokes; `--show` puts either where it can be read.

**Verified:** after the connection changes, the port check and the association rule, the
14 fixture cases gave output identical to before, and a full `examples.bat` passed 1,119 of
1,119 and left nothing in the registry under its folder, with another session's harness
runs going at the same time.

## An add-in under test opens nothing

**Every IDE the harness starts has `TB_ADDIN_TEST=1` in its environment**, set by
`launchIde` (`ADDIN_TEST_ENV` in [tb-ide.mjs](scripts/lib/tb-ide.mjs)). An add-in that sees
it does nothing outside the IDE and prints each such action to the DEBUG CONSOLE instead:
`open <url>` for a URL it would have opened in a browser. A browser started from an IDE on
the private desktop would open where nobody can see it, and outlive the run. `openedUrls` in
[tb-operate.mjs](scripts/lib/tb-operate.mjs) reads those lines back, and with a mark from
`consoleMark` only the ones printed after it; `readConsole` takes the same mark as `since`,
and `buildProject` now reads its build log that way.

**Every IDE, not only the add-in runner's.** `tbbuild`, `tbrun` and `examples.bat` start the
real install, whose compiler loads whatever add-ins the user has put in its `addins`
folders or in `%APPDATA%\twinBASIC\addins` (P6), and none of those IDEs is on a desktop
anybody watches. A caller can still set the variable otherwise, or leave it out by passing
`undefined` as its value: Node leaves such a variable out of a child's environment even
when its own environment has it (measured).

**Measured on BETA 983 (P10 in WIP.HelpAddin.md):** a probe add-in printed the variable
from `Host_OnProjectLoaded`. Through `launchIde` it read `1`, from `Environ$` and from
`GetEnvironmentVariableW` alike, and with the variable left out both said it was unset. The
path it travels: `tb-launch.ps1` calls `CreateProcess` with no environment block of its own,
so the IDE inherits the launcher's; the IDE starts the compiler, `twinBASIC_win32_noDEP.exe`,
as a direct child; and the add-in runs inside the compiler's process --- the process id it
read was the compiler's. The toolbar's restart button ends the compiler and starts a new
process, and the add-in that process loaded read `1` too. The control,
`WEBVIEW2_USER_DATA_FOLDER`, arrived with the lane's port in it.

**The console gives back exactly what was printed, a whole line at a time.** `PrintText`
stores an add-in's text escaped, `<b>` as `&lt;b&gt;` and `&` as `&amp;`, and `readConsole`
decodes it, so a URL with `&` in its query string comes back unchanged. Text that continues
a line left open is the exception: the IDE escapes it twice (under `tbrun` above). Each
`PrintText` ends its own line, so it is affected only when something else, such as a
program's `Debug.Print ...;`, left a line open just before it. `openedUrls` counts a line only when what
follows `open ` holds no white space: a URL has none, so an ordinary line that happens to
start with the word is not taken for one. A probe that printed `open this line names no URL`
beside a real one got the real one alone.

## The add-in test runner

**`addin-test.bat` runs [scripts/addin_test.mjs](scripts/addin_test.mjs) over the lanes in
[test/addin/lanes.mjs](test/addin/lanes.mjs).** A lane is one scenario file, a `node:test`
file, and the runner starts each in a process of its own (`node --test`), a few at a time
(`--jobs`, default 2), handing it its lane in `TB_ADDIN_LANE`: a DevTools port (`--port`,
default 9560, plus the lane's index), a work folder at `%TEMP%\tbaddin\<port>`, and the
install to copy. What the scenario does with that is
[scripts/lib/tb-lane.mjs](scripts/lib/tb-lane.mjs): it makes the lane's copy of the install
on first use, exports an install sample project (`addSample("Sample 15")`, the install only
read), builds an add-in and puts it in the copy (`addAddin`), and opens a project (`open`),
one IDE at a time, refusing one that does not compile. `close` ends the IDE and then fails
the lane if the compiler crashed meanwhile, or if a javascript dialog opened that the
scenario did not take out of `c.dialogs`, since the IDE opens one only on an error path;
then it deletes the copy. Run outside the runner, a scenario file skips itself, so a bare
`node --test` never starts an IDE.

**A process per lane, not `node:test`'s own concurrency.** `node --test` can run files in
parallel, but it cannot hand each file an environment of its own, and the runner has to
choose which lanes may run together (below). A lane's output is held until it ends and then
printed whole, so two lanes' reports never interleave. `--timeout` (default 600 s) ends a
lane still running; its process's job takes the IDE with it.

**The runner owns the registry, and checks it afterwards.** It calls `startTidy` with every
lane's folder before the first lane starts, so the lanes inherit `TB_REGISTRY_OWNER` and
leave the registry alone, and `finishTidy` once the last has ended. Then it checks rather
than trusts: no project-state or recent-list entry may name a lane's folder, a second sweep
of the remembered build targets must find none, and the add-ins' settings must be as
recorded. Any failure is exit code 2.

**An add-in's own settings are the runner's too.** `SaveSetting` writes under
`HKCU\Software\VB and VBA Program Settings\<app>`, the same key as any installed copy of the
add-in, so a lane names its add-ins' application names in `lanes.mjs` (`settings`). The
runner records those keys before the first lane starts, deletes them before each lane that
names them, so that the add-ins start from their defaults, and puts them back at the end.
Two lanes that name the same application never run at once, because each deletes the key
its add-in reads. An application key that appears during the run and that no lane named is
reported, since it is almost certainly an add-in whose settings will stay behind; the
report names it and leaves it. `settingsKey` refuses the IDE's own `twinBASIC_IDE`, which
holds all of the IDE's settings and which the tidy puts back only value by value.

**Every IDE a lane starts has an `APPDATA` of its own**, `<work>\appdata`. The compiler
also loads the add-ins in `%APPDATA%\twinBASIC\addins\<arch>` (P6 in WIP.HelpAddin.md),
from the folder the page sends it, which the page makes by expanding `%APPDATA%` in the
IDE's own environment. So `Lane.open` and `Lane.buildAddin` start their IDEs with `APPDATA`
naming the lane's folder, and each checks, once the compile has settled, that the page's
folder is under it (`checkAddinsRoot` in `tb-ide.mjs`): an IDE that stopped taking the
folder from its environment may have loaded the user's add-ins, and the lane fails rather
than test something else. The check runs after the fact, because the add-ins load
while the project opens.

Until P6 was answered the runner refused to start while the user's folder held a DLL. It
no longer needs to, and the user no longer has to move their add-ins out to run the tests:
with `APPDATA` pointed at a stand-in folder holding the Global Search add-in, the Sample 10
and P6 lanes both ran and passed, and the P6 lane's IDE loaded its own probe alone. The
runner never writes to the user's folder. `tbbuild`, `tbrun` and `examples.bat` keep the
user's `APPDATA`: they build the user's projects, and the same folder holds the packages the
user has downloaded. `TB_ADDIN_TEST` is what keeps a user's add-in from acting outside the
IDE there.

**Ctrl+C ends the lanes and still puts everything back.** The runner handles `SIGINT`: it
starts no more lanes, ends the running ones, waits, and tidies. Testing that took two tries.
Windows passes a process's "ignore Ctrl+C" setting on to the processes it starts, and every
process started from the session that ran the test had it, so the first `CTRL_C_EVENT`,
sent with `GenerateConsoleCtrlEvent` into the runner's own hidden console, reached nothing;
a bare Node listener started the same way did not see it either. Started through a
PowerShell that first cleared the setting (`SetConsoleCtrlHandler(NULL, FALSE)`), the
listener saw it, and so did the runner: 16 s in, with both lanes' IDEs open, it ended both
lanes and put everything back within two seconds.

**The scenarios.** Two finish Stage 1 of WIP.HelpAddin.md, and the others are Stage 2's
probe lanes:

- [test/addin/sample10.test.mjs](test/addin/sample10.test.mjs): the add-in loads and prints
  its five `OnProjectLoaded` lines, naming the project; its image button's message box; its
  tool window; the three-button message box answered `button2`, then the follow-up
  answered `ok`; a notification; a DEBUG CONSOLE line, read from a mark.
- [test/addin/sample15.test.mjs](test/addin/sample15.test.mjs): the add-in loads; its tool
  window opens with every option off, which also shows the runner deleted its saved
  settings; a typed search lists all nine matches in both files of
  [test/addin/host](test/addin/host), each with its `[line,column]`; a click on a match
  opens `Haystack.twin` at 4:13; and Match case narrows the results to seven and is saved,
  read back through `savedSettings`.
- [test/addin/keys.test.mjs](test/addin/keys.test.mjs), P1 and P2: it builds its own probe
  add-in from [test/addin/probes/keys](test/addin/probes/keys), which registers eight key
  strings and prints a line to the DEBUG CONSOLE when one fires. It checks that they were
  stored lowercased, then presses each key with nothing focused, followed by `q`, whose
  shortcut always fires: once `q`'s line is back, a key that has printed nothing has fired
  nothing. Each press waits 600 ms first, so that no press is paired with the one before
  it; the last P1 test does the opposite on purpose. Then F1 and a letter in the code
  editor, and F1 with signature help showing, from Ctrl+Space inside `FindTheNeedle(`.
- [test/addin/panes.test.mjs](test/addin/panes.test.mjs), P3, P4 and P12: its probe add-in,
  from [test/addin/probes/panes](test/addin/probes/panes), opens a tool window holding HTML
  set through `innerHTML`, an element given `onclick` as a property, two ways of raising a
  custom event from plain HTML, and an iframe whose `src` is `TB_PANES_URL`. The scenario
  hands the IDE that variable through `Lane.open`'s `env`, which `Environ$` then reads in
  the add-in (P10), and serves the pages itself, from an HTTP server of its own on both
  loopback addresses of one port, recording each request's `sec-fetch-dest`. The server is
  on `localhost` because the IDE's page is: the frame is then on the same site, in the
  page's process, where `Page.getFrameTree` lists it and `Page.createIsolatedWorld` reads
  its document without touching the page's script. A frame on another site is a DevTools
  target of its own, type `iframe` in `/json/list`, which the parent's frame tree does not
  list --- the lab check of the live site had to attach to it separately. The scenario
  turns on `Runtime` to record page exceptions, which is how P12's `TypeError` is seen. Its
  last test is not a numbered probe: a third button opens two tool windows given no id,
  which turn out to be one window, as P9's lane first suggested.
- [test/addin/symbols.test.mjs](test/addin/symbols.test.mjs), P5: no add-in. It opens the
  project in [test/addin/probes/symbols](test/addin/probes/symbols), which references tbIDE
  and is never built, and asks the compiler's language socket about names in it: hover,
  Go To Definition, signature help and a completion's details, each with the parameters the
  IDE's own code sends. `lspSocket.request` answers through a callback, so each question is
  one `Runtime.evaluate` of a promise. Positions are found in the source by text, so an edit
  to the probe project does not shift them.
- [test/addin/ideserver.test.mjs](test/addin/ideserver.test.mjs), P13: no add-in either. It
  writes fifteen files under `ide\p13\` in the lane's copy before the IDE starts, and one
  more after, then fetches each from the page, relative to its base URL, and compares a
  SHA-256 of the body with the file's. The guard before the writes checks that the folder
  is inside the lane's own folder, since the real install's `ide\` is one wrong path away.
- [test/addin/appdata.test.mjs](test/addin/appdata.test.mjs), P6: it builds the AppDataProbe
  add-in from [test/addin/probes/appdata](test/addin/probes/appdata) with `Lane.buildAddin`,
  which leaves the DLL in the work folder, and copies it into the lane's own `APPDATA`
  rather than the copy of the install. The probe prints the file it was loaded from, found
  with `GetModuleHandleExW` on one of its own functions, and the `APPDATA` it sees. The last
  test points the page's `commonFolderRootPath` at a second folder and restarts the
  compiler with the toolbar's button, so the new compiler inherits the old `APPDATA` but is
  sent the new folder.
- [test/addin/arch.test.mjs](test/addin/arch.test.mjs), P7: it builds the ArchProbe add-in
  from [test/addin/probes/arch](test/addin/probes/arch) twice, with `Lane.buildAddin`'s
  `arch` set to each target, and puts each build in both add-in folders of its bitness, the
  copy's (`Lane.placeAddin`) and the lane's `APPDATA`'s, under two names. The probe prints
  its bitness, from `LenB` of a `LongPtr`, the process's executable and its own file. The
  scenario opens the host, switches it to win64 and back with `Lane.setBuildTarget`, and
  after each checks which copies loaded.
- [test/addin/reload.test.mjs](test/addin/reload.test.mjs), P8 and P9: it builds the
  ReloadProbe add-in from [test/addin/probes/reload](test/addin/probes/reload) as it is and
  again from a copy with its `BUILD` constant changed, so the two builds name themselves in
  everything they add to the IDE. With build A loaded, it tries to overwrite and delete the
  file, renames it aside, and restarts the compiler (`Lane.restartCompiler`); then it puts
  build B in its place and restarts again. After each step it reads the page's toolbar
  buttons, `addinKeys`, `toolWindowsById` with each window's body and empty body, and a
  press of Shift+F1. Whether the add-in's `Class_Terminate` runs is written to a file,
  `TB_RELOAD_FILE`, not to the DEBUG CONSOLE, and an object the add-in drops as it loads
  shows that a `Class_Terminate` that does run reaches the file.
- [test/addin/entry.test.mjs](test/addin/entry.test.mjs), P14: it builds the EntryProbe
  add-in from [test/addin/probes/entry](test/addin/probes/entry) once, reads its exports with
  `dllInfo`, and writes four copies with the one export name patched in place: the plain
  name, `_v2`, `_v3` as built, and `_v4`, none longer than the original, with NULs after
  it. The export table has one name, so its sorted order, which `GetProcAddress`
  searches, cannot change.

**Measured on BETA 983:**

- Both sample lanes pass, in about 25 s together: each is an add-in build of about 10 s, a
  host IDE of about 9 s, and 2 s of scenario. With the two probe lanes, the four take 57 s
  at the default two at a time: the keys lane is 28 s, about 9 s of it pressing keys, and
  the panes lane 23 s. All seven take 73 s: the symbols and ideserver lanes, which build
  nothing, about 9 s each, and the appdata lane 18 s. All ten take 2 min 21 s: the arch
  lane 56 s, with its two builds and two switches of target, the reload lane 47 s, with its
  two builds and two restarts, and the entry lane 19 s.
- The runner does not compare the IDE's own `IDESettings`, so that was done by hand around
  the panes lane, whose floating tool window has a persistence id: all 13 values were
  identical afterwards.
- Around a run, the whole registry comparison was identical: `ProjectState`, the recent
  list, the association keys, all 13 `IDESettings` values compared through hashes, and the
  remembered build targets. The run was repeated with the user's projects planted in the
  recent list, two of them and then 21, identical both times.
- With Global Search settings planted beforehand (Match case on, and one extra value), the
  lane began with every option off, and the key came back exactly, the extra value
  included. With `settings` taken out of `lanes.mjs`, the run failed with exit code 2 and
  named `GlobalSearchAddIn`.
- An `--only` that matches nothing was refused with exit code 2, and so, until P6 was
  answered, was a DLL in a stand-in `%APPDATA%`; now the lanes run beside it, and the P6
  lane's IDE loaded its own probe alone. `--timeout 8` ended both lanes mid-build, and left
  the registry identical and nothing running.
- Exporting the samples left the install's `projects` folder as it was, mtimes included.
