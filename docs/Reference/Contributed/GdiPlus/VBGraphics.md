---
title: VBGraphics
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/VBGraphics
has_toc: false
---

# VBGraphics class
{: .no_toc }

A [**Graphics**](Graphics) that also draws with the `Line`, `Circle` and `PSet` statements of Visual Basic.

**VBGraphics** inherits from **Graphics**, so every method of that class works on it, and adds the three drawing methods with the syntax of the Visual Basic statements, the properties that those statements read (**ForeColor**, **FillColor**, **FillStyle**, **DrawWidth**) and a current position. It is meant for code that is ported from a Visual Basic form, where the same statements drew on the form.

The colours differ from Visual Basic's. A colour argument is a [**Color**](Types/Color) value in the layout `&HAARRGGBB`, with its alpha channel, and not a `COLORREF`.

> [!WARNING] 0.9.45.0
> `vbRed` and the result of `RGB` are `COLORREF` values with no alpha: `&H0000FF` has alpha 0, so with the default **UseTransparentAlpha** of **True** a line drawn in it is invisible. Pass `&HFFFF0000` for red, or `Color(255, 0, 0).Value`. With **UseTransparentAlpha** set to **False** a colour with alpha 0 is drawn opaque, but `vbRed` then comes out blue, because the bytes are read as `&HAARRGGBB`.

## Creating

Syntax: **VBGraphics**( *image* ) \
Syntax: **VBGraphics**( *options*, *h1*, *h2* ) \
Syntax: **VBGraphicsFromImage**( *image* ) \
Syntax: **VBGraphicsFromHDC**( *hdc* [, *hdevice* ] ) \
Syntax: **BufferedVBGraphicsFromHDC**( *hdc*, *drawArea* ) \
Syntax: **VBGraphicsFromHWND**( *hwnd* ) \
Syntax: **VBGraphicsFromHWNDWithICM**( *hwnd* ) \
Syntax: **BufferedVBGraphicsFromHWND**( *hwnd* ) \
Syntax: **New VBGraphics**( *image* ) \
Syntax: **New VBGraphics**( *options*, *h1* [, *h2* ] )

The module functions return a new **VBGraphics** and have the arguments of the functions of **Graphics** that have the same name without the **VB**. The `New` forms take the arguments of the first two.

*image*
: *required* The [**Image**](Image) or [**Bitmap**](Bitmap) to draw on.

*hdc*, *hdevice*
: *required*, *optional* A device context handle, and optionally a device handle, to draw on.

*hwnd*
: *required* A window handle to draw on.

*drawArea*
: *required* A [**GpRect**](Types/GpRect) in the device context that the buffered object paints into when it is released.

*options*, *h1*, *h2*
: *required* A [**GraphicsCreationOptions**](Enumerations/GraphicsCreationOptions) value that says what *h1* and *h2* are: window or device context handles, or the drawing area for a buffered one.

A new object has **ForeColor** opaque black, **FillColor** opaque white and **FillStyle** transparent.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(8!, 8!)
Dim g As VBGraphics = VBGraphics(bmp)
Debug.Print g.LastResult                                         ' 0
Debug.Print Hex$(g.ForeColor.Value)                              ' FF000000
Debug.Print Hex$(g.FillColor.Value)                              ' FFFFFFFF
Debug.Print g.FillStyle                                          ' 1
Debug.Print g.UseTransparentAlpha                                ' True
```

## Colours, width and position

### ForeColor

Syntax: *graphics*.**ForeColor** [ = *color* ] As [**Color**](Types/Color)

The colour that **Line**, **Circle** and **PSet** use when they are given none, and the colour of an outline.

### FillColor

Syntax: *graphics*.**FillColor** [ = *color* ] As [**Color**](Types/Color)

The colour that the inside of a box (**Line** with **B**) or a circle is filled with when **FillStyle** is solid.

### FillStyle

Syntax: *graphics*.**FillStyle** [ = *style* ] As [**FillStyleConstants**](Enumerations/FillStyleConstants)

Whether a box or a circle is filled: **vbFSSolid**, 0, fills it with **FillColor**; **vbFSTransparent**, 1, which is the default, leaves it unfilled.

### DrawWidth

Syntax: *graphics*.**DrawWidth** [ = *width* ] As **Single**

The width of the pen, in the units of the object. Setting the width of the pen changes how the lines of **Line**, **Circle** and **PSet** are drawn.

> [!WARNING] 0.9.45.0
> The pen is created by the first call to **Line**, **Circle** or **PSet**. Until then **DrawWidth** reads 0 and sets **LastResult** to 2, *InvalidParameter*, and an assignment to it is ignored without an error. Draw once before setting **DrawWidth**.

### UseTransparentAlpha

Syntax: *graphics*.**UseTransparentAlpha** [ = *value* ] As **Boolean**

**True**, the default, draws a colour with its own alpha, so a colour with alpha 0 is invisible. **False** draws a colour whose alpha is exactly 0 as if it were 255; other alphas are used as they are.

### CurrentX, CurrentY, Current

Syntax: *graphics*.**CurrentX** [ = *x* ] As **Single** \
Syntax: *graphics*.**CurrentY** [ = *y* ] As **Single** \
Syntax: *graphics*.**Current** [ = *point* ] As [**GpPointF**](Types/GpPointF)

The current position. A drawing method that is given no starting point starts at it, and **Step** counts from it. **Line** leaves it at the end of the line, **Circle** at the centre, and **PSet** at the point.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(8!, 8!)
Dim g As VBGraphics = VBGraphics(bmp)
g.CurrentX = 3: g.CurrentY = 4
Debug.Print g.Current.X & "," & g.Current.Y                      ' 3,4
g.Current = GpPointF(5, 6)
Debug.Print g.CurrentX & "," & g.CurrentY                        ' 5,6
g.ForeColor = Color(255, 0, 255, 0)
g.FillStyle = vbFSSolid
Debug.Print g.FillStyle                                          ' 0
```

