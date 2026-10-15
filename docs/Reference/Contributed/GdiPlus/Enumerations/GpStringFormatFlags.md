---
title: GpStringFormatFlags
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpStringFormatFlags
---

# GpStringFormatFlags enumeration
{: .no_toc }

Specifies text layout (such as direction and clipping) and display options (such as digit substitution and fallback fonts).

The members combine with **Or**. They are the *flags* argument of the **StringFormat** constructor and the **Flags** property of [**StringFormat**](../StringFormat), which also has a Boolean property for most of them.

When **StringFormatFlagsDirectionVertical** and **StringFormatFlagsDirectionRightToLeft** are both set, lines of text are drawn vertically and the first line starts at the right edge of the layout rectangle. With only **StringFormatFlagsDirectionVertical** the first line starts at the left edge. With only **StringFormatFlagsDirectionRightToLeft** the lines are horizontal and the reading order is from right to left; this changes the order in which the text is read, not the order in which the characters are displayed. Both flags can affect string alignment.

| Member | Value | Description |
|:-------|:------|:------------|
| **StringFormatFlagsDirectionRightToLeft**{: #StringFormatFlagsDirectionRightToLeft } | `&H00000001` | The reading order is right to left. For horizontal text the characters are read from right to left, and for vertical text the columns. By default text is read from left to right. |
| **StringFormatFlagsDirectionVertical**{: #StringFormatFlagsDirectionVertical } | `&H00000002` | The lines of text are drawn vertically. By default lines are horizontal, each new line below the previous one. |
| **StringFormatFlagsNoFitBlackBox**{: #StringFormatFlagsNoFitBlackBox } | `&H00000004` | Parts of characters are allowed to overhang the layout rectangle. By default GDI+ first aligns characters inside the rectangle and then moves the ones that still overhang, so that no pixel outside it is affected. Setting the flag makes an overhanging character, such as an italic f, align visually with the lines above and below, but parts of it outside the rectangle can be clipped or painted. |
| **StringFormatFlagsDisplayFormatControl**{: #StringFormatFlagsDisplayFormatControl } | `&H00000020` | Unicode layout control characters are displayed with a representative character. |
| **StringFormatFlagsNoFontFallback**{: #StringFormatFlagsNoFontFallback } | `&H00000400` | No alternate font is used for characters that the requested font lacks. They are displayed with the missing-glyph character of the font, usually an open square. By default GDI+ falls back to another font. |
| **StringFormatFlagsMeasureTrailingSpaces**{: #StringFormatFlagsMeasureTrailingSpaces } | `&H00000800` | The space at the end of each line is included in a string measurement. By default the measured rectangle leaves it out. |
| **StringFormatFlagsNoWrap**{: #StringFormatFlagsNoWrap } | `&H00001000` | Text does not wrap to the next line. This is implied when the text is drawn at a point instead of in a rectangle. By default text in a rectangle breaks at the last word boundary inside the rectangle. |
| **StringFormatFlagsLineLimit**{: #StringFormatFlagsLineLimit } | `&H00002000` | Only whole lines are laid out in the layout rectangle. By default the last line can be partly cut off by a rectangle whose height is not a multiple of the line height. |
| **StringFormatFlagsNoClip**{: #StringFormatFlagsNoClip } | `&H00004000` | Characters and text that extend outside the layout rectangle are shown. By default they are clipped, and so are trailing spaces that extend outside it, which also affects a measurement that includes trailing spaces. |
| **StringFormatFlagsBypassGDI**{: #StringFormatFlagsBypassGDI } | `&H80000000` | Microsoft gives no description. [**StringFormat**](../StringFormat) has a **BypassGDI** property for it. |

## Used by

- [**StringFormat**](../StringFormat) class: [**Flags**](../StringFormat#flags), [**FormatFlags**](../StringFormat#flags), [constructor](../StringFormat#creating)

## Example

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim format As StringFormat = StringFormat(StringFormatFlagsNoWrap Or StringFormatFlagsLineLimit)
Debug.Print Hex$(format.Flags)
Debug.Print format.NoWrap, format.LineLimit, format.NoClip

format.NoClip = True
Debug.Print Hex$(format.Flags)
' Output:
' 3000
' True          True          False
' 7000
```

## See Also

- [StringFormatFlags](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-stringformatflags) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [StringFormat](../StringFormat) class
