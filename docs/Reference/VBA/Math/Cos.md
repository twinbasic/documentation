---
title: Cos
parent: Math Module
permalink: /tB/Modules/Math/Cos
---
# Cos
{: .no_toc }

Returns a **Double** specifying the cosine of an angle.

Syntax: **Cos(** *number* **)**

*number*
: *required* A **Double** or any valid numeric expression that expresses an angle in radians.

The **Cos** function takes an angle and returns the ratio of two sides of a right triangle. The ratio is the length of the side adjacent to the angle divided by the length of the hypotenuse. The result lies in the range -1 to 1.

To convert degrees to radians, multiply degrees by pi/180. To convert radians to degrees, multiply radians by 180/pi.

### Example

This example uses the **Cos** function to return the cosine of an angle.

```tb
Dim MyAngle, MySecant
MyAngle = 1.3    ' Define angle in radians.
MySecant = 1 / Cos(MyAngle)    ' Calculate secant.
```

### See Also

- [Atn](Atn), [Sin](Sin), [Tan](Tan) functions

{% include VBA-Attribution.md %}
