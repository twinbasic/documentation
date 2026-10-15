---
title: GpMatrixOrder
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpMatrixOrder
---

# GpMatrixOrder enumeration
{: .no_toc }

Selects the order of multiplication when a new transformation is combined with an existing one.

Each transformation method takes an *order* argument that defaults to **MatrixOrderPrepend**. The order matters because matrix multiplication does not commute: translating then scaling gives a different result than scaling then translating.

| Member | Value | Description |
|:-------|:------|:------------|
| **MatrixOrderPrepend**{: #MatrixOrderPrepend } | `0` | The new transformation is applied before the existing one. The new matrix is the left operand. |
| **MatrixOrderAppend**{: #MatrixOrderAppend } | `1` | The new transformation is applied after the existing one. The new matrix is the right operand. |

## Used by

- [**Graphics**](../Graphics) class: [**MultiplyTransform**](../Graphics#multiplytransform), [**RotateTransform**](../Graphics#rotatetransform), [**RotateTransformAt**](../Graphics#rotatetransformat), [**ScaleTransform**](../Graphics#scaletransform), [**ShearTransform**](../Graphics#sheartransform), [**TranslateTransform**](../Graphics#translatetransform)
- [**ITransformable**](../ITransformable) interface: [**MultiplyTransform**](../ITransformable#multiplytransform), [**RotateTransform**](../ITransformable#rotatetransform), [**RotateTransformAt**](../ITransformable#rotatetransformat), [**ScaleTransform**](../ITransformable#scaletransform), [**ShearTransform**](../ITransformable#sheartransform), [**TranslateTransform**](../ITransformable#translatetransform)
- [**LinearGradientBrush**](../LinearGradientBrush) class: [**MultiplyTransform**](../LinearGradientBrush#multiplytransform), [**RotateTransform**](../LinearGradientBrush#rotatetransform), [**RotateTransformAt**](../LinearGradientBrush#rotatetransformat), [**ScaleTransform**](../LinearGradientBrush#scaletransform), [**ShearTransform**](../LinearGradientBrush#sheartransform), [**TranslateTransform**](../LinearGradientBrush#translatetransform)
- [**Matrix**](../Matrix) class: [**Multiply**](../Matrix#multiply), [**Rotate**](../Matrix#rotate), [**RotateAt**](../Matrix#rotateat), [**Scale**](../Matrix#scale), [**Shear**](../Matrix#shear), [**Translate**](../Matrix#translate)
- [**PathGradientBrush**](../PathGradientBrush) class: [**MultiplyTransform**](../PathGradientBrush#multiplytransform), [**RotateTransform**](../PathGradientBrush#rotatetransform), [**RotateTransformAt**](../PathGradientBrush#rotatetransformat), [**ScaleTransform**](../PathGradientBrush#scaletransform), [**ShearTransform**](../PathGradientBrush#sheartransform), [**TranslateTransform**](../PathGradientBrush#translatetransform)
- [**Pen**](../Pen) class: [**MultiplyTransform**](../Pen#multiplytransform), [**RotateTransform**](../Pen#rotatetransform), [**ScaleTransform**](../Pen#scaletransform), [**TranslateTransform**](../Pen#translatetransform)
- [**TextureBrush**](../TextureBrush) class: [**MultiplyTransform**](../TextureBrush#multiplytransform), [**RotateTransform**](../TextureBrush#rotatetransform), [**RotateTransformAt**](../TextureBrush#rotatetransformat), [**ScaleTransform**](../TextureBrush#scaletransform), [**ShearTransform**](../TextureBrush#sheartransform), [**TranslateTransform**](../TextureBrush#translatetransform)

## Example

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

' Translate by (10, 20), then scale by (2, 3).
Dim before As Matrix = Matrix()
before.Translate 10, 20
before.Scale 2, 3, MatrixOrderPrepend
Debug.Print before.OffsetX, before.OffsetY

Dim after As Matrix = Matrix()
after.Translate 10, 20
after.Scale 2, 3, MatrixOrderAppend
Debug.Print after.OffsetX, after.OffsetY
' Output:
' 10            20
' 20            60
```

With **MatrixOrderPrepend** the scaling is applied to a point before the translation, so the translation is unchanged. With **MatrixOrderAppend** the scaling is applied after the translation, so it scales the offset too.

## See Also

- [MatrixOrder](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-matrixorder) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Graphics](../Graphics) class
- [ITransformable](../ITransformable) interface
- [LinearGradientBrush](../LinearGradientBrush) class
- [Matrix](../Matrix) class
