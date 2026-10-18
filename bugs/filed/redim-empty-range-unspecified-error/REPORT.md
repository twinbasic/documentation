Filed as [twinbasic/twinbasic#2524](https://github.com/twinbasic/twinbasic/issues/2524).

## `ReDim` with an upper bound below the lower bound raises *Unspecified error* (-2147467259), where VB6 raises error 9, *Subscript out of range*

**Describe the bug**
`ReDim` of a dynamic array with an upper bound below its lower bound, such as `ReDim a(0 To -1)`, `ReDim a(1 To 0)` or `ReDim a(5 To 2)`, raises error -2147467259, *Unspecified error* (E_FAIL). VB6 raises error 9, *Subscript out of range*, for each of them. The error is the same for every element type and for `ReDim Preserve`, and a failed `ReDim Preserve` leaves the array as it was. A program that handles error 9, or tests `Err.Number = 9`, around a `ReDim` does not recognise this one. Observed in the IDE, with the error of each statement written to the DEBUG CONSOLE.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `redim-empty-range-unspecified-error.twinproj` (attached as `redim-empty-range-unspecified-error.zip`). Its one source file, `Startup.twin`, tries 24 `ReDim` statements, each followed by a line that writes the error; the first three are enough:
   ```
   Module Startup

       Public Sub Main()
           Dim a() As Long
           On Error Resume Next
           ReDim a(0 To -1)
           Debug.Print Err.Number & vbTab & Err.Description
           Err.Clear
           ReDim a(5 To 2)
           Debug.Print Err.Number & vbTab & Err.Description
           Err.Clear
           ReDim a(0 To 0)
           Debug.Print Err.Number & vbTab & Err.Description
       End Sub

   End Module
   ```
2. Run the project in the IDE (F5) and read the DEBUG CONSOLE.
3. See `-2147467259	Unspecified error` twice, then `0`. VB6 (the same statements, attached as `redim-empty-range-unspecified-error-vb6.zip`, which writes each result to `out.txt`) gives `9	Subscript out of range` twice, then `0`.

What decides it, each tried in the project above:
- Every range whose upper bound is below its lower bound raises the error: `(0 To -1)`, `(1 To 0)`, `(5 To 2)`, `(-3 To -5)`; `(-1)`, which is `0 To -1`, and `(n)` with `n = -1`; two dimensions, `(0, 0 To -1)` and `(1 To 0, 0 To 1)`. VB6 raises error 9 for each.
- The element type makes no difference: **Long**, **String**, a user-defined type, **Object**, **Variant** (an array of Variant, and a **Variant** variable, empty or holding an array), and `ReDim s(5 To 2) As String`.
- `ReDim Preserve` raises it too, for `(0 To -1)` of a **Long** array, a **String** array and a **Variant** variable that holds an array, and for `(5 To 2)` of a **Long** array. After the failed `ReDim Preserve a(0 To -1)`, `UBound(a)` is still 2, in both.
- A range of one element or more is not affected: `(0 To 0)`, `(2 To 2)`, `(1 To 2)` and `(0)` raise nothing, in both.
- A 64-bit program, and an exe built from the project, give the same errors.
- With LLVM (the project compiled with `+llvm`) the results differ, and differ from VB6: a range that ends one below its start (`0 To -1`, `1 To 0`, `(-1)`, `(n)`, `(0, 0 To -1)`, `(1 To 0, 0 To 1)`, and the same for **String**, a user-defined type, **Object** and **Variant**) makes an empty array and raises nothing, so `UBound(a)` is `-1`; a range further below (`5 To 2`, `-3 To -5`) raises -2147024882, *Application-defined or object-defined error*; and `ReDim Preserve a(5 To 2)` raises error 9, as VB6 does.

**Expected behavior**
Error 9, *Subscript out of range*, for each of these statements, as in VB6, whether the code is compiled with LLVM or not.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
The same on BETA 997, 995 and 957 (not tried with LLVM there). Not tried: the run-time error panel for an unhandled error, and the exe built with LLVM.

Severity: low. An error is raised either way, and an unhandled one stops the program either way; only its number and text differ, so code that tests for error 9 around a `ReDim` (a size computed from data that can be zero or negative) does not recognise it. With LLVM the statement can make an empty array where VB6 raises an error, which a program written for VB6 does not expect.

<!-- Reproducer: bugs/redim-empty-range-unspecified-error/ (mode run: `Sub Main` prints 25 lines with Debug.Print; expect is exit 0 and all 25 as the default compiler gives them: the 20 errors of -2147467259, the `UBound` line after the failed Preserve and the four statements that raise nothing; verify reproduces on BETA 1005, 997, 995 and 957; an LLVM run gives other lines, so `verify` does not use it). The LLVM results, the 64-bit run and the built exe were run once with `bug_repro.mjs run --llvm`, `run --arch win64` and a scratch copy that wrote with TbRun.Out under `tbrun --exe`, not kept. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints the VB6 column. Found documenting contributed packages on BETA 1005. docs/Reference/Core/ReDim.md carries a NOTE naming BETA 1005 and saying that VB6 raises error 9. When fixed: change that NOTE to state the error a fixed build raises (or remove the BETA sentence if it is 9), and retire the reproducer. -->
