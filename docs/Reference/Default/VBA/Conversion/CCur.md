---
title: CCur
parent: Conversion Module
permalink: /tB/Modules/Conversion/CCur
redirect_from:
-  /tB/Core/CCur
vba_attribution: true
---
# CCur
{: .no_toc }

Coerces an expression to a **Currency**.

Syntax: **CCur(** *expression* **)**

*expression*
: *required* Any valid string or numeric expression in the range `-922,337,203,685,477.5808` to `922,337,203,685,477.5807`.

The return type is **Currency**.

**CCur** forces currency arithmetic in cases where single-precision, double-precision, or integer arithmetic would normally occur.

**CCur** is the internationally aware alternative to **Val** for converting between data types. **CCur** recognizes different decimal separators, different thousand separators, and various currency options properly, depending on the system's locale setting.

<!-- errors: generated from errors/VBA.Conversion.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [6 (`&H6`)](tb:Errors#6), *Overflow* | *expression* is less than -922,337,203,685,477.5808 or greater than 922,337,203,685,477.5807 |
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | *expression* is a string that does not hold a number (a zero-length string included) |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *expression* is **Null** |

<!-- /errors -->

### Example

This example uses the **CCur** function to convert an expression to a **Currency**.

```tb check_build
Dim MyDouble, MyCurr
MyDouble = 543.214588                    ' MyDouble is a Double.
MyCurr = CCur(MyDouble * 2)              ' Convert result of MyDouble * 2
                                         ' (1086.429176) to a
                                         ' Currency (1086.4292).
```

### See Also

- [CBool](CBool), [CByte](CByte), [CDbl](CDbl), [CDec](CDec), [CSng](CSng), [CStr](CStr), [CVar](CVar) functions
