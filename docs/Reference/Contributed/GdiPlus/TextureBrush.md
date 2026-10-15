---
title: TextureBrush
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/TextureBrush
---

# TextureBrush class
{: .no_toc }

A brush that fills a shape with an image, repeated like tiles.

A **TextureBrush** implements [**IBrush**](IBrush) and [**ITransformable**](ITransformable). The tiles start at the origin of the drawing surface, not at the corner of the shape being filled, so two shapes filled with the same brush show one continuous pattern. A transformation of the brush moves, scales or rotates the tiles. The class mirrors the GDI+ [TextureBrush](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusbrush/nl-gdiplusbrush-texturebrush) class.

* TOC
{:toc}

## Creating

Syntax: *brush* **= TextureBrush**( *image* [, *wrapMode*] )

Syntax: *brush* **= TextureBrush**( *image*, *wrapMode*, *dstRect* )

Syntax: *brush* **= TextureBrush**( *image*, *dstRect* [, *imageAttributes*] )

Syntax: *brush* **= TextureBrush**( *image*, *wrapMode*, *dstX*, *dstY*, *dstWidth*, *dstHeight* )

Syntax: *brush* **= TextureBrushI**( *image*, *wrapMode*, *dstX*, *dstY*, *dstWidth*, *dstHeight* )

Each form of **TextureBrush** can also be written with **New**: *brush* **= New TextureBrush**( ... ). The two are one thing.

*image*
: *required* The [**Image**](Image) that is the tile, a [**Bitmap**](Bitmap) for example.

*wrapMode*
: *optional* A [**GpWrapMode**](Enumerations/GpWrapMode) value for what is drawn outside a tile. The default is **WrapModeTile**.

*dstRect*
: *required* A **GpRectF** or a **GpRect**: the part of the image that is used as the tile. Without it, the whole image is the tile. For a metafile image, only the width and the height matter: they are the size at which the metafile is drawn, and the rectangle does not crop it.

*dstX*, *dstY*, *dstWidth*, *dstHeight*
: *required* The same rectangle as four numbers. **TextureBrush** takes **Single** values and **TextureBrushI** takes **Long** values.

*imageAttributes*
: *optional* The [**ImageAttributes**](ImageAttributes) that are applied to the image when the brush draws. The default is none.

> [!NOTE] 0.9.45.0
> The constructor with **Long** values has a seventh parameter, a **Long** that is ignored, so that a call with six numbers is read as the one with **Single** values. **TextureBrushI** is the function for it, and it is the only form without **New**.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

' A tile of 2 by 2 pixels: red, green / blue, white
Dim tile As Bitmap = Bitmap(2!, 2!)
tile.Pixel(0, 0) = Color(255, 255, 0, 0)
tile.Pixel(1, 0) = Color(255, 0, 255, 0)
tile.Pixel(0, 1) = Color(255, 0, 0, 255)
tile.Pixel(1, 1) = Color(255, 255, 255, 255)

Dim brush As TextureBrush = New TextureBrush(tile)
Dim bmp As Bitmap = Bitmap(6!, 4!)
Dim g As Graphics = Graphics(bmp)
g.FillRectangle(brush, 0, 0, 6, 4)

Dim x As Long, y As Long, a As Long, row As String
For y = 0 To 1
    row = ""
    For x = 0 To 5
        a = bmp.Pixel(x, y).argb
        row = row & IIf(a = &HFFFF0000, "R", IIf(a = &HFF00FF00, "G", IIf(a = &HFF0000FF, "B", "W")))
    Next
    Debug.Print row
Next
Debug.Print brush.LastResult & " " & brush.Type & " " & brush.WrapMode
' Output:
' RGRGRG
' BWBWBW
' 0 2 0
```

### Clone

Syntax: *copy* **=** *brush*.**Clone**( )

Returns a new **TextureBrush** with the same tile, wrap mode and transformation.

## The tile

The example takes the 2-by-2 square at the lower right of a 4-by-4 image as the tile.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim image As Bitmap = Bitmap(4!, 4!)
Dim x As Long, y As Long
For y = 0 To 3
    For x = 0 To 3
        image.Pixel(x, y) = Color(255, x * 60, y * 60, 0)
    Next
Next

Dim brush As TextureBrush = New TextureBrush(image, WrapModeTile, GpRectF(2, 2, 2, 2))
Dim bmp As Bitmap = Bitmap(4!, 2!)
Dim g As Graphics = Graphics(bmp)
g.FillRectangle(brush, 0, 0, 4, 2)

Dim row As String
For x = 0 To 3
    row = row & Hex$(bmp.Pixel(x, 0).argb) & " "
Next
Debug.Print row

Dim whole As GdiPlus.Image = brush.Image
Debug.Print whole.Width & " " & whole.Height
' Output:
' FF787800 FFB47800 FF787800 FFB47800 
' 2 2
```

### Image

Syntax: *image* **=** *brush*.**Image**

Returns the tile as an [**Image**](Image): the part of the image that was chosen when the brush was made, which is the whole image when no rectangle was given. The property is read-only. A variable that holds it is declared **As GdiPlus.Image**, because **Image** alone names the VB control class.

## Wrap mode

### WrapMode

Syntax: *brush*.**WrapMode** [ **=** *wrapMode* ]

