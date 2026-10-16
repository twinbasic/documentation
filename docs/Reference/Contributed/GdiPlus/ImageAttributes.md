---
title: ImageAttributes
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/ImageAttributes
---

# ImageAttributes class
{: .no_toc }

The colour adjustments that GDI+ applies to an image while it draws it: a colour matrix, gamma, a threshold, colour keys, remapped colours and the way the image wraps at its edges.

An **ImageAttributes** is handed to [**Graphics.DrawImage**](Graphics#drawimage) (the overloads that take an *imageAttributes* argument) and to [**TextureBrush**](TextureBrush). It never changes the image: the adjustment happens on the way to the destination. The class mirrors the GDI+ [ImageAttributes](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusimageattributes/nl-gdiplusimageattributes-imageattributes) class.

* TOC
{:toc}

## Creating

Syntax: *attrs* **= ImageAttributes**( )

Syntax: *attrs* **= New ImageAttributes**( )

Creates an object with no adjustments.

### Clone

Syntax: *copy* **=** *attrs*.**Clone**( )

Returns a new **ImageAttributes** with the same adjustments. Changing the copy does not change the original.

## Adjustment categories

Most members take a *type* argument, a [**ColorAdjustType**](Enumerations/ColorAdjustType) that defaults to **ColorAdjustTypeDefault**. An **ImageAttributes** keeps separate settings for bitmaps, brushes, pens and text. A category that has none of its own uses the default settings. As soon as any setting is made for a category, that category starts from nothing and uses only its own settings, not the default ones.

### Reset

Syntax: *status* **=** *attrs*.**Reset**( [ *type* ] )

Removes every adjustment of the category, so that it uses the default settings again.

### SetToIdentity

Syntax: *status* **=** *attrs*.**SetToIdentity**( [ *type* ] )

Gives the category no adjustments at all, whatever the default settings are. Unlike **Reset**, it also blocks the default settings.

The examples on this page draw a one-pixel image through an **ImageAttributes** onto a one-pixel bitmap and read the result. The image is the colour 200, 100, 50.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim src As Bitmap = Bitmap(1!, 1!)
src.Pixel(0, 0) = Color(255, 200, 100, 50)
Dim dst As Bitmap = Bitmap(1!, 1!)
Dim g As Graphics = Graphics(dst)

Dim attrs As ImageAttributes = ImageAttributes()
attrs.SetGamma 2!, ColorAdjustTypeBitmap
g.DrawImage src, GpRect(0, 0, 1, 1), GpRect(0, 0, 1, 1), UnitPixel, attrs
Debug.Print Hex$(dst.Pixel(0, 0).argb)

attrs.SetToIdentity ColorAdjustTypeBitmap
g.DrawImage src, GpRect(0, 0, 1, 1), GpRect(0, 0, 1, 1), UnitPixel, attrs
Debug.Print Hex$(dst.Pixel(0, 0).argb)

attrs.Reset ColorAdjustTypeBitmap
Debug.Print attrs.SetGamma(2!)                    ' default settings
g.DrawImage src, GpRect(0, 0, 1, 1), GpRect(0, 0, 1, 1), UnitPixel, attrs
Debug.Print Hex$(dst.Pixel(0, 0).argb)
' Output:
' FF9D270A
' FFC86432
' 0
' FF9D270A
```

## Colour matrix

A colour matrix changes the colour of every pixel with a linear transformation: the new red, green, blue and alpha values are sums of multiples of the old ones, plus a constant. The matrix is a [**ColorMatrix**](Types/ColorMatrix), a 5 by 5 array of **Single** values. The colour values in the calculation run from 0 to 1.

In the `m(i, j)` array of the package, the first index *i* picks the output component and the second index *j* the input component. The indexes 0 to 3 stand for red, green, blue and alpha. The input index 4 is the constant 1, so `m(i, 4)` adds a constant to the component *i*. `m(2, 0) = 1` adds the red of the input to the blue of the output. A variable declared **As ColorMatrix** is all zeros, and a matrix of zeros makes every colour black, so a program starts from the identity matrix, which has 1 in `m(i, i)`.

<!-- test: Im_AttributeTests.ColorMatrix_FirstIndexIsTheOutputComponent, Im_AttributeTests.ColorMatrix_FifthColumnAddsAConstant -->
> [!NOTE] 0.9.45.0
> The C++ matrix has its indexes the other way round, `M[input][output]`, so `M[0][2]` of C++ is `m(2, 0)` here. The package swaps the indexes to match the memory layout.

### SetColorMatrix

Syntax: *status* **=** *attrs*.**SetColorMatrix**( *colorMatrix* [ , *mode* [ , *type* ] ] )

*colorMatrix*
: *required* A [**ColorMatrix**](Types/ColorMatrix).

*mode*
: *optional* A [**ColorMatrixFlags**](Enumerations/ColorMatrixFlags) value. The default is **ColorMatrixFlagsDefault**: the matrix applies to every colour.

*type*
: *optional* A [**ColorAdjustType**](Enumerations/ColorAdjustType).

### ClearColorMatrix

Syntax: *status* **=** *attrs*.**ClearColorMatrix**( [ *type* ] )

Removes the colour matrix of the category.

### SetColorMatrices

Syntax: *status* **=** *attrs*.**SetColorMatrices**( *colorMatrix*, *grayMatrix* [ , *mode* [ , *type* ] ] )

Sets two matrices: *colorMatrix* for colours and *grayMatrix* for shades of gray, so that grays can be adjusted differently. The *mode* chooses what the gray matrix applies to: with **ColorMatrixFlagsSkipGrays**, grays are not adjusted at all; with **ColorMatrixFlagsAltGray**, the gray matrix is used for the grays and the colour matrix for the rest.

### ClearColorMatrices

Syntax: *status* **=** *attrs*.**ClearColorMatrices**( [ *type* ] )

Removes both matrices of the category.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim src As Bitmap = Bitmap(1!, 1!)
src.Pixel(0, 0) = Color(255, 200, 100, 50)
Dim dst As Bitmap = Bitmap(1!, 1!)
Dim g As Graphics = Graphics(dst)

Dim cm As ColorMatrix
Dim i As Long
For i = 0 To 4
    cm.m(i, i) = 1                      ' the identity
Next
cm.m(2, 0) = 1                          ' blue += red

Dim attrs As ImageAttributes = ImageAttributes()
Debug.Print attrs.SetColorMatrix(cm)
g.DrawImage src, GpRect(0, 0, 1, 1), GpRect(0, 0, 1, 1), UnitPixel, attrs
Debug.Print Hex$(dst.Pixel(0, 0).argb)

cm.m(2, 0) = 0
cm.m(1, 4) = 0.1!                      ' green += 0.1 of the range
attrs.SetColorMatrix cm
g.DrawImage src, GpRect(0, 0, 1, 1), GpRect(0, 0, 1, 1), UnitPixel, attrs
Debug.Print Hex$(dst.Pixel(0, 0).argb)

attrs.ClearColorMatrix
g.DrawImage src, GpRect(0, 0, 1, 1), GpRect(0, 0, 1, 1), UnitPixel, attrs
Debug.Print Hex$(dst.Pixel(0, 0).argb)
' Output:
' 0
' FFC864FA
' FFC87E32
' FFC86432
```

## Gamma, threshold and no-op

### SetGamma

Syntax: *status* **=** *attrs*.**SetGamma**( *gamma* [ , *type* ] )

*gamma*
: *required* A **Single**. Each colour value `v` from 0 to 1 becomes `v ^ gamma`, so a value above 1 darkens and a value below 1 lightens.

### ClearGamma

Syntax: *status* **=** *attrs*.**ClearGamma**( [ *type* ] )

Removes the gamma setting of the category.

### SetThreshold

Syntax: *status* **=** *attrs*.**SetThreshold**( *threshold* [ , *type* ] )

*threshold*
: *required* A **Single** from 0 to 1. Each colour value at or above it becomes 255, and each below it becomes 0.

### ClearThreshold

Syntax: *status* **=** *attrs*.**ClearThreshold**( [ *type* ] )

Removes the threshold of the category.

### SetNoOp

Syntax: *status* **=** *attrs*.**SetNoOp**( [ *type* ] )

Turns off all adjustment of the category, whatever else is set for it, until **ClearNoOp**.

### ClearNoOp

Syntax: *status* **=** *attrs*.**ClearNoOp**( [ *type* ] )

Ends the effect of **SetNoOp**. The other settings of the category apply again.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim src As Bitmap = Bitmap(1!, 1!)
src.Pixel(0, 0) = Color(255, 200, 100, 50)
Dim dst As Bitmap = Bitmap(1!, 1!)
Dim g As Graphics = Graphics(dst)
Dim attrs As ImageAttributes = ImageAttributes()

attrs.SetThreshold 0.5!
g.DrawImage src, GpRect(0, 0, 1, 1), GpRect(0, 0, 1, 1), UnitPixel, attrs
Debug.Print Hex$(dst.Pixel(0, 0).argb)
attrs.ClearThreshold

attrs.SetGamma 2!
attrs.SetNoOp
g.DrawImage src, GpRect(0, 0, 1, 1), GpRect(0, 0, 1, 1), UnitPixel, attrs
Debug.Print Hex$(dst.Pixel(0, 0).argb)

attrs.ClearNoOp
g.DrawImage src, GpRect(0, 0, 1, 1), GpRect(0, 0, 1, 1), UnitPixel, attrs
Debug.Print Hex$(dst.Pixel(0, 0).argb)
' Output:
' FFFF0000
' FFC86432
' FF9D270A
```

## Colour keys

### SetColorKey

Syntax: *status* **=** *attrs*.**SetColorKey**( *colorLow*, *colorHigh* [ , *type* ] )

Syntax: *status* **=** *attrs*.**SetColorKey**( *rgbLow*, *rgbHigh* [ , *type* ] )

*colorLow*, *colorHigh*
: *required* [**Color**](Types/Color) values: the corners of a range of colours.

*rgbLow*, *rgbHigh*
: *required* **Long** values for the same, as `&H00RRGGBB`.

Makes the pixels whose colour lies in the range (every channel at or above *colorLow* and at or below *colorHigh*) transparent. Use the same colour twice to key out one colour.

<!-- test: Im_AttributeTests.ColorKey_ColorFormKeysOutTheColour, Im_AttributeTests.ColorKey_LongFormTakesAVbColour, Im_AttributeTests.ColorKey_LongFormTakesRrggbbAsDocumented -->
> [!WARNING] 0.9.45.0
> The **Long** form reads its arguments as `&H00RRGGBB`, not as a VB colour. `SetColorKey RGB(200, 100, 50), RGB(200, 100, 50)` keys out a different colour, as red and blue are exchanged. Use the **Color** form, or write the value as `&HRRGGBB`.

### ClearColorKey

Syntax: *status* **=** *attrs*.**ClearColorKey**( [ *type* ] )

Removes the colour key of the category.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim src As Bitmap = Bitmap(2!, 1!)
src.Pixel(0, 0) = Color(255, 200, 100, 50)
src.Pixel(1, 0) = Color(255, 10, 250, 130)
Dim dst As Bitmap = Bitmap(2!, 1!)
Dim g As Graphics = Graphics(dst)
Dim attrs As ImageAttributes = ImageAttributes()

g.Clear(Color(255, 0, 0, 0))
attrs.SetColorKey Color(255, 190, 90, 40), Color(255, 210, 110, 60)
g.DrawImage src, GpRect(0, 0, 2, 1), GpRect(0, 0, 2, 1), UnitPixel, attrs
Debug.Print Hex$(dst.Pixel(0, 0).argb) & " " & Hex$(dst.Pixel(1, 0).argb)

attrs.ClearColorKey
g.Clear(Color(255, 0, 0, 0))
attrs.SetColorKey &H0AFA82, &H0AFA82
g.DrawImage src, GpRect(0, 0, 2, 1), GpRect(0, 0, 2, 1), UnitPixel, attrs
Debug.Print Hex$(dst.Pixel(0, 0).argb) & " " & Hex$(dst.Pixel(1, 0).argb)
' Output:
' FF000000 FF0AFA82
' FFC86432 FF000000
```

## Output channel

### SetOutputChannel

Syntax: *status* **=** *attrs*.**SetOutputChannel**( *channelFlags* [ , *type* ] )

*channelFlags*
: *required* A [**ColorChannelFlags**](Enumerations/ColorChannelFlags) value: **ColorChannelFlagsC**, **M**, **Y** or **K**, the cyan, magenta, yellow and black channels of the CMYK model.

Draws the image as shades of gray that show only that channel of its colours.

### ClearOutputChannel

Syntax: *status* **=** *attrs*.**ClearOutputChannel**( [ *type* ] )

Removes the output channel setting.

### SetOutputChannelColorProfile

Syntax: *status* **=** *attrs*.**SetOutputChannelColorProfile**( *colorProfileFilename* [ , *type* ] )

*colorProfileFilename*
: *required* A **String** naming an ICC colour profile file. GDI+ uses the profile to split the colours into CMYK channels for **SetOutputChannel**.

### ClearOutputChannelColorProfile

Syntax: *status* **=** *attrs*.**ClearOutputChannelColorProfile**( [ *type* ] )

Removes the profile.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim attrs As ImageAttributes = ImageAttributes()
Debug.Print attrs.SetOutputChannel(ColorChannelFlagsK)
Debug.Print attrs.ClearOutputChannel()
' Output:
' 0
' 0
```

## Remapping colours

### SetRemapTable

Syntax: *status* **=** *attrs*.**SetRemapTable**( *map*( ) [ , *type* ] )

*map*
: *required* An array of [**ColorMap**](Types/ColorMap) values. Each pair gives a colour to replace and the colour to put in its place.

Replaces the colours that match an *oldColor* of the table exactly. All other colours are unchanged.

### ClearRemapTable

Syntax: *status* **=** *attrs*.**ClearRemapTable**( [ *type* ] )

Removes the table of the category.

### SetBrushRemapTable

Syntax: *status* **=** *attrs*.**SetBrushRemapTable**( *map*( ) )

### ClearBrushRemapTable

Syntax: *status* **=** *attrs*.**ClearBrushRemapTable**( )

The same for the **ColorAdjustTypeBrush** category.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim src As Bitmap = Bitmap(2!, 1!)
src.Pixel(0, 0) = Color(255, 200, 100, 50)
src.Pixel(1, 0) = Color(255, 10, 250, 130)
Dim dst As Bitmap = Bitmap(2!, 1!)
Dim g As Graphics = Graphics(dst)

Dim map(0 To 0) As ColorMap
map(0) = ColorMap(Color(255, 200, 100, 50), Color(255, 1, 2, 3))

Dim attrs As ImageAttributes = ImageAttributes()
Debug.Print attrs.SetRemapTable(map)
g.DrawImage src, GpRect(0, 0, 2, 1), GpRect(0, 0, 2, 1), UnitPixel, attrs
Debug.Print Hex$(dst.Pixel(0, 0).argb) & " " & Hex$(dst.Pixel(1, 0).argb)
' Output:
' 0
' FF010203 FF0AFA82
```

## Wrap mode

### SetWrapMode

Syntax: *status* **=** *attrs*.**SetWrapMode**( *wrap*, *color* [ , *clamp* ] )

Syntax: *status* **=** *attrs*.**SetWrapMode**( *wrap*, *rgb* [ , *clamp* ] )

*wrap*
: *required* A [**GpWrapMode**](Enumerations/GpWrapMode): how the image repeats when the source rectangle reaches beyond its edges.

*color*
: *required* A [**Color**](Types/Color) used with **WrapModeClamp**, for the area outside the image.

*rgb*
: *required* A **Long** for the same, as `&H00RRGGBB`.

*clamp*
: *optional* A **Boolean**. **True** draws only the part of the image inside the source rectangle. The default is **False**.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim attrs As ImageAttributes = ImageAttributes()
Debug.Print attrs.SetWrapMode(WrapModeClamp, Color(255, 1, 2, 3))
Debug.Print attrs.SetWrapMode(WrapModeTileFlipXY, &H010203, True)
' Output:
' 0
' 0
```

## Other

### SetCachedBackground

Syntax: *status* **=** *attrs*.**SetCachedBackground**( *enabled* )

*enabled*
: *required* A **Boolean**. GDI+ may keep the background of the destination for faster repeated drawing when it is **True**.

### GetAdjustedPalette

Syntax: *status* **=** *attrs*.**GetAdjustedPalette**( *colorPalette*, *colorAdjustType* )

*colorPalette*
: *required* A [**ColorPalette**](Types/ColorPalette) whose colours are changed in place.

*colorAdjustType*
: *required* A [**ColorAdjustType**](Enumerations/ColorAdjustType): the category whose settings are applied.

Applies the adjustments of the category to the colours of the palette. The flags of the palette are ignored.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim pal As ColorPalette
pal.count = 2
pal.entries(0) = &HFFC86432
pal.entries(1) = &HFF0AFA82

Dim attrs As ImageAttributes = ImageAttributes()
attrs.SetGamma 2!, ColorAdjustTypeBitmap
Debug.Print attrs.GetAdjustedPalette(pal, ColorAdjustTypeBitmap)
Debug.Print Hex$(pal.entries(0)) & " " & Hex$(pal.entries(1))
' Output:
' 0
' FF9D270A FF00F542
```

## Example

The example makes a negative of an image with a colour matrix and then copies the settings with **Clone**.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim src As Bitmap = Bitmap(1!, 1!)
src.Pixel(0, 0) = Color(255, 200, 100, 50)
Dim dst As Bitmap = Bitmap(1!, 1!)
Dim g As Graphics = Graphics(dst)

Dim cm As ColorMatrix
cm.m(0, 0) = -1: cm.m(1, 1) = -1: cm.m(2, 2) = -1: cm.m(3, 3) = 1
cm.m(0, 4) = 1: cm.m(1, 4) = 1: cm.m(2, 4) = 1: cm.m(4, 4) = 1

Dim negative As ImageAttributes = ImageAttributes()
negative.SetColorMatrix cm
Dim copy As ImageAttributes = negative.Clone()

g.DrawImage src, GpRect(0, 0, 1, 1), GpRect(0, 0, 1, 1), UnitPixel, copy
Debug.Print Hex$(dst.Pixel(0, 0).argb)
' Output:
' FF379BCD
```

## See Also

- [ImageAttributes](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusimageattributes/nl-gdiplusimageattributes-imageattributes) -- Microsoft's documentation of the GDI+ class
- [Graphics](Graphics) class
- [Image](Image) class
- [ColorMatrix](Types/ColorMatrix) type
- [ColorMap](Types/ColorMap) type
- [ColorAdjustType](Enumerations/ColorAdjustType) enumeration
