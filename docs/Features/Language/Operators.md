---
title: Operators
parent: Language Syntax
nav_order: 7
permalink: /Features/Language/Operators
---

# New Operators

twinBASIC introduces several new operators to enhance language capabilities. Reference pages for each individual operator live under [Reference → Operators](../../Reference/Operators).

## Bitshift Operators

[`<<`](../../tB/Core/LeftShift) and [`>>`](../../tB/Core/RightShift) perform left-shift and right-shift operations on a numeric variable. Note that shifts beyond available size result in 0, not wrapping.

## Short-Circuit Conditional Operators

### OrElse and AndAlso

With the regular [`Or`](../../tB/Core/Or) and [`And`](../../tB/Core/And) statements, both sides are evaluated, even when not necessary. With a short-circuit operator, if the condition is resolved by the first side, the other side is not evaluated. So if you have
`If Condition1 `[`OrElse`](../../tB/Core/OrElse)` Condition2 Then`, if `Condition1` is `True`, then `Condition2` will not be evaluated, and any code called by it will not run. The companion conjunction operator is [`AndAlso`](../../tB/Core/AndAlso).

### If() Operator

Short-circuit [`If()`](../../tB/Core/If) operator with syntax identical to the traditional [`IIf`](../../tB/Core/IIf). This has the additional benefit of not converting variables into a `Variant` if they're the same type; i.e. `If(condition, Long, Long)` the `Long` variables will never become a `Variant`.

## Assignment Operators

`+= -= /= \= *= ^= &= <<= >>=`

These are the equivalent of `var = var (operand) (var2)`. So `i += 1` is the equivalent of `i = i + 1`. See [Reference → Operators → Compound Assignment](../../Reference/Operators#compound-assignment) for the per-operator details.

## IsNot Operator

The logical opposite of the [`Is`](../../tB/Core/Is) operator for testing object equivalence. For example, instead of `If (object Is Nothing) = False` you could now write `If object `[`IsNot`](../../tB/Core/IsNot)` Nothing Then`.

