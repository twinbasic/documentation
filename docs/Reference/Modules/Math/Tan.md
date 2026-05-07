---
title: Tan
parent: Math Module
permalink: /tB/Modules/Math/Tan
---
# Tan
{: .no_toc }

Returns a **Double** specifying the tangent of an angle.

Syntax: **Tan(** *number* **)**

*number*
: *required* A **Double** or any valid numeric expression that expresses an angle in radians.

**Tan** takes an angle and returns the ratio of two sides of a right triangle. The ratio is the length of the side opposite the angle divided by the length of the side adjacent to the angle.

To convert degrees to radians, multiply degrees by pi/180. To convert radians to degrees, multiply radians by 180/pi.

### Example

This example uses the **Tan** function to return the tangent of an angle.

```tb
Dim MyAngle, MyCotangent
MyAngle = 1.3    ' Define angle in radians.
MyCotangent = 1 / Tan(MyAngle)    ' Calculate cotangent.
```

### See Also

- [Atn](Atn), [Cos](Cos), [Sin](Sin) functions

{% include VBA-Attribution.md %}
