---
title: FileSystem Module
parent: Modules
permalink: /tB/Modules/FileSystem/
has_toc: false
---

# FileSystem module

The **FileSystem** module groups together the procedures and statements for working with files and directories on disk. Its members divide cleanly into two camps: *pathname-based* operations that act on something named in the filesystem, and *file-number-based* operations that act on a handle previously returned by the **Open** statement.

## Navigating directories

[**ChDrive**](ChDrive) changes the current drive, [**ChDir**](ChDir) changes the current directory on a given drive, and [**CurDir**](CurDir) returns the path of the current drive — or of any other drive, if one is named. [**MkDir**](MkDir) and [**RmDir**](RmDir) create and remove directories.

```tb
ChDrive "D"
ChDir "D:\Projects"
Debug.Print CurDir              ' "D:\Projects"
MkDir "D:\Projects\Output"
```

## Inspecting files and directories

[**Dir**](Dir) is the wildcard matcher: pass it a pathname containing `*` or `?` and it returns the first matching name, then call it again with no arguments to step through subsequent matches until it returns `""`. [**FileLen**](FileLen) returns the size of a file in bytes without opening it, and [**FileDateTime**](FileDateTime) returns its last-modified timestamp. [**GetAttr**](GetAttr) and [**SetAttr**](SetAttr) read and write the [**VbFileAttribute**](../Constants/VbFileAttribute) flag bits — read-only, hidden, system, archive — and **GetAttr** also reports whether a name refers to a directory by setting the **vbDirectory** bit.

```tb
Dim Name As String
Name = Dir("C:\Logs\*.log")
Do While Name <> ""
    Debug.Print Name & vbTab & FileLen("C:\Logs\" & Name)
    Name = Dir
Loop
```

## Copying and deleting

[**FileCopy**](FileCopy) copies one file to another, and [**Kill**](Kill) deletes files matching a wildcard pattern. Both operate by pathname and raise a run-time error when asked to act on a file the current process has open.

```tb
FileCopy "C:\Data\report.xlsx", "C:\Backup\report.xlsx"
Kill "C:\Backup\*.tmp"
```

## Opening and tracking file numbers

The lower-level read/write statements — **Open**, **Close**, **Get**, **Put**, **Print**, **Write**, **Input**, and **Line Input** — work in terms of a *file number* in the range 1–511. [**FreeFile**](FreeFile) returns the next number that isn't currently in use, sparing the caller from picking one by hand and racing other code to it. Once a file is open, [**FileAttr**](FileAttr) reports the access mode — **Input**, **Output**, **Random**, **Append**, or **Binary** — that the file number was opened with. [**Reset**](Reset) closes every file number currently open and flushes its buffers, and is most useful as a last-ditch cleanup before exit.

```tb
Dim N As Long
N = FreeFile
Open "C:\Data\report.txt" For Input As #N
' ... read ...
Close #N
```

## Position within an open file

For an open file number, [**EOF**](EOF) returns **True** once a sequential read has run past the last record, [**LOF**](LOF) returns the file's total length in bytes, and [**Loc**](Loc) returns the current read/write position. The unit of *position* depends on the open mode — record number for **Random**, byte offset for **Binary**, and the byte position divided by 128 for sequential modes — so the per-mode tables on each function's page are the authoritative reference. [**Seek**](Seek) doubles as a function and a statement: the function returns the position of the **next** read or write (whereas **Loc** reports the position of the *last*), and the statement repositions the file pointer ahead of the next operation.

```tb
Dim N As Long, Line As String
N = FreeFile
Open "C:\Data\big.log" For Input As #N
Do While Not EOF(N)
    Line Input #N, Line
Loop
Close #N
```

## Members

- [ChDir](ChDir) -- changes the current directory or folder
- [ChDrive](ChDrive) -- changes the current drive
- [CurDir](CurDir) -- returns the current path
- [Dir](Dir) -- returns the name of a file, directory, folder, or volume label that matches a pattern
- [EOF](EOF) -- returns whether the end of a file opened for **Random** or sequential **Input** has been reached
- [FileAttr](FileAttr) -- returns the file mode for files opened with the **Open** statement
- [FileCopy](FileCopy) -- copies a file
- [FileDateTime](FileDateTime) -- returns the date and time when a file was created or last modified
- [FileLen](FileLen) -- returns the length of a file in bytes
- [FreeFile](FreeFile) -- returns the next file number available for use by the **Open** statement
- [GetAttr](GetAttr) -- returns the attributes of a file or directory
- [Kill](Kill) -- deletes files from a disk
- [Loc](Loc) -- returns the current read/write position within an open file
- [LOF](LOF) -- returns the size, in bytes, of an open file
- [MkDir](MkDir) -- creates a new directory or folder
- [Reset](Reset) -- closes all disk files opened by using the **Open** statement
- [RmDir](RmDir) -- removes an existing directory or folder
- [Seek](Seek) -- returns or sets the read/write position within an open file
- [SetAttr](SetAttr) -- sets attribute information for a file
