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
: *required* **IUnknown**. The picture to serialise — an **stdole.StdPicture**, or any object that implements **IPicture** / **IPictureDisp**.

The result is a **Variant** wrapping a `Byte()` array containing the bytes the picture would write to a stream via **IPersistStream**. The companion deserialiser is the global **LoadPicture**, which accepts a byte array as input and returns a fresh picture.

Returns an empty array if *Picture* is **Nothing**.

### Example

```tb
Dim Bytes As Variant = PictureToByteArray(Picture1.Picture)
Set Picture2.Picture = LoadPicture(Bytes)
```

### See Also

- [CreateStdPictureFromHandle](CreateStdPictureFromHandle) function
- [ConvertIconToBitmap](ConvertIconToBitmap) function
