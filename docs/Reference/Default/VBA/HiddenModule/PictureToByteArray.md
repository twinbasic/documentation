---
title: PictureToByteArray
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/PictureToByteArray
---
# PictureToByteArray
{: .no_toc }

Serialises an **IPicture** into a **Byte** array.

Syntax: **PictureToByteArray(** *Picture* **)** **As Variant**

*Picture*
: *required* **IUnknown**. The picture to serialise --- an **stdole.StdPicture**, or any object that implements **IPicture** / **IPictureDisp**.

The result is a **Variant** wrapping a `Byte()` array containing the bytes the picture would write to a stream via **IPersistStream**. The companion deserialiser is the global **LoadPicture**, which accepts a byte array as input and returns a fresh picture.

If *Picture* is **Nothing**, the result is a **Byte** array with no elements and no bounds: [**UBound**](../Information/UBound) of it raises error 9, *Subscript out of range*.

<!-- errors: generated from errors/VBA.HiddenModule.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467262 (`&H80004002`)](tb:Errors#-2147467262), *No such interface supported* | *Picture* is an object that is not a picture |
| [424 (`&H1A8`)](tb:Errors#424), *Object required* | *Picture* is **Null** |

<!-- /errors -->

### Example

```tb check_build
Dim Bytes As Variant = PictureToByteArray(Picture1.Picture)
Set Picture2.Picture = LoadPicture(Bytes)
```

### See Also

- [CreateStdPictureFromHandle](CreateStdPictureFromHandle) function
- [ConvertIconToBitmap](ConvertIconToBitmap) function
