---
title: PropertyPage
parent: VB Package
permalink: /tB/Packages/VB/PropertyPage/
has_toc: false
---

# PropertyPage class
{: .no_toc }

A **PropertyPage** is a container that backs a single tab of a COM property-page dialog — the popup invoked from the **(Custom)** entry on an ActiveX control's property browser. It exposes the **IPropertyPage2** COM interface so that any host that supports ActiveX property pages (the twinBASIC IDE, classic VB6, Office, …) can place it inside its own property-sheet frame, give it the controls the user is editing, and apply the page's changes back to them.

Designing a property page is much like designing a small dialog [**Form**](../Form): drop child controls onto it, write event handlers, and use its drawing surface freely. What sets it apart is the lifecycle, which is controlled by the host rather than by the application:

1. The host instantiates the property-page class once per dialog.
2. The host calls **IPropertyPage2.SetObjects** to pass the selected ActiveX controls. The framework stores them in [**SelectedControls**](#selectedcontrols) and raises [**SelectionChanged**](#selectionchanged).
3. As the user edits values, the page handler sets [**Changed**](#changed) = **True** to enable the dialog's *Apply* button.
4. When the user clicks *OK* or *Apply*, the host raises [**ApplyChanges**](#applychanges) so the page can write the new values back to [**SelectedControls**](#selectedcontrols).
5. On dialog close the framework raises [**Terminate**](#terminate) and releases the class instance.

The default property is [**Controls**](#controls); the default-designer event is [**SelectionChanged**](#selectionchanged).

```tb
Private Sub PropertyPage_SelectionChanged()
    ' Mirror the first selected control's properties into the editor controls.
    txtCaption.Text = SelectedControls(0).Caption
End Sub

Private Sub txtCaption_Change()
    ' Any user edit marks the page dirty so the host enables Apply.
    Me.Changed = True
End Sub

Private Sub PropertyPage_ApplyChanges()
    ' Write the editor values back to every selected control.
    Dim ctl As Object
    For Each ctl In SelectedControls
        ctl.Caption = txtCaption.Text
    Next
End Sub
```

* TOC
{:toc}

## Communicating with the host

[**SelectedControls**](#selectedcontrols) is a read-only collection of the controls the host wants this tab to edit. The host populates it before raising [**SelectionChanged**](#selectionchanged); the page keeps the references for as long as it is alive. The collection supports indexed access (`SelectedControls(0)`), enumeration (`For Each ctl In SelectedControls`), and a **Count** member.

[**Changed**](#changed) is a two-way flag the page uses to talk to the host. Setting it to **True** enables the host's *Apply* button; the framework notifies the host immediately through **IPropertyPageSite.OnStatusChange**. Setting it to **False** clears the flag — the framework does this automatically after raising [**ApplyChanges**](#applychanges).

[**EditProperty**](#editproperty) is declared for VB6 compatibility but is not currently raised by the runtime; pages that want to react to a per-property edit request from the host need to wait until that wiring lands.

[**ValidateControls**](#validatecontrols) explicitly fires the focused child control's **Validate** event from code; it raises run-time error 380 if validation fails. Useful in [**ApplyChanges**](#applychanges) to refuse to apply when an editor's value is malformed.

## Standard sizes

The VB6 property-page dialog frame draws each tab at one of two standard sizes — small (250 × 62 dialog units) or large (250 × 110 dialog units) — chosen by the host based on the [**StandardSize**](#standardsize) of the largest page in the sheet. Assigning [**StandardSize**](#standardsize) at design time tells the host which size to request; reading it at run time returns the size the page is actually drawn at, or **StandardSizeCustom** when [**Width**](#width) and [**Height**](#height) have been changed away from either preset. The value is in **EnumStandardSize** units: **StandardSizeCustom** (0), **StandardSizeSmall** (1), or **StandardSizeLarge** (2).

## Drawing surface

A **PropertyPage** is a graphics surface in its own right. The full set of VB6 drawing primitives — [**Cls**](#cls), [**Circle**](#circle), [**Line**](#line), [**PSet**](#pset), [**PaintPicture**](#paintpicture), and the [**Print**](#print) statement — write to its device context, using [**ForeColor**](#forecolor), [**FillColor**](#fillcolor)/[**FillStyle**](#fillstyle), [**DrawWidth**](#drawwidth), [**DrawMode**](#drawmode), and [**DrawStyle**](#drawstyle) for the pen and fill, and [**Font**](#font) for text. The current pen position is tracked by [**CurrentX**](#currentx) and [**CurrentY**](#currenty); [**TextWidth**](#textwidth) and [**TextHeight**](#textheight) measure a string in the current font; [**ScaleX**](#scalex) and [**ScaleY**](#scaley) convert single coordinates between scale modes.

The coordinate system is governed by [**ScaleMode**](#scalemode), [**ScaleLeft**](#scaleleft), [**ScaleTop**](#scaletop), [**ScaleWidth**](#scalewidth), and [**ScaleHeight**](#scaleheight), exactly as on a [**Form**](../Form). [**AutoRedraw**](#autoredraw) controls whether drawn output persists across paints — when **False** (default), the [**Paint**](#paint) event must redraw on every invalidation; when **True**, the page keeps an off-screen buffer that survives invalidations and the **Paint** event is suppressed.

## Controls and containers

[**Controls**](#controls) is the collection of every child control on this page, indexable by name or zero-based position. The page is enumerable directly (`For Each ctrl In Me`) — the [**Count**](#count) and [**\_Default**](#controls) members forward to it.

[**ActiveControl**](#activecontrol) returns the focused child, or **Nothing** if no control on this page has the focus. [**SetFocus**](#setfocus) gives the focus to the page itself, which forwards it to the page's tab order. [**KeyPreview**](#keypreview) routes keystrokes through the page's [**KeyDown**](#keydown), [**KeyUp**](#keyup), and [**KeyPress**](#keypress) events *before* the focused control sees them — useful for handling **Escape** or page-wide hotkeys.

## Properties

### ActiveControl
{: .no_toc }

The control on this page that currently has the input focus, as a **Control** object, or **Nothing** when no control on this page is focused. Read-only.

### Appearance
{: .no_toc }

A member of [**AppearanceConstants**](../../VBRUN/Constants/AppearanceConstants): **vbAppearFlat** or **vbAppear3d** (default).

> [!NOTE]
> Retained for VB6 compatibility; the property has no observable effect on a property page.

### AutoRedraw
{: .no_toc }

Whether drawing performed on the page persists across invalidations. **Boolean**, default **False**.

When **False**, drawing primitives — [**Cls**](#cls), [**Circle**](#circle), [**Line**](#line), [**PSet**](#pset), [**PaintPicture**](#paintpicture), and [**Print**](#print) — paint directly to the screen and the page must redraw them in its [**Paint**](#paint) event whenever the affected area is invalidated. When **True**, the page keeps an off-screen bitmap, drawing primitives paint into it (and immediately to the screen), the bitmap survives invalidations, and the **Paint** event is suppressed.

### BackColor
{: .no_toc }

The background colour of the page's client area, as an **OLE_COLOR**. Defaults to the system 3-D face colour.

### Caption
{: .no_toc }

The text the host displays on this page's tab in the property-sheet frame. **String**.

Syntax: *object*.**Caption** [ = *string* ]

The framework reads the current value when the host calls **IPropertyPage2.GetPageInfo**, so changes made before the page is activated take effect; changes made afterwards are ignored by most hosts.

### Changed
{: .no_toc }

Whether the page has unapplied edits. **Boolean**, default **False**.

Setting **Changed** to **True** notifies the host through **IPropertyPageSite.OnStatusChange** that the page is dirty — the host normally enables its *Apply* button as a result. The framework automatically clears the flag back to **False** before raising [**ApplyChanges**](#applychanges), so handlers do not need to reset it themselves.

### ClipControls
{: .no_toc }

Whether child controls are clipped out of the page's drawing region during paint. **Boolean**, default **True**. Read-only at run time — set at design time.

### Controls
{: .no_toc }

The collection of every control hosted by this page, indexable by control name or zero-based position. **Default property.** Read-only — controls are added to the collection by the runtime, not by user code.

```tb
Dim ctrl As Control
For Each ctrl In Me.Controls
    ctrl.Enabled = False
Next
```

### ControlType
{: .no_toc }

A read-only [**ControlTypeConstants**](../../VBRUN/Constants/ControlTypeConstants) value identifying this control as a property page. Always **vbPropertyPage**.

### Count
{: .no_toc }

The number of controls in [**Controls**](#controls), as a **Long**. Read-only. Equivalent to `Me.Controls.Count`.

### CurrentX
{: .no_toc }

The horizontal pen position, in [**ScaleMode**](#scalemode) units, used by drawing primitives that omit a starting coordinate (for example, [**Print**](#print) and the rectangle form of [**Line**](#line)). **Double**.

### CurrentY
{: .no_toc }

The vertical pen position, in [**ScaleMode**](#scalemode) units, used by drawing primitives that omit a starting coordinate. **Double**.

### DpiScaleFactorX
{: .no_toc }

The horizontal DPI scale factor of the monitor the page is currently on, as a **Double**. `1.0` at 96 DPI, `1.25` at 120 DPI, `1.5` at 144 DPI, and so on. Read-only.

### DpiScaleFactorY
{: .no_toc }

The vertical DPI scale factor of the monitor the page is currently on. Currently always equal to [**DpiScaleFactorX**](#dpiscalefactorx). Read-only.

### DrawMode
{: .no_toc }

The raster operation that drawing primitives apply when combining the pen with the destination. A member of [**DrawModeConstants**](../../VBRUN/Constants/DrawModeConstants), default **vbCopyPen**.

### DrawStyle
{: .no_toc }

The pen line pattern used by drawing primitives. A member of [**DrawStyleConstants**](../../VBRUN/Constants/DrawStyleConstants): **vbSolid** (default), **vbDash**, **vbDot**, **vbDashDot**, **vbDashDotDot**, **vbInvisible**, or **vbInsideSolid**.

### DrawWidth
{: .no_toc }

The pen width in pixels for drawing primitives. **Long**, default `1`. Widths greater than 1 force [**DrawStyle**](#drawstyle) back to **vbSolid** (a Win32 GDI limitation).

### FillColor
{: .no_toc }

The fill colour for closed shapes drawn by [**Circle**](#circle) and the rectangle form of [**Line**](#line). **OLE_COLOR**, default `0` (black). Used only when [**FillStyle**](#fillstyle) is not **vbFSTransparent**.

### FillStyle
{: .no_toc }

The fill pattern for closed shapes. A member of [**FillStyleConstants**](../../VBRUN/Constants/FillStyleConstants): **vbFSSolid**, **vbFSTransparent** (default), **vbHorizontalLine**, **vbVerticalLine**, **vbUpwardDiagonal**, **vbDownwardDiagonal**, **vbCross**, or **vbDiagonalCross**.

### Font
{: .no_toc }

The **StdFont** used by the [**Print**](#print) statement and other text drawing on this page. The convenience properties [**FontName**](#fontname), [**FontSize**](#fontsize), [**FontBold**](#fontbold), [**FontItalic**](#fontitalic), [**FontStrikethru**](#fontstrikethru), and [**FontUnderline**](#fontunderline) read or write the corresponding members of this object.

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

When **True** (default), text drawn on the page has a transparent background, leaving the underlying drawing visible behind it. When **False**, text is drawn over an opaque rectangle filled with [**BackColor**](#backcolor). **Boolean**.

### FontUnderline
{: .no_toc }

Shortcut for [**Font**](#font)`.Underline`. **Boolean**.

### ForeColor
{: .no_toc }

The pen colour used by [**Circle**](#circle), [**Line**](#line), [**PSet**](#pset), and the text drawn by [**Print**](#print). **OLE_COLOR**.

### HasDC
{: .no_toc }

Whether the page keeps a private device context (`CS_OWNDC`) for its drawing surface. **Boolean**, always **True** on a property page. Read-only.

### hDC
{: .no_toc }

The Win32 device context handle for the page, as a **LongPtr**. Read-only. Returns `0` when the underlying window has not yet been created. Useful for passing to GDI API calls.

### Height
{: .no_toc }

The page's outer height, in twips by default (or in the calling code's **ScaleMode** units). **Double**. The host normally sizes the page itself based on [**StandardSize**](#standardsize); assigning **Height** explicitly switches to the custom size.

### HelpContextID
{: .no_toc }

A **Long** identifying a topic in the application's help file, retrieved when the user presses **F1** while the page has focus.

### hWnd
{: .no_toc }

The Win32 window handle for the page, as a **LongPtr**. Read-only. Useful for passing to API functions.

### KeyPreview
{: .no_toc }

When **True**, the page's [**KeyDown**](#keydown), [**KeyUp**](#keyup), and [**KeyPress**](#keypress) events fire *before* the focused control receives the same keystroke. **Boolean**, default **False**. Useful for page-wide hotkeys; events still fire on the focused control afterwards.

### Left
{: .no_toc }

The horizontal position of the page's outer rectangle within the host's property-sheet frame, in twips. **Double**. Set by the host through **IPropertyPage2.Activate** and **Move**; rarely assigned from user code.

### MouseIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor when [**MousePointer**](#mousepointer) is **vbCustom** and the pointer is over the page (and not over a child control with its own setting).

### MousePointer
{: .no_toc }

The mouse cursor shown when the pointer is over the page (and not over a child control with its own setting). A member of [**MousePointerConstants**](../../VBRUN/Constants/MousePointerConstants).

### Name
{: .no_toc }

The unique design-time name of the property-page class. Read-only at run time. Also the class name of the generated property-page class.

### OLEDropMode
{: .no_toc }

How the page responds to OLE drops. A restricted member of [**OLEDropConstants**](../../VBRUN/Constants/OLEDropConstants): **vbOLEDropNone** or **vbOLEDropManual**. Automatic-drop mode is not supported on a property page.

### Palette
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6's 256-colour palette feature; not currently implemented in twinBASIC.

### PaletteMode
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6's 256-colour palette feature; not currently implemented in twinBASIC.

### Picture
{: .no_toc }

A **StdPicture** drawn as the page's background. Painted before any drawing primitives or child controls. Assigning **Nothing** removes the background.

### PictureDpiScaling
{: .no_toc }

When **True**, [**Picture**](#picture) is scaled by the current DPI factor before drawing. **Boolean**, default **False**.

### RightToLeft
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### ScaleHeight
{: .no_toc }

The height of the logical drawing rectangle, in [**ScaleMode**](#scalemode) units. **Double**. Setting it (or [**ScaleWidth**](#scalewidth), [**ScaleLeft**](#scaleleft), or [**ScaleTop**](#scaletop)) implicitly switches **ScaleMode** to **vbUser**.

### ScaleLeft
{: .no_toc }

The logical horizontal coordinate of the left edge of the page's client area, in [**ScaleMode**](#scalemode) units. **Double**. Default `0`.

### ScaleMode
{: .no_toc }

The unit of measurement used by [**CurrentX**](#currentx), [**CurrentY**](#currenty), the drawing primitives, [**TextWidth**](#textwidth), and [**TextHeight**](#textheight). A member of [**ScaleModeConstants**](../../VBRUN/Constants/ScaleModeConstants): **vbTwips** (default), **vbPoints**, **vbPixels**, **vbCharacters**, **vbInches**, **vbMillimeters**, **vbCentimeters**, or **vbUser** (the four **Scale\*** properties define the rectangle).

### ScaleTop
{: .no_toc }

The logical vertical coordinate of the top edge of the page's client area, in [**ScaleMode**](#scalemode) units. **Double**. Default `0`.

### ScaleWidth
{: .no_toc }

The width of the logical drawing rectangle, in [**ScaleMode**](#scalemode) units. **Double**. Setting it implicitly switches **ScaleMode** to **vbUser**.

### SelectedControls
{: .no_toc }

The collection of objects the host has asked this page to edit, as a **SelectedControls** instance. Read-only. The framework populates the collection before raising [**SelectionChanged**](#selectionchanged) and clears it on [**Terminate**](#terminate).

The returned object exposes three members:

- `Count` **As Long** — the number of selected objects (`0` when the host has not yet called **SetObjects** or has cleared the selection).
- `Item(`*Index*`)` **As Object** — zero-based indexed access. **Default member**, so `SelectedControls(0)` returns the first object.
- `_NewEnum` — supports `For Each ctl In SelectedControls`.

The items are returned as **Object**, so use **CallByName** or late-bound member access to read and write their properties.

```tb
For Each ctl In SelectedControls
    ctl.Caption = txtCaption.Text
Next
```

### StandardSize
{: .no_toc }

The standard size of the page in the host's property-sheet frame. A member of **EnumStandardSize**: **StandardSizeCustom** (0), **StandardSizeSmall** (1 — 250 × 62 dialog units), or **StandardSizeLarge** (2 — 250 × 110 dialog units).

Syntax: *object*.**StandardSize** [ = *value* ]

Reading **StandardSize** compares the page's current pixel size against the small/large presets and returns **StandardSizeCustom** when neither matches. Assigning **StandardSizeSmall** or **StandardSizeLarge** resizes the page accordingly; assigning **StandardSizeCustom** is a no-op (leave the size as it is). The property is exposed only in code — VB6 exposed it on the design-time property sheet but never in the runtime object model.

### Tag
{: .no_toc }

A free-form **String** the application can use to associate custom data with the page. Ignored by the framework.

### Top
{: .no_toc }

The vertical position of the page's outer rectangle within the host's property-sheet frame, in twips. **Double**. Set by the host; rarely assigned from user code.

### Width
{: .no_toc }

The page's outer width, in twips by default (or in the calling code's **ScaleMode** units). **Double**. The host normally sizes the page itself based on [**StandardSize**](#standardsize); assigning **Width** explicitly switches to the custom size.

## Methods

### Circle
{: .no_toc }

Draws a circle, ellipse, or arc on the page using [**ForeColor**](#forecolor) for the outline and [**FillColor**](#fillcolor)/[**FillStyle**](#fillstyle) for the interior.

Syntax: *object*.**Circle** [ **Step** ] ( *X*, *Y* ), *Radius* [, [ *Color* ] [, [ *Start* ] [, [ *End* ] [, *Aspect* ] ] ] ]

*X*, *Y*
: *required* The centre, in [**ScaleMode**](#scalemode) units. **Step** makes the centre relative to ([**CurrentX**](#currentx), [**CurrentY**](#currenty)).

*Radius*
: *required* A **Single** giving the radius in **ScaleMode** units.

*Color*
: *optional* An **OLE_COLOR** for the outline; defaults to [**ForeColor**](#forecolor).

*Start*, *End*
: *optional* Angles in radians, used to draw an arc rather than a full circle.

*Aspect*
: *optional* Ratio of vertical to horizontal radius. `1.0` is circular; values away from `1.0` produce ellipses.

### Cls
{: .no_toc }

Clears any drawing performed by [**Circle**](#circle), [**Line**](#line), [**PSet**](#pset), [**PaintPicture**](#paintpicture), and [**Print**](#print), repaints [**BackColor**](#backcolor), and resets [**CurrentX**](#currentx) / [**CurrentY**](#currenty) to `0`. Does not affect the [**Picture**](#picture) backdrop or child controls.

Syntax: *object*.**Cls**

### Line
{: .no_toc }

Draws a line, or a rectangle, on the page using [**ForeColor**](#forecolor) (or an explicit colour) and [**DrawWidth**](#drawwidth)/[**DrawStyle**](#drawstyle).

Syntax: *object*.**Line** [ [ **Step** ] ( *X1*, *Y1* ) ] -[ **Step** ] ( *X2*, *Y2* ) [, [ *Color* ] [, **B** [ **F** ] ] ]

*X1*, *Y1*
: *optional* The start point, in [**ScaleMode**](#scalemode) units. **Step** makes the point relative to ([**CurrentX**](#currentx), [**CurrentY**](#currenty)). When omitted, drawing begins from the current pen position.

*X2*, *Y2*
: *required* The end point, in **ScaleMode** units. **Step** makes the point relative to (*X1*, *Y1*).

*Color*
: *optional* An **OLE_COLOR** for the line; defaults to [**ForeColor**](#forecolor).

**B**
: *optional* Draw a rectangle whose opposite corners are (*X1*, *Y1*) and (*X2*, *Y2*) instead of a line.

**F**
: *optional* When combined with **B**, fill the rectangle with [**ForeColor**](#forecolor) instead of [**FillColor**](#fillcolor)/[**FillStyle**](#fillstyle).

### OLEDrag
{: .no_toc }

Initiates an OLE drag operation from the page, raising the [**OLEStartDrag**](#olestartdrag) event so the application can populate the **DataObject**.

Syntax: *object*.**OLEDrag**

### PaintPicture
{: .no_toc }

Draws a **StdPicture** onto the page, with optional scaling and raster operations.

Syntax: *object*.**PaintPicture** *Picture*, *X1*, *Y1* [, *Width1* [, *Height1* [, *X2* [, *Y2* [, *Width2* [, *Height2* [, *Opcode* [, *StretchQuality* ] ] ] ] ] ] ] ]

*Picture*
: *required* A **StdPicture** to draw.

*X1*, *Y1*
: *required* The destination upper-left corner, in [**ScaleMode**](#scalemode) units.

*Width1*, *Height1*
: *optional* Destination size; defaults to the picture's natural size.

*X2*, *Y2*, *Width2*, *Height2*
: *optional* The source rectangle within the picture; defaults to the whole picture.

*Opcode*
: *optional* A raster-operation code (member of [**RasterOpConstants**](../../VBRUN/Constants/RasterOpConstants)). Defaults to **vbSrcCopy**.

*StretchQuality*
: *optional* The interpolation method when scaling. Defaults to normal quality.

### Point
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC. In VB6 this returns the **OLE_COLOR** of a single pixel of the drawing surface.

Syntax: *object*.**Point**( *X*, *Y* )

### Print
{: .no_toc }

Writes text to the page's drawing surface using [**Font**](#font), starting at [**CurrentX**](#currentx) / [**CurrentY**](#currenty) and advancing them as it goes. Dispatched through the VB6 **Print** statement so multiple expressions can be separated by `;` (no spacing) or `,` (tab to the next print zone). **Spc(n)** inserts *n* spaces and **Tab(n)** moves to print column *n*. Output honours [**Font**](#font), [**ForeColor**](#forecolor), and [**FontTransparent**](#fonttransparent), and — when [**AutoRedraw**](#autoredraw) is **True** — is recorded into the persistent off-screen bitmap so it survives invalidations.

Syntax: *object*.**Print** \[ *expressionlist* ] \[ **;** \| **,** ]

A trailing `;` or `,` suppresses the newline so the next **Print** call continues on the same line.

### PSet
{: .no_toc }

Sets a single pixel on the page to a specified colour.

Syntax: *object*.**PSet** [ **Step** ] ( *X*, *Y* ) [, *Color* ]

*X*, *Y*
: *required* The pixel position, in [**ScaleMode**](#scalemode) units. **Step** makes the position relative to ([**CurrentX**](#currentx), [**CurrentY**](#currenty)).

*Color*
: *optional* An **OLE_COLOR**; defaults to [**ForeColor**](#forecolor).

### Refresh
{: .no_toc }

Forces an immediate repaint of the page, raising [**Paint**](#paint) when [**AutoRedraw**](#autoredraw) is **False**.

Syntax: *object*.**Refresh**

### Scale
{: .no_toc }

Sets the page's logical drawing rectangle in a single call by assigning [**ScaleLeft**](#scaleleft), [**ScaleTop**](#scaletop), [**ScaleWidth**](#scalewidth), and [**ScaleHeight**](#scaleheight). Switches [**ScaleMode**](#scalemode) to **vbUser**. Calling **Scale** with no arguments resets the rectangle to a 1-to-1 mapping with the client area in pixels.

Syntax: *object*.**Scale** [ ( *X1*, *Y1* )-( *X2*, *Y2* ) ]

*X1*, *Y1*
: *optional* The logical coordinate at the top-left corner.

*X2*, *Y2*
: *optional* The logical coordinate at the bottom-right corner.

### ScaleX
{: .no_toc }

Converts a horizontal length from one [**ScaleMode**](#scalemode) to another.

Syntax: *object*.**ScaleX**( *Width* [, *FromScale* [, *ToScale* ] ] )

*Width*
: *required* A **Single** giving the source length.

*FromScale*, *ToScale*
: *optional* Members of [**ScaleModeConstants**](../../VBRUN/Constants/ScaleModeConstants). Default to the current **ScaleMode** when omitted.

### ScaleY
{: .no_toc }

Converts a vertical length from one [**ScaleMode**](#scalemode) to another.

Syntax: *object*.**ScaleY**( *Height* [, *FromScale* [, *ToScale* ] ] )

*Height*
: *required* A **Single** giving the source length.

*FromScale*, *ToScale*
: *optional* Members of [**ScaleModeConstants**](../../VBRUN/Constants/ScaleModeConstants). Default to the current **ScaleMode** when omitted.

### SetFocus
{: .no_toc }

Activates the page and gives input focus to its first focusable child control (or to whichever control last held focus on this page).

Syntax: *object*.**SetFocus**

### TextHeight
{: .no_toc }

Returns the height that the given string would occupy when drawn with the page's current [**Font**](#font), in [**ScaleMode**](#scalemode) units. Embedded line breaks are honoured.

Syntax: *object*.**TextHeight**( *Str* )

*Str*
: *required* A **String** to measure.

### TextWidth
{: .no_toc }

Returns the width that the given string would occupy when drawn with the page's current [**Font**](#font), in [**ScaleMode**](#scalemode) units. Returns the longest line width when *Str* contains embedded line breaks.

Syntax: *object*.**TextWidth**( *Str* )

*Str*
: *required* A **String** to measure.

### ValidateControls
{: .no_toc }

Fires the **Validate** event of the currently active control on this page. If the handler sets *Cancel* to **True**, **ValidateControls** raises run-time error 380 (*Invalid property value*); the caller can wrap this with `On Error` to detect a failed validation. Useful in [**ApplyChanges**](#applychanges) to refuse to apply when an editor's value is malformed.

Syntax: *object*.**ValidateControls**

## Events

### ApplyChanges
{: .no_toc }

Raised when the host calls **IPropertyPage2.Apply** — typically because the user clicked *OK* or *Apply* on the property-sheet dialog. The handler should write the page's current editor values back to every object in [**SelectedControls**](#selectedcontrols). The framework clears [**Changed**](#changed) to **False** before the handler runs. Not raised when [**Changed**](#changed) is already **False** at the time of the apply.

Syntax: *object*\_**ApplyChanges**( )

### Click
{: .no_toc }

Raised when the user single-clicks the page's client area (i.e. not over any child control).

Syntax: *object*\_**Click**( )

### DblClick
{: .no_toc }

Raised when the user double-clicks the page's client area.

Syntax: *object*\_**DblClick**( )

### DPIChange
{: .no_toc }

Raised when the page moves to a monitor with a different DPI scale, *but only* when the application is per-monitor DPI aware (`PROCESS_PER_MONITOR_DPI_AWARE`). The event's *NewDPI* argument gives the new effective DPI; child controls re-scale themselves automatically.

Syntax: *object*\_**DPIChange**( *NewDPI* **As Long** )

### DragDrop
{: .no_toc }

Raised on the destination control when a manual drag operation ends over it.

Syntax: *object*\_**DragDrop**( *Source* **As Control**, *X* **As Single**, *Y* **As Single** )

### DragOver
{: .no_toc }

Raised on the control under the cursor while a manual drag operation is in progress.

Syntax: *object*\_**DragOver**( *Source* **As Control**, *X* **As Single**, *Y* **As Single**, *State* **As Integer** )

### EditProperty
{: .no_toc }

> [!NOTE]
> Declared for VB6 compatibility; not currently raised in twinBASIC. The host's **IPropertyPage2.EditProperty** request is acknowledged but does not propagate to a managed event yet.

When implemented, raised when the host asks the page to give focus to the editor that corresponds to the named property — typically because the user double-clicked that property in the property browser.

Syntax: *object*\_**EditProperty**( *PropertyName* **As String** )

*PropertyName*
: The name of the property the host wants edited.

### GotFocus
{: .no_toc }

Raised when the page receives the input focus and no enabled child control of the page is in a position to take it instead.

Syntax: *object*\_**GotFocus**( )

### Initialize
{: .no_toc }

Raised once, after the page's window and all controls have been created and the page has been event-registered into its host's frame, before [**SelectionChanged**](#selectionchanged) is first raised. The classic place to populate editor controls with static data (lists of choices, default values, …) that doesn't depend on the selected objects.

Syntax: *object*\_**Initialize**( )

### KeyDown
{: .no_toc }

Raised when the user presses any key. Fires on the focused control by default; with [**KeyPreview**](#keypreview) **True**, fires on the page first.

Syntax: *object*\_**KeyDown**( *KeyCode* **As Integer**, *Shift* **As Integer** )

### KeyPress
{: .no_toc }

Raised when the user types a character that produces an ANSI keystroke. Fires on the focused control by default; with [**KeyPreview**](#keypreview) **True**, fires on the page first.

Syntax: *object*\_**KeyPress**( *KeyAscii* **As Integer** )

### KeyUp
{: .no_toc }

Raised when the user releases a key. Fires on the focused control by default; with [**KeyPreview**](#keypreview) **True**, fires on the page first.

Syntax: *object*\_**KeyUp**( *KeyCode* **As Integer**, *Shift* **As Integer** )

### LostFocus
{: .no_toc }

Raised when the page loses the input focus.

Syntax: *object*\_**LostFocus**( )

### MouseDown
{: .no_toc }

Raised when the user presses any mouse button over the page's client area.

Syntax: *object*\_**MouseDown**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseMove
{: .no_toc }

Raised when the cursor moves over the page's client area.

Syntax: *object*\_**MouseMove**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseUp
{: .no_toc }

Raised when the user releases a mouse button over the page's client area.

Syntax: *object*\_**MouseUp**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

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

Raised on the source control at the start of an OLE drag, so the application can populate the **DataObject** and choose the allowed effects.

Syntax: *object*\_**OLEStartDrag**( *Data* **As DataObject**, *AllowedEffects* **As Long** )

### Paint
{: .no_toc }

Raised when an invalidated portion of the page needs to be redrawn. Suppressed when [**AutoRedraw**](#autoredraw) is **True** — the page's persistent off-screen buffer is blitted to the screen instead.

Syntax: *object*\_**Paint**( )

### SelectionChanged
{: .no_toc }

Raised after the host has called **IPropertyPage2.SetObjects** to give the page a new set of objects to edit, or to clear the selection. The handler should read [**SelectedControls**](#selectedcontrols) and mirror the common state of those objects into the page's editor controls. **Default-designer event.**

Syntax: *object*\_**SelectionChanged**( )

### Terminate
{: .no_toc }

Raised when the page is being destroyed — once when its window is unhooked from the host's property-sheet frame, and again when the class instance's last reference is released. The handler runs while [**SelectedControls**](#selectedcontrols) is still populated, giving it a final chance to read state from the edited objects before they are released.

Syntax: *object*\_**Terminate**( )
