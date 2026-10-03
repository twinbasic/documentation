Filed as [twinbasic/twinbasic#2458](https://github.com/twinbasic/twinbasic/issues/2458).

## Reading `Forms` by index returns a broken reference, and the process then crashes

**Describe the bug**
In a loop over `Forms.Count`, `Set f = Forms(k)` with `f` declared `As Form`, followed by a read of `f.Name`, ends in an access violation (`0xC0000005`). As a compiled EXE the process exits with that code. Run in the IDE, the DEBUG CONSOLE reports `NATIVE EXCEPTION: ACCESS_VIOLATION` at the line that reads `f.Name`, and the run ends without returning.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `forms-by-index-crash.twinproj` (attached as `forms-by-index-crash.zip`). It is a Standard EXE project with one empty form, `Form1`, and a `Sub Main` that loads it:
   ```
   Dim f As Form
   Dim k As Long
   Load Form1
   For k = 0 To Forms.Count - 1
       Set f = Forms(k)
       Debug.Print "k = "; k; " name = "; f.Name
   Next k
   ```
2. Build the project and run the EXE, or run it in the IDE (F5).
3. See the process end with `0xC0000005` (exit code -1073741819), or the access violation in the DEBUG CONSOLE.

Declaring `f` As `Form1` or As `Object` instead, with everything else the same, returns the form and the program exits 0. With three forms loaded, the loop crashes the same way, and an earlier probe saw the loop variable corrupted: `k` read 0, 0, 0, then 8195702.

**Expected behavior**
`Forms(k)` returns the loaded form, `f.Name` is `Form1`, and the program exits 0, as it does with `f` declared `As Object`.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 983, as a compiled EXE (reproduced again with this project). Severity: crash (`0xC0000005`), from a form of access the documentation shows. What does not reproduce it, measured on BETA 995 as a compiled EXE: `Set f = Forms(0)` with the literal index 0 and no loop, then `f.Name`, returns `Form1` and the program exits 0; so does `s = Forms(0).Name`, and `Debug.Print Forms(0).Name`. An earlier entry said `s = Forms(0).Name` returns an empty string and the process later dies; this was not seen again here, and the loop is the smallest form found. From earlier probes: `n = 0: Set f = Forms(n)` outside a loop returns the form and the program exits 0; `For Each f In Forms` and `Unload Forms(i)` work; `Printers(0)` with a literal index works. A variant of the loop that wrote the name with a helper `Sub` instead of `Debug.Print` did not crash in one run; the crash was seen with `Debug.Print`, and with `Dim t As String = f.Name` and no printing.

<!-- Stated by the note at docs/Reference/Default/VB/Global/index.md line 47, and by builder/REVIEW-USECASES-5b4cd37.md item 26. That note says `Forms(0).Name` returns an empty string and the same for `Set f = Forms(0)` outside a loop; neither reproduced on 995 in the EXE with this project, so re-check the note's wording before filing: the loop is what reproduces. Measured with scripts/bug_repro.mjs run mode with "exe": true (tbrun --exe), verify, on 995 and 983; the IDE run (F5) also crashes on 995. Earlier entry text: found by the fix pass for round 8's error-number findings and by the IDE debugging probe for round 8's UC-61. -->

<!-- Narrowed after filing (2026-10-02, BETA 995 with 983 as control, identical; each case three times, deterministic; probes in %TEMP%/claude/forms-probe, not kept). The cause is not the loop: ObjPtr(Forms(0)) equals ObjPtr(Form1) the first time and is about 140 bytes higher on later calls, and Name read through that reference is "". Form1.Name and Forms.Count stay right throughout, so the form is not freed. Which code shows it depends on the expression: Set f = Forms(0) (f As Form) then "[" & f.Name & "]" is "" in the IDE and the exe, but Debug.Print f.Name prints Form1; Forms(0).Name is "" in the IDE only, where an access violation in OLEAUT32 follows; the exe crash needs Debug.Print with f.Name in the loop, as this report shows. As Object, As Form1 and For Each return Form1 in every run. Worth a follow-up comment on the issue: the ObjPtr evidence. docs/Reference/Default/VB/Global/index.md states this in its WARNING. -->
