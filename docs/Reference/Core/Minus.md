---
title: -, -=
parent: Operators
grand_parent: Reference Section
permalink: /tB/Core/Minus
vba_attribution: true
---
# - and -= operators
{: .no_toc }

Used to find the difference between two numbers, or to indicate the negative value of a numeric expression. The compound form **-=** subtracts-and-assigns in one step.

Syntax:
> *result* **=** *number1* **-** *number2*  
> **-** *number*  
> *variable* **-=** *number*       *(twinBASIC)*

*result*
: Any numeric variable.

*variable*
: *(twinBASIC)* Any numeric variable or writable property.

*number*, *number1*, *number2*
: Any numeric expressions.

In the binary form, **-** is the arithmetic subtraction operator that returns the difference between *number1* and *number2*. In the unary form, **-** is the negation operator that returns the negative of *number*.

The data type of *result* is usually the same as that of the most precise expression. The order of precision, from least to most precise, is **Byte**, **Integer**, **Long**, **LongLong**, **Single**, **Double**, **Currency**, **Decimal**. A **Boolean** counts as an **Integer**, a **String** as a **Double** --- two **String** expressions are converted to numbers and subtracted --- and a **LongPtr** as a **Long** in a 32-bit build or a **LongLong** in a 64-bit build. The following are exceptions:

| If                                                                                       | Then *result* is                       |
|:-----------------------------------------------------------------------------------------|:---------------------------------------|
| Subtraction involves a **Single** and a **Long** or **LongLong**                         | Converted to a **Double**.             |
| *result* is a **Long**, **LongLong**, **Single**, or **Date** variant that overflows its legal range | Converted to a **Variant** containing a **Double**. |
| *result* is a **Byte** variant that overflows its legal range                            | Converted to an **Integer** variant.   |
| *result* is an **Integer** variant that overflows its legal range                        | Converted to a **Long** variant.       |
| Subtraction involves a **Date** and any other data type except **Decimal**               | A **Date**.                            |
| Subtraction involves two **Date** expressions                                            | A **Double**.                          |

A declared (non-**Variant**) result that overflows raises error 6, *Overflow*. If one or both expressions are **Null** expressions, *result* is **Null**. If an expression is **Empty**, it is treated as 0.

> [!NOTE]
> The order of precision used by addition and subtraction is not the same as the order of precision used by multiplication.

The rules for every arithmetic operator are collected under [Result types and promotion](../../Reference/Operators#result-types-and-promotion).

> [!NOTE]
> **LongLong** and **Decimal** take part in subtraction in every twinBASIC build: **LongLong** exists in 32-bit builds as well, and **Decimal** can be a declared type, so a declared **Decimal** on either side gives a declared **Decimal**. VBA has **LongLong** only in 64-bit builds, and **Decimal** only inside a **Variant**.

### Compound assignment

`x -= y` is the twinBASIC shorthand for `x = x - y`. The left-hand side is evaluated once; the result follows the same type-promotion and **Null** / **Empty** rules described above. **-=** is a statement, not an expression --- it does not produce a value.

```tb check_build
Dim Total As Long = 100
Total -= 5                      ' Total is now 95.
Total -= 5                      ' Total is now 90.
```

### Example

This example uses the **-** operator to calculate the difference between two numbers.

```tb check_build
Dim MyResult
MyResult = 4 - 2                ' Returns 2.
MyResult = 459.35 - 334.90      ' Returns 124.45.
MyResult = -MyResult            ' Unary negation: returns -124.45.
```

### See Also

- [**+** operator](Plus)
- [**\*** operator](Multiply)
- [**/** operator](Divide)
- [Operators](../../Reference/Operators)
