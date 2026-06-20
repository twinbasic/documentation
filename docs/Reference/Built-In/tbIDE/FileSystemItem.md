---
title: FileSystemItem
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/FileSystemItem
has_toc: false
---

# FileSystemItem class
{: .no_toc }

The base interface for everything inside the IDE's virtual file system. Both [**File**](File) and [**Folder**](Folder) extend **FileSystemItem** and inherit its four universal members ([**Name**](#name), [**Path**](#path), [**Type**](#type), [**Parent**](#parent)). An item returned from a [**Folder**](Folder) enumeration or from [**FileSystem.ResolvePath**](FileSystem#resolvepath) is normally castable to its specific kind --- the [**Type**](#type) property or `TypeOf` discriminates between them.

```tb
Dim item As FileSystemItem
For Each item In Host.CurrentProject.RootFolder
    If TypeOf item Is Folder Then
        ' …recurse
    Else
        Dim file As File = item
        ' …read
    End If
Next
```

* TOC
{:toc}

## Properties

### Name
{: .no_toc }

The item's name (the last segment of its [**Path**](#path)). **String**, read-only. For files, includes the extension.

### Parent
{: .no_toc }

The folder that contains this item. **As** [**Folder**](Folder). Read-only. The root folder's **Parent** is **Nothing**.

### Path
{: .no_toc }

The item's full virtual-FS path --- e.g. `"twinbasic:/Sources/MainModule.twin"`. **String**, read-only. Suitable as the *Path* argument to [**Editors.Open**](Editors#open) and [**FileSystem.ResolvePath**](FileSystem#resolvepath).

### Type
{: .no_toc }

The kind of item. **As** [**FileSystemItemType**](#filesystemitemtype) (see below). Read-only. For folders the value is always [**Folder**](#FileSystemItemType_Folder); for files it identifies the file's encoding and role.

## FileSystemItemType
{: #filesystemitemtype }

A type discriminator returned by [**Type**](#type).

| Constant | Value | Description |
|----------|-------|-------------|
| **Folder**{: #FileSystemItemType_Folder }                  | 0 | A folder. |
| **FileVIRTUALDOC**{: #FileSystemItemType_FileVIRTUALDOC }  | 1 | A read-only virtual document --- the placeholder content the IDE renders for unrecognised file types. Unicode (UTF-16). |
| **FileOTHER**{: #FileSystemItemType_FileOTHER }            | 2 | A file the IDE recognises as binary or whose encoding it cannot determine. [**File.ReadText**](File#readtext) is not supported on this kind. |
| **FileTWIN**{: #FileSystemItemType_FileTWIN }              | 3 | A twinBASIC source file (`.twin`). UTF-8 encoded on disk. |
| **FileBAS**{: #FileSystemItemType_FileBAS }                | 4 | A VB6-compatible standard module file (`.bas`). System ANSI encoded on disk. |
| **FileCLS**{: #FileSystemItemType_FileCLS }                | 5 | A VB6-compatible class module file (`.cls`). System ANSI encoded on disk. |
| **FileUIDESIGNER**{: #FileSystemItemType_FileUIDESIGNER }  | 6 | A UI-designer surface for a Form, expressed as JSON. UTF-8 encoded. |
| **FileJSON**{: #FileSystemItemType_FileJSON }              | 7 | A JSON file --- typically the project's `Settings` or other JSON project data. UTF-8 encoded. |
