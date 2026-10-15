---
title: Color
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/Color
has_toc: false
---

# Color type
{: .no_toc }

A colour with an alpha (opacity) channel and red, green and blue channels of 8 bits each.

**Color** is the colour that pens, brushes, **Clear** and the drawing methods take, and that **GetPixel** returns. It holds one **Long** field, **argb**, laid out as `&HAARRGGBB`: alpha in the top byte, then red, green and blue. Alpha 255 is opaque and 0 is fully transparent. It mirrors the `Color` class of the GDI+ C++ wrapper.

| Byte of **argb** | Channel | Shift |
|---|---|---|
| top | alpha | 24 ([**AlphaShift**](../Enumerations/ColorShift)) |
| second | red | 16 |
| third | green | 8 |
| lowest | blue | 0 |

The common named colours (`CColor.Red`, `CColor.AliceBlue`, ...) are in the enumeration [**CColor**](../Enumerations/CColor); each is an opaque colour in this layout, except **Transparent**.

> [!NOTE] 0.9.45.0
> A variable declared with `Dim c As Color` holds 0: a fully transparent black, not black. Drawing with it shows nothing. Create colours with the module function **Color**, which gives an opaque colour.

## Creating

Syntax: **Color**( ) \
Syntax: **NoColor**( ) \
Syntax: **Color**( *r*, *g*, *b* ) \
Syntax: **Color**( *a*, *r*, *g*, *b* ) \
Syntax: **Color**( *argb* )

The module functions **Color** and **NoColor** return a new colour.

**Color**( ) returns opaque black, `&HFF000000`. **NoColor**( ) returns 0, which is transparent black and is what **IsNull** tests for.

*r*, *g*, *b*
: *required* **Long** values for the red, green and blue channels, 0 to 255. The alpha channel is 255.

*a*
: *required* A **Long** for the alpha channel, 0 to 255.

*argb*
: *required* A **Long** that is stored as it is, in the layout `&HAARRGGBB`. A member of [**CColor**](../Enumerations/CColor) is accepted.

> [!NOTE] 0.9.45.0
> The channel arguments are masked with `&HFF` and are not checked: `Color(300, -1, 0, 256)` is `&H2CFF0000`. No error is raised.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Debug.Print Hex$(Color(&H22, &H33, &H44).Value)                  ' FF223344
Debug.Print Hex$(Color(&H11, &H22, &H33, &H44).Value)            ' 11223344
Debug.Print Hex$(Color(&H80112233).Value)                        ' 80112233
Debug.Print Hex$(Color(CColor.Red).Value)                        ' FFFF0000
Debug.Print Hex$(Color().Value)                                  ' FF000000
Debug.Print NoColor().IsNull                                     ' True
Dim blank As Color
Debug.Print blank.IsNull                                         ' True
Debug.Print Hex$(Color(300, -1, 0, 256).Value)                   ' 2CFF0000
```

## Channels

### Alpha, Red, Green, Blue

Syntax: *color*.**Alpha** [ = *value* ] As **Integer**

Returns or sets one channel. **A**, **R**, **G** and **B** are the same four properties under shorter names.

The getters return an **Integer** from 0 to 255. The setters take a **Byte**: a value outside 0 to 255 raises error 6, *Overflow*, and the colour is not changed.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim c As Color = Color(&H11, &H22, &H33, &H44)
Debug.Print c.Alpha & " " & c.Red & " " & c.Green & " " & c.Blue          ' 17 34 51 68
Debug.Print c.A & " " & c.R & " " & c.G & " " & c.B                       ' 17 34 51 68
c.Red = 200: c.Green = 100: c.Blue = 50: c.Alpha = 25
Debug.Print Hex$(c.Value)                                                 ' 19C86432
On Error Resume Next
c.Alpha = 300
Debug.Print Err.Number                                                    ' 6
```

## The whole value

### Value

Syntax: *color*.**Value** [ = *argb* ] As **Long**

Returns or sets the colour as `&HAARRGGBB`. The field **argb** holds the same number.

### IsNull

Syntax: *color*.**IsNull** As **Boolean**

Read-only. **True** when the value is 0.

### IsTransparent

Syntax: *color*.**IsTransparent** As **Boolean**

