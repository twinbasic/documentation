---
title: FontFamily
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/FontFamily
has_toc: false
---

# FontFamily class
{: .no_toc }

A set of fonts that share a typeface design and differ in style, such as Arial regular, bold and italic.

A **FontFamily** tells which styles a typeface supports and gives its design metrics. It is what a [**Font**](Font) is created from. Three generic families, [**GenericSansSerif**](#generic-families), **GenericSerif** and **GenericMonospace**, always exist. The class mirrors the GDI+ [FontFamily](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusheaders/nl-gdiplusheaders-fontfamily) class.

* TOC
{:toc}

## Creating

Syntax: *family* **= FontFamily**( *name* [, *fontCollection*] )

Syntax: *family* **= New FontFamily**( *name* [, *fontCollection*] )

*name*
: *required* A **String** with the name of the family, such as `"Arial"`.

*fontCollection*
: *optional* A [**FontCollection**](FontCollection) in which to look for the family. When it is omitted, the installed fonts are searched.

Creating a family does not fail when the name is unknown. The object is created, [**IsAvailable**](#isavailable) returns **False**, and **LastResult** is **FontFamilyNotFound**. Every other member then fails with **InvalidParameter** and returns an empty value.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim missing As FontFamily = FontFamily("No such family")
Debug.Print missing.IsAvailable    ' False
Debug.Print missing.LastResult     ' 14
Debug.Print missing.IsBoldAvailable    ' False
Debug.Print missing.LastResult         ' 2
```

### Clone

Syntax: *copy* **=** *family*.**Clone**( )

Returns a new **FontFamily** for the same family.

## Generic families

Syntax: *family* **= GenericSansSerif**( )

Syntax: *family* **= GenericSerif**( )

Syntax: *family* **= GenericMonospace**( )

Each function returns a family that exists on every system, which makes it the safe choice for a font that must not fail. The families are a sans serif face, a serif face and a fixed-pitch face. Windows decides which installed font stands for each. The object is created on the first call and every later call returns the same object.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim a As FontFamily = GenericSansSerif()
Debug.Print a.IsAvailable                          ' True
Debug.Print a Is GenericSansSerif()                ' True
Debug.Print GenericSerif() Is GenericSansSerif()   ' False
Debug.Print GenericMonospace().IsAvailable         ' True
```

## Name and availability

### FamilyName
{: .no_toc }

Syntax: *name* **=** *family*.**FamilyName** [ ( *language* ) ]

*language*
: *optional* An **Integer** language identifier (a `LANGID`) that selects the language of the name. The default 0 is the neutral language, which gives the name in the language of the system. For example, 1033 asks for US English.

Returns a **String** with the name of the family. The result is an empty string when the family is not available.

> [!WARNING] 0.9.45.0
> **FamilyName** returns the name followed by a NUL character (`vbNullChar`). The name read back therefore does not equal the name that was given: `FontFamily("Arial").FamilyName = "Arial"` is **False**. Remove the character before comparing or displaying the name, for example with `Replace(name, vbNullChar, "")`. Passing the name, with its NUL, to **FontFamily**( ) or to **Font**( ) still finds the family.
>
> ```tb check_build check_run
> Dim user As GdiPlusUser = GdiPlusUser()
>
> Dim name As String = GenericSansSerif().FamilyName
> Debug.Print InStr(name, vbNullChar) = Len(name)                              ' True
> Debug.Print Len(Replace(name, vbNullChar, "")) = Len(name) - 1               ' True
> Debug.Print FontFamily(Replace(name, vbNullChar, "")).IsAvailable            ' True
> ```

### IsAvailable
{: .no_toc }

Syntax: *family*.**IsAvailable**

Returns **True** when the object holds a GDI+ font family, and **False** when creating it failed.

### IsStyleAvailable
{: .no_toc }

Syntax: *available* **=** *family*.**IsStyleAvailable**( *style* )

*style*
: *required* A [**GpFontStyle**](Enumerations/GpFontStyle) value.

Returns **True** when the family has fonts of that style. A [**Font**](Font) created with a style that its family lacks is not available, and its **LastResult** is **FontStyleNotFound**.

### IsBoldAvailable, IsItalicAvailable, IsBoldItalicAvailable, IsUnderlinedAvailable, IsStrikeoutAvailable
{: .no_toc }

Syntax: *family*.**IsBoldAvailable**

Each property returns **True** when the family has fonts of the style in its name. They are the same as **IsStyleAvailable** called with **FontStyleBold**, **FontStyleItalic**, **FontStyleBoldItalic**, **FontStyleUnderline** and **FontStyleStrikeout**.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim ff As FontFamily = GenericSansSerif()
Debug.Print ff.IsStyleAvailable(FontStyleRegular)    ' True
Debug.Print ff.IsBoldAvailable = ff.IsStyleAvailable(FontStyleBold)    ' True
Debug.Print ff.IsItalicAvailable = ff.IsStyleAvailable(FontStyleItalic)    ' True
```

## Design metrics

The four properties return **Integer** values in the design units of the font file, a grid that depends on the typeface. For example, many TrueType fonts use 2048 units to the em. The values are not pixels: scale them by the size of a font, as in *Size* x *CellAscent* / *EmHeight*. A [**Font**](Font) does this scaling in its [**Ascent**](Font#ascent), [**Descent**](Font#descent) and [**LineSpacing**](Font#linespacing) properties. All four take the style, because the metrics of a bold or italic font can differ from the regular ones.

### EmHeight
{: .no_toc }

Syntax: *units* **=** *family*.**EmHeight**( *style* )

Returns the height of the em square, in design units.

### CellAscent
{: .no_toc }

Syntax: *units* **=** *family*.**CellAscent**( *style* )

Returns the height of the character cell above the baseline, in design units.

### CellDescent
{: .no_toc }

Syntax: *units* **=** *family*.**CellDescent**( *style* )

Returns the height of the character cell below the baseline, in design units.

### LineSpacing
{: .no_toc }

Syntax: *units* **=** *family*.**LineSpacing**( *style* )

Returns the distance between the baselines of two consecutive lines, in design units.

All four take a [**GpFontStyle**](Enumerations/GpFontStyle) value as *style*.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim ff As FontFamily = GenericSansSerif()
Dim em As Long = ff.EmHeight(FontStyleRegular)
Dim size As Single = 20!

Dim f As GdiPlus.Font = Font(ff, size, FontStyleRegular, UnitPixel)
Debug.Print Abs(f.Ascent - size * ff.CellAscent(FontStyleRegular) / em) < 0.01     ' True
Debug.Print Abs(f.LineSpacing - size * ff.LineSpacing(FontStyleRegular) / em) < 0.01   ' True
```

## See Also

- [Font](Font) class -- a font created from a family
- [FontCollection](FontCollection) class -- a set of families
- [Enumerations/GpFontStyle](Enumerations/GpFontStyle) -- the styles
- [FontFamily class](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusheaders/nl-gdiplusheaders-fontfamily) -- Microsoft's GDI+ reference
