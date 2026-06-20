---
title: Folder
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/Folder
has_toc: false
---

# Folder class
{: .no_toc }

A folder inside the IDE's virtual file system. Extends [**FileSystemItem**](FileSystemItem) with child-enumeration capability --- [**Count**](#count), [**Item**](#item), and standard **For Each** iteration that yields each child as a [**FileSystemItem**](FileSystemItem) (use `TypeOf` to discriminate folders from files).

A **Folder** also inherits the universal [**FileSystemItem**](FileSystemItem) members --- [**Name**](FileSystemItem#name), [**Path**](FileSystemItem#path), [**Type**](FileSystemItem#type), [**Parent**](FileSystemItem#parent). The most common entry point is [**Host.CurrentProject.RootFolder**](Project#rootfolder), and the most common operation is a **For Each** recursive traversal.

```tb
Private Sub WalkAllFiles(ByVal folder As Folder)
    Dim item As FileSystemItem
    For Each item In folder
        If TypeOf item Is Folder Then
            WalkAllFiles item
        Else
            Dim file As File = item
            ' …process the file
        End If
    Next
End Sub
```

> [!IMPORTANT]
> The twinBASIC IDE is multi-threaded. The same folder can change while an addin holds a reference to it --- files arrive, files disappear, indices renumber. The supported way to traverse a folder is **For Each**; index-based access through [**Count**](#count) / [**Item**](#item) races against the IDE's own threads and will sometimes miss or duplicate entries. Always prefer **For Each** for traversal.

* TOC
{:toc}

## Properties

### Count
{: .no_toc }

Number of items currently in the folder. **Long**, read-only.

> [!IMPORTANT]
> The value can change between two reads --- the IDE is multi-threaded. **Do not** use this as a `For i = 0 To Count - 1` loop bound; use **For Each** instead.

### IsPackagesFolder
{: .no_toc }

**True** if this folder is the project's special `Packages` folder (the one that contains every referenced package's source tree). **Boolean**, read-only.

Useful when traversing the project for source-search purposes --- an addin that searches user code will usually want to *skip* the package sources:

```tb
If folder.IsPackagesFolder And Not searchInsidePackages Then Exit Sub
```

### Item
{: .no_toc }

Indexed or named access to a child item. **DefaultMember** --- so `folder(0)` is equivalent to `folder.Item(0)`, and `folder("MainModule.twin")` is equivalent to `folder.Item("MainModule.twin")`.

Syntax: *folder*( *IndexOrName* ) **As** [**FileSystemItem**](FileSystemItem)

*IndexOrName*
: A **Variant** --- either a zero-based **Long** index or a **String** child name.

> [!IMPORTANT]
> Numeric indices race against the IDE's own threads --- the item at index `n` may have changed identity by the time the call returns. Named lookup is safer; **For Each** traversal is safer still.
