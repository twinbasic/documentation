---
title: Tan
parent: Math Module
permalink: /tB/Modules/Math/Tan
vba_attribution: true
---
# Tan
{: .no_toc }

Returns a **Double** specifying the tangent of an angle.

Syntax: **Tan(** *number* **)**

*number*
: *required* A **Double** or any valid numeric expression that expresses an angle in radians.

**Tan** takes an angle and returns the ratio of two sides of a right triangle. The ratio is the length of the side opposite the angle divided by the length of the side adjacent to the angle.

To convert degrees to radians, multiply degrees by pi/180. To convert radians to degrees, multiply radians by 180/pi.

<!-- errors: generated from errors/VBA.Math.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *number* is **Null** |
| [-2147348207 (`&H80021111`)](tb:Errors#-2147348207), *Automation error* | the magnitude of *number* is 9,223,372,036,854,775,808 (2^63) or more |

> [!NOTE] BETA 1010
> When the magnitude of *number* is 9,223,372,036,854,775,808 (2^63) or more, VB6 raises error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

> [!NOTE] BETA 1010
> When the magnitude of *number* is 9,223,372,000,000,000,000 or more but less than 2^63, VB6 raises error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*; twinBASIC raises none.

<!-- /errors -->

### Example

This example uses the **Tan** function to return the tangent of an angle.

```tb check_build
Dim MyAngle, MyCotangent
MyAngle = 1.3    ' Define angle in radians.
MyCotangent = 1 / Tan(MyAngle)    ' Calculate cotangent.
```

### See Also

- [Atn](Atn), [Cos](Cos), [Sin](Sin) functions
