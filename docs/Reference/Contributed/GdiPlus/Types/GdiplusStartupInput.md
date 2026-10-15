---
title: GdiplusStartupInput
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/GdiplusStartupInput
has_toc: false
---

# GdiplusStartupInput type
{: .no_toc }

The settings that GDI+ is started with.

Pass a **GdiplusStartupInput** to the [**GdiPlusUser**](../GdiPlusUser) constructor to start GDI+ with other settings than the default ones. It mirrors the `GdiplusStartupInput` structure of GDI+ and has five fields and no methods.

A variable declared with `Dim` has every field 0, and its version 0 is not valid: a **GdiPlusUser** created from it fails with status 17, *UnsupportedGdiplusVersion*. Set **GdiplusVersion** before use, or take the structure from one of the module functions.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim blank As GdiplusStartupInput
Debug.Print blank.GdiplusVersion                                 ' 0
Dim failed As GdiPlusUser = GdiPlusUser(blank)
Debug.Print failed.LastResult                                    ' 17
Dim settings As GdiplusStartupInput
settings.GdiplusVersion = 2
settings.StartupParameters = GdiplusStartupNoSetRound
Dim custom As GdiPlusUser = GdiPlusUser(settings)
Debug.Print settings.StartupParameters                           ' 1
```

## Fields

### GdiplusVersion

A **Long** naming the version of GDI+ to start. The values are 1, which is available from Windows XP, 2, from Windows 10, and 3, which is the same as 2 and also turns on the HEIF and AVIF image codecs. Those two codecs need COM to be initialised, and the package does not do it.

### DebugEventCallback

A [**DebugEventProc**](#debugeventproc) that GDI+ calls with assertion and warning messages. Only debug builds of GDI+ call it. Leave it 0 to get no calls.

### SuppressBackgroundThread

A flag that takes **True** or **False**. **True** stops GDI+ from creating its own background thread, and the program must then call the two functions of a [**GdiplusStartupOutput**](GdiplusStartupOutput) itself. Leave it **False** unless the program does that.

> [!NOTE] 0.9.45.0
> The constructor that takes only an input, `GdiPlusUser(settings)`, fails with status 2, *InvalidParameter*, when this flag is **True**, because it gives GDI+ nowhere to return the two functions. Use the constructor that also takes a **GdiplusStartupOutput**.

### SuppressExternalCodecs

A flag that takes **True** or **False**. **True** makes GDI+ use only its own image codecs.

### StartupParameters

A [**GdiplusStartupParams**](../Enumerations/GdiplusStartupParams) value. It is read only when **GdiplusVersion** is 2 or higher, on a Windows 10 build that supports it, and ignored otherwise.

## Creating

Syntax: **GdiplusStartupInput**( [ *debugEventCallback* [, *suppressBackgroundThread* [, *suppressExternalCodecs* ]]] ) \
Syntax: **GdiplusStartupInput**( *startupParameters* [, *debugEventCallback* [, *suppressBackgroundThread* [, *suppressExternalCodecs* ]]] ) \
Syntax: **GdiplusStartupInput**( *gdiplusVersion*, *startupParameters* [, *debugEventCallback* [, *suppressBackgroundThread* [, *suppressExternalCodecs* ]]] )

The module function **GdiplusStartupInput** returns a structure with the fields set. The first form sets the version to 1, the second to 2, and the third to *gdiplusVersion*.

> [!WARNING] 0.9.45.0
> The forms cannot be told apart by an integer or an enumeration member as the first argument. `GdiplusStartupInput(GdiplusStartupNoSetRound)` returns version 1 with no startup parameters, as if the value were a callback, and `GdiplusStartupInput(3, GdiplusStartupDefault)` returns version 2. Set the fields one by one, as in the sample above.

## DebugEventProc

A delegate, **Sub**( *level* As [**GdiplusDebugEventLevel**](../Enumerations/GdiplusDebugEventLevel), *message* As **Any** ). GDI+ passes the level and a pointer to the text of the message.

## See Also

- [GdiPlusUser](../GdiPlusUser) class -- starts GDI+
- [GdiplusStartupOutput](GdiplusStartupOutput) type -- the functions returned when the background thread is suppressed
- [GdiplusStartupParams](../Enumerations/GdiplusStartupParams) enumeration
- [Types](.) -- the types of the package
- [GdiplusStartupInput](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusinit/ns-gdiplusinit-gdiplusstartupinput) -- the GDI+ structure on Microsoft Learn
