---
title: CLngPtr
parent: Conversion Module
permalink: /tB/Modules/Conversion/CLngPtr
redirect_from:
-  /tB/Core/CLngPtr
vba_attribution: true
---
# CLngPtr
{: .no_toc }

Coerces an expression to a **LongPtr**.

Syntax: **CLngPtr(** *expression* **)**

*expression*
: *required* Any valid string or numeric expression. The acceptable range is `-2,147,483,648` to `2,147,483,647` on 32-bit systems, and `-9,223,372,036,854,775,808` to `9,223,372,036,854,775,807` on 64-bit systems. Fractions are rounded.

The return type is **LongPtr**, which is a **Long** on 32-bit systems and a **LongLong** on 64-bit systems. If *expression* is outside the valid range, a run-time error occurs.

When the fractional part is exactly `0.5`, **CLngPtr** always rounds it to the nearest even number. **CLngPtr** differs from the [**Fix**](Fix) and [**Int**](Int) functions, which truncate, rather than round, the fractional part of a number.

**LongPtr** is intended primarily for holding pointer values returned from API calls. See [Data Types](../../../Features/Language/Data-Types) for details.

### Example

This example uses the **CLngPtr** function to convert an expression to a **LongPtr**.

```tb
Dim num As Variant
num = 1234567890
MsgBox "LongPtr value of " & num & " is " & CLngPtr(num)
```

### See Also

- [CBool](CBool), [CByte](CByte), [CInt](CInt), [CLng](CLng), [CLngLng](CLngLng), [CSng](CSng), [CStr](CStr), [CVar](CVar) functions
