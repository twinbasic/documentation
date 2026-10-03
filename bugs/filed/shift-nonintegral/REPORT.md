Filed as [twinbasic/twinbasic#2436](https://github.com/twinbasic/twinbasic/issues/2436).

## Shifting a `Single`, `Double`, `Date`, `Boolean` or `String` compiles clean, then fails code generation

**Describe the bug**
`<<` and `>>` on a `Single`, `Double`, `Date`, `Boolean` or `String` compile with no diagnostic, and code generation then fails for the procedure that holds the shift. The failure is reported only in the build log, as `[LINKER] compilation (codegen) error detected in '<module>.<procedure>' at line #<n>`, naming the shift's line.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `shift-nonintegral.twinproj` (attached as `shift-nonintegral.zip`). Its source file `Probe.twin` holds the shift, and `Sub Main` calls it:
   ```
   Dim a As Single = 7.9
   Dim c As Integer = 1
   Debug.Print "before the shift"
   Debug.Print a << c
   ```
2. See the problems panel show 0 errors, 0 warnings, 0 hints and 0 infos.
3. Click **Build**.
4. See the build fail: `[LINKER] compilation (codegen) error detected in 'Probe.Show' at line #7`, then `[LINKER] FAILED due to compilation errors`, and no output file.

The same shift in a procedure that nothing calls builds clean. In a `[RunAfterBuild]` Sub the build reports `[LINKER] SUCCESS created output file`, and the error appears only when the procedure is called: `[LINKER] compilation (codegen) error detected in 'Probe.Go' at line #8`. Nothing in the procedure runs, not even the statements before the shift, and `On Error Resume Next` in the caller does not see it; the caller stops too.

| left operand | `<<` and `>>` |
|---|---|
| `Single`, `Double`, `Date`, `Boolean`, `String` | codegen error |
| `Byte`, `Integer`, `Long`, `LongLong`, `LongPtr` | shifts |
| `Currency`, `Decimal` | builds, but works on the value: a `Currency` holding 7.9, shifted left by 1, is 15.8 |
| a `Variant` holding any of the types above | builds, and multiplies or divides the value |

Precedence reaches it too: `"x" & n << 2` parses as `("x" & n) << 2`, a `String` shift, and fails the same way.

**Expected behavior**
Either a compile-time diagnostic at the shift, or a working shift. The documentation had said floating-point operands are truncated before shifting.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
BETA 983 gives the same result for the reproducer: the build fails with the same codegen error. Severity: the compiler accepts the expression with no diagnostic, and the procedure that contains it never runs.

<!-- Reproducer: bugs/shift-nonintegral/ (mode build, expects tbbuild exit 5 and "codegen" in the message); verified on 995 and 983. The first two failures, a reached procedure failing the build and a [RunAfterBuild] Sub building and then failing when called, were both measured on 2026-10-02 on 995 (tbbuild --build, and tbrun on a probe holding only the Single shift); the old entry described only the second. WIP.Harness.md (around the passage on [RunAfterBuild] and a shifted Single) records the second form; update it if this is fixed. Found by probing the operators' result types for Reference/Operators.md. -->
