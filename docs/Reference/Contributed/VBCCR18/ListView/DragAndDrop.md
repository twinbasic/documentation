---
title: Drag and Drop
parent: ListView
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ListView/DragAndDrop
has_toc: false
---

# Drag and Drop
{: .no_toc }

Lets the user of a [**ListView**](.) drag its items to another place or program, shows where a drop would go, and takes the files dropped from Windows Explorer.

```tb check_build
Private Sub ListView1_ItemDrag(ByVal Item As LvwListItem, ByVal Button As Integer)
    If Button = vbLeftButton Then ListView1.OLEDrag     ' drags Item
End Sub

Private Sub ListView1_OLEStartDrag(Data As DataObject, AllowedEffects As Long)
    Data.SetData ListView1.OLEDraggedItem.Text, vbCFText
    AllowedEffects = vbDropEffectMove
End Sub

Private Sub ListView1_OLEDragOver(Data As DataObject, Effect As Long, Button As Integer, Shift As Integer, X As Single, Y As Single, State As Integer)
    Dim Item As LvwListItem, After As Boolean
    Set Item = ListView1.HitTestInsertMark(X, Y, After)
    Set ListView1.InsertMark(After) = Item
End Sub
```

* TOC
{:toc}

## Dragging items

The user drags an item by pressing a mouse button on it and moving the mouse, which raises [**ItemDrag**](#itemdrag). With [**OLEDragMode**](#oledragmode) **vbOLEDragAutomatic** the control then starts an OLE drag of the item at once, with the item's text as the data. With **vbOLEDragManual**, the default, the program starts it, if it wants one, by calling [**OLEDrag**](#oledrag) in the handler of **ItemDrag**. During the drag [**OLEDraggedItem**](#oledraggeditem) is the item.

Within the control, in the icon, small icon and tile views, the dragged item follows the pointer and stays where it is dropped, unless [**Arrange**](Views#arrange) arranges the items automatically. [**OLEDragDropScroll**](#oledragdropscroll) scrolls the control while the pointer is near one of its edges during a drag.

The rest is the [OLE drag and drop](../Common#ole-drag-and-drop) of the package's other controls: **OLEDropMode**, **OLEDragOver**, **OLEDragDrop** and the events of the source.

## Showing where a drop goes

The control can show the place of a drop in two ways. [**DropHighlight**](#drophighlight) highlights an item, for a drop onto it, such as a file dropped on a folder. [**InsertMark**](#insertmark) draws a line before or after an item, for a drop between two items; [**HitTestInsertMark**](#hittestinsertmark) gives the item and the side for a point of **OLEDragOver**. The program sets them, and sets them back to **Nothing** when the drag leaves the control or ends.

## Dropped files

With [**AllowDropFiles**](#allowdropfiles) **True** and **OLEDropMode** **OLEDropModeNone**, files dropped on the control from Windows Explorer raise [**DropFiles**](#dropfiles) with their paths. With **OLEDropModeManual** they arrive as OLE data in **OLEDragDrop** instead.

```tb check_build
Private Sub ListView1_DropFiles(FileList As Variant, ByVal X As Single, ByVal Y As Single)
    Dim i As Long
    For i = LBound(FileList) To UBound(FileList)
        ListView1.ListItems.Add , , FileList(i)
    Next
End Sub
```

Properties
----------

### AllowDropFiles
{: .no_toc }

Whether files dropped from Windows Explorer raise [**DropFiles**](#dropfiles). **Boolean**. Default: **False**. It has an effect while [**OLEDropMode**](../Common#oledropmode) is **OLEDropModeNone**.

### DropHighlight
{: .no_toc }

The item highlighted as the target of a drop. An [**LvwListItem**](LvwListItem), or **Nothing**. Setting it highlights that item and takes the highlight from any other; **Nothing** highlights none.

### InsertMark
{: .no_toc }

The item at which the insertion mark is drawn, a line between two items. An [**LvwListItem**](LvwListItem), or **Nothing** for no mark. It has an effect when the program has visual styles.

Syntax: *object*.**InsertMark**( [ *After* ] ) [ = *item* ]

*After*
: *optional* A **Boolean**. In an assignment, **True** draws the mark after the item and **False**, the default, before it. In a reading, a variable that receives where the mark is.

<!-- test: ListViewTests.InsertMark_After_IsKept -->
```tb check_build check_run arch=win32,win64
Dim After As Boolean
With ListView1
    .View = LvwViewReport
    .ColumnHeaders.Add , , "Name"
    .ListItems.Add , , "alpha"
    .ListItems.Add , , "beta"
    Set .InsertMark(True) = .ListItems(1)     ' between alpha and beta
    Debug.Print .InsertMark(After).Text; After
    Set .InsertMark = Nothing
    Debug.Print TypeName(.InsertMark)
End With
' Output:
' alphaTrue
' Nothing
```
<!-- /test -->

### InsertMarkColor
{: .no_toc }

The color of the insertion mark. **OLE_COLOR**. Default: **vbBlack**. It has an effect when the program has visual styles.

### OLEDragDropScroll
{: .no_toc }

Whether the control scrolls while the pointer of an OLE drag is near one of its edges. **Boolean**. Default: **True**.

### OLEDragDropScrollOrientation
{: .no_toc }

In which directions [**OLEDragDropScroll**](#oledragdropscroll) scrolls. A member of [**CCScrollOrientationConstants**](../Common#ccscrollorientationconstants). Default: **CCScrollOrientationBoth**. Another value raises run-time error 380.

### OLEDraggedItem
{: .no_toc }

The item that an OLE drag started at the control is dragging. An [**LvwListItem**](LvwListItem), read-only, or **Nothing** when there is none.

### OLEDragMode
{: .no_toc }

Whether the control starts an OLE drag by itself when the user drags an item. A member of [**OLEDragConstants**](../../../VBRUN/Constants/OLEDragConstants): **vbOLEDragManual** (the default) or **vbOLEDragAutomatic**. Another value raises run-time error 380. See [Dragging items](#dragging-items).

Methods
-------

### HitTestInsertMark
{: .no_toc }

Returns the item at which an insertion mark for a point belongs, or **Nothing**, and whether the mark goes after it. It needs visual styles; without them it returns **Nothing**.

Syntax: *object*.**HitTestInsertMark**( *X*, *Y* [, *After* ] ) **As LvwListItem**

*X*, *Y*
: *required* **Single**: the point, measured from the control's top left corner in the scale units of its container, such as the point of **OLEDragOver**.

*After*
: *optional* A **Boolean** variable that receives **True** when the mark goes after the item.

### OLEDrag
{: .no_toc }

Starts an OLE drag with the control as its source, as on the [other controls](../Common#oledrag). Called in the handler of [**ItemDrag**](#itemdrag), the drag takes the item the user is dragging, and [**OLEDraggedItem**](#oledraggeditem) returns it.

Syntax: *object*.**OLEDrag**

Events
------

### DropFiles
{: .no_toc }

Raised when files from Windows Explorer are dropped on the control, while [**AllowDropFiles**](#allowdropfiles) is **True**.

Syntax: *object*\_**DropFiles**( *FileList* **As Variant**, **ByVal** *X* **As Single**, **ByVal** *Y* **As Single** )

*FileList*
: An array of **String**, from 0: the full path of each file or folder dropped.

*X*, *Y*
: Where they were dropped, measured from the control's top left corner in the scale units of its container.

### ItemDrag
{: .no_toc }

Raised when the user starts to drag an item with the left or the right mouse button.

Syntax: *object*\_**ItemDrag**( **ByVal** *Item* **As LvwListItem**, **ByVal** *Button* **As Integer** )

*Item*
: The [**LvwListItem**](LvwListItem).

*Button*
: **vbLeftButton** or **vbRightButton**. With **vbOLEDragAutomatic** the control starts a drag for the left button only.

### OLEStartDrag
{: .no_toc }

Raised when an OLE drag starts at the control, as on the [other controls](../Common#olestartdrag). With [**OLEDragMode**](#oledragmode) **vbOLEDragAutomatic**, *Data* already holds the text of the dragged item, and *AllowedEffects* is **vbDropEffectCopy** plus **vbDropEffectMove**; the handler can change both. A handler that sets *AllowedEffects* to **vbDropEffectNone** ends the drag.

Syntax: *object*\_**OLEStartDrag**( *Data* **As DataObject**, *AllowedEffects* **As Long** )

## See Also

- [ListView](.) control
- [Common members](../Common#ole-drag-and-drop) -- the OLE drag and drop of every control
- [DataObject](../../../VBRUN/DataObject/) class -- what an OLE drag carries
