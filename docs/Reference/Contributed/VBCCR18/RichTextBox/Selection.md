---
title: Selection
parent: RichTextBox
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/RichTextBox/Selection
has_toc: false
symbols:
  - RtfSelTypeConstants
---

# Selection
{: .no_toc }

Selects text in a [**RichTextBox**](.), reads and replaces the selected text, and reports each change of the selection.

```tb hidden
Class RtbSelectionWatcher
    Public WithEvents Box As VBCCR18.RichTextBox
    Private Sub Box_SelChange(ByVal SelType As Integer, ByVal SelStart As Long, ByVal SelEnd As Long) Handles Box.SelChange
        Debug.Print "SelChange"; SelType; SelStart; SelEnd
    End Sub
    Private Sub Box_Change() Handles Box.Change
        Debug.Print "Change"
    End Sub
End Class
```

<!-- test: RichTextBoxSelectionTests.SelLength_Assigned_RaisesSelChange, RichTextBoxSelectionTests.SelText_Assigned_ReplacesTheSelection -->
```tb check_build check_run arch=win32,win64
Dim Watch As New RtbSelectionWatcher
RichTextBox1.Text = "Hello world"
Set Watch.Box = RichTextBox1
RichTextBox1.SelStart = 6
RichTextBox1.SelLength = 5
RichTextBox1.SelText = "there"          ' replaces "world"
Debug.Print RichTextBox1.Text; RichTextBox1.SelStart
' Output:
' SelChange 0  6  6
' SelChange 5  6  11
' SelChange 0  11  11
' Change
' Hello there 11
```
<!-- /test -->

**RtbSelectionWatcher** in this sample is a class of the program's own that holds the control **WithEvents** and prints its **SelChange** and **Change** events.

* TOC
{:toc}

## The selection and the insertion point

