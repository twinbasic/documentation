---
title: ^, ^=
parent: Operators
grand_parent: Reference Section
permalink: /tB/Core/Exponent
vba_attribution: true
---
# ^ and ^= operators
{: .no_toc }

Used to raise a number to the power of an exponent. The compound form **^=** raises-and-assigns in one step.

Syntax:
> *result* **=** *number* **^** *exponent*  
> *variable* **^=** *exponent*       *(twinBASIC)*

*result*
: Any numeric variable.

*variable*
: *(twinBASIC)* Any numeric variable or writable property.

*number*, *exponent*
: Any numeric expressions.

*number* can be negative only if *exponent* is an integer value; otherwise error 5, *Invalid procedure call or argument*, is raised, as it is for 0 raised to a negative power. When more than one exponentiation is performed in a single expression, the **^** operator is evaluated as it is encountered from left to right.

The data type of *result* is a **Double**, or a **Variant** containing a **Double** when either operand is a **Variant**, whatever the operand types --- a **Decimal** or **Currency** *number* also gives a **Double**. However, if either *number* or *exponent* is a **Null** expression, *result* is **Null**. See [Result types and promotion](../../Reference/Operators#result-types-and-promotion) for the other arithmetic operators.

### Compound assignment

`x ^= y` is the twinBASIC shorthand for `x = x ^ y`. The left-hand side is evaluated once; the result follows the same type-promotion and **Null** rules described above. **^=** is a statement, not an expression --- it does not produce a value.

```tb check_build
Dim Value As Double = 2
Value ^= 3                      ' Value is now 8.
Value ^= 2                      ' Value is now 64.
```

### Example

This example uses the **^** operator to raise a number to the power of an exponent.

```tb check_build
Dim MyValue
MyValue = 2 ^ 2                 ' Returns 4.
MyValue = 3 ^ 3 ^ 3             ' Returns 19683 (evaluated left-to-right as (3^3)^3).
MyValue = (-5) ^ 3              ' Returns -125.
```

### See Also

- [**\*** operator](Multiply)
- [**/** operator](Divide)
- [Operators](../../Reference/Operators)
