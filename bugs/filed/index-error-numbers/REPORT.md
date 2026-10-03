Filed as [twinbasic/twinbasic#2440](https://github.com/twinbasic/twinbasic/issues/2440).

## An out-of-range index raises `&H8002000B` or `&H80004005`, not VBA's error 9

**Describe the bug**
An array or `Collection` index that is out of range raises -2147352565 (`&H8002000B`, *Invalid index.*) or -2147467259 (`&H80004005`, *Unspecified error*). VBA raises error 9, *Subscript out of range*, so code that handles `Err.Number = 9` does not recognise the error. There is no diagnostic.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `index-error-numbers.twinproj` (attached as `index-error-numbers.zip`) and run it (F5). Its `Sub Main` holds the whole bug:
   ```
   Dim a(5) As Long
   On Error Resume Next
   a(7) = 1
   Debug.Print Err.Number, Hex$(Err.Number), Err.Description
   ```
2. See `-2147352565  8002000B  Invalid index.` for this case. The project goes on to try the other cases, one line each:

   | access | twinBASIC | VBA, per VBA-Docs' *Subscript out of range (Error 9)* |
   |---|---|---|
   | past a fixed or dynamic array's bound, a `Variant` array's, or `Split("x y")(5)` | -2147352565 (`8002000B`) *Invalid index.* | 9 |
   | an element of an array never dimensioned: `Dim u() As Integer: u(8) = 234`, VBA-Docs' own example | -2147467259 (`80004005`) *Unspecified error* | 9 |
   | a `Collection` member by a missing index or key | -2147467259 *Unspecified error* | 9 for a missing member |
   | `Forms(99)`, `Forms.Item(-1)` | -2147467259 *Unspecified error* | --- |

**Expected behavior**
Error 9, as in VBA, for each of these. `Err.Raise 9` already gives 9 with the description *Subscript out of range*.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 983, in the IDE and in a compiled EXE alike. Severity: VBA code that handles `Err.Number = 9` does not recognise the error, with no diagnostic. What does not reproduce it: `UBound` of an erased array, `Printers(99)` and `Err.Raise 9` all give 9, and division by zero gives 11. The IDE's run-time error panel shows the same number `Err.Number` holds, for the array case. An erased array behaves as one never dimensioned: `-2147467259` for an element, 9 from `LBound` and `UBound`. `Printers` raises 9 past its end but `-2147467259` for a negative index and for an unknown name. The description of `-2147467259` varies between runs: *Unspecified error* in one, *Automation error* in another. The project's output on BETA 995 matches the table's first three rows; the `Forms` row and the other facts in this paragraph are from earlier runs of the same kind, not re-run for this report.

<!-- Stated by docs/Reference/Default/VBA/ErrObject/Number.md (the table of error numbers that differ from VBA) and by docs/Reference/Core/On-Error.md; when fixed, update both. Measured with scripts/bug_repro.mjs (run mode, verify) on 995; earlier by compile probes through tbrun, in the IDE and as a built EXE on 983. -->
