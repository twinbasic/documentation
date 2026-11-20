---
title: TvwNode
parent: TreeView
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/TreeView/TvwNode
has_toc: false
---

# TvwNode class
{: .no_toc }

One node of a [**TreeView**](.): its text and key, its place in the tree, the pictures and colors it is drawn with, and its state: open or closed, selected, checked. A program gets a node from the [**TvwNodes**](TvwNodes) collection, from its [**Add**](TvwNodes#add) method, from a property of the tree such as [**SelectedItem**](.#selecteditem), and from the properties of another node. It cannot make a **TvwNode** object with **New**.

```tb check_build check_run arch=win32,win64
Dim Root As TvwNode, Leaf As TvwNode
Set Root = TreeView1.Nodes.Add(, , "r", "Root")
Set Leaf = TreeView1.Nodes.Add(Root, TvwNodeRelationshipChild, "m", "Middle")
Set Leaf = TreeView1.Nodes.Add(Leaf, TvwNodeRelationshipChild, "l", "Leaf")
Debug.Print Leaf.FullPath
Debug.Print Leaf.Level
Debug.Print Leaf.Parent.Text
Debug.Print Root.Children
' Output:
'  Root\Middle\Leaf
'  2
'  Middle
'  1
```

A **TvwNode** refers to its node in the tree. When the program removes the node, with [**Remove**](TvwNodes#remove) or [**Clear**](TvwNodes#clear), the object stays but refers to nothing.

* TOC
{:toc}

## Moving around the tree

[**Parent**](#parent), [**Child**](#child), [**NextSibling**](#nextsibling), [**PreviousSibling**](#previoussibling), [**FirstSibling**](#firstsibling) and [**LastSibling**](#lastsibling) return the nodes around this one, or **Nothing** where there is none. The *siblings* of a node are the nodes that have the same parent, or the nodes of the root level. A node is its own first and last sibling when it is the only one. [**Level**](#level) is how deep the node is: 0 at the root level.

<!-- test: TreeViewTests.Child_Set_Raises383 -->
A **Set** of one of these properties other than **Parent** raises run-time error 383, *Property is read-only*.
<!-- /test -->

```tb check_build check_run arch=win32,win64
Dim Node As TvwNode
Set Node = TreeView1.Nodes.Add(, , "a", "A")
TreeView1.Nodes.Add Node, TvwNodeRelationshipChild, "a1", "A1"
TreeView1.Nodes.Add Node, TvwNodeRelationshipChild, "a2", "A2"
TreeView1.Nodes.Add , , "b", "B"
Set Node = TreeView1.Nodes("a1")
Debug.Print Node.NextSibling.Text
Debug.Print TypeName(Node.PreviousSibling)
Debug.Print Node.LastSibling.Text
Debug.Print TreeView1.Nodes("b").FirstSibling.Text
' Output:
'  A2
'  Nothing
'  A2
'  A
```

[**Root**](#root) is meant to return the root-level node a node hangs from, but it does not.

<!-- test: TreeViewTests.Root_OfANodeInALaterBranch_IsItsTopLevelAncestor -->
> [!WARNING] 1.8.141.0
> **Root** returns the first node of the root level, whichever node it is asked of. For a node in the first branch that is the right node, and for a node in any later branch it is the wrong one. A program that needs the top of a branch goes up with [**Parent**](#parent) until it is **Nothing**.

[**FirstVisible**](#firstvisible), [**LastVisible**](#lastvisible), [**NextVisible**](#nextvisible) and [**PreviousVisible**](#previousvisible) go through the nodes that are shown, which are all those that are not inside a closed branch, in the order of the tree.

## Moving a node

[**Move**](#move) takes the node, with all its children, to another place, and assigning a node to [**Parent**](#parent) makes the node the first child of that node. The node keeps its number in the collection, its key, its text, and its open, selected and checked state. It gets a new [**Handle**](#handle).

<!-- test: TreeViewTests.Move_KeepsTheStateAndTheChildren, TreeViewTests.Move_NoRelative_GoesToTheRootLevel, TreeViewTests.Move_IntoItsOwnBranch_Raises35614, TreeViewTests.Parent_Set_MovesTheNodeAsFirstChild, TreeViewTests.Parent_SetToNothing_Raises35610 -->
A move into the node's own branch, which would make a loop, raises run-time error 35614. Assigning **Nothing** to **Parent** raises run-time error 35610.

```tb check_build check_run arch=win32,win64
Dim Folder As TvwNode, File As TvwNode
Set Folder = TreeView1.Nodes.Add(, , "d", "Folder")
Set File = TreeView1.Nodes.Add(, , "f", "File")
Set File.Parent = Folder
Debug.Print File.FullPath
File.Move
Debug.Print File.Level
On Error Resume Next
Folder.Move File, TvwNodeRelationshipChild
Debug.Print Err.Number
Folder.Move Folder.Child, TvwNodeRelationshipNext
Debug.Print Err.Number
' Output:
'  Folder\File
'  0
'  0
'  0
```
<!-- /test -->

## Pictures

A node shows the picture [**Image**](#image) names. While it is selected it shows [**SelectedImage**](#selectedimage) instead, or its **Image** if that is 0. While its branch is open and it has an [**ExpandedImage**](#expandedimage), it shows that in place of **Image**, and in place of **SelectedImage** too if that is 0. [**NoImages**](#noimages) draws a node without a picture. All of them name a picture of the tree's image list, by number from 1 or, when the tree holds the **ImageList** control, by key.

```tb check_build
Dim Folder As TvwNode
Set Folder = TreeView1.Nodes.Add(, , "docs", "Documents")
Folder.Image = "folder"
Folder.ExpandedImage = "open"
Folder.SelectedImage = 3
```

Properties
----------

### BackColor
{: .no_toc }

The background color of the node's label. **OLE_COLOR**. A node that has no color of its own has the tree's [**BackColor**](.#backcolor), and a node assigned -1 has it again. It does not show while the node is selected or has the focus.

<!-- test: TreeViewTests.NodeColors_MinusOne_FollowsTheTree -->
The property returns the tree's color for a node that has none of its own.
<!-- /test -->

### Bold
{: .no_toc }

Whether the label is drawn in bold. **Boolean**. Default: **False**.

### CheckBox
{: .no_toc }

Whether the node has a check box, while the tree's [**Checkboxes**](.#checkboxes) is **True**. **Boolean**. A new node has one.

<!-- test: TreeViewTests.CheckBox_False_TakesTheBoxAway -->
Assigning **False** takes the box away, and the node reads **False** for [**Checked**](#checked) from then on. A node whose box was taken away ignores an assignment to **Checked**, and assigning **True** to **CheckBox** gives it a box again.
<!-- /test -->

### Checked
{: .no_toc }

Whether the node's check box is checked. **Boolean**. Default: **False**. See [Check boxes](.#check-boxes) for the events a change raises. 
### Child
{: .no_toc }

The first child of the node, or **Nothing** when it has none. A **TvwNode**, read-only: an assignment raises run-time error 383.

### Children
{: .no_toc }

The number of children of the node, not counting their children. **Long**, read-only.

### Enabled
{: .no_toc }

Whether the label is drawn in the normal color or in gray. **Boolean**. Default: **True**. It only changes the drawing: the user can still select the node. It has an effect when the program has visual styles; without them the node is always enabled and an assignment does nothing.

<!-- test: TreeViewTests.Enabled_False_ReadsFalse -->
With visual styles a node assigned **False** reads **False**.
<!-- /test -->

### Expanded
{: .no_toc }

Whether the branch of the node is open. **Boolean**. Default: **False**. See [Opening and closing branches](.#opening-and-closing-branches) for the events a change raises.

### ExpandedImage
{: .no_toc }

The picture the node shows while its branch is open. The number of a picture of the tree's image list, from 1, or its key as a **String**. **Variant**. Default: 0, with which the node shows its [**Image**](#image). A key the list does not have raises run-time error 35601, and a negative number 35600.

### ExpandedImageIndex
{: .no_toc }

The number of the picture [**ExpandedImage**](#expandedimage) names, whether it was assigned as a number or as a key. **Long**, read-only.

### FirstSibling
{: .no_toc }

The first node of the branch the node is in. A **TvwNode**, read-only. A node that is the first returns itself.

### FirstVisible
{: .no_toc }

<!-- test: TreeViewTests.FirstVisible_OfAnyNode_IsTheTopItem -->
The node at the top of the visible part of the tree, as [**TopItem**](.#topitem) is, whichever node it is asked of. A **TvwNode**, read-only.
<!-- /test -->

### ForeColor
{: .no_toc }

The color of the node's text. **OLE_COLOR**. A node that has no color of its own has the tree's [**ForeColor**](.#forecolor), and a node assigned -1 has it again, as the tree's [**ResetForeColors**](.#resetforecolors) does for every node. It does not show while the node is selected or has the focus.

### FullPath
{: .no_toc }

The texts of the node and of all the nodes above it, from the top, with the tree's [**PathSeparator**](.#pathseparator) between them. **String**, read-only. At the root level it is the node's own text.

<!-- test: TreeViewTests.FullPath_UsesThePathSeparator -->
The separator is read when the path is asked for, so a change of **PathSeparator** shows at once.
<!-- /test -->

### Ghosted
{: .no_toc }

Whether the node is drawn as if it had been cut: its picture lighter. **Boolean**. Default: **False**.

### Handle
{: .no_toc }

The handle of the node in the tree view window of Windows, for a program that sends the window its own messages. **LongPtr**, read-only. It changes when [**Move**](#move) or [**Parent**](#parent) moves the node.

### Image
{: .no_toc }

The picture the node shows. The number of a picture of the tree's image list, from 1, or its key as a **String**. **Variant**. Default: 0, no picture. A key the list does not have, or any key while the tree holds no **ImageList** control, raises run-time error 35601. A negative number raises 35600. A number is not checked against the size of the list. See [Pictures](#pictures).

### ImageIndex
{: .no_toc }

The number of the picture [**Image**](#image) names, whether it was assigned as a number or as a key. **Long**, read-only.

### Index
{: .no_toc }

The number of the node in the [**TvwNodes**](TvwNodes) collection. **Long**, read-only. It is the order in which the nodes were added, not their place in the tree. See [Numbers and keys](TvwNodes#numbers-and-keys).

### Key
{: .no_toc }

The key of the node in the collection. **String**. An assignment changes the key, and an empty string takes it away.

<!-- test: TreeViewTests.Key_Assigned_ChangesTheKey, TreeViewTests.Key_Duplicate_Raises457 -->
A key that another node has raises run-time error 457 and leaves the key as it was.
<!-- /test -->

### LastSibling
{: .no_toc }

The last node of the branch the node is in. A **TvwNode**, read-only. A node that is the last returns itself.

### LastVisible
{: .no_toc }

<!-- test: TreeViewTests.LastVisible_OfAnyNode_IsTheLastShownNode -->
The last node of the tree that is shown, that is the last one that is not inside a closed branch, whichever node it is asked of. A **TvwNode**, read-only.
<!-- /test -->

### Level
{: .no_toc }

How deep the node is in the tree: 0 for a node of the root level, 1 for its children. **Long**, read-only.

### NextSibling
{: .no_toc }

The next node of the branch, or **Nothing** for the last. A **TvwNode**, read-only.

### NextVisible
{: .no_toc }

The next node that is shown, after this one in the order of the tree, or **Nothing**. A **TvwNode**, read-only.

### NoImages
{: .no_toc }

Whether the node is drawn without a picture. **Boolean**. Default: **False**.

### Parent
{: .no_toc }

The node above this one, or **Nothing** at the root level. A **TvwNode**. Assigned with **Set**, it moves the node, with its children, to be the first child of the new parent. See [Moving a node](#moving-a-node).

### PreviousSibling
{: .no_toc }

The previous node of the branch, or **Nothing** for the first. A **TvwNode**, read-only.

### PreviousVisible
{: .no_toc }

The previous node that is shown, before this one in the order of the tree, or **Nothing**. A **TvwNode**, read-only.

### Root
{: .no_toc }

The node of the root level above this one. A **TvwNode**, read-only. See [Moving around the tree](#moving-around-the-tree) for what it really returns.

### Selected
{: .no_toc }

Whether the node is selected. **Boolean**. Assigning **True** selects it, with the events described under [Selecting nodes](.#selecting-nodes), and opens the branches above it. In a tree that allows several selected nodes it adds the node to the selection.

<!-- test: TreeViewTests.Selected_True_OpensTheBranchesAbove -->
Selecting a node in a closed branch opens the branch.
<!-- /test -->

### SelectedImage
{: .no_toc }

The picture the node shows while it is selected. The number of a picture of the tree's image list, from 1, or its key as a **String**. **Variant**. Default: 0, with which the node shows its [**Image**](#image). A key the list does not have raises run-time error 35601, and a negative number 35600.

### SelectedImageIndex
{: .no_toc }

The number of the picture [**SelectedImage**](#selectedimage) names. **Long**, read-only.

### Sorted
{: .no_toc }

Whether the children of the node are kept sorted. **Boolean**. Default: **False**. Assigning **True** sorts them at once, and a child added later goes to its sorted place. The sorting follows the node's [**SortOrder**](#sortorder) and [**SortType**](#sorttype), and not the tree's.

### SortOrder
{: .no_toc }

The direction in which the children are sorted. A member of [**TvwSortOrderConstants**](.#tvwsortorderconstants). Default: **TvwSortOrderAscending**.

<!-- test: TreeViewTests.NodeSortOrder_NotAMember_Raises380 -->
Another value raises run-time error 380.
<!-- /test -->

### SortType
{: .no_toc }

How the texts of the children are compared. A member of [**TvwSortTypeConstants**](.#tvwsorttypeconstants). Default: **TvwSortTypeBinary**.

<!-- test: TreeViewTests.NodeSortType_NotAMember_Raises380 -->
Another value raises run-time error 380.
<!-- /test -->

### Tag
{: .no_toc }

<!-- test: TreeViewTests.Tag_HoldsAnyValue -->
A value of the program's own, which the node does not use. **Variant**. A new node has an empty string. Assigned with **Set**, it holds an object.
<!-- /test -->

### Text
{: .no_toc }

The label of the node. **String**. It is the default member, so `Node = "New"` sets the text.

<!-- test: TreeViewTests.Text_LongerThan259_IsReadBackWhole -->
> [!WARNING] 1.8.141.0
> The property returns at most 259 characters of a longer text, with no error. The same holds for the node's part of [**FullPath**](#fullpath) and for the texts the sorting compares. A program that keeps longer texts keeps them itself, for instance in [**Tag**](#tag).

### ToolTipText
{: .no_toc }

The text shown in a small window when the pointer rests on the node, while the tree's [**ShowTips**](.#showtips) is **True**. **String**. Default: empty, with which the node shows none.

### Visible
{: .no_toc }

Whether the node is shown: it is not inside a closed branch. **Boolean**, read-only. A node that is scrolled out of the window is still **True**.

<!-- test: TreeViewTests.Visible_ClosedBranch_IsFalse -->
The children of a node whose branch is closed read **False**; they read **True** once the branch is opened.
<!-- /test -->

Methods
-------

### CreateDragImage
{: .no_toc }

Returns the handle of an image list of Windows that holds a picture of the node, for a drag with the Windows API. **LongPtr**. The program owns the image list and destroys it when it no longer needs it, with `ImageList_Destroy`.

Syntax: *object*.**CreateDragImage**

### EnsureVisible
{: .no_toc }

Scrolls the tree, and opens the branches above the node if they are closed, so that the node is shown.

Syntax: *object*.**EnsureVisible**

### Move
{: .no_toc }

Takes the node, with all its children, to another place in the tree. See [Moving a node](#moving-a-node).

Syntax: *object*.**Move** [ *Relative* ] [, *Relationship* ]

*Relative*
: *optional* The node that the moved one is placed by: a **TvwNode**, or the number or the key of one. Without it the node goes to the root level, and **TvwNodeRelationshipFirst** puts it before every other node of the root level and every other relationship after the last.

*Relationship*
: *optional* A member of [**TvwNodeRelationshipConstants**](.#tvwnoderelationshipconstants). The default is **TvwNodeRelationshipNext**.

A *Relative* that is a key no node has raises run-time error 5, and one that is not a node, a string or a whole number raises 13.

### SelectedIndex
{: .no_toc }

Returns the place of the node in the tree's [**SelectedNodes**](.#selectednodes), counted from 1, or 0 when the node is not selected. **Long**.

Syntax: *object*.**SelectedIndex**

## See Also

- [TreeView](.) class
- [TvwNodes](TvwNodes) class -- the collection of the nodes
- [TvwSelectedNodes](TvwSelectedNodes) class -- the selected nodes of a tree that allows several
