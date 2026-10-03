Filed as [twinbasic/twinbasic#2437](https://github.com/twinbasic/twinbasic/issues/2437).

## A `Variant` shift multiplies a fractional value, and can return `Empty`

**Describe the bug**
A `Variant` holding a `Double`, `Currency` or `Decimal` of 7.9, shifted left by 1, gives 15.8: the value is multiplied by 2, not shifted. Shifted right by 1, the `Double` and the `Decimal` give 3, but the `Currency` gives 3.95. A `Variant` holding an `Integer` or a `Long` shifted left by a count as large as the type's width gives `Empty` rather than 0. There is no diagnostic.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `variant-shift.twinproj` (attached as `variant-shift.zip`) and run it (F5). Its `Sub Main` holds the whole bug:
   ```
   Dim d As Variant = CDbl(7.9)
   Dim c As Variant = CCur(7.9)
   Debug.Print d << 1            ' 15.8
   Debug.Print c >> 1            ' 3.95
   
   Dim i As Variant = CInt(1)
   Dim l As Variant = CLng(1)
   Debug.Print TypeName(i << 20) ' Empty
   Debug.Print TypeName(l << 32) ' Empty
   ```
2. See the DEBUG CONSOLE show 15.8, 3.95, `Empty` and `Empty`. The project prints the same for a `Decimal` too.

| expression | result |
|---|---|
| a `Variant` holding `CInt(1)`, `<< 20` | `Empty` |
| a `Variant` holding `CLng(1)`, `<< 32` | `Empty` |
| a `Variant` holding `CLng(1)`, `<< 31` | `Long` -2147483648 |
| a `Long` variable holding 1, `<< 32` | 0 |

**Expected behavior**
A shift moves bits, so a fractional value should be truncated first, as the right shift of the `Double` and the `Decimal` already does: `7.9 << 1` is 14 and `7.9 >> 1` is 3. A count as large as the width of the type should give 0 and keep the type, as the `Long` variable's shift does, not `Empty`.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: wrong values, with no diagnostic. Also on BETA 983, with the same results, except that the right shift of a `Variant` holding 7.9 gave 4 there for all three types (BETA 984 made `>>` arithmetic). A `Long` variable's shift by 32 gives 0 on both builds.

<!-- Stated by the Variant note in docs/Reference/Core/LeftShift.md; when fixed, remove the note, and check RightShift.md for the Currency result. Measured with scripts/bug_repro.mjs (run mode, verify) on 995 and 983. Found by probing the operators for those two pages; the same probe found `>>` logical on a typed variable and arithmetic on a constant, up to BETA 983. -->
