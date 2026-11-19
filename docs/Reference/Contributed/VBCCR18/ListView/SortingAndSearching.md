---
title: Sorting and Searching
parent: ListView
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ListView/SortingAndSearching
has_toc: false
symbols:
  - LvwSortOrderConstants
  - LvwSortTypeConstants
  - LvwFindDirectionConstants
---

# Sorting and Searching
{: .no_toc }

Sorts the items of a [**ListView**](.) by their texts or by a column, as text, numbers or dates, and finds an item by its text or by its place.

<!-- test: ListViewSortingTests.Sorted_True_SortsByText, ListViewSortingTests.SortType_Numeric_SortsByValue -->
```tb check_build check_run arch=win32,win64
With ListView1
    .View = LvwViewReport
    .ColumnHeaders.Add , , "Name"
    .ColumnHeaders.Add , , "Size"
    .ListItems.Add(, , "b").SubItems(1) = "10"
    .ListItems.Add(, , "c").SubItems(1) = "9"
    .ListItems.Add(, , "a").SubItems(1) = "100"
    .Sorted = True
    Debug.Print .ListItems(1).Text; .ListItems(2).Text; .ListItems(3).Text
    .SortKey = 1                            ' by the first subitem, as text
    Debug.Print .ListItems(1).Text; .ListItems(2).Text; .ListItems(3).Text
    .SortType = LvwSortTypeNumeric          ' by the first subitem, as numbers
    Debug.Print .ListItems(1).Text; .ListItems(2).Text; .ListItems(3).Text
End With
' Output:
' abc
' bac
' cba
```
<!-- /test -->

* TOC
{:toc}

## Sorting

