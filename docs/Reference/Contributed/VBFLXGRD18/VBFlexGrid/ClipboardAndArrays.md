---
title: Clipboard, Undo and Arrays
parent: VBFlexGrid
grand_parent: VBFLXGRD18 Package
permalink: /tB/Packages/Contributed/VBFLXGRD18/VBFlexGrid/ClipboardAndArrays
---

# Clipboard, Undo and Arrays
{: .no_toc }

Reading and writing a range of cells as one string, copying to and pasting from the Windows clipboard, undoing those changes, and moving the contents of the grid to and from arrays.

* TOC
{:toc}

## The clip string

The text of a range of cells can be read or written as one string, the *clip*. Cells of a row are separated by a tab character and rows by a carriage return (**vbTab** and **vbCr**), and the text of the last cell has no separator after it.

[**Clip**](#clip) reads the clip of the current selection and writes the clip you give to the cells of the selection. The clipboard methods [**Copy**](#copy), [**Cut**](#cut) and [**Paste**](#paste) are the same operation with the Windows clipboard, in the Unicode text format.

```tb check_build check_run slot=sub arch=win32,win64
Dim Row As Long, Col As Long

With VBFlexGrid1
    .FixedRows = 1: .FixedCols = 1
    .Rows = 4: .Cols = 3
    For Row = 0 To 3
        For Col = 0 To 2
            .TextMatrix(Row, Col) = Chr$(65 + Row) & Col     ' A0 A1 A2 / B0 B1 B2 / ...
        Next
    Next

    .SelectRange 1, 1, 2, 2                                  ' B1 B2 / C1 C2
    Debug.Print Replace(Replace(.Clip, vbTab, "|"), vbCr, "/")

    .ClipSeparators = ",;"                                   ' a column separator and a row separator
    Debug.Print .Clip
End With
' Output:
' B1|B2/C1|C2
' B1,B2;C1,C2
```

The separators are set in two ways. [**ClipSeparatorCol**](#clipseparatorcol) and [**ClipSeparatorRow**](#clipseparatorrow) are strings of any length; **ClipSeparatorRow** can be **vbCrLf**, which is the line break of most Windows programs. [**ClipSeparators**](#clipseparators) is a string of two characters, the column separator and the row separator, that replaces the other two while it is not empty. A cell whose text contains a separator is not protected in any way, so a clip cannot be read back reliably when the text contains one.

A string of cells is written into the selection from its top left cell, one cell for each piece of the string. With [**ClipPasteMode**](#clippastemode) **FlexClipPasteModeNormal** a piece that does not fit in the selection is dropped, and a selection that is larger than the string keeps its other cells. A selection of one cell receives only the first piece.

```tb check_build check_run slot=sub arch=win32,win64
Dim Row As Long, Line As String

With VBFlexGrid1
    .FixedRows = 0: .FixedCols = 0
    .Rows = 3: .Cols = 3

    .SelectRange 0, 0, 0, 0                                  ' one cell
    .Clip = "1" & vbTab & "2" & vbCr & "3" & vbTab & "4"
    Debug.Print "[" & .TextMatrix(0, 0) & "][" & .TextMatrix(0, 1) & "]"

    .ClipPasteMode = FlexClipPasteModeAutoSelection          ' the selection grows to the string
    .Clip = "1" & vbTab & "2" & vbCr & "3" & vbTab & "4"
    For Row = 0 To 1
        Line = Line & .TextMatrix(Row, 0) & .TextMatrix(Row, 1) & " "
    Next
    Debug.Print Line & .Row & .Col & .RowSel & .ColSel
End With
' Output:
' [1][]
' 12 34 0011
```

### What a clip holds

[**ClipCopyMode**](#clipcopymode) says what [**Clip**](#clip) (when it is read) and [**Copy**](#copy) take from the grid: the selection alone (the default), or the selection with the fixed rows above it, the fixed columns before it, or both. The Extended values take the visual selection: with a selection mode by row or by column the whole row or column, and with [**AllowMultiSelection**](Selection#allowmultiselection) the selected rows. Reading and writing differ here: **ClipCopyMode** does not apply to writing.

[**ClipMode**](#clipmode) applies to reading and to writing. With **FlexClipModeExcludeHidden** the hidden rows and columns are left out. With **FlexClipModeLookupConv** the text of a column that has a [**ColLookup**](Text#collookup) is read as the value that the lookup shows, and written back as its key, which is what a user sees in a spreadsheet when they copy the cells. **FlexClipModeLookupConvExcludeHidden** does both.

```tb check_build check_run slot=sub arch=win32,win64
Dim Row As Long, Col As Long

With VBFlexGrid1
    .FixedRows = 1: .FixedCols = 1
    .Rows = 4: .Cols = 4
    For Row = 0 To 3
        For Col = 0 To 3
            .TextMatrix(Row, Col) = Chr$(65 + Row) & Col
        Next
    Next
    .SelectRange 1, 1, 3, 3
    .RowHidden(2) = True: .ColHidden(2) = True

    Debug.Print Replace(Replace(.Clip, vbTab, "|"), vbCr, "/")
    .ClipMode = FlexClipModeExcludeHidden
    Debug.Print Replace(Replace(.Clip, vbTab, "|"), vbCr, "/")

    .ClipMode = FlexClipModeNormal
    .ClipCopyMode = FlexClipCopyModeIncludeFixedAll
    Debug.Print Replace(Replace(.Clip, vbTab, "|"), vbCr, "/")
End With
' Output:
' B1|B2|B3/C1|C2|C3/D1|D2|D3
' B1|B3/D1|D3
' A0|A1|A2|A3/B0|B1|B2|B3/C0|C1|C2|C3/D0|D1|D2|D3
```

```tb check_build check_run slot=sub arch=win32,win64
With VBFlexGrid1
    .FixedRows = 0: .FixedCols = 0
    .Rows = 2: .Cols = 1
    .ColLookup(0) = "1;one|2;two"                ' keys 1 and 2 are shown as one and two
    .ClipMode = FlexClipModeLookupConv

    .TextMatrix(0, 0) = "1": .TextMatrix(1, 0) = "2"
    .SelectRange 0, 0, 1, 0
    Debug.Print Replace(.Clip, vbCr, "/")          ' the shown text

    .Clip = "two" & vbCr & "one"                    ' written as keys
    Debug.Print .TextMatrix(0, 0) & .TextMatrix(1, 0)
End With
' Output:
' one/two
' 21
```

### Strings and arrays

[**ParseClip**](#parseclip) splits a clip string into a two-dimensional array without a grid range, and [**ConstructClip**](#constructclip) joins such an array. Both use the separators that are set, and the arrays are indexed by row and then by column, from 0.

```tb check_build check_run slot=sub arch=win32,win64
Dim Cells As Variant, Clip As String

With VBFlexGrid1
    Cells = .ParseClip("a" & vbTab & "b" & vbCr & "c")       ' the second row is short
    Debug.Print UBound(Cells, 1) & " " & UBound(Cells, 2)
    Debug.Print "[" & Cells(1, 0) & "][" & Cells(1, 1) & "]"

    Clip = .ConstructClip(Cells)
    Debug.Print Replace(Replace(Clip, vbTab, "|"), vbCr, "/")
End With
' Output:
' 1 1
' [c][]
' a|b/c|
```

## Copy, Cut, Paste and Delete

[**Copy**](#copy) puts the clip of the selection on the clipboard. [**Cut**](#cut) does the same and then clears the text of the selection. [**Paste**](#paste) writes the text on the clipboard into the grid like **Clip** does, and does nothing when the clipboard holds no text ([**CanPaste**](#canpaste)). [**Delete**](#delete) clears the text of the selection and leaves the clipboard alone. **Cut**, **Paste** and **Delete** scroll the grid to show the current cell when they have finished.

[**BeforeClipboardAction**](#beforeclipboardaction) comes first and can change the text or stop the operation, and [**AfterClipboardAction**](#afterclipboardaction) comes after a completed one. With [**AutoClipboard**](#autoclipboard) **True**, the keys do the same: Ctrl+C and Ctrl+Insert copy, and the other keys act only when [**AllowUserEditing**](Editing#allowuserediting) is **True**: Ctrl+X and Shift+Delete cut, Ctrl+V and Shift+Insert paste, and Delete and Ctrl+Delete delete.

<!-- test: ClipboardTests.Cut_ClipboardHeld_KeepsTheText, ClipboardTests.Cut_ClipboardHeld_UndoBringsTheTextBack, ClipboardTests.Copy_ClipboardHeld_RaisesNoAfterClipboardAction, ClipboardTests.Cut_ClipboardHeld_RaisesNoAfterClipboardAction, ClipboardTests.Paste_ClipboardHeld_DoesNothing, ClipboardTests.Paste_ClipboardBusyAtTheSecondOpen_KeepsTheText -->
> [!WARNING] 1.8.69.0
> **Copy**, **Cut** and **Paste** do not check that they could open the clipboard, and another program can hold it open for a moment, as a program that watches the clipboard often does right after something is copied. **Copy** then puts nothing on the clipboard, and **Cut** clears the text of the selection all the same, so that text is lost; with [**UndoLimit**](#undolimit) above 0 (the default is 0), **Undo** brings it back. **Paste** opens the clipboard twice, once to see that it holds text and once to read it: held at the first, **Paste** does nothing and raises no event; held at the second, it writes an empty text over the selection. Each raises [**AfterClipboardAction**](#afterclipboardaction) as after an action that worked, except a **Paste** that did nothing. Code that pastes right after a **Copy** can check the result and paste again, as the sample below does.

```tb check_build slot=file projname=clip-events
Class ClipLog
    Private WithEvents Grid As VBFLXGRD18.VBFlexGrid
    Public Log As String
    Public BlockActions As Boolean

    Public Sub Attach(ByVal G As VBFLXGRD18.VBFlexGrid)
        Set Grid = G
    End Sub

    Private Sub Grid_BeforeClipboardAction(ByVal Action As FlexClipboardActionConstants, Text As String, Cancel As Boolean)
        Log = Log & "before " & Action & " "
        If Action = FlexClipboardActionPaste Then Text = UCase$(Text)   ' changes what is pasted
        Cancel = BlockActions
    End Sub

    Private Sub Grid_AfterClipboardAction(ByVal Action As FlexClipboardActionConstants)
        Log = Log & "after " & Action & " "
    End Sub
End Class
```

```tb check_build check_run slot=sub projname=clip-events
Dim Watcher As New ClipLog
Watcher.Attach VBFlexGrid1

With VBFlexGrid1
    .FixedRows = 0: .FixedCols = 0
    .Rows = 2: .Cols = 2
    .TextMatrix(0, 0) = "ab": .TextMatrix(0, 1) = "cd"

    .SelectRange 0, 0, 0, 0
    .Copy                                          ' action 0
    Debug.Print Watcher.Log

    .SelectRange 1, 0, 1, 0
    Dim tries As Long
    Do                                             ' another program can hold the clipboard for a moment
        .Paste                                     ' action 2, the handler makes the text upper case
        DoEvents
        tries += 1
    Loop Until .TextMatrix(1, 0) <> "" Or tries > 500
    Debug.Print .TextMatrix(1, 0)

    Watcher.Log = ""
    Watcher.BlockActions = True
    .SelectRange 0, 0, 0, 1
    .Cut                                           ' action 1, stopped
    .Delete                                        ' action 3, stopped
    Debug.Print .TextMatrix(0, 0) & .TextMatrix(0, 1)
End With
Debug.Print Watcher.Log
' Output:
' before 0 after 0 
' AB
' abcd
' before 1 before 3 
```

### Undo and redo

When [**UndoLimit**](#undolimit) is more than 0, the control keeps a queue of the actions of [**Cut**](#cut), [**Paste**](#paste) and [**Delete**](#delete), and of the cell edits that the user makes, up to that number. [**Undo**](#undo) takes back the latest and selects the range that it changed, [**Redo**](#redo) does it again, and a new action empties the redo queue. A change by [**TextMatrix**](Text#textmatrix), [**Clip**](#clip) or any other member is not recorded. [**CanUndo**](#canundo) and [**CanRedo**](#canredo) say whether there is something to take back or to do again, and [**ResetUndoQueue**](#resetundoqueue) empties both queues. Setting **UndoLimit** also empties both.

```tb check_build check_run slot=sub arch=win32,win64
With VBFlexGrid1
    .FixedRows = 0: .FixedCols = 0
    .Rows = 2: .Cols = 1
    .TextMatrix(0, 0) = "one": .TextMatrix(1, 0) = "two"
    .UndoLimit = 10
    Debug.Print .CanUndo

    .SelectRange 0, 0, 0, 0
    .Delete
    Debug.Print "[" & .TextMatrix(0, 0) & "] " & .CanUndo & " " & .CanRedo

    .Undo
    Debug.Print .TextMatrix(0, 0) & " " & .CanUndo & " " & .CanRedo

    .Redo
    Debug.Print "[" & .TextMatrix(0, 0) & "]"

    .TextMatrix(1, 0) = "changed"                   ' not recorded
    .Undo
    Debug.Print .TextMatrix(0, 0) & " " & .TextMatrix(1, 0)
End With
' Output:
' False
' [] True False
' one False True
' []
' one changed
```

```tb check_build slot=file projname=clip-keys
Module ClipKeys
    Private Declare PtrSafe Function SendMessageW Lib "user32" (ByVal hWnd As LongPtr, ByVal Msg As Long, ByVal wParam As LongPtr, ByVal lParam As LongPtr) As LongPtr

    ' Sends the key to the control as if the user had pressed it and let it go.
    Public Sub PressKey(ByVal hWnd As LongPtr, ByVal KeyCode As Long)
        Const WM_KEYDOWN As Long = &H100
        Const WM_KEYUP As Long = &H101
        SendMessageW hWnd, WM_KEYDOWN, KeyCode, 0
        SendMessageW hWnd, WM_KEYUP, KeyCode, 0
    End Sub
End Module
```

```tb check_build check_run slot=sub projname=clip-keys
With VBFlexGrid1
    .FixedRows = 0: .FixedCols = 0
    .Rows = 2: .Cols = 1
    .TextMatrix(0, 0) = "one"
    .AllowUserEditing = True
    .AutoClipboard = True
    .UndoLimit = 5
    .SelectRange 0, 0, 0, 0

    Form1.Show
    DoEvents
    .SetFocus
    DoEvents

    PressKey .hWnd, vbKeyDelete                     ' the Delete key
    Debug.Print "[" & .TextMatrix(0, 0) & "]"
    .Undo
    Debug.Print .TextMatrix(0, 0)
End With
' Output:
' []
' one
```

## Arrays

[**SaveArray**](#savearray) copies a range of the grid into an array and [**LoadArray**](#loadarray) copies an array into the grid. By default both use an array indexed by column first and by row second, the order of the array that the **GetRows** method of an ADO recordset returns (see [Data Binding](DataBinding)). Row-first arrays are chosen with arguments.

```tb check_build check_run slot=sub arch=win32,win64
Dim Data(0 To 1, 0 To 2) As String                 ' 2 columns, 3 rows
Dim Saved As Variant, Row As Long, Line As String

Data(0, 0) = "a0": Data(0, 1) = "a1": Data(0, 2) = "a2"
Data(1, 0) = "b0": Data(1, 1) = "b1": Data(1, 2) = "b2"

With VBFlexGrid1
    .FixedRows = 1: .FixedCols = 0
    .Rows = 10: .Cols = 5

    Debug.Print .LoadArray(Data)                     ' rows loaded
    Debug.Print .Rows & "x" & .Cols                  ' the grid fits the array
    For Row = 1 To 3: Line = Line & .TextMatrix(Row, 0) & .TextMatrix(Row, 1) & " ": Next
    Debug.Print Line

    Saved = .SaveArray                               ' column first: Saved(col, row)
    Debug.Print UBound(Saved, 1) & " " & UBound(Saved, 2) & " " & Saved(1, 2)

    Saved = .SaveArray(FlexRowMajor)                 ' row first: Saved(row, col)
    Debug.Print UBound(Saved, 1) & " " & UBound(Saved, 2) & " " & Saved(2, 1)
End With
' Output:
' 3
' 4x2
' a0b0 a1b1 a2b2 
' 1 2 b2
' 2 1 b2
```

[**SaveArray**](#savearray) by default starts at the first cell that is not fixed, as [**LoadArray**](#loadarray) does. To include the fixed cells, give 0 for *Row* and *Col*.

### Columns with a data type

A column that has a [**ColDataType**](Text#coldatatype) can be saved as the values of that type. A cell that is empty stays **Empty**, and a cell that does not hold a value of the type becomes **Null**, or stays text when the column is not nullable and *UseColNullable* is **True**.

```tb check_build check_run slot=sub arch=win32,win64
Dim Values As Variant

With VBFlexGrid1
    .FixedRows = 0: .FixedCols = 0
    .Rows = 3: .Cols = 1
    .ColDataType(0) = vbLong
    .TextMatrix(0, 0) = "12": .TextMatrix(1, 0) = "x": .TextMatrix(2, 0) = ""

    Values = .SaveArray(FlexRowMajor, , , , , , , True)
    Debug.Print TypeName(Values(0, 0)) & " " & TypeName(Values(1, 0)) & " " & TypeName(Values(2, 0))
End With
' Output:
' Long Null Empty
```

## Properties

### AutoClipboard
{: .no_toc }

Whether the keys for the clipboard operations are handled by the control.

Syntax: *object*.**AutoClipboard** [ = *value* ]

A **Boolean**. Default: **False**. See [Copy, Cut, Paste and Delete](#copy-cut-paste-and-delete) for the keys.

### Clip
{: .no_toc }

The text of the selected cells as one string.

Syntax: *object*.**Clip** [ = *value* ]

A **String**. Read, it holds the cells chosen by [**ClipCopyMode**](#clipcopymode), in the order of the grid, with the column separator after each cell but the last of a row and the row separator after each row but the last. Written, it is split by the separators and each piece goes to the next cell of the selection: see [The clip string](#the-clip-string). A hidden row or column takes part unless [**ClipMode**](#clipmode) says otherwise.

Raises error 7 when the grid has no cells and the property is read, and error 30009 or 30010 when the grid has no current row or column and the property is written.

### ClipCopyMode
{: .no_toc }

What a read of **Clip**, **Copy** and **Cut** take from the grid.

Syntax: *object*.**ClipCopyMode** [ = *value* ]

A [**FlexClipCopyModeConstants**](../Enumerations/SelectionAndInput#flexclipcopymodeconstants) value. Default: **FlexClipCopyModeNormal**, the selection only. A value outside the enumeration raises error 380.

### ClipMode
{: .no_toc }

Whether hidden cells are left out of a clip, and whether the text of a column with a lookup is converted.

Syntax: *object*.**ClipMode** [ = *value* ]

A [**FlexClipModeConstants**](../Enumerations/SelectionAndInput#flexclipmodeconstants) value. Default: **FlexClipModeNormal**. A value outside the enumeration raises error 380.

### ClipPasteMode
{: .no_toc }

How a string is written into the grid by **Clip**, **Paste** and **Redo**.

Syntax: *object*.**ClipPasteMode** [ = *value* ]

A [**FlexClipPasteModeConstants**](../Enumerations/SelectionAndInput#flexclippastemodeconstants) value. Default: **FlexClipPasteModeNormal**, which writes into the selection only. **FlexClipPasteModeAutoSelection** extends the selection to the size of the string, as far as the grid goes. The two Extended values are for a selection mode by row with free columns (**FlexSelectionModeFreeByRow**) and by column with free rows (**FlexSelectionModeFreeByColumn**): the string is written into the whole row, from its first column that is not fixed, or the whole column, from its first row that is not fixed. **FlexClipPasteModeExtendedAutoSelection** also grows the selection by the number of rows (or columns) in the string. A value outside the enumeration raises error 380.

### ClipSeparatorCol
{: .no_toc }

The string that separates the cells of a row in a clip.

Syntax: *object*.**ClipSeparatorCol** [ = *value* ]

A **String** of one character or more, not empty and not the same as [**ClipSeparatorRow**](#clipseparatorrow) (error 380). Default: **vbTab**. It is used only while [**ClipSeparators**](#clipseparators) is empty.

### ClipSeparatorRow
{: .no_toc }

The string that separates the rows in a clip.

Syntax: *object*.**ClipSeparatorRow** [ = *value* ]

A **String** of one character or more, not empty and not the same as [**ClipSeparatorCol**](#clipseparatorcol) (error 380). Default: **vbCr**. It is used only while [**ClipSeparators**](#clipseparators) is empty.

### ClipSeparators
{: .no_toc }

Two characters that are the column separator and the row separator of a clip.

Syntax: *object*.**ClipSeparators** [ = *value* ]

A **String** of exactly two different characters, or an empty string (the default) to use [**ClipSeparatorCol**](#clipseparatorcol) and [**ClipSeparatorRow**](#clipseparatorrow). Another length, or two equal characters, raises error 380.

### UndoLimit
{: .no_toc }

The number of actions that the undo queue holds.

Syntax: *object*.**UndoLimit** [ = *value* ]

A **Long** from 0 to 1000. Default: 0, which switches the undo feature off. A larger value is set to 1000, and a negative value raises error 380. When the queue is full, the oldest action is dropped. Setting the property empties the undo and redo queues.

## Methods

### CanPaste
{: .no_toc }

Whether the clipboard holds text that **Paste** can write.

Syntax: *object*.**CanPaste** **As Boolean**

**True** when the clipboard holds text in the Unicode text format. It is **False** as well while another program has the clipboard open, which a program that watches the clipboard often does for a moment after something is copied.

### CanRedo
{: .no_toc }

Whether the redo queue holds an action.

Syntax: *object*.**CanRedo** **As Boolean**

### CanUndo
{: .no_toc }

Whether the undo queue holds an action.

Syntax: *object*.**CanUndo** **As Boolean**

Always **False** while [**UndoLimit**](#undolimit) is 0.

### ConstructClip
{: .no_toc }

Joins a two-dimensional array of cells into a clip string.

Syntax: *object*.**ConstructClip** ( *ArrRows* ) **As String**

*ArrRows*
: *required* A **Variant** holding a two-dimensional array of **String** or **Variant**, indexed by row first and column second. Any lower bounds are accepted. A **Null** element is an empty cell.

Returns the string, with the current separators, or an empty string when an array has no elements. Raises error 380 when *ArrRows* is not an array, error 5 when it does not have two dimensions, error 13 for an element type other than **String** or **Variant**, and error 91 for an array that is not allocated.

### Copy
{: .no_toc }

Copies the selection to the clipboard.

Syntax: *object*.**Copy**

Raises [**BeforeClipboardAction**](#beforeclipboardaction), puts the text of [**Clip**](#clip) on the clipboard (the handler can change it first) and raises [**AfterClipboardAction**](#afterclipboardaction). Nothing happens when the handler sets *Cancel*.

### Cut
{: .no_toc }

Copies the selection to the clipboard and clears the text of the selection.

Syntax: *object*.**Cut**

Like [**Copy**](#copy), with the action **FlexClipboardActionCut**. It can be undone with [**Undo**](#undo).

### Delete
{: .no_toc }

Clears the text of the selection.

Syntax: *object*.**Delete**

The clipboard is not changed. [**BeforeClipboardAction**](#beforeclipboardaction) and [**AfterClipboardAction**](#afterclipboardaction) have the action **FlexClipboardActionDelete**, and the text that the first receives is empty. It can be undone with [**Undo**](#undo). With a [**ClipPasteMode**](#clippastemode) of the Extended kind, the cleared range is the extended selection.

### LoadArray
{: .no_toc }

Writes the elements of an array into the grid.

Syntax: *object*.**LoadArray** ( *Data* [, *RowDim* [, *ColDim* [, *PageDim* [, *CurrentPage* [, *Rows* [, *Cols* [, *Row* [, *Col* [, *RestrictRows* [, *RestrictColumns* [, *DataCols* ]]]]]]]]]]] ) **As Long**

*Data*
: *required* A **Variant** holding an array of **String** or **Variant**, of one to nine dimensions. A **Null** element becomes an empty cell. An array of one dimension needs *RowDim* or *ColDim* to be 0.

*RowDim*
: *optional* A **Long**, the number of the dimension of *Data* that holds the rows. Default: 2.

*ColDim*
: *optional* A **Long**, the number of the dimension of *Data* that holds the columns. Default: 1. With the defaults, *Data* is indexed by column and then by row.

*PageDim*
: *optional* A **Long**, the number of a third dimension from which one page is loaded, or 0 for none (the default).

*CurrentPage*
: *optional* A **Long**, the index in *PageDim* of the page to load.

*Rows*, *Cols*
: *optional* **Long** values, the number of rows and columns to load. Default: -1, all of them.

*Row*, *Col*
: *optional* **Long** values, the first cell to write into. Default: -1, the first row and the first column that are not fixed.

*RestrictRows*, *RestrictColumns*
: *optional* **Boolean** values. When **False** (the default) the number of rows (or columns) of the grid is set to what is needed for the data, starting at *Row* (or *Col*), and so can become smaller. When **True** the grid keeps its size and what does not fit is not loaded.

*DataCols*
: *optional* A **Variant**, a column number of *Data* or an array of them, to load only those columns of *Data* into the grid, in the order given.

Returns the number of rows loaded, and does nothing, returning 0, when *Data* is **Empty**. Raises error 380 when *Data* is not an array or an argument is below -1, error 381 for a *Row* or *Col* outside the grid or a dimension number that *Data* does not have, error 5 for an array of more than nine dimensions or of one dimension with both *RowDim* and *ColDim* above 0, error 13 for an element type other than **String** or **Variant**, and error 91 for an array that is not allocated.

### ParseClip
{: .no_toc }

Splits a clip string into a two-dimensional array.

Syntax: *object*.**ParseClip** ( *Text* [, *Rows* [, *Cols* ]] ) **As Variant**

*Text*
: *required* A **String**, with the separators that are set.

*Rows*, *Cols*
: *optional* **Long** values, the greatest number of rows and columns to return. Default: -1, no limit.

Returns an array of **String**, indexed by row first and column second, from 0. Its width is that of the widest row and a shorter row has empty strings at its end. A *Rows* or *Cols* of 0 returns **Empty**.

### Paste
{: .no_toc }

Writes the text of the clipboard into the grid.

Syntax: *object*.**Paste**

Does nothing when the clipboard holds no text. Otherwise raises [**BeforeClipboardAction**](#beforeclipboardaction) with the text, writes the text, which a handler may have changed, like [**Clip**](#clip) does, with [**ClipPasteMode**](#clippastemode), and raises [**AfterClipboardAction**](#afterclipboardaction). It can be undone with [**Undo**](#undo).

See the warning under [Copy, Cut, Paste and Delete](#copy-cut-paste-and-delete) about a clipboard that another program holds.

### Redo
{: .no_toc }

Does the latest undone action again.

Syntax: *object*.**Redo**

Does nothing when [**CanRedo**](#canredo) is **False**. Selects the range of the action first.

### ResetUndoQueue
{: .no_toc }

Empties the undo queue and the redo queue.

Syntax: *object*.**ResetUndoQueue**

### SaveArray
{: .no_toc }

Copies a range of the grid into an array.

Syntax: *object*.**SaveArray** ( [ *Order* [, *Rows* [, *Cols* [, *Row* [, *Col* [, *ExcludeHidden* [, *TextDisplay* [, *UseColDataType* [, *UseColNullable* [, *OneDim* ]]]]]]]]]] ) **As Variant**

*Order*
: *optional* A [**FlexArrayOrderConstants**](../Enumerations/SelectionAndInput#flexarrayorderconstants) value. **FlexColumnMajor** (the default) returns an array indexed by column first and row second, **FlexRowMajor** one indexed by row first.

*Rows*, *Cols*
: *optional* **Long** values, the number of rows and columns to copy. Default: -1, as many as the grid has from *Row* and *Col*.

*Row*, *Col*
: *optional* **Long** values, the first cell. Default: -1, the first row and first column that are not fixed.

*ExcludeHidden*
: *optional* A **Boolean**. When **True**, hidden rows and columns are not copied. Default: **False**.

*TextDisplay*
: *optional* A **Boolean**. When **True**, the text that the cells show, after [**ColLookup**](Text#collookup) and [**ColFormat**](Text#colformat), is copied. Default: **False**.

*UseColDataType*
: *optional* A **Boolean**. When **True**, each cell of a row that is not fixed is converted to the [**ColDataType**](Text#coldatatype) of its column and the array is of **Variant**. Default: **False**, when the array is of **String**.

*UseColNullable*
: *optional* A **Boolean**. Only with *UseColDataType*; error 5 otherwise. When **True**, a cell that cannot be converted keeps its text if the column is not [**ColNullable**](Text#colnullable), and is **Null** if it is.

*OneDim*
: *optional* A **Boolean**. When **True**, the array has one dimension, with the cells in the order given by *Order*. Default: **False**.

Returns the array, with lower bounds of 0, or **Empty** when there is nothing to copy. With *UseColDataType*, an empty cell stays **Empty** and one that cannot be converted is **Null** (or keeps its text: see *UseColNullable*); the cells of fixed rows are always text. Raises error 380 for a value below -1 or an *Order* outside the enumeration, and error 381 when *Row* or *Col* is outside the grid.

### Undo
{: .no_toc }

Takes back the latest action in the undo queue.

Syntax: *object*.**Undo**

Does nothing when [**CanUndo**](#canundo) is **False**. Selects the range of the action first and restores its text. See [Undo and redo](#undo-and-redo).

## Events

### AfterClipboardAction
{: .no_toc }

Raised after a clipboard operation has been done.

Syntax: **Event** *object*\_**AfterClipboardAction** ( *Action* **As** [**FlexClipboardActionConstants**](../Enumerations/SelectionAndInput#flexclipboardactionconstants) )

*Action*
: **FlexClipboardActionCopy**, **FlexClipboardActionCut**, **FlexClipboardActionPaste** or **FlexClipboardActionDelete**.

It is not raised for an operation that **BeforeClipboardAction** stopped.

### BeforeClipboardAction
{: .no_toc }

Raised when a clipboard operation is about to be done.

Syntax: **Event** *object*\_**BeforeClipboardAction** ( *Action* **As** [**FlexClipboardActionConstants**](../Enumerations/SelectionAndInput#flexclipboardactionconstants), *Text* **As String**, *Cancel* **As Boolean** )

*Action*
: The operation.

*Text*
: For a copy and a cut, the text that goes on the clipboard, and for a paste, the text that is written to the grid. A handler can change it. It is empty for a delete.

*Cancel*
: A handler sets **True** to stop the operation.

## See Also

- [Current Cell and Selection](Selection) -- the selection that a clip reads and writes
- [Cell Text](Text) -- **ColLookup**, **ColFormat**, **ColDataType**, **ColNullable** and **TextMatrix**
- [Editing Cells](Editing) -- **AllowUserEditing**, which lets the keys of **AutoClipboard** change the grid
- [Data Binding](DataBinding) -- **CopyFromRecordset**, which fills the grid from a recordset
- [FlexClipModeConstants](../Enumerations/SelectionAndInput#flexclipmodeconstants), [FlexClipCopyModeConstants](../Enumerations/SelectionAndInput#flexclipcopymodeconstants), [FlexClipPasteModeConstants](../Enumerations/SelectionAndInput#flexclippastemodeconstants), [FlexClipboardActionConstants](../Enumerations/SelectionAndInput#flexclipboardactionconstants), [FlexArrayOrderConstants](../Enumerations/SelectionAndInput#flexarrayorderconstants) enumerations
