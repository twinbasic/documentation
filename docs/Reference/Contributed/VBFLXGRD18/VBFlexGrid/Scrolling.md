---
title: Scrolling
parent: VBFlexGrid
grand_parent: VBFLXGRD18 Package
permalink: /tB/Packages/Contributed/VBFLXGRD18/VBFlexGrid/Scrolling
---

# Scrolling

The scroll bars, the part of the grid that is in view, the scroll tips and the other ways the user can scroll, and the members that move or read the view from code.

The grid shows the **fixed** and **frozen** rows and columns all the time. Below and to the right of them it shows a window of the other rows and columns, and scrolling moves that window. Two properties name its first row and first column: [**TopRow**](#toprow) and [**LeftCol**](#leftcol). Assigning them scrolls the grid. [**BottomRow**](#bottomrow) and [**RightCol**](#rightcol) read the other end of the window, and [**RowIsVisible**](#rowisvisible), [**ColIsVisible**](#colisvisible), [**RowsVisible**](#rowsvisible), [**ColsVisible**](#colsvisible), [**RowsPerPage**](#rowsperpage) and [**ColsPerPage**](#colsperpage) say how much is in view.

* TOC
{:toc}

## The part that is in view

A row can be fully in view, partly in view, or out of view. Most of the members that read the view take a *Visibility* argument, a [**FlexVisibilityConstants**](../Enumerations/SelectionAndInput#flexvisibilityconstants) member, that decides whether a row or column that is only partly in view counts: **FlexVisibilityPartialOK** (0) counts it and **FlexVisibilityCompleteOnly** (1) does not. The default is not the same for all members:

| Member | Default for *Visibility* |
|---|---|
| [**BottomRow**](#bottomrow), [**RightCol**](#rightcol), [**RowIsVisible**](#rowisvisible), [**ColIsVisible**](#colisvisible) | **FlexVisibilityPartialOK** |
| [**RowsVisible**](#rowsvisible), [**ColsVisible**](#colsvisible), [**CellEnsureVisible**](#cellensurevisible) | **FlexVisibilityCompleteOnly** |

What is in view depends on the size of the control, so the sample below prints comparisons and not sizes.

```tb check_build check_run slot=sub id=scrolling-view arch=win32,win64
Dim g As VBFLXGRD18.VBFlexGrid
Set g = VBFlexGrid1
g.Rows = 100: g.Cols = 30
g.FixedRows = 2

Debug.Print "first scrollable row " & g.TopRow & ", column " & g.LeftCol

g.TopRow = 50
g.LeftCol = 10
Debug.Print "view starts at " & g.TopRow & "," & g.LeftCol
Debug.Print "rows 0, 1, 2, 50, 99: " & g.RowIsVisible(0) & " " & g.RowIsVisible(1) & " " & g.RowIsVisible(2) & " " & g.RowIsVisible(50) & " " & g.RowIsVisible(99)
Debug.Print "columns 0, 5, 10, 29: " & g.ColIsVisible(0) & " " & g.ColIsVisible(5) & " " & g.ColIsVisible(10) & " " & g.ColIsVisible(29)
Debug.Print "the view reaches below row 50: " & (g.BottomRow > 50)

g.TopRow = 0                        ' a fixed row cannot be the first scrollable one
Debug.Print "after TopRow = 0: " & g.TopRow

g.TopRow = g.Rows - 1               ' the last rows fill the window instead
Debug.Print "after TopRow = Rows - 1: " & (g.TopRow < g.Rows - 1) & ", the last row is in view: " & (g.BottomRow = g.Rows - 1)
' Output:
' first scrollable row 2, column 1
' view starts at 50,10
' rows 0, 1, 2, 50, 99: True True False True False
' columns 0, 5, 10, 29: True False True False
' the view reaches below row 50: True
' after TopRow = 0: 2
' after TopRow = Rows - 1: True, the last row is in view: True
```

Assigning **TopRow** or **LeftCol** moves the view as far as the request allows: a value below the first scrollable row or column is raised to it, and a value so far down or to the right that part of the window would stay empty is lowered until the last rows or columns fill it. A row or column number outside the grid raises an error.

## The Scroll event

[**Scroll**](#scroll) is raised after every change of the view: a drag of a scroll bar, a click on a bar, the mouse wheel, the keyboard, an assignment to **TopRow** or **LeftCol**, [**CellEnsureVisible**](#cellensurevisible), and anything else that moves the first row or column, such as a change of [**FixedRows**](Structure#fixedrows). A change in both directions raises it twice, once for each. An assignment that changes nothing raises nothing.

```tb check_build projname=scrolling-trace slot=file
Class ScrollTrace
    Private WithEvents Grid As VBFLXGRD18.VBFlexGrid

    Public Sub Attach(ByVal G As VBFLXGRD18.VBFlexGrid)
        Set Grid = G
    End Sub

    Private Sub Grid_Scroll()
        Debug.Print "Scroll: view starts at " & Grid.TopRow & "," & Grid.LeftCol
    End Sub
End Class
```

```tb check_build check_run projname=scrolling-trace slot=sub id=scrolling-event
VBFlexGrid1.Rows = 100: VBFlexGrid1.Cols = 30
Dim t As New ScrollTrace
t.Attach VBFlexGrid1

VBFlexGrid1.TopRow = 50
VBFlexGrid1.TopRow = 50             ' no change, no event
VBFlexGrid1.LeftCol = 10
VBFlexGrid1.TopRow = 0
' Output:
' Scroll: view starts at 50,1
' Scroll: view starts at 50,10
' Scroll: view starts at 1,10
```

## Scroll bars

[**ScrollBars**](#scrollbars) chooses which bars the grid has, and it decides more than that: in a direction that has no bar, the grid does not scroll by itself, and [**CellEnsureVisible**](#cellensurevisible) does not scroll either. Assigning **TopRow** or **LeftCol** still works. A bar is shown only when it is needed, unless [**DisableNoScroll**](#disablenoscroll) is **True** and it is drawn disabled instead. With [**ScrollTrack**](#scrolltrack) the contents follow the thumb while the user drags it; without it they move when the thumb is released.

<!-- test: ScrollingTests.CellEnsureVisible_NoScrollBars_ScrollsToTheRow, ScrollingTests.CellEnsureVisible_HorizontalBarOnly_ScrollsToTheRow, ScrollingTests.CellEnsureVisible_VerticalBarOnly_ScrollsToTheColumn, ScrollingTests.CellEnsureVisible_BothBars_ScrollsToTheCell, ScrollingTests.TopRow_NoScrollBars_ScrollsToTheRow -->
> [!WARNING] 1.8.69.0
> **CellEnsureVisible** does nothing in a direction where **ScrollBars** has no bar: the cell stays out of view, and no error is raised. In a grid with **ScrollBars** set to **vbSBNone**, assign **TopRow** and **LeftCol** instead.

```tb check_build check_run slot=sub id=scrolling-ensure-no-bars
Dim g As VBFLXGRD18.VBFlexGrid
Set g = VBFlexGrid1
g.Rows = 100: g.Cols = 5
g.ScrollBars = vbSBNone

g.Row = 90
g.CellEnsureVisible
Debug.Print "CellEnsureVisible: row 90 in view " & g.RowIsVisible(90)

g.TopRow = 90
Debug.Print "TopRow = 90: row 90 in view " & g.RowIsVisible(90)
' Output:
' CellEnsureVisible: row 90 in view False
' TopRow = 90: row 90 in view True
```

## Scroll tips

With [**ShowScrollTips**](#showscrolltips) set to **True** a small tip window appears while the user drags a scroll thumb. The control puts no text into it: the [**ScrollTip**](#scrolltip) event is raised for each position of the thumb, and its handler sets [**ScrollTipText**](#scrolltiptext). The tip stays where the drag started, and follows the thumb when [**ScrollTipFollowThumb**](#scrolltipfollowthumb) is **True**. The tip window itself is available as [**hWndScrollTip**](#hwndscrolltip).

## Other ways to scroll

The mouse wheel scrolls [**WheelScrollLines**](#wheelscrolllines) lines for each notch, and a horizontal wheel scrolls one column for each notch. With [**AllowReaderMode**](#allowreadermode) set, the middle mouse button starts the system's auto-scrolling and panning: the user moves the mouse away from the point where the button was pressed and the grid scrolls in that direction. With [**AllowScrollLock**](#allowscrolllock) set, the arrow keys scroll the grid instead of moving the current cell while Scroll Lock is on, as in a spreadsheet program.

## Properties

### ScrollBars
{: .no_toc }

Returns or sets which scroll bars the grid has. A [**ScrollBarConstants**](../../../VBRUN/Constants/ScrollBarConstants) member. Default: **vbBoth**.

Syntax: *object*.**ScrollBars** [ **=** *value* ]

*value*
: **vbSBNone** (0), **vbHorizontal** (1), **vbVertical** (2) or **vbBoth** (3). Any other value raises error 380.

See [Scroll bars](#scroll-bars) for what a missing bar means.

### ScrollTrack
{: .no_toc }

Returns or sets whether the contents scroll while the user drags a scroll thumb. **Boolean**. Default: **False**.

Syntax: *object*.**ScrollTrack** [ **=** *value* ]

With **False** the grid scrolls when the thumb is released. MSFlexGrid has a property of the same name.

### DisableNoScroll
{: .no_toc }

Returns or sets whether a scroll bar that is not needed is disabled instead of hidden. **Boolean**. Default: **False**.

Syntax: *object*.**DisableNoScroll** [ **=** *value* ]

### WheelScrollLines
{: .no_toc }

Returns or sets the number of lines the mouse wheel scrolls for each notch. **Long**. Default: the system setting.

Syntax: *object*.**WheelScrollLines** [ **=** *value* ]

*value*
: A **Long** from 0 to 100, or -1 for the system setting, which is read when the control starts and again when Windows reports a change of settings. Any other value raises error 380.

Reading the property returns the number of lines in use: after -1 has been assigned, it returns the system's number and not -1.

### ShowScrollTips
{: .no_toc }

Returns or sets whether a scroll tip appears while the user drags a scroll thumb. **Boolean**. Default: **False**.

Syntax: *object*.**ShowScrollTips** [ **=** *value* ]

Setting it to **True** creates the tip window, and setting it to **False** destroys it. See [Scroll tips](#scroll-tips).

### ScrollTipFollowThumb
{: .no_toc }

Returns or sets whether the scroll tip moves with the thumb. **Boolean**. Default: **False**, the tip stays at the place where the thumb was when the drag began.

Syntax: *object*.**ScrollTipFollowThumb** [ **=** *value* ]

### ScrollTipText
{: .no_toc }

Returns or sets the text of the scroll tip. **String**.

Syntax: *object*.**ScrollTipText** [ **=** *value* ]

Both the read and the assignment raise error 5 while the grid has no scroll tip, which is the case until [**ShowScrollTips**](#showscrolltips) is set to **True**. The text is empty at first. The handler of [**ScrollTip**](#scrolltip) sets it for the position that the event reports.

### hWndScrollTip
{: .no_toc }

Returns the window handle of the scroll tip. **LongPtr**, read-only.

Syntax: *object*.**hWndScrollTip**

The handle is 0 while **ShowScrollTips** is **False**.

### AllowReaderMode
{: .no_toc }

Returns or sets whether the middle mouse button starts reader mode, the system's auto-scrolling and panning. **Boolean**. Default: **False**.

Syntax: *object*.**AllowReaderMode** [ **=** *value* ]

It has an effect only when the grid has rows and columns and **ScrollBars** is not **vbSBNone**.

### AllowScrollLock
{: .no_toc }

Returns or sets whether the arrow keys scroll the grid while Scroll Lock is on. **Boolean**. Default: **False**.

Syntax: *object*.**AllowScrollLock** [ **=** *value* ]

### TopRow
{: .no_toc }

Returns or sets the first row of the window, after the fixed and frozen rows.

Syntax: *object*.**TopRow** [ **=** *value* ]

*value*
: A **Long** from 0 to [**Rows**](Structure#rows) - 1. A value outside the grid raises error 30009, *Invalid Row value*.

Assigning it scrolls the grid vertically, and raises [**Scroll**](#scroll) when the view changes. The request is adjusted as [described above](#the-part-that-is-in-view). It works whatever **ScrollBars** is.

### BottomRow
{: .no_toc }

Returns the last row of the window. **Long**, read-only.

Syntax: *object*.**BottomRow** [ ( *Visibility* ) ]

*Visibility*
: *optional* A [**FlexVisibilityConstants**](../Enumerations/SelectionAndInput#flexvisibilityconstants) member. Default: **FlexVisibilityPartialOK**, which includes a last row that is cut off by the bottom edge. Any other value raises error 380.

### LeftCol
{: .no_toc }

Returns or sets the first column of the window, after the fixed and frozen columns.

Syntax: *object*.**LeftCol** [ **=** *value* ]

*value*
: A **Long** from 0 to [**Cols**](Structure#cols) - 1. A value outside the grid raises error 30010, *Invalid Col value*.

Works as [**TopRow**](#toprow) does, horizontally.

### RightCol
{: .no_toc }

Returns the last column of the window. **Long**, read-only.

Syntax: *object*.**RightCol** [ ( *Visibility* ) ]

*Visibility*
: *optional* As for [**BottomRow**](#bottomrow). Default: **FlexVisibilityPartialOK**.

### RowIsVisible
{: .no_toc }

Returns whether a row is in view. **Boolean**, read-only.

Syntax: *object*.**RowIsVisible** ( *Index* [, *Visibility* ] )

*Index*
: *required* A **Long**, the row number. A row outside the grid raises error 30009.

*Visibility*
: *optional* As for [**BottomRow**](#bottomrow). Default: **FlexVisibilityPartialOK**.

A fixed or frozen row is in view when it fits in the control. Any other row is in view when it lies in the window.

### ColIsVisible
{: .no_toc }

Returns whether a column is in view. **Boolean**, read-only.

Syntax: *object*.**ColIsVisible** ( *Index* [, *Visibility* ] )

Works as [**RowIsVisible**](#rowisvisible) does, for a column. A column outside the grid raises error 30010.

### RowsVisible
{: .no_toc }

Returns the number of rows in view, fixed and frozen rows included. **Long**, read-only.

Syntax: *object*.**RowsVisible** [ ( *Visibility* ) ]

*Visibility*
: *optional* As for [**BottomRow**](#bottomrow). Default: **FlexVisibilityCompleteOnly**.

### ColsVisible
{: .no_toc }

Returns the number of columns in view, fixed and frozen columns included. **Long**, read-only.

Syntax: *object*.**ColsVisible** [ ( *Visibility* ) ]

Works as [**RowsVisible**](#rowsvisible) does. Default: **FlexVisibilityCompleteOnly**.

### RowsPerPage
{: .no_toc }

Returns how many rows of the window fit in the control when [**TopRow**](#toprow) is the first of them, not counting the fixed and frozen rows. **Long**, read-only.

Syntax: *object*.**RowsPerPage**

At least 1 when the grid has a window.

### ColsPerPage
{: .no_toc }

Returns how many columns of the window fit in the control when [**LeftCol**](#leftcol) is the first of them, not counting the fixed and frozen columns. **Long**, read-only.

Syntax: *object*.**ColsPerPage**

## Methods

### CellEnsureVisible
{: .no_toc }

Scrolls the grid so that a cell is in view.

Syntax: *object*.**CellEnsureVisible** [ *Visibility* [, *Row* [, *Col* ]] ]

*Visibility*
: *optional* A [**FlexVisibilityConstants**](../Enumerations/SelectionAndInput#flexvisibilityconstants) member. Default: **FlexVisibilityCompleteOnly**. With **FlexVisibilityPartialOK** a cell that is partly in view is left where it is. Any other value raises error 380.

*Row*, *Col*
: *optional* **Long** The cell. When omitted, or -1, the current cell. A value below -1 raises error 380, and a cell outside the grid raises error 381, *Subscript out of range*.

The grid scrolls by the least amount that brings the whole cell into view, and not at all when it is in view already. A cell in a fixed or frozen row or column needs no scrolling in that direction. [**CellLeft**](Sizing#cellleft), [**CellTop**](Sizing#celltop), [**CellWidth**](Sizing#cellwidth) and [**CellHeight**](Sizing#cellheight) call this method first, so they describe a current cell that is in view. See [Scroll bars](#scroll-bars) for the case in which it does nothing.

```tb check_build check_run slot=sub id=scrolling-ensure
Dim g As VBFLXGRD18.VBFlexGrid
Set g = VBFlexGrid1
g.Rows = 100: g.Cols = 30

g.Row = 90: g.Col = 25
g.CellEnsureVisible                 ' the current cell
Debug.Print "current cell in view: " & g.RowIsVisible(90, FlexVisibilityCompleteOnly) & " " & g.ColIsVisible(25, FlexVisibilityCompleteOnly)

g.CellEnsureVisible , 3, 2          ' another cell, with the default Visibility
Debug.Print "row 3 in view: " & g.RowIsVisible(3, FlexVisibilityCompleteOnly) & ", the current cell is still " & g.Row & "," & g.Col
' Output:
' current cell in view: True True
' row 3 in view: True, the current cell is still 90,25
```

## Events

### Scroll
{: .no_toc }

Occurs when the view has scrolled.

Syntax: **Private Sub** *object*\_**Scroll** ( )

**TopRow** and **LeftCol** have their new values. See [The Scroll event](#the-scroll-event).

### ScrollTip
{: .no_toc }

Occurs when the control is about to show the scroll tip.

Syntax: **Private Sub** *object*\_**ScrollTip** ( **ByVal** *Row* **As Long**, **ByVal** *Col* **As Long** )

*Row*, *Col*
: While the user drags the vertical thumb, *Row* is the row that the view would start with and *Col* is -1. While the user drags the horizontal thumb, *Col* is the column and *Row* is -1.

Set [**ScrollTipText**](#scrolltiptext) in the handler. The event is raised only when **ShowScrollTips** is **True**.

```tb check_build
Private Sub Form_Load()
    VBFlexGrid1.ShowScrollTips = True
End Sub

Private Sub VBFlexGrid1_ScrollTip(ByVal Row As Long, ByVal Col As Long)
    If Row > -1 Then
        VBFlexGrid1.ScrollTipText = "Row " & Row
    Else
        VBFlexGrid1.ScrollTipText = "Column " & Col
    End If
End Sub
```

## Errors

An index outside the grid raises error 30009 for a row and 30010 for a column. A bad *Visibility*, or an argument below -1 to **CellEnsureVisible**, raises 380.

```tb check_build check_run slot=sub id=scrolling-errors
Dim g As VBFLXGRD18.VBFlexGrid
Set g = VBFlexGrid1
g.Rows = 100: g.Cols = 30
On Error Resume Next

Err.Clear: g.TopRow = 100
Debug.Print "TopRow 100: " & Err.Number & " " & Err.Description
Err.Clear: g.LeftCol = 30
Debug.Print "LeftCol 30: " & Err.Number & " " & Err.Description
Err.Clear: Debug.Print g.RowIsVisible(100)
Debug.Print "RowIsVisible 100: " & Err.Number
Err.Clear: g.CellEnsureVisible 5
Debug.Print "CellEnsureVisible 5: " & Err.Number
Err.Clear: g.CellEnsureVisible , -2
Debug.Print "CellEnsureVisible , -2: " & Err.Number
Err.Clear: g.CellEnsureVisible , 100, 1
Debug.Print "CellEnsureVisible , 100, 1: " & Err.Number & " " & Err.Description
Err.Clear: g.ScrollBars = 7
Debug.Print "ScrollBars 7: " & Err.Number
Err.Clear: g.WheelScrollLines = 101
Debug.Print "WheelScrollLines 101: " & Err.Number
Err.Clear: Debug.Print g.ScrollTipText
Debug.Print "ScrollTipText: " & Err.Number
' Output:
' TopRow 100: 30009 Invalid Row value
' LeftCol 30: 30010 Invalid Col value
' RowIsVisible 100: 30009
' CellEnsureVisible 5: 380
' CellEnsureVisible , -2: 380
' CellEnsureVisible , 100, 1: 381 Subscript out of range
' ScrollBars 7: 380
' WheelScrollLines 101: 380
' ScrollTipText: 5
```

The defaults of this page's properties, read back:

```tb check_build check_run slot=sub id=scrolling-defaults arch=win32,win64
Dim g As VBFLXGRD18.VBFlexGrid
Set g = VBFlexGrid1
Debug.Print "ScrollBars " & g.ScrollBars & ", ScrollTrack " & g.ScrollTrack & ", DisableNoScroll " & g.DisableNoScroll
Debug.Print "ShowScrollTips " & g.ShowScrollTips & ", ScrollTipFollowThumb " & g.ScrollTipFollowThumb
Debug.Print "AllowReaderMode " & g.AllowReaderMode & ", AllowScrollLock " & g.AllowScrollLock
Debug.Print "hWndScrollTip " & g.hWndScrollTip

g.ShowScrollTips = True
Debug.Print "after ShowScrollTips: " & (g.hWndScrollTip <> 0)
' Output:
' ScrollBars 3, ScrollTrack False, DisableNoScroll False
' ShowScrollTips False, ScrollTipFollowThumb False
' AllowReaderMode False, AllowScrollLock False
' hWndScrollTip 0
' after ShowScrollTips: True
```

## See Also

- [VBFlexGrid](.) -- the control
- [Current Cell and Selection](Selection) -- the current cell, which the keyboard scrolls to
- [Rows and Columns](Structure) -- fixed and frozen rows and columns
- [Sizes and Positions](Sizing) -- row heights and column widths
- [FlexVisibilityConstants](../Enumerations/SelectionAndInput#flexvisibilityconstants), [ScrollBarConstants](../../../VBRUN/Constants/ScrollBarConstants)

