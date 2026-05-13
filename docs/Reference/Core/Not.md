---
title: Not
parent: Operators
grand_parent: Reference Section
permalink: /tB/Core/Not
vba_attribution: true
---
# Not operator
{: .no_toc }

Used to perform bitwise negation on an expression.

Syntax:
> *result* **=** **Not** *expression*

*result*
: Any numeric variable.

*expression*
: Any expression.

The following table illustrates how *result* is determined:

| If *expression* is | Then *result* is |
|:-----|:-----|
| **True**  | **False** |
| **False** | **True**  |
| **Null**  | **Null**  |

The **Not** operator inverts the bit values of its operand and sets the corresponding bit in *result* according to the following table:

| If bit in *expression* is | Then bit in *result* is |
|:-----:|:-----:|
| 0 | 1 |
| 1 | 0 |

### Example

This example uses the **Not** operator to perform logical negation on an expression.

```tb
Dim A, B, C, D, MyCheck
A = 10: B = 8: C = 6: D = Null    ' Initialize variables.
MyCheck = Not (A > B)    ' Returns False.
MyCheck = Not (B > A)    ' Returns True.
MyCheck = Not (C > D)    ' Returns Null.
MyCheck = Not A          ' Returns -11 (bitwise comparison).
```

### See Also

- [**And** operator](And)
- [**Or** operator](Or)
- [**Xor** operator](Xor)
- [**Eqv** operator](Eqv)
- [**Imp** operator](Imp)
- [**IsNot** operator](IsNot)
- [Operators](../../Reference/Operators)
