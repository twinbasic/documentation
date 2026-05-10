---
title: Sqr
parent: Math Module
permalink: /tB/Modules/Math/Sqr
---
# Sqr
{: .no_toc }

Returns a **Double** specifying the square root of a number.

Syntax: **Sqr(** *number* **)**

*number*
: *required* A **Double** or any valid numeric expression greater than or equal to zero.

### Example

This example uses the **Sqr** function to calculate the square root of a number.

```tb
Dim MySqr
MySqr = Sqr(4)     ' Returns 2.
MySqr = Sqr(23)    ' Returns 4.79583152331272.
MySqr = Sqr(0)     ' Returns 0.
MySqr = Sqr(-4)    ' Generates a run-time error.
```

{% include VBA-Attribution.md %}
