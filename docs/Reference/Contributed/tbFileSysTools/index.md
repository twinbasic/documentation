---
title: tbFileSysTools Package
parent: Contributed Packages
has_toc: false
exclude_from_docs:
  - FSTShared
  - TextCodec
  - WinAPI
indexed_from: 1.1.1.0
permalink: /tB/Packages/Contributed/tbFileSysTools/
---

# tbFileSysTools Package
{: .no_toc }

**Author:** GCuser99. **On GitHub:** [GCuser99/tbFileSysTools](https://github.com/GCuser99/tbFileSysTools), in the folder *Package*.

The **tbFileSysTools** contributed package, listed in the Available Packages dialog as *File System Tools - Modern Replacement for FSO*, reads and changes files, folders and drives, as the **FileSystemObject** of the Scripting Runtime does, and is written in twinBASIC. It reads and writes text files in any Windows code page, with detection of the encoding and handling of byte-order marks (BOMs), detects and converts line endings, streams files of any size, and works with paths longer than 260 characters.

It has two ways in. The [**FileSystemTools**](FileSystemTools) module holds the code, as procedures that a project calls by name, with no object to create. The [**FileSystemObject**](FileSystemObject) class has the same procedures as members of an object, for code written for the Scripting Runtime. The objects that both return, [**File**](File), [**Folder**](Folder), [**Drive**](Drive) and [**TextStream**](TextStream), and the collections [**Files**](Files), [**Folders**](Folders) and [**Drives**](Drives), have the members of the Scripting Runtime's objects of the same names, and some more.

```tb check_build check_run
Dim work As String, path As String
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work
path = BuildPath(work, "notes.txt")

' Write a string as UTF-8 with a byte-order mark, then ask what the file holds.
StringToTextFile "caf" & ChrW$(233) & vbCrLf & "ok", path, encUtf8Bom
Debug.Print GetFileEncoding(path) = encUtf8Bom    ' True
Debug.Print GetFileLineEnding(path) = nlWindows   ' True
Debug.Print Len(TextFileToString(path))           ' 8

' Read it line by line; the encoding is found from the BOM.
Dim ts As TextStream
Set ts = OpenTextFile(path)
Do Until ts.AtEndOfStream
    Debug.Print Len(ts.ReadLine)
Loop
ts.Close
' Output:
' True
' True
' 8
' 4
' 2

DeleteFolder work
```

> [!NOTE]
> This section documents version 1.1.1.0, the version on the package server, published under the MIT licence. The GitHub repository has moved on: its README describes version 1.8.0.0, and its change log lists changes from 1.2.0.0 on. Some members that the README names, such as **FindInTextFiles**, **FileContainsText** and **IsFileLocked**, do not exist in 1.1.1.0. The change log also records that later versions removed the *useLongPathPrefix* argument of **GetAbsolutePathName** and the *skipIfUnchanged* argument of **NormalizeTextFile**, which this version has, and that they changed some of the behaviour described on these pages.

The public types of the package are the module and the eight classes on these pages, and the enumerations that the module declares. Three private modules, **FSTShared** (shared file code and the error mapping), **TextCodec** (encoding, decoding and detection) and **WinAPI** (Windows declarations), are not part of the interface and are not described.

## Differences from the Scripting Runtime

A call that works with the Scripting Runtime's **FileSystemObject** keeps its name here. These are the differences.

**Added members.**

- Whole files: [**StringToTextFile**](FileSystemTools#stringtotextfile), [**TextFileToString**](FileSystemTools#textfiletostring), [**ArrayToTextFile**](FileSystemTools#arraytotextfile), [**TextFileToArray**](FileSystemTools#textfiletoarray), [**ReadStream**](FileSystemTools#readstream), [**WriteStream**](FileSystemTools#writestream), [**NormalizeTextFile**](FileSystemTools#normalizetextfile) and [**MergeTextFiles**](FileSystemTools#mergetextfiles).
- Detection: [**GetFileEncoding**](FileSystemTools#getfileencoding) and [**GetFileLineEnding**](FileSystemTools#getfilelineending).
- Paths and directories: [**CleanFileName**](FileSystemTools#cleanfilename), [**GetRelativePath**](FileSystemTools#getrelativepath), [**GetFilePaths**](FileSystemTools#getfilepaths), [**GetFileType**](FileSystemTools#getfiletype), [**GetCurrentDir**](FileSystemTools#getcurrentdir), [**SetCurrentDir**](FileSystemTools#setcurrentdir) and [**Rename**](FileSystemTools#rename).
- On [**File**](File): **Encoding**, **ExtensionName**, **HasAttribute**, **LineEnding**, **Normalize**, **Refresh**, **Rename**, **SetAttribute**, **ToStream**, **ToString** and **Version**. On [**Folder**](Folder): **HasAttribute**, **Refresh**, **Rename** and **SetAttribute**. On [**Drive**](Drive): **SerialNumberHex** and **UnsignedSerialNumber**. On [**TextStream**](TextStream): **Encoding**, **Flush** and **IsStreaming**.
- [**Files**](Files), [**Folders**](Folders) and [**Drives**](Drives) return an item by position as well as by name.
- Enumerations for the encodings, line endings and 25 special folders.

**Members with more arguments.** [**CreateFolder**](FileSystemTools#createfolder) can create the folders above the new one. [**DeleteFile**](FileSystemTools#deletefile) and [**DeleteFolder**](FileSystemTools#deletefolder) can ignore a missing target. [**GetAbsolutePathName**](FileSystemTools#getabsolutepathname) takes a base directory. [**GetTempName**](FileSystemTools#gettempname) takes a prefix, an extension and a folder to check.

**Missing members.** One: the **Add** method of the **Folders** collection, which creates a folder. [**CreateFolder**](FileSystemTools#createfolder) does that. Every other member of the Scripting Runtime's **FileSystemObject**, **File**, **Folder**, **Drive** and **TextStream** is here, and so are **Count**, **Item** and the enumerator of the three collections. **Drives** of the class [**FileSystemObject**](FileSystemObject#drives) is a function, called with or without parentheses.

**Arguments that mean something else.** The Scripting Runtime selects the encoding of a text file with a **Boolean** (*Unicode*, in **CreateTextFile**) or a **Tristate** (*Format*, in **OpenTextFile** and **OpenAsTextStream**). Here the argument is a [**TextEncoding**](FileSystemTools#textencoding). Code that passes **True** or **TristateTrue**, which is -1, gets **encAutoDetect**, and for writing that is UTF-8, not UTF-16. The defaults also differ: a text file is written in UTF-8 without a BOM, where the Scripting Runtime writes ANSI, and a file opened for reading has its encoding detected, where the Scripting Runtime reads ANSI.

**Results that differ.**

- [**GetSpecialFolder**](FileSystemTools#getspecialfolder) returns the path as a **String**, where the Scripting Runtime returns a **Folder**. It accepts 25 folders, and not only the Windows, System and Temporary folders.
- [**FileAttribute**](FileSystemTools#fileattribute) has no *Volume* (8) and no *Alias* (1024). The label of a volume is [**Drive.VolumeName**](Drive#volumename), and an alias is **faReparsePoint**. [**File**](File#setattribute) and [**Folder**](Folder#setattribute) add **SetAttribute** and **HasAttribute**, which change and test one attribute.
- [**Folder.Size**](Folder#size) does not enter directory junctions and symbolic links. The Scripting Runtime does, and counts the target of a link twice when it is in the same tree: 2,500 bytes there for a folder that holds 1,500.
- [**BuildPath**](FileSystemTools#buildpath) and [**GetParentFolderName**](FileSystemTools#getparentfoldername) turn `/` into `\`. `BuildPath("C:\a", "b/c")` returns `C:\a\b\c` and the Scripting Runtime `C:\a\b/c`; `GetParentFolderName("C:/a/b.txt")` returns `C:\a` and the Scripting Runtime `C:/a`.
- [**GetAbsolutePathName**](FileSystemTools#getabsolutepathname) raises error 52 for an empty string, where the Scripting Runtime returns the current directory.
- [**GetDrive**](FileSystemTools#getdrive) accepts a full path and reduces it to its drive: `GetDrive("C:\Windows")` is `C:`. The Scripting Runtime raises error 5.
- [**CopyFile**](FileSystemTools#copyfile), [**CopyFolder**](FileSystemTools#copyfolder), [**MoveFile**](FileSystemTools#movefile) and [**MoveFolder**](FileSystemTools#movefolder) put the source inside an existing destination folder, whether or not the destination ends in a backslash. The Scripting Runtime does so only with a backslash. Without one it raises error 70 for **CopyFile**, 58 for **MoveFile** and **MoveFolder**, and **CopyFolder** copies the contents of the source straight into the folder.
- [**MoveFile**](FileSystemTools#movefile) moves a folder when *source* names one. The Scripting Runtime raises error 53.
- [**DeleteFolder**](FileSystemTools#deletefolder) of a folder that holds a read-only file raises error 75 without *force*; the Scripting Runtime raises 70.
- [**GetFileVersion**](FileSystemTools#getfileversion) returns an empty string for a file that does not exist. The Scripting Runtime raises an error.
- At the end of a stream, [**ReadAll**](TextStream#readall) returns an empty string and [**Skip**](TextStream#skip) does nothing, where the Scripting Runtime raises error 62. A closed stream raises 52 here and 91 there.
- [**Files.Item**](Files#item), [**Folders.Item**](Folders#item) and [**Drives.Item**](Drives#item) take a position as well as a name. A name that is not in the collection raises error 5; the Scripting Runtime raises 53, 76 and 68 for the three. `Drives("C:")` raises error 5, and the Scripting Runtime accepts it.
- [**GetTempName**](FileSystemTools#gettempname) returns eight random letters and digits and `.tmp`. The Scripting Runtime returns `rad` and five hexadecimal digits.
- A path longer than 260 characters works in most procedures. The Scripting Runtime does not accept it: **FileExists** and **FolderExists** return **False** for it, **GetFile** raises error 53 and **OpenTextFile** raises 76.
- [**StringToTextFile**](FileSystemTools#stringtotextfile), [**ArrayToTextFile**](FileSystemTools#arraytotextfile) and [**WriteStream**](FileSystemTools#writestream) replace a read-only file without an error. [**CreateTextFile**](FileSystemTools#createtextfile) raises error 70 for it, as the Scripting Runtime's does.

**The same.** For these failures the two raise the same error numbers: a missing file (53) or folder (76) from **GetFile**, **GetFolder**, **CopyFile**, **DeleteFile**, **DeleteFolder** and **OpenTextFile**; an existing folder or destination (58) from **CreateFolder**, **CopyFile**, **MoveFile** and **CreateTextFile**; a missing parent folder (76) from **CreateFolder**; a drive that does not exist (68) from **GetDrive**; a read-only destination or file (70) from **CopyFile**, **DeleteFile** and **CreateTextFile**; an unreadable folder (70) from **Files**, **SubFolders** and **Size**; the wrong direction of a stream (54) and a read at the end (62) from **TextStream**. Both enter a junction or symbolic link when they delete a folder, and both match a pattern against the 8.3 name of a file too.

## Using the package with the Scripting Runtime

The package declares types that have the same names as those of the Scripting Runtime library: **FileSystemObject**, **File**, **Folder**, **Drive**, **Files**, **Folders**, **Drives**, **TextStream**, and the enumerations **FileAttribute**, **IOMode**, **SpecialFolderConst**, **StandardStreamTypes** and **DriveTypeConst** with their members, such as **ForReading**, **Normal** and **Fixed**. In a project that references both libraries, a bare name is found in the library that is listed first among the references, and no error is reported for the other. With the package first, `Dim fso As New FileSystemObject` creates the package's class, and `Dim f As File` is the package's type. With the Scripting Runtime first, they are the Scripting Runtime's: `f.Encoding` then fails to compile (TB5027, *Unrecognized member 'Encoding' on type 'IFile'*), and `fso.BuildPath("C:\a", "b/c")` returns `C:\a\b/c`. The enumeration members (**ForReading**, **Normal**, **Fixed**) compile in either order, and their values are the same in both libraries.

Write the name of the library before the type to be sure which one is meant. Both forms compile in either order:

```tb check_build
Dim fso As New tbFileSysTools.FileSystemObject
Dim f As tbFileSysTools.File
Set f = fso.GetFile(fso.BuildPath(fso.GetSpecialFolder(sfSystemFolder), "kernel32.dll"))
Debug.Print f.Size
```

The other ways out are to remove the reference to the Scripting Runtime, or to list **tbFileSysTools** above it in the References dialog. The procedures of the module (**FileExists**, **GetFile**, **CopyFile** and the rest) do not collide with anything in the Scripting Runtime, which has no module-level procedures.

## Errors

The procedures raise the error numbers that VB6 uses for the same failures. **Err.Source** names the operation, such as `CopyFile`, and **Err.Description** names the path. The errors of [**OpenTextFile**](FileSystemTools#opentextfile), [**CreateTextFile**](FileSystemTools#createtextfile) and the other procedures that open a stream have an empty **Err.Source** and only the standard text of their number, without the path. Each entry says which numbers it raises.

- 5 -- *Invalid procedure call or argument*: a wildcard in a destination, a folder copied into itself, a text procedure given a binary file, a value that is not a member of an enumeration, a name that is not in a collection, and the *file not found!* of [**ReadStream**](FileSystemTools#readstream).
- 7 -- *Out of memory*: a whole file that is too large for one array or **String** (more than 2 GB).
- 9 -- *Subscript out of range*: a position outside a collection.
- 52 -- *Bad file name or number*: a name with a character that Windows does not allow, and a closed [**TextStream**](TextStream).
- 53 -- *File not found*.
- 54 -- *Bad file mode*: a read on a stream open for writing, or the reverse.
- 58 -- *File already exists*. The text says *File* also when a folder is in the way.
- 62 -- *Input past end of file*.
- 68 -- *Device unavailable*: a drive letter that is not in use.
- 70 -- *Permission denied*: access is refused, or the file is in use.
- 71 -- *Disk not ready*: a drive with no media.
- 75 -- *Path/File access error*: any other Windows failure. The text ends with the Windows code, such as 145 for a folder that is not empty and 206 for a path that is too long.
- 76 -- *Path not found*.

Windows reports a failure with its own code, and the package maps it to one of those numbers: *file not found* (2) to 53, *path not found* (3) and *bad directory name* (267) to 76, *file exists* (80 and 183) to 58, *access denied* and the sharing violations (5, 32 and 33) to 70, and *invalid name* (123) to 52.

> [!NOTE]
> Version 1.1.1.0 raises some errors that the Scripting Runtime does not raise, or other numbers. The sample shows the first three.
>
> - A file name with a character above U+7FFF, such as the Chinese character U+8A9E, the Hangul letter U+AC00 or an emoji, raises error 52 in [**StringToTextFile**](FileSystemTools#stringtotextfile), [**ArrayToTextFile**](FileSystemTools#arraytotextfile), [**CreateTextFile**](FileSystemTools#createtextfile), [**OpenTextFile**](FileSystemTools#opentextfile) with *create* **True**, the output file of [**MergeTextFiles**](FileSystemTools#mergetextfiles) and [**Folder.CreateTextFile**](Folder#createtextfile). The Scripting Runtime accepts the names, and so do [**WriteStream**](FileSystemTools#writestream) and [**CreateFolder**](FileSystemTools#createfolder).
> - A missing file raises error 5 and not 53 in [**TextFileToString**](FileSystemTools#textfiletostring), [**TextFileToArray**](FileSystemTools#textfiletoarray), [**GetFileEncoding**](FileSystemTools#getfileencoding), [**GetFileLineEnding**](FileSystemTools#getfilelineending), [**NormalizeTextFile**](FileSystemTools#normalizetextfile), [**ReadStream**](FileSystemTools#readstream) and the first file of [**MergeTextFiles**](FileSystemTools#mergetextfiles). [**OpenTextFile**](FileSystemTools#opentextfile) and [**GetFile**](FileSystemTools#getfile) raise 53.
> - A folder that does not exist raises the unspecified error -2147467259, not 76, in [**StringToTextFile**](FileSystemTools#stringtotextfile), [**ArrayToTextFile**](FileSystemTools#arraytotextfile) and [**WriteStream**](FileSystemTools#writestream). [**CreateTextFile**](FileSystemTools#createtextfile) and [**OpenTextFile**](FileSystemTools#opentextfile) raise 76.
> - [**Folder.Files**](Folder#files), [**SubFolders**](Folder#subfolders) and [**Size**](Folder#size) raise error 76 for a folder whose path has 258 characters or more.

```tb check_build check_run
Dim work As String, s As String, ts As TextStream
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work

On Error Resume Next
StringToTextFile "x", BuildPath(work, ChrW$(&H8A9E&) & ".txt")
Debug.Print Err.Number                              ' 52
Err.Clear
StringToTextFile "x", BuildPath(work, ChrW$(&H65E5&) & ".txt")
Debug.Print Err.Number                              ' 0
s = TextFileToString(BuildPath(work, "missing.txt"))
Debug.Print Err.Number                              ' 5
Err.Clear
Set ts = OpenTextFile(BuildPath(work, "missing.txt"))
Debug.Print Err.Number                              ' 53
Err.Clear
StringToTextFile "x", BuildPath(work, "nofolder\x.txt")
Debug.Print Err.Number                              ' -2147467259
Err.Clear
On Error GoTo 0

DeleteFolder work
```

Test with [**FileExists**](FileSystemTools#fileexists) first when the number of a missing-file error matters.

## Classes and modules

- [FileSystemTools](FileSystemTools) -- the module that holds the procedures, and the enumerations
  - [ArrayToTextFile](FileSystemTools#arraytotextfile) -- writes the elements of a String array to a text file, one per line
  - [BuildPath](FileSystemTools#buildpath) -- joins a folder path and a name
  - [CleanFileName](FileSystemTools#cleanfilename) -- removes from a file name the characters that Windows does not allow
  - [CopyFile](FileSystemTools#copyfile) -- copies one or more files
  - [CopyFolder](FileSystemTools#copyfolder) -- copies a folder and everything in it
  - [CreateFolder](FileSystemTools#createfolder) -- creates a folder
  - [CreateTextFile](FileSystemTools#createtextfile) -- creates a text file and returns a TextStream open for writing
  - [DeleteFile](FileSystemTools#deletefile) -- deletes one or more files
  - [DeleteFolder](FileSystemTools#deletefolder) -- deletes a folder and everything in it
  - [DriveExists](FileSystemTools#driveexists) -- returns whether a drive exists
  - [FileExists](FileSystemTools#fileexists) -- returns whether a file exists
  - [FolderExists](FileSystemTools#folderexists) -- returns whether a folder exists
  - [GetAbsolutePathName](FileSystemTools#getabsolutepathname) -- returns the full path for a path specification
  - [GetBaseName](FileSystemTools#getbasename) -- returns the last component of a path without its extension
  - [GetCurrentDir](FileSystemTools#getcurrentdir) -- returns the current directory
  - [GetDrive](FileSystemTools#getdrive) -- returns a Drive object
  - [GetDriveName](FileSystemTools#getdrivename) -- returns the drive part of a path
  - [GetDrives](FileSystemTools#getdrives) -- returns a Drives collection of every drive
  - [GetExtensionName](FileSystemTools#getextensionname) -- returns the extension of the last component of a path
  - [GetFile](FileSystemTools#getfile) -- returns a File object
  - [GetFileEncoding](FileSystemTools#getfileencoding) -- returns the text encoding of a file
  - [GetFileLineEnding](FileSystemTools#getfilelineending) -- returns the line-ending style of a text file
  - [GetFileName](FileSystemTools#getfilename) -- returns the last component of a path
  - [GetFilePaths](FileSystemTools#getfilepaths) -- returns the paths of the files in a folder
  - [GetFileType](FileSystemTools#getfiletype) -- returns the type description of a file or folder
  - [GetFileVersion](FileSystemTools#getfileversion) -- returns the version of an executable file
  - [GetFolder](FileSystemTools#getfolder) -- returns a Folder object
  - [GetParentFolderName](FileSystemTools#getparentfoldername) -- returns the path of the folder that holds the last component of a path
  - [GetRelativePath](FileSystemTools#getrelativepath) -- returns the path that leads from one path to another
  - [GetSpecialFolder](FileSystemTools#getspecialfolder) -- returns the path of a well-known Windows folder
  - [GetStandardStream](FileSystemTools#getstandardstream) -- returns a TextStream for standard input, output or error
  - [GetTempName](FileSystemTools#gettempname) -- returns a random name for a temporary file or folder
  - [MergeTextFiles](FileSystemTools#mergetextfiles) -- joins two text files into one
  - [MoveFile](FileSystemTools#movefile) -- moves one or more files
  - [MoveFolder](FileSystemTools#movefolder) -- moves one or more folders
  - [NormalizeTextFile](FileSystemTools#normalizetextfile) -- rewrites a text file with a chosen encoding and line ending
  - [OpenTextFile](FileSystemTools#opentextfile) -- opens a text file and returns a TextStream
  - [ReadStream](FileSystemTools#readstream) -- reads a file into a byte array
  - [Rename](FileSystemTools#rename) -- renames a file or folder in place
  - [SetCurrentDir](FileSystemTools#setcurrentdir) -- sets the current directory
  - [StringToTextFile](FileSystemTools#stringtotextfile) -- writes a string to a text file
  - [TextFileToArray](FileSystemTools#textfiletoarray) -- reads a text file into an array of lines
  - [TextFileToString](FileSystemTools#textfiletostring) -- reads a text file into a string
  - [WriteStream](FileSystemTools#writestream) -- writes a byte array to a file
  - [TextEncoding](FileSystemTools#textencoding), [NewlineType](FileSystemTools#newlinetype), [IOMode](FileSystemTools#iomode), [SpecialFolderConst](FileSystemTools#specialfolderconst), [FileAttribute](FileSystemTools#fileattribute), [FileVersionSource](FileSystemTools#fileversionsource) and [StandardStreamTypes](FileSystemTools#standardstreamtypes) -- the enumerations
- [FileSystemObject](FileSystemObject) -- a class with the procedures of the module as members, for code written for the Scripting Runtime
- [Drive](Drive) -- a disk drive or a network share
  - [AvailableSpace](Drive#availablespace) -- returns the free bytes that the current user can use
  - [DriveLetter](Drive#driveletter) -- returns the letter of the drive
  - [DriveType](Drive#drivetype) -- returns the type of the drive
  - [FileSystem](Drive#filesystem) -- returns the name of the file system
  - [FreeSpace](Drive#freespace) -- returns the free bytes on the volume
  - [IsReady](Drive#isready) -- returns whether the drive can be queried
  - [Path](Drive#path) -- returns the path of the drive (default member)
  - [RootFolder](Drive#rootfolder) -- returns the root folder of the drive
  - [SerialNumber](Drive#serialnumber) -- returns the serial number as a signed Long
  - [SerialNumberHex](Drive#serialnumberhex) -- returns the serial number in the form that Explorer shows
  - [ShareName](Drive#sharename) -- returns the network path of the drive
  - [TotalSize](Drive#totalsize) -- returns the size of the volume
  - [UnsignedSerialNumber](Drive#unsignedserialnumber) -- returns the serial number as an unsigned number
  - [VolumeName](Drive#volumename) -- returns or sets the label of the volume
- [Drives](Drives) -- the collection of the drives
- [File](File) -- a file
  - [Attributes](File#attributes), [DateCreated](File#datecreated), [DateLastAccessed](File#datelastaccessed), [DateLastModified](File#datelastmodified), [Drive](File#drive), [Encoding](File#encoding), [ExtensionName](File#extensionname), [HasAttribute](File#hasattribute), [LineEnding](File#lineending), [Name](File#name), [ParentFolder](File#parentfolder), [Path](File#path), [ShortName](File#shortname), [ShortPath](File#shortpath), [Size](File#size), [Type](File#type), [Version](File#version) -- the properties
  - [Copy](File#copy), [Delete](File#delete), [Move](File#move), [Normalize](File#normalize), [OpenAsTextStream](File#openastextstream), [Refresh](File#refresh), [Rename](File#rename), [SetAttribute](File#setattribute), [ToStream](File#tostream), [ToString](File#tostring) -- the methods
- [Files](Files) -- the collection of the files of a folder
- [Folder](Folder) -- a folder
  - [Attributes](Folder#attributes), [DateCreated](Folder#datecreated), [DateLastAccessed](Folder#datelastaccessed), [DateLastModified](Folder#datelastmodified), [Drive](Folder#drive), [Files](Folder#files), [HasAttribute](Folder#hasattribute), [IsRootFolder](Folder#isrootfolder), [Name](Folder#name), [ParentFolder](Folder#parentfolder), [Path](Folder#path), [ShortName](Folder#shortname), [ShortPath](Folder#shortpath), [Size](Folder#size), [SubFolders](Folder#subfolders), [Type](Folder#type) -- the properties
  - [Copy](Folder#copy), [CreateTextFile](Folder#createtextfile), [Delete](Folder#delete), [Move](Folder#move), [Refresh](Folder#refresh), [Rename](Folder#rename), [SetAttribute](Folder#setattribute) -- the methods
- [Folders](Folders) -- the collection of the folders of a folder
- [TextStream](TextStream) -- reads or writes a text file a piece at a time
  - [AtEndOfLine](TextStream#atendofline), [AtEndOfStream](TextStream#atendofstream), [Column](TextStream#column), [Encoding](TextStream#encoding), [IsStreaming](TextStream#isstreaming), [Line](TextStream#line) -- the properties
  - [Close](TextStream#close), [Flush](TextStream#flush), [Read](TextStream#read), [ReadAll](TextStream#readall), [ReadLine](TextStream#readline), [Skip](TextStream#skip), [SkipLine](TextStream#skipline), [Write](TextStream#write), [WriteBlankLines](TextStream#writeblanklines), [WriteLine](TextStream#writeline) -- the methods

## See Also

- [Open](../../../Core/Open) statement -- the VBA statement that opens a file for input and output
- [FileSystem](../../../Modules/FileSystem/) module -- the VBA functions and statements for files and folders: **FileCopy**, **Kill**, **MkDir**, **Dir** and the rest
- [FileProps](../FileProps/) package -- the Windows shell properties of a file
- [TBMANLIB_Dialog](../TBMANLIB_Dialog/) package -- the Open, Save and folder dialogs, with path helpers
- [tbRegExp](../tbRegExp/) package -- regular expressions, by the same author
