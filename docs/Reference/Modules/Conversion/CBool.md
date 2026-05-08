---
title: CBool
parent: Conversion Module
permalink: /tB/Modules/Conversion/CBool
redirect_from:
-  /tB/Core/CBool
---
# CBool
{: .no_toc }

Coerces an expression to a **Boolean**.

Syntax: **CBool(** *expression* **)**

*expression*
: *required* Any valid string or numeric expression.

The return type is **Boolean**. If *expression* evaluates to a nonzero value, **CBool** returns **True**; otherwise, it returns **False**.

If *expression* cannot be interpreted as a numeric value, a run-time error occurs.

In general, you can document your code using the data-type conversion functions to show that the result of some operation should be expressed as a particular data type rather than the default data type.

### Example

This example uses the **CBool** function to convert an expression to a **Boolean**.

```tb
Dim A, B, Check
A = 5: B = 5             ' Initialize variables.
Check = CBool(A = B)     ' Check contains True.

A = 0                    ' Define variable.
Check = CBool(A)         ' Check contains False.
```

### See Also

- [CByte](CByte), [CInt](CInt), [CLng](CLng), [CDbl](CDbl), [CSng](CSng), [CStr](CStr), [CVar](CVar) functions

{% include VBA-Attribution.md %}
