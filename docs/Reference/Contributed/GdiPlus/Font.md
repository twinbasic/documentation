---
title: Font
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Font
has_toc: false
---

# Font class
{: .no_toc }

Describes a font by its family, size, style and unit, for drawing and measuring text.

A **Font** object is what [**Graphics.DrawString**](Graphics) and [**Graphics.MeasureString**](Graphics) take to draw and measure text. It holds one [**FontFamily**](FontFamily), a size, a style such as bold or italic, and the unit of the size. A **Font** is read-only after it is created: to change the size or the style, create another one. The class mirrors the GDI+ [Font](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusheaders/nl-gdiplusheaders-font) class.

> [!NOTE] 0.9.45.0
> In a project that references OLE Automation, which is the default, **Font** is also the name of a type of that library. A variable declared **As Font** therefore holds the OLE type, and assigning a GDI+ font to it raises run-time error -2147467262, *No such interface supported*. Declare the variable **As GdiPlus.Font**. The function **Font**( ) in the examples below resolves to the package without a prefix. A **New Font**( ... ) expression does not compile without the prefix either (TB5074), so write **New GdiPlus.Font**( ... ).

* TOC
{:toc}

## Creating

Every form of **Font** is available both as the constructor function **Font**( ... ) and as **New GdiPlus.Font**( ... ). The function is shorter, and the two are the same.

### From a family name

Syntax: *font* **= Font**( *familyName*, *emSize* [, *style* [, *unit* [, *fontCollection*]]] )

*familyName*
: *required* A **String** naming the font family, such as `"Segoe UI"`.

*emSize*
: *required* A **Single** with the size of the em square, in the unit given by *unit*. It must be greater than 0. A fractional literal such as `9.5` is a **Double** and the overloaded function refuses it (TB5073): write `9.5!`.

*style*
: *optional* A [**GpFontStyle**](Enumerations/GpFontStyle) value or a combination of them. The default is **FontStyleRegular**.

*unit*
: *optional* A [**GpUnit**](Enumerations/GpUnit) value for *emSize*. The default is **UnitPoint**.

*fontCollection*
: *optional* A [**FontCollection**](FontCollection) in which to look for the family. When it is omitted, the installed fonts are searched.

