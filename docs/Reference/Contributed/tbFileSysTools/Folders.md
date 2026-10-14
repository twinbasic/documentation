---
title: Folders
parent: tbFileSysTools Package
permalink: /tB/Packages/Contributed/tbFileSysTools/Folders
has_toc: false
---

# Folders class
{: .no_toc }

A **Folders** is a collection of [**Folder**](Folder) objects: the folders directly below one folder. It counts them, returns one by name or by position, creates a new one, and is enumerated with **For Each**.

A **Folders** is not created with **New**. [**Folder.SubFolders**](Folder#subfolders) returns one. It holds the folders that existed when the property was read, and does not follow later changes, except for the folders that [**Add**](#add) creates through it. Each **Folder** in it reads the disk when it is used, so a folder that was deleted after the collection was made raises error 76 when it is touched. Hidden and system folders are in the collection. Only the first level is in it: to go deeper, read **SubFolders** of each item in turn.

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

The folders are in the order in which Windows lists the folder that holds them, and a folder made by [**Add**](#add) comes last. A name that is not in the collection, and a position below 1 or above [**Count**](#count), raise error 76 (*Path not found*), with the message *No folder 'x' in the collection*.

The Scripting Runtime takes a name only: it raises error 76 for a name that is not in the collection, and error 5 for a position.

### NewEnum
{: .no_toc }

The enumerator that **For Each** uses. It is hidden, and is not called from code.

Syntax: *object*.**NewEnum** **As IUnknown**

## Methods

### Add
{: .no_toc }

Creates a subfolder and adds it to the collection.

Syntax: *object*.**Add** ( *name* ) **As Folder**

*name*
: *required* A **String**: the name of the new folder. It is a name and not a path: a backslash or a forward slash in it is error 5.

Creates the folder below the folder that the collection was read from, appends it to the collection, and returns it. [**Count**](#count) and [**Item**](#item) show it at once, and **Item** finds it by *name*. Any other **Folders** that was read from the same folder is not changed; reading [**SubFolders**](Folder#subfolders) again includes the new folder.

Errors: 58 when the folder already exists, and for an empty *name*, which names the folder that holds the collection; 5 when *name* holds a slash; 52 for a name with `<`, `>`, `"`, `|`, `?`, `*` or a control character; 75 for a reserved device name such as `con`. The numbers are those of [**CreateFolder**](FileSystemTools#createfolder), which does the work. The Scripting Runtime has this method too. It raises error 58 for an existing folder and error 5 for a path, as here, and also error 5 for an empty *name*.

```tb check_build check_run
Dim work As String, fs As Folders, nf As Folder
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work
Set fs = GetFolder(work).SubFolders
Debug.Print fs.Count                                   ' 0

Set nf = fs.Add("reports")
Debug.Print nf.Name                                    ' reports
Debug.Print FolderExists(BuildPath(work, "reports"))   ' True
Debug.Print fs.Count                                   ' 1
Debug.Print fs("REPORTS").Path = nf.Path               ' True
Debug.Print GetFolder(work).SubFolders.Count           ' 1

On Error Resume Next
fs.Add "reports"
Debug.Print Err.Number                                 ' 58
Err.Clear
fs.Add "a\b"
Debug.Print Err.Number                                 ' 5
Err.Clear
On Error GoTo 0

DeleteFolder work
```

## See Also

- [Folder](Folder#subfolders) class -- **SubFolders** returns this collection
- [Files](Files) class and [Drives](Drives) class -- the other two collections
