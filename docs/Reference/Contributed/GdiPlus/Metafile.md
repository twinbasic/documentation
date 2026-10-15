---
title: Metafile
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Metafile
---

# Metafile class
{: .no_toc }

A picture stored as a sequence of drawing commands: a Windows metafile (WMF), an enhanced metafile (EMF) or an EMF+ metafile.

A **Metafile** inherits every member of [**Image**](Image), so it can be drawn with [**Graphics.DrawImage**](Graphics#drawimage), and it scales without losing quality because it holds commands, not pixels. A program can also record one: a [**Graphics**](Graphics) created from a **Metafile** that is being recorded writes its drawing commands into it. The class mirrors the GDI+ [Metafile](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusheaders/nl-gdiplusheaders-metafile) class.

* TOC
{:toc}

## Creating

Syntax: *mf* **= Metafile**( *hEmf* [ , *deleteEmf* ] )

Syntax: *mf* **= Metafile**( *hWmf*, *header* [ , *deleteWmf* ] )

Syntax: *mf* **= Metafile**( *filename* )

Syntax: *mf* **= Metafile**( *filename*, *header* )

Syntax: *mf* **= Metafile**( *stream* )

Syntax: *mf* **= Metafile**( *referenceHdc* [ , *type* [ , *description* ] ] )

Syntax: *mf* **= Metafile**( *referenceHdc*, *frameRect* [ , *frameUnit* [ , *type* [ , *description* ] ] ] )

Syntax: *mf* **= Metafile**( *filename*, *referenceHdc* [ , ... ] )

Syntax: *mf* **= Metafile**( *stream*, *referenceHdc* [ , ... ] )

Each form is also available as **New Metafile**( ... ) with the same arguments.

The first five forms play back an existing metafile:

*hEmf*, *deleteEmf*
: *required* The handle of an enhanced metafile, and a **Boolean** that is **True** when GDI+ should delete the handle together with the **Metafile**. The default is **False**.

*hWmf*, *header*, *deleteWmf*
: *required* The handle of a Windows metafile, the [**WmfPlaceableFileHeader**](Types/WmfPlaceableFileHeader) that gives its position and scale, and a **Boolean** as above.

*filename*, *stream*
: *required* A **String** naming a metafile, or an **IStream** to read one from. The *header* form reads a WMF file that has no placeable header.

The other forms record a new metafile:

*referenceHdc*
: *required* A device context whose resolution and capabilities the metafile is recorded for.

*frameRect*
: *optional* A [**GpRect**](Types/GpRect) or [**GpRectF**](Types/GpRectF): the frame of the picture, in *frameUnit*. Without it, GDI+ uses the size of the device.

*frameUnit*
: *optional* A [**GpMetafileFrameUnit**](Enumerations/GpMetafileFrameUnit). The default is **MetafileFrameUnitGdi**, hundredths of a millimetre.

*type*
: *optional* A [**GpEmfType**](Enumerations/GpEmfType): **EmfTypeEmfOnly**, **EmfTypeEmfPlusOnly** or **EmfTypeEmfPlusDual**, the default.

*description*
: *optional* A **String** stored in the metafile.

With a *filename* or a *stream* in front, the recording is written there as it is made.

A constructor that fails creates an unusable object whose **LastResult** tells why.

> [!WARNING] 0.9.45.0
> The constructors that take a file name (`Metafile(filename)`, `Metafile(filename, header)`, and the recording forms with a file name) and the forms that record with a *referenceHdc* and a *type* raise run-time error 13 (*Type mismatch*): they pass a **String** to a GDI+ function that expects a pointer. An unhandled error ends the program. `Metafile(referenceHdc)` with nothing else does not record either: it binds to the *hEmf* form, treats the device context as a metafile handle, and returns an unusable object with **LastResult** 1 (**GenericError**). Of the constructors, the *hEmf* and *hWmf* forms work. To load a metafile from a file, use [**Image**](Image#creating): `GdiPlus.Image(filename)` returns an **Image** whose [**Type**](Image#type) is **ImageTypeMetafile**, which can be drawn, and whose header [**GetMetafileHeader**](#metafileheader) reads.

The metafile in the example comes from GDI: the module creates an enhanced metafile with a rectangle in it, and the **Metafile** plays it back.

```tb check_build slot=file projname=gdiplus-metafile
Module GdiMetafile
    Private Declare PtrSafe Function CreateEnhMetaFileW Lib "gdi32" (ByVal hdcRef As LongPtr, ByVal fileName As LongPtr, ByVal rc As LongPtr, ByVal desc As LongPtr) As LongPtr
    Private Declare PtrSafe Function CloseEnhMetaFile Lib "gdi32" (ByVal hdc As LongPtr) As LongPtr
    Private Declare PtrSafe Function Rectangle Lib "gdi32" (ByVal hdc As LongPtr, ByVal l As Long, ByVal t As Long, ByVal r As Long, ByVal b As Long) As Long
    Private Declare PtrSafe Function CreateSolidBrush Lib "gdi32" (ByVal c As Long) As LongPtr
    Private Declare PtrSafe Function SelectObject Lib "gdi32" (ByVal hdc As LongPtr, ByVal h As LongPtr) As LongPtr
    Private Declare PtrSafe Function DeleteObject Lib "gdi32" (ByVal h As LongPtr) As Long

    ' Returns the handle of an enhanced metafile with one red rectangle.
    Public Function MakeRedRectangleEmf(ByVal width As Long, ByVal height As Long) As LongPtr
        Dim dc As LongPtr = CreateEnhMetaFileW(0, 0, 0, 0)
        Dim brush As LongPtr = CreateSolidBrush(&HFF)        ' a COLORREF: red
        Dim old As LongPtr = SelectObject(dc, brush)
        Rectangle dc, 0, 0, width, height
        SelectObject dc, old
        DeleteObject brush
        Return CloseEnhMetaFile(dc)
    End Function
End Module
```

```tb check_build check_run projname=gdiplus-metafile
Dim user As GdiPlusUser = GdiPlusUser()

Dim hemf As LongPtr = GdiMetafile.MakeRedRectangleEmf(40, 30)
Dim mf As Metafile = Metafile(hemf, True)          ' the Metafile deletes the handle
Debug.Print mf.LastResult & " " & mf.Type & " " & mf.Width & " " & mf.Height

Dim bmp As Bitmap = Bitmap(60!, 50!)
Dim g As Graphics = Graphics(bmp)
g.Clear(Color(255, 255, 255, 255))
g.DrawImage mf, 5, 5
Debug.Print Hex$(bmp.Pixel(20, 20).argb)
Debug.Print Hex$(bmp.Pixel(55, 45).argb)
' Output:
' 0 2 40 30
' FFFF0000
' FFFFFFFF
```

### Clone

Syntax: *copy* **=** *mf*.**Clone**( )

Returns a new **Metafile** that plays back the same commands.

## Information

### MetafileHeader

Syntax: *header* **=** *mf*.**MetafileHeader**

Returns the [**MetafileHeader**](Types/MetafileHeader) of the metafile: its kind, size, resolution and bounds. The property is read-only. The functions **GetMetafileHeader**, **GetMetafileHeaderFromEmf** and **GetMetafileHeaderFromWmf** read the header of a file, a handle or a stream without making a **Metafile**.

### DownLevelRasterizationLimit

Syntax: *dpi* **=** *mf*.**DownLevelRasterizationLimit** [ **=** *dpi* ]

Gets or sets the resolution, in dots per inch, at which GDI+ rasterizes the parts of an EMF+ metafile that a down-level reader (one that knows only EMF) cannot draw. It matters for a metafile recorded for a printer that is to be drawn on the screen: set it to the screen resolution, 96 or 120. The value 0 means the resolution of the device.

### GetHENHMETAFILE

Syntax: *hEmf* **=** *mf*.**GetHENHMETAFILE**( )

Returns a handle to an enhanced metafile with the commands of the **Metafile**. The **Metafile** is no longer usable afterwards, and the program must delete the handle with the GDI function `DeleteEnhMetaFile`.

```tb check_build check_run projname=gdiplus-metafile
Dim user As GdiPlusUser = GdiPlusUser()

Dim mf As Metafile = Metafile(GdiMetafile.MakeRedRectangleEmf(40, 30), True)
Dim header As MetafileHeader = mf.MetafileHeader
Debug.Print header.IsEmf & " " & header.IsEmfPlus & " " & header.IsWmf
Debug.Print header.Width & " " & header.Height

Dim copy As Metafile = mf.Clone()
Debug.Print copy.Width

Dim hemf As LongPtr = mf.GetHENHMETAFILE()
Debug.Print hemf <> 0
Debug.Print mf.Width                        ' unusable now
' Output:
' True False False
' 40 30
' 40
' True
' 0
```

## Playing and converting

### PlayRecord

Syntax: *status* **=** *mf*.**PlayRecord**( *recordType*, *flags*, *dataSize*, *data* )

*recordType*
: *required* A [**GpEmfPlusRecordType**](Enumerations/GpEmfPlusRecordType).

*flags*
: *required* The flags of the record, a **Long**.

*dataSize*
: *required* The size of *data* in bytes.

*data*
: *required* The first **Byte** of the record data, passed by reference. The data must be aligned to 4 bytes for an EMF or EMF+ metafile and to 2 bytes for a WMF.

Plays one record. A program calls it from the callback of [**Graphics.EnumerateMetafile**](Graphics#enumeratemetafile), which hands it each record of the metafile in turn, to draw a record or to change it first.

### ConvertToEmfPlus

Syntax: *status* **=** *mf*.**ConvertToEmfPlus**( *refGraphics*, *filename* [ , *conversionFailureFlag* [ , *emfType* [ , *description* ] ] ] )

Syntax: *status* **=** *mf*.**ConvertToEmfPlus**( *refGraphics*, *stream* [ , *conversionFailureFlag* [ , *emfType* [ , *description* ] ] ] )

Syntax: *status* **=** *mf*.**ConvertToEmfPlus**( *refGraphics* [ , *conversionFailureFlag* [ , *emfType* [ , *description* ] ] ] )

*refGraphics*
: *required* A [**Graphics**](Graphics) that gives the resolution to convert for.

*filename*, *stream*
: A **String** or an **IStream** that receives the converted metafile.

*conversionFailureFlag*
: *optional* A **Long** that receives a [**GpConvertToEmfPlusFlags**](Enumerations/GpConvertToEmfPlusFlags) value telling why a record could not be converted.

*emfType*
: *optional* A [**GpEmfType**](Enumerations/GpEmfType). The default is **EmfTypeEmfPlusOnly**.

*description*
: *optional* A **String** stored in the metafile.

Converts an EMF metafile into an EMF+ metafile. The **Metafile** itself becomes the converted one. It needs GDI+ 1.1 (Windows 7 or later).

> [!WARNING] 0.9.45.0
> The form without a file name or a stream raises run-time error 13 (*Type mismatch*), as the constructors above do. The *filename* form works.

```tb check_build check_run projname=gdiplus-metafile
Dim user As GdiPlusUser = GdiPlusUser()

Dim mf As Metafile = Metafile(GdiMetafile.MakeRedRectangleEmf(40, 30), True)
Dim bmp As Bitmap = Bitmap(10!, 10!)
Dim g As Graphics = Graphics(bmp)

Dim path As String = Environ$("TEMP") & "\tbdocs-gdiplus-converted.emf"
Debug.Print mf.ConvertToEmfPlus(g, path)
Debug.Print mf.MetafileHeader.IsEmfPlus
' Output:
' 0
' True
```

## Example

The example reads the header of a metafile and draws it twice, at two sizes. The metafile scales without losing its sharp edges.

```tb check_build check_run projname=gdiplus-metafile
Dim user As GdiPlusUser = GdiPlusUser()

Dim mf As Metafile = Metafile(GdiMetafile.MakeRedRectangleEmf(40, 30), True)
Dim bmp As Bitmap = Bitmap(80!, 30!)
Dim g As Graphics = Graphics(bmp)
g.Clear(Color(255, 255, 255, 255))

g.DrawImage mf, 0, 0, 40, 30         ' at its own size
g.DrawImage mf, 42, 0, 20, 15        ' half size

Debug.Print Hex$(bmp.Pixel(10, 10).argb)
Debug.Print Hex$(bmp.Pixel(50, 10).argb)
Debug.Print Hex$(bmp.Pixel(50, 25).argb)
' Output:
' FFFF0000
' FFFF0000
' FFFFFFFF
```

## See Also

- [Metafile](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusheaders/nl-gdiplusheaders-metafile) -- Microsoft's documentation of the GDI+ class
- [Image](Image) class
- [Graphics](Graphics) class
- [MetafileHeader](Types/MetafileHeader) type
- [WmfPlaceableFileHeader](Types/WmfPlaceableFileHeader) type
- [GpMetafileFrameUnit](Enumerations/GpMetafileFrameUnit) enumeration
- [GpEmfType](Enumerations/GpEmfType) enumeration
