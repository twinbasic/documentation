---
title: CLngLng
parent: Conversion Module
permalink: /tB/Modules/Conversion/CLngLng
redirect_from:
-  /tB/Core/CLngLng
---
# CLngLng
{: .no_toc }

Coerces an expression to a **LongLong**.

Syntax: **CLngLng(** *expression* **)**

*expression*
: *required* Any valid string or numeric expression in the range `-9,223,372,036,854,775,808` to `9,223,372,036,854,775,807`. Fractions are rounded.

The return type is **LongLong**. If *expression* is outside the range of a **LongLong**, a run-time error occurs.

When the fractional part is exactly `0.5`, **CLngLng** always rounds it to the nearest even number. For example, `0.5` rounds to `0`, and `1.5` rounds to `2`. **CLngLng** differs from the [**Fix**](Fix) and [**Int**](Int) functions, which truncate, rather than round, the fractional part of a number.

> [!NOTE]
> Conversion functions must be used to explicitly assign **LongLong** to smaller integral types. Implicit conversions of **LongLong** to smaller integrals are not allowed.

> [!NOTE]
> In VBA, **LongLong** (and therefore **CLngLng**) is restricted to 64-bit hosts. twinBASIC supports **LongLong** in both 32-bit and 64-bit modes — see [Data Types](../../../Features/Language/Data-Types).

### Example

This example uses the **CLngLng** function to convert an expression to a **LongLong**.

```tb
Dim someValue As Variant
someValue = 9223372036854775807
Dim longLongValue As LongLong
longLongValue = CLngLng(someValue)
MsgBox "The LongLong representation is: " & longLongValue
```

### See Also

- [CBool](CBool), [CByte](CByte), [CInt](CInt), [CLng](CLng), [CLngPtr](CLngPtr), [CSng](CSng), [CStr](CStr), [CVar](CVar) functions

{% include VBA-Attribution.md %}
