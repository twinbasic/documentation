---
title: Log
parent: Math Module
permalink: /tB/Modules/Math/Log
vba_attribution: true
---
# Log
{: .no_toc }

Returns a **Double** specifying the natural logarithm of a number.

Syntax: **Log(** *number* **)**

*number*
: *required* A **Double** or any valid numeric expression greater than zero.

The natural logarithm is the logarithm to the base *e*. The constant *e* is approximately 2.718282.

You can calculate base-*n* logarithms for any number *x* by dividing the natural logarithm of *x* by the natural logarithm of *n* as follows:

Log<sub>*n*</sub>(*x*) = **Log(** *x* **)** / **Log(** *n* **)**

The following example illustrates a custom **Function** that calculates base-10 logarithms:

```tb
Static Function Log10(X)
    Log10 = Log(X) / Log(10#)
End Function
```

### Example

This example uses the **Log** function to return the natural logarithm of a number.

```tb
Dim MyAngle, MyLog
' Define angle in radians.
MyAngle = 1.3
' Calculate inverse hyperbolic sine.
MyLog = Log(MyAngle + Sqr(MyAngle * MyAngle + 1))
```

### See Also

- [Exp](Exp) function
