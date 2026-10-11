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
- **Screenshots** is left out when there are none. A graphical defect's section says what
  each panel of its comparison shows and embeds the picture, as
  `![<what it shows>](bugs/<slug>/images/<name>-compare.png)`, so that it shows in this file;
  `bug_repro.mjs file` rewrites the path to `images/<name>-compare.png` in `REPORT.md`. A
  GitHub issue cannot reach a path in the repository, so when the entry is pasted into one,
  the picture is dragged into the issue in place of that line.
- **Desktop** gives the build as `BETA <n>`, the build it was last reproduced on.
- **Additional context** gives what did not reproduce it, the severity, and the builds it
  was checked on besides the one above.

**A follow-up to a closed issue** --- one whose fix left part of the defect, or a case its
report named only in passing --- opens its **Describe the bug** with "Follow-up to #NNNN,
which is fixed in BETA <n> for <what it fixed>; this is <what is left>." Its **To Reproduce**
ends with regression tests the twinBASIC developers can adapt (owner, 2026-10-10): a
`[TestFixture]` module, introduced by one sentence, with one `[TestCase]` per behaviour that
asserts the correct result, covering what the old issue described (these pass) and what is
left (these fail), or compile cases for a diagnostic, or a scripted check where no unit test
reaches. Its reproducer is a `test` reproducer that holds that module (see below).

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
| `bugs/<slug>/<slug>.zip` | the `.twinproj` zipped, because a GitHub issue does not accept a `.twinproj` attachment, with any file `repro.json`'s `attach` names, such as a `.twinpack` | no |
| `bugs/<slug>/vb6/` | optional: a VB6 project, to show what VB6 does where the entry compares it with twinBASIC: `Probe.vbp` and its `.bas`, `.cls`, `.frm` and `.ctl` files (with their `.frx` and `.ctx`), sources only, never an exe or an output | yes, byte for byte |
| `bugs/<slug>/<slug>-vb6.zip` | the source files of `vb6/` zipped, to attach beside the other zip; written only when `vb6/` exists | no |
| `bugs/<slug>/images/` | optional: the pictures of a graphical defect, `<name>-tb.png` (from `run`), `<name>-vb6.png` (from `vb6`) and `<name>-compare.png`, which shows both and their difference; the zip holds them all | yes |

**A graphical defect carries pictures.** Its `repro.json` names them under `images`, the
`PngDump` modules from `test/repro-templates/png/` save them (`new --with-images` copies them),
and its entry embeds each `-compare.png` under **Screenshots**: what twinBASIC drew beside
what VB6 drew, the pixels that differ in red. `test/png.test.mjs` fails when an entry or a filed
`REPORT.md` does not embed one. `expect.imagesDiffer` lets `verify` judge by them.

