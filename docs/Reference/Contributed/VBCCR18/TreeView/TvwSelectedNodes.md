---
title: TvwSelectedNodes
parent: TreeView
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/TreeView/TvwSelectedNodes
has_toc: false
---

# TvwSelectedNodes class
{: .no_toc }

The collection of the selected nodes of a [**TreeView**](.) whose [**MultiSelect**](.#multiselect) is not **TvwMultiSelectNone**, which its [**SelectedNodes**](.#selectednodes) property returns. Its items are [**TvwNode**](TvwNode) objects, numbered from 1, the node selected last first. It has no keys. A program cannot make a **TvwSelectedNodes** object with **New**.

```tb check_build check_run arch=win32,win64
Dim Node As TvwNode
TreeView1.MultiSelect = TvwMultiSelectAll
TreeView1.Nodes.Add , , "a", "A"
TreeView1.Nodes.Add , , "b", "B"
TreeView1.Nodes("a").Selected = True
TreeView1.Nodes("b").Selected = True
For Each Node In TreeView1.SelectedNodes
    Debug.Print Node.Text
Next
Debug.Print TreeView1.SelectedNodes.Count
' Output:
'  B
'  A
'  2
```

The collection changes as the selection does, and a program goes through it with **For Each** or by number from 1 to [**Count**](#count). The tree's [**SelectedItem**](.#selecteditem) is the node that has the focus, which is not always the first of the collection: a node that the program selects with [**Selected**](TvwNode#selected) joins the collection as the first, and the focus stays where it was. See [Selecting several nodes](.#selecting-several-nodes).

* TOC
{:toc}

Properties
----------

### Count
{: .no_toc }

The number of selected nodes. **Long**, read-only.

### Item
{: .no_toc }

Returns one selected node. It is the default member, so `TreeView1.SelectedNodes(1)` is `TreeView1.SelectedNodes.Item(1)`.

Syntax: *object*.**Item**( *Index* ) **As TvwNode**

*Index*
: *required* A **Long**: the number of the node, from 1 to [**Count**](#count).

<!-- test: TreeViewTests.SelectedNodes_Item_OutOfRange_Raises35600 -->
A number outside that range raises run-time error 35600, *Index out of bounds*.
<!-- /test -->

Methods
-------

### Exists
{: .no_toc }

<!-- test: TreeViewTests.SelectedNodes_Exists_SaysWhetherTheNumberIsInTheRange -->
Returns whether the collection has an item of a number, so that a program can ask before [**Item**](#item) raises an error.
<!-- /test -->

Syntax: *object*.**Exists**( *Index* ) **As Boolean**

*Index*
: *required* A **Long**: the number to look for.

## See Also

- [TreeView](.) class
- [TvwNodes](TvwNodes) class -- the collection of all the nodes
- [TvwNode](TvwNode) class -- one node
