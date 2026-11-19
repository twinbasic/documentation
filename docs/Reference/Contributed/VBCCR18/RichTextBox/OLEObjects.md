---
title: OLE Objects and Pictures
parent: RichTextBox
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/RichTextBox/OLEObjects
has_toc: false
---

# OLE Objects and Pictures
{: .no_toc }

Puts pictures, files and other OLE objects into the text of a [**RichTextBox**](.), counts them and finds them.

```tb hidden
Public Function RtbTinyBitmapFile() As String
    ' Writes a bitmap of one red pixel under %TEMP% and returns its path.
    Dim Bytes(0 To 57) As Byte, Header As Variant, i As Long, f As Integer
    Header = Array(&H42, &H4D, 58, 0, 0, 0, 0, 0, 0, 0, 54, 0, 0, 0, 40, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 24, 0)
    For i = 0 To UBound(Header)
        Bytes(i) = Header(i)
    Next
    Bytes(34) = 4
    Bytes(56) = 255
    RtbTinyBitmapFile = Environ$("TEMP") & "\rtb-pixel.bmp"
    f = FreeFile
    Open RtbTinyBitmapFile For Binary Access Write As #f
    Put #f, , Bytes
    Close #f
End Function
```

<!-- test: RichTextBoxOLETests.OLEObjectsAddFromPicture_InsertsOneObject, RichTextBoxOLETests.OLEObjectsAddFromPicture_SelectedObject_IsRtfSelTypeObject -->
```tb check_build check_run arch=win32,win64
Dim Path As String
Path = RtbTinyBitmapFile()
RichTextBox1.Text = "ab"
RichTextBox1.SelStart = 1
RichTextBox1.OLEObjectsAddFromPicture LoadPicture(Path)   ' between "a" and "b"
Kill Path
Debug.Print RichTextBox1.OLEObjectsCount; RichTextBox1.TextLength
RichTextBox1.SelStart = 1
RichTextBox1.SelLength = 1
Debug.Print RichTextBox1.GetSelType = RtfSelTypeObject
' Output:
'  1  3
' True
```
<!-- /test -->

**RtbTinyBitmapFile** in this sample is a function of the program's own that writes a small bitmap file under `%TEMP%` and returns its path.

* TOC
{:toc}

## Objects in the text

<!-- test: RichTextBoxOLETests.OLEObjectsAddFromPicture_TheObjectIsASpaceInText -->
Each object takes the place of one character of the text, at which the box draws it. [**Text**](Text#text) gives a space for it, and [**TextRTF**](Text#textrtf) holds the object itself. The methods that insert an object put it in place of the selection, or at the insertion point:
<!-- /test -->

- [**OLEObjectsAddFromPicture**](#oleobjectsaddfrompicture) inserts a picture: a bitmap or a metafile.
- [**OLEObjectsAddFromFile**](#oleobjectsaddfromfile) inserts a file as an object of the program that the file belongs to, or as a link to the file.
- [**OLEObjectsAdd**](#oleobjectsadd) inserts an object that the program has made.

[**OLEObjectsCount**](#oleobjectscount) returns the number of objects, and [**OLEObjectsGet**](#oleobjectsget) one of them. A program that works on the objects through the interfaces of OLE gets the interface of the control from [**GetOLEInterface**](#getoleinterface).

<!-- test: RichTextBoxOLETests.SelText_OverAnObject_RaisesOLEDeleteObject -->
When an object leaves the text, because the user or the program deleted it, the control raises [**OLEDeleteObject**](#oledeleteobject).
<!-- /test -->

Methods
-------

### GetOLEInterface
{: .no_toc }

Returns the **IRichEditOle** interface of the rich edit control, through which a program that declares that interface reaches the objects of the text.

Syntax: *object*.**GetOLEInterface** **As IUnknown**

### OLEObjectsAdd
{: .no_toc }

Inserts an OLE object that the program has made, in place of the selection or at the insertion point.

Syntax: *object*.**OLEObjectsAdd** *LpOleObject*

*LpOleObject*
: *required* A **LongPtr**: the address of the object's **IOleObject** interface, as [**ObjPtr**](../../../../Modules/Information/ObjPtr) returns it.

### OLEObjectsAddFromFile
{: .no_toc }

Inserts a file as an OLE object, in place of the selection or at the insertion point. Windows makes the object, through the program that the file's type belongs to.

Syntax: *object*.**OLEObjectsAddFromFile** *FileName* [, *LinkToFile* ]

*FileName*
: *required* A **String**: the full path of the file.

*LinkToFile*
: *optional* A **Boolean**: **True** to insert a link to the file, which shows what the file holds when it changes. The default, **False**, puts a copy of the file into the text.

<!-- test: RichTextBoxOLETests.OLEObjectsAddFromFile_Missing_Raises53 -->
A file that does not exist raises run-time error 53, *File not found*.
<!-- /test -->

### OLEObjectsAddFromPicture
{: .no_toc }

Inserts a picture, in place of the selection or at the insertion point. The picture is an object that shows it and cannot be edited.

Syntax: *object*.**OLEObjectsAddFromPicture** *Picture* [, *ClipFormat* ]

*Picture*
: *required* A picture object that holds a bitmap, a metafile or an enhanced metafile. **Nothing**, or a picture that holds nothing, inserts nothing.

*ClipFormat*
: *optional* A number: the format of the picture, **vbCFBitmap**, **vbCFMetafile** or **vbCFEMetafile**, members of [**ClipboardConstants**](../../../VBRUN/Constants/ClipboardConstants), which the method checks against the picture.

<!-- test: RichTextBoxOLETests.OLEObjectsAddFromPicture_WrongClipFormat_Raises461 -->
A picture of another kind, such as an icon, raises run-time error 380. A *ClipFormat* that is not the format of the picture raises run-time error 461, *Specified format doesn't match format of data*.
<!-- /test -->

### OLEObjectsCount
{: .no_toc }

Returns the number of OLE objects in the text.

Syntax: *object*.**OLEObjectsCount** **As Long**

### OLEObjectsGet
{: .no_toc }

Returns the address of the **IOleObject** interface of one object of the text, or 0. The address holds no reference of its own: it is good while the object is in the text.

Syntax: *object*.**OLEObjectsGet**( *IndexObj* [, *CharPos* ] ) **As LongPtr**

*IndexObj*
: *required* A **Long**: the number of the object, counted from 0 in the order of the text; or -1 for the selected object; or -2 for the object at *CharPos*.

*CharPos*
: *optional* A **Long**: the place of the object in the text, counted from 0, when *IndexObj* is -2.

Events
------

### OLEDeleteObject
{: .no_toc }

Raised when an OLE object is about to leave the text. The object need not be destroyed: an object that the user cuts goes to the clipboard.

Syntax: *object*\_**OLEDeleteObject**( **ByVal** *LpOleObject* **As LongPtr** )

*LpOleObject*
: The address of the object's **IOleObject** interface.

## See Also

- [RichTextBox](.) control
- [Selection](Selection) -- **GetSelType**, which says whether an object is selected
