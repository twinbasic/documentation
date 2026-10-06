Filed as [twinbasic/twinbasic#2469](https://github.com/twinbasic/twinbasic/issues/2469).

## LLVM-compiled code rounds a `Single` or `Double` to an integer half away from zero, where VB6 and plain code round half to even

**Describe the bug**
In a procedure compiled with LLVM, `CLng`, `CInt` and `CLngLng` of a `Single` or `Double` variable, an assignment of one to a `Long` or `Integer`, and the operand conversion of `\` round a value exactly halfway between two integers away from zero: `CLng(2.5)` of a `Double` variable is 3 and `CLng(-0.5)` is -1. The same code without LLVM rounds to the even integer, 2 and 0, as VB6 does. A value that is not a tie rounds the same everywhere. Observed in a run of the reproducer project.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `llvm-conversion-rounds-half-away.twinproj` (attached as `llvm-conversion-rounds-half-away.zip`). It needs an LLVM licence (Ultimate): `LlvmCases` is compiled with LLVM by its `[CompilerOptions("+llvm")]`, and `PlainCases` holds the same statements without it. Each procedure converts 0.5, 2.5, 3.5, -0.5 and -2.5.
2. Run it (F5). The DEBUG CONSOLE has one line per value and mode; for 2.5 and -0.5 they read:
   ```
   plain 2.5:  CLng(d)=2  CLng(s)=2  CInt(d)=2  CLngLng(d)=2  l=d:2  d\1=2  CLng(v)=2  Round=2
   plain -0.5:  CLng(d)=0  CLng(s)=0  CInt(d)=0  CLngLng(d)=0  l=d:0  d\1=0  CLng(v)=0  Round=0
   LLVM  2.5:  CLng(d)=3  CLng(s)=3  CInt(d)=3  CLngLng(d)=3  l=d:3  d\1=3  CLng(v)=2  Round=2
   LLVM  -0.5:  CLng(d)=-1  CLng(s)=-1  CInt(d)=-1  CLngLng(d)=-1  l=d:-1  d\1=-1  CLng(v)=0  Round=0
   ```

**Expected behavior**
The same result in both: round half to even, as in VB6 (attached as `llvm-conversion-rounds-half-away-vb6.zip`), which prints for the same values `CLng(d)=2` for 2.5 and `CLng(d)=0` for -0.5, `l=d:2`, `d\1=2`, `CLng(v)=2` and `Round=2`, `0` and `0`. VB6 has no `LongLong`, so that column is missing from its output.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 997

**Additional context**
Also on BETA 995, identically, and on win64.

What does not differ in LLVM-compiled code: `CLng` of a `Variant` holding the `Double`, `Round`, `Int` and `Fix`, and conversions of a literal such as `CLng(2.5)` (folded to 2 by the compiler).

A consequence: a value that rounds to zero in plain code can raise an error under LLVM. In a `Byte` conversion, `CByte(-0.5)` and `b = -0.5` (a `Double` variable) give 0 without LLVM and error 6, *Overflow*, with it, because the value becomes -1.

Severity: a silent wrong result, at ties only, unless the rounding makes a conversion overflow.

<!-- Reproducer: bugs/llvm-conversion-rounds-half-away/ (mode run: the LLVM procedure is compiled by its attribute, so `bug_repro.mjs run` needs no flag; expects the plain and LLVM lines above); verified on BETA 997 and 995 with `bug_repro.mjs run`, and on 997 with --arch win64. VB6: `bug_repro.mjs vb6 llvm-conversion-rounds-half-away`. The CByte case was run in a scratch project on 997. docs/LLVM/Getting-Started.md ("Language support") carries a `> [!WARNING]` for it, naming BETA 997 (a silent wrong result, owner's rule), removed once a fixed build is released. Related: llvm-double-overflow-no-error. -->
