---
title: Files
parent: tbFileSysTools Package
permalink: /tB/Packages/Contributed/tbFileSysTools/Files
has_toc: false
---

# Files class
{: .no_toc }

A **Files** is a read-only collection of [**File**](File) objects: the files in one folder. It counts them, returns one by name or by position, and is enumerated with **For Each**.

A **Files** is not created with **New**. [**Folder.Files**](Folder#files) returns one. It holds the files that the folder had when the property was read; files created or deleted afterwards are not added to it or removed from it. Each **File** in it reads the disk when it is used, so a file that was deleted after the collection was made raises error 53 when it is touched. Hidden and system files are in the collection.

```tb check_build check_run
Dim work As String, fs As Files, f As File
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work
StringToTextFile "hello", BuildPath(work, "a.txt")
StringToTextFile "hello world", BuildPath(work, "b.txt")

Set fs = GetFolder(work).Files
Debug.Print fs.Count               ' 2
Debug.Print fs.Item("b.txt").Size  ' 11
Debug.Print fs(1).Name             ' a.txt
Debug.Print fs("A.TXT").Name       ' a.txt
For Each f In fs
    Debug.Print f.Name
Next
' Output:
' 2
' 11
' a.txt
' a.txt
' a.txt
' b.txt

DeleteFolder work
```

```tb check_build check_run
Dim work As String, fs As Files, f As File
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work
StringToTextFile "a", BuildPath(work, "a.txt")
Set fs = GetFolder(work).Files

On Error Resume Next
Set f = fs("missing.txt")
Debug.Print Err.Number                 ' 5
Err.Clear
Set f = fs(2)
Debug.Print Err.Number                 ' 5
Err.Clear
On Error GoTo 0

DeleteFolder work
```

## Properties

### Count
{: .no_toc }

The number of files in the collection.

Syntax: *object*.**Count** **As Long**

### Item
{: .no_toc }

One file of the collection. This is the default member.

Syntax: *object*.**Item** ( *nameOrIndex* ) **As File**

*nameOrIndex*
: *required* A **Variant**: the name of the file with its extension, such as `"readme.txt"`, in any letter case, or the position of the file, counted from 1.

The files are in the order in which Windows lists the folder. A name that is not in the collection, and a position below 1 or above [**Count**](#count), raise error 5 (*Invalid procedure call or argument*), with the message *No item 'x' in the collection*.

The Scripting Runtime takes a name only: it raises error 53 (*File not found*) for a name that is not in the collection, and error 5 for a position.

### NewEnum
{: .no_toc }

The enumerator that **For Each** uses. It is hidden, and is not called from code.

Syntax: *object*.**NewEnum** **As IUnknown**

## See Also

- [Folder](Folder#files) class -- **Files** returns this collection
- [File](File) class -- the type of its items
- [Folders](Folders) class and [Drives](Drives) class -- the other two collections
