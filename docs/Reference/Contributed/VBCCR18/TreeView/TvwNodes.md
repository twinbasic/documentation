---
title: TvwNodes
parent: TreeView
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/TreeView/TvwNodes
has_toc: false
---

# TvwNodes class
{: .no_toc }

The collection of all the nodes of a [**TreeView**](.), which its [**Nodes**](.#nodes) property returns: the nodes of every level, not those of one branch. Its items are [**TvwNode**](TvwNode) objects, numbered from 1, and a node can have a key as well.

```tb check_build check_run arch=win32,win64
Dim Node As TvwNode
Set Node = TreeView1.Nodes.Add(, , "usa", "United States")
TreeView1.Nodes.Add Node, TvwNodeRelationshipChild, "nyc", "New York"
TreeView1.Nodes.Add , , "fra", "France"
For Each Node In TreeView1.Nodes
    Debug.Print Node.Index; Node.Text
Next
' Output:
'  1 United States
'  2 New York
'  3 France
```

A program goes through the nodes with **For Each**, or by number from 1 to [**Count**](#count). To go through the nodes in the order of the tree, it follows the [**Child**](TvwNode#child) and [**NextSibling**](TvwNode#nextsibling) properties of the nodes. It cannot make a **TvwNodes** object with **New**.

* TOC
{:toc}

## Numbers and keys

<!-- test: TreeViewTests.Nodes_Index_IsTheOrderOfAddition, TreeViewTests.Nodes_Index_AfterRemove_IsRenumbered -->
The number of a node is its place in this collection, and the collection holds the nodes in the order they were added. A node that [**Add**](#add) puts between two others still has the next number, so the numbers do not follow the order in which the tree shows the nodes. A number changes when [**Remove**](#remove) takes a node with a smaller number out, and a key stays with its node.
<!-- /test -->

<!-- test: TreeViewTests.Nodes_Item_KeyIgnoresCase, TreeViewTests.Add_DuplicateKey_Raises457_AddsNothing -->
A key is any string, and capital and small letters in it are the same: `"Fruit"` and `"FRUIT"` are one key. No two nodes of a tree have the same key. A node needs no key: an empty string is no key, and any number of nodes can be without one.
<!-- /test -->

```tb check_build check_run arch=win32,win64
Dim Node As TvwNode
Set Node = TreeView1.Nodes.Add(, , "x", "X")
Set Node = TreeView1.Nodes.Add(, , "y", "Y")
Set Node = TreeView1.Nodes.Add("x", TvwNodeRelationshipNext, "z", "Z")
Debug.Print TreeView1.Nodes("Z").Index
Debug.Print TreeView1.Nodes("x").NextSibling.Text
Debug.Print TreeView1.Nodes(2).Text
' Output:
'  3
'  Z
'  Y
```

Properties
----------

### Count
{: .no_toc }

The number of nodes in the tree. **Long**, read-only.

### Item
{: .no_toc }

Returns one node. It is the default member, so `TreeView1.Nodes("docs")` is `TreeView1.Nodes.Item("docs")`.

Syntax: *object*.**Item**( *Index* ) **As TvwNode**

*Index*
: *required* The number of the node, from 1 to [**Count**](#count), or its key as a **String**.

<!-- test: TreeViewTests.Nodes_Item_NumberOutOfRange_Raises9, TreeViewTests.Nodes_Item_UnknownKey_Raises5 -->
A number outside that range raises run-time error 9, and a key that no node has raises run-time error 5. [**Exists**](#exists) asks without an error.
<!-- /test -->

Methods
-------

### Add
{: .no_toc }

Puts a node into the tree and returns its [**TvwNode**](TvwNode).

Syntax: *object*.**Add**( [ *Relative* ] [, *Relationship* ] [, *Key* ] [, *Text* ] [, *Image* ] [, *SelectedImage* ] ) **As TvwNode**

*Relative*
: *optional* The node that the new one is placed by: a **TvwNode**, or the number or the key of one. Without it the new node goes to the root level.

*Relationship*
: *optional* A member of [**TvwNodeRelationshipConstants**](.#tvwnoderelationshipconstants): where the new node goes in relation to *Relative*. The default is **TvwNodeRelationshipNext**.

*Key*
: *optional* A **String** by which the program can name the node. See [Numbers and keys](#numbers-and-keys).

*Text*
: *optional* A **String**: the label of the node. The default is an empty string.

*Image*, *SelectedImage*
: *optional* The picture the node shows, and the picture it shows while it is selected: the number of a picture of the tree's image list, or its key as a **String**. See [Pictures](.#pictures). Without them the node has no picture of its own.

<!-- test: TreeViewTests.Add_NoRelative_GoesToTheRootLevel -->
Without a *Relative* the relationship is counted from the root level: **TvwNodeRelationshipFirst** puts the node before every other node of the root level, and every other relationship except **TvwNodeRelationshipPrevious** puts it after the last one.
<!-- /test -->

<!-- test: none -- a call that never returns would stop the test run -->
> [!WARNING] 1.8.141.0
> A call with **TvwNodeRelationshipPrevious** and no *Relative* never returns. A program that places a node before another names that node as the *Relative*.

<!-- test: TreeViewTests.Add_RelativeUnknownKey_Raises5, TreeViewTests.Add_RelativeNumberOutOfRange_Raises9, TreeViewTests.Add_RelativeOfAnotherType_Raises13, TreeViewTests.Add_DuplicateKey_Raises457_AddsNothing -->
A *Relative* that is a key no node has raises run-time error 5, a number outside the range of nodes raises 9, and a value that is not a node, a string or a whole number raises 13. A *Key* that another node has raises run-time error 457. A call that raises an error adds no node.
<!-- /test -->

<!-- test: TreeViewTests.Add_Image_NumberAndKey -->
A picture is named by its number or, when the tree has an **ImageList** control, by its key. A key the list does not have raises run-time error 35601, and a negative number raises 35600. A number is not checked against the size of the list.
<!-- /test -->

<!-- test: TreeViewTests.Sorted_NodeAddedLater_TakesItsSortedPlace -->
While the tree's [**Sorted**](.#sorted) is **True**, a node that goes to the root level takes its sorted place, whatever the relationship says. So does a child added to a parent whose [**Sorted**](TvwNode#sorted) is **True**.
<!-- /test -->

### Clear
{: .no_toc }

<!-- test: TreeViewTests.Nodes_Clear_RemovesEveryNode -->
Removes every node. A [**TvwNode**](TvwNode) that the program still holds refers to no node after that.
<!-- /test -->

Syntax: *object*.**Clear**

### Exists
{: .no_toc }

<!-- test: TreeViewTests.Nodes_Exists_SaysWhetherTheTreeHasTheNumberOrKey -->
Returns whether the tree has a node of a number or a key, so that a program can ask before [**Item**](#item) raises an error.
<!-- /test -->

Syntax: *object*.**Exists**( *Index* ) **As Boolean**

*Index*
: *required* The number or the key to look for.

### Remove
{: .no_toc }

Removes one node, and with it all the nodes below it. The numbers of the nodes that follow move down to fill the gap.

Syntax: *object*.**Remove** *Index*

*Index*
: *required* The number or the key of the node. One that the tree does not have raises the error that [**Item**](#item) raises for it.

<!-- test: TreeViewTests.Nodes_Remove_RemovesTheChildrenToo, TreeViewTests.Nodes_Remove_RemovedNode_IsEmpty -->
A **TvwNode** that the program holds for a removed node stays valid but refers to nothing: its [**Text**](TvwNode#text) is an empty string, its [**Parent**](TvwNode#parent) is **Nothing** and its [**Children**](TvwNode#children) is 0. Its [**Index**](TvwNode#index) and [**Key**](TvwNode#key) keep the old values.
<!-- /test -->

## See Also

- [TreeView](.) class
- [TvwNode](TvwNode) class -- one node
- [TvwSelectedNodes](TvwSelectedNodes) class -- the selected nodes of a tree that allows several
