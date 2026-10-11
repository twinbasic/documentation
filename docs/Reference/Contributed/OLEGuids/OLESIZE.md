---
title: OLESIZE
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/OLESIZE
has_toc: false
---

# OLESIZE type
{: .no_toc }

A width and a height, with the layout of the Windows `SIZE` structure.

**OLESIZE** is a user-defined type declared in the package's `OLEGuids` module, so both `OLESIZE` and `OLEGuids.OLESIZE` name it. It mirrors the Windows structure [SIZE](https://learn.microsoft.com/en-us/windows/win32/api/windef/ns-windef-size).

```tb inert=signature
Public Type OLESIZE
    CX As Long
    CY As Long
End Type
```

## Fields

*CX*
: A **Long** holding the width.

*CY*
: A **Long** holding the height.

## Where it is used

No method of the package takes an **OLESIZE**. [**IOleInPlaceSite.Scroll**](IOleInPlaceSite#scroll) takes a `SIZE` by value, and declares the parameter as a **Currency**, which is the same eight bytes.

## See Also

- [OLEPOINT](OLEPOINT) type -- a point
- [OLERECT](OLERECT) type -- a rectangle