[**SelStart**](#selstart) and [**SelLength**](#sellength) are the place and the length of the selection, counted in characters from 0, and [**SelText**](#seltext) is the selected text, as they are in a [**TextBoxW**](../TextBoxW#the-selection-the-clipboard-and-undo). A line break counts as one character, a carriage return. With a **SelLength** of 0, **SelStart** is the insertion point, and the properties of the [character](CharacterFormatting) and [paragraph](ParagraphFormatting) formats apply to the text typed there next.

[**SelRTF**](#selrtf) is the selection with its formatting, as a document in the Rich Text Format. An assignment to it replaces the selection with the text and the formatting of the document.

```tb check_build check_run arch=win32,win64
RichTextBox1.Text = "a small word"
RichTextBox1.SelStart = 2
RichTextBox1.SelLength = 5
RichTextBox1.SelRTF = "{\rtf1 \i big\i0}"   ' "big" in italics, in place of "small"
Debug.Print RichTextBox1.Text
RichTextBox1.SelStart = 2
RichTextBox1.SelLength = 3
Debug.Print RichTextBox1.SelItalic
' Output:
' a big word
' True
```

## The kind of selection

[**GetSelType**](#getseltype) says what the selection holds, as a sum of the members of [**RtfSelTypeConstants**](#rtfseltypeconstants): **RtfSelTypeText** for text, **RtfSelTypeObject** for an [OLE object](OLEObjects), and **RtfSelTypeMultiChar** and **RtfSelTypeMultiObject** when there is more than one of each. A selection of several characters is therefore 5, and the insertion point alone is **RtfSelTypeEmpty**. [**SelChange**](#selchange) gives the same sum.

<!-- test: RichTextBoxSelectionTests.GetTextRange_ReturnsTheCharactersBetween, RichTextBoxSelectionTests.GetTextRange_MinAboveMax_Raises380 -->
[**GetTextRange**](#gettextrange) returns the text of any range without selecting it.
<!-- /test -->

```tb check_build check_run arch=win32,win64
RichTextBox1.Text = "Hello world"
Debug.Print RichTextBox1.GetTextRange(0, 5); "|"; RichTextBox1.GetTextRange(6, 100)
RichTextBox1.SelStart = 0
RichTextBox1.SelLength = 5
Debug.Print RichTextBox1.GetSelType = RtfSelTypeText + RtfSelTypeMultiChar
' Output:
' Hello|world
' True
```

Properties
----------

### HideSelection
{: .no_toc }

Whether the selection stops being shown when the box loses the focus. **Boolean**. Default: **True**.

### SelLength
{: .no_toc }

The number of characters selected. **Long**. An assignment selects that many characters from [**SelStart**](#selstart) on, or as many as there are, and scrolls the selection into view.

<!-- test: RichTextBoxSelectionTests.SelLength_Negative_Raises380 -->
A negative value raises run-time error 380.
<!-- /test -->

### SelRTF
{: .no_toc }

The selection with its formatting, as a document in the Rich Text Format. **String**. See [The selection and the insertion point](#the-selection-and-the-insertion-point).

### SelStart
{: .no_toc }

The place of the first selected character, counted from 0, or of the insertion point when nothing is selected. **Long**. An assignment puts the insertion point there, selects nothing, and scrolls the place into view.

<!-- test: RichTextBoxSelectionTests.SelStart_PastTheEnd_IsTheEnd, RichTextBoxSelectionTests.SelStart_Negative_Raises380 -->
A value greater than the length of the text puts the insertion point at the end. A negative value raises run-time error 380.
<!-- /test -->

### SelText
{: .no_toc }

The selected text, without its formatting, with **vbCr** for a line break. **String**. An assignment replaces the selection with the new text, or inserts the text at the insertion point, leaves the insertion point after it and raises [**Change**](Text#change). The user can take the replacement back with [**Undo**](ClipboardAndUndo#undo).

Methods
-------

### GetSelType
{: .no_toc }

Returns what the selection holds, as a sum of the members of [**RtfSelTypeConstants**](#rtfseltypeconstants).

Syntax: *object*.**GetSelType** **As Integer**

### GetTextRange
{: .no_toc }

Returns the text of a range of characters, without selecting it.

Syntax: *object*.**GetTextRange**( *Min*, *Max* ) **As String**

*Min*
: *required* A **Long**: the place of the first character, counted from 0.

*Max*
: *required* A **Long**: the place after the last character. A place after the end of the text gives the text up to the end.

A *Min* greater than *Max* raises run-time error 380. A *Min* equal to *Max* returns an empty string.

Events
------

### SelChange
{: .no_toc }

Raised when the selection or the insertion point has changed, whether the user or the program changed it.

Syntax: *object*\_**SelChange**( **ByVal** *SelType* **As Integer**, **ByVal** *SelStart* **As Long**, **ByVal** *SelEnd* **As Long** )

*SelType*
: What the selection holds, a sum of the members of [**RtfSelTypeConstants**](#rtfseltypeconstants).

*SelStart*
: The place of the first selected character, or of the insertion point.

*SelEnd*
: The place after the last selected character. It equals *SelStart* when nothing is selected.

## RtfSelTypeConstants
{: #rtfseltypeconstants }

The values that [**GetSelType**](#getseltype) and [**SelChange**](#selchange) add up.

| Member | Value | Description |
|---|---|---|
| **RtfSelTypeEmpty**{: #RtfSelTypeConstants_RtfSelTypeEmpty } | 0 | Nothing is selected. |
| **RtfSelTypeText**{: #RtfSelTypeConstants_RtfSelTypeText } | 1 | The selection holds text. |
| **RtfSelTypeObject**{: #RtfSelTypeConstants_RtfSelTypeObject } | 2 | The selection holds an OLE object. |
| **RtfSelTypeMultiChar**{: #RtfSelTypeConstants_RtfSelTypeMultiChar } | 4 | The selection holds more than one character. |
| **RtfSelTypeMultiObject**{: #RtfSelTypeConstants_RtfSelTypeMultiObject } | 8 | The selection holds more than one OLE object. |

## See Also

- [RichTextBox](.) control
- [Text and Typing](Text) -- the whole text
- [Finding Text](Finding) -- selecting what a search finds
