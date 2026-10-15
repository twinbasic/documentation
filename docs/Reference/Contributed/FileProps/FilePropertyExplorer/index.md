---
title: FilePropertyExplorer
parent: FileProps Package
permalink: /tB/Packages/Contributed/FileProps/FilePropertyExplorer/
has_toc: false
---

# FilePropertyExplorer class
{: .no_toc }

A predeclared factory class that opens a file and returns a [**FileProperties**](../FileProperties/) collection of its Windows shell properties.

**FilePropertyExplorer** is a Virtual-COM wrapper that gives access to the detailed file properties the operating system exposes, commonly called shell property handlers. Common examples include the duration of an audio file such as an MP3 and the EXIF properties of a JPEG image.

<!-- test: ExplorerTests.OpenFile_FullPath_ReturnsCollection, ExplorerTests.OpenFile_NewInstance_ReturnsCollection -->
The class has the `[ PredeclaredId ]` attribute, so it acts as a default instance and its methods are callable without creating an explicit object variable:

```tb check_build
Dim Props As FileProperties
Set Props = FilePropertyExplorer.OpenFile("C:\Music\track.mp3")
```
<!-- /test -->

* TOC
{:toc}

## Methods

### BrowseAndOpenFile
{: .no_toc }

Displays a file dialog for the user to select a file, and returns a [**FileProperties**](../FileProperties/) collection for the selected file.

Syntax: **FilePropertyExplorer**.**BrowseAndOpenFile** ( [ *WriteSupport* ] ) **As FileProperties**

*WriteSupport*
: *optional* A **Boolean**. Pass **True** to open the file with write support so that [**FileProperty.Value**](../FileProperty/Value) can be assigned. Default: **False**.

```tb check_build
Dim Props As FileProperties
Set Props = FilePropertyExplorer.BrowseAndOpenFile()

If Not Props Is Nothing Then
    Dim i As Long
    For i = 0 To Props.Count - 1
        Dim Prop As FileProperty
        Set Prop = Props.Item(i)
        Debug.Print Prop.NameDesc & " = " & Prop.ValueDesc
    Next i
End If
```

### OpenFile
{: .no_toc }

Opens a file by path and returns a [**FileProperties**](../FileProperties/) collection of its shell properties.

Syntax: **FilePropertyExplorer**.**OpenFile** ( *FilePath* [, *WriteSupport* ] ) **As FileProperties**

*FilePath*
: *required* A **String** containing the path to a valid file.

*WriteSupport*
: *optional* A **Boolean**. Pass **True** to open the file with write support so that [**FileProperty.Value**](../FileProperty/Value) can be assigned. Default: **False**.

```tb check_build
Dim Props As FileProperties
Set Props = FilePropertyExplorer.OpenFile("C:\Pictures\photo.jpg")

If Not Props Is Nothing Then
    Debug.Print "File: " & Props.FilePath
    Debug.Print "Property count: " & Props.Count

    ' Look up a specific property by system name:
    Dim Prop As FileProperty
    Set Prop = Props.Item("System.Photo.CameraModel")
    If Not Prop Is Nothing Then
        Debug.Print "Camera: " & Prop.ValueDesc
    End If
End If
```

## Remarks

**FilePropertyExplorer** uses a Virtual-COM library --- a self-contained native-code COM object loaded into memory without registering a DLL. The library supports both 32-bit and 64-bit hosts.

The shell property handler infrastructure requires Windows 2000 or later. If the memory for the native code cannot be allocated when the class is created, the class raises error 7 (*Out of memory*).

<!-- test: WriteTests.Value_Let_Title_IsStored, WriteTests.Value_Let_Rating_IsStored, WriteTests.Value_Let_Array_IsStoredAsMultiValue -->
> [!NOTE] timeless
> Write support for [**FileProperty.Value**](../FileProperty/Value) requires Windows Vista or newer.

<!-- test: ExplorerTests.OpenFile_FullPath_ReturnsCollection, ExplorerTests.OpenFile_MissingFile_RaisesFileNotFound -->
**OpenFile** raises run-time error -2147212790 (*File not found or is not accessible*) when the file does not exist. It never returns **Nothing**.
<!-- /test -->

<!-- test: ExplorerTests.OpenFile_RelativePath_RaisesFileNotFound, ExplorerTests.OpenFile_DotDotSegment_RaisesFileNotFound, ExplorerTests.OpenFile_ForwardSlashes_RaisesFileNotFound -->
> [!NOTE] 1.7.1.0
> *FilePath* of **OpenFile** must be a full path that uses backslashes, such as `C:\Folder\File.ext`. A path that is relative, has a `..` segment or uses forward slashes raises the same error as a missing file, although the file exists.

<!-- test: ExplorerTests.OpenFile_WriteSupport_JpegListsTheHandlersProperties, ExplorerTests.OpenFile_WriteSupport_TextFileListsTheSameProperties -->
> [!NOTE] 1.7.1.0
> For a file type that has a property handler of its own, such as JPEG, a collection opened with *WriteSupport* set to **True** holds only the properties of that handler. It has a lower **Count** than a collection of the same file opened without write support, and a property of the file system, such as `System.Size`, is in it with an empty **Value**. Read those properties from a collection opened without write support. A file type without a handler, such as a text file, lists the same properties either way.

<!-- test: ExplorerTests.OpenFile_TwoReadOnlyCollections_BothHoldTheProperties, ExplorerTests.OpenFile_WhileWriteSupportCollectionIsOpen_ListsTheProperties, ExplorerTests.OpenFile_WriteSupportWhileWriteSupportCollectionIsOpen_ListsTheProperties, ExplorerTests.OpenFile_WriteSupportWhileACollectionIsOpen_Returns -->
> [!WARNING] 1.7.1.0
> A file that has a property handler, such as a JPEG file, can be open in one collection at a time when write support is involved. Calling **OpenFile** with *WriteSupport* set to **True** while a collection of the same file opened without write support exists never returns. Calling **OpenFile**, with or without write support, while a collection of the file opened with write support exists returns a collection whose **Count** is 0, with no error. Set the first collection to **Nothing** before opening the file again. Any number of collections opened without write support can exist together.

## Example

This example opens a file-open dialog, then prints all shell properties for the selected file to the Debug console.

```tb check_build
Sub ShowFileProps()
    Dim Props As FileProperties
    Set Props = FilePropertyExplorer.BrowseAndOpenFile()

    If Props Is Nothing Then
        Debug.Print "No file selected."
        Exit Sub
    End If

    Debug.Print "File: " & Props.FilePath
    Debug.Print "Properties: " & Props.Count & Chr(10)

    Dim i As Long
    For i = 0 To Props.Count - 1
        Dim Prop As FileProperty
        Set Prop = Props.Item(i)
        Debug.Print Prop.NameDesc & " (" & Prop.Name & ")" & " = " & Prop.ValueDesc
    Next i
End Sub
```

## See Also

- [FileProperties](../FileProperties/) class -- the read-only collection returned by this class
- [FileProperty](../FileProperty/) class -- one shell property in the collection
- [FilePropertyExplorer.OpenFile](OpenFile) -- opens a file by path and returns a **FileProperties** collection
- [FilePropertyExplorer.BrowseAndOpenFile](BrowseAndOpenFile) -- displays a file-open dialog and returns a **FileProperties** collection
