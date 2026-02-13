---
title: Operators
parent: Language Syntax
nav_order: 7
permalink: /Features/Language/Operators
---

# New Operators

twinBASIC introduces several new operators to enhance language capabilities.

## Bitshift Operators

`<<` and `>>` perform left-shift and right-shift operations on a numeric variable. Note that shifts beyond available size result in 0, not wrapping.

## Short-Circuit Conditional Operators

### OrElse and AndAlso

With the regular `Or` and `And` statements, both sides are evaluated, even when not necessary. With a short circuit operator, if the condition is resolved by the first side, the other side is not evaluated. So if you have:
`If Condition1 OrElse Condition2 Then`, if Condition1 is `True`, then `Condition2` will not be evaluated, and any code called by it will not run.

### If() Operator

Short-circuit `If()` operator with syntax identical to the tradition `IIf`. This has the additional benefit of not converting variables into a `Variant` if they're the same type; i.e. `If(condition, Long, Long)` the `Long` variables will never become a `Variant`.

## Assignment Operators

`+= -= /= *= ^= &= <<= >>=`

These are the equivalent of `var = var (operand) (var2)`. So `i += 1` is the equivalent of `i = i + 1`.

## IsNot Operator

The logical opposite of the *Is* operator for testing object equivalence. For example, instead of `If (object Is Nothing) = False` you could now write `If object IsNot Nothing Then`.

