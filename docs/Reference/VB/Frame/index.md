---
title: Frame
parent: VB Package
permalink: /tB/Packages/VB/Frame/
has_toc: false
---

# Frame class
{: .no_toc }

A **Frame** is a Win32 native container control that groups a set of related controls inside a captioned border. It serves two distinct purposes — a visual cue that the enclosed controls belong together, and a logical grouping for [**OptionButton**](../OptionButton) controls: option buttons inside the same frame are mutually exclusive of one another but independent of option buttons elsewhere on the form. Controls dropped onto a frame at design time become its children, and moving, hiding, disabling, or destroying the frame moves, hides, disables, or destroys the entire group with it.

A frame cannot itself receive the input focus. The mnemonic marker (`&`) in its [**Caption**](#caption) is honoured, but pressing **Alt+** that character moves the focus to the next control in tab order rather than to the frame itself — exactly like a [**Label**](../Label).

The default property is [**Caption**](#caption) and the default event is [**Click**](#click).

```tb
Private Sub Form_Load()
    fraOutput.Caption = "&Output format"
    optHTML.Caption     = "&HTML"
    optMarkdown.Caption = "&Markdown"
    optPlain.Caption    = "&Plain text"
    optHTML.Value = True            ' default selection within fraOutput
End Sub

Private Sub fraOutput_Click()
    Debug.Print "Frame clicked (between the option buttons)"
End Sub
```

* TOC
{:toc}

## Container behaviour

A frame is a true container: each control inside it has the frame's `hWnd` as its Win32 parent and its coordinates are relative to the frame's client area, not the form. As a result:

- Toggling [**Visible**](#visible) or [**Enabled**](#enabled) affects every contained control.
- Calling [**Move**](#move) re-positions the frame and the children move with it without each child raising its own resize.
- The frame's [**Anchors**](#anchors) and [**Dock**](#dock) settings let it stretch with its parent so the whole group resizes together.
- A control's [**Container**](#container) property returns the frame it lives in (and the frame's own [**Container**](#container) returns the form, or another frame, that hosts it).

## Caption, mnemonics, and the border

The text in [**Caption**](#caption) is rendered along the top edge of the border by the standard Win32 group-box style. An ampersand in the caption marks the next character as a keyboard mnemonic; use `&&` to display a literal ampersand. Pressing **Alt+** the marked character moves the focus to the next control in tab order — the frame does not take focus itself.

[**BorderStyle**](#borderstyle) chooses between the standard captioned single-line border (**vbFixedSingleBorder**, the default) and a borderless mode (**vbNoBorder**). In **vbNoBorder** mode the standard group-box rendering is bypassed entirely — neither the line nor the caption text is drawn — and the frame becomes a plain rectangular region. [**Appearance**](#appearance) further selects between the 3-D and flat variant of the standard border.

## OptionButton groups

Each frame defines its own option-button group. When the user selects an [**OptionButton**](../OptionButton) whose parent is this frame, every other option button on the same frame is automatically cleared, but option buttons on the form (or in sibling frames) are not affected. Use frames to present multiple independent radio-style choices on the same form:

```tb
' Two independent option-button groups on one form:
'   fraSize:    optSmall, optMedium, optLarge
'   fraColour:  optRed, optGreen, optBlue
```

## Transparency and opacity

[**Opacity**](#opacity) and [**TransparencyKey**](#transparencykey) enable Windows' layered-window features. Setting [**Opacity**](#opacity) below 100 makes the frame and its contained controls translucent; setting [**TransparencyKey**](#transparencykey) to a colour makes pixels of that colour fully transparent on screen. Both features require Windows 8 or later when the frame contains child controls — otherwise only the frame's own background is affected.

## Properties

### Anchors
{: .no_toc }

The set of edges of the parent that the frame's corresponding edges follow when the parent resizes. Read-only — assign individual `.Left`, `.Top`, `.Right`, `.Bottom` flags through the returned **Anchors** object.

### Appearance
{: .no_toc }

Determines how the frame's border is drawn by the OS. A member of [**AppearanceConstants**](../../VBRUN/Constants/AppearanceConstants): **vbAppearFlat** or **vbAppear3d** (default).

### BackColor
{: .no_toc }

The background colour of the frame's client area, as an **OLE_COLOR**. Defaults to the system 3-D face colour. Painted behind contained controls.

### BorderStyle
{: .no_toc }

The style of the frame's border. A member of [**ControlBorderStyleConstants**](../../VBRUN/Constants/ControlBorderStyleConstants): **vbFixedSingleBorder** (1, default — the captioned group-box line) or **vbNoBorder** (0). With **vbNoBorder** the caption is also suppressed and the frame becomes a borderless background panel.

### Caption
{: .no_toc }

The text rendered along the top edge of the frame's border. **String**. **Default property.**

Syntax: *object*.**Caption** [ = *string* ]

An ampersand marks the next character as a mnemonic; `&&` produces a literal ampersand. The string is read directly from the underlying window — assigning to **Caption** updates the rendering immediately.

### ClipControls
{: .no_toc }

Whether child controls are clipped out of the frame's drawing region during paint. **Boolean**, default **True**. Changing **ClipControls** at run time recreates the underlying window.

### Container
{: .no_toc }

The control that hosts this frame — typically the form, or another frame. Read with **Get**, change with **Set**. Setting **Container** re-parents the frame to a different container at run time.

### ControlType
{: .no_toc }

A read-only [**ControlTypeConstants**](../../VBRUN/Constants/ControlTypeConstants) value identifying this control as a frame. Always **vbFrame**.

### Dock
{: .no_toc }

Where the frame is docked within its container. A member of [**DockModeConstants**](../../VBRUN/Constants/DockModeConstants): **vbDockNone** (default), **vbDockLeft**, **vbDockTop**, **vbDockRight**, **vbDockBottom**, or **vbDockFill**. Docked frames ignore [**Anchors**](#anchors).

### DragIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor while the frame is being drag-and-dropped (see [**Drag**](#drag) and [**DragMode**](#dragmode)).

### DragMode
{: .no_toc }

Whether the frame should drag itself when the user holds the mouse over it. A member of [**DragModeConstants**](../../VBRUN/Constants/DragModeConstants): **vbManual** (0, default — call [**Drag**](#drag) from code) or **vbAutomatic** (1).

### Enabled
{: .no_toc }

Determines whether the frame and its contained controls accept user input. A disabled frame dims its contents and ignores mouse and keyboard interaction. **Boolean**, default **True**. Changing **Enabled** triggers an immediate repaint so the border reflects the new state.

### Font
{: .no_toc }

The **StdFont** used to render [**Caption**](#caption). The convenience properties **FontBold**, **FontItalic**, **FontName**, **FontSize**, **FontStrikethru**, and **FontUnderline** read or write the corresponding members of this object.

### FontBold
{: .no_toc }

Shortcut for `Font.Bold`. **Boolean**.

### FontItalic
{: .no_toc }

Shortcut for `Font.Italic`. **Boolean**.

### FontName
{: .no_toc }

Shortcut for `Font.Name`. **String**.

### FontSize
{: .no_toc }

Shortcut for `Font.Size`. **Single**, in points.

### FontStrikethru
{: .no_toc }

Shortcut for `Font.Strikethrough`. **Boolean**.

### FontUnderline
{: .no_toc }

Shortcut for `Font.Underline`. **Boolean**.

### ForeColor
{: .no_toc }

The colour used to draw [**Caption**](#caption), as an **OLE_COLOR**. Defaults to the system button-text colour.

### Height
{: .no_toc }

The frame's height, in twips by default (or in the container's **ScaleMode** units). **Double**.

### HelpContextID
{: .no_toc }

A **Long** identifying a topic in the application's help file, retrieved when the user invokes context help while the frame has the active control underneath it.

### hWnd
{: .no_toc }

The Win32 window handle for the frame, as a **LongPtr**. Read-only. Useful for passing to API functions.

### Index
{: .no_toc }

When the frame is part of a control array, the **Long** zero-based index of this instance within the array. Reading **Index** on a non-array instance raises run-time error 343 (*Object not an array*). Read-only at run time.

### Left
{: .no_toc }

The horizontal distance from the left edge of the container to the left edge of the frame. **Double**.

### MouseIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor when [**MousePointer**](#mousepointer) is **vbCustom** and the pointer is over the frame.

### MousePointer
{: .no_toc }

The mouse cursor shown when the pointer is over the frame (and not over a child control with its own setting). A member of [**MousePointerConstants**](../../VBRUN/Constants/MousePointerConstants).

### MultiFramePosition
{: .no_toc }

When the frame is hosted inside a [**MultiFrame**](../MultiFrame) layout container, the **Long** zero-based position of this frame in the **MultiFrame**'s ordered sequence. Default `-1` (no position assigned). Outside of a **MultiFrame** the value is ignored.

### MultiFrameSize
{: .no_toc }

When the frame is hosted inside a [**MultiFrame**](../MultiFrame), its size as a percentage of the **MultiFrame**'s usable extent (`0` for "share evenly"). **Double**. Outside of a **MultiFrame** the value is ignored.

### Name
{: .no_toc }

The unique design-time name of the frame on its parent form. Read-only at run time.

### OLEDropMode
{: .no_toc }

How the frame responds to OLE drops. A restricted member of [**OLEDropConstants**](../../VBRUN/Constants/OLEDropConstants): **vbOLEDropNone** or **vbOLEDropManual**. Automatic-drop mode is not supported on a Frame; assigning **vbOLEDropAutomatic** raises run-time error 5.

### Opacity
{: .no_toc }

The frame's opacity as a percentage (0–100, default 100). Values outside the range are clamped on **Initialize**. Values below 100 require Windows 8 or later when the frame has child controls; out-of-process child windows are not affected.

### OriginalMultiFramePosition
{: .no_toc }

The frame's [**MultiFramePosition**](#multiframeposition) at the moment the [**MultiFrame**](../MultiFrame) was last reflowed. **Long**, default `-1`. Used internally by the **MultiFrame** layout engine to compact positions after a frame is moved; not normally written from user code.

### Parent
{: .no_toc }

A reference to the [**Form**](../Form/) (or **UserControl**) that ultimately contains the frame. Read-only. Distinct from [**Container**](#container), which returns the immediate parent (form *or* enclosing frame).

### RightToLeft
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### TabIndex
{: .no_toc }

The position of the frame in the form's TAB-key navigation order. **Long**. The frame itself does not receive focus, but **TabIndex** controls where the frame's mnemonic forwards focus to: **Alt+** the marked character moves to the next focusable control whose **TabIndex** is greater than this one.

### Tag
{: .no_toc }

A free-form **String** the application can use to associate custom data with the frame. Ignored by the framework.

### ToolTipText
{: .no_toc }

A multi-line **String** displayed as a tooltip when the user hovers over the frame's border or background.

### Top
{: .no_toc }

The vertical distance from the top of the container to the top of the frame. **Double**.

### TransparencyKey
{: .no_toc }

An **OLE_COLOR** that, when set, becomes fully transparent in the rendered frame — clicks pass through to whatever is underneath, and the corresponding pixels do not paint. Default `-1` disables the effect. Requires Windows 8 or later when the frame has child controls.

### Visible
{: .no_toc }

Whether the frame and its contained controls are shown. **Boolean**, default **True**.

### VisualStyles
{: .no_toc }

Whether the OS theme engine should be used when drawing the frame border and caption. **Boolean**, default **True**.

### WhatsThisHelpID
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC. See [**ShowWhatsThis**](#showwhatsthis).

### Width
{: .no_toc }

The frame's width. **Double**.

## Methods

### Drag
{: .no_toc }

Begins, completes, or cancels a manual drag-and-drop operation. Typically called from a [**MouseDown**](#mousedown) handler when [**DragMode**](#dragmode) is **vbManual**.

Syntax: *object*.**Drag** [ *Action* ]

*Action*
: *optional* A member of [**DragConstants**](../../VBRUN/Constants/DragConstants): **vbCancel** (0), **vbBeginDrag** (1, default), or **vbEndDrag** (2).

### Move
{: .no_toc }

Repositions and optionally resizes the frame in a single call. Contained controls are repositioned with it.

Syntax: *object*.**Move** *Left* [, *Top* [, *Width* [, *Height* ] ] ]

*Left*
: *required* A **Single** giving the new horizontal position.

*Top*, *Width*, *Height*
: *optional* New values for the corresponding properties. Omitted values are left unchanged.

### OLEDrag
{: .no_toc }

Initiates an OLE drag operation from the frame, raising the [**OLEStartDrag**](#olestartdrag) event so the application can populate the **DataObject**.

Syntax: *object*.**OLEDrag**

### Refresh
{: .no_toc }

Forces an immediate repaint of the frame and its border.

Syntax: *object*.**Refresh**

### SetFocus
{: .no_toc }

Attempts to move the input focus to the frame. Because a frame is not focusable, this call has no observable effect on which control holds the focus, but it is provided for parity with the rest of the control API and for compatibility with code that calls **SetFocus** generically.

Syntax: *object*.**SetFocus**

### ShowWhatsThis
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

Syntax: *object*.**ShowWhatsThis**

### ZOrder
{: .no_toc }

Brings the frame to the front or back of its sibling stack within the container.

Syntax: *object*.**ZOrder** [ *Position* ]

*Position*
: *optional* A member of [**ZOrderConstants**](../../VBRUN/Constants/ZOrderConstants): **vbBringToFront** (0, default) or **vbSendToBack** (1).

## Events

### Click
{: .no_toc }

Raised when the user single-clicks the frame's client area or border (i.e. not over any contained control). **Default event.**

Syntax: *object*\_**Click**( )

### DblClick
{: .no_toc }

Raised when the user double-clicks the frame's client area or border.

Syntax: *object*\_**DblClick**( )

### DragDrop
{: .no_toc }

Raised on the destination control when a manual drag operation ends over this frame.

Syntax: *object*\_**DragDrop**( *Source* **As Control**, *X* **As Single**, *Y* **As Single** )

### DragOver
{: .no_toc }

Raised on the frame while a manual drag operation is in progress over it.

Syntax: *object*\_**DragOver**( *Source* **As Control**, *X* **As Single**, *Y* **As Single**, *State* **As Integer** )

### Initialize
{: .no_toc }

Raised once, after the frame's underlying window has been created but before any contained controls are populated. Useful for setting initial values that the frame's children will read on their own initialisation.

Syntax: *object*\_**Initialize**( )

### MouseDown
{: .no_toc }

Raised when the user presses any mouse button over the frame's client area or border.

Syntax: *object*\_**MouseDown**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseMove
{: .no_toc }

Raised when the cursor moves over the frame's client area or border.

Syntax: *object*\_**MouseMove**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseUp
{: .no_toc }

Raised when the user releases a mouse button over the frame's client area or border.

Syntax: *object*\_**MouseUp**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseWheel
{: .no_toc }

Raised when the mouse wheel turns over the frame. New in twinBASIC.

Syntax: *object*\_**MouseWheel**( *Delta* **As Integer**, *Horizontal* **As Boolean** )

### OLECompleteDrag
{: .no_toc }

Raised on the source control when the OLE drag operation finishes, indicating which effect (copy, move, none) the destination accepted.

Syntax: *object*\_**OLECompleteDrag**( *Effect* **As Long** )

### OLEDragDrop
{: .no_toc }

Raised on the frame when the user drops data on it.

Syntax: *object*\_**OLEDragDrop**( *Data* **As DataObject**, *Effect* **As Long**, *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### OLEDragOver
{: .no_toc }

Raised on the frame while an OLE drag passes over it.

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
