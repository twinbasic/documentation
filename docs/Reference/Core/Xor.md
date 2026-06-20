---
title: Xor
parent: Operators
grand_parent: Reference Section
permalink: /tB/Core/Xor
vba_attribution: true
---
# Xor operator
{: .no_toc }

Used to perform a bitwise exclusion (exclusive-or) on two expressions.

Syntax:
> *result* **=** *expression1* **Xor** *expression2*

*result*
: Any numeric variable.

*expression1*, *expression2*
: Any expressions.

If one --- and only one --- of the expressions evaluates to **True**, *result* is **True**. If either expression is **Null**, *result* is also **Null**. When neither expression is **Null**, *result* is determined according to the following table:

| If *expression1* is | And *expression2* is | Then *result* is |
|:-----|:-----|:-----|
| **True**  | **True**  | **False** |
| **True**  | **False** | **True**  |
| **False** | **True**  | **True**  |
| **False** | **False** | **False** |

The **Xor** operator performs a bitwise comparison of identically positioned bits in two numeric expressions and sets the corresponding bit in *result* according to the following table:

| If bit in *expression1* is | And bit in *expression2* is | Then *result* is |
|:-----:|:-----:|:-----:|
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 0 |

> [!NOTE]
> **Xor** always evaluates *both* operands. There is no short-circuit form because the result of an exclusive-or always depends on both inputs.

### Example

This example uses the **Xor** operator to perform logical exclusion on two expressions.

```tb
Dim A, B, C, D, MyCheck
A = 10: B = 8: C = 6: D = Null    ' Initialize variables.
MyCheck = A > B Xor B > C         ' Returns False.
MyCheck = B > A Xor B > C         ' Returns True.
MyCheck = B > A Xor C > B         ' Returns False.
MyCheck = B > D Xor A > B         ' Returns Null.
MyCheck = A Xor B                 ' Returns 2 (bitwise comparison).
```

### See Also

- [**And** operator](And)
- [**Or** operator](Or)
- [**Not** operator](Not)
- [**Eqv** operator](Eqv)
- [Operators](../../Reference/Operators)