`scripts/bug_repro.mjs` makes and checks them (the tool's page is
[Tools and Scripts](docs/Documentation/Tools-Defects.md#bug-repro)):

```sh
node scripts/bug_repro.mjs new <slug> "<entry title>"   # bugs/<slug>/src/ and repro.json
node scripts/bug_repro.mjs pack <slug>                  # src/ -> <slug>.twinproj -> <slug>.zip; vb6/ -> <slug>-vb6.zip
node scripts/bug_repro.mjs compile <slug>               # compile it in the IDE, print the diagnostics
node scripts/bug_repro.mjs build <slug>                 # and build it
node scripts/bug_repro.mjs run <slug>                   # run Sub Main, print the DEBUG CONSOLE
node scripts/bug_repro.mjs vb6 <slug>                   # build vb6/ with VB6, run it, print out.txt
node scripts/bug_repro.mjs verify [<slug> ...]          # does each entry still reproduce?
node scripts/bug_repro.mjs file <slug> <issue>          # move a filed entry out of the queue
node scripts/bug_repro.mjs file --marked                # the same for every marked entry
```

`new` starts the project from the console template, with an empty `Sub Main` in a `Startup`
module, or with `--template <name>` from a folder of `test/repro-templates/`, such as
`webview2-form`, a form holding one WebView2 control; edit `src/Sources/`, then `pack`. What `pack` does is the importer, then a zip of the
file it writes and of the files `attach` names, which the tool does itself:

```sh
node scripts/impexp.mjs import bugs/<slug>/<slug>.twinproj bugs/<slug>/src --overwrite
```

`bugs/<slug>/repro.json` says how to ask the compiler about the entry, and is committed with
the reproducer: a `mode` of `compile`, `build`, `run`, `test` (its `[TestCase]` Subs and
compile cases, run by `tbrun --tests`), `cli` (the compiler executable's own
command line), `lane` (a lane of `ide-test.bat` or `addin-test.bat` and the tests in it that
assert the bug), `probe` (a script under `scripts/`) or `manual`, and what a reproduction
looks like in `expect`, such as the exit code of `tbbuild`, the diagnostic codes, or a
regular expression the output must match. A bug that needs the IDE operated gets a lane
test rather than `manual` steps, so that no entry needs a person at the IDE; `steps` still
holds the recipe for the issue. `verify` reads it for every entry and reports `reproduces`,
`NO LONGER REPRODUCES` (the bug may be fixed on this build) or `manual`, which prints the
`steps` it holds. It needs a twinBASIC install, and is run by a person, never by a gate or
by CI.

**A VB6 comparison is a project of its own in `vb6/`**, made by `new <slug> "<entry title>" --with-vb6`
from the template in `test/repro-templates/vb6/`. By convention `Probe.vbp` builds `Probe.exe`,
and `Sub Main` writes what it finds to `out.txt` beside the exe, with every error handled: an
unhandled error or a `MsgBox` in a compiled exe opens a modal box on the desktop of whoever runs
it, so `pack` and `vb6` refuse a project whose sources call `MsgBox` or `InputBox`. `vb6 <slug>`
builds it in a copy under the temp folder, so no exe or output lands in `bugs/`, with VB6's
Unattended Execution option, and prints `out.txt`. It needs VB6 (`--vb6 <path>` or `VB6_EXE`) and no
IDE, and is run by a person. VB6 is only ever started by this tool, never from a shell: in a shell
`/make` is rewritten as a path, and VB6 answers with a modal box. An entry that quotes VB6's output
says that the project is attached as `<slug>-vb6.zip`, and every entry that quotes it has a
project of its own in its own reproducer.

Attach the `.zip`, and the `-vb6.zip` when there is one, to the issue. When the entry is filed, its folder moves to
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

*DEFERRED until after v1*

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

<!-- Lane mode in bugs/recent-projects-copies/repro.json: asserted by `ide-test.bat --only recent-projects-copies` (test/ide/recent-projects-copies.test.mjs), which passes on BETA 997; the test records the user's own list value by value and puts it back afterwards. Stated in WIP.Harness.md (the recent-list tidy, which exists because of it) and scripts/lib/tb-registry.mjs; when fixed, the note there that a short list trips it can go. Measured 2026-09-23 on BETA 983 by reading the registry after tbbuild --keep opened a fixture project on a private desktop and the IDE was ended by its pid, and again on BETA 995 on 2026-10-01 (cli995/rec-995-*.txt). The harness trips it because every IDE a run starts opens a project: a run that began on a list of one entry once ended with seventeen copies of it. -->

---

## `--buildAndExit32` writes nothing, exits 0 on a project with errors, and hangs on a failing build

*DEFERRED until after v1*

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

<!-- Lane mode in bugs/build-and-exit-silent/repro.json: asserted by `ide-test.bat --only build-and-exit-silent` (test/ide/build-and-exit-silent.test.mjs, both cases, the IDE executable on a private desktop through launchOnDesktop), which passes on BETA 997. First measured with a scratch copy of scripts/lib/tb-launch.ps1 (private desktop, kill-on-close job, TBBUILD_CMD replacing the command line, standard handles redirected to a file), with scripts/lib/tb-registry.mjs startTidy and finishTidy around the run. Stated in scripts/tbbuild.mjs (header comment) and WIP.Harness.md, "Do not reach for --buildAndExit32 instead": when fixed, those two say the switch is unusable. So do docs/Documentation/Tools.md (the tbbuild section) and docs/Features/Packages/Import-export tool.md ("Compiling from the command line"). All four say exit 0 only for an error in code nothing calls, and a hang for an error the build reaches. -->

---

## An interface member marked `[PreserveSig]` cannot be implemented by a class

*DEFERRED until after v1*

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

<!-- Reproducer: bugs/preservesig-implements/ (mode compile, expects TB5004 and TB65535); verified on 995, and on 983 it differs only in the second code. Found by scripts/check_examples.mjs over Reference/Core/Interface.md, whose example declared IFoo with a [PreserveSig] member and then showed a class implementing it; the example no longer puts [PreserveSig] on a member it implements, and its description of the attribute says why. Also stated in docs/Reference/COM-Interfaces/IEnumVARIANT.md (the Err.ReturnHResult paragraph) and in a NOTE in docs/Features/Advanced/API-Declarations.md, "ThisCall in interfaces", whose Sub + Err.ReturnHResult workaround goes with it when fixed. -->

---

## `export` and `import` stop at the 260-character path limit, apart from the one path they prefix with `\\?\`

*DEFERRED until after v1*

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

<!-- Automated: bugs/path-limit-260/repro.json is a cli reproducer, import to a 239-character file name in the temp folder (generated, 230 f characters plus .twinproj; the temp folder's own length adds to it, so it fails whatever TEMP is). It tests the file limit only; the export side needs an existing deep folder, which the cli mode cannot create, so it is in the steps above. Stated in WIP.Harness.md (why the tooling does not run the compiler's verbs); the census unpacks with impexp, in process. Measured on BETA 995, the file and folder rows with the HelloWorld sample and the reproducer's project, and the input path 303 characters long. Found by the attribute census pointed at a cache folder in a deep working directory: WebView2Package and the three cefPackage versions came back ... FAILED while the other twelve packages exported. -->

---

## A damaged project file opens a message box, and the command waits until it is closed

*DEFERRED until after v1*

**Describe the bug**
Given a file that is not a valid project, the compiler executable opens a modal message box and prints nothing more until it is closed. `export`, `settings` and `readme` each wait on the box indefinitely. Once the box is closed, `export` prints `WARNING: failed to parse project file, file may be corrupt`, then `... DONE`, and exits 0; `settings` and `readme` print an `ERROR:` line, and exit 0 as well.

**To Reproduce**
Steps to reproduce the behavior:
1. Unzip `damaged-project-modal-box.zip`. It holds `damaged-project-modal-box.twinproj`, an ordinary valid project, and four damaged copies of it: `garbage.twinproj`, `empty.twinproj`, `firstbyte.twinproj` and `cut.twinproj`. They were made in PowerShell: `$b = [IO.File]::ReadAllBytes("C:\p\damaged-project-modal-box.twinproj")`, then `$b[0] = $b[0] -bxor 0xFF; [IO.File]::WriteAllBytes("C:\p\firstbyte.twinproj", $b)` for one with its first byte changed, and `[IO.File]::WriteAllBytes("C:\p\cut.twinproj", $b[0..([int]($b.Length / 2))])` for one cut off halfway. A 20-byte text file named `garbage.twinproj`, or an empty file, is damaged enough too.
2. Run `twinBASIC_win32.exe export C:\p\garbage.twinproj C:\p\out\`, on a desktop someone is watching.
3. See a message box titled `TWINBASIC ERROR`, saying `invalid file header: bad file format`, and no output after the `exporting from ... to ...` line. The command is still waiting when it is ended after 20 seconds. The empty file and the one with its first byte changed give the same box.
4. Close the box. See `WARNING: failed to parse project file, file may be corrupt`, then `... DONE`, and exit code 0, with no file written.
5. Run `settings` or `readme` on the same file: each waits on the same box, prints nothing until it is closed, then prints `ERROR: failed to parse project file, file may be corrupt or inaccessible` and exits 0.
6. Run `export` on the project cut off halfway. The box is titled `bad file format` and says `WARNING: failed to deserialize file system.  Some files might be lost or truncated.` Once it is closed, `export` writes the one file it could read, `Sources\Startup.twin`, prints `[EXPORT] DONE:` for it and then `... DONE`, with no warning, and exits 0. `settings` on it waits on the same box, then prints `ERROR: failed to find file, file may be corrupt`; `readme` waits, then prints nothing.

**Expected behavior**
No window opens from a command-line verb. The command prints the problem (`ERROR: failed to parse project file, file may be corrupt or inaccessible`, which it already prints when a folder is given where the project should be), ends `... FAILED`, does not report `... DONE` for a file it could not read, and exits with a code other than 0.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: an unattended `export`, `settings` or `readme` never finishes, and once the box is closed every one of them exits 0 and `export` reports success, so a script that tests the exit code or `... DONE` is fooled as well.

All four kinds of damaged input open the box under all three commands, on BETA 995 and on BETA 983. The undamaged project exports at once, with no box. On BETA 983 `export` of the project cut off halfway wrote `Settings` rather than `Sources\Startup.twin`.

What does not reproduce it: a folder given where the project should be. `settings` then prints `ERROR: failed to parse project file, file may be corrupt or inaccessible` and exits, with no box.

<!-- A cli reproducer in bugs/damaged-project-modal-box/repro.json, run on a private desktop by bug_repro, which reads each box and closes it (the probe that found it opened message boxes on the user's desktop three times on BETA 995 alone, which is why nothing runs these commands on a desktop anyone uses). No test or page states it. The command-line verbs are described on docs/Documentation/Tools.md (impexp) and in scripts/impexp.mjs, which does not open a box for a damaged file; check them when fixed. Found by probing the command line for the rewrite of the Import/Export Tool page; on BETA 983 the boxes appeared on the desktop of the person at the machine (25 second limit). On BETA 995 all fifteen runs (three commands, four damaged inputs and the undamaged control) were made on a private desktop inside a kill-on-close job, the box's title and text read from that desktop, and each run repeated with OK pressed after 3 seconds (kit beta995-probes/s74/damaged/results-995.md and harness.ps1, local scratch). -->

---

## `export` refused for lack of `--overwrite` still writes part of the tree

*DEFERRED until after v1*

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

## `export` needs a full, backslashed project path, and no folder path may use forward slashes

*DEFERRED until after v1*

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

## Export Project stops at a read-only file after deleting everything before it, and the IDE reports nothing

*DEFERRED until after v1*

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

## A step key pressed on the line that raised an error leaves a step pending

*DEFERRED until after v1*

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

## *Import from file...* leaves the imported package unticked

*DEFERRED until after v1*

**Describe the bug**
In Settings → References → Available Packages, **Import from file...** imports a `.twinpack` but leaves the package unticked. The compiler answers the IDE's `importPackage` request with success and the package's symbol, and the package appears in the Available Packages list, but nothing in the project can use it until the user ticks it by hand. The online import beside it ticks the package it imports.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `import-package-unticked.twinproj` (attached as `import-package-unticked.zip`). The zip also holds the package to import, `DocProbePkg.twinpack`, a package of one function, `DocProbeVersion`.
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

*DEFERRED until after v1*

**Describe the bug**
A project embeds a package built locally. In Settings → References, replacing it by another build of the same package (untick the old one, import the new `.twinpack`, tick the new one) and pressing **Apply** once leaves the compiler running the old copy. The console shows only `[COMPILER] Project settings updated`: no compiler restart and no save. Builds and runs keep using the old package.

**To Reproduce**
Use a machine with no copy of the package in `%APPDATA%\twinBASIC\packages`: a linked copy there makes the bug go away (see below).

Steps to reproduce the behavior:
1. Open `replace-embedded-package-one-apply.twinproj` (attached as `replace-embedded-package-one-apply.zip`). The zip also holds the two package builds, `DocProbePkg-v1.twinpack` and `DocProbePkg-v2.twinpack`, whose function `DocProbeVersion` returns 1 and 2.
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

## An error in the body of a generic procedure names neither the type nor the call that caused it

*DEFERRED until after v1*

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

## `End` in an LLVM-compiled procedure restarts the IDE's compiler

*DEFERRED until after v1*

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

---

## An `Interface` declared with the identifier of `IUnknown` compiles, and calling its method ends in an access violation

**Describe the bug**
An `Interface` whose `[InterfaceId]` is the identifier of `IUnknown`, `00000000-0000-0000-C000-000000000046`, compiles without a diagnostic, and a class can implement it. Calling one of its methods through a variable of that type ends the run with `NATIVE EXCEPTION: ACCESS_VIOLATION`. The `Set` to the variable succeeds, but what it stores is the object's ordinary `IUnknown` pointer, whose method table is not the interface's.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `iunknown-iid-interface.twinproj` (attached as `iunknown-iid-interface.zip`). Its one source file, `Startup.twin`, holds the whole bug:
   ```
   [InterfaceId("00000000-0000-0000-C000-000000000046")]
   Private Interface IUnk
       Sub Dummy()
   End Interface
   
   Private Class RC
       Implements IUnk
       Private Sub IUnk_Dummy() Implements IUnk.Dummy
       End Sub
   End Class
   
   Module Startup
       Public Sub Main()
           Dim u As IUnk
           Set u = New RC
           Debug.Print "ok"
           u.Dummy
           Debug.Print "called"
       End Sub
   End Module
   ```
2. Run the project in the IDE (F5).
3. See `ok` in the DEBUG CONSOLE, and then `NATIVE EXCEPTION: ACCESS_VIOLATION /Startup.twin; Startup.Main LINE 000020`. `called` is never printed.

**Expected behavior**
The compiler refuses the declaration, because an interface cannot have the identifier of `IUnknown` and also have its own methods at the slots that follow `IUnknown`'s three. Failing that, the call works. A run that ends in a native access violation, with no diagnostic anywhere, is worse than either.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low; it takes a deliberate copy of `IUnknown`'s identifier, but the compiler accepts it silently and the failure is a crash.

What was tried:
- The same code with any other identifier on the interface runs to the end and prints `called`.
- If the class does not implement the interface at all, `Set u = New RC` still succeeds, and `u.Dummy` returns with no error and no effect: the `Set` asks for `IUnknown`, which every class answers.
- An interface with three `[PreserveSig]` members declared in `IUnknown`'s order, `QueryInterface`, `AddRef` and `Release`, behaves the same way: `Set` succeeds, and the calls go to the wrong slots (one `AddRef` returned 0, and the next call crashed).
- `Interface IUnk Extends stdole.IUnknown` with that identifier compiles, and `u.AddRef` is then reported as `TB5027 Unrecognized member 'AddRef' on type 'IUnk'`, as it is for `stdole.IUnknown` itself, which has no members that twinBASIC code can call.

<!-- Reproducer: bugs/iunknown-iid-interface/ (mode run, expects tbrun exit 5, the output `ok` and the native exception); verified on 995. Stated in docs/Reference/COM-Interfaces/IUnknown.md, section "Implementing it" (the WARNING, which names BETA 995, after the paragraph that begins "A project's own Interface that carries the identifier of IUnknown also compiles"): when fixed, remove it and state what the compiler does (a diagnostic, or a working call). -->

---

## Calling a method of `stdole.IDispatch` is a late-bound call by name and fails with error 438

**Describe the bug**
A variable declared `As stdole.IDispatch` does not call the four `IDispatch` methods through the interface. `d.GetTypeInfoCount count` is compiled as a late-bound call: the compiler accepts any arguments, whatever their number and type, and at run time the call looks `GetTypeInfoCount` up by name in the object, which does not have it, and raises error 438 (*Object doesn't support this property or method*). With no error handler the error ends the run (in the IDE's run, with no message). A call of `GetTypeInfo`, `GetIDsOfNames` or `Invoke` ends the run the same way when unhandled. Members of the object itself can be called through the variable, as through an `Object`.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `stdole-idispatch-late-bound.twinproj` (attached as `stdole-idispatch-late-bound.zip`). Its one source file, `Startup.twin`, holds a class `Widget` with a `Sub Hello()` that counts its runs, and:
   ```
   Dim w As New Widget
   Dim d As stdole.IDispatch = w
   On Error Resume Next
   d.Hello
   d.GetTypeInfoCount count
   d.GetTypeInfoCount "a", "b", "c"
   d.NoSuchMethod
   ```
2. See no compile error, and this output (each line prints `Err.Number` after the statement):
   ```
   d.Hello: error 0, Hello ran 1 time(s)
   d.GetTypeInfoCount: error 438 (1B6) Object doesn't support this property or method
   d.GetTypeInfoCount "a", "b", "c": error 438
   d.NoSuchMethod: error 438
   ```
3. Remove the `On Error Resume Next` line and run again: the output stops at the first `d.GetTypeInfoCount`, and the run ends with no message.

**Expected behavior**
The call goes through the interface: `GetTypeInfoCount` returns the count (1 for a twinBASIC class), and a wrong number or type of argument is a compile error, as for any other interface method. If `stdole.IDispatch` is meant to be an alias of `Object`, `d.GetTypeInfoCount` should still not compile, or the type should not list four methods that cannot be called. A project's own declaration of the interface, with the same `[InterfaceId]`, calls them correctly.

VB6 refuses the declaration itself. The same program in VB6 (attached as `stdole-idispatch-late-bound-vb6.zip`), with a reference to OLE Automation, does not build:
```
Compile Error in File '...\Module1.bas', Line 16 : Function or interface marked as restricted, or the function uses an Automation type not supported in Visual Basic
```
`Dim d As IDispatch` is refused the same way. With `Dim d As Object` in its place, VB6 runs `d.Hello` and raises 438 for the other three statements, so twinBASIC's `stdole.IDispatch` behaves as VB6's `Object` does.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
Severity: low, since a project can declare its own copy of the interface, but the failure is silent without a handler and the compiler gives no sign that the call is not what it appears to be.

On BETA 995 and 997 the error was `&H80020006` (*Unknown name.*), the number every late-bound call to a member an object does not have raised then (#2490); BETA 1005 raises 438 for those calls, as VB6 does, and so for these.

What was tried: `GetIDsOfNames` and `Invoke` with zero arguments, and `GetTypeInfo` with a null pointer, each end the run the same way; calls with arguments of the wrong type compile (`d.GetTypeInfoCount "a"`, `d.GetTypeInfo "a", "b", "c"`, `d.Invoke "a", "b", "c", "d", "e", "f", "g", "h"` all compile). An unhandled `Err.Raise 5` in the same harness ends the run the same way, so the silent end is how an unhandled error shows there, not a separate fault. Running the built exe with `--exe` was not possible on this machine (the harness could not start it).

<!-- Reproducer: bugs/stdole-idispatch-late-bound/ (mode run, expects the Hello and GetTypeInfoCount lines above); verified on 995, and on 1005 with the number 438. VB6 side in bugs/stdole-idispatch-late-bound/vb6/ (VB6 6.0): the build is refused, so `vb6` exits 1 with the compile error above; that refusal is the result. The `As Object` variant was run in a scratch copy, not kept. Stated in docs/Reference/COM-Interfaces/IDispatch.md, "The stdole declaration". That paragraph says calling GetTypeInfoCount "ends the run" and that the arguments are not checked because twinBASIC has no type for them; the cause is that the call is late-bound, and the run ends only for lack of an error handler, so reword it now whether or not this is fixed. When fixed, say that stdole.IDispatch can be called, and drop the advice to declare a copy (the Declaration section's "The declaration in stdole is no use" sentence too). -->

---

## A module-level `Single` array `Const` whose element overflows holds infinity, and a later array `Const` that calls `Sqr`, `Timer` or `Rnd` is refused with TB5001

**Describe the bug**
Follow-up to #2475, which is fixed in BETA 1005 for the element types it reported: an element too large for a `Long`, `Integer`, `Byte` or `LongLong` array `Const` is now TB5001 on its own line, where BETA 997 crashed the compiler. This is the `Single` case, which #2475 gave as a second crash under Additional context: it no longer crashes, but it is still wrong. At module level, an array `Const` of `Single` whose element is too large for a `Single` compiles without a diagnostic, and the element reads as infinity. An array `Const` declared after it, whose element calls `Sqr`, `Timer` or `Rnd`, is then refused with TB5001, *Type mismatch*, although it is correct and compiles on its own. Observed in the IDE's diagnostics and in a run.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `single-array-const-overflow.twinproj` (attached as `single-array-const-overflow.zip`). Its module `Startup` begins:
   ```
   Const Big() As Single = Array(1E+39)
   Const Root() As Double = Array(Sqr(4))
   ```
2. Compile it. See TB5001 *Type mismatch* on the declaration of `Root`, and nothing on the declaration of `Big`.
3. Delete the declaration of `Root` and print `Big(0)` in `Main`: the project compiles, and `Big(0)` prints `1.#INF`.

The module below is the reproducer's, and is meant to be adapted as a regression test. Because what it tests is a diagnostic, each case is a line of source that ends in the comment `' CASE <Name>: <expected>`: the diagnostic code the line must get, `error` for any error, or `none`. On BETA 1005 the nine cases from #2475 and the scalar control pass, and `SingleElementOverflow` and `SqrAfterSingleOverflow` fail.
```vb
' Regression tests for #2475 and its follow-up, as compile cases: each line that
' ends in a  ' CASE <Name>: <expected>  comment must give that diagnostic on that
' line (a code, "error" for any error, or "none"). tbrun --tests checks them.
' Big overflows a Single and is accepted; Root, correct, is then refused with
' TB5001. Declared alone, Root compiles, and Big(0) reads 1.#INF.
Module Startup
    ' Left in BETA 1005: a Single element that overflows is accepted, and the
    ' array constant after it, which calls Sqr, is refused.
    Const Big() As Single = Array(1E+39)  ' CASE SingleElementOverflow: error
    Const Root() As Double = Array(Sqr(4))  ' CASE SqrAfterSingleOverflow: none

    ' Fixed in #2475 (BETA 1005): an element too large for its type is TB5001,
    ' where BETA 997 crashed the compiler.
    Const L1() As Long = Array(2147483648)  ' CASE LongElementOverflow: TB5001
    Const L2() As Long = Array(1, 2147483648)  ' CASE LongSecondElementOverflow: TB5001
    Const L3() As Long = Array(3000000000.5)  ' CASE LongFractionOverflow: TB5001
    Const I1() As Integer = Array(40000.5)  ' CASE IntegerElementOverflow: TB5001
    Const Y1() As Byte = Array(300.5)  ' CASE ByteElementOverflow: TB5001
    Const Y2() As Byte = Array(-1.5)  ' CASE ByteNegativeElement: TB5001
    Const Q1() As LongLong = Array(9223372036854775808#)  ' CASE LongLongElementOverflow: TB5001
    Const D1() As Double = Array(1E+300 * 1E+300)  ' CASE DoubleElementOverflow: TB5001

    ' Control: a scalar Single constant that overflows is refused where it is used.
    Const S As Single = 1E+39

    Public Sub Main()
        Debug.Print S  ' CASE ScalarSingleOverflowUse: TB5002
    End Sub
End Module
```

**Expected behavior**
An error on the declaration of `Big`, TB5001 as for every other element type: the `Long`, `Integer`, `Byte`, `LongLong` and `Double` arrays above are each refused on their own line. The declaration of `Root` compiles, as it does without `Big`, and `Root(0)` is 2. A scalar `Const S As Single = 1E+39` is refused too, with TB5002 where it is used.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
VB6 has no array constants, so there is no VB6 project.

What reproduces it: `Array(3.5E+38)` in place of `Array(1E+39)`; `Timer` or `Rnd` in place of `Sqr(4)`, when that constant is the first array `Const` after `Big` (a second one after it compiles). What does not: `Root` declared before `Big`; an element of `Abs(-4)` or a literal after `Big`; the same `Single` constant declared inside a procedure, which is not accepted silently (the run ends with an error when the procedure is reached). The order and the three functions suggest an overflow flag left set while `Big` is evaluated, which the next constant's call then reads as an error; that is an inference.

Severity: a silent wrong value, an element that holds infinity where a compile error belongs, and a compile error on a correct constant that names neither the cause nor the line that has it.

<!-- Reproducer: bugs/single-array-const-overflow/ (mode test: `tbrun --tests` judges the compile cases, PASS or FAIL each; expect lists the nine PASS and two FAIL lines); verified on BETA 1005 by `bug_repro.mjs verify`; on BETA 997 the first form of the reproducer crashed the compiler 3x. The Timer-after-Big, scalar-at-its-use and scalar-unused (no diagnostic) variants were checked with tbrun on 1005 in scratch trees that are not kept, and so were 3.5E+38, Rnd, the reverse order, Abs, a literal and the local constant. Follow-up to #2475 ("A module-level array Const with an element that does not fit its type crashes the compiler"), closed as fixed in BETA 1005; its own reproducer no longer crashes, and was deleted. Stated in docs/Reference/Core/Const.md, "Array constants", in a WARNING naming BETA 1005: when fixed, the WARNING goes, and the paragraph above it says that an element too large for a Single is TB5001 as well. -->

---

## After Break Into Code stops in DoEvents, evaluating anything ends the program with an access violation

**Describe the bug**
**Break Into Code** (Ctrl+Break), pressed while a program is in `DoEvents`, stops inside the VB package rather than in the program: the IDE opens the package's `IdleMessageLoopBreak.twin` at `IdleMessageLoopBreakpoint`, which **Call Stack** shows above the program's procedure. Evaluating anything at that stop ends the program with a native access violation: a line in the Debug Console, even `? 1`, or any watch, which the IDE evaluates at every stop. The IDE then stays in break mode, with the yellow arrow on the package's line and **Stop** and the step commands enabled, although the program has ended.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `break-in-doevents-evaluate-crash.twinproj` (attached as `break-in-doevents-evaluate-crash.zip`). `Main` loops on `DoEvents`:
   ```
   Public Sub Main()
       Do
           DoEvents
       Loop
   End Sub
   ```
2. Press F5, then Ctrl+Break (**Run > Break**). The IDE opens `IdleMessageLoopBreak.twin` under `Packages/VB/Sources/SUPPORT`, stopped in `IdleMessageLoopBreakpoint`, and **Call Stack** shows `IdleMessageLoopBreakpoint` above `Main`.
3. Type `? 1` in the Debug Console and press Enter. The program ends, and the Debug Console prints:
   ```
   (runtime error -2147467259: NATIVE EXCEPTION: ACCESS_VIOLATION)
   0001 <time> NATIVE EXCEPTION: ACCESS_VIOLATION  {unknown} [$1EBD9288:twinBASIC_win32.dll+001D9288]
   ```
   The yellow arrow stays on the package's line, and **Stop** and the step commands stay enabled. **Restart the compiler** puts the IDE right.
4. Add any watch, such as `1 + 1`, and repeat step 2. The program ends at the stop in the same way, with nothing typed.

**Expected behavior**
**Break Into Code** stops in the program, where F5 at the package's stop goes next: in `Main`, on the line after `DoEvents`. An expression evaluated at a stop is evaluated, or refused with a message, and the program stays stopped where it was.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 987, identically.

What does not reproduce it: evaluating nothing at the first stop, after which F5 stops again at once, in `Main` on the line after `DoEvents` (`Loop`), where `? 1` prints `1`; and a break that lands in the program's own code rather than in `DoEvents`, where the Debug Console and watches work. A name that the package's procedure cannot see, such as a local of `Main`, ends the program as `? 1` does.

Severity: high. Breaking into a loop that calls `DoEvents` is an everyday way to see what a program is doing, and a watch left over from earlier is enough to end the program at the stop.

<!-- Asserted by `ide-test.bat --only break-into` (test/ide/break-into.test.mjs: the stop in the package and F5's second stop, ? 1 there, and a watch); passes on BETA 995 and 987. The lane clears the Debug Console after each crash it asserts, because tb-lane.mjs fails a lane whose console holds a NATIVE EXCEPTION line. The reproducer's Startup.twin is test/ide/probes/break-into/Sources/Startup.twin with a different header comment. When fixed: update that test and this entry. -->

---

## The Debug Console offers no completion for a name typed after `?` and a space

**Describe the bug**
The Debug Console's IntelliSense list offers no names after `?` and a space, the form a line in the console is usually typed in. With the run stopped at a breakpoint and `total`, a local, in scope, typing `? tot` opens no list at any key, and Ctrl+Space at the end of the line opens none either. Typed with no space, `?tot` opens the list at the `t`, and it offers `total`; so does `tot` at the start of the line. `Debug.Print tot` opens no list, as `? tot` does.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `console-completion-after-print.twinproj` (attached as `console-completion-after-print.zip`). In `Startup.twin`, `Main` has two locals and calls a private Sub on the line marked `BREAK`:
   ```
   Public Sub Main()
       Dim total As Long
       Dim items As New Collection
       total = 5
       items.Add total
       Touch total ' BREAK
   End Sub
   
   Private Sub Touch(ByVal n As Long)
       Debug.Print "total " & n
   End Sub
   ```
2. Put a breakpoint on the line marked `BREAK` (F9) and press F5. The run stops there.
3. Click in the Debug Console's input and type `? tot`. No list opens at any key. Press Ctrl+Space: no list opens.
4. Clear the input and type `?tot`, with no space. The list opens at the `t`, and once the line reads `?tot` it offers only `total`. Typing `tot` alone does the same.

**Expected behavior**
`? tot` opens the list with `total` in it, as `?tot` and `tot` do: the space does not change which names can follow the `?`. A `?` and a space is how a line is usually typed in the Debug Console, as in VBA's Immediate window, so that is where the list is wanted most.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 987, identically.

What does not reproduce it: `tot` after leading spaces, which opens the list with `total`; and a dot after `?` and a space, `? items.`, which opens the list with the `Collection`'s members, so only the names are missing there. With Ctrl+Space at the end of the line, `Touch tot`, an argument of a Sub call, opens the list with `total`, and `Call Tou` and `total = to` open none, so names are missing after `Call` and on the right of an assignment as well. Typed key by key, `Call Tou` goes wrong sooner, for a separate reason: the space after `Call` accepts the list's first entry, and the line becomes `CallByDispId()`. With no program running, Ctrl+Space gives the same results: `Mai` offers `Main`, and `? Mai` opens no list.

Severity: low to moderate. Name completion does not work in the form the console is nearly always typed in, and leaving out the space after `?` is the only way round it.

<!-- Asserted by `ide-test.bat --only console-completion` (test/ide/console-completion.test.mjs: ?tot, tot, tot after leading spaces and Touch tot offer total; ? tot, Debug.Print tot, Call Tou and total = to open no list; ? items. offers the Collection's members; with no program running, Mai offers Main and ? Mai opens no list); passes on BETA 995 and 987. The lane puts each line in the console's input and presses Ctrl+Space; typed key by key, ? tot, ?tot, tot, tot after leading spaces, Debug.Print tot and ? items. do the same, which was checked on BETA 995 and is not asserted. The reproducer's Startup.twin is test/ide/probes/console-completion/Sources/Startup.twin with a different header comment. When fixed: update that test and this entry. -->

---

## A space typed in the Debug Console accepts the IntelliSense list's selection, so `Print x` becomes `Printerx`

**Describe the bug**
While the Debug Console's IntelliSense list is open, a space typed in its input accepts the list's first entry: the entry is written over the word before the caret, and the space is lost. The console's list never offers keywords, so a keyword that starts a longer name is replaced by that name. With the run stopped at a breakpoint, typing `Print total` gives `Printertotal`, because at `Print` the list offers `Printer`, `PrinterObjectConstants` and others, but not `Print`. In the same way, `Call Touch(total)` becomes `CallByDispId(Touch(total))`, and `Set obj = items` becomes `SetAttr(obj = items)`. The console refuses all three lines.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `console-space-accepts-completion.twinproj` (attached as `console-space-accepts-completion.zip`). In `Startup.twin`, `Main` has three locals and calls a private Sub on the line marked `BREAK`:
   ```
   Public Sub Main()
       Dim total As Long
       Dim items As New Collection
       Dim obj As Object
       total = 5
       items.Add total
       Touch total ' BREAK
   End Sub
   
   Private Sub Touch(ByVal n As Long)
       Debug.Print "total " & n
   End Sub
   ```
2. Put a breakpoint on the line marked `BREAK` (F9) and press F5. The run stops there.
3. Click in the Debug Console's input and type `Print total` at an ordinary speed. The list opens while `Print` is typed, the space after it turns the line into `Printer`, and the line ends as `Printertotal`. Press Enter: the console prints `(compile error: Unrecognized symbol 'Printertotal')`.
4. Type `Call Touch(total)`: the space after `Call` writes `CallByDispId()`, with the caret between the parentheses, and the line ends as `CallByDispId(Touch(total))`. Type `Set obj = items`: it ends as `SetAttr(obj = items)`. Enter gives a compile error for each.
5. Type `Print`, press Escape, and type ` total`: the line is `Print total`, and Enter prints `5`.

**Expected behavior**
Each line stays as it is typed, as it does in the code editor. The code editor's list offers the keywords, so at `Print` its first entry is `Print` itself, and the space after it is typed: typed the same way in a procedure, `Print total`, `Call Touch(total)` and `Set obj = items` stay as they are. In the console, `Print total` typed with Escape before the space prints `5`.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 987, identically.

What does not reproduce it: a word that is already the list's first entry, and not a procedure, keeps its space, so `total = 6` stays as it is. `? total` and `Debug.Print total` stay as they are. Escape before the space closes the list, and the space is then typed. With the IDE's IntelliSense mode set to LEGACY or MANUAL, the list does not open while the first word of a line is typed, and `Print total` and `Call Touch(total)` stay as they are.

In the default mode, MODERN, the console asks for the list after every key and answers within a few milliseconds, so the list is open at the space whenever a line is typed at an ordinary speed. Every keyword that starts a longer name is replaced in the same way, and the others type as they are: `Do` becomes `DockModeConstants`, `For` becomes `FormArrangeConstants`, `On` becomes `OnErrorCatch`, `Get` becomes `GetAllSettings()` and `RaiseEvent` becomes `RaiseEventByName()`, while `Dim`, `End`, `Exit`, `With`, `Open`, `Close`, `ReDim`, `Stop` and `GoTo` stay. The same happens with no program running: `Print 1 + 1` becomes `Printer1 + 1`.

Severity: moderate. `Print`, `Call` and `Set` begin lines that are often typed in the console, and each becomes a line the console refuses. The only ways round it are Escape before the space and another IntelliSense mode.

<!-- Asserted by `ide-test.bat --only console-space` (test/ide/console-space.test.mjs: with the run stopped at BREAK and each line typed key by key, Print total becomes Printertotal, Call Touch(total) becomes CallByDispId(Touch(total)) and Set obj = items becomes SetAttr(obj = items), and the console refuses each; Print, Escape and then the rest give Print total, which prints 5; total = 6, ? total and Debug.Print total type as they are; with no program running, Print 1 + 1 becomes Printer1 + 1); passes on BETA 995 and 987. The lane waits after each key for the console's answer to it, as a person typing at an ordinary speed sees the list. Checked on BETA 995 and 987 and not asserted: the other keywords named above. Checked on BETA 995 and not asserted: the LEGACY and MANUAL modes, and the code editor. The reproducer's Startup.twin is test/ide/probes/console-space/Sources/Startup.twin with a different header comment. Related: "The Debug Console offers no completion for a name typed after `?` and a space", whose Additional context mentions this one. When fixed: update that test and this entry. -->

---

## A build writes addresses from the compiler's own memory into the exe

**Describe the bug**
Two builds of one unchanged project are never byte for byte equal, and the difference is more than the PE time stamp and checksum. At the start of its `.data` section each exe holds a block of deflate-compressed data: a u32 compressed size, a u32 inflated size of 4,096, then a raw deflate stream. Decompressed, the blocks of two builds differ in two values that are addresses in the compiler process's memory: 4 bytes each in a win32 exe, and the low 5 or 6 bytes of a 64-bit value in a win64 exe. So the compiler writes values from its own memory into the exe, and every build gives a different file.

Compression turns those 8 or 12 bytes into about 1,700 changed bytes of the stream, and changes its length by a few bytes. When the two lengths fall in different steps of the padding after the block (4 bytes in win32, 8 in win64), everything after the block moves by one step, and the exe differs in about 50 more bytes, 44 of them in `.text`, which holds addresses of that data. The padding is not cleared either: in win64 it holds leftover bytes, the top bytes of the two values.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `build-writes-compiler-addresses.twinproj` (attached as `build-writes-compiler-addresses.zip`), a console project with an empty `Sub Main`, with the build target win32.
2. Press Build and copy the exe to another folder.
3. Close the IDE, open the project again, press Build without changing anything, and copy that exe too.
4. Compare the two files. Besides the PE time stamp and checksum, they differ in the block at the start of `.data`. Inflate both streams and compare the two 4,096-byte results: two values differ, at offsets `0x4` and `0xbb8` in win32, and `0xc` and `0xbb8` in win64. The values of one win64 pair:
   ```
   +0x00c  0x000001a5ea830968 / 0x0000024c70e7c6a8
   +0xbb8  0x000001a5e13684f0 / 0x0000024c6774d070
   ```
5. Repeat with the build target win64.

The documentation's build harness does steps 1 to 4 and prints each differing value: `node scripts/probe_build_twice.mjs`, with `--arch win64` for the win64 target. On BETA 997 the decompressed blocks differed in every pair: in 7 of 7 win32 pairs, in 6 or 7 bytes in two ranges, and in 2 of 2 win64 pairs, in 10 or 12 bytes in two ranges. Outside the time stamp, the checksum and the block, 5 of the 7 win32 pairs differed in nothing, 1 in a single byte after the block, and 1 in 54 bytes in 46 ranges, where the two streams fell in different steps of the padding.

**Expected behavior**
Nothing from the compiler's own memory ends up in the exe, and the padding after the block is zero, so two builds of this project differ only in the PE time stamp and the checksum that follows from it.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 997

**Additional context**
The values are addresses in the compiler process. After a build with the IDE left open, a read-only query of the memory map of the IDE's child processes (`VirtualQueryEx`; nothing was read from their memory) found both values of that build's exe in committed, private, read-write memory of the compiler process: `twinBASIC_win64_noDEP.exe` for a win64 build, and `twinBASIC_win32_noDEP.exe` for a win32 build. In the IDE's other child processes, both values fell in free address space. For win64 this is conclusive: only 3 of 200,000 random values below 2^47 fell in that process's committed memory. For win32 it is weaker, since 20,497 of 200,000 random 32-bit values did too.

A single byte after the block also differs now and then: `1c` against `18` in win32, and `38` against `30` in win64. It reads as a count of 7 or 6 pointer-sized items; what it counts is not known.

What VB6 does (the project attached as `build-writes-compiler-addresses-vb6.zip`, a Standard EXE whose `Sub Main` is empty, built twice in one folder): its exes are not identical either. Outside the time stamp and the checksum, they differ in the time stamps of the nine resource directories when the two builds fall in different seconds, in two random 16-byte identifiers, and in one 4-byte value that has the form of a heap address (from 0x00673ed8 to 0x009841a8 over eight builds; not confirmed against VB6's memory). But VB6 compresses nothing, so its one value changes 3 bytes, and in eight builds its exes never changed size or layout.

BETA 995 gives the same kinds of difference, on win32 and on win64.

What did not reproduce it: nothing in the project is needed. The console project with an empty `Sub Main` shows it, so no class, form or setting is involved. The harness stages the project into the same folders, with the same build path, before each build, so no path is what differs.

Severity: low. No difference in a running program was looked for. Builds are not reproducible: two builds of one project cannot be compared, cached or signed by hash, and now and then the code itself differs.

<!-- Reproducer: bugs/build-writes-compiler-addresses/ (mode probe: scripts/probe_build_twice.mjs builds it twice, each build in an IDE of its own, and prints what differs; --arch win64 for the win64 target, and --vb6 builds its vb6/ project twice with VB6). On BETA 997 the decompressed blocks differed in 7 of 7 win32 pairs and 2 of 2 win64 pairs; on BETA 995, in 2 of 2 and 2 of 2. The memory-map query is not scripted: a read-only VirtualQueryEx walk of the IDE's child processes after a tbbuild --keep build, 2026-10-06, with the IDE then ended by its pid. Not part of this entry: the random 16-byte identifiers that a form or a used class adds to the exe, since VB6 writes such identifiers too; and the type library's id, which the build generates anew unless Use Project ID for type library ID is on (docs/IDE/Project Settings.md). No page of the documentation mentions the defect, so when it is fixed there is nothing to update besides this entry and its reproducer. -->

---

## Reading `Parent` of the file system's root folder crashes the compiler

**Describe the bug**
In an IDE add-in, reading `Parent` of the virtual file system's root folder, `Host.FileSystem.RootFolder.Parent`, crashes the compiler, and the add-in with it. The read itself crashes, before the value is used: `Dim o As Object = Host.FileSystem.RootFolder.Parent`, `Dim f As Folder = Host.FileSystem.RootFolder.Parent`, `Host.FileSystem.RootFolder.Parent Is Nothing` and `TypeName(Host.FileSystem.RootFolder.Parent)` all crash, and the line the add-in printed just before the read is the last one printed. The IDE restarts the compiler, which loads the add-in and crashes again, 3 or 4 times in a run.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `rootfolder-parent-crash.twinproj` (attached as `rootfolder-parent-crash.zip`). It is an add-in whose `Host_OnProjectLoaded` is:
   ```
   Private Sub Host_OnProjectLoaded()
       Host.DebugConsole.PrintText "before Parent"
       Dim o As Object = Host.FileSystem.RootFolder.Parent
       Host.DebugConsole.PrintText "after Parent"
   End Sub
   ```
2. Build it (win32). The add-in crashes the compiler every time it loads, so use an IDE whose add-ins you can restore. Copy `Build\RootfolderParentCrash_win32.dll` into `%APPDATA%\twinBASIC\addins\win32\` and restart the IDE.
3. Open any project. The DEBUG CONSOLE prints `before Parent`, and the compiler crashes. `after Parent` is never printed.
4. To get the IDE working again, close it and delete `RootfolderParentCrash_win32.dll` from `%APPDATA%\twinBASIC\addins\win32\`.

**Expected behavior**
`Parent` of the root is `Nothing`, as for the root of any object model, so step 3 prints `before Parent` and `after Parent`. At worst the read raises an error that the add-in can handle, and does not take the compiler down.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 997

**Additional context**
Also on BETA 983 and 995, identically.

What did not reproduce it: `Host.CurrentProject.RootFolder.Parent`, the parent of the project's folder, reads fine, and its `Path` is `twinbasic:/`, the file system's root. An add-in that reads neither does not crash.

Severity: crash. The crash is in the read, so no `On Error` handler helps, and an add-in that walks up the tree with `Parent` until `Is Nothing` crashes the compiler on every start, until its DLL is removed. The workaround is to stop at the folder whose `Path` is `twinbasic:/` without reading its `Parent`.

<!-- Reproducer: bugs/rootfolder-parent-crash/ (mode lane: an add-in has to be built into an IDE's add-in folder, which nothing here may do outside a lane, so `verify` runs the lane). Asserted by `addin-test.bat --only parent` (test/addin/parent.test.mjs, cases a to e; case f is the control that does not crash; the ParentProbe add-in is test/addin/probes/parent), which passes on BETA 983, 995 and 997 while the bug is there. The reproducer is a cut-down copy of that add-in, compiled clean on 997 by `bug_repro.mjs compile`, and not itself run in a lane. Stated in docs/Reference/Built-In/tbIDE/FileSystemItem.md, the WARNING under "Parent" (names BETA 997), and in WIP.HelpAddin.md (P21): when fixed, the WARNING goes and the page states what Parent of the root is, with no mention of the defect; update the lane's tests (parent.test.mjs, which then assert the fixed behaviour) and P21. -->

---

## File statements and functions raise *Unspecified error* (-2147467259) in place of VB6's error numbers

**Describe the bug**
When a file statement or function fails, twinBASIC raises run-time error -2147467259 (`&H80004005`, *Unspecified error*) where VB6 raises a numbered error: 52 *Bad file name or number*, 53 *File not found*, 55 *File already open*, 58 *File already exists*, 59 *Bad record length*, 63 *Bad record number*, 75 *Path/File access error* or 76 *Path not found*. Of 42 failing file operations, 37 raise -2147467259, and the other 5 match VB6. An `On Error` handler written for VB6, which tests `Err.Number` for one of those numbers, does not recognise the error. Observed in a run of the reproducer project, in the IDE and in a built exe alike.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `file-errors-unspecified.twinproj` (attached as `file-errors-unspecified.zip`) and run it (F5). Its `Sub Main` makes a folder in `%TEMP%`, makes 42 file operations fail one at a time under `On Error Resume Next`, and prints `<case>: <Err.Number> <Err.Description>` after each. The smallest of them:
   ```
   On Error Resume Next
   Kill Environ$("TEMP") & "\no-such-file.txt"
   Debug.Print Err.Number, Err.Description
   ```
2. See `-2147467259 Unspecified error` in each of these 37 cases, where the same program built in VB6 (attached as `file-errors-unspecified-vb6.zip`) prints the number shown:

   | operation that fails | VB6 |
   |---|---|
   | `Open` a file that does not exist, `For Input` | 53 |
   | `Open` a file in a folder that does not exist, `For Output`, `Append`, `Binary` and `Random` (4 cases) | 76 |
   | `Open` a folder `For Input` | 75 |
   | `Open` a read-only file `For Output` | 75 |
   | `Open` a file name that is not valid | 52 |
   | `Open` with a file number that is in use | 55 |
   | `GetAttr`, `FileLen`, `FileDateTime` and `SetAttr` of a file that does not exist (4 cases) | 53 |
   | `GetAttr` of a file in a folder that does not exist | 76 |
   | `Kill` of a file that does not exist, and of a pattern that matches no file (2 cases) | 53 |
   | `Kill` of a read-only file | 75 |
   | `Kill` of a file that is open | 55 |
   | `Name` of a file that does not exist | 53 |
   | `Name` onto a file that exists | 58 |
   | `Name` of a file that is open | 55 |
   | `MkDir` of a folder that exists | 75 |
   | `MkDir` in a folder that does not exist | 76 |
   | `RmDir` of a folder that does not exist | 76 |
   | `RmDir` of a folder that holds a file | 75 |
   | `ChDir` to a folder that does not exist | 76 |
   | `EOF`, `LOF`, `Loc`, `Seek`, `FileAttr`, `Get #`, `Put #`, `Print #` and `Line Input #` with file number 99, which is not open (9 cases) | 52 |
   | `Seek #f, 0` | 63 |
   | `Put` of a 22-character string to a `Random` file opened with `Len = 4` | 59 |

3. See the 5 cases that match VB6: `FileCopy` of a file that does not exist (53) and into a folder that does not exist (76), `Line Input #` past the end of the file (62), and `Close` of a file number that is not open and `SetAttr` of a file open `For Input`, which raise no error in either.

**Expected behavior**
The numbers in the table, with VB6's descriptions, as for the 5 cases that already match. A VB6 program that handles a missing file by testing `Err.Number = 53` takes its other branch in twinBASIC.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
This extends #2345, which reports the first row of the table on BETA 979, and is part of #56. `FileCopy` raised -2147467259 as well up to BETA 995, and raises VB6's numbers from BETA 997, the build that fixed #2451.

The same on BETA 997 and 957, apart from `FileCopy`. The same in a built exe as in the IDE, and the same with the project setting *Use Unicode Standard Library* set to No. In code compiled with LLVM the number is the same, and the description is *Application-defined or object-defined error*.

What does not reproduce it: the `DirListBox` and `FileListBox` controls trap the error themselves, and raise 76 for a `Path` that does not exist, as VB6 does.

Severity: moderate. An error is raised wherever VB6 raises one, so no failure goes unreported. But a handler that tests for the number does not recognise the error, a handler that shows `Err.Description` shows *Unspecified error*, and code that decides a file exists from `Err.Number <> 53` decides wrongly.

<!-- Reproducer: bugs/file-errors-unspecified/ (mode run; expect lists the 37 lines that print -2147467259, so a fix of some statements and not others shows as NO LONGER REPRODUCES). verify reproduces on BETA 957, 997 and 1005; VB6 side in vb6/, built and run by bug_repro.mjs vb6; the built-exe and LLVM results and the Use Unicode Standard Library check are from probes in a local scratch folder, not in the repository. Found while testing scripts/imagestrip/, a twinBASIC console program that strips the metadata from the images in the IDE's CSS files. Stated in a NOTE naming BETA 1005 on each of these pages: docs/Reference/Core/Open.md, Name.md, Get.md, Put.md, Print.md (under "Writing to a file") and Line-Input.md; docs/Reference/Default/VBA/FileSystem/Kill.md, GetAttr.md, SetAttr.md (the NOTE, not the WARNING, which belongs to the SetAttr entry), FileLen.md, FileDateTime.md, MkDir.md, RmDir.md, ChDir.md, EOF.md, LOF.md, Loc.md, Seek.md and FileAttr.md. When a statement is fixed, its NOTE goes, and its page states the error number it raises with no mention of the defect. -->

---

## `SetAttr` changes the attributes of a file open for writing, where VB6 raises error 55

**Describe the bug**
`SetAttr` on a file that the program has open `For Output`, `Append`, `Binary` or `Random` sets the attributes without an error. VB6 raises run-time error 55, *File already open*, and leaves the attributes as they were. So a twinBASIC program can make a file read-only while it still has it open for writing, and a VB6 program's handler for error 55 never runs. Observed in a run of the reproducer project.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `setattr-open-file-no-error.twinproj` (attached as `setattr-open-file-no-error.zip`) and run it (F5). Its `Sub Main` opens one file in each mode in turn and, while the file is open, runs `SetAttr` on it with `vbReadOnly` under `On Error Resume Next`, then prints `Err.Number` and `GetAttr` of the file.
2. See, beside what the same program prints when built in VB6 (attached as `setattr-open-file-no-error-vb6.zip`):

   | file open `For` | twinBASIC | VB6 |
   |---|---|---|
   | `Input` | no error; attributes 1 (read-only) | no error; attributes 1 |
   | `Output` | no error; attributes 1 | 55 *File already open*; attributes 32 |
   | `Append` | no error; attributes 1 | 55 *File already open*; attributes 0 |
   | `Binary` | no error; attributes 1 | 55 *File already open*; attributes 0 |
   | `Random` | no error; attributes 1 | 55 *File already open*; attributes 0 |

**Expected behavior**
Error 55 for a file open `For Output`, `Append`, `Binary` or `Random`, with its attributes unchanged, as in VB6. VBA-Docs states that a run-time error occurs when setting the attributes of an open file; VB6 raises none for a file open `For Input`, and twinBASIC agrees with it there.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
The same on BETA 997 and 957.

Severity: low, but silent. No error is raised, and the file's attributes change where VB6 leaves them alone: the file stays read-only until its attributes are set back.

<!-- Reproducer: bugs/setattr-open-file-no-error/ (mode run; expect lists the four lines for the write modes). verify reproduces on BETA 957, 997 and 1005; VB6 side in vb6/. Found while checking the error numbers of the file statements (the entry above). Stated in docs/Reference/Default/VBA/FileSystem/SetAttr.md: the sentence that SetAttr sets the attributes of an open file without an error, and the WARNING after it, naming BETA 1005. The VBA-Docs sentence it replaced ("A run-time error occurs when setting the attributes of an open file") was true of neither product as written. When fixed, the WARNING goes and the sentence says that SetAttr raises error 55 for a file open for Output, Append, Binary or Random, and sets the attributes of a file open for Input. -->

---

## `Dim ... As New` on an `Interface` compiles, where `New` on one is refused with TB5074

**Describe the bug**
Follow-up to #2486, which is fixed in BETA 1005 for the `New` expression: `New IParent`, on an `Interface` declared in a project or a package, is now refused with TB5074, *Cannot construct 'IParent': expected a class type.*, as `New stdole.IUnknown` is. This is the declaration form, which is still accepted: `Dim p As New IParent` compiles without a diagnostic, in a procedure, at module level and as a field of a class. At run time it builds the object #2486 described, with nothing behind its members: a call on a member the interface declares returns 0, and a call on a member it inherits from another `Interface` ends the run with an access violation. Observed in the IDE's diagnostics, and in a run.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `dim-as-new-interface.twinproj` (attached as `dim-as-new-interface.zip`). Its module `NewOnInterfaceTests`, below, declares `Interface IParent`, `Interface IChild Extends IParent`, a class that implements `IParent`, and each way of constructing one of them.
2. Compile it. Each of the four `New` lines on an interface gets TB5074. The five lines below get no diagnostic:
   ```
   Public Item As New IParent              ' a field of a class
   Private ModuleLevel As New IParent      ' at module level
   Dim p As New IParent                    ' in a procedure
   Dim q As New IChild
   Dim r As New ErrorContext               ' an interface of the VBRUN package
   ```
3. To see what such an object does, run this in a project of its own, with the two interfaces above:
   ```
   Dim p As New IParent
   Debug.Print (p Is Nothing), p.F()     ' False 0
   Dim c As New IChild
   Debug.Print c.G()                     ' 0
   Debug.Print c.F()                     ' NATIVE EXCEPTION: ACCESS_VIOLATION, and the run ends
   ```

The module below is the reproducer's, and is meant to be adapted as a regression test. Because what it tests is a diagnostic, each case is a line of source that ends in the comment `' CASE <Name>: <expected>`: the diagnostic code the line must get, `error` for any error, or `none`. On BETA 1005 the four `New_` cases from #2486 and the two controls that construct a class pass, and the five `AsNew_` cases on an interface fail.
```vb
' Regression tests for #2486 and its follow-up, as compile cases: each line that
' ends in a  ' CASE <Name>: <expected>  comment must give that diagnostic on that
' line (a code, "error" for any error, or "none"). tbrun --tests checks them.
' New needs a class; an Interface has none, so every way of constructing one is
' a compile error, as New stdole.IUnknown is.

[InterfaceId("E5B8C0A1-0000-4000-8000-0000000000D1")]
Interface IParent
    Function F() As Long
End Interface

[InterfaceId("E5B8C0A1-0000-4000-8000-0000000000D2")]
Interface IChild Extends IParent
    Function G() As Long
End Interface

Class Implementer
    Implements IParent
    Private Function IParent_F() As Long Implements IParent.F
        Return 1
    End Function
End Class

Class Holder
    Public Item As New IParent  ' CASE AsNew_ClassField: error
End Class

Module NewOnInterfaceTests

    Private ModuleLevel As New IParent  ' CASE AsNew_ModuleVariable: error

    ' Fixed in #2486 (BETA 1005): New on an Interface is refused with TB5074.
    Private Sub NewExpressions()
        Dim a As IParent = New IParent  ' CASE New_ProjectInterface: TB5074
        Dim b As IChild = New IChild  ' CASE New_DerivedInterface: TB5074
        Dim c As ErrorContext = New ErrorContext  ' CASE New_PackageInterface: TB5074
        Dim d As stdole.IUnknown = New stdole.IUnknown  ' CASE New_TypeLibraryInterface: TB5074
        Dim e As IParent = New Implementer  ' CASE New_ClassThatImplements: none
    End Sub

    ' Left in BETA 1005: Dim ... As New on an Interface compiles.
    Private Sub AsNewDeclarations()
        Dim p As New IParent  ' CASE AsNew_ProjectInterface: error
        Dim q As New IChild  ' CASE AsNew_DerivedInterface: error
        Dim r As New ErrorContext  ' CASE AsNew_PackageInterface: error
        Dim s As New Implementer  ' CASE AsNew_Class: none
    End Sub

End Module
```

**Expected behavior**
A compile error on each `As New` of an `Interface`, TB5074 as for `New` on one: `As New` constructs the object when it is first used, and an interface has no class to construct. `As New` on a class that implements the interface compiles, as it does now.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
VB6 has no comparison: a VB6 project cannot declare an `Interface`, and the interfaces of the type libraries it references are hidden from it, as #2486 said.

The object `As New` builds is the one #2486 described: `TypeName` gives the interface's name, `ObjPtr` is not 0, `ErrorContext.Number` reads 0, and an inherited member ends the run with `NATIVE EXCEPTION: ACCESS_VIOLATION` (step 3, checked in a run on BETA 1005).

Severity: low in practice, since few programs write `As New` on an interface, but the compile-time check #2486 added does not cover it, and the result is a silent wrong value or a crash.

<!-- Reproducer: bugs/dim-as-new-interface/ (mode test: `tbrun --tests` judges the compile cases; expect lists the six PASS and five FAIL lines); verified on BETA 1005 by `bug_repro.mjs verify`. Step 3 was run with tbrun on 1005 in a scratch tree that is not kept (local, module-level and class-field As New, and the access violation on the inherited member). Follow-up to #2486 ("New on an Interface compiles, and a call on the object returns a default value, or ends in an access violation for an inherited member"), closed as fixed in BETA 1003. No documentation page states it: docs/Reference/Core/New.md describes As New on classes only. -->

---

## A twinBASIC class's connection point and its container end in an access violation when given a null pointer

**Describe the bug**
Follow-up to #2488, which is fixed in BETA 1005 for `Advise`: given `Nothing` as the sink, or an unassigned `IUnknown` variable, it now fails with `E_POINTER`. This is the other methods of the same two objects that take a pointer: given a null one, each still ends the run with an access violation, which the DEBUG CONSOLE reports as `NATIVE EXCEPTION: ACCESS_VIOLATION`. They are `IConnectionPoint::GetConnectionInterface` (a null *pIID*), `IConnectionPoint::GetConnectionPointContainer` (a null *ppCPC*), `IConnectionPointContainer::FindConnectionPoint` (a null *riid*, or a null *ppCP*) and `IConnectionPointContainer::EnumConnectionPoints` (a null *ppEnum*), on the connectable object of a class that declares an `Event`. Observed by running the reproducer's test cases.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `connection-point-null-pointer-crash.twinproj` (attached as `connection-point-null-pointer-crash.zip`). Its module `ConnectionPointTests`, below, declares the project's own copies of `IConnectionPointContainer`, `IEnumConnectionPoints` and `IConnectionPoint`, with every out parameter `ByVal LongPtr` so that a null one can be passed, a class `EventSource` with one `Event`, and one `[TestCase]` Sub for each call.
2. Call one of the null-pointer cases from `Sub Main`, such as `ConnectionPointTests.GetConnectionInterface_NullIid_ReturnsEPointer`, and press F5.
3. See a line beginning `NATIVE EXCEPTION: ACCESS_VIOLATION` in the DEBUG CONSOLE: the run ends at the call, although it is made under `On Error Resume Next`.

The module below is the reproducer's, and is meant to be adapted as a regression test. On BETA 1005 the three `Advise_` cases from #2488 pass, and the five null-pointer cases fail with the access violation.
```vb
' Regression tests for #2488 and its follow-up. A class with an Event is a
' connectable object; these call its IConnectionPointContainer and its
' IConnectionPoint with a null pointer, where the COM contract (the Windows SDK
' pages for each method) says the method returns E_POINTER. Every out parameter
' is declared ByVal LongPtr, so that a null one can be passed.

[InterfaceId("B196B284-BAB4-101A-B69C-00AA00341D07")]
Interface IConnectionPointContainerRaw Extends stdole.IUnknown
    Sub EnumConnectionPoints(ByVal ppEnum As LongPtr)
    Sub FindConnectionPoint(ByVal riid As LongPtr, ByVal ppCP As LongPtr)
End Interface

[InterfaceId("B196B285-BAB4-101A-B69C-00AA00341D07")]
Interface IEnumConnectionPointsRaw Extends stdole.IUnknown
    Sub Next(ByVal cConnections As Long, ByRef ppCP As IConnectionPointRaw, ByRef pcFetched As Long)
End Interface

[InterfaceId("B196B286-BAB4-101A-B69C-00AA00341D07")]
Interface IConnectionPointRaw Extends stdole.IUnknown
    Sub GetConnectionInterface(ByVal piid As LongPtr)
    Sub GetConnectionPointContainer(ByVal ppCPC As LongPtr)
    Function Advise(ByVal pUnkSink As stdole.IUnknown) As Long
    Sub Unadvise(ByVal dwCookie As Long)
End Interface

Class EventSource
    Public Event Ping()
End Class

Class NotASink
    Public Value As Long
End Class

[TestFixture]
Module ConnectionPointTests

    Private Const E_POINTER As Long = &H80004003      ' the Windows SDK, for a null pointer argument
    Private Const E_NOINTERFACE As Long = &H80004002

    Private Declare PtrSafe Sub CopyMemory Lib "kernel32" Alias "RtlMoveMemory" ( _
        ByVal Destination As LongPtr, ByVal Source As LongPtr, ByVal Length As LongPtr)

    ' The connection point of a new EventSource, through EnumConnectionPoints and Next.
    Private Function PointOf(ByVal container As IConnectionPointContainerRaw) As IConnectionPointRaw
        Dim pEnum As LongPtr
        container.EnumConnectionPoints VarPtr(pEnum)
        Dim points As IEnumConnectionPointsRaw
        CopyMemory VarPtr(points), VarPtr(pEnum), LenB(pEnum)   ' takes over the reference
        Dim fetched As Long
        points.Next 1, PointOf, fetched
    End Function

    ' Fixed in #2488 (BETA 1005): Advise with a null sink returns E_POINTER.

    [TestCase]
    Public Sub Advise_Nothing_ReturnsEPointer()
        Dim point As IConnectionPointRaw = PointOf(New EventSource)
        On Error Resume Next
        point.Advise Nothing
        Assert.Strict.AreEqual E_POINTER, Err.Number
    End Sub

    [TestCase]
    Public Sub Advise_UnassignedIUnknown_ReturnsEPointer()
        Dim point As IConnectionPointRaw = PointOf(New EventSource)
        Dim sink As stdole.IUnknown
        On Error Resume Next
        point.Advise sink
        Assert.Strict.AreEqual E_POINTER, Err.Number
    End Sub

    [TestCase]
    Public Sub Advise_NotASink_ReturnsENoInterface()
        Dim point As IConnectionPointRaw = PointOf(New EventSource)
        On Error Resume Next
        point.Advise New NotASink
        Assert.Strict.AreEqual E_NOINTERFACE, Err.Number   ' as VB6 returns, too
    End Sub

    ' Left in BETA 1005: every other null pointer ends in an access violation.

    [TestCase]
    Public Sub GetConnectionInterface_NullIid_ReturnsEPointer()
        Dim point As IConnectionPointRaw = PointOf(New EventSource)
        On Error Resume Next
        point.GetConnectionInterface 0
        Assert.Strict.AreEqual E_POINTER, Err.Number
    End Sub

    [TestCase]
    Public Sub GetConnectionPointContainer_NullOut_ReturnsEPointer()
        Dim point As IConnectionPointRaw = PointOf(New EventSource)
        On Error Resume Next
        point.GetConnectionPointContainer 0
        Assert.Strict.AreEqual E_POINTER, Err.Number
    End Sub

    [TestCase]
    Public Sub FindConnectionPoint_NullIid_ReturnsEPointer()
        Dim container As IConnectionPointContainerRaw = New EventSource
        Dim p As LongPtr
        On Error Resume Next
        container.FindConnectionPoint 0, VarPtr(p)
        Assert.Strict.AreEqual E_POINTER, Err.Number
    End Sub

    [TestCase]
    Public Sub FindConnectionPoint_NullOut_ReturnsEPointer()
        Dim container As IConnectionPointContainerRaw = New EventSource
        Dim point As IConnectionPointRaw = PointOf(container)
        Dim iid(15) As Byte
        point.GetConnectionInterface VarPtr(iid(0))
        On Error Resume Next
        container.FindConnectionPoint VarPtr(iid(0)), 0
        Assert.Strict.AreEqual E_POINTER, Err.Number
    End Sub

    [TestCase]
    Public Sub EnumConnectionPoints_NullOut_ReturnsEPointer()
        Dim container As IConnectionPointContainerRaw = New EventSource
        On Error Resume Next
        container.EnumConnectionPoints 0
        Assert.Strict.AreEqual E_POINTER, Err.Number
    End Sub

End Module
```

**Expected behavior**
Each call fails with `E_POINTER` (`&H80004003`), which twinBASIC raises as a run-time error that `On Error` can handle, as `Advise` now does for a null sink. The Windows SDK documentation of each of these methods lists `E_POINTER` for a pointer argument that is not valid.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
VB6 crashes too. The same calls on the connection point of a VB6 class with an event, made through `DispCallFunc` (the VB6 project is attached as `connection-point-null-pointer-crash-vb6.zip`; the environment variable `CASE`, 1 to 8, picks the call, and 2 is `GetConnectionInterface` with a null pointer), each end the exe with an access violation, `0xC0000005` in `MSVBVM60.DLL`. As for #2488, a fix costs no compatibility: no program depends on the crash.

What does not crash: each call given a valid pointer. `FindConnectionPoint` with the point's own interface identifier returns it, and with `GUID_NULL` it fails with `CONNECT_E_NOCONNECTION` (`&H80040200`), as the contract says (VB6 returns `E_NOINTERFACE` there).

Severity: low in practice, since a program rarely passes a null pointer, but a COM client written in any language can, and the object crashes the process that hosts the class instead of refusing the call.

<!-- Reproducer: bugs/connection-point-null-pointer-crash/ (mode test: `tbrun --tests` runs each [TestCase] in the compiler's test mode, where the access violation ends the case and not the run; expect lists the three PASS and five FAIL lines); verified on BETA 1005 by `bug_repro.mjs verify`. The same five calls end a run with the access violation in an IDE run as well (tbrun probes on 1005, scratch, not kept). VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` runs case 2, and each of cases 2 and 5 to 8 was run with CASE set, all crashing in MSVBVM60.DLL; cases 1, 3 and 4 are the controls. Follow-up to #2488 ("IConnectionPoint.Advise(Nothing) on a twinBASIC class's connection point ends in an access violation"), closed as fixed. No documentation page states it; docs/Reference/COM-Interfaces/IConnectionPoint.md describes Advise with Nothing only. -->

---

## A failure code from a late-bound call is raised as the HRESULT, where VB6 raises its own error number, such as 450 for DISP_E_BADPARAMCOUNT

**Describe the bug**
Follow-up to #2490, which is fixed in BETA 1005 for a name the object does not have: a late-bound statement and `CallByName` now raise error 438, as VB6 does. This is the rest of the conversion VB6 makes when `IDispatch::Invoke` fails. For ten failure codes VB6 raises one of its own error numbers, and twinBASIC raises the `HRESULT` itself, so a handler written for VB6 or VBA does not recognise the error. The common one is a call with the wrong number of arguments to an object such as a `Collection`, a `Scripting.Dictionary` or a `Scripting.FileSystemObject`: VB6 raises 450, *Wrong number of arguments or invalid property assignment*, and twinBASIC raises `&H8002000E` (`DISP_E_BADPARAMCOUNT`), *Invalid number of parameters.* Observed by running the reproducer's test cases.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `latebound-hresult-mapping.twinproj` (attached as `latebound-hresult-mapping.zip`). Its module, below, holds `HResultObject`, a `NotDispatchable` class that implements the project's own copy of `IDispatch`: a member name of the form `Hr<hex>` fails with that `HRESULT`, so `o.Hr8002000E` is a late-bound call whose `Invoke` returns `DISP_E_BADPARAMCOUNT`.
2. Run, with `On Error Resume Next`, `x = c.Item(1, 2)` where `c` is an `Object` holding a `Collection`. See `Err.Number` -2147352562 (`&H8002000E`); VB6 gives 450.
3. Run each case of the module below. Each prints the number twinBASIC raises; the VB6 project (attached as `latebound-hresult-mapping-vb6.zip`) prints VB6's:

   | `Invoke` returns | VB6 | twinBASIC |
   |---|---|---|
   | `DISP_E_BADPARAMCOUNT` `&H8002000E` | 450 | -2147352562 |
   | `DISP_E_PARAMNOTOPTIONAL` `&H8002000F` | 449 | -2147352561 |
   | `E_NOTIMPL` `&H80004001` | 445 | -2147467263 |
   | `E_OUTOFMEMORY` `&H8007000E` | 7 | -2147024882 |
   | `DISP_E_BADINDEX` `&H8002000B` | 9 | -2147352565 |
   | `DISP_E_NONAMEDARGS` `&H80020007` | 446 | -2147352569 |
   | `DISP_E_ARRAYISLOCKED` `&H8002000D` | 10 | -2147352563 |
   | `E_NOINTERFACE` `&H80004002` | 430 | -2147467262 |
   | `E_ACCESSDENIED` `&H80070005` | 70 | -2147024891 |
   | `E_ABORT` `&H80004004` | 287 | -2147467260 |

The module below is the reproducer's, and is meant to be adapted as a regression test. Each expected number is VB6's, from the VB6 project. On BETA 1005 the three cases from #2490 and the three codes twinBASIC already converts pass, and the ten codes of the table and the `Collection` call of step 2 fail.
```vb
' Regression tests for #2490 and its follow-up: the error number a late-bound
' call raises when the object fails it. The expected numbers are what VB6 6.0
' raises for the same failure (the VB6 project beside this one prints them).
'
' HResultObject answers any name of the form Hr<hex> and fails the call with that
' HRESULT, so o.Hr8002000E is a late-bound call whose Invoke returns
' DISP_E_BADPARAMCOUNT.

Module DispatchTypes
    Public Type GUID
        Data1 As Long
        Data2 As Integer
        Data3 As Integer
        Data4(0 To 7) As Byte
    End Type

    Public Type DISPPARAMS
        rgvarg As LongPtr
        rgdispidNamedArgs As LongPtr
        cArgs As Long
        cNamedArgs As Long
    End Type

    Public Type EXCEPINFO
        wCode As Integer
        wReserved As Integer
        bstrSource As LongPtr
        bstrDescription As LongPtr
        bstrHelpFile As LongPtr
        dwHelpContext As Long
        pvReserved As LongPtr
        pfnDeferredFillIn As LongPtr
        scode As Long
    End Type

    Private Declare PtrSafe Sub CopyMemory Lib "kernel32" Alias "RtlMoveMemory" ( _
        ByVal Destination As LongPtr, ByVal Source As LongPtr, ByVal Length As LongPtr)
    Private Declare PtrSafe Function lstrlenW Lib "kernel32" (ByVal lpString As LongPtr) As Long

    Public Function PtrToString(ByVal p As LongPtr) As String
        Dim n As Long = lstrlenW(p)
        Dim s As String = Space$(n)
        If n > 0 Then CopyMemory StrPtr(s), p, n * 2
        Return s
    End Function
End Module

[InterfaceId("00020400-0000-0000-C000-000000000046")]
Interface IDispatchOwn Extends stdole.IUnknown
    Sub GetTypeInfoCount(ByRef pctinfo As Long)
    Sub GetTypeInfo(ByVal iTInfo As Long, ByVal lcid As Long, ByRef ppTInfo As LongPtr)
    Sub GetIDsOfNames(ByRef riid As GUID, ByRef rgszNames As LongPtr, ByVal cNames As Long, ByVal lcid As Long, ByRef rgDispId As Long)
    Sub Invoke(ByVal dispIdMember As Long, ByRef riid As GUID, ByVal lcid As Long, ByVal wFlags As Integer, ByRef pDispParams As DISPPARAMS, ByRef pVarResult As Variant, ByRef pExcepInfo As EXCEPINFO, ByRef puArgErr As Long)
End Interface

' Dispatched through its own IDispatchOwn methods, since it is NotDispatchable.
NotDispatchable Class HResultObject
    Implements IDispatchOwn

    Private Sub GetTypeInfoCount(ByRef pctinfo As Long) Implements IDispatchOwn.GetTypeInfoCount
        pctinfo = 0
    End Sub

    Private Sub GetTypeInfo(ByVal iTInfo As Long, ByVal lcid As Long, ByRef ppTInfo As LongPtr) Implements IDispatchOwn.GetTypeInfo
        Err.ReturnHResult = &H80004001                   ' E_NOTIMPL
    End Sub

    ' "Hr8002000E" gets the DISPID &H8002000E.
    Private Sub GetIDsOfNames(ByRef riid As GUID, ByRef rgszNames As LongPtr, ByVal cNames As Long, ByVal lcid As Long, ByRef rgDispId As Long) Implements IDispatchOwn.GetIDsOfNames
        rgDispId = CLng("&H" & Mid$(PtrToString(rgszNames), 3))
    End Sub

    ' Fails with the HRESULT that is the DISPID.
    Private Sub Invoke(ByVal dispIdMember As Long, ByRef riid As GUID, ByVal lcid As Long, ByVal wFlags As Integer, ByRef pDispParams As DISPPARAMS, ByRef pVarResult As Variant, ByRef pExcepInfo As EXCEPINFO, ByRef puArgErr As Long) Implements IDispatchOwn.Invoke
        Err.ReturnHResult = dispIdMember
    End Sub
End Class

Class Widget
    Public Sub Hello()
    End Sub
End Class

[TestFixture]
Module LateBoundErrorTests

    ' Fixed in #2490 (BETA 1005): a name the object does not have is error 438.

    [TestCase]
    Public Sub UnknownMember_Class_Raises438()
        Dim o As Object = New Widget
        On Error Resume Next
        o.Nope
        Assert.Strict.AreEqual 438, Err.Number        ' VB6: 438
    End Sub

    [TestCase]
    Public Sub UnknownMember_Collection_Raises438()
        Dim o As Object = New Collection
        On Error Resume Next
        o.Nope
        Assert.Strict.AreEqual 438, Err.Number        ' VB6: 438
    End Sub

    [TestCase]
    Public Sub UnknownMember_CallByName_Raises438()
        Dim o As Object = New Widget
        On Error Resume Next
        CallByName o, "Nope", VbMethod
        Assert.Strict.AreEqual 438, Err.Number        ' VB6: 438
    End Sub

    ' Already as in VB6 in BETA 1005: these failure codes are raised as VB6 raises them.

    [TestCase]
    Public Sub MemberNotFound_Raises438()
        Dim o As Object = New HResultObject
        On Error Resume Next
        o.Hr80020003                                    ' DISP_E_MEMBERNOTFOUND
        Assert.Strict.AreEqual 438, Err.Number        ' VB6: 438
    End Sub

    [TestCase]
    Public Sub TypeMismatch_Raises13()
        Dim o As Object = New HResultObject
        On Error Resume Next
        o.Hr80020005                                    ' DISP_E_TYPEMISMATCH
        Assert.Strict.AreEqual 13, Err.Number         ' VB6: 13
    End Sub

    [TestCase]
    Public Sub InvalidArg_Raises5()
        Dim o As Object = New HResultObject
        On Error Resume Next
        o.Hr80070057                                    ' E_INVALIDARG
        Assert.Strict.AreEqual 5, Err.Number          ' VB6: 5
    End Sub

    ' Left in BETA 1005: these are raised as the HRESULT itself.

    [TestCase]
    Public Sub BadParamCount_Collection_Raises450()
        Dim o As Object = New Collection
        Dim x As Variant
        On Error Resume Next
        x = o.Item(1, 2)                                ' Item takes one argument
        Assert.Strict.AreEqual 450, Err.Number        ' VB6: 450, Wrong number of arguments or invalid property assignment
    End Sub

    [TestCase]
    Public Sub BadParamCount_Raises450()
        Dim o As Object = New HResultObject
        On Error Resume Next
        o.Hr8002000E                                    ' DISP_E_BADPARAMCOUNT
        Assert.Strict.AreEqual 450, Err.Number        ' VB6: 450, Wrong number of arguments or invalid property assignment
    End Sub

    [TestCase]
    Public Sub ParamNotOptional_Raises449()
        Dim o As Object = New HResultObject
        On Error Resume Next
        o.Hr8002000F                                    ' DISP_E_PARAMNOTOPTIONAL
        Assert.Strict.AreEqual 449, Err.Number        ' VB6: 449, Argument not optional
    End Sub

    [TestCase]
    Public Sub NotImpl_Raises445()
        Dim o As Object = New HResultObject
        On Error Resume Next
        o.Hr80004001                                    ' E_NOTIMPL
        Assert.Strict.AreEqual 445, Err.Number        ' VB6: 445, Object doesn't support this action
    End Sub

    [TestCase]
    Public Sub OutOfMemory_Raises7()
        Dim o As Object = New HResultObject
        On Error Resume Next
        o.Hr8007000E                                    ' E_OUTOFMEMORY
        Assert.Strict.AreEqual 7, Err.Number          ' VB6: 7, Out of memory
    End Sub

    [TestCase]
    Public Sub BadIndex_Raises9()
        Dim o As Object = New HResultObject
        On Error Resume Next
        o.Hr8002000B                                    ' DISP_E_BADINDEX
        Assert.Strict.AreEqual 9, Err.Number          ' VB6: 9, Subscript out of range
    End Sub

    [TestCase]
    Public Sub NoNamedArgs_Raises446()
        Dim o As Object = New HResultObject
        On Error Resume Next
        o.Hr80020007                                    ' DISP_E_NONAMEDARGS
        Assert.Strict.AreEqual 446, Err.Number        ' VB6: 446, Object doesn't support named arguments
    End Sub

    [TestCase]
    Public Sub ArrayIsLocked_Raises10()
        Dim o As Object = New HResultObject
        On Error Resume Next
        o.Hr8002000D                                    ' DISP_E_ARRAYISLOCKED
        Assert.Strict.AreEqual 10, Err.Number         ' VB6: 10, This array is fixed or temporarily locked
    End Sub

    [TestCase]
    Public Sub NoInterface_Raises430()
        Dim o As Object = New HResultObject
        On Error Resume Next
        o.Hr80004002                                    ' E_NOINTERFACE
        Assert.Strict.AreEqual 430, Err.Number        ' VB6: 430, Class does not support Automation or does not support expected interface
    End Sub

    [TestCase]
    Public Sub AccessDenied_Raises70()
        Dim o As Object = New HResultObject
        On Error Resume Next
        o.Hr80070005                                    ' E_ACCESSDENIED
        Assert.Strict.AreEqual 70, Err.Number         ' VB6: 70, Permission denied
    End Sub

    [TestCase]
    Public Sub Abort_Raises287()
        Dim o As Object = New HResultObject
        On Error Resume Next
        o.Hr80004004                                    ' E_ABORT
        Assert.Strict.AreEqual 287, Err.Number        ' VB6: 287, Application-defined or object-defined error
    End Sub

End Module
```

**Expected behavior**
The error number VB6 raises for each code in the table, with VB6's description, as twinBASIC already does for `DISP_E_MEMBERNOTFOUND` (438), `DISP_E_TYPEMISMATCH` (13) and the others listed below.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
twinBASIC already raises VB6's number for `DISP_E_MEMBERNOTFOUND` (438), `DISP_E_TYPEMISMATCH` (13), `E_INVALIDARG` (5), `DISP_E_OVERFLOW` (6), `DISP_E_DIVBYZERO` (11), `DISP_E_BADVARTYPE` (458), `DISP_E_PARAMNOTFOUND` (448) and an `HRESULT` of the form `&H800A....` (its low word, 424 for `&H800A01A8`). `E_POINTER`, `E_FAIL`, `E_UNEXPECTED` and `&H8007000D` are raised as themselves by both, from a statement.

The wrong number of arguments, on objects that are not twinBASIC's: `Dictionary.Add "k"` (one argument of two), `Dictionary.Add "k", 1, 2`, `Dictionary.Count = 5`, `x = Dictionary.Exists()`, `x = FileSystemObject.GetFileName()`, `x = FileSystemObject.BuildPath("a")` and `x = Collection.Item(1, 2)` each raise -2147352562 in twinBASIC and 450 in VB6.

Not part of this report: VB6's `CallByName` raises 440, *Automation error*, for the four codes that a statement leaves as they are, where twinBASIC's raises the code itself. The numbers in the table are the same for a statement, for `x = o.Name` and for `CallByName` in VB6.

Severity: code ported from VB6 that tests `Err.Number` for 450, 449 or 9 after a late-bound call does not recognise the error, and the description is the system's text for a COM code instead of VB's.

<!-- Reproducer: bugs/latebound-hresult-mapping/ (mode test: `tbrun --tests`; expect lists the six PASS and eleven FAIL lines, each with the number BETA 1005 raises); verified on BETA 1005 by `bug_repro.mjs verify`. VB6 side in vb6/ (VB6 6.0; a lightweight IDispatch object whose Invoke returns the code, and the ordinary objects): `bug_repro.mjs vb6` prints the table's VB6 column. The Dictionary and FileSystemObject cases and VB6's CallByName column were run in scratch projects (twinBASIC with tbrun, VB6 through scripts/lib/vb6.mjs) that are not kept. Follow-up to #2490 ("A late-bound call to a member that does not exist raises &H80020006, and CallByName raises &H80004005, where VB6 raises 438"), closed as fixed in BETA 1003. Stated in docs/Reference/COM-Interfaces/IDispatch.md, the table under "Errors from a late-bound call" (its row "Invoke returns any other failure code: that code as the error number"); when fixed, that row lists VB6's numbers instead. -->

---

## An error raised with a constant number, in a member called late-bound, reaches the caller as &H80020009, *Exception occurred.*

**Describe the bug**
Follow-up to #2490, which is fixed in BETA 1005 for a name the object does not have, now error 438 as in VB6. This is another late-bound error number that is not VB6's: when the member called raises an error itself, with `Err.Raise` and a constant number (`Err.Raise 380`, with or without a source and a description) or with the `Error` statement, the late-bound caller gets error -2147352567 (`&H80020009`, `DISP_E_EXCEPTION`), *Exception occurred.*, instead of 380. Called early-bound, the same member raises 380. `Err.Raise` with a number held in a variable reaches a late-bound caller correctly. The VB package's own properties are affected: a colour property set late-bound, or with `CallByName`, to a value that is not a colour raises `&H80020009`, where the same assignment early-bound raises 380 (see #2484). Observed by running the reproducer's test cases, in an IDE run and in the built exe alike.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `latebound-constant-raise-exception.twinproj` (attached as `latebound-constant-raise-exception.zip`). Its class `Thing`, in the module below, raises error 380 each way.
2. Run, with `On Error Resume Next`:
   ```
   Dim o As Object = New Thing
   o.RaiseConstant                ' Err.Raise 380
   Debug.Print Err.Number, Err.Description
   ```
3. See `-2147352567 Exception occurred.` Through `Dim t As Thing`, `t.RaiseConstant` gives `380 Invalid property value`.

The module below is the reproducer's, and is meant to be adapted as a regression test. Each expected number is VB6's, from the VB6 project attached as `latebound-constant-raise-exception-vb6.zip`, which raises 380 for each of `Thing`'s members; the last case's is the early-bound result. On BETA 1005 the case from #2490 and the two that already raise 380 pass, and the seven others fail with -2147352567.
```vb
' Regression tests for #2490 and its follow-up: the error a late-bound caller
' sees when the member it calls raises one. Thing's members each raise error 380
' (Invalid property value) a different way. Called early-bound, every one raises
' 380; called late-bound, VB6 6.0 raises 380 for every one (the VB6 project beside
' this one prints them). In BETA 1005 a member that raises with a constant number
' and nothing else reaches the late-bound caller as &H80020009 (DISP_E_EXCEPTION,
' "Exception occurred.").

Class Thing
    Private mValue As Long

    Public Sub RaiseConstant()
        Err.Raise 380
    End Sub

    Public Sub RaiseVariable(ByVal Number As Long)
        Err.Raise Number
    End Sub

    Public Sub RaiseConstantWithSource()
        Err.Raise 380, "Thing"
    End Sub

    Public Sub RaiseConstantWithDescription()
        Err.Raise 380, "Thing", "the value is out of range"
    End Sub

    Public Sub ErrorStatement()
        Error 380
    End Sub

    Public Property Get Value() As Long
        Return mValue
    End Property

    Public Property Let Value(ByVal NewValue As Long)
        If NewValue < 0 Then Err.Raise 380
        mValue = NewValue
    End Property
End Class

[TestFixture]
Module RaiseThroughLateBindingTests

    ' Fixed in #2490 (BETA 1005): a name the object does not have is error 438.

    [TestCase]
    Public Sub UnknownMember_Raises438()
        Dim o As Object = New Thing
        On Error Resume Next
        o.Nope
        Assert.Strict.AreEqual 438, Err.Number                ' VB6: 438
    End Sub

    ' Already as in VB6 in BETA 1005.

    [TestCase]
    Public Sub EarlyBound_RaiseConstant_Raises380()
        Dim t As Thing = New Thing
        On Error Resume Next
        t.RaiseConstant
        Assert.Strict.AreEqual 380, Err.Number                ' VB6: 380
    End Sub

    [TestCase]
    Public Sub LateBound_RaiseVariable_Raises380()
        Dim o As Object = New Thing
        On Error Resume Next
        o.RaiseVariable 380
        Assert.Strict.AreEqual 380, Err.Number                ' VB6: 380
    End Sub

    ' Left in BETA 1005: &H80020009 in place of 380.

    [TestCase]
    Public Sub LateBound_RaiseConstantWithSource_Raises380()
        Dim o As Object = New Thing
        On Error Resume Next
        o.RaiseConstantWithSource
        Assert.Strict.AreEqual 380, Err.Number                ' VB6: 380
    End Sub

    [TestCase]
    Public Sub LateBound_RaiseConstantWithDescription_Raises380()
        Dim o As Object = New Thing
        On Error Resume Next
        o.RaiseConstantWithDescription
        Assert.Strict.AreEqual 380, Err.Number                ' VB6: 380
    End Sub

    [TestCase]
    Public Sub LateBound_RaiseConstant_Raises380()
        Dim o As Object = New Thing
        On Error Resume Next
        o.RaiseConstant
        Assert.Strict.AreEqual 380, Err.Number                ' VB6: 380
    End Sub

    [TestCase]
    Public Sub LateBound_ErrorStatement_Raises380()
        Dim o As Object = New Thing
        On Error Resume Next
        o.ErrorStatement
        Assert.Strict.AreEqual 380, Err.Number                ' VB6: 380
    End Sub

    [TestCase]
    Public Sub LateBound_PropertyLet_Raises380()
        Dim o As Object = New Thing
        On Error Resume Next
        o.Value = -1
        Assert.Strict.AreEqual 380, Err.Number                ' VB6: 380
    End Sub

    [TestCase]
    Public Sub CallByName_RaiseConstant_Raises380()
        Dim o As Object = New Thing
        On Error Resume Next
        CallByName o, "RaiseConstant", VbMethod
        Assert.Strict.AreEqual 380, Err.Number                ' VB6: 380
    End Sub

    [TestCase]
    Public Sub LateBound_FormColour_Raises380()
        ' The VB package's own colour properties raise 380 the same way (#2484).
        Dim o As Object = New PictureBox
        On Error Resume Next
        o.BackColor = -1
        Assert.Strict.AreEqual 380, Err.Number                ' early-bound: 380
    End Sub

End Module
```

**Expected behavior**
380, *Invalid property value*, in every case, as the same member raises early-bound, as `Err.Raise` with a variable number gives late-bound, and as VB6 raises: the VB6 project prints `380` for each of the late-bound calls, `CallByName` included, and 380 with the description given where one is given.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
Also on BETA 997.

What does not reproduce it: `Err.Raise Number` with the number in a variable or a parameter, with or without a source and a description; a run-time error the member does not raise itself, such as a division by zero (11) or `Collection.Item` with an index past its end (9), which arrive as themselves; any early-bound call. What does: `Err.Raise` with a constant number, with or without a constant source and description (`Err.Raise 5`, `Err.Raise 1234` as well as 380); the `Error` statement; a `Property Let`; a late-bound statement and `CallByName` alike; the built exe as well as an IDE run. The `&H80020009` is what `IDispatch::Invoke` returns when the member raised an error, with the error in the `EXCEPINFO`; so the constant-number form seems to leave the `EXCEPINFO` without the number the caller reads, which is an inference.

Severity: moderate. Code that uses an `Object` variable or `CallByName`, as code ported from VB6 or written for scripting often does, cannot tell one error from another when the member raises with a constant number, which is the usual way to write `Err.Raise`, and the description it gets is *Exception occurred.*

<!-- Reproducer: bugs/latebound-constant-raise-exception/ (mode test: `tbrun --tests`; expect lists the three PASS and seven FAIL lines with -2147352567); verified on BETA 1005 by `bug_repro.mjs verify`. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints 438 for Nope and 380 for each other call. The variable-number, run-time-error, Err.Raise 5 and 1234, built-exe (tbrun --exe) and BETA 997 results come from scratch tbrun trees on 1005 and 997 that are not kept. Found while writing the tests of colour-validation-data-ole-multiframe, whose first draft set the properties with CallByName and got &H80020009 for every control. Follow-up to #2490 ("A late-bound call to a member that does not exist raises &H80020006, and CallByName raises &H80004005, where VB6 raises 438"), closed as fixed in BETA 1003. Stated in a NOTE naming BETA 1005 in docs/Reference/Default/VBA/ErrObject/Raise.md, docs/Reference/Core/Error.md and docs/Reference/Default/VBA/Interaction/CallByName.md; when it is fixed, the three NOTEs go and the pages state nothing about it. -->

---

## `Data.ForeColor`, `Data.BackColor`, `OLE.BackColor` and `MultiFrame.BackColor` store a value that is not a colour, where VB6 raises error 380

**Describe the bug**
Follow-up to #2484, which is fixed in BETA 1005 for every colour property of Form, PictureBox, UserControl, Printer, MDIForm, Label, TextBox, CommandButton and the other controls it named: each now raises error 380, *Invalid property value*, and keeps its colour, as VB6 does. This is the four properties that still store the value: `ForeColor` and `BackColor` of the Data control, `BackColor` of the OLE control and `BackColor` of the MultiFrame. Assigning `-1` to any of them raises no error, and the property then reads `FFFFFFFF`. Observed by running the reproducer's test cases.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `colour-validation-data-ole-multiframe.twinproj` (attached as `colour-validation-data-ole-multiframe.zip`). Its `Form1` holds a PictureBox, a Label, a TextBox, a CommandButton, a user control (`UC1`), a Data control, an OLE control and a MultiFrame; `MyMDIForm` is an MDIForm.
2. Run, with `On Error Resume Next`:
   ```
   Load Form1
   Form1.Data1.ForeColor = vbGreen
   Form1.Data1.ForeColor = -1
   Debug.Print Err.Number, Hex$(Form1.Data1.ForeColor)
   ```
3. See `0 FFFFFFFF`. The same with `Form1.Label1.ForeColor` prints `380 FF00`.

The module below is the reproducer's, and is meant to be adapted as a regression test. It loads the forms and never shows them. On BETA 1005 the seventeen cases from #2484 pass, and the four cases for the Data control, the OLE control and the MultiFrame fail with `Expected: 380, Actual: 0`.
```vb
' Regression tests for #2484 and its follow-up. Assigning a value that is not a
' colour to a colour property raises error 380, Invalid property value, and
' leaves the colour it had: VB6 6.0 does this for each property it has (the VB6
' project beside this one prints them), and twinBASIC does it for the other
' controls. Form1 holds one control of each class; it is loaded, never shown.
' Each case sets the colour to vbGreen, assigns the bad value early-bound under
' On Error Resume Next, and checks the error and the colour read back.
[TestFixture]
Module ColourPropertyTests

    Private Const NotAColour As Long = -1
    Private Const SystemColourOutOfRange As Long = &H8000001F

    Private Sub Expect380(ByVal Number As Long, ByVal After As Long)
        Assert.Strict.AreEqual 380, Number, "the error"                   ' VB6: 380, Invalid property value
        Assert.Strict.AreEqual CLng(vbGreen), After, "the colour it had"  ' VB6: the old colour is kept
    End Sub

    ' Fixed in #2484 (BETA 1005).

    [TestCase]
    Public Sub Form_ForeColor()
        Dim number As Long, after As Long
        Load Form1: Form1.ForeColor = vbGreen
        On Error Resume Next: Form1.ForeColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.ForeColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub Form_ForeColor_SystemColourOutOfRange()
        Dim number As Long, after As Long
        Load Form1: Form1.ForeColor = vbGreen
        On Error Resume Next: Form1.ForeColor = SystemColourOutOfRange: number = Err.Number: On Error GoTo 0
        after = Form1.ForeColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub Form_BackColor()
        Dim number As Long, after As Long
        Load Form1: Form1.BackColor = vbGreen
        On Error Resume Next: Form1.BackColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.BackColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub Form_FillColor()
        Dim number As Long, after As Long
        Load Form1: Form1.FillColor = vbGreen
        On Error Resume Next: Form1.FillColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.FillColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub PictureBox_ForeColor()
        Dim number As Long, after As Long
        Load Form1: Form1.PictureBox1.ForeColor = vbGreen
        On Error Resume Next: Form1.PictureBox1.ForeColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.PictureBox1.ForeColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub PictureBox_BackColor()
        Dim number As Long, after As Long
        Load Form1: Form1.PictureBox1.BackColor = vbGreen
        On Error Resume Next: Form1.PictureBox1.BackColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.PictureBox1.BackColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub PictureBox_FillColor()
        Dim number As Long, after As Long
        Load Form1: Form1.PictureBox1.FillColor = vbGreen
        On Error Resume Next: Form1.PictureBox1.FillColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.PictureBox1.FillColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub Label_ForeColor()
        Dim number As Long, after As Long
        Load Form1: Form1.Label1.ForeColor = vbGreen
        On Error Resume Next: Form1.Label1.ForeColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.Label1.ForeColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub Label_BackColor()
        Dim number As Long, after As Long
        Load Form1: Form1.Label1.BackColor = vbGreen
        On Error Resume Next: Form1.Label1.BackColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.Label1.BackColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub TextBox_ForeColor()
        Dim number As Long, after As Long
        Load Form1: Form1.TextBox1.ForeColor = vbGreen
        On Error Resume Next: Form1.TextBox1.ForeColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.TextBox1.ForeColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub TextBox_BackColor()
        Dim number As Long, after As Long
        Load Form1: Form1.TextBox1.BackColor = vbGreen
        On Error Resume Next: Form1.TextBox1.BackColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.TextBox1.BackColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub CommandButton_BackColor()
        Dim number As Long, after As Long
        Load Form1: Form1.CommandButton1.BackColor = vbGreen
        On Error Resume Next: Form1.CommandButton1.BackColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.CommandButton1.BackColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub UserControl_ForeColor()
        Dim number As Long, after As Long
        Load Form1: Form1.UC1.TrySet "ForeColor", NotAColour, number, after: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub UserControl_BackColor()
        Dim number As Long, after As Long
        Load Form1: Form1.UC1.TrySet "BackColor", NotAColour, number, after: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub UserControl_FillColor()
        Dim number As Long, after As Long
        Load Form1: Form1.UC1.TrySet "FillColor", NotAColour, number, after: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub MDIForm_BackColor()
        Dim number As Long, after As Long
        Load MyMDIForm: MyMDIForm.BackColor = vbGreen
        On Error Resume Next: MyMDIForm.BackColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = MyMDIForm.BackColor: Unload MyMDIForm
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub MDIForm_BackColor_SystemColourOutOfRange()
        Dim number As Long, after As Long
        Load MyMDIForm: MyMDIForm.BackColor = vbGreen
        On Error Resume Next: MyMDIForm.BackColor = SystemColourOutOfRange: number = Err.Number: On Error GoTo 0
        after = MyMDIForm.BackColor: Unload MyMDIForm
        Expect380 number, after
    End Sub

    ' Left in BETA 1005: these store the value and raise no error.

    [TestCase]
    Public Sub Data_ForeColor()
        Dim number As Long, after As Long
        Load Form1: Form1.Data1.ForeColor = vbGreen
        On Error Resume Next: Form1.Data1.ForeColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.Data1.ForeColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub Data_BackColor()
        Dim number As Long, after As Long
        Load Form1: Form1.Data1.BackColor = vbGreen
        On Error Resume Next: Form1.Data1.BackColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.Data1.BackColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub OLE_BackColor()
        Dim number As Long, after As Long
        Load Form1: Form1.OLE1.BackColor = vbGreen
        On Error Resume Next: Form1.OLE1.BackColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.OLE1.BackColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub MultiFrame_BackColor()
        Dim number As Long, after As Long
        Load Form1: Form1.MultiFrame1.BackColor = vbGreen
        On Error Resume Next: Form1.MultiFrame1.BackColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.MultiFrame1.BackColor: Unload Form1
        Expect380 number, after
    End Sub

End Module
```
`UC1`, the user control on `Form1`, sets its own colour properties for the three `UserControl_` cases:
```vb
    ' Sets one of the user control's own colour properties to vbGreen, then to
    ' Value; returns the error the second assignment raised, and the colour after it.
    Public Sub TrySet(ByVal Prop As String, ByVal Value As Long, ByRef Number As Long, ByRef After As Long)
        Select Case Prop
            Case "ForeColor": ForeColor = vbGreen
            Case "BackColor": BackColor = vbGreen
            Case "FillColor": FillColor = vbGreen
        End Select
        On Error Resume Next
        Select Case Prop
            Case "ForeColor": ForeColor = Value
            Case "BackColor": BackColor = Value
            Case "FillColor": FillColor = Value
        End Select
        Number = Err.Number
        On Error GoTo 0
        Select Case Prop
            Case "ForeColor": After = ForeColor
            Case "BackColor": After = BackColor
            Case "FillColor": After = FillColor
        End Select
    End Sub
```

**Expected behavior**
Error 380 for each assignment, and the old colour kept, as twinBASIC now does for the other controls, and as VB6 does for `OLE.BackColor`. The VB6 project, attached as `colour-validation-data-ole-multiframe-vb6.zip`, prints `OLE.BackColor = -1: Err 380, reads FF00`, and 380 for each of the other properties of the test. It has no Data control (none could be loaded in VB6 on the machine), and VB6 has no MultiFrame.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
`&H8000001F` and `&HFF0000FF`, which are not colours either, are stored by the same four properties with no error. In the BETA 1005 package source, the Data control, the OLE control and the MultiFrame declare these as plain `Public ... As OLE_COLOR` fields, with no `OnPropertyLet` handler that calls `CommonValidateColorOrRevert`, unlike the other controls. `OLE.BackColor` also gets the compile warning TB0009, *[BackColor] has not yet been implemented*, wherever it is used, and stores the value all the same.

Not tested here: `Printer.ForeColor` and `Printer.FillColor`, which #2484 named, need a default printer; on BETA 1005 they raise 380 and keep the colour when there is one (#2484's reproducer prints them).

Severity: low. The stored value is what the control then paints with, and no error tells the program that the colour it was given is not one.

<!-- Reproducer: bugs/colour-validation-data-ole-multiframe/ (mode test: `tbrun --tests`; expect lists the seventeen PASS and four FAIL lines); verified on BETA 1005 by `bug_repro.mjs verify`. VB6 side in vb6/ (VB6 6.0, the same project as #2484's): `bug_repro.mjs vb6` prints 380 for every property it has, OLE.BackColor included. The tests assign early-bound: set late-bound or through CallByName, every one of these properties raises &H80020009 instead of 380 (the entry "An error raised with a constant number, in a member called late-bound, reaches the caller as &H80020009, *Exception occurred.*"). Follow-up to #2484 ("Setting a colour property to a value that is not a colour stores it, and raises error 5 or nothing, where VB6 raises error 380 and keeps the old value"), closed as fixed in BETA 1004; its reproducer, bugs/filed/forecolor-invalid-value-stored/, still reproduces these four lines and stays until a fix is released. Stated in a WARNING naming BETA 1005 on docs/Reference/Default/VB/Data/index.md (under ForeColor and under BackColor), OLE/index.md (under BackColor) and MultiFrame/index.md (under BackColor): when fixed, each WARNING goes, and the property says that a value that is not a colour raises error 380, as the other controls' pages do. -->

---

## After `Reset`, `Clone` of the WebView2 response headers enumerator skips the headers read before the `Reset`

**Describe the bug**
Follow-up to #2496, which is fixed in BETA 1005 for `Clone` after `Next` and after `Skip`, on the enumerators of the request headers and the response headers alike, and after `Reset` on the request headers'. This is the response headers' enumerator after a `Reset`: after two `Next` calls and a `Reset`, the enumerator's `Next` returns the first header, `Ha`, and its clone's `Next` returns the third, `Hc`. Observed by running the reproducer's test cases.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `webview2-response-headers-reset-clone.twinproj` (attached as `webview2-response-headers-reset-clone.zip`). Its `Form1` holds one WebView2 control, which navigates to `https://example.com/page` and answers that request itself in `WebResourceRequested`, so nothing goes to the network. The handler appends four headers, `Ha` to `Hd`, to the response, and records what three fresh enumerators of `Request.Headers`, then three of `Response.Headers`, return (module `HeaderEnumeration`, below).
2. Call `HeaderEnumerationTests.Response_CloneAfterReset` from `Sub Main` and press F5. The form shows until its request is answered, and closes.
3. See the assertion fail with `Expected: "Ha|Ha" Actual: "Ha|Hc"`: the enumerator's `Next`, then the clone's.

The module below is the reproducer's, and is meant to be adapted as a regression test. It shows `Form1` while the control answers its request, and unloads it. On BETA 1005 the five cases from #2496 pass, and `Response_CloneAfterReset` fails.
```vb
' Regression tests for #2496 and its follow-up. IEnumVARIANT::Clone returns an
' enumerator with the same state as the one it is called on (the COM
' documentation of IEnumVARIANT::Clone), so the clone's Next returns what the
' enumerator's own Next returns next. Each case compares the two after one Next,
' after Skip 2, and after two Next and a Reset, for the request headers and for
' the response headers, which hold Ha, Hb, Hc and Hd.

' IEnumVARIANT, declared here because the package's own declaration is private.
[InterfaceId("00020404-0000-0000-C000-000000000046")]
Interface IEnumVARIANTOwn Extends stdole.IUnknown
    Type CArrayOfVariants
        Elements(1) As Variant
    End Type

    Sub Next(ByVal celt As Long, ByRef rgVar As CArrayOfVariants, ByRef pCeltFetched As Long)
    Sub Skip(ByVal celt As Long)
    Sub Reset()
    Function Clone() As stdole.IUnknown
End Interface

' What the enumerators returned, recorded by Form1 while it answers its request.
Module HeaderEnumeration

    Public Recorded As Boolean
    Public Results As New Collection      ' "<side> <case>" -> "<enumerator's Next>|<clone's Next>"

    Private Function NextName(ByVal e As IEnumVARIANTOwn) As String
        Dim arr As IEnumVARIANTOwn.CArrayOfVariants
        Dim fetched As Long
        e.Next 1, arr, fetched
        If fetched = 0 Then Return "(end)"
        Dim hd As WebView2Header = arr.Elements(0)
        Return hd.Name
    End Function

    ' Three fresh enumerators of one collection.
    Public Sub Record(ByVal Side As String, ByVal u0 As stdole.IUnknown, ByVal u1 As stdole.IUnknown, ByVal u2 As stdole.IUnknown)
        Dim e As IEnumVARIANTOwn, c As IEnumVARIANTOwn, first As String

        Set e = u0
        first = NextName(e)
        Set c = e.Clone()
        Results.Add NextName(e) & "|" & NextName(c), Side & " after one Next"

        Set e = u1
        NextName e
        NextName e
        e.Reset
        Set c = e.Clone()
        Results.Add NextName(e) & "|" & NextName(c), Side & " after Reset"

        Set e = u2
        e.Skip 2
        Set c = e.Clone()
        Results.Add NextName(e) & "|" & NextName(c), Side & " after Skip 2"
    End Sub

End Module

[TestFixture]
Module HeaderEnumerationTests

    Private Declare PtrSafe Function SetEnvironmentVariableW Lib "kernel32" (ByVal lpName As LongPtr, ByVal lpValue As LongPtr) As Long

    ' Shows Form1 until its request has been answered, once.
    Private Sub Collect()
        If HeaderEnumeration.Recorded Then Exit Sub
        ' Only for an IDE that was started with these variables, as this repository's
        ' test harness starts it: WebView2 would read them, and the control would fail.
        Dim folder As String = Environ$("WEBVIEW2_USER_DATA_FOLDER")
        Dim args As String = Environ$("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS")
        SetEnvironmentVariableW StrPtr("WEBVIEW2_USER_DATA_FOLDER"), 0
        SetEnvironmentVariableW StrPtr("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS"), 0
        Form1.Show
        Dim started As Double = Timer
        Do Until HeaderEnumeration.Recorded Or Timer - started > 30
            DoEvents
        Loop
        Unload Form1
        If Len(folder) Then SetEnvironmentVariableW StrPtr("WEBVIEW2_USER_DATA_FOLDER"), StrPtr(folder)
        If Len(args) Then SetEnvironmentVariableW StrPtr("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS"), StrPtr(args)
    End Sub

    ' "<enumerator's Next>|<clone's Next>"
    Private Function Pair(ByVal Key As String) As String
        Collect
        Assert.Strict.IsTrue HeaderEnumeration.Recorded, "the request was answered"
        Return HeaderEnumeration.Results(Key)
    End Function

    ' Fixed in #2496 (BETA 1005): the clone continues from the enumerator's position.

    [TestCase]
    Public Sub Request_CloneAfterNext()
        Assert.Strict.AreEqual "Upgrade-Insecure-Requests|Upgrade-Insecure-Requests", Pair("request after one Next")
    End Sub

    [TestCase]
    Public Sub Request_CloneAfterSkip()
        Assert.Strict.AreEqual "User-Agent|User-Agent", Pair("request after Skip 2")
    End Sub

    [TestCase]
    Public Sub Request_CloneAfterReset()
        Assert.Strict.AreEqual "Accept|Accept", Pair("request after Reset")
    End Sub

    [TestCase]
    Public Sub Response_CloneAfterNext()
        Assert.Strict.AreEqual "Hb|Hb", Pair("response after one Next")
    End Sub

    [TestCase]
    Public Sub Response_CloneAfterSkip()
        Assert.Strict.AreEqual "Hc|Hc", Pair("response after Skip 2")
    End Sub

    ' Left in BETA 1005: Reset does not rewind the position Clone copies.

    [TestCase]
    Public Sub Response_CloneAfterReset()
        Assert.Strict.AreEqual "Ha|Ha", Pair("response after Reset")
    End Sub

End Module
```
`Form1`'s handlers, which call `Record`:
```vb
    Private Sub WebView21_Ready() Handles WebView21.Ready
        WebView21.AddWebResourceRequestedFilter "*", wv2All
        WebView21.Navigate "https://example.com/page"
    End Sub

    Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, ByVal Response As WebView2Response) _
            Handles WebView21.WebResourceRequested
        Response.Headers.AppendHeader "Ha", "1"
        Response.Headers.AppendHeader "Hb", "2"
        Response.Headers.AppendHeader "Hc", "3"
        Response.Headers.AppendHeader "Hd", "4"
        If Not HeaderEnumeration.Recorded Then
            Dim rq As WebView2RequestHeaders = Request.Headers
            HeaderEnumeration.Record "request", rq._NewEnum(), rq._NewEnum(), rq._NewEnum()
            Dim rs As WebView2ResponseHeaders = Response.Headers
            HeaderEnumeration.Record "response", rs._NewEnum(), rs._NewEnum(), rs._NewEnum()
            HeaderEnumeration.Recorded = True
        End If
        Response.StatusCode = 200
        Response.ReasonPhrase = "OK"
        Response.ContentUTF8 = "<html><body>probe</body></html>"
    End Sub
```

**Expected behavior**
`Ha|Ha`: `IEnumVARIANT::Clone` creates an enumerator with the same state as the current one, so after a `Reset` the clone starts at the first header, as the request headers' clone does.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
In BETA 1005's package source, `WebView2HeadersCollection.twin`, `Next` and `Skip` advance `IterationIdx`, which `Clone` passes to the new enumerator. The two request headers classes set `IterationIdx = 0` in their `Reset`; the two response headers classes in `WebView2ResponseHeaders.twin`, `WebView2HeadersCollection_ResponseGetHeaders` and `WebView2HeadersCollection_ResponseEnumerator`, do not, so after a `Reset` their clone skips as many headers as were read before it. Setting `IterationIdx = 0` in those two `Reset`s, as the request side does, would fix it. Only `_NewEnum` (the `ResponseEnumerator` class) was run; `GetHeaders` (the other class) has the same `Reset`.

Severity: low. `For Each` does not call `Clone`, so only a COM client that clones the enumerator after resetting it gets the wrong headers.

<!-- Reproducer: bugs/webview2-response-headers-reset-clone/ (mode test: `tbrun --tests`, which runs the cases in the IDE, so the form shows on the harness's private desktop; expect lists the five PASS lines and the FAIL line with "Ha|Hc"); verified on BETA 1005 by `bug_repro.mjs verify`. No VB6 side: VB6 has no WebView2 control. Follow-up to #2496 ("The WebView2 headers enumerator's Clone starts at the first header, not at the enumerator's position"), closed as fixed in BETA 1000; its reproducer, bugs/filed/webview2-headers-clone-restarts/, still reproduces the Reset line and stays until a fix is released. Stated in a `> [!WARNING]` naming BETA 1005 on docs/Reference/Built-In/WebView2/WebView2HeadersCollection.md, after the paragraph on the enumerator operations; remove it once a fixed build is released. -->

---

## `import` and `export` exit with code 0 when they end `... FAILED`

**Describe the bug**
Follow-up to #2493, which is fixed in BETA 1005 for the message: `import` of a folder with no `Settings` file now prints `ERROR: missing Settings file` before `... FAILED`. #2493's Expected behavior also said that a failure should not exit with 0, and that is left: `import` and `export` exit with code 0 after every failure they report, so a script that tests the exit code takes a failed run for a successful one. Observed with the compiler executable run from a script, its output and exit code captured.

**To Reproduce**
Steps to reproduce the behavior:
1. Unzip `import-export-exit-zero.zip` (it holds `import-export-exit-zero.twinproj`, an ordinary console project), and export it once: `twinBASIC_win32.exe export C:\p\import-export-exit-zero.twinproj C:\p\src\`.
2. Run each of these, and look at the exit code (`echo %ERRORLEVEL%` in a Command Prompt):
   ```
   twinBASIC_win32.exe import C:\p\x.twinproj C:\p\src\Sources\
   twinBASIC_win32.exe import C:\p\y.twinproj C:\p\no-such-folder\
   twinBASIC_win32.exe export C:\p\no-such-project.twinproj C:\p\out\
   twinBASIC_win32.exe export C:\p\import-export-exit-zero.twinproj C:\p\src\
   twinBASIC_win32.exe import C:\p\import-export-exit-zero.twinproj C:\p\src\
   ```
3. See each end `... FAILED`, after `ERROR: missing Settings file`, `ERROR: input folder does not exist`, `ERROR: input twinproj file does not exist`, `[EXPORT]  ERROR: output file already exists and --overwrite not set: ...Settings` and `ERROR: failed to create output file: ...import-export-exit-zero.twinproj (already exists and --overwrite not set)` in turn, and each exit with code 0.

The script below is meant to be adapted as a regression test. A unit test cannot run the compiler's command line, so it is a Command Prompt script: each case runs one command and asserts the exit code, `PASS` for not 0. On BETA 1005 every case prints `FAIL`. It expects the export of step 1 in `%P%\src\` and the project in `%P%\`.
```bat
@echo off
rem Regression tests for #2493 and its follow-up: a run of import or export that
rem ends "... FAILED" exits with a code other than 0. Set TB to the compiler
rem executable and P to a folder holding the project and its export in src\.
call :expect_failure ImportNoSettings     import "%P%\x.twinproj" "%P%\src\Sources\"
call :expect_failure ImportNoFolder       import "%P%\y.twinproj" "%P%\no-such-folder\"
call :expect_failure ExportNoProject      export "%P%\no-such-project.twinproj" "%P%\out\"
call :expect_failure ExportNoOverwrite    export "%P%\import-export-exit-zero.twinproj" "%P%\src\"
call :expect_failure ImportNoOverwrite    import "%P%\import-export-exit-zero.twinproj" "%P%\src\"
exit /b

:expect_failure
set NAME=%1
shift
"%TB%" %1 %2 %3 > nul 2>&1 < nul
if errorlevel 1 (echo PASS %NAME%) else (echo FAIL %NAME%: exit code 0)
exit /b
```

**Expected behavior**
A code other than 0 from every run that ends `... FAILED`, as the last line of #2493's Expected behavior asked, so that a script or a build step can tell a failure without reading the output. Each run keeps its `ERROR:` line, as BETA 1005 prints it.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
The same exit code on BETA 995 and 997 for each of these failures (there, the first prints no `ERROR:` line, which is what #2493 reported). A successful `export` and `import` end `... DONE` and exit 0, as they should.

Severity: minor in an interactive session, where the `ERROR:` line is read; in a build script that checks the exit code, a project that was never written, or a tree that was never exported, passes for a success.

<!-- Reproducer: bugs/import-export-exit-zero/ (mode cli: the five commands above on copies of the packed project and its src/, expecting exit 0 from each, each ERROR line, ... FAILED, and no ... DONE); verified on BETA 1005 by `bug_repro.mjs verify`. The batch script was not run here, since this repository starts the compiler executable only on a private desktop (launchOnDesktop): the same five commands were, by bug_repro's cli mode on 1005, and by a scratch script over launchOnDesktop on 995 and 997 (exit 0 each). Follow-up to #2493 ("import of a folder with no Settings file fails without saying why"), closed as fixed in BETA 1000. Stated in WIP.md ("Both verbs exit 0 after the failures they report") and WIP.Harness.md: when fixed, those can say since which build the exit code is reliable; scripts/impexp.mjs, which the tooling uses instead, is not affected. -->

---

## `? p` in the Debug Console, where `p` is a user-defined type, fails with a codegen error and a linker error

**Describe the bug**
Follow-up to #2485, which is fixed in BETA 1005 for the watch: a watch on a variable of a user-defined type now shows `{user defined type, 8 bytes}`, of its type, at this stop and the next, with no linker error. This is the same expression typed in the Debug Console: `? p` still fails with `(compile error: codegen error; check for compilation errors)`, and the Debug Console prints `[LINKER] compilation (codegen) error detected in 'Startup.{temp_procedure}' at line #1`. Observed in the IDE, stopped at a breakpoint.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `console-print-udt-linker-error.twinproj` (attached as `console-print-udt-linker-error.zip`). `Startup.twin` declares a type, and `Main` passes the line marked `BREAK` twice:
   ```
   Private Type Point
       X As Long
       Y As Long
   End Type

   Public Sub Main()
       Dim p As Point
       Dim i As Long
       p.X = 7
       For i = 1 To 2
           Debug.Print "pass " & i ' BREAK
       Next
   End Sub
   ```
2. Put a breakpoint on the line marked `BREAK` (F9) and press F5. The run stops there.
3. Type `? p` in the Debug Console and press Enter.
4. See `(compile error: codegen error; check for compilation errors)`, and `[LINKER] compilation (codegen) error detected in 'Startup.{temp_procedure}' at line #1` in the Debug Console.

A unit test cannot reach the Debug Console, so the check below is a scripted one, meant to be adapted as a regression test; the documentation's IDE test harness runs it by driving the IDE (its `watches` scenario). At the stop of step 2, with the Debug Console's output marked:
- **Fixed in #2485 (BETA 1005), passes:** a watch on `p` shows the value `{user defined type, 8 bytes}` and the type `Point`; a watch on `p.X` shows `7` and `Long`; after F5 to the second stop, both watches show the same again; and no `[LINKER]` line has been printed since the mark.
- **Left in BETA 1005, fails:** after `? p` and Enter, the Debug Console holds no `[LINKER]` line, and no `codegen error`; it holds an error about the expression, such as that `p` has no single value to print.

**Expected behavior**
An expression that cannot be shown, such as `? p`, which has no single value to print, is refused with a message about the expression, and no `[LINKER]` line, as the watch on the same expression now shows it without one. A linker error about generated code reads as though the project had failed to build, which it has not.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
Also on BETA 987, 995 and 997, where the watch on `p` failed in the same way.

What does not reproduce it, on BETA 1005: a watch on `p`, a watch on `p.X`, and **Variables**, which shows `p` and its fields. Seen with a `Private Type` declared in the module; other declarations of the type were not tried.

Severity: low. The console reports a failed build for a line that only asks to print a structure.

<!-- Reproducer: bugs/console-print-udt-linker-error/ (mode lane: `ide-test.bat --only watches`, test/ide/watches.test.mjs, whose first three tests assert the fixed watch and whose last asserts the ? p defect; the lane passes while the bug is there); its Startup.twin is test/ide/probes/watches/Sources/Startup.twin with a different header comment. Verified on BETA 1005 by `bug_repro.mjs verify` through the lane. Follow-up to #2485 ("A watch on a variable of a user-defined type fails with a codegen error, and the Debug Console reports a linker error at every stop"), closed as fixed in BETA 1003; its reproducer, bugs/filed/udt-watch-codegen-error/, names the same lane test and stays until a fix is released. No documentation page states it. When fixed: update the last test of test/ide/watches.test.mjs to assert the new message, and retire both reproducers. -->

---

## A `ParamArray` element that is a `Variant` variable holding an array cannot be indexed or assigned to an array: error -2147467259

**Describe the bug**
When the argument passed to a `ParamArray` is a `Variant` variable that holds an array, the procedure cannot use the element as an array. Assigning it to an array variable of any type, indexing it to read or to write an element, and passing it on to another `ParamArray` that indexes it raise run-time error -2147467259, *Unspecified error*; `Join` raises error 13. VB6 does all of these without an error. `LBound`, `UBound`, `IsArray`, `VarType` and `For Each` work on the same element. Observed in the reproducer project's regression tests and in a run of its `Sub Main`.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `paramarray-variant-array.twinproj` (attached as `paramarray-variant-array.zip`). Its module `Cases` holds 28 cases: each passes a small array to a `ParamArray` function in one way, does one thing with `parts(0)`, and returns what that gives, or `error <number>`. Its module `ParamArrayTests` holds one `[TestCase]` per case, asserting what the case gives in VB6.
2. Run it (F5). `Sub Main` prints what each case gives; the same program built in VB6 (attached as `paramarray-variant-array-vb6.zip`) prints what VB6 gives:

   | the argument | what the function does with `parts(0)` | twinBASIC | VB6 |
   |---|---|---|---|
   | `b`, a `Byte()` variable | `a = parts(0)`, `a() As Byte` | `2 98` | `2 98` |
   | `v`, a `Variant` variable holding a `Byte()` | `a = parts(0)`, `a() As Byte` | error -2147467259 | `2 98` |
   | a `Variant` variable holding a `Long()`, `String()`, `Double()` or `Variant()` | `a = parts(0)`, `a()` of that type | error -2147467259 | `2 7`, `2 y`, `2 2.5`, `2 y` |
   | `v` | `x = parts(0)(1)` | error -2147467259 | `98` |
   | a `Variant` variable holding a two-dimensional `Long()` | `x = parts(0)(1, 2)` | error -2147467259 | `12` |
   | a `Variant` variable holding `Array(1, 2, 3)` | `parts(0)(1) = 99` | error -2147467259, and the caller's element 1 stays 2 | no error, and the caller's element 1 is 99 |
   | a `Variant` variable holding a `String()` | `Join(parts(0), "+")` | error 13 | `x+y+z` |
   | `v` | passed on to another `ParamArray` function, which indexes its element | error -2147467259 | `98` |
   | a `Variant` variable holding `Array(1, -2, 300, 20.3)` | the `Max` and `UnpackParamArray` of #1660 | error -2147467259 | `300` |
   | a module-level `Variant`, an element of a `Variant()` array, a `Variant` field of a UDT, or a `ByVal` or `ByRef` `Variant` parameter passed on | `x = parts(0)(1)` | error -2147467259 | `98` |
   | `v`, to a class's method that takes the `ParamArray`, called early- or late-bound | `x = parts(0)(1)` | error -2147467259 | `98` |
   | `v` | `LBound` and `UBound`; `IsArray` and `VarType`; `For Each` | `0 to 2`; `True 8209`; the sum | the same |
   | `v` | passed on to a `ByVal x As Variant` parameter, which indexes it | `98` | `98` |
   | `v` | the whole `ParamArray` passed on to another, which reads `q(0)(0)(1)` | `98` | `98` |
   | `v` | `x = parts(0)`, then `x(1)` | `98` | `98` |
   | `(v)`, `CVar(b)`, or a function's `Variant` result | `x = parts(0)(1)` | `98` | `98` |

**Expected behavior**
What VB6 gives, in every case. The element refers to the caller's `Variant`, which holds an array: assigning the element to an array variable copies that array, indexing it reads or writes the array's elements, and `Join` joins them.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
The same on BETA 997 and 957, and in a built exe. In an exe compiled with LLVM every case gives the same, but for the case of #1660, which ends the program with an access violation: its error is raised in `UnpackParamArray`, which has no error handler, and is not passed on to the handler of its caller, a separate defect of LLVM-compiled code.

What does not reproduce it: an argument that is an array variable, or an expression such as `(v)`, `CVar(b)` or a function's result, which passes a copy rather than a reference to a `Variant`; the element read into a local `Variant` first, or passed to a `ByVal Variant` parameter; the whole `ParamArray` passed on to another; and outside a `ParamArray`, a `ByRef Variant` parameter (`a = v` works) or an element of a `Variant()` array assigned in the procedure the array is passed to.

#1660 (open) is this defect reached another way: its unpacking routine is one of the cases, and fails as reported there. This entry narrows it to the element of a `ParamArray` that refers to a `Variant` variable, and shows what else fails with it.

Severity: moderate. An error is always raised, so nothing goes wrong silently, but VB6 code that forwards a `Variant` array through a `ParamArray`, such as a `Max` or `Concat` helper or the unpacking routine of #1660, fails, and *Unspecified error* gives no hint why. Reading the element into a `Variant` first avoids it.

<!-- Reproducer: bugs/paramarray-variant-array/ (mode test: `tbrun --tests` runs the 28 [TestCase]s of ParamArrayTests; expect lists the ten PASS and eighteen FAIL lines, each FAIL with what BETA 1005 gives). verify reproduces on BETA 957, 997 and 1005; VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints the table's VB6 column, which the test cases assert. The built-exe and LLVM results are from `tbrun --exe` and `tbrun --exe --llvm` on a scratch copy whose Startup prints with TbRun.Out, not kept. Found while writing scripts/imagestrip/'s twinBASIC tests: TestImages.Cat in scripts/imagestrip/src/Sources/Tests/TestImages.twin copies each ParamArray element through a Variant to work around it, and its comment names this entry. Stated in a NOTE naming BETA 1005 in docs/Reference/Core/ParamArray.md. When fixed, the NOTE goes, ParamArray.md states nothing about it, and Cat's workaround and comment go. Filing it new, or commenting on #1660 with this narrowed form and marking it CAPTURED IN EXISTING #1660, is the owner's call. -->

---

## The IDE's `styles.css` labels a GIF and a JPEG `image/png`, and two PNGs `/png`

**Describe the bug**
Four of the images that the IDE's `ide\styles.css` embeds as base64 `data:` URIs are labelled with a media type their bytes do not have: two PNGs are labelled `/png`, which is not a media type, and a GIF and a JPEG are labelled `image/png`. The other 171 images embedded in the `.css` files under `ide\` are labelled with the type they have.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `ide\styles.css`, in the folder of the twinBASIC installation, in a text editor. There is no project to attach: the defect is in the installation's own file.
2. Line 2947, in the rule of `.treeExpanded` and `.sectionExpanderIcon`, reads `background-image: url('data:/png;base64,iVBORw0KGgo...')`. Decode the base64: its first eight bytes are `89 50 4E 47 0D 0A 1A 0A`, the signature of a PNG. Line 2952, in the rule of `.treeExpanded1`, is labelled `/png` in the same way, and is also a PNG.
3. Line 3917, in the rule of `#progressSpinner` and `.progressSpinnerIcon`, reads `url('data:image/png;base64,R0lGODlh...')`. Decode the base64: it starts with `GIF89a`, the signature of a GIF.
4. Line 7412, in the rule of `.vipGold1_autoWeighingSystemsLogo`, reads `url('data:image/png;base64,/9j/4AAQ...')`. Decode the base64: it starts with `FF D8 FF E0`, the start of a JPEG.

**Expected behavior**
Each `data:` URI names the type of its bytes, as the other 171 do: `image/png` for the two PNGs, `image/gif` for the GIF and `image/jpeg` for the JPEG. A media type is `type/subtype`, so `/png` is not one.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
BETA 997 and 957 have the same four images, at lines 2947, 2952, 3917 and 7389 in BETA 997, and at lines 2935, 2940, 3905 and 7323 in BETA 957. No other `.css` file under `ide\` has a mislabelled image, the Monaco editor's `editor.main.css` included. Images embedded in the IDE's `.js` and `.htm` files were not checked.

Severity: low. Chromium identifies an image by its bytes, so all four pictures show: in headless Chrome 148, each of the four URIs loads as an `<img>` at its own size, and as a `background-image` draws the same pixels as the URI with the correct label. The IDE's own WebView2 was not tested.

<!-- Reproducer: bugs/ide-stylesheet-image-labels/ (mode probe: scripts/probe_ide_image_labels.mjs reads every .css file under the install's ide folder through stripFile in scripts/lib/compact-image.mjs and prints one line for each image whose label differs from its bytes; exit 1 while the defect is there). No project and no zip, as for the filed "The IDE has written the same name twice into project files it ships". `verify` reproduces on BETA 1005; the probe prints the same four on 997 and 957. The Chrome check is not scripted (headless Chrome from scripts/lib/browser.mjs, 2026-10-10: each URI loaded as an Image, and an element screenshot of a box with it as background compared byte for byte with the same box under the correct label). Found by imagestrip, which relabels each image by its bytes and reports it. Stated in docs/Documentation/Tools.md's imagestrip section ("In BETA 1005, the IDE's `styles.css` has a GIF and a JPEG labelled `image/png`, and two PNGs labelled `/png`...") and in WIP.Build.md's bullet "An image is named by its bytes"; when fixed, update both and the comments in scripts/lib/compact-image.mjs that name the IDE's labels. Tools.md's probe_ide_image_labels.mjs section goes with the reproducer when it is deleted. -->

---

## An error is not passed to the caller's `On Error` handler when the caller or the procedure that raised it is compiled with LLVM

**Describe the bug**
An error raised in a procedure that has no error handler goes to the `On Error` handler of its caller. When either of the two procedures is compiled with LLVM, by `[CompilerOptions("+llvm")]` or with LLVM turned on for the whole project, the caller's handler does not run. Run in the IDE (F5), the program ends at the call without a message. In a built exe, a caller compiled with LLVM shows the unhandled-error box and ends; a callee compiled with LLVM shows a box titled `_TB_ERROR_HANDLER` that names the procedure but no error, and the program then ends with an access violation (0xC0000005 at address 0). With neither procedure compiled with LLVM, the caller's handler catches the error, in the IDE and in an exe, as it does in VB6.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `llvm-error-not-passed-to-caller.twinproj` (attached as `llvm-error-not-passed-to-caller.zip`). It needs an LLVM licence (Ultimate): its procedures are compiled with LLVM by their `[CompilerOptions("+llvm")]` attribute. Its module `Cases` holds 12 cases. Each calls a procedure that raises an error and has no error handler, from a procedure with `On Error GoTo` (cases 10 and 11: `On Error Resume Next`), and returns what the handler caught. The error is `Err.Raise 5000` or a division by zero. Case 4 is:
   ```
   [CompilerOptions("+llvm")]
   Private Sub ErrRaise_Llvm()
       Err.Raise 5000, "Callee", "raised by Err.Raise"
   End Sub

   Public Function CallerPlain_CalleeLlvm_ErrRaise() As String
       On Error GoTo Handler
       ErrRaise_Llvm
       CallerPlain_CalleeLlvm_ErrRaise = "no error"
       Exit Function
   Handler:
       CallerPlain_CalleeLlvm_ErrRaise = "caught " & Err.Number
   End Function
   ```
2. Run the project in the IDE (F5). `Sub Main` runs the cases in order, and writes each case's name to the DEBUG CONSOLE, then what its handler caught.
3. See `caught 5000`, `caught 11` and `caught 11` for the first three cases. Then see the name `CallerPlain_CalleeLlvm_ErrRaise` and nothing after it: the run has ended without a message, and `end of Main` is not written.
4. Set `FirstCase` in the module `Startup` to 5, 6 and so on to run the cases after the first one that ends the run. Each of them ends the run in the same way. What each case does in the IDE, in an exe built from the project (which shows only its box and how it ends, since `Debug.Print` writes nothing in an exe), and in VB6 (the same procedures without the attributes, attached as `llvm-error-not-passed-to-caller-vb6.zip`, which writes each case's result to `out.txt`):

   | cases | the caller, which has the handler | the callee, which raises the error | twinBASIC, run in the IDE | twinBASIC, built exe | VB6 |
   |---|---|---|---|---|---|
   | 1, 2 | ordinary | ordinary | `caught 5000`, `caught 11` | the same | the same |
   | 3 | LLVM, which also raises the error (a division by zero) | the same procedure | `caught 11` | `caught 11` | `caught 11` |
   | 4, 7 | ordinary | LLVM | the run ends | the box `_TB_ERROR_HANDLER` (`unhandled error in Cases.ErrRaise_Llvm`; case 7: `Cases.Divide_Llvm`), then an access violation | `caught 5000`, `caught 11` |
   | 5, 8 | LLVM | ordinary | the run ends | the unhandled-error box (`Run-time error '5000' raised by Err.Raise`; case 8: `Run-time error '11' Division by zero`), then the program ends | `caught 5000`, `caught 11` |
   | 6, 9 | LLVM | LLVM | the run ends | as 4 and 7 | `caught 5000`, `caught 11` |
   | 10 | ordinary, with `On Error Resume Next` | LLVM | the run ends | as 4 | `continued, Err.Number 5000` |
   | 11 | LLVM, with `On Error Resume Next` | ordinary | the run ends | as 5 | `continued, Err.Number 5000` |
   | 12 | ordinary, with an ordinary procedure between it and the callee | LLVM | the run ends | as 4 | `caught 5000` |

**Expected behavior**
The error is passed to the caller's handler whichever of the two procedures is compiled with LLVM, as it is without LLVM and in VB6: an `On Error GoTo` handler runs with `Err.Number` set to 5000 (or 11), and under `On Error Resume Next` the caller continues with the statement after the call, with the same `Err.Number`. With no handler in any caller, the error is unhandled, and the box shows its number and description.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
On BETA 1005 every case of the table was run on its own, in the IDE and in a 32-bit exe. The run ends at case 4 in the IDE on BETA 997, 995 and 987 as well. A 64-bit exe of cases 4 and 5 on BETA 1005 does what the 32-bit one does, and so does a BETA 997 exe, but for the box of case 5, which is titled `shutdown` there. BETA 957 refuses the project's LLVM procedures ("a feature used in your code is not yet supported with the LLVM compiler").

What does not reproduce it: neither procedure compiled with LLVM (cases 1 and 2), and an LLVM-compiled procedure that handles an error its own statement causes (case 3). An error raised by `Err.Raise` and one caused by a division by zero behave the same; so do `On Error GoTo` and `On Error Resume Next`, and a callee reached through an ordinary procedure (case 12). With LLVM turned on for the whole project, every procedure is compiled with LLVM, so cases 1 and 2 end the run as well, in the IDE and in an exe; case 3 still works.

Severity: high for a program compiled with LLVM. An error that the caller handles ends the program, and with a callee compiled with LLVM it ends with an access violation. In the IDE the run ends without a message, so the cause is hard to find. No wrong result is produced. Compiling both procedures without LLVM avoids it.

<!-- Reproducer: bugs/llvm-error-not-passed-to-caller/ (mode run: `Sub Main` runs the 12 cases in order and the run ends silently at case 4; expect is tbrun exit 5, the output of cases 1 to 3 and the name of case 4, and absent the result line of case 4 and `end of Main`; verify reproduces on BETA 1005, 997, 995 and 987). expect judges case 4 only: when verify says NO LONGER REPRODUCES, set FirstCase in Startup.twin to 5 and run again, because a fix of the callee case alone leaves the caller cases. Test mode was tried and is not used: `tbrun --tests` honours the per-procedure attribute, but the first LLVM case waits 120 s (`no answer from the compiler after 120 s`) and every case after it fails with `main thread is busy`, so one run cannot tell the cases apart. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints the table's VB6 column. The exe results are from `tbrun --exe` (and `--arch win64`) on scratch copies of src/ whose Startup prints with TbRun.Out, one case per run, not kept; the project-wide LLVM results are from `tbrun --llvm --exe` on the same. Stated in a WARNING naming BETA 1005 in docs/LLVM/Getting-Started.md, "Language support", after the sentence "The main feature not yet supported is passing an error up to the calling procedure. A fix is planned.": when fixed, the WARNING and that sentence go. The entry "A `ParamArray` element that is a `Variant` variable holding an array..." mentions the LLVM-exe case in its Additional context ("a separate defect of LLVM-compiled code"): name this entry's issue there once it is filed, and drop the sentence when this is fixed. Not narrowed, so not in the entry: an LLVM-compiled procedure whose handler re-raises the error with `Err.Raise Err.Number`, called from an ordinary procedure with a handler, left the BETA 1005 exe running until it was ended. -->
