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

*(twinBASIC)* On the integral types --- **Byte**, **Integer**, **Long**, **LongLong** and **LongPtr** --- shifts are *logical*: vacated bits are filled with zero, and a shift by the operand's width or more yields `0` rather than wrapping. Each operator's page describes what happens with other operand types and with constant operands.

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

## Result Types and Promotion

The type of an arithmetic result depends only on the types of the operands, never on the variable that receives it. With `Count` declared **As Integer**, `Total = Count * 1000` multiplies two **Integer** values --- the literal `1000` is an **Integer** too --- and raises error 6, *Overflow*, once the product passes 32,767, even when `Total` is a **Long**. Writing `Count * 1000&` makes it a **Long** multiplication.

### Declared types

For `+`, `-` and `*`, the result has the type of whichever operand ranks higher:

**Byte** < **Integer** < **Long** < **LongLong** < **Single** < **Double** < **Currency** < **Decimal**

with these exceptions:

- A **Boolean** counts as an **Integer**. A **String** counts as a **Double** and is converted to a number, except that `+` joins two **String** operands instead of adding them.
- A **Single** combined with a **Long** or **LongLong** gives a **Double**.
- For `*` only, **Single** and **Double** rank above **Currency**: `Currency * Double` and `Currency * Single` are **Double**.
- A **Date** under `+` or `-` gives a **Date**, and a **Date** minus a **Date** gives a **Double**, the number of days between them. Under `*`, a **Date** counts as a **Double**. A **Decimal** outranks a **Date** under all three.
- **LongPtr** is **Long** in a 32-bit build and **LongLong** in a 64-bit build, and ranks as that type.

The other operators:

| Operator | Result type |
|:---------|:------------|
| `/` | **Decimal** if either operand is **Decimal**; otherwise **Single** if one operand is **Single** and the other is **Byte**, **Integer**, **Boolean** or **Single**; otherwise **Double** |
| `\`, `Mod` | **Decimal** if either operand is **Decimal**; otherwise **LongLong** if either is **LongLong**; otherwise **Byte** if both are **Byte**, **Integer** if both are **Byte**, **Integer** or **Boolean**, and **Long** in every other case. The operands are rounded to whole numbers first, and a value exactly halfway goes to the even neighbour: `6.5 \ 2` is 3 and `7.5 \ 2` is 4 |
| `^` | **Double**, whatever the operand types |
| `&` | **String** |
| unary `-` | the operand's own type, except **Integer** for a **Byte** or **Boolean** and **Double** for a **String** |

A result that does not fit its type raises error 6, *Overflow*, with one exception described under [the **\\** operator](../tB/Core/IntegerDivide). Some combinations that matter when porting code:

| Expression | Result |
|:-----------|:-------|
| **Decimal** `*` **Integer** | **Decimal** |
| **Decimal** `+` **Double** | **Decimal** |
| **Currency** `+` **Double** | **Currency** |
| **Currency** `*` **Double** | **Double** |
| **Currency** `/` **Currency** | **Double** |
| **Integer** `/` **Integer** | **Double** |
| **Integer** `*` **Integer** | **Integer**, which overflows past 32,767 |
| **Single** `+` **Long** | **Double** |
| **Date** `+` **Integer** | **Date** |
| **String** `+` **Integer** | **Double**: `"34" + 6` is 40 |

### Variant operands

When either operand is a **Variant**, the result is a **Variant**, and the value it holds has the type the rules above give for the values the operands hold: a **Variant** holding a **Decimal** times an **Integer** holds a **Decimal**. The differences:

- **A result that does not fit is widened instead of raising an error** under `+`, `-`, `*`, `/` and unary `-`. It moves along **Byte**, **Integer**, **Long**, **Double** to the first type that holds it --- `255 * 255` held in **Byte** variants is a **Long** 65,025 --- and a **LongLong**, **Single** or **Date** result becomes a **Double**. So an **Integer** variable holding 32,767 plus a **Variant** holding 1 is a **Long** 32,768, where the same variable plus the literal `1` raises error 6. **Double**, **Currency** and **Decimal** results still raise error 6.
- `\` and `Mod` treat a **Decimal** as a **Long** when either operand is a **Variant**, so the result is a **Long** (a **LongLong** beside a **LongLong**). Declared **Decimal** operands give a **Decimal**.
- **Empty** counts as 0, or as a zero-length string when it is joined to a **String**. `Empty + x` is *x*, except that a **Boolean** becomes an **Integer**.
- **Null** as either operand makes the result **Null**. Under `&`, **Null** counts as a zero-length string unless both operands are **Null**.

> [!NOTE]
> **LongLong** and **Decimal** take part in these rules in every twinBASIC build. **LongLong** exists in 32-bit builds as well, and **Decimal** can be a declared type, so an expression of declared types can have a **Decimal** result. VBA has **LongLong** only in 64-bit builds, and **Decimal** only inside a **Variant**.
