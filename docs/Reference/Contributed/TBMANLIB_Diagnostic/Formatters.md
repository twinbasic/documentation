---
title: TBMANLIB_Diagnostic Formatters
parent: TBMANLIB_Diagnostic Package
permalink: /tB/Packages/Contributed/TBMANLIB_Diagnostic/Formatters
has_toc: false
---

# Formatters
{: .no_toc }

The package has three formatters. Each one turns a list of diagnostic results into one string, in a format for reading (text), for programs (JSON) or for a browser (HTML). The text formatter fails in version 0.0.0.0, so a report is made with the JSON or the HTML formatter. They implement [**IOutputFormatter**](IOutputFormatter), so [**FormatterFactory.FormatResults**](FormatterFactory#formatresults) runs them in the same way, and [**FormatterFactory.CreateFormatter**](FormatterFactory#createformatter) creates one from a name.

| Class | Name | Extension | Output |
|:------|:-----|:----------|:-------|
| [**TextFormatter**](#textformatter) | `Text` | `.txt` | Meant to be a report in lines of 50 characters, with a box round the title and a frame round each group. In version 0.0.0.0 it raises error 5 and makes no report. |
| [**JsonFormatter**](#jsonformatter) | `JSON` | `.json` | One JSON object, with an object for each group, and every value a string. |
| [**HtmlFormatter**](#htmlformatter) | `HTML` | `.html` | A complete HTML document with its style sheet, and a table for each group. |

The formatters have these properties in common:

- They only build a string. They do not write a file or a screen. [**FileHelper**](FileHelper) writes the string to a file.
- The line breaks are **vbCrLf**.
- One object can make any number of reports, because **BeginFormat** discards what the last report left in it.
- Each report names the tool as `Twinbasic Diagnostic Tool v1.0`, or, in JSON, as `"toolVersion": "1.0"`. The text is fixed in the code, and is not the version of the package.
- The classes declare the members of the interface as **Public**, so a variable of the class type reaches them by the long names, such as `IOutputFormatter_FormatItem`.

```tb check_build check_run
Dim f As IOutputFormatter
Set f = New JsonFormatter
f.BeginFormat
f.FormatCategory "CPU Info"
f.FormatItem "Processor Count", "8"
f.FormatItem "Path", "C:\Tools ""x"""
f.EndCategory

Dim lines() As String
Dim i As Long
lines = Split(f.EndFormat(), vbCrLf)
For i = 3 To UBound(lines) - 1
    Debug.Print lines(i)
Next i
' Output:
'     "toolVersion": "1.0",
'     "categories": {
'       "cPUInfo": {
'         "processorCount": "8",
'         "path": "C:\\Tools \"x\""
'       }
'     }
'   }
' }
```

* TOC
{:toc}

## TextFormatter
{: .no_toc }

Meant to write a report as text, in lines that are 50 characters wide, with a double-line box round the title and a frame round each group, drawn with the box-drawing characters of Unicode. **FormatterName** is `Text` and **FileExtension** is `.txt`.

**In version 0.0.0.0 the formatter cannot make a report.** [**BeginFormat**](IOutputFormatter#beginformat) raises run-time error 5, *Invalid procedure call or argument*. The class builds the box with the **Chr$** function and the code points 9556 (`╔`), 9552 (`═`) and others above 255, and [**Chr$**](../../../Modules/Strings/Chr) accepts only 0 to 255. **ChrW$** accepts the code points. The error is the same in a project that sets `runtime.useUnicodeStandardLibrary` to **False**, in a 32-bit program and in a 64-bit program. See [Known problems](.#known-problems-in-version-0000).

```tb check_build check_run
Dim f As IOutputFormatter
Set f = New TextFormatter
On Error Resume Next
f.BeginFormat
Debug.Print Err.Number & ": " & Err.Description
Err.Clear

Dim s As String
s = Chr$(9556)
Debug.Print Err.Number
Err.Clear
s = ChrW$(9556)
Debug.Print Err.Number & " " & AscW(s)
' Output:
' 5: Invalid procedure call or argument
' 5
' 0 9556
```

Because [**FormatterFactory.CreateFormatter**](FormatterFactory#createformatter) gives a **TextFormatter** for `text`, for `txt` and for every name it does not know, a report made with one of those names fails in the same way. Use `json` or `html`.

The source builds the report from a title in a box, one block for each group (a header line, a line for each item as `│`, two spaces, the key, a colon, a space and the value, and a closing line), and a last line `Generated: ` and the time as `yyyy-mm-dd hh:nn:ss`. A program that wants a text report can write its own formatter: see [**IOutputFormatter**](IOutputFormatter).

## JsonFormatter
{: .no_toc }

Writes a report as one JSON object. **FormatterName** is `JSON` and **FileExtension** is `.json`.

```json
{
  "diagnosticReport": {
    "generatedAt": "2026-01-04T15:30:00",
    "toolVersion": "1.0",
    "categories": {
      "cPUInfo": {
        "processorCount": "8",
        "path": "C:\\Tools \"x\""
      }
    }
  }
}
```

- `generatedAt` is the local time at which **BeginFormat** was called, in the form `yyyy-mm-ddThh:nn:ss`, without a time zone.
- Each group is a member of `categories`, and each item is a member of its group. The name of the group and the key of the item are changed into camel case, as described below, and **every value is a string**, the numbers too: `"processorCount": "8"`.
- A failed result has one member, `error`, with the message.
- A group with no items is an empty object.

The camel-case rule changes the first character to lower case. The characters space, underscore, hyphen and colon are removed, and the character after each of them is changed to upper case. All the other characters stay as they are. The rule does not look at the rest of a word, so a name in capital letters keeps them:

| In the report | In the JSON |
|:--------------|:------------|
| `Operating System` | `operatingSystem` |
| `Processor Count` | `processorCount` |
| `CPU Info` | `cPUInfo` |
| `C: Total` | `cTotal` |
| `PID 4120` | `pID4120` |
| `PATH` | `pATH` |
| `PROGRAMFILES(X86)` | `pROGRAMFILES(X86)` |
| `.NET Framework 4.x` | `.NETFramework4.x` |
| `VC++ Redist (x64)` | `vC++Redist(x64)` |
| `IPAddress0` | `iPAddress0` |

Two keys that give the same name appear twice in the group; the formatter does not check. The names, the keys and the values are escaped for backslash, double quote, carriage return, line feed and tab, with [**EscapeJson**](FormatHelper#escapejson). Other control characters (code 1 to 31, except the three) are written as they are, and a value that holds one is not valid JSON. [**EscapeJson**](FormatHelper#escapejson) returns `Chr$(1)` as the one character it was given.

```tb check_build check_run
Dim f As IOutputFormatter
Set f = New JsonFormatter
f.BeginFormat
f.FormatCategory "Operating System"
f.FormatItem "Computer Name", "PC-01"
f.FormatCategory "Disk"
f.FormatItem "C: Total", "465.3 GB"
Dim json As String = f.EndFormat()

Debug.Print InStr(json, """operatingSystem"": {") > 0
Debug.Print InStr(json, """computerName"": ""PC-01""") > 0
Debug.Print InStr(json, """cTotal"": ""465.3 GB""") > 0
' Output:
' True
' True
' True
```

## HtmlFormatter
{: .no_toc }

Writes a report as a complete HTML document. **FormatterName** is `HTML` and **FileExtension** is `.html`.

The document declares `<!DOCTYPE html>`, the language `en` and the character set UTF-8. Its title and its first heading are `Twinbasic Diagnostic Report`, and a paragraph under it has the text `Generated: ` and the time at which **BeginFormat** was called, as `yyyy-mm-dd hh:nn:ss`. Each group is a `section` with the class `category`, an `h2` with the title, and a table of rows. A row has two cells, `td` with the class `key` and `td` with the class `value`. The document ends with a footer that names the tool.

The style sheet is in the document. It sets a light and a dark colour scheme, which the browser selects with `prefers-color-scheme`, a layout that is at most 900 pixels wide, and a print style. The document has no script and loads nothing from another address.

The category name, the keys and the values are escaped with [**EscapeHtml**](FormatHelper#escapehtml), which replaces `&`, `<`, `>`, `"` and `'`. A file that is saved from the report should be in UTF-8, which is the character set that the document declares.

```tb check_build check_run
Dim f As IOutputFormatter
Set f = New HtmlFormatter
f.BeginFormat
f.FormatCategory "Environment"
f.FormatItem "PATH", "C:\Tools & <x>"
f.EndCategory

Dim html As String = f.EndFormat()
Debug.Print Left$(html, 15)
Debug.Print InStr(html, "<h2>Environment</h2>") > 0
Debug.Print InStr(html, "<td class=""value"">C:\Tools &amp; &lt;x&gt;</td>") > 0
' Output:
' <!DOCTYPE html>
' True
' True
```

## See Also

- [IOutputFormatter](IOutputFormatter) interface -- the contract that all three implement
- [FormatterFactory](FormatterFactory) module -- creates a formatter by name and runs it
- [FormatHelper](FormatHelper) module -- **EscapeJson**, **EscapeHtml** and the date formats
- [FileHelper](FileHelper) module -- saves a report as a UTF-8 file
