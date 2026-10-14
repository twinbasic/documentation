---
title: FileSystemTools
parent: tbFileSysTools Package
permalink: /tB/Packages/Contributed/tbFileSysTools/FileSystemTools
has_toc: false
---

# FileSystemTools module
{: .no_toc }

**FileSystemTools** is the standard module that holds the code of the **tbFileSysTools** package: path functions, file and folder operations, whole-file text and byte input and output, and the functions that return [**File**](File), [**Folder**](Folder), [**Drive**](Drive) and [**TextStream**](TextStream) objects. A project that references the package calls its procedures by name, with no object to create. The [**FileSystemObject**](FileSystemObject) class has the same procedures as members of a COM object, for code that was written for the Scripting Runtime.

```tb check_build check_run
Dim work As String
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work

Dim path As String
path = BuildPath(work, "notes.txt")

' Write a string as UTF-8 with a byte-order mark, then ask what the file holds.
StringToTextFile "caf" & ChrW$(233) & vbCrLf & "ok", path, encUtf8Bom
Debug.Print GetFileEncoding(path) = encUtf8Bom    ' True
Debug.Print GetFileLineEnding(path) = nlWindows   ' True
Debug.Print Len(TextFileToString(path))           ' 8

DeleteFolder work
```

The procedures, by purpose:

