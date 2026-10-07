Filed as [twinbasic/twinbasic#2482](https://github.com/twinbasic/twinbasic/issues/2482).

## `LSet` and `RSet` on a `Variant` destination raise 13 for `Null` and for an object, and pad a `Boolean` as `-1`

**Describe the bug**
When the destination of `LSet` or `RSet` is a `Variant`, three subtypes behave differently from VB6. A `Variant` holding `Null` raises error 13 (*Type mismatch*), where VB6 raises 94 (*Invalid use of Null*). A `Variant` holding an object, such as a `Collection`, raises error 13, where VB6 raises no error. A `Variant` holding `True` is aligned as the two characters `-1`: `RSet v = "ab"` leaves `[ab]` with `Len` 2, where VB6 aligns within `"True"` and leaves `[  ab]` with `Len` 4. Observed in a run of the reproducer project.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `lset-variant-destination-types.twinproj` (attached as `lset-variant-destination-types.zip`). Its one source file, `Startup.twin`, has a `Sub Main` under `On Error Resume Next` that runs `LSet v = "abc"` on a `Variant` holding `Null`, `LSet v = "abc"` on one holding `New Collection`, and `RSet v = "ab"` on one holding `True`.
2. Run it (F5) and read the DEBUG CONSOLE:
   ```
   LSet, destination Null:    error 13
   LSet, destination Object:  error 13
   RSet, destination True:    [ab] Len 2
   ```

**Expected behavior**
`error 94` for `Null`, no error for the object, and `[  ab] Len 4` for `True`, as in VB6 (attached as `lset-variant-destination-types-vb6.zip`, which prints `error 94`, `error 0` and `[  ab] Len 4`).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low. Programs rarely align into a `Variant` that holds `Null` or an object, and the error number matters only to a handler that tests for 94.

A `Variant` holding an `Integer`, a `Long`, a `Double` or a `Date` is aligned within its text as in VB6, and one holding an error value or an array raises 13 in both. A `Null` source into a `String` destination raises 94 in both. The same results on BETA 983.

<!-- Reproducer: bugs/lset-variant-destination-types/ (mode run, expects the three lines above); verified on 995 and 983. No page states these cases: docs/Reference/Core/LSet.md and RSet.md say that a Null source raises error 94 and that the destination can be a Variant that holds a string. -->
