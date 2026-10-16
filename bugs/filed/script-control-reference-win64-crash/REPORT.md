Filed as [twinbasic/twinbasic#2523](https://github.com/twinbasic/twinbasic/issues/2523).

## A project that references the Microsoft Script Control crashes the compiler when it is built for 64-bit programs

**Describe the bug**
A project with a reference to *Microsoft Script Control 1.0* (`msscript.ocx`) crashes the compiler when its target is win64, although no code uses the reference. The IDE restarts the compiler on the same project (`restarting from MEMORY [...]` in the DEBUG CONSOLE, four times), it crashes again each time, and the IDE ends in Safe Mode, so nothing in the project compiles. With the target win32 the same project compiles with no diagnostic. A reference to the Script Control in an embedded package does the same to every project that embeds the package: the contributed package TBMANLIB 1.0.0.5, which references it, takes down a project of one `Debug.Print`. Observed in the IDE.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `script-control-reference-win64-crash.twinproj` (attached as `script-control-reference-win64-crash.zip`). Its code is one module that prints `hello`; the project's references, in `Settings`, include
   ```
   {
       "id": "{0E59F1D2-1FBE-11D0-8FF2-00A0D10038BC}",
       "lcid": 0,
       "name": "Microsoft Script Control 1.0",
       "path32": "C:\\Windows\\SysWOW64\\msscript.ocx",
       "path64": "",
       "symbolId": "MSScriptControl",
       "versionMajor": 1,
       "versionMinor": 0
   }
   ```
   (the reference as TBMANLIB 1.0.0.5 holds it).
2. Choose **win64** in the target list of the toolbar, or let the IDE compile it for win64 in any way (`tbbuild --arch win64`).
3. See the DEBUG CONSOLE: `restarting from MEMORY [<the project>]` four times, then the IDE in Safe Mode. With **win32** chosen the project compiles, 0 errors and 0 warnings.

Each of these was a project of its own, one `Debug.Print "hello"` and the references of the project above, compiled for win64:

| the project's extra reference | result |
|---|---|
| none | compiles, and builds |
| Script Control, `path64` empty (as above) | the compiler crashes |
| Script Control, `path64` the 32-bit file `C:\Windows\SysWOW64\msscript.ocx` | the compiler crashes |
| Script Control, `path64` a file that does not exist | the compiler crashes |
| Script Control in an embedded package of the project (`Packages/ScLib`, `path64` empty), none in the project | the compiler crashes |
| Common Dialog Control 6.0 (`comdlg32.ocx`), also 32-bit only, `path64` empty or the 32-bit file | compiles |
| Winsock Control 6.0 (`mswinsck.ocx`), also 32-bit only, `path64` empty or the 32-bit file | compiles |
| Microsoft Scripting Runtime, or ADODB 2.8, with `path64` empty | compiles, and builds |
| Microsoft Scripting Runtime with `path64` empty, in an embedded package | compiles, and builds |

An empty `path64` is not the cause, then: the Script Control crashes the compiler whatever `path64` holds, and two other 32-bit-only controls do not.

**Expected behavior**
A compiled project, or a diagnostic that names the reference and says that it has no 64-bit component, and a compiler that keeps running.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
The compiler crashes on BETA 1005, 997, 995 and 987, and does not on 983, 975 and 957. Not tried: BETA 964, 973, 974 and 982, the builds between 983 and 987 (not installed), a `path64` that names a 64-bit build of the control (there is none on this machine), the project built with LLVM, and the exception text (the DEBUG CONSOLE of the crashing IDE holds the `restarting from MEMORY` lines only).

Severity: high for a project that has the reference. It cannot be compiled for 64-bit programs at all, the IDE ends in Safe Mode, and nothing says which reference is the cause. No wrong code is produced. In a 32-bit program the reference is harmless. A 64-bit program cannot use the control, which exists only as a 32-bit component, so the workaround is to remove the reference.

<!-- Reproducer: bugs/script-control-reference-win64-crash/ (mode compile, "arch": "win64"; expect is tbbuild exit 4, the compiler crashing; verify reproduces on BETA 1005, 997 and 995; on 957 verify is a harness failure, because that IDE cannot restart its compiler for another target, and 957, 975 and 983 were compiled with `tbbuild` on a scratch copy of the project whose path the IDE already remembered as win64, which gave no crash). The table's variants were scratch projects of one reference each, built by a script from the reproducer's Settings and run with `tbbuild --arch win64` one at a time (a win32 compile crashed once while five IDEs ran at once, and compiled clean alone, so a crash is trusted only from a run alone); not kept. The BETA 987/983 boundary, and 975, came from `tbbuild --ide` on the same project. Found documenting the contributed package TBMANLIB: docs/Reference/Contributed/TBMANLIB/index.md, section "32-bit and 64-bit programs", carries a WARNING naming BETA 1005 for the crash. That section says the package's reference has a path for 32-bit programs and none for 64-bit programs, and puts the crash down to the reference; the crash does not depend on `path64`, so when this entry is edited or fixed read the section again. When fixed: remove the WARNING, and rewrite "cannot be built for 64-bit" in ToolsJScript.md and the section to what the compiler then does. -->
