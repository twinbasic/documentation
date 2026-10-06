Filed as [twinbasic/twinbasic#2468](https://github.com/twinbasic/twinbasic/issues/2468).

## In LLVM-compiled code a shift count is cut to the width of the shifted `Byte` or `Integer`

**Describe the bug**
In a procedure compiled with LLVM, the count of `<<` or `>>` is reduced to the width of the shifted type before the shift, for a `Byte` and an `Integer`: `b << 256` with `b` a `Byte` of `&H81` leaves `&H81`, and `b >> 257` gives `&H40`, because the count becomes 0 and 1. Without LLVM both give 0, as the documentation says: a shift by as many bits as the type holds, or more, yields 0. An `Integer` shifted by 65536 or more behaves the same way. A `Long` is not affected, as the count is itself a `Long`. Observed in a run of the reproducer project.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `llvm-shift-count-truncated.twinproj` (attached as `llvm-shift-count-truncated.zip`). It needs an LLVM licence (Ultimate): `LlvmCases` is compiled with LLVM by its `[CompilerOptions("+llvm")]`, and `PlainCases` holds the same statements without it.
2. Run it (F5) and read the DEBUG CONSOLE:
   ```
   plain  Byte    << 256    0
   plain  Byte    >> 257    0
   plain  Integer << 65536  0
   plain  Integer >> 65537  0
   plain  Long    << 65536  0
   plain  Long    << -1     80000000
   plain  Long    >> -1     FFFFFFFF
   LLVM   Byte    << 256    81
   LLVM   Byte    >> 257    40
   LLVM   Integer << 65536  8001
   LLVM   Integer >> 65537  C000
   LLVM   Long    << 65536  0
   LLVM   Long    << -1     0
   LLVM   Long    >> -1     0
   ```

**Expected behavior**
0 for a `Byte` shifted by 8 or more, and for an `Integer` shifted by 16 or more, whatever the count, in LLVM-compiled code as without LLVM (docs/Reference/Core/LeftShift.md and RightShift.md: "A shift by as many bits as the type holds, or more, yields 0"). VB6 has no shift operators, so there is no VB6 project.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 997

**Additional context**
Also on BETA 995, identically, and on win64.

Counts from 8 to 255 for a `Byte`, and 16 to 65535 for an `Integer`, give 0 in both modes. The difference starts where the count, taken modulo 256 or 65536, is below the width.

A negative count also differs between the two modes, and the documentation calls the result of a negative count "no useful result". Without LLVM the count is reduced modulo 32 for every type (`1& << -1` is `&H80000000`, `&H80000001 >> -1` is `&HFFFFFFFF`); with LLVM a negative count gives 0 (a `Long`, `LongLong` or `Integer`; a `Byte` gives 0 too). Neither is documented, so that part is a difference, not a departure.

Severity: a silent wrong result for a `Byte` shifted by 256 or more, or an `Integer` by 65536 or more. Counts that large are rare.

<!-- Reproducer: bugs/llvm-shift-count-truncated/ (mode run: the LLVM procedure is compiled by its attribute; expects the Byte and Integer lines above); verified on BETA 997 and 995 with `bug_repro.mjs run`, and on 997 with --arch win64; the count table over Byte, Integer and Long is from a scratch run in both modes (beta997-probes cases7), and the Long and LongLong negative-count rows from probes/m03_values/diff_plain_vs_llvm.txt. docs/Reference/Core/LeftShift.md and RightShift.md each carry a `> [!WARNING]` for the Byte and Integer count (the documented rule is the one LLVM breaks), and docs/LLVM/Getting-Started.md ("Language support") may carry a `> [!NOTE]` for the negative count; naming BETA 997; removed once a fixed build is released. -->
