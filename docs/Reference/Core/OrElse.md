---
title: OrElse
parent: Operators
grand_parent: Reference Section
permalink: /tB/Core/OrElse
---
# OrElse operator
{: .no_toc }

Performs a short-circuit logical disjunction of two **Boolean** expressions. If the left operand evaluates to **True**, the right operand is not evaluated.

> [!NOTE]
> **OrElse** is a twinBASIC extension. The classic [**Or**](Or) operator always evaluates both operands and returns a bitwise result; **OrElse** evaluates the right operand only when needed and always returns a **Boolean**.

Syntax:
> *result* **=** *expression1* **OrElse** *expression2*

*result*
: A **Boolean** variable.

*expression1*, *expression2*
: Any expressions that evaluate to **Boolean** (or are coercible to **Boolean**).

If *expression1* is **True**, *result* is **True** and *expression2* is not evaluated. Otherwise *expression2* is evaluated and its **Boolean** value becomes *result*.

This is the standard "short-circuit OR". It is useful when *expression2* is more expensive to evaluate, or when *expression2* would fail or have unwanted side effects in the case where *expression1* is already **True**.

### Example

Skipping an expensive lookup when a cheaper test already proves the condition:

```tb
If IsCached(key) OrElse FetchFromDisk(key) Then
    ' FetchFromDisk is only called when IsCached returned False.
    Process key
End If
```

Compare with the equivalent code using **Or**, which would always call `FetchFromDisk` even when the cached lookup already succeeded:

```tb
' Inefficient - FetchFromDisk runs even when IsCached returned True.
If IsCached(key) Or FetchFromDisk(key) Then
    Process key
End If
```

### See Also

- [**AndAlso** operator](AndAlso)
- [**Or** operator](Or)
- [Operators](../../Reference/Operators)
