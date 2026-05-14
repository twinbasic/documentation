---
title: TextBox
parent: VB Package
permalink: /tB/Packages/VB/TextBox/
has_toc: false
---

# TextBox class
{: .no_toc }

A **TextBox** is a Win32 native edit control that lets the user enter and edit text. It can be configured as a single-line field (default) or a multi-line editor with optional scroll bars, can mask its content for password entry, restrict input to digits, and display a placeholder "cue banner" when empty.

The control is normally placed on a [**Form**](../Form) or **UserControl** at design time. The default property is [**Text**](#text) and the default-designer event is [**Change**](#change).

```tb
Private Sub Form_Load()
    Text1.MultiLine  = True
    Text1.ScrollBars = vbVertical
    Text1.TextHint   = "Type your message here..."
End Sub

Private Sub Text1_Change()
    lblCount.Caption = Len(Text1.Text) & " characters"
End Sub
```

* TOC
{:toc}

## Single-line and multi-line modes

[**MultiLine**](#multiline) selects between the single-line edit (the default) and a multi-line editor:

- **Single-line.** The control accepts a single row of text. Pressing **Enter** does not insert a newline — it is handled by the form's default button, if any. [**ScrollBars**](#scrollbars) and most line-wrapping settings are ignored.
- **Multi-line.** The control accepts and displays multiple lines, with line wrapping based on the client width. **Enter** inserts a line break inside the control. [**ScrollBars**](#scrollbars) decides whether horizontal, vertical, both, or no scroll bars are shown.

Changing [**MultiLine**](#multiline), [**ScrollBars**](#scrollbars), or [**HideSelection**](#hideselection) at run time recreates the underlying window — the contents, current [**MaxLength**](#maxlength), [**PasswordChar**](#passwordchar), and [**Locked**](#locked) state are preserved across the recreate.

## Password masking

When [**PasswordChar**](#passwordchar) is set to a non-empty string, the first character of that string is displayed in place of each character the user types. Reading [**Text**](#text) still returns the real characters. Setting [**PasswordChar**](#passwordchar) back to an empty string restores normal display.

Password masking is a single-line edit feature — assigning [**PasswordChar**](#passwordchar) while [**MultiLine**](#multiline) is **True** has no visible effect on the displayed text.

```tb
txtPassword.PasswordChar = "•"      ' display a bullet for each character
```

## Cue banner

[**TextHint**](#texthint) sets a placeholder string that appears, in a dimmed colour, while [**Text**](#text) is empty — useful for hinting at the expected content without occupying it. By default the hint is hidden as soon as the control receives the focus; set [**TextHintAlways**](#texthintalways) to **True** to keep it visible even when the empty control has focus (until the user starts typing).

## Selection

[**SelStart**](#selstart), [**SelLength**](#sellength), and [**SelText**](#seltext) read and modify the user's text selection. Reading any of them when no selection is active returns the caret position and an empty [**SelText**](#seltext). Assigning [**SelStart**](#selstart) or [**SelLength**](#sellength) scrolls the caret into view; assigning [**SelText**](#seltext) replaces the current selection with the assigned string and positions the caret immediately after the inserted text.

By default the selection is hidden whenever the control loses focus. Set [**HideSelection**](#hideselection) to **False** to keep the highlight visible even when another control has the focus — useful when the application needs to draw the user's attention to a particular range of text after a search or validation.

## Numbers only

When [**NumbersOnly**](#numbersonly) is **True**, the edit control silently rejects any keystroke that is not a decimal digit. Sign characters, decimal separators, and thousand separators are *not* accepted — the property is a thin wrapper around the OS **ES_NUMBER** style and provides only digit filtering. Use a [**KeyPress**](#keypress) handler if you need more elaborate validation.

## OLE drag-and-drop

[**OLEDragMode**](#oledragmode) controls source-side drags. When set to **vbOLEDragAutomatic**, dragging selected text in the edit area starts an OLE drag whose payload is the selected text; if the destination accepts the drop with **vbDropEffectMove**, the selected range is removed from the box.

[**OLEDropMode**](#oledropmode) controls drop-target behaviour: **vbOLEDropNone** ignores drops, **vbOLEDropManual** raises [**OLEDragOver**](#oledragover) and [**OLEDragDrop**](#oledragdrop) so the application can decide what to do, and **vbOLEDropAutomatic** lets the framework insert dropped text at the caret position without raising those events.

## Data binding

Setting [**DataSource**](#datasource) and [**DataField**](#datafield) connects the control's [**Text**](#text) to a field of a [**Data**](../Data) control's recordset. The bound value is read as a string on each row change (a **Null** field becomes an empty string), and the current [**Text**](#text) is written back when the row is saved. Modifying [**Text**](#text) — either by user input or by code — sets [**DataChanged**](#datachanged) and marks the recordset row as dirty.

## Properties

### Alignment
{: .no_toc }

Horizontal alignment of the text within the control.

Syntax: *object*.**Alignment** [ = *value* ]

*value*
: A member of [**AlignmentConstants**](../../VBRUN/Constants/AlignmentConstants): **vbLeftJustify** (0, default), **vbRightJustify** (1), or **vbCenter** (2). Centred and right-aligned text require [**MultiLine**](#multiline) to be **True** when the platform's edit control does not natively support those alignments in single-line mode; tB supports them in both modes.

### Anchors
{: .no_toc }

The set of edges of the parent that the text box's corresponding edges follow when the parent resizes. Read-only — assign individual `.Left`, `.Top`, `.Right`, `.Bottom` flags through the returned **Anchors** object.

### Appearance
{: .no_toc }

Determines how the control's border is drawn by the OS. A member of [**AppearanceConstants**](../../VBRUN/Constants/AppearanceConstants): **vbAppearFlat** or **vbAppear3d** (default). Only meaningful when [**BorderStyle**](#borderstyle) is **vbFixedSingleBorder** — chooses between a sunken 3-D edge and a thin flat border.

### BackColor
{: .no_toc }

The background colour of the edit area, as an **OLE_COLOR**. Defaults to the system window-background colour.

### BorderStyle
{: .no_toc }

Whether the text box is drawn with a border. A member of [**ControlBorderStyleConstants**](../../VBRUN/Constants/ControlBorderStyleConstants): **vbNoBorder** (0) or **vbFixedSingleBorder** (1, default). The exact appearance of the border depends on [**Appearance**](#appearance).

### CausesValidation
{: .no_toc }

Determines whether the previously focused control's [**Validate**](#validate) event runs before this control receives the focus. **Boolean**, default **True**.

### Container
{: .no_toc }

The control that hosts this text box — typically the form, a [**Frame**](../Frame), or a [**PictureBox**](../PictureBox). Read with **Get**, change with **Set**. Setting **Container** at run time re-parents the text box.

### ControlType
{: .no_toc }

A read-only [**ControlTypeConstants**](../../VBRUN/Constants/ControlTypeConstants) value identifying this control as a text box. Always **vbTextBox**.

### DataChanged
{: .no_toc }

A run-time-only **Boolean** that becomes **True** when [**Text**](#text) has been modified since the last save, and is cleared once the change has been written back to the recordset.

### DataField
{: .no_toc }

The name of the field, in the recordset of the bound [**DataSource**](#datasource), whose value is mirrored by [**Text**](#text). **String**.

### DataFormat
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

A **StdDataFormat** that converts between the raw recordset value and the displayed text.

### DataMember
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

When the [**DataSource**](#datasource) exposes more than one recordset, the name of the member to bind to.

### DataSource
{: .no_toc }

A reference to a [**Data**](../Data) control (or other **DataSource** provider) whose recordset supplies the value for [**DataField**](#datafield). Set with **Set**.

### Dock
{: .no_toc }

Where the text box is docked within its container. A member of [**DockModeConstants**](../../VBRUN/Constants/DockModeConstants): **vbDockNone** (default), **vbDockLeft**, **vbDockTop**, **vbDockRight**, **vbDockBottom**, or **vbDockFill**. Docked text boxes ignore [**Anchors**](#anchors).

### DragIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor while the control is being drag-and-dropped (see [**Drag**](#drag) and [**DragMode**](#dragmode)).

### DragMode
{: .no_toc }

Whether the control should drag itself when the user holds the mouse over it. A member of [**DragModeConstants**](../../VBRUN/Constants/DragModeConstants): **vbManual** (0, default — call [**Drag**](#drag) from code) or **vbAutomatic** (1).

### Enabled
{: .no_toc }

Determines whether the control accepts user input. A disabled text box shows its current text but is dimmed and ignores keyboard and mouse interaction. **Boolean**, default **True**.

### Font
{: .no_toc }

The **StdFont** used to render the text. The convenience properties [**FontName**](#fontname), [**FontSize**](#fontsize), [**FontBold**](#fontbold), [**FontItalic**](#fontitalic), [**FontStrikethru**](#fontstrikethru), and [**FontUnderline**](#fontunderline) read or write the corresponding members of this object.

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

### FontUnderline
{: .no_toc }

Shortcut for [**Font**](#font)`.Underline`. **Boolean**.

### ForeColor
{: .no_toc }

The text colour, as an **OLE_COLOR**. Defaults to the system window-text colour.

### Height
{: .no_toc }

The control's height, in twips by default (or in the container's **ScaleMode** units). **Single**.

### HelpContextID
{: .no_toc }

A **Long** identifying a topic in the application's help file, retrieved when the user presses **F1** while the control has focus.

### HideSelection
{: .no_toc }

When **True** (default), the selection highlight is hidden whenever the control loses the focus; when **False**, the highlight remains visible after focus moves elsewhere. **Boolean**. Changing this at run time recreates the underlying window.

### hWnd
{: .no_toc }

The Win32 window handle for the underlying edit control, as a **LongPtr**. Read-only. Useful for passing to API functions.

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

### Locked
{: .no_toc }

When **True**, the user can scroll, select, and copy text but cannot modify it. **Boolean**, default **False**. Distinct from [**Enabled**](#enabled) — a locked text box is still drawn normally and continues to raise focus and mouse events, whereas a disabled one is dimmed and ignores input entirely.

### MaxLength
{: .no_toc }

The maximum number of characters the user can type into the control. **Long**, default `0` — when zero, the OS imposes its own limit (typically 32 767 characters for single-line, much larger for multi-line). Setting **MaxLength** below the current text length does not truncate what is already there, but blocks further typing until the user deletes enough characters.

### MouseIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor when [**MousePointer**](#mousepointer) is **vbCustom** and the pointer is over the control.

### MousePointer
{: .no_toc }

The mouse cursor shown when the pointer is over the control. A member of [**MousePointerConstants**](../../VBRUN/Constants/MousePointerConstants).

### MultiLine
{: .no_toc }

When **True**, the control accepts multiple lines of text, displays line wrapping, and routes **Enter** to insert a line break. When **False** (default), the control holds a single line. **Boolean**. Changing this at run time recreates the underlying window.

### Name
{: .no_toc }

The unique design-time name of the control on its parent form. Read-only at run time.

### NumbersOnly
{: .no_toc }

When **True**, the edit control rejects keystrokes other than the decimal digits **0**–**9**. **Boolean**, default **False**. Does not validate code-assigned values, sign characters, decimal points, or thousand separators — use a [**KeyPress**](#keypress) handler for additional validation.

### OLEDragMode
{: .no_toc }

Whether the control's selected text can act as an automatic OLE drag source. A member of [**OLEDragConstants**](../../VBRUN/Constants/OLEDragConstants): **vbOLEDragManual** (0, default — call [**OLEDrag**](#oledrag) from code) or **vbOLEDragAutomatic** (1).

### OLEDropMode
{: .no_toc }

How the control responds to OLE drops. A member of [**OLEDropConstants**](../../VBRUN/Constants/OLEDropConstants): **vbOLEDropNone**, **vbOLEDropManual**, or **vbOLEDropAutomatic** (which inserts the dropped text at the caret without raising [**OLEDragDrop**](#oledragdrop)).

### Opacity
{: .no_toc }

The control's opacity as a percentage (0–100, default 100). Values outside the range are clamped on **Initialize**. Requires Windows 8 or later for child controls.

### Parent
{: .no_toc }

A reference to the [**Form**](../Form) (or **UserControl**) that ultimately contains this control. Read-only. Distinct from [**Container**](#container), which returns the immediate parent.

### PasswordChar
{: .no_toc }

A **String** whose first character is displayed in place of each typed character, masking the contents on screen. **String**, default empty (no masking). Reading [**Text**](#text) still returns the real characters. Effective in single-line mode only.

### RightToLeft
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### ScrollBars
{: .no_toc }

Which scroll bars the multi-line text box displays. A member of [**ScrollBarConstants**](../../VBRUN/Constants/ScrollBarConstants): **vbSBNone** (0, default), **vbHorizontal** (1), **vbVertical** (2), or **vbBoth** (3). Ignored when [**MultiLine**](#multiline) is **False**. Changing this at run time recreates the underlying window.

When the vertical scroll bar is enabled in a wrapping multi-line box, the horizontal scroll bar disables word wrap — lines extend past the right edge instead of wrapping.

### SelLength
{: .no_toc }

The number of characters currently selected. **Long**. Setting it extends or shrinks the selection from [**SelStart**](#selstart) and scrolls the caret into view.

### SelStart
{: .no_toc }

The zero-based position of the start of the selection, or the caret position when no text is selected. **Long**. Setting it clears the existing selection, moves the caret to the new position, and scrolls the caret into view.

### SelText
{: .no_toc }

The text currently selected. Assigning a string replaces the selection with that string and positions the caret immediately after the inserted text. **String**.

### TabFocusAutoSelect
{: .no_toc }

When **True** (default), the entire contents of the text box are automatically selected when the user moves focus to it with the **TAB** key. **Boolean**. The parent form's `TabFocusAutoSelect` property must also be **True** for this setting to take effect — when the form-level switch is **False**, the per-control value is ignored.

### TabIndex
{: .no_toc }

The position of the control in the form's TAB-key navigation order. **Long**.

### TabStop
{: .no_toc }

Whether the user can reach the control by pressing the **TAB** key. **Boolean**, default **True**. A disabled control is skipped regardless of this setting.

### Tag
{: .no_toc }

A free-form **String** the application can use to associate custom data with the control. Ignored by the framework.

### Text
{: .no_toc }

The text shown in the control. **String**. **Default property.**

Syntax: *object*.**Text** [ = *string* ]

Assigning a value that differs from the current one raises a [**Change**](#change) event and refreshes the display. Assigning the same value is a no-op. In multi-line mode, line breaks are stored using the platform's native newline encoding (`vbCrLf` on Windows).

### TextHint
{: .no_toc }

A placeholder **String** displayed in a dimmed colour when [**Text**](#text) is empty — the Win32 *cue banner*. Default empty (no cue). The hint disappears as soon as the user starts typing.

### TextHintAlways
{: .no_toc }

When **True**, [**TextHint**](#texthint) is also shown while the empty control has the input focus; when **False** (default), the hint disappears the moment the control is focused. **Boolean**.

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

### VisualStyles
{: .no_toc }

Whether the OS theme engine should be used when drawing the control. **Boolean**, default **True**.

### WhatsThisHelpID
{: .no_toc }

A **Long** identifying a "What's This?" help-pop-up topic in the application's help file. See [**ShowWhatsThis**](#showwhatsthis).

### WheelScrollEvent
{: .no_toc }

When **True** (default), mouse-wheel notifications over a multi-line text box raise the [**Scroll**](#scroll) event; when **False**, the wheel still scrolls the contents but [**Scroll**](#scroll) is suppressed. **Boolean**. VB6 never raised **Scroll** for wheel events; set this to **False** to match that behaviour exactly.

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

### Change
{: .no_toc }

Raised whenever [**Text**](#text) changes — either through user input or by code assigning a new value. Not raised during [**Initialize**](#initialize); the very first text load from the serialized form does not produce a **Change** event. **Default-designer event.**

Syntax: *object*\_**Change**( )

### Click
{: .no_toc }

Raised when the user clicks the control with any mouse button. Issued from the [**MouseUp**](#mouseup) handler when the mouse-down was captured by this control and the click did not come from a double-click.

Syntax: *object*\_**Click**( )

### DblClick
{: .no_toc }

Raised when the user double-clicks the control. Suppresses the synthetic [**Click**](#click) that would otherwise fire from the second [**MouseUp**](#mouseup).

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

Raised once, after the underlying window has been created and [**Text**](#text), [**Locked**](#locked), [**MaxLength**](#maxlength), [**TextHint**](#texthint), and [**PasswordChar**](#passwordchar) have been applied from the serialized data. [**Change**](#change) does not fire for this initial text load.

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

Raised when the cursor moves over the control. While [**OLEDragMode**](#oledragmode) is **vbOLEDragAutomatic**, **MouseMove** also tracks whether the cursor is over selected text so that the IBeam cursor switches to a pointer ahead of an auto-drag.

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

Raised on the destination control when the user drops data on it (when [**OLEDropMode**](#oledropmode) is **vbOLEDropManual**).

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

Raised on the source control at the start of an OLE drag, so the application can populate the **DataObject** and choose the allowed effects. Also raised automatically when [**OLEDragMode**](#oledragmode) is **vbOLEDragAutomatic** and the user begins a drag from a non-empty selection.

Syntax: *object*\_**OLEStartDrag**( *Data* **As DataObject**, *AllowedEffects* **As Long** )

### Scroll
{: .no_toc }

Raised when a multi-line text box is scrolled — by the scroll bar (including thumb-track dragging), the keyboard, or the mouse wheel. Wheel-driven scrolling can be silenced by setting [**WheelScrollEvent**](#wheelscrollevent) to **False**. New in twinBASIC — there is no equivalent VB6 event.

Syntax: *object*\_**Scroll**( )

### Validate
{: .no_toc }

Raised when the focus is moving to another control whose [**CausesValidation**](#causesvalidation) is **True**. Setting *Cancel* to **True** keeps the focus on this control.

Syntax: *object*\_**Validate**( *Cancel* **As Boolean** )
