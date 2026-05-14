---
title: Or
parent: Operators
grand_parent: Reference Section
permalink: /tB/Core/Or
vba_attribution: true
---
# Or operator
{: .no_toc }

Used to perform a bitwise disjunction on two expressions.

Syntax:
> *result* **=** *expression1* **Or** *expression2*

*result*
: Any numeric variable.

*expression1*, *expression2*
: Any expressions.

If either or both expressions evaluate to **True**, *result* is **True**. The following table illustrates how *result* is determined:

| If *expression1* is | And *expression2* is | Then *result* is |
|:-----|:-----|:-----|
| **True**  | **True**  | **True**  |
| **True**  | **False** | **True**  |
| **True**  | **Null**  | **True**  |
| **False** | **True**  | **True**  |
| **False** | **False** | **False** |
| **False** | **Null**  | **Null**  |
| **Null**  | **True**  | **True**  |
| **Null**  | **False** | **Null**  |
| **Null**  | **Null**  | **Null**  |

The **Or** operator performs a bitwise comparison of identically positioned bits in two numeric expressions and sets the corresponding bit in *result* according to the following table:

| If bit in *expression1* is | And bit in *expression2* is | Then *result* is |
|:-----:|:-----:|:-----:|
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 1 |

> [!NOTE]
> **Or** evaluates *both* operands every time, even when *expression1* alone determines the result. Use [**OrElse**](OrElse) for short-circuit evaluation --- for example, when *expression2* is expensive, has side effects, or only matters when *expression1* is **False**.

### Example

This example uses the **Or** operator to perform logical disjunction on two expressions.

```tb
Dim A, B, C, D, MyCheck
A = 10: B = 8: C = 6: D = Null    ' Initialize variables.
MyCheck = A > B Or B > C    ' Returns True.
MyCheck = B > A Or B > C    ' Returns True.
MyCheck = A > B Or B > D    ' Returns True.
MyCheck = B > D Or B > A    ' Returns Null.
MyCheck = A Or B            ' Returns 10 (bitwise comparison).
```

### See Also

- [**OrElse** operator](OrElse)
- [**And** operator](And)
- [**Not** operator](Not)
- [**Xor** operator](Xor)
- [**Eqv** operator](Eqv)
- [**Imp** operator](Imp)
- [Operators](../../Reference/Operators)
