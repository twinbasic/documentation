---
title: Form
parent: VB Package
permalink: /tB/Packages/VB/Form/
has_toc: false
---

# Form class
{: .no_toc }

A **Form** is a top-level Win32 window that hosts the controls, menus, and drawing surface of a single twinBASIC user interface. Each form designed in the IDE becomes its own class derived from **Form** — its controls become members of that class, its event handlers become methods on it, and the file's name becomes the class name. Code outside the form normally instantiates it implicitly through the global default-instance reference (`MyForm.Show`) or explicitly with `New MyForm`. The default property is [**Controls**](#controls) and the default event is [**Load**](#load).

```tb
' In Form1's code-behind:
Private Sub Form_Load()
    Caption = "Welcome"
    Me.MinWidth = 4000          ' twips, ≈ 2 inches
    Me.MinHeight = 3000
End Sub

Private Sub Form_QueryUnload(Cancel As Integer, UnloadMode As Integer)
    If MsgBox("Quit?", vbYesNo) = vbNo Then Cancel = 1
End Sub

' In a startup module:
Sub Main()
    Form1.Show vbModal
End Sub
```

* TOC
{:toc}

## Lifecycle

A form goes through six distinct events from creation to destruction:

| Event                            | When                                                                                |
|----------------------------------|-------------------------------------------------------------------------------------|
| [**Initialize**](#initialize)    | Before the underlying window exists. The form's controls are not yet created.       |
| [**Load**](#load)                | After the window and all controls have been created, before the form first appears. |
| [**Activate**](#activate)        | When the form becomes the active window in the application.                         |
| [**Deactivate**](#deactivate)    | When another form (or another application's window) takes activation away.          |
| [**QueryUnload**](#queryunload)  | Before unload. Setting *Cancel* to non-zero keeps the form open.                    |
| [**Unload**](#unload)            | After **QueryUnload** approves. Setting *Cancel* to non-zero keeps the form open.   |
| [**Terminate**](#terminate)      | After the window has been destroyed and the class instance is released.             |

Closing a form goes through both **QueryUnload** *and* **Unload**, so either can veto. The *UnloadMode* argument of **QueryUnload** ([**QueryUnloadConstants**](../../VBRUN/Constants/QueryUnloadConstants)) reports whether the user clicked the close button, code called **Unload**, Windows is shutting down, the MDI parent is closing, and so on.

## Showing the form

[**Show**](#show) makes the form visible. It accepts an optional [**FormShowConstants**](../../VBRUN/Constants/FormShowConstants) argument: **vbModeless** (default — the call returns immediately and the user can interact with other forms) or **vbModal** (the call blocks until the form is closed, and other forms in the application become unresponsive). MDI child forms cannot be shown modally; attempting to do so raises run-time error 404.

```tb
dlgOptions.Show vbModal, Me      ' modal, owned by the calling form
```

[**Hide**](#hide) and [**Close**](#close) reverse the effect: **Hide** just clears [**Visible**](#visible); **Close** runs the full unload sequence (**QueryUnload** then **Unload** then **Terminate**). The classic `Unload <FormName>` statement is the language-level equivalent of **Close**.

[**StartUpPosition**](#startupposition) ([**StartUpPositionConstants**](../../VBRUN/Constants/StartUpPositionConstants)) is read at the first **Show** to decide where the form lands; afterwards the user (or code through [**Move**](#move) and [**WindowState**](#windowstate)) controls position.

## Window appearance

[**BorderStyle**](#borderstyle) ([**FormBorderStyleConstants**](../../VBRUN/Constants/FormBorderStyleConstants)) chooses between sizable, fixed, dialog, tool, and borderless frames. [**Caption**](#caption) is the title-bar text. [**ControlBox**](#controlbox), [**MaxButton**](#maxbutton), and [**MinButton**](#minbutton) toggle the system menu and resize buttons. [**Icon**](#icon) supplies the small/large icon used by the system menu, the taskbar, and Alt-Tab. [**WindowState**](#windowstate) ([**FormWindowStateConstants**](../../VBRUN/Constants/FormWindowStateConstants)) reads or sets normal / minimised / maximised state at run time.

[**MinWidth**](#minwidth), [**MinHeight**](#minheight), [**MaxWidth**](#maxwidth), and [**MaxHeight**](#maxheight) constrain the *client area* in twips during interactive resizing. [**Moveable**](#moveable) decides whether the user can drag the form by its title bar; [**ShowInTaskbar**](#showintaskbar) decides whether the form shows up in the taskbar and Alt-Tab list.

[**Opacity**](#opacity) and [**TransparencyKey**](#transparencykey) drive Windows' layered-window features for translucent forms and cut-out shapes.

## Drawing surface

A **Form** is itself a graphics surface — code can draw lines, shapes, and text directly on it. The coordinate system is governed by [**ScaleMode**](#scalemode) (default **vbTwips** — the classic VB6 behaviour) and the [**ScaleLeft**](#scaleleft) / [**ScaleTop**](#scaletop) / [**ScaleWidth**](#scalewidth) / [**ScaleHeight**](#scaleheight) properties, which together describe the form's logical drawing rectangle. Setting **ScaleMode** to **vbUser** lets the four **Scale\*** properties define an arbitrary rectangle; the [**Scale**](#scale) method does this in a single call.

The drawing primitives are [**Cls**](#cls), [**Circle**](#circle), [**Line**](#line), [**PSet**](#pset), [**PaintPicture**](#paintpicture), and the [**Print**](#print) statement (`Form1.Print "Hello"`) — all use [**ForeColor**](#forecolor), [**FillColor**](#fillcolor), [**FillStyle**](#fillstyle), [**DrawWidth**](#drawwidth), [**DrawMode**](#drawmode), and [**DrawStyle**](#drawstyle) for their pen and fill, and the form's [**Font**](#font) for text. The current pen position is tracked by [**CurrentX**](#currentx) and [**CurrentY**](#currenty); [**TextWidth**](#textwidth) and [**TextHeight**](#textheight) measure a string in the current font. [**ScaleX**](#scalex) and [**ScaleY**](#scaley) convert single coordinates between scale modes.

[**AutoRedraw**](#autoredraw) controls whether drawn output persists across paints: when **False** (default), the [**Paint**](#paint) event must redraw on every invalidation; when **True**, the form keeps an off-screen buffer that survives invalidations and the **Paint** event is suppressed. Setting [**Picture**](#picture) puts a bitmap behind the drawing layer; [**Image**](#image) returns the rendered combined surface as a **StdPicture**.

```tb
Private Sub Form_Paint()
    Me.ScaleMode = vbPixels
    Me.ForeColor = vbBlue
    Me.DrawWidth = 3
    Me.Line (10, 10)-(120, 80), , B          ' rectangle
    Me.CurrentX = 16 : Me.CurrentY = 16
    Me.Print "Hello, twinBASIC"
End Sub
```

## Controls and validation

[**Controls**](#controls) is a collection of every control on the form, indexable by name or zero-based position. **Form** is also enumerable directly — `For Each ctrl In Form1` yields the same items as `For Each ctrl In Form1.Controls`. [**Count**](#count) is shorthand for `Controls.Count`. [**ActiveControl**](#activecontrol) returns the currently focused child, or **Nothing** when no control on this form has the focus.

[**KeyPreview**](#keypreview) routes keystrokes to the form's [**KeyDown**](#keydown), [**KeyUp**](#keyup), and [**KeyPress**](#keypress) events *before* the focused control sees them — useful for application-wide hotkey handling. [**ValidateControls**](#validatecontrols) explicitly fires the active control's **Validate** event from code; it raises run-time error 380 if the validation handler sets *Cancel*.

## Menus and pop-ups

Menu structures designed at form-design time appear automatically in the form's title bar. [**PopUpMenu**](#popupmenu) displays one of those menus as a context-menu pop-up at a specified location, raising the menu's **Click** event when the user picks an item.

```tb
Private Sub Form_MouseDown(Button As Integer, Shift As Integer, X As Single, Y As Single)
    If Button = vbRightButton Then PopUpMenu mnuContext
End Sub
```

## Properties

### ActiveControl
{: .no_toc }

The control on this form that currently has the input focus, as a **Control** object, or **Nothing** when no control on this form is focused. Read-only.

### AlwaysShowKeyboardCues
{: .no_toc }

When **True**, the form always shows underlines on access-key characters in [**Caption**](#caption)s and menu items, instead of only displaying them after the user presses **Alt**. **Boolean**, read-only at run time. Set at design time.

### Appearance
{: .no_toc }

Determines how the control's border is drawn by the OS. A member of [**AppearanceConstants**](../../VBRUN/Constants/AppearanceConstants): **vbAppearFlat** or **vbAppear3d** (default).

> [!NOTE]
> Retained for VB6 compatibility; the property has no observable effect on a form.

### AutoRedraw
{: .no_toc }

Whether drawing performed on the form persists across invalidations. **Boolean**, default **False**.

When **False**, drawing primitives — [**Cls**](#cls), [**Circle**](#circle), [**Line**](#line), [**PSet**](#pset), [**PaintPicture**](#paintpicture), and [**Print**](#print) — paint directly to the screen and the form must redraw them in its [**Paint**](#paint) event whenever the affected area is invalidated. When **True**, the form keeps an off-screen bitmap, drawing primitives paint into it (and immediately to the screen), the bitmap survives invalidations, and the **Paint** event is suppressed. Reading [**Image**](#image) returns this bitmap.

### BackColor
{: .no_toc }

The background colour of the form's client area, as an **OLE_COLOR**. Defaults to the system 3-D face colour. Used as the fill colour for [**Cls**](#cls) and as the canvas behind [**Picture**](#picture).

### BorderStyle
{: .no_toc }

The window-frame style. A member of [**FormBorderStyleConstants**](../../VBRUN/Constants/FormBorderStyleConstants): **vbBSNone**, **vbFixedSingle**, **vbSizable** (default), **vbFixedDialog**, **vbFixedToolWindow**, **vbSizableToolWindow**, **vbSizableNoTitleBar** (new in twinBASIC), or **vbSizableToolWindowNoTitleBar** (new in twinBASIC). Run-time changes are accepted but only take effect after another change to the window — typically reassigning [**Caption**](#caption).

### Caption
{: .no_toc }

The title-bar text. **String**.

Syntax: *object*.**Caption** [ = *string* ]

Setting **Caption** updates the title bar immediately and re-syncs the title-bar style flags (so it can revive a title bar that was hidden because the previous **Caption** was empty).

### ClipControls
{: .no_toc }

Whether child controls are clipped out of the form's drawing region during paint. **Boolean**, default **True**. Read-only at run time — set at design time.

### ControlBox
{: .no_toc }

Whether the form's title bar shows the system menu (and, with it, the close button). **Boolean**, default **True**. Setting it at run time re-syncs the title-bar style flags.

### Controls
{: .no_toc }

The collection of every control hosted by this form, indexable by control name or zero-based position. **Default property.** Read-only — controls are added to the collection by the runtime, not by user code.

```tb
Dim ctrl As Control
For Each ctrl In Me.Controls
    ctrl.Enabled = False
Next
```

### Count
{: .no_toc }

The number of controls in [**Controls**](#controls), as a **Long**. Read-only. Equivalent to `Me.Controls.Count`.

### ControlType
{: .no_toc }

A read-only [**ControlTypeConstants**](../../VBRUN/Constants/ControlTypeConstants) value identifying this control as a form. Always **vbForm**.

### CurrentX
{: .no_toc }

The horizontal pen position, in [**ScaleMode**](#scalemode) units, used by drawing primitives that omit a starting coordinate (for example, [**Print**](#print) and the rectangle form of [**Line**](#line)). **Double**.

### CurrentY
{: .no_toc }

The vertical pen position, in [**ScaleMode**](#scalemode) units, used by drawing primitives that omit a starting coordinate. **Double**.

### DpiScaleFactorX
{: .no_toc }

The horizontal DPI scale factor of the monitor the form is currently on, as a **Double**. `1.0` at 96 DPI, `1.25` at 120 DPI, `1.5` at 144 DPI, and so on. Read-only.

### DpiScaleFactorY
{: .no_toc }

The vertical DPI scale factor of the monitor the form is currently on. Currently always equal to [**DpiScaleFactorX**](#dpiscalefactorx). Read-only.

### DrawMode
{: .no_toc }

The raster operation that drawing primitives apply when combining the pen with the destination. A member of [**DrawModeConstants**](../../VBRUN/Constants/DrawModeConstants): **vbCopyPen** (default) is normal opaque drawing; other values produce XOR, AND, NOT, and other pixel-mixing effects.

### DrawStyle
{: .no_toc }

The pen line pattern used by drawing primitives. A member of [**DrawStyleConstants**](../../VBRUN/Constants/DrawStyleConstants): **vbSolid** (default), **vbDash**, **vbDot**, **vbDashDot**, **vbDashDotDot**, **vbInvisible**, or **vbInsideSolid**.

### DrawWidth
{: .no_toc }

The pen width in pixels for drawing primitives. **Long**, default `1`. Widths greater than 1 force [**DrawStyle**](#drawstyle) back to **vbSolid** (a Win32 GDI limitation).

### Enabled
{: .no_toc }

Determines whether the form accepts user input. A disabled form ignores keyboard and mouse input and dims its controls. **Boolean**, default **True**.

### FillColor
{: .no_toc }

The fill colour for closed shapes drawn by [**Circle**](#circle) and the rectangle form of [**Line**](#line). **OLE_COLOR**, default `0` (black). Used only when [**FillStyle**](#fillstyle) is not **vbFSTransparent**.

### FillStyle
{: .no_toc }

The fill pattern for closed shapes. A member of [**FillStyleConstants**](../../VBRUN/Constants/FillStyleConstants): **vbFSSolid**, **vbFSTransparent** (default), **vbHorizontalLine**, **vbVerticalLine**, **vbUpwardDiagonal**, **vbDownwardDiagonal**, **vbCross**, or **vbDiagonalCross**.

### Font
{: .no_toc }

The **StdFont** used by the [**Print**](#print) statement and other text drawing on this form. The convenience properties **FontName**, **FontSize**, **FontBold**, **FontItalic**, **FontStrikethru**, and **FontUnderline** read or write the corresponding members of this object.

### FontTransparent
{: .no_toc }

When **True** (default), text drawn on the form has a transparent background, leaving the underlying drawing visible behind it. When **False**, text is drawn over an opaque rectangle filled with [**BackColor**](#backcolor). **Boolean**.

### ForeColor
{: .no_toc }

The pen colour used by [**Circle**](#circle), [**Line**](#line), [**PSet**](#pset), and the text drawn by [**Print**](#print). **OLE_COLOR**.

### hDC
{: .no_toc }

The Win32 device context handle for the form, as a **LongPtr**. Read-only. Returns `0` when the underlying window has not yet been created. Useful for passing to GDI API calls.

### HasDC
{: .no_toc }

Whether the form keeps a private device context (`CS_OWNDC`) for its drawing surface. **Boolean**, default **True**. Read-only at run time — set at design time.

### Height
{: .no_toc }

The form's outer height, in twips by default (or in the container's **ScaleMode** units). **Double**. Setting it resizes the window. Constrained at run time by [**MinHeight**](#minheight) and [**MaxHeight**](#maxheight) when those are non-zero.

### HelpContextID
{: .no_toc }

A **Long** identifying a topic in the application's help file, retrieved when the user presses **F1** while the form has focus.

### hWnd
{: .no_toc }

The Win32 window handle for the form, as a **LongPtr**. Read-only. Useful for passing to API functions.

### Icon
{: .no_toc }

The icon shown on the title bar, in the taskbar, and in Alt-Tab. A **StdPicture** of type **vbPicTypeIcon**. Assigning a non-icon picture clears the icon to the default Windows application icon.

### Image
{: .no_toc }

Returns the rendered drawing surface as a **StdPicture**. Read-only. Most useful when [**AutoRedraw**](#autoredraw) is **True** — the returned picture is the persistent off-screen buffer.

### KeyPreview
{: .no_toc }

When **True**, the form's [**KeyDown**](#keydown), [**KeyUp**](#keyup), and [**KeyPress**](#keypress) events fire *before* the focused control receives the same keystroke. **Boolean**, default **False**. Useful for application-wide hotkeys; events still fire on the focused control afterwards.

### Left
{: .no_toc }

The horizontal position of the form's outer rectangle, in twips (or the calling code's **ScaleMode** units), measured from the left edge of the screen — or, for an MDI child, from the left edge of the MDI parent's client area. **Double**.

### LinkMode
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6's DDE feature; not currently implemented in twinBASIC.

### LinkTopic
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6's DDE feature; not currently implemented in twinBASIC.

### MaxButton
{: .no_toc }

Whether the title bar shows the maximise button. **Boolean**, default **True**, read-only at run time. Set at design time.

### MaxHeight
{: .no_toc }

The maximum height of the form's *client area*, in twips. **Double**, default `0` (no limit). Honoured during interactive resizing.

### MaxWidth
{: .no_toc }

The maximum width of the form's *client area*, in twips. **Double**, default `0` (no limit). Honoured during interactive resizing.

### MDIChild
{: .no_toc }

When **True**, the form is hosted as a child inside an [**MDIForm**](../MDIForm). **Boolean**, read-only — set at design time. An MDI child form cannot be shown modally.

### MinButton
{: .no_toc }

Whether the title bar shows the minimise button. **Boolean**, default **True**, read-only at run time. Set at design time.

### MinHeight
{: .no_toc }

The minimum height of the form's *client area*, in twips. **Double**, default `0` (no limit). Honoured during interactive resizing.

### MinWidth
{: .no_toc }

The minimum width of the form's *client area*, in twips. **Double**, default `0` (no limit). Honoured during interactive resizing.

### MouseIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor when [**MousePointer**](#mousepointer) is **vbCustom** and the pointer is over the form (and not over a child control with its own setting).

### MousePointer
{: .no_toc }

The mouse cursor shown when the pointer is over the form (and not over a child control with its own setting). A member of [**MousePointerConstants**](../../VBRUN/Constants/MousePointerConstants).

### Moveable
{: .no_toc }

Whether the user can drag the form by its title bar. **Boolean**, default **True**.

### Name
{: .no_toc }

The unique design-time name of the form. Read-only at run time. Also the class name of the generated form class.

### NegotiateMenus
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6's ActiveX-document menu negotiation feature; not currently implemented in twinBASIC.

### OLEDropMode
{: .no_toc }

How the form responds to OLE drops. A restricted member of [**OLEDropConstants**](../../VBRUN/Constants/OLEDropConstants): **vbOLEDropNone** or **vbOLEDropManual**. Automatic-drop mode is not supported on a Form.

### Opacity
{: .no_toc }

The form's opacity as a percentage (0–100, default 100). Values outside the range are clamped on **Initialize**. Values below 100 cause the form to become a layered window.

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

A **StdPicture** drawn as the form's background. Painted before any drawing primitives or child controls. Assigning **Nothing** removes the background.

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

The logical horizontal coordinate of the left edge of the form's client area, in [**ScaleMode**](#scalemode) units. **Double**. Default `0`.

### ScaleMode
{: .no_toc }

The unit of measurement used by [**CurrentX**](#currentx), [**CurrentY**](#currenty), the drawing primitives, [**TextWidth**](#textwidth), and [**TextHeight**](#textheight). A member of [**ScaleModeConstants**](../../VBRUN/Constants/ScaleModeConstants): **vbTwips** (default), **vbPoints**, **vbPixels**, **vbCharacters**, **vbInches**, **vbMillimeters**, **vbCentimeters**, or **vbUser** (the four **Scale\*** properties define the rectangle).

### ScaleTop
{: .no_toc }

The logical vertical coordinate of the top edge of the form's client area, in [**ScaleMode**](#scalemode) units. **Double**. Default `0`.

### ScaleWidth
{: .no_toc }

The width of the logical drawing rectangle, in [**ScaleMode**](#scalemode) units. **Double**. Setting it implicitly switches **ScaleMode** to **vbUser**.

### ShowInTaskbar
{: .no_toc }

Whether the form appears in the Windows taskbar and Alt-Tab list. **Boolean**, default **True**. Read-only at run time — set at design time.

### StartUpPosition
{: .no_toc }

How the form's initial position is determined the first time it is shown. A member of [**StartUpPositionConstants**](../../VBRUN/Constants/StartUpPositionConstants): **vbStartUpManual**, **vbStartUpOwner**, **vbStartUpScreen**, or **vbStartUpWindowsDefault** (default). Read-only at run time — set at design time.

### TabFocusAutoSelect
{: .no_toc }

When **True**, a [**TextBox**](../TextBox) on this form whose own **TabFocusAutoSelect** is also **True** auto-selects its content when the focus enters it via the **TAB** key. **Boolean**, default **False**.

### Tag
{: .no_toc }

A free-form **String** the application can use to associate custom data with the form. Ignored by the framework.

### Top
{: .no_toc }

The vertical position of the form's outer rectangle, in twips (or the calling code's **ScaleMode** units), measured from the top edge of the screen — or, for an MDI child, from the top edge of the MDI parent's client area. **Double**.

### TopMost
{: .no_toc }

Whether the form sits in the always-on-top z-order layer. **Boolean**, read-only at run time. Set at design time.

### TransparencyKey
{: .no_toc }

An **OLE_COLOR** that, when set, becomes fully transparent in the rendered form — clicks pass through to whatever is underneath, and the corresponding pixels do not paint. Default `-1` disables the effect.

### Visible
{: .no_toc }

Whether the form is shown. **Boolean**, default **True**. Setting **Visible** to **True** when the form was hidden is equivalent to calling [**Show**](#show) **vbModeless**; setting it to **False** is equivalent to calling [**Hide**](#hide).

### WhatsThisButton
{: .no_toc }

When **True**, the title bar shows a "?" help button — but only when [**MinButton**](#minbutton) is **False**, [**MaxButton**](#maxbutton) is **False**, [**ControlBox**](#controlbox) is **True**, and [**BorderStyle**](#borderstyle) is not a tool-window style. **Boolean**.

### WhatsThisHelp
{: .no_toc }

When **True**, [**WhatsThisMode**](#whatsthismode) and the title-bar help button enter Windows' "What's This?" cursor mode. **Boolean**, default **False**.

### Width
{: .no_toc }

The form's outer width, in twips by default (or in the container's **ScaleMode** units). **Double**. Setting it resizes the window. Constrained at run time by [**MinWidth**](#minwidth) and [**MaxWidth**](#maxwidth) when those are non-zero.

### WindowState
{: .no_toc }

The window's normal/minimised/maximised state. A member of [**FormWindowStateConstants**](../../VBRUN/Constants/FormWindowStateConstants): **vbNormal** (0, default), **vbMinimized** (1), or **vbMaximized** (2). Setting it at run time updates the window placement immediately if the form is visible.

## Methods

### Circle
{: .no_toc }

Draws a circle, ellipse, or arc on the form using [**ForeColor**](#forecolor) for the outline and [**FillColor**](#fillcolor)/[**FillStyle**](#fillstyle) for the interior.

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

### Close
{: .no_toc }

Initiates the form's unload sequence — [**QueryUnload**](#queryunload), then [**Unload**](#unload), then [**Terminate**](#terminate). Either of the first two events can cancel the close by setting *Cancel* to non-zero. Equivalent to the language statement `Unload Me`.

Syntax: *object*.**Close**

### Hide
{: .no_toc }

Hides the form without unloading it. The class instance and its controls are preserved; calling [**Show**](#show) (or assigning [**Visible**](#visible) = **True**) brings it back. Equivalent to assigning **Visible** = **False**.

Syntax: *object*.**Hide**

### Line
{: .no_toc }

Draws a line, or a rectangle, on the form using [**ForeColor**](#forecolor) (or an explicit colour) and [**DrawWidth**](#drawwidth)/[**DrawStyle**](#drawstyle).

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

### Move
{: .no_toc }

Repositions and optionally resizes the form in a single call.

Syntax: *object*.**Move** *Left* [, *Top* [, *Width* [, *Height* ] ] ]

*Left*
: *required* A **Single** giving the new horizontal position.

*Top*, *Width*, *Height*
: *optional* New values for the corresponding properties. Omitted values are left unchanged.

### OLEDrag
{: .no_toc }

Initiates an OLE drag operation from the form, raising the [**OLEStartDrag**](#olestartdrag) event so the application can populate the **DataObject**.

Syntax: *object*.**OLEDrag**

### PaintPicture
{: .no_toc }

Draws a **StdPicture** onto the form, with optional scaling and raster operations.

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

### PopUpMenu
{: .no_toc }

Displays a [**Menu**](../Menu) as a context-menu pop-up at the specified location.

Syntax: *object*.**PopUpMenu** *Menu* [, *Flags* [, *X* [, *Y* [, *DefaultMenu* ] ] ] ]

*Menu*
: *required* The **Menu** control to display. The menu must already exist on the form (or its MDI parent).

*Flags*
: *optional* A combination of [**MenuControlConstants**](../../VBRUN/Constants/MenuControlConstants) controlling alignment and which mouse buttons trigger the menu items.

*X*, *Y*
: *optional* The screen-relative position to anchor the menu at, in [**ScaleMode**](#scalemode) units. Defaults to the current mouse position.

*DefaultMenu*
: *optional* The **Menu** sub-item to render in bold as the default action.

### Point
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC. In VB6 this returns the **OLE_COLOR** of a single pixel of the drawing surface.

Syntax: *object*.**Point**( *X*, *Y* )

### Print
{: .no_toc }

Writes text to the form's drawing surface using [**Font**](#font), starting at [**CurrentX**](#currentx) / [**CurrentY**](#currenty) and advancing them as it goes. Dispatched through the VB6 **Print** statement so multiple expressions can be separated by `;` (no spacing) or `,` (tab to the next print zone). **Spc(n)** inserts *n* spaces and **Tab(n)** moves to print column *n*. Output honours [**Font**](#font), [**ForeColor**](#forecolor), and [**FontTransparent**](#fonttransparent), and — when [**AutoRedraw**](#autoredraw) is **True** — is recorded into the persistent off-screen bitmap so it survives invalidations.

Syntax: *object*.**Print** \[ *expressionlist* ] \[ **;** \| **,** ]

A trailing `;` or `,` suppresses the newline so the next **Print** call continues on the same line; without a trailing separator, the pen advances to the start of the next line.

```tb
Me.CurrentX = 10 : Me.CurrentY = 10
Me.Print "Name: "; sName, "Age: "; nAge      ' two fields, tab-separated
Me.Print                                     ' blank line
Me.Print "Total: " & Format$(Total, "0.00")
```

### PrintForm
{: .no_toc }

Sends a screen-shot of the form's current visual state to the default printer through the [**Printer**](../../VB/Printer/) object.

Syntax: *object*.**PrintForm** [ *ImplicitEndDoc* [, *OutputAtCurrentPosition* ] ]

*ImplicitEndDoc*
: *optional* When **True** (default), the print job is finalised before returning; when **False**, the form is sent as a page but the print job stays open for further output.

*OutputAtCurrentPosition*
: *optional* When **True**, the form is rendered at the printer's current pen position rather than at the page origin. **Boolean**, default **False**.

### PSet
{: .no_toc }

Sets a single pixel on the form to a specified colour.

Syntax: *object*.**PSet** [ **Step** ] ( *X*, *Y* ) [, *Color* ]

*X*, *Y*
: *required* The pixel position, in [**ScaleMode**](#scalemode) units. **Step** makes the position relative to ([**CurrentX**](#currentx), [**CurrentY**](#currenty)).

*Color*
: *optional* An **OLE_COLOR**; defaults to [**ForeColor**](#forecolor).

### Refresh
{: .no_toc }

Forces an immediate repaint of the form, raising [**Paint**](#paint) when [**AutoRedraw**](#autoredraw) is **False**.

Syntax: *object*.**Refresh**

### Scale
{: .no_toc }

Sets the form's logical drawing rectangle in a single call by assigning [**ScaleLeft**](#scaleleft), [**ScaleTop**](#scaletop), [**ScaleWidth**](#scalewidth), and [**ScaleHeight**](#scaleheight). Switches [**ScaleMode**](#scalemode) to **vbUser**. Calling **Scale** with no arguments resets the rectangle to a 1-to-1 mapping with the client area in pixels.

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

Activates the form and gives input focus to the control whose [**TabIndex**](../TextBox#tabindex) is `0` (or to whichever control last held focus on this form).

Syntax: *object*.**SetFocus**

### Show
{: .no_toc }

Makes the form visible. Triggers [**Load**](#load) on the first call.

Syntax: *object*.**Show** [ *Modal* [, *OwnerForm* ] ]

*Modal*
: *optional* A member of [**FormShowConstants**](../../VBRUN/Constants/FormShowConstants): **vbModeless** (0, default — the call returns immediately) or **vbModal** (1 — the call blocks until the form is closed and the user cannot interact with other forms).

*OwnerForm*
: *optional* For modal shows, the form that is disabled while this form is up; defaults to the currently active form.

### TextHeight
{: .no_toc }

Returns the height that the given string would occupy when drawn with the form's current [**Font**](#font), in [**ScaleMode**](#scalemode) units.

Syntax: *object*.**TextHeight**( *Str* )

*Str*
: *required* A **String** to measure.

### TextWidth
{: .no_toc }

Returns the width that the given string would occupy when drawn with the form's current [**Font**](#font), in [**ScaleMode**](#scalemode) units.

Syntax: *object*.**TextWidth**( *Str* )

*Str*
: *required* A **String** to measure.

### ValidateControls
{: .no_toc }

Fires the **Validate** event of the currently active control on this form. If the handler sets *Cancel* to **True**, **ValidateControls** raises run-time error 380 (*Invalid property value*); the caller can wrap this with `On Error` to detect a failed validation. Useful for checking pending input before saving or closing.

Syntax: *object*.**ValidateControls**

### WhatsThisMode
{: .no_toc }

Enters Windows' "What's This?" cursor mode — the next click on a control raises that control's help instead of activating it. [**WhatsThisHelp**](#whatsthishelp) must be **True**.

Syntax: *object*.**WhatsThisMode**

### ZOrder
{: .no_toc }

Brings the form to the front or back of the top-level z-order.

Syntax: *object*.**ZOrder** [ *Position* ]

*Position*
: *optional* A member of [**ZOrderConstants**](../../VBRUN/Constants/ZOrderConstants): **vbBringToFront** (0, default) or **vbSendToBack** (1).

## Events

### Activate
{: .no_toc }

Raised when the form becomes the active window in the application — either after [**Load**](#load) for the first show, or whenever it gains activation back from another window.

Syntax: *object*\_**Activate**( )

### Click
{: .no_toc }

Raised when the user single-clicks the form's client area (i.e. not over any child control).

Syntax: *object*\_**Click**( )

### DblClick
{: .no_toc }

Raised when the user double-clicks the form's client area.

Syntax: *object*\_**DblClick**( )

### Deactivate
{: .no_toc }

Raised when another window in the application takes activation away from this form. Not raised when activation moves to a window in a different application.

Syntax: *object*\_**Deactivate**( )

### DPIChange
{: .no_toc }

Raised when the form moves to a monitor with a different DPI scale, *but only* when the application is per-monitor DPI aware (`PROCESS_PER_MONITOR_DPI_AWARE`). The event's *NewDPI* argument carries the new effective DPI; child controls re-scale themselves automatically. New in twinBASIC.

Syntax: *object*\_**DPIChange**( *NewDPI* **As Long** )

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

Raised when the form receives the input focus and no enabled child control of the form is in a position to take it instead. A form with no focusable child controls receives focus directly.

Syntax: *object*\_**GotFocus**( )

### Initialize
{: .no_toc }

Raised once, before the underlying window is created and before any of the form's child controls exist. Useful for setting initial values on form-level fields. The form's controls cannot be referenced from this event.

Syntax: *object*\_**Initialize**( )

### KeyDown
{: .no_toc }

Raised when the user presses any key. Fires on the focused control by default; with [**KeyPreview**](#keypreview) **True**, fires on the form first.

Syntax: *object*\_**KeyDown**( *KeyCode* **As Integer**, *Shift* **As Integer** )

### KeyPress
{: .no_toc }

Raised when the user types a character that produces an ANSI keystroke. Fires on the focused control by default; with [**KeyPreview**](#keypreview) **True**, fires on the form first.

Syntax: *object*\_**KeyPress**( *KeyAscii* **As Integer** )

### KeyUp
{: .no_toc }

Raised when the user releases a key. Fires on the focused control by default; with [**KeyPreview**](#keypreview) **True**, fires on the form first.

Syntax: *object*\_**KeyUp**( *KeyCode* **As Integer**, *Shift* **As Integer** )

### LinkClose
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6's DDE feature; not currently raised in twinBASIC.

### LinkError
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6's DDE feature; not currently raised in twinBASIC.

### LinkExecute
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6's DDE feature; not currently raised in twinBASIC.

### LinkOpen
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6's DDE feature; not currently raised in twinBASIC.

### Load
{: .no_toc }

Raised after the form's window and all controls have been created, just before the form first appears on screen. The classic place to populate controls, attach data sources, and perform any initialisation that needs the controls to exist. **Default event.**

Syntax: *object*\_**Load**( )

### LostFocus
{: .no_toc }

Raised when the form loses the input focus.

Syntax: *object*\_**LostFocus**( )

### MouseDown
{: .no_toc }

Raised when the user presses any mouse button over the form's client area.

Syntax: *object*\_**MouseDown**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseMove
{: .no_toc }

Raised when the cursor moves over the form's client area.

Syntax: *object*\_**MouseMove**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseUp
{: .no_toc }

Raised when the user releases a mouse button over the form's client area.

Syntax: *object*\_**MouseUp**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseWheel
{: .no_toc }

Raised when the mouse wheel turns over the form. New in twinBASIC.

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

Raised when an invalidated portion of the form needs to be redrawn. Suppressed when [**AutoRedraw**](#autoredraw) is **True** — the form's persistent off-screen buffer is blitted to the screen instead.

Syntax: *object*\_**Paint**( )

### QueryUnload
{: .no_toc }

Raised before the form unloads, giving the application a chance to confirm or cancel the close. Setting *Cancel* to non-zero keeps the form open. Always raised before [**Unload**](#unload).

Syntax: *object*\_**QueryUnload**( *Cancel* **As Integer**, *UnloadMode* **As Integer** )

*Cancel*
: Set to non-zero (any non-zero value, conventionally **1**) to cancel the close.

*UnloadMode*
: A member of [**QueryUnloadConstants**](../../VBRUN/Constants/QueryUnloadConstants) identifying what triggered the close — the close button, code, Windows shutdown, the MDI parent, or the owner form.

### Resize
{: .no_toc }

Raised when the form is resized — by the user, by code, by the OS following a [**WindowState**](#windowstate) change, or by initial layout during the first show.

Syntax: *object*\_**Resize**( )

### Terminate
{: .no_toc }

Raised after the form's window has been destroyed and the class instance is about to be released. The controls are no longer accessible at this point.

Syntax: *object*\_**Terminate**( )

### Unload
{: .no_toc }

Raised after [**QueryUnload**](#queryunload) approves and before the form's window is destroyed. Setting *Cancel* to non-zero keeps the form open and prevents the unload.

Syntax: *object*\_**Unload**( *Cancel* **As Integer** )

*Cancel*
: Set to non-zero (any non-zero value, conventionally **1**) to cancel the unload.
