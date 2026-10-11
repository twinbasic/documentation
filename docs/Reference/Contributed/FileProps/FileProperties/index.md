---
title: FileProperties
parent: FileProps Package
permalink: /tB/Packages/Contributed/FileProps/FileProperties/
has_toc: false
---

# FileProperties class
{: .no_toc }

A read-only collection of Windows shell properties for a single file, returned by **FilePropertyExplorer**.

**FileProperties** is a Virtual-COM object that provides indexed access to the detailed file properties the operating system exposes for the opened file, commonly called shell property handlers. Each entry in the collection is a [**FileProperty**](../FileProperty/) object with the system name, localized name, unique property ID, and current value of one shell property. Common examples include the duration of an audio file such as an MP3 and the EXIF properties of a JPEG image.

Instances are not constructed directly. Call [**FilePropertyExplorer.OpenFile**](../FilePropertyExplorer/OpenFile) or [**FilePropertyExplorer.BrowseAndOpenFile**](../FilePropertyExplorer/BrowseAndOpenFile) to obtain a **FileProperties** collection.

```tb check_build
Dim Props As FileProperties
Set Props = FilePropertyExplorer.OpenFile("C:\Music\track.mp3")

Dim i As Long
For i = 0 To Props.Count - 1
    Dim Prop As FileProperty
    Set Prop = Props.Item(i)
    Debug.Print Prop.NameDesc & " = " & Prop.ValueDesc
Next i
```

* TOC
{:toc}

## Properties

### Count
{: .no_toc }

Returns the number of shell properties in the collection. **Long**. Read-only.

Syntax: *object*.**Count**

The count is the number of properties the shell exposes for the opened file. Different file types expose different property sets.

### FilePath
{: .no_toc }

Returns the full file path of the file that was opened. **String**. Read-only.

Syntax: *object*.**FilePath**

The value is the full path of the file passed to [**FilePropertyExplorer.OpenFile**](../FilePropertyExplorer/OpenFile). When a collection is obtained through [**FilePropertyExplorer.BrowseAndOpenFile**](../FilePropertyExplorer/BrowseAndOpenFile), it is the path of the file the user selected in the dialog.

### Item
{: .no_toc }

Returns the [**FileProperty**](../FileProperty/) object at the given position, name, or ID in the collection.

Syntax: *object*.**Item** ( *IndexOrNameOrID* ) **As FileProperty**

*IndexOrNameOrID*
: *required* A **Variant** that identifies the property to retrieve. Accepted forms:
  - An integer index from `0` to `Count - 1`.
  - A **String** matching [**FileProperty.Name**](../FileProperty/Name) (the system identity name, e.g. `"System.Media.Duration"`).
  - A **String** matching [**FileProperty.ID**](../FileProperty/ID) (the unique property identifier).

```tb check_build
Dim Props As FileProperties
Set Props = FilePropertyExplorer.OpenFile("C:\Music\track.mp3")

' By zero-based index:
Dim Prop As FileProperty
Set Prop = Props.Item(0)

' By system name:
Set Prop = Props.Item("System.Media.Duration")
```

### VCOMObject
{: .no_toc }

Holds the native-code COM object created internally by the Virtual-COM library. **Object**. For internal use only.

> [!WARNING]
> Do not read, assign, or pass **VCOMObject** to any function. The package marks it as for internal use only, and **Count**, **FilePath** and **Item** forward their calls to it.

## Example

This example opens the file at the given path and prints its path, its property count and all its shell properties to the Debug console.

```tb check_build
Sub PrintShellProps(FilePath As String)
    Dim Props As FileProperties
    Set Props = FilePropertyExplorer.OpenFile(FilePath)

    Debug.Print "File: " & Props.FilePath
    Debug.Print "Properties: " & Props.Count

    Dim i As Long
    For i = 0 To Props.Count - 1
        Dim Prop As FileProperty
        Set Prop = Props.Item(i)
        Debug.Print Prop.NameDesc & " (" & Prop.Name & ")" & " = " & Prop.ValueDesc
    Next i
End Sub
```

## See Also

- [FilePropertyExplorer](../FilePropertyExplorer/) class -- the predeclared factory that opens a file and returns a **FileProperties** collection
- [FileProperty](../FileProperty/) class -- one shell property in the collection
- [FilePropertyExplorer.OpenFile](../FilePropertyExplorer/OpenFile) -- opens a file by path and returns a **FileProperties** collection
- [FilePropertyExplorer.BrowseAndOpenFile](../FilePropertyExplorer/BrowseAndOpenFile) -- displays a file-open dialog and returns a **FileProperties** collection
