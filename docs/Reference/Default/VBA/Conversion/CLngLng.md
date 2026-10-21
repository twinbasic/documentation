---
title: CLngLng
parent: Conversion Module
permalink: /tB/Modules/Conversion/CLngLng
redirect_from:
-  /tB/Core/CLngLng
vba_attribution: true
---
# CLngLng
{: .no_toc }

Coerces an expression to a **LongLong**.

Syntax: **CLngLng(** *expression* **)**

*expression*
: *required* Any valid string or numeric expression in the range `-9,223,372,036,854,775,808` to `9,223,372,036,854,775,807`. Fractions are rounded.

The return type is **LongLong**.

When the fractional part is exactly `0.5`, **CLngLng** always rounds it to the nearest even number. For example, `0.5` rounds to `0`, and `1.5` rounds to `2`. **CLngLng** differs from the [**Fix**](Fix) and [**Int**](Int) functions, which truncate, rather than round, the fractional part of a number.

> [!NOTE]
> Conversion functions must be used to explicitly assign **LongLong** to smaller integral types. Implicit conversions of **LongLong** to smaller integrals are not allowed.

> [!NOTE]
> In VBA, **LongLong** (and therefore **CLngLng**) is restricted to 64-bit hosts. twinBASIC supports **LongLong** in both 32-bit and 64-bit modes --- see [Data Types](../../../Features/Language/Data-Types).

> [!WARNING] BETA 1010
> The constant 2^63, one past the largest **LongLong**, converts to -9223372036854775808 with no error: `CLngLng(2 ^ 63)` and `CLngLng(9223372036854775808#)` do, and so does `CLngLng(9223372036854775807)`, because a whole-number literal without the `^` suffix is a **Double** that rounds to 2^63. A **Double** variable holding 2^63 raises error 6, as the table below says. Write the largest value as `9223372036854775807^`.

<!-- errors: generated from errors/VBA.Conversion.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [6 (`&H6`)](tb:Errors#6), *Overflow* | *expression* rounds to a number less than -9,223,372,036,854,775,808 or greater than 9,223,372,036,854,775,807 |
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | *expression* is a string that does not hold a number (a zero-length string included) |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *expression* is **Null** |

<!-- /errors -->

### Example

This example uses the **CLngLng** function to convert an expression to a **LongLong**.

```tb check_build
Dim someValue As Variant
someValue = 9223372036854775807^
Dim longLongValue As LongLong
longLongValue = CLngLng(someValue)
MsgBox "The LongLong representation is: " & longLongValue
```

### See Also

- [CBool](CBool), [CByte](CByte), [CInt](CInt), [CLng](CLng), [CLngPtr](CLngPtr), [CSng](CSng), [CStr](CStr), [CVar](CVar) functions
