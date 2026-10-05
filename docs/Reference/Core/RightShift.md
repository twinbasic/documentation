---
title: "&gt;&gt;, &gt;&gt;="
parent: Operators
grand_parent: Reference Section
permalink: /tB/Core/RightShift
---
# \>> and \>>= operators
{: .no_toc #rightshift-operators }

*(twinBASIC)* Shifts the bits of a numeric value right by a given number of positions, keeping the sign of a signed value. The compound form **>>=** shifts-and-assigns in one step.

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

The data type of *result* matches the type of *number*, whatever the type of *count*; shifts do not follow the [promotion rules](../../Reference/Operators#result-types-and-promotion) of the arithmetic operators. The right shift of an **Integer**, **Long**, **LongLong** or **LongPtr** is *arithmetic*: vacated high-order bits are copies of the sign bit, so a negative *number* stays negative --- a **Long** holding -8, shifted right by 1, is -4, and one holding -7 also gives -4, rounding toward negative infinity where [**\\**](IntegerDivide) rounds toward zero. A **Byte** has no sign, and its vacated bits are filled with zero. Constants and variables give the same result. A shift by as many bits as the type holds, or more, yields `0`. A negative *count* raises no error, but gives no useful result.

> [!IMPORTANT]
> Only the integral types are shifted bit by bit. With other types of *number*:
>
> - A **Currency** is shifted as a value, fraction included: a **Currency** holding 7.9, shifted right by 1, is 3.95. A **Decimal** holding 7.9 gives 3.
> - A **Variant** holding the **Long** -7, shifted right by 1, is -4, as the **Long** itself gives; one holding the **Double** 7.9 gives 3.
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
Value = Negative >> 1           ' Returns -1: the vacated bit is a copy of the sign bit.
```

### See Also

- [**\<<** operator](LeftShift)
- [**\\** operator](IntegerDivide)
- [**And** operator](And)
- [Operators](../../Reference/Operators)
