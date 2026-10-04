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
| `bugs/<slug>/<slug>.zip` | the `.twinproj` zipped, because a GitHub issue does not accept a `.twinproj` attachment, with any file `repro.json`'s `attach` names, such as a `.twinpack` | no |
| `bugs/<slug>/vb6/` | optional: a VB6 project, to show what VB6 does where the entry compares it with twinBASIC: `Probe.vbp` and its `.bas`, `.cls`, `.frm` and `.ctl` files (with their `.frx` and `.ctx`), sources only, never an exe or an output | yes, byte for byte |
| `bugs/<slug>/<slug>-vb6.zip` | the source files of `vb6/` zipped, to attach beside the other zip; written only when `vb6/` exists | no |

`scripts/bug_repro.mjs` makes and checks them (the tool's page is
[Tools and Scripts](docs/Documentation/Tools.md#bug-repro)):

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
the reproducer: a `mode` of `compile`, `build`, `run`, `cli` (the compiler executable's own
command line) or `manual`, and what a reproduction looks like in `expect`, such as the exit
code of `tbbuild`, the diagnostic codes, or a regular expression the output must match.
`verify` reads it for every entry and reports `reproduces`, `NO LONGER REPRODUCES` (the bug
may be fixed on this build) or `manual`, which prints the `steps` it holds. It needs a
twinBASIC install, and is run by a person, never by a gate or by CI.

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

<!-- Manual in bugs/recent-projects-copies/repro.json because it changes the user's own registry. Stated in WIP.Harness.md (the recent-list tidy, which exists because of it) and scripts/lib/tb-registry.mjs; when fixed, the note there that a short list trips it can go. Measured 2026-09-23 on BETA 983 by reading the registry after tbbuild --keep opened a fixture project on a private desktop and the IDE was ended by its pid, and again on BETA 995 on 2026-10-01 (cli995/rec-995-*.txt). The harness trips it because every IDE a run starts opens a project: a run that began on a list of one entry once ended with seventeen copies of it. -->

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

<!-- Manual in bugs/build-and-exit-silent/repro.json: the switch belongs to the IDE executable, which opens a window, so nothing here may run on the user's desktop. Measured with a scratch copy of scripts/lib/tb-launch.ps1 (private desktop, kill-on-close job, TBBUILD_CMD replacing the command line, standard handles redirected to a file), with scripts/lib/tb-registry.mjs startTidy and finishTidy around the run. Stated in scripts/tbbuild.mjs (header comment) and WIP.Harness.md, "Do not reach for --buildAndExit32 instead": when fixed, those two say the switch is unusable. So do docs/Documentation/Tools.md (the tbbuild section) and docs/Features/Packages/Import-export tool.md ("Compiling from the command line"). All four say exit 0 only for an error in code nothing calls, and a hang for an error the build reaches. -->

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

<!-- Reproducer: bugs/preservesig-implements/ (mode compile, expects TB5004 and TB65535); verified on 995, and on 983 it differs only in the second code. Found by scripts/check_examples.mjs over Reference/Core/Interface.md, whose example declared IFoo with a [PreserveSig] member and then showed a class implementing it; the example no longer puts [PreserveSig] on a member it implements, and its description of the attribute says why. -->

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

<!-- Automated: bugs/path-limit-260/repro.json is a cli reproducer, import to a 239-character file name in the temp folder (generated, 230 f characters plus .twinproj; the temp folder's own length adds to it, so it fails whatever TEMP is). It tests the file limit only; the export side needs an existing deep folder, which the cli mode cannot create, so it is in the steps above. Stated in WIP.Harness.md (the census trusting export's exit code, the path-length remark) and scripts/census_attributes.mjs; the census now tests for ... DONE. Measured on BETA 995, the file and folder rows with the HelloWorld sample and the reproducer's project, and the input path 303 characters long. Found by the attribute census pointed at a cache folder in a deep working directory: WebView2Package and the three cefPackage versions came back ... FAILED while the other twelve packages exported. When fixed, the census can drop its ... DONE test only if exit codes become reliable too. -->

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

## `import` of a folder with no `Settings` file fails without saying why

*DEFERRED until after v1*

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

## A `Static` in a Module procedure cannot be initialised with an argument constructor of a class declared later in the project

*DEFERRED until after v1*

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

<!-- Reproducer: bugs/static-ctor-args/ (mode compile, expects TB5074); verified on 995 and on 983. Rewritten 2026-10-02: the entry used to say it did not reproduce on 983 or 995, because every earlier probe declared the class before the module; the order was found when scripts/bug_repro.mjs packed a project differently from the IDE's own import (the IDE's `import` lists files in reverse alphabetical order, scripts/impexp.mjs in alphabetical order) and the same files gave opposite results. Measured with compile probes through tbbuild, in a project of its own for each case. The title changed because it no longer describes the bug; nothing under scripts/ or test/ refers to it. docs/Reference/Core/New.md states the failure as this entry does, naming BETA 995, and tells the reader to use Set: reword it when the bug is fixed. -->

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

## Builds running at the same time in one TEMP folder sometimes fail to write the type library

*DEFERRED until after v1*

**Describe the bug**
When several twinBASIC IDEs build at the same time, and their `TEMP` is the same folder, which is the default for one user, a build now and then fails while writing the type library, with nothing wrong in the project. The same build passes when repeated, or when it runs alone. With a different `TEMP` folder for each IDE, the failure did not occur.

**To Reproduce**
Steps to reproduce the behavior:
1. Unzip `concurrent-builds-shared-temp.zip` (it holds `concurrent-builds-shared-temp.twinproj`, an ordinary console project with an empty `Sub Main`) and copy the project into eight folders, one copy each.
2. Open each copy in its own instance of the IDE, all eight running at once, with the default environment, so that every instance has the same `TEMP`.
3. Press **Build** in all eight at about the same time, and repeat. About one build in 24 fails; the DEBUG CONSOLE of the one that failed shows:
   ```
   [BUILD] Starting...
   [TYPELIB] failed to finalize typelibrary.  Disk error?
   [LINKER] FAILED to create type library
   [BUILD] failed
   ```
4. Control: start each instance with `TEMP` and `TMP` set to a folder of its own (for example from a Command Prompt, `set TEMP=C:\t\1` and `set TMP=C:\t\1`, then start the IDE from it). The failure does not occur.

Measured with the documentation's build harness, which starts each IDE on its own port and presses Build through it, eight IDEs at once, over 192 builds each way: 8 failed with one `TEMP` for all eight, and 0 failed with a `TEMP` folder for each. With one or two IDEs at once, 0 of 120 failed. Distinct project names and project ids in each copy did not prevent it. The failing build is a different one each time.

**Expected behavior**
Each build writes its type library and succeeds, however many IDEs share the `TEMP` folder.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low; the build passes when repeated, and an IDE run by a person rarely builds at the same moment as another. It affects tools that build several projects at once. The compiler imports `GetTempFileNameW`, and its messages show that it writes the type library to a file and reads it back (`[TYPELIB] failed to read in generated type library file` is the message beside this one). A temporary file name that two processes both use would explain the counts; that is an inference, not observed. The temp folder is empty after the builds, so whatever is written there is deleted.

<!-- Reproducer: bugs/concurrent-builds-shared-temp/ (mode manual: it needs several IDEs at once, which bug_repro cannot run). The measurement used the same console template with check_examples' two staging modules, not this reproducer itself: a Sonnet agent's 904 builds through tbbuild-style lanes, data in %TEMP%/claude/typelib-probe/results.jsonl (not kept), 2026-10-02, BETA 995 only; no 983 control. scripts/lib/tb-ide.mjs's launchIde gives every IDE %TEMP%/tbbuild-tmp-<port> since 7a716388, so no harness of this repository reproduces it today: to measure it again, pass TEMP and TMP to launchIde's env. When fixed, the comment in launchIde and WIP.ExamplesBuild.md's per-IDE temp folder note may say so; the folders can stay. -->

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

<!-- Reproducer: bugs/iunknown-iid-interface/ (mode run, expects tbrun exit 5, the output `ok` and the native exception); verified on 995. Stated in docs/Reference/COM-Interfaces/IUnknown.md, section "Implementing it" (the WARNING, which names BETA 995, after the paragraph that begins "A project's own Interface that carries the identifier of IUnknown also compiles"): when fixed, replace it with a NOTE saying since which build and what the compiler now does (a diagnostic, or a working call). -->

---

## A late-bound call that passes arguments and fails is issued a second time, without them

**Describe the bug**
When a late-bound call that passes arguments fails, twinBASIC calls `Invoke` a second time, as a property read (`wFlags` 3) with no arguments. A `Sub` called with an argument it does not take therefore runs twice before error 13 is raised, a failed property assignment runs the property's `Property Get` afterwards, and the error the caller sees is replaced. Observed in a run of the reproducer project, and with `Invoke` implemented by a class that records its calls.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `latebound-call-retried.twinproj` (attached as `latebound-call-retried.zip`). Its one source file, `Startup.twin`, holds a class and `Sub Main`. `Widget` has `Sub Hello()`, which counts how often it runs, and a `Property Let Prop` that raises error 5 beside a `Property Get Prop` that counts how often it runs.
2. Run it. `Main` calls `o.Hello 1` and `o.Prop = 1` through `Dim o As Object = New Widget`, with `On Error Resume Next`, and prints the error and the counts after each:
   ```
   o.Hello 1: error 13, ran 2 time(s), Property Get ran 0
   o.Boom 1: error 5, ran 1 time(s), Property Get ran 0
   x = o.BoomFn(1): error 5, ran 1 time(s), Property Get ran 0
   o.Prop = 1: error -2147352567, ran 1 time(s), Property Get ran 1
   w.Boom 1 (early bound): error 5, ran 1 time(s), Property Get ran 0
   ```
3. See `Hello` run twice, and `Property Get Prop` run after the `Property Let` that failed. The error from the assignment is `&H80020009` (`DISP_E_EXCEPTION`) where the `Property Let` raised 5.
4. To see the second call, implement `IDispatch` in a `NotDispatchable` class (see `bugs/callbyname-membernotfound-retried/`, which has one, and whose `Invoke` can return another code) whose `Invoke` prints `wFlags`, `pDispParams.cArgs` and whether `pVarResult` is null, and returns a failure code. With `Fail3` returning `DISP_E_TYPEMISMATCH` and `Fail5` raising error 5:
   ```
   o.Fail3 1      Invoke flags=1 cArgs=1 result=null, then Invoke flags=3 cArgs=0 result=set
   o.Fail3 = 5    Invoke flags=4 cArgs=1 result=null, then Invoke flags=3 cArgs=0 result=set
   o.Fail5 = 5    Invoke flags=4 cArgs=1 result=null, then Invoke flags=3 cArgs=0 result=set
   Set o.Fail1 = e   Invoke flags=8 cArgs=1 result=null, then Invoke flags=3 cArgs=0 result=set
   ```

**Expected behavior**
One `Invoke` per late-bound call, as a raw `Invoke` does: calling `Invoke` directly with the same argument runs `Hello` once and returns `DISP_E_TYPEMISMATCH`. In VB6 the same two statements fail without running anything the callee counts: `o.Hello 1` raises error 450, *Wrong number of arguments or invalid property assignment*, with `Hello` run 0 times, and `o.Prop = 1` raises error 5 from the `Property Let` with the `Property Get` run 0 times. The VB6 project is attached as `latebound-call-retried-vb6.zip`; it prints `o.Hello 1 -> error 450 (1C2) [Wrong number of arguments or invalid property assignment]` with `Hits=0`, and `o.Prop = 1 -> error 5 (5) [Invalid procedure call or argument]` with `Hits=1 Gets=0` (the one run is the `Property Let`). At the least a failed call must not run the callee again, and the error of the assignment must be the one the `Property Let` raised.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: a late-bound call with a wrong argument count has side effects twice, and a late-bound property assignment that fails calls the getter, which may be expensive or have effects of its own.

What does not reproduce it: a statement with no arguments (`o.Fail3`, `o.Hello`, `x = o.Fail3`); a statement that raises from inside the callee (`o.Boom 1` and `x = o.BoomFn(1)` run once and keep error 5); `CallByName` with an argument, for every call type (one `Invoke`); a call that succeeds; early-bound calls. What does reproduce it: `o.Hello 1`, `o.Hello(1)`, `o.Hello 1, 2`, the same through a `Variant` holding the object, and `o.Fn 1` for a `Function` with no parameters (ran twice, error 13). An assignment is repeated whatever the failure was (`DISP_E_TYPEMISMATCH`, `DISP_E_MEMBERNOTFOUND`, `E_FAIL`, an error raised by the setter); a statement call is repeated after `DISP_E_TYPEMISMATCH`, but not after an error raised in the callee.

The second call resembles VB's rule for `o.Member(args)` on a property that returns an object or a collection: read the property with no arguments, then apply the arguments to the result. It is applied after a failure of any call that has arguments. The single run of `Hello` in the raw `Invoke` case is also at odds with the COM contract, which gives `DISP_E_BADPARAMCOUNT` for too many arguments without running the member; it is left out of this entry.

<!-- Reproducer: bugs/latebound-call-retried/ (mode run, expects the Hello and Prop lines above); verified on 995. VB6 side in bugs/latebound-call-retried/vb6/ (o.Hello 1 -> 450 and Hits=0; o.Prop = 1 -> 5 and Gets=0). Stated in docs/Reference/COM-Interfaces/IDispatch.md, the second callout under "Errors from a late-bound call", a WARNING naming BETA 995 (a call that fails inside Invoke can be made twice) and the first row of the table under "Classes written in twinBASIC" in the same page. When fixed, reduce that NOTE to the CallByName part (see callbyname-membernotfound-retried), or delete it, and remove the sentence about "a late-bound statement does this twice". The Property Get run and the replaced error number are not on the page yet. -->

---

## `CallByName` calls `Invoke` a second time, with no result, when the first call returns DISP_E_MEMBERNOTFOUND

**Describe the bug**
`CallByName` on an object whose `IDispatch.Invoke` returns `DISP_E_MEMBERNOTFOUND` calls `Invoke` twice: first with a result variant (`pVarResult` supplied), then again with the same identifier and flags and a null `pVarResult`. A late-bound statement for the same member, `o.Anything`, calls it once. Seen with a class that implements `IDispatch` itself and counts the calls.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `callbyname-membernotfound-retried.twinproj` (attached as `callbyname-membernotfound-retried.zip`). Its one source file, `Startup.twin`, declares a copy of `IDispatch` (the `stdole` one cannot be called) and a `NotDispatchable` class `Recorder` that implements it. Its `GetIDsOfNames` returns 1 for any name, and its `Invoke` prints its `wFlags`, says whether `pVarResult` is null, counts the call, and returns `DISP_E_MEMBERNOTFOUND` with `Err.ReturnHResult`.
2. Run it. `Main` calls `CallByName o, "Anything", vbMethod` and then `o.Anything`, with `On Error Resume Next`, through `Dim o As Object = New Recorder`:
   ```
       Invoke 1: wFlags 1, result supplied
       Invoke 2: wFlags 1, result null
   CallByName: error 438, Invoke called 2 time(s)
       Invoke 1: wFlags 1, result null
   o.Anything: error 438, Invoke called 1 time(s)
   ```

**Expected behavior**
One `Invoke` per `CallByName`, as for the statement form. A method that did its work and then reported `DISP_E_MEMBERNOTFOUND` (a scripting host whose members are resolved inside `Invoke` is an example) runs again, and a call with arguments and side effects is repeated.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low. It only shows with an `IDispatch` that returns `DISP_E_MEMBERNOTFOUND` after doing work.

What does not reproduce it: `CallByName` with `vbGet` or `vbLet` against `DISP_E_TYPEMISMATCH`, `DISP_E_BADPARAMCOUNT`, `E_FAIL`, an error raised in `Invoke`, or success (one `Invoke` each); `Invoke` returning `DISP_E_MEMBERNOTFOUND` to a late-bound statement or to `x = o.Member` (one `Invoke` each). `vbGet`, `vbMethod` and `vbLet` all repeat after `DISP_E_MEMBERNOTFOUND`.

A separate behaviour, in its own entry, repeats a failed late-bound statement that passes arguments as a property read: see the entry "A late-bound call that passes arguments and fails is issued a second time, without them". The two are not the same: that one is for calls with arguments and needs no `DISP_E_MEMBERNOTFOUND`, and this one is `CallByName` with or without arguments.

<!-- Reproducer: bugs/callbyname-membernotfound-retried/ (mode run, expects the two count lines above); verified on 995. Stated in docs/Reference/COM-Interfaces/IDispatch.md, the second callout under "Errors from a late-bound call", a WARNING naming BETA 995: its sentence "CallByName repeats a call that returned DISP_E_MEMBERNOTFOUND with a null pVarResult". When fixed, remove that sentence (the other half of the NOTE is the entry on late-bound calls with arguments). The flags 1/2/4 combinations come from the probe in s71/idispatch/tb6, a local scratch file that is not in the repository. -->

---

## A late-bound call to a member that does not exist raises &H80020006, and `CallByName` raises &H80004005, where VB6 raises 438

**Describe the bug**
Calling a member that an object does not have, through an `Object` variable, raises error `&H80020006` (`DISP_E_UNKNOWNNAME`, *Unknown name.*) instead of 438, *Object doesn't support this property or method*. `CallByName` with the same name raises `&H80004005`, *Unspecified error*. An `On Error` handler written for VB6 or VBA, which tests for 438, does not catch either. Observed in a run of the reproducer project.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `latebound-unknown-member-error.twinproj` (attached as `latebound-unknown-member-error.zip`). Its one source file, `Startup.twin`, holds a class `Widget` with a `Sub Hello()` and a `Sub Main` that calls members through `Object` variables, with `On Error Resume Next`.
2. Run it and read the DEBUG CONSOLE:
   ```
   o.Nope -> error -2147352570 (80020006) [Unknown name.]
   Collection.Nope -> error -2147352570 (80020006) [Unknown name.]
   CallByName o, Nope -> error -2147467259 (80004005) [Unspecified error]
   o.Hello (control) -> error 0 (0) []
   ```

**Expected behavior**
Error 438 for all three, as in VB6 and VBA. The same cases in a VB6 project (a class, a `Variant` holding it, a `Collection`, a `Scripting.Dictionary`, and `CallByName` on each of them), attached as `latebound-unknown-member-error-vb6.zip`:
```
o.Nope (class) -> error 438 (1B6) [Object doesn't support this property or method]
v.Nope (class in a Variant) -> error 438 (1B6) [Object doesn't support this property or method]
Collection.Nope -> error 438 (1B6) [Object doesn't support this property or method]
Dictionary.Nope -> error 438 (1B6) [Object doesn't support this property or method]
CallByName class Nope -> error 438 (1B6) [Object doesn't support this property or method]
CallByName Dictionary Nope -> error 438 (1B6) [Object doesn't support this property or method]
CallByName Collection Nope -> error 438 (1B6) [Object doesn't support this property or method]
```
twinBASIC already maps `DISP_E_MEMBERNOTFOUND` from `Invoke` to 438; `DISP_E_UNKNOWNNAME` from `GetIDsOfNames`, which is the answer for a name the object does not have, should be mapped the same way, and `CallByName` should not turn it into `E_FAIL`.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: code ported from VB6 or VBA that probes an object for a member with `On Error` and 438 stops working, and the message names a COM code instead of the problem.

The twinBASIC class's `GetIDsOfNames` itself is right: it returns `DISP_E_UNKNOWNNAME` for a name it does not know, as the contract says; the conversion into a run-time error is what differs. The same `&H80020006` came from a twinBASIC class, a `Collection`, a `Scripting.Dictionary` and a `Scripting.FileSystemObject`, and a `Variant` holding an object; `CallByName` gave `&H80004005` for a twinBASIC class and a `Dictionary`. Other failures are mapped as VB6 does: a call that `Invoke` rejects with `DISP_E_MEMBERNOTFOUND` raises 438, and a `Nothing` object raises 91.

<!-- Reproducer: bugs/latebound-unknown-member-error/ (mode run, expects the three lines above); verified on 995. VB6 output from bugs/latebound-unknown-member-error/vb6/ (VB6 6.0, Probe.exe). Stated in docs/Reference/COM-Interfaces/IDispatch.md, the first two rows of the table under "Errors from a late-bound call" and the first NOTE below it (In VBA an unknown member raises error 438); when fixed, delete the rows and the NOTE, and check docs/Reference/Default/VBA/Interaction/CallByName.md, which does not mention either code today, and anywhere else that lists the errors CallByName raises. -->

---

## Calling a method of `stdole.IDispatch` is a late-bound call by name and fails with &H80020006

**Describe the bug**
A variable declared `As stdole.IDispatch` does not call the four `IDispatch` methods through the interface. `d.GetTypeInfoCount count` is compiled as a late-bound call: the compiler accepts any arguments, whatever their number and type, and at run time the call looks `GetTypeInfoCount` up by name in the object, which does not have it, and raises `&H80020006` (*Unknown name.*). With no error handler the error ends the run (in the IDE's run, with no message). A call of `GetTypeInfo`, `GetIDsOfNames` or `Invoke` ends the run the same way when unhandled. Members of the object itself can be called through the variable, as through an `Object`.

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
   d.GetTypeInfoCount: error -2147352570 (80020006) Unknown name.
   d.GetTypeInfoCount "a", "b", "c": error -2147352570
   d.NoSuchMethod: error -2147352570
   ```
3. Remove the `On Error Resume Next` line and run again: the output stops at the first `d.GetTypeInfoCount`, and the run ends with no message.

**Expected behavior**
The call goes through the interface: `GetTypeInfoCount` returns the count (1 for a twinBASIC class), and a wrong number or type of argument is a compile error, as for any other interface method. If `stdole.IDispatch` is meant to be an alias of `Object`, `d.GetTypeInfoCount` should still not compile, or the type should not list four methods that cannot be called. A project's own declaration of the interface, with the same `[InterfaceId]`, calls them correctly.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low, since a project can declare its own copy of the interface, but the failure is silent without a handler and the compiler gives no sign that the call is not what it appears to be.

What was tried: `GetIDsOfNames` and `Invoke` with zero arguments, and `GetTypeInfo` with a null pointer, each end the run the same way; calls with arguments of the wrong type compile (`d.GetTypeInfoCount "a"`, `d.GetTypeInfo "a", "b", "c"`, `d.Invoke "a", "b", "c", "d", "e", "f", "g", "h"` all compile). An unhandled `Err.Raise 5` in the same harness ends the run the same way, so the silent end is how an unhandled error shows there, not a separate fault. Running the built exe with `--exe` was not possible on this machine (the harness could not start it).

<!-- Reproducer: bugs/stdole-idispatch-late-bound/ (mode run, expects the Hello and GetTypeInfoCount lines above); verified on 995. Stated in docs/Reference/COM-Interfaces/IDispatch.md, "The stdole declaration". That paragraph says calling GetTypeInfoCount "ends the run" and that the arguments are not checked because twinBASIC has no type for them; the cause is that the call is late-bound, and the run ends only for lack of an error handler, so reword it now whether or not this is fixed. When fixed, say that stdole.IDispatch can be called, and drop the advice to declare a copy (the Declaration section's "The declaration in stdole is no use" sentence too). -->

---

## A twinBASIC class's `GetTypeInfo` with an `iTInfo` of 1 returns E_UNEXPECTED, not DISP_E_BADINDEX

**Describe the bug**
`IDispatch::GetTypeInfo` on an object of a twinBASIC class returns `E_UNEXPECTED` (`&H8000FFFF`) for any `iTInfo` other than 0. The object's `GetTypeInfoCount` returns 1, so 0 is the only valid index, and the contract gives `DISP_E_BADINDEX` for a bad one. Observed in a run of the reproducer project, calling the method through a project's own declaration of the interface.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `gettypeinfo-badindex.twinproj` (attached as `gettypeinfo-badindex.zip`). Its one source file, `Startup.twin`, declares a copy of `IDispatch` with the same `[InterfaceId]` (the `stdole` declaration cannot be called), a class `Widget` with one `Sub`, and a `Sub Main` that calls `GetTypeInfoCount` and `GetTypeInfo` on a `Widget` through the copy.
2. Run it and read the DEBUG CONSOLE:
   ```
   GetTypeInfoCount = 1
   GetTypeInfo(0): HRESULT 0, pointer returned True
   GetTypeInfo(1): HRESULT 8000FFFF, error -2147418113, pointer returned False
   GetTypeInfo(2): HRESULT 8000FFFF, error -2147418113, pointer returned False
   GetTypeInfo(-1): HRESULT 8000FFFF, error -2147418113
   ```

**Expected behavior**
`DISP_E_BADINDEX` (`&H8002000B`), which the `IDispatch::GetTypeInfo` documentation gives for an index that is not valid, for an index the object does not have. `E_UNEXPECTED` (*Catastrophic failure*) is the code for a call made at a time when the object cannot take it, and it reads as a fault in the object.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: minor. A caller that checks for `DISP_E_BADINDEX` to learn that an object has no more type information gets a different code; `GetTypeInfo(0)` and `GetTypeInfoCount` are right.

<!-- Reproducer: bugs/gettypeinfo-badindex/ (mode run, expects the GetTypeInfo(0) and GetTypeInfo(1) lines above); verified on 995. Stated in docs/Reference/COM-Interfaces/IDispatch.md, the GetTypeInfo section ("For 1 it fails with E_UNEXPECTED ..., not with DISP_E_BADINDEX"); when fixed, say that it fails with DISP_E_BADINDEX. -->

---

## `Err.Raise` without a source or a description leaves `Source` empty, and the defaults are not VBA's

**Describe the bug**
`Err.Raise` called with only a number leaves `Err.Source` empty, where VBA and VB6 set it to the name of the project. It gives `Err.Description` an empty string for numbers such as 1, 95, 99 and 513, where VBA gives `Application-defined or object-defined error`, and `Automation error` for numbers from 1000 up, where VBA gives the same generic text. And an omitted argument no longer keeps the value an earlier `Err.Raise` left, which VBA-Docs describes for `Raise`. Observed in a run of the reproducer project, in the IDE and in a built exe alike.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `err-raise-defaults.twinproj` (attached as `err-raise-defaults.zip`) and run it (F5). Its `Sub Main` raises with `On Error Resume Next` and prints `[Err.Source] [Err.Description]` after each call, calling `Err.Clear` first except in the last case:
   ```
   Err.Raise 5
   Err.Raise 1
   Err.Raise 513
   Err.Raise 1000
   Err.Raise 1000, "A.Src", "B desc"
   Err.Raise 5
   ```
2. See, beside what the same program prints when built in VB6 (the VB6 project is attached as `err-raise-defaults-vb6.zip`):

   | call | twinBASIC | VB6 |
   |---|---|---|
   | `Err.Raise 5` | `[] [Invalid procedure call or argument]` | `[Probe] [Invalid procedure call or argument]` |
   | `Err.Raise 1` | `[] []` | `[Probe] [Application-defined or object-defined error]` |
   | `Err.Raise 513` | `[] []` | `[Probe] [Application-defined or object-defined error]` |
   | `Err.Raise 1000` | `[] [Automation error]` | `[Probe] [Application-defined or object-defined error]` |
   | `Err.Raise 5` after a full `Err.Raise 1000, "A.Src", "B desc"`, no `Err.Clear` between | `[] [Invalid procedure call or argument]` | `[A.Src] [B desc]` |

   The rule for the description, from a sweep of every number from 0 to 65537: a number with a built-in message (5, 11, 13 and 84 others, the ones `Error$` knows) gets that message, as in VBA. A number from 1 to 746 without one gets an empty string. A number from 747 up gets the Windows system message for that number when there is one (1001 gives `Recursion too deep; the stack overflowed.`, 15861 a licensing message) and `Automation error` when there is none. A negative number is looked up as an `HRESULT` the same way (`vbObjectError + 1` gives `Invalid advise flags`, `vbObjectError + 513` gives `An event was unable to invoke any of the subscribers`, `vbObjectError + 1000` gives `Automation error`). `Error$(n)` and the `Error n` statement give VBA's generic text for all of these.

**Expected behavior**
What VBA-Docs states for `Err.Raise`, which VB6 does as well: `Source` is the programmatic ID of the project when *source* is omitted; *description* is the message of the built-in error, or `Application-defined or object-defined error` when there is none; and an omitted argument is taken from the properties of `Err` when they still hold an earlier error's values. A program that reads `Err.Source` to find where an error came from, or tests `Err.Description <> ""`, behaves differently without any diagnostic.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low for a program that passes all the arguments; for one that does not, `Err.Source` and `Err.Description` are not what the VBA code it was ported from expects. The result is the same for an error raised in a method of a class and read by its caller, apart from an empty description, which arrives as `Application-defined or object-defined error` there. It is also the same in a built exe.

Related and also different from VB6: `Err.Raise 65536` is accepted, and `Err.Number` is 65536, where VB6 raises error 5. `Err.Raise 0` raises error 5 in both. An explicit empty string for the source or the description gives an empty `Source` or `Description`, in VB6 as well. `Err.HelpContext` is 0 in twinBASIC, and VB6 sets it to 1000000 plus the number for a `Raise` without one (`1000005` for 5).

<!-- Reproducer: bugs/err-raise-defaults/ (mode run, expects the five lines above in twinBASIC); verified on 995. VB6 side from the same program, in bugs/err-raise-defaults/vb6/; the full sweep and the per-number lists are in s71/raise/ (out-tb-995.txt, out-vb6.txt, analyze.mjs), local scratch files that are not in the repository. Stated in docs/Reference/Default/VBA/ErrObject/Raise.md (the table under *description* and the WARNING after it, which names BETA 995, plus the check_run sample), in Source.md (the WARNING) and in Description.md (the WARNING); docs/Reference/COM-Interfaces/IErrorInfo.md says GetSource returns an empty string and GetDescription the standard text when Raise gets neither. When fixed, replace those WARNINGs with NOTEs saying since which build, delete the table, restore the sentences about the project's programmatic ID, the generic message and the carried-over values, and rewrite the sample's expected output. docs/Reference/Default/VBRUN/ErrorContext/index.md says Source is the project name for errors raised inside a project; that is not what Err.Source holds and should be checked when this is fixed. -->

---

## The error information twinBASIC leaves in the thread's slot reads from `Err` as it is later, and stays there after the error is handled

**Describe the bug**
After an `Err.Raise` that is handled, the calling thread's `IErrorInfo` slot holds one object that reads its five values from `Err` each time a method of it is called, and nothing takes it out of the slot. After `Err.Clear` it returns empty strings, and after the next `Err.Raise` it returns the new error's values, where the COM contract has an `IErrorInfo` keep what was stored in it. And `GetErrorInfo` finds the object even when the error was handled in twinBASIC code that never reads the slot, where it should find the slot empty, so a later failure that carries no error information is described by whatever `Err` holds at that moment. Observed in a run of the reproducer project, which uses no class and no interface for the first symptom.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `err-info-live-view.twinproj` (attached as `err-info-live-view.zip`) and run it (F5). It declares `IErrorInfo` and `GetErrorInfo` and, under `On Error Resume Next`, prints:
   ```
   read at once: [My.Source] [My description]
   after Err.Clear: [] []
   Err after the call: -2147220270 [My description]
   slot afterwards: [My.Source] [My description]
   E_FAIL after the cleared error: -2147467259 [Unspecified error]
   E_FAIL, slot emptied first: -2147467259 [Automation error]
   ```
2. The first two lines come from `Err.Raise vbObjectError + 1234, "My.Source", "My description"`, then `GetErrorInfo 0, info`, one read of `info.GetSource()` and `info.GetDescription()`, then `Err.Clear` and a second read of the same `info`. The second read returns empty strings.
3. The third and fourth lines: a method of a class, called through an interface, raises the same error; the caller handles it and reads `Err`, then calls `GetErrorInfo`. It returns an object, with the values `Err` holds, although the caller already has the error in `Err` and nothing should be left to read (a second `GetErrorInfo` then returns `S_FALSE`).
4. The last two lines: a method that fails with `Err.ReturnHResult = &H80004005` and sets no error information. When the call comes after a raised error that the program has cleared with `Err.Clear`, `Err.Description` is `Unspecified error`, the system text for an empty description; after the slot has been emptied with `GetErrorInfo`, it is `Automation error`, the text twinBASIC uses for a failure that carries no information.

**Expected behavior**
`IErrorInfo` holds the values it was given, as an object made with `CreateErrorInfo` does: a read after `Err.Clear` or after another error returns the first error's source and description. A handled error leaves the slot empty, as in VB6 (the same sequence, with an `Err.Raise 5` handled in the procedure, and with a raise in a class method handled by the caller, finds `GetErrorInfo` returning `S_FALSE` and no object), so that `Err.Description` of a later failure does not depend on what ran before. The failure with no information should always give the same description. The VB6 project is attached as `err-info-live-view-vb6.zip`; it prints `empty (GetErrorInfo 1)` for the slot on a fresh thread, after an `Err.Raise 5` handled in the procedure, after a class method that raised an error the caller handled (`Err` then holds `-2147220270 [Something failed on purpose] [Probe.Subject]`), and after a class method that handled its own error.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
The two symptoms are one bug because the object is the same: `ObjPtr` of what `GetErrorInfo` returns is identical after an `Err.Raise` handled in the same procedure, after a failed call through an interface, after a failure with `SetErrorInfo` plus `Err.ReturnHResult`, and after a call that handled its own error, and it is not `Err` itself. One object, installed in the slot whenever an error occurs or a failure is processed and reading `Err`, accounts for both. They can be fixed apart: a snapshot object would fix the first, and withdrawing the object once the error is delivered, the second.

What does not reproduce it: a fresh thread (`GetErrorInfo` returns `S_FALSE`); a caller that makes the call through an interface whose methods are declared `[PreserveSig]` and reads the slot itself, where the first `GetErrorInfo` returns the values and the second returns `S_FALSE`; the second `GetErrorInfo` after the object has been read from the slot (it returns `S_FALSE`, so `GetErrorInfo` does empty the slot).
Severity: low. The slot is not a documented twinBASIC interface, but a program that reads error information with the COM functions, or a library that does, sees values that change under it, and a program cannot rely on the description of a failure that came with no error information.

<!-- Reproducer: bugs/err-info-live-view/ (mode run, expects the lines above); verified on 995. The VB6 slot results (empty after Err.Raise 5 in the procedure, after a raise in a class method handled by the caller, and after a class method that handled its own error) are from bugs/err-info-live-view/vb6/; the full set of probes (T1 to T10, with ObjPtr) is in s71/liveview/, a local scratch folder that is not in the repository. Stated in docs/Reference/COM-Interfaces/IErrorInfo.md, in two WARNINGs that name BETA 995: the one after "**GetErrorInfo** empties the slot" in *A method that raises an error*, and the one that begins "the slot is not always empty" under *A failure with no error information*. When fixed, replace each with a NOTE saying since which build, or delete it; the table of Automation error and the `emptySlot` samples need no change except the sentence about a stale object. -->

---

## `IConnectionPoint.Advise(Nothing)` on a twinBASIC class's connection point ends in an access violation

**Describe the bug**
A class that declares an `Event` is a connectable object, and its connection point is reached through `IConnectionPointContainer`. Calling `Advise` on that connection point with a null sink raises a native `ACCESS_VIOLATION` and ends the run, instead of returning an error. It is the same crash whether the argument is `Nothing` or an unassigned `stdole.IUnknown` variable.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `advise-nothing-crashes.twinproj` (attached as `advise-nothing-crashes.zip`). Its one source file, `Startup.twin`, declares the project's own copies of `IConnectionPointContainer`, `IEnumConnectionPoints` and `IConnectionPoint` (`stdole` has none of them), a class with one event, and this:
   ```
   Private Class Source
       Public Event Ping()
   End Class

   Public Sub Main()
       Dim src As New Source
       Dim container As IConnectionPointContainer = src
       Dim points As IEnumConnectionPoints = container.EnumConnectionPoints()
       Dim point As IConnectionPoint, fetched As Long
       points.Next 1, point, fetched
       Debug.Print "before"
       Dim cookie As Long = point.Advise(Nothing)
       Debug.Print "after " & cookie
   End Sub
   ```
2. Run the project in the IDE (F5).
3. See `before` in the DEBUG CONSOLE, and then `NATIVE EXCEPTION: ACCESS_VIOLATION /Startup.twin; Startup.Main LINE 000033 [...twinBASIC_win32.dll+00389F3E]`. `after` is never printed.

**Expected behavior**
`Advise` returns `E_POINTER`, which twinBASIC raises as run-time error `&H80004003` that `On Error` can handle. The Windows SDK page for [IConnectionPoint::Advise](https://learn.microsoft.com/en-us/windows/win32/api/ocidl/nf-ocidl-iconnectionpoint-advise) lists `E_POINTER` for "The value in *pUnkSink* or *pdwCookie* is not valid. For example, either pointer may be **NULL**."

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low in practice, since a program rarely advises a null sink, but a COM client written in any language can send one, and the connection point crashes the process that hosts the class instead of refusing the call.

What was tried: an object that is not a sink gives an ordinary error (`E_NOINTERFACE`, `&H80004002`, see the entry about `Advise` and `Unadvise` error codes), so only a null pointer crashes. The address of the crash is the same in the standalone probe and in this project.

<!-- Reproducer: bugs/advise-nothing-crashes/ (mode run, expects tbrun exit 5, the output `before` and the native exception); verified on 995. Stated in docs/Reference/COM-Interfaces/IConnectionPoint.md, section Advise, the last bullet of "In twinBASIC" and the WARNING after it, which names BETA 995 ("Advise with Nothing as the sink ends the program with an access violation"): when fixed, replace the WARNING with a NOTE saying since which build and what error it raises, and add Nothing to the example if it fits. -->

---

## `Advise` with a sink that lacks the outgoing interface fails with `E_NOINTERFACE`, and `Unadvise` with a cookie that names no connection succeeds

**Describe the bug**
On the connection point of a twinBASIC class that has an `Event`, two calls return a different code from the one the COM contract names. `Advise` with a sink that does not answer `QueryInterface` for the outgoing interface fails with `E_NOINTERFACE` (`&H80004002`), where the contract returns `CONNECT_E_CANNOTCONNECT` (`&H80040201`). `Unadvise` with a cookie that names no connection (0 and 99 were tried) succeeds silently and does nothing, where the contract returns an error.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `advise-unadvise-hresults.twinproj` (attached as `advise-unadvise-hresults.zip`). Its one source file, `Startup.twin`, declares the project's own copies of the connection-point interfaces (`stdole` has none of them), a class `Source` with one event, and a class `NotASink` with one field. `Sub Main` runs, with `On Error Resume Next`:
   ```
   cookie = point.Advise(sink)    ' sink is a NotASink
   point.Unadvise 0
   point.Unadvise 99
   ```
2. Run the project in the IDE (F5).
3. See in the DEBUG CONSOLE:
   ```
   Advise, a sink without the outgoing interface: error=80004002
   Unadvise 0: error=0
   Unadvise 99: error=0
   ```

**Expected behavior**
`Advise` fails with `CONNECT_E_CANNOTCONNECT`. The Windows SDK page for [IConnectionPoint::Advise](https://learn.microsoft.com/en-us/windows/win32/api/ocidl/nf-ocidl-iconnectionpoint-advise) lists it as "The sink does not support the interface required by this connection point", and says to implementers: "The connection point must query the *pUnkSink* pointer for the correct outgoing interface. If this query fails, this method must return CONNECT_E_CANNOTCONNECT." `Unadvise` reports the bad cookie: the page for [IConnectionPoint::Unadvise](https://learn.microsoft.com/en-us/windows/win32/api/ocidl/nf-ocidl-iconnectionpoint-unadvise) lists `E_POINTER` for "The value in *dwCookie* does not represent a valid connection". It is not `S_OK`.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low. A client that tests for `CONNECT_E_CANNOTCONNECT` to tell a refused sink from other failures never sees it, and a client that releases a connection twice, or with a wrong cookie, is told it worked.

What was tried: a sink that is an ordinary twinBASIC class gives the same `E_NOINTERFACE` whether it has no members or implements `IDispatch` (the outgoing interface's identifier is generated for each build, so a twinBASIC class cannot answer for it). Nothing is connected afterwards, and no event reaches the sink. Calling `Unadvise` a second time with the cookie of the failed `Advise`, which is 0, also returns without an error.
<!-- Reproducer: bugs/advise-unadvise-hresults/ (mode run, expects tbrun exit 0 and the three lines above); verified on 995. Stated in docs/Reference/COM-Interfaces/IConnectionPoint.md, sections Advise (the second bullet of "In twinBASIC") and Unadvise (the WARNING, which names BETA 995, about a cookie that names no connection) and the last example, whose comments show 80004002 and 0: when fixed, replace the WARNING with a NOTE saying since which build, and change the rest. When the page is updated, state the code twinBASIC returns for a bad cookie. -->

---

## `New` on an `Interface` compiles, and a call on the object returns a default value, or ends in an access violation for an inherited member

**Describe the bug**
`New` is accepted on an `Interface`, although no class exists for it, and the statement returns an object that is not `Nothing` and has no implementation behind its members. A call on a member the interface declares itself returns the default for its type (0 for a `Long`, an empty string, `Nothing` for an interface) and raises no error. A call on a member the interface inherits from another `Interface` ends the run with a native `ACCESS_VIOLATION`. `New stdole.IUnknown` and `New stdole.IDispatch` are refused with TB5074 (*Class construction expected class datatype*), so the check exists for an interface from a type library, and is missing for one declared in twinBASIC source, in a project or a package. Observed in a run of the reproducer project; found with `ErrorContext` of the VBRUN package, an interface with no class, and `ErrorCallstack` does the same.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `new-on-interface.twinproj` (attached as `new-on-interface.zip`). Its one source file, `Startup.twin`, declares `Interface IParent` with one `Function F() As Long` and `Interface IChild Extends IParent` with one `Function G() As Long`, and a `Sub Main` that constructs `New IParent`, `New ErrorContext` and `New IChild` and calls their members.
2. Run it (F5) and read the DEBUG CONSOLE:
   ```
   IParent: Nothing? False, F() = 0
   ErrorContext: Unknown, Number = 0, Callstack Nothing? True
   IChild.G() = 0
   IChild.F(), inherited, next
   NATIVE EXCEPTION: ACCESS_VIOLATION /Startup.twin; Startup.Main LINE 000029 [$00000000]
   ```
   The project compiles without a diagnostic. `ObjPtr` of each object is not 0. `ErrorContext.Number` and `.State` read 0, `.Description` and `.Source` read an empty string, and `.Callstack` is `Nothing`, so `e.Callstack.Count` raises error 91, as any call on `Nothing` does. That error 91 is not a second defect: an unhandled one ends a run, as it does for a `Collection` variable that is `Nothing`, and under `On Error Resume Next` it skips the statement.

**Expected behavior**
A compile error, TB5074, for `New` on any `Interface`, as for `stdole.IUnknown`: an interface is a contract, and `New` needs a class that implements it. If an object is built nevertheless, a call on any of its members should behave the same way, not return a default for one member and crash on another. Code written against the VBRUN documentation, which lists `ErrorContext` with its members, compiles and then reads zeros, where a refusal would say at once that nothing can create the object.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low in practice, since few programs write `New` on an interface, but it is a compile-time check that is missing, and the result is a silent wrong value or a crash.

What was tried, each in a project of its own: `New` is accepted on an interface declared with `Extends stdole.IUnknown`, with no `Extends`, with `Extends stdole.IDispatch`, with `Extends` another interface of the project, and on a `Private` one, and `Dim x As New IFoo` is accepted as well. `TypeName` gives `Unknown` for an interface that extends `stdole.IUnknown` (and for `ErrorContext` and `ErrorCallstack`), and the interface's own name for one with no `Extends` or with `Extends stdole.IDispatch`. A `String` member returns an empty string, a `Property Get` returns 0, a `Sub` returns without a sign, and a member returning the interface itself returns `Nothing`. Only inherited members crash. `New stdole.IUnknown` and `New stdole.IDispatch` are refused. The same results on BETA 983.

VB6 has no comparison: a project cannot declare an `Interface`, and the interfaces of the type libraries it references (`stdole.IUnknown`, `IPictureDisp`, `IFontDisp`) are hidden from it (*User-defined type not defined*).

<!-- Reproducer: bugs/new-on-interface/ (mode run, expects tbrun exit 5, the four lines above and the native exception); verified on 995. Probes from the narrowing are local scratch files, not in the repository. docs/Reference/Default/VBRUN/ErrorContext/index.md, ErrorCallstack/index.md and ErrorStackFrame/index.md carry a NOTE that no code can obtain these objects in BETA 995 ("code that uses them compiles, but nothing returns an object that implements them"); when this is fixed, check that wording, since `New` on them compiles today and returns an object that has no implementation. -->

---

## Clear All Breakpoints is undone by restarting the compiler, unless the project was saved in between

**Describe the bug**
Breakpoints removed with **Debug > Clear All Breakpoints** come back when the compiler restarts. After **Restart the compiler** on the toolbar the margin shows them again, as they were just before they were cleared, and the next run stops at them. A breakpoint removed with F9 stays removed, and saving the project between the two keeps the effect of **Clear All Breakpoints**.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `clear-all-breakpoints-restart.twinproj` (attached as `clear-all-breakpoints-restart.zip`) and open `Startup.twin`. `Main` prints three lines:
   ```
   Public Sub Main()
       Debug.Print "main start"
       Debug.Print "the breakpoint's line" ' BREAK
       Debug.Print "main end"
   End Sub
   ```
2. Put the cursor on the line marked `BREAK` and press F9. A breakpoint appears in the margin.
3. Choose **Debug > Clear All Breakpoints** (Ctrl+Shift+F9). The breakpoint goes.
4. Click **Restart the compiler** on the toolbar, and wait for the compile to end. The breakpoint is back in the margin.
5. Press F5. The run stops at the breakpoint, having printed only `main start`.

**Expected behavior**
Breakpoints cleared with **Clear All Breakpoints** stay cleared, as a breakpoint removed with F9 does: after the restart the margin shows none, and F5 prints all three lines.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 987, identically.

What does not reproduce it: removing the breakpoint with F9 instead, which stays removed across the restart; and saving the project (Ctrl+S) after **Clear All Breakpoints** and before the restart, which keeps them cleared. A breakpoint saved with the project survives a restart, as it should. Not tried: whether the IDE's other ways of starting a new compiler, such as switching between win32 and win64, do the same.

Where it seems to come from, in BETA 995's `ide/main.js`: F9 records each change in `g_SessionFilesystemTransactions`, which the IDE replays into a new compiler and which a save empties; **Clear All Breakpoints** (`tbDebug_BreakpointsClear`) clears the breakpoints in the compiler and records nothing there, so the replay sets them again.

Severity: breakpoints a person has removed stop the program again after a restart, with nothing to connect the two.

<!-- Asserted by `ide-test.bat --only breakpoints` (test/ide/breakpoints.test.mjs: the fault, then F9, saving after Clear All, and a saved breakpoint across a restart); passes on BETA 995 and 987. The reproducer's Startup.twin is test/ide/probes/breakpoints/Sources/Startup.twin with a different header comment. When fixed: update that test and this entry. -->

---

## A watch on a variable of a user-defined type fails with a codegen error, and the Debug Console reports a linker error at every stop

**Describe the bug**
While the debugger is stopped, a watch on a variable of a user-defined type cannot be evaluated. **Watches** shows `(compile error: codegen error; check for compilation errors)`, of type `ERROR`, and the Debug Console prints `[LINKER] compilation (codegen) error detected in 'Startup.{temp_procedure}' at line #1`. The linker error comes again at every later stop while the watch exists, and `? p` in the Debug Console fails the same way. **Variables** shows the same variable and its fields without trouble, and a watch on one of its fields works.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `udt-watch-codegen-error.twinproj` (attached as `udt-watch-codegen-error.zip`). `Startup.twin` declares a type, and `Main` passes the line marked `BREAK` twice:
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
2. Put a breakpoint on the line marked `BREAK` (F9) and press F5. The run stops there, and **Variables** shows `p` as `{user defined type, 8 bytes}`, with `X` and `Y`.
3. Add a watch on `p` (**Debug > Add Watch...**, or the plus sign in **Watches**). The watch shows `(compile error: codegen error; check for compilation errors)`, of type `ERROR`, and the Debug Console prints `[LINKER] compilation (codegen) error detected in 'Startup.{temp_procedure}' at line #1`.
4. Press F5. The run stops at the breakpoint again, and the Debug Console prints the linker error again.
5. Type `? p` in the Debug Console and press Enter. It fails with the same error, and the Debug Console prints the same linker line.

**Expected behavior**
The watch shows `p` as **Variables** does, `{user defined type, 8 bytes}` opening to its fields, as VBA's Watch window shows a variable of a user-defined type. An expression that cannot be shown, such as `? p`, which has no single value to print, is refused with a message about the expression. A linker error about generated code reads as though the project had failed to build, which it has not.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 987, identically.

What does not reproduce it: a watch on a field, `p.X`, which shows `7`, of type `Variant [Long]`; and **Variables**, which shows `p` and its fields. That type suggests a watch is evaluated as a `Variant`, which cannot hold a value of a user-defined type. Seen with a `Private Type` declared in the module; other declarations of the type were not tried.

Severity: a watch on a structure is unusable, and while it exists every stop adds a linker error to the Debug Console.

<!-- Asserted by `ide-test.bat --only watches` (test/ide/watches.test.mjs: the watch on p, the watch on p.X, the next stop, and ? p); passes on BETA 995 and 987. The reproducer's Startup.twin is test/ide/probes/watches/Sources/Startup.twin with a different header comment. When fixed: update that test and this entry. -->

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

## A system colour value with a nonzero second or third byte draws black since BETA 984, where VB6 takes the index from the low 16 bits

**Describe the bug**
Since BETA 984 (release note: "fixed: Circle/Line/PSet color value handling to match VB6's relaxed rules"), `Line`, `Circle` and `PSet` draw black for a colour whose top byte is `&H80` and whose second or third byte is not 0, such as `&H80FF000F` or `&H80010003`. The colour is read as a system colour only when the value minus `&H80000000` is 0 to 30, and any other `&H80` value draws black. VB6 takes the system colour index from the low 16 bits and ignores the bits in between, so it draws system colour 15 for `&H80FF000F` and system colour 3 for `&H80010003`. BETA 983 gave the same colours as VB6 for these two values. Observed by reading the pixel back with `GetPixel` from a form with `AutoRedraw` set.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `system-colour-extra-bytes-black.twinproj` (attached as `system-colour-extra-bytes-black.zip`). Its `Sub Main` loads `Form1`, sets `AutoRedraw`, `ScaleMode = vbPixels` and `BackColor = &H30201`, draws one point with `Form1.PSet (10, 10), Color` for each of three colours, and prints the pixel read back with `GetPixel`.
2. Run it (F5) and read the DEBUG CONSOLE:
   ```
   &H8000000F -> F0F0F0
   &H80FF000F -> 000000
   &H80010003 -> 000000
   ```

**Expected behavior**
The colours VB6 draws, which BETA 983 drew as well:
```
&H8000000F -> F0F0F0
&H80FF000F -> F0F0F0
&H80010003 -> DBCDBF
```
`F0F0F0` is system colour 15 (`vbButtonFace`) and `DBCDBF` is system colour 3 (`vbInactiveTitleBar`) on the machine of the observation. The VB6 project, attached as `system-colour-extra-bytes-black-vb6.zip`, prints exactly these three lines.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low. A value like these is not what a `vbButtonFace`-style constant holds, and the colours of VB6 forms and controls are always the plain `&H8000000F` form. The effect is a different colour for a value that VB6 accepts.

BETA 983 drew the same colours as VB6 for `&H80FF000F` and `&H80010003`, by passing the value to `OleTranslateColor`. It also raised error 5 for a value that is neither a system colour nor an RGB value with a top byte of 0, 1 or 2, and 984 fixed that: `-1`, `&HFF0000FF`, `&H7FFFFFFF` and the `&H01` palette forms now draw as VB6 draws them (the low 24 bits), as do a `Double` such as 255.7 (256) and a `String` such as `"255"`. Only the `&H80` top byte differs from VB6.

The same difference exists for the high end of the index range: VB6 draws `&H80000019` to `&H8000001E` black, and twinBASIC draws the system colour of that index (`&H8000001D` gives `FF9933`, `&H8000001E` gives `F0F0F0`); this looks deliberate, since the source names `COLOR_MENUBAR` (30) as the limit. `&H80000100` draws black in both BETA 995 and VB6, and `C8C8C8` (index 0) in BETA 983.

The change is `TranslateColor2` in the VB package's `Graphics.twin`, which `Line`, `Circle` and `PSet` call on `Color`: for a top byte of `&H80` it returns the system colour when the value minus `&H80000000` is 0 to 30 and 0 otherwise, and for any other value it returns the low 24 bits.

<!-- Reproducer: bugs/system-colour-extra-bytes-black/ (mode run, expects the three lines above in twinBASIC); verified on 995, with 983 as the control (F0F0F0, F0F0F0, DBCDBF). The VB6 project is in bugs/system-colour-extra-bytes-black/vb6/ (`bug_repro.mjs vb6 system-colour-extra-bytes-black` prints the three lines above). The fuller sweep (about 45 colour values on 995, 983 and VB6) is in .claude/tooling-review-scratch/beta995-probes/s73/forms/ (c1.out995.txt, c1.out983.txt, c1.outvb6.txt), local scratch files that are not in the repository. Stated in docs/Reference/Core/Graphics-Methods.md, section "Colour values" (the first bullet and the WARNING after it, which names BETA 995; the NOTE below the WARNING is the deliberate difference for indexes 25 to 30): when fixed, replace the WARNING with a NOTE saying since which build twinBASIC takes the index from the low 16 bits, and change the bullet. -->

---

## Setting a colour property to a value that is not a colour stores it, and raises error 5 or nothing, where VB6 raises error 380 and keeps the old value

**Describe the bug**
Assigning a value that is not a colour to a colour property does not leave the property as it was, on a form, on a PictureBox or UserControl, on the Printer, and on every control tried. `Form.ForeColor = -1` and `Form.ForeColor = &H8000001F` raise error 5 (*Invalid procedure call or argument*) and still store the value, so `ForeColor` reads back `FFFFFFFF` and `8000001F` afterwards. `Form.BackColor = -1` and `Form.FillColor = -1` raise nothing and store the value. `ForeColor` raises error 5 on the surfaces that draw with a device context (Form, PictureBox, UserControl, Printer); every other colour property tried raises nothing, for `-1`, `&H8000001F` and `&HFF0000FF` alike. VB6 raises error 380 (*Invalid property value*) for every one of these assignments and keeps the colour the property had. Observed by assigning with `On Error Resume Next` and printing `Err.Number` and the value read back.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `forecolor-invalid-value-stored.twinproj` (attached as `forecolor-invalid-value-stored.zip`). Its `Sub Main` loads `Form1`, which holds a PictureBox, a Label, a TextBox, a CommandButton and a user control, UC1, whose `RunCases` assigns its own colour properties. For each property tried it sets `vbGreen`, then assigns `-1` (and `&H8000001F` to the form's `ForeColor`) under `On Error Resume Next` and prints the error number and the value read back. The Printer lines need a default printer; nothing is printed.
2. Run it (F5) and read the DEBUG CONSOLE:
   ```
   Form.ForeColor = -1: Err 5, reads FFFFFFFF
   Form.ForeColor = &H8000001F: Err 5, reads 8000001F
   Form.BackColor = -1: Err 0, reads FFFFFFFF
   Form.FillColor = -1: Err 0, reads FFFFFFFF
   PictureBox.ForeColor = -1: Err 5, reads FFFFFFFF
   PictureBox.BackColor = -1: Err 0, reads FFFFFFFF
   PictureBox.FillColor = -1: Err 0, reads FFFFFFFF
   Label.ForeColor = -1: Err 0, reads FFFFFFFF
   Label.BackColor = -1: Err 0, reads FFFFFFFF
   TextBox.ForeColor = -1: Err 0, reads FFFFFFFF
   TextBox.BackColor = -1: Err 0, reads FFFFFFFF
   CommandButton.BackColor = -1: Err 0, reads FFFFFFFF
   Printer.ForeColor = -1: Err 5, reads FFFFFFFF
   Printer.FillColor = -1: Err 0, reads FFFFFFFF
   UserControl.ForeColor = -1: Err 5, reads FFFFFFFF
   UserControl.BackColor = -1: Err 0, reads FFFFFFFF
   UserControl.FillColor = -1: Err 0, reads FFFFFFFF
   ```

**Expected behavior**
Error 380 for each assignment, and the old value kept, as VB6 does (the VB6 project, attached as `forecolor-invalid-value-stored-vb6.zip`, prints):
```
Form.ForeColor = -1: Err 380, reads FF00
Form.ForeColor = &H8000001F: Err 380, reads FF00
Form.BackColor = -1: Err 380, reads FF00
Form.FillColor = -1: Err 380, reads FF00
PictureBox.ForeColor = -1: Err 380, reads FF00
PictureBox.BackColor = -1: Err 380, reads FF00
PictureBox.FillColor = -1: Err 380, reads FF00
Label.ForeColor = -1: Err 380, reads FF00
Label.BackColor = -1: Err 380, reads FF00
TextBox.ForeColor = -1: Err 380, reads FF00
TextBox.BackColor = -1: Err 380, reads FF00
CommandButton.BackColor = -1: Err 380, reads FF00
Printer.ForeColor = -1: Err 380, reads FF00
Printer.FillColor = -1: Err 380, reads FF00
UserControl.ForeColor = -1: Err 380, reads FF00
UserControl.BackColor = -1: Err 380, reads FF00
UserControl.FillColor = -1: Err 380, reads FF00
```
`FF00` is `vbGreen`, which each property held before the assignment. A program that sets a colour from user input and handles the error then keeps the colour it had.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low. `ForeColor` raises the error on the surfaces and the other properties do not, and the stored value is what a later `Line`, `Circle`, `PSet` or `Print` then uses (or what the control paints with), so a handled error leaves the invalid colour in force.

What was tried: the same lines on BETA 983 print the same, so this is not a change of BETA 984. A value that is a valid colour, such as `&H100FF00` or `&H20000FF`, is accepted by `ForeColor` with no error, as in VB6. Besides the attached project, each of `-1`, `&H8000001F` and `&HFF0000FF` was assigned to every colour property of a UserControl (placed on the form), CheckBox, Frame, ListBox, Shape, ComboBox, DirListBox, DriveListBox, FileListBox, OptionButton and OLE in a project of its own, on BETA 995 and 983 and in VB6: the results are the same as above, error 5 for the UserControl's `ForeColor` and none for the rest in twinBASIC, error 380 and the old value kept in VB6. The twinBASIC-only controls behave the same (`QRCode.ForeColor` raises error 5, `CheckMark.BackColor` and `MultiFrame.BackColor` raise nothing), and so do `CommandButton.ForeColor` and the Data control's colours, which VB6 has no counterpart or no loadable project for. The package source explains the pattern: the colour properties are plain stored fields (`Public ForeColor As OLE_COLOR` and so on, in `GraphicsBase` for Form, PictureBox, UserControl, PropertyPage and Report, and declared again in each control), with nothing that validates the value; the error 5 comes from the `ForeColor` change handler of `GraphicsBase`, which runs after the value is stored.

<!-- Reproducer: bugs/forecolor-invalid-value-stored/ (mode run, expects the seventeen lines above in twinBASIC); verified on 995 and 983. The VB6 project is in bugs/forecolor-invalid-value-stored/vb6/ (`bug_repro.mjs vb6 forecolor-invalid-value-stored` prints the seventeen lines above). The wider sweep (every colour property of the classes named under "What was tried", three values each, on 995, 983 and VB6) is in .claude/tooling-review-scratch/beta995-probes/s73/colours/ (c4.out995.txt, c4.out983.txt, c5.outvb6.txt, c6.Data.outvb6.txt, c3.out*.txt for the UserControl), local scratch files that are not in the repository. Stated in a WARNING naming BETA 995 under each of the colour properties on the pages under docs/Reference/Default/VB/ for: Form, PictureBox, UserControl, PropertyPage, Report, Printer, Label, TextBox, CommandButton, CheckBox, OptionButton, Frame, ListBox, ComboBox, DirListBox, DriveListBox, FileListBox, Shape, OLE (the VB6 comparison is in the WARNING) and Data, CheckMark, MultiFrame, QRCode (twinBASIC behaviour only; CommandButton.ForeColor likewise). PropertyPage and Report were not run: they inherit GraphicsBase, as Form does. MDIForm carries none: its BackColor assigns a separate field and its ForeColor and FillColor raise an unsupported-property error, and none was run. When fixed, replace each WARNING with a NOTE saying since which build. -->

---

## `TextBox.Text` assigned in code is not limited by `MaxLength`, where VB6 truncates it

**Describe the bug**
With `MaxLength` set to 3, `Text1.Text = "abcdef"` stores all six characters and `Len(Text1.Text)` is 6. VB6 truncates the new text to `MaxLength` characters: `Text` reads `abc`. `SelText` is affected in the same way: with `Text` equal to `"ab"` and the caret at the end, assigning `SelText = "cdef"` leaves `abcdef` in twinBASIC and `abc` in VB6. The `Text` property setter of the VB package sends `WM_SETTEXT` to the edit control, and the whole string is stored. Observed by reading `Text` back.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `textbox-text-ignores-maxlength.twinproj` (attached as `textbox-text-ignores-maxlength.zip`). Its `Form1` holds one `TextBox`, `Text1`, and its `Sub Main` loads the form, sets `Text1.MaxLength = 3`, assigns `Text` and `SelText`, and prints what `Text` holds.
2. Run it (F5) and read the DEBUG CONSOLE:
   ```
   Text = "abcdef": [abcdef] Len 6
   SelText = "cdef" after "ab": [abcdef] Len 6
   ```

**Expected behavior**
The text is cut to `MaxLength` characters, as in VB6 (the VB6 project, attached as `textbox-text-ignores-maxlength-vb6.zip`, prints):
```
Text = "abcdef": [abc] Len 3
SelText = "cdef" after "ab": [abc] Len 3
```
A program that relies on `MaxLength` to bound a field, for instance one that stores `Text` in a fixed-size record, gets a string longer than the limit.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low to medium. Typing into the box was not tried; the gap is the assignment in code.

What was tried: BETA 983 prints the same two lines. Assigning the same long text a second time raises no `Change` event, in twinBASIC and in VB6.

<!-- Reproducer: bugs/textbox-text-ignores-maxlength/ (mode run, expects the two lines above in twinBASIC); verified on 995 and 983. The VB6 project is in bugs/textbox-text-ignores-maxlength/vb6/ (`bug_repro.mjs vb6 textbox-text-ignores-maxlength` prints the two lines above). Stated in docs/Reference/Default/VB/TextBox/index.md, the MaxLength section, in a WARNING that names BETA 995 ("assigning Text in code is not limited by MaxLength"): when fixed, replace it with a NOTE saying since which build Text is truncated. -->

---

## `StrConv` with `vbProperCase` leaves a word in lowercase when it follows an even number of separators

**Describe the bug**
`StrConv(s, vbProperCase)` capitalises the first letter of a word that follows one, three or five separator characters (space, tab, `vbCr`, `vbLf`, vertical tab, form feed, NUL), and a word at the start of the string. After two, four or six separators the word is left in lowercase, so every word after a `vbCrLf` in multi-line text stays lowercase, and so does the second word of `"a  b"` (two spaces). It is a regression: BETA 983 capitalised every word. Observed in a run of the reproducer project.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `proper-case-even-separators.twinproj` (attached as `proper-case-even-separators.zip`). Its one source file, `Startup.twin`, has a `Sub Main` that calls `StrConv` with `vbProperCase` on `"a b"`, `"a  b"`, `"a   b"` and `"a" & vbCrLf & "b"`.
2. Run it (F5) and read the DEBUG CONSOLE:
   ```
   one space:    [A B]
   two spaces:   [A  b]
   three spaces: [A   B]
   vbCrLf:       [A<CRLF>b]
   ```

**Expected behavior**
Every word is capitalised, whatever the number of separators before it: `[A  B]` and `[A<CRLF>B]`. VB6 does so (attached as `proper-case-even-separators-vb6.zip`, which prints `[A  B]` and `[A<CRLF>B]`), and so does BETA 983.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: medium. Text with a line break or with aligned columns comes out half capitalised, and nothing reports it.

With `"a" & Space$(n) & "b" & Space$(n) & "c"`, n = 0 gives `Abc` and n = 1, 3 and 5 give every word capitalised; n = 2, 4 and 6 give `A`, then `b` and `c` in lowercase. A space followed by a tab counts as two separators, and `" a  b  c "` (one leading space) comes out as `" a  b  c "`, all lowercase. The result is the same with an explicit `LCID` of 1033. It looks as if each separator toggles a "capitalise the next letter" flag instead of setting it. BETA 983 and VB6 give the same result as each other for all of these.

<!-- Reproducer: bugs/proper-case-even-separators/ (mode run, expects the four lines above); verified on 995, 983 gives `[A  B]` and `[A<CRLF>B]`. docs/Reference/Default/VBA/Strings/StrConv.md carries a WARNING about this ("BETA 995 has a defect in vbProperCase ..."); when fixed, replace it with a NOTE saying since which build. -->

---

## `LSet` on a `Long` variable compiles, and the build fails with a codegen error

**Describe the bug**
`LSet` is defined for a string or a user-defined type. A statement `LSet n = "ab"` with `n` declared `As Long` is accepted by the compiler without a diagnostic, and building the project then fails: the linker reports a code-generation error at the statement, and no exe is produced. Run from the IDE (F5), the project stops the same way. Observed in a build of the reproducer project.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `lset-long-codegen-error.twinproj` (attached as `lset-long-codegen-error.zip`). Its one source file, `Startup.twin`, is a `Sub Main` with `Dim n As Long` and `LSet n = "ab"`.
2. Compile it: no errors, warnings or hints.
3. Build it (Build, or F5) and read the DEBUG CONSOLE:
   ```
   [BUILD] Starting...
   [LINKER] compilation (codegen) error detected in 'Startup.Mainrootmain' at line #5
   [LINKER] FAILED due to compilation errors 'LsetLongCodegenError_win32.exe'
   [BUILD] failed
   ```

**Expected behavior**
A compile error on the `LSet` line, as for the neighbouring wrong operands: `LSet s = a` with `a` a user-defined type and `RSet a = b` with user-defined types are refused with TB5001 (*unable to convert type ... to String*), and `LSet a = s` with a string source and a user-defined type destination is refused with TB5249. VB6 refuses this statement at compile time with *LSet allowed only on strings and user-defined types* (attached as `lset-long-codegen-error-vb6.zip`, which does not build).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low. The error is reported, so nothing runs wrongly, but it points at no cause, and the compile step that the IDE shows while typing says the project is fine.

Tried with a `Long` destination only. The same on BETA 983.

<!-- Reproducer: bugs/lset-long-codegen-error/ (mode build, expects tbbuild exit 5 and "codegen" in the message); verified on 995 and 983. The BUGS tool's `vb6` command prints VB6's compile error and exits 1 for it, which is the comparison. No page states it: docs/Reference/Core/LSet.md says nothing about other destinations. -->

---

## `LSet` and `RSet` on an element of a `Variant` that holds an array change nothing

**Describe the bug**
`LSet v(0) = "zz"` and `RSet v(1) = "zz"` do nothing when `v` is a `Variant` that holds an array, whether the array came from `Array(...)` or from `ReDim v(0 To 1)` on the `Variant`. The statements raise no error, and the element keeps its value. The same statements on an element of an array declared `Dim w(0 To 1) As Variant` work. Observed in a run of the reproducer project.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `lset-variant-array-element-noop.twinproj` (attached as `lset-variant-array-element-noop.zip`). Its one source file, `Startup.twin`, has a `Sub Main` that assigns `v = Array("0123456789", "abcde")`, runs `LSet v(0) = "zz"` and `RSet v(1) = "zz"`, and does the same to the elements of `Dim w(0 To 1) As Variant`.
2. Run it (F5) and read the DEBUG CONSOLE:
   ```
   LSet v(0), v = Array(...):   [0123456789]
   RSet v(1), v = Array(...):   [abcde]
   LSet w(0), w(0 To 1) As Variant: [zz        ]
   RSet w(1), w(0 To 1) As Variant: [   zz]
   ```

**Expected behavior**
The elements of `v` change as those of `w` do: `[zz        ]` and `[   zz]`. VB6 does so (attached as `lset-variant-array-element-noop-vb6.zip`).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low to medium. A statement that has no effect and no error is easy to miss.

Tried: `ReDim v2(0 To 1)` on a `Variant`, then `LSet v2(0) = "zz"`, does the same. The `w` elements and `Dim a(0 To 2) As String` elements work. On BETA 983 the `v` lines read the same, and the `w` line for `LSet` reads `[zz23456789]`, because `LSet` did not yet fill with spaces there (fixed in BETA 984, which is a separate matter).

<!-- Reproducer: bugs/lset-variant-array-element-noop/ (mode run, expects the four lines above); verified on 995, 983 gives the same `v` lines. docs/Reference/Core/LSet.md and RSet.md each carry a WARNING naming BETA 995 for this, after the paragraph that says the destination can be a Variant that holds a string; when fixed, replace each with a NOTE saying since which build. -->

---

## `LSet` and `RSet` on a `Variant` destination raise 13 for `Null` and for an object, and pad a `Boolean` as `-1`

**Describe the bug**
When the destination of `LSet` or `RSet` is a `Variant`, three subtypes behave differently from VB6. A `Variant` holding `Null` raises error 13 (*Type mismatch*), where VB6 raises 94 (*Invalid use of Null*). A `Variant` holding an object, such as a `Collection`, raises error 13, where VB6 raises no error. A `Variant` holding `True` is aligned as the two characters `-1`: `RSet v = "ab"` leaves `[ab]` with `Len` 2, where VB6 aligns within `"True"` and leaves `[  ab]` with `Len` 4. Observed in a run of the reproducer project.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `lset-variant-destination-types.twinproj` (attached as `lset-variant-destination-types.zip`). Its one source file, `Startup.twin`, has a `Sub Main` under `On Error Resume Next` that runs `LSet v = "abc"` on a `Variant` holding `Null`, `LSet v = "abc"` on one holding `New Collection`, and `RSet v = "ab"` on one holding `True`.
2. Run it (F5) and read the DEBUG CONSOLE:
   ```
   LSet, destination Null:    error 13
   LSet, destination Object:  error 13
   RSet, destination True:    [ab] Len 2
   ```

**Expected behavior**
`error 94` for `Null`, no error for the object, and `[  ab] Len 4` for `True`, as in VB6 (attached as `lset-variant-destination-types-vb6.zip`, which prints `error 94`, `error 0` and `[  ab] Len 4`).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low. Programs rarely align into a `Variant` that holds `Null` or an object, and the error number matters only to a handler that tests for 94.

A `Variant` holding an `Integer`, a `Long`, a `Double` or a `Date` is aligned within its text as in VB6, and one holding an error value or an array raises 13 in both. A `Null` source into a `String` destination raises 94 in both. The same results on BETA 983.

<!-- Reproducer: bugs/lset-variant-destination-types/ (mode run, expects the three lines above); verified on 995 and 983. No page states these cases: docs/Reference/Core/LSet.md and RSet.md say that a Null source raises error 94 and that the destination can be a Variant that holds a string. -->

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

