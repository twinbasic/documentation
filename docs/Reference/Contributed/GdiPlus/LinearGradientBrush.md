---
title: LinearGradientBrush
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/LinearGradientBrush
---

# LinearGradientBrush class
{: .no_toc }

A brush that fills a shape with a colour that changes smoothly from one colour to another along a line.

A **LinearGradientBrush** implements [**IBrush**](IBrush) and [**ITransformable**](ITransformable). It has a start colour and an end colour, and a line that joins the point of the start colour to the point of the end colour. The colour at any other point depends on how far along the line its projection falls. Outside the line the gradient repeats, mirrored or not, as the [wrap mode](#wrapmode) says. Further colours, or a different rate of change, can be added with a [blend](#blends). The class mirrors the GDI+ [LinearGradientBrush](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusbrush/nl-gdiplusbrush-lineargradientbrush) class.

* TOC
{:toc}

## Creating

Syntax: *brush* **= LinearGradientBrush**( *rect*, *color1*, *color2* )

Syntax: *brush* **= LinearGradientBrush**( *point1*, *point2*, *color1*, *color2* )

Syntax: *brush* **= LinearGradientBrush**( *rect*, *color1*, *color2*, *mode* )

Syntax: *brush* **= LinearGradientBrush**( *rect*, *color1*, *color2*, *angle* [, *isAngleScalable*] )

Each form can also be written with **New**: *brush* **= New LinearGradientBrush**( ... ). The two are one thing.

*rect*
: *required* A **GpRectF** or a **GpRect**, the rectangle that the gradient spans.

*point1*, *point2*
: *required* Two **GpPointF** or two **GpPoint** values: the point of *color1* and the point of *color2*. The gradient runs along the line between them.

*color1*, *color2*
: *required* **Color** values for the start and the end of the gradient. Each form also takes two **Long** values, *rgb1* and *rgb2*, as `&H00RRGGBB`.

*mode*
: *required* A [**GpLinearGradientMode**](Enumerations/GpLinearGradientMode) value for the direction across the rectangle: **LinearGradientModeHorizontal**, from the left edge to the right edge; **LinearGradientModeVertical**, from the top edge to the bottom edge; **LinearGradientModeForwardDiagonal**, from the top left corner to the bottom right corner; **LinearGradientModeBackwardDiagonal**, from the top right corner to the bottom left corner.

*angle*
: *required* A **Single**, the direction of the line in degrees, measured clockwise from the horizontal. 0 runs from left to right and 90 from top to bottom.

*isAngleScalable*
: *optional* A **Boolean**. When **True**, the angle is scaled with the shape of the rectangle, as for a rectangle that is not square, instead of being used as it is. The default is **False**.

The form with only a rectangle and two colours runs the gradient along the diagonal from the top left corner to the bottom right corner, like **LinearGradientModeForwardDiagonal**. A new brush has the wrap mode **WrapModeTile**.

<!-- test: Br_BrushColourTests.LinearGradientBrush_RGBForm_VBColour_UsesThatColour, Br_BrushColourTests.LinearGradientBrush_RGBForm_Points_VBColour_UsesThatColour, Br_BrushColourTests.LinearGradientBrush_SetLinearColors_RGBForm_VBColour_UsesThatColour -->
> [!WARNING] 0.9.45.0
> The forms with *rgb1* and *rgb2* read each **Long** as `&H00RRGGBB`, not as a VB colour, and drop the alpha: `vbRed` is blue. [**IBrush**](IBrush#colours) lists what else is not translated. Use the **Color** forms.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim black As Color = Color(255, 0, 0, 0)
Dim white As Color = Color(255, 255, 255, 255)
Dim brush As LinearGradientBrush = New LinearGradientBrush(GpRectF(0, 0, 10, 4), black, white, LinearGradientModeHorizontal)

Dim bmp As Bitmap = Bitmap(20!, 4!)
Dim g As Graphics = Graphics(bmp)
g.FillRectangle(brush, 0, 0, 20, 4)

Debug.Print Hex$(bmp.Pixel(0, 1).R) & " " & Hex$(bmp.Pixel(4, 1).R) & " " & Hex$(bmp.Pixel(9, 1).R)
Debug.Print Hex$(bmp.Pixel(10, 1).R)
' Output:
' 0 66 E5
' 0
```

The example shows both ends of the gradient and, at the start of the second tile, its repetition.

### Clone

Syntax: *copy* **=** *brush*.**Clone**( )

Returns a new **LinearGradientBrush** with the same colours, blend, transformation and wrap mode.

## Colours

### SetLinearColors

Syntax: *brush*.**SetLinearColors**( *color1*, *color2* )

Syntax: *brush*.**SetLinearColors**( *rgb1*, *rgb2* )

Replaces the start colour and the end colour, and returns a [**GpStatus**](Enumerations/GpStatus). A blend that was set before is kept. The *rgb* form takes `&H00RRGGBB` values, with the warning above.

### LinearColors

Syntax: *colors* **=** *brush*.**LinearColors**

Returns the start colour and the end colour, as an array of **Color**.

<!-- test: Br_GradientBrushTests.Linear_LinearColors_HasTwoElements, Br_GradientBrushTests.Linear_LinearColors_ReturnsStartThenEnd -->
> [!NOTE] 0.9.45.0
> The array runs from 0 to 2, and its element 0 is not used: the start colour is element 1 and the end colour element 2.

### LinearRGBs

Syntax: *colors* **=** *brush*.**LinearRGBs**

<!-- test: Br_GradientBrushTests.Linear_LinearRGBs_AreCompleteARGBValues, Br_GradientBrushTests.Linear_LinearRGBs_HasTwoElements -->
Returns the same two colours as an array of **Long**, laid out as the array of **LinearColors**. Each value is a complete `&HAARRGGBB` colour, with its alpha, and not a `&H00RRGGBB` value.
<!-- /test -->

### Rectangle, RectangleI

Syntax: *rect* **=** *brush*.**Rectangle**

Syntax: *rect* **=** *brush*.**RectangleI**

Return the rectangle that the gradient spans, as a **GpRectF** and as a **GpRect**. For a brush made from two points, GDI+ makes the rectangle from the points.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim brush As LinearGradientBrush = New LinearGradientBrush(GpPointF(0, 0), GpPointF(10, 0), Color(255, 255, 0, 0), Color(255, 0, 0, 255))

Dim colors() As Color = brush.LinearColors
Debug.Print UBound(colors) & " " & Hex$(colors(1).argb) & " " & Hex$(colors(2).argb)

brush.SetLinearColors Color(255, 0, 255, 0), Color(255, 255, 255, 0)
colors = brush.LinearColors
Debug.Print Hex$(colors(1).argb) & " " & Hex$(colors(2).argb)

Dim bmp As Bitmap = Bitmap(10!, 2!)
Dim g As Graphics = Graphics(bmp)
g.FillRectangle(brush, 0, 0, 10, 2)
Debug.Print Hex$(bmp.Pixel(0, 0).argb) & " " & Hex$(bmp.Pixel(5, 0).argb)
' Output:
' 2 FFFF0000 FF0000FF
' FF00FF00 FFFFFF00
' FF00FF00 FF80FF00
```

### GammaCorrection

Syntax: *brush*.**GammaCorrection** [ **=** *useGamma* ]

Gets or sets whether the colours are blended in a gamma-corrected space. The default is **False**. The middle of a black-to-white gradient is darker without the correction than with it.

## Blends

A blend changes how fast the colour moves from the start colour to the end colour. It is one of three things, and setting one replaces the others: a list of blend factors, a list of preset colours, or a bell or triangle shape.

### BlendCount

Syntax: *count* **=** *brush*.**BlendCount**

Returns the number of blend factors. A new brush has 1.

### SetBlend

Syntax: *brush*.**SetBlend**( *blendFactors*, *blendPositions* )

Syntax: *brush*.**SetBlend**( *blendFactors*(1), *blendPositions*(1), *count* )

Sets the blend factors, and returns a [**GpStatus**](Enumerations/GpStatus). A blend factor is a **Single** from 0 to 1: the share of the end colour at a position, with the rest from the start colour. A position is a **Single** from 0 at the start of the gradient to 1 at its end. The first position must be 0 and the last 1. The first form takes two arrays of the same length. The second form takes the first element of each array by reference and the number of elements to read.

<!-- test: Br_GradientBrushTests.Linear_SetBlend_TwoArrays_Returns, Br_GradientBrushTests.Linear_SetBlend_FirstElementsAndCount_SetsTheBlend -->
> [!WARNING] 0.9.45.0
> The form with two arrays stops the program with an access violation. Use the form with the first elements and the count, as the example does.

### GetBlend

Syntax: *brush*.**GetBlend**( *blendFactors*, *blendPositions* )

Syntax: *brush*.**GetBlend**( *blendFactors*(1), *blendPositions*(1), *count* )

Reads the blend factors and positions. The first form sizes the two arrays, from 1 to **BlendCount**, and fills them. The second form fills arrays that the caller has sized; *count* is the number of elements to read.

### InterpolationColorCount

Syntax: *count* **=** *brush*.**InterpolationColorCount**

Returns the number of preset colours. A brush that has none returns 0.

### SetInterpolationColors

Syntax: *brush*.**SetInterpolationColors**( *presetColors*, *blendPositions* )

Syntax: *brush*.**SetInterpolationColors**( *presetColors*(1), *blendPositions*(1), *count* )

Sets preset colours, and returns a [**GpStatus**](Enumerations/GpStatus). The gradient takes the colour at each position, and blends between them. The first position must be 0 and the last 1. Like **SetBlend**, the first form takes two arrays and the second form takes the first elements by reference and a count. The preset colours replace the start and the end colour for the drawing; [**LinearColors**](#linearcolors) still returns those two.

<!-- test: Br_GradientBrushTests.Linear_SetInterpolationColors_TwoArrays_Returns, Br_GradientBrushTests.Linear_SetInterpolationColors_FirstElementsAndCount_SetsTheColours -->
> [!WARNING] 0.9.45.0
> The form with two arrays stops the program with an access violation. Use the form with the first elements and the count.

### GetInterpolationColors

Syntax: *brush*.**GetInterpolationColors**( *presetColors*, *blendPositions* )

Syntax: *brush*.**GetInterpolationColors**( *presetColors*(1), *blendPositions*(1), *count* )

Reads the preset colours and their positions. The first form sizes the two arrays, from 1 to **InterpolationColorCount**, and fills them.

### SetBlendBellShape

Syntax: *brush*.**SetBlendBellShape**( *focus* [, *scale*] )

<!-- test: Br_GradientBrushTests.Linear_BlendBellShape_PeaksAtTheFocus -->
Makes the colour reach the end colour at *focus*, a **Single** from 0 to 1 along the gradient, and fall back to the start colour on both sides, with a smooth bell-shaped curve. *scale*, a **Single** from 0 to 1, is how fast the colour falls off from *focus*; the default is 1. Returns a [**GpStatus**](Enumerations/GpStatus).
<!-- /test -->

### SetBlendTriangularShape

Syntax: *brush*.**SetBlendTriangularShape**( *focus* [, *scale*] )

The same, with a triangle in place of the bell: the colour changes at a constant rate to *focus* and back. The default *scale* is 1. Returns a [**GpStatus**](Enumerations/GpStatus).

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(10!, 2!)
Dim g As Graphics = Graphics(bmp)
Dim brush As LinearGradientBrush = New LinearGradientBrush(GpRectF(0, 0, 10, 2), Color(255, 0, 0, 0), Color(255, 255, 255, 255), LinearGradientModeHorizontal)

' black, white in the middle, black again
Dim factors(1 To 3) As Single, positions(1 To 3) As Single
factors(1) = 0: factors(2) = 1: factors(3) = 0
positions(1) = 0: positions(2) = 0.5: positions(3) = 1
Debug.Print brush.SetBlend(factors(1), positions(1), 3) & " " & brush.BlendCount
g.FillRectangle(brush, 0, 0, 10, 2)
Debug.Print Hex$(bmp.Pixel(0, 0).R) & " " & Hex$(bmp.Pixel(5, 0).R) & " " & Hex$(bmp.Pixel(9, 0).R)

' red, green, blue
Dim colors(1 To 3) As Color
colors(1) = Color(255, 255, 0, 0)
colors(2) = Color(255, 0, 255, 0)
colors(3) = Color(255, 0, 0, 255)
Debug.Print brush.SetInterpolationColors(colors(1), positions(1), 3) & " " & brush.InterpolationColorCount
g.FillRectangle(brush, 0, 0, 10, 2)
Debug.Print Hex$(bmp.Pixel(0, 0).argb) & " " & Hex$(bmp.Pixel(5, 0).argb)

Dim c2() As Color, p2() As Single
Debug.Print brush.GetInterpolationColors(c2, p2) & " " & UBound(c2) & " " & Hex$(c2(2).argb) & " " & p2(2)
' Output:
' 0 3
' 0 FF 33
' 0 3
' FFFF0000 FF00FF00
' 0 3 FF00FF00 0.5
```

## Wrap mode

### WrapMode

Syntax: *brush*.**WrapMode** [ **=** *wrapMode* ]

Gets or sets what the brush does outside its line: a [**GpWrapMode**](Enumerations/GpWrapMode) value. The default is **WrapModeTile**.

<!-- test: Br_GradientBrushTests.Linear_WrapMode_TileRepeatsAndFlipMirrors -->
| Value | Outside the gradient |
|:------|:---------------------|
| **WrapModeTile** | The gradient repeats, from the start colour again. |
| **WrapModeTileFlipX**, **WrapModeTileFlipXY** | The gradient repeats, mirrored every second time, so that the colour runs back from the end colour. |
| **WrapModeTileFlipY** | Like **WrapModeTile**. |
<!-- /test -->

<!-- test: Br_GradientBrushTests.Linear_WrapMode_Clamp_IsRefused -->
> [!NOTE] 0.9.45.0
> **WrapModeClamp** is refused: **LastResult** becomes **InvalidParameter** and the wrap mode is not changed.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim brush As LinearGradientBrush = New LinearGradientBrush(GpRectF(0, 0, 10, 10), Color(255, 0, 0, 0), Color(255, 255, 255, 255), LinearGradientModeHorizontal)
Dim bmp As Bitmap = Bitmap(20!, 2!)
Dim g As Graphics = Graphics(bmp)

Dim row As String, x As Long
brush.WrapMode = WrapModeTileFlipX
g.FillRectangle(brush, 0, 0, 20, 2)
For x = 8 To 12
    row = row & Hex$(bmp.Pixel(x, 0).R) & " "
Next
Debug.Print row

row = ""
brush.WrapMode = WrapModeTile
g.FillRectangle(brush, 0, 0, 20, 2)
For x = 8 To 12
    row = row & Hex$(bmp.Pixel(x, 0).R) & " "
Next
Debug.Print row

brush.WrapMode = WrapModeClamp
Debug.Print brush.LastResult & " " & brush.WrapMode
' Output:
' CC E5 FF E5 CC
' CC E5 0 1A 33
' 2 0
```

## Transformations

The brush implements [**ITransformable**](ITransformable). Its transformation moves, scales, rotates or shears the gradient, as a matrix applies to a shape. The *order* parameter of each method is a [**GpMatrixOrder**](Enumerations/GpMatrixOrder): **MatrixOrderPrepend**, the default, applies the new operation before those the brush already has, and **MatrixOrderAppend** applies it after. Each method returns a [**GpStatus**](Enumerations/GpStatus).

### Transform

Syntax: *brush*.**Transform** [ **=** *matrix* ]

Sets the transformation of the brush to a [**Matrix**](Matrix). Reading it should return a copy of the matrix.

<!-- test: Br_GradientBrushTests.Linear_Transform_Get_ReturnsTheMatrix -->
> [!NOTE] 0.9.45.0
> Reading **Transform** always fails: it returns **Nothing** and **LastResult** becomes **InvalidParameter**. Use [**GetTransform**](#gettransform).

### GetTransform

Syntax: *brush*.**GetTransform**( *matrix* )

<!-- test: Br_GradientBrushTests.Linear_GetTransform_CopiesTheMatrix -->
Copies the transformation of the brush into *matrix*, a **Matrix** that the caller created.
<!-- /test -->

### ResetTransform

Syntax: *brush*.**ResetTransform**( )

Sets the transformation to the identity matrix: no movement, scaling, rotation or shear.

### MultiplyTransform

Syntax: *brush*.**MultiplyTransform**( *matrix* [, *order*] )

Combines the transformation with a **Matrix**.

### TranslateTransform

Syntax: *brush*.**TranslateTransform**( *dx*, *dy* [, *order*] )

Syntax: *brush*.**TranslateTransform**( *delta* [, *order*] )

Moves the gradient by *dx* and *dy*, or by a **GpPointF**, in the units of the drawing surface.

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

Dim brush As LinearGradientBrush = New LinearGradientBrush(GpRectF(0, 0, 10, 10), Color(255, 0, 0, 0), Color(255, 255, 255, 255), LinearGradientModeHorizontal)
brush.TranslateTransform 5, 0

Dim m As Matrix = New Matrix()
Debug.Print brush.GetTransform(m) & " " & m.OffsetX & " " & m.OffsetY

Dim bmp As Bitmap = Bitmap(20!, 2!)
Dim g As Graphics = Graphics(bmp)
g.FillRectangle(brush, 0, 0, 20, 2)
Debug.Print Hex$(bmp.Pixel(0, 0).R) & " " & Hex$(bmp.Pixel(5, 0).R)

brush.ResetTransform
brush.GetTransform m
Debug.Print m.OffsetX
' Output:
' 0 5 0
' 80 0
' 0
```

## Type

### Type

Syntax: *type* **=** *brush*.**Type**

Returns **BrushTypeLinearGradient** ([**GpBrushType**](Enumerations/GpBrushType)). The property is read-only.

## See Also

- [LinearGradientBrush](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusbrush/nl-gdiplusbrush-lineargradientbrush) -- Microsoft's documentation of the GDI+ class
- [IBrush](IBrush) interface
- [ITransformable](ITransformable) interface
- [PathGradientBrush](PathGradientBrush) class
- [Matrix](Matrix) class
- [GpLinearGradientMode](Enumerations/GpLinearGradientMode) enumeration
- [GpWrapMode](Enumerations/GpWrapMode) enumeration
