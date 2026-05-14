---
title: Node
parent: TreeView
grand_parent: WinNativeCommonCtls Package
permalink: /tB/Packages/WinNativeCommonCtls/TreeView/Node
has_toc: false
---

# Node class
{: .no_toc }

A **Node** is a single entry in a [**TreeView**](.)'s [**Nodes**](Nodes) collection. Returned from [**Nodes.Add**](Nodes#add) and from [**Nodes.Item**](Nodes#item). Each node has its own text, icons, sort settings, check state, and sibling / parent / child relationships.

The class is tagged `[COMCreatable(False)]` — user code reaches **Node** instances through the parent [**TreeView**](.)'s [**Nodes**](Nodes) collection or through navigation properties on other nodes.

```tb
Dim root As Node = TreeView1.Nodes.Add(, , "root", "My Computer")
Dim drive As Node = TreeView1.Nodes.Add(root, tvwChild, "c", "C: drive")
drive.Bold = True
drive.Image = "disk"

Debug.Print drive.FullPath              ' "My Computer\C: drive"
Debug.Print drive.Parent.Text           ' "My Computer"
Debug.Print drive.Root.Text             ' "My Computer"
```

* TOC
{:toc}

Properties
----------

### BackColor
{: .no_toc }

The background color used to render this node. **OLE_COLOR**. Default: **vbWindowBackground**.

### Bold
{: .no_toc }

Whether the node text is rendered in a bold font. **Boolean**. Default: **False**.

### Checked
{: .no_toc }

Whether the node's checkbox is checked. **Boolean**. Only meaningful when [**TreeView.CheckBoxes**](.#checkboxes) is **True**.

### Child
{: .no_toc }

The first child node of this node, or **Nothing** if it has no children. **Node**, read-only.

### Children
{: .no_toc }

The number of immediate child nodes of this node. **Long**, read-only.

### Expanded
{: .no_toc }

Whether the node is currently expanded (showing its children). **Boolean**, read/write. Assigning fires [**TreeView.BeforeExpand**](.#beforeexpand) / [**TreeView.BeforeCollapse**](.#beforecollapse) (cancellable) followed by [**TreeView.Expand**](.#expand) / [**TreeView.Collapse**](.#collapse).

### FirstSibling
{: .no_toc }

The first sibling of this node (the leftmost peer under the same parent). **Node**, read-only. If the node is itself the first sibling, returns the node.

### ForeColor
{: .no_toc }

The text color used to render this node. **OLE_COLOR**. Default: **vbWindowText**.

### FullPath
{: .no_toc }

The hierarchical path from the root to this node, with [**TreeView.PathSeparator**](.#pathseparator) inserted between node texts. **String**, read-only.

Example: a node "C: drive" whose parent is "My Computer" returns `"My Computer\C: drive"`.

### Image
{: .no_toc }

The icon rendered when the node is not selected. **Variant** — either a 1-based **Long** index into [**TreeView.ImageList**](.#imagelist), or a **String** key. Assignment validates against the bound image list.

### Index
{: .no_toc }

The 1-based position of this node in the parent collection. **Long**, read-only.

### Key
{: .no_toc }

The string key the node was added under. **String**, read/write.

### LastSibling
{: .no_toc }

The last sibling of this node (the rightmost peer under the same parent). **Node**, read-only.

### Next
{: .no_toc }

The next sibling of this node, or **Nothing** if this is the last sibling. **Node**, read-only.

### Parent
{: .no_toc }

The parent **Node**, or **Nothing** if this node is at the root level. **Node**, read/write. Note: assigning **Parent** does not move the node — it merely changes the recorded parent reference.

### Previous
{: .no_toc }

The previous sibling of this node, or **Nothing** if this is the first sibling. **Node**, read-only.

### Root
{: .no_toc }

The root node of the subtree this node belongs to. **Node**, read-only.

### Selected
{: .no_toc }

Whether this node is the [**TreeView.SelectedItem**](.#selecteditem) of the treeview. **Boolean**, read/write.

### SelectedImage
{: .no_toc }

The icon rendered when the node is selected. **Variant** — either an index or a key into [**TreeView.ImageList**](.#imagelist). When unset, defaults to the same as [**Image**](#image).

### Sorted
{: .no_toc }

Whether this node's children are sorted. **Boolean**. Default: **False**. Independent of [**TreeView.Sorted**](.#sorted), which controls root-level sorting.

### SortOrder
{: .no_toc }

The sort direction for this node's children. A member of [**TreeSortOrderConstants**](../Enumerations/TreeSortOrderConstants). Default: **tvwAscending**.

### SortType
{: .no_toc }

The string comparison used for sorting this node's children. A member of [**TreeSortTypeConstants**](../Enumerations/TreeSortTypeConstants): **tvwBinary** or **tvwText**. Default: **tvwText**.

### Tag
{: .no_toc }

Arbitrary data the application can attach to the node. **Variant**.

### Text
{: .no_toc }

The node's label text. **String**, read/write.

### Visible
{: .no_toc }

Whether the node is currently visible — i.e. not hidden because an ancestor is collapsed and not scrolled out of view. **Boolean**, read-only.

Methods
-------

### EnsureVisible
{: .no_toc }

Scrolls and expands ancestor nodes as necessary to make this node visible in the treeview.

Syntax: *object*.**EnsureVisible**

## See Also

- [TreeView](.) -- the parent control
- [Nodes](Nodes) -- the collection holding **Node** instances
- [TreeSortOrderConstants](../Enumerations/TreeSortOrderConstants), [TreeSortTypeConstants](../Enumerations/TreeSortTypeConstants) -- the **SortOrder** / **SortType** enums
