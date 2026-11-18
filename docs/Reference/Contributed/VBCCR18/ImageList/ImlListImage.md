---
title: ImlListImage
parent: ImageList
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ImageList/ImlListImage
has_toc: false
---

# ImlListImage class
{: .no_toc }

One picture of an [**ImageList**](.): its number, its key, the picture it was made from, and the methods that draw it and return it as an icon. A program gets one from the [**ImlListImages**](ImlListImages) collection, and from that collection's [**Add**](ImlListImages#add) method.

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

```tb check_build check_run arch=win32,win64
Dim Image As ImlListImage
Set Image = ImageList1.ListImages.Add(, "open", ColorSquare(vbRed))
Image.Tag = "Opens a file"
Debug.Print Image.Index; Image.Key
Debug.Print ImageList1.ListImages("open").Tag
Debug.Print Image.Picture.Type = vbPicTypeBitmap
Debug.Print Image.ExtractIcon.Type = vbPicTypeIcon
' Output:
'  1 open
' Opens a file
' True
' True
```

**ColorSquare** in the samples of this page is a function of the program's own that returns a bitmap of one color, 16 pixels wide and high.

A program cannot make an **ImlListImage** object with **New**. An object kept in a variable after its picture is removed from the list, or after the list is cleared, still has its number, and its [**Draw**](#draw) and [**ExtractIcon**](#extracticon) then work on the picture that has that number, if there is one.

* TOC
{:toc}

Properties
----------

### Index
{: .no_toc }

The number of the picture in the list, from 1. **Long**, read-only. It changes when a picture is added or removed before this one.

### Key
{: .no_toc }

The key of the picture in the [**ImlListImages**](ImlListImages) collection. **String**. Empty for a picture without a key.

<!-- test: ImageListTests.Key_Assigned_RenamesThePicture, ImageListTests.Key_Empty_TakesTheKeyAway, ImageListTests.Key_OfAnotherPicture_Raises457 -->
An assignment gives the picture another key, and the collection no longer finds it by the old one. An empty string takes the key away. A key that another picture of the list has raises run-time error 457, and the picture keeps its key.

```tb check_build check_run arch=win32,win64
ImageList1.ListImages.Add , "open", ColorSquare(vbRed)
ImageList1.ListImages.Add , "save", ColorSquare(vbBlue)
ImageList1.ListImages("open").Key = "load"
Debug.Print ImageList1.ListImages.Exists("open"); ImageList1.ListImages("load").Index
On Error Resume Next
ImageList1.ListImages("load").Key = "save"
Debug.Print Err.Number; ImageList1.ListImages(1).Key
' Output:
' False 1
'  457 load
```
<!-- /test -->

### Picture
{: .no_toc }

The picture object that was given to [**Add**](ImlListImages#add). The list keeps a copy of its own, of the list's size and with the transparent parts made at the addition, and [**Draw**](#draw) and [**ExtractIcon**](#extracticon) work on that copy.

<!-- test: ImageListTests.Picture_Assigned_Raises383 -->
The property is read-only: an assignment raises run-time error 383. A program that wants another picture in this place removes the item and adds one at the same number.
<!-- /test -->

### Tag
{: .no_toc }

A value of the program's own, which the list does not use. **Variant**: unlike the [**Tag**](../Common#tag) of a control it holds a value of any type, an object included, which is assigned with **Set**.

<!-- test: ImageListTests.Tag_NewPicture_IsAnEmptyString -->
A new picture has an empty string.
<!-- /test -->

Methods
-------

### Draw
{: .no_toc }

Draws the picture on a device context.

Syntax: *object*.**Draw** *hDC* [, *X* ] [, *Y* ] [, *Style* ]

*hDC*
: *required* A **LongPtr**: the handle of the device context, such as the **hDC** of a form or a picture box.

*X*, *Y*
: *optional* **Long**: where the top left corner of the picture goes, in pixels of the device context. The default is 0 for each.

*Style*
: *optional* How the picture is drawn: a member of [**ImlDrawConstants**](.#imldrawconstants), or the sum of several. Without it the picture is drawn as **ImlDrawNormal** draws it.

```tb check_build
ImageList1.ListImages.Add , "open", ColorSquare(vbRed)
' On the form that the image list is on, 8 pixels from its top left corner.
ImageList1.ListImages("open").Draw ImageList1.Parent.hDC, 8, 8, ImlDrawTransparent
```

<!-- test: ImageListTests.Draw_Transparent_IgnoresBackColor, ImageListTests.Draw_NoMask_DrawsTheMaskedPixelsBlack -->
The transparent parts of the picture leave the device context as it is, unless the list's [**UseBackColor**](.#usebackcolor) is **True**: then they are filled with its [**BackColor**](.#backcolor), except with **ImlDrawTransparent**. With **ImlDrawNoMask** the pixels of a bitmap that had the mask color are drawn black.
<!-- /test -->

### ExtractIcon
{: .no_toc }

<!-- test: ImageListTests.ExtractIcon_ReturnsAnIcon -->
Returns the picture as a new icon of the list's size, with the picture's transparent parts. The icon is the program's: it does not change when the list does.
<!-- /test -->

Syntax: *object*.**ExtractIcon**( ) **As IPictureDisp**

## See Also

- [ImageList](.) class
- [ImlListImages](ImlListImages) class -- the collection of the pictures
- [ImlDrawConstants](.#imldrawconstants) -- the values of the *Style* argument of **Draw**
