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
entry, or `bugs/filed/<slug>/` once the entry has been filed upstream --- and runs them against
the compiler. A slug is kebab-case: lowercase letters and digits joined by single hyphens.
Anything else is refused, as is `filed`, and a slug that exists in both places is an error, exit 2.

It runs [`tbbuild.mjs`](Tools-Compiler#tbbuild) and [`tbrun.mjs`](Tools-Compiler#tbrun), so it
needs a twinBASIC install and Windows. It is outside every gate and outside CI; a person runs
`verify`.

| Command | Effect |
|---|---|
| `new <slug> "<title>"` | Creates `bugs/<slug>/src/` from the console template under `test/example-projects/`, with the project named after the slug in PascalCase, a fresh project id, the description `Reproduces: <title>` and a `Startup` module holding an empty `Sub Main`. Writes `bugs/<slug>/repro.json` with `"mode": "manual"`. Refused, exit 3, when `bugs/<slug>` exists. `--template <name>` starts from a folder of `test/repro-templates/` instead: `webview2-form` is a form holding one WebView2 control that opens `about:blank`, closes when the navigation completes, and is shown modally by `Sub Main`; `tests` is the console project with the Assert package referenced and a `[TestFixture]` module, `RegressionTests`, holding one example `[TestCase]`. `--with-vb6` also creates `bugs/<slug>/vb6/` from `test/repro-templates/vb6/`: `Probe.vbp` and `Module1.bas`, whose `Sub Main` opens `out.txt` beside the exe, prints one line under an error handler and closes. `--with-images` also copies `PngDump.twin` from `test/repro-templates/png/` into `src/Sources/` and, with `--with-vb6`, `PngDump.bas` into `vb6/` with its `Module=PngDump; PngDump.bas` line in `Probe.vbp`, and writes `"images": ["main"]` into `repro.json`. |
| `pack <slug>` | Packs `src/` into `<slug>.twinproj` with [`impexp.mjs`](Tools-Compiler#impexp) and writes `<slug>.zip` holding that file, the files `repro.json`'s `attach` names, and every file of `images/`. It prints the path of each `<name>-compare.png`, the pictures to put in the issue. When `bugs/<slug>/vb6/` exists, it also writes `<slug>-vb6.zip` with that folder's source files (`.vbp`, `.bas`, `.cls`, `.frm`, `.frx`, `.ctl` and `.ctx`) and nothing else, naming the files it left out. A `vb6/` with no `Probe.vbp`, or whose sources call `MsgBox` or `InputBox`, is refused. |
| `compile <slug>` | Packs, then compiles the project with `tbbuild --json` and prints its diagnostics. |
| `build <slug>` | Packs, then compiles and builds it with `tbbuild --build`, or `--llvm` when that is given. A failed build prints the build log and the failing line. |
| `run <slug>` | Copies `src/` to `%TEMP%\bugrepro\<port>\<slug>`, adds a `TbRunProbe` module whose `[RunAfterBuild]` Sub calls `Debug.Cls` and then `Main`, runs `tbrun` on the copy and prints what it captured. The Sub clears `WEBVIEW2_USER_DATA_FOLDER` and `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` while `Main` runs, because the harness sets both and they would stop a WebView2 control in the project from starting. With `--exe` no probe module is added: `tbrun` runs `Sub Main` in the built exe. With `images` in `repro.json`, `run` gives `tbrun` an empty folder in `BUGREPRO_IMAGES`, which the IDE and, with `--exe`, the exe inherit, and keeps each picture as `images/<name>-tb.png`; a picture the probe did not write is a failure that names it, exit 9. Apart from those pictures, `run` changes nothing under `bugs/`. A reproducer whose mode is `test` is run with `tbrun --tests` on `src/` instead, with no probe module; a failed case is exit 1, and `--exe` and `--llvm` are refused. |
| `vb6 <slug>` | Builds the reproducer's VB6 project in `vb6/` and prints what its exe wrote. By convention `Probe.vbp` builds `Probe.exe`, which writes its findings to `out.txt` beside the exe and handles every error itself. It needs no IDE. The sources are built from a copy under the OS temp folder, so nothing lands in the repository. It finds and starts VB6, and runs the exe, as [`vb6run.mjs`](#vb6run) does: Unattended Execution (dropped for a project with a form, user control, property page, user document or designer, which VB6 refuses it for), a private desktop, a time limit, and a refusal, exit 2, of sources that call `MsgBox` or `InputBox`. An unhandled error in an exe built with Unattended Execution exits with code 0 and leaves no fault; the VB runtime writes it to the Application event log, and that record is reported. `--timeout` is the exe's time limit (default 30 s), and `--keep` keeps the work folder and prints where it is. With `images` in `repro.json`, the exe is given an empty folder in `BUGREPRO_IMAGES`, and each picture it wrote is kept as `images/<name>-vb6.png`. |
| `verify [slug ...]` | Reads `repro.json` for each named reproducer, or every one under `bugs/` and `bugs/filed/`, runs what it says and reports one line each. A filed reproducer's line is labelled with its issue, such as `(filed #2453)`, and the summary counts the filed ones on a line of their own. |
| `file <slug> <issue>` | Moves the entry that names `` `<slug>.twinproj` `` out of `BUGS-TO-REPORT.md`, with one `---` beside it, into `bugs/filed/<slug>/REPORT.md`. Its first line links the issue (with `--existing`, "Covered by the existing issue ..."), and it holds no mark line. Then moves `bugs/<slug>/` to `bugs/filed/<slug>/` and records `issue` (and `existing`) in its `repro.json`. An entry whose reproducer is not an attachment names `bugs/<slug>/` in its closing comment instead. Refused, exit 2 and nothing changed, when no entry or more than one names the slug, `bugs/<slug>` is missing, or `bugs/filed/<slug>` exists. |
| `file --marked` | Does that for every entry with a mark line directly under its title: `*FILED #<n>*`, `*CAPTURED IN EXISTING #<n>*` or `*CAPTURED IN \#<n>*`. The issue and the slug are taken from the entry. A line such as `*DEFERRED until after v1*` is not a mark, and the entry is skipped. If a mark cannot be read, or a slug cannot be settled, the entries concerned are printed and nothing is filed, exit 2. Takes neither a slug nor an issue. |

The options of `compile`, `build` and `run` are those of `tbbuild` and `tbrun` of the same
name, and are passed to them: `--ide`, `--port` (default 9440), `--arch`, `--timeout`,
`--keep` and `--show` / `--hide`, with `--llvm` for `build` and `run`, and `--exe` for `run`.
An option that does not apply to a command is refused. `vb6` takes `--vb6`,
`--timeout` and `--keep` only, and `--with-vb6` is for `new` alone.

A VB6 project in `vb6/` has no key in `repro.json`: the folder is the marker. `attach` may
not name `<slug>-vb6.zip` or a path under `vb6/`. `verify` runs the twinBASIC side only, and
never starts VB6.

**A graphical defect carries pictures.** `images` in `repro.json` names them: what twinBASIC
drew beside what VB6 drew. Two modules draw them, `PngDump.twin` in `src/Sources/` and
`PngDump.bas` in `vb6/` (`new --with-images` copies both from `test/repro-templates/png/`),
with the same members: `PngDump.Surface Form1, "main"` for an object that has an `hDC`, and
`PngDump.Window Text1.hWnd, "text"` for a control with none. Each copies the pixels with
`BitBlt` or `PrintWindow` into a bitmap of its own and saves it with GDI+, so the picture is
what was drawn, not what the object's `Image` property or `SavePicture` would make of it.
The file is `<name>.png` in the folder `BUGREPRO_IMAGES` names, which `run` and `vb6` set,
else in `App.Path`. A name uses letters, digits, `-` and `_`. Any failure raises error 5 with
a description of the call that failed, and no message box opens.

`run` keeps each picture as `bugs/<slug>/images/<name>-tb.png`, and `vb6` as `<name>-vb6.png`.
When both exist, `<name>-compare.png` shows twinBASIC, VB6 and their difference side by side,
with the beta that drew the first named over it. A pixel that differs is pure red in the
difference panel. Each command prints `image <name>: identical`, or how many pixels differ.

The entry in `BUGS-TO-REPORT.md` embeds each `-compare.png` under **Screenshots** as
`![...](bugs/<slug>/images/<name>-compare.png)`: `pack` warns when it does not,
`test/png.test.mjs` fails, and `file` rewrites the path to `images/<name>-compare.png` in
`REPORT.md`, which sits beside the pictures. A copy of either module that differs from the
template draws a warning and nothing more. `verify` keeps its pictures in the temp folder and
never changes the tree.

**`repro.json` says how to ask the compiler about a reproducer.** It is committed with the
reproducer and is not part of the `.twinproj`. A missing key, or a value of the wrong type, is
refused with exit 2, naming the file and the key, before anything runs.

| Key | Meaning |
|---|---|
| `mode` | `compile`, `build`, `run`, `test`, `cli`, `lane`, `probe` or `manual`. `test` holds the issue's regression tests, `[TestCase]` Subs and compile cases: `verify` and `run` run it with `tbrun --tests` on `src/`, and `expect.output` lists the `PASS` lines of what is fixed and the `FAIL` lines of the bug, so a build that fixes the bug, and one that undoes an earlier fix, both stop reproducing. `lane` is a bug that a lane of [`ide_test.mjs`](Tools-IDE#ide-test) or [`addin_test.mjs`](Tools-IDE#addin-test) asserts, such as one that needs a click in the IDE. `probe` is one that a script of its own checks, such as one that needs several IDEs at once. `manual` is one only a person can run. A `cli`, `lane`, `probe` or `manual` reproducer may have no `src/`, when the bug is in files the installation ships or the lane brings its own project; `verify` then runs it without packing, and `{project}` and `{src}` are refused. |
| `lane` | `lane` mode. `ide:<lane>` or `addin:<lane>`: the suite, and the lane's name as `--only` matches it. A lane the suite's `lanes.mjs` does not list is refused. |
| `tests` | `lane` mode. The names of the lane's tests that pass while the bug is there, as the lane's report prints them. The reproducer reproduces when every one of them passes. |
| `probe` | `probe` mode. A script under `scripts/`, then its arguments: `verify` runs `node <script> <arguments>` from the repository's root, adding `--ide` when it was given one, and judges the exit code and the output by `expect`. The script starts and ends what it needs itself, and must end on its own. |
| `arch` | Optional. `win32` (default) or `win64`. |
| `llvm` | Optional, `build` and `run`. `true` builds with LLVM. |
| `exe` | Optional, `run` only. `true` also runs the built exe, as `run --exe` does: no probe module is added, `Sub Main` runs in the exe, and an exe that exits with a code other than 0, faults or opens a box is `tbrun`'s exit 6. `Debug.Print` writes nothing in an exe, so `expect.output` can match only what `TbRun.Out` wrote; a bug that crashes the exe is expected as `"exit": 6`. |
| `expect.exit` | The exit code of `tbbuild` or `tbrun` as they print it, not this tool's mapped code; for `cli`, the compiler executable's; for `probe`, the script's. |
| `expect.diagnostics` | `compile`. Diagnostic codes, such as `TB5182`, that must all be reported. |
| `expect.noDiagnostics` | `compile`. `true` expects no error, warning, hint or information. |
| `expect.message` | `build`. A regular expression the message `tbbuild` prints on standard error must match. |
| `expect.output` | `run`, `test`, `cli` and `probe`. Regular expressions, each of which must match the output. They are matched line by line, so `^` and `$` hold at each line. |
| `expect.absent` | `run`, `test`, `cli` and `probe`. Regular expressions, none of which may match the output, such as an `ERROR` line the bug's fix would print. |
| `cli` | `cli` mode. The arguments for the compiler executable, `bin\twinBASIC_win32.exe`, or a list of such lists, run in turn. Their output is joined, and their exit code is the one they all gave, or the codes joined by commas, such as `0,999`. `{tmp}` stands for a new temp folder, deleted afterwards; `{project}` for a copy of the packed `.twinproj` in it, and `{src}` for a copy of `src/`, so a command that writes either never touches the committed reproducer; `{ide}` for the folder of the IDE that `--ide` names or that is found, so a file the installation ships can be named without a user name. Give an output folder with backslashes and a trailing one, as `export` requires. Each command runs on a private desktop, inside a job that ends everything it starts; `--timeout` (default 120 seconds) is the limit on each. The compiler opens a modal message box for some inputs, such as a damaged project, so the tool presses OK on every dialog a command opens. A command's output begins with one line for each box, in the order they opened, `dialog: <title>: <text>` with the box's text on one line, then its standard output, then its standard error. `expect.output` and `expect.absent` are matched against that. |
| `steps` | What a person does to see the bug, for the issue. `verify` prints it for a `manual` reproducer. |
| `images` | Optional, `run` and `manual`. A non-empty list of picture names, each of letters, digits, `-` and `_`, without repeats. The project needs a `PngDump.twin` under `src/Sources/` and, when there is a `vb6/`, a `vb6/PngDump.bas` and a `Module=PngDump; PngDump.bas` line in its `Probe.vbp`; without them the file is refused. |
| `expect.imagesDiffer` | `run`, with `images`. `true` reproduces only when at least one picture of the fresh run differs from the committed `images/<name>-vb6.png`, a difference in size counting; `false` only when all of them match. `images/<name>-vb6.png` must exist for every name, or the file is refused. |
| `attach` | Optional. Files besides the project that the issue needs, such as a `.twinpack`: paths relative to the reproducer's folder, with forward slashes. `pack` adds each to `<slug>.zip`. A `cli` command finds a copy of each in its temp folder, at the same relative path: `{tmp}\garbage.twinproj` for `garbage.twinproj`, so a command may damage or write to it. |
| `issue` | Optional. A positive whole number, the number of the `twinbasic/twinbasic` issue the bug was filed as. `file` writes it. |
| `existing` | Optional, with `issue` only. `true` when the issue was not filed for this bug but already covered it. `file --existing` writes it. |

A `verify` line is one of four things:

- **reproduces**: everything `expect` names is as expected.
- **NO LONGER REPRODUCES**: it ran, and something expected is not so. The bug may be fixed in this build and the entry ready to retire; for a filed bug, a fix has been released. A `lane` reproducer whose test failed also reports this, so read the lane's report before retiring the entry: a test can fail for another reason.
- **manual**: not automatable; `steps` is printed.
- **harness failed**: the tool could not do its job, as for a `tbbuild` or `tbrun` exit of 2, or a compile that never settled. That says nothing about the bug unless `expect.exit` names it. For a `lane` reproducer it also means the suite's runner exited 2 or 3, or a named test is missing from the lane's report.

Reproducers run one at a time. `--jobs N` runs N at once, each in the IDE on its own port, from
`--port` up. The `lane` reproducers run last: each suite's runner once, with `--only` naming
every lane they need.

Exit codes: **0** done --- a project that compiled, built or ran as it should, or, for `verify`, every reproducer that can be run on its own still reproduces; **1** a finding: the project has errors, or its build failed after a clean compile, or, for `vb6`, VB6 refused the project, or, for `verify`, at least one reproducer no longer reproduces; **2** a refused command line, a `repro.json` that is not valid, no IDE, a project that could not be packed, a harness that failed, or a crash; for `vb6`, no VB6, a reproducer with no `vb6/` folder, a project that has no `Probe.vbp` or calls `MsgBox` or `InputBox`, or VB6 failing to build it; for `verify`, a lane's harness failed; for `file`, an entry that is missing, ambiguous or marked unreadably, or a `bugs/filed/<slug>` already there, with nothing changed; **3** `new` found `bugs/<slug>` or `bugs/filed/<slug>` already there; **4** the compile never settled; **5** the project crashes the compiler; **6** `run`: the probe printed nothing; for `vb6`, the exe wrote no `out.txt`, or an empty one; **7** `run`: the probe ended before it returned; **8** `run --exe`, and `vb6`: the exe exited with a code other than 0, or was still running after `--timeout`, or the Application event log records that it faulted (a VB6 exe that dies of an access violation exits with code 0), or it opened a box, or, with `vb6`, the VB runtime logged an unhandled error for it in the Application log; **9** `run` and `vb6`: a picture that `images` names was not written, or could not be read.

## vb6run.mjs
{: #vb6run }

    node scripts/vb6run.mjs <file | -> [--vb6 <path>] [--timeout S] [--keep] [--json]
    node scripts/vb6run.mjs --docs [--only <regex>] [--vb6 <path>] [--timeout S] [--keep] [--json]

Builds and runs Visual Basic 6 code, so that what a documented sample prints in twinBASIC can be compared with what it prints in VB6. It needs Windows and VB6, which it finds from `--vb6 <path>`, else the `VB6_EXE` environment variable, else `VB98\VB6.EXE` under `C:\Program Files (x86)\Microsoft Visual Studio` and then under `C:\Program Files\Microsoft Visual Studio`. With none of them it exits 2 and says how to point at one. It is outside every gate and outside CI, and is run by a person, as [`check_examples.mjs`](Tools-Samples#check-examples) is.

**Nothing may open a dialog, and VB6 is never started through a shell.** The tool starts `VB6.EXE` from Node with an argument array. Started from Git Bash by hand, `/make` and `/out` are rewritten as paths, and VB6 answers every switch it does not know with a modal message box on the desktop. A compiled exe also shows a modal box for an unhandled run-time error, for `MsgBox` and for `InputBox`. So:

- each sample runs under an error handler the tool generates;
- the project is built with VB6's Unattended Execution option, which writes such a box to the Windows event log;
- a sample that calls `MsgBox` or `InputBox` or contains an `End` statement is refused without being built, as `check_run` refuses it;
- the exe runs on a private desktop, inside a job that ends everything it starts, as `tbrun --exe` runs one. A box it opens all the same is closed by pressing OK and reported.

Every process the tool starts has a time limit and is ended by its pid when it runs over. Each run's work folder is under the OS temp folder and removed at the end; `--keep` leaves it and prints where it is.

**`Debug.Print` is rewritten.** It writes nothing in a compiled exe, so the tool rewrites each `Debug.Print` statement to `Print #511,` against a file the generated `Sub Main` opens. `Print #` takes the same arguments (`;`, `,`, `Spc`, `Tab`). A `Debug.Print` inside a string or a comment is left alone, and one after a `:` or after `Then` or `Else` is rewritten. VB6 writes the file in the ANSI code page, and the tool reads it as Windows-1252. A sample that calls `Close` with no file number also closes that file, and its next `Debug.Print` raises error 52.

| Mode | Effect |
|---|---|
| `<file>` | A `.bas` module, or a text file of bare statements; `-` reads statements from standard input. A file that defines `Sub Main` is a whole module: it is built as written, its `Sub Main` is renamed so that the generated `Main` can start it, and it keeps its `Attribute VB_Name` line or is given one. Any other file is the body of a generated procedure. What the sample printed goes to standard output. A compile error is reported to standard error as VB6 reports it, with the line given as a line of the file, and a run-time error as `[vb6] error <n>: <description>`. |
| `--docs` | Reads the documentation's `check_run` fences with the reader `check_examples.mjs` uses and builds each as a module of its own in a VB6 project; fences that need no other fence share one project. The run fences of a `projname=` group are built in a project of their own, with the group's other fences, each of which is a file. A `slot=file` fence is translated into VB6 components: every `Class <Name>` block becomes a class module and every `Module <Name>` block a standard module (`Public`, `Private` or `Friend` before the keyword is accepted), and anything outside those blocks (`Declare`, `Type`, `Enum`, `Const`, procedures) becomes one more standard module. Nothing else is translated. A construct VB6 has no form for, such as an `Interface`, a `CoClass`, a generic or an attribute line, stays where it is and VB6 refuses it, so each run fence of a group whose files do not build is `not VB6`, with the first error at its line in the page. A fence that says `project=form` is built with a blank `Form1.frm`, so without Unattended Execution, and its forms are unloaded when the sample ends. On a `Declare` statement, `PtrSafe` is dropped and `LongPtr` is read as `Long`. A compile error stops VB6 at the first module that fails, so that module is dropped and the project is built again until it builds. Each run fence ends as one of:<br>`same` --- VB6 prints what the page says twinBASIC prints.<br>`differs` --- the lines that differ, the page against VB6, with the page path and line.<br>`not VB6` --- VB6 refuses to compile it, with its first error; most twinBASIC syntax ends here, and it is informational.<br>`error` --- a run-time error, the exe ended during it, or it did not return.<br>`refused` --- the sample cannot be run, for the reasons `check_run` gives.<br>A summary line gives the count of each. `--only <regex>` keeps the pages whose path under `docs/` matches. |

Other options: `--timeout S` is the time limit, in seconds, for each run of the built exe (default 30), and `--json` prints one JSON object in place of the text.

Exit codes: **0** the sample ran, or, with `--docs`, no fence differs and none raised an error; **1** a VB6 compile error, a run-time error, a sample during which the exe ended (a VB6 exe that dies of an access violation can exit with code 0, so the exe ending before the time limit in the middle of a sample is what shows it; the fault the Application event log records is named when there is one, and so are a box the exe opened and what the VB runtime logged) or a sample that did not return, or, with `--docs`, at least one fence that differs or raised an error; **2** the harness could not run --- a refused command line, a file that is missing, a sample that is refused, no VB6, VB6 failing to build, or a crash.
