---
title: RGB
parent: Information Module
permalink: /tB/Modules/Information/RGB
redirect_from:
-  /tB/Core/RGB
vba_attribution: true
---
# RGB
{: .no_toc }

Returns a **Long** representing an RGB colour value.

Syntax: **RGB(** *red* **,** *green* **,** *blue* **)**

*red*
: *required* A number in the range 0--255 representing the red component of the colour.

*green*
: *required* A number in the range 0--255 representing the green component of the colour.

*blue*
: *required* A number in the range 0--255 representing the blue component of the colour.

Application methods and properties that accept a colour specification expect a number representing an RGB colour value: the relative intensity of red, green, and blue that produces a particular shade. The value of any argument that exceeds 255 is treated as 255.

The following table lists some standard colours and the red, green, and blue values they include:

| Colour | Red | Green | Blue |
|--------|-----|-------|------|
| Black | 0 | 0 | 0 |
| Blue | 0 | 0 | 255 |
| Green | 0 | 255 | 0 |
| Cyan | 0 | 255 | 255 |
| Red | 255 | 0 | 0 |
| Magenta | 255 | 0 | 255 |
| Yellow | 255 | 255 | 0 |
| White | 255 | 255 | 255 |

### Example

This example uses **RGB** to construct several colour values.

```tb
Dim Red As Long, RGBValue As Long, I As Long
Red = RGB(255, 0, 0)                  ' Pure red.
I = 75
RGBValue = RGB(I, 64 + I, 128 + I)    ' Same as RGB(75, 139, 203).
```

### See Also

- [RGBA](RGBA) function
- [RGB_R](RGB_R), [RGB_G](RGB_G), [RGB_B](RGB_B) functions
- [QBColor](QBColor), [TranslateColor](TranslateColor) functions
