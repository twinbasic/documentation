---
title: Count
parent: FileProperties
has_toc: false
permalink: /tB/Packages/Contributed/FileProps/FileProperties/Count
---
# Count
{: .no_toc }

Returns the number of properties in the collection.

Syntax: *object*.**Count**

*object*
: *required* An object expression that evaluates to a **FileProperties** object.

<!-- test: CollectionTests.Count_DiffersByFileType, CollectionTests.Count_IsOneMoreThanTheLastIndex -->
**Count** returns a **Long** equal to the total number of shell properties available for the file. Different file types have different numbers of properties. Valid index values for [**Item**](Item) range from `0` to `Count - 1`.
<!-- /test -->

### Example

This example opens a file and prints the total number of shell properties it exposes.

```tb check_build
Dim props As FileProperties
Set props = FilePropertyExplorer.OpenFile("C:\example.mp3")
Debug.Print "Property count: " & props.Count
```

### See Also

- [Item](Item) property
- [FilePath](FilePath) property
- [FileProperties](.) class
