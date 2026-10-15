---
title: BlurParams
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/BlurParams
---

# BlurParams type
{: .no_toc }

The parameters of a [**Blur**](../Blur) effect: the radius and whether the blur spreads past the edges.

The type mirrors the GDI+ [BlurParams](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/ns-gdipluseffects-blurparams) structure. A **Blur** takes it in its constructor and in its **Parameters** property.

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **radius** | **Single** | The blur radius in pixels, from 0 to 255. |
| **expandEdge** | a Boolean-like enumeration | Whether the blur spreads beyond the edges of the picture. 0 is false, and any other value is true. |

## Creating

Syntax: *params* **= BlurParams**( *radius*, *expandEdge* )

*radius*
: *required* A **Single** for **radius**.

*expandEdge*
: *required* A **Boolean** for **expandEdge**. **True** is stored as -1.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim p As BlurParams = BlurParams(2.5!, True)
Debug.Print p.radius & " " & p.expandEdge

Dim fx As Blur = Blur(p)
Debug.Print fx.LastResult
' Output:
' 2.5 -1
' 0
```

## See Also

- [BlurParams](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/ns-gdipluseffects-blurparams) -- Microsoft's documentation of the GDI+ structure
- [Blur](../Blur) class
