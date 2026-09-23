---
title: Mod
parent: Operators
grand_parent: Reference Section
permalink: /tB/Core/Mod
vba_attribution: true
---
# Mod operator
{: .no_toc }

Used to divide two numbers and return only the remainder.

Syntax:
> *result* **=** *number1* **Mod** *number2*

*result*
: Any numeric variable.

*number1*, *number2*
: Any numeric expressions.

The modulus, or remainder, operator divides *number1* by *number2* (rounding floating-point numbers to whole numbers, a value exactly halfway going to the even one) and returns only the remainder as *result*. For example, in the following expression, A (*result*) equals 5:

```tb check_build
Dim A As Long
A = 19 Mod 6.7
```

Usually, the data type of *result* is **Byte**, **Byte** variant, **Integer**, **Integer** variant, **Long**, **Variant** containing a **Long**, **LongLong**, or **Variant** containing a **LongLong**, regardless of whether *result* is a whole number. The type follows the same rules as for [the **\\** operator](IntegerDivide): a declared **Decimal** operand gives a **Decimal** *result*, still a whole number, and a **Decimal** held in a **Variant** gives a **Long**. See [Result types and promotion](../../Reference/Operators#result-types-and-promotion). Any fractional portion is truncated.

The *result* has the sign of *number1*: `-7 Mod 2` is -1, and `7 Mod -2` is 1.

However, if any operand is **Null**, *result* is **Null**. Any operand that is **Empty** is treated as 0. Using 0 as *number2* raises error 11, *Division by zero*.

> [!WARNING]
> `Mod` with the most negative **Integer** (-32,768) or **Long** (-2,147,483,648) as *number1* and -1 as *number2* does not return 0. It raises a native overflow exception that `On Error` does not handle, and the procedure stops at that line.

> [!NOTE]
> **Decimal** can be a declared type in twinBASIC, and `Mod` keeps it: a declared **Decimal** on either side gives a **Decimal** *result*. In VBA, **Decimal** exists only inside a **Variant**. **LongLong** takes part in 32-bit builds as well; VBA has it only in 64-bit builds.

### Example

This example uses the **Mod** operator to divide two numbers and return only the remainder. If either number is a floating-point number, it is first rounded to an integer.

```tb check_build
Dim MyResult
MyResult = 10 Mod 5     ' Returns 0.
MyResult = 10 Mod 3     ' Returns 1.
MyResult = 12 Mod 4.3   ' Returns 0.
MyResult = 12.6 Mod 5   ' Returns 3.
```

### See Also

- [**\\** operator](IntegerDivide)
- [**/** operator](Divide)
- [Operators](../../Reference/Operators)
