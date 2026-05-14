---
title: Label
parent: VB Package
permalink: /tB/Packages/VB/Label/
has_toc: false
---

# Label class
{: .no_toc }

A **Label** is a windowless lightweight control for displaying read-only text. Labels are typically used as static captions next to input controls ("Name:", "Email:"), as status displays that code keeps up to date, or as keyboard-mnemonic anchors that route **Alt+** keystrokes to the next focusable control. Because the **Label** has no `hWnd` of its own, it is much cheaper than a [**TextBox**](../TextBox) configured to be read-only — but it is also non-interactive in the keyboard sense: it cannot take focus, raise key events, or be selected with the **TAB** key.

The default property is [**Caption**](#caption) and the default event is [**Click**](#click).

```tb
Private Sub Form_Load()
    lblName.Caption  = "&Name:"            ' Alt+N forwards focus to the next control
    lblName.AutoSize = True
    txtName.Text     = ""                  ' the TextBox that receives Alt+N
End Sub

Private Sub Timer1_Timer()
    lblClock.Caption = Format$(Now, "hh:mm:ss")
End Sub
```

* TOC
{:toc}

## Windowless rendering

Like [**Image**](../Image/), a **Label** has no `hWnd`. The framework paints it directly onto its parent's drawing surface during the parent's paint cycle. The trade-offs are the same:

- No focus, no keyboard input, no `KeyDown` / `KeyPress` / `KeyUp` / `GotFocus` / `LostFocus` / `Validate`.
- No `hWnd` to pass to API functions, and no `SetFocus`.
- Cannot host child controls.

For text the user can edit (or that needs to take focus), use [**TextBox**](../TextBox) with `Locked = True` instead.

## Mnemonics and access keys

Labels do not take focus themselves, but they participate in keyboard-mnemonic routing. With [**UseMnemonic**](#usemnemonic) **True** (the default), an ampersand in [**Caption**](#caption) marks the next character as a mnemonic — pressing **Alt+** that character moves the focus to the *next focusable control in tab order* after the label. Use `&&` to display a literal ampersand. Set [**UseMnemonic**](#usemnemonic) to **False** to disable the special handling and have ampersands rendered verbatim.

```tb
lblName.Caption = "&Name:"           ' Alt+N → next control (typically txtName)
lblHelp.Caption = "Use && to escape" ' renders as: Use & to escape
```

The convention is to place the **Label** immediately before the control it captions in tab order, so the mnemonic naturally targets that control.

## Caption layout

[**Alignment**](#alignment) and [**VerticalAlignment**](#verticalalignment) together position the caption within the label's rectangle:

| Property                                 | Members                                                                                                          |
|------------------------------------------|------------------------------------------------------------------------------------------------------------------|
| [**Alignment**](#alignment)              | **vbLeftJustify** (0, default), **vbRightJustify** (1), **vbCenter** (2)                                         |
| [**VerticalAlignment**](#verticalalignment) | **vbVerticalAlignTop** (0, default), **vbVerticalAlignMiddle** (1), **vbVerticalAlignBottom** (2)            |

[**WordWrap**](#wordwrap), when **True**, breaks the caption into multiple lines at white-space whenever it would otherwise exceed [**Width**](#width). [**LineSpacing**](#linespacing) inserts extra vertical gap (in twips) between lines.

[**AutoSize**](#autosize), when **True**, resizes the label to fit its caption every time the caption, font, border, or word-wrap setting changes. Auto-sizing measures the current font in the parent's device context, so it produces correct results on high-DPI displays. When **AutoSize** is **False**, the caption is clipped to the label's rectangle (still respecting [**WordWrap**](#wordwrap) and the alignment settings).

## Rotation

[**Angle**](#angle) rotates the rendered caption, in degrees, anti-clockwise around the top-left of the control's rectangle. `0` is the natural orientation, `90` is a quarter-turn anti-clockwise, and so on. The control's bounding rectangle does not change — large rotation angles can therefore push the visible text outside the rectangle. Hit-testing for [**Click**](#click) and the mouse events still uses the unrotated rectangle.

## Border styles

[**BorderStyle**](#borderstyle) chooses between three styles:

| Constant                  | Value | Description                                                                                |
|---------------------------|-------|--------------------------------------------------------------------------------------------|
| **vbNoBorder**            | 0     | No border (default).                                                                       |
| **vbFixedSingleBorder**   | 1     | A sunken Win32-style border. [**Appearance**](#appearance) selects 3-D or flat.            |
| **vbCustomBorder**        | 2     | Per-edge custom border configured through [**BorderCustomOptions**](#bordercustomoptions). |

With **vbCustomBorder**, [**BorderCustomOptions**](#bordercustomoptions) returns an object whose `.Left`, `.Top`, `.Right`, and `.Bottom` properties each have independent **Size** (line thickness, in twips), **Padding** (inset between the border and the caption, in twips), and **Color** values:

```tb
lblBox.BorderStyle = vbCustomBorder
With lblBox.BorderCustomOptions
    .Top.Size = 30 :  .Top.Color = vbRed :   .Top.Padding = 60
    .Bottom.Size = 30 : .Bottom.Color = vbRed : .Bottom.Padding = 60
End With
```

## Background

[**BackStyle**](#backstyle) chooses between **vbBFOpaque** (default — paint [**BackColor**](#backcolor) under the caption) and **vbBFTransparent** (don't paint a background — whatever the parent has drawn shows through). Transparent labels are essential when overlaying captions on a [**PictureBox**](../PictureBox), an [**Image**](../Image/), or a custom-painted form background. New labels created in *report mode* default to **vbBFTransparent**.

## Data binding

Setting [**DataSource**](#datasource) and [**DataField**](#datafield) connects [**Caption**](#caption) to a field of a [**Data**](../Data/) control's recordset. The bound field is read as a string on each move, and assigning to [**Caption**](#caption) marks the recordset as dirty. [**DataFieldAggregate**](#datafieldaggregate) and [**DataFieldAggregateValue**](#datafieldaggregatevalue) are used by the report engine to display running totals.

## Properties

### Alignment
{: .no_toc }

The horizontal placement of [**Caption**](#caption) within the label's rectangle. A member of [**AlignmentConstants**](../../VBRUN/Constants/AlignmentConstants): **vbLeftJustify** (0, default), **vbRightJustify** (1), or **vbCenter** (2).

### Anchors
{: .no_toc }

The set of edges of the parent that the label's corresponding edges follow when the parent resizes. Read-only — assign individual `.Left`, `.Top`, `.Right`, `.Bottom` flags through the returned **Anchors** object.

### Angle
{: .no_toc }

The rotation of the rendered caption, in degrees, anti-clockwise around the top-left of the control's rectangle. **Double**, default `0`.

### Appearance
{: .no_toc }

The style of the border, as a member of [**AppearanceConstants**](../../VBRUN/Constants/AppearanceConstants): **vbAppearFlat** or **vbAppear3d** (default). Only meaningful when [**BorderStyle**](#borderstyle) is **vbFixedSingleBorder**.

### AutoSize
{: .no_toc }

Whether the label resizes itself to fit its [**Caption**](#caption), [**Font**](#font), border, and word-wrap settings. **Boolean**, default **False**. When **True**, the resize happens whenever any of those inputs change.

### BackColor
{: .no_toc }

The colour painted behind the caption when [**BackStyle**](#backstyle) is **vbBFOpaque**. **OLE_COLOR**, defaults to the system 3-D face colour.

### BackStyle
{: .no_toc }

Whether the label paints a background. A member of [**BackFillStyleConstants**](../../VBRUN/Constants/BackFillStyleConstants): **vbBFOpaque** (1, default — paint [**BackColor**](#backcolor)) or **vbBFTransparent** (0 — let whatever the parent has drawn show through).

### BorderCustomOptions
{: .no_toc }

Per-edge configuration for the **vbCustomBorder** style. Read-only; the returned object exposes `.Left`, `.Top`, `.Right`, `.Bottom` sub-objects, each with `Size`, `Padding`, and `Color` properties. See [Border styles](#border-styles).

### BorderStyle
{: .no_toc }

The style of border drawn around the label. A member of [**ControlBorderStyleConstantsCustom**](../../VBRUN/Constants/ControlBorderStyleConstantsCustom): **vbNoBorder** (0, default), **vbFixedSingleBorder** (1), or **vbCustomBorder** (2). See [Border styles](#border-styles).

### Caption
{: .no_toc }

The text rendered by the label. **String**. **Default property.**

Syntax: *object*.**Caption** [ = *string* ]

An ampersand marks the next character as a mnemonic when [**UseMnemonic**](#usemnemonic) is **True**; `&&` produces a literal ampersand. Assigning a value that differs from the current one raises a [**Change**](#change) event; assigning the current value is a silent no-op.

### Container
{: .no_toc }

The control that hosts this label — typically the form, a [**Frame**](../Frame/), or a **UserControl**. Read with **Get**, change with **Set**.

### ControlType
{: .no_toc }

A read-only [**ControlTypeConstants**](../../VBRUN/Constants/ControlTypeConstants) value identifying this control as a label. Always **vbLabel**.

### DataChanged
{: .no_toc }

Whether the bound [**Caption**](#caption) has been written to since the last save or refresh from the [**DataSource**](#datasource). **Boolean**. Setting **DataChanged** = **True** also marks the bound recordset as dirty.

### DataField
{: .no_toc }

The name of the field, in the recordset of the bound [**DataSource**](#datasource), whose value is mirrored by [**Caption**](#caption). **String**.

### DataFieldAggregate
{: .no_toc }

The kind of running aggregate the report engine should accumulate into [**DataFieldAggregateValue**](#datafieldaggregatevalue). A member of `Label.AggregateConstants`:

| Constant            | Value | Description                                                          |
|---------------------|-------|----------------------------------------------------------------------|
| **vbAggregateNone** | 0     | No aggregation (default).                                            |
| **vbAggregateSum**  | 1     | Sum the bound numeric value across the rows visited by the report.   |

Used only when the label is rendered inside a [**Report**](../Report) section.

### DataFieldAggregateValue
{: .no_toc }

The accumulated aggregate value computed by the report engine, exposed as a **Decimal**. Updated by the engine while a report is being generated; user code can read it from event handlers but does not normally write to it.

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

Where the label is docked within its container. A member of [**DockModeConstants**](../../VBRUN/Constants/DockModeConstants): **vbDockNone** (default), **vbDockLeft**, **vbDockTop**, **vbDockRight**, **vbDockBottom**, or **vbDockFill**. Docked labels ignore [**Anchors**](#anchors).

### DragIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor while the control is being drag-and-dropped (see [**Drag**](#drag) and [**DragMode**](#dragmode)).

### DragMode
{: .no_toc }

Whether the control should drag itself when the user holds the mouse over it. A member of [**DragModeConstants**](../../VBRUN/Constants/DragModeConstants): **vbManual** (0, default — call [**Drag**](#drag) from code) or **vbAutomatic** (1).

### Enabled
{: .no_toc }

Whether the label accepts mouse input and renders [**Caption**](#caption) in the normal text colour. A disabled label still paints, but in the system grey-text colour, and ignores mouse events. **Boolean**, default **True**.

### Font
{: .no_toc }

The **StdFont** used to render [**Caption**](#caption). The convenience properties **FontBold**, **FontItalic**, **FontName**, **FontSize**, **FontStrikethru**, and **FontUnderline** read or write the corresponding members of this object. Defaults to Segoe UI, 8 pt.

### FontBold
{: .no_toc }

Shortcut for `Font.Bold`. **Boolean**.

### FontItalic
{: .no_toc }

Shortcut for `Font.Italic`. **Boolean**.

### FontName
{: .no_toc }

Shortcut for `Font.Name`. **String**, default `"Segoe UI"`.

### FontSize
{: .no_toc }

Shortcut for `Font.Size`. **Single**, in points. Default `8`.

### FontStrikethru
{: .no_toc }

Shortcut for `Font.Strikethrough`. **Boolean**.

### FontUnderline
{: .no_toc }

Shortcut for `Font.Underline`. **Boolean**.

### ForeColor
{: .no_toc }

The text colour for [**Caption**](#caption), as an **OLE_COLOR**. Defaults to the system button-text colour. Replaced with the system grey-text colour when [**Enabled**](#enabled) is **False**.

### Height
{: .no_toc }

The control's height, in twips by default (or in the container's **ScaleMode** units). **Double**. Computed automatically while [**AutoSize**](#autosize) is **True**.

### Index
{: .no_toc }

When the label is part of a control array, the **Long** zero-based index of this instance within the array. Reading **Index** on a non-array instance raises run-time error 343 (*Object not an array*). Read-only at run time.

### Left
{: .no_toc }

The horizontal distance from the left edge of the container to the left edge of the label. **Double**.

### LineSpacing
{: .no_toc }

Extra vertical space inserted between lines of a wrapped or multi-line caption, in twips. **Long**, default `0`.

### LinkItem
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6's DDE feature; not currently implemented in twinBASIC.

### LinkMode
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6's DDE feature; not currently implemented in twinBASIC.

### LinkTimeout
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6's DDE feature; not currently implemented in twinBASIC.

### LinkTopic
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6's DDE feature; not currently implemented in twinBASIC.

### MouseIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor when [**MousePointer**](#mousepointer) is **vbCustom** and the pointer is over the control.

### MousePointer
{: .no_toc }

The mouse cursor shown when the pointer is over the control. A member of [**MousePointerConstants**](../../VBRUN/Constants/MousePointerConstants).

### Name
{: .no_toc }

The unique design-time name of the control on its parent form. Read-only at run time.

### OLEDropMode
{: .no_toc }

How the label responds to OLE drops. A restricted member of [**OLEDropConstants**](../../VBRUN/Constants/OLEDropConstants): **vbOLEDropNone** (0, default) or **vbOLEDropManual** (1). Automatic drop is not supported on a Label; assigning **vbOLEDropAutomatic** raises run-time error 5 (*Invalid procedure call or argument*).

### Parent
{: .no_toc }

A reference to the [**Form**](../Form/) (or **UserControl**) that ultimately contains the control. Read-only.

### RightToLeft
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC. Use [**Alignment**](#alignment) `vbRightJustify` to right-align the caption.

### TabIndex
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC. The label is non-focusable, so the value would only affect mnemonic-routing — that is currently controlled by the design-time Z-order instead.

### Tag
{: .no_toc }

A free-form **String** the application can use to associate custom data with the control. Ignored by the framework.

### ToolTipText
{: .no_toc }

A multi-line **String** displayed as a tooltip when the user hovers over the label.

### Top
{: .no_toc }

The vertical distance from the top of the container to the top of the label. **Double**.

### UseMnemonic
{: .no_toc }

Whether `&` in [**Caption**](#caption) marks the next character as a keyboard mnemonic. **Boolean**, default **True**. With **False**, ampersands are rendered verbatim.

### VerticalAlignment
{: .no_toc }

The vertical placement of the caption within the label's rectangle. A member of [**VerticalAlignmentConstants**](../../VBRUN/Constants/VerticalAlignmentConstants): **vbVerticalAlignTop** (0, default), **vbVerticalAlignMiddle** (1), or **vbVerticalAlignBottom** (2).

### Visible
{: .no_toc }

Whether the label is shown. **Boolean**, default **True**.

### WhatsThisHelpID
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC. See [**ShowWhatsThis**](#showwhatsthis).

### Width
{: .no_toc }

The control's width, in twips by default (or in the container's **ScaleMode** units). **Double**. Computed automatically while [**AutoSize**](#autosize) is **True**.

### WordWrap
{: .no_toc }

Whether the caption breaks into multiple lines at white-space when it would otherwise exceed [**Width**](#width). **Boolean**, default **False**.

## Methods

### Drag
{: .no_toc }

Begins, completes, or cancels a manual VB-style drag operation. Distinct from OLE drag — see [**OLEDrag**](#oledrag).

Syntax: *object*.**Drag** [ *Action* ]

*Action*
: *optional* A member of [**DragConstants**](../../VBRUN/Constants/DragConstants): **vbCancel** (0), **vbBeginDrag** (1, default), or **vbEndDrag** (2).

### LinkExecute
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6's DDE feature; not currently implemented in twinBASIC.

Syntax: *object*.**LinkExecute** *Command*

### LinkPoke
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6's DDE feature; not currently implemented in twinBASIC.

Syntax: *object*.**LinkPoke**

### LinkRequest
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6's DDE feature; not currently implemented in twinBASIC.

Syntax: *object*.**LinkRequest**

### LinkSend
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6's DDE feature; not currently implemented in twinBASIC.

Syntax: *object*.**LinkSend**

### Move
{: .no_toc }

Repositions and optionally resizes the label in a single call.

Syntax: *object*.**Move** *Left* [, *Top* [, *Width* [, *Height* ] ] ]

*Left*
: *required* A **Single** giving the new horizontal position.

*Top*, *Width*, *Height*
: *optional* New values for the corresponding properties. Omitted values are left unchanged.

### OLEDrag
{: .no_toc }

Initiates an OLE drag operation from the label, raising the [**OLEStartDrag**](#olestartdrag) event so the application can populate the **DataObject**.

Syntax: *object*.**OLEDrag**

### Refresh
{: .no_toc }

Forces an immediate repaint of the label's rectangle on the parent's drawing surface.

Syntax: *object*.**Refresh**

### ShowWhatsThis
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

Syntax: *object*.**ShowWhatsThis**

### ZOrder
{: .no_toc }

Brings the label to the front or back of the windowless-sibling stack within its container.

Syntax: *object*.**ZOrder** [ *Position* ]

*Position*
: *optional* A member of [**ZOrderConstants**](../../VBRUN/Constants/ZOrderConstants): **vbBringToFront** (0, default) or **vbSendToBack** (1).

## Events

### Change
{: .no_toc }

Raised when [**Caption**](#caption) is assigned a value that differs from its current contents.

Syntax: *object*\_**Change**( )

### Click
{: .no_toc }

Raised when the user single-clicks the label's rectangle. **Default event.**

Syntax: *object*\_**Click**( )

### DblClick
{: .no_toc }

Raised when the user double-clicks the label's rectangle.

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

Raised once, after the label has been connected to its container's paint cycle but before it is first painted. Useful for last-minute setup that depends on container state.

Syntax: *object*\_**Initialize**( )

### LinkClose
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6's DDE feature; not currently raised in twinBASIC.

### LinkError
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6's DDE feature; not currently raised in twinBASIC.

### LinkNotify
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6's DDE feature; not currently raised in twinBASIC.

### LinkOpen
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6's DDE feature; not currently raised in twinBASIC.

### MouseDown
{: .no_toc }

Raised when the user presses any mouse button over the label.

Syntax: *object*\_**MouseDown**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseMove
{: .no_toc }

Raised when the cursor moves over the label.

Syntax: *object*\_**MouseMove**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseUp
{: .no_toc }

Raised when the user releases a mouse button over the label.

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
