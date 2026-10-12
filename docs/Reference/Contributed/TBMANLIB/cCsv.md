---
title: cCsv
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/cCsv
has_toc: false
---

# cCsv class
{: .no_toc }

In version 1.0.0.5, a **cCsv** is a reader and writer of INI files, not of CSV files. It keeps the settings of an INI file in a two-level **Scripting.Dictionary**, [**Root**](#root): the sections are the keys of **Root**, and each item is a dictionary of the keys and values of that section. [**LoadFrom**](#loadfrom) fills **Root** from a file and [**SaveTo**](#saveto) writes **Root** to a file.

The code is that of an INI tool: it adds the extension `.ini` to a file name, and its error messages name `iniTools`. The class reads and writes no comma-separated values. The package keeps one ready-made instance, [**TBMAN.Csv**](TBMAN#csv).

```tb check_build
Dim Cfg As New cCsv
Set Cfg.Root = CreateObject("Scripting.Dictionary")
Cfg.Root.Add "Window", CreateObject("Scripting.Dictionary")
Cfg.Root("Window")("Width") = "800"

If Not Cfg.SaveTo(Environ$("TEMP") & "\tbmanlib-docs-settings.ini") Then
    Debug.Print Cfg.LastError
End If
```

* TOC
{:toc}

## The file format

The files are opened as ANSI text, in the code page of the system, not as Unicode or UTF-8. The text that **SaveTo** writes, and that **LoadFrom** reads, looks like this:

```
[Window]
Width=800

[Colors]
Back=white
```

- A section starts with a name in square brackets on a line of its own. **SaveTo** writes a blank line after each section.
- Each key has a line of its own, in the form `key=value`. **LoadFrom** splits a line at its first `=`, removes the spaces around the key and around the value, and removes one `"` at the start and one at the end of the value, if they are there.
- A blank line and a line that starts with a semicolon are skipped. A line that starts with `#` is not a comment: it is read as a key if it holds an `=`, and skipped if it does not.
- A line that has no `=` and is not a section is skipped.
- **LoadFrom** puts the keys that come before the first section under a section whose name is the empty string.

## Properties

### LastError
{: .no_toc }

A **String**. The text of the last error that [**LoadFrom**](#loadfrom) or [**SaveTo**](#saveto) caught, or an empty string after a call that worked.

After an error, the text is a Chinese label that names `iniTools.SaveTo` or `iniTools.LoadFrom` (not `cCsv`), then the error number, a `#` and the description. **LoadFrom** adds a colon and the path. When [**Root**](#root) has no entries, **SaveTo** sets the text to a Chinese sentence that means *there is no data to write*.

### Root
{: .no_toc }

The data, a **Scripting.Dictionary**: section names are the keys, and each item is a **Scripting.Dictionary** of the keys and values of the section. A field, declared `Public Root As Scripting.Dictionary` with no `New`, so it is **Nothing** until a program sets it:

```tb check_build
Dim Cfg As New cCsv
Set Cfg.Root = CreateObject("Scripting.Dictionary")
```

While **Root** is **Nothing**, both methods catch the error and set [**LastError**](#lasterror). After a file is read, a value is read as `Cfg.Root("Window")("Width")`. [**SaveTo**](#saveto) writes each value as a string.

## Methods

### LoadFrom
{: .no_toc }

Reads an INI file into [**Root**](#root).

Syntax: *object*.**LoadFrom** ( *Path* ) **As cIni**

*Path*
: *required* A **String**, the file to read. The extension `.ini` is added to a name that does not end with it, without regard to letter case, so `settings` and `settings.INI` name the same file. The path is used as written: a name without a folder is looked for in the current folder of the program.

The values that the file holds are added to the dictionaries of [**Root**](#root) and replace the values of the same keys. Nothing that **Root** held before is removed. **Root** has to hold a dictionary before the call.

The method is declared to return a [**cIni**](.#types-without-members), a class with no members, and its code assigns other values to its result: the first statement, `Set LoadFrom = Me`, assigns the **cCsv** itself, and the last, `LoadFrom = True`, assigns a **Boolean**. Neither is a **cIni**. The first assignment fails with the error *No such interface supported* (-2147467262), and because the error handler is switched on only after that statement, the error goes to the caller, with an empty source. The file is not read, [**LastError**](#lasterror) stays empty and **Root** is not changed. The call fails in this way every time.

> [!NOTE]
> **LoadFrom** cannot read a file in version 1.0.0.5.

```tb check_build check_run
Dim Cfg As New cCsv
Dim Path As String
Path = Environ$("TEMP") & "\tbmanlib-docs-read.ini"

Open Path For Output As #1
Print #1, "[Window]"
Print #1, "Width=800"
Close #1

Set Cfg.Root = CreateObject("Scripting.Dictionary")
On Error Resume Next
Cfg.LoadFrom Path
Debug.Print Err.Number
Debug.Print "[" & Cfg.LastError & "]"
Debug.Print Cfg.Root.Count
On Error GoTo 0
Kill Path
' Output:
' -2147467262
' []
' 0
```

### SaveTo
{: .no_toc }

Writes [**Root**](#root) to an INI file.

Syntax: *object*.**SaveTo** ( [ *Path* ] ) **As Boolean**

*Path*
: *optional* A **String**, the file to write. The extension `.ini` is added to a name that does not end with it. A call without a path uses the name `.ini`. A file that exists is replaced.

Returns **True** when the file was written. It returns **False** when **Root** is **Nothing** or has no entries, or when an error occurred; [**LastError**](#lasterror) then says why.

The method first calls [**AutoMakeDir**](ToolsFso#automakedir) for *Path*, without telling it that the path names a file. **AutoMakeDir** then takes the whole path to be a folder and creates a folder with the name of the file, and the step that opens the file fails because that name is a folder. A file that exists is not affected by the call: no folder can be created with the name of a file, and the file is rewritten.

> [!WARNING]
> In version 1.0.0.5, a first save of a new file returns **False** and leaves a folder that has the name of the file, `Path.ini`. [**LastError**](#lasterror) then holds error 70, *Permission denied*, which is the error of the step that opens the file. A save over a file that exists works, and replaces the file.

```tb check_build check_run
Dim Cfg As New cCsv
Dim Path As String
Dim Text As String

Path = Environ$("TEMP") & "\tbmanlib-docs-save"
Set Cfg.Root = CreateObject("Scripting.Dictionary")
Cfg.Root.Add "Window", CreateObject("Scripting.Dictionary")
Cfg.Root("Window")("Width") = "800"

' A new file: the save fails and leaves a folder named Path.ini.
Debug.Print Cfg.SaveTo(Path)
Debug.Print InStr(Cfg.LastError, "70#Permission denied") > 0
Debug.Print (GetAttr(Path & ".ini") And vbDirectory) <> 0
CreateObject("Scripting.FileSystemObject").DeleteFolder Path & ".ini"

' A file that exists: the save works.
Open Path & ".ini" For Output As #1
Close #1
Debug.Print Cfg.SaveTo(Path)
Open Path & ".ini" For Input As #1
Do Until EOF(1)
    Line Input #1, Text
    Debug.Print "[" & Text & "]"
Loop
Close #1
Kill Path & ".ini"
' Output:
' False
' True
' True
' True
' [[Window]]
' [Width=800]
' []
```

## See Also

- [TBMAN](TBMAN) module -- the shared instance **TBMAN.Csv**
- [ToolsFso](ToolsFso) module -- **AutoMakeDir**, which the method calls
- [TBMANLIB](.) package -- overview
