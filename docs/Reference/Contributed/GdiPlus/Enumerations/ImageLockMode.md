---
title: ImageLockMode
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/ImageLockMode
---

# ImageLockMode enumeration
{: .no_toc }

Specifies the access flags that are passed to **Bitmap.LockBits**.

The members combine with **Or**. They form the *flags* argument of **LockBits**, which locks a part of a bitmap so that its pixel data can be read or written. The argument is declared as a **UINT**, so the members are passed as their values.

| Member | Value | Description |
|:-------|:------|:------------|
| **ImageLockModeRead**{: #ImageLockModeRead } | `&H0001` | The part of the image is locked for reading. |
| **ImageLockModeWrite**{: #ImageLockModeWrite } | `&H0002` | The part of the image is locked for writing. |
| **ImageLockModeUserInputBuf**{: #ImageLockModeUserInputBuf } | `&H0004` | The buffer for the pixel data is allocated by the caller. When the flag is set, the *flags* argument is an input parameter and possibly an output parameter. When it is not set, *flags* is only an output parameter. |

## Used by

- [**Bitmap**](../Bitmap) class: the *flags* argument of [**LockBits**](../Bitmap#lockbits)

## See Also

- [ImageLockMode](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusimaging/ne-gdiplusimaging-imagelockmode) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Bitmap](../Bitmap) class
