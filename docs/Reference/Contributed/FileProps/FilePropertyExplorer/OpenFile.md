---
title: OpenFile
parent: FilePropertyExplorer
has_toc: false
permalink: /tB/Packages/Contributed/FileProps/FilePropertyExplorer/OpenFile
---
# OpenFile
{: .no_toc }

Opens a file by path and returns a **FileProperties** collection of its Windows shell properties.

Syntax: *object*.**OpenFile**(*FilePath* [ **,** *WriteSupport* ])

*object*
: *required* An object expression that evaluates to a **FilePropertyExplorer** object. The predeclared default instance is available as `FilePropertyExplorer`.

*FilePath*
: *required* A **String** giving the path to a valid file.

*WriteSupport*
: *optional* A **Boolean** that controls whether the returned **FileProperties** collection is opened with write support for property values. **False** (default) opens it without write support. Pass **True** to allow setting [**FileProperty.Value**](../FileProperty/Value).

<!-- test: ExplorerTests.OpenFile_FullPath_ReturnsCollection, ExplorerTests.OpenFile_NewInstance_ReturnsCollection, ExplorerTests.OpenFile_MissingFile_RaisesFileNotFound, CollectionTests.FilePath_IsThePathPassedToOpenFile -->
**OpenFile** returns a [**FileProperties**](../FileProperties/) collection for the specified file. The collection contains the [**FileProperty**](../FileProperty/) entries for the properties the operating system exposes for that file. Common examples include the duration of an audio file such as an MP3 and the EXIF properties of a JPEG image.

**OpenFile** raises run-time error -2147212790 (*File not found or is not accessible*) when the file does not exist. It never returns **Nothing**.
<!-- /test -->

Write support requires Windows Vista or newer.

<!-- test: ExplorerTests.OpenFile_RelativePath_RaisesFileNotFound, ExplorerTests.OpenFile_DotDotSegment_RaisesFileNotFound, ExplorerTests.OpenFile_ForwardSlashes_RaisesFileNotFound -->
> [!NOTE] 1.7.1.0
> *FilePath* must be a full path that uses backslashes, such as `C:\Folder\File.ext`. A path that is relative, has a `..` segment or uses forward slashes raises the same error as a missing file, although the file exists.

<!-- test: ExplorerTests.OpenFile_WriteSupport_JpegListsTheHandlersProperties, ExplorerTests.OpenFile_WriteSupport_TextFileListsTheSameProperties -->
> [!NOTE] 1.7.1.0
> For a file type that has a property handler of its own, such as JPEG, a collection opened with *WriteSupport* set to **True** holds only the properties of that handler. It has a lower **Count** than a collection of the same file opened without write support, and a property of the file system, such as `System.Size`, is in it with an empty **Value**. Read those properties from a collection opened without write support. A file type without a handler, such as a text file, lists the same properties either way.

<!-- test: ExplorerTests.OpenFile_TwoReadOnlyCollections_BothHoldTheProperties, ExplorerTests.OpenFile_WhileWriteSupportCollectionIsOpen_ListsTheProperties, ExplorerTests.OpenFile_WriteSupportWhileWriteSupportCollectionIsOpen_ListsTheProperties, ExplorerTests.OpenFile_WriteSupportWhileACollectionIsOpen_Returns -->
> [!WARNING] 1.7.1.0
> A file that has a property handler, such as a JPEG file, can be open in one collection at a time when write support is involved. Calling **OpenFile** with *WriteSupport* set to **True** while a collection of the same file opened without write support exists never returns. Calling **OpenFile**, with or without write support, while a collection of the file opened with write support exists returns a collection whose **Count** is 0, with no error. Set the first collection to **Nothing** before opening the file again. Any number of collections opened without write support can exist together.

### Example

This example opens an MP3 file and prints all its shell properties to the Debug console.

```tb check_build
Dim Props As FileProperties
Set Props = FilePropertyExplorer.OpenFile("C:\Music\track.mp3")

Debug.Print "File: " & Props.FilePath
Debug.Print "Properties: " & Props.Count

Dim i As Long
For i = 0 To Props.Count - 1
    Dim Prop As FileProperty
    Set Prop = Props.Item(i)
    Debug.Print Prop.NameDesc & " = " & Prop.ValueDesc
Next i
```

### See Also

- [FilePropertyExplorer](.) class -- the predeclared factory class
- [BrowseAndOpenFile](BrowseAndOpenFile) function -- displays a file-open dialog and returns a **FileProperties** collection
- [FileProperties](../FileProperties/) class -- the collection returned by this function
- [FileProperty](../FileProperty/) class -- one shell property in the collection
