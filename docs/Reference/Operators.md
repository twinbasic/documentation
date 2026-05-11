---
title: Operators
parent: Reference Section
nav_order: 4
has_toc: false
permalink: /Reference/Operators
---

# Operators

Operators built into the twinBASIC language. They are understood by the compiler and are not declared or defined in the runtime library.

> [!WARNING]
> Work in Progress

## Arithmetic

- [Mod](../tB/Core/Mod) -- divides two numbers and returns only the remainder

## Logical and Bitwise

Both operands are always evaluated.

- [And](../tB/Core/And) -- logical or bitwise conjunction
- [Or](../tB/Core/Or) -- logical or bitwise disjunction
- [Not](../tB/Core/Not) -- logical or bitwise negation

## Logical (Short-Circuit)

The right operand is evaluated only when the left operand does not already determine the result.

- [AndAlso](../tB/Core/AndAlso) -- (twinBASIC) short-circuit conjunction; evaluates the right operand only if the left is **True**
- [OrElse](../tB/Core/OrElse) -- (twinBASIC) short-circuit disjunction; evaluates the right operand only if the left is **False**

## Object Identity

- [Is](../tB/Core/Is) -- compares two object references for identity
- [IsNot](../tB/Core/IsNot) -- (twinBASIC) the logical inverse of **Is**

## Function Pointers

- [AddressOf](../tB/Core/AddressOf) -- produces a typed function-pointer to a procedure
