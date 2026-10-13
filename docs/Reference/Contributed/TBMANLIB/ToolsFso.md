---
title: ToolsFso
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/ToolsFso
has_toc: false
---

# ToolsFso module
{: .no_toc }

Helps with path names and folders: it completes a relative path with the folder of the program, tidies the slashes of a path, creates the missing folders of a path, and builds a new file name from an old one. It keeps one **Scripting.FileSystemObject**, [**Inst**](#inst), for its own use and for a program to use.

```tb check_build check_run
Debug.Print ToolsFso.ClearSpan("C:/data//a", True)
Debug.Print ToolsFso.AutoCompleteFullPath("C:\data\\a.json", True)
Debug.Print ToolsFso.MakeNewFileFulPath("C:\data\a.json", "old")
' Output:
' C:\data\a
' C:\data\a.json
' a_old.json
```

[**cJson**](cJson) uses **AutoCompleteFullPath** and **AutoMakeDir** to find and prepare the file for its [**SaveTo**](cJson#saveto), and [**cCsv**](cCsv) uses **AutoMakeDir**.

* TOC
{:toc}

## Members

### AutoCompleteFullPath
{: .no_toc }

Completes a relative path with the folder of the program and tidies its slashes.

Syntax: **ToolsFso.AutoCompleteFullPath** ( *Path* [ **,** *IsFile* ] ) **As String**

*Path*
: *required* A **String**, a path. It is passed by reference and is not changed.

*IsFile*
: *optional* A **Boolean**, **False** by default. Set it to **True** when *Path* names a file. When it is **False**, the result ends with a backslash, as the path of a folder does.

If *Path* does not contain the two characters `:\` anywhere, it is taken to be relative: `App.Path`, a backslash and *Path* are joined, and the result goes through [**ClearSpan**](#clearspan). A path that contains `:\` goes through **ClearSpan** alone. In a debug run, `App.Path` is the folder of the project.

> [!NOTE]
> Only `:\` marks a path as complete. A path with a drive letter written with forward slashes, such as `C:/data/a.json`, and a network path such as `\\server\share\a.json` do not contain it, so they are given the folder of the program in front of them and come out wrong.

### AutoMakeDir
{: .no_toc }

Creates the missing folders of a path and returns the path of the folder.

Syntax: **ToolsFso.AutoMakeDir** ( *Path* [ **,** *IsFile* ] ) **As String**

*Path*
: *required* A **String**, a folder path, or a file path when *IsFile* is **True**. It is used as written: a relative path is relative to the current folder of the program, and is not completed with `App.Path`.

*IsFile*
: *optional* A **Boolean**, **False** by default. When it is **True**, *Path* names a file, and the folders that are created are those of its parent folder. When it is **False**, the whole of *Path* is taken to be a folder.

All the folders of the path that do not exist are created, by the Windows function **MakeSureDirectoryPathExists**. The function returns the path of the folder after [**ClearSpan**](#clearspan), so it ends with a backslash. The result of the Windows function is not tested: if a folder cannot be created, no error is raised. That function takes ANSI text, so a folder name that has characters outside the system code page is not created as written.

> [!WARNING]
> With *IsFile* left at **False**, the last name of the path becomes a folder: `AutoMakeDir("C:\data\log.txt")` creates a folder named `log.txt`. Pass **True** for a file. [**cCsv.SaveTo**](cCsv#saveto) calls the function without it.

```tb check_build check_run
Dim Base As String
Base = Environ$("TEMP") & "\tbmanlib-docs-fso"

Debug.Print ToolsFso.AutoMakeDir(Base & "\a\b\file.txt", True) = Base & "\a\b\"
Debug.Print Dir(Base & "\a\b", vbDirectory) = "b"

RmDir Base & "\a\b"
RmDir Base & "\a"
RmDir Base
' Output:
' True
' True
```

### ClearSpan
{: .no_toc }

Replaces the slashes of a path with single backslashes.

Syntax: **ToolsFso.ClearSpan** ( *Path* [ **,** *IsFile* ] ) **As String**

*Path*
: *required* A **String**, a path. It is passed by reference and is not changed.

*IsFile*
: *optional* A **Boolean**, **False** by default. When it is **False**, a backslash is added at the end of *Path* first.

The function makes four replacements, one after the other, on the whole string: each pair of backslashes becomes one, each pair of forward slashes becomes one backslash, each backslash followed by a forward slash becomes one backslash, and each remaining forward slash becomes a backslash. Each replacement is made once, from left to right, so a run of four backslashes becomes two, not one. A network path loses one of the two backslashes at its start.

### Inst
{: .no_toc }

The **Scripting.FileSystemObject** that the module uses. A field, declared `Public Inst As New Scripting.FileSystemObject`, created the first time it is used. It is shared by every caller.

### MakeNewFileFulPath
{: .no_toc }

Builds a file name from a file name and a suffix.

Syntax: **ToolsFso.MakeNewFileFulPath** ( *FileSrc* **,** *AppendFix* [ **,** *JoinStr* ] ) **As String**

*FileSrc*
: *required* A **String**, a file path. The file need not exist.

*AppendFix*
: *required* A **String**, the text to add after the base name of the file.

*JoinStr*
: *optional* A **String**, `_` by default. It is placed between the base name and *AppendFix*.

Returns the base name of *FileSrc*, then *JoinStr*, then *AppendFix*, a period and the extension of *FileSrc*: `MakeNewFileFulPath("C:\data\a.json", "old")` returns `a_old.json`.

> [!NOTE]
> Despite the word *FulPath* in the name, the result holds no folder. The function reads the folder of *FileSrc* and does not use it. Join the result to the folder with `&`. A file name with no extension gives a result that ends with a period.

### Test
{: .no_toc }

A procedure of the author's own tests. It writes the names of the files and folders under `D:\code\_html\easyweb\spa-3.1.8` to the Debug Console, and raises an error on a computer that has no such folder. A program has no use for it.

## See Also

- [cToolsStream](cToolsStream) class -- reads and writes the files that this module prepares
- [cJson](cJson) class -- **SaveTo** completes the file name with this module
- [TBMANLIB](.) package -- overview
