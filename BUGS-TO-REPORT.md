# twinBASIC bugs to report

A queue, not a record. Each entry is a **product** bug --- something twinBASIC itself does
wrong --- observed while working on this documentation. **Mark an entry once it has been
filed upstream**, and `node scripts/bug_repro.mjs file --marked` moves it to
`bugs/filed/<slug>/REPORT.md`; nothing here is meant to accumulate, and an entry that stays
after it is filed turns this file into a second, worse issue tracker. A filed bug is not a
fixed one, so its reproducer stays until a fix is released and `verify` says it no longer
reproduces: then the docs its HTML comment names are updated, and its folder under
`bugs/filed/` is deleted.

Documentation defects do not belong here. They are fixed in `docs/`, and the ones that are
not yet fixed are recorded in the relevant `WIP.*.md`.

What an entry owes a reader:

- the **build** it was seen on, because the answer changes between betas;
- a **minimal reproduction**, narrowed rather than pasted --- the thing that made it
  reproduce is usually smaller and stranger than the code it was found in;
- what was tried that did **not** reproduce it, which is half of what makes a report
  actionable;
- how it was **observed**, so somebody else can see the same thing.

## The report template

**Each entry is the report**, written to twinBASIC's GitHub bug-report template, so it is
copied into a new issue as it stands: the entry's `##` title is the issue's title, and
everything under it, down to the next `---`, is the issue's body. The template:

```
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Desktop:**
 - OS: [e.g. Windows 10]
 - twinBASIC compiler version [e.g. 0.9.1111]

**Additional context**
Add any other context about the problem here.
```

How the four duties above fit it:

- **Describe the bug** says what goes wrong, in a sentence or two, and how it was
  observed.
- **To Reproduce** starts by opening the entry's reproducer project (see below), then gives
  the narrowed steps.
- **Expected behavior** says what should happen instead, and why: what VBA or VB6 does,
  what the documentation says, or what the IDE does in the neighbouring case.
- **Screenshots** is left out when there are none.
- **Desktop** gives the build as `BETA <n>`, the build it was last reproduced on.
- **Additional context** gives what did not reproduce it, the severity, and the builds it
  was checked on besides the one above.

**An entry's paragraphs and list items are not wrapped**, one line each, unlike the rest of
this file. A GitHub issue renders a single newline as a line break, so a wrapped paragraph
pastes with a break in mid-sentence. Entries are separated by a `---` line.

Anything meant for this repository alone (which test asserts the behaviour, which page
states it, what to update when it is fixed) goes in an HTML comment at the end of the entry.
GitHub does not render a comment, so it is harmless if pasted along with the rest.

**Entry titles do not change.** Comments in `scripts/` and `test/` refer to entries by
title.

## Reproducer projects

**Every entry has a reproducer project** under `bugs/<slug>/`, where `<slug>` is a short
kebab-case name for the bug, and its **To Reproduce** names the project file:

| path | what it is | in git |
|---|---|---|
| `bugs/<slug>/src/` | the project's exported source tree: `Settings`, `Sources/` and the rest | yes, byte for byte |
| `bugs/<slug>/<slug>.twinproj` | the project file, packed from `src/` | yes |
| `bugs/<slug>/<slug>.zip` | the `.twinproj` zipped, because a GitHub issue does not accept a `.twinproj` attachment | no |

