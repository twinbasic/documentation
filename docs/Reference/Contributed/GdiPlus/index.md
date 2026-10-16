---
title: GdiPlus Package
parent: Experimental Packages
has_toc: false
indexed_from: 0.9.45.0
permalink: /tB/Packages/Contributed/GdiPlus/
exclude_from_docs:
  - ModMain
  - TypesTest
  - GpGraphics
  - GpPath
  - GpPathIterator
  - GpRegion
  - GpMatrix
  - GpPen
  - GpBrush
  - GpSolidFill
  - GpHatch
  - GpLineGradient
  - GpPathGradient
  - GpTexture
  - GpCustomLineCap
  - GpArrowCap
  - GpFont
  - GpFontFamily
  - GpFontCollection
  - GpInstalledFontCollection
  - GpPrivateFontCollection
  - GpStringFormat
  - GpImage
  - GpBitmap
  - GpMetafile
  - GpCachedBitmap
  - GpImageAttributes
  - GpEffect
  - GpToken
  - GpMarkerPath
  - GpSubPathPath
  - GpPathData
  - GpEncoderParametersHeader
  - GDIP_BITMAPINFO
  - GDIP_BITMAPINFOHEADER
  - GDIP_BOOL
  - GDIP_ENHMETAHEADER3
  - GDIP_FontWeight
  - GDIP_GDI_BITMAP_COMPRESSION
  - GDIP_IDirectDrawSurface7
  - GDIP_IStream
  - GDIP_LOGFONTA
  - GDIP_LOGFONTW
  - GDIP_METAHEADER
  - GDIP_POINT
  - GDIP_RECT
  - GDIP_RECTF
  - GDIP_SIZE
  - GDIP_UUID
  - GDIPDEF_UUID
  - GdipArrowCap
  - GdipBitmap
  - GdipBrush
  - GdipCachedBitmap
  - GdipColor
  - GdipColorMatrix
  - GdipEffects
  - GdipEnums
  - GdipFont
  - GdipFontCollection
  - GdipFontFamily
  - GdipGdiPlusUser
  - GdipGraphics
  - GdipGraphicsPath
  - GdipHatch
  - GdipImage
  - GdipImageAttributes
  - GdipImageCodec
  - GdipImaging
  - GdipInstalledFontCollection
  - GdipLineCap
  - GdipLineGradient
  - GdipMatrix
  - GdipMetaHeader
  - GdipMetafile
  - GdipModule
  - GdipPathData
  - GdipPathGradient
  - GdipPathIterator
  - GdipPen
  - GdipPixelFormats
  - GdipPlatform
  - GdipPrivateFontCollection
  - GdipRegion
  - GdipSolidBrush
  - GdipStringFormat
  - GdipTexture
  - GdipVBGraphics
  - Native
  - Types
---

# GdiPlus Package
{: .no_toc }

