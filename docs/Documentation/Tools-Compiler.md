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

Compiles a `.twinproj` and prints its diagnostics, with no IDE window to click through. This is how a claim the documentation makes about the language gets checked against the compiler rather than against memory: write a one-module project that uses the construct in the position you are asking about, run this, and read what comes back. Windows only, and no part of the site build.

twinBASIC has no command-line build. The compiler executable's whole surface is six verbs --- `export`, `import`, `settings`, `licence`, `changelog`, `readme` --- and none of them builds. The IDE executable does take `--buildAndExit32` and `--buildAndExit64`, and both are worse than useless unattended: they write nothing to stdout or stderr, exit 0 when the error is in code nothing calls, and do not exit at all for an error the build reaches. So this drives the IDE. Its user interface is a WebView2 page and WebView2 honours `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`, so the IDE starts with a Chrome DevTools port and is driven over CDP. The diagnostics come from the IDE's own *copy compilation error report* walk with the clipboard write removed, so the text is exactly what that command gives a person.

| Flag | Effect |
|---|---|
| `--ide <path>` | Path to `twinBASIC.exe`. Default: `$TB_IDE`, else the newest `twinBASIC_IDE_BETA_<n>` folder on `%USERPROFILE%\Desktop`, which is where the IDE's own zip says to unpack it. **No install path is hardcoded anywhere in this tooling** --- an install path contains a username --- so an install kept elsewhere needs one of those two. |
| `--port <n>` | DevTools port. Default 9333. It also names the WebView2 user-data folder, the IDE's temp folder (`%TEMP%\tbbuild-tmp-<n>`, its `TEMP` and `TMP`) and the private desktop, which is what makes concurrent instances possible: IDEs building at once in one temp folder fail now and then to write the type library. A port another IDE already holds --- another run's, or another session's --- is refused after ten seconds, rather than attached to. |
| `--arch <target>` | The target to compile for, `win32` or `win64`. Default `win32`. The diagnostics can differ between the two, because `#If Win64` and the size of `LongPtr` change what compiles. The target is set on every run, because the IDE opens a project in whatever target it last used for that project. Switching restarts the compiler, which then compiles the project again, so a switch adds a few seconds. When the target is not `win32`, or the IDE remembered another one for the project, the report starts with a `target:` line. |
| `--timeout <secs>` | Give up waiting for the compile to settle. Default 180. |
| `--build` | After a compile with no errors, build the project, as the toolbar's Build button does, and print `built: <file>` after the summary line. The project is exported and packed again first (see below), so the given file is never changed. |
| `--llvm` | Build with LLVM: `--build`, with the project's compiler options set to `+llvm`. It is refused, with exit 2, on a Community or Personal licence, which would build with the default compiler and say nothing. Without it, `--build` is the control for an `--llvm` run. |
| `--json` | Emit one JSON object --- the target, counts, diagnostic rows, the text of any alert the IDE opened, which is dismissed so the compile can go on, and `built` (the file a build wrote, or null) and `buildLog` --- instead of lines of text. |
| `--keep` | Leave the IDE running afterwards, and print its pid as `ide-pid: <n>`, followed by the `taskkill` command that ends it and every process it started, as cmd and PowerShell spell it and as Git Bash does (`//PID`). The IDE's registry entries for the project are then left as they are, because the IDE is still writing them. |
| `--show` / `--hide` | Put the IDE on your own desktop where you can watch it, or on a private one where it cannot take focus. Hidden is the default unless `TBBUILD_SHOW` is set to something other than `0`, `false` or `no`; the two flags override that for one invocation. |

**A compile does not generate code, and a build does.** The compiler's front end accepts a construct that its LLVM code generation refuses ("a feature used in your code is not yet supported with the LLVM compiler"), so a clean compile says nothing about an LLVM build. `--build` and `--llvm` press Build after the compile and read the build log. The default build path of a packed project opens a *Save* dialog that a private desktop hides, so either flag first exports the project into `%TEMP%\tbbuild\<port>\src`, packs a copy with an explicit build path under `%TEMP%\tbbuild\<port>\out` and a project id of its own, and opens that copy. A project with compile errors is not built: the report is the compile's, with exit 1. A build that fails, or that ends the compiler with a native exception, prints the build log on stdout and the failing line on stderr, and exits 5. A `[RunAfterBuild]` procedure runs during the build, and the log it would erase with `Debug.Cls` is kept and read all the same.

