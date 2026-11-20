---
title: ImlListImages
parent: ImageList
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ImageList/ImlListImages
has_toc: false
---

# ImlListImages class
{: .no_toc }

The collection of the pictures of an [**ImageList**](.), which its [**ListImages**](.#listimages) property returns. Its items are [**ImlListImage**](ImlListImage) objects, numbered from 1, and an item can have a key as well.

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

<!-- test: ImageListTests.Add_AtAnIndex_MovesTheLaterPicturesUp -->
```tb check_build check_run arch=win32,win64
Dim Image As ImlListImage
ImageList1.ListImages.Add , "open", ColorSquare(vbRed)
ImageList1.ListImages.Add , "save", ColorSquare(vbBlue)
ImageList1.ListImages.Add 1, "new", ColorSquare(vbGreen)       ' before the first
For Each Image In ImageList1.ListImages
    Debug.Print Image.Index; Image.Key
Next
' Output:
'  1 new
'  2 open
'  3 save
```
<!-- /test -->

**ColorSquare** in the samples of this page is a function of the program's own that returns a bitmap of one color, 16 pixels wide and high.

A program goes through the pictures with **For Each**, or by number from 1 to [**Count**](#count). It cannot make an **ImlListImages** object with **New**.

* TOC
{:toc}

## Numbers and keys

<!-- test: ImageListTests.Remove_RenumbersTheLaterPictures -->
The number of a picture is its place in the list. It changes when a picture is added before it or removed before it, so a program that keeps a number over such a change keeps the wrong picture. A key stays with its picture.
<!-- /test -->

<!-- test: ImageListTests.Item_ByKey_IgnoresCase -->
A key is any string, and capital and small letters in it are the same: `"Open"` and `"OPEN"` are one key. No two pictures of a list have the same key. A picture needs no key: an empty string is no key, and any number of pictures can be without one.
<!-- /test -->

```tb check_build check_run arch=win32,win64
ImageList1.ListImages.Add , "open", ColorSquare(vbRed)
ImageList1.ListImages.Add , "save", ColorSquare(vbBlue)
Debug.Print ImageList1.ListImages("SAVE").Index
ImageList1.ListImages.Remove "open"
Debug.Print ImageList1.ListImages("save").Index
Debug.Print ImageList1.ListImages.Exists("open")
' Output:
'  2
'  1
' False
```

Properties
----------

### Count
{: .no_toc }

The number of pictures in the list. **Long**, read-only.

### Item
{: .no_toc }

Returns one picture. It is the default member, so `ImageList1.ListImages("open")` is `ImageList1.ListImages.Item("open")`.

Syntax: *object*.**Item**( *Index* ) **As ImlListImage**

*Index*
: *required* The number of the picture, from 1 to [**Count**](#count), or its key as a **String**.

<!-- test: ImageListTests.Item_NumberOutOfRange_Raises9, ImageListTests.Item_UnknownKey_Raises5 -->
A number outside that range raises run-time error 9, and a key that no picture has raises run-time error 5. [**Exists**](#exists) asks without an error.
<!-- /test -->

Methods
-------

### Add
{: .no_toc }

Puts a picture into the list and returns its [**ImlListImage**](ImlListImage).

Syntax: *object*.**Add**( [ *Index* ] [, *Key* ] [, *Picture* ] ) **As ImlListImage**

*Index*
: *optional* A **Long**: the number the new picture gets. The pictures from that number on move up by one. Without it, or with 0, the picture goes after the last one.

*Key*
: *optional* A **String** by which the program can name the picture. See [Numbers and keys](#numbers-and-keys).

*Picture*
: An icon or a bitmap, as a picture object. The declaration marks it optional, and the method cannot do without it.

<!-- test: ImageListTests.Add_NoPicture_Raises35607, ImageListTests.Add_IndexOutOfRange_Raises35600, ImageListTests.Add_DuplicateKey_Raises457 -->
A call without a picture, with **Nothing** or with an empty picture, such as `LoadPicture("")` returns, raises run-time error 35607, *Required argument is missing*. A negative *Index*, and one greater than [**Count**](#count) + 1, raises run-time error 35600, *Index out of bounds*. A *Key* that another picture has raises run-time error 457.
<!-- /test -->

<!-- test: ImageListTests.Add_DuplicateKey_LeavesTheWindowsListAsItWas -->
> [!WARNING] 1.8.141.0
> A call that raises error 457 for its key has already stored its picture. The collection is as it was, and the picture stays in the image list of Windows after the last one, where a control that the list is given to finds one picture more than [**Count**](#count) says. A program asks [**Exists**](#exists) before it adds a picture with a key that the list may have.

The first picture added sets the size of the list, and what the list does with a bitmap of another size and with a bitmap's mask color is under [Filling the list](.#filling-the-list) and [Transparent parts](.#transparent-parts).

### Clear
{: .no_toc }

Removes every picture. The list is then as new: its [**ImageWidth**](.#imagewidth) and [**ImageHeight**](.#imageheight) are 0, and a control that shows the list must be given it again once it has pictures.

Syntax: *object*.**Clear**

### Exists
{: .no_toc }

<!-- test: ImageListTests.Exists_SaysWhetherTheListHasTheNumberOrKey -->
Returns whether the list has a picture of a number or a key, so that a program can ask before [**Item**](#item) raises an error.
<!-- /test -->

Syntax: *object*.**Exists**( *Index* ) **As Boolean**

*Index*
: *required* The number or the key to look for.

### Remove
{: .no_toc }

Removes one picture. The pictures after it move down by one.

Syntax: *object*.**Remove** *Index*

*Index*
: *required* The number or the key of the picture. One that the list does not have raises the error that [**Item**](#item) raises for it.

Removing the only picture left leaves the list as [**Clear**](#clear) does.

## See Also

- [ImageList](.) class
- [ImlListImage](ImlListImage) class -- one picture
