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

| If *number* is | Oct returns                     |
|----------------|---------------------------------|
| **Null**       | **Null** (unsuffixed form only) |
| **Empty**      | Zero (`"0"`)                    |
| Any other number | Up to 11 octal characters     |

Octal numbers can be represented directly by preceding numbers in the proper range with `&O`. For example, `&O10` is the octal notation for decimal 8.

### Example

This example uses the **Oct** function to return the octal value of a number.

```tb
Dim MyOct
MyOct = Oct(4)      ' Returns "4".
MyOct = Oct(8)      ' Returns "10".
MyOct = Oct(459)    ' Returns "713".
```

### See Also

- [Hex](Hex), [Str](Str) functions
