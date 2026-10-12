---
title: TBMANLIB Package
parent: Experimental Packages
has_toc: false
exclude_from_docs:
  - cIni
  - cTimer
  - ToolsJsonUcs
indexed_from: 1.0.0.5
permalink: /tB/Packages/Contributed/TBMANLIB/
---

# TBMANLIB Package
{: .no_toc }

**Author:** woeoio. **On GitHub:** [woeoio/tbman](https://github.com/woeoio/tbman), the repository of the TBMAN toolkit. Its first commit, of 7 December 2024, the day this version was published, holds the code of this package. The repository has been developed since, and its current code differs from version 1.0.0.5.

The **TBMANLIB** contributed package is the library of **TBMAN**, a toolkit for twinBASIC programmers that grew out of the author's VB6 library *vbman*. It is a collection of small helpers rather than a library with one theme: a JSON document class and parser, a log writer, a stopwatch, an INI file class, a message-box helper, and modules of functions for strings, arrays and bytes, UTF-8, dictionaries, files and folders, numbers and JavaScript objects. The package's own description on TWINSERV is the single word *TBMAN*.

```tb check_build check_run
Dim J As New cJson
Dim UserName As String
J.Decode "{""user"":{""name"":""Ann""},""scores"":[3,5]}"

UserName = J.Item("user")("name")
Debug.Print UserName
Debug.Print J.Item("scores")(2)
Debug.Print ToolsStr.InsertSpan(UserName, "-", 1)
Debug.Print J.Encode()
' Output:
' Ann
' 5
' A-n-n
' {"user":{"name":"Ann"},"scores":[3,5]}
```

* TOC
{:toc}

## What the package offers

- **JSON.** [**cJson**](cJson) holds a JSON document: it reads a text or a file, gives access to its objects and arrays, builds new ones, and writes them as text or to a file. The parser and writer are the code of VBA-JSON, in [**ToolsJsonVba**](ToolsJsonVba).
- **Logs.** [**cLogs**](cLogs) writes log lines to files in a folder tree by day or month, and can send each line to a list box, to a debugging tool or to a web page, with four levels.
- **Time.** [**cTimeuse**](cTimeuse) is a stopwatch with a millisecond count.
- **Messages.** [**cLayer**](cLayer) shows a message box.
- **INI files.** [**cCsv**](cCsv), in spite of its name, reads and writes INI files.
- **Text and bytes.** [**ToolsStr**](ToolsStr) trims, cuts and searches strings, makes `%XX` and `\uXXXX` escapes, converts between strings and bytes, and makes random strings and GUIDs. [**ToolsArray**](ToolsArray) finds, slices and splits byte arrays. [**ToolsUtf8**](ToolsUtf8) converts between UTF-8 bytes and strings. [**ToolsMath**](ToolsMath) rounds up and picks random numbers.
- **Files and folders.** [**ToolsFso**](ToolsFso) completes paths and creates folders. [**ToolsStream**](ToolsStream) reads and writes whole files as text in a chosen character set or as bytes.
- **Dictionaries and JavaScript.** [**ToolsDic**](ToolsDic) reads and writes form text, merges and copies `Scripting.Dictionary` objects. [**ToolsJScript**](ToolsJScript) creates JavaScript arrays and objects with the Microsoft Script Control.
- **Ready-made instances.** The module [**TBMAN**](TBMAN) has one shared instance of each class, so a program can write `TBMAN.Json` or `TBMAN.Logs` without `New`.

The classes are created with `New`, as in `Dim J As New cJson`. The members of a module are called with the name of the module in front, as in `ToolsStr.TrimEx(...)`. The names of the package's own members keep the author's spelling, including the misspellings, such as **DebugPring**, **LogFileNameByUer** and **TowLevelDicAssign**; this documentation uses them as they are.

## Components the package uses

The package is written on top of components that are not part of twinBASIC. Its references are the Microsoft Scripting Runtime, the Microsoft ActiveX Data Objects 2.8 library and the Microsoft Script Control 1.0, and some members create other objects by name.

| Component | Used by |
|:----------|:--------|
| Scripting Runtime: `Scripting.Dictionary` | **cJson** (`RootItem`), **cCsv** (`Root`), **ToolsDic**, **ToolsJsonVba** |
| Scripting Runtime: `Scripting.FileSystemObject` | **cCsv**, **ToolsFso** |
| ActiveX Data Objects: `ADODB.Stream` | **ToolsStream**, so **cJson.LoadFrom** and **cJson.SaveTo** |
| Microsoft Script Control: `MSScriptControl.ScriptControl` | **ToolsJScript**, so **ToolsDic.ToWwwFormUrlencoded** |
| `WinHttp.WinHttpRequest.5.1`, created by name | **cLogs.WebView** |
| `Scriptlet.TypeLib`, created by name | **ToolsStr.GetGUID** |
| `imagehlp.dll` (`MakeSureDirectoryPathExists`) | **cLogs.Save**, **ToolsFso.AutoMakeDir** |
| `kernel32.dll` (`GetTickCount`, `OutputDebugStringA`, `RtlMoveMemory`, `MultiByteToWideChar`, `WideCharToMultiByte`) | **cTimeuse**, **cLogs.DbgView**, **ToolsArray**, **ToolsUtf8** |

The references of a package are not visible to the project that uses it. A program that names a type of these libraries in its own code, such as `Dim D As New Scripting.Dictionary`, adds the library to its own references; in a project that references only TBMANLIB the compiler refuses the name with TB5079, *Unrecognized datatype symbol 'Scripting'*. A program can call members that return those objects without naming the type, for example `J.Item("user")("name")`, and can create an object by name with **CreateObject**.

### 32-bit and 64-bit programs

The Microsoft Script Control exists only as a 32-bit component, and the package's reference to it has a path for 32-bit programs and none for 64-bit programs.

> [!WARNING]
> In BETA 1005, a project that embeds TBMANLIB and is built for 64-bit programs (**Win64**) crashes the compiler, again after each restart, until the IDE falls back to Safe Mode, even when the program uses nothing of the package. The cause is a defect of twinBASIC, not of the package: any project that references the Microsoft Script Control, directly or through a package, crashes the compiler in a 64-bit build, whatever path the reference gives for 64-bit programs. Other 32-bit-only controls, such as the Common Dialog control, do not. The package can be used in 32-bit programs only.

The Script Control is used by **ToolsJScript** and, through it, by **ToolsDic.ToWwwFormUrlencoded**. Those members do not work in 32-bit programs either; see [ToolsJScript](ToolsJScript). The other components are available to 32-bit programs.

## Defects of version 1.0.0.5

Part of the code is unfinished, and the source holds test code and notes to the author. Where a member does not do what its name or comment says, the page of the member says so. The ones that matter most are these:

- [**cCsv.SaveTo**](cCsv#saveto) does not write a new file, and [**cCsv.LoadFrom**](cCsv#loadfrom) raises an error before it reads anything.
- [**ToolsDic.ToWwwFormUrlencoded**](ToolsDic#towwwformurlencoded) adds two entries to the dictionary it is given and then fails, and [**ToolsJScript.NewArr**](ToolsJScript#newarr) and **NewObj** raise error 91.
- [**cJson.Items**](cJson#items) cannot be assigned to, and [**cJson.Decode**](cJson#decode) rejects an array that follows a line break.
- [**ToolsStream.SaveFileAsText**](ToolsStream#savefileastext) always returns **False**, and a failed text call leaves the shared stream open, so that the next calls fail.
- [**ToolsStr.GetLastChar**](ToolsStr#getlastchar) returns the first character, [**UniVbCrLf**](ToolsStr#univbcrlf) doubles a line feed, and [**IsEmptyEx**](ToolsStr#isemptyex) trims the variable it is given.
- [**ToolsUtf8.DecodeToByteArray**](ToolsUtf8#decodetobytearray) returns half of the bytes.
- [**ToolsArray.SliceByteArray**](ToolsArray#slicebytearray) returns a wrong result when the start and the end are the same.
- [**cLogs.Save**](cLogs#save) sends the other outputs at the level **Info**, and the levels **Debugger** and **Custom** raise an error.

## Classes

- [cCsv](cCsv) -- reads and writes INI files into a two-level dictionary.
- [cJson](cJson) -- holds a JSON document: reads and writes text and files, and builds objects and arrays.
- [cLayer](cLayer) -- shows a message box.
- [cLogs](cLogs) -- writes log lines to files and to other outputs, with levels.
- [cTimeuse](cTimeuse) -- a stopwatch in milliseconds.

## Modules

- [TBMAN](TBMAN) -- shared instances of the classes, and a version text.
- [ToolsArray](ToolsArray) -- finds, slices and splits arrays of bytes and longs.
- [ToolsDic](ToolsDic) -- form text, merging and copying of dictionaries.
- [ToolsFso](ToolsFso) -- completes paths, tidies slashes and creates folders.
- [ToolsJScript](ToolsJScript) -- creates JavaScript arrays and objects with the Script Control.
- [ToolsJsonVba](ToolsJsonVba) -- the VBA-JSON parser and writer, and the VBA-UTC date functions.
- [ToolsMath](ToolsMath) -- rounds up, and picks random whole numbers.
- [ToolsStr](ToolsStr) -- trims, searches, escapes and converts strings; random text and GUIDs.
- [ToolsStream](ToolsStream) -- reads and writes whole files as text or bytes.
- [ToolsUtf8](ToolsUtf8) -- converts between UTF-8 bytes and strings.

## Types without members
{: #types-without-members }

Three types of the package have no members, and have no page: **cIni**, **cTimer** and **ToolsJsonUcs**. Each holds only the comment *add your member fields and procedures here*, or, for **ToolsJsonUcs**, *add your procedures here*. **cIni** is the type of [**TBMAN.Ini**](TBMAN#ini) and the declared result of [**cCsv.LoadFrom**](cCsv#loadfrom).

## See Also

- [VBA_JSON](../VBA_JSON/) package -- the same JSON code as a module of its own
- [TBMANLIB_Dialog](../TBMANLIB_Dialog/) package -- the Open, Save As and Browse For Folder dialogs, by the same author
- [TBMANLIB_RES](../TBMANLIB_RES/) package -- resources embedded in an executable, by the same author
- [TBMANLIB_Xml](../TBMANLIB_Xml/) package -- XML documents, by the same author
- [Importing a package from TWINSERV](../../../../Features/Packages/Importing-TWINSERV) -- adding a published package to a project
