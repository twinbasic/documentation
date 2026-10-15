---
title: Bitmap
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Bitmap
---

# Bitmap class
{: .no_toc }

A raster picture that a program can draw on, read pixel by pixel, convert and filter.

A **Bitmap** inherits every member of [**Image**](Image): its size, resolution, pixel format, frames and properties. This page describes what it adds. A **Bitmap** is also what a [**Graphics**](Graphics) draws on when the drawing is meant to go to memory: `Graphics(bmp)` draws into `bmp`. The class mirrors the GDI+ [Bitmap](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusheaders/nl-gdiplusheaders-bitmap) class.

* TOC
{:toc}

## Creating

Syntax: *bmp* **= Bitmap**( *width*, *height* [ , *format* ] )

Syntax: *bmp* **= Bitmap**( *size* [ , *format* ] )

Syntax: *bmp* **= Bitmap**( *width*, *height*, *target* )

Syntax: *bmp* **= Bitmap**( *size*, *target* )

Syntax: *bmp* **= Bitmap**( *width*, *height*, *stride*, *format*, *scan0* )

Syntax: *bmp* **= Bitmap**( *size*, *stride*, *format*, *scan0* )

Syntax: *bmp* **= Bitmap**( *filename* [ , *useEmbeddedColorManagement* ] )

Syntax: *bmp* **= Bitmap**( *stream* [ , *useEmbeddedColorManagement* ] )

Syntax: *bmp* **= Bitmap**( *hbm*, *hpal* )

Syntax: *bmp* **= Bitmap**( *hicon* )

Syntax: *bmp* **= Bitmap**( *hInstance*, *bitmapName* )

Syntax: *bmp* **= Bitmap**( *surface* )

Syntax: *bmp* **= Bitmap**( *bi*, *data* )

Each form is also available as **New Bitmap**( ... ) with the same arguments.

*width*, *height*
: *required* **Single** values for the size in pixels. GDI+ truncates them to whole pixels.

*size*
: *required* A [**GpSizeF**](Types/GpSizeF) for the same.

*format*
: *optional* A [**PixelFormat**](Enumerations/PixelFormat). The default is **PixelFormat32bppARGB**.

*target*
: *required* A [**Graphics**](Graphics). The bitmap takes the resolution of that **Graphics**, and its pixel format is **PixelFormat32bppPARGB**.

*stride*, *scan0*
: *required* The bitmap does not allocate its pixels but uses the memory that starts at *scan0*, a **Byte** passed by reference. *stride* is the number of bytes from one row to the next and must be a multiple of 4. The memory must stay valid, and unmoved, for the life of the bitmap, and a change to it changes the bitmap.

