---
title: Graphics
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Graphics
has_toc: false
---

# Graphics class
{: .no_toc }

The drawing surface of GDI+: a **Graphics** object draws lines, shapes, text and images on a bitmap, a metafile, a window or a device context.

A **Graphics** object does all the rendering. It is created for one target, a [**Bitmap**](Bitmap), a [**Metafile**](Metafile), a window or a device context, and it keeps the state that applies to every later drawing call: the clipping area, the world transformation, the smoothing and text quality. A drawing call takes a [**Pen**](Pen) for outlines or a brush for fills, and the shape in either floating-point or integer coordinates. A **Graphics** object is meant to be short-lived. It starts its work when it is created and finishes it when the last reference to it is released.

**Graphics** implements [**ITransformable**](ITransformable) and [**IDeviceContext**](IDeviceContext). The class mirrors the GDI+ [Graphics](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusgraphics/nl-gdiplusgraphics-graphics) class of the C++ wrapper.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(16, 8, PixelFormat32bppARGB)
Dim g As Graphics = Graphics(bmp)
g.SmoothingMode = SmoothingModeNone

Dim red As Color = Color(255, 0, 0)
g.FillRectangle(SolidBrush(red), 2, 2, 4, 3)

Debug.Print bmp.Pixel(3, 3).Value = red.Value   ' True
Debug.Print bmp.Pixel(8, 3).Value = red.Value   ' False
```

* TOC
{:toc}

## Creating

A **Graphics** object is created with a package function of the same name as the class, or with **New**. Which function creates it depends on the target. A **Graphics** object that is created for a window or a device context draws on that target directly. A buffered one draws on a bitmap of its own and copies it to the target when the object is destroyed, so the target never shows a half-drawn picture.

A **Graphics** object does not own its target. The device context or window must stay valid for as long as the object exists. A **Graphics** object created for an image keeps a reference to the image, so the image is not released before the **Graphics** object.

<!-- test: none -- GDI+ is already started in the process of the test runner, so an object made with no GdiPlusUser alive does not fail with status 18 there -->
> [!NOTE] 0.9.45.0
> The package needs a [**GdiPlusUser**](GdiPlusUser) object to be alive for as long as any GDI+ object exists. A program creates one before the first **Graphics** object and keeps it.

### Graphics, GraphicsFromImage
{: #graphics }

Syntax: *graphics* **= Graphics**( *image* )

Syntax: *graphics* **= GraphicsFromImage**( *image* )

Syntax: *graphics* **= New Graphics**( *image* )

Creates a **Graphics** object that draws on an image.

*image*
: *required* An [**Image**](Image) to draw on. This is a [**Bitmap**](Bitmap), or a [**Metafile**](Metafile). Drawing on a **Metafile** records the drawing calls for later playback.

Drawing on a bitmap changes the pixels of the bitmap. The three forms are the same.

<!-- test: Gr_GraphicsTests.Graphics_NothingImage_ReportsError, Gr_GraphicsTests.NewGraphics_NothingImage_ReportsError, Gr_GraphicsTests.Graphics_NothingImage_DrawingFailsWithInvalidParameter -->
> [!NOTE] 0.9.45.0
> The function and the constructor with a value of **Nothing** do not report an error. They return an object whose **LastResult** is **Ok**, and every drawing call on it then fails with **InvalidParameter**.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(8, 8, PixelFormat32bppARGB)

Dim g As Graphics = Graphics(bmp)
Debug.Print g.LastResult                    ' 0
g.Clear(Color(0, 0, 255))
Debug.Print bmp.Pixel(4, 4).Value = Color(0, 0, 255).Value   ' True

Dim none As Graphics = Graphics(Nothing)
Debug.Print none.LastResult                 ' 0
Debug.Print none.Clear(Color(0, 0, 255))    ' 2
```

### GraphicsFromHDC

Syntax: *graphics* **= GraphicsFromHDC**( *hdc* [, *hdevice* ] )

Creates a **Graphics** object that draws on a device context.

*hdc*
: *required* A **LongPtr**: the handle of the device context.

*hdevice*
: *optional* A **LongPtr**: the handle of a device, for a device context that belongs to a printer. The default is 0.

### BufferedGraphicsFromHDC

Syntax: *graphics* **= BufferedGraphicsFromHDC**( *hdc*, *drawArea* )

Creates a buffered **Graphics** object for a device context. All drawing goes to a bitmap compatible with *hdc*. When the object is destroyed, the bitmap is copied to *hdc*.

*hdc*
: *required* A **LongPtr**: the handle of the device context, usually the one of a form that is being painted.

*drawArea*
: *required* A [**GpRect**](Types/GpRect): the area of *hdc* that is painted, in the coordinates of *hdc*.

This is the way to paint a form without flicker. A buffered **Graphics** object shows its result only when it is destroyed. Set the variable to **Nothing**, or let it go out of scope, before the procedure that painted ends.

