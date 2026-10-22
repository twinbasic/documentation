---
title: Oct
parent: Conversion Module
permalink: /tB/Modules/Conversion/Oct
redirect_from:
-  /tB/Core/Oct
vba_attribution: true
---
# Oct, Oct$
{: .no_toc }

Returns a string representing the octal value of a number.

Syntax:

- **Oct$(** *number* **)**
- **Oct(** *number* **)**

*number*
: *required* Any valid numeric or string expression. If *number* is not a whole number, it is rounded to the nearest whole number before being evaluated.

The `$`-suffixed form returns a **String**; the unsuffixed form returns a **Variant** (**String**).

*number* can be any number in the range of a **LongLong**. The result has no leading zeros. A negative number gives its two's-complement form at the width of its data type:

| If *number* is                                  | Oct returns                     |
|-------------------------------------------------|---------------------------------|
| Zero or a positive number                       | The digits of its value, up to 21 characters |
| A negative **Integer**                          | 6 characters                    |
| A negative **Long**                             | 11 characters                   |
| A negative **LongLong**, **Single**, **Double**, **Currency** or **Decimal**, or a string holding a negative number | 22 characters |
| **Null**                                        | **Null** (unsuffixed form only) |
| **Empty**                                       | Zero (`"0"`)                    |

> [!NOTE]
> VB6's **Oct** takes only a number in the range of a **Long**, and raises error 6, *Overflow*, for any other. It gives a negative **Single**, **Double**, **Currency** or **Decimal**, or a string holding a negative number, the 11 characters of a **Long**: `Oct(-1#)` is `"37777777777"` in VB6 and `"1777777777777777777777"` in twinBASIC. 64-bit VBA takes the range of a **LongLong** and gives the 22 characters, as twinBASIC does.

> [!NOTE] BETA 1010
> A **Single** or **Double** of 2^62 (4,611,686,018,427,387,904) or more, or less than -2^62, raises error 6, *Overflow*, though its value fits a **LongLong**. A **LongLong**, **Decimal** or string of the same value is converted; so is `Oct(CLngLng(x))`. 64-bit VBA raises the same error.

Octal numbers can be represented directly by preceding numbers in the proper range with `&O`. For example, `&O10` is the octal notation for decimal 8.

<!-- errors: generated from errors/VBA.Conversion.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [6 (`&H6`)](tb:Errors#6), *Overflow* | *number* is outside the range of a **LongLong**, or is a **Single** or **Double** less than -4,611,686,018,427,387,904 or greater than 4,611,686,018,427,387,903 |
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | *number* is a string that does not hold a number (a zero-length string included) |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | **Oct$** is given a *number* that is **Null** |

<!-- /errors -->

### Example

This example uses the **Oct** function to return the octal value of a number.

```tb check_build
Dim MyOct
MyOct = Oct(4)      ' Returns "4".
MyOct = Oct(8)      ' Returns "10".
MyOct = Oct(459)    ' Returns "713".
```

### See Also

- [Bin](Bin), [Hex](Hex), [Str](Str) functions
