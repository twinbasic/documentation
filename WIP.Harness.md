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
`scripts/lib/tb-addin.mjs`, `scripts/lib/tb-click.mjs`, `scripts/lib/tb-operate.mjs`,
`scripts/lib/tb-lane.mjs`,
anything under `test/addin/`, or `scripts/census_attributes.mjs`, and before
concluding anything about twinBASIC syntax from a sweep of exported sources.

## Getting at the `.twin` sources

"Read the package's `.twin` sources" is the rule everywhere below, and the sources are not
in this repository. They are inside the `.twinproj` files an IDE install ships, and
[scripts/impexp.mjs](scripts/impexp.mjs) unpacks any of them without opening the IDE:

```sh
node scripts/impexp.mjs export <some>.twinproj <out-dir>
```

On BETA 983 and 995 alike that yields **820 `.twin` files**: 661 from the sixteen
packages under `packages/`, and 159 from the thirty-two sample and template projects under
`projects/` (`addins/` holds no `.twinproj`). The compiler accepts all of this code, which
makes it the strongest available evidence for what is legal syntax.

The tooling unpacks and packs in process, through `unpackProject` and `packTree` in
[scripts/lib/tb-project.mjs](scripts/lib/tb-project.mjs), which call impexp's
`exportProject` and `importProject`: the census and `build_package_api`, `tbbuild --build`,
`tbrun`, `check_examples`, `sweep_attributes`, `bug_repro`'s `pack`, and the add-in and IDE
lanes. The compiler executable's `export` verb writes the same tree: on BETA 995 the two
unpack the install's sixteen packages and thirty-two samples to identical trees, 1,633 files
byte for byte.

Only `bug_repro`'s `cli` mode, which runs a reproducer's own command line, and
`test/ide/export.test.mjs` run the executable's `import` or `export`. The tooling does not,
because:

