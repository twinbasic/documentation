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

**OpenFile** returns a [**FileProperties**](../FileProperties/) collection for the specified file. The collection contains the [**FileProperty**](../FileProperty/) entries for the properties the operating system exposes for that file. Common examples include the duration of an audio file such as an MP3 and the EXIF properties of a JPEG image.

Write support requires Windows Vista or newer.

### Example

This example opens an MP3 file and prints all its shell properties to the Debug console.

```tb
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
