---
title: CustomLineCap
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/CustomLineCap
---

# CustomLineCap class
{: .no_toc }

A line cap whose shape is a path: a mark that a [**Pen**](Pen) draws at the start or at the end of a line.

A **CustomLineCap** is made from one or two [**GraphicsPath**](GraphicsPath) objects: a path that is filled with the colour of the pen, and a path that is outlined with it. It is attached to a pen with [**CustomStartCap**](Pen#customstartcap) or [**CustomEndCap**](Pen#customendcap). [**ArrowCap**](ArrowCap), the arrow-shaped cap, inherits from this class. The class mirrors the GDI+ [CustomLineCap](https://learn.microsoft.com/en-us/windows/win32/api/gdipluslinecaps/nl-gdipluslinecaps-customlinecap) class.

* TOC
{:toc}

## Creating

Syntax: *cap* **= CustomLineCap**( *fillPath*, *strokePath* [, *baseCap* [, *baseInset*]] )

Syntax: *cap* **= New CustomLineCap**( *fillPath*, *strokePath* [, *baseCap* [, *baseInset*]] )

*fillPath*
: *required* A [**GraphicsPath**](GraphicsPath) that is filled, or **Nothing**.

*strokePath*
: *required* A **GraphicsPath** that is outlined, or **Nothing**. At least one of the two paths must be given; both are accepted.

*baseCap*
: *optional* A [**GpLineCap**](Enumerations/GpLineCap) value for the shape of the line where it meets the cap. The default is **LineCapFlat**.

*baseInset*
: *optional* A **Long**: the distance between the end of the line and the base of the cap, as a multiple of the pen width. The default is 0.

The two forms are one thing. The paths use their own coordinate system, with its origin at the end of the line. The x axis runs across the line. The y axis runs along it: the negative y values are back along the line, towards the other end, and the positive y values lie beyond the end of the line. The cap is scaled by the width of the pen, and a pen narrower than 2 counts as 2.

> [!NOTE] 0.9.45.0
> *baseInset* is a **Long**, so a fraction is cut off. The [**BaseInset**](#baseinset) property takes a **Single**.

The example draws a line that ends in a small filled rectangle. The path is two units wide and one unit long, behind the end of the line, and the pen is 2 wide: the cap is 4 rows tall and 2 columns long. **#** is a pixel of the pen.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim fill As GraphicsPath = New GraphicsPath()
fill.AddRectangle(-1, -1, 2, 1)
Dim noStroke As GraphicsPath

Dim cap As CustomLineCap = New CustomLineCap(fill, noStroke)
Dim linePen As Pen = Pen(Color(255, 255, 0, 0), 2)
linePen.CustomEndCap = cap

Dim bmp As Bitmap = Bitmap(30!, 10!)
Dim g As Graphics = Graphics(bmp)
g.Clear Color(255, 255, 255, 255)
g.DrawLine linePen, 2, 5, 20, 5

Dim x As Long, y As Long, row As String
For y = 1 To 8
    row = ""
    For x = 0 To 29
        row = row & IIf(bmp.Pixel(x, y).argb = &HFFFFFFFF, ".", "#")
    Next
    Debug.Print row
Next
' Output:
' ..............................
' ..............................
' ..................##..........
' ..##################..........
' ..##################..........
' ..................##..........
' ..............................
' ..............................
```

### Clone

Syntax: *copy* **=** *cap*.**Clone**( )

Returns a new **CustomLineCap** with the same paths and settings.

## Properties

### BaseCap

Syntax: *cap*.**BaseCap** [ **=** *baseCap* ]

Gets or sets the [**GpLineCap**](Enumerations/GpLineCap) that gives the shape of the line where it meets the cap.

### BaseInset

Syntax: *cap*.**BaseInset** [ **=** *inset* ]

Gets or sets the distance between the end of the line and the base of the cap, a **Single** that is a multiple of the pen width. A positive value ends the line earlier, so that it does not run into the cap.

### WidthScale

Syntax: *cap*.**WidthScale** [ **=** *scale* ]

Gets or sets the factor, a **Single**, by which the cap is scaled in addition to the scaling by the pen width. The default is 1.

### StrokeJoin

Syntax: *cap*.**StrokeJoin** [ **=** *lineJoin* ]

Gets or sets the [**GpLineJoin**](Enumerations/GpLineJoin) of the corners of the stroke path. The default is **LineJoinMiter**.

### StrokeCap

Syntax: *cap*.**StrokeCap** = *lineCap*

Sets the [**GpLineCap**](Enumerations/GpLineCap) of both ends of each line of the stroke path. The property cannot be read: read [**StartStrokeCap**](#startstrokecap) and [**EndStrokeCap**](#endstrokecap).

### StartStrokeCap

Syntax: *lineCap* **=** *cap*.**StartStrokeCap**

Reads the [**GpLineCap**](Enumerations/GpLineCap) of the start of each line of the stroke path. The default is **LineCapFlat**.

> [!WARNING] 0.9.45.0
> Assigning **StartStrokeCap** never returns. Assign [**StrokeCap**](#strokecap) to set both ends.

### EndStrokeCap

Syntax: *lineCap* **=** *cap*.**EndStrokeCap**

Reads the [**GpLineCap**](Enumerations/GpLineCap) of the end of each line of the stroke path. The default is **LineCapFlat**.

> [!WARNING] 0.9.45.0
> Assigning **EndStrokeCap** never returns. Assign [**StrokeCap**](#strokecap) to set both ends.

### SetStrokeCaps

Syntax: *status* **=** *cap*.**SetStrokeCaps**( [ *startCap* [, *endCap*]] )

Sets the start cap and the end cap of the stroke lines separately, and returns a [**GpStatus**](Enumerations/GpStatus). A cap that is left out, or given as -1, is not changed.

> [!WARNING] 0.9.45.0
> **SetStrokeCaps** never returns, unless both caps are left out. Assign [**StrokeCap**](#strokecap) to set both ends.

### GetStrokeCaps

Syntax: *status* **=** *cap*.**GetStrokeCaps**( [ *startCap* [, *endCap*]] )

Reads the start cap and the end cap into the variables given, and returns a [**GpStatus**](Enumerations/GpStatus). A variable that is left out is not read.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim fill As GraphicsPath = New GraphicsPath()
fill.AddRectangle(-1, -1, 2, 1)
Dim noStroke As GraphicsPath

Dim cap As CustomLineCap = New CustomLineCap(fill, noStroke, LineCapRound, 1)
Debug.Print cap.BaseCap & " " & cap.BaseInset & " " & cap.WidthScale & " " & cap.StrokeJoin

cap.BaseCap = LineCapSquare
cap.BaseInset = 0.5
cap.WidthScale = 2
cap.StrokeJoin = LineJoinBevel
Debug.Print cap.BaseCap & " " & cap.BaseInset & " " & cap.WidthScale & " " & cap.StrokeJoin

cap.StrokeCap = LineCapRound
Dim startCap As GpLineCap, endCap As GpLineCap
Debug.Print cap.GetStrokeCaps(startCap, endCap) & " " & startCap & " " & endCap
Debug.Print cap.StartStrokeCap & " " & cap.EndStrokeCap
' Output:
' 2 1 1 0
' 1 0.5 2 1
' 0 2 2
' 2 2
```

## Example

A line that stops short of its cap: the base inset ends the line 3 pen widths early, and the cap stays where it was.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim fill As GraphicsPath = New GraphicsPath()
fill.AddRectangle(-1, -1, 2, 1)
Dim noStroke As GraphicsPath

Dim cap As CustomLineCap = New CustomLineCap(fill, noStroke)
cap.BaseInset = 3

Dim linePen As Pen = Pen(Color(255, 255, 0, 0), 2)
linePen.CustomEndCap = cap

Dim bmp As Bitmap = Bitmap(30!, 10!)
Dim g As Graphics = Graphics(bmp)
g.Clear Color(255, 255, 255, 255)
g.DrawLine linePen, 2, 5, 20, 5

Dim x As Long, row As String
For x = 0 To 29
    row = row & IIf(bmp.Pixel(x, 4).argb = &HFFFFFFFF, ".", "#")
Next
Debug.Print row

Dim copy As CustomLineCap = cap.Clone()
Debug.Print copy.BaseInset
' Output:
' ..############....##..........
' 3
```

## See Also

- [CustomLineCap](https://learn.microsoft.com/en-us/windows/win32/api/gdipluslinecaps/nl-gdipluslinecaps-customlinecap) -- Microsoft's documentation of the GDI+ class
- [ArrowCap](ArrowCap) class
- [Pen](Pen) class
- [GraphicsPath](GraphicsPath) class
- [GpLineCap](Enumerations/GpLineCap) enumeration
- [GpLineJoin](Enumerations/GpLineJoin) enumeration
