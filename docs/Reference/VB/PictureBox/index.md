---
title: PictureBox
parent: VB Package
permalink: /tB/Packages/VB/PictureBox/
has_toc: false
---

# PictureBox class
{: .no_toc }

A **PictureBox** is a Win32 native control that combines three roles in one:

1. A **picture display** — it can show a bitmap, GIF, JPEG, icon, cursor, or metafile loaded into its [**Picture**](#picture) property.
2. A **drawing surface** — it exposes the VB6 graphics methods ([**Line**](#line), [**Circle**](#circle), [**PSet**](#pset), [**Print**](#print), [**PaintPicture**](#paintpicture), …) that write into the control's device context.
3. A **container** — it can host child controls dropped onto it at design time, much like a [**Frame**](../Frame), and can be docked or aligned within its parent.

The control is normally placed on a [**Form**](../Form), [**Frame**](../Frame), or **UserControl** at design time. The default property is [**Picture**](#picture); the default-designer event is [**Click**](#click).

```tb
Private Sub Form_Load()
    Set picLogo.Picture = LoadPicture(App.Path & "\logo.png")
    picLogo.AutoSize = True

    picCanvas.AutoRedraw = True
    picCanvas.ScaleMode = vbPixels
    picCanvas.Line (0, 0)-(picCanvas.ScaleWidth, picCanvas.ScaleHeight), vbRed, B
    picCanvas.Print "Hello, world!"
End Sub
```

* TOC
{:toc}

## Picture display

Setting [**Picture**](#picture) assigns a **StdPicture** to the control. When [**AutoSize**](#autosize) is **True** the control resizes itself in its container's **ScaleMode** units to fit the picture exactly (plus a 1- or 2-pixel border, depending on [**Appearance**](#appearance)); otherwise the picture is drawn at its natural size, anchored at the top-left, and clipped to the control's bounds. Assigning **Nothing** to **Picture** clears the displayed image but does not erase anything drawn through the graphics methods.

The picture is read directly from the file passed to **LoadPicture**, or — when [**DataField**](#datafield) / [**DataSource**](#datasource) are set — from the bound recordset field. Anything assigned to **\_Default** (the control's default property) is forwarded to **Picture**.

## Drawing surface

A **PictureBox** owns its own device context, addressable through [**hDC**](#hdc), and supports the full VB6 vector-drawing surface: [**Cls**](#cls), [**Line**](#line), [**Circle**](#circle), [**PSet**](#pset), [**Print**](#print), and [**PaintPicture**](#paintpicture). Pen and brush attributes come from [**ForeColor**](#forecolor), [**BackColor**](#backcolor), [**FillColor**](#fillcolor), [**FillStyle**](#fillstyle), [**DrawWidth**](#drawwidth), [**DrawMode**](#drawmode), and [**DrawStyle**](#drawstyle). [**CurrentX**](#currentx) and [**CurrentY**](#currenty) track the current "graphics pen" position so that subsequent calls can omit the starting coordinates.

```tb
picCanvas.Line (10, 10)-Step(100, 50), vbBlue, BF   ' filled rectangle
picCanvas.Circle (200, 100), 40, vbGreen            ' circle
picCanvas.CurrentX = 10 : picCanvas.CurrentY = 100
picCanvas.Print "Drawn over a Picture"              ' text at the pen
```

[**Print**](#print) is dispatched through the IDispatch interface using the VB6 *Print* statement syntax (`pic.Print expr [, ;] expr …`), with **Spc(n)** and **Tab(n)** for whitespace and column control. Calls advance [**CurrentX**](#currentx) / [**CurrentY**](#currenty) and honour [**Font**](#font), [**ForeColor**](#forecolor), and [**FontTransparent**](#fonttransparent).

## AutoRedraw and the persistent image

When [**AutoRedraw**](#autoredraw) is **False** (default) the graphics methods write directly into the visible device context, and the OS may erase that drawing whenever the control is uncovered, resized, or redrawn — typically the application redraws it from a [**Paint**](#paint) handler.

When [**AutoRedraw**](#autoredraw) is **True**, the graphics methods are recorded into an off-screen persistent bitmap that is automatically blitted onto the control whenever it needs repainting. The control no longer raises [**Paint**](#paint) events; the bitmap is exposed read-only through [**Image**](#image), suitable for saving with **SavePicture** or for assigning to another **PictureBox** or [**Image**](../Image) control. Toggling **AutoRedraw** from **False** to **True** preserves the current contents; toggling it back to **False** discards the persistent bitmap.

## Coordinate system

A **PictureBox** has its own coordinate system, independent of its parent. [**ScaleMode**](#scalemode) selects a built-in unit ([**ScaleModeConstants**](../../VBRUN/Constants/ScaleModeConstants) — **vbTwips**, **vbPoints**, **vbPixels**, **vbCharacters**, **vbInches**, **vbMillimeters**, **vbCentimeters**); assigning [**ScaleLeft**](#scaleleft), [**ScaleTop**](#scaletop), [**ScaleWidth**](#scalewidth), or [**ScaleHeight**](#scaleheight) (or calling [**Scale**](#scale) with two corner points) switches to **vbUser** and remaps the surface so the assigned values address the corners directly — useful for mathematical plots where the natural axes don't match pixel coordinates.

[**ScaleX**](#scalex) and [**ScaleY**](#scaley) convert distances between any two scale modes without changing the active one.

## Container behaviour

Controls dropped onto a **PictureBox** at design time become its children: their coordinates are relative to its client area, and they move and hide with it. [**Container**](#container) returns the immediate parent (a form, frame, or another picture box); [**Parent**](#parent) returns the form that ultimately hosts it. [**ClipControls**](#clipcontrols) decides whether child controls are clipped out of paint regions before the [**Paint**](#paint) handler runs; turning it off can speed up graphics-heavy paint code that touches only areas the child controls don't cover.

## Data binding

Setting [**DataSource**](#datasource) and [**DataField**](#datafield) binds the control's [**Picture**](#picture) to a binary field of a [**Data**](../Data) control's recordset: the field is read on each row change and **LoadPicture** is called on it, and the round-trip byte representation of the current **Picture** is written back when the row is saved. [**DataChanged**](#datachanged) is set whenever the user modifies the displayed picture.

## Properties

### Align
{: .no_toc }

> [!NOTE]
> Hidden. Provided for compatibility with VB6 forms that anchored a picture box to one edge of the form. Use [**Dock**](#dock) and [**Anchors**](#anchors) instead.

### Anchors
{: .no_toc }

The set of edges of the parent that the picture box's corresponding edges follow when the parent resizes. Read-only — assign individual `.Left`, `.Top`, `.Right`, `.Bottom` flags through the returned **Anchors** object.

### Appearance
{: .no_toc }

Determines how the border is drawn by the OS. A member of [**AppearanceConstants**](../../VBRUN/Constants/AppearanceConstants): **vbAppearFlat** or **vbAppear3d** (default). Only meaningful when [**BorderStyle**](#borderstyle) is **vbFixedSingleBorder**.

### AutoRedraw
{: .no_toc }

Controls whether graphics output is recorded into a persistent bitmap. **Boolean**, default **False**. See [AutoRedraw and the persistent image](#autoredraw-and-the-persistent-image).

### AutoSize
{: .no_toc }

When **True**, the control resizes itself to fit the assigned [**Picture**](#picture). **Boolean**, default **False**. Has no effect when [**Picture**](#picture) is **Nothing**.

### BackColor
{: .no_toc }

The background colour of the control's drawing surface, as an **OLE_COLOR**. Defaults to the system 3-D face colour. Assigning a new value invalidates the surface and triggers a repaint.

### BorderStyle
{: .no_toc }

Whether the picture box is drawn with a border. A member of [**ControlBorderStyleConstants**](../../VBRUN/Constants/ControlBorderStyleConstants): **vbNoBorder** (0) or **vbFixedSingleBorder** (1, default). The exact appearance of the border depends on [**Appearance**](#appearance).

### CausesValidation
{: .no_toc }

Determines whether the previously focused control's [**Validate**](#validate) event runs before this control receives the focus. **Boolean**, default **True**.

### ClipControls
{: .no_toc }

When **True** (default), child controls are clipped out of the picture box's painting region before the [**Paint**](#paint) event fires, so drawing commands cannot overpaint them. Setting **False** allows the [**Paint**](#paint) handler to draw across the entire client area, which is faster when the application knows the contained controls do not overlap the drawn region.

### Container
{: .no_toc }

The control that hosts this picture box — typically the form, a [**Frame**](../Frame), or another picture box. Read with **Get**, change with **Set**. Setting **Container** at run time re-parents the picture box.

### ControlType
{: .no_toc }

A read-only [**ControlTypeConstants**](../../VBRUN/Constants/ControlTypeConstants) value identifying this control as a picture box. Always **vbPictureBox**.

### CurrentX
{: .no_toc }

The horizontal coordinate, in [**ScaleMode**](#scalemode) units, at which the next graphics call will start unless it overrides it. **Single**. Updated automatically by [**Line**](#line), [**Circle**](#circle), [**PSet**](#pset), [**Print**](#print), and [**Cls**](#cls) (which resets it to 0).

### CurrentY
{: .no_toc }

The vertical coordinate, in [**ScaleMode**](#scalemode) units, at which the next graphics call will start. **Single**. See [**CurrentX**](#currentx).

### DataChanged
{: .no_toc }

A run-time-only **Boolean** that becomes **True** when the bound picture has been modified since the last save, and is cleared once the change has been written back to the recordset.

### DataField
{: .no_toc }

The name of the binary field, in the recordset of the bound [**DataSource**](#datasource), whose contents are loaded into [**Picture**](#picture). **String**.

### DataFormat
{: .no_toc }

A **StdDataFormat** that converts between the raw recordset value and the displayed picture, when the application needs custom handling. **Object**. Set with **Set**.

### DataMember
{: .no_toc }

When the [**DataSource**](#datasource) exposes more than one recordset, the name of the member to bind to. **String**.

### DataSource
{: .no_toc }

A reference to a [**Data**](../Data) control (or other **DataSource** provider) whose recordset supplies the value for [**DataField**](#datafield). Set with **Set**.

### Dock
{: .no_toc }

Where the picture box is docked within its container. A member of [**DockModeConstants**](../../VBRUN/Constants/DockModeConstants): **vbDockNone** (default), **vbDockLeft**, **vbDockTop**, **vbDockRight**, **vbDockBottom**, or **vbDockFill**. Docked picture boxes ignore [**Anchors**](#anchors).

### DragIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor while the control is being drag-and-dropped (see [**Drag**](#drag) and [**DragMode**](#dragmode)).

### DragMode
{: .no_toc }

Whether the control should drag itself when the user holds the mouse over it. A member of [**DragModeConstants**](../../VBRUN/Constants/DragModeConstants): **vbManual** (0, default — call [**Drag**](#drag) from code) or **vbAutomatic** (1).

### DrawMode
{: .no_toc }

The raster operation used when drawing through the graphics methods. A member of [**DrawModeConstants**](../../VBRUN/Constants/DrawModeConstants), default **vbCopyPen** (13 — opaque overwrite).

### DrawStyle
{: .no_toc }

The pen style used for line-drawing methods. A member of [**DrawStyleConstants**](../../VBRUN/Constants/DrawStyleConstants): **vbSolid** (0, default), **vbDash**, **vbDot**, **vbDashDot**, **vbDashDotDot**, **vbInvisible**, or **vbInsideSolid**. Solid is forced when [**DrawWidth**](#drawwidth) is greater than 1.

### DrawWidth
{: .no_toc }

The thickness, in pixels, of the pen used by [**Line**](#line), [**Circle**](#circle), and [**PSet**](#pset). **Long**, default 1. Values greater than 1 force [**DrawStyle**](#drawstyle) to **vbSolid**.

### Enabled
{: .no_toc }

Determines whether the control accepts user input. **Boolean**, default **True**. Disabled picture boxes still draw and display their picture, but do not raise mouse, keyboard, or focus events.

### FillColor
{: .no_toc }

The colour used to fill closed shapes drawn by [**Line**](#line) (with the `F` flag) and [**Circle**](#circle), as an **OLE_COLOR**. Default **0** (black). Honoured only when [**FillStyle**](#fillstyle) is not **vbFSTransparent**.

### FillStyle
{: .no_toc }

The pattern used to fill closed shapes. A member of [**FillStyleConstants**](../../VBRUN/Constants/FillStyleConstants): **vbFSTransparent** (1, default), **vbFSSolid** (0), or one of the hatched styles. **Transparent** suppresses fill entirely, so only the outline is drawn.

### Font
{: .no_toc }

The **StdFont** used to render text drawn by [**Print**](#print) and measured by [**TextWidth**](#textwidth) / [**TextHeight**](#textheight). The convenience properties [**FontName**](#fontname), [**FontSize**](#fontsize), [**FontBold**](#fontbold), [**FontItalic**](#fontitalic), [**FontStrikethru**](#fontstrikethru), and [**FontUnderline**](#fontunderline) read or write the corresponding members of this object.

### FontBold
{: .no_toc }

Shortcut for [**Font**](#font)`.Bold`. **Boolean**.

### FontItalic
{: .no_toc }

Shortcut for [**Font**](#font)`.Italic`. **Boolean**.

### FontName
{: .no_toc }

Shortcut for [**Font**](#font)`.Name`. **String**.

### FontSize
{: .no_toc }

Shortcut for [**Font**](#font)`.Size` — the point size. **Single**.

### FontStrikethru
{: .no_toc }

Shortcut for [**Font**](#font)`.Strikethrough`. **Boolean**.

### FontTransparent
{: .no_toc }

When **True** (default), text drawn by [**Print**](#print) leaves the background pixels untouched between glyphs; when **False**, the glyphs' background is filled with [**BackColor**](#backcolor). **Boolean**.

### FontUnderline
{: .no_toc }

Shortcut for [**Font**](#font)`.Underline`. **Boolean**.

### ForeColor
{: .no_toc }

The colour used by the graphics-method pen (lines, circles, points) and by [**Print**](#print) text, as an **OLE_COLOR**. Defaults to the system button-text colour.

### HasDC
{: .no_toc }

When **True** (default), the control owns a persistent device context that survives between paints, making [**hDC**](#hdc) stable across calls. When **False**, the device context is fetched on demand and released after each operation; this is more memory-efficient but precludes drawing methods that rely on a stable [**hDC**](#hdc) value.

### hDC
{: .no_toc }

A **LongPtr** giving the Win32 device-context handle for the picture box's drawing surface. Read-only. Suitable for passing to GDI API calls.

### Height
{: .no_toc }

The control's height, in twips by default (or in the container's **ScaleMode** units). **Single**.

### HelpContextID
{: .no_toc }

A **Long** identifying a topic in the application's help file, retrieved when the user presses **F1** while the control has focus.

### hWnd
{: .no_toc }

The Win32 window handle for the picture box, as a **LongPtr**. Read-only. Useful for passing to API functions.

### Image
{: .no_toc }

A read-only **StdPicture** giving the current contents of the picture box — both the assigned [**Picture**](#picture) *and* anything drawn into the surface — as a single bitmap, suitable for saving with **SavePicture**, copying to the clipboard, or assigning to another picture display. Available only when [**AutoRedraw**](#autoredraw) is **True**, or when the persistent bitmap is otherwise present.

### Index
{: .no_toc }

When the control is part of a control array, the **Long** zero-based index of this instance within the array. Reading **Index** on a non-array instance raises run-time error 343 (*Object not an array*). Read-only at run time.

### Left
{: .no_toc }

The horizontal distance from the left edge of the container to the left edge of the control. **Single**.

### LinkItem
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6 DDE; not currently implemented in twinBASIC.

### LinkMode
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6 DDE; not currently implemented in twinBASIC.

A member of [**LinkModeConstants**](../../VBRUN/Constants/LinkModeConstants).

### LinkTimeout
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6 DDE; not currently implemented in twinBASIC.

### LinkTopic
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6 DDE; not currently implemented in twinBASIC.

### MouseIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor when [**MousePointer**](#mousepointer) is **vbCustom** and the pointer is over the control.

### MousePointer
{: .no_toc }

The mouse cursor shown when the pointer is over the control. A member of [**MousePointerConstants**](../../VBRUN/Constants/MousePointerConstants).

### Name
{: .no_toc }

The unique design-time name of the control on its parent form. Read-only at run time.

### Negotiate
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### OLEDragMode
{: .no_toc }

How the picture box initiates OLE drag operations. A member of [**OLEDragConstants**](../../VBRUN/Constants/OLEDragConstants): **vbOLEDragManual** (0, default — call [**OLEDrag**](#oledrag) from code) or **vbOLEDragAutomatic** (1, which starts a drag with the current [**Picture**](#picture) as the payload as soon as the user begins a drag with the mouse).

### Opacity
{: .no_toc }

The control's opacity as a percentage (0–100, default 100). Values outside the range are clamped on **Initialize**. Requires Windows 8 or later for child controls.

### Parent
{: .no_toc }

A reference to the [**Form**](../Form) (or **UserControl**) that ultimately contains this control. Read-only. Distinct from [**Container**](#container), which returns the immediate parent.

### Picture
{: .no_toc }

The picture displayed in the control's client area. **StdPicture**. **Default property.** Use **Set** to assign a new picture, **Nothing** to clear it. Assigning when [**AutoSize**](#autosize) is **True** resizes the control to fit.

### PictureDpiScaling
{: .no_toc }

When **True**, [**Picture**](#picture) and the graphics-method outputs are scaled by the current DPI factor before drawing, so a 96-dpi-authored picture is presented at its physical size on high-DPI monitors. **Boolean**, default **False**.

### RightToLeft
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### ScaleHeight
{: .no_toc }

The height of the drawing surface in [**ScaleMode**](#scalemode) units. **Double**. Read-write — assigning a value switches [**ScaleMode**](#scalemode) to **vbUser** and rescales the vertical axis so the control's client area spans the new value.

### ScaleLeft
{: .no_toc }

The X coordinate that maps to the left edge of the drawing surface. **Double**, default 0. Assigning switches [**ScaleMode**](#scalemode) to **vbUser**.

### ScaleMode
{: .no_toc }

The unit used by [**Left**](#left), [**Top**](#top), [**Width**](#width), [**Height**](#height), [**CurrentX**](#currentx), [**CurrentY**](#currenty), and every graphics method. A member of [**ScaleModeConstants**](../../VBRUN/Constants/ScaleModeConstants): **vbUser** (0), **vbTwips** (1, default), **vbPoints**, **vbPixels**, **vbCharacters**, **vbInches**, **vbMillimeters**, or **vbCentimeters**.

### ScaleTop
{: .no_toc }

The Y coordinate that maps to the top edge of the drawing surface. **Double**, default 0. Assigning switches [**ScaleMode**](#scalemode) to **vbUser**.

### ScaleWidth
{: .no_toc }

The width of the drawing surface in [**ScaleMode**](#scalemode) units. **Double**. Read-write — assigning a value switches [**ScaleMode**](#scalemode) to **vbUser**.

### TabIndex
{: .no_toc }

The position of the control in the form's TAB-key navigation order. **Long**.

### TabStop
{: .no_toc }

Whether the user can reach the control by pressing the **TAB** key. **Boolean**, default **True**. A disabled control is skipped regardless of this setting.

### Tag
{: .no_toc }

A free-form **String** the application can use to associate custom data with the control. Ignored by the framework.

### ToolTipText
{: .no_toc }

A multi-line **String** displayed as a tooltip when the user hovers over the control.

### Top
{: .no_toc }

The vertical distance from the top of the container to the top of the control. **Single**.

### TransparencyKey
{: .no_toc }

An **OLE_COLOR** that, when set, becomes fully transparent in the rendered control. Default `-1` disables the effect. Requires Windows 8 or later for child controls.

### Visible
{: .no_toc }

Whether the control is shown. **Boolean**, default **True**.

### WhatsThisHelpID
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

A **Long** identifying a "What's This?" help-pop-up topic. See [**ShowWhatsThis**](#showwhatsthis).

### Width
{: .no_toc }

The control's width. **Single**.

## Methods

### Circle
{: .no_toc }

Draws a circle, ellipse, or elliptical arc on the drawing surface.

Syntax: *object*.**Circle** [ **Step** ] ( *X*, *Y* ), *Radius* [, *Color* [, *Start* [, *End* [, *Aspect* ] ] ] ]

*X*, *Y*
: *required* Coordinates of the centre in [**ScaleMode**](#scalemode) units. **Single**. When prefixed with **Step**, they are interpreted relative to [**CurrentX**](#currentx) / [**CurrentY**](#currenty).

*Radius*
: *required* The radius along the X axis. **Single**.

*Color*
: *optional* An **OLE_COLOR** for the outline. Defaults to [**ForeColor**](#forecolor).

*Start*, *End*
: *optional* Start and end angles in radians (0 to 2π). Negative values are interpreted as full radians and connect the arc end-point to the centre with a chord. Omitted draws a full circle.

*Aspect*
: *optional* The Y/X aspect ratio. **1.0** for a circle (default); other values give an ellipse.

[**CurrentX**](#currentx) and [**CurrentY**](#currenty) are left at the centre.

### Cls
{: .no_toc }

Clears the drawing surface to [**BackColor**](#backcolor), discards everything drawn through the graphics methods (and the persistent bitmap if [**AutoRedraw**](#autoredraw) is **True**), and resets [**CurrentX**](#currentx) / [**CurrentY**](#currenty) to **0**. The assigned [**Picture**](#picture) is not affected.

Syntax: *object*.**Cls**

### Drag
{: .no_toc }

Begins, completes, or cancels a manual drag-and-drop operation. Typically called from a [**MouseDown**](#mousedown) handler when [**DragMode**](#dragmode) is **vbManual**.

Syntax: *object*.**Drag** [ *Action* ]

*Action*
: *optional* A member of [**DragConstants**](../../VBRUN/Constants/DragConstants): **vbCancel** (0), **vbBeginDrag** (1, default), or **vbEndDrag** (2).

### Line
{: .no_toc }

Draws a straight line, a rectangle outline, or a filled rectangle.

Syntax: *object*.**Line** [ [ **Step** ] ( *X1*, *Y1* ) ] **-** [ **Step** ] ( *X2*, *Y2* ) [, *Color* [, **B** [**F**] ] ]

*X1*, *Y1*
: *optional* Start coordinates. **Single**. If omitted, the line starts at [**CurrentX**](#currentx) / [**CurrentY**](#currenty). **Step** makes them relative to the current pen position.

*X2*, *Y2*
: *required* End coordinates. **Single**. **Step** makes them relative to the start point.

*Color*
: *optional* An **OLE_COLOR** for the line. Defaults to [**ForeColor**](#forecolor).

*B*
: *optional* When present, draws a rectangle whose opposite corners are *(X1, Y1)* and *(X2, Y2)* instead of a line.

*F*
: *optional* Only valid with **B**. Fills the rectangle with [**FillColor**](#fillcolor) at the current [**FillStyle**](#fillstyle).

[**CurrentX**](#currentx) / [**CurrentY**](#currenty) are left at *(X2, Y2)*.

### Move
{: .no_toc }

Repositions and optionally resizes the control in a single call.

Syntax: *object*.**Move** *Left* [, *Top* [, *Width* [, *Height* ] ] ]

*Left*
: *required* A **Single** giving the new horizontal position.

*Top*, *Width*, *Height*
: *optional* New values for the corresponding properties. Omitted values are left unchanged.

### OLEDrag
{: .no_toc }

Initiates an OLE drag operation from the control, raising the [**OLEStartDrag**](#olestartdrag) event so the application can populate the **DataObject**.

Syntax: *object*.**OLEDrag**

### PaintPicture
{: .no_toc }

Draws a picture onto the surface, optionally scaling, clipping, or applying a raster operation.

Syntax: *object*.**PaintPicture** *Picture*, *X1*, *Y1* [, *Width1* [, *Height1* [, *X2* [, *Y2* [, *Width2* [, *Height2* [, *Opcode* [, *StretchQuality* ] ] ] ] ] ] ] ]

*Picture*
: *required* An **IPictureDisp** to paint — typically the [**Picture**](#picture) or [**Image**](#image) of another picture display.

*X1*, *Y1*
: *required* Destination top-left in [**ScaleMode**](#scalemode) units.

*Width1*, *Height1*
: *optional* Destination size. Defaults to the picture's natural size.

*X2*, *Y2*, *Width2*, *Height2*
: *optional* Source rectangle within *Picture*. Defaults to the whole picture.

*Opcode*
: *optional* A raster-operation code passed through to **BitBlt** — for example **&HCC0020** (`vbSrcCopy`, default) or **&H660046** (`vbSrcInvert`).

*StretchQuality*
: *optional* `vbStretchQuality` value: **vbQualityNormal** (default) or **vbQualityHigh** (uses half-tone stretching for nicer downscales).

### Point
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

In VB6, returns the colour of the pixel at the given coordinates as a **Long**, or **-1** if the point is outside the drawing surface.

Syntax: *object*.**Point**( *X* **As Single**, *Y* **As Single** ) **As Long**

### Print
{: .no_toc }

Writes text to the drawing surface using [**Font**](#font), starting at [**CurrentX**](#currentx) / [**CurrentY**](#currenty) and advancing them as it goes. Dispatched through the **Print** statement so multiple expressions can be separated by `;` (no spacing) or `,` (tab to next print zone). **Spc(n)** inserts *n* spaces and **Tab(n)** moves to print column *n*.

Syntax: *object*.**Print** \[ *expressionlist* ] \[ **;** \| **,** ]

A trailing `;` or `,` suppresses the newline so the next [**Print**](#print) call continues on the same line.

### PSet
{: .no_toc }

Sets a single pixel.

Syntax: *object*.**PSet** [ **Step** ] ( *X*, *Y* ) [, *Color* ]

*X*, *Y*
: *required* Coordinates in [**ScaleMode**](#scalemode) units. **Step** makes them relative to [**CurrentX**](#currentx) / [**CurrentY**](#currenty).

*Color*
: *optional* An **OLE_COLOR**. Defaults to [**ForeColor**](#forecolor).

[**CurrentX**](#currentx) / [**CurrentY**](#currenty) are left at the set point.

### Refresh
{: .no_toc }

Forces an immediate repaint. When [**AutoRedraw**](#autoredraw) is **True**, copies the persistent bitmap to the visible surface; otherwise invalidates the control and triggers a [**Paint**](#paint) event.

Syntax: *object*.**Refresh**

### Scale
{: .no_toc }

Defines a user coordinate system for the surface. Calling **Scale** with no arguments resets [**ScaleMode**](#scalemode) to **vbTwips**.

Syntax: *object*.**Scale** [ ( *X1*, *Y1* ) **-** ( *X2*, *Y2* ) ]

*X1*, *Y1*
: *required* (with the second pair) The coordinate that maps to the top-left corner — sets [**ScaleLeft**](#scaleleft) and [**ScaleTop**](#scaletop).

*X2*, *Y2*
: *required* The coordinate that maps to the bottom-right corner — sets [**ScaleWidth**](#scalewidth) = `X2 - X1` and [**ScaleHeight**](#scaleheight) = `Y2 - Y1`. [**ScaleMode**](#scalemode) is switched to **vbUser**.

### ScaleX
{: .no_toc }

Converts a horizontal distance from one scale mode to another without changing [**ScaleMode**](#scalemode).

Syntax: *object*.**ScaleX**( *Width* [, *FromScale* [, *ToScale* ] ] ) **As Single**

*Width*
: *required* The value to convert. **Single**.

*FromScale*, *ToScale*
: *optional* [**ScaleModeConstants**](../../VBRUN/Constants/ScaleModeConstants) members. *FromScale* defaults to the control's current [**ScaleMode**](#scalemode); *ToScale* defaults to **vbTwips**.

### ScaleY
{: .no_toc }

The vertical counterpart of [**ScaleX**](#scalex), for converting heights.

Syntax: *object*.**ScaleY**( *Height* [, *FromScale* [, *ToScale* ] ] ) **As Single**

### SetFocus
{: .no_toc }

Moves the input focus to the control. The control must be both [**Visible**](#visible) and [**Enabled**](#enabled), or run-time error 5 (*Invalid procedure call or argument*) is raised.

Syntax: *object*.**SetFocus**

### ShowWhatsThis
{: .no_toc }

Displays the topic identified by [**WhatsThisHelpID**](#whatsthishelpid) as a "What's This?" pop-up.

Syntax: *object*.**ShowWhatsThis**

### TextHeight
{: .no_toc }

Measures the height, in [**ScaleMode**](#scalemode) units, of the given string when rendered in the current [**Font**](#font) — including the line-spacing leading, so the result is suitable for advancing [**CurrentY**](#currenty) between rows of text. Embedded line breaks are honoured.

Syntax: *object*.**TextHeight**( *Str* **As String** ) **As Single**

### TextWidth
{: .no_toc }

Measures the width, in [**ScaleMode**](#scalemode) units, of the given string when rendered in the current [**Font**](#font). Returns the longest line width when *Str* contains embedded line breaks.

Syntax: *object*.**TextWidth**( *Str* **As String** ) **As Single**

### ZOrder
{: .no_toc }

Brings the control to the front or back of its sibling stack.

Syntax: *object*.**ZOrder** [ *Position* ]

*Position*
: *optional* A member of [**ZOrderConstants**](../../VBRUN/Constants/ZOrderConstants): **vbBringToFront** (0, default) or **vbSendToBack** (1).

### LinkExecute
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6 DDE; not currently implemented in twinBASIC.

### LinkPoke
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6 DDE; not currently implemented in twinBASIC.

### LinkRequest
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6 DDE; not currently implemented in twinBASIC.

### LinkSend
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6 DDE; not currently implemented in twinBASIC.

## Events

### Change
{: .no_toc }

Raised when [**Picture**](#picture) is assigned a new value — either from code or from the bound recordset.

Syntax: *object*\_**Change**( )

### Click
{: .no_toc }

Raised when the user clicks the control with any mouse button. **Default-designer event.**

Syntax: *object*\_**Click**( )

### DblClick
{: .no_toc }

Raised when the user double-clicks the control.

Syntax: *object*\_**DblClick**( )

### DragDrop
{: .no_toc }

Raised on the destination control when a manual drag operation ends over it.

Syntax: *object*\_**DragDrop**( *Source* **As Control**, *X* **As Single**, *Y* **As Single** )

### DragOver
{: .no_toc }

Raised on the control under the cursor while a manual drag operation is in progress.

Syntax: *object*\_**DragOver**( *Source* **As Control**, *X* **As Single**, *Y* **As Single**, *State* **As Integer** )

### GotFocus
{: .no_toc }

Raised when the control receives the input focus.

Syntax: *object*\_**GotFocus**( )

### Initialize
{: .no_toc }

Raised once, after the underlying window has been created and [**Picture**](#picture) has been loaded from the serialized data.

Syntax: *object*\_**Initialize**( )

### KeyDown
{: .no_toc }

Raised when the user presses any key while the control has focus.

Syntax: *object*\_**KeyDown**( *KeyCode* **As Integer**, *Shift* **As Integer** )

### KeyPress
{: .no_toc }

Raised when the user types a character that produces an ANSI keystroke.

Syntax: *object*\_**KeyPress**( *KeyAscii* **As Integer** )

### KeyUp
{: .no_toc }

Raised when the user releases a key while the control has focus.

Syntax: *object*\_**KeyUp**( *KeyCode* **As Integer**, *Shift* **As Integer** )

### LinkClose
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6 DDE; not currently implemented in twinBASIC.

### LinkError
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6 DDE; not currently implemented in twinBASIC.

### LinkNotify
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6 DDE; not currently implemented in twinBASIC.

### LinkOpen
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6 DDE; not currently implemented in twinBASIC.

### LostFocus
{: .no_toc }

Raised when the control loses the input focus.

Syntax: *object*\_**LostFocus**( )

### MouseDown
{: .no_toc }

Raised when the user presses any mouse button over the control.

Syntax: *object*\_**MouseDown**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseMove
{: .no_toc }

Raised when the cursor moves over the control.

Syntax: *object*\_**MouseMove**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseUp
{: .no_toc }

Raised when the user releases a mouse button over the control.

Syntax: *object*\_**MouseUp**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseWheel
{: .no_toc }

Raised when the user rotates the mouse wheel while the control has focus or the cursor is over it. New in twinBASIC — there is no equivalent VB6 event.

Syntax: *object*\_**MouseWheel**( *Delta* **As Integer**, *Horizontal* **As Boolean** )

*Delta*
: A positive or negative scroll delta in units of `WHEEL_DELTA` (120).

*Horizontal*
: **True** for a horizontal-wheel rotation, **False** for the standard vertical wheel.

### OLECompleteDrag
{: .no_toc }

Raised on the source control when the OLE drag operation finishes, indicating which effect (copy, move, none) the destination accepted.

Syntax: *object*\_**OLECompleteDrag**( *Effect* **As Long** )

### OLEDragDrop
{: .no_toc }

Raised on the destination control when the user drops data on it.

Syntax: *object*\_**OLEDragDrop**( *Data* **As DataObject**, *Effect* **As Long**, *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### OLEDragOver
{: .no_toc }

Raised on the destination control while an OLE drag passes over it.

Syntax: *object*\_**OLEDragOver**( *Data* **As DataObject**, *Effect* **As Long**, *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single**, *State* **As Integer** )

### OLEGiveFeedback
{: .no_toc }

Raised on the source control during a drag so the application can adjust the cursor or other visual feedback.

Syntax: *object*\_**OLEGiveFeedback**( *Effect* **As Long**, *DefaultCursors* **As Boolean** )

### OLESetData
{: .no_toc }

Raised on the source control when the destination requests data in a format that was registered but not yet supplied.

Syntax: *object*\_**OLESetData**( *Data* **As DataObject**, *DataFormat* **As Integer** )

### OLEStartDrag
{: .no_toc }

Raised on the source control at the start of an OLE drag, so the application can populate the **DataObject** and choose the allowed effects. Also raised automatically when [**OLEDragMode**](#oledragmode) is **vbOLEDragAutomatic** and the user begins a drag.

Syntax: *object*\_**OLEStartDrag**( *Data* **As DataObject**, *AllowedEffects* **As Long** )

### Paint
{: .no_toc }

Raised when the control needs to redraw its client area — typically because it was uncovered, resized, or [**Refresh**](#refresh) was called. Not raised while [**AutoRedraw**](#autoredraw) is **True**; the persistent bitmap is blitted instead.

Syntax: *object*\_**Paint**( )

### Resize
{: .no_toc }

Raised after the control's [**Height**](#height) or [**Width**](#width) changes. Useful for re-flowing child controls or rescaling drawn content.

Syntax: *object*\_**Resize**( )

### Validate
{: .no_toc }

Raised when the focus is moving to another control whose [**CausesValidation**](#causesvalidation) is **True**. Setting *Cancel* to **True** keeps the focus on this control.

Syntax: *object*\_**Validate**( *Cancel* **As Boolean** )
