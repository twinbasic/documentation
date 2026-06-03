---
title: Image
parent: VB Package
permalink: /tB/Packages/VB/Image/
has_toc: false
---

# Image class
{: .no_toc }

An **Image** is a windowless lightweight control for displaying a picture --- a bitmap, JPEG, GIF, PNG, icon, cursor, or Windows metafile. It is the small, efficient alternative to [**PictureBox**](../PictureBox): no underlying Win32 window, no drawing surface, no child controls, no focus --- just a rectangle on the parent that paints whatever is in [**Picture**](#picture). Image controls are ideal for logos, decorative artwork, custom-drawn buttons, glyph rows, and any other place where a heavy **PictureBox** would be overkill.

The default property is [**Picture**](#picture) and the default event is [**Click**](#click).

```tb
Private Sub Form_Load()
    Set imgLogo.Picture  = LoadPicture(App.Path & "\logo.png")
    imgLogo.Stretch      = True
    imgLogo.BorderStyle  = vbFixedSingleBorder
End Sub

Private Sub imgLogo_Click()
    MsgBox "Logo clicked"
End Sub
```

* TOC
{:toc}

## Windowless rendering

An **Image** has no `hWnd`. The framework paints it directly onto its parent's drawing surface during the parent's paint cycle, so the control is much cheaper than a [**PictureBox**](../PictureBox) and adds no Win32 window of its own. The trade-offs are the same as for any windowless control:

- No focus, no keyboard input, no `KeyDown` / `KeyPress` / `KeyUp` / `GotFocus` / `LostFocus` / `Validate`.
- No `hWnd` to pass to API functions, and no `SetFocus`.
- Cannot host child controls.

For anything that needs those, use [**PictureBox**](../PictureBox) instead.

## Stretch and auto-sizing

[**Stretch**](#stretch) is the master switch for sizing behaviour:

- **Stretch = False** (default): the picture is drawn at its natural pixel size and the **Image** auto-resizes itself to match every time a new [**Picture**](#picture) is assigned. The user may still resize the control manually --- once that happens the picture is clipped or padded around the natural bounds (it is *not* re-stretched).
- **Stretch = True**: the picture is scaled to fill the **Image**'s rectangle. The resampling algorithm is chosen by [**StretchMode**](#stretchmode); aspect ratio is *not* preserved.

Metafiles (`vbPicTypeMetafile`, `vbPicTypeEMetafile`) are vector --- they always scale to fit and the aspect ratio is preserved regardless of [**Stretch**](#stretch).

[**PictureDpiScaling**](#picturedpiscaling), when **True**, multiplies the natural pixel dimensions by the current DPI scale factor before drawing --- useful for keeping a logo the same physical size on a high-DPI monitor as on a 96-DPI one.

## Rotation

[**Angle**](#angle) rotates the rendered picture, in degrees, anti-clockwise around the top-left corner of the control's rectangle. `0` is the natural orientation; `90` is a quarter turn anti-clockwise; values between `0` and `360` give arbitrary rotations. The control's bounding rectangle does not change --- large rotation angles can therefore push the visible picture outside the rectangle. Hit-testing for [**Click**](#click), [**MouseDown**](#mousedown), and the other mouse events still uses the unrotated rectangle.

## Border

[**BorderStyle**](#borderstyle) chooses between no border (the default) and a single sunken border drawn around the rectangle. When a border is present, [**Appearance**](#appearance) selects between a 3-D and a flat (monochrome) version of it.

## Source-side and destination-side OLE drag-drop

The **Image** control supports both ends of an OLE drag-drop operation:

- [**OLEDragMode**](#oledragmode) controls the source side. With **vbOLEDragAutomatic**, holding the mouse over the **Image** and beginning a drag automatically copies the current [**Picture**](#picture) into the resulting **DataObject**. With **vbOLEDragManual** (default) drags must be initiated by calling [**OLEDrag**](#oledrag) from a [**MouseDown**](#mousedown) handler.
- [**OLEDropMode**](#oledropmode) controls the destination side. With **vbOLEDropManual** the [**OLEDragOver**](#oledragover) and [**OLEDragDrop**](#oledragdrop) events fire and the application decides what to do. **vbOLEDropAutomatic** is not supported on an **Image** and assigning it raises run-time error 5.

## Data binding

Setting [**DataSource**](#datasource) and [**DataField**](#datafield) connects the [**Picture**](#picture) to a field of a [**Data**](../Data/) control's recordset. The bound field is read as binary picture data on each move; assigning **Nothing** to **Picture** writes a null-equivalent back to the recordset, and any other assignment serialises the picture's bytes back through the bound field.

## Properties

### Anchors
{: .no_toc }

The set of edges of the parent that the **Image**'s corresponding edges follow when the parent resizes. Read-only --- assign individual `.Left`, `.Top`, `.Right`, `.Bottom` flags through the returned **Anchors** object.

### Angle
{: .no_toc }

The rotation of the rendered picture, in degrees, anti-clockwise around the top-left of the control's rectangle. **Double**, default `0`.

### Appearance
{: .no_toc }

The style of the border, as a member of [**AppearanceConstants**](../../VBRUN/Constants/AppearanceConstants): **vbAppearFlat** or **vbAppear3d** (default). Only meaningful when [**BorderStyle**](#borderstyle) is **vbFixedSingleBorder**.

### BorderStyle
{: .no_toc }

The style of border drawn around the rectangle. A member of [**ControlBorderStyleConstants**](../../VBRUN/Constants/ControlBorderStyleConstants): **vbNoBorder** (0, default) or **vbFixedSingleBorder** (1).

### Container
{: .no_toc }

The control that hosts this **Image** --- typically the form, a [**Frame**](../Frame/), or a **UserControl**. Read with **Get**, change with **Set**.

### ControlType
{: .no_toc }

A read-only [**ControlTypeConstants**](../../VBRUN/Constants/ControlTypeConstants) value identifying this control as an image. Always **vbImage**.

### DataChanged
{: .no_toc }

Whether the bound [**Picture**](#picture) has been written to since the last save or refresh from the [**DataSource**](#datasource). **Boolean**. Setting **DataChanged** = **True** also marks the bound recordset as dirty.

### DataField
{: .no_toc }

The name of the field, in the recordset of the bound [**DataSource**](#datasource), whose binary value is mirrored by [**Picture**](#picture). **String**.

### DataFormat
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### DataMember
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### DataSource
{: .no_toc }

A reference to a [**Data**](../Data/) control (or other **DataSource** provider) whose recordset supplies the value for [**DataField**](#datafield). Set with **Set**.

### Dock
{: .no_toc }

Where the **Image** is docked within its container. A member of [**DockModeConstants**](../../VBRUN/Constants/DockModeConstants): **vbDockNone** (default), **vbDockLeft**, **vbDockTop**, **vbDockRight**, **vbDockBottom**, or **vbDockFill**. Docked images ignore [**Anchors**](#anchors).

### DragIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor while the control is being drag-and-dropped (see [**Drag**](#drag) and [**DragMode**](#dragmode)).

### DragMode
{: .no_toc }

Whether the control should drag itself (the manual VB-drag form, distinct from OLE drag) when the user holds the mouse over it. A member of [**DragModeConstants**](../../VBRUN/Constants/DragModeConstants): **vbManual** (0, default --- call [**Drag**](#drag) from code) or **vbAutomatic** (1).

### Enabled
{: .no_toc }

Determines whether the control accepts mouse input. A disabled **Image** still paints normally but ignores mouse events. **Boolean**, default **True**.

### Height
{: .no_toc }

The control's height, in twips by default (or in the container's **ScaleMode** units). **Double**. When [**Stretch**](#stretch) is **False** and a new [**Picture**](#picture) is assigned, the height auto-resizes to the picture's natural pixel height.

### Index
{: .no_toc }

When the control is part of a control array, the **Long** zero-based index of this instance within the array. Reading **Index** on a non-array instance raises run-time error 343 (*Object not an array*). Read-only at run time.

### Left
{: .no_toc }

The horizontal distance from the left edge of the container to the left edge of the control. **Double**.

### MouseIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor when [**MousePointer**](#mousepointer) is **vbCustom** and the pointer is over the control.

### MousePointer
{: .no_toc }

The mouse cursor shown when the pointer is over the control. A member of [**MousePointerConstants**](../../VBRUN/Constants/MousePointerConstants).

### Name
{: .no_toc }

The unique design-time name of the control on its parent form. Read-only at run time.

### OLEDragMode
{: .no_toc }

Whether an OLE drag is started automatically when the user begins dragging the **Image**. A member of [**OLEDragConstants**](../../VBRUN/Constants/OLEDragConstants): **vbOLEDragManual** (0, default --- application calls [**OLEDrag**](#oledrag)) or **vbOLEDragAutomatic** (1 --- the framework copies the current [**Picture**](#picture) into the resulting **DataObject** automatically).

### OLEDropMode
{: .no_toc }

How the **Image** responds to OLE drops arriving on it. A restricted member of [**OLEDropConstants**](../../VBRUN/Constants/OLEDropConstants): **vbOLEDropNone** (0, default) or **vbOLEDropManual** (1). Automatic drop is not supported on an **Image**; assigning **vbOLEDropAutomatic** raises run-time error 5 (*Invalid procedure call or argument*).

### Parent
{: .no_toc }

A reference to the [**Form**](../Form/) (or **UserControl**) that ultimately contains the control. Read-only.

### Picture
{: .no_toc }

The **StdPicture** rendered by the control. **Default property.**

Syntax: `Set` *object*.**Picture** = *picture*

Assigning **Nothing** restores an empty picture rather than removing the surface. Assigning a new picture while [**Stretch**](#stretch) is **False** auto-resizes the control to the picture's natural pixel dimensions; while [**Stretch**](#stretch) is **True** the existing rectangle is preserved and the new picture is scaled to fit.

### PictureDpiScaling
{: .no_toc }

When **True**, the picture's natural pixel dimensions are multiplied by the current DPI scale factor before being drawn (and used by the auto-size logic). **Boolean**, default **False**.

### Stretch
{: .no_toc }

Whether the picture is scaled to fill the control's rectangle (**True**) or rendered at its natural size with the control auto-sized to fit (**False**, default). See [Stretch and auto-sizing](#stretch-and-auto-sizing) for the full rules. Metafiles always scale regardless of this setting.

### StretchMode
{: .no_toc }

The resampling algorithm used when [**Stretch**](#stretch) is **True** and the picture is scaled. A member of `Image.StretchModeConstants`:

| Constant                  | Value | Algorithm                                                                |
|---------------------------|-------|--------------------------------------------------------------------------|
| **vbStretchHalftone**     | 0     | GDI `STRETCH_HALFTONE` (default --- good general-purpose quality).         |
| **vbStretchColorOnColor** | 1     | GDI `STRETCH_COLORONCOLOR` (fastest, lowest quality --- nearest neighbour). |
| **vbStretchLanczos8**     | 2     | Custom Lanczos resampler with an 8-lobe kernel (highest quality, slowest). |
| **vbStretchLanczos3**     | 3     | Custom Lanczos resampler with a 3-lobe kernel (high quality).            |
| **vbStretchBicubic**      | 4     | Custom bicubic resampler.                                                |
| **vbStretchBilinear**     | 5     | Custom bilinear resampler.                                               |

The Lanczos, bicubic, and bilinear modes only apply to bitmaps that actually need resizing --- metafiles and unscaled bitmaps fall back to the GDI mode.

### Tag
{: .no_toc }

A free-form **String** the application can use to associate custom data with the control. Ignored by the framework.

### ToolTipText
{: .no_toc }

A multi-line **String** displayed as a tooltip when the user hovers over the control.

### Top
{: .no_toc }

The vertical distance from the top of the container to the top of the control. **Double**.

### Visible
{: .no_toc }

Whether the control is shown. **Boolean**, default **True**.

### WhatsThisHelpID
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC. See [**ShowWhatsThis**](#showwhatsthis).

### Width
{: .no_toc }

The control's width, in twips by default (or in the container's **ScaleMode** units). **Double**. When [**Stretch**](#stretch) is **False** and a new [**Picture**](#picture) is assigned, the width auto-resizes to the picture's natural pixel width.

## Methods

### Drag
{: .no_toc }

Begins, completes, or cancels a manual VB-style drag operation. Distinct from OLE drag --- see [**OLEDrag**](#oledrag).

Syntax: *object*.**Drag** [ *Action* ]

*Action*
: *optional* A member of [**DragConstants**](../../VBRUN/Constants/DragConstants): **vbCancel** (0), **vbBeginDrag** (1, default), or **vbEndDrag** (2).

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

Initiates an OLE drag operation from this **Image**, raising the [**OLEStartDrag**](#olestartdrag) event so the application can populate the **DataObject** (or, if the source has already been pre-populated, begins the drag immediately).

Syntax: *object*.**OLEDrag**

### Refresh
{: .no_toc }

Forces an immediate repaint of the **Image**'s rectangle on the parent's drawing surface.

Syntax: *object*.**Refresh**

### ShowWhatsThis
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

Syntax: *object*.**ShowWhatsThis**

### ZOrder
{: .no_toc }

Brings the **Image** to the front or back of the windowless-sibling stack within its container.

Syntax: *object*.**ZOrder** [ *Position* ]

*Position*
: *optional* A member of [**ZOrderConstants**](../../VBRUN/Constants/ZOrderConstants): **vbBringToFront** (0, default) or **vbSendToBack** (1).

## Events

### Click
{: .no_toc }

Raised when the user single-clicks the control's rectangle. **Default event.**

Syntax: *object*\_**Click**( )

### DblClick
{: .no_toc }

Raised when the user double-clicks the control's rectangle.

Syntax: *object*\_**DblClick**( )

### DragDrop
{: .no_toc }

Raised on the destination control when a manual VB-style drag operation ends over it.

Syntax: *object*\_**DragDrop**( *Source* **As Control**, *X* **As Single**, *Y* **As Single** )

### DragOver
{: .no_toc }

Raised on the control under the cursor while a manual VB-style drag operation is in progress.

Syntax: *object*\_**DragOver**( *Source* **As Control**, *X* **As Single**, *Y* **As Single**, *State* **As Integer** )

### Initialize
{: .no_toc }

Raised once, after the control has been connected to its container's paint cycle but before it is first painted. Useful for last-minute setup that depends on container state.

Syntax: *object*\_**Initialize**( )

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
