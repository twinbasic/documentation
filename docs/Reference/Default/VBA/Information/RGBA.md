---
title: RGBA
parent: Information Module
permalink: /tB/Modules/Information/RGBA
---
# RGBA
{: .no_toc }

Returns a **Long** representing an RGBA colour value, packing red, green, blue, and alpha components into a single 32-bit value.

Syntax: **RGBA(** *red* **,** *green* **,** *blue* **,** *alpha* **)**

*red*
: *required* A number in the range 0--255 representing the red component of the colour.

*green*
: *required* A number in the range 0--255 representing the green component of the colour.

*blue*
: *required* A number in the range 0--255 representing the blue component of the colour.

*alpha*
: *required* A number in the range 0--255 representing the alpha (opacity) component of the colour. **0** is fully transparent; **255** is fully opaque.

**RGBA** extends [**RGB**](RGB) with an alpha channel for use with APIs that accept transparency. The component values can be read back with [**RGB_R**](RGB_R), [**RGB_G**](RGB_G), [**RGB_B**](RGB_B), and [**RGBA_A**](RGBA_A).

### Example

This example uses **RGBA** to build a semi-transparent red.

```tb
Dim TranslucentRed As Long
TranslucentRed = RGBA(255, 0, 0, 128)
```

### See Also

- [RGB](RGB) function
- [RGB_R](RGB_R), [RGB_G](RGB_G), [RGB_B](RGB_B), [RGBA_A](RGBA_A) functions
