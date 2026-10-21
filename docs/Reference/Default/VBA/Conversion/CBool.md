---
title: CBool
parent: Conversion Module
permalink: /tB/Modules/Conversion/CBool
redirect_from:
-  /tB/Core/CBool
vba_attribution: true
---
# CBool
{: .no_toc }

Coerces an expression to a **Boolean**.

Syntax: **CBool(** *expression* **)**

*expression*
: *required* Any valid string or numeric expression.

The return type is **Boolean**. If *expression* evaluates to a nonzero value, **CBool** returns **True**; otherwise, it returns **False**.

The data-type conversion functions document code by showing that the result of some operation should be expressed as a particular data type rather than the default data type.

<!-- errors: generated from errors/VBA.Conversion.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [6 (`&H6`)](tb:Errors#6), *Overflow* | *expression* is a string that holds a number outside the range of a **Double** |
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | *expression* is a string that is not a number, **True** or **False** (a zero-length string included) |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *expression* is **Null** |

<!-- /errors -->

### Example

This example uses the **CBool** function to convert an expression to a **Boolean**.

```tb check_build
Dim A, B, Check
A = 5: B = 5             ' Initialize variables.
Check = CBool(A = B)     ' Check contains True.

A = 0                    ' Define variable.
Check = CBool(A)         ' Check contains False.
```

### See Also

- [CByte](CByte), [CInt](CInt), [CLng](CLng), [CDbl](CDbl), [CSng](CSng), [CStr](CStr), [CVar](CVar) functions
