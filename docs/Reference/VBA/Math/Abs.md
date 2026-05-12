---
title: Abs
parent: Math Module
permalink: /tB/Modules/Math/Abs
vba_attribution: true
---
# Abs
{: .no_toc }

Returns a value of the same type that is passed to it specifying the absolute value of a number.

Syntax: **Abs(** *number* **)**

*number*
: *required* Any valid numeric expression. If *number* contains **Null**, **Null** is returned; if it is an uninitialized variable, zero is returned.

The absolute value of a number is its unsigned magnitude. For example, `Abs(-1)` and `Abs(1)` both return `1`.

### Example

This example uses the **Abs** function to compute the absolute value of a number.

```tb
Dim MyNumber
MyNumber = Abs(50.3)    ' Returns 50.3.
MyNumber = Abs(-50.3)    ' Returns 50.3.
```

### See Also

- [Sgn](Sgn) function