Read-only. **True** only when the value is exactly `&H00FFFFFF`, the value of **CColor.Transparent**. A colour with alpha 0 and other channels is not reported as transparent.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim c As Color
c.Value = &H80FF0000
Debug.Print Hex$(c.argb)                                         ' 80FF0000
Debug.Print c.IsNull                                             ' False
Debug.Print Color(CColor.Transparent).IsTransparent              ' True
Debug.Print Color(0, 0, 0, 0).IsTransparent                      ' False
```

## Windows colours

Windows and Visual Basic keep a colour as a `COLORREF`, `&H00BBGGRR`, with red in the lowest byte. **Color** keeps it as `&HAARRGGBB`.

### RGB

Syntax: *color*.**RGB** As **Long**

Read-only. Returns the colour as `&H00RRGGBB`, without the alpha channel.

### BGR

Syntax: *color*.**BGR** [ = *colorref* ] As **Long**

Returns the colour as a `COLORREF`, `&H00BBGGRR`, which is the value of the `RGB` function and of a Visual Basic colour constant such as `vbRed`. Setting it takes a `COLORREF` and gives an opaque colour. This is the conversion to use for Windows colours.

> [!NOTE] 0.9.45.0
> **BGR** converts the colour values only. The system colours of Visual Basic, such as `vbButtonFace` (`&H8000000F`), are not translated to the colours that Windows currently uses: the setter gives a nearly black blue. Translate them first with the Windows function `OleTranslateColor`.

> [!NOTE] 0.9.45.0
> The methods of the package that take a plain **Long** colour (such as the constructors of **SolidBrush** and **Pen**) read it as `&H00RRGGBB`, not as a `COLORREF`, and make it opaque. `SolidBrush(vbRed)` is blue. Pass `Color(...)`, or a **Color** whose **BGR** you have set, to draw a Visual Basic colour.

### AsCOLORREF

Syntax: *color*.**AsCOLORREF**( ) As **Long**

> [!WARNING] 0.9.45.0
> **AsCOLORREF** returns `&H00RRGGBB`, the same as **RGB**, and not a `COLORREF`: red and blue are the wrong way round for Windows. Use **BGR**.

### FromCOLORREF, SetFromCOLORREF

Syntax: **FromCOLORREF**( *colorref* ) As **Color** \
Syntax: *color*.**SetFromCOLORREF**( *colorref* )

> [!WARNING] 0.9.45.0
> Both read the argument as `&H00RRGGBB` and swap red and blue: `FromCOLORREF(vbRed)` is blue. To convert a `COLORREF`, set **BGR** on a colour, or write `Color(255, c And &HFF, (c And &HFF00&) \ &H100, (c And &HFF0000) \ &H10000)`.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim c As Color = Color(&H22, &H33, &H44)
Debug.Print Hex$(c.RGB)                                          ' 223344
Debug.Print Hex$(c.BGR)                                          ' 443322
Dim fromWindows As Color
fromWindows.BGR = RGB(&H22, &H33, &H44)
Debug.Print Hex$(fromWindows.Value)                              ' FF223344
Dim cr As Long = &H443322
Dim byHand As Color = Color(255, cr And &HFF, (cr And &HFF00&) \ &H100, (cr And &HFF0000) \ &H10000)
Debug.Print Hex$(byHand.Value)                                   ' FF223344
```

## Red, green and blue as numbers

### GetRGBB, GetRGBI, GetRGBL

Syntax: *color*.**GetRGBB**( *r* As **Byte**, *g* As **Byte**, *b* As **Byte** ) \
Syntax: *color*.**GetRGBI**( *r* As **Integer**, *g* As **Integer**, *b* As **Integer** ) \
Syntax: *color*.**GetRGBL**( *r* As **Long**, *g* As **Long**, *b* As **Long** )

Return the three channels, 0 to 255, in variables of the given type.

### GetRGBS, GetRGBD

Syntax: *color*.**GetRGBS**( *r* As **Single**, *g* As **Single**, *b* As **Single** ) \
Syntax: *color*.**GetRGBD**( *r* As **Double**, *g* As **Double**, *b* As **Double** )

Return the three channels as percentages: 0 to 100.

### SetRGB

Syntax: *color*.**SetRGB**( *r*, *g*, *b* )

Sets the three channels from **Long** values, 0 to 255. A value outside the range is clamped to it. The alpha channel is not changed.

### SetRGBD

Syntax: *color*.**SetRGBD**( *r*, *g*, *b* )

