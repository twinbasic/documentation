---
title: StringFormat
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/StringFormat
has_toc: false
---

# StringFormat class
{: .no_toc }

Describes how a string is laid out when it is drawn or measured: alignment, wrapping, trimming, tab stops and more.

A **StringFormat** is passed to the **DrawString** and **MeasureString** methods of [**Graphics**](Graphics), beside the [**Font**](Font) and the layout rectangle. A format that is omitted gives the default layout: the text is aligned to the top left, wraps at the edge of the rectangle, and is trimmed to a whole character. The settings of a format are independent of each other, and each is set by a property, or by a **Set...** method that names the value. The class mirrors the GDI+ [StringFormat](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusstringformat/nl-gdiplusstringformat-stringformat) class.

* TOC
{:toc}

## Creating

Syntax: *format* **= StringFormat**( [ *flags* [, *language*] ] )

Syntax: *format* **= New StringFormat**( [ *flags* [, *language*] ] )

*flags*
: *optional* A [**GpStringFormatFlags**](Enumerations/GpStringFormatFlags) value or a combination of them. The default is 0: no flag is set.

*language*
: *optional* An **Integer** language identifier (a `LANGID`) for the language of the strings. The default is 0, the neutral language.

A new format has these other settings: near alignment in both directions, trimming to a whole character, no hot key processing, no tab stops, no measurable character ranges and the digit substitution method **StringDigitSubstituteUser**.

### Clone

Syntax: *copy* **=** *format*.**Clone**( )

Returns a new **StringFormat** with the same settings.

### GenericDefaultStringFormat, GenericTypographicStringFormat

Syntax: *format* **= GenericDefaultStringFormat**( )

Syntax: *format* **= GenericTypographicStringFormat**( )

**GenericDefaultStringFormat** returns the format that GDI+ uses when none is given. It has no flags, near alignment and trimming to a whole character. **GenericTypographicStringFormat** returns a format for typographic layout, with the flags **NoFitBlackBox**, **LineLimit** and **NoClip** and no trimming.

