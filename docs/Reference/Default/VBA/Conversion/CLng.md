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

The return type is **Long**.

When the fractional part is exactly `0.5`, **CLng** always rounds it to the nearest even number. For example, `0.5` rounds to `0`, and `1.5` rounds to `2`. **CLng** differs from the [**Fix**](Fix) and [**Int**](Int) functions, which truncate, rather than round, the fractional part of a number.

<!-- errors: generated from errors/VBA.Conversion.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [6 (`&H6`)](tb:Errors#6), *Overflow* | *expression* rounds to a number less than -2,147,483,648 or greater than 2,147,483,647 |
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | *expression* is a string that does not hold a number (a zero-length string included) |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *expression* is **Null** |

<!-- /errors -->

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
