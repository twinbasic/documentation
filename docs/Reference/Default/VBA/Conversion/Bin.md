---
title: Bin
parent: Conversion Module
permalink: /tB/Modules/Conversion/Bin
---
# Bin, Bin$
{: .no_toc }

Returns a string representing the binary value of a number.

Syntax:

- **Bin$(** *number* **)**
- **Bin(** *number* **)**

*number*
: *required* Any valid numeric or string expression. If *number* is not a whole number, it is rounded to the nearest whole number before being evaluated; a value halfway between two whole numbers goes to the even one.

The `$`-suffixed form returns a **String**; the unsuffixed form returns a **Variant** (**String**).

> [!NOTE]
> VBA and VB6 have no **Bin** function. Code that calls it does not compile there.

The result holds only the digits `0` and `1`, with no leading zeros and no prefix. A positive number gives the digits of its value. A negative number gives its two's-complement form at the width of its data type:

| If *number* is                                  | Bin returns                                   |
|-------------------------------------------------|-----------------------------------------------|
| Zero or a positive number                       | The digits of its value                       |
| A negative **Integer**                          | 16 characters                                 |
| A negative **Long**                             | 32 characters                                 |
| A negative **LongLong** or **Double**           | 64 characters                                 |
| **Null**                                        | **Null** (unsuffixed form only)               |
| **Empty**                                       | `"0"`                                         |

**Bin** accepts the same arguments as [**Hex**](Hex) and [**Oct**](Oct) and returns the same value in a different base. A string that holds a number, including one written with the `&H` or `&O` prefix, is converted as the number. A string that does not hold a number (an empty string, or one with the `&B` prefix, included) raises error 13, *Type mismatch*. A **Double** too large for a **LongLong** raises error 6, *Overflow*. `Bin$(Null)` raises error 94, *Invalid use of Null*.

For the opposite of **Bin**, precede a binary value with **&B**: `&B101` is the number 5 (see [Literals](../../../Features/Language/Literals)).

### Example

This example uses the **Bin** function to return the binary value of numbers of several types.

```tb check_run
Debug.Print Bin(5)             ' 101
Debug.Print Bin$(255)          ' 11111111
Debug.Print Bin(5.5)           ' 110
Debug.Print Bin("&HFF")        ' 11111111
Debug.Print Bin(CInt(-1))      ' 1111111111111111
Debug.Print Bin(CLng(-1))      ' 11111111111111111111111111111111
Debug.Print Bin(0)             ' 0
```

### See Also

- [Hex](Hex), [Oct](Oct), [Str](Str) functions