A *familyName* that is not found does not make the font unavailable. The font is created in the generic sans serif family instead, as the GDI+ C++ class does, and [**LastResult**](GdiPlusBase) stays **Ok**. To find out whether a name exists, create a [**FontFamily**](FontFamily) from it and read [**IsAvailable**](FontFamily#isavailable).

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim f As GdiPlus.Font = Font(GenericSansSerif(), 12!, FontStyleBold, UnitPixel)
Debug.Print f.IsAvailable    ' True
Debug.Print f.Size           ' 12
Debug.Print f.Style          ' 1
Debug.Print f.Unit           ' 2

' A name that does not exist falls back to the generic sans serif family.
Dim g As GdiPlus.Font = Font("No such family", 20, FontStyleItalic, UnitPixel)
Debug.Print g.IsAvailable                                                  ' True
Debug.Print g.Family.FamilyName = GenericSansSerif().FamilyName            ' True
```

### From a family

Syntax: *font* **= Font**( *family*, *emSize* [, *style* [, *unit* [, *fontCollection*]]] )

*family*
: *required* A [**FontFamily**](FontFamily).

The other parameters are as for a family name. A *family* that is not available gives a font that is not available: [**IsAvailable**](#isavailable) returns **False** and **LastResult** is **InvalidParameter**. So does an *emSize* of 0 or less.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim fam As FontFamily = GenericSerif()
Dim f As GdiPlus.Font = Font(fam, 9.5!, FontStyleBold Or FontStyleItalic)
Debug.Print f.Size    ' 9.5
Debug.Print f.Style   ' 3
Debug.Print f.Unit    ' 3

Dim bad As GdiPlus.Font = Font(FontFamily("No such family"), 12!)
Debug.Print bad.IsAvailable    ' False
Debug.Print bad.LastResult     ' 2
```

### From a device context

Syntax: *font* **= Font**( *hdc* )

Syntax: *font* **= Font**( *hdc*, *hfont* )

Syntax: *font* **= Font**( *hdc*, *logfont* )

*hdc*
: *required* A **LongPtr** handle of a device context.

*hfont*
: *required* A **LongPtr** handle of a GDI font. The package reads the description of that font and creates the GDI+ font from it, in the context of *hdc*. When *hfont* is 0, or its description cannot be read, the font currently selected into *hdc* is used instead.

*logfont*
: *required* A **LOGFONTA** or **LOGFONTW** structure (the package's `GDIP_LOGFONTA` and `GDIP_LOGFONTW` types) that describes the font.

**Font**( *hdc* ) creates a font from the font currently selected into the device context. GDI+ draws only TrueType and OpenType fonts. For any other font, such as the raster font a new bitmap's device context starts with, the result is a font that is not available, and **LastResult** is **NotTrueTypeFont**.

```tb check_build
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(40!, 40!)
Dim g As Graphics = Graphics(bmp)
Dim dc As LongPtr = g.GetHDC()
Dim f As GdiPlus.Font = Font(dc)
g.ReleaseHDC dc
If Not f.IsAvailable Then Debug.Print "Not a TrueType font: status " & f.LastResult
```

### Clone

Syntax: *copy* **=** *font*.**Clone**( )

Returns a new **Font** with the same family, size, style and unit.

## Size and style

### Family
{: .no_toc }

Syntax: *font*.**Family**

Returns a [**FontFamily**](FontFamily) object for the font's family.

### IsAvailable
{: .no_toc }

Syntax: *font*.**IsAvailable**

Returns **True** when the object holds a GDI+ font, and **False** when creating it failed. Read [**LastResult**](GdiPlusBase) for the reason.

### Size
{: .no_toc }

Syntax: *font*.**Size**

Returns a **Single** with the size of the em square, in the font's [**Unit**](#unit).

### Style
{: .no_toc }

Syntax: *font*.**Style**

Returns the [**GpFontStyle**](Enumerations/GpFontStyle) value or combination of values that the font was created with.

### Unit
{: .no_toc }

Syntax: *font*.**Unit**

Returns the [**GpUnit**](Enumerations/GpUnit) value of [**Size**](#size).

## Metrics

The metrics of a font come from its family's design-unit values ([**EmHeight**](FontFamily#emheight), [**CellAscent**](FontFamily#cellascent), [**CellDescent**](FontFamily#celldescent) and [**LineSpacing**](FontFamily#linespacing) of the family, for the font's style), scaled by the font's size. [**Ascent**](#ascent), [**Descent**](#descent) and [**LineSpacing**](#linespacing) are in the font's [**Unit**](#unit); [**GetHeight**](#getheight) is in pixels or in the unit of a **Graphics** object. They return 0 when the family's metrics cannot be read.

### Ascent
{: .no_toc }

Syntax: *font*.**Ascent**

Returns a **Single** with the distance from the top of a line of text to its baseline, in the font's unit: *Size* x *CellAscent* / *EmHeight*.

### Descent
{: .no_toc }

Syntax: *font*.**Descent**

Returns a **Single** with the distance from the baseline to the bottom of a line of text, in the font's unit: *Size* x *CellDescent* / *EmHeight*.

### LineSpacing
{: .no_toc }

Syntax: *font*.**LineSpacing**

Returns a **Single** with the distance between the baselines of two consecutive lines, in the font's unit: *Size* x *LineSpacing* / *EmHeight*, where the last *LineSpacing* is the family's.

### GetHeight
{: .no_toc }

Syntax: *height* **=** *font*.**GetHeight**( *graphics* )

Syntax: *height* **=** *font*.**GetHeight**( *dpi* )

*graphics*
: *required* A [**Graphics**](Graphics) object. The result is in the page unit of that object, and depends on its resolution.

*dpi*
: *required* A **Single** with the number of pixels per inch of the device.

Returns a **Single** with the line spacing of the font. With *dpi*, the result is in pixels for a device of that resolution. A font in pixels has the same height at every resolution, and a font in points has a height proportional to the resolution, equal to [**LineSpacing**](#linespacing) at 72 pixels per inch.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim px As GdiPlus.Font = Font(GenericSansSerif(), 20!, FontStyleRegular, UnitPixel)
Debug.Print Abs(px.GetHeight(96!) - px.LineSpacing) < 0.01       ' True
Debug.Print Abs(px.GetHeight(300!) - px.LineSpacing) < 0.01      ' True

Dim pt As GdiPlus.Font = Font(GenericSansSerif(), 10!, FontStyleRegular, UnitPoint)
Debug.Print Abs(pt.GetHeight(72!) - pt.LineSpacing) < 0.01       ' True
Debug.Print Abs(pt.GetHeight(144!) - 2 * pt.LineSpacing) < 0.01  ' True
Debug.Print px.Ascent > 0 And px.Descent > 0                     ' True
```

## Interoperating with GDI

### GetLogFontA, GetLogFontW
{: .no_toc }

Syntax: *logfont* **=** *font*.**GetLogFontA**( *graphics* )

Syntax: *logfont* **=** *font*.**GetLogFontW**( *graphics* )

Syntax: *status* **=** *font*.**GetLogFontA**( *graphics*, *logfont* )

Syntax: *status* **=** *font*.**GetLogFontW**( *graphics*, *logfont* )

*graphics*
: *required* A [**Graphics**](Graphics) object. Its page unit and resolution convert the font's size to the height in the structure.

*logfont*
: *required* A **LOGFONTA** or **LOGFONTW** structure that receives the description.

Returns a **LOGFONTA** or **LOGFONTW** structure (the package's `GDIP_LOGFONTA` and `GDIP_LOGFONTW` types) that describes the font, in a form that the GDI function **CreateFontIndirect** accepts. The second form of each fills a structure that the caller owns and returns a [**GpStatus**](Enumerations/GpStatus). The height is negative: a pixel font of 20 pixels gives -20.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim f As GdiPlus.Font = Font(GenericSansSerif(), 20!, FontStyleBold, UnitPixel)
Dim bmp As Bitmap = Bitmap(10!, 10!)
Dim g As Graphics = Graphics(bmp)
Dim lf As Any = f.GetLogFontW(g)
Debug.Print lf.LFHeight   ' -20
Debug.Print lf.LFWeight   ' 700
```

## See Also

- [FontFamily](FontFamily) class -- a family of fonts, and its design metrics
- [FontCollection](FontCollection) class -- a set of font families to take a font from
- [StringFormat](StringFormat) class -- the layout of the text that a **Font** draws
- [Graphics](Graphics) class -- **DrawString** and **MeasureString**
- [Enumerations/GpFontStyle](Enumerations/GpFontStyle) -- the styles
- [Font class](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusheaders/nl-gdiplusheaders-font) -- Microsoft's GDI+ reference
