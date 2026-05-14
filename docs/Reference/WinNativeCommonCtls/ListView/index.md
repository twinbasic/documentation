---
title: ListView
parent: WinNativeCommonCtls Package
permalink: /tB/Packages/WinNativeCommonCtls/ListView/
has_toc: false
---

# ListView class
{: .no_toc }

A **ListView** is a flexible multi-column / icon list with four distinct visual modes selected through the [**View**](#view) property:

| [**View**](#view)              | Description                                                                        |
|--------------------------------|------------------------------------------------------------------------------------|
| **lvwIcon**                    | Large icons in a wrapping grid; each item shows an icon plus its label.            |
| **lvwSmallIcon**               | Small icons in a wrapping grid.                                                    |
| **lvwList**                    | A single column of small-icon-plus-label entries, wrapped into multiple columns to fit. |
| **lvwReport**                  | Multi-column table view with header row; columns are defined through [**ColumnHeaders**](ColumnHeaders). |

The two main collections are accessed through properties: [**ListItems**](#listitems) for the rows, and [**ColumnHeaders**](#columnheaders) for the **Report**-view column headers.

```tb
Private Sub Form_Load()
    ' Bind an image list and configure the view
    Set ListView1.SmallIcons = ImageList1
    ListView1.View = lvwReport

    ' Define columns
    ListView1.ColumnHeaders.Add , "name",  "Name",  150
    ListView1.ColumnHeaders.Add , "type",  "Type",   80
    ListView1.ColumnHeaders.Add , "size",  "Size",   80, lvwColumnRight

    ' Add rows
    Dim item As ListItem
    Set item = ListView1.ListItems.Add(, "doc1", "Report.docx", "doc")
    item.SubItems(1) = "Word document"
    item.SubItems(2) = "24 KB"
End Sub

Private Sub ListView1_ItemClick(Item As ListItem)
    Debug.Print "Clicked: " & Item.Text
End Sub
```

The control inherits the focusable rect-dockable members from `BaseControlFocusable` --- size, position, **Anchors**, **Dock**, **Font**, **Appearance**, **MousePointer** / **MouseIcon**, **ToolTipText**, **DragMode** / **DragIcon**, **Drag**, **Refresh**, **SetFocus**, **TabIndex** / **TabStop**, **ZOrder**, **CausesValidation**, **VisualStyles**, **hWnd**, **HelpContextID** / **WhatsThisHelpID**.

* TOC
{:toc}

## Image lists

A **ListView** can bind to three independent [**ImageList**](../ImageList/) instances, one per role:

- **[Icons](#icons)** --- large icons rendered in **lvwIcon** view.
- **[SmallIcons](#smallicons)** --- small icons rendered in **lvwSmallIcon**, **lvwList**, and **lvwReport** views.
- **[ColumnHeaderIcons](#columnheadericons)** --- small icons rendered inside the report-view column headers, addressed per-column through [**ColumnHeader.Icon**](ColumnHeader#icon).

A [**ListItem**](ListItem) selects its icons through its **Icon** and **SmallIcon** properties, which can be either a 1-based **Long** index or a **String** key into the respective image list.

## Selection and label editing

Selection is single-row by default; setting [**MultiSelect**](#multiselect) to **True** lets the user **Ctrl**-click and **Shift**-click multiple items. The currently focused item is exposed as [**SelectedItem**](#selecteditem) (a [**ListItem**](ListItem)) and [**SelectedItemIndex**](#selecteditemindex) (a **Long**). [**ListItem.Selected**](ListItem#selected) reads / writes selection on an individual row.

[**LabelEdit**](#labeledit) controls inline label editing:

- **lvwAutomatic** --- clicking an already-selected item starts an edit (after a short delay; this is the F2 / single-click-and-pause pattern).
- **lvwManual** --- only programmatic [**StartLabelEdit**](#startlabeledit) calls open an editor.
- **lvwDisabled** --- labels cannot be edited.

Edit start fires [**BeforeLabelEdit**](#beforelabeledit) (cancellable), and edit end fires [**AfterLabelEdit**](#afterlabeledit) (cancellable, with the proposed new text).

## Sorting, column reordering, and the header

In **lvwReport** view, clicking a column header fires [**ColumnClick**](#columnclick), letting the application implement sorting (the package does not auto-sort). When [**AllowColumnReorder**](#allowcolumnreorder) is **True** in **lvwReport** view, the user can drag column headers to reorder them; the resulting order is reflected through [**ColumnHeader.Position**](ColumnHeader#position).

[**hWndHeader**](#hwndheader) is the Win32 handle of the embedded `SysHeader32` window, exposed for raw Win32 customization.

Properties
----------

### AllowColumnReorder
{: .no_toc }

Whether the user can drag column headers to reorder them. **Boolean**. Default: **False**. Only effective in **lvwReport** view.

### Appearance
{: .no_toc }

How the control's border is drawn. A [**AppearanceConstants**](../../VBRUN/Constants/AppearanceConstants) member. Default: **vbAppear3d**. Inherited.

### Arrange
{: .no_toc }

How items are arranged in icon / small-icon view. A member of [**ListArrangeConstants**](#listarrangeconstants). Default: **lvwNone**.

### BackColor
{: .no_toc }

The background color of the list area. **OLE_COLOR**. Default: **vbWindowBackground**.

### BorderStyle
{: .no_toc }

The control's border style. A [**TreeBorderStyleConstants**](../Enumerations/TreeBorderStyleConstants) member: **ccNone** or **ccFixedSingle**. Default: **ccFixedSingle**. The enum is shared with [**TreeView**](../TreeView/).

### CheckBoxes
{: .no_toc }

Whether each row has a leading checkbox. **Boolean**. Default: **False**. When **True**, fires [**ItemCheck**](#itemcheck) on click.

### ColumnHeaderIcons
{: .no_toc }

The [**ImageList**](../ImageList/) used for column-header icons in **lvwReport** view. Individual columns reference an icon by setting [**ColumnHeader.Icon**](ColumnHeader#icon).

### ColumnHeaders
{: .no_toc }

The [**ColumnHeaders**](ColumnHeaders) collection. Read-only.

### FlatScrollBar
{: .no_toc }

Whether the control uses flat (rather than 3D) scrollbars. **Boolean**. Default: **False**.

### FullRowSelect
{: .no_toc }

Whether clicking on any cell in a row selects the entire row (as opposed to clicking only on the first column's text). **Boolean**. Default: **False**. Only meaningful in **lvwReport** view.

### GridLines
{: .no_toc }

Whether gridlines are drawn between rows and columns. **Boolean**. Default: **False**. Only meaningful in **lvwReport** view.

### HideColumnHeaders
{: .no_toc }

Whether the column header row is hidden in **lvwReport** view. **Boolean**. Default: **False**.

### HideSelection
{: .no_toc }

Whether selection highlight is hidden when the control does not have focus. **Boolean**. Default: **True**.

### HotTracking
{: .no_toc }

Whether items are highlighted as the mouse hovers over them (and tracked-click selection is enabled). **Boolean**. Default: **False**.

### hWnd
{: .no_toc }

The Win32 handle of the listview window. **LongPtr**, read-only.

### hWndHeader
{: .no_toc }

The Win32 handle of the embedded column-header window (`SysHeader32`). **LongPtr**, read-only. Tagged `[Hidden]` `[NonBrowsable]` --- exposed only for advanced Win32 customization (e.g. subclassing the header).

### Icons
{: .no_toc }

The [**ImageList**](../ImageList/) used for large icons in **lvwIcon** view. Assignment increments the bound-count on the **ImageList** (and decrements the previous one's); see the [bound-count caveat](../ImageList/#binding-to-consumers).

### LabelEdit
{: .no_toc }

How inline label editing is triggered. A member of [**ListLabelEditConstants**](#listlabeleditconstants). Default: **lvwAutomatic**.

### LabelWrap
{: .no_toc }

Whether item labels wrap to multiple lines in **lvwIcon** view. **Boolean**. Default: **True**.

### ListItems
{: .no_toc }

The [**ListItems**](ListItems) collection --- the rows of the list. Read-only.

### MultiSelect
{: .no_toc }

Whether the user can select multiple items. **Boolean**. Default: **False**.

### SelectedItem
{: .no_toc }

The currently focused [**ListItem**](ListItem), or **Nothing** if no row is focused. Read-only --- to change selection, assign to [**ListItem.Selected**](ListItem#selected).

### SelectedItemIndex
{: .no_toc }

The 1-based index of the currently focused row, or `-1` if no row is focused. **Long**, read-only.

### SmallIcons
{: .no_toc }

The [**ImageList**](../ImageList/) used for small icons in **lvwSmallIcon**, **lvwList**, and **lvwReport** views.

### TextBackground
{: .no_toc }

Whether item-label text has an opaque background. A member of [**ListTextBackgroundConstants**](#listtextbackgroundconstants). Default: **lvwTransparent**.

### View
{: .no_toc }

The visual mode. A member of [**ListViewConstants**](#listviewconstants). Default: **lvwIcon**.

Methods
-------

### GetFirstVisible
{: .no_toc }

Returns the first [**ListItem**](ListItem) currently visible in the viewport. Useful for virtualized scenarios where the application updates row content based on what the user is looking at.

Syntax: *object*.**GetFirstVisible** **As ListItem**

### StartLabelEdit
{: .no_toc }

Opens the inline editor on the currently selected row. Used when [**LabelEdit**](#labeledit) is **lvwManual**.

Syntax: *object*.**StartLabelEdit**

Events
------

### AfterLabelEdit
{: .no_toc }

Raised when an inline label edit completes. Set *Cancel* to **True** to revert; *NewString* holds the user's proposed new text.

Syntax: *object*\_**AfterLabelEdit**( *Cancel* **As Boolean**, *NewString* **As String** )

### BeforeLabelEdit
{: .no_toc }

Raised when an inline label edit is about to start. Set *Cancel* to **True** to block the edit.

Syntax: *object*\_**BeforeLabelEdit**( *Cancel* **As Boolean** )

### Click
{: .no_toc }

Raised on a mouse click inside the control. Distinct from [**ItemClick**](#itemclick), which fires only when the click hits a row.

Syntax: *object*\_**Click**( )

### ColumnClick
{: .no_toc }

Raised when the user clicks a column header in **lvwReport** view.

Syntax: *object*\_**ColumnClick**( *ColumnHeader* **As ColumnHeader** )

### DblClick
{: .no_toc }

Raised on a double-click inside the control.

Syntax: *object*\_**DblClick**( )

### DragDrop, DragOver
{: .no_toc }

Inherited drag-drop events.

### Initialize
{: .no_toc }

Raised after the control's window has been created.

### ItemCheck
{: .no_toc }

Raised when the user toggles the checkbox on a row (only when [**CheckBoxes**](#checkboxes) is **True**).

Syntax: *object*\_**ItemCheck**( *Item* **As ListItem** )

### ItemClick
{: .no_toc }

Raised when a row becomes selected (via mouse click or keyboard navigation).

Syntax: *object*\_**ItemClick**( *Item* **As ListItem** )

### KeyDown, KeyPress, KeyUp
{: .no_toc }

Inherited keyboard events.

### MouseDown, MouseMove, MouseUp
{: .no_toc }

Inherited mouse events.

### OLECompleteDrag, OLEDragDrop, OLEDragOver, OLEGiveFeedback, OLESetData, OLEStartDrag
{: .no_toc }

Inherited OLE drag-and-drop events.

### Scroll
{: .no_toc }

> [!NOTE]
> The **Scroll** event is declared on the control but tagged `[Unimplemented]` in the current source. It is reserved for a future release; do not rely on it.

### Validate
{: .no_toc }

Inherited validation event.

## ListViewConstants
{: #listviewconstants }

Determines the visual mode of a **ListView**. Declared on the **ListView** class.

| Member                | Value | Description                                                          |
|-----------------------|-------|----------------------------------------------------------------------|
| **lvwIcon**{: #ListViewConstants_lvwIcon }           | 0 | Large icons in a wrapping grid.                            |
| **lvwSmallIcon**{: #ListViewConstants_lvwSmallIcon } | 1 | Small icons in a wrapping grid.                            |
| **lvwList**{: #ListViewConstants_lvwList }           | 2 | Single-column list (wrapping into multiple columns).        |
| **lvwReport**{: #ListViewConstants_lvwReport }       | 3 | Multi-column report view with header row.                   |

## ListArrangeConstants
{: #listarrangeconstants }

Determines how items are auto-arranged in icon / small-icon view. Declared on the **ListView** class.

| Member                 | Value | Description                                            |
|------------------------|-------|--------------------------------------------------------|
| **lvwNone**{: #ListArrangeConstants_lvwNone }         | 0 | No auto-arrangement; items stay where they were placed. |
| **lvwAutoLeft**{: #ListArrangeConstants_lvwAutoLeft } | 1 | Items auto-flow left-to-right.                          |
| **lvwAutoTop**{: #ListArrangeConstants_lvwAutoTop }   | 2 | Items auto-flow top-to-bottom.                          |

## ListTextBackgroundConstants
{: #listtextbackgroundconstants }

Determines whether item-label text has an opaque or transparent background. Declared on the **ListView** class.

| Member                | Value | Description                                                       |
|-----------------------|-------|-------------------------------------------------------------------|
| **lvwTransparent**{: #ListTextBackgroundConstants_lvwTransparent } | 0 | Item text overlays the list background unchanged.   |
| **lvwOpaque**{: #ListTextBackgroundConstants_lvwOpaque }           | 1 | Item text is drawn with an opaque background matching [**BackColor**](#backcolor). |

## ListLabelEditConstants
{: #listlabeleditconstants }

Determines when inline label editing is triggered. Declared on the **ListView** class.

| Member             | Value | Description                                                                |
|--------------------|-------|----------------------------------------------------------------------------|
| **lvwAutomatic**{: #ListLabelEditConstants_lvwAutomatic } | 0 | F2 or click-and-pause on a selected row starts an edit. |
| **lvwManual**{: #ListLabelEditConstants_lvwManual }       | 1 | Only [**StartLabelEdit**](#startlabeledit) opens an editor. |
| **lvwDisabled**{: #ListLabelEditConstants_lvwDisabled }   | 2 | Label editing is disabled entirely. |

## See Also

- [ListItem](ListItem) -- a single row
- [ListItems](ListItems) -- the collection of rows
- [ColumnHeader](ColumnHeader) -- a single column header (Report view)
- [ColumnHeaders](ColumnHeaders) -- the column header collection
- [ImageList](../ImageList/) -- the picture source for [**Icons**](#icons), [**SmallIcons**](#smallicons), and [**ColumnHeaderIcons**](#columnheadericons)
- [TreeBorderStyleConstants](../Enumerations/TreeBorderStyleConstants) -- the [**BorderStyle**](#borderstyle) enum shared with [**TreeView**](../TreeView/)
- [ControlTypeConstants](../../VBRUN/Constants/ControlTypeConstants) -- where **vbListView** lives
