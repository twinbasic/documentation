---
title: Dir
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/Dir
redirect_from:
-  /tB/Core/Dir
vba_attribution: true
---
# Dir
{: .no_toc }

Returns a **String** representing the name of a file, directory, or folder that matches a specified pattern or file attribute, or the volume label of a drive.

Syntax: **Dir** [ **(** *pathname* [ **,** *attributes* ] **)** ]

*pathname*
: *optional* String expression that specifies a file name; may include directory or folder, and drive. A zero-length string (`""`) is returned if *pathname* is not found.

*attributes*
: *optional* Constant or numeric expression, whose sum specifies file attributes. If omitted, returns files that match *pathname* but have no attributes.

> [!NOTE]
> **Dir** ignores a bit of *attributes* that the table below does not list, so -1 returns every kind of entry, as 23 (**vbReadOnly** + **vbHidden** + **vbSystem** + **vbDirectory**) does. VB6 and 64-bit VBA raise error 5, *Invalid procedure call or argument*, for any value above 63 or below 0. A *pathname* that is not a **String**, such as a number or a **Boolean**, is converted to one, as in **ChDir**: `Dir(5)` looks for a file named 5. VB6 and 64-bit VBA raise error 13, *Type mismatch*, for it.

The *attributes* argument settings are:

| Constant        | Value | Description                                                                              |
|-----------------|-------|------------------------------------------------------------------------------------------|
| **vbNormal**    | 0     | (Default) Specifies files with no attributes.                                            |
| **vbReadOnly**  | 1     | Specifies read-only files in addition to files with no attributes.                       |
| **vbHidden**    | 2     | Specifies hidden files in addition to files with no attributes.                          |
| **vbSystem**    | 4     | Specifies system files in addition to files with no attributes.                          |
| **vbVolume**    | 8     | Specifies volume label; if any other attribute is specified, **vbVolume** is ignored.    |
| **vbDirectory** | 16    | Specifies directories or folders in addition to files with no attributes.                |

**Dir** supports the use of multiple-character (`*`) and single-character (`?`) wildcards to specify multiple files.

The first call to **Dir** must specify *pathname*, or an error occurs. When file attributes are also specified, *pathname* must be included.

**Dir** returns the first file name that matches *pathname*. To get any additional file names that match *pathname*, call **Dir** again with no arguments. When no more file names match, **Dir** returns a zero-length string (`""`). After a zero-length string is returned, the next call must specify *pathname*.

A new *pathname* can be specified without first retrieving all of the file names that match the current *pathname*. However, **Dir** cannot be called recursively. Calling **Dir** with the **vbDirectory** attribute does not continually return subdirectories.

> [!TIP]
> Because file names are retrieved in case-insensitive order on Windows, consider storing returned file names in an array and sorting the array.

<!-- errors: generated from errors/VBA.FileSystem.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | **Dir** is called without *pathname* after it has returned a zero-length string<br>*pathname* names a file and ends in a backslash<br>a name in *pathname* is longer than 255 characters |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *pathname* is **Null**<br>*attributes* is **Null** |

> [!NOTE] BETA 1010
> When **Dir** is called without *pathname* after it has returned a zero-length string, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

> [!NOTE] BETA 1010
> When *pathname* names a file and ends in a backslash, VB6 and 64-bit VBA raise error [52 (`&H34`)](tb:Errors#52), *Bad file name or number*, instead.

> [!NOTE] BETA 1010
> When a name in *pathname* is longer than 255 characters, VB6 and 64-bit VBA raise error [53 (`&H35`)](tb:Errors#53), *File not found*, instead.

> [!NOTE] BETA 1010
> When *pathname* is **Null**, VB6 and 64-bit VBA raise error [13 (`&HD`)](tb:Errors#13), *Type mismatch*, instead.

<!-- /errors -->

### See Also

- [ChDir](ChDir), [ChDrive](ChDrive), [MkDir](MkDir), [RmDir](RmDir) statements
- [CurDir](CurDir) function

### Example

This example uses the **Dir** function to check whether certain files and directories exist, and to enumerate files in a folder.

```tb check_build
Dim MyFile, MyPath, MyName

' Returns "WIN.INI" (on Microsoft Windows) if it exists.
MyFile = Dir("C:\WINDOWS\WIN.INI")

' Returns filename with specified extension. If more than one *.ini
' file exists, the first file found is returned.
MyFile = Dir("C:\WINDOWS\*.INI")

' Call Dir again without arguments to return the next *.ini file in
' the same directory.
MyFile = Dir

' Return first *.txt file, including files with a set hidden attribute.
MyFile = Dir("*.TXT", vbHidden)

' Display the names in C:\ that represent directories.
MyPath = "c:\"                       ' Set the path.
MyName = Dir(MyPath, vbDirectory)    ' Retrieve the first entry.
Do While MyName <> ""                ' Start the loop.
    ' Ignore the current directory and the encompassing directory.
    If MyName <> "." And MyName <> ".." Then
        ' Use bitwise comparison to make sure MyName is a directory.
        If (GetAttr(MyPath & MyName) And vbDirectory) = vbDirectory Then
            Debug.Print MyName       ' Display entry only if it
        End If                       ' represents a directory.
    End If
    MyName = Dir                     ' Get next entry.
Loop
```
