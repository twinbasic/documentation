Filed as [twinbasic/twinbasic#2438](https://github.com/twinbasic/twinbasic/issues/2438).

## Overloads on `Date` and `Double` resolve by declaration order, not by the argument's type

**Describe the bug**
When a procedure is overloaded on `Date` and on `Double`, whichever of the two is declared first receives every call, whatever the type of the argument. No diagnostic is shown.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `date-double-overload.twinproj` (attached as `date-double-overload.zip`). Its source file `Probe.twin` declares the two overloads, `Date` first, and `Sub Main` calls `Probe.Show`:
   ```
   Private Function F(ByVal x As Date) As String
       F = "Date"
   End Function
   Private Function F(ByVal x As Double) As String
       F = "Double"
   End Function
   
   Dim x As Double = 1.5
   Debug.Print F(x)        ' Date
   ```
2. Press F5 and read the DEBUG CONSOLE: `Show` calls `F` with a `Double` variable, a `Date` variable, a `Date` literal and `CDate(1)`, and all four print `Date`.
3. Swap the two declarations and run again: all four print `Double`.

Whichever of the two is declared first receives every call. With `Date` first, a `Double` argument reaches the `Date` overload; with `Double` first, a `Date` variable, `#1/2/2026#` and `CDate(1)` all reach the `Double` overload.

What does not reproduce it: a `Date` overload beside a `String` one resolves correctly, and an overload set on `Byte`, `Integer`, `Long`, `LongLong`, `Single`, `Double`, `Currency`, `Decimal`, `Boolean`, `String` and `Variant` sends arguments of each of those types to their own overload. The compiler does tell the two types apart elsewhere: `TypeName` of a `Date` expression is `Date`, and a `Long` overload beside a `LongPtr` one is refused as a duplicate definition in a 32-bit build, as it should be.

**Expected behavior**
Each call reaches the overload for its argument's type: `Double` for the `Double` variable and `Date` for the three `Date` arguments, whichever overload is declared first. `Date` and `Double` are stored alike but are different types, and the other types in the overload set above are told apart.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 983, with the same result (the reproducer, `Date` first, prints `Date` four times). Severity: the wrong overload runs, with no diagnostic.

<!-- Reproducer: bugs/date-double-overload/ (mode run, expects the `Double variable: Date` line); verified on 995 and 983, and the swapped order measured on 995 on 2026-10-02 with a scratch copy (four lines of `Double`, `TypeName` printing Date). Found by the overload set used to detect the static type of arithmetic results while measuring the operators for Reference/Operators.md. -->
