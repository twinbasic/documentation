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
| A negative **LongLong**, **Single**, **Double**, **Currency** or **Decimal**, or a string holding a negative number | 64 characters |
| **Null**                                        | **Null** (unsuffixed form only)               |
| **Empty**                                       | `"0"`                                         |

**Bin** accepts the same arguments as [**Hex**](Hex) and [**Oct**](Oct) and returns the same value in a different base. A string that holds a number, including one written with the `&H` or `&O` prefix, is converted as the number.

> [!NOTE]
> A **Single** or **Double** of 2^62 (4,611,686,018,427,387,904) or more, or less than -2^62, raises error 6, *Overflow*, though its value fits a **LongLong**, as it does in **Hex** and **Oct**. A **LongLong**, **Decimal** or string of the same value is converted; so is `Bin(CLngLng(x))`.

For the opposite of **Bin**, precede a binary value with **&B**: `&B101` is the number 5 (see [Literals](../../../Features/Language/Literals)).

<!-- errors: generated from errors/VBA.Conversion.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [6 (`&H6`)](tb:Errors#6), *Overflow* | *number* is outside the range of a **LongLong**, or is a **Single** or **Double** less than -4,611,686,018,427,387,904 or greater than 4,611,686,018,427,387,903 |
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | *number* is a string that does not hold a number (a zero-length string, and one with the `&B` prefix, included) |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | **Bin$** is given a *number* that is **Null** |

<!-- /errors -->

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
