---
title: TreeView
parent: WinNativeCommonCtls Package
permalink: /tB/Packages/WinNativeCommonCtls/TreeView/
has_toc: false
---

# TreeView class
{: .no_toc }

A **TreeView** is a hierarchical display of [**Node**](Node) objects organized into a tree. Each node can be expanded or collapsed, optionally has a checkbox, and references an icon from an associated [**ImageList**](../ImageList/). The collection of nodes is reached through [**Nodes**](#nodes); each [**Node**](Node) has its own siblings, parent, and child navigation properties.

```tb
Private Sub Form_Load()
    Set TreeView1.ImageList = ImageList1
    TreeView1.Style = tvwTreelinesPlusMinusPictureText

    Dim root As Node
    Set root = TreeView1.Nodes.Add(, , "root", "My Computer", "computer")
    TreeView1.Nodes.Add root, tvwChild, "c", "C: drive", "disk"
    TreeView1.Nodes.Add root, tvwChild, "d", "D: drive", "disk"
    root.Expanded = True
End Sub

Private Sub TreeView1_NodeClick(ByVal Node As Node)
    Debug.Print "Clicked: " & Node.FullPath
End Sub
```

The control inherits the focusable rect-dockable members from `BaseControlFocusable` — size, position, **Anchors**, **Dock**, **Font**, **Appearance**, **MousePointer** / **MouseIcon**, **ToolTipText**, **DragMode** / **DragIcon**, **Drag**, **Refresh**, **SetFocus**, **TabIndex** / **TabStop**, **ZOrder**, **CausesValidation**, **VisualStyles**, **hWnd**, **HelpContextID** / **WhatsThisHelpID**.

* TOC
{:toc}

## Style: a composite of buttons / lines / icons / text

[**Style**](#style) is the most-clicked property on this control. It is a single enum value but the eight choices encode a 3-bit combination of which visual elements appear:

| [**Style**](#style)                                | Buttons | Lines | Icons |
|----------------------------------------------------|---------|-------|-------|
| **tvwTextOnly**                                    | —       | —     | —     |
| **tvwPictureText**                                 | —       | —     | yes   |
| **tvwPlusMinusText**                               | yes     | —     | —     |
| **tvwPlusMinusPictureText**                        | yes     | —     | yes   |
| **tvwTreelinesText**                               | —       | yes   | —     |
| **tvwTreelinesPictureText**                        | —       | yes   | yes   |
| **tvwTreelinesPlusMinusText**                      | yes     | yes   | —     |
| **tvwTreelinesPlusMinusPictureText** (default)     | yes     | yes   | yes   |

The values are decoded internally into the Win32 `TVS_HASBUTTONS` / `TVS_HASLINES` style bits.

## Sorting

Sorting is configured at two levels:

- The **TreeView** as a whole sorts its root-level nodes when [**Sorted**](#sorted) is **True**, using [**SortOrder**](#sortorder) and [**SortType**](#sorttype) to control direction and comparison.
- Each individual [**Node**](Node) has its own [**Sorted**](Node#sorted) / [**SortOrder**](Node#sortorder) / [**SortType**](Node#sorttype) properties, which control how *its* children are sorted, independently of the tree-level setting.

Toggling either flag triggers an immediate sort. New nodes added after a node has been sorted are inserted into the correct sorted position.

## Image lists and image references

Bind an [**ImageList**](../ImageList/) through [**ImageList**](#imagelist). Each [**Node**](Node) references icons through [**Image**](Node#image) (rendered when the node is not selected) and [**SelectedImage**](Node#selectedimage) (rendered when the node is selected); either accepts a 1-based **Long** index or a **String** key into the bound image list. Omitting [**SelectedImage**](Node#selectedimage) defaults the selected icon to the same as [**Image**](Node#image).

## Checkboxes

Setting [**CheckBoxes**](#checkboxes) to **True** adds a leading checkbox to every node. The user can click the checkbox or press **Space** while a node is focused to toggle; the [**NodeCheck**](#nodecheck) event then fires. [**Node.Checked**](Node#checked) reads and writes the check state programmatically.

Properties
----------

### Appearance
{: .no_toc }

How the control's border is drawn. A [**AppearanceConstants**](../../VBRUN/Constants/AppearanceConstants) member. Default: **vbAppear3d**. Inherited.

### BorderStyle
{: .no_toc }

The control's border style. A member of [**TreeBorderStyleConstants**](../Enumerations/TreeBorderStyleConstants): **ccNone** or **ccFixedSingle**. Default: **ccFixedSingle**.

### CheckBoxes
{: .no_toc }

Whether each node has a leading checkbox. **Boolean**. Default: **False**.

### DropHighlight
{: .no_toc }

The [**Node**](Node) currently highlighted as a drag-drop target, or **Nothing**. **Node**, read/write.

### FullRowSelect
{: .no_toc }

Whether clicking on the indentation area of a row selects the node (instead of only clicking on its icon or label). **Boolean**. Default: **False**.

### HideSelection
{: .no_toc }

Whether the selection highlight is hidden when the control does not have focus. **Boolean**. Default: **True**.

### HotTracking
{: .no_toc }

Whether nodes are highlighted as the mouse hovers over them. **Boolean**. Default: **False**.

### hWnd
{: .no_toc }

The Win32 handle of the treeview window. **LongPtr**, read-only.

### hWndLabelEdit
{: .no_toc }

The Win32 handle of the currently editing label's textbox window, or `0`. **LongPtr**, read-only.

### ImageList
{: .no_toc }

The [**ImageList**](../ImageList/) used for node icons. Assignment increments the **ImageList**'s bound-count.

### Indentation
{: .no_toc }

The horizontal pixel indent per level of node depth. **Double**, read/write. Default: `20`.

### LabelEdit
{: .no_toc }

How inline label editing is triggered. A member of [**TreeLabelEditConstants**](../Enumerations/TreeLabelEditConstants): **tvwAutomatic**, **tvwManual**, or **tvwDisabled**. Default: **tvwAutomatic**.

### LineStyle
{: .no_toc }

Whether tree lines are drawn from root nodes or only from child nodes. A member of [**TreeLineStyleConstants**](../Enumerations/TreeLineStyleConstants): **tvwTreeLines** or **tvwRootLines**. Default: **tvwRootLines**.

### Nodes
{: .no_toc }

The [**Nodes**](Nodes) collection. Read-only.

### PathSeparator
{: .no_toc }

The string inserted between node texts in [**Node.FullPath**](Node#fullpath). **String**. Default: `"\"`.

### Scroll
{: .no_toc }

Whether the treeview has scrollbars (when its content extends beyond the visible area). **Boolean**. Default: **True**.

### SelectedItem
{: .no_toc }

The currently selected [**Node**](Node), or **Nothing**. Read/write.

### SingleSel
{: .no_toc }

Whether only a single node can be expanded at any time (any other expansion automatically collapses sibling subtrees). **Boolean**. Default: **False**.

### Sorted
{: .no_toc }

Whether root-level nodes are sorted. **Boolean**. Default: **False**. Per-subtree sorting is controlled through [**Node.Sorted**](Node#sorted) on individual nodes.

### SortOrder
{: .no_toc }

The sort direction at the root level. A member of [**TreeSortOrderConstants**](../Enumerations/TreeSortOrderConstants). Default: **tvwAscending**.

### SortType
{: .no_toc }

The string comparison used for sorting at the root level. A member of [**TreeSortTypeConstants**](../Enumerations/TreeSortTypeConstants): **tvwBinary** (case-sensitive) or **tvwText** (case-insensitive). Default: **tvwText**.

### Style
{: .no_toc }

The composite visual style — see [the **Style** table above](#style-a-composite-of-buttons--lines--icons--text). A member of [**TreeStyleConstants**](../Enumerations/TreeStyleConstants). Default: **tvwTreelinesPlusMinusPictureText**.

### WheelScrollEvent
{: .no_toc }

Whether mouse-wheel events trigger [**Scroll**](#scroll-event). **Boolean**. Default: **True**.

Methods
-------

### GetVisibleCount
{: .no_toc }

Returns the maximum number of fully-visible nodes the current viewport can show. **Long**.

Syntax: *object*.**GetVisibleCount** **As Long**

### HitTest
{: .no_toc }

Returns the [**Node**](Node) at the given point, or **Nothing** if no node lies under it. Useful for drag-drop hover effects, custom context menus, and right-click handling.

Syntax: *object*.**HitTest** ( *x*, *y* ) **As Node**

*x*
: A **Single** horizontal coordinate in the control's coordinate system (twips by default).

*y*
: A **Single** vertical coordinate.

### StartLabelEdit
{: .no_toc }

Opens the inline editor on the currently selected node. Used when [**LabelEdit**](#labeledit) is **tvwManual**.

Syntax: *object*.**StartLabelEdit**

Events
------

### AfterLabelEdit
{: .no_toc }

Raised when an inline label edit completes. Set *Cancel* to **True** to revert the change.

Syntax: *object*\_**AfterLabelEdit**( *Cancel* **As Boolean**, *NewString* **As String** )

### BeforeCollapse
{: .no_toc }

Raised before a node is collapsed. Set *Cancel* to **True** to prevent the collapse.

Syntax: *object*\_**BeforeCollapse**( **ByVal** *Node* **As Node**, **ByRef** *Cancel* **As Boolean** )

### BeforeExpand
{: .no_toc }

Raised before a node is expanded. Set *Cancel* to **True** to prevent the expansion.

Syntax: *object*\_**BeforeExpand**( **ByVal** *Node* **As Node**, **ByRef** *Cancel* **As Boolean** )

### BeforeLabelEdit
{: .no_toc }

Raised when an inline label edit is about to start. Set *Cancel* to **True** to block the edit.

Syntax: *object*\_**BeforeLabelEdit**( *Cancel* **As Boolean** )

### Click
{: .no_toc }

Raised on a mouse click inside the control. Distinct from [**NodeClick**](#nodeclick), which fires when the click hits a node.

Syntax: *object*\_**Click**( )

### Collapse
{: .no_toc }

Raised after a node has been collapsed.

Syntax: *object*\_**Collapse**( **ByVal** *Node* **As Node** )

### DblClick
{: .no_toc }

Raised on a double-click inside the control.

Syntax: *object*\_**DblClick**( )

### DragDrop, DragOver
{: .no_toc }

Inherited drag-drop events.

### Expand
{: .no_toc }

Raised after a node has been expanded.

Syntax: *object*\_**Expand**( **ByVal** *Node* **As Node** )

### Initialize
{: .no_toc }

Raised after the control's window has been created.

### KeyDown, KeyPress, KeyUp
{: .no_toc }

Inherited keyboard events. Pressing **Space** while [**CheckBoxes**](#checkboxes) is **True** toggles the focused node's check state and fires [**NodeCheck**](#nodecheck).

### MouseDown, MouseMove, MouseUp
{: .no_toc }

Inherited mouse events.

### NodeCheck
{: .no_toc }

Raised when a node's checkbox is toggled — either by the user clicking it, by **Space** keypress, or by code assigning [**Node.Checked**](Node#checked).

Syntax: *object*\_**NodeCheck**( **ByVal** *Node* **As Node** )

### NodeClick
{: .no_toc }

Raised when a node is clicked. Distinct from [**Click**](#click), which fires on any mouse click in the control regardless of where it lands.

Syntax: *object*\_**NodeClick**( **ByVal** *Node* **As Node** )

### NodeSelect
{: .no_toc }

Raised when a node becomes the selected node — either by user click, by keyboard arrow navigation, or by code assigning [**SelectedItem**](#selecteditem).

Syntax: *object*\_**NodeSelect**( **ByVal** *Node* **As Node** )

### OLECompleteDrag, OLEDragDrop, OLEDragOver, OLEGiveFeedback, OLESetData, OLEStartDrag
{: .no_toc }

Inherited OLE drag-and-drop events.

### Scroll
{: #scroll-event .no_toc }

Raised when the treeview scrolls. New to this twinBASIC implementation; the original VB6 control did not expose this event. Set [**WheelScrollEvent**](#wheelscrollevent) to **False** to suppress firing on mouse-wheel input.

Syntax: *object*\_**Scroll**( )

### Validate
{: .no_toc }

Inherited validation event.

## See Also

- [Node](Node) -- a single node in the tree
- [Nodes](Nodes) -- the collection of nodes
- [ImageList](../ImageList/) -- the picture source for node icons
- [TreeBorderStyleConstants](../Enumerations/TreeBorderStyleConstants), [TreeLabelEditConstants](../Enumerations/TreeLabelEditConstants), [TreeLineStyleConstants](../Enumerations/TreeLineStyleConstants), [TreeStyleConstants](../Enumerations/TreeStyleConstants), [TreeRelationshipConstants](../Enumerations/TreeRelationshipConstants), [TreeSortOrderConstants](../Enumerations/TreeSortOrderConstants), [TreeSortTypeConstants](../Enumerations/TreeSortTypeConstants) -- the seven user-facing TreeView enums
- [ControlTypeConstants](../../VBRUN/Constants/ControlTypeConstants) -- where **vbTreeView** lives
