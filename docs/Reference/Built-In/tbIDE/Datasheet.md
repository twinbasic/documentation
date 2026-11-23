---
title: Datasheet
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/Datasheet
has_toc: false
index:
  - datasheet
  - grid in an addin
  - hypergrid
---

# Datasheet
{: .no_toc }

A grid of rows and columns that an addin can show in a [designer](Designers) or a [tool window](ToolWindow). The grid holds no data of its own: it asks the addin for the names and types of the columns and the number of rows, and then for each block of rows as it comes into view. So it shows a table of any length, and the addin reads only what is seen. It is read-only: the user scrolls, selects rows and resizes columns, and changes no value. The [Data Explorer](../../IDE/AddIns/DataExplorer) that ships with the IDE, Sample 27, is built on it.

The datasheet is an element of the tool window's DOM, made with the tag `"datasheet"`. It has no class in the package: the addin reaches it through the [dynamic properties](.#dynamic-dom-property-resolution) of its parent element, as it reaches the other [custom-widget tags](.#tool-window-dom-tags).

```tb check_build
Private Grid As HtmlElement

Private Sub ShowGrid(ByVal Root As HtmlElement)
    Set Grid = Root.ChildDomElements.Add("people", "datasheet")
    Grid.Properties.style.height = "100%"
    With Root
        .AddEventListener("onGetInfo", AddressOf OnGetInfo)
        .AddEventListener("onGetRows", AddressOf OnGetRows)
        .Properties.Ready()
    End With
    Root.Properties.controller.loadData()
End Sub

Private Sub OnGetInfo(ByVal e As HtmlEventProperties)
    e.AsyncResultResolver.Resolve "{""recordCount"": 1000, ""columns"": [" & _
        "{""name"": ""ID"", ""type"": ""integer""}," & _
        "{""name"": ""Name"", ""type"": ""string""}," & _
        "{""name"": ""Active"", ""type"": ""boolean""}]}"
End Sub

Private Sub OnGetRows(ByVal e As HtmlEventProperties)
    Dim i As Long, rows As String
    For i = e.start To e.end - 1
        If Len(rows) Then rows = rows & ","
        rows = rows & "[" & i + 1 & ",""Person " & i + 1 & """," & IIf(i Mod 2 = 0, "true", "false") & "]"
    Next
    e.AsyncResultResolver.Resolve "[" & rows & "]"
End Sub
```

* TOC
{:toc}

## Making a datasheet

Three steps make a datasheet, all of them on its **parent** element, not on the datasheet's own:

