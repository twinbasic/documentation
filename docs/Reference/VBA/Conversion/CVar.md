---
title: CVar
parent: Conversion Module
permalink: /tB/Modules/Conversion/CVar
redirect_from:
-  /tB/Core/CVar
vba_attribution: true
---
# CVar
{: .no_toc }

Coerces an expression to a **Variant**.

Syntax: **CVar(** *expression* **)**

*expression*
: *required* Any valid expression. The acceptable range is the same as **Double** for numerics, and the same as **String** for non-numerics.

The return type is **Variant**.

### Example

This example uses the **CVar** function to convert an expression to a **Variant**.

```tb
Dim MyInt, MyVar
MyInt = 4534                             ' MyInt is an Integer.
MyVar = CVar(MyInt & 000)                ' MyVar contains the string "4534000".
```

### See Also

- [CBool](CBool), [CByte](CByte), [CCur](CCur), [CDate](CDate), [CDbl](CDbl), [CInt](CInt), [CLng](CLng), [CSng](CSng), [CStr](CStr) functions
- [CVDate](CVDate), [CVErr](CVErr) functions
