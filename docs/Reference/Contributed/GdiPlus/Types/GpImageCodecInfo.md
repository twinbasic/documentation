---
title: GpImageCodecInfo
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/GpImageCodecInfo
---

# GpImageCodecInfo type
{: .no_toc }

A description of an image codec: its class ID, the format it handles, its names and its capabilities.

The codec lists of [**ImageCodec**](../ImageCodec#listing-the-codecs) are arrays of this type. It mirrors the GDI+ [ImageCodecInfo](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusimaging/nl-gdiplusimaging-imagecodecinfo) class, and has the same layout. The text properties read strings in the buffer that GDI+ filled, so the buffer has to stay alive.

<!-- test: Im_CodecTests.Text_PropertiesHaveNoTerminatingNull, Im_CodecTests.Text_PropertiesHoldTheTextBeforeTheNull -->
> [!WARNING] 0.9.45.0
> The text properties (**CodecName**, **DllName**, **FormatDescription**, **FilenameExtension** and **MimeType**) return their string with the terminating null character included, so `info.MimeType = "image/png"` is **False**. Remove it with `Replace(text, vbNullChar, "")`.

* TOC
{:toc}

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **Clsid** | **UUID** | The class ID of the codec. For an encoder it is the *clsidEncoder* argument of [**Image.Save**](../Image#save). |
| **FormatID** | **UUID** | The ID of the file format, such as the value of **ImageFormatPNG**( ). |
| **Flags** | [**GpImageCodecFlags**](../Enumerations/GpImageCodecFlags) | The capabilities, as a combination of flags. |
| **Version** | **Long** | The version of the codec. |

## Text properties

Syntax: *s* **=** *info*.**CodecName**

**CodecName** is the name of the codec, for example `Built-in PNG Codec`. **DllName** is the file that holds it, and is empty for the built-in codecs. **FormatDescription** names the format, for example `PNG`. **FilenameExtension** lists the file name patterns, separated by semicolons, for example `*.PNG`. **MimeType** is the MIME type, for example `image/png`. The properties are read-only.

## Capability properties

Syntax: *b* **=** *info*.**IsEncoder**

Each property is **True** when the matching flag of [**GpImageCodecFlags**](../Enumerations/GpImageCodecFlags) is set in **Flags**:

| Property | Means |
|:---------|:------|
| **IsEncoder** | The codec can write the format. |
| **IsDecoder** | The codec can read the format. |
| **IsSupportBitmap** | It handles raster pictures. |
| **IsSupportVector** | It handles vector pictures. |
| **IsSeekableEncode** | The encoder needs a stream that can seek. |
| **IsBlockingDecode** | The decoder reads the whole stream before it returns. |
| **IsBuiltin** | The codec is built into GDI+. |
| **IsSystem** | The codec is installed in the system. |
| **IsUser** | The codec is installed by a user. |

## Signature properties

Syntax: *bytes* **=** *info*.**SigPattern**( *index* )

Syntax: *bytes* **=** *info*.**SigMask**( *index* )

*index*
: *required* The number of the signature, from 1.

A decoder recognises a file by its first bytes: a signature is a pattern of bytes and a mask that selects the bytes that count. Both properties return an array of **Byte**, with the lower bound 1, as a view into the buffer. The PNG decoder has one signature, with the eight bytes `&H89 &H50 &H4E &H47 &H0D &H0A &H1A &H0A`.

```tb check_build hidden
Public Declare PtrSafe Sub InfoCopyMemory Lib "kernel32" Alias "RtlMoveMemory" (ByVal dst As LongPtr, ByVal src As LongPtr, ByVal cb As LongPtr)
```

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim count As UINT, size As UINT
GetImageEncodersSize count, size
Dim buffer() As Byte
ReDim buffer(0 To size - 1)
GetImageEncoders count, size, buffer(0)

Dim info As GpImageCodecInfo
InfoCopyMemory VarPtr(info), VarPtr(buffer(0)) + 4 * LenB(Of GpImageCodecInfo), LenB(Of GpImageCodecInfo)   ' the fifth: PNG

Dim mime As String = info.MimeType
Debug.Print (mime = "image/png") & " " & (Replace(mime, vbNullChar, "") = "image/png")
Debug.Print info.IsEncoder & " " & info.IsDecoder & " " & info.IsBuiltin & " " & info.IsSystem
Dim sig() As Byte = info.SigPattern(1)
Debug.Print UBound(sig) & " " & Hex$(sig(1)) & " " & Hex$(sig(2)) & " " & Hex$(sig(3))
' Output:
' False True
' True True True False
' 8 89 50 4E
```

## See Also

- [ImageCodecInfo](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusimaging/nl-gdiplusimaging-imagecodecinfo) -- Microsoft's documentation of the GDI+ class
- [ImageCodec](../ImageCodec) -- the codec lists
- [GpImageCodecFlags](../Enumerations/GpImageCodecFlags) enumeration
