Filed as [twinbasic/twinbasic#2476](https://github.com/twinbasic/twinbasic/issues/2476).

## A `Single` that overflows raises no error, where VB6 raises error 6

**Describe the bug**
When a `Single` addition, subtraction, multiplication or division produces a result too large for a `Single`, twinBASIC raises no error and the target holds infinity: `s = sbig + sbig` with `sbig` at 3E+38 leaves `Err.Number` at 0 and `s` at `1.#INF`. VB6 raises error 6 (*Overflow*) for the same statement. The same holds for `+=` and `*=`, for `Single * Long` and for some `Single` constant expressions. A `Double` overflow raises 6, so a `Single` and a `Double` are treated differently. Observed in a run of the reproducer project.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `single-overflow-no-error.twinproj` (attached as `single-overflow-no-error.zip`). Its `Sub Main` runs each case under `On Error Resume Next`, for example:
   ```
   Dim sbig As Single = 3E+38!
   Dim s As Single
   On Error Resume Next
   s = 5!: Err.Clear: s = sbig + sbig
   Debug.Print "Single +        Err=" & Err.Number & " s=" & s
   ```
2. Run it (F5) and read the DEBUG CONSOLE:
   ```
   Single +        Err=0 s=1.#INF
   Single -        Err=0 s=-1.#INF
   Single *        Err=0 s=1.#INF
   Single /        Err=0 s=1.#INF
   Single * Long   Err=0 s=1.#INF
   s = s + x       Err=0 s=1.#INF
   s += x          Err=0 s=1.#INF
   s = s * x       Err=0 s=1.#INF
   s *= x          Err=0 s=1.#INF
   CSng(Double)    Err=6 s=5
   Single ^        Err=6 s=5
   Variant *       Err=0 Double
   Variant +       Err=0 Double
   ```

**Expected behavior**
Error 6 for every `Single` arithmetic result that does not fit a `Single`, as in VB6 (attached as `single-overflow-no-error-vb6.zip`, which prints `Err=6 s=1.#INF` for `+`, `-`, `*`, `/`, `Single * Long`, `s = s + x` and `s = s * x`). The target is `1.#INF` after the error in both, so only the error is missing.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 997

**Additional context**
Also on BETA 995, identically, and on win64 (which prints `inf` where win32 prints `1.#INF`). Compiled with LLVM, `+`, `-`, `*` and the compound forms are the same, and `/` raises 6, as in VB6.

What matches VB6: a `Variant` holding a `Single` that overflows becomes a `Double` variant, with no error, in both (`Variant *`, `Variant +` above). `CSng` of a `Double` that is too large raises 6 in both. The result of `Single * Long` is a `Double` in both (`TypeName`), though twinBASIC stores it into a `Single` without an error.

Where twinBASIC differs from VB6 in the other direction: `s = sbig ^ 2!` raises 6 in twinBASIC and gives `1.#INF` with no error in VB6, and so does assigning a `Double` that is too large to a `Single` (`s = 1E+300`: error 6 in twinBASIC, `1.#INF` with no error in VB6).

A `Single` constant expression that overflows is refused by VB6 at compile time with *Overflow*. twinBASIC compiles some forms (`Const A As Single = 3E+38! * 10!`, and the `+`, `-` and `/` forms, in a project of their own) and refuses others with TB5002 (`^`, `CSng(1E+300)`, and `1E+300` assigned to a `Single`); which constants it refuses also changed with the other constants in the project, so that part is not in the reproducer.

Severity: a silent wrong result. A `Single` overflow that ends the program or reaches a handler in VB6 gives `Inf` and carries on in twinBASIC.

<!-- Reproducer: bugs/single-overflow-no-error/ (mode run; expects the `+`, `-`, `*`, `/`, `+=` and `CSng` lines above); verified on BETA 997 and 995 with `bug_repro.mjs run`, and on 997 with --llvm and --arch win64. VB6: `bug_repro.mjs vb6 single-overflow-no-error` (VB6 has no `+=`, so the file has `s = s + x`). The constant cases come from tbbuild on one-constant projects, and VB6's from `vb6run.mjs` on `Const` statements; neither is in the reproducer. Pages with wrong sentences: docs/Reference/Core/Divide.md line 31 ("A declared **Single** that overflows raises error 6"), and the sentence "A declared (non-**Variant**) result that overflows raises error 6" in Plus.md, Minus.md and Multiply.md, and docs/Reference/Operators.md line 135 ("A result that does not fit its type raises error 6"); each of Divide.md, Plus.md, Minus.md, Multiply.md and Operators.md (after its porting table) carries a `> [!WARNING]` naming BETA 997 (a silent wrong result, owner's rule); remove them once a fixed build is released. The variant rows (Plus.md line 54, Minus.md line 34, Multiply.md line 32, Divide.md line 31's second clause) and the result-type rows for Single and Long are right. Exponent.md says nothing about overflow. Related: llvm-double-overflow-no-error (the `Double` overflow under LLVM). -->
