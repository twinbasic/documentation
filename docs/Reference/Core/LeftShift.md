---
title: <<, <<=
parent: Operators
grand_parent: Reference Section
permalink: /tB/Core/LeftShift
---
# \<< and \<<= operators
{: .no_toc #leftshift-operators }

*(twinBASIC)* Shifts the bits of a numeric value left by a given number of positions, filling vacated low-order bits with zero. The compound form **<<=** shifts-and-assigns in one step.

> [!NOTE]
> **\<<** and **\<<=** are twinBASIC extensions. Classic VBA has no bitshift operators; equivalent code multiplies by powers of two (`x * 2`, `x * 4`, …) and relies on overflow rules.

Syntax:
> *result* **=** *number* **<<** *count*  
> *variable* **<<=** *count*

*result*
: Any numeric variable.

*variable*
: Any numeric variable or writable property.

*number*
: Any numeric expression. Floating-point operands are truncated to an integer before shifting.

*count*
: Any numeric expression giving the number of bit positions to shift.

The data type of *result* matches the (integral) type of *number*. A shift of more bits than the type can hold yields `0` rather than wrapping. The sign bit is *not* preserved --- `<<` is a logical left shift, equivalent to multiplication by 2<sup>*count*</sup> within the available width.

### Compound assignment

`x <<= n` is the twinBASIC shorthand for `x = x << n`. **\<<=** is a statement, not an expression --- it does not produce a value.

```tb
Dim Mask As Long = 1
Mask <<= 4                      ' Mask is now &H10 (16).
Mask <<= 4                      ' Mask is now &H100 (256).
```

### Example

```tb
Dim Value As Long
Value = 1 << 0                  ' Returns 1.
Value = 1 << 4                  ' Returns 16.
Value = 3 << 8                  ' Returns 768.
Value = 1 << 33                 ' Returns 0 (shift exceeds Long width).
```

### See Also

- [**\>>** operator](RightShift)
- [**And** operator](And)
- [**Or** operator](Or)
- [Operators](../../Reference/Operators)
