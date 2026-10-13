---
title: cIni
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/cIni
has_toc: false
---

# cIni class
{: .no_toc }

A **cIni** reads and writes INI files. It keeps the settings of an INI file in a two-level **Scripting.Dictionary**, [**Root**](#root): the sections are the keys of **Root**, and each item is a dictionary of the keys and values of that section. [**LoadFrom**](#loadfrom) fills **Root** from a file and [**SaveTo**](#saveto) writes **Root** to a file. The package keeps one ready-made instance, [**TBMAN.Ini**](TBMAN#ini).

The error messages of the class name `iniTools`, the name the code had before it was a class of the package.

```tb check_build check_run
Dim Cfg As New cIni
Dim Path As String
Path = Environ$("TEMP") & "\tbmanlib-docs-settings.ini"

Cfg.Section("Window")("Width") = "800"
Cfg.Section("Window")("Height") = "600"
Debug.Print Cfg.SaveTo(Path)

Dim Back As New cIni
Back.LoadFrom Path
Debug.Print Back.Root("Window")("Width") + 1
Kill Path
' Output:
' True
' 801
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

After an error, the text is a Chinese label that names `iniTools.SaveTo` or `iniTools.LoadFrom` (not `cIni`), then the error number, a `#` and the description. **LoadFrom** adds a colon and the path. When [**Root**](#root) has no entries, **SaveTo** sets the text to a Chinese sentence that means *there is no data to write*.

### Root
{: .no_toc }

Returns the data, a **Scripting.Dictionary**: section names are the keys, and each item is a **Scripting.Dictionary** of the keys and values of the section. It is the default member of the class, so `Cfg("Window")("Width")` is `Cfg.Root("Window")("Width")`. The dictionary is created with the object, and is the same object for as long as the **cIni** lives; a program cannot replace it, but can empty it with `Cfg.Root.RemoveAll`.

After a file is read, a value is read as `Cfg.Root("Window")("Width")`. [**SaveTo**](#saveto) writes each value as a string.

### Section
{: .no_toc }

Returns the dictionary of one section, and creates the section when it is not there.

Syntax: *object*.**Section** ( *Key* ) **As Scripting.Dictionary**

*Key*
: *required* A **String**, the name of the section. Names are compared with letter case.

The dictionary is the one that [**Root**](#root) holds for the name, so a value assigned to it is stored in **Root**: `Cfg.Section("Window")("Width") = "800"`. A name that is not in **Root** is added to it, with an empty dictionary, by the call itself, even when the program only reads.

```tb check_build check_run
Dim Cfg As New cIni
Debug.Print Cfg.Root.Count
Cfg.Section("Window")("Width") = "800"
Debug.Print Cfg.Root.Count
Debug.Print Cfg.Section("Colors").Count
Debug.Print Cfg.Root.Count
' Output:
' 0
' 1
' 0
' 2
```

## Methods

### LoadFrom
{: .no_toc }

Reads an INI file into [**Root**](#root).

Syntax: *object*.**LoadFrom** ( *Path* ) **As cIni**

*Path*
: *required* A **String**, the file to read. The extension `.ini` is added to a name that does not end with it, without regard to letter case, so `settings` and `settings.INI` name the same file. The path is used as written: a name without a folder is looked for in the current folder of the program.

Returns the object itself, so a call can be followed by a member: `Cfg.LoadFrom(Path).Section("Window")`.

The call empties **Root** first, so afterwards it holds only what the file holds. If the file cannot be opened, **Root** has been emptied, the call raises no error, and [**LastError**](#lasterror) says why.

```tb check_build check_run
Dim Cfg As New cIni
Dim Path As String
Path = Environ$("TEMP") & "\tbmanlib-docs-read.ini"

Open Path For Output As #1
Print #1, "top=1"
Print #1, "; a comment"
Print #1, "[Window]"
Print #1, "Title = ""Main"""
Print #1, "Width=800"
Close #1

Cfg.LoadFrom Path
Debug.Print Cfg.Root.Count
Debug.Print Cfg.Root("")("top")
Debug.Print Cfg("Window")("Title")
Kill Path

Cfg.LoadFrom Path
Debug.Print Cfg.Root.Count
Debug.Print InStr(Cfg.LastError, "iniTools.LoadFrom") > 0
' Output:
' 2
' 1
' Main
' 0
' True
```

### SaveTo
{: .no_toc }

Writes [**Root**](#root) to an INI file.

Syntax: *object*.**SaveTo** ( [ *Path* ] ) **As Boolean**

*Path*
: *optional* A **String**, the file to write. The extension `.ini` is added to a name that does not end with it. A call without a path uses the name `.ini`. A file that exists is replaced. The folders of the path are created if they are missing.

Returns **True** when the file was written. It returns **False** when **Root** has no entries, or when an error occurred; [**LastError**](#lasterror) then says why.

```tb check_build check_run
Dim Cfg As New cIni
Dim Path As String
Dim Text As String

Path = Environ$("TEMP") & "\tbmanlib-docs-save"
Debug.Print Cfg.SaveTo(Path)

Cfg.Section("Window")("Width") = "800"
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
' [[Window]]
' [Width=800]
' []
```

## See Also

- [TBMAN](TBMAN) module -- the shared instance **TBMAN.Ini**
- [ToolsFso](ToolsFso) module -- **AutoMakeDir**, which the method calls
- [cCsv](cCsv) class -- reads and writes comma-separated values
- [TBMANLIB](.) package -- overview
