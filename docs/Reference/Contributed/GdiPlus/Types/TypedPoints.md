---
title: TypedPoints
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/TypedPoints
---

# TypedPoints type
{: .no_toc }

An array of typed points with the number of points that were copied into it.

[**PathIterator.Enumerate**](../PathIterator#enumerate) returns a **TypedPoints**.

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **points** | [**TypedPoint**](TypedPoint)() | The points and their types, with indexes from 1. |
| **resultCount** | **Long** | The number of points copied. It is the same as the upper bound of **points**. |

```tb check_build
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
Dim pts(1 To 3) As GpPointF
pts(1) = GpPointF(0, 0): pts(2) = GpPointF(10, 0): pts(3) = GpPointF(10, 10)
p.AddLines pts

Dim it As PathIterator = PathIterator(p)
Dim all As TypedPoints = it.Enumerate()
Dim i As Long
For i = 1 To all.resultCount
    Debug.Print all.points(i).pos.X & "," & all.points(i).pos.Y
Next
' 0,0
' 10,0
' 10,10
```

## See Also

- [TypedPoint](TypedPoint) type
- [PathIterator](../PathIterator) class
