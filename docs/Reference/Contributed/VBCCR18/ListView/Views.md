---
title: Views and Icons
parent: ListView
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ListView/Views
has_toc: false
symbols:
  - LvwViewConstants
  - LvwArrangeConstants
---

# Views and Icons
{: .no_toc }

Shows the items of a [**ListView**](.) as large icons, small icons, a list, tiles or a report, with the pictures of two image lists, and arranges, places and scrolls them.

```tb check_build
Set ListView1.Icons = ImageList1          ' the large icons, for the icon and tile views
Set ListView1.SmallIcons = ImageList1     ' a program gives the other views a list of small ones
ListView1.View = LvwViewSmallIcon
ListView1.Arrange = LvwArrangeAutoTop     ' in rows from the top, again after each change
```

* TOC
{:toc}

## The five views

[**View**](#view) decides how the items are shown:

| View | The items are shown |
|---|---|
| **LvwViewIcon** | as large icons with the text under them, in rows |
| **LvwViewSmallIcon** | as small icons with the text beside them, in rows |
| **LvwViewList** | as small icons with the text beside them, in columns of one width, [**ColumnWidth**](#columnwidth) |
| **LvwViewReport** | as rows of a table, one column for the text and one for each subitem, under a header of [columns](Columns) |
| **LvwViewTile** | as large icons with the text and up to [**TileViewLines**](#tileviewlines) subitems beside them |

The report view is the only one that shows the [column headers](Columns) and the [subitems](Items#subitems) in columns; the tile view shows the subitems that an item's [**TileViewIndices**](LvwListItem#tileviewindices) names. The [groups](Groups) are shown in every view but the list view.

![Four list views of the same four items: in LvwViewIcon large icons with the names under them in a row, in LvwViewSmallIcon small icons with the names beside them in rows, in LvwViewList small icons in a column, and under them LvwViewTile, large icons in two columns with the name, the type and the size beside each, with TileViewLines set to 2](Images/Views.png){:width="741" height="327"}

## The image lists

An item takes its large icon from the image list of [**Icons**](#icons), in the icon and tile views, and its small icon from that of [**SmallIcons**](#smallicons), in the others. The item names its icons by their number or their key in that list, as its [**Icon**](LvwListItem#icon) and [**SmallIcon**](LvwListItem#smallicon); the [subitems](LvwListSubItem#reporticon) take theirs from **SmallIcons** as well.

<!-- test: ListViewTests.Icons_ImageList_IsTheImageList, ListViewTests.Icons_OtherObject_Raises35610 -->
Each of the image list properties takes an [**ImageList**](../ImageList/) control, the name of one that is on the same form, as a **String**, or the handle of an image list of Windows. It then returns the **ImageList** control, or the handle that was given. A name that no image list of the form has gives the control no list, and the property then returns **Nothing**. An object that is not an **ImageList** raises run-time error 35610, *Invalid object*, and a value of another type raises run-time error 13.
<!-- /test -->

The control uses the image list of Windows that the **ImageList** has when it is given it. A program that clears the **ImageList**, or removes its last picture, gives it to the control again once it has pictures.

## Arranging the icons

In the icon, small icon and tile views every item has a place of its own, which the user can change by dragging the item and the program by its [**Left**](LvwListItem#left-top) and [**Top**](LvwListItem#left-top). [**Arrange**](#arrange) can align the items to the left or the top edge, and can arrange them again after each change. [**SnapToGrid**](#snaptogrid) puts an item that the user drops on the nearest place of a grid. [**IconSpacingWidth**](#iconspacingheight-iconspacingwidth) and [**IconSpacingHeight**](#iconspacingheight-iconspacingwidth) are the distances between the places in the icon view.

## Work areas

[**WorkAreas**](#workareas) divides the control into rectangles, each of which holds icons of its own, in the icon, small icon and tile views. The control arranges the items in the first one, and the user can drag an item into another. The [**LvwWorkAreas**](LvwWorkAreas) page has the details.

```tb check_build check_run arch=win32,win64
With ListView1
    .View = LvwViewIcon
    .WorkAreas.Add 0, 0, 1500, 1500
    .WorkAreas.Add 1500, 0, 1500, 1500
    .ListItems.Add , , "first"
    Debug.Print .WorkAreas.Count; .ListItems(1).WorkArea.Index
End With
' Output:
'  2  1
```

## Scrolling and size

[**TopItem**](#topitem) is the first item that can be seen, and [**GetVisibleCount**](#getvisiblecount) the number of items the control has room for. [**Scroll**](#scroll) scrolls the control by a distance, and an item's [**EnsureVisible**](LvwListItem#ensurevisible) scrolls it into view. [**ComputeControlSize**](#computecontrolsize) works out how large the control must be to show a number of items.

Properties
----------

### Arrange
{: .no_toc }

How the icons are placed in the icon, small icon and tile views. A member of [**LvwArrangeConstants**](#lvwarrangeconstants). Default: **LvwArrangeNone**.

<!-- test: ListViewTests.Arrange_NotAMember_Raises380 -->
Another value raises run-time error 380.
<!-- /test -->

In [virtual mode](VirtualMode) the items are always arranged automatically, and a value other than **LvwArrangeNone** raises run-time error 383.

### ColumnWidth
{: .no_toc }

The width of the columns in the list view, in the scale units of the control's container. **Single**.

<!-- test: ListViewTests.ColumnWidth_NotInListView_Raises394 -->
It has a meaning in the list view only. Reading it in another view raises run-time error 394, and an assignment in another view raises run-time error 383. A width of 0 or less raises run-time error 380.
<!-- /test -->

### IconSpacingHeight, IconSpacingWidth
{: .no_toc }

The distance from the top of one icon's place to the top of the next, and from the left of one to the left of the next, in the scale units of the control's container. **Single**. They can be read in the icon and small icon views and set in the icon view. Reading them in another view raises run-time error 394, setting them in another raises run-time error 383, and a negative value raises run-time error 380. [**ResetIconSpacing**](#reseticonspacing) gives back the spacing of Windows.

### Icons
{: .no_toc }

The image list of the large icons. **Variant**: an [**ImageList**](../ImageList/) control, its name or the handle of an image list; see [The image lists](#the-image-lists). Default: none. It is assigned with **Set**, or without it for a name or a handle.

### LabelWrap
{: .no_toc }

Whether the text of an item in the icon view goes on to more lines when it is wider than the icon. **Boolean**. Default: **True**. With **False** the text is on one line, cut off where it is too long.

### SmallIcons
{: .no_toc }

The image list of the small icons, used in the small icon, list and report views, and for the icons of the subitems. **Variant**: as for [**Icons**](#icons). Default: none.

### SnapToGrid
{: .no_toc }

Whether an item that the user drops in the icon, small icon or tile view goes to the nearest place of a grid. **Boolean**. Default: **False**.

### TileViewLines
{: .no_toc }

The number of subitems an item can show under its text in the tile view. **Long**, from 0 to 20. Default: 1.

<!-- test: ListViewTests.TileViewLines_21_Raises380 -->
A value outside that range raises run-time error 380.
<!-- /test -->

### TopItem
{: .no_toc }

The first item that can be seen at the top of the control. An [**LvwListItem**](LvwListItem), read-only. **Nothing** when the control has no items.

### View
{: .no_toc }

How the items are shown. A member of [**LvwViewConstants**](#lvwviewconstants). Default: **LvwViewIcon**. See [The five views](#the-five-views).

<!-- test: ListViewTests.View_NotAMember_Raises380 -->
Another value raises run-time error 380.
<!-- /test -->

In [virtual mode](VirtualMode) **LvwViewTile** raises run-time error 383.

### WorkAreas
{: .no_toc }

The work areas of the control, as an [**LvwWorkAreas**](LvwWorkAreas) collection. Read-only. In [virtual mode](VirtualMode) reading it raises run-time error 91.

Methods
-------

### ComputeControlSize
{: .no_toc }

Works out the width and the height the control needs to show a number of items in the current view.

Syntax: *object*.**ComputeControlSize** *VisibleCount*, *Width*, *Height* [, *ProposedWidth* ] [, *ProposedHeight* ]

*VisibleCount*
: *required* A **Long**: the number of items. A negative number raises run-time error 380.

*Width*, *Height*
: *required* **Single** variables that receive the size, border included, in the scale units of the control's container.

*ProposedWidth*, *ProposedHeight*
: *optional* **Single**: a size to start from. Without them, or with 0, the control's own size is used.

### GetVisibleCount
{: .no_toc }

Returns the number of items that the control has room for, without scrolling, in the list and report views. In the icon, small icon and tile views it returns the number of items. **Long**.

Syntax: *object*.**GetVisibleCount**( ) **As Long**

### ResetIconSpacing
{: .no_toc }

Gives the icon view the spacing between icons of Windows again, after [**IconSpacingWidth**](#iconspacingheight-iconspacingwidth) or [**IconSpacingHeight**](#iconspacingheight-iconspacingwidth) changed it.

Syntax: *object*.**ResetIconSpacing**

### Scroll
{: .no_toc }

Scrolls the contents of the control.

Syntax: *object*.**Scroll** *X*, *Y*

*X*, *Y*
: *required* **Single**: the distances to scroll to the right and down, in the scale units of the control's container; negative ones scroll to the left and up. In the report view a vertical distance is rounded to whole rows.

### TextWidth
{: .no_toc }

Returns how wide a text is in the control's font, in the scale units of the control's container. **Single**. 0 for an empty string.

Syntax: *object*.**TextWidth**( *Text* ) **As Single**

*Text*
: *required* A **String**.

Events
------

### AfterScroll, BeforeScroll
{: .no_toc }

Raised when the contents of the control start to scroll, and when they have scrolled. A program that keeps a window of its own over the control, such as an edit box over a subitem, moves or hides it here.

Syntax: *object*\_**AfterScroll**( **ByVal** *DeltaX* **As Single**, **ByVal** *DeltaY* **As Single** )

*DeltaX*, *DeltaY*
: The horizontal and the vertical distance of the scroll that Windows reports, in the scale units of the control's container.

## LvwViewConstants
{: #lvwviewconstants }

The values of [**View**](#view).

| Member | Value | Description |
|---|---|---|
| **LvwViewIcon**{: #LvwViewConstants_LvwViewIcon } | 0 | Large icons, with the text under them. |
| **LvwViewSmallIcon**{: #LvwViewConstants_LvwViewSmallIcon } | 1 | Small icons, with the text beside them, in rows. |
| **LvwViewList**{: #LvwViewConstants_LvwViewList } | 2 | Small icons, with the text beside them, in columns. |
| **LvwViewReport**{: #LvwViewConstants_LvwViewReport } | 3 | A table with a header and a column for each subitem. |
| **LvwViewTile**{: #LvwViewConstants_LvwViewTile } | 4 | Large icons, with the text and some subitems beside them. |

## LvwArrangeConstants
{: #lvwarrangeconstants }

The values of [**Arrange**](#arrange).

| Member | Value | Description |
|---|---|---|
| **LvwArrangeNone**{: #LvwArrangeConstants_LvwArrangeNone } | 0 | The items stay where they are put. |
| **LvwArrangeAutoLeft**{: #LvwArrangeConstants_LvwArrangeAutoLeft } | 1 | The items are arranged in columns from the left edge, again after each change. |
| **LvwArrangeAutoTop**{: #LvwArrangeConstants_LvwArrangeAutoTop } | 2 | The items are arranged in rows from the top edge, again after each change. |
| **LvwArrangeLeft**{: #LvwArrangeConstants_LvwArrangeLeft } | 3 | The items are aligned in columns from the left edge, and stay where they are put after that. |
| **LvwArrangeTop**{: #LvwArrangeConstants_LvwArrangeTop } | 4 | The items are aligned in rows from the top edge, and stay where they are put after that. |

## See Also

- [ListView](.) control
- [ImageList](../ImageList/) control -- the pictures of the icons
- [LvwWorkAreas](LvwWorkAreas) class -- the work areas
