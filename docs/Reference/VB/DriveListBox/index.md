---
title: DriveListBox
parent: VB Package
permalink: /tB/Packages/VB/DriveListBox/
has_toc: false
---

# DriveListBox class
{: .no_toc }

A **DriveListBox** is a Win32 native drop-down combo control that auto-populates with the drives reported by the operating system. The user picks one from the list; code reads the chosen drive through [**Drive**](#drive) and typically forwards it to a [**DirListBox**](../DirListBox) (whose [**Path**](../DirListBox/#path) it can be assigned to directly) to build a file picker alongside a [**FileListBox**](../FileListBox). The control is normally placed on a **Form** or **UserControl** at design time. The default property is [**Drive**](#drive) and the default event is [**Change**](#change).

```tb
Private Sub Form_Load()
    Drive1.Drive = "C:"
    Dir1.Path = Drive1.Drive
    File1.Path = Dir1.Path
End Sub

Private Sub Drive1_Change()
    Dir1.Path = Drive1.Drive
End Sub
```

* TOC
{:toc}

## Drive list

The list is populated automatically when the underlying window is created, by asking the OS for every currently-attached drive. Each entry combines the drive letter with the volume label, or — for a network drive — the UNC path the drive is mapped to:

| Entry shape          | Meaning                                                          |
|----------------------|------------------------------------------------------------------|
| `c: [Windows]`       | Fixed or removable disk; volume label in brackets.               |
| `d:` (no brackets)   | Drive present but no volume label (unformatted, or empty CD-ROM).|
| `z: [\\srv\share]`   | Network drive; UNC path in brackets.                             |

Each entry is owner-drawn with an icon chosen from the drive type — closed disk, removable, fixed, CD-ROM, network, or RAM disk. The list cannot be edited from code: [**AddItem**](../ComboBox/#additem), [**RemoveItem**](../ComboBox/#removeitem), and [**Clear**](../ComboBox/#clear) are present in the type library for VB6 source compatibility but raise run-time error 438 (*Object doesn't support this property or method*) when called. Call [**Refresh**](#refresh) to re-read the drive set from the OS — useful after a removable medium is inserted or a network drive is mapped.

[**ListCount**](#listcount) is the number of entries, [**List**](#list) returns the text of any entry by zero-based index, and [**TopIndex**](#topindex) controls vertical scrolling within the drop-down portion when it is open. [**NewIndex**](#newindex) reports the position of the last entry added during population (useful only when re-reading the list from code).

## Drive property semantics

Reading [**Drive**](#drive) returns the *displayed text* of the currently selected entry — drive letter, colon, and (where applicable) the bracketed volume label or UNC path, exactly as shown in the combo.

Assigning to [**Drive**](#drive) looks only at the **first character** of the value and selects the entry whose drive letter matches (case-insensitively, by prefix). Anything after the first character is ignored, so `"C"`, `"C:"`, and `"C:\Windows"` all select the **C:** drive. If no entry matches the letter — e.g. when the requested drive is not currently attached — the assignment is silently ignored, leaving the previous selection in place. Assigning a value that matches the current selection does not raise [**Change**](#change); assigning a different value does.

```tb
Drive1.Drive = "D"          ' select drive D if present, else no-op
Debug.Print Drive1.Drive    ' "d: [Backup]"  (the displayed text)
```

## OLE drag and drop

[**OLEDropMode**](#oledropmode) lets the control act as a drop target (restricted to **vbOLEDropNone** or **vbOLEDropManual**). Source-side automatic OLE drag is not supported on this control — VB6's `OLEDragMode` property was non-functional here and is omitted in twinBASIC. Call [**OLEDrag**](#oledrag) from code if a manual drag is needed.

## Properties

### Appearance
{: .no_toc }

Determines how the control's border is drawn by the OS. A member of [**AppearanceConstants**](../../VBRUN/Constants/AppearanceConstants): **vbAppearFlat** or **vbAppear3d** (default).

### BackColor
{: .no_toc }

The background colour of the drop-down list entries, as an **OLE_COLOR**. Defaults to the system window-background colour. Selected entries paint with the system highlight colour regardless of this setting. Changing this calls [**Refresh**](#refresh) so the new colour takes effect immediately.

### CausesValidation
{: .no_toc }

Determines whether the previously focused control's [**Validate**](#validate) event runs before this control receives the focus. **Boolean**, default **True**.

### ControlType
{: .no_toc }

A read-only [**ControlTypeConstants**](../../VBRUN/Constants/ControlTypeConstants) value identifying this control as a drive list box. Always **vbDriveListBox**.

### DragIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor while the control is being drag-and-dropped (see [**Drag**](#drag) and [**DragMode**](#dragmode)).

### DragMode
{: .no_toc }

Whether the control should drag itself when the user holds the mouse over it. A member of [**DragModeConstants**](../../VBRUN/Constants/DragModeConstants): **vbManual** (0, default — call [**Drag**](#drag) from code) or **vbAutomatic** (1).

### Drive
{: .no_toc }

The currently selected drive. **Default property.**

Syntax: *object*.**Drive** [ = *string* ]

Reading returns the displayed text of the selected entry — drive letter, colon, and (where applicable) the bracketed volume label or UNC path. Writing examines only the first character of *string* and selects the entry whose drive letter matches; values that do not match any present drive are silently ignored. Assigning a value that changes the selection raises [**Change**](#change). See [Drive property semantics](#drive-property-semantics) above for details.

### Enabled
{: .no_toc }

Determines whether the control accepts user input. A disabled drive list box still shows its current selection but is dimmed and ignores keyboard and mouse interaction. **Boolean**, default **True**.

### Font
{: .no_toc }

The **StdFont** used to render the drive entries. The convenience properties **FontName**, **FontSize**, **FontBold**, **FontItalic**, **FontStrikethru**, and **FontUnderline** read or write the corresponding members of this object.

### ForeColor
{: .no_toc }

The text colour for entries that are not currently selected, as an **OLE_COLOR**. Defaults to the system window-text colour. Disabled entries draw in the system grey-text colour, and selected entries draw in the system highlight-text colour, regardless of this setting. Changing this calls [**Refresh**](#refresh).

### Height
{: .no_toc }

The control's height when the drop-down is closed, in twips by default (or in the container's **ScaleMode** units). **Single**. The drop-down portion is sized by the OS.

### HelpContextID
{: .no_toc }

A **Long** identifying a topic in the application's help file, retrieved when the user presses **F1** while the control has focus.

### hWnd
{: .no_toc }

The Win32 window handle for the underlying combo box, as a **LongPtr**. Read-only. Useful for passing to API functions.

### Index
{: .no_toc }

When the control is part of a control array, the **Long** zero-based index of this instance within the array. Read-only at run time.

### Left
{: .no_toc }

The horizontal distance from the left edge of the container to the left edge of the control. **Single**.

### List
{: .no_toc }

The displayed text of the drive entry at the given index. Read-only.

Syntax: *object*.**List**( *Index* )

*Index*
: *required* A **Long** zero-based item position, from `0` to `ListCount - 1`.

### ListCount
{: .no_toc }

The number of drive entries currently in the list, as a **Long**. Read-only.

### ListIndex
{: .no_toc }

The zero-based index of the selected entry, or `-1` if nothing is selected. **Long**. Assigning a value that differs from the current one selects that entry and raises [**Change**](#change).

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

The zero-based index at which the most recent list-population step inserted an entry, or `-1` if the list is empty. **Long**. Updated while the list is being filled (during [**Initialize**](#initialize) and after [**Refresh**](#refresh)); rarely useful at run time but read by some VB6-compatibility code.

### OLEDropMode
{: .no_toc }

How the control responds to OLE drops. A restricted member of [**OLEDropConstants**](../../VBRUN/Constants/OLEDropConstants): **vbOLEDropNone** or **vbOLEDropManual**. Automatic-drop mode is not supported on a DriveListBox.

### Opacity
{: .no_toc }

The control's opacity as a percentage (0–100, default 100). Values outside the range are clamped on **Initialize**. Requires Windows 8 or later for child controls.

### Parent
{: .no_toc }

A reference to the **Form** (or **UserControl**) that contains this control. Read-only.

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

The zero-based index of the entry shown at the top of the drop-down portion. Assigning a value scrolls the list so that entry is at the top, and raises [**Scroll**](#scroll) when the value actually changes. **Long**.

### TransparencyKey
{: .no_toc }

An **OLE_COLOR** that, when set, becomes fully transparent in the rendered control. Default `-1` disables the effect. Requires Windows 8 or later for child controls.

### Visible
{: .no_toc }

Whether the control is shown. **Boolean**, default **True**.

### VisualStyles
{: .no_toc }

Whether the OS theme engine should be used when drawing the control. **Boolean**.

### WhatsThisHelpID
{: .no_toc }

A **Long** identifying a "What's This?" help-pop-up topic in the application's help file. See [**ShowWhatsThis**](#showwhatsthis).

### WheelScrollEvent
{: .no_toc }

When **True** (default), mouse-wheel notifications over the drop-down list raise the [**Scroll**](#scroll) event; when **False**, the wheel still scrolls the list but [**Scroll**](#scroll) is suppressed. **Boolean**. VB6 never raised **Scroll** for wheel events; set this to **False** to match that behaviour exactly.

### Width
{: .no_toc }

The control's width. **Single**.

## Methods

### Drag
{: .no_toc }

Begins, completes, or cancels a manual drag-and-drop operation when [**DragMode**](#dragmode) is **vbManual**. DriveListBox does not raise mouse events itself, so the call typically lives in a parent **Form** or container's mouse handler.

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

Re-reads the set of currently-attached drives from the operating system and repopulates the list, then redraws the control. Useful after a removable medium is inserted or a network drive is mapped or disconnected — the control does not watch for these events on its own. Does not raise [**Change**](#change), even if the previously-selected drive is no longer present (the selection moves to entry `0`).

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

Raised after the selected drive changes — whether the user picked a different entry from the drop-down or code assigned a different value to [**Drive**](#drive) or [**ListIndex**](#listindex). Not raised for assignments that match the current selection, nor during [**Refresh**](#refresh) or the initial population that occurs before [**Initialize**](#initialize). **Default event.**

Syntax: *object*\_**Change**( )

### CloseUp
{: .no_toc }

Raised when the drop-down portion closes — either because the user picked an entry, clicked elsewhere, or pressed **Esc**.

Syntax: *object*\_**CloseUp**( )

### DragDrop
{: .no_toc }

Raised on the destination control when a manual drag operation ends over it.

Syntax: *object*\_**DragDrop**( *Source* **As Control**, *X* **As Single**, *Y* **As Single** )

### DragOver
{: .no_toc }

Raised on the control under the cursor while a manual drag operation is in progress.

Syntax: *object*\_**DragOver**( *Source* **As Control**, *X* **As Single**, *Y* **As Single**, *State* **As Integer** )

### DropDown
{: .no_toc }

Raised when the user opens the drop-down portion.

Syntax: *object*\_**DropDown**( )

### GotFocus
{: .no_toc }

Raised when the control receives the input focus.

Syntax: *object*\_**GotFocus**( )

### Initialize
{: .no_toc }

Raised once, immediately after the underlying window is created and the initial list of drives has been loaded. New in twinBASIC — VB6 had no equivalent on this control.

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

Raised when the drop-down list is scrolled — by the scroll bar, the keyboard, or (when [**WheelScrollEvent**](#wheelscrollevent) is **True**) the mouse wheel. The new offset can be read from [**TopIndex**](#topindex).

Syntax: *object*\_**Scroll**( )

### Validate
{: .no_toc }

Raised when the focus is moving to another control whose [**CausesValidation**](#causesvalidation) is **True**. Setting *Cancel* to **True** keeps the focus on this control.

Syntax: *object*\_**Validate**( *Cancel* **As Boolean** )
