---
title: ImlDrawConstants
parent: Enumerations
grand_parent: WinNativeCommonCtls Package
permalink: /tB/Packages/WinNativeCommonCtls/Enumerations/ImlDrawConstants
---

# ImlDrawConstants
{: .no_toc }

Flag combinations passed to the *Style* parameter of [**ListImage.Draw**](../ImageList/ListImage#draw). Multiple flags can be **Or**-combined to compose render styles.

```tb
' Draw a small icon with the focus rectangle overlaid:
ImageList1.ListImages("doc").Draw _
    PictureBox1.hDC, 0, 0, _
    ImlDrawTransparent Or ImlDrawFocus
```

| Member                    | Value | Description                                                              |
|---------------------------|-------|--------------------------------------------------------------------------|
| **ImlDrawNormal**{: #ImlDrawNormal }           | 1  | Render in the normal state (no overlays).                |
| **ImlDrawTransparent**{: #ImlDrawTransparent } | 2  | Honour the image's mask / alpha — transparent pixels stay transparent. |
| **ImlDrawSelected**{: #ImlDrawSelected }       | 4  | Render with the selection-color overlay (typically a blue tint).        |
| **ImlDrawFocus**{: #ImlDrawFocus }             | 8  | Render with the focus-rectangle overlay (dotted border).                |
| **ImlDrawNoMask**{: #ImlDrawNoMask }           | 16 | Bypass the mask — draw the entire bitmap including pixels that would normally be transparent. |

## See Also

- [ImageList](../ImageList/) -- the parent control
- [ListImage.Draw](../ImageList/ListImage#draw) -- the consuming method
