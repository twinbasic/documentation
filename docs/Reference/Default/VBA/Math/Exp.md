---
title: Exp
parent: Math Module
permalink: /tB/Modules/Math/Exp
vba_attribution: true
---
# Exp
{: .no_toc }

Returns a **Double** specifying *e* (the base of natural logarithms) raised to a power.

Syntax: **Exp(** *number* **)**

*number*
: *required* A **Double** or any valid numeric expression.

If the value of *number* exceeds 709.782712893, an error occurs. The constant *e* is approximately 2.718282.

> [!NOTE]
> The **Exp** function complements the action of the [**Log**](Log) function and is sometimes referred to as the antilogarithm.

### Example

This example uses the **Exp** function to return *e* raised to a power.

```tb
Dim MyAngle, MyHSin
' Define angle in radians.
MyAngle = 1.3
' Calculate hyperbolic sine.
MyHSin = (Exp(MyAngle) - Exp(-1 * MyAngle)) / 2
```

### See Also

- [Log](Log) function
