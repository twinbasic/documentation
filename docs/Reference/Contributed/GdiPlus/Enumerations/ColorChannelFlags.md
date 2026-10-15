---
title: ColorChannelFlags
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/ColorChannelFlags
---

# ColorChannelFlags enumeration
{: .no_toc }

Selects one of the four CMYK channels, for the output channel setting of an **ImageAttributes** object.

**ImageAttributes.SetOutputChannel** takes one member to convert the colours of an image to the intensity of that channel.

| Member | Value | Description |
|:-------|:------|:------------|
| **ColorChannelFlagsC**{: #ColorChannelFlagsC } | `0` | The cyan channel. |
| **ColorChannelFlagsM**{: #ColorChannelFlagsM } | `1` | The magenta channel. |
| **ColorChannelFlagsY**{: #ColorChannelFlagsY } | `2` | The yellow channel. |
| **ColorChannelFlagsK**{: #ColorChannelFlagsK } | `3` | The black channel. |
| **ColorChannelFlagsLast**{: #ColorChannelFlagsLast } | `4` | Not a channel. The package passes it when it switches the output channel setting off. |

## Used by

- [**ImageAttributes**](../ImageAttributes) class: [**SetOutputChannel**](../ImageAttributes#setoutputchannel)

## See Also

- [Enumerations](.) -- all the enumerations of the package
- [ImageAttributes](../ImageAttributes) class
