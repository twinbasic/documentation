---
title: Data Binding
parent: VBFlexGrid
grand_parent: VBFLXGRD18 Package
permalink: /tB/Packages/Contributed/VBFLXGRD18/VBFlexGrid/DataBinding
---

# Data Binding
{: .no_toc }

Filling the grid from a recordset, binding it to a data source, and feeding it from an object of your own through the **IVBFlexDataSource** interface.

* TOC
{:toc}

## Three ways to get data in

| Way | The grid | Use it for |
|:----|:---------|:-----------|
| [**CopyFromRecordset**](#copyfromrecordset) | Copies the records of an ADO or DAO recordset into a range of cells once, and keeps no link to the recordset. | Filling a part of the grid from a query. |
| [**DataSource**](#datasource) | Takes the records and the field names of an ADO recordset, or another data source, sizes itself to them, and copies them once. | Showing a table, as a bound grid of Visual Basic 6 does. |
| [**FlexDataSource**](#flexdatasource) | Keeps no data of its own in the cells, and asks the object that you give it for the text of a cell whenever it needs it. | A large table, data that already is in memory in another form, data that is changed elsewhere. |

A change that the user makes in the grid is not written back to a recordset by **CopyFromRecordset** or **DataSource**. With a **FlexDataSource** the object receives each new text and can store it where it likes.

## Copying from a recordset

**CopyFromRecordset** takes the records from the current record of a recordset to the end, or as many as it is told to, and writes them into the grid from the cell that it is told to start in. It does not change the number of rows and columns of the grid and does not write the field names: a record or a field that does not fit is left out. It returns the number of records copied and leaves the current record of the recordset after the last of them. Null values become empty cells.

The recordset must say how many records it holds: one with a cursor that cannot tell (**RecordCount** is -1) has nothing copied.

```tb check_build check_run slot=sub arch=win32,win64
Dim Records As Object, Copied As Long, Row As Long, Line As String

Set Records = CreateObject("ADODB.Recordset")
Records.CursorLocation = 3                          ' adUseClient: a recordset that needs no database
Records.Fields.Append "Name", 200, 20               ' adVarChar
Records.Fields.Append "Qty", 3                      ' adInteger
Records.Open
Records.AddNew: Records.Fields("Name").Value = "bolt": Records.Fields("Qty").Value = 10: Records.Update
Records.AddNew: Records.Fields("Name").Value = "nut": Records.Fields("Qty").Value = 20: Records.Update
Records.AddNew: Records.Fields("Name").Value = "gear": Records.Update   ' Qty stays Null
Records.MoveFirst

With VBFlexGrid1
    .FixedRows = 1: .FixedCols = 0
    .Rows = 4: .Cols = 2
    .TextMatrix(0, 0) = "Name": .TextMatrix(0, 1) = "Qty"

    Copied = .CopyFromRecordset(Records)
    Debug.Print Copied
    For Row = 0 To 3
        Line = Line & .TextMatrix(Row, 0) & "/" & .TextMatrix(Row, 1) & " "
    Next
    Debug.Print Line
End With
' Output:
' 3
' Name/Qty bolt/10 nut/20 gear/ 
```

Arguments choose the number of records and fields, and where they go. A second call continues with the records that follow, because the first moved the current record.

```tb check_build check_run slot=sub arch=win32,win64
Dim Records As Object, Row As Long, Line As String

Set Records = CreateObject("ADODB.Recordset")
Records.CursorLocation = 3
Records.Fields.Append "Name", 200, 20
Records.Fields.Append "Qty", 3
Records.Open
Records.AddNew: Records.Fields("Name").Value = "bolt": Records.Fields("Qty").Value = 10: Records.Update
Records.AddNew: Records.Fields("Name").Value = "nut": Records.Fields("Qty").Value = 20: Records.Update
Records.AddNew: Records.Fields("Name").Value = "gear": Records.Fields("Qty").Value = 5: Records.Update
Records.MoveFirst

With VBFlexGrid1
    .FixedRows = 0: .FixedCols = 0
    .Rows = 3: .Cols = 3

    ' one record, only the Qty field, into row 0, column 2
    Debug.Print .CopyFromRecordset(Records, 1, , 0, 2, "Qty")
    ' the other two records, both fields, from row 1, column 0
    Debug.Print .CopyFromRecordset(Records, , , 1, 0)
    For Row = 0 To 2
        Line = Line & .TextMatrix(Row, 0) & "/" & .TextMatrix(Row, 1) & "/" & .TextMatrix(Row, 2) & " "
    Next
    Debug.Print Line
End With
' Output:
' 1
' 2
' //10 nut/20/ gear/5/ 
```

## Binding to a data source

When **DataSource** is set to an ADO recordset, the grid reads it at once, and only then:

- The grid is cleared. Its number of rows becomes [**FixedRows**](Structure#fixedrows) plus the number of records, and its number of columns [**FixedCols**](Structure#fixedcols) plus the number of fields.
- When the grid has a fixed row, the field names are written into its first row, starting at the first column that is not fixed, and are also set as the keys of the columns ([**ColKey**](Structure#colkey)). The columns also get the type, the precision and scale and the size of their fields ([**ColDataType**](Text#coldatatype), [**ColNumericPrecision**](Text#colnumericprecision), [**ColNumericScale**](Text#colnumericscale), [**ColDataCapacity**](Structure#coldatacapacity)) and whether a field can be Null ([**ColNullable**](Text#colnullable)).
- The records are written into the rows that are not fixed, from the first column that is not fixed. A Null value is an empty cell.
- A [**FlexDataSource**](#flexdatasource) that is set is removed.

A recordset that does not say how many records it holds (**RecordCount** is -1) is not read, and the grid does not change.

The grid does not follow later changes to the recordset. [**DataRefresh**](#datarefresh) reads it again, which clears the grid again.

```tb check_build check_run slot=sub arch=win32,win64
Dim Records As Object

Set Records = CreateObject("ADODB.Recordset")
Records.CursorLocation = 3
Records.Fields.Append "Name", 200, 20
Records.Fields.Append "Qty", 3
Records.Open
Records.AddNew: Records.Fields("Name").Value = "bolt": Records.Fields("Qty").Value = 10: Records.Update
Records.AddNew: Records.Fields("Name").Value = "nut": Records.Fields("Qty").Value = 20: Records.Update

With VBFlexGrid1
    .FixedRows = 1: .FixedCols = 0
    Set .DataSource = Records
    Debug.Print .Rows & "x" & .Cols & " " & .TextMatrix(0, 1) & " " & .TextMatrix(2, 0) & " " & .ColKey(1) & " " & .ColDataType(1)

    .TextMatrix(2, 1) = "99"                    ' the recordset is not changed
    Records.MoveLast
    Debug.Print Records.Fields("Qty").Value

    Records.AddNew: Records.Fields("Name").Value = "gear": Records.Fields("Qty").Value = 5: Records.Update
    Debug.Print .Rows                           ' still 3: the grid does not follow the recordset
    .DataRefresh
    Debug.Print .Rows & " " & .TextMatrix(3, 0)
End With
' Output:
' 3x2 Qty nut Qty 3
' 20
' 3
' 4 gear
```

## Feeding the grid from an object

An object that implements [**IVBFlexDataSource**](../IVBFlexDataSource) and is set as **FlexDataSource** takes the place of the cells that are not fixed: the grid does not store their text, but asks the object for it when it draws a cell, when [**TextMatrix**](Text#textmatrix) or [**Clip**](ClipboardAndArrays#clip) reads it, and in every other place that reads text. A text that is written to a cell goes to the object. An object that also implements [**IVBFlexDataSource2**](../IVBFlexDataSource2) can supply tool tip text and check boxes, and can switch some of these behaviors off.

The grid sizes itself to the object when it is set: the columns are the fields, the rows the records plus the fixed rows, and the field names go into the first fixed row and become the keys of the columns. The object tells the grid about a change of its size when **FlexDataSource** is set again, or **DataRefresh** is called.

```tb check_build slot=file projname=bind-flex
Class ArrayFlexSource
    Implements IVBFlexDataSource

    Private Names() As String
    Private Cells() As String

    Public Sub Fill()
        ReDim Names(0 To 1)
        ReDim Cells(0 To 1, 0 To 2)                 ' (field, record)
        Names(0) = "Name": Names(1) = "Qty"
        Cells(0, 0) = "bolt": Cells(1, 0) = "10"
        Cells(0, 1) = "nut": Cells(1, 1) = "20"
        Cells(0, 2) = "gear": Cells(1, 2) = "5"
    End Sub

    Public Function Qty(ByVal Record As Long) As String
        Return Cells(1, Record)
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

```tb check_build check_run slot=sub projname=bind-flex
Dim Source As New ArrayFlexSource
Dim Row As Long, Line As String
Source.Fill

With VBFlexGrid1
    .FixedRows = 1: .FixedCols = 0
    Set .FlexDataSource = Source
    Debug.Print .Rows & "x" & .Cols & " " & .ColKey(1)
    For Row = 0 To .Rows - 1
        Line = Line & .TextMatrix(Row, 0) & "/" & .TextMatrix(Row, 1) & " "
    Next
    Debug.Print Line

    .TextMatrix(2, 1) = "99"                       ' goes to SetData
    Debug.Print Source.Qty(1)

    On Error Resume Next
    .Row = 1: .RowSel = 3: .Col = 0: .ColSel = 0
    .Sort = FlexSortStringAscending                ' the data is not in the grid
    Debug.Print Err.Number
End With
' Output:
' 4x2 Qty
' Name/Qty bolt/10 nut/20 gear/5 
' 99
' 5
```

While a **FlexDataSource** is set, [**Sort**](SortingAndSearching#sort) raises error 5 and [**Clear**](Structure#clear) raises error 5 for **FlexClearEverything**, unless the flags of the object say **FlexDataSourceNoData**. [**FindItem**](SortingAndSearching#finditem), [**SaveArray**](ClipboardAndArrays#savearray), [**AutoSize**](Sizing#autosize) and merged cells use the text of the object.

## Properties

### DataMember
{: .no_toc }

The member of the data source that the grid shows.

Syntax: *object*.**DataMember** [ = *value* ]

A **String**. A data source that offers more than one set of records, such as a data environment, is asked for the one with this name. It is empty by default, for a data source with one set, as an ADO recordset is. Setting it binds the grid to [**DataSource**](#datasource) again, so that the grid is cleared and filled again. It has no effect while there is no data source.

### DataSource
{: .no_toc }

The data source that the grid is bound to.

Syntax: *object*.**DataSource** [ = *value* ]

Syntax: **Set** *object*.**DataSource** = *value*

An object of the **DataSource** type of the Microsoft data binding library (**MSDATASRC**), which an ADO recordset is. It can be set with **Set** or with a plain assignment. Setting it reads the recordset: see [Binding to a data source](#binding-to-a-data-source). Setting it to **Nothing** only releases the data source: the grid keeps the cells that it holds. The property is **Nothing** by default.

### FlexDataSource
{: .no_toc }

The object that feeds the grid with its data.

Syntax: *object*.**FlexDataSource** [ = *value* ]

Syntax: **Set** *object*.**FlexDataSource** = *value*

An object whose class implements [**IVBFlexDataSource**](../IVBFlexDataSource), or **Nothing** (the default). Setting it:

1. Asks the object for its flags ([**GetFlags**](../IVBFlexDataSource2#getflags)), if the class also implements [**IVBFlexDataSource2**](../IVBFlexDataSource2). The flags are read at this time only, and again by [**DataRefresh**](#datarefresh).
2. Asks for the number of fields. When it is 0 the grid does not change in size and the rest of the steps are left out.
3. Sets the number of columns to the number of fields. With **FlexDataSourceUnboundFixedColumns**, the number of columns is the number of fixed columns plus the number of fields, and the fields start after the fixed columns.
4. When the grid has a fixed row, and the flags do not include **FlexDataSourceNoFieldNames**, writes the name of each field into the first row and sets it as the key of its column.
5. Sets the number of rows to the number of fixed rows plus the number of records. With no records there is one row, for which the grid still asks for the data of the record 0.

Setting the property to **Nothing** removes the object. The grid keeps its size, and the cells that are not fixed show the text that the grid itself holds, which is empty.

See [Feeding the grid from an object](#feeding-the-grid-from-an-object).

## Methods

### CopyFromRecordset
{: .no_toc }

Copies the records of an ADO or DAO recordset into the grid.

Syntax: *object*.**CopyFromRecordset** ( *Data* [, *Rows* [, *Cols* [, *Row* [, *Col* [, *Fields* ]]]]] ) **As Long**

*Data*
: *required* An **Object**, the recordset. Its current record is the first that is copied.

*Rows*
: *optional* A **Long**, the greatest number of records to copy. Default: -1, as many as fit in the grid from *Row*, and so all that remain, when they fit.

*Cols*
: *optional* A **Long**, the greatest number of columns to write. Default: -1, as many as fit from *Col*.

*Row*
: *optional* A **Long**, the first row to write into. Default: -1, the first row that is not fixed.

*Col*
: *optional* A **Long**, the first column to write into. Default: -1, the first column that is not fixed.

*Fields*
: *optional* A **Variant**, which fields are copied and in what order: a field name, a field number, or an array of them, as the *Fields* argument of the **GetRows** method of an ADO recordset. Default: all fields, in their order.

Returns the number of records written. Raises error 5 when *Data* is **Nothing**, error 430 when it is not a recordset, error 380 for an argument below -1, error 381 for a *Row* or *Col* outside the grid or a field that the recordset does not have, and returns 0 without a change for a recordset with no records, or one that does not report its record count.

### DataRefresh
{: .no_toc }

Reads the data source or the object of **FlexDataSource** again.

Syntax: *object*.**DataRefresh**

Sets [**DataSource**](#datasource) again with the data source that it has, if any, and then [**FlexDataSource**](#flexdatasource) again with its object. It is the way to show the new records of a recordset, and to make the grid read a changed number of records, fields or flags from an object.

## See Also

- [IVBFlexDataSource](../IVBFlexDataSource) and [IVBFlexDataSource2](../IVBFlexDataSource2) interfaces -- what an object that feeds the grid implements
- [Clipboard, Undo and Arrays](ClipboardAndArrays) -- **LoadArray** and **SaveArray**, for data in arrays
- [Rows and Columns](Structure) -- **Rows**, **Cols**, **FixedRows**, **ColKey** and **Clear**
- [Cell Text](Text) -- **ColDataType**, **ColNullable** and the other properties of a column that a bound grid sets
- [Sorting and Searching](SortingAndSearching) -- **Sort**, which a grid with a **FlexDataSource** refuses
