---
title: ToolsMath
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/ToolsMath
has_toc: false
---

# ToolsMath module
{: .no_toc }

Two number functions: **Ceil** rounds up to a chosen number of decimal places, and **GetRandRange** returns a random whole number in a range. The module needs no other component. [**ToolsStr.GetRandStr**](ToolsStr#getrandstr) uses **GetRandRange**.

```tb check_build check_run
Debug.Print ToolsMath.Ceil(1.231, 2)
Debug.Print ToolsMath.Ceil(-1.5)
Debug.Print ToolsMath.Ceil(0.07, 2)
Debug.Print ToolsMath.Ceil(1234, -2)
Debug.Print ToolsMath.GetRandRange(3, 3)
' Output:
' 1.24
' -1
' 0.08
' 1300
' 3
```

## Functions

### Ceil
{: .no_toc }

Rounds a number up, towards positive infinity, to a number of decimal places.

Syntax: **ToolsMath.Ceil** ( *Num* [ **,** *Dot* ] ) **As Double**

*Num*
: *required* A **Variant** that holds a number, or text that converts to one.

*Dot*
: *optional* A **Long**, the number of decimal places to keep, 0 by default. A negative value rounds to tens, hundreds and so on: `Ceil(1234, -2)` is 1300.

The result is the smallest number with *Dot* decimal places that is not less than *Num*: `Ceil(1.231, 2)` is 1.24 and `Ceil(-1.5)` is -1. The function multiplies *Num* by 10 to the power *Dot*, rounds up with **Int**, and divides again. The arithmetic is in binary floating point, so a number that has no exact binary form can multiply to a value a little above a whole number and round up one step too far: `Ceil(0.07, 2)` returns 0.08, because 0.07 multiplied by 100 is a little more than 7.

### GetRandRange
{: .no_toc }

Returns a random whole number from *a* to *b*, both included.

Syntax: **ToolsMath.GetRandRange** ( *a* **,** *b* ) **As Long**

*a*
: *required* A **Long**, the smallest value. It is passed by reference and is not changed.

*b*
: *required* A **Long**, the largest value. It is passed by reference and is not changed. If it is less than *a*, the result is not in the range.

Each call runs **Randomize** with no argument, which seeds the generator from the system timer, then returns `Int((b - a + 1) * Rnd() + a)`. The numbers come from the generator of the language and are not suitable for passwords, keys or any other use where they have to be unpredictable.

## See Also

- [ToolsStr](ToolsStr) module -- **GetRandStr** and **GetRandByte** use the generator
- [Randomize](../../../Modules/Math/Randomize) statement and [Rnd](../../../Modules/Math/Rnd) function -- the generator that **GetRandRange** uses
- [TBMANLIB](.) package -- overview
