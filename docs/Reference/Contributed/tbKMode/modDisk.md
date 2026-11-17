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

<!-- test: DiskTests.DISK_GEOMETRY_Size, DiskTests.PARTITION_INFORMATION_Size, DiskTests.BOOT_SECTOR_Size, DiskTests.DIR_ENTRY_Size -->
| Name | Description |
|------|-------------|
| **BOOT_SECTOR**{: #BOOT_SECTOR } | The boot sector of a FAT12 or FAT16 volume, 512 bytes, packed to 1 byte: the BIOS parameter block (bytes per sector, sectors per cluster, root directory entries, sectors, media byte), the volume ID and label, and the signature at its end. |
| **DEVICE_EXTENSION**{: #DEVICE_EXTENSION } | The RAM-disk driver's device extension: its own, lower and physical device objects, its Plug and Play state (**DEVICE_STATE**), its remove lock, the address of the disk image, its geometry and settings, its symbolic link, and buffers for its drive letter and DOS device name. |
| **DIR_ENTRY**{: #DIR_ENTRY } | An entry of a FAT directory, 32 bytes: the 8.3 name, the attributes, ten reserved bytes, the time and date, the first cluster and the file size. Packed to 1 byte. |
| [**DISK_GEOMETRY**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntdddisk/ns-ntdddisk-_disk_geometry){: #DISK_GEOMETRY } | A disk's geometry: cylinders, media type, tracks per cylinder, sectors per track and bytes per sector, as `IOCTL_DISK_GET_DRIVE_GEOMETRY` returns it. **Cylinders** is a **LongLong** where C has a **LARGE_INTEGER**. |
| **DISK_INFO**{: #DISK_INFO } | The RAM disk's settings: its size in bytes, the number of root directory entries, the sectors per cluster, and its drive letter as a **UNICODE_STRING**. |
| [**MOUNTDEV_NAME**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/mountmgr/ns-mountmgr-_mountdev_name){: #MOUNTDEV_NAME } | A device's name for the mount manager, as `IOCTL_MOUNTDEV_QUERY_DEVICE_NAME` returns it: its length in bytes and its characters. The C structure ends in an array of any length; here **Name** holds 8 characters at most, room for `RAMDisk` and no more. |
| [**PARTITION_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntdddisk/ns-ntdddisk-_partition_information){: #PARTITION_INFORMATION } | A partition's offset, length, hidden sectors, number, type and flags, as `IOCTL_DISK_GET_PARTITION_INFO` returns it. Its **BOOLEAN** fields are **Byte**. |
| **RAMDISK_DRIVER_EXTENSION**{: #RAMDISK_DRIVER_EXTENSION } | The RAM-disk driver's driver-object extension: the registry path it was started with, and whether its device has been set up. |
<!-- /test -->

## Enumerations

<!-- test: DiskTests.MEDIA_TYPE_Values -->
| Name | Description |
|------|-------------|
| **DEVICE_STATE**{: #DEVICE_STATE } | The Plug and Play state the RAM-disk driver keeps in **DEVICE_EXTENSION.DevState**: **STOPPED** (0), **WORKING**, **PENDINGSTOP**, **PENDINGREMOVE**, **SURPRISEREMOVED**, **REMOVED** and **MAX_STATE** (6). |
| [**MEDIA_TYPE**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntdddisk/ne-ntdddisk-media_type){: #MEDIA_TYPE } | The Win32 **MEDIA_TYPE**: **Unknown** (0), the floppy formats from **F5_1Pt2_512** to **F3_32M_512** (25), **RemovableMedia** (11) and **FixedMedia** (12). |
<!-- /test -->

## Constants

<!-- test: compile DefaultDiskSizeIsUsable -->
| Name | Value | Description |
|------|-------|-------------|
| **DEFAULT_DISK_SIZE**{: #DEFAULT_DISK_SIZE } | `(1024& * 1024)` | The RAM disk's size when the registry sets none: 1 MB, a **Long**. |
| **DEFAULT_ROOT_DIR_ENTRIES**{: #DEFAULT_ROOT_DIR_ENTRIES } | `512` | The number of root directory entries when the registry sets none. |
| **DEFAULT_SECTORS_PER_CLUSTER**{: #DEFAULT_SECTORS_PER_CLUSTER } | `2` | The sectors per cluster when the registry sets none. |
| **DIR_ENTRIES_PER_SECTOR**{: #DIR_ENTRIES_PER_SECTOR } | `16` | The directory entries in one 512-byte sector. |
| **DOS_DEVNAME_BUFFER_SIZE**{: #DOS_DEVNAME_BUFFER_SIZE } | `((24) / 2) + 10` | The characters of **DEVICE_EXTENSION.DosDeviceNameBuffer**: 22. |
| **DOS_DEVNAME_LENGTH**{: #DOS_DEVNAME_LENGTH } | `(24 + 2 * 10)` | The same buffer's size in bytes: 44. |
| **DRIVE_LETTER_BUFFER_SIZE**{: #DRIVE_LETTER_BUFFER_SIZE } | `10&` | The characters of **DEVICE_EXTENSION.DriveLetterBuffer**. |
| **DRIVE_LETTER_LENGTH**{: #DRIVE_LETTER_LENGTH } | `2 * 10` | The same buffer's size in bytes: 20. |
| **FLAG_LINK_CREATED**{: #FLAG_LINK_CREATED } | `&H1` | A bit for **DEVICE_EXTENSION.Flags**: the symbolic link has been created. |
| **RAMDISK_MEDIA_TYPE**{: #RAMDISK_MEDIA_TYPE } | `&HF8` | The media byte of the boot sector (**BOOT_SECTOR.bsMedia**): a fixed disk. |
| **REMLOCK_HIGHWATER**{: #REMLOCK_HIGHWATER } | `10` | A high-water mark for the remove lock, the *HighWater* argument of [**IoInitializeRemoveLock**](modWDM#IoInitializeRemoveLock). |
| **REMLOCK_MAXIMUM**{: #REMLOCK_MAXIMUM } | `1` | A limit in minutes for the remove lock, the *Maxmin* argument of **IoInitializeRemoveLock**. |
<!-- /test -->

## Variables

Only **DEFAULT_DRIVE_LETTER** has a value; the others are for the driver to set.

| Name | Type | Description |
|------|------|-------------|
| **DEFAULT_DRIVE_LETTER**{: #DEFAULT_DRIVE_LETTER } | **String** | The RAM disk's drive letter when the registry sets none, `"Z:"`. |
| **RAMDISK_DRIVER_EXTENSION_KEY**{: #RAMDISK_DRIVER_EXTENSION_KEY } | **LongPtr** | A key for the driver-object extension, **RAMDISK_DRIVER_EXTENSION**. |
| **REMLOCK_TAG**{: #REMLOCK_TAG } | **String** | A tag for the remove lock. **IoInitializeRemoveLock** takes its tag as a **Long**. |

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
