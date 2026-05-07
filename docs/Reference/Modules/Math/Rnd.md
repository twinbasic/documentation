---
title: Rnd
parent: Math Module
permalink: /tB/Modules/Math/Rnd
---
# Rnd
{: .no_toc }

Returns a **Single** containing a pseudo-random number.

Syntax: **Rnd** [ **(** *number* **)** ]

*number*
: *optional* A **Single** or any valid numeric expression.

The **Rnd** function returns a value less than 1 but greater than or equal to zero.

The value of *number* determines how **Rnd** generates a pseudo-random number:

| If *number* is    | **Rnd** generates                                                |
|-------------------|------------------------------------------------------------------|
| Less than zero    | The same number every time, using *number* as the seed.          |
| Greater than zero | The next number in the pseudo-random sequence.                   |
| Equal to zero     | The most recently generated number.                              |
| Not supplied      | The next number in the pseudo-random sequence.                   |

For any given initial seed, the same number sequence is generated because each successive call to the **Rnd** function uses the previous number as a seed for the next number in the sequence.

Before calling **Rnd**, use the [**Randomize**](Randomize) statement without an argument to initialize the random-number generator with a seed based on the system timer.

To produce random integers in a given range, use this formula:

```tb
Int((upperbound - lowerbound + 1) * Rnd + lowerbound)
```

Here, *upperbound* is the highest number in the range, and *lowerbound* is the lowest number in the range.

> [!NOTE]
> To repeat sequences of random numbers, call **Rnd** with a negative argument immediately before using **Randomize** with a numeric argument. Using **Randomize** with the same value for *number* does not repeat the previous sequence.

### Example

This example uses the **Rnd** function to generate a random integer value from 1 to 6.

```tb
Dim MyValue As Integer
MyValue = Int((6 * Rnd) + 1)    ' Generate random value between 1 and 6.
```

### See Also

- [Randomize](Randomize) statement

{% include VBA-Attribution.md %}
