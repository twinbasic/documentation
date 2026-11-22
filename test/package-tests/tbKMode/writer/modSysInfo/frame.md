---
title: modSysInfo
parent: tbKMode Package
permalink: /tB/Packages/Contributed/tbKMode/modSysInfo
has_toc: false
---

# modSysInfo module
{: .no_toc }

Declarations for asking Windows about the system, processes, access tokens, objects, files and volumes: the `Zw` information routines of `ntoskrnl.exe`, the information classes they take, and the structures and flags that each class reads or writes.

Each routine takes a class, a member of an enumeration such as [**SYSTEM_INFORMATION_CLASS**](#SYSTEM_INFORMATION_CLASS), and a buffer with its length. The buffer holds the structure that the class reads or writes: each structure's row in the [table of structures](#types) ends with its classes. A routine returns an **NTSTATUS**, which is negative for an error.

Microsoft documents most of the `FILE_`, `FILE_FS_` and `TOKEN_` structures and the classes of files, volumes, tokens and objects; a name with a link here has a page on Microsoft Learn. It documents only a few of the classes of the system and of processes, on the pages of [**ZwQuerySystemInformation**](#ZwQuerySystemInformation) and [**ZwQueryInformationProcess**](#ZwQueryInformationProcess), and the process parameters only in part. The other classes, most of the `SYSTEM_` structures and the process environment blocks are not documented: they are the structures of Windows' own headers, as the System Informer project's `phnt` headers describe them, and a new version of Windows can change them. The process environment block and the process parameters have a structure for each version of Windows that changed them, such as [**PEB_WIN10_R5**](#PEB_WIN10_R5) and [**RTL_USER_PROCESS_PARAMETERS_WIN10_R5**](#RTL_USER_PROCESS_PARAMETERS_WIN10_R5).

Some of the structures hold fields of types that [**modWDM**](modWDM) declares, such as **UNICODE_STRING**, **LARGE_INTEGER** and **IO_STATUS_BLOCK**.

* TOC
{:toc}

## Declares

Every routine is in `ntoskrnl.exe`. A parameter with no `ByVal` is passed by reference: the buffer, which is `As Any`, the **IO_STATUS_BLOCK**, and *ReturnLength*, which receives the length the routine wrote or needs.

{{table:declares}}

## Types

<!-- test: {{cases:SysInfoLayoutTests SysInfoArrayTests}} -->
The fields of each structure that the WDK's headers declare are at the C fields' offsets, in a 32-bit and in a 64-bit build, and the structure has the C structure's size, apart from the one of the note below. Where the C structure ends in an array of one element that stands for an array of any length, the structure here ends in an array of one element too, held inline, as with **SYSTEM_HANDLE_INFORMATION.Handles**, or, for a file name or a volume label, in an array of a fixed length, most often **MAX_PATH** + 1 characters, with a size of its own. A driver passes a buffer large enough for the entries, and reads them from the offset of that last field.

{{table:types}}
<!-- /test -->

## Enumerations

<!-- test: {{cases:SysInfoValueTests -Constants_Values}} -->
Every member that the WDK's headers declare has the value of the WDK's constant or enumerator of the same name.

{{table:enums}}
<!-- /test -->

## Constants

<!-- test: SysInfoValueTests.Constants_Values -->
{{table:consts}}
<!-- /test -->

## Example

The number of processors, and the size of an open file from the handle that **ZwCreateFile** of [modWDM](modWDM) returned.

```tb check_build
Module SystemQueries
    Public Function ProcessorCount() As Long
        Dim info As SYSTEM_BASIC_INFORMATION
        Dim needed As Long
        If ZwQuerySystemInformation(SystemBasicInformation, info, LenB(info), needed) >= 0 Then
            Return info.NumberOfProcessors
        End If
    End Function

    Public Function GetFileSize(ByVal FileHandle As LongPtr, Size As LongLong) As Long
        Dim iosb As IO_STATUS_BLOCK
        Dim info As FILE_STANDARD_INFORMATION
        Dim status As Long
        status = ZwQueryInformationFile(FileHandle, iosb, info, LenB(info), FileStandardInformation)
        If status >= 0 Then Size = info.EndOfFile.QuadPart
        Return status
    End Function
End Module
```

## See Also

- [modWDM](modWDM) module -- the types and routines every driver uses
- [modFltMgr](modFltMgr) module -- **FltQueryInformationFile** and **FltSetInformationFile**, which take a **FILE_INFORMATION_CLASS**
- [ZwQueryInformationFile](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwqueryinformationfile) -- Microsoft's reference, with the structure of each file class
- [ZwQueryVolumeInformationFile](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-zwqueryvolumeinformationfile) -- Microsoft's reference, with the structure of each volume class
