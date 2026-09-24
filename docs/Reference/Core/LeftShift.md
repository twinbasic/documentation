---
title: "&lt;&lt;, &lt;&lt;="
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
: An expression of an integral type: **Byte**, **Integer**, **Long**, **LongLong** or **LongPtr**. Other types are described below.

*count*
: Any numeric expression giving the number of bit positions to shift.

The data type of *result* matches the type of *number*, whatever the type of *count*; shifts do not follow the [promotion rules](../../Reference/Operators#result-types-and-promotion) of the arithmetic operators. A shift by as many bits as the type holds, or more, yields `0` rather than wrapping: `1& << 32` is 0. The sign bit is *not* preserved --- `<<` is a logical left shift, equivalent to multiplication by 2<sup>*count*</sup> within the available width, with no overflow error: `&H4000 << 1` is the **Integer** -32768. A negative *count* raises no error, but gives no useful result.

An integer literal with no type suffix is an **Integer**, so `1 << 20` shifts a 16-bit value and is 0. Write `1& << 20` to shift a **Long** and get 1048576.

> [!IMPORTANT]
> Only the integral types are shifted bit by bit. With other types of *number*:
>
> - A **Currency** or **Decimal** is shifted as a value, fraction included: a **Currency** or **Decimal** holding 7.9, shifted left by 1, is 15.8.
> - A **Variant** holding a fractional value is shifted the same way --- a **Variant** holding the **Double** 7.9, shifted left by 1, is 15.8 --- and a large *count* can give **Empty**: a **Variant** holding the **Integer** 1, shifted left by 20, is **Empty**.
> - A **Single**, **Double**, **Date**, **Boolean** or **String** compiles without a diagnostic, but the procedure containing the shift does not run: the IDE reports *compilation (codegen) error detected* at that line.
>
> Convert such a value with [**CLng**](../Modules/Conversion/CLng) or [**CLngLng**](../Modules/Conversion/CLngLng) before shifting it.

### Compound assignment

`x <<= n` is the twinBASIC shorthand for `x = x << n`. **\<<=** is a statement, not an expression --- it does not produce a value.

```tb check_build
Dim Mask As Long = 1
Mask <<= 4                      ' Mask is now &H10 (16).
Mask <<= 4                      ' Mask is now &H100 (256).
```

### Example

```tb check_build
Dim Value As Long
Value = 1 << 0                  ' Returns 1.
Value = 1 << 4                  ' Returns 16.
Value = 3 << 8                  ' Returns 768.
Value = 1& << 33                ' Returns 0 (shift exceeds Long width).
Value = 1 << 20                 ' Returns 0: the literal 1 is an Integer.
Value = 1& << 20                ' Returns 1048576.
```

### See Also

- [**\>>** operator](RightShift)
- [**And** operator](And)
- [**Or** operator](Or)
- [Operators](../../Reference/Operators)
