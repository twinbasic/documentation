---
title: Dir
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/Dir
redirect_from:
-  /tB/Core/Dir
---
# Dir
{: .no_toc }

Returns a **String** representing the name of a file, directory, or folder that matches a specified pattern or file attribute, or the volume label of a drive.

Syntax: **Dir** [ **(** *pathname* [ **,** *attributes* ] **)** ]

*pathname*
: *optional* String expression that specifies a file name; may include directory or folder, and drive. A zero-length string (`""`) is returned if *pathname* is not found.

*attributes*
: *optional* Constant or numeric expression, whose sum specifies file attributes. If omitted, returns files that match *pathname* but have no attributes.

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

You must specify *pathname* the first time you call the **Dir** function, or an error occurs. If you also specify file attributes, *pathname* must be included.

**Dir** returns the first file name that matches *pathname*. To get any additional file names that match *pathname*, call **Dir** again with no arguments. When no more file names match, **Dir** returns a zero-length string (`""`). After a zero-length string is returned, you must specify *pathname* in subsequent calls, or an error occurs.

You can change to a new *pathname* without retrieving all of the file names that match the current *pathname*. However, you can't call the **Dir** function recursively. Calling **Dir** with the **vbDirectory** attribute does not continually return subdirectories.

> [!TIP]
> Because file names are retrieved in case-insensitive order on Windows, you may want to store returned file names in an array, and then sort the array.

### See Also

- [ChDir](ChDir), [ChDrive](ChDrive), [MkDir](MkDir), [RmDir](RmDir) statements
- [CurDir](CurDir) function

### Example

This example uses the **Dir** function to check whether certain files and directories exist, and to enumerate files in a folder.

```tb
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

{% include VBA-Attribution.md %}
