---
title: Enumerations
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/
has_children: true
has_toc: false
nav_order: 99
---

# GdiPlus Enumerations
{: .no_toc }

The 74 public enumerations of the package, in groups by topic. The members of an enumeration can be written with or without the name of the enumeration, as in `FillModeWinding` or `GpFillmode.FillModeWinding`.

Most of them are GDI+ enumerations, with the names and the values of the GDI+ header files, and a **Gp** in front of the name of the ones whose name a class of the package uses. **CColor**, **GraphicsCreationOptions**, **GraphicsFlags**, **FillStyleConstants** and **GpErrorHandlingStrategy** belong to the package.

## Drawing
{: .no_toc }

Lines, shapes, fills, pens, brushes, paths, regions, transformations and the settings of a drawing surface.

- [GpBrushType](GpBrushType) -- the five kinds of brush
- [GpCombineMode](GpCombineMode) -- how clip regions combine
- [GpCompositingMode](GpCompositingMode) -- how a drawn colour combines with the background
- [GpCompositingQuality](GpCompositingQuality) -- gamma correction when colours are blended
- [GpCoordinateSpace](GpCoordinateSpace) -- world, page and device coordinates
- [GpCustomLineCapType](GpCustomLineCapType) -- kinds of custom line cap
- [GpDashCap](GpDashCap) -- the ends of the dashes of a dashed line
- [GpDashStyle](GpDashStyle) -- the dash patterns of a pen
- [GpFillmode](GpFillmode) -- how a self-intersecting path is filled
- [GpFlushIntention](GpFlushIntention) -- when to flush the drawing queue
- [GpHatchStyle](GpHatchStyle) -- the 53 hatch patterns of a hatch brush
- [GpInterpolationMode](GpInterpolationMode) -- algorithm used to scale and rotate images
- [GpLineCap](GpLineCap) -- line ends and anchors
- [GpLineJoin](GpLineJoin) -- how two joined lines meet
- [GpLinearGradientMode](GpLinearGradientMode) -- direction of a linear gradient
- [GpMatrixOrder](GpMatrixOrder) -- order in which a transformation is applied
- [GpPathPointType](GpPathPointType) -- point types and flags in a path
- [GpPenAlignment](GpPenAlignment) -- where a pen sits on the line
- [GpPenType](GpPenType) -- the fill of a pen
- [GpPixelOffsetMode](GpPixelOffsetMode) -- where the centre of a pixel is
- [GpQualityMode](GpQualityMode) -- speed against quality
- [GpSmoothingMode](GpSmoothingMode) -- antialiasing of lines and curves
- [GpUnit](GpUnit) -- units of measure
- [GpWarpMode](GpWarpMode) -- perspective and bilinear warps
- [GpWrapMode](GpWrapMode) -- tiling of brushes and images
- [GraphicsCreationOptions](GraphicsCreationOptions) -- what a Graphics object is created from
- [GraphicsFlags](GraphicsFlags) -- settings of VBGraphics
- [FillStyleConstants](FillStyleConstants) -- fill style of VBGraphics

## Text
{: .no_toc }

Fonts, text layout and text rendering.

- [GpDriverStringOptions](GpDriverStringOptions) -- options of driver strings
- [GpFontStyle](GpFontStyle) -- bold, italic, underline and strikeout
- [GpGenericFontFamily](GpGenericFontFamily) -- the three generic font families
- [GpHotkeyPrefix](GpHotkeyPrefix) -- how an ampersand marks a hot key
- [GpStringAlignment](GpStringAlignment) -- alignment of text in its rectangle
- [GpStringDigitSubstitute](GpStringDigitSubstitute) -- digits that follow the user's language
- [GpStringFormatFlags](GpStringFormatFlags) -- layout and display options of text
- [GpStringTrimming](GpStringTrimming) -- how text is cut to fit
- [GpTextRenderingHint](GpTextRenderingHint) -- quality of rendered text

## Images
{: .no_toc }

Bitmaps, pixel formats, image files and codecs, palettes and effects.

- [HistogramFormat](HistogramFormat) -- histograms of a bitmap
- [CurveAdjustments](CurveAdjustments) -- adjustments of the ColorCurve effect
- [CurveChannel](CurveChannel) -- channels of the ColorCurve effect
- [GpEncoderParameterValueType](GpEncoderParameterValueType) -- data types of codec parameters
- [GpEncoderValue](GpEncoderValue) -- values passed to image encoders
- [GpImageType](GpImageType) -- bitmap or metafile
- [GpImageCodecFlags](GpImageCodecFlags) -- attributes of an image codec
- [GpPropertyTagType](GpPropertyTagType) -- data types of image properties
- [ImageFlags](ImageFlags) -- attributes of the pixel data of an image
- [ImageLockMode](ImageLockMode) -- access modes of Bitmap.LockBits
- [ItemDataPosition](ItemDataPosition) -- where custom metadata is stored in a file
- [RotateFlipType](RotateFlipType) -- rotations and flips of an image
- [DitherType](DitherType) -- dithering when a bitmap is converted
- [PaletteFlags](PaletteFlags) -- attributes of a palette
- [PaletteType](PaletteType) -- standard colour palettes
- [PixelFormat](PixelFormat) -- formats of the pixels of a bitmap

## Colour
{: .no_toc }

Colour values, colour channels and colour adjustment.

- [CColor](CColor) -- 140 named colours, as ARGB values
- [ColorChannelFlags](ColorChannelFlags) -- channels of the CMYK output of ImageAttributes
- [ColorMask](ColorMask) -- bit masks of the colour channels
- [ColorMode](ColorMode) -- 32-bit or 64-bit colours
- [ColorShift](ColorShift) -- bit positions of the colour channels
- [ColorAdjustType](ColorAdjustType) -- which objects an adjustment applies to
- [ColorMatrixFlags](ColorMatrixFlags) -- which colours a colour matrix changes

## Metafiles
{: .no_toc }

Windows metafiles, enhanced metafiles and EMF+ files, and the records they hold.

- [GpConvertToEmfPlusFlags](GpConvertToEmfPlusFlags) -- results of converting an EMF to EMF+
- [GpEMR](GpEMR) -- record types of enhanced metafiles
- [GpEmfPlusRecordType](GpEmfPlusRecordType) -- record types of WMF, EMF and EMF+ files
- [GpEmfToWmfBitsFlags](GpEmfToWmfBitsFlags) -- options of EMF to WMF conversion
- [GpEmfType](GpEmfType) -- records written to a new metafile
- [GpMetafileFrameUnit](GpMetafileFrameUnit) -- unit of the frame rectangle of a metafile
- [GpMetafileFunctions](GpMetafileFunctions) -- function numbers of Windows metafiles
- [GpMetafileType](GpMetafileType) -- kinds of metafile
- [GpObjectType](GpObjectType) -- types of object in an EMF+ record

## Platform
{: .no_toc }

Start-up, status codes and error handling.

- [GpTestControlEnum](GpTestControlEnum) -- internal test settings of GDI+
- [GdiplusDebugEventLevel](GdiplusDebugEventLevel) -- severity of a debug event
- [GdiplusStartupParams](GdiplusStartupParams) -- options of GDI+ start-up
- [GpErrorHandlingStrategy](GpErrorHandlingStrategy) -- what happens when a call fails
- [GpStatus](GpStatus) -- result codes of GDI+ calls
