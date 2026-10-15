---
title: FilePath
parent: FileProperties
has_toc: false
permalink: /tB/Packages/Contributed/FileProps/FileProperties/FilePath
---
# FilePath
{: .no_toc }

Returns a **String** containing the full file path of the file that was opened. Read-only.

Syntax: *object*.**FilePath**

*object*
: *required* An object expression that evaluates to a **FileProperties** object.

<!-- test: CollectionTests.FilePath_IsThePathPassedToOpenFile -->
The value is the full path of the file that was passed to [**FilePropertyExplorer.OpenFile**](../FilePropertyExplorer/OpenFile) or selected through [**FilePropertyExplorer.BrowseAndOpenFile**](../FilePropertyExplorer/BrowseAndOpenFile) when the **FileProperties** collection was created.
<!-- /test -->

### Example

This example opens a file and prints its path and property count to the Debug console.

```tb check_build
Dim fp As FileProperties
Set fp = FilePropertyExplorer.OpenFile("C:\Users\Public\sample.mp3")
Debug.Print "File: " & fp.FilePath
Debug.Print "Properties: " & fp.Count
```

### See Also

- [FileProperties](.) class
- [Count](Count) property
- [Item](Item) property
- [OpenFile](../FilePropertyExplorer/OpenFile) method
- [BrowseAndOpenFile](../FilePropertyExplorer/BrowseAndOpenFile) method
