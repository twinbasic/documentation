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
| At least one expression is **Single** and neither is **Long**   | A **Single** unless it overflows its legal range, in which case an error occurs.       |
| One or both expressions are **Null**                            | **Null**.                                                                              |
| An expression is **Empty**                                      | Treated as 0.                                                                          |

Dividing by zero raises a run-time error. Use [**\\**](IntegerDivide) for truncating-integer division and [**Mod**](Mod) for remainder.

### Compound assignment

`x /= y` is the twinBASIC shorthand for `x = x / y`. The left-hand side is evaluated once; the result follows the same type-promotion and **Null** / **Empty** rules described above. **/=** is a statement, not an expression --- it does not produce a value.

```tb check_build
Dim Value As Double = 100
Value /= 4                      ' Value is now 25.
Value /= 5                      ' Value is now 5.
```

### Example

This example uses the **/** operator to perform floating-point division.

```tb check_build
Dim MyValue
MyValue = 10 / 4                ' Returns 2.5.
MyValue = 10 / 3                ' Returns 3.333333...
```

### See Also

- [**\\** operator](IntegerDivide)
- [**Mod** operator](Mod)
- [**\*** operator](Multiply)
- [Operators](../../Reference/Operators)
