---
title: GpImageCodecFlags
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpImageCodecFlags
---

# GpImageCodecFlags enumeration
{: .no_toc }

Indicates attributes of an image codec.

The members combine with **Or**. A codec has several of them. The **Flags** field of a **ImageCodecInfo** holds them.

| Member | Value | Description |
|:-------|:------|:------------|
| **ImageCodecFlagsEncoder**{: #ImageCodecFlagsEncoder } | `&H00000001` | The codec supports encoding, saving an image to a file or a stream. |
| **ImageCodecFlagsDecoder**{: #ImageCodecFlagsDecoder } | `&H00000002` | The codec supports decoding, reading an image from a file or a stream. |
| **ImageCodecFlagsSupportBitmap**{: #ImageCodecFlagsSupportBitmap } | `&H00000004` | The codec supports raster images, bitmaps. |
| **ImageCodecFlagsSupportVector**{: #ImageCodecFlagsSupportVector } | `&H00000008` | The codec supports vector images, metafiles. |
| **ImageCodecFlagsSeekableEncode**{: #ImageCodecFlagsSeekableEncode } | `&H00000010` | The encoder requires a seekable output stream. |
| **ImageCodecFlagsBlockingDecode**{: #ImageCodecFlagsBlockingDecode } | `&H00000020` | The decoder has blocking behaviour during the decoding process. |
| **ImageCodecFlagsBuiltin**{: #ImageCodecFlagsBuiltin } | `&H00010000` | The codec is built into GDI+. |
| **ImageCodecFlagsSystem**{: #ImageCodecFlagsSystem } | `&H00020000` | The codec is supplied by the system. |
| **ImageCodecFlagsUser**{: #ImageCodecFlagsUser } | `&H00040000` | The codec is supplied by the user. |

## Used by

- [**GpImageCodecInfo**](../Types/GpImageCodecInfo) type: **Flags**

## See Also

- [ImageCodecFlags](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusimaging/ne-gdiplusimaging-imagecodecflags) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
