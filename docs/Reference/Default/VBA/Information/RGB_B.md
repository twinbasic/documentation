---
title: RGB_B
parent: Information Module
permalink: /tB/Modules/Information/RGB_B
---
# RGB_B
{: .no_toc }

Returns the blue component (as an **Integer**) from a given RGBA colour value.

Syntax: **RGB_B(** *RGBA* **)**

*RGBA*
: *required* A **Long** RGBA colour value, of the kind returned by [**RGB**](RGB) or [**RGBA**](RGBA).

The return value is the blue component in the range 0--255.

<!-- errors: generated from errors/VBA.Information.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *RGBA* is **Null** |

<!-- /errors -->

### Example

This example extracts the blue component from a colour built with **RGB**.

```tb check_build
Dim MyColor As Long
Dim BlueComponent As Integer
MyColor = RGB(210, 45, 200)
BlueComponent = RGB_B(MyColor)        ' Returns 200.
```

### See Also

- [RGB](RGB), [RGBA](RGBA) functions
- [RGB_R](RGB_R), [RGB_G](RGB_G), [RGBA_A](RGBA_A) functions
