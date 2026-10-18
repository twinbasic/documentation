# `harness.json`: the settings the documentation's tools and tblaunch share

`test/harness.json` holds the settings that the documentation's tools (`check_examples`,
`tbbuild`, `tbrun`, the add-in and IDE lanes, `shoot_docs`) and **tblaunch** (the twinBASIC
launcher, in the launcher repository) must agree on: which samples a run leaves out, and how long
each phase may take. This page is the one contract for that file. tblaunch's own command line,
`--json` fields, exit codes and phases are its contract, `src/launcher/CONTRACT.md` in the launcher
repository; this page refers to it and does not repeat it.

**One editor.** The documentation repository edits this page and the file. tblaunch, and the tools
built on it, propose changes; the owner settles disagreements. A change to this page and a change
to the file are made in one commit.

## The file

```json
{
  "version": 1,
  "exclusions": {
    "llvm": {
      "GdiPlus": {
        "build": "*"
      },
      "tbRegExp": {
        "build": "*"
      },
      "BigNumberLib": {
        "compiler-run": [
          "Reference/Contributed/BigNumberLib/BigNumber.md#4",
          "Reference/Contributed/BigNumberLib/BigNumber.md#7"
        ]
      },
      "console": {
        "compiler-run": [
          "Reference/COM-Interfaces/IErrorInfo.md#4"
        ]
      },
      "Fmt": {
        "compiler-run": [
          "Reference/Contributed/Fmt/FormerEntryPoint/FormerStringFormat.md#3",
          "Reference/Contributed/Fmt/IStringFormatIdentifier.md#2",
          "Reference/Contributed/Fmt/NumericPaddingSFI.md#1",
          "Reference/Contributed/Fmt/PublicEntryPoints/StringFormat.md#8"
        ]
      },
      "form": {
        "compiler-run": [
          "Reference/Core/Graphics-Methods.md#4"
        ]
      },
      "TBMANLIB": {
        "compiler-run": [
          "Reference/Contributed/TBMANLIB/ToolsArray.md#11",
          "Reference/Contributed/TBMANLIB/ToolsDic.md#3",
          "Reference/Contributed/TBMANLIB/cJson.md#4",
          "Reference/Contributed/TBMANLIB/cJson.md#5",
          "Reference/Contributed/TBMANLIB/cJson.md#6",
          "Reference/Contributed/TBMANLIB/cLogs.md#2",
          "Reference/Contributed/TBMANLIB/cTimers.md#1",
          "Reference/Contributed/TBMANLIB/cToolsStr.md#6",
          "Reference/Contributed/TBMANLIB/cToolsStream.md#2"
        ]
      },
      "TBMANLIB_Aes": {
        "compiler-run": [
          "Reference/Contributed/TBMANLIB_Aes/cAes.md#4",
          "Reference/Contributed/TBMANLIB_Aes/cAes.md#13",
          "Reference/Contributed/TBMANLIB_Aes/cAes.md#15",
          "Reference/Contributed/TBMANLIB_Aes/cAes.md#19",
          "Reference/Contributed/TBMANLIB_Aes/cAesHelper.md#2"
        ]
      },
      "TBMANLIB_Diagnostic": {
        "compiler-run": [
          "Reference/Contributed/TBMANLIB_Diagnostic/DiagnosticEngine.md#4",
          "Reference/Contributed/TBMANLIB_Diagnostic/Dictionary.md#1",
          "Reference/Contributed/TBMANLIB_Diagnostic/List.md#3",
          "Reference/Contributed/TBMANLIB_Diagnostic/List.md#5"
        ]
      },
      "TBMANLIB_Dialog": {
        "compiler-run": [
          "Reference/Contributed/TBMANLIB_Dialog/cDialogFindReplace.md#7",
          "Reference/Contributed/TBMANLIB_Dialog/cDialogPrint.md#12"
        ]
      },
      "TBMANLIB_Xml": {
        "compiler-run": [
          "Reference/Contributed/TBMANLIB_Xml/cXml.md#19",
          "Reference/Contributed/TBMANLIB_Xml/cXml.md#41",
          "Reference/Contributed/TBMANLIB_Xml/cXml.md#46",
          "Reference/Contributed/TBMANLIB_Xml/mXPath.md#6"
        ]
      },
      "tbFileSysTools": {
        "compiler-run": [
          "Reference/Contributed/tbFileSysTools/Drive.md#1",
          "Reference/Contributed/tbFileSysTools/Drives.md#2",
          "Reference/Contributed/tbFileSysTools/Drives.md#3",
          "Reference/Contributed/tbFileSysTools/File.md#1",
          "Reference/Contributed/tbFileSysTools/FileSystemObject.md#1",
          "Reference/Contributed/tbFileSysTools/FileSystemTools.md#11",
          "Reference/Contributed/tbFileSysTools/FileSystemTools.md#12",
          "Reference/Contributed/tbFileSysTools/FileSystemTools.md#18",
          "Reference/Contributed/tbFileSysTools/FileSystemTools.md#21",
          "Reference/Contributed/tbFileSysTools/FileSystemTools.md#22",
          "Reference/Contributed/tbFileSysTools/FileSystemTools.md#24",
          "Reference/Contributed/tbFileSysTools/Files.md#2",
          "Reference/Contributed/tbFileSysTools/Folder.md#2",
          "Reference/Contributed/tbFileSysTools/Folders.md#2",
          "Reference/Contributed/tbFileSysTools/TextStream.md#4",
          "Reference/Contributed/tbFileSysTools/TextStream.md#5",
          "Reference/Contributed/tbFileSysTools/index.md#3"
        ]
      },
      "tsJson": {
        "compiler-run": [
          "Reference/Contributed/tsJson/Json.md#8",
          "Reference/Contributed/tsJson/Json.md#17",
          "Reference/Contributed/tsJson/Json.md#19",
          "Reference/Contributed/tsJson/Json.md#28",
          "Reference/Contributed/tsJson/JsonArray.md#1",
          "Reference/Contributed/tsJson/JsonArray.md#5",
          "Reference/Contributed/tsJson/JsonOptions.md#2",
          "Reference/Contributed/tsJson/index.md#10",
          "Reference/Contributed/tsJson/index.md#12"
        ]
      },
      "tsPwGen": {
        "compiler-run": [
          "Reference/Contributed/tsPwGen/PwGenOptions.md#2",
          "Reference/Contributed/tsPwGen/PwGenRandom.md#6"
        ]
      }
    }
  },
  "timeouts": {
    "projectOpen": 15,
    "handshake": 10,
    "load": 120,
    "setup": 30,
    "compile": 30,
    "licence": 60,
    "build": 15,
    "compilerRun": 60,
    "compilerRunQuiet": 8,
    "exeRun": 60
  }
}
```

