---
title: CDbl
parent: Conversion Module
permalink: /tB/Modules/Conversion/CDbl
redirect_from:
-  /tB/Core/CDbl
vba_attribution: true
---
# CDbl
{: .no_toc }

Coerces an expression to a **Double**.

Syntax: **CDbl(** *expression* **)**

*expression*
: *required* Any valid string or numeric expression in the **Double** range — `-1.79769313486231E308` to `-4.94065645841247E-324` for negative values, and `4.94065645841247E-324` to `1.79769313486232E308` for positive values.

The return type is **Double**. If *expression* is outside the range of a **Double**, a run-time error occurs.

Use **CDbl** instead of [**Val**](Val) to provide internationally aware conversions from a string to a numeric type. **CDbl** recognizes different decimal separators and different thousand separators properly, depending on the system's locale setting.

### Example

This example uses the **CDbl** function to convert an expression to a **Double**.

```tb
Dim MyCurr, MyDouble
MyCurr = CCur(234.456784)                    ' MyCurr is a Currency.
MyDouble = CDbl(MyCurr * 8.2 * 0.01)         ' Convert result to a Double.
```

### See Also

- [CCur](CCur), [CDec](CDec), [CInt](CInt), [CLng](CLng), [CSng](CSng), [CStr](CStr), [CVar](CVar) functions
