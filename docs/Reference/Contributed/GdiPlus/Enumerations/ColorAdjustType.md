---
title: ColorAdjustType
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/ColorAdjustType
---

# ColorAdjustType enumeration
{: .no_toc }

Specifies which kinds of GDI+ objects use the colour adjustment settings of an **ImageAttributes** object.

An [**ImageAttributes**](../ImageAttributes) keeps separate settings for each category. Settings given for **ColorAdjustTypeDefault** apply to every category that has none of its own. Most methods of the class take a member of this enumeration as an optional argument that defaults to **ColorAdjustTypeDefault**.

| Member | Value | Description |
|:-------|:------|:------------|
| **ColorAdjustTypeDefault**{: #ColorAdjustTypeDefault } | `0` | Settings for every category that has no settings of its own. |
| **ColorAdjustTypeBitmap**{: #ColorAdjustTypeBitmap } | `1` | Settings for bitmapped images. |
| **ColorAdjustTypeBrush**{: #ColorAdjustTypeBrush } | `2` | Settings for brush operations in metafiles. |
| **ColorAdjustTypePen**{: #ColorAdjustTypePen } | `3` | Settings for pen operations in metafiles. |
| **ColorAdjustTypeText**{: #ColorAdjustTypeText } | `4` | Settings for text drawn in metafiles. |
| **ColorAdjustTypeCount**{: #ColorAdjustTypeCount } | `5` | The number of categories, used internally. It is not a category. |
| **ColorAdjustTypeAny**{: #ColorAdjustTypeAny } | `6` | Reserved. |

## Used by

- [**ImageAttributes**](../ImageAttributes) class: [**ClearColorKey**](../ImageAttributes#clearcolorkey), [**ClearColorMatrices**](../ImageAttributes#clearcolormatrices), [**ClearColorMatrix**](../ImageAttributes#clearcolormatrix), [**ClearGamma**](../ImageAttributes#cleargamma), [**ClearNoOp**](../ImageAttributes#clearnoop), [**ClearOutputChannel**](../ImageAttributes#clearoutputchannel), [**ClearOutputChannelColorProfile**](../ImageAttributes#clearoutputchannelcolorprofile), [**ClearRemapTable**](../ImageAttributes#clearremaptable), [**ClearThreshold**](../ImageAttributes#clearthreshold), [**GetAdjustedPalette**](../ImageAttributes#getadjustedpalette), [**Reset**](../ImageAttributes#reset), [**SetColorKey**](../ImageAttributes#setcolorkey), [**SetColorMatrices**](../ImageAttributes#setcolormatrices), [**SetColorMatrix**](../ImageAttributes#setcolormatrix), [**SetGamma**](../ImageAttributes#setgamma), [**SetNoOp**](../ImageAttributes#setnoop), [**SetOutputChannel**](../ImageAttributes#setoutputchannel), [**SetOutputChannelColorProfile**](../ImageAttributes#setoutputchannelcolorprofile), [**SetRemapTable**](../ImageAttributes#setremaptable), [**SetThreshold**](../ImageAttributes#setthreshold), [**SetToIdentity**](../ImageAttributes#settoidentity)

## See Also

- [ColorAdjustType](https://learn.microsoft.com/en-us/windows/win32/api/gdipluscolormatrix/ne-gdipluscolormatrix-coloradjusttype) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [ImageAttributes](../ImageAttributes) class
