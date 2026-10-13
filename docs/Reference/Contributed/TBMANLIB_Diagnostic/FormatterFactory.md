---
title: FormatterFactory
parent: TBMANLIB_Diagnostic Package
permalink: /tB/Packages/Contributed/TBMANLIB_Diagnostic/FormatterFactory
has_toc: false
---

# FormatterFactory module
{: .no_toc }

Creates a [formatter](Formatters) from a name, and uses a formatter to turn a list of results into text. A formatter is an object that implements [**IOutputFormatter**](IOutputFormatter). The functions are called with the name of the module, as in `FormatterFactory.CreateFormatter("json")`.

```tb check_build check_run
Dim f As IOutputFormatter
Dim fmtName As Variant
For Each fmtName In Array("text", "json", "html", "xml")
    Set f = FormatterFactory.CreateFormatter(CStr(fmtName))
    Debug.Print fmtName & " -> " & f.FormatterName & " " & f.FileExtension
Next
' Output:
' text -> Text .txt
' json -> JSON .json
' html -> HTML .html
' xml -> Text .txt
```

The text formatter is the one that `text`, `txt` and every name that is not known give, such as `xml` in the sample. The function raises no error for an unknown name, and the report is then a text report: see [TextFormatter](Formatters#textformatter).

* TOC
{:toc}

## Methods

### CreateFormatter
{: .no_toc }

Creates a formatter from the name of a format.

Syntax: **FormatterFactory.CreateFormatter** ( *formatName* ) **As** [**IOutputFormatter**](IOutputFormatter)

*formatName*
: *required* A **String**. The letter case does not matter. `text` and `txt` give a [**TextFormatter**](Formatters#textformatter), `json` a [**JsonFormatter**](Formatters#jsonformatter), and `html` and `htm` an [**HtmlFormatter**](Formatters#htmlformatter).

Returns a new formatter each time. Any other name, including an empty string, gives a **TextFormatter** without an error.

### CreateFormatterFromArg
{: .no_toc }

Creates a formatter from a command-line argument.

Syntax: **FormatterFactory.CreateFormatterFromArg** ( *arg* ) **As** [**IOutputFormatter**](IOutputFormatter)

*arg*
: *required* A **String** such as `/json` or `-html`. The function converts it to lower case, removes one leading slash or hyphen, and passes the rest to [**CreateFormatter**](#createformatter).

The arguments `json` and `/JSON` give a **JsonFormatter**. The argument `--json` has two hyphens and only one is removed, so the function returns a **TextFormatter** for it.

```tb check_build check_run
Debug.Print FormatterFactory.CreateFormatterFromArg("/JSON").FormatterName
Debug.Print FormatterFactory.CreateFormatterFromArg("-html").FormatterName
Debug.Print FormatterFactory.CreateFormatterFromArg("--json").FormatterName
' Output:
' JSON
' HTML
' Text
```

### FormatResults
{: .no_toc }

Formats a list of results with a formatter.

Syntax: **FormatterFactory.FormatResults** ( *results*, *formatter* ) **As String**

*results*
: *required* A `List(Of DiagnosticResult(Of KeyValuePair(Of String, String)))`, such as the list that [**RunAll**](DiagnosticEngine#runall) returns.

*formatter*
: *required* An object that implements [**IOutputFormatter**](IOutputFormatter).

Returns the text that the formatter makes. The function calls the formatter in this order:

1. **BeginFormat**.
2. For each result, in list order: **FormatCategory** with the [**Category**](DiagnosticResult#category) of the result; then **FormatItem** with the key and the value of each item, or, when [**Success**](DiagnosticResult#success) is **False**, one **FormatItem** with the key `Error` and the [**ErrorMessage**](DiagnosticResult#errormessage); then **EndCategory**.
3. **EndFormat**, whose return value is the return value of the function.

The items of a failed result are not passed to the formatter. The function writes nothing to a file or a screen, and the same formatter can be used again, because its **BeginFormat** starts a new report. *results* or *formatter* set to **Nothing** raises error 91.

```tb check_build check_run
Dim results As New List(Of DiagnosticResult(Of KeyValuePair(Of String, String)))
Dim r As DiagnosticResult(Of KeyValuePair(Of String, String))

Set r = New DiagnosticResult(Of KeyValuePair(Of String, String))("Memory")
r.AddItem New KeyValuePair(Of String, String)("Answer", "42")
r.SetError "Failed to get memory status"
results.Add r

Dim html As String
html = FormatterFactory.FormatResults(results, New HtmlFormatter)
Debug.Print InStr(html, "<td class=""key"">Error</td>") > 0
Debug.Print InStr(html, "<td class=""value"">Failed to get memory status</td>") > 0
Debug.Print InStr(html, "Answer") > 0
' Output:
' True
' True
' False
```

### GetSupportedFormats
{: .no_toc }

Returns the names of the formats.

Syntax: **FormatterFactory.GetSupportedFormats** **As String**

Returns the fixed text `text, json, html`. The short names `txt` and `htm` that [**CreateFormatter**](#createformatter) accepts are not in it.

## Delegates

### FormatterFactoryDelegate
{: .no_toc }

A delegate type for a function that creates a formatter.

Syntax: **Delegate Function** **FormatterFactoryDelegate** ( ) **As** [**IOutputFormatter**](IOutputFormatter)

The type is declared in the package's module **DelegatesModule**, with the delegates of the [engine](DiagnosticEngine#delegates). Nothing in the package uses it. A program can use it as the type of a variable that holds a function which creates a formatter.

## See Also

- [IOutputFormatter](IOutputFormatter) interface -- the contract of a formatter
- [Formatters](Formatters) -- the text, JSON and HTML formatters
- [DiagnosticEngine](DiagnosticEngine) class -- makes the list of results
- [FileHelper](FileHelper) module -- writes the text to a file
