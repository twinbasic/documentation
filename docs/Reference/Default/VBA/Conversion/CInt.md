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

### Example

This example uses the **CInt** function to convert a value to an **Integer**.

```tb
Dim MyDouble, MyInt
MyDouble = 2345.5678                 ' MyDouble is a Double.
MyInt = CInt(MyDouble)               ' MyInt contains 2346.
```

### See Also

- [CBool](CBool), [CByte](CByte), [CLng](CLng), [CLngLng](CLngLng), [CSng](CSng), [CStr](CStr), [CVar](CVar) functions
- [Fix](Fix), [Int](Int) functions
