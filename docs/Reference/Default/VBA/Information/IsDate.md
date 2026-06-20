---
title: IsDate
parent: Information Module
permalink: /tB/Modules/Information/IsDate
redirect_from:
-  /tB/Core/IsDate
vba_attribution: true
---
# IsDate
{: .no_toc }

Returns **True** if the expression is a date or is recognizable as a valid date or time; otherwise, **False**.

Syntax: **IsDate(** *expression* **)**

*expression*
: *required* A **Variant** containing a date expression, or a string expression recognizable as a date or time.

The range of valid dates is January 1, 100 A.D. through December 31, 9999 A.D.

### Example

This example uses **IsDate** to determine whether an expression is recognized as a date or time value.

```tb
Dim MyVar As Variant
Dim MyCheck As Boolean
MyVar = "04/28/2014"                  ' Valid date.
MyCheck = IsDate(MyVar)               ' True.

MyVar = "April 28, 2014"              ' Valid date.
MyCheck = IsDate(MyVar)               ' True.

MyVar = "13/32/2014"                  ' Invalid date.
MyCheck = IsDate(MyVar)               ' False.

MyVar = "04.28.14"                    ' Valid time format on some locales.
MyCheck = IsDate(MyVar)               ' True.
```

### See Also

- [CDate](../Conversion/CDate) function
- [DateValue](../DateTime/DateValue) function
