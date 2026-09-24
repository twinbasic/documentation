---
title: "*, *="
parent: Operators
grand_parent: Reference Section
permalink: /tB/Core/Multiply
vba_attribution: true
---
# \* and \*= operators
{: .no_toc }

Used to multiply two numbers. The compound form **\*=** multiplies-and-assigns in one step.

Syntax:
> *result* **=** *number1* **\*** *number2*  
> *variable* **\*=** *number*       *(twinBASIC)*

*result*
: Any numeric variable.

*variable*
: *(twinBASIC)* Any numeric variable or writable property.

*number*, *number1*, *number2*
: Any numeric expressions.

The data type of *result* is usually the same as that of the most precise expression. The order of precision, from least to most precise, is **Byte**, **Integer**, **Long**, **LongLong**, **Single**, **Currency**, **Double**, **Decimal**. A **Boolean** counts as an **Integer**, a **String** as a **Double**, and a **LongPtr** as a **Long** in a 32-bit build or a **LongLong** in a 64-bit build. The following are exceptions:

| If                                                                                       | Then *result* is                       |
|:-----------------------------------------------------------------------------------------|:---------------------------------------|
| Multiplication involves a **Single** and a **Long**, **LongLong** or **Currency**        | Converted to a **Double**.             |
| Multiplication involves a **Date**                                                       | A **Double**, or a **Decimal** when the other expression is a **Decimal**. |
| *result* is a **Long**, **LongLong** or **Single** variant that overflows its legal range | Converted to a **Variant** containing a **Double**. |
| *result* is a **Byte** variant that overflows its legal range                            | Converted to an **Integer** variant, or a **Long** variant when the value is too large for an **Integer**. |
| *result* is an **Integer** variant that overflows its legal range                        | Converted to a **Long** variant.       |

A declared (non-**Variant**) result that overflows raises error 6, *Overflow*. If one or both expressions are **Null** expressions, *result* is **Null**. If an expression is **Empty**, it is treated as 0.

> [!NOTE]
> The order of precision used by multiplication is not the same as the order of precision used by addition and subtraction.

The rules for every arithmetic operator, including a list of the combinations that matter most when porting code, are collected under [Result types and promotion](../../Reference/Operators#result-types-and-promotion).

> [!NOTE]
> **LongLong** and **Decimal** take part in multiplication in every twinBASIC build: **LongLong** exists in 32-bit builds as well, and **Decimal** can be a declared type, so a declared **Decimal** times any other numeric type is a declared **Decimal**. VBA has **LongLong** only in 64-bit builds, and **Decimal** only inside a **Variant**.

### Compound assignment

`x *= y` is the twinBASIC shorthand for `x = x * y`. The left-hand side is evaluated once; the result follows the same type-promotion and **Null** / **Empty** rules described above. **\*=** is a statement, not an expression --- it does not produce a value.

```tb check_build
Dim Value As Long = 3
Value *= 4                      ' Value is now 12.
Value *= 2                      ' Value is now 24.
```

### Example

This example uses the **\*** operator to multiply two numbers.

```tb check_build
Dim MyValue
MyValue = 2 * 2                 ' Returns 4.
MyValue = 459.35 * 334.90       ' Returns 153836.315.
```

### See Also

- [**/** operator](Divide)
- [**\\** operator](IntegerDivide)
- [**^** operator](Exponent)
- [**+** operator](Plus)
- [Operators](../../Reference/Operators)
