---
title: Compiler Harness
parent: Tools and Scripts
grand_parent: Documentation Development
nav_order: 4
permalink: /Documentation/Development/Tools-Compiler
---

# Compiler Harness
{: .no_toc }

Compiles, builds and runs twinBASIC projects by operating the twinBASIC IDE on a private desktop, and packs and unpacks project files. The command-line conventions every tool shares are under [Command-line conventions](Tools#command-line-conventions).

* TOC goes here
{:toc}

## tbbuild.mjs
{: #tbbuild }

    node scripts/tbbuild.mjs <project.twinproj> [--ide <twinBASIC.exe>] [--port N]
                             [--arch win32|win64] [--timeout S] [--build | --llvm]
                             [--json] [--keep] [--show|--hide]

Compiles a `.twinproj` and prints its diagnostics, with no IDE window to click through. Use it to check a claim about the language: write a one-module project that uses the construct where you are asking about, run this, and read what comes back. Windows only; not part of the site build.

twinBASIC has no command-line build. None of the compiler executable's verbs --- `export`, `import`, `settings`, `licence`, `changelog`, `readme` --- builds, and the IDE's `--buildAndExit32` and `--buildAndExit64` print nothing, exit 0 for an error in code nothing calls, and never exit for one the build reaches. So the tool drives the IDE over CDP, through a DevTools port set with `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`. The diagnostics are what the IDE's *copy compilation error report* command gives.

| Flag | Effect |
|---|---|
| `--ide <path>` | Path to `twinBASIC.exe`. Default: `$TB_IDE`, else the newest `twinBASIC_IDE_BETA_<n>` folder on `%USERPROFILE%\Desktop`. **No install path is hardcoded in this tooling**, because one contains a username, so an install kept elsewhere needs one of those two. |
| `--port <n>` | DevTools port. Default 9333. It also names the WebView2 user-data folder, the IDE's temp folder (`%TEMP%\tbbuild-tmp-<n>`, its `TEMP` and `TMP`) and the private desktop, so runs on distinct ports can go at once. Both folders (`%TEMP%\tbbuild-tmp-<n>` and the user-data folder, `%TEMP%\tbbuild-wv2-<n>`, about 28 MB) are emptied when the IDE starts and removed once it has ended. A port another IDE already holds is refused after ten seconds. |
| `--arch <target>` | `win32` or `win64`. Default `win32`. Diagnostics can differ, because `#If Win64` and the size of `LongPtr` change what compiles. The target is set on every run, whatever the IDE last used for the project; a switch restarts the compiler and adds a few seconds. When the target is not `win32`, or the IDE remembered another, the report starts with a `target:` line. |
| `--timeout <secs>` | Give up waiting for the compile to settle. Default 180. |
| `--build` | After a compile with no errors, build the project as the toolbar's Build button does, and print `built: <file>` after the summary line. The given file is never changed (see below). |
| `--llvm` | `--build` with the project's compiler options set to `+llvm`. Refused, with exit 2, on a Community or Personal licence, which would silently build with the default compiler. A plain `--build` is the control for an `--llvm` run. |
| `--json` | Emit one JSON object instead of lines of text: the target, counts, diagnostic rows, the text of any alert the IDE opened (dismissed so the compile can go on), `built` (the file a build wrote, or null) and `buildLog`. |
| `--keep` | Leave the IDE running and print its pid as `ide-pid: <n>`, then the `taskkill` command that ends it and every process it started, for cmd and PowerShell and for Git Bash (`//PID`). The IDE's registry entries for the project and its folders under `%TEMP%` are left as they are, since the IDE is still using them; ending it does not remove them, and the next run on the same port empties them. |
| `--show` / `--hide` | Run the IDE on your own desktop, where you can watch it, or on a private one, where it cannot take focus. Hidden is the default unless `TBBUILD_SHOW` is set to something other than `0`, `false` or `no`. |

**A compile does not generate code, and a build does.** LLVM code generation can refuse a construct the compiler's front end accepts ("a feature used in your code is not yet supported with the LLVM compiler"), so a clean compile says nothing about an LLVM build. `--build` and `--llvm` press Build after the compile and read the build log.

A packed project's default build path opens a *Save* dialog that the private desktop hides. So either flag first exports the project into `%TEMP%\tbbuild\<port>\src`, packs a copy with an explicit build path under `%TEMP%\tbbuild\<port>\out` and a project id of its own, and opens that copy. Once the run is over the copy and its sources are removed, and so is the whole folder when nothing was built. After a build that succeeded, `%TEMP%\tbbuild\<port>\out` stays, because it holds the file `built:` names; the next run on that port replaces it.

- A project with compile errors is not built: the report is the compile's, with exit 1.
- A build that fails, or that ends the compiler with a native exception, prints the build log on stdout and the failing line on stderr, and exits 5.
- A `[RunAfterBuild]` procedure runs during the build, and the log it erases with `Debug.Cls` is still read.

**It runs the IDE on a private Windows desktop**, because the IDE calls `HostForceFocus()` when it loads and takes the keyboard whatever window style it starts with. The cost: a wedged IDE there is invisible until you run again visible. Export `TBBUILD_SHOW=1` while you work interactively, and leave it unset for unattended runs.

**One IDE handles one project.** Loading a second project into a running IDE wedges it, so each project gets a fresh IDE, at roughly 6 to 8 seconds whatever its size. To make a batch of probes fast, run them at once on distinct `--port` values. Keep a question that might crash the compiler in a project of its own, so one bad probe cannot cost the others their answer.

**The IDE it starts ends with it.** The IDE runs inside a Windows job object, so when `tbbuild` ends --- finished, failed, or stopped with Ctrl+C --- every process the IDE started ends too, a restarting compiler included. The exceptions are `--keep`, where the IDE lives until you close it, and `--show`, where it starts on your desktop without the job.

**It leaves the IDE's own settings as it found them.** Every IDE it starts writes to the registry keys your own IDE uses: the project's saved state (open tabs, watch expressions, Debug Console history), its place in the recent-projects list, and, after a target switch, its remembered target. Once the IDE has exited, `tbbuild` deletes the entries the run created and gives a project of yours its old values back. The `.twinproj` file association is restored too, if the IDE changed it. [`check_examples.mjs`](Tools-Samples#check-examples) and [`sweep_attributes.mjs`](Tools-Samples#sweep-attributes) do this once for all their lanes.

Seven files under `scripts/lib/` belong to it and are never run directly:

- `tb-build.mjs` --- `tbbuild` without its command line. Its `compileProject` returns a project's diagnostics as an array, so `check_examples.mjs` and `sweep_attributes.mjs` build many projects in one process. It never exits the process and never restores the registry: its caller does both.
- `tb-ide.mjs` --- what `tb-build.mjs` and `tbrun.mjs` share: starting the IDE, attaching to it, waiting for the compile, and reading the diagnostics.
- `tb-ide-console.mjs` --- reads the IDE's DEBUG CONSOLE, where `tbrun` finds what a probe printed.
- `tb-run.mjs` --- presses Build and reads that console until a `[RunAfterBuild]` Sub has finished, and checks what was erased for a failed build. `tbrun` and `check_examples.mjs`'s `check_run` both capture a run with it.
- `tb-registry.mjs` --- records and restores the registry entries above, through .NET's registry API by way of PowerShell, because `reg.exe` mangles any path holding a character outside the console code page. [`check_tb_registry.mjs`](#check-tb-registry) is its self-test.
- `tb-cdp.mjs` --- a minimal CDP client over Node's global `WebSocket`, not puppeteer, whose `connect()` hangs while a pending `alert()` blocks the renderer. Every call has a time limit, so a blocked page ends a run with a message.
- `tb-launch.ps1` --- the Win32 calls Node cannot make without a native FFI addon: `CreateDesktop` and `CreateProcess` with `STARTUPINFO.lpDesktop` for the private desktop, and the job object. `tb-ide.mjs` passes its text through `-EncodedCommand`, so the execution policy does not apply.

Exit codes: **0** the project compiled without errors; **1** the project has errors; **2** a refused command line (a path that is not a `.twinproj` included), a project file that cannot be read (empty, cut short or not a project: it is read before an IDE starts, and the message names the file and the fault), no IDE, an IDE that did not start or expose a debug port, a project that could not be exported or packed, an `--llvm` run on a Community or Personal licence, or a crash; **3** the compile never settled: the IDE did not report the project open, or its diagnostics did not match its status bar; **4** the project crashes the compiler; **5** the build failed after a clean compile.

## tbrun.mjs
{: #tbrun }

    node scripts/tbrun.mjs <source-dir> [--port N] [--arch win32|win64] [--timeout S]
                           [--quiet MS] [--json] [--raw] [--keep] [--no-reap]
                           [--reap-images a,b] [--show|--hide]
                           [--llvm | --compiler-options S] [--exe | --tests]

Builds a probe project and captures what it writes to the IDE's
[Debug Console](../../tB/IDE/Debugging/Debug-Console). Where [`tbbuild.mjs`](#tbbuild) answers
*does this compile*, this answers *what does this print*.

It takes an **exported source tree** (the folder holding `Sources/` and `Settings`), not a
`.twinproj`, because it adjusts the project before packing it. It works on a staged copy and
leaves your tree untouched.

The probe is an ordinary module with a [`[RunAfterBuild]`](../../tB/Core/Attributes#runafterbuild)
Sub, which the IDE runs once the exe is linked. It may be in any `.twin` file under `Sources/`,
its subfolders included:

```tb check_build
Module ZoneProbe
    [RunAfterBuild]
    Sub ShowZones()
        Debug.Cls
        Debug.Print "0123456789012345678901234567890123456789"
        Debug.Print "A", "B"
    End Sub
End Module
```

**Begin the probe with `Debug.Cls`.** The IDE writes its own build log to the Debug Console,
and the linker writes there *after* the build, so without it the output comes back interleaved
with `[LINKER]` lines. The script warns when a probe omits it, and when there is no
`[RunAfterBuild]` at all.

**A build that fails after a clean compile is a failed run**, with the IDE's build log printed
as the reason: `[BUILD] failed`. The probe never runs.

Code generation failures are failed runs too:

- A `[RunAfterBuild]` Sub that fails code generation: the build succeeds, the console adds
  `[LINKER] compilation (codegen) error detected in '<module>.<procedure>'`, and nothing in the
  Sub runs, `Debug.Cls` included.
- A procedure the probe *calls* that fails code generation: its error line is written before
  the probe's first statement, and the probe stops at the call. The probe's `Debug.Cls` erases
  that line, but `tbrun` keeps what each clear erases, so it names the line and prints the
  output up to the call.

**A probe that ends before it returns is a failed run, exit 5**, with what it printed
printed all the same. `End` ends a probe that way, and so does an error raised with no
handler in a procedure compiled with LLVM, which ends the run without a report.

To detect this, `tbrun` moves the `[RunAfterBuild]` attribute in the staged copy to a Sub it
adds to the same module, which calls the probe's Sub and then prints a marker line that `tbrun` does not echo. The
attribute is replaced with spaces, so line and column numbers in a diagnostic still match your
file. A probe that leaves a form loaded has returned too, and `tbrun` prints the IDE's
`[DEBUGGER] Waiting for remaining forms to close...` line.

`tbrun` warns when it cannot add the wrapper --- the Sub is in a class, takes parameters, or
is one of several marked --- and the check is then off. A probe that stays silent for longer
than `--quiet` also ends the wait without the marker, so raise `--quiet` for a slow one.

**The capture is complete however much a probe prints.** `tbrun` reads the console's backing
array, not the pane, which is a virtualised list holding only the rows that fit. `Debug.Cls`
is what empties the array, which is the other reason to begin with it.

**A `win64` probe runs in the IDE's 64-bit compiler**, `twinBASIC_win64_noDEP.exe`, because a
`[RunAfterBuild]` Sub runs inside the compiler that built it. So `LenB` of a `LongPtr` is 8,
[**ProcessorArchitecture**](../../tB/Modules/Compilation/ProcessorArchitecture)
returns **vbArchWin64**, and `Environ$("PROCESSOR_ARCHITECTURE")` is `AMD64`. Under `win32`
they are 4, **vbArchWin32** and `x86`.

**Print a line whole when its characters matter.** The IDE escapes text that continues a line
left open by `Debug.Print ...;`: after `Debug.Print "A";`, a following `Debug.Print "&"` shows
in the Debug Console as `A&amp;`, and `tbrun` captures what the console shows.
`Debug.Print "A"; "&"`, in one statement, comes back as `A&`.

**`--llvm` compiles the whole probe with [LLVM](../../LLVM/)**, with no
`[CompilerOptions("+llvm")]` on each procedure. It sets two options in the staged copy:
`compiler.debugOptions`, which the `[RunAfterBuild]` run is compiled with, and
`compiler.buildOptions`, which the exe is. `--compiler-options` sets both to any other
string, such as `"+llvm +optimize"`. A run that uses LLVM --- through either option, the
tree's own settings or a procedure's `[CompilerOptions]` --- is refused when the IDE shows a
Community or Personal licence, which would silently test the default compiler instead.

**`--exe` also runs the exe the build wrote**, after the probe has run in the IDE.

- It starts the exe on a private desktop and closes every box the exe opens by pressing OK,
  printing the box's title and text: an unhandled error in an exe opens a box and waits. It
  ends the exe at `--timeout`.
- The exe runs its `Sub Main`, not the `[RunAfterBuild]` Sub, so a probe for both gives the
  tree a `Main` that calls the probe, and leaves out the template's own module with an empty
  `Main`.
- A built exe writes nothing with `Debug.Print`, so the probe prints with `TbRun.Out`, from a
  module `tbrun` adds. It writes to the Debug Console in the IDE, and to a file `tbrun` reads
  in the exe.

The exe's exit code, any fault the Windows Application log records for it, its boxes and its
lines follow the probe's output.

**`--tests` runs the project's own test cases instead**, and builds nothing. A test case is a parameterless **Sub** marked [`[TestCase]`](../../tB/Core/Attributes#testcase) in a **Module** marked [`[TestFixture]`](../../tB/Core/Attributes#testfixture), checked with the [Assert package](../../tB/Packages/Assert/), in any `.twin` file under `Sources/`. `tbrun` runs each one in the compiler's test mode, where a failed assertion, an unhandled run-time error or an access violation ends only its case, and prints `PASS <Module>.<Sub>`, or `FAIL <Module>.<Sub>:` with the reason and the line it stopped on. The IDE has no way to run a test case.

A defect that is a compile-time diagnostic is a **compile case** instead: a line that ends in the comment `' CASE <Name>: TB5074` (one or more codes, separated by commas), `' CASE <Name>: error` or `' CASE <Name>: none`. It passes when the IDE reports each code named, any error, or nothing at all. Compile cases are judged first, and the project's diagnostics follow the case lines. A project with compile errors runs none of its test cases, and says so for each. [`bug_repro.mjs`](Tools-Defects#bug-repro) runs its `test` reproducers this way.

| Flag | Effect |
|---|---|
| `--port <n>` | DevTools port for the IDE. Default 9346. The staging folder and project id are keyed to it, so runs on distinct ports never share a workspace. A port another IDE holds is refused, as for `tbbuild`. |
| `--arch <target>` | `win32` or `win64`. Default `win32`, set on every run, as for `tbbuild`. A `win64` probe runs as a 64-bit process. |
| `--timeout <secs>` | Give up waiting for console output. Default 120. |
| `--quiet <ms>` | How long the console must stop changing before the output counts as complete, when the probe has not returned. Default 2500. Raise it well above that for a probe that drives an out-of-process server, which can take longer to start. |
| `--llvm` | Compile the whole probe, and the exe, with LLVM. The same as `--compiler-options +llvm`. |
| `--compiler-options <s>` | The project's compiler options, for the run and the exe. |
| `--exe` | Also run the built exe; print what it writes with `TbRun.Out`, its exit code, the fault the event log records for it, and the boxes it opened, each closed with OK. |
| `--tests` | Build nothing: judge the compile cases and run each `[TestCase]` Sub in the compiler's test mode, printing `PASS` or `FAIL` for each. `--timeout` is the limit on each case. Not with `--exe`. |
| `--raw` | Keep the console's timestamp column, which is otherwise stripped. |
| `--json` | One object with the path of the built file, the target, the captured lines, whether the probe returned, the licence an LLVM run checked, the exe's run, the IDE pid and anything reaped. |
| `--keep` | Leave the IDE running and print its pid as `ide-pid: <n>` (with `--json`, `idePid`) and the `taskkill` commands, as for `tbbuild`. Implies `--no-reap`, and leaves the IDE's registry entries for the probe as they are. |
| `--no-reap` | Do not harvest automation servers the probe left behind. |
| `--reap-images <a,b>` | Replace the harvested image list. Default: the Office suite. |
| `--show` / `--hide` | As for [`tbbuild.mjs`](#tbbuild): your own desktop or a private one, with `TBBUILD_SHOW` setting the default. |

**A probe that activates a COM server can leak one per run.** `CreateObject("Excel.Application")`
is activated by DCOM, so the `EXCEL.EXE` is a child of `svchost.exe`, out of reach of a tree
kill, and it exits only once every COM reference is released, `Quit` or not.

So `tbrun` snapshots the processes before it starts the IDE, and afterwards harvests each new
one whose image is on the reap list and that has no window open. A new one with a window is
reported and left alone, since it may be a copy the user opened. Two concurrent runs driving Excel cannot tell their servers apart, so the first to
finish harvests both: pass `--no-reap` there and sweep once at the end.

> [!IMPORTANT]
> A project whose `project.buildPath` is still the default `${SourcePath}\Build\...` template
> opens a native *Save* dialog on build. On a private desktop that dialog is invisible, so the
> build never happens, while every health check says the IDE is fine. `tbrun` sets the path to
> a folder of its own in its staged copy. The file keeps the IDE's own name,
> *project name*`_`*target*`.`*extension* --- for example `ArchProbe_win64.exe`.

Like `tbbuild`, it leaves the IDE's registry entries as it found them: it deletes every entry
under its own temp folder once the IDE has exited, and again at the start of a run, which
clears what an earlier run on the same port left behind. **A probe builds for the
target `--arch` names**, whatever the IDE remembers, so a kept IDE switched to `win64` does
not make later runs on the same port build 64-bit.

Exit codes: **0** the probe ran and its output was captured; **1** the project has compile errors (the diagnostics are printed); **2** a refused command line (a source folder that is missing or has no `Settings` file included), no IDE, an IDE that did not start, a compile that never settled, a build that failed after a clean compile, a probe that never ran or stopped at a procedure that failed code generation, an LLVM run on a Community or Personal licence, an `--exe` run with no exe built, `--tests` on a project with no case or with a `[TestCase]` it cannot call (one with parameters, a **Function**, or one outside a `[TestFixture]` module), or a crash; **3** no output: the console held none before the timeout, or the probe printed none after its last `Debug.Cls`; **4** the compiler crashed, or restarted twice, while compiling the project; **5** the probe ended before it returned, its output printed all the same; **6** under `--exe`, the exe exited with a code other than 0, the Application event log records that it faulted, it opened a box (which `tbrun` closed), or it was still running after `--timeout` and was ended, its output, exit code, fault and boxes printed all the same; **7** under `--tests`, a case failed, every case's line printed all the same. A run that would exit 5 exits 5 whatever the exe did.

## probe_build_twice.mjs
{: #probe-build-twice }

    node scripts/probe_build_twice.mjs [--arch win32|win64] [--ide <twinBASIC.exe>] [--port N]
                                       [--timeout S] [--keep-files <dir>]
    node scripts/probe_build_twice.mjs --vb6 [--timeout S] [--keep-files <dir>]

Builds the project of `bugs/build-writes-compiler-addresses/` twice and compares the two exes. It is the measurement behind that reproducer's entry in `BUGS-TO-REPORT.md`: two builds of one unchanged project differ in more than the PE time stamp and checksum. Each exe starts its `.data` section with a deflate-compressed block, and inflated, the blocks of two builds differ in two values that look like heap addresses: 4 bytes each in a win32 exe, and the low 6 bytes of a 64-bit value in a win64 exe. Like [`tbbuild.mjs`](#tbbuild), it needs a twinBASIC install and Windows, and it is outside every gate and outside CI.

Each build is made in a fresh IDE, one after the other on one port, from a project staged again each time into the same folders under `%TEMP%\tbprobe-build-twice\<port>\`, so no path can be what differs. The exe is copied out as soon as the build is done.

The output, in order:

- the two sizes, and whether the section tables are the same;
- the PE time stamp and checksum of each file, which the linker sets and the comparison leaves out;
- the startup block, found by its header (a u32 compressed size, then a u32 inflated size that is a multiple of 1,024, at a 4-byte step of `.data`, then a stream that inflates), with the sizes of the two streams and their padding to the target's pointer size;
- the bytes that differ outside the time stamp, the checksum and the block, by section, one line for each range with its bytes in both files;
- the decompressed bytes of the block that differ, each range read as the little-endian value of the target's pointer size that holds it.

The two blocks are aligned on the end of their padding, so data shifted because one stream is a few bytes longer is not a difference; the padding is compared separately. The last line is the summary, `the decompressed startup blocks of two builds differ in <n> bytes, in <k> ranges (<arch>)`, or `the decompressed startup blocks of two builds are equal (<arch>)`. A stream that does not inflate to exactly the size its header states, or an exe with no such block, ends the probe with exit 2.

| Flag | Effect |
|---|---|
| `--arch <a>` | `win32` or `win64`, the target to build for. Default `win32`. |
| `--ide <path>` | Path to `twinBASIC.exe`, found as for `tbbuild`. |
| `--port <n>` | The first DevTools port to try. Default 9800. The IDE takes the first free port from it. |
| `--timeout <secs>` | The wait for a compile to settle, and again for a build. Default 180. |
| `--keep-files <dir>` | Copy the two exes into `<dir>` (made if missing) as `<arch>-1.exe` and `<arch>-2.exe`. Nothing already in the folder is removed. |
| `--vb6` | Build the reproducer's `vb6/` project twice with VB6 instead, and print every range that differs outside the time stamp and the checksum, by section; a VB6 exe has no deflate-compressed block. VB6 is found as for [`vb6run.mjs`](Tools-Defects#vb6run) (`VB6_EXE`, else the standard install folders) and started only through `scripts/lib/vb6.mjs`, never from a shell. It builds with Unattended Execution, as `bug_repro.mjs vb6` does. Both builds use one folder, because VB6 stores the folder's name in the exe. `--arch`, `--ide` and `--port` are refused with it. |

Exit codes: **0** the compared bytes are equal, the two decompressed blocks or, with `--vb6`, the two files outside the time stamp and the checksum; **1** they differ, so the defect is there; **2** a refused command line, no IDE or no VB6, no free port, an IDE that did not start, a project that did not compile or build, a block that does not inflate to its stated size or is not there, or a crash.

## check_tb_registry.mjs
{: #check-tb-registry }

    node scripts/check_tb_registry.mjs

The self-test for `scripts/lib/tb-registry.mjs`, the code that puts the IDE's registry
entries back after [`tbbuild.mjs`](#tbbuild), [`tbrun.mjs`](#tbrun),
[`addin_test.mjs`](Tools-IDE#addin-test) and [`check_examples.mjs`](Tools-Samples#check-examples). It plays out a
run on a scratch copy of the IDE's keys, under `HKCU\Software\tbharness-selftest`, and checks
that:

- a project of yours that the run opened gets its saved state and its place in the recent
  list back, the run's own entries go, the file association is restored, and a second restore
  writes nothing;
- the recent list loses the copies of the last entry the IDE puts in a short list's empty
  slots, and gets back the oldest entry a full list loses for each project a run opens;
- remembered build targets under the run's folder go, and every other one stays, in its order
  and exact text;
- the IDE's theme, which an add-in scenario switches, comes back, and no other option changes;
- a file association that pointed into the temp folder when a run began --- at another run's
  private copy of the IDE --- is put back pointing at the newest install, or left as it is
  when there is none;
- the module refuses to sweep outside the temp folder or restore a key near the root of the
  registry.

It deletes the scratch key when it ends.

It is not a gate and is not in `test.bat`, because it needs Windows and a real registry, which
the CI runners lack. Run it by hand after changing `tb-registry.mjs`.

Exit codes: **0** every assertion held, **1** an assertion failed, **2** the test could not run to its end: a refused command line, PowerShell failing, or a crash.

## impexp.mjs, impexp.py and impexp
{: #impexp }

    node scripts/impexp.mjs export <project> <folder> [--overwrite]
    node scripts/impexp.mjs import <project> <folder> [--overwrite]
    node scripts/impexp.mjs settings|licence|changelog|readme <project>
    node scripts/impexp.mjs --self-test

Standalone `.twinproj` / `.twinpack` unpacker and packer, with the compiler executable's own command line: the same six commands, the project file first, and `--overwrite` required to replace anything. `scripts/impexp.py` is the same tool, run as `python scripts/impexp.py ...`, and `scripts/impexp/` is a third edition, a twinBASIC console program that runs as `impexp_win32.exe ...`. The three editions print the same output, give the same exit codes and write byte-identical project files, which [`check_impexp_parity.mjs`](Tools-Toolchain-Tests#check-impexp-parity) checks. The Node edition needs Node 18+ and the Python edition Python 3.6+; the twinBASIC edition needs Windows and nothing else at run time, and reads and writes its paths as Unicode. None has dependencies. `--self-test` needs only the program, runs the same 20 tests in all three, and adds a round trip of `indexer/sample.twinpack` when it can find that file: the Node and Python editions look in `indexer/` beside their own `scripts/` folder, and the twinBASIC edition in each folder above the exe, then in each folder above the current folder.

The twinBASIC edition exists for readers who have twinBASIC and neither Node nor Python. It is laid out as [`imagestrip`](Tools-IDE#imagestrip) is: `scripts/impexp/src/` is an exported project tree, and `scripts/impexp/impexp.twinproj` is the project file packed from it, which opens in the IDE. Both are checked out byte for byte (`.gitattributes`). After a change to `src/`, pack it again:

    node scripts/impexp.mjs import scripts/impexp/impexp.twinproj scripts/impexp/src --overwrite

Build it in the IDE, which writes `Build\impexp_win32.exe` beside the project file (git ignores it), or with [`tbbuild.mjs`](#tbbuild), which builds in a private folder and prints the path:

    node scripts/tbbuild.mjs scripts/impexp/impexp.twinproj --build

No gate can build it, so `check_impexp_parity.mjs` compares it only when `IMPEXP_EXE` names the built exe, and CI never sets that:

    set IMPEXP_EXE=<path of impexp_win32.exe>
    node scripts/check_impexp_parity.mjs

**None of them is run as a command by the site build.** They are published downloads: `_config.yml`'s `bundle_extra` copies the Node and Python scripts and the twinBASIC project file into `Features/Packages/downloads/` for [Import/Export Tool](../../Features/Packages/Import-Export-Tool). The `bundle_extra` exemption is by exact path, so moving any of the three files breaks the download; see [`check_publish_policy.mjs`](Tools-Toolchain-Tests#check-publish-policy).

The Node edition is also a library. `scripts/lib/tb-project.mjs` imports its `exportProject` and `importProject`, which every tool that unpacks or packs a project calls, among them [`tbbuild.mjs`](#tbbuild), [`tbrun.mjs`](#tbrun), [`check_examples.mjs`](Tools-Samples#check-examples), [`census_attributes.mjs`](Tools-Samples#census-attributes) and [`bug_repro.mjs`](Tools-Defects#bug-repro). The site build imports `importProject` too, to pack the [help add-in's project file](Tools-Build#the-help-add-ins-project-file). `impexp.mjs` is the one module under `scripts/` that `builder/` may import (`biome.jsonc` refuses any other), so [`check_tree_fresh.mjs`](Tools-Site-Checks#check-tree-fresh) watches it.

Exit codes: the table in [Import/Export Tool](../../Features/Packages/Import-Export-Tool#checking-the-result) gives every code. The three editions share these codes, which differ from those of the other tools here.
