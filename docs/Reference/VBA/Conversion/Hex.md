---
title: Hex
parent: Conversion Module
permalink: /tB/Modules/Conversion/Hex
redirect_from:
-  /tB/Core/Hex
---
# Hex, Hex$
{: .no_toc }

Returns a string representing the hexadecimal value of a number.

Syntax:

- **Hex$(** *number* **)**
- **Hex(** *number* **)**

*number*
: *required* Any valid numeric or string expression. If *number* is not a whole number, it is rounded to the nearest whole number before being evaluated.

The `$`-suffixed form returns a **String**; the unsuffixed form returns a **Variant** (**String**).

| If *number* is                  | Hex returns                     |
|---------------------------------|---------------------------------|
| -2,147,483,648 to 2,147,483,647 | Up to eight hexadecimal characters |
| **Null**                        | **Null** (unsuffixed form only) |
| **Empty**                       | Zero (`"0"`)                    |

For the opposite of **Hex**, precede a hexadecimal value with **&H**. For example, `Hex(255)` returns the string `"FF"` and `&HFF` returns the number 255.

### Example

This example uses the **Hex** function to return the hexadecimal value of a number.

```tb
Dim MyHex
MyHex = Hex(5)      ' Returns "5".
MyHex = Hex(10)     ' Returns "A".
MyHex = Hex(459)    ' Returns "1CB".
```

### See Also

- [Oct](Oct), [Str](Str) functions

{% include VBA-Attribution.md %}
