---
title: ListBox
parent: VB Package
permalink: /tB/Packages/VB/ListBox/
has_toc: false
---

# ListBox class
{: .no_toc }

A **ListBox** is a Win32 native control that displays a vertically-scrolling list of items, optionally laid out in multiple columns, from which the user picks one item — or any number of items, when [**MultiSelect**](#multiselect) is non-zero. Each item is a string, with an optional **LongPtr** value the application can store alongside it through [**ItemData**](#itemdata). The control is normally placed on a **Form** or **UserControl** at design time. The default property is [**Text**](#text) and the default event is [**Click**](#click).

```tb
Private Sub Form_Load()
    With List1
        .AddItem "Apple"
        .AddItem "Banana"
        .AddItem "Cherry"
        .ItemData(0) = 100
        .ItemData(1) = 200
        .ItemData(2) = 300
        .ListIndex = 0
    End With
End Sub

Private Sub List1_Click()
    Debug.Print "Picked: " & List1.Text & " (data = " & List1.ItemData(List1.ListIndex) & ")"
End Sub
```

* TOC
{:toc}

## Style

[**Style**](#style) selects one of three rendering modes ([**ListBoxConstants**](../../VBRUN/Constants/ListBoxConstants)):

| Constant                  | Value | Layout                                                                                       |
|---------------------------|-------|----------------------------------------------------------------------------------------------|
| **vbListBoxStandard**     | 0     | Plain text items, the default.                                                               |
| **vbListBoxCheckbox**     | 1     | Each item shows an independent check box that the user can toggle without changing the selection. |
| **vbListBoxColorSwatch**  | 2     | Each item shows a colour swatch in front of its text, drawn in the colour stored in [**ItemData**](#itemdata). |

Changing **Style** at run time recreates the underlying window, preserving the items, [**ItemData**](#itemdata) values, current selection, scroll position, and (in checkbox mode) check states. [**Sorted**](#sorted), [**MultiSelect**](#multiselect), [**IntegralHeight**](#integralheight), and [**UseTabStops**](#usetabstops) recreate the window the same way.

[**MultiSelect**](#multiselect) is meaningful only with **vbListBoxStandard**. The other styles always behave as if **MultiSelect** were **vbMultiSelectNone** — the per-item toggle of **vbListBoxCheckbox** replaces the multi-selection feature, and the colour swatch is purely a display variant.

## Editing the list

Items are held inside the OS list-box control; the [**List**](#list) and [**ItemData**](#itemdata) arrays are projections onto that storage. Items are added with [**AddItem**](#additem), removed with [**RemoveItem**](#removeitem), and the whole list is cleared with [**Clear**](#clear). After each [**AddItem**](#additem) call, [**NewIndex**](#newindex) reports the position the item was inserted at — useful when [**Sorted**](#sorted) is **True** and the position is not predictable from the call.

```tb
List1.Sorted = True
List1.AddItem "Cherry"
List1.AddItem "Apple"           ' Inserted at index 0 — List1.NewIndex = 0
List1.ItemData(List1.NewIndex) = 42
```

Indexing past the end of the list raises run-time error 5 (*Invalid procedure call or argument*). Out of range or otherwise rejected calls to [**AddItem**](#additem) and [**RemoveItem**](#removeitem) raise the same error.

## Selection

[**ListIndex**](#listindex) is the zero-based index of the focused item, or `-1` when nothing is focused. [**Text**](#text) returns the text at that index. In single-select mode (**vbMultiSelectNone**) the focused item is also the selected item, and assigning to [**ListIndex**](#listindex) selects it and raises [**Click**](#click) if the value actually changes. In **vbMultiSelectSimple** and **vbMultiSelectExtended** the focused item is independent of the selection set; use [**Selected**](#selected) to read or write the selection state of any individual item, and [**SelCount**](#selcount) to count them. [**SelectedIndices**](#selectedindices) returns the selected indices as a **Collection** for convenient iteration.

```tb
Dim idx As Variant
For Each idx In List1.SelectedIndices()
    Debug.Print List1.List(idx)
Next
```

Assigning a string to [**Text**](#text) searches the list with an exact, case-insensitive match (using `LB_FINDSTRINGEXACT`) and selects that entry if found; if no entry matches, [**ListIndex**](#listindex) is set to `-1` and the current selection is cleared. Reading [**Text**](#text) when [**ListIndex**](#listindex) is `-1` raises run-time error 5.

## Multi-column display

When [**Columns**](#columns) is greater than zero, the OS lays the items out in that many side-by-side columns and gives the control a horizontal scroll bar instead of the usual vertical one. The column width is automatically set to the control's pixel width divided by [**Columns**](#columns) — assigning a new [**Width**](#width) does not re-divide the columns; you must reassign [**Columns**](#columns) to refresh the layout.

The single-column / multi-column distinction is fixed at the moment the underlying window is created. At run time, [**Columns**](#columns) can be raised or lowered between non-zero values to re-divide the same control, but switching between zero and non-zero raises run-time error 380 (*Invalid property value*). Set [**Columns**](#columns) to its desired non-zero value at design time when a multi-column layout is wanted.

## Checkbox style

In **vbListBoxCheckbox** mode each item draws a small check box in front of its text, sized from [**MaxCheckboxSize**](#maxcheckboxsize) (in pixels at 96 DPI; scaled by the system DPI). The user toggles a check box by clicking it, by clicking the item and pressing **Space**, or by clicking the item itself when it is already the focused item. Each toggle raises [**ItemCheck**](#itemcheck) with the affected index. [**Selected**](#selected) reads or writes the per-item check state in this mode (instead of the selection state). The focused item is still tracked through [**ListIndex**](#listindex), and the standard [**Click**](#click) event still fires when the focus moves between items.

The check states are kept in an internal array that is preserved across [**AddItem**](#additem) and [**RemoveItem**](#removeitem) calls (existing items keep their state; new items start unchecked).

## Data binding

Setting [**DataSource**](#datasource) and [**DataField**](#datafield) connects the control's [**Text**](#text) to a field of a [**Data**](../Data/) control's recordset. The bound field is read as a string on each move, and assigning to [**Text**](#text) marks the recordset as dirty by setting [**DataChanged**](#datachanged) to **True**. A field whose value cannot be coerced to a string is treated as an empty string rather than raising.

## OLE drag and drop

When [**OLEDragMode**](#oledragmode) is set to **vbOLEDragAutomatic**, dragging an item from the list starts an OLE drag whose **Text** data is either the dragged item's string (in single-select mode) or every selected item's text concatenated, separated by **vbCrLf** (in **vbMultiSelectSimple** or **vbMultiSelectExtended**). [**OLEDropMode**](#oledropmode) controls drop-target behaviour and is restricted to **vbOLEDropNone** or **vbOLEDropManual**.

## Properties

### Anchors
{: .no_toc }

The set of edges of the parent that the list box's corresponding edges follow when the parent resizes. Read-only — assign individual `.Left`, `.Top`, `.Right`, `.Bottom` flags through the returned **Anchors** object.

### Appearance
{: .no_toc }

Determines how the control's border is drawn by the OS. A member of [**AppearanceConstants**](../../VBRUN/Constants/AppearanceConstants): **vbAppearFlat** or **vbAppear3d** (default). Combined with [**BorderStyle**](#borderstyle): a 3-D appearance plus single border yields the standard sunken client edge; flat appearance plus single border yields a one-pixel outline.

### BackColor
{: .no_toc }

The background colour of the list area, as an **OLE_COLOR**. Defaults to the system window-background colour. Items drawn in the selected state ignore **BackColor** in favour of the system highlight colour.

### BorderStyle
{: .no_toc }

A member of [**ControlBorderStyleConstants**](../../VBRUN/Constants/ControlBorderStyleConstants): **vbNoBorder** (0) or **vbFixedSingleBorder** (1, default). Changing it at run time re-syncs the border without recreating the window.

### CausesValidation
{: .no_toc }

Determines whether the previously focused control's [**Validate**](#validate) event runs before this control receives the focus. **Boolean**, default **True**.

### Columns
{: .no_toc }

The number of columns in a multi-column layout, or `0` for a single-column list with a vertical scroll bar. **Long**, default `0`. See [Multi-column display](#multi-column-display).

Syntax: *object*.**Columns** [ = *value* ]

Switching between zero and non-zero at run time raises run-time error 380 (*Invalid property value*). Re-assigning between two non-zero values is allowed and re-divides the visible area.

### Container
{: .no_toc }

The control that hosts this list box — typically the form, a [**Frame**](../Frame/), or a **UserControl**. Read with **Get**, change with **Set**.

### ControlType
{: .no_toc }

A read-only [**ControlTypeConstants**](../../VBRUN/Constants/ControlTypeConstants) value identifying this control as a list box. Always **vbListBox**.

### DataChanged
{: .no_toc }

Whether the bound [**Text**](#text) has been written to since the last save or refresh from the [**DataSource**](#datasource). **Boolean**. Setting **DataChanged** = **True** also marks the bound recordset as dirty.

### DataField
{: .no_toc }

The name of the field, in the recordset of the bound [**DataSource**](#datasource), whose value is mirrored by [**Text**](#text). **String**.

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

Where the list box is docked within its container. A member of [**DockModeConstants**](../../VBRUN/Constants/DockModeConstants): **vbDockNone** (default), **vbDockLeft**, **vbDockTop**, **vbDockRight**, **vbDockBottom**, or **vbDockFill**. Docked list boxes ignore [**Anchors**](#anchors).

### DragIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor while the control is being drag-and-dropped (see [**Drag**](#drag) and [**DragMode**](#dragmode)).

### DragMode
{: .no_toc }

Whether the control should drag itself when the user holds the mouse over it. A member of [**DragModeConstants**](../../VBRUN/Constants/DragModeConstants): **vbManual** (0, default — call [**Drag**](#drag) from code) or **vbAutomatic** (1).

### Enabled
{: .no_toc }

Determines whether the control accepts user input. A disabled list box still shows its contents but is dimmed and ignores keyboard and mouse interaction. **Boolean**, default **True**.

### Font
{: .no_toc }

The **StdFont** used to render item text. The convenience properties **FontName**, **FontSize**, **FontBold**, **FontItalic**, **FontStrikethru**, and **FontUnderline** read or write the corresponding members of this object. Changing the font rescales each item's row height when [**IntegralHeight**](#integralheight) is **True**, and forces a recalculation of the row height in **vbListBoxCheckbox** and **vbListBoxColorSwatch** modes.

### ForeColor
{: .no_toc }

The text colour for entries that are not currently selected, as an **OLE_COLOR**. Defaults to the system window-text colour. Disabled entries draw in the system grey-text colour, and selected entries draw in the system highlight-text colour, regardless of this setting.

### Height
{: .no_toc }

The control's height, in twips by default (or in the container's **ScaleMode** units). When [**IntegralHeight**](#integralheight) is **True**, the OS quantises this on **Initialize** to a whole number of rows. **Single**.

### HelpContextID
{: .no_toc }

A **Long** identifying a topic in the application's help file, retrieved when the user presses **F1** while the control has focus.

### hWnd
{: .no_toc }

The Win32 window handle for the underlying list box, as a **LongPtr**. Read-only. Useful for passing to API functions.

### Index
{: .no_toc }

When the control is part of a control array, the **Long** zero-based index of this instance within the array. Reading **Index** on a non-array instance raises run-time error 343 (*Object not an array*). Read-only at run time.

### IntegralHeight
{: .no_toc }

When **True** (default), the OS adjusts the control's height so that the visible portion shows whole rows rather than partial ones. When **False**, the control honours [**Height**](#height) exactly and the bottom row may be clipped. **Boolean**. Changing this at run time recreates the underlying window.

### ItemData
{: .no_toc }

A **LongPtr** that the application can associate with each item. Indexed by the same zero-based position used by [**List**](#list).

Syntax: *object*.**ItemData**( *Index* ) [ = *value* ]

*Index*
: *required* A **Long** zero-based item position.

In **vbListBoxColorSwatch** mode, **ItemData** is read by the painting code as the **OLE_COLOR** to draw in the swatch — a typical use is to fill it with a list of palette colours and let the user pick one. In the other styles **ItemData** is purely application-defined.

```tb
List1.AddItem "Highlight"
List1.ItemData(List1.NewIndex) = vbYellow
```

Values stored at design time through the form designer are kept as **Long** rather than **LongPtr** so that designed forms remain platform-agnostic; at run time the property is **LongPtr**, sign-extending the design-time value where necessary.

### Left
{: .no_toc }

The horizontal distance from the left edge of the container to the left edge of the control. **Single**.

### List
{: .no_toc }

The text of an item, indexed by zero-based position. Setting **List(*Index*)** removes the existing item at that position and reinserts the new value at the same index — note that this can change the resulting position when [**Sorted**](#sorted) is **True**.

Syntax: *object*.**List**( *Index* ) [ = *string* ]

*Index*
: *required* A **Long** zero-based item position. Out-of-range indices raise run-time error 5.

### ListCount
{: .no_toc }

The number of items in the list, as a **Long**. Read-only.

### ListIndex
{: .no_toc }

The zero-based index of the focused item, or `-1` if no item is focused. **Long**. In multi-select modes the focused item and the selected items are independent — see [**Selected**](#selected). Assigning a value that differs from the current one focuses that item and raises [**Click**](#click).

### MaxCheckboxSize
{: .no_toc }

The maximum size of the per-item check box drawn in **vbListBoxCheckbox** mode, in pixels at 96 DPI. **Long**, default `15`. The actual size used is the smaller of this value (scaled by the system DPI) and the row height computed from the current font, so the box never exceeds a row.

### MouseIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor when [**MousePointer**](#mousepointer) is **vbCustom** and the pointer is over the control.

### MousePointer
{: .no_toc }

The mouse cursor shown when the pointer is over the control. A member of [**MousePointerConstants**](../../VBRUN/Constants/MousePointerConstants).

### MultiSelect
{: .no_toc }

The selection mode. A member of [**MultiSelectConstants**](../../VBRUN/Constants/MultiSelectConstants): **vbMultiSelectNone** (0, default — single selection), **vbMultiSelectSimple** (1 — each click toggles), or **vbMultiSelectExtended** (2 — **Shift** for ranges, **Ctrl** for individual toggles). Changing this at run time recreates the underlying window; the items, [**ItemData**](#itemdata) values, focused item, and (in **vbListBoxCheckbox** mode) check states are restored, but multi-item selections are not. Effective only in **vbListBoxStandard** mode — see [Style](#style).

### Name
{: .no_toc }

The unique design-time name of the control on its parent form. Read-only at run time.

### NewIndex
{: .no_toc }

The zero-based index at which the most recent [**AddItem**](#additem) call inserted its item, or `-1` if no item has been added since the control was created. Particularly useful when [**Sorted**](#sorted) is **True** and the resulting position cannot be predicted from the call. **Long**, read-only.

### OLEDragMode
{: .no_toc }

Whether the control acts as an automatic OLE drag source. A member of [**OLEDragConstants**](../../VBRUN/Constants/OLEDragConstants): **vbOLEDragManual** (0, default — call [**OLEDrag**](#oledrag) from code) or **vbOLEDragAutomatic** (1 — dragging an item starts an OLE drag whose **Text** data is the dragged item's text in single-select mode, or every selected item's text separated by **vbCrLf** in multi-select mode).

### OLEDropMode
{: .no_toc }

How the control responds to OLE drops. A restricted member of [**OLEDropConstants**](../../VBRUN/Constants/OLEDropConstants): **vbOLEDropNone** or **vbOLEDropManual**. Automatic-drop mode is not supported on a ListBox.

### Opacity
{: .no_toc }

The control's opacity as a percentage (0–100, default 100). Values outside the range are clamped on **Initialize**. Requires Windows 8 or later for child controls.

### Parent
{: .no_toc }

A reference to the [**Form**](../Form/) (or **UserControl**) that ultimately contains this list box. Read-only.

### RightToLeft
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### SelCount
{: .no_toc }

The number of items currently selected, as a **Long**. Read-only. Always `0` or `1` when [**MultiSelect**](#multiselect) is **vbMultiSelectNone** or when [**Style**](#style) is non-standard.

### Selected
{: .no_toc }

The selection state of an individual item — or, in **vbListBoxCheckbox** mode, the check state.

Syntax: *object*.**Selected**( *Index* ) [ = *boolean* ]

*Index*
: *required* A **Long** zero-based item position.

In **vbListBoxStandard** mode, reading **Selected(*Index*)** returns **True** when that item is selected, and assigning a value updates the selection. In single-select mode (**vbMultiSelectNone**), assigning **True** selects that item; assigning **False** has no observable effect. In multi-select modes, assignments toggle the corresponding item's membership in the selection set independently of the focused item. Each assignment that changes the state raises [**Click**](#click).

In **vbListBoxCheckbox** mode, **Selected(*Index*)** reads or writes the per-item check state. Each assignment that changes the state raises [**ItemCheck**](#itemcheck).

In **vbListBoxColorSwatch** mode, **Selected(*Index*)** behaves as in single-select standard mode (the swatch styling is purely a display variant).

### Sorted
{: .no_toc }

When **True**, items added with [**AddItem**](#additem) are inserted in alphabetical order regardless of the *Index* argument; when **False** (default), they are inserted at the requested position (or appended). **Boolean**. Changing this at run time recreates the underlying window with the existing items re-added.

### Style
{: .no_toc }

Selects one of the three rendering modes. A member of [**ListBoxConstants**](../../VBRUN/Constants/ListBoxConstants): **vbListBoxStandard** (0, default), **vbListBoxCheckbox** (1), or **vbListBoxColorSwatch** (2). See [Style](#style) above for the layout and behaviour differences. Changing **Style** at run time recreates the underlying window.

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

The text of the focused item, or an empty string when [**ListIndex**](#listindex) is `-1`. **Default property.**

Syntax: *object*.**Text** [ = *string* ]

Reading **Text** returns `List(ListIndex)` — reading it when no item is focused raises run-time error 5 (*Invalid procedure call or argument*). Setting **Text** searches the list for an exact, case-insensitive match (using `LB_FINDSTRINGEXACT`) and selects the matching item if found; if no item matches, [**ListIndex**](#listindex) is set to `-1` and the current selection is cleared.

### ToolTipText
{: .no_toc }

A multi-line **String** displayed as a tooltip when the user hovers over the control.

### Top
{: .no_toc }

The vertical distance from the top of the container to the top of the control. **Single**.

### TopIndex
{: .no_toc }

The zero-based index of the item shown at the top of the visible area. **Long**. Assigning a value scrolls the list so that item is at the top; the [**Scroll**](#scroll) event is raised when the value actually changes.

### TransparencyKey
{: .no_toc }

An **OLE_COLOR** that, when set, becomes fully transparent in the rendered control. Default `-1` disables the effect. Requires Windows 8 or later for child controls.

### UseTabStops
{: .no_toc }

When **True** (default), `vbTab` characters embedded in item text are expanded to the OS's standard list-box tab stops, so multi-column-aligned text can be rendered in a single-column list. When **False**, tab characters are drawn literally. **Boolean**. Changing this at run time recreates the underlying window.

### Visible
{: .no_toc }

Whether the control is shown. **Boolean**, default **True**.

### VisualStyles
{: .no_toc }

Whether the OS theme engine should be used when drawing the control. **Boolean**, default **True**. Affects the rendering of the per-item check box in **vbListBoxCheckbox** mode (themed vs. classic flat-style box).

### WhatsThisHelpID
{: .no_toc }

A **Long** identifying a "What's This?" help-pop-up topic in the application's help file. See [**ShowWhatsThis**](#showwhatsthis).

### WheelScrollEvent
{: .no_toc }

When **True** (default), mouse-wheel notifications over the control raise the [**Scroll**](#scroll) event; when **False**, the wheel still scrolls the list but [**Scroll**](#scroll) is suppressed. **Boolean**. VB6 never raised **Scroll** for wheel events; set this to **False** to match that behaviour exactly.

### Width
{: .no_toc }

The control's width. **Single**. In a multi-column layout, also determines the column width — see [Multi-column display](#multi-column-display).

## Methods

### AddItem
{: .no_toc }

Inserts a new item into the list and stores the resulting position in [**NewIndex**](#newindex). In **vbListBoxCheckbox** mode the new item is unchecked; existing items keep their check state.

Syntax: *object*.**AddItem** *Value* [, *Index* ]

*Value*
: *required* A **String** giving the text of the new item.

*Index*
: *optional* A **Long** zero-based position to insert at. Omit to append to the end. Out-of-range indices raise run-time error 5. Ignored when [**Sorted**](#sorted) is **True**.

### Clear
{: .no_toc }

Removes every item from the list, including any associated [**ItemData**](#itemdata) values and check states.

Syntax: *object*.**Clear**

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

### RemoveItem
{: .no_toc }

Removes the item at the given zero-based position, along with its [**ItemData**](#itemdata) value. Items below it shift up by one, and (in **vbListBoxCheckbox** mode) their check states shift up with them.

Syntax: *object*.**RemoveItem** *Index*

*Index*
: *required* A **Long** zero-based position.

### SelectedIndices
{: .no_toc }

Returns the zero-based indices of every currently-selected item as a **Collection** of **Long** values, in ascending order. Useful for iterating multi-selections without scanning [**Selected**](#selected) for every index.

Syntax: *object*.**SelectedIndices**

```tb
Dim idx As Variant
For Each idx In List1.SelectedIndices()
    Debug.Print idx & ": " & List1.List(idx)
Next
```

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

Raised after the focused item changes — whether the user clicked a different entry, used the keyboard to move the focus, or code assigned a different value to [**ListIndex**](#listindex) or [**Selected**](#selected). Also raised when the previously selected item is cancelled (`LBN_SELCANCEL`). **Default event.**

Syntax: *object*\_**Click**( )

### DblClick
{: .no_toc }

Raised when the user double-clicks an entry. Typically used to act on the highlighted item — for example, opening it.

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

Raised once, immediately after the underlying window is created and the design-time items have been added. New in twinBASIC — VB6 had no equivalent on this control.

Syntax: *object*\_**Initialize**( )

### ItemCheck
{: .no_toc }

Raised in **vbListBoxCheckbox** mode each time the check state of an item changes — whether the user clicked its check box, pressed **Space**, or code assigned to [**Selected**](#selected). Not raised in the other styles.

Syntax: *object*\_**ItemCheck**( *Item* **As Integer** )

*Item*
: The zero-based index of the toggled item.

> [!NOTE]
> Items beyond index 32768 do not raise **ItemCheck** because the event signature uses **Integer**. Read [**Selected**](#selected) directly to inspect higher-indexed items.

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

Raised on the source control at the start of an OLE drag, so the application can populate the **DataObject** and choose the allowed effects. Fires whether the drag was initiated automatically (with [**OLEDragMode**](#oledragmode) set to **vbOLEDragAutomatic**) or by an explicit [**OLEDrag**](#oledrag) call.

Syntax: *object*\_**OLEStartDrag**( *Data* **As DataObject**, *AllowedEffects* **As Long** )

### Scroll
{: .no_toc }

Raised when the visible portion of the list scrolls — by the scroll bar, the keyboard, or (when [**WheelScrollEvent**](#wheelscrollevent) is **True**) the mouse wheel. The new offset can be read from [**TopIndex**](#topindex).

Syntax: *object*\_**Scroll**( )

### Validate
{: .no_toc }

Raised when the focus is moving to another control whose [**CausesValidation**](#causesvalidation) is **True**. Setting *Cancel* to **True** keeps the focus on this control.

Syntax: *object*\_**Validate**( *Cancel* **As Boolean** )
