---
title: Pen
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Pen
---

# Pen class
{: .no_toc }

Draws lines and the outlines of shapes, with a width, a colour or brush, caps, a dash pattern and a join style.

A **Pen** is passed to the draw methods of [**Graphics**](Graphics): **DrawLine**, **DrawRectangle**, **DrawPath** and the others. A pen paints with one colour, or with any [brush](IBrush) when it is made from one, so a line can be hatched, a gradient or a texture. The class mirrors the GDI+ [Pen](https://learn.microsoft.com/en-us/windows/win32/api/gdipluspen/nl-gdipluspen-pen) class.

* TOC
{:toc}

## Creating

Syntax: *pen* **= Pen**( *color* [, *width* [, *unit*]] )

Syntax: *pen* **= Pen**( *rgb* [, *width* [, *unit*]] )

Syntax: *pen* **= Pen**( *brush* [, *width*] )

Each form can also be written with **New**: *pen* **= New Pen**( ... ). The two are one thing.

*color*
: *required* A **Color** for the pen. Its alpha value is kept.

*rgb*
: *required* A **Long** for the colour, as `&H00RRGGBB`. The alpha is always 255.

*brush*
: *required* A [**Brush**](IBrush) of any kind that the pen paints with.

*width*
: *optional* A **Single** for the width of the pen. The default is 1.

*unit*
: *optional* A [**GpUnit**](Enumerations/GpUnit) for the unit of *width*. The default is **UnitWorld**.

With **UnitWorld**, the width is in the units of the drawing surface, so a transformation of the [**Graphics**](Graphics) scales the line: after **ScaleTransform** 3, 3 a pen of width 1 draws a line 3 pixels wide. With **UnitPixel**, the pen is 1 pixel wide whatever the transformation.

> [!WARNING] 0.9.45.0
> The *rgb* form reads its **Long** as `&H00RRGGBB`, not as a VB colour, and drops the alpha: `Pen(vbRed)` and `Pen(RGB(255, 0, 0))` draw in blue. [**IBrush**](IBrush#colours) lists what else is not translated. The same holds for [**Set**](#set) and [**RGB**](#rgb) with a **Long**. Use the **Color** forms.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(8!, 8!)
Dim g As Graphics = Graphics(bmp)
g.Clear Color(255, 255, 255, 255)

Dim linePen As Pen = Pen(Color(255, 255, 0, 0), 3)
Debug.Print linePen.Width & " " & Hex$(linePen.Color.argb) & " " & linePen.PenType

g.DrawLine linePen, 0, 4, 8, 4
Debug.Print Hex$(bmp.Pixel(4, 3).argb) & " " & Hex$(bmp.Pixel(4, 5).argb) & " " & Hex$(bmp.Pixel(4, 6).argb)

' a surface scaled by 3: the world pen is 3 pixels thick, the pixel pen 1
Dim tall As Bitmap = Bitmap(10!, 10!)
Dim g3 As Graphics = Graphics(tall)
g3.ScaleTransform 3, 3
Dim worldPen As Pen = Pen(Color(255, 255, 0, 0), 1)
Dim pixelPen As Pen = Pen(Color(255, 255, 0, 0), 1, UnitPixel)

Dim y As Long, column As String
g3.Clear Color(255, 255, 255, 255)
g3.DrawLine worldPen, 0, 1.5, 3, 1.5
For y = 0 To 9
    column = column & IIf(tall.Pixel(2, y).argb = &HFFFFFFFF, ".", "#")
Next
Debug.Print column

column = ""
g3.Clear Color(255, 255, 255, 255)
g3.DrawLine pixelPen, 0, 1.5, 3, 1.5
For y = 0 To 9
    column = column & IIf(tall.Pixel(2, y).argb = &HFFFFFFFF, ".", "#")
Next
Debug.Print column
' Output:
' 3 FFFF0000 0
' FFFF0000 FFFF0000 FFFFFFFF
' ...###....
' ....#.....
```

### Clone

Syntax: *copy* **=** *pen*.**Clone**( )

Returns a new **Pen** with the same settings. Changing the copy does not change the original.

## General

### Width

Syntax: *pen*.**Width** [ **=** *width* ]

Gets or sets the width of the pen, a **Single**, in the unit that the pen was made with.

### PenType

Syntax: *type* **=** *pen*.**PenType**

Returns a [**GpPenType**](Enumerations/GpPenType) value for what the pen paints with: **PenTypeSolidColor**, **PenTypeHatchFill**, **PenTypeTextureFill**, **PenTypePathGradient** or **PenTypeLinearGradient**. A pen made from a **SolidBrush** is a solid colour pen. The property is read-only.

### Color

Syntax: *pen*.**Color** [ **=** *color* ]

Gets or sets the colour of the pen, as a **Color**. Setting it turns a pen that was made from another kind of brush into a solid colour pen. For a pen that is not of a solid colour, the value read is 0.

### RGB

Syntax: *pen*.**RGB** [ **=** *rgb* ]

Gets or sets the colour as a **Long** in the form `&H00RRGGBB`. Reading it drops the alpha value, and writing it sets an opaque colour. The warning of [Creating](#creating) applies.

### Set

Syntax: *pen*.**Set**( *color*, *width* )

Syntax: *pen*.**Set**( *rgb*, *width* )

Sets the colour and the width in one call. The *rgb* form takes `&H00RRGGBB`.

### Brush

Syntax: *pen*.**Brush** [ **=** *brush* ]

Gets or sets the [**Brush**](IBrush) that the pen paints with. Reading it returns a new brush of the same class as the one the pen was made from.

> [!NOTE] 0.9.45.0
> A property that returns an object, such as **Brush**, **CustomStartCap** and **CustomEndCap**, returns **Nothing** while **LastResult** is not **Ok**, even when the failure was an earlier call. Call **ClearResult** first.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim hatch As HatchBrush = New HatchBrush(HatchStyleCross, Color(255, 1, 2, 3), Color(255, 4, 5, 6))
Dim linePen As Pen = Pen(hatch, 2)
Debug.Print linePen.PenType & " " & Hex$(linePen.Color.argb)

Dim b As Brush = linePen.Brush
Debug.Print b.Type

linePen.Color = Color(255, 9, 9, 9)
Debug.Print linePen.PenType & " " & Hex$(linePen.Color.argb)

linePen.Set Color(255, 1, 2, 3), 5
Debug.Print linePen.Width & " " & Hex$(linePen.Color.argb)

Dim copy As Pen = linePen.Clone()
copy.Width = 7
Debug.Print linePen.Width & " " & copy.Width
' Output:
' 1 0
' 1
' 0 FF090909
' 5 FF010203
' 5 7
```

## Line caps

A cap is the end of a line. A line has a start cap, at the first point given to the draw method, and an end cap, at the last.

### StartCap

Syntax: *pen*.**StartCap** [ **=** *lineCap* ]

Gets or sets the [**GpLineCap**](Enumerations/GpLineCap) of the start of a line. The default is **LineCapFlat**. A value with the anchor flag, such as **LineCapArrowAnchor**, draws a mark that is bigger than the line; **LineCapCustom** is what the property returns when a custom cap was set.

### EndCap

Syntax: *pen*.**EndCap** [ **=** *lineCap* ]

Gets or sets the [**GpLineCap**](Enumerations/GpLineCap) of the end of a line, as [**StartCap**](#startcap) does for the start.

### DashCap

Syntax: *pen*.**DashCap** [ **=** *lineCap* ]

Gets or sets the cap of each dash of a dashed line. The property is declared as a **GpLineCap** and takes the values of [**GpDashCap**](Enumerations/GpDashCap), which are **DashCapFlat**, **DashCapRound** and **DashCapTriangle**. The default is flat.

### Caps

Syntax: *pen*.**Caps** = *lineCap*

Sets the start cap and the end cap to the same [**GpLineCap**](Enumerations/GpLineCap). The property cannot be read.

### SetLineCap

Syntax: *status* **=** *pen*.**SetLineCap**( *startCap*, *endCap*, *dashCap* )

Sets the start cap, the end cap and the dash cap, a [**GpDashCap**](Enumerations/GpDashCap), together. Returns a [**GpStatus**](Enumerations/GpStatus).

### CustomStartCap

Syntax: *pen*.**CustomStartCap** [ **=** *cap* ]

Gets or sets a [**CustomLineCap**](CustomLineCap), or an [**ArrowCap**](ArrowCap), for the start of a line. Setting one makes the start cap **LineCapCustom**. Reading returns a cap object, or **Nothing** when the pen has none.

> [!WARNING] 0.9.45.0
> A pen with an **ArrowCap** returns an **ArrowCap** from **CustomStartCap** that is not usable: its members report **InvalidParameter** in **LastResult** and return 0. A plain **CustomLineCap** is returned correctly.

### CustomEndCap

Syntax: *pen*.**CustomEndCap** [ **=** *cap* ]

Sets a [**CustomLineCap**](CustomLineCap), or an [**ArrowCap**](ArrowCap), for the end of a line, and makes the end cap **LineCapCustom**.

> [!WARNING] 0.9.45.0
> Reading **CustomEndCap** raises error 91 and returns **Nothing**, and it replaces the custom start cap of the pen with the end cap: a failed read changes the pen. Only assigning works.

The example draws a line with a round start cap and a flat end cap. **#** is a pixel of the pen.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(16!, 8!)
Dim g As Graphics = Graphics(bmp)
g.Clear Color(255, 255, 255, 255)

Dim linePen As Pen = Pen(Color(255, 255, 0, 0), 4)
linePen.StartCap = LineCapRound
linePen.EndCap = LineCapFlat
g.DrawLine linePen, 5, 4, 11, 4

Dim x As Long, y As Long, row As String
For y = 2 To 5
    row = ""
    For x = 0 To 15
        row = row & IIf(bmp.Pixel(x, y).argb = &HFFFFFFFF, ".", "#")
    Next
    Debug.Print row
Next

Debug.Print linePen.SetLineCap(LineCapSquare, LineCapDiamondAnchor, DashCapTriangle)
Debug.Print linePen.StartCap & " " & linePen.EndCap & " " & linePen.DashCap

linePen.Caps = LineCapRound
Debug.Print linePen.StartCap & " " & linePen.EndCap
' Output:
' .....######.....
' ....#######.....
' ...########.....
' ....#######.....
' 0
' 1 19 3
' 2 2
```

## Dashes

### DashStyle

Syntax: *pen*.**DashStyle** [ **=** *style* ]

Gets or sets the [**GpDashStyle**](Enumerations/GpDashStyle): **DashStyleSolid**, one of four predefined patterns, or **DashStyleCustom**. Setting a predefined style replaces the dash pattern of the pen.

### DashPattern

Syntax: *pen*.**DashPattern** [ **=** *pattern* ]

Gets or sets the dash pattern as an array of **Single** values: the length of a dash, then of a gap, then of a dash, and so on, each as a multiple of the pen width. The array read starts at index 1. Setting a pattern sets the style to **DashStyleCustom**.

### DashPatternCount

Syntax: *count* **=** *pen*.**DashPatternCount**

Returns the number of lengths in the dash pattern: 2 for **DashStyleDash** and **DashStyleDot**, and 0 for a solid line.

### DashOffset

Syntax: *pen*.**DashOffset** [ **=** *offset* ]

Gets or sets how far into the pattern the line starts, a **Single** that is a multiple of the pen width. The default is 0.

### CompoundArray

Syntax: *pen*.**CompoundArray** [ **=** *array* ]

A compound pen draws a line as several parallel lines. **CompoundArray** gets or sets an array of **Single** values from 0 to 1 that increase: pairs of a start and an end, as fractions of the pen width, measured from one edge. A pair is one line. The array read starts at index 1.

### CompoundArrayCount

Syntax: *count* **=** *pen*.**CompoundArrayCount**

Returns the number of values of the compound array, 0 for a pen that is not compound.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(40!, 12!)
Dim g As Graphics = Graphics(bmp)
Dim linePen As Pen = Pen(Color(255, 255, 0, 0), 2)

Dim x As Long, row As String
linePen.DashStyle = DashStyleDash
g.Clear Color(255, 255, 255, 255)
g.DrawLine linePen, 0, 6, 40, 6
For x = 0 To 39
    row = row & IIf(bmp.Pixel(x, 5).argb = &HFFFFFFFF, ".", "#")
Next
Debug.Print row

Dim pattern() As Single = linePen.DashPattern
Debug.Print linePen.DashPatternCount & " " & pattern(1) & " " & pattern(2)

Dim custom(1 To 2) As Single
custom(1) = 3: custom(2) = 1
linePen.DashPattern = custom
linePen.DashOffset = 2
g.Clear Color(255, 255, 255, 255)
g.DrawLine linePen, 0, 6, 40, 6
row = ""
For x = 0 To 39
    row = row & IIf(bmp.Pixel(x, 5).argb = &HFFFFFFFF, ".", "#")
Next
Debug.Print row
Debug.Print linePen.DashStyle

Dim thick As Pen = Pen(Color(255, 255, 0, 0), 8)
Dim bands(1 To 4) As Single
bands(1) = 0: bands(2) = 0.25: bands(3) = 0.75: bands(4) = 1
thick.CompoundArray = bands
Debug.Print thick.CompoundArrayCount

Dim edge As Bitmap = Bitmap(12!, 12!)
Dim ge As Graphics = Graphics(edge)
ge.Clear Color(255, 255, 255, 255)
ge.DrawLine thick, 0, 6, 12, 6
Dim y As Long
row = ""
For y = 0 To 11
    row = row & IIf(edge.Pixel(6, y).argb = &HFFFFFFFF, ".", "#")
Next
Debug.Print row
' Output:
' ######..######..######..######..######..
' 2 3 1
' ##..######..######..######..######..####
' 5
' 4
' ..##....##..
```

## Joins and alignment

### LineJoin

Syntax: *pen*.**LineJoin** [ **=** *lineJoin* ]

Gets or sets the [**GpLineJoin**](Enumerations/GpLineJoin) of the corners where two lines of a path meet. The default is **LineJoinMiter**.

### MiterLimit

Syntax: *pen*.**MiterLimit** [ **=** *limit* ]

Gets or sets how far a mitered corner may reach, a **Single**, as a ratio to the width of the pen. A corner that would reach further is cut off flat. The default is 10, and a value below 1 becomes 1.

### Alignment

Syntax: *pen*.**Alignment** [ **=** *alignment* ]

Gets or sets the [**GpPenAlignment**](Enumerations/GpPenAlignment). With **PenAlignmentCenter**, the default, the line of a shape is centred on its edge. With **PenAlignmentInset**, the whole width of the pen lies inside the shape.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(14!, 10!)
Dim g As Graphics = Graphics(bmp)
Dim linePen As Pen = Pen(Color(255, 255, 0, 0), 2)
Debug.Print linePen.LineJoin & " " & linePen.MiterLimit & " " & linePen.Alignment

linePen.LineJoin = LineJoinRound
linePen.MiterLimit = 4
Debug.Print linePen.LineJoin & " " & linePen.MiterLimit

Dim x As Long, y As Long, row As String, pass As Long
For pass = 1 To 2
    g.Clear Color(255, 255, 255, 255)
    g.DrawRectangle linePen, 4, 2, 6, 6
    For y = 0 To 9
        row = ""
        For x = 0 To 13
            row = row & IIf(bmp.Pixel(x, y).argb = &HFFFFFFFF, ".", "#")
        Next
        Debug.Print row
    Next
    linePen.Alignment = PenAlignmentInset
Next
' Output:
' 0 10 0
' 2 4
' ..............
' ....######....
' ...########...
' ...##....##...
' ...##....##...
' ...##....##...
' ...##....##...
' ...########...
' ...########...
' ..............
' ..............
' ..............
' ....######....
' ....######....
' ....##..##....
' ....##..##....
' ....######....
' ....######....
' ..............
' ..............
```

## Transformations

A pen has a transformation that is applied to its line. Scaling it by different factors across and down, for example, makes the line thicker in one direction. The *order* parameter of each method is a [**GpMatrixOrder**](Enumerations/GpMatrixOrder): **MatrixOrderPrepend**, the default, applies the new operation before those the pen already has, and **MatrixOrderAppend** applies it after. The methods return a [**GpStatus**](Enumerations/GpStatus). **Pen** does not implement [**ITransformable**](ITransformable) and has no **GetTransform** or **RotateTransformAt**.

### Transform

Syntax: *pen*.**Transform** [ **=** *matrix* ]

Sets the transformation of the pen to a [**Matrix**](Matrix). Reading it should return a copy of the matrix.

> [!NOTE] 0.9.45.0
> Reading **Transform** always fails: it returns **Nothing** and **LastResult** becomes **InvalidParameter**. Keep the matrix that was set.

### ResetTransform

Syntax: *pen*.**ResetTransform**( )

Sets the transformation to the identity matrix.

### MultiplyTransform

Syntax: *pen*.**MultiplyTransform**( *matrix* [, *order*] )

Combines the transformation with a **Matrix**.

### TranslateTransform

Syntax: *pen*.**TranslateTransform**( *dx*, *dy* [, *order*] )

Syntax: *pen*.**TranslateTransform**( *delta* [, *order*] )

Moves the line by *dx* and *dy*, or by a **GpPointF**.

### ScaleTransform

Syntax: *pen*.**ScaleTransform**( *sx*, *sy* [, *order*] )

Scales the pen by the factors *sx* across and *sy* down. Scaling a horizontal line by (1, 3) makes it three times as thick.

### RotateTransform

Syntax: *pen*.**RotateTransform**( *angle* [, *order*] )

Rotates the pen by *angle* degrees clockwise.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(10!, 20!)
Dim g As Graphics = Graphics(bmp)
Dim tall As Pen = Pen(Color(255, 255, 0, 0), 2)
Debug.Print tall.ScaleTransform(1, 3)

Dim y As Long, column As String
g.Clear Color(255, 255, 255, 255)
g.DrawLine tall, 0, 10, 10, 10
For y = 0 To 19
    column = column & IIf(bmp.Pixel(5, y).argb = &HFFFFFFFF, ".", "#")
Next
Debug.Print column

Dim m As Matrix = tall.Transform
Debug.Print tall.LastResult & " " & (m Is Nothing)

tall.ResetTransform
g.Clear Color(255, 255, 255, 255)
g.DrawLine tall, 0, 10, 10, 10
column = ""
For y = 0 To 19
    column = column & IIf(bmp.Pixel(5, y).argb = &HFFFFFFFF, ".", "#")
Next
Debug.Print column
' Output:
' 0
' .......######.......
' 2 True
' .........##.........
```

## See Also

- [Pen](https://learn.microsoft.com/en-us/windows/win32/api/gdipluspen/nl-gdipluspen-pen) -- Microsoft's documentation of the GDI+ class
- [Graphics](Graphics) class
- [IBrush](IBrush) interface
- [CustomLineCap](CustomLineCap) class
- [ArrowCap](ArrowCap) class
- [GpLineCap](Enumerations/GpLineCap) enumeration
- [GpDashStyle](Enumerations/GpDashStyle) enumeration
- [GpPenAlignment](Enumerations/GpPenAlignment) enumeration