- **`version`** is an integer. A reader refuses (exit 2) a file with no `version` or a newer one
  than it knows. Since unknown keys are refused, **every new key raises it**, as does any change an
  older reader would misread, and gets an entry under [Versions](#versions).
- **Unknown keys are refused** (exit 2), at every level, so a typo is never silently ignored. A key
  only the other tool uses is known and ignored: `projectOpen` by tblaunch; `handshake`, `load`,
  `setup` and `licence` by the documentation's tools.
- **The documentation's tools always read the file**, from the repository root; a missing or
  malformed file is exit 2, and no default value stays in their code. **tblaunch reads it with
  `--harness <file>`**; without that option its built-in defaults apply, and they are kept equal
  to the file's (a check on tblaunch's side compares them with `staging`'s copy).

## Modes and stages

**A mode is which compiler options a run uses:**

- `compile`: a compile only; nothing is built or run, only the diagnostics count. Its only stage
  is `build`, which here means the compile reports errors.
- `build`: no LLVM.
- `llvm`: `+llvm` in both `compiler.buildOptions` (the exe) and `compiler.debugOptions` (the
  compiler's own run).

| tool and run | mode | stages that apply |
|---|---|---|
| `check_examples` (compile only) | `compile` | `build` |
| `check_examples --build` | `build` | `build`, `compiler-run` |
| `check_examples --llvm` | `llvm` | `build`, `compiler-run` |
| `tblaunch compile` (its compile corpus) | `compile` | `build` |
| `tblaunch run`, no `--exe` | `build` | `build`, `compiler-run` |
| `tblaunch run --llvm`, no `--exe` | `llvm` | `build`, `compiler-run` |
| `tblaunch run --exe`, win32 and win64 | `build` | `build`, `exe-run` |
| `tblaunch run --exe --llvm`, win32 and win64 | `llvm` | `build`, `exe-run` |

The settings apply to runs of the documentation's samples only. `tblaunch`'s other corpora (the
`bugs/` projects, the IDE's samples) are outside them. No setting depends on the architecture:
an entry applies to both, and a failure on one architecture only is an expectation of the tool
that sees it, not an exclusion. An architecture key would be added only when a whole package fails
on one architecture.

**A sample is built first; `compiler-run` and `exe-run` each follow `build` and do not depend on
each other** (the compiler's own run of the `[RunAfterBuild]` Sub, and the exe's run, are two ways
of running one build).

| stage | fails when |
|---|---|
| `build` | the build (or, under `compile`, the compile) fails: `{ERROR}` rows, a build-failed line, or **an LLVM refusal anywhere** (below), even when an exe was linked |
| `compiler-run` | the compiler's own run crashes, the compiler restarts (`Restarting the compiler`), or the run never returns |
| `exe-run` | the exe crashes (an access violation in the event log, with no box), shows an error box, or never returns |

**The build's lines** are those from `[BUILD] Starting...` up to `[BUILD] Executing '...'`, or to
the end of the output when no Executing line follows; **the compiler run's lines** are those after
Executing. One boundary, no gap.

**An LLVM refusal is always a `build` failure**, wherever it is printed: a line
`LLVM compilation error in '<Proc>': <reason>` or `codegen error occurred when compiling '<Proc>':
<reason>`, with or without an `[LLVM]` prefix. Where code generation happens depends on the
batch's entry point, not on the package: a batch that reaches its samples from `Sub Main` compiles
them in the build, before `[LINKER] SUCCESS`; one that reaches them only from the
`[RunAfterBuild]` Sub compiles them for the compiler's run, after Executing. Either way the build
has failed (tblaunch: exit 5; `tbbuild`: exit 5; `check_examples`: a `build` finding).

**Wrong output never fails a stage.** A run that returns and prints other than its page is a
checked result: an expectation in tblaunch, a finding in `check_examples`, never an exclusion. An
exclusion is for samples that cannot be checked at a stage at all, or that take others down with
them.

## Exclusions

`exclusions` has three levels: **mode, then package, then stage**. A stage's value is `"*"` or a
non-empty list of sample ids, and a package may name more than one stage. No reasons and no build
numbers: the owner reads the twinBASIC release notes and asks for a package's exclusions to be
probed again.

- **The package** is a contributed package's name as on TWINSERV (`GdiPlus`), which is its sample
  template `test/example-projects/contributed-<name>` without the prefix; for any other sample,
  the name of the template it is compiled in (`form`, `implicit`, ...).
- **A sample id** is `<page>#<n>`: the markdown file's path relative to `docs/` with forward
  slashes, and the 1-based ordinal of the fence among that page's `tb` fences (all of them, not
  only those marked `check_build`); a fence with an explicit `id=` uses that.
- **`"*"`** means no sample of the package can be checked at that stage: every sample fails there,
  or the samples take one another down, so that which ones fail depends on what ran before them.
  Where particular samples fail and the rest can be checked, the entry is a list of their ids.
- **A stage exclusion skips that stage; a `build` exclusion skips both runs as well.** `build`
  still runs before an excluded run, and a failure there is an ordinary finding.
- Under `compile`, the only stage is `build`; any other is refused (exit 2). A listed id that
  matches no sample is a note, not an error.

**The canary.** Each package and stage has one, run once per run, so that a fix is noticed:

- for a list, its **first listed id**, alone, in a project of its own;
- for `"*"`, **all the package's samples**, batched as the run batches them, with no halving and
  no retry (a single sample might pass alone and report a fix on every run);
- taken as far as the excluded stage; for `build`, as far as the batch's code is compiled (the
  build in an exe batch; through the compiler run's compile in a `[RunAfterBuild]` batch).

Its result, worded exactly so:

- fails at that stage: one summary line, `<pkg>: canary failed at <stage> as expected, N samples
  not run` (`not built` for `build`);
- gets past it: a finding, `<pkg>: canary passed <stage>: re-probe its exclusions`, exit 1;
- a run exclusion's canary whose build fails: a finding, `<pkg>: canary failed at build, before
  <stage>: re-probe its exclusions`, exit 1.

Nothing re-probes by itself: the owner decides, and samples that pass again leave the list.

## Timeouts

All in seconds, decimals allowed. Each runs from a start event to an end event:

| key | tool | from | to |
|---|---|---|---|
| `projectOpen` | docs | the IDE's page is attached | the IDE reports the project open |
| `handshake` | tblaunch | CreateProcess of the stub | its 42-byte handshake on stdout |
| `load` | tblaunch | the handshake | the reply to AllProjectsLoaded on the root channel |
| `setup` | tblaunch | that reply | StartCompiler's reply |
| `compile` | both | the project reported open (docs) / StartCompiler's reply (tblaunch) | the compile settled (docs) / every source published since the latest `compilationStarted` (tblaunch; a fixed 150 ms settle window follows) |
| `licence` | tblaunch | a build being asked for, after a clean compile (no wait with an empty key or one shorter than 84 characters, a Community licence, as the IDE page decides) | push 250 |
| `build` | both | Build pressed / `doBuild` sent | the build ends: linked, failed, or `[BUILD] Executing` (tblaunch's fixed waits inside it, up to 3 s for push 236 and 5 s for the Executing line, count against it) |
| `compilerRun` | both | `[BUILD] Executing '...'` | the run's end: its sentinel, the quiet period below, a crash, or (tblaunch) its output cap, `--max-output` |
| `compilerRunQuiet` | both | the later of `[BUILD] Executing` and the run's last output | the run taken as ended (a run that prints nothing also ends) |
| `exeRun` | both | the exe starts | it exits (killed at the limit) |

Small fixed waits are internal and outside the file (tblaunch's 2 s crash grace and 5 s for the
compiler's exit, the documentation harness's polls).

Every limit but `compilerRunQuiet` is 10 s (owner): a compiler that is not done in seconds is
wedged and does not recover, and a sample's run takes seconds too. The values rest on BETA 1010:
a clean batch's whole trip through tblaunch (start, compile, build, the IDE run and the exe run;
plain, exe and LLVM exe, win32 and win64, four lanes at once) takes at most 6.4 s, about 2.5 s at
the median; the compiler's own compile at most 0.30 s under the IDE and 1.27 s under tblaunch,
cold start included; IDE start to project open at most 4.04 s; a build at most 1.0 s, 4.97 s with
LLVM; a compiler run at most 0.83 s without LLVM. What 10 s cuts off is known and accepted: the
documentation harness's compile wait for the WinReg batches (12.5--13.8 s, project load
included) and one TBMANLIB_Aes LLVM run that printed for 15 s, both Experimental packages.
`package_tests.mjs` passes its own limit for a test case's run (`--timeout`, 60 s by default),
because a case's run time is the package's own: tbRegExp's step-limit cases take about 16 s.

**Overrides**, in seconds: **an option beats a variable, which beats the file**, which beats a
built-in default (tblaunch only). A tool has the options of the phases it runs.

| key | option | variable |
|---|---|---|
| `compile` | `--compile-timeout` | `TB_COMPILE_TIMEOUT` |
| `build` | `--build-timeout` | `TB_BUILD_TIMEOUT` |
| `compilerRun` | `--compiler-run-timeout` | `TB_COMPILER_RUN_TIMEOUT` |
| `compilerRunQuiet` | `--compiler-run-quiet` | `TB_COMPILER_RUN_QUIET` |
| `exeRun` | `--exe-run-timeout` | `TB_EXE_RUN_TIMEOUT` |

Aliases: `--timeout` is `--compile-timeout` in `tbbuild` and tblaunch, but in `tbrun` it is both
`--compiler-run-timeout` and `--exe-run-timeout`, as tblaunch's `--run-timeout` is (what each
tool's `--timeout` bounded before). `tbrun`'s and tblaunch's `--quiet <ms>` are gone. `projectOpen`,
`handshake`, `load`, `setup` and `licence` have no override.

## Versions

More than one version of the file can be in use at once: a tblaunch built for an older version
reading an older copy, while the documentation's tools read the newest. So this page documents
**every version still in use**: the sections above describe the newest, and each entry below says
what its version changed from the one before, who asked for it and why, so that a reader of an
older version can tell what it does not have. An entry is removed only when no tool reads that
version any more, and the removal says so here.

### Version 1 (2026-10-17)

The first version, agreed between the documentation's tools and tblaunch and approved by the
owner. It replaces `test/example-exclusions.json`, which had no version and held only the
exclusions (`mode -> package -> stage`), with `version`, `exclusions` and `timeouts`. It decides:
an LLVM refusal is always a `build` failure (owner); the build's lines end at `[BUILD] Executing`;
`compiler-run` and `exe-run` are runtime failures only; the exclusions under `llvm` are GdiPlus and
tbRegExp at `build`; the timeouts and their overrides as above (owner's approval of the values;
`handshake` added at tblaunch's request), and 60 samples at `compiler-run` that end silently,
fault or hang under LLVM (owner).

On 2026-10-18 the limits' values changed within version 1, the keys unchanged: `projectOpen`
15 → 10, `load` 120 → 10, `setup` 30 → 10, `compile` 30 → 10, `licence` 60 → 10, `build` 15 → 10,
`compilerRun` 60 → 10, `exeRun` 60 → 10 (owner, at tblaunch's request with its timings; tblaunch's
built-in defaults move to the same values in its contract version 5). A reader of version 1 takes
whatever values the file holds, so no version was raised.