> [!NOTE] 0.9.45.0
> Both functions return the shared generic format of GDI+, not a copy. Changing the object changes the generic format for the whole program, and a later call returns the changed format. Call [**Clone**](#clone) and change the copy instead.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim d As StringFormat = GenericDefaultStringFormat()
Debug.Print d.Flags                 ' 0
Debug.Print d.IsTrimmingCharacter   ' True

Dim t As StringFormat = GenericTypographicStringFormat()
Debug.Print t.NoFitBlackBox & " " & t.LineLimit & " " & t.NoClip   ' True True True
Debug.Print t.IsTrimmingNone                                      ' True

' The generic format is shared: this change is seen by every later call.
d.NoWrap = True
Debug.Print GenericDefaultStringFormat().NoWrap   ' True
d.NoWrap = False

Dim mine As StringFormat = GenericDefaultStringFormat().Clone()
mine.NoWrap = True
Debug.Print GenericDefaultStringFormat().NoWrap   ' False
```

## Format flags

### Flags
{: .no_toc }

Syntax: *format*.**Flags** [ **=** *flags* ]

Returns or sets all the flags together, as a [**GpStringFormatFlags**](Enumerations/GpStringFormatFlags) combination. **FormatFlags** is an older name of the same property, kept for compatibility.

### The flag properties
{: .no_toc }

Syntax: *format*.**NoWrap** [ **=** *value* ]

Each of these properties is a **Boolean** that reads or sets one flag and leaves the others as they are.

| Property | Flag | When **True** |
|:---------|:-----|:--------------|
| **DirectionRightToLeft** | **StringFormatFlagsDirectionRightToLeft** | The text is laid out from right to left. |
| **DirectionVertical** | **StringFormatFlagsDirectionVertical** | The lines of text are vertical, not horizontal. |
| **NoFitBlackBox** | **StringFormatFlagsNoFitBlackBox** | Parts of a glyph may extend beyond the layout rectangle. By default GDI+ moves the glyph to keep it inside. |
| **DisplayFormatControl** | **StringFormatFlagsDisplayFormatControl** | Control characters, such as the right-to-left mark, are drawn with a representative glyph. |
| **NoFontFallback** | **StringFormatFlagsNoFontFallback** | A character that the font lacks is not drawn with another font. It is drawn with the font's missing-character glyph, usually an open square. |
| **MeasureTrailingSpaces** | **StringFormatFlagsMeasureTrailingSpaces** | The bounding box of a measured string includes the spaces at the end of each line. By default it does not. |
| **NoWrap** | **StringFormatFlagsNoWrap** | The text is not wrapped to the next line at the edge of the layout rectangle. |
| **LineLimit** | **StringFormatFlagsLineLimit** | Only whole lines are laid out in the rectangle. By default a line that fits only in part is drawn in part. |
| **NoClip** | **StringFormatFlagsNoClip** | The text is not clipped to the layout rectangle: glyphs that extend beyond it, and text that falls outside it, are drawn. |
| **BypassGDI** | **StringFormatFlagsBypassGDI** | A flag that GDI+ declares. Microsoft's documentation does not describe its effect. |

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim sf As StringFormat = StringFormat(StringFormatFlagsNoWrap)
Debug.Print sf.NoWrap & " " & sf.LineLimit    ' True False

sf.LineLimit = True
sf.DirectionRightToLeft = True
Debug.Print sf.Flags    ' 12289
Debug.Print sf.Flags = (StringFormatFlagsNoWrap Or StringFormatFlagsLineLimit Or StringFormatFlagsDirectionRightToLeft)    ' True

sf.NoWrap = False
Debug.Print sf.Flags    ' 8193
```

## Horizontal alignment

The alignment places each line along its direction. **StringAlignmentNear** is the left edge for left-to-right text, the right edge for right-to-left text and the top for vertical text. **StringAlignmentFar** is the opposite edge, and **StringAlignmentCenter** the middle. The values are [**GpStringAlignment**](Enumerations/GpStringAlignment).

### Alignment
{: .no_toc }

Syntax: *format*.**Alignment** [ **=** *alignment* ]

Returns or sets the alignment.

> [!WARNING] 0.9.45.0
> Reading **Alignment** fails. It returns **StringAlignmentNear** (0) whatever the alignment is, and sets **LastResult** to **InvalidParameter**. The read-only properties **IsAlignmentNear**, **IsAlignmentCenter** and **IsAlignmentFar** are wrong for the same reason: **IsAlignmentNear** always returns **True**, and the other two always return **False**. Setting the alignment works, with the property or with the **SetAlignment...** methods, so keep the value in a variable if the program needs to read it back. If the error strategy is **RaiseErrors**, the read raises an error.
>
> ```tb check_build check_run
> Dim user As GdiPlusUser = GdiPlusUser()
>
> Dim sf As StringFormat = StringFormat()
> sf.Alignment = StringAlignmentCenter
> Debug.Print sf.Alignment            ' 0
> Debug.Print sf.LastResult           ' 2
> Debug.Print sf.IsAlignmentNear      ' True
> Debug.Print sf.IsAlignmentCenter    ' False
> ```

### SetAlignmentNear, SetAlignmentCenter, SetAlignmentFar
{: .no_toc }

Syntax: *format*.**SetAlignmentFar**

Each method sets the alignment to the value in its name.

### IsAlignmentNear, IsAlignmentCenter, IsAlignmentFar
{: .no_toc }

Syntax: *format*.**IsAlignmentNear**

Each read-only property returns **True** when the alignment is the value in its name. They are unreliable: see the warning on **Alignment**.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(100!, 30!)
Dim g As Graphics = Graphics(bmp)
Dim f As GdiPlus.Font = Font(GenericSansSerif(), 12!)
Dim black As SolidBrush = SolidBrush(Color(255, 0, 0, 0))
Dim layout As GpRectF = GpRectF(0, 0, 100, 30)
Dim sf As StringFormat = StringFormat()
sf.SetAlignmentFar

g.Clear White
g.DrawString "I", f, layout, sf, black

' Find the dark pixels: with far alignment they are all in the right half.
Dim x As Long, y As Long, inkLeft As Boolean, inkRight As Boolean
For y = 0 To 29
    For x = 0 To 99
        If bmp.Pixel(x, y).argb <> White Then
            If x < 50 Then inkLeft = True Else inkRight = True
        End If
    Next
Next
Debug.Print inkLeft & " " & inkRight    ' False True
```

## Vertical alignment

The line alignment places the block of lines across the direction of the text: **StringAlignmentNear** is the top of the layout rectangle for horizontal text, **StringAlignmentFar** the bottom, and **StringAlignmentCenter** the middle.

### LineAlignment
{: .no_toc }

Syntax: *format*.**LineAlignment** [ **=** *alignment* ]

Returns or sets the line alignment, a [**GpStringAlignment**](Enumerations/GpStringAlignment) value.

### SetLineAlignmentNear, SetLineAlignmentCenter, SetLineAlignmentFar
{: .no_toc }

Syntax: *format*.**SetLineAlignmentCenter**

Each method sets the line alignment to the value in its name.

### IsLineAlignmentNear, IsLineAlignmentCenter, IsLineAlignmentFar
{: .no_toc }

Syntax: *format*.**IsLineAlignmentNear**

Each read-only property returns **True** when the line alignment is the value in its name.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim sf As StringFormat = StringFormat()
sf.SetLineAlignmentCenter
Debug.Print sf.LineAlignment & " " & sf.IsLineAlignmentCenter   ' 1 True

sf.LineAlignment = StringAlignmentFar
Debug.Print sf.IsLineAlignmentFar & " " & sf.IsLineAlignmentNear   ' True False
```

## Hot key prefix

A hot key prefix is the ampersand (`&`) that marks the character before which an access key is shown, as in `&File`. The values are [**GpHotkeyPrefix**](Enumerations/GpHotkeyPrefix). The default, **HotkeyPrefixNone**, draws the ampersand as it is.

### HotkeyPrefix
{: .no_toc }

Syntax: *format*.**HotkeyPrefix** [ **=** *prefix* ]

Returns or sets how the ampersand is processed: **HotkeyPrefixNone** draws it, **HotkeyPrefixShow** removes it and underlines the next character, and **HotkeyPrefixHide** removes it and does not underline.

### SetHotkeyPrefixNone, SetHotkeyPrefixShow, SetHotkeyPrefixHide
{: .no_toc }

Syntax: *format*.**SetHotkeyPrefixShow**

Each method sets the processing to the value in its name.

### IsHotkeyPrefixNone, IsHotkeyPrefixShow, IsHotkeyPrefixHide
{: .no_toc }

Syntax: *format*.**IsHotkeyPrefixShow**

Each read-only property returns **True** when the processing is the value in its name.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim sf As StringFormat = StringFormat()
Debug.Print sf.IsHotkeyPrefixNone    ' True

sf.SetHotkeyPrefixShow
Debug.Print sf.HotkeyPrefix & " " & sf.IsHotkeyPrefixShow    ' 1 True

sf.HotkeyPrefix = HotkeyPrefixHide
Debug.Print sf.HotkeyPrefix & " " & sf.IsHotkeyPrefixHide    ' 2 True
```

## Trimming

Trimming decides what happens to the end of a line that does not fit in the layout rectangle. The values are [**GpStringTrimming**](Enumerations/GpStringTrimming). The default is **StringTrimmingCharacter**.

| Value | The line is |
|:------|:------------|
| **StringTrimmingNone** | Not trimmed. |
| **StringTrimmingCharacter** | Cut at the last character that fits. |
| **StringTrimmingWord** | Cut at the last word that fits. |
| **StringTrimmingEllipsisCharacter** | Cut at the last character that fits, and an ellipsis is added. |
| **StringTrimmingEllipsisWord** | Cut at the last word that fits, and an ellipsis is added. |
| **StringTrimmingEllipsisPath** | Shortened in the middle: the centre is removed and replaced by an ellipsis, and as much as possible of the last part of a path is kept. |

### Trimming
{: .no_toc }

Syntax: *format*.**Trimming** [ **=** *trimming* ]

Returns or sets the trimming.

### SetTrimmingNone, SetTrimmingCharacter, SetTrimmingWord, SetTrimmingEllipsisCharacter, SetTrimmingEllipsisWord, SetTrimmingEllipsisPath
{: .no_toc }

Syntax: *format*.**SetTrimmingEllipsisWord**

Each method sets the trimming to the value in its name.

### IsTrimmingNone, IsTrimmingCharacter, IsTrimmingWord, IsTrimmingEllipsisCharacter, IsTrimmingEllipsisWord, IsTrimmingEllipsisPath
{: .no_toc }

Syntax: *format*.**IsTrimmingWord**

Each read-only property returns **True** when the trimming is the value in its name.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim sf As StringFormat = StringFormat()
Debug.Print sf.Trimming & " " & sf.IsTrimmingCharacter    ' 1 True

sf.SetTrimmingEllipsisPath
Debug.Print sf.Trimming & " " & sf.IsTrimmingEllipsisPath    ' 5 True

sf.Trimming = StringTrimmingEllipsisWord
Debug.Print sf.IsTrimmingEllipsisWord & " " & sf.IsTrimmingEllipsisPath    ' True False
```

## Tab stops

Tab stops set where a tab character in the text moves the characters after it. The first tab stop is measured from an initial offset, which is measured from the string's origin, and each later tab stop from the one before it.

### TabStopCount
{: .no_toc }

Syntax: *format*.**TabStopCount**

Returns a **Long** with the number of tab stops that are set.

### SetTabStops
{: .no_toc }

Syntax: *status* **=** *format*.**SetTabStops**( *firstTabOffset*, *tabStops*() )

Syntax: *status* **=** *format*.**SetTabStops**( *firstTabOffset*, *count*, *tabStops* )

*firstTabOffset*
: *required* A **Single** with the initial offset, the distance from the origin of the string to the point that the first tab stop is measured from.

*tabStops*
: *required* In the first form, an array of **Single** values, each the distance between a tab stop and the one before it. The lower bound of the array does not matter. In the second form, the first element of such an array, passed **ByRef**.

*count*
: *required* A **Long** with the number of elements to take, in the second form.

Replaces the tab stops of the format and returns a [**GpStatus**](Enumerations/GpStatus).

### GetTabStops
{: .no_toc }

Syntax: *tabStops* **=** *format*.**GetTabStops**( *firstTabOffset* )

Syntax: *status* **=** *format*.**GetTabStops**( *count*, *firstTabOffset*, *tabStops* )

*firstTabOffset*
: *required* A **Single** variable that receives the first tab offset.

*count*
: *required* A **Long** with the number of elements to read, in the second form.

*tabStops*
: *required* In the second form, the first element of an array of **Single** values with room for *count* elements. It receives the tab stops.

The first form returns the tab stops as a one-based array of **Single** values. The second form fills an array that the caller has made and returns a [**GpStatus**](Enumerations/GpStatus).

> [!WARNING] 0.9.45.0
> The first form of **GetTabStops** does not return the first tab offset: the variable passed for *firstTabOffset* receives 0, whatever offset was set. The array it returns is correct. The second form returns the offset correctly, so use it when the offset is needed.
>
> ```tb check_build check_run
> Dim user As GdiPlusUser = GdiPlusUser()
>
> Dim sf As StringFormat = StringFormat()
> Dim tabs(0 To 1) As Single
> tabs(0) = 4: tabs(1) = 8
> Debug.Print sf.SetTabStops(5, tabs)   ' 0
>
> Dim first As Single
> Dim got() As Single = sf.GetTabStops(first)
> Debug.Print first & " " & got(1) & " " & got(2)   ' 0 4 8
>
> Dim back(0 To 1) As Single
> Debug.Print sf.GetTabStops(2, first, back(0))     ' 0
> Debug.Print first & " " & back(0) & " " & back(1) ' 5 4 8
> ```

## Digit substitution

Digit substitution draws the digits 0 to 9 of a string with the digits of another script, such as Arabic-Indic digits. The language says which script. The methods are [**GpStringDigitSubstitute**](Enumerations/GpStringDigitSubstitute) values: **StringDigitSubstituteUser** follows the user's regional settings, **StringDigitSubstituteNone** turns the substitution off, **StringDigitSubstituteNational** uses the digits of the official language of the locale and **StringDigitSubstituteTraditional** uses the digits of the user's native script, which can be a different language. A language identifier is an **Integer**, such as 1033 for US English.

> [!WARNING] 0.9.45.0
> Setting one half of the substitution resets the other. **SetDigitSubstitutionUser**, **SetDigitSubstitutionNone**, **SetDigitSubstitutionNational** and **SetDigitSubstitutionTraditional** set the language to 0, and setting **DigitSubstitutionLanguage** sets the method to **StringDigitSubstituteUser**. To change one half and keep the other, set the method with **DigitSubstitutionMethod**, or set both with **SetDigitSubstitution**.
>
> ```tb check_build check_run
> Dim user As GdiPlusUser = GdiPlusUser()
>
> Dim sf As StringFormat = StringFormat()
> sf.SetDigitSubstitution 1031, StringDigitSubstituteNational
> sf.SetDigitSubstitutionTraditional
> Debug.Print sf.DigitSubstitutionLanguage & " " & sf.DigitSubstitutionMethod   ' 0 3
>
> sf.SetDigitSubstitution 1031, StringDigitSubstituteNational
> sf.DigitSubstitutionMethod = StringDigitSubstituteTraditional
> Debug.Print sf.DigitSubstitutionLanguage & " " & sf.DigitSubstitutionMethod   ' 1031 3
>
> sf.DigitSubstitutionLanguage = 1033
> Debug.Print sf.DigitSubstitutionLanguage & " " & sf.DigitSubstitutionMethod   ' 1033 0
> ```

### DigitSubstitutionLanguage
{: .no_toc }

Syntax: *format*.**DigitSubstitutionLanguage** [ **=** *language* ]

Returns or sets the language identifier. See the warning above for what setting it does.

### DigitSubstitutionMethod
{: .no_toc }

Syntax: *format*.**DigitSubstitutionMethod** [ **=** *method* ]

Returns or sets the method, a [**GpStringDigitSubstitute**](Enumerations/GpStringDigitSubstitute) value. Setting it keeps the language.

### SetDigitSubstitution
{: .no_toc }

Syntax: *status* **=** *format*.**SetDigitSubstitution**( *language*, *substitute* )

*language*
: *required* An **Integer** language identifier.

*substitute*
: *required* A [**GpStringDigitSubstitute**](Enumerations/GpStringDigitSubstitute) value.

Sets the language and the method together and returns a [**GpStatus**](Enumerations/GpStatus).

### SetDigitSubstitutionUser, SetDigitSubstitutionNone, SetDigitSubstitutionNational, SetDigitSubstitutionTraditional
{: .no_toc }

Syntax: *format*.**SetDigitSubstitutionNone**

Each method sets the method to the value in its name. See the warning above: each also sets the language to 0.

### IsDigitSubstitutionUser, IsDigitSubstitutionNone, IsDigitSubstitutionNational, IsDigitSubstitutionTraditional
{: .no_toc }

Syntax: *value* **=** *format*.**IsDigitSubstitutionNone**( )

Each function returns **True** when the method is the value in its name.

## Measurable character ranges

A format can name up to 32 ranges of characters in a string. [**Graphics.MeasureCharacterRanges**](Graphics) then returns one [**Region**](Region) for each range, which covers the space that the characters of the range take when the string is laid out. A range is a [**CharacterRange**](Types/CharacterRange).

> [!NOTE] timeless
> GDI+ accepts at most 32 ranges. A call with more returns **ValueOverflow** and leaves the earlier ranges in place.

### MeasurableCharacterRanges
{: .no_toc }

Syntax: *format*.**MeasurableCharacterRanges** **=** *ranges*()

*ranges*
: An array of [**CharacterRange**](Types/CharacterRange) values.

Sets the ranges. The property is write-only: read the number of ranges with [**MeasurableCharacterRangeCount**](#measurablecharacterrangecount).

### SetMeasurableCharacterRanges
{: .no_toc }

Syntax: *status* **=** *format*.**SetMeasurableCharacterRanges**( *rangeCount*, *ranges* )

*rangeCount*
: *required* A **Long** with the number of ranges, at most 32.

*ranges*
: *required* The first element of an array of [**CharacterRange**](Types/CharacterRange) values, passed **ByRef**.

Sets the ranges and returns a [**GpStatus**](Enumerations/GpStatus).

### MeasurableCharacterRangeCount
{: .no_toc }

Syntax: *format*.**MeasurableCharacterRangeCount**

Returns a **Long** with the number of ranges that are set. It is 0 for a new format.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(100!, 50!)
Dim g As Graphics = Graphics(bmp)
Dim f As GdiPlus.Font = Font(GenericSansSerif(), 10!)
Dim layout As GpRectF = GpRectF(0, 0, 100, 50)
Dim sf As StringFormat = StringFormat()

Dim ranges(0 To 1) As CharacterRange
ranges(0) = CharacterRange(0, 3)    ' "abc"
ranges(1) = CharacterRange(4, 3)    ' "def"
sf.MeasurableCharacterRanges = ranges
Debug.Print sf.MeasurableCharacterRangeCount    ' 2

Dim regions() As Region = g.MeasureCharacterRanges("abc def", f, layout, sf)
Debug.Print UBound(regions) - LBound(regions) + 1    ' 2

' The count is limited to 32.
Dim many(0 To 32) As CharacterRange
Debug.Print sf.SetMeasurableCharacterRanges(32, many(0)) = Ok      ' True
Debug.Print sf.SetMeasurableCharacterRanges(33, many(0)) = ValueOverflow    ' True
Debug.Print sf.MeasurableCharacterRangeCount                       ' 32
```

## See Also

- [Font](Font) class -- the font the text is drawn with
- [Graphics](Graphics) class -- **DrawString**, **MeasureString** and **MeasureCharacterRanges**
- [CharacterRange](Types/CharacterRange) type -- one range of characters
- [Enumerations/GpStringFormatFlags](Enumerations/GpStringFormatFlags) -- the flags
- [StringFormat class](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusstringformat/nl-gdiplusstringformat-stringformat) -- Microsoft's GDI+ reference
