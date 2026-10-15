---
title: ArrowCap
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/ArrowCap
---

# ArrowCap class
{: .no_toc }

A line cap in the shape of an arrowhead, filled or outlined: a mark that a [**Pen**](Pen) draws at the start or at the end of a line.

**ArrowCap** inherits from [**CustomLineCap**](CustomLineCap), so it has all the properties of that class, such as [**BaseCap**](CustomLineCap#basecap), [**BaseInset**](CustomLineCap#baseinset) and [**WidthScale**](CustomLineCap#widthscale), and the same limits. It adds the size of the arrowhead, the inset of its middle and whether it is filled. An arrow cap is attached to a pen with [**CustomStartCap**](Pen#customstartcap) or [**CustomEndCap**](Pen#customendcap). The class mirrors the GDI+ [AdjustableArrowCap](https://learn.microsoft.com/en-us/windows/win32/api/gdipluslinecaps/nl-gdipluslinecaps-adjustablearrowcap) class, and the name **AdjustableArrowCap** is an alias of **ArrowCap**.

* TOC
{:toc}

## Creating

Syntax: *cap* **= ArrowCap**( *height*, *width* [, *isFilled*] )

Syntax: *cap* **= ArrowCap**( *size* [, *isFilled*] )

Each form can also be written with **New**: *cap* **= New ArrowCap**( ... ). The two are one thing.

*height*
: *required* A **Single**: the length of the arrowhead, from its tip to its base.

*width*
: *required* A **Single**: the width of the arrowhead at its base.

*size*
: *required* A **GpSizeF** that holds the width and the height.

*isFilled*
: *optional* A **Boolean**: **True** for a filled arrowhead and **False** for an outline. The default is **True**.

Note that the height comes before the width. Both are multiples of the pen width, and a pen narrower than 2 counts as 2. A new arrow cap has the base cap **LineCapTriangle**.

### Clone

Syntax: *copy* **=** *cap*.**Clone**( )

Returns a new **ArrowCap** with the same settings.

> [!WARNING] 0.9.45.0
> The copy is not usable: it does not hold the arrow, so each of its properties reports **InvalidParameter** in **LastResult** and returns 0 or **False**. Make a second cap with the same values instead.

## Properties

### Height

Syntax: *cap*.**Height** [ **=** *height* ]

Gets or sets the length of the arrowhead, a **Single**.

### Width

Syntax: *cap*.**Width** [ **=** *width* ]

Gets or sets the width of the arrowhead at its base, a **Single**.

### Size

Syntax: *cap*.**Size** [ **=** *size* ]

Gets or sets the width and the height together, as a **GpSizeF**.

### MiddleInset

Syntax: *cap*.**MiddleInset** [ **=** *inset* ]

Sets the distance, a **Single**, by which the middle of the base of the arrowhead is moved towards the tip. The default is 0, which leaves a plain triangle. A larger value cuts a notch into the base, like the tail of a dart.

> [!WARNING] 0.9.45.0
> Reading **MiddleInset** always returns 0, whatever was set. The setting itself works.

### FillState

Syntax: *cap*.**FillState** [ **=** *isFilled* ]

Gets or sets whether the arrowhead is filled, a **Boolean**. When it is not, only the outline is drawn.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim cap As ArrowCap = ArrowCap(3, 4)
Debug.Print cap.Height & " " & cap.Width & " " & cap.FillState

cap.Height = 7
cap.Width = 5
cap.FillState = False
Debug.Print cap.Height & " " & cap.Width & " " & cap.FillState

Dim size As GpSizeF = cap.Size
Debug.Print size.Width & " " & size.Height

cap.Size = GpSizeF(9, 8)
Debug.Print cap.Width & " " & cap.Height

cap.MiddleInset = 1.5
Debug.Print cap.MiddleInset
' Output:
' 3 4 True
' 7 5 False
' 5 7
' 9 8
' 0
```

## Inherited from CustomLineCap

[**BaseCap**](CustomLineCap#basecap), [**BaseInset**](CustomLineCap#baseinset), [**WidthScale**](CustomLineCap#widthscale), [**StrokeJoin**](CustomLineCap#strokejoin), [**StrokeCap**](CustomLineCap#strokecap), [**StartStrokeCap**](CustomLineCap#startstrokecap), [**EndStrokeCap**](CustomLineCap#endstrokecap), [**SetStrokeCaps**](CustomLineCap#setstrokecaps) and [**GetStrokeCaps**](CustomLineCap#getstrokecaps) work as on that page, with the same warnings: assigning **StartStrokeCap** or **EndStrokeCap**, and calling **SetStrokeCaps** with a cap, never return.

> [!WARNING] 0.9.45.0
> A pen that has an arrow cap returns it from [**CustomStartCap**](Pen#customstartcap) or [**CustomEndCap**](Pen#customendcap) as an **ArrowCap** that is not usable, like a clone: its members report **InvalidParameter** and return 0.

## Example

A filled arrowhead at the end of a line. The listing shows the columns 20 to 35. **#** is a pixel of the pen.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(36!, 12!)
Dim g As Graphics = Graphics(bmp)
Dim linePen As Pen = Pen(Color(255, 255, 0, 0), 2)
Dim cap As ArrowCap = ArrowCap(3, 3, True)
linePen.CustomEndCap = cap

g.Clear Color(255, 255, 255, 255)
g.DrawLine linePen, 2, 6, 30, 6

Dim x As Long, y As Long, row As String
For y = 2 To 10
    row = ""
    For x = 20 To 35
        row = row & IIf(bmp.Pixel(x, y).argb = &HFFFFFFFF, ".", "#")
    Next
    Debug.Print row
Next
' Output:
' ................
' ................
' ....##..........
' ########........
' ##########......
' ....####........
' ....##..........
' ................
' ................
```

## See Also

- [AdjustableArrowCap](https://learn.microsoft.com/en-us/windows/win32/api/gdipluslinecaps/nl-gdipluslinecaps-adjustablearrowcap) -- Microsoft's documentation of the GDI+ class
- [CustomLineCap](CustomLineCap) class
- [Pen](Pen) class
- [GpLineCap](Enumerations/GpLineCap) enumeration