**It runs the IDE on a private Windows desktop, and that is not decoration.** The IDE calls `HostForceFocus()` from its own `window.onload`, so it takes the keyboard whatever window style it starts with --- `start /min` was tried and the window still came to the front. A process on another desktop has no foreground to take, and the compile does not care whether anything is on screen. Hidden by default has one real cost. A wedged IDE on a private desktop is invisible to the person debugging it, and the only way to see anything is to run it again visible. Export `TBBUILD_SHOW=1` for a session you are working through interactively, and leave it unset for unattended runs.

**One IDE handles one project.** Loading a second project into a running IDE wedges it, so a fresh IDE per project is the design rather than a convenience. It costs roughly 6 to 8 seconds each on a development box and is flat in project size, because what is being paid for is IDE startup and not compilation. Concurrency is the way to make a batch of probes fast: distinct `--port` values give distinct DevTools ports, user-data folders and desktops, so instances do not collide. Keep a question that might crash the compiler in a project of its own, so the answer is attributable and one bad probe cannot cost the rest of the batch its run.

**The IDE it starts ends with it.** The IDE runs inside a Windows job object, so when `tbbuild` ends --- finished, failed, or stopped with Ctrl+C --- every process the IDE started ends too. That includes a compiler the IDE was restarting after a crash, which a plain process-tree kill can miss and leave running. Two exceptions: under `--keep` the IDE runs outside the job and lives until you close it, and under `--show` it is started directly on your desktop, without the job.

**It leaves the IDE's own settings as it found them.** Every IDE it starts writes to the same registry keys as your own IDE: a saved state for the project (open tabs, watch expressions, Debug Console history), a place at the top of the recent-projects list, and, when the run switches the target, the target the IDE remembers for the project. Once the IDE has exited, `tbbuild` puts all three back. An entry the run created is deleted, and a project that already had one --- one of your own --- gets its old state, its old place in the list and its old target back. The `.twinproj` file association is restored too, if the IDE changed it. When [`check_examples.mjs`](Tools-Samples#check-examples) or [`sweep_attributes.mjs`](Tools-Samples#sweep-attributes) builds many projects, it does this once for all its lanes instead.

Seven files under `scripts/lib/` belong to it and are never run directly. `tb-build.mjs` is `tbbuild` without its command line: `compileProject` opens a project in the IDE and returns its diagnostics as an array, which is how `check_examples.mjs` and `sweep_attributes.mjs` build many projects without starting a process for each. It never exits the process and never tidies the registry, so its caller owns both. `tb-ide.mjs` holds the mechanics `tb-build.mjs` and `tbrun.mjs` share: starting the IDE, attaching to it, waiting for the compile, and reading the diagnostics. `tb-ide-console.mjs` reads the IDE's DEBUG CONSOLE, which is where `tbrun` finds what a probe printed. `tb-run.mjs` presses Build and reads that console until a `[RunAfterBuild]` Sub has finished, and checks what was erased for a failed build; `tbrun` and `check_examples.mjs`'s `check_run` capture a run with it, so they capture it the same way. `tb-registry.mjs` records and restores the registry entries described above, through .NET's registry API by way of PowerShell, because `reg.exe` mangles any path holding a character outside the console code page; [`check_tb_registry.mjs`](#check-tb-registry) is its self-test. `tb-cdp.mjs` is a minimal CDP client over Node's global `WebSocket`, raw rather than puppeteer because a pending `alert()` blocks the renderer and puppeteer's `connect()` handshake talks to the renderer --- so it hangs on precisely the state you need to recover from. Every call it makes has a time limit, so a blocked page ends a run with a message rather than holding it forever. `tb-launch.ps1` holds the Win32 calls Node cannot make without a native FFI addon: `CreateDesktop` and `CreateProcess` with `STARTUPINFO.lpDesktop` for the private desktop, and the job object described above. It is the only PowerShell file under `scripts/`, and it is not executed as a file: `tb-ide.mjs` reads the text and passes it through `-EncodedCommand`, so the execution policy never comes into it and nobody has to be told to bypass one.

