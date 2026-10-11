---
title: BrowseAndOpenFile
parent: FilePropertyExplorer
has_toc: false
permalink: /tB/Packages/Contributed/FileProps/FilePropertyExplorer/BrowseAndOpenFile
---
# BrowseAndOpenFile
{: .no_toc }

Displays a file-open dialog and returns a **FileProperties** collection for the file the user selects.

Syntax: *object*.**BrowseAndOpenFile** [ (*WriteSupport*) ]

*object*
: *required* An object expression that evaluates to a **FilePropertyExplorer** object. The predeclared default instance is available as `FilePropertyExplorer`.

*WriteSupport*
: *optional* A **Boolean** that controls whether the returned **FileProperties** collection is opened with write support for property values. **False** (default) opens it without write support. Pass **True** to allow setting [**FileProperty.Value**](../FileProperty/Value). Write support requires Windows Vista or newer.

**BrowseAndOpenFile** opens a file dialog for the user to select a file, and returns a [**FileProperties**](../FileProperties/) collection for the selected file, as [**OpenFile**](OpenFile) does for a path. The returned collection contains the [**FileProperty**](../FileProperty/) entries for the properties the operating system exposes for the selected file.

### Example

This example uses **BrowseAndOpenFile** to let the user pick a file and then prints all its shell properties to the Debug console.

```tb
Dim Props As FileProperties
Set Props = FilePropertyExplorer.BrowseAndOpenFile()

If Props Is Nothing Then
    Debug.Print "No file selected."
Else
    Debug.Print "File: " & Props.FilePath
    Dim i As Long
    For i = 0 To Props.Count - 1
        Dim Prop As FileProperty
        Set Prop = Props.Item(i)
        Debug.Print Prop.NameDesc & " = " & Prop.ValueDesc
    Next i
End If
```

### See Also

- [FilePropertyExplorer](.) class -- the predeclared factory class
- [OpenFile](OpenFile) function -- opens a file by path and returns a **FileProperties** collection
- [FileProperties](../FileProperties/) class -- the collection returned by this function
- [FileProperty](../FileProperty/) class -- one shell property in the collection