Sets the three channels from **Double** values given as percentages, 0 to 100, clamped to that range. The alpha channel is not changed.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim c As Color = Color(&H80, 255, 0, 0)
Dim r As Long, g As Long, b As Long
c.GetRGBL r, g, b
Debug.Print r & " " & g & " " & b                                ' 255 0 0
Dim rs As Single, gs As Single, bs As Single
c.GetRGBS rs, gs, bs
Debug.Print rs & " " & gs & " " & bs                             ' 100 0 0
c.SetRGB 300, -5, 128
Debug.Print Hex$(c.Value)                                        ' 80FF0080
c.SetRGBD 100, 0, 0
Debug.Print Hex$(c.Value)                                        ' 80FF0000
```

## Hexadecimal text

### AsHexRGB, AsHexRGBA

Syntax: *color*.**AsHexRGB**( ) As **String** \
Syntax: *color*.**AsHexRGBA**( ) As **String**

Return the colour as `#rrggbb`, or as `#rrggbbaa`, in upper case hexadecimal.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim c As Color = Color(&H11, &H22, &H33, &H44)
Debug.Print c.AsHexRGB()                                         ' #223344
Debug.Print c.AsHexRGBA()                                        ' #22334411
```

## Hue, saturation and lightness

Hue is in degrees, from 0 up to but not including 360. Saturation, lightness and alpha are percentages, 0 to 100.

### GetHSL, GetHSLA

Syntax: *color*.**GetHSL**( *h* As **Single**, *s* As **Single**, *l* As **Single** ) \
Syntax: *color*.**GetHSLA**( *h* As **Single**, *s* As **Single**, *l* As **Single**, *a* As **Single** )

Return the hue, saturation and lightness, and for **GetHSLA** the alpha as well.

### SetHSL, SetHSLA

Syntax: *color*.**SetHSL**( *h*, *s*, *l* ) \
Syntax: *color*.**SetHSLA**( *h*, *s*, *l*, *a* )

Set the channels from a hue, saturation and lightness, clamped to their ranges. **SetHSL** keeps the alpha of the colour; **SetHSLA** sets it from *a*. A colour declared with `Dim` has alpha 0, so call **SetHSLA**, or set **Alpha**, to make it visible.

### RotatedHue, RotateHue

Syntax: *color*.**RotatedHue**( *degrees* ) As **Color** \
Syntax: *color*.**RotateHue**( *degrees* )

**RotatedHue** returns the colour with its hue turned by *degrees*, which may be negative or above 360. **RotateHue** changes the colour itself.

> [!WARNING] 0.9.45.0
> For any angle other than 0 the result has alpha 0, so it is invisible: `Color(255, 0, 0).RotatedHue(120)` is `&H0000FF00`. After **RotateHue** the colour itself is transparent. Set **Alpha** again on the result.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim orange As Color = Color(255, 128, 0)
Dim h As Single, s As Single, l As Single
orange.GetHSL h, s, l
Debug.Print Round(h) & " " & Round(s) & " " & Round(l)           ' 30 100 50
Dim c As Color = Color(255, 255, 255)
c.SetHSL 120, 100, 50
Debug.Print Hex$(c.Value)                                        ' FF00FF00
c.SetHSLA 240, 100, 50, 100
Debug.Print Hex$(c.Value)                                        ' FF0000FF
Dim red As Color = Color(255, 0, 0)
Dim green As Color = red.RotatedHue(120)
green.Alpha = red.Alpha
Debug.Print Hex$(green.Value)                                    ' FF00FF00
```

## Inverting

### Inverse

Syntax: *color*.**Inverse** [ = *source* ] As **Color**

Returns the colour with each of red, green and blue replaced by 255 less its value: the negative of the colour. The alpha channel is kept. Setting it makes the colour the inverse of *source*.

### Invert

Syntax: *color*.**Invert**

Replaces the colour by its inverse.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim c As Color = Color(&H22, &H33, &H44)
Debug.Print Hex$(c.Inverse.Value)                                ' FFDDCCBB
c.Invert
Debug.Print Hex$(c.Value)                                        ' FFDDCCBB
Dim z As Color
z.Inverse = Color(10, 20, 30)
Debug.Print Hex$(z.Value)                                        ' FFF5EBE1
```

## Functions

### MakeARGB

Syntax: **MakeARGB**( *a*, *r*, *g*, *b* ) As **Long**

Returns `&HAARRGGBB` from four **Long** values. Each is masked with `&HFF`.

### HueToValue

Syntax: **HueToValue**( *hue*, *m1*, *m2* ) As **Single**

The helper step of the conversion from hue to a channel, as in the HSL algorithm of CSS. *hue* is a fraction of a full turn from -1 to 1; *m1* and *m2* are the two lightness-derived values, 0 to 1, and the result is in the same range.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Debug.Print Hex$(MakeARGB(1, 2, 3, 4))                           ' 1020304
Debug.Print Hex$(MakeARGB(256, -1, 3, 4))                        ' FF0304
Debug.Print HueToValue(0.1, 0.2, 0.8)                            ' 0.56
```

## See Also

- [CColor](../Enumerations/CColor) enumeration -- the named colours
- [ColorMatrix](ColorMatrix) type -- transformations of colours
- [Types](.) -- the types of the package
- [Color](https://learn.microsoft.com/en-us/windows/win32/api/gdipluscolor/nl-gdipluscolor-color) -- the GDI+ class on Microsoft Learn