While [**Sorted**](#sorted) is **True** the items are in order: by their own texts when [**SortKey**](#sortkey) is 0, or by the text of the subitem of that number. [**SortOrder**](#sortorder) makes the order ascending or descending, and [**SortType**](#sorttype) says how two texts compare: as text, as numbers, as amounts of money, as dates, or as names with numbers in them. A change of any of the four sorts the items again at once. Sorting changes the numbers of the items, and their keys stay with them.

<!-- test: ListViewSortingTests.Sorted_AddedItem_GoesToItsPlace, ListViewSortingTests.Sorted_SortKeySubitem_AddedItemIsNotSorted -->
An item added while **Sorted** is **True** and **SortKey** is 0 goes to its place in the order. With another **SortKey** the item is added at the place that [**Add**](LvwListItems#add) gives it, because its subitems come after it; a program that has filled them sets **Sorted** to **True** again. The control does not sort again when a text changes.
<!-- /test -->

## Sorting by a click on a column

A report is usually sorted by the column whose header the user clicks, and in the other order on a second click. The column's [**SortArrow**](LvwColumnHeader#sortarrow) shows which.

```tb check_build
Private Sub ListView1_ColumnClick(ByVal ColumnHeader As LvwColumnHeader)
    With ListView1
        If .SortKey = ColumnHeader.Index - 1 And .SortOrder = LvwSortOrderAscending Then
            .SortOrder = LvwSortOrderDescending
            ColumnHeader.SortArrow = LvwColumnHeaderSortArrowDown
        Else
            .ColumnHeaders(.SortKey + 1).SortArrow = LvwColumnHeaderSortArrowNone
            .SortKey = ColumnHeader.Index - 1
            .SortOrder = LvwSortOrderAscending
            ColumnHeader.SortArrow = LvwColumnHeaderSortArrowUp
        End If
        .Sorted = True
    End With
End Sub
```

## Finding an item

[**FindItem**](#finditem) finds an item by its own text, and [**FindSubItem**](#findsubitem) by the text of a subitem. Both ignore capital and small letters, can start at an item and go on from the top, and return **Nothing** when no item matches. [**HitTest**](#hittest) returns the item at a point, such as the point of a mouse event, and [**FindNearestItem**](#findnearestitem) the item nearest to a point in a direction.

<!-- test: ListViewSortingTests.FindItem_Partial_FindsTheStart, ListViewSortingTests.FindSubItem_Partial_FindsTextInside -->
```tb check_build check_run arch=win32,win64
With ListView1
    .View = LvwViewReport
    .ColumnHeaders.Add , , "Name"
    .ColumnHeaders.Add , , "Type"
    .ListItems.Add(, , "readme").SubItems(1) = "Text"
    .ListItems.Add(, , "report").SubItems(1) = "Sheet"
    .ListItems.Add(, , "picture").SubItems(1) = "Image"
    Debug.Print TypeName(.FindItem("rep"))          ' the whole text, by default
    Debug.Print .FindItem("rep", , True).Text       ' the start of the text
    Debug.Print .FindItem("REPORT").Index
    Debug.Print .FindItem("readme", 2, , True).Index  ' from the second, and on from the top
    Debug.Print .FindSubItem("ag", , , True).Text   ' a part of the text, anywhere in it
End With
' Output:
' Nothing
' report
'  2
'  1
' picture
```
<!-- /test -->

Properties
----------

### IncrementalSearchString
{: .no_toc }

The text the user has typed so far to go to an item by its first letters. **String**, read-only. Empty when the user is not typing.

### Sorted
{: .no_toc }

Whether the items are kept in order. **Boolean**. Default: **False**. Setting it to **True** sorts them; **False** leaves them as they are. See [Sorting](#sorting).

In [virtual mode](VirtualMode) the program keeps its items in order itself, and **True** raises run-time error 383.

### SortKey
{: .no_toc }

What the items are sorted by: 0 for their own texts, or the number of a subitem. **Integer**. Default: 0.

<!-- test: ListViewSortingTests.SortKey_Negative_Raises380 -->
A negative number raises run-time error 380. When the items are sorted, a number greater than the number of columns becomes that number.
<!-- /test -->

### SortOrder
{: .no_toc }

Whether the items are sorted in ascending or descending order. A member of [**LvwSortOrderConstants**](#lvwsortorderconstants). Default: **LvwSortOrderAscending**. Another value raises run-time error 380.

### SortType
{: .no_toc }

How two texts compare when the items are sorted. A member of [**LvwSortTypeConstants**](#lvwsorttypeconstants). Default: **LvwSortTypeBinary**. Another value raises run-time error 380.

Methods
-------

### FindItem
{: .no_toc }

Returns the first item whose own text matches, or **Nothing**.

Syntax: *object*.**FindItem**( *Text* [, *Index* ] [, *Partial* ] [, *Wrap* ] ) **As LvwListItem**

*Text*
: *required* A **String**: the text to find. Capital and small letters are the same.

*Index*
: *optional* A **Long**: the number of the item to start at. The default, 0, starts at the first.

*Partial*
: *optional* A **Boolean**: **True** finds an item whose text starts with *Text*; **False**, the default, one whose text is *Text*.

*Wrap*
: *optional* A **Boolean**: **True** goes on from the first item after the last.

<!-- test: ListViewSortingTests.FindItem_IndexPastTheEnd_Raises380 -->
A negative *Index*, and one greater than the number of items, raises run-time error 380.
<!-- /test -->

In [virtual mode](VirtualMode) the control raises [**FindVirtualItem**](VirtualMode#findvirtualitem) for the program to do the search.

### FindNearestItem
{: .no_toc }

Returns the item nearest to a point in the icon and small icon views, in a direction, or **Nothing**.

Syntax: *object*.**FindNearestItem**( *X*, *Y* [, *Direction* ] ) **As LvwListItem**

*X*, *Y*
: *required* **Single**: the point, measured from the control's top left corner in the scale units of its container.

*Direction*
: *optional* A member of [**LvwFindDirectionConstants**](#lvwfinddirectionconstants): where to look from the point. The default is **LvwFindDirectionUndefined**. Another value raises run-time error 380.

### FindSubItem
{: .no_toc }

Returns the first item that has a subitem whose text matches, or **Nothing**.

Syntax: *object*.**FindSubItem**( *Text* [, *Index* ] [, *SubItemIndex* ] [, *Partial* ] [, *Wrap* ] ) **As LvwListItem**

*Text*
: *required* A **String**: the text to find. Capital and small letters are the same.

*Index*
: *optional* A **Long**: the number of the item to start at. The default, 0, starts at the first.

*SubItemIndex*
: *optional* A **Long** variable: the number of the subitem to look in. With 0, the default, the method looks in every subitem, and sets the variable to the number of the subitem it found.

*Partial*
: *optional* A **Boolean**: **True** finds a subitem whose text holds *Text* anywhere in it; **False**, the default, one whose text is *Text*.

*Wrap*
: *optional* A **Boolean**: **True** goes on from the first item after the last.

A negative *Index* or *SubItemIndex*, an *Index* greater than the number of items, and a *SubItemIndex* greater than the number of columns less 1, raise run-time error 380. In [virtual mode](VirtualMode) the method raises run-time error 5.

### HitTest
{: .no_toc }

Returns the item at a point, or **Nothing** when there is none.

Syntax: *object*.**HitTest**( *X*, *Y* [, *SubItemIndex* ] ) **As LvwListItem**

*X*, *Y*
: *required* **Single**: the point, measured from the control's top left corner in the scale units of its container.

*SubItemIndex*
: *optional* A **Variant** variable that receives the number of the subitem at the point, in the report view, or 0 for the item's own text. Without it the method looks for the item alone.

The **MouseDown** and **MouseUp** events give their point in twips. On a container whose scale is not twips, a program converts it before it calls **HitTest**, with the container's **ScaleX** and **ScaleY**.

```tb check_build
Private Sub ListView1_MouseUp(Button As Integer, Shift As Integer, X As Single, Y As Single)
    Dim Item As LvwListItem, Column As Variant
    Set Item = ListView1.HitTest(X, Y, Column)
    If Not Item Is Nothing Then Debug.Print Item.Text; " column"; Column + 1
End Sub
```

## LvwSortOrderConstants
{: #lvwsortorderconstants }

The values of [**SortOrder**](#sortorder), and of the [**SortOrder**](LvwGroups#sortorder) of the groups.

| Member | Value | Description |
|---|---|---|
| **LvwSortOrderAscending**{: #LvwSortOrderConstants_LvwSortOrderAscending } | 0 | From A to Z, from the smallest to the largest. |
| **LvwSortOrderDescending**{: #LvwSortOrderConstants_LvwSortOrderDescending } | 1 | From Z to A, from the largest to the smallest. |

## LvwSortTypeConstants
{: #lvwsorttypeconstants }

The values of [**SortType**](#sorttype), and of the [**SortType**](LvwGroups#sorttype) of the groups.

| Member | Value | Description |
|---|---|---|
| **LvwSortTypeBinary**{: #LvwSortTypeConstants_LvwSortTypeBinary } | 0 | As text in the order of the user's language, with capital and small letters different. |
| **LvwSortTypeText**{: #LvwSortTypeConstants_LvwSortTypeText } | 1 | As text in the order of the user's language, with capital and small letters the same. |
| **LvwSortTypeNumeric**{: #LvwSortTypeConstants_LvwSortTypeNumeric } | 2 | As numbers, converted as **CDbl** converts them. A text that is not a number counts as 0. |
| **LvwSortTypeCurrency**{: #LvwSortTypeConstants_LvwSortTypeCurrency } | 3 | As amounts, converted as **CCur** converts them. A text that is not an amount counts as 0. |
| **LvwSortTypeDate**{: #LvwSortTypeConstants_LvwSortTypeDate } | 4 | As dates, converted as **CDate** converts them. A text that is not a date counts as the date 0, 30 December 1899. |
| **LvwSortTypeLogical**{: #LvwSortTypeConstants_LvwSortTypeLogical } | 5 | As Windows Explorer sorts file names: the digits in a text compare as numbers, so `file9` comes before `file10`. |

## LvwFindDirectionConstants
{: #lvwfinddirectionconstants }

The values of the *Direction* of [**FindNearestItem**](#findnearestitem). Each has the value of the key of the same name, of [**KeyCodeConstants**](../../../VBRUN/Constants/KeyCodeConstants).

| Member | Value | Description |
|---|---|---|
| **LvwFindDirectionUndefined**{: #LvwFindDirectionConstants_LvwFindDirectionUndefined } | 0 | No direction. |
| **LvwFindDirectionPrior**{: #LvwFindDirectionConstants_LvwFindDirectionPrior } | 33 | A page up. |
| **LvwFindDirectionNext**{: #LvwFindDirectionConstants_LvwFindDirectionNext } | 34 | A page down. |
| **LvwFindDirectionEnd**{: #LvwFindDirectionConstants_LvwFindDirectionEnd } | 35 | The last item. |
| **LvwFindDirectionHome**{: #LvwFindDirectionConstants_LvwFindDirectionHome } | 36 | The first item. |
| **LvwFindDirectionLeft**{: #LvwFindDirectionConstants_LvwFindDirectionLeft } | 37 | To the left. |
| **LvwFindDirectionUp**{: #LvwFindDirectionConstants_LvwFindDirectionUp } | 38 | Up. |
| **LvwFindDirectionRight**{: #LvwFindDirectionConstants_LvwFindDirectionRight } | 39 | To the right. |
| **LvwFindDirectionDown**{: #LvwFindDirectionConstants_LvwFindDirectionDown } | 40 | Down. |

## See Also

- [ListView](.) control
- [Columns](Columns) -- the sort arrows of the headers
- [LvwGroups](LvwGroups) class -- sorting the groups
