---
title: CByte
parent: Conversion Module
permalink: /tB/Modules/Conversion/CByte
redirect_from:
-  /tB/Core/CByte
---
# CByte
{: .no_toc }

Coerces an expression to a **Byte**.

Syntax: **CByte(** *expression* **)**

*expression*
: *required* Any valid string or numeric expression in the range `0` to `255`.

The return type is **Byte**. If *expression* is outside the range of a **Byte**, a run-time error occurs. Fractions are rounded — when the fractional part is exactly `0.5`, **CByte** rounds to the nearest even number.

### Example

This example uses the **CByte** function to convert an expression to a **Byte**.

```tb
Dim MyDouble, MyByte
MyDouble = 125.5678          ' MyDouble is a Double.
MyByte = CByte(MyDouble)     ' MyByte contains 126.
```

### See Also

- [CBool](CBool), [CInt](CInt), [CLng](CLng), [CDbl](CDbl), [CSng](CSng), [CStr](CStr), [CVar](CVar) functions

{% include VBA-Attribution.md %}
