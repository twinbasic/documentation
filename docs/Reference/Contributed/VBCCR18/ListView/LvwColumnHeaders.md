---
title: LvwColumnHeaders
parent: ListView
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ListView/LvwColumnHeaders
has_toc: false
---

# LvwColumnHeaders class
{: .no_toc }

The collection of the columns of a [**ListView**](.), which its [**ColumnHeaders**](Columns#columnheaders) property returns. Its items are [**LvwColumnHeader**](LvwColumnHeader) objects, numbered from 1, and a column can have a key as well.

```tb check_build check_run arch=win32,win64
With ListView1
    .View = LvwViewReport
    .ColumnHeaders.Add , "name", "Name"
    .ColumnHeaders.Add , "size", "Size", 1000, LvwColumnHeaderAlignmentRight
    .ColumnHeaders.Add 2, "type", "Type"                ' between the two
    Debug.Print .ColumnHeaders.Count; .ColumnHeaders("size").Index
    Debug.Print .ColumnHeaders(2).Text; .ColumnHeaders("size").Alignment = LvwColumnHeaderAlignmentRight
End With
' Output:
'  3  3
' TypeTrue
```

A program goes through the columns with **For Each**, or by number from 1 to [**Count**](#count). It cannot make an **LvwColumnHeaders** object with **New**. The number of a column, its [**Index**](LvwColumnHeader#index), is its place in the collection, and stays when the user drags the column to another place; [**ItemFromPosition**](#itemfromposition) finds a column by its place on the screen.

* TOC
{:toc}

Properties
----------

### Count
{: .no_toc }

The number of columns. **Long**, read-only.

### Item
{: .no_toc }

Returns one column. It is the default member, so `ListView1.ColumnHeaders("size")` is `ListView1.ColumnHeaders.Item("size")`.

Syntax: *object*.**Item**( *Index* ) **As LvwColumnHeader**

*Index*
: *required* The number of the column, from 1 to [**Count**](#count), or its key as a **String**, in which capital and small letters are the same.

<!-- test: ListViewColumnsTests.Item_NumberOutOfRange_Raises9, ListViewColumnsTests.Item_UnknownKey_Raises5 -->
A number outside that range raises run-time error 9, and a key that no column has raises run-time error 5. [**Exists**](#exists) asks without an error.
<!-- /test -->

### ItemFromPosition
{: .no_toc }

Returns the column at a place, from the left, as the user sees the columns. An [**LvwColumnHeader**](LvwColumnHeader).

Syntax: *object*.**ItemFromPosition**( *Position* ) **As LvwColumnHeader**

*Position*
: *required* A **Long**: the place, from 1.

Methods
-------

### Add
{: .no_toc }

Adds a column and returns its [**LvwColumnHeader**](LvwColumnHeader).

Syntax: *object*.**Add**( [ *Index* ] [, *Key* ] [, *Text* ] [, *Width* ] [, *Alignment* ] [, *Icon* ] ) **As LvwColumnHeader**

*Index*
: *optional* A **Long**: the number the new column gets. The columns from that number on move up by one. Without it, or with 0, the column goes after the last one.

*Key*
: *optional* A **String** by which the program can name the column.

*Text*
: *optional* A **String**: the text of the column's header.

*Width*
: *optional* A **Single**: the width, in the scale units of the control's container. Without it the column is one inch wide, 1440 twips.

*Alignment*
: *optional* A member of [**LvwColumnHeaderAlignmentConstants**](Columns#lvwcolumnheaderalignmentconstants): how the column's texts are aligned. The default is **LvwColumnHeaderAlignmentLeft**. The first column takes any of them as well.

*Icon*
: *optional* The number or the key of the header's icon in the image list of [**ColumnHeaderIcons**](Columns#columnheadericons).

<!-- test: ListViewColumnsTests.Add_IndexOutOfRange_Raises35600, ListViewColumnsTests.Add_DuplicateKey_Raises457 -->
A negative *Index*, and one greater than [**Count**](#count) + 1, raises run-time error 35600. A *Key* that another column has raises run-time error 457, and no column is added. A key for an icon that the image list does not have, or a key while there is no image list, raises run-time error 35601. A negative *Width*, and an *Alignment* that is not a member, raise run-time error 380.
<!-- /test -->

<!-- test: ListViewColumnsTests.Add_NegativeWidth_AddsNoColumn, ListViewColumnsTests.Add_AlignmentNotAMember_AddsNoColumn -->
> [!WARNING] 1.8.137.0
> A call that raises error 380 for its *Width* or its *Alignment* has already put the column into the collection. The control has no such column, and [**Count**](#count) is one more than the columns the control shows; the members of that **LvwColumnHeader** then work on a column that is not there. A program checks a width and an alignment before it adds a column with them.

Adding a column in front of others leaves the subitems of the items where they are, so the later columns then show other texts; see [Subitems](Items#subitems).

### Clear
{: .no_toc }

Removes every column.

Syntax: *object*.**Clear**

### Exists
{: .no_toc }

Returns whether the collection has a column of a number or a key.

Syntax: *object*.**Exists**( *Index* ) **As Boolean**

*Index*
: *required* The number or the key to look for.

### Remove
{: .no_toc }

Removes one column. The columns after it move down by one.

Syntax: *object*.**Remove** *Index*

*Index*
: *required* The number or the key of the column. One that the collection does not have raises the error that [**Item**](#item) raises for it.

The subitems of the items stay as they are; see [Subitems](Items#subitems).

## See Also

- [Columns](Columns) -- the header and its events
- [LvwColumnHeader](LvwColumnHeader) class -- one column
