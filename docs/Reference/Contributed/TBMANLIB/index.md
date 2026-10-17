---
title: TBMANLIB Package
parent: Experimental Packages
has_toc: false
exclude_from_docs:
  - ToolsJsonUcs
  - Tests
  - mTimer
  - mCallBackSubClass
  - ForDialog
  - ToolsDialog
  - cSysTray
  - ToolsJScript
indexed_from: 1.0.0.29
permalink: /tB/Packages/Contributed/TBMANLIB/
---

# TBMANLIB Package
{: .no_toc }

**Author:** woeoio. **Version:** 1.0.0.29. **On GitHub:** [woeoio/tbman](https://github.com/woeoio/tbman), the repository of the TBMAN toolkit. This section documents version 1.0.0.29, published on TWINSERV on 9 February 2026 under the MIT licence. The repository has been developed since, and its current code may differ from that version.

The **TBMANLIB** contributed package is the library of **TBMAN**, a toolkit for twinBASIC programmers that grew out of the author's VB6 library *vbman*. It is a collection of small helpers rather than a library with one theme: a JSON document class and parser, an HTTP client, a log writer, a stopwatch, timers, an INI file class and a CSV file class, a message-box helper, a window subclasser, and modules of functions for strings, arrays and bytes, UTF-8, dictionaries, files and folders and numbers. The package's own description on TWINSERV is a tagline, *a rapid development toolkit for twinBASIC*.

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
- **HTTP.** [**cHttpClient**](cHttpClient) sends requests with WinHTTP and reads the answer as text, JSON, bytes or a file, and uploads and downloads files. [**ToolsHttp**](ToolsHttp) holds its enumerations and helpers for URLs and forms, [**ToolsHttpMimeType**](ToolsHttpMimeType) gives the media type of a file name, and [**Consts**](Consts) holds media-type constants.
- **Time.** [**cTimeuse**](cTimeuse) is a stopwatch with a millisecond count. [**cTimer**](cTimer) raises an event at an interval, and [**cTimers**](cTimers) is a numbered group of timers with one event.
- **Messages.** [**cLayer**](cLayer) shows a message box. [**cSubClass**](cSubClass) lets a program see the messages that a window receives.
- **INI and CSV files.** [**cIni**](cIni) reads and writes INI files into a two-level dictionary. [**cCsv**](cCsv) holds a table of text and reads and writes CSV files.
- **Text and bytes.** [**cToolsStr**](cToolsStr) trims, cuts and searches strings, makes `%XX` and `\uXXXX` escapes, splits text into lines, converts between strings and bytes, and makes random strings and GUIDs. [**ToolsArray**](ToolsArray) finds, slices and splits byte arrays. [**ToolsUtf8**](ToolsUtf8) converts between UTF-8 bytes and strings. [**ToolsMath**](ToolsMath) rounds up and picks random numbers. [**ToolsCN**](ToolsCN) is meant to convert Chinese characters to pinyin.
- **Files and folders.** [**ToolsFso**](ToolsFso) completes paths and creates folders. [**cToolsStream**](cToolsStream) reads and writes whole files as text in a chosen character set or as bytes.
- **Dictionaries.** [**ToolsDic**](ToolsDic) reads form text, merges and copies `Scripting.Dictionary` objects.
- **Ready-made instances.** The module [**TBMAN**](TBMAN) has one shared instance of each main class, so a program can write `TBMAN.Json` or `TBMAN.Logs` without `New`. The module [**Tools**](Tools) has the instances **ToolsStr** and **ToolsStream** of the two classes of that name.

The classes are created with `New`, as in `Dim J As New cJson`. The members of a module are called with the name of the module in front, as in `ToolsArray.FindByteArray(...)`; the string and stream functions are called through the instances of the module [**Tools**](Tools), as in `ToolsStr.TrimEx(...)`. The names of the package's own members keep the author's spelling, including the misspellings, such as **DebugPring**, **LogFileNameByUer** and **TowLevelDicAssign**; this documentation uses them as they are.

## Components the package uses

The package is written on top of components that are not part of twinBASIC. Its references are the Microsoft Scripting Runtime, the Microsoft ActiveX Data Objects 2.8 library and the Microsoft WinHTTP Services 5.1 library, besides the VB and Common Controls compatibility packages of twinBASIC. Some members create other objects by name.

| Component | Used by |
|:----------|:--------|
| Scripting Runtime: `Scripting.Dictionary` | **cJson** (`RootItem`), **cIni** and **cCsv** (their data), **cHttpClient** (headers and form values), **ToolsDic**, **ToolsJsonVba** |
| Scripting Runtime: `Scripting.FileSystemObject` | **cCsv**, **cIni**, **ToolsFso** |
| ActiveX Data Objects: `ADODB.Stream` | **cToolsStream**, so **cJson.LoadFrom**, **cJson.SaveTo** and the file members of **cHttpClient** |
| WinHTTP: `WinHttp.WinHttpRequest.5.1` | **cHttpClient** |
| `WinHttp.WinHttpRequest.5.1`, created by name | **cLogs.WebView** |
| `Scriptlet.TypeLib`, created by name | **cToolsStr.GetGUID** |
| `imagehlp.dll` (`MakeSureDirectoryPathExists`) | **cLogs.Save**, **ToolsFso.AutoMakeDir** |
| `kernel32.dll` (`GetTickCount`, `OutputDebugStringA`, `RtlMoveMemory`, `MultiByteToWideChar`, `WideCharToMultiByte`) | **cTimeuse**, **cLogs.DbgView**, **ToolsArray**, **ToolsUtf8** |
| `user32.dll` (`SetTimer`, `KillTimer`, `GetWindowLong`, `SetWindowLong`, `CallWindowProc`, `ShellExecute` from `shell32.dll`) | **cTimer**, **cSubClass**, **cHttpClient.ShowPage** |

The references of a package are not visible to the project that uses it. A program that names a type of these libraries in its own code, such as `Dim D As New Scripting.Dictionary`, adds the library to its own references; in a project that references only TBMANLIB the compiler refuses the name with TB5079, *Unrecognized datatype symbol 'Scripting'*. A program can call members that return those objects without naming the type, for example `J.Item("user")("name")`, and can create an object by name with **CreateObject**.

### 32-bit and 64-bit programs

The package is built for 32-bit programs. The window procedure that **cSubClass** installs is passed to **SetWindowLong** as a **Long**, which a 64-bit program cannot hold.

<!-- test: none -- the compiler refuses the package as a whole in a 64-bit build, which no case of a project can state -->
> [!WARNING] BETA 1007
> A project that embeds TBMANLIB and is built for 64-bit programs (**Win64**) does not compile. The compiler reports TB5001 in `cSubClass.twin`, *Validation of call to 'SetWindowLong' failed. Argument for 'dwNewLong': cannot coerce type 'Callback' to 'Long'*, even when the program uses nothing of the package. The package can be used in 32-bit programs only.

The other components are available to 32-bit programs.

## Known problems in version 1.0.0.29

Part of the code is unfinished, and the source holds test code and notes to the author. Where a member does not do what its name or comment says, the page of the member says so. The ones that matter most are these:

- [**cToolsStream**](cToolsStream), and with it [**cJson.LoadFrom**](cJson#loadfrom) and [**cJson.SaveTo**](cJson#saveto), leave the shared stream open after a text call, so that the next text call fails or writes over the old text. [**SaveFileAsText**](cToolsStream#savefileastext) always returns **False**, and [**WriteLine**](cToolsStream#writeline) always raises error 13.
- [**cCsv**](cCsv): the functions that add columns and widths return **False** always, the `value` property cannot be set, removing a column other than the last one corrupts the saved file, and a character that the system code page lacks leaves an empty file.
- [**cHttpClient**](cHttpClient) accepts every certificate, [**RequestDataQuery**](cHttpClient#requestdataquery) loses the name of its first item, [**RequestDataForm**](cHttpClient#requestdataform) values are not URL encoded, header values are cut at their first colon, so [**FollowRedirect**](cHttpClient#followredirect) cannot work, and its content type header does not follow a later change of the content type.
- [**ToolsHttp.UrlDecodeUtf8**](ToolsHttp#urldecodeutf8) raises error 13 for any text with a `%`, [**UrlEncodUtf8**](ToolsHttp#urlencodutf8) writes the characters from hex 80 to hex FFF wrongly, and [**ToolsCN.GetPinYin**](ToolsCN#getpinyin) raises an error for any text with an English letter, a digit or a space in it.
- [**cJson.Decode**](cJson#decode) rejects an array that follows a line break, accepts text that is not JSON, and keeps the old array or object when it reads the other kind; [**Items**](cJson#items) adds a value instead of replacing one, and [**Encode**](cJson#encode) does not write `{}` for an empty document.
- [**cToolsStr.GetLastChar**](cToolsStr#getlastchar) returns the first character, [**UniVbCrLf**](cToolsStr#univbcrlf) doubles a line feed, [**IsEmptyEx**](cToolsStr#isemptyex) trims the variable it is given, [**SplitLinesToCollection**](cToolsStr#splitlinestocollection) loses a last line of one character, [**ToHex**](cToolsStr#tohex) writes one digit for a byte below 16, [**PercentEncode**](cToolsStr#percentencode) encodes the digits only, and the functions that keep a position in an **Integer** raise error 6 for a string of more than 32,767 characters.
- [**ToolsUtf8.DecodeToByteArray**](ToolsUtf8#decodetobytearray) returns half of the bytes.
- [**ToolsArray.SliceByteArray**](ToolsArray#slicebytearray) returns a wrong result when the start and the end are the same, and [**SplitByteArrayByKeyword**](ToolsArray#splitbytearraybykeyword) raises an error for a keyword at the start.
- [**ToolsFso.AutoCompleteFullPath**](ToolsFso#autocompletefullpath) and [**ClearSpan**](ToolsFso#clearspan) spoil a network path and a drive path written with forward slashes, [**MakeNewFileFulPath**](ToolsFso#makenewfilefulpath) leaves out the folder, [**ToolsDic.DeepCopy**](ToolsDic#deepcopy) copies the first level only, [**ToolsHttp.ParseKeyValue**](ToolsHttp#parsekeyvalue) cuts a value at its colon, and [**ToolsMath.Ceil**](ToolsMath#ceil) rounds `0.07` up to 0.08.
- [**cLogs.Save**](cLogs#save) sends the other outputs at the level **Info**, and the levels **Debugger** and **Custom** raise an error.
- [**cTimer**](cTimer) and [**cTimers**](cTimers) objects that are enabled are not destroyed when the program releases them, and go on running.

## Classes

- [cCsv](cCsv) -- holds a table of text and reads and writes CSV files.
- [cHttpClient](cHttpClient) -- sends HTTP and HTTPS requests with WinHTTP, and uploads and downloads files.
- [cIni](cIni) -- reads and writes INI files into a two-level dictionary.
- [cJson](cJson) -- holds a JSON document: reads and writes text and files, and builds objects and arrays.
- [cLayer](cLayer) -- shows a message box.
- [cLogs](cLogs) -- writes log lines to files and to other outputs, with levels.
- [cSubClass](cSubClass) -- sees the messages that a window receives, and can stop them.
- [cTimer](cTimer) -- raises an event at an interval.
- [cTimers](cTimers) -- a numbered group of timers with one event.
- [cTimeuse](cTimeuse) -- a stopwatch in milliseconds.
- [cToolsStr](cToolsStr) -- trims, searches, escapes and converts strings; random text and GUIDs.
- [cToolsStream](cToolsStream) -- reads and writes whole files as text or bytes.

## Modules

- [Consts](Consts) -- media types and header names of HTTP requests.
- [TBMAN](TBMAN) -- shared instances of the classes, and a version text.
- [Tools](Tools) -- the shared instances of **cToolsStr** and **cToolsStream**.
- [ToolsArray](ToolsArray) -- finds, slices and splits arrays of bytes and longs.
- [ToolsCN](ToolsCN) -- meant to convert Chinese characters to pinyin.
- [ToolsDic](ToolsDic) -- form text, merging and copying of dictionaries.
- [ToolsFso](ToolsFso) -- completes paths, tidies slashes and creates folders.
- [ToolsHttp](ToolsHttp) -- request methods and content types, URL encoding, form and header text.
- [ToolsHttpMimeType](ToolsHttpMimeType) -- the media type of a file name.
- [ToolsJsonVba](ToolsJsonVba) -- the VBA-JSON parser and writer, and the VBA-UTC date functions.
- [ToolsMath](ToolsMath) -- rounds up, and picks random whole numbers.
- [ToolsUtf8](ToolsUtf8) -- converts between UTF-8 bytes and strings.

## Types without members
{: #types-without-members }

Some types of the package have no members, or none that a program is meant to use, and have no page:

- **ToolsJsonUcs** holds only the comment *add your procedures here*.
- **cSysTray** holds only the comment *add your member fields and procedures here*. It is the type of [**TBMAN.SysTray**](TBMAN#systray).
- **ForDialog** is an empty form. **ToolsDialog** has one public member, a **String** named **LastError**, and the rest of its code is commented out.
- **ToolsJScript** has all its code commented out; it once created JavaScript objects with the Script Control, which the package no longer references.
- **Tests** is the author's demonstration code: **UploadAndDownloadDemo** and **TestHttpClient** upload and download files from a public test server on the internet, with paths on drive C: that a computer is unlikely to have. A program has no use for them.
- **mTimer** and **mCallBackSubClass** are the internal modules behind [**cTimer**](cTimer) and [**cSubClass**](cSubClass). Their public members, the callbacks that Windows calls and the collections that register the objects, are not meant to be called by a program.

## See Also

- [VBA_JSON](../VBA_JSON/) package -- the same JSON code as a module of its own
- [TBMANLIB_Dialog](../TBMANLIB_Dialog/) package -- the Open, Save As and Browse For Folder dialogs, by the same author
- [TBMANLIB_RES](../TBMANLIB_RES/) package -- resources embedded in an executable, by the same author
- [TBMANLIB_Xml](../TBMANLIB_Xml/) package -- XML documents, by the same author
- [Importing a package from TWINSERV](../../../../Features/Packages/Importing-TWINSERV) -- adding a published package to a project

## Test cases

The notes and warnings of this section are checked by the test cases in [TBMANLIB-tests.twinproj](TBMANLIB-tests.twinproj), a twinBASIC project. It uses TBMANLIB as a [linked package](../../../../Features/Packages/Linked#manual-management): put the package's `.twinpack` in `%APPDATA%\twinBASIC\packages`, then run the project, and each case prints whether it passes.
