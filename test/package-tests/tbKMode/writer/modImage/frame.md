---
title: modImage
parent: tbKMode Package
permalink: /tB/Packages/Contributed/tbKMode/modImage
has_toc: false
---

# modImage module
{: .no_toc }

Structures, enumerations and constants of the Portable Executable (PE) format: the headers of an executable image or an object file, its sections, and its export, import, relocation, debug and load configuration data.

A driver reads them from an image in memory, such as the one whose base address its load-image notify routine receives in [**IMAGE_INFO.ImageBase**](modWDM#IMAGE_INFO). An image starts with an [**IMAGE_DOS_HEADER**](#IMAGE_DOS_HEADER), whose **e_lfanew** is the offset of its [**IMAGE_NT_HEADERS**](#IMAGE_NT_HEADERS); [**RtlImageNtHeader**](modWDM#RtlImageNtHeader) returns their address. The data directories of the optional header give the address and the size of each table, relative to the image's base.

A structure whose name has no `32` or `64`, such as **IMAGE_NT_HEADERS**, **IMAGE_OPTIONAL_HEADER** and **IMAGE_THUNK_DATA**, is the structure of the driver's own build: in a 64-bit driver the structure of a 64-bit image. A driver that reads an image of the other kind uses the structure with the suffix. Microsoft describes the format in the [PE format specification](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format).

* TOC
{:toc}

## Types

<!-- test: {{cases:ImageLayoutTests}} -->
Each structure that the WDK's `ntimage.h` declares has the size of its C structure, and its fields are at the C fields' offsets, in a 32-bit and in a 64-bit build, apart from those of the warning and the note below.

{{table:types}}
<!-- /test -->

<!-- test: ImageLayoutTests.IMAGE_AUX_SYMBOL_Layout, ImageLayoutTests.IMAGE_AUX_SYMBOL_EX_Layout, ImageLayoutTests.IMAGE_LOAD_CONFIG_DIRECTORY32_Layout, ImageLayoutTests.IMAGE_LOAD_CONFIG_DIRECTORY_Layout -->
> [!WARNING] 0.3.0.5
> Three structures do not have the C structure's layout, so a driver that reads one from an image reads other data than the field it names. A driver declares each one itself, as `ntimage.h` has it.
>
> - **IMAGE_AUX_SYMBOL** and **IMAGE_AUX_SYMBOL_EX** lay the members of C's union out one after another, where C has each of them at the start of the structure: only the first, the **Sym_** fields, is at its place, and **TokenDef** is at offset 56 in one and 58 in the other, where C's is at 0. Each is longer than C's structure, which is the size of one symbol table entry.
> - **IMAGE_LOAD_CONFIG_DIRECTORY32**, and **IMAGE_LOAD_CONFIG_DIRECTORY** in a 32-bit build, has **ProcessAffinityMask** before **ProcessHeapFlags**, the order of the 64-bit structure: at offset 44 and 48 where C's are at 48 and 44.


## Enumerations

<!-- test: {{cases:ImageValueTests}} -->
Every member that `ntimage.h` declares has the value of its constant or enumerator of the same name, apart from those of the note below.

{{table:enums}}
<!-- /test -->

<!-- test: ImageFieldTests.MachineTypes_EqualTheMachineField -->
> [!WARNING] 0.3.0.5
> The members of **ImageMachineType** above `&H7FFF`, such as **IMAGE_FILE_MACHINE_AMD64** (`&H8664&`) and **IMAGE_FILE_MACHINE_ARM64** (`&HAA64&`), are positive **Long** values, but **IMAGE_FILE_HEADER.Machine** is an **Integer**, which holds them as negative numbers: `hdr.Machine = IMAGE_FILE_MACHINE_AMD64` is **False** for the header of an AMD64 image. A driver compares `hdr.Machine And &HFFFF&` with the constant.

<!-- test: ImageValueTests.IMAGE_STORAGE_CLASS_Values -->
> [!NOTE] 0.3.0.5
> **IMAGE_SYM_CLASS_END_OF_FUNCTION** of **IMAGE_STORAGE_CLASS** is -1, where C's is `(UCHAR)-1`, 255. It is not equal to the **StorageClass** of a symbol, a **Byte**, that holds 255.

## Constants

{{table:consts}}

<!-- test: ImageValueTests.Constants_Values -->
> [!NOTE] 0.3.0.5
> **IMAGE_ARCHIVE_END**, **IMAGE_ARCHIVE_PAD** and **IMAGE_ARCHIVE_START** end in the two characters `\n`, a backslash and an `n`, where C's end in a line feed: a twinBASIC string has no escapes. A driver that compares them with the bytes of an archive writes `vbLf` in place of `\n`. **UNWIND_HISTORY_TABLE_SIZE** is 32, where the C headers' is 12, so **UNWIND_HISTORY_TABLE** has 32 entries where C's has 12. The other constants that `ntimage.h` declares have its values.

## Example

The address of the entry point of an image in memory, from its headers.

```tb check_build
Module ImageHeaders
    ' The entry point of the image mapped at ImageBase, or 0 when it is no PE image.
    Public Function EntryPointOf(ByVal ImageBase As LongPtr) As LongPtr
        Dim dos As IMAGE_DOS_HEADER
        CopyMemory dos, ByVal ImageBase, LenB(dos)
        If dos.e_magic <> IMAGE_DOS_SIGNATURE Then Return 0
        Dim nt As IMAGE_NT_HEADERS
        CopyMemory nt, ByVal ImageBase + dos.e_lfanew, LenB(nt)
        If nt.Signature <> IMAGE_NT_SIGNATURE Then Return 0
        Return ImageBase + nt.OptionalHeader.AddressOfEntryPoint
    End Function
End Module
```

## See Also

- [modWDM](modWDM) module -- **IMAGE_INFO**, **RtlImageNtHeader** and **RtlImageDirectoryEntryToData**
- [PE format](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format) -- Microsoft's specification of the format
