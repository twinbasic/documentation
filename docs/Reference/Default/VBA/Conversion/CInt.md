---
title: CInt
parent: Conversion Module
permalink: /tB/Modules/Conversion/CInt
redirect_from:
-  /tB/Core/CInt
vba_attribution: true
---
# CInt
{: .no_toc }

Coerces an expression to an **Integer**.

Syntax: **CInt(** *expression* **)**

*expression*
: *required* Any valid string or numeric expression in the range `-32,768` to `32,767`. Fractions are rounded.

The return type is **Integer**. If *expression* is outside the range of an **Integer**, a run-time error occurs.

When the fractional part is exactly `0.5`, **CInt** always rounds it to the nearest even number. For example, `0.5` rounds to `0`, and `1.5` rounds to `2`. **CInt** differs from the [**Fix**](Fix) and [**Int**](Int) functions, which truncate, rather than round, the fractional part of a number. Also, **Fix** and **Int** always return a value of the same type as is passed in.

**CInt** is the internationally aware alternative to [**Val**](Val) for converting a string to a numeric type.

> [!WARNING]
> In BETA 997, in a run from the IDE, a conversion of a constant outside the range of a **Long**, such as `CInt(1E+10)`, makes the run's first conversion of a **Single** or **Double** value to an integer raise error 6, *Overflow*, even for a value in range, and leaves its target at 0. The constant conversion has this effect wherever it appears in code the run compiles, even in a statement that never runs, such as `If False Then i = CInt(1E+10)`. Only the first such conversion of the run fails, and under **On Error Resume Next** its 0 goes unnoticed. A built executable, and code compiled with LLVM, are not affected. VB6 converts the value correctly.

### Example

This example uses the **CInt** function to convert a value to an **Integer**.

```tb check_build
Dim MyDouble, MyInt
MyDouble = 2345.5678                 ' MyDouble is a Double.
MyInt = CInt(MyDouble)               ' MyInt contains 2346.
```

### See Also

- [CBool](CBool), [CByte](CByte), [CLng](CLng), [CLngLng](CLngLng), [CSng](CSng), [CStr](CStr), [CVar](CVar) functions
- [Fix](Fix), [Int](Int) functions
