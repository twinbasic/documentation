---
title: Val
parent: Conversion Module
permalink: /tB/Modules/Conversion/Val
redirect_from:
-  /tB/Core/Val
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

```tb
Val("    1615 198th Street N.E.")
```

In the following code, **Val** returns the decimal value `-1` for the hexadecimal value shown:

```tb
Val("&HFFFF")
```

> [!NOTE]
> The **Val** function recognizes only the period (`.`) as a valid decimal separator. When different decimal separators are used, as in international applications, use [**CDbl**](CDbl) instead to convert a string to a number.

> [!NOTE]
> The **Val** function recognizes deprecated data type suffixes prior to conversion and may result in a type-mismatch error. For example, fifty percent represented as the string `"50%"` will convert as expected to `50`, but `Val("50.5%")` will raise an error because the percent symbol is interpreted as a suffix declaring the data type as **Integer**, which it is not in this case. The full list of data type suffixes is **Single** (`!`), **Currency** (`@`), **Double** (`#`), **String** (`$`), **Integer** (`%`), **Long** (`&`), and **LongLong** (`^`) for 64-bit hosts.

### Example

This example uses the **Val** function to return the numbers contained in a string.

```tb
Dim MyValue
MyValue = Val("2457")        ' Returns 2457.
MyValue = Val(" 2 45 7")     ' Returns 2457.
MyValue = Val("24 and 57")   ' Returns 24.
```

### See Also

- [ValDec](ValDec), [CDbl](CDbl), [CDec](CDec), [Str](Str) functions

{% include VBA-Attribution.md %}
