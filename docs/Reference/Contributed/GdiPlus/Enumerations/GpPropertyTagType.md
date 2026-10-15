---
title: GpPropertyTagType
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpPropertyTagType
---

# GpPropertyTagType enumeration
{: .no_toc }

Specifies the data type of the value of an image property, such as an Exif tag.

A property item has a tag that says what it is and a type that says how its value is stored. The value is an array of elements of the type. The numbering follows the TIFF and Exif standards. **MinPropertyTagType** and **MaxPropertyTagType** are the lowest and the highest valid value.

| Member | Value | Description |
|:-------|:------|:------------|
| **MinPropertyTagType**{: #MinPropertyTagType } | `1` | The lowest valid value, same as **PropertyTagTypeByte**. |
| **PropertyTagTypeByte**{: #PropertyTagTypeByte } | `1` | An array of bytes, 8-bit unsigned integers. |
| **PropertyTagTypeASCII**{: #PropertyTagTypeASCII } | `2` | A null-terminated ASCII string. |
| **PropertyTagTypeShort**{: #PropertyTagTypeShort } | `3` | An array of 16-bit unsigned integers. |
| **PropertyTagTypeLong**{: #PropertyTagTypeLong } | `4` | An array of 32-bit unsigned integers. |
| **PropertyTagTypeRational**{: #PropertyTagTypeRational } | `5` | An array of pairs of 32-bit unsigned integers. Each pair is the numerator and the denominator of a fraction. |
| **PropertyTagTypeSByte**{: #PropertyTagTypeSByte } | `6` | An array of signed bytes, 8-bit signed integers. |
| **PropertyTagTypeUndefined**{: #PropertyTagTypeUndefined } | `7` | An array of bytes that can hold values of any kind, depending on the property. |
| **PropertyTagTypeSShort**{: #PropertyTagTypeSShort } | `8` | An array of 16-bit signed integers. |
| **PropertyTagTypeSLong**{: #PropertyTagTypeSLong } | `9` | An array of 32-bit signed integers. |
| **PropertyTagTypeSRational**{: #PropertyTagTypeSRational } | `10` | An array of pairs of 32-bit signed integers. Each pair is the numerator and the denominator of a fraction. |
| **PropertyTagTypeSingle**{: #PropertyTagTypeSingle } | `11` | An array of 32-bit floating-point numbers. |
| **PropertyTagTypeDouble**{: #PropertyTagTypeDouble } | `12` | An array of 64-bit floating-point numbers. |
| **MaxPropertyTagType**{: #MaxPropertyTagType } | `12` | The highest valid value, same as **PropertyTagTypeDouble**. |

## Used by

- [**GpPropertyItem**](../Types/GpPropertyItem) type: **Type**

## See Also

- [Enumerations](.) -- all the enumerations of the package