### GraphicsFromHWND, GraphicsFromHWNDWithICM
{: #graphicsfromhwnd }

Syntax: *graphics* **= GraphicsFromHWND**( *hwnd* )

Syntax: *graphics* **= GraphicsFromHWNDWithICM**( *hwnd* )

Creates a **Graphics** object that draws on the client area of a window. **GraphicsFromHWNDWithICM** also applies image colour management (ICM) to what is drawn.

*hwnd*
: *required* A **LongPtr**: the handle of the window.

### BufferedGraphicsFromHWND

Syntax: *graphics* **= BufferedGraphicsFromHWND**( *hwnd* )

Creates a buffered **Graphics** object for a window that is handling a `WM_PAINT` message. The function calls the Windows function `BeginPaint` for the window and `BeginBufferedPaint` for the area that needs painting. Destroying the object copies the buffer to the window and ends the painting (`EndPaint`). There is no ICM form of this function.

*hwnd*
: *required* A **LongPtr**: the handle of the window.

> [!IMPORTANT] 0.9.45.0
> Create the object only while handling `WM_PAINT`, and do not call `BeginPaint` or `EndPaint` for the window in the same handler: the object does both.

### Graphics (options)

Syntax: *graphics* **= Graphics**( *options*, *h1*, *h2* )

Syntax: *graphics* **= New Graphics**( *options*, *h1* [, *h2* ] )

The general constructor, which the functions above call.

*options*
: *required* A [**GraphicsCreationOptions**](Enumerations/GraphicsCreationOptions) value, or several added together. One of **FromHDC** and **FromHWND** names the kind of *h1*. **Buffered**, **WithHDevice** and **WithICM** change how the object is created.

*h1*
: *required* The handle of the device context or window.

*h2*
: *required* in the function, *optional* in **New**. With **FromHDC** and **WithHDevice**, the handle of the device. With **FromHDC** and **Buffered**, a pointer to a **RECT** that holds the area to paint. With **FromHWND** and **Buffered**, a pointer to a `BP_PAINTPARAMS` structure, or 0. Otherwise 0.

The function takes *h1* and *h2* as **Long** and **New** as **LongPtr**. Use the specific functions above in preference to this one.

## Painting a window or a form

The rendering period of a **Graphics** object starts when it is created and ends when it is destroyed. For a window, a program creates the object in its paint handler, draws, and releases it. A program that handles the window messages itself creates the buffered object for the window when it receives `WM_PAINT`:

```tb check_build slot=module
Private Const WM_CREATE = &H1
Private Const WM_DESTROY = &H2
Private Const WM_SIZE = &H5
Private Const WM_PAINT = &HF

Private Declare PtrSafe Function InvalidateRect Lib "user32" (ByVal hWnd As LongPtr, ByVal lpRect As LongPtr, ByVal bErase As Long) As Long
Private Declare PtrSafe Function DefWindowProcW Lib "user32" (ByVal hWnd As LongPtr, ByVal msg As Long, ByVal wParam As LongPtr, ByVal lParam As LongPtr) As LongPtr

Private mUser As GdiPlusUser

Public Function WndProc(ByVal hWnd As LongPtr, ByVal message As Long, ByVal wParam As LongPtr, ByVal lParam As LongPtr) As LongPtr
    Select Case message
        Case WM_CREATE
            Set mUser = GdiPlusUser()
        Case WM_PAINT
            Dim gr As Graphics = BufferedGraphicsFromHWND(hWnd)
            gr.Clear(Color(255, 255, 255))
            gr.DrawLine(Pen(Color(0, 0, 255), 3), 10, 10, 100, 60)
            Set gr = Nothing      ' copies the buffer to the window
            Return 0
        Case WM_SIZE
            InvalidateRect hWnd, 0, 0
        Case WM_DESTROY
            Set mUser = Nothing
    End Select
    Return DefWindowProcW(hWnd, message, wParam, lParam)
End Function
```

In a form, the **Paint** event gives the form's device context in the **hDC** property. The form creates its **GdiPlusUser** when it loads, and repaints when it is resized:

```tb check_build inherits=Form
Dim mGdiPlus As GdiPlusUser

Sub Form_Load()
    ScaleMode = vbPixels
    Set mGdiPlus = GdiPlusUser()
End Sub

Sub Form_Paint()
    Dim area As GpRect = GpRect(0, 0, ScaleWidth, ScaleHeight)
    Dim gr As Graphics = BufferedGraphicsFromHDC(hDC, area)
    gr.Clear(Color(255, 255, 255))
    gr.DrawString("Hello", GdiPlus.Font("Segoe UI", 20), GpPointF(20, 20), SolidBrush(Color(0, 0, 0)))
    Set gr = Nothing
End Sub

Sub Form_Resize()
    Refresh
End Sub
```

<!-- test: none -- GDI+ is already started in the process of the test runner, so a Graphics made before the first use of a Dim As New GdiPlusUser variable does not fail with status 18 there; it fails only in a program that has not started GDI+ yet -->
> [!WARNING] 0.9.45.0
> A **GdiPlusUser** declared with **Dim ... As New** is not created until the variable is first used, so the GDI+ objects that are created before that fail with **GdiplusNotInitialized** (18). Declare the variable and set it with `Set mGdiPlus = GdiPlusUser()` in the **Load** event, as above.

## Status and results

A method that does not return a value returns a [**GpStatus**](Enumerations/GpStatus): **Ok** (0), or the reason it failed. The same status is stored in the **LastResult** property, which the **Graphics** class inherits from the package's base class together with **Status**, **StatusNL**, **ClearResult** and **GetLastResult**. A property, or a function that returns a value, returns no status: read **LastResult** after the call. **LastResult** keeps the most recent error. It is not set back to **Ok** by a call that succeeds, only by **ClearResult** and **GetLastResult**.

What happens on an error is set for the whole package by the global variable **GdipErrorHandlingStrategy**: the error can be ignored, raised as an error, passed to a handler or stopped at with **Stop**. The default is to ignore it, so the examples on this page read **LastResult** and the returned status.

In the descriptions below, a method with no result mentioned returns the **GpStatus**.

## Flush

### Flush

Syntax: *status* **=** *graphics*.**Flush**( *intention* )

Forces the pending drawing operations to be executed.

*intention*
: *required* A [**GpFlushIntention**](Enumerations/GpFlushIntention). **FlushIntentionFlush** returns at once. **FlushIntentionSync** returns when the operations have been completed.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(4, 4, PixelFormat32bppARGB)
Dim g As Graphics = Graphics(bmp)

g.Clear(Color(255, 0, 0))
Debug.Print g.Flush(FlushIntentionSync)    ' 0
```

### SetAbort

Syntax: *status* **=** *graphics*.**SetAbort**( *pIAbort* )

*pIAbort*
: *required* A **LongPtr** to a GDI+ abort object.

The method calls the GDI+ function that sets an abort callback. The callback is not implemented in GDI+ 1.0 and 1.1, which are the versions that Windows has.

## Bulk clearing

### Clear

Syntax: *graphics*.**Clear**( *color* )

Syntax: *graphics*.**Clear**( *rgb* )

Fills the whole drawing surface with a colour. The colour replaces what was there, its alpha value included. The clipping area applies.

*color*
: *required* A [**Color**](Types/Color).

*rgb*
: *required* A **Long** colour.

<!-- test: Gr_GraphicsTests.Clear_VBColourRed_FillsRed, Gr_GraphicsTests.Clear_RGBFunction_FillsThatColour, Gr_GraphicsTests.Clear_CColorTransparent_KeepsAlpha, Gr_GraphicsTests.Clear_ColorForm_FillsExactColour -->
> [!WARNING] 0.9.45.0
> The *rgb* form reads its **Long** as `&H00RRGGBB`, not as a VB colour: `Clear(vbRed)` and `Clear(RGB(255, 0, 0))` fill with blue. It also forces the alpha value to 255, so a [**CColor**](Enumerations/CColor) member passed to it loses its alpha. Pass a **Color**, as in `Clear(Color(255, 0, 0))`.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(4, 4, PixelFormat32bppARGB)
Dim g As Graphics = Graphics(bmp)

g.Clear(Color(255, 0, 0))
Debug.Print bmp.Pixel(1, 1).Value = Color(255, 0, 0).Value   ' True

g.Clear(Color(0, 0, 0, 0))                                   ' fully transparent
Debug.Print bmp.Pixel(1, 1).Value = 0                        ' True

g.Clear(RGB(255, 0, 0))                                      ' the Long form: blue
Debug.Print bmp.Pixel(1, 1).Value = Color(0, 0, 255).Value   ' True

g.SetClip(GpRect(0, 0, 2, 2))                                ' the clipping area applies
g.Clear(Color(0, 255, 0))
Debug.Print bmp.Pixel(1, 1).Value = Color(0, 255, 0).Value   ' True
Debug.Print bmp.Pixel(3, 3).Value = Color(0, 255, 0).Value   ' False
```

## Outline drawing

The methods that draw outlines take a [**Pen**](Pen) first. The outline is centred on the edge of the shape, so with a one-pixel pen and no smoothing, **DrawRectangle** with the width 4 covers 5 pixels. An angle is in degrees. A start angle of 0 is the direction of the positive x axis, to the right, and a positive sweep angle turns clockwise on the screen. A *pen* of **Nothing** is an error: the call returns **InvalidParameter** and draws nothing.

Almost every method exists in two sets of overloads. The floating-point set takes **Single**, [**GpPointF**](Types/GpPointF), [**GpSizeF**](Types/GpSizeF) and [**GpRectF**](Types/GpRectF), and arrays of them. The integer set takes **Long**, [**GpPoint**](Types/GpPoint), [**GpSize**](Types/GpSize) and [**GpRect**](Types/GpRect), and arrays of them. The two never mix in one call. When a method has overloads that take plain coordinates, the integer one has the suffix `I`: **DrawLineI**. The overloads with a point, a size or a rectangle have the same name in both sets.

<!-- test: Gr_GraphicsTests.DrawLine_WholeNumbers_DrawsBetweenThePoints -->
> [!NOTE] 0.9.45.0
> A whole number written in the source is a **Long**, but the call `DrawLine(pen, 0, 5, 15, 5)` takes the floating-point overload: **Long** converts to **Single**. Call the `I` method to use the integer set with plain coordinates.

### DrawLine, DrawLineI
{: #drawline }

Syntax: *graphics*.**DrawLine**( *pen*, *x1*, *y1*, *x2*, *y2* )

Syntax: *graphics*.**DrawLine**( *pen*, *pt1*, *pt2* )

Syntax: *graphics*.**DrawLine**( *pen*, *rect* )

Syntax: *graphics*.**DrawLineI**( *pen*, *x1*, *y1*, *x2*, *y2* )

Draws a line.

*pen*
: *required* The [**Pen**](Pen).

*x1*, *y1*, *x2*, *y2*
: *required* **Single** (**Long** for **DrawLineI**): the start and end points.

*pt1*, *pt2*
: *required* [**GpPointF**](Types/GpPointF) or [**GpPoint**](Types/GpPoint): the start and end points.

*rect*
: *required* [**GpRectF**](Types/GpRectF) or [**GpRect**](Types/GpRect). The line is the diagonal of the rectangle from its top left corner to its bottom right corner.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(16, 12, PixelFormat32bppARGB)
Dim g As Graphics = Graphics(bmp)
g.SmoothingMode = SmoothingModeNone

Dim red As Color = Color(255, 0, 0)
Dim p As Pen = Pen(red, 1)

g.DrawLine(p, 1, 2, 14, 2)                      ' from (1, 2) to (14, 2)
g.DrawLine(p, GpPointF(1, 5), GpPointF(14, 5))
g.DrawLine(p, GpRectF(4, 7, 3, 3))              ' from (4, 7) to (7, 10)

Debug.Print bmp.Pixel(1, 2).Value = red.Value    ' True
Debug.Print bmp.Pixel(14, 2).Value = red.Value   ' True
Debug.Print bmp.Pixel(8, 2).Value = red.Value    ' True
Debug.Print bmp.Pixel(8, 3).Value = red.Value    ' False
Debug.Print bmp.Pixel(8, 5).Value = red.Value    ' True
Debug.Print bmp.Pixel(4, 7).Value = red.Value    ' True
Debug.Print bmp.Pixel(7, 10).Value = red.Value   ' True

Dim noPen As Pen = Nothing
Debug.Print g.DrawLine(noPen, 0, 0, 5, 5)        ' 2
```

### DrawLines

Syntax: *graphics*.**DrawLines**( *pen*, *points* )

Draws a series of connected lines through the points.

*pen*
: *required* The [**Pen**](Pen).

*points*
: *required* An array of [**GpPointF**](Types/GpPointF) or [**GpPoint**](Types/GpPoint). The array has at least two points.

### DrawArc, DrawArcI
{: #drawarc }

Syntax: *graphics*.**DrawArc**( *pen*, *x*, *y*, *width*, *height*, *startAngle*, *sweepAngle* )

Syntax: *graphics*.**DrawArc**( *pen*, *pt*, *size*, *startAngle*, *sweepAngle* )

Syntax: *graphics*.**DrawArc**( *pen*, *rect*, *startAngle*, *sweepAngle* )

Syntax: *graphics*.**DrawArcI**( *pen*, *x*, *y*, *width*, *height*, *startAngle*, *sweepAngle* )

Draws part of the outline of an ellipse.

*pen*
: *required* The [**Pen**](Pen).

*x*, *y*, *width*, *height*
: *required* **Single** (**Long** for **DrawArcI**): the bounding rectangle of the whole ellipse.

*pt*, *size*
: *required* The upper left corner and the size of the bounding rectangle: [**GpPointF**](Types/GpPointF) and [**GpSizeF**](Types/GpSizeF), or [**GpPoint**](Types/GpPoint) and [**GpSize**](Types/GpSize).

*rect*
: *required* The bounding rectangle: [**GpRectF**](Types/GpRectF) or [**GpRect**](Types/GpRect).

*startAngle*
: *required* A **Single**: the angle in degrees from the x axis to the start of the arc.

*sweepAngle*
: *required* A **Single**: the angle in degrees from *startAngle* to the end of the arc. A positive angle is clockwise.

### DrawBezier, DrawBezierI
{: #drawbezier }

Syntax: *graphics*.**DrawBezier**( *pen*, *x1*, *y1*, *x2*, *y2*, *x3*, *y3*, *x4*, *y4* )

Syntax: *graphics*.**DrawBezier**( *pen*, *pt1*, *pt2*, *pt3*, *pt4* )

Syntax: *graphics*.**DrawBezierI**( *pen*, *x1*, *y1*, *x2*, *y2*, *x3*, *y3*, *x4*, *y4* )

Draws a Bezier curve. The curve starts at the first point and ends at the fourth. The second and third points are control points that shape it.

*pen*
: *required* The [**Pen**](Pen).

*x1*, *y1*, ..., *x4*, *y4*
: *required* **Single** (**Long** for **DrawBezierI**): the four points.

*pt1*, *pt2*, *pt3*, *pt4*
: *required* [**GpPointF**](Types/GpPointF) or [**GpPoint**](Types/GpPoint): the four points.

### DrawBeziers

Syntax: *graphics*.**DrawBeziers**( *pen*, *points* )

Draws a series of connected Bezier curves.

*pen*
: *required* The [**Pen**](Pen).

*points*
: *required* An array of [**GpPointF**](Types/GpPointF) or [**GpPoint**](Types/GpPoint). The first curve takes four points, and each further curve takes the end point of the previous one and three more, so the array has 3n + 1 points.

### DrawRectangle, DrawRectangleI
{: #drawrectangle }

Syntax: *graphics*.**DrawRectangle**( *pen*, *x*, *y*, *width*, *height* )

Syntax: *graphics*.**DrawRectangle**( *pen*, *pt*, *size* )

Syntax: *graphics*.**DrawRectangle**( *pen*, *rect* )

Syntax: *graphics*.**DrawRectangleI**( *pen*, *x*, *y*, *width*, *height* )

Draws the outline of a rectangle.

*pen*
: *required* The [**Pen**](Pen).

*x*, *y*, *width*, *height*
: *required* **Single** (**Long** for **DrawRectangleI**): the rectangle.

*pt*, *size*
: *required* The upper left corner and the size.

*rect*
: *required* The rectangle: [**GpRectF**](Types/GpRectF) or [**GpRect**](Types/GpRect).

### DrawRectangles

Syntax: *graphics*.**DrawRectangles**( *pen*, *rects* )

Draws the outlines of several rectangles.

*pen*
: *required* The [**Pen**](Pen).

*rects*
: *required* An array of [**GpRectF**](Types/GpRectF) or [**GpRect**](Types/GpRect).

### DrawEllipse, DrawEllipseI
{: #drawellipse }

Syntax: *graphics*.**DrawEllipse**( *pen*, *x*, *y*, *width*, *height* )

Syntax: *graphics*.**DrawEllipse**( *pen*, *pt*, *size* )

Syntax: *graphics*.**DrawEllipse**( *pen*, *rect* )

Syntax: *graphics*.**DrawEllipseI**( *pen*, *x*, *y*, *width*, *height* )

Draws the outline of an ellipse that fits in a rectangle.

*pen*
: *required* The [**Pen**](Pen).

*x*, *y*, *width*, *height*
: *required* **Single** (**Long** for **DrawEllipseI**): the bounding rectangle.

*pt*, *size*
: *required* The upper left corner and the size of the bounding rectangle.

*rect*
: *required* The bounding rectangle: [**GpRectF**](Types/GpRectF) or [**GpRect**](Types/GpRect).

### DrawPie, DrawPieI
{: #drawpie }

Syntax: *graphics*.**DrawPie**( *pen*, *x*, *y*, *width*, *height*, *startAngle*, *sweepAngle* )

Syntax: *graphics*.**DrawPie**( *pen*, *pt*, *size*, *startAngle*, *sweepAngle* )

Syntax: *graphics*.**DrawPie**( *pen*, *rect*, *startAngle*, *sweepAngle* )

Syntax: *graphics*.**DrawPieI**( *pen*, *x*, *y*, *width*, *height*, *startAngle*, *sweepAngle* )

Draws the outline of a pie slice: an arc of an ellipse and the two straight lines from its ends to the centre of the ellipse. The parameters are the ones of [**DrawArc**](#drawarc).

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(20, 20, PixelFormat32bppARGB)
Dim g As Graphics = Graphics(bmp)
g.SmoothingMode = SmoothingModeNone

Dim red As Color = Color(255, 0, 0)
Dim p As Pen = Pen(red, 1)

' A rectangle of width 4 covers 5 pixels with a one-pixel pen
g.DrawRectangle(p, 2, 2, 4, 4)
Debug.Print bmp.Pixel(6, 4).Value = red.Value     ' True
Debug.Print bmp.Pixel(7, 4).Value = red.Value     ' False

' A quarter of a circle, from 3 o'clock clockwise to 6 o'clock
g.Clear(Color(0, 0, 0, 0))
g.DrawArc(p, 2, 2, 16, 16, 0, 90)
Debug.Print bmp.Pixel(18, 10).Value = red.Value   ' True -- the start, at 3 o'clock
Debug.Print bmp.Pixel(10, 18).Value = red.Value   ' True -- the end, at 6 o'clock
Debug.Print bmp.Pixel(2, 10).Value = red.Value    ' False -- 9 o'clock is not on the arc

' The same quarter as a pie slice adds the two radii
g.Clear(Color(0, 0, 0, 0))
g.DrawPie(p, 2, 2, 16, 16, 0, 90)
Debug.Print bmp.Pixel(14, 10).Value = red.Value   ' True -- on the horizontal radius
Debug.Print bmp.Pixel(10, 14).Value = red.Value   ' True -- on the vertical radius

' The outline of an ellipse in a rectangle that is 16 wide and 8 high
g.Clear(Color(0, 0, 0, 0))
g.DrawEllipse(p, 2, 4, 16, 8)
Debug.Print bmp.Pixel(2, 8).Value = red.Value     ' True -- the left end
Debug.Print bmp.Pixel(10, 4).Value = red.Value    ' True -- the top
Debug.Print bmp.Pixel(10, 8).Value = red.Value    ' False -- the centre
```

### DrawPolygon

Syntax: *graphics*.**DrawPolygon**( *pen*, *points* )

Draws the outline of a polygon. The last point is joined to the first.

*pen*
: *required* The [**Pen**](Pen).

*points*
: *required* An array of [**GpPointF**](Types/GpPointF) or [**GpPoint**](Types/GpPoint).

### DrawPath

Syntax: *graphics*.**DrawPath**( [ *pen* [, *path* ] ] )

Draws the outline of a path.

*pen*
: *optional* The [**Pen**](Pen).

*path*
: *optional* The [**GraphicsPath**](GraphicsPath).

Both parameters are optional only in the declaration. A call without them, or with **Nothing**, draws nothing and returns **InvalidParameter**.

### DrawCurve

Syntax: *graphics*.**DrawCurve**( *pen*, *points* )

Syntax: *graphics*.**DrawCurve**( *pen*, *points*, *tension* )

Syntax: *graphics*.**DrawCurve**( *pen*, *points*, *offset*, *numberOfSegments* [, *tension* ] )

Draws a cardinal spline: a smooth curve that passes through every point.

*pen*
: *required* The [**Pen**](Pen).

*points*
: *required* An array of [**GpPointF**](Types/GpPointF) or [**GpPoint**](Types/GpPoint).

*tension*
: *optional* A **Single** that sets how sharply the curve bends at the points. 0 joins the points with straight lines. The default is 0.5.

*offset*
: *required* A **Long**: the index of the first point of the array that is used. The index counts from 0, whatever the lower bound of the array is.

*numberOfSegments*
: *required* A **Long**: the number of segments to draw after the first point.

### DrawClosedCurve

Syntax: *graphics*.**DrawClosedCurve**( *pen*, *points* [, *tension* ] )

Draws a closed cardinal spline: the curve passes through every point and returns from the last point to the first.

*pen*
: *required* The [**Pen**](Pen).

*points*
: *required* An array of [**GpPointF**](Types/GpPointF) or [**GpPoint**](Types/GpPoint).

*tension*
: *optional* A **Single**: the tension of the curve. The default is 0.5.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(24, 24, PixelFormat32bppARGB)
Dim g As Graphics = Graphics(bmp)
g.SmoothingMode = SmoothingModeNone

Dim red As Color = Color(255, 0, 0)
Dim p As Pen = Pen(red, 1)

Dim star(1 To 5) As GpPointF
star(1) = GpPointF(12, 1)
star(2) = GpPointF(18, 22)
star(3) = GpPointF(2, 9)
star(4) = GpPointF(22, 9)
star(5) = GpPointF(6, 22)

g.DrawPolygon(p, star)
Debug.Print bmp.Pixel(12, 1).Value = red.Value    ' True -- a vertex
Debug.Print bmp.Pixel(12, 9).Value = red.Value    ' True -- on the edge from (2, 9) to (22, 9)
Debug.Print bmp.Pixel(12, 14).Value = red.Value   ' False -- the centre is empty

' A Bezier curve starts at its first point and ends at its fourth
g.Clear(Color(0, 0, 0, 0))
g.DrawBezier(p, 1, 20, 6, 2, 18, 2, 22, 20)
Debug.Print bmp.Pixel(1, 20).Value = red.Value    ' True
Debug.Print bmp.Pixel(22, 20).Value = red.Value   ' True
Debug.Print bmp.Pixel(6, 2).Value = red.Value     ' False -- a control point is not on the curve
```

### DrawString

Syntax: *graphics*.**DrawString**( *str*, *font*, *layoutRect*, *format*, *brush* )

Syntax: *graphics*.**DrawString**( *str*, *font*, *origin*, *brush* )

Syntax: *graphics*.**DrawString**( *str*, *font*, *x*, *y*, *brush* )

Syntax: *graphics*.**DrawString**( *str*, *font*, *origin*, *format*, *brush* )

Syntax: *graphics*.**DrawString**( *str*, *font*, *x*, *y*, *format*, *brush* )

Draws a string.

*str*
: *required* A **String**. A null string is drawn as an empty string.

*font*
: *required* The [**Font**](Font) that is used.

*layoutRect*
: *required* A [**GpRectF**](Types/GpRectF): the rectangle that the text is laid out in. The text wraps at its width and is clipped to it, as *format* directs.

*origin*
: *required* A [**GpPointF**](Types/GpPointF): the upper left corner of the text.

*x*, *y*
: *required* **Single**: the upper left corner of the text.

*format*
: *required* A [**StringFormat**](StringFormat) with the alignment, wrapping and trimming, or **Nothing** for the generic default format. The forms without *format* use the default format.

*brush*
: *required* The brush that paints the characters.

The text methods have no integer overloads.

<!-- test: Gr_GraphicsTests.Font_AssignedToAVariableOfTheStdoleType_Fails, Gr_GraphicsTests.Font_AssignedToAGdiPlusFontVariable_IsUsable, Gr_GraphicsTests.DrawString_PrefixedFont_Draws, compile GrQualifiedFontCompiles, compile GrNewBareFontIsNotThePackagesClass -->
> [!NOTE] 0.9.45.0
> **Font** is also the name of the standard font type of the **stdole** library. A variable declared `As Font` has that type, and the package's font cannot be assigned to it: the assignment raises error -2147467262, *No such interface supported*. Declare the variable with the prefix, as in `Dim f As GdiPlus.Font = GdiPlus.Font("Segoe UI", 12)`. The function `Font(...)` itself needs no prefix.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(120, 40, PixelFormat32bppARGB)
Dim g As Graphics = Graphics(bmp)

Dim f As GdiPlus.Font = GdiPlus.Font("Arial", 14)
Dim black As SolidBrush = SolidBrush(Color(0, 0, 0))

Debug.Print g.DrawString("Text", f, 10, 5, black)   ' 0

' Some pixels in the area of the text are no longer transparent
Dim n As Long, x As Long, y As Long
For y = 5 To 30
    For x = 10 To 80
        If bmp.Pixel(x, y).Value <> 0 Then n = n + 1
    Next
Next
Debug.Print n > 20                                  ' True
```

### DrawDriverString

Syntax: *graphics*.**DrawDriverString**( *str*, *font*, *brush*, *position*, *flags*, *matrix* )

Syntax: *graphics*.**DrawDriverString**( *str*, *font*, *brush*, *positions*, *flags*, *matrix* )

Syntax: *graphics*.**DrawDriverString**( *glyphs*, *font*, *brush*, *position*, *flags*, *matrix* )

Syntax: *graphics*.**DrawDriverString**( *glyphs*, *font*, *brush*, *positions*, *flags*, *matrix* )

Draws characters, or glyphs of the font, at positions that the program gives. This is the low-level text function that a text layout engine uses.

*str*
: *required* A **String**. Its characters are looked up in the font's character map (**DriverStringOptionsCmapLookup** is always set).

*glyphs*
: *required* An array of **Integer**: glyph indexes of the font. **DriverStringOptionsCmapLookup** is never set.

*font*
: *required* The [**Font**](Font) that is used.

*brush*
: *required* The brush that paints the glyphs.

*position*
: *required* A [**GpPointF**](Types/GpPointF): the origin of the first glyph. The others follow it, each placed by the advance width of the glyph before it (**DriverStringOptionsRealizedAdvance** is always set).

*positions*
: *required* An array of [**GpPointF**](Types/GpPointF) with the origin of each glyph (**DriverStringOptionsRealizedAdvance** is never set).

*flags*
: *required* A [**GpDriverStringOptions**](Enumerations/GpDriverStringOptions) value. The methods set or clear the two options that their form needs, and the others are used as given.

*matrix*
: *required* A [**Matrix**](Matrix) that transforms the glyph positions, or **Nothing**.

<!-- test: compile GrDriverStringSolidBrushVariable, compile GrDriverStringZeroFlags, compile GrDriverStringBrushVariableCompiles, Gr_GraphicsTests.DrawDriverString_BrushVariableAndOptions_Draws -->
> [!NOTE] 0.9.45.0
> A call that passes a **SolidBrush** variable, or the number 0 as *flags*, can match both the *str* and the *glyphs* overloads, and the compiler then reports that it cannot tell the overloads apart. Declare the brush variable as `Brush`, and pass the flags as a variable of the type **GpDriverStringOptions**.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(60, 30, PixelFormat32bppARGB)
Dim g As Graphics = Graphics(bmp)

Dim f As GdiPlus.Font = GdiPlus.Font("Arial", 14)
Dim brush As Brush = SolidBrush(Color(0, 0, 0))
Dim noMatrix As Matrix = Nothing

Debug.Print g.DrawDriverString("Hi", f, brush, GpPointF(5, 5), DriverStringOptionsCmapLookup, noMatrix)   ' 0

Dim box As GpRectF
Debug.Print g.MeasureDriverString("Hi", f, GpPointF(5, 5), DriverStringOptionsCmapLookup, noMatrix, box)   ' 0
Debug.Print box.Width > 5                                                                                 ' True
```

## Filled drawing

The methods that fill take a brush in place of a pen: a [**SolidBrush**](SolidBrush), a [**HatchBrush**](HatchBrush), a [**LinearGradientBrush**](LinearGradientBrush), a [**PathGradientBrush**](PathGradientBrush) or a [**TextureBrush**](TextureBrush). A fill covers exactly the area of the shape, so **FillRectangle** with the width 3 covers 3 pixels. A *brush* of **Nothing** is an error: the call returns **InvalidParameter** and draws nothing.

### FillRectangle, FillRectangleI
{: #fillrectangle }

Syntax: *graphics*.**FillRectangle**( *brush*, *x*, *y*, *width*, *height* )

Syntax: *graphics*.**FillRectangle**( *brush*, *pt*, *size* )

Syntax: *graphics*.**FillRectangle**( *brush*, *rect* )

Syntax: *graphics*.**FillRectangleI**( *brush*, *x*, *y*, *width*, *height* )

Fills a rectangle.

*brush*
: *required* The brush.

*x*, *y*, *width*, *height*
: *required* **Single** (**Long** for **FillRectangleI**): the rectangle.

*pt*, *size*
: *required* The upper left corner and the size.

*rect*
: *required* The rectangle: [**GpRectF**](Types/GpRectF) or [**GpRect**](Types/GpRect).

### FillRectangles

Syntax: *graphics*.**FillRectangles**( *brush*, *rects* )

Fills several rectangles.

*brush*
: *required* The brush.

*rects*
: *required* An array of [**GpRectF**](Types/GpRectF) or [**GpRect**](Types/GpRect).

### FillPolygon

Syntax: *graphics*.**FillPolygon**( *brush*, *points* [, *fillMode* ] )

Fills the inside of a polygon. The last point is joined to the first.

*brush*
: *required* The brush.

*points*
: *required* An array of [**GpPointF**](Types/GpPointF) or [**GpPoint**](Types/GpPoint).

*fillMode*
: *optional* A [**GpFillmode**](Enumerations/GpFillmode) that decides which areas of a self-crossing polygon are inside. The default is **FillModeAlternate**.

### FillEllipse, FillEllipseI
{: #fillellipse }

Syntax: *graphics*.**FillEllipse**( *brush*, *x*, *y*, *width*, *height* )

Syntax: *graphics*.**FillEllipse**( *brush*, *pt*, *size* )

Syntax: *graphics*.**FillEllipse**( *brush*, *rect* )

Syntax: *graphics*.**FillEllipseI**( *brush*, *x*, *y*, *width*, *height* )

Fills an ellipse that fits in a rectangle. The parameters are the ones of [**FillRectangle**](#fillrectangle).

### FillPie, FillPieI
{: #fillpie }

Syntax: *graphics*.**FillPie**( *brush*, *x*, *y*, *width*, *height*, *startAngle*, *sweepAngle* )

Syntax: *graphics*.**FillPie**( *brush*, *pt*, *size*, *startAngle*, *sweepAngle* )

Syntax: *graphics*.**FillPie**( *brush*, *rect*, *startAngle*, *sweepAngle* )

Syntax: *graphics*.**FillPieI**( *brush*, *x*, *y*, *width*, *height*, *startAngle*, *sweepAngle* )

Fills a pie slice. The shape and the parameters are the ones of [**DrawPie**](#drawpie), with a *brush* in place of the *pen*.

### FillPath

Syntax: *graphics*.**FillPath**( *brush*, *path* )

Fills the inside of a [**GraphicsPath**](GraphicsPath). The fill mode of the path decides which areas are inside.

### FillClosedCurve

Syntax: *graphics*.**FillClosedCurve**( *brush*, *points* )

Syntax: *graphics*.**FillClosedCurve**( *brush*, *points*, *fillMode* [, *tension* ] )

Fills the inside of a closed cardinal spline through the points (see [**DrawClosedCurve**](#drawclosedcurve)).

*brush*
: *required* The brush.

*points*
: *required* An array of [**GpPointF**](Types/GpPointF) or [**GpPoint**](Types/GpPoint).

*fillMode*
: *required* A [**GpFillmode**](Enumerations/GpFillmode).

*tension*
: *optional* A **Single**. The default is 0.5.

### FillRegion

Syntax: *graphics*.**FillRegion**( *brush*, *region* )

Fills a [**Region**](Region).

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(24, 24, PixelFormat32bppARGB)
Dim g As Graphics = Graphics(bmp)
g.SmoothingMode = SmoothingModeNone

Dim green As Color = Color(0, 255, 0)
Dim br As SolidBrush = SolidBrush(green)

' A fill covers the rectangle exactly: 3 pixels wide, 2 high
g.FillRectangle(br, 5, 2, 3, 2)
Debug.Print bmp.Pixel(5, 2).Value = green.Value    ' True
Debug.Print bmp.Pixel(7, 3).Value = green.Value    ' True
Debug.Print bmp.Pixel(8, 3).Value = green.Value    ' False
Debug.Print bmp.Pixel(7, 4).Value = green.Value    ' False

' A pentagram: the centre is inside with the Winding mode, outside with the Alternate mode
Dim star(1 To 5) As GpPointF
star(1) = GpPointF(12, 6)
star(2) = GpPointF(17, 23)
star(3) = GpPointF(4, 12)
star(4) = GpPointF(20, 12)
star(5) = GpPointF(7, 23)

g.Clear(Color(0, 0, 0, 0))
g.FillPolygon(br, star)
Debug.Print bmp.Pixel(12, 15).Value = green.Value  ' False
g.Clear(Color(0, 0, 0, 0))
g.FillPolygon(br, star, FillModeWinding)
Debug.Print bmp.Pixel(12, 15).Value = green.Value  ' True

' A region and a path
g.Clear(Color(0, 0, 0, 0))
g.FillRegion(br, Region(GpRect(12, 12, 5, 5)))
Debug.Print bmp.Pixel(14, 14).Value = green.Value  ' True
Debug.Print bmp.Pixel(17, 14).Value = green.Value  ' False

Dim path As GraphicsPath = GraphicsPath()
path.AddRectangle(GpRect(2, 2, 6, 4))
g.Clear(Color(0, 0, 0, 0))
g.FillPath(br, path)
Debug.Print bmp.Pixel(7, 5).Value = green.Value    ' True
Debug.Print bmp.Pixel(8, 5).Value = green.Value    ' False

' A pie slice
g.Clear(Color(0, 0, 0, 0))
g.FillPie(br, 2, 2, 20, 20, 180, 90)
Debug.Print bmp.Pixel(6, 6).Value = green.Value    ' True -- the upper left quarter
Debug.Print bmp.Pixel(18, 18).Value = green.Value  ' False

' No brush
Dim noBrush As Brush = Nothing
Debug.Print g.FillRectangle(noBrush, 0, 0, 3, 3)   ' 2
```

## Image drawing

### DrawImage

Syntax: *graphics*.**DrawImage**( *image*, *pt* )

Syntax: *graphics*.**DrawImage**( *image*, *x*, *y* )

Syntax: *graphics*.**DrawImage**( *image*, *rect* )

Syntax: *graphics*.**DrawImage**( *image*, *x*, *y*, *width*, *height* )

Syntax: *graphics*.**DrawImage**( *image*, *destPoints* )

Syntax: *graphics*.**DrawImage**( *image*, *x*, *y*, *srcX*, *srcY*, *srcWidth*, *srcHeight*, *srcUnit* )

Syntax: *graphics*.**DrawImage**( *image*, *destRect*, *srcRect*, *srcUnit* [, *attributes* [, *callback* [, *callbackData* ] ] ] )

Syntax: *graphics*.**DrawImage**( *image*, *destPoints*, *srcX*, *srcY*, *srcWidth*, *srcHeight*, *srcUnit* [, *attributes* [, *callback* [, *callbackData* ] ] ] )

Syntax: *graphics*.**DrawImage**( *image*, *sourceRect*, *xForm*, *effect*, *attributes*, *srcUnit* )

Draws an image, or a part of it.

*image*
: *required* The [**Image**](Image) to draw.

*pt*, *x*, *y*
: *required* The upper left corner of the drawn image, in [**GpPointF**](Types/GpPointF) or [**GpPoint**](Types/GpPoint), or as **Single** numbers. The image is drawn at its own size.

*rect*, *width*, *height*
: *required* The rectangle that the image is scaled to fit: a [**GpRectF**](Types/GpRectF) or a [**GpRect**](Types/GpRect), or *x*, *y*, *width* and *height* as **Single** numbers.

*destPoints*
: *required* An array of three [**GpPointF**](Types/GpPointF) or [**GpPoint**](Types/GpPoint): where the upper left, upper right and lower left corners of the image go. The image is drawn as a parallelogram, so it can be rotated and sheared.

*srcX*, *srcY*, *srcWidth*, *srcHeight*
: *required* The part of the image that is drawn, in *srcUnit*. **Single** in the floating-point form, **Long** in the integer form.

*srcRect*
: *required* The part of the image that is drawn, as a rectangle in *srcUnit*, the same type as *destRect*.

*destRect*
: *required* The rectangle that the part of the image is scaled to fit: a [**GpRectF**](Types/GpRectF) or a [**GpRect**](Types/GpRect).

*srcUnit*
: *required* A [**GpUnit**](Enumerations/GpUnit) that gives the unit of the source: **UnitPixel** for the pixels of a bitmap.

*attributes*
: *optional* An [**ImageAttributes**](ImageAttributes) object with colour adjustments. The default is none.

*callback*, *callbackData*
: *optional* **LongPtr**: the address of an abort callback and a value to pass to it. The default is none.

*sourceRect*
: *required* A [**GpRectF**](Types/GpRectF): the part of the image that is drawn, in pixels.

*xForm*
: *required* A [**Matrix**](Matrix) that transforms the drawn image, or **Nothing**.

*effect*
: *required* An **Effect** that is applied to the image, or **Nothing**.

The last form needs GDI+ 1.1, which Windows 7 and later have. Of the overloads with plain coordinates, only the ones with a position, with a position and a size, and with a position and a source part have the integer method **DrawImageI**.

<!-- test: Gr_GraphicsTests.DrawImage_DestRectF_ScalesTheImage, Gr_GraphicsTests.DrawImage_DestRect_ScalesTheImage, Gr_GraphicsTests.DrawImage_ThreeFloatPointsAndSourcePart_DrawsTheImage, Gr_GraphicsTests.DrawImage_XYWidthHeight_ScalesTheImage, Gr_GraphicsTests.DrawImage_DestRectAndSourceRect_DrawsThePart, Gr_GraphicsTests.DrawImage_ThreeIntegerPointsAndSourcePart_DrawsTheImage -->
> [!WARNING] 0.9.45.0
> The calls `DrawImage(image, rect)`, with a **GpRectF** or a **GpRect**, end a 32-bit program with an access violation. `DrawImage(image, destPoints, srcX, srcY, srcWidth, srcHeight, srcUnit)` with an array of **GpPointF** does the same in a 32-bit and in a 64-bit program. Use the overload with *x*, *y*, *width* and *height* (or **DrawImageI**), the one with *destRect* and *srcRect*, or the integer form of the second call.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

' A source image of 4 x 2 pixels: the left half red, the right half blue
Dim src As Bitmap = Bitmap(4, 2, PixelFormat32bppARGB)
Dim gs As Graphics = Graphics(src)
Dim red As Color = Color(255, 0, 0)
Dim blue As Color = Color(0, 0, 255)
gs.Clear(red)
gs.FillRectangle(SolidBrush(blue), 2, 0, 2, 2)

Dim bmp As Bitmap = Bitmap(20, 10, PixelFormat32bppARGB)
Dim g As Graphics = Graphics(bmp)
g.InterpolationMode = InterpolationModeNearestNeighbor
g.PixelOffsetMode = PixelOffsetModeHalf

' At its own size, with its upper left corner at (1, 1)
g.DrawImage(src, 1, 1)
Debug.Print bmp.Pixel(1, 1).Value = red.Value    ' True
Debug.Print bmp.Pixel(4, 2).Value = blue.Value   ' True
Debug.Print bmp.Pixel(5, 2).Value = 0            ' True -- the image is 4 wide

' Scaled to 8 x 4 pixels
g.Clear(Color(0, 0, 0, 0))
g.DrawImage(src, 1, 1, 8, 4)
Debug.Print bmp.Pixel(4, 3).Value = red.Value    ' True
Debug.Print bmp.Pixel(5, 3).Value = blue.Value   ' True
Debug.Print bmp.Pixel(8, 4).Value = blue.Value   ' True
Debug.Print bmp.Pixel(9, 4).Value = 0            ' True

' Only the blue half, scaled into a destination rectangle
g.Clear(Color(0, 0, 0, 0))
g.DrawImage(src, GpRectF(10, 2, 6, 4), GpRectF(2, 0, 2, 2), UnitPixel)
Debug.Print bmp.Pixel(10, 2).Value = blue.Value  ' True
Debug.Print bmp.Pixel(15, 5).Value = blue.Value  ' True
Debug.Print bmp.Pixel(16, 5).Value = 0           ' True

' A part of the image at its own size: columns 1 and 2, at (10, 5)
g.Clear(Color(0, 0, 0, 0))
g.DrawImage(src, 10, 5, 1, 0, 2, 2, UnitPixel)
Debug.Print bmp.Pixel(10, 5).Value = red.Value   ' True
Debug.Print bmp.Pixel(11, 5).Value = blue.Value  ' True
```

### DrawImageI

Syntax: *graphics*.**DrawImageI**( *image*, *x*, *y* )

Syntax: *graphics*.**DrawImageI**( *image*, *x*, *y*, *width*, *height* )

Syntax: *graphics*.**DrawImageI**( *image*, *x*, *y*, *srcX*, *srcY*, *srcWidth*, *srcHeight*, *srcUnit* )

The overloads of [**DrawImage**](#drawimage) with plain coordinates, for **Long** coordinates.

### DrawCachedBitmap

Syntax: *graphics*.**DrawCachedBitmap**( *cb*, *offset* )

Draws a [**CachedBitmap**](CachedBitmap), a bitmap that was converted to the pixel format of a **Graphics** object, at an offset. A cached bitmap is drawn faster than the bitmap it was made from.

*cb*
: *required* The [**CachedBitmap**](CachedBitmap).

*offset*
: *required* A [**GpPoint**](Types/GpPoint): where the upper left corner of the bitmap goes.

### DrawCachedBitmapI

Syntax: *graphics*.**DrawCachedBitmapI**( *cb*, *x*, *y* )

The same as [**DrawCachedBitmap**](#drawcachedbitmap), with the position as two numbers.

*cb*
: *required* The [**CachedBitmap**](CachedBitmap).

*x*, *y*
: *required* **Long**: where the upper left corner of the bitmap goes.

Both methods fail with **WrongState** when the format of the **Graphics** object is not the one of the cached bitmap, for example after the display's resolution or colour depth has changed.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim src As Bitmap = Bitmap(3, 3, PixelFormat32bppARGB)
Dim red As Color = Color(255, 0, 0)
Graphics(src).Clear(red)

Dim bmp As Bitmap = Bitmap(10, 10, PixelFormat32bppARGB)
Dim g As Graphics = Graphics(bmp)

Dim cb As CachedBitmap = CachedBitmap(src, g)
Debug.Print g.DrawCachedBitmapI(cb, 4, 4)         ' 0
Debug.Print bmp.Pixel(5, 5).Value = red.Value     ' True
Debug.Print bmp.Pixel(3, 3).Value = red.Value     ' False
```

## Text measurement

### MeasureString

Syntax: *graphics*.**MeasureString**( *str*, *font*, *layoutRect*, *format*, *boundingBox* [, *codepointsFitted* [, *linesFilled* ] ] )

Syntax: *graphics*.**MeasureString**( *str*, *font*, *layoutSize*, *format*, *size* [, *codepointsFitted* [, *linesFilled* ] ] )

Syntax: *graphics*.**MeasureString**( *str*, *font*, *origin*, *format*, *boundingBox* )

Syntax: *graphics*.**MeasureString**( *str*, *font*, *layoutRect*, *boundingBox* )

Syntax: *graphics*.**MeasureString**( *str*, *font*, *origin*, *boundingBox* )

Measures a string: the rectangle that **DrawString** would fill with it.

*str*
: *required* A **String**.

*font*
: *required* The [**Font**](Font).

*layoutRect*
: *required* A [**GpRectF**](Types/GpRectF): the rectangle that the text is laid out in.

*layoutSize*
: *required* A [**GpSizeF**](Types/GpSizeF): the size of the layout rectangle, which starts at (0, 0).

*origin*
: *required* A [**GpPointF**](Types/GpPointF): the upper left corner of the text, with no limit to its width.

*format*
: *required* The [**StringFormat**](StringFormat), or **Nothing** for the default.

*boundingBox*
: *required* A [**GpRectF**](Types/GpRectF) that receives the rectangle that the text fills.

*size*
: *required* A [**GpSizeF**](Types/GpSizeF) that receives the size of the rectangle that the text fills.

*codepointsFitted*
: *optional* A **Long** that receives the number of characters that fit in the layout rectangle.

*linesFilled*
: *optional* A **Long** that receives the number of lines that the text fills.

The text methods have no integer overloads.

### MeasureCharacterRanges

Syntax: *regions* **=** *graphics*.**MeasureCharacterRanges**( *str*, *font*, *layoutRect*, *format* )

Syntax: *status* **=** *graphics*.**MeasureCharacterRanges**( *str*, *font*, *layoutRect*, *format*, *regions* )

Measures the area that each of a set of character ranges fills when the string is drawn.

*str*
: *required* A **String**.

*font*
: *required* The [**Font**](Font).

*layoutRect*
: *required* A [**GpRectF**](Types/GpRectF): the layout rectangle.

*format*
: *required* A [**StringFormat**](StringFormat) whose **MeasurableCharacterRanges** property holds the ranges, an array of [**CharacterRange**](Types/CharacterRange).

*regions*
: *required* An array of [**Region**](Region) that receives one region for each range. The array can have any size, and it can be empty. It is resized to the number of ranges, and the **Region** objects that it already holds are reused.

The first form returns the array of regions.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(200, 60, PixelFormat32bppARGB)
Dim g As Graphics = Graphics(bmp)

Dim f As GdiPlus.Font = GdiPlus.Font("Arial", 12)
Dim fmt As StringFormat = StringFormat()

Dim box As GpRectF
Debug.Print g.MeasureString("Hello", f, GpPointF(10, 5), box)   ' 0
Debug.Print box.X                                                ' 10
Debug.Print box.Y                                                ' 5
Debug.Print box.Width > 20                                       ' True
Debug.Print box.Height > 10                                      ' True

Dim sz As GpSizeF
g.MeasureString("Hello", f, GpSizeF(200, 60), fmt, sz)
Debug.Print sz.Width > 20                                        ' True

' The ranges: characters 0 and 1, and the characters 2 to 4
Dim ranges(0 To 1) As CharacterRange
ranges(0) = CharacterRange(0, 2)
ranges(1) = CharacterRange(2, 3)
fmt.MeasurableCharacterRanges = ranges

Dim regions() As Region = g.MeasureCharacterRanges("Hello", f, GpRectF(0, 0, 200, 60), fmt)
Debug.Print UBound(regions) - LBound(regions) + 1                ' 2
```

### MeasureDriverString

Syntax: *graphics*.**MeasureDriverString**( *str*, *font*, *position*, *flags*, *matrix*, *boundingBox* )

Syntax: *graphics*.**MeasureDriverString**( *str*, *font*, *positions*, *flags*, *matrix*, *boundingBox* )

Syntax: *graphics*.**MeasureDriverString**( *glyphs*, *font*, *position*, *flags*, *matrix*, *boundingBox* )

Syntax: *graphics*.**MeasureDriverString**( *glyphs*, *font*, *positions*, *flags*, *matrix*, *boundingBox* )

Measures the rectangle that [**DrawDriverString**](#drawdriverstring) would fill. The parameters of the four forms are the ones of **DrawDriverString**, without the brush, and *boundingBox* is a [**GpRectF**](Types/GpRectF) that receives the rectangle.

The note under **DrawDriverString** about the overloads of the *str* and *glyphs* forms applies here too, for the *glyphs* forms.

## Metafile

### EnumerateMetaFile

Syntax: *graphics*.**EnumerateMetaFile**( *metafile*, *dest*, *callback* [, *callbackData* [, *attributes* ] ] )

Syntax: *graphics*.**EnumerateMetaFile**( *metafile*, *dest*, *srcRect*, *srcUnit*, *callback* [, *callbackData* [, *attributes* ] ] )

Plays a [**Metafile**](Metafile) record by record. The **Graphics** object calls the *callback* for each record. The callback can play the record with the **PlayRecord** method of the metafile, change it, or skip it.

*metafile*
: *required* The [**Metafile**](Metafile).

*dest*
: *required* Where the metafile is drawn: a [**GpPointF**](Types/GpPointF) or [**GpPoint**](Types/GpPoint) for its upper left corner, a [**GpRectF**](Types/GpRectF) or [**GpRect**](Types/GpRect) that it is scaled to, or an array of three points that place its corners as in [**DrawImage**](#drawimage).

*srcRect*
: *optional* The part of the metafile that is played, in *srcUnit*: a [**GpRectF**](Types/GpRectF) or a [**GpRect**](Types/GpRect), the same type as *dest*.

*srcUnit*
: *optional* A [**GpUnit**](Enumerations/GpUnit).

*callback*
: *required* A function, passed as `AddressOf`, of the delegate type **EnumerateMetafileProc**. It receives the record type, the flags, the size and a pointer of the record data, and *callbackData*. A function that returns 0 stops the enumeration.

*callbackData*
: *optional* A **LongPtr** that is passed to the callback. The default is 0.

*attributes*
: *optional* An [**ImageAttributes**](ImageAttributes) object with colour adjustments.

```tb check_build
Private Function OnRecord(ByVal nType As GpEmfPlusRecordType, ByVal dwFlags As Long, ByVal cbData As Long, ByVal data As LongPtr, ByVal callbackData As LongPtr) As Long
    Return 1                     ' continue with the next record
End Function

Sub PlayMetafile(g As Graphics, mf As Metafile)
    g.EnumerateMetaFile mf, GpPoint(0, 0), AddressOf OnRecord
End Sub
```

### AddMetafileComment

Syntax: *graphics*.**AddMetafileComment**( *data*, *sizeData* )

Adds a comment record to the metafile that the **Graphics** object records.

*data*
: *required* The first **Byte** of the comment data, passed by reference.

*sizeData*
: *required* A **Long**: the number of bytes of data.

The method is only valid for a **Graphics** object that records a metafile. For a **Graphics** object of another kind it returns **InvalidParameter**.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(4, 4, PixelFormat32bppARGB)
Dim g As Graphics = Graphics(bmp)

Dim data(0 To 3) As Byte
Debug.Print g.AddMetafileComment(data(0), 4)    ' 2 -- this Graphics does not record a metafile
```

## Clipping

The clipping area limits what is drawn. It is an area of the surface, and drawing outside it changes nothing. A new **Graphics** object has no clipping area, which means that all of the surface is open. The clipping area is set in world coordinates. It is transformed by the world transformation at the time it is set, and then does not change when the transformation does.

### SetClip

Syntax: *graphics*.**SetClip**( *g* [, *combineMode* ] )

Syntax: *graphics*.**SetClip**( *rect* [, *combineMode* ] )

Syntax: *graphics*.**SetClip**( *path* [, *combineMode* ] )

Syntax: *graphics*.**SetClip**( *region* [, *combineMode* ] )

Syntax: *graphics*.**SetClip**( *hRgn* [, *combineMode* ] )

Sets the clipping area, or combines the current clipping area with a shape.

*g*
: *required* A **Graphics** object whose clipping area is used.

*rect*
: *required* A [**GpRectF**](Types/GpRectF) or a [**GpRect**](Types/GpRect).

*path*
: *required* A [**GraphicsPath**](GraphicsPath).

*region*
: *required* A [**Region**](Region).

*hRgn*
: *required* A **LongPtr**: the handle of a GDI region. It is already in device coordinates, and it is not transformed. The region still belongs to the caller.

*combineMode*
: *optional* A [**GpCombineMode**](Enumerations/GpCombineMode) that says how the shape is combined with the current clipping area. The default is **CombineModeReplace**.

### IntersectClip

Syntax: *graphics*.**IntersectClip**( *rect* )

Syntax: *graphics*.**IntersectClip**( *region* )

Sets the clipping area to the area that the current one and the shape have in common. *rect* is a [**GpRectF**](Types/GpRectF) or a [**GpRect**](Types/GpRect), *region* a [**Region**](Region).

### ExcludeClip

Syntax: *graphics*.**ExcludeClip**( *rect* )

Syntax: *graphics*.**ExcludeClip**( *region* )

Removes the shape from the clipping area. *rect* is a [**GpRectF**](Types/GpRectF) or a [**GpRect**](Types/GpRect), *region* a [**Region**](Region).

### ResetClip

Syntax: *graphics*.**ResetClip**( )

Opens all of the surface again.

### TranslateClip, TranslateClipI
{: #translateclip }

Syntax: *graphics*.**TranslateClip**( *delta* )

Syntax: *graphics*.**TranslateClip**( *dx*, *dy* )

Syntax: *graphics*.**TranslateClipI**( *dx*, *dy* )

Moves the clipping area.

*delta*
: *required* A [**GpPointF**](Types/GpPointF) or a [**GpPoint**](Types/GpPoint).

*dx*, *dy*
: *required* **Single** (**Long** for **TranslateClipI**): the distance to move it by, to the right and down.

### Clip

Syntax: *region* **=** *graphics*.**Clip**

Returns the clipping area as a [**Region**](Region).

<!-- test: Gr_GraphicsTests.Clip_Get_ReturnsTheClippingRegion, Gr_GraphicsTests.ClipBounds_AfterSetClip_ReturnsTheRectangle -->
> [!NOTE] 0.9.45.0
> Reading **Clip** always fails: it returns **Nothing** and **LastResult** becomes **InvalidParameter**. To read the clipping area, read **ClipBounds**, or keep the [**Region**](Region) that the program passed to **SetClip**.

### ClipBounds, ClipBoundsI
{: #clipbounds }

Syntax: *rect* **=** *graphics*.**ClipBounds**

Syntax: *rect* **=** *graphics*.**ClipBoundsI**

Return the bounding rectangle of the clipping area, as a [**GpRectF**](Types/GpRectF) and as a [**GpRect**](Types/GpRect). With no clipping area set, the rectangle is the largest one that GDI+ uses: its X and Y are -4194304 and its Width and Height are 8388608.

### IsClipEmpty

Syntax: *flag* **=** *graphics*.**IsClipEmpty**

Returns **True** when the clipping area is empty: nothing can be drawn.

### VisibleClipBounds, VisibleClipBoundsI
{: #visibleclipbounds }

Syntax: *rect* **=** *graphics*.**VisibleClipBounds**

Syntax: *rect* **=** *graphics*.**VisibleClipBoundsI**

Return the bounding rectangle of the part of the clipping area that is on the surface, as a [**GpRectF**](Types/GpRectF) and as a [**GpRect**](Types/GpRect). For a **Graphics** object that is open all over, this is the surface itself.

### IsVisibleClipEmpty

Syntax: *flag* **=** *graphics*.**IsVisibleClipEmpty**

Returns **True** when no part of the clipping area is on the surface.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(20, 12, PixelFormat32bppARGB)
Dim g As Graphics = Graphics(bmp)
g.SmoothingMode = SmoothingModeNone

Dim green As Color = Color(0, 255, 0)
Dim br As SolidBrush = SolidBrush(green)

g.SetClip(GpRect(2, 2, 6, 4))
g.FillRectangle(br, 0, 0, 20, 12)           ' only the clipping area is filled
Debug.Print bmp.Pixel(2, 2).Value = green.Value    ' True
Debug.Print bmp.Pixel(7, 5).Value = green.Value    ' True
Debug.Print bmp.Pixel(8, 5).Value = green.Value    ' False
Debug.Print bmp.Pixel(1, 2).Value = green.Value    ' False

Debug.Print g.ClipBoundsI.X & " " & g.ClipBoundsI.Y & " " & g.ClipBoundsI.Width & " " & g.ClipBoundsI.Height   ' 2 2 6 4

' Intersect with a rectangle, then take another one out
g.IntersectClip(GpRect(4, 0, 10, 4))
Debug.Print g.ClipBoundsI.X & " " & g.ClipBoundsI.Y & " " & g.ClipBoundsI.Width & " " & g.ClipBoundsI.Height   ' 4 2 4 2
g.ExcludeClip(GpRect(4, 0, 10, 4))
Debug.Print g.IsClipEmpty                   ' True

g.ResetClip
Debug.Print g.IsClipEmpty                   ' False
Debug.Print g.VisibleClipBoundsI.Width      ' 20

' A clipping area that is beyond the surface
g.SetClip(GpRect(100, 100, 5, 5))
Debug.Print g.IsClipEmpty                   ' False
Debug.Print g.IsVisibleClipEmpty            ' True

' Moving the clipping area
g.SetClip(GpRect(2, 2, 6, 4))
g.TranslateClip(3, 4)
Debug.Print g.ClipBoundsI.X & " " & g.ClipBoundsI.Y   ' 5 6
```

## Clipping visibility checks

### IsVisible, IsVisibleI
{: #isvisible }

Syntax: *flag* **=** *graphics*.**IsVisible**( *x*, *y* )

Syntax: *flag* **=** *graphics*.**IsVisible**( *x*, *y*, *width*, *height* )

Syntax: *flag* **=** *graphics*.**IsVisible**( *point* )

Syntax: *flag* **=** *graphics*.**IsVisible**( *rect* )

Syntax: *flag* **=** *graphics*.**IsVisibleI**( *x*, *y* )

Syntax: *flag* **=** *graphics*.**IsVisibleI**( *x*, *y*, *width*, *height* )

Returns **True** when a point, or any part of a rectangle, is inside the visible clipping area.

*x*, *y*, *width*, *height*
: *required* **Single** (**Long** for **IsVisibleI**): the point, or the rectangle.

*point*
: *required* A [**GpPointF**](Types/GpPointF) or a [**GpPoint**](Types/GpPoint).

*rect*
: *required* A [**GpRectF**](Types/GpRectF) or a [**GpRect**](Types/GpRect).

<!-- test: Gr_GraphicsTests.IsVisible_GpPointF_ReturnsWhetherThePointIsInside, Gr_GraphicsTests.IsVisible_Alternatives_Work -->
> [!WARNING] 0.9.45.0
> The call with a **GpPointF**, `IsVisible(point)`, ends a 32-bit program with an access violation. In a 64-bit program it works. Use the call with *x* and *y*, or the **GpPoint** form.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(40, 40, PixelFormat32bppARGB)
Dim g As Graphics = Graphics(bmp)

g.SetClip(GpRect(5, 5, 12, 8))

Debug.Print g.IsVisible(6, 6)                  ' True
Debug.Print g.IsVisible(GpPoint(6, 6))         ' True
Debug.Print g.IsVisibleI(2, 2)                 ' False
Debug.Print g.IsVisible(16, 12)                ' True
Debug.Print g.IsVisible(17, 13)                ' False
Debug.Print g.IsVisible(GpRect(6, 6, 2, 2))    ' True
Debug.Print g.IsVisible(20, 20, 2, 2)          ' False
Debug.Print g.IsVisible(4, 5, 2, 2)            ' True -- a part of the rectangle is inside
```

## State and container stack

A **Graphics** object can save its state and restore it later. The state is the clipping area, the world transformation and the rendering settings. States are saved on a stack. **Save** and **Restore** work on a state as a whole. A container is a state that also has its own coordinate system, so a drawing procedure can draw in coordinates of its own.

### Save

Syntax: *state* **=** *graphics*.**Save**( )

Saves the state of the **Graphics** object and returns a **Long** cookie that stands for it. Pass the cookie to [**Restore**](#restore).

### Restore

Syntax: *status* **=** *graphics*.**Restore**( *state* )

Takes a saved state back: the object returns to the state it had when the cookie was made, and the states that were saved after it are discarded.

*state*
: *required* The cookie that [**Save**](#save) returned.

### BeginContainer

Syntax: *container* **=** *graphics*.**BeginContainer**( )

Syntax: *container* **=** *graphics*.**BeginContainer**( *dstRect*, *srcRect*, *unit* )

Starts a container and returns a **Long** cookie for it. The state of the **Graphics** object is saved, and inside the container the world transformation is the identity, the clipping area is open and the smoothing mode is back at its default. With *dstRect* and *srcRect*, the container's coordinates are set so that *srcRect* is mapped onto *dstRect* of the surface.

*dstRect*, *srcRect*
: *required* [**GpRectF**](Types/GpRectF) or [**GpRect**](Types/GpRect), both of the same type: the destination rectangle on the surface, and the rectangle of the drawing in the container's own coordinates.

*unit*
: *required* A [**GpUnit**](Enumerations/GpUnit): the unit of the container's coordinates.

### EndContainer

Syntax: *status* **=** *graphics*.**EndContainer**( *container* )

Closes a container and restores the state that was saved when it began.

*container*
: *required* The cookie that [**BeginContainer**](#begincontainer) returned.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(20, 10, PixelFormat32bppARGB)
Dim g As Graphics = Graphics(bmp)
g.SmoothingMode = SmoothingModeNone

Dim green As Color = Color(0, 255, 0)
Dim br As SolidBrush = SolidBrush(green)

' Restore takes back the transformation and the clipping area
Dim state As GraphicsState = g.Save()
g.TranslateTransform(10, 5)
g.SetClip(GpRect(0, 0, 3, 3))
g.Restore(state)
g.FillRectangle(br, 0, 0, 2, 2)
Debug.Print bmp.Pixel(1, 1).Value = green.Value    ' True

' A container maps a drawing of 4 x 2 units onto a rectangle of 8 x 4 pixels at (10, 5)
Dim c As GraphicsContainer = g.BeginContainer(GpRectF(10, 5, 8, 4), GpRectF(0, 0, 4, 2), UnitPixel)
g.FillRectangle(br, 0, 0, 4, 2)
g.EndContainer(c)
Debug.Print bmp.Pixel(17, 8).Value = green.Value   ' True -- the far corner of the destination
Debug.Print bmp.Pixel(18, 8).Value = green.Value   ' False
Debug.Print bmp.Pixel(10, 4).Value = green.Value   ' False

' Inside a container the transformation is the identity again
g.TranslateTransform(5, 5)
Dim c2 As GraphicsContainer = g.BeginContainer()
Dim m As Matrix = Matrix()
g.GetTransform(m)
Debug.Print m.IsIdentity                           ' True
g.EndContainer(c2)
g.GetTransform(m)
Debug.Print m.OffsetX                              ' 5
```

## Rendering state

These properties set how the drawing is rendered. Each one is read and set. A **Graphics** object is created with the defaults of GDI+.

### RenderingOrigin, SetRenderingOrigin, GetRenderingOrigin
{: #renderingorigin }

Syntax: *point* **=** *graphics*.**RenderingOrigin**

Syntax: *graphics*.**RenderingOrigin** **=** *point*

Syntax: *status* **=** *graphics*.**SetRenderingOrigin**( *x*, *y* )

Syntax: *status* **=** *graphics*.**GetRenderingOrigin**( *x*, *y* )

The point that the pattern of a hatch brush or a dithered fill starts from. The default is (0, 0). The property uses a [**GpPoint**](Types/GpPoint). **GetRenderingOrigin** returns the values in its two **Long** arguments.

### CompositingMode

Syntax: *mode* **=** *graphics*.**CompositingMode**

Syntax: *graphics*.**CompositingMode** **=** *mode*

A [**GpCompositingMode**](Enumerations/GpCompositingMode) that says how the drawn colour is combined with the colour that is already there. **CompositingModeSourceOver** (the default) blends by the alpha value. **CompositingModeSourceCopy** replaces the colour.

### CompositingQuality

Syntax: *quality* **=** *graphics*.**CompositingQuality**

Syntax: *graphics*.**CompositingQuality** **=** *quality*

A [**GpCompositingQuality**](Enumerations/GpCompositingQuality): the quality of the blending of the colours, from fast to precise.

### TextRenderingHint

Syntax: *hint* **=** *graphics*.**TextRenderingHint**

Syntax: *graphics*.**TextRenderingHint** **=** *hint*

A [**GpTextRenderingHint**](Enumerations/GpTextRenderingHint): how the text is rendered, with or without anti-aliasing and grid fitting.

### TextContrast

Syntax: *contrast* **=** *graphics*.**TextContrast**

Syntax: *graphics*.**TextContrast** **=** *contrast*

A **Long** from 0 to 12: the gamma correction of anti-aliased text. The default is 4.

### InterpolationMode

Syntax: *mode* **=** *graphics*.**InterpolationMode**

Syntax: *graphics*.**InterpolationMode** **=** *mode*

A [**GpInterpolationMode**](Enumerations/GpInterpolationMode): how an image is resampled when it is scaled or rotated. The default is **InterpolationModeBilinear**.

### SmoothingMode

Syntax: *mode* **=** *graphics*.**SmoothingMode**

Syntax: *graphics*.**SmoothingMode** **=** *mode*

A [**GpSmoothingMode**](Enumerations/GpSmoothingMode): whether the edges of lines and shapes are anti-aliased. The default is **SmoothingModeNone**: the edges are not smoothed.

### PixelOffsetMode

Syntax: *mode* **=** *graphics*.**PixelOffsetMode**

Syntax: *graphics*.**PixelOffsetMode** **=** *mode*

A [**GpPixelOffsetMode**](Enumerations/GpPixelOffsetMode): whether the coordinates refer to the corners of the pixels (**PixelOffsetModeNone**, and the default **PixelOffsetModeDefault**) or to their centres (**PixelOffsetModeHalf**, an offset of half a pixel).

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(8, 8, PixelFormat32bppARGB)
Dim g As Graphics = Graphics(bmp)

' The defaults
Debug.Print g.CompositingMode = CompositingModeSourceOver       ' True
Debug.Print g.InterpolationMode = InterpolationModeBilinear     ' True
Debug.Print g.SmoothingMode = SmoothingModeNone                 ' True
Debug.Print g.PixelOffsetMode = PixelOffsetModeDefault          ' True
Debug.Print g.TextContrast                                      ' 4

g.SmoothingMode = SmoothingModeAntiAlias
g.TextContrast = 7
g.CompositingMode = CompositingModeSourceCopy
Debug.Print g.SmoothingMode = SmoothingModeAntiAlias            ' True
Debug.Print g.TextContrast                                      ' 7
Debug.Print g.CompositingMode = CompositingModeSourceCopy       ' True

g.SetRenderingOrigin(3, 4)
Debug.Print g.RenderingOrigin.X & " " & g.RenderingOrigin.Y     ' 3 4
```

## World transform

The world transformation changes every coordinate before it is drawn. It is a [**Matrix**](Matrix) of the object, which starts as the identity. The methods below are the ones of the [**ITransformable**](ITransformable) interface, which the **Graphics** class implements. The *order* parameter of the methods that change the transformation decides which side the new transformation is multiplied on. **MatrixOrderPrepend** (the default) applies the new transformation to the coordinates first, before the ones that are already there. **MatrixOrderAppend** applies it last. Page transformation, set by **PageUnit** and **PageScale**, follows the world transformation.

### Transform, GetTransform
{: #transform }

Syntax: *matrix* **=** *graphics*.**Transform**

Syntax: *graphics*.**Transform** **=** *matrix*

Syntax: *status* **=** *graphics*.**GetTransform**( *matrix* )

**Transform** gets or sets the world transformation as a [**Matrix**](Matrix). **GetTransform** copies it into a matrix that the program has created.

*matrix*
: *required* A [**Matrix**](Matrix).

<!-- test: Gr_GraphicsTests.Transform_Get_ReturnsTheWorldTransformation, Gr_GraphicsTests.GetTransform_CopiesTheWorldTransformation -->
> [!NOTE] 0.9.45.0
> Reading **Transform** always fails: it returns **Nothing** and **LastResult** becomes **InvalidParameter**. Create a **Matrix** with `Matrix()` and read the transformation with **GetTransform**.

### ResetTransform

Syntax: *status* **=** *graphics*.**ResetTransform**( )

Sets the world transformation to the identity matrix.

### MultiplyTransform

Syntax: *status* **=** *graphics*.**MultiplyTransform**( *matrix* [, *order* ] )

Multiplies the world transformation by a matrix.

*matrix*
: *required* The [**Matrix**](Matrix).

*order*
: *optional* A [**GpMatrixOrder**](Enumerations/GpMatrixOrder). The default is **MatrixOrderPrepend**.

### TranslateTransform

Syntax: *status* **=** *graphics*.**TranslateTransform**( *dx*, *dy* [, *order* ] )

Syntax: *status* **=** *graphics*.**TranslateTransform**( *offset* [, *order* ] )

Moves the origin.

*dx*, *dy*
: *required* **Single**: the distance to move by, to the right and down.

*offset*
: *required* A [**GpPointF**](Types/GpPointF).

*order*
: *optional* A [**GpMatrixOrder**](Enumerations/GpMatrixOrder). The default is **MatrixOrderPrepend**.

### ScaleTransform

Syntax: *status* **=** *graphics*.**ScaleTransform**( *sx*, *sy* [, *order* ] )

Scales the coordinates by factors, along the x axis and the y axis.

*sx*, *sy*
: *required* **Single**: the scale factors.

*order*
: *optional* A [**GpMatrixOrder**](Enumerations/GpMatrixOrder). The default is **MatrixOrderPrepend**.

### RotateTransform

Syntax: *status* **=** *graphics*.**RotateTransform**( *angle* [, *order* ] )

Rotates the coordinates around the origin. A positive angle turns clockwise on the screen, from the x axis towards the y axis.

*angle*
: *required* A **Single**: the angle in degrees.

*order*
: *optional* A [**GpMatrixOrder**](Enumerations/GpMatrixOrder). The default is **MatrixOrderPrepend**.

### RotateTransformAt

Syntax: *status* **=** *graphics*.**RotateTransformAt**( *angle*, *center* [, *order* ] )

Rotates the coordinates around a point.

*angle*
: *required* A **Single**: the angle in degrees.

*center*
: *required* A [**GpPointF**](Types/GpPointF): the point that stays where it is.

*order*
: *optional* A [**GpMatrixOrder**](Enumerations/GpMatrixOrder). The default is **MatrixOrderPrepend**.

### ShearTransform

Syntax: *status* **=** *graphics*.**ShearTransform**( *shearX*, *shearY* [, *order* ] )

Shears the coordinates: each x moves by *shearX* times y, and each y by *shearY* times x.

*shearX*, *shearY*
: *required* **Single**: the shear factors.

*order*
: *optional* A [**GpMatrixOrder**](Enumerations/GpMatrixOrder). The default is **MatrixOrderPrepend**.

<!-- test: Gr_GraphicsTests.ShearTransform_ShearsTheCoordinates, Gr_GraphicsTests.MultiplyTransform_ShearMatrix_ShearsTheCoordinates -->
> [!WARNING] 0.9.45.0
> The method always returns **InvalidParameter** and leaves the transformation as it was. To shear, pass a [**Matrix**](Matrix) with the factors in its off-diagonal elements, `Matrix(1, shearY, shearX, 1, 0, 0)`, to **MultiplyTransform**.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(8, 8, PixelFormat32bppARGB)
Dim g As Graphics = Graphics(bmp)

Debug.Print g.ShearTransform(0.5, 0)               ' 2

Dim pts(1 To 1) As GpPointF
pts(1) = GpPointF(1, 2)
g.MultiplyTransform(Matrix(1, 0, 0.5, 1, 0, 0))     ' x moves by half of y
g.TransformPoints(CoordinateSpaceDevice, CoordinateSpaceWorld, pts)
Debug.Print pts(1).X & " " & pts(1).Y              ' 2 2
```

### PageUnit

Syntax: *unit* **=** *graphics*.**PageUnit**

Syntax: *graphics*.**PageUnit** **=** *unit*

The [**GpUnit**](Enumerations/GpUnit) of the coordinates after the world transformation. The default is **UnitDisplay** (1). **UnitWorld** is not valid as a page unit.

### PageScale

Syntax: *scale* **=** *graphics*.**PageScale**

Syntax: *graphics*.**PageScale** **=** *scale*

A **Single** factor that is applied to the coordinates after the world transformation. The default is 1.

### DpiX, DpiY
{: #dpix }

Syntax: *dpi* **=** *graphics*.**DpiX**

Syntax: *dpi* **=** *graphics*.**DpiY**

Return the horizontal and vertical resolution of the surface, in dots per inch, as a **Single**. They can be read, not set. The resolution of a bitmap is set with the **SetResolution** method of the [**Bitmap**](Bitmap).

### TransformPoints

Syntax: *status* **=** *graphics*.**TransformPoints**( *destSpace*, *srcSpace*, *pts* )

Converts points from one coordinate space to another, in place.

*destSpace*, *srcSpace*
: *required* A [**GpCoordinateSpace**](Enumerations/GpCoordinateSpace): **CoordinateSpaceWorld**, **CoordinateSpacePage** (after the world transformation) or **CoordinateSpaceDevice** (in pixels, after the page transformation).

*pts*
: *required* An array of [**GpPointF**](Types/GpPointF) or [**GpPoint**](Types/GpPoint). It receives the converted points.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(20, 10, PixelFormat32bppARGB)
bmp.SetResolution(96, 96)
Dim g As Graphics = Graphics(bmp)
g.SmoothingMode = SmoothingModeNone

Dim green As Color = Color(0, 255, 0)
Dim br As SolidBrush = SolidBrush(green)

' The order of the transformations: a scale before a translation moves the shape by the scaled distance
g.TranslateTransform(5, 2)
g.ScaleTransform(2, 3)
g.FillRectangle(br, 0, 1, 3, 1)                    ' from (5, 5) to (11, 8)
Debug.Print bmp.Pixel(5, 5).Value = green.Value    ' True
Debug.Print bmp.Pixel(10, 7).Value = green.Value   ' True
Debug.Print bmp.Pixel(11, 7).Value = green.Value   ' False
Debug.Print bmp.Pixel(5, 4).Value = green.Value    ' False

' Read the transformation back
Dim m As Matrix = Matrix()
g.GetTransform(m)
Debug.Print m.OffsetX & " " & m.OffsetY            ' 5 2

g.ResetTransform
g.GetTransform(m)
Debug.Print m.IsIdentity                           ' True

' A rotation by 90 degrees turns (1, 2) into (-2, 1)
Dim pts(1 To 1) As GpPointF
pts(1) = GpPointF(1, 2)
g.RotateTransform(90)
g.TransformPoints(CoordinateSpaceDevice, CoordinateSpaceWorld, pts)
Debug.Print pts(1).X & " " & pts(1).Y              ' -2 1

' A rotation around (2, 2)
g.ResetTransform
pts(1) = GpPointF(3, 2)
g.RotateTransformAt(90, GpPointF(2, 2))
g.TransformPoints(CoordinateSpaceDevice, CoordinateSpaceWorld, pts)
Debug.Print pts(1).X & " " & pts(1).Y              ' 2 3

' A page unit of one inch is 96 pixels on this bitmap
g.ResetTransform
g.PageUnit = UnitInch
pts(1) = GpPointF(1, 1)
g.TransformPoints(CoordinateSpaceDevice, CoordinateSpaceWorld, pts)
Debug.Print pts(1).X & " " & pts(1).Y              ' 96 96
Debug.Print g.DpiX & " " & g.DpiY                  ' 96 96
```

## Color approximation

### GetNearestColor, GetNearestColorTo
{: #getnearestcolor }

Syntax: *status* **=** *graphics*.**GetNearestColor**( *color* )

Syntax: *nearest* **=** *graphics*.**GetNearestColorTo**( *color* )

For a surface of 8 bits per pixel or fewer, which has a palette, replaces a colour by the nearest colour that the surface can show. The alpha value is ignored. **GetNearestColor** changes its argument, and **GetNearestColorTo** returns the colour and leaves its argument alone. A surface with more bits per pixel can show every colour, so the colour does not change.

*color*
: *required* A [**Color**](Types/Color).

### GetHalftonePalette

Syntax: *hPalette* **=** *graphics*.**GetHalftonePalette**( )

Returns a **LongPtr**: the handle of a GDI halftone palette, which the program can select into a device context. The palette is a GDI object that the program owns, and it is not released by the package.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(4, 4, PixelFormat32bppARGB)
Dim g As Graphics = Graphics(bmp)

Dim c As Color = Color(10, 20, 30)
Debug.Print g.GetNearestColorTo(c).Value = c.Value   ' True -- a 32-bit surface keeps every colour
```

## GDI interoperability

### GetHDC, ReleaseHDC
{: #gethdc }

Syntax: *hdc* **=** *graphics*.**GetHDC**( )

Syntax: *graphics*.**ReleaseHDC**( )

Syntax: *graphics*.**ReleaseHDC**( *hdc* )

**GetHDC** returns a **LongPtr**: the handle of a GDI device context for the surface, so that GDI functions can draw on it. **ReleaseHDC** gives it back. The **Graphics** object is locked in between: any other call on it fails with **ObjectBusy** until the device context is released. The form without an argument releases the device context that **GetHDC** returned last.

*hdc*
: *required* The handle that **GetHDC** returned.

Get the device context, use it, and release it before the next call on the object.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(10, 10, PixelFormat32bppARGB)
Dim g As Graphics = Graphics(bmp)

Dim green As Color = Color(0, 255, 0)
Dim br As SolidBrush = SolidBrush(green)

Dim hdc As LongPtr = g.GetHDC()
Debug.Print hdc <> 0                         ' True

g.FillRectangle(br, 0, 0, 2, 2)              ' the object is busy
Debug.Print g.LastResult                     ' 4
g.ClearResult

' A second Graphics object draws on the same device context
Dim g2 As Graphics = GraphicsFromHDC(hdc)
g2.FillRectangle(br, 4, 4, 2, 2)
Set g2 = Nothing

g.ReleaseHDC
g.FillRectangle(br, 0, 0, 2, 2)              ' the object is free again
Debug.Print g.LastResult                     ' 0
Debug.Print bmp.Pixel(4, 4).Value = green.Value   ' True
Debug.Print bmp.Pixel(0, 0).Value = green.Value   ' True
```

## Example

This example draws a small picture on a bitmap, with a transformation, a clipping area and a saved state, and reads back pixels from it.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(40, 20, PixelFormat32bppARGB)
Dim g As Graphics = Graphics(bmp)
g.SmoothingMode = SmoothingModeNone

Dim white As Color = Color(255, 255, 255)
Dim red As Color = Color(255, 0, 0)
Dim blue As Color = Color(0, 0, 255)

g.Clear(white)

' A red frame
g.DrawRectangle(Pen(red, 1), 0, 0, 39, 19)

' Inside a saved state: shift the origin, clip, and fill with blue
Dim state As GraphicsState = g.Save()
g.TranslateTransform(10, 5)
g.SetClip(GpRect(0, 0, 10, 6))
g.FillRectangle(SolidBrush(blue), -5, -5, 40, 40)
g.Restore(state)

Debug.Print bmp.Pixel(0, 0).Value = red.Value      ' True -- the frame
Debug.Print bmp.Pixel(15, 8).Value = blue.Value    ' True -- inside the clipped fill
Debug.Print bmp.Pixel(20, 8).Value = white.Value   ' True -- outside it
Debug.Print bmp.Pixel(9, 8).Value = white.Value    ' True -- left of it
```

## See Also

- [Graphics](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusgraphics/nl-gdiplusgraphics-graphics) -- the GDI+ class that this one mirrors
- [Pen](Pen) class -- outlines
- [SolidBrush](SolidBrush) class -- fills
- [Font](Font) class -- text
- [StringFormat](StringFormat) class -- text layout
- [Bitmap](Bitmap) class -- drawing on pixels
- [Image](Image) class -- images
- [Metafile](Metafile) class -- recording drawing
- [GraphicsPath](GraphicsPath) class -- paths
- [Region](Region) class -- regions and clipping
- [Matrix](Matrix) class -- transformations
- [ImageAttributes](ImageAttributes) class -- colour adjustments of an image
- [CachedBitmap](CachedBitmap) class -- a bitmap that is drawn fast
- [VBGraphics](VBGraphics) class -- Visual Basic style drawing methods on a **Graphics** object
- [GdiPlusUser](GdiPlusUser) class -- keeps GDI+ active
- [IDeviceContext](IDeviceContext) interface -- the device context of a graphics object
- [ITransformable](ITransformable) interface -- the transformation methods
