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
: An expression of an integral type: **Byte**, **Integer**, **Long**, **LongLong** or **LongPtr**. Other types are described below.

*count*
: Any numeric expression giving the number of bit positions to shift.

The data type of *result* matches the type of *number*, whatever the type of *count*; shifts do not follow the [promotion rules](../../Reference/Operators#result-types-and-promotion) of the arithmetic operators. The right shift is *logical*, not arithmetic: vacated high-order bits are filled with zero, so a negative *number* becomes a large positive value rather than retaining its sign --- a **Long** variable holding -8, shifted right by 1, is 2147483644. A shift by as many bits as the type holds, or more, yields `0`. A negative *count* raises no error, but gives no useful result.

> [!IMPORTANT]
> When both operands are constants, the compiler evaluates **>>** as an *arithmetic* shift, which keeps the sign: `-8& >> 1` is -4 and `-1 >> 1` is -1. Hold a negative value in a variable when the logical shift is wanted.

> [!IMPORTANT]
> Only the integral types are shifted bit by bit. With other types of *number*:
>
> - A **Currency** or **Decimal** is shifted as a value: a **Currency** holding 7.9, shifted right by 1, is 3.95, and a **Decimal** holding 7.9 gives 4.
> - A **Variant** is divided as a value, truncating toward zero, so the sign is kept: a **Variant** holding the **Long** -8, shifted right by 1, is -4, and one holding -7 gives -3.
> - A **Single**, **Double**, **Date**, **Boolean** or **String** compiles without a diagnostic, but the procedure containing the shift does not run: the IDE reports *compilation (codegen) error detected* at that line.
>
> Convert such a value with [**CLng**](../Modules/Conversion/CLng) or [**CLngLng**](../Modules/Conversion/CLngLng) before shifting it.

### Compound assignment

`x >>= n` is the twinBASIC shorthand for `x = x >> n`. **\>>=** is a statement, not an expression --- it does not produce a value.

```tb check_build
Dim Flags As Long = &H100
Flags >>= 4                     ' Flags is now &H10 (16).
Flags >>= 4                     ' Flags is now 1.
```

### Example

```tb check_build
Dim Value As Long
Value = 16 >> 0                 ' Returns 16.
Value = 16 >> 4                 ' Returns 1.
Value = 1024 >> 3               ' Returns 128.

Dim Negative As Long = -1
Value = Negative >> 1           ' Returns &H7FFFFFFF: the vacated bit is filled with 0.
```

### See Also

- [**\<<** operator](LeftShift)
- [**\\** operator](IntegerDivide)
- [**And** operator](And)
- [Operators](../../Reference/Operators)
