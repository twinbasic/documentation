---
title: Types
parent: GdiPlus Package
has_children: true
has_toc: false
permalink: /tB/Packages/Contributed/GdiPlus/Types/
---

# GdiPlus Types
{: .no_toc }

The structures of the package that a program works with: points, sizes and rectangles, colours, the descriptions of paths, bitmap data, metafile headers, the settings that start GDI+ and the parameters of the effects.

A type is a user-defined type, a value with fields and sometimes methods. It is passed and assigned by value, and it needs no `New`. Most have a module function of the same name that returns a filled one, as in `GpRect(0, 0, 10, 10)`. The pages follow the structures of the GDI+ C++ wrapper that they mirror; the classes, which hold a GDI+ object, are on the pages of the section itself.

## Geometry
{: .no_toc }

- [GpPoint](GpPoint) -- a point with **Long** coordinates
- [GpPointF](GpPointF) -- a point or vector with **Single** coordinates
- [GpSize](GpSize) -- a size with **Long** values
- [GpSizeF](GpSizeF) -- a size with **Single** values
- [GpRect](GpRect) -- a rectangle with **Long** values
- [GpRectF](GpRectF) -- a rectangle with **Single** values
- [CharacterRange](CharacterRange) -- a range of characters of a string, for measuring

## Colour
{: .no_toc }

- [Color](Color) -- a colour with alpha, red, green and blue channels
- [ColorMatrix](ColorMatrix) -- a 5 by 5 matrix that transforms colours
- [ColorChannelLUT](ColorChannelLUT) -- a lookup table for one colour channel
- [ColorMap](ColorMap) -- a pair of colours, for remapping
- [ColorPalette](ColorPalette) -- the colour table of an indexed bitmap

## Starting GDI+
{: .no_toc }

- [GdiplusStartupInput](GdiplusStartupInput) -- the settings GDI+ is started with
- [GdiplusStartupOutput](GdiplusStartupOutput) -- the hook and unhook functions returned when the background thread is suppressed

## Paths
{: .no_toc }

- [PathPointType](PathPointType) -- the type of one point of a path
- [PathType](PathType) -- a run of points of one type in a figure
- [TypedPoint](TypedPoint) -- a point of a path with its type
- [TypedPoints](TypedPoints) -- an array of typed points
- [SubPath](SubPath) -- the extent of one figure of a path
- [SubPathPath](SubPathPath) -- one figure of a path, as a path of its own
- [Marker](Marker) -- the extent of one section of a path between markers
- [MarkerPath](MarkerPath) -- one section between markers, as a path of its own

## Images and metafiles
{: .no_toc }

- [BitmapData](BitmapData) -- the locked pixels of a bitmap
- [MetafileHeader](MetafileHeader) -- the header of a metafile
- [WmfPlaceableFileHeader](WmfPlaceableFileHeader) -- the placeable header of a Windows metafile
- [PWMFRect16](PWMFRect16) -- the 16-bit rectangle of that header
- [GpPropertyItem](GpPropertyItem) -- one property of an image file, such as the camera model
- [GpImageItemData](GpImageItemData) -- an item of extra data stored with an image
- [GpImageCodecInfo](GpImageCodecInfo) -- the description of an image encoder or decoder
- [GpEncoderParameter](GpEncoderParameter) -- one parameter of an image encoder

## Effect parameters
{: .no_toc }

The parameters of the effect classes, which each takes as its **Parameters** property.

- [BlurParams](BlurParams)
- [BrightnessContrastParams](BrightnessContrastParams)
- [ColorBalanceParams](ColorBalanceParams)
- [ColorCurveParams](ColorCurveParams)
- [ColorLUTParams](ColorLUTParams)
- [HueSaturationLightnessParams](HueSaturationLightnessParams)
- [LevelsParams](LevelsParams)
- [RedEyeCorrectionParams](RedEyeCorrectionParams)
- [SharpenParams](SharpenParams)
- [TintParams](TintParams)
