---
title: IVBFlexDataSource
parent: VBFLXGRD18 Package
permalink: /tB/Packages/Contributed/VBFLXGRD18/IVBFlexDataSource
---

# IVBFlexDataSource interface
{: .no_toc }

The interface that a class implements to feed a [**VBFlexGrid**](VBFlexGrid/) with data: the number of fields and records, the field names, and the text of each cell. The object is set as the [**FlexDataSource**](VBFlexGrid/DataBinding#flexdatasource) of the grid.

A grid with a **FlexDataSource** keeps no text for the cells that are not fixed. It calls the methods of the interface when it needs a cell's text, so a table of any size can be shown from the data as the program already holds it. The grid numbers fields and records from 0: a *Field* is a column, and a *Record* is a row after the fixed rows. The data of an object that also implements [**IVBFlexDataSource2**](IVBFlexDataSource2) can include tool tips and check boxes.

```tb check_build slot=file projname=ifds-array
Class StockSource
    Implements IVBFlexDataSource

    Private Names() As String
    Private Cells() As String

    Public Sub Fill()
        ReDim Names(0 To 1)
        ReDim Cells(0 To 1, 0 To 2)                   ' (field, record)
        Names(0) = "Item": Names(1) = "Qty"
        Cells(0, 0) = "bolt": Cells(1, 0) = "10"
        Cells(0, 1) = "nut": Cells(1, 1) = "20"
        Cells(0, 2) = "gear": Cells(1, 2) = "5"
    End Sub

    Public Function Text(ByVal Field As Long, ByVal Record As Long) As String
        Return Cells(Field, Record)
    End Function

    Private Function IVBFlexDataSource_GetFieldCount() As Long
        Return UBound(Names) + 1
    End Function

    Private Function IVBFlexDataSource_GetRecordCount() As Long
        Return UBound(Cells, 2) + 1
    End Function

    Private Function IVBFlexDataSource_GetFieldName(ByVal Field As Long) As String
        Return Names(Field)
    End Function

    Private Function IVBFlexDataSource_GetData(ByVal Field As Long, ByVal Record As Long) As String
        Return Cells(Field, Record)
    End Function

    Private Sub IVBFlexDataSource_SetData(ByVal Field As Long, ByVal Record As Long, ByVal NewData As String)
        Cells(Field, Record) = NewData
    End Sub
End Class
```

```tb check_build check_run slot=sub projname=ifds-array
Dim Stock As New StockSource
Stock.Fill

With VBFlexGrid1
    .FixedRows = 1: .FixedCols = 0
    Set .FlexDataSource = Stock

    Debug.Print .Rows & " rows, " & .Cols & " columns"
    Debug.Print .TextMatrix(0, 0) & " " & .TextMatrix(0, 1)       ' the field names, in the fixed row
    Debug.Print .TextMatrix(3, 0) & " " & .TextMatrix(3, 1)       ' record 2

    .TextMatrix(3, 1) = "7"                                       ' reaches SetData
    Debug.Print Stock.Text(1, 2)
End With
' Output:
' 4 rows, 2 columns
' Item Qty
' gear 5
' 7
```

The grid asks for the text each time it needs it and does not remember it, so a change in the object is seen at the next read of the cell and shown when the grid is next drawn ([**Refresh**](VBFlexGrid/#refresh) draws it at once). A change in the number of fields or records is read when [**FlexDataSource**](VBFlexGrid/DataBinding#flexdatasource) is set again or [**DataRefresh**](VBFlexGrid/DataBinding#datarefresh) is called.

A method of the interface is called while the grid is drawing or reading, so it should return quickly.

Binding to an object is described on [Data Binding](VBFlexGrid/DataBinding#feeding-the-grid-from-an-object).

## Methods

### GetData
{: .no_toc }

Returns the text of a cell.

Syntax: **Function** *object*\_**GetData** ( *Field* **As Long**, *Record* **As Long** ) **As String**

*Field*
: The column of the cell, from 0. With the flag **FlexDataSourceUnboundFixedColumns** the fixed columns are not numbered, and field 0 is the first column that is not fixed.

*Record*
: The row of the cell less the number of fixed rows, from 0.

Called whenever the grid needs the text of a cell that is not in a fixed row: to draw it, and to read it with [**TextMatrix**](VBFlexGrid/Text#textmatrix), [**Clip**](VBFlexGrid/ClipboardAndArrays#clip), [**SaveArray**](VBFlexGrid/ClipboardAndArrays#savearray), [**FindItem**](VBFlexGrid/SortingAndSearching#finditem) and the like. The cells of the fixed rows hold their text in the grid. It is not called when the object sets **FlexDataSourceNoData** in [**GetFlags**](IVBFlexDataSource2#getflags).

When [**GetRecordCount**](#getrecordcount) returns 0 the grid has one row without records, and still asks for the cells of record 0. The method should return an empty string then.

### GetFieldCount
{: .no_toc }

Returns the number of fields.

Syntax: **Function** *object*\_**GetFieldCount** ( ) **As Long**

The number of columns that the grid takes from the object. Called when the object is set as [**FlexDataSource**](VBFlexGrid/DataBinding#flexdatasource) and by [**DataRefresh**](VBFlexGrid/DataBinding#datarefresh). A value of 0 or less leaves the number of rows and columns of the grid as it is and the other methods of the setting are not called.

### GetFieldName
{: .no_toc }

Returns the name of a field.

Syntax: **Function** *object*\_**GetFieldName** ( *Field* **As Long** ) **As String**

*Field*
: The field, from 0 to [**GetFieldCount**](#getfieldcount) less 1.

Called for each field when the object is set and by **DataRefresh**, when the grid has a fixed row. The name becomes the text of the cell of the first fixed row above the field and the key of the column ([**ColKey**](VBFlexGrid/Structure#colkey)). It is not called when the object sets **FlexDataSourceNoFieldNames** in **GetFlags**.

### GetRecordCount
{: .no_toc }

Returns the number of records.

Syntax: **Function** *object*\_**GetRecordCount** ( ) **As Long**

The number of rows after the fixed rows. Called together with [**GetFieldCount**](#getfieldcount). With 0 records, the grid has one row.

### SetData
{: .no_toc }

Receives a new text for a cell.

Syntax: **Sub** *object*\_**SetData** ( *Field* **As Long**, *Record* **As Long**, *NewData* **As String** )

*Field*, *Record*
: The cell, as for [**GetData**](#getdata).

*NewData*
: The text.

Called when text is written to a cell that is not in a fixed row: by the user, when an edit is accepted, and by **TextMatrix**, **Clip**, **LoadArray** and the other members that write text. The grid does not keep the text, so the object must store it for **GetData** to return it. It is not called when the object sets **FlexDataSourceNoData**.

## See Also

- [IVBFlexDataSource2](IVBFlexDataSource2) interface -- adds flags, tool tips and check boxes
- [Data Binding](VBFlexGrid/DataBinding) -- the **FlexDataSource** property, **DataSource** and **CopyFromRecordset**
- [VBFlexGrid](VBFlexGrid/) control
