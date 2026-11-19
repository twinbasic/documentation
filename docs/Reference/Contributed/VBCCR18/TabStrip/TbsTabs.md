---
title: TbsTabs
parent: TabStrip
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/TabStrip/TbsTabs
has_toc: false
---

# TbsTabs class
{: .no_toc }

The collection of the tabs of a [**TabStrip**](.), which its [**Tabs**](.#tabs) property returns. Its items are [**TbsTab**](TbsTab) objects, numbered from 1, and an item can have a key as well.

A program goes through the tabs with **For Each**, or by number from 1 to [**Count**](#count). It cannot make a **TbsTabs** object with **New**.

* TOC
{:toc}

## Numbers and keys

<!-- test: TabStripTests.Remove_RenumbersTheLaterTabs, TabStripTests.Add_AtAnIndex_MovesTheLaterTabsUp -->
The number of a tab is its place in the strip. It changes when a tab is added before it or removed before it, so a program that keeps a number over such a change keeps the wrong tab. A key stays with its tab.
<!-- /test -->

<!-- test: TabStripTests.Add_DuplicateKey_Raises457, TabStripTests.Key_Assigned_RenamesTheTab -->
A key is any string. No two tabs of a strip have the same key. A tab needs no key: an empty string is no key, and any number of tabs can be without one.
<!-- /test -->

```tb check_build check_run arch=win32,win64
Dim Tab As TbsTab
TabStrip1.Tabs.Add , "edit", "Edit"
TabStrip1.Tabs.Add 1, "file", "File"                ' before the first
For Each Tab In TabStrip1.Tabs
    Debug.Print Tab.Index; "["; Tab.Key; "]"
Next
TabStrip1.Tabs.Remove "file"
Debug.Print TabStrip1.Tabs("edit").Index
' Output:
'  1 [file]
'  2 []
'  3 [edit]
'  2
```

Properties
----------

### Count
{: .no_toc }

The number of tabs in the strip. **Long**, read-only.

### Item
{: .no_toc }

Returns one tab. It is the default member, so `TabStrip1.Tabs("edit")` is `TabStrip1.Tabs.Item("edit")`.

Syntax: *object*.**Item**( *Index* ) **As TbsTab**

*Index*
: *required* The number of the tab, from 1 to [**Count**](#count), or its key as a **String**.

<!-- test: TabStripTests.Item_NumberOutOfRange_Raises9AndUnknownKeyRaises5 -->
A number outside that range raises run-time error 9, and a key that no tab has raises run-time error 5. [**Exists**](#exists) asks without an error.
<!-- /test -->

Methods
-------

### Add
{: .no_toc }

Makes a tab and returns its [**TbsTab**](TbsTab).

Syntax: *object*.**Add**( [ *Index* ] [, *Key* ] [, *Caption* ] [, *Image* ] ) **As TbsTab**

*Index*
: *optional* A **Long**: the number the new tab gets. The tabs from that number on move up by one. Without it, or with 0, the tab goes after the last one.

*Key*
: *optional* A **String** by which the program can name the tab. See [Numbers and keys](#numbers-and-keys).

*Caption*
: *optional* A **String**: the tab's [**Caption**](TbsTab#caption). The default is empty.

*Image*
: *optional* A **Variant**: the number or the key of the picture the tab shows, in the strip's [**ImageList**](.#imagelist). A key that the list does not have raises run-time error 35601, *Element not found*.

<!-- test: TabStripTests.Add_IndexOutOfRange_Raises35600, TabStripTests.Add_DuplicateKey_Raises457 -->
A negative *Index*, and one greater than [**Count**](#count) + 1, raises run-time error 35600, *Index out of bounds*. A *Key* that another tab has raises run-time error 457.
<!-- /test -->

<!-- test: TabStripTests.Add_DuplicateKey_LeavesNoTabInTheWindow -->
> [!WARNING] 1.8.136.0
> A call that raises error 457 for its key has already put its tab into the control's window. The collection is as it was, and the control draws a tab more than [**Count**](#count) says, one that no [**TbsTab**](TbsTab) stands for. A program asks [**Exists**](#exists) before it adds a tab with a key that the strip may have.

### Clear
{: .no_toc }

Removes every tab. No tab is selected afterward, and the tab that a new strip has is removed too.

Syntax: *object*.**Clear**

<!-- test: TabStripTests.Clear_RemovesEveryTabAndTheSelection -->
After a **Clear**, [**SelectedItem**](.#selecteditem) is **Nothing**.
<!-- /test -->

### Exists
{: .no_toc }

Returns whether the strip has a tab of a number or a key, so that a program can ask before [**Item**](#item) raises an error.

Syntax: *object*.**Exists**( *Index* ) **As Boolean**

*Index*
: *required* The number or the key to look for.

### Remove
{: .no_toc }

Removes one tab. The tabs after it move down by one.

Syntax: *object*.**Remove** *Index*

*Index*
: *required* The number or the key of the tab. One that the strip does not have raises the error that [**Item**](#item) raises for it.

## See Also

- [TabStrip](.) -- the control
- [TbsTab](TbsTab) -- one tab
