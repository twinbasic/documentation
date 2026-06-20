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

### Example

```tb
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
