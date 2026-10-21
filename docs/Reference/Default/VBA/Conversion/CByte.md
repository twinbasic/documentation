---
title: CByte
parent: Conversion Module
permalink: /tB/Modules/Conversion/CByte
redirect_from:
-  /tB/Core/CByte
vba_attribution: true
---
# CByte
{: .no_toc }

Coerces an expression to a **Byte**.

Syntax: **CByte(** *expression* **)**

*expression*
: *required* Any valid string or numeric expression in the range `0` to `255`.

The return type is **Byte**. Fractions are rounded --- when the fractional part is exactly `0.5`, **CByte** rounds to the nearest even number.

<!-- errors: generated from errors/VBA.Conversion.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [6 (`&H6`)](tb:Errors#6), *Overflow* | *expression* rounds to a number less than 0 or greater than 255 |
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | *expression* is a string that does not hold a number (a zero-length string included) |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *expression* is **Null** |

<!-- /errors -->

### Example

This example uses the **CByte** function to convert an expression to a **Byte**.

```tb check_build
Dim MyDouble, MyByte
MyDouble = 125.5678          ' MyDouble is a Double.
MyByte = CByte(MyDouble)     ' MyByte contains 126.
```

### See Also

- [CBool](CBool), [CInt](CInt), [CLng](CLng), [CDbl](CDbl), [CSng](CSng), [CStr](CStr), [CVar](CVar) functions
