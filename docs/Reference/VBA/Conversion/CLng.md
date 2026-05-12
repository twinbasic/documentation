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

### Example

This example uses the **CLng** function to convert values to a **Long**.

```tb
Dim MyVal1, MyVal2, MyLong1, MyLong2
MyVal1 = 25427.45: MyVal2 = 25427.55     ' MyVal1, MyVal2 are Doubles.
MyLong1 = CLng(MyVal1)                   ' MyLong1 contains 25427.
MyLong2 = CLng(MyVal2)                   ' MyLong2 contains 25428.
```

### See Also

- [CBool](CBool), [CByte](CByte), [CInt](CInt), [CLngLng](CLngLng), [CLngPtr](CLngPtr), [CSng](CSng), [CStr](CStr), [CVar](CVar) functions
- [Fix](Fix), [Int](Int) functions
