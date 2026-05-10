---
title: CommandButton
parent: VB Package
permalink: /tB/Packages/VB/CommandButton/
has_toc: false
---

# CommandButton class
{: .no_toc }

A **CommandButton** is a Win32 native push-button control used to trigger an action — a click-handler runs every time the user presses it. The control is normally placed on a **Form** or **UserControl** at design time. The default property is [**Value**](#value) and the default event is [**Click**](#click).

```tb
Private Sub Form_Load()
    cmdOK.Caption = "&OK"
    cmdOK.Default = True        ' Enter triggers it
    cmdCancel.Caption = "Cancel"
    cmdCancel.Cancel = True     ' Esc triggers it
End Sub

Private Sub cmdOK_Click()
    Unload Me
End Sub
```

* TOC
{:toc}

## Triggering a click

A **CommandButton** raises [**Click**](#click) every time the user presses it — by left-clicking, by pressing **Space** or **Enter** while it has focus, by typing the **Alt+** access key marked in the [**Caption**](#caption), by pressing **Esc** when [**Cancel**](#cancel) is **True**, or by pressing **Enter** anywhere on the form when [**Default**](#default) is **True**. Code can fire the same event by assigning **True** to [**Value**](#value):

```tb
cmdOK.Value = True              ' raises cmdOK_Click
```

[**Value**](#value) is reset to **False** immediately after the click handler returns, so reading it almost always returns **False**.

## Cancel and Default

[**Cancel**](#cancel) and [**Default**](#default) are mutually-form-exclusive — at most one button on a form can have either set to **True**. Assigning **True** to **Cancel** or **Default** on one button automatically clears the same property on whatever button held it before. Setting **Default = True** also gives the button the bold "default push-button" border.

## Caption and mnemonics

The text on the button face comes from [**Caption**](#caption). An ampersand in the caption marks the next character as a keyboard mnemonic: pressing **Alt+** that character moves the focus to the button and raises [**Click**](#click) (provided no other control on the form competes for the same access key). Use `&&` to display a literal ampersand.

```tb
cmdSave.Caption = "&Save && Close"   ' renders as: Save & Close
```

## Graphical style

When [**Style**](#style) is **vbButtonGraphical**, the button is owner-drawn and displays the bitmaps assigned to [**Picture**](#picture), [**DownPicture**](#downpicture), and [**DisabledPicture**](#disabledpicture) alongside the caption. [**PictureAlignment**](#picturealignment), [**Padding**](#padding), and [**PictureDpiScaling**](#picturedpiscaling) control how the picture is positioned. Changing **Style** at run time recreates the underlying window.

## Properties

### Appearance
{: .no_toc }

Determines how the control's border is drawn by the OS. A member of [**AppearanceConstants**](../../VBRUN/Constants/AppearanceConstants): **vbAppearFlat** or **vbAppear3d** (default).

### BackColor
{: .no_toc }

The background colour, as an **OLE_COLOR**. Defaults to the system 3-D face colour. Honoured only when [**Style**](#style) is **vbButtonGraphical** — the standard Win32 button always paints with the theme colour.

### Cancel
{: .no_toc }

When **True**, this button is fired by the **Esc** key from anywhere on its form. **Boolean**, default **False**. Only one **CommandButton** on a form can hold this property — assigning **True** to a second button automatically clears it on the previous one.

### Caption
{: .no_toc }

The text displayed on the button. An ampersand marks the next character as a mnemonic; `&&` produces a literal ampersand. The string is read directly from the underlying window — assigning to **Caption** is reflected immediately.

Syntax: *object*.**Caption** [ = *string* ]

### CausesValidation
{: .no_toc }

Determines whether the previously focused control's **Validate** event runs before this control receives the focus. **Boolean**, default **True**. **CommandButton** itself does not raise **Validate**.

### ControlType
{: .no_toc }

A read-only [**ControlTypeConstants**](../../VBRUN/Constants/ControlTypeConstants) value identifying this control as a command button. Always **vbCommandButton**.

### Default
{: .no_toc }

When **True**, this button is fired by the **Enter** key from anywhere on its form (unless another control is currently consuming **Enter**). The button also displays the bold "default push-button" border. **Boolean**, default **False**. Only one **CommandButton** on a form can hold this property — assigning **True** to a second button automatically clears it on the previous one.

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

Determines whether the control accepts user input. A disabled button shows its caption but is dimmed and ignores keyboard and mouse interaction (including its mnemonic and any **Cancel**/**Default** behaviour). **Boolean**, default **True**.

### Font
{: .no_toc }

The **StdFont** used to render [**Caption**](#caption). The convenience properties **FontName**, **FontSize**, **FontBold**, **FontItalic**, **FontStrikethru**, and **FontUnderline** read or write the corresponding members of this object.

### ForeColor
{: .no_toc }

The text colour for the caption, as an **OLE_COLOR**. Defaults to the system button-text colour. Honoured only when [**Style**](#style) is **vbButtonGraphical**.

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

How the control responds to OLE drops. A restricted member of [**OLEDropConstants**](../../VBRUN/Constants/OLEDropConstants): **vbOLEDropNone** or **vbOLEDropManual**. Automatic-drop mode is not supported on a CommandButton.

### Opacity
{: .no_toc }

The control's opacity as a percentage (0–100, default 100). Values outside the range are clamped on **Initialize**. Requires Windows 8 or later for child controls.

### Padding
{: .no_toc }

The number of pixels of empty space inserted between the picture and the caption (when [**PictureAlignment**](#picturealignment) is **vbAlignLeft** or **vbAlignRight**) or between the caption and the corresponding edge (when **vbAlignTop** or **vbAlignBottom**). **Long**, default 2. Only meaningful when [**Style**](#style) is **vbButtonGraphical**.

### Parent
{: .no_toc }

A reference to the **Form** (or **UserControl**) that contains this control. Read-only.

### Picture
{: .no_toc }

A **StdPicture** drawn on the button when [**Style**](#style) is **vbButtonGraphical**. Assigning **Nothing** restores an empty picture rather than removing the bitmap surface.

### PictureAlignment
{: .no_toc }

How [**Picture**](#picture) is positioned relative to the caption when [**Style**](#style) is **vbButtonGraphical**. A member of [**AlignConstants**](../../VBRUN/Constants/AlignConstants): **vbAlignNone**, **vbAlignTop** (default), **vbAlignBottom**, **vbAlignLeft**, **vbAlignRight**.

### PictureDpiScaling
{: .no_toc }

When **True**, scales [**Picture**](#picture), [**DownPicture**](#downpicture), and [**DisabledPicture**](#disabledpicture) by the current DPI factor before drawing. **Boolean**, default **False**.

### RightToLeft
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### Style
{: .no_toc }

Selects between the standard Win32 push-button appearance and an owner-drawn graphical button. A member of [**ButtonConstants**](../../VBRUN/Constants/ButtonConstants): **vbButtonStandard** (0, default) or **vbButtonGraphical** (1). Changing **Style** at run time recreates the underlying window.

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

A trigger for raising [**Click**](#click) from code. **Default property.**

Syntax: *object*.**Value** [ = *boolean* ]

Assigning **True** raises [**Click**](#click) and resets **Value** to **False** immediately after the handler returns; assigning **False** does nothing. Reading **Value** therefore returns **False** in almost every situation.

```tb
cmdOK.Value = True              ' equivalent to a user click
```

### Visible
{: .no_toc }

Whether the control is shown. **Boolean**, default **True**.

### VisualStyles
{: .no_toc }

Whether the OS theme engine should be used when drawing the control. **Boolean**, default **True**.

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

Raised every time the button is pressed — by mouse click, by **Space** or **Enter** while focused, by the **Alt+** access key in the [**Caption**](#caption), by **Esc** when [**Cancel**](#cancel) is **True**, by **Enter** when [**Default**](#default) is **True**, or by an assignment of **True** to [**Value**](#value). **Default event.**

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
