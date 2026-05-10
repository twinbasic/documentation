---
title: ConvertIconToBitmap
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/ConvertIconToBitmap
---
# ConvertIconToBitmap
{: .no_toc }

Converts an icon picture into a bitmap picture.

Syntax: **ConvertIconToBitmap(** *IconPicture* [ **,** *BackColor* ] **)** **As Object**

*IconPicture*
: *required* **Object**. An **stdole.StdPicture** holding an icon (`vbPicTypeIcon`) or cursor (`vbPicTypeIcon`).

*BackColor*
: *optional* **Variant**. The background colour to flatten transparent pixels onto, given as an OLE colour value. If omitted, the system **Window** colour is used.

The returned picture is a fresh bitmap-typed **stdole.StdPicture** with the icon rasterised on top of the chosen background. The original icon picture is unchanged.

### Example

```tb
Dim Bmp As StdPicture
Set Bmp = ConvertIconToBitmap(MyIconPicture, RGB(255, 255, 255))
Set Picture1.Picture = Bmp
```

### See Also

- [CreateStdPictureFromHandle](CreateStdPictureFromHandle) function
- [PictureToByteArray](PictureToByteArray) function
