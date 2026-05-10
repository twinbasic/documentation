---
title: Sgn
parent: Math Module
permalink: /tB/Modules/Math/Sgn
---
# Sgn
{: .no_toc }

Returns a **Variant** (**Integer**) indicating the sign of a number.

Syntax: **Sgn(** *number* **)**

*number*
: *required* Any valid numeric expression.

The sign of the *number* argument determines the return value of the **Sgn** function:

| If *number* is    | **Sgn** returns |
|-------------------|-----------------|
| Greater than zero | 1               |
| Equal to zero     | 0               |
| Less than zero    | -1              |

### Example

This example uses the **Sgn** function to determine the sign of a number.

```tb
Dim MyVar1, MyVar2, MyVar3, MySign
MyVar1 = 12: MyVar2 = -2.4: MyVar3 = 0
MySign = Sgn(MyVar1)    ' Returns 1.
MySign = Sgn(MyVar2)    ' Returns -1.
MySign = Sgn(MyVar3)    ' Returns 0.
```

### See Also

- [Abs](Abs) function

{% include VBA-Attribution.md %}
