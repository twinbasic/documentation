---
title: GpObjectType
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpObjectType
---

# GpObjectType enumeration
{: .no_toc }

Indicates the type of the object that an EMF+ record holds.

The function **ObjectTypeIsValid** tells whether a value is in the range from **ObjectTypeMin** to **ObjectTypeMax**.

| Member | Value | Description |
|:-------|:------|:------------|
| **ObjectTypeInvalid**{: #ObjectTypeInvalid } | `0` | The object type is not valid. |
| **ObjectTypeBrush**{: #ObjectTypeBrush } | `1` | A brush. |
| **ObjectTypePen**{: #ObjectTypePen } | `2` | A pen. |
| **ObjectTypePath**{: #ObjectTypePath } | `3` | A path. |
| **ObjectTypeRegion**{: #ObjectTypeRegion } | `4` | A region. |
| **ObjectTypeImage**{: #ObjectTypeImage } | `5` | An image. |
| **ObjectTypeFont**{: #ObjectTypeFont } | `6` | A font. |
| **ObjectTypeStringFormat**{: #ObjectTypeStringFormat } | `7` | A string format. |
| **ObjectTypeImageAttributes**{: #ObjectTypeImageAttributes } | `8` | An image attributes object. |
| **ObjectTypeCustomLineCap**{: #ObjectTypeCustomLineCap } | `9` | A custom line cap. |
| **ObjectTypeGraphics**{: #ObjectTypeGraphics } | `10` | A graphics object. |
| **ObjectTypeMax**{: #ObjectTypeMax } | `10` | The highest object type, same as **ObjectTypeGraphics**. |
| **ObjectTypeMin**{: #ObjectTypeMin } | `1` | The lowest object type, same as **ObjectTypeBrush**. |

## Used by

- [Helper functions](../Helpers): **ObjectTypeIsValid**

## See Also

- [ObjectType](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-objecttype) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
