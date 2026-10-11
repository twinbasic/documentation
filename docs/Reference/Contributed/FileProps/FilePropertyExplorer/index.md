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

The class has the `[ PredeclaredId ]` attribute, so it acts as a default instance and its methods are callable without creating an explicit object variable:

```tb check_build
Dim Props As FileProperties
Set Props = FilePropertyExplorer.OpenFile("C:\Music\track.mp3")
```

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

> [!NOTE]
> Write support for [**FileProperty.Value**](../FileProperty/Value) requires Windows Vista or newer.

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
