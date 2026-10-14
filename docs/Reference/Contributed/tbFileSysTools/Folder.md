---
title: Folder
parent: tbFileSysTools Package
permalink: /tB/Packages/Contributed/tbFileSysTools/Folder
has_toc: false
---

# Folder class
{: .no_toc }

A **Folder** represents one folder on disk: its name, dates, attributes and total size, the files and subfolders in it, and operations to copy, move, rename and delete it. It has the members of the **Folder** of the Scripting Runtime, and adds [**HasAttribute**](#hasattribute), [**SetAttribute**](#setattribute), [**Refresh**](#refresh) and [**Rename**](#rename).

A **Folder** is not created with **New**. [**GetFolder**](FileSystemTools#getfolder) and [**CreateFolder**](FileSystemTools#createfolder) return one, and so do [**SubFolders**](#subfolders), [**ParentFolder**](#parentfolder) and [**Drive.RootFolder**](Drive#rootfolder).

```tb check_build check_run
Dim work As String, fd As Folder, f As File
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder BuildPath(work, "sub"), True
StringToTextFile "hello", BuildPath(work, "a.txt")
StringToTextFile "hello world", BuildPath(work, "b.txt")
StringToTextFile "abc", BuildPath(work, "sub\c.txt")

Set fd = GetFolder(work)
Debug.Print fd.Files.Count
Debug.Print fd.SubFolders.Count
Debug.Print fd.Size
For Each f In fd.Files
    Debug.Print f.Name & " " & f.Size
Next
' Output:
' 2
' 1
' 19
' a.txt 5
' b.txt 11

DeleteFolder work
```

## A Folder reads the disk each time

A **Folder** keeps only the path of the folder. Each member that reads a property looks at the folder again, so the values are never out of date, and a folder that was deleted or renamed by something else raises error 76 (*Path not found*) at the next use. The name is returned with the letter case that the file system stores. [**Rename**](#rename) and the [**Name**](#name) setter raise error 53 instead for a folder that is gone.

The price is that every read costs a call to Windows. Read a value once and keep it. [**Size**](#size) costs the most: it goes through the whole tree on every read.

[**Files**](#files) and [**SubFolders**](#subfolders) return the members of the folder at the moment of the call. The collection does not follow later changes, so the property is read again to see them. The one change a collection follows is a folder that [**Folders.Add**](Folders#add) creates through it. The objects in it are live, as every **File** and **Folder** is.

The members that change the folder ([**Move**](#move), [**Rename**](#rename), [**Name**](#name) and [**Delete**](#delete)) are those of [**FileSystemTools**](FileSystemTools), with the object's path as the source: their errors are described there. **Move** and **Rename** point the object at the new path, so it stays usable. [**Copy**](#copy) leaves the object as it is and does not return the copy. After **Delete**, every member that reads raises error 76.

## Properties

### Attributes
{: .no_toc }

The attributes of the folder.

Syntax: *object*.**Attributes** [ **=** *value* ]

Reading returns a [**FileAttribute**](FileSystemTools#fileattribute) combination of every attribute that the file system reports, **faDirectory** among them. Setting replaces the settable attributes with *value*; the other bits are dropped without an error. **faNormal** clears all settable attributes, also when it is combined with others. **faNoChange** does nothing. To change one attribute and leave the rest, use [**SetAttribute**](#setattribute).

Raises error 76 when the folder does not exist, and error 70 when Windows refuses the change.

### DateCreated
{: .no_toc }

The date and time at which the folder was created.

Syntax: *object*.**DateCreated** **As Date**

Local time, to the second. It is the date 0 (30 December 1899) when the file system holds no value.

### DateLastAccessed
{: .no_toc }

The date and time at which the folder was last accessed.

Syntax: *object*.**DateLastAccessed** **As Date**

Local time, to the second. Windows can be set to update this value late or not at all.

### DateLastModified
{: .no_toc }

The date and time at which the folder was last changed.

Syntax: *object*.**DateLastModified** **As Date**

Local time, to the second.

### Drive
{: .no_toc }

The drive that holds the folder.

Syntax: *object*.**Drive** **As Drive**

Returns the [**Drive**](Drive) of the path, for a network path the share.

### Files
{: .no_toc }

The files in the folder.

Syntax: *object*.**Files** **As Files**

Returns a [**Files**](Files) collection of the files directly in the folder. Hidden and system files are in it, which differs from [**GetFilePaths**](FileSystemTools#getfilepaths). The folder is read when the property is read, and the collection does not change afterwards. Raises error 70 when the folder cannot be read, as the Scripting Runtime does.

<!-- test: LongPathTests.FolderFiles_Path258_ListsFiles, LongPathTests.FolderFiles_Path270_ListsFiles, LongPathTests.FolderSubFolders_Path258_ListsFolders, LongPathTests.FolderSize_Path258_AddsFiles, LongPathTests.FolderSize_SubfolderPath258_AddsFiles, LongPathTests.FolderFilesAndSubFolders_Path256_Work, LongPathTests.FolderSize_Path256_Works, LongPathTests.FolderFilesAndSubFolders_Path257_Work, LongPathTests.FolderSize_Path257_Works -->
> [!NOTE]
> In version 1.9.0.0, **Files**, [**SubFolders**](#subfolders) and [**Size**](#size) raise error 76 (*Path not found*) for a folder whose path has 258 characters or more, although the folder exists and its [**Name**](#name) can be read. The same members work for a folder with 256 characters.

```tb check_build check_run
Dim work As String, deep As String, n As Long
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
deep = work
Do While Len(deep) < 270
    deep = BuildPath(deep, String$(25, "d"))
Loop
CreateFolder deep, True

Debug.Print Len(GetFolder(deep).Name)      ' 25
On Error Resume Next
n = GetFolder(deep).Files.Count
Debug.Print Err.Number                     ' 76
Err.Clear
On Error GoTo 0

DeleteFolder work
```

### HasAttribute
{: .no_toc }

Whether an attribute is set.

Syntax: *object*.**HasAttribute** ( *attr* ) **As Boolean**

*attr*
: *required* A [**FileAttribute**](FileSystemTools#fileattribute) member, any attribute including those that cannot be set.

**True** when the attribute is set. The test is for any bit: with a combination such as `faHidden Or faSystem` it is **True** when either is set.

### IsRootFolder
{: .no_toc }

Whether the folder is the root of its drive.

Syntax: *object*.**IsRootFolder** **As Boolean**

**True** for `C:\`, and for the root of a network share, `\\server\share`.

### Name
{: .no_toc }

The name of the folder.

Syntax: *object*.**Name** [ **=** *newName* ]

The name, without the folder above it, with the letter case that the file system stores. It is an empty string for a drive root. Setting it renames the folder as [**Rename**](#rename) does.

### ParentFolder
{: .no_toc }

The folder that holds this folder.

Syntax: *object*.**ParentFolder** **As Folder**

Returns the [**Folder**](Folder) above, or **Nothing** for a drive root. This is not an error.

### Path
{: .no_toc }

The full path of the folder. This is the default member, so an object used where a string is wanted gives its path.

Syntax: *object*.**Path** **As String**

The part above the last name has the spelling that was used to get the object, and the last name has the letter case that the file system stores.

### ShortName
{: .no_toc }

The 8.3 short name of the folder.

Syntax: *object*.**ShortName** **As String**

The short name, or the ordinary name when the folder has none. Compare the result with [**Name**](#name) to see whether a short name was found.

### ShortPath
{: .no_toc }

The 8.3 short path of the folder.

Syntax: *object*.**ShortPath** **As String**

The short path, or the full path unchanged when none is available, for the reasons given for [**ShortName**](#shortname).

### Size
{: .no_toc }

The total size of the files in the folder and in all folders below it, in bytes.

Syntax: *object*.**Size** **As LongLong**

The tree is read again on every call, which takes time for a large tree. Hidden and system files are counted. A directory junction or symbolic link is not entered, so each file is counted once, where it is stored. The Scripting Runtime enters a link, and counts the files below its target twice when the link leads to a folder in the same tree: for a folder that holds 1,500 bytes, with a junction to one of its subfolders, **Size** returns 1,500 here and 2,500 with the Scripting Runtime (the sample under [Junctions and symbolic links](FileSystemTools#junctions-and-symbolic-links) shows it).

Raises error 70 when a folder in the tree cannot be read, as the Scripting Runtime does. Raises error 76 when the folder, or a folder below it, has a path of 258 characters or more; see [Files](#files).

### SubFolders
{: .no_toc }

The folders directly in the folder.

Syntax: *object*.**SubFolders** **As Folders**

Returns a [**Folders**](Folders) collection of the folders directly below this one. Hidden and system folders are in it. The folder is read when the property is read, and the collection does not change afterwards, except that [**Folders.Add**](Folders#add) puts the folder it creates into it. Raises error 70 when the folder cannot be read.

### Type
{: .no_toc }

The type description of the folder.

Syntax: *object*.**Type** **As String**

What the Windows shell calls a folder, `File folder` in an English system, the same string as the Scripting Runtime. When the shell cannot answer, the text is `File folder`.

## Methods

### Copy
{: .no_toc }

Copies the folder and its contents.

Syntax: *object*.**Copy** ( *destination* [, *overwrite* ] )

*destination*
: *required* A **String**, the new folder or an existing folder to copy into.

*overwrite*
: *optional* A **Boolean**. **True** (default) replaces existing files.

See [**CopyFolder**](FileSystemTools#copyfolder) for the rules and errors, including what happens to a link inside the folder.

### CreateTextFile
{: .no_toc }

Creates a text file in the folder.

Syntax: *object*.**CreateTextFile** ( *fileName* [, *overwrite* [, *encoding* [, *lineEnding* ] ] ] ) **As TextStream**

*fileName*
: *required* A **String**, the name of the file, or a relative path below the folder.

*overwrite*
: *optional* A **Boolean**. **True** (default) empties an existing file. **False** raises error 58 when it exists.

*encoding*
: *optional* A [**TextEncoding**](FileSystemTools#textencoding) member. Default: **encUtf8**, without a BOM.

*lineEnding*
: *optional* A [**NewlineType**](FileSystemTools#newlinetype) member for [**WriteLine**](TextStream#writeline). Default: **nlWindows**.

Returns a [**TextStream**](TextStream) open for writing, as [**CreateTextFile**](FileSystemTools#createtextfile) does for the path of the folder and *fileName* joined. The third argument is an encoding and not the Boolean *Unicode* of the Scripting Runtime; see the note at that procedure.

### Delete
{: .no_toc }

Deletes the folder and its contents.

Syntax: *object*.**Delete** ( [ *force* ] )

*force*
: *optional* A **Boolean**. **True** clears the read-only, hidden and system attributes as the contents are deleted. Default: **False**.

See [**DeleteFolder**](FileSystemTools#deletefolder), including its note about links. The object cannot be used afterwards: its members raise error 76.

### Move
{: .no_toc }

Moves the folder.

Syntax: *object*.**Move** ( *destination* )

*destination*
: *required* A **String**, the new full name of the folder or an existing folder to move into.

See [**MoveFolder**](FileSystemTools#movefolder) for the rules and errors. The object then names the folder at its new place.

### Refresh
{: .no_toc }

Reads the attributes and dates again.

Syntax: *object*.**Refresh**

Every member that reads a property already does this, so the method is needed only to test that the folder still exists. Raises error 76 when it does not.

### Rename
{: .no_toc }

Renames the folder.

Syntax: *object*.**Rename** ( *newName* )

*newName*
: *required* A **String**, a bare name or a path to the same parent folder.

See [**Rename**](FileSystemTools#rename) for the rules and errors. The object then names the folder under its new name.

### SetAttribute
{: .no_toc }

Sets or clears one attribute.

Syntax: *object*.**SetAttribute** ( *attr*, *state* )

*attr*
: *required* A [**FileAttribute**](FileSystemTools#fileattribute) member. Only a settable attribute has an effect: **faReadOnly**, **faHidden**, **faSystem**, **faArchive**, **faTemporary** and **faNotContentIndexed**.

*state*
: *required* A **Boolean**. **True** sets the attribute and **False** clears it. The other attributes stay as they are.

## See Also

- [File](File) class -- a file, and the members of the **Files** collection
- [Files](Files) class and [Folders](Folders) class -- the collections that **Files** and **SubFolders** return
- [Drive](Drive) class -- the drive that holds a folder
- [FileSystemTools](FileSystemTools#getfolder) module -- **GetFolder** and **CreateFolder** return a **Folder**
- [MkDir](../../../Modules/FileSystem/MkDir) statement -- the VBA statement that creates a folder
- [RmDir](../../../Modules/FileSystem/RmDir) statement -- the VBA statement that removes an empty folder
- [Dir](../../../Modules/FileSystem/Dir) function -- the VBA function that lists the files of a folder
