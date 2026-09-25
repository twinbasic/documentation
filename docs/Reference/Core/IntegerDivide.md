---
title: "&#92;, &#92;="
parent: Operators
grand_parent: Reference Section
permalink: /tB/Core/IntegerDivide
vba_attribution: true
---
# \\ and \\= operators
{: .no_toc }

Used to divide two numbers and return an integer result. The compound form **\\=** divides-and-assigns in one step.

Syntax:
> *result* **=** *number1* **\\** *number2*  
> *variable* **\\=** *number*       *(twinBASIC)*

*result*
: Any numeric variable.

*variable*
: *(twinBASIC)* Any numeric variable or writable property.

*number*, *number1*, *number2*
: Any numeric expressions.

Before division is performed, the numeric expressions are rounded to whole numbers. A value exactly halfway between two whole numbers is rounded to the even one, so `6.5 \ 2` is 3 and `7.5 \ 2` is 4.

Usually, the data type of *result* is a **Byte**, **Byte** variant, **Integer**, **Integer** variant, **Long**, **Long** variant, **LongLong**, or **LongLong** variant, regardless of whether *result* is a whole number: **Byte** when both expressions are **Byte**, **Integer** when both are **Byte**, **Integer** or **Boolean**, **LongLong** when either is **LongLong**, and **Long** otherwise. A declared **Decimal** expression gives a **Decimal** *result*, still a whole number; a **Decimal** held in a **Variant** gives a **Long**. See [Result types and promotion](../../Reference/Operators#result-types-and-promotion).

Any fractional portion of the quotient is discarded, so the quotient is truncated toward zero: `-7 \ 2` is -3. However, if any expression is **Null**, *result* is **Null**. Any expression that is **Empty** is treated as 0.

Dividing by zero raises error 11, *Division by zero*.

> [!WARNING]
> Dividing the most negative **Integer** (-32,768) or **Long** (-2,147,483,648) by -1 does not raise error 6. It raises a native overflow exception that `On Error` does not handle, and the procedure stops at that line. The same division on **LongLong** returns the most negative **LongLong** unchanged, with no error. A **Variant** holding the **Integer** gives a **Long** 32,768.

> [!NOTE]
> **Decimal** can be a declared type in twinBASIC, and integer division keeps it: a declared **Decimal** on either side gives a **Decimal** *result*. In VBA, **Decimal** exists only inside a **Variant**. **LongLong** takes part in 32-bit builds as well; VBA has it only in 64-bit builds.

### Compound assignment

`x \= y` is the twinBASIC shorthand for `x = x \ y`. The left-hand side is evaluated once and rounded to an integral type before the division. **\\=** is a statement, not an expression --- it does not produce a value.

```tb check_build
Dim Value As Long = 100
Value \= 4                      ' Value is now 25.
Value \= 7                      ' Value is now 3 (truncating).
```

### Example

This example uses the **\\** operator to perform integer division.

```tb check_build
Dim MyValue
MyValue = 11 \ 4                ' Returns 2.
MyValue = 9 \ 3                 ' Returns 3.
MyValue = 100 \ 3               ' Returns 33.
```

### See Also

- [**/** operator](Divide)
- [**Mod** operator](Mod)
- [Operators](../../Reference/Operators)
