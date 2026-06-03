---
title: Randomize
parent: Math Module
permalink: /tB/Modules/Math/Randomize
vba_attribution: true
---
# Randomize
{: .no_toc }

Initializes the random-number generator.

Syntax: **Randomize** [ *number* ]

*number*
: *optional* A **Variant** or any valid numeric expression.

**Randomize** uses *number* to initialize the [**Rnd**](Rnd) function's random-number generator, giving it a new seed value. If *number* is omitted, the value returned by the system timer is used as the new seed value.

If **Randomize** is not used, the **Rnd** function (with no arguments) uses the same number as a seed the first time it is called, and thereafter uses the last generated number as a seed value.

> [!NOTE]
> To repeat sequences of random numbers, call **Rnd** with a negative argument immediately before using **Randomize** with a numeric argument. Using **Randomize** with the same value for *number* does not repeat the previous sequence.

### Example

This example uses the **Randomize** statement to initialize the random-number generator. Because the *number* argument has been omitted, **Randomize** uses the return value from the [**Timer**](../DateTime/Timer) function as the new seed value.

```tb
Dim MyValue
Randomize    ' Initialize random-number generator.

MyValue = Int((6 * Rnd) + 1)    ' Generate random value between 1 and 6.
```

### See Also

- [Rnd](Rnd) function
