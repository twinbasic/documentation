---
title: Defect Reproducers
parent: Tools and Scripts
grand_parent: Documentation Development
nav_order: 7
permalink: /Documentation/Development/Tools-Defects
---

# Defect Reproducers
{: .no_toc }

Builds and verifies the reproducer projects for twinBASIC defects, and runs VB6 code to compare what twinBASIC does with what VB6 does. The command-line conventions every tool shares are under [Command-line conventions](Tools#command-line-conventions).

* TOC goes here
{:toc}

## bug_repro.mjs
{: #bug-repro }

    node scripts/bug_repro.mjs new <slug> "<entry title>" [--template <name>] [--with-vb6] [--with-images]
    node scripts/bug_repro.mjs pack <slug>
    node scripts/bug_repro.mjs compile|build|run <slug> [--ide <twinBASIC.exe>] [--port N]
                               [--arch win32|win64] [--timeout S] [--llvm] [--exe] [--keep] [--show|--hide]
    node scripts/bug_repro.mjs vb6 <slug> [--vb6 <VB6.EXE>] [--timeout S] [--keep]
    node scripts/bug_repro.mjs verify [slug ...] [--ide <twinBASIC.exe>] [--port N] [--timeout S]
                               [--jobs N] [--show|--hide]
    node scripts/bug_repro.mjs file <slug> <issue> [--existing]
    node scripts/bug_repro.mjs file --marked

Keeps the reproducer projects of `BUGS-TO-REPORT.md` --- one folder, `bugs/<slug>/`, for each
entry, or `bugs/filed/<slug>/` once the entry has been filed upstream --- and puts them in
front of the compiler. A slug is kebab-case, lowercase letters and digits joined by single
hyphens, and anything else is refused, as is `filed`. A slug that exists in both places is an
error, exit 2. Like [`tbbuild.mjs`](Tools-Compiler#tbbuild)
and [`tbrun.mjs`](Tools-Compiler#tbrun), which it runs, it needs a twinBASIC install and Windows. It is
outside every gate and outside CI, and `verify` is run by a person only.

| Command | Effect |
|---|---|
| `new <slug> "<title>"` | Creates `bugs/<slug>/src/` from the console template under `test/example-projects/`, with the project named after the slug in PascalCase, a fresh project id, the description `Reproduces: <title>` and a `Startup` module holding an empty `Sub Main`. Also writes `bugs/<slug>/repro.json` with `"mode": "manual"`. Refused, with exit 3, when `bugs/<slug>` exists. `--template <name>` starts from a folder of `test/repro-templates/` instead: its `Settings`, with the same four keys rewritten, and its `Sources/` as they are. `webview2-form` is a form holding one WebView2 control, which opens `about:blank` when the control is ready and closes when that navigation completes, shown modally by `Sub Main`. `tests` is the console project with the Assert package referenced and a `[TestFixture]` module, `RegressionTests`, holding one example `[TestCase]`. `--with-vb6` also creates `bugs/<slug>/vb6/` from the VB6 template in `test/repro-templates/vb6/`: `Probe.vbp` and `Module1.bas`, whose `Sub Main` opens `out.txt` beside the exe, prints one line under an error handler and closes. `--with-images` also copies `PngDump.twin` from `test/repro-templates/png/` into `src/Sources/` and, with `--with-vb6`, `PngDump.bas` into `vb6/` with its `Module=PngDump; PngDump.bas` line in `Probe.vbp`, and writes `"images": ["main"]` into `repro.json`. |
| `pack <slug>` | Packs `src/` into `<slug>.twinproj` with [`impexp.mjs`](Tools-Compiler#impexp), called directly, and prints the lines that `impexp.mjs import` prints. It then writes `<slug>.zip` holding that file and the files `repro.json`'s `attach` names. The zip is written by the script itself, so neither PowerShell nor 7-Zip is needed. When `bugs/<slug>/vb6/` exists, it also writes `<slug>-vb6.zip`, holding the source files of that folder (`.vbp`, `.bas`, `.cls`, `.frm`, `.frx`, `.ctl` and `.ctx`) and nothing else, so an exe or an output left there is not zipped; the files left out are named. A `vb6/` with no `Probe.vbp`, or whose sources call `MsgBox` or `InputBox`, is refused. The zip also holds every file of `images/`, and `pack` prints the path of each `<name>-compare.png`, the pictures to put in the issue. |
| `compile <slug>` | Packs, then compiles the project with `tbbuild --json` and prints its diagnostics. |
| `build <slug>` | Packs, then compiles and builds it with `tbbuild --build`, or `--llvm` when that is given. A build that fails prints the build log and the failing line. |
| `run <slug>` | Copies `src/` to `%TEMP%\bugrepro\<port>\<slug>`, adds a `TbRunProbe` module whose `[RunAfterBuild]` Sub calls `Debug.Cls` and then `Main`, runs `tbrun` on the copy and prints what it captured. The Sub clears `WEBVIEW2_USER_DATA_FOLDER` and `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` while `Main` runs: the harness starts the IDE with both, and WebView2 lets them override what a WebView2 control in the project asks for, so the control would fail to start inside the IDE's process. Apart from the pictures below, the tree under `bugs/` is not changed. With `--exe` no probe module is added: `tbrun` runs `Sub Main` in the built exe. With `images` in `repro.json`, `run` also gives `tbrun` an empty folder in `BUGREPRO_IMAGES`, which the IDE and, with `--exe`, the exe inherit, and when the run finishes keeps each picture as `images/<name>-tb.png`. A picture the probe did not write is a failure that names it, exit 9. A reproducer whose mode is `test` is run with `tbrun --tests` on `src/` instead, with no probe module, and a failed case is exit 1; `--exe` and `--llvm` are refused for it. |
| `vb6 <slug>` | Builds the reproducer's VB6 project, in `vb6/`, and prints what its exe wrote. By convention `Probe.vbp` builds `Probe.exe`, which writes its findings to `out.txt` beside the exe and handles every error itself. The sources are copied to a new folder under the OS temp folder, so no exe or output lands in the repository, and the copy's project is given VB6's Unattended Execution option, which sends a message box or an unhandled error to the Windows event log instead of the desktop. VB6 refuses that option for a project with a form, a user control, a property page, a user document or a designer, so such a project is built without it. The exe always runs on a private desktop, inside a job that ends everything it starts, as `tbrun --exe` runs one: a box it shows is on no desktop anyone uses, and is closed by pressing OK and reported, and the time limit ends the exe. An unhandled error in an exe built with Unattended Execution exits with code 0 and leaves no fault; the VB runtime writes it to the Application event log instead, and that record is reported. The project is refused, exit 2, when its sources call `MsgBox` or `InputBox`, which would open a modal box. VB6 is found from `--vb6 <path>`, else the `VB6_EXE` environment variable, else `VB98\VB6.EXE` under `C:\Program Files (x86)\Microsoft Visual Studio` and then `C:\Program Files\Microsoft Visual Studio`; it is started from Node with an argument array and no shell, as [`vb6run.mjs`](#vb6run) does it. `--timeout` is the time limit on the exe (default 30 s), and `--keep` keeps the work folder and prints where it is. It needs no IDE. With `images` in `repro.json`, the exe is given an empty folder in `BUGREPRO_IMAGES`, and each picture it wrote is kept as `images/<name>-vb6.png`. |
| `verify [slug ...]` | Reads `repro.json` for each named reproducer, or every one under `bugs/` and `bugs/filed/`, runs what it says and reports one line each. A filed reproducer's line is labelled with its issue, such as `(filed #2453)`, and the summary counts the filed ones on a line of their own. |
| `file <slug> <issue>` | Moves the entry that names `` `<slug>.twinproj` `` out of `BUGS-TO-REPORT.md`, together with one `---` beside it, into `bugs/filed/<slug>/REPORT.md`, whose first line links the issue (`--existing`: "Covered by the existing issue ..." when an existing issue already covered the bug) and which holds no mark line. Then moves `bugs/<slug>/` to `bugs/filed/<slug>/` and records `issue` (and `existing`) in its `repro.json`. An entry whose reproducer is not an attachment names `bugs/<slug>/` in its closing comment instead. Refused, with exit 2 and nothing changed, when no entry or more than one names the slug, `bugs/<slug>` is missing, or `bugs/filed/<slug>` exists. |
| `file --marked` | Does that for every entry with a mark line directly under its title: `*FILED #<n>*`, `*CAPTURED IN EXISTING #<n>*` or `*CAPTURED IN \#<n>*`, the issue and the slug taken from the entry. A line such as `*DEFERRED until after v1*` is not a mark, and the entry is skipped. If a mark cannot be read, or a slug cannot be settled, the entries concerned are printed and nothing at all is filed, exit 2. One line is printed for each entry filed. Takes neither a slug nor an issue. |

The options of `compile`, `build` and `run` are those of `tbbuild` and `tbrun` of the same
name, and are passed to them: `--ide`, `--port` (default 9440), `--arch`, `--timeout`,
`--keep` and `--show` / `--hide`, with `--llvm` for `build` and `run`, and `--exe` for `run`.
An option that does not apply to a command is refused, not ignored. `vb6` takes `--vb6`,
`--timeout` and `--keep` only, and `--with-vb6` is for `new` alone.

A VB6 project in `vb6/` has no key in `repro.json`: the folder says it is there. `pack` and
`verify` check it, and `attach` may not name `<slug>-vb6.zip` or a path under `vb6/`.
`verify` runs the twinBASIC side only, and never starts VB6.

**A graphical defect carries pictures.** What twinBASIC drew beside what VB6 drew shows it
better than a description, and `images` in `repro.json` names them. Two modules draw them,
`PngDump.twin` in `src/Sources/` and `PngDump.bas` in `vb6/` (`new --with-images` copies
both from `test/repro-templates/png/`), and have the same members:
`PngDump.Surface Form1, "main"` for an object that has an `hDC`, and
`PngDump.Window Text1.hWnd, "text"` for a control with none. Each copies the pixels with
`BitBlt` or `PrintWindow` into a bitmap of its own and saves it with GDI+, so the picture is
what was drawn and not what the object's `Image` property or `SavePicture` would make of it.
The file is `<name>.png` in the folder `BUGREPRO_IMAGES` names, which `run` and `vb6` set,
else in `App.Path`. A name uses letters, digits, `-` and `_`. Any failure raises error 5 with
a description of the call that failed, and no message box opens.

`run` keeps each picture as `bugs/<slug>/images/<name>-tb.png`, `vb6` as `<name>-vb6.png`, and
when both exist `<name>-compare.png` shows twinBASIC, VB6 and their difference side by side,
with the beta that drew the first named over it. A pixel that differs is pure red in the
difference panel. Each command prints `image <name>: identical`, or how many pixels differ.
`pack` puts every file of `images/` into `<slug>.zip` and prints the `-compare.png` paths,
which are the pictures to put in the issue. The pictures are part of the report, so the entry in
`BUGS-TO-REPORT.md` embeds each `-compare.png` under **Screenshots** as
`![...](bugs/<slug>/images/<name>-compare.png)`: `pack` warns when it does not, `test/png.test.mjs`
fails, and `file` rewrites the path to `images/<name>-compare.png` in `REPORT.md`, which sits
beside the pictures. A copy of either module that differs from the
template draws a warning and nothing more, because a filed reproducer stays as it was filed.
`verify` never changes the tree: it keeps its pictures in the temp folder.

**`repro.json` says how to ask the compiler about a reproducer.** It is committed with the
reproducer and is not part of the `.twinproj`. A key it does not have, or a value of the
wrong type, is refused with exit 2, naming the file and the key, before anything runs.

| Key | Meaning |
|---|---|
| `mode` | `compile`, `build`, `run`, `test`, `cli`, `lane`, `probe` or `manual`. `test` is a reproducer that holds the issue's regression tests, `[TestCase]` Subs and compile cases: `verify` and `run` run it with `tbrun --tests` on `src/`, and `expect.output` lists the `PASS` lines of what is fixed and the `FAIL` lines of the bug, so that a build that fixes the bug, and one that undoes an earlier fix, both stop reproducing. `lane` is a bug that a lane of [`ide_test.mjs`](Tools-IDE#ide-test) or [`addin_test.mjs`](Tools-IDE#addin-test) asserts, such as one that needs a click in the IDE; `probe` is one that a script of its own measures, such as one that needs several IDEs at once; `manual` is a reproducer that only a person can run. A `cli`, `lane`, `probe` or `manual` reproducer may have no `src/`, when the bug is in files the installation ships or the lane brings its own project; `verify` then runs it without packing, and `{project}` and `{src}` are refused. |
| `lane` | `lane` mode. `ide:<lane>` or `addin:<lane>`: the suite, and the lane's name as `--only` matches it. A lane the suite's `lanes.mjs` does not list is refused. |
| `tests` | `lane` mode. The names of the lane's tests that pass while the bug is there, as the lane's report prints them. The reproducer reproduces when every one of them passes. |
| `probe` | `probe` mode. A script under `scripts/`, then its arguments: `verify` runs `node <script> <arguments>` from the repository's root, adding `--ide` when it was given one, and judges the exit code and the output by `expect`. The script starts and ends what it needs itself, and must end on its own. |
| `arch` | Optional. `win32` (default) or `win64`. |
| `llvm` | Optional, `build` and `run`. `true` builds with LLVM. |
| `exe` | Optional, `run` only. `true` also runs the built exe, as `run --exe` does: no probe module is added, `Sub Main` runs in the exe, and an exe that exits with a code other than 0, faults or opens a box is `tbrun`'s exit 6. `Debug.Print` writes nothing in an exe, so what `expect.output` can match is only what `TbRun.Out` wrote; a bug that crashes the exe is expected as `"exit": 6`. |
| `expect.exit` | The exit code of `tbbuild` or `tbrun` as they print it, not this tool's mapped code; for `cli`, the compiler executable's; for `probe`, the script's. |
| `expect.diagnostics` | `compile`. Diagnostic codes, such as `TB5182`, that must all be reported. |
| `expect.noDiagnostics` | `compile`. `true` expects no error, warning, hint or information. |
| `expect.message` | `build`. A regular expression the message `tbbuild` prints on standard error must match. |
| `expect.output` | `run`, `test`, `cli` and `probe`. Regular expressions, each of which must match the output. They are matched line by line, so `^` and `$` hold at each line. |
| `expect.absent` | `run`, `test`, `cli` and `probe`. Regular expressions, none of which may match the output, such as an `ERROR` line the bug's fix would print. |
| `cli` | `cli` mode. The arguments for the compiler executable, `bin\twinBASIC_win32.exe`, or a list of such lists, run in turn; their output is joined, and their exit code is the one they all gave, or the codes joined by commas, such as `0,999`. `{tmp}` stands for a new temp folder, deleted afterwards; `{project}` for a copy of the packed `.twinproj` in it, and `{src}` for a copy of `src/`, so a command that writes either never touches the committed reproducer; `{ide}` for the folder of the IDE that `--ide` names or that is found, so a file the installation ships can be named without a user name. Give an output folder with backslashes and a trailing one, as `export` requires. Each command runs on a private desktop, inside a job that ends everything it starts, with its standard output and error written to files; `--timeout` (default 120 seconds) is the limit on each. The compiler opens a modal message box for some inputs, such as a damaged project, and waits for it to be closed, and on a private desktop nobody could close it. So the tool reads every dialog box a command opens, and presses its OK button, which lets the command go on. A command's output begins with one line for each box, in the order they opened, `dialog: <title>: <text>` with the box's text on one line, then its standard output, then its standard error, and `expect.output` and `expect.absent` are matched against that. |
| `steps` | What a person does to see the bug, for the issue. `verify` prints it for a `manual` reproducer. |
| `images` | Optional, `run` and `manual`. A non-empty list of picture names, each of letters, digits, `-` and `_`, without repeats. The project needs a `PngDump.twin` under `src/Sources/` and, when there is a `vb6/`, a `vb6/PngDump.bas` and a `Module=PngDump; PngDump.bas` line in its `Probe.vbp`; without them the file is refused. |
| `expect.imagesDiffer` | `run`, with `images`. `true` reproduces only when at least one picture of the fresh run differs from the committed `images/<name>-vb6.png`, a difference in size counting; `false` only when all of them match. `images/<name>-vb6.png` must exist for every name, and the file is refused when one does not. |
| `attach` | Optional. Files besides the project that the issue needs, such as a `.twinpack`: paths relative to the reproducer's folder, with forward slashes. `pack` adds each to `<slug>.zip`. A `cli` command finds a copy of each in its temp folder, at the same relative path: `{tmp}\garbage.twinproj` for `garbage.twinproj`, so a command may damage or write to it. |
| `issue` | Optional. A positive whole number, the number of the `twinbasic/twinbasic` issue the bug was filed as. `file` writes it. |
| `existing` | Optional, with `issue` only. `true` when the issue was not filed for this bug but already covered it. `file --existing` writes it. |

A `verify` line is one of four things. **reproduces**: everything `expect` names is as
expected. **NO LONGER REPRODUCES**: it ran, and something expected is not so; the bug may
be fixed in this build, and the entry may be ready to retire; for a filed bug it is the signal
that a fix has been released. **manual**: not automatable,
and `steps` is printed. **harness failed**: the tool could not do its job, as for a
`tbbuild` or `tbrun` exit of 2, or a compile that never settled; that says nothing about
the bug unless `expect.exit` names it; for a `lane` reproducer, the suite's runner exiting
2 or 3, or a named test missing from the lane's report. A `lane` reproducer whose test
failed is **NO LONGER REPRODUCES**, so read the lane's report before retiring the entry:
a test can fail for another reason. Reproducers run one at a time. `--jobs N` runs N at
once, each in the IDE on its own port, from `--port` up. `verify` tidies the IDE's registry
entries once for all of them, as [`check_examples.mjs`](Tools-Samples#check-examples) does. The `lane`
reproducers run last: each suite's runner once, with `--only` naming every lane they need,
and the runner tidies the registry for its lanes.

Exit codes: **0** done --- a project that compiled, built or ran as it should, or, for `verify`, every reproducer that can be run on its own still reproduces; **1** a finding: the project has errors, or its build failed after a clean compile, or, for `vb6`, VB6 refused the project, or, for `verify`, at least one reproducer no longer reproduces; **2** a refused command line, a `repro.json` that is not valid, no IDE, a project that could not be packed, a harness that failed, or a crash; for `vb6`, no VB6, a reproducer with no `vb6/` folder, a project that has no `Probe.vbp` or calls `MsgBox` or `InputBox`, or VB6 failing to build it; for `verify`, a lane's harness failed; for `file`, an entry that is missing, ambiguous or marked unreadably, or a `bugs/filed/<slug>` already there, with nothing changed; **3** `new` found `bugs/<slug>` or `bugs/filed/<slug>` already there; **4** the compile never settled; **5** the project crashes the compiler; **6** `run`: the probe printed nothing; for `vb6`, the exe wrote no `out.txt`, or an empty one; **7** `run`: the probe ended before it returned; **8** `run --exe`, and `vb6`: the exe exited with a code other than 0, or was still running after `--timeout`, or the Application event log records that it faulted (a VB6 exe that dies of an access violation exits with code 0), or it opened a box, or, with `vb6`, the VB runtime logged an unhandled error for it in the Application log; **9** `run` and `vb6`: a picture that `images` names was not written, or could not be read.

## vb6run.mjs
{: #vb6run }

    node scripts/vb6run.mjs <file | -> [--vb6 <path>] [--timeout S] [--keep] [--json]
    node scripts/vb6run.mjs --docs [--only <regex>] [--vb6 <path>] [--timeout S] [--keep] [--json]

Builds and runs Visual Basic 6 code, so that what a documented sample prints in twinBASIC can be compared with what it prints in VB6. It needs VB6, which it finds from `--vb6 <path>`, else the `VB6_EXE` environment variable, else `VB98\VB6.EXE` under `C:\Program Files (x86)\Microsoft Visual Studio` and then under `C:\Program Files\Microsoft Visual Studio`; with none of them it exits 2 and says how to point at one. It needs Windows, is outside every gate and outside CI, and is run by a person, as [`check_examples.mjs`](Tools-Samples#check-examples) is.

**Nothing may open a dialog, and VB6 is never started through a shell.** The tool starts `VB6.EXE` from Node with an argument array. Started from Git Bash by hand, `/make` and `/out` are rewritten as paths, and VB6 answers every switch it does not know with a modal message box on the desktop. A compiled exe also shows a modal box for an unhandled run-time error, for `MsgBox` and for `InputBox`. So each sample runs under an error handler the tool generates, the project is built with VB6's Unattended Execution option, which writes such a box to the Windows event log, and a sample that calls `MsgBox` or `InputBox` or contains an `End` statement is refused without being built, as `check_run` refuses it. The exe runs on a private desktop, inside a job that ends everything it starts, as `tbrun --exe` runs one: a box it opens all the same is closed by pressing OK and reported, and Windows records a fault in the Application event log only for an exe started that way. Every process the tool starts has a time limit and is ended by its pid when it runs over. Work folders are created under the OS temp folder, one for each run, and removed at the end; `--keep` leaves the folder and prints where it is.

**`Debug.Print` is rewritten.** It writes nothing in a compiled exe. The tool rewrites each `Debug.Print` statement to `Print #511,` against a file the generated `Sub Main` opens, and `Print #` takes the same arguments (`;`, `,`, `Spc`, `Tab`), so the text is the same. A `Debug.Print` inside a string or a comment is left alone, and one after a `:` or after `Then` or `Else` is rewritten. VB6 writes the file in the ANSI code page, and the tool reads it as Windows-1252. A sample that calls `Close` with no file number also closes that file, and its next `Debug.Print` raises error 52.

| Mode | Effect |
|---|---|
| `<file>` | A `.bas` module, or a text file of bare statements; `-` reads statements from standard input. A file that defines `Sub Main` is a whole module: it is built as written, its `Sub Main` is renamed so that the generated `Main` can start it, and it keeps its `Attribute VB_Name` line or is given one. Any other file is the body of a generated procedure. What the sample printed goes to standard output. A compile error is reported to standard error as VB6 reports it, with the line given as a line of the file, and a run-time error as `[vb6] error <n>: <description>`. |
| `--docs` | Reads the documentation's `check_run` fences with the reader `check_examples.mjs` uses and builds each as a module of its own in a VB6 project; the fences that need no other fence share one project. The run fences of a `projname=` group are built in a project of their own, since class and module names collide between groups, together with the other fences of the group, each of which is a file. A `slot=file` fence is translated into VB6 components: every `Class <Name>` block becomes a class module and every `Module <Name>` block a standard module, `Public`, `Private` or `Friend` before the keyword being accepted, and anything outside those blocks (`Declare`, `Type`, `Enum`, `Const`, procedures) becomes one more standard module. Nothing else is translated. A construct VB6 has no form for, such as an `Interface`, a `CoClass`, a generic or an attribute line, stays where it is and VB6 refuses it, so each run fence of a group whose files do not build is `not VB6`, with the first error at its line in the page. Each of the run fences ends as `same` (VB6 prints what the page says twinBASIC prints), `differs` (the lines that differ, the page against VB6, with the page path and line), `not VB6` (VB6 refuses to compile it, with its first error; most twinBASIC syntax ends here, and it is informational), `error` (a run-time error, the exe ended during it, or it did not return), or `refused` (the sample cannot be run, for the reasons `check_run` gives). A fence that says `project=form` is built with a blank `Form1.frm`, which VB6 refuses to build with Unattended Execution, so such a project is built without it; each sample's forms are unloaded when it ends. On a `Declare` statement, `PtrSafe` is dropped and `LongPtr` is read as `Long`, because VB6 knows neither. A compile error stops VB6 at the first module that fails, so that module is dropped and the project is built again until it builds. A summary line gives the count of each. `--only <regex>` keeps the pages whose path under `docs/` matches. |

Other options: `--timeout S` is the time limit, in seconds, for each run of the built exe (default 30), and `--json` prints one JSON object in place of the text.

Exit codes: **0** the sample ran, or, with `--docs`, no fence differs and none raised an error; **1** a VB6 compile error, a run-time error, a sample during which the exe ended (a VB6 exe that dies of an access violation can exit with code 0, so the exe ending before the time limit in the middle of a sample is what shows it; the fault the Application event log records is named when there is one, and so are a box the exe opened and what the VB runtime logged) or a sample that did not return, or, with `--docs`, at least one fence that differs or raised an error; **2** the harness could not run --- a refused command line, a file that is missing, a sample that is refused, no VB6, VB6 failing to build, or a crash.
