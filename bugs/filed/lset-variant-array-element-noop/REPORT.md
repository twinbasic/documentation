Filed as [twinbasic/twinbasic#2467](https://github.com/twinbasic/twinbasic/issues/2467).

## `LSet` and `RSet` on an element of a `Variant` that holds an array change nothing

**Describe the bug**
`LSet v(0) = "zz"` and `RSet v(1) = "zz"` do nothing when `v` is a `Variant` that holds an array, whether the array came from `Array(...)` or from `ReDim v(0 To 1)` on the `Variant`. The statements raise no error, and the element keeps its value. The same statements on an element of an array declared `Dim w(0 To 1) As Variant` work. Observed in a run of the reproducer project.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `lset-variant-array-element-noop.twinproj` (attached as `lset-variant-array-element-noop.zip`). Its one source file, `Startup.twin`, has a `Sub Main` that assigns `v = Array("0123456789", "abcde")`, runs `LSet v(0) = "zz"` and `RSet v(1) = "zz"`, and does the same to the elements of `Dim w(0 To 1) As Variant`.
2. Run it (F5) and read the DEBUG CONSOLE:
   ```
   LSet v(0), v = Array(...):   [0123456789]
   RSet v(1), v = Array(...):   [abcde]
   LSet w(0), w(0 To 1) As Variant: [zz        ]
   RSet w(1), w(0 To 1) As Variant: [   zz]
   ```

**Expected behavior**
The elements of `v` change as those of `w` do: `[zz        ]` and `[   zz]`. VB6 does so (attached as `lset-variant-array-element-noop-vb6.zip`).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low to medium. A statement that has no effect and no error is easy to miss.

Tried: `ReDim v2(0 To 1)` on a `Variant`, then `LSet v2(0) = "zz"`, does the same. The `w` elements and `Dim a(0 To 2) As String` elements work. On BETA 983 the `v` lines read the same, and the `w` line for `LSet` reads `[zz23456789]`, because `LSet` did not yet fill with spaces there (fixed in BETA 984, which is a separate matter).

<!-- Reproducer: bugs/lset-variant-array-element-noop/ (mode run, expects the four lines above); verified on 995, 983 gives the same `v` lines. docs/Reference/Core/LSet.md and RSet.md each carry a WARNING naming BETA 995 for this, after the paragraph that says the destination can be a Variant that holds a string; when fixed, remove each. -->
