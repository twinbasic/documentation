---
title: ValDec
parent: Conversion Module
permalink: /tB/Modules/Conversion/ValDec
redirect_from:
-  /tB/Core/ValDec
vba_attribution: true
---
# ValDec
{: .no_toc }

Returns the numbers contained in a string as a **Decimal** value.

Syntax: **ValDec(** *string* **)**

*string*
: *required* Any valid string expression.

The return type is **Decimal**.

> [!NOTE]
> **ValDec** is a twinBASIC extension. It behaves like [**Val**](Val) but returns a **Decimal** instead of a **Double**, preserving the full precision of values that **Val** would round.

The **ValDec** function follows the same parsing rules as [**Val**](Val): it stops reading the string at the first character that it can't recognize as part of a number, ignores blanks, tabs, and linefeed characters, and recognizes the radix prefixes `&O` (octal) and `&H` (hexadecimal).

> [!NOTE]
> **ValDec** recognizes only the period (`.`) as a valid decimal separator. When different decimal separators are used, as in international applications, use [**CDec**](CDec) instead.

### Example

This example uses the **ValDec** function to parse a string into a **Decimal**.

```tb
Dim MyDec As Decimal
MyDec = ValDec("123.4567890123456789")    ' Full precision retained.
```

### See Also

- [Val](Val), [CDec](CDec), [CDbl](CDbl) functions
