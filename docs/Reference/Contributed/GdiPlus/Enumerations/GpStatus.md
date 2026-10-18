---
title: GpStatus
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpStatus
---

# GpStatus enumeration
{: .no_toc }

Indicates the result of a GDI+ call.

Nearly every method of the package that does not return a value returns a **GpStatus**, and every object keeps the last one in its **LastResult** property of [**GdiPlusBase**](../GdiPlusBase). What happens to a status other than **Ok** depends on the error handling strategy, [GpErrorHandlingStrategy](GpErrorHandlingStrategy). **AsText** returns the text of a status.

<!-- test: Gr_LibraryTests.GpStatus_ImageFromMissingFile_IsInvalidParameter -->
> [!NOTE] timeless
> Creating an image from a file that does not exist gives **InvalidParameter**, not **FileNotFound**.

| Member | Value | Description |
|:-------|:------|:------------|
| **Ok**{: #Ok } | `0` | The call succeeded. |
| **GenericError**{: #GenericError } | `1` | The call failed for a reason that none of the other members describes. |
| **InvalidParameter**{: #InvalidParameter } | `2` | One of the arguments is not valid. |
| **OutOfMemory**{: #OutOfMemory } | `3` | The system has no memory left for the call. |
| **ObjectBusy**{: #ObjectBusy } | `4` | An argument is in use in another thread. |
| **InsufficientBuffer**{: #InsufficientBuffer } | `5` | A buffer that was passed to the call is too small for the data it receives. |
| **NotImplemented**{: #NotImplemented } | `6` | The method is not implemented. |
| **Win32Error**{: #Win32Error } | `7` | The call caused a Win32 error. |
| **WrongState**{: #WrongState } | `8` | The object is in a state in which the call is not allowed. For example, asking a pen that is not a solid colour pen for its colour. |
| **Aborted**{: #Aborted } | `9` | The call was aborted. |
| **FileNotFound**{: #FileNotFound } | `10` | The image file or the metafile cannot be found. |
| **ValueOverflow**{: #ValueOverflow } | `11` | An arithmetic operation of the call overflowed. |
| **AccessDenied**{: #AccessDenied } | `12` | A write to the file is not allowed. |
| **UnknownImageFormat**{: #UnknownImageFormat } | `13` | The format of the image file is not known. |
| **FontFamilyNotFound**{: #FontFamilyNotFound } | `14` | The font family cannot be found. Its name is not valid, or the family is not installed. |
| **FontStyleNotFound**{: #FontStyleNotFound } | `15` | The font family does not have the requested style. |
| **NotTrueTypeFont**{: #NotTrueTypeFont } | `16` | The font from a device context or a **LOGFONT** is not a TrueType font, and GDI+ cannot use it. |
| **UnsupportedGdiplusVersion**{: #UnsupportedGdiplusVersion } | `17` | The installed version of GDI+ is not compatible with the version that was requested. |
| **GdiplusNotInitialized**{: #GdiplusNotInitialized } | `18` | GDI+ is not started. Create a [**GdiPlusUser**](../GdiPlusUser) before any other GDI+ object. |
| **PropertyNotFound**{: #PropertyNotFound } | `19` | The image does not have the property. |
| **PropertyNotSupported**{: #PropertyNotSupported } | `20` | The format of the image does not support the property. |
| **ProfileNotFound**{: #ProfileNotFound } | `21` | The colour profile that is needed to save the image in the CMYK format was not found. |
| **LastGpStatus**{: #LastGpStatus } | `21` | The highest status, same as **ProfileNotFound**. |

## Used by

Most methods, functions and constructors of the package return a **GpStatus** or leave one in **LastResult**. [**GdiPlusBase**](../GdiPlusBase) has **LastResult**, **GetLastResult** and **ClearResult**, and the function [**AsText**](../Helpers) returns a status as a string.

## See Also

- [Status](https://learn.microsoft.com/en-us/windows/win32/api/gdiplustypes/ne-gdiplustypes-status) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
