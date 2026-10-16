---
title: Helpers
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Helpers
has_toc: false
---

# Helpers
{: .no_toc }

The functions and constants of the package that belong to no class: module-level members that are called by their name alone.

The constructors of the classes and types are documented on the page of each class or type, and so are the functions that only that page uses: **Color**, **FromCOLORREF**, **MakeARGB** and **HueToValue** on [Color](Types/Color), **Intersection** and **Union** on [GpRect](Types/GpRect) and [GpRectF](Types/GpRectF), **NotificationHook** and **NotificationUnhook** on [GdiplusStartupOutput](Types/GdiplusStartupOutput). This page has the rest.

## Status

### AsText

Syntax: **AsText**( *status* As [**GpStatus**](Enumerations/GpStatus) ) As **String**

Returns the text of a status code: `Ok`, `Invalid Parameter`, `Out of Memory`, `Win32 Error` and so on, as [**Status**](GdiPlusBase#status-statusnl) of a **GdiPlusBase** object returns it. A value outside the codes gives an empty string.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Debug.Print AsText(Ok)                                           ' Ok
Debug.Print AsText(InvalidParameter)                             ' Invalid Parameter
Debug.Print AsText(ProfileNotFound)                              ' Profile Not Found
Debug.Print Len(AsText(99))                                      ' 0
```

## GDI+ itself

### GetBuildNumber

Syntax: **GetBuildNumber**( *buildNumber* As **Long** ) As **GpStatus**

Stores the build number of the GDI+ library in *buildNumber* and returns the status. The first call asks GDI+ and the number is then kept. GDI+ must be started. The method of the same name on [**GdiPlusUser**](GdiPlusUser) returns the number as its value.

### TestControl

Syntax: **TestControl**( *control* As [**GpTestControlEnum**](Enumerations/GpTestControlEnum), *param* As **Any** ) As **GpStatus**

The call that GDI+ provides for its own tests, with an untyped parameter that depends on *control*. Prefer the three functions that follow and **GetBuildNumber**, which wrap it.

### TestControlForceBilinear

Syntax: **TestControlForceBilinear**( *force* As **Boolean** ) As **GpStatus**

**True** makes GDI+ use bilinear interpolation for every scaled image; **False** returns to the setting of the graphics object. A switch for testing.

### TestControlNoICM

Syntax: **TestControlNoICM**( *noICM* As **Boolean** ) As **GpStatus**

**True** turns the colour management of GDI+ off; **False** turns it on again. A switch for testing.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim build As Long
Debug.Print GetBuildNumber(build)                                ' 0
Debug.Print build > 0                                            ' True
Debug.Print TestControlForceBilinear(False)                      ' 0
Debug.Print TestControlNoICM(False)                              ' 0
```

## Pixel formats

These take a [**PixelFormat**](Enumerations/PixelFormat) and test or read the flags that are part of its value.

### GetPixelFormatSize

Syntax: **GetPixelFormatSize**( *format* As **PixelFormat** ) As **Long**

Returns the number of bits of one pixel: 32 for **PixelFormat32bppARGB**.

### IsAlphaPixelFormat

Syntax: **IsAlphaPixelFormat**( *format* As **PixelFormat** ) As **Boolean**

**True** when the format has an alpha channel.

### IsIndexedPixelFormat

Syntax: **IsIndexedPixelFormat**( *format* As **PixelFormat** ) As **Boolean**

**True** when the pixels are indexes into a palette.

### IsExtendedPixelFormat

Syntax: **IsExtendedPixelFormat**( *format* As **PixelFormat** ) As **Boolean**

**True** when the format has 16 bits for each channel.

### IsCanonicalPixelFormat

Syntax: **IsCanonicalPixelFormat**( *format* As **PixelFormat** ) As **Boolean**

**True** when the format is one of the canonical formats of GDI+: 32 or 64 bits with an alpha channel.

<!-- test: Gr_LibraryTests.IsCanonicalPixelFormat_PremultipliedFormats_AreCanonical -->
> [!WARNING] 0.9.45.0
> The result is **False** for **PixelFormat32bppPARGB** and **PixelFormat64bppPARGB**, which are canonical in GDI+, because the values of those two members of the enumeration lack the canonical flag. It is **True** for **PixelFormat32bppARGB** and **PixelFormat64bppARGB**.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Debug.Print GetPixelFormatSize(PixelFormat32bppARGB)             ' 32
Debug.Print GetPixelFormatSize(PixelFormat24bppRGB)              ' 24
Debug.Print IsAlphaPixelFormat(PixelFormat32bppARGB)             ' True
Debug.Print IsAlphaPixelFormat(PixelFormat24bppRGB)              ' False
Debug.Print IsIndexedPixelFormat(PixelFormat8bppIndexed)         ' True
Debug.Print IsExtendedPixelFormat(PixelFormat48bppRGB)           ' True
Debug.Print IsCanonicalPixelFormat(PixelFormat32bppARGB)         ' True
```

## Object types

### ObjectTypeIsValid

Syntax: **ObjectTypeIsValid**( *type* As [**GpObjectType**](Enumerations/GpObjectType) ) As **Boolean**

**True** when *type* is one of the kinds of GDI+ object, from **ObjectTypeBrush** to **ObjectTypeGraphics**; **False** for **ObjectTypeInvalid** and values outside the range.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Debug.Print ObjectTypeIsValid(ObjectTypeBrush)                   ' True
Debug.Print ObjectTypeIsValid(ObjectTypeInvalid)                 ' False
```

## Palettes and metafiles

### InitializePalette

Syntax: **InitializePalette**( *palette* As **ColorPalette**, *paletteType*, *optimalColors* As **Long**, *useTransparentColor* As **Boolean** [, *bitmap* As [**Bitmap**](Bitmap) ] ) As **GpStatus**

Fills *palette* with colours of the kind *paletteType* ([**PaletteType**](Enumerations/PaletteType)). *optimalColors* is the number of colours to find. For the optimal types, the colours are chosen by median cut from *bitmap*. The palette must have its **count** set to the number of entries it can hold; if it has too few, the call fails.

### EmfToWmfBits

Syntax: **EmfToWmfBits**( *hEmf* As **LongPtr**, *cbData16* As **Long**, *pData16* As **Byte** [, *mapMode* [, *flags* ]] ) As **Long**

Converts an enhanced metafile to the bits of a Windows metafile. *hEmf* is the handle of the enhanced metafile, *pData16* the first byte of a buffer of *cbData16* bytes that receives the result, and *flags* a combination of [**GpEmfToWmfBitsFlags**](Enumerations/GpEmfToWmfBitsFlags). Returns the number of bytes, or 0 on failure.

### GetMetafileHeader

Syntax: **GetMetafileHeader**( *filename* As **String**, *header* As [**MetafileHeader**](Types/MetafileHeader) ) As **GpStatus**

Syntax: **GetMetafileHeader**( *stream*, *header* As **MetafileHeader** ) As **GpStatus**

Reads the header of a metafile without making a [**Metafile**](Metafile) of it, and stores it in *header*. The first form reads a file, the second a stream, an object that implements the COM interface **IStream**, such as the one that the Windows function `SHCreateStreamOnFileEx` makes. The status is **Ok** when the header is read.

### GetMetafileHeaderFromEmf

Syntax: **GetMetafileHeaderFromEmf**( *hEmf* As **LongPtr**, *header* As **MetafileHeader** ) As **GpStatus**

Reads the header of the enhanced metafile that the handle *hEmf* names. The handle stays with the caller.

### GetMetafileHeaderFromWmf

Syntax: **GetMetafileHeaderFromWmf**( *hWmf* As **LongPtr**, *placeableHeader* As [**WmfPlaceableFileHeader**](Types/WmfPlaceableFileHeader), *header* As **MetafileHeader** ) As **GpStatus**

Reads the header of the Windows metafile that the handle *hWmf* names. *placeableHeader* is the [placeable header](Types/WmfPlaceableFileHeader) that goes with the metafile, which gives its bounds and resolution, since a Windows metafile has none of its own. GDI+ checks the header: when **Checksum** is not the exclusive OR of the ten 16-bit words before it, the call returns 2 (**InvalidParameter**). The handle stays with the caller.

```tb check_build slot=file projname=gdiplus-helpers
Module HelpersEmf
    Private Declare PtrSafe Function CreateEnhMetaFileW Lib "gdi32" (ByVal hdcRef As LongPtr, ByVal fileName As LongPtr, ByVal rc As LongPtr, ByVal desc As LongPtr) As LongPtr
    Private Declare PtrSafe Function CloseEnhMetaFile Lib "gdi32" (ByVal hdc As LongPtr) As LongPtr
    Private Declare PtrSafe Function DeleteEnhMetaFile Lib "gdi32" (ByVal h As LongPtr) As Long
    Private Declare PtrSafe Function CreateMetaFileW Lib "gdi32" (ByVal fileName As LongPtr) As LongPtr
    Private Declare PtrSafe Function CloseMetaFile Lib "gdi32" (ByVal hdc As LongPtr) As LongPtr
    Private Declare PtrSafe Function Rectangle Lib "gdi32" (ByVal hdc As LongPtr, ByVal l As Long, ByVal t As Long, ByVal r As Long, ByVal b As Long) As Long
    Private Declare PtrSafe Function SHCreateStreamOnFileEx Lib "shlwapi" (ByVal fileName As LongPtr, ByVal mode As Long, ByVal attributes As Long, ByVal create As Long, ByVal template As LongPtr, ByRef stream As GDIP_IStream) As Long

    ' Opens a file for reading as a COM stream.
    Public Function OpenStream(ByVal path As String) As GDIP_IStream
        SHCreateStreamOnFileEx StrPtr(path), 0, &H80, 0, 0, OpenStream
    End Function

    ' Makes an enhanced metafile with one rectangle, in memory (path = "") or in a file.
    ' The handle is the caller's to delete with DeleteEmf.
    Public Function MakeEmf(ByVal width As Long, ByVal height As Long, Optional ByVal path As String) As LongPtr
        Dim dc As LongPtr
        If Len(path) = 0 Then dc = CreateEnhMetaFileW(0, 0, 0, 0) Else dc = CreateEnhMetaFileW(0, StrPtr(path), 0, 0)
        Rectangle dc, 0, 0, width, height
        Return CloseEnhMetaFile(dc)
    End Function

    Public Sub DeleteEmf(ByVal hEmf As LongPtr)
        DeleteEnhMetaFile hEmf
    End Sub

    ' Makes a Windows metafile with one rectangle, in memory.
    Public Function MakeWmf() As LongPtr
        Dim dc As LongPtr = CreateMetaFileW(0)
        Rectangle dc, 0, 0, 100, 50
        Return CloseMetaFile(dc)
    End Function
End Module
```

```tb check_build check_run projname=gdiplus-helpers
Dim user As GdiPlusUser = GdiPlusUser()
Dim header As MetafileHeader

Dim hemf As LongPtr = HelpersEmf.MakeEmf(40, 30)
Debug.Print GetMetafileHeaderFromEmf(hemf, header)
Debug.Print header.IsEmf & " " & header.Width & " " & header.Height
HelpersEmf.DeleteEmf hemf

Dim path As String = Environ$("TEMP") & "\tbdocs-gdiplus-header.emf"
HelpersEmf.DeleteEmf HelpersEmf.MakeEmf(50, 20, path)
Debug.Print GetMetafileHeader(path, header)
Debug.Print header.IsEmf & " " & header.Width & " " & header.Height

Dim header2 As MetafileHeader
Dim stream As GDIP_IStream = HelpersEmf.OpenStream(path)
Debug.Print GetMetafileHeader(stream, header2)
Debug.Print header2.IsEmf & " " & header2.Width & " " & header2.Height
Set stream = Nothing
Kill path

Dim placeable As WmfPlaceableFileHeader
placeable.Key = &H9AC6CDD7
placeable.BoundingBox.Right = 2880
placeable.BoundingBox.Bottom = 1440
placeable.Inch = 1440
placeable.Checksum = &H5C51             ' the exclusive OR of the ten words before it
Dim header3 As MetafileHeader
Debug.Print GetMetafileHeaderFromWmf(HelpersEmf.MakeWmf(), placeable, header3)
Debug.Print header3.Type & " " & header3.IsWmf & " " & header3.DpiX & " " & header3.Width & " " & header3.Height
' Output:
' 0
' True 40 30
' 0
' True 50 20
' 0
' True 50 20
' 0
' 2 True 1440 2880 1440
```

### GdipCreateStreamOnFile

Syntax: **GdipCreateStreamOnFile**( *filename* As **LongPtr**, *access* As **Long**, *stream* ) As **GpStatus**

The function of the GDI+ flat API of that name, declared by the package. It is meant to open the file whose name *filename* points to (the address of a string, as `StrPtr(name)` returns it) as a COM **IStream** and to store it in *stream*, for the stream form of [**GetMetafileHeader**](#getmetafileheader).

<!-- test: Gr_LibraryTests.GdipCreateStreamOnFile_ExistingFile_ReturnsAStream -->
> [!WARNING] 0.9.45.0
> The function returns 6 (**NotImplemented**) and stores no stream, whatever the value of *access*. Make the stream with the Windows function `SHCreateStreamOnFileEx` instead, as the sample above does.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim stream As GDIP_IStream
Dim path As String = Environ$("TEMP") & "\tbdocs-gdiplus-stream.tmp"
Debug.Print GdipCreateStreamOnFile(StrPtr(path), &H80000000, stream)
Debug.Print stream Is Nothing
' Output:
' 6
' True
```

## Effects

The effect classes ([**Effect**](Effect)) are applied to a bitmap in place by [**Bitmap.ApplyEffect**](Bitmap#applyeffect). The functions below apply one to several bitmaps at once, name the effects to the flat GDI+ API, and read and write the parameters of a native effect.

### ApplyEffect

Syntax: *status* **= ApplyEffect**( *inputs*( ) As [**Bitmap**](Bitmap), *effect* As [**Effect**](Effect), *output* As **Bitmap** )

Syntax: *status* **= ApplyEffect**( *inputs*( ) As **Bitmap**, *effect* As **Effect**, *roi* As [**GpRect**](Types/GpRect), *outputRect* As **GpRect**, *output* As **Bitmap** )

*inputs*
: *required* An array of the bitmaps that the effect reads. Most effects read one.

*effect*
: *required* The effect to apply.

*roi*
: *required* The part of the input that the effect reads. The first form passes none, and the effect reads all of it.

*outputRect*
: *required* The rectangle of the output that receives the result. The first form passes none, and the output is as large as the part that is read.

*output*
: *required* Receives a new **Bitmap** that holds the result; the inputs are not changed. It is **Nothing** when the call fails.

Applies the effect to the input bitmaps and returns the result in a new bitmap, where [**Bitmap.ApplyEffect**](Bitmap#applyeffect) changes the pixels of one bitmap. It needs GDI+ 1.1 (Windows 7 or later). Any auxiliary data of the effect from an earlier call is freed first, and the data of this call is stored in the effect ([**Effect.AuxData**](Effect#auxdata)).

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim src As Bitmap = Bitmap(8!, 8!)
Graphics(src).Clear(Color(255, 200, 100, 50))
Dim inputs(0 To 0) As Bitmap
Set inputs(0) = src

Dim out As Bitmap
Debug.Print ApplyEffect(inputs, BrightnessContrast(50, 0), out)
Debug.Print out.Width & " " & out.Height
Debug.Print Hex$(out.Pixel(4, 4).argb)
Debug.Print Hex$(src.Pixel(4, 4).argb)
' Output:
' 0
' 8 8
' FFFA9664
' FFC86432
```

### Effect IDs

Each effect class is created in GDI+ from a class ID. These functions take no arguments and return it as a **UUID**, for a program that calls the flat GDI+ function `GdipCreateEffect` itself. The effect classes use them, so a program that uses the classes has no need of them.

| Function | Effect |
|:---------|:-------|
| **BlurEffectGuid** | [**Blur**](Blur) |
| **SharpenEffectGuid** | [**Sharpen**](Sharpen) |
| **ColorMatrixEffectGuid** | [**ColorMatrixEffect**](ColorMatrixEffect) |
| **ColorLUTEffectGuid** | [**ColorLUT**](ColorLUT) |
| **BrightnessContrastEffectGuid** | [**BrightnessContrast**](BrightnessContrast) |
| **HueSaturationLightnessEffectGuid** | [**HueSaturationLightness**](HueSaturationLightness) |
| **LevelsEffectGuid** | [**Levels**](Levels) |
| **TintEffectGuid** | [**Tint**](Tint) |
| **ColorBalanceEffectGuid** | [**ColorBalance**](ColorBalance) |
| **RedEyeCorrectionEffectGuid** | [**RedEyeCorrection**](RedEyeCorrection) |
| **ColorCurveEffectGuid** | [**ColorCurve**](ColorCurve) |

### ColorLutParams

Syntax: *params* **= ColorLutParams**( *lutB*( ) As **Byte**, *lutG*( ) As **Byte**, *lutR*( ) As **Byte**, *lutA*( ) As **Byte** )

The constructor of [**ColorLUTParams**](Types/ColorLUTParams), written with a different letter case. It is described, with its defect, on the page of that type.

### SetParameters, GetParameters

Syntax: *status* **= SetParameters**( *effect*, *params* )

Syntax: *status* **= GetParameters**( *effect*, *params* )

Set and read the parameters of the GDI+ effect object that *effect* names, for a program that calls the flat GDI+ API. *effect* is the native handle of the effect, which [**GetNative**](#getnative) returns for an **Effect** object; *params* is one of the parameter structures, such as [**BlurParams**](Types/BlurParams), and its size is passed to GDI+. **GetParameters** fills *params*. The classes use them for their **Parameters** properties, which are the usual way to the same data.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim fx As Effect = Blur(2!, False)
Debug.Print Hex$(BlurEffectGuid().Data1)
Dim params As BlurParams = BlurParams(7!, True)
Debug.Print SetParameters(GetNative(fx), params)

Dim back As BlurParams
Debug.Print GetParameters(GetNative(fx), back)
Debug.Print back.radius & " " & (back.expandEdge <> 0)
' Output:
' 633C80A4
' 0
' 0
' 7 True
```

## Brushes

### BrushFrom

Syntax: *brush* **= BrushFrom**( *native* )

Makes the brush object for a native GDI+ brush, for a program that calls the flat GDI+ API and wants a class in place of a bare handle. *native* is the handle of the native brush. The function reads its kind and returns an [**IBrush**](IBrush) that holds a [**SolidBrush**](SolidBrush), [**HatchBrush**](HatchBrush), [**TextureBrush**](TextureBrush), [**PathGradientBrush**](PathGradientBrush) or [**LinearGradientBrush**](LinearGradientBrush); the brush object owns the handle from then on and deletes it, so no other object may. For a handle of another kind it deletes the handle and returns **Nothing**.

```tb check_build slot=file projname=gdiplus-helpers
Module HelpersBrush
    Private Declare PtrSafe Function GdipCreateSolidFill Lib "gdiplus" (ByVal argb As Long, ByRef brush As LongPtr) As Long

    ' Makes a native solid brush the way a flat GDI+ program does.
    Public Function MakeNativeSolid(ByVal argb As Long) As GpBrush
        Dim h As LongPtr
        If GdipCreateSolidFill(argb, h) = 0 Then MakeNativeSolid.Native = h
    End Function
End Module
```

```tb check_build check_run projname=gdiplus-helpers
Dim user As GdiPlusUser = GdiPlusUser()

Dim b As IBrush = BrushFrom(HelpersBrush.MakeNativeSolid(&HFF336699))
Debug.Print b.Type
Dim bmp As Bitmap = Bitmap(4!, 4!)
Graphics(bmp).FillRectangle b, 0, 0, 4, 4
Debug.Print Hex$(bmp.Pixel(1, 1).argb)
' Output:
' 0
' FF336699
```

## Native handles

### GetNative

Syntax: **GetNative**( *object* ) As *handle*

Returns the native handle of a GDI+ object for the program that calls the flat GDI+ functions itself. There is one overload for each class that wraps a GDI+ object: **Graphics**, **Pen**, **Bitmap**, **Image**, **Metafile**, **Region**, **Matrix**, **GraphicsPath**, **Font**, **FontFamily**, **FontCollection** and its two derived classes, **StringFormat**, **ImageAttributes**, **CachedBitmap**, **PathIterator**, **Effect**, **CustomLineCap**, **ArrowCap**, and each brush class. It returns a small structure of the package whose **Native** field holds the handle as a **LongPtr**; for a **Nothing** argument the field is 0. The handle belongs to the object and is released with it: do not delete it.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(8!, 8!)
Debug.Print GetNative(bmp).Native <> 0                           ' True
```

## Property tag IDs

An image file can hold properties: the camera model of a photograph, the time it was taken, the delay of a GIF frame. Each has a numeric ID, and the constants below name the common ones. An ID is the *propId* argument of [**Image.PropertyItem**](Image#propertyitem) and the **Id** field of a [**GpPropertyItem**](Types/GpPropertyItem). The tables give each constant by its full name and its value. The names are those of the GDI+ C++ header, spelling included (`PropertyTagTransferFuncition`). The type of a property's value is the one that the TIFF, EXIF or GPS standard gives the tag; the constants do not say what it is. The thumbnail tags (`PropertyTagThumbnail...`) describe the small picture that a file may hold beside the main one.

<!-- test: Gr_LibraryTests.PropertyTag_ConstantsAbove8000_AreNotNegativeInLong, Gr_LibraryTests.RemovePropertyItem_HighPropertyTag_RemovesTheItem, Gr_LibraryTests.RemovePropertyItem_HighPropertyTagConvertedToLong_RemovesTheItem -->
> [!WARNING] 0.9.45.0
> Each constant is an **Integer**, so the 61 tags from `&H8000` up, such as `PropertyTagCopyright` (`&H8298`), are negative numbers. Passed where a **Long** is expected, as the *propId* of **PropertyItem** and **RemovePropertyItem** are, a negative **Integer** becomes `&HFFFF8298`, the ID of another property, and the call finds nothing. Convert the tag first with `tag And &HFFFF&`, which gives `&H8298`, as the example below does. The same holds for comparing a tag with the **Id** of a **GpPropertyItem**.

### Exif properties

| Constant | Value |
|:---------|:------|
| **PropertyTagExifIFD** | `&H8769` |
| **PropertyTagExifExposureTime** | `&H829A` |
| **PropertyTagExifFNumber** | `&H829D` |
| **PropertyTagExifExposureProg** | `&H8822` |
| **PropertyTagExifSpectralSense** | `&H8824` |
| **PropertyTagExifISOSpeed** | `&H8827` |
| **PropertyTagExifOECF** | `&H8828` |
| **PropertyTagExifVer** | `&H9000` |
| **PropertyTagExifDTOrig** | `&H9003` |
| **PropertyTagExifDTDigitized** | `&H9004` |
| **PropertyTagExifCompConfig** | `&H9101` |
| **PropertyTagExifCompBPP** | `&H9102` |
| **PropertyTagExifShutterSpeed** | `&H9201` |
| **PropertyTagExifAperture** | `&H9202` |
| **PropertyTagExifBrightness** | `&H9203` |
| **PropertyTagExifExposureBias** | `&H9204` |
| **PropertyTagExifMaxAperture** | `&H9205` |
| **PropertyTagExifSubjectDist** | `&H9206` |
| **PropertyTagExifMeteringMode** | `&H9207` |
| **PropertyTagExifLightSource** | `&H9208` |
| **PropertyTagExifFlash** | `&H9209` |
| **PropertyTagExifFocalLength** | `&H920A` |
| **PropertyTagExifSubjectArea** | `&H9214` |
| **PropertyTagExifMakerNote** | `&H927C` |
| **PropertyTagExifUserComment** | `&H9286` |
| **PropertyTagExifDTSubsec** | `&H9290` |
| **PropertyTagExifDTOrigSS** | `&H9291` |
| **PropertyTagExifDTDigSS** | `&H9292` |
| **PropertyTagExifFPXVer** | `&HA000` |
| **PropertyTagExifColorSpace** | `&HA001` |
| **PropertyTagExifPixXDim** | `&HA002` |
| **PropertyTagExifPixYDim** | `&HA003` |
| **PropertyTagExifRelatedWav** | `&HA004` |
| **PropertyTagExifInterop** | `&HA005` |
| **PropertyTagExifFlashEnergy** | `&HA20B` |
| **PropertyTagExifSpatialFR** | `&HA20C` |
| **PropertyTagExifFocalXRes** | `&HA20E` |
| **PropertyTagExifFocalYRes** | `&HA20F` |
| **PropertyTagExifFocalResUnit** | `&HA210` |
| **PropertyTagExifSubjectLoc** | `&HA214` |
| **PropertyTagExifExposureIndex** | `&HA215` |
| **PropertyTagExifSensingMethod** | `&HA217` |
| **PropertyTagExifFileSource** | `&HA300` |
| **PropertyTagExifSceneType** | `&HA301` |
| **PropertyTagExifCfaPattern** | `&HA302` |
| **PropertyTagExifCustomRendered** | `&HA401` |
| **PropertyTagExifExposureMode** | `&HA402` |
| **PropertyTagExifWhiteBalance** | `&HA403` |
| **PropertyTagExifDigitalZoomRatio** | `&HA404` |
| **PropertyTagExifFocalLengthIn35mmFilm** | `&HA405` |
| **PropertyTagExifSceneCaptureType** | `&HA406` |
| **PropertyTagExifGainControl** | `&HA407` |
| **PropertyTagExifContrast** | `&HA408` |
| **PropertyTagExifSaturation** | `&HA409` |
| **PropertyTagExifSharpness** | `&HA40A` |
| **PropertyTagExifDeviceSettingDesc** | `&HA40B` |
| **PropertyTagExifSubjectDistanceRange** | `&HA40C` |
| **PropertyTagExifUniqueImageID** | `&HA420` |

### GPS properties

| Constant | Value |
|:---------|:------|
| **PropertyTagGpsIFD** | `&H8825` |
| **PropertyTagGpsVer** | `&H0000` |
| **PropertyTagGpsLatitudeRef** | `&H0001` |
| **PropertyTagGpsLatitude** | `&H0002` |
| **PropertyTagGpsLongitudeRef** | `&H0003` |
| **PropertyTagGpsLongitude** | `&H0004` |
| **PropertyTagGpsAltitudeRef** | `&H0005` |
| **PropertyTagGpsAltitude** | `&H0006` |
| **PropertyTagGpsGpsTime** | `&H0007` |
| **PropertyTagGpsGpsSatellites** | `&H0008` |
| **PropertyTagGpsGpsStatus** | `&H0009` |
| **PropertyTagGpsGpsMeasureMode** | `&H000A` |
| **PropertyTagGpsGpsDop** | `&H000B` |
| **PropertyTagGpsSpeedRef** | `&H000C` |
| **PropertyTagGpsSpeed** | `&H000D` |
| **PropertyTagGpsTrackRef** | `&H000E` |
| **PropertyTagGpsTrack** | `&H000F` |
| **PropertyTagGpsImgDirRef** | `&H0010` |
| **PropertyTagGpsImgDir** | `&H0011` |
| **PropertyTagGpsMapDatum** | `&H0012` |
| **PropertyTagGpsDestLatRef** | `&H0013` |
| **PropertyTagGpsDestLat** | `&H0014` |
| **PropertyTagGpsDestLongRef** | `&H0015` |
| **PropertyTagGpsDestLong** | `&H0016` |
| **PropertyTagGpsDestBearRef** | `&H0017` |
| **PropertyTagGpsDestBear** | `&H0018` |
| **PropertyTagGpsDestDistRef** | `&H0019` |
| **PropertyTagGpsDestDist** | `&H001A` |
| **PropertyTagGpsProcessingMethod** | `&H001B` |
| **PropertyTagGpsAreaInformation** | `&H001C` |
| **PropertyTagGpsDate** | `&H001D` |
| **PropertyTagGpsDifferential** | `&H001E` |

### Thumbnail properties

| Constant | Value |
|:---------|:------|
| **PropertyTagThumbnailFormat** | `&H5012` |
| **PropertyTagThumbnailWidth** | `&H5013` |
| **PropertyTagThumbnailHeight** | `&H5014` |
| **PropertyTagThumbnailColorDepth** | `&H5015` |
| **PropertyTagThumbnailPlanes** | `&H5016` |
| **PropertyTagThumbnailRawBytes** | `&H5017` |
| **PropertyTagThumbnailSize** | `&H5018` |
| **PropertyTagThumbnailCompressedSize** | `&H5019` |
| **PropertyTagThumbnailData** | `&H501B` |
| **PropertyTagThumbnailImageWidth** | `&H5020` |
| **PropertyTagThumbnailImageHeight** | `&H5021` |
| **PropertyTagThumbnailBitsPerSample** | `&H5022` |
| **PropertyTagThumbnailCompression** | `&H5023` |
| **PropertyTagThumbnailPhotometricInterp** | `&H5024` |
| **PropertyTagThumbnailImageDescription** | `&H5025` |
| **PropertyTagThumbnailEquipMake** | `&H5026` |
| **PropertyTagThumbnailEquipModel** | `&H5027` |
| **PropertyTagThumbnailStripOffsets** | `&H5028` |
| **PropertyTagThumbnailOrientation** | `&H5029` |
| **PropertyTagThumbnailSamplesPerPixel** | `&H502A` |
| **PropertyTagThumbnailRowsPerStrip** | `&H502B` |
| **PropertyTagThumbnailStripBytesCount** | `&H502C` |
| **PropertyTagThumbnailResolutionX** | `&H502D` |
| **PropertyTagThumbnailResolutionY** | `&H502E` |
| **PropertyTagThumbnailPlanarConfig** | `&H502F` |
| **PropertyTagThumbnailResolutionUnit** | `&H5030` |
| **PropertyTagThumbnailTransferFunction** | `&H5031` |
| **PropertyTagThumbnailSoftwareUsed** | `&H5032` |
| **PropertyTagThumbnailDateTime** | `&H5033` |
| **PropertyTagThumbnailArtist** | `&H5034` |
| **PropertyTagThumbnailWhitePoint** | `&H5035` |
| **PropertyTagThumbnailPrimaryChromaticities** | `&H5036` |
| **PropertyTagThumbnailYCbCrCoefficients** | `&H5037` |
| **PropertyTagThumbnailYCbCrSubsampling** | `&H5038` |
| **PropertyTagThumbnailYCbCrPositioning** | `&H5039` |
| **PropertyTagThumbnailRefBlackWhite** | `&H503A` |
| **PropertyTagThumbnailCopyRight** | `&H503B` |

### JPEG properties

| Constant | Value |
|:---------|:------|
| **PropertyTagJPEGProc** | `&H0200` |
| **PropertyTagJPEGInterFormat** | `&H0201` |
| **PropertyTagJPEGInterLength** | `&H0202` |
| **PropertyTagJPEGRestartInterval** | `&H0203` |
| **PropertyTagJPEGLosslessPredictors** | `&H0205` |
| **PropertyTagJPEGPointTransforms** | `&H0206` |
| **PropertyTagJPEGQTables** | `&H0207` |
| **PropertyTagJPEGDCTables** | `&H0208` |
| **PropertyTagJPEGACTables** | `&H0209` |
| **PropertyTagJPEGQuality** | `&H5010` |

### Halftone properties

| Constant | Value |
|:---------|:------|
| **PropertyTagHalftoneHints** | `&H0141` |
| **PropertyTagHalftoneLPI** | `&H500A` |
| **PropertyTagHalftoneLPIUnit** | `&H500B` |
| **PropertyTagHalftoneDegree** | `&H500C` |
| **PropertyTagHalftoneShape** | `&H500D` |
| **PropertyTagHalftoneMisc** | `&H500E` |
| **PropertyTagHalftoneScreen** | `&H500F` |

### TIFF, GIF, PNG and general properties

| Constant | Value |
|:---------|:------|
| **PropertyTagNewSubfileType** | `&H00FE` |
| **PropertyTagSubfileType** | `&H00FF` |
| **PropertyTagImageWidth** | `&H0100` |
| **PropertyTagImageHeight** | `&H0101` |
| **PropertyTagBitsPerSample** | `&H0102` |
| **PropertyTagCompression** | `&H0103` |
| **PropertyTagPhotometricInterp** | `&H0106` |
| **PropertyTagThreshHolding** | `&H0107` |
| **PropertyTagCellWidth** | `&H0108` |
| **PropertyTagCellHeight** | `&H0109` |
| **PropertyTagFillOrder** | `&H010A` |
| **PropertyTagDocumentName** | `&H010D` |
| **PropertyTagImageDescription** | `&H010E` |
| **PropertyTagEquipMake** | `&H010F` |
| **PropertyTagEquipModel** | `&H0110` |
| **PropertyTagStripOffsets** | `&H0111` |
| **PropertyTagOrientation** | `&H0112` |
| **PropertyTagSamplesPerPixel** | `&H0115` |
| **PropertyTagRowsPerStrip** | `&H0116` |
| **PropertyTagStripBytesCount** | `&H0117` |
| **PropertyTagMinSampleValue** | `&H0118` |
| **PropertyTagMaxSampleValue** | `&H0119` |
| **PropertyTagXResolution** | `&H011A` |
| **PropertyTagYResolution** | `&H011B` |
| **PropertyTagPlanarConfig** | `&H011C` |
| **PropertyTagPageName** | `&H011D` |
| **PropertyTagXPosition** | `&H011E` |
| **PropertyTagYPosition** | `&H011F` |
| **PropertyTagFreeOffset** | `&H0120` |
| **PropertyTagFreeByteCounts** | `&H0121` |
| **PropertyTagGrayResponseUnit** | `&H0122` |
| **PropertyTagGrayResponseCurve** | `&H0123` |
| **PropertyTagT4Option** | `&H0124` |
| **PropertyTagT6Option** | `&H0125` |
| **PropertyTagResolutionUnit** | `&H0128` |
| **PropertyTagPageNumber** | `&H0129` |
| **PropertyTagTransferFuncition** | `&H012D` |
| **PropertyTagSoftwareUsed** | `&H0131` |
| **PropertyTagDateTime** | `&H0132` |
| **PropertyTagArtist** | `&H013B` |
| **PropertyTagHostComputer** | `&H013C` |
| **PropertyTagPredictor** | `&H013D` |
| **PropertyTagWhitePoint** | `&H013E` |
| **PropertyTagPrimaryChromaticities** | `&H013F` |
| **PropertyTagColorMap** | `&H0140` |
| **PropertyTagTileWidth** | `&H0142` |
| **PropertyTagTileLength** | `&H0143` |
| **PropertyTagTileOffset** | `&H0144` |
| **PropertyTagTileByteCounts** | `&H0145` |
| **PropertyTagInkSet** | `&H014C` |
| **PropertyTagInkNames** | `&H014D` |
| **PropertyTagNumberOfInks** | `&H014E` |
| **PropertyTagDotRange** | `&H0150` |
| **PropertyTagTargetPrinter** | `&H0151` |
| **PropertyTagExtraSamples** | `&H0152` |
| **PropertyTagSampleFormat** | `&H0153` |
| **PropertyTagSMinSampleValue** | `&H0154` |
| **PropertyTagSMaxSampleValue** | `&H0155` |
| **PropertyTagTransferRange** | `&H0156` |
| **PropertyTagYCbCrCoefficients** | `&H0211` |
| **PropertyTagYCbCrSubsampling** | `&H0212` |
| **PropertyTagYCbCrPositioning** | `&H0213` |
| **PropertyTagREFBlackWhite** | `&H0214` |
| **PropertyTagICCProfile** | `&H8773` |
| **PropertyTagGamma** | `&H0301` |
| **PropertyTagICCProfileDescriptor** | `&H0302` |
| **PropertyTagSRGBRenderingIntent** | `&H0303` |
| **PropertyTagImageTitle** | `&H0320` |
| **PropertyTagCopyright** | `&H8298` |
| **PropertyTagResolutionXUnit** | `&H5001` |
| **PropertyTagResolutionYUnit** | `&H5002` |
| **PropertyTagResolutionXLengthUnit** | `&H5003` |
| **PropertyTagResolutionYLengthUnit** | `&H5004` |
| **PropertyTagPrintFlags** | `&H5005` |
| **PropertyTagPrintFlagsVersion** | `&H5006` |
| **PropertyTagPrintFlagsCrop** | `&H5007` |
| **PropertyTagPrintFlagsBleedWidth** | `&H5008` |
| **PropertyTagPrintFlagsBleedWidthScale** | `&H5009` |
| **PropertyTagGridSize** | `&H5011` |
| **PropertyTagColorTransferFunction** | `&H501A` |
| **PropertyTagLuminanceTable** | `&H5090` |
| **PropertyTagChrominanceTable** | `&H5091` |
| **PropertyTagFrameDelay** | `&H5100` |
| **PropertyTagLoopCount** | `&H5101` |
| **PropertyTagGlobalPalette** | `&H5102` |
| **PropertyTagIndexBackground** | `&H5103` |
| **PropertyTagIndexTransparent** | `&H5104` |
| **PropertyTagPixelUnit** | `&H5110` |
| **PropertyTagPixelPerUnitX** | `&H5111` |
| **PropertyTagPixelPerUnitY** | `&H5112` |
| **PropertyTagPaletteHistogram** | `&H5113` |


```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Debug.Print Hex$(PropertyTagImageWidth) & " " & Hex$(PropertyTagImageHeight)
Debug.Print Hex$(PropertyTagFrameDelay)
Debug.Print PropertyTagImageWidth = &H100
Debug.Print PropertyTagCopyright & " " & Hex$(CLng(PropertyTagCopyright))
Debug.Print Hex$(PropertyTagCopyright And &HFFFF&)
' Output:
' 100 101
' 5100
' True
' -32104 FFFF8298
' 8298
```

## Constants

### REAL_EPSILON

The smallest **Single** that added to 1 changes it: 1.192092896E-07. The geometry types use it as the limit under which a length or a size counts as zero.

### REAL_MAX, REAL_MIN, REAL_TOLERANCE

**REAL_MAX** is the largest **Single**, 3.402823466E+38; **REAL_MIN** the smallest positive normal one, 1.175494351E-38; **REAL_TOLERANCE** is 100 times **REAL_MIN**.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Debug.Print REAL_EPSILON < 0.000001                              ' True
Debug.Print REAL_MIN * 100 = REAL_TOLERANCE                      ' True
Debug.Print REAL_MAX > 1E+38                                     ' True
```

## Callback delegates

Delegate types for the callbacks that some methods take. The methods that accept one say so on their pages.

### ImageAbort, DrawImageAbort, GetThumbnailImageAbort

**Function**( *pv* As **LongPtr** ) As **GDIP_BOOL**. GDI+ calls the function while it works, with the *callbackData* pointer that the caller passed; a non-zero result asks it to stop. **GetThumbnailImageAbort** is the type of the callback of the **GetThumbnail** method of [**Image**](Image).

### EnumerateMetafileProc

**Function**( *recordType* As **GpEmfPlusRecordType**, *flags* As **Long**, *dataSize* As **Long**, *data* As **LongPtr**, *callbackData* As **LongPtr** ). Called once for each record by the methods of **Graphics** that enumerate a metafile; a result of **False** ends the enumeration. See [**Metafile**](Metafile).

## See Also

- [GdiPlusBase](GdiPlusBase) class -- **LastResult** and **Status**
- [GdiPlusUser](GdiPlusUser) class -- starts GDI+
- [Types](Types/) -- the types of the package
- [Effect](Effect) class -- the effects that **ApplyEffect** applies
- [Metafile](Metafile) class -- a picture stored as drawing commands
- [IBrush](IBrush) interface -- what **BrushFrom** returns
- [ImageCodec](ImageCodec) -- the image format and encoder IDs
