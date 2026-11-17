---
title: modDisk
parent: tbKMode Package
permalink: /tB/Packages/Contributed/tbKMode/modDisk
has_toc: false
---

# modDisk module
{: .no_toc }

Structures, enumerations and constants for a driver that presents a disk: its geometry, its partitions and a FAT volume on it.

Four of its structures and enumerations are the Win32 ones that the disk IOCTLs exchange, **DISK_GEOMETRY**, **MEDIA_TYPE**, **PARTITION_INFORMATION** and **MOUNTDEV_NAME**. The rest serve a RAM-disk driver, which keeps a disk image in memory and formats it as a FAT volume: its device extension, the boot sector and directory entry it writes, and its default size. A driver of another kind uses the first four and declares its own device extension.

Most of these structures hold fields of types that [**modWDM**](modWDM) declares, such as **UNICODE_STRING** and **IO_REMOVE_LOCK**.

* TOC
{:toc}

## Types

<!-- test: {{cases:DiskTests -MEDIA_TYPE_Values}} -->
{{table:types}}
<!-- /test -->

## Enumerations

<!-- test: DiskTests.MEDIA_TYPE_Values -->
{{table:enums}}
<!-- /test -->

## Constants

<!-- test: compile DefaultDiskSizeIsUsable -->
{{table:consts}}
<!-- /test -->

## Variables

Only **DEFAULT_DRIVE_LETTER** has a value; the others are for the driver to set.

{{table:variables typed}}

## Example

The geometry a RAM disk of 1 MB, the default size, reports: one track per cylinder of 32 sectors of 512 bytes, so that the cylinders hold the whole disk.

```tb check_build
Dim g As DISK_GEOMETRY
g.MediaType = FixedMedia
g.BytesPerSector = 512
g.SectorsPerTrack = 32
g.TracksPerCylinder = 1
g.Cylinders = DEFAULT_DISK_SIZE \ (CLng(g.BytesPerSector) * g.SectorsPerTrack * g.TracksPerCylinder)
```

## See Also

- [modWDM](modWDM) module -- **UNICODE_STRING**, **IO_REMOVE_LOCK** and the routines a disk driver calls
- [Disk devices](https://learn.microsoft.com/en-us/windows/win32/api/winioctl/) -- the Win32 disk IOCTLs and structures
- [Using remove locks](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/using-remove-locks)
