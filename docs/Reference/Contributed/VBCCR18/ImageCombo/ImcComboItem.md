---
title: ImcComboItem
parent: ImageCombo
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ImageCombo/ImcComboItem
has_toc: false
---

# ImcComboItem class
{: .no_toc }

One item of an [**ImageCombo**](.): its number, its key, its text, its pictures, its indentation, and whether it is the selected item. A program gets one from the [**ImcComboItems**](ImcComboItems) collection, from that collection's [**Add**](ImcComboItems#add) method, and from the [**SelectedItem**](.#selecteditem), [**TopItem**](.#topitem) and [**FindItem**](.#finditem) members of the control.

```tb check_build check_run arch=win32,win64
Dim Item As ImcComboItem
Set Item = ImageCombo1.ComboItems.Add(, "open", "Open")
Item.Tag = "Opens a file"
Item.Data = 42
Debug.Print Item.Index & " " & Item.Key & " " & Item.Text
Debug.Print ImageCombo1.ComboItems("open").Tag; ImageCombo1.ComboItems("open").Data
' Output:
' 1 open Open
' Opens a file 42
```

A program cannot make an **ImcComboItem** object with **New**.

<!-- test: ImageComboTests.Item_AfterRemove_KeepsItsOldNumber -->
An object kept in a variable after its item is removed from the list still has its old number, and its other members then work on the item that has that number now.
<!-- /test -->

* TOC
{:toc}

Properties
----------

### Data
{: .no_toc }

A number of the program's own that the item holds, such as the key of the record the item stands for. **LongPtr**. A new item has 0.

<!-- test: ImageComboTests.Data_NewItem_IsZeroAndAssignedIsKept -->
An assignment is kept with the item.
<!-- /test -->

### Image
{: .no_toc }

The picture that the item shows, in the image list of the [**ImageCombo**](.#the-pictures): its number from 1, or its key. **Variant**. 0 for an item with no picture. A key can be assigned only while the control has an image list that can look keys up, which [The pictures](.#the-pictures) describes.

<!-- test: ImageComboTests.Image_Assigned_ChangesImageAndImageIndex, ImageComboTests.Image_UnknownKey_Raises35601, ImageComboTests.Image_Negative_Raises35600, ImageComboTests.Image_Number_IsNotCheckedAgainstTheImageList -->
Reading it returns what was assigned, a number or a key, and [**ImageIndex**](#imageindex) the number. A key that the image list does not have raises run-time error 35601, and a negative number raises 35600; the item keeps its picture. A number is not compared with the number of pictures in the list.
<!-- /test -->

### ImageIndex
{: .no_toc }

The number of the picture that [**Image**](#image) names, in the image list, from 1. **Long**, read-only. 0 for an item with no picture.

### Indentation
{: .no_toc }

How far the item is indented, in widths of a picture of the image list. **Long**. A new item has the [**Indentation**](.#indentation) of the control, unless [**Add**](ImcComboItems#add) gave it one.

### Index
{: .no_toc }

The number of the item in the list, from 1. **Long**, read-only. It changes when an item is added or removed before this one.

### Key
{: .no_toc }

The key of the item in the [**ImcComboItems**](ImcComboItems) collection. **String**. Empty for an item without a key.

<!-- test: ImageComboTests.Key_Assigned_RenamesTheItem, ImageComboTests.Key_Empty_TakesTheKeyAway, ImageComboTests.Key_OfAnotherItem_Raises457 -->
An assignment gives the item another key, and the collection no longer finds it by the old one. An empty string takes the key away. A key that another item of the list has raises run-time error 457, and the item keeps its key.
<!-- /test -->

### Selected
{: .no_toc }

Whether the item is the selected item of the control. **Boolean**. An assignment of **True** selects the item. If the item was not selected, the text box of an **ImcStyleDropDownCombo** control takes the item's text, and the control raises [**Change**](.#change) and then [**Click**](.#click). An assignment of **False** to the selected item removes the selection and empties the text box, and raises **Change** and then **Click**.

<!-- test: ImageComboTests.Selected_True_RaisesChangeThenClick, ImageComboTests.Selected_False_RemovesTheSelection -->
See [The selection and the text](.#the-selection-and-the-text).
<!-- /test -->

<!-- test: ImageComboTests.Selected_FalseOnAnotherItem_ChangesNothingAndRaisesNoClick -->
An assignment of **False** to an item that is not selected leaves the selection as it is, and raises no event.
<!-- /test -->

### SelImage
{: .no_toc }

The picture that the item shows while it is the selected item, in the text box and in the list: its number in the image list, from 1. **Long**. 0, the default, means the picture of [**Image**](#image). A negative number raises run-time error 35600.

<!-- test: ImageComboTests.SelImage_Assigned_ChangesSelImageIndex, ImageComboTests.SelImage_Negative_Raises35600, ImageComboTests.SelImage_Key_Raises13 -->
An assignment takes a number: a key raises run-time error 13. [**SelImageIndex**](#selimageindex) is the number as the control keeps it.
<!-- /test -->

<!-- test: ImageComboTests.SelImage_KeyGivenToAdd_CanBeRead -->
> [!NOTE] 1.8.137.0
> A key that [**Add**](ImcComboItems#add) took for its *SelImage* gives the item the right picture, but reading **SelImage** then raises run-time error 13. [**SelImageIndex**](#selimageindex) gives the picture's number all the same.

### SelImageIndex
{: .no_toc }

The number of the picture that [**SelImage**](#selimage) names, in the image list, from 1. **Long**, read-only. 0 when the item has none of its own.

### Tag
{: .no_toc }

A value of the program's own, which the control does not use. **Variant**: unlike the [**Tag**](../Common#tag) of a control it holds a value of any type, an object included, which is assigned with **Set**.

<!-- test: ImageComboTests.Tag_NewItem_IsAnEmptyString -->
A new item has an empty string.
<!-- /test -->

### Text
{: .no_toc }

The text of the item. **String**. It is the default member, so `ImageCombo1.ComboItems(1)` is the text of the first item.

<!-- test: ImageComboTests.Text_OfAnItem_IsCutTo259, ImageComboTests.Text_OfTheSelectedItem_Assigned_ChangesTheTextBox -->
An assignment changes the text in the list. When the item is the selected one of an **ImcStyleDropDownCombo** control, the text box receives the new text and the control raises [**Change**](.#change). An item holds at most 259 characters, and a longer text loses what is beyond that.
<!-- /test -->

## See Also

- [ImageCombo](.) class
- [ImcComboItems](ImcComboItems) class -- the collection of the items
