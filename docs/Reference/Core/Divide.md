---
title: /, /=
parent: Operators
grand_parent: Reference Section
permalink: /tB/Core/Divide
vba_attribution: true
---
# / and /= operators
{: .no_toc }

Used to divide two numbers and return a floating-point result. The compound form **/=** divides-and-assigns in one step.

Syntax:
> *result* **=** *number1* **/** *number2*  
> *variable* **/=** *number*       *(twinBASIC)*

*result*
: Any numeric variable.

*variable*
: *(twinBASIC)* Any numeric variable or writable property.

*number*, *number1*, *number2*
: Any numeric expressions.

The data type of *result* is usually a **Double** or a **Double** variant. The following are exceptions:

| If                                                              | Then *result* is                                                                       |
|:----------------------------------------------------------------|:---------------------------------------------------------------------------------------|
| Both expressions are **Byte**, **Integer**, or **Single**       | A **Single** unless it overflows its legal range, in which case an error occurs.       |
| Both expressions are **Byte**, **Integer**, or **Single** variants | A **Single** variant unless it overflows its legal range, in which case *result* is a **Variant** containing a **Double**. |

If one or both expressions are **Null** expressions, *result* is **Null**. Any expression that is **Empty** is treated as 0.

Dividing by zero is an error for integral types; for **Single** and **Double** it follows the IEEE-754 rules (positive infinity, negative infinity, or NaN). Use [**\\**](IntegerDivide) for truncating-integer division and [**Mod**](Mod) for remainder.

### Compound assignment

`x /= y` is the twinBASIC shorthand for `x = x / y`. The left-hand side is evaluated once; the result follows the same type-promotion and **Null** / **Empty** rules described above. **/=** is a statement, not an expression — it does not produce a value.

```tb
Dim Value As Double = 100
Value /= 4                      ' Value is now 25.
Value /= 5                      ' Value is now 5.
```

### Example

This example uses the **/** operator to perform floating-point division.

```tb
Dim MyValue
MyValue = 10 / 4                ' Returns 2.5.
MyValue = 10 / 3                ' Returns 3.333333...
```

### See Also

- [**\\** operator](IntegerDivide)
- [**Mod** operator](Mod)
- [**\*** operator](Multiply)
- [Operators](../../Reference/Operators)