## Drawing

The three methods are written as the Visual Basic statements are. The compiler turns the statement into a call of the method with a set of flags, which is why the methods have a parameter list that is not the one you write. In each statement every part in square brackets is optional.

### Line

Syntax: *graphics*.**Line** [ **Step** ] **(** *x1*, *y1* **)** **-** [ **Step** ] **(** *x2*, *y2* **)** [, *color* ] [, [ **B** ][ **F** ] ] \
Syntax: *graphics*.**Line** [ **Step** ] **-** [ **Step** ] **(** *x2*, *y2* **)** [, *color* ] [, [ **B** ][ **F** ] ]

Draws a line, or with **B** a box with those opposite corners, or with **BF** a filled box. The second form starts at the current position. **Step** makes a point relative to the current position, or for the second point to the first. *color* is `&HAARRGGBB`; without it the line uses **ForeColor**.

**B** draws the outline in the colour. When **FillStyle** is solid, the inside is then filled with **FillColor**, over the inner half of the outline.

> [!WARNING] 0.9.45.0
> **BF** fills the wrong rectangle: it starts at the second corner instead of the first, so the box is filled one box-height too low (its top is at *y2*). The outline is drawn where it should be. To fill a box, set **FillStyle** to solid and use **B**, or call **FillRectangle** of **Graphics**.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(40!, 40!)
Dim g As VBGraphics = VBGraphics(bmp)
g.Clear Color(255, 255, 255, 255)
g.Line (2, 5)-(30, 5), &HFFFF0000
Debug.Print Hex$(bmp.Pixel(10, 5).Value)                         ' FFFF0000
Debug.Print Hex$(bmp.Pixel(10, 8).Value)                         ' FFFFFFFF
Debug.Print g.CurrentX & "," & g.CurrentY                        ' 30,5
g.Line -(30, 20), &HFF0000FF
Debug.Print Hex$(bmp.Pixel(30, 15).Value)                        ' FF0000FF
g.Line (0, 25)-(10, 35), &HFF00FF00, B
Debug.Print Hex$(bmp.Pixel(5, 25).Value)                         ' FF00FF00
Debug.Print Hex$(bmp.Pixel(5, 30).Value)                         ' FFFFFFFF
g.FillColor = Color(255, 0, 0, 255)
g.FillStyle = vbFSSolid
g.Line (20, 25)-(30, 35), &HFF000000, B
Debug.Print Hex$(bmp.Pixel(25, 30).Value)                        ' FF0000FF
g.ForeColor = Color(255, 255, 0, 255)
g.Line (0, 38)-(30, 38)
Debug.Print Hex$(bmp.Pixel(10, 38).Value)                        ' FFFF00FF
```

### Circle

Syntax: *graphics*.**Circle** [ **Step** ] **(** *x*, *y* **)**, *radius* [, *color* [, *start*, *end* [, *aspect* ]]]

Draws a circle, or an ellipse, with its centre at the point. The outline is in *color*, or **ForeColor**, and the inside is filled with **FillColor** when **FillStyle** is solid. *aspect* is the ratio of the vertical to the horizontal size: below 1 the radius is the horizontal one and the ellipse is wider than tall, above 1 the radius is the vertical one.

> [!WARNING] 0.9.45.0
> *start* and *end*, which draw an arc or a pie, are not implemented. A call that gives either draws nothing and sets **LastResult** to 6, *NotImplemented*.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(40!, 40!)
Dim g As VBGraphics = VBGraphics(bmp)
g.Clear Color(255, 255, 255, 255)
g.Circle (20, 20), 8, &HFFFF0000
Debug.Print Hex$(bmp.Pixel(20, 12).Value)                        ' FFFF0000
Debug.Print Hex$(bmp.Pixel(28, 20).Value)                        ' FFFF0000
Debug.Print Hex$(bmp.Pixel(20, 20).Value)                        ' FFFFFFFF
Debug.Print g.CurrentX & "," & g.CurrentY                        ' 20,20
g.Clear Color(255, 255, 255, 255)
g.Circle (20, 20), 10, &HFFFF0000, , , 0.5
Debug.Print Hex$(bmp.Pixel(30, 20).Value)                        ' FFFF0000
Debug.Print Hex$(bmp.Pixel(20, 15).Value)                        ' FFFF0000
Debug.Print Hex$(bmp.Pixel(20, 10).Value)                        ' FFFFFFFF
g.Circle (20, 20), 8, &HFFFF0000, 0, 3.14
Debug.Print g.LastResult                                         ' 6
```

### PSet

Syntax: *graphics*.**PSet** [ **Step** ] **(** *x*, *y* **)** [, *color* ]

Draws a point in *color*, or **ForeColor**, and makes it the current position.

> [!WARNING] 0.9.45.0
> The point is a line one unit long: **PSet** colours the pixel at (*x*, *y*) and the pixel below it. To set a single pixel, assign to the **Pixel** property of the **Bitmap**.

## See Also

- [Graphics](Graphics) class -- the base class, with the rest of the drawing methods
- [Color](Types/Color) type -- the colours
- [FillStyleConstants](Enumerations/FillStyleConstants) enumeration
- [GraphicsCreationOptions](Enumerations/GraphicsCreationOptions) enumeration
- [GdiPlusBase](GdiPlusBase) class -- **LastResult** and error handling
