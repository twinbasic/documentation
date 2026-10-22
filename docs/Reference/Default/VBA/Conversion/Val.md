---
title: Val
parent: Conversion Module
permalink: /tB/Modules/Conversion/Val
redirect_from:
-  /tB/Core/Val
vba_attribution: true
---
# Val
{: .no_toc }

Returns the numbers contained in a string as a numeric value of appropriate type.

Syntax: **Val(** *string* **)**

*string*
: *required* Any valid string expression.

The return type is **Double**.

The **Val** function stops reading the string at the first character that it can't recognize as part of a number. Symbols and characters that are often considered parts of numeric values, such as dollar signs and commas, are not recognized.

However, the function recognizes the radix prefixes `&O` (for octal) and `&H` (for hexadecimal). Blanks, tabs, and linefeed characters are stripped from the argument.

The following returns the value `1615198`:

```tb check_build
Val("    1615 198th Street N.E.")
```

In the following code, **Val** returns the decimal value `-1` for the hexadecimal value shown:

```tb check_build
Val("&HFFFF")
```

> [!NOTE]
> The **Val** function recognizes only the period (`.`) as a valid decimal separator. When different decimal separators are used, as in international applications, use [**CDbl**](CDbl) instead to convert a string to a number.

> [!NOTE]
> The **Val** function reads a data type suffix after a number as the number's type. Fifty percent written as `"50%"` converts to `50`, but the `%` of `"50.5%"` declares an **Integer**, which `50.5` is not (see Common Errors below). The full list of data type suffixes is **Single** (`!`), **Currency** (`@`), **Double** (`#`), **String** (`$`), **Integer** (`%`), **Long** (`&`), and **LongLong** (`^`) for 64-bit hosts.

<!-- errors: generated from errors/VBA.Conversion.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [6 (`&H6`)](tb:Errors#6), *Overflow* | *string* holds a number outside the range of a **Double** |
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | *string* holds a number with a fractional part followed by the **Integer** (`%`) or **Long** (`&`) type-declaration character, such as `"50.5%"` |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *string* is **Null** |

> [!NOTE] BETA 1010
> When **Val** is given a *string* that holds a number followed by the **Integer** (`%`), **Long** (`&`) or **Currency** (`@`) type-declaration character, and the number is outside the range of that type, VB6 and 64-bit VBA raise error [6 (`&H6`)](tb:Errors#6), *Overflow*; twinBASIC raises none.

<!-- /errors -->

### Example

This example uses the **Val** function to return the numbers contained in a string.

```tb check_build
Dim MyValue
MyValue = Val("2457")        ' Returns 2457.
MyValue = Val(" 2 45 7")     ' Returns 2457.
MyValue = Val("24 and 57")   ' Returns 24.
```

### See Also

- [ValDec](ValDec), [CDbl](CDbl), [CDec](CDec), [Str](Str) functions
