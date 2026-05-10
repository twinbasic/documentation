---
title: Int
parent: Conversion Module
permalink: /tB/Modules/Conversion/Int
redirect_from:
-  /tB/Core/Int
---
# Int
{: .no_toc }

Returns the integer portion of a number, rounding toward negative infinity.

Syntax: **Int(** *number* **)**

*number*
: *required* A **Double** or any valid numeric expression. If *number* contains **Null**, **Null** is returned.

**Int** removes the fractional part of *number* and returns the resulting integer value. If *number* is negative, **Int** returns the first negative integer less than or equal to *number*. For example, **Int** converts `-8.4` to `-9`.

The return value has the same type as *number*.

> [!NOTE]
> The closely related [**Fix**](Fix) function truncates toward zero rather than rounding toward negative infinity. For positive numbers the two are identical; for negative numbers they differ.

### Example

This example illustrates how the **Int** function returns the integer portion of a number. For a negative number argument, the **Int** function returns the first negative integer less than or equal to the number.

```tb
Dim MyNumber
MyNumber = Int(99.8)     ' Returns 99.
MyNumber = Int(-99.8)    ' Returns -100.
MyNumber = Int(-99.2)    ' Returns -100.
```

### See Also

- [Fix](Fix), [CInt](CInt), [CLng](CLng) functions

{% include VBA-Attribution.md %}
