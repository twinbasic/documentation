---
title: UserControl
parent: VB Package
permalink: /tB/Packages/VB/UserControl/
has_toc: false
---

# UserControl class
{: .no_toc }

A **UserControl** is the base class for designing a reusable ActiveX control in twinBASIC. Each control designed in the IDE becomes its own class derived from **UserControl** — its child controls become members of that class, its event handlers become methods on it, and the file's name becomes the COM class name registered with the runtime. Hosts that embed the control (the twinBASIC IDE, classic VB6, Office, any other ActiveX container) talk to it through the standard ActiveX control interfaces, while the design-time code-behind talks to it as a regular twinBASIC class.

A **UserControl** is not directly visible at run time as a property of an outer form. The host wraps it in an **Extender** object that adds the standard container properties (**Top**, **Left**, **Width**, **Height**, **Name**, **Visible**, **TabIndex**, …) and the user code reaches the extender through [**Extender**](#extender). The inner **UserControl** keeps a graphics surface, a private property bag, and the lifecycle events through which the host loads and saves the control's persistent state.

The default-designer event is [**Initialize**](#initialize) — double-clicking the control surface in the IDE adds a `UserControl_Initialize` handler.

```tb
' In MyMonthView's code-behind:
Private mFirstDay As Date

Private Sub UserControl_InitProperties()
    mFirstDay = Date              ' first time the host instantiates a fresh control
End Sub

Private Sub UserControl_ReadProperties(PropBag As PropertyBag)
    mFirstDay = PropBag.ReadProperty("FirstDay", Date)
End Sub

Private Sub UserControl_WriteProperties(PropBag As PropertyBag)
    PropBag.WriteProperty "FirstDay", mFirstDay, Date
End Sub

Public Property Get FirstDay() As Date
    FirstDay = mFirstDay
End Property

Public Property Let FirstDay(ByVal Value As Date)
    mFirstDay = Value
    PropertyChanged "FirstDay"    ' tells the host the design surface is dirty
    UserControl.Refresh
End Property
```

* TOC
{:toc}

## Lifecycle

A user control instance goes through up to seven distinct events from creation to destruction. The host controls the sequence:

| Event                                  | When                                                                                                |
|----------------------------------------|-----------------------------------------------------------------------------------------------------|
| [**Initialize**](#initialize)          | Before the underlying window exists. Child controls are not yet created.                            |
| [**InitProperties**](#initproperties)  | Once, for a brand-new instance with no saved property bag (a fresh drop on a design surface).       |
| [**ReadProperties**](#readproperties)  | Once, for an instance reloaded from a property bag (every load after the first save).               |
| [**Resize**](#resize)                  | When the host first sizes the control, and on every subsequent size change.                         |
| [**Show**](#show) / [**Hide**](#hide)  | When the host changes the container's visibility — typically as the host's design view / run view changes. |
| [**WriteProperties**](#writeproperties)| When the host asks the control to persist its state — design-time saves, host-initiated serialisation. |
| [**Terminate**](#terminate)            | After the window has been destroyed and the class instance is about to be released.                 |

For each instance, exactly one of **InitProperties** or **ReadProperties** runs after [**Initialize**](#initialize), depending on whether the host had a saved property bag. [**WriteProperties**](#writeproperties) is only raised when [**PropertyChanged**](#propertychanged) has been called at least once since the last save, so handlers that never mark themselves dirty are never asked to write.

## Persistent properties

Public read/write members are exposed to the host as design-time properties automatically. Persistent storage goes through the [**PropertyBag**](../../VBRUN/PropertyBag/) object handed to [**ReadProperties**](#readproperties) and [**WriteProperties**](#writeproperties); the property bag interns string keys and a small set of variant-friendly types. Calling [**PropertyChanged**](#propertychanged) (optionally with the property name) sets the host's *dirty* flag so the host knows to call [**WriteProperties**](#writeproperties) at the next save.

```tb
Public Property Let Caption(ByVal Value As String)
    Label1.Caption = Value
    PropertyChanged "Caption"
End Property
```

## Host integration

[**Extender**](#extender) returns the host's wrapper around this control — usually an object exposing **Top**, **Left**, **Width**, **Height**, **Name**, **Visible**, **TabIndex**, **TabStop**, **Container**, **Parent**, and any host-specific extras. [**Parent**](#parent) is shorthand for `Extender.Parent` — the form (or sheet, or page) that ultimately hosts the control. [**ParentControls**](#parentcontrols) is a live enumerator over every sibling control on that parent, useful for design-time inspection.

[**Ambient**](#ambient) exposes the host's ambient properties (the colours, font, locale, and design/run-mode flags the host wants child controls to honour). Changes to any of those raise the [**AmbientChanged**](#ambientchanged) event with the name of the affected property.

[**Verbs**](#verbs) and [**VerbInvoked**](#verbinvoked) let the control register host-invokable commands (entries that appear on the host's context menu for the control). [**PropertyPages**](#propertypages) registers the **CLSID**s of additional [**PropertyPage**](../PropertyPage) classes that the host should offer through the property browser.

## Drawing surface

A **UserControl** is a graphics surface in its own right. The full set of VB6 drawing primitives — [**Cls**](#cls), [**Circle**](#circle), [**Line**](#line), [**PSet**](#pset), [**PaintPicture**](#paintpicture), and the [**Print**](#print) statement — write to its device context, using [**ForeColor**](#forecolor), [**FillColor**](#fillcolor)/[**FillStyle**](#fillstyle), [**DrawWidth**](#drawwidth), [**DrawMode**](#drawmode), and [**DrawStyle**](#drawstyle) for the pen and fill, and [**Font**](#font) for text. The current pen position is tracked by [**CurrentX**](#currentx) and [**CurrentY**](#currenty); [**TextWidth**](#textwidth) and [**TextHeight**](#textheight) measure a string in the current font; [**ScaleX**](#scalex) and [**ScaleY**](#scaley) convert single coordinates between scale modes.

The coordinate system is governed by [**ScaleMode**](#scalemode), [**ScaleLeft**](#scaleleft), [**ScaleTop**](#scaletop), [**ScaleWidth**](#scalewidth), and [**ScaleHeight**](#scaleheight), exactly as on a [**Form**](../Form). [**AutoRedraw**](#autoredraw) controls whether drawn output persists across paints — when **False** (default), the [**Paint**](#paint) event must redraw on every invalidation; when **True**, the control keeps an off-screen buffer that survives invalidations and the **Paint** event is suppressed.

[**BackStyle**](#backstyle) chooses between an opaque background (the default — **BackColor** fills the surface) and a transparent one (the background is left untouched so that whatever is behind the control shows through). Transparent **UserControl**s are commonly windowless ([**Windowless**](#windowless) = **True**) so that mouse hit-testing follows the painted shape rather than the bounding rectangle.

## Windowless mode

Setting [**Windowless**](#windowless) to **True** asks the host to embed the control without giving it its own **HWND**. The control's painting goes through `IViewObject::Draw`, mouse hit-testing through `IViewObjectEx::QueryHitPoint`, and so on; the [**HitTest**](#hittest) event raises for each hit-test request so the control can refine which pixels register as "hits". Many hosts support windowless activation (the twinBASIC IDE, Office); some hosts do not — the framework transparently falls back to a windowed mode at activation time when that happens.

[**hWnd**](#hwnd) returns `0` while the control is windowless-activated. [**PreKeyEvents**](#prekeyevents) — and the [**PreKeyDown**](#prekeydown) / [**PreKeyUp**](#prekeyup) events — are not available on a windowless **UserControl**.

## Children and focus

The **UserControl** can host child controls dropped onto it at design time. [**Controls**](#controls) is the collection of every such child, indexable by control name or zero-based position. The control is enumerable directly (`For Each ctrl In UserControl`) — [**Count**](#count) and [**InternalEnumerator**](#internalenumerator) forward to it. [**ContainedControls**](#containedcontrols) enumerates the same collection but as raw `IUnknown` references for low-level COM work.

[**ActiveControl**](#activecontrol) returns the focused child, or **Nothing** when no control on this surface has the focus. [**SetFocus**](#setfocus) gives the focus to the **UserControl** itself, which forwards it to its tab order. [**KeyPreview**](#keypreview) routes keystrokes through the **UserControl**'s [**KeyDown**](#keydown), [**KeyUp**](#keyup), and [**KeyPress**](#keypress) events *before* the focused child sees them — useful for handling **Escape**, **Tab**, or container-wide hotkeys.

[**EnterFocus**](#enterfocus) and [**ExitFocus**](#exitfocus) fire when the focus enters or leaves the **UserControl** as a whole (the control itself or any descendant); [**GotFocus**](#gotfocus) and [**LostFocus**](#lostfocus) fire only when the **UserControl**'s own window — and no child — holds the focus.

## Properties

### AccessKeys
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC. In VB6 the string lists single-character access keys that, pressed with **Alt**, raise [**AccessKeyPress**](#accesskeypress) on the **UserControl**.

### ActiveControl
{: .no_toc }

The control on this surface that currently has the input focus, as a **Control** object, or **Nothing** when no child on this control is focused. Read-only.

### Alignable
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC. In VB6 a **True** value told the host that the control honoured its container's **Align** property (so that it could be docked to a form edge).

### Ambient
{: .no_toc }

A snapshot of the host's [**AmbientProperties**](../../VBRUN/AmbientProperties/). Read-only. Returns a live pass-through wrapper around the host's `IDispatch`, so each member access reads the current ambient value. Changes to any ambient property raise [**AmbientChanged**](#ambientchanged) with the property's name.

### Appearance
{: .no_toc }

A member of [**AppearanceConstants**](../../VBRUN/Constants/AppearanceConstants): **vbAppearFlat** or **vbAppear3d** (default). Only meaningful when [**BorderStyle**](#borderstyle) is **vbFixedSingleBorder** — controls whether the border is drawn flat or 3-D.

### AutoRedraw
{: .no_toc }

Whether drawing performed on the control persists across invalidations. **Boolean**, default **False**.

When **False**, drawing primitives — [**Cls**](#cls), [**Circle**](#circle), [**Line**](#line), [**PSet**](#pset), [**PaintPicture**](#paintpicture), and [**Print**](#print) — paint directly to the screen and the control must redraw them in its [**Paint**](#paint) event whenever the affected area is invalidated. When **True**, the control keeps an off-screen bitmap, drawing primitives paint into it (and immediately to the screen), the bitmap survives invalidations, and the **Paint** event is suppressed. Reading [**Image**](#image) returns this bitmap.

### BackColor
{: .no_toc }

The background colour of the control's surface, as an **OLE_COLOR**. Defaults to the system 3-D face colour. Has no visible effect when [**BackStyle**](#backstyle) is **vbBFTransparent**.

### BackStyle
{: .no_toc }

Whether the control's background is opaque or transparent. A member of [**BackFillStyleConstants**](../../VBRUN/Constants/BackFillStyleConstants): **vbBFTransparent** (0) or **vbBFOpaque** (1, default). Setting **BackStyle** to **vbBFTransparent** stops the framework from clearing the surface to [**BackColor**](#backcolor) on each paint — useful when the control wants to draw a non-rectangular shape over whatever is behind it. Typically used with [**Windowless**](#windowless) = **True**.

### BorderStyle
{: .no_toc }

The border drawn around the control. A member of [**ControlBorderStyleConstants**](../../VBRUN/Constants/ControlBorderStyleConstants): **vbNoBorder** (0, default) or **vbFixedSingleBorder** (1). Combined with [**Appearance**](#appearance) to choose flat or 3-D framing.

### CanGetFocus
{: .no_toc }

Whether the **UserControl** can take the input focus. **Boolean**, default **True**. Set at design time. A control that returns **False** is skipped over by the host's **TAB** navigation; useful for purely decorative controls.

### ClipBehavior
{: .no_toc }

How the framework clips the control to its assigned **Region** during paint. A member of **VbClipBehavior**: **vbClipNone** (0) or **vbClipUseRegion** (1, default). Only meaningful when the control supplies a non-rectangular **Region** to the host (typically through [**Windowless**](#windowless) hit-testing).

### ContainedControls
{: .no_toc }

A live enumerator over the child controls hosted by this **UserControl**, returned as raw `IUnknown` references rather than the typed **Control** objects exposed through [**Controls**](#controls). Read-only. Mostly useful for low-level COM scenarios.

### ContainerHwnd
{: .no_toc }

The Win32 window handle of the host container that frames this **UserControl**, as a **LongPtr**. Read-only. Returns `0` when the control is hosted by an object that does not expose a window (or before activation has happened).

### ControlContainer
{: .no_toc }

Whether the **UserControl** acts as a container that can host other ActiveX controls dropped onto it at design time. **Boolean**, read-only at run time. Set at design time. Setting **ControlContainer** to **True** tells the host to enumerate this control's children when iterating over the form's control collection.

### Controls
{: .no_toc }

The collection of every child control hosted by this **UserControl**, indexable by control name or zero-based position. Read-only — controls are added to the collection by the runtime, not by user code.

```tb
Dim ctrl As Control
For Each ctrl In UserControl.Controls
    ctrl.Enabled = False
Next
```

### ControlType
{: .no_toc }

A read-only [**ControlTypeConstants**](../../VBRUN/Constants/ControlTypeConstants) value identifying this control as a user control. Always **vbUserControl**.

### Count
{: .no_toc }

The number of controls in [**Controls**](#controls), as a **Long**. Read-only. Equivalent to `UserControl.Controls.Count`.

### CurrentX
{: .no_toc }

The horizontal pen position, in [**ScaleMode**](#scalemode) units, used by drawing primitives that omit a starting coordinate (for example, [**Print**](#print) and the rectangle form of [**Line**](#line)). **Double**.

### CurrentY
{: .no_toc }

The vertical pen position, in [**ScaleMode**](#scalemode) units, used by drawing primitives that omit a starting coordinate. **Double**.

### DataBindingBehavior
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC. In VB6 this declared whether the control could be data-bound, and if so, whether it supported simple or complex binding.

### DataMembers
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC. Part of VB6's complex data-binding source-of-data interface.

### DataSourceBehavior
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC. In VB6 this declared whether the control could *provide* a data source for other controls to bind to.

### DefaultCancel
{: .no_toc }

Whether this **UserControl** acts as the **Cancel** button of its host form. **Boolean**, default **False**. Set at design time. When **True**, pressing **Escape** while focus is on the form raises [**AccessKeyPress**](#accesskeypress) on the control with the **Escape** key code.

### DpiScale
{: .no_toc }

The current DPI scale factor of the monitor the control is currently on, as a **Double**. `1.0` at 96 DPI, `1.25` at 120 DPI, `1.5` at 144 DPI, and so on. Read-only.

### DrawMode
{: .no_toc }

The raster operation that drawing primitives apply when combining the pen with the destination. A member of [**DrawModeConstants**](../../VBRUN/Constants/DrawModeConstants), default **vbCopyPen**.

### DrawStyle
{: .no_toc }

The pen line pattern used by drawing primitives. A member of [**DrawStyleConstants**](../../VBRUN/Constants/DrawStyleConstants): **vbSolid** (default), **vbDash**, **vbDot**, **vbDashDot**, **vbDashDotDot**, **vbInvisible**, or **vbInsideSolid**.

### DrawWidth
{: .no_toc }

The pen width in pixels for drawing primitives. **Long**, default `1`. Widths greater than 1 force [**DrawStyle**](#drawstyle) back to **vbSolid** (a Win32 GDI limitation).

### EditAtDesignTime
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC. In VB6 a **True** value let the user activate the control's UI at design time through the **(Edit)** verb on the right-click menu.

### Enabled
{: .no_toc }

Determines whether the control accepts user input. A disabled control is dimmed and ignores keyboard and mouse interaction. **Boolean**, default **True**.

### EventsFrozen
{: .no_toc }

Whether the host has temporarily suspended event delivery to the control. **Boolean**, read-only. The host raises `IOleControl::FreezeEvents(TRUE)` during sensitive operations (for example, switching design view to run view) so that the control does not raise events while its surroundings are inconsistent.

### Extender
{: .no_toc }

The host's extender wrapper around this **UserControl**, as an **Object**. Read-only. The extender is the object the host exposes to user code as the control on the form — it provides standard container properties (**Top**, **Left**, **Width**, **Height**, **Name**, **Visible**, **TabIndex**, **TabStop**, **Container**, **Parent**, **DragMode**, **DragIcon**, …) plus whatever host-specific extras it likes. Returns **Nothing** when no extender is available (the control has not yet been embedded, or the host is too primitive to provide one).

### FillColor
{: .no_toc }

The fill colour for closed shapes drawn by [**Circle**](#circle) and the rectangle form of [**Line**](#line). **OLE_COLOR**, default `0` (black). Used only when [**FillStyle**](#fillstyle) is not **vbFSTransparent**.

### FillStyle
{: .no_toc }

The fill pattern for closed shapes. A member of [**FillStyleConstants**](../../VBRUN/Constants/FillStyleConstants): **vbFSSolid**, **vbFSTransparent** (default), **vbHorizontalLine**, **vbVerticalLine**, **vbUpwardDiagonal**, **vbDownwardDiagonal**, **vbCross**, or **vbDiagonalCross**.

### Font
{: .no_toc }

The **StdFont** used by the [**Print**](#print) statement and other text drawing on this control. The convenience properties [**FontBold**](#fontbold), [**FontItalic**](#fontitalic), [**FontName**](#fontname), [**FontSize**](#fontsize), [**FontStrikethru**](#fontstrikethru), and [**FontUnderline**](#fontunderline) read or write the corresponding members of this object.

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

When **True** (default), text drawn on the control has a transparent background, leaving the underlying drawing visible behind it. When **False**, text is drawn over an opaque rectangle filled with [**BackColor**](#backcolor). **Boolean**.

### FontUnderline
{: .no_toc }

Shortcut for [**Font**](#font)`.Underline`. **Boolean**.

### ForceResizeToContainer
{: .no_toc }

Whether the control automatically resizes itself to fill the host's container area regardless of any explicit size assigned in the designer. **Boolean**, read-only at run time. Set at design time. Useful for full-pane controls that should always span the available space.

### ForeColor
{: .no_toc }

The pen colour used by [**Circle**](#circle), [**Line**](#line), [**PSet**](#pset), and the text drawn by [**Print**](#print). **OLE_COLOR**.

### ForwardFocus
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC. In VB6 a **True** value told the host to forward focus from the **UserControl**'s shell window into its first child control whenever the host activated the **UserControl**.

### FormDesignerId
{: .no_toc }

A unique GUID-formatted **String** associating a designed code-behind class with a specific designer file. Read-only at run time — set by the IDE.

### HasDC
{: .no_toc }

Whether the control keeps a private device context (`CS_OWNDC`) for its drawing surface. **Boolean**, default **True**. Read-only at run time — set at design time.

### HitBehavior
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC. In VB6 this chose between bounding-rectangle hit-testing and pixel-perfect (region-based or paint-based) hit-testing for windowless controls.

### hDC
{: .no_toc }

The Win32 device context handle for the control, as a **LongPtr**. Read-only. Returns `0` when the underlying window has not yet been created. Useful for passing to GDI API calls.

### hWnd
{: .no_toc }

The Win32 window handle for the control, as a **LongPtr**. Read-only. Returns `0` while the control is windowless-activated ([**Windowless**](#windowless) = **True**). Useful for passing to API functions.

### Hyperlink
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC. In VB6 the property returned an **Hyperlink** object that let the control navigate the host's browser when one was available.

### Image
{: .no_toc }

Returns the rendered drawing surface as a **StdPicture**. Read-only. Most useful when [**AutoRedraw**](#autoredraw) is **True** — the returned picture is the persistent off-screen buffer.

### Index
{: .no_toc }

When the control is part of a control array, the **Long** zero-based index of this instance within the array. Read-only at run time. Returns `0` and sets `HRESULT` to `0x800A0157` (*Object not an array*) for controls not in an array.

### InvisibleAtRuntime
{: .no_toc }

Whether the **UserControl** is hidden at run time. **Boolean**, read-only at run time. Set at design time. Useful for controls that exist only to provide a host-side service (timers, data sources) and have no visual presence.

### KeyPreview
{: .no_toc }

When **True**, the **UserControl**'s [**KeyDown**](#keydown), [**KeyUp**](#keyup), and [**KeyPress**](#keypress) events fire *before* the focused child receives the same keystroke. **Boolean**, default **False**. Useful for control-wide hotkeys; events still fire on the focused child afterwards.

### Left
{: .no_toc }

The horizontal position of the **UserControl** inside its host container, in the host's coordinate units. **Double**. Usually controlled by the host (or by the developer through the extender's **Move** method) rather than assigned directly.

### MaskColor
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC. In VB6 the colour was used as a transparency key for the bitmap supplied to **MaskPicture**.

### MaskPicture
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC. In VB6 the picture was used together with **MaskColor** to give the **UserControl** a non-rectangular shape.

### MouseIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor when [**MousePointer**](#mousepointer) is **vbCustom** and the pointer is over the control.

### MousePointer
{: .no_toc }

The mouse cursor shown when the pointer is over the control. A member of [**MousePointerConstants**](../../VBRUN/Constants/MousePointerConstants).

### Name
{: .no_toc }

The unique design-time name of the **UserControl** class. Read-only at run time. Also the class name of the generated user-control class. The host's extender exposes its own **Name** that identifies the instance on the form — the inner **UserControl**'s **Name** identifies the *class*.

### Palette
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6's 256-colour palette feature; not currently implemented in twinBASIC.

### PaletteMode
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6's 256-colour palette feature; not currently implemented in twinBASIC.

### Parent
{: .no_toc }

The form (or other host object) that contains this **UserControl**, as an **Object**. Read-only. Equivalent to `Extender.Parent`.

### ParentControls
{: .no_toc }

A live collection of every sibling control on the host's parent — useful at design time for inspecting or coordinating with other controls on the same surface. Read-only. Supports indexed access (`ParentControls(0)`), enumeration (`For Each ctl In ParentControls`), and a **Count** member. Its **ParentControlsType** property toggles between the *extender*-wrapped view (the default — items are the host's extender objects) and the *raw* view (items are the inner `IUnknown` of each control).

### PictureDpiScaling
{: .no_toc }

> [!NOTE]
> The framework recognises this name on **Form** and on most intrinsic controls but does not currently expose it on **UserControl**. The drawing pipeline always renders **Picture** at its natural pixel size.

### Picture
{: .no_toc }

A **StdPicture** drawn as the control's background. Painted before any drawing primitives or child controls. Assigning **Nothing** removes the background.

### PreKeyEvents
{: .no_toc }

Whether the [**PreKeyDown**](#prekeydown) and [**PreKeyUp**](#prekeyup) events are raised for descendants of this **UserControl**. **Boolean**, read-only at run time — set at design time. Not available when [**Windowless**](#windowless) is **True**.

### PropertyPages
{: .no_toc }

An array of **String** **CLSID**s identifying the [**PropertyPage**](../PropertyPage) classes the host should offer through the **(Custom)** entry on the property browser. Read at the host's `ISpecifyPropertyPages::GetPages` call. Order matters — the array order is the tab order in the property-sheet dialog.

```tb
Private Sub UserControl_Initialize()
    ReDim PropertyPages(0 To 1)
    PropertyPages(0) = "{<clsid-of-the-general-page>}"
    PropertyPages(1) = "{<clsid-of-the-colour-page>}"
End Sub
```

### Public
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC. In VB6 this declared whether the **UserControl** class was visible outside its own project; in twinBASIC the **Public** modifier on the class declaration plays the same role.

### RightToLeft
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### ScaleHeight
{: .no_toc }

The height of the logical drawing rectangle, in [**ScaleMode**](#scalemode) units. **Double**. Setting it (or [**ScaleWidth**](#scalewidth), [**ScaleLeft**](#scaleleft), or [**ScaleTop**](#scaletop)) implicitly switches **ScaleMode** to **vbUser**.

### ScaleLeft
{: .no_toc }

The logical horizontal coordinate of the left edge of the control's client area, in [**ScaleMode**](#scalemode) units. **Double**. Default `0`.

### ScaleMode
{: .no_toc }

The unit of measurement used by [**CurrentX**](#currentx), [**CurrentY**](#currenty), the drawing primitives, [**TextWidth**](#textwidth), and [**TextHeight**](#textheight). A member of [**ScaleModeConstants**](../../VBRUN/Constants/ScaleModeConstants): **vbTwips** (default), **vbPoints**, **vbPixels**, **vbCharacters**, **vbInches**, **vbMillimeters**, **vbCentimeters**, or **vbUser** (the four **Scale\*** properties define the rectangle).

### ScaleTop
{: .no_toc }

The logical vertical coordinate of the top edge of the control's client area, in [**ScaleMode**](#scalemode) units. **Double**. Default `0`.

### ScaleWidth
{: .no_toc }

The width of the logical drawing rectangle, in [**ScaleMode**](#scalemode) units. **Double**. Setting it implicitly switches **ScaleMode** to **vbUser**.

### Tag
{: .no_toc }

A free-form **String** the application can use to associate custom data with the control. Ignored by the framework.

### Top
{: .no_toc }

The vertical position of the **UserControl** inside its host container, in the host's coordinate units. **Double**. Usually controlled by the host.

### Verbs
{: .no_toc }

An array of **String** names registered with the host's `IOleObject::EnumVerbs` enumerator — each entry appears on the host's right-click menu for this control. Invoking one raises [**VerbInvoked**](#verbinvoked) with the verb's name.

```tb
Private Sub UserControl_Initialize()
    ReDim Verbs(0 To 1)
    Verbs(0) = "Re&fresh"
    Verbs(1) = "&Configure..."
End Sub

Private Sub UserControl_VerbInvoked(ByVal Verb As String)
    Select Case Verb
        Case "Re&fresh"     : DoRefresh
        Case "&Configure...": ShowConfigDialog
    End Select
End Sub
```

### Width
{: .no_toc }

The control's width, in twips by default (or in the calling code's **ScaleMode** units). **Double**. Setting it resizes the control and raises [**Resize**](#resize). On a designer, the host's extender is updated through a round-trip so the design-time grid reflects the new size.

### Height
{: .no_toc }

The control's height. **Double**. Setting it resizes the control and raises [**Resize**](#resize).

### Windowless
{: .no_toc }

Whether the control supports windowless activation. **Boolean**, default **False**. Read-only at run time — set at design time. See [Windowless mode](#windowless-mode).

## Methods

### AsyncRead
{: .no_toc }

> [!NOTE]
> Declared for VB6 compatibility; not currently implemented in twinBASIC. In VB6 this would start an asynchronous fetch from a host-supplied URL and raise [**AsyncReadComplete**](#asyncreadcomplete) when the data arrived.

Syntax: *object*.**AsyncRead** *Target*, *AsyncType*, [, *PropertyName* [, *AsyncReadOptions* ] ]

### CancelAsyncRead
{: .no_toc }

> [!NOTE]
> Declared for VB6 compatibility; not currently implemented in twinBASIC. Companion to [**AsyncRead**](#asyncread).

Syntax: *object*.**CancelAsyncRead** [ *Property* ]

### CanPropertyChange
{: .no_toc }

> [!NOTE]
> Declared for VB6 compatibility; not currently implemented in twinBASIC. In VB6 this returned **True** if the named property of the **DataSource** was writable — used by data-bound controls before pushing edited values back to the source.

Syntax: *object*.**CanPropertyChange**( *PropertyName* )

### Circle
{: .no_toc }

Draws a circle, ellipse, or arc on the control using [**ForeColor**](#forecolor) for the outline and [**FillColor**](#fillcolor)/[**FillStyle**](#fillstyle) for the interior.

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

### DataMemberChanged
{: .no_toc }

> [!NOTE]
> Declared for VB6 compatibility; not currently implemented in twinBASIC. Companion to the data-source behaviour.

Syntax: *object*.**DataMemberChanged** *DataMember*

### InternalEnumerator
{: .no_toc }

Returns the `IUnknown` enumerator backing `For Each` over the **UserControl**'s [**Controls**](#controls). Read-only. Exposed as the [Enumerator] member so that `For Each ctl In UserControl` iterates over the children directly.

### Line
{: .no_toc }

Draws a line, or a rectangle, on the control using [**ForeColor**](#forecolor) (or an explicit colour) and [**DrawWidth**](#drawwidth)/[**DrawStyle**](#drawstyle).

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

Initiates an OLE drag operation from the control, raising the [**OLEStartDrag**](#olestartdrag) event so the application can populate the **DataObject**.

Syntax: *object*.**OLEDrag**

### PaintPicture
{: .no_toc }

Draws a **StdPicture** onto the control, with optional scaling and raster operations.

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

### PopUpMenu
{: .no_toc }

> [!NOTE]
> Declared for VB6 compatibility; not currently implemented on **UserControl** in twinBASIC. A **UserControl** has no menu structure of its own — invoke a host pop-up through the extender or the parent form's [**PopUpMenu**](../Form/#popupmenu).

Syntax: *object*.**PopUpMenu** *Menu* [, *Flags* [, *X* [, *Y* [, *DefaultMenu* ] ] ] ]

### Print
{: .no_toc }

Writes text to the control's drawing surface using [**Font**](#font), starting at [**CurrentX**](#currentx) / [**CurrentY**](#currenty) and advancing them as it goes. Dispatched through the VB6 **Print** statement so multiple expressions can be separated by `;` (no spacing) or `,` (tab to the next print zone). **Spc(n)** inserts *n* spaces and **Tab(n)** moves to print column *n*. Output honours [**Font**](#font), [**ForeColor**](#forecolor), and [**FontTransparent**](#fonttransparent), and — when [**AutoRedraw**](#autoredraw) is **True** — is recorded into the persistent off-screen bitmap so it survives invalidations.

Syntax: *object*.**Print** \[ *expressionlist* ] \[ **;** \| **,** ]

A trailing `;` or `,` suppresses the newline so the next **Print** call continues on the same line; without a trailing separator, the pen advances to the start of the next line.

### PropertyChanged
{: .no_toc }

Notifies the host that one of the **UserControl**'s persistent properties has changed, marking the design surface (or property bag) dirty so that the host will call [**WriteProperties**](#writeproperties) the next time it saves.

Syntax: *object*.**PropertyChanged** [ *PropertyName* ]

*PropertyName*
: *optional* The name of the property that changed, as a **String**. When supplied, the framework also fires the COM **IPropertyNotifySink::OnChanged** event with the matching **DispId** so that data-bound containers can refresh themselves. Omit for a generic "something changed" notification.

### PSet
{: .no_toc }

Sets a single pixel on the control to a specified colour.

Syntax: *object*.**PSet** [ **Step** ] ( *X*, *Y* ) [, *Color* ]

*X*, *Y*
: *required* The pixel position, in [**ScaleMode**](#scalemode) units. **Step** makes the position relative to ([**CurrentX**](#currentx), [**CurrentY**](#currenty)).

*Color*
: *optional* An **OLE_COLOR**; defaults to [**ForeColor**](#forecolor).

### Refresh
{: .no_toc }

Forces an immediate repaint of the control, raising [**Paint**](#paint) when [**AutoRedraw**](#autoredraw) is **False**.

Syntax: *object*.**Refresh**

### Scale
{: .no_toc }

Sets the control's logical drawing rectangle in a single call by assigning [**ScaleLeft**](#scaleleft), [**ScaleTop**](#scaletop), [**ScaleWidth**](#scalewidth), and [**ScaleHeight**](#scaleheight). Switches [**ScaleMode**](#scalemode) to **vbUser**. Calling **Scale** with no arguments resets the rectangle to a 1-to-1 mapping with the client area in pixels.

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

Activates the **UserControl** and gives input focus to its first focusable child (or to whichever control last held focus on this surface).

Syntax: *object*.**SetFocus**

### Size
{: .no_toc }

Sets the **UserControl**'s extent in a single call, expressed in twips. The framework converts to HIMETRIC, calls `IOleObject::SetExtent` on the host, and updates the design surface when running in design mode.

Syntax: *object*.**Size** *Width*, *Height*

*Width*, *Height*
: *required* The new dimensions in twips.

### TextHeight
{: .no_toc }

Returns the height that the given string would occupy when drawn with the control's current [**Font**](#font), in [**ScaleMode**](#scalemode) units. Embedded line breaks are honoured.

Syntax: *object*.**TextHeight**( *Str* )

*Str*
: *required* A **String** to measure.

### TextWidth
{: .no_toc }

Returns the width that the given string would occupy when drawn with the control's current [**Font**](#font), in [**ScaleMode**](#scalemode) units. Returns the longest line width when *Str* contains embedded line breaks.

Syntax: *object*.**TextWidth**( *Str* )

*Str*
: *required* A **String** to measure.

### ValidateControls
{: .no_toc }

> [!NOTE]
> Declared for VB6 compatibility; not currently implemented in twinBASIC. In VB6 this fired the focused child's **Validate** event from code; on a **UserControl** the host normally handles validation through the form-level [**ValidateControls**](../Form/#validatecontrols).

Syntax: *object*.**ValidateControls**

## Events

### AccessKeyPress
{: .no_toc }

> [!NOTE]
> Declared for VB6 compatibility; only partially implemented in twinBASIC. The runtime currently raises this event when the host calls `IOleControl::OnMnemonic` with the **Escape**, **Return**, or **Execute** keys — typically because [**DefaultCancel**](#defaultcancel) (or a default-button equivalent) routed a default-action keystroke to the control.

Syntax: *object*\_**AccessKeyPress**( *KeyAscii* **As Integer** )

### AmbientChanged
{: .no_toc }

Raised when the host changes one of the ambient properties exposed through [**Ambient**](#ambient) — typically when its [**Font**](#font), colours, locale, or run/design mode flag shifts. The *PropertyName* argument names the ambient property that changed.

Syntax: *object*\_**AmbientChanged**( *PropertyName* **As String** )

*PropertyName*
: A **String** identifying the ambient property — for example, `"BackColor"`, `"Font"`, `"LocaleID"`, `"UserMode"`.

### AsyncReadComplete
{: .no_toc }

> [!NOTE]
> Declared for VB6 compatibility; not currently raised in twinBASIC. Companion to [**AsyncRead**](#asyncread).

Syntax: *object*\_**AsyncReadComplete**( *AsyncProp* **As AsyncProperty** )

### AsyncReadProgress
{: .no_toc }

> [!NOTE]
> Declared for VB6 compatibility; not currently raised in twinBASIC. Companion to [**AsyncRead**](#asyncread).

Syntax: *object*\_**AsyncReadProgress**( *AsyncProp* **As AsyncProperty** )

### Click
{: .no_toc }

Raised when the user single-clicks the control's surface (i.e. not over any child control).

Syntax: *object*\_**Click**( )

### DblClick
{: .no_toc }

Raised when the user double-clicks the control's surface.

Syntax: *object*\_**DblClick**( )

### DPIChange
{: .no_toc }

Raised when the control moves to a monitor with a different DPI scale, *but only* when the application is per-monitor DPI aware (`PROCESS_PER_MONITOR_DPI_AWARE`). The event's *NewDPI* argument gives the new effective DPI; child controls re-scale themselves automatically. New in twinBASIC.

Syntax: *object*\_**DPIChange**( *NewDPI* **As Long** )

### DragDrop
{: .no_toc }

> [!NOTE]
> Declared for VB6 compatibility; not currently raised on a **UserControl**. Manual drag-and-drop is handled by the host's extender rather than the inner **UserControl**.

Syntax: *object*\_**DragDrop**( *Source* **As Control**, *X* **As Single**, *Y* **As Single** )

### DragOver
{: .no_toc }

> [!NOTE]
> Declared for VB6 compatibility; not currently raised on a **UserControl**. See [**DragDrop**](#dragdrop).

Syntax: *object*\_**DragOver**( *Source* **As Control**, *X* **As Single**, *Y* **As Single**, *State* **As Integer** )

### EnterFocus
{: .no_toc }

Raised when the input focus moves into the **UserControl** — either the **UserControl** itself or any of its descendants. Fires before any child's **GotFocus**.

Syntax: *object*\_**EnterFocus**( )

### ExitFocus
{: .no_toc }

Raised when the input focus leaves the **UserControl** — i.e. moves out to a control that is not a descendant. Fires after the leaving child's **LostFocus**.

Syntax: *object*\_**ExitFocus**( )

### GetDataMember
{: .no_toc }

> [!NOTE]
> Declared for VB6 compatibility; not currently raised in twinBASIC. Companion to [**DataMembers**](#datamembers).

Syntax: *object*\_**GetDataMember**( *DataMember* **As String**, *Data* **As Object** )

### GotFocus
{: .no_toc }

Raised when the **UserControl**'s own window receives the input focus and no enabled child is in a position to take it instead.

Syntax: *object*\_**GotFocus**( )

### Hide
{: .no_toc }

Raised when the host hides the container — typically as it switches from a run view to a design view, or as it makes a containing tab inactive.

Syntax: *object*\_**Hide**( )

### HitTest
{: .no_toc }

Raised for each `IViewObjectEx::QueryHitPoint` request from the host when the control is windowless. Setting *HitResult* to a non-zero **HitResult** value tells the host whether the given pixel is "hit" for mouse-routing purposes — useful for non-rectangular windowless controls.

Syntax: *object*\_**HitTest**( *X* **As Single**, *Y* **As Single**, *HitResult* **As Integer** )

### Initialize
{: .no_toc }

Raised once, before the underlying window is created and before any of the control's children exist. Useful for setting initial values on form-level fields. The control's children cannot be referenced from this event. **Default-designer event.**

Syntax: *object*\_**Initialize**( )

### InitProperties
{: .no_toc }

Raised once on the first ever activation of a brand-new **UserControl** instance — before a property bag exists for it. The classic place to assign initial values to persistent properties. Not raised on subsequent loads; on those, [**ReadProperties**](#readproperties) runs instead.

Syntax: *object*\_**InitProperties**( )

### KeyDown
{: .no_toc }

Raised when the user presses any key with focus on the **UserControl**. Fires on the focused child by default; with [**KeyPreview**](#keypreview) **True**, fires on the **UserControl** first.

Syntax: *object*\_**KeyDown**( *KeyCode* **As Integer**, *Shift* **As Integer** )

### KeyPress
{: .no_toc }

Raised when the user types a character that produces an ANSI keystroke. Fires on the focused child by default; with [**KeyPreview**](#keypreview) **True**, fires on the **UserControl** first.

Syntax: *object*\_**KeyPress**( *KeyAscii* **As Integer** )

### KeyUp
{: .no_toc }

Raised when the user releases a key. Fires on the focused child by default; with [**KeyPreview**](#keypreview) **True**, fires on the **UserControl** first.

Syntax: *object*\_**KeyUp**( *KeyCode* **As Integer**, *Shift* **As Integer** )

### LostFocus
{: .no_toc }

Raised when the **UserControl**'s own window loses the input focus.

Syntax: *object*\_**LostFocus**( )

### MouseDown
{: .no_toc }

Raised when the user presses any mouse button over the control's surface.

Syntax: *object*\_**MouseDown**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseMove
{: .no_toc }

Raised when the cursor moves over the control's surface.

Syntax: *object*\_**MouseMove**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseUp
{: .no_toc }

Raised when the user releases a mouse button over the control's surface.

Syntax: *object*\_**MouseUp**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseWheel
{: .no_toc }

Raised when the mouse wheel turns over the control. New in twinBASIC.

Syntax: *object*\_**MouseWheel**( *Delta* **As Integer**, *Horizontal* **As Boolean** )

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

Raised when an invalidated portion of the control needs to be redrawn. Suppressed when [**AutoRedraw**](#autoredraw) is **True** — the control's persistent off-screen buffer is blitted to the screen instead.

Syntax: *object*\_**Paint**( )

### PreKeyDown
{: .no_toc }

Raised for every key press anywhere on the **UserControl** or any of its descendants, *before* the focused child sees it — so handlers can consume the keystroke. Requires [**PreKeyEvents**](#prekeyevents) **True**. Not raised when [**Windowless**](#windowless) is **True**. New in twinBASIC.

Syntax: *object*\_**PreKeyDown**( *KeyCode* **As Integer**, *Shift* **As Integer** )

### PreKeyUp
{: .no_toc }

Raised for every key release anywhere on the **UserControl** or any of its descendants, *before* the focused child sees it. Requires [**PreKeyEvents**](#prekeyevents) **True**. Not raised when [**Windowless**](#windowless) is **True**. New in twinBASIC.

Syntax: *object*\_**PreKeyUp**( *KeyCode* **As Integer**, *Shift* **As Integer** )

### ReadProperties
{: .no_toc }

Raised when the host hands the control a property bag containing previously saved state — i.e. on every load except the very first. The handler reads the values it cares about from *PropBag* and applies them to its fields. *PropBag*'s **ReadProperty** method takes a key, a default value, and a type hint.

Syntax: *object*\_**ReadProperties**( *PropBag* **As PropertyBag** )

*PropBag*
: The host-supplied [**PropertyBag**](../../VBRUN/PropertyBag/) containing the persisted values.

### Resize
{: .no_toc }

Raised when the **UserControl** is resized — by the host during initial layout, by user code assigning [**Width**](#width) or [**Height**](#height), or by the host responding to a designer drag.

Syntax: *object*\_**Resize**( )

### Show
{: .no_toc }

Raised when the host makes the container visible — typically as it switches from a design view to a run view, or as it makes a containing tab active.

Syntax: *object*\_**Show**( )

### Terminate
{: .no_toc }

Raised after the **UserControl**'s window has been destroyed and the class instance is about to be released. Child controls are no longer accessible at this point.

Syntax: *object*\_**Terminate**( )

### VerbInvoked
{: .no_toc }

Raised when the host invokes one of the verbs declared in [**Verbs**](#verbs) — typically because the user picked it from the host's right-click context menu.

Syntax: *object*\_**VerbInvoked**( *Verb* **As String** )

*Verb*
: The name of the invoked verb, exactly as it was registered in [**Verbs**](#verbs).

### WriteProperties
{: .no_toc }

Raised when the host asks the control to persist its current state — design-time saves and host-initiated serialisation. The handler writes each persistent value to *PropBag* through **WriteProperty**, which takes a key, the value, and (optionally) the same default the [**ReadProperties**](#readproperties) handler used so that round-trip defaults are not written. Only raised when at least one call to [**PropertyChanged**](#propertychanged) has happened since the last save.

Syntax: *object*\_**WriteProperties**( *PropBag* **As PropertyBag** )

*PropBag*
: The host-supplied [**PropertyBag**](../../VBRUN/PropertyBag/) to write the persisted values into.
