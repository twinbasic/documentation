---
title: Paragraph Formatting
parent: RichTextBox
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/RichTextBox/ParagraphFormatting
has_toc: false
symbols:
  - RtfSelAlignmentConstants
---

# Paragraph Formatting
{: .no_toc }

Aligns the paragraphs of a [**RichTextBox**](.), indents them, gives them bullets and sets their tab stops.

<!-- test: RichTextBoxParagraphTests.SelAlignment_Assigned_ReadsBack, RichTextBoxParagraphTests.SelAlignment_MixedParagraphs_IsNull, RichTextBoxParagraphTests.SelTabs_Assigned_ReadBack -->
```tb check_build check_run arch=win32,win64
RichTextBox1.Text = "A title" & vbCr & "A point"
RichTextBox1.SelStart = 0
RichTextBox1.SelAlignment = RtfSelAlignmentCenter   ' the first paragraph
RichTextBox1.SelStart = 8                           ' in the second
RichTextBox1.SelBullet = True
RichTextBox1.SelTabCount = 2
RichTextBox1.SelTabs(0) = 1440
RichTextBox1.SelTabs(1) = 2880
Debug.Print RichTextBox1.SelAlignment; RichTextBox1.SelBullet; RichTextBox1.SelTabCount
RichTextBox1.SelStart = 0
RichTextBox1.SelLength = 15                         ' both paragraphs
Debug.Print IsNull(RichTextBox1.SelAlignment)
' Output:
'  0 True 2
' True
```
<!-- /test -->

* TOC
{:toc}

## The paragraphs of the selection

Each property on this page reads and sets the format of the paragraphs that the selection touches, or of the paragraph of the insertion point. A paragraph ends with a carriage return, so it is a line or several as the box wraps it. As with the [format of characters](CharacterFormatting#the-format-of-the-selection), each property is a **Variant**, returns **Null** while those paragraphs differ in it, and raises run-time error 13 for a value of a type it does not take.

## Indents

[**SelIndent**](#selindent) is the distance from the left edge of the box to the left edge of the paragraph, and [**SelRightIndent**](#selrightindent) the distance from the right edge. [**SelHangingIndent**](#selhangingindent) moves the lines after the first of a paragraph to the right of the first one, or to its left with a negative value. All three are in the scale units of the control's container, twips on a form whose **ScaleMode** is **vbTwips**.

<!-- test: RichTextBoxParagraphTests.SelBullet_Assigned_SetsTheHangingIndentToBulletIndent -->
A paragraph with [**SelBullet**](#selbullet) set to **True** starts with a bullet. An assignment to **SelBullet** also sets **SelHangingIndent** to [**BulletIndent**](#bulletindent), the room between the bullet and the text.
<!-- /test -->

## Tab stops

[**SelTabCount**](#seltabcount) is the number of tab stops of the paragraphs, and [**SelTabs**](#seltabs) the place of each, counted from 0. A paragraph with no tab stops of its own has one at each half inch.

Properties
----------

### BulletIndent
{: .no_toc }

The hanging indent that an assignment to [**SelBullet**](#selbullet) gives a paragraph, in the scale units of the control's container. **Single**. Default: 0.

<!-- test: RichTextBoxParagraphTests.BulletIndent_Negative_Raises380 -->
A negative value raises run-time error 380.
<!-- /test -->

### SelAlignment
{: .no_toc }

How the lines of the paragraphs stand between the indents. A **Variant** that holds a member of [**RtfSelAlignmentConstants**](#rtfselalignmentconstants), or **Null**. A paragraph that has never been aligned is **RtfSelAlignmentLeft**.

<!-- test: RichTextBoxParagraphTests.SelAlignment_NotAMember_Raises380 -->
A number that is not a member raises run-time error 380.
<!-- /test -->

### SelBullet
{: .no_toc }

Whether the paragraphs start with a bullet. A **Variant**: **True**, **False** or **Null**. An assignment takes **True**, **False** or a number, and also sets [**SelHangingIndent**](#selhangingindent) to [**BulletIndent**](#bulletindent).

### SelHangingIndent
{: .no_toc }

How far the lines after the first of each paragraph stand to the right of the first line, in the scale units of the control's container. A **Variant** that holds a number, or **Null**.

### SelIndent
{: .no_toc }

The distance from the left edge of the box to the left edge of the paragraphs, in the scale units of the control's container. A **Variant** that holds a number, or **Null**.

### SelRightIndent
{: .no_toc }

The distance from the right edge of the box to the right edge of the paragraphs, in the scale units of the control's container. A **Variant** that holds a number, or **Null**.

### SelTabCount
{: .no_toc }

The number of tab stops of the paragraphs. A **Variant** that holds a number from 0 to 32, or **Null**.

<!-- test: RichTextBoxParagraphTests.SelTabCount_Above32_Raises380 -->
A number outside that range raises run-time error 380.
<!-- /test -->

### SelTabs
{: .no_toc }

The place of one tab stop of the paragraphs, measured from the left edge of the box in the scale units of the control's container. A **Variant** that holds a number, or **Null**.

Syntax: *object*.**SelTabs**( *Element* ) [ = *value* ]

*Element*
: An **Integer**: the number of the tab stop, from 0 to one less than [**SelTabCount**](#seltabcount).

<!-- test: RichTextBoxParagraphTests.SelTabs_PastSelTabCount_Raises381 -->
An *Element* outside that range raises run-time error 381, *Invalid property array index*.
<!-- /test -->

## RtfSelAlignmentConstants
{: #rtfselalignmentconstants }

The values of [**SelAlignment**](#selalignment).

| Member | Value | Description |
|---|---|---|
| **RtfSelAlignmentLeft**{: #RtfSelAlignmentConstants_RtfSelAlignmentLeft } | 0 | The lines start at the left indent. |
| **RtfSelAlignmentRight**{: #RtfSelAlignmentConstants_RtfSelAlignmentRight } | 1 | The lines end at the right indent. |
| **RtfSelAlignmentCenter**{: #RtfSelAlignmentConstants_RtfSelAlignmentCenter } | 2 | The lines stand in the middle between the indents. |
| **RtfSelAlignmentJustified**{: #RtfSelAlignmentConstants_RtfSelAlignmentJustified } | 3 | The lines fill the room between the indents, but for the last line of each paragraph. |

## See Also

- [RichTextBox](.) control
- [Character Formatting](CharacterFormatting) -- the format of the characters
