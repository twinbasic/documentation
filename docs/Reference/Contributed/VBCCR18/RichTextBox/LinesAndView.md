---
title: Lines, Scrolling and Zoom
parent: RichTextBox
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/RichTextBox/LinesAndView
has_toc: false
---

# Lines, Scrolling and Zoom
{: .no_toc }

Reads the lines of a [**RichTextBox**](.), scrolls them into view, and sets the scroll bars, the margins and the zoom.

<!-- test: RichTextBoxViewTests.GetLine_ReturnsTheLineOfThatNumber, RichTextBoxViewTests.GetLine_Zero_IsTheLineOfTheInsertionPoint, RichTextBoxViewTests.GetLineFromChar_ReturnsTheLineNumber -->
```tb check_build check_run arch=win32,win64
RichTextBox1.Text = "one" & vbCr & "two" & vbCr & "three"
Debug.Print RichTextBox1.GetLineCount
Debug.Print RichTextBox1.GetLine(2)
RichTextBox1.SelStart = 9                ' in "three"
Debug.Print RichTextBox1.GetLine(0)      ' the line of the insertion point
Debug.Print RichTextBox1.GetLineFromChar(5)
' Output:
'  3
' two
' three
'  2
```
<!-- /test -->

* TOC
{:toc}

## Lines

The methods that work on lines count them from 1, as those of a [**TextBoxW**](../TextBoxW#several-lines) do, and a line is a line as the box shows it: a paragraph that the box wraps counts as several. [**GetLineCount**](#getlinecount) returns the number of lines, [**GetLine**](#getline) the text of one, [**GetLineFromChar**](#getlinefromchar) the line that a character is on, and [**CharFromPos**](#charfrompos) the character at a point of the box.

## Scrolling

[**ScrollToLine**](#scrolltoline) brings a line to the top of the box, and [**ScrollToCaret**](#scrolltocaret) scrolls the insertion point into view. [**ScrollBars**](#scrollbars) gives a multi-line box scroll bars; without them the text still scrolls as the insertion point moves. A scroll bar that is not needed is hidden, or shown disabled while [**DisableNoScroll**](#disablenoscroll) is **True**.

<!-- test: RichTextBoxViewTests.ScrollToLine_RaisesScroll -->
The control raises [**Scroll**](#scroll) each time its text scrolls, whether the user or the program scrolled it.
<!-- /test -->

## Zoom and margins

<!-- test: RichTextBoxViewTests.ZoomFactor_Assigned_ReadsBack, RichTextBoxViewTests.ZoomFactor_Above64_Raises380 -->
[**ZoomFactor**](#zoomfactor) draws the whole text larger or smaller than its format says, from a sixty-fourth of its size to 64 times it, without changing the format. 1 is the size of the format.
<!-- /test -->

```tb check_build check_run arch=win32,win64
RichTextBox1.ZoomFactor = 1.5            ' the text half as large again
Debug.Print RichTextBox1.ZoomFactor
On Error Resume Next
RichTextBox1.ZoomFactor = 100
Debug.Print Err.Number; RichTextBox1.ZoomFactor
' Output:
'  1.5
'  380  1.5
```

[**LeftMargin**](#leftmargin-rightmargin) and **RightMargin** are the empty strips at the sides of the text, and [**SelectionBar**](#selectionbar) adds a wider strip at the left in which the user selects whole lines.

Properties
----------

### DisableNoScroll
{: .no_toc }

Whether a scroll bar that is not needed is shown disabled rather than hidden. **Boolean**. Default: **False**.

<!-- test: RichTextBoxViewTests.DisableNoScroll_AtRunTime_Raises382 -->
It is set at design time: an assignment while the program runs raises run-time error 382.
<!-- /test -->

### LeftMargin, RightMargin
{: .no_toc }

The widths of the empty strips at the left and at the right of the text, in the scale units of the control's container. **Single**. Assigning -1 gives the margin the width that Windows works out from the font.

<!-- test: RichTextBoxViewTests.LeftMargin_Negative_Raises380 -->
Any other negative value raises run-time error 380.
<!-- /test -->

### ScrollBars
{: .no_toc }

The scroll bars of a multi-line box. A member of [**ScrollBarConstants**](../../../VBRUN/Constants/ScrollBarConstants): **vbSBNone** (the default), **vbHorizontal**, **vbVertical** or **vbBoth**. A box of one line has none.

<!-- test: RichTextBoxViewTests.ScrollBars_Changed_KeepsTheText, RichTextBoxViewTests.ScrollBars_OutOfRange_Raises380 -->
Another value raises run-time error 380. A change makes the control's window again, with the same text, the same selection and the same place of the scroll bars, so [**hWnd**](../Common#hwnd) returns another handle afterwards.
<!-- /test -->

### SelectionBar
{: .no_toc }

Whether the box has a strip at the left of the text in which the pointer is an arrow that points up and to the right, and a click selects the line beside it. **Boolean**. Default: **False**.

### ZoomFactor
{: .no_toc }

How much larger or smaller than its format the text is drawn. **Double**. Default: 1. A value outside the range from 1/64 to 64 raises run-time error 380, and the zoom stays as it was.

Methods
-------

### CharFromPos
{: .no_toc }

Returns the place in the text, counted from 0, of the character nearest to a point.

Syntax: *object*.**CharFromPos**( *X*, *Y* ) **As Long**

*X*, *Y*
: *required* The point, measured from the top left corner of the box in the scale units of the control's container. **Single**.

### GetLine
{: .no_toc }

Returns the text of one line, without the carriage return that ends it.

Syntax: *object*.**GetLine**( *LineNumber* ) **As String**

*LineNumber*
: *required* A **Long**: the number of the line, counted from 1, or 0 for the line of the insertion point.

<!-- test: RichTextBoxViewTests.GetLine_PastTheLastLine_Raises380, RichTextBoxViewTests.GetLine_Negative_Raises380 -->
A negative number, or a number greater than the number of lines, raises run-time error 380.
<!-- /test -->

### GetLineCount
{: .no_toc }

Returns the number of lines in the box. A box that is empty has one line.

Syntax: *object*.**GetLineCount** **As Long**

### GetLineFromChar
{: .no_toc }

Returns the number of the line, counted from 1, that a character is on.

Syntax: *object*.**GetLineFromChar**( *CharIndex* ) **As Long**

*CharIndex*
: *required* A **Long**: the place of the character in the text, counted from 0, or -1 for the line of the start of the selection.

A value less than -1 raises run-time error 380.

### ScrollToCaret
{: .no_toc }

Scrolls the box so that the insertion point shows, also while the box does not have the focus.

Syntax: *object*.**ScrollToCaret**

### ScrollToLine
{: .no_toc }

Scrolls the box so that a line is the first one that shows, where the text is long enough for that.

Syntax: *object*.**ScrollToLine** *LineNumber*

*LineNumber*
: *required* A **Long**: the number of the line, counted from 1.

<!-- test: RichTextBoxViewTests.ScrollToLine_PastTheLastLine_Raises380 -->
A negative number, or a number greater than the number of lines, raises run-time error 380.
<!-- /test -->

Events
------

### Scroll
{: .no_toc }

Raised when the text of the box scrolls: the user moved a scroll bar or moved the insertion point out of view, or the program called [**ScrollToLine**](#scrolltoline), moved the insertion point or assigned a text.

Syntax: *object*\_**Scroll**( )

## See Also

- [RichTextBox](.) control
- [TextBoxW](../TextBoxW) control -- the same methods for the lines of a text box
- [ScrollBarConstants](../../../VBRUN/Constants/ScrollBarConstants) -- the values of **ScrollBars**
