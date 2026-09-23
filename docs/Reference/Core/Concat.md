---
title: "&, &="
parent: Operators
grand_parent: Reference Section
permalink: /tB/Core/Concat
vba_attribution: true
---
# & and &= operators
{: .no_toc }

Used to force string concatenation of two expressions. The compound form **&=** concatenates-and-assigns in one step.

Syntax:
> *result* **=** *expression1* **&** *expression2*  
> *variable* **&=** *expression*       *(twinBASIC)*

*result*
: Any **String** or **Variant** variable.

*variable*
: *(twinBASIC)* Any **String** or **Variant** variable, or any writable property of those types.

*expression*, *expression1*, *expression2*
: Any expressions.

If an *expression* is not a string, it is converted to a **String**. The data type of *result* is **String** when neither *expression* is a **Variant**, whatever their types --- `3 & 4` is the **String** `"34"`. When either *expression* is a **Variant**, *result* is a **Variant** containing a **String**. See [Result types and promotion](../../Reference/Operators#result-types-and-promotion) for the arithmetic operators.

If both expressions are **Null**, *result* is **Null**. However, if only one *expression* is **Null**, that expression is treated as a zero-length string (`""`) when concatenated with the other expression. Any expression that is **Empty** is also treated as a zero-length string.

Prefer **&** over [**+**](Plus) for joining strings: **+** is also the addition operator, so its meaning depends on the operand types and can silently switch between arithmetic and concatenation. **&** is unambiguous --- it always concatenates.

> [!NOTE]
> When **&** immediately follows a variable name (for example `x&`), it is parsed as the **Long** type-suffix on the identifier rather than the concatenation operator. Always put a space before **&** when concatenating: `Result = x & y`, not `Result = x& y`.

### Compound assignment

`x &= y` is the twinBASIC shorthand for `x = x & y`. *y* is converted to **String** before being appended; if both sides are already **String**, the result stays **String**. **&=** is a statement, not an expression --- it does not produce a value.

```tb check_build
Dim Path As String = "C:\Users"
Path &= "\Public"               ' Path is now "C:\Users\Public".
Path &= "\Documents"            ' Path is now "C:\Users\Public\Documents".
```

### Example

This example uses the **&** operator to force string concatenation.

```tb check_build
Dim MyStr
MyStr = "Hello" & " World"          ' Returns "Hello World".
MyStr = "Check " & 123 & " Check"   ' Returns "Check 123 Check".
```

### See Also

- [**+** operator](Plus)
- [Operators](../../Reference/Operators)
