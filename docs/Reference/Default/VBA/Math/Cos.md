---
title: Cos
parent: Math Module
permalink: /tB/Modules/Math/Cos
vba_attribution: true
---
# Cos
{: .no_toc }

Returns a **Double** specifying the cosine of an angle.

Syntax: **Cos(** *number* **)**

*number*
: *required* A **Double** or any valid numeric expression that expresses an angle in radians.

The **Cos** function takes an angle and returns the ratio of two sides of a right triangle. The ratio is the length of the side adjacent to the angle divided by the length of the hypotenuse. The result lies in the range -1 to 1.

To convert degrees to radians, multiply degrees by pi/180. To convert radians to degrees, multiply radians by 180/pi.

> [!WARNING] BETA 1010
> **Cos** of a number of 9,223,372,036,854,775,808 (2^63) or more in magnitude returns the number itself, with no error: `Cos(1E+20)` is `1E+20`, outside the range -1 to 1. Check the magnitude of *number* before the call.

<!-- errors: generated from errors/VBA.Math.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *number* is **Null** |

> [!NOTE] BETA 1010
> When the magnitude of *number* is 9,223,372,000,000,000,000 or more, VB6 raises error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*; twinBASIC raises none.

<!-- /errors -->

### Example

This example uses the **Cos** function to return the cosine of an angle.

```tb check_build
Dim MyAngle, MySecant
MyAngle = 1.3    ' Define angle in radians.
MySecant = 1 / Cos(MyAngle)    ' Calculate secant.
```

### See Also

- [Atn](Atn), [Sin](Sin), [Tan](Tan) functions