**Author:** Sunderland Ober Consulting. **Version:** 0.9.45.0. **On GitHub:** [KubaO/GdiPlus](https://github.com/KubaO/GdiPlus), in the folder *GdiPlus*.

The **GdiPlus** contributed package is a twinBASIC interface to Windows GDI+: classes for drawing lines, shapes, text and images on a device context, a window or a bitmap, with pens, brushes, fonts, paths, regions and transformations.

GDI+ is the graphics library of Windows from Windows XP on. Where the older GDI draws in whole pixels with a few fixed colours, GDI+ draws with floating-point coordinates, antialiasing, colours that have an alpha (opacity) channel, gradients, and transformations of the whole drawing surface. The package wraps the flat functions of the GDI+ library in classes that follow the C++ classes Microsoft publishes with GDI+: a [**Graphics**](Graphics) object draws, a [**Pen**](Pen) or a brush such as [**SolidBrush**](SolidBrush) says how, a [**Bitmap**](Bitmap) holds the pixels. Each class page here links to the Microsoft page of the class it follows. This section documents version 0.9.45.0, published under the MIT licence.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(64!, 64!)
Dim g As Graphics = Graphics(bmp)
g.Clear(Color(255, 255, 255, 255))
g.FillRectangle SolidBrush(Color(255, 0, 128, 255)), 0, 0, 32, 32
Debug.Print Hex$(bmp.Pixel(10, 10).argb)
Debug.Print Hex$(bmp.Pixel(50, 50).argb)
' Output:
' FF0080FF
' FFFFFFFF
```

<!-- test: Gr_LibraryTests.GdiPlusUser_BitmapOfTwoWholeNumbers_IsCreated, Gr_LibraryTests.GdiPlusUser_BitmapOfSinglesOrWithFormat_IsCreated -->
> [!WARNING] 0.9.45.0
> Two whole numbers without a format do not create a bitmap of that size. `Bitmap(64, 64)` binds to the form that takes a GDI bitmap handle and a palette handle, treats 64 and 64 as handles, and returns an unusable object with **LastResult** 7 (**Win32Error**), without any error being raised. Pass **Single** values, as the sample does: `Bitmap(64!, 64!)`, or give a format, as in `Bitmap(64, 64, PixelFormat32bppARGB)`. [**Bitmap**](Bitmap#creating) has the details.

<!-- test: Gr_GraphicsTests.Clear_VBColourRed_FillsRed, Gr_GraphicsTests.Clear_CColorTransparent_KeepsAlpha, Gr_GraphicsTests.DrawImage_DestRectF_ScalesTheImage, Gr_GraphicsTests.DrawImage_DestRect_ScalesTheImage, Gr_GraphicsTests.DrawImage_ThreeFloatPointsAndSourcePart_DrawsTheImage, Gr_GraphicsTests.Transform_Get_ReturnsTheWorldTransformation, Gr_MatrixTests.Transform_GetOnGradientBrush_ThroughTheInterface_ReturnsTheMatrix -->
> [!WARNING] 0.9.45.0
> The package compiles, and a program that uses its common calls with **Color** values works. A number of members give wrong results, fail or never return, and in most cases raise no error. The main ones:
>
> - A colour passed as a **Long** (the *rgb* forms of [**SolidBrush**](SolidBrush), [**Pen**](Pen), [**Graphics.Clear**](Graphics#clear), [**HatchBrush**](HatchBrush) and the gradient brushes) is read as `&H00RRGGBB`, not as a Visual Basic colour: `SolidBrush(vbRed)` paints blue, and the alpha is dropped. A **CColor** member passed there loses its alpha. Pass a [**Color**](Types/Color). See [Colours](IBrush#colours) and [**Color**](Types/Color#windows-colours).
> - [**Image.Save**](Image#save) and **Bitmap.Save** cannot pass encoder parameters: the call returns an error, ignores them, or stops the program.
> - [**InstalledFontCollection**](InstalledFontCollection#creating) and [**PrivateFontCollection**](PrivateFontCollection#creating) cannot be created, so no font collection can be used.
> - Some calls never return: the function form of [**HatchBrush**](HatchBrush#creating), the array forms of [**SetBlend**](LinearGradientBrush#setblend) and [**SetInterpolationColors**](LinearGradientBrush#setinterpolationcolors) of the gradient brushes, the stroke cap setters of [**CustomLineCap**](CustomLineCap#setstrokecaps) and of [**ArrowCap**](ArrowCap).
> - Some calls end the program: [**Graphics.DrawImage**](Graphics#drawimage) with a destination rectangle (in a 32-bit program) and with an array of points and a source part, [**Graphics.IsVisible**](Graphics#isvisible) with a **GpPointF** (in a 32-bit program), the methods **TestControlForceBilinear** and **TestControlNoICM** of [**GdiPlusUser**](GdiPlusUser#methods), and drawing an image that was given a [**GdiPlusAbort**](GdiPlusAbort).
> - The [**Metafile**](Metafile#creating) constructors that take a file name, and the ones that record, raise error 13.
> - The [effects](Effect#parameters) return zeros from **Parameters** unless the size of the structure is passed, and the constructors that take a parameters structure fail or stop the program for seven of the eleven effect classes.
> - Reading **Transform** from a [**Graphics**](Graphics#transform), a [**Pen**](Pen#transform) or a brush returns **Nothing**. A **Graphics** and the brushes have [**GetTransform**](ITransformable#gettransform) to read the transformation, and a **Pen** has no way to.
>
> Each page states the defects of its own members in a warning of the same kind.

## Getting started

A **GdiPlusUser** must exist while any GDI+ object is used. It starts GDI+, and without one the other classes fail with status 18, *GdiplusNotInitialized*. Any number of instances can exist; GDI+ stays usable while one does. Create it with the function of the same name, in a variable that lives as long as the program draws:

```tb check_build
Dim user As GdiPlusUser = GdiPlusUser()
```

<!-- test: none -- GDI+ is already started in the process of the test runner, so a GDI+ object made before the first use of a Dim As New GdiPlusUser variable does not fail with status 18 there; it fails only in a program that has not started GDI+ yet -->
> [!WARNING] 0.9.45.0
> A **GdiPlusUser** declared `Dim user As New GdiPlusUser` is not created until the variable is first used, so the GDI+ objects made before that fail with status 18. Use `Dim user As GdiPlusUser = GdiPlusUser()`, or `Set` the variable in the load handler. See [**GdiPlusUser**](GdiPlusUser).

Every class is created in two ways that are one thing: `New Pen(...)` and the function `Pen(...)`. This section documents both under *Creating* on the page of the class. The structures of the package, such as [**GpPointF**](Types/GpPointF) and [**GpRect**](Types/GpRect), have such functions too: `GpRect(0, 0, 10, 10)`.

<!-- test: Gr_LibraryTests.Image_AssignedToAVariableOfTheVbType_Fails, Gr_LibraryTests.Image_AssignedToAGdiPlusImageVariable_IsUsable, Gr_GraphicsTests.Font_AssignedToAVariableOfTheStdoleType_Fails, Gr_GraphicsTests.Font_AssignedToAGdiPlusFontVariable_IsUsable, compile GrQualifiedImageCompiles, compile GrQualifiedFontCompiles -->
> [!NOTE] 0.9.45.0
> A project that has the VB and OLE Automation packages, which every default project has, has a control class **Image** and an OLE type **Font**. In a declaration, write [`GdiPlus.Image`](Image) and [`GdiPlus.Font`](Font); the constructor functions `Image(...)` and `Font(...)` need no prefix.

### Drawing on a bitmap

The sample above draws on a [**Bitmap**](Bitmap): `Graphics(bmp)` makes a drawing surface for it, and every drawing call of the **Graphics** changes its pixels, which `bmp.Pixel(x, y)` reads back. A bitmap is the easiest surface to start with, because it needs no window.

### Drawing in a window

A program that handles the window messages itself creates its **GdiPlusUser** on `WM_CREATE`, and in `WM_PAINT` makes a buffered **Graphics** with [**BufferedGraphicsFromHWND**](Graphics#bufferedgraphicsfromhwnd), draws, and releases it, which copies the picture to the window. [Painting a window or a form](Graphics#painting-a-window-or-a-form) shows the whole window procedure.

### Drawing in a form

A form creates its **GdiPlusUser** in `Form_Load`, makes a [**BufferedGraphicsFromHDC**](Graphics#bufferedgraphicsfromhdc) of the form's **hDC** property in its **Paint** event, draws, and sets the variable to **Nothing**:

```tb check_build inherits=Form
Dim mGdiPlus As GdiPlusUser

Sub Form_Load()
    ScaleMode = vbPixels
    Set mGdiPlus = GdiPlusUser()
End Sub

Sub Form_Paint()
    Dim area As GpRect = GpRect(0, 0, ScaleWidth, ScaleHeight)
    Dim gr As Graphics = BufferedGraphicsFromHDC(hDC, area)
    gr.Clear(Color(255, 255, 255))
    gr.DrawLine(Pen(Color(0, 0, 255), 3), 10, 10, 100, 60)
    Set gr = Nothing
End Sub

Sub Form_Resize()
    Refresh
End Sub
```

## Failures

A call that fails raises no error by default. A method that returns no value returns the [**GpStatus**](Enumerations/GpStatus) of the call, and every object keeps the last failure in its **LastResult** property, which stays set until **ClearResult** is called. A constructor that fails returns an unusable object. The global variable **GdipErrorHandlingStrategy** makes the package raise an error or call a handler instead. [**GdiPlusBase**](GdiPlusBase) has the details.

## What is not documented

The package declares more than a program uses. These parts are left out of this section:

- the handle types, such as **GpGraphics**, **GpPen**, **GpBitmap** and **GpPath**. Each holds the handle of one GDI+ object, and the classes of the package use them in their implementation. A member that takes or returns one says so in words, and [**GetNative**](Helpers#getnative) returns the handle of an object for a program that calls the flat GDI+ functions itself;
- the structures and enumerations with the prefix **GDIP_**, the **Gdip...** modules that hold the flat function declarations (**GdipGraphics**, **GdipBitmap** and the others), and **GDIPDEF_UUID**. They are the package's own layer over the flat API;
- the protected members that the classes use among themselves, such as **Native**, which returns the handle of the object, and **Class_Terminate**, which releases it;
- the test code of the package, the modules **ModMain** and **TypesTest**.

## Classes and interfaces

### Starting GDI+, errors and helpers

- [GdiPlusUser](GdiPlusUser) -- starts GDI+; one instance must exist while the package is used
- [GdiPlusBase](GdiPlusBase) -- the base class of the classes: **LastResult**, the status text and the error handling
- [GdiPlusAbort](GdiPlusAbort) -- an object that GDI+ can ask whether to stop (GDI+ does not use it)
- [Helpers](Helpers) -- the functions and constants that belong to no class: status text, pixel formats, effect IDs, metafile headers, property tags
- [ImageCodec](ImageCodec) -- the installed encoders and decoders, and the IDs of image formats and encoder parameters

### Drawing

- [Graphics](Graphics) -- the drawing surface: lines, shapes, text and images on a bitmap, a window or a device context
- [VBGraphics](VBGraphics) -- a **Graphics** that also draws with the `Line`, `Circle` and `PSet` statements of Visual Basic
- [IDeviceContext](IDeviceContext) -- the interface to hand out a Windows device context
- [ITransformable](ITransformable) -- the members that classes with a transformation matrix share

### Paths, regions and transformations

- [GraphicsPath](GraphicsPath) -- a sequence of connected lines, curves and shapes
- [PathIterator](PathIterator) -- reads the figures and points of a path one part after another
- [PathData](PathData) -- the points of a path and their types, in memory
- [Region](Region) -- an area of a drawing surface, of any shape
- [Matrix](Matrix) -- a 3 by 3 affine transformation

### Pens and brushes

- [Pen](Pen) -- draws lines and outlines
- [IBrush](IBrush) -- the interface that every brush implements
- [SolidBrush](SolidBrush) -- fills with one colour
- [HatchBrush](HatchBrush) -- fills with a pattern of lines or dots
- [TextureBrush](TextureBrush) -- fills with tiles of an image
- [LinearGradientBrush](LinearGradientBrush) -- fills with a colour that changes along a line
- [PathGradientBrush](PathGradientBrush) -- fills with a colour that changes from a centre to the edge of a path
- [CustomLineCap](CustomLineCap) -- a line end whose shape is a path
- [ArrowCap](ArrowCap) -- a line end in the shape of an arrowhead

### Images and effects

- [Image](Image) -- the base class of bitmaps and metafiles: loading, saving, size, frames and properties
- [Bitmap](Bitmap) -- a raster picture that a program can draw on and read pixel by pixel
- [Metafile](Metafile) -- a picture stored as a sequence of drawing commands
- [CachedBitmap](CachedBitmap) -- a bitmap in the format of one **Graphics**, for fast repeated drawing
- [ImageAttributes](ImageAttributes) -- colour adjustments that GDI+ applies while it draws an image
- [IImageBytes](IImageBytes) -- the COM interface for direct access to the bytes of an image in memory
- [Effect](Effect) -- the base class of the image effects
- [Blur](Blur), [Sharpen](Sharpen), [BrightnessContrast](BrightnessContrast), [HueSaturationLightness](HueSaturationLightness), [Levels](Levels), [Tint](Tint), [ColorBalance](ColorBalance), [ColorMatrixEffect](ColorMatrixEffect), [ColorLUT](ColorLUT), [ColorCurve](ColorCurve), [RedEyeCorrection](RedEyeCorrection) -- the eleven effects

### Text

- [Font](Font) -- a font by family, size, style and unit
- [FontFamily](FontFamily) -- a set of fonts that share a typeface design
- [FontCollection](FontCollection) -- the base class of the two collections
- [InstalledFontCollection](InstalledFontCollection) -- the font families installed on the system
- [PrivateFontCollection](PrivateFontCollection) -- fonts loaded from files or memory for one program
- [StringFormat](StringFormat) -- how a string is laid out: alignment, wrapping, trimming, tab stops

## Types

The [Types](Types/) page lists the structures of the package, in groups:

- colour: [Color](Types/Color), [ColorMatrix](Types/ColorMatrix), [ColorPalette](Types/ColorPalette), [ColorMap](Types/ColorMap), [ColorChannelLUT](Types/ColorChannelLUT)
- geometry: [GpPoint](Types/GpPoint), [GpPointF](Types/GpPointF), [GpSize](Types/GpSize), [GpSizeF](Types/GpSizeF), [GpRect](Types/GpRect), [GpRectF](Types/GpRectF), [CharacterRange](Types/CharacterRange)
- paths: [PathPointType](Types/PathPointType), [PathType](Types/PathType), [TypedPoint](Types/TypedPoint), [TypedPoints](Types/TypedPoints), [SubPath](Types/SubPath), [Marker](Types/Marker)
- images and metafiles: [BitmapData](Types/BitmapData), [MetafileHeader](Types/MetafileHeader), [GpPropertyItem](Types/GpPropertyItem), [GpImageCodecInfo](Types/GpImageCodecInfo), [GpEncoderParameter](Types/GpEncoderParameter)
- starting GDI+: [GdiplusStartupInput](Types/GdiplusStartupInput), [GdiplusStartupOutput](Types/GdiplusStartupOutput)
- the parameters of the effects: [BlurParams](Types/BlurParams), [SharpenParams](Types/SharpenParams) and the others

## Enumerations

The [Enumerations](Enumerations/) page lists the 74 enumerations of the package, in groups by topic. Most follow the GDI+ headers, with **Gp** in front of the name, such as [GpUnit](Enumerations/GpUnit), [GpSmoothingMode](Enumerations/GpSmoothingMode), [GpFontStyle](Enumerations/GpFontStyle), [PixelFormat](Enumerations/PixelFormat) and [GpStatus](Enumerations/GpStatus). [CColor](Enumerations/CColor) names 140 common colours.

## See Also

- [GDI+ reference](https://learn.microsoft.com/en-us/windows/win32/gdiplus/-gdiplus-gdi-start) -- Microsoft's documentation of GDI+
- [Graphics](Graphics) class -- the drawing surface
- [Bitmap](Bitmap) class -- a picture to draw on
- [Experimental Packages](../../Experimental/) -- the packages from TWINSERV that are not yet ready for use in a program

## Test cases

The notes and warnings of this section are checked by the test cases in [GdiPlus-tests.twinproj](GdiPlus-tests.twinproj), a twinBASIC project. It uses GdiPlus as a [linked package](../../../../Features/Packages/Linked#manual-management): put the package's `.twinpack` in `%APPDATA%\twinBASIC\packages`, then run the project, and each case prints whether it passes.
