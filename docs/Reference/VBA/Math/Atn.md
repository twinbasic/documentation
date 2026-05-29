---
title: Atn
parent: Math Module
permalink: /tB/Modules/Math/Atn
vba_attribution: true
---
# Atn
{: .no_toc }

Returns a **Double** specifying the arctangent of a number.

Syntax: **Atn(** *number* **)**

*number*
: *required* A **Double** or any valid numeric expression.

The **Atn** function takes the ratio of two sides of a right triangle (*number*) and returns the corresponding angle in radians. The ratio is the length of the side opposite the angle divided by the length of the side adjacent to the angle.

The range of the result is -pi/2 to pi/2 radians. To convert degrees to radians, multiply degrees by pi/180. To convert radians to degrees, multiply radians by 180/pi.

> [!NOTE]
> **Atn** is the inverse trigonometric function of [**Tan**](Tan), which takes an angle as its argument and returns the ratio of two sides of a right triangle. Do not confuse **Atn** with the cotangent, which is the simple inverse of a tangent (1/tangent).

### Example

This example uses **Atn** to derive an approximation of pi.

```tb
Const Pi As Double = Atn(1) * 4    ' pi ≈ 3.14159265358979
Debug.Print Pi
Debug.Print Pi / 180               ' one degree in radians ≈ 0.0174532925199433
```

### See Also

- [Cos](Cos), [Sin](Sin), [Tan](Tan) functions
