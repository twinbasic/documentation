---
title: IOutputFormatter
parent: TBMANLIB_Diagnostic Package
permalink: /tB/Packages/Contributed/TBMANLIB_Diagnostic/IOutputFormatter
has_toc: false
---

# IOutputFormatter interface
{: .no_toc }

The contract of a formatter: an object that turns a list of results into one string, group by group and item by item. [**FormatterFactory.FormatResults**](FormatterFactory#formatresults) calls a formatter in the order the interface suggests. The package has three formatters, for [text, JSON and HTML](Formatters), and a class of a program can implement the interface for another format.

A formatter only converts. It does not write to a file or a screen, and it does not read the results itself: it is given the category names, the keys and the values as text, and returns the text of the whole report from its last method.

```tb check_build slot=file projname=diag-formatter
Class CsvFormatter
    Implements IOutputFormatter

    Private m_Text As String
    Private m_Category As String

    Private Sub IOutputFormatter_BeginFormat()
        m_Text = "category,key,value" & vbLf
    End Sub

    Private Sub IOutputFormatter_FormatCategory(ByVal categoryName As String)
        m_Category = categoryName
    End Sub

    Private Sub IOutputFormatter_FormatItem(ByVal key As String, ByVal value As String)
        m_Text = m_Text & m_Category & "," & key & "," & value & vbLf
    End Sub

    Private Sub IOutputFormatter_EndCategory()
        m_Category = ""
    End Sub

    Private Function IOutputFormatter_EndFormat() As String
        Return m_Text
    End Function

    Private Property Get IOutputFormatter_FileExtension() As String
        Return ".csv"
    End Property

    Private Property Get IOutputFormatter_FormatterName() As String
        Return "CSV"
    End Property
End Class
```

```tb check_build check_run projname=diag-formatter
Dim results As New List(Of DiagnosticResult(Of KeyValuePair(Of String, String)))
Dim r As DiagnosticResult(Of KeyValuePair(Of String, String))

Set r = New DiagnosticResult(Of KeyValuePair(Of String, String))("Memory")
r.AddItem New KeyValuePair(Of String, String)("Memory Load", "54%")
r.AddItem New KeyValuePair(Of String, String)("Used Physical", "8 GB")
results.Add r

Set r = New DiagnosticResult(Of KeyValuePair(Of String, String))("Uptime")
r.AddItem New KeyValuePair(Of String, String)("Total Days", "3")
results.Add r

Dim lines() As String
Dim i As Long
lines = Split(FormatterFactory.FormatResults(results, New CsvFormatter), vbLf)
For i = 0 To UBound(lines) - 1
    Debug.Print lines(i)
Next i
' Output:
' category,key,value
' Memory,Memory Load,54%
' Memory,Used Physical,8 GB
' Uptime,Total Days,3
```

* TOC
{:toc}

## Order of the calls

**BeginFormat** is called once, first. Then each group of items is one call of **FormatCategory**, one call of **FormatItem** for each item, and one call of **EndCategory**. **EndFormat** comes last and returns the text. The three formatters of the package also accept a call of **FormatCategory** or **EndFormat** while a group is still open, and close the group first, so a program that calls them directly may leave out **EndCategory**. A formatter should start a new report in **BeginFormat**, because one object is used for many reports.

## Properties

### FileExtension
{: .no_toc }

The file extension for a report in this format.

Syntax: *formatter*.**FileExtension** **As String**

Read-only. It includes the period: `.txt`, `.json` and `.html` for the formatters of the package. A program uses it to name the file it writes.

### FormatterName
{: .no_toc }

The name of the format.

Syntax: *formatter*.**FormatterName** **As String**

Read-only. `Text`, `JSON` and `HTML` for the formatters of the package. Nothing in the package reads it.

## Methods

### BeginFormat
{: .no_toc }

Starts a report.

Syntax: *formatter*.**BeginFormat**

The formatters of the package discard what an earlier report left in them, and write the start of the document.

### EndCategory
{: .no_toc }

Ends the group that **FormatCategory** started.

Syntax: *formatter*.**EndCategory**

The formatters of the package do nothing when no group is open.

### EndFormat
{: .no_toc }

Ends the report and returns it.

Syntax: *formatter*.**EndFormat** **As String**

Returns the whole text of the report, ending any group that is open. The line breaks in the text of the package's formatters are **vbCrLf**.

### FormatCategory
{: .no_toc }

Starts a group of items.

Syntax: *formatter*.**FormatCategory** ( *categoryName* )

*categoryName*
: *required* A **String**, the title of the group. [**FormatResults**](FormatterFactory#formatresults) passes the **Category** of a result.

### FormatItem
{: .no_toc }

Adds one item to the group that is open.

Syntax: *formatter*.**FormatItem** ( *key*, *value* )

*key*
: *required* A **String**, the label of the line.

*value*
: *required* A **String**, the text of the line.

## See Also

- [Formatters](Formatters) -- the three formatters of the package
- [FormatterFactory](FormatterFactory) module -- creates a formatter and runs it over a list of results
- [DiagnosticResult](DiagnosticResult) class -- the source of the categories, keys and values
