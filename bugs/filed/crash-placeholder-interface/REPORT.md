Filed as [twinbasic/twinbasic#2453](https://github.com/twinbasic/twinbasic/issues/2453).

## Compiler crashes on an `Interface` named by an angle-bracket placeholder that has an `Extends` clause

**Describe the bug**
A source file holding an `Interface` whose name is an angle-bracket placeholder and that has an `Extends` clause crashes the compiler while it parses the file. The DEBUG CONSOLE shows `NATIVE EXCEPTION: ACCESS_VIOLATION {no-basic-code}` with `>>> thread 0004: ParsingFileStart, <that file>`, then `restarting from MEMORY`, three times over, and then the IDE gives up. The input is not real code (it is a syntax skeleton, the shape the documentation uses to show where an attribute goes), but a parser given nonsense should report a diagnostic, and this one dereferences something instead.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `crash-placeholder-interface.twinproj` (attached as `crash-placeholder-interface.zip`). Its one source file, `Placeholder.twin`, is the whole reproduction:
   ```
   Interface <name> Extends <base-interface>
   End Interface
   ```
2. See the compiler crash with `NATIVE EXCEPTION: ACCESS_VIOLATION {no-basic-code}` in the DEBUG CONSOLE, restart from memory three times, and then stop restarting.

It takes a placeholder name and an `Extends` clause, and what the clause names does not matter:

| source | result |
|---|---|
| `Interface <name>` + `End Interface` | TB5182 Syntax error, no crash |
| `Interface IFoo Extends <base-interface>` + `End Interface` | TB5182 + TB5079 + TB5127, no crash |
| `Interface <name> Extends <base-interface>` + `End Interface` | **crash** |
| `Interface <name> Extends IBase` + `End Interface`, no `IBase` anywhere | **crash** |
| the same, with `Interface IBase` or `Class IBase` declared in another file | **crash** |

**Expected behavior**
A syntax error (TB5182, as for the same line without the `Extends` clause), not a crash.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 983, at `twinBASIC_win32.dll+00141F7A`. Severity: crash. It takes the compiler down, three restarts, then the IDE gives up. A crash in a batch of projects costs the whole batch its result, so a tool that compiles many files at once has to isolate the file that does it. An earlier version of this report said the crash needs a placeholder in both positions, the name and the base; the last two rows of the table, each measured with a project of its own, show the base can be a real name or missing entirely.

<!-- Reproducer: bugs/crash-placeholder-interface/ (mode compile, expects tbbuild exit 4). Found by pointing scripts/check_examples.mjs at the documentation's own code samples: the skeleton is one of the `tb` fences under docs/ (the one in Reference/Attributes.md that shows where an attribute goes); that tool isolates the sample on exit code 4. The table rows were measured on 2026-09-24, each in a project of its own; the crash reproduced on 995 and 983 with bug_repro verify. -->