- Paths: [BuildPath](#buildpath), [CleanFileName](#cleanfilename), [GetAbsolutePathName](#getabsolutepathname), [GetBaseName](#getbasename), [GetDriveName](#getdrivename), [GetExtensionName](#getextensionname), [GetFileName](#getfilename), [GetParentFolderName](#getparentfoldername), [GetRelativePath](#getrelativepath), [GetTempName](#gettempname)
- Existence: [DriveExists](#driveexists), [FileExists](#fileexists), [FolderExists](#folderexists)
- Files and folders: [CopyFile](#copyfile), [CopyFolder](#copyfolder), [CreateFolder](#createfolder), [DeleteFile](#deletefile), [DeleteFolder](#deletefolder), [GetFilePaths](#getfilepaths), [MoveFile](#movefile), [MoveFolder](#movefolder), [Rename](#rename)
- Current directory and special folders: [GetCurrentDir](#getcurrentdir), [GetSpecialFolder](#getspecialfolder), [GetSpecialFolderPath](#getspecialfolderpath), [SetCurrentDir](#setcurrentdir)
- File information: [GetFileEncoding](#getfileencoding), [GetFileLineEnding](#getfilelineending), [GetFileType](#getfiletype), [GetFileVersion](#getfileversion), [IsFileLocked](#isfilelocked)
- Objects: [GetDrive](#getdrive), [GetDrives](#getdrives), [GetFile](#getfile), [GetFolder](#getfolder)
- Whole files: [ArrayToTextFile](#arraytotextfile), [MergeTextFiles](#mergetextfiles), [NormalizeTextFile](#normalizetextfile), [ReadStream](#readstream), [StringToTextFile](#stringtotextfile), [TextFileToArray](#textfiletoarray), [TextFileToString](#textfiletostring), [WriteStream](#writestream)
- Searching text: [FileContainsText](#filecontainstext), [FindInTextFiles](#findintextfiles)
- Text streams: [CreateTextFile](#createtextfile), [GetStandardStream](#getstandardstream), [OpenTextFile](#opentextfile)

The enumerations that the procedures take are described [at the end of the page](#enumerations): [TextEncoding](#textencoding), [NewlineType](#newlinetype), [IOMode](#iomode), [SpecialFolderConst](#specialfolderconst), [FileAttribute](#fileattribute), [FileVersionSource](#fileversionsource) and [StandardStreamTypes](#standardstreamtypes).

## Conventions

These rules apply to every procedure on the page. Each entry states only what departs from them.

**Paths.**

- A forward slash in a path is read as a backslash.
- A relative path is resolved against the current directory of the process, which [**GetCurrentDir**](#getcurrentdir) returns. A procedure that compares two paths, or uses one path more than once, resolves it first, so `a.txt` and `.\a.txt` name the same file to it.
- A path longer than 260 characters works in most procedures, among them [**CreateFolder**](#createfolder), [**FileExists**](#fileexists), [**StringToTextFile**](#stringtotextfile), [**TextFileToString**](#textfiletostring), [**CopyFile**](#copyfile), [**MoveFile**](#movefile), [**Rename**](#rename), [**DeleteFile**](#deletefile), [**DeleteFolder**](#deletefolder), [**GetFile**](#getfile) and [**GetFilePaths**](#getfilepaths). The Scripting Runtime does not accept such a path: its **FileExists** and **FolderExists** return **False** for it, **GetFile** raises error 53 and **OpenTextFile** raises error 76.
- These stop at the limit. [**GetFileVersion**](#getfileversion) returns an empty string, and [**File.ShortPath**](File#shortpath) returns the path as it is. [**SetCurrentDir**](#setcurrentdir) raises error 75. A path with a wildcard in it is not found: [**DeleteFile**](#deletefile) and [**CopyFile**](#copyfile) raise error 53 for `deep\*.dll`, where `deep` is a folder with a long path. [**Folder.Files**](Folder#files), [**Folder.SubFolders**](Folder#subfolders) and [**Folder.Size**](Folder#size) raise error 76 for a folder whose own path has 258 characters or more. [**GetRelativePath**](#getrelativepath) can return a wrong path.

```tb check_build check_run
Dim work As String
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work

' A folder 12 levels deep, with a path of more than 300 characters.
Dim deep As String, i As Long
deep = work
For i = 1 To 12
    deep = BuildPath(deep, String$(25, "d"))
Next
CreateFolder deep, True

Dim path As String
path = BuildPath(deep, "note.txt")
StringToTextFile "hello", path
Debug.Print Len(path) > 300      ' True
Debug.Print FileExists(path)     ' True
Debug.Print TextFileToString(path)   ' hello

DeleteFolder work
```

**Wildcards.** [**CopyFile**](#copyfile), [**CopyFolder**](#copyfolder), [**DeleteFile**](#deletefile), [**DeleteFolder**](#deletefolder), [**MoveFile**](#movefile) and [**MoveFolder**](#movefolder) accept `*` and `?` in the last component of the path that names what to act on. A wildcard in a destination is error 5. A pattern that matches nothing is an error, as described for each procedure. A failure part-way through a wildcard operation leaves the earlier matches changed; the sample under [**DeleteFile**](#deletefile) shows it.

> [!WARNING]
> Windows matches a pattern against the 8.3 short name of a file as well as against its name. On a volume that creates short names, `*.txt` also matches `a.txtx`, whose short name ends in `.TXT`. [**CopyFile**](#copyfile), [**DeleteFile**](#deletefile) and [**MoveFile**](#movefile) act on such a file, and the procedures for folders match the short names of folders in the same way. The Scripting Runtime does the same. [**GetFilePaths**](#getfilepaths) does not list such a file: it tests each name against the pattern again.

```tb check_build check_run
Dim work As String
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work
StringToTextFile "1", BuildPath(work, "a.txt")
StringToTextFile "2", BuildPath(work, "a.txtx")

' The 8.3 name of a.txtx is different from its name, and it ends in .TXT.
Debug.Print GetFile(BuildPath(work, "a.txtx")).ShortName <> "a.txtx"   ' True
Debug.Print GetFilePaths(work, "*.txt").Count                          ' 1
DeleteFile BuildPath(work, "*.txt")
Debug.Print GetFilePaths(work).Count                                   ' 0

DeleteFolder work
```

**Errors.** A procedure raises a run-time error with the number VB6 uses for the same failure. The error numbers, and the Windows failures that map to them, are in [Errors](./#errors), which also lists a few errors whose numbers are not the expected ones. **Err.Source** is the name of the operation, such as `CopyFile`, and **Err.Description** names the path; the errors of [**OpenTextFile**](#opentextfile) and its relatives have an empty **Err.Source** and only the standard text of the number.

**Encodings.** A text procedure takes a [**TextEncoding**](#textencoding) member. Its value is a Windows code page; a negative value is the same code page with a byte-order mark (BOM). On reading, **encAutoDetect** means: find the encoding from the first bytes of the file. On writing, **encAutoDetect** means **encUtf8**. A BOM that the file holds always decides the encoding on reading, whatever the argument says.

### Junctions and symbolic links
{: .no_toc }

A directory junction or symbolic link is a folder that stands for another folder. [**CopyFolder**](#copyfolder), [**DeleteFolder**](#deletefolder), [**GetFilePaths**](#getfilepaths) with *recursive*, [**FindInTextFiles**](#findintextfiles) with *recursive* and [**Folder.Size**](Folder#size) do not enter one:

- **CopyFolder** leaves the link out of the copy.
- **DeleteFolder** removes the link and leaves the folder it stands for, with its files, as it was.
- **GetFilePaths** lists no file below the link.
- **Size** counts each file once, where it is stored.

The link is still a member of the [**SubFolders**](Folder#subfolders) of its folder. The Scripting Runtime enters a link in all of these. It counts a target twice when the target is in the same tree, copies the files of the target into the copy under the name of the link, and deletes the files of the target.

The sample builds a tree with a link to one of its own folders, and a second tree with a link to a folder outside it. **DeleteFolder** of the second tree leaves the file in the outside folder.

```tb check_build check_run
Dim work As String, tree As String, sh As Object
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
tree = BuildPath(work, "tree")
CreateFolder BuildPath(tree, "sub"), True
StringToTextFile String$(500, "x"), BuildPath(tree, "file1.txt")
StringToTextFile String$(1000, "y"), BuildPath(tree, "sub\file2.txt")
Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c mklink /J """ & BuildPath(tree, "link") & """ """ & BuildPath(tree, "sub") & """ >nul", 0, True

Debug.Print GetFolder(tree).Size                                              ' 1500
Debug.Print CreateObject("Scripting.FileSystemObject").GetFolder(tree).Size   ' 2500
Debug.Print GetFilePaths(tree, , , , True).Count                              ' 2
Debug.Print GetFolder(tree).SubFolders.Count                                  ' 2
CopyFolder tree, BuildPath(work, "copy")
Debug.Print FolderExists(BuildPath(work, "copy\link"))                        ' False
Debug.Print FileExists(BuildPath(work, "copy\sub\file2.txt"))                 ' True

Dim target As String, tree2 As String
target = BuildPath(work, "target")
tree2 = BuildPath(work, "tree2")
CreateFolder target
CreateFolder tree2
StringToTextFile "keep me", BuildPath(target, "keep.txt")
sh.Run "cmd /c mklink /J """ & BuildPath(tree2, "link") & """ """ & target & """ >nul", 0, True
DeleteFolder tree2, True
Debug.Print FolderExists(tree2)                                               ' False
Debug.Print FolderExists(target)                                              ' True
Debug.Print FileExists(BuildPath(target, "keep.txt"))                         ' True

DeleteFolder work
```

## Paths

### BuildPath
{: .no_toc }

Joins a folder path and a name.

Syntax: **BuildPath** ( *path*, *name* ) **As String**

*path*
: *required* A **String** holding a folder path. It can be empty.

*name*
: *required* A **String** holding the name of a file or folder, or a relative path.

Returns *path* and *name* joined by one backslash. Nothing is read from the disk, and neither string has to name anything that exists.

- An empty *path* returns *name*, and an empty *name* returns *path*.
- A backslash that ends *path* or starts *name* is not doubled.
- A *path* that ends in a colon, a drive letter such as `C:`, is joined without a backslash: `BuildPath("C:", "foo")` returns `C:foo`, as the Scripting Runtime does.
- A forward slash in either argument becomes a backslash: `BuildPath("C:\a", "b/c")` returns `C:\a\b\c`. The Scripting Runtime returns `C:\a\b/c`.

### CleanFileName
{: .no_toc }

Removes from a file name the characters that Windows does not allow.

Syntax: **CleanFileName** ( *fileName* [, *replaceChar* ] ) **As String**

*fileName*
: *required* A **String** holding a file name. It is a name, not a path: the path separators are among the characters that are removed.

*replaceChar*
: *optional* A **String** that takes the place of each removed character. Default: an empty string, which deletes them.

Returns the name after these steps, in this order:

1. Each of the characters `\ / : * ? " < > |` and each control character (codes 0 to 31) is replaced by *replaceChar*.
2. Spaces and dots at the end, and spaces at the start, are removed. This includes any that *replaceChar* put there. Dots at the start stay.
3. If the part of the name before its first dot is a reserved device name (**CON**, **PRN**, **AUX**, **NUL**, **COM0** to **COM9** and **LPT0** to **LPT9**, in any letter case, trailing spaces ignored), *replaceChar* is added to that part, or an underscore when *replaceChar* is empty. Windows treats such a name as a device even with an extension.

The length of the name is not checked.

```tb check_build check_run
Debug.Print CleanFileName("report: Q1/Q2?.txt")        ' report Q1Q2.txt
Debug.Print CleanFileName("report: Q1/Q2?.txt", "_")   ' report_ Q1_Q2_.txt
Debug.Print CleanFileName("NUL.txt")                   ' NUL_.txt
Debug.Print CleanFileName("notes. ")                   ' notes
Debug.Print CleanFileName("com3")                      ' com3_
Debug.Print CleanFileName("CON ")                      ' CON_
Debug.Print CleanFileName("Aux.tar.gz", "-")           ' Aux-.tar.gz
Debug.Print CleanFileName(".gitignore")                ' .gitignore
```

### GetAbsolutePathName
{: .no_toc }

Returns the full path for a path specification.

Syntax: **GetAbsolutePathName** ( *path* [, *baseDirectory* ] ) **As String**

*path*
: *required* A **String** holding an absolute or relative path. The path does not have to exist.

*baseDirectory*
: *optional* A **String** holding the folder against which a relative *path* is resolved. Default: an empty string, which means the current directory. An absolute *path* ignores it. A *path* of the form `C:name` (a drive without a backslash) uses it only when *baseDirectory* is on the same drive.

Returns the path with `.` and `..` resolved and forward slashes turned into backslashes. The work is done on the text, and the disk is not read. A backslash at the end is removed, except for a drive root, which keeps it and gets an uppercase drive letter: `c:\` becomes `C:\`. The rest of the path keeps the letter case it was given. A path that starts with two backslashes names a network share, and `..` cannot climb above the share: `\\srv\sh\..\x` is `\\srv\sh\x`. The network is not contacted.

Raises error 52 when Windows cannot form a full path from the text. An empty string is such a case: `GetAbsolutePathName("")` raises error 52, where the Scripting Runtime returns the current directory. `GetAbsolutePathName(".")` returns the current directory in both.

```tb check_build check_run
Debug.Print GetAbsolutePathName("a\..\b", "C:\base")        ' C:\base\b
Debug.Print GetAbsolutePathName("..\x", "C:\base\sub")      ' C:\base\x
Debug.Print GetAbsolutePathName("\x", "D:\base\deep")       ' D:\x
Debug.Print GetAbsolutePathName("C:name", "C:\base")        ' C:\base\name
Debug.Print GetAbsolutePathName("c:\")                      ' C:\
Debug.Print GetAbsolutePathName("C:\Temp\")                 ' C:\Temp
Debug.Print GetAbsolutePathName("C:/a/./b/../c")            ' C:\a\c
Debug.Print GetAbsolutePathName("C:\a\..\..")               ' C:\
Debug.Print GetAbsolutePathName("\\srv\sh\f\..\g")          ' \\srv\sh\g
Debug.Print GetAbsolutePathName("\\srv\sh\..\..\x")         ' \\srv\sh\x
Debug.Print GetAbsolutePathName("..\x", "\\srv\sh\dir")     ' \\srv\sh\x
Debug.Print GetAbsolutePathName("C:\x", "D:\base")          ' C:\x
```

### GetBaseName
{: .no_toc }

Returns the name of the last component of a path, without its extension.

Syntax: **GetBaseName** ( *path* ) **As String**

*path*
: *required* A **String** holding a path. It does not have to exist.

The extension is what follows the last dot of the name. A name without a dot is returned whole, and a name that starts with its only dot has an empty base name: `GetBaseName("C:\work\.gitignore")` returns an empty string, and [**GetExtensionName**](#getextensionname) returns `gitignore`. The work is done on the text.

### GetDriveName
{: .no_toc }

Returns the drive part of a path.

Syntax: **GetDriveName** ( *path* ) **As String**

*path*
: *required* A **String** holding a path.

Returns a drive letter and a colon, `C:`, for a path that starts with one, and `\\server\share` for a network path. Neither has a trailing backslash. Returns an empty string for any other path, and for a network path that names a server but no share.

### GetExtensionName
{: .no_toc }

Returns the extension of the last component of a path.

Syntax: **GetExtensionName** ( *path* ) **As String**

*path*
: *required* A **String** holding a path.

Returns what follows the last dot of the name, without the dot, or an empty string when the name has no dot. See [**GetBaseName**](#getbasename).

### GetFileName
{: .no_toc }

Returns the last component of a path.

Syntax: **GetFileName** ( *path* ) **As String**

*path*
: *required* A **String** holding a path.

Returns the name after the last backslash. Separators at the end of the path are ignored: `C:\work\data\` returns `data`. The drive part is dropped: `C:name` returns `name`. A drive root, `C:\`, and a network root, `\\server` or `\\server\share`, return an empty string. The work is done on the text.

### GetParentFolderName
{: .no_toc }

Returns the path of the folder that holds the last component of a path.

Syntax: **GetParentFolderName** ( *path* ) **As String**

*path*
: *required* A **String** holding a path.

Returns the text before the last separator. The parent of a folder directly under a drive root is the root, with its backslash: `C:\work` returns `C:\`. Returns an empty string for a name with no separator, for a drive root, and for a network root (`\\server` or `\\server\share`). The work is done on the text.

```tb check_build check_run
Dim p As String
p = "C:\Projects\App\docs\readme.final.txt"
Debug.Print GetFileName(p)                      ' readme.final.txt
Debug.Print GetBaseName(p)                      ' readme.final
Debug.Print GetExtensionName(p)                 ' txt
Debug.Print GetParentFolderName(p)              ' C:\Projects\App\docs
Debug.Print GetDriveName(p)                     ' C:
Debug.Print BuildPath("C:\Projects", "App")     ' C:\Projects\App
Debug.Print BuildPath("C:\Projects\", "\App")   ' C:\Projects\App
```

Roots and names without a folder:

```tb check_build check_run
Debug.Print GetFileName("C:\work\data\")               ' data
Debug.Print GetFileName("C:name")                      ' name
Debug.Print GetFileName("C:\") = ""                    ' True
Debug.Print GetFileName("\\server\share") = ""         ' True
Debug.Print GetParentFolderName("C:\work")             ' C:\
Debug.Print GetParentFolderName("C:\") = ""            ' True
Debug.Print GetParentFolderName("\\srv\sh\dir")        ' \\srv\sh
Debug.Print GetParentFolderName("\\srv\sh") = ""       ' True
Debug.Print GetDriveName("\\srv\sh\x")                 ' \\srv\sh
Debug.Print GetDriveName("\\srv") = ""                 ' True
Debug.Print GetBaseName("C:\work\.gitignore") = ""     ' True
Debug.Print GetExtensionName("C:\work\.gitignore")     ' gitignore
```

### GetRelativePath
{: .no_toc }

Returns the path that leads from one path to another.

Syntax: **GetRelativePath** ( *basePath*, *targetPath* [, *basePathIsFolder* [, *trimLeadingDotSlash* ] ] ) **As String**

*basePath*
: *required* A **String** holding the path to start from.

*targetPath*
: *required* A **String** holding the path to reach.

*basePathIsFolder*
: *optional* A **Boolean**. **True** (default) treats *basePath* as a folder. **False** treats it as a file when it exists as one, and the relative path starts from the folder that holds it. A *basePath* that does not exist is treated as a file when this is **False**.

*trimLeadingDotSlash*
: *optional* A **Boolean**. Windows starts a path that goes down with `.\`. **True** (default) removes it, so the result is `src` and not `.\src`. **False** keeps it.

Both paths are first made absolute with [**GetAbsolutePathName**](#getabsolutepathname). A *targetPath* that exists as a folder is treated as one; any other, one that does not exist included, is treated as a file. So `GetRelativePath("C:\a", "C:\a")` returns `..\a` when the folder `C:\a` does not exist.

Returns the absolute *targetPath* when there is no relative path, for example when the two paths are on different drives, and when only *targetPath* is longer than 260 characters.

> [!WARNING]
> In version 1.9.0.0, when *basePath* is 260 characters or longer, the result can be a relative path that leads to the wrong place, and no error is raised. For a target `x\y.txt` below such a base, the result starts with `..\` and the last name of the base, instead of being `x\y.txt`. A base path of 258 characters or fewer gives the right result.

```tb check_build check_run
Debug.Print GetRelativePath("C:\Projects\App", "C:\Projects\Lib\core.txt")   ' ..\Lib\core.txt
Debug.Print GetRelativePath("C:\Projects\App", "C:\Projects\App\src")        ' src
Debug.Print GetRelativePath("C:\Projects\App", "D:\Data")                    ' D:\Data
Debug.Print GetRelativePath("C:\a\b", "C:\a\b\c\d.txt", True, False)         ' .\c\d.txt
Debug.Print GetRelativePath("C:\a\b\f.txt", "C:\a\c.txt", False)             ' ..\c.txt

' The same relative path below a short base and below a base of 264 characters.
Dim shortBase As String, longBase As String
shortBase = "C:\" & String$(100, "a")
longBase = "C:\" & String$(130, "a") & "\" & String$(130, "b")
Debug.Print GetRelativePath(shortBase, shortBase & "\x\y.txt")           ' x\y.txt
Debug.Print GetRelativePath(longBase, longBase & "\x\y.txt") = "x\y.txt"   ' False
```

### GetTempName
{: .no_toc }

Returns a random name for a temporary file or folder.

Syntax: **GetTempName** ( [ *prefix* [, *extension* [, *inFolder* ] ] ] ) **As String**

*prefix*
: *optional* A **String** put before the random part. Default: an empty string.

*extension*
: *optional* A **String** put after the random part, with its dot. Default: `.tmp`. An empty string gives a name without an extension.

*inFolder*
: *optional* A **String** naming a folder. The name returned does not exist in that folder at the time of the call. Default: an empty string, which does not check.

Returns *prefix*, eight random uppercase letters and digits, and *extension*: with the defaults, twelve characters such as `K3F9Q2ZA.tmp`. The Scripting Runtime returns `rad` and five hexadecimal digits, such as `rad15093.tmp`. The result is a name, not a path, and nothing is created. The check against *inFolder* does not reserve the name, which another process can take before the caller creates it.

## Existence

### DriveExists
{: .no_toc }

Returns whether a drive exists.

Syntax: **DriveExists** ( *drivePath* ) **As Boolean**

*drivePath*
: *required* A **String** that starts with a drive letter: `C`, `C:`, `C:\` or a longer path on that drive.

Returns **True** when Windows has a drive with that letter. Returns **False** for a letter that is not in use, for any string that is not of one of those forms, and for a network path, which is not a lettered drive.

### FileExists
{: .no_toc }

Returns whether a file exists.

Syntax: **FileExists** ( *filePath* ) **As Boolean**

*filePath*
: *required* A **String** holding a path.

Returns **True** when the path exists and is not a folder. Hidden and system files count. Returns **False** for an empty string, for a folder, and for a path that holds a wildcard.

### FolderExists
{: .no_toc }

Returns whether a folder exists.

Syntax: **FolderExists** ( *folderPath* ) **As Boolean**

*folderPath*
: *required* A **String** holding a path.

Returns **True** when the path exists and is a folder, a drive root included. Returns **False** for a file.

## Files and folders

### CopyFile
{: .no_toc }

Copies one or more files.

Syntax: **CopyFile** ( *source*, *destination* [, *overwrite* ] )

*source*
: *required* A **String** naming the file to copy. The last component can hold the wildcards `*` and `?`, which match files only.

*destination*
: *required* A **String** naming the new file, or a folder. An existing folder, or a path that ends in a backslash, is a folder: the copy keeps the name of the source. A wildcard in *destination* is error 5.

*overwrite*
: *optional* A **Boolean**. **True** (default) replaces an existing file. **False** raises error 58 when the destination file exists.

With a wildcard in *source*, the destination is a folder that must already exist, and each matching file is copied into it. The parent folder of a single destination file must exist too. A destination that is an existing folder gets the copy with or without a backslash at the end. The Scripting Runtime raises error 70 when the folder has no backslash.

Errors:

- 53 when the source file does not exist, or a wildcard matches no file (a pattern that matches only folders counts as no match).
- 76 when the folder of *destination* does not exist.
- 58 when the destination file exists and *overwrite* is **False**.
- 70 when Windows refuses: a destination file that is read-only, and a *source* that is a folder.
- 52 when the name of the destination file holds a character that Windows does not allow, or is a reserved device name such as `nul`.

Copying a file onto itself does nothing and raises no error when *overwrite* is **True**, and is error 58 when it is **False**.

The Scripting Runtime raises the same numbers for a missing source, an existing destination with *overwrite* **False**, and a read-only destination.

```tb check_build check_run
Dim work As String
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder BuildPath(work, "backup"), True
StringToTextFile "a", BuildPath(work, "a.txt")
StringToTextFile "b", BuildPath(work, "b.txt")
StringToTextFile "c", BuildPath(work, "c.log")

CopyFile BuildPath(work, "*.txt"), BuildPath(work, "backup")
Debug.Print GetFilePaths(BuildPath(work, "backup")).Count   ' 2
DeleteFile BuildPath(work, "*.txt")
Debug.Print GetFilePaths(work).Count                        ' 1
DeleteFile BuildPath(work, "*.txt"), ignoreMissing:=True    ' nothing matches: no error

DeleteFolder work
```

### CopyFolder
{: .no_toc }

Copies a folder and everything in it.

Syntax: **CopyFolder** ( *source*, *destination* [, *overwrite* ] )

*source*
: *required* A **String** naming the folder to copy. The last component can hold the wildcards `*` and `?`, which match folders only.

*destination*
: *required* A **String** naming a folder. A wildcard in it is error 5.

*overwrite*
: *optional* A **Boolean**. **True** (default) replaces files that already exist in the destination. **False** raises error 58 at the first file that exists, and the files copied before it stay.

When *destination* is an existing folder, the source is copied into it, as a subfolder with the name of the source, whether or not *destination* ends in a backslash. Otherwise *destination* is the new folder, and its parent must exist. Subfolders that already exist in the destination are merged. With a wildcard in *source*, *destination* must be an existing folder, and each matching folder is copied into it.

The Scripting Runtime does this only when *destination* ends in a backslash. Without one, it copies the contents of the source straight into the existing folder: `CopyFolder "src", "dst"` puts `f1.txt` in `dst` with the Scripting Runtime, and in `dst\src` here.

Errors:

- 76 when the source folder, a wildcard match, or the parent of the new folder does not exist.
- 5 when *destination* is the source or lies inside it, which would copy the folder into itself.
- 58 when a file exists and *overwrite* is **False**.

> [!NOTE]
> A directory junction or symbolic link inside the source is left out of the copy: the copy has no folder of that name, and nothing from the folder the link stands for. The Scripting Runtime copies the files of the target into the copy under the name of the link. See [Junctions and symbolic links](#junctions-and-symbolic-links).

### CreateFolder
{: .no_toc }

Creates a folder.

Syntax: **CreateFolder** ( *folderPath* [, *createIntermediates* ] ) **As Folder**

*folderPath*
: *required* A **String** naming the folder to create.

*createIntermediates*
: *optional* A **Boolean**. **False** (default) creates only the last folder, so its parent must exist. **True** also creates the missing folders above it.

Returns the new [**Folder**](Folder).

Errors:

- 58 when a folder, or a file, with that path exists.
- 76 when the parent does not exist and *createIntermediates* is **False**.
- 52 when the last component holds a character that is not allowed in a name, the wildcards `*` and `?` among them.
- 75 when the last component is a reserved device name such as `con` or `nul` (the message ends with the Windows code 87).

```tb check_build check_run
Dim work As String
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work

On Error Resume Next
CreateFolder work              ' the folder exists now
Debug.Print Err.Number         ' 58
Err.Clear
CreateFolder BuildPath(work, "a\b\c")   ' the folders above are missing
Debug.Print Err.Number         ' 76
Err.Clear
On Error GoTo 0

CreateFolder BuildPath(work, "a\b\c"), True
Debug.Print FolderExists(BuildPath(work, "a\b"))   ' True

DeleteFolder work
```

### DeleteFile
{: .no_toc }

Deletes one or more files.

Syntax: **DeleteFile** ( *filePath* [, *force* [, *ignoreMissing* ] ] )

*filePath*
: *required* A **String** naming the file to delete. The last component can hold the wildcards `*` and `?`, which match files only.

*force*
: *optional* A **Boolean**. **True** clears the read-only, hidden and system attributes of a file before deleting it. **False** (default) leaves them, and a read-only file cannot be deleted.

*ignoreMissing*
: *optional* A **Boolean**. **True** does nothing when the path or the pattern matches no file. **False** (default) raises error 53.

A path that names a folder is error 53, whatever *ignoreMissing* is. A failure on one file of a wildcard stops the deletion, and the files before it stay deleted.

Errors: 53 when no file matches, a folder is named, or the folder of the path does not exist; 70 for a read-only file without *force*. The Scripting Runtime raises 53 and 70 in these cases too.

```tb check_build check_run
Dim work As String
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work
StringToTextFile "a", BuildPath(work, "a.txt")
StringToTextFile "b", BuildPath(work, "b.txt")
StringToTextFile "c", BuildPath(work, "c.txt")
SetAttr BuildPath(work, "b.txt"), vbReadOnly

On Error Resume Next
DeleteFile BuildPath(work, "*.txt")             ' stops at the read-only file
Debug.Print Err.Number                          ' 70
Err.Clear
On Error GoTo 0
Debug.Print FileExists(BuildPath(work, "a.txt"))   ' False
Debug.Print FileExists(BuildPath(work, "c.txt"))   ' True

DeleteFile BuildPath(work, "*.txt"), force:=True
Debug.Print GetFilePaths(work).Count            ' 0
DeleteFolder work
```

### DeleteFolder
{: .no_toc }

Deletes a folder and everything in it.

Syntax: **DeleteFolder** ( *folderPath* [, *force* [, *ignoreMissing* ] ] )

*folderPath*
: *required* A **String** naming the folder to delete. The last component can hold the wildcards `*` and `?`, which match folders only.

*force*
: *optional* A **Boolean**. **True** clears the read-only, hidden and system attributes as the contents are deleted. **False** (default) leaves them, and a read-only file stops the folder from being removed.

*ignoreMissing*
: *optional* A **Boolean**. **True** does nothing when the path or the pattern matches no folder. **False** (default) raises error 76.

The contents are deleted first, and an item that cannot be deleted is skipped without an error. The folder itself is removed last; when it is not empty by then, the failure is reported.

Errors: 76 when no folder matches or a file is named; 70 when the folder is not empty because something in it could not be deleted, such as a read-only file when *force* is **False**. The folder and that file stay. The Scripting Runtime raises error 70 in that case too.

> [!NOTE]
> A directory junction or symbolic link inside the folder is removed, and the folder it stands for keeps its files. The Scripting Runtime deletes the files in the target as well, so a tree that holds a link to a folder outside it loses the contents of that folder there. See [Junctions and symbolic links](#junctions-and-symbolic-links).

### GetFilePaths
{: .no_toc }

Returns the paths of the files in a folder.

Syntax: **GetFilePaths** ( *folderPath* [, *pattern* [, *includeHidden* [, *includeSystem* [, *recursive* ] ] ] ] ) **As Collection**

*folderPath*
: *required* A **String** naming the folder.

*pattern*
: *optional* A **String**, a file name that can hold the wildcards `*` and `?`. Default: `*`. The pattern applies to the files of every folder that is searched, and not to the folders.

*includeHidden*
: *optional* A **Boolean**. **True** includes hidden files. Default: **False**.

*includeSystem*
: *optional* A **Boolean**. **True** includes system files. Default: **False**. A file that is both hidden and system needs both.

*recursive*
: *optional* A **Boolean**. **True** also searches the subfolders, to any depth. Default: **False**.

Returns a **Collection** of **String** values, the full path of each file, starting at item 1. Folders are not in it. The order is the one in which Windows lists the folder. An empty result is an empty **Collection**. Hidden and system subfolders are searched only when *includeHidden* and *includeSystem* allow them.

Raises error 76 when *folderPath* is not a folder, and error 70 when a folder cannot be read. A junction or symbolic link in the tree is not entered, so no file below it is listed; see [Junctions and symbolic links](#junctions-and-symbolic-links). The pattern is tested against the name of each file and not against its 8.3 short name, which Windows would also match; see the warning on wildcards under [Conventions](#conventions).

Unlike [**Folder.Files**](Folder#files), the result leaves out hidden and system files unless they are asked for.

```tb check_build check_run
Dim work As String
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder BuildPath(work, "sub"), True
StringToTextFile "a", BuildPath(work, "a.txt")
StringToTextFile "b", BuildPath(work, "sub\b.txt")
StringToTextFile "c", BuildPath(work, "sub\c.md")

Debug.Print GetFilePaths(work, "*.txt").Count                    ' 1
Debug.Print GetFilePaths(work, "*.txt", recursive:=True).Count   ' 2

' A hidden file is left out unless it is asked for.
GetFile(BuildPath(work, "a.txt")).SetAttribute faHidden, True
Debug.Print GetFilePaths(work, "*.txt").Count                    ' 0
Debug.Print GetFilePaths(work, "*.txt", includeHidden:=True).Count   ' 1
Debug.Print GetFolder(work).Files.Count                          ' 1

DeleteFolder work
```

### MoveFile
{: .no_toc }

Moves one or more files.

Syntax: **MoveFile** ( *source*, *destination* ) **As String**

*source*
: *required* A **String** naming the file to move. The last component can hold the wildcards `*` and `?`, which match files only.

*destination*
: *required* A **String**. An existing folder, or a path that ends in a backslash, is a folder: the file keeps its name in it. Any other path is the new full name of the file. A wildcard in it is error 5.

Returns the full path of the moved file. With a wildcard in *source*, it returns the full path of the destination folder, which must already exist.

A file is never replaced: when the destination file exists, error 58 is raised. A destination that is an existing folder gets the file with or without a backslash at the end. The Scripting Runtime raises error 58 when the folder has no backslash.

Moving a file onto itself does nothing and returns its path, except that error 70 is raised when the file is in use. A change of letter case alone is also a move onto itself, so it changes nothing; use [**Rename**](#rename) for it.

Errors: 53 when a wildcard matches no file, or matches only folders; 76 when the destination folder of a wildcard move does not exist; 58 when the destination file exists; 52 when the name of the destination holds a character that Windows does not allow; 75 when it is a reserved device name such as `con` (the message ends with the Windows code 87).

> [!NOTE]
> A *source* without a wildcard that names a folder is moved too, with no error: `MoveFile "C:\old", "C:\new"` renames the folder. The Scripting Runtime raises error 53.

### MoveFolder
{: .no_toc }

Moves one or more folders.

Syntax: **MoveFolder** ( *source*, *destination* ) **As String**

*source*
: *required* A **String** naming the folder to move. The last component can hold the wildcards `*` and `?`, which match folders only.

*destination*
: *required* A **String**. An existing folder, or a path that ends in a backslash, is a folder: the source is moved into it and keeps its name. Any other path is the new full name of the folder. A wildcard in it is error 5.

Returns the full path of the moved folder, or the full path of the destination folder when *source* holds a wildcard.

A destination that is an existing folder gets the source with or without a backslash at the end. The Scripting Runtime raises error 58 when the folder has no backslash.

Errors: 76 when *source* names no folder, or a wildcard matches no folder; 5 for a wildcard in *destination*.

### Rename
{: .no_toc }

Renames a file or a folder in place.

Syntax: **Rename** ( *source*, *newName* ) **As String**

*source*
: *required* A **String** naming the file or folder.

*newName*
: *required* A **String**, a bare name or a path that resolves to the folder that holds *source*. Wildcards are not allowed.

Returns the full path of the renamed item.

*newName* cannot move the item to another folder. A change of letter case alone is allowed.

Errors: 53 when *source* does not exist (for a folder as well as a file); 58 when *newName* is the name of another item in that folder; 52 when *newName* holds a character that Windows does not allow; 5 for a wildcard, for a *newName* that leads to another folder, and for a reserved device name such as `con`.

```tb check_build check_run
Dim work As String
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work
StringToTextFile "x", BuildPath(work, "old.txt")

Dim newPath As String
newPath = Rename(BuildPath(work, "old.txt"), "new.txt")
Debug.Print GetFileName(newPath)                     ' new.txt
Debug.Print FileExists(BuildPath(work, "old.txt"))   ' False

DeleteFolder work
```

## Current directory and special folders

### GetCurrentDir
{: .no_toc }

Returns the current directory of the process.

Syntax: **GetCurrentDir** ( ) **As String**

Returns the path without a trailing backslash, except for a drive root (`C:\`). It is the folder against which a relative path is resolved. After [**ChDir**](../../../Modules/FileSystem/ChDir), **GetCurrentDir** returns the new directory; after [**SetCurrentDir**](#setcurrentdir), **CurDir$** does.

### GetSpecialFolder
{: .no_toc }

Returns a [**Folder**](Folder) object for a well-known Windows folder.

Syntax: **GetSpecialFolder** ( *specialFolder* ) **As Folder**

*specialFolder*
: *required* A [**SpecialFolderConst**](#specialfolderconst) member.

Returns the object for the folder that [**GetSpecialFolderPath**](#getspecialfolderpath) names, as the Scripting Runtime does. The default member of a **Folder** is [**Path**](Folder#path), so the result can stand where a path is wanted: `s = GetSpecialFolder(sfDesktop)` and `BuildPath(GetSpecialFolder(sfDesktop), "list.txt")` both use the path. To get the path as a **String** explicitly, or the path of a folder that does not exist, call [**GetSpecialFolderPath**](#getspecialfolderpath). The **Path** of the object has the letter case that the file system stores for the last name of the folder, so it can differ from the result of **GetSpecialFolderPath**: `C:\Windows` against `C:\WINDOWS`.

Errors: 76 when the folder does not exist on this system, and for **sfTemporaryFolder** when the `TEMP` environment variable is empty or not set; 5 for a value that is not a member, and the others of [**GetSpecialFolderPath**](#getspecialfolderpath).

```tb check_build check_run
Dim f As Folder
Set f = GetSpecialFolder(sfLocalAppData)
Debug.Print f.Name                                                                         ' Local
Debug.Print f.ParentFolder.Name                                                            ' AppData
Debug.Print StrComp(GetSpecialFolder(sfWindowsFolder), Environ$("windir"), vbTextCompare) ' 0
Debug.Print GetSpecialFolder(TemporaryFolder).Name = GetFolder(Environ$("TEMP")).Name      ' True
```

### GetSpecialFolderPath
{: .no_toc }

Returns the path of a well-known Windows folder as a **String**.

Syntax: **GetSpecialFolderPath** ( *specialFolder* ) **As String**

*specialFolder*
: *required* A [**SpecialFolderConst**](#specialfolderconst) member.

Returns the path without a trailing backslash. The folder does not have to exist: the procedure does not look at the disk. **sfTemporaryFolder** (and its FSO name **TemporaryFolder**) returns the value of the `TEMP` environment variable; every other member is asked from Windows by its known-folder identifier. On Windows XP, which has no such identifiers, the older CSIDL numbers are used, and **sfDownloads** and **sfPublicDownloads**, which have none, raise error 5. Raises error 5 for a value that is not a member. A program built for 32 bits gets the `Program Files (x86)` folder for both **sfProgramFiles** and **sfProgramFilesX86**, and the `System32` path for **sfSystemFolder**; **sfSystemX86Folder** is `SysWOW64`. The letter case of the result is that of Windows, and can differ from that of the Scripting Runtime: `C:\WINDOWS` against `C:\Windows`.

```tb check_build check_run
Debug.Print StrComp(GetSpecialFolderPath(sfWindowsFolder), Environ$("windir"), vbTextCompare)   ' 0
Debug.Print GetSpecialFolderPath(TemporaryFolder) = Environ$("TEMP")                           ' True
Debug.Print FolderExists(GetSpecialFolderPath(sfLocalAppData))                                 ' True
Debug.Print Right$(GetSpecialFolderPath(sfLocalAppData), 1) <> "\"                             ' True
```

### SetCurrentDir
{: .no_toc }

Sets the current directory of the process.

Syntax: **SetCurrentDir** ( *folderPath* )

*folderPath*
: *required* A **String** naming an existing folder. Windows limits the path to 260 characters here.

Relative paths given to the procedures of the package, and to the file statements of VBA, are resolved against the new directory: after `SetCurrentDir work`, `Open "x.txt" For Output` creates the file in `work`.

Errors: 53 when the folder does not exist, 76 when the path names a file, and 75 when the path is longer than 260 characters.

## File information

### GetFileEncoding
{: .no_toc }

Returns the text encoding of a file.

Syntax: **GetFileEncoding** ( *filePath* ) **As TextEncoding**

*filePath*
: *required* A **String** naming the file.

Returns a [**TextEncoding**](#textencoding) member. A negative value means that the file starts with a BOM. A file that is empty, or looks like binary data, returns **encUnknown**. Only the first 32,768 bytes of the file, the sample, are examined, and the decision is taken in this order:

1. A BOM at the start: UTF-8, UTF-16, UTF-32 (little or big endian), GB18030 and UTF-7 each have one.
2. The signature of a known binary format at the start of a file of 16 bytes or more: **encUnknown**. The formats are OLE compound documents (`.doc`, `.xls`, `.ppt`, `.msi`), SQLite databases, ZIP archives and the formats built on them (`.docx`, `.xlsx`, `.jar`), PDF, JPEG, PNG, GIF, TIFF, BMP, MP4 and the related QuickTime and HEIC files, RIFF files (AVI, WAV, WebP), GZIP, 7-Zip, RAR, ELF, icons and cursors, ASF (`.wmv`, `.wma`), MPEG-1 program streams, and twinBASIC projects and packages (`.twinproj`, `.twinpack`). The bytes are tested, and not the extension. A text file that begins with the same letters, such as `%PDF` or `RIFF`, gets the same answer.
3. UTF-8, when the sample is valid UTF-8 and the first 256 bytes do not look like binary data (see below). Plain ASCII is valid UTF-8, so it is reported as **encUtf8**. A multi-byte sequence that the end of the sample cuts in two is left out of the test.
4. UTF-32, when the length of the file is a multiple of 4 and, in the first 1,024 bytes, the units of four bytes whose two upper bytes are zero (little endian) outnumber those whose two lower bytes are zero (big endian), or the reverse, by more than 70% of all the units.
5. UTF-16, when the length of the file is even, the sample looks like binary data, and read as UTF-16 it looks like text: no more than 1 code unit in 10,000 is an unpaired surrogate, a control character other than whitespace, or a noncharacter. The byte order is big endian when the second bytes of the units vary more than the first bytes, and little endian otherwise.
6. Binary data: **encUnknown**, when the sample looks like binary data.
7. Otherwise, **encSystemAnsi**.

A sample looks like binary data when it holds a zero byte, or more than 2% control characters other than tab, line feed, carriage return and form feed. The second test is made only for a sample of 64 bytes or more, and a zero byte that is the last byte of the file does not count.

The result is an estimate, as every guess about the encoding of a text file is. A file in UTF-16, UTF-32 or UTF-8, with or without a BOM, is found right; so is a Latin-1 file when the system code page is Latin-1. A short file gives little evidence: UTF-16 text with no zero byte, such as eight Japanese characters with no line ending, is reported as **encSystemAnsi**, and a few bytes of binary data can be reported as UTF-16. Text in another code page without a BOM is not found: GB18030 text with an accented letter is reported as **encSystemAnsi**, and UTF-7 or Big5 text that is pure ASCII as **encUtf8**. A sample that ends in the first byte of a multi-byte sequence is judged without that byte, so a Latin-1 file whose only accented letter is its last byte is reported as **encUtf8**, and so is a Latin-1 file whose accented letter comes after the first 32,768 bytes. Pass the encoding to the procedure that reads the file when it is known.

Raises error 53 when the file does not exist; see [Errors](./#errors).

```tb check_build check_run
Dim work As String, path As String, b() As Byte
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work
path = BuildPath(work, "t.txt")

StringToTextFile "", path
Debug.Print GetFileEncoding(path) = encUnknown          ' True
StringToTextFile "Hello", path
Debug.Print GetFileEncoding(path) = encUtf8             ' True
StringToTextFile "Hello", path, encUtf16Be
Debug.Print GetFileEncoding(path) = encUtf16Be          ' True
StringToTextFile "Hello", path, encUtf16Bom
Debug.Print GetFileEncoding(path) = encUtf16Bom         ' True
StringToTextFile "Caf" & ChrW$(233) & " au lait", path, encLatin1
Debug.Print GetFileEncoding(path) = encSystemAnsi       ' True

' A zero byte in the first 256 bytes marks binary data; a later one does not.
StringToTextFile String$(100, "a") & vbNullChar & String$(100, "a"), path
Debug.Print GetFileEncoding(path) = encUnknown          ' True
StringToTextFile String$(300, "a") & vbNullChar & String$(300, "a"), path
Debug.Print GetFileEncoding(path) = encUtf8             ' True

' The signature of a PNG file.
ReDim b(0 To 15)
b(0) = &H89: b(1) = &H50: b(2) = &H4E: b(3) = &H47: b(4) = &HD: b(5) = &HA: b(6) = &H1A: b(7) = &HA
WriteStream b, path
Debug.Print GetFileEncoding(path) = encUnknown          ' True

DeleteFolder work
```

### GetFileLineEnding
{: .no_toc }

Returns the line-ending style of a text file.

Syntax: **GetFileLineEnding** ( *filePath* [, *encoding* ] ) **As NewlineType**

*filePath*
: *required* A **String** naming the file.

*encoding*
: *optional* A [**TextEncoding**](#textencoding) member. Default: **encAutoDetect**.

Reads the whole file and returns a [**NewlineType**](#newlinetype) member: **nlWindows** (CR LF), **nlUnix** (LF) or **nlMacintosh** (CR) when the file uses one style, **nlMixed** when it uses more than one, and **nlUnknown** when it has no line ending. **nlMixed** and **nlUnknown** are both 0, so they cannot be told apart by their value.

Raises error 5 for a binary file, and error 7 for a file too large for one **String** (over 2 GB). It raises the same error as [**GetFileEncoding**](#getfileencoding) for a missing file.

### GetFileType
{: .no_toc }

Returns the description of the type of a file or folder.

Syntax: **GetFileType** ( *filePath* ) **As String**

*filePath*
: *required* A **String** naming a file or folder.

Returns the type name that Windows Explorer shows, in the language of the system: `Application` for an `.exe` file, `File folder` for a folder, and for other files the description registered for the extension, or `TXT File` for a `.txt` file when none is registered. The Scripting Runtime's `File.Type` and `Folder.Type` return the same strings. When the shell cannot give a name, including when the path does not exist, the result is the extension in uppercase and the word `File` (`TXT File`), or just `File` when there is no extension.

### GetFileVersion
{: .no_toc }

Returns the version of an executable file.

Syntax: **GetFileVersion** ( *filePath* [, *source* ] ) **As String**

*filePath*
: *required* A **String** naming the file. A path longer than 260 characters gives an empty string.

*source*
: *optional* A [**FileVersionSource**](#fileversionsource) member. Default: **fvFixed**.

Returns the binary version as four numbers separated by dots, such as `10.0.19041.7725`, with **fvFixed**, the same string as the Scripting Runtime. **fvFileString** returns the `FileVersion` text that the author of the file wrote into it, and **fvProductString** the `ProductVersion` text; both return the binary version when the file has no such text. Returns an empty string when the file has no version resource, such as a `.txt` file. Raises error 53 when the file does not exist, and for a folder or an empty path. The Scripting Runtime raises an error in that case too, with the Windows code `0x80070002` as its number (-2147024894) and not 53.

```tb check_build check_run
Dim kernel As String
kernel = BuildPath(GetSpecialFolderPath(sfSystemFolder), "kernel32.dll")
Debug.Print Len(GetFileVersion(kernel)) > 0                  ' True
Debug.Print Len(GetFileVersion(kernel, fvFileString)) > 0    ' True

Dim work As String, v As String
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work
StringToTextFile "text", BuildPath(work, "a.txt")
Debug.Print GetFileVersion(BuildPath(work, "a.txt")) = ""    ' True
On Error Resume Next
v = GetFileVersion(BuildPath(work, "missing.exe"))
Debug.Print Err.Number                                       ' 53
On Error GoTo 0
DeleteFolder work
```

### IsFileLocked
{: .no_toc }

Returns whether a file is in use.

Syntax: **IsFileLocked** ( *filePath* ) **As Boolean**

*filePath*
: *required* A **String** naming the file.

Returns **True** when the file cannot be opened for reading and writing with exclusive access at this moment. That is so when a program has the file open, in any mode, for reading as well as for writing, and the program can be the one that calls **IsFileLocked**: an open [**TextStream**](TextStream) is such a case. It is so also for a read-only file, which cannot be opened for writing, although nothing has it open. A hidden attribute does not make a file locked. The answer holds for the instant of the call only, because another program can open or close the file immediately afterwards.

Raises error 53 when the file does not exist, also when *filePath* names a folder or is empty.

```tb check_build check_run
Dim work As String, path As String, fn As Long
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work
path = BuildPath(work, "data.txt")
StringToTextFile "x", path

Debug.Print IsFileLocked(path)             ' False
fn = FreeFile()
Open path For Binary Access Read Write Lock Read Write As #fn
Debug.Print IsFileLocked(path)             ' True
Close #fn
Debug.Print IsFileLocked(path)             ' False

Dim ts As TextStream
Set ts = OpenTextFile(path)                ' open for reading
Debug.Print IsFileLocked(path)             ' True
ts.Close

SetAttr path, vbReadOnly
Debug.Print IsFileLocked(path)             ' True
SetAttr path, vbNormal

DeleteFolder work
```

## Objects

### GetDrive
{: .no_toc }

Returns a [**Drive**](Drive) object.

Syntax: **GetDrive** ( *drivePath* ) **As Drive**

*drivePath*
: *required* A **String** that is a drive letter (`C`, `C:` or `C:\`), or the path of a network share (`\\server\share`, or a longer path).

Returns the drive, with its letter in uppercase. A longer path on a lettered drive, such as `C:\Windows`, is not a drive, and raises error 5, as it does with the Scripting Runtime; [**GetDriveName**](#getdrivename) reduces such a path to its drive first. A path on a network share is reduced to the share. Raises error 5 when the string is of none of those forms, and error 68 when a lettered drive does not exist. A network share is not checked until a property of the **Drive** needs it.

### GetDrives
{: .no_toc }

Returns a [**Drives**](Drives) collection of every drive.

Syntax: **GetDrives** ( ) **As Drives**

Returns the logical drives that Windows has, in the order of their letters. Check [**Drive.IsReady**](Drive#isready) before reading the size of one. The collection is a snapshot, and a drive that appears later is not in it.

### GetFile
{: .no_toc }

Returns a [**File**](File) object for an existing file.

Syntax: **GetFile** ( *filePath* ) **As File**

*filePath*
: *required* A **String** naming the file.

Returns the object for the full path of the file. Its **Name** has the letter case that the file system stores. Raises error 53 when the file does not exist, or when the path is a folder.

### GetFolder
{: .no_toc }

Returns a [**Folder**](Folder) object for an existing folder.

Syntax: **GetFolder** ( *folderPath* ) **As Folder**

*folderPath*
: *required* A **String** naming the folder. A drive root is allowed.

Returns the object for the full path of the folder. Its **Name** has the letter case that the file system stores. Raises error 76 when the folder does not exist, or when the path is a file.

## Whole files

### ArrayToTextFile
{: .no_toc }

Writes the elements of a **String** array to a text file, one per line.

Syntax: **ArrayToTextFile** ( *lines*(), *filePath* [, *encoding* [, *lineEnding* ] ] )

*lines*
: *required* A **String** array. Its elements are joined with the line ending. No line ending follows the last element, so a final empty element is what makes the file end with one.

*filePath*
: *required* A **String** naming the file. An existing file is replaced.

*encoding*
: *optional* A [**TextEncoding**](#textencoding) member. Default: **encUtf8**. A BOM is written only for the members with **Bom** in their name. **encAutoDetect** is read as **encUtf8**.

*lineEnding*
: *optional* A [**NewlineType**](#newlinetype) member. Default: **nlWindows**. **nlNoChange** is read as **nlWindows**, because a line ending is needed to join the lines.

The file is written as [**WriteStream**](#writestream) writes it, so an existing read-only file raises error 70. [**TextFileToArray**](#textfiletoarray) reads the result back into the same array. An array that is not dimensioned writes an empty file.

Errors: 52 when the last component of *filePath* holds `<`, `>`, `:`, `"`, `|`, `?`, `*` or a control character, or is a reserved device name such as `con` (see [**CleanFileName**](#cleanfilename)); the errors of [**WriteStream**](#writestream).

### MergeTextFiles
{: .no_toc }

Joins two text files into one.

Syntax: **MergeTextFiles** ( *firstFilePath*, *secondFilePath* [, *outputFilePath* [, *insertBlankLineBetween* [, *firstFileEncoding* [, *secondFileEncoding* ] ] ] ] )

*firstFilePath*
: *required* A **String** naming the file whose text comes first.

*secondFilePath*
: *required* A **String** naming the file whose text follows.

*outputFilePath*
: *optional* A **String** naming the result. Default: an empty string, which replaces *firstFilePath*. The result can also be either input file.

*insertBlankLineBetween*
: *optional* A **Boolean**. **True** puts an empty line between the two texts. Default: **False**.

*firstFileEncoding*
: *optional* A [**TextEncoding**](#textencoding) member for the first file. Default: **encAutoDetect**.

*secondFileEncoding*
: *optional* A [**TextEncoding**](#textencoding) member for the second file. Default: **encAutoDetect**.

The result has the encoding of the first file, with its BOM if it has one, and the line ending of the first file; a first file with mixed line endings, or none, gives CR LF. The lines of the second file are written in that encoding and with that line ending: a UTF-16 file with a BOM followed by a UTF-8 file with LF line endings gives a UTF-16 file with a BOM and CR LF line endings.

Every line is written with a line ending, the last one too, so the result ends with a line ending even when the files did not.

When the result is one of the inputs, the new text is written to a file beside it and swapped in once it is complete, and the input stays as it was after an error. When it is a separate file and an error occurs, the part that was written stays.

Errors: 5 when either file is binary; 53 when either file does not exist.

```tb check_build check_run
Dim work As String
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work

Dim fileA As String, fileB As String, fileOut As String
fileA = BuildPath(work, "a.txt")
fileB = BuildPath(work, "b.txt")
fileOut = BuildPath(work, "all.txt")
StringToTextFile "a1" & vbCrLf & "a2", fileA
StringToTextFile "b1" & vbLf & "b2", fileB

MergeTextFiles fileA, fileB, fileOut, True
Debug.Print Replace(TextFileToString(fileOut), vbCrLf, "|")   ' a1|a2||b1|b2|

DeleteFolder work
```

### NormalizeTextFile
{: .no_toc }

Rewrites a text file in place with a chosen encoding and line ending.

Syntax: **NormalizeTextFile** ( *filePath* [, *toEncoding* [, *toNewLine* [, *fromEncoding* [, *toAttributes* ] ] ] ] ) **As Boolean**

*filePath*
: *required* A **String** naming the file.

*toEncoding*
: *optional* A [**TextEncoding**](#textencoding) member for the new file. Default: **encUtf8**, with no BOM; a file that starts with a BOM loses it. **encAutoDetect** is read as **encUtf8**.

*toNewLine*
: *optional* A [**NewlineType**](#newlinetype) member. Default: **nlWindows**. **nlNoChange** keeps the line endings as they are.

*fromEncoding*
: *optional* A [**TextEncoding**](#textencoding) member for the file as it is now. Default: **encAutoDetect**.

*toAttributes*
: *optional* A [**FileAttribute**](#fileattribute) combination to give the file. Only the settable attributes count. Default: **faNoChange**, which keeps the attributes of the file.

The file is left alone when the text would be written back with exactly the bytes it has. Returns **True** when the file was changed, a change of attributes alone included, and **False** when it was left as it was. A second call with the same arguments returns **False**.

A binary file is refused with error 5; this includes a file that *fromEncoding* names when it is not UTF-16 or UTF-32 and holds binary data. An empty file stays empty, or becomes a BOM alone when *toEncoding* has one. The new file is written beside the old one and swapped in, as [**WriteStream**](#writestream) does. Unlike **WriteStream**, it rewrites a read-only file, because the call names the file and asks for the change; the file is read-only again afterwards, unless *toAttributes* says otherwise, and also when the rewrite fails. Raises error 53 when the file does not exist.

```tb check_build check_run
Dim work As String
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work

Dim path As String
path = BuildPath(work, "script.txt")
StringToTextFile "one" & vbLf & "two" & vbLf, path
Debug.Print GetFileLineEnding(path) = nlUnix       ' True
Debug.Print NormalizeTextFile(path)                ' True
Debug.Print GetFileLineEnding(path) = nlWindows    ' True
Debug.Print NormalizeTextFile(path)                ' False

' The attributes of the file are kept, or set when toAttributes is given.
SetAttr path, vbHidden
Debug.Print NormalizeTextFile(path, , nlUnix)                ' True
Debug.Print GetAttr(path)                                    ' 2
Debug.Print NormalizeTextFile(path, , nlUnix, , faReadOnly)  ' True
Debug.Print GetAttr(path)                                    ' 1

' A read-only file is rewritten and stays read-only.
Debug.Print NormalizeTextFile(path, , nlWindows)             ' True
Debug.Print GetAttr(path)                                    ' 1
SetAttr path, vbNormal

' A binary file is refused.
Dim bin() As Byte
ReDim bin(0 To 2)
bin(0) = 233: bin(1) = 0: bin(2) = 97
WriteStream bin, BuildPath(work, "data.bin")
On Error Resume Next
NormalizeTextFile BuildPath(work, "data.bin")
Debug.Print Err.Number                                       ' 5
Err.Clear

DeleteFolder work, True
```

### ReadStream
{: .no_toc }

Reads a file into a byte array.

Syntax: **ReadStream** ( *filePath*, *stream*() [, *maxBytesToRead* ] )

*filePath*
: *required* A **String** naming the file.

*stream*
: *required* A **Byte** array that receives the bytes. It is dimensioned from 0.

*maxBytesToRead*
: *optional* A **Long**. A value of 0 or more reads at most that many bytes from the start of the file. Default: -1, the whole file.

An empty file, and a *maxBytesToRead* of 0, leave *stream* as it was: an array that already has elements keeps them, and one that has none stays without. Test the array with [**IsArrayInitialized**](../../../Modules/Information/IsArrayInitialized) before indexing it.

Raises error 7 when the whole file is longer than 2,147,483,647 bytes; a head of any size can be read from a larger file. Raises error 53 when the file does not exist. A file that is held open with exclusive access raises an unspecified error, number -2147467259; see [Errors](./#errors).

### StringToTextFile
{: .no_toc }

Writes a string to a text file.

Syntax: **StringToTextFile** ( *text*, *filePath* [, *encoding* [, *outLineEnding* ] ] )

*text*
: *required* A **String** with the text to write.

*filePath*
: *required* A **String** naming the file. An existing file is replaced.

*encoding*
: *optional* A [**TextEncoding**](#textencoding) member. Default: **encUtf8**. A BOM is written only for the members with **Bom** in their name. **encAutoDetect** is read as **encUtf8**.

*outLineEnding*
: *optional* A [**NewlineType**](#newlinetype) member. A style other than **nlNoChange** converts every line ending in *text*, CR LF, LF or CR, to it. Default: **nlNoChange**, which writes *text* as it is.

An empty *text* creates an empty file, or one that holds only the BOM. The file is written as [**WriteStream**](#writestream) writes it, so an existing read-only file raises error 70.

For a code page with a limited character set, a character that the code page does not have is replaced by the substitute character of that code page, without an error: the Greek letter pi written with **encLatin1** becomes the byte 63, a question mark. An unpaired surrogate in *text* raises error 5 when the encoding is UTF-8.

Errors: 52 when the last component of *filePath* holds `<`, `>`, `:`, `"`, `|`, `?`, `*` or a control character, or is a reserved device name such as `con` (see [**CleanFileName**](#cleanfilename)); the errors of [**WriteStream**](#writestream).

```tb check_build check_run
Dim work As String, path As String, b() As Byte
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work
path = BuildPath(work, "t.txt")

StringToTextFile ChrW$(960), path, encLatin1
ReadStream path, b
Debug.Print b(0)                       ' 63

StringToTextFile "a" & vbCr & "b" & vbLf, path, , nlUnix
ReadStream path, b
Debug.Print UBound(b) + 1              ' 4

On Error Resume Next
StringToTextFile ChrW$(&HD800&) & "x", path, encUtf8
Debug.Print Err.Number                 ' 5
Err.Clear

DeleteFolder work
```

### TextFileToArray
{: .no_toc }

Reads a text file into an array of lines.

Syntax: **TextFileToArray** ( *filePath* [, *encoding* ] ) **As String()**

*filePath*
: *required* A **String** naming the file.

*encoding*
: *optional* A [**TextEncoding**](#textencoding) member. Default: **encAutoDetect**. A BOM in the file decides over it.

Returns a **String** array, dimensioned from 0, with one element per line. CR LF, LF and CR all end a line, also in one file. The line endings are not in the elements. A line ending at the end of the file gives a last, empty element. An empty file returns an array that is not dimensioned; test it with [**IsArrayInitialized**](../../../Modules/Information/IsArrayInitialized). A BOM is removed.

Raises error 5 for a binary file when the encoding is detected, and error 53 for a missing file.

```tb check_build check_run
Dim work As String
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work

Dim path As String, lines() As String, back() As String
path = BuildPath(work, "lines.txt")
lines = Split("first,second,third", ",")
ArrayToTextFile lines, path, encUtf8, nlUnix
Debug.Print GetFileLineEnding(path) = nlUnix     ' True

back = TextFileToArray(path)
Debug.Print UBound(back) - LBound(back) + 1      ' 3
Debug.Print back(2)                              ' third

DeleteFolder work
```

### TextFileToString
{: .no_toc }

Reads a text file into a string.

Syntax: **TextFileToString** ( *filePath* [, *encoding* [, *outLineEnding* ] ] ) **As String**

*filePath*
: *required* A **String** naming the file.

*encoding*
: *optional* A [**TextEncoding**](#textencoding) member. Default: **encAutoDetect**, which finds the encoding as [**GetFileEncoding**](#getfileencoding) does. An explicit encoding is used as it stands, unless the file starts with a BOM, which decides over it. A BOM member (**encUtf8Bom**) for a file without a BOM reads the file with the same code page.

*outLineEnding*
: *optional* A [**NewlineType**](#newlinetype) member. A style other than **nlNoChange** converts every line ending in the result to it. Default: **nlNoChange**.

Returns the text, without the BOM. An empty file returns an empty string. Bytes that are not valid in the encoding are replaced by a substitute character, without an error.

Raises error 5 for a file that looks binary when the encoding is detected (an explicit encoding is not checked), error 7 for a file of more than 2 GB, and error 53 for a missing file.

### WriteStream
{: .no_toc }

Writes a byte array to a file.

Syntax: **WriteStream** ( *stream*(), *filePath* )

*stream*
: *required* A **Byte** array. An empty array, or one that is not dimensioned, creates an empty file.

*filePath*
: *required* A **String** naming the file. An existing file is replaced, unless it is read-only.

The bytes are first written to a new file in the same folder, `<name>.~XXXXXXXX.tmp`, which is then swapped in for the target. A failure part-way therefore leaves the old file whole. The folder must allow a new file to be created in it.

A read-only file is not replaced, and nothing is written. [**StringToTextFile**](#stringtotextfile) and [**ArrayToTextFile**](#arraytotextfile) write through **WriteStream** and refuse such a file in the same way, as [**CreateTextFile**](#createtextfile) and the Scripting Runtime's **CreateTextFile** do. To replace such a file on purpose, clear its attribute first with [**File.SetAttribute**](File#setattribute), or delete it with *force* **True**. [**NormalizeTextFile**](#normalizetextfile) is the exception: it rewrites a read-only file and keeps it read-only.

Errors: 76 when the folder does not exist, and 70 when the file is read-only or when Windows refuses, such as for a file that is in use. A failure to write the new file raises the error of the runtime, such as 61 for a full disk; see [Errors](./#errors) for the other Windows failures.

```tb check_build check_run
Dim work As String, path As String, ts As TextStream, b() As Byte, lines() As String
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work
path = BuildPath(work, "protected.txt")
ReDim b(0 To 0)
b(0) = 65
lines = Split("a,b", ",")

StringToTextFile "old", path
SetAttr path, vbReadOnly

' A read-only file is refused by all four, and keeps its text and its attribute.
On Error Resume Next
StringToTextFile "new", path
Debug.Print Err.Number                       ' 70
Err.Clear
ArrayToTextFile lines, path
Debug.Print Err.Number                       ' 70
Err.Clear
WriteStream b, path
Debug.Print Err.Number                       ' 70
Err.Clear
Set ts = CreateTextFile(path)
Debug.Print Err.Number                       ' 70
Err.Clear
On Error GoTo 0
Debug.Print TextFileToString(path)           ' old
Debug.Print GetAttr(path) And vbReadOnly     ' 1

' With the attribute cleared, the file is replaced.
GetFile(path).SetAttribute faReadOnly, False
WriteStream b, path
Debug.Print TextFileToString(path)           ' A

On Error Resume Next
WriteStream b, BuildPath(work, "missing\x.bin")
Debug.Print Err.Number                       ' 76
Err.Clear
On Error GoTo 0

DeleteFolder work, True
```

## Searching text

### FileContainsText
{: .no_toc }

Returns whether a text file contains a piece of text.

Syntax: **FileContainsText** ( *filePath*, *searchText* [, *ignoreCase* ] ) **As Boolean**

*filePath*
: *required* A **String** naming the file.

*searchText*
: *required* A **String**, the text to look for. It must not be empty. Every character stands for itself: `*` and `?` are not wildcards.

*ignoreCase*
: *optional* A **Boolean**. **True** (default) ignores the letter case of the text, accented letters included. **False** compares the characters exactly.

Reads the whole file, in the encoding that [**GetFileEncoding**](#getfileencoding) finds, and returns **True** when its text holds *searchText*. The file is searched as one string, so *searchText* can span a line ending, written as the file has it: `vbCrLf` for a file with CR LF. Returns **False** for an empty file and for a file that looks like binary data.

Errors: 5 when *searchText* is empty; 53 when the file does not exist; 7 for a file of more than 2 GB; the errors of [**ReadStream**](#readstream) for a file that cannot be read.

### FindInTextFiles
{: .no_toc }

Returns the paths of the text files in a folder that contain a piece of text.

Syntax: **FindInTextFiles** ( *folderPath*, *searchText* [, *filePattern* [, *recursive* [, *ignoreCase* [, *fileSizeCapInMb* ] ] ] ] ) **As Collection**

*folderPath*
: *required* A **String** naming the folder to search.

*searchText*
: *required* A **String**, the text to look for. It must not be empty. Every character stands for itself: `*` and `?` are not wildcards.

*filePattern*
: *optional* A **String**, a file name that can hold the wildcards `*` and `?`, as the *pattern* of [**GetFilePaths**](#getfilepaths). Default: `*`. The pattern applies to the files and not to the folders.

*recursive*
: *optional* A **Boolean**. **True** also searches the subfolders, to any depth. Default: **False**.

*ignoreCase*
: *optional* A **Boolean**. **True** (default) ignores the letter case of the text, accented letters included. **False** compares the characters exactly.

*fileSizeCapInMb*
: *optional* A **Long**. A file larger than this many megabytes (1 MB is 1,048,576 bytes) is skipped, so 0 skips every file that is not empty. Default: -1, and any negative value, which set no limit. A file of more than 2 GB is always skipped.

Returns a **Collection** of **String** values, the full path of each file whose text holds *searchText*, starting at item 1, in the order in which Windows lists the folder. An empty result is an empty **Collection**.

The files are those that [**GetFilePaths**](#getfilepaths) returns for *filePattern*: hidden and system files are not searched, and a junction or symbolic link is not entered. Each file is tested as [**FileContainsText**](#filecontainstext) tests it, in the encoding that [**GetFileEncoding**](#getfileencoding) finds. An empty file and a file that looks like binary data do not match. A file that cannot be read, because it is held open with exclusive access or access to it is denied, is skipped without an error.

Errors: 5 when *searchText* is empty; 76 when *folderPath* is not a folder.

```tb check_build check_run
Dim work As String, hits As Collection, p As Variant
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder BuildPath(work, "sub"), True
StringToTextFile "Alpha and beta", BuildPath(work, "a.txt")
StringToTextFile "gamma", BuildPath(work, "b.txt")
StringToTextFile "alpha", BuildPath(work, "c.log")
StringToTextFile "ALPHA", BuildPath(work, "sub\d.txt")

Debug.Print FileContainsText(BuildPath(work, "a.txt"), "BETA")
Debug.Print FileContainsText(BuildPath(work, "a.txt"), "BETA", False)

Set hits = FindInTextFiles(work, "alpha")
Debug.Print hits.Count
For Each p In hits
    Debug.Print GetFileName(CStr(p))
Next
Debug.Print FindInTextFiles(work, "alpha", "*.txt", True).Count
Debug.Print FindInTextFiles(work, "alpha", , True, False).Count
Debug.Print FindInTextFiles(work, "zzz").Count
' Output:
' True
' False
' 2
' a.txt
' c.log
' 2
' 1
' 0

DeleteFolder work
```

## Text streams

### CreateTextFile
{: .no_toc }

Creates a text file and returns a [**TextStream**](TextStream) open for writing.

Syntax: **CreateTextFile** ( *filePath* [, *overwrite* [, *encoding* [, *lineEnding* ] ] ] ) **As TextStream**

*filePath*
: *required* A **String** naming the file.

*overwrite*
: *optional* A **Boolean**. **True** (default) empties an existing file. **False** raises error 58 when the file exists.

*encoding*
: *optional* A [**TextEncoding**](#textencoding) member. Default: **encUtf8**, without a BOM. A member with **Bom** in its name writes the BOM when the file is created. **encAutoDetect** is read as **encUtf8**.

*lineEnding*
: *optional* A [**NewlineType**](#newlinetype) member that [**WriteLine**](TextStream#writeline) and [**WriteBlankLines**](TextStream#writeblanklines) use. Default: **nlWindows**. Anything that is not **nlUnix** or **nlMacintosh** is CR LF.

The file is written in place, with no swap file, and an existing read-only file raises error 70. The errors are those of [**OpenTextFile**](#opentextfile) for **ForWriting**, and error 52 for a name that has `<`, `>`, `"`, `|`, `?`, `*` or a control character, or is a reserved device name such as `con` (see [**CleanFileName**](#cleanfilename)). A colon in the name is allowed: it addresses an alternate data stream of an NTFS file.

> [!IMPORTANT]
> The third argument of **Scripting.FileSystemObject.CreateTextFile** is a **Boolean** *Unicode*, and this procedure's third argument is an *encoding*. A **Boolean** converts to a number: **True** is -1, which is **encAutoDetect**, and on writing that means UTF-8, not UTF-16. **False** is 0, **encSystemAnsi**. Code ported from the Scripting Runtime that passes **True** needs **encUtf16** or **encUtf16Bom** here.

```tb check_build check_run
Dim work As String, ts As TextStream
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work

' In code written for the Scripting Runtime, the last True meant Unicode.
Set ts = CreateTextFile(BuildPath(work, "a.txt"), True, True)
Debug.Print ts.Encoding = encUtf8       ' True
ts.Close

Set ts = CreateTextFile(BuildPath(work, "b.txt"), True, encUtf16Bom)
Debug.Print ts.Encoding = encUtf16Bom   ' True
ts.Close

DeleteFolder work
```

### GetStandardStream
{: .no_toc }

Returns a [**TextStream**](TextStream) for the standard input, output or error stream of the process.

Syntax: **GetStandardStream** ( *standardStreamType* [, *unicode* ] ) **As TextStream**

*standardStreamType*
: *required* A [**StandardStreamTypes**](#standardstreamtypes) member.

*unicode*
: *optional* A **Boolean**. **True** reads and writes UTF-16 text, without a BOM. **False** (default) uses the system ANSI code page.

Standard input can be read, and standard output and error can be written. The stream does not own the handle, and [**Close**](TextStream#close) does not close it. Reading waits for the other end. Line endings written are CR LF. For these streams [**Encoding**](TextStream#encoding) returns **encSystemAnsi**, also when *unicode* is **True**, and [**IsStreaming**](TextStream#isstreaming) returns **False**.

### OpenTextFile
{: .no_toc }

Opens a text file and returns a [**TextStream**](TextStream).

Syntax: **OpenTextFile** ( *filePath* [, *ioMode* [, *create* [, *encoding* [, *writeModeLineEnding* ] ] ] ] ) **As TextStream**

*filePath*
: *required* A **String** naming the file.

*ioMode*
: *optional* An [**IOMode**](#iomode) member. Default: **ForReading**.

*create*
: *optional* A **Boolean**. **True** creates the file when it does not exist, for **ForWriting** and **ForAppending**. Default: **False**.

*encoding*
: *optional* A [**TextEncoding**](#textencoding) member. Default: **encAutoDetect**. See below.

*writeModeLineEnding*
: *optional* A [**NewlineType**](#newlinetype) member that [**WriteLine**](TextStream#writeline) and [**WriteBlankLines**](TextStream#writeblanklines) use. Default: **nlWindows**. Anything that is not **nlUnix** or **nlMacintosh** is CR LF.

What the mode does:

- **ForReading** requires the file. The encoding is found from the start of the file: a BOM first, then *encoding* when it names one, then the same guess as [**GetFileEncoding**](#getfileencoding). A file that looks binary is refused with error 5 when the encoding is detected. An empty file is reported as UTF-8.
- **ForWriting** empties the file when it is opened, for an encoding that is written in pieces; a stream that holds the whole file (UTF-7) replaces the file when it is closed or flushed. An existing read-only file raises error 70 when the stream is opened, except for UTF-7, where the error comes at the first flush or close and the file keeps its text. *encoding* gives the encoding, and **encAutoDetect** means UTF-8. A BOM is written for a member with **Bom** in its name. While the stream is open, other streams can read the file, and cannot open it for writing or appending (error 70). A stream open for reading does not stop another from opening the file for writing.
- **ForAppending** adds to the end. A file that exists keeps its encoding and BOM, found as for reading: *encoding* is used only when the file has no BOM, and is not checked against the text in the file, so a wrong one mixes encodings in the file. A BOM is not written again, and none is written to an existing file that is empty. The line ending for **WriteLine** is the one the first 64 KB of the file use, and *writeModeLineEnding* is used only for an empty file, a file without a line ending and a file with mixed ones. A file that does not exist is created like a new file under **ForWriting**, with the BOM of the encoding.

Errors: 53 when the file does not exist for **ForReading**, or for the other modes with *create* **False**; 76 when the folder does not exist; 52 for a name that is not valid when *create* is **True**; 5 for an unknown *ioMode*, and for a binary file as above; 70 when another stream has the file open for writing. The error has an empty **Err.Source** and the standard text of its number, `File not found` for 53, without the path.

> [!IMPORTANT]
> The fourth argument of **Scripting.FileSystemObject.OpenTextFile** is a **Tristate** *Format*, and this procedure's is an *encoding*. **TristateTrue** is -1, which is **encAutoDetect**: on writing that means UTF-8, not UTF-16. The default also differs: a file opened for writing here is UTF-8 without a BOM, where the Scripting Runtime writes ANSI.

This sample appends to a file that has a BOM and LF line endings. The new line gets the line ending of the file, and no second BOM is written:

```tb check_build check_run
Dim work As String, path As String, ts As TextStream
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work
path = BuildPath(work, "log.txt")
StringToTextFile "a" & vbLf & "b" & vbLf, path, encUtf8Bom

Set ts = OpenTextFile(path, ForAppending)
ts.WriteLine "c"
ts.Close

Debug.Print GetFileLineEnding(path) = nlUnix      ' True
Debug.Print GetFileEncoding(path) = encUtf8Bom    ' True
Debug.Print Len(TextFileToString(path))           ' 6

DeleteFolder work
```

## Enumerations

The enumerations are declared in the module and are global: **encUtf8**, **ForReading** and the other members are used without a prefix. [**DriveTypeConst**](Drive#drivetypeconst) belongs to the [**Drive**](Drive) class.

### TextEncoding
{: .no_toc }

An encoding of text in a file. The value is a Windows code page. A negative value is the same code page with a byte-order mark (BOM): it is written when a file is created with it, and expected when a file is read with it. A code page that has no member is used by its number:

```tb check_build check_run
Dim work As String, path As String, b() As Byte
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work
path = BuildPath(work, "sjis.txt")

' Shift-JIS is code page 932. Hiragana A, U+3042, is the two bytes 82 A0.
StringToTextFile ChrW$(&H3042&), path, 932
ReadStream path, b
Debug.Print Hex$(b(0)) & " " & Hex$(b(1))     ' 82 A0
Debug.Print AscW(TextFileToString(path, 932))  ' 12354

DeleteFolder work
```

| Member | Value | Meaning |
|---|---|---|
| encUnknown | -1 | As a result: the encoding could not be found (the file is empty or binary). Same value as **encAutoDetect**. |
| encAutoDetect | -1 | As an argument for reading: find the encoding. As an argument for writing: **encUtf8**. |
| encSystemAnsi | 0 | The ANSI code page of the system. |
| encGB2312 | 936 | Simplified Chinese, GBK. |
| encBig5 | 950 | Traditional Chinese. |
| encUtf16 | 1200 | UTF-16, little endian, no BOM. |
| encUtf16Be | 1201 | UTF-16, big endian, no BOM. |
| encUtf32 | 12000 | UTF-32, little endian, no BOM. |
| encUtf32Be | 12001 | UTF-32, big endian, no BOM. |
| encUsAscii | 20127 | US-ASCII. |
| encLatin1 | 28591 | ISO 8859-1. |
| encLatin9 | 28605 | ISO 8859-15. |
| encGB18030 | 54936 | GB18030, no BOM. |
| encUtf7 | 65000 | UTF-7, no BOM. |
| encUtf8 | 65001 | UTF-8, no BOM. |
| encUtf8Bom | -65001 | UTF-8 with the BOM EF BB BF. |
| encUtf16Bom | -1200 | UTF-16, little endian, with the BOM FF FE. |
| encUtf16BeBom | -1201 | UTF-16, big endian, with the BOM FE FF. |
| encUtf32Bom | -12000 | UTF-32, little endian, with the BOM FF FE 00 00. |
| encUtf32BeBom | -12001 | UTF-32, big endian, with the BOM 00 00 FE FF. |
| encUtf7Bom | -65000 | UTF-7 with the signature `+/v8-`. |
| encGB18030Bom | -54936 | GB18030 with the BOM 84 31 95 33. |

Only these seven negative members have a BOM. A BOM member given for reading a file that has no BOM reads it with the code page alone.

### NewlineType
{: .no_toc }

A line-ending style.

| Member | Value | Meaning |
|---|---|---|
| nlUnknown | 0 | As a result: the text has no line ending. |
| nlMixed | 0 | As a result: the text has more than one style. |
| nlNoChange | 0 | As an argument: leave the line endings as they are. |
| nlWindows | 1 | Carriage return and line feed (`vbCrLf`). |
| nlUnix | 2 | Line feed (`vbLf`). |
| nlMacintosh | 3 | Carriage return (`vbCr`). |

### IOMode
{: .no_toc }

How [**OpenTextFile**](#opentextfile) opens a file. The values are those of the Scripting Runtime.

| Member | Value | Meaning |
|---|---|---|
| ForReading | 1 | Read. The file must exist. |
| ForWriting | 2 | Write, from an empty file. |
| ForAppending | 8 | Write at the end of the file. |

### SpecialFolderConst
{: .no_toc }

A well-known folder, for [**GetSpecialFolder**](#getspecialfolder) and [**GetSpecialFolderPath**](#getspecialfolderpath). The first three members have the values of the Scripting Runtime, and **WindowsFolder**, **SystemFolder** and **TemporaryFolder** are names for them that match it. The rest are known folders of Windows.

| Member | Value | Folder |
|---|---|---|
| sfWindowsFolder, WindowsFolder | 0 | The Windows folder. |
| sfSystemFolder, SystemFolder | 1 | The `System32` folder. |
| sfTemporaryFolder, TemporaryFolder | 2 | The folder named by the `TEMP` environment variable. |
| sfSystemX86Folder | 3 | The 32-bit system folder (`SysWOW64` on 64-bit Windows). |
| sfProgramFiles | 4 | Program Files. |
| sfProgramFilesX86 | 5 | Program Files (x86). |
| sfProgramData | 6 | ProgramData. |
| sfUserProfile | 7 | The profile folder of the current user. |
| sfDesktop | 8 | The desktop of the current user. |
| sfDocuments | 9 | Documents of the current user. |
| sfDownloads | 10 | Downloads of the current user. |
| sfPictures | 11 | Pictures of the current user. |
| sfMusic | 12 | Music of the current user. |
| sfVideos | 13 | Videos of the current user. |
| sfLocalAppData | 14 | Local application data (`AppData\Local`). |
| sfRoamingAppData | 15 | Roaming application data (`AppData\Roaming`). |
| sfPublicDesktop | 16 | The desktop shared by all users. |
| sfPublicDocuments | 17 | Documents shared by all users. |
| sfPublicDownloads | 18 | Downloads shared by all users. |
| sfPublicPictures | 19 | Pictures shared by all users. |
| sfPublicMusic | 20 | Music shared by all users. |
| sfPublicVideos | 21 | Videos shared by all users. |
| sfFonts | 22 | Fonts. |
| sfStartup | 23 | The Startup folder of the current user. |
| sfCommonStartup | 24 | The Startup folder of all users. |

### FileAttribute
{: .no_toc }

The attributes of a file or folder, for [**File.Attributes**](File#attributes), [**Folder.Attributes**](Folder#attributes) and [**NormalizeTextFile**](#normalizetextfile). The values are those of Windows. Combine them with **Or**.

Reading an attribute set returns every attribute that the file system reports. Writing applies only the settable ones, listed first; the others are dropped without an error. **faNormal** means no attributes, and it wins over any other member it is combined with: `faNormal Or faReadOnly` clears every settable attribute. The FSO values *Volume* (8) and *Alias* (1024) are not members: the label of a volume is [**Drive.VolumeName**](Drive#volumename), and an alias is **faReparsePoint**.

| Member | Value | Meaning |
|---|---|---|
| faNoChange | -1 | As an argument: keep the attributes. |
| faNormal, Normal | 128 | No attributes. Settable. |
| faReadOnly, ReadOnly | 1 | Read-only. Settable. |
| faHidden, Hidden | 2 | Hidden. Settable. |
| faSystem, System | 4 | System file. Settable. |
| faArchive, Archive | 32 | Changed since the last backup. Settable. |
| faTemporary | 256 | Temporary file. Settable. |
| faNotContentIndexed | 8192 | Not indexed by the content indexing service. Settable. |
| faDirectory, Directory | 16 | A folder. |
| faCompressed, Compressed | 2048 | Compressed. |
| faEncrypted | 16384 | Encrypted. |
| faReparsePoint | 1024 | A reparse point: a junction, a symbolic link or a cloud placeholder. |
| faSparseFile | 512 | A sparse file. |
| faOffline | 4096 | The content is not available locally. |
| faIntegrityStream | 32768 | A checksummed stream (NTFS, ReFS). |
| faVirtual | 65536 | Reserved by Windows. |
| faNoScrubData | 131072 | Excluded from the integrity scrubber. |
| faEA | 262144 | Has extended attributes. Same value as **faRecallOnOpen**. |
| faRecallOnOpen | 262144 | A cloud file recalled when it is opened. |
| faPinned | 524288 | A cloud file kept on this computer. |
| faUnpinned | 1048576 | A cloud file that may be removed from this computer. |
| faRecallOnDataAccess | 4194304 | A cloud file recalled when its data is read. |
| faStrictlySequential | 536870912 | Meant for sequential access. |

### FileVersionSource
{: .no_toc }

Which version a file reports, for [**GetFileVersion**](#getfileversion).

| Member | Value | Meaning |
|---|---|---|
| fvFixed | 0 | The binary version of the file, four numbers. |
| fvFileString | 1 | The `FileVersion` text of the file. |
| fvProductString | 2 | The `ProductVersion` text of the file. |

### StandardStreamTypes
{: .no_toc }

A standard stream of the process, for [**GetStandardStream**](#getstandardstream). The values are those of the Scripting Runtime.

| Member | Value | Meaning |
|---|---|---|
| StdIn | 0 | Standard input. |
| StdOut | 1 | Standard output. |
| StdErr | 2 | Standard error. |

## See Also

- [FileSystemObject](FileSystemObject) class -- the same procedures as the members of a COM object
- [File](File) class -- a file, returned by **GetFile**
- [Folder](Folder) class -- a folder, returned by **GetFolder**
- [Drive](Drive) class -- a drive, returned by **GetDrive**
- [TextStream](TextStream) class -- the text stream returned by **OpenTextFile** and **CreateTextFile**
- [FileCopy](../../../Modules/FileSystem/FileCopy) function -- the VBA statement that copies one file
- [Kill](../../../Modules/FileSystem/Kill) function -- the VBA statement that deletes files
- [Open](../../../Core/Open) statement -- the VBA statement that opens a file for input and output
