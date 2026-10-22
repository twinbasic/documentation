---
title: Sqr
parent: Math Module
permalink: /tB/Modules/Math/Sqr
vba_attribution: true
---
# Sqr
{: .no_toc }

Returns a **Double** specifying the square root of a number.

Syntax: **Sqr(** *number* **)**

*number*
: *required* A **Double** or any valid numeric expression greater than or equal to zero.

<!-- errors: generated from errors/VBA.Math.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument* | *number* is negative |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *number* is **Null** |

<!-- /errors -->

### Example

This example uses the **Sqr** function to calculate the square root of a number.

```tb check_build
Dim MySqr
MySqr = Sqr(4)     ' Returns 2.
MySqr = Sqr(23)    ' Returns 4.79583152331272.
MySqr = Sqr(0)     ' Returns 0.
MySqr = Sqr(-4)    ' Generates a run-time error.
```

### See Also

- [Exp](Exp) function
- [Log](Log) function
