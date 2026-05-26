---
title: "&gt;&gt;, &gt;&gt;="
parent: Operators
grand_parent: Reference Section
permalink: /tB/Core/RightShift
---
# \>> and \>>= operators
{: .no_toc #rightshift-operators }

*(twinBASIC)* Shifts the bits of a numeric value right by a given number of positions, filling vacated high-order bits with zero. The compound form **>>=** shifts-and-assigns in one step.

> [!NOTE]
> **\>>** and **\>>=** are twinBASIC extensions. Classic VBA has no bitshift operators; equivalent code divides by powers of two with [**\\\\**](IntegerDivide) (`x \ 2`, `x \ 4`, …).

Syntax:
> *result* **=** *number* **>>** *count*  
> *variable* **\>>=** *count*

*result*
: Any numeric variable.

*variable*
: Any numeric variable or writable property.

*number*
: Any numeric expression. Floating-point operands are truncated to an integer before shifting.

*count*
: Any numeric expression giving the number of bit positions to shift.

The data type of *result* matches the (integral) type of *number*. The right shift is *logical*, not arithmetic: vacated high-order bits are filled with zero, so a negative *number* becomes a large positive value rather than retaining its sign. A shift of more bits than the type can hold yields `0`.

### Compound assignment

`x >>= n` is the twinBASIC shorthand for `x = x >> n`. **\>>=** is a statement, not an expression --- it does not produce a value.

```tb
Dim Flags As Long = &H100
Flags >>= 4                     ' Flags is now &H10 (16).
Flags >>= 4                     ' Flags is now 1.
```

### Example

```tb
Dim Value As Long
Value = 16 >> 0                 ' Returns 16.
Value = 16 >> 4                 ' Returns 1.
Value = 1024 >> 3               ' Returns 128.
Value = -1 >> 1                 ' Returns &H7FFFFFFF (logical shift fills with 0).
```

### See Also

- [**\<<** operator](LeftShift)
- [**\\** operator](IntegerDivide)
- [**And** operator](And)
- [Operators](../../Reference/Operators)
