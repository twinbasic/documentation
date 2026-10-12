---
title: Folders
parent: tbFileSysTools Package
permalink: /tB/Packages/Contributed/tbFileSysTools/Folders
has_toc: false
---

# Folders class
{: .no_toc }

A **Folders** is a read-only collection of [**Folder**](Folder) objects: the folders directly below one folder. It counts them, returns one by name or by position, and is enumerated with **For Each**.

A **Folders** is not created with **New**. [**Folder.SubFolders**](Folder#subfolders) returns one. It holds the folders that existed when the property was read, and does not follow later changes. Each **Folder** in it reads the disk when it is used, so a folder that was deleted after the collection was made raises error 76 when it is touched. Hidden and system folders are in the collection. Only the first level is in it: to go deeper, read **SubFolders** of each item in turn.

```tb check_build check_run
Dim work As String, fs As Folders, fd As Folder
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder BuildPath(work, "alpha"), True
CreateFolder BuildPath(work, "beta")

Set fs = GetFolder(work).SubFolders
Debug.Print fs.Count               ' 2
Debug.Print fs("beta").Name        ' beta
For Each fd In fs
    Debug.Print fd.Name
Next
' Output:
' 2
' beta
' alpha
' beta

DeleteFolder work
```

## Properties

### Count
{: .no_toc }

The number of folders in the collection.

Syntax: *object*.**Count** **As Long**

### Item
{: .no_toc }

One folder of the collection. This is the default member.

Syntax: *object*.**Item** ( *nameOrIndex* ) **As Folder**

*nameOrIndex*
: *required* A **Variant**: the name of the folder, such as `"bin"`, in any letter case, or the position of the folder, counted from 1.

The folders are in the order in which Windows lists the folder that holds them. A name that is not in the collection raises error 5, and a position below 1 or above [**Count**](#count) raises error 9 (*Subscript out of range*).

The Scripting Runtime takes a name only: it raises error 76 (*Path not found*) for a name that is not in the collection, and error 5 for a position. It also has an **Add** method, which creates a folder; this collection has none, and [**CreateFolder**](FileSystemTools#createfolder) does that work.

### NewEnum
{: .no_toc }

The enumerator that **For Each** uses. It is hidden, and is not called from code.

Syntax: *object*.**NewEnum** **As IUnknown**

## See Also

- [Folder](Folder#subfolders) class -- **SubFolders** returns this collection
- [Files](Files) class and [Drives](Drives) class -- the other two collections
