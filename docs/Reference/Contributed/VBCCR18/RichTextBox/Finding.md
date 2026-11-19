---
title: Finding Text
parent: RichTextBox
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/RichTextBox/Finding
has_toc: false
symbols:
  - RtfFindOptionConstants
---

# Finding Text
{: .no_toc }

Finds a string in the text of a [**RichTextBox**](.), and moves the selection over the characters of a set.

<!-- test: RichTextBoxFindTests.Find_Found_ReturnsThePlaceAndSelects, RichTextBoxFindTests.Find_NotFound_ReturnsMinusOne -->
```tb check_build check_run arch=win32,win64
Dim Place As Long
RichTextBox1.Text = "The cat sat on the Cat mat"
Place = RichTextBox1.Find("cat")
Do While Place <> -1
    Debug.Print Place; RichTextBox1.SelText
    Place = RichTextBox1.Find("cat", Place + 1)
Loop
' Output:
'  4 cat
'  19 Cat
```
<!-- /test -->

* TOC
{:toc}

## Finding a string

[**Find**](#find) looks for a string between two places of the text and returns the place of the first character it finds, or -1. Capital and small letters are the same to it unless the options include **RtfFindOptionMatchCase**, and it selects what it finds unless they include **RtfFindOptionNoHighlight**.

<!-- test: RichTextBoxFindTests.Find_Reverse_SearchesBackFromMin, RichTextBoxFindTests.Find_NoHighlight_KeepsTheSelection, RichTextBoxFindTests.Find_WholeWord_SkipsAPartOfAWord -->
With **RtfFindOptionReverse** the search goes back from *Min* to *Max*, so *Min* is the later place of the two.
<!-- /test -->

```tb check_build check_run arch=win32,win64
RichTextBox1.Text = "The cat sat on the Cat mat"
Debug.Print RichTextBox1.Find("cat", RichTextBox1.TextLength, 0, RtfFindOptionReverse)   ' the last
Debug.Print RichTextBox1.Find("Cat", 0, -1, RtfFindOptionMatchCase Or RtfFindOptionNoHighlight)
Debug.Print RichTextBox1.Find("at", 0, -1, RtfFindOptionWholeWord)                       ' only in words
' Output:
'  19
'  19
' -1
```

## Spans of characters

[**Span**](#span) selects the characters next to the selection that belong to a set, such as the letters of a word, and [**UpTo**](#upto) moves the insertion point to the first character of a set. With *Negate* set to **True** both take the characters that are not in the set. Both start at [**SelStart**](Selection#selstart), go forward or back, and scroll the selection into view.

<!-- test: RichTextBoxFindTests.Span_Forward_SelectsTheCharactersOfTheSet, RichTextBoxFindTests.UpTo_Forward_StopsBeforeTheCharacter -->
```tb check_build check_run arch=win32,win64
RichTextBox1.Text = "The cat sat"
RichTextBox1.SelStart = 4
RichTextBox1.Span " ", True, True           ' forward, up to a space
Debug.Print "[" & RichTextBox1.SelText & "]"
RichTextBox1.SelStart = 4
RichTextBox1.UpTo " ", True                 ' to the space after "cat"
Debug.Print RichTextBox1.SelStart
' Output:
' [cat]
'  7
```
<!-- /test -->

Methods
-------

### Find
{: .no_toc }

Looks for a string in the text, and returns the place of its first character, counted from 0, or -1 when the string is not there.

Syntax: *object*.**Find**( *Text* [, *Min* ] [, *Max* ] [, *Options* ] ) **As Long**

*Text*
: *required* A **String**: what to find.

*Min*
: *optional* A **Long**: the place where the search starts. The default is 0.

*Max*
: *optional* A **Long**: the place where the search ends, or -1, the default, for the end of the text. A string is found only when it lies between *Min* and *Max*.

*Options*
: *optional* A sum of members of [**RtfFindOptionConstants**](#rtffindoptionconstants). The default is 0: forward, any letter case, and the string found is selected.

<!-- test: RichTextBoxFindTests.Find_NegativeMin_Raises380 -->
A *Min* less than 0, or a *Max* less than -1, raises run-time error 380.
<!-- /test -->

### Span
{: .no_toc }

Selects the characters next to the selection that are in a set, or with *Negate* those that are not, from [**SelStart**](Selection#selstart) on.

Syntax: *object*.**Span** *CharacterSet* [, *Forward* ] [, *Negate* ]

*CharacterSet*
: *required* A **String**: the characters of the set, in any order. An empty string does nothing.

*Forward*
: *optional* A **Boolean**: **True** to go forward to the end of the text, **False** (the default) to go back to its start.

*Negate*
: *optional* A **Boolean**: **True** to take the characters that are not in the set. The default is **False**.

When the character next to **SelStart** does not match, the selection stays as it was.

### UpTo
{: .no_toc }

Moves the insertion point forward or back from [**SelStart**](Selection#selstart) until the next character is in a set, or with *Negate* until it is not, and selects nothing.

Syntax: *object*.**UpTo** *CharacterSet* [, *Forward* ] [, *Negate* ]

*CharacterSet*
: *required* A **String**: the characters of the set, in any order. An empty string does nothing.

*Forward*
: *optional* A **Boolean**: **True** to go forward, **False** (the default) to go back. Going back, the insertion point stops after the character of the set.

*Negate*
: *optional* A **Boolean**: **True** to stop at a character that is not in the set. The default is **False**.

## RtfFindOptionConstants
{: #rtffindoptionconstants }

The options of [**Find**](#find), which a program adds up.

| Member | Value | Description |
|---|---|---|
| **RtfFindOptionWholeWord**{: #RtfFindOptionConstants_RtfFindOptionWholeWord } | 2 | The string is found only as a whole word. |
| **RtfFindOptionMatchCase**{: #RtfFindOptionConstants_RtfFindOptionMatchCase } | 4 | Capital and small letters must match. |
| **RtfFindOptionNoHighlight**{: #RtfFindOptionConstants_RtfFindOptionNoHighlight } | 8 | The string found is not selected, and the selection stays as it was. |
| **RtfFindOptionReverse**{: #RtfFindOptionConstants_RtfFindOptionReverse } | 16 | The search goes back from *Min* to *Max*. |

## See Also

- [RichTextBox](.) control
- [Selection](Selection) -- **SelStart**, **SelLength** and **SelText**
