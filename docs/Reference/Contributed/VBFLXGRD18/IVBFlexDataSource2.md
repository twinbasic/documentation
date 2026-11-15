---
title: IVBFlexDataSource2
parent: VBFLXGRD18 Package
permalink: /tB/Packages/Contributed/VBFLXGRD18/IVBFlexDataSource2
---

# IVBFlexDataSource2 interface
{: .no_toc }

The interface that a class implements, in addition to [**IVBFlexDataSource**](IVBFlexDataSource), to give a [**VBFlexGrid**](VBFlexGrid/) options for how it uses the object, and to supply the tool tip text and the check box state of the cells.

An object is set as the [**FlexDataSource**](VBFlexGrid/DataBinding#flexdatasource) of the grid, and the grid looks whether its class also implements this interface. A class that does not is used with no flags and no tool tips or check boxes from it. A class that does must implement every method, also those of a feature it does not use. The methods of tool tips and check boxes are called only when [**GetFlags**](#getflags) says that they are used.

```tb check_build slot=file projname=ifds2-tasks
Class TaskSource
    Implements IVBFlexDataSource
    Implements IVBFlexDataSource2

    Private Titles(0 To 2) As String
    Private Done(0 To 2) As Integer

    Public Sub Fill()
        Titles(0) = "write": Titles(1) = "test": Titles(2) = "publish"
        Done(0) = 1
    End Sub

    Public Function IsDone(ByVal Record As Long) As Integer
        Return Done(Record)
    End Function

    Private Function IVBFlexDataSource_GetFieldCount() As Long
        Return 2
    End Function

    Private Function IVBFlexDataSource_GetRecordCount() As Long
        Return 3
    End Function

    Private Function IVBFlexDataSource_GetFieldName(ByVal Field As Long) As String
        Return IIf(Field = 0, "Task", "Done")
    End Function

    Private Function IVBFlexDataSource_GetData(ByVal Field As Long, ByVal Record As Long) As String
        Return IIf(Field = 0, Titles(Record), "")
    End Function

    Private Sub IVBFlexDataSource_SetData(ByVal Field As Long, ByVal Record As Long, ByVal NewData As String)
        If Field = 0 Then Titles(Record) = NewData
    End Sub

    Private Function IVBFlexDataSource2_GetFlags() As Long
        Return FlexDataSourceToolTipText Or FlexDataSourceChecked
    End Function

    Private Function IVBFlexDataSource2_GetToolTipText(ByVal Field As Long, ByVal Record As Long) As String
        Return "Task " & (Record + 1) & ": " & Titles(Record)
    End Function

    Private Sub IVBFlexDataSource2_SetToolTipText(ByVal Field As Long, ByVal Record As Long, ByVal NewValue As String)
        ' the tool tips are made from the titles; a new text is not kept
    End Sub

    Private Function IVBFlexDataSource2_GetChecked(ByVal Field As Long, ByVal Record As Long) As Integer
        Return Done(Record)
    End Function

    Private Sub IVBFlexDataSource2_SetChecked(ByVal Field As Long, ByVal Record As Long, ByVal NewValue As Integer)
        Done(Record) = NewValue
    End Sub
End Class
```

```tb check_build check_run slot=sub projname=ifds2-tasks
Dim Tasks As New TaskSource
Tasks.Fill

With VBFlexGrid1
    .FixedRows = 1: .FixedCols = 0
    .ColCheckBoxes(1) = True                         ' column 1 shows check boxes
    Set .FlexDataSource = Tasks

    .Row = 2: .Col = 0
    Debug.Print .CellToolTipText                     ' from GetToolTipText

    Debug.Print .Cell(FlexCellChecked, 1, 1) & " " & .Cell(FlexCellChecked, 2, 1)   ' from GetChecked
    .Cell(FlexCellChecked, 2, 1) = FlexChecked       ' reaches SetChecked
    Debug.Print Tasks.IsDone(1) & " " & .Cell(FlexCellChecked, 2, 1)
End With
' Output:
' Task 2: test
' 1 0
' 1 1
```

The flags are read once, when the object is set and when [**DataRefresh**](VBFlexGrid/DataBinding#datarefresh) is called. A change of the flags that the object makes later is not seen until then.

## Methods

### GetChecked
{: .no_toc }

Returns the check box state of a cell.

Syntax: **Function** *object*\_**GetChecked** ( *Field* **As Long**, *Record* **As Long** ) **As Integer**

*Field*, *Record*
: The cell, numbered as for [**GetData**](IVBFlexDataSource#getdata).

The state of the check box of a cell in a column that has check boxes ([**ColCheckBoxes**](VBFlexGrid/CheckBoxes#colcheckboxes)): a value of [**FlexCheckBoxConstants**](Enumerations/EditingAndComboBoxes#flexcheckboxconstants) from -2 to 7, for example 0 for unchecked and 1 for checked. A value outside that range is shown as unchecked. Called only for a cell that is not in a fixed row, and only when [**GetFlags**](#getflags) includes **FlexDataSourceChecked**. Otherwise the grid keeps the state itself.

### GetFlags
{: .no_toc }

Returns the options that the grid is to use for the object.

Syntax: **Function** *object*\_**GetFlags** ( ) **As Long**

A combination, with **Or**, of the values of [**FlexDataSourceFlags**](Enumerations/EditingAndComboBoxes#flexdatasourceflags), or 0:

| Flag | The grid |
|:-----|:---------|
| **FlexDataSourceUnboundFixedColumns** | Keeps the text of the fixed columns itself. The fields are the columns after them: the grid has the fixed columns plus **GetFieldCount** columns, and *Field* 0 is the first column that is not fixed. |
| **FlexDataSourceNoData** | Does not call **GetData** and **SetData**, and keeps the text of the cells itself. The object only gives the size and the field names. A [**Sort**](VBFlexGrid/SortingAndSearching#sort) is then allowed. |
| **FlexDataSourceNoFieldNames** | Does not call **GetFieldName**, and does not write names into the first fixed row or set the keys of the columns. |
| **FlexDataSourceToolTipText** | Calls **GetToolTipText** and **SetToolTipText**. |
| **FlexDataSourceChecked** | Calls **GetChecked** and **SetChecked**. |

Called when the object is set as **FlexDataSource**, before the first call of [**GetFieldCount**](IVBFlexDataSource#getfieldcount), and by **DataRefresh**.

### GetToolTipText
{: .no_toc }

Returns the tool tip text of a cell.

Syntax: **Function** *object*\_**GetToolTipText** ( *Field* **As Long**, *Record* **As Long** ) **As String**

*Field*, *Record*
: The cell, numbered as for [**GetData**](IVBFlexDataSource#getdata).

The text that [**CellToolTipText**](VBFlexGrid/Text#celltooltiptext) returns for a cell that is not in a fixed row, and that is shown when the mouse rests on the cell and [**ShowInfoTips**](VBFlexGrid/Text#showinfotips) is **True**. Called only when [**GetFlags**](#getflags) includes **FlexDataSourceToolTipText**. Otherwise the grid keeps the tool tips itself.

### SetChecked
{: .no_toc }

Receives a new check box state for a cell.

Syntax: **Sub** *object*\_**SetChecked** ( *Field* **As Long**, *Record* **As Long**, *NewValue* **As Integer** )

*Field*, *Record*
: The cell.

*NewValue*
: The new state, a value of [**FlexCheckBoxConstants**](Enumerations/EditingAndComboBoxes#flexcheckboxconstants).

Called when the user clicks a check box, and when a program sets the state with [**CellChecked**](VBFlexGrid/CheckBoxes#cellchecked) or [**Cell**](VBFlexGrid/Text#cell). The grid does not remember the value: the next call of **GetChecked** decides what is shown. Called only when [**GetFlags**](#getflags) includes **FlexDataSourceChecked**.

### SetToolTipText
{: .no_toc }

Receives a new tool tip text for a cell.

Syntax: **Sub** *object*\_**SetToolTipText** ( *Field* **As Long**, *Record* **As Long**, *NewValue* **As String** )

*Field*, *Record*
: The cell.

*NewValue*
: The new text.

Called when a program sets [**CellToolTipText**](VBFlexGrid/Text#celltooltiptext) for a cell that is not in a fixed row. Called only when [**GetFlags**](#getflags) includes **FlexDataSourceToolTipText**.

## See Also

- [IVBFlexDataSource](IVBFlexDataSource) interface -- the methods for the data itself
- [Data Binding](VBFlexGrid/DataBinding) -- the **FlexDataSource** property
- [FlexDataSourceFlags](Enumerations/EditingAndComboBoxes#flexdatasourceflags) and [FlexCheckBoxConstants](Enumerations/EditingAndComboBoxes#flexcheckboxconstants) enumerations
- [VBFlexGrid](VBFlexGrid/) control
