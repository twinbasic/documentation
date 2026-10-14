---
title: File
parent: tbFileSysTools Package
permalink: /tB/Packages/Contributed/tbFileSysTools/File
has_toc: false
---

# File class
{: .no_toc }

A **File** represents one file on disk: its name, size, dates and attributes, and operations to copy, move, rename and delete it, to open it as a [**TextStream**](TextStream) and to read its content. It has the members of the **File** of the Scripting Runtime, and adds [**ContainsText**](#containstext), [**Encoding**](#encoding), [**IsLocked**](#islocked), [**LineEnding**](#lineending), [**Normalize**](#normalize), [**Refresh**](#refresh), [**HasAttribute**](#hasattribute), [**SetAttribute**](#setattribute), [**ToString**](#tostring), [**ToStream**](#tostream), [**ExtensionName**](#extensionname) and [**Version**](#version).

A **File** is not created with **New**. [**GetFile**](FileSystemTools#getfile) returns one, and so does the [**Files**](Files) collection of a [**Folder**](Folder#files).

```tb check_build check_run
Dim work As String, f As File
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work
StringToTextFile "hello", BuildPath(work, "Report.TXT")

Set f = GetFile(BuildPath(work, "report.txt"))
Debug.Print f.Name                       ' Report.TXT
Debug.Print f.ExtensionName              ' TXT
Debug.Print f.Size                       ' 5
Debug.Print f.HasAttribute(faReadOnly)   ' False

f.SetAttribute faReadOnly, True
Debug.Print f.HasAttribute(faReadOnly)   ' True
f.SetAttribute faReadOnly, False

f.Name = "renamed.txt"
Debug.Print f.Name                       ' renamed.txt

f.Delete
On Error Resume Next
Dim n As LongLong
n = f.Size
Debug.Print Err.Number                   ' 53

DeleteFolder work
```

## A File reads the disk each time

A **File** keeps only the path of the file. Each member that reads a property looks at the file again, so the values are never out of date, and a file that was deleted or renamed by something else raises error 53 (*File not found*) at the next use. The name is returned with the letter case that the file system stores, whatever case was used to get the object.

The price is that every read costs a call to Windows. Read a value once and keep it, rather than reading it in a loop. These cost more than the rest:

- [**Encoding**](#encoding) reads the first 32 KB of the file.
- [**ContainsText**](#containstext) and [**LineEnding**](#lineending) read the whole file.
- [**Version**](#version) reads the version resource of the file.
- [**Type**](#type) asks the Windows shell.

The members that change the file ([**Move**](#move), [**Rename**](#rename), [**Name**](#name) and [**Delete**](#delete)) are those of [**FileSystemTools**](FileSystemTools), with the object's path as the source: their errors are described there. **Move** and **Rename** point the object at the new path, so it stays usable. [**Copy**](#copy) leaves the object as it is and does not return the copy; call [**GetFile**](FileSystemTools#getfile) on the destination for that. After **Delete**, every member that reads raises error 53.

## Properties

### Attributes
{: .no_toc }

The attributes of the file.

Syntax: *object*.**Attributes** [ **=** *value* ]

Reading returns a [**FileAttribute**](FileSystemTools#fileattribute) combination of every attribute that the file system reports, including those that cannot be set, such as **faCompressed** and **faReparsePoint**. Setting replaces the settable attributes with *value*; the other bits are dropped without an error, so reading the value and writing it back changes nothing. **faNormal** clears all settable attributes, also when it is combined with others. **faNoChange** does nothing. To change one attribute and leave the rest, use [**SetAttribute**](#setattribute).

Raises error 53 when the file does not exist.

### DateCreated
{: .no_toc }

The date and time at which the file was created.

Syntax: *object*.**DateCreated** **As Date**

The value is in local time and has a resolution of one second. It is the date 0 (30 December 1899) when the file system does not hold a value.

### DateLastAccessed
{: .no_toc }

The date and time at which the file was last read or written.

Syntax: *object*.**DateLastAccessed** **As Date**

Local time, to the second. Windows can be set to update this value late or not at all. It is the date 0 when the file system holds no value.

### DateLastModified
{: .no_toc }

The date and time at which the content of the file was last changed.

Syntax: *object*.**DateLastModified** **As Date**

Local time, to the second.

### Drive
{: .no_toc }

The drive that holds the file.

Syntax: *object*.**Drive** **As Drive**

Returns the [**Drive**](Drive) of the path, for a network path the share.

### Encoding
{: .no_toc }

The text encoding of the file.

Syntax: *object*.**Encoding** **As TextEncoding**

The same as [**GetFileEncoding**](FileSystemTools#getfileencoding): a [**TextEncoding**](FileSystemTools#textencoding) member, negative when the file starts with a BOM, and **encUnknown** for an empty or binary file. The first 32 KB of the file are read on each call.

### ExtensionName
{: .no_toc }

The extension of the file name.

Syntax: *object*.**ExtensionName** **As String**

What follows the last dot of the name, without the dot, with the letter case that the file system stores. An empty string when the name has no dot. See [**GetExtensionName**](FileSystemTools#getextensionname).

### HasAttribute
{: .no_toc }

Whether an attribute is set.

Syntax: *object*.**HasAttribute** ( *attr* ) **As Boolean**

*attr*
: *required* A [**FileAttribute**](FileSystemTools#fileattribute) member, any attribute including those that cannot be set.

**True** when the attribute is set. The test is for any bit: with a combination such as `faHidden Or faSystem` it is **True** when either is set. Test one attribute at a time for "all of them".

### LineEnding
{: .no_toc }

The line-ending style of the file.

Syntax: *object*.**LineEnding** **As NewlineType**

The same as [**GetFileLineEnding**](FileSystemTools#getfilelineending) with the encoding of [**Encoding**](#encoding): a [**NewlineType**](FileSystemTools#newlinetype) member. The whole file is read on each call, so assign the value once. Raises error 5 for a binary file and error 7 for a file of more than 2 GB.

### Name
{: .no_toc }

The name of the file.

Syntax: *object*.**Name** [ **=** *newName* ]

The name, without its folder, with the letter case that the file system stores. Setting it renames the file as [**Rename**](#rename) does.

### ParentFolder
{: .no_toc }

The folder that holds the file.

Syntax: *object*.**ParentFolder** **As Folder**

Returns the [**Folder**](Folder). A file always has one.

### Path
{: .no_toc }

The full path of the file. This is the default member, so an object used where a string is wanted gives its path.

Syntax: *object*.**Path** **As String**

The folder part has the spelling that was used to get the object, and the name has the letter case that the file system stores.

### ShortName
{: .no_toc }

The 8.3 short name of the file.

Syntax: *object*.**ShortName** **As String**

The short name, or the ordinary name when the file has none. Compare the result with [**Name**](#name) to see whether a short name was found.

### ShortPath
{: .no_toc }

The 8.3 short path of the file.

Syntax: *object*.**ShortPath** **As String**

The short path, or the full path unchanged when none is available, for the reasons given for [**ShortName**](#shortname).

### Size
{: .no_toc }

The size of the file, in bytes.

Syntax: *object*.**Size** **As LongLong**

Exact for a file of any size, 4 GB and more included.

### Type
{: .no_toc }

The type description of the file.

Syntax: *object*.**Type** **As String**

What [**GetFileType**](FileSystemTools#getfiletype) returns, such as `Application` for an `.exe` file. The Scripting Runtime's **Type** returns the same string.

### Version
{: .no_toc }

The version of an executable file.

Syntax: *object*.**Version** [ ( *source* ) ] **As String**

*source*
: *optional* A [**FileVersionSource**](FileSystemTools#fileversionsource) member. Default: **fvFixed**.

The same as [**GetFileVersion**](FileSystemTools#getfileversion): an empty string for a file that has no version resource, which is most files.

## Methods

### ContainsText
{: .no_toc }

Whether the file holds a piece of text.

Syntax: *object*.**ContainsText** ( *searchText* [, *ignoreCase* ] ) **As Boolean**

*searchText*
: *required* A **String**, the text to look for. It must not be empty. Every character stands for itself: `*` and `?` are not wildcards.

*ignoreCase*
: *optional* A **Boolean**. **True** (default) ignores the letter case of the text. **False** compares the characters exactly.

The same as [**FileContainsText**](FileSystemTools#filecontainstext) for the path of the file: **True** when the text of the file, read in the encoding that [**Encoding**](#encoding) finds, holds *searchText*. **False** for an empty file and for a file that looks like binary data. Raises error 5 when *searchText* is empty.

```tb check_build check_run
Dim work As String, f As File
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work
StringToTextFile "Hello World", BuildPath(work, "a.txt")
Set f = GetFile(BuildPath(work, "a.txt"))

Debug.Print f.ContainsText("world")             ' True
Debug.Print f.ContainsText("world", False)      ' False
Debug.Print f.IsLocked                          ' False
Debug.Print f.Encoding = encUtf8                ' True

DeleteFolder work
```

### Copy
{: .no_toc }

Copies the file.

Syntax: *object*.**Copy** ( *destination* [, *overwrite* ] )

*destination*
: *required* A **String**, the new file or an existing folder.

*overwrite*
: *optional* A **Boolean**. **True** (default) replaces an existing file.

See [**CopyFile**](FileSystemTools#copyfile) for the rules and errors.

### Delete
{: .no_toc }

Deletes the file.

Syntax: *object*.**Delete** ( [ *force* ] )

*force*
: *optional* A **Boolean**. **True** clears the read-only, hidden and system attributes first. Default: **False**.

See [**DeleteFile**](FileSystemTools#deletefile). The object cannot be used afterwards: its members raise error 53.

### IsLocked
{: .no_toc }

Whether the file is in use.

Syntax: *object*.**IsLocked** **As Boolean**

The same as [**IsFileLocked**](FileSystemTools#isfilelocked) for the path of the file: **True** when the file cannot be opened for reading and writing with exclusive access at this moment, because a program has it open or because it is read-only. The answer holds for the instant of the call only. Raises error 53 when the file does not exist.

### Move
{: .no_toc }

Moves the file.

Syntax: *object*.**Move** ( *destination* )

*destination*
: *required* A **String**, the new full name of the file or an existing folder.

See [**MoveFile**](FileSystemTools#movefile) for the rules and errors. The object then names the file at its new place.

### Normalize
{: .no_toc }

Rewrites a text file with a chosen encoding and line ending.

Syntax: *object*.**Normalize** ( [ *toEncoding* [, *toLineEnding* [, *fromEncoding* [, *toAttributes* ] ] ] ] ) **As Boolean**

The arguments, their defaults and the result are those of [**NormalizeTextFile**](FileSystemTools#normalizetextfile), where *toLineEnding* is called *toNewLine*: **encUtf8**, **nlWindows**, **encAutoDetect** and **faNoChange**. Returns **True** when the file was changed. The object reads the file again afterwards.

### OpenAsTextStream
{: .no_toc }

Opens the file as a text stream.

Syntax: *object*.**OpenAsTextStream** ( [ *ioMode* [, *encoding* [, *writeModeLineEnding* ] ] ] ) **As TextStream**

*ioMode*
: *optional* An [**IOMode**](FileSystemTools#iomode) member. Default: **ForReading**.

*encoding*
: *optional* A [**TextEncoding**](FileSystemTools#textencoding) member. Default: **encAutoDetect**.

*writeModeLineEnding*
: *optional* A [**NewlineType**](FileSystemTools#newlinetype) member for [**WriteLine**](TextStream#writeline). Default: **nlWindows**.

Returns a [**TextStream**](TextStream); the rules are those of [**OpenTextFile**](FileSystemTools#opentextfile) with *create* **False**.

<!-- test: AttributeTests.OpenAsTextStream_ForWriting_EmptiesFile, AttributeTests.OpenAsTextStream_ForAppending_KeepsText -->
> [!WARNING]
> **ForWriting** empties the file when the stream is opened. Use **ForAppending** to add to it.

### Refresh
{: .no_toc }

Reads the attributes, size and dates again.

Syntax: *object*.**Refresh**

Every member that reads a property already does this, so the method is needed only to test that the file still exists. Raises error 53 when it does not.

### Rename
{: .no_toc }

Renames the file.

Syntax: *object*.**Rename** ( *newName* )

*newName*
: *required* A **String**, a bare name or a path to the same folder.

See [**Rename**](FileSystemTools#rename) for the rules and errors. The object then names the file under its new name.

### SetAttribute
{: .no_toc }

Sets or clears one attribute.

Syntax: *object*.**SetAttribute** ( *attr*, *state* )

*attr*
: *required* A [**FileAttribute**](FileSystemTools#fileattribute) member. Only a settable attribute has an effect: **faReadOnly**, **faHidden**, **faSystem**, **faArchive**, **faTemporary** and **faNotContentIndexed**.

*state*
: *required* A **Boolean**. **True** sets the attribute and **False** clears it. The other attributes stay as they are.

<!-- test: AttributeTests.FileSetAttribute_NoAttributes_SetsHidden, AttributeTests.FileSetAttribute_NoAttributes_SetsReadOnly, AttributeTests.FileSetAttribute_ArchiveFile_SetsHidden, AttributeTests.FileAttributes_Assigned_SetsHidden, AttributeTests.FolderSetAttribute_SetsHidden -->
> [!WARNING] 1.9.0.0
> **SetAttribute** sets nothing, and raises no error, on a file that has no attribute at all, because [**Attributes**](#attributes) then reports **faNormal**, and **faNormal** wins over the attribute being set. A new file has the archive attribute, so it is a file from which the program cleared every attribute that this applies to. To give such a file an attribute, assign [**Attributes**](#attributes). The same method of a [**Folder**](Folder#setattribute) is not affected.

```tb check_build check_run
Dim work As String, f As File
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work
StringToTextFile "x", BuildPath(work, "a.txt")
Set f = GetFile(BuildPath(work, "a.txt"))

Debug.Print f.Attributes                  ' 32
f.SetAttribute faHidden, True
Debug.Print f.Attributes                  ' 34
f.SetAttribute faHidden, False
f.SetAttribute faArchive, False
Debug.Print f.Attributes                  ' 128
f.SetAttribute faHidden, True             ' sets nothing
Debug.Print f.Attributes                  ' 128
f.Attributes = faHidden                   ' this works
Debug.Print f.Attributes                  ' 2

DeleteFolder work, True
```

### ToStream
{: .no_toc }

Reads the file into a byte array.

Syntax: *object*.**ToStream** ( [ *maxBytesToRead* ] ) **As Byte()**

*maxBytesToRead*
: *optional* A **Long**. A value of 0 or more reads at most that many bytes from the start. Default: -1, the whole file.

See [**ReadStream**](FileSystemTools#readstream). The array is not dimensioned for an empty file; test it with [**IsArrayInitialized**](../../../Modules/Information/IsArrayInitialized).

### ToString
{: .no_toc }

Reads the file as text.

Syntax: *object*.**ToString** ( [ *encoding* [, *lineEnding* ] ] ) **As String**

*encoding*
: *optional* A [**TextEncoding**](FileSystemTools#textencoding) member. Default: **encAutoDetect**.

*lineEnding*
: *optional* A [**NewlineType**](FileSystemTools#newlinetype) member to convert the line endings to. Default: **nlNoChange**.

See [**TextFileToString**](FileSystemTools#textfiletostring). Raises error 5 for a binary file and error 7 for a file of more than 2 GB. The text is read in one piece; for a large file, open a stream with [**OpenAsTextStream**](#openastextstream).

## See Also

- [Folder](Folder) class -- the folder that holds a file, and the collection of its files
- [Files](Files) class -- the collection of the files of a folder
- [FileSystemTools](FileSystemTools#getfile) module -- **GetFile** returns a **File**
- [TextStream](TextStream) class -- the stream that **OpenAsTextStream** returns
- [FileLen](../../../Modules/FileSystem/FileLen) function -- the VBA function that returns the size of a file
- [GetAttr](../../../Modules/FileSystem/GetAttr) function -- the VBA function that returns the attributes of a file
- [SetAttr](../../../Modules/FileSystem/SetAttr) statement -- the VBA statement that sets the attributes of a file
- [FileDateTime](../../../Modules/FileSystem/FileDateTime) function -- the VBA function that returns the date of a file
