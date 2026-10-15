---
title: GpEmfToWmfBitsFlags
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpEmfToWmfBitsFlags
---

# GpEmfToWmfBitsFlags enumeration
{: .no_toc }

Specifies the options of the conversion of an enhanced metafile to a Windows metafile.

The members combine with **Or**. They are the *flags* argument of the **EmfToWmfBits** function.

| Member | Value | Description |
|:-------|:------|:------------|
| **EmfToWmfBitsFlagsDefault**{: #EmfToWmfBitsFlagsDefault } | `&H00000000` | The default conversion. |
| **EmfToWmfBitsFlagsEmbedEmf**{: #EmfToWmfBitsFlagsEmbedEmf } | `&H00000001` | The source EMF is embedded as a comment in the resulting WMF. |
| **EmfToWmfBitsFlagsIncludePlaceable**{: #EmfToWmfBitsFlagsIncludePlaceable } | `&H00000002` | The resulting WMF is in the placeable metafile format, with the additional 22-byte header that format needs. |
| **EmfToWmfBitsFlagsNoXORClip**{: #EmfToWmfBitsFlagsNoXORClip } | `&H00000004` | The clipping region is stored in the metafile in the traditional way. Without the flag, the conversion applies an optimisation that stores the clipping region as a path and simulates clipping with the XOR operator. |

## Used by

- [Helper functions](../Helpers): **EmfToWmfBits**

## See Also

- [EmfToWmfBitsFlags](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-emftowmfbitsflags) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
