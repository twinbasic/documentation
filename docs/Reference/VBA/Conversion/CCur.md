---
title: CCur
parent: Conversion Module
permalink: /tB/Modules/Conversion/CCur
redirect_from:
-  /tB/Core/CCur
---
# CCur
{: .no_toc }

Coerces an expression to a **Currency**.

Syntax: **CCur(** *expression* **)**

*expression*
: *required* Any valid string or numeric expression in the range `-922,337,203,685,477.5808` to `922,337,203,685,477.5807`.

The return type is **Currency**. If *expression* is outside that range, a run-time error occurs.

Use **CCur** to force currency arithmetic in cases where single-precision, double-precision, or integer arithmetic normally would occur.

You should use **CCur** instead of **Val** to provide internationally aware conversions from one data type to another. **CCur** recognizes different decimal separators, different thousand separators, and various currency options properly, depending on the locale setting of your computer.

### Example

This example uses the **CCur** function to convert an expression to a **Currency**.

```tb
Dim MyDouble, MyCurr
MyDouble = 543.214588                    ' MyDouble is a Double.
MyCurr = CCur(MyDouble * 2)              ' Convert result of MyDouble * 2
                                         ' (1086.429176) to a
                                         ' Currency (1086.4292).
```

### See Also

- [CBool](CBool), [CByte](CByte), [CDbl](CDbl), [CDec](CDec), [CSng](CSng), [CStr](CStr), [CVar](CVar) functions

{% include VBA-Attribution.md %}
