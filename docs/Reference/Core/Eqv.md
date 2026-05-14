---
title: Eqv
parent: Operators
grand_parent: Reference Section
permalink: /tB/Core/Eqv
vba_attribution: true
---
# Eqv operator
{: .no_toc }

Used to perform a bitwise equivalence on two expressions --- the logical inverse of [**Xor**](Xor).

Syntax:
> *result* **=** *expression1* **Eqv** *expression2*

*result*
: Any numeric variable.

*expression1*, *expression2*
: Any expressions.

If either expression is **Null**, *result* is also **Null**. When neither expression is **Null**, *result* is determined according to the following table:

| If *expression1* is | And *expression2* is | The *result* is |
|:-----|:-----|:-----|
| **True**  | **True**  | **True**  |
| **True**  | **False** | **False** |
| **False** | **True**  | **False** |
| **False** | **False** | **True**  |

The **Eqv** operator performs a bitwise comparison of identically positioned bits in two numeric expressions and sets the corresponding bit in *result* according to the following table:

| If bit in *expression1* is | And bit in *expression2* is | The *result* is |
|:-----:|:-----:|:-----:|
| 0 | 0 | 1 |
| 0 | 1 | 0 |
| 1 | 0 | 0 |
| 1 | 1 | 1 |

> [!NOTE]
> **Eqv** always evaluates *both* operands.

### Example

This example uses the **Eqv** operator to perform logical equivalence on two expressions.

```tb
Dim A, B, C, D, MyCheck
A = 10: B = 8: C = 6: D = Null    ' Initialize variables.
MyCheck = A > B Eqv B > C         ' Returns True.
MyCheck = B > A Eqv B > C         ' Returns False.
MyCheck = A > B Eqv B > D         ' Returns Null.
MyCheck = A Eqv B                 ' Returns -3 (bitwise comparison).
```

### See Also

- [**Xor** operator](Xor)
- [**Imp** operator](Imp)
- [**And** operator](And)
- [**Or** operator](Or)
- [Operators](../../Reference/Operators)
