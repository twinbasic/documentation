---
title: FileSystem
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/FileSystem
has_toc: false
---

# FileSystem class
{: .no_toc }

A handle into the IDE's virtual file system — the abstraction that lets an addin traverse and read source files without touching the on-disk paths. The **FileSystem** is reached through [**Host.FileSystem**](Host#filesystem). For the more common per-project case, [**Host.CurrentProject.RootFolder**](Project#rootfolder) is also a [**Folder**](Folder) and is usually the right entry point — the global **FileSystem** matters when an addin needs to address files outside the project's own root.

```tb
Dim item As FileSystemItem = Host.FileSystem.ResolvePath("twinbasic:/Sources/MainModule.twin")
```

## Properties

### RootFolder
{: .no_toc }

The root of the virtual file system. **As** [**Folder**](Folder). Read-only.

## Methods

### ResolvePath
{: .no_toc }

Looks up the [**FileSystemItem**](FileSystemItem) at a given path. The path uses the IDE's `twinbasic:/` URI scheme — the same scheme that [**FileSystemItem.Path**](FileSystemItem#path) and [**Editor.Path**](Editor#path) return.

Syntax: *fileSystem*.**ResolvePath**( *Path* ) **As** [**FileSystemItem**](FileSystemItem)

*Path*
: *required* A virtual-FS path. **String**. Must include the `twinbasic:/` prefix.

The returned object is a [**FileSystemItem**](FileSystemItem) but is usually castable to its specific kind — a [**File**](File) for regular files, a [**Folder**](Folder) for folders. Test with `TypeOf … Is Folder` before casting when the path's kind is not known statically.