Gets or sets what the brush does outside the first tile: a [**GpWrapMode**](Enumerations/GpWrapMode) value.

| Value | Outside the first tile |
|:------|:-----------------------|
| **WrapModeTile** | The tile repeats. |
| **WrapModeTileFlipX** | The tile repeats and every second tile in a row is mirrored from left to right. |
| **WrapModeTileFlipY** | The tile repeats and every second tile in a column is mirrored from top to bottom. |
| **WrapModeTileFlipXY** | Both. |
| **WrapModeClamp** | The tile is drawn once, at the origin, and nothing else is drawn. |

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim tile As Bitmap = Bitmap(2!, 2!)
tile.Pixel(0, 0) = Color(255, 255, 0, 0)
tile.Pixel(1, 0) = Color(255, 0, 255, 0)
tile.Pixel(0, 1) = Color(255, 0, 0, 255)
tile.Pixel(1, 1) = Color(255, 255, 255, 255)

Dim bmp As Bitmap = Bitmap(6!, 2!)
Dim g As Graphics = Graphics(bmp)
Dim modes(1) As GpWrapMode
modes(0) = WrapModeTileFlipX: modes(1) = WrapModeClamp

Dim i As Long, x As Long, y As Long, a As Long, row As String
For i = 0 To 1
    Dim brush As TextureBrush = New TextureBrush(tile, modes(i))
    g.Clear Color(255, 0, 0, 0)
    g.FillRectangle(brush, 0, 0, 6, 2)
    For y = 0 To 1
        row = ""
        For x = 0 To 5
            a = bmp.Pixel(x, y).argb
            row = row & IIf(a = &HFFFF0000, "R", IIf(a = &HFF00FF00, "G", IIf(a = &HFF0000FF, "B", IIf(a = &HFFFFFFFF, "W", "."))))
        Next
        Debug.Print row
    Next
Next
' Output:
' RGGRRG
' BWWBBW
' RG....
' BW....
```

## Transformations

The brush implements [**ITransformable**](ITransformable). Its transformation moves, scales, rotates or shears the tiles, as a matrix applies to a shape. The *order* parameter of each method is a [**GpMatrixOrder**](Enumerations/GpMatrixOrder): **MatrixOrderPrepend**, the default, applies the new operation before those the brush already has, and **MatrixOrderAppend** applies it after. Each method returns a [**GpStatus**](Enumerations/GpStatus).

### Transform

Syntax: *brush*.**Transform** [ **=** *matrix* ]

Sets the transformation of the brush to a [**Matrix**](Matrix). Reading it should return a copy of the matrix.

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

Moves the tiles by *dx* and *dy*, or by a **GpPointF**.

### ScaleTransform

Syntax: *brush*.**ScaleTransform**( *sx*, *sy* [, *order*] )

Scales the tiles by the factors *sx* across and *sy* down.

### RotateTransform

Syntax: *brush*.**RotateTransform**( *angle* [, *order*] )

Rotates the tiles by *angle* degrees clockwise about the origin of the drawing surface.

### RotateTransformAt

Syntax: *brush*.**RotateTransformAt**( *angle*, *center* [, *order*] )

Rotates the tiles by *angle* degrees about the **GpPointF** *center*.

### ShearTransform

Syntax: *brush*.**ShearTransform**( *shearX*, *shearY* [, *order*] )

Shears the tiles: *shearX* is the amount that x grows for each unit of y, and *shearY* the amount that y grows for each unit of x.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim tile As Bitmap = Bitmap(2!, 2!)
tile.Pixel(0, 0) = Color(255, 255, 0, 0)
tile.Pixel(1, 0) = Color(255, 0, 255, 0)
tile.Pixel(0, 1) = Color(255, 0, 0, 255)
tile.Pixel(1, 1) = Color(255, 255, 255, 255)

Dim brush As TextureBrush = New TextureBrush(tile)
brush.TranslateTransform 1, 0

Dim m As Matrix = New Matrix()
Debug.Print brush.GetTransform(m) & " " & m.OffsetX

Dim bmp As Bitmap = Bitmap(6!, 2!)
Dim g As Graphics = Graphics(bmp)
g.FillRectangle(brush, 0, 0, 6, 2)

Dim x As Long, y As Long, a As Long, row As String
For y = 0 To 1
    row = ""
    For x = 0 To 5
        a = bmp.Pixel(x, y).argb
        row = row & IIf(a = &HFFFF0000, "R", IIf(a = &HFF00FF00, "G", IIf(a = &HFF0000FF, "B", "W")))
    Next
    Debug.Print row
Next
' Output:
' 0 1
' GRGRGR
' WBWBWB
```

## Type

### Type

Syntax: *type* **=** *brush*.**Type**

Returns **BrushTypeTextureFill** ([**GpBrushType**](Enumerations/GpBrushType)). The property is read-only.

## See Also

- [TextureBrush](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusbrush/nl-gdiplusbrush-texturebrush) -- Microsoft's documentation of the GDI+ class
- [IBrush](IBrush) interface
- [ITransformable](ITransformable) interface
- [HatchBrush](HatchBrush) class
- [Image](Image) class
- [Bitmap](Bitmap) class
- [ImageAttributes](ImageAttributes) class
- [Matrix](Matrix) class
- [GpWrapMode](Enumerations/GpWrapMode) enumeration
