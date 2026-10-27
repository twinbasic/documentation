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

**An IDE defect whose cause is in the IDE's own JavaScript carries a Fix shape** (owner,
2026-10-18): a **Fix shape** section after **Additional context**, inside the issue body. It
opens with the line `ide_js.mjs shape` prints, which names the function, the file and the
build and says which local names are ours and what the build calls them; then the diff;
then one paragraph on why the change fixes the defect; then one line on what the entry's test
showed on a patched copy of the install. The diff is generated, never written by hand:
`node scripts/ide_js.mjs shape bugs/<slug>/fix.js`, where `fix.js` is the fix, whole
functions in our names, beside the reproducer ([WIP.md](WIP.md#driving-the-twinbasic-compiler),
*Fixing the IDE itself*). The minified edits and their offsets stay out of the entry. The
entry's HTML comment names the fix file.

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: cosmetic, but it shows on a new installation, which is exactly when the list has empty slots.

What does not reproduce it:

| starting list | result |
|---|---|
| no `RecentlyOpened` key at all | `C` and 20 empty strings, which is correct |
| 21 distinct entries | 21 distinct entries, the oldest dropped, which is correct; read at the end of 41 successive opens |
| `C` already at the top | unchanged: the opened project itself is never duplicated |

So it takes at least one existing entry and at least one slot with nothing in it, which looks like each slot being read with the previous slot's value as its default. Once a duplicate is there, the next opened project keeps it: 18 copies of one project became 20 after one more open, with the new project on top.

<!-- Lane mode in bugs/recent-projects-copies/repro.json: asserted by `ide-test.bat --only recent-projects-copies` (test/ide/recent-projects-copies.test.mjs), which passes on BETA 1005; the test records the user's own list value by value and puts it back afterwards. Stated in WIP.Harness.md (the note on the IDE's bug with the recent list); when fixed, that note can go. The harness trips it because every IDE a run starts opens a project: a run that began on a list of one entry once ended with seventeen copies of it. -->

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
6. See the command never exit. It writes nothing to stdout or stderr and no `.exe`, and was still running when it was ended after 30 and 40 seconds. On the desktop it sat on a *Please wait...* dialog at 100%.

**Expected behavior**
A build switch for unattended use should report the diagnostics on stdout or stderr, exit with a non-zero code when the project has errors, and exit when the build fails instead of waiting. At the least it should not exit 0 and write an `.exe` for a project the IDE flags with an error.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: it makes the switch unusable for the one job it exists for, because it is silent, falsely green and hangs on the case worth catching.

Which errors hang and which exit 0. All of these hang, with no `.exe` written: `NoSuchProcedure` in `Main`, `NoSuchProcedure` in a procedure that `Main` calls, a bare `Dim`, `Dim x As NoSuchType`, `y = 1` under `Option Explicit`, and a project with no `Sub Main`. The same `NoSuchProcedure` in a procedure nothing calls exits 0 with the `.exe` written. Assigning `"abc"` to a `Long` and an unused `Dim x As Long` compile without an error and exit 0, as they should.

So exit 0 on a project with errors happens only for an error in code nothing calls; an error in code the build reaches never exits 0.

Silence on stdout and stderr was checked by redirecting the standard handles of the process to a file. The same redirection captures the compiler executable's own output (`twinBASIC_win32.exe settings <project>` wrote the whole `Settings` file), so the capture works.

<!-- Lane mode in bugs/build-and-exit-silent/repro.json: asserted by `ide-test.bat --only build-and-exit-silent` (test/ide/build-and-exit-silent.test.mjs, both cases, the IDE executable on a private desktop through launchOnDesktop), which passes on BETA 1005. First measured with a scratch copy of scripts/lib/tb-launch.ps1 (private desktop, kill-on-close job, TBBUILD_CMD replacing the command line, standard handles redirected to a file), with scripts/lib/tb-registry.mjs startTidy and finishTidy around the run. Stated in scripts/tbbuild.mjs (header comment) and WIP.Harness.md, "Do not reach for --buildAndExit32 instead": when fixed, those two say the switch is unusable. So do docs/Documentation/Tools.md (the tbbuild section) and docs/Features/Packages/Import-export tool.md ("Compiling from the command line"). All four say exit 0 only for an error in code nothing calls, and a hang for an error the build reaches. -->

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: an interface the language lets you declare cannot be implemented at all, and the diagnostic asks for the signature that is already written.

<!-- Reproducer: bugs/preservesig-implements/ (mode compile, expects TB5004 and TB65535). Found by scripts/check_examples.mjs over Reference/Core/Interface.md, whose example declared IFoo with a [PreserveSig] member and then showed a class implementing it; the example no longer puts [PreserveSig] on a member it implements, and its description of the attribute says why. Also stated in docs/Reference/COM-Interfaces/IEnumVARIANT.md (the Err.ReturnHResult paragraph) and in a NOTE in docs/Features/Advanced/API-Declarations.md, "ThisCall in interfaces", whose Sub + Err.ReturnHResult workaround goes with it when fixed. -->

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
 - twinBASIC compiler version: BETA 1010

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

<!-- Automated: bugs/path-limit-260/repro.json is a cli reproducer, import to a 239-character file name in the temp folder (generated, 230 f characters plus .twinproj; the temp folder's own length adds to it, so it fails whatever TEMP is). It tests the file limit only; the export side needs an existing deep folder, which the cli mode cannot create, so it is in the steps above. Stated in WIP.Harness.md (why the tooling does not run the compiler's verbs); the census unpacks with impexp, in process. Found by the attribute census pointed at a cache folder in a deep working directory: WebView2Package and the three cefPackage versions came back ... FAILED while the other twelve packages exported. -->

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: an unattended `export`, `settings` or `readme` never finishes, and once the box is closed every one of them exits 0 and `export` reports success, so a script that tests the exit code or `... DONE` is fooled as well.

All four kinds of damaged input open the box under all three commands. The undamaged project exports at once, with no box.

What does not reproduce it: a folder given where the project should be. `settings` then prints `ERROR: failed to parse project file, file may be corrupt or inaccessible` and exits, with no box.

<!-- A cli reproducer in bugs/damaged-project-modal-box/repro.json, run on a private desktop by bug_repro, which reads each box and closes it (the probe that found it opened message boxes on the user's desktop three times, which is why nothing runs these commands on a desktop anyone uses). No test or page states it. The command-line verbs are described on docs/Documentation/Tools.md (impexp) and in scripts/impexp.mjs, which does not open a box for a damaged file; check them when fixed. Found by probing the command line for the rewrite of the Import/Export Tool page. -->

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: a refused export leaves the folder a mixture of the old tree and the project.

The same behaviour makes the VB package impossible to export without `--overwrite`, even into an empty folder: it holds `Resources\MANIFEST\#1.xml` twice (see the report on names written twice into shipped project files), and `export` writes one copy and then refuses the other because of the file it has just written. `export` of `packages\{F50B82D0-DCAB-43FE-9631-11959D4A4728}_VB\package.twinproj` into an empty folder prints one `output file already exists` error for that file and ends `... FAILED`.

<!-- Automated: bugs/export-refused-partial-write/repro.json is a cli reproducer. A cli reproducer runs one command, so the project holds a root file named after the project file (export-refused-partial-write.twinproj), which already exists in the temp folder the command exports into: that file is refused, and Settings and Sources\Startup.twin are written, with exit 0. The steps above show the same by deleting Settings. Checked by bug_repro verify. Nothing in scripts/ or WIP.md states it; the standalone scripts/impexp.mjs export checks before it writes, so when fixed nothing there changes. The VB-package sentence belongs to the duplicate-names report (slug duplicate-names-shipped). -->

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: ordinary relative and forward-slashed paths fail, with messages that say the file or folder does not exist.

The echo line explains the first two: `exporting from "\\?\export-needs-backslashes.twinproj"`. The project path is prefixed with `\\?\`, which turns off Windows' path normalisation, so only a full path with backslashes survives it. A folder given partly with forward slashes (an existing `C:\p\out/`) fails the same way.

What does not reproduce it: `import`'s project path and the printing commands take relative and forward-slashed paths, and with backslashes `export` creates every missing level of its output folder (`C:\p\a\b\c\` was created in one run).

<!-- Automated: bugs/export-needs-backslashes/repro.json is a cli reproducer, export of the packed project to the temp folder written as {tmp}/ (a forward slash after the backslashed path), expecting the could-not-be-created error and exit 0. The other three rows need a relative path, which a cli reproducer cannot give, so they are in the steps. Stated in WIP.md ("Give the executable backslashed paths") and WIP.Harness.md; those two stay true until this is fixed, then they can be relaxed. Checked by bug_repro verify. -->

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: a partly emptied folder, with the only record in the Debug Console. On a Git working copy it breaks the repository, because Git makes its object files read-only.

A folder with no read-only file does not reproduce it: it is emptied and exported completely, `.git` included, with no prompt.

<!-- Asserted by `ide-test.bat --only export` (test/ide/export.test.mjs, "a read-only file stops the export part-way, and the IDE reports nothing"), which also checks that no message box is open. The Git working-copy case was measured earlier on a `git init` folder and is not in the lane. Found by the same Export Project probe as the junction entry. When fixed: update that test and docs/IDE/Menu/File.md. -->

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
Moving past the failing line with **Set Next Statement** (Ctrl+F9) instead, each F5 then advances one line. An earlier run by hand, followed to the end, saw the pending step last until the procedure returned; what differed there is not known, and in the lane the step is used up by the one stop, as above.

What does not reproduce it: choosing **Ignore** without pressing a step key first, which runs on from the next line, to the next pass's error, as the panel says. Severity: the debugger stops where it was not asked to.

<!-- Asserted by `ide-test.bat --only debugger` (test/ide/debugger.test.mjs: "F8 on the failing line runs it again...", "after F8 there, Ignore stops on the next line instead of running on", "Ignore with no step first runs on..."). The reproducer's Startup.twin is test/ide/probes/debugger/Sources/Startup.twin with a different header comment. Found by the IDE debugging probe for round 8's UC-61. When fixed: update that test, the Traps on docs/IDE/Menu/Debug.md and this entry. -->

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: the package is imported but not referenced, and nothing says so.

The cause looks like this. `packageLoadFromFile` in `ide/main.js` reads `packageSymbol` from the response itself (`t.packageSymbol`) rather than from its `body`, so it passes `"/Packages/undefined"` to `getAvailableTypeLibrariesData` and ticks nothing; `importPackage`, the online import beside it, reads `t.body.packageSymbol`.

<!-- Asserted by `ide-test.bat --only packages` (test/ide/packages.test.mjs, "the imported package is listed, but not ticked"), which clicks the real button and answers the native file picker from the page. Its probes are test/ide/probes/packages/host and DocProbePkg, the reproducer's own project and package. Found by the package probe for round 8's UC-60. When fixed: update that test and the two Packages pages under docs/Features/Packages ("Importing a package from a TWINPACK file", "Updating a package"), which say the user must tick it. DocProbePkg.zip is not in git (bugs/**/*.zip is ignored): make it from DocProbePkg.twinpack. -->

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: the project builds and runs the old package after the user has replaced it.

What does not reproduce it: an **Apply** after the untick, followed by another after the import and tick (every run; this is the control in the lane): each of those restarts the compiler and saves, and v2 runs at once.

<!-- Asserted by `ide-test.bat --only packages` (test/ide/packages.test.mjs, "one Apply after the untick, the import and the tick: no restart, no save, and v1 still runs", with "an Apply after the untick and another after the tick" as its control). The lane's v1 and v2 are generated from test/ide/probes/packages/DocProbePkg the way the reproducer's packages are (version 1 and 2, Return 1 and 2). Found by the package probe for round 8's UC-60. When fixed: update that test and docs/Features/Packages/Updating a package.md. The two package zips are not in git; make them from the .twinpack files. -->

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: a diagnostic that points at correct code. `Max` uses `>` on a type parameter with nothing to say which types it accepts, which is how the problem arises.

<!-- Reproducer: bugs/generic-body-error/ (mode compile, expects TB5092). Found by probing round 9's UC-65 answer (the use-case evaluation corpus), whose Max uses `>` on a type parameter. -->

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: low; the IDE recovers, but the project is compiled again, and LLVM-compiled code run in the IDE is not recommended anyway. Without the attribute the run ends with no restart. In a built exe, with or without LLVM, `End` ends the program with exit code 0.

<!-- No docs page states this (docs/LLVM/Getting-Started.md does not mention End); when fixed, nothing to update. Checked with scripts/bug_repro.mjs (run mode: tbrun exit 5, output "before End" then "restarting from MEMORY"; verify), and the exe with `run --exe`. -->

---

## With LLVM on for the whole project, a `[CompilerOptions("")]` procedure that `Sub Main` reaches ends the IDE run with an access violation when it calls an LLVM procedure

**Describe the bug**
With LLVM turned on for the debug run of the whole project (Project Settings, Compiler Options (DEBUG), Enable LLVM Compilation), a procedure marked `[CompilerOptions("")]` that `Sub Main` calls, directly or through other procedures, ends the run in the IDE with `NATIVE EXCEPTION: ACCESS_VIOLATION` at the call it makes to a procedure compiled with LLVM. The DEBUG CONSOLE shows the exception, then the IDE's `auto-activated TRACE-MODE` lines, and nothing after the call is written. A built exe of the same sources, compiled with LLVM as well, runs correctly.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `llvm-plain-calls-llvm-from-main.twinproj` (attached as `llvm-plain-calls-llvm-from-main.zip`). It needs an LLVM licence (Ultimate): its setting `compiler.debugOptions` is `+llvm`, which is Enable LLVM Compilation under Compiler Options (DEBUG). Its only module is:
   ```
   Module Startup

       Public Sub Callee()
           Debug.Print "Callee"
       End Sub

       [CompilerOptions("")]
       Public Sub Plain()
           Debug.Print "Plain: before Callee"
           Callee
           Debug.Print "Plain: after Callee"
       End Sub

       Public Sub Main()
           Plain
       End Sub

   End Module
   ```
2. Run the project in the IDE (F5).
3. See `Plain: before Callee` in the DEBUG CONSOLE and then `NATIVE EXCEPTION: ACCESS_VIOLATION /Startup.twin; Startup.Plain LINE 000013`. `Callee` and `Plain: after Callee` are not written, and the run is over.

**Expected behavior**
`Plain` calls `Callee` and the run goes on: `Callee`, then `Plain: after Callee`. A procedure compiled without LLVM can call one compiled with it, as it does when `Plain` is not reached from `Sub Main` (see below), and as it does in a built exe.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: medium. It applies to a debug run compiled with LLVM, which Project Settings itself does not recommend, and it ends the run; nothing wrong is computed. Turning LLVM off for the debug run avoids it.

What it needs, each checked by removing or changing one thing at a time: LLVM on for the whole project's debug run; a procedure marked `[CompilerOptions("")]`; a call in that procedure to a procedure compiled with LLVM (`Callee` can have an empty body); and `Sub Main` reaching the marked procedure: `Main` calling it directly, through an LLVM procedure (`Main` calls `Helper`, which calls `Plain`) or when `Plain` and `Callee` are in another module all end the run, and so does `Main` calling `Plain` when the run itself calls `Plain` from another procedure, so `Main` need not run it. It happens in a 32-bit and a 64-bit run.

What does not reproduce it: `Main` empty, with `Plain` reached from another procedure (a `Helper` or the run's own entry procedure) and not from `Main`; `Main` calling `Callee` itself, not through `Plain`; LLVM on for no procedure but `Main` and `Callee`, by their `[CompilerOptions("+llvm")]` attributes, with `Plain` unmarked; `Plain` without the attribute, so that everything is compiled with LLVM; the exe built from the same sources with LLVM on for the build as well (`tbrun --llvm --exe`, 32-bit), which exits with code 0 and no fault. The startup object has to be `Sub Main`: the IDE refuses a project whose startup object is another procedure ("unable to locate form 'Sub Entry'").

The crash is a race that one IDE on its own always loses: run on its own, the project ends in the exception every time (8 of 8 runs of a reduced copy, 3 of 3 of this one), and with eight IDEs started at once about four of them do. The address in the exception varies (`ntdll.dll`, `twinBASIC_win32.dll`), and so does where the exception is reported: always the line of the call in `Plain`.

<!-- Reproducer: bugs/llvm-plain-calls-llvm-from-main/ (mode run: the project's `compiler.debugOptions` is `+llvm`, tbrun exit 5, output `Plain: before Callee` and the access violation; verify reproduces on BETA 1005, one IDE at a time). No VB6 side: VB6 has no LLVM. Narrowed from an LLVM probe whose `[CompilerOptions("")]` procedure held a Variant array, a loop and about a dozen `TbRun.Out` calls: none of that matters, and neither do the types of its locals (a Double or an Integer local seemed to matter at first, because the crash is intermittent when several IDEs run at once). Stated in a WARNING naming BETA 1005 in docs/LLVM/Getting-Started.md, after the `[CompilerOptions("")]` sample: when fixed, the WARNING goes. -->

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: low; it takes a deliberate copy of `IUnknown`'s identifier, but the compiler accepts it silently and the failure is a crash.

What was tried:
- The same code with any other identifier on the interface runs to the end and prints `called`.
- If the class does not implement the interface at all, `Set u = New RC` still succeeds, and `u.Dummy` returns with no error and no effect: the `Set` asks for `IUnknown`, which every class answers.
- An interface with three `[PreserveSig]` members declared in `IUnknown`'s order, `QueryInterface`, `AddRef` and `Release`, behaves the same way: `Set` succeeds, and the calls go to the wrong slots (one `AddRef` returned 0, and the next call crashed).
- `Interface IUnk Extends stdole.IUnknown` with that identifier compiles, and `u.AddRef` is then reported as `TB5027 Unrecognized member 'AddRef' on type 'IUnk'`, as it is for `stdole.IUnknown` itself, which has no members that twinBASIC code can call.

<!-- Reproducer: bugs/iunknown-iid-interface/ (mode run, expects tbrun exit 5, the output `ok` and the native exception). Stated in docs/Reference/COM-Interfaces/IUnknown.md, section "Implementing it" (the WARNING, after the paragraph that begins "A project's own Interface that carries the identifier of IUnknown also compiles"): when fixed, remove it and state what the compiler does (a diagnostic, or a working call). -->

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: low, since a project can declare its own copy of the interface, but the failure is silent without a handler and the compiler gives no sign that the call is not what it appears to be.

BETA 1005 raises 438 for a late-bound call to a member an object does not have, as VB6 does (#2490), and so for these.

What was tried: `GetIDsOfNames` and `Invoke` with zero arguments, and `GetTypeInfo` with a null pointer, each end the run the same way; calls with arguments of the wrong type compile (`d.GetTypeInfoCount "a"`, `d.GetTypeInfo "a", "b", "c"`, `d.Invoke "a", "b", "c", "d", "e", "f", "g", "h"` all compile). An unhandled `Err.Raise 5` in the same harness ends the run the same way, so the silent end is how an unhandled error shows there, not a separate fault. Running the built exe with `--exe` was not possible on this machine (the harness could not start it).

<!-- Reproducer: bugs/stdole-idispatch-late-bound/ (mode run, expects the Hello and GetTypeInfoCount lines above); verified on 1005 with the number 438. VB6 side in bugs/stdole-idispatch-late-bound/vb6/ (VB6 6.0): the build is refused, so `vb6` exits 1 with the compile error above; that refusal is the result. The `As Object` variant was run in a scratch copy, not kept. Stated in docs/Reference/COM-Interfaces/IDispatch.md, "The stdole declaration". That paragraph says calling GetTypeInfoCount "ends the run" and that the arguments are not checked because twinBASIC has no type for them; the cause is that the call is late-bound, and the run ends only for lack of an error handler, so reword it now whether or not this is fixed. When fixed, say that stdole.IDispatch can be called, and drop the advice to declare a copy (the Declaration section's "The declaration in stdole is no use" sentence too). -->

---

## A module-level `Single` array `Const` whose element overflows holds infinity, and a later array `Const` that calls `Sqr`, `Timer` or `Rnd` is refused with TB5001

**Describe the bug**
Follow-up to #2475, which is fixed in BETA 1005 for the element types it reported: an element too large for a `Long`, `Integer`, `Byte` or `LongLong` array `Const` is now TB5001 on its own line. This is the `Single` case, which #2475 gave as a second crash under Additional context: it no longer crashes, but it is still wrong. At module level, an array `Const` of `Single` whose element is too large for a `Single` compiles without a diagnostic, and the element reads as infinity. An array `Const` declared after it, whose element calls `Sqr`, `Timer` or `Rnd`, is then refused with TB5001, *Type mismatch*, although it is correct and compiles on its own. Observed in the IDE's diagnostics and in a run.

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
VB6 has no array constants, so there is no VB6 project.

What reproduces it: `Array(3.5E+38)` in place of `Array(1E+39)`; `Timer` or `Rnd` in place of `Sqr(4)`, when that constant is the first array `Const` after `Big` (a second one after it compiles). What does not: `Root` declared before `Big`; an element of `Abs(-4)` or a literal after `Big`; the same `Single` constant declared inside a procedure, which is not accepted silently (the run ends with an error when the procedure is reached). The order and the three functions suggest an overflow flag left set while `Big` is evaluated, which the next constant's call then reads as an error; that is an inference.

Severity: a silent wrong value, an element that holds infinity where a compile error belongs, and a compile error on a correct constant that names neither the cause nor the line that has it.

<!-- Reproducer: bugs/single-array-const-overflow/ (mode test: `tbrun --tests` judges the compile cases, PASS or FAIL each; expect lists the nine PASS and two FAIL lines); verified on BETA 1005 by `bug_repro.mjs verify`. The Timer-after-Big, scalar-at-its-use and scalar-unused (no diagnostic) variants were checked with tbrun on 1005 in scratch trees that are not kept, and so were 3.5E+38, Rnd, the reverse order, Abs, a literal and the local constant. Follow-up to #2475 ("A module-level array Const with an element that does not fit its type crashes the compiler"), closed as fixed in BETA 1005; its own reproducer no longer crashes, and was deleted. Stated in docs/Reference/Core/Const.md, "Array constants", in a WARNING naming BETA 1005: when fixed, the WARNING goes, and the paragraph above it says that an element too large for a Single is TB5001 as well. -->

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
What does not reproduce it: evaluating nothing at the first stop, after which F5 stops again at once, in `Main` on the line after `DoEvents` (`Loop`), where `? 1` prints `1`; and a break that lands in the program's own code rather than in `DoEvents`, where the Debug Console and watches work. A name that the package's procedure cannot see, such as a local of `Main`, ends the program as `? 1` does.

Severity: high. Breaking into a loop that calls `DoEvents` is an everyday way to see what a program is doing, and a watch left over from earlier is enough to end the program at the stop.

<!-- Asserted by `ide-test.bat --only break-into` (test/ide/break-into.test.mjs: the stop in the package and F5's second stop, ? 1 there, and a watch). The lane clears the Debug Console after each crash it asserts, because tb-lane.mjs fails a lane whose console holds a NATIVE EXCEPTION line. The reproducer's Startup.twin is test/ide/probes/break-into/Sources/Startup.twin with a different header comment. When fixed: update that test and this entry. -->

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
What does not reproduce it: `tot` after leading spaces, which opens the list with `total`; and a dot after `?` and a space, `? items.`, which opens the list with the `Collection`'s members, so only the names are missing there. With Ctrl+Space at the end of the line, `Touch tot`, an argument of a Sub call, opens the list with `total`, and `Call Tou` and `total = to` open none, so names are missing after `Call` and on the right of an assignment as well. Typed key by key, `Call Tou` goes wrong sooner, for a separate reason: the space after `Call` accepts the list's first entry, and the line becomes `CallByDispId()`. With no program running, Ctrl+Space gives the same results: `Mai` offers `Main`, and `? Mai` opens no list.

Severity: low to moderate. Name completion does not work in the form the console is nearly always typed in, and leaving out the space after `?` is the only way round it.

<!-- Asserted by `ide-test.bat --only console-completion` (test/ide/console-completion.test.mjs: ?tot, tot, tot after leading spaces and Touch tot offer total; ? tot, Debug.Print tot, Call Tou and total = to open no list; ? items. offers the Collection's members; with no program running, Mai offers Main and ? Mai opens no list). The lane puts each line in the console's input and presses Ctrl+Space; typed key by key, ? tot, ?tot, tot, tot after leading spaces, Debug.Print tot and ? items. do the same, which is not asserted. The reproducer's Startup.twin is test/ide/probes/console-completion/Sources/Startup.twin with a different header comment. When fixed: update that test and this entry. -->

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
What does not reproduce it: a word that is already the list's first entry, and not a procedure, keeps its space, so `total = 6` stays as it is. `? total` and `Debug.Print total` stay as they are. Escape before the space closes the list, and the space is then typed. With the IDE's IntelliSense mode set to LEGACY or MANUAL, the list does not open while the first word of a line is typed, and `Print total` and `Call Touch(total)` stay as they are.

In the default mode, MODERN, the console asks for the list after every key and answers within a few milliseconds, so the list is open at the space whenever a line is typed at an ordinary speed. Every keyword that starts a longer name is replaced in the same way, and the others type as they are: `Do` becomes `DockModeConstants`, `For` becomes `FormArrangeConstants`, `On` becomes `OnErrorCatch`, `Get` becomes `GetAllSettings()` and `RaiseEvent` becomes `RaiseEventByName()`, while `Dim`, `End`, `Exit`, `With`, `Open`, `Close`, `ReDim`, `Stop` and `GoTo` stay. The same happens with no program running: `Print 1 + 1` becomes `Printer1 + 1`.

Severity: moderate. `Print`, `Call` and `Set` begin lines that are often typed in the console, and each becomes a line the console refuses. The only ways round it are Escape before the space and another IntelliSense mode.

<!-- Asserted by `ide-test.bat --only console-space` (test/ide/console-space.test.mjs: with the run stopped at BREAK and each line typed key by key, Print total becomes Printertotal, Call Touch(total) becomes CallByDispId(Touch(total)) and Set obj = items becomes SetAttr(obj = items), and the console refuses each; Print, Escape and then the rest give Print total, which prints 5; total = 6, ? total and Debug.Print total type as they are; with no program running, Print 1 + 1 becomes Printer1 + 1). The lane waits after each key for the console's answer to it, as a person typing at an ordinary speed sees the list. The reproducer's Startup.twin is test/ide/probes/console-space/Sources/Startup.twin with a different header comment. Related: "The Debug Console offers no completion for a name typed after `?` and a space", whose Additional context mentions this one. When fixed: update that test and this entry. -->

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

The documentation's build harness does steps 1 to 4 and prints each differing value: `node scripts/probe_build_twice.mjs`, with `--arch win64` for the win64 target.

**Expected behavior**
Nothing from the compiler's own memory ends up in the exe, and the padding after the block is zero, so two builds of this project differ only in the PE time stamp and the checksum that follows from it.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The values are addresses in the compiler process. After a build with the IDE left open, a read-only query of the memory map of the IDE's child processes (`VirtualQueryEx`; nothing was read from their memory) found both values of that build's exe in committed, private, read-write memory of the compiler process: `twinBASIC_win64_noDEP.exe` for a win64 build, and `twinBASIC_win32_noDEP.exe` for a win32 build. In the IDE's other child processes, both values fell in free address space. For win64 this is conclusive: only 3 of 200,000 random values below 2^47 fell in that process's committed memory. For win32 it is weaker, since 20,497 of 200,000 random 32-bit values did too.

A single byte after the block also differs now and then: `1c` against `18` in win32, and `38` against `30` in win64. It reads as a count of 7 or 6 pointer-sized items; what it counts is not known.

What VB6 does (the project attached as `build-writes-compiler-addresses-vb6.zip`, a Standard EXE whose `Sub Main` is empty, built twice in one folder): its exes are not identical either. Outside the time stamp and the checksum, they differ in the time stamps of the nine resource directories when the two builds fall in different seconds, in two random 16-byte identifiers, and in one 4-byte value that has the form of a heap address (from 0x00673ed8 to 0x009841a8 over eight builds; not confirmed against VB6's memory). But VB6 compresses nothing, so its one value changes 3 bytes, and in eight builds its exes never changed size or layout.

What did not reproduce it: nothing in the project is needed. The console project with an empty `Sub Main` shows it, so no class, form or setting is involved. The harness stages the project into the same folders, with the same build path, before each build, so no path is what differs.

Severity: low. No difference in a running program was looked for. Builds are not reproducible: two builds of one project cannot be compared, cached or signed by hash, and now and then the code itself differs.

<!-- Reproducer: bugs/build-writes-compiler-addresses/ (mode probe: scripts/probe_build_twice.mjs builds it twice, each build in an IDE of its own, and prints what differs; --arch win64 for the win64 target, and --vb6 builds its vb6/ project twice with VB6). The memory-map query is not scripted: a read-only VirtualQueryEx walk of the IDE's child processes after a tbbuild --keep build, 2026-10-06, with the IDE then ended by its pid. Not part of this entry: the random 16-byte identifiers that a form or a used class adds to the exe, since VB6 writes such identifiers too; and the type library's id, which the build generates anew unless Use Project ID for type library ID is on (docs/IDE/Project Settings.md). No page of the documentation mentions the defect, so when it is fixed there is nothing to update besides this entry and its reproducer. -->

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
What did not reproduce it: `Host.CurrentProject.RootFolder.Parent`, the parent of the project's folder, reads fine, and its `Path` is `twinbasic:/`, the file system's root. An add-in that reads neither does not crash.

Severity: crash. The crash is in the read, so no `On Error` handler helps, and an add-in that walks up the tree with `Parent` until `Is Nothing` crashes the compiler on every start, until its DLL is removed. The workaround is to stop at the folder whose `Path` is `twinbasic:/` without reading its `Parent`.

<!-- Reproducer: bugs/rootfolder-parent-crash/ (mode lane: an add-in has to be built into an IDE's add-in folder, which nothing here may do outside a lane, so `verify` runs the lane). Asserted by `addin-test.bat --only parent` (test/addin/parent.test.mjs, cases a to e; case f is the control that does not crash; the ParentProbe add-in is test/addin/probes/parent), which passes while the bug is there. The reproducer is a cut-down copy of that add-in, compiled clean by `bug_repro.mjs compile`, and not itself run in a lane. Stated in docs/Reference/Built-In/tbIDE/FileSystemItem.md, the WARNING under "Parent", and in WIP.HelpAddin.md (P21): when fixed, the WARNING goes and the page states what Parent of the root is, with no mention of the defect; update the lane's tests (parent.test.mjs, which then assert the fixed behaviour) and P21. -->

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
This extends #2345, which reports the first row of the table, and is part of #56. `FileCopy` raises VB6's numbers, since #2451 fixed it.

The same in a built exe as in the IDE, and the same with the project setting *Use Unicode Standard Library* set to No. In code compiled with LLVM the number is the same, and the description is *Application-defined or object-defined error*.

What does not reproduce it: the `DirListBox` and `FileListBox` controls trap the error themselves, and raise 76 for a `Path` that does not exist, as VB6 does.

Severity: moderate. An error is raised wherever VB6 raises one, so no failure goes unreported. But a handler that tests for the number does not recognise the error, a handler that shows `Err.Description` shows *Unspecified error*, and code that decides a file exists from `Err.Number <> 53` decides wrongly.

<!-- Reproducer: bugs/file-errors-unspecified/ (mode run; expect lists the 37 lines that print -2147467259, so a fix of some statements and not others shows as NO LONGER REPRODUCES). verify reproduces on BETA 1005; VB6 side in vb6/, built and run by bug_repro.mjs vb6; the built-exe and LLVM results and the Use Unicode Standard Library check are from probes in a local scratch folder, not in the repository. Found while testing scripts/imagestrip/, a twinBASIC console program that strips the metadata from the images in the IDE's CSS files. Stated in a NOTE naming BETA 1005 on each of these pages: docs/Reference/Core/Open.md, Name.md, Get.md, Put.md, Print.md (under "Writing to a file") and Line-Input.md; docs/Reference/Default/VBA/FileSystem/Kill.md, GetAttr.md, SetAttr.md (the NOTE, not the WARNING, which belongs to the SetAttr entry), FileLen.md, FileDateTime.md, MkDir.md, RmDir.md, ChDir.md, EOF.md, LOF.md, Loc.md, Seek.md and FileAttr.md. When a statement is fixed, its NOTE goes, and its page states the error number it raises with no mention of the defect. -->

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: low, but silent. No error is raised, and the file's attributes change where VB6 leaves them alone: the file stays read-only until its attributes are set back.

<!-- Reproducer: bugs/setattr-open-file-no-error/ (mode run; expect lists the four lines for the write modes). verify reproduces on BETA 1005; VB6 side in vb6/. Found while checking the error numbers of the file statements (the entry above). Stated in docs/Reference/Default/VBA/FileSystem/SetAttr.md: the sentence that SetAttr sets the attributes of an open file without an error, and the WARNING after it, naming BETA 1005. The VBA-Docs sentence it replaced ("A run-time error occurs when setting the attributes of an open file") was true of neither product as written. When fixed, the WARNING goes and the sentence says that SetAttr raises error 55 for a file open for Output, Append, Binary or Random, and sets the attributes of a file open for Input. -->

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
VB6 has no comparison: a VB6 project cannot declare an `Interface`, and the interfaces of the type libraries it references are hidden from it, as #2486 said.

The object `As New` builds is the one #2486 described: `TypeName` gives the interface's name, `ObjPtr` is not 0, `ErrorContext.Number` reads 0, and an inherited member ends the run with `NATIVE EXCEPTION: ACCESS_VIOLATION` (step 3, checked in a run on BETA 1005).

Severity: low in practice, since few programs write `As New` on an interface, but the compile-time check #2486 added does not cover it, and the result is a silent wrong value or a crash.

<!-- Reproducer: bugs/dim-as-new-interface/ (mode test: `tbrun --tests` judges the compile cases; expect lists the six PASS and five FAIL lines); verified on BETA 1005 by `bug_repro.mjs verify`. Step 3 was run with tbrun on 1005 in a scratch tree that is not kept (local, module-level and class-field As New, and the access violation on the inherited member). Follow-up to #2486 ("New on an Interface compiles, and a call on the object returns a default value, or ends in an access violation for an inherited member"), closed as fixed. No documentation page states it: docs/Reference/Core/New.md describes As New on classes only. -->

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
VB6 crashes too. The same calls on the connection point of a VB6 class with an event, made through `DispCallFunc` (the VB6 project is attached as `connection-point-null-pointer-crash-vb6.zip`; the environment variable `CASE`, 1 to 8, picks the call, and 2 is `GetConnectionInterface` with a null pointer), each end the exe with an access violation, `0xC0000005` in `MSVBVM60.DLL`. As for #2488, a fix costs no compatibility: no program depends on the crash.

What does not crash: each call given a valid pointer. `FindConnectionPoint` with the point's own interface identifier returns it, and with `GUID_NULL` it fails with `CONNECT_E_NOCONNECTION` (`&H80040200`), as the contract says (VB6 returns `E_NOINTERFACE` there).

Severity: low in practice, since a program rarely passes a null pointer, but a COM client written in any language can, and the object crashes the process that hosts the class instead of refusing the call.

<!-- Reproducer: bugs/connection-point-null-pointer-crash/ (mode test: `tbrun --tests` runs each [TestCase] in the compiler's test mode, where the access violation ends the case and not the run; expect lists the three PASS and five FAIL lines); verified on BETA 1005 by `bug_repro.mjs verify`. The same five calls end a run with the access violation in an IDE run as well (tbrun probes on 1005, scratch, not kept). VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` runs case 2, and each of cases 2 and 5 to 8 was run with CASE set, all crashing in MSVBVM60.DLL; cases 1, 3 and 4 are the controls. Follow-up to #2488 ("IConnectionPoint.Advise(Nothing) on a twinBASIC class's connection point ends in an access violation"), closed as fixed. No documentation page states it; docs/Reference/COM-Interfaces/IConnectionPoint.md describes Advise with Nothing only. -->

---

## A failure code from a late-bound call is raised as the HRESULT, where VB6 raises its own error number, such as 450 for DISP_E_BADPARAMCOUNT

**Describe the bug**
Follow-up to #2490, which is fixed in BETA 1005 for a name the object does not have: a late-bound statement and `CallByName` now raise error 438, as VB6 does. This is the rest of the conversion VB6 makes when `IDispatch::Invoke` fails. For eleven failure codes VB6 raises one of its own error numbers, and twinBASIC raises the `HRESULT` itself, so a handler written for VB6 or VBA does not recognise the error. The common one is a call with the wrong number of arguments to an object such as a `Collection`, a `Scripting.Dictionary` or a `Scripting.FileSystemObject`: VB6 raises 450, *Wrong number of arguments or invalid property assignment*, and twinBASIC raises `&H8002000E` (`DISP_E_BADPARAMCOUNT`), *Invalid number of parameters.* Observed by running the reproducer's test cases.

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
   | `DISP_E_NOTACOLLECTION` `&H80020011` | 451 | -2147352559 |

   An ordinary object gives the last code as well: `x = d.Count(1)`, where `d` is an `Object` holding a `Scripting.Dictionary`, raises -2147352559 in twinBASIC and 451, *Property let procedure not defined and property get procedure did not return an object*, in VB6 and 64-bit VBA.

The module below is the reproducer's, and is meant to be adapted as a regression test. Each expected number is VB6's, from the VB6 project. On BETA 1005 the three cases from #2490 and the three codes twinBASIC already converts pass, and the codes of the table and the `Collection` and `Dictionary` calls fail.
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

    [TestCase]
    Public Sub NotACollection_Raises451()
        Dim o As Object = New HResultObject
        On Error Resume Next
        o.Hr80020011                                    ' DISP_E_NOTACOLLECTION
        Assert.Strict.AreEqual 451, Err.Number        ' VB6: 451, Property let procedure not defined and property get procedure did not return an object
    End Sub

    [TestCase]
    Public Sub NotACollection_Dictionary_Raises451()
        Dim d As Object = CreateObject("Scripting.Dictionary")
        Dim x As Variant
        On Error Resume Next
        x = d.Count(1)                                  ' Count takes no index
        Assert.Strict.AreEqual 451, Err.Number        ' VB6: 451
    End Sub

End Module
```

**Expected behavior**
The error number VB6 raises for each code in the table, with VB6's description, as twinBASIC already does for `DISP_E_MEMBERNOTFOUND` (438), `DISP_E_TYPEMISMATCH` (13) and the others listed below.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
twinBASIC already raises VB6's number for `DISP_E_MEMBERNOTFOUND` (438), `DISP_E_TYPEMISMATCH` (13), `E_INVALIDARG` (5), `DISP_E_OVERFLOW` (6), `DISP_E_DIVBYZERO` (11), `DISP_E_BADVARTYPE` (458), `DISP_E_PARAMNOTFOUND` (448) and an `HRESULT` of the form `&H800A....` (its low word, 424 for `&H800A01A8`). `E_POINTER`, `E_FAIL`, `E_UNEXPECTED` and `&H8007000D` are raised as themselves by both, from a statement.

The wrong number of arguments, on objects that are not twinBASIC's: `Dictionary.Add "k"` (one argument of two), `Dictionary.Add "k", 1, 2`, `Dictionary.Count = 5`, `x = Dictionary.Exists()`, `x = FileSystemObject.GetFileName()`, `x = FileSystemObject.BuildPath("a")` and `x = Collection.Item(1, 2)` each raise -2147352562 in twinBASIC and 450 in VB6.

Not part of this report: VB6's `CallByName` raises 440, *Automation error*, for the four codes that a statement leaves as they are, where twinBASIC's raises the code itself. The numbers in the table are the same for a statement, for `x = o.Name` and for `CallByName` in VB6.

Severity: code ported from VB6 that tests `Err.Number` for 450, 449 or 9 after a late-bound call does not recognise the error, and the description is the system's text for a COM code instead of VB's.

<!-- Reproducer: bugs/latebound-hresult-mapping/ (mode test: `tbrun --tests`; expect lists the six PASS and thirteen FAIL lines, each with the number BETA 1005 raises); verified on BETA 1005 by `bug_repro.mjs verify`; `DISP_E_NOTACOLLECTION` and its two cases added on BETA 1010 by the run-time errors work (batch 6a: errors/VBA.Interaction.yml), with SetCode 25 and the Dictionary line on the VB6 side. VB6 side in vb6/ (VB6 6.0; a lightweight IDispatch object whose Invoke returns the code, and the ordinary objects): `bug_repro.mjs vb6` prints the table's VB6 column. The Dictionary and FileSystemObject cases and VB6's CallByName column were run in scratch projects (twinBASIC with tbrun, VB6 through scripts/lib/vb6.mjs) that are not kept. Follow-up to #2490 ("A late-bound call to a member that does not exist raises &H80020006, and CallByName raises &H80004005, where VB6 raises 438"), closed as fixed. Stated in docs/Reference/COM-Interfaces/IDispatch.md, the table under "Errors from a late-bound call" (its row "Invoke returns any other failure code: that code as the error number"); when fixed, that row lists VB6's numbers instead. -->

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
What does not reproduce it: `Err.Raise Number` with the number in a variable or a parameter, with or without a source and a description; a run-time error the member does not raise itself, such as a division by zero (11) or `Collection.Item` with an index past its end (9), which arrive as themselves; any early-bound call. What does: `Err.Raise` with a constant number, with or without a constant source and description (`Err.Raise 5`, `Err.Raise 1234` as well as 380); the `Error` statement; a `Property Let`; a late-bound statement and `CallByName` alike; the built exe as well as an IDE run. The `&H80020009` is what `IDispatch::Invoke` returns when the member raised an error, with the error in the `EXCEPINFO`; so the constant-number form seems to leave the `EXCEPINFO` without the number the caller reads, which is an inference.

Severity: moderate. Code that uses an `Object` variable or `CallByName`, as code ported from VB6 or written for scripting often does, cannot tell one error from another when the member raises with a constant number, which is the usual way to write `Err.Raise`, and the description it gets is *Exception occurred.*

<!-- Reproducer: bugs/latebound-constant-raise-exception/ (mode test: `tbrun --tests`; expect lists the three PASS and seven FAIL lines with -2147352567); verified on BETA 1005 by `bug_repro.mjs verify`. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints 438 for Nope and 380 for each other call. The variable-number, run-time-error, Err.Raise 5 and 1234 and built-exe (tbrun --exe) results come from scratch tbrun trees on 1005 that are not kept. Found while writing the tests of colour-validation-data-ole-multiframe, whose first draft set the properties with CallByName and got &H80020009 for every control. Follow-up to #2490 ("A late-bound call to a member that does not exist raises &H80020006, and CallByName raises &H80004005, where VB6 raises 438"), closed as fixed. Stated in a NOTE naming BETA 1005 in docs/Reference/Default/VBA/ErrObject/Raise.md, docs/Reference/Core/Error.md and docs/Reference/Default/VBA/Interaction/CallByName.md; when it is fixed, the three NOTEs go and the pages state nothing about it. -->

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
A successful `export` and `import` end `... DONE` and exit 0, as they should.

Severity: minor in an interactive session, where the `ERROR:` line is read; in a build script that checks the exit code, a project that was never written, or a tree that was never exported, passes for a success.

<!-- Reproducer: bugs/import-export-exit-zero/ (mode cli: the five commands above on copies of the packed project and its src/, expecting exit 0 from each, each ERROR line, ... FAILED, and no ... DONE); verified on BETA 1005 by `bug_repro.mjs verify`. The batch script was not run here, since this repository starts the compiler executable only on a private desktop (launchOnDesktop): the same five commands were, by bug_repro's cli mode on 1005. Follow-up to #2493 ("import of a folder with no Settings file fails without saying why"), closed as fixed. Stated in WIP.md ("Both verbs exit 0 after the failures they report") and WIP.Harness.md: when fixed, those can say since which build the exit code is reliable; scripts/impexp.mjs, which the tooling uses instead, is not affected. -->

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
What does not reproduce it, on BETA 1005: a watch on `p`, a watch on `p.X`, and **Variables**, which shows `p` and its fields. Seen with a `Private Type` declared in the module; other declarations of the type were not tried.

Severity: low. The console reports a failed build for a line that only asks to print a structure.

<!-- Reproducer: bugs/console-print-udt-linker-error/ (mode lane: `ide-test.bat --only watches`, test/ide/watches.test.mjs, whose first three tests assert the fixed watch and whose last asserts the ? p defect; the lane passes while the bug is there); its Startup.twin is test/ide/probes/watches/Sources/Startup.twin with a different header comment. Verified on BETA 1005 by `bug_repro.mjs verify` through the lane. Follow-up to #2485 ("A watch on a variable of a user-defined type fails with a codegen error, and the Debug Console reports a linker error at every stop"), closed as fixed. No documentation page states it. When fixed: update the last test of test/ide/watches.test.mjs to assert the new message, and retire the reproducer. -->

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
 - twinBASIC compiler version: BETA 1010

**Additional context**
On BETA 1005 every case of the table was run on its own, in the IDE and in a 32-bit exe. A 64-bit exe of cases 4 and 5 on BETA 1005 does what the 32-bit one does.

What does not reproduce it: neither procedure compiled with LLVM (cases 1 and 2), and an LLVM-compiled procedure that handles an error its own statement causes (case 3). An error raised by `Err.Raise` and one caused by a division by zero behave the same; so do `On Error GoTo` and `On Error Resume Next`, and a callee reached through an ordinary procedure (case 12). With LLVM turned on for the whole project, every procedure is compiled with LLVM, so cases 1 and 2 end the run as well, in the IDE and in an exe; case 3 still works.

Severity: high for a program compiled with LLVM. An error that the caller handles ends the program, and with a callee compiled with LLVM it ends with an access violation. In the IDE the run ends without a message, so the cause is hard to find. No wrong result is produced. Compiling both procedures without LLVM avoids it.

<!-- Reproducer: bugs/llvm-error-not-passed-to-caller/ (mode run: `Sub Main` runs the 12 cases in order and the run ends silently at case 4; expect is tbrun exit 5, the output of cases 1 to 3 and the name of case 4, and absent the result line of case 4 and `end of Main`; verify reproduces on BETA 1005). expect judges case 4 only: when verify says NO LONGER REPRODUCES, set FirstCase in Startup.twin to 5 and run again, because a fix of the callee case alone leaves the caller cases. Test mode was tried and is not used: `tbrun --tests` honours the per-procedure attribute, but the first LLVM case waits 120 s (`no answer from the compiler after 120 s`) and every case after it fails with `main thread is busy`, so one run cannot tell the cases apart. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints the table's VB6 column. The exe results are from `tbrun --exe` (and `--arch win64`) on scratch copies of src/ whose Startup prints with TbRun.Out, one case per run, not kept; the project-wide LLVM results are from `tbrun --llvm --exe` on the same. Stated in a WARNING naming BETA 1005 in docs/LLVM/Getting-Started.md, "Language support", after the sentence "The main feature not yet supported is passing an error up to the calling procedure. A fix is planned.": when fixed, the WARNING and that sentence go. The entry "A `ParamArray` element that is a `Variant` variable holding an array..." mentions the LLVM-exe case in its Additional context ("a separate defect of LLVM-compiled code"): name this entry's issue there once it is filed, and drop the sentence when this is fixed. Not narrowed, so not in the entry: an LLVM-compiled procedure whose handler re-raises the error with `Err.Raise Err.Number`, called from an ordinary procedure with a handler, left the BETA 1005 exe running until it was ended. -->

---

## Format Selection from a continuation line fails with *IDE startup failure*, and closes an IDE that was opened with its project

**Describe the bug**
Edit > Format Selection on a selection whose first line continues the line above it (the line above ends in ` _`) formats nothing, and the IDE's page raises `TypeError: Assignment to constant variable.` When the IDE was started with the project on its command line, as it is when a `.twinproj` is opened from Explorer, the error is shown as an alert headed *IDE startup failure*, and after the alert the IDE closes itself: at once when nothing is unsaved, and after asking whether to save when something is. Started from its icon, with the project opened from the New / Open dialog, the IDE prints the same error in the DEBUG CONSOLE and stays open. It was observed in an IDE started with an `APPDATA` of its own, by recording the page's alerts and watching the IDE's process.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a project by double-clicking its `.twinproj`, so that the IDE starts with it. Add this procedure to a module, and save:
   ```
   Public Sub Continued()
       Dim a As Long, _
           b As Long
       Select Case a
           Case 1
               a = 2
       End Select
   End Sub
   ```
2. Select from the start of the line `b As Long` to the end of `Select Case a`, and choose Edit > Format Selection.
3. An alert reads `IDE startup failure (BETA twinBASIC IDE BETA 1005):`, then `JS Promise Rejection(1):`, `Assignment to constant variable.` and a stack trace through `provideDocumentRangeFormattingEdits`. Nothing is formatted. Click OK: the IDE closes.
4. Open the project again, change anything, and repeat step 2. After the alert the IDE asks *You've made changes to this project. Save now?*, with Save, Discard Changes and Cancel. Cancel keeps the IDE open; the other two close it.

**Expected behavior**
The selection is re-indented, as it is when it starts on any other line: the formatter moves the start up to the first line of the continued statement and formats from there. A failure inside a command does not close the IDE.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The cause, read from `ide\main.js` and `ide\main2.js`: `provideDocumentRangeFormattingEdits` declares the start line with `const` and then decrements it (`o--`) in the loop that moves the start up over the lines ending in `_`, which throws as soon as the selection starts on a continuation line. The rejection reaches `window.onunhandledrejection` in `main2.js`, which alerts *IDE startup failure* and calls `hostAppObject.CloseWindow` unless `reportIDEerrorsToDebugConsole` is set, and only `startNow`, the start without a project, sets it. So in an IDE opened with its project, any unhandled rejection in the page closes the IDE.

Format Selection on a selection that starts on any other line, the `Select Case` line included, works. Format Document, on the same text, works.

Severity: high. The IDE closes during ordinary editing. Nothing is lost if the question in step 4 is answered Save or Cancel, but Discard Changes, a likely answer to a question nobody expected, loses every unsaved change.

<!-- Reproducer: bugs/format-selection-continuation/ (mode lane: asserted by `ide-test.bat --only code-editor` (test/ide/code-editor.test.mjs), the tests "Format Selection on a selection that starts on a continuation line opens an IDE startup failure alert, and the IDE then closes" (nothing unsaved; the test then starts the lane's next IDE on the project) and "with unsaved changes, the same Format Selection changes nothing, and the IDE asks to save them before it closes" (answered Cancel); the control "Format Selection re-indents a selection that starts on a Select Case line" passes too, all on BETA 1005). The start from the icon (the error in the DEBUG CONSOLE, no alert, no close) was tried once with a probe that is not kept. No project and no zip: the steps give the code. A page of docs/IDE/Code/, the "Writing code" chapter now being written, will carry a WARNING for it where it describes Format Selection; when a fixed build is released, that WARNING goes. Found 2026-10-11 in the trials for the Writing code pages (the fact sheet's defect 2); that the IDE closes was found while writing the lane. -->

---

## Find with Whole Word Only never finds a match at the very start of the file

**Describe the bug**
With Whole Word Only ticked, the Find / Replace panel never finds a match that begins at line 1, column 1 of the file. Find Next passes over it, and the search ends with *The specified region has been searched.* No message says that a match was skipped. It was observed by operating the panel with mouse and key events in an IDE started with an `APPDATA` of its own, and reading the selection after each Find Next.

**To Reproduce**
Steps to reproduce the behavior:
1. Open any project and a module whose first line is its `Module` line, with nothing above it, such as:
   ```
   Module Finder
       Public Sub Main()
           Debug.Print 1
       End Sub
   End Module
   ```
2. Put the caret on line 2 and press Ctrl+F. Type `Module` in Find What and tick Whole Word Only; Current File and Direction All are as Ctrl+F sets them.
3. Click Find Next: the `Module` of `End Module` is selected. Click Find Next again: *The specified region has been searched.* So it goes on every later press: the `Module` at line 1, column 1 is never selected.
4. Clear Whole Word Only and repeat from step 2: the second press selects line 1, column 1.

**Expected behavior**
The second press selects the `Module` at line 1, column 1. The start of the file is a word boundary, as the start of any other line is.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The cause, read from `ide\main.js`: `doFindMatch` takes the character before and the character after a match with `charAt`, and treats each as a boundary when its `charCodeAt(0)` is below 128 and it is not a letter or a digit. Before the first character of the text searched, `charAt` returns an empty string, whose `charCodeAt(0)` is `NaN`, so the match is taken to be inside a word and is skipped. The same code skips a match that ends at the last character of the text searched; that, and a match that starts exactly at the caret (the text searched starts there), were not tried.

Severity: moderate. The search reports the region searched while it has skipped a match, and nothing shows it.

<!-- Reproducer: bugs/find-whole-word-file-start/ (mode lane: asserted by `ide-test.bat --only code-find` (test/ide/code-find.test.mjs), the test "with Whole Word Only, Find Next never finds Module at line 1, column 1", which passes on BETA 1005; the control without Whole Word Only, the test before it, passes too). No project and no zip: the steps give the code. A page of docs/IDE/Code/, the "Writing code" chapter now being written, will carry a WARNING for it where it describes Whole Word Only; when a fixed build is released, that WARNING goes. Found 2026-10-11 in the trials for the Writing code pages (the fact sheet's defect 5). -->

---

## Find with Regular Expressions finds nothing when the pattern holds a capital letter

**Describe the bug**
With Regular Expressions ticked, a pattern that holds a capital letter finds nothing unless it carries the `i` flag: `/End Sub/` ends with *The specified region has been searched.* in a file full of `End Sub`, while `/end sub/` and `/End Sub/i` find it. With Match Case clear, the panel searches the file's text in lower case but leaves the regular expression as it was typed; and ticking Regular Expressions clears Match Case (ticking Match Case clears Regular Expressions), so a regular expression always runs against the text in lower case. It was observed by operating the panel with mouse and key events in an IDE started with an `APPDATA` of its own.

**To Reproduce**
Steps to reproduce the behavior:
1. Open any project and a module that holds `End Sub`. Press Ctrl+F and tick Regular Expressions; Match Case is cleared.
2. Type `/End Sub/` in Find What, put the caret at line 1, column 1, and click Find Next: *The specified region has been searched.*
3. Type `/end sub/`, or `/End Sub/i`, instead: Find Next selects `End Sub`.

**Expected behavior**
`/End Sub/` finds `End Sub`. Either the search runs on the text as it is, with the `i` flag added when Match Case is clear, or Match Case can be ticked together with Regular Expressions to make the search case-sensitive.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The cause, read from `ide\main.js`: the Find Next code lower-cases the text searched (`toLowerCase`) when Match Case is clear, and `createRegexFromUserString` builds the expression from the pattern as typed, adding only the `m` flag. A class such as `\D` (not a digit) matches lower-case text as before, so `/\Dim/` still finds `Dim`: only a literal capital letter fails.

Severity: moderate. The search reports nothing found for text that is there.

<!-- Reproducer: bugs/find-regex-capital-letter/ (mode lane: asserted by `ide-test.bat --only code-find` (test/ide/code-find.test.mjs), the test "a regular expression with a capital letter, /End Sub/, finds nothing", which passes on BETA 1005; the control "a regular expression in lower case, or with the i flag, finds End Sub" passes too). No project and no zip. A page of docs/IDE/Code/, the "Writing code" chapter now being written, will carry a WARNING for it where it describes Regular Expressions; when a fixed build is released, that WARNING goes. Found 2026-10-11 in the trials for the Writing code pages (the fact sheet's defect 6). -->

---

## A regular-expression match that spans a line break is shown as an empty selection, and Find Next does not move past it

**Describe the bug**
When a regular expression in the Find / Replace panel matches across a line break, Find Next selects nothing: it puts the caret at the end of the line where the match starts, with an empty selection. The next Find Next finds the same match and stays at the same place, so the search can go no further. It was observed by operating the panel with mouse and key events in an IDE started with an `APPDATA` of its own, and reading the selection after each Find Next.

**To Reproduce**
Steps to reproduce the behavior:
1. Open any project and a module in which an indented line comes before `End Sub`, such as:
   ```
   Module Finder
       Public Sub Main()
           Debug.Print 1
       End Sub
   End Module
   ```
2. Press Ctrl+F, tick Regular Expressions and type `/^\s+end sub$/` in Find What (in lower case: see the entry about capital letters). Put the caret at line 1, column 1 and click Find Next.
3. The selection is empty, at the end of the `Debug.Print` line. Click Find Next again: the selection is at the same place, however often it is clicked.

**Expected behavior**
The match is selected, from the line break to the end of `End Sub`, and the next Find Next goes on from the end of the match.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The cause, read from `ide\main.js`: `doFindMatch` turns the start of the match into a line and a column, but puts its end on the same line, at the start column plus the match's length. For a match that holds a line break that column lies past the end of the line, and the editor shortens the selection to the line's end. The next search starts from that place, which is before the match, and finds it again. The match starts at the line break because the IDE adds the `m` flag, so `^` also matches inside the line break. A match within one line, such as `/sub$/i`, is selected properly.

Severity: low. Patterns that span lines are rare, but Find Next cannot get past one.

<!-- Reproducer: bugs/find-regex-line-break/ (mode lane: asserted by `ide-test.bat --only code-find` (test/ide/code-find.test.mjs), the test "a match of /^\s+end sub$/, which spans a line break, is an empty selection, and Find Next stays on it", which passes on BETA 1005; its project, test/ide/probes/code-find, has a longer Main than the module above). No project and no zip. A page of docs/IDE/Code/, the "Writing code" chapter now being written, will carry a NOTE for it where it describes Regular Expressions; when a fixed build is released, that NOTE goes. Found 2026-10-11 in the trials for the Writing code pages (the fact sheet's defect 12). -->

---

## The Find / Replace panel's *Invalid RegExp:* alert leaves out the reason

**Describe the bug**
When the pattern in Find What is not a valid regular expression, Find Next shows an alert that reads only *Invalid RegExp:*, without saying what is wrong with the pattern. It was observed by recording the alerts of the IDE's page while operating the panel.

**To Reproduce**
Steps to reproduce the behavior:
1. Open any project and a module. Press Ctrl+F, tick Regular Expressions and type `/(/` in Find What.
2. Click Find Next. The alert reads `Invalid RegExp:` and nothing after the colon.

**Expected behavior**
The alert gives the reason, such as `Invalid RegExp: Invalid regular expression: /(/m: Unterminated group`.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The cause, read from `ide\main.js`: `createRegexFromUserString` calls `alert("Invalid RegExp:", e.message)`. `alert` shows its first argument only, so the message is dropped; `alert("Invalid RegExp: " + e.message)` would show it.

Severity: low.

<!-- Reproducer: bugs/find-regex-alert-reason/ (mode lane: asserted by `ide-test.bat --only code-find` (test/ide/code-find.test.mjs), the test "the alert for an invalid regular expression, /(/, reads only Invalid RegExp:", which passes on BETA 1005). No project and no zip. A page of docs/IDE/Code/, the "Writing code" chapter now being written, may name it in a NOTE where it describes Regular Expressions; when a fixed build is released, that NOTE goes. Found 2026-10-11 in the trials for the Writing code pages (the fact sheet's defect 13). -->

---

## After a search in Selected Text, the scope stays on a greyed Selected Text, and Find Next stops at once

**Describe the bug**
The Find / Replace panel ticks Selected Text when Ctrl+F is pressed with a selection of several lines. Once that selection is gone, after a click elsewhere in the code, the panel greys Selected Text but leaves it ticked, and ticks no other scope. Find Next then searches nothing: it asks at once whether to continue from the beginning, and finds nothing in the file. It was observed by operating the panel and the code editor with mouse and key events in an IDE started with an `APPDATA` of its own.

**To Reproduce**
Steps to reproduce the behavior:
1. Open any project and a module. Select three lines that hold the word `total` and press Ctrl+F: Selected Text is ticked. Type `total` in Find What and click Find Next: the first `total` in the selection is selected.
2. Click in the code on a line outside the selection. Selected Text is still ticked, and greyed; Current File is not ticked.
3. Click Find Next. At once: *End of search scope has been reached; do you want to continue from the beginning?*

**Expected behavior**
When Selected Text can no longer be used, the panel ticks Current File, as Ctrl+F does when there is no selection, and Find Next searches the file.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Ticking another scope, such as Current Procedure, recovers. Severity: low. The message suggests that the file holds no further match, while the search did not look.

<!-- Reproducer: bugs/find-scope-stuck-selected-text/ (mode lane: asserted by `ide-test.bat --only code-find` (test/ide/code-find.test.mjs), the test "after a search in Selected Text and a click in the code, Selected Text stays ticked but greyed, and Find Next stops at once", which passes on BETA 1005). No project and no zip. A page of docs/IDE/Code/, the "Writing code" chapter now being written, will carry a NOTE for it where it describes the scopes; when a fixed build is released, that NOTE goes. Found 2026-10-11 in the trials for the Writing code pages (the fact sheet's defect 9). -->

---

## The Diagnostics panel's Copy and Copy All put HTML in the text, and label an info or a hint {WARNING}

**Describe the bug**
The text that the DIAGNOSTICS panel's right-click menu copies holds the HTML the panel draws the diagnostic's code with: each message starts `<span>TB0018</span>`. Copy All also labels every row that is not an error `{WARNING}`, infos and hints included. It was observed in an IDE started with an `APPDATA` of its own, with the page's clipboard calls replaced by recorders, so that the copied text could be read.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a project with a warning and an info, such as one whose settings make TB0012 an info and TB0018 a warning, with this module:
   ```
   Module Helpers
       Public Const BigValue As Long = &H8000

       Public Function Twice(ByVal n As Long) As Long
           Return n * 2
       End Function

       Public Sub Narrowing()
           Dim narrow As Integer
           narrow = Twice(2)
       End Sub
   End Module
   ```
2. In the DIAGNOSTICS panel, right-click the TB0018 row and choose Copy. The text copied is `{WARNING} /<Project>/Sources/Helpers.twin [<line>,<column>]: <span>TB0018</span>implicit narrowing conversion from Long to Integer.  Use CInt(expression) to avoid this message.`
3. Click the Info counter on the status bar, so that the panel shows infos, right-click a row and choose Copy All. Every row's code is between `<span>` and `</span>`, and the info TB0012 is labelled `{WARNING}`.

**Expected behavior**
Plain text, with the code and the message apart: `{WARNING} /<Project>/Sources/Helpers.twin [<line>,<column>]: TB0018 implicit narrowing conversion...`, and infos and hints labelled as what they are, such as `{INFO}` and `{HINT}`.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The cause, read from `ide\main.js`: the panel adds each diagnostic with the caption `"<span>" + code + "</span>" + message`, the `<span>` styling the code, and `generateCopyPasteTextForProblem` copies the caption as it is, labelling severity 1 `{ERROR}` and every other severity `{WARNING}`. Copy All Errors copies the errors with the same `<span>`.

Severity: low. The copied report has to be cleaned by hand before it is pasted into an issue or a message.

<!-- Reproducer: bugs/diagnostics-copy-html/ (mode lane: asserted by `ide-test.bat --only code-editor` (test/ide/code-editor.test.mjs), the test "the Diagnostics panel's Copy puts the code in a <span>, and Copy All labels the info {WARNING}", which passes on BETA 1005; its project, test/ide/probes/code-editor, sets TB0012 to info and TB0018 to warning, and the test replaces navigator.clipboard.writeText and the copyClipboardIDE request in the page, so the Windows clipboard is never written). No project and no zip. A page of docs/IDE/Code/, the "Writing code" chapter now being written, will carry a NOTE for it where it describes the Diagnostics panel; when a fixed build is released, that NOTE goes. Found 2026-10-11 in the trials for the Writing code pages (the fact sheet's defect 3). -->

---

## The Outline panel lists a file's modules and classes but none of their members

**Describe the bug**
The OUTLINE panel shows only the top-level types of the active file, one row each, with no arrow to expand them: `Editing` for a module, `Ev` and `Ev2` for a file holding two classes. None of the procedures, properties, variables or other members is listed, so the filters in the panel's `...` menu (Show Procedures, Show Variables and the rest) change nothing. The symbols the panel receives for the file have an empty `children` list. It was observed in an IDE started with an `APPDATA` of its own, by reading the panel and the symbols it holds (`outlinePanel.cachedSymbols`).

**To Reproduce**
Steps to reproduce the behavior:
1. Open any project and a module that holds procedures, such as:
   ```
   Module Editing
       Public Sub Main()
       End Sub

       Public Sub Plain()
       End Sub
   End Module
   ```
2. Show the OUTLINE panel. It shows one row, `Editing`, with no arrow, and neither `Main` nor `Plain`.

**Expected behavior**
The module's row expands to its members, `Main` and `Plain`, as the panel's filters and its Sort Alphabetically option assume.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The symbols reach the panel's `syncSymbols` with `children: []` for every type, so either the compiler sends no members or the IDE drops them before the panel; which of the two was not settled.

Severity: moderate. The panel cannot be used to move around a file.

<!-- Reproducer: bugs/outline-no-members/ (mode lane: asserted by `ide-test.bat --only code-editor` (test/ide/code-editor.test.mjs), the test "the Outline lists the module Editing and none of its procedures", which passes on BETA 1005; the two-class file is from the trials, not the lane). No project and no zip. A page of docs/IDE/Code/, the "Writing code" chapter now being written, will carry a NOTE for it where it describes the Outline panel; when a fixed build is released, that NOTE goes. Found 2026-10-11 in the trials for the Writing code pages (the fact sheet's defect 4). -->

---

## Go To Definition, Ctrl+Up and Ctrl+Down put the caret on the line after a declaration

**Describe the bug**
Go To Definition (F12 or Shift+F2) on the name of a procedure puts the caret on the line after the procedure's declaration, the first line of its body, instead of on the declaration. In the trials the same happened for a class member reached through an object variable, and for a class name (line 2 of a class declared on line 1). Ctrl+Down and Ctrl+Up, which move to the next and the previous procedure, also put the caret on the first line of the body, at column 1. Go To Definition on a local variable or an enum member puts the caret on its declaration. It was observed by pressing the keys in an IDE started with an `APPDATA` of its own and reading the caret's place.

**To Reproduce**
Steps to reproduce the behavior:
1. Open any project with a module:
   ```
   Module Helpers
       Public Function Twice(ByVal n As Long) As Long
           Return n * 2
       End Function
   End Module
   ```
   and, in a procedure of another module, the line `total = Helpers.Twice(3)`.
2. Put the caret on `Twice` in that line and press F12. `Helpers.twin` opens with the caret on `Return n * 2`, the line after `Public Function Twice`.
3. In a module with several procedures, put the caret in the first one and press Ctrl+Down: the caret goes to the first line of the next procedure's body, column 1. Ctrl+Up from inside a procedure goes to the first line of its own body.

**Expected behavior**
The caret on the declaration line, at the name, as Go To Definition does for a local variable, so that the declaration is what the reader sees first.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: low. The declaration is one line above the caret, and in view.

<!-- Reproducer: bugs/definition-line-after/ (mode lane: asserted by `ide-test.bat --only code-editor` (test/ide/code-editor.test.mjs), the tests "Go To Definition on a function in another module puts the caret on the line after its declaration" and "Ctrl+Down puts the caret on the line after the next procedure's declaration, and Ctrl+Up on the line after its own procedure's", which pass on BETA 1005; the control "Go To Definition on a local variable puts the caret on its Dim line" passes too. The class-member and class-name cases are from the trials, not the lane). No project and no zip. A page of docs/IDE/Code/, the "Writing code" chapter now being written, may name it in a NOTE where it describes Go To Definition; when a fixed build is released, that NOTE goes. Found 2026-10-11 in the trials for the Writing code pages (the fact sheet's defect 10, without its Shift+F10 part). -->

---

## Escape does not remove the extra cursors

**Describe the bug**
After cursors are added with Ctrl+Alt+Down or Alt+click, Escape leaves them all: pressed once or twice, the code editor still has every cursor, and what is typed next goes in at each of them. A click in the code goes back to one cursor. It was observed by pressing the keys in an IDE started with an `APPDATA` of its own and reading the editor's selections.

**To Reproduce**
Steps to reproduce the behavior:
1. Open any project and a module. Put the caret on a line that has two more lines below it and press Ctrl+Alt+Down twice: there are three cursors.
2. Press Escape, then Escape again. The three cursors remain.

**Expected behavior**
Escape leaves only the first cursor, as it does in the Monaco editor the code editor is built on.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Escape is not among the keys the IDE stops before they reach Monaco (`monacoApplyKeyDownFilter`), and the IDE does not refer to Monaco's command for it, `removeSecondaryCursors`; where the key goes was not settled.

Severity: low. A click removes the extra cursors.

<!-- Reproducer: bugs/escape-keeps-cursors/ (mode lane: asserted by `ide-test.bat --only code-editor` (test/ide/code-editor.test.mjs), the test "Escape leaves the two cursors that Ctrl+Alt+Down added", which passes on BETA 1005; the control "a click in the code goes back to one cursor" passes too. Alt+click is from the trials, not the lane). No project and no zip. A page of docs/IDE/Code/, the "Writing code" chapter now being written, may name it in a NOTE where it describes several cursors; when a fixed build is released, that NOTE goes. Found 2026-10-11 in the trials for the Writing code pages (the fact sheet's defect 11). -->

---

## In the Memory pane, the name of a Double, Boolean or user-defined type variable throws an uncaught BigInt error, and the box is not marked invalid

**Describe the bug**
The Memory pane's box sends the expression to the debugger and turns the result into an address: a String gives `StrPtr`, an object `ObjPtr`, an array `VarPtr`, and any other result is read as a whole number with `BigInt`. A result that is not a whole number --- a **Double** such as `1.5`, a **Boolean** (`True`), a variable of a user-defined type (`{user defined type, 8 bytes}`) --- makes `BigInt` throw. The exception is not caught: the DEBUG CONSOLE prints `IDE internal error: Uncaught SyntaxError: Cannot convert 1.5 to a BigInt`, the box is not turned red, and the rows stay as they were. It was observed by typing the names into the box in an IDE started with an `APPDATA` of its own, at a `Stop`.

**To Reproduce**
Steps to reproduce the behavior:
1. Run a project with:
   ```
   Module Startup
       Private Type Rec
           A As Long
           B As Integer
           C As Integer
       End Type

       Public Sub Main()
           Dim d As Double, flag As Boolean, udt As Rec
           d = 1.5: flag = True: udt.A = 5
           Stop
       End Sub
   End Module
   ```
2. At the `Stop`, choose View > MEMORY 1, type `d` in the box and press Enter. The DEBUG CONSOLE prints `IDE internal error: Uncaught SyntaxError: Cannot convert 1.5 to a BigInt`; the box keeps `d`, is not red, and the rows do not move.
3. The same with `flag` (`Cannot convert True to a BigInt`) and `udt` (`Cannot convert {user defined type, 8 bytes} to a BigInt`).

**Expected behavior**
The box turned red, as it is for an expression the debugger cannot evaluate, since the value is not an address; or, for a variable, the pane showing the variable itself (its `VarPtr`), as it does for an array.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The throw is in the box's `evaluate` callback (`BigInt(a)` in `createHexEditor`, `ide/main.js`).

Severity: low. `VarPtr(d)`, `VarPtr(flag)` and `VarPtr(udt)` show the variables.

<!-- Reproducer: bugs/memory-bigint-throw/ (mode lane: asserted by `ide-test.bat --only memory` (test/ide/memory.test.mjs), the three tests "the name d throws ...", "the name flag throws ..." and "the name udt throws ...", which pass on BETA 1005; the control "a name the debugger cannot evaluate turns the box red and leaves the rows" passes too). No project and no zip: the steps give the code. docs/IDE/Memory.md carries a NOTE for it, under "What to enter in the expression box", after the list of what each result becomes; when a fixed build is released, that NOTE goes. Found 2026-10-11 in the trials for the Memory page (its fact sheet's defect 1). -->

---

## In a 64-bit program, the Memory pane's Address column drops the high 32 bits

**Describe the bug**
In a program built for win64, the Memory pane reads and shows the right memory, but its **Address** column shows only the low 32 bits of each address. A stack variable's address above 4 GB, such as `&H4232CFF438`, is shown as `&H32CFF438`, which is another address, with nothing on screen to say so. It was observed in an IDE started with an `APPDATA` of its own, by comparing the column with the address the program printed.

**To Reproduce**
Steps to reproduce the behavior:
1. Switch a project to win64 with the toolbar's architecture box. Its `Sub Main`:
   ```
   Dim n As Long
   n = 1234
   Debug.Print Hex(VarPtr(n))
   Stop
   ```
2. Run it. At the `Stop` the DEBUG CONSOLE shows an address above 4 GB, such as `4232CFF438`.
3. Choose View > MEMORY 1, type `VarPtr(n)` in the box and press Enter. The first row holds `n`'s bytes, `D2 04 00 00`, and its address reads `&H32CFF438`.

**Expected behavior**
The Address column showing the whole address, `&H0000004232CFF438` or `&H4232CFF438`.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The pane is made with `createHexEditor(r, {stream: n, addressBits: 32, columns: 16})` whatever the build target (`_hexEditorPanel`, `ide/main.js`), and the label of each row is masked to `addressBits`. The cell that takes the focus has the whole address in its `data-addr`, and the reads use it.

Severity: medium. An address copied from the column, or compared with one the program prints, is wrong, and nothing shows it.

<!-- Reproducer: bugs/memory-address-64bit/ (mode lane: asserted by `ide-test.bat --only memory` (test/ide/memory.test.mjs), the test "in a 64-bit run, VarPtr(n) shows n's bytes, and the Address column only the low 32 bits of its address", which passes on BETA 1005; it switches the lane's project with lane.setBuildTarget and fails, rather than passing, if the run's VarPtr(n) is below 4 GB). No project and no zip. docs/IDE/Memory.md carries a WARNING for it, under "Display formats and columns", after the paragraph on the address column; when a fixed build is released, that WARNING goes. Found 2026-10-11 in the trials for the Memory page (its fact sheet's defect 2). -->

---

## The Memory pane shows memory it cannot read as still loading, with ?? in every cell

**Describe the bug**
At an address the program cannot read, such as `0`, `16` or the value of a **Long** variable, every value cell of the Memory pane shows `??` and every text cell `·`, with the class `loading`: the placeholders of a cell whose bytes are still being read. They never change. The pane has a style for unreadable memory, blank grey cells (`invalidMem`), but the panel never applies it. It was observed in an IDE started with an `APPDATA` of its own, five seconds after the expression was entered.

**To Reproduce**
Steps to reproduce the behavior:
1. Run any project to a `Stop`.
2. Choose View > MEMORY 1, type `0` in the box and press Enter.
3. Every row, from `&H00000000`, shows `??` in all its value cells and `·` in its text cells, and still does after any wait.

**Expected behavior**
The cells of unreadable memory drawn as unreadable (blank and grey, the `invalidMem` style), so that they differ from memory still being read.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
`invalidMem` is set only through the stream's `onInvalidate`, which only a demonstration stream in `ide/main.js` calls.

Severity: low. Memory that stays `??` is in practice unreadable, but a slow read looks the same.

<!-- Reproducer: bugs/memory-unreadable-loading/ (mode lane: asserted by `ide-test.bat --only memory` (test/ide/memory.test.mjs), the test "0 shows ?? in every value cell, as cells still being read, and never as unreadable memory", which passes on BETA 1005). No project and no zip. docs/IDE/Memory.md carries a NOTE for it, under "What to enter in the expression box", after the sentence saying what `??` marks; when a fixed build is released, that NOTE goes, and the sentence then describes the unreadable style. Found 2026-10-11 in the trials for the Memory page (its fact sheet's defect 3). -->

---

## A negative number in the Memory pane's box gives rows whose addresses jump

**Describe the bug**
When the expression in the Memory pane's box gives a negative number, the pane starts at that negative address. The first row is labelled with it masked to 32 bits, and the rows after it count up from the negative number: with `-8`, the rows read `&HFFFFFFF8`, `&H00000008`, `&H00000018`. It was observed in an IDE started with an `APPDATA` of its own.

**To Reproduce**
Steps to reproduce the behavior:
1. Run a project whose `Sub Main` has:
   ```
   Dim neg As Long
   neg = -8
   Stop
   ```
2. At the `Stop`, choose View > MEMORY 1, type `neg` in the box and press Enter.
3. The first row's address reads `&HFFFFFFF8`, the second `&H00000008` and the third `&H00000018`. Every cell shows `??`.

**Expected behavior**
The box turned red, since a negative number is not an address; or the number read as the unsigned address `&HFFFFFFF8`, with each row's label and reads following from it.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The base address is kept as a signed `BigInt`; only each row's label is masked.

Severity: low. Nothing at a negative address can be read.

<!-- Reproducer: bugs/memory-negative-address/ (mode lane: asserted by `ide-test.bat --only memory` (test/ide/memory.test.mjs), the test "neg, which is -8, gives a first row at &HFFFFFFF8 and a second at &H00000008", which passes on BETA 1005). No project and no zip. docs/IDE/Memory.md carries a NOTE for it, under "What to enter in the expression box", after the paragraph on where the first row starts; when a fixed build is released, that NOTE goes. Found 2026-10-11 in the trials for the Memory page (its fact sheet's defect 4). -->

---

## Shift+F10 opens the code editor's context menu at the top-left corner of the IDE window, not at the caret

**Describe the bug**
Shift+F10 (`tbEditor_ShowContextMenu`) opens the code editor's context menu at the top-left corner of the IDE window, over the menu bar, wherever the caret is. A right-click opens the same menu at the pointer. It was observed by pressing the key in an IDE started with an `APPDATA` of its own and reading where the menu opened.

**To Reproduce**
Steps to reproduce the behavior:
1. Open any project and a module, and put the caret on a line in the middle of the code editor.
2. Press Shift+F10. The menu that starts with **Go To Definition** opens with its top-left corner at the top-left corner of the window.

**Expected behavior**
The menu at the caret, as Shift+F10 opens a context menu elsewhere in Windows and in the Monaco editor the code editor is built on.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The command calls `showContextMenuMonaco({clientX: 0, clientY: 0})` (`ide/main.js`).

Severity: low. The menu works; it opens far from where the reader is looking.

<!-- Reproducer: bugs/shift-f10-menu-corner/ (mode lane: asserted by `ide-test.bat --only code-editor` (test/ide/code-editor.test.mjs), the test "Shift+F10 opens the editor's menu at the top-left corner of the IDE window, not at the caret", which passes on BETA 1005; the control "a right-click in the code opens the editor's menu at the pointer" passes too). No project and no zip. docs/IDE/Code/Editor.md carries a NOTE for it, under "The right-click menu"; when a fixed build is released, that NOTE goes. Found 2026-10-11 in the trials for the Writing code pages (the Shift+F10 part of the fact sheet's defect 10). -->

---

## An editor tab opened after the compiler has reported its file is not tinted for the file's warnings or errors

**Describe the bug**
A file that has errors or warnings has its row in the Project Explorer tinted, and its editor tab too, but the tab is tinted only when the compiler reports the file while the tab is open. A tab opened on a file the compiler has already reported --- the usual case, since the whole project is compiled when it opens --- stays untinted until the compiler checks the file again, after an edit to it. The Project Explorer row is tinted either way. It was observed in an IDE started with an `APPDATA` of its own, by reading the classes of the row and the tab.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a project with a module that has a warning, such as:
   ```
   Module Helpers
       Public Sub Narrowing()
           Dim narrow As Integer
           Dim wide As Long
           wide = 5
           narrow = wide
       End Sub
   End Module
   ```
   with TB0018 set to a warning in the project's settings (`"project.warnings": {"warnings": ["TB0018"]}`), and do not open the module. Its row in the Project Explorer is tinted.
2. Double-click the row. The module's tab opens untinted, and stays so.
3. Type a space at the end of a line, or type it and undo it. The compiler reports the file again, and the tab is tinted.

**Expected behavior**
The tab tinted as soon as it opens, as the Project Explorer row is.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
`syncFileDiagnosticsToExplorer` (`ide/main.js`) sets the tab's class only when the file has an open tab at the time; opening a tab does not read the file's cached counts.

Severity: low. The Project Explorer and the Diagnostics panel show the problems.

<!-- Reproducer: bugs/tab-tint-opened-later/ (mode lane: asserted by `ide-test.bat --only code-editor` (test/ide/code-editor.test.mjs), the test "a tab opened on a file the compiler has already reported stays untinted, while its Project Explorer row is tinted", which passes on BETA 1005; the control "after an edit to the file and its undo, the compiler reports it again and its tab is tinted" passes too. The lane's module is test/ide/probes/code-editor/Sources/Helpers.twin, whose warning is TB0018). No project and no zip. docs/IDE/Code/Editor.md carries a NOTE for it, under "Tabs"; when a fixed build is released, that NOTE goes. scripts/shoot_docs.mjs's Tabs_States shot edits and undoes Inventory.twin to get the tint, and can drop that once the fix is released. Found 2026-10-11 by the screenshot work for the Writing code pages. -->

---

## The Variables panel's edit box cuts a String at an apostrophe, and leaving it sets the variable to the empty string

**Describe the bug**
Double-clicking a String variable in the VARIABLES panel opens an edit box holding its value, but only up to the first apostrophe: for `"it's"` the box holds `"it`. Leaving the box --- Enter, or a click on another row --- commits its text even when nothing was typed, and the variable becomes the empty string. Nothing shows that the value was changed. It was observed in an IDE started with an `APPDATA` of its own, reading the row and `? s` in the DEBUG CONSOLE.

**To Reproduce**
Steps to reproduce the behavior:
1. Stop at a breakpoint in a procedure with `Dim s As String`.
2. In the DEBUG CONSOLE, run `s = "it's"`. The VARIABLES panel shows `"it's"`.
3. Double-click the `s` row. The edit box holds `"it`.
4. Press Enter without typing. The row shows `""`, and `? s` prints an empty line.
5. Set `s = "it's"` again, double-click the row and click another row. The same.

**Expected behavior**
The box holding the whole value, `"it's"`, and leaving it with nothing typed changing nothing.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
`onVariableDblClick` (`ide/main.js`) builds the box as HTML, `"<input id='renameInput' ... value='" + value + "' ...>"`, so the apostrophe ends the attribute; the box's `onblur` sends `setVariable` with whatever the box holds. A value with double quotes (`"say ""hi"""`) is shown and kept correctly. Escape leaves the variable as it was.

Severity: medium. A variable's value is changed with nothing typed and nothing shown, and the program then runs on with it.

<!-- Reproducer: bugs/variables-edit-apostrophe/ (mode lane: asserted by `ide-test.bat --only debugging` (test/ide/debugging.test.mjs), the tests "the Variables edit box holds a String only up to an apostrophe, and Enter sets the variable to the empty string" and "a click away from the Variables edit box, with nothing typed, sets a String with an apostrophe to the empty string", which pass on BETA 1005; the control "Escape in the Variables edit box leaves a String with an apostrophe as it was" passes too). No project and no zip. A page of the Running and debugging chapter, docs/IDE/Debugging/ (Inspecting.md, where it describes editing a value in Variables; the chapter is being written), will carry a WARNING for it; when a fixed build is released, that WARNING goes. Found 2026-10-11 in the trials for the Running and debugging pages (their fact sheet's defect 2). -->

---

## Hovering over a Sub call while paused runs the Sub

**Describe the bug**
While a program is paused, holding the pointer over a word of the code evaluates the expression under it and shows the result. Over the name of a **Sub** in a call, such as `Bump` in `t.Bump`, the evaluation calls the Sub: its code runs, with all its effects, and the hover shows `t.Bump:   0`. Each hover runs it again. It was observed in an IDE started with an `APPDATA` of its own, with `? t.Value` in the DEBUG CONSOLE before and after the hover.

**To Reproduce**
Steps to reproduce the behavior:
1. A project with a class:
   ```
   Class Thing
       Public Value As Long
       Public Sub Bump()
           Value = Value + 1
       End Sub
   End Class
   ```
   and a procedure that holds `Dim t As New Thing`, `t.Value = 5`, `t.Bump` and a line after it.
2. Stop at a breakpoint on the line after `t.Bump`. In the DEBUG CONSOLE, `? t.Value` prints `6`.
3. Hold the pointer over `Bump` in `t.Bump` until the hover shows. It reads `t.Bump:   0`.
4. `? t.Value` prints `7`.

**Expected behavior**
A hover that does not run a Sub: it has no value to show, so no hover, or the compiler's description of the Sub.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The hover sends `evaluate` with `context: "hover"` and the expression `t.Bump`. A hover also runs a Function or a Property Get to show its value (`t.Doubled`, `Level1(n)`), which is how the hover is meant to work; for a Sub nothing is shown that could justify running it. Hovering over a variable, such as `Value` in `t.Value`, shows `t.Value:   6` and changes nothing.

Severity: medium. The program's state changes with nothing shown, from moving the mouse.

<!-- Reproducer: bugs/hover-runs-sub/ (mode lane: asserted by `ide-test.bat --only debugging` (test/ide/debugging.test.mjs), the test "hovering over a Sub call while paused runs the Sub", which passes on BETA 1005; the control "hovering over a variable while paused shows its value" passes too). No project and no zip. A page of the Running and debugging chapter, docs/IDE/Debugging/ (Inspecting.md, where it describes the hover while paused; the chapter is being written), will carry a WARNING for it; when a fixed build is released, that WARNING goes. Found 2026-10-11 in the trials for the Running and debugging pages (their fact sheet's defect 6). -->

---

## An edit at the run-time error panel prints Aborting, and then the rest of the program runs

**Describe the bug**
An edit to the code while a program is paused ends the run, since Edit and Continue is not supported: at a breakpoint the DEBUG CONSOLE prints `[EDIT & CONTINUE] not yet supported.  Aborting.` and `aborted`, and nothing more runs. At the run-time error panel the same edit prints the same `Aborting.` line, but then only the failing procedure ends: its callers go on, and the rest of the program runs. It was observed in an IDE started with an `APPDATA` of its own, reading the DEBUG CONSOLE.

**To Reproduce**
Steps to reproduce the behavior:
1. Run a project with:
   ```
   Module Startup
       Public Sub Main()
           Fails
           Debug.Print "main end"
       End Sub

       Public Sub Fails()
           Err.Raise 5, , "Fails with A & B"
           Debug.Print "after raise"
       End Sub
   End Module
   ```
2. The run stops at the error panel on the `Err.Raise` line.
3. Type a letter anywhere in the code editor. The DEBUG CONSOLE prints `[EDIT & CONTINUE] not yet supported.  Aborting.`, then `main end`, then `(time taken: ...)`.

**Expected behavior**
The run aborted, as the message says and as the same edit at a breakpoint does: `aborted`, and no `main end`.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
What runs is what the panel's **Stop** button runs: it ends only the failing procedure, which #2441 reports. Main runs on with code that the edit has since changed in the editor but not in the program.

Severity: medium. Code runs after the reader was told the run is aborted --- files written, a database changed --- with nothing to warn of it.

<!-- Reproducer: bugs/edit-at-error-panel-runs-on/ (mode lane: asserted by `ide-test.bat --only debugging` (test/ide/debugging.test.mjs), the test "an edit at the error panel prints Aborting, and then the rest of Main runs", which passes on BETA 1005; the control "an edit at a breakpoint aborts the run: the rest of Main does not run" passes too). No project and no zip. A page of the Running and debugging chapter, docs/IDE/Debugging/ (Running.md, where it says what ends a run; the chapter is being written), will carry a WARNING for it; when a fixed build is released, that WARNING goes. Found 2026-10-11 in the trials for the Running and debugging pages (their fact sheet's defect 8). -->

---

## After an edit in the Variables panel, a Double or Date row shows a wrong value until the next refresh

**Describe the bug**
A **Double** or **Date** variable edited in the VARIABLES panel gets the value typed, but its row shows another value: `0` for a Double, `#12:00:00 AM#` for a Date. The row stays wrong until the panel is next refreshed, by a line in the DEBUG CONSOLE or the next stop. A **Long** edited the same way shows its new value at once. It was observed in an IDE started with an `APPDATA` of its own, reading the row two seconds after the edit and `? d` in the DEBUG CONSOLE.

**To Reproduce**
Steps to reproduce the behavior:
1. Stop at a breakpoint in a procedure with `Dim d As Double = 2.5` and `Dim dt As Date`.
2. In the VARIABLES panel, double-click `d`, type `7.25` and press Enter. The row shows `0`.
3. In the DEBUG CONSOLE, run `? d`. It prints `7.25`, and the row now shows `7.25`.
4. Double-click `dt`, type `#1/2/2020#` and press Enter. The row shows `#12:00:00 AM#` until `? dt`, which prints `1/2/2020`.

**Expected behavior**
The row showing the value the variable now holds, as it does for a Long.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The row is redrawn from the answer to the `setVariable` request (`body.value`), so that answer holds `0` and `#12:00:00 AM#`. With `-1.5E+20` the row showed `2.19923962666636E-315`, which suggests the answer is read from the wrong type. Currency, Boolean, Variant and enum rows show the edit at once.

Severity: medium. The variable is right; the panel shows a wrong value with nothing to say so, and a reader who checks the edit there concludes it failed.

<!-- Reproducer: bugs/variables-edit-stale-display/ (mode lane: asserted by `ide-test.bat --only debugging` (test/ide/debugging.test.mjs), the tests "a Double edited in the Variables panel shows 0 until the next refresh, while the variable holds the value" and "a Date edited in the Variables panel shows #12:00:00 AM# until the next refresh, while the variable holds the value", which pass on BETA 1005; the control "a Long edited in the Variables panel shows its new value at once" passes too). No project and no zip. A page of the Running and debugging chapter, docs/IDE/Debugging/ (Inspecting.md, where it describes editing a value in Variables; the chapter is being written), will carry a WARNING for it; when a fixed build is released, that WARNING goes. Found 2026-10-11 in the trials for the Running and debugging pages (their fact sheet's defect 3). -->

---

## After a stop at a breakpoint, Step Out does not stop in the procedure's caller

**Describe the bug**
When a run has stopped at a breakpoint inside a procedure, no step stops in a caller of that procedure. Step Out runs on to the next breakpoint, error or the end of the program; F8 off the procedure's `End Sub` stops only at the next procedure the caller calls. Steps inside the procedure, and into procedures it calls and back, work. When the procedure was entered by F8 from its caller, Step Out stops in the caller as it should. It was observed in an IDE started with an `APPDATA` of its own, reading the line the debugger stopped on and the DEBUG CONSOLE.

**To Reproduce**
Steps to reproduce the behavior:
1. Run a project with:
   ```
   Module Startup
       Public Sub Main()
           Direct
           Debug.Print "m2"
           Other
       End Sub

       Public Sub Direct()
           Debug.Print "in direct"
       End Sub

       Public Sub Other()
           Debug.Print "other"
       End Sub
   End Module
   ```
   with a breakpoint on `Debug.Print "in direct"`.
2. The run stops there. Press Ctrl+Shift+F8 (Step Out). The run does not stop in `Main` on `Debug.Print "m2"`: `m2` is printed and the run goes on to its end.
3. Run again to the breakpoint, and press F8 twice, to `End Sub` and off it. The next stop is `Other`'s `Sub` line, after `m2` is printed.

**Expected behavior**
A stop in `Main` on `Debug.Print "m2"`, the line after the call, as Step Out gives when `Direct` was entered by F8 from a breakpoint in `Main`.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The same for every caller tried: `Main` and another Sub, with the call made directly, inside `Select Case`, `If` or `For`, and a Function call in an assignment.

Severity: low. The program runs its own code; the pause the reader asked for is lost.

<!-- Reproducer: bugs/step-out-after-breakpoint/ (mode lane: asserted by `ide-test.bat --only debugging` (test/ide/debugging.test.mjs), the tests "after a stop at a breakpoint in a procedure, Step Out does not stop in its caller: the run goes on" and "after a stop at a breakpoint in a procedure, F8 off its End Sub does not stop in its caller, but in the next procedure the caller calls", which pass on BETA 1005; the control "after F8 into a procedure from a breakpoint in its caller, Step Out stops in the caller" passes too). No project and no zip. A page of the Running and debugging chapter, docs/IDE/Debugging/ (Breakpoints-and-Stepping.md, where it describes Step Out; the chapter is being written), will carry a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-11 in the trials for the Running and debugging pages (their fact sheet's defect 1). -->

---

## A compile error at F5 is reported as a codegen error to report upstream, at the caller's line

**Describe the bug**
With a compile error in a procedure that `Main` calls, F5 does not say that the project has a compile error, or where. It stops on `Main`'s `Sub` line with a panel headed **ERROR OCCURRED** that reads `COMPILATION (CODEGEN) ERROR AT LINE #7.  PLEASE REPORT THIS ERROR TO https://git.io/JMh6S`, where line 7 is `Main`'s call to the procedure, and the DEBUG CONSOLE prints `[LINKER] compilation (codegen) error detected in 'Startup.Main' at line #7`. It was observed in an IDE started with an `APPDATA` of its own.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a project whose `Sub Main` calls `Direct` on line 7.
2. Add the line `x = = 1` to `Direct`. The editor marks it, and the DIAGNOSTICS panel lists it.
3. Press F5. The DEBUG CONSOLE prints `Executing 'Main'...` and the `[LINKER]` line above; the editor stops on `Main`'s `Sub` line with the panel above. Nothing of `Main` runs.

**Expected behavior**
A message that the project has compile errors, naming the line with the error, or the DIAGNOSTICS panel shown; not a request to report a compiler defect, and not a line that holds no error.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
With the error in `Main` itself there is no panel; the DEBUG CONSOLE prints `[LINKER] compilation (codegen) error detected in '{temp_component}.{temp_procedure}' at line #1` and `(compile error: codegen error; check for compilation errors)`.

Severity: low. Nothing runs, and the DIAGNOSTICS panel lists the real error.

<!-- Reproducer: bugs/compile-error-reported-as-codegen/ (mode lane: asserted by `ide-test.bat --only debugging` (test/ide/debugging.test.mjs), the test "a compile error in a procedure Main calls is reported at F5 as a codegen error to report, at Main's call", which passes on BETA 1005; it types the error into the lane's project, test/ide/probes/debugging, since the lane refuses to open a project that does not compile). No project and no zip. A page of the Running and debugging chapter, docs/IDE/Debugging/ (Running.md, where it says what Start runs; the chapter is being written), will carry a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-11 in the trials for the Running and debugging pages (their fact sheet's defect 9). -->

---

## F6 does not find the procedure when the caret is right of the column where the procedure's End line ends, or on that End line

**Describe the bug**
F6 (Run Or Preview) runs the procedure the caret is in. On a line inside the procedure, it finds the procedure only when the caret is left of the column where the procedure's `End Sub` or `End Function` line ends; from that column on, and anywhere on the `End` line itself, the DEBUG CONSOLE prints `RunCodeUnderCursor: failed to identify the procedure at the cursor position.` and nothing runs. With the usual indentation, the caret in the word `Debug` of a `Debug.Print` line is already too far right in a Sub. It was observed in an IDE started with an `APPDATA` of its own, pressing F6 at several columns of each line.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a module with:
   ```
   Module Startup
       Public Sub Direct()
           Debug.Print "in direct"
       End Sub

       Public Function Answer() As Long
           Answer = 42
       End Function
   End Module
   ```
2. Put the caret on the `Debug.Print` line at column 11 and press F6: `Direct` runs. At column 12, where the `End Sub` line ends, F6 prints the message.
3. On the `Answer = 42` line, column 16 runs `Answer`, and column 17, where `End Function` ends, prints the message.
4. On the `End Sub` line, F6 at any column prints the message.

**Expected behavior**
F6 running the procedure from any column of any of its lines, its `End` line included.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The IDE sends `runCodeUnderCursor` with the line and column, and the message is the compiler's answer. The procedure's own `Sub` line works at every column tried, right of that limit included. A trailing comment on the `End Sub` line moves the limit to where the comment starts. The check looks like a range test that compares the column with the end of the range on every line.

Severity: low. Nothing runs, and the message says so.

<!-- Reproducer: bugs/f6-procedure-not-found/ (mode lane: asserted by `ide-test.bat --only debugging` (test/ide/debugging.test.mjs), the tests "F6 on a line of a procedure, at or right of the column where its End line ends, does not find the procedure" and "F6 on an End Sub line does not find the procedure, at any column", which pass on BETA 1005; the control "F6 on a line of a procedure, left of the column where its End line ends, runs the procedure" passes too). No project and no zip. A page of the Running and debugging chapter, docs/IDE/Debugging/ (Running.md, where it describes Run Or Preview; the chapter is being written), will carry a NOTE for it; when a fixed build is released, that NOTE goes. The fact sheet's defect 7 said "in the word Debug"; the lane narrowed it to the column. Found 2026-10-11 in the trials for the Running and debugging pages (their fact sheet's defect 7). -->

---

## Search Online on the run-time error panel does not encode the error text, so an & in it cuts the search short

**Describe the bug**
The run-time error panel's **Search Online** button opens a Google search for the error's header and description, but puts the text into the URL as it is. An `&` in the description ends the `q` parameter, so the search loses the rest of the text, and a `"` would end the quoted URL in the command line. It was observed in an IDE started with an `APPDATA` of its own, by recording the command line the button passes to the IDE host in place of running it; no browser was opened.

**To Reproduce**
Steps to reproduce the behavior:
1. Run a project whose `Sub Main` executes `Err.Raise 5, , "Fails with A & B"`.
2. At the error panel, click **Search Online**.
3. The IDE runs `cmd.exe /c start "link" "https://www.google.com/search?q=twinBASIC VB6 Run-time error 5 (00000005) Fails with A & B"`, so the query the search receives ends at the `&`: `twinBASIC VB6 Run-time error 5 (00000005) Fails with A`.

**Expected behavior**
The query URL-encoded (`encodeURIComponent`), so that the search is for the whole text: `...q=twinBASIC%20VB6%20Run-time%20error%205%20(00000005)%20Fails%20with%20A%20%26%20B`.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The button's handler (`showErrorWidget`, `ide/main.js`) is `root.Shell('cmd.exe /c start "link" "https://www.google.com/search?q=' + e + '"')`, with `e` the header and description joined by spaces.

Severity: low. The search still opens, on part of the text.

<!-- Reproducer: bugs/search-online-unencoded/ (mode lane: asserted by `ide-test.bat --only debugging` (test/ide/debugging.test.mjs), the test "Search Online passes the error's text into the search URL unencoded, so an & in it ends the query", which passes on BETA 1005; the lane replaces root.Shell with a recorder before any run, checks it again before the click, and opens no browser). No project and no zip. A page of the Running and debugging chapter, docs/IDE/Debugging/ (Breakpoints-and-Stepping.md, under the error panel; the chapter is being written), will carry a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-11 in the trials for the Running and debugging pages (their fact sheet's defect 4). -->

---

## An array as the type argument of a generic class, interface, `Type` or procedure crashes the compiler

**Describe the bug**
Naming an array type as a type argument, as in `Box(Of Long())`, crashes the compiler. The IDE prints `NATIVE EXCEPTION: ACCESS_VIOLATION` in the DEBUG CONSOLE, restarts the compiler on the same project, and it crashes again, three times in a run, so nothing in the project compiles while the declaration is there. The declaration alone does it: nothing is constructed or called. A type argument that is not an array compiles, and `Variant` is refused with a diagnostic (TB5124, *Cannot pass Variant datatype as a generic specifier*), so the array is the one type argument that crashes the compiler instead of being compiled or refused. Observed in the IDE.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `generic-array-type-argument-crash.twinproj` (attached as `generic-array-type-argument-crash.zip`). Its one source file, `Startup.twin`, holds the whole bug:
   ```
   Class Box(Of T)
   End Class

   Module Startup

       Public Sub Main()
           Dim b As Box(Of Long())
       End Sub

   End Module
   ```
2. Let the IDE compile it (it does so on opening).
3. See the DEBUG CONSOLE: `NATIVE EXCEPTION: ACCESS_VIOLATION  {no-basic-code} [$1ED792A6:twinBASIC_win32.dll+003792A6]`, then `restarting from MEMORY [...]`, and the same exception twice more, each with a list of the compiler's threads in which the failing one is `>>> thread 0005: ResolveStageY_DataTypesStart3, /GenericArrayTypeArgumentCrash/Sources/Startup.twin; module Startup; line 4`. With `Box(Of Long)` in place of `Box(Of Long())` the project compiles without a diagnostic.

Each of these was a project of its own, and crashed in the same way:
- the class is empty or has a field, with or without `[COMCreatable(False)]`;
- another array type: `String()`, `Byte()`, `Variant()`, `Long(,)`, `Long(3)`, an array of a user-defined type, and an array of an instantiated class, `Box(Of Box(Of Long)())`;
- the declaration is at module level, inside a class (`Private b As Box(Of Long())`), a parameter's type or a function's result type, or `Set b = New Box(Of Long())`;
- the generic is an `Interface` (`IBox(Of T)`, `Dim b As IBox(Of Long())`);
- the generic is a `Type` declared in a module (`Type ListU(Of T)` with `value() As T`, and `Dim x As ListU(Of Long())`);
- the generic is a procedure, and the array is given explicitly: `P(Of Long())` for `Sub P(Of T)()`, and `r = Ident(Of Long())(a)` for `Function Ident(Of T)(a As T) As T`;
- the class comes from a package: `Dim t As TupleOf1(Of Long())` with the contributed package Generics 1.0.0.0.

What does not crash it: `Box(Of Long)` and `Box(Of Collection)`; a generic function called with an array argument and *T* deduced (`Ident(a)`, with `a` a `Long()`), which compiles.

**Expected behavior**
A diagnostic, or a compiled project. An array that the compiler cannot use as a type argument is refused the way `Variant` is, with a message that names the type argument, and the project keeps compiling; one that it can use compiles, as `Box(Of Long)` does.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: high for a project that has the declaration. The compiler crashes on every attempt and restarts into the same crash, so the IDE reports nothing else about the project, and the line has to be found and removed by hand. No wrong code is produced.

<!-- Reproducer: bugs/generic-array-type-argument-crash/ (mode compile; expect is tbbuild exit 4, the compiler crashing; verify reproduces on BETA 1005). The exception text above is from the IDE's DEBUG CONSOLE (tbbuild --keep, then the console read over CDP); the address is build-specific. The variants under "Each of these" were scratch projects of one declaration each, not kept; the Generics case needs the package (embedded under Packages/Generics, 14 MB with its WinDevLib dependency, which is why the reproducer does not use it). Found documenting the contributed package Generics: docs/Reference/Contributed/Generics/index.md, section "Types of the items", carries a WARNING naming BETA 1005 and lists "Arrays, such as Long()" among the types that cannot be used. When fixed: remove the WARNING, and rewrite the bullet to say whether an array item works. -->

---

## `New` of a generic class from a package does not bind when its type arguments are named in no declaration: TB5074

**Describe the bug**
When a generic class comes from a package, a `New` expression that gives its type arguments fails to compile if that combination of type arguments appears in no declaration of the project or the package, that is, as the type of no variable, parameter, field or function result. TB5074, *Could not bind to parameterized constructor of class 'Box'. No compatible Sub New() method found*, is reported, followed by TB5032 (target `As Any`, a bare `Dim t = ...`, `With`), TB5044 (`As Object`, `As Variant`, `Set o = ...`) or TB5093 (an argument of a call). The constructor exists and the call matches it. Naming the same combination in a declaration anywhere in the project, one that is never used included, makes the same line compile; so does declaring the class in the project itself instead of in a package. Observed in the IDE's diagnostics.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `package-generic-new-untyped-target.twinproj` (attached as `package-generic-new-untyped-target.zip`). It embeds a package, `BoxLib` (in `Packages/BoxLib`), that holds one class:
   ```
   [COMCreatable(False)]
   Public Class Box(Of T)

       Public Sub New(value As T)
       End Sub

   End Class
   ```
   The project's one source file, `Startup.twin`, holds the whole bug:
   ```
   Module Startup

       Public Sub Main()
           Dim a As Any = New Box(Of Long)(1)           ' TB5074 and TB5032
           Dim o As Object = New Box(Of Double)(2)      ' TB5074 and TB5044
           Dim t As Box(Of Byte) = New Box(Of Byte)(3)  ' compiles: the declaration names Box(Of Byte)
       End Sub

   End Module
   ```
2. Let the IDE compile it (it does so on opening).
3. See four errors, two for each of the first two lines of `Main`:
   - `TB5074 Could not bind to parameterized constructor of class 'Box'. No compatible Sub New() method found` and `TB5032 Set-expression must result in an object type. Type [Box] is not an object (2).`, at `New` in the `Dim a` line;
   - `TB5074` as above and `TB5044 Unable to determine default interface of coclass 'Box'`, at the `Dim o` line.

   The third line, where the target is declared with the instantiated type, compiles.

What decides it, each tried in the project above with `Box(Of Long)`:

| change | result |
|---|---|
| none: `Dim a As Any = New Box(Of Long)(1)` | TB5074 and TB5032 |
| `Dim u As Box(Of Long)` before the line, after it, or in another module as a `Private` field | compiles |
| `Private Function Unused() As Box(Of Long)` anywhere in the project | compiles |
| a declaration with other type arguments, `Dim u As Box(Of Byte)` | TB5074 and TB5032 |
| the package itself declaring `Box(Of Long)`, such as a function's result type | compiles |
| the same class declared in the project's own code | compiles |
| the class without `[COMCreatable(False)]`, or with one type parameter or three | TB5074 and TB5032 |
| the class without a constructor, `Dim a As Any = New Box(Of Long)` | TB5032 only |
| `Dim v As Variant` then `v = New Box(Of Long)(1)`; `Show New Box(Of Long)(1)` for `Show(x As Object)`; `Debug.Print TypeName(New Box(Of Long)(1))` | TB5074 with TB5044 / TB5093 |

With the contributed package Generics 1.0.0.0, `Dim t As Any = New TupleOf2(Of String, Long)("a", 2)` fails as above, and so do `TupleOf3`, `TupleOf5` to `TupleOf7`, and `TupleOf1(Of Long)(1)`. `New TupleOf1(Of String)("a")` compiles, and so does `New TupleOf7(Of String, String, String, String, String, String, String)(...)`: the package's own module `HelloWorldModule` declares exactly those two instantiations. The number of type parameters is not the cause.

**Expected behavior**
`New Box(Of Long)(1)` binds to the constructor whether or not another declaration has named `Box(Of Long)`, as it does for a class declared in the project, and as `Dim t As Box(Of Long) = New Box(Of Long)(1)` does.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Not tried: a generic class from a compiler package, such as `EventLog(Of T1, T2)` of WinEventLogLib.

Severity: low. A compile error is reported, nothing goes wrong silently, and a declaration that names the instantiation avoids it, such as `Dim t As Box(Of Long) = New Box(Of Long)(1)`. The diagnostic points at a correct line and says nothing about the type arguments.

<!-- Reproducer: bugs/package-generic-new-untyped-target/ (mode compile, expects exit 1 and TB5074, TB5032 and TB5044; the project embeds the small package BoxLib, made from the Generics package's Settings without its WinDevLib dependency; verify reproduces on BETA 1005). Found documenting the contributed package Generics: docs/Reference/Contributed/Generics/index.md, section "Creating a tuple", carries a NOTE naming BETA 1005, with the workaround of a typed variable and a sample of it. Related, not the same: the filed bugs/filed/static-ctor-args (#2492), where a `Static` initialised with `New Dog("Rex")` fails with TB5074 when the class is declared later, as if the constructors of a type were not yet known when the line is bound. When fixed: remove the NOTE and its workaround sample, and retire the reproducer. -->

---

## `Private Sub New` does not make construction private: `New` from another module, or from a project that references the class's package, compiles and runs the constructor

**Describe the bug**
A class whose constructor is declared `Private Sub New()` can be created with `New` by code outside the class: another module of the same project, another class, and a project that references the package that holds the class. There is no diagnostic, and the private constructor runs. Other private members are enforced: a `Private Sub` of the same class is refused from another module with TB5027, *Unrecognized member*, in a project and in a package, so the constructor is the one private member that the compiler lets anybody call. A class that wants its objects created only by its own code, such as a factory method that sets the object up after `New`, cannot say so. Observed in the IDE's diagnostics, and in a run.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `private-constructor-callable.twinproj` (attached as `private-constructor-callable.zip`). It embeds a package, `CtorLib` (in `Packages/CtorLib`), with one class:
   ```
   [COMCreatable(False)]
   Public Class Locked

       Public V As Long

       Private Sub New()
           V = 5
       End Sub

   End Class
   ```
   The project has the same in a class of its own, `ZPriv`, in `Classes.twin`, and its module `Startup` creates both:
   ```
   Module Startup

       Public Sub Main()
           Dim a As ZPriv = New ZPriv
           Debug.Print a.V
           Dim j As Locked = New Locked
           Debug.Print j.V
       End Sub

   End Module
   ```
2. Let the IDE compile it (it does so on opening): 0 errors, 0 warnings.
3. Run the project in the IDE (F5): the DEBUG CONSOLE shows `5` and `5`, the value the private constructor sets.

What decides it, each tried in the project above (`Classes.twin` and `Startup.twin` hold all of them, 11 lines of output):
- Every way of creating the object compiles and runs the constructor: `Dim a As ZPriv = New ZPriv`, `Dim b As New ZPriv`, `Set c = New ZPriv`.
- A constructor with parameters is the same: `Private Sub New(ByVal x As Long)` and `New ZPrivArgs(3)`.
- `Private Class ZPrivateClass` with `Private Sub New()` is created with `New` from another module too.
- `New` from another class of the project (`Set Make = New ZPriv` in a method of `ZCaller`) compiles.
- From the package: `Dim j As Locked = New Locked` and `Dim k As New Locked` compile, and the constructor runs.
- `Friend Sub New` also compiles (`New ZFriend`), and so does `New` of a package class whose constructor is `Friend Sub New`; and a `Friend Sub` that is an ordinary method of a package class can be called from the project. Whether `Friend` should stop that is not part of this entry.
- Not affected: `New` inside the class itself, a factory method on the predeclared object (`ZFactory.Create`, which does `Set Create = New ZFactory`), which has to keep working; and `Public Sub New`, the control.

**Expected behavior**
A diagnostic for `New ZPriv`, `Dim ... As New ZPriv` and `New Locked` outside the class, as for a private member that is used from outside; `New` inside the class compiles and runs as it does now.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Not tried: a `Private Sub New` in a class of a package built from the project's own `Packages` folder compared with one installed from a `.twinpack` file, and `New` through `CreateObject` (the class is `[COMCreatable(False)]` here).

Severity: low. The compiler accepts code that the class's author meant to forbid, and nothing else goes wrong. For a class that relies on it, such as a settings object that is meant to be created only from presets, an object made with `New` is in the state that the constructor leaves, which the class never intended anybody to use.

<!-- Reproducer: bugs/private-constructor-callable/ (mode compile; the bug state is a clean compile, so expect is exit 0 and noDiagnostics, the first reproducer to use that key; verify reproduces on BETA 1005, and says NO LONGER REPRODUCES once a diagnostic appears). `bug_repro.mjs run` prints the 11 lines of V values. The package half is the small package CtorLib, made from the BoxLib package of package-generic-new-untyped-target. The `Friend` variants and the check that a `Private Sub` is refused (TB5027) in a project and in a package were run once in a scratch copy with `tbrun --tests` compile cases, not kept. No VB6 comparison: VB6 has no `Sub New`. Found documenting the contributed package tsPwGen, whose PwGenOptions is `[PredeclaredId] [COMCreatable(False)]` with `Private Sub New()`: docs/Reference/Contributed/tsPwGen/PwGenOptions.md and docs/Features/Advanced/Classes-and-Modules.md ("Parameterized Class Constructors") carry a NOTE naming BETA 1005: when fixed, remove both NOTEs. -->


---

## Horizontal and Vertical Spacing move the controls with no undo step and without marking the form changed

**Describe the bug**
In the form designer, the commands of Format > Horizontal Spacing and Format > Vertical Spacing (Make Equal, Increase, Decrease, Remove) move the selected controls on the surface, but the move is not recorded: the tab is not marked changed, Ctrl+Z does nothing, and the designer's own copy of the form keeps the old positions. Closing the designer asks nothing, and the form opens again with the controls where they were. If another change follows before the form is saved, the moved positions are saved with it. It was observed in an IDE started with an `APPDATA` of its own, reading the designer's controls and its form state, and the messages it sends to the IDE.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a form with three controls side by side: Command1 at Left 10, Check1 at Left 140 and Command2 at Left 250, each 100 wide.
2. Select the three and choose Format > Horizontal Spacing > Remove. Check1 moves to Left 110 and Command2 to Left 210.
3. The tab shows no change mark, and Ctrl+Z leaves the controls where they are.
4. Close the designer: nothing is asked. Open the form again: Check1 is at 140 and Command2 at 250.
5. The same with Format > Vertical Spacing > Remove (Check1 to Top 80, Command2 to Top 104), Make Equal and Increase.

**Expected behavior**
Each spacing command an undo step that marks the form changed, as every other Format command is: Align > Left marks the tab, Ctrl+Z undoes it, and it is saved.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The designer sends no `onChanged` or `onSignificantChange` for a spacing command. `formDesginer_RemoveSpacingHorizontal`, `formDesginer_RemoveSpacingVertical` and `formDesigner_AdjustSpacingOfSelectedControls_Horizontal` / `_Vertical` (`ide/main.js`) never call `undoPoint`, which `alignControlsLeft` calls at its end. A later change, such as an arrow key on another control, writes the whole surface into the form, the spaced positions included.

Severity: medium. The arrangement the reader sees is lost on close with nothing to warn of it, or is saved later as part of an unrelated change that cannot be undone separately.

<!-- Reproducer: bugs/form-spacing-not-recorded/ (mode lane: asserted by `ide-test.bat --only forms` (test/ide/forms.test.mjs), the tests "Horizontal Spacing > Remove moves the controls but sends no change, makes no undo step and leaves the form's state and the tab as they were" and "after Vertical Spacing > Remove, closing the designer asks nothing, and the form opens again with the old positions", which pass on BETA 1005; the control "Align > Left sends a change, makes an undo step, marks the form changed and reaches the form's state" passes too). No project and no zip. A page of the Designing forms and reports chapter, docs/IDE/Forms/ (Arranging.md, under the spacing commands; the chapter is being written), will carry a WARNING for it; when a fixed build is released, that WARNING goes. Found 2026-10-12 in the trials for the Designing forms and reports pages (their fact sheet's N1). -->

---

## Make Same Size marks the form changed, but Save keeps the old sizes unless another change follows

**Describe the bug**
Format > Make Same Size resizes the selected controls on the surface and marks the tab changed, and Ctrl+Z undoes it, but the designer's own copy of the form keeps the old sizes. Ctrl+S then saves the old sizes: closing and opening the form again shows them. If another change follows before the save --- an arrow key on another control, or a click on the form's background --- the new sizes are saved with it. It was observed in an IDE started with an `APPDATA` of its own, reading the designer's controls and its form state.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a form with Command1 and Command2 30 high and Check1 24 high.
2. Select the three and choose Format > Make Same Size > Height (Shortest). All three are 24 high, and the tab is marked changed.
3. Press Ctrl+S at once. The tab's change mark goes.
4. Close the designer and open the form again. Command1 and Command2 are 30 high.

**Expected behavior**
The new sizes saved, as an Align command's new positions are.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
After step 2 the designer's form state (`state.item.form`, what Save writes) still holds `Height: 30`. With an arrow key on another control between steps 2 and 3, the form opens again with the 24s. A click on the form's background between them saves them too.

Severity: medium. The reader sees the sizes changed and saved, and the form is not.

<!-- Reproducer: bugs/form-same-size-not-saved/ (mode lane: asserted by `ide-test.bat --only forms` (test/ide/forms.test.mjs), the test "Make Same Size > Height (Shortest) marks the form changed, but the form's state keeps the old heights, and Save writes them", which passes on BETA 1005, on the probe's copy frmSizes; the control "Make Same Size followed by another change is saved" passes too, on frmSaved). No project and no zip. A page of the Designing forms and reports chapter, docs/IDE/Forms/ (Arranging.md, under Make Same Size; the chapter is being written), will carry a WARNING for it; when a fixed build is released, that WARNING goes. Found 2026-10-12 in the trials for the Designing forms and reports pages (their fact sheet's N2). -->

---

## Arrow keys in the designer's zoom box also move the selected controls

**Describe the bug**
The form designer's toolbar has a zoom box, a drop-down of 25 % to 400 %. With the focus in it, Up Arrow and Down Arrow change the zoom, as a drop-down does, and also move the controls selected in the designer by one device pixel, as the same key in the designer does. Each press is a change to the form: the tab is marked changed and an undo step is made. Nothing on screen points to the move, since the zoom changes at the same time. It was observed in an IDE started with an `APPDATA` of its own, reading the control's position and the messages the designer sends to the IDE.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a form and click Command1, at Top 50.
2. Put the focus in the zoom box, which reads 100 % (a person has it there after picking a value from it).
3. Press Up Arrow twice. The zoom goes to 75 % and then 50 %, and Command1 moves up a device pixel at each press: Top 48.67 at 150 % display scaling. The tab is marked changed.

**Expected behavior**
Keys in the zoom box changing only the zoom.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Each press sends `onChanged` and `onSignificantChange`, as an arrow key in the designer does. At 100 % display scaling a press moves a control 1 pixel. With two controls selected, Up twice and Down twice make four undo steps.

Severity: medium. A control's position changes with nothing to show it, and the change is saved with the form.

<!-- Reproducer: bugs/form-zoom-box-arrows-move/ (mode lane: asserted by `ide-test.bat --only forms` (test/ide/forms.test.mjs), the test "Up Arrow in the zoom box zooms out and also moves the selected control up, as a change to the form", which passes on BETA 1005; the lane puts the focus in the box with zoomSelect.focus(), as the trial did). No project and no zip. A page of the Designing forms and reports chapter, docs/IDE/Forms/ (Designer.md, under the zoom; the chapter is being written), will carry a WARNING for it; when a fixed build is released, that WARNING goes. Found 2026-10-12 in the trials for the Designing forms and reports pages (their fact sheet's N5). -->

---

## Lock Controls does not mark the form changed, so a lock made on its own is lost when the designer is closed

**Describe the bug**
Format > Lock Controls locks the selected controls in the designer, which shows a lock icon on them and refuses to move them, but does not mark the form changed. The lock list in the form's `__IDEOptions.lockedControls` is not updated either. Closing the designer asks nothing, and the form opens again with nothing locked. A lock is saved only when another change to the form follows it. It was observed in an IDE started with an `APPDATA` of its own, reading the designer's lock list and its form state.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a form and click Command1.
2. Choose Format > Lock Controls. Command1 shows the lock icon; the tab shows no change mark.
3. Close the designer: nothing is asked.
4. Open the form again: Command1 is not locked.

**Expected behavior**
The lock marked as a change to the form and saved with it, as the grid options, which are stored in the same `__IDEOptions`, are.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
`lockTheControl` (`ide/main.js`) is called by the lock commands with an argument that skips `IDEOptionsChanged`, and they make no undo point; by the code, the form's context menu's Lock all controls and Unlock all controls are the same, which was not tested. Lock Controls, an arrow key on another control and Ctrl+S keep the lock.

Severity: medium. The reader locks controls to protect a layout and the lock is silently lost.

<!-- Reproducer: bugs/form-lock-not-saved/ (mode lane: asserted by `ide-test.bat --only forms` (test/ide/forms.test.mjs), the test "Lock Controls on its own does not mark the form changed: closing asks nothing, and the lock is gone when the form is opened again", which passes on BETA 1005; the control "Lock Controls followed by another change is saved" passes too, on the probe's copy frmSaved). No project and no zip. A page of the Designing forms and reports chapter, docs/IDE/Forms/ (Designer.md, under locking controls; the chapter is being written), will carry a WARNING for it; when a fixed build is released, that WARNING goes. Found 2026-10-12 in the trials for the Designing forms and reports pages (their fact sheet's D12). -->

---

## Align > Center (Horizontal) and Center (Vertical) centre the controls on the selection's left or top edge, not on its centre

**Describe the bug**
Format > Align > Center (Horizontal) puts the centre of every selected control on the leftmost left edge of the selection, and Center (Vertical) puts each centre on the topmost top edge, so the controls move half their width left of the selection, or half their height above it. VB6's Format > Align > Centers centres the controls on the selection's centre line. It was observed in an IDE started with an `APPDATA` of its own, reading the controls' positions.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a form with Command1 at 10,50, Check1 at 140,55 and Command2 at 250,110, each 100 wide; Command1 and Command2 30 high, Check1 24.
2. Select the three and choose Format > Align > Center (Horizontal). All three are at Left -40, centred on 10, partly off the form.
3. From the same start, choose Center (Vertical). Command1 and Command2 are at Top 35 and Check1 at 38: centred on 50.

**Expected behavior**
The controls centred on the selection's centre: Left 130 (the selection spans 10 to 350), or their centres on 95 (it spans 50 to 140).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
`alignControlsCenterHorizontal` (`ide/main.js`) takes its line from `getTopLeftOfAllControls`, which returns the smallest left and the smallest top, and `alignControlsCenterVertical` from `getTopRightOfAllControls().y`. Align > Left, Right, Top and Bottom are right. The command is an undo step, so Ctrl+Z puts the controls back.

Severity: low. The result is on screen and can be undone.

<!-- Reproducer: bugs/form-align-center-edge/ (mode lane: asserted by `ide-test.bat --only forms` (test/ide/forms.test.mjs), the tests "Align > Center (Horizontal) centres every selected control on the leftmost left edge" and "Align > Center (Vertical) centres every selected control on the topmost top edge", which pass on BETA 1005; the control "Align > Left puts the selected controls' left edges on the leftmost one" passes too). No project and no zip. A page of the Designing forms and reports chapter, docs/IDE/Forms/ (Arranging.md, under Align; the chapter is being written), will carry a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-12 in the trials for the Designing forms and reports pages (their fact sheet's D1). -->

---

## Center In Container puts a control off centre when the designer is zoomed

**Describe the bug**
Format > Center In Container (Horizontally) and (Vertically) centre the selected controls in their container at 100 %. At any other zoom they move the controls by the wrong amount: at 50 % a TextBox in a Frame goes partly out of the Frame, and three controls on the form move left instead of right. It was observed in an IDE started with an `APPDATA` of its own, reading the controls' positions.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a form with a Frame 200 x 130 holding a TextBox 120 x 24 at Left 20, Top 30.
2. Choose View > Zoom Out twice: the zoom box reads 50 %.
3. Select the TextBox and choose Format > Center In Container (Horizontally). It goes to Left -9.98.
4. Choose Center In Container (Vertically). It goes to Top 20.52.

**Expected behavior**
The TextBox at Left 40 and Top 53, centred in the Frame, as the same commands give at 100 %.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
`tbFormDesigner_CenterSelectedGroupInContainerHorizontal` (`ide/main.js`) reads the container's size with `getBoundingClientRect()`, which is the zoomed size, and compares it with the controls' unzoomed positions. Three controls on the form spanning 10 to 350, centred horizontally at 50 %, moved by -80 instead of +20.

Severity: low. The result is on screen and can be undone.

<!-- Reproducer: bugs/form-center-in-container-zoom/ (mode lane: asserted by `ide-test.bat --only forms` (test/ide/forms.test.mjs), the test "at 50 %, Center In Container puts a control in a Frame off centre", which passes on BETA 1005; the control "at 100 %, Center In Container centres a control in its Frame" passes too). No project and no zip. A page of the Designing forms and reports chapter, docs/IDE/Forms/ (Arranging.md, under Center In Container; the chapter is being written), will carry a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-12 in the trials for the Designing forms and reports pages (their fact sheet's D9). -->

---

## On a CustomControls form, PROPERTIES shows a control's position in twips but takes a typed value in pixels

**Describe the bug**
On a form of the CustomControls package the controls' `Left`, `Top`, `Width` and `Height` are pixels, in the `.tbform` file and on the surface. PROPERTIES shows them multiplied by 15, as twips, but takes a value typed into the same box as pixels. So retyping the value shown moves the control 15 times as far. On a form of the VB package, PROPERTIES shows and takes twips alike. It was observed in an IDE started with an `APPDATA` of its own, reading the PROPERTIES box and the control's position.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a CustomControls form with a control at Left 20, Top 200, 120 x 32 (pixels, in the `.tbform` file).
2. Select the control. PROPERTIES shows Left 300, Top 3000, Width 1800, Height 480.
3. Type 40 in Left and press Enter. The control moves to Left 40 pixels, and the box then shows 600.

**Expected behavior**
PROPERTIES showing and taking the same unit: pixels on a CustomControls form, whose controls are laid out in pixels.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
`cacheParentScaleModeInfo` (`ide/main.js`) takes a form with no `ScaleMode`, as a CustomControls form is, to be in `vbTwips` and multiplies by 15 for the display. On a VB form in twips, Command1 at 10 pixels shows Left 150, and typing 450 moves it to 30 pixels.

Severity: low. The control moves on the surface at once, so the mistake is visible.

<!-- Reproducer: bugs/customcontrols-properties-twips/ (mode lane: asserted by `ide-test.bat --only forms` (test/ide/forms.test.mjs), the test "on a CustomControls form, PROPERTIES shows a control's Left in twips but takes a typed value in pixels", which passes on BETA 1005, on the lane's third project, test/ide/probes/forms-custom, a copy of test/shots/customcontrols; the control "on a form of the VB package, PROPERTIES shows a control's Left in twips and takes a typed value in twips" passes too). No project and no zip. A page of the Designing forms and reports chapter, docs/IDE/Forms/ (Properties.md, under units; the chapter is being written), will carry a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-12 in the trials for the Designing forms and reports pages (their fact sheet's D13). -->

---

## Escape and then a pointer move over the form mark the form changed, with an undo step that changes nothing

**Describe the bug**
In a form designer with a control selected, Escape selects the form. The next move of the pointer over the form, with no button pressed, or a click on a control, marks the form changed and makes an undo step, though nothing has moved. Closing then asks to save, and Ctrl+Z first steps through the empty undo step before it reaches the last real change. It was observed in an IDE started with an `APPDATA` of its own, reading the tab, the messages the designer sends to the IDE, and the controls' positions.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a form that has not been changed. Click a control, Command1.
2. Press Escape. The form is selected.
3. Move the pointer over the form. The tab is marked changed; no control has moved.
4. For the undo step: open the form again, click Command1, press Right Arrow, then do steps 2 and 3. Ctrl+Z leaves Command1 where the arrow put it; a second Ctrl+Z moves it back.

**Expected behavior**
No change and no undo step until something on the form changes, as a click on one control and then another gives.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
After step 3 the designer sends `onChanged` and `onSignificantChange`. It writes the surface into the form state, so at a display scaling other than 100 % a position the surface rounds to a device pixel changes in what Save writes: at 150 %, Check1's `Top` of 55 became 54.6667. It does not happen every time: in the trials one try in four did not do it, when Escape had first closed an open File menu, and in the reproducer's first four runs two plain tries in seven did not. A click on a control, a Format menu opened and closed, and the grid panel shown and left do not do it.

Severity: low. Nothing visible moves; the reader is asked to save a form they did not change.

<!-- Reproducer: bugs/form-escape-marks-changed/ (mode lane: asserted by `ide-test.bat --only forms` (test/ide/forms.test.mjs), the tests "Escape, which selects the form, and then a pointer move over it mark the form changed with no control moved" and "the change that Escape and a pointer move make is an undo step that changes nothing", which pass on BETA 1005; the control "a click on one control and then on another leaves the form unchanged" passes too. Each test makes up to five tries, each in a designer opened afresh, and passes on the first that shows the defect: the defect showed on five tries in seven, so five tries all miss it about once in five hundred runs, when verify would wrongly say it no longer reproduces; run it again before believing that). No project and no zip. A page of the Designing forms and reports chapter, docs/IDE/Forms/ (Designer.md, under selecting; the chapter is being written), will carry a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-12 in the trials for the Designing forms and reports pages (their fact sheet's D14). -->

---

## Ctrl+A does nothing in a PROPERTIES box

**Describe the bug**
In the PROPERTIES pane, Ctrl+A in a property's box neither selects the box's text nor does anything else: the caret stays where it was, and the designer's selection is unchanged. Typing then adds to the value. It was observed in an IDE started with an `APPDATA` of its own, reading the box's selection.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a form and click Command1.
2. Click in the Caption box of PROPERTIES and press End. The caret is at 8, after `Command1`.
3. Press Ctrl+A. The selection is still 8 to 8, and only Command1 is selected in the designer.
4. Type `Go`: the box holds `Command1Go`.

**Expected behavior**
Ctrl+A selecting the box's text, as it does in every other text box.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
With the designer focused, Ctrl+A selects every control, as it should. In a PROPERTIES box the key is consumed and does neither.

Severity: low. Home, Shift+End or the mouse select the text.

<!-- Reproducer: bugs/properties-ctrl-a/ (mode lane: asserted by `ide-test.bat --only forms` (test/ide/forms.test.mjs), the test "Ctrl+A in a PROPERTIES box selects nothing", which passes on BETA 1005; the control "Ctrl+A with the designer focused selects every control" passes too). No project and no zip. A page of the Designing forms and reports chapter, docs/IDE/Forms/ (Properties.md, under editing a value; the chapter is being written), will carry a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-12 in the trials for the Designing forms and reports pages (their fact sheet's N3). -->

---

## Alt+arrow in the form designer also opens the IDE's menu bar

**Describe the bug**
In the form designer, Alt+Left, Alt+Right, Alt+Up and Alt+Down align the selected controls (lefts, rights, tops, bottoms). Each also opens the IDE's menu bar, which then has to be closed with Escape. The IDE opens its menu bar as soon as Alt goes down, so every Alt shortcut opens it. It was observed in an IDE started with an `APPDATA` of its own, sending the keys as a keyboard does.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a form and select Command1 and Check1.
2. Press Alt+Left. Check1's left edge moves to Command1's, and the IDE's menu bar opens.

**Expected behavior**
The alignment only. A menu bar opened by Alt alone, when it is released with no other key pressed, as Windows does.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Alt pressed and held alone opens the menu bar before it is released. With the arrow's key events carrying the Alt flag but no key event for Alt itself, the menu bar opens on the arrow's key-up.

Severity: low. The alignment is done; the menu is in the way.

<!-- Reproducer: bugs/form-alt-arrow-menu/ (mode lane: asserted by `ide-test.bat --only forms` (test/ide/forms.test.mjs), the test "Alt+Left in the designer also opens the IDE's menu bar", which passes on BETA 1005; the control "Alt+Left aligns the selected controls' left edges" passes too). No project and no zip. A page of the Designing forms and reports chapter, docs/IDE/Forms/ (Arranging.md, under the keys; the chapter is being written), will carry a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-12 in the trials for the Designing forms and reports pages (their fact sheet's N7). -->

---

## Renaming a control to another control's name asks the control-array question twice

**Describe the bug**
Typing the name of another control into a control's Name box in PROPERTIES asks whether to create a control array. Answered YES, the other control becomes element 0 of an array, but the renamed control keeps its name and the same question is asked again; a second YES renames it as element 1. It was observed in an IDE started with an `APPDATA` of its own, reading the boxes shown and the controls' names.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a form with Label1 and Check1, neither in an array.
2. Select Label1, type `Check1` in its Name box and press Enter. The box asks: *A control already exists with the name 'Check1'. Do you want to create a control array?*
3. Click YES. Check1 becomes Check1(0), Label1 is still Label1, and the same box is shown again.
4. Click YES. Label1 becomes Check1(1).

**Expected behavior**
One question; YES makes both controls the array, Check1(0) and Check1(1).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Answering NO to the first question asks nothing more and keeps the old name. Renaming to the name of an existing array (Command1 to Command2, with Command2(0) and Command2(1) on the form) asks nothing and makes Command2(2).

Severity: low. The second question can be answered, and the result is then right.

<!-- Reproducer: bugs/form-array-question-twice/ (mode lane: asserted by `ide-test.bat --only forms` (test/ide/forms.test.mjs), the test "renaming Label1 to Check1 asks the control-array question twice: the first YES makes Check1 an array, the second renames Label1", which passes on BETA 1005; the control "renaming a control to another's name and answering NO asks once and keeps the name" passes too). No project and no zip. A page of the Designing forms and reports chapter, docs/IDE/Forms/ (Properties.md or Designer.md, under control arrays; the chapter is being written), will carry a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-12 in the trials for the Designing forms and reports pages (their fact sheet's N4). -->

---

## Add Windows Form accepts a name that is not an identifier

**Describe the bug**
Add Windows Form (and the other Add commands for a designer) asks for the file's name and makes the class's name from it. A name with a space is turned into a bracketed identifier, `[My Form]`, but a name that starts with a digit is taken as it is: `1bad` gives `Class 1bad`, with no message, and the project then does not compile. It was observed in an IDE started with an `APPDATA` of its own, reading the new `.twin` file and the diagnostics.

**To Reproduce**
Steps to reproduce the behavior:
1. In Project Explorer, choose Add > Add Windows Form. The name box offers `MyForm.tbform` with `MyForm` selected.
2. Type `1bad` and press Enter. `1bad.tbform` and `1bad.twin` are created and the designer opens; nothing is said.
3. `1bad.twin` holds `Class 1bad`, and DIAGNOSTICS lists `TB5174 Invalid number format` at line 4.

**Expected behavior**
The name refused with a message, or made into an identifier as `My Form` is.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
`a.b` gives `Class [a.b]`, and `My Form` gives `Class [My Form]` and a form whose `Name` is `[My Form]`.

Severity: low. The compile error is listed at once.

<!-- Reproducer: bugs/add-form-bad-name/ (mode lane: asserted by `ide-test.bat --only forms` (test/ide/forms.test.mjs), the test "Add Windows Form accepts the name 1bad, which is not an identifier, and writes Class 1bad, which does not compile", which passes on BETA 1005; the control "Add Windows Form named My Form writes Class [My Form]" passes too). No project and no zip. A page of the Designing forms and reports chapter, docs/IDE/Forms/ (Designer.md, under adding a form; the chapter is being written), will carry a NOTE for it; when a fixed build is released, that NOTE goes. The trial left open whether the project compiles; the lane found TB5174. Found 2026-10-12 in the trials for the Designing forms and reports pages (their fact sheet's N6). -->

---

## View > Zoom Out stops at 50 %, though the zoom box offers 25 %

**Describe the bug**
With a form designer focused, View > Zoom Out lowers the zoom one step at a time, 75 %, then 50 %, and then does nothing more, though the toolbar's zoom box offers 25 % and can choose it. View > Zoom In from 50 % steps up to 400 %. It was observed in an IDE started with an `APPDATA` of its own, reading the zoom box after each command.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a form and click it, so that the designer has the focus.
2. Choose View > Zoom Out four times. The zoom box reads 75 %, 50 %, 50 %, 50 %.

**Expected behavior**
A third Zoom Out going to 25 %, the box's smallest value.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
`tbFormDesigner_ZoomDecrease` (`ide/main.js`) steps only `if (zoomSelect.selectedIndex > 1)`, and 25 % is index 0. The same commands scale the zoom by `g_textScaleFactor` the opposite way from the zoom box (`value * (textScale/100)` against `value / (textScale/100)`), which matters only when the Windows text size is above 100 %; that is not reported here, since it could not be tested.

Severity: low. The box reaches 25 %.

<!-- Reproducer: bugs/form-zoom-out-floor/ (mode lane: asserted by `ide-test.bat --only forms` (test/ide/forms.test.mjs), the test "View > Zoom Out goes 100 %, 75 %, 50 % and then stays at 50 %, though the zoom box offers 25 %", which passes on BETA 1005; the control "View > Zoom In goes up one step from 50 %" passes too). No project and no zip. A page of the Designing forms and reports chapter, docs/IDE/Forms/ (Designer.md, under the zoom; the chapter is being written), will carry a NOTE for it; when a fixed build is released, that NOTE goes. The fact sheet's D3 (the opposite scale factors) is in the same code and needs the Windows text size above 100 %, so a person, not a lane. Found 2026-10-12 in the trials for the Designing forms and reports pages (their fact sheet's D8). -->

---

## The History entry for a change in a designer reads [line: undefined]

**Describe the bug**
A change in a form designer adds an entry to the HISTORY panel, named after the form. Its tooltip reads the file's path followed by `[line: undefined]`, where an entry for an edit in a code file gives the line. It was observed in an IDE started with an `APPDATA` of its own, holding the pointer on the entry.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a form, click a control and press Right Arrow.
2. Show the HISTORY panel and hold the pointer on the entry for the form. The tooltip reads `/<Project>/Sources/frmMain.tbform [line: undefined]` and the date.

**Expected behavior**
No line in the tooltip of a designer's entry, since a designer has none.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The designer's `onSignificantChange` handler calls `updateHistory(uri, <form name>)` with no line, and the tooltip is built as `<path> [line: <line>]`. An edit inside a procedure of a code file gives an entry whose tooltip reads `[line: 5]`. A double-click on the form's entry opens the designer, as it should.

Severity: low. Cosmetic.

<!-- Reproducer: bugs/history-form-line-undefined/ (mode lane: asserted by `ide-test.bat --only forms` (test/ide/forms.test.mjs), the test "the History entry for a change in a designer reads [line: undefined] in its tooltip", which passes on BETA 1005; the control "the History entry for an edit in a procedure names the line in its tooltip" passes too). No project and no zip. A page of the Designing forms and reports chapter, docs/IDE/Forms/ (Designer.md; the chapter is being written), will carry a NOTE for it, or the Writing code chapter's docs/IDE/Code/Navigating.md, which already states [line: undefined]; when a fixed build is released, that NOTE goes. Found 2026-10-12 in the trials for the Designing forms and reports pages (their fact sheet's D5). -->

---

## Shift+F7 does not switch from a form's code to its designer when a folder in its path has .twin in its name

**Describe the bug**
Shift+F7, and the toolbar's Switch Between Form And Code, open a form's designer from its code file. When a folder in the file's path has `.twin` in its name, such as `Sources/v1.twin.forms/frmDeep.twin`, they show the notification *Unable to switch form design mode: this document is not part of a form* and open nothing. From the designer to the code the switch works. It was observed in an IDE started with an `APPDATA` of its own.

**To Reproduce**
Steps to reproduce the behavior:
1. A project with a form frmDeep in the folder `Sources/v1.twin.forms` (`frmDeep.tbform` and `frmDeep.twin`).
2. Open `frmDeep.twin` and press Shift+F7. The notification above is shown, and the designer does not open.

**Expected behavior**
The designer of frmDeep opened, as Shift+F7 does for a form in `Sources`.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
`switchToFormPart` (`ide/main.js`) replaces the first `.twin` in the whole path with `.tbform`, giving `Sources/v1.tbform.forms/frmDeep.twin`, which does not exist. From the designer the first `.tbform` in the path is the file's own, so that direction works.

Severity: low. The designer opens from Project Explorer.

<!-- Reproducer: bugs/form-switch-twin-folder/ (mode lane: asserted by `ide-test.bat --only forms` (test/ide/forms.test.mjs), the test "Shift+F7 in the code of a form in the folder v1.twin.forms says the document is not part of a form", which passes on BETA 1005; the control "Shift+F7 switches from a form's code to its designer, and the switch from frmDeep's designer opens its code" passes too). No project and no zip. A page of the Designing forms and reports chapter, docs/IDE/Forms/ (Designer.md, under switching to code and back; the chapter is being written), will carry a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-12 in the trials for the Designing forms and reports pages (their fact sheet's D11). -->

---

## With a report open, a floating Toolbox lists every form control

**Describe the bug**
With a report designer open, the docked Toolbox lists only the tools a report can hold: Pointer, Label, Shape, Line, Image, CheckMark and QRCode. When the Toolbox floats, it lists all 24 tools of a form and More components. A tool a report cannot hold is refused when used, with the notification *Can't add CommandButton to a report. Only windowless controls allowed.* It was observed in an IDE started with an `APPDATA` of its own, reading the tools shown.

**To Reproduce**
Steps to reproduce the behavior:
1. Add a report with Add Windows Report and Enter. The docked Toolbox lists the seven tools above.
2. Hide the Toolbox and show it again (View > TOOLBOX twice), so that it floats. It lists Pointer, PictureBox, Label, TextBox, Frame, CommandButton and the rest, 24 tools, and More components.

**Expected behavior**
The same seven tools as the docked Toolbox.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The rule that hides the other tools for a report (`.reportDesignerMode ...`) applies only inside `#bodyInner`, where the docked Toolbox is; a floating panel is outside it.

Severity: low. Nothing wrong can be added.

<!-- Reproducer: bugs/report-floating-toolbox/ (mode lane: asserted by `ide-test.bat --only forms` (test/ide/forms.test.mjs), the test "with a report open, a floating Toolbox lists every tool of a form", which passes on BETA 1005; the control "with a report open, the docked Toolbox lists the report's seven tools" passes too). No project and no zip. A page of the Designing forms and reports chapter, docs/IDE/Reports/ (the report designer's tools; the chapter is being written), will carry a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-12 in the trials for the Designing forms and reports pages (their fact sheet's D4). -->

---

## A package's read-only designer file opens an empty tab besides the notice that it cannot be opened

**Describe the bug**
A designer file of a referenced package, such as the VB package's `tbObjectDesigner_PROPERTYPAGE.tbppage`, is read-only. Opening it from Project Explorer shows the notification *Can't open designer for a read-only document.*, and also adds a tab of that name and selects it: an empty tab with no close icon. A middle click closes it. It was observed in an IDE started with an `APPDATA` of its own.

**To Reproduce**
Steps to reproduce the behavior:
1. In a project that references the VB package, expand Packages > VB > Sources > DESIGNERS in Project Explorer.
2. Double-click `tbObjectDesigner_PROPERTYPAGE.tbppage`. The notification above is shown, and an empty tab `tbObjectDesigner_PROPERTYPAGE.tbppage` is added and selected.

**Expected behavior**
The notification only, with no tab; or the file shown read-only, as View As JSON can.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The IDE never reports the file as opened (the open's completion callback is not called), and the page throws a `TypeError` in a websocket request handler.

Severity: low. Cosmetic; the tab closes with a middle click.

<!-- Reproducer: bugs/readonly-designer-empty-tab/ (mode lane: asserted by `ide-test.bat --only forms` (test/ide/forms.test.mjs), the test "a package's read-only designer file opens an empty tab of its name besides the notice that it cannot be opened", which passes on BETA 1005; it opens the file with openEditors.openFile, as a double-click in Project Explorer does, and asserts the tab has no close icon). No project and no zip. A page of the Designing forms and reports chapter, docs/IDE/Forms/ (Designer.md; the chapter is being written), will carry a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-12 in the trials for the Designing forms and reports pages (their fact sheet's N8). -->

---

## A form file with bad JSON opens an empty designer that takes no edit

**Describe the bug**
A `.tbform` file whose JSON has a syntax error (the project lists `TB5246 bad JSON syntax` for it) opens in a designer tab that shows no control and an empty PROPERTIES pane, with the notification *ERROR: bad JSON encountered when parsing tbform*. The designer looks usable but takes no edit: a control drawn or double-clicked from the Toolbox is not added, the tab is never marked changed, and Ctrl+S leaves the file as it was. Nothing is lost. It was observed in an IDE started with an `APPDATA` of its own, reading the designer and the saved project file.

**To Reproduce**
Steps to reproduce the behavior:
1. A project with a form whose `.tbform` file has a doubled comma, `"Height": 300,,`.
2. Open the `.tbform`. The notification above is shown, and the designer tab is empty.
3. Double-click the CommandButton tool. Nothing is added, and the tab shows no change mark.
4. Press Ctrl+S. The file is as it was.

**Expected behavior**
The designer not opened, with the notification, or a message in the designer that the file cannot be read, so that the reader opens it as text to repair it.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The page throws `TypeError: Cannot read properties of undefined (reading '0')` in `formDesigner_syncToState` when the designer opens, and `addControl` throws at the double-click. A `.tbform` with no `FormDesignerId` opens normally.

Severity: low. Nothing is lost; the empty designer is misleading.

<!-- Reproducer: bugs/form-bad-json-empty-designer/ (mode lane: asserted by `ide-test.bat --only forms` (test/ide/forms.test.mjs), the test "a form file with bad JSON opens an empty designer that adds no control, and Save leaves the file as it was", which passes on BETA 1005, on the lane's second project, test/ide/probes/forms-badjson, which the lane opens accepting its two errors, TB5246 and TB5247). No project and no zip. A page of the Designing forms and reports chapter, docs/IDE/Forms/ (Designer.md, under the .tbform file; the chapter is being written), will carry a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-12 in the trials for the Designing forms and reports pages (their fact sheet's N9). -->

---

## A UDT of more than 4 bytes passed `ByVal` from an array element corrupts the stack in a 32-bit build, and the calling procedure ends in an access violation

**Describe the bug**
In a 32-bit build, passing an element of a UDT array `ByVal` (`Take a(1)` for `Sub Take(ByVal p As Pair)`, where `Pair` holds two `Long`s) runs the procedure with the right value, but leaves the stack wrong, and the calling procedure ends in an access violation as it returns. The IDE run stops with `NATIVE EXCEPTION: ACCESS_VIOLATION` at the `Sub` line of the caller, and a built exe exits with code 0xC0000005 and no message box. In the debugger's test mode (the `evaluate` request with `isTest`, which `tbrun --tests` uses) the same code never returns. Only a UDT of 5 bytes or more is affected. Observed with `tbrun` (IDE run, `--exe` and `--tests`). Found while documenting the GdiPlus package, where `g.DrawLine pen, pts(1), pts(2)` with `pts` an array of the 8-byte `GpPointF` never returns.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `udt-array-element-byval-argument-stack.twinproj` (attached as `udt-array-element-byval-argument-stack.zip`). Its module `Startup` is:
   ```
   Public Type Pair
       X As Long
       Y As Long
   End Type

   Public Sub Take(ByVal p As Pair)
       Debug.Print "in Take " & p.X
   End Sub

   Public Sub Main()
       Dim a(1 To 3) As Pair
       a(1).X = 5
       Take a(1)
       Debug.Print "after call"
   End Sub
   ```
2. Run the project in the IDE (F5), as a 32-bit project (the default).
3. The DEBUG CONSOLE prints `in Take 5` and `after call`, then `NATIVE EXCEPTION: ACCESS_VIOLATION /Startup.twin; Startup.Main`, and the run ends. Build an exe and run it from a command prompt: it ends with -1073741819 (0xC0000005).

**Expected behavior**
`Main` returns normally, as it does when `Take` is given a scalar `Pair` variable, or a copy of the element made first. Passing a UDT `ByVal` is a twinBASIC extension (VB6 refuses the declaration: *User-defined type may not be passed ByVal*), so there is no VB6 behaviour to compare with.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
These fail the same way: a UDT of 5 bytes (a `Long` and a `Byte`), 8 bytes (two `Long`s; a `Double`; a `LongLong`), 12, 16 and 32 bytes; a local fixed-size, a dynamic (`ReDim`) and a module-level array; a two-dimensional array; the argument written `Take (a(1))` or `Call Take(a(1))`; and a `Function` in place of the `Sub`. These are right: a UDT of 4 bytes or less (a `Long`, two `Integer`s, three `Byte`s, a pointer), a scalar UDT variable, an array element copied to a variable first (`e = a(1)`, `Take e`), a `ByRef` parameter, and an element of an array declared inside a UDT (`h.Arr(1)`). A 64-bit build is right, and so is a build with LLVM, 32-bit and 64-bit. In the test mode the code does not return, so `tbrun --tests` reports "no answer" after its time-out and runs none of the cases after it.

Severity: high for a 32-bit program. The call itself works, and the fault comes later, when the procedure returns, so it is hard to trace; with LLVM or a 64-bit build, or by copying the element to a variable first, it does not happen.

Not tried: a `Property Let` or a method of a class with such a parameter, an `Optional` or `ParamArray` parameter, an element of an array that is a member of a class, a UDT with a method declared in it (the case that found it has none), and the generated code.

<!-- Reproducer: bugs/udt-array-element-byval-argument-stack/ (mode run, 32-bit: the console has `in Take 5`, `after call` and NATIVE EXCEPTION: ACCESS_VIOLATION, and tbrun exits 5); verified on BETA 1005 by `bug_repro.mjs verify`. Controls, all returning normally (checked in a scratch project of 11 sizes and shapes, not kept): `run --arch win64`, `run --llvm` and `run --llvm --arch win64`, and the 4-byte and scalar cases listed above; `run --exe` ends 0xC0000005. Page: docs/Reference/Core/Type.md carries a WARNING labelled BETA 1005, under "twinBASIC enhancements" after "Member procedures"; remove it when a fix is released. Found 2026-10-16 while documenting GdiPlus (indexer/.packages/contributed/GdiPlus): the DrawLine samples that pass pts(1), pts(2). -->

---

## Calling a method or a property of a UDT on an element of an array of that UDT ends in an access violation

**Describe the bug**
A method or property declared inside a `Type` (a twinBASIC extension), called on an element of an array of that type (`a(1).Sum`, `a(1).Bump`), ends in an access violation: `NATIVE EXCEPTION: ACCESS_VIOLATION` in the IDE run, error -2147467259 in a `[TestCase]`, and 0xC0000005 in a built exe. It happens for a local, static, module-level, dynamic and parameter array, in 32-bit and 64-bit builds, whatever the UDT's size (one byte included) and even when the method does not touch `Me`. The same call on a scalar variable, on a UDT member of another UDT, or on an element of an array declared inside a UDT works. In a build with LLVM the call does not fail, but gives wrong results. Observed with the reproducer's regression tests (`tbrun --tests`), `tbrun` and `tbrun --exe`. Found while documenting the GdiPlus package, where `types(1).CloseSubpath` on the `PathPointType` array that `GraphicsPath.GetTypes` returns, and `pts(1).Diff(pts(2))` on `GpPointF`, end this way.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `udt-array-element-method-call-crash.twinproj` (attached as `udt-array-element-method-call-crash.zip`). Its module `Startup` declares the UDT `Pair`, with a property `Sum`, a `Sub` `Bump`, a `Function` `Const1` that ignores `Me` and a `Function` `Diff`. Its module `RegressionTests` holds one `[TestCase]` for each way of calling them, asserting the correct result. The central one is:
   ```
   Dim a(1 To 3) As Pair
   a(1).X = 5
   Debug.Print "a(1).Sum = " & a(1).Sum
   ```
2. Run it (F5). `Sub Main` stops with `NATIVE EXCEPTION: ACCESS_VIOLATION` at the line of `a(1).Sum`.
3. Run its test cases (`node scripts/tbrun.mjs <exported-source-dir> --tests`; BETA 1005 has no way to run them in the IDE): 12 of the 18 fail with `(runtime error -2147467259: NATIVE EXCEPTION: ACCESS_VIOLATION)`.

**Expected behavior**
`a(1).Sum` returns 5, as `p.Sum` does for a scalar `Pair` variable `p`, and `a(1).Bump` increments `a(1).X`. UDT methods are a twinBASIC extension (VB6 has no methods in a `Type`), so there is no VB6 behaviour to compare with.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Each of these fails: a property, a `Sub`, a `Function` that ignores `Me`, and a `Function` that takes a UDT argument (`a(1).Diff(a(2))`); a lower bound of 0 or 1; a variable index; the element as a `With` object; a static array; a dynamic array; a module-level array; and an array parameter (`b(1).Sum` in a procedure that takes `ByRef b() As Pair`); a UDT of one `Byte`. These work: a scalar variable; a UDT member of a UDT (`h.One.Sum`); an element of an array declared inside a UDT (`h.Many(1).Sum`); an element copied to a variable first; and the element's plain fields (`a(1).X`). A UDT passed `ByVal` from an array element is a different defect, with an entry of its own (`udt-array-element-byval-argument-stack`): it needs no method, and the fault comes after the call returns.

With LLVM (`tbrun --llvm`): the property of an element of a 32-bit build returns garbage (`17820977` for a UDT holding 5 and 0), and in a 64-bit build returns the right value; in both builds `a(1).Bump` runs but leaves `a(1).X` unchanged, as if it worked on a copy. A scalar variable is right in both. LLVM also cannot compile a method called on an element of an array inside a UDT (`h.A(1).Bump`: "a feature used in your code is not yet supported").

Severity: high for any program that keeps UDTs with methods in an array, which a loop over points or rectangles does: it ends at the first call, with no hint why. Copying the element to a variable first (`e = a(i)`, `e.Sum`) avoids it, for a method that does not change the element.

Not tried: a generic UDT (member procedures are not supported on generic UDTs), a UDT with `Type_Assignment`, an array of arrays, an array of UDTs held in a `Variant`, the call through `Declare` members, and the generated code.

<!-- Reproducer: bugs/udt-array-element-method-call-crash/ (mode test: `tbrun --tests` runs the 18 [TestCase]s of RegressionTests; expect lists the six PASS controls and the twelve FAIL lines with the access violation, 32-bit); verified on BETA 1005 by `bug_repro.mjs verify`, and the same twelve fail with `run --arch win64`. The LLVM and exe results are from scratch probes (p4/p7: scenarios of a Sub per case with a Select Case on a Const), not kept. Pages: docs/Reference/Core/Type.md (after "Member procedures") and docs/Features/Language/UDTs.md (end of "Procedures, Constructors, Destructors, and Operators") carry a WARNING labelled BETA 1005; remove it when a fix is released. Found 2026-10-16 while documenting GdiPlus (GpPointF, GpRect, PathPointType); GdiPlus's own landing page should say the same in its section on those types, and the samples that call members on array elements copy the element first. -->

---

## A call of a method named `Line` or `Scale` with one parenthesised point, `o.Scale (2, 3)`, is accepted and silently dropped

**Describe the bug**
The compiler reads a call of a method named `Line` or `Scale` as the graphics syntax (documented in the language reference, *Line, Circle, PSet, Scale*), whatever the type of the object: `o.Scale (x1, y1)-(x2, y2)` calls the method with a *Flags* value first. The documentation says `Scale` takes two points or nothing, and a `Line` needs its second point. A call with one point, `o.Scale (2, 3)`, `o.Line (2, 3)`, or the same written without the space (`o.Scale(2, 3)`), is accepted with no diagnostic and compiled to nothing: the method is not called and no error is raised. VB6 gives *Syntax error* for the same call of a procedure named `Line` (`Module1.Line (2, 3)`). With a single value in the parentheses, `o.Scale (2)`, the compiler reports TB5212 *Too many close brackets*. Observed with `tbrun`, in the IDE run, and for a class method and for a method declared inside a `Type`. Found while documenting the GdiPlus package, whose `GpPointF` and `GpSizeF` have members named `Scale`: `p.Scale(2)` is a syntax error there.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `graphics-method-lone-point-dropped.twinproj` (attached as `graphics-method-lone-point-dropped.zip`, with the VB6 project as `graphics-method-lone-point-dropped-vb6.zip`). Its class `Plotter` has `Line` and `Scale` methods with the parameters the compiler passes for the graphics syntax (*Flags* first), and a method `Foo`; each prints its arguments. The calls of its module `Startup`, abridged, are:
   ```
   Public Sub Main()
       Dim p As New Plotter
       p.Line (1, 2)-(3, 4)
       p.Scale (1, 2)-(3, 4)
       p.Foo(2, 3)
       Debug.Print "--- one point"
       p.Line (2, 3)
       p.Scale (2, 3)
       p.Line(2, 3)
       p.Scale(2, 3)
       Debug.Print "done"
   End Sub
   ```
2. Run it (F5).
3. The DEBUG CONSOLE prints `Line F=4 (1,2)-(3,4) C=0`, `Scale F=4 (1,2)-(3,4)` and `Foo 2,3` for the first three calls, then `--- one point` and `done` with nothing between: the four one-point calls did not call the methods, and raised no error. Add `p.Scale (2)` to see TB5212 and TB5069 at the closing parenthesis.

**Expected behavior**
A syntax error for the one-point call, as VB6 gives (*Compile Error: Syntax error*; the attached VB6 project holds what VB6 accepts and lists its refusals), or the method called. A call that vanishes silently is the worst of the three: the program runs and the effect is missing. The one-value error would be clearer if it said that a method named `Scale` or `Line` is read as the graphics syntax.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The same in a 64-bit build and with LLVM. A method declared inside a `Type` behaves the same (`Sub Scale(ByVal sx!, ByVal sy!)` called as `s.Scale(2, 3)` leaves the UDT unchanged). A method of any other name (`Foo`, `Move`, `Point`, `PaintPicture`, `Drag`, `ZOrder`, `Show`, `Hide`, `TextWidth`, `Refresh`, `SetFocus`, `Cls`) is called with parentheses or without. `o.Circle(2, 3)` and `o.PSet(2, 3)` are refused (TB5075 and TB5103), as is `o.Print(2, 3)` (TB5182), so those are not silent. What works for `Line` and `Scale`: `Call o.Scale(2, 3)`, and `o.Scale 2, 3` with no parentheses. VB6 does not allow a procedure named `Scale` at all, and allows `Line` only in a module, where it can only be called with the graphics syntax; so twinBASIC code that follows VB6 never meets this, and code in the new style, such as GdiPlus's UDT methods named `Scale`, does.

Severity: medium. An effect that does not happen, with no message, but only for the two names and only for a parenthesised call that is not complete. Writing the call with `Call`, or without parentheses, avoids it.

Not tried: a `Function` with these names used in an expression (`x = o.Scale(2, 3)`), a late-bound call through `Object`, and `Circle`, `PSet` with other argument counts.

<!-- Reproducer: bugs/graphics-method-lone-point-dropped/ (mode run: expect lists the printed lines of the complete forms and the plain forms, and absent `Line F=... (2,3)` and `Scale F=... (2,3)`); verified on BETA 1005 by `bug_repro.mjs verify`. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints what VB6 accepts; its refusals (a lone point, the plain list and Call for a procedure named Line, and Scale as a procedure name) are in the comments of vb6/Module1.bas and were each checked by building them. The other names, the Type method, the 64-bit and LLVM results are from scratch probes, not kept. Page: docs/Reference/Core/Graphics-Methods.md, in "Any object can take the syntax", carries a WARNING labelled BETA 1005 for the dropped call and a NOTE for the one-value syntax error (which is by design: the compiler reads the graphics syntax from the name); remove the WARNING when a fix is released. Found 2026-10-16 while documenting GdiPlus (GpPointF.Scale, GpSizeF.Scale: a one-argument call is TB5212, so those samples write `p.Scale 2`). -->

---

## Assigning to an object-typed member of a UDT without `Set`, including through the object's default member, is a codegen error that fails the build

**Describe the bug**
A let-assignment (no `Set`) to a UDT member whose type is a class compiles with no diagnostic, and the build then fails: `[LINKER] compilation (codegen) error detected in 'Startup.Mainrootmain' at line #17`, `[LINKER] FAILED due to compilation errors`, and no exe is made; the IDE run does not start. This includes `h.o = 5` where the member's class has a default member, which sets the value of `h.o`: valid VB6, and working in twinBASIC for a local variable or a field of a class. Without a default member the same statement (`h.o = p`, or `h.o = New Widget`) is the same codegen error, where a local variable gets error 91 at run time. Observed with `tbbuild`, `tbbuild --build` and `tbrun`. Found while documenting the GdiPlus package, whose `PathIterator.NextSubpathPath` and `NextMarkerPath` contain `NextSubpathPath.path = New GraphicsPath(gpsp.path)`: the build of any project that uses them reports the codegen error for them (there the build still makes the exe).

**To Reproduce**
Steps to reproduce the behavior:
1. Open `udt-object-member-let-assignment-codegen.twinproj` (attached as `udt-object-member-let-assignment-codegen.zip`, with the VB6 project as `udt-object-member-let-assignment-codegen-vb6.zip`). Its class `Widget` has a field `N` and a default property `Value` that sets and gets `N`. Its module `Startup` is:
   ```
   Public Type Holder
       o As Widget
   End Type

   Public Sub Main()
       Dim h As Holder
       Set h.o = New Widget
       h.o = 5
       Debug.Print "N = " & h.o.N
   End Sub
   ```
2. Compile the project: no diagnostic. Run it (F5) or build it.
3. The DEBUG CONSOLE prints `[LINKER] compilation (codegen) error detected in 'Startup.Mainrootmain' at line #17` and `[BUILD] failed`; `Main` does not run.

**Expected behavior**
`h.o = 5` sets `h.o.N` to 5, as it does for `q = 5` with a local `q As Widget`, and in VB6 (the attached project prints `h.o = 5 (default member): N = 5`). For a class with no default member, VB6 raises error 91 at run time (*Object variable or With block variable not set*), as twinBASIC does for a local variable; the compiler should at least report a diagnostic at the statement, and not a codegen error that names the procedure.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The same codegen error for: a UDT variable, an element of an array of the UDT (`a(1).o = 5`), a member of a nested UDT (`h.in1.o = 5`), and the function-result variable of a function that returns the UDT (`Next1.path = New GP(g.path)`, as in GdiPlus); with a default member (`= 5`) and without one (`= p`, `= Nothing`, `= New Widget`); in 32-bit and 64-bit builds; and with LLVM, where it is "a feature used in your code is not yet supported with the LLVM compiler" for the whole procedure. Right: `Set h.o = p`; a local variable (`q = 5` runs; `q = p` without a default member raises 91); a field of a class (`c.o = 5` runs; `c.o = p` raises 91); a UDT member typed `Object` (`h.ob = p` runs) and one typed `Variant` (raises 438, *Object doesn't support this property or method*). A local `q = New Widget` gets warning TB0022 (*assignment to class that does not seem to offer a default property-put member*) at compile time; the UDT-member case gets no diagnostic of any kind.

Severity: medium. The failure is at build time, so nothing runs wrongly, but the message names only the procedure, and the statement can be a plain default-member assignment that VB6 accepts. Writing `Set h.o = ...` with a new object, or `h.o.Value = 5`, avoids it.

Not tried: a member typed with an interface, a generic class, a `Property Let` of the default member that takes an index, and the generated code.

<!-- Reproducer: bugs/udt-object-member-let-assignment-codegen/ (mode build: tbbuild --build exits 5 and the output names the codegen error in 'Startup.Mainrootmain'); verified on BETA 1005 by `bug_repro.mjs verify`. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints N = 5 for the default member, 6 for the local, and error 91 for a class with no default member. The other variants (nested, array element, function result, win64, LLVM, Object and Variant members) are from scratch probes, not kept. Page: docs/Reference/Core/Type.md carries a NOTE labelled BETA 1005, after "Member procedures": the error cannot be missed and loses nothing; remove it when a fix is released. Found 2026-10-16 while documenting GdiPlus: PathIterator.NextSubpathPath and NextMarkerPath (indexer/.packages/contributed/GdiPlus/sources/GdiPlus/PathIterator.twin) assign a GraphicsPath to a member of their result UDT without Set, which is the package's own mistake as well as this report. -->

---

## Assigning `Me` as a whole value inside a method of a UDT is a codegen error that fails the build

**Describe the bug**
Inside a method or property declared in a `Type` (a twinBASIC extension), an assignment whose right-hand side is `Me` itself (`Copy = Me`, `Return Me`, `t = Me`, `Dim t As R = Me`) compiles with no diagnostic, and the build fails once the method is called: `[LINKER] compilation (codegen) error detected in 'Startup.Copy' at line #15`, `[LINKER] FAILED due to compilation errors`, and the IDE run does not start. Observed with `tbbuild --build` and `tbrun`. Found while documenting the GdiPlus package, where `GpPointF.Normalized` and `OffsetBy`, `OffsetByPt`, `InflatedBy` and `InflatedByPt` of `GpRect` and `GpRectF` (nine members) begin with `<name> = Me` and cannot be built into a program that calls them.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `udt-method-assign-me-codegen.twinproj` (attached as `udt-method-assign-me-codegen.zip`). Its module `Startup` is:
   ```
   Public Type R
       X As Long
       Y As Long

       Function Copy() As R
           Copy = Me
       End Function
   End Type

   Public Sub Main()
       Dim a As R, b As R
       a.X = 7
       a.Y = 8
       b = a.Copy()
       Debug.Print b.X & ", " & b.Y
   End Sub
   ```
2. Compile the project: no diagnostic. Run it (F5) or build it.
3. The DEBUG CONSOLE prints `[LINKER] compilation (codegen) error detected in 'Startup.Copy' at line #15` and `[BUILD] failed`; `Main` does not run.

**Expected behavior**
`Copy` returns a copy of the UDT, so `Main` prints `7, 8`. UDT methods are a twinBASIC extension (VB6 has no methods in a `Type`), so there is no VB6 behaviour to compare with.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The same codegen error for `Return Me`, for a local (`Dim t As R: t = Me`), for `Dim t As R = Me`, for `Property Get Copy() As R: Copy = Me`, for a `ByRef` parameter (`o = Me`), and for a `Variant` (`v = Me`), in 32-bit and 64-bit builds. With LLVM the build prints "a feature used in your code is not yet supported with the LLVM compiler" for the method. These are right: a method that is never called (it is not compiled), `Me.X`, passing `Me` to a `ByVal` parameter (`TakeR Me`), `Me` on the left (`Me = other`), copying field by field (`Copy.X = Me.X`), and a module function that copies a parameter (`Cp = v`).

Severity: medium. The failure is at build time, with a message that names the procedure only. Copying the fields one by one avoids it.

Not tried: `Me` passed to a `ByRef` parameter, `Me` in a `Type_Assignment` member, and the generated code.

<!-- Reproducer: bugs/udt-method-assign-me-codegen/ (mode build: tbbuild --build exits 5 and the output names the codegen error in 'Startup.Copy'); verified on BETA 1005 by `bug_repro.mjs verify`. The variants, win64 and LLVM are from a scratch probe (one #If scenario per form), not kept. Pages: docs/Reference/Core/Type.md (after "Member procedures") and docs/Features/Language/UDTs.md (end of "Procedures, Constructors, Destructors, and Operators") carry a NOTE labelled BETA 1005: the error cannot be missed and loses nothing; remove it when a fix is released. Found 2026-10-16 while documenting GdiPlus (GpPointF.Normalized; OffsetBy, OffsetByPt, InflatedBy, InflatedByPt on GpRect and GpRectF). -->

---

## 32-bit IDE run: Err.Description is "Automation error" for error 5 raised by Collection.Add, in a method of a generic class called on a `Dim x As New` local

**Describe the bug**
In the IDE's run (the debug run, and a `[RunAfterBuild]` Sub), in a 32-bit project, error 5 raised by `Collection.Add item, , , 1` on an emptied `Collection` has `Err.Description` = `Automation error` when three things hold: the failing call is inside a method of a generic class, the method has an `On Error Resume Next` block before it (`Set v = <String>`, `Err.Clear`, `v = <String>`, `On Error GoTo 0`), and the method is called on a local declared `Dim a As New Cls(Of String)`. `Err.Number` is 5. With `Dim a As Cls(Of String)` and `Set a = New Cls(Of String)` the text is `Invalid procedure call or argument`, which is the right text. The built exe (32-bit and 64-bit), the 64-bit IDE run and VB6 give `Invalid procedure call or argument` in every variant. Observed with `bug_repro.mjs run` (which uses `tbrun`), on an exe too, and with VB6 through `bug_repro.mjs vb6`.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `list-error5-automation-text.twinproj` (attached as `list-error5-automation-text.zip`, architecture 32-bit). Its class `Cls(Of T)` is:
   ```
   [COMCreatable(False)]
   Public Class Cls(Of T)
       Private m_Items As New Collection

       Public Sub Add(ByVal item As T)
           m_Items.Add item
       End Sub

       Public Sub Replace(ByVal item As T)
           Dim itemVar As Variant
           On Error Resume Next
           Set itemVar = item
           Err.Clear
           itemVar = item
           On Error GoTo 0
           m_Items.Remove 1
           m_Items.Add itemVar, , , 1
       End Sub
   End Class
   ```
   and `Startup.Main` runs, in the IDE:
   ```
   Dim a As New Cls(Of String)
   a.Add "a"
   On Error Resume Next
   a.Replace "Z"
   Debug.Print "Dim a As New: " & Err.Number & ": " & Err.Description
   ```
   and the same with `Dim b As Cls(Of String)`, `Set b = New Cls(Of String)`.
2. Run the project in the IDE (F5) in the 32-bit architecture.
3. The DEBUG CONSOLE shows `Dim a As New: 5: Automation error` and `Set a = New:  5: Invalid procedure call or argument`. Build the exe and run it: the project exits with code 0 when the text is `Invalid procedure call or argument` (1 for `Automation error`), and the exe exits 0. Switch to 64-bit and run in the IDE: both lines give `Invalid procedure call or argument`.

**Expected behavior**
`5: Invalid procedure call or argument` in every variant, as in the built exe, in the 64-bit IDE run and in VB6 (`vb6/` of the reproducer: `Collection.Add` with Before = 1 on an emptied Collection gives `5: Invalid procedure call or argument`).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Found by the documentation's `List.md` sample for TBMANLIB_Diagnostic 1.0.0.1, whose `List(Of T).SetItem` has this shape (the package's own defect is the `Before = 1` that raises the error). The number is right and only the text differs, so a program that tests `Err.Number` is not affected. A plain `Collection` Add and Remove, `Err.Raise 5` and an `Insert 0` on an empty list (the same Add) give the right text in the same run. The trigger was not narrowed further than the three conditions: the `Collection` alone in a module, with six forms of the `On Error Resume Next` block, gives the right text, and so does a copy of the package's `SetItem` with its `If Err.Number <> 0` form. A second `Dim b As New Cls(Of String)` local fails the same way.

Severity: low. A wrong text for the right error number, in the 32-bit IDE run only.

Not tried: LLVM. With LLVM on (`bug_repro.mjs run --llvm`, 32-bit and 64-bit) the IDE run of this reproducer ends before it returns and prints nothing, so the text could not be read; `On Error Resume Next` around a failing call in LLVM-compiled code is a known problem of its own.

<!-- Reproducer: bugs/list-error5-automation-text/ (mode run, arch win32: expect is tbrun exit 0, the line `Dim a As New: 5: Automation error` and the line `Set a = New:  5: Invalid procedure call or argument`, and absent `Dim a As New: 5: Invalid procedure call or argument`); verified on BETA 1005 by `bug_repro.mjs verify`. Controls, all printing the right text: `run --arch win64`, `run --exe` (exit 0) and `run --exe --arch win64` (exit 0), and `bug_repro.mjs vb6` (`Dim a As New: 5: Invalid procedure call or argument`). `run --llvm` ends before it returns, in both architectures. Pages: docs/Reference/Contributed/TBMANLIB_Diagnostic/List.md carries the NOTE labelled BETA 1005 after its SetItem sample, and that sample prints Err.Number only; remove the NOTE when a fix is released, and let the sample print Err.Description again with the output `5: Invalid procedure call or argument`. Its test case is ListTests.SetItem_AtZeroOnOneItemList_ErrorHasTheRuntimeText (expect.json: win32 fails, win64 passes). Found 2026-10-15 by an exe check of the documentation's samples. -->

---

## LLVM: `For ... Step x` runs with a wrong step when the procedure has a `ByRef Boolean` or `ByRef Integer` parameter after `x`

**Describe the bug**
In a project compiled with LLVM, in a 32-bit and in a 64-bit build, a `For i = 1 To 7 Step x` loop whose step `x` is a `ByVal Long` (or `ByVal Single`) parameter, in a procedure that also has a `ByRef` parameter declared `As Boolean` or `As Integer` after `x`, runs with a wrong step instead of `x`. The wrong value depends on where the caller's argument for the `ByRef` parameter is stored: it is 20 in a 64-bit build and 25 in a 32-bit build when that argument is a local variable of the caller, which is what the reproducer passes. `CountSteps(3, flag)` (the function in the reproducer, which counts the iterations) returns 1 where 3 is right, and `CountSteps(1, flag)` returns 1 where 7 is right. `For i = 100 To 1 Step -x` stops at 80 (64-bit) instead of 97. No error is raised. The same code is right without LLVM, in the exe and in the IDE run. It was found through TBMANLIB 1.0.0.29: its `cToolsStr.InsertSpan` (`Optional HeadFoot As Boolean` after the `ByVal SetpNum As Long` that becomes the step) returns `abcdefg` for `("abcdefg", "-", 3)` in a 64-bit LLVM exe, where `abc-def-g` is right. A procedure that uses the variables more can hide the defect: the same `InsertSpan` is right in a 32-bit LLVM build, while the plain counting loops are wrong in both.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `llvm-for-step-constant.twinproj` (attached as `llvm-for-step-constant.zip`). It needs an LLVM licence (Ultimate). Its module `Startup` is:
   ```
   Private Declare PtrSafe Sub ExitProcess Lib "kernel32" (ByVal uExitCode As Long)

   Private Function CountSteps(ByVal x As Long, ByRef flag As Boolean) As Long
       Dim i As Long
       Dim n As Long
       For i = 1 To 7 Step x
           n = n + 1
           If n > 10 Then Exit For
       Next i
       CountSteps = n
   End Function

   Private Function CountStepsLong(ByVal x As Long, ByRef flag As Long) As Long
       ' the same loop
   End Function

   Public Sub Main()
       Dim flag As Boolean
       Dim flagL As Long
       If App.IsInIDE Then
           Debug.Print "CountSteps(3, flag) = " & CountSteps(3, flag)
           Debug.Print "CountSteps(1, flag) = " & CountSteps(1, flag)
           Debug.Print "CountStepsLong(3, flagL) = " & CountStepsLong(3, flagL)
       Else
           ExitProcess CountSteps(3, flag)
       End If
   End Sub
   ```
2. In Project Settings, turn **Enable LLVM Compilation** on under **Compiler Options (BUILD)** and under **Compiler Options (DEBUG)**. The architecture can be 32-bit or 64-bit.
3. Run the project in the IDE (F5), and build the exe and run it from a command prompt, reading its exit code (`echo %errorlevel%`).
4. The DEBUG CONSOLE shows `CountSteps(3, flag) = 1` and `CountSteps(1, flag) = 1`, and the exe exits with code 1. Turn LLVM off and run again: the lines are `= 3` and `= 7`, and the exe exits with code 3. `CountStepsLong` prints 3 in every build.

**Expected behavior**
`CountSteps(3, flag)` returns 3 (the loop runs with i = 1, 4, 7) and `CountSteps(1, flag)` returns 7, as without LLVM.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
These are right in the same LLVM builds: the second parameter `ByRef ... As Long`, `Byte`, `Single`, `Currency`, `Date`, `Object`, `Double`, `String`, `Variant` or `LongPtr`; `ByVal ... As Boolean` or `As Integer`; the `ByRef Boolean` placed before `x`; no such parameter; a `Do` loop with `i = i + x`; a `For` without `Step`; and a literal `Step`. These are wrong too: `Step x * 1`, `Step y` for a second `ByVal` parameter, a local copied from `x`, the `ByRef` parameter `Optional` or required, and the argument passed or left out. A `Sub` and a class method are wrong in the same way, and so are a `ByVal Single` step and a `Long` step with an `Integer` loop variable. A `ByVal Integer`, `Double` or `Currency` step is right, and so is a `ByRef` Enum, a `ByRef` UDT holding a Boolean, a `ByRef Variant` or a `ByRef` Boolean array in the position of the 16-bit parameter.

The wrong value does not change with the value of `x` or of the `ByRef` argument, with the loop's bounds or direction, with other literals in the procedure, with what the stack held before the call, or with the number of locals or parameters. It changes only with where the caller's argument for the `ByRef` parameter is stored. In every case tried it is that argument's address shifted right by 16 bits; this is an inference, and the generated code was not read:

| argument passed for the `ByRef Boolean` | address | step |
|---|---|---|
| a local of the caller, 64-bit exe | `14F73E` | 20 |
| a module-level variable, 64-bit exe | `14001D38A` | 81921 |
| an array element, 64-bit exe | `4DCD70` | 77 |
| a local of the caller, 32-bit exe | `19F912` | 25 |
| a module-level variable, 32-bit exe | `41CE9E` | 65 |
| an array element, 32-bit exe | `5EA7A0` | 94 |
| a module-level variable, 64-bit IDE run | `18068DCE0` | 98408 |

When the loop's start or end is a parameter as well, that bound is read wrong too. `For i = lo To hi Step x`, called with `(1, 7, 3)`, starts at 20 (64-bit) or 25 (32-bit) and does not run. With `For i = lo To 100000 Step x`, the 64-bit build also uses a step of 0, so the loop does not advance.

A second read of `x` anywhere in a small procedure hides the defect. These are right: `t = x` before or after the loop, `If x <= 0 Then Exit Function` before it, passing `x` to a Sub, and an unused `y = x` beside `Step x`. These are still wrong: `Step (x)`, `Step CLng(x)`, and `y = x` followed by `Step y`. This is likely why `InsertSpan` is right in the 32-bit build. Passing the second parameter `ByVal`, declaring it `ByRef ... As Long`, or placing it before `x` avoids the defect.

A related symptom appears in the 32-bit LLVM exe only. `Function P(ByVal s As String, ByVal x As Long, ByRef flag As Boolean)` with `For i = 1 To 100 Step x` ends the exe with an access violation in `ucrtbase.dll`, in three runs out of three. It does not crash with `ByRef flag As Long`, with `x` before `s`, with no loop, with a loop that does not use `x`, in the 64-bit build (which gives the wrong step) or without LLVM. Its cause was not found.

Severity: high for a program built with LLVM that has such a loop: a wrong result with no error, in either architecture, in the IDE and in the exe.

Not tried: `For Each`, and the generated code. Not understood: a `Double` loop variable with a `Long` step is wrong in the 64-bit build and right in the 32-bit one; a `Single` step is about 0 in the 64-bit build and 0.5000014 in place of 0.5 in the 32-bit one; and the cause of the 32-bit crash.

<!-- Reproducer: bugs/llvm-for-step-constant/ (mode run with arch win64, llvm and exe: the DEBUG CONSOLE of the IDE run with LLVM has `CountSteps(3, flag) = 1` and `CountSteps(1, flag) = 1`, and tbrun --exe --llvm --arch win64 shows the exe exiting 1; expect is tbrun exit 6, those lines, and absent `CountSteps(3, flag) = 3` and `exit 3`); verified on BETA 1005 by `bug_repro.mjs verify`. Controls: `run --exe --arch win64` (no LLVM) prints 3, 7, 3 and the exe exits 3; `run --exe --llvm --arch win32` prints 1, 1, 3 and exits 1; an IDE run with LLVM (the probe without the exe) prints 1, 1, 3 in win64 and in win32. Pages: docs/LLVM/Getting-Started.md, "Language support", and docs/Reference/Core/For-Next.md carry the WARNING labelled BETA 1005; remove both when a fix is released. Found 2026-10-16 through TBMANLIB 1.0.0.29's cToolsStr.InsertSpan in a win64 LLVM exe; the cases in the additional context and the InsertSpan shape were run in the two narrowing sessions of that day (exe builds and, for the address table's last row and the bounds, IDE runs with LLVM) and are not in the reproducer. -->

---

## `QueryInterface` of an object of a twinBASIC class returns E_NOINTERFACE and leaves its out pointer as it was, where COM sets it to NULL

**Describe the bug**
`IUnknown::QueryInterface`, called through slot 0 of the vtable of an object of a class that twinBASIC compiles (a class of the project, a form, a control), asks for an interface the object does not have and returns `E_NOINTERFACE` (`&H80004002`), but leaves the out pointer, `*ppvObject`, as it was. The COM contract is that the method sets `*ppvObject` to NULL when it fails. A variable set to 12345 before the call is still 12345 after it. Observed in the DEBUG CONSOLE, by calling slot 0 through an interface that the project declares, and again with `DispCallFunc` on the object's own pointer.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `queryinterface-leaves-out-pointer.twinproj` (attached as `queryinterface-leaves-out-pointer.zip`). Its module `Startup` asks seven objects for an interface that none of them has, and sets the out variable to 12345 before each call.
2. Press F5. Each object is asked twice: through `IRawUnknown`, an interface of the project that has `IUnknown`'s interface identifier and `Extends Nothing`, so that its first method is slot 0 and `[PreserveSig]` returns the raw HRESULT; and with `DispCallFunc`, calling slot 0 of the pointer that `ObjPtr` gives for the `Object` variable.
3. See the DEBUG CONSOLE. For `Plain`, `Implementer` (a class that implements an interface), `Form1` and `CommandButton` (a control added to the form with `Controls.Add`), both calls return `E_NOINTERFACE` and leave `out=12345`. Here is the line for `Plain`, and the line for the `Collection`, which sets the variable to 0 as COM requires:

```
Plain: missing interface: hr=80004002 out=12345; with DispCallFunc: hr=80004002 out=12345; IUnknown: hr=0 out is a pointer=True; IDispatch: hr=0 out is a pointer=True
Collection: missing interface: hr=80004002 out=0; with DispCallFunc: hr=80004002 out=0; IUnknown: hr=0 out is a pointer=True; IDispatch: hr=0 out is a pointer=True
```

The narrowed reproduction is that project cut down to one object and one call:
```vb
[InterfaceId("00000000-0000-0000-C000-000000000046")]
Private Interface IMin Extends Nothing
    [PreserveSig]
    Function QueryInterface(ByVal priid As LongPtr, ByRef ppvObject As LongPtr) As Long
End Interface

Private Class Plain
    Public Value As Long
End Class

Module Startup

    Private Type Guid128
        Data1 As Long
        Data2 As Integer
        Data3 As Integer
        Data4(0 To 7) As Byte
    End Type

    Public Sub Main()
        Dim u As IMin = New Plain
        Dim iid As Guid128          ' an interface that Plain does not have
        iid.Data1 = &H12345
        Dim p As LongPtr = 12345
        Dim hr As Long = u.QueryInterface(VarPtr(iid), p)
        Debug.Print Hex$(hr), p     ' prints 80004002 and 12345; COM requires 0
    End Sub

End Module
```

**Expected behavior**
`*ppvObject` is 0 after every call that fails, so that every line of the output shows `out=0` in place of `out=12345`, as the line for the `Collection` does. The Windows documentation of `IUnknown::QueryInterface` says that `*ppvObject` is set to NULL when the object does not support the interface. VB6 does it for its own classes: its `Class` instance, `Collection`, `Err` and a `Scripting.Dictionary` all return `E_NOINTERFACE` and set the variable to 0 (the VB6 project is attached as `queryinterface-leaves-out-pointer-vb6.zip`; it calls slot 0 with `DispCallFunc`, as VB6 cannot declare the interface).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Which objects: the pointer is left as it was for an object of a class that twinBASIC compiles: a plain class, a class that implements an interface of the project, a form, the VB package's `CommandButton`, and (in another project, not attached) the `WebView2` control on a form. It is set to 0, correctly, for the objects of the runtime library: `Collection` and `Err` in the attached project, and `App`, `Screen` and a form's `Controls` in the other. A `Scripting.Dictionary` from the Scripting Runtime library sets it to 0 too.

What does not reproduce it: asking for an interface the object has. `IUnknown` and `IDispatch` return `S_OK` and write a new pointer, for every object above (the `IUnknown` and `IDispatch` columns of the output). The result is the same through the project's own interface and through `DispCallFunc`, so it is not a side effect of the declaration, and the same in a 32-bit and a 64-bit run.

Severity: low. The failure is reported, by the HRESULT, so a caller that tests it is not affected. A caller that tests the pointer instead, as a C or C++ client may, sees the value it passed in. When the variable is reused after an earlier successful call, that value is a pointer the caller has released.

<!-- Reproducer: bugs/queryinterface-leaves-out-pointer/ (mode run: expect lists the four lines of classes that twinBASIC compiles with out=12345 and the three runtime lines with out=0); verified on BETA 1005 by `bug_repro.mjs verify`, and run with --arch win64 too (the IDE's own run; not as a built exe, where Debug.Print writes nothing). VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6`. The narrowed module above was run on its own in a scratch project (output `80004002       12345`); the interface needs only the interface identifier of IUnknown, Extends Nothing and a [PreserveSig] first method (no [OleAutomation(False)], no AddRef or Release). Pages: docs/Reference/Contributed/OLEGuids/IUnknownUnrestricted.md carries a NOTE for it after its QueryInterface section (its check_run sample uses a Collection, which sets the variable to 0, so it does not show the defect), and docs/Reference/COM-Interfaces/IUnknown.md carries one after the return value of its QueryInterface section; both NOTEs go when a fixed build is released. Found 2026-10-13 documenting the OLEGuids package. -->

---

## A `For Each` that cannot get an enumerator never ends under `On Error Resume Next`

**Describe the bug**
A `For Each` whose *group* gives no enumerator --- `Nothing`, an object of a class with no `[Enumerator]` member, or an object whose `[Enumerator]` member returns `Nothing` or raises an error --- never ends when it runs under `On Error Resume Next`, or under an error handler that ends with `Resume Next`. The error in the `For Each` line resumes into the loop body; then `Next` raises error 91, *Object variable or With block variable not set*, and resumes into the body again, without end. The expression after `In` is evaluated once only. Nothing is reported, and the program stops responding.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `for-each-resume-next-loops.twinproj` (attached as `for-each-resume-next-loops.zip`). Its module `Startup` runs five loops under `On Error Resume Next` and four under a handler that ends with `Resume Next`. Each counts how often the expression after `In` is evaluated (`header=`) and how often the body runs, and leaves the loop after six passes so that the program ends.
2. Press F5.
3. See the DEBUG CONSOLE. The control, a `Collection` of one item, runs once. Every other loop is evaluated once and runs its body until the guard ends it, with error 91 at each pass:

```
Collection (control): header=1 body=1 errors: 0 | after Next: 0
Nothing: header=1 body=6 errors: 91 91 91 91 91 91 | after Next: 0
Class with no enumerator: header=1 body=6 errors: 91 91 91 91 91 91 | after Next: 0
Enumerator returns Nothing: header=1 body=6 errors: 91 91 91 91 91 91 | after Next: 0
Enumerator raises error 5: header=1 body=6 errors: 91 91 91 91 91 91 | after Next: 0
Nothing, handler with Resume Next: header=1 body=4 passes: error -2147467259 error 91 body error 91 body error 91 body error 91 body error 91
```

The narrowed reproduction:
```vb
Module Startup
    Public Sub Main()
        Dim o As Object, v As Variant, n As Long
        On Error Resume Next
        For Each v In o          ' o is Nothing: an error, resumed
            n = n + 1
            If n = 1000 Then Exit For   ' without this line the loop never ends
        Next
        Debug.Print n            ' prints 1000; VB6 prints 1
    End Sub
End Module
```

**Expected behavior**
The loop ends. VB6 runs the body once, then raises error 92, *For loop not initialized*, at `Next`, and `Resume Next` continues after the loop. Every loop of the attached VB6 project (`for-each-resume-next-loops-vb6.zip`, the same cases, with classes whose `NewEnum` has the procedure identifier -4) prints `body=1`, then error 92:

```
Nothing: header=1 body=1 errors: 424 | after Next: 92
Class with no enumerator: header=1 body=1 errors: 438 | after Next: 92
Enumerator returns Nothing: header=1 body=1 errors: 451 | after Next: 92
Enumerator raises error 5: header=1 body=1 errors: 5 | after Next: 92
```

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The same in a 32-bit and a 64-bit run. A package can meet it without the program's knowledge: the contributed package ArrayListLib returns `Nothing` from its enumerator for a list with no items, and its `ToString` method goes through a list with `For Each` under `On Error Resume Next`, so `ToString` of an empty list never returns.

The first error also differs from VB6's, which the handler cases show (VB6 in parentheses): `Nothing` raises -2147467259, `E_FAIL` (VB6 424, *Object required*); an enumerator that returns `Nothing` raises -2147467259 (VB6 451, *Property let procedure not defined and property get procedure did not return an object*); an error 5 raised in the enumerator arrives as -2147352567, *Exception occurred* (VB6 5); a class with no enumerator raises 438 in both.

Severity: high. The program stops responding with no error, in code written to go on after an error, and a program that loops over what a package returns cannot see it coming.

<!-- Reproducer: bugs/for-each-resume-next-loops/ (mode run: expect lists the control, the four Resume Next loops with body=6 and the first handler line); verified on BETA 1005 by `bug_repro.mjs verify`, and run with --arch win64 too. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6`. The narrowed module above was run on its own in a scratch project with tbrun (output 1000). Pages: docs/Reference/Core/For-Each-Next.md carries a WARNING after the paragraph on [Enumerator]; it goes when a fixed build is released, and with it the two mentions of "a twinBASIC defect" in docs/Reference/Contributed/ArrayListLib/index.md (Known problems: For Each over a list with no items, ToString). Found 2026-10-13 documenting the ArrayListLib package. -->

---

## An assignment through a default member with an argument, written on a public field of an object, is refused with TB5090

**Describe the bug**
`obj.Field(key) = value`, where `Field` is a public field of a class and holds an object whose class has a default member that takes an argument, is refused with TB5090, *named argument already provided for ''*. The default member is a `[DefaultMember]` `Property Get` and `Property Let` pair of a class of the project, or the `Item` property of a `Scripting.Dictionary`. The message names nothing, and the line is a plain assignment. The same assignment compiles through a local variable, a module variable (qualified or not), a property that returns the object, an `Object` variable, and `Me.Field(key)` or `Field(key)` inside the class that holds the field. The read `obj.Field(key)` compiles, and so does the assignment with the default member written out, `obj.Field.Item(key) = value`. So the compiler refuses the one place where the object is reached through a field of an instance.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `field-default-member-named-argument.twinproj` (attached as `field-default-member-named-argument.zip`). Its one source file, `Startup.twin`, has a class `Bag` with a default `Item(Key)`, a class `Holder` with public fields, and `Main` with the assignments; the lines that are refused carry the comment `REFUSED`.
2. Let the IDE compile it (it does so on opening).
3. See five errors, one at each line marked `REFUSED`, and no other: `TB5090 named argument already provided for ''`.

The narrowed reproduction:
```vb
Class Bag
    Private mValue As Long

    [DefaultMember]
    Property Get Item(ByVal Key As String) As Long
        Item = mValue
    End Property

    [DefaultMember]
    Property Let Item(ByVal Key As String, ByVal Value As Long)
        mValue = Value
    End Property
End Class

Class Holder
    Public Field As New Bag
End Class

Module Startup
    Public Sub Main()
        Dim h As New Holder
        h.Field("a") = 1            ' TB5090
        h.Field.Item("a") = 1       ' compiles
    End Sub
End Module
```

What the refusal depends on, each tried in a project of its own or as a line in one project:
- the type of the field: `As New Bag`, `As Bag`, `As Object`, `As New Scripting.Dictionary` and `As New Collection` are all refused (a `Collection` has no way to assign an item, so it is no use as a comparison); it is the field, not its type;
- how the object holding the field is reached: a variable `As Holder`, `As New Holder`, a parameter, a `With` block and the left-hand side of a compound statement (`h.Field("a") = h.Field("a") + 1`) are refused; `Me.Field(...)` and a bare `Field(...)` inside the class, and a variable `As Object` or `As Variant` that holds the `Holder`, compile;
- a `Property Get Prop() As Bag` in the place of the field: `h.Prop("a") = 1` compiles; a field of a user-defined type that holds a `Bag` (`u.UdtBag("a") = 1`) compiles; a module's public variable, written `Startup.PubBag("a") = 1`, compiles;
- `Set h.ObjField("a") = x`, with a default `Property Set Item(Key)`, is refused too, with another message: TB5001, *Argument for '': cannot coerce type 'String' to '_ObjBag'* (the key is taken for the object the default member returns).

**Expected behavior**
The assignment compiles and calls the default member's `Property Let` (or `Property Set`), as it does through a property that returns the same object. VB6 does not compile it either: its build stops with the compile error *Wrong number of arguments or invalid property assignment* on each of the five refused lines, and on `Me.Field("a") = 1` inside the class, which twinBASIC compiles. VB6 does compile the property, the local variable, the read, and the late-bound object (the attached VB6 project, `field-default-member-named-argument-vb6.zip`, builds those and lists the refused lines as comments). So the request is for twinBASIC to be consistent with itself, and, if the refusal stays, a message that says why: the one it gives names an argument that does not exist.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The same in a 32-bit and a 64-bit compile. Met in the contributed package TBMANLIB, whose `cHttpClient` has a public `RequestHeaders` field that holds a dictionary: `Http.RequestHeaders("X-Key") = "1"` is refused and `Http.RequestHeaders.Item("X-Key") = "1"` is accepted.

Severity: low. The line is refused at compile time and the default member written out is a workaround.

<!-- Reproducer: bugs/field-default-member-named-argument/ (mode compile: expect is TB5090; the project has the Scripting Runtime referenced for the Dictionary case); verified on BETA 1005 by `bug_repro.mjs verify`, and compiled with --arch win64 too. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6`; VB6 refuses the same lines, so that side lists them as comments and builds the rest. Pages: docs/Reference/Contributed/TBMANLIB/cHttpClient.md carries a NOTE (after its table of error codes) that names the TB5090 refusal and the `.Item` workaround; update it when a fixed build is released (if the fix accepts the assignment, the NOTE goes). Found 2026-10-13 documenting the TBMANLIB package. -->

---

## Empty parentheses after a function result or a variable are accepted on a typed value and fail at run time on a Variant

**Describe the bug**
A pair of empty parentheses written after a function's result or a variable, as in `Num = Asc(c)()` or `G = Chr(Num)()`, compiles. What it does when it runs depends on the type of the value in front of it. When the type is not `Variant` (`Long`, `Double`, `String`), the parentheses are ignored and the value is used: `Asc("abc")()` is 97. When it is a `Variant` (the result of `Chr`, `Mid`, `Left`, `Int`, `Sgn`, `Abs` and `InStr`, of a `Function ... As Variant` of the project, or a `Variant` variable), the line raises error -2147467259, *Unspecified error*. When it is an object, the default member is called with no arguments and raises error -2147352561, *Parameter not optional* if it needs one. The compiler gives no diagnostic for any of these.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `empty-parentheses-after-value.twinproj` (attached as `empty-parentheses-after-value.zip`). Its module `Startup` runs nine such assignments under `On Error Resume Next` and prints each result and error number.
2. Press F5.
3. See the DEBUG CONSOLE: the six lines with a value that is not a `Variant` give their value and error 0; the three with a `Variant` give an empty result and error -2147467259:

```
Asc(s)() [Long]: result=[97] error 0
Len(s)() [Long]: result=[3] error 0
Twice(3)() [Long]: result=[6] error 0
n() [Long variable]: result=[5] error 0
s() [String variable]: result=[abc] error 0
Chr$(65)() [String]: result=[A] error 0
Chr(65)() [Variant]: result=[] error -2147467259
VarLong()() [Variant]: result=[] error -2147467259
v() [Variant variable]: result=[] error -2147467259
```

What the compiler does refuse: arguments in the second pair (`Len(s)(1)` and `Twice(3)(1)`, TB5030, *Unexpected call arguments*), `(Asc(s))()` (TB5001, *expected a delegate*), and `Coll()()` for a function that returns a `Collection` (TB5092, *Missing argument 'Index'*).

**Expected behavior**
A diagnostic for the value that is not a `Variant`, as VB6 gives: its build stops with *Type mismatch* on `Asc(s)()`, `Twice(3)()` and `Chr$(65)()`, *Syntax error* on `Len(s)()`, and *Expected array* on `n()` and `s()`. For a `Variant`, VB6 compiles the line and raises error 9, *Subscript out of range*, when it runs (the parentheses are read as an index of an array with no subscripts); twinBASIC raises -2147467259 (the attached VB6 project, `empty-parentheses-after-value-vb6.zip`, builds the three `Variant` lines, and lists the refused ones with VB6's messages as comments).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The same in a 32-bit and a 64-bit run. Met in the contributed package TBMANLIB, whose module `ToolsCN` has `Num = Asc(Mid(CnChar, i, 1))()` and `G = Chr(Num)()` in `GetPinYin`: the first line runs and returns the character code, the second raises the error, for every ASCII character.

Severity: low. Code that VB6 refuses is accepted and, for the types that are not `Variant`, works; for a `Variant` it raises an error that does not say what is wrong.

<!-- Reproducer: bugs/empty-parentheses-after-value/ (mode run: expect lists the nine lines); verified on BETA 1005 by `bug_repro.mjs verify`, and run with --arch win64 too. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6`; VB6 refuses the six typed lines at compile time, so that side builds only the three Variant lines (error 9) and lists the others as comments with VB6's messages (each checked in a build of its own). Pages: docs/Reference/Contributed/TBMANLIB/ToolsCN.md's NOTE on GetPinYin names `G = Chr(Num)()` as the line that raises and says the parentheses after `Asc` have no effect, and docs/Reference/Contributed/TBMANLIB/index.md (Known problems) says GetPinYin fails for a text with an English letter, a digit or a space (both corrected 2026-10-13 and checked with check_run: "a" raises -2147467259, ChrW(233) returns "" with no error, ChrW(&H4E2D) raises on a Western code page, `Asc("a")()` is 97). When a fixed build is released, both statements change: if twinBASIC then refuses `()` after a value as VB6 does, TBMANLIB's ToolsCN no longer compiles, and the TBMANLIB section says so. Found 2026-10-13 documenting the TBMANLIB package. -->

---

## `[RunBeforeStartupObject]` on a generic procedure fails the build with a message that names neither the procedure nor the reason

**Describe the bug**
Follow-up to #2517, which is fixed in BETA 1009 for the crash: building a project that has `[RunBeforeStartupObject]` on a generic procedure no longer crashes the compiler. This is what is left: the build fails with the single line *Build FAILED due to invalid RunBeforeStartupObject procedure*, which names neither the procedure nor the reason, that it is generic, and the IDE's compile still reports nothing about it. So the line is found only by building, and then by searching the project for the attribute. Observed in the DEBUG CONSOLE of a build.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `runbeforestartupobject-generic-message.twinproj` (attached as `runbeforestartupobject-generic-message.zip`). Its one source file:
   ```
   Module Startup

       Public Sub Main()
       End Sub

       [RunBeforeStartupObject]
       Public Sub Pre(Of T)()
       End Sub

   End Module
   ```
2. Let the IDE compile it: no diagnostic.
3. Build it. The DEBUG CONSOLE shows only:
   ```
   [BUILD] Starting...
   Build FAILED due to invalid RunBeforeStartupObject procedure
   [BUILD] failed
   ```

The same with a generic `Public Function Pre(Of T)() As Boolean`, and in a 64-bit build. With another `[RunBeforeStartupObject]` procedure after the generic one, the build succeeds and the generic one is ignored without a word (the next entry, on more than one such procedure).

No `[TestCase]` reaches a build, so the regression check is a set of one-module projects, each built, with the assertion it makes; it covers #2517 as well. Each module also has an empty `Public Sub Main()`, and the project's startup object is `Sub Main`.

| the module's procedure | assertion | BETA 1010 |
|---|---|---|
| `[RunBeforeStartupObject] Public Sub Pre(Of T)()` | the build ends without the compiler crashing or restarting (#2517) | passes |
| `[RunBeforeStartupObject] Public Sub Pre(Of T)()` | the build, or the compile, reports a diagnostic that names `Pre` and says the attribute is not allowed on a generic procedure | fails |
| `[RunBeforeStartupObject] Public Function Pre(Of T)() As Boolean` | as the two rows above | passes, fails |
| `[RunBeforeStartupObject] Public Function Pre() As Boolean`, which writes a line and returns `False`, while `Main` writes another | the build succeeds, and the exe writes Pre's line, then Main's | passes |
| `Public Sub Pre(Of T)()`, without the attribute | the build succeeds | passes |

**Expected behavior**
A diagnostic that names the procedure (`Startup.Pre`) and says that the attribute is not allowed on a generic procedure. #2517 asked for "a diagnostic that the attribute is not allowed on a generic procedure", or a built exe in which `Pre` runs; BETA 1010 gives a diagnostic, but one that says only that some `RunBeforeStartupObject` procedure is invalid. The compile is the better place for it, with the line, as TB5114 is reported for a second `[RunAfterBuild]`, so that it shows before the first build; a build message that names the procedure and the reason would also do. The attribute does not exist in VB6.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Follow-up to #2517, "`[RunBeforeStartupObject]` on a generic procedure crashes the build", closed as fixed in BETA 1009.

Severity: low. The build stops, so nothing goes wrong unnoticed, but in a project of many modules the procedure has to be found by hand.

<!-- Reproducer: bugs/runbeforestartupobject-generic-message/ (mode run: tbrun builds it, the build fails with exit 2, and expect.message is the build line anchored at both ends, so a message that names the procedure or the reason no longer matches, and a compile-time diagnostic changes the exit code); verified on BETA 1010 by `bug_repro.mjs verify`. The generic Function, the 64-bit build, and the non-generic and attribute-less controls were built with tbbuild --build on BETA 1010 (scratch projects, not kept). Page: docs/Reference/Attributes.md, RunBeforeStartupObject, the `> [!NOTE] BETA 1010` quoting the message; when a fixed build is released, the NOTE goes and the paragraph states the diagnostic the build then gives. -->

---

## Of several `[RunBeforeStartupObject]` procedures only the last one runs, and one with parameters runs with arbitrary values for them

**Describe the bug**
The compiler accepts `[RunBeforeStartupObject]` on more than one procedure, with no diagnostic, and the built program runs only the last of them in the source; the others never run. A second `[RunAfterBuild]`, by contrast, is refused with TB5114, *encountered too many [RunAfterBuild] attributes. Only allowed one per-project.* The compiler also accepts the attribute on a procedure with parameters, and the program calls it with whatever values happen to be there: a `ByVal N As Long` was 1976434377 in a 32-bit build and 4481000 in a 64-bit one, and an `Optional ByVal Count As Long = 3` is not given its default either. Observed in built exes, 32-bit and 64-bit.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `runbeforestartupobject-unchecked.twinproj` (attached as `runbeforestartupobject-unchecked.zip`). Its one source file:
   ```
   Module Startup

       Private Sub Out(ByVal Text As String)
           Dim file As String = Environ$("TBRUN_OUT")
           If Len(file) = 0 Then file = App.Path & "\out.txt"
           Dim f As Integer = FreeFile
           Open file For Append As #f
           Print #f, Text
           Close #f
       End Sub

       [RunBeforeStartupObject]
       Public Function First() As Boolean
           Out "First ran"
       End Function

       [RunBeforeStartupObject]
       Public Function Second(Optional ByVal Count As Long = 3) As Boolean
           Out "Second ran, Count = " & Count
       End Function

       [RunBeforeStartupObject]
       Public Function Third(ByVal N As Long) As Boolean
           Out "Third ran, N = " & N
       End Function

       Public Sub Main()
           Out "Main ran"
       End Sub

       ' For tbrun, which also runs the project in the IDE after the build.
       [RunAfterBuild]
       Private Sub Built()
           Debug.Cls
           Debug.Print "built"
       End Sub

   End Module
   ```
2. Build it: no diagnostic. Run the exe and read `out.txt` beside it:
   ```
   Third ran, N = 1976434377
   Main ran
   ```
   `First` and `Second` never run, and `N` is not a value anything passed (it differs between builds).
3. Remove the attribute from `First` and `Third`, build and run again: `Second ran, Count = 1976434377`, not 3.

What it depends on, each built and run as an exe:
- the order in the source decides which one runs: the last;
- a generic procedure (#2517) before another `[RunBeforeStartupObject]` procedure is ignored and the build succeeds; after it, the build fails (the entry above);
- two such procedures in different modules also build with no diagnostic.

No `[TestCase]` reaches the startup of an exe, so the regression check is a set of one-module projects, each built and run as an exe whose procedures write a line each, as above:

| the module's `[RunBeforeStartupObject]` procedures, besides `Main` | assertion | BETA 1010 |
|---|---|---|
| `Function First() As Boolean`, returning `False` | the exe writes First's line, then Main's | passes |
| `First` and `Second()`, both without parameters | a diagnostic for the second one, as TB5114 is for `[RunAfterBuild]`; or both run, in order, before Main | fails: only Second runs |
| `Function Third(ByVal N As Long) As Boolean` | a diagnostic: the program has no argument to pass | fails: runs with an arbitrary N |
| `Function Second(Optional ByVal Count As Long = 3) As Boolean` | it runs with Count = 3, or a diagnostic | fails: runs with an arbitrary Count |

**Expected behavior**
A compile error for a second `[RunBeforeStartupObject]` procedure, as for a second `[RunAfterBuild]`, unless several are meant to run, in which case each runs, in order. A compile error for a procedure with a parameter that has no default, since the program has nothing to pass to it; a procedure whose parameters are all `Optional` is called with their defaults, or refused too. The documentation describes the attribute on one procedure, with no parameters. The attribute does not exist in VB6.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Found while checking the fix of #2517 ("`[RunBeforeStartupObject]` on a generic procedure crashes the build"), whose build-time check catches a generic procedure only when it is the last one.

Severity: medium. Nothing reports either case: a startup procedure that never runs, or one that runs on values nobody passed, goes unnoticed until its effects are missed.

<!-- Reproducer: bugs/runbeforestartupobject-unchecked/ (mode run with "exe": expect lists Third's line and Main's, and absent First's and Second's and an N of 0); verified on BETA 1010 by `bug_repro.mjs verify`, and run with --arch win64 too. The Optional case, the generic-before-plain order and the two-module case were scratch projects on BETA 1010 (tbrun --exe, tbbuild --build), not kept; which of the two procedures in different modules runs was not checked. scripts/lib/attribute-sweep.mjs says the compiler allows RunBeforeStartupObject once per project, "TB5114 on a second": that is true of RunAfterBuild only, though the sweep is right to hold one per batch. Page: docs/Reference/Attributes.md, RunBeforeStartupObject, the `> [!WARNING] BETA 1010`; when a fixed build is released, the WARNING goes and the paragraph states what the compiler then does with a second procedure and with parameters. -->

---

## An index out of range on a fixed-size array member of a UDT raises -2147467259, *Unspecified error*, where VB6 raises error 9

**Describe the bug**
An index outside the bounds of a fixed-size array that is a member of a user-defined type, as in `u.A(4) = 1` where the type declares `A(1 To 3) As Long`, raises error -2147467259 (`&H80004005`), *Unspecified error*, where VB6 raises error 9, *Subscript out of range*. A handler that tests for 9 does not recognise it. Observed in a run in the IDE, in built exes (32-bit and 64-bit) and in the compiler's test mode.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `udt-array-member-subscript-error.twinproj` (attached as `udt-array-member-subscript-error.zip`).
2. Run its test cases, the module below. On BETA 1010 the four controls pass (an array that is not in a UDT, local or at module level; an index in range; a dynamic array member of a UDT, which raises 9) and the seven cases on a fixed-size array member fail with `Actual: -2147467259`: a write above the upper bound, below the lower bound, a read, a two-dimensional member, a module-level UDT and an element of an array of UDTs; `Err.Description` is *Unspecified error*.

The module is meant to be adapted as a regression test. Each case asserts VB6's result, which the attached VB6 project (`udt-array-member-subscript-error-vb6.zip`) prints: 9, *Subscript out of range*, in every case.
```vb
' Regression tests: an index out of range on an array that is a member of a
' user-defined type raises error 9, "Subscript out of range", as it does on an
' array that is not in a UDT. Expected numbers are VB6's (the VB6 project beside
' this one prints them). tbrun --tests runs each case and prints PASS or FAIL.
[TestFixture]
Module RegressionTests

    Private Type Holder
        X As Long
        A(1 To 3) As Long
        M(1 To 2, 1 To 2) As Long
        D() As Long
    End Type

    Private ModuleLevel As Holder
    Private ModuleArray(1 To 3) As Long

    ' Controls: an array that is not in a UDT, and an index in range.
    [TestCase]
    Public Sub PlainArray_WriteAboveRange_Raises9()
        Dim a(1 To 3) As Long
        On Error Resume Next
        a(4) = 1
        Assert.Strict.AreEqual 9&, Err.Number
    End Sub

    [TestCase]
    Public Sub ModuleLevelArray_WriteAboveRange_Raises9()
        On Error Resume Next
        ModuleArray(4) = 1
        Assert.Strict.AreEqual 9&, Err.Number
    End Sub

    [TestCase]
    Public Sub UdtMember_WriteInRange_Stores()
        Dim u As Holder
        u.A(3) = 7
        Assert.Strict.AreEqual 7&, u.A(3)
    End Sub

    ' An index out of range on a member of a UDT.
    [TestCase]
    Public Sub UdtMember_WriteAboveRange_Raises9()
        Dim u As Holder
        On Error Resume Next
        u.A(4) = 1
        Assert.Strict.AreEqual 9&, Err.Number
    End Sub

    [TestCase]
    Public Sub UdtMember_WriteBelowRange_Raises9()
        Dim u As Holder
        On Error Resume Next
        u.A(0) = 1
        Assert.Strict.AreEqual 9&, Err.Number
    End Sub

    [TestCase]
    Public Sub UdtMember_ReadAboveRange_Raises9()
        Dim u As Holder
        Dim r As Long
        On Error Resume Next
        r = u.A(4)
        Assert.Strict.AreEqual 9&, Err.Number
    End Sub

    [TestCase]
    Public Sub UdtMember_TwoDimensions_Raises9()
        Dim u As Holder
        On Error Resume Next
        u.M(1, 3) = 1
        Assert.Strict.AreEqual 9&, Err.Number
    End Sub

    [TestCase]
    Public Sub UdtDynamicMember_WriteAboveRange_Raises9()
        Dim u As Holder
        ReDim u.D(1 To 3)
        On Error Resume Next
        u.D(4) = 1
        Assert.Strict.AreEqual 9&, Err.Number
    End Sub

    [TestCase]
    Public Sub ModuleLevelUdtMember_WriteAboveRange_Raises9()
        On Error Resume Next
        ModuleLevel.A(4) = 1
        Assert.Strict.AreEqual 9&, Err.Number
    End Sub

    [TestCase]
    Public Sub UdtArrayElementMember_WriteAboveRange_Raises9()
        Dim us(1 To 2) As Holder
        On Error Resume Next
        us(1).A(4) = 1
        Assert.Strict.AreEqual 9&, Err.Number
    End Sub

    [TestCase]
    Public Sub UdtMember_ErrorDescription()
        Dim u As Holder
        On Error Resume Next
        u.A(4) = 1
        Assert.Strict.AreEqual "Subscript out of range", Err.Description
    End Sub

End Module
```

**Expected behavior**
Error 9, *Subscript out of range*, as VB6 raises in every case above, and as twinBASIC raises for a fixed-size array that is not in a UDT and for a dynamic array member of a UDT.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The same on BETA 1007. Found while checking the fix of #2521 ("An assignment to an element of a public array field of a class crashes the compiler"), whose report said that an assignment to an element of an array member of a UDT, `u.A(1) = 5`, compiles; it does, and an index in range works.

Severity: low to moderate. An error is raised wherever VB6 raises one, so no failure goes unreported, but a handler that tests for 9 does not recognise it, and *Unspecified error* does not say what is wrong.

<!-- Reproducer: bugs/udt-array-member-subscript-error/ (mode test: `tbrun --tests`; expect lists the four PASS and seven FAIL lines, each FAIL with the number or text BETA 1010 gives); verified on BETA 1010 by `bug_repro.mjs verify`. The same numbers in an IDE run and in exes (tbrun --exe, win32 and win64) and in an IDE run on BETA 1007, from a scratch probe not kept. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints 9 for all nine. No page states the error number: docs/Reference/Core/Type.md describes fixed-size arrays in a UDT without it. -->

---

## `CreateObject` and `GetObject` raise a COM error code where VB6 raises error 429, *ActiveX component can't create object*

**Describe the bug**
When `CreateObject` or `GetObject` cannot create or find the object, twinBASIC raises the COM error code, where VB6 raises error 429, *ActiveX component can't create object*, so a handler written for VB6 or VBA does not recognise the error:

| call | VB6 | twinBASIC |
|---|---|---|
| `CreateObject("No.Such.Class")` | 429 | -2147221020 (`&H800401E4`), *Invalid syntax* |
| `CreateObject("Scripting.NoSuchClass")` | 429 | -2147221020, *Invalid syntax* |
| `GetObject(, "No.Such.Class")` | 429 | -2147221005 (`&H800401F3`), *Invalid class string* |
| `GetObject(, "Scripting.Dictionary")`, with no instance running | 429 | -2147221021 (`&H800401E3`), *Operation unavailable* |

In a 64-bit program, `CreateObject("MSScriptControl.ScriptControl")`, a class registered for 32-bit programs only, raises -2147221164 (`&H80040154`), *Class not registered*. Observed in built exes, 32-bit and 64-bit, and in the compiler's test mode.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `createobject-error-not-429.twinproj` (attached as `createobject-error-not-429.zip`).
2. Run its test cases, the module below. On BETA 1010 the control, `CreateObject("Scripting.Dictionary")`, passes, and the five cases that expect 429 or its description fail with the numbers in the table and *Invalid syntax*.

The module is meant to be adapted as a regression test. Each case asserts VB6's result, which the attached VB6 project (`createobject-error-not-429-vb6.zip`) prints.
```vb
' Regression tests: CreateObject and GetObject raise error 429, "ActiveX component
' can't create object", when they cannot create or find the object, as VB6 does
' (the VB6 project beside this one prints VB6's numbers). tbrun --tests runs each
' case and prints PASS or FAIL.
[TestFixture]
Module RegressionTests

    Private Function CreateError(ByVal ProgId As String) As Long
        On Error Resume Next
        Dim o As Object = CreateObject(ProgId)
        Return Err.Number
    End Function

    Private Function GetObjectError(ByVal ProgId As String) As Long
        On Error Resume Next
        Dim o As Object = GetObject(, ProgId)
        Return Err.Number
    End Function

    ' Control: a registered class is created.
    [TestCase]
    Public Sub CreateObject_RegisteredClass_Succeeds()
        Assert.Strict.AreEqual 0&, CreateError("Scripting.Dictionary")
    End Sub

    [TestCase]
    Public Sub CreateObject_UnknownProgId_Raises429()
        Assert.Strict.AreEqual 429&, CreateError("No.Such.Class")
    End Sub

    [TestCase]
    Public Sub CreateObject_UnknownClassOfKnownLibrary_Raises429()
        Assert.Strict.AreEqual 429&, CreateError("Scripting.NoSuchClass")
    End Sub

    [TestCase]
    Public Sub CreateObject_UnknownProgId_Description()
        On Error Resume Next
        Dim o As Object = CreateObject("No.Such.Class")
        Assert.Strict.AreEqual "ActiveX component can't create object", Err.Description
    End Sub

    [TestCase]
    Public Sub GetObject_UnknownProgId_Raises429()
        Assert.Strict.AreEqual 429&, GetObjectError("No.Such.Class")
    End Sub

    [TestCase]
    Public Sub GetObject_ClassWithNoRunningObject_Raises429()
        Assert.Strict.AreEqual 429&, GetObjectError("Scripting.Dictionary")
    End Sub

End Module
```

**Expected behavior**
Error 429, *ActiveX component can't create object*, as VB6 raises for each call in the table.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Found while checking the fix of #2523 ("A project that references the Microsoft Script Control crashes the compiler when it is built for 64-bit programs"): the project now builds for 64-bit programs, and creating the control in one raises *Class not registered* rather than 429. #2490 and its follow-ups cover the numbers raised by a late-bound call that fails; this is the creation of the object.

Severity: low to moderate. An error is raised wherever VB6 raises one, but a handler that tests for 429, the usual test for a component that is not installed, does not recognise it.

<!-- Reproducer: bugs/createobject-error-not-429/ (mode test: `tbrun --tests`; expect lists the one PASS and five FAIL lines, each FAIL with the number or text BETA 1010 gives); verified on BETA 1010 by `bug_repro.mjs verify`. The same numbers in exes (tbrun --exe, win32 and win64), and the Script Control line from a 64-bit exe, from scratch probes not kept. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints 0 for the Dictionary and 429 for the other four. No page states the error number: docs/Reference/Default/VBA/Interaction/CreateObject.md and GetObject.md do not name one. -->

---

## Delete on the project's row deletes every file, and the next save writes an empty project

**Describe the bug**
In Project Explorer, the Delete key on the project's own row, the top row of the tree, shows the question shown for a single file, naming the project's path. Delete there removes every file and folder of the project from the tree. The only message is an *IDE internal error* line in the Debug Console. The next Ctrl+S prints the green `[DONE]` line and writes a project file that holds no file over the project. It was observed in an IDE started with an `APPDATA` of its own, reading the tree, the Debug Console and the saved project file.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a saved project; here ProjectsProbe, with five files under `Sources`, a resource and a file under `Miscellaneous`.
2. In Project Explorer, click the project's row, `ProjectsProbe`, and press Delete. The box reads *Are you sure you want to delete '/ProjectsProbe'? You will not be able to undo this operation.*, with Delete and Cancel.
3. Choose Delete. The tree is empty. The Debug Console prints `IDE internal error: Uncaught TypeError: Cannot read properties of undefined (reading 'parentNode')`.
4. Press Ctrl+S. The console prints `[PROJECT] twinBASIC project saving to disk [DONE]`. The project file, 6.7 KB before, is now 40 bytes and holds no file.

**Expected behavior**
The project's row refused, as the special folders are: Delete on `Sources` shows the same box, and its Delete deletes nothing. At the least, a question that says the whole project is about to be emptied.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The box for the project's row is the one shown for a file, so nothing tells the reader that every file goes. Closing the project with Discard Changes before a save brings it back. Seen in three trial sessions, the third from a newly started IDE, and in the reproducer.

Severity: high. The whole project is lost at the next save, after a confirmation that reads like a file's, and nothing warns before the save writes it.

<!-- Reproducer: bugs/delete-project-row/ (mode lane: asserted by `ide-test.bat --only projects-loss` (test/ide/projects-loss.test.mjs), the test "Delete on the project's row, after a box that reads like a file's, empties the tree, and Ctrl+S writes a project holding no file", which passes on BETA 1010; the control "control: Delete on Sources shows the box, and Delete deletes nothing" passes too). No project and no zip. docs/IDE/Projects/Files-and-Folders.md, under Delete (its second WARNING), carries a WARNING for it; when a fixed build is released, that WARNING goes. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D17). -->

---

## Dragging a folder onto a row inside it nests it without end, and the next save writes a project the IDE cannot open

**Describe the bug**
In Project Explorer, a folder dragged onto one of its own files, or onto one of its own subfolders, is accepted with no message. The tree then holds the folder inside itself, more than fifty levels deep. The next Ctrl+S prints the green `[DONE]` line, then an *IDE internal error* (a stack overflow), and writes a project file many times the size of the old one. The IDE cannot open that file: it stays at *Please wait... 25.0%* with an empty Project Explorer. It was observed in an IDE started with an `APPDATA` of its own, reading the tree, the Debug Console and the saved project file, and opening the saved file in a second IDE.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a saved project with a folder `Sources/Helpers` that holds `Thing.twin` and `Util.twin`.
2. Expand `Sources/Helpers`, and drag the folder `Helpers` onto `Helpers/Thing.twin`. Nothing is said.
3. Expand `Helpers`: it holds `Helpers`, which holds `Helpers`, and so on, more than fifty levels.
4. Press Ctrl+S. The console prints `[PROJECT] twinBASIC project saving to disk [DONE]`, then `IDE internal error: Uncaught RangeError: Maximum call stack size exceeded`. The project file grows from 6.7 KB to about 150 KB.
5. Open the saved file in the IDE. 45 seconds later the IDE still shows *Please wait... 25.0%*, and Project Explorer is empty.

**Expected behavior**
The drop refused, as a file manager refuses to move a folder into itself.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Dragging a file onto a folder moves it, as it should. The saved file is a readable project file (a reader of the format outside the IDE opens it without an error) that holds the nested folders, so it is the IDE's loading of it that stops. Closing the project with Discard Changes before a save brings it back. Seen in three trial sessions, the third from a newly started IDE, and in the reproducer.

Severity: high. The project file is replaced by one the IDE cannot open, after a drag that is easy to make by mistake and shows nothing wrong until the save.

<!-- Reproducer: bugs/drag-folder-into-itself/ (mode lane: asserted by `ide-test.bat --only projects-loss` (test/ide/projects-loss.test.mjs), the test "dragging a folder onto a file inside it nests it without end, with no message, and Ctrl+S writes a project file the IDE cannot open", which passes on BETA 1010; it opens the saved file in a new IDE with a 45-second limit, and ends that IDE by its pid; the control "control: dragging a file onto a folder moves it there" passes too). The trial's note that impexp called the saved file damaged did not recur: impexp's readProject reads it. No project and no zip. docs/IDE/Projects/Files-and-Folders.md, under Move a file or folder by dragging, carries a WARNING for it; when a fixed build is released, that WARNING goes. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D19). -->

---

## Cut, then Paste onto Resources or Packages, deletes the file and creates it nowhere

**Describe the bug**
A file cut in Project Explorer and pasted onto the `Resources` folder itself, or onto `Packages`, is refused with the notification *cannot create files inside the root resources folder*, but the cut is carried out: the file is removed from its folder and is in no folder of the tree. The next save writes the project without it. Nothing says that the file was removed. It was observed in an IDE started with an `APPDATA` of its own, reading the tree, the notifications and the saved project file.

**To Reproduce**
Steps to reproduce the behavior:
1. In Project Explorer, expand `Sources/Helpers`, click `Util.twin` and press Ctrl+X.
2. Click the `Resources` folder (the top folder, not one of its subfolders) and press Ctrl+V. The notification *cannot create files inside the root resources folder* is shown.
3. `Util.twin` is gone from `Helpers`, and is in no other folder.
4. Press Ctrl+S. The saved project holds `Sources/Helpers/Thing.twin` and no `Util.twin`.

**Expected behavior**
A refused paste leaving the cut file where it was, as a file manager does.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Cut, then Paste onto a subfolder of `Resources` (`Resources/CUSTOM`) moves the file, as it should. In the trial sessions Paste onto `Packages` did the same as onto `Resources`; the reproducer tests `Resources`. Closing the project with Discard Changes before a save brings the file back. The notification's wording on `Packages` is the entry "Add Other File or Paste on Packages says it cannot create files in the root resources folder".

Severity: medium. A file is deleted with a message that does not say so, and the next save makes the loss permanent.

<!-- Reproducer: bugs/cut-paste-refused-folder/ (mode lane: asserted by `ide-test.bat --only projects-loss` (test/ide/projects-loss.test.mjs), the test "Cut, then Paste onto Resources, deletes the file and creates it nowhere, and Ctrl+S saves the project without it", which passes on BETA 1010; the control "control: Cut, then Paste onto a folder of Resources, moves the file" passes too). No project and no zip. docs/IDE/Projects/Files-and-Folders.md, under Cut, copy and paste, carries a WARNING for it, and the NOTE of docs/IDE/Projects/Adding-Files.md under Where the new file goes points to it; when a fixed build is released, that WARNING and the NOTE's last sentence go. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D18). -->

---

## Importing a file over a file of the same name crashes the compiler, and when that file is open, the next save writes the old text back

**Describe the bug**
Add > Import... of an ordinary file whose name is that of a file already in the target folder replaces that file with no question, and crashes the compiler: the Debug Console prints `NATIVE EXCEPTION: ACCESS_VIOLATION`, and the IDE restarts the compiler. Nothing else shows the crash. When the replaced file is open in a tab, the project file on disk holds the imported text, but the tab and the IDE's copy keep the old text, and the next save from that tab writes the old text, with any edit, over the import. It was observed in an IDE started with an `APPDATA` of its own, reading the Debug Console, the IDE's copy of the file and the saved project file.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `Sources/Helpers/Util.twin` in a tab; do not edit it.
2. Right-click `Util.twin` in Project Explorer > Add > Import..., and pick a file named `Util.twin` that holds other text.
3. Nothing is asked. The Debug Console prints `NATIVE EXCEPTION: ACCESS_VIOLATION {no-basic-code} [...twinBASIC_win32.dll+0010B220]` and `restarting from FILE`.
4. The project file holds the imported `Util.twin`. The tab, and the text the IDE holds for the file, are the old `Util.twin`.
5. Type a line in the tab and press Ctrl+S. The project file now holds the old `Util.twin` with the new line; the import is gone.

**Expected behavior**
A question before a file is replaced, no crash, and the tab showing the imported text, or closed.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The same import over a file that is not open in a tab (`Thing.twin`, here) crashes the compiler in the same way; that file is then replaced in the IDE and on disk. The import also saves the project, which is the entry "Import of a file saves the project, with every unsaved editor". Seen three times in the trial sessions, the third from a newly started IDE, and in the reproducer.

Severity: medium. A compiler crash shows only in the Debug Console, and an import the reader believes done is undone at the next save.

<!-- Reproducer: bugs/import-over-open-file/ (mode lane: asserted by `ide-test.bat --only projects-import-crash` (test/ide/projects-import-crash.test.mjs), a lane of its own so that the crash cannot take other tests down; the tests "Add > Import... of a file over one that is not open crashes the compiler too" and "Add > Import... of a file over one open in a tab crashes the compiler, leaves the old text in the tab, and the next save writes it back over the import", which pass on BETA 1010; the control "control: Add > Import... of a file over one that is not open replaces it in the IDE and on disk" passes too). No project and no zip. docs/IDE/Projects/Adding-Files.md, under Import > Ordinary files, carries a WARNING for it; when a fixed build is released, that WARNING goes. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D32). -->

---

## Importing a project's file over one with unsaved edits replaces it with no question, and the edits are lost

**Describe the bug**
Add > Import... of a `.twinproj` opens the *Import from twinproj...* box, which lists the other project's files. A file ticked there whose path is already in the project replaces that file with no question. If the file is open in a tab, the tab is closed first and its unsaved edits are dropped. The import then saves the project, so the project's own copy of the file is overwritten on disk too. The only sign is the Debug Console's save and restart lines. It was observed in an IDE started with an `APPDATA` of its own, reading the tabs, the boxes shown, the Debug Console and the saved project file.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `Sources/Startup.twin` and type a line; do not save.
2. Right-click `Startup.twin` in Project Explorer > Add > Import..., and pick a `.twinproj` that has a `Sources/Startup.twin` of its own.
3. In *Import from twinproj...*, tick `Startup.twin` and press Import.
4. Nothing is asked. The tab of `Startup.twin` closes. The Debug Console prints `[PROJECT] twinBASIC project saving to disk [DONE]` and `restarting from FILE`.
5. The IDE's `Startup.twin` and the one in the project file are the imported one. The typed line is gone, and so is the project's saved `Startup.twin`.

**Expected behavior**
A question naming the files that would be replaced; and an editor with unsaved edits stopping the import, as it stops a rename: *Rename/Move failed. Please close the following editors that are preventing the operation:*.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Renaming a file with unsaved edits is refused with the message above. Seen in two trial sessions, the second from a newly started IDE, and in the reproducer.

Severity: high. Both the unsaved edits and the saved file are replaced with no question, and the save that follows leaves nothing to go back to.

<!-- Reproducer: bugs/import-project-overwrites/ (mode lane: asserted by `ide-test.bat --only projects-loss` (test/ide/projects-loss.test.mjs), the test "importing a project's file over one with unsaved edits replaces it with no question, closes its tab, and the edits are lost", which passes on BETA 1010, importing test/ide/probes/projects-import packed into the lane's work folder; the control "control: renaming a file with unsaved edits is refused, naming the editor to close" passes too). No project and no zip. docs/IDE/Projects/Adding-Files.md, under Import > Projects and packages, carries a WARNING for it; when a fixed build is released, that WARNING goes. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D12). -->

---

## Delete of a file with unsaved edits does not mention them

**Describe the bug**
Delete in Project Explorer on a file whose tab has unsaved edits shows the box shown for any file, and on Delete removes the file and closes its tab with the edits. A rename of the same file is refused while its editor has unsaved edits, naming the editor to close; Delete makes no such check. It was observed in an IDE started with an `APPDATA` of its own, reading the tabs and the boxes shown.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `Sources/Helpers/Util.twin` and type a line; do not save. The tab shows the change mark.
2. Select `Util.twin` in Project Explorer and press Delete. The box reads *Are you sure you want to delete '/ProjectsProbe/Sources/Helpers/Util.twin'? You will not be able to undo this operation.*, with Delete and Cancel, as for any file.
3. Choose Delete. The file is gone and its tab is closed; nothing else is said.

**Expected behavior**
The box saying that the file has unsaved changes, or the delete refused as the rename is.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
F2 on the same file, a new name and Enter show *Rename/Move failed. Please close the following editors that are preventing the operation:*. `tbProjectExplorer_SelectedItemsDeletePermanently` (`ide/main.js`) calls no `checkForDirtyEditorsAffected`, which the rename and the move call, so by the code a folder that holds such a file is deleted in the same way; that was not tested. The saved copy stays in the project file until the next save.

Severity: medium. Unsaved work goes with no word about it, although the reader did choose to delete the file.

<!-- Reproducer: bugs/delete-unsaved-no-warning/ (mode lane: asserted by `ide-test.bat --only projects-loss` (test/ide/projects-loss.test.mjs), the test "Delete of a file with unsaved edits asks as for any file, and its tab closes with the edits", which passes on BETA 1010; the control before it, "control: renaming a file with unsaved edits is refused, naming the editor to close", passes too). No project and no zip. docs/IDE/Projects/Files-and-Folders.md, under Delete (its first WARNING), carries a WARNING for it; when a fixed build is released, that WARNING goes. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D8). -->

---

## After a change to the references only, the X of Project Settings closes it without asking, and the change is lost

**Describe the bug**
Project Settings asks *Close without saving?* when it is closed with the title bar's X after a change. After a change to the references only, such as a library unticked on Enabled Libraries, the X closes it with no question, and the change is dropped. Apply Changes was enabled, so the dialog knew of the change. It was observed in an IDE started with an `APPDATA` of its own, reading the boxes shown and the project's settings.

**To Reproduce**
Steps to reproduce the behavior:
1. Click a file in Project Explorer and press Ctrl+T. Project Settings opens at the references.
2. Clear the tick of Microsoft Scripting Runtime. Apply Changes is enabled.
3. Click the title bar's X. The dialog closes with no question, no notification and no line in the Debug Console.
4. The project still references Microsoft Scripting Runtime.

**Expected behavior**
The question asked, as after any other change: after a change to the description, the X asks *... Close without saving?* (Yes, close / No, keep editing).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
`warnAboutSaving` (`ide/main.js`) compares the settings after `simplifySettingsConfigData`, which sets `project.references` and `project.warnings` to undefined, so by the code a change to the compiler warnings alone is dropped in the same way; that was not tested. Cancel never asks, for any change. Seen in two trial sessions, the second from a newly started IDE, and in the reproducer.

Severity: medium. A change the reader made is dropped with nothing to say so.

<!-- Reproducer: bugs/settings-references-close-no-question/ (mode lane: asserted by `ide-test.bat --only "^projects$"` (test/ide/projects.test.mjs), the test "after a change to the references only, the title bar's X closes Project Settings without asking, and the change is lost", which passes on BETA 1010; the control "control: after a change to the description, the title bar's X asks to close without saving" passes too). No project and no zip. docs/IDE/Projects/References-and-Packages.md, under Apply Changes and closing the dialog, carries a WARNING for it; when a fixed build is released, that WARNING goes. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D4). -->

---

## Import of a file saves the project, with every unsaved editor

**Describe the bug**
Add > Import... of ordinary files adds them and then saves the project, unasked, with the unsaved edits of every open editor. It was observed in an IDE started with an `APPDATA` of its own, reading the Debug Console, the dialogs asked for and the saved project file.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `Sources/Helpers/Thing.twin` and type a line; do not save.
2. Right-click `Sources/Helpers/Util.twin` > Add > Import..., and pick any file (here `extra.txt`).
3. The file is added to `Helpers`. The Debug Console prints `[PROJECT] twinBASIC project saving to disk [DONE]`. The file dialog was the only dialog.
4. The project file holds `Thing.twin` with the typed line.

**Expected behavior**
The import marking the project changed, as adding a new file does, and the save left to the reader.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
`importFile` (`ide/main.js`) runs `tbProject_SaveAllChanges` when the last file has been read. In a project that has no file yet, the trial saw the Save As dialog open instead. Cancel in the *Import from twinproj...* box, renaming the project and the Package needed box also save unasked; each has an entry.

Severity: low. Nothing is lost, but edits the reader may have meant to discard are written to the project file.

<!-- Reproducer: bugs/import-file-saves/ (mode lane: asserted by `ide-test.bat --only projects-loss` (test/ide/projects-loss.test.mjs), the test "Add > Import... of a file imports it and saves the project, with another file's unsaved edit", which passes on BETA 1010; the file imported is written into the lane's work folder). No project and no zip. docs/IDE/Projects/Adding-Files.md, under Import > The project is saved, carries a NOTE for it, and so does docs/IDE/Projects/Saving-and-Exporting.md, under Save Project > Other commands that save; when a fixed build is released, those NOTEs change. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D10). -->

---

## Cancel in the Import from twinproj box saves the project and restarts the compiler

**Describe the bug**
Add > Import... of a `.twinproj` opens the *Import from twinproj...* box. Its Cancel imports nothing, but saves the project, unasked and with the unsaved edits of every open editor, and the IDE then restarts its compiler. It was observed in an IDE started with an `APPDATA` of its own, reading the Debug Console and the saved project file.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `Sources/Helpers/Util.twin` and type a line; do not save.
2. Right-click `Sources/Startup.twin` > Add > Import..., and pick a `.twinproj`.
3. In *Import from twinproj...*, press Cancel.
4. The Debug Console prints `[PROJECT] twinBASIC project saving to disk [DONE]` and `restarting from FILE`. The project file holds `Util.twin` with the typed line. Nothing was imported.

**Expected behavior**
Cancel leaving the project as it was, unsaved, and the compiler running.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The box is served by a second compiler that reads the chosen project; Cancel ends it, and the IDE restarts its own. Import in the same box saves the project too (see "Importing a project's file over one with unsaved edits replaces it with no question, and the edits are lost").

Severity: low. Nothing is lost, but Cancel writes edits the reader may have meant to discard.

<!-- Reproducer: bugs/import-cancel-saves/ (mode lane: asserted by `ide-test.bat --only projects-loss` (test/ide/projects-loss.test.mjs), the test "Cancel in the Import from twinproj box saves the project, with another file's unsaved edit, and restarts the compiler", which passes on BETA 1010, importing test/ide/probes/projects-import packed into the lane's work folder). No project and no zip. docs/IDE/Projects/Adding-Files.md, under Import > The project is saved, carries a NOTE for it, and so does docs/IDE/Projects/Saving-and-Exporting.md, under Save Project > Other commands that save; when a fixed build is released, those NOTEs change. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D31, with D13, the compiler restart). -->

---

## Renaming the project saves it, with every unsaved editor

**Describe the bug**
Renaming the project's row in Project Explorer saves the project at once, unasked and with the unsaved edits of every open editor, and the compiler then restarts. It was observed in an IDE started with an `APPDATA` of its own, reading the Debug Console and the saved project file.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `Sources/Startup.twin` and type a line; do not save.
2. Click the project's row, press F2, type `ProjRenamed` and press Enter.
3. Nothing is asked. The Debug Console prints `[COMPILER] Project settings changes require compiler-restart` and `[PROJECT] twinBASIC project saving to disk [DONE]`, and a *Please wait...* box follows while the compiler restarts.
4. The project file holds `Startup.twin` with the typed line, and `project.name` is `ProjRenamed`.

**Expected behavior**
The new name kept in memory and saved with the next save, as a renamed file is.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
In the trial, the title bar's change mark went with the save.

Severity: low. Nothing is lost, but a rename writes edits the reader may have meant to discard.

<!-- Reproducer: bugs/rename-project-saves/ (mode lane: asserted by `ide-test.bat --only projects-loss` (test/ide/projects-loss.test.mjs), the test "renaming the project's row saves the project, with an unsaved edit in another file", which passes on BETA 1010). The trial's note that the row and the title keep the old names was not confirmed (the tree reloads after the restart), so the entry leaves it out. No project and no zip. docs/IDE/Projects/Files-and-Folders.md, under Rename > The project, carries a NOTE for it, and so does docs/IDE/Projects/Saving-and-Exporting.md, under Save Project > Other commands that save; when a fixed build is released, those NOTEs change. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D20). -->

---

## Add WinNativeForms package saves the project unasked

**Describe the bug**
Add Windows Form in a project that does not reference WinNativeForms shows the box *Package needed: WinNativeForms*, whose text speaks only of a compiler restart. Its button Add WinNativeForms package adds the reference and also saves the project, unasked. It was observed in an IDE started with an `APPDATA` of its own, reading the box, the Debug Console and the saved project file.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a saved project that does not reference WinNativeForms.
2. Right-click `Sources` > Add > Add Windows Form. The box *Package needed: WinNativeForms* is shown; its text says nothing of a save.
3. Press Add WinNativeForms package. The Debug Console prints `[COMPILER] Project settings changes require compiler-restart`, `[PROJECT] twinBASIC project saving to disk [DONE]` and `restarting from FILE`.
4. The `Settings` in the project file references WinNativeForms.

**Expected behavior**
The box saying that the project will be saved, or the reference added in memory and saved with the next save.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Whether the unsaved edits of open editors go into this save was not tested. The same unasked save follows Import..., Cancel in the *Import from twinproj...* box and renaming the project; each has an entry.

Severity: low. Nothing is lost; the project file is written when the reader did not ask.

<!-- Reproducer: bugs/package-needed-saves/ (mode lane: asserted by `ide-test.bat --only projects-loss` (test/ide/projects-loss.test.mjs), the test "Add WinNativeForms package, in the Package needed box, saves the project unasked", which passes on BETA 1010, on a variant of the fixture without the form and the compiler-package references, in the lane's work folder). No project and no zip. docs/IDE/Projects/References-and-Packages.md, under Package needed, carries a NOTE for it, and so does docs/IDE/Projects/Saving-and-Exporting.md, under Save Project > Other commands that save; when a fixed build is released, those NOTEs change. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D35). -->

---

## Nothing stops dragging Sources into another folder

**Describe the bug**
Rename refuses the special folders of a project with *Cannot rename: permission denied.*, but a drag does not: `Sources` dragged onto `Miscellaneous` moves into it with no message, and the next save keeps it there. It was observed in an IDE started with an `APPDATA` of its own, reading the tree, the notifications and the saved project file.

**To Reproduce**
Steps to reproduce the behavior:
1. In Project Explorer, drag `Sources` onto `Miscellaneous`. `Miscellaneous` is highlighted as a drop target.
2. `Sources` moves into `Miscellaneous`; nothing is said.
3. Press Ctrl+S. The project file holds `Miscellaneous/Sources/Startup.twin`, and no `Sources/Startup.twin`.

**Expected behavior**
The drop refused, as the rename of `Sources` is.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
F2 on `Sources`, a new name and Enter give *Cannot rename: permission denied.* Delete on a special folder shows the delete box and deletes nothing. In the trial, the project opened again showed a new, empty `Sources` beside `Miscellaneous/Sources`, and the object view still listed every module, class and form, so they were still compiled.

Severity: low. Nothing is lost, but the project's layout changes with no sign that it should not.

<!-- Reproducer: bugs/drag-special-folder/ (mode lane: asserted by `ide-test.bat --only projects-loss` (test/ide/projects-loss.test.mjs), the test "dragging Sources onto Miscellaneous moves it there with no message, and Ctrl+S saves it there", which passes on BETA 1010; the control "control: renaming Sources is refused: Cannot rename: permission denied." passes too). No project and no zip. docs/IDE/Projects/Files-and-Folders.md, under Move a file or folder by dragging (its NOTE), carries a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D9). -->

---

## Delete on a References entry removes the row but not the reference

**Describe the bug**
Project Explorer's `References` folder lists the project's references. The context menu of an entry greys out Delete, but the Delete key shows the delete box, and Delete there removes the row. The reference stays in the project, before and after a save. It was observed in an IDE started with an `APPDATA` of its own, reading the tree, the IDE's copy of the project's settings and the saved project file.

**To Reproduce**
Steps to reproduce the behavior:
1. In Project Explorer, expand `References` and right-click the Microsoft Scripting Runtime entry. The menu's Delete is greyed out.
2. Click the entry, press Delete, and choose Delete in the box. The row is gone.
3. The project's `Settings` in the IDE still references Microsoft Scripting Runtime. Press Ctrl+S: the project file still does.

**Expected behavior**
The Delete key doing nothing on a `References` entry, as the menu says; or removing the reference.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The menu also greys out Cut, Paste and Rename. The row stays gone after the save.

Severity: low. Nothing is lost, but the tree no longer shows a reference the project has.

<!-- Reproducer: bugs/delete-reference-row/ (mode lane: asserted by `ide-test.bat --only projects-loss` (test/ide/projects-loss.test.mjs), the test "Delete on a References entry removes the row, but the reference stays, before and after Ctrl+S", which passes on BETA 1010). No project and no zip. docs/IDE/Projects/References-and-Packages.md, under The References folder, carries a NOTE for it, and so does the NOTE of docs/IDE/Projects/Files-and-Folders.md under Delete (its last sentences); when a fixed build is released, those go. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D21). -->

---

## An Export Path without exportPathIsV2 gets the project's name appended with no separator

**Describe the bug**
Export Project writes into the project's Export Path. When the `Settings` file has a `project.exportPath` but no `project.exportPathIsV2` entry, the project's name is appended to the path with no separator, so the export goes into a folder whose name joins the two, beside the folder intended. It was observed in an IDE started with an `APPDATA` of its own, reading the Debug Console and the folders written.

**To Reproduce**
Steps to reproduce the behavior:
1. A project named ProjectsProbe whose `Settings` holds `project.exportPath` `${SourcePath}\exp2` and no `project.exportPathIsV2`.
2. Press Ctrl+E. The Debug Console prints `[EXPORT] COMPLETED`; no folder dialog is shown.
3. The files are in `exp2ProjectsProbe\`, beside the project file. There is no `exp2\`.

**Expected behavior**
A separator before the project's name, `exp2\ProjectsProbe\`, or the folder as given.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
With `project.exportPathIsV2` `true` and `${SourcePath}\exp3`, the export goes into `exp3\`. The paths in the steps have no trailing backslash.

Severity: low. The files are written, beside the folder intended.

<!-- Reproducer: bugs/export-path-v1-no-separator/ (mode lane: asserted by `ide-test.bat --only projects-loss` (test/ide/projects-loss.test.mjs), the test "without exportPathIsV2, Export Project writes into the Export Path with the project's name appended and no separator", which passes on BETA 1010; the control "control: with exportPathIsV2, Export Project writes into the Export Path's folder" passes too; both on variants of the fixture in the lane's work folder, so the exports go there). No project and no zip. docs/IDE/Projects/Saving-and-Exporting.md, under Export Project > Where it writes, carries a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D28). -->

---

## Project Explorer's object view opens no menu on a right click

**Describe the bug**
Project Explorer's object view (Ctrl+R) has a context menu with View Object, View Code, Add, Rename and Delete, but a right click on a row opens nothing, whether the row is an object, a form or a group. The menu's commands cannot be reached. It was observed in an IDE started with an `APPDATA` of its own, looking for an open menu after each click.

**To Reproduce**
Steps to reproduce the behavior:
1. In Project Explorer, press Ctrl+R for the object view.
2. Right-click `Startup` (a module), `frmMain` (a form) or `Modules` (a group). No menu opens.

**Expected behavior**
The menu opened, as a right click on a row of the file view opens the file view's menu.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The list item's `onmousedown` (`ide/main.js`) passes on the left button only. With the menu unreachable, a form's code cannot be opened from the object view, since Shift+double-click opens the designer too (see "Shift+double-click on a form in the object view opens the designer, not the code"). The menu's Rename and Delete do nothing yet either (see "The object view's Rename and Delete commands only show an alert naming the command").

Severity: low. The same commands are in the file view's menu.

<!-- Reproducer: bugs/objectview-no-menu/ (mode lane: asserted by `ide-test.bat --only "^projects$"` (test/ide/projects.test.mjs), the test "in the object view, a right click on an object, a form or a group opens no menu", which passes on BETA 1010; the control "control: a right click on a row of the file view opens its menu" passes too). No project and no zip. docs/IDE/Projects/Project-Explorer.md, in the NOTE at the end of The object view (under Search the objects), carries a NOTE for it; when a fixed build is released, that NOTE's item goes. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D29). -->

---

## The object view's Rename and Delete commands only show an alert naming the command

**Describe the bug**
The commands behind the object view menu's Rename and Delete, `tbProjectExplorer_ObjectList_RenameSelected` and `tbProjectExplorer_ObjectList_DeleteSelected`, show only a browser alert that holds the command's name. Nothing is renamed or deleted. The menu draws the two items disabled, and the menu does not open at all (see "Project Explorer's object view opens no menu on a right click"), so a key bound to the command is the way to run one. It was observed in an IDE started with an `APPDATA` of its own, running the commands and reading the alerts.

**To Reproduce**
Steps to reproduce the behavior:
1. In Project Explorer, press Ctrl+R for the object view, and select an object.
2. Run `tbProjectExplorer_ObjectList_RenameSelected`. An alert reads *tbProjectExplorer_ObjectList_RenameSelected*.
3. Run `tbProjectExplorer_ObjectList_DeleteSelected`. An alert reads *tbProjectExplorer_ObjectList_DeleteSelected*.

**Expected behavior**
The object's file renamed or deleted, as from the file view; or the commands left out until they work.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The two commands are `alert(...)` calls in `ide/main.js`.

Severity: low. Rename and Delete in the file view work.

<!-- Reproducer: bugs/objectview-rename-delete-alert/ (mode lane: asserted by `ide-test.bat --only "^projects$"` (test/ide/projects.test.mjs), the test "the object view's Rename and Delete commands only show an alert naming the command", which passes on BETA 1010; it runs the two commands through the IDE's command call). No project and no zip. docs/IDE/Projects/Project-Explorer.md, in the NOTE at the end of The object view (under Search the objects, its first item, which names Rename and Delete among the commands that cannot be reached), carries a NOTE for it; when a fixed build is released, that item changes. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D2). -->

---

## A letter typed in the object view opens its search box with > before the letter

**Describe the bug**
In Project Explorer's object view, a printable key typed with a row selected opens the search box, with the focus in it, holding `>` and the letter. The `>` does not change what is matched (`>Util` finds what `Util` finds), but it is a character the reader did not type. It was observed in an IDE started with an `APPDATA` of its own, reading the search box.

**To Reproduce**
Steps to reproduce the behavior:
1. In Project Explorer, press Ctrl+R for the object view.
2. Click `Startup`, and type `u`.
3. The search box opens, focused, and holds `>u`.

**Expected behavior**
The search box holding `u`.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
`fs.objectListOuter.onkeydown` (`ide/main.js`) sets the box's value to `">" + e.key`.

Severity: low. Cosmetic.

<!-- Reproducer: bugs/objectview-search-prefix/ (mode lane: asserted by `ide-test.bat --only "^projects$"` (test/ide/projects.test.mjs), the test "in the object view, a letter typed with a row selected opens the search box holding > and the letter", which passes on BETA 1010). No project and no zip. docs/IDE/Projects/Project-Explorer.md, in the NOTE at the end of The object view (under Search the objects, its last item), carries a NOTE for it; when a fixed build is released, that item goes. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D2b). -->

---

## Shift+double-click on a form in the object view opens the designer, not the code

**Describe the bug**
In Project Explorer's object view, the code that opens a form tells the designer from the code by the Shift key, but the double-click passes no Shift state to it. Shift+double-click on a form opens its designer, as a plain double-click does. With the object view's menu unreachable, a form's code cannot be opened from the object view at all. It was observed in an IDE started with an `APPDATA` of its own, reading the tabs.

**To Reproduce**
Steps to reproduce the behavior:
1. In Project Explorer, press Ctrl+R for the object view.
2. Shift+double-click `frmMain`. The designer, `frmMain.tbform`, opens; `frmMain.twin` is not opened.

**Expected behavior**
The form's code, `frmMain.twin`, opened.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
A double-click on a module (`Legacy`) opens its code, as it should. The list item's `ondblclick` (`ide/main.js`) passes no `shiftKey`. The menu's View Code is out of reach too (see "Project Explorer's object view opens no menu on a right click").

Severity: low. The form's `.twin` file opens from the file view.

<!-- Reproducer: bugs/objectview-shift-double-click/ (mode lane: asserted by `ide-test.bat --only "^projects$"` (test/ide/projects.test.mjs), the test "Shift+double-click on a form in the object view opens its designer, not its code", which passes on BETA 1010; the control "control: in the object view, a double-click on a module opens its code" passes too). No project and no zip. docs/IDE/Projects/Project-Explorer.md, in the NOTE at the end of The object view (under Search the objects, its second item), carries a NOTE for it; when a fixed build is released, that item goes. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D30). -->

---

## Space does not open or close a folder in Project Explorer

**Describe the bug**
Project Explorer's tree has code to open and close a folder with Space, but it tests the key as `"Space"`, while a KeyboardEvent's `key` for the space bar is `" "`. Space on a selected folder does nothing. It was observed in an IDE started with an `APPDATA` of its own, reading the tree.

**To Reproduce**
Steps to reproduce the behavior:
1. In Project Explorer, expand `Sources` and `Sources/Helpers`.
2. Click `Sources/Helpers/Thing.twin` and press Left Arrow. `Helpers` is selected.
3. Press Space. `Helpers` stays open, and stays selected.

**Expected behavior**
Space closing the open folder, and opening it again at the next press.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The test is in `treeView.onKeyDown` (`ide/main.js`).

Severity: low. A key the tree's own code offers does nothing.

<!-- Reproducer: bugs/tree-space-folder/ (mode lane: asserted by `ide-test.bat --only "^projects$"` (test/ide/projects.test.mjs), the test "Space on a selected folder neither closes nor opens it", which passes on BETA 1010). No project and no zip. docs/IDE/Projects/Project-Explorer.md, under The file view > Keys in the tree (its NOTE, first item), carries a NOTE for it; when a fixed build is released, that item goes. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D3). -->

---

## Typing in Project Explorer does not filter the tree

**Describe the bug**
Project Explorer's tree has code to filter its rows by the letters typed, which listens for `keypress`. The page receives `keydown` and `keyup` for each letter, but no `keypress`, so typing in the file view does nothing. It was observed in an IDE started with an `APPDATA` of its own, recording the key events the page receives and reading the tree.

**To Reproduce**
Steps to reproduce the behavior:
1. In Project Explorer, click `Sources/Startup.twin` (a file that is not open in a tab; a click on the row of an open file puts the focus in its editor).
2. Type `ti`.
3. No filter text appears, and the tree shows the same rows.

**Expected behavior**
The rows narrowed to those that match the letters typed, as the code intends.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The tree's `filterText` stays empty.

Severity: low. The object view's search finds objects by name.

<!-- Reproducer: bugs/tree-type-to-filter/ (mode lane: asserted by `ide-test.bat --only "^projects$"` (test/ide/projects.test.mjs), the test "typing letters in the file view does not filter the tree", which passes on BETA 1010; its diagnostic lists the key events the page saw). No project and no zip. docs/IDE/Projects/Project-Explorer.md, under The file view > Keys in the tree (its NOTE, second item), carries a NOTE for it; when a fixed build is released, that item goes. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D15). -->

---

## Ctrl+A in Project Explorer raises a page error

**Describe the bug**
Ctrl+A in Project Explorer's file view selects every row shown, as it should, but the IDE page also raises `Uncaught TypeError: Cannot read properties of undefined (reading 'style')`. It was observed in an IDE started with an `APPDATA` of its own, recording the page's errors and reading the selection.

**To Reproduce**
Steps to reproduce the behavior:
1. In Project Explorer, click `Sources/Startup.twin` (a file that is not open in a tab).
2. Press Ctrl+A. Every row shown is selected, and the page raises the error above.

**Expected behavior**
The rows selected, with no error.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The error is thrown in the tree's key handler.

Severity: low. The selection is right.

<!-- Reproducer: bugs/tree-ctrl-a-error/ (mode lane: asserted by `ide-test.bat --only "^projects$"` (test/ide/projects.test.mjs), the test "Ctrl+A in the file view selects every row shown and raises a page TypeError", which passes on BETA 1010). No project and no zip. docs/IDE/Projects/Project-Explorer.md, under The file view > Keys in the tree (its NOTE, fourth item), carries a NOTE for it; when a fixed build is released, that item goes. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D25). -->

---

## Right Arrow on an open folder selects its first entry in the compiler's order, not the first row shown

**Describe the bug**
Right Arrow on an open folder in Project Explorer selects the folder's first entry, but in the order the compiler lists the entries, not the order the tree draws them in, which puts folders first. It was observed in an IDE started with an `APPDATA` of its own, reading the rows and the selection.

**To Reproduce**
Steps to reproduce the behavior:
1. In Project Explorer, expand `Sources`. Its first row is the folder `Helpers`.
2. Click `Sources/Startup.twin` (a file that is not open in a tab) and press Left Arrow. `Sources` is selected.
3. Press Right Arrow. `Sources/frmMain.twin` is selected, not `Helpers`.

**Expected behavior**
The first row shown under the folder selected, `Helpers`.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
`Sources` holds the folder `Helpers` and the files `Legacy.bas`, `Startup.twin`, `frmMain.tbform` and `frmMain.twin`; the tree draws `Helpers` first.

Severity: low. The selection jumps to a row the reader did not expect.

<!-- Reproducer: bugs/tree-right-arrow-order/ (mode lane: asserted by `ide-test.bat --only "^projects$"` (test/ide/projects.test.mjs), the test "Right Arrow on an open folder selects its first entry in the compiler's order, not the first row shown", which passes on BETA 1010). No project and no zip. docs/IDE/Projects/Project-Explorer.md, under The file view > Keys in the tree (its NOTE, third item), carries a NOTE for it; when a fixed build is released, that item goes. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D26). -->

---

## Down Arrow past the last row of Project Explorer selects a hidden Settings node, and Enter there raises a page error

**Describe the bug**
Down Arrow on the last row of Project Explorer's file view moves the selection to the project's `Settings` node, which the tree does not draw, so no row is highlighted. Enter then raises `Uncaught TypeError: Cannot read properties of undefined (reading 'ondblclick')` in the IDE page, and opens nothing. It was observed in an IDE started with an `APPDATA` of its own, recording the page's errors and reading the selection and the tabs.

**To Reproduce**
Steps to reproduce the behavior:
1. In Project Explorer's file view, click the last row.
2. Press Down Arrow. The selection is `/ProjectsProbe/Settings`, which has no row; nothing is highlighted.
3. Press Enter. The page raises the error above, and no tab opens.

**Expected behavior**
Down Arrow on the last row doing nothing.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Enter on a file opens it in a tab, as it should. The error is thrown in `treeView.onKeyDown` (`ide/main.js`).

Severity: low. The highlight disappears, and Enter does nothing.

<!-- Reproducer: bugs/tree-down-hidden-settings/ (mode lane: asserted by `ide-test.bat --only "^projects$"` (test/ide/projects.test.mjs), the test "Down Arrow on the last row selects the hidden Settings node, and Enter there raises a page TypeError", which passes on BETA 1010; the control "control: Enter on a file in the file view opens it in a tab" passes too). No project and no zip. docs/IDE/Projects/Project-Explorer.md, under The file view > Keys in the tree (its NOTE, last item), carries a NOTE for it; when a fixed build is released, that item goes. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D34). -->

---

## Delete with nothing selected asks to delete the selected items

**Describe the bug**
With nothing selected in Project Explorer's file view, the Delete key shows the box *Are you sure you want to delete the selected items?*, and Delete there deletes nothing. It was observed in an IDE started with an `APPDATA` of its own, reading the selection, the boxes shown and the tree.

**To Reproduce**
Steps to reproduce the behavior:
1. In Project Explorer, click `Sources/Startup.twin`, then press Esc. Nothing is selected.
2. Press Delete. The box asks *Are you sure you want to delete the selected items?*
3. Choose Delete. Nothing is deleted, and nothing else is shown.

**Expected behavior**
Delete doing nothing when nothing is selected.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
With a row selected, the box names the item, as in *Are you sure you want to delete '/ProjectsProbe/Sources/Helpers/Util.twin'? You will not be able to undo this operation.*

Severity: low. Nothing is deleted.

<!-- Reproducer: bugs/tree-delete-nothing/ (mode lane: asserted by `ide-test.bat --only "^projects$"` (test/ide/projects.test.mjs), the test "with nothing selected, Delete asks to delete the selected items, and Delete deletes nothing", which passes on BETA 1010). No project and no zip. docs/IDE/Projects/Files-and-Folders.md, under Delete (its NOTE, first sentences), carries a NOTE for it; when a fixed build is released, those sentences go. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D16). -->

---

## Renaming a file to its own name, or changing only its case, is refused as an invalid name

**Describe the bug**
In Project Explorer, F2 and then Enter with the name unchanged is refused with the notification *Cannot rename: the new name entered is invalid.* A rename that changes only the case of the name is refused with the same notification, so the case of a file's name cannot be changed in the tree at all. It was observed in an IDE started with an `APPDATA` of its own, reading the notifications and the file's name.

**To Reproduce**
Steps to reproduce the behavior:
1. In Project Explorer, select `Sources/Helpers/Thing2.twin` (a file that is not open in a tab) and press F2, then Enter with the name unchanged. The notification above is shown.
2. Press F2 again, type `thing2.twin` and press Enter. The same notification is shown, and the file is still `Thing2.twin`.

**Expected behavior**
Enter with the name unchanged closing the box with nothing said, and a change of case renaming the file.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
F2 and a new name (`Thing.twin` to `Thing2.twin`) renames the file. `renameItemValidate` (`ide/main.js`) returns false when the new name in lower case equals the old one, and the caller shows the invalid-name message.

Severity: low. Nothing is lost.

<!-- Reproducer: bugs/rename-same-name-invalid/ (mode lane: asserted by `ide-test.bat --only "^projects$"` (test/ide/projects.test.mjs), the test "F2 and Enter with the name unchanged, or changed only in case, is refused as an invalid name", which passes on BETA 1010; the control "control: F2 and a new name renames a file" passes too). No project and no zip. docs/IDE/Projects/Files-and-Folders.md, under Rename, carries a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D1). -->

---

## Paste of a file with no extension, in a folder whose name holds a dot, creates nothing

**Describe the bug**
Paste in Project Explorer names a copy `<name> copy<extension>`, but takes the extension from the last `.` of the whole path, not of the file name. For a file with no extension in a folder whose name holds a `.`, such as `Miscellaneous/v1.2/datafile`, the ` copy` goes into the folder part of the path, and the paste creates nothing and says nothing. It was observed in an IDE started with an `APPDATA` of its own, reading the clipboard, the tree, the notifications and the boxes shown.

**To Reproduce**
Steps to reproduce the behavior:
1. In Project Explorer, expand `Miscellaneous/v1.2` and select `datafile`, which has no extension.
2. Press Ctrl+C, then Ctrl+V. No file is added, and nothing is said.

**Expected behavior**
A copy named `datafile copy` beside it.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The clipboard holds `text/html` `twinbasic/uris;/ProjectsProbe/Miscellaneous/v1.2/datafile`, as for any file copied. Copy and Paste of `Resources/CUSTOM/notes.txt` makes `notes copy.txt` beside it. `tbProjectExplorer_ClipboardPaste` (`ide/main.js`) takes `"." + r.split(".").pop()` of the full path `r`.

Severity: low. Nothing is lost.

<!-- Reproducer: bugs/paste-dotted-folder/ (mode lane: asserted by `ide-test.bat --only "^projects$"` (test/ide/projects.test.mjs), the test "Copy and Paste of a file with no extension in a folder whose name holds a dot creates nothing and says nothing", which passes on BETA 1010; the control "control: Copy and Paste of a file makes a copy named '<name> copy' beside it" passes too; the clipboard is faked in the page). No project and no zip. docs/IDE/Projects/Files-and-Folders.md, under Cut, copy and paste (its NOTE), carries a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D6). -->

---

## Add Other File or Paste on Packages says it cannot create files in the root resources folder

**Describe the bug**
Add > Add Other File, and Paste, on Project Explorer's `Packages` folder create nothing, but the notification they show says *cannot create files inside the root resources folder*, naming `Resources`, not `Packages`. It was observed in an IDE started with an `APPDATA` of its own, reading the notifications and the tree.

**To Reproduce**
Steps to reproduce the behavior:
1. In Project Explorer, right-click `Packages` > Add > Add Other File, and press Enter on the name `MyFile`. The notification *cannot create files inside the root resources folder* is shown.
2. Copy `Resources/CUSTOM/notes.txt`, click `Packages` and press Ctrl+V. The same notification is shown.
3. Nothing is added to `Packages`.

**Expected behavior**
A message naming `Packages`.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Add > Add Other File on `Resources/CUSTOM` creates the file there. A file cut and then pasted on `Packages` is deleted, which is the entry "Cut, then Paste onto Resources or Packages, deletes the file and creates it nowhere".

Severity: low. Nothing is created, as it should be; the message names the wrong folder.

<!-- Reproducer: bugs/packages-resources-message/ (mode lane: asserted by `ide-test.bat --only "^projects$"` (test/ide/projects.test.mjs), the test "Add Other File on Packages, and Paste on Packages, each say they cannot create files inside the root resources folder", which passes on BETA 1010; the control "control: Add > Add Other File on a folder of Resources creates the file there" passes too). No project and no zip. docs/IDE/Projects/Adding-Files.md, under Name the new file > Where the new file goes, carries a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D24). -->

---

## Dragging a file onto Packages raises a page error

**Describe the bug**
A file dragged onto Project Explorer's `Packages` folder: the folder is highlighted as a drop target, nothing moves, and the IDE page raises `Uncaught RangeError: Invalid DataView length 8`. It was observed in an IDE started with an `APPDATA` of its own, recording the page's errors and reading the tree.

**To Reproduce**
Steps to reproduce the behavior:
1. In Project Explorer, expand `Sources`, and drag `Sources/Legacy.bas` onto `Packages`. `Packages` is highlighted as a drop target.
2. Nothing moves, and the page raises the error above.

**Expected behavior**
The drop refused with no highlight and no error, or a message that files cannot go there.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Dragging a file onto an ordinary folder moves it.

Severity: low. Nothing moves, as it should not.

<!-- Reproducer: bugs/drag-onto-packages-error/ (mode lane: asserted by `ide-test.bat --only "^projects$"` (test/ide/projects.test.mjs), the test "dragging a file onto Packages moves nothing and raises a page RangeError", which passes on BETA 1010). No project and no zip. docs/IDE/Projects/Files-and-Folders.md, under Move a file or folder by dragging (its NOTE, last sentence), carries a NOTE for it; when a fixed build is released, that NOTE changes. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D27). -->

---

## An imported type library is listed in Enabled Libraries as [LINKED-PACKAGE]

**Describe the bug**
In Project Settings, Available COM References, Import from file... adds a type library from a file: the project gains a reference named `[IMPORTED] <library name>`, to a copy of the file under `/ImportedTypeLibraries/`. The Enabled Libraries list then draws that reference as `[LINKED-PACKAGE] <library name>`, the label of a package. It was observed in an IDE started with an `APPDATA` of its own, reading the dialog's references and its list.

**To Reproduce**
Steps to reproduce the behavior:
1. Click a file in Project Explorer and press Ctrl+T, and open Available COM References.
2. Press Import from file..., and pick `C:\Windows\SysWOW64\msdatsrc.tlb`.
3. The project gains the reference *[IMPORTED] Microsoft Data Source Interfaces for ActiveX Data Binding Type Library*, path `/ImportedTypeLibraries/msdatsrc.tlb`.
4. Open Enabled Libraries. The row reads *[LINKED-PACKAGE] Microsoft Data Source Interfaces ...*.

**Expected behavior**
A label for a type library, such as the reference's own name.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The reference is not one of the compiler's installed packages, and its own name starts `[IMPORTED]`.

Severity: low. A type library is labelled as a package.

<!-- Reproducer: bugs/imported-typelib-linked-package/ (mode lane: asserted by `ide-test.bat --only "^projects$"` (test/ide/projects.test.mjs), the test "a type library imported on Available COM References is listed in Enabled Libraries as [LINKED-PACKAGE]", which passes on BETA 1010; the file dialog is answered in the page, and the dialog is closed with Cancel). No project and no zip. docs/IDE/Projects/References-and-Packages.md, under Import from file (its third NOTE), carries a NOTE for it; when a fixed build is released, that NOTE changes. Found 2026-10-12 in the trials for the Projects and files pages (their fact sheet's D33). -->

---

## With Export Verbose, each DONE line of Export Project shows &#92; for every backslash

**Describe the bug**
With *Export Verbose* on (Project Settings, Export), Export Project prints a `DONE:` line in the DEBUG CONSOLE for each file it writes. Every backslash in those paths shows as the text `&#92;`. The files are written correctly. It was observed in an IDE started with an `APPDATA` of its own, reading the console's lines and the rows it draws, and the folder written.

**To Reproduce**
Steps to reproduce the behavior:
1. Open any project, and set *Export Verbose* to YES in Project Settings, Export.
2. Export Project into an empty folder.
3. The DEBUG CONSOLE shows `[EXPORT]  DONE: &#92;Settings`, `[EXPORT]  DONE: &#92;Sources&#92;Startup.twin`, and so on for each file.

**Expected behavior**
`[EXPORT]  DONE: \Settings`, `[EXPORT]  DONE: \Sources\Startup.twin`.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Also on BETA 1007, with the same lines. The other `[EXPORT]` lines are right: the first line, `exporting current project to "\\?\C:\...\"...`, the `COMPLETED (... folders, ... files)` line, and, when the export folder already holds files, each `DELETED: \\?\C:\...` line. The files written and their contents are right.

The cause looks to be the one in #2444. The compiler sends each `DONE` line in three parts: `[EXPORT]  DONE: `, then the path, then the line break. `debugOutputPartial` in `ide/main.js` adds the path to a line that is still open, and passes it through `TEXTtoHTML` twice, so `\` is stored as `&amp;#92;` and drawn as `&#92;`. A `DELETED` line comes in one part and is escaped once.

Severity: cosmetic. The paths are hard to read, and a path copied from the console is wrong.

**Fix shape**

`debugOutputPartial` in `ide/main.js`, BETA 1010, in a readable form. The local names are ours, not twinBASIC's (`text`, `colorClass`, `isHTML`, `timeStamp`, `endsLine`, `addedHTML`, `lineHTML`, `stampHTML`); the build calls them `e`, `t`, `o`, `n`, `r`, `i`, `n`, `i`.

```diff
@@ -6,11 +6,11 @@
   if (debugConsolePartialLineItem) {
     let lineHTML = debugConsoleContent.onAsyncGetItemHTML(debugConsolePartialLineItem);
     if (debugConsolePartialLineItem_LastColorClass === colorClass) {
-      text = TEXTtoHTML(text);
+      text = isHTML ? text : TEXTtoHTML(text);
     } else {
       text = "</span><span class='" + colorClass + "'>" + (isHTML ? text : TEXTtoHTML(text));
     }
-    var addedHTML = isHTML ? text : TEXTtoHTML(text);
+    var addedHTML = text;
     debugConsoleContent.updateItem(
       debugConsolePartialLineItem,
       lineHTML + addedHTML + (endsLine ? "</span>" : ""),
```

Both branches of the `if` already escape `text`, so the second `TEXTtoHTML` escapes it again (this bug and #2444); after a colour change it also escapes the `</span><span>` markup that the `else` branch added. The first changed line is a related case: HTML text that continues a line in the same colour is escaped, though it is HTML. Drop that line if `isHTML` never continues a line.

Tested on a copy of BETA 1010 with this change (two edits in `main.js`, every other byte the same): the DONE lines read `DONE: \Settings` and `DONE: \Sources\Startup.twin`, the other `[EXPORT]` lines are unchanged, and #2444's reproducer no longer reproduces.

<!-- Reproducer: bugs/export-verbose-done-escaped/ (mode lane: asserted by `ide-test.bat --only "^export$"` (test/ide/export.test.mjs), the test "with Export Verbose, every DONE line shows &#92; for each backslash of the path, and the files are right", which passes on BETA 1010 and on BETA 1007; the controls "control: with Export Verbose, a second export's DELETED lines show the paths' backslashes" and "control: without Export Verbose, the first line and the COMPLETED line show the path's backslashes" pass too; the exports go into the lane's work folder through the IDE's own exportProjectTo(), which the menu command calls). No project and no zip. Its cause is twinbasic/twinbasic#2444's (bugs/filed/debug-print-escaped-twice/), so the owner may mark it *CAPTURED IN EXISTING #2444* instead of filing it. docs/IDE/Projects/Saving-and-Exporting.md, under Export Project (the paragraph on Export Verbose), carries a NOTE for it; when a fixed build is released, that NOTE goes. First seen on BETA 1005 while taking the documentation's screenshots (WIP.Screenshots.md, "Not taken: the export console"). Fix: bugs/export-verbose-done-escaped/fix.js; the Fix shape is `node scripts/ide_js.mjs shape bugs/export-verbose-done-escaped/fix.js` on BETA 1010, and `patch ... --copy-to <dir under %TEMP%>` then `ide-test.bat --ide <copy>\twinBASIC.exe --only "^export$"` tests it (the entry's test then reports that it no longer reproduces). -->

---

## Auto-Increment raises the version in memory only, and the increments are lost

**Describe the bug**
With *(VERSION) Auto-Increment* set in Project Settings, each successful build prints `[BUILD] Auto-incremented next build number to: ...` and raises the version in the Settings the IDE holds. The project is not marked changed and its file is not written, so Close Project asks nothing, and the increments are lost: the next session builds, and publishes, version numbers already used. It was observed in an IDE started with an `APPDATA` of its own, reading the console, the Settings the IDE holds, its changed state, and the project file.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a saved Standard EXE project at version 1.0.7.3, with *(VERSION) Auto-Increment* set to `Revision`.
2. Press Build. The console prints `[BUILD] Auto-incremented next build number to: 1.0.7.4`.
3. Press Build again: `... to: 1.0.7.5`. The Settings the IDE holds say 1.0.7.5, and the project is not marked changed.
4. File > Close Project. Nothing is asked. The project file still says 1.0.7.3.

**Expected behavior**
The project marked changed after an increment, so that Close Project asks to save it, or the new number written to the project file.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Also on BETA 1007. The same for a package, and for the `Build` part. The version the Package Publishing pane shows stays at the old number too, and no `[COMPILER] Project settings updated` line is printed.

Severity: high. The increments are lost without a word, and two builds, or two published packages, can carry the same version.

<!-- Reproducer: bugs/build-autoincrement-not-saved/ (mode lane: asserted by `ide-test.bat --only "^building$"` (test/ide/building.test.mjs), the test "Auto-Increment raises the version in the IDE only: the project is not marked changed, its file keeps the old number, and Close Project asks nothing", which passes on BETA 1010 and on BETA 1007; the fixture is test/ide/probes/building-exe, and every build writes into the lane's work folder). No project and no zip. A page of the Building chapter, docs/IDE/Building/ (Build-Output.md, where it describes the version a build carries; the chapter is being written), will carry a WARNING for it; when a fixed build is released, that WARNING goes. Found 2026-10-18 in the trials for the Building pages (their fact sheet's B15). -->

---

## ${ProjectID} in the build path becomes an empty string

**Describe the bug**
In Project Settings, *Build Output Path* accepts `${ProjectID}`, but a build replaces it with an empty string, with no message. Two projects whose paths differ only by it write the same file. It was observed in an IDE started with an `APPDATA` of its own, reading the console and the folder written.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a saved Standard EXE project named `BuildProbeExe`, which has a Project ID.
2. Set *Build Output Path* to `${SourcePath}\Build\${ProjectID}_${ProjectName}.${FileExtension}`.
3. Press Build. The console prints `[LINKER] SUCCESS created output file '<folder>\Build\_BuildProbeExe.exe'`.

**Expected behavior**
The project's ID in the file name, or the build path refused as for an unknown variable (`[COMPILER] build path contains unrecognized variable.`).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Also on BETA 1007. In the same path `${SourcePath}`, `${ProjectName}` and `${FileExtension}` are expanded, and so are `${VersionMajor}` to `${VersionRevision}` and `${Bitness}`.

Severity: medium. The file name is wrong without a word, and projects sharing the pattern overwrite each other's output.

<!-- Reproducer: bugs/build-path-projectid-empty/ (mode lane: asserted by `ide-test.bat --only "^building$"` (test/ide/building.test.mjs), the test "${ProjectID} in Build Output Path becomes an empty string", which passes on BETA 1010 and on BETA 1007; the control "control: ${SourcePath}, ${ProjectName} and ${FileExtension} in the same Build Output Path are expanded" passes too; the build writes into the lane's work folder). No project and no zip. A page of the Building chapter, docs/IDE/Building/ (Build-Output.md, under the build path's variables; the chapter is being written), will carry a WARNING for it; when a fixed build is released, that WARNING goes. Found 2026-10-18 in the trials for the Building pages (their fact sheet's B14). -->

---

## Save in the build's "You must first save the project" box writes no project file

**Describe the bug**
Build, or Clean, on a project that was never saved shows *You must first save the project. Save now?*. **Save** shows the Save As dialog and takes the path chosen, but writes no `.twinproj`, and builds nothing. Nothing says so. The project stays marked changed. It was observed in an IDE started with an `APPDATA` of its own, answering the Save As dialog in the page and reading the folder chosen, the console and the IDE's state.

**To Reproduce**
Steps to reproduce the behavior:
1. Start the IDE with no project, choose *Standard EXE*, **Open**, then **Continue**.
2. Press Build. The box reads *You must first save the project. Save now?* (**Save** / **Cancel**). Choose **Save**, and pick `MyNewProject.twinproj` in an empty folder.
3. No file is written, and the console prints nothing.
4. File > Close Project asks *You've made changes to this project. Save now?*

**Expected behavior**
The project saved to the file chosen.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Also on BETA 1007. Ctrl+S then writes the file, to the path chosen in step 2 (`[PROJECT] twinBASIC project saving to disk [DONE]`). A second Build, without Ctrl+S, builds into a `Build` folder beside the path chosen, and still writes no project file. That **Save** does not go on to build is a separate matter.

Severity: low. Nothing is lost while the IDE runs, but the box reads as if it saved.

<!-- Reproducer: bugs/build-save-box-writes-nothing/ (mode lane: asserted by `ide-test.bat --only "^building$"` (test/ide/building.test.mjs), the test "Save in the build's 'You must first save the project' box takes the path but writes no project file and builds nothing, and Close Project then asks to save", which passes on BETA 1010 and on BETA 1007; the control "control: Ctrl+S then writes the project file" passes too; the Save As dialog is answered in the page with a file in the lane's work folder). No project and no zip. A page of the Building chapter, docs/IDE/Building/ (Build-and-Clean.md, where it describes a project that was never saved; the chapter is being written), will carry a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-18 in the trials for the Building pages (their fact sheet's B11). -->

---

## Delete It And Continue in Clean's box builds a new DLL instead of deleting the old one

**Describe the bug**
When the previous DLL of an ActiveX project cannot be deregistered, Clean shows the box Build shows, *Build failed: unable to unregister the previous DLL. Continue anyway?*, and its **Delete It And Continue** builds a new DLL rather than deleting the old one. It was observed with *Register DLLs to HKLM*, in an IDE started with an `APPDATA` of its own and not elevated, reading the console and the build folder.

**To Reproduce**
Steps to reproduce the behavior:
1. In an IDE that is not elevated, open an ActiveX DLL project with *Register DLLs to HKLM* set to YES (answer **Continue Anyway** to the warning).
2. Press Build. The DLL is written, and `[REGISTER] type-library registration FAILED.   DllRegisterServer() returned -2147220992` is printed.
3. Press Clean. The console prints `[UNREGISTER] type-library deregistration FAILED.   DllUnregisterServer() returned -2147220991` and `[BUILD] failed`, and the box above shows. Choose **Delete It And Continue**.
4. The console prints `[BUILD] Starting...` and `[LINKER] SUCCESS created output file '...\BuildProbeAx_win32.dll'`. The DLL is written again, and no `[BUILD-CLEAN]` line is printed.

**Expected behavior**
At Clean, the DLL deleted, as the button says.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Also on BETA 1007. At Build, the same box's **Delete It And Continue** builds the DLL again, which is what it is there for. Clean of an ActiveX DLL registered in HKCU deregisters and deletes it.

Severity: low. The DLL is replaced, not removed; nothing is lost.

<!-- Reproducer: bugs/clean-hklm-delete-builds/ (mode lane: asserted by `ide-test.bat --only "^building-hklm$"` (test/ide/building-hklm.test.mjs), the test "Clean shows the same box, and its Delete It And Continue builds a new DLL instead of deleting the old one", which passes on BETA 1010 and on BETA 1007; the controls "control: at Build, Delete It And Continue in the box of a failed deregistration builds the DLL again" and "control: an ActiveX DLL registered in HKCU opens with no box, and Clean after its build deletes it and its registration" pass too; the IDE is not elevated, so nothing is written to HKLM, and the lane checks that no key of the fixture's is left in HKCU or HKLM). No project and no zip. A page of the Building chapter, docs/IDE/Building/ (ActiveX-Registration.md, under Register DLLs to HKLM; the chapter is being written), will carry a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-18 in the trials for the Building pages (their fact sheet's B12). -->

---

## The HKLM warning shows twice as a project opens, and for a Standard EXE too

**Describe the bug**
In an IDE that is not elevated, a project with *Register DLLs to HKLM* set to YES shows the warning *This project registers itself to the HKEY_LOCAL_MACHINE registry hive which requires ADMIN permissions ...* twice as it opens, and its load waits for each **Continue Anyway**. A Standard EXE with the setting shows it too, though it registers nothing. It was observed in an IDE started with an `APPDATA` of its own, counting the boxes as they showed.

**To Reproduce**
Steps to reproduce the behavior:
1. In an IDE that is not elevated, open an ActiveX DLL project with *Register DLLs to HKLM* set to YES.
2. The warning shows; choose **Continue Anyway**. The same warning shows again; choose **Continue Anyway** again.
3. Open a Standard EXE project with the same setting set to YES. The warning shows, twice.

**Expected behavior**
The warning once per open, and only for an ActiveX DLL or ActiveX Control.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Also on BETA 1007, twice. An ActiveX DLL registered in HKCU opens with no box.

Severity: cosmetic. An extra box, and a warning that does not apply.

<!-- Reproducer: bugs/hklm-warning-twice/ (mode lane: asserted by `ide-test.bat --only "^building-hklm$"` (test/ide/building-hklm.test.mjs), the tests "an ActiveX DLL with Register DLLs to HKLM shows the HKLM warning twice as it opens" and "a Standard EXE with Register DLLs to HKLM shows the HKLM warning too, twice as it opens", which pass on BETA 1010 and on BETA 1007; the control "control: an ActiveX DLL registered in HKCU opens with no box, and Clean after its build deletes it and its registration" passes too). No project and no zip. A page of the Building chapter, docs/IDE/Building/ (ActiveX-Registration.md, under Register DLLs to HKLM; the chapter is being written), will carry a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-18 in the trials for the Building pages (their fact sheet's B13). -->

---

## A box opened during an LLVM build is closed in place of the Compiling... box, which stays and blocks the IDE

**Describe the bug**
An LLVM build shows a modal *Compiling...* box. At the build's end the IDE closes the box on top, whichever it is. When another box has opened over *Compiling...*, that box is closed instead, and a *Compiling...* box stays at 0.0% with no button: the IDE takes no input until its page is reloaded. It was observed in an IDE started with an `APPDATA` of its own, with the other box opened from the page at the build's first progress event, since a person cannot open one while *Compiling...* covers the IDE.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a Standard EXE project with `+llvm` in Compiler Options (BUILD), with a licence that allows LLVM.
2. Press Build. The *Compiling...* box shows.
3. While it shows, open another box (in the IDE page: `showModalNotification("A second box")`).
4. The build ends (`[LINKER] SUCCESS created output file ...`). The other box is gone, and *Compiling... 0.0%* stays, with no button.

**Expected behavior**
The *Compiling...* box closed at the build's end, and the other box left open.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Also on BETA 1007. `event_setBuildProgress` in `ide/main.js` calls `hideModalDialog()` for the end of the build (-1), which closes the top-most modal box, not the progress box; a second progress event of 0 while the other box is on top also stacks a second *Compiling...* box. It is not known whether the compiler itself opens a box during an LLVM build (as the box of a failed deregistration). An LLVM build with no other box closes its *Compiling...* box.

Severity: low. Only a box opened during the build reaches it, and the IDE must be reloaded.

<!-- Reproducer: bugs/llvm-build-box-closes-other/ (mode lane: asserted by `ide-test.bat --only "^building-llvm-box$"` (test/ide/building-llvm-box.test.mjs), the test "a box opened during an LLVM build is closed at its end in place of the Compiling... box, which stays with no button and blocks the IDE", which passes on BETA 1010 and on BETA 1007; the control "control: an LLVM build shows the Compiling... box and closes it at its end" passes too; the lane holds a lease on the LLVM cache server, and needs a licence that allows LLVM). No project and no zip. A page of the Building chapter, docs/IDE/Building/ (LLVM-in-the-IDE.md, where it describes the Compiling... box; the chapter is being written), will carry a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-18 in the trials for the Building pages (their fact sheet's B7). -->

---

## A remembered Package Publisher password containing ~ is read back wrong

**Describe the bug**
In the Package Publishing sign-in box, *Remember password on this device* stores the password in the IDE's settings with `ObfuscateString`, and the IDE reads it back at its next start with `UnobfuscateString`. Each `~` in the password comes back as a NUL character, so the pre-filled password is wrong and the sign-in fails. It was observed in an IDE started with an `APPDATA` of its own, with the IDE's own two functions saving into the page rather than the registry, and nothing sent to the server.

**To Reproduce**
Steps to reproduce the behavior:
1. In the sign-in box (Package Publishing, SIGN IN), log in with a password containing `~`, such as `pa~ss~word`, with *Remember password on this device* ticked.
2. Restart the IDE, and open SIGN IN again.
3. The password box holds `pa?ss?word`, each `?` a replacement character (U+FFFD), not `pa~ss~word`.

**Expected behavior**
The password read back as it was typed.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Also on BETA 1007. `ObfuscateString(e, t, o = 126)` in `ide/main.js` shifts each character code up to and including 126 by `t` (111) modulo 126, and `UnobfuscateString` shifts back by `126 - 111`. For `~` (126) the stored code is 111 and the result is 0. A password without `~` comes back as it was typed.

Severity: low. Signing in fails until the password is typed again; nothing is lost.

<!-- Reproducer: bugs/publisher-password-tilde/ (mode lane: asserted by `ide-test.bat --only "^building$"` (test/ide/building.test.mjs), the test "a remembered publisher password containing ~ is read back with NUL in place of each ~", which passes on BETA 1010 and on BETA 1007; the control "control: a remembered publisher password without ~ is read back as it was" passes too; the test saves with the IDE's own savePublisherInfo into a record in the page and reads back with its own loadPublisherInfo, with test values only, puts the IDE's own publisher settings back in the page, and fails on any request to the package server). No project and no zip. A page of the Building chapter, docs/IDE/Building/ (Package-Publishing.md, under the sign-in box; the chapter is being written), will carry a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-18 in the trials for the Building pages (their fact sheet's B1). -->

---

## A saved publisher name containing ' is cut short in the sign-in box

**Describe the bug**
The Package Publishing sign-in box fills its LOGIN user name from the saved publisher name by writing it into the box's HTML as `value='<name>'`, with no escaping. A name containing `'` ends the attribute early: the box shows the name up to the apostrophe, and the rest becomes a stray attribute of the input element. The saved password is written the same way. It was observed in an IDE started with an `APPDATA` of its own, with the name set in the page, and nothing sent to the server.

**To Reproduce**
Steps to reproduce the behavior:
1. Have the IDE save the publisher name `O'Brien` (log in or register with it).
2. Open Package Publishing, SIGN IN.
3. The LOGIN user name box holds `O`, and its input element has an attribute named `brien'`.

**Expected behavior**
The box holding `O'Brien`.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Also on BETA 1007. `showSignInForm` in `ide/main.js` builds the form from a template string with `value='${packagePublisherName}'`, which becomes `innerHTML`. A name with no apostrophe is shown whole.

Severity: low. The name has to be typed again.

<!-- Reproducer: bugs/publisher-name-apostrophe/ (mode lane: asserted by `ide-test.bat --only "^building$"` (test/ide/building.test.mjs), the test "a saved publisher name containing ' is cut at the apostrophe in the sign-in box", which passes on BETA 1010 and on BETA 1007; the control "control: a saved publisher name with no apostrophe is shown whole in the sign-in box" passes too; test values only, set in the page; the box is closed with Cancel, and the test fails on any request to the package server). No project and no zip. A page of the Building chapter, docs/IDE/Building/ (Package-Publishing.md, under the sign-in box; the chapter is being written), will carry a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-18 in the trials for the Building pages (their fact sheet's B4). -->

---

## OK in the box of a failed publish raises a page TypeError

**Describe the bug**
When the package server answers a publish with an HTTPS status it has no message for, the IDE shows *[PUBLISH] FAILED. Server returned HTTPS code <n>*. Its **OK** closes the box, and the page then raises `Uncaught TypeError: t is not a function`. It was observed in an IDE started with an `APPDATA` of its own, with the server call replaced in the page by one that fails with 500, so that nothing reached the server.

**To Reproduce**
Steps to reproduce the behavior:
1. Open a package project, sign in, and PUBLISH THIS PACKAGE, at a time when the server answers with an error status (500, say).
2. The box reads *[PUBLISH] FAILED. Server returned HTTPS code 500*. Choose **OK**.
3. The box closes, and the page raises the error above.

**Expected behavior**
The box closed with no error.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Also on BETA 1007. `packagePublisherPublishNow` in `ide/main.js` calls `showModalNotification("[PUBLISH] FAILED.  Server returned HTTPS code " + e, true)`, passing `true` where `showModalNotification` takes a function to call after OK. The other `[PUBLISH] FAILED` boxes pass none, and their OK raises no error (checked with 551, *Package already uploaded with this exact version number.*).

Severity: cosmetic. An error in the page after the box has closed.

<!-- Reproducer: bugs/publish-failure-ok-typeerror/ (mode lane: asserted by `ide-test.bat --only "^building$"` (test/ide/building.test.mjs), the test "OK in the box of a publish that fails with an HTTPS code raises a page TypeError", which passes on BETA 1010 and on BETA 1007; the control "control: OK in the box of a publish refused as a version already uploaded raises no error" passes too; the test calls the IDE's own packagePublisherPublishNow with serverHttpsGetUtf8 replaced in the page, never presses Continue, and fails on any request to the package server). No project and no zip. A page of the Building chapter, docs/IDE/Building/ (Package-Publishing.md, under PUBLISH THIS PACKAGE; the chapter is being written), will carry a NOTE for it; when a fixed build is released, that NOTE goes. Found 2026-10-18 in the trials for the Building pages (their fact sheet's B2). -->


---

## `Dim x As Any` compiles, though `As Any` is only for the parameter of a `Declare`

**Describe the bug**
`As Any` stands for "an argument of any type" and means something only as a parameter of a `Declare` statement. twinBASIC refuses it in most other places with TB5079, *Unrecognized datatype symbol 'Any'*: as a Sub's or Function's parameter, as a Function's return type, as a field of a `Type`, in `Dim a(1) As Any` and in `ReDim b(1) As Any`. It accepts it, with no diagnostic, on a single variable: `Dim x As Any` and `Static s As Any` in a procedure, `Private m As Any` at module level and `Public Item As Any` as a field of a class. The variable cannot be used: `x = 5` is TB5028, and reading it fails when the program runs or is built. It was observed in the IDE's diagnostics and in runs.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `dim-as-any.twinproj` (attached as `dim-as-any.zip`). Its module `AsAnyTests`, below, has one declaration with `As Any` on each line that ends in a `' CASE <Name>: <expected>` comment: the diagnostic code the line must get, `error` for any error, or `none`.
2. Compile it. These get TB5079: a `Type` field, a Function's return type, a Sub's `ByRef` and `ByVal` parameters, `Dim a(1) As Any` and `ReDim b(1) As Any`. The `Declare` with `ByRef Destination As Any` and the control `Dim c As Long` get none, as they should. These four also get none, and are the defect:
   ```
   Public Item As Any            ' a field of a class
   Private ModuleLevel As Any    ' at module level
   Dim x As Any                  ' in a procedure
   Static s As Any               ' in a procedure
   ```
3. To see what such a variable is, run `Dim x As Any: Debug.Print TypeName(x)` in a project of its own. In a built exe it raises error 458, *Variable uses an Automation type not supported in Visual Basic*, and an IDE run of it ends with no output. `x = 5` (or `x = "text"`) is TB5028, *Unable to convert type 'Integer' to type 'Any'*. `Dim v As Variant: v = x` compiles clean and the build then fails with `compilation (codegen) error detected in 'Startup.Mainrootmain'`. A bare `Dim x As Any` with no other use compiles, builds and runs, and `VarPtr(x)` is not 0.
```vb
' Regression tests for the report, as compile cases: each line that ends in a
' comment  ' CASE <Name>: <expected>  must give that diagnostic on that line (a
' code, "error" for any error, or "none"). tbrun --tests checks them.
' As Any is meant only for the parameter of a Declare statement, where it lets
' the caller pass an argument of any type. Anywhere else it names no type, so
' every line below that is not a Declare parameter or the Long control is a
' compile error.

Class HoldsAny
    Public Item As Any  ' CASE ClassField_AsAny: error
End Class

Module AsAnyTests

    Private Declare PtrSafe Sub CopyMemory Lib "kernel32" Alias "RtlMoveMemory" (ByRef Destination As Any, ByRef Source As Any, ByVal Length As LongPtr)  ' CASE Declare_ParameterAsAny: none

    Private Type HasAny
        Value As Any  ' CASE UdtField_AsAny: error
    End Type

    Private ModuleLevel As Any  ' CASE ModuleVariable_AsAny: error

    Private Function ReturnsAny() As Any  ' CASE FunctionReturn_AsAny: error
    End Function

    Private Sub TakesAny(ByRef p As Any)  ' CASE SubParameter_AsAny: error
    End Sub

    Private Sub TakesAnyByVal(ByVal p As Any)  ' CASE SubParameterByVal_AsAny: error
    End Sub

    Private Sub Declarations()
        Dim x As Any  ' CASE LocalDim_AsAny: error
        Static s As Any  ' CASE LocalStatic_AsAny: error
        Dim a(1) As Any  ' CASE LocalArrayDim_AsAny: error
        ReDim b(1) As Any  ' CASE ReDim_AsAny: error
        Dim c As Long  ' CASE Control_DimAsLong: none
    End Sub

End Module
```

**Expected behavior**
A compile error on each of the four, TB5079 as on the neighbouring declarations: `As Any` names no type, and a variable of it can be neither assigned nor read. The `Declare` parameter keeps compiling. VB6 refuses all of them.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
BETA 1007 gives the same results: the four fail, the eight others pass. The run-time results in step 3 were checked on BETA 1010 only.

VB6 does not accept `As Any` outside a `Declare` parameter. Its command-line build stops at the declaration with a compile error: `Private ModuleLevel As Any` and a `Type` field give *Expected: New or type name*, a Function's return type and a Sub's parameter give *Expected: type name*, and `Dim x As Any`, `Static s As Any` and `Dim a(1) As Any` in a procedure give *Syntax error*. The `Declare` with `ByRef ... As Any` builds. The reproducer's `vb6/` project is that control; the other declarations were each tried in it alone.

Severity: low. Few programs write it, and a variable that cannot be used is found at the first use, but a declaration that compiles tells the author the type exists, and the failure comes late: a codegen error at build time, or error 458 in a run.

<!-- Reproducer: bugs/dim-as-any/ (mode test: `tbrun --tests` judges the compile cases; expect lists the eight PASS and four FAIL lines); verify reproduces on BETA 1010 and on BETA 1007; VB6 side in vb6/ (its Module1.bas lists VB6's error text for each declaration). The run-time results of step 3 come from a scratch tree that is not kept (BETA 1010, tbrun with and without --exe). docs/Reference/Data-Types.md carries the callout for it (the paragraph that says Any is not a data type, and where As Any is allowed); when a fixed build is released, the callout goes. Found 2026-10-18 while writing the Data Types page; owner-approved. -->

---

## A `Date` outside January 1, 100 to December 31, 9999 is accepted with no error

**Describe the bug**
A `Date` holds a count of days from -657434 (January 1, 100) to 2958465 (December 31, 9999), plus the time of day. VB6 raises error 6, *Overflow*, for every way of making one outside that range. twinBASIC raises nothing: the `Date` holds the out-of-range number, and `CStr`, `Format` and `Year` of it then raise error 5, *Invalid procedure call or argument*. It happens with an assignment from a `Long` or a `Double`, with `CDate`, and with arithmetic on the two ends of the range. It was observed in IDE runs and in built exes, in a 32-bit and a 64-bit build.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `date-out-of-range-no-error.twinproj` (attached as `date-out-of-range-no-error.zip`). Its module `DateRangeTests`, below, has one `[TestCase]` for each way of making a `Date` out of range, asserting the error 6; the last three are controls.
2. Run the test cases. The first six fail, with `Err.Number` 0; the three controls pass.
3. To see what the `Date` is, run `Dim d As Date: d = 2958466: Debug.Print CDbl(d)` in a project of its own. It prints 2958466, and `Debug.Print CStr(d)` raises error 5.
```vb
[TestFixture]
Module DateRangeTests

    [TestCase]
    Public Sub AssignLongPastLargest_Raises6()
        Dim d As Date
        Dim n As Long = 2958466
        On Error Resume Next
        d = n
        Assert.Strict.AreEqual 6, Err.Number               ' VB6: 6
    End Sub

    [TestCase]
    Public Sub CDatePastLargest_Raises6()
        Dim d As Date
        Dim n As Long = 2958466
        On Error Resume Next
        d = CDate(n)
        Assert.Strict.AreEqual 6, Err.Number               ' VB6: 6
    End Sub

    [TestCase]
    Public Sub CDateBeforeSmallest_Raises6()
        Dim d As Date
        Dim n As Long = -657435
        On Error Resume Next
        d = CDate(n)
        Assert.Strict.AreEqual 6, Err.Number               ' VB6: 6
    End Sub

    [TestCase]
    Public Sub AddOneDayToLargest_Raises6()
        Dim d As Date
        Dim last As Date = #12/31/9999#
        On Error Resume Next
        d = last + 1
        Assert.Strict.AreEqual 6, Err.Number               ' VB6: 6
    End Sub

    [TestCase]
    Public Sub SubtractOneDayFromSmallest_Raises6()
        Dim d As Date
        Dim first As Date = #1/1/100#
        On Error Resume Next
        d = first - 1
        Assert.Strict.AreEqual 6, Err.Number               ' VB6: 6
    End Sub

    [TestCase]
    Public Sub AssignHugeDouble_Raises6()
        Dim d As Date
        Dim x As Double = 1E+300
        On Error Resume Next
        d = x
        Assert.Strict.AreEqual 6, Err.Number               ' VB6: 6
    End Sub

    [TestCase]
    Public Sub AssignLargest_Accepted()
        Dim d As Date
        Dim n As Long = 2958465
        On Error Resume Next
        d = n
        Assert.Strict.AreEqual 0, Err.Number
        Assert.Strict.AreEqual 2958465#, CDbl(d)
    End Sub

    [TestCase]
    Public Sub AssignSmallest_Accepted()
        Dim d As Date
        Dim n As Long = -657434
        On Error Resume Next
        d = n
        Assert.Strict.AreEqual 0, Err.Number
        Assert.Strict.AreEqual -657434#, CDbl(d)
    End Sub

    [TestCase]
    Public Sub OutOfRangeInteger_Raises6()
        Dim i As Integer
        Dim n As Long = 40000
        On Error Resume Next
        i = n
        Assert.Strict.AreEqual 6, Err.Number
    End Sub

End Module
```

**Expected behavior**
Error 6, *Overflow*, at each of the six, as in VB6 and in 64-bit VBA, and the `Date` keeps its old value. The two ends of the range stay accepted. A `Date` then always holds a value that `CStr`, `Format` and `Year` can read.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
BETA 1007 gives the same results, and so do IDE runs and built exes, 32-bit and 64-bit. `DateAdd("d", 1, #12/31/9999#)` and `DateSerial(10000, 1, 1)` raise error 5, and `CDate("12/31/10000")` raises error 13, so those do not accept the value. VB6 6.0 raises error 6 for each of the six cases, and builds the controls (the reproducer's `vb6/` project prints them, attached as `date-out-of-range-no-error-vb6.zip`). So does 64-bit VBA, VBA 7.1 (VBE7.DLL 7.01.1158) in 64-bit Microsoft 365 Access.

Severity: medium. An out-of-range date is stored silently, and the failure comes later, where the value is formatted or split into parts, or never, where the number is only compared or saved.

<!-- Reproducer: bugs/date-out-of-range-no-error/ (mode test: `tbrun --tests` runs the nine cases; expect lists the six FAIL and three PASS lines); verify reproduces on BETA 1010 and on BETA 1007; VB6 side in vb6/ (Module1.bas, error 6 for the six). docs/Reference/Data-Types/Date.md carries the callout for it (the WARNING in Arithmetic, after the range paragraph), and so does docs/Reference/Default/VBA/Conversion/CDate.md (the WARNING above Common Errors, and a NOTE in that section generated from errors/VBA.Conversion.yml, row `bug: date-out-of-range-no-error`); when a fixed build is released, the callouts go. Found 2026-10-18 while writing the Data Types pages; owner-approved. -->

---

## `CLngLng(2^63)` returns the smallest LongLong, with no error

**Describe the bug**
2^63 (9223372036854775808) is one past the largest `LongLong`, and converting it must raise error 6, *Overflow*, as `CLngLng(1E+19)` does and as a `Double` variable holding 2^63 does. When the `Double` is a constant expression, twinBASIC converts it to -9223372036854775808, the smallest `LongLong`, and raises nothing: `CLngLng(2 ^ 63)`, `CLngLng(9223372036854775808#)` and `CLngLng(CSng(2 ^ 63))`. An unsuffixed whole-number literal beyond the `Long` range is a `Double`, so `q = 9223372036854775807` (the largest `LongLong`, written without the `^` suffix) is the same constant and gives the same wrong result. It was observed in IDE runs and in built exes, in a 32-bit and a 64-bit build.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `clnglng-2-to-63-no-overflow.twinproj` (attached as `clnglng-2-to-63-no-overflow.zip`). Its module `LongLongOverflowTests`, below, has one `[TestCase]` for each constant that gives the wrong result, asserting the error 6, and four controls.
2. Run the test cases. The first four fail, with `Err.Number` 0; the four controls pass: a `Double` variable holding 2^63, the constant `1E+19`, the constant `2 ^ 63 - 1024` (the largest `Double` below 2^63, which fits) and `-(2 ^ 63)` (the smallest `LongLong`, which fits).
```vb
[TestFixture]
Module LongLongOverflowTests

    [TestCase]
    Public Sub CLngLng_ConstantTwoToThe63_Raises6()
        Dim q As LongLong
        On Error Resume Next
        q = CLngLng(2 ^ 63)
        Assert.Strict.AreEqual 6, Err.Number
    End Sub

    [TestCase]
    Public Sub CLngLng_DoubleLiteral2To63_Raises6()
        Dim q As LongLong
        On Error Resume Next
        q = CLngLng(9223372036854775808#)
        Assert.Strict.AreEqual 6, Err.Number
    End Sub

    [TestCase]
    Public Sub Assign_UnsuffixedLargestLongLongLiteral_Raises6()
        Dim q As LongLong
        On Error Resume Next
        q = 9223372036854775807
        Assert.Strict.AreEqual 6, Err.Number
    End Sub

    [TestCase]
    Public Sub CLngLng_ConstantSingleTwoToThe63_Raises6()
        Dim q As LongLong
        On Error Resume Next
        q = CLngLng(CSng(2 ^ 63))
        Assert.Strict.AreEqual 6, Err.Number
    End Sub

    [TestCase]
    Public Sub CLngLng_VariableTwoToThe63_Raises6()
        Dim q As LongLong
        Dim x As Double = 2 ^ 63
        On Error Resume Next
        q = CLngLng(x)
        Assert.Strict.AreEqual 6, Err.Number
    End Sub

    [TestCase]
    Public Sub CLngLng_ConstantOneE19_Raises6()
        Dim q As LongLong
        On Error Resume Next
        q = CLngLng(1E+19)
        Assert.Strict.AreEqual 6, Err.Number
    End Sub

    [TestCase]
    Public Sub CLngLng_ConstantBelowTwoToThe63_Accepted()
        Dim q As LongLong
        On Error Resume Next
        q = CLngLng(2 ^ 63 - 1024)
        Assert.Strict.AreEqual 0, Err.Number
        Assert.Strict.AreEqual 9223372036854774784^, q
    End Sub

    [TestCase]
    Public Sub CLngLng_ConstantMinus2To63_Accepted()
        Dim q As LongLong
        On Error Resume Next
        q = CLngLng(-(2 ^ 63))
        Assert.Strict.AreEqual 0, Err.Number
        Assert.Strict.AreEqual -9223372036854775807^ - 1, q
    End Sub

End Module
```

**Expected behavior**
Error 6, *Overflow*, at each of the four, as for `CLngLng(1E+19)` and for the same value in a variable. VB6 has no `LongLong`; the nearest case, the first `Double` beyond the `Long` range, `CLng(2 ^ 31)`, `CLng(2147483648#)` and `n = 2147483648#`, raises error 6 there as a constant and as a variable (the reproducer's `vb6/` project prints them, attached as `clnglng-2-to-63-no-overflow-vb6.zip`). 64-bit VBA, which has `LongLong`, raises error 6 at each of the four and passes the four controls.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
BETA 1007 gives the same results, and so do IDE runs and built exes, 32-bit and 64-bit. The narrower conversions of constants are right: `CLng(2 ^ 31)`, `CLng(CSng(2 ^ 31))`, `CInt(32768#)`, `CByte(256#)` and `CLngPtr(2 ^ 63)` in a 32-bit build raise error 6. A related defect seen on the way has its own entry: *In a 32-bit build, a constant `Double` expression raises error 6 after a constant that overflows a `Long` or `LongLong`*. 64-bit VBA here is VBA 7.1 (VBE7.DLL 7.01.1158) in 64-bit Microsoft 365 Access.

Severity: medium. A silently wrong value, but only for one constant, and constants this size are rare. The unsuffixed `9223372036854775807` is the one a program is likely to write.

<!-- Reproducer: bugs/clnglng-2-to-63-no-overflow/ (mode test: `tbrun --tests` runs the eight cases; expect lists the four FAIL and four PASS lines); verify reproduces on BETA 1010 and on BETA 1007; VB6 side in vb6/ (Module1.bas, the CLng of 2^31). docs/Reference/Data-Types/LongLong.md carries the callout for it (the WARNING under Conversions), and so does docs/Reference/Default/VBA/Conversion/CLngLng.md (the WARNING above Common Errors); when a fixed build is released, the callouts go. Found 2026-10-18 while writing the Data Types pages; owner-approved. -->

---

## `Set` to a class or interface the object does not support raises -2147467262, where VB6 raises 13

**Describe the bug**
Assigning an object with `Set` to a variable of a class or interface that the object does not support fails at run time. VB6 raises error 13, *Type mismatch*. twinBASIC raises -2147467262, the `HRESULT` `E_NOINTERFACE` (*No such interface supported*), so a handler that tests for 13 does not recognise it. It happens for a twinBASIC class, an interface, a COM object (`Scripting.Dictionary` to `Collection`) and a `Variant` that holds the object. It was observed in IDE runs and in built exes, in a 32-bit and a 64-bit build.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `set-unsupported-class-error-number.twinproj` (attached as `set-unsupported-class-error-number.zip`). Its module `SetToUnsupportedTypeTests`, below, has one `[TestCase]` for each kind of source, asserting the error 13, and a control.
2. Run the test cases. The first four fail, with `Err.Number` -2147467262; the control, a `Set` to the object's own class, passes.
```vb
Class ClsA
    Public X As Long
End Class

Class ClsB
    Public Y As Long
End Class

Interface IFoo
    Sub Hello()
End Interface

[TestFixture]
Module SetToUnsupportedTypeTests

    [TestCase]
    Public Sub SetToOtherClass_Raises13()
        Dim o As Object = New ClsA
        Dim b As ClsB
        On Error Resume Next
        Set b = o
        Assert.Strict.AreEqual 13, Err.Number              ' VB6: 13
    End Sub

    [TestCase]
    Public Sub SetToInterfaceTheClassLacks_Raises13()
        Dim o As Object = New ClsA
        Dim f As IFoo
        On Error Resume Next
        Set f = o
        Assert.Strict.AreEqual 13, Err.Number              ' VB6: 13
    End Sub

    [TestCase]
    Public Sub SetDictionaryToCollection_Raises13()
        Dim o As Object = CreateObject("Scripting.Dictionary")
        Dim c As Collection
        On Error Resume Next
        Set c = o
        Assert.Strict.AreEqual 13, Err.Number              ' VB6: 13
    End Sub

    [TestCase]
    Public Sub SetFromVariantHoldingOtherClass_Raises13()
        Dim v As Variant
        Dim b As ClsB
        Set v = New ClsA
        On Error Resume Next
        Set b = v
        Assert.Strict.AreEqual 13, Err.Number              ' VB6: 13
    End Sub

    [TestCase]
    Public Sub SetToOwnClass_RaisesNothing()
        Dim o As Object = New ClsB
        Dim b As ClsB
        On Error Resume Next
        Set b = o
        Assert.Strict.AreEqual 0, Err.Number
    End Sub

End Module
```

**Expected behavior**
Error 13, *Type mismatch*, as in VB6, so that code ported from VB6 which handles 13 keeps working. The reproducer's `vb6/` project builds the same four assignments and prints error 13 for each (attached as `set-unsupported-class-error-number-vb6.zip`).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
BETA 1007 gives the same results, and so do IDE runs and built exes, 32-bit and 64-bit. `TypeOf o Is ClsB` is False for these objects and can be tested first. Severity: low. An error is raised, and only the number differs.

<!-- Reproducer: bugs/set-unsupported-class-error-number/ (mode test: `tbrun --tests` runs the five cases; expect lists the four FAIL and one PASS line); verify reproduces on BETA 1010 and on BETA 1007; VB6 side in vb6/ (Module1.bas, ClsA, ClsB and IFoo). docs/Reference/Data-Types/Object.md carries the callout for it (the NOTE under Assigning); when a fixed build is released, the callout goes. Found 2026-10-18 while writing the Data Types pages; owner-approved. -->

---

## `Len` and `LenB` accept an array and return the size of its descriptor

**Describe the bug**
`Len` and `LenB` take a string or a variable of a simple or user-defined type. VB6 refuses an array as the argument, when the program is compiled (*Variable required - can't assign to this expression*). twinBASIC accepts it, and returns a number that is not the size of the array: in a 32-bit build 40 for a fixed-size one-dimensional array of any element type and length (`Dim a(9) As Byte`, `Dim a(3) As Long` and `Dim a(0) As Byte` all give 40), 48 for two dimensions, and 4 for a dynamic array (the size of the reference); in a 64-bit build 48, 56 and 8. A program that writes `LenB(Buffer)` for a `Byte` buffer, expecting its length in bytes, gets a number that never changes with the array. It was observed in IDE runs and in built exes.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `lenb-of-array-accepted.twinproj` (attached as `lenb-of-array-accepted.zip`). Its module `LenArrayTests`, below, has one declaration with an array argument on each line that ends in a `' CASE <Name>: <expected>` comment: the diagnostic code the line must get, `error` for any error, or `none`.
2. Run the cases, with `tbrun --tests` or by compiling the project. The five lines with an array argument get no diagnostic, and are the defect; the two controls, an element and a `Long` variable, get none, as they should.
3. To see the numbers, run `Dim a(9) As Byte: Debug.Print LenB(a)` in a project of its own. It prints 40.
```vb
' CASE <Name>: <expected> comments, as above.
Module LenArrayTests

    Private Sub Cases()
        Dim fixedBytes(9) As Byte
        Dim fixedLongs(3) As Long
        Dim dynamicBytes() As Byte
        Dim n As Long
        ReDim dynamicBytes(4)

        n = LenB(fixedBytes)  ' CASE LenB_FixedByteArray: error
        n = LenB(fixedLongs)  ' CASE LenB_FixedLongArray: error
        n = LenB(dynamicBytes)  ' CASE LenB_DynamicByteArray: error
        n = Len(fixedBytes)  ' CASE Len_FixedByteArray: error
        n = Len(dynamicBytes)  ' CASE Len_DynamicByteArray: error

        n = LenB(fixedBytes(0))  ' CASE LenB_ByteElement: none
        n = LenB(n)  ' CASE LenB_LongVariable: none
    End Sub

End Module
```

**Expected behavior**
A compile error on each of the five, as in VB6: the array is not a valid argument. The two controls keep compiling. VB6 gives the compile error *Variable required - can't assign to this expression* for `LenB` of a fixed `Byte` array, a fixed `Long` array and a dynamic `Byte` array, and for `Len` of a fixed and of a dynamic `Byte` array (each was tried in the reproducer's `vb6/` project alone, attached as `lenb-of-array-accepted-vb6.zip`; the control, `LenB(a(0))`, builds and gives 1).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
BETA 1007 gives the same results. Severity: low. Few programs write it, but the number looks plausible for a small array, and the author finds out only when the buffer is larger.

<!-- Reproducer: bugs/lenb-of-array-accepted/ (mode test: compile cases; expect lists the five FAIL and two PASS lines); verify reproduces on BETA 1010 and on BETA 1007; VB6 side in vb6/ (Module1.bas lists VB6's error for each line). The numbers 40, 48, 4 (32-bit) and 48, 56, 8 (64-bit) come from a scratch run that is not kept. docs/Reference/Default/VBA/Strings/Len.md carries the callout for it; when a fixed build is released, the callout goes. Found 2026-10-18 while writing the Data Types pages; owner-approved. -->

---

## A 64-bit build prints infinity and NaN as `inf` and `nan`, and `Format` adds the picture's decimals

**Describe the bug**
A `Double` or `Single` that holds infinity or NaN prints in VB6 as `1.#INF`, `-1.#INF`, `1.#QNAN` and `-1.#IND`, and `Format(x, "0.00")` gives `1.#INF` or `1.#R`. A 32-bit twinBASIC build prints exactly those. A 64-bit build prints the C runtime's text: `inf`, `-inf`, `nan` and `-nan(ind)`, and `Format(x, "0.00")` gives `inf.00` and `nan.00`. `CStr`, `Str`, concatenation and `Debug.Print` all give the same text. Arithmetic raises an error rather than make these values, so they come from memory, a COM component or a file; the reproducer copies their bytes into a variable. It was observed in IDE runs and in built exes.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `infinity-text-64-bit.twinproj` (attached as `infinity-text-64-bit.zip`). Its module `InfinityTextTests`, below, has one `[TestCase]` for each text, asserting what VB6 gives, and a control.
2. Run the test cases as a 64-bit build (`tbrun --tests --arch win64`). The first eight fail, with the 64-bit text as `Actual`; the control passes. As a 32-bit build all nine pass.
```vb
[TestFixture]
Module InfinityTextTests

    Private Declare PtrSafe Sub CopyMemory Lib "kernel32" Alias "RtlMoveMemory" (ByRef Destination As Any, ByRef Source As Any, ByVal Length As LongPtr)

    Private Function DoubleFromBits(ByVal Bits As LongLong) As Double
        Dim result As Double
        CopyMemory result, Bits, 8
        Return result
    End Function

    Private Function SingleFromBits(ByVal Bits As Long) As Single
        Dim result As Single
        CopyMemory result, Bits, 4
        Return result
    End Function

    [TestCase]
    Public Sub CStrOfInfinity_Is1HashINF()
        Assert.Strict.AreEqual "1.#INF", CStr(DoubleFromBits(&H7FF0000000000000^))
    End Sub

    [TestCase]
    Public Sub CStrOfNegativeInfinity_IsMinus1HashINF()
        Assert.Strict.AreEqual "-1.#INF", CStr(DoubleFromBits(&HFFF0000000000000^))
    End Sub

    [TestCase]
    Public Sub CStrOfNaN_Is1HashQNAN()
        Assert.Strict.AreEqual "1.#QNAN", CStr(DoubleFromBits(&H7FF8000000000000^))
    End Sub

    [TestCase]
    Public Sub CStrOfIndeterminate_IsMinus1HashIND()
        Assert.Strict.AreEqual "-1.#IND", CStr(DoubleFromBits(&HFFF8000000000000^))
    End Sub

    [TestCase]
    Public Sub ConcatenatedInfinity_Is1HashINF()
        Assert.Strict.AreEqual "x=1.#INF", "x=" & DoubleFromBits(&H7FF0000000000000^)
    End Sub

    [TestCase]
    Public Sub FormatOfInfinity_Is1HashINF()
        Assert.Strict.AreEqual "1.#INF", Format(DoubleFromBits(&H7FF0000000000000^), "0.00")
    End Sub

    [TestCase]
    Public Sub FormatOfNaNWithPicture_Is1HashR()
        Assert.Strict.AreEqual "1.#R", Format(DoubleFromBits(&H7FF8000000000000^), "0.00")
    End Sub

    [TestCase]
    Public Sub CStrOfSingleInfinity_Is1HashINF()
        Assert.Strict.AreEqual "1.#INF", CStr(SingleFromBits(&H7F800000))
    End Sub

    [TestCase]
    Public Sub CStrOfOrdinaryDouble_IsUnchanged()
        Assert.Strict.AreEqual "1.5", CStr(1.5)
    End Sub

End Module
```

**Expected behavior**
The same text in a 64-bit build as in a 32-bit one and in VB6: `1.#INF`, `-1.#INF`, `1.#QNAN`, `-1.#IND`, and `1.#INF` or `1.#R` from `Format` with a picture. The reproducer's `vb6/` project prints them (attached as `infinity-text-64-bit-vb6.zip`).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
BETA 1007 gives the same results. The reproducer's `repro.json` names the 64-bit build (`"arch": "win64"`). Severity: low. A program meets these values rarely, but one that tests or parses the text, or shows `Format(x, "0.00")` of one, behaves differently in the two builds.

<!-- Reproducer: bugs/infinity-text-64-bit/ (mode test, arch win64: `tbrun --tests --arch win64` runs the nine cases; expect lists the eight FAIL and one PASS line); verify reproduces on BETA 1010 and on BETA 1007; VB6 side in vb6/ (Module1.bas). docs/Reference/Data-Types/Double.md carries the callout for it (the NOTE after the paragraph on infinity and NaN); when a fixed build is released, the callout goes. Found 2026-10-18 while writing the Data Types pages; owner-approved. -->

---

## In a 32-bit build, a constant `Double` expression raises error 6 after a constant that overflows a `Long` or `LongLong`

**Describe the bug**
In a 32-bit build, a procedure that converts a constant `Double` that does not fit a `Long` or a `LongLong` (`l = 2 ^ 31`, `l = 3000000000#`, `CLng(2 ^ 31)`, `CLngLng(1E+19)`) then raises error 6, *Overflow*, at the next constant `Double` expression that has an operator after the `^`, although that expression is in range: `2 ^ 10 * 2`, `1.5 * 2`, `1E+10 + 1`, `2 ^ 63 - 1024`. The statement completes and stores the right value (2048 for `d = 2 ^ 10 * 2`); the error is reported late, as if a floating-point exception left pending by the first conversion were taken by the next one. It was found as `q = 2 ^ 63 - 1024` with `q As LongLong`, the largest `Double` below 2^63, which raises error 6. It was observed in IDE runs and in built exes, in a 32-bit build only.

The error depends on the statement it follows, not on the size or the type:
- The expression needs an operator after the `^`. `2 ^ 11`, `2048#`, `9E+18`, `1500 * 2` (Integer arithmetic) and `x * 2` with a `Double` variable do not raise it.
- The destination does not matter: `Long`, `Integer`, `Byte`, `Currency`, `Single`, `Double`, `Variant`, `LongLong`.
- The first statement must convert a constant that does not fit a `Long` or a `LongLong`. A `Byte` or `Integer` constant that does not fit (`b = 256`, `i = 40000`), the same overflow through a `Double` variable (`l = x`) and `Err.Raise 6` do not trigger it. `CLngLng(2 ^ 63)`, which raises no error of its own (see the `CLngLng(2^63)` entry), triggers it.
- `Err.Clear` between the two statements changes nothing. A second constant expression after the one that raised is accepted.
- A function whose body is `F = 2 ^ 63 - 1024` raises the error when it is called from a procedure that has such a conversion, before or after the call. The function then raises it for its other callers too, those with no conversion among them.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `const-double-expression-after-overflow-32bit.twinproj` (attached as `const-double-expression-after-overflow-32bit.zip`). Its module `RegressionTests`, below, has one `[TestCase]` for each of five statements that raise the error, asserting that none is raised, and six controls.
2. Run the test cases in a 32-bit build. The first five fail with `Err.Number` 6; the six controls pass: the same expressions with no overflow before them, a single power, a variable product, a `Byte` overflow and an overflow through a variable. In a 64-bit build all eleven pass.
```vb
[TestFixture]
Module RegressionTests

    ' Called by two cases: the first has the Long overflow, the second has none.
    Private Function TwoToThe63MinusK() As LongLong
        TwoToThe63MinusK = 2 ^ 63 - 1024
    End Function

    [TestCase]
    Public Sub Double_ConstantProductAfterLongOverflow_Accepted()
        Dim d As Double, l As Long, n As Long
        On Error Resume Next
        l = 2 ^ 31
        Err.Clear
        d = 2 ^ 10 * 2
        n = Err.Number
        Assert.Strict.AreEqual 0, n
        Assert.Strict.AreEqual 2048#, d
    End Sub

    [TestCase]
    Public Sub LongLong_TwoToThe63MinusKAfterLongOverflow_Accepted()
        Dim q As LongLong, l As Long, n As Long
        On Error Resume Next
        l = 2 ^ 31
        Err.Clear
        q = 2 ^ 63 - 1024
        n = Err.Number
        Assert.Strict.AreEqual 0, n
        Assert.Strict.AreEqual 9223372036854774784^, q
    End Sub

    [TestCase]
    Public Sub LongLong_TwoToThe63MinusKAfterCLngLng1E19_Accepted()
        Dim q As LongLong, n As Long
        On Error Resume Next
        q = CLngLng(1E+19)
        Err.Clear
        q = 2 ^ 63 - 1024
        n = Err.Number
        Assert.Strict.AreEqual 0, n
        Assert.Strict.AreEqual 9223372036854774784^, q
    End Sub

    [TestCase]
    Public Sub Function_ReturnsTwoToThe63MinusK_CallerHasLongOverflow_Accepted()
        Dim q As LongLong, l As Long, n As Long
        On Error Resume Next
        q = TwoToThe63MinusK()
        n = Err.Number
        l = 2 ^ 31
        Assert.Strict.AreEqual 0, n
    End Sub

    [TestCase]
    Public Sub Function_ReturnsTwoToThe63MinusK_CallerHasNoOverflow_Accepted()
        Dim q As LongLong, n As Long
        On Error Resume Next
        q = TwoToThe63MinusK()
        n = Err.Number
        Assert.Strict.AreEqual 0, n
    End Sub

    [TestCase]
    Public Sub Double_ConstantProduct_Alone_Accepted()
        Dim d As Double, n As Long
        On Error Resume Next
        d = 2 ^ 10 * 2
        n = Err.Number
        Assert.Strict.AreEqual 0, n
        Assert.Strict.AreEqual 2048#, d
    End Sub

    [TestCase]
    Public Sub LongLong_TwoToThe63MinusK_Alone_Accepted()
        Dim q As LongLong, n As Long
        On Error Resume Next
        q = 2 ^ 63 - 1024
        n = Err.Number
        Assert.Strict.AreEqual 0, n
        Assert.Strict.AreEqual 9223372036854774784^, q
    End Sub

    [TestCase]
    Public Sub Double_SinglePowerAfterLongOverflow_Accepted()
        Dim d As Double, l As Long, n As Long
        On Error Resume Next
        l = 2 ^ 31
        Err.Clear
        d = 2 ^ 11
        n = Err.Number
        Assert.Strict.AreEqual 0, n
    End Sub

    [TestCase]
    Public Sub Double_VariableProductAfterLongOverflow_Accepted()
        Dim d As Double, x As Double, l As Long, n As Long
        x = 1024
        On Error Resume Next
        l = 2 ^ 31
        Err.Clear
        d = x * 2
        n = Err.Number
        Assert.Strict.AreEqual 0, n
    End Sub

    [TestCase]
    Public Sub Double_ConstantProductAfterByteOverflow_Accepted()
        Dim d As Double, b As Byte, n As Long
        On Error Resume Next
        b = 256
        Err.Clear
        d = 2 ^ 10 * 2
        n = Err.Number
        Assert.Strict.AreEqual 0, n
    End Sub

    [TestCase]
    Public Sub Double_ConstantProductAfterRuntimeLongOverflow_Accepted()
        Dim d As Double, x As Double, l As Long, n As Long
        x = 2 ^ 31
        On Error Resume Next
        l = x
        Err.Clear
        d = 2 ^ 10 * 2
        n = Err.Number
        Assert.Strict.AreEqual 0, n
    End Sub

End Module
```

**Expected behavior**
No error at any of the five: an expression whose value fits is accepted whatever statement came before it, as in a 64-bit build. VB6 accepts `d = 2 ^ 10 * 2` and `n = 2 ^ 30 + 2 ^ 29` directly after `l = 2 ^ 31` and `l = 2147483648#`, which raise error 6 themselves (the reproducer's `vb6/` project prints them, attached as `const-double-expression-after-overflow-32bit-vb6.zip`; VB6 has no `LongLong`).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The reproducer's `repro.json` names the 32-bit build (`"arch": "win32"`). A 64-bit build, IDE run or exe, gives no error for any case.

This looks like the same cause as #2497 (fixed in BETA 1004), where a constant out of the `Long` range made the first conversion of a `Single` or `Double` variable to an integer raise error 6 in an IDE run. That case is fixed; this one remains in 32-bit builds, in IDE runs and built exes alike.

Severity: low. The error is raised and is easy to see; the statement that raises it holds a correct value. A program meets it only when a constant that overflows is followed in the same procedure by a constant `Double` expression, which is mostly code that tests overflow handling.

<!-- Reproducer: bugs/const-double-expression-after-overflow-32bit/ (mode test, arch win32: `tbrun --tests` runs the eleven cases; expect lists the five FAIL and six PASS lines); verify reproduces on BETA 1010; VB6 side in vb6/ (Module1.bas, the same two statements for a Double and a Long). docs/Reference/Data-Types/LongLong.md carries the callout for it (the NOTE under Conversions); when a fixed build is released, the callout goes. Found 2026-10-18 while writing the Data Types pages; owner-approved. -->

---

## A *compare* of 2 (`vbDatabaseCompare`) raises no error in `InStr`, `StrComp` and `Filter`, where VB6 raises error 5

**Describe the bug**
`InStr(1, "abc", "a", vbDatabaseCompare)`, `StrComp("a", "A", vbDatabaseCompare)` and `Filter(F, "a", True, vbDatabaseCompare)` raise no error, where VB6 raises error 5, *Invalid procedure call or argument*. `vbDatabaseCompare` (2) is a setting for Microsoft Access only. twinBASIC runs a textual comparison for it: `InStr(1, "abc", "A", vbDatabaseCompare)` returns 1, as `InStr(1, "abc", "A", 1033)` does, so it seems to take 2 as a locale identifier, as it takes any other value above 1. Observed in the compiler's test mode, 32-bit and 64-bit.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `database-compare-no-error.twinproj` (attached as `database-compare-no-error.zip`).
2. Run its test cases, the module below. On BETA 1010 the five controls pass (`InStr` with 0 and with 1, `InStr` with 3, and `InStrB` and `InStrRev` with 2, none of which VB6 refuses) and the four cases on a compare of 2 in `InStr`, `StrComp` and `Filter` fail with `Actual: 0`; `Err.Description` is empty.

The module is meant to be adapted as a regression test. Each case asserts VB6's result, which the attached VB6 project (`database-compare-no-error-vb6.zip`) prints: 5, *Invalid procedure call or argument*, for `InStr`, `StrComp` and `Filter` with a compare of 2, and no error for the controls, nor for `Replace` and `Split` with 2.
```vb
' Regression tests: InStr, StrComp and Filter with a compare of 2 (vbDatabaseCompare) raise error 5,
' "Invalid procedure call or argument", outside Microsoft Access. Expected results are
' VB6's (the VB6 project beside this one prints them). tbrun --tests runs each case and
' prints PASS or FAIL.
[TestFixture]
Module RegressionTests

    ' Controls: the two compare settings InStr accepts, and the neighbours VB6 lets
    ' through with a compare of 2 or 3.
    [TestCase]
    Public Sub InStr_BinaryCompare_Finds()
        Assert.Strict.AreEqual CVar(1&), InStr(1, "abc", "a", vbBinaryCompare)
    End Sub

    [TestCase]
    Public Sub InStr_TextCompare_Finds()
        Assert.Strict.AreEqual CVar(1&), InStr(1, "abc", "A", vbTextCompare)
    End Sub

    [TestCase]
    Public Sub InStr_CompareThree_NoError()
        On Error Resume Next
        Dim R As Variant
        R = InStr(1, "abc", "a", 3)
        Assert.Strict.AreEqual 0&, Err.Number
    End Sub

    [TestCase]
    Public Sub InStrB_DatabaseCompare_NoError()
        On Error Resume Next
        Dim R As Variant
        R = InStrB(1, "abc", "a", vbDatabaseCompare)
        Assert.Strict.AreEqual 0&, Err.Number
    End Sub

    [TestCase]
    Public Sub InStrRev_DatabaseCompare_NoError()
        On Error Resume Next
        Dim R As Variant
        R = InStrRev("abc", "a", -1, vbDatabaseCompare)
        Assert.Strict.AreEqual 0&, Err.Number
    End Sub

    ' The defect, in InStr, StrComp and Filter.
    [TestCase]
    Public Sub StrComp_DatabaseCompare_Raises5()
        On Error Resume Next
        Dim R As Variant
        R = StrComp("a", "A", vbDatabaseCompare)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub Filter_DatabaseCompare_Raises5()
        Dim F(0 To 1) As String
        F(0) = "abc": F(1) = "x"
        On Error Resume Next
        Dim R As Variant
        R = Filter(F, "a", True, vbDatabaseCompare)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub InStr_DatabaseCompare_Raises5()
        On Error Resume Next
        Dim R As Variant
        R = InStr(1, "abc", "a", vbDatabaseCompare)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub InStr_DatabaseCompare_ErrorDescription()
        On Error Resume Next
        Dim R As Variant
        R = InStr(1, "abc", "a", vbDatabaseCompare)
        Assert.Strict.AreEqual "Invalid procedure call or argument", Err.Description
    End Sub

End Module
```

**Expected behavior**
Error 5, *Invalid procedure call or argument*, from `InStr`, `StrComp` and `Filter` given a compare of 2, as VB6 raises.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: low. Code brought over from Access VBA that passes `vbDatabaseCompare` gets a textual comparison with no error, where VB6 stops it with error 5.

What does not reproduce it: a compare of 0 or 1; a compare of 3, which VB6 also accepts; and `InStrB`, `InStrRev`, `Replace` and `Split` with a compare of 2, which VB6 accepts too and twinBASIC accepts likewise.

<!-- Reproducer: bugs/database-compare-no-error/ (mode test: `tbrun --tests`; expect lists the five PASS and four FAIL lines, each FAIL with what BETA 1010 gives); verified on BETA 1010 by `bug_repro.mjs verify`, and the same four failures with `run --arch win64`. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints 5 for InStr, StrComp and Filter with 2, and no error for InStrB, InStrRev, Replace, Split and InStr with 3. Stated in a NOTE on docs/Reference/Default/VBA/Strings/InStr.md (its Common Errors section), generated from errors/VBA.Strings.yml (row `bug: database-compare-no-error`); the StrComp and Filter rows for a compare of 2, when written, belong to this entry too. When fixed, each row's bug and vb6 fields go and the NOTEs with them. -->

---

## `InStr` raises error 5 for an invalid locale ID when *string1* or *string2* is zero-length, where VB6 raises nothing

**Describe the bug**
`InStr(1, "", "a", 99999)`, `InStr(1, "abc", "", 99999)` and `InStr(1, "", "", 99999)` raise error 5, *Invalid procedure call or argument*, because 99999 is not a valid locale identifier. VB6 raises no error and returns 0, 1 and 0: its `InStr` returns before it checks *compare* when either string is zero-length. The same holds for a *compare* of -2. twinBASIC's own `InStrB` and `StrComp` already return before the check, as VB6 does. Observed in the compiler's test mode, 32-bit and 64-bit.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `instr-invalid-lcid-empty-string.twinproj` (attached as `instr-invalid-lcid-empty-string.zip`).
2. Run its test cases, the module below. On BETA 1010 the seven controls pass (`InStr` with no zero-length string and with *start* past the end, `InStrRev` and `Replace`, all of which raise 5 in VB6 too, and `InStrB` and `StrComp`, which return as VB6 does) and the five `InStr` cases on a zero-length string fail with `Actual: 5`.

The module is meant to be adapted as a regression test. Each case asserts VB6's result, which the attached VB6 project (`instr-invalid-lcid-empty-string-vb6.zip`) prints: no error from `InStr` with a zero-length *string1* or *string2*, whatever the *compare*, and the results 0, 1 and 0.
```vb
' Regression tests: InStr given a compare that is not a valid locale ID raises no error
' when string1 or string2 is zero-length, and returns its usual result. Expected results
' are VB6's (the VB6 project beside this one prints them). tbrun --tests runs each case and
' prints PASS or FAIL.
[TestFixture]
Module RegressionTests

    ' Controls: VB6 raises 5 for the invalid locale ID whenever neither string is empty.
    [TestCase]
    Public Sub InStr_BadLcid_Raises5()
        On Error Resume Next
        Dim R As Variant
        R = InStr(1, "abc", "a", 99999)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub InStr_BadLcid_StartPastEnd_Raises5()
        On Error Resume Next
        Dim R As Variant
        R = InStr(5, "abc", "a", 99999)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub InStrRev_BadLcid_EmptyString1_Raises5()
        On Error Resume Next
        Dim R As Variant
        R = InStrRev("", "a", -1, 99999)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub Replace_BadLcid_EmptyExpression_Raises5()
        On Error Resume Next
        Dim R As Variant
        R = Replace("", "a", "x", 1, -1, 99999)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    ' Controls: InStrB and StrComp return before the check, as VB6's InStr does.
    [TestCase]
    Public Sub InStrB_BadLcid_EmptyString1_ReturnsZero()
        On Error Resume Next
        Dim R As Variant
        R = InStrB(1, "", "a", 99999)
        Assert.Strict.AreEqual 0&, Err.Number
        Assert.Strict.AreEqual CVar(0&), R
    End Sub

    [TestCase]
    Public Sub InStrB_BadLcid_EmptyString2_ReturnsStart()
        On Error Resume Next
        Dim R As Variant
        R = InStrB(1, "abc", "", 99999)
        Assert.Strict.AreEqual 0&, Err.Number
        Assert.Strict.AreEqual CVar(1&), R
    End Sub

    [TestCase]
    Public Sub StrComp_BadLcid_EmptyString1_ReturnsMinusOne()
        On Error Resume Next
        Dim R As Variant
        R = StrComp("", "a", 99999)
        Assert.Strict.AreEqual 0&, Err.Number
        Assert.Strict.AreEqual CVar(-1), R
    End Sub

    ' The defect: a zero-length string1 or string2 returns before the compare is checked.
    [TestCase]
    Public Sub InStr_BadLcid_EmptyString1_ReturnsZero()
        On Error Resume Next
        Dim R As Variant
        R = InStr(1, "", "a", 99999)
        Assert.Strict.AreEqual 0&, Err.Number
        Assert.Strict.AreEqual CVar(0&), R
    End Sub

    [TestCase]
    Public Sub InStr_BadLcid_EmptyString2_ReturnsStart()
        On Error Resume Next
        Dim R As Variant
        R = InStr(1, "abc", "", 99999)
        Assert.Strict.AreEqual 0&, Err.Number
        Assert.Strict.AreEqual CVar(1&), R
    End Sub

    [TestCase]
    Public Sub InStr_BadLcid_BothEmpty_ReturnsZero()
        On Error Resume Next
        Dim R As Variant
        R = InStr(1, "", "", 99999)
        Assert.Strict.AreEqual 0&, Err.Number
        Assert.Strict.AreEqual CVar(0&), R
    End Sub

    [TestCase]
    Public Sub InStr_MinusTwo_EmptyString1_ReturnsZero()
        On Error Resume Next
        Dim R As Variant
        R = InStr(1, "", "a", -2)
        Assert.Strict.AreEqual 0&, Err.Number
        Assert.Strict.AreEqual CVar(0&), R
    End Sub

    [TestCase]
    Public Sub InStr_MinusTwo_EmptyString2_ReturnsStart()
        On Error Resume Next
        Dim R As Variant
        R = InStr(1, "abc", "", -2)
        Assert.Strict.AreEqual 0&, Err.Number
        Assert.Strict.AreEqual CVar(1&), R
    End Sub

End Module
```

**Expected behavior**
No error, and the result `InStr` gives for a zero-length string with a valid *compare* (0 for a zero-length *string1*, *start* for a zero-length *string2*), as VB6 and 64-bit VBA return, and as twinBASIC's `InStrB` and `StrComp` return.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: low. Only a *compare* that VB6 would refuse for any other strings is affected, but a program that ran under VB6 stops with error 5 where a string is empty.

A 64-bit build gives the same results. 64-bit VBA here is VBA 7.1 (VBE7.DLL 7.01.1158) in 64-bit Microsoft 365 Access.

What does not reproduce it: an invalid *compare* with neither string zero-length, or with *start* past the end of *string1*, which VB6 refuses too; `InStrRev` and `Replace`, which check *compare* first in VB6 as well; and `InStrB` and `StrComp`, which already behave as VB6 does.

<!-- Reproducer: bugs/instr-invalid-lcid-empty-string/ (mode test: `tbrun --tests`; expect lists the seven PASS and five FAIL lines, each FAIL with what BETA 1010 gives); verified on BETA 1010 by `bug_repro.mjs verify`, and the same five failures with `run --arch win64`. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints no error for InStr with a zero-length string and a compare of 99999 or -2, and 5 for InStrRev, Replace and Split. Stated in a NOTE on docs/Reference/Default/VBA/Strings/InStr.md (its Common Errors section), generated from errors/VBA.Strings.yml (row `bug: instr-invalid-lcid-empty-string`); when fixed, the row's bug and vb6 fields go and the NOTE with them. -->

---

## `StrConv` raises error 5 for `vbWide`, `vbNarrow`, `vbKatakana` and `vbHiragana` with an East Asian *LCID* on a system whose locale is not East Asian, where VB6 converts

**Describe the bug**
On a system whose locale is 1033 (English, United States), `StrConv("a", vbWide, 1041)`, `StrConv(ChrW(&HFF41&), vbNarrow, 1041)`, `StrConv(ChrW(&H3042), vbKatakana, 1041)` and `StrConv(ChrW(&H30A2), vbHiragana, 1041)` raise error 5, *Invalid procedure call or argument*, although the *LCID* argument, 1041, names Japanese. VB6 converts with the rules of the locale *LCID* names, and returns U+FF41, `a`, U+30A2 and U+3042. The same holds for 2052 (Chinese, PRC) and 1042 (Korean). twinBASIC seems to check the system's locale rather than *LCID*'s. Observed in the compiler's test mode, 32-bit and 64-bit.

**To Reproduce**
Steps to reproduce the behavior:
1. On a system whose locale is not East Asian, open `strconv-east-asian-lcid.twinproj` (attached as `strconv-east-asian-lcid.zip`).
2. Run its test cases, the module below. On BETA 1010 the three controls pass (`vbUpperCase` with 1041, and `vbWide` with no *LCID* and with 1033, which VB6 refuses too) and the six cases on an East Asian *LCID* fail with `runtime error 5: Invalid procedure call or argument`.

The module is meant to be adapted as a regression test. Each case asserts VB6's result, which the attached VB6 project (`strconv-east-asian-lcid-vb6.zip`) prints, with the system's locale: no error and the converted characters for 1041, 2052 and 1042, and 5 for no *LCID* and for 1033.
```vb
' Regression tests: StrConv's vbWide, vbNarrow, vbKatakana and vbHiragana convert when
' the LCID argument names an East Asian locale, whatever the system's locale. Expected
' results are VB6's on a system whose locale is 1033, English (United States) (the VB6
' project beside this one prints them). tbrun --tests runs each case and prints PASS
' or FAIL. The controls assume such a system.
[TestFixture]
Module RegressionTests

    ' Controls: another conversion with an East Asian LCID, and vbWide with no East
    ' Asian locale at all, which VB6 refuses too.
    [TestCase]
    Public Sub UpperCase_Japanese_Converts()
        Assert.Strict.AreEqual CVar("A"), StrConv("a", vbUpperCase, 1041)
    End Sub

    [TestCase]
    Public Sub Wide_NoLcid_Raises5()
        On Error Resume Next
        Dim R As Variant
        R = StrConv("a", vbWide)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub Wide_English_Raises5()
        On Error Resume Next
        Dim R As Variant
        R = StrConv("a", vbWide, 1033)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    ' The defect.
    [TestCase]
    Public Sub Wide_Japanese_Converts()
        Assert.Strict.AreEqual CVar(ChrW(&HFF41&)), StrConv("a", vbWide, 1041)
    End Sub

    [TestCase]
    Public Sub Narrow_Japanese_Converts()
        Assert.Strict.AreEqual CVar("a"), StrConv(ChrW(&HFF41&), vbNarrow, 1041)
    End Sub

    [TestCase]
    Public Sub Katakana_Japanese_Converts()
        Assert.Strict.AreEqual CVar(ChrW(&H30A2)), StrConv(ChrW(&H3042), vbKatakana, 1041)
    End Sub

    [TestCase]
    Public Sub Hiragana_Japanese_Converts()
        Assert.Strict.AreEqual CVar(ChrW(&H3042)), StrConv(ChrW(&H30A2), vbHiragana, 1041)
    End Sub

    [TestCase]
    Public Sub Wide_Chinese_Converts()
        Assert.Strict.AreEqual CVar(ChrW(&HFF41&)), StrConv("a", vbWide, 2052)
    End Sub

    [TestCase]
    Public Sub Wide_Korean_Converts()
        Assert.Strict.AreEqual CVar(ChrW(&HFF41&)), StrConv("a", vbWide, 1042)
    End Sub

End Module
```

**Expected behavior**
The conversion, made with the rules of the locale *LCID* names, as VB6 and 64-bit VBA make it. Error 5 only when neither *LCID* nor, without one, the system's locale is East Asian.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045), system locale 1033
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: low. A program that converts Japanese, Chinese or Korean text with an explicit *LCID*, so that it runs on any system, stops with error 5 on a Western one.

A 64-bit build gives the same results. 64-bit VBA here is VBA 7.1 (VBE7.DLL 7.01.1158) in 64-bit Microsoft 365 Access.

What does not reproduce it: another conversion (`vbUpperCase`) with an East Asian *LCID*; and `vbWide` with no *LCID* or with 1033, which VB6 refuses as well. Not checked on a system whose locale is East Asian.

<!-- Reproducer: bugs/strconv-east-asian-lcid/ (mode test: `tbrun --tests`; expect lists the three PASS and six FAIL lines, each FAIL with what BETA 1010 gives); verified on BETA 1010 by `bug_repro.mjs verify` on a system whose locale is 1033, and the same six failures with `run --arch win64`; the controls assume such a system. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints the system locale, then the converted characters for 1041, 2052 and 1042 and 5 for no LCID and 1033. Stated in a NOTE on docs/Reference/Default/VBA/Strings/StrConv.md (its Common Errors section), generated from errors/VBA.Strings.yml (row `bug: strconv-east-asian-lcid`); when fixed, the row's bug and vb6 fields go and the NOTE with them. -->

---

## Assigning to `Date`, `Date$`, `Time` and `Time$` raises other errors than VB6, and `Date$` and `Time$` refuse forms VB6 accepts

**Describe the bug**
Four differences from VB6 when the system date or time is set:

- `Date = Null` and `Time = Null` raise 94, *Invalid use of Null*; VB6 raises 13, *Type mismatch*.
- `Date$` and `Time$` given a string they cannot read raise -2147467259 (`&H80004005`), *Unspecified error*; VB6 raises 5, *Invalid procedure call or argument*.
- `Date$` accepts only *mm-dd-yyyy* and `Time$` only *hh:mm:ss*. VB6 also accepts *m/d/yyyy*, a two-digit year and *hh:mm*, which twinBASIC refuses with -2147467259.
- When Windows refuses the date or time, such as a date before January 1, 1601 (`Date = #12/31/1600#`) or February 30 (`Date$ = "02-30-2000"`), twinBASIC raises -2147467259 and VB6 raises 5. Neither runtime checks these itself. This needs the privilege to set the clock to see, so the module below does not test it; the documentation's own probe saw it with the clock setters replaced in its process by ones that refuse what Windows refuses.

Observed in the compiler's test mode, 32-bit, and in a built exe. The test cases set the clock to what it already holds, so a value that is accepted raises 70, *Permission denied*, in a process without the privilege to set the clock, and changes nothing in one with it.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `date-time-set-errors.twinproj` (attached as `date-time-set-errors.zip`).
2. Run its test cases, the module below. On BETA 1010 the four controls pass and the other seven fail.

The module is meant to be adapted as a regression test. Each case asserts VB6's result, which the attached VB6 project (`date-time-set-errors-vb6.zip`) prints.
```vb
[TestFixture]
Module RegressionTests

    ' 0 or 70: the value was accepted, and only setting the clock could fail.
    Private Function Accepted(ByVal N As Long) As Boolean
        Return N = 0 Or N = 70
    End Function

    ' Controls: a string that is not a date raises 13, Date$ = Null raises 94, and a
    ' value of the documented form is accepted.
    [TestCase]
    Public Sub Date_SetNotADate_Raises13()
        On Error Resume Next
        Date = "abc"
        Assert.Strict.AreEqual 13&, Err.Number
    End Sub

    [TestCase]
    Public Sub DateString_SetNull_Raises94()
        On Error Resume Next
        Date$ = Null
        Assert.Strict.AreEqual 94&, Err.Number
    End Sub

    [TestCase]
    Public Sub DateString_SetMmDdYyyy_Accepted()
        On Error Resume Next
        Date$ = Format$(Date, "mm-dd-yyyy")
        Assert.Strict.IsTrue Accepted(Err.Number)
    End Sub

    [TestCase]
    Public Sub TimeString_SetHhMmSs_Accepted()
        On Error Resume Next
        Time$ = Format$(Time, "hh:mm:ss")
        Assert.Strict.IsTrue Accepted(Err.Number)
    End Sub

    ' The defect: Null raises 94 where VB6 raises 13.
    [TestCase]
    Public Sub Date_SetNull_Raises13()
        On Error Resume Next
        Date = Null
        Assert.Strict.AreEqual 13&, Err.Number
    End Sub

    [TestCase]
    Public Sub Time_SetNull_Raises13()
        On Error Resume Next
        Time = Null
        Assert.Strict.AreEqual 13&, Err.Number
    End Sub

    ' The defect: a string Date$ or Time$ cannot read raises -2147467259, Unspecified
    ' error, where VB6 raises 5.
    [TestCase]
    Public Sub DateString_SetNotADate_Raises5()
        On Error Resume Next
        Date$ = "abc"
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub TimeString_SetNotATime_Raises5()
        On Error Resume Next
        Time$ = "abc"
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    ' The defect: forms VB6 accepts raise -2147467259.
    [TestCase]
    Public Sub DateString_SetSlashes_Accepted()
        On Error Resume Next
        Date$ = Format$(Date, "m/d/yyyy")
        Assert.Strict.IsTrue Accepted(Err.Number)
    End Sub

    [TestCase]
    Public Sub DateString_SetTwoDigitYear_Accepted()
        On Error Resume Next
        Date$ = Format$(Date, "mm-dd-yy")
        Assert.Strict.IsTrue Accepted(Err.Number)
    End Sub

    [TestCase]
    Public Sub TimeString_SetHhMm_Accepted()
        On Error Resume Next
        Time$ = Format$(Time, "hh:mm")
        Assert.Strict.IsTrue Accepted(Err.Number)
    End Sub

End Module
```

**Expected behavior**
Error 13 for `Null` assigned to `Date` or `Time`, error 5 for a string `Date$` or `Time$` cannot read, and the forms VB6 reads accepted, as VB6 and 64-bit VBA do.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045), system locale 1033
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: low. A handler that tests for VB6's numbers misses these, and a program that sets the clock from a string such as `"10:30"` fails.

A 64-bit build gives the same results. 64-bit VBA here is VBA 7.1 (VBE7.DLL 7.01.1158) in 64-bit Microsoft 365 Access.

What does not reproduce it: `Date$ = Null` and `Time$ = Null`, which raise 94 in both; `Date` and `Time` given a string that is not a date or time, which raise 13 in both.

<!-- Reproducer: bugs/date-time-set-errors/ (mode test: `tbrun --tests`; expect lists the four PASS and seven FAIL lines, each FAIL with what BETA 1010 gives); verified on BETA 1010 by `bug_repro.mjs verify`, in a process without the privilege to set the clock. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints 13 for Null, 5 for "abc", and 70 for every form it accepts. Stated in NOTEs on docs/Reference/Default/VBA/DateTime/Date.md and Time.md (their Common Errors sections, generated from errors/VBA.DateTime.yml, rows `bug: date-time-set-errors`, and a NOTE by hand under each Let of Date$ and Time$ on the forms); when fixed, the rows become 13 and 5 without vb6 and bug, and the NOTEs go. Found 2026-10-22 in batch 5 of WIP.Errors.md. -->

---

## `DateAdd` with the "yyyy", "q" or "m" interval returns a date in the 1900s or 2000s when the result would be before year 100, where VB6 raises error 5

**Describe the bug**
`DateAdd("yyyy", -1, #1/1/100#)` returns January 1, 1999, with no error: a result before January 1, 100 seems to be taken as a two-digit year. The same happens for the "q" and "m" intervals: `DateAdd("m", -1, #1/1/100#)` returns December 1, 1999. The other intervals raise 5, *Invalid procedure call or argument*, as VB6 does for all of them. Observed in the compiler's test mode, 32-bit and 64-bit, and in a built exe.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `dateadd-year-below-100.twinproj` (attached as `dateadd-year-below-100.zip`).
2. Run its test cases, the module below. On BETA 1010 the two controls pass and the other three fail with `Actual: 0`.

The module is meant to be adapted as a regression test. Each case asserts VB6's result, which the attached VB6 project (`dateadd-year-below-100-vb6.zip`) prints.
```vb
[TestFixture]
Module RegressionTests

    ' Controls: a day before January 1, 100 raises 5, and a year that reaches year 100
    ' exactly gives that date.
    [TestCase]
    Public Sub DateAdd_DayBefore100_Raises5()
        Dim V As Variant
        On Error Resume Next
        V = DateAdd("d", -1, #1/1/100#)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub DateAdd_YearsToYear100_GivesYear100()
        Dim V As Variant = DateAdd("yyyy", -1900, #1/1/2000#)
        Assert.Strict.AreEqual #1/1/100#, CDate(V)
    End Sub

    ' The defect: no error, and a date in the 1900s or 2000s: DateAdd("yyyy", -1, #1/1/100#)
    ' returns January 1, 1999.
    [TestCase]
    Public Sub DateAdd_YearBefore100_Raises5()
        Dim V As Variant
        On Error Resume Next
        V = DateAdd("yyyy", -1, #1/1/100#)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub DateAdd_QuarterBefore100_Raises5()
        Dim V As Variant
        On Error Resume Next
        V = DateAdd("q", -1, #1/1/100#)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub DateAdd_MonthBefore100_Raises5()
        Dim V As Variant
        On Error Resume Next
        V = DateAdd("m", -1, #1/1/100#)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

End Module
```

**Expected behavior**
Error 5 whenever the result would be before January 1, 100, whatever the interval, as VB6 and 64-bit VBA do.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: medium. The result is a valid date about 1,900 years away from the right one, returned without an error: `DateAdd("yyyy", -1901, #1/1/2000#)` gives January 1, 1999, and `DateAdd("yyyy", -2000, #1/1/2000#)` January 1, 2000.

A 64-bit build gives the same results. 64-bit VBA here is VBA 7.1 (VBE7.DLL 7.01.1158) in 64-bit Microsoft 365 Access.

What does not reproduce it: a result far enough below year 100 that it is not a year from 0 to 99 (`DateAdd("yyyy", -10000, #1/1/2000#)` raises 5); the intervals "d", "y", "w", "ww", "h", "n" and "s"; and the upper end, where a result after December 31, 9999 raises 5 for every interval.

<!-- Reproducer: bugs/dateadd-year-below-100/ (mode test: `tbrun --tests`; expect lists the two PASS and three FAIL lines, each FAIL with what BETA 1010 gives); verified on BETA 1010 by `bug_repro.mjs verify`, and the same three failures with `run --arch win64`. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints 5 for each interval, and 1/1/100 for the control. Stated in a NOTE on docs/Reference/Default/VBA/DateTime/DateAdd.md (its Common Errors section, generated from errors/VBA.DateTime.yml, row `bug: dateadd-year-below-100`) and in a WARNING by hand above it; when fixed, the row's cases move to the 5 row, whose When loses its exception, and the NOTE and WARNING go. Found 2026-10-22 in batch 5 of WIP.Errors.md. -->

---

## `DateAdd` and `DateDiff` raise error 6 for a date that is a number outside the range of dates, where VB6 raises error 13

**Describe the bug**
`DateAdd("d", 0, 2958466)` and `DateDiff("d", #1/1/2000#, 3000000)` raise 6, *Overflow*. VB6 raises 13, *Type mismatch*, and so do `DatePart`, `Day` and the other functions that take a date, in twinBASIC and VB6 alike. Observed in the compiler's test mode, 32-bit, and in a built exe.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `dateadd-date-out-of-range-overflow.twinproj` (attached as `dateadd-date-out-of-range-overflow.zip`).
2. Run its test cases, the module below. On BETA 1010 the two controls pass and the other three fail with `Actual: 6`.

The module is meant to be adapted as a regression test. Each case asserts VB6's result, which the attached VB6 project (`dateadd-date-out-of-range-overflow-vb6.zip`) prints.
```vb
[TestFixture]
Module RegressionTests

    ' Controls: DatePart and Day raise 13 for the same number.
    [TestCase]
    Public Sub DatePart_NumberOutOfRange_Raises13()
        Dim V As Variant
        On Error Resume Next
        V = DatePart("d", 3000000)
        Assert.Strict.AreEqual 13&, Err.Number
    End Sub

    [TestCase]
    Public Sub Day_NumberOutOfRange_Raises13()
        Dim V As Variant
        On Error Resume Next
        V = Day(3000000)
        Assert.Strict.AreEqual 13&, Err.Number
    End Sub

    ' The defect: DateAdd and DateDiff raise 6, Overflow.
    [TestCase]
    Public Sub DateAdd_NumberAboveRange_Raises13()
        Dim V As Variant
        On Error Resume Next
        V = DateAdd("d", 0, 2958466)
        Assert.Strict.AreEqual 13&, Err.Number
    End Sub

    [TestCase]
    Public Sub DateAdd_NumberBelowRange_Raises13()
        Dim V As Variant
        On Error Resume Next
        V = DateAdd("d", 0, -657435)
        Assert.Strict.AreEqual 13&, Err.Number
    End Sub

    [TestCase]
    Public Sub DateDiff_NumberOutOfRange_Raises13()
        Dim V As Variant
        On Error Resume Next
        V = DateDiff("d", #1/1/2000#, 3000000)
        Assert.Strict.AreEqual 13&, Err.Number
    End Sub

End Module
```

**Expected behavior**
Error 13, as VB6 and 64-bit VBA raise, and as `DatePart` and `Day` raise.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: low. A handler that tests for 13 misses it.

A 64-bit build gives the same results. 64-bit VBA here is VBA 7.1 (VBE7.DLL 7.01.1158) in 64-bit Microsoft 365 Access.

What does not reproduce it: the last and first days of the range (2958465 and -657434), which both accept; a string that is not a date, which raises 13 in both.

<!-- Reproducer: bugs/dateadd-date-out-of-range-overflow/ (mode test: `tbrun --tests`; expect lists the two PASS and three FAIL lines, each FAIL with what BETA 1010 gives); verified on BETA 1010 by `bug_repro.mjs verify`. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints 13 for all five. Stated in NOTEs on docs/Reference/Default/VBA/DateTime/DateAdd.md and DateDiff.md (their Common Errors sections, generated from errors/VBA.DateTime.yml, rows `bug: dateadd-date-out-of-range-overflow`); when fixed, each row's cases move to the 13 row and the NOTEs go. Found 2026-10-22 in batch 5 of WIP.Errors.md. -->

---

## `DatePart` raises error 5 for an invalid interval when the date is `Null`, where VB6 returns `Null`

**Describe the bug**
`DatePart("x", Null)` raises 5, *Invalid procedure call or argument*. VB6 returns `Null` without checking the interval, and twinBASIC's own `DateAdd("x", 1, Null)` and `DateDiff("x", Null, #1/1/2001#)` return `Null` as VB6's do. Observed in the compiler's test mode, 32-bit and 64-bit, and in a built exe.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `datepart-null-checks-interval.twinproj` (attached as `datepart-null-checks-interval.zip`).
2. Run its test cases, the module below. On BETA 1010 the three controls pass and `DatePart_BadIntervalWithNull_NoError` fails with `Actual: 5`.

The module is meant to be adapted as a regression test. Each case asserts VB6's result, which the attached VB6 project (`datepart-null-checks-interval-vb6.zip`) prints.
```vb
[TestFixture]
Module RegressionTests

    ' Controls: DatePart raises 5 for the interval with a date, and DateAdd and DateDiff
    ' return Null for a Null date with the same interval.
    [TestCase]
    Public Sub DatePart_BadIntervalWithDate_Raises5()
        Dim V As Variant
        On Error Resume Next
        V = DatePart("x", #1/1/2000#)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub DateAdd_BadIntervalWithNull_ReturnsNull()
        Dim V As Variant = DateAdd("x", 1, Null)
        Assert.Strict.IsTrue IsNull(V)
    End Sub

    [TestCase]
    Public Sub DateDiff_BadIntervalWithNull_ReturnsNull()
        Dim V As Variant = DateDiff("x", Null, #1/1/2001#)
        Assert.Strict.IsTrue IsNull(V)
    End Sub

    ' The defect: DatePart raises 5.
    [TestCase]
    Public Sub DatePart_BadIntervalWithNull_NoError()
        Dim V As Variant
        On Error Resume Next
        V = DatePart("x", Null)
        Assert.Strict.AreEqual 0&, Err.Number
    End Sub

End Module
```

**Expected behavior**
`Null`, with no error, as VB6 and 64-bit VBA return.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: low. Only an invalid interval with a `Null` date is affected; twinBASIC's behaviour is arguably stricter, but it differs from VB6 and from twinBASIC's own `DateAdd` and `DateDiff`.

A 64-bit build gives the same results. 64-bit VBA here is VBA 7.1 (VBE7.DLL 7.01.1158) in 64-bit Microsoft 365 Access.

What does not reproduce it: a `Null` interval, which raises 94 in both.

<!-- Reproducer: bugs/datepart-null-checks-interval/ (mode test: `tbrun --tests`; expect lists the three PASS and one FAIL lines); verified on BETA 1010 by `bug_repro.mjs verify`, and the same failure with `run --arch win64`. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints Null with no error for DatePart, DateAdd and DateDiff, and 5 for the control. Stated in a NOTE on docs/Reference/Default/VBA/DateTime/DatePart.md (its Common Errors section, generated from errors/VBA.DateTime.yml, row `bug: datepart-null-checks-interval`); when fixed, the row goes, its case becomes quiet, and the NOTE goes. Found 2026-10-22 in batch 5 of WIP.Errors.md. -->

---

## `DatePart("ww", ...)` of a date in year 100 before its first full week never returns with `vbFirstFullWeek`, and returns -98980 with `vbFirstFourDays`

**Describe the bug**
January 1, 100 is a Friday, so with Sunday as the first day of the week its week belongs to year 99. `DatePart("ww", #1/1/100#, vbSunday, vbFirstFullWeek)` never returns: the program stops responding. `DatePart("ww", #1/1/100#, vbSunday, vbFirstFourDays)` returns -98980. VB6 returns 52 for both. Observed in an IDE run and in a built exe, 32-bit.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `datepart-week-year-100.twinproj` (attached as `datepart-week-year-100.zip`).
2. Run it. On BETA 1010 it prints the four lines below and stops responding at the last call.

```
ww of 1/1/100, vbFirstFourDays: -98980
ww of 1/3/100, vbFirstFullWeek: 1
ww of 1/1/2000, vbFirstFullWeek: 52
calling DatePart("ww", #1/1/100#, vbSunday, vbFirstFullWeek)
```

The module:
```vb
Module Startup

    Public Sub Main()
        ' Controls: the same date with vbFirstFourDays, and the first date of the first
        ' full week with vbFirstFullWeek, return.
        Debug.Print "ww of 1/1/100, vbFirstFourDays: " & DatePart("ww", #1/1/100#, vbSunday, vbFirstFourDays)
        Debug.Print "ww of 1/3/100, vbFirstFullWeek: " & DatePart("ww", #1/3/100#, vbSunday, vbFirstFullWeek)
        Debug.Print "ww of 1/1/2000, vbFirstFullWeek: " & DatePart("ww", #1/1/2000#, vbSunday, vbFirstFullWeek)
        ' The defect: January 1, 100 is a Friday, so its week belongs to year 99.
        Debug.Print "calling DatePart(""ww"", #1/1/100#, vbSunday, vbFirstFullWeek)"
        Debug.Print "returned " & DatePart("ww", #1/1/100#, vbSunday, vbFirstFullWeek)
    End Sub

End Module
```

The attached VB6 project (`datepart-week-year-100-vb6.zip`) prints 52, 1, 52 and 52.

**Expected behavior**
52 for both, the week of year 99 that the date belongs to, as VB6 and 64-bit VBA return. The first line's value is wrong too.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: medium. A hang loses unsaved data, and only dates in the first days of year 100 reach it.

A 64-bit build gives the same results: -98980, then the hang. 64-bit VBA, VBA 7.1 (VBE7.DLL 7.01.1158) in 64-bit Microsoft 365 Access, prints 52, 1, 52 and 52, as VB6 does.

What does not reproduce it: January 1, 2000, whose week also belongs to the year before (52); January 3, 100, the first day of the first full week (1); `Format(#1/1/100#, "ww", vbSunday, vbFirstFullWeek)`, and `DateDiff("ww", ...)` with `vbFirstFullWeek` from January 1, 100, which return; and `DatePart("yyyy", #1/1/100#, vbSunday, vbFirstFullWeek)`. The hang also happens with `vbMonday` and `vbUseSystem` as the first day, and for January 2, 100.

<!-- Reproducer: bugs/datepart-week-year-100/ (mode run, expect exit 5: tbrun reports that the probe never returned, after the three control lines and the "calling" line); verified on BETA 1010 by `bug_repro.mjs verify`. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints 52, 1, 52 and 52 with no error. Stated in a WARNING by hand on docs/Reference/Default/VBA/DateTime/DatePart.md; it is not in errors/VBA.DateTime.yml, because a case that never returns stops the probe. When fixed, the WARNING goes. Found 2026-10-22 in batch 5 of WIP.Errors.md. -->

---

## `DatePart` and `DateDiff` take a *firstdayofweek* outside 0 to 7 without an error and return values that follow no rule, such as a weekday of -2

**Describe the bug**
Where the interval uses *firstdayofweek* ("w" and "ww" in `DatePart`, "ww" in `DateDiff`), VB6 raises 5, *Invalid procedure call or argument*, for a value outside 0 to 7. twinBASIC raises nothing, and what it returns follows no rule. For January 1, 2000, a Saturday, `DatePart("w", d, 8)` returns 7, as with `vbSunday`, `DatePart("w", d, 15)` returns 0 and `DatePart("w", d, 255)` returns -2, which are not weekdays. Over every date of 1999 to 2001:

- a negative value gives the same results as one value from 0 to 7, as if taken modulo 7 (-1 as 6, -7 as 7);
- for `DatePart("w")`, 8 gives the same results as 1, and 9 to 32767 match no value from 0 to 7;
- for `DatePart("ww")`, 8 and 9 match 1, and 10 up match nothing;
- for `DateDiff("ww")`, 8 to 13 match 1, and 14 up match nothing.

Observed in the compiler's test mode, 32-bit, and in a built exe.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `datepart-firstdayofweek-out-of-range.twinproj` (attached as `datepart-firstdayofweek-out-of-range.zip`).
2. Run its test cases, the module below. On BETA 1010 the three controls pass and the other five fail with `Actual: 0`.

The module is meant to be adapted as a regression test. Each case asserts VB6's result, which the attached VB6 project (`datepart-firstdayofweek-out-of-range-vb6.zip`) prints.
```vb
[TestFixture]
Module RegressionTests

    ' Controls: the weekday with Sunday and with Saturday as the first day, and a
    ' firstdayofweek of 8 with an interval that does not use it.
    [TestCase]
    Public Sub DatePart_W_Sunday_Is7()
        Assert.Strict.AreEqual CVar(7), DatePart("w", #1/1/2000#, vbSunday)
    End Sub

    [TestCase]
    Public Sub DatePart_W_Saturday_Is1()
        Assert.Strict.AreEqual CVar(1), DatePart("w", #1/1/2000#, vbSaturday)
    End Sub

    [TestCase]
    Public Sub DatePart_D_Eight_NoError()
        Dim V As Variant
        On Error Resume Next
        V = DatePart("d", #1/1/2000#, 8)
        Assert.Strict.AreEqual 0&, Err.Number
    End Sub

    ' The defect: no error, and a value that follows no rule: 8 acts as 1, 9 to 13 match
    ' no setting, and 255 gives a weekday of -2.
    [TestCase]
    Public Sub DatePart_W_Eight_Raises5()
        Dim V As Variant
        On Error Resume Next
        V = DatePart("w", #1/1/2000#, 8)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub DatePart_W_255_Raises5()
        Dim V As Variant
        On Error Resume Next
        V = DatePart("w", #1/1/2000#, 255)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub DatePart_W_MinusOne_Raises5()
        Dim V As Variant
        On Error Resume Next
        V = DatePart("w", #1/1/2000#, -1)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub DatePart_WW_Eight_Raises5()
        Dim V As Variant
        On Error Resume Next
        V = DatePart("ww", #1/1/2000#, 8)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub DateDiff_WW_Eight_Raises5()
        Dim V As Variant
        On Error Resume Next
        V = DateDiff("ww", #1/1/2000#, #1/1/2001#, 8)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

End Module
```

**Expected behavior**
Error 5, as VB6 and 64-bit VBA raise. Taking the value modulo 7 throughout would be a reasonable extension too, but not the mix above.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: medium. A wrong *firstdayofweek*, such as one read from a setting, goes unreported and gives weekdays outside 1 to 7 and week counts that are off.

A 64-bit build gives the same results. 64-bit VBA here is VBA 7.1 (VBE7.DLL 7.01.1158) in 64-bit Microsoft 365 Access.

What does not reproduce it: an interval that does not use *firstdayofweek* (`DatePart("d", d, 8)`, `DateDiff("w", d1, d2, 8)`), which VB6 accepts as well; a `Null` *firstdayofweek*, which raises 94 in both. A *firstweekofyear* outside 0 to 3 is reported separately.

<!-- Reproducer: bugs/datepart-firstdayofweek-out-of-range/ (mode test: `tbrun --tests`; expect lists the three PASS and five FAIL lines, each FAIL with what BETA 1010 gives); verified on BETA 1010 by `bug_repro.mjs verify`. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints 5 for the five, 7 and 1 for the weekday controls and 1 for "d". The mapping above comes from a probe over 1999 to 2001, not kept. Stated in NOTEs on docs/Reference/Default/VBA/DateTime/DatePart.md and DateDiff.md (their Common Errors sections, generated from errors/VBA.DateTime.yml, rows `bug: datepart-firstdayofweek-out-of-range`) and in a WARNING by hand on DatePart.md; when fixed, the rows' cases move to a 5 row, and the NOTEs and the WARNING go. Found 2026-10-22 in batch 5 of WIP.Errors.md; owner: an extension only if it makes sense and has no bugs, which this does not. -->

---

## `DatePart` takes a *firstweekofyear* outside 0 to 3 without an error, where VB6 raises error 5

**Describe the bug**
With the "ww" interval, VB6 raises 5, *Invalid procedure call or argument*, for a *firstweekofyear* outside 0 to 3. twinBASIC raises nothing and counts the weeks as with `vbUseSystem` or `vbFirstJan1`: over every date of 1999 to 2001, each value tried from -15 to 2147483647 gives the same results as 0 and 1, which agree on the system tested (its own setting is the week of January 1). Observed in the compiler's test mode, 32-bit, and in a built exe.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `datepart-firstweekofyear-out-of-range.twinproj` (attached as `datepart-firstweekofyear-out-of-range.zip`).
2. Run its test cases, the module below. On BETA 1010 the three controls pass and the other two fail with `Actual: 0`.

The module is meant to be adapted as a regression test. Each case asserts VB6's result, which the attached VB6 project (`datepart-firstweekofyear-out-of-range-vb6.zip`) prints.
```vb
[TestFixture]
Module RegressionTests

    ' Controls: the week with vbFirstJan1 and vbFirstFullWeek, and a firstweekofyear of 4
    ' with an interval that does not use it.
    [TestCase]
    Public Sub DatePart_WW_FirstJan1_Is1()
        Assert.Strict.AreEqual CVar(1), DatePart("ww", #1/1/2000#, vbSunday, vbFirstJan1)
    End Sub

    [TestCase]
    Public Sub DatePart_WW_FirstFullWeek_Is52()
        Assert.Strict.AreEqual CVar(52), DatePart("ww", #1/1/2000#, vbSunday, vbFirstFullWeek)
    End Sub

    [TestCase]
    Public Sub DatePart_D_Four_NoError()
        Dim V As Variant
        On Error Resume Next
        V = DatePart("d", #1/1/2000#, vbSunday, 4)
        Assert.Strict.AreEqual 0&, Err.Number
    End Sub

    ' The defect: no error; the weeks are counted as with 0 or 1.
    [TestCase]
    Public Sub DatePart_WW_Four_Raises5()
        Dim V As Variant
        On Error Resume Next
        V = DatePart("ww", #1/1/2000#, vbSunday, 4)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub DatePart_WW_MinusOne_Raises5()
        Dim V As Variant
        On Error Resume Next
        V = DatePart("ww", #1/1/2000#, vbSunday, -1)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

End Module
```

**Expected behavior**
Error 5, as VB6 and 64-bit VBA raise.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045), system locale 1033
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: low. A wrong *firstweekofyear*, such as one read from a setting, goes unreported, and the week numbers are those of another setting.

A 64-bit build gives the same results. 64-bit VBA here is VBA 7.1 (VBE7.DLL 7.01.1158) in 64-bit Microsoft 365 Access.

What does not reproduce it: an interval that does not use *firstweekofyear* (`DatePart("d", d, vbSunday, 4)`), which VB6 accepts as well; `DateDiff`, which ignores *firstweekofyear* in both; a `Null` *firstweekofyear*, which raises 94 in both. Not checked on a system whose own first week of the year is not the week of January 1, where 0 and 1 differ.

<!-- Reproducer: bugs/datepart-firstweekofyear-out-of-range/ (mode test: `tbrun --tests`; expect lists the three PASS and two FAIL lines); verified on BETA 1010 by `bug_repro.mjs verify`. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints 5 for 4 and -1, 1 and 52 for the week controls and 1 for "d". Stated in a NOTE on docs/Reference/Default/VBA/DateTime/DatePart.md (its Common Errors section, generated from errors/VBA.DateTime.yml, row `bug: datepart-firstweekofyear-out-of-range`); when fixed, the row's case moves to a 5 row and the NOTE goes. Found 2026-10-22 in batch 5 of WIP.Errors.md; owner: a bug. -->

---

## Refused arguments raise -2147467259, *Unspecified error*, or -2147352567, *Exception occurred.*, where VB6 and VBA raise 5, 6, 9, 13, 53, 94 or 438

**Describe the bug**
Given an argument they refuse, several runtime procedures raise -2147467259 (`&H80004005`), *Unspecified error*, where VB6 and 64-bit VBA raise one of VB's own numbers:
- `LBound` and `UBound` with a *dimension* less than 1 or greater than the number of dimensions: VB raises 9, *Subscript out of range*; with a *dimension* greater than 32,767: 6, *Overflow*.
- `Switch` with an odd number of arguments: 5, *Invalid procedure call or argument*.
- `Partition` with *start* less than 0, *stop* not greater than *start*, or *interval* less than 1: 5; with a string that is not a number: 13, *Type mismatch*; with a value outside the `LongLong` range: 6.
- `Environ` with a *number* less than 1, a position no entry has, or a zero-length name: 5; with a *number* greater than 32,767: 6.
- `GetObject()` with no arguments: 13.
- `CallByName` with a *calltype* that is not a `VbCallType` value: 438, *Object doesn't support this property or method*; with an object of `Nothing`: 5.
- `SaveSetting`, `GetSetting`, `GetAllSettings` and `DeleteSetting` with a zero-length application, section or key name, and `DeleteSetting` of an application, section or key that does not exist: 5.
- `AppActivate` with a title or task ID that no window has: 5.
- `Shell` with a zero-length path, spaces, a folder, a file that is not a program, or a path longer than 32,767 characters: 5; with a program or folder that does not exist, or an unclosed quotation mark: 53, *File not found*; with a *windowstyle* less than 0 or greater than 10: 5.
- `MsgBox` and `InputBox` with a *helpfile* and no *context*: 5.
- `SendKeys` raises -2147352567 (`&H80020009`), *Exception occurred.*, instead: for an unknown key code (`{INS}` and `{F17}` included), an unclosed brace, a count in braces that is not a whole number from 0 to 8,175, unbalanced parentheses or `++`, VB raises 5; for a *wait* of `Null`, 94; for a *wait* string that is not a `Boolean`, 13.

It is the pattern of #2544 (`ReDim` with inverted bounds raises -2147467259 where VB6 raises 9). Observed in the compiler's test mode and in built exes, 32-bit and 64-bit.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `argument-errors-unspecified-error.twinproj` (attached as `argument-errors-unspecified-error.zip`).
2. Run its test cases, the module below. On BETA 1010 the three controls pass and the other twenty-five fail, each with `Err.Number` -2147467259, or -2147352567 for the two `SendKeys` cases.

The module is meant to be adapted as a regression test. Each case asserts VB6's number, which the attached VB6 project (`argument-errors-unspecified-error-vb6.zip`) prints; 64-bit VBA raises the same numbers. No case writes to the registry: the registry procedures are given names that do not exist.
```vb
' Regression tests: a procedure that refuses an argument raises the number VB6 and 64-bit VBA
' raise (the VB6 project beside this one prints them), not -2147467259, Unspecified error.
' No case writes to the registry: GetSetting and DeleteSetting are given names that do not
' exist. tbrun --tests runs each case and prints PASS or FAIL.
[TestFixture]
Module RegressionTests

    ' Controls: errors twinBASIC already raises with VB's numbers.
    [TestCase]
    Public Sub LBound_UnsizedArray_Raises9()
        Dim A() As Long
        Dim N As Long
        On Error Resume Next
        N = LBound(A)
        Assert.Strict.AreEqual 9&, Err.Number
    End Sub

    [TestCase]
    Public Sub QBColor_Sixteen_Raises5()
        Dim N As Long
        On Error Resume Next
        N = QBColor(16)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub Environ_Null_Raises94()
        Dim S As String
        On Error Resume Next
        S = Environ(Null)
        Assert.Strict.AreEqual 94&, Err.Number
    End Sub

    ' The defect: each of these raises -2147467259.
    [TestCase]
    Public Sub LBound_DimensionZero_Raises9()
        Dim A(1 To 3) As Long
        Dim N As Long
        On Error Resume Next
        N = LBound(A, 0)
        Assert.Strict.AreEqual 9&, Err.Number
    End Sub

    [TestCase]
    Public Sub UBound_DimensionPastRank_Raises9()
        Dim A(1 To 3) As Long
        Dim N As Long
        On Error Resume Next
        N = UBound(A, 2)
        Assert.Strict.AreEqual 9&, Err.Number
    End Sub

    [TestCase]
    Public Sub LBound_Dimension32768_Raises6()
        Dim A(1 To 3) As Long
        Dim N As Long
        On Error Resume Next
        N = LBound(A, 32768)
        Assert.Strict.AreEqual 6&, Err.Number
    End Sub

    [TestCase]
    Public Sub Switch_OddArguments_Raises5()
        Dim V As Variant
        On Error Resume Next
        V = Switch(True, 1, False)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub Partition_NegativeStart_Raises5()
        Dim V As Variant
        On Error Resume Next
        V = Partition(5, -1, 10, 1)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub Partition_IntervalZero_Raises5()
        Dim V As Variant
        On Error Resume Next
        V = Partition(5, 0, 10, 0)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub Partition_StringNumber_Raises13()
        Dim V As Variant
        On Error Resume Next
        V = Partition("abc", 0, 10, 1)
        Assert.Strict.AreEqual 13&, Err.Number
    End Sub

    [TestCase]
    Public Sub Partition_BeyondLongLong_Raises6()
        Dim V As Variant
        On Error Resume Next
        V = Partition(1E+20, 0, 10, 1)
        Assert.Strict.AreEqual 6&, Err.Number
    End Sub

    [TestCase]
    Public Sub Environ_Zero_Raises5()
        Dim S As String
        On Error Resume Next
        S = Environ(0)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub Environ_PositionWithNoEntry_Raises5()
        Dim S As String
        On Error Resume Next
        S = Environ(32767)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub Environ_EmptyName_Raises5()
        Dim S As String
        On Error Resume Next
        S = Environ("")
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub Environ_Above32767_Raises6()
        Dim S As String
        On Error Resume Next
        S = Environ(32768)
        Assert.Strict.AreEqual 6&, Err.Number
    End Sub

    [TestCase]
    Public Sub GetObject_NoArguments_Raises13()
        Dim O As Object
        On Error Resume Next
        Set O = GetObject()
        Assert.Strict.AreEqual 13&, Err.Number
    End Sub

    [TestCase]
    Public Sub CallByName_CallTypeZero_Raises438()
        Dim D As Object
        Dim V As Variant
        Set D = CreateObject("Scripting.Dictionary")
        On Error Resume Next
        V = CallByName(D, "Count", 0)
        Assert.Strict.AreEqual 438&, Err.Number
    End Sub

    [TestCase]
    Public Sub CallByName_Nothing_Raises5()
        Dim D As Object
        Dim V As Variant
        On Error Resume Next
        V = CallByName(D, "Count", VbGet)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub GetSetting_EmptyAppName_Raises5()
        Dim S As String
        On Error Resume Next
        S = GetSetting("", "Section", "Key")
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub DeleteSetting_MissingApplication_Raises5()
        On Error Resume Next
        DeleteSetting "NoSuchApplication-argument-errors-unspecified-error"
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    ' Batch 6b: the interactive procedures. Each raises before a box, a key or a program.
    [TestCase]
    Public Sub AppActivate_NoSuchWindow_Raises5()
        On Error Resume Next
        AppActivate "No such window: argument-errors-unspecified-error"
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub Shell_EmptyPath_Raises5()
        Dim V As Variant
        On Error Resume Next
        V = Shell("")
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub Shell_MissingProgram_Raises53()
        Dim V As Variant
        On Error Resume Next
        V = Shell("no-such-program-argument-errors-unspecified-error.exe")
        Assert.Strict.AreEqual 53&, Err.Number
    End Sub

    [TestCase]
    Public Sub Shell_WindowStyle11_Raises5()
        Dim V As Variant
        On Error Resume Next
        V = Shell("cmd.exe /c exit", 11)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub MsgBox_HelpFileWithoutContext_Raises5()
        Dim V As Variant
        On Error Resume Next
        V = MsgBox("x", , , "help.hlp")
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub InputBox_HelpFileWithoutContext_Raises5()
        Dim V As Variant
        On Error Resume Next
        V = InputBox("x", , , , , "help.hlp")
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    ' SendKeys raises -2147352567, Exception occurred, where the others raise -2147467259.
    [TestCase]
    Public Sub SendKeys_UnknownKeyCode_Raises5()
        On Error Resume Next
        SendKeys "{BAD}"
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub SendKeys_WaitNull_Raises94()
        On Error Resume Next
        SendKeys "", Null
        Assert.Strict.AreEqual 94&, Err.Number
    End Sub

End Module
```

**Expected behavior**
VB's own number in each case, with its description, as VB6 and 64-bit VBA raise.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: low. A handler that tests `Err.Number` for the number VB6 raises misses these, and *Unspecified error* tells a user nothing about what was wrong.

A 64-bit build gives the same results. 64-bit VBA here is VBA 7.1 (VBE7.DLL 7.01.1158) in 64-bit Microsoft 365 Access.

What does not reproduce it: the errors these procedures already raise with VB's numbers, such as `LBound` of an array not yet sized (9), `QBColor` outside 0 to 15 (5), `RGB` with a negative component (5), and `Null` for any of the arguments above (94).

<!-- Reproducer: bugs/argument-errors-unspecified-error/ (mode test: `tbrun --tests`; expect lists the three PASS and twenty-five FAIL lines); run on BETA 1010 with `bug_repro.mjs run`; 64-bit from the run-time errors data (`errors.mjs run`, all four runtimes). VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints VB's number for each case. Stated in the Common Errors sections (rows `bug: argument-errors-unspecified-error`) of LBound, UBound, Switch, Partition, Environ, GetObject, CallByName, SaveSetting, GetSetting, GetAllSettings, DeleteSetting, AppActivate, Shell, MsgBox, InputBox and SendKeys, from errors/VBA.Information.yml and errors/VBA.Interaction.yml; when fixed, each row's `error` becomes VB's number and its `vb6` and `bug` go, and the NOTEs with them. Found 2026-10-22 by batch 6a of WIP.Errors.md; grouped as one entry by the owner. The interactive procedures added 2026-10-27 by batch 6b (owner: SendKeys' -2147352567 joins it); the VB6 side carries a copy of errors/harnesses/dialog.bas for its MsgBox and InputBox cases. -->

---

## `CreateObject` and `GetObject` raise the COM `HRESULT` where VB6 and VBA raise 429 or 432

**Describe the bug**
When `CreateObject` or `GetObject` cannot create or find the object, twinBASIC raises the `HRESULT` COM returned, where VB6 and 64-bit VBA raise 429, *ActiveX component can't create object*, or 432, *File name or class name not found during Automation operation*:

| Call | VB6 and 64-bit VBA | twinBASIC |
|---|---|---|
| `CreateObject("No.Such.Class")`, a CLSID in braces without `new:`, a number | 429 | -2147221020 (`MK_E_SYNTAX`, *Invalid syntax*) |
| `CreateObject("new:{00000000-0000-0000-0000-000000000000}")` | 429 | -2147221164 (`REGDB_E_CLASSNOTREG`, *Class not registered*) |
| `CreateObject("new:not-a-guid")` | 429 | -2147221005 (`CO_E_CLASSSTRING`, *Invalid class string*) |
| `CreateObject("")` | 429 | 5 |
| `GetObject("C:\no\such\file.xyz")` | 432 | -2147221014 (`MK_E_CANTOPENFILE`, *Moniker cannot open file*) |
| `GetObject("C:\no\such\file.xyz", "Scripting.Dictionary")` | 432 | -2147467262 (`E_NOINTERFACE`, *No such interface supported*) |
| `GetObject(, "No.Such.Class")`, `GetObject("", "No.Such.Class")` | 429 | -2147221005 |
| `GetObject(, "Scripting.Dictionary")`, no instance running | 429 | -2147221021 (`MK_E_UNAVAILABLE`, *Operation unavailable*) |

Observed in the compiler's test mode and in built exes, 32-bit and 64-bit.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `createobject-getobject-raw-hresults.twinproj` (attached as `createobject-getobject-raw-hresults.zip`).
2. Run its test cases, the module below. On BETA 1010 the three controls pass and the other eight fail, each with the number in the table.

The module is meant to be adapted as a regression test. Each case asserts VB6's number, which the attached VB6 project (`createobject-getobject-raw-hresults-vb6.zip`) prints; 64-bit VBA raises the same numbers.
```vb
' Regression tests: CreateObject and GetObject raise 429, ActiveX component can't create
' object, or 432, File name or class name not found during Automation operation, as VB6 and
' 64-bit VBA do (the VB6 project beside this one prints them), not the HRESULT COM returned.
' tbrun --tests runs each case and prints PASS or FAIL.
[TestFixture]
Module RegressionTests

    ' Controls: a class that exists is created, and Null raises 94.
    [TestCase]
    Public Sub CreateObject_RegisteredClass_Creates()
        Dim O As Object
        On Error Resume Next
        Set O = CreateObject("Scripting.Dictionary")
        Assert.Strict.AreEqual 0&, Err.Number
    End Sub

    [TestCase]
    Public Sub CreateObject_Null_Raises94()
        Dim O As Object
        On Error Resume Next
        Set O = CreateObject(Null)
        Assert.Strict.AreEqual 94&, Err.Number
    End Sub

    [TestCase]
    Public Sub GetObject_EmptyPathWithClass_Creates()
        Dim O As Object
        On Error Resume Next
        Set O = GetObject("", "Scripting.Dictionary")
        Assert.Strict.AreEqual 0&, Err.Number
    End Sub

    ' The defect: each of these raises the HRESULT, or 5.
    [TestCase]
    Public Sub CreateObject_UnknownClass_Raises429()
        Dim O As Object
        On Error Resume Next
        Set O = CreateObject("No.Such.Class")
        Assert.Strict.AreEqual 429&, Err.Number
    End Sub

    [TestCase]
    Public Sub CreateObject_UnregisteredClsid_Raises429()
        Dim O As Object
        On Error Resume Next
        Set O = CreateObject("new:{00000000-0000-0000-0000-000000000000}")
        Assert.Strict.AreEqual 429&, Err.Number
    End Sub

    [TestCase]
    Public Sub CreateObject_MalformedClsid_Raises429()
        Dim O As Object
        On Error Resume Next
        Set O = CreateObject("new:not-a-guid")
        Assert.Strict.AreEqual 429&, Err.Number
    End Sub

    [TestCase]
    Public Sub CreateObject_EmptyClass_Raises429()
        Dim O As Object
        On Error Resume Next
        Set O = CreateObject("")
        Assert.Strict.AreEqual 429&, Err.Number
    End Sub

    [TestCase]
    Public Sub GetObject_MissingFile_Raises432()
        Dim O As Object
        On Error Resume Next
        Set O = GetObject("C:\no\such\file.xyz")
        Assert.Strict.AreEqual 432&, Err.Number
    End Sub

    [TestCase]
    Public Sub GetObject_MissingFileWithClass_Raises432()
        Dim O As Object
        On Error Resume Next
        Set O = GetObject("C:\no\such\file.xyz", "Scripting.Dictionary")
        Assert.Strict.AreEqual 432&, Err.Number
    End Sub

    [TestCase]
    Public Sub GetObject_UnknownClass_Raises429()
        Dim O As Object
        On Error Resume Next
        Set O = GetObject(, "No.Such.Class")
        Assert.Strict.AreEqual 429&, Err.Number
    End Sub

    [TestCase]
    Public Sub GetObject_NoRunningInstance_Raises429()
        Dim O As Object
        On Error Resume Next
        Set O = GetObject(, "Scripting.Dictionary")
        Assert.Strict.AreEqual 429&, Err.Number
    End Sub

End Module
```

**Expected behavior**
429 or 432, as in the table's VB6 column, as VB6 and 64-bit VBA raise.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: low. A handler written for VB6 or VBA that tests for 429, the usual check that a component is installed, misses every one of these.

A 64-bit build gives the same results. 64-bit VBA here is VBA 7.1 (VBE7.DLL 7.01.1158) in 64-bit Microsoft 365 Access.

What does not reproduce it: a `servername` that cannot be reached (-2147023174, *The RPC server is unavailable.*, in all four), and a `pathname` that is not a moniker Windows can read (`GetObject("notaprogid:xyz")`, -2147221020 in all four). VB6 gives the `GetObject` of a missing file with a class 432 with the description *Class not registered*.

<!-- Reproducer: bugs/createobject-getobject-raw-hresults/ (mode test: `tbrun --tests`; expect lists the three PASS and eight FAIL lines, each with the number BETA 1010 raises); run on BETA 1010 with `bug_repro.mjs run`; 64-bit from the run-time errors data (`errors.mjs run`). VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints 429 and 432. Stated in the Common Errors sections of CreateObject and GetObject (rows `bug: createobject-getobject-raw-hresults`), from errors/VBA.Interaction.yml; when fixed, each row's `error` becomes 429 or 432 and its `vb6` and `bug` go. Found 2026-10-22 by batch 6a of WIP.Errors.md. -->

---

## A COM object's own error reaches `CallByName` and a late-bound property assignment as &H80020009, *Exception occurred.*

**Describe the bug**
When a COM object such as a `Scripting.Dictionary` raises an error of its own, a late-bound method call gets the object's number, as in VB6: `d.Add "x", 2` on a dictionary that holds `"x"` raises 457, *This key is already associated with an element of this collection*. The same call through `CallByName`, with any call type, and a late-bound property assignment, raise -2147352567 (`&H80020009`, `DISP_E_EXCEPTION`), *Exception occurred.*, instead:
- `CallByName d, "Add", VbMethod, "x", 2`: VB6 and 64-bit VBA raise 457.
- `CallByName d, "Remove", VbMethod, "nope"`: VB6 and 64-bit VBA raise 32811, which the late-bound statement `d.Remove "nope"` raises in twinBASIC too.
- `d.CompareMode = 1` on a dictionary that has items, and `CallByName d, "CompareMode", VbLet, 1`: VB6 and 64-bit VBA raise 5.

Also, `CallByName(d, "", VbGet)`, with a zero-length name, raises 438, *Object doesn't support this property or method*, where VB6 and 64-bit VBA raise 450, *Wrong number of arguments or invalid property assignment*.

Related: the queued entry *An error raised with a constant number, in a member called late-bound, reaches the caller as &H80020009, Exception occurred.* is the same number for a twinBASIC member's `Err.Raise`; this one is a COM object's error, which a late-bound method statement already gets right. The queued entry *A failure code from a late-bound call is raised as the HRESULT* covers `CallByName` with the wrong number of arguments (450) and arguments given to a property that takes none (451). Observed in the compiler's test mode and in built exes, 32-bit and 64-bit.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `callbyname-dispatch-hresults.twinproj` (attached as `callbyname-dispatch-hresults.zip`).
2. Run its test cases, the module below. On BETA 1010 the three controls pass and the other five fail: four with -2147352567 and the empty name with 438.

The module is meant to be adapted as a regression test. Each case asserts VB6's number, which the attached VB6 project (`callbyname-dispatch-hresults-vb6.zip`) prints; 64-bit VBA raises the same numbers.
```vb
' Regression tests: an error a COM object raises reaches CallByName, and a late-bound property
' assignment, as the object's own number, as it reaches a late-bound method call, and as VB6
' and 64-bit VBA give it (the VB6 project beside this one prints them); CallByName with an empty
' name raises 450. The object is a Scripting.Dictionary. tbrun --tests runs each case and prints
' PASS or FAIL.
[TestFixture]
Module RegressionTests

    Private Function NewDictionary() As Object
        Set NewDictionary = CreateObject("Scripting.Dictionary")
    End Function

    ' Controls: a late-bound method call gets the object's own number, and CallByName of a
    ' name the object does not have raises 438.
    [TestCase]
    Public Sub LateBound_AddExistingKey_Raises457()
        Dim D As Object
        Set D = NewDictionary()
        D.Add "x", 1
        On Error Resume Next
        D.Add "x", 2
        Assert.Strict.AreEqual 457&, Err.Number
    End Sub

    [TestCase]
    Public Sub LateBound_RemoveMissingKey_Raises32811()
        Dim D As Object
        Set D = NewDictionary()
        On Error Resume Next
        D.Remove "nope"
        Assert.Strict.AreEqual 32811&, Err.Number
    End Sub

    [TestCase]
    Public Sub CallByName_UnknownName_Raises438()
        Dim D As Object
        Dim V As Variant
        Set D = NewDictionary()
        On Error Resume Next
        V = CallByName(D, "Nope", VbGet)
        Assert.Strict.AreEqual 438&, Err.Number
    End Sub

    ' The defect: the object's own error arrives as -2147352567, Exception occurred.
    [TestCase]
    Public Sub CallByName_AddExistingKey_Raises457()
        Dim D As Object
        Set D = NewDictionary()
        D.Add "x", 1
        On Error Resume Next
        CallByName D, "Add", VbMethod, "x", 2
        Assert.Strict.AreEqual 457&, Err.Number
    End Sub

    [TestCase]
    Public Sub CallByName_RemoveMissingKey_Raises32811()
        Dim D As Object
        Set D = NewDictionary()
        On Error Resume Next
        CallByName D, "Remove", VbMethod, "nope"
        Assert.Strict.AreEqual 32811&, Err.Number
    End Sub

    [TestCase]
    Public Sub LateBound_CompareModeAfterAdd_Raises5()
        Dim D As Object
        Set D = NewDictionary()
        D.Add "x", 1
        On Error Resume Next
        D.CompareMode = 1
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub CallByName_CompareModeAfterAdd_Raises5()
        Dim D As Object
        Set D = NewDictionary()
        D.Add "x", 1
        On Error Resume Next
        CallByName D, "CompareMode", VbLet, 1
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    ' The defect: an empty name raises 438, where VB6 raises 450.
    [TestCase]
    Public Sub CallByName_EmptyName_Raises450()
        Dim D As Object
        Dim V As Variant
        Set D = NewDictionary()
        On Error Resume Next
        V = CallByName(D, "", VbGet)
        Assert.Strict.AreEqual 450&, Err.Number
    End Sub

End Module
```

**Expected behavior**
The object's own error number, as a late-bound method statement already gives it, and as VB6 and 64-bit VBA give it through `CallByName` and a late-bound property assignment; 450 for an empty name.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: low. Code that calls an object by name, or sets its properties late-bound, cannot tell its errors apart: every one is *Exception occurred.*

A 64-bit build gives the same results. 64-bit VBA here is VBA 7.1 (VBE7.DLL 7.01.1158) in 64-bit Microsoft 365 Access.

What does not reproduce it: a late-bound method statement (`d.Add "x", 2` raises 457, `d.Remove "nope"` 32811); `CallByName` of a name the object does not have, which raises 438 in all four.

<!-- Reproducer: bugs/callbyname-dispatch-hresults/ (mode test: `tbrun --tests`; expect lists the three PASS and five FAIL lines); run on BETA 1010 with `bug_repro.mjs run`; 64-bit from the run-time errors data (`errors.mjs run`). VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints 457, 32811, 438, 457, 32811, 5, 5 and 450. Stated in the Common Errors section of CallByName (rows `bug: callbyname-dispatch-hresults`), from errors/VBA.Interaction.yml; when fixed, each row's `error` becomes VB's number and its `vb6` and `bug` go. Found 2026-10-22 by batch 6a of WIP.Errors.md. -->

---

## `RaiseEventByName` and `RaiseEventByName2` end the program for an object that declares no events, and raise an error for an event no handler is attached to

**Describe the bug**
Two defects of the same two functions:
- Given an object that declares no events, such as a `Collection` or a `Scripting.Dictionary`, `RaiseEventByName` and `RaiseEventByName2` end the program with an access violation (`&HC0000005`), with no error a handler can catch. `Nothing` raises 91, as it should.
- Given an object that declares the event, with no handler attached to it, both raise -2147467259 (`&H80004005`), *Unspecified error*. The `RaiseEvent` statement inside the class raises nothing for an event no handler is attached to. With a handler attached, both functions call it.

The crash was observed in the compiler's test mode, where the access violation ends the case and not the run, and in a built exe, where it ends the program; the error without a handler in the test mode; each 32-bit and 64-bit.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `raiseeventbyname-no-events-crash.twinproj` (attached as `raiseeventbyname-no-events-crash.zip`). It holds the class `EventSource`, which declares one event, the class `Listener`, which handles it, and the test module.
2. Run its test cases. On BETA 1010 the five controls pass, the two cases without a handler fail with -2147467259, and the three cases with a `Collection` or a `Dictionary` fail with `NATIVE EXCEPTION: ACCESS_VIOLATION`.

The modules are meant to be adapted as regression tests. VB6 has no `RaiseEventByName`, so the crash cases assert only that some error is raised.
```vb
' A class that declares one event, for the controls and the no-handler cases. Raise is what
' the RaiseEvent statement does with the same event: with no handler attached, nothing.
Class EventSource

    Public Event Changed(ByVal Value As Long)

    Public Sub Raise(ByVal Value As Long)
        RaiseEvent Changed(Value)
    End Sub

End Class
```
```vb
' Handles EventSource's event and counts the calls, for the control that raises it with a
' handler attached.
Class Listener

    Private WithEvents Source As EventSource
    Public Calls As Long
    Public LastValue As Long

    Public Sub Attach(ByVal S As EventSource)
        Set Source = S
    End Sub

    Private Sub Source_Changed(ByVal Value As Long)
        Calls = Calls + 1
        LastValue = Value
    End Sub

End Class
```
```vb
' Regression tests: RaiseEventByName and RaiseEventByName2 raise an error, and do not end the
' program, for an object that declares no events; and an event with no handler attached is
' raised with no error, as the RaiseEvent statement raises it. tbrun --tests runs each case in
' the compiler's test mode, where an access violation ends the case and not the run, and prints
' PASS or FAIL. The crash cases assert only that some error is raised: VB6 has no
' RaiseEventByName to say which.
[TestFixture]
Module RegressionTests

    ' Controls: Nothing raises 91, a declared event with a handler attached calls it, and a name
    ' the object does not declare raises an error.
    [TestCase]
    Public Sub RaiseEventByName_Nothing_Raises91()
        Dim O As Object
        On Error Resume Next
        RaiseEventByName O, "Changed", Array(1)
        Assert.Strict.AreEqual 91&, Err.Number
    End Sub

    [TestCase]
    Public Sub RaiseEventByName_DeclaredEventWithHandler_CallsIt()
        Dim S As New EventSource
        Dim L As New Listener
        L.Attach S
        On Error Resume Next
        RaiseEventByName S, "Changed", Array(7)
        Assert.Strict.AreEqual 0&, Err.Number
        Assert.Strict.AreEqual 1&, L.Calls
        Assert.Strict.AreEqual 7&, L.LastValue
    End Sub

    [TestCase]
    Public Sub RaiseEventByName2_DeclaredEventWithHandler_CallsIt()
        Dim S As New EventSource
        Dim L As New Listener
        L.Attach S
        On Error Resume Next
        RaiseEventByName2 S, "Changed", 7
        Assert.Strict.AreEqual 0&, Err.Number
        Assert.Strict.AreEqual 1&, L.Calls
    End Sub

    [TestCase]
    Public Sub RaiseEvent_NoHandler_DoesNothing()
        Dim S As New EventSource
        On Error Resume Next
        S.Raise 1
        Assert.Strict.AreEqual 0&, Err.Number
    End Sub

    [TestCase]
    Public Sub RaiseEventByName_UndeclaredEventName_RaisesAnError()
        Dim S As New EventSource
        Dim L As New Listener
        L.Attach S
        On Error Resume Next
        RaiseEventByName S, "Nope", Array(1)
        Assert.Strict.AreNotEqual 0&, Err.Number
    End Sub

    ' The defect: a declared event with no handler attached raises -2147467259, where
    ' RaiseEvent Changed(1) inside the class does nothing.
    [TestCase]
    Public Sub RaiseEventByName_DeclaredEventNoHandler_Succeeds()
        Dim O As Object
        Set O = New EventSource
        On Error Resume Next
        RaiseEventByName O, "Changed", Array(1)
        Assert.Strict.AreEqual 0&, Err.Number
    End Sub

    [TestCase]
    Public Sub RaiseEventByName2_DeclaredEventNoHandler_Succeeds()
        Dim O As Object
        Set O = New EventSource
        On Error Resume Next
        RaiseEventByName2 O, "Changed", 1
        Assert.Strict.AreEqual 0&, Err.Number
    End Sub

    ' The defect: an object that declares no events ends the program.
    [TestCase]
    Public Sub RaiseEventByName_Collection_RaisesAnError()
        Dim O As Object
        Set O = New Collection
        On Error Resume Next
        RaiseEventByName O, "Changed", Array(1)
        Assert.Strict.AreNotEqual 0&, Err.Number
    End Sub

    [TestCase]
    Public Sub RaiseEventByName_Dictionary_RaisesAnError()
        Dim O As Object
        Set O = CreateObject("Scripting.Dictionary")
        On Error Resume Next
        RaiseEventByName O, "Changed", Array(1)
        Assert.Strict.AreNotEqual 0&, Err.Number
    End Sub

    [TestCase]
    Public Sub RaiseEventByName2_Collection_RaisesAnError()
        Dim O As Object
        Set O = New Collection
        On Error Resume Next
        RaiseEventByName2 O, "Changed", 1
        Assert.Strict.AreNotEqual 0&, Err.Number
    End Sub

End Module
```

**Expected behavior**
An error for an object that declares no events, as for a name the object does not declare (which raises an error today), and no error for an event no handler is attached to, as `RaiseEvent` does.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: high for the crash: a program loses its unsaved data, and an error handler cannot prevent it. Low for the error without a handler, though it makes the function unusable for an event a caller may or may not have handled.

A 64-bit build gives the same results.

<!-- Reproducer: bugs/raiseeventbyname-no-events-crash/ (mode test: `tbrun --tests`; expect lists the five PASS and five FAIL lines); run on BETA 1010 with `bug_repro.mjs run` and `--arch win64`. In a built exe the crash ends the program: the run-time errors probe (`errors.mjs run`) stopped there with exception 0xc0000005, 32-bit and 64-bit, which is why the data has no case for it. Stated in a WARNING by hand (the crash) and a NOTE (no handler) on docs/Reference/Default/VBA/Interaction/RaiseEventByName.md and RaiseEventByName2.md, each beside an HTML comment naming this slug; when fixed, both go. Found 2026-10-22 by batch 6a of WIP.Errors.md. -->

---

## A function call in an `#If`, `#ElseIf` or `#Const` expression is always 0, so `#If CBool(1)` is false

**Describe the bug**
Every function call in a conditional compilation expression evaluates as 0, and the IDE reports nothing. `#If CBool(1) Then`, `#If CLng(1) = 1 Then`, `#If Abs(-1) = 1 Then`, `#If Len("abc") = 3 Then` and `#If Len(TWINBASIC_BUILD_TYPE) = 12 Then` (in a Standard EXE) all take the `#Else` branch, and `#Const X = CBool(1)` makes `X` 0. As a result `#If Not CBool(Win64) Then`, the usual way to select 32-bit-only code from a constant that is 1 rather than `True`, is true in a 64-bit build too. Observed in the compiler's test mode, in a `[RunAfterBuild]` run and in the DIAGNOSTICS list (a branch that declares a variable of a type that does not exist reports an error only when it is active), 32-bit and 64-bit.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `ifdef-function-call-is-zero.twinproj` (attached as `ifdef-function-call-is-zero.zip`).
2. Run its test cases, the module below. On BETA 1010 the two controls pass and the seven cases with a function call fail with `Actual: False`; in a 64-bit build `If_NotCBoolOfWin64_AgreesWithWin64EqualsZero` fails too.

The module is meant to be adapted as a regression test. Each case records which branch an `#If` takes and asserts the branch VB6 takes, which the attached VB6 project (`ifdef-function-call-is-zero-vb6.zip`) prints.
```vb
[TestFixture]
Module RegressionTests

    ' Controls: literals, constants and operators alone are evaluated.
    [TestCase]
    Public Sub If_LiteralComparison_IsTrue()
        Dim taken As Boolean
#If 1 = 1 Then
        taken = True
#End If
        Assert.Strict.AreEqual True, taken
    End Sub

    [TestCase]
    Public Sub If_Win32EqualsOne_IsTrue()
        Dim taken As Boolean
#If Win32 = 1 Then
        taken = True
#End If
        Assert.Strict.AreEqual True, taken
    End Sub

    ' The defect: each call is 0.
    [TestCase]
    Public Sub If_CBoolOfOne_IsTrue()
        Dim taken As Boolean
#If CBool(1) Then
        taken = True
#End If
        Assert.Strict.AreEqual True, taken
    End Sub

    [TestCase]
    Public Sub If_CBoolOfWin32_IsTrue()
        Dim taken As Boolean
#If CBool(Win32) Then
        taken = True
#End If
        Assert.Strict.AreEqual True, taken
    End Sub

    [TestCase]
    Public Sub If_NotCBoolOfWin64_AgreesWithWin64EqualsZero()
        Dim notCBool As Boolean, equalsZero As Boolean
#If Not CBool(Win64) Then
        notCBool = True
#End If
#If Win64 = 0 Then
        equalsZero = True
#End If
        Assert.Strict.AreEqual equalsZero, notCBool
    End Sub

    [TestCase]
    Public Sub If_CLngOfOneEqualsOne_IsTrue()
        Dim taken As Boolean
#If CLng(1) = 1 Then
        taken = True
#End If
        Assert.Strict.AreEqual True, taken
    End Sub

    [TestCase]
    Public Sub If_AbsOfMinusOneEqualsOne_IsTrue()
        Dim taken As Boolean
#If Abs(-1) = 1 Then
        taken = True
#End If
        Assert.Strict.AreEqual True, taken
    End Sub

    [TestCase]
    Public Sub If_LenOfLiteralEqualsThree_IsTrue()
        Dim taken As Boolean
#If Len("abc") = 3 Then
        taken = True
#End If
        Assert.Strict.AreEqual True, taken
    End Sub

    [TestCase]
    Public Sub If_LenOfBuildTypeEqualsTwelve_IsTrue()
        ' The project is a Standard EXE: "Standard EXE" has 12 characters.
        Dim taken As Boolean
#If Len(TWINBASIC_BUILD_TYPE) = 12 Then
        taken = True
#End If
        Assert.Strict.AreEqual True, taken
    End Sub

#Const FROM_CALL = CBool(1)

    [TestCase]
    Public Sub Const_FromCBoolOfOne_IsTrue()
        Dim taken As Boolean
#If FROM_CALL Then
        taken = True
#End If
        Assert.Strict.AreEqual True, taken
    End Sub

End Module
```

**Expected behavior**
Each call is evaluated, as VB6 evaluates it: `CBool(1)`, `CBool(Win32)`, `CLng(1) = 1`, `Abs(-1) = 1`, `Len("abc") = 3` and `#Const FROM_CALL = CBool(1)` are all true there. If twinBASIC is not meant to support them, the call should be a compile error rather than a silent 0.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: medium. The wrong branch is compiled with no error or warning, so a program can call a 32-bit declaration in a 64-bit build, or leave out code it meant to keep. `#If Not CBool(Win64)` was the documentation's own advice until now.

A 64-bit build gives the same results. Reported independently on BETA 1024 (docs issue twinbasic/documentation#250), with `VarType(...)` as well.

What does not reproduce it: an expression of constants, literals and operators alone, such as `#If Win64 = 0`, `#If Win64 <> 1` or `#If Not (Win64 = 1)`, each true in a 32-bit build only, as it should be.

<!-- Reproducer: bugs/ifdef-function-call-is-zero/ (mode test: `tbrun --tests`; expect lists the two PASS and seven FAIL lines of a 32-bit run); run on BETA 1010 with `bug_repro.mjs run`, and with `--arch win64`, where the Not CBool(Win64) case fails as well. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints True for every line. Stated in a WARNING labelled BETA 1010 on docs/Reference/Compiler Constants.md (after the IMPORTANT note) and docs/Reference/Core/Topic-Preprocessor.md (under the #If directive), each beside an HTML comment naming this slug; when fixed, both go. Found 2026-10-27 from docs issue #250; that issue's second point, a #Const reaching later modules of the same file, is intended (owner: it works like C's #define), and the pages now say so. -->

---

## `AppActivate`, `InputBox`, `MsgBox` and `Shell` accept arguments VB6 and VBA refuse, and `MsgBox` shows no box for a style Windows refuses

**Describe the bug**
Given an argument VB6 and 64-bit VBA refuse, these procedures go on as if it were valid:
- `Shell` with a *windowstyle* of 10 (`SW_SHOWDEFAULT`) starts the program; VB raises 5, *Invalid procedure call or argument*. `STARTUPINFO.wShowWindow` may hold any `ShowWindow` value but `SW_SHOWDEFAULT`, and `CreateProcessW` does not check it. VB6 and VBA take 0 to 9 after rounding; twinBASIC takes 0 to 10, and raises -2147467259 above (the entry on refused arguments).
- `InputBox` with an *xpos* or *ypos* outside -32,768 to 32,767 after rounding shows the box; VB raises 6, *Overflow*. twinBASIC raises 6 only outside the `Long` range.
- `MsgBox` and `InputBox` with a *context* and no *helpfile* show the box; VB raises 5.
- `MsgBox` and `InputBox` with a *helpfile* of `Null` raise 94, *Invalid use of Null*; VB raises 5.
- `AppActivate` of a hidden window raises nothing and leaves it hidden; VB raises 5. With a *wait* of `Null` or a string that is not a `Boolean` it raises nothing; VB raises 94 and 13.
- `MsgBox` passes *buttons* to Windows as it is, and when Windows refuses the style (a button group of 7 to 15, such as 7, 15 or -1) it shows no box, returns 0 and raises nothing. It should raise 5. (VB6 and VBA show an OK box for any style they do not know and return 1; passing every style Windows accepts to it is a welcome extension, `vbCancelTryAgainContinue` among them, but a style Windows refuses should not pass silently.) A style of -1 also carries `MB_SERVICE_NOTIFICATION`, which twinBASIC hands to Windows as well; Windows refuses it for its button group before it would show anything.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `interaction-missing-argument-checks.twinproj` (attached as `interaction-missing-argument-checks.zip`).
2. Run its test cases, the module below. On BETA 1010 the three controls pass and the other twelve fail.

The module is meant to be adapted as a regression test. Each case asserts VB6's number, which the attached VB6 project (`interaction-missing-argument-checks-vb6.zip`) prints, with how many boxes it showed; 64-bit VBA raises the same numbers. Every case runs under a copy of a dialog harness that answers each box `MsgBox` or `InputBox` shows at once (a `WH_CBT` hook that sends the box `WM_COMMAND` from Cancel, else its first button), and refuses a box for another desktop (it patches `MessageBoxIndirectA/W`), so no case waits for a person. That is also why `MsgBox_StyleMinus1_Raises5` reports 1002 today: the harness refuses the service-notification style twinBASIC passes on. The harness and a window helper are in the attached project, left out below.
```vb
' Regression tests: AppActivate, InputBox, MsgBox and Shell refuse the arguments VB6 and 64-bit
' VBA refuse, with the numbers they raise (the VB6 project beside this one prints them), and
' MsgBox raises 5 for a style Windows refuses, where it now shows no box and returns 0.
' The dialog harness answers every box a case shows, so no case waits for a person, and no
' box can open on another desktop. tbrun --tests runs each case and prints PASS or FAIL.
[TestFixture]
Module RegressionTests
    ' ... the copies of the dialog and window harnesses: in the attached project ...

    ' A control: twinBASIC already does this.
    [TestCase]
    Public Sub Shell_WindowStyle9_Runs()
        Dim V As Variant
        On Error Resume Next
        V = Shell("cmd.exe /c exit", 9)
        Assert.Strict.AreEqual 0&, Err.Number
    End Sub

    ' A control: twinBASIC already does this.
    [TestCase]
    Public Sub MsgBox_HelpFileAndContext_ShowsBox()
        Dim V As Variant
        On Error Resume Next
        dialog_Begin
        V = MsgBox("x", , , "help.hlp", 5)
        dialog_End
        Assert.Strict.AreEqual 0&, Err.Number
    End Sub

    ' A control: twinBASIC already does this.
    [TestCase]
    Public Sub AppActivate_VisibleWindow_Activates()
        Dim V As Variant
        On Error Resume Next
        window_Begin
        AppActivate window_Title()
        window_End
        Assert.Strict.AreEqual 0&, Err.Number
    End Sub

    [TestCase]
    Public Sub Shell_WindowStyle10_Raises5()
        Dim V As Variant
        On Error Resume Next
        V = Shell("cmd.exe /c exit", 10)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub InputBox_XPos32768_Raises6()
        Dim V As Variant
        On Error Resume Next
        dialog_Begin
        V = InputBox("x", , , 32768, 0)
        dialog_End
        Assert.Strict.AreEqual 6&, Err.Number
    End Sub

    [TestCase]
    Public Sub InputBox_YPosMinus32769_Raises6()
        Dim V As Variant
        On Error Resume Next
        dialog_Begin
        V = InputBox("x", , , 0, -32769)
        dialog_End
        Assert.Strict.AreEqual 6&, Err.Number
    End Sub

    [TestCase]
    Public Sub MsgBox_ContextWithoutHelpFile_Raises5()
        Dim V As Variant
        On Error Resume Next
        dialog_Begin
        V = MsgBox("x", , , , 5)
        dialog_End
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub InputBox_ContextWithoutHelpFile_Raises5()
        Dim V As Variant
        On Error Resume Next
        dialog_Begin
        V = InputBox("x", , , , , , 5)
        dialog_End
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub MsgBox_HelpFileNull_Raises5()
        Dim V As Variant
        On Error Resume Next
        dialog_Begin
        V = MsgBox("x", 0, "t", Null)
        dialog_End
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub InputBox_HelpFileNull_Raises5()
        Dim V As Variant
        On Error Resume Next
        dialog_Begin
        V = InputBox("x", , , , , Null)
        dialog_End
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub AppActivate_HiddenWindow_Raises5()
        Dim V As Variant
        On Error Resume Next
        window_Begin
        window_Hide
        AppActivate window_Title()
        window_End
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub AppActivate_WaitNull_Raises94()
        Dim V As Variant
        On Error Resume Next
        window_Begin
        AppActivate window_Title(), Null
        window_End
        Assert.Strict.AreEqual 94&, Err.Number
    End Sub

    [TestCase]
    Public Sub AppActivate_WaitString_Raises13()
        Dim V As Variant
        On Error Resume Next
        window_Begin
        AppActivate window_Title(), "x"
        window_End
        Assert.Strict.AreEqual 13&, Err.Number
    End Sub

    [TestCase]
    Public Sub MsgBox_ButtonGroup7_Raises5()
        Dim V As Variant
        On Error Resume Next
        dialog_Begin
        V = MsgBox("x", 7)
        dialog_End
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    ' -1 has MB_SERVICE_NOTIFICATION too, which twinBASIC passes to Windows: the dialog
    ' harness refuses that call, so the case reports 1002 until twinBASIC raises 5 first.
    [TestCase]
    Public Sub MsgBox_StyleMinus1_Raises5()
        Dim V As Variant
        On Error Resume Next
        dialog_Begin
        V = MsgBox("x", -1)
        dialog_End
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

End Module
```

**Expected behavior**
The numbers VB6 and 64-bit VBA raise: 5 for `Shell`'s *windowstyle* 10, for *context* without *helpfile*, for a *helpfile* of `Null` and for a hidden window; 6 for *xpos* and *ypos* outside the `Integer` range; 94 and 13 for `AppActivate`'s *wait*. And 5 from `MsgBox` for a style Windows refuses.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045), system locale 1033
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: medium for `MsgBox`, whose answer to a style Windows refuses is 0, which no `VbMsgBoxResult` is: a program that tests the answer takes a wrong branch, silently. Low for the rest, each of which lets a mistake in an argument go unreported.

A 64-bit build gives the same results. 64-bit VBA here is VBA 7.1 (VBE7.DLL 7.01.1158) in 64-bit Microsoft 365 Access.

What does not reproduce it: a *windowstyle* of 0 to 9; *xpos* and *ypos* inside the `Integer` range; a *helpfile* with a *context*; a visible or a minimized window (which none of the runtimes restores); a `Boolean` *wait*; a style Windows accepts.

<!-- Reproducer: bugs/interaction-missing-argument-checks/ (mode test: `tbrun --tests`; expect lists the three PASS and twelve FAIL lines); verified on BETA 1010 by `bug_repro.mjs verify`; 64-bit from the run-time errors data (`errors.mjs run`, all four runtimes). Both sides carry copies of errors/harnesses/dialog.bas and window.bas, written by a generator from them. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints VB's number for each case and the boxes it showed. Stated in the Common Errors sections (rows `bug: interaction-missing-argument-checks`) of AppActivate, InputBox, MsgBox and Shell, from errors/VBA.Interaction.yml, and in the WARNING on docs/Reference/Default/VBA/Interaction/MsgBox.md (MsgBox styles Windows refuses); when fixed, each row's case moves to a row of VB's number and the NOTEs and the WARNING go. Found 2026-10-22 to 2026-10-27 by batch 6b of WIP.Errors.md; owner: bugs, one entry. -->