`scripts/bug_repro.mjs` makes and checks them (the tool's page is
[Tools and Scripts](docs/Documentation/Tools.md#bug-repro)):

```sh
node scripts/bug_repro.mjs new <slug> "<entry title>"   # bugs/<slug>/src/ and repro.json
node scripts/bug_repro.mjs pack <slug>                  # src/ -> <slug>.twinproj -> <slug>.zip
node scripts/bug_repro.mjs compile <slug>               # compile it in the IDE, print the diagnostics
node scripts/bug_repro.mjs build <slug>                 # and build it
node scripts/bug_repro.mjs run <slug>                   # run Sub Main, print the DEBUG CONSOLE
node scripts/bug_repro.mjs verify [<slug> ...]          # does each entry still reproduce?
node scripts/bug_repro.mjs file <slug> <issue>          # move a filed entry out of the queue
node scripts/bug_repro.mjs file --marked                # the same for every marked entry
```

`new` starts the project from the console template, with an empty `Sub Main` in a `Startup`
module; edit `src/Sources/`, then `pack`. What `pack` does is the importer, then a zip of the
one file it writes, which the tool does itself:

```sh
node scripts/impexp.mjs import bugs/<slug>/<slug>.twinproj bugs/<slug>/src --overwrite
```

`bugs/<slug>/repro.json` says how to ask the compiler about the entry, and is committed with
the reproducer: a `mode` of `compile`, `build`, `run`, `cli` (the compiler executable's own
command line) or `manual`, and what a reproduction looks like in `expect`, such as the exit
code of `tbbuild`, the diagnostic codes, or a regular expression the output must match.
`verify` reads it for every entry and reports `reproduces`, `NO LONGER REPRODUCES` (the bug
may be fixed on this build) or `manual`, which prints the `steps` it holds. It needs a
twinBASIC install, and is run by a person, never by a gate or by CI.

Attach the `.zip` to the issue. When the entry is filed, its folder moves to
`bugs/filed/<slug>/`; see [Filed bugs](#filed-bugs).

## Filed bugs

The owner marks an entry while filing it, with a line directly under its `##` title:

- `*FILED #2453*` --- filed as issue 2453;
- `*CAPTURED IN EXISTING #841*` or `*CAPTURED IN \#841*` --- an existing issue covers it.

Issues are at `https://github.com/twinbasic/twinbasic/issues/<n>`. `file --marked` takes the
issue from each mark and the reproducer from the `<slug>.twinproj` the entry names (an entry
whose reproducer is not an attachment names `bugs/<slug>/` in its closing comment). It moves
the entry out of this file, with one `---` still between its neighbours, into
`bugs/filed/<slug>/REPORT.md`, whose first line links the issue and which holds no mark line.
It moves `bugs/<slug>/` beside it and records `issue` in its `repro.json`, and `existing` when
an existing issue covered the bug. If any marked entry cannot be filed, none is.
`file <slug> <issue> [--existing]` does the same for one entry without a mark.

`verify` checks the filed reproducers as well as the queued ones, labels each filed one with
its issue, such as `(filed #2453)`, and counts them on a line of their own. For a filed bug,
`NO LONGER REPRODUCES` is the signal that it was fixed.

An entry marked `*DEFERRED until after v1*` is held on purpose, and is not forgotten. It stays
in this file with its reproducer, `verify` still checks it, and `file --marked` skips it. It is
filed when the owner decides.

---

## The recent-projects list fills its empty slots with copies of its last entry

**Describe the bug**
When the recent-projects list holds fewer entries than it has slots and a project is opened, the IDE writes a copy of the list's last entry into every empty slot, so the same project is repeated down the Recent tab. The list is 21 values, `"0"` to `"20"`, under `HKCU\Software\VB and VBA Program Settings\twinBASIC_IDE\RecentlyOpened`. A new installation has empty slots, so this is where it shows first.

**To Reproduce**
Steps to reproduce the behavior:
1. Unzip `recent-projects-copies.zip` (it holds `recent-projects-copies.twinproj`, an ordinary project; any three projects will do) and copy the project to `A.twinproj`, `B.twinproj` and `C.twinproj` in one folder.
2. Export the key with `reg export` first if the list matters to you. Under `RecentlyOpened`, set `"0"` to the full path of `A.twinproj` and `"1"` to that of `B.twinproj`. Delete `"2"` to `"20"`, or set them to empty strings; both reproduce it.
3. Open `C.twinproj`: `twinBASIC.exe C:\path\C.twinproj` is enough.
4. Read the values of the key, with the IDE still running or after it has closed.
5. See `"0"` = `C`, `"1"` = `A`, and `"2"` to `"20"` all = `B`: nineteen copies of `B`.

**Expected behavior**
The slots that held nothing stay empty, as they do when the key does not exist at all: `"0"` = `C`, `"1"` = `A`, `"2"` = `B`, and the rest empty. The Recent tab then shows three projects.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: cosmetic, but it shows on a new installation, which is exactly when the list has empty slots.

What does not reproduce it:

| starting list | result |
|---|---|
| no `RecentlyOpened` key at all | `C` and 20 empty strings, which is correct |
| 21 distinct entries | 21 distinct entries, the oldest dropped, which is correct; read at the end of 41 successive opens |
| `C` already at the top | unchanged: the opened project itself is never duplicated |

So it takes at least one existing entry and at least one slot with nothing in it, which looks like each slot being read with the previous slot's value as its default. Once a duplicate is there, the next opened project keeps it: 18 copies of one project became 20 after one more open, with the new project on top. Both variants of step 2 (deleted slots, empty strings) were measured on BETA 995, ending with 21 values and 3 distinct projects.

<!-- Manual in bugs/recent-projects-copies/repro.json because it changes the user's own registry. Stated in WIP.Harness.md (the recent-list tidy, which exists because of it) and scripts/lib/tb-registry.mjs; when fixed, the note there that a short list trips it can go. Measured 2026-09-23 on BETA 983 by reading the registry after tbbuild --keep opened a fixture project on a private desktop and the IDE was ended by its pid, and again on BETA 995 on 2026-10-01 (cli995/rec-995-*.txt). The harness trips it because every IDE a run starts opens a project: a run that began on a list of one entry once ended with seventeen copies of it. -->

---

## Compiler crashes on an `Interface` named by an angle-bracket placeholder that has an `Extends` clause

*FILED #2453*

**Describe the bug**
A source file holding an `Interface` whose name is an angle-bracket placeholder and that has an `Extends` clause crashes the compiler while it parses the file. The DEBUG CONSOLE shows `NATIVE EXCEPTION: ACCESS_VIOLATION {no-basic-code}` with `>>> thread 0004: ParsingFileStart, <that file>`, then `restarting from MEMORY`, three times over, and then the IDE gives up. The input is not real code (it is a syntax skeleton, the shape the documentation uses to show where an attribute goes), but a parser given nonsense should report a diagnostic, and this one dereferences something instead.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `crash-placeholder-interface.twinproj` (attached as `crash-placeholder-interface.zip`). Its one source file, `Placeholder.twin`, is the whole reproduction:
   ```
   Interface <name> Extends <base-interface>
   End Interface
   ```
2. See the compiler crash with `NATIVE EXCEPTION: ACCESS_VIOLATION {no-basic-code}` in the DEBUG CONSOLE, restart from memory three times, and then stop restarting.

It takes a placeholder name and an `Extends` clause, and what the clause names does not matter:

| source | result |
|---|---|
| `Interface <name>` + `End Interface` | TB5182 Syntax error, no crash |
| `Interface IFoo Extends <base-interface>` + `End Interface` | TB5182 + TB5079 + TB5127, no crash |
| `Interface <name> Extends <base-interface>` + `End Interface` | **crash** |
| `Interface <name> Extends IBase` + `End Interface`, no `IBase` anywhere | **crash** |
| the same, with `Interface IBase` or `Class IBase` declared in another file | **crash** |

**Expected behavior**
A syntax error (TB5182, as for the same line without the `Extends` clause), not a crash.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 983, at `twinBASIC_win32.dll+00141F7A`. Severity: crash. It takes the compiler down, three restarts, then the IDE gives up. A crash in a batch of projects costs the whole batch its result, so a tool that compiles many files at once has to isolate the file that does it. An earlier version of this report said the crash needs a placeholder in both positions, the name and the base; the last two rows of the table, each measured with a project of its own, show the base can be a real name or missing entirely.

<!-- Reproducer: bugs/crash-placeholder-interface/ (mode compile, expects tbbuild exit 4). Found by pointing scripts/check_examples.mjs at the documentation's own code samples: the skeleton is one of the `tb` fences under docs/ (the one in Reference/Attributes.md that shows where an attribute goes); that tool isolates the sample on exit code 4. The table rows were measured on 2026-09-24, each in a project of its own; the crash reproduced on 995 and 983 with bug_repro verify. -->

---

## An `Interface` that extends itself compiles without a diagnostic, and Build then does nothing

*FILED #2434*

**Describe the bug**
An interface that extends itself, directly or through another interface, compiles with no error, warning, hint or info. Building the project then does nothing at all: clicking **Build** writes nothing to the DEBUG CONSOLE, opens no dialog and creates no file, and the IDE stays responsive. A cycle through classes or UDTs is refused at compile time instead.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `interface-extends-itself.twinproj` (attached as `interface-extends-itself.zip`). Its three source files hold the whole bug:
   ```
   ' SelfCycle.twin
   Interface IA Extends IA
   End Interface
   
   ' PairCycleB.twin
   Interface IB Extends IC
   End Interface
   
   ' PairCycleC.twin
   Interface IC Extends IB
   End Interface
   ```
2. See the project compile with 0 errors, 0 warnings, 0 hints and 0 infos.
3. Click **Build**.
4. See nothing happen: no `[BUILD] Starting...` line in the DEBUG CONSOLE, no message, no output file.

Any one of the three files is enough on its own; so is `IB` and `IC` in one file.

**Expected behavior**
A compile error, as the other kinds of cycle get:

| source | result |
|---|---|
| `Class CA` + `Inherits CA` + `End Class` | TB5127 circular reference |
| `Class CA` inheriting `CB` and `Class CB` inheriting `CA`, two files | TB5127 circular reference, TB5022 and TB5135 failed to import inherited members |
| `Type TA` holding a `TB` and `Type TB` holding a `TA`, two modules | TB5101 unable to finalize User Defined Type, possible circular reference |

Failing that, a build that reports why it stopped.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 983, identically. The same project without the cyclic interfaces builds in about 16 seconds on both, and so does one with an ordinary chain, `Interface IQ Extends IP`. Severity: invalid code is accepted, and the only symptom is a Build button that silently does nothing.

<!-- Measured with scripts/bug_repro.mjs and tbbuild --build (exit 5, "the build did not start in 120 s") on 995 and 983, control and IQ-extends-IP chain built; the silent Build button seen by hand on 995 (IDE shown). The class and UDT rows measured on 995 the same way. Found while looking for a compiler crash that needs two files. -->

---

## `--buildAndExit32` writes nothing, exits 0 on a project with errors, and hangs on a failing build

**Describe the bug**
`twinBASIC.exe --buildAndExit32 <project>` (and `--buildAndExit64`) cannot be used for an unattended build. It writes nothing about the build to stdout or stderr, it exits 0 on a project the IDE flags with an error when the error is in code nothing calls, and when the build really fails it does not exit at all. Measured on a private desktop with the process's standard output and error redirected to a file, and the process ended by its pid after 30 seconds.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `build-and-exit-silent.twinproj` (attached as `build-and-exit-silent.zip`). Its only source file is `Sources\Startup.twin`:
   ```
   Module Startup
   
       Public Sub Main()
       End Sub
   
       Private Sub Unused()
           NoSuchProcedure
       End Sub
   
   End Module
   ```
2. See the IDE report 1 error, TB5079 `Unrecognized symbol 'NoSuchProcedure'`.
3. Close the IDE and run `twinBASIC.exe --buildAndExit32 C:\path\build-and-exit-silent.twinproj`.
4. See the command exit 0 after a few seconds. `Build\BuildAndExitSilent_win32.exe` has been written, although the project has an error. Nothing about the build was written to stdout or stderr: with both redirected to a file, the only line is `[...:ERROR:ui\gfx\win\window_impl.cc:172] Failed to unregister class Chrome_WidgetWin_0. Error = 1412`, which is Chromium shutting down.
5. Change `Main` to call `Unused`, so that the build really fails, and run the same command again.
6. See the command never exit. It writes nothing to stdout or stderr and no `.exe`, and was still running when it was ended after 30 and 40 seconds. On the desktop it sat on a *Please wait...* dialog at 100%, as seen on BETA 983.

**Expected behavior**
A build switch for unattended use should report the diagnostics on stdout or stderr, exit with a non-zero code when the project has errors, and exit when the build fails instead of waiting. At the least it should not exit 0 and write an `.exe` for a project the IDE flags with an error.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: it makes the switch unusable for the one job it exists for, because it is silent, falsely green and hangs on the case worth catching.

Which errors hang and which exit 0, on BETA 995. All of these hang, with no `.exe` written: `NoSuchProcedure` in `Main`, `NoSuchProcedure` in a procedure that `Main` calls, a bare `Dim`, `Dim x As NoSuchType`, `y = 1` under `Option Explicit`, and a project with no `Sub Main`. The same `NoSuchProcedure` in a procedure nothing calls exits 0 with the `.exe` written. Assigning `"abc"` to a `Long` and an unused `Dim x As Long` compile without an error and exit 0, as they should. On BETA 983 the unused-procedure case exits 0, and `NoSuchProcedure` in `Main` and the missing `Sub Main` hang.

So exit 0 on a project with errors happens only for an error in code nothing calls; an error in code the build reaches never exits 0.

Silence on stdout and stderr: measured on BETA 983 first, and on BETA 995 by redirecting the standard handles of the process to a file. The same redirection captures the compiler executable's own output (`twinBASIC_win32.exe settings <project>` wrote the whole `Settings` file), so the capture works.

<!-- Manual in bugs/build-and-exit-silent/repro.json: the switch belongs to the IDE executable, which opens a window, so nothing here may run on the user's desktop. Measured with a scratch copy of scripts/lib/tb-launch.ps1 (private desktop, kill-on-close job, TBBUILD_CMD replacing the command line, standard handles redirected to a file), with scripts/lib/tb-registry.mjs startTidy and finishTidy around the run. Stated in scripts/tbbuild.mjs (header comment) and WIP.Harness.md, "Do not reach for --buildAndExit32 instead": when fixed, those two say the switch is unusable. The exit-0-on-errors claim there was stated for BETA 983 without a reproduction; it is true only for an error in code nothing calls, so correct it either way. -->

---

## Public members are typed with Private components, so a default project cannot use them

*FILED #2454*

**Describe the bug**
Public members of the compiler packages are typed with `Private` classes, and `Public Enum`s sit inside `Private Module`s, so a project that references a package the ordinary way cannot name the types its documented members take. `VB.Report` shows it most sharply, because the compiler names the type in one diagnostic and rejects it in the next. Handling a documented public event requires opting into the package's private half by setting the library symbol to `*VB`.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `private-types-in-public-members.twinproj` (attached as `private-types-in-public-members.zip`). It references the VB package the ordinary way, and its one source file, `ProbeReport.twin`, holds the whole bug:
   ```
   Class ProbeReport
       Private WithEvents rpt As VB.Report
       Private Sub rpt_BeforePaintSection(ByVal Section As VB.ControlsSection)
       End Sub
   End Class
   ```
2. See two errors:
   ```
   TB5018 unable to match this handler to its event member. The expected signature was:
          Private Sub rpt_BeforePaintSection(ByVal Section As ControlsSection)
   TB5079 Unrecognized datatype symbol 'ControlsSection'
   ```
3. Set the VB reference's library symbol to `*VB` and compile again: the handler compiles exactly as written.

`BeforePaintSection` is a public event whose parameter type is `Private Class ControlsSection` (`VB/Sources/SUPPORT/ControlsSection.twin:4`). The other spellings are worse than useless: `ByVal Section As Object` binds and compiles, while `Variant`, the bare name, and omitting the parameter all fail.

**The CustomControls package has the same shape across its whole style surface.** Every class in `CustomControlsPackage/Sources/zTemporarySupport.twin` is `Private` (`Corner`, `Corners`, `Padding`, `FillColorPoint`, `FillColorPoints`, `Border`, `Borders`, `Line`, `Fill`, `TextRendering`, `Anchors`, `WindowsFormOptions` and the per-control `...State` classes), while the members that hand them out are public:

| member | declared | what a default project can do |
|---|---|---|
| `Borders.Elements` | `Public WithEvents Elements() As Border` | read it; assigning needs a `Border()` it cannot declare |
| `FillColorPoints.Values` | `Public WithEvents Values() As FillColorPoint` | the same |
| `TextRendering.Outlines` | an array of `Border` | the same, and with no `SetSimpleBorder` equivalent to fall back on |
| `Canvas.RuntimeUICCCanvasAddElement` | `(ByVal Me As Canvas, ByRef ElementDescriptor As Any)` | pass a record it declares itself, with the style members left `Nothing` |

With `*CustomControlsPackage`, all of it works under the package qualifier: `New CustomControlsPackage.Border`, `Dim elems(0 To 2) As CustomControlsPackage.Border`, `Dim descriptor As CustomControlsPackage.ElementDescriptor`, and a complete `ICustomControl` implementation that sets `BackgroundFill` and `TextRenderingOptions` from `New CustomControlsPackage.Fill` / `.TextRendering`. Both `CustomControlsPackage.ElementDescriptor` and `CustomControlsPackage.UDTs.ElementDescriptor` resolve, although the UDT is declared `Public Type` inside `Private Class UDTs`.

**Two more packages have the same shape.** In both, a `Public Enum` sits inside a `Private Module`, so a consumer can name neither the enum nor its members, and both enums are the argument type of a documented, public member:

| package | declaration | what a default project cannot write |
|---|---|---|
| WinNativeCommonCtls | `Private Module ImageListConsts` then `Public Enum ImlDrawConstants` | `ImageList1.ListImages(1).Draw hDC, x, y, ImlDrawTransparent Or ImlDrawFocus` |
| cefPackage | `Private Module _cef_log_severity_t` then `Enum CefLogSeverity` | `CefBrowser1.EnvironmentOptions.LogSeverity = CefLogWarning` |

Neither the bare member (`ImlDrawTransparent`), the enum name (`ImlDrawConstants.…`), nor the owning control as a qualifier (`ImageList.ImlDrawConstants.…`) resolves: all three are `TB5079 Unrecognized symbol`. The asterisk works here too: with the library symbol set to `*WinNativeCommonCtls`, `WinNativeCommonCtls.ImlDrawTransparent` compiles. The VB package has it from a different direction as well: the enums nested inside a control class, `MultiFrameDirectionConstants` in `MultiFrame` and `QRCodegenEccConstants` in `QRCode`, are equally unreachable, so `mfPanels.Direction = vbDirectionHorizontal` does not compile although it is what the property's own documentation says to write.

**Expected behavior**
A type that appears in the signature of a public member is itself public, so a default project can write the handler, declare the `Border()`, and pass the enum, without importing the package's private half. If the types are meant to be internal, the members that hand them out should not be public.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
The reproducer holds the `VB.Report` case; the CustomControls, WinNativeCommonCtls, cefPackage and MultiFrame / QRCode cases above need packages the reproducer does not reference, and were each measured on BETA 995. The VB.Report case reproduces identically on BETA 983. Severity: documented APIs need the consumer to expose the package's internals, and one event asks for a type it then refuses. The asterisk is a workaround, not a fix.

This reads as an oversight rather than a policy. The file is called `zTemporarySupport.twin`, and the package's own changelog dates the narrowing: "v0.0.5.0, 15th September 2022 --- improved: made changes to ensure nothing within the package is being exposed unnecessarily." Reducing the surface is reasonable; what it missed is that these particular classes are not internal. They appear in the signatures of members that stayed public, so every consumer of those members is now required to import the package with an asterisk and qualify names that the package's own controls write bare.

It went unnoticed because none of the 32 sample projects the IDE ships exercises any of this from code. Exported and grepped, all of them: `ControlsSection` appears only as a designer `_className` in the two `.tbreport` files and no sample handles `BeforePaintSection`; `ElementDescriptor`, `ICustomControl`, `ICustomForm` and `RuntimeUICC*` appear nowhere at all; `Border` appears 971 times, every one a designer `_className` in a `.tbform`. No sample line sets `NormalState`, `HoverState` or any `.Fill.` from code.

<!-- Reproducer: bugs/private-types-in-public-members/ (mode compile, expects TB5018 and TB5079); verified on 995 and 983. Found by scripts/check_examples.mjs, which compiles the documentation's own code samples: the pages documenting `New Border`, `Dim descriptor As ElementDescriptor` and a `ControlsSection` handler were written from the packages' sources and none compiled in a default project. The checker's private-library templates (test/example-projects/vb-private, cc-private, cef-private, wnc-private) are the asterisk workaround; when the types become public, drop the templates and the notes in the docs that tell a reader to use the asterisk (the WinNativeCommonCtls ImageList pages, the CustomControls and CEF pages, VB MultiFrame and QRCode). -->

---

## `Err.Raise` rejects `HelpContext` as a named argument, while its three siblings work

*FILED #2455*

**Describe the bug**
`Err.Raise` accepts `Source:=`, `Description:=` and `HelpFile:=` as named arguments, but not `HelpContext:=`. The error is `TB5090 unrecognized named argument`, and it does not say which name was wrong.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `err-raise-helpcontext.twinproj` (attached as `err-raise-helpcontext.zip`). Its one source file, `Probe.twin`, holds the whole bug:
   ```
   Dim myHelpFile As String, myHelpContext As Long
   Err.Raise vbObjectError + 894, Source:="MyApp.MyClass", _
             Description:="Was not able to complete your task", _
             HelpFile:=myHelpFile, HelpContext:=myHelpContext
   ```
2. See the project fail to compile with `TB5090 unrecognized named argument`.

What does work, each verified on its own: the same call with `Source:=`, `Description:=` and `HelpFile:=` named and the fifth argument dropped compiles, and so does the fully positional form `Err.Raise vbObjectError + 894, myObjectID, "...", myHelpFile, myHelpContext`. So the parameter exists and accepts a `Long`; only its name is unrecognised. `HelpContextID:=` is rejected as well, so this is not simply a different spelling to discover, and the compiler binary's only `HelpContextID` strings belong to project settings, not to a signature.

**Expected behavior**
The call compiles. `HelpContext` is what VBA itself names that parameter. Read out of the VBA type library on the machine this was found on (`VBE7.DLL` 7.01.1158, VBA7.1, via `LoadTypeLibEx` and `ITypeInfo::GetNames` on `_ErrObject`), the method is `Raise(Number, Source, Description, HelpFile, HelpContext)`. All five names are exactly the ones the failing call uses, and the call is Microsoft's own `Err.Source` example, named arguments and all, so the code twinBASIC rejects is the code a VBA developer is most likely to have copied. Four of the five names are accepted here; only the fifth is not.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 983, with the same TB5090. Severity: VBA-compatible code that names the fifth argument does not compile, and the diagnostic does not say which name was wrong.

<!-- Reproducer: bugs/err-raise-helpcontext/ (mode compile, expects TB5090); verified on 995 and 983. Found by scripts/check_examples.mjs over Reference/Default/VBA/ErrObject/Source.md, whose sample was written in the named form; the page uses the positional form now. When fixed, the page can show the named form again. -->

---

## An interface member marked `[PreserveSig]` cannot be implemented by a class

**Describe the bug**
A class cannot implement an interface member that is marked `[PreserveSig]`. The compiler reports that it cannot match the implementation to the member, and prints as the expected signature exactly the one on the line the error is reported against, so whatever it compares is not what it prints.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `preservesig-implements.twinproj` (attached as `preservesig-implements.zip`). Its one source file, `Probe.twin`, holds the whole bug:
   ```
   [InterfaceId("11111111-0000-4000-8000-000000000004")]
   Interface IProbeD Extends IUnknown
       [PreserveSig]
       Function F() As Long
   End Interface
   
   Class ImplD
       Implements IProbeD
       Private Function IProbeD_F() As Long Implements IProbeD.F
       End Function
   End Class
   ```
2. See two errors:
   ```
   TB5004 unable to match this implementation to its interface member. The expected signature was: Private Function IProbeD_F() As Long
   TB65535 Missing implementation of member Function F() As Long
   ```

What was tried and does not help, each on its own:
- the VB6-style name without the method-level `Implements IProbeD.F` clause gives `TB5018 unable to match this handler to its event member`, an event-handler message for an interface member, with the same expected signature;
- `[PreserveSig]` on the implementing method as well gives `TB5155 This attribute is not supported in this context`.

What does not matter: a parameter, or a `Boolean` return (the case it was found in was `Function MyFunc(Arg1 As Variant) As Boolean`), or a `[TypeHint(...)]` on that parameter, which implements cleanly without `[PreserveSig]`. The same interface with the attribute removed implements cleanly. `[PreserveSig]` alone is the trigger.

**Expected behavior**
The implementation is accepted, as it is without the attribute. If `[PreserveSig]` members are not meant to be implemented in twinBASIC, a diagnostic saying so at the declaration.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
BETA 983 gives the second message as TB5000 instead of TB65535 (the reproducer, checked there, does not report TB65535). Severity: an interface the language lets you declare cannot be implemented at all, and the diagnostic asks for the signature that is already written.

<!-- Reproducer: bugs/preservesig-implements/ (mode compile, expects TB5004 and TB65535); verified on 995, and on 983 it differs only in the second code. Found by scripts/check_examples.mjs over Reference/Core/Interface.md, whose example declared IFoo with a [PreserveSig] member and then showed a class implementing it; the example no longer puts [PreserveSig] on a member it implements, and its description of the attribute says why. -->

---

## `import` stops with exit code 999 on any folder inside `Packages`, so a project that embeds a package cannot be packed

*CAPTURED IN EXISTING #841*

**Describe the bug**
`import`, the compiler executable's verb for packing a folder tree into a project file, stops partway through when the tree's top-level `Packages` folder contains a folder. It exits with code 999, writes no project file and leaves one already at the output path untouched. The last line printed is `IMPORTED FOLDER: <tree>\\Packages\`, with no `... DONE` and no `... FAILED`, and nothing reaches stderr. A package a project uses is embedded in it by default, as a folder of its own under `Packages`, so a project that embeds a package cannot be packed from its exported tree.

**To Reproduce**
Steps to reproduce the behavior:
1. Unzip `import-packages-folder.zip` (it holds `import-packages-folder.twinproj`) and run `twinBASIC_win32.exe export C:\path\import-packages-folder.twinproj C:\path\tree\`. The only unusual thing in the tree is the file `Packages\Nested\x.txt`, so `Packages` holds a folder.
2. Run `twinBASIC_win32.exe import C:\path\out.twinproj C:\path\tree\ --overwrite`.
3. See the output end at `IMPORTED FOLDER: C:\path\tree\\Packages\`, and the exit code be 999.
4. See that `out.twinproj` was not written, and that one already there is unchanged.

**Expected behavior**
The tree is packed, as it is when `Packages` holds no folder, and the run ends `... DONE` with exit code 0. If a folder in `Packages` is something the importer cannot accept, it should say so with an `ERROR:` line and `... FAILED`.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: the command line cannot pack any project that embeds a package, and the failure prints neither `... DONE` nor `... FAILED`. The exit code is 999, where every other failure observed exits 0. Also on BETA 983, and there with `twinBASIC_win64.exe` as well.

The smallest reproduction is one empty folder: export any project, add an empty `Packages\Nested\` to the tree, and import it. Every case below starts from a fresh `export` of the HelloWorld sample:

| added to the exported tree | result |
|---|---|
| nothing | exit 0, `... DONE` |
| an empty `Packages\Nested\` | **exit 999, no project** |
| `Packages\Nested\x.txt` | **exit 999, no project** |
| `Packages\Nested\Settings`, a copy of the root `Settings` | **exit 999, no project** |
| `Packages\A\B\` | **exit 999, no project** |
| `packages\Nested\`, in lower case | **exit 999, no project** |
| `Packages\x.txt` (a file, no folder) | exit 0, `... DONE` |
| an empty `Packages\` on its own | exit 0, `... DONE` |
| `Miscellaneous\Nested\x.txt` | exit 0, `... DONE` |
| `Sources\Packages\Nested\` (a `Packages` below the top level) | exit 0, `... DONE` |

So the trigger is a folder inside the top-level `Packages`, whatever it holds: an empty one does it, and so does one with a `Settings` file of its own, which is what a real package has. Leaving out `--overwrite` makes no difference: with a project already at the output path, `import` still stops with 999 rather than refusing to overwrite it.

This is not malformed input. `export` writes the embedded package out as a folder under `Packages`, and `import` of that tree then stops. Five of the 48 project and package files the IDE ships have such a folder: `WinNativeCommonCtls` (which embeds `VBComDlg`), samples 8, 17 and 23, and the *Standard EXE (plus VBCCR v1.8)* project template. Each was measured: `export` succeeds, and `import` of the tree it has just written stops as above. None of them round-trips through the command line, and neither does any project created from that template, nor any export written by the IDE's **Export Project**, which always adds the compiler packages under `Packages`.

<!-- Automated: bugs/import-packages-folder/repro.json is a cli reproducer (import of a copy of src/, expecting exit 999 and the Packages line). The folder in src is a file, Packages/Nested/x.txt, because git cannot hold an empty folder. The tooling side is scripts/impexp.mjs, which packs all five exported trees with every file byte-identical to the original; the only files missing are .meta files, the embedded packages' own included, which export does not write. Measured on BETA 983 and 995 with the rows above (cli995/bae.mjs and log1-*.txt) and by bug_repro verify on 995. Found by checking impexp.mjs against the compiler's import for line-ending handling: a probe tree with a made-up Packages\Nested\ never produced a project to compare. When fixed, the Export Project entry's remark that its output cannot be packed (the compiler packages under Packages) needs the same update. -->

---

## `export` and `import` stop at the 260-character path limit, apart from the one path they prefix with `\\?\`

**Describe the bug**
`export` names its input with a `\\?\` prefix (*exporting from "\\?\C:\...\package.twinproj"*), and a 301-character input path exports normally. Every other path `export` and `import` touch is held to the ordinary Win32 limits, on a machine with `LongPathsEnabled` set to 1. A file or folder that would pass 259 or 247 characters is not created, the error blames permissions and storage space, the run ends `... FAILED` with exit code 0, and `export` carries on, so what it leaves is a partial tree.

**To Reproduce**
Steps to reproduce the behavior:
1. Unzip `path-limit-260.zip` (it holds `path-limit-260.twinproj`, an ordinary project) and export it: `twinBASIC_win32.exe export C:\path\path-limit-260.twinproj C:\path\src\`.
2. In PowerShell, make a project file name whose path is longer than 259 characters, and import the tree into it: `$file = "$env:TEMP\" + ("f" * 230) + ".twinproj"`, then `twinBASIC_win32.exe import $file C:\path\src\`. See `ERROR: failed to create output file: <that path> (check permissions and storage space)`, then `... FAILED`, exit code 0, and no project file.
3. For the `export` side, in PowerShell: `$dir = "C:\p"; while ($dir.Length -lt 251) { $dir += "\" + ("d" * [Math]::Min(100, 250 - $dir.Length)) }`, then `New-Item -ItemType Directory $dir -Force`, then `twinBASIC_win32.exe export C:\path\path-limit-260.twinproj "$dir\"`.
4. See `ERROR: failed to create output file: <dir>\Settings (check permissions and storage space)`, because `Settings` would be 260 characters long, and `[EXPORT]  ERROR: folder does not exist and could not be created:` for each of `Sources\`, `Resources\`, `Packages\`, `Miscellaneous\` and `ImportedTypeLibraries\`. The run ends `... FAILED` and exits 0. With `$dir` 250 characters long, `Settings` (259) is written and the folders still fail.

**Expected behavior**
Every file and folder is written, however long its path, as `export` already reads a 301-character input path. If a path cannot be used, the error should say so, and `export` should not write part of a tree and exit 0.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: an `export` to a deep folder writes part of the tree and exits 0, and the errors it prints blame permissions and storage space. `LongPathsEnabled` is 1 on the machine this was measured on, so the Windows setting does not rescue it.

What was observed, by path:

| path | observed | what it prints |
|---|---|---|
| a file `export` writes | 259 characters written, 260 fails | `ERROR: failed to create output file: <path> (check permissions and storage space)` |
| a folder `export` creates | 247 characters with its trailing `\` created, 248 fails | `[EXPORT]  ERROR: folder does not exist and could not be created: <path>\` |
| the project file `import` writes | a 271-character path fails (259 works, 262 fails) | `ERROR: failed to create output file: <path> (check permissions and storage space)` |
| the tree `import` reads | a tree at a 250-character path fails | `ERROR: unable to read from folder: <tree>\\ImportedTypeLibraries\*` |

Every one of those runs ends `... FAILED` and exits 0. Exporting `WebView2Package` to a 198-character folder wrote 45 of its 72 files. With the HelloWorld sample into an existing 231-character folder, `Settings` and `Sources\HelloWorld.twin` are written, at 240 and 255 characters, and `Resources\ICON\twinBASIC.ico` (260) is not; at 220 characters every file is written and the run ends `... DONE`. With the reproducer's project the first failure is a folder: into an existing 225-character folder `Settings` and `Sources\Startup.twin` are written and `ImportedTypeLibraries\` (248 with its trailing `\`) is not.

What does not reproduce it: a long input path to `export`, and any output folder short enough that no file path reaches 260 characters and no folder path 248.

<!-- Automated: bugs/path-limit-260/repro.json is a cli reproducer, import to a 239-character file name in the temp folder (generated, 230 f characters plus .twinproj; the temp folder's own length adds to it, so it fails whatever TEMP is). It tests the file limit only; the export side needs an existing deep folder, which the cli mode cannot create, so it is in the steps above. Stated in WIP.Harness.md (the census trusting export's exit code, the path-length remark) and scripts/census_attributes.mjs; the census now tests for ... DONE. Measured on BETA 995, the file and folder rows with the HelloWorld sample and the reproducer's project, and the input path 303 characters long. Found by the attribute census pointed at a cache folder in a deep working directory: WebView2Package and the three cefPackage versions came back ... FAILED while the other twelve packages exported. When fixed, the census can drop its ... DONE test only if exit codes become reliable too. -->

---

## A damaged project file opens a message box, and the command waits until it is closed

**Describe the bug**
Given a file that is not a valid project, the compiler executable opens a modal message box (*invalid header* and *invalid file format* were both seen) and prints nothing more until it is closed. `export`, `settings` and `readme` each waited on the box indefinitely. Once the box is closed, `export` prints `WARNING: failed to parse project file, file may be corrupt`, then `... DONE`, and exits 0.

**To Reproduce**
Steps to reproduce the behavior:
1. Unzip `damaged-project-modal-box.zip` (it holds `damaged-project-modal-box.twinproj`, an ordinary valid project) and make damaged copies of it, in PowerShell: `$b = [IO.File]::ReadAllBytes("C:\p\damaged-project-modal-box.twinproj")`, then `$b[0] = $b[0] -bxor 0xFF; [IO.File]::WriteAllBytes("C:\p\firstbyte.twinproj", $b)` for one with its first byte changed, and `[IO.File]::WriteAllBytes("C:\p\cut.twinproj", $b[0..([int]($b.Length / 2))])` for one cut off halfway. A 20-byte text file named `garbage.twinproj`, or an empty file, is damaged enough too.
2. Run `twinBASIC_win32.exe export C:\p\garbage.twinproj C:\p\out\`, on a desktop someone is watching.
3. See a message box and no further output. The command was still waiting when it was ended after 25 seconds.
4. Close the box. See `WARNING: failed to parse project file, file may be corrupt`, then `... DONE`, and exit code 0. For the project cut off halfway it also writes the one file it could read, `Settings`.
5. Run `settings` or `readme` on the same file: each waits on a box the same way.

**Expected behavior**
No window opens from a command-line verb. The command prints the problem (`ERROR: failed to parse project file, file may be corrupt or inaccessible`, which it already prints when a folder is given where the project should be), ends `... FAILED`, and does not report `... DONE` for a file it could not read.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 983 (the 20-byte text file was also seen on BETA 995)

**Additional context**
Severity: an unattended `export`, `settings` or `readme` never finishes, and once the box is closed `export` reports success, so a script that tests for `... DONE` is fooled as well.

All four kinds of damaged input were tried on BETA 983: a 20-byte text file, an empty file, a real project with its first byte changed, and one cut off halfway. On BETA 995 a run with a 20-second limit found `export` and `settings` on the 20-byte text file still waiting at the limit; the other inputs returned inside it, and whether each opened a box was not checked.

What does not reproduce it: a folder given where the project should be. `settings` then prints `ERROR: failed to parse project file, file may be corrupt or inaccessible` and exits, with no box.

<!-- Manual in bugs/damaged-project-modal-box/repro.json, and not to be run unattended: the box opens on the desktop of whoever runs the command (the probe that found it opened message boxes on the user's desktop three times on BETA 995 alone). No test or page states it. The command-line verbs are described on docs/Documentation/Tools.md (impexp) and in scripts/impexp.mjs, which does not open a box for a damaged file; check them when fixed. Found by probing the command line for the rewrite of the Import/Export Tool page; the boxes appeared on the desktop of the person at the machine, which is how their wording is known. Measured on BETA 983 with a 25 second limit, on BETA 995 with 20 (cli995/log2-995.txt). -->

---

## `export` refused for lack of `--overwrite` still writes part of the tree

**Describe the bug**
When `export` is run without `--overwrite` into a folder that already holds some of the project's files, it refuses those files with an error but still writes every file that is not there yet. The folder is left a mixture of the old tree and the project, matching neither. `import` checks before it writes, so a refused `import` leaves the project file as it was.

**To Reproduce**
Steps to reproduce the behavior:
1. Unzip `export-refused-partial-write.zip` (it holds `export-refused-partial-write.twinproj`) and run `twinBASIC_win32.exe export C:\path\export-refused-partial-write.twinproj C:\path\out\`. See `... DONE`.
2. Delete `C:\path\out\Settings`, and edit `C:\path\out\Sources\Startup.twin` (add a line at the end).
3. Run the same `export` again, without `--overwrite`.
4. See:
   ```
   [EXPORT]  ERROR: output file already exists and --overwrite not set: C:\path\out\export-refused-partial-write.twinproj
   [EXPORT]  DONE: C:\path\out\Settings
   [EXPORT]  ERROR: output file already exists and --overwrite not set: C:\path\out\Sources\Startup.twin
   ... FAILED
   ```
5. See `Settings` come back from the project while the edited `Startup.twin` stays, so the folder now matches neither the old tree nor the project. The exit code is 0.

**Expected behavior**
The files that would be overwritten are found first, as `import` does, and a refused `export` writes nothing.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: a refused export leaves the folder a mixture of the old tree and the project.

The same behaviour makes the VB package impossible to export without `--overwrite`, even into an empty folder: it holds `Resources\MANIFEST\#1.xml` twice (see the report on names written twice into shipped project files), and `export` writes one copy and then refuses the other because of the file it has just written. Measured again on BETA 995: `export` of `packages\{F50B82D0-DCAB-43FE-9631-11959D4A4728}_VB\package.twinproj` into an empty folder prints one `output file already exists` error for that file and ends `... FAILED`.

<!-- Automated: bugs/export-refused-partial-write/repro.json is a cli reproducer. A cli reproducer runs one command, so the project holds a root file named after the project file (export-refused-partial-write.twinproj), which already exists in the temp folder the command exports into: that file is refused, and Settings and Sources\Startup.twin are written, with exit 0. The steps above show the same by deleting Settings. Measured on BETA 983 and 995 with the HelloWorld sample (cli995 e6) and by bug_repro verify. Nothing in scripts/ or WIP.md states it; the standalone scripts/impexp.mjs export checks before it writes, so when fixed nothing there changes. The VB-package sentence belongs to the duplicate-names report (slug duplicate-names-shipped). -->

---

## The IDE has written the same name twice into project files it ships

*FILED #2435*

**Describe the bug**
Two of the 48 project and package files an installation ships hold one name more than once, with different contents: the VB package holds `Resources/MANIFEST/#1.xml` twice, and Sample 16, *twinBASIC IDE Addin (TODO Widgets demo)*, holds `.addins/WaynesTodoItemsData` eight times. A folder can hold only one file of a name, so unpacking keeps one copy. The eight copies in Sample 16 suggest that each save of the add-in's data added an entry instead of replacing the old one, which is a guess and not a measurement.

**To Reproduce**
Steps to reproduce the behavior:
1. The reproducer is not an attachment: it is two files in the installation, so there is no `.zip` for this report. They are `packages\{F50B82D0-DCAB-43FE-9631-11959D4A4728}_VB\package.twinproj` and `projects\Sample 16.    twinBASIC IDE Addin (TODO Widgets demo)\projectName.twinproj`, under the IDE's folder.
2. Run `twinBASIC_win32.exe export "<IDE folder>\packages\{F50B82D0-DCAB-43FE-9631-11959D4A4728}_VB\package.twinproj" C:\out1\`, into a folder that does not exist yet, without `--overwrite`.
3. See one `[EXPORT]  ERROR: output file already exists and --overwrite not set: C:\out1\Resources\MANIFEST\#1.xml`, then `... FAILED`. The folder is empty before the run, so the only file that already exists is the one just written for the first copy of the name.
4. Run `twinBASIC_win32.exe export "<IDE folder>\projects\Sample 16.    twinBASIC IDE Addin (TODO Widgets demo)\projectName.twinproj" C:\out2\` the same way.
5. See seven of `[EXPORT]  ERROR: output file already exists and --overwrite not set: C:\out2\.addins\WaynesTodoItemsData`, then `... FAILED`: one for each copy of the name after the first.

**Expected behavior**
A project file holds each name once. Where the IDE rewrites an entry, it replaces it.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: a folder can hold only one of them, so unpacking keeps one copy; which copy the IDE itself uses is not known.

| file | name | copies |
|---|---|---|
| the VB package | `Resources/MANIFEST/#1.xml` | 2, of 703 and 682 bytes |
| Sample 16, *twinBASIC IDE Addin (TODO Widgets demo)* | `.addins/WaynesTodoItemsData` | 8, no two alike |

`export` writes entries in reverse order, so with `--overwrite` the first copy in the file is the one left on disk. The same two files, and no others of the 48, hold a repeated name on BETA 983 as well as on BETA 995.

<!-- Manual in bugs/duplicate-names-shipped/repro.json, because a repro.json cannot name a path inside the install (an install path contains a username), and no project can be packed with a repeated name. The folder under bugs/ holds only a placeholder project; the entry has no zip to attach, so the folder can go when it is filed. scripts/impexp.mjs keeps the first copy, as the executable does, and warns with "1 name occurs more than once in the project" for both files (cli995/dups.mjs, run over every project and package file of both installs). The VB-package consequence for export without --overwrite is in the report on a refused export (slug export-refused-partial-write). Found by comparing the standalone scripts' export with the executable's over every shipped project file. -->

---

## `export` needs a full, backslashed project path, and no folder path may use forward slashes

**Describe the bug**
`export` fails on an ordinary relative project path, on a project path with forward slashes, and on an output folder given with forward slashes, with messages that say the file or folder does not exist when it does. `import` fails the same way on an input folder with forward slashes. The forward-slashed case ends `... FAILED`, creates nothing and exits 0, so a script sees success unless it reads the output.

**To Reproduce**
Steps to reproduce the behavior:
1. Unzip `export-needs-backslashes.zip` (it holds `export-needs-backslashes.twinproj`, an ordinary project) into `C:\p\`, and create the folders `C:\p\out\` and `C:\p\tree\` (any existing folders will do).
2. Run `twinBASIC_win32.exe export C:\p\export-needs-backslashes.twinproj C:/p/out/`. See `ERROR: output folder does not exist and could not be created`, although `C:\p\out\` exists, then `... FAILED`, and exit code 0.
3. Run the other forms in the table below.

| argument | example | result |
|---|---|---|
| `export`'s project path, relative | `export export-needs-backslashes.twinproj C:\p\out\` | `ERROR: input twinproj file does not exist` |
| `export`'s project path, forward slashes | `export C:/p/export-needs-backslashes.twinproj C:\p\out\` | the same |
| `export`'s folder, forward slashes | `export C:\p\export-needs-backslashes.twinproj C:/p/out/` | `ERROR: output folder does not exist and could not be created`, although it exists |
| `import`'s folder, forward slashes | `import C:\p\x.twinproj C:/p/tree/` | `ERROR: input folder does not exist`, although it exists |

**Expected behavior**
Relative paths and paths with forward slashes work for `export` and for the output folder, as they do for the project path of `import` and for the printing commands, or the error says that the form of the path is the problem. A failure should not exit with 0.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: ordinary relative and forward-slashed paths fail, with messages that say the file or folder does not exist.

The echo line explains the first two: `exporting from "\\?\export-needs-backslashes.twinproj"`. The project path is prefixed with `\\?\`, which turns off Windows' path normalisation, so only a full path with backslashes survives it. A folder given partly with forward slashes (an existing `C:\p\out/`) fails the same way.

What does not reproduce it: `import`'s project path and the printing commands take relative and forward-slashed paths, and with backslashes `export` creates every missing level of its output folder (`C:\p\a\b\c\` was created in one run).

<!-- Automated: bugs/export-needs-backslashes/repro.json is a cli reproducer, export of the packed project to the temp folder written as {tmp}/ (a forward slash after the backslashed path), expecting the could-not-be-created error and exit 0. The other three rows need a relative path, which a cli reproducer cannot give, so they are in the steps. Stated in WIP.md ("Give the executable backslashed paths") and WIP.Harness.md; those two stay true until this is fixed, then they can be relaxed. Measured on BETA 983 and 995 (cli995/log1-*.txt, ENTRY 8) and by bug_repro verify on 995. -->

---

## `import` of a folder with no `Settings` file fails without saying why

**Describe the bug**
Given a folder with no `Settings` file at its top, `import` lists the files it read, ends `... FAILED` with no `ERROR:` line, and writes nothing. Every other failure measured names its cause. The refusal is right, and the silence is not.

**To Reproduce**
Steps to reproduce the behavior:
1. Unzip `import-no-settings-silent.zip` (it holds `import-no-settings-silent.twinproj`, an ordinary project) and export it: `twinBASIC_win32.exe export C:\p\import-no-settings-silent.twinproj C:\p\src\`.
2. Import only the folder `Sources`, which has no `Settings` file at its top: `twinBASIC_win32.exe import C:\p\x.twinproj C:\p\src\Sources\`.
3. See:
   ```
   importing into "C:\p\x.twinproj" from "C:\p\src\Sources\"...
     IMPORTED: C:\p\src\Sources\\Startup.twin
   ... FAILED
   ```
4. See that there is no `ERROR:` line, the exit code is 0, and `C:\p\x.twinproj` was not written.

**Expected behavior**
An `ERROR:` line that names the cause, such as `ERROR: no Settings file in the input folder`, before `... FAILED`, as the other failures print. A failure should also not exit with 0.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: minor, because the refusal is right.

Also on BETA 983, where a copy of the HelloWorld sample's tree with `Settings` deleted behaves the same: it lists `Resources\ICON\twinBASIC.ico` and `Sources\HelloWorld.twin`, ends `... FAILED` and writes no project.

<!-- Automated: bugs/import-no-settings-silent/repro.json is a cli reproducer, import of {src}\Sources\, expecting the IMPORTED line for Startup.twin, `... FAILED` and exit 0. A repro.json cannot assert that a line is absent, so it checks the IMPORTED line, `... FAILED` and exit 0 only: after a fix that adds an ERROR line, read the output by hand. Nothing in scripts/ or WIP.md states the compiler's behaviour; scripts/impexp.mjs import refuses a folder with no Settings file by name ("has no Settings file", with a self-test). Measured on BETA 983 and 995 (cli995/log1-*.txt, ENTRY 9) and by bug_repro verify on 995. -->

---

## Shifting a `Single`, `Double`, `Date`, `Boolean` or `String` compiles clean, then fails code generation

*FILED #2436*

**Describe the bug**
`<<` and `>>` on a `Single`, `Double`, `Date`, `Boolean` or `String` compile with no diagnostic, and code generation then fails for the procedure that holds the shift. The failure is reported only in the build log, as `[LINKER] compilation (codegen) error detected in '<module>.<procedure>' at line #<n>`, naming the shift's line.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `shift-nonintegral.twinproj` (attached as `shift-nonintegral.zip`). Its source file `Probe.twin` holds the shift, and `Sub Main` calls it:
   ```
   Dim a As Single = 7.9
   Dim c As Integer = 1
   Debug.Print "before the shift"
   Debug.Print a << c
   ```
2. See the problems panel show 0 errors, 0 warnings, 0 hints and 0 infos.
3. Click **Build**.
4. See the build fail: `[LINKER] compilation (codegen) error detected in 'Probe.Show' at line #7`, then `[LINKER] FAILED due to compilation errors`, and no output file.

The same shift in a procedure that nothing calls builds clean. In a `[RunAfterBuild]` Sub the build reports `[LINKER] SUCCESS created output file`, and the error appears only when the procedure is called: `[LINKER] compilation (codegen) error detected in 'Probe.Go' at line #8`. Nothing in the procedure runs, not even the statements before the shift, and `On Error Resume Next` in the caller does not see it; the caller stops too.

| left operand | `<<` and `>>` |
|---|---|
| `Single`, `Double`, `Date`, `Boolean`, `String` | codegen error |
| `Byte`, `Integer`, `Long`, `LongLong`, `LongPtr` | shifts |
| `Currency`, `Decimal` | builds, but works on the value: a `Currency` holding 7.9, shifted left by 1, is 15.8 |
| a `Variant` holding any of the types above | builds, and multiplies or divides the value |

Precedence reaches it too: `"x" & n << 2` parses as `("x" & n) << 2`, a `String` shift, and fails the same way.

**Expected behavior**
Either a compile-time diagnostic at the shift, or a working shift. The documentation had said floating-point operands are truncated before shifting.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
BETA 983 gives the same result for the reproducer: the build fails with the same codegen error. Severity: the compiler accepts the expression with no diagnostic, and the procedure that contains it never runs.

<!-- Reproducer: bugs/shift-nonintegral/ (mode build, expects tbbuild exit 5 and "codegen" in the message); verified on 995 and 983. The first two failures, a reached procedure failing the build and a [RunAfterBuild] Sub building and then failing when called, were both measured on 2026-10-02 on 995 (tbbuild --build, and tbrun on a probe holding only the Single shift); the old entry described only the second. WIP.Harness.md (around the passage on [RunAfterBuild] and a shifted Single) records the second form; update it if this is fixed. Found by probing the operators' result types for Reference/Operators.md. -->

---

## A `Variant` shift multiplies a fractional value, and can return `Empty`

*FILED #2437*

**Describe the bug**
A `Variant` holding a `Double`, `Currency` or `Decimal` of 7.9, shifted left by 1, gives 15.8: the value is multiplied by 2, not shifted. Shifted right by 1, the `Double` and the `Decimal` give 3, but the `Currency` gives 3.95. A `Variant` holding an `Integer` or a `Long` shifted left by a count as large as the type's width gives `Empty` rather than 0. There is no diagnostic.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `variant-shift.twinproj` (attached as `variant-shift.zip`) and run it (F5). Its `Sub Main` holds the whole bug:
   ```
   Dim d As Variant = CDbl(7.9)
   Dim c As Variant = CCur(7.9)
   Debug.Print d << 1            ' 15.8
   Debug.Print c >> 1            ' 3.95
   
   Dim i As Variant = CInt(1)
   Dim l As Variant = CLng(1)
   Debug.Print TypeName(i << 20) ' Empty
   Debug.Print TypeName(l << 32) ' Empty
   ```
2. See the DEBUG CONSOLE show 15.8, 3.95, `Empty` and `Empty`. The project prints the same for a `Decimal` too.

| expression | result |
|---|---|
| a `Variant` holding `CInt(1)`, `<< 20` | `Empty` |
| a `Variant` holding `CLng(1)`, `<< 32` | `Empty` |
| a `Variant` holding `CLng(1)`, `<< 31` | `Long` -2147483648 |
| a `Long` variable holding 1, `<< 32` | 0 |

**Expected behavior**
A shift moves bits, so a fractional value should be truncated first, as the right shift of the `Double` and the `Decimal` already does: `7.9 << 1` is 14 and `7.9 >> 1` is 3. A count as large as the width of the type should give 0 and keep the type, as the `Long` variable's shift does, not `Empty`.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: wrong values, with no diagnostic. Also on BETA 983, with the same results, except that the right shift of a `Variant` holding 7.9 gave 4 there for all three types (BETA 984 made `>>` arithmetic). A `Long` variable's shift by 32 gives 0 on both builds.

<!-- Stated by the Variant note in docs/Reference/Core/LeftShift.md; when fixed, remove the note, and check RightShift.md for the Currency result. Measured with scripts/bug_repro.mjs (run mode, verify) on 995 and 983. Found by probing the operators for those two pages; the same probe found `>>` logical on a typed variable and arithmetic on a constant, up to BETA 983. -->

---

## Overloads on `Date` and `Double` resolve by declaration order, not by the argument's type

*FILED #2438*

**Describe the bug**
When a procedure is overloaded on `Date` and on `Double`, whichever of the two is declared first receives every call, whatever the type of the argument. No diagnostic is shown.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `date-double-overload.twinproj` (attached as `date-double-overload.zip`). Its source file `Probe.twin` declares the two overloads, `Date` first, and `Sub Main` calls `Probe.Show`:
   ```
   Private Function F(ByVal x As Date) As String
       F = "Date"
   End Function
   Private Function F(ByVal x As Double) As String
       F = "Double"
   End Function
   
   Dim x As Double = 1.5
   Debug.Print F(x)        ' Date
   ```
2. Press F5 and read the DEBUG CONSOLE: `Show` calls `F` with a `Double` variable, a `Date` variable, a `Date` literal and `CDate(1)`, and all four print `Date`.
3. Swap the two declarations and run again: all four print `Double`.

Whichever of the two is declared first receives every call. With `Date` first, a `Double` argument reaches the `Date` overload; with `Double` first, a `Date` variable, `#1/2/2026#` and `CDate(1)` all reach the `Double` overload.

What does not reproduce it: a `Date` overload beside a `String` one resolves correctly, and an overload set on `Byte`, `Integer`, `Long`, `LongLong`, `Single`, `Double`, `Currency`, `Decimal`, `Boolean`, `String` and `Variant` sends arguments of each of those types to their own overload. The compiler does tell the two types apart elsewhere: `TypeName` of a `Date` expression is `Date`, and a `Long` overload beside a `LongPtr` one is refused as a duplicate definition in a 32-bit build, as it should be.

**Expected behavior**
Each call reaches the overload for its argument's type: `Double` for the `Double` variable and `Date` for the three `Date` arguments, whichever overload is declared first. `Date` and `Double` are stored alike but are different types, and the other types in the overload set above are told apart.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 983, with the same result (the reproducer, `Date` first, prints `Date` four times). Severity: the wrong overload runs, with no diagnostic.

<!-- Reproducer: bugs/date-double-overload/ (mode run, expects the `Double variable: Date` line); verified on 995 and 983, and the swapped order measured on 995 on 2026-10-02 with a scratch copy (four lines of `Double`, `TypeName` printing Date). Found by the overload set used to detect the static type of arithmetic results while measuring the operators for Reference/Operators.md. -->

---

## `Boolean \ String` and `Boolean Mod String` convert the `String` to `Boolean`

*FILED #2439*

**Describe the bug**
With a `Boolean` on the left and a `String` on the right, `\` and `Mod` convert the `String` to `Boolean` instead of to a number, so the result has the wrong value and the wrong type. There is no diagnostic.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `boolean-intdiv-string.twinproj` (attached as `boolean-intdiv-string.zip`) and run it (F5). Its `Sub Main` holds the whole bug:
   ```
   Dim b As Boolean = True
   Debug.Print TypeName(b \ "2")
   ```
2. See `Boolean`, where `Long` is expected. The project prints these:

   | expression | result | expected |
   |---|---|---|
   | `b \ "2"` | `Boolean` True | `Long` 0, as `b \ 2.0` gives |
   | `b Mod "2"` | `Boolean` False | `Long` -1, as `b Mod 2.0` gives |

The results are consistent with converting `"2"` to `Boolean` (`True`, -1) first: -1 \ -1 is 1, stored as `True`, and -1 Mod -1 is 0, stored as `False`. A `String` literal and a `String` variable on the right both reproduce it.

**Expected behavior**
The `String` should be converted to a number, as every other operator does: `b + "2"` is the `Double` 1 and `b / "2"` the `Double` -0.5. `b \ "2"` should be the `Long` 0, and `b Mod "2"` the `Long` -1, the same as with the number 2.0.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
What does not reproduce it: every other operator converts the `String` to a number, as `b + "2"` and `b / "2"` above show, and so do `\` and `Mod` with the operands the other way round: `"2" \ b` is the `Long` -2. Also on BETA 983, with the same results. Severity: a wrong value and a wrong type, with no diagnostic.

<!-- No docs page states this defect; docs/Reference/Operators.md describes the String conversion and the `\` and `Mod` result types, and was written against the correct behaviour. Measured with scripts/bug_repro.mjs (run mode, verify) on 995 and 983. Found by the result-type probe for that page. -->

---

## Export Project follows a directory junction in its folder and deletes what it points to

*FILED #2456*

**Describe the bug**
**File → Export Project** empties its export folder before it writes, as the *Export Path* setting warns. It does not stop at a directory junction in that folder: it goes through the junction, deletes the files in the folder the junction points to, and then deletes the junction. Data outside the export folder is lost, and the only record is the Debug Console, with *Export Verbose* on.

**To Reproduce**
**This deletes files.** Do it only in a scratch folder made for this, `<S>` below, for example `C:\Scratch\junction-test`. Everything in `<S>\outside` is deleted.

Steps to reproduce the behavior:
1. Open `export-follows-junction.twinproj` (attached as `export-follows-junction.zip`), after unzipping it into `<S>`. Its *Export Path* is `${SourcePath}\export` and *Export Verbose* is on (Project Settings, Export).
2. In a Command Prompt, make the export folder, a folder outside it that holds a file, and a junction in the export folder to that folder:
   ```
   mkdir <S>\export
   mkdir <S>\outside
   echo keep me> <S>\outside\precious.txt
   mklink /J <S>\export\linked <S>\outside
   ```
3. Choose **File → Export Project**.
4. The Debug Console shows:
   ```
   [EXPORT]  DELETED: \\?\<S>\export\linked\precious.txt
   [EXPORT]  DELETED: \\?\<S>\export\linked
   ```
   and `<S>\outside` is empty afterwards.

**Expected behavior**
The export deletes the junction itself, or leaves it alone, and never what it points to. A junction (or symbolic link) is not part of the export folder's contents.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: data loss outside the folder the user chose. The command-line `export` verb does not reproduce it: it deletes nothing.

<!-- Asserted by `ide-test.bat --only export` (test/ide/export.test.mjs, "a junction in the export folder is followed, and its target emptied"), which calls the IDE's own `exportProjectTo()` over DevTools on a folder in the lane's work folder; passes on BETA 995. Found by the Export Project probe for round 8's UC-55. When fixed: update that test, docs/IDE/Menu/File.md and docs/IDE/Project Settings.md if they warn about it. The reproducer is mode manual: its steps are what a person does in the IDE, and nothing here changes the reader's registry. -->

---

## Export Project stops at a read-only file after deleting everything before it, and the IDE reports nothing

**Describe the bug**
When the export folder holds a read-only file, **File → Export Project** deletes the files and folders that sort before it, fails to delete the read-only one, and stops. Nothing is exported. The only record is three lines in the Debug Console: no dialog opens, and the compiler's response to the IDE is code 0, so the user is left with a half-emptied folder and no sign that the export failed.

**To Reproduce**
Do it in a scratch folder made for this, `<S>` below, for example `C:\Scratch\readonly-test`. **File → Export Project** empties `<S>\export`.

Steps to reproduce the behavior:
1. Open `export-stops-at-readonly-file.twinproj` (attached as `export-stops-at-readonly-file.zip`), after unzipping it into `<S>`. Its *Export Path* is `${SourcePath}\export` and *Export Verbose* is on (Project Settings, Export).
2. In a Command Prompt, make three files in the export folder and mark the middle one read-only:
   ```
   mkdir <S>\export
   echo x> <S>\export\a-first.txt
   echo x> <S>\export\m-readonly.txt
   echo x> <S>\export\z-last.txt
   attrib +R <S>\export\m-readonly.txt
   ```
3. Choose **File → Export Project**.
4. The last three lines of the Debug Console are:
   ```
   [EXPORT]  DELETE FAILED: \\?\<S>\export\m-readonly.txt
   [EXPORT]  ERROR: unable to clean the output folder
   [EXPORT] export failed.
   ```
   `<S>\export` now holds `m-readonly.txt` and `z-last.txt`: `a-first.txt`, which sorts before the read-only file, is deleted, and nothing was exported.
5. Afterwards: `attrib -R <S>\export\m-readonly.txt`.

On a `git init` working copy with a commit, the same export deletes `.git\config`, `HEAD`, `index`, `hooks` and `info`, then stops at the first object file. `git status` there reports `fatal: not a git repository`.

**Expected behavior**
Either the export deletes nothing when it cannot empty the whole folder, or it reports the failure to the user in a dialog, as for any other error, and says what it left behind. A failed clean-up should not leave the folder half emptied without a visible message.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: a partly emptied folder, with the only record in the Debug Console. On a Git working copy it breaks the repository, because Git makes its object files read-only.

A folder with no read-only file does not reproduce it: it is emptied and exported completely, `.git` included, with no prompt.

<!-- Asserted by `ide-test.bat --only export` (test/ide/export.test.mjs, "a read-only file stops the export part-way, and the IDE reports nothing"), which also checks that no message box is open; passes on BETA 995. The Git working-copy case was measured earlier on a `git init` folder and is not in the lane. Found by the same Export Project probe as the junction entry. When fixed: update that test and docs/IDE/Menu/File.md. -->

---

## Export Path refuses `${SourcePath}` alone, but not the same folder written as a path

*FILED #2457*

**Describe the bug**
The Settings editor refuses `${SourcePath}` as the *Export Path*, because **File → Export Project** empties its folder and `${SourcePath}` is the folder that holds the project file. The check compares the text only: the same folder typed in full is accepted, and the compiler applies no check of its own. An export into the project's own folder deletes the project file.

**To Reproduce**
**This deletes the project file.** Do it in a scratch folder made for this, `<S>` below, for example `C:\Scratch\sourcepath-test`, which holds nothing but the unzipped project.

Steps to reproduce the behavior:
1. Open `export-path-sourcepath-as-path.twinproj` (attached as `export-path-sourcepath-as-path.zip`), after unzipping it into `<S>`, so that it is the only file there. *Export Verbose* is on.
2. In Project Settings, Export, set *Export Path* to `${SourcePath}`. The editor refuses it: "${SourcePath} on it's own is not allowed. This would DELETE the project file, as the `Export Project` command empties the output folder before exporting."
3. Set it to `<S>` written out in full instead (`C:\Scratch\sourcepath-test`). The editor accepts it. Apply.
4. Choose **File → Export Project**.
5. The Debug Console shows `[EXPORT]  DELETED: \\?\<S>\export-path-sourcepath-as-path.twinproj`, and then `[EXPORT] COMPLETED`. The project file is no longer on disk. The project is still open, and **Save Project** writes the file back; closing without saving loses it.

**Expected behavior**
The check resolves the path, so that any spelling of the project's own folder (or a folder above it that the export would empty, down to the project file) is refused alike. Failing that, the compiler refuses to delete the project file it was exporting.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: the project file is deleted when the export folder is the folder that holds it.

The check is the `validate` function of `project.exportPath` in `ide/main.js`. It compares the lower-cased text with `${sourcepath}` and `${sourcepath}\`, and does not resolve the path. The compiler's side was measured by calling `exportProjectTo()` with the project's own folder: it logged `[EXPORT]  DELETED: \\?\<folder>\<project>.twinproj` and completed. That the editor accepts the same folder typed as a path (step 3) is read from the check's code, not tried by hand. The **Save** that writes the file back (step 5) was seen on BETA 983 only.

<!-- Asserted by `ide-test.bat --only export` (test/ide/export.test.mjs, "an export into the project's own folder deletes the project file"), which exports into the project's own folder with exportProjectTo() over DevTools; passes on BETA 995. The validate() text was read again in BETA 995's ide/main.js. Found by the same Export Project probe as the junction entry. When fixed: update that test, docs/IDE/Menu/File.md ("accepts the same folder written out in full") and docs/IDE/Project Settings.md, Export Path. -->

---

## Export Project writes the compiler packages, which the project does not hold, and the command line cannot pack the result

*CAPTURED IN \#841*

**Describe the bug**
**File → Export Project** writes a `Packages` folder holding the full source of the compiler packages the project uses: `VB`, `VBA`, `VBRUN` and `AppGlobalClassProject` for a project with the default references. That is 475 of the 477 files an export of a two-file project wrote. The project file does not hold them: a `.twinproj` the IDE saved holds only the packages the project embeds, and `twinBASIC_win32.exe export` of it writes only those.

The result is an export that cannot be packed back into a project by the supported tool, so it cannot serve for version control, and a two-file project exports as 477 files. `twinBASIC_win32.exe import` stops with exit code 999 and writes nothing on any folder under `Packages`.

**To Reproduce**
Do it in a scratch folder made for this, `<S>` below, for example `C:\Scratch\packages-test`. **File → Export Project** empties `<S>\export`. `<IDE>` is the folder that holds `twinBASIC.exe`.

Steps to reproduce the behavior:
1. Open `export-writes-compiler-packages.twinproj` (attached as `export-writes-compiler-packages.zip`), after unzipping it into `<S>`. It has two files and the default references. Its *Export Path* is `${SourcePath}\export`. In a Command Prompt: `mkdir <S>\export`.
2. Choose **File → Export Project**.
3. `<S>\export\Packages` holds the source of `VB`, `VBA`, `VBRUN` and `AppGlobalClassProject`.
4. In a Command Prompt:
   ```
   "<IDE>\bin\twinBASIC_win32.exe" import <S>\repacked.twinproj <S>\export\ --overwrite
   ```
   It stops with exit code 999 and writes nothing.
5. For comparison, `"<IDE>\bin\twinBASIC_win32.exe" export <S>\export-writes-compiler-packages.twinproj <S>\fromfile\ --overwrite` writes three files (`Settings` and the two sources) and an empty `Packages` folder, because the project file holds no package. (For a project embedding WinDevLib it writes `Packages\WinDevLib` and no other package.)

Then, on the 477-file export:
- the standalone script `scripts/impexp.mjs` packs it into a 4,220,723-byte project, against 2,055 bytes for the same export with `Packages` removed. The project now embeds its own copy of the four compiler packages. It compiles with no errors;
- the IDE's own **New Project → Import from folder...** does the same, into a 4,222,833-byte project, against 4,207 bytes from the export with `Packages` removed.

**The embedded copy is dead, and every later export writes it back.** Measured on the IDE's import:
1. Export a project with the default references into an empty folder `E`.
2. In `E\Packages\VBA\Sources\Math.twin`, add `Public Function ProbeEmbeddedMarker() As Long` before `End Module`, and a call to it in one of the project's own modules.
3. **Import from folder...** on `E`: TB5079, *Unrecognized symbol 'ProbeEmbeddedMarker'*. The compiler uses its own VBA package, not the copy the project now holds.
4. Save the project, and export it again: the Debug Console reports `[EXPORT] COMPLETED (139 folders, 954 files)`, against `(72 folders, 479 files)` before, and the exported `Math.twin` holds the marker. The export writes both copies to the same paths, the embedded one last.

So a project kept in Git through *Export After Save* and rebuilt from a clone keeps committing the package source of the IDE that first exported it, while it compiles against the current IDE's.

**Expected behavior**
A `.twinproj` the IDE saves holds no compiler packages, and so the export of it should not write them either; or **Import from folder** (and `import`) should skip the compiler packages' folders, or the export should write the IDE's own copy rather than the project's. The IDE's export of a project should pack back into the same project with the supported tool.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: the IDE's export of a project cannot be packed back into a project by the supported tool, so it cannot serve for version control; and a two-file project exports as 477 files.

Measured on BETA 995: the export writing `Packages\VBA` and the others, and the command line's `import` of it stopping with 999. The IDE's own import, the 4,222,833-byte project and the dead copy were measured on BETA 983. The two byte counts for the standalone script come from the earlier export, not from the reproducer project, whose two files differ a little.

What does not reproduce it: the command line's own `export`, which writes what the project file holds; and **Import from folder** on the export with the compiler packages' folders removed, which gives the 4,207-byte project, compiles, and exports 479 files.

<!-- Asserted by `ide-test.bat --only export` (test/ide/export.test.mjs: "an export into an empty folder writes the compiler packages" and "the command line's import refuses the IDE's export, for its compiler packages"); passes on BETA 995. The reproducer is manual because the export is a menu command. Found by checking round 9's UC-62 answer (Export After Save into a Git repository, rebuilt from a fresh clone with the tB executable); the export was round 8's, from exportProjectTo() over DevTools. The dead copy was measured after round 10's UC-66, with root.loadProjectFromFolder() and root.saveProjectAs(). When fixed: update that test, the `import` entry about exit 999 on a folder inside Packages, and docs/Features/Packages/Import-export tool.md and docs/IDE/Menu/File.md if they warn about it. -->

---

## An out-of-range index raises `&H8002000B` or `&H80004005`, not VBA's error 9

*FILED #2440*

**Describe the bug**
An array or `Collection` index that is out of range raises -2147352565 (`&H8002000B`, *Invalid index.*) or -2147467259 (`&H80004005`, *Unspecified error*). VBA raises error 9, *Subscript out of range*, so code that handles `Err.Number = 9` does not recognise the error. There is no diagnostic.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `index-error-numbers.twinproj` (attached as `index-error-numbers.zip`) and run it (F5). Its `Sub Main` holds the whole bug:
   ```
   Dim a(5) As Long
   On Error Resume Next
   a(7) = 1
   Debug.Print Err.Number, Hex$(Err.Number), Err.Description
   ```
2. See `-2147352565  8002000B  Invalid index.` for this case. The project goes on to try the other cases, one line each:

   | access | twinBASIC | VBA, per VBA-Docs' *Subscript out of range (Error 9)* |
   |---|---|---|
   | past a fixed or dynamic array's bound, a `Variant` array's, or `Split("x y")(5)` | -2147352565 (`8002000B`) *Invalid index.* | 9 |
   | an element of an array never dimensioned: `Dim u() As Integer: u(8) = 234`, VBA-Docs' own example | -2147467259 (`80004005`) *Unspecified error* | 9 |
   | a `Collection` member by a missing index or key | -2147467259 *Unspecified error* | 9 for a missing member |
   | `Forms(99)`, `Forms.Item(-1)` | -2147467259 *Unspecified error* | --- |

**Expected behavior**
Error 9, as in VBA, for each of these. `Err.Raise 9` already gives 9 with the description *Subscript out of range*.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 983, in the IDE and in a compiled EXE alike. Severity: VBA code that handles `Err.Number = 9` does not recognise the error, with no diagnostic. What does not reproduce it: `UBound` of an erased array, `Printers(99)` and `Err.Raise 9` all give 9, and division by zero gives 11. The IDE's run-time error panel shows the same number `Err.Number` holds, for the array case. An erased array behaves as one never dimensioned: `-2147467259` for an element, 9 from `LBound` and `UBound`. `Printers` raises 9 past its end but `-2147467259` for a negative index and for an unknown name. The description of `-2147467259` varies between runs: *Unspecified error* in one, *Automation error* in another. The project's output on BETA 995 matches the table's first three rows; the `Forms` row and the other facts in this paragraph are from earlier runs of the same kind, not re-run for this report.

<!-- Stated by docs/Reference/Default/VBA/ErrObject/Number.md (the table of error numbers that differ from VBA) and by docs/Reference/Core/On-Error.md; when fixed, update both. Measured with scripts/bug_repro.mjs (run mode, verify) on 995; earlier by compile probes through tbrun, in the IDE and as a built EXE on 983. -->

---

## Reading `Forms` by index returns a broken reference, and the process then crashes

*FILED #2458*

**Describe the bug**
In a loop over `Forms.Count`, `Set f = Forms(k)` with `f` declared `As Form`, followed by a read of `f.Name`, ends in an access violation (`0xC0000005`). As a compiled EXE the process exits with that code. Run in the IDE, the DEBUG CONSOLE reports `NATIVE EXCEPTION: ACCESS_VIOLATION` at the line that reads `f.Name`, and the run ends without returning.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `forms-by-index-crash.twinproj` (attached as `forms-by-index-crash.zip`). It is a Standard EXE project with one empty form, `Form1`, and a `Sub Main` that loads it:
   ```
   Dim f As Form
   Dim k As Long
   Load Form1
   For k = 0 To Forms.Count - 1
       Set f = Forms(k)
       Debug.Print "k = "; k; " name = "; f.Name
   Next k
   ```
2. Build the project and run the EXE, or run it in the IDE (F5).
3. See the process end with `0xC0000005` (exit code -1073741819), or the access violation in the DEBUG CONSOLE.

Declaring `f` As `Form1` or As `Object` instead, with everything else the same, returns the form and the program exits 0. With three forms loaded, the loop crashes the same way, and an earlier probe saw the loop variable corrupted: `k` read 0, 0, 0, then 8195702.

**Expected behavior**
`Forms(k)` returns the loaded form, `f.Name` is `Form1`, and the program exits 0, as it does with `f` declared `As Object`.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 983, as a compiled EXE (reproduced again with this project). Severity: crash (`0xC0000005`), from a form of access the documentation shows. What does not reproduce it, measured on BETA 995 as a compiled EXE: `Set f = Forms(0)` with the literal index 0 and no loop, then `f.Name`, returns `Form1` and the program exits 0; so does `s = Forms(0).Name`, and `Debug.Print Forms(0).Name`. An earlier entry said `s = Forms(0).Name` returns an empty string and the process later dies; this was not seen again here, and the loop is the smallest form found. From earlier probes: `n = 0: Set f = Forms(n)` outside a loop returns the form and the program exits 0; `For Each f In Forms` and `Unload Forms(i)` work; `Printers(0)` with a literal index works. A variant of the loop that wrote the name with a helper `Sub` instead of `Debug.Print` did not crash in one run; the crash was seen with `Debug.Print`, and with `Dim t As String = f.Name` and no printing.

<!-- Stated by the note at docs/Reference/Default/VB/Global/index.md line 47, and by builder/REVIEW-USECASES-5b4cd37.md item 26. That note says `Forms(0).Name` returns an empty string and the same for `Set f = Forms(0)` outside a loop; neither reproduced on 995 in the EXE with this project, so re-check the note's wording before filing: the loop is what reproduces. Measured with scripts/bug_repro.mjs run mode with "exe": true (tbrun --exe), verify, on 995 and 983; the IDE run (F5) also crashes on 995. Earlier entry text: found by the fix pass for round 8's error-number findings and by the IDE debugging probe for round 8's UC-61. -->

---

## A step key pressed on the line that raised an error leaves a step pending

**Describe the bug**
At a run-time error the debugger shows the error panel. Pressing a step key (F8, F10, F11 or Shift+F8) on the failing line re-runs the line, the error recurs and the mark does not move, as expected. But the step is then still pending: choosing **Ignore (Resume Next)** afterwards stops at the next line instead of running on, and the next F5 is used up as well. One command no longer means one thing, and the debugger stops where it was not asked to.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `step-key-leaves-step-pending.twinproj` (attached as `step-key-leaves-step-pending.zip`) and press F5. `FillTable` raises an error inside a loop, at the line marked `FAILS`:
   ```
   Private Sub FillTable()
       Dim a(3) As Long, i As Long, idx As Long = 5
       For i = 0 To 2
           Debug.Print "loop " & i
           a(idx) = i ' FAILS
           Debug.Print "after fail " & i
       Next
       Debug.Print "fill end"
   End Sub
   ```
   The error panel opens. The Debug Console shows `main start` and `loop 0`.
2. Press F8 on that line. The line runs again, the error recurs and the mark does not move.
3. In the error panel choose **Ignore (Resume Next)**.
4. It stops at the next line, `Debug.Print "after fail " & i`, which has not run (`after fail 0` is not in the Debug Console).
5. Press F5. Instead of running on from there, it runs to the loop's next error: the Debug Console now ends with `after fail 0` and `loop 1`, and the error panel is open again. The step F8 asked for was used up by that one stop.

**Expected behavior**
**Ignore (Resume Next)** runs on from the next line, whether or not a step key was pressed on the failing line first, as the panel says.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 983, identically. Moving past the failing line with **Set Next Statement** (Ctrl+F9) instead, each F5 then advances one line. An earlier run by hand, followed to the end, saw the pending step last until the procedure returned; what differed there is not known, and in the lane the step is used up by the one stop, as above.

What does not reproduce it: choosing **Ignore** without pressing a step key first, which runs on from the next line, to the next pass's error, as the panel says. Severity: the debugger stops where it was not asked to.

<!-- Asserted by `ide-test.bat --only debugger` (test/ide/debugger.test.mjs: "F8 on the failing line runs it again...", "after F8 there, Ignore stops on the next line instead of running on", "Ignore with no step first runs on..."); passes on BETA 995. The reproducer's Startup.twin is test/ide/probes/debugger/Sources/Startup.twin with a different header comment. Found by the IDE debugging probe for round 8's UC-61. When fixed: update that test, the Traps on docs/IDE/Menu/Debug.md and this entry. -->

---

## Stop at a run-time error ends only the procedure that raised it

*FILED #2441*

**Describe the bug**
When a program raises an untrapped error in the debugger and the error panel opens, **Stop** (the panel's button, the toolbar's Stop, or **Run → End**) ends only the procedure that raised the error. The caller carries on running: statements after the call still execute. The program goes on running after the user asked it to stop. Three runs, the same each time.

Its worst consequence is a false pass. At a failed `Assert`, whose error is raised by the assertion's own procedure, **Stop** ends only that procedure: the test carries on past the failed check, and a runner in the shape of the Assert tutorial (`Testing-with-Assert.md`) then prints `All PadLeft tests passed.`

**To Reproduce**
Steps to reproduce the behavior:
1. Open `stop-at-error-ends-procedure.twinproj` (attached as `stop-at-error-ends-procedure.zip`) and press F5. `Main` calls `FillTable`, which raises an error at the line marked `FAILS`, and prints a line after the call:
   ```
   Public Sub Main()
       Debug.Print "main start"
       FillTable
       Debug.Print "main after call"
   End Sub
   
   Private Sub FillTable()
       Dim a(3) As Long, i As Long, idx As Long = 5
       For i = 0 To 2
           Debug.Print "loop " & i
           a(idx) = i ' FAILS
           Debug.Print "after fail " & i
       Next
       Debug.Print "fill end"
   End Sub
   ```
   The error panel opens. The Debug Console shows `main start` and `loop 0`.
2. In the error panel choose **Stop**. (Or press the toolbar's Stop, or **Run → End**: the same.)
3. `FillTable` ends, and `Main` goes on: the Debug Console shows `main after call`.
4. A failed assertion: in `Main` change the call `FillTable` to `TestPadLeft`, which holds `Assert.Exact.AreEqual "   hi", "hi"` between two `Debug.Print` lines, and press F5. At the error panel choose **Stop**, or **Run → End**. `TestPadLeft` carries on past the failed assertion (`test after assert`) and `Main` prints `main after call`.

**Expected behavior**
**Stop** ends the whole run, as it does at an ordinary break: nothing more is printed.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 983: both lanes pass there as well. Severity: the program goes on running after the user asked it to stop.

What does not reproduce it: **Stop** at an ordinary break (a breakpoint or a step) prints `aborted` and ends the whole run. By hand on BETA 983, **Ignore (Resume Next)** at the failed assertion did the same as **Stop**, as it should, and moving execution to the test's `End Sub` with **Set Next Statement** and then choosing **Run → End** made it an ordinary break, and the run was aborted (two trials).

<!-- Asserted by `ide-test.bat --only debugger` (test/ide/debugger.test.mjs: "the panel's Stop ends only the failing procedure: Main goes on", "the Stop command, as the toolbar and Run > End give it, does the same", and the control "Stop at an ordinary break ends the whole run") and `ide-test.bat --only assert` (test/ide/assert.test.mjs, the failed-assertion case); all pass on BETA 995. The reproducer's Startup.twin joins the two probes (test/ide/probes/debugger and assert), with the assertion case as TestPadLeft, which is not called until Main is edited; that join was not itself run in a lane. Found by the same probe as the step-key entry; the assertion case by the fix pass for the Assert tutorial. When fixed: update those tests, the NOTE under "Running the tests" in docs/Tutorials/Testing-with-Assert.md, and the Traps on docs/IDE/Menu/Debug.md. -->

---

## A `Static` in a Module procedure cannot be initialised with an argument constructor of a class declared later in the project

**Describe the bug**
A `Static` variable in a Module procedure, initialised with `New` and a constructor that takes arguments, fails with TB5074 when the class is declared later in the project than the Module, in another file or further down the same file. With the class declared first, the same line compiles. `Dim` with the same initialiser compiles in both orders, so the declaration's position in the project changes whether a valid `Static` compiles.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `static-ctor-args.twinproj` (attached as `static-ctor-args.zip`). The project lists `Probe.twin`, which holds the Module, before `ProbeDog.twin`, which holds the class:
   ```
   ' Probe.twin
   Module Probe
       Public Sub T()
           Static s As Dog = New Dog("Rex")
           Debug.Print s.GetName()
       End Sub
   End Module
   
   ' ProbeDog.twin
   Private Class Dog
       Private m_Name As String
       Public Sub New(ByVal Name As String)
           m_Name = Name
       End Sub
       Public Function GetName() As String
           Return m_Name
       End Function
   End Class
   ```
2. See the project fail to compile with `TB5074 Could not bind to parameterized constructor of class 'Dog'. No compatible Sub New() method found`, at the `New`.
3. Move the `Dog` class into `Probe.twin`, above the Module: the project compiles with no error.

What does not reproduce it, each measured with the class declared later than the Module unless it says otherwise: `Dim s As Dog = New Dog("Rex")` compiles, and so does `Static s As Dog` with `Set s = New Dog("Rex")`; a `Static` with a constructor that takes no arguments compiles; the same `Static` in a method of a Class compiles; and the same `Static` with the class declared first compiles, in a Module procedure, a Function, a Class method and a Property Get, in one file or two, with the class `Private` or `[COMCreatable(False)]`. The failure holds for a `Private` class and a public `[COMCreatable(False)]` one, and with a second constructor beside the one that takes arguments.

**Expected behavior**
The declaration compiles whichever of the Module and the class comes first, as `Dim` does and as `Static` does when the class is first.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 983. Severity: a valid declaration does not compile, and which projects it affects depends on file order, so it appears and disappears as files are added. The workaround is a `Static` without an initialiser and a `Set` on first use, or declaring the class first. The order is the order of the files inside the `.twinproj`; the reproducer is packed with `Probe.twin` before `ProbeDog.twin`.

<!-- Reproducer: bugs/static-ctor-args/ (mode compile, expects TB5074); verified on 995 and on 983. Rewritten 2026-10-02: the entry used to say it did not reproduce on 983 or 995, because every earlier probe declared the class before the module; the order was found when scripts/bug_repro.mjs packed a project differently from the IDE's own import (the IDE's `import` lists files in reverse alphabetical order, scripts/impexp.mjs in alphabetical order) and the same files gave opposite results. Measured with compile probes through tbbuild, in a project of its own for each case. The title changed because it no longer describes the bug; nothing under scripts/ or test/ refers to it. docs/Reference/Core/New.md states that `Static d As Dog = New Dog("Rex")` fails with TB5074 and tells the reader to use Set: that is true only when the class is declared later, so reword it when the entry is filed, and again when fixed. -->

---

## *Import from file...* leaves the imported package unticked

**Describe the bug**
In Settings → References → Available Packages, **Import from file...** imports a `.twinpack` but leaves the package unticked. The compiler answers the IDE's `importPackage` request with success and the package's symbol, and the package appears in the Available Packages list, but nothing in the project can use it until the user ticks it by hand. The online import beside it ticks the package it imports.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `import-package-unticked.twinproj` (attached as `import-package-unticked.zip`). The package to import is in the second attachment, `DocProbePkg.zip`: it holds `DocProbePkg.twinpack`, a package of one function, `DocProbeVersion`.
2. Open Project Settings → References → Available Packages, press **Import from file...**, and choose `DocProbePkg.twinpack`.
3. `DocProbePkg` appears in the Available Packages list, unticked. (In the page, the compiler's answer to `importPackage` is `success: true, body: { packageSymbol: "DocProbePkg" }`.)

**Expected behavior**
The imported package is ticked, as after the online import, so that **Apply** is all that is left to do.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 983, by hand. Severity: the package is imported but not referenced, and nothing says so.

The cause looks like this. `packageLoadFromFile` in `ide/main.js` reads `packageSymbol` from the response itself (`t.packageSymbol`) rather than from its `body`, so it passes `"/Packages/undefined"` to `getAvailableTypeLibrariesData` and ticks nothing; `importPackage`, the online import beside it, reads `t.body.packageSymbol`. This was read again in BETA 995's `ide/main.js`.

<!-- Asserted by `ide-test.bat --only packages` (test/ide/packages.test.mjs, "the imported package is listed, but not ticked"), which clicks the real button and answers the native file picker from the page; passes on BETA 995. Its probes are test/ide/probes/packages/host and DocProbePkg, the reproducer's own project and package. Found by the package probe for round 8's UC-60. When fixed: update that test and the two Packages pages under docs/Features/Packages ("Importing a package from a TWINPACK file", "Updating a package"), which say the user must tick it. DocProbePkg.zip is not in git (bugs/**/*.zip is ignored): make it from DocProbePkg.twinpack. -->

---

## Replacing an embedded package under one Apply keeps running the old copy

**Describe the bug**
A project embeds a package built locally. In Settings → References, replacing it by another build of the same package (untick the old one, import the new `.twinpack`, tick the new one) and pressing **Apply** once leaves the compiler running the old copy. The console shows only `[COMPILER] Project settings updated`: no compiler restart and no save. Builds and runs keep using the old package.

**To Reproduce**
Use a machine with no copy of the package in `%APPDATA%\twinBASIC\packages`: a linked copy there makes the bug go away (see below).

Steps to reproduce the behavior:
1. Open `replace-embedded-package-one-apply.twinproj` (attached as `replace-embedded-package-one-apply.zip`). The two package builds are in the second attachment, `DocProbePkg-twinpacks.zip`: `DocProbePkg-v1.twinpack` and `DocProbePkg-v2.twinpack`, whose function `DocProbeVersion` returns 1 and 2.
2. Embed v1: Project Settings → References → Available Packages → **Import from file...** `DocProbePkg-v1.twinpack`, tick it, **Apply**. Replace the body of `Main` with
   ```
   Debug.Print "DocProbeVersion=" & DocProbeVersion()
   ```
   and press F5: the Debug Console shows `DocProbeVersion=1`.
3. Replace it with v2 under one Apply: in References untick `DocProbePkg`, then Available Packages → **Import from file...** `DocProbePkg-v2.twinpack`, tick it, and press **Apply** once.
4. The Debug Console shows only `[COMPILER] Project settings updated`. Press F5: it prints `DocProbeVersion=1`.

Save All and then a compiler restart give v2. A restart without saving brings v1 back, under a reference numbered 1.1.0.0. Two runs of two, on a machine with no linked copy of the package.

**Expected behavior**
After the **Apply**, builds and runs use v2, as they do when the same replacement is applied in two steps (below). Or the Apply restarts the compiler and saves, as the first embedding does.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: the project builds and runs the old package after the user has replaced it.

What does not reproduce it: an **Apply** after the untick, followed by another after the import and tick (every run; this is the control in the lane on BETA 995): each of those restarts the compiler and saves, and v2 runs at once. Also the same steps as above with a linked copy of the package present in `%APPDATA%\twinBASIC\packages` (six runs of six, on BETA 983): the same restart and save, and v2 runs.

<!-- Asserted by `ide-test.bat --only packages` (test/ide/packages.test.mjs, "one Apply after the untick, the import and the tick: no restart, no save, and v1 still runs", with "an Apply after the untick and another after the tick" as its control); both pass on BETA 995. The lane's v1 and v2 are generated from test/ide/probes/packages/DocProbePkg the way the reproducer's packages are (version 1 and 2, Return 1 and 2). Found by the package probe for round 8's UC-60. When fixed: update that test and docs/Features/Packages/Updating a package.md. The two package zips are not in git; make them from the .twinpack files. -->

---

## Embedding a package with no `Packages` folder puts the compiler in a crash loop

*FILED #2442*

**Describe the bug**
A `.twinpack` whose tree has no `Packages` folder, imported through Settings → References → Available Packages → **Import from file...**, ticked and applied, makes the compiler crash on each restart: `restarting from FILE` four times about two seconds apart, and then the IDE reports "Compiler crash loop detected. Restarting in SAFE mode."

**To Reproduce**
The package is invalid input, and it crashes the compiler four times: use an IDE you can restart.

Steps to reproduce the behavior:
1. Open `embed-package-without-packages-folder.twinproj` (attached as `embed-package-without-packages-folder.zip`). The package is in the second attachment, `DocProbePkg-nopackages.zip`: `DocProbePkg-nopackages.twinpack`, a package of one function, packed by `twinBASIC_win32.exe import` from a tree with a `Settings` file and `Sources\DocProbe.twin` and no other folder (the tree is `package\DocProbePkg` in the reproducer). The `import` verb writes `<name>.twinproj`; the file was renamed to `.twinpack`. The tree may lack `ImportedTypeLibraries` and `Miscellaneous` as well; neither matters.
2. In the project, Settings → References → Available Packages → **Import from file...** `DocProbePkg-nopackages.twinpack`, tick it, and **Apply**.
3. The Debug Console shows `[PROJECT] twinBASIC project saving to disk [DONE]`, then `restarting from FILE` four times about two seconds apart, and the IDE reports "Compiler crash loop detected. Restarting in SAFE mode."

**Expected behavior**
The compiler embeds the package, or refuses it with a diagnostic, and does not crash.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low. The input is invalid, and nothing in a normal workflow makes it: every package the IDE writes has the folder, and `scripts/impexp.mjs` and `impexp.py` add it when a tree lacks it. A crash is still a poor answer to it.

An empty `Packages` folder in the package tree is enough to prevent it: the same steps with that folder alone, or with all three (`DocProbePkg-control.twinpack` in the same attachment, which `impexp.mjs` made), restart the compiler once and run the package.

What does not reproduce it: a project with the same package already embedded under `Packages\DocProbePkg`, without the folder, and opened cold compiles clean (also on BETA 983). So the loop needs the package to be embedded by the IDE. BETA 983 has not been tried through the IDE: in a lane its References page never finishes loading.

<!-- Measured on BETA 995 with the packages lane's host and package, with the package's three empty folders varied one at a time: only the missing `Packages` folder made the lane's embedding Apply end in the crash loop, and one run was watched with --show. That variant is no longer in the lane, because test/ide/packages.test.mjs now packs DocProbePkg with impexp.mjs, which adds the folders (its header comment says why), so no lane asserts this entry today; the reproducer's package (made with the tB executable, no folders at all) and the host project were not run through the IDE again. Retry by hand, or put the variant back into the lane, before filing. When fixed: update the header comment of test/ide/packages.test.mjs. The two package zips are not in git; make them from the .twinpack files. -->

---

## A call through a `FastCall` or `ThisCall` delegate is made as stdcall on win32

*FILED #2443*

**Describe the bug**
On win32, a call through a delegate declared `FastCall` or `ThisCall` passes its arguments as stdcall does, whatever convention the delegate declares, and raises *Bad DLL definition. Stack corruption detected.* The delegate is unusable on win32: every call through it raises an error.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `fastcall-delegate-stdcall.twinproj` (attached as `fastcall-delegate-stdcall.zip`) and run it (F5) with the win32 target. Its declarations and the calls in its `Sub Main` hold the whole bug:
   ```
   Public Delegate Function FastDel FastCall (ByVal a As Long, ByVal b As Long) As Long
   
   Public Function GF FastCall(ByVal a As Long, ByVal b As Long) As Long
       Return a * 100 + b
   End Function
   
   Public Function GS(ByVal a As Long, ByVal b As Long) As Long
       Return a * 100 + b
   End Function
   
   Dim d As FastDel = AddressOf GF
   Debug.Print d(9, 1)        ' error: "Bad DLL definition.  Stack corruption detected."
   Dim e As FastDel = AddressOf GS
   Debug.Print e(9, 1)        ' 901: a stdcall target works, after warning TB0026
   ```
2. See the error for the call through `d`, and 901 for the call through `e`. The project declares a `ThisCall` delegate and function as well, and the same call through it raises the same error.

**Expected behavior**
901 from each call through `d`, as from calling `GF` directly.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: the delegate is unusable on win32. What does not reproduce it:
- calling `GF` directly: 901. The callee side is right: a `FastCall Naked` function that returns `ECX + EDX`, and a `ThisCall Naked` one that returns `ECX + [ESP+4]` and ends `ret 4`, return the right sums when called directly;
- delegates declared stdcall (no keyword) or `CDecl`, each pointed at a function of its own convention: 901;
- a win64 build: every case above returns 901 (x64 has one calling convention; this project run with the win64 target prints 901 for all of them).

Both keywords are new in BETA 990 and 992; BETA 987 refuses them (TB5182), and BETA 983 reports errors for this project at compile time. Measured in the IDE's `[RunAfterBuild]` run, and in the compiled EXE that `tbrun` left, run from its `Sub Main` and writing to a file: the same five results both ways.

<!-- Stated by docs/Features/Advanced/API-Declarations.md (the calling-conventions section, which describes the defect) and docs/Reference/Core/Delegate.md; when fixed, update both. Measured with scripts/bug_repro.mjs (run mode, verify) on 995 win32 and win64 and 983; the Naked callee, CDecl and stdcall controls and the exe run are from earlier tbrun probes in .claude/tooling-review-scratch/beta995-probes/callconv. -->

---

## An error in the body of a generic procedure names neither the type nor the call that caused it

**Describe the bug**
When a call to a generic procedure makes the procedure's body invalid for the type given, the error is reported in the body, twice, and names neither the type nor the line of the call. The diagnostic points at correct code. In a project with many calls to a generic procedure, nothing says which call to fix.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `generic-body-error.twinproj` (attached as `generic-body-error.zip`). Its one source file, `GenMax.twin`, holds the whole bug:
   ```
   Module GenMax
   Public Function Max(Of T)(a As T, b As T) As T
       If a > b Then
           Return a
       Else
           Return b
       End If
   End Function
   
   Public Sub Use()
       Dim c1 As New Collection, c2 As New Collection
       Dim m As Collection
       Set m = Max(Of Collection)(c1, c2)
   End Sub
   End Module
   ```
2. See the project fail to compile with `TB5092 Missing argument 'Index'`, reported twice, both times at the line of `If a > b` in `Max`. The message comes from `Collection`'s default member, `Item`. Neither error names `Collection`, and neither names the line of the call.

What does not reproduce it: calls with `Long`, `Double` and `String`, deduced or given with `(Of ...)`, which compile and return the larger value.

**Expected behavior**
A diagnostic that names the type argument and the call that supplied it. The `>` on a `Collection` is a legitimate error for this call, but it is the call that has to change, so that is where a person needs to be pointed.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 983, with the same TB5092. Severity: a diagnostic that points at correct code. `Max` uses `>` on a type parameter with nothing to say which types it accepts, which is how the problem arises.

<!-- Reproducer: bugs/generic-body-error/ (mode compile, expects TB5092); verified on 995 and 983. Found by probing round 9's UC-65 answer (the use-case evaluation corpus), whose Max uses `>` on a type parameter. -->

---

## Text that continues a `Debug.Print` line is escaped twice in the DEBUG CONSOLE

*FILED #2444*

**Describe the bug**
When a `Debug.Print` statement ends with `;`, the next `Debug.Print` continues the same line, and the DEBUG CONSOLE escapes that continued text twice: `&`, `<` and `>` show as `&amp;`, `&lt;` and `&gt;`. The text that opens the line comes out right.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `debug-print-escaped-twice.twinproj` (attached as `debug-print-escaped-twice.zip`) and run it (F5). Its `Sub Main` holds the whole bug:
   ```
   Debug.Print "A";
   Debug.Print "&"
   ```
2. See the DEBUG CONSOLE show `A&amp;`. The project's other lines show the rest: `Debug.Print "a < b";` followed by `Debug.Print " and c > d"` shows `a < b and c &gt; d`. After three statements, `Debug.Print "C";`, `Debug.Print "D";` and `Debug.Print "<&>"`, the line reads `CD&lt;&amp;&gt;`.

**Expected behavior**
`A&`, `a < b and c > d` and `CD<&>`: the console shows what the program printed, whether it is one statement or several.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: cosmetic, but it changes what a program appears to print. Also on BETA 983, with the same output. What does not reproduce it: a whole line (`Debug.Print "a < b & c"` shows exactly that), and the same text in one statement (`Debug.Print "B"; "&"` shows `B&`). The cause looks to be `debugOutputPartial` in `ide/main.js`, which takes all of a program's output, and an add-in's `PrintText` too, and adds to a line that is still open: it passes the new text through `TEXTtoHTML` twice, once as it builds the text and again as it stores it. When the new text's colour differs from the line's, the `</span><span class='...'>` it puts in to change colour goes through the second pass too, so the tags themselves show as text. The colour comes from the output: a program's plain output is `debugConsoleOutputText`, and a `PrintText` is `debugConsoleOutputTextYELLOW`. With a line left open in the first, made by calling `debugOutputPartial` from the page, a `PrintText` from the IDE's own Sample 10 add-in showed as `</span><span class='debugConsoleOutputTextYELLOW'>Hello there from WaynesWorldAddIn!`. A program's own open line followed by a `PrintText` was not tried.

<!-- Recorded in scripts/lib/tb-ide-console.mjs (comment at line 39), which decodes the console's stored entries once, as the pane renders them; when fixed, check that decode. Measured with scripts/bug_repro.mjs (run mode, verify) on 995 and 983 (the 983 output is identical). Found while making the add-in harness read text that the IDE appends to an open console line. -->

---

## An add-in's keyboard shortcut does not fire if it includes `{CTRL}` or `{ALT}`

*FILED #2445*

**Describe the bug**
A shortcut an add-in registers with `Host.KeyboardShortcuts.Add` does not fire when its key string includes `{CTRL}` or `{ALT}`. The SDK's own example, `{CTRL}{SHIFT}d` in the description of `KeyboardShortcuts.Add`, cannot be used, and nothing says why. An add-in that registers

```
Host.KeyboardShortcuts.Add "{CTRL}{SHIFT}d", AddressOf OnCtrlShiftD
Host.KeyboardShortcuts.Add "{SHIFT}d", AddressOf OnShiftD
```

gets `OnShiftD` for Shift+D, and nothing at all for Ctrl+Shift+D.

**To Reproduce**
`addin-shortcut-ctrl-alt` is an add-in project: building it makes a DLL that the IDE's compiler loads on every start until the DLL is removed. Install it knowingly, in an IDE you can restart, and remove it afterwards.

Steps to reproduce the behavior:
1. Open `addin-shortcut-ctrl-alt.twinproj` (attached as `addin-shortcut-ctrl-alt.zip`) and build it for Win32. The DLL is written to `Build\AddinShortcutCtrlAlt_win32.dll` beside the project file. Close the IDE, copy the DLL into the IDE's `addins\win32` folder (beside `twinBASIC.exe`), and start the IDE again. Open any project: the Debug Console shows `[KeysProbe] registered`. The add-in registers eight key strings and prints `[KeysProbe] fired <key string>` when one fires:
   ```
   .Add "{CTRL}{SHIFT}d", AddressOf CtrlShiftD
   .Add "{ctrl}d", AddressOf CtrlD
   .Add "{ALT}f", AddressOf AltF
   .Add "{SHIFT}D", AddressOf ShiftD
   .Add "d", AddressOf PlainD
   .Add "F1", AddressOf F1
   .Add "{shift}f1", AddressOf ShiftF1
   .Add "q", AddressOf PlainQ
   ```
2. With no text box focused (click an empty part of the toolbar), press D, Shift+D, F1 and Shift+F1, a second apart. Each prints a `fired` line: `d`, `{shift}d`, `f1`, `{shift}f1`.
3. Press Ctrl+Shift+D, Ctrl+D and Alt+F, a second apart. Nothing is printed for any of them.
4. Press D, then within half a second Ctrl+D and Ctrl+Shift+D; then F, and within half a second Alt+F. Now all of them print.
5. Remove the add-in: close the IDE and delete `addins\win32\AddinShortcutCtrlAlt_win32.dll`.

| registered | pressed | fires |
|---|---|---|
| `d`, `{SHIFT}D`, `F1`, `{shift}f1` | D, Shift+D, F1, Shift+F1 | yes |
| `{CTRL}{SHIFT}d`, `{ctrl}d`, `{ALT}f` | Ctrl+Shift+D, Ctrl+D, Alt+F, each more than 0.5 s after any other press of D or F | **no** |
| the same three | D alone, then Ctrl+D and Ctrl+Shift+D; F alone, then Alt+F, all inside 0.5 s | yes, all three |

**Expected behavior**
Each registered shortcut fires when its keys are pressed, whatever modifiers it names. The SDK's example, `{CTRL}{SHIFT}d`, works.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: the SDK's own example cannot be used, and nothing says why.

The last row of the table shows the cause. `globalKeyUp` in `ide/main.js` matches an add-in's shortcut when the key is released, and only if `realKeyPresses` holds a press of the same key from less than 500 ms before. `globalKeyDown` records a press only `if((!e.ctrlKey||e.key==="Control")&&(!e.altKey||e.key==="Alt"))`, so a key pressed with Ctrl or Alt held is never recorded. Its release finds either no press, or an earlier one of the same key made without the modifier. The IDE's own bindings are unaffected, because they are matched on the key-down.

A smaller point for the same fix: `KeyboardShortcuts.Add` stores the string as given, lowercased and without spaces, and the key-up builds the string it looks up as `{ctrl}`, `{shift}`, `{alt}` and the key, in that order. So `{SHIFT}{CTRL}d` could never match even with the recording fixed.

<!-- Asserted by `addin-test.bat --only keys` (test/addin/keys.test.mjs: "P1: plain, Shift and function keys fire", "P1: Ctrl and Alt keys do not fire", "P1: a Ctrl or Alt key fires when the same key was pressed alone just before"), which presses keys as CDP key events and passes on BETA 995 (observed first on 2026-09-24). The reproducer's add-in is test/addin/probes/keys with a new project name and header comment; its DLL name differs, and nothing else. When fixed: update P1 in WIP.HelpAddin.md, the NOTE on docs/Reference/Built-In/tbIDE/KeyboardShortcuts.md, and that test. -->

---

## F1 and the fold icon toggle the signature help, then fail

*FILED #2446*

**Describe the bug**
In the code editor's signature help, F1 and a click on the fold icon both toggle the help between expanded and collapsed, and then fail. Every F1 adds `command failed: "tbHelp_ToggleExpandSignatureHelp"` to the Debug Console, and every click on the icon throws an error in the page. The toggle works, so the error is the only symptom.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `f1-fold-signature-help.twinproj` (attached as `f1-fold-signature-help.zip`) and open `Main.twin`. Put the cursor inside the parentheses of the call `FindTheNeedle(3)` and press Ctrl+Space. The signature help shows, with a fold icon whose tooltip reads *Fold/Collapse (F1)*.
2. Press F1. The signature help expands, and the Debug Console shows `command failed: "tbHelp_ToggleExpandSignatureHelp"`. F1 again collapses it, with a second such line.
3. Click the fold icon instead. The signature help toggles, and the page throws `TypeError: Cannot read properties of undefined (reading 'stopPropagation') at toggleSigHelp`.

**Expected behavior**
The toggle, and no error.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: cosmetic. The toggle works, but every F1 adds the failure line to the Debug Console, and every click on the icon throws in the page.

`toggleSigHelp(e)` in `ide/main.js` ends with `e.stopPropagation();e.preventDefault()`, and neither caller passes an event: the command is `internalAction:()=>{toggleSigHelp()}`, and the icon is `onclick='toggleSigHelp()'`. The toggle comes first, so the error is the only symptom. `executeKeyboardShortcuts` catches the command's error and writes the Debug Console line.

F1 was measured on BETA 995, in a run where an add-in that registers F1 was loaded (it only shows that the shortcut fires; the IDE's own command is the one that fails). The click on the icon was measured on BETA 983, in a harness IDE with the page's exceptions recorded over CDP; `toggleSigHelp` and both callers are unchanged in BETA 995's `ide/main.js`.

<!-- Asserted by `addin-test.bat --only keys` (test/addin/keys.test.mjs, "P2: F1 while signature help shows toggles it, the IDE reports a failure, and the add-in fires"), which checks for the failure line; passes on BETA 995. The reproducer is the lane's host project (test/addin/host) with header comments, with no add-in, so the F1 step is the lane's minus the add-in's shortcut: not run without it. First observed on 2026-09-24. When fixed: update P2 in WIP.HelpAddin.md and that test. -->

---

## Typing just after a file opens at a position puts the text at that position, in reverse

*FILED #2447*

**Describe the bug**
For 700 ms after the code editor opens a file at a line and column (Go To Definition, a Find in Files result, an add-in's `Editors.Open`), the IDE puts the cursor back at that place whenever the compiler's decorations for the document arrive. Every edit brings new decorations, and each time the cursor goes back the 700 ms start again. So typing that starts inside the window, and goes on without a 0.7 s pause, puts each character at the opened position, in front of the one before it. Typed text goes to the wrong place and in the wrong order, and nothing shows that it happened.

**To Reproduce**
This was measured by a script. By hand it needs typing without a pause of 0.7 s, which is hard to time.

Steps to reproduce the behavior:
1. Open `typing-after-open-reversed.twinproj` (attached as `typing-after-open-reversed.zip`), with `Haystack.twin` not open in an editor tab.
2. Open `Haystack.twin` at line 4, column 9 through `openEditors.openFile(node, false, false, false, 4, 9)`, the call Find in Files makes (`node` is the file's entry in the project tree). By hand: Find in Files for `Dim needleCount` (one match, at line 4, column 9), and double-click the result.
3. 0.3 s later, move the cursor to line 3, column 1, and type `xyz`, one key every 150 ms.
4. Line 3 starts with `x`, and line 4 reads `        zyDim needleCount As Long`.

The cause is in `ide/main.js`: `parseDocumentDecorations` ends with `if(performance.now()-revealedLineTime<700){revealLineInEditor(revealedLine,revealedLineColumn,revealedLineViewPortTop)}`, and `revealLineInEditor` sets the cursor's position and `revealedLineTime` again. Logged in the run above: `revealLineInEditor(4,9)` from `gotFileData`, then from `parseDocumentDecorations` 9 ms later, and again after each key. The same happens for a file that is already open, whose `onReveal` calls `revealLineInEditor` too.

**Expected behavior**
Typing after the file opens puts `xyz` at 3:1, in order. Keeping the view where the reveal left it may be what the repeat is for; setting the cursor again is what does the damage.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 983 (not measured on BETA 995, see below)

**Additional context**
Severity: typed text goes to the wrong place and in the wrong order, and nothing shows that it happened.

What does not reproduce it: the same typing started more than 0.7 s after the file opened, which puts `xyz` at 3:1 in order.

Found by the add-in test harness: `MsgBox(`, typed into the code editor just after opening a file at line 5, came out as `gBox(s` at the start of that line, with the `M` on the line below.

BETA 995 was not measured: no lane exercises it. `parseDocumentDecorations` and `revealLineInEditor` are unchanged in BETA 995's `ide/main.js` (the `revealedLineTime<700` test was read again), and the test harness, which runs on BETA 995, still has to wait out the 700 ms before it places a cursor.

<!-- The harness waits it out with `afterReveal` in scripts/lib/tb-operate.mjs, used by openFile, setCursor and select; the keys and symbols lanes pass on BETA 995 through it. No test asserts the bug itself. The reproducer is the lane's host project (test/addin/host) with header comments; Haystack.twin's first line is a comment, so the line numbers above stay as in the entry. Measured with `openEditors.openFile(node,false,false,false,4,9)` over DevTools. To make it assertable: a lane test in test/addin that opens Haystack.twin at 4:9, types without afterReveal, and reads the text. When fixed: remove the wait from `afterReveal` and its comment. -->

---

## Hover says a `ByVal` parameter was auto-generated because `Option Explicit` is off

*FILED #2448*

**Describe the bug**
In a project with `Option Explicit` on, hovering over a `ByVal` parameter of type `String`, `Variant`, `Object`, a class or tbIDE's `Host` shows a note that the variable was auto-generated because `Option Explicit` is off, and recommends turning it on. The option is on, and the parameter was declared by the user.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `hover-byval-option-explicit.twinproj` (attached as `hover-byval-option-explicit.zip`) and open `Symbols.twin`. `project.optionExplicit` is true in its `Settings`. The file holds:
   ```
   Public Sub Probe2(ByVal h As Host, ByVal count As Long, ByVal col As Collection, _
                     ByVal o As Object, ByVal v As Variant, ByRef r As Host, ByVal s As String)
       Dim d As Host
       Debug.Print h Is Nothing, count, col Is Nothing, o Is Nothing, IsEmpty(v), r Is Nothing, s, d Is Nothing
   End Sub
   ```
2. Hover over `s` where `Debug.Print` uses it.
3. The hover shows:

   > *parameter* ByVal s As String
   >
   > ***note:*** *this variable was auto-generated due to* ***Option Explicit*** *being Off*
   >
   > ***recommendation:*** *use Option Explicit and declare variables explicitly*

| hovered | note |
|---|---|
| `ByVal` of `String`, `Variant`, `Object`, `Collection` or tbIDE's `Host` | **yes** |
| `ByVal` of `Long` | no |
| `ByRef r As Host` | no |
| a local, `Dim d As Host` or `Dim c As New Collection` | no |

**Expected behavior**
No note on any of them: `Option Explicit` is on and every one of these names is declared.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: cosmetic, but it tells the user to turn on an option that is already on, over a parameter they declared.

So it takes `ByVal` and a type that is not a plain number. That looks like a hidden local copy that the compiler makes for such a parameter, which the hover then describes as a variable it generated for an undeclared name.

This was measured by sending `textDocument/hover` over the compiler's language socket, with the parameters the IDE's own hover provider sends; the text above is the markdown that request returns, which is what the IDE's hover shows. The tooltip itself was not looked at in this run.

<!-- Asserted by `addin-test.bat --only symbols` (test/addin/symbols.test.mjs, "hover says a ByVal parameter of String, Variant, Object or a class was made because Option Explicit is off, which it is not"), which checks every row of the table; passes on BETA 995 (observed first on 2026-09-24). The reproducer is test/addin/probes/symbols reduced to Probe2 and its Settings; the lane's own project also holds the procedures the other hover tests ask about. When fixed: update that test and P5 in WIP.HelpAddin.md. -->

---

## Every tool window given no id is the same window

*FILED #2449*

**Describe the bug**
`Host.ToolWindows.Add` declares its id (`UniqueIdForPositionPersistance`) `Optional`, so leaving it out looks correct. But every tool window added without an id is the same window: the second `Add` returns the window the first one made, after emptying it, and both `ToolWindow` objects are bound to it. An add-in's windows overwrite each other, or another add-in's, and nothing says so.

**To Reproduce**
`toolwindow-no-id` is an add-in project: building it makes a DLL that the IDE's compiler loads on every start until the DLL is removed. Install it knowingly, in an IDE you can restart, and remove it afterwards.

Steps to reproduce the behavior:
1. Open `toolwindow-no-id.twinproj` (attached as `toolwindow-no-id.zip`) and build it for Win32. The DLL is written to `Build\ToolwindowNoId_win32.dll` beside the project file. Close the IDE, copy the DLL into the IDE's `addins\win32` folder (beside `twinBASIC.exe`), and start the IDE again. Open any project: the toolbar has a button, *No id windows*.
2. Click the button. The add-in runs:
   ```
   Set NoId1 = Host.ToolWindows.Add("Window one")
   NoId1.Title = "NO ID 1"
   NoId1.RootDomElement.ChildDomElements.Add("noid1", "div").Properties.innerText = "first"
   NoId1.Visible = True
   Set NoId2 = Host.ToolWindows.Add("Window two")
   NoId2.Title = "NO ID 2"
   NoId2.RootDomElement.ChildDomElements.Add("noid2", "div").Properties.innerText = "second"
   NoId2.Visible = True
   NoId1.RootDomElement.ChildDomElements.Add("noid1again", "div").Properties.innerText = "first again"
   ```
3. One tool window shows, titled `NO ID 2`, holding `noid2` (`second`) and `noid1again` (`first again`). The first window is gone, and what the add-in added through `NoId1` went into the second window.
4. Remove the add-in: close the IDE and delete `addins\win32\ToolwindowNoId_win32.dll`.

**Expected behavior**
Two windows, `NO ID 1` holding `first` and `first again`, and `NO ID 2` holding `second`: each window given no id is a window of its own.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: an add-in's windows overwrite each other, or another add-in's, and nothing says so. The id is declared `Optional`, so leaving it out looks correct. None of the IDE's add-in samples leaves the id out.

What does not reproduce it: a window given an id, or one window given none.

`createToolWindow` in `ide/main.js` files each window under `e.guid`, which is the `UniqueIdForPositionPersistance` argument, and `""` when it is left out. `createToolWindowById(e)` returns the window it already has under that id, after `n.bodyElement.innerHTML=""`, instead of making another, and the page answers the compiler with that window's number, so both `ToolWindow` objects are bound to it. The same reuse is what hands an add-in its own window back after a compiler restart, when it asks again for the id it used before (`test/addin/reload.test.mjs` in this repository's harness), so a fix would give each window without an id one of its own rather than change the reuse.

<!-- Asserted by `addin-test.bat --only panes` (test/addin/panes.test.mjs, "ToolWindows.Add: two windows given no id are one window, emptied by the second Add"), which reads `toolWindowsById` over CDP and finds one window with id "", titled NO ID 2, holding noid2 and noid1again; passes on BETA 995 (observed first on 2026-09-25). The reproducer's add-in is the panes probe's third button (test/addin/probes/panes) alone, with the two windows' names changed. When fixed: update that test, and the ToolWindows page's note on windows without an id (docs/Reference/Built-In/tbIDE/ToolWindows.md). -->

---

## `[PopulateFrom]` with no arguments crashes the compiler

*FILED #2450*

**Describe the bug**
An `Enum` marked `[PopulateFrom]` with no argument list crashes the compiler while the project is parsed. `tbbuild` reports it as a crash, `the compiler crashed 2x -- this project takes it down`, `last parsing: CrashProbe.twin`. A person who forgets the arguments is not told what is missing.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `populatefrom-no-args.twinproj` (attached as `populatefrom-no-args.zip`). Its one source file, `Probe.twin`, holds the whole bug:
   ```
   Public Module CrashProbe
       [PopulateFrom]
       Public Enum E
       End Enum
   End Module
   ```
2. See the compiler crash and restart while the project is parsed.

The body of the Enum does not matter: the same crash comes with a member in it, and with the Enum inside a Class instead of a Module. The documented shape is five strings, `("json", "/Resources/PROBE/Strings.json", "events", "name", "id")`, and the other wrong shapes tried are handled:

| argument list | result |
|---|---|
| none, `[PopulateFrom]` | **the compiler crashes** |
| `(True)`, `(False)`, `(1)` | TB5155 `This attribute is not supported in this context` |
| `("probe")`, on the reproduction above | TB5083 `unsupported data source` |
| the documented five strings, with a resource that exists | compiles |

**Expected behavior**
A diagnostic naming the missing arguments, as the other wrong argument lists get (TB5155 or TB5083), not a crash. A missing argument list is the one wrong shape that is not checked.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
First seen on BETA 987; the reproducer crashes BETA 983 as well. Severity: the compiler process dies while the project is being parsed. The same project with `[PopulateFrom("probe")]` builds and reports the one TB5083 row. The rows for `(True)`, `(False)` and `(1)` come from a batch of probes, not from the reproducer.

<!-- Reproducer: bugs/populatefrom-no-args/ (mode compile, expects tbbuild exit 4); verified on 995 and 983. Observed 2026-09-30 two ways: scripts/sweep_attributes.mjs builds every attribute at every declaration site in batches of 400 and halves a batch the compiler crashes on, and each of the three Enum sites (an Enum with a member, an empty Enum, an Enum in a Class) was narrowed to one probe beside the three canaries the tool adds to every batch, which build clean without it; the four-line reproduction was then built exactly as written, in a project holding only it and a two-line Sub Main, with no resources. The sweep tooling (scripts/sweep_attributes.mjs, its notes in WIP.Harness.md) meets the crash through the halving; when it is fixed, re-run the sweep for PopulateFrom and update whatever note records the crash. -->

---

## `As New` refuses a class whose only constructor has all-`Optional` arguments

*FILED #2459*

**Describe the bug**
`Dim x As New C` fails with TB5121 when the only constructor of `C` has nothing but `Optional` arguments, so it can be called with none. The same class passes TB5135, the check for COM exposure: it compiles as a public class without `[COMCreatable(False)]`, so that check counts the constructor as one that takes no arguments. The two checks for "can this class be created without arguments" disagree.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `asnew-optional-ctor.twinproj` (attached as `asnew-optional-ctor.zip`). Its one source file, `Probe.twin`, holds the whole bug:
   ```
   Class COpt
       Public V As Long
       Public Sub New(Optional ByVal n As Long = 3)
           V = n
       End Sub
   End Class
   
   Module Probe
       Public Sub T()
           Dim x As New COpt
           Debug.Print x.V
       End Sub
   End Module
   ```
2. See the project fail to compile, on the `Dim`, with `TB5121 can't use this type with As-New syntax as it doesn't have a parameterless constructor`.

What does not reproduce it: a class with a `Class_Initialize` beside a `Sub New` that takes a required argument, or with a second `Sub New` with no parameters, is accepted. A class whose only `Sub New` takes a required argument is refused, `Private` or `[COMCreatable(False)]` alike, which is the diagnostic working as intended.

**Expected behavior**
The project compiles, and `x.V` prints `3`, as it does on BETA 983. A constructor whose arguments are all `Optional` can be called without arguments, which is what `As New` needs.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
BETA 983 accepts the reproducer and runs it. TB5121 is the diagnostic BETA 993's notes describe ("classes with [COMCreatable(False)] set on them cannot be used as an As-New datatype"), corrected in 995. Severity: code that compiled before BETA 993 stops compiling.

<!-- Reproducer: bugs/asnew-optional-ctor/ (mode compile, expects TB5121); on 983 it compiles clean, so verify there reports NO LONGER REPRODUCES, as it should. Observed on 2026-10-01 with compile probes through tbbuild, each case a project of its own, on BETA 995 and BETA 983; the run on 983 was a compiled EXE through tbrun. docs/Reference/Core/New.md states that a class whose only Sub New takes arguments, even if every argument is Optional, fails As New with TB5121; when this is fixed, that sentence is wrong for the Optional case. -->

---

## `FileCopy` of an open file raises `&H80004005`, where VB6 raises 55 or copies it

*FILED #2451*

**Describe the bug**
`FileCopy` of a file that is open raises -2147467259 (`&H80004005`, *Unspecified error*), whatever mode the file is open in. VB6 raises error 55, *File already open*, for a file open `For Append`, and copies a file open `For Input` without an error. Code that handles VB6's error 55 does not recognise the error, and a copy that VB6 makes is refused.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `filecopy-open-file.twinproj` (attached as `filecopy-open-file.zip`) and run it (F5). Its `Sub Main` makes a file in `%TEMP%` and then does this:
   ```
   On Error Resume Next
   Open f For Append As #2
   FileCopy f, f & ".copy"
   Debug.Print Err.Number, Err.Description
   ```
2. See `-2147467259 Unspecified error`. VB6 prints `55 File already open`.
3. See the second line the project prints: with the file open `For Input` instead, twinBASIC raises the same `-2147467259`, and VB6 copies the file without an error.

**Expected behavior**
Error 55 for the file open `For Append`, and a successful copy for the file open `For Input`, as in VB6.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
BETA 983 copied an open file with no error, in both modes (the project prints 0 for all three lines); BETA 984's notes list the change ("FileSystem.FileCopy function would previously allow copying of an already open file without error"), and only the error number and the `Input` case differ from VB6. What does not reproduce it: the file closed (the third line the project prints is 0). Severity: code that handles VB6's error 55 does not recognise the error, and a copy that VB6 makes is refused.

<!-- Stated by docs/Reference/Default/VBA/FileSystem/FileCopy.md (the note at line 25); when fixed, update it. Measured with scripts/bug_repro.mjs (run mode, verify) on 995 and 983; the VB6 results are from the same statements compiled by `VB6.EXE /make` and run, on 2026-10-01. -->

---

## `Err` after a handled `Err.Raise` in an LLVM-compiled procedure holds `&HEAEAEA01` and no text

*FILED #2452*

**Describe the bug**
In a procedure compiled with LLVM, an `Err.Raise` that the procedure handles leaves `Err.Number` at -353703423 (`&HEAEAEA01`), with an empty `Err.Source` and the generic description *Application-defined or object-defined error*. The handler cannot tell which error it caught.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `llvm-err-after-raise.twinproj` (attached as `llvm-err-after-raise.zip`). It needs an LLVM licence (Ultimate): the procedure below is compiled with LLVM by its attribute. Run it (F5).
   ```
   [CompilerOptions("+llvm")]
   Private Sub LlvmRaise()
       On Error Resume Next
       Err.Raise 5, "MySrc", "my text"
       Debug.Print Err.Number & " / " & Err.Source & " / " & Err.Description
   End Sub
   ```
2. See `-353703423 /  / Application-defined or object-defined error`. The project also calls the same procedure without the attribute, and that one prints `5 / MySrc / my text`.

**Expected behavior**
`5 / MySrc / my text`, as without the attribute.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: an error handler in LLVM-compiled code cannot tell which error it caught. The same happens with `On Error GoTo` and a handler, with `Err.Raise 11` and with `Err.Raise 1000`, on win32 and win64. What does not reproduce it: a run-time error the procedure causes itself, `1 \ 0` on a `Long`, reads correctly as 11, and `Err.Number = 7` assigned directly reads 7. Measured in the IDE's run only (a `[RunAfterBuild]` probe through `tbrun`); not run in a built exe. BETA 983 refuses the project's LLVM procedure ("Unable to compile due to use of datatype that is not yet supported for LLVM compilation"), so it was not compared there.

<!-- Stated by docs/LLVM/Getting-Started.md (the note at line 61), and the page's samples are measured on 995; when fixed, update it. Measured with scripts/bug_repro.mjs (run mode, verify) on 995; the On Error GoTo, Err.Raise 11 and 1000 and win64 variants from tbrun probes on 2026-10-01 and not re-run for this report. -->

---

## `End` in an LLVM-compiled procedure restarts the IDE's compiler

**Describe the bug**
Running a project in the IDE (F5), an `End` statement in a procedure compiled with LLVM ends the run, and the DEBUG CONSOLE then shows `restarting from MEMORY [<project>]`: the compiler restarts and compiles the project again. The IDE recovers.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `llvm-end-restarts-compiler.twinproj` (attached as `llvm-end-restarts-compiler.zip`). It needs an LLVM licence (Ultimate): the procedure below is compiled with LLVM by its attribute.
   ```
   [CompilerOptions("+llvm")]
   Private Sub Stopper()
       Debug.Print "before End"
       End
   End Sub
   ```
   `Sub Main` calls `Stopper`.
2. Run the project in the IDE (F5).
3. See `before End` in the DEBUG CONSOLE, and then `restarting from MEMORY [<project>]`.

**Expected behavior**
The run ends, as it does without the attribute, with no restart of the compiler.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low; the IDE recovers, but the project is compiled again, and LLVM-compiled code run in the IDE is not recommended anyway. Without the attribute the run ends with no restart. In a built exe, with or without LLVM, `End` ends the program with exit code 0 (this project run with `tbrun --exe` on 995 exits 0). BETA 983 ignored the `End` and went on (fixed in 985 for built programs); this project's LLVM procedure is refused by 983 ("Unable to compile due to use of datatype that is not yet supported for LLVM compilation"), so that was not re-measured with it.

<!-- No docs page states this (docs/LLVM/Getting-Started.md does not mention End); when fixed, nothing to update. Measured with scripts/bug_repro.mjs (run mode: tbrun exit 5, output "before End" then "restarting from MEMORY"; verify) on 995, and the exe with `run --exe` on 995; the 983 behaviour from tbrun and tbrun --exe on 2026-10-01. -->
