---
title: FileHelper
parent: TBMANLIB_Diagnostic Package
permalink: /tB/Packages/Contributed/TBMANLIB_Diagnostic/FileHelper
has_toc: false
---

# FileHelper module
{: .no_toc }

Functions that write, append to and read a text file, test whether a file or folder exists, and take paths apart. A program uses them to save a report that a [formatter](Formatters) made. They call the file statements of the runtime library (**Open**, **Put**, **Get**, **Kill**, **MkDir**, **GetAttr**), and need no other library.

The functions are called with the name of the module, as in `FileHelper.WriteFile(report, path)`. Three of them, **WriteFile**, **AppendFile** and **ReadFile**, return a **Variant** and never raise an error. **WriteFile** and **AppendFile** return **True**, and when something fails, a **String** that describes the failure; a program tells the two apart with **VarType**. **ReadFile** returns a **String** in both cases, the content of the file or the description of the failure, and the description starts with the text `Error `. A file that does not exist is not a failure for **ReadFile** and **GetFileSize**: they create it. See [Known problems](.#known-problems-in-version-1001).

```tb check_build check_run
Dim folder As String = Environ$("TEMP") & "\diag-filehelper"
Dim path As String = folder & "\report.txt"
FileHelper.DeleteFile path

Debug.Print FileHelper.WriteFile("Hello", path)
Debug.Print FileHelper.GetFileSize(path)
Debug.Print FileHelper.AppendFile(" world", path)
Debug.Print FileHelper.GetFileSize(path)
Debug.Print FileHelper.FileExists(path)
Debug.Print FileHelper.DirectoryExists(folder)
Debug.Print FileHelper.DeleteFile(path)
Debug.Print FileHelper.FileExists(path)
RmDir folder
' Output:
' True
' 8
' True
' 14
' True
' True
' True
' False
```

The files that **WriteFile** and **AppendFile** write are UTF-8 with a byte-order mark (the bytes `EF BB BF` at the start). The text is converted with **StrConv** and the constant **vbUTF8**.

* TOC
{:toc}

## Paths

A path that is not absolute is taken as relative to the folder of the program, **App.Path**, and not to the current folder. [**GetFullPath**](#getfullpath) makes the full path, and the functions that open, test, read or delete a file call it first. [**EnsureDirectoryExists**](#ensuredirectoryexists) and the functions that take a path apart ([**GetDirectoryName**](#getdirectoryname), [**GetFileName**](#getfilename), [**GetFileNameWithoutExtension**](#getfilenamewithoutextension), [**GetExtension**](#getextension), [**IsAbsolutePath**](#isabsolutepath) and [**NormalizePath**](#normalizepath)) use the text as it is given.

<!-- test: FilePathTests.GetFullPath_RelativePath_StartsAtAppPath -->
```tb check_build check_run
Debug.Print FileHelper.GetFullPath("x.txt") = App.Path & "\x.txt"
Debug.Print FileHelper.GetFullPath("sub\..\x.txt") = App.Path & "\x.txt"
Debug.Print FileHelper.GetFullPath("C:\a\..\b\x.txt")
' Output:
' True
' True
' C:\b\x.txt
```
<!-- /test -->

## Methods

### AppendFile
{: .no_toc }

Adds text to the end of a file.

Syntax: **FileHelper.AppendFile** ( *content*, *filePath* ) **As Variant**

*content*
: *required* A **String**.

*filePath*
: *required* A **String**, the path of the file, absolute or relative to **App.Path**.

<!-- test: FileHelperTests.AppendFile_NewFile_WritesByteOrderMarkOnce, FileHelperTests.AppendFile_AfterWriteFile_AddsAfterTheContent -->
Creates the file if it does not exist, and the folder that holds it when only that last folder is missing (see [**EnsureDirectoryExists**](#ensuredirectoryexists)). The file is written in UTF-8. The byte-order mark is written only when the file is empty or new. The content goes after the last byte of the file.
<!-- /test -->

Returns **True**, or a **String** of the form `Error ` and the number, a colon, the description, and ` (File: ` and the path as the caller gave it, and `)`. The function raises no error.

### DeleteFile
{: .no_toc }

Deletes a file.

Syntax: **FileHelper.DeleteFile** ( *filePath* ) **As Boolean**

*filePath*
: *required* A **String**, the path of the file, absolute or relative to **App.Path**.

<!-- test: FileHelperTests.DeleteFile_ExistingFile_RemovesIt, FileHelperTests.DeleteFile_MissingFile_ReturnsFalse, FileHelperTests.DeleteFile_Wildcard_DeletesEveryMatch -->
Calls **Kill** and returns **True**. Returns **False** for any error, a file that does not exist included. The path may hold the wildcards `*` and `?` that **Kill** accepts, and then every file that matches is deleted.

```tb check_build check_run
Dim folder As String = Environ$("TEMP") & "\diag-wild"
FileHelper.EnsureDirectoryExists folder
FileHelper.WriteFile "a", folder & "\a.tmpd"
FileHelper.WriteFile "b", folder & "\b.tmpd"

Debug.Print FileHelper.DeleteFile(folder & "\*.tmpd")
Debug.Print FileHelper.FileExists(folder & "\a.tmpd") Or FileHelper.FileExists(folder & "\b.tmpd")
Debug.Print FileHelper.DeleteFile(folder & "\a.tmpd")
RmDir folder
' Output:
' True
' False
' False
```
<!-- /test -->

### DirectoryExists
{: .no_toc }

Tests whether a folder exists.

Syntax: **FileHelper.DirectoryExists** ( *dirPath* ) **As Boolean**

*dirPath*
: *required* A **String**, the path of the folder, absolute or relative to **App.Path**.

<!-- test: FileHelperTests.DirectoryExists_File_ReturnsFalse -->
Returns **True** when **GetAttr** succeeds and reports a folder. A file, or a path that does not exist, gives **False**.
<!-- /test -->

### EnsureDirectoryExists
{: .no_toc }

Creates a folder.

Syntax: **FileHelper.EnsureDirectoryExists** ( *path* )

*path*
: *required* A **String**, the path of the folder.

<!-- test: FileHelperTests.EnsureDirectoryExists_ExistingFolder_RaisesNoError -->
Removes one trailing backslash and calls **MkDir**. It ignores every error, so a folder that exists is not an error, and neither is a folder that cannot be created. **MkDir** creates the last level only. When the folder above it does not exist, nothing is created and no error is reported: [**WriteFile**](#writefile) then returns the error text of **Open**, which is `Error -2147467259: Unspecified error` and the path. VB6 raises error 76, *Path not found*, for the same **Open** statement.
<!-- /test -->

```tb check_build check_run
Dim root As String = Environ$("TEMP") & "\diag-new"
Dim result As Variant = FileHelper.WriteFile("x", root & "\sub\a.txt")
Debug.Print VarType(result) = vbString
Debug.Print Left$(result, InStr(result, " (File: ") - 1)
result = FileHelper.AppendFile("x", root & "\sub\a.txt")
Debug.Print Left$(result, InStr(result, " (File: ") - 1)
Debug.Print FileHelper.DirectoryExists(root)
' Output:
' True
' Error -2147467259: Unspecified error
' Error -2147467259: Unspecified error
' False
```

### FileExists
{: .no_toc }

Tests whether a file exists.

Syntax: **FileHelper.FileExists** ( *filePath* ) **As Boolean**

*filePath*
: *required* A **String**, the path of the file, absolute or relative to **App.Path**.

<!-- test: FileHelperTests.FileExists_Folder_ReturnsFalse -->
Returns **True** when **GetAttr** succeeds and the path is not a folder. A folder, or a path that does not exist, gives **False**.
<!-- /test -->

### GetDirectoryName
{: .no_toc }

Returns the folder part of a path.

Syntax: **FileHelper.GetDirectoryName** ( *path* ) **As String**

*path*
: *required* A **String**.

Removes the spaces at both ends and one trailing slash or backslash, and returns the text before the last backslash, or, when there is none, before the last slash. A path with no separator gives an empty string. The root of a drive is returned without its backslash: `C:\a\b.txt` gives `C:\a`, and `C:\a\` and `C:\a.txt` give `C:`.

### GetExtension
{: .no_toc }

Returns the extension of a file name.

Syntax: **FileHelper.GetExtension** ( *path* ) **As String**

*path*
: *required* A **String**.

Returns the part of the file name from its last period, with the period: `.gz` for `b.tar.gz`. An empty string when the name has no period. A name that starts with a period, such as `.gitignore`, is all extension.

### GetFileName
{: .no_toc }

Returns the file name of a path.

Syntax: **FileHelper.GetFileName** ( *path* ) **As String**

*path*
: *required* A **String**.

Removes the spaces at both ends and returns the text after the last backslash, or, when there is none, after the last slash. A path with no separator is returned as it is.

### GetFileNameWithoutExtension
{: .no_toc }

Returns the file name without its extension.

Syntax: **FileHelper.GetFileNameWithoutExtension** ( *path* ) **As String**

*path*
: *required* A **String**.

Returns the file name of *path* up to its last period: `b.tar` for `b.tar.gz`.

### GetFileSize
{: .no_toc }

Returns the size of a file in bytes.

Syntax: **FileHelper.GetFileSize** ( *filePath* ) **As LongLong**

*filePath*
: *required* A **String**, the path of the file, absolute or relative to **App.Path**.

<!-- test: FileHelperTests.GetFileSize_ExistingFile_ReturnsItsSize, FileHelperTests.GetFileSize_MissingFolder_ReturnsMinusOne -->
Opens the file in binary mode and returns the result of **LOF**. Returns -1 when an error occurs, such as a folder that does not exist. The function opens the file with `For Binary`, and that mode creates a file that does not exist, so a missing file in a folder that exists is not an error: it is created with no content and the function returns 0. See [Known problems](.#known-problems-in-version-1001).
<!-- /test -->

```tb check_build check_run
Dim path As String = Environ$("TEMP") & "\diag-missing.bin"
FileHelper.DeleteFile path
Debug.Print FileHelper.FileExists(path)
Debug.Print FileHelper.GetFileSize(path)
Debug.Print FileHelper.FileExists(path)
FileHelper.DeleteFile path
Debug.Print FileHelper.GetFileSize(Environ$("TEMP") & "\diag-no-folder\x.bin")
' Output:
' False
' 0
' True
' -1
```

### GetFullPath
{: .no_toc }

Returns the full path for a path.

Syntax: **FileHelper.GetFullPath** ( *path* ) **As String**

*path*
: *required* A **String**.

Removes the spaces at both ends. An empty path becomes `.\`. A path that [**IsAbsolutePath**](#isabsolutepath) rejects gets **App.Path** and a backslash in front. The result is then passed through [**NormalizePath**](#normalizepath).

### IsAbsolutePath
{: .no_toc }

Tests whether a path is absolute.

Syntax: **FileHelper.IsAbsolutePath** ( *path* ) **As Boolean**

*path*
: *required* A **String**.

Returns **True** when the second character, after the spaces at both ends are removed, is a colon, as in `C:\a`, or when the path starts with two backslashes, as in `\\server\share`. Any other path gives **False**, including `\a` (a path from the root of the current drive) and `//server/share` (with slashes).

### NormalizePath
{: .no_toc }

Cleans up the separators of a path.

Syntax: **FileHelper.NormalizePath** ( *path* ) **As String**

*path*
: *required* A **String**.

Changes every slash to a backslash and every run of backslashes to one. It then goes through the parts between the backslashes: it removes the spaces at both ends of a part, drops an empty part and a part `.`, and lets a part `..` remove the part before it. A `..` with nothing before it is dropped. The parts are joined with a backslash, and the result has no backslash at the start or at the end.

Because an empty first part is dropped, a path from the root, such as `\a\b`, loses its first backslash, and so does a UNC path: `\\server\share\f.txt` becomes `server\share\f.txt`, which is a relative path. [**GetFullPath**](#getfullpath) treats such a path as absolute and does not add **App.Path**, so a file in a UNC path is opened as the relative path `server\share\f.txt`. See [Known problems](.#known-problems-in-version-1001).

<!-- test: FilePathTests.NormalizePath_MixedSeparatorsAndDots_IsCleaned, FilePathTests.GetDirectoryName_ReturnsTheFolderPart, FilePathTests.FileNameFunctions_TakeTheNameApart, FilePathTests.IsAbsolutePath_TellsDriveAndUncPathsFromTheRest -->
```tb check_build check_run
Debug.Print FileHelper.NormalizePath("C:/a//b/./c/../d.txt")
Debug.Print FileHelper.GetDirectoryName("C:\a\b.txt")
Debug.Print FileHelper.GetDirectoryName("C:\a\")
Debug.Print FileHelper.GetFileName("C:\a\b.tar.gz")
Debug.Print FileHelper.GetFileNameWithoutExtension("C:\a\b.tar.gz")
Debug.Print FileHelper.GetExtension("C:\a\b.tar.gz")
Debug.Print FileHelper.IsAbsolutePath("C:\a") & " " & FileHelper.IsAbsolutePath("a\b")
Debug.Print FileHelper.NormalizePath("\\server\share\f.txt")
Debug.Print FileHelper.GetFullPath("\\server\share\f.txt")
' Output:
' C:\a\b\d.txt
' C:\a
' C:
' b.tar.gz
' b.tar
' .gz
' True False
' server\share\f.txt
' server\share\f.txt
```
<!-- /test -->

### ReadFile
{: .no_toc }

Reads a whole file as text.

Syntax: **FileHelper.ReadFile** ( *filePath* ) **As Variant**

*filePath*
: *required* A **String**, the path of the file, absolute or relative to **App.Path**.

<!-- test: FileHelperTests.ReadFile_EmptyFile_ReturnsEmptyString, FileHelperTests.ReadFile_MissingFolder_ReturnsErrorText -->
Returns the content of the file as a **String**, and an empty string for an empty file. When an error occurs, such as a folder that does not exist, it returns an error text in the form that [**AppendFile**](#appendfile) describes. A file that does not exist is not an error: it is created with no content, as for [**GetFileSize**](#getfilesize), and the function returns an empty string, so a missing file and an empty file look the same. See [Known problems](.#known-problems-in-version-1001).
<!-- /test -->

The function reads the bytes of the file into a string as characters, and does not decode UTF-8 or remove a byte-order mark. A file that [**WriteFile**](#writefile) wrote therefore starts with the three characters of its byte-order mark, and a character above 127 is several characters.

```tb check_build check_run
Dim path As String = Environ$("TEMP") & "\diag-readfile.txt"
FileHelper.DeleteFile path
FileHelper.WriteFile "caf" & ChrW$(233), path

Dim text As Variant = FileHelper.ReadFile(path)
Debug.Print VarType(text) = vbString
Debug.Print Len(text)
FileHelper.DeleteFile path

Debug.Print VarType(FileHelper.ReadFile(path)) = vbString
Debug.Print Len(FileHelper.ReadFile(path))
Debug.Print FileHelper.FileExists(path)
FileHelper.DeleteFile path
' Output:
' True
' 8
' True
' 0
' True
```

### WriteFile
{: .no_toc }

Writes text to a file.

Syntax: **FileHelper.WriteFile** ( *content*, *filePath* ) **As Variant**

*content*
: *required* A **String**.

*filePath*
: *required* A **String**, the path of the file, absolute or relative to **App.Path**.

<!-- test: FileHelperTests.WriteFile_MissingLastFolder_CreatesIt, FileHelperTests.WriteFile_Text_WritesByteOrderMarkAndUtf8, FileHelperTests.WriteFile_Failure_ReturnsTextAndRaisesNoError -->
Creates the file, and the folder that holds it when only that last folder is missing (see [**EnsureDirectoryExists**](#ensuredirectoryexists)). It writes the byte-order mark and then the text in UTF-8, from the start of the file. Returns **True**, or an error text as [**AppendFile**](#appendfile) describes.
<!-- /test -->

**WriteFile** opens the file in binary mode and does not shorten it. When the file exists and is longer than the new content, the bytes after the new content stay in the file. See [Known problems](.#known-problems-in-version-1001).

```tb check_build check_run
Dim path As String = Environ$("TEMP") & "\diag-writefile.txt"
FileHelper.DeleteFile path

FileHelper.WriteFile "0123456789", path
Debug.Print FileHelper.GetFileSize(path)
FileHelper.WriteFile "ab", path
Debug.Print FileHelper.GetFileSize(path)
FileHelper.DeleteFile path

Debug.Print FileHelper.WriteFile("", path)
Debug.Print FileHelper.GetFileSize(path)
FileHelper.DeleteFile path
' Output:
' 13
' 13
' True
' 3
```

<!-- test: FileHelperTests.WriteFile_EmptyString_WritesByteOrderMarkOnly -->
An empty string is not an error: the file holds the three bytes of the byte-order mark.
<!-- /test -->

## See Also

- [Formatters](Formatters) -- make the text that **WriteFile** saves
- [FormatterFactory](FormatterFactory) module -- **FormatResults** makes the text of a report
- [FormatHelper](FormatHelper) module -- the other helper functions of the package
