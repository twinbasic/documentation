---
title: Drive
parent: tbFileSysTools Package
permalink: /tB/Packages/Contributed/tbFileSysTools/Drive
has_toc: false
---

# Drive class
{: .no_toc }

A **Drive** represents a disk drive or a network share: its type, label, file system, serial number and free space, and its root folder. It has the members of the **Drive** of the Scripting Runtime, and adds [**SerialNumberHex**](#serialnumberhex) and [**UnsignedSerialNumber**](#unsignedserialnumber).

A **Drive** is not created with **New**. [**GetDrive**](FileSystemTools#getdrive) returns one, [**GetDrives**](FileSystemTools#getdrives) returns a [**Drives**](Drives) collection of them, and so do [**File.Drive**](File#drive) and [**Folder.Drive**](Folder#drive).

```tb check_build check_run
Dim d As Drive
Set d = GetDrive(Left$(GetSpecialFolderPath(sfWindowsFolder), 2))
Debug.Print d.Path = Left$(GetSpecialFolderPath(sfWindowsFolder), 2)   ' True
Debug.Print d.IsReady                                              ' True
Debug.Print d.DriveType = DriveTypeConst.Fixed                     ' True
Debug.Print d.TotalSize > d.FreeSpace                              ' True
Debug.Print Len(d.SerialNumberHex)                                 ' 9
```

```tb check_build
Dim d As Drive
For Each d In GetDrives()
    If d.IsReady Then
        Debug.Print d.Path & " " & d.VolumeName & " " & d.FreeSpace
    End If
Next
```

## A Drive asks Windows each time

A **Drive** keeps only its root, such as `C:` or `\\server\share`. Every property asks Windows again, because free space, readiness and media can change, so there is no method to refresh it. Reading the label, the file system and the serial number makes three calls, although one would give all three.

**Drives that are not ready.** A drive with no media, such as an empty optical drive or a card reader with no card, cannot be queried. The size, label, file system and serial number properties raise error 71 (*Disk not ready*) for it. Test [**IsReady**](#isready) first when that can happen.

**Letter and share.** A **Drive** made from a network path has no letter and a share name, and a local drive has a letter and no share name:

| The drive | DriveLetter | ShareName |
|---|---|---|
| a local drive, `C:` | `C` | an empty string |
| a share given by its network path | an empty string | `\\server\share` |

## DriveTypeConst

The type of a drive, for [**DriveType**](#drivetype). The enumeration is declared in the class, and its members are global: they are written `Fixed` or `DriveTypeConst.Fixed`. `Drive.Fixed` and `Drive.DriveTypeConst.Fixed` do not compile. Its values are those of the Scripting Runtime. They are one less than the numbers that Windows gives the same types, except for **UnknownType**.

| Member | Value | Meaning |
|---|---|---|
| UnknownType | 0 | The type is not known, or the drive does not exist. |
| Removable | 1 | A removable disk, such as a USB disk or a floppy disk. |
| Fixed | 2 | A fixed disk. |
| Remote | 3 | A network drive. |
| CDRom | 4 | An optical drive. |
| RamDisk | 5 | A RAM disk. |

In a project that references the Scripting Runtime as well, these names compile unqualified whichever library is listed first; see [Using the package with the Scripting Runtime](./#using-the-package-with-the-scripting-runtime).

## Properties

### AvailableSpace
{: .no_toc }

The free bytes that the current user can use.

Syntax: *object*.**AvailableSpace** **As LongLong**

Counts the disk quota of the user, so on a volume with quotas it can be less than [**FreeSpace**](#freespace). This is the number to check before a write.

### DriveLetter
{: .no_toc }

The letter of the drive.

Syntax: *object*.**DriveLetter** **As String**

One uppercase letter. An empty string for a **Drive** that was made from a network path.

### DriveType
{: .no_toc }

The type of the drive.

Syntax: *object*.**DriveType** **As DriveTypeConst**

A [**DriveTypeConst**](#drivetypeconst) member. A drive that Windows cannot classify is **UnknownType**.

### FileSystem
{: .no_toc }

The name of the file system.

Syntax: *object*.**FileSystem** **As String**

`NTFS`, `FAT32`, `exFAT`, and so on.

### FreeSpace
{: .no_toc }

The free bytes on the volume.

Syntax: *object*.**FreeSpace** **As LongLong**

The free space of the whole volume, which a disk quota does not reduce; compare [**AvailableSpace**](#availablespace).

### IsReady
{: .no_toc }

Whether the drive can be queried.

Syntax: *object*.**IsReady** **As Boolean**

**True** when Windows answers a request for the free space of the drive. This raises no error, so it is the test to make before reading a size, a label or a serial number.

### Path
{: .no_toc }

The path of the drive. This is the default member, so an object used where a string is wanted gives its path.

Syntax: *object*.**Path** **As String**

The letter and a colon, `C:`, or `\\server\share`. There is no backslash at the end.

### RootFolder
{: .no_toc }

The root folder of the drive.

Syntax: *object*.**RootFolder** **As Folder**

Returns the [**Folder**](Folder) for the root of the drive, `C:\`.

### SerialNumber
{: .no_toc }

The serial number of the volume, as a signed **Long**.

Syntax: *object*.**SerialNumber** **As Long**

The serial number is an unsigned 32-bit value, and a **Long** is signed, so a number with its highest bit set is negative. [**SerialNumberHex**](#serialnumberhex) gives the usual form, and [**UnsignedSerialNumber**](#unsignedserialnumber) the number.

### SerialNumberHex
{: .no_toc }

The serial number of the volume, in the form that Windows Explorer shows.

Syntax: *object*.**SerialNumberHex** **As String**

Eight hexadecimal digits with a hyphen in the middle, `D4A1-B2C3`.

### ShareName
{: .no_toc }

The network path of the drive.

Syntax: *object*.**ShareName** **As String**

For a **Drive** made from a network path, the path itself. An empty string for a local drive. For a drive letter that is mapped to a network path, the property asks Windows for that path.

### TotalSize
{: .no_toc }

The size of the volume, in bytes.

Syntax: *object*.**TotalSize** **As LongLong**

### UnsignedSerialNumber
{: .no_toc }

The serial number of the volume, as an unsigned number.

Syntax: *object*.**UnsignedSerialNumber** **As LongLong**

A value from 0 to 4,294,967,295.

### VolumeName
{: .no_toc }

The label of the volume.

Syntax: *object*.**VolumeName** [ **=** *value* ]

Reading returns the label, which is an empty string when the volume has none. Setting it changes the label of the volume.

## See Also

- [Drives](Drives) class -- the collection that **GetDrives** returns
- [Folder](Folder) class -- the root folder of a drive
- [FileSystemTools](FileSystemTools#getdrive) module -- **GetDrive**, **GetDrives** and **DriveExists**
- [ChDrive](../../../Modules/FileSystem/ChDrive) statement -- the VBA statement that changes the current drive
