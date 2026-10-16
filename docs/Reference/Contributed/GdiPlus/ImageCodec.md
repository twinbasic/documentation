---
title: ImageCodec
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/ImageCodec
---

# ImageCodec
{: .no_toc }

The image encoders and decoders that GDI+ has installed, and the identifiers (class IDs) of the file formats, frame dimensions, encoder parameters and codecs.

A codec turns the pixels of a picture into the bytes of a file (an encoder) or back (a decoder). GDI+ comes with codecs for BMP, JPEG, GIF, TIFF and PNG, can read EMF, WMF and ICO files, and can use codecs that other programs install. The functions of this page list the codecs, and return the class IDs that [**Image.Save**](Image#save), [**Image.RawFormat**](Image#rawformat), [**Image.FrameCount**](Image#framecount) and [**Image.GetEncoderParameterList**](Image#getencoderparameterlist) work with. All of them are functions of the package, not members of a class, and each class ID is a **UUID**. The page follows the GDI+ [ImageCodecInfo](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusimaging/nl-gdiplusimaging-imagecodecinfo) structure and the flat functions that list the codecs.

* TOC
{:toc}

## Listing the codecs

### GetImageEncoders, GetImageDecoders

Syntax: *codecs* **= GetImageEncoders**( )

Syntax: *codecs* **= GetImageDecoders**( )

Return an array of [**GpImageCodecInfo**](Types/GpImageCodecInfo), one element for each installed encoder or decoder, with the lower bound 1.

<!-- test: Im_CodecTests.GetImageEncoders_ReturnsTheInstalledEncoders, Im_CodecTests.GetImageDecoders_ReturnsTheInstalledDecoders, Im_CodecTests.GetImageEncodersSize_ListsTheEncodersInABuffer -->
> [!WARNING] 0.9.45.0
> Both functions stop the program with an access violation, in 32-bit and 64-bit programs. They give GDI+ the array variable itself as the buffer to fill, so GDI+ overwrites the array descriptor. Use the declared functions below, which work.

### GetImageEncodersSize, GetImageDecodersSize, GetImageEncoders, GetImageDecoders

Syntax: *status* **= GetImageEncodersSize**( *count*, *size* )

Syntax: *status* **= GetImageEncoders**( *count*, *size*, *buffer* )

Syntax: *status* **= GetImageDecodersSize**( *count*, *size* )

Syntax: *status* **= GetImageDecoders**( *count*, *size*, *buffer* )

*count*
: *required* A **UINT** that receives the number of codecs (the **Size** functions) or holds that number (the others).

*size*
: *required* A **UINT** that receives the number of bytes the list takes, or holds it.

*buffer*
: *required* The first **Byte** of a buffer of *size* bytes, passed by reference.

These are direct declarations of the GDI+ functions, and return a [**GpStatus**](Enumerations/GpStatus). The buffer receives *count* consecutive **GpImageCodecInfo** structures, followed by the strings they point to. A program reads an element by copying `LenB(Of GpImageCodecInfo)` bytes from the buffer into a variable of that type. The buffer must stay alive for as long as the strings are used.

<!-- test: Im_CodecTests.Text_PropertiesHaveNoTerminatingNull, Im_CodecTests.Text_PropertiesHoldTheTextBeforeTheNull -->
> [!WARNING] 0.9.45.0
> The string properties of [**GpImageCodecInfo**](Types/GpImageCodecInfo) (**FormatDescription**, **MimeType**, **FilenameExtension** and the others) end with a null character, so `info.FormatDescription = "PNG"` is **False**. Remove it with `Replace(text, vbNullChar, "")`, as the example does.

```tb check_build hidden
Public Declare PtrSafe Sub CodecCopyMemory Lib "kernel32" Alias "RtlMoveMemory" (ByVal dst As LongPtr, ByVal src As LongPtr, ByVal cb As LongPtr)
```

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim count As UINT, size As UINT
Debug.Print GetImageEncodersSize(count, size)
Dim buffer() As Byte
ReDim buffer(0 To size - 1)
Debug.Print GetImageEncoders(count, size, buffer(0))

Dim info As GpImageCodecInfo
Dim i As Long
For i = 0 To count - 1
    CodecCopyMemory VarPtr(info), VarPtr(buffer(0)) + i * LenB(Of GpImageCodecInfo), LenB(Of GpImageCodecInfo)
    Debug.Print Replace(info.FormatDescription, vbNullChar, "") & " " & Replace(info.MimeType, vbNullChar, "") & " " & info.IsEncoder
Next
' Output:
' 0
' 0
' BMP image/bmp True
' JPEG image/jpeg True
' GIF image/gif True
' TIFF image/tiff True
' PNG image/png True
```

## Format and codec IDs

The functions below take no arguments and return the **UUID** of what their name says. They are compared by value, for instance `fmt.Data1 = ImageFormatPNG().Data1`.

### Image format IDs

The IDs of the file formats, which **Image.RawFormat** returns and a **GpImageCodecInfo** holds in its **FormatID**.

| Function | Format |
|:---------|:-------|
| **ImageFormatUndefined** | No known format. |
| **ImageFormatMemoryBMP** | A bitmap in memory, not from a file. |
| **ImageFormatBMP** | Windows bitmap. |
| **ImageFormatEMF** | Enhanced metafile. |
| **ImageFormatWMF** | Windows metafile. |
| **ImageFormatJPEG** | JPEG. |
| **ImageFormatPNG** | Portable Network Graphics. |
| **ImageFormatGIF** | Graphics Interchange Format. |
| **ImageFormatTIFF** | Tagged Image File Format. |
| **ImageFormatEXIF** | EXIF. |
| **ImageFormatIcon** | Windows icon. |
| **ImageFormatHEIF** | HEIF (needs GDI+ 1.1 and a codec). |
| **ImageFormatWEBP** | WebP (needs GDI+ 1.1 and a codec). |

### Image codec IDs

The class IDs of the built-in encoders, which a **GpImageCodecInfo** holds in its **Clsid**. They are the *clsidEncoder* argument of [**Image.Save**](Image#save).

| Function | Encoder |
|:---------|:--------|
| **ImageCodecBMP** | BMP. |
| **ImageCodecJPG** | JPEG. |
| **ImageCodecGIF** | GIF. |
| **ImageCodecTIF** | TIFF. |
| **ImageCodecPNG** | PNG. |
| **ImageCodecICO** | Icon. |

### Frame dimension IDs

The kinds of frames of a multi-frame picture, for [**Image.FrameCount**](Image#framecount) and [**Image.SelectActiveFrame**](Image#selectactiveframe).

| Function | Frames are |
|:---------|:-----------|
| **FrameDimensionTime** | The pictures of an animation, such as a GIF. |
| **FrameDimensionPage** | The pages of a document, such as a TIFF. |
| **FrameDimensionResolution** | The same picture at several resolutions. |

### Property set IDs

| Function | Property set |
|:---------|:-------------|
| **FormatIDImageInformation** | The image information properties of a file. |
| **FormatIDJpegAppHeaders** | The application headers of a JPEG file. |

### Other IDs

**CodecIImageBytes** returns the interface ID of [**IImageBytes**](IImageBytes).

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Debug.Print Hex$(ImageCodecPNG().Data1)
Debug.Print Hex$(ImageFormatPNG().Data1)
Debug.Print Hex$(FrameDimensionPage().Data1)

Dim bmp As Bitmap = Bitmap(4!, 4!)
Debug.Print bmp.RawFormat.Data1 = ImageFormatMemoryBMP().Data1
Debug.Print bmp.RawFormat.Data1 = ImageFormatPNG().Data1
' Output:
' 557CF406
' B96B3CAF
' 7462DC86
' True
' False
```

## Encoder parameters

An encoder accepts parameters, such as the quality of a JPEG. Each parameter is named by one of the IDs below and is passed to [**Image.Save**](Image#save) as a [**GpEncoderParameter**](Types/GpEncoderParameter).

| Function | Parameter |
|:---------|:----------|
| **EncoderCompression** | The compression method ([**GpEncoderValue**](Enumerations/GpEncoderValue)). |
| **EncoderColorDepth** | The bits per pixel. |
| **EncoderScanMethod** | Interlaced or progressive. |
| **EncoderVersion** | The version of the format. |
| **EncoderRenderMethod** | How a progressive JPEG is rendered. |
| **EncoderQuality** | The quality, 0 to 100 for JPEG. |
| **EncoderTransformation** | A lossless JPEG transformation. |
| **EncoderLuminanceTable**, **EncoderChrominanceTable** | The quantization tables of a JPEG. |
| **EncoderSaveFlag** | Whether the save starts or continues a multi-frame file. |
| **EncoderColorSpace**, **EncoderImageItems**, **EncoderSaveAsCMYK** | Colour space, extra data items and CMYK saving (GDI+ 1.1). |

<!-- test: Im_ImageTests.Save_EmptyParameterArrayWritesFile, Im_ImageTests.Save_JpegQualityChangesFileSize, Im_ImageTests.Save_ParameterArrayStartingAtOneIsRefused, Im_ImageTests.SaveAdd_MultiFrameTiffHasTwoFrames -->
> [!WARNING] 0.9.45.0
> **Image.Save** cannot pass encoder parameters to the encoder, so these IDs cannot be used to change how a picture is saved. The call reads the parameters from memory before the array, and either returns an error, ignores them, or stops the program. See the warning at [**Image.Save**](Image#save); [**Bitmap**](Bitmap#saving) shows a way to save a PNG without parameters.

## Example

The example finds the encoder for PNG in the list and compares its identifiers with the functions.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim count As UINT, size As UINT
GetImageEncodersSize count, size
Dim buffer() As Byte
ReDim buffer(0 To size - 1)
GetImageEncoders count, size, buffer(0)

Dim info As GpImageCodecInfo
Dim i As Long
For i = 0 To count - 1
    CodecCopyMemory VarPtr(info), VarPtr(buffer(0)) + i * LenB(Of GpImageCodecInfo), LenB(Of GpImageCodecInfo)
    If Replace(info.FormatDescription, vbNullChar, "") = "PNG" Then
        Debug.Print info.Clsid.Data1 = ImageCodecPNG().Data1
        Debug.Print info.FormatID.Data1 = ImageFormatPNG().Data1
        Debug.Print Replace(info.FilenameExtension, vbNullChar, "")
    End If
Next
' Output:
' True
' True
' *.PNG
```

## See Also

- [GpImageCodecInfo](Types/GpImageCodecInfo) type
- [GpEncoderParameter](Types/GpEncoderParameter) type
- [Image](Image) class
- [IImageBytes](IImageBytes) interface
- [GpImageCodecFlags](Enumerations/GpImageCodecFlags) enumeration
- [GpEncoderValue](Enumerations/GpEncoderValue) enumeration
