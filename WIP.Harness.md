# twinBASIC Documentation --- The Compiler Harness

How the twinBASIC compiler is reached without a person driving the IDE: getting
at the package sources, censusing what they contain, compiling a probe, and
capturing what one prints. Split out of [WIP.md](WIP.md), which keeps the
invocations and the operational rules under [Driving the twinBASIC
compiler](WIP.md#driving-the-twinbasic-compiler) --- this file is why they are
what they are.

Read it before changing `scripts/tbbuild.mjs`, `scripts/tbrun.mjs`,
`scripts/lib/tb-ide.mjs`, `scripts/lib/tb-cdp.mjs`, `scripts/lib/tb-launch.ps1`,
`scripts/lib/tb-registry.mjs`, `scripts/lib/tb-ide-copy.mjs` or
`builder/census_attributes.mjs`, and before concluding anything about twinBASIC
syntax from a sweep of exported sources.

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

[builder/census_attributes.mjs](builder/census_attributes.mjs) --- which sits under
`builder/` by deliberate placement rather than because it renders anything; it is listed in
`check_tree_fresh.mjs`'s `IGNORED_FILES` for exactly that reason, so editing it does not
mark every output tree stale --- does the export above for
every package of the current install and reports, per attribute, **which enclosing
construct and which kind of declaration it decorates**. No arguments needed; it finds the
newest `twinBASIC_IDE_BETA_*` the same way `tbbuild` does, caches the export by build
number, and re-uses it.

```sh
node builder/census_attributes.mjs --out census.md
node builder/census_attributes.mjs --attr Hidden          # one attribute
node builder/census_attributes.mjs --attr Hidden --dump-sites sites.json
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
CONSOLE, clicking, and ending the process tree. `tbbuild` and `tbrun` are command lines
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

Six things about the harness were learned by getting them wrong, and each is a comment in
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
  because nothing removes an entry from it: `NATIVE EXCEPTION`, then `restarting from
  MEMORY`, then a thread dump naming the file being parsed, which is what the exit-4 message
  reports.
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

### Capturing what a probe prints, not just whether it compiles

`tbbuild` answers *does this compile*. [scripts/tbrun.mjs](scripts/tbrun.mjs) answers *what
does this print*, which is the only way to settle a question no shipped source
demonstrates. It exists because one did: the width of a `Debug.Print` print zone, which
four documentation pages between them could not establish and which took ten minutes to
measure once there was a way to run code.

    node scripts/tbrun.mjs <source-dir>

It takes an **exported tree** rather than a `.twinproj`, stages a copy, pins the build path
in the copy, packs it, compiles it with the same library calls `tbbuild` makes, clicks
Build, then reads the DEBUG CONSOLE back over CDP. The probe is a module with a `[RunAfterBuild]` Sub, which the IDE runs once
the exe is linked. Reader-facing documentation is the [`tbrun.mjs` entry in
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

Three smaller things it knows, each of which cost a run:

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
leave everything as it was found**, and it takes three forms:

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
  installed, through a day of launches of that build. That it rewrites them when the path
  differs is inferred from that timing, not yet measured; a private copy of the IDE per
  test lane ([WIP.HelpAddin.md](WIP.HelpAddin.md), Stage 1 item 2) is the first thing that
  will test it.

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
  it started.

**Verified** by [scripts/check_tb_registry.mjs](scripts/check_tb_registry.mjs), which plays
out a run on a scratch key and checks every rule above, the guards and the ownership rule
included. It is not a gate: it needs Windows and a real registry, and the CI runners are
Ubuntu. Run it after changing `tb-registry.mjs`. End to end, the 14 fixture cases, run one
at a time, and a full `examples.bat` run leave `ProjectState`, the recent list and the
association keys exactly as they were, value for value.

## A private IDE for every lane

**The compiler loads every DLL in `<install>\addins\win32` or `\win64` as it starts.** A
test add-in put there would load into every IDE the user starts from that install, and two
lanes testing different add-ins could not share the folder at all. So the add-in harness
([WIP.HelpAddin.md](WIP.HelpAddin.md)) runs each lane on its own copy of the install, made
by [scripts/lib/tb-ide-copy.mjs](scripts/lib/tb-ide-copy.mjs), whose `addins` folders hold
exactly what the lane puts there.

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
