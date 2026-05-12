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

The modulus, or remainder, operator divides *number1* by *number2* (rounding floating-point numbers to integers) and returns only the remainder as *result*. For example, in the following expression, A (*result*) equals 5:

```tb
A = 19 Mod 6.7
```

Usually, the data type of *result* is **Byte**, **Byte** variant, **Integer**, **Integer** variant, **Long**, or **Variant** containing a **Long**, regardless of whether *result* is a whole number. Any fractional portion is truncated.

However, if any operand is **Null**, *result* is **Null**. Any operand that is **Empty** is treated as 0.

### Example

This example uses the **Mod** operator to divide two numbers and return only the remainder. If either number is a floating-point number, it is first rounded to an integer.

```tb
Dim MyResult
MyResult = 10 Mod 5     ' Returns 0.
MyResult = 10 Mod 3     ' Returns 1.
MyResult = 12 Mod 4.3   ' Returns 0.
MyResult = 12.6 Mod 5   ' Returns 3.
```

### See Also

- [Operators](../../Reference/Operators)
