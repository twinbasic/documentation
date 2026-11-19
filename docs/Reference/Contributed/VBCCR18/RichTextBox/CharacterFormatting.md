---
title: Character Formatting
parent: RichTextBox
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/RichTextBox/CharacterFormatting
has_toc: false
---

# Character Formatting
{: .no_toc }

Gives the selected characters of a [**RichTextBox**](.) a font, a size, a color and the effects bold, italic, underline and strikethrough, raises them above the line or lowers them below it, and hides them.

<!-- test: RichTextBoxFormatTests.SelFontSize_Assigned_ReadsBack, RichTextBoxFormatTests.SelColor_Assigned_ReadsBackAsRGB -->
```tb check_build check_run arch=win32,win64
RichTextBox1.Text = "Title and text"
RichTextBox1.SelStart = 0
RichTextBox1.SelLength = 5
RichTextBox1.SelFontSize = 14
RichTextBox1.SelUnderline = True
RichTextBox1.SelColor = vbBlue
Debug.Print RichTextBox1.SelFontSize; RichTextBox1.SelUnderline; RichTextBox1.SelColor = vbBlue
RichTextBox1.SelStart = 6
RichTextBox1.SelLength = 3
Debug.Print RichTextBox1.SelUnderline     ' "and" is not underlined
' Output:
'  14 TrueTrue
' False
```
<!-- /test -->

* TOC
{:toc}

## The format of the selection

Each property on this page reads and sets one part of the format of the selected characters. With nothing selected, it reads the format at the insertion point and sets the format of the text typed there next.

<!-- test: RichTextBoxFormatTests.SelBold_MixedSelection_IsNull, RichTextBoxFormatTests.SelBold_String_Raises13 -->
Each is a **Variant**. While the selection holds characters that differ in that part of the format, such as bold and not bold, it returns **Null**. A value of a type that the property does not take, such as a string for [**SelBold**](#selbold), raises run-time error 13, *Type mismatch*.
<!-- /test -->

<!-- test: RichTextBoxFormatTests.SelBold_Null_MakesTheSelectionBold -->
The effects [**SelBold**](#selbold), [**SelItalic**](#selitalic), [**SelStrikethru**](#selstrikethru) and [**SelUnderline**](#selunderline) take **True** or **False**, or a number, of which any but 0 is **True**. An assignment of **Null** to one of them gives the selection that effect, as **True** does.
<!-- /test -->

```tb check_build check_run arch=win32,win64
RichTextBox1.Text = "bold and plain"
RichTextBox1.SelStart = 0
RichTextBox1.SelLength = 4
RichTextBox1.SelBold = True
RichTextBox1.SelLength = 14
Debug.Print IsNull(RichTextBox1.SelBold)     ' some characters are bold, some are not
RichTextBox1.SelBold = Null                 ' all of them bold
Debug.Print RichTextBox1.SelBold
' Output:
' True
' True
```

## Hidden text

<!-- test: RichTextBoxFormatTests.SelVisible_False_KeepsTheTextInText -->
With [**SelVisible**](#selvisible) set to **False** the selected characters are not shown, and take no room. They stay part of the text: [**Text**](Text#text) and [**TextLength**](Text#textlength) count them.
<!-- /test -->

Properties
----------

### SelBkColor
{: .no_toc }

The color behind the selected characters. A **Variant** that holds a color, which the property returns as an RGB value, or **Null**. Text with no color of its own behind it shows the control's [**BackColor**](.#backcolor).

### SelBold
{: .no_toc }

Whether the selected characters are bold. A **Variant**: **True**, **False** or **Null**. See [The format of the selection](#the-format-of-the-selection).

### SelCharOffset
{: .no_toc }

How far the selected characters are raised above the line of the text, or lowered below it with a negative value, in the scale units of the control's container. A **Variant** that holds a number, or **Null**.

### SelColor
{: .no_toc }

The color of the selected characters. A **Variant** that holds a color, such as **vbRed** or the value of [**RGB**](../../../../Modules/Information/RGB), or **Null**. The property returns the color as an RGB value, also when a color of the system, such as **vbWindowText**, was assigned.

### SelFontCharset
{: .no_toc }

The character set of the font of the selected characters, such as 0 for the ANSI character set. A **Variant** that holds a number from 0 to 255, or **Null**. Of a greater number the control keeps the lowest 8 bits.

### SelFontName
{: .no_toc }

The name of the font of the selected characters. A **Variant** that holds a **String**, or **Null**. A name of more than 31 characters is cut to 31.

### SelFontSize
{: .no_toc }

The size of the font of the selected characters, in points. A **Variant** that holds a number, or **Null**. The property returns a **Single**.

### SelItalic
{: .no_toc }

Whether the selected characters are in italics. A **Variant**: **True**, **False** or **Null**.

### SelStrikethru
{: .no_toc }

Whether the selected characters are struck through with a line. A **Variant**: **True**, **False** or **Null**.

### SelUnderline
{: .no_toc }

Whether the selected characters are underlined. A **Variant**: **True**, **False** or **Null**.

### SelVisible
{: .no_toc }

Whether the selected characters are shown. A **Variant**: **True**, **False** or **Null**. See [Hidden text](#hidden-text). An assignment of **Null** shows them, as **True** does.

## See Also

- [RichTextBox](.) control
- [Paragraph Formatting](ParagraphFormatting) -- the format of whole paragraphs
- [Links and Protected Text](LinksAndProtection) -- **SelLink** and **SelProtected**, two more parts of the format of characters
