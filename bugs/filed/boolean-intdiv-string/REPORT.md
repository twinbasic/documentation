Filed as [twinbasic/twinbasic#2439](https://github.com/twinbasic/twinbasic/issues/2439).

## `Boolean \ String` and `Boolean Mod String` convert the `String` to `Boolean`

**Describe the bug**
With a `Boolean` on the left and a `String` on the right, `\` and `Mod` convert the `String` to `Boolean` instead of to a number, so the result has the wrong value and the wrong type. There is no diagnostic.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `boolean-intdiv-string.twinproj` (attached as `boolean-intdiv-string.zip`) and run it (F5). Its `Sub Main` holds the whole bug:
   ```
   Dim b As Boolean = True
   Debug.Print TypeName(b \ "2")
   ```
2. See `Boolean`, where `Long` is expected. The project prints these:

   | expression | result | expected |
   |---|---|---|
   | `b \ "2"` | `Boolean` True | `Long` 0, as `b \ 2.0` gives |
   | `b Mod "2"` | `Boolean` False | `Long` -1, as `b Mod 2.0` gives |

The results are consistent with converting `"2"` to `Boolean` (`True`, -1) first: -1 \ -1 is 1, stored as `True`, and -1 Mod -1 is 0, stored as `False`. A `String` literal and a `String` variable on the right both reproduce it.

**Expected behavior**
The `String` should be converted to a number, as every other operator does: `b + "2"` is the `Double` 1 and `b / "2"` the `Double` -0.5. `b \ "2"` should be the `Long` 0, and `b Mod "2"` the `Long` -1, the same as with the number 2.0.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
What does not reproduce it: every other operator converts the `String` to a number, as `b + "2"` and `b / "2"` above show, and so do `\` and `Mod` with the operands the other way round: `"2" \ b` is the `Long` -2. Also on BETA 983, with the same results. Severity: a wrong value and a wrong type, with no diagnostic.

<!-- No docs page states this defect; docs/Reference/Operators.md describes the String conversion and the `\` and `Mod` result types, and was written against the correct behaviour. Measured with scripts/bug_repro.mjs (run mode, verify) on 995 and 983. Found by the result-type probe for that page. -->
