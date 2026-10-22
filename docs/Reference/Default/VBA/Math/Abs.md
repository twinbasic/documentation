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

<!-- errors: generated from errors/VBA.Math.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [6 (`&H6`)](tb:Errors#6), *Overflow* | *number* is a **Currency** of -922,337,203,685,477.5808 |

> [!NOTE] BETA 1010
> When *number* is an **Integer** of -32,768 or a **Long** of -2,147,483,648 (twinBASIC returns a **Long** or a **Double**), VB6 raises error [6 (`&H6`)](tb:Errors#6), *Overflow*; twinBASIC raises none.

<!-- /errors -->

### Example

This example uses the **Abs** function to compute the absolute value of a number.

```tb check_build
Dim MyNumber
MyNumber = Abs(50.3)    ' Returns 50.3.
MyNumber = Abs(-50.3)    ' Returns 50.3.
```

### See Also

- [Sgn](Sgn) function
