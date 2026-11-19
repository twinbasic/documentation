---
title: ImcComboItems
parent: ImageCombo
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ImageCombo/ImcComboItems
has_toc: false
---

# ImcComboItems class
{: .no_toc }

The collection of the items of an [**ImageCombo**](.), which its [**ComboItems**](.#comboitems) property returns. Its members are [**ImcComboItem**](ImcComboItem) objects, numbered from 1 in the order of the list, and an item can have a key as well.

```tb hidden
Public Type SquarePictDesc
    Size As Long
    Kind As Long
    Handle As LongPtr
    Palette As LongPtr
End Type
Public Type SquareGuid
    Data1 As Long
    Data2 As Integer
    Data3 As Integer
    Data4(0 To 7) As Byte
End Type
Public Declare PtrSafe Function SqGetDC Lib "user32" Alias "GetDC" (ByVal hWnd As LongPtr) As LongPtr
Public Declare PtrSafe Function SqReleaseDC Lib "user32" Alias "ReleaseDC" (ByVal hWnd As LongPtr, ByVal hDC As LongPtr) As Long
Public Declare PtrSafe Function SqCreateCompatibleDC Lib "gdi32" Alias "CreateCompatibleDC" (ByVal hDC As LongPtr) As LongPtr
Public Declare PtrSafe Function SqCreateCompatibleBitmap Lib "gdi32" Alias "CreateCompatibleBitmap" (ByVal hDC As LongPtr, ByVal W As Long, ByVal H As Long) As LongPtr
Public Declare PtrSafe Function SqSelectObject Lib "gdi32" Alias "SelectObject" (ByVal hDC As LongPtr, ByVal hObject As LongPtr) As LongPtr
Public Declare PtrSafe Function SqCreateSolidBrush Lib "gdi32" Alias "CreateSolidBrush" (ByVal Color As Long) As LongPtr
Public Declare PtrSafe Function SqPatBlt Lib "gdi32" Alias "PatBlt" (ByVal hDC As LongPtr, ByVal X As Long, ByVal Y As Long, ByVal W As Long, ByVal H As Long, ByVal Rop As Long) As Long
Public Declare PtrSafe Function SqDeleteObject Lib "gdi32" Alias "DeleteObject" (ByVal hObject As LongPtr) As Long
Public Declare PtrSafe Function SqDeleteDC Lib "gdi32" Alias "DeleteDC" (ByVal hDC As LongPtr) As Long
Public Declare PtrSafe Function SqOleCreatePictureIndirect Lib "oleaut32" Alias "OleCreatePictureIndirect" (ByRef Desc As SquarePictDesc, ByRef IID As SquareGuid, ByVal Own As Long, ByRef Pic As IPictureDisp) As Long

' A bitmap of one color.
Public Function ColorSquare(ByVal Color As Long, Optional ByVal Width As Long = 16, Optional ByVal Height As Long = 16) As StdPicture
    Dim screenDC As LongPtr, memDC As LongPtr, bmp As LongPtr, brush As LongPtr, oldBmp As LongPtr, oldBrush As LongPtr
    screenDC = SqGetDC(0)
    memDC = SqCreateCompatibleDC(screenDC)
    bmp = SqCreateCompatibleBitmap(screenDC, Width, Height)
    brush = SqCreateSolidBrush(Color)
    oldBmp = SqSelectObject(memDC, bmp)
    oldBrush = SqSelectObject(memDC, brush)
    SqPatBlt memDC, 0, 0, Width, Height, &HF00021
    SqSelectObject memDC, oldBrush
    SqSelectObject memDC, oldBmp
    SqDeleteObject brush
    SqDeleteDC memDC
    SqReleaseDC 0, screenDC
    Dim desc As SquarePictDesc, iid As SquareGuid, pic As IPictureDisp
    desc.Size = LenB(desc)
    desc.Kind = 1
    desc.Handle = bmp
    iid.Data1 = &H7BF80981
    iid.Data2 = &HBF32
    iid.Data3 = &H101A
    iid.Data4(0) = &H8B
    iid.Data4(1) = &HBB
    iid.Data4(3) = &HAA
    iid.Data4(5) = &H30
    iid.Data4(6) = &HC
    iid.Data4(7) = &HAB
    SqOleCreatePictureIndirect desc, iid, 1, pic
    Set ColorSquare = pic
End Function
```

<!-- test: ImageComboTests.Add_AtAnIndex_MovesTheLaterItemsUp -->
```tb check_build check_run arch=win32,win64
Dim Item As ImcComboItem
ImageCombo1.ComboItems.Add , "open", "Open"
ImageCombo1.ComboItems.Add , "save", "Save"
ImageCombo1.ComboItems.Add 1, "new", "New"            ' before the first
For Each Item In ImageCombo1.ComboItems
    Debug.Print Item.Index & " " & Item.Key & " " & Item.Text
Next
' Output:
' 1 new New
' 2 open Open
' 3 save Save
```
<!-- /test -->

A program goes through the items with **For Each**, or by number from 1 to [**Count**](#count). It cannot make an **ImcComboItems** object with **New**.

* TOC
{:toc}

## Numbers and keys

<!-- test: ImageComboTests.Remove_RenumbersTheLaterItems, ImageComboTests.Key_Assigned_RenamesTheItem -->
The number of an item is its place in the list. It changes when an item is added before it or removed before it, so a program that keeps a number over such a change keeps the wrong item. A key stays with its item.
<!-- /test -->

<!-- test: ImageComboTests.Item_ByKey_IgnoresCase, ImageComboTests.Add_DuplicateKey_Raises457 -->
A key is any string, and capital and small letters in it are the same: `"Open"` and `"OPEN"` are one key. No two items of a list have the same key. An item needs no key: an empty string is no key, and any number of items can be without one.
<!-- /test -->

```tb check_build check_run arch=win32,win64
ImageCombo1.ComboItems.Add , "open", "Open"
ImageCombo1.ComboItems.Add , "save", "Save"
Debug.Print ImageCombo1.ComboItems("SAVE").Index
ImageCombo1.ComboItems.Remove "open"
Debug.Print ImageCombo1.ComboItems("save").Index
Debug.Print ImageCombo1.ComboItems.Exists("open")
' Output:
'  2
'  1
' False
```

Properties
----------

### Count
{: .no_toc }

The number of items in the list. **Long**, read-only.

### Item
{: .no_toc }

Returns one item. It is the default member, so `ImageCombo1.ComboItems("open")` is `ImageCombo1.ComboItems.Item("open")`.

Syntax: *object*.**Item**( *Index* ) **As ImcComboItem**

*Index*
: *required* The number of the item, from 1 to [**Count**](#count), or its key as a **String**.

<!-- test: ImageComboTests.Item_NumberOutOfRange_Raises9, ImageComboTests.Item_UnknownKey_Raises5 -->
A number outside that range raises run-time error 9, and a key that no item has raises run-time error 5. [**Exists**](#exists) asks without an error.
<!-- /test -->

Methods
-------

### Add
{: .no_toc }

Puts an item into the list and returns its [**ImcComboItem**](ImcComboItem).

Syntax: *object*.**Add**( [ *Index* ] [, *Key* ] [, *Text* ] [, *Image* ] [, *SelImage* ] [, *Indentation* ] ) **As ImcComboItem**

*Index*
: *optional* A **Long**: the number the new item gets. The items from that number on move up by one. Without it, or with 0, the item goes after the last one.

*Key*
: *optional* A **String** by which the program can name the item. See [Numbers and keys](#numbers-and-keys).

*Text*
: *optional* A **String**: the text of the item.

*Image*
: *optional* A **Variant**: the number or the key of the picture that the item shows, in the image list of the [**ImageCombo**](.#the-pictures). Without it the item has no picture.

*SelImage*
: *optional* A **Variant**: the number or the key of the picture that the item shows while it is the selected item. Without it, or with 0, the item shows the picture of *Image*. Give a number: see the note under [**SelImage**](ImcComboItem#selimage).

*Indentation*
: *optional* A **Long**: the indentation of the item, in widths of a picture. Without it the item gets the [**Indentation**](.#indentation) of the control.

<!-- test: ImageComboTests.Add_IndexOutOfRange_Raises35600, ImageComboTests.Add_ImageKey_WithoutAnImageList_Raises35601, ImageComboTests.Add_ImageNumber_IsNotCheckedAgainstTheImageList, ImageComboTests.Add_ImageNegative_Raises35600 -->
An *Index* that is negative or greater than [**Count**](#count) + 1 raises run-time error 35600, *Index out of bounds*. A key for *Image* or *SelImage* that the control's image list does not have raises run-time error 35601, *Element not found*. So does any key when the control has no image list, or was given a handle. A negative number raises 35600. A number is not compared with the number of pictures in the list.
<!-- /test -->

<!-- test: ImageComboTests.Add_DuplicateKey_Raises457 -->
A *Key* that another item has raises run-time error 457, and the list is as it was.
<!-- /test -->

<!-- test: ImageComboTests.Add_NegativeIndentation_AddsNothing -->
> [!WARNING] 1.8.136.0
> A negative *Indentation* raises run-time error 380 after the item has been put into the collection. The collection then holds the item and the list of the control does not: [**Count**](#count) is one more than the control shows, and the item has no text. Give a value of 0 or more.

### Clear
{: .no_toc }

<!-- test: ImageComboTests.Clear_LeavesTheText -->
Removes every item. The text in the text box stays, and the control raises no event.
<!-- /test -->

Syntax: *object*.**Clear**

### Exists
{: .no_toc }

<!-- test: ImageComboTests.Exists_SaysWhetherTheListHasTheNumberOrKey -->
Returns whether the list has an item of a number or a key, so that a program can ask before [**Item**](#item) raises an error.
<!-- /test -->

Syntax: *object*.**Exists**( *Index* ) **As Boolean**

*Index*
: *required* The number or the key to look for.

### Remove
{: .no_toc }

Removes one item. The items after it move down by one. The text in the text box stays, also when the item was the selected one.

Syntax: *object*.**Remove** *Index*

*Index*
: *required* The number or the key of the item.

<!-- test: ImageComboTests.Remove_NoSuchItem_RaisesTheErrorOfItem -->
A number or a key that the list does not have raises run-time error 9 for a number and 5 for a key, as [**Item**](#item) does.
<!-- /test -->

## See Also

- [ImageCombo](.) class
- [ImcComboItem](ImcComboItem) class -- one item