Exit codes: **0** the project compiled without errors; **1** the project has errors; **2** a refused command line (a path that is not a `.twinproj` included), a project file that cannot be read (empty, cut short or not a project at all: it is read before an IDE starts, and the message names the file and what is wrong), no IDE, an IDE that did not start or expose a debug port, a project that could not be exported or packed, an `--llvm` run on a Community or Personal licence, or a crash; **3** the compile never settled: the IDE did not report the project open, or its diagnostics did not match its status bar; **4** the project crashes the compiler; **5** the build failed after a clean compile.

## tbrun.mjs
{: #tbrun }

    node scripts/tbrun.mjs <source-dir> [--port N] [--arch win32|win64] [--timeout S]
                           [--quiet MS] [--json] [--raw] [--keep] [--no-reap]
                           [--reap-images a,b] [--show|--hide]
                           [--llvm | --compiler-options S] [--exe | --tests] [--allow-name-clash]

Builds a probe project and captures what it writes to the IDE's
[Debug Console](../../tB/IDE/Project/DebugConsole). Where [`tbbuild.mjs`](#tbbuild) answers
*does this compile*, this answers *what does this print* --- the questions no shipped source
demonstrates and no amount of reading settles. The width of a `Debug.Print` print zone was
measured with it.

It takes an **exported source tree** (the folder holding `Sources/` and `Settings`), not a
`.twinproj`, because it has to adjust the project before packing it. It stages a copy and
leaves your tree untouched. The staging is in `scripts/lib/tb-project.mjs`.

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

**Begin the probe with `Debug.Cls`.** The Debug Console is also where the IDE writes its own
build log, and the linker writes there *after* the build, so a probe that does not clear it
first comes back interleaved with `[LINKER]` lines. The script warns when a probe omits it,
and warns again when there is no `[RunAfterBuild]` at all.

**A build that fails after a clean compile is a failed run**, with the IDE's build log printed
as the reason. The probe never runs then, so the console still holds that log --- `[BUILD] failed`,
often after `[TYPELIB] failed to finalize typelibrary` --- and `tbrun` does not return it as the
probe's output. Run it again: such a failure can pass on a second run.
A `[RunAfterBuild]` Sub that fails code generation is a failed run the same way: the build succeeds,
the console adds `[LINKER] compilation (codegen) error detected in '<module>.<procedure>'`,
and nothing in the Sub runs, `Debug.Cls` included. A procedure the probe *calls* that fails
code generation is a failed run as well. Its error line is written before the probe's first
statement, so the probe's `Debug.Cls` erases it, and the probe stops at the call. `tbrun`
keeps what each clear erases, so it names that line and prints the output up to the call.

**A probe that ends before it returns is a failed run, exit 5**, with what it printed
printed all the same. `End` ends a probe that way, and so does an error raised with no
handler in a procedure compiled with LLVM, which ends the run without a report. In the
staged copy, `tbrun` moves the `[RunAfterBuild]` attribute to a Sub it adds to the same
module, which calls the probe's Sub and then prints a line of its own. That line is missing
when the probe did not return, and it is never printed. A probe that leaves a form loaded
has returned too: the IDE prints `[DEBUGGER] Waiting for remaining forms to close...` after
that line, and `tbrun` prints it. The attribute is replaced with
spaces, so the line and column numbers in a diagnostic are still the ones in your file.
`tbrun` warns when it cannot add the wrapper --- the Sub is in a class, takes parameters, or
is one of several marked --- and the check is then off. A probe that stays silent for longer
than `--quiet` while it works also ends the wait without that line, so raise `--quiet` for a
slow one.

**On a build before BETA 1005, a probe whose module holds a procedure named like the module is
refused, exit 2**, before an IDE starts. Those builds do not run the `[RunAfterBuild]` Sub of such
a module, whatever the letter case or modifiers of the procedure, and nothing says so, so the run
would end as a probe that stopped early. Rename the module or the procedure, or use BETA 1005 or
later. `--allow-name-clash` runs the probe anyway.

**The capture is complete however much a probe prints**, so there is no reason to keep one
short. `tbrun` reads the console's backing array rather than the pane, which is a virtualised
list view holding only the rows that fit --- reading that instead returns the last ten or so
lines of a long probe and looks no different from a full capture. `Debug.Cls` is what empties
the array, which is the other reason to begin with it.

**A `win64` probe runs in the IDE's 64-bit compiler.** A `[RunAfterBuild]` Sub runs inside
the compiler that built it, not in the file that was built. For `win64` that compiler is
`twinBASIC_win64_noDEP.exe`, a 64-bit process, so the probe sees what 64-bit code sees:
`LenB` of a `LongPtr` is 8, [**ProcessorArchitecture**](../../tB/Modules/Compilation/ProcessorArchitecture)
returns **vbArchWin64**, and `Environ$("PROCESSOR_ARCHITECTURE")` is `AMD64`. Under `win32`
they are 4, **vbArchWin32** and `x86`.

**Print a line whole when its characters matter.** Text that continues a line left open by
`Debug.Print ...;` comes back escaped: after `Debug.Print "A";`, a following
`Debug.Print "&"` shows in the Debug Console as `A&amp;`, and `tbrun` captures what the
console shows. The IDE does this, not the probe; `Debug.Print "A"; "&"`, in one statement,
comes back as `A&`.

**`--llvm` compiles the whole probe with [LLVM](../../LLVM/)**, with no
`[CompilerOptions("+llvm")]` on each procedure. It sets the project's compiler options in the
staged copy: `compiler.debugOptions`, which the `[RunAfterBuild]` run is compiled with, and
`compiler.buildOptions`, which the exe is. `--compiler-options` sets both to any other
string, such as `"+llvm +optimize"`. A run that uses LLVM --- through either option, the
tree's own settings or a procedure's `[CompilerOptions]` --- is refused when the IDE shows a
Community or Personal licence. Neither of those compiles your code with LLVM, so the run would
test the default compiler.

**`--exe` also runs the exe the build wrote**, after the probe has run in the IDE. It
starts the exe on a private desktop, as it starts the IDE, so a message box the exe opens
appears on no desktop you use, and it closes every box the exe opens by pressing OK, printing the box's title and text: an unhandled error in an exe opens a box and waits. It also ends the exe at `--timeout`. The exe runs its
`Sub Main`, not the `[RunAfterBuild]` Sub, so a probe for both gives the tree a `Main` that
calls the probe, and leaves out the template's own module with an empty `Main`. A built exe
writes nothing with `Debug.Print`, so the probe prints with `TbRun.Out`, from a module `tbrun`
adds to the staged copy. `TbRun.Out` writes to the Debug Console in the IDE, and to a file
`tbrun` reads in the exe. The exe's exit code, the fault the Windows Application log records for it, if any, the boxes it opened, and its lines follow the probe's output.

**`--tests` runs the project's own test cases instead**, and builds nothing. A test case is a parameterless **Sub** marked [`[TestCase]`](../../tB/Core/Attributes#testcase) in a **Module** marked [`[TestFixture]`](../../tB/Core/Attributes#testfixture), checked with the [Assert package](../../tB/Packages/Assert/), in any `.twin` file under `Sources/`, its subfolders included. `tbrun` runs each one in the compiler's test mode and prints `PASS <Module>.<Sub>`, or `FAIL <Module>.<Sub>:` and why, one line each. In test mode a failed assertion, an unhandled run-time error and an access violation each end that case and are reported with the line it stopped on, and the next case runs; without it, a failed assertion stops the run at an error panel that `On Error` cannot avoid. The IDE itself offers no way to run a test case: a `[TestCase]` Sub gets no CodeLens **run** link. A defect that is a compile-time diagnostic is a **compile case** instead: a line that ends in the comment `' CASE <Name>: TB5074` (one or more codes, separated by commas), `' CASE <Name>: error` or `' CASE <Name>: none`, which passes when the IDE reports each code named on that line, any error, or nothing at all. The compile cases are judged first, and the project's diagnostics are listed after the case lines; a project with compile errors runs none of its test cases, and says so for each. The reproducers of [`bug_repro.mjs`](Tools-Defects#bug-repro) whose mode is `test` are run this way.

| Flag | Effect |
|---|---|
| `--port <n>` | DevTools port for the IDE. Default 9346. Distinct ports let probes run concurrently --- the staging directory and the project id are keyed to it, so two runs never share a workspace. A port another IDE holds is refused, as for `tbbuild`. |
| `--arch <target>` | The target to build for, `win32` or `win64`. Default `win32`, set on every run, as for `tbbuild`. A `win64` probe runs as a 64-bit process. |
| `--timeout <secs>` | Give up waiting for console output. Default 120. |
| `--quiet <ms>` | How long the console must stop changing before the output counts as complete, when the probe has not returned. Default 2500. Raise it well above the default for a probe that drives an out-of-process server, which can take longer than that to start. |
| `--llvm` | Compile the whole probe, and the exe, with LLVM. The same as `--compiler-options +llvm`. |
| `--compiler-options <s>` | The project's compiler options, for the run and the exe. |
| `--exe` | Also run the built exe, and print what it writes with `TbRun.Out`, its exit code, the fault the event log records for it, and the boxes it opened, each closed with OK. |
| `--tests` | Build nothing: judge the compile cases and run each `[TestCase]` Sub in the compiler's test mode, printing `PASS` or `FAIL` for each. `--timeout` is the limit on each case. Not with `--exe`. |
| `--allow-name-clash` | On a build before BETA 1005, run a probe whose module holds a procedure named like the module, which is refused there otherwise. Those builds do not run its `[RunAfterBuild]` Sub, so the run exits 5. |
| `--raw` | Keep the console's timestamp column, which is otherwise stripped. |
| `--json` | One object with the path of the built file, the target, the captured lines, whether the probe returned, the licence an LLVM run checked, the exe's run, the IDE pid and anything reaped. |
| `--keep` | Leave the IDE running, and print its pid as `ide-pid: <n>` (with `--json`, `idePid`), followed by the `taskkill` command that ends it and every process it started, as cmd and PowerShell spell it and as Git Bash does (`//PID`). Implies `--no-reap`, and leaves the IDE's registry entries for the probe as they are. |
| `--no-reap` | Do not harvest automation servers the probe left behind. |
| `--reap-images <a,b>` | Replace the harvested image list. Default is the Office suite. |
| `--show` / `--hide` | As for [`tbbuild.mjs`](#tbbuild): your own desktop or a private one, with `TBBUILD_SHOW` setting the default. |

**A probe that activates a COM server can leak one per run.** `CreateObject("Excel.Application")`
is activated by DCOM, so the `EXCEL.EXE` that appears is a child of `svchost.exe` rather than
of anything the harness started --- no tree kill reaches it. Each activation is its own
process, so they accumulate, and calling `Quit` is not enough: the process exits only once
every COM reference has been released. `tbrun` therefore takes a process snapshot before it
starts the IDE and harvests what appeared afterwards, subject to three conditions --- the
process must be new, its image must be on the reap list, and it must have no window open.
Anything new and on the list but *windowed* is reported and left alone, because that is
indistinguishable from a copy the user opened. Two concurrent runs both driving Excel cannot
tell their servers apart, so whichever finishes first harvests both: pass `--no-reap` there
and sweep once at the end.

> [!IMPORTANT]
> The one trap worth knowing even if you never read the script: a project whose
> `project.buildPath` is still the default `${SourcePath}\Build\...` template opens a native
> *Save* dialog on build. Under `tbbuild` the IDE runs on a private desktop, so that dialog
> is invisible, takes no input, and the build silently never happens --- the WebView2
> renderer stays responsive throughout, so even a health check says the IDE is fine. `tbrun`
> pins the path to a folder of its own in its staged copy, which makes the trap unreachable.
> The file keeps the IDE's own name, *project name*`_`*target*`.`*extension* --- for
> example `ArchProbe_win64.exe` --- so the name says what was built.

Like `tbbuild`, it leaves the IDE's registry entries as it found them. Everything it opens is
in its own temp folder, so it deletes every entry under that folder once the IDE has exited,
and again at the start of a run, which removes what an earlier run on the same port left
behind. That includes the target the IDE remembers for each project, which a `win64` run
writes. **A probe builds for the target `--arch` names**, whatever the IDE remembers, so a
kept IDE switched to `win64` does not make later runs on the same port build 64-bit.

Exit codes: **0** the probe ran and its output was captured; **1** the project has compile errors (the diagnostics are printed); **2** a refused command line (a source folder that is missing or has no `Settings` file included), no IDE, an IDE that did not start, a compile that never settled, a build that failed after a clean compile, a probe that never ran or stopped at a procedure that failed code generation, an LLVM run on a Community or Personal licence, an `--exe` run with no exe built, `--tests` on a project with no case or with a `[TestCase]` it cannot call (one with parameters, a **Function**, or one outside a `[TestFixture]` module), or a crash; **3** no output: the console held none before the timeout, or the probe printed none after its last `Debug.Cls`; **4** the compiler crashed, or restarted twice, while compiling the project; **5** the probe ended before it returned, its output printed all the same; **6** under `--exe`, the exe exited with a code other than 0, the Application event log records that it faulted, it opened a box (which `tbrun` closed), or it was still running after `--timeout` and was ended, its output, exit code, fault and boxes printed all the same; **7** under `--tests`, a case failed, every case's line printed all the same. A run that would exit 5 exits 5 whatever the exe did.

## probe_shared_temp.mjs
{: #probe-shared-temp }

    node scripts/probe_shared_temp.mjs [--ides N] [--rounds R] [--control] [--all]
                                       [--ide <twinBASIC.exe>] [--port N] [--timeout S]

Counts the builds that fail to write the type library when several IDEs build at once in one `TEMP` folder. It is the measurement behind the entry of `BUGS-TO-REPORT.md` whose reproducer is `bugs/concurrent-builds-shared-temp/`: such a build ends with `[TYPELIB] failed to finalize typelibrary.  Disk error?`, then `[LINKER] FAILED to create type library` and `[BUILD] failed`. Like [`tbbuild.mjs`](#tbbuild), it needs a twinBASIC install and Windows, and it is outside every gate and outside CI.

Each round starts `--ides` IDEs at once, each on its own port and each opening a copy of the reproducer's project, packed into a folder under `%TEMP%\tbprobe-shared-temp\` with an explicit build path. An IDE builds one project and is ended, because an IDE reused for a second project wedges. Every IDE compiles its project, then waits until all the others have compiled, so that Build is pressed in all of them at about the same moment. A build whose log holds a `[TYPELIB] failed` line or `FAILED to create type library` failed to write the type library. Any other failed build is not what the probe measures; it ends the probe with exit 2.

[`tbbuild.mjs`](#tbbuild) gives every IDE a `TEMP` folder of its own, so no build of the harness shares one. The probe gives all its IDEs one folder, made for the run under `%TEMP%\tbprobe-shared-temp\` and deleted afterwards, through the `env` option of `launchIde`. With `--control` it leaves the harness's own folders in place, one for each IDE, which is the reproducer's control.

| Flag | Effect |
|---|---|
| `--ides <n>` | IDEs at once. Default 8. |
| `--rounds <r>` | Rounds, one build in each IDE. Default 24. |
| `--control` | Give each IDE a `TEMP` folder of its own. No build is expected to fail. |
| `--all` | Run every round. By default the probe stops after the round in which it first sees a type library fail, because one is enough to show the defect. |
| `--ide <path>` | Path to `twinBASIC.exe`, found as for `tbbuild`. |
| `--port <n>` | The first DevTools port to try. Default 9760. The IDEs take the first free ports from it. |
| `--timeout <secs>` | The wait for a compile to settle, and again for a build. Default 180. |

The output is one `round <k>: <n> failed` line for each round, the last console lines of every build that failed, and a last line of the form `<f> of <n> builds failed to write the type library (TEMP shared)`, or `(TEMP per IDE)` under `--control`. Other work on the machine, such as lanes of [`addin_test.mjs`](Tools-IDE#addin-test) or [`ide_test.mjs`](Tools-IDE#ide-test), loads the same processor, and a disturbed run is not comparable with a quiet one.

Exit codes: **0** no build failed to write the type library; **1** at least one did, so the defect is there; **2** a refused command line, no IDE, no free ports, an IDE that did not start, a project that did not compile, a build that failed in some other way, or a crash.

## probe_build_twice.mjs
{: #probe-build-twice }

    node scripts/probe_build_twice.mjs [--arch win32|win64] [--ide <twinBASIC.exe>] [--port N]
                                       [--timeout S] [--keep-files <dir>]
    node scripts/probe_build_twice.mjs --vb6 [--timeout S] [--keep-files <dir>]

Builds the project of `bugs/build-writes-compiler-addresses/` twice and compares the two exes. It is the measurement behind the entry of `BUGS-TO-REPORT.md` whose reproducer that is: two builds of one unchanged project are not byte for byte equal, and what differs is more than the PE time stamp and checksum. Each exe holds, at the start of its `.data` section, a block of deflate-compressed data: a u32 compressed size, a u32 inflated size of 4,096 and a raw deflate stream. Inflated, the blocks of two builds differ in two values that have the form of heap addresses: 4 bytes each in a win32 exe, and the low 6 bytes of a 64-bit value in a win64 exe. Like [`tbbuild.mjs`](#tbbuild), it needs a twinBASIC install and Windows, and it is outside every gate and outside CI.

Each build is made in an IDE of its own, one after the other on one port, because an IDE reused for a second project wedges. Before each build the project is staged again, packed into a folder under `%TEMP%\tbprobe-build-twice\<port>\` with an explicit build path, in the same folders both times, so that no path can be what differs. The exe is copied out as soon as the build is done.

The output has these parts, in order: the two sizes, and whether the section tables are the same; the PE time stamp and checksum of each file, which the linker sets and the comparison leaves out; the startup block, found by its header (a u32 compressed size, then a u32 inflated size that is a multiple of 1,024, at a 4-byte step of `.data`, then a stream that inflates), with the sizes of the two streams and their padding to the pointer size of the target; the bytes that differ outside the time stamp, the checksum and the block, by section, one line for each range with its bytes in both files; and the decompressed bytes of the block that differ, each range read as the little-endian value of the target's pointer size that holds it. The two blocks are lined up on the end of their padding, so that data which moved by one step because a stream is a few bytes longer is not counted as a difference, and the padding is compared on its own, aligned at its end. The last line is the summary, `the decompressed startup blocks of two builds differ in <n> bytes, in <k> ranges (<arch>)`, or `the decompressed startup blocks of two builds are equal (<arch>)`. A stream that does not inflate to exactly the size its header states, and an exe with no such block, end the probe with exit 2.

| Flag | Effect |
|---|---|
| `--arch <a>` | `win32` or `win64`, the target to build for. Default `win32`. |
| `--ide <path>` | Path to `twinBASIC.exe`, found as for `tbbuild`. |
| `--port <n>` | The first DevTools port to try. Default 9800. The IDE takes the first free port from it. |
| `--timeout <secs>` | The wait for a compile to settle, and again for a build. Default 180. |
| `--keep-files <dir>` | Copy the two exes into `<dir>`, which is made if it is missing, as `<arch>-1.exe` and `<arch>-2.exe`. Nothing already in the folder is removed. |
| `--vb6` | Build the `vb6/` project of the reproducer twice with VB6 in place of the twinBASIC project, and print every range that differs outside the time stamp and the checksum, by section. A VB6 exe has no deflate-compressed block. VB6 is found as for [`vb6run.mjs`](Tools-Defects#vb6run) (`VB6_EXE`, else the standard install folders) and is started only through `scripts/lib/vb6.mjs`, never from a shell. The project is built with Unattended Execution, as `bug_repro.mjs vb6` builds it. Both builds are made in one folder, because VB6 stores the folder's name in the exe and two folders would show as a difference of their own. `--arch`, `--ide` and `--port` do not apply, and are refused with it. |

Exit codes: **0** the compared bytes are equal, the two decompressed blocks or, with `--vb6`, the two files outside the time stamp and the checksum; **1** they differ, so the defect is there; **2** a refused command line, no IDE or no VB6, no free port, an IDE that did not start, a project that did not compile or build, a block that does not inflate to its stated size or is not there, or a crash.

## check_tb_registry.mjs
{: #check-tb-registry }

    node scripts/check_tb_registry.mjs

The self-test for `scripts/lib/tb-registry.mjs`, the code that puts the IDE's registry
entries back after [`tbbuild.mjs`](#tbbuild), [`tbrun.mjs`](#tbrun),
[`addin_test.mjs`](Tools-IDE#addin-test) and [`check_examples.mjs`](Tools-Samples#check-examples). It plays out a
run on a scratch copy of the IDE's keys, under `HKCU\Software\tbharness-selftest`, and checks
that everything comes back: a project of yours that the run opened gets its saved state and
its place in the recent list back, the run's own entries go, the file association is
restored, and a second restore writes nothing. The recent list gets two more checks, because
the IDE changes it on its own while a run's projects are on it: it fills a short list's empty
slots with copies of the last entry, and a full list loses its oldest entry for each project
a run opens. The copies must go and the lost entries come back. The build targets the IDE remembers are checked the same way: those under
the run's folder go, and every other one stays, in its order and its exact text. The IDE's
theme, which an add-in scenario switches, comes back, and every other IDE option stays as it
is. So is the rule that a file association pointing into the temp folder when a run began --- at another
run's private copy of the IDE --- is put back pointing at the newest install instead, and left as it
is when there is none. It also checks that
the module refuses to sweep outside the temp folder or restore a key near the root of the
registry. It deletes the scratch key when it ends.

It is not a gate and is not in `test.bat`, because it needs Windows and a real registry and
the CI runners have neither. Run it by hand after changing `tb-registry.mjs`.

Exit codes: **0** every assertion held, **1** an assertion failed, **2** the test could not run to its end: a refused command line, PowerShell failing, or a crash.

## impexp.mjs and impexp.py
{: #impexp }

    node scripts/impexp.mjs export <project> <folder> [--overwrite]
    node scripts/impexp.mjs import <project> <folder> [--overwrite]
    node scripts/impexp.mjs settings|licence|changelog|readme <project>
    node scripts/impexp.mjs --self-test

Standalone `.twinproj` / `.twinpack` unpacker and packer, with the compiler executable's own command line: the same six commands, the project file first, and `--overwrite` required to replace anything. `scripts/impexp.py` is the same tool, run as `python scripts/impexp.py ...`; the two editions print the same output and write byte-identical project files, which [`check_impexp_parity.mjs`](Tools-Toolchain-Tests#check-impexp-parity) checks. Neither has dependencies; the Node edition needs Node 18+, the Python edition Python 3.6+. The exit code says what happened, so a caller need not read the output. `--self-test` needs nothing but the script, and adds a round trip of `indexer/sample.twinpack` when run from this repository.

**Neither is run as a command by the site build.** They are published downloads: `_config.yml`'s `bundle_extra` copies both into `Features/Packages/downloads/`, and [Import/Export Tool](../../Features/Packages/Import-Export-Tool) offers them to readers as the two editions of one tool. That is why `impexp.py` is one of only two `.py` files in a repository whose tooling is otherwise all Node --- porting it would delete a deliberate offering rather than tidy anything up. The `bundle_extra` exemption is by exact path, so moving either file breaks the download; see [`check_publish_policy.mjs`](Tools-Toolchain-Tests#check-publish-policy). The Node edition is also a library: `scripts/lib/tb-project.mjs` imports its `exportProject` and `importProject`, and the tools that unpack or pack a twinBASIC project call them directly, among them [`tbbuild.mjs`](#tbbuild), [`tbrun.mjs`](#tbrun), [`check_examples.mjs`](Tools-Samples#check-examples), [`census_attributes.mjs`](Tools-Samples#census-attributes) and [`bug_repro.mjs`](Tools-Defects#bug-repro). The site build imports `importProject` too, to pack the [help add-in's project file](Tools-Build#the-help-add-ins-project-file): `impexp.mjs` is the one module under `scripts/` that `builder/` may import (`biome.jsonc` refuses any other), which is why [`check_tree_fresh.mjs`](Tools-Site-Checks#check-tree-fresh) watches it. The Python edition is only a download.

Exit codes: the table in [Import/Export Tool](../../Features/Packages/Import-Export-Tool#checking-the-result) gives every code. This tool keeps its own codes, which the two editions share and which are not those of the other tools here.
