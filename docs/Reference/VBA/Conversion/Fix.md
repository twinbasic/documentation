---
title: Fix
parent: Conversion Module
permalink: /tB/Modules/Conversion/Fix
redirect_from:
-  /tB/Core/Fix
vba_attribution: true
---
# Fix
{: .no_toc }

Returns the integer portion of a number, truncating toward zero.

Syntax: **Fix(** *number* **)**

*number*
: *required* A **Double** or any valid numeric expression. If *number* contains **Null**, **Null** is returned.

**Fix** removes the fractional part of *number* and returns the resulting integer value. If *number* is negative, **Fix** returns the first negative integer greater than or equal to *number*; that is, it truncates toward zero. For example, **Fix** converts `-8.4` to `-8`.

**Fix(** *number* **)** is equivalent to **Sgn(** *number* **) \* Int(Abs(** *number* **))**.

The return value has the same type as *number*.

> [!NOTE]
> The closely related [**Int**](Int) function rounds toward negative infinity rather than truncating toward zero. For positive numbers the two are identical; for negative numbers they differ.

### Example

This example illustrates how the **Fix** function returns the integer portion of a number. For a negative number argument, the **Fix** function returns the first negative integer greater than or equal to the number.

```tb
Dim MyNumber
MyNumber = Fix(99.2)     ' Returns 99.
MyNumber = Fix(-99.8)    ' Returns -99.
MyNumber = Fix(-99.2)    ' Returns -99.
```

### See Also

- [Int](Int), [CInt](CInt), [CLng](CLng) functions
