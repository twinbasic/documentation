---
title: RGB_R
parent: Information Module
permalink: /tB/Modules/Information/RGB_R
---
# RGB_R
{: .no_toc }

Returns the red component (as an **Integer**) from a given RGBA colour value.

Syntax: **RGB_R(** *RGBA* **)**

*RGBA*
: *required* A **Long** RGBA colour value, of the kind returned by [**RGB**](RGB) or [**RGBA**](RGBA).

The return value is the red component in the range 0–255.

### Example

This example extracts the red component from a colour built with **RGB**.

```tb
Dim MyColor As Long
Dim RedComponent As Integer
MyColor = RGB(255, 100, 150)
RedComponent = RGB_R(MyColor)         ' Returns 255.
```

### See Also

- [RGB](RGB), [RGBA](RGBA) functions
- [RGB_G](RGB_G), [RGB_B](RGB_B), [RGBA_A](RGBA_A) functions
