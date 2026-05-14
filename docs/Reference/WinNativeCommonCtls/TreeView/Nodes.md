---
title: Nodes
parent: TreeView
grand_parent: WinNativeCommonCtls Package
permalink: /tB/Packages/WinNativeCommonCtls/TreeView/Nodes
has_toc: false
---

# Nodes class
{: .no_toc }

The **Nodes** collection is the entry point for managing the [**Node**](Node) tree of a [**TreeView**](.). Accessed as `<treeView>.Nodes`; supports adding, removing, indexed access, and `For Each` iteration.

The class is tagged `[COMCreatable(False)]` --- user code accesses **Nodes** through the parent [**TreeView**](.) control's [**Nodes**](.#nodes) property.

```tb
With TreeView1.Nodes
    Dim root As Node
    Set root = .Add(, , "root", "My Computer")
    .Add root, tvwChild, "c", "C: drive"
    .Add root, tvwChild, "d", "D: drive"
End With

Dim node As Node
For Each node In TreeView1.Nodes
    Debug.Print node.Index, node.Key, node.FullPath
Next
```

The `For Each` iteration visits **only the nodes in the order they were added** --- not in tree order. For a depth-first or breadth-first traversal that follows the visual hierarchy, traverse the parent-child links manually starting from a root [**Node**](Node) and using [**Node.Child**](Node#child) / [**Node.Next**](Node#next).

* TOC
{:toc}

Properties
----------

### Count
{: .no_toc }

The total number of nodes in the treeview (root nodes plus all descendants). **Long**, read-only.

### Item
{: .no_toc }

Returns the [**Node**](Node) at the given index or with the given key. The default member, so `TreeView1.Nodes("root")` works without writing `.Item("root")`.

Syntax: *object*.**Item** ( *Index* ) **As Node**

*Index*
: A **Variant** --- either a 1-based **Long** position or a **String** key.

Methods
-------

### Add
{: .no_toc }

Adds a node to the treeview, optionally positioned relative to another node.

Syntax: *object*.**Add** ( [ *Relative* ] [, *Relationship* ] [, *Key* ] [, *Text* ] [, *Image* ] [, *SelectedImage* ] ) **As Node**

*Relative*
: *optional* A **Variant** identifying the existing node the new node will be positioned against --- either a [**Node**](Node) reference, a 1-based **Long** index, or a **String** key. When omitted, the new node is inserted at the root level using *Relationship* = **tvwNext** semantics.

*Relationship*
: *optional* A member of [**TreeRelationshipConstants**](../Enumerations/TreeRelationshipConstants) describing where the new node is placed relative to *Relative*. Default: **tvwNext**.

*Key*
: *optional* A **String** name under which the node can be looked up. Keys must be unique within the **Nodes** collection (otherwise run-time error 35602).

*Text*
: *optional* A **String** giving the node's label.

*Image*
: *optional* A **Variant** identifying the unselected-state icon --- either a 1-based **Long** index into [**TreeView.ImageList**](.#imagelist), or a **String** key.

*SelectedImage*
: *optional* A **Variant** identifying the selected-state icon. When unset, defaults to the same as *Image*.

Returns the newly-created [**Node**](Node).

### Clear
{: .no_toc }

Removes every node from the treeview, including all descendants.

Syntax: *object*.**Clear**

### Remove
{: .no_toc }

Removes a node from the treeview, along with all its descendants. The remaining nodes' [**Index**](Node#index) values are recomputed.

Syntax: *object*.**Remove** ( *Index* )

*Index*
: A **Variant** --- either a 1-based **Long** position or a **String** key.

### _NewEnum
{: .no_toc }

Returns the enumerator used by `For Each node In treeView.Nodes`. Iterates nodes in **Index** order (the order they were added), not in tree-traversal order.

Syntax: *object*.**_NewEnum** **As stdole.IUnknown**

## See Also

- [TreeView](.) -- the parent control
- [Node](Node) -- one node in the collection
- [TreeRelationshipConstants](../Enumerations/TreeRelationshipConstants) -- the *Relationship* values for [**Add**](#add)
