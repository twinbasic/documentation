---
title: MetafileHeader
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/MetafileHeader
---

# MetafileHeader type
{: .no_toc }

The header of a [**Metafile**](../Metafile): its kind, size, resolution and bounds.

[**Metafile.MetafileHeader**](../Metafile#metafileheader) returns one, and so do the functions **GetMetafileHeader**, **GetMetafileHeaderFromEmf** and **GetMetafileHeaderFromWmf**, which read the header of a file, a stream or a handle. The type mirrors the GDI+ [MetafileHeader](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusmetaheader/nl-gdiplusmetaheader-metafileheader) class. Besides its fields it has properties that answer the usual questions about the kind of metafile.

* TOC
{:toc}

```tb check_build hidden
Module HeaderEmf
    Private Declare PtrSafe Function CreateEnhMetaFileW Lib "gdi32" (ByVal hdcRef As LongPtr, ByVal fileName As LongPtr, ByVal rc As LongPtr, ByVal desc As LongPtr) As LongPtr
    Private Declare PtrSafe Function CloseEnhMetaFile Lib "gdi32" (ByVal hdc As LongPtr) As LongPtr
    Private Declare PtrSafe Function Rectangle Lib "gdi32" (ByVal hdc As LongPtr, ByVal l As Long, ByVal t As Long, ByVal r As Long, ByVal b As Long) As Long

    Public Function MakeEmf(ByVal width As Long, ByVal height As Long) As LongPtr
        Dim dc As LongPtr = CreateEnhMetaFileW(0, 0, 0, 0)
        Rectangle dc, 0, 0, width, height
        Return CloseEnhMetaFile(dc)
    End Function
End Module
```

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **Type** | [**GpMetafileType**](../Enumerations/GpMetafileType) | The kind of metafile: WMF, placeable WMF, EMF, EMF+ only or EMF+ dual. |
| **Size** | **UINT** | The size of the metafile in bytes. |
| **Version** | **UINT** | The version of the EMF+, EMF or WMF format. |
| **EmfPlusFlags** | **UINT** | The EMF+ flags. Bit 0 is set when the metafile was recorded for a display. |
| **DpiX**, **DpiY** | **Single** | The horizontal and vertical resolution of the metafile, in dots per inch. |
| **X**, **Y**, **Width**, **Height** | **Long** | The bounds of the metafile in device units. |
| **EmfPlusHeaderSize** | **Long** | The size of the EMF+ header in the file. |
| **LogicalDpiX**, **LogicalDpiY** | **Long** | The logical resolution of the reference device context. Usually valid only for EMF+. |

The structure has one more field, which holds the WMF or EMF header and is read through the properties **WmfHeader** and **EmfHeader**.

## Properties

### Bounds

Syntax: *r* **=** *header*.**Bounds**

Returns **X**, **Y**, **Width** and **Height** as a [**GpRect**](GpRect).

### IsWmf, IsWmfPlaceable

Syntax: *b* **=** *header*.**IsWmf**

Syntax: *b* **=** *header*.**IsWmfPlaceable**

**IsWmf** is **True** for a Windows metafile of either kind, and **IsWmfPlaceable** only for one with a [placeable header](WmfPlaceableFileHeader).

### IsEmf, IsEmfOrEmfPlus, IsEmfPlus, IsEmfPlusDual, IsEmfPlusOnly

Syntax: *b* **=** *header*.**IsEmf**

**IsEmf** is **True** for an EMF that has no EMF+ records. **IsEmfOrEmfPlus** is **True** for an EMF or either kind of EMF+. **IsEmfPlus** is **True** for both kinds of EMF+, **IsEmfPlusDual** for an EMF+ that also holds the records an EMF reader understands, and **IsEmfPlusOnly** for one that does not.

### IsDisplay

Syntax: *b* **=** *header*.**IsDisplay**

**True** for an EMF+ metafile that was recorded for a display device context.

### WmfHeader

Syntax: *h* **=** *header*.**WmfHeader**

Returns the WMF header of a Windows metafile as a structure of the package, or a structure of zeros for another kind of metafile.

### EmfHeader

Syntax: *h* **=** *header*.**EmfHeader**

Returns the EMF header of an EMF or EMF+ metafile as a structure of the package whose fields (`nBytes`, `nRecords`, `nHandles` and others) are those of the Windows `ENHMETAHEADER` structure, or a structure of zeros for a WMF.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim mf As Metafile = Metafile(HeaderEmf.MakeEmf(40, 30), True)
Dim header As MetafileHeader = mf.MetafileHeader

Debug.Print header.Type
Debug.Print header.IsEmf & " " & header.IsEmfOrEmfPlus & " " & header.IsEmfPlus & " " & header.IsWmf
Debug.Print header.X & " " & header.Y & " " & header.Width & " " & header.Height
Debug.Print header.Bounds.Width
Debug.Print header.EmfHeader.nRecords
' Output:
' 3
' True True False False
' 0 0 40 30
' 40
' 3
```

## See Also

- [MetafileHeader](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusmetaheader/nl-gdiplusmetaheader-metafileheader) -- Microsoft's documentation of the GDI+ class
- [Metafile](../Metafile) class
- [WmfPlaceableFileHeader](WmfPlaceableFileHeader) type
- [GpMetafileType](../Enumerations/GpMetafileType) enumeration
