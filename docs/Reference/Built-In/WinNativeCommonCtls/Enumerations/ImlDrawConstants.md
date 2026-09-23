---
title: ImlDrawConstants
parent: Enumerations
grand_parent: WinNativeCommonCtls Package
permalink: /tB/Packages/WinNativeCommonCtls/Enumerations/ImlDrawConstants
---

# ImlDrawConstants
{: .no_toc }

Flag combinations passed to the *Style* parameter of [**ListImage.Draw**](../ImageList/ListImage#draw). Multiple flags can be **Or**-combined to compose render styles.

```tb check_build project=wnc-private
' Draw a small icon with the focus rectangle overlaid:
ImageList1.ListImages("doc").Draw _
    PictureBox1.hDC, 0, 0, _
    WinNativeCommonCtls.ImlDrawTransparent Or WinNativeCommonCtls.ImlDrawFocus
```

> [!IMPORTANT]
> These members live in a **Private** part of the WinNativeCommonCtls package, so a project that
> references it the ordinary way cannot name them --- `ImlDrawTransparent` on its own is
> *TB5079 Unrecognized symbol*. Set the package's [library symbol](../../../../Features/Packages/Library-Symbols) to
> `*WinNativeCommonCtls` and qualify the member, as the sample does. The asterisk is stripped
> from the name: the library is still written `WinNativeCommonCtls` in code.


| Member                    | Value | Description                                                              |
|---------------------------|-------|--------------------------------------------------------------------------|
| **ImlDrawNormal**{: #ImlDrawNormal }           | 1  | Render in the normal state (no overlays).                |
| **ImlDrawTransparent**{: #ImlDrawTransparent } | 2  | Honour the image's mask / alpha --- transparent pixels stay transparent. |
| **ImlDrawSelected**{: #ImlDrawSelected }       | 4  | Render with the selection-color overlay (typically a blue tint).        |
| **ImlDrawFocus**{: #ImlDrawFocus }             | 8  | Render with the focus-rectangle overlay (dotted border).                |
| **ImlDrawNoMask**{: #ImlDrawNoMask }           | 16 | Bypass the mask --- draw the entire bitmap including pixels that would normally be transparent. |

## See Also

- [ImageList](../ImageList/) -- the parent control
- [ListImage.Draw](../ImageList/ListImage#draw) -- the consuming method
