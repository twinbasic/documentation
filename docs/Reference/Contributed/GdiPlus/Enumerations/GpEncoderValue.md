---
title: GpEncoderValue
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpEncoderValue
---

# GpEncoderValue enumeration
{: .no_toc }

Specifies values that are passed as arguments to image encoders.

No public member takes this enumeration. Its members are the values of encoder parameters, which are passed to an encoder in a parameter list. Microsoft marks several members as not used in GDI+ version 1.0.

| Member | Value | Description |
|:-------|:------|:------------|
| **EncoderValueColorTypeCMYK**{: #EncoderValueColorTypeCMYK } | `0` | Not used. |
| **EncoderValueColorTypeYCCK**{: #EncoderValueColorTypeYCCK } | `1` | Not used. |
| **EncoderValueCompressionLZW**{: #EncoderValueCompressionLZW } | `2` | For a TIFF image, the LZW compression method. |
| **EncoderValueCompressionCCITT3**{: #EncoderValueCompressionCCITT3 } | `3` | For a TIFF image, the CCITT3 compression method. |
| **EncoderValueCompressionCCITT4**{: #EncoderValueCompressionCCITT4 } | `4` | For a TIFF image, the CCITT4 compression method. |
| **EncoderValueCompressionRle**{: #EncoderValueCompressionRle } | `5` | For a TIFF image, the RLE compression method. |
| **EncoderValueCompressionNone**{: #EncoderValueCompressionNone } | `6` | For a TIFF image, no compression. |
| **EncoderValueScanMethodInterlaced**{: #EncoderValueScanMethodInterlaced } | `7` | Not used. |
| **EncoderValueScanMethodNonInterlaced**{: #EncoderValueScanMethodNonInterlaced } | `8` | Not used. |
| **EncoderValueVersionGif87**{: #EncoderValueVersionGif87 } | `9` | Not used. |
| **EncoderValueVersionGif89**{: #EncoderValueVersionGif89 } | `10` | Not used. |
| **EncoderValueRenderProgressive**{: #EncoderValueRenderProgressive } | `11` | Not used. |
| **EncoderValueRenderNonProgressive**{: #EncoderValueRenderNonProgressive } | `12` | Not used. |
| **EncoderValueTransformRotate90**{: #EncoderValueTransformRotate90 } | `13` | For a JPEG image, a lossless rotation by 90 degrees clockwise. |
| **EncoderValueTransformRotate180**{: #EncoderValueTransformRotate180 } | `14` | For a JPEG image, a lossless rotation by 180 degrees. |
| **EncoderValueTransformRotate270**{: #EncoderValueTransformRotate270 } | `15` | For a JPEG image, a lossless rotation by 270 degrees clockwise. |
| **EncoderValueTransformFlipHorizontal**{: #EncoderValueTransformFlipHorizontal } | `16` | For a JPEG image, a lossless horizontal flip. |
| **EncoderValueTransformFlipVertical**{: #EncoderValueTransformFlipVertical } | `17` | For a JPEG image, a lossless vertical flip. |
| **EncoderValueMultiFrame**{: #EncoderValueMultiFrame } | `18` | Multiple-frame encoding. |
| **EncoderValueLastFrame**{: #EncoderValueLastFrame } | `19` | The last frame of a multiple-frame image. |
| **EncoderValueFlush**{: #EncoderValueFlush } | `20` | The encoder object is to be closed. |
| **EncoderValueFrameDimensionTime**{: #EncoderValueFrameDimensionTime } | `21` | Not used. |
| **EncoderValueFrameDimensionResolution**{: #EncoderValueFrameDimensionResolution } | `22` | Not used. |
| **EncoderValueFrameDimensionPage**{: #EncoderValueFrameDimensionPage } | `23` | For a TIFF image, the page frame dimension. |
| **EncoderValueColorTypeGray**{: #EncoderValueColorTypeGray } | `24` | The colour type is grayscale. |
| **EncoderValueColorTypeRGB**{: #EncoderValueColorTypeRGB } | `25` | The colour type is RGB. |

## See Also

- [EncoderValue](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-encodervalue) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
