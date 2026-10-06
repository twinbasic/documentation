Filed as [twinbasic/twinbasic#2477](https://github.com/twinbasic/twinbasic/issues/2477).

## LLVM-compiled code raises no error when a `Double` overflows, where it raises error 6 otherwise

**Describe the bug**
In a procedure compiled with LLVM, a `Double` addition, subtraction, multiplication or exponentiation whose result is too large for a `Double` raises no error: `Err.Number` stays 0 and the target holds infinity. The same statement in a procedure compiled without LLVM raises error 6 (*Overflow*), as VB6 does. A program that relies on error 6 to detect an overflow gets a silent `Inf` instead. No project setting and no other attribute is involved: the one difference is `[CompilerOptions("+llvm")]` on the procedure, or `tbrun --llvm` on the whole project. Observed in a run of the reproducer project.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `llvm-double-overflow-no-error.twinproj` (attached as `llvm-double-overflow-no-error.zip`). It needs an LLVM licence (Ultimate): `LlvmCases` is compiled with LLVM by its attribute. `PlainCases` holds the same statements without it. Each runs under `On Error Resume Next`, for example:
   ```
   [CompilerOptions("+llvm")]
   Private Sub LlvmCases()
       Dim big As Double = 1E+308
       Dim r As Double
       On Error Resume Next
       r = 5#: Err.Clear: r = big * 10#
       Debug.Print "LLVM   Double *   Err=" & Err.Number & " r=" & r
   End Sub
   ```
2. Run it (F5) and read the DEBUG CONSOLE:
   ```
   plain  Double *   Err=6 r=1.#INF
   plain  Double +   Err=6 r=1.#INF
   plain  Double ^   Err=6
   plain  Double /   Err=6 r=1.#INF
   plain  1# / 0#    Err=11 r=1.#INF
   plain  Long +     Err=6 l=5
   LLVM   Double *   Err=0 r=1.#INF
   LLVM   Double +   Err=0 r=1.#INF
   LLVM   Double ^   Err=0
   LLVM   Double /   Err=6 r=5
   LLVM   1# / 0#    Err=11 r=5
   LLVM   Long +     Err=6 l=5
   ```

**Expected behavior**
Error 6 in LLVM-compiled code for every `Double` overflow, as in the same code without LLVM and in VB6 (attached as `llvm-double-overflow-no-error-vb6.zip`, which prints `Err=6` for the multiplication, the addition, the exponentiation and the division, and `Err=11` for `1# / 0#`).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 997

**Additional context**
Also on BETA 995, identically, and on win32 and win64. Running the reproducer with `--llvm` compiles every procedure with LLVM and gives the `LLVM` results for both halves. With `[FloatingPointErrorChecks(True)]` on the LLVM procedure the multiplication still raises nothing.

What does not reproduce it: a `Double` division that overflows (`1E+308 / 0.1`) raises 6, and so does `Exp(1000#)`, a `Long` overflow (`2147483647 + 1`) raises 6, and `1# / 0#` raises 11, all in LLVM-compiled code. So the overflow check is missing from the addition, subtraction, multiplication and `^` operators, not from the error path.

A second difference shows in the same output. After a division that raises an error, LLVM-compiled code leaves the target unassigned: `r` is still 5 after `1# / 0#` (error 11) and after `1E+308 / 0.1` (error 6). Without LLVM the target is assigned infinity, `1.#INF`, and so it is in VB6 (`r=1.#INF` after each of its errors). Under `On Error Resume Next` the two builds then continue with different values.

A `Single` addition, subtraction, multiplication or division that overflows raises no error without LLVM, where VB6 raises 6 (with LLVM the first three raise none either, and the division raises 6). That is a separate defect, with its own reproducer, in the entry "A `Single` that overflows raises no error, where VB6 raises error 6" (`bugs/single-overflow-no-error/`).

Severity: a silent wrong result. An overflow that raises 6 in a debug run and no error in the LLVM-compiled build changes what a program computes, and nothing marks the difference.

<!-- Reproducer: bugs/llvm-double-overflow-no-error/ (mode run: the LLVM procedure is compiled by its attribute, so `bug_repro.mjs run` needs no flag; expects the plain and LLVM lines above); verified on BETA 997 and 995 with `bug_repro.mjs run`, and on 997 with --llvm and --arch win64. VB6: `bug_repro.mjs vb6 llvm-double-overflow-no-error`. Not run in a built exe (Debug.Print writes nothing there). Originated in the p2 probes of 2026-10-06 (b_fpu_off). The docs/LLVM/Getting-Started.md section "Language support" carries a `> [!WARNING]` for it, naming BETA 997 (a silent wrong result, owner's rule); remove it once a fixed build is released. Related: the filed bugs/filed/llvm-err-after-raise (same page, a NOTE). The `Single` overflow without LLVM is its own entry, single-overflow-no-error. -->
