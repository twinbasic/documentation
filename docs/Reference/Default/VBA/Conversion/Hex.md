---
title: Hex
parent: Conversion Module
permalink: /tB/Modules/Conversion/Hex
redirect_from:
-  /tB/Core/Hex
vba_attribution: true
---
# Hex, Hex$
{: .no_toc }

Returns a string representing the hexadecimal value of a number.

Syntax:

- **Hex$(** *number* **)**
- **Hex(** *number* **)**

*number*
: *required* Any valid numeric or string expression. If *number* is not a whole number, it is rounded to the nearest whole number before being evaluated.

The `$`-suffixed form returns a **String**; the unsuffixed form returns a **Variant** (**String**).

*number* can be any number in the range of a **LongLong**. The result has no leading zeros. A negative number gives its two's-complement form at the width of its data type:

| If *number* is                                  | Hex returns                     |
|-------------------------------------------------|---------------------------------|
| Zero or a positive number                       | The digits of its value, up to 16 characters |
| A negative **Integer**                          | 4 characters                    |
| A negative **Long**                             | 8 characters                    |
| A negative **LongLong**, **Single**, **Double**, **Currency** or **Decimal**, or a string holding a negative number | 16 characters |
| **Null**                                        | **Null** (unsuffixed form only) |
| **Empty**                                       | Zero (`"0"`)                    |

> [!NOTE]
> VB6's **Hex** takes only a number in the range of a **Long**, and raises error 6, *Overflow*, for any other. It gives a negative **Single**, **Double**, **Currency** or **Decimal**, or a string holding a negative number, the eight characters of a **Long**: `Hex(-1#)` is `"FFFFFFFF"` in VB6 and `"FFFFFFFFFFFFFFFF"` in twinBASIC.

> [!NOTE] BETA 1010
> A **Single** or **Double** of 2^62 (4,611,686,018,427,387,904) or more, or less than -2^62, raises error 6, *Overflow*, though its value fits a **LongLong**. A **LongLong**, **Decimal** or string of the same value is converted; so is `Hex(CLngLng(x))`.

For the opposite of **Hex**, precede a hexadecimal value with **&H**. For example, `Hex(255)` returns the string `"FF"` and `&HFF` returns the number 255.

<!-- errors: generated from errors/VBA.Conversion.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [6 (`&H6`)](tb:Errors#6), *Overflow* | *number* is outside the range of a **LongLong**, or is a **Single** or **Double** less than -4,611,686,018,427,387,904 or greater than 4,611,686,018,427,387,903 |
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | *number* is a string that does not hold a number (a zero-length string included) |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | **Hex$** is given a *number* that is **Null** |

<!-- /errors -->

### Example

This example uses the **Hex** function to return the hexadecimal value of a number.

```tb check_build
Dim MyHex
MyHex = Hex(5)      ' Returns "5".
MyHex = Hex(10)     ' Returns "A".
MyHex = Hex(459)    ' Returns "1CB".
```

### See Also

- [Bin](Bin), [Oct](Oct), [Str](Str) functions
