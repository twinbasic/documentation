---
title: CheckBox
parent: VB Package
permalink: /tB/Packages/VB/CheckBox/
has_toc: false
---

# CheckBox class
{: .no_toc }

A **CheckBox** is a Win32 native control that displays a small box, optionally followed by a text caption, used to give the user a choice between two values such as *Yes*/*No*, *True*/*False*, or *On*/*Off*. It can also be put into a third, indeterminate (grey) state from code, typically to mean "not applicable" or "mixed".

The control is normally placed on a **Form** or **UserControl** at design time. The default property is [**Value**](#value) and the default event is [**Click**](#click).

```tb
Private Sub Form_Load()
    Check1.Caption = "I &agree to the terms"
    Check1.Value = vbUnchecked
End Sub

Private Sub Check1_Click()
    cmdContinue.Enabled = (Check1.Value = vbChecked)
End Sub
```

* TOC
{:toc}

## Three-state behaviour

[**Value**](#value) is typed as [**CheckBoxConstants**](../../VBRUN/Constants/CheckBoxConstants):

| Constant         | Value | Meaning                                                |
|------------------|-------|--------------------------------------------------------|
| **vbUnchecked**  | 0     | The check box is cleared.                              |
| **vbChecked**    | 1     | The check box is selected.                             |
| **vbGrayed**     | 2     | The check box is in an indeterminate (grey) state.     |

Clicking an unchecked or grey check box selects it; clicking a checked or grey check box clears it. The grey state is reachable only from code — assign **vbGrayed** to **Value** to display it. Assigning a negative number raises run-time error 380 (*Invalid property value*).

```tb
Check1.Value = vbGrayed     ' show the indeterminate state
```

## Caption and mnemonics

The text shown next to (or, with [**Alignment**](#alignment) `tbRightJustify`, before) the box comes from [**Caption**](#caption). An ampersand in the caption marks the next character as a keyboard mnemonic: pressing **Alt+** that character moves the focus to the check box and toggles its value. Use `&&` to display a literal ampersand.

```tb
Check1.Caption = "Use && in folder names"   ' renders as: Use & in folder names
```

## Graphical style

When [**Style**](#style) is **vbButtonGraphical**, the check box is owner-drawn and displays the bitmaps assigned to [**Picture**](#picture), [**DownPicture**](#downpicture), and [**DisabledPicture**](#disabledpicture) instead of the standard square. [**PictureAlignment**](#picturealignment), [**Padding**](#padding), and [**PictureDpiScaling**](#picturedpiscaling) control how the picture is positioned relative to the caption.

## Data binding

Setting [**DataSource**](#datasource) and [**DataField**](#datafield) connects the control's [**Value**](#value) to a field of a **Data** control's recordset. The bound field is read as a **Boolean**: a non-zero/`True` value sets [**Value**](#value) to **vbChecked**, zero/`False` sets it to **vbUnchecked**. Assigning a non-Boolean field value raises run-time error 13 (*Type mismatch*).

## Properties

### Alignment
{: .no_toc }

Specifies the side of the box on which the [**Caption**](#caption) text appears.

Syntax: *object*.**Alignment** [ = *value* ]

*value*
: A member of [**AlignmentConstantsNoCenter**](../../VBRUN/Constants/AlignmentConstantsNoCenter): **tbLeftJustify** (0, default — caption to the right of the box) or **tbRightJustify** (1 — caption to the left of the box).

### Appearance
{: .no_toc }

Determines how the control's border is drawn by the OS. A member of [**AppearanceConstants**](../../VBRUN/Constants/AppearanceConstants): **vbAppearFlat** or **vbAppear3d** (default).

### BackColor
{: .no_toc }

The background colour, as an **OLE_COLOR**. Defaults to the system 3-D face colour.

### Caption
{: .no_toc }

The text displayed next to the check box. An ampersand marks the next character as a mnemonic; `&&` produces a literal ampersand. The string is read directly from the underlying window — assigning to **Caption** is reflected immediately.

Syntax: *object*.**Caption** [ = *string* ]

### CausesValidation
{: .no_toc }

Determines whether the previously focused control's [**Validate**](#validate) event runs before this control receives the focus. **Boolean**, default **True**.

### ControlType
{: .no_toc }

A read-only [**ControlTypeConstants**](../../VBRUN/Constants/ControlTypeConstants) value identifying this control as a check box. Always **vbCheckBox**.

### DataField
{: .no_toc }

The name of the field, in the recordset of the bound [**DataSource**](#datasource), whose value is mirrored by [**Value**](#value). **String**.

### DataSource
{: .no_toc }

A reference to a **Data** control (or other **DataSource** provider) whose recordset supplies the value for [**DataField**](#datafield). Set with **Set**.

### DisabledPicture
{: .no_toc }

A **StdPicture** drawn instead of [**Picture**](#picture) when the control is disabled and [**Style**](#style) is **vbButtonGraphical**.

### DownPicture
{: .no_toc }

A **StdPicture** drawn instead of [**Picture**](#picture) while the control is in the depressed state, when [**Style**](#style) is **vbButtonGraphical**.

### DragIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor while the control is being drag-and-dropped (see [**Drag**](#drag) and [**DragMode**](#dragmode)).

### DragMode
{: .no_toc }

Whether the control should drag itself when the user holds the mouse over it. A member of [**DragModeConstants**](../../VBRUN/Constants/DragModeConstants): **vbManual** (0, default — call [**Drag**](#drag) from code) or **vbAutomatic** (1).

### Enabled
{: .no_toc }

Determines whether the control accepts user input. A disabled check box shows its current value but is dimmed and ignores keyboard and mouse interaction. **Boolean**, default **True**.

### Font
{: .no_toc }

The **StdFont** used to render [**Caption**](#caption). The convenience properties **FontName**, **FontSize**, **FontBold**, **FontItalic**, **FontStrikethru**, and **FontUnderline** read or write the corresponding members of this object.

### ForeColor
{: .no_toc }

The text colour for the caption, as an **OLE_COLOR**. Defaults to the system button-text colour.

### Height
{: .no_toc }

The control's height, in twips by default (or in the container's **ScaleMode** units). **Single**.

### HelpContextID
{: .no_toc }

A **Long** identifying a topic in the application's help file, retrieved when the user presses **F1** while the control has focus.

### hWnd
{: .no_toc }

The Win32 window handle for the underlying button, as a **LongPtr**. Read-only. Useful for passing to API functions.

### Index
{: .no_toc }

When the control is part of a control array, the **Long** zero-based index of this instance within the array. Read-only at run time.

### Left
{: .no_toc }

The horizontal distance from the left edge of the container to the left edge of the control. **Single**.

### MaskColor
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

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

How the control responds to OLE drops. A restricted member of [**OLEDropConstants**](../../VBRUN/Constants/OLEDropConstants): **vbOLEDropNone** or **vbOLEDropManual**. Automatic-drop mode is not supported on a CheckBox.

### Opacity
{: .no_toc }

The control's opacity as a percentage (0–100, default 100). Values outside the range are clamped on **Initialize**. Requires Windows 8 or later for child controls.

### Padding
{: .no_toc }

The number of pixels of empty space inserted between the picture and the caption (when [**PictureAlignment**](#picturealignment) is **vbAlignLeft** or **vbAlignRight**) or between the caption and the corresponding edge (when **vbAlignTop** or **vbAlignBottom**). **Long**, default 2. Only meaningful when [**Style**](#style) is **vbButtonGraphical**.

### Parent
{: .no_toc }

A reference to the [**Form**](../Form) (or **UserControl**) that contains this control. Read-only.

### Picture
{: .no_toc }

A **StdPicture** drawn on the control when [**Style**](#style) is **vbButtonGraphical**. Assigning **Nothing** restores an empty picture rather than removing the bitmap surface.

### PictureAlignment
{: .no_toc }

How [**Picture**](#picture) is positioned relative to the caption when [**Style**](#style) is **vbButtonGraphical**. A member of [**AlignConstants**](../../VBRUN/Constants/AlignConstants): **vbAlignNone**, **vbAlignTop** (default), **vbAlignBottom**, **vbAlignLeft**, **vbAlignRight**.

### PictureDpiScaling
{: .no_toc }

When **True**, scales [**Picture**](#picture), [**DownPicture**](#downpicture), and [**DisabledPicture**](#disabledpicture) by the current DPI factor before drawing. **Boolean**, default **False**.

### RightToLeft
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC. Use [**Alignment**](#alignment) to flip the caption to the left of the box.

### Style
{: .no_toc }

Selects between the standard Win32 check-box appearance and an owner-drawn graphical button. A member of [**ButtonConstants**](../../VBRUN/Constants/ButtonConstants): **vbButtonStandard** (0, default) or **vbButtonGraphical** (1). Changing **Style** at run time recreates the underlying window.

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

### UseMaskColor
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### Value
{: .no_toc }

The current state of the check box. **Default property.**

Syntax: *object*.**Value** [ = *value* ]

*value*
: A member of [**CheckBoxConstants**](../../VBRUN/Constants/CheckBoxConstants): **vbUnchecked** (0), **vbChecked** (1), or **vbGrayed** (2). Negative numbers raise run-time error 380.

Assigning a value that differs from the current one raises a [**Click**](#click) event.

### Visible
{: .no_toc }

Whether the control is shown. **Boolean**, default **True**.

### VisualStyles
{: .no_toc }

Whether the OS theme engine should be used when drawing the control. **Boolean**.

### WhatsThisHelpID
{: .no_toc }

A **Long** identifying a "What's This?" help-pop-up topic in the application's help file. See [**ShowWhatsThis**](#showwhatsthis).

### Width
{: .no_toc }

The control's width. **Single**.

## Methods

### Drag
{: .no_toc }

Begins, completes, or cancels a manual drag-and-drop operation. Typically called from a [**MouseDown**](#mousedown) handler when [**DragMode**](#dragmode) is **vbManual**.

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

Initiates an OLE drag operation from the control, raising the [**OLEStartDrag**](#olestartdrag) event so the application can populate the **DataObject**.

Syntax: *object*.**OLEDrag**

### Refresh
{: .no_toc }

Forces an immediate repaint of the control.

Syntax: *object*.**Refresh**

### SetFocus
{: .no_toc }

Moves the input focus to the control. The control must be both [**Visible**](#visible) and [**Enabled**](#enabled), or run-time error 5 (*Invalid procedure call or argument*) is raised.

Syntax: *object*.**SetFocus**

### ShowWhatsThis
{: .no_toc }

Displays the topic identified by [**WhatsThisHelpID**](#whatsthishelpid) as a "What's This?" pop-up.

Syntax: *object*.**ShowWhatsThis**

### ZOrder
{: .no_toc }

Brings the control to the front or back of its sibling stack.

Syntax: *object*.**ZOrder** [ *Position* ]

*Position*
: *optional* A member of [**ZOrderConstants**](../../VBRUN/Constants/ZOrderConstants): **vbBringToFront** (0, default) or **vbSendToBack** (1).

## Events

### Click
{: .no_toc }

Raised after [**Value**](#value) changes — whether the user clicked the box, pressed the access key, or assigned a different value in code. **Default event.**

Syntax: *object*\_**Click**( )

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

### Validate
{: .no_toc }

Raised when the focus is moving to another control whose [**CausesValidation**](#causesvalidation) is **True**. Setting *Cancel* to **True** keeps the focus on this control.

Syntax: *object*\_**Validate**( *Cancel* **As Boolean** )

{% include VBA-Attribution.md %}
