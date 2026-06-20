---
title: RGB_G
parent: Information Module
permalink: /tB/Modules/Information/RGB_G
---
# RGB_G
{: .no_toc }

Returns the green component (as an **Integer**) from a given RGBA colour value.

Syntax: **RGB_G(** *RGBA* **)**

*RGBA*
: *required* A **Long** RGBA colour value, of the kind returned by [**RGB**](RGB) or [**RGBA**](RGBA).

The return value is the green component in the range 0--255.

### Example

This example extracts the green component from a colour built with **RGB**.

```tb
Dim MyColor As Long
Dim GreenComponent As Integer
MyColor = RGB(75, 125, 255)
GreenComponent = RGB_G(MyColor)       ' Returns 125.
```

### See Also

- [RGB](RGB), [RGBA](RGBA) functions
- [RGB_R](RGB_R), [RGB_B](RGB_B), [RGBA_A](RGBA_A) functions
