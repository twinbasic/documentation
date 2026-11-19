---
title: Virtual Mode
parent: ListView
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ListView/VirtualMode
has_toc: false
symbols:
  - LvwVirtualPropertyConstants
---

# Virtual Mode
{: .no_toc }

Shows a list that the [**ListView**](.) does not hold: the program says how many items there are, and gives the text, the icon and the other properties of each item when the control is about to show it.

```tb check_build
' VirtualMode is True in the Properties window, and View is LvwViewReport.
Private Sub Form_Load()
    ListView1.ColumnHeaders.Add , , "Number"
    ListView1.ColumnHeaders.Add , , "Square"
    ListView1.VirtualItemCount = 1000000
End Sub

Private Sub ListView1_GetVirtualItem(ByVal ItemIndex As Long, ByVal SubItemIndex As Long, ByVal VirtualProperty As LvwVirtualPropertyConstants, Value As Variant)
    If VirtualProperty = LvwVirtualPropertyText Then
        If SubItemIndex = 0 Then Value = CStr(ItemIndex) Else Value = CStr(CDbl(ItemIndex) * ItemIndex)
    End If
End Sub
```

* TOC
{:toc}

## A list the program supplies

[**VirtualMode**](#virtualmode) is set in the Properties window; at run time it is read-only. In virtual mode [**VirtualItemCount**](#virtualitemcount) is the number of items, up to a hundred million, and the control raises [**GetVirtualItem**](#getvirtualitem) for each property of each item it draws. It stores no items, so a program shows a list too long to add item by item, or one whose data is elsewhere, in a database or a file. [**CacheVirtualItems**](#cachevirtualitems) tells the program which items are about to be drawn, so that it can read them in one go, and [**VirtualDisabledInfos**](#virtualdisabledinfos) says which properties the control need not ask for.

<!-- test: ListViewTests.VirtualMode_RunTime_Raises382, ListViewTests.VirtualListItems_NotVirtual_Raises91 -->
An assignment to **VirtualMode** at run time raises run-time error 382. [**VirtualListItems**](#virtuallistitems), the items of a virtual list, raises run-time error 91 while the control is not in virtual mode.
<!-- /test -->

## What virtual mode changes

The control holds no items, no groups and no work areas: reading [**ListItems**](Items#listitems), [**Groups**](Groups#groups) and [**WorkAreas**](Views#workareas) raises run-time error 91, and [**VirtualListItems**](#virtuallistitems) returns the items by number. The items are always arranged automatically; the tile view, [**Sorted**](SortingAndSearching#sorted), [**GroupView**](Groups#groupview) and an [**Arrange**](Views#arrange) other than **LvwArrangeNone** raise run-time error 383, and [**FindSubItem**](SortingAndSearching#findsubitem), [**ResetForeColors**](Items#resetforecolors) and [**SelectedGroup**](Groups#selectedgroup) raise run-time error 5.

An item that the control returns, such as its [**SelectedItem**](Selection#selecteditem) or the *Item* of an event, is an [**LvwListItem**](LvwListItem) that knows its number alone. Its **Index**, **Text**, **SubItems**, **Selected**, **Checked**, **Hot**, **Indentation**, **Visible**, place and size can be read, its **Selected**, **Hot**, **Left** and **Top** set, and its **EnsureVisible** and **CreateDragImage** called; every other member raises run-time error 91.

Check boxes are the program's to keep. When the user checks or unchecks an item, the control raises [**ItemCheck**](Selection#itemcheck) with the state the item is to have, and then asks [**GetVirtualItem**](#getvirtualitem) for **LvwVirtualPropertyChecked**: the handler of **ItemCheck** stores the state where **GetVirtualItem** finds it.

Properties
----------

### VirtualDisabledInfos
{: .no_toc }

The properties that the control does not ask for in [**GetVirtualItem**](#getvirtualitem), so that a list that has no icons, say, is drawn faster. A sum of members of [**LvwVirtualPropertyConstants**](#lvwvirtualpropertyconstants). Default: 0, with which the control asks for all of them.

<!-- test: ListViewTests.VirtualDisabledInfos_Negative_Raises380 -->
A negative value raises run-time error 380.
<!-- /test -->

### VirtualItemCount
{: .no_toc }

The number of items of a virtual list. **Long**, from 0 to 100,000,000. Default: 0. A change keeps the list scrolled where it was. When the list gets its first items, the first one gets the focus, and is selected while [**AutoSelectFirstItem**](Selection#autoselectfirstitem) is **True**.

<!-- test: ListViewTests.VirtualItemCount_Negative_Raises380 -->
A number outside that range raises run-time error 380. While the control is not in virtual mode the number is kept and does nothing.
<!-- /test -->

### VirtualListItems
{: .no_toc }

The items of a virtual list, as an [**LvwVirtualListItems**](LvwVirtualListItems) collection. Read-only. While the control is not in virtual mode it raises run-time error 91.

### VirtualMode
{: .no_toc }

Whether the program supplies the items. **Boolean**. Default: **False**. It is set in the Properties window, where **True** also sets [**View**](Views#view) from tile to icon, [**Arrange**](Views#arrange) to **LvwArrangeNone**, and [**Sorted**](SortingAndSearching#sorted) and [**GroupView**](Groups#groupview) to **False**. At run time it is read-only.

Events
------

### CacheVirtualItems
{: .no_toc }

Raised in virtual mode before the control draws a range of items.

Syntax: *object*\_**CacheVirtualItems**( **ByVal** *FromIndex* **As Long**, **ByVal** *ToIndex* **As Long** )

*FromIndex*, *ToIndex*
: The numbers of the first and the last item of the range, from 1.

### FindVirtualItem
{: .no_toc }

Raised in virtual mode when the control looks for an item by its text: when the user types the first letters of an item, and when the program calls [**FindItem**](SortingAndSearching#finditem).

Syntax: *object*\_**FindVirtualItem**( **ByVal** *StartIndex* **As Long**, **ByVal** *SearchText* **As String**, **ByVal** *Partial* **As Boolean**, **ByVal** *Wrap* **As Boolean**, *FoundIndex* **As Long** )

*StartIndex*
: The number of the item to start at.

*SearchText*
: The text to find.

*Partial*
: **True** when an item whose text starts with *SearchText* matches; **False** when the text must be *SearchText*.

*Wrap*
: **True** when the search goes on from the first item after the last.

*FoundIndex*
: Set by the handler: the number of the item found, from 1. 0, the value when the event is raised, means none.

### GetVirtualItem
{: .no_toc }

Raised in virtual mode when the control needs a property of an item or of a subitem.

Syntax: *object*\_**GetVirtualItem**( **ByVal** *ItemIndex* **As Long**, **ByVal** *SubItemIndex* **As Long**, **ByVal** *VirtualProperty* **As LvwVirtualPropertyConstants**, *Value* **As Variant** )

*ItemIndex*
: The number of the item, from 1.

*SubItemIndex*
: The number of the subitem, or 0 for the item itself.

*VirtualProperty*
: The property asked for, one member of [**LvwVirtualPropertyConstants**](#lvwvirtualpropertyconstants).

*Value*
: Set by the handler: the property's value, of the type that member names. A handler that leaves it as it is gives the property its default: no text, no icon, and so on.

## LvwVirtualPropertyConstants
{: #lvwvirtualpropertyconstants }

The properties that [**GetVirtualItem**](#getvirtualitem) asks for, and that [**VirtualDisabledInfos**](#virtualdisabledinfos) sums.

| Member | Value | The handler gives |
|---|---|---|
| **LvwVirtualPropertyText**{: #LvwVirtualPropertyConstants_LvwVirtualPropertyText } | 1 | the text of the item or of the subitem, a **String** |
| **LvwVirtualPropertyIcon**{: #LvwVirtualPropertyConstants_LvwVirtualPropertyIcon } | 2 | the number or the key of the icon in [**Icons**](Views#icons) for the icon view, and in [**SmallIcons**](Views#smallicons) for the others; **Empty** for none |
| **LvwVirtualPropertyIndentation**{: #LvwVirtualPropertyConstants_LvwVirtualPropertyIndentation } | 4 | how far the item is moved to the right in the report view, in widths of a small icon, a **Long** |
| **LvwVirtualPropertyToolTipText**{: #LvwVirtualPropertyConstants_LvwVirtualPropertyToolTipText } | 8 | the tool tip, a **String**, shown while [**ShowInfoTips**](Items#showinfotips) is **True** |
| **LvwVirtualPropertyBold**{: #LvwVirtualPropertyConstants_LvwVirtualPropertyBold } | 16 | whether the text is bold, a **Boolean** |
| **LvwVirtualPropertyForeColor**{: #LvwVirtualPropertyConstants_LvwVirtualPropertyForeColor } | 32 | the color of the text, an **OLE_COLOR**; the control's [**ForeColor**](Appearance#forecolor) when the event is raised |
| **LvwVirtualPropertyChecked**{: #LvwVirtualPropertyConstants_LvwVirtualPropertyChecked } | 64 | whether the item's check box is checked, a **Boolean** |

## See Also

- [ListView](.) control
- [LvwVirtualListItems](LvwVirtualListItems) class -- the items of a virtual list
- [VListBox](../VListBox) -- a list box whose items the program supplies in the same way
