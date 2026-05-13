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

The data type of *result* is usually the same as that of the most precise expression. The order of precision, from least to most precise, is **Byte**, **Integer**, **Long**, **LongLong**, **Single**, **Double**, **Currency**. The following are exceptions:

| If                                                                                       | Then *result* is                       |
|:-----------------------------------------------------------------------------------------|:---------------------------------------|
| Subtraction involves a **Single** and a **Long**                                         | Converted to a **Double**.             |
| *result* is a **Long**, **Single**, or **Date** variant that overflows its legal range   | Converted to a **Variant** containing a **Double**. |
| *result* is a **Byte** variant that overflows its legal range                            | Converted to an **Integer** variant.   |
| *result* is an **Integer** variant that overflows its legal range                        | Converted to a **Long** variant.       |
| Subtraction involves a **Date** and any other data type                                  | A **Date**.                            |
| Subtraction involves two **Date** expressions                                            | A **Double**.                          |

If one or both expressions are **Null** expressions, *result* is **Null**. If an expression is **Empty**, it is treated as 0.

> [!NOTE]
> The order of precision used by addition and subtraction is not the same as the order of precision used by multiplication.

### Compound assignment

`x -= y` is the twinBASIC shorthand for `x = x - y`. The left-hand side is evaluated once; the result follows the same type-promotion and **Null** / **Empty** rules described above. **-=** is a statement, not an expression — it does not produce a value.

```tb
Dim Total As Long = 100
Total -= 5                      ' Total is now 95.
Total -= 5                      ' Total is now 90.
```

### Example

This example uses the **-** operator to calculate the difference between two numbers.

```tb
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
