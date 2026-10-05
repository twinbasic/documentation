Filed as [twinbasic/twinbasic#2466](https://github.com/twinbasic/twinbasic/issues/2466).

## `LSet` on a `Long` variable compiles, and the build fails with a codegen error

**Describe the bug**
`LSet` is defined for a string or a user-defined type. A statement `LSet n = "ab"` with `n` declared `As Long` is accepted by the compiler without a diagnostic, and building the project then fails: the linker reports a code-generation error at the statement, and no exe is produced. Run from the IDE (F5), the project stops the same way. Observed in a build of the reproducer project.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `lset-long-codegen-error.twinproj` (attached as `lset-long-codegen-error.zip`). Its one source file, `Startup.twin`, is a `Sub Main` with `Dim n As Long` and `LSet n = "ab"`.
2. Compile it: no errors, warnings or hints.
3. Build it (Build, or F5) and read the DEBUG CONSOLE:
   ```
   [BUILD] Starting...
   [LINKER] compilation (codegen) error detected in 'Startup.Mainrootmain' at line #5
   [LINKER] FAILED due to compilation errors 'LsetLongCodegenError_win32.exe'
   [BUILD] failed
   ```

**Expected behavior**
A compile error on the `LSet` line, as for the neighbouring wrong operands: `LSet s = a` with `a` a user-defined type and `RSet a = b` with user-defined types are refused with TB5001 (*unable to convert type ... to String*), and `LSet a = s` with a string source and a user-defined type destination is refused with TB5249. VB6 refuses this statement at compile time with *LSet allowed only on strings and user-defined types* (attached as `lset-long-codegen-error-vb6.zip`, which does not build).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low. The error is reported, so nothing runs wrongly, but it points at no cause, and the compile step that the IDE shows while typing says the project is fine.

Tried with a `Long` destination only. The same on BETA 983.

<!-- Reproducer: bugs/lset-long-codegen-error/ (mode build, expects tbbuild exit 5 and "codegen" in the message); verified on 995 and 983. The BUGS tool's `vb6` command prints VB6's compile error and exits 1 for it, which is the comparison. No page states it: docs/Reference/Core/LSet.md says nothing about other destinations. -->