1. Add the element with [**HtmlElements.Add**](HtmlElements#add), with the tag `"datasheet"`, and give it a height in CSS: it fills the element, and the element has no height of its own.
2. Register the handlers of its [events](#events) on the parent with [**AddEventListener**](HtmlElement#addeventlistener). [**onGetInfo**](#ongetinfo) and [**onGetRows**](#ongetrows) are needed.
3. Call `Ready()` on the parent's properties. It makes the datasheet's [controller](#the-controller), as the parent's `controller` property, and asks for no data yet.

Then set what the controller is to show, such as `setZoom` or `setColumnWidths`, and call `controller.loadData()`. The datasheet then asks for the columns through **onGetInfo**, and for the rows on screen through **onGetRows**. Until the columns have come, it shows nothing.

A parent holds one datasheet. Its colours are the theme's [colours for addins](Themes#colours-for-addins), as its parent has them, and in a designer's tab they follow a change of the IDE's theme. Its text is Tahoma, 12 pixels high at 100 percent.

<!-- test: bug toolwindow-addin-colours-stale, lane addin:datasheet -->
> [!NOTE] BETA 1045
> A datasheet in a [tool window](ToolWindow) keeps the colours of the theme the window was made in, because the window keeps that theme's colours for addins. After a change from Dark to Light it is still drawn in Dark's colours. A tool window made after the change, with an id no window has had, has the new theme's colours.

## Events

The datasheet raises each event on its parent element, to the handler registered for its name. The handler gets an [**HtmlEventProperties**](HtmlEventProperties) and answers with [**AsyncResultResolver.Resolve**](HtmlEventProperties#asyncresultresolver), giving it a **String** of JSON. It can answer at once, or keep the resolver in a variable and answer later: from another thread, as Sample 27 does, or from an [**AddinTimer**](AddinTimer). A handler of **onGetInfo** or **onGetRows** that returns without calling **Resolve** and without keeping the resolver gives no answer, and the request fails at once.

The datasheet waits 60 seconds for each answer, or as long as [**setTimeout**](#the-controller) says. An answer that comes after that is ignored.

### onGetInfo
{: .no_toc }

Asks for the columns and the number of rows. Raised by `loadData()` and by every `refresh()`. It carries nothing.

The answer is an object:

```json
{
  "recordCount": 1000,
  "columns": [
    { "name": "ID", "type": "integer" },
    { "name": "Name", "header": "Full name", "type": "string" },
    { "name": "Active", "type": "boolean" }
  ]
}
```

*recordCount*
: The number of rows, 0 or more.

*columns*
: One object for each column, in the order the columns are shown:

  *name* --- the column's name, by which the datasheet saves its width. Two columns may not have one name, and a name may not start with `__`. Left out, it is `Column1`, `Column2`, and so on.

  *header* --- the text of the column's header. Left out, it is the *name*.

  *type* --- how the values are drawn. `boolean`, `bool` and `bit` draw a tick box; `int`, `integer`, `smallint`, `bigint`, `tinyint`, `number`, `numeric`, `decimal`, `float`, `double`, `real`, `currency` and `money` are aligned right; any other type, `string` among them, is aligned left. Left out, it is `string`. The datasheet does not format a value: a number or a date is drawn as the text the addin gives.

An answer that is not of this shape fails the load: the datasheet stays hidden, and `getState()` says `"error"`. See [When an answer fails](#when-an-answer-fails).

### onGetRows
{: .no_toc }

Asks for a block of rows. *start* is the first row's number, counted from 0, and *end* the number of the row after the last: `e.start` = 0 and `e.end` = 128 ask for the rows 0 to 127. The datasheet asks for 128 rows at a time, for the blocks on screen and one block either side, and keeps the last 64 blocks it was given. It asks for none when *recordCount* is 0.

The answer is a list with one list for each row, from *start* up to *end*, and in each the values of the columns in their order:

```json
[
  [1, "Ann", true],
  [2, "Bill", null]
]
```

A value is a JSON number, string, `true`, `false` or `null`, drawn as its text, with no formatting: `1234567.891` is drawn so. An object is drawn as `[object Object]`. A `null` is drawn as nothing, or as *null* in italics when `showNulls(True)` was called. In a tick-box column, only `true` is ticked, any other value is an empty box, and `null` is a dash, whatever `showNulls` says.

<!-- test: bug datasheet-zero-drawn-blank, lane addin:datasheet -->
> [!WARNING] BETA 1045
> A `0` is drawn as nothing, as a `null` is, in a column of any type but a tick box. A table of numbers shows its zeros as blank cells. With `showNulls(True)` a null reads *null*, so the two can be told apart.

A row not yet given is drawn as grey bars.

### onRightClickColumnHeader
{: .no_toc }

Raised when the user right-clicks the header of a column. Optional: without a handler, the right-click does nothing. It carries:

*columnIndex*
: The column's number, counted from 0 in the order of *columns*.

*clientX*, *clientY*
: Where the pointer is, in the IDE's window: the place to show a menu of the addin's own, such as one opened with [**Menu.ShowPopup**](Menu#showpopup).

The answer is not used, so the handler need not call **Resolve**.

### onChangedColumnWidths
{: .no_toc }

Raised a quarter of a second after the user stops changing a column's width, and after `autoFitColumnWidths()` and `resetColumnWidths()`. Optional. It carries *widths*, the same text `getColumnWidths()` returns, for the addin to save and give back to `setColumnWidths` the next time. The answer is not used.

## When an answer fails

An answer fails when it is not JSON, when it is not of the shape the event asks for, when it does not come in time, or when a needed handler is missing. The text an addin gives for its own error, such as `"ERROR: no such table"`, fails as not JSON.

- A failed **onGetInfo** stops the load: `getState()` says `"error"` and `getLastError()` says why, such as `onGetInfo() must return {recordCount, columns}` or the message of the JSON parser. The grid stays hidden, and `loadData()` can be called again.
- A failed block of **onGetRows** is asked for again after 0.75, 1.5, 3 and 6 seconds, while it is on screen. After the fifth failure the datasheet asks no more until `refresh()`, and the block stays grey. The failure is not reported: `getState()` stays `"ready"` and `getLastError()` empty. An addin that fails to read rows should say so itself, with `flashMessage`.

## The controller

The controller is the parent's `controller` property, made by `Ready()`. Its methods are called through the parent's properties, or the datasheet element's own, which reach the same controller. A number a method returns comes back to twinBASIC as a **LongLong**:

```tb hidden concat_group=controller
' Context for the sample below: the datasheet's parent element.
Dim Root As HtmlElement
```

```tb check_build concat_group=controller
With Root.Properties.controller
    .setTimeout(30000)
    .setZoom(125)
    .showGridLines(False)
    .loadData()
End With
```

Before `loadData()`, a method that sets how the grid looks keeps the value for when the grid is made.

| Method | What it does |
|---|---|
| `loadData()` | Asks for the columns, and then the rows. Returns `"OK"`; `"LOADING"` while a load is going on, and `"READY"` once it has loaded. |
| `refresh()` | Asks for the columns and the number of rows again, forgets every block, and goes back to the first row. Keeps the widths, and the sort and filter marks. The number of columns must not change: then the datasheet fails with `SCHEMA_CHANGED`, and only a new datasheet shows the new columns. Returns `"OK"`, or `"NOT_READY"` before the first load. |
| `setTimeout(ms)` | How long to wait for each answer, in milliseconds, from 1. |
| `setZoom(percent)` | The size of the grid, from 25 to 400 percent; a number outside is taken as the nearest end. Returns the zoom set. The bar at the bottom shows a zoom other than 100. |
| `showNulls(on)` | Draws a `null` as *null* when **True**. Off at first. |
| `showAlternateRowColors(on)` | Shades every other row. On at first. |
| `showGridLines(on)` | Draws lines between the cells. On at first. |
| `getColumnWidths()` | Returns the widths of the columns as JSON, one object for each column: `[{"ID":110},{"Name":95.5}]`, in pixels at 100 percent. |
| `setColumnWidths(json)` | Sets the widths that JSON gives, by the columns' names, and returns the widths of every column, as `getColumnWidths()` does. A name that is not a column is ignored, a width above 2,400 is taken as 2,400, and a width of 0 or less refuses the whole call, which returns **False**. |
| `autoFitColumnWidths()` | Fits each column to its header and the rows on screen. |
| `resetColumnWidths()` | Sets every column to 110 pixels. |
| `setColumnIsSorted(index, on)`, `setColumnIsFiltered(index, on)` | Shows or hides the sort mark or the filter mark in the header of a column, by its number from 0. A filter mark also shows *(filtered)* in the bar at the bottom. The datasheet itself neither sorts nor filters: the addin does that in the rows it gives, and calls `refresh()`. |
| `getSelectedRows()` | Returns the selected rows as `"first:last"`, both counted from 0 and both included: `"3:5"` for three rows. With no row selected, it returns the current row as `"r:r"`, and `"-1:-1"` when there is none. |
| `selectAllRows()` | Selects every row. |
| `navigateToRecord(n)` | Makes row *n* the current row, counted from 1, and scrolls to it. A fraction is dropped: 12.7 is row 12. A number past either end goes to the first or the last row. |
| `flashMessage(text, ms)` | Shows *text* in the bar at the bottom for *ms* milliseconds, 3,000 by default. An empty text clears it. |
| `getState()` | Returns `"created"`, `"loading"`, `"ready"`, `"refreshing"`, `"error"` or `"disposed"`. |
| `getLastError()` | Returns the reason for the last failure, or an empty string. |
| `isReady()` | **True** once the grid has loaded. |
| `dispose()` | Removes the grid and stops its requests. Every method after it does nothing. |

## What the user does

The bar at the bottom moves to the first, previous, next and last row, or to the row whose number is typed into its box, and says how many rows there are. <kbd>Up</kbd> and <kbd>Down</kbd> move the current row, and so does <kbd>Enter</kbd>, down. <kbd>Page Down</kbd> and <kbd>Page Up</kbd> scroll, and leave the current row where it was. After a click on a cell, <kbd>Right</kbd>, <kbd>Left</kbd> and <kbd>Tab</kbd> move to the next or previous cell, and <kbd>Shift</kbd>+<kbd>Down</kbd> moves the current row down. The mouse wheel scrolls, with <kbd>Ctrl</kbd> held too: it does not zoom.

<!-- test: bug datasheet-keys-throw, lane addin:datasheet -->
> [!NOTE] BETA 1045
> <kbd>Home</kbd> and <kbd>End</kbd>, with or without <kbd>Ctrl</kbd>, move nothing in a datasheet, and each raises an error in the IDE's page. Once <kbd>Up</kbd> or <kbd>Down</kbd> has moved the current row, <kbd>Right</kbd>, <kbd>Left</kbd>, <kbd>Tab</kbd> and <kbd>Shift</kbd>+<kbd>Down</kbd> do the same, until the next click on a cell. Click a cell first, or scroll sideways with the scroll bar.

No cell can be edited: a double-click, or a key typed on a cell, opens no editor.

Clicking the box at the left of a row selects it, dragging over the boxes selects a block of rows, and clicking the corner above them selects all. One block of rows can be selected at a time. Clicking a cell makes its row the current row.

Dragging the border between two headers changes a column's width, and double-clicking it fits the column. A click on a header marks the column, and does not sort it.

## See Also

- [HtmlElements.Add](HtmlElements#add) method -- the `"datasheet"` tag
- [HtmlEventProperties.AsyncResultResolver](HtmlEventProperties#asyncresultresolver) property
- [Data Explorer](../../IDE/AddIns/DataExplorer) -- the addin built on it
