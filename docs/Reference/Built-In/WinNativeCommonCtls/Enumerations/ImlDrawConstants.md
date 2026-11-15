---
title: ImlDrawConstants
parent: Enumerations
grand_parent: WinNativeCommonCtls Package
permalink: /tB/Packages/WinNativeCommonCtls/Enumerations/ImlDrawConstants
---

# ImlDrawConstants
{: .no_toc }

Flag combinations passed to the *Style* parameter of [**ListImage.Draw**](../ImageList/ListImage#draw). Multiple flags can be **Or**-combined to compose render styles.

```tb check_build project=packages
' Draw a small icon blended a quarter with the highlight colour:
ImageList1.ListImages("doc").Draw _
    PictureBox1.hDC, 0, 0, _
    WinNativeCommonCtls.ImlDrawTransparent Or WinNativeCommonCtls.ImlDrawFocus
```

> [!IMPORTANT]
> The enumeration lives in a **Private** part of the WinNativeCommonCtls package, so its members
> have no bare names: `ImlDrawTransparent` on its own is *TB5079 Unrecognized symbol*. Qualify
> each member with the library name, as the sample does. To name the enumeration itself as a
> type, set the package's [library symbol](../../../../Features/Packages/Library-Symbols) to
> `*WinNativeCommonCtls`; without it, `As WinNativeCommonCtls.ImlDrawConstants` is TB5079 too.
> The asterisk is stripped from the name: the library is still written `WinNativeCommonCtls` in
> code.

```tb check_build project=wnc-private
' With the library symbol set to *WinNativeCommonCtls:
Private Sub DrawDoc(ByVal Style As WinNativeCommonCtls.ImlDrawConstants)
    ImageList1.ListImages("doc").Draw PictureBox1.hDC, 0, 0, Style
End Sub
```


| Member                    | Value | Description                                                              |
|---------------------------|-------|--------------------------------------------------------------------------|
| **ImlDrawNormal**{: #ImlDrawNormal }           | 1  | Draws the picture. Where it is transparent, the image list's [**BackColor**](../ImageList/#backcolor) shows when [**UseBackColor**](../ImageList/#usebackcolor) is **True**, and what is under it otherwise. |
| **ImlDrawTransparent**{: #ImlDrawTransparent } | 2  | Draws the picture with its transparent pixels left out, whatever [**UseBackColor**](../ImageList/#usebackcolor) says. |
| **ImlDrawSelected**{: #ImlDrawSelected }       | 4  | Draws the picture blended half and half with the system's highlight colour, as a selected item's picture is drawn. |
| **ImlDrawFocus**{: #ImlDrawFocus }             | 8  | Draws the picture blended with the system's highlight colour, a quarter of it. |
| **ImlDrawNoMask**{: #ImlDrawNoMask }           | 16 | Draws the picture without its mask: in an image list of a [**ColorDepth**](../ImageList/#colordepth) below **ColorDepth32Bit**, the pixels its mask makes transparent draw black. A **ColorDepth32Bit** picture keeps its transparency. |

![A picture of an image list drawn with ListImage.Draw in each Style over a chequered ground, from a list of ColorDepth32Bit and one of ColorDepth24Bit: Normal and Transparent draw the picture alone, Selected blends it with the highlight colour and Focus a quarter as much, NoMask draws the 24-bit picture's masked pixels black, and with UseBackColor Normal fills the transparent pixels with the list's BackColor](Images/ImlDrawConstants.png){:width="885" height="213"}

## See Also

- [ImageList](../ImageList/) -- the parent control
- [ListImage.Draw](../ImageList/ListImage#draw) -- the consuming method
