---
title: ITransformable
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/ITransformable
---

# ITransformable interface
{: .no_toc }

**ITransformable** is the set of members that classes with a changeable transformation matrix share.

It is implemented by [**Matrix**](Matrix), [**Graphics**](Graphics) (its world transformation), [**LinearGradientBrush**](LinearGradientBrush), [**PathGradientBrush**](PathGradientBrush) and [**TextureBrush**](TextureBrush). Code that only needs to move, scale, rotate or shear such an object can take an **ITransformable** and work with any of them. The classes also have these members under their own names; on **Matrix** they are shorter ([**Translate**](Matrix#translate) for **TranslateTransform**, and so on).

Every method combines a new transformation with the one the object already has. The *order* argument is a [**GpMatrixOrder**](Enumerations/GpMatrixOrder): with **MatrixOrderPrepend**, the default, the new transformation is applied to a point before the existing ones, and with **MatrixOrderAppend** after them. See [**Matrix**](Matrix) for the arithmetic.

Every method returns a [**GpStatus**](Enumerations/GpStatus), which is **Ok** when the call worked.

An object is used through the interface by assigning it to a variable of the interface type:

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(10!, 10!)
Dim g As Graphics = Graphics(bmp)
Dim m As Matrix = Matrix()

Dim t As ITransformable = m
t.TranslateTransform 5, 6
t.ScaleTransform 2, 2
Debug.Print m.OffsetX & " " & m.OffsetY               ' 5 6

Set t = g
t.TranslateTransform 7, 8
Dim w As Matrix = Matrix()
t.GetTransform w
Debug.Print w.OffsetX & " " & w.OffsetY               ' 7 8
```

## Transform
{: .no_toc }

Syntax: *object*.**Transform** **=** *matrix*

Replaces the whole transformation. Assigning copies the elements of *matrix* into the object, so a later change of *matrix* does not change the object.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim m As Matrix = Matrix()
Dim t As ITransformable = m
t.Transform = Matrix(3, 0, 0, 3, 0, 0)
Dim e() As Single = m.Elements
Debug.Print e(1) & " " & e(4)                        ' 3 3
```

<!-- test: Gr_MatrixTests.Transform_GetOnMatrix_ReturnsTheMatrix, Gr_MatrixTests.Transform_GetOnGraphics_ThroughTheInterface_ReturnsTheMatrix, Gr_MatrixTests.Transform_GetOnGradientBrush_ThroughTheInterface_ReturnsTheMatrix, Gr_MatrixTests.Transform_Let_CopiesTheMatrix, Gr_MatrixTests.GetTransform_OnGraphics_ThroughTheInterface_CopiesTheTransformation -->
> [!NOTE] 0.9.45.0
> Reading **Transform** does not work on any of the classes that implement the interface: the getter returns **Nothing**. On a **Graphics** and on the brushes it also records **InvalidParameter** in **LastResult**; on a **Matrix** it leaves **LastResult** as it was. Read the transformation with [**GetTransform**](#gettransform).

## GetTransform
{: .no_toc }

Syntax: *object*.**GetTransform(** *outMatrix* **)** **As GpStatus**

*outMatrix*
: *required* An existing **Matrix** that receives a copy of the transformation.

## ResetTransform
{: .no_toc }

Syntax: *object*.**ResetTransform** **As GpStatus**

Sets the transformation to the identity: no change to any point.

## MultiplyTransform
{: .no_toc }

Syntax: *object*.**MultiplyTransform(** *matrix*, [ *order* ] **)** **As GpStatus**

Combines *matrix* with the transformation of the object. On a **Matrix** this is [**Multiply**](Matrix#multiply).

## TranslateTransform
{: .no_toc }

Syntax: *object*.**TranslateTransform(** *dx*, *dy*, [ *order* ] **)** **As GpStatus**

Syntax: *object*.**TranslateTransform(** *delta*, [ *order* ] **)** **As GpStatus**

*dx*, *dy*
: *required* **Single** distances to move by along each axis.

*delta*
: *required* A [**GpPointF**](Types/GpPointF) that holds the two distances.

On a **Matrix** this is [**Translate**](Matrix#translate).

## ScaleTransform
{: .no_toc }

Syntax: *object*.**ScaleTransform(** *sx*, *sy*, [ *order* ] **)** **As GpStatus**

Scales the horizontal axis by *sx* and the vertical axis by *sy*. On a **Matrix** this is [**Scale**](Matrix#scale).

## RotateTransform
{: .no_toc }

Syntax: *object*.**RotateTransform(** *angle*, [ *order* ] **)** **As GpStatus**

Rotates by *angle* degrees about the origin. A positive angle turns clockwise where the y axis points down. On a **Matrix** this is [**Rotate**](Matrix#rotate).

## RotateTransformAt
{: .no_toc }

Syntax: *object*.**RotateTransformAt(** *angle*, *center*, [ *order* ] **)** **As GpStatus**

Rotates by *angle* degrees about *center*, a [**GpPointF**](Types/GpPointF) that stays where it is. On a **Matrix** this is [**RotateAt**](Matrix#rotateat).

## ShearTransform
{: .no_toc }

Syntax: *object*.**ShearTransform(** *shearX*, *shearY*, [ *order* ] **)** **As GpStatus**

Shears the axes. On a **Matrix** this is [**Shear**](Matrix#shear).

## See Also

- [Matrix](Matrix) class
- [Graphics](Graphics) class
- [GpMatrixOrder](Enumerations/GpMatrixOrder) enumeration
- [IDeviceContext](IDeviceContext) interface -- the other interface that **Graphics** implements
