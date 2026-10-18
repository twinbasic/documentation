---
title: PathGradientBrush
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/PathGradientBrush
---

# PathGradientBrush class
{: .no_toc }

A brush that fills a shape with a colour that changes from a centre point to the edge of a path.

A **PathGradientBrush** implements [**IBrush**](IBrush) and [**ITransformable**](ITransformable). It is made from a closed path, either a list of points or a [**GraphicsPath**](GraphicsPath). The centre colour is at the centre point of the path, the surround colours are on its boundary, and the colour between them changes at a constant rate. Where the brush is used outside its path, the [wrap mode](#wrapmode) says what is drawn. The class mirrors the GDI+ [PathGradientBrush](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusbrush/nl-gdiplusbrush-pathgradientbrush) class.

* TOC
{:toc}

## Creating

Syntax: *brush* **= PathGradientBrush**( *points* [, *wrapMode*] )

Syntax: *brush* **= PathGradientBrush**( *path* )

Each form can also be written with **New**: *brush* **= New PathGradientBrush**( ... ). The two are one thing.

*points*
: *required* An array of **GpPointF** or of **GpPoint**: the corners of the path. The array can start at any index.

*wrapMode*
: *optional* A [**GpWrapMode**](Enumerations/GpWrapMode) value for what is drawn outside the path. The default is **WrapModeClamp**.

*path*
: *required* A [**GraphicsPath**](GraphicsPath) whose figure is the shape of the gradient.

A new brush has the centre point at the centroid of the path and a black centre colour. Set the colours before the brush is used.

<!-- test: Br_GradientBrushTests.Path_New_SinglePoint_ReportsTheFailure, Br_GradientBrushTests.Path_New_SinglePoint_LaterCallsFailWithInvalidParameter -->
> [!NOTE] 0.9.45.0
> The form with points does not report a failure. A list that GDI+ cannot use, such as a single point, gives a brush whose **LastResult** is **Ok**; every later call on it fails with **InvalidParameter**.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim corners(0 To 3) As GpPointF
corners(0) = GpPointF(0, 0): corners(1) = GpPointF(10, 0)
corners(2) = GpPointF(10, 10): corners(3) = GpPointF(0, 10)

Dim brush As PathGradientBrush = New PathGradientBrush(corners)
brush.CenterColor = Color(255, 255, 255, 255)

Dim edge(1 To 1) As Color
edge(1) = Color(255, 0, 0, 0)
brush.SurroundColors = edge

Dim bmp As Bitmap = Bitmap(10!, 10!)
Dim g As Graphics = Graphics(bmp)
g.FillRectangle(brush, 0, 0, 10, 10)

Debug.Print brush.PointCount & " " & brush.CenterPoint.X & " " & brush.CenterPoint.Y
Debug.Print Hex$(bmp.Pixel(0, 5).R) & " " & Hex$(bmp.Pixel(2, 5).R) & " " & Hex$(bmp.Pixel(5, 5).R)
' Output:
' 4 5 5
' 0 6A FF
```

### Clone

Syntax: *copy* **=** *brush*.**Clone**( )

Returns a new **PathGradientBrush** with the same path, colours, blend, transformation and wrap mode.

## Colours

### CenterColor

Syntax: *brush*.**CenterColor** [ **=** *color* ]

Gets or sets the colour at the centre point, as a **Color**.

### CenterRGB

Syntax: *brush*.**CenterRGB** = *rgb*

Sets the centre colour from a **Long**, as `&H00RRGGBB`. The property cannot be read.

<!-- test: Br_BrushColourTests.PathGradientBrush_CenterRGB_VBColour_UsesThatColour -->
> [!WARNING] 0.9.45.0
> **CenterRGB** reads its **Long** as `&H00RRGGBB`, not as a VB colour, and the alpha is always 255: `vbRed` gives blue. [**IBrush**](IBrush#colours) lists what else is not translated. Use [**CenterColor**](#centercolor).

### SurroundColors

Syntax: *brush*.**SurroundColors** = *colors*

<!-- test: Br_GradientBrushTests.Path_SurroundColors_OneColourPaintsTheWholeBoundary, Br_GradientBrushTests.Path_SurroundColors_TooManyColours_IsRefused -->
Sets the colours of the boundary. *colors* is an array of **Color**. One colour is used for the whole boundary. A longer array gives each point its own colour, in the order of the points the brush was made from, and the colour between two points changes along the boundary. The array must not have more elements than the path has points.
<!-- /test -->

<!-- test: Br_GradientBrushTests.Path_SurroundColors_Get_ReturnsWhatWasSet -->
> [!WARNING] 0.9.45.0
> Reading **SurroundColors** stops the program with a stack overflow. Keep the array that was set.

### SurroundColorCount

Syntax: *count* **=** *brush*.**SurroundColorCount**

Returns the number of surround colours, which is the number of points of the path.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim corners(0 To 3) As GpPointF
corners(0) = GpPointF(0, 0): corners(1) = GpPointF(10, 0)
corners(2) = GpPointF(10, 10): corners(3) = GpPointF(0, 10)

Dim brush As PathGradientBrush = New PathGradientBrush(corners)
brush.CenterColor = Color(255, 255, 0, 0)

Dim edge(1 To 4) As Color
edge(1) = Color(255, 0, 0, 0)
edge(2) = Color(255, 0, 255, 0)
edge(3) = Color(255, 0, 0, 255)
edge(4) = Color(255, 255, 255, 255)
brush.SurroundColors = edge
Debug.Print brush.LastResult & " " & brush.SurroundColorCount

Dim bmp As Bitmap = Bitmap(10!, 10!)
Dim g As Graphics = Graphics(bmp)
g.FillRectangle(brush, 0, 0, 10, 10)
Debug.Print Hex$(bmp.Pixel(0, 0).argb) & " " & Hex$(bmp.Pixel(5, 5).argb)
' Output:
' 0 4
' FF000000 FFFF0000
```

## The path

### PointCount

Syntax: *count* **=** *brush*.**PointCount**

<!-- test: Br_GradientBrushTests.Path_FromGraphicsPath_CountsAllThePoints -->
Returns the number of points of the path. For a brush made from a path, these are all the points of the path, the control points of its curves included.
<!-- /test -->

### GraphicsPath

Syntax: *brush*.**GraphicsPath** [ **=** *path* ]

Gets or sets the path of the brush as a [**GraphicsPath**](GraphicsPath).

<!-- test: Br_GradientBrushTests.Path_GraphicsPath_Get_IsNotImplemented, Br_GradientBrushTests.Path_GraphicsPath_Let_IsNotImplemented -->
> [!NOTE] 0.9.45.0
> Reading and writing fail: GDI+ answers **NotImplemented**. Reading returns **Nothing**.

### CenterPoint, CenterPointI

Syntax: *brush*.**CenterPoint** [ **=** *point* ]

Syntax: *brush*.**CenterPointI** [ **=** *point* ]

Get or set the point that has the centre colour, as a **GpPointF** and as a **GpPoint**. The point can be moved anywhere inside the path.

### Rectangle, RectangleI

Syntax: *rect* **=** *brush*.**Rectangle**

Syntax: *rect* **=** *brush*.**RectangleI**

Return the bounding rectangle of the path, as a **GpRectF** and as a **GpRect**.

### FocusScales

Syntax: *brush*.**SetFocusScales**( *xScale*, *yScale* )

Syntax: *brush*.**GetFocusScales**( *xScale*, *yScale* )

<!-- test: Br_GradientBrushTests.Path_FocusScales_AndCenterPoint_RoundTrip -->
Set or read the focus scales, two **Single** values. The centre colour is not at one point only: it fills a copy of the path that is shrunk about the centre point by *xScale* across and *yScale* down, and the colour changes between that copy and the boundary. The default is 0, one point. Both methods return a [**GpStatus**](Enumerations/GpStatus); **GetFocusScales** puts its results in the two variables.
<!-- /test -->

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim corners(0 To 3) As GpPointF
corners(0) = GpPointF(0, 0): corners(1) = GpPointF(10, 0)
corners(2) = GpPointF(10, 10): corners(3) = GpPointF(0, 10)

Dim brush As PathGradientBrush = New PathGradientBrush(corners)
brush.CenterColor = Color(255, 255, 255, 255)
Dim edge(1 To 1) As Color
edge(1) = Color(255, 0, 0, 0)
brush.SurroundColors = edge

Debug.Print brush.SetFocusScales(0.5, 0.5)
Dim fx As Single, fy As Single
Debug.Print brush.GetFocusScales(fx, fy) & " " & fx & " " & fy

brush.CenterPoint = GpPointF(2, 2)
Debug.Print brush.CenterPoint.X & " " & brush.CenterPointI.X

Dim bmp As Bitmap = Bitmap(10!, 10!)
Dim g As Graphics = Graphics(bmp)
g.FillRectangle(brush, 0, 0, 10, 10)
Debug.Print Hex$(bmp.Pixel(0, 2).R) & " " & Hex$(bmp.Pixel(1, 2).R) & " " & Hex$(bmp.Pixel(9, 2).R)
' Output:
' 0
' 0 0.5 0.5
' 2 2
' 0 FF 3E
```

## Blends

A blend changes how fast the colour moves from the centre colour to the surround colour. The positions of a blend run from 0 at the boundary to 1 at the centre.

### GammaCorrection

Syntax: *brush*.**GammaCorrection** [ **=** *useGamma* ]

Gets or sets whether the colours are blended in a gamma-corrected space. The default is **False**.

### BlendCount

Syntax: *count* **=** *brush*.**BlendCount**

Returns the number of blend factors. A new brush has 1.

### GetBlend

Syntax: *brush*.**GetBlend**( *blendFactors*, *blendPositions* )

Sizes the two **Single** arrays from 1 to **BlendCount**, fills them with the blend factors and positions, and returns a [**GpStatus**](Enumerations/GpStatus).

### SetBlend

Syntax: *brush*.**SetBlend**( *blendFactors*, *blendPositions* )

Sets the blend factors, with two **Single** arrays of the same length. This is the form that [**LinearGradientBrush**](LinearGradientBrush#setblend) has with two arrays.

<!-- test: Br_GradientBrushTests.Path_SetBlend_Returns -->
> [!WARNING] 0.9.45.0
> **SetBlend** stops the program with an access violation. Use [**SetBlendBellShape**](#setblendbellshape) or [**SetBlendTriangularShape**](#setblendtriangularshape).

### InterpolationColorCount

Syntax: *count* **=** *brush*.**InterpolationColorCount**

Returns the number of preset colours. A brush that has none returns 0.

### GetInterpolationColors

Syntax: *brush*.**GetInterpolationColors**( *presetColors*, *blendPositions* )

<!-- test: Br_GradientBrushTests.Path_GetInterpolationColors_WithoutPresetColours_IsWrongState -->
Sizes a **Color** array and a **Single** array from 1 to **InterpolationColorCount**, fills them, and returns a [**GpStatus**](Enumerations/GpStatus). It returns **WrongState** when the brush has no preset colours.
<!-- /test -->

### SetInterpolationColors

Syntax: *brush*.**SetInterpolationColors**( *presetColors*, *blendPositions* )

Sets preset colours at positions, with a **Color** array and a **Single** array of the same length.

<!-- test: Br_GradientBrushTests.Path_SetInterpolationColors_Returns -->
> [!WARNING] 0.9.45.0
> **SetInterpolationColors** stops the program with an access violation.

### SetBlendBellShape

Syntax: *brush*.**SetBlendBellShape**( *focus* [, *scale*] )

<!-- test: Br_GradientBrushTests.Path_BlendShapes_ReturnOk -->
Makes the colour reach the centre colour at *focus*, a **Single** from 0 to 1, and fall off with a smooth bell-shaped curve. *scale*, a **Single** from 0 to 1, is how fast the colour falls off from *focus*. The default is 1. Returns a [**GpStatus**](Enumerations/GpStatus).
<!-- /test -->

### SetBlendTriangularShape

Syntax: *brush*.**SetBlendTriangularShape**( *focus* [, *scale*] )

The same, with a triangle in place of the bell. The default *scale* is 1. Returns a [**GpStatus**](Enumerations/GpStatus).

## Wrap mode

### WrapMode

Syntax: *brush*.**WrapMode** [ **=** *wrapMode* ]

Gets or sets what is drawn outside the bounding rectangle of the path: a [**GpWrapMode**](Enumerations/GpWrapMode) value.

<!-- test: Br_GradientBrushTests.Path_WrapMode_ClampDrawsNothingOutsideAndTileRepeats -->
| Value | Outside the path |
|:------|:-----------------|
| **WrapModeClamp** | Nothing is drawn. This is the default of the form with points. |
| **WrapModeTile** | The gradient repeats. |
| **WrapModeTileFlipX**, **WrapModeTileFlipY**, **WrapModeTileFlipXY** | The gradient repeats, mirrored every second time in x, in y, or in both. |
<!-- /test -->

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim corners(0 To 3) As GpPointF
corners(0) = GpPointF(0, 0): corners(1) = GpPointF(10, 0)
corners(2) = GpPointF(10, 10): corners(3) = GpPointF(0, 10)

Dim brush As PathGradientBrush = New PathGradientBrush(corners)
brush.CenterColor = Color(255, 255, 255, 255)
Dim edge(1 To 1) As Color
edge(1) = Color(255, 0, 0, 0)
brush.SurroundColors = edge

Dim bmp As Bitmap = Bitmap(30!, 10!)
Dim g As Graphics = Graphics(bmp)
Dim modes(2) As GpWrapMode
modes(0) = WrapModeClamp: modes(1) = WrapModeTile: modes(2) = WrapModeTileFlipX

Dim i As Long
For i = 0 To 2
    brush.WrapMode = modes(i)
    g.Clear Color(255, 255, 0, 255)
    g.FillRectangle(brush, 0, 0, 30, 10)
    Debug.Print brush.WrapMode & " " & Hex$(bmp.Pixel(10, 5).argb) & " " & Hex$(bmp.Pixel(15, 5).argb)
Next
' Output:
' 4 FFFF00FF FFFF00FF
' 0 FF000000 FFFFFFFF
' 1 FF353535 FFCACACA
```

## Transformations

The brush implements [**ITransformable**](ITransformable). Its transformation moves, scales, rotates or shears the gradient, as a matrix applies to a shape. The *order* parameter of each method is a [**GpMatrixOrder**](Enumerations/GpMatrixOrder): **MatrixOrderPrepend**, the default, applies the new operation before those the brush already has, and **MatrixOrderAppend** applies it after. Each method returns a [**GpStatus**](Enumerations/GpStatus).

### Transform

Syntax: *brush*.**Transform** [ **=** *matrix* ]

Sets the transformation of the brush to a [**Matrix**](Matrix). Reading it should return a copy of the matrix.

<!-- test: Br_GradientBrushTests.Path_Transform_Get_ReturnsTheMatrix -->
> [!NOTE] 0.9.45.0
> Reading **Transform** always fails: it returns **Nothing** and **LastResult** becomes **InvalidParameter**. Use [**GetTransform**](#gettransform).

### GetTransform

Syntax: *brush*.**GetTransform**( *matrix* )

Copies the transformation of the brush into *matrix*, a **Matrix** that the caller created.

### ResetTransform

Syntax: *brush*.**ResetTransform**( )

Sets the transformation to the identity matrix.

### MultiplyTransform

Syntax: *brush*.**MultiplyTransform**( *matrix* [, *order*] )

Combines the transformation with a **Matrix**.

### TranslateTransform

Syntax: *brush*.**TranslateTransform**( *dx*, *dy* [, *order*] )

Syntax: *brush*.**TranslateTransform**( *delta* [, *order*] )

Moves the gradient by *dx* and *dy*, or by a **GpPointF**.

### ScaleTransform

Syntax: *brush*.**ScaleTransform**( *sx*, *sy* [, *order*] )

Scales the gradient by the factors *sx* across and *sy* down.

### RotateTransform

Syntax: *brush*.**RotateTransform**( *angle* [, *order*] )

Rotates the gradient by *angle* degrees clockwise about the origin of the drawing surface.

### RotateTransformAt

Syntax: *brush*.**RotateTransformAt**( *angle*, *center* [, *order*] )

Rotates the gradient by *angle* degrees about the **GpPointF** *center*.

### ShearTransform

Syntax: *brush*.**ShearTransform**( *shearX*, *shearY* [, *order*] )

Shears the gradient: *shearX* is the amount that x grows for each unit of y, and *shearY* the amount that y grows for each unit of x.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim corners(0 To 3) As GpPointF
corners(0) = GpPointF(0, 0): corners(1) = GpPointF(10, 0)
corners(2) = GpPointF(10, 10): corners(3) = GpPointF(0, 10)
Dim brush As PathGradientBrush = New PathGradientBrush(corners)

brush.TranslateTransform 3, 4
Dim m As Matrix = New Matrix()
Debug.Print brush.GetTransform(m) & " " & m.OffsetX & " " & m.OffsetY

brush.ResetTransform
brush.GetTransform m
Debug.Print m.OffsetX & " " & m.OffsetY
' Output:
' 0 3 4
' 0 0
```

## Type

### Type

Syntax: *type* **=** *brush*.**Type**

Returns **BrushTypePathGradient** ([**GpBrushType**](Enumerations/GpBrushType)). The property is read-only.

<!-- test: Br_BrushTests.Type_PathGradientBrush_ReturnsPathGradient -->
> [!WARNING] 0.9.45.0
> In a program that runs in the IDE, reading **Type** stops at an assertion that expects a linear gradient. A compiled program returns the right value.

## Example

The example makes a brush from a path, an ellipse, and fills a bitmap with it.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim path As GraphicsPath = New GraphicsPath()
path.AddEllipse 0, 0, 10, 10

Dim brush As PathGradientBrush = New PathGradientBrush(path)
Debug.Print brush.LastResult & " " & brush.PointCount

brush.CenterColor = Color(255, 255, 255, 255)
Dim edge(1 To 1) As Color
edge(1) = Color(255, 0, 0, 0)
brush.SurroundColors = edge

Dim bmp As Bitmap = Bitmap(10!, 10!)
Dim g As Graphics = Graphics(bmp)
g.Clear Color(255, 255, 0, 255)
g.FillRectangle(brush, 0, 0, 10, 10)
Debug.Print Hex$(bmp.Pixel(5, 5).argb) & " " & Hex$(bmp.Pixel(0, 0).argb)
' Output:
' 0 13
' FFEDEDED FFFF00FF
```

## See Also

- [PathGradientBrush](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusbrush/nl-gdiplusbrush-pathgradientbrush) -- Microsoft's documentation of the GDI+ class
- [IBrush](IBrush) interface
- [ITransformable](ITransformable) interface
- [LinearGradientBrush](LinearGradientBrush) class
- [GraphicsPath](GraphicsPath) class
- [Matrix](Matrix) class
- [GpWrapMode](Enumerations/GpWrapMode) enumeration