- `import` exits 999 and writes nothing on a tree whose top-level `Packages` folder holds a
  folder, which is any project that embeds a package (twinbasic/twinbasic#841). The
  install's Samples 8, 17 and 23 and the VBCCR template are such projects; Sample 23 then
  fails its own build, because it has no `Sub Main`.
- Both verbs exit 0 after every failure they report, and only a last line of `... DONE` says
  one worked. impexp throws instead.
- Neither verb writes a path of 260 characters or more (the path-limit entry in
  [BUGS-TO-REPORT.md](BUGS-TO-REPORT.md)). impexp does.
- `import` packs a folder's files in reverse alphabetical order, and impexp in alphabetical
  order. The order can decide what compiles (the `static-ctor-args` entry in
  [BUGS-TO-REPORT.md](BUGS-TO-REPORT.md)), so a tree packed by the two can compile
  differently.

Anything that runs the executable follows two rules. **Use backslashes.** A folder named with forward slashes fails with
`output folder does not exist and could not be created` whether it exists or not, creates
nothing, and still exits 0. Given backslashes, `export` creates every missing level (tested
three deep, BETA 983 and 995). The project path must be a full one, because `export`
prefixes it with `\\?\`. And **redirect stdin** when looping (`</dev/null`), or the
executable consumes the loop's input and the second iteration never runs.

The samples matter as much as the packages: several constructs appear in exactly one sample
and nowhere else. `[PopulateFrom]`'s only real use in the whole corpus is in Sample 22, and
the only prose anywhere explaining `[WithDispatchForwarding]` is a comment in Sample 5.

> **A census of `[Name` at the start of a line over-reports.** twinBASIC spells an escaped
> identifier the same way --- `[_HiddenModule].vbaObjAddref(…)`, `[_MAX] = 0` --- so an
> expression can read as an attribute. What separates them is the tail after the closing
> bracket: an attribute is followed by a declaration, an escaped identifier by `.`, `=` or
> `(`. Argument text needs stripping too, or `[Description("Sets or returns, given …")]`
> contributes an attribute named `given`.

**A worked instance: export settles what the pages cannot.** Whether a form's code uses
bare event handlers is a question one `export` settles --- every form code-behind in the
shipped samples is:

```
[Description("")]
[FormDesignerId("EAEAEAEA-EAEA-EAEA-EAEA-EAEAEAEAEA02")]
[PredeclaredId]
Class ChildBlue
    Private Sub Cascade_Click()
    ...
End Class
```

So a form's `.twin` file **is** a `Class` with designer attributes, a page that wraps
its samples in one is right, and a bare-handler page shows an excerpt. `Form_Load` is what the
samples use; `UserForm_Initialize` appears in none of them. The pages are the thing in
doubt, so only the export can decide.

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

Against BETA 995: **661 files, 9,713 attribute sites, 55 distinct attributes**, and every
one of the 55 is already in `Attributes.md` --- the "used but undocumented" section comes
back empty. Sixteen documented attributes are used by no package. That is not a defect, but
the census offers no evidence for their `Applicable to:` lines, and a probe is the only
check available.

The census unpacks with impexp, which throws on a failure, so a partial export is never
scanned as though it had finished: a package that fails is removed from the cache and left
out of the census.

**A census is evidence, not applicability, and the two disagree in both directions.** The
corpus contains no use of `[Hidden]` on a whole `Class`, yet the compiler accepts one; it
contains plenty on Class and Interface *members*, and the compiler refuses the same
attribute on the `Interface` lines inside a `CoClass` (TB5155). Neither fact is reachable
from the other tool. `gen_attribute_probes.mjs` records the converse trap under
`[RedirectToStaticImplementation]`: a census grouped by *declaration keyword* said "a
Property Get, a Function and a Sub", and the probe returned TB5155 because all 82 uses are
inside an Interface. Group by enclosing construct.

**Seven ways a sweep of this corpus gets a wrong answer**, each measured, and each a
comment in the file:

- A **line matcher misses 292 of 7,604 attribute lines (3.8%)**, because
  `[Description("..." & vbCrLf & _` closes several lines later. The miss is silent, so the
  count still looks plausible.
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
  two attribute groups (VBA/Strings.twin; 142 sites), or a `#If` between an attribute and
  what it decorates (DTPicker.twin).
- **The block stack is where silent misattribution lives.** Four UDTs declare a field
  called `Type As Long`, which reads as an opener that never closes and swallows the rest
  of the file --- one put 368 `Declare`s inside a phantom `Type`. `Module [_HiddenModule]`
  names its block with an escaped identifier, so a bare-identifier pattern misses the open
  and its `End Module` 1,277 lines later pops somebody else's block. `NotDispatchable`
  is a modifier, and a modifier the list does not know has the same effect. An
  `Interface X` line inside a `CoClass` is a **member reference with no body**; pushed
  as a block it eats the `End CoClass` after it (31 files).
- **Do not assume a row is impossible.** `Type / DeclareWide` looks like proof of a stack
  fault and is a real construct: `CustomControls.twin`'s `Type SerializeInfo` has a dozen
  `DeclareWide` members.

Anything the census cannot resolve is **reported, never bucketed**: a census that hides its
own confusion publishes a wrong number with nothing to notice it by. The bar is an
unresolved count of **0**, which it currently is; a non-zero count is a scanner bug, not a
corpus oddity.

## Sweeping every attribute at every site

A census says where the packages *use* an attribute, and `gen_attribute_probes.mjs` probes
only the targets `Attributes.md` already claims, so an entry that is too short stays too
short: an entry written from the two targets someone tried, a Sub and a Const, says
"constants in a Module" and never meets the API `Declare` the attribute also takes.
[scripts/sweep_attributes.mjs](scripts/sweep_attributes.mjs) asks every question --- every
name (the page's, the compiler's token table's, `--names`) at each of about 60 sites in
[scripts/lib/attribute-sites.mjs](scripts/lib/attribute-sites.mjs), in each argument shape ---
and lays the answers against the page. Its reader-facing description is
[Tools and Scripts](docs/Documentation/Tools.md#sweep-attributes); this is why it is built as
it is.

**Against BETA 987: 34,526 probes in 134 builds, 8 to 16 minutes on four lanes.** That is
the whole matrix; nothing in it is slow enough to need sampling. **A run of one name is a
minute or a few, not always one:** an attribute the compiler allows once per project
(`[RunAfterBuild]`, `[RunBeforeStartupObject]`) goes in one probe per batch, so it needs
about a hundred builds by itself.

**The token table is a string, and it holds the names you cannot guess.** The compiler binary
has one 2,496-character run of 261 pipe-separated identifiers, from `On|Off|Explicit` to
`UserDefinedTypeIsAnAlias`, with `DllExport|ComExport` in the middle of it. It mixes
keywords, attributes and object members (`Debug`, `Circle`, `PSet`), so a name in it is only a
candidate. Swept, exactly one name the page does not document is accepted anywhere:
`[PropertyPage]`, at eighteen sites, all of them members of a Class or an Interface. The
other 193 are refused at every site.

**Six things the sweep has to get right, each of which gives a wrong report when missed:**

- **`parseCli` camel-cases its keys.** `values["dry-run"]` is `undefined`, so `--dry-run` is
  ignored and a "dry run" becomes a full four-lane sweep. Read `values.dryRun`; run a new
  tool that takes a hyphenated option once with each of them before trusting it.
- **A control must be refused for a site to mean anything.** An unknown name is built at every
  site, and a site whose control *compiles* is voided. An Enum body accepts any own-line
  `[...]` --- `[ClassId("guid")]` and `[Hidden(True)]` included, neither of which can be a
  member name --- so what it does with the line is unchecked, and nothing accepted there is
  evidence. Inline, `[Name] X = 1`, the compiler refuses every attribute, `[Hidden]` included,
  though the page documents it on an Enum member. An Enum member target is therefore reported
  as one the sweep cannot test, which is true. (The mechanism is not established; only the
  behaviour was measured.) A local variable is different: an own-line `[Name]` in a Sub is a
  *call* statement, so that variant is dropped and only the inline one is kept.
- **A probe that draws what the control draws is a refusal, whatever the code.** The signature
  compared has the attribute's name (whole word, any case) and the probe's own generated names
  (`S000062`, `S000062_U`) taken out, or the control's message never equals the probe's.
- **What a canary must draw is fixed in the script.** Reading it from the preflight lets a
  build that contains the very masking the canaries exist to catch calibrate the check to it.
  The tool builds the canaries alone first and stops unless they draw what is recorded.
- **Batch by shuffle, and one probe per singleton.** `[RunAfterBuild]` is once per project
  (TB5114), read as acceptance if a second reaches the same batch, and `[PopulateFrom]` fills
  an enum with the same two members every time, and enum members are project-global. Member
  names are unique per probe (`Probe` becomes `S000062_m`) for the same reason.
- **A form nobody built cannot be refused.** A cell whose other forms were refused and whose
  one form able to pass never compiled is inconclusive, not refused, and the same holds for a
  run cut short.

**It finds compiler crashes the documentation never would:** a crash in a batch is
isolated by halving down to one probe beside the canaries, which is how a bare
`[PopulateFrom]` on an Enum is found to kill the compiler (twinbasic/twinbasic#2450; BETA 997
does not crash).

**Read the report's "accepted at most sites" section before believing an acceptance.**
`[Description]` is taken at 53 of 61 sites and `[Hidden]` and `[Restricted]` at 42: either
they apply nearly everywhere or the compiler tolerates what it does not check. The sweep
cannot say which, and neither can a clean build, which is also why *accepted but not
documented* is a list to read and not a list to copy into the page.

## Compiling a twinBASIC project without the IDE in front of you

Exported sources say what the compiler *accepts today*; they cannot answer a question no
shipped source happens to demonstrate. For those, something has to put the construct in
front of the compiler.

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
are 0 clean, 1 the project has errors, 2 the harness failed or the project file cannot be read,
3 the compile never settled, 4 the project crashes the compiler.

**A project file the IDE cannot read is refused before an IDE starts.** `tbbuild` reads the
container with impexp's reader (`checkProject`, in
[scripts/lib/tb-project.mjs](scripts/lib/tb-project.mjs)) and exits 2 within a moment,
naming the file and the fault. Without that, BETA 995 gives exit 0, a clean compile with no
rows, after the whole `--timeout` (66 s at `--timeout 60`) for an empty file, a file cut off
halfway and a file with its first byte changed, and exit 3 for a text file. The IDE answers
such a file with a message box, which nobody can see or answer on the private desktop. The
status bar never settles, and a wait that ends at its deadline is read as a compile with no
diagnostics, because `waitForCompile` does not report that it ran out of time. Only the
container is checked: a file that reads as a project and that the IDE still cannot load is
not covered. `launchOnDesktop`'s `dialogs: "close"` can record a box, but only by pressing OK
on it, `launchIde` does not ask for it, and the job it matches boxes against is absent under
`--keep`. Making `waitForCompile` say that it ran out of time would cover every such wedge,
and is not done.

**`--show` / `--hide`, and `TBBUILD_SHOW` for a whole session.** Hidden is the default. Its
cost shows only when something goes wrong: a wedged IDE on a private desktop is invisible to
the person debugging it. So `export TBBUILD_SHOW=1` while you are working interactively and
leave it unset for unattended runs; `--show` and `--hide` override it per invocation.

**How it works, in one line:** the IDE's user interface is a WebView2 page, WebView2 honours
`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`, so the IDE starts with a Chrome DevTools port and is
driven over CDP. The diagnostics come from the IDE's own *copy compilation error report*
walk, minus the clipboard write, so the text is exactly what that command would hand a human.
The CDP client is [scripts/lib/tb-cdp.mjs](scripts/lib/tb-cdp.mjs) --- raw rather than
puppeteer, because a pending `alert()` blocks the renderer and puppeteer's `connect()`
handshake talks to the renderer, so it hangs on exactly the state that needs recovering.

**How the wait for the compile ends.** Nothing in the IDE's window says that a compile has
finished. The harness watches the window --- the compiler's status, the four counters and
the Problems panel --- and the IDE page's own traffic through CDP. It stops once the traffic
shows the compile has ended and the window agrees: the same four counts, and a row in the
panel for each. Three rules keep that from ending a wait too soon:

- a compile that had already ended when the wait began does not count, so a wait that follows
  an Apply or an edit takes the compile after it, not the one before;
- a compile is believed only once it has been the latest for 300 ms, because every keystroke
  starts a compile of its own;
- a compile from before the compiler restarted --- after a crash, a change of target or the
  restart button --- never counts.

A project whose traffic never shows a compile ending falls back to waiting for the window to
read OPERATIONAL and stand still for five seconds, and so does a page that a dialog has
blocked. The reproducer `interface-extends-itself` is one such project: its compiler never
reports a result at all. The traffic wait takes about five seconds less per project than the
fallback: `tbbuild` on a one-file template takes 6 s, and a full `examples.bat` about 80 s
(BETA 995).

Known: **`--llvm`, four projects at a time, can leave a build hanging** (4 of 52 builds in
one run): the build starts and then reports nothing for 120 s. One at a time, the same
projects build. `examples.bat` builds a failed batch a second time for this reason; `tbbuild`
does not.

**The mechanics are one library, [scripts/lib/tb-ide.mjs](scripts/lib/tb-ide.mjs)**:
starting the IDE, attaching, waiting for the compile, reading the diagnostics and the DEBUG
CONSOLE, clicking, building, and ending the process tree. `tbbuild` and `tbrun` are command lines
around it, and the add-in test runner ([WIP.HelpAddin.md](WIP.HelpAddin.md)) is built
on it.

**A build is also a function, [scripts/lib/tb-build.mjs](scripts/lib/tb-build.mjs)'s
`compileProject`**, which is `tbbuild` without its command line and returns
`{code, message, rows, counts, dialogs, crashFiles, ...}`. `check_examples` and
`sweep_attributes` call it rather than starting `tbbuild` as a subprocess. A subprocess
costs no speed (about 100 ms against an IDE start of about 10 s), but each caller would parse
its JSON and stderr back, and a harness failure and a compile error would both arrive as an
exit code.

Running in one process gives four rules:

- **The function never tidies the registry and never exits.** The caller owns both; a tool that
  builds many projects calls `startTidy` once, and `tbbuild` does it for its one.
- **It ends its IDE with `shutdownIdeAsync`.** `shutdownIde`'s `taskkill` and its wait hold the
  event loop still (up to five seconds), which with four lanes lets the others' CDP timers run
  out with their answers unread in a socket. The sync version stays for the paths that end in
  `process.exit()`.
- **An uncaught exception ends every lane's work, not one child's.** `exitOnCrash(cleanup)` runs
  a cleanup first; `sweep_attributes` uses it to write the report of what it had learned
  (`salvage`), and `tb-cdp` drops a frame that is not JSON instead of throwing from an event
  callback.
- **The name.** tb-ide already exports a `buildProject(c)` that builds an exe through an open
  connection, and the notes below mean that one; the new function is `compileProject`.

Two further rules:

- **Resolve a relative project path before comparing it.** The IDE is given the resolved path
  and echoes it back, and the wait loop compares that echo with the argument; with the
  argument as typed, `tbbuild clean.twinproj` waits out its whole timeout and exits 3.
- **`tbrun` calls the library directly and never runs `tbbuild` as a child.** As a child
  without `--ide` passed on, the build could find a different install from the one `tbrun`
  packed with, and print the child's `ide-pid:` line for an IDE already killed.

**Do not reach for `--buildAndExit32` instead.** It exists, it is real (`parseCommandLine()`
reads it, and Personal Edition is refused by name), and it is useless unattended: **nothing
is written to stdout or stderr, ever**, it exits 0 with the `.exe` written when the error is
in code nothing calls, and for an error the build reaches --- an unknown procedure or type,
an undeclared variable, no `Sub Main` --- it does not exit at all: it sits on a "Please
wait…" dialog at 100% forever. It is silent, falsely green, and hangs on the one case worth
catching. Measured all three ways, on BETA 983 and 995 (the BUGS-TO-REPORT entry on
`--buildAndExit32`).

**It runs the IDE on a private Windows desktop, and that is not decoration.** A build tool
that seizes the keyboard mid-sentence is a build tool nobody runs while working. No window
style prevents it: the IDE calls `HostForceFocus()` from its own `window.onload`, so
`start /min` still brings the window to the front. A process on another desktop has no
foreground to take, and the compile does not care whether anything is on screen.

That is the one piece of the harness that cannot be JavaScript, because it is
`CreateDesktop` plus `CreateProcess` with `STARTUPINFO.lpDesktop` --- and the job object
calls ([The IDE runs inside a job](#the-ide-runs-inside-a-job)) --- and Node has no FFI
without a native addon.
[scripts/lib/tb-launch.ps1](scripts/lib/tb-launch.ps1) holds those calls. It is **not run
as a file**: `tb-ide.mjs` reads the text and runs it through
`-EncodedCommand`, so the default execution policy --- which refuses `.ps1` files on this
machine, and which is the same policy [BOOKPLAN.md](BOOKPLAN.md) records blocking `npx.ps1`
--- never comes into it, and no `-ExecutionPolicy Bypass` has to be recommended to anyone.
Its inputs arrive as environment variables, so there is no argument quoting to get wrong.
**The script itself arrives in one too** (`TBBUILD_SCRIPT`), and `-EncodedCommand` carries only a
one-line bootstrap that takes it out of the environment, so the launched program does not
inherit it, and runs it. The script cannot go through `-EncodedCommand` whole past about
12,000 characters: UTF-16 in base64 is 2.7 characters to each, a command line stops at 32,767,
and every launch then fails with `spawn ENAMETOOLONG`. An environment variable stops at 32,767
characters of its own; `launchOnDesktop` refuses a script over 30,000. The script also takes
`TBBUILD_STDOUT` / `TBBUILD_STDERR` (files for the program's standard output and error),
`TBBUILD_ARGS` (more of the command line, already quoted) and `TBBUILD_DIALOGS=close`, which
polls the private desktop every 250 ms for visible `#32770` boxes belonging to the program or
its job, prints each as `dialog <base64 of JSON {title, text}>` and presses its OK button:
`bug_repro`'s `cli` mode uses all four for a compiler that opens a modal box on a damaged project.

A launch that fails prints no pid, and its cause as one line on stderr, which `launchIde`
reports. Two rules keep the cause readable. With its streams redirected, PowerShell writes
progress records and errors to stderr as CLIXML (`#< CLIXML`, as `tb-registry.mjs` also
found, below), so the script silences progress and writes a failure itself, as plain UTF-8
text. And a Win32 error read from PowerShell is not the call's: PowerShell makes calls of its
own before the next statement runs, and a `CreateProcess` that had set 3 was reported as 203,
"The system could not find the environment option that was entered". Each call is made, and
its error read, in C#.

Seven rules about the harness, each a comment in the file:

- **Pass the project on the IDE's command line, and spawn with an argv array.**
  `parseCommandLine()` splits the raw command line on `" "` and pushes every token, so a
  *trailing space* becomes an empty second file argument and the IDE refuses the launch with
  `Bad command line syntax.` PowerShell's `Start-Process` appends exactly that space;
  `spawn(exe, [path])` does not. Loading through `root.loadProject` afterwards also works, but
  lets the IDE's no-project startup run first and flashes the splash and the New/Open Project
  dialog on screen.
- **Read every severity out of the problems panel, not the IDE's error-report helper.**
  The helper's walk calls `generateCopyPasteTextForProblem(node, true)`, and that second
  argument is an *errors-only* filter --- the function's body is `if (t && severity !== 1)
  return;`. The panel also hides hints and info by default (`hideGroup3` / `hideGroup4`).
  Reading through the helper, `rows` holds only errors while the status-bar counters hold all
  four, and the invariant below is **unsatisfiable on any project with a warning**: 0 errors
  and 2 warnings read as `0 rows against 0/2/0/0` and exit 3, which looks like a compile
  that never settled. The walk therefore clears the four group flags, reads severity, line
  and character straight off each node's custom data, and restores the flags --- all inside
  one synchronous evaluate, so the IDE never renders the intermediate state. This is the
  same lesson as `tbrun`'s DEBUG CONSOLE reading: **read the panel's backing data, not the
  view the IDE renders for a human.**
- **Read the counters and the diagnostic rows in one `Runtime.evaluate`.** Read as two calls
  they race: the compile can finish between them and give two diagnostics beside a zero error
  count. The harness refuses a sample where the two disagree rather than reporting either
  number.
- **Watch for the compiler going down, in the DEBUG CONSOLE and not in the status bar.**
  twinBASIC runs the compiler in the same process as user code, so a probe can crash it, and
  the IDE then restarts it three times before giving up. Untreated that is a silent
  two-minute wait; treated it is exit code 4. **Watching the status bar is not treating it.**
  The status does flap to UNAVAILABLE on the way, but the whole crash-restart cycle takes
  about 1.3 s against a 1 Hz sample, and after the third restart the IDE leaves the status at
  OPERATIONAL with the counters at zero --- byte-identical to a clean build. A 275-file
  project reads `0 errors, 0 warnings` and exit 0, reproducibly, while its quarters
  report 129, 0, 294 and 448 errors. The console is the record that sampling cannot miss,
  because nothing removes an entry from it: `NATIVE EXCEPTION` and `restarting from
  MEMORY`, three times over, with a thread dump naming the file being parsed from the second
  crash on, and that file is what the exit-4 message reports.
- **Poll for the crashed file's name; the first crash never carries it.** Only a compiler in
  TRACE-MODE writes the thread dump that names the file, and the IDE switches that on in
  answer to the first `NATIVE EXCEPTION` and passes it to a compiler as it starts, so the
  restarted compiler's crash is the first to name one. A single re-read of the console after
  the crash misses the name 31% of the time (BETA 983: the second crash comes 1.6 to 1.9 s
  after the first on an idle machine, 1.8 to 3.0 s with four IDEs compiling at once).
  `awaitCrashName` polls instead, every 250 ms for up to 5 s: it misses none and needs
  at most 3.25 s; the add-in lanes' `closeProject` uses it too. If a run ever has a second
  crash without a name, the third crash names the file as well, but under four lanes it came
  as late as 6.4 s, after the poll has given up.
- **Kill the process tree, forcibly.** An IDE showing a modal ignores a normal close, and the
  launcher is not the process holding the compiler, so `taskkill /T /F`. A tree kill still
  misses a process started while it runs, which a compiler restart can be; the job the IDE
  runs in is what catches that ([The IDE runs inside a job](#the-ide-runs-inside-a-job)).
- **Give each probe project its own `project.id`.** Two sharing one confuses the IDE's
  recents list.
- **Adopt the IDE's pid; do not assume it is the child.** Launched through the desktop
  helper the IDE is not a descendant of anything the harness spawned, so the helper reports
  the pid on stdout and the harness kills that.

**A crashing probe is a real risk.** Four `Debug.ExecuteHostCommand` argument-shape probes in
one project took the compiler down repeatedly. Keep a question that might crash the compiler
in a project of its own, so the answer is attributable and one bad probe cannot cost the
other thirty their run.

### Why it drives the WebView rather than the compiler directly

The obvious improvement is to cut the browser out: the compiler has websockets, so why go
through a UI at all? **It can be done, and the harness does not do it yet.**

The IDE is three processes, and their command lines say how they relate:

| process | command line | role |
|---|---|---|
| `twinBASIC.exe` | `<project.twinproj>` | shell; hosts the WebView2, and the only one given the project |
| `twinBASIC_win32.exe` | `--ide=<shell pid>` | serves `ide/` over HTTP on an ephemeral port |
| `twinBASIC_win32_noDEP.exe` | `--compiler=<window handle>` | the compiler; the page talks to it over websockets |

The page's websockets carry everything the window shows about a compile, the diagnostics and
their counts included.

**The compiler chooses its own address and key, and tells the process that started it.** So
a program that starts a compiler itself can connect to it, and `--compiler=` need not name a
real window for a compile or a build (BETA 995).

What stands in the way is the work the page does over those connections. It loads the
project, gives the compiler every package the project needs, answers what the compiler asks,
and works out when a compile has finished. A client without the WebView has to do all of
that itself, in a protocol that is the IDE's own and may change with any beta, while the IDE
always speaks its own build's. So the harness drives the IDE.

Watching the page's traffic is another matter: CDP shows it to the harness with no key, and
the wait for a compile ends on it (*How the wait for the compile ends*, above). The
diagnostics still come from the IDE's own report walk.

### One project per IDE, and that is the scaling unit

**Reusing a live IDE for a second project does not work.** `root.loadProject` against a
running IDE wedges it: `Runtime.evaluate` stops returning while browser-level CDP still
answers, and no javascript dialog is pending --- so the renderer is blocked inside a
synchronous host call, not on something dismissable. The IDE holds one project at a time and
closing the previous one is part of that path.

So the cold start is not overhead to be optimised away; it is the unit of work. `tbbuild`
starting a fresh IDE per project is the design, not a convenience.

**It costs less than it sounds like.** Measured: **6 to 8 seconds per project, and flat in
project size** --- a one-file template and the template that carries the whole of VBCCR both
land at about six seconds, because what is being paid for is IDE startup and not compilation.
Time it before quoting it.

**Concurrency works and is the route to a fast probe suite.** Distinct `--port` values give
distinct DevTools ports, WebView2 user-data folders, temp folders and private desktops, so instances do
not collide. Three projects: **26 s sequentially, 10 s in parallel**, with each run
reporting its own diagnostics and no bleed between them.

**A port another IDE holds is refused.** The harness attaches to whatever page answers on
its port, so an IDE already there --- another lane's, or another session's, since several
sessions run this harness on one machine with ports of their own choosing --- would be the
one read and operated. `launchIde` binds the port for a moment first, and gives up after
ten seconds with a message saying which port and why. The wait is for the lane's own
previous IDE: after `shutdownIde` a port comes free in about 15 ms, and once took two
seconds.

### Capturing what a probe prints, not just whether it compiles

`tbbuild` answers *does this compile*. [scripts/tbrun.mjs](scripts/tbrun.mjs) answers *what
does this print*, which is the only way to settle a question no shipped source
demonstrates (for example the width of a `Debug.Print` print zone).

    node scripts/tbrun.mjs <source-dir>

It takes an **exported tree** rather than a `.twinproj`, stages a copy, pins the build path
in the copy, packs it, compiles it with the same library calls `tbbuild` makes, clicks
Build, then reads the DEBUG CONSOLE back over CDP. The staging is
[scripts/lib/tb-project.mjs](scripts/lib/tb-project.mjs), which the add-in harness shares.
The probe is a module with a `[RunAfterBuild]` Sub, which the IDE runs once the exe is
linked. Reader-facing documentation is the [`tbrun.mjs` entry in
Tools.md](docs/Documentation/Tools.md).

**The script owns the tree because of a silent trap.** A project whose `project.buildPath`
is still the default `${SourcePath}\Build\...` template opens a native *Save* dialog when
you build it. On the private desktop that dialog is invisible and unreachable, so the build
simply never happens --- and **the WebView2 renderer stays responsive throughout**, so
`Runtime.evaluate` answers normally and every health check says the IDE is fine. `tbrun`
pins the path in its staged copy, which is why it insists on a source tree it can edit
rather than a packed project it cannot.

Rules it follows:

- **`element.click()` on `#buildIcon` does nothing.** It is a plain DIV behind the IDE's own
  pointer handling and needs real `Input.dispatchMouseEvent` presses at its centre.
- **Build is pressed through `pressBuild` (`tb-ide.mjs`), which waits up to 60 s for the
  page globals `licenceIsSet` to be true and `lockUICount` to be 0.** `tbBuild_Start` waits
  only about five seconds for the compiler to answer the licence key's validation, which
  `afterSocketsAreConnected` resets on every compiler connection, and then writes "[BUILD]
  failed due to licence error" and builds nothing. `#appOverlay` is a transparent element
  over the whole page, shown while `lockUICount` is above zero: by every modal dialog, the
  "Compiling..." and project-loading progress dialogs among them, and by an open menu. A press
  then fails with "its centre is covered by #appOverlay" (both were seen once each in a full
  `bug_repro verify`). A licence still unset after the wait throws; an overlay still up is
  left to `click`, which names it.
- **A click that fails saves a picture of the page** (`pagePicture` in `tb-click.mjs`, CDP
  `Page.captureScreenshot`, which works on the private desktop) under `%TEMP%\tb-click\`, and
  its error names the file.
- **Read the console's backing array, not the pane.** The DEBUG CONSOLE is a
  `createListView()`, which keeps only the rows that fit in the DOM, so scraping its
  `innerText` returns the *tail* of a long probe and looks exactly like a complete capture
  (a probe printing 120 lines came back with 11).
  `debugConsoleContent.dataNodes` is the whole log (`addItem()` appends and nothing ever
  removes, so only `Debug.Cls` empties it), and the walk `tbrun` does over it is the IDE's
  own *Copy All* minus the clipboard write. The timestamp comes off in the same step,
  because it is a nested `<span>` in each entry rather than a line of its own, so `--raw`
  is a different slice of that string. Do not "fix" the truncation by turning *Show
  Timestamps* off: that option only sets a CSS variable, and the row budget does not move
  --- see [WIP.ExamplesBuild.md](WIP.ExamplesBuild.md) for the measurement.
- **A probe must start with `Debug.Cls`.** The IDE logs its own build to the same console
  and the linker writes there *after* the build, so without a clear you capture your output
  interleaved with `[LINKER]` lines. The script warns rather than guessing which lines are
  yours.
- **A failed build is not output.** A build that fails after a clean compile never runs the
  probe, and the IDE's own log stays in the console: `[BUILD] Starting...`,
  `[TYPELIB] failed to finalize typelibrary.  Disk error?`, `[LINKER] FAILED to create type
  library`, `[BUILD] failed`. `tbrun` exits 2 on any line `buildProject`'s `BUILD_FAILED`
  matches: `[BUILD] failed`, `[LINKER] FAILED`, `[BUILD] ERROR` and `[LINKER] compilation
  (codegen) error`. The codegen case builds with `[LINKER] SUCCESS`: a `[RunAfterBuild]` Sub
  that shifts a `Single` (BUGS-TO-REPORT.md) adds `[BUILD] Executing 'DocSamples.Probe.Run'...`
  and the codegen line to the console, and nothing in the Sub runs. The type-library failure
  comes from IDEs sharing one temp folder; `launchIde` gives each its own (see
  WIP.ExamplesBuild.md).
- **A callee's code-generation failure is erased by the probe's own `Debug.Cls`.** When the
  failing shift is in a procedure the probe calls, the codegen line naming that procedure
  comes straight after the `[BUILD] Executing` line, before the probe's first statement runs.
  The probe's `Debug.Cls` erases it, and the probe prints what comes before the call and stops
  there. (BETA 983 and 995: with `Debug.Cls` the probe prints exactly its lines; without it
  `tbrun` warns and the build log lines precede them; exit 0 either way, without the guard
  below.) So `tbrun` wraps the page's global `clearDebugConsole()` before it presses Build,
  and keeps what each clear erases (`keepClears` in `tb-ide-console.mjs`). A `BUILD_FAILED`
  line in that record after the last `[BUILD] Executing` line exits 2, naming the line and
  printing the partial output. `main.js` calls that function by name from the compiler's
  `event_clearDebugConsole`, which `Debug.Cls` raises, from the pane's Clear command, and on
  closing the project; no other path that empties the console was found. The IDE does not
  clear the console when a build starts, so the probe's first `Debug.Cls` erases the build log
  from `[BUILD] Starting...` on. `event_clearDebugConsole` writes an empty line after its
  clear, so the record of a second `Debug.Cls` begins with one.
- **`tbrun` exits 4 when the compiler crashed**, as `tbbuild` does. A crash and a failed
  build after a clean compile are different faults with different remedies (rerun the
  second, isolate the probe for the first), and `check_examples` isolates a sample on
  `tbbuild`'s 4. `tbrun` exits 3 for no output at all, and 2 for a compile that never
  settled, which `tbbuild` reports as 3.
- **`tbrun` exits 5 when the probe ended before it returned.** The quiet period cannot see
  it: on BETA 995, `Err.Raise` with no handler in a `+llvm` procedure ends the run with
  nothing in the console. `End` does the same, and so does an unhandled error in plain code,
  in the same time as a probe that returns (20.7-21.9 s over three runs on BETA 995, against
  18.6-20.4 s). `lib/tb-probe.mjs`'s `wrapProbe` moves the attribute, blanked to spaces so
  diagnostics keep their positions, to a Sub appended to the same module, so a Private probe
  Sub can still be called; that Sub prints a sentinel after the call. A probe that leaves a
  form loaded returns too: the IDE then prints `[DEBUGGER] Waiting for remaining forms to
  close...` after the sentinel, which `sentinelIndex` allows and `tbrun` prints (BETA 983
  and 995). `check_twin_parsers` has fixtures for both.
- **`tbrun --exe` exits 6 when the exe exited with a code other than 0**, when the event
  log records that it faulted, when it opened a box, or when it was still running at
  `--timeout` and was ended. A run that would exit 5 exits 5 first, since the
  IDE's run is the one `--exe` follows.

A reader of the console that is not `tbrun` should **compare the whole console before and
after, not read on from an index**: new text can be appended to an entry that is still open.
`tbrun` re-reads the whole backing array on every poll.

`readConsole`'s `since` does compare, and it is what `buildProject` and `openedUrls` read
with: the mark `consoleMark` takes holds the last entry as well as the count, and the text
appended to that entry comes back as the first line, before the entries after it. The
mechanism is in `ide/main.js`. Everything the compiler's process writes, a program's
`Debug.Print` and an add-in's `PrintText` alike, arrives as an output event and goes through
`debugOutputPartial`, which adds to the last entry in place (`updateItem`) while its line is
open. Output that ends in a line break closes the line, which is why each `PrintText` makes
an entry of its own, and so does `debugOutputLine`, the IDE's own messages, which starts a
new entry. **The IDE escapes that continued text twice**
([BUGS-TO-REPORT.md](BUGS-TO-REPORT.md)), so a probe printing `&`, `<` or `>` after a
`Debug.Print ...;` reads them back as `&amp;`, `&lt;` and `&gt;`, which is also what the
console shows.

`tbrun` settles on the wrapper's sentinel, or else on a quiet period, so no probe has to print
a marker of its own. Distinct `--port` values let probes run concurrently, exactly as
`tbbuild`'s do.

**Two things make that safe.** The workspace and `project.id` are keyed to `--port`, so a
second run cannot delete the first one's tree; and shutdown is a kill by the pid the launch
returned --- `tbbuild` reports it as `ide-pid:` in text and `idePid` in `--json` for a caller
that inherits a kept IDE --- rather than a machine-wide `taskkill /F /T /IM twinBASIC.exe`,
which would take out every concurrent run's IDE and the one you had open yourself.

`tbrun` also **harvests COM servers a probe leaves behind**, because nothing else can: an
`EXCEL.EXE` from `CreateObject` has `svchost.exe` for a parent, so no tree kill reaches it,
every activation is its own process, and `Quit` does not end one while any reference is
outstanding. The sweep is a before/after snapshot diff restricted to processes that are new,
on an image allowlist, *and* windowless --- a new one that has a window is reported and left
alone, since that cannot be told from a copy the user opened. `--no-reap` turns it off, and
concurrent runs driving the same server should use it and sweep once at the end.

### Measuring LLVM

`tbrun --llvm` sets `compiler.debugOptions` and `compiler.buildOptions` to `+llvm` in the
staged Settings; `--compiler-options` sets any other string. Measured on BETA 995 with no
per-procedure attributes, one probe in four variants of Settings: **`debugOptions` is what
the `[RunAfterBuild]` run is compiled with.** With `+llvm` there, `Debug.Assert`'s condition
was evaluated 0 times and a 200-million-step loop took 516 ms; with it only in
`buildOptions`, 1 time and 672 ms, as with neither. (`+llvm` alone is not
`+llvm +optimize`, which took the same loop to 62 ms as a procedure attribute.)

**The licence is in the status bar's `compilerLicence`:** one of `COMMUNITY EDITION`,
`PERSONAL EDITION`, `PROFESSIONAL EDITION`, `ULTIMATE EDITION`, and `tB Licence: ...`
until the IDE knows (`ide/main.js`, BETA 995). The licence key is in HKCU, so a lane IDE
sees the user's. `tbrun` refuses an LLVM run on the first two, which compile no user code
with LLVM; it cannot be tested with a real Community licence here, only through a fault.

**`--exe` runs the exe on a private desktop**, through `launchOnDesktop`, the part of
`launchIde` that calls `tb-launch.ps1`, which reports the program's exit code on a
second line (`exit <n>`) once it ends. Nothing reaches the exe's standard output: the
launcher creates it with no inherited handles. So `TbRun.Out` writes UTF-8 to the file
`TBRUN_OUT` names, and to standard output only when there is none. Measured on BETA 995:
the exit code from `ExitProcess 7` comes back as 7, a hung exe is ended at `--timeout`
with nothing left running, and **the exe never evaluates `Debug.Assert`, with or without
LLVM**, as VB6 drops `Debug` statements from a compiled program.

**An unhandled error in the exe opens a box and waits for it**, so `--exe` passes
`dialogs: "close"`: the launcher records each box and presses OK. Without that the exe
sat until `--timeout`. The box is the only sign of the error. In BETA 997 a plain exe
shows *shutdown*, `Run-time error '5' <description>`, and exits with code 0 once the box
is closed; an LLVM-compiled one shows *_TB_ERROR_HANDLER*, `unhandled error in
Probe.Main`, with no number or description, and then dies of an access violation at
address 0 (`0xC0000005`). `tbrun` also reads the Application log for a fault the exe
ended on (`lib/win-fault.mjs`), since an exit code need not say it; the record is written
because the launcher, not Node, starts the exe.

**`TbRun.Out` knows it is in the IDE because the wrapper says so.** The wrapper sets
`TbRun.tbrun_InIDE` before it calls the probe; the exe runs `Sub Main`, never the wrapper.
`App.IsInIDE` would say the same, but `App` exists only in a project that references the
VB package: in any other, `TbRun` fails to compile (TB5079, `Unrecognized symbol 'App'`)
and `tbrun` exits 1 on a probe that is fine (BETA 995, the install's Samples 6 and 8).
Adding that reference to the staged copy would change what the probe's own names resolve
to, and the VB6 idiom, a `Debug.Assert` whose condition sets a variable, fails under
`--llvm`, because LLVM-compiled code skips `Debug.Assert` in the IDE too. A tree with a
`TbRun` module of its own keeps it, and its wrapper sets no flag.

### Building for win64

**`tbrun` and `tbbuild` take `--arch win32|win64`, and set it on every run, win32
included.** Without it they build whatever target the IDE has for the project: win32 for a
fresh probe, so no probe could measure 64-bit behaviour, and a target the IDE remembered for
a reused path would decide the build without a word. `tbbuild` needs it as much as `tbrun`:
`#If Win64` and `LongPtr`'s size change what compiles. Measured with a module declaring a
variable of an undeclared type under both branches of `#If Win64`: win32 reported line 6's
`OnlyUnder32Bit`, win64 line 4's `OnlyUnder64Bit`.

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
50 ms: the status bar stays OPERATIONAL for about 250 ms after the switch, reads UNAVAILABLE
until the new compiler's pid appears in `g_CurrentCompilerProcessId` at about 510 ms, and
LIMITED until OPERATIONAL at 1.4 s. A `waitForCompile` started straight after the switch can
sample that second of downtime twice after having seen OPERATIONAL, and counts it as the
compiler going down twice: exit 4, a crash that did not happen. A fixed three-second pause is
a guess. `setBuildTarget` waits for the pid to change, then for the compile. The wait is
`awaitNewCompiler` in `tb-ide.mjs`, which `restartCompiler` in `tb-operate.mjs` uses too,
after the toolbar's restart button.

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

**The build path's folder has to be explicit; its file name need not be.** `tbrun` builds
into its own `out` folder under the IDE's own name,
`${ProjectName}_${Architecture}.${FileExtension}`, giving `ArchProbe_win32.exe` and
`ArchProbe_win64.exe` with no Save dialog --- so the trap above comes from the default
`${SourcePath}\Build\...`, not from the variables. The name is looked for after the build
rather than assumed, because `${FileExtension}` follows the build type.

**A switch writes the IDE's remembered target for the project's path**, so the registry tidy
has to put it back. Under a harness folder the entry is swept, as every entry there is. A
named project --- `tbbuild` on one of the user's own --- has its entry snapshotted and
restored, as its saved state is ([What a run leaves in the
registry](#what-a-run-leaves-in-the-registry-and-putting-it-back)). Two limits. Under `--keep`
nothing is tidied, so a kept IDE's switch stays remembered. And the IDE's own save is an
unguarded read-modify-write of one JSON value (`setProjectLastUsedTargetArchitecture`), so two
IDEs switching at the same moment can lose one another's entry --- harmless for a harness
path, which the next sweep deletes anyway.

## What a run leaves in the registry, and putting it back

**Every IDE the harness starts writes to the user's own settings.** They live under
`HKCU\Software\VB and VBA Program Settings\twinBASIC_IDE`, and the same key serves every
installed build. An IDE records each project it opens as a `ProjectState` value (open tabs,
watch expressions, DEBUG CONSOLE history: up to 34 KB for a real project) and moves it to
the top of `RecentlyOpened`, a 21-slot list. Nothing removes either, so harness temp projects
accumulate and push the user's own recent projects out of the IDE entirely. One `examples.bat`
run adds 41 values and fills the list.

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
  so an untouched key is never written. The IDE does not rewrite it on every launch (key
  timestamps show `DefaultIcon` and `shell\open\command` last written at installation,
  through a day of launches of that build). It rewrites them when its own path differs, which
  is why starting a lane's private copy re-points the association at the copy ([A private
  IDE for every lane](#a-private-ide-for-every-lane)).
- **The build target the IDE remembers for each project is deleted under the same
  folders**, before the run and after it. The IDE keeps the target it last built a project
  for as one JSON object in `IDESettings\targetArchitectureMemory`, keyed by the project's
  path, and a project it opens again starts in that target. A harness path is used run
  after run, so one run's entry would decide every later run's target without a word.
  `sweepArchitectureMemory` deletes the entries under the run's folders and leaves every
  other entry alone, the user's among them. Opening a project only reads its entry; one is
  written when the target of an open project changes, which `--arch` does ([Building for
  win64](#building-for-win64)). So a **named** project's entry is snapshotted and put back as
  its saved state is, by `restoreArchitectureMemory`: its old value in its old place, and any
  other spelling of its path the IDE saved deleted. The object is edited in JavaScript and
  written back with `JSON.stringify`, which is how the IDE writes it, so the other entries
  keep their exact text and order, and the write is refused if the value changed after it
  was read.

**One process owns the registry per run.** `check_examples` and `sweep_attributes` run four
lanes of builds at once, in one process (`compileProject`, which never tidies); each
restoring its own snapshot would put back whatever the registry held when that lane started,
in whatever order the lanes finished. The tool calls `startTidy` once, which sets
`TB_REGISTRY_OWNER` --- a `tbbuild` started from that process would inherit it and leave the
registry alone --- and sweeps once after the last lane. An owner pid that is no longer running does not count, or a
variable left set in a shell would switch tidying off for good. Under `--keep` nothing is
tidied, because the kept IDE is still writing. `shutdownIde` waits for the IDE's process to
be gone before anything is tidied, because `taskkill` only asks.

**The last of several runs puts back for all of them.** Two runs at once --- two `ide_test`,
a `tbrun` beside a lane run, another session's --- cannot each put back on their own. An IDE
holds the recent list in memory and writes all of it back when it opens a project, so a run
whose IDE is still open writes the other run's entries back after that run removed them (two
`ide_test` runs fail with exit 3 this way, each naming the other's lane folder). So the runs
share one record in `%TEMP%\tb-registry\<key>`, read and written one run at a time under its
`busy` folder: the first run to start records the recent list, the association and the theme
(`base.json`); every run adds its folders and named projects (`<pid>-<n>.json`); a run that
ends while another is running marks its record finished, puts nothing back and gets `{
deferred: [pids] }` from `finishTidy`, which the lane runner reports instead of checking the
lists; and the last run to end puts back for all, a named project from its oldest record. A
record whose process died unfinished is swept by folder when the next run starts alone, and
its record of the theme and recent list is dropped, since it may be days old.
`check_tb_registry.mjs` plays out both. `tbbuild --keep` takes no part, so its IDE can still
write the lists after the last run has put them back.

**Why .NET through PowerShell and not `reg.exe`.** Node has no registry API. `reg.exe`
prints value names in the console code page when its output is piped, so a path containing a
character outside that code page (an accented user name in `%TEMP%` is enough) comes back
mangled, and a value cannot be deleted by a name that no longer matches it. The request goes
in on stdin, because a project's state can reach 34 KB and an environment variable stops at
32 K characters. It is passed with `-EncodedCommand`, like `tb-launch.ps1`, and it is
inline in the `.mjs` rather than a second `.ps1`, like `tbrun`'s process snapshot.

**Three rules in `tb-registry.mjs`:**

- **Silence PowerShell's progress and return failures as `{"error": ...}` on stdout.** With
  redirected streams, progress records arrive on stderr as `#< CLIXML`, and so do errors, so a
  failure message taken from stderr reads `#< CLIXML`.
- **Refuse a restore near the root.** Restoring deletes whatever the snapshot does not list,
  so an empty or short key path would take everything under `HKCU` or `Software`. Anything
  shallower than three segments is refused, in JavaScript and again inside the script.
- **Every delete tolerates a missing value.** Concurrent runs deleting one value race: one
  deletes it and the next `DeleteValue` throws "No value exists with that name". That would
  abort the whole tidy, recent list included.

**The IDE has its own bug with the recent list**, in [BUGS-TO-REPORT.md](BUGS-TO-REPORT.md):
when the list has fewer than 21 entries, the IDE fills every empty slot with a copy of the
last one. The tidy leaves a short list whenever it removes harness projects, so the next
project the user opens trips it. A new installation has the same list, and it cannot be fixed
from outside the IDE.

**Two limits remain, both about IDEs the tidy does not own:**

- Two *standalone* `tbbuild`s on the same project at once: the second sees the first's entry
  as the user's, and puts it back. `check_examples` is immune, because its lanes are owned,
  and a check of the tidy runs its fixture cases one at a time for this reason.
- An IDE the user has open reads the recent list when it starts and writes its whole copy
  back when it opens a project, so it can bring back harness entries that were tidied after
  it started. So can an IDE of a run from another session, which is why a check of the
  registry waits until no other session's run is going.

**An association that names the temp folder is never put back.** A run that starts while
another run's IDE copy is open finds the association pointing at that copy. Put back at the
end, it would point `.twinproj` files at a folder that has been deleted, and other sessions
run `examples.bat` while add-in tests run copies, so the overlap is ordinary. `startTidy`
notes whether the association it recorded names the temp folder, and if it did, `finishTidy`
leaves the association as the IDEs set it and says so; the next IDE started from a real
install points it at that install. An association found naming a deleted copy makes
`.twinproj` files open nothing until an IDE is started from a real install. Fix it
by hand if you find it so.

**The recent list is put back as it was found, not only swept.** On a real list the IDE
changes it by itself while a run's projects are on it, in two ways, both in
[BUGS-TO-REPORT.md](BUGS-TO-REPORT.md): it fills a short list's empty slots with copies of
its last entry, and a full list loses its oldest entry for every project the run opens (an
add-in run that began with one entry ended with seventeen copies of it). So
`snapshotProjects` records the whole list, and `restoreProjects`, after deleting the run's
entries and putting a named project back in its place as before, keeps no more copies of any
path than the list had, and puts the entries that fell off the end back there. A change made
for any other reason is kept: a project the user opened meanwhile stays on top. **An entry in
the temp folder is not brought back**, because it belongs to some run, whose own tidy may have
removed it meanwhile; bringing it back would leave that run's entry in the list for good.
That is also why a run that starts with another run's leftovers in the list can end without
them.

**Verified** by [scripts/check_tb_registry.mjs](scripts/check_tb_registry.mjs), which plays
out a run on a scratch key and checks every rule above, the guards and the ownership rule
included. For the recent list it has five cases: the copies of a short list's last entry, a
full list's lost entries, a project opened meanwhile, copies that were there before the run,
and another run's entry that its tidy removed meanwhile. It is not a gate: it needs Windows
and a real registry, and the CI runners are Ubuntu. Run it after changing `tb-registry.mjs`.

End to end, the 14 fixture cases, run one at a time, a full `examples.bat` run and an add-in
run leave `ProjectState`, the recent list, the association keys and `IDESettings` exactly as
they were, value for value (compared through hashes, so the comparison copies no value out of
the registry), also with the user's own projects planted in the recent list.

## A private IDE for every lane

**The compiler loads every DLL in `<install>\addins\win32` or `\win64` as it starts.** A
test add-in put there would load into every IDE the user starts from that install, and two
lanes testing different add-ins could not share the folder at all. So the add-in harness
([WIP.HelpAddin.md](WIP.HelpAddin.md)) runs each lane on its own copy of the install, made
by [scripts/lib/tb-ide-copy.mjs](scripts/lib/tb-ide-copy.mjs), whose `addins` folders hold
exactly what the lane puts there. The compiler loads the DLLs in
`%APPDATA%\twinBASIC\addins\<arch>` as well (P6), and the `APPDATA` each lane gives its
IDEs keeps the user's out ([The add-in test runner](#the-add-in-test-runner)).

**Measured, against BETA 983 (and 995 where stated):**

- **An IDE session writes nothing into its install.** A compile, a compiler crash and a
  `tbrun` build-and-run each left all 233 files byte-identical, down to the mtimes; on
  BETA 995 the install (235 files) was byte-identical after exports, a `tbbuild` and two
  `tbrun` runs. A compile also left the per-user `%APPDATA%\twinBASIC` unchanged; that folder
  holds the user's downloaded packages and empty `addins`, `locale` and `themes` folders, and
  is shared by every install. So a compile's whole footprint outside its temp folders is the
  registry, which [the tidy](#what-a-run-leaves-in-the-registry-and-putting-it-back)
  puts back.
- **The copy is isolated.** Asked which add-ins it had loaded (`loadedAddins`, below), the
  real install's compiler answered `GlobalSearchAddIn AddIn` and the copy's answered
  nothing. All 14 fixture cases gave the same output from the copy as from the real install,
  and the real install was byte-identical afterwards.
- **Starting the copy re-points the `.twinproj` association at it.** The real install's IDE
  leaves the keys alone. The tidy restores them with three writes.

**A copy, not hardlinks.** The install is 233 files and 87 MB; leaving out `projects\` (the
samples and New Project templates, 29 MB, which a test that opens its project on the command
line never shows) and `addins\` (recreated), it copies in **380 ms**. Hardlinks would save
that at the price of sharing every file with the user's install, so that any write the IDE
made into its own folder would land in the real one. A copy makes the question irrelevant
instead of merely answered.

A copy keeps the install's folder name, `twinBASIC_IDE_BETA_<n>`, so that
`tb-install.mjs`'s `buildNumber()` still reads the build off its path. It is made and
deleted only inside the temp folder, and deleted only where the module left its marker
file, so a wrong path cannot empty a folder anybody cares about. Deleting one that an IDE
still holds fails with `EPERM`, and that is the right report: it is how a leaked compiler
process (next section) shows up.

**`removeTree` retries the delete itself, because `rmSync` does not.** An IDE ended a
moment ago still holds some of its files for a while. On Node 24.13 `rmSync`'s `maxRetries`
and `retryDelay` do nothing here: it fails with `EPERM` within a millisecond on a folder
holding a file another process has open (measured). Nothing slow sits between ending the
IDE and deleting the copy to hide this: the lane code deletes the copy the moment the IDE
has gone. `removeTree` in `tb-ide-copy.mjs` retries
for up to five seconds, and `removeIdeCopy` and the add-in runner both use it.

**`loadedAddins(c)`** in `tb-ide-addins.mjs` is the check that the copy is what it claims to be.
It asks the page's `root.getAddinsList`, which asks the compiler, so the answer is the
compiler's own, not an inference from files on disk. It is the same list the Add-Ins menu
shows.

## The IDE runs inside a job

**A tree kill races the IDE's compiler restarts.** After a crash the IDE restarts its
compiler, and `tbbuild` ends the IDE as soon as it sees the crash. A compiler started while
`taskkill /T` is walking the tree is not in the tree it walked, so it outlives the kill: a
`twinBASIC_win32_noDEP.exe --compiler=...` whose parent is gone, with
`twinBASIC_nativedbg_win32.exe` attached, still holding the install's files open (about one
crash-fixture run in a dozen). The same kill is in `tbbuild` against the real install, so
such a process may be holding the real install's files.

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
the launcher ends with it, closing the IDE's job. Killing only `tbbuild` in the middle of a
compile therefore takes its whole IDE down with it. `check_examples` and `sweep_attributes`
build in their own process (`compileProject`), so their IDEs are launched by it and go when
it does, by the same mechanism (not measured separately).

**A kept IDE is the exception, and it gets no job.** Both other arrangements fail:

- **The job under `--keep`**: the kept IDE is gone before anything can attach to it. The
  launcher dies with `tbbuild`, as above, and takes the job with it.
- **The launcher detached from Node**, so that it outlives `tbbuild`: PowerShell exits at
  once, printing no pid and nothing on stderr.

So under `--keep` the launcher makes no job, and the IDE escapes Node's job the way anything
the launcher starts does. A kept IDE is therefore unprotected: killed while its compiler is
restarting, it can still orphan one.

`--show` starts the IDE directly, without a launcher or a job: it is for a person watching,
and has not been moved onto the launcher because that would mean putting an untested window
on somebody's screen.

## Building an add-in and loading it

**An add-in is tested with two IDEs of the lane's copy, one after the other.** The compiler
loads add-ins only as it starts, and an IDE holds one project, so:

1. `buildAddin` in [scripts/lib/tb-addin.mjs](scripts/lib/tb-addin.mjs) stages the add-in's
   exported tree through [scripts/lib/tb-project.mjs](scripts/lib/tb-project.mjs) --- the
   staging `tbrun` does --- with the build path pinned to
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

Sample 10 and Sample 15 each build in about nine seconds, IDE start included; the next IDE
reports `WaynesWorld AddIn` and `GlobalSearchAddIn AddIn`.

**The DLL is built into the work folder, not into `addins` as the samples' own build path
has it**, because the IDE that builds is the lane's copy too: on a rebuild its compiler
would hold the previous build, loaded from that folder, while the linker tried to replace
it. **A compiler holds every add-in it loaded** (P8 in WIP.HelpAddin.md): while the IDE
runs, overwriting the file fails with `EBUSY` and deleting it with `EPERM`, though renaming
it works. The hold also outlasts the process: with every process of the IDE gone, the first
overwrite still fails and one 25 ms later works, four runs out of four. So `addAddin`
retries for two seconds. Its copy fails with `EIO` rather than `EBUSY`, and a retry that does
not listen for `EIO` fails.

**Whether the build worked is read from the build log.** `buildProject` in `tb-ide.mjs`
clicks Build, as `tbrun` does, and waits for the DEBUG CONSOLE. The wording is in the
compiler's strings: `[BUILD] Starting...`, then for a binary either `[LINKER] SUCCESS created
output file '<path>'` or one of about twenty failure lines --- `[LINKER] FAILED ...`,
`[BUILD] FAILED ...`, `[BUILD] ERROR ...`, `[BUILD] failed`, `[LINKER] compilation (codegen)
error ...`. An output file another process holds open gives `[LINKER] FAILED to create output
file '...' (error code 32)`, then `LOCKED BY:` and a line naming the process, then `[BUILD]
failed`. A package writes `[BUILD] Creating TWINPACK file '<path>'` and then `[BUILD]
successful.` (BETA 995), and its failures are `[BUILD] FAILED ...` and `[BUILD] failed` lines
like a binary's. `buildProject` matches the success line whole, because `[BUILD] successfully
built Fusion server file` is another line, and only after the TWINPACK line. Two details:

- **Only lines added after the click count.** Nothing removes a console entry but a clear.
  So the entries from the pre-click count on are new, unless the first entry changed or the
  count fell: that means a clear, and then everything is new. A previous build's SUCCESS
  line can never be taken for this build's. Text the IDE appends to the entry that was last
  at the click counts as new too, since the IDE adds to a line that is still open in place
  (`readConsole`'s `since`, under `tbrun` above).
- **A failure line waits two seconds for a success line after it.** The strings include
  `[BUILD] failed to use project.iconForm setting`, and whether a build goes on after that
  one has not been seen.

**Either target, set on every build and checked in the file.** `buildAddin` takes `arch`,
`win32` by default, and sets it with `setBuildTarget` as `tbrun`'s `--arch` does, even
when the project opened in it: a project path the IDE has no memory of opens in win32, and
a target the tidy missed would otherwise decide the build without a word. A win64 build is
a switch, which restarts the compiler and compiles the add-in again before the build.
`dllInfo` reads the DLL's PE headers: its machine type has to be the target's (`0x14c`,
`0x8664`), and it has to export one of the three names the IDE's loader takes (P14),
which is what makes it an add-in at all. The linker's SUCCESS line says only that a file
was written.

**The target decides which folder is read** (P7): a copy holding Sample 10 as
`InFolder_win32.dll` in `addins\win32` and `InFolder_win64.dll` in `addins\win64` loads the
first alone when it opens a project with no memory. When it opens a project remembered as
win64, it starts `twinBASIC_win64_noDEP.exe` with `twinBASIC_nativedbg_win64.exe`, which
tries the second alone and fails, since the add-in is 32-bit. A switch of an open project
loads the other folder; the P7 lane checks it with a build of each bitness.

**A DLL that fails to load still appears in `loadedAddins`, as `Unknown Addin`.** The DEBUG
CONSOLE says why, on a line that starts with the file name: `[InFolder_win64.dll] Failed to
load addin.  LoadLibrary() failed.` So a test looks for the name it expects rather than
counting, and reads the console for the reason when that name is missing.

## Operating the IDE and reading it

**A scenario is written with [scripts/lib/tb-operate.mjs](scripts/lib/tb-operate.mjs)**:
click, press keys, type, read the add-ins' tool windows, message boxes, notifications and
list views, open a file, move or read the code editor's cursor, and restart the compiler
with the toolbar's button (`restartCompiler`). A lane restarts it, or switches the build
target, through `Lane.restartCompiler` and `Lane.setBuildTarget`, which also refuse a
compile afterwards that crashed or has errors. `readCrash` in
`tb-ide.mjs` says whether the compiler crashed, from the same console record `tbbuild`
reads, and `awaitCrashName` waits for that record to name the file being parsed, which no
first crash does. Every call takes a connection from `attachIde`.

**Input is real input; reading is from the page's data.** A click is the pointer moving to
the element's centre, pressing and releasing, and a key press is the key-down and key-up a
keyboard sends, because the IDE's own controls ignore `element.click()` and an add-in's
shortcut is matched on the real pair of key events. Reading is the other way round: a list
view draws only the rows that fit, and a tool window is a shadow root that
`document.querySelector` cannot see into, so the calls read `toolWindowsById`, a list
view's `dataNodes` and `window.editor` rather than what is drawn.

Eight rules:

- **A click scrolls its target into view, and checks what is at the point before it
  clicks.** Sample 10's tool window is taller than it is shown: its eleventh button has a
  size and a place, but the place is under the window's bottom edge, and a click there goes
  to the window's resize handle and does nothing. `click` calls `scrollIntoView`,
  finds the element at the centre point through every shadow root, and throws, naming both,
  when something else is there. It also throws when there is no such element, or the
  element has no size, which is what a hidden tool window's elements have. It scrolls only
  a target that is partly hidden --- outside the viewport, or clipped by an ancestor --- or
  whose centre is covered: scrolling every target to the centre also scrolls whatever
  holds a target in full view (in the code editor, each click on the error panel scrolled
  the code by 110 to 158 px).
- **A click waits for its target, up to five seconds.** What an add-in adds is in the page's
  data a moment before it is drawn: a click made the moment a list view's data held a row
  fails with "there is no such element", because the row is not drawn yet. So
  `click` tries again every 100 ms until the target is there, has a size and is not
  covered, and only then throws, with the last reason.
- **Of the elements a selector finds, the target is the first one on screen.** A list view
  keeps rows it has drawn before, and a kept row is not on screen (Sample 15's results list
  held one file's entry twice in the page while its rendered text had it once). A target can
  also be narrowed by its exact text, and can take the last match rather than the first,
  for a dialog stacked on another.
- **Which element carries the handler decides what a click does.** Sample 15 puts each
  match's `[line,col]` label beside the clickable line, not inside it, so a click on the
  label runs the handler of the file's whole entry and opens the file's first match. Click
  the line.
- **Typing is one key press per character.** Sample 15 searches on key-up, once typing
  pauses for a second, so text put into its box any other way is never searched.
  `pressKey` sends a US keyboard's `key`, `code` and virtual key code, since the IDE names
  an add-in shortcut's letters from `code` and every other key from `key`. Modifiers go down
  before the key and come up after it, in reverse. Measured in the code editor: End moved
  to the end of the line, Shift+End selected to it, Ctrl+A selected all 152 characters, and
  a typed `x` followed by Backspace left the text as it was.
- **The editor is `window.editor`**, one Monaco editor given the model of the selected
  tab, and `openEditors.selectedEditorNode.name` is that tab's file,
  `/<Project>/Sources/<file>`. Opening a file the way the IDE's Find in Files does ---
  `fs.tree.resolvePath("twinbasic:" + path)`, then `openEditors.openFile(node, false,
  false, false, line, column)` --- puts the cursor at the line and column given, counted
  from 1.
- **Opening a file at a place leaves the cursor unsettled for 700 ms** (P2 in
  WIP.HelpAddin.md). Whenever the compiler's decorations for the document arrive less than
  700 ms after the IDE's last `revealLineInEditor`, `parseDocumentDecorations` calls it
  again: the cursor goes back to the opened place, and the 700 ms start over. Every edit
  brings new decorations, so a `setCursor` made in that time is undone, and text typed in it
  goes in at the opened place, each key in front of the last: `MsgBox(` comes out `gBox(s`
  (`xyz` typed at 3:1 0.3 s after opening at 4:9 went in as `x` at 3:1 and `zy` at 4:9).
  So `openFile` waits for the IDE's own callback, `openEditors.openFile`'s eighth
  argument, and then for the 700 ms to pass --- about 0.8 s in all for a file not yet open.
  `setCursor` and `select` first wait out any time left from something else that opened a
  file, such as an add-in's `Editors.Open`, and `afterReveal` does the same wait for
  anything else. When the IDE is still revealing lines 10 s later, `openFile`, `setCursor` and
  `select` throw, naming the file and the place, rather than go on while the cursor can still
  move; `afterReveal` itself returns `false`. The IDE's side of it is in BUGS-TO-REPORT.md.
- **A click checks where its press lands** (the `assert` lane of
  `ide-test.bat` shows it). The page can change between the call that aims and the press, a few
  milliseconds to a hundred later on a busy page. In an editor the debugger has just
  opened, the error panel goes on moving after it is drawn: the file's decorations bring
  code lenses above the failing line and push it down 48 px. A click on Stop made as soon as
  the panel is there lands on the panel's header, and the run goes on, which looks like the
  IDE ignoring the click. So the call that aims also puts a one-shot `pointerdown` listener
  on the window, in the capture phase, which records the element the press lands on before
  the page's own handlers on it run, and `click` throws, naming that element, when it is not
  in the target. A press in what the target's selector finds by then also counts, so a
  target the page draws again in place is still hit. The release is not checked, because a
  control may act on the press and close before it. A press a window listener of the page's
  own stops first is not seen, and not reported. The `assert` lane itself waits for the panel
  to stop moving (`panelStill` in `test/ide/assert.test.mjs`).

**The connection has three properties**, and they matter once a harness clicks into dialogs
on purpose:

- **Every CDP call has a time limit**, thirty seconds unless a call passes its own, and a
  connection that closes fails its waiting calls at once. Without it, a page blocked by a
  dialog or a synchronous host call hangs the caller for good. On a page an `alert()` was
  blocking, a call with a three-second limit failed after 3.0 s, with a message naming the
  likely causes.
- **`attachIde` records and dismisses every javascript dialog**, in `c.dialogs`, after
  sending `Page.enable`. Without `Page.enable`, CDP reports no dialogs. The IDE only ever
  calls `alert()`, from 37 places, so every dialog is accepted; a `confirm()` or `prompt()`,
  which only an add-in could open, would be cancelled.
- **An alert that opened before the connection existed cannot be answered.** `Page.enable`
  gets no answer while it is open, the connection is told of no dialog, and
  `Page.handleJavaScriptDialog` replies "No dialog is showing" while the page stays
  blocked. `attachIde` marks such a page (`c.pageBlocked`), and a compile that then never
  reports its project open says why, instead of looking like a slow compile. The IDE's
  candidates are its "IDE startup failure" alert and "Bad command line syntax.", which
  `launchIde`'s single argument never provokes; `--show` puts either where it can be read.

## An add-in under test opens nothing

**Every IDE the harness starts has `TB_ADDIN_TEST=1` in its environment**, set by
`launchIde` (`ADDIN_TEST_ENV` in [tb-ide.mjs](scripts/lib/tb-ide.mjs)). An add-in that sees
it does nothing outside the IDE and prints each such action to the DEBUG CONSOLE instead:
`open <url>` for a URL it would have opened in a browser. A browser started from an IDE on
the private desktop would open where nobody can see it, and outlive the run. `openedUrls` in
[tb-operate.mjs](scripts/lib/tb-operate.mjs) reads those lines back, and with a mark from
`consoleMark` only the ones printed after it; `readConsole` takes the same mark as `since`,
and `buildProject` reads its build log that way.

**Every IDE, not only the add-in runner's.** `tbbuild`, `tbrun` and `examples.bat` start the
real install, whose compiler loads whatever add-ins the user has put in its `addins`
folders or in `%APPDATA%\twinBASIC\addins` (P6), and none of those IDEs is on a desktop
anybody watches. A caller can still set the variable otherwise, or leave it out by passing
`undefined` as its value: Node leaves such a variable out of a child's environment even
when its own environment has it (measured).

**Measured on BETA 983 and 995 (P10 in WIP.HelpAddin.md), and held by
[test/addin/env.test.mjs](test/addin/env.test.mjs):** the EnvProbe add-in
([probes/env](test/addin/probes/env)) prints the variable from `Host_OnProjectLoaded`.
Through `launchIde` it reads `1`, from `Environ$` and from
`GetEnvironmentVariableW` alike, and with the variable left out (`env: { TB_ADDIN_TEST:
undefined }` to `Lane.open`, after `closeProject`) `Environ$` is empty and the Win32 call
says unset. The lane asserts all of that, and that the process id the add-in read is
`compilerPid`'s, that a restart prints from a different process, and that it reads `1`
again. The path it travels: `tb-launch.ps1` calls `CreateProcess` with no environment block
of its own, so the IDE inherits the launcher's; the IDE starts the compiler,
`twinBASIC_win32_noDEP.exe`, as a direct child; and the add-in runs inside the compiler's
process. The toolbar's restart button ends the compiler and starts a new process, and the
add-in that process loads reads `1` too. The control, `WEBVIEW2_USER_DATA_FOLDER`, arrives
with the lane's port in it.

**The console gives back exactly what was printed, a whole line at a time.** `PrintText`
stores an add-in's text escaped, `<b>` as `&lt;b&gt;` and `&` as `&amp;`, and `readConsole`
decodes it, so a URL with `&` in its query string comes back unchanged. Text that continues
a line left open is the exception: the IDE escapes it twice (under `tbrun` above). Each
`PrintText` ends its own line, so it is affected only when something else, such as a
program's `Debug.Print ...;`, left a line open just before it. `openedUrls` counts a line only when what
follows `open ` holds no white space: a URL has none, so an ordinary line that happens to
start with the word is not taken for one.

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
then it deletes the copy. A scenario file is one `scenario()` block, from
[test/addin/scenario.mjs](test/addin/scenario.mjs), which gives it the lane and closes the
lane in the block's last test. **What the close finds fails the lane only because the close is
a test:** a throw from an `after` hook marks the file `✖` but leaves `node --test`'s exit code
0, and the runner judges a lane by that code. The block's `after` hook closes the lane only
when that test never ran, as when a `before` hook fails. Run outside the runner, the block is
skipped, so a bare `node --test` never starts an IDE.

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
recorded. Any failure is exit code 3, which wins over a lane's failure (1): the registry is what to repair.
While another harness run is still running, the lists and targets are that run's to put back
and are not checked; the report line says which pid.

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
folder is under it (`checkAddinsRoot` in `tb-ide-addins.mjs`): an IDE that stopped taking the
folder from its environment may have loaded the user's add-ins, and the lane fails rather
than test something else. The check runs after the fact, because the add-ins load
while the project opens.

The user does not have to move their add-ins out to run the tests: the runner never writes to
the user's `APPDATA` folder, and a lane's IDE loads only what its own folders hold.
`tbbuild`, `tbrun` and `examples.bat` keep the user's `APPDATA`: they build the user's
projects, and the same folder holds the packages the user has downloaded. `TB_ADDIN_TEST` is
what keeps a user's add-in from acting outside the IDE there.

**Ctrl+C ends the lanes and still puts everything back.** The runner handles `SIGINT`: it
starts no more lanes, ends the running ones, waits, and tidies (with both lanes' IDEs open it
ended both and put everything back within two seconds). Testing it needs care: Windows passes
a process's "ignore Ctrl+C" setting on to the processes it starts, and every process started
from the session that ran the test has it, so a `CTRL_C_EVENT` sent with
`GenerateConsoleCtrlEvent` into the runner's own hidden console reaches nothing. Start the
test through a PowerShell that first clears the setting (`SetConsoleCtrlHandler(NULL,
FALSE)`).

**The scenarios.** Two cover Stage 1 of WIP.HelpAddin.md, and the others are Stage 2's
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
  list --- a check of a live site has to attach to it separately. The scenario
  turns on `Runtime` to record page exceptions, which is how P12's `TypeError` is seen. Its
  last test is not a numbered probe: a third button opens two tool windows given no id,
  which turn out to be one window.
- [test/addin/symbols.test.mjs](test/addin/symbols.test.mjs), P5: no add-in. It opens the
  project in [test/addin/probes/symbols](test/addin/probes/symbols), which references tbIDE
  and is never built, and asks the compiler about names in it the way the IDE's own code
  does: hover, Go To Definition, signature help and a completion's details, each with the
  parameters the IDE's own code sends. The page's call answers through a callback, so each
  question is one `Runtime.evaluate` of a promise. Positions are found in the source by
  text, so an edit to the probe project does not shift them.
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
- [test/addin/env.test.mjs](test/addin/env.test.mjs), P10: it builds the EnvProbe add-in
  from [test/addin/probes/env](test/addin/probes/env), which prints one line as the project
  loads: `Environ$("TB_ADDIN_TEST")`, the same through `GetEnvironmentVariableW` (`(unset)`
  when absent) and its process id. The first test asserts `1` twice and that the id is the
  compiler's; the second restarts the compiler with `Lane.restartCompiler` and asserts `1`
  twice and a different id; the third is the control, `closeProject` and then `Lane.open`
  with `env: { TB_ADDIN_TEST: undefined }`, and asserts an empty `Environ$` and `(unset)`.
  The probe opens nothing, so running an IDE without the variable is safe. Two IDEs in one
  lane need no change to the runner, and the second takes the same port once the first has
  been ended.

**Timing, BETA 995:** the thirteen lanes take about two minutes at the default two at a time
(the env lane is 16 s alone, the help lane 15 to 18 s, of which its sixteen cases are about 6 s). Typical lane costs (BETA 983): an add-in build about 10 s, a host IDE
about 9 s, scenario 2 s; the keys lane 28 s (about 9 s of it pressing keys), panes 23 s,
symbols and ideserver about 9 s each (they build nothing), appdata 18 s, arch 56 s (two builds
and two switches of target), reload 47 s (two builds and two restarts), entry 19 s.

**Known gaps and behaviours:**

- The runner does not compare the IDE's own `IDESettings`. Compare them by hand around a
  lane that could change them, such as the panes lane, whose floating tool window has a
  persistence id (13 values, identical afterwards).
- An application key a lane's add-in writes that `lanes.mjs` does not name makes the run
  fail and name the key (tested with `GlobalSearchAddIn`); a planted extra value in a named
  key comes back exactly.
- An `--only` that matches nothing is refused with exit code 2. `--timeout 8` ends lanes
  mid-build and leaves the registry as found and nothing running.
- Exporting the samples leaves the install's `projects` folder as it was, mtimes included.
