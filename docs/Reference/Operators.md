---
title: Operators
parent: Reference Section
nav_order: 4
has_toc: false
permalink: /Reference/Operators
---

# Operators

Operators built into the twinBASIC language. They are understood by the compiler and are not declared or defined in the runtime library.

## Arithmetic

- [+](../tB/Core/Plus) -- addition; with **String** operands, concatenation
- [-](../tB/Core/Minus) -- subtraction; as a unary operator, negation
- [*](../tB/Core/Multiply) -- multiplication
- [/](../tB/Core/Divide) -- floating-point division
- [\\](../tB/Core/IntegerDivide) -- integer division (truncating)
- [Mod](../tB/Core/Mod) -- divides two numbers and returns only the remainder
- [ ^](../tB/Core/Exponent) -- exponentiation

## Concatenation

- [&](../tB/Core/Concat) -- forces string concatenation, regardless of operand types

## Comparison

- [Comparison operators](../tB/Core/Comparison-Operators) (`=`, `<>`, `<`, `<=`, `>`, `>=`) -- numeric or string comparison
- [Like](../tB/Core/Like) -- wildcard / pattern-matching comparison
- [Is](../tB/Core/Is) -- compares two object references for identity
- [IsNot](../tB/Core/IsNot) -- (twinBASIC) the logical inverse of **Is**

## Bitwise

Both operands are always evaluated. Booleans are treated as integers: True = -1, False = 0.

- [And](../tB/Core/And) -- bitwise conjunction
- [Or](../tB/Core/Or) -- bitwise disjunction
- [Not](../tB/Core/Not) -- bitwise negation
- [Xor](../tB/Core/Xor) -- bitwise exclusive-or
- [Eqv](../tB/Core/Eqv) -- bitwise equivalence
- [Imp](../tB/Core/Imp) -- bitwise implication

## Logical Short-Circuit

The right operand is evaluated only when the left operand does not already determine the result.

- [AndAlso](../tB/Core/AndAlso) -- (twinBASIC) short-circuit conjunction; evaluates the right operand only if the left is **True**
- [OrElse](../tB/Core/OrElse) -- (twinBASIC) short-circuit disjunction; evaluates the right operand only if the left is **False**

## Bitshift

*(twinBASIC)* Shifts are *logical* --- vacated bits are filled with zero, and shifts past the operand's width yield `0` rather than wrapping.

- [\<<](../tB/Core/LeftShift) -- (twinBASIC) shifts a numeric value left by a given number of bits
- [\>>](../tB/Core/RightShift) -- (twinBASIC) shifts a numeric value right by a given number of bits

## Object Identity

- [Is](../tB/Core/Is) -- compares two object references for identity
- [IsNot](../tB/Core/IsNot) -- (twinBASIC) the logical inverse of **Is**

## Compound Assignment

*(twinBASIC)* For most arithmetic, concatenation, and bitshift operators, twinBASIC provides a compound form `op=` that combines the operation with assignment. `x op= y` is equivalent to `x = x op y`, but evaluates the left-hand side only once and is a statement rather than an expression.

| Operator                       | Compound form | Equivalent to |
| :----------------------------- | :------------ | :------------ |
| [+](../tB/Core/Plus)           | **+=**        | `x = x + y`   |
| [-](../tB/Core/Minus)          | **-=**        | `x = x - y`   |
| [*](../tB/Core/Multiply)       | **\*=**       | `x = x * y`   |
| [/](../tB/Core/Divide)         | **/=**        | `x = x / y`   |
| [\\](../tB/Core/IntegerDivide) | **\\=**       | `x = x \ y`   |
| [ ^](../tB/Core/Exponent)      | **^=**        | `x = x ^ y`   |
| [&](../tB/Core/Concat)         | **&=**        | `x = x & y`   |
| [\<<](../tB/Core/LeftShift)    | **\<<=**      | `x = x << y`  |
| [\>>](../tB/Core/RightShift)   | **\>>=**      | `x = x >> y`  |

There is no compound form for [**Mod**](../tB/Core/Mod), or for any of the logical / comparison operators.

## Function Pointers

- [AddressOf](../tB/Core/AddressOf) -- produces a typed function-pointer to a procedure

## Operator Precedence

When several operations occur in an expression, each part is evaluated in a fixed order. Arithmetic operators are evaluated first, comparison operators next, and logical operators last. Parentheses override the default order.

Within each category, the order from highest to lowest precedence is:

| Arithmetic                                           | Comparison                            | Logical    |
|:-----------------------------------------------------|:--------------------------------------|:-----------|
| Exponentiation (`^`)                                 | Equality (`=`)                        | **Not**    |
| Unary negation (`-`)                                 | Inequality (`<>`)                     | **And**, **AndAlso** |
| Multiplication and division (`*`, `/`)               | Less than (`<`)                       | **Or**, **OrElse**   |
| Integer division (`\`)                               | Greater than (`>`)                    | **Xor**    |
| Modulus (`Mod`)                                      | Less than or equal to (`<=`)          | **Eqv**    |
| Addition and subtraction (`+`, `-`)                  | Greater than or equal to (`>=`)       | **Imp**    |
| String concatenation (`&`)                           | **Like**, **Is**, **IsNot**           |            |
| Bitshift (`<<`, `>>`)                                |                                       |            |

Comparison operators all have equal precedence and evaluate left-to-right. Multiplication and division also evaluate left-to-right when they appear together, as do addition and subtraction. The `&` operator is not strictly arithmetic, but in precedence it follows all arithmetic operators and precedes all comparison operators.

The compound-assignment operators (`+=`, `-=`, `*=`, `/=`, `^=`, `&=`, `<<=`, `>>=`) appear only at statement level --- they are not part of any expression, so they do not participate in precedence.
