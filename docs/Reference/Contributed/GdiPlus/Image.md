---
title: Image
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Image
---

# Image class
{: .no_toc }

The base class of [**Bitmap**](Bitmap) and [**Metafile**](Metafile): a picture loaded from a file or a stream, with its size, resolution, pixel format and properties.

An **Image** holds either raster data or a recorded sequence of drawing commands. [**Bitmap**](Bitmap) and [**Metafile**](Metafile) inherit every member described here and add the members that work on one kind of picture. A program creates an **Image** directly to load a file whose kind it does not know, and uses [**Type**](#type) to find out which kind it got. The class mirrors the GDI+ [Image](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusheaders/nl-gdiplusheaders-image) class.

* TOC
{:toc}

<!-- test: compile ImBareNewImageTakesNoArguments, compile ImBareImageHasTheVbMembers, compile ImQualifiedImageHasNoVbMembers, compile ImQualifiedNewCompiles, compile ImQualifiedFunctionCompiles, Im_ImageTests.BareImage_FunctionWorksUnqualified, Im_ImageTests.BareImage_VariableCannotHoldABitmap -->
> [!NOTE] 0.9.45.0
> A project that references the **VB** package (every default project does) also has a VB control class named **Image**. A bare `Image` as a type, as in `Dim img As Image`, means the VB class: `New Image(filename)` does not compile, because the VB class takes no arguments, and assigning a [**Bitmap**](Bitmap) to such a variable raises error -2147467262 (*No such interface supported*) at run time. Write `GdiPlus.Image` for the type, as the samples on this page do. The function **Image**( *filename* ) works without the prefix. [**Bitmap**](Bitmap) and [**Metafile**](Metafile) have no such clash.

```tb check_build hidden
Module ImagePageSaver
    Private Declare PtrSafe Function ZFromHBitmap Lib "gdiplus" Alias "GdipCreateBitmapFromHBITMAP" (ByVal hbm As LongPtr, ByVal hpal As LongPtr, nb As LongPtr) As Long
    Private Declare PtrSafe Function ZSaveImage Lib "gdiplus" Alias "GdipSaveImageToFile" (ByVal img As LongPtr, ByVal path As LongPtr, clsid As GDIP_UUID, ByVal ep As LongPtr) As Long
    Private Declare PtrSafe Function ZDispose Lib "gdiplus" Alias "GdipDisposeImage" (ByVal img As LongPtr) As Long
    Private Declare PtrSafe Function DeleteObject Lib "gdi32" (ByVal h As LongPtr) As Long
    Private Declare PtrSafe Function CreateDirectoryW Lib "kernel32" (ByVal path As LongPtr, ByVal sa As LongPtr) As Long

    Public Sub MakeDir(ByVal p As String)
        CreateDirectoryW StrPtr(p), 0
    End Sub

    Public Function SavePng(bmp As Bitmap, ByVal path As String) As Long
        Dim hbm As LongPtr, nb As LongPtr
        bmp.GetHBitmap Color(255, 255, 255, 255), hbm
        Dim st As Long = ZFromHBitmap(hbm, 0, nb)
        If st = 0 Then
            Dim clsid As GDIP_UUID = ImageCodecPNG()
            st = ZSaveImage(nb, StrPtr(path), clsid, 0)
            ZDispose nb
        End If
        DeleteObject hbm
        Return st
    End Function
End Module
```

## Creating

Syntax: *img* **= GdiPlus.Image**( *filename* [ , *useEmbeddedColorManagement* ] )

Syntax: *img* **= New GdiPlus.Image**( *filename* [ , *useEmbeddedColorManagement* ] )

Syntax: *img* **= GdiPlus.Image**( *stream* [ , *useEmbeddedColorManagement* ] )

Syntax: *img* **= GdiPlus.FromFile**( *filename* [ , *useEmbeddedColorManagement* ] )

*filename*
: *required* A **String** naming an image file. GDI+ decodes the formats that [**ImageCodec**](ImageCodec) lists, and metafiles. The file stays open until the **Image** is released.

*stream*
: *required* An **IStream** to read the picture from.

*useEmbeddedColorManagement*
: *optional* A **Boolean**. **True** applies the colour profile stored in the file. The default is **False**.

The three forms with the same name are one thing: the function creates the object with the same arguments as **New**. **FromFile** is another name for the function. A constructor that fails creates an unusable object whose **LastResult** tells why. Loading a missing file gives **OutOfMemory**, which is how GDI+ reports a file it cannot open.

An **Image** that holds a bitmap is not a [**Bitmap**](Bitmap): it has no pixel access. To read or change pixels, load the file with [**Bitmap**](Bitmap#creating) instead.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(16!, 8!)
Dim g As Graphics = Graphics(bmp)
g.Clear(Color(255, 200, 100, 50))

Dim dir As String = Environ$("TEMP") & "\tbdocs-gdiplus-image"
ImagePageSaver.MakeDir dir
Dim path As String = dir & "\sample.png"
Debug.Print ImagePageSaver.SavePng(bmp, path)

Dim img As GdiPlus.Image = GdiPlus.Image(path)
Debug.Print img.LastResult & " " & img.Width & " " & img.Height & " " & img.Type

Dim missing As GdiPlus.Image = GdiPlus.Image(dir & "\no-such-file.png")
Debug.Print missing.LastResult
' Output:
' 0
' 0 16 8 1
' 3
```

### Clone

Syntax: *copy* **=** *img*.**Clone**( )

Returns a new **Image** that holds a copy of the picture. The copy is an **Image**, even when the original is a [**Bitmap**](Bitmap) or a [**Metafile**](Metafile).

<!-- test: compile ImBitmapCloneWithoutArguments, compile ImImageCloneWithoutArguments, Im_ImageTests.Clone_OfABitmapIsAnImage, Im_ImageTests.Clone_WholeBitmapWithItsRectangle -->
> [!NOTE] 0.9.45.0
> [**Bitmap**](Bitmap#clone) and [**Metafile**](Metafile) declare their own **Clone**, and on a **Bitmap** the no-argument form is not available: the call does not compile. To copy a whole **Bitmap**, use [**Bitmap.Clone**](Bitmap#clone) with the full rectangle.

## Saving

Save writes the picture to a file or a stream with one of the encoders listed by [**ImageCodec**](ImageCodec). *clsidEncoder* is the class ID of the encoder: [**ImageCodecPNG**](ImageCodec#image-codec-ids), **ImageCodecJPG** and the others are functions that return it.

### Save

Syntax: *status* **=** *img*.**Save**( *filename*, *clsidEncoder*, *encoderParams*( ) )

Syntax: *status* **=** *img*.**Save**( *stream*, *clsidEncoder*, *encoderParams*( ) )

*filename*
: *required* A **String** naming the file to write. An existing file is replaced.

*stream*
: *required* An **IStream** to write to.

*clsidEncoder*
: *required* The class ID of the encoder, which also selects the file format.

*encoderParams*
: *required* An array of [**GpEncoderParameter**](Types/GpEncoderParameter). The call expects its lower bound to be 0, and element 0 to be a dummy that is not filled in; the parameters follow from element 1. In a 64-bit program, any other lower bound returns **InvalidParameter**.

<!-- test: Im_ImageTests.Save_EmptyParameterArrayWritesFile, Im_ImageTests.Save_JpegQualityChangesFileSize, Im_ImageTests.Save_ParameterArrayStartingAtOneIsRefused, Im_ImageTests.SaveAdd_MultiFrameTiffHasTwoFrames -->
> [!WARNING] 0.9.45.0
> **Save** does not work with an encoder parameter array. The call stores the parameter count in memory that lies before the array, and gives GDI+ a pointer to that place, so GDI+ reads its parameters from memory the array does not own. In 32-bit programs every call with a parameter array raises an access violation and the program stops. In 64-bit programs, with `Dim ep(0 To 0) As GpEncoderParameter` the call returns **InvalidParameter** and leaves an empty file, and with a longer array it returns **Ok** while GDI+ ignores the parameters (a JPEG saved with a quality of 10 has the same size as one saved with 100). **SaveAdd** and **SaveAddImage** build their argument in the same way: after such a **Save** in a 64-bit program they return **Win32Error**, and no frame is added. [**Bitmap**](Bitmap#saving) shows how to write a PNG without calling **Save**.

### SaveAdd

Syntax: *status* **=** *img*.**SaveAdd**( *encoderParams*( ) )

Syntax: *status* **=** *img*.**SaveAddImage**( *newImage*, *encoderParams*( ) )

Adds a frame to a file that an earlier **Save** started with the `EncoderSaveFlag` parameter set to multi-frame. **SaveAdd** adds the frame of the picture itself; **SaveAddImage** adds the frame of *newImage*, an **Image**. Both take *encoderParams* as **Save** does, and are subject to the same warning.

## Size and format

### Type

Syntax: *t* **=** *img*.**Type**

Returns a [**GpImageType**](Enumerations/GpImageType): **ImageTypeBitmap** for raster data and **ImageTypeMetafile** for a recording. The property is read-only.

### Width, Height, Size

Syntax: *w* **=** *img*.**Width**

Syntax: *h* **=** *img*.**Height**

Syntax: *s* **=** *img*.**Size**

**Width** and **Height** return the size in pixels as a **Long**. **Size** returns both in a [**GpSize**](Types/GpSize). For a metafile the numbers are the size of the bounds in device units.

### Dimension

Syntax: *d* **=** *img*.**Dimension**

Returns the width and height as a [**GpSizeF**](Types/GpSizeF) in the unit of the picture, which for a bitmap is the pixel and for a metafile depends on its frame.

### Bounds

Syntax: *r* **=** *img*.**Bounds**( *srcUnit* )

*srcUnit*
: *required* A [**GpUnit**](Enumerations/GpUnit) giving the unit of the returned rectangle.

Returns a [**GpRectF**](Types/GpRectF) whose upper left corner is (0, 0) for a bitmap and whose size is the size of the picture in *srcUnit*.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(8!, 6!)
Debug.Print bmp.Type & " " & bmp.Width & " " & bmp.Height
Debug.Print bmp.Size.Width & " " & bmp.Size.Height
Debug.Print bmp.Dimension.Width & " " & bmp.Dimension.Height

Dim b As GpRectF = bmp.Bounds(UnitPixel)
Debug.Print b.X & " " & b.Y & " " & b.Width & " " & b.Height
' Output:
' 1 8 6
' 8 6
' 8 6
' 0 0 8 6
```

### HorizontalResolution, VerticalResolution

Syntax: *dpi* **=** *img*.**HorizontalResolution**

Syntax: *dpi* **=** *img*.**VerticalResolution**

Return the resolution in dots per inch as a **Single**. A new bitmap takes the resolution of the screen, so the number differs between machines. Set it with [**Bitmap.SetResolution**](Bitmap#setresolution).

### PixelFormat

Syntax: *fmt* **=** *img*.**PixelFormat**

Returns the [**PixelFormat**](Enumerations/PixelFormat) of the picture. A bitmap created without a format has **PixelFormat32bppARGB**.

### Flags

Syntax: *flags* **=** *img*.**Flags**

Returns a combination of [**ImageFlags**](Enumerations/ImageFlags) values as a **Long**: whether the picture scales, has alpha or translucent pixels, its colour space and whether its resolution and size come from the file.

### RawFormat

Syntax: *id* **=** *img*.**RawFormat**

Returns the class ID of the file format the picture was loaded from, as a **UUID**. Compare it with the values that the [format functions](ImageCodec#image-format-ids) return, such as **ImageFormatPNG**. A picture created in memory has **ImageFormatMemoryBMP**.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(4!, 4!)
Debug.Print Hex$(bmp.PixelFormat)
Debug.Print Hex$(bmp.Flags)
Debug.Print bmp.RawFormat.Data1 = ImageFormatMemoryBMP().Data1
' Output:
' 26200A
' 2
' True
```

## Palette

### PaletteSize

Syntax: *n* **=** *img*.**PaletteSize**

Returns the size in bytes of the colour palette of the picture, which is 0 or a small header for a picture without a palette and 1032 for a bitmap in the **PixelFormat8bppIndexed** format.

### Palette

Syntax: *pal* **=** *img*.**Palette**

Syntax: *img*.**Palette** **=** *pal*

The getter is meant to return the palette as an array of [**ColorPalette**](Types/ColorPalette), and the setter to take one.

<!-- test: Im_ZStackTests.Palette_GetReturnsThePalette, Im_ImageTests.Palette_LetChangesThePicture -->
> [!WARNING] 0.9.45.0
> Reading **Palette** overflows the stack, in 32-bit and 64-bit programs, and the process stops. The setter calls the GDI+ function that reads a palette, not the one that writes it, and so does not change the picture. To get a palette, use [**ImageAttributes.GetAdjustedPalette**](ImageAttributes#getadjustedpalette) or fill a [**ColorPalette**](Types/ColorPalette) yourself, and give it to [**Bitmap.ConvertFormat**](Bitmap#convertformat).

## Thumbnails

### GetThumbnail

Syntax: *thumb* **=** *img*.**GetThumbnail**( *thumbSize* [ , *callback* [ , *callbackData* ] ] )

Syntax: *thumb* **=** *img*.**GetThumbnail**( *thumbWidth*, *thumbHeight* [ , *callback* [ , *callbackData* ] ] )

*thumbSize*
: *required* A [**GpSize**](Types/GpSize) with the size of the thumbnail in pixels.

*thumbWidth*, *thumbHeight*
: *required* **Long** values for the same size.

*callback*
: *optional* A callback that GDI+ can call to ask whether it should stop. Omit it.

*callbackData*
: *optional* A pointer passed to *callback*. The default is 0.

Returns a new **Image** of the requested size, or **Nothing** when the call fails. The thumbnail is the embedded one when the file has one, and a scaled copy of the picture otherwise.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(40!, 20!)
Dim thumb As GdiPlus.Image = bmp.GetThumbnail(10, 5)
Debug.Print bmp.LastResult & " " & thumb.Width & " " & thumb.Height
' Output:
' 0 10 5
```

## Frames

An image file can hold several frames, such as the pages of a TIFF or the pictures of an animated GIF. Frames are grouped in dimensions; the identifiers are the functions [**FrameDimensionTime**, **FrameDimensionPage** and **FrameDimensionResolution**](ImageCodec#frame-dimension-ids).

### FrameDimensionsCount

Syntax: *n* **=** *img*.**FrameDimensionsCount**

Returns the number of frame dimensions the picture has. A bitmap created in memory has one: the page dimension.

### GetFrameDimensionsList

Syntax: *ids* **=** *img*.**GetFrameDimensionsList**( )

Returns the class IDs of the frame dimensions as an array of **UUID** that starts at 1.

### FrameCount

Syntax: *n* **=** *img*.**FrameCount**( *dimensionID* )

*dimensionID*
: *required* The class ID of a frame dimension, such as **FrameDimensionPage**( ).

Returns the number of frames in that dimension.

### SelectActiveFrame

Syntax: *status* **=** *img*.**SelectActiveFrame**( *dimensionID*, *frameIndex* )

*dimensionID*
: *required* The class ID of a frame dimension.

*frameIndex*
: *required* The index of the frame to select, counted from 0.

Makes the frame the one that drawing and the size properties use.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(4!, 4!)
Debug.Print bmp.FrameDimensionsCount
Debug.Print bmp.FrameCount(FrameDimensionPage())
Debug.Print bmp.GetFrameDimensionsList()(1).Data1 = FrameDimensionPage().Data1
Debug.Print bmp.SelectActiveFrame(FrameDimensionPage(), 0)
' Output:
' 1
' 1
' True
' 0
```

### RotateFlip

Syntax: *status* **=** *img*.**RotateFlip**( *rotateFlipType* )

*rotateFlipType*
: *required* A [**RotateFlipType**](Enumerations/RotateFlipType) giving a rotation, a flip, or both. The picture is rotated first.

Rotates and flips the picture in place. A rotation is clockwise. After a rotation by 90 or 270 degrees the width and height are exchanged.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(4!, 3!)
bmp.Pixel(0, 0) = Color(255, 255, 0, 0)       ' upper left corner
bmp.RotateFlip Rotate90FlipNone
Debug.Print bmp.Width & " " & bmp.Height
Debug.Print Hex$(bmp.Pixel(2, 0).argb)        ' the red pixel is now at the upper right
bmp.RotateFlip Rotate270FlipNone
bmp.RotateFlip RotateNoneFlipX
Debug.Print Hex$(bmp.Pixel(3, 0).argb)        ' flipped across the vertical axis
' Output:
' 3 4
' FFFF0000
' FFFF0000
```

## Properties of a file

An image file can hold named properties: the camera model of a photograph, the time it was taken, the delay of a GIF frame. Each has a numeric ID, and the [`PropertyTag...` constants](Helpers#property-tag-ids) of the package name the IDs of the common ones. A property is a [**GpPropertyItem**](Types/GpPropertyItem).

### PropertyCount

Syntax: *n* **=** *img*.**PropertyCount**

Returns the number of properties the picture has.

### PropertyIdList

Syntax: *ids* **=** *img*.**PropertyIdList**

Returns the IDs of the properties as an array of **Long** that starts at 1.

### PropertyItem

Syntax: *items* **=** *img*.**PropertyItem**( *propId* )

Syntax: *img*.**PropertyItem** **=** *item*

The getter returns the property with the ID *propId* as an array of [**GpPropertyItem**](Types/GpPropertyItem) that holds one element, at index 1. The setter takes one **GpPropertyItem** and sets that property on the picture, adding it when it is not there. Its [**Id**](Types/GpPropertyItem), type, length and the address of its value must be filled in.

<!-- test: Im_ImageTests.PropertyItem_PropertyOfTheReturnedElement, Im_ImageTests.PropertyItem_GetReturnsTheItem, Im_ImageTests.GetAllPropertyItems_ReturnsEveryItem, Im_ImageTests.PropertyItem_RemoveTakesTheItemAway -->
> [!WARNING] BETA 1005
> A property of an element of the array that **PropertyItem** returns, such as `items(1).TheASCII`, stops the process with an access violation, as it does for an element of any array of a user-defined type. An element can be read as a whole or by a field: `items(1).Id` works, and so does `Dim got As GpPropertyItem = items(1)` followed by `got.TheASCII`. **GetAllPropertyItems** returns its array in the same way, and the same holds for it. The setter, **PropertyCount**, **PropertyIdList** and **RemovePropertyItem** work.

### RemovePropertyItem

Syntax: *status* **=** *img*.**RemovePropertyItem**( *propId* )

Removes the property with that ID.

### GetAllPropertyItems

Syntax: *items* **=** *img*.**GetAllPropertyItems**( )

Returns all properties as an array of [**GpPropertyItem**](Types/GpPropertyItem). See the warning under **PropertyItem**.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(4!, 4!)
Dim text() As Byte = StrConv("A test picture" & vbNullChar, vbFromUnicode)

Dim item As GpPropertyItem
item.Id = PropertyTagImageDescription
item._type = PropertyTagTypeASCII
item._length = UBound(text) + 1
item._address = VarPtr(text(0))
bmp.PropertyItem = item
Debug.Print bmp.LastResult & " " & bmp.PropertyCount
Debug.Print Hex$(bmp.PropertyIdList()(1))

Debug.Print bmp.RemovePropertyItem(PropertyTagImageDescription)
Debug.Print bmp.PropertyCount
' Output:
' 0 1
' 10E
' 0
' 0
```

### GetEncoderParameterList

Syntax: *params* **=** *img*.**GetEncoderParameterList**( *clsidEncoder* )

Returns the parameters that the encoder with the class ID *clsidEncoder* accepts for this picture, as an array of [**GpEncoderParameter**](Types/GpEncoderParameter).

<!-- test: Im_ImageTests.GetEncoderParameterList_JpegListsTheQuality -->
> [!WARNING] 0.9.45.0
> **GetEncoderParameterList** stops the process with an access violation in 32-bit and 64-bit programs. The call hands GDI+ the address of a temporary variable in place of the buffer, so GDI+ overwrites the stack.

## Items of image data

Some formats store data beside the pixels. **FindFirstItem**, **FindNextItem** and **GetItemData** enumerate and read it, with a [**GpImageItemData**](Types/GpImageItemData) in an array of one element. These members need GDI+ 1.1 and Windows 7 or later, and only the codecs that provide such data return any. The array is built as for **PropertyItem**, and the warning under it applies.

### FindFirstItem

Syntax: *item* **=** *img*.**FindFirstItem**( )

### FindNextItem

Syntax: *item* **=** *img*.**FindNextItem**( )

### GetItemData

Syntax: *status* **=** *img*.**GetItemData**( *item*( ) )

**FindFirstItem** and **FindNextItem** return the first and the following item as an array of one [**GpImageItemData**](Types/GpImageItemData). **GetItemData** reads the data of the item in the array that is passed to it.

### SetAbort

Syntax: *status* **=** *img*.**SetAbort**( *pIAbort* )

GDI+ declares this function, but does not implement it in versions 1.0 and 1.1: it does nothing useful. The argument is a **GdiPlusAbort** object.

## Example

The example makes a small picture, rotates and flips it, and reads the results back.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(6!, 2!)
Dim g As Graphics = Graphics(bmp)
g.Clear(Color(255, 255, 255, 255))
bmp.Pixel(0, 0) = Color(255, 0, 0, 255)

Dim copy As GdiPlus.Image = bmp
Debug.Print copy.Width & "x" & copy.Height & " " & copy.Type

bmp.RotateFlip Rotate180FlipNone
Debug.Print Hex$(bmp.Pixel(5, 1).argb)
' Output:
' 6x2 1
' FF0000FF
```

## See Also

- [Image](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusheaders/nl-gdiplusheaders-image) -- Microsoft's documentation of the GDI+ class
- [Bitmap](Bitmap) class
- [Metafile](Metafile) class
- [ImageAttributes](ImageAttributes) class
- [ImageCodec](ImageCodec) -- encoders, decoders and the identifiers they use
- [GpPropertyItem](Types/GpPropertyItem) type
- [GpEncoderParameter](Types/GpEncoderParameter) type
