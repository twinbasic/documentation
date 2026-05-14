---
title: DirListBox
parent: VB Package
permalink: /tB/Packages/VB/DirListBox/
has_toc: false
---

# DirListBox class
{: .no_toc }

A **DirListBox** is a Win32 native list control that displays the directory tree for a single path: the ancestors of the current folder are shown above (each with a closed-folder icon, indented by depth), and the immediate subdirectories of the current folder appear below (each with an open-folder icon at full indent). Double-clicking an entry navigates into it, raising a [**Change**](#change) event. The control is normally placed on a **Form** or **UserControl** at design time alongside a [**DriveListBox**](../DriveListBox) and a [**FileListBox**](../FileListBox), connecting their **Change** events together to build a complete file picker. The default property is [**Path**](#path) and the default event is [**Change**](#change).

```tb
Private Sub Form_Load()
    Drive1.Drive = "C:\"
    Dir1.Path = Drive1.Drive
    File1.Path = Dir1.Path
End Sub

Private Sub Drive1_Change()
    Dir1.Path = Drive1.Drive
End Sub

Private Sub Dir1_Change()
    File1.Path = Dir1.Path
End Sub
```

* TOC
{:toc}

## Path, ListIndex, and PathSelected

The control is built around three closely-related properties:

- [**Path**](#path) — the absolute path of the *current* directory. Set it from code (or by double-clicking an entry) to navigate the list. Defaults to [**App.Path**](../App/#path) when the control is first created.
- [**ListIndex**](#listindex) — which entry the user has *selected*. `-1` selects the current folder itself (the deepest of the ancestor entries); `0` and up select successive subdirectories. Selecting an entry is independent of navigating to it — the selection just moves the highlight.
- [**PathSelected**](#pathselected) — the absolute path that would become **Path** if the selected entry were activated. For an ancestor entry it traverses back up the tree; for a subdirectory it concatenates **Path** and the entry's name.

Activating an entry — by double-clicking, or by an external caller assigning **Path** — runs the navigation, repopulates the list, and raises [**Change**](#change). Setting **Path** to its current value is a no-op (no event).

## List, ListCount, and NewIndex

[**ListCount**](#listcount) is the number of subdirectories of the current folder (it does *not* include the ancestor entries shown above). [**List**](#list) is indexed from zero through `ListCount - 1` and returns the *full path* of the corresponding subdirectory — convenient when iterating from code:

```tb
Dim i As Long
For i = 0 To Dir1.ListCount - 1
    Debug.Print Dir1.List(i)
Next
```

[**NewIndex**](#newindex) tracks the position the most recent entry (ancestor or subdirectory) was inserted at while the list was being populated; it is rarely useful at run time but is read by some compatibility code.

[**TopIndex**](#topindex) controls vertical scrolling within the subdirectory portion of the list. Wheel and scroll-bar interactions raise [**Scroll**](#scroll) when [**WheelScrollEvent**](#wheelscrollevent) is **True**.

## Properties

### Appearance
{: .no_toc }

Determines how the control's border is drawn by the OS. A member of [**AppearanceConstants**](../../VBRUN/Constants/AppearanceConstants): **vbAppearFlat** or **vbAppear3d** (default). Combined with [**BorderStyle**](#borderstyle) to choose between a flat single-line border and a sunken client edge.

### BackColor
{: .no_toc }

The background colour, as an **OLE_COLOR**. Defaults to the system window-background colour. Used as the fill behind every list item except the selected one (which paints with the system highlight colour).

### BorderStyle
{: .no_toc }

A member of [**ControlBorderStyleConstants**](../../VBRUN/Constants/ControlBorderStyleConstants): **vbNoBorder** (0) or **vbFixedSingleBorder** (1, default). Combined with [**Appearance**](#appearance): a 3-D appearance plus single border yields the standard sunken client edge; flat appearance plus single border yields a one-pixel outline.

### CausesValidation
{: .no_toc }

Determines whether the previously focused control's [**Validate**](#validate) event runs before this control receives the focus. **Boolean**, default **True**.

### ControlType
{: .no_toc }

A read-only [**ControlTypeConstants**](../../VBRUN/Constants/ControlTypeConstants) value identifying this control as a directory list box. Always **vbDirListBox**.

### DragIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor while the control is being drag-and-dropped (see [**Drag**](#drag) and [**DragMode**](#dragmode)).

### DragMode
{: .no_toc }

Whether the control should drag itself when the user holds the mouse over it. A member of [**DragModeConstants**](../../VBRUN/Constants/DragModeConstants): **vbManual** (0, default — call [**Drag**](#drag) from code) or **vbAutomatic** (1).

### Enabled
{: .no_toc }

Determines whether the control accepts user input. A disabled directory list box still shows its contents but is dimmed and ignores keyboard and mouse interaction. **Boolean**, default **True**.

### Font
{: .no_toc }

The **StdFont** used to render directory names. The convenience properties **FontName**, **FontSize**, **FontBold**, **FontItalic**, **FontStrikethru**, and **FontUnderline** read or write the corresponding members of this object. Changing the font rescales each item's row height when [**IntegralHeight**](#integralheight) is **True**.

### ForeColor
{: .no_toc }

The text colour for entries that are not currently selected, as an **OLE_COLOR**. Defaults to the system window-text colour. Disabled entries draw in the system grey-text colour, and selected entries draw in the system highlight-text colour, regardless of this setting.

### Height
{: .no_toc }

The control's height, in twips by default (or in the container's **ScaleMode** units). When [**IntegralHeight**](#integralheight) is **True**, the OS quantises this to a whole number of rows. **Single**.

### HelpContextID
{: .no_toc }

A **Long** identifying a topic in the application's help file, retrieved when the user presses **F1** while the control has focus.

### hWnd
{: .no_toc }

The Win32 window handle for the underlying list box, as a **LongPtr**. Read-only. Useful for passing to API functions.

### Index
{: .no_toc }

When the control is part of a control array, the **Long** zero-based index of this instance within the array. Read-only at run time.

### IntegralHeight
{: .no_toc }

When **True** (default), the OS adjusts the control's height so that the visible portion shows whole rows rather than partial ones. When **False**, the control honours [**Height**](#height) exactly. **Boolean**. Changing this at run time recreates the underlying window.

### Left
{: .no_toc }

The horizontal distance from the left edge of the container to the left edge of the control. **Single**.

### List
{: .no_toc }

The full path of the subdirectory at the given index. Read-only.

Syntax: *object*.**List**( *Index* )

*Index*
: *required* A **Long** zero-based position, from `0` to `ListCount - 1`. The ancestor entries shown above the current folder are not addressable through **List**.

### ListCount
{: .no_toc }

The number of subdirectories of the current [**Path**](#path), as a **Long**. Read-only. The ancestor entries shown above the current folder are not counted.

### ListIndex
{: .no_toc }

The zero-based index of the selected entry within the subdirectory portion of the list, or `-1` to select the current folder itself. Reading or writing values below `-1` shifts further up the ancestor stack. **Long**. Assigning a value that differs from the current one selects that entry and raises [**Click**](#click).

### MouseIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor when [**MousePointer**](#mousepointer) is **vbCustom** and the pointer is over the control.

### MousePointer
{: .no_toc }

The mouse cursor shown when the pointer is over the control. A member of [**MousePointerConstants**](../../VBRUN/Constants/MousePointerConstants).

### Name
{: .no_toc }

The unique design-time name of the control on its parent form. Read-only at run time.

### NewIndex
{: .no_toc }

The zero-based index at which the most recent list-population step inserted an entry, or `-1` if the list is empty. **Long**, read-only.

### OLEDragMode
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC. (VB6's own implementation of automatic drag was non-functional on this control.)

### OLEDropMode
{: .no_toc }

How the control responds to OLE drops. A restricted member of [**OLEDropConstants**](../../VBRUN/Constants/OLEDropConstants): **vbOLEDropNone** or **vbOLEDropManual**. Automatic-drop mode is not supported on a DirListBox.

### Opacity
{: .no_toc }

The control's opacity as a percentage (0–100, default 100). Values outside the range are clamped on **Initialize**. Requires Windows 8 or later for child controls.

### Parent
{: .no_toc }

A reference to the **Form** (or **UserControl**) that contains this control. Read-only.

### Path
{: .no_toc }

The absolute path of the current directory. **Default property.**

Syntax: *object*.**Path** [ = *string* ]

Reading **Path** returns the path the list is currently displaying — drive plus joined ancestor names. Setting **Path** repopulates the list to show the new directory and its subdirectories, raising [**Change**](#change) if the new value differs from the current one. Assigning a path that does not exist (or is not a directory) raises run-time error 76 (*Path not found*).

The **DriveListBox** and **DirListBox** controls accept each other's "drive [volume label]" formatting at this property — `Dir1.Path = Drive1.Drive` does the right thing without manual stripping.

### PathSelected
{: .no_toc }

The absolute path that the currently-selected entry refers to. **String**, read-only. For [**ListIndex**](#listindex) `-1` (the current folder) this is the same as [**Path**](#path); for an ancestor entry it traverses back up the tree; for a subdirectory it returns **Path** plus the subdirectory's name. This is the value the control assigns to **Path** when the user double-clicks the selected entry.

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

### TopIndex
{: .no_toc }

The zero-based index of the subdirectory shown at the top of the visible area. Assigning a value scrolls the list so that subdirectory is at the top, and raises [**Scroll**](#scroll) when the value actually changes. **Long**.

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

When **True** (default), mouse-wheel notifications over the control raise the [**Scroll**](#scroll) event; when **False**, the wheel still scrolls the list but [**Scroll**](#scroll) is suppressed. **Boolean**. VB6 never raised **Scroll** for wheel events; set this to **False** to match that behaviour exactly.

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

Re-reads the contents of the current [**Path**](#path) from disk and repaints the control. Useful when the directory has been modified outside the application — the control does not watch the file system on its own. Does not raise [**Change**](#change).

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

Raised after [**Path**](#path) has changed — whether the user double-clicked an entry or code assigned a different value to **Path**. Not raised for assignments that match the current value, and not raised during the initial population that occurs before [**Initialize**](#initialize). **Default event.**

Syntax: *object*\_**Change**( )

### Click
{: .no_toc }

Raised after [**ListIndex**](#listindex) changes — whether the user clicked a different entry, used the keyboard to move the selection, or code assigned a different value to [**ListIndex**](#listindex). Also raised when the selection is cancelled (e.g. by clicking the empty area below the last entry).

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

### Initialize
{: .no_toc }

Raised once, immediately after the underlying window is created and the initial path ([**App.Path**](../App/#path)) has been loaded. New in twinBASIC — VB6 had no equivalent on this control.

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

### Scroll
{: .no_toc }

Raised when the visible portion of the list scrolls — by the scroll bar, the keyboard, or (when [**WheelScrollEvent**](#wheelscrollevent) is **True**) the mouse wheel. The new offset can be read from [**TopIndex**](#topindex).

Syntax: *object*\_**Scroll**( )

### Validate
{: .no_toc }

Raised when the focus is moving to another control whose [**CausesValidation**](#causesvalidation) is **True**. Setting *Cancel* to **True** keeps the focus on this control.

Syntax: *object*\_**Validate**( *Cancel* **As Boolean** )