*filename*, *stream*
: *required* A **String** naming an image file, or an **IStream** to read one from. The file is decoded into a bitmap. *useEmbeddedColorManagement* is *optional*, as for [**Image**](Image#creating).

*hbm*, *hpal*
: *required* The handle of a GDI bitmap, and of a palette (0 for none). The handle stays the property of the caller.

*hicon*
: *required* The handle of an icon.

*hInstance*, *bitmapName*
: *required* A module handle and the name of a bitmap resource in it.

*surface*, *bi*, *data*
: *required* A DirectDraw 7 surface, or a `BITMAPINFO` structure with the pixel data that belongs to it, for the two forms that read those.

A constructor that fails creates an unusable object whose **LastResult** tells why: a resource that does not exist gives **InvalidParameter**.

> [!WARNING] 0.9.45.0
> Two integer arguments do not create a bitmap of that size. `Bitmap(8, 6)` binds to the form that takes a GDI bitmap handle and a palette handle, treats 8 and 6 as handles, and returns an unusable object with **LastResult** 7 (**Win32Error**), without any error being raised. Pass **Single** values: `Bitmap(8!, 6!)`, or give a format, as in `Bitmap(8, 6, PixelFormat32bppARGB)`. The same goes for **New Bitmap**.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(8!, 6!)
Debug.Print bmp.LastResult & " " & bmp.Width & " " & bmp.Height & " " & Hex$(bmp.PixelFormat)

Dim wrong As Bitmap = Bitmap(8, 6)
Debug.Print wrong.LastResult & " " & wrong.Width

Dim rgb24 As Bitmap = Bitmap(GpSizeF(5, 4), PixelFormat24bppRGB)
Debug.Print rgb24.Width & " " & rgb24.Height & " " & Hex$(rgb24.PixelFormat)

Dim g As Graphics = Graphics(bmp)
Dim matching As Bitmap = Bitmap(5!, 6!, g)
Debug.Print Hex$(matching.PixelFormat)
' Output:
' 0 8 6 26200A
' 7 0
' 5 4 21808
' E200B
```

The memory form lets a program share its own pixel array with GDI+. The bytes of a 32-bit pixel are in the order blue, green, red, alpha.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim px(0 To 15) As Byte                          ' 2 x 2 pixels of 4 bytes
px(0) = &H44: px(1) = &H33: px(2) = &H22: px(3) = &HFF
Dim shared As Bitmap = Bitmap(2!, 2!, 8, PixelFormat32bppARGB, px(0))
Debug.Print Hex$(shared.Pixel(0, 0).argb)

px(0) = &H11                                     ' changes the bitmap too
Debug.Print Hex$(shared.Pixel(0, 0).argb)
' Output:
' FF223344
' FF223311
```

## Copying

### Clone

Syntax: *copy* **=** *bmp*.**Clone**( *rect*, *format* )

Syntax: *copy* **=** *bmp*.**Clone**( *x*, *y*, *width*, *height*, *format* )

*rect*
: *required* A [**GpRect**](Types/GpRect) or a [**GpRectF**](Types/GpRectF) naming the part of the bitmap to copy.

*x*, *y*, *width*, *height*
: *required* **Single** values for the same.

*format*
: *required* The [**PixelFormat**](Enumerations/PixelFormat) of the copy.

Returns a new **Bitmap** with the pixels of that part, converted to *format*. The rectangle must lie inside the bitmap. The copy does not share memory with the original.

> [!NOTE] 0.9.45.0
> The no-argument **Clone** of [**Image**](Image#clone) is hidden: `bmp.Clone()` on a **Bitmap** does not compile. Copy the whole bitmap by giving its rectangle.

### CloneI

Syntax: *copy* **=** *bmp*.**CloneI**( *x*, *y*, *width*, *height*, *format* )

The same with **Long** arguments.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(4!, 3!)
bmp.Pixel(1, 1) = Color(255, 60, 100, 7)

Dim part As Bitmap = bmp.CloneI(1, 1, 2, 2, PixelFormat24bppRGB)
Debug.Print part.Width & " " & part.Height & " " & Hex$(part.PixelFormat)
Debug.Print Hex$(part.Pixel(0, 0).argb)

Dim whole As Bitmap = bmp.Clone(GpRect(0, 0, 4, 3), PixelFormat32bppARGB)
Debug.Print Hex$(whole.Pixel(1, 1).argb)
' Output:
' 2 2 21808
' FF3C6407
' FF3C6407
```

## Pixels

### Pixel

Syntax: *c* **=** *bmp*.**Pixel**( *x*, *y* )

Syntax: *bmp*.**Pixel**( *x*, *y* ) **=** *c*

Gets or sets one pixel as a [**Color**](Types/Color). **Pixel** is the default member, so `bmp(x, y)` is the same. Coordinates count from 0 at the upper left corner. A pixel outside the bitmap fails with **InvalidParameter** and leaves the bitmap alone. In a bitmap with a palette, setting a pixel is not supported.

The call goes to GDI+ for every pixel. To read or write many, use [**LockBits**](#lockbits).

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(3!, 2!)
bmp.Pixel(2, 1) = Color(&H80, 1, 2, 3)
Debug.Print Hex$(bmp(2, 1).argb)
Debug.Print bmp.LastResult

Dim c As Color = bmp.Pixel(2, 1)
Debug.Print Hex$(c.A) & " " & Hex$(c.R) & " " & Hex$(c.G) & " " & Hex$(c.B)
' Output:
' 80010203
' 0
' 80 1 2 3
```

### LockBits

Syntax: *status* **=** *bmp*.**LockBits**( *rect*, *flags*, *format*, *lockedBitmapData* )

*rect*
: *required* A [**GpRect**](Types/GpRect) naming the part of the bitmap to lock.

*flags*
: *required* A **Long** that combines [**ImageLockMode**](Enumerations/ImageLockMode) values: **ImageLockModeRead**, **ImageLockModeWrite**, or both. Writes reach the bitmap only when it was locked with **ImageLockModeWrite**.

*format*
: *required* The [**PixelFormat**](Enumerations/PixelFormat) in which the program wants the pixels. GDI+ converts to it when the bitmap has another.

*lockedBitmapData*
: *required* A [**BitmapData**](Types/BitmapData) that receives the size, stride, format and the address of the first pixel.

Locks the rectangle in memory and fills in *lockedBitmapData*. The pixels are rows of **Stride** bytes that start at **Scan0**; with a 32-bit format each pixel is four bytes in the order blue, green, red, alpha, which is also the byte order of a **Long** holding `&HAARRGGBB`. Every lock must be paired with [**UnlockBits**](#unlockbits), and the bitmap cannot be drawn on or locked again in between.

### UnlockBits

Syntax: *status* **=** *bmp*.**UnlockBits**( *lockedBitmapData* )

Unlocks what **LockBits** locked and, for a lock with **ImageLockModeWrite**, copies the program's changes into the bitmap.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(4!, 3!)
bmp.Pixel(0, 0) = Color(255, 0, 0, 7)

Dim bd As BitmapData
Debug.Print bmp.LockBits(GpRect(0, 0, 4, 3), ImageLockModeRead Or ImageLockModeWrite, PixelFormat32bppARGB, bd)
Debug.Print bd.Width & " " & bd.Height & " " & bd.Stride & " " & Hex$(bd.PixelFormat)

Dim v As Long
GetMem4 bd.Scan0, v                       ' the first pixel
Debug.Print Hex$(v)
PutMem4 bd.Scan0, &HFF112233             ' red 11, green 22... as &HAARRGGBB
Debug.Print bmp.UnlockBits(bd)
Debug.Print Hex$(bmp.Pixel(0, 0).argb)
' Output:
' 0
' 4 3 16 26200A
' FF000007
' 0
' FF112233
```

## Converting

### ConvertFormat

Syntax: *status* **=** *bmp*.**ConvertFormat**( *format*, *ditherType*, *paletteType*, *palette*, *alphaThresholdPercent* )

*format*
: *required* The [**PixelFormat**](Enumerations/PixelFormat) to convert to.

*ditherType*
: *required* A [**DitherType**](Enumerations/DitherType) for a conversion to a format with fewer colours.

*paletteType*
: *required* A [**PaletteType**](Enumerations/PaletteType) for a conversion to an indexed format.

*palette*
: *required* A [**ColorPalette**](Types/ColorPalette) that supplies the colours when *paletteType* is **PaletteTypeCustom**, and receives them for some other types.

*alphaThresholdPercent*
: *required* A **Single** from 0 to 100: the alpha value, in percent, below which a pixel becomes transparent in a format that has only on-off transparency.

Converts the bitmap itself, in place, to the new pixel format. It needs GDI+ 1.1 (Windows 7 or later). A conversion that GDI+ refuses returns an error and leaves the bitmap as it was.

> [!NOTE] 0.9.45.0
> The fixed palette types, such as **PaletteTypeFixedBW**, need a *palette* that GDI+ has prepared. A blank [**ColorPalette**](Types/ColorPalette) makes the call fail with **InvalidParameter**. A palette that the program fills in itself works with **PaletteTypeCustom**, as below.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(4!, 4!)
Dim g As Graphics = Graphics(bmp)
g.Clear(Color(255, 255, 255, 255))
bmp.Pixel(0, 0) = Color(255, 0, 0, 0)

Dim pal As ColorPalette
pal.flags = PaletteFlagsGrayScale
pal.count = 2
pal.entries(0) = &HFF000000
pal.entries(1) = &HFFFFFFFF

Debug.Print bmp.ConvertFormat(PixelFormat1bppIndexed, DitherTypeSolid, PaletteTypeCustom, pal, 0!)
Debug.Print Hex$(bmp.PixelFormat)
Debug.Print bmp.PaletteSize
' Output:
' 0
' 30101
' 16
```

### ApplyEffect

Syntax: *status* **=** *bmp*.**ApplyEffect**( *effect*, *roi* )

*effect*
: *required* An [**Effect**](Effect) such as a [**Blur**](Blur).

*roi*
: *required* A [**GpRect**](Types/GpRect): the part of the bitmap the effect changes.

Applies the effect to the pixels in *roi*, in place. It needs GDI+ 1.1 (Windows 7 or later). The effect keeps the auxiliary data that GDI+ returns, if any, in [**AuxData**](Effect#auxdata).

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(8!, 8!)
Dim g As Graphics = Graphics(bmp)
g.Clear(Color(255, 200, 100, 50))

Debug.Print bmp.ApplyEffect(BrightnessContrast(50, 0), GpRect(0, 0, 8, 8))
Debug.Print Hex$(bmp.Pixel(4, 4).argb)
' Output:
' 0
' FFFA9664
```

### GetHistogram

Syntax: *h* **=** *bmp*.**GetHistogram**( *format* )

Syntax: *status* **=** *bmp*.**GetHistogram**( *format*, *h*( ) )

*format*
: *required* A [**HistogramFormat**](Enumerations/HistogramFormat) naming the channels to count.

Returns the number of pixels for each value of each channel as a two-dimensional array of **UINT**: the first index runs from 1 to 256 (value + 1), the second from 1 to 4 for the four channels. With **HistogramFormatARGB** the channels are, in order, alpha, red, green and blue. The second form fills an array the program passes. It needs GDI+ 1.1.

### HistogramSize

Syntax: *n* **=** *bmp*.**HistogramSize**( *format* )

Returns the number of entries in the histogram of that format, which is 256 for the formats tested.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(8!, 8!)
Dim g As Graphics = Graphics(bmp)
g.Clear(Color(255, 10, 20, 30))

Dim h() As UINT = bmp.GetHistogram(HistogramFormatARGB)
Debug.Print UBound(h, 1) & " " & UBound(h, 2) & " " & bmp.HistogramSize(HistogramFormatARGB)
Debug.Print h(256, 1) & " " & h(11, 2) & " " & h(21, 3) & " " & h(31, 4)    ' 64 pixels each
' Output:
' 256 4 256
' 64 64 64 64
```

### SetResolution

Syntax: *status* **=** *bmp*.**SetResolution**( *xDpi*, *yDpi* )

Sets the resolution in dots per inch, as **Long** values. The pixels are not changed. The resolution decides how big the bitmap is when it is drawn in a physical unit.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(10!, 10!)
Debug.Print bmp.SetResolution(300, 150)
Debug.Print bmp.HorizontalResolution & " " & bmp.VerticalResolution
' Output:
' 0
' 300 150
```

## GDI interoperability

### GetHBitmap

Syntax: *status* **=** *bmp*.**GetHBitmap**( *background*, *hbm* )

*background*
: *required* A **Color**. Pixels that are not opaque are blended with it, because a GDI bitmap has no alpha channel.

*hbm*
: *required* A **LongPtr** that receives the handle of a new GDI bitmap.

The program owns the handle and must release it with the GDI function `DeleteObject`.

### GetHIcon

Syntax: *status* **=** *bmp*.**GetHIcon**( *hIcon* )

*hIcon*
: *required* A **LongPtr** that receives the handle of a new icon.

The program must release the handle with the Windows function `DestroyIcon`.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(8!, 8!)
Dim g As Graphics = Graphics(bmp)
g.Clear(Color(&H80, 10, 20, 30))             ' half transparent

Dim hbm As LongPtr
Debug.Print bmp.GetHBitmap(Color(255, 255, 255, 255), hbm)
Dim flat As Bitmap = Bitmap(hbm, 0)         ' blended with white
Debug.Print Hex$(flat.Pixel(1, 1).argb)
' Output:
' 0
' FF84898E
```

## Saving

A bitmap saves with [**Image.Save**](Image#save), **SaveAdd** and **SaveAddImage**, which a **Bitmap** inherits.

> [!WARNING] 0.9.45.0
> **Save** does not work with the encoder parameter array that it requires: the call returns **InvalidParameter** and leaves an empty file for an array of one element, ignores the parameters for a longer one in a 64-bit program, and stops a 32-bit program. The warning at [**Image.Save**](Image#save) gives the details.

A picture can still be saved without parameters by passing a GDI bitmap made with [**GetHBitmap**](#gethbitmap) to GDI+ and calling its save function directly. The module below does that for a PNG. It flattens the picture over white, because the intermediate GDI bitmap has no alpha channel.

```tb check_build slot=file projname=gdiplus-bitmap-save
Module PngSaver
    Private Declare PtrSafe Function FromHBitmap Lib "gdiplus" Alias "GdipCreateBitmapFromHBITMAP" (ByVal hbm As LongPtr, ByVal hpal As LongPtr, nb As LongPtr) As Long
    Private Declare PtrSafe Function SaveImage Lib "gdiplus" Alias "GdipSaveImageToFile" (ByVal img As LongPtr, ByVal path As LongPtr, clsid As GDIP_UUID, ByVal ep As LongPtr) As Long
    Private Declare PtrSafe Function DisposeImage Lib "gdiplus" Alias "GdipDisposeImage" (ByVal img As LongPtr) As Long
    Private Declare PtrSafe Function DeleteObject Lib "gdi32" (ByVal h As LongPtr) As Long
    Private Declare PtrSafe Function CreateDirectoryW Lib "kernel32" (ByVal path As LongPtr, ByVal sa As LongPtr) As Long

    Public Sub MakeDir(ByVal folder As String)
        CreateDirectoryW StrPtr(folder), 0
    End Sub

    ' Returns 0 when the file was written.
    Public Function SavePng(bmp As Bitmap, ByVal path As String) As Long
        Dim hbm As LongPtr, native As LongPtr
        bmp.GetHBitmap Color(255, 255, 255, 255), hbm
        Dim st As Long = FromHBitmap(hbm, 0, native)
        If st = 0 Then
            Dim clsid As GDIP_UUID = ImageCodecPNG()
            st = SaveImage(native, StrPtr(path), clsid, 0)
            DisposeImage native
        End If
        DeleteObject hbm
        Return st
    End Function
End Module
```

The picture can then be loaded again as a **Bitmap**, with the pixels as they were drawn.

```tb check_build check_run projname=gdiplus-bitmap-save
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(16!, 8!)
Dim g As Graphics = Graphics(bmp)
g.Clear(Color(255, 200, 100, 50))

Dim dir As String = Environ$("TEMP") & "\tbdocs-gdiplus-bitmap"
PngSaver.MakeDir dir
Dim path As String = dir & "\sample.png"
Debug.Print PngSaver.SavePng(bmp, path)

Dim loaded As Bitmap = Bitmap(path)
Debug.Print loaded.LastResult & " " & loaded.Width & " " & loaded.Height
Debug.Print Hex$(loaded.Pixel(3, 3).argb)
' Output:
' 0
' 0 16 8
' FFC86432
```

## Example

The example draws a gradient of grays, makes a copy that is converted to 24 bits, and reads pixels through the default member.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(4!, 1!)
Dim x As Long
For x = 0 To 3
    bmp(x, 0) = Color(255, x * 80, x * 80, x * 80)
Next

Dim small As Bitmap = bmp.CloneI(1, 0, 2, 1, PixelFormat24bppRGB)
Debug.Print small.Width
Debug.Print Hex$(small(0, 0).argb) & " " & Hex$(small(1, 0).argb)
' Output:
' 2
' FF505050 FFA0A0A0
```

## See Also

- [Bitmap](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusheaders/nl-gdiplusheaders-bitmap) -- Microsoft's documentation of the GDI+ class
- [Image](Image) class
- [Graphics](Graphics) class
- [CachedBitmap](CachedBitmap) class
- [Effect](Effect) class
- [BitmapData](Types/BitmapData) type
- [ColorPalette](Types/ColorPalette) type
