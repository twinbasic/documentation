---
title: IsNumeric
parent: Information Module
permalink: /tB/Modules/Information/IsNumeric
redirect_from:
-  /tB/Core/IsNumeric
vba_attribution: true
---
# IsNumeric
{: .no_toc }

Returns a **Boolean** indicating whether an expression can be evaluated as a number.

Syntax: **IsNumeric(** *expression* **)**

*expression*
: *required* A **Variant** containing a numeric or string expression.

**IsNumeric** returns **True** if the entire *expression* is recognized as a number; otherwise, **False**.

**IsNumeric** returns **False** if *expression* is a date expression.

### Example

This example uses **IsNumeric** to determine whether a variable can be evaluated as a number.

```tb
Dim MyVar As Variant
Dim MyCheck As Boolean
MyVar = "53"
MyCheck = IsNumeric(MyVar)            ' Returns True.

MyVar = "459.95"
MyCheck = IsNumeric(MyVar)            ' Returns True.

MyVar = "45 Help"
MyCheck = IsNumeric(MyVar)            ' Returns False.
```

### See Also

- [CDbl](../Conversion/CDbl), [CDec](../Conversion/CDec) functions
- [IsDate](IsDate) function
- [Val](../Conversion/Val) function
