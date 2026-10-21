---
title: CSng
parent: Conversion Module
permalink: /tB/Modules/Conversion/CSng
redirect_from:
-  /tB/Core/CSng
vba_attribution: true
---
# CSng
{: .no_toc }

Coerces an expression to a **Single**.

Syntax: **CSng(** *expression* **)**

*expression*
: *required* Any valid string or numeric expression in the **Single** range --- `-3.402823E38` to `-1.401298E-45` for negative values, and `1.401298E-45` to `3.402823E38` for positive values.

The return type is **Single**.

**CSng** is the internationally aware alternative to [**Val**](Val) for converting a string to a numeric type.

<!-- errors: generated from errors/VBA.Conversion.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [6 (`&H6`)](tb:Errors#6), *Overflow* | *expression* is less than -3.402823E38 or greater than 3.402823E38 |
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | *expression* is a string that does not hold a number (a zero-length string included) |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *expression* is **Null** |

<!-- /errors -->

### Example

This example uses the **CSng** function to convert values to a **Single**.

```tb check_build
Dim MyDouble1, MyDouble2, MySingle1, MySingle2
' MyDouble1, MyDouble2 are Doubles.
MyDouble1 = 75.3421115: MyDouble2 = 75.3421555
MySingle1 = CSng(MyDouble1)              ' MySingle1 contains 75.34211.
MySingle2 = CSng(MyDouble2)              ' MySingle2 contains 75.34216.
```

### See Also

- [CBool](CBool), [CByte](CByte), [CCur](CCur), [CDbl](CDbl), [CDec](CDec), [CInt](CInt), [CLng](CLng), [CStr](CStr), [CVar](CVar) functions
