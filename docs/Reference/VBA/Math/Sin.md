---
title: Sin
parent: Math Module
permalink: /tB/Modules/Math/Sin
vba_attribution: true
---
# Sin
{: .no_toc }

Returns a **Double** specifying the sine of an angle.

Syntax: **Sin(** *number* **)**

*number*
: *required* A **Double** or any valid numeric expression that expresses an angle in radians.

The **Sin** function takes an angle and returns the ratio of two sides of a right triangle. The ratio is the length of the side opposite the angle divided by the length of the hypotenuse. The result lies in the range -1 to 1.

To convert degrees to radians, multiply degrees by pi/180. To convert radians to degrees, multiply radians by 180/pi.

### Example

This example uses the **Sin** function to return the sine of an angle.

```tb
Dim MyAngle, MyCosecant
MyAngle = 1.3    ' Define angle in radians.
MyCosecant = 1 / Sin(MyAngle)    ' Calculate cosecant.
```

### See Also

- [Atn](Atn), [Cos](Cos), [Tan](Tan) functions
