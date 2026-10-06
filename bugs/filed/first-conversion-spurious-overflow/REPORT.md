Filed as [twinbasic/twinbasic#2497](https://github.com/twinbasic/twinbasic/issues/2497).

## In an IDE run, the first conversion of a Single or Double to an integer raises error 6 when the code also converts a constant out of the Long range

**Describe the bug**
When the code a run compiles holds a conversion of a constant that does not fit a `Long`, such as `CLng(1E+20)`, the first conversion of a `Single` or `Double` value to an integer that the run makes raises error 6 (*Overflow*), and its target is left at 0. The value converted is in range, and the conversion that overflows need never run: `If False Then t = CLng(1E+20)` is enough. Only the first conversion of the run fails; the same statement run again gives the right value. Observed in IDE runs (F5 and a `[RunAfterBuild]` procedure); the built exe is not affected.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `first-conversion-spurious-overflow.twinproj` (attached as `first-conversion-spurious-overflow.zip`). Its `Sub Main`:
   ```
   Dim s As Single = 4.5
   Dim t As Long
   On Error Resume Next
   t = CLng(s)
   Debug.Print "first  CLng(s): t=" & t & " Err=" & Err.Number
   Err.Clear
   t = CLng(s)
   Debug.Print "second CLng(s): t=" & t & " Err=" & Err.Number
   Err.Clear
   If False Then t = CLng(1E+20)   ' never runs; without this line both lines print t=4 Err=0
   ```
2. Run it (F5) and read the DEBUG CONSOLE:
   ```
   first  CLng(s): t=0 Err=6
   second CLng(s): t=4 Err=0
   ```
3. Without `On Error Resume Next`, the run stops at the first `t = CLng(s)` with error 6.

**Expected behavior**
`t=4 Err=0` on both lines, as the built exe of the same project prints, and as VB6 prints for the same statements (attached as `first-conversion-spurious-overflow-vb6.zip`).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 997

**Additional context**
Also on BETA 995. Each of these, anywhere in code the run compiles, causes it: `CLng(1E+20)`, `CInt(1E+10)`, and `t = 1E+20` assigned to a `Long`, in the same procedure or in one it calls (even after the failing conversion, or behind `If False`). These do not: the same conversion in a `Private` procedure that nothing references, `CLng(1E+9)` (which fits), `CByte(300.5)`, and `1E+300 * 1E+300`. Every value that causes it lies outside the 32-bit integer range; `CByte(300.5)` does not. The first conversion fails whether it is `CLng` or the count of `ShiftRotateLeft`, of a `Single` or of a `Double`, and whether the value is 4.5 or 4. If a conversion that overflows at run time (`CLng(d)` with `d` holding 1E+20) runs first, it raises 6 as it should, and the conversions after it are correct. Compiled with LLVM, nothing fails.

This looks like a floating-point exception flag set while the compiler evaluates the constant conversion, in the IDE's process, which is also the process the run executes in; the run's first checked conversion then reads the flag and reports an overflow.

Severity: a silent wrong result under `On Error Resume Next` (0 for 4), and otherwise a spurious error 6 that stops the run, in the IDE only, so a program that works as an exe fails while being debugged.

<!-- Reproducer: bugs/first-conversion-spurious-overflow/ (mode run, expects the two lines above); verified on BETA 997 with bug_repro run and verify. VB6: bug_repro vb6 prints t=4 Err=0 twice. The variants (cause and non-cause lists, the exe column with tbrun --exe, LLVM with tbrun --llvm) were measured on 997 with one tbrun project each; the trees and outputs were in the session scratchpad, not kept. 995: .claude/tooling-review-scratch/beta997-probes/probes/m24_round/run_995.txt (case A1); the first sightings are m17_early and m16_with there. Stated in a `> [!WARNING]` naming BETA 997 on docs/Reference/Default/VBA/Conversion/CLng.md and CInt.md (after the rounding paragraph; owner's choice of pages); remove both once a fixed build is released. -->
