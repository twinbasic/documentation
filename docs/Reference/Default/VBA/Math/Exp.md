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

The constant *e* is approximately 2.718282.

> [!NOTE]
> The **Exp** function complements the action of the [**Log**](Log) function and is sometimes referred to as the antilogarithm.

<!-- errors: generated from errors/VBA.Math.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [6 (`&H6`)](tb:Errors#6), *Overflow* | *number* is greater than 709.782712893384 |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *number* is **Null** |

<!-- /errors -->

### Example

This example uses the **Exp** function to return *e* raised to a power.

```tb check_build
Dim MyAngle, MyHSin
' Define angle in radians.
MyAngle = 1.3
' Calculate hyperbolic sine.
MyHSin = (Exp(MyAngle) - Exp(-1 * MyAngle)) / 2
```

### See Also

- [Log](Log) function
