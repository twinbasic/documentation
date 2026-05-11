---
title: QRCode
parent: VB Package
permalink: /tB/Packages/VB/QRCode/
has_toc: false
---

# QRCode class
{: .no_toc }

A **QRCode** is a windowless lightweight control that renders a QR code generated from its [**Payload**](#payload) — a URL, plain text, or a raw byte array. The encoding is performed in-process by the embedded `qrcodegen` library and the resulting matrix is painted directly on the parent at design time and at run time. The picture is regenerated automatically whenever any of the encoding properties changes, so a QR control can be wired up declaratively to data bindings or to other UI state with no plumbing.

Like [**Image**](../Image), a QRCode has no `hWnd` and is not focusable. It is the right choice for embedding a scannable code in a form (login, payment, Wi-Fi credentials, contact card, app deep link, etc.) without paying for a heavy [**PictureBox**](../PictureBox).

The default property is [**Picture**](#picture) (the read-only generated image) and the default event is [**Click**](#click).

```tb
Private Sub Form_Load()
    QRCode1.Payload = "https://www.twinbasic.com"
    QRCode1.EccMode = vbQRCodegenEccHigh    ' 30 % parity
    QRCode1.ForeColor = vbBlue
End Sub

Private Sub QRCode1_Click()
    MsgBox "QR code clicked"
End Sub
```

* TOC
{:toc}

## Windowless rendering

A **QRCode** has no `hWnd`. The framework paints it directly onto its parent's drawing surface during the parent's paint cycle. The trade-offs are the same as for any windowless control:

- No focus, no keyboard input, no `KeyDown` / `KeyPress` / `KeyUp` / `GotFocus` / `LostFocus` / `Validate`.
- No `hWnd` to pass to API functions, and no `SetFocus`.
- Cannot host child controls.

For a QR code that needs any of those, host the **QRCode** inside a [**PictureBox**](../PictureBox) or [**Frame**](../Frame) and put the focusable controls next to it.

## Encoding the payload

The [**Payload**](#payload) property is a **Variant** that accepts either a **String** (text or URL) or a one-dimensional **Byte()** array (for binary data). The encoder picks the most compact segment mode automatically — numeric, alphanumeric, or byte — based on the contents of the string; for a byte array the byte mode is used unconditionally and the data is encoded verbatim. Empty payloads clear [**Picture**](#picture) to **Nothing**; at design time the rectangle then shows a *(no payload text)* placeholder.

The QR code is regenerated whenever [**Payload**](#payload), [**ForeColor**](#forecolor), [**ModuleSize**](#modulesize), [**SquareModules**](#squaremodules), [**EccMode**](#eccmode), [**EccBoost**](#eccboost), [**MinVersion**](#minversion), [**MaxVersion**](#maxversion), or [**MaskType**](#masktype) changes, and the new picture becomes visible through [**Picture**](#picture). [**Refresh**](#refresh) only repaints — it does not force re-encoding.

## Error correction

QR codes embed a Reed-Solomon parity stream that lets the decoder recover from damage to a portion of the matrix. [**EccMode**](#eccmode) chooses how much of the matrix is dedicated to parity:

| Constant                        | Value | Approx. recovery |
|---------------------------------|-------|------------------|
| **vbQRCodegenEccLow**           | 0     | 7%               |
| **vbQRCodegenEccMedium**        | 1     | 15%              |
| **vbQRCodegenEccQuartile**      | 2     | 25%              |
| **vbQRCodegenEccHigh**          | 3     | 30%              |

When [**EccBoost**](#eccboost) is **True** (default), the encoder raises the parity level beyond the configured minimum if doing so still fits the payload in the same QR version — getting better resilience for free.

## Version and mask

The QR-code *version* (1 to 40) sets the matrix size: version 1 is 21 × 21 modules, version 40 is 177 × 177. [**MinVersion**](#minversion) and [**MaxVersion**](#maxversion) constrain the encoder's search; it picks the smallest version in the range that fits the payload at the chosen [**EccMode**](#eccmode). The defaults (`1` and `40`) span the full range. Values outside `1..40` are clamped, and if **MinVersion** ends up greater than **MaxVersion** it is reset to `1`.

[**MaskType**](#masktype) selects one of eight masks applied to the matrix to break up patterns that confuse the scanner. **vbQRCodegenMaskAuto** (-1, default) picks the mask with the best penalty score; the eight named values **vbQRCodegenMask0** through **vbQRCodegenMask7** force a specific one — useful for reproducibility.

## Module rendering

[**ModuleSize**](#modulesize) is the pixel size of one module of the generated [**Picture**](#picture). Default `120`. The picture is rescaled down to the control's rectangle at paint time, so the choice of [**ModuleSize**](#modulesize) only matters when the picture is being saved or pulled out for use elsewhere (clipboard, drag-drop, **SavePicture**, …).

[**SquareModules**](#squaremodules) chooses how each module is drawn in the picture: as a filled square (**True**, default) or as a filled circle (**False** — a stylistic choice that most scanners still tolerate).

[**Square**](#square), in contrast, controls the rendering of the picture *on the control*: with **True** (default) the picture is letter-boxed and centred so it stays square regardless of the control's aspect ratio; with **False** the picture is stretched to fill the rectangle.

## Border

[**BorderStyle**](#borderstyle) chooses between no border (default) and a single sunken border drawn around the rectangle. When a border is present, [**Appearance**](#appearance) selects between a 3-D and a flat (monochrome) version of it.

## OLE drag-drop

A **QRCode** supports both ends of an OLE drag-drop operation:

- [**OLEDragMode**](#oledragmode) controls the source side. With **vbOLEDragAutomatic**, holding the mouse over the control and beginning a drag automatically picks up the current [**Picture**](#picture) into the resulting **DataObject** — handy for dragging the generated QR onto another picture display or out to a file in Explorer. With **vbOLEDragManual** (default) drags must be initiated by calling [**OLEDrag**](#oledrag) from a [**MouseDown**](#mousedown) handler.
- [**OLEDropMode**](#oledropmode) controls the destination side. With **vbOLEDropManual** the [**OLEDragOver**](#oledragover) and [**OLEDragDrop**](#oledragdrop) events fire so the application can decide what to do — for example, set [**Payload**](#payload) to the dropped text. **vbOLEDropAutomatic** is not supported on a **QRCode** and assigning it raises run-time error 5 (*Invalid procedure call or argument*).

## Data binding

Setting [**DataSource**](#datasource) and [**DataField**](#datafield) connects the control to a field of a [**Data**](../Data) control's recordset. Binding is asymmetric:

- *Inbound* (recordset → control): non-null, non-empty field values are interpreted as text and assigned to [**Payload**](#payload); the QR is then re-encoded and repainted. Null and empty values clear [**Picture**](#picture) to **Nothing**.
- *Outbound* (control → recordset): the current QR [**Picture**](#picture) is serialised as a byte array and written back to the bound field — useful for storing a snapshot of the rendered code, but note that what comes out of the binding is not the same as what went in.

## Properties

### Anchors
{: .no_toc }

The set of edges of the parent that the control's corresponding edges follow when the parent resizes. Read-only — assign individual `.Left`, `.Top`, `.Right`, `.Bottom` flags through the returned **Anchors** object.

### Appearance
{: .no_toc }

The style of the border, as a member of [**AppearanceConstants**](../../VBRUN/Constants/AppearanceConstants): **vbAppearFlat** or **vbAppear3d** (default). Only meaningful when [**BorderStyle**](#borderstyle) is **vbFixedSingleBorder**.

### BorderStyle
{: .no_toc }

The style of border drawn around the rectangle. A member of [**ControlBorderStyleConstants**](../../VBRUN/Constants/ControlBorderStyleConstants): **vbNoBorder** (0, default) or **vbFixedSingleBorder** (1).

### Container
{: .no_toc }

The control that hosts this **QRCode** — typically the form, a [**Frame**](../Frame), a [**PictureBox**](../PictureBox), or a **UserControl**. Read with **Get**, change with **Set**.

### ControlType
{: .no_toc }

A read-only [**ControlTypeConstants**](../../VBRUN/Constants/ControlTypeConstants) value identifying the underlying control kind. Always **vbImage** — the QRCode shares its control-type tag with [**Image**](../Image).

### DataChanged
{: .no_toc }

Whether the bound [**Picture**](#picture) has been written to since the last save or refresh from the [**DataSource**](#datasource). **Boolean**. Setting **DataChanged** = **True** also marks the bound recordset as dirty.

### DataField
{: .no_toc }

The name of the field, in the recordset of the bound [**DataSource**](#datasource), whose value drives [**Payload**](#payload). **String**.

### DataFormat
{: .no_toc }

A **StdDataFormat** that converts between the raw recordset value and the displayed payload, when the application needs custom handling. Set with **Set**.

### DataMember
{: .no_toc }

When the [**DataSource**](#datasource) exposes more than one recordset, the name of the member to bind to. **String**.

### DataSource
{: .no_toc }

A reference to a [**Data**](../Data) control (or other **DataSource** provider) whose recordset supplies the value for [**DataField**](#datafield). Set with **Set**.

### Dock
{: .no_toc }

Where the control is docked within its container. A member of [**DockModeConstants**](../../VBRUN/Constants/DockModeConstants): **vbDockNone** (default), **vbDockLeft**, **vbDockTop**, **vbDockRight**, **vbDockBottom**, or **vbDockFill**. Docked controls ignore [**Anchors**](#anchors).

### DragIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor while the control is being drag-and-dropped (see [**Drag**](#drag) and [**DragMode**](#dragmode)).

### DragMode
{: .no_toc }

Whether the control should drag itself (the manual VB-drag form, distinct from OLE drag) when the user holds the mouse over it. A member of [**DragModeConstants**](../../VBRUN/Constants/DragModeConstants): **vbManual** (0, default — call [**Drag**](#drag) from code) or **vbAutomatic** (1).

### EccBoost
{: .no_toc }

When **True** (default), the encoder is allowed to raise the actual parity level above [**EccMode**](#eccmode) when the payload still fits the same QR version at the higher level. **Boolean**. Set to **False** for reproducible output across payloads of varying length.

### EccMode
{: .no_toc }

The minimum error-correction level used when encoding. A member of **QRCodegenEccConstants** (defined in the VB package):

| Constant                   | Value | Approx. recovery |
|----------------------------|-------|------------------|
| **vbQRCodegenEccLow**      | 0     | 7%               |
| **vbQRCodegenEccMedium**   | 1     | 15%              |
| **vbQRCodegenEccQuartile** | 2     | 25%              |
| **vbQRCodegenEccHigh**     | 3     | 30%              |

Default **vbQRCodegenEccLow**. Out-of-range values are clamped.

### Enabled
{: .no_toc }

Determines whether the control accepts mouse input. A disabled **QRCode** still paints normally but does not raise mouse events. **Boolean**, default **True**.

### ForeColor
{: .no_toc }

The colour of the dark modules in the generated QR code, as an **OLE_COLOR**. Default **vbBlack**. The light modules are always transparent — the control's parent shows through them, so place the **QRCode** over a contrasting background.

### Height
{: .no_toc }

The control's height, in twips by default (or in the container's **ScaleMode** units). **Double**.

### Index
{: .no_toc }

When the control is part of a control array, the **Long** zero-based index of this instance within the array. Reading **Index** on a non-array instance raises run-time error 343 (*Object not an array*). Read-only at run time.

### Left
{: .no_toc }

The horizontal distance from the left edge of the container to the left edge of the control. **Double**.

### MaskType
{: .no_toc }

The mask applied to the encoded matrix to break up patterns that confuse the scanner. A member of **QRCodegenMaskConstants** (defined in the VB package): **vbQRCodegenMaskAuto** (-1, default — pick the mask with the lowest penalty score) or one of **vbQRCodegenMask0** … **vbQRCodegenMask7** (force the corresponding numbered mask). Out-of-range values fall back to **vbQRCodegenMaskAuto**.

### MaxVersion
{: .no_toc }

The largest QR version the encoder is allowed to choose. **Long**, default `40`. Clamped to `1..40`. If [**MinVersion**](#minversion) exceeds **MaxVersion** at encode time, **MinVersion** is reset to `1`.

### MinVersion
{: .no_toc }

The smallest QR version the encoder is allowed to choose. **Long**, default `1`. The encoder picks the smallest version in `MinVersion..MaxVersion` that fits the payload at the requested [**EccMode**](#eccmode). Clamped to `1..40`.

### ModuleSize
{: .no_toc }

The pixel size of one QR module in the generated [**Picture**](#picture). **Long**, default `120`. The picture is scaled to the control's rectangle at paint time, so a larger **ModuleSize** only matters when the picture is being captured or saved at its native resolution.

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

Whether an OLE drag is started automatically when the user begins dragging the control. A member of [**OLEDragConstants**](../../VBRUN/Constants/OLEDragConstants): **vbOLEDragManual** (0, default — application calls [**OLEDrag**](#oledrag)) or **vbOLEDragAutomatic** (1 — the framework picks up the current [**Picture**](#picture) into the resulting **DataObject** automatically).

### OLEDropMode
{: .no_toc }

How the control responds to OLE drops landing on it. A restricted member of [**OLEDropConstants**](../../VBRUN/Constants/OLEDropConstants): **vbOLEDropNone** (0, default) or **vbOLEDropManual** (1). Automatic drop is not supported on a **QRCode**; assigning **vbOLEDropAutomatic** raises run-time error 5 (*Invalid procedure call or argument*).

### Parent
{: .no_toc }

A reference to the [**Form**](../Form) (or **UserControl**) that ultimately contains the control. Read-only.

### Payload
{: .no_toc }

The data encoded in the QR code. **Variant**, default `"https://www.twinbasic.com"`.

Syntax: *object*.**Payload** [ = *value* ]

Accepts a **String** for text or URL payloads, or a one-dimensional **Byte()** array for arbitrary binary data. The encoder picks the most compact segment mode automatically — numeric, alphanumeric, or byte — based on the contents of the string. Assigning an empty value clears [**Picture**](#picture) to **Nothing**.

### Picture
{: .no_toc }

The generated QR code, as a **StdPicture**. **Default property.** Read-only — produced by the encoder from [**Payload**](#payload) and the other encoding properties. Returns **Nothing** when [**Payload**](#payload) is empty.

### Square
{: .no_toc }

Whether the generated picture is rendered with a 1:1 aspect ratio inside the control's rectangle (**True**, default — picture is centred and letter-boxed) or stretched to fill it (**False**). **Boolean**.

### SquareModules
{: .no_toc }

Whether each module of the encoded matrix is drawn in the picture as a filled square (**True**, default) or as a filled circle (**False**). **Boolean**.

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

Whether the control is shown. **Boolean**, default **True**. Hidden **QRCode**s skip the paint pass entirely at run time, except in the IDE designer where they always render so the developer can position them.

### WhatsThisHelpID
{: .no_toc }

A **Long** identifying a "What's This?" help-pop-up topic in the application's help file. See [**ShowWhatsThis**](#showwhatsthis).

### Width
{: .no_toc }

The control's width, in twips by default (or in the container's **ScaleMode** units). **Double**.

## Methods

### Drag
{: .no_toc }

Begins, completes, or cancels a manual VB-style drag operation. Distinct from OLE drag — see [**OLEDrag**](#oledrag).

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

Initiates an OLE drag operation from the control, raising the [**OLEStartDrag**](#olestartdrag) event so the application can populate the **DataObject** (or, if the source has already been pre-populated, kicks off the drag immediately).

Syntax: *object*.**OLEDrag**

### Refresh
{: .no_toc }

Forces an immediate repaint of the control's rectangle on the parent's drawing surface. Does *not* re-encode the QR — for that, reassign [**Payload**](#payload) (or any of the encoding properties) which triggers regeneration automatically.

Syntax: *object*.**Refresh**

### ShowWhatsThis
{: .no_toc }

Displays the topic identified by [**WhatsThisHelpID**](#whatsthishelpid) as a "What's This?" pop-up.

Syntax: *object*.**ShowWhatsThis**

### ZOrder
{: .no_toc }

Brings the **QRCode** to the front or back of the windowless-sibling stack within its container.

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

Raised once, after the control has been wired into its container's paint cycle but before it is first painted. Useful for last-minute setup that depends on container state.

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

Raised on the source control at the start of an OLE drag, so the application can populate the **DataObject** and choose the allowed effects. Also raised automatically when [**OLEDragMode**](#oledragmode) is **vbOLEDragAutomatic** and the user begins a drag.

Syntax: *object*\_**OLEStartDrag**( *Data* **As DataObject**, *AllowedEffects* **As Long** )
