---
title: Round
parent: Math Module
permalink: /tB/Modules/Math/Round
vba_attribution: true
---
# Round
{: .no_toc }

Returns a number rounded to a specified number of decimal places.

Syntax: **Round(** *expression* [ **,** *numdecimalplaces* ] **)**

*expression*
: *required* Numeric expression being rounded.

*numdecimalplaces*
: *optional* Number indicating how many places to the right of the decimal are included in the rounding. If omitted, integers are returned by the **Round** function.

> [!NOTE]
> **Round** uses banker's rounding (round half to even): when the value is exactly half-way between two possible rounded results, it rounds toward the nearest even digit. For example, `Round(0.5, 0)` returns `0`, and `Round(1.5, 0)` returns `2`.

<!-- errors: generated from errors/VBA.Math.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument* | *numdecimalplaces* rounds to a negative number<br>*numdecimalplaces* is greater than 22 and *expression* is a **Single**, **Double** or **Date**, or a string |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *numdecimalplaces* is **Null** |

> [!NOTE] BETA 1010
> When *expression* is **Null** and *numdecimalplaces* is negative, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*; twinBASIC raises none.

<!-- /errors -->

### Example

```tb check_build
Debug.Print Round(0.12335, 4)    ' 0.1234
Debug.Print Round(0.12345, 4)    ' 0.1234
Debug.Print Round(0.12355, 4)    ' 0.1236
Debug.Print Round(0.12365, 4)    ' 0.1236
Debug.Print Round(0.00005, 4)    ' 0
```

### See Also

- [Int](../Conversion/Int) function
- [Fix](../Conversion/Fix) function
- [CInt](../Conversion/CInt) function
- [CLng](../Conversion/CLng) function
