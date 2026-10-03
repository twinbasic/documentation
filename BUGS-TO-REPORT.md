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

<!-- Manual in bugs/build-and-exit-silent/repro.json: the switch belongs to the IDE executable, which opens a window, so nothing here may run on the user's desktop. Measured with a scratch copy of scripts/lib/tb-launch.ps1 (private desktop, kill-on-close job, TBBUILD_CMD replacing the command line, standard handles redirected to a file), with scripts/lib/tb-registry.mjs startTidy and finishTidy around the run. Stated in scripts/tbbuild.mjs (header comment) and WIP.Harness.md, "Do not reach for --buildAndExit32 instead": when fixed, those two say the switch is unusable. The exit-0-on-errors claim there was stated for BETA 983 without a reproduction; it is true only for an error in code nothing calls, so correct it either way. -->

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
