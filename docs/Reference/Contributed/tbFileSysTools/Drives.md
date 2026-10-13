---
title: Drives
parent: tbFileSysTools Package
permalink: /tB/Packages/Contributed/tbFileSysTools/Drives
has_toc: false
---

# Drives class
{: .no_toc }

A **Drives** is a read-only collection of [**Drive**](Drive) objects: the logical drives of the computer. It counts them, returns one by letter or by position, and is enumerated with **For Each**.

A **Drives** is not created with **New**. [**GetDrives**](FileSystemTools#getdrives) returns one, and [**FileSystemObject.Drives**](FileSystemObject#drives) is the same call. It holds the drives that existed when it was made: a USB disk that is plugged in afterwards is not in it, so call **GetDrives** again. Each **Drive** in it asks Windows when it is used. Drives that are not ready, such as an optical drive with no disc, are in the collection; check [**IsReady**](Drive#isready) before reading the size of one.

```tb check_build
Dim ds As Drives, d As Drive
Set ds = GetDrives()
Debug.Print ds.Count
For Each d In ds
    Debug.Print d.DriveLetter, d.IsReady
Next
```

```tb check_build check_run
Dim ds As Drives
Set ds = GetDrives()
Debug.Print ds.Count > 0                              ' True
Debug.Print ds.Item("C").Path                         ' C:
Debug.Print ds(1).Path = ds.Item(1).Path              ' True
```

```tb check_build check_run
Dim ds As Drives, d As Drive
Set ds = GetDrives()
Debug.Print ds("c:").Path              ' C:
Debug.Print ds("C:\").Path             ' C:

On Error Resume Next
Set d = ds("1")
Debug.Print Err.Number                 ' 5
Err.Clear
Set d = ds(0)
Debug.Print Err.Number                 ' 5
Err.Clear
On Error GoTo 0
```

## Properties

### Count
{: .no_toc }

The number of drives in the collection.

Syntax: *object*.**Count** **As Long**

### Item
{: .no_toc }

One drive of the collection. This is the default member.

Syntax: *object*.**Item** ( *letterOrIndex* ) **As Drive**

*letterOrIndex*
: *required* A **Variant**: a drive letter such as `"C"`, or the position of the drive, counted from 1. A string is read by its first character, so `"C"`, `"c"`, `"C:"` and `"C:\"` all name the drive C.

The drives are in the order of their letters, and the letter is not case-sensitive. A letter that is not in the collection, and a position below 1 or above [**Count**](#count), raise error 5 (*Invalid procedure call or argument*), with the message *No drive 'x' in the collection*.

The Scripting Runtime raises error 68 (*Device unavailable*) for a letter that is not in use, and error 5 for a position.

### NewEnum
{: .no_toc }

The enumerator that **For Each** uses. It is hidden, and is not called from code.

Syntax: *object*.**NewEnum** **As IUnknown**

## See Also

- [Drive](Drive) class -- the type of its items
- [FileSystemTools](FileSystemTools#getdrives) module -- **GetDrives** returns this collection
- [Files](Files) class and [Folders](Folders) class -- the other two collections
