---
title: GpFontStyle
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpFontStyle
---

# GpFontStyle enumeration
{: .no_toc }

Specifies the style of a font. Styles can be combined.

The members combine with **Or**. **FontStyleBoldItalic** is the combination of **FontStyleBold** and **FontStyleItalic**; **FontStyleRegular** is no style at all.

| Member | Value | Description |
|:-------|:------|:------------|
| **FontStyleRegular**{: #FontStyleRegular } | `0` | Normal text. |
| **FontStyleBold**{: #FontStyleBold } | `1` | Bold text. |
| **FontStyleItalic**{: #FontStyleItalic } | `2` | Italic text. |
| **FontStyleBoldItalic**{: #FontStyleBoldItalic } | `3` | Bold and italic text. |
| **FontStyleUnderline**{: #FontStyleUnderline } | `4` | Underlined text. |
| **FontStyleStrikeout**{: #FontStyleStrikeout } | `8` | Text with a line through the middle. |

## Used by

- [**Font**](../Font) class: [**Style**](../Font#style), [constructor](../Font#creating)
- [**FontFamily**](../FontFamily) class: [**CellAscent**](../FontFamily#cellascent), [**CellDescent**](../FontFamily#celldescent), [**EmHeight**](../FontFamily#emheight), [**IsStyleAvailable**](../FontFamily#isstyleavailable), [**LineSpacing**](../FontFamily#linespacing)

## Example

```tb check_build check_run
Dim style As GpFontStyle = FontStyleBold Or FontStyleItalic Or FontStyleUnderline
Debug.Print style
Debug.Print (style And FontStyleBold) <> 0
Debug.Print (style And FontStyleStrikeout) <> 0
Debug.Print (style And FontStyleBoldItalic) = FontStyleBoldItalic
' Output:
' 7
' True
' False
' True
```

## See Also

- [FontStyle](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-fontstyle) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Font](../Font) class
- [FontFamily](../FontFamily) class
