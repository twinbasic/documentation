---
title: CLng
parent: Conversion Module
permalink: /tB/Modules/Conversion/CLng
redirect_from:
-  /tB/Core/CLng
vba_attribution: true
---
# CLng
{: .no_toc }

Coerces an expression to a **Long**.

Syntax: **CLng(** *expression* **)**

*expression*
: *required* Any valid string or numeric expression in the range `-2,147,483,648` to `2,147,483,647`. Fractions are rounded.

The return type is **Long**. If *expression* is outside the range of a **Long**, a run-time error occurs.

When the fractional part is exactly `0.5`, **CLng** always rounds it to the nearest even number. For example, `0.5` rounds to `0`, and `1.5` rounds to `2`. **CLng** differs from the [**Fix**](Fix) and [**Int**](Int) functions, which truncate, rather than round, the fractional part of a number.

> [!WARNING]
> In BETA 997, in a run from the IDE, a conversion of a constant outside the range of a **Long**, such as `CLng(1E+20)`, makes the run's first conversion of a **Single** or **Double** value to an integer raise error 6, *Overflow*, even for a value in range, and leaves its target at 0. The constant conversion has this effect wherever it appears in code the run compiles, even in a statement that never runs, such as `If False Then t = CLng(1E+20)`. Only the first such conversion of the run fails, and under **On Error Resume Next** its 0 goes unnoticed. A built executable, and code compiled with LLVM, are not affected. VB6 converts the value correctly.

### Example

This example uses the **CLng** function to convert values to a **Long**.

```tb check_build
Dim MyVal1, MyVal2, MyLong1, MyLong2
MyVal1 = 25427.45: MyVal2 = 25427.55     ' MyVal1, MyVal2 are Doubles.
MyLong1 = CLng(MyVal1)                   ' MyLong1 contains 25427.
MyLong2 = CLng(MyVal2)                   ' MyLong2 contains 25428.
```

### See Also

- [CBool](CBool), [CByte](CByte), [CInt](CInt), [CLngLng](CLngLng), [CLngPtr](CLngPtr), [CSng](CSng), [CStr](CStr), [CVar](CVar) functions
- [Fix](Fix), [Int](Int) functions
