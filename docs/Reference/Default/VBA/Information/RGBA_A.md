---
title: RGBA_A
parent: Information Module
permalink: /tB/Modules/Information/RGBA_A
---
# RGBA_A
{: .no_toc }

Returns the alpha component (as an **Integer**) from a given RGBA colour value.

Syntax: **RGBA_A(** *RGBA* **)**

*RGBA*
: *required* A **Long** RGBA colour value, of the kind returned by [**RGBA**](RGBA).

The return value is the alpha (opacity) component in the range 0--255: **0** is fully transparent and **255** is fully opaque.

<!-- errors: generated from errors/VBA.Information.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *RGBA* is **Null** |

<!-- /errors -->

### Example

This example extracts the alpha component from a colour built with **RGBA**.

```tb check_build
Dim MyColor As Long
Dim AlphaComponent As Integer
MyColor = RGBA(255, 0, 0, 128)
AlphaComponent = RGBA_A(MyColor)      ' Returns 128.
```

### See Also

- [RGBA](RGBA), [RGB](RGB) functions
- [RGB_R](RGB_R), [RGB_G](RGB_G), [RGB_B](RGB_B) functions
