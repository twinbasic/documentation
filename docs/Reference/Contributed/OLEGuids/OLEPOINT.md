---
title: OLEPOINT
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/OLEPOINT
has_toc: false
---

# OLEPOINT type
{: .no_toc }

A point, with the layout of the Windows `POINT` structure.

**OLEPOINT** is a user-defined type declared in the package's `OLEGuids` module, so both `OLEPOINT` and `OLEGuids.OLEPOINT` name it. It mirrors the Windows structure [POINT](https://learn.microsoft.com/en-us/windows/win32/api/windef/ns-windef-point).

```tb inert=signature
Public Type OLEPOINT
    X As Long
    Y As Long
End Type
```

## Fields

*X*
: A **Long** holding the x coordinate.

*Y*
: A **Long** holding the y coordinate.

## Where it is used

It is the type of the *PT* field of [OLEACCELMSG](OLEACCELMSG). No method of the package takes an **OLEPOINT** by name. [**IOleControlSite.TransformCoords**](IOleControlSite#transformcoords) takes a pointer to a `POINTL` structure, which has the same two **Long** fields, so the address of an **OLEPOINT** variable fits its *pPtlHimetric* parameter.

## See Also

- [OLEACCELMSG](OLEACCELMSG) type -- a window message
- [OLERECT](OLERECT) type -- a rectangle
- [OLESIZE](OLESIZE) type -- a width and a height
