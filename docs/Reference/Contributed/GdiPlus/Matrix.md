---
title: Matrix
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Matrix
---

# Matrix class
{: .no_toc }

A **Matrix** holds a 3 by 3 affine transformation, which moves, scales, rotates or shears points.

An affine transformation always has the third column 0, 0, 1, so a **Matrix** stores only six numbers. They are written *m11*, *m12*, *m21*, *m22*, *dx* and *dy*, after the rows and columns they occupy:

| | | |
|:--:|:--:|:--:|
| *m11* | *m12* | 0 |
| *m21* | *m22* | 0 |
| *dx* | *dy* | 1 |

A point is a row vector (*x*, *y*, 1), multiplied by the matrix from the left. The transformed point is (*x* · *m11* + *y* · *m21* + *dx*, *x* · *m12* + *y* · *m22* + *dy*). The pair *dx*, *dy* is the translation. A matrix of 1, 0, 0, 1, 0, 0 is the identity: it leaves every point where it is.

A matrix is built by combining simple transformations with [**Translate**](#translate), [**Scale**](#scale), [**Rotate**](#rotate), [**RotateAt**](#rotateat), [**Shear**](#shear) and [**Multiply**](#multiply). Each takes an *order* of type [**GpMatrixOrder**](Enumerations/GpMatrixOrder): with **MatrixOrderPrepend**, the default, the new transformation is applied to a point before the transformations already in the matrix. With **MatrixOrderAppend** it is applied after them.

**Matrix** implements [**ITransformable**](ITransformable), so a matrix can be passed to code that transforms a [**Graphics**](Graphics) or a brush through that interface. The methods listed there under other names are the ones on this page: **Translate** is **TranslateTransform**, **Scale** is **ScaleTransform**, and so on.

Other classes take a **Matrix** to describe a transformation: [**GraphicsPath.Transform**](GraphicsPath#transform), [**Region.Transform**](Region#transform), and the **Transform** property of [**Graphics**](Graphics), [**Pen**](Pen) and the brushes.

Most members return a [**GpStatus**](Enumerations/GpStatus), which is **Ok** when the call worked. A property that fails records its status in **LastResult**, as every object of the package does. See [**GdiPlusBase**](GdiPlusBase).

## Creating
{: .no_toc }

Syntax: *matrix* **= Matrix(** [ *m11*, *m12*, *m21*, *m22*, *dx*, *dy* ] **)**

Syntax: *matrix* **= New Matrix(** [ *m11*, *m12*, *m21*, *m22*, *dx*, *dy* ] **)**

The function **Matrix** and **New Matrix** are the same thing, and take the same arguments.

With no arguments the matrix is the identity. With six arguments, each a **Single**, it holds those elements.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim m As Matrix = Matrix(2, 0, 0, 3, 10, 20)
Dim e() As Single = m.Elements
Debug.Print e(1) & " " & e(4) & " " & m.OffsetX & " " & m.OffsetY    ' 2 3 10 20
Dim id As Matrix = Matrix()
Debug.Print id.IsIdentity                                           ' True
```

Syntax: *matrix* **= Matrix(** *rect*, *point* **)**

*rect*
: *required* A [**GpRectF**](Types/GpRectF) or a [**GpRect**](Types/GpRect).

*point*
: *required* A [**GpPointF**](Types/GpPointF) for a **GpRectF**, a [**GpPoint**](Types/GpPoint) for a **GpRect**.

In GDI+ this constructor maps a rectangle to a parallelogram, and the parallelogram is given by three points: the images of the top-left, top-right and bottom-left corners of the rectangle. The package takes one point where GDI+ reads three.

> [!WARNING] 0.9.45.0
> The constructors that take a rectangle and a point give a matrix whose elements depend on whatever memory follows the point. The call does not report an error. Use the six-number constructor, or build the matrix with [**Translate**](#translate), [**Scale**](#scale) and the other methods.

## Elements and offset

### Elements
{: .no_toc }

Syntax: *matrix*.**Elements** **As Single()**

Syntax: *matrix*.**Elements** **=** *elts*

The six elements as an array, in the order *m11*, *m12*, *m21*, *m22*, *dx*, *dy*. The array that is read has indexes 1 to 6.

To set the elements, assign an array of exactly six **Single** values; its lower bound does not matter. An array of another length leaves the matrix as it was and records **InvalidParameter** in **LastResult**.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim m As Matrix = Matrix()
Dim f(1 To 6) As Single
f(1) = 1: f(2) = 2: f(3) = 3: f(4) = 4: f(5) = 5: f(6) = 6
m.Elements = f
Dim e() As Single = m.Elements
Debug.Print e(2) & " " & e(5)                         ' 2 5
Dim bad(1 To 3) As Single
m.Elements = bad
Debug.Print m.LastResult                              ' 2
```

### GetElements
{: .no_toc }

Syntax: *matrix*.**GetElements(** *elts*() **)** **As GpStatus**

Syntax: *matrix*.**GetElements(** [ *m11*, *m12*, *m21*, *m22*, *dx*, *dy* ] **)** **As GpStatus**

*elts*
: *required* An array of **Single** with room for six elements, starting at its lower bound. Nothing checks its size.

*m11* to *dy*
: *optional* **Single** variables that receive the elements. Leave out the ones that are not wanted.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim m As Matrix = Matrix(1, 2, 3, 4, 5, 6)
Dim a As Single, d As Single, tx As Single
m.GetElements a, , , d, tx
Debug.Print a & " " & d & " " & tx                    ' 1 4 5
Dim g(0 To 5) As Single
m.GetElements g
Debug.Print g(0) & " " & g(5)                         ' 1 6
```

### SetElements
{: .no_toc }

Syntax: *matrix*.**SetElements(** *m11*, *m12*, *m21*, *m22*, *dx*, *dy* **)** **As GpStatus**

Sets the six elements.

### OffsetX, OffsetY and Offset
{: .no_toc }

Syntax: *matrix*.**OffsetX** [ **=** *value* ]

Syntax: *matrix*.**OffsetY** [ **=** *value* ]

Syntax: *matrix*.**Offset** [ **=** *point* ]

The translation elements *dx* and *dy*. **OffsetX** and **OffsetY** are **Single** values. **Offset** is a [**GpPointF**](Types/GpPointF) holding both.

> [!WARNING] 0.9.45.0
> Assigning **OffsetX** sets *dx* and sets *dy* to 0. Assigning **OffsetY** does not change *dy* to the value: it sets *dx* to the value and *dy* to 0. Reading all three properties is correct, and so is assigning **Offset**. To change one offset, assign **Offset**, or call **SetElements**.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim m As Matrix = Matrix(1, 0, 0, 1, 3, 4)
m.Offset = GpPointF(m.OffsetX, 9)
Debug.Print m.OffsetX & " " & m.OffsetY               ' 3 9
```

### Clone
{: .no_toc }

Syntax: *matrix*.**Clone** **As Matrix**

Returns a new matrix with the same elements. Changing one does not change the other.

### SetFrom and GetTo
{: .no_toc }

Syntax: *matrix*.**SetFrom(** *input* **)** **As GpStatus**

Syntax: *matrix*.**GetTo(** *output* **)** **As GpStatus**

**SetFrom** copies the elements of *input* into this matrix. **GetTo** copies the elements of this matrix into *output*, which must be an existing **Matrix**. **GetTo** is the **GetTransform** method of [**ITransformable**](ITransformable#gettransform).

### IsIdentity, IsInvertible and IsEqualTo
{: .no_toc }

Syntax: *matrix*.**IsIdentity** **As Boolean**

Syntax: *matrix*.**IsInvertible** **As Boolean**

Syntax: *matrix*.**IsEqualTo(** *other* **)** **As Boolean**

**IsIdentity** is **True** when the matrix leaves every point unchanged. **IsInvertible** is **True** when the matrix has an inverse, which is when its determinant, *m11* · *m22* - *m12* · *m21*, is not 0. **IsEqualTo** compares all six elements with those of *other*.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim m As Matrix = Matrix(2, 0, 0, 2, 0, 0)
Dim z As Matrix = Matrix(0, 0, 0, 0, 0, 0)
Debug.Print m.IsIdentity & " " & m.IsInvertible & " " & z.IsInvertible    ' False True False
Debug.Print m.IsEqualTo(m.Clone)                                          ' True
```

## Building a transformation

### Reset
{: .no_toc }

Syntax: *matrix*.**Reset** **As GpStatus**

Sets the matrix to the identity. It is **ResetTransform** of [**ITransformable**](ITransformable#resettransform).

### Translate
{: .no_toc }

Syntax: *matrix*.**Translate(** *dx*, *dy*, [ *order* ] **)** **As GpStatus**

Syntax: *matrix*.**Translate(** *offset*, [ *order* ] **)** **As GpStatus**

*dx*, *dy*
: *required* **Single** distances to move by along each axis.

*offset*
: *required* A [**GpPointF**](Types/GpPointF) that holds the two distances.

*order*
: *optional* A [**GpMatrixOrder**](Enumerations/GpMatrixOrder), **MatrixOrderPrepend** by default.

Combines a translation with the matrix.

### Scale
{: .no_toc }

Syntax: *matrix*.**Scale(** *sx*, *sy*, [ *order* ] **)** **As GpStatus**

*sx*, *sy*
: *required* **Single** factors for the horizontal and vertical axes. A negative factor mirrors.

*order*
: *optional* A [**GpMatrixOrder**](Enumerations/GpMatrixOrder), **MatrixOrderPrepend** by default.

Combines a scaling with the matrix.

> [!WARNING] BETA 1005
> A call of **Scale** written as a statement, with its arguments in parentheses and without **Call**, does nothing and raises no error: `m.Scale(2, 3)` leaves the matrix as it was. The same call written `m.Scale 2, 3`, `Call m.Scale(2, 3)` or `status = m.Scale(2, 3)` works. This is the case for a method of any class that is named **Scale**.

### Rotate
{: .no_toc }

Syntax: *matrix*.**Rotate(** *angle*, [ *order* ] **)** **As GpStatus**

*angle*
: *required* A **Single** angle in degrees. A positive angle turns clockwise on a surface whose y axis points down, as the screen's does.

*order*
: *optional* A [**GpMatrixOrder**](Enumerations/GpMatrixOrder), **MatrixOrderPrepend** by default.

Combines a rotation about the origin with the matrix. The elements are *m11* = cos *angle*, *m12* = sin *angle*, *m21* = -sin *angle* and *m22* = cos *angle*, so the elements of a rotation by 90 degrees differ from 0 and 1 by a rounding error of about 10^-7.

### RotateAt
{: .no_toc }

Syntax: *matrix*.**RotateAt(** *angle*, *center*, [ *order* ] **)** **As GpStatus**

*angle*
: *required* A **Single** angle in degrees.

*center*
: *required* A [**GpPointF**](Types/GpPointF), the point that stays where it is.

*order*
: *optional* A [**GpMatrixOrder**](Enumerations/GpMatrixOrder), **MatrixOrderPrepend** by default.

Combines a rotation about *center* with the matrix. It moves *center* to the origin, rotates, and moves it back.

### Shear
{: .no_toc }

Syntax: *matrix*.**Shear(** *shearX*, *shearY*, [ *order* ] **)** **As GpStatus**

*shearX*, *shearY*
: *required* **Single** shear factors. *shearX* adds *shearX* times *y* to every *x*. *shearY* adds *shearY* times *x* to every *y*.

*order*
: *optional* A [**GpMatrixOrder**](Enumerations/GpMatrixOrder), **MatrixOrderPrepend** by default.

Combines a shear with the matrix.

### Multiply
{: .no_toc }

Syntax: *matrix*.**Multiply(** *other*, [ *order* ] **)** **As GpStatus**

*other*
: *required* The **Matrix** to combine with this one.

*order*
: *optional* A [**GpMatrixOrder**](Enumerations/GpMatrixOrder), **MatrixOrderPrepend** by default.

With **MatrixOrderPrepend**, the matrix becomes *other* · *matrix*: a point goes through *other* first. With **MatrixOrderAppend**, it becomes *matrix* · *other*.

The order decides what a sequence of calls means:

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim a As Matrix = Matrix()
a.Translate 10, 20
a.Scale 2, 3                                      ' prepend: the scaling is applied first
Dim pt As GpPointF = GpPointF(1, 1)
a.TransformPoint pt
Debug.Print pt.X & " " & pt.Y                     ' 12 23

Dim b As Matrix = Matrix()
b.Translate 10, 20
b.Scale 2, 3, MatrixOrderAppend                   ' append: the scaling is applied last
pt = GpPointF(1, 1)
b.TransformPoint pt
Debug.Print pt.X & " " & pt.Y                     ' 22 63
```

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim m As Matrix = Matrix()
m.RotateAt 90, GpPointF(10, 10)                   ' turn about (10, 10)
Dim pt As GpPointF = GpPointF(10, 10)
m.TransformPoint pt
Debug.Print Round(pt.X, 3) & " " & Round(pt.Y, 3) ' 10 10
pt = GpPointF(20, 10)
m.TransformPoint pt
Debug.Print Round(pt.X, 3) & " " & Round(pt.Y, 3) ' 10 20
```

## Inverting

### Invert
{: .no_toc }

Syntax: *matrix*.**Invert** **As GpStatus**

Replaces the matrix with its inverse, which undoes the transformation. When the matrix is not invertible, the call returns **InvalidParameter** and leaves the matrix as it was.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim m As Matrix = Matrix(2, 0, 0, 4, 6, 8)
Dim inv As Matrix = m.Clone
Debug.Print inv.Invert                            ' 0
Dim pt As GpPointF = GpPointF(10, 20)
m.TransformPoint pt
inv.TransformPoint pt
Debug.Print pt.X & " " & pt.Y                     ' 10 20
Dim z As Matrix = Matrix(0, 0, 0, 0, 0, 0)
Debug.Print z.Invert                              ' 2
```

## Transforming points

### TransformPoint and TransformPoints
{: .no_toc }

Syntax: *matrix*.**TransformPoint(** *pt* **)** **As GpStatus**

Syntax: *matrix*.**TransformPoints(** *pts*() **)** **As GpStatus**

*pt*
: *required* A [**GpPointF**](Types/GpPointF) or a [**GpPoint**](Types/GpPoint) variable. The call replaces it with the transformed point.

*pts*
: *required* An array of **GpPointF** or **GpPoint**. The call replaces every element.

The translation elements apply. The integer overloads round the result to whole numbers.

### VectorTransformPoint and VectorTransformPoints
{: .no_toc }

Syntax: *matrix*.**VectorTransformPoint(** *pt* **)** **As GpStatus**

Syntax: *matrix*.**VectorTransformPoints(** *pts*() **)** **As GpStatus**

As **TransformPoint** and **TransformPoints**, but the translation is left out: *dx* and *dy* are taken as 0. Use them for a direction or a distance, which a move does not change.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim m As Matrix = Matrix(2, 0, 0, 3, 10, 20)
Dim pts(1 To 2) As GpPointF
pts(1) = GpPointF(0, 0): pts(2) = GpPointF(2, 2)
m.TransformPoints pts
Debug.Print pts(1).X & "," & pts(1).Y & " " & pts(2).X & "," & pts(2).Y     ' 10,20 14,26
Dim v As GpPointF = GpPointF(1, 1)
m.VectorTransformPoint v
Debug.Print v.X & "," & v.Y                                                 ' 2,3
```

## Example

This example draws a rectangle turned by 45 degrees about its centre. It builds the matrix with **RotateAt**, applies it to a path and reads two pixels back. The first is covered by the turned rectangle, so its green value is 0. The second is covered only by the unturned rectangle, so it is still white.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(40!, 40!)
Dim g As Graphics = Graphics(bmp)
g.Clear Color(255, 255, 255, 255)

Dim path As GraphicsPath = GraphicsPath()
path.AddRectangle 8, 14, 24, 12
Dim m As Matrix = Matrix()
m.RotateAt 45, GpPointF(20, 20)
path.Transform m

Dim sb As SolidBrush = New SolidBrush(Color(255, 255, 0, 0))
g.FillPath sb, path
Debug.Print Hex$(bmp.Pixel(27, 27).G)         ' 0
Debug.Print Hex$(bmp.Pixel(31, 15).G)         ' FF
```

## See Also

- [ITransformable](ITransformable) interface -- the members that **Matrix** shares with **Graphics** and the brushes
- [GraphicsPath](GraphicsPath) class -- **Transform** applies a matrix to a path
- [Region](Region) class -- **Transform** applies a matrix to a region
- [GpMatrixOrder](Enumerations/GpMatrixOrder) enumeration
- [Matrix class](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusmatrix/nl-gdiplusmatrix-matrix) -- Microsoft's documentation of the GDI+ class
