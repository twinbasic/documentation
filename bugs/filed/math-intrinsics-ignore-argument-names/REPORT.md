Filed as [twinbasic/twinbasic#2473](https://github.com/twinbasic/twinbasic/issues/2473).

## `ShiftRotateLeft`, `ShiftRotateRight`, `ShiftUnsignedRight` and `ByteSwap` ignore argument names and take their arguments by position

**Describe the bug**
The four new intrinsics of the VBA package (BETA 997) take their arguments by position and discard the names a call gives. `ShiftRotateLeft(ShiftAmount:=4, Number:=n)` uses 4 as the number and `n` as the shift amount, with no error, so the result is wrong. A name that matches no parameter, as in `ShiftRotateLeft(Foo:=n, Bar:=k)`, is accepted too. An ordinary procedure honours the names. Observed in a run of the reproducer project.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `math-intrinsics-ignore-argument-names.twinproj` (attached as `math-intrinsics-ignore-argument-names.zip`). Its `Sub Main` calls each intrinsic with a `Long` `n` of `&H12345678` and `k` of 4, in several forms.
2. Run it (F5) and read the DEBUG CONSOLE:
   ```
   positional                  23456781
   named, in order             23456781
   named, swapped              4000000
   right, named, swapped       400
   unsigned, named, swapped    0
   unknown names               23456781
   ByteSwap, unknown name      78563412
   own function, swapped       23456781
   ```

**Expected behavior**
The names select the parameters, as they do for any procedure (the last line, a function of the project with the same parameter names): `ShiftRotateLeft(ShiftAmount:=4, Number:=n)` is `23456781`, `ShiftRotateRight` of the same is `81234567` and `ShiftUnsignedRight` is `01234567`. A name that matches no parameter is a compile error, as it is in VB6 (*Named argument not found*).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 997

**Additional context**
The four intrinsics are new in BETA 997; BETA 995 does not know them (TB5079). VB6 has no equivalent functions, so there is no VB6 project; the VB6 behaviour quoted is for a named argument that matches no parameter.

The declared parameters are `Number` and `ShiftAmount` (`ByteSwap` has `Number`). `Compilation.UnrollLoop Bogus:=4` is accepted in the same way. Calls that give the arguments in declaration order, with or without the names, work.

Severity: a silent wrong result, but only for a call that names its arguments out of declaration order or misspells a name.

<!-- Reproducer: bugs/math-intrinsics-ignore-argument-names/ (mode run, expects the eight lines above); verified on BETA 997 by `bug_repro.mjs verify`; not on 995 (the functions do not exist there). VB6 has no such function: `vb6run` gives *Sub or Function not defined* (beta997-probes/vb6, v1 to v3). docs/Reference/Default/VBA/Math/ShiftRotateLeft.md, ShiftRotateRight.md and ShiftUnsignedRight.md each carry a `> [!WARNING]` for it (ByteSwap.md none: with one argument, any name gives the right result), naming BETA 997 (a silent wrong result, owner's rule), removed once a fixed build is released. -->
