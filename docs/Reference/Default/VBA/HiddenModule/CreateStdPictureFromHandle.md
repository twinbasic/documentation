---
title: CreateStdPictureFromHandle
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/CreateStdPictureFromHandle
---
# CreateStdPictureFromHandle
{: .no_toc }

Wraps a GDI handle in an **stdole.StdPicture** so it can be assigned to a control's **Picture** property or passed to any other **IPicture** consumer.

Syntax: **CreateStdPictureFromHandle(** *Handle* **,** *Type* **,** *TakeOwnership* **)** **As Object**

*Handle*
: *required* **LongPtr**. The GDI handle to wrap --- typically an `HBITMAP`, `HICON`, `HCURSOR`, `HENHMETAFILE`, or `HMETAFILE`.

*Type*
: *required* **Long**. The picture type. Pass one of the **PictureTypeConstants** values (`vbPicTypeBitmap`, `vbPicTypeIcon`, `vbPicTypeMetafile`, `vbPicTypeEnhMetafile`) corresponding to *Handle*'s flavour.

*TakeOwnership*
: *required* **Boolean**. If **True**, the returned picture takes ownership of *Handle* and frees it when released. If **False**, the caller remains responsible for the handle's lifetime.

The result is a regular **stdole.StdPicture** equivalent to one returned by **LoadPicture**, suitable for assignment to a **Picture** property.

With `vbPicTypeBitmap`, *Handle* is not checked: 0, or a handle that is not a bitmap's, gives a picture and raises nothing.

<!-- errors: generated from errors/VBA.HiddenModule.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | *Handle* is not of the kind *Type* names: 0 for an icon, or a bitmap for an icon, a metafile or an enhanced metafile |
| [-2147418113 (`&H8000FFFF`)](tb:Errors#-2147418113), *Catastrophic failure* | *Type* is less than 0 or greater than 4 |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | an argument is **Null** |

<!-- /errors -->

### See Also

- [PictureToByteArray](PictureToByteArray) function
- [ConvertIconToBitmap](ConvertIconToBitmap) function
