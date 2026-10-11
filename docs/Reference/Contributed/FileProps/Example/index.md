---
title: Example
parent: FileProps Package
permalink: /tB/Packages/Contributed/FileProps/Example/
has_toc: false
---

# Example module
{: .no_toc }

A demonstration module that prints all Windows shell file properties for a chosen file to the Debug console.

## Members

### DisplayInDebugConsole

Opens a file and prints each of its shell properties -- name and localized value -- to the Debug console.

Syntax: **DisplayInDebugConsole** [ *FilePath* ]

*FilePath*
: *optional* A **String** holding the full path of the file to inspect. If omitted or empty, a file dialog is displayed so the user can choose the file interactively.

**DisplayInDebugConsole** calls [**FilePropertyExplorer.OpenFile**](../FilePropertyExplorer/OpenFile) when *FilePath* is not empty, or [**FilePropertyExplorer.BrowseAndOpenFile**](../FilePropertyExplorer/BrowseAndOpenFile) otherwise. Each property in the returned [**FileProperties**](../FileProperties/) collection is printed on its own line: the system name (**FileProperty.Name**), then the localized value string (**FileProperty.ValueDesc**), positioned further right with `Tab(80)`.

## Example

This example prints all shell properties of a specific file to the Debug console by supplying a path directly.

```tb
Sub Main()
    Example.DisplayInDebugConsole "C:\Users\Public\Pictures\Sample.jpg"
End Sub
```

To use the interactive file-open dialog instead, call the procedure without an argument:

```tb
Sub Main()
    Example.DisplayInDebugConsole
End Sub
```

## See Also

- [FilePropertyExplorer](../FilePropertyExplorer/) class -- opens a file and returns its shell properties
- [FileProperties](../FileProperties/) class -- read-only collection of shell properties for a file
- [FileProperty](../FileProperty/) class -- one shell property entry with name, ID, and value
- [FileProps package](../) -- overview of all classes and modules
