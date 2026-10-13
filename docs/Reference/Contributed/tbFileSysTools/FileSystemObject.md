---
title: FileSystemObject
parent: tbFileSysTools Package
permalink: /tB/Packages/Contributed/tbFileSysTools/FileSystemObject
has_toc: false
---

# FileSystemObject class
{: .no_toc }

**FileSystemObject** is a class whose members are the procedures of the [**FileSystemTools**](FileSystemTools) module, for code written for the **FileSystemObject** of the Scripting Runtime and for hosts that need an object and not a module. Each member calls the procedure of the same name in the module, with the same defaults, so the entries of [**FileSystemTools**](FileSystemTools) describe them in full. This page gives each member's syntax and says where it differs from the module.

Code written in twinBASIC can call the module directly, with no object. The class exists so that a line such as `Dim fso As New FileSystemObject` and the calls that follow it keep working when the Scripting Runtime is replaced.

```tb check_build check_run
Dim fso As New FileSystemObject
Dim work As String
work = fso.BuildPath(Environ$("TEMP"), fso.GetTempName("fst", ""))
fso.CreateFolder work

Dim ts As TextStream
Set ts = fso.CreateTextFile(fso.BuildPath(work, "a.txt"))
ts.WriteLine "hello"
ts.Close

Debug.Print fso.FileExists(fso.BuildPath(work, "a.txt"))     ' True
Debug.Print fso.GetFile(fso.BuildPath(work, "a.txt")).Size   ' 7
Debug.Print fso.Drives.Count > 0                             ' True

fso.DeleteFolder work
```

## Differences from the module

