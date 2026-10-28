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

<!-- bug: nothing-argument-crashes -->
> [!WARNING] BETA 1010
> An *IconPicture* of **Nothing** ends the program with an access violation, in a 32-bit and a 64-bit build alike.

<!-- errors: generated from errors/VBA.HiddenModule.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | *IconPicture* is not an icon: a bitmap, a picture with no image, or an object that is not a picture |
| [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument* | *BackColor*'s high byte is other than 0, 1, 2 or &H80 (-1, for one), or it is a system colour above &H8000001E |
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | *BackColor* is a string that does not hold a number |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *BackColor* is **Null** |
| [424 (`&H1A8`)](tb:Errors#424), *Object required* | *IconPicture* is **Null** |

<!-- /errors -->

### Example

```tb check_build
Dim MyIconPicture As StdPicture
Dim Bmp As StdPicture
Set Bmp = ConvertIconToBitmap(MyIconPicture, RGB(255, 255, 255))
Set Picture1.Picture = Bmp
```

### See Also

- [CreateStdPictureFromHandle](CreateStdPictureFromHandle) function
- [PictureToByteArray](PictureToByteArray) function
