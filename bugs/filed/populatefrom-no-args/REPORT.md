Filed as [twinbasic/twinbasic#2450](https://github.com/twinbasic/twinbasic/issues/2450).

## `[PopulateFrom]` with no arguments crashes the compiler

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