- Some arguments have the names that the Scripting Runtime gives them, so named arguments in ported code keep working: *fileSpec*, *folderSpec* and *driveSpec* where the module has *filePath*, *folderPath* and *drivePath*; *path* in **CreateFolder**; *fileName* in **CreateTextFile**, **GetFileVersion** and **OpenTextFile**. The syntax lines below show the names of the class.
- [**MoveFile**](#movefile), [**MoveFolder**](#movefolder) and [**Rename**](#rename) are procedures that return nothing, as in the Scripting Runtime. The module's return the full path of the result.
- [**Drives**](#drives) is the module's [**GetDrives**](FileSystemTools#getdrives).
- Nothing else differs.

## Porting code from the Scripting Runtime

Replace `CreateObject("Scripting.FileSystemObject")` with `New FileSystemObject`, and check these calls. The package differs from the Scripting Runtime in them, and a program compiles with the old code but does not do the same:

- [**GetSpecialFolder**](#getspecialfolder) returns the path as a **String**, not a **Folder**. Code that reads `.Path` from the result does not compile (the sample after this list).
- The third argument of [**CreateTextFile**](#createtextfile) and of [**Folder.CreateTextFile**](Folder#createtextfile) is an encoding. The Scripting Runtime's *Unicode* **Boolean** **True** is -1 here, which writes UTF-8, and not UTF-16. The default is UTF-8 without a BOM, where the Scripting Runtime writes ANSI.
- The fourth argument of [**OpenTextFile**](#opentextfile) and the second of [**File.OpenAsTextStream**](File#openastextstream) are an encoding, not a **Tristate**. **TristateTrue** is -1, which is **encAutoDetect**.
- The other differences, such as the added members and the changed defaults, are listed under [Differences from the Scripting Runtime](./#differences-from-the-scripting-runtime).

```tb check_build expect-error=TB5027
Dim fso As New FileSystemObject
Debug.Print fso.GetSpecialFolder(sfTemporaryFolder).Path
```

## Files and folders

### CopyFile
{: .no_toc }

Syntax: *object*.**CopyFile** ( *source*, *destination* [, *overwrite* ] )

See [**CopyFile**](FileSystemTools#copyfile).

### CopyFolder
{: .no_toc }

Syntax: *object*.**CopyFolder** ( *source*, *destination* [, *overwrite* ] )

See [**CopyFolder**](FileSystemTools#copyfolder).

### CreateFolder
{: .no_toc }

Syntax: *object*.**CreateFolder** ( *path* [, *createIntermediates* ] ) **As Folder**

*path* is *folderPath* in the module. See [**CreateFolder**](FileSystemTools#createfolder).

### DeleteFile
{: .no_toc }

Syntax: *object*.**DeleteFile** ( *fileSpec* [, *force* [, *ignoreMissing* ] ] )

*fileSpec* is *filePath* in the module. See [**DeleteFile**](FileSystemTools#deletefile).

### DeleteFolder
{: .no_toc }

Syntax: *object*.**DeleteFolder** ( *folderSpec* [, *force* [, *ignoreMissing* ] ] )

*folderSpec* is *folderPath* in the module. See [**DeleteFolder**](FileSystemTools#deletefolder), including its note about links.

### GetFilePaths
{: .no_toc }

Syntax: *object*.**GetFilePaths** ( *folderPath* [, *pattern* [, *includeHidden* [, *includeSystem* [, *recursive* ] ] ] ] ) **As Collection**

See [**GetFilePaths**](FileSystemTools#getfilepaths).

### MoveFile
{: .no_toc }

Syntax: *object*.**MoveFile** ( *source*, *destination* )

A procedure, with no result. See [**MoveFile**](FileSystemTools#movefile).

### MoveFolder
{: .no_toc }

Syntax: *object*.**MoveFolder** ( *source*, *destination* )

A procedure, with no result. See [**MoveFolder**](FileSystemTools#movefolder).

### Rename
{: .no_toc }

Syntax: *object*.**Rename** ( *source*, *newName* )

A procedure, with no result. See [**Rename**](FileSystemTools#rename).

## Paths

### BuildPath
{: .no_toc }

Syntax: *object*.**BuildPath** ( *path*, *name* ) **As String**

See [**BuildPath**](FileSystemTools#buildpath).

### CleanFileName
{: .no_toc }

Syntax: *object*.**CleanFileName** ( *fileName* [, *replaceChar* ] ) **As String**

See [**CleanFileName**](FileSystemTools#cleanfilename).

### GetAbsolutePathName
{: .no_toc }

Syntax: *object*.**GetAbsolutePathName** ( *path* [, *baseDirectory* ] ) **As String**

See [**GetAbsolutePathName**](FileSystemTools#getabsolutepathname).

### GetBaseName
{: .no_toc }

Syntax: *object*.**GetBaseName** ( *path* ) **As String**

See [**GetBaseName**](FileSystemTools#getbasename).

### GetDriveName
{: .no_toc }

Syntax: *object*.**GetDriveName** ( *path* ) **As String**

See [**GetDriveName**](FileSystemTools#getdrivename).

### GetExtensionName
{: .no_toc }

Syntax: *object*.**GetExtensionName** ( *path* ) **As String**

See [**GetExtensionName**](FileSystemTools#getextensionname).

### GetFileName
{: .no_toc }

Syntax: *object*.**GetFileName** ( *path* ) **As String**

See [**GetFileName**](FileSystemTools#getfilename).

### GetParentFolderName
{: .no_toc }

Syntax: *object*.**GetParentFolderName** ( *path* ) **As String**

See [**GetParentFolderName**](FileSystemTools#getparentfoldername).

### GetRelativePath
{: .no_toc }

Syntax: *object*.**GetRelativePath** ( *basePath*, *targetPath* [, *basePathIsFolder* [, *trimLeadingDotSlash* ] ] ) **As String**

See [**GetRelativePath**](FileSystemTools#getrelativepath).

### GetTempName
{: .no_toc }

Syntax: *object*.**GetTempName** ( [ *prefix* [, *extension* [, *inFolder* ] ] ] ) **As String**

See [**GetTempName**](FileSystemTools#gettempname).

## Existence

### DriveExists
{: .no_toc }

Syntax: *object*.**DriveExists** ( *driveSpec* ) **As Boolean**

*driveSpec* is *drivePath* in the module. See [**DriveExists**](FileSystemTools#driveexists).

### FileExists
{: .no_toc }

Syntax: *object*.**FileExists** ( *fileSpec* ) **As Boolean**

*fileSpec* is *filePath* in the module. See [**FileExists**](FileSystemTools#fileexists).

### FolderExists
{: .no_toc }

Syntax: *object*.**FolderExists** ( *folderSpec* ) **As Boolean**

*folderSpec* is *folderPath* in the module. See [**FolderExists**](FileSystemTools#folderexists).

## Current directory and special folders

### GetCurrentDir
{: .no_toc }

Syntax: *object*.**GetCurrentDir** ( ) **As String**

See [**GetCurrentDir**](FileSystemTools#getcurrentdir).

### GetSpecialFolder
{: .no_toc }

Syntax: *object*.**GetSpecialFolder** ( *specialFolder* ) **As String**

Returns a path, not a **Folder** object as the Scripting Runtime does. See [**GetSpecialFolder**](FileSystemTools#getspecialfolder).

### SetCurrentDir
{: .no_toc }

Syntax: *object*.**SetCurrentDir** ( *folderPath* )

See [**SetCurrentDir**](FileSystemTools#setcurrentdir).

## File information

### GetFileEncoding
{: .no_toc }

Syntax: *object*.**GetFileEncoding** ( *filePath* ) **As TextEncoding**

See [**GetFileEncoding**](FileSystemTools#getfileencoding).

### GetFileLineEnding
{: .no_toc }

Syntax: *object*.**GetFileLineEnding** ( *filePath* [, *encoding* ] ) **As NewlineType**

See [**GetFileLineEnding**](FileSystemTools#getfilelineending).

### GetFileType
{: .no_toc }

Syntax: *object*.**GetFileType** ( *filePath* ) **As String**

See [**GetFileType**](FileSystemTools#getfiletype).

### GetFileVersion
{: .no_toc }

Syntax: *object*.**GetFileVersion** ( *fileName* [, *source* ] ) **As String**

*fileName* is *filePath* in the module. See [**GetFileVersion**](FileSystemTools#getfileversion).

### IsFileLocked
{: .no_toc }

Syntax: *object*.**IsFileLocked** ( *filePath* ) **As Boolean**

See [**IsFileLocked**](FileSystemTools#isfilelocked).

## Objects

### Drives
{: .no_toc }

Syntax: *object*.**Drives** ( ) **As Drives**

Returns the [**Drives**](Drives) collection of all drives. It is a function, called with or without parentheses: `fso.Drives.Count` and `For Each d In fso.Drives` both work. In the module it is [**GetDrives**](FileSystemTools#getdrives).

### GetDrive
{: .no_toc }

Syntax: *object*.**GetDrive** ( *driveSpec* ) **As Drive**

*driveSpec* is *drivePath* in the module. See [**GetDrive**](FileSystemTools#getdrive).

### GetFile
{: .no_toc }

Syntax: *object*.**GetFile** ( *filePath* ) **As File**

See [**GetFile**](FileSystemTools#getfile).

### GetFolder
{: .no_toc }

Syntax: *object*.**GetFolder** ( *folderPath* ) **As Folder**

See [**GetFolder**](FileSystemTools#getfolder).

## Whole files

### ArrayToTextFile
{: .no_toc }

Syntax: *object*.**ArrayToTextFile** ( *lines*(), *filePath* [, *encoding* [, *lineEnding* ] ] )

See [**ArrayToTextFile**](FileSystemTools#arraytotextfile).

### MergeTextFiles
{: .no_toc }

Syntax: *object*.**MergeTextFiles** ( *firstFilePath*, *secondFilePath* [, *outputFilePath* [, *insertBlankLineBetween* [, *firstFileEncoding* [, *secondFileEncoding* ] ] ] ] )

See [**MergeTextFiles**](FileSystemTools#mergetextfiles).

### NormalizeTextFile
{: .no_toc }

Syntax: *object*.**NormalizeTextFile** ( *filePath* [, *toEncoding* [, *toNewLine* [, *fromEncoding* [, *toAttributes* ] ] ] ] ) **As Boolean**

See [**NormalizeTextFile**](FileSystemTools#normalizetextfile).

### ReadStream
{: .no_toc }

Syntax: *object*.**ReadStream** ( *filePath*, *stream*() [, *maxBytesToRead* ] )

See [**ReadStream**](FileSystemTools#readstream).

### StringToTextFile
{: .no_toc }

Syntax: *object*.**StringToTextFile** ( *text*, *filePath* [, *encoding* [, *outLineEnding* ] ] )

See [**StringToTextFile**](FileSystemTools#stringtotextfile).

### TextFileToArray
{: .no_toc }

Syntax: *object*.**TextFileToArray** ( *filePath* [, *encoding* ] ) **As String()**

See [**TextFileToArray**](FileSystemTools#textfiletoarray).

### TextFileToString
{: .no_toc }

Syntax: *object*.**TextFileToString** ( *filePath* [, *encoding* [, *outLineEnding* ] ] ) **As String**

See [**TextFileToString**](FileSystemTools#textfiletostring).

### WriteStream
{: .no_toc }

Syntax: *object*.**WriteStream** ( *stream*(), *filePath* )

See [**WriteStream**](FileSystemTools#writestream).

## Searching text

```tb check_build check_run
Dim fso As New FileSystemObject
Dim work As String, hits As Collection
work = fso.BuildPath(Environ$("TEMP"), fso.GetTempName("fst", ""))
fso.CreateFolder work
fso.StringToTextFile "find me", fso.BuildPath(work, "a.txt")
fso.StringToTextFile "other", fso.BuildPath(work, "b.txt")

Debug.Print fso.FileContainsText(fso.BuildPath(work, "a.txt"), "FIND")   ' True
Set hits = fso.FindInTextFiles(work, "find")
Debug.Print hits.Count                                                   ' 1
Debug.Print fso.IsFileLocked(fso.BuildPath(work, "a.txt"))               ' False

fso.DeleteFolder work
```

### FileContainsText
{: .no_toc }

Syntax: *object*.**FileContainsText** ( *filePath*, *searchText* [, *ignoreCase* ] ) **As Boolean**

See [**FileContainsText**](FileSystemTools#filecontainstext).

### FindInTextFiles
{: .no_toc }

Syntax: *object*.**FindInTextFiles** ( *folderPath*, *searchText* [, *filePattern* [, *recursive* [, *ignoreCase* [, *fileSizeCapInMb* ] ] ] ] ) **As Collection**

See [**FindInTextFiles**](FileSystemTools#findintextfiles).

## Text streams

### CreateTextFile
{: .no_toc }

Syntax: *object*.**CreateTextFile** ( *fileName* [, *overwrite* [, *encoding* [, *lineEnding* ] ] ] ) **As TextStream**

*fileName* is *filePath* in the module. The third argument is an encoding, not the Scripting Runtime's *Unicode* **Boolean**. See [**CreateTextFile**](FileSystemTools#createtextfile).

### GetStandardStream
{: .no_toc }

Syntax: *object*.**GetStandardStream** ( *standardStreamType* [, *unicode* ] ) **As TextStream**

See [**GetStandardStream**](FileSystemTools#getstandardstream).

### OpenTextFile
{: .no_toc }

Syntax: *object*.**OpenTextFile** ( *fileName* [, *ioMode* [, *create* [, *encoding* [, *writeModeLineEnding* ] ] ] ] ) **As TextStream**

*fileName* is *filePath* in the module. The fourth argument is an encoding, not a **Tristate**. See [**OpenTextFile**](FileSystemTools#opentextfile).

## See Also

- [FileSystemTools](FileSystemTools) module -- the procedures in full, and the enumerations
- [File](File) class, [Folder](Folder) class, [Drive](Drive) class and [TextStream](TextStream) class -- the objects that the members return
- [tbFileSysTools](./) package -- how the package differs from the Scripting Runtime's **FileSystemObject**
