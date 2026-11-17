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

<!-- test: ImageLayoutTests.ANON_OBJECT_HEADER_Layout, ImageLayoutTests.ANON_OBJECT_HEADER_BIGOBJ_Layout, ImageLayoutTests.ANON_OBJECT_HEADER_V2_Layout, ImageLayoutTests.FPO_DATA_Layout, ImageLayoutTests.IMAGE_ARCHIVE_MEMBER_HEADER_Layout, ImageLayoutTests.IMAGE_AUX_SYMBOL_TOKEN_DEF_Layout, ImageLayoutTests.IMAGE_BASE_RELOCATION_Layout, ImageLayoutTests.IMAGE_BOUND_FORWARDER_REF_Layout, ImageLayoutTests.IMAGE_BOUND_IMPORT_DESCRIPTOR_Layout, ImageLayoutTests.IMAGE_COFF_SYMBOLS_HEADER_Layout, ImageLayoutTests.IMAGE_DATA_DIRECTORY_Layout, ImageLayoutTests.IMAGE_DEBUG_DIRECTORY_Layout, ImageLayoutTests.IMAGE_DEBUG_MISC_Layout, ImageLayoutTests.IMAGE_DELAYLOAD_DESCRIPTOR_Layout, ImageLayoutTests.IMAGE_DOS_HEADER_Layout, ImageLayoutTests.IMAGE_DYNAMIC_RELOCATION_Layout, ImageLayoutTests.IMAGE_DYNAMIC_RELOCATION32_Layout, ImageLayoutTests.IMAGE_DYNAMIC_RELOCATION32_V2_Layout, ImageLayoutTests.IMAGE_DYNAMIC_RELOCATION64_Layout, ImageLayoutTests.IMAGE_DYNAMIC_RELOCATION64_V2_Layout, ImageLayoutTests.IMAGE_DYNAMIC_RELOCATION_TABLE_Layout, ImageLayoutTests.IMAGE_DYNAMIC_RELOCATION_V2_Layout, ImageLayoutTests.IMAGE_EXPORT_DIRECTORY_Layout, ImageLayoutTests.IMAGE_FILE_HEADER_Layout, ImageLayoutTests.IMAGE_IMPORT_BY_NAME_Layout, ImageLayoutTests.IMAGE_IMPORT_DESCRIPTOR_Layout, ImageLayoutTests.IMAGE_LINENUMBER_Layout, ImageLayoutTests.IMAGE_LOAD_CONFIG_CODE_INTEGRITY_Layout, ImageLayoutTests.IMAGE_LOAD_CONFIG_DIRECTORY64_Layout, ImageLayoutTests.IMAGE_NT_HEADERS_Layout, ImageLayoutTests.IMAGE_NT_HEADERS32_Layout, ImageLayoutTests.IMAGE_NT_HEADERS64_Layout, ImageLayoutTests.IMAGE_OPTIONAL_HEADER_Layout, ImageLayoutTests.IMAGE_OPTIONAL_HEADER32_Layout, ImageLayoutTests.IMAGE_OPTIONAL_HEADER64_Layout, ImageLayoutTests.IMAGE_POLICY_ENTRY_Layout, ImageLayoutTests.IMAGE_POLICY_METADATA_Layout, ImageLayoutTests.IMAGE_RELOCATION_Layout, ImageLayoutTests.IMAGE_RESOURCE_DATA_ENTRY_Layout, ImageLayoutTests.IMAGE_RESOURCE_DIRECTORY_Layout, ImageLayoutTests.IMAGE_RESOURCE_DIRECTORY_ENTRY_Layout, ImageLayoutTests.IMAGE_RESOURCE_DIRECTORY_STRING_Layout, ImageLayoutTests.IMAGE_RESOURCE_DIR_STRING_U_Layout, ImageLayoutTests.IMAGE_ROM_HEADERS_Layout, ImageLayoutTests.IMAGE_ROM_OPTIONAL_HEADER_Layout, ImageLayoutTests.IMAGE_RUNTIME_FUNCTION_ENTRY_Layout, ImageLayoutTests.IMAGE_SECTION_HEADER_Layout, ImageLayoutTests.IMAGE_SYMBOL_Layout, ImageLayoutTests.IMAGE_SYMBOL_EX_Layout, ImageLayoutTests.IMAGE_THUNK_DATA_Layout, ImageLayoutTests.IMAGE_THUNK_DATA32_Layout, ImageLayoutTests.IMAGE_THUNK_DATA64_Layout, ImageLayoutTests.IMAGE_TLS_DIRECTORY_Layout, ImageLayoutTests.IMAGE_TLS_DIRECTORY32_Layout, ImageLayoutTests.IMAGE_TLS_DIRECTORY64_Layout -->
Each structure that the WDK's `ntimage.h` declares has the size of its C structure, and its fields are at the C fields' offsets, in a 32-bit and in a 64-bit build, apart from those of the warning and the note below.

| Name | Description |
|------|-------------|
| **ANON_OBJECT_HEADER**{: #ANON_OBJECT_HEADER } | The header of an anonymous object file, which starts with **Sig1** `IMAGE_FILE_MACHINE_UNKNOWN` and **Sig2** `&HFFFF` where a COFF file header has its machine: the version, the machine, the class ID of the object's handler and the size of the data that follows. |
| **ANON_OBJECT_HEADER_BIGOBJ**{: #ANON_OBJECT_HEADER_BIGOBJ } | The header of an object file compiled with `/bigobj`: as **ANON_OBJECT_HEADER_V2**, with 32-bit counts of sections and symbols and the file offset of the symbol table, whose records are **IMAGE_SYMBOL_EX**. |
| **ANON_OBJECT_HEADER_V2**{: #ANON_OBJECT_HEADER_V2 } | As **ANON_OBJECT_HEADER**, version 2 or later: with **Flags**, and the size and offset of the CLR metadata the object holds. |
| [**FPO_DATA**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-fpo_data){: #FPO_DATA } | The frame-pointer-omission information of one function, in an image's debug information: its code's offset and size, the sizes of its locals and parameters, and in **Flags** the C bit fields: prolog size, saved registers, SEH, EBP use and the frame type (**FPO_FRAME**). |
| **IMAGE_ARCHIVE_MEMBER_HEADER**{: #IMAGE_ARCHIVE_MEMBER_HEADER } | The header before each member of an archive (a `.lib` file): the member's name, date, user and group IDs, mode and size, each as text, and the two characters of **IMAGE_ARCHIVE_END**. |
| **IMAGE_AUX_SYMBOL**{: #IMAGE_AUX_SYMBOL } | An auxiliary record after an **IMAGE_SYMBOL**: the details of a function, a file name, a section definition, a CLR token or a CRC, which C declares as a union. See the warning below. |
| **IMAGE_AUX_SYMBOL_EX**{: #IMAGE_AUX_SYMBOL_EX } | An auxiliary record after an **IMAGE_SYMBOL_EX**, in a `/bigobj` object file: a weak external, a file name, a section definition, a CLR token or a CRC, which C declares as a union. See the warning below. |
| **IMAGE_AUX_SYMBOL_TOKEN_DEF**{: #IMAGE_AUX_SYMBOL_TOKEN_DEF } | The auxiliary record of a CLR token definition: its type, `IMAGE_AUX_SYMBOL_TYPE_TOKEN_DEF`, and the index of its symbol in the symbol table. |
| **IMAGE_BASE_RELOCATION**{: #IMAGE_BASE_RELOCATION } | The header of one block of base relocations, in the `.reloc` section: the RVA of the page and the size of the block. The block's entries follow it, an **Integer** each, with the type (**IMAGE_REL_NS_BASED**) in the top 4 bits and the offset in the page in the other 12. |
| **IMAGE_BOUND_FORWARDER_REF**{: #IMAGE_BOUND_FORWARDER_REF } | A DLL that a bound import forwards to: its time stamp and the offset of its name from the start of the bound import directory. |
| **IMAGE_BOUND_IMPORT_DESCRIPTOR**{: #IMAGE_BOUND_IMPORT_DESCRIPTOR } | One DLL of the bound import directory: the time stamp of the DLL the image was bound to, the offset of its name, and the number of **IMAGE_BOUND_FORWARDER_REF** that follow. |
| [**IMAGE_COFF_SYMBOLS_HEADER**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-image_coff_symbols_header){: #IMAGE_COFF_SYMBOLS_HEADER } | The header of the COFF debug information (`IMAGE_DEBUG_TYPE_COFF`): the number of symbols and line numbers and where they start, and the first and last RVAs of the code and the data. |
| [**IMAGE_DATA_DIRECTORY**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-image_data_directory){: #IMAGE_DATA_DIRECTORY } | The RVA and size of one table of an image, such as the import or the export directory: an entry of **IMAGE_OPTIONAL_HEADER.DataDirectory**, at the index of its **ImageDirectories** value. |
| [**IMAGE_DEBUG_DIRECTORY**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-image_debug_directory){: #IMAGE_DEBUG_DIRECTORY } | One entry of an image's debug directory: the kind of debug information (**IMAGE_DEBUG_TYPE**), its size, and its RVA and file offset. |
| **IMAGE_DEBUG_MISC**{: #IMAGE_DEBUG_MISC } | A miscellaneous debug record (`IMAGE_DEBUG_TYPE_MISC`): the type of its data, its length rounded up to a multiple of four, whether the data is a Unicode string, and the first byte of the data. |
| **IMAGE_DELAYLOAD_DESCRIPTOR**{: #IMAGE_DELAYLOAD_DESCRIPTOR } | One DLL of the delay-load import table: the RVAs of its name, its module handle, its import address and name tables and the optional bound and unload tables, and the time stamp of the DLL it was bound to. **AllAttributes** holds the C union of the attribute bits. |
| **IMAGE_DOS_HEADER**{: #IMAGE_DOS_HEADER } | The MS-DOS header at the start of every image: **e_magic** is **IMAGE_DOS_SIGNATURE**, and **e_lfanew** is the file offset of the **IMAGE_NT_HEADERS**. |
| **IMAGE_DYNAMIC_RELOCATION**{: #IMAGE_DYNAMIC_RELOCATION } | As **IMAGE_DYNAMIC_RELOCATION32** in a 32-bit build and **IMAGE_DYNAMIC_RELOCATION64** in a 64-bit one. |
| **IMAGE_DYNAMIC_RELOCATION_TABLE**{: #IMAGE_DYNAMIC_RELOCATION_TABLE } | The header of the dynamic value relocation table that the load configuration directory points to: its version and size. The relocations follow it. |
| **IMAGE_DYNAMIC_RELOCATION_V2**{: #IMAGE_DYNAMIC_RELOCATION_V2 } | As **IMAGE_DYNAMIC_RELOCATION32_V2** in a 32-bit build and **IMAGE_DYNAMIC_RELOCATION64_V2** in a 64-bit one. |
| **IMAGE_DYNAMIC_RELOCATION32**{: #IMAGE_DYNAMIC_RELOCATION32 } | The header of one dynamic value relocation of a 32-bit image: its symbol and the size of the base relocations that follow it. |
| **IMAGE_DYNAMIC_RELOCATION32_V2**{: #IMAGE_DYNAMIC_RELOCATION32_V2 } | The header of one version 2 dynamic value relocation of a 32-bit image: its own size, the size of the fixup information that follows, its symbol, symbol group and flags. |
| **IMAGE_DYNAMIC_RELOCATION64**{: #IMAGE_DYNAMIC_RELOCATION64 } | The header of one dynamic value relocation of a 64-bit image: its symbol and the size of the base relocations that follow it. |
| **IMAGE_DYNAMIC_RELOCATION64_V2**{: #IMAGE_DYNAMIC_RELOCATION64_V2 } | The header of one version 2 dynamic value relocation of a 64-bit image: its own size, the size of the fixup information that follows, its symbol, symbol group and flags. |
| **IMAGE_EXPORT_DIRECTORY**{: #IMAGE_EXPORT_DIRECTORY } | An image's export directory: the RVA of the DLL's name, the first ordinal, the number of functions and of names, and the RVAs of the export address table, the name pointer table and the ordinal table. |
| [**IMAGE_FILE_HEADER**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-image_file_header){: #IMAGE_FILE_HEADER } | The COFF file header of an image or an object file: the machine (**ImageMachineType**), the number of sections, the time stamp, the symbol table's offset and size, the size of the optional header and the characteristics (**ImageFileCharacteristics**). |
| **IMAGE_IMPORT_BY_NAME**{: #IMAGE_IMPORT_BY_NAME } | An entry of the hint/name table: the hint, an index into the DLL's export name table, and the name of the imported function, null-terminated. **Name** holds 100 bytes here; in the image it is as long as the name. |
| **IMAGE_IMPORT_DESCRIPTOR**{: #IMAGE_IMPORT_DESCRIPTOR } | One DLL of an image's import directory: **ChrctrsOrOrigThunk** holds the C union of **Characteristics** and **OriginalFirstThunk**, the RVA of the import lookup table, then come the time stamp, the forwarder chain, and the RVAs of the DLL's name and of its import address table. An entry of zeros ends the directory. |
| **IMAGE_LINENUMBER**{: #IMAGE_LINENUMBER } | One COFF line number: **nType** holds the C union **Type**, the symbol table index of the function when **Linenumber** is 0 and the address of the line's code otherwise. |
| **IMAGE_LOAD_CONFIG_CODE_INTEGRITY**{: #IMAGE_LOAD_CONFIG_CODE_INTEGRITY } | The code integrity information in the load configuration directory: its flags, the catalog (`&HFFFF` when there is none) and the offset in the catalog. |
| **IMAGE_LOAD_CONFIG_DIRECTORY**{: #IMAGE_LOAD_CONFIG_DIRECTORY } | As **IMAGE_LOAD_CONFIG_DIRECTORY32** in a 32-bit build and **IMAGE_LOAD_CONFIG_DIRECTORY64** in a 64-bit one. See the warning below. |
| [**IMAGE_LOAD_CONFIG_DIRECTORY32**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-image_load_config_directory32){: #IMAGE_LOAD_CONFIG_DIRECTORY32 } | The load configuration directory of a 32-bit image: the heap settings, the security cookie, the safe exception handlers and the Control Flow Guard tables, among others. Each version of Windows adds fields, so its **Size** gives the bytes the image holds: the package's has the fields of WDK 10.0.22621, 192 bytes, and WDK 10.0.28000 adds **UmaFunctionPointers**. See the warning below. |
| [**IMAGE_LOAD_CONFIG_DIRECTORY64**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-image_load_config_directory64){: #IMAGE_LOAD_CONFIG_DIRECTORY64 } | The load configuration directory of a 64-bit image: the heap settings, the security cookie and the Control Flow Guard tables, among others. Each version of Windows adds fields, so its **Size** gives the bytes the image holds: the package's has the fields of WDK 10.0.22621, 320 bytes, and WDK 10.0.28000 adds **UmaFunctionPointers**. |
| **IMAGE_NT_HEADERS**{: #IMAGE_NT_HEADERS } | As **IMAGE_NT_HEADERS32** in a 32-bit build and **IMAGE_NT_HEADERS64** in a 64-bit one. |
| [**IMAGE_NT_HEADERS32**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-image_nt_headers32){: #IMAGE_NT_HEADERS32 } | The headers of a 32-bit (PE32) image, at **IMAGE_DOS_HEADER.e_lfanew**: the signature **IMAGE_NT_SIGNATURE**, the file header and the 32-bit optional header. |
| [**IMAGE_NT_HEADERS64**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-image_nt_headers64){: #IMAGE_NT_HEADERS64 } | The headers of a 64-bit (PE32+) image, at **IMAGE_DOS_HEADER.e_lfanew**: the signature **IMAGE_NT_SIGNATURE**, the file header and the 64-bit optional header. |
| **IMAGE_OPTIONAL_HEADER**{: #IMAGE_OPTIONAL_HEADER } | As **IMAGE_OPTIONAL_HEADER32** in a 32-bit build, and **IMAGE_OPTIONAL_HEADER64**, without **BaseOfData**, in a 64-bit one. |
| [**IMAGE_OPTIONAL_HEADER32**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-image_optional_header32){: #IMAGE_OPTIONAL_HEADER32 } | The optional header of a 32-bit (PE32) image: the sizes of its code and data, the entry point, the preferred base address, the alignments, the versions, the subsystem (**ImageSubsystemType**), the DLL characteristics, the stack and heap sizes and the data directories. |
| [**IMAGE_OPTIONAL_HEADER64**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-image_optional_header64){: #IMAGE_OPTIONAL_HEADER64 } | The optional header of a 64-bit (PE32+) image: as **IMAGE_OPTIONAL_HEADER32**, without **BaseOfData**, with a 64-bit base address and 64-bit stack and heap sizes. |
| [**IMAGE_POLICY_ENTRY**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_image_policy_entry){: #IMAGE_POLICY_ENTRY } | One policy setting that an image embeds: the type of its value, the policy it sets, and the value in **u**, a **LongLong** that holds the C union of a **Boolean**, an integer or a pointer to a string. |
| [**IMAGE_POLICY_METADATA**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_image_policy_metadata){: #IMAGE_POLICY_METADATA } | The policy settings that an image embeds in its `.tPolicy` section: the version, the application ID and the entries, which end with an entry of type `ImagePolicyEntryTypeNone`. **Policies** is an array of a fixed length here. |
| **IMAGE_RELOCATION**{: #IMAGE_RELOCATION } | One COFF relocation of a section of an object file: **VirtAddrOrRelocCt** holds the C union of the address to fix up and the relocation count, then come the symbol's index and the relocation type of the machine, such as **IMAGE_RELOC_TYPE_AMD64**. |
| **IMAGE_RESOURCE_DATA_ENTRY**{: #IMAGE_RESOURCE_DATA_ENTRY } | A leaf of the resource tree: the RVA and size of one resource's data, and its code page. |
| **IMAGE_RESOURCE_DIR_STRING_U**{: #IMAGE_RESOURCE_DIR_STRING_U } | A name in the resource tree, as UTF-16 characters: its length and its characters. **NameString** holds 80 characters here, so a driver copies only **Length** characters. |
| **IMAGE_RESOURCE_DIRECTORY**{: #IMAGE_RESOURCE_DIRECTORY } | The header of one table of the resource tree: its time stamp and version, and the number of entries with names and with IDs that follow it. |
| **IMAGE_RESOURCE_DIRECTORY_ENTRY**{: #IMAGE_RESOURCE_DIRECTORY_ENTRY } | One entry of a resource table: **Name** is the resource's ID, or with **IMAGE_RESOURCE_NAME_IS_STRING** the offset of its name, and **OffsetToData** the offset of its data entry, or with **IMAGE_RESOURCE_DATA_IS_DIRECTORY** of a table one level down. Each field holds a C union of bit fields. |
| **IMAGE_RESOURCE_DIRECTORY_STRING**{: #IMAGE_RESOURCE_DIRECTORY_STRING } | A name in the resource tree, as ANSI characters: its length and its characters. **NameString** holds 80 bytes here, so a driver copies only **Length** characters. |
| **IMAGE_ROM_HEADERS**{: #IMAGE_ROM_HEADERS } | The headers of a ROM image: the file header and the ROM optional header. |
| **IMAGE_ROM_OPTIONAL_HEADER**{: #IMAGE_ROM_OPTIONAL_HEADER } | The optional header of a ROM image, whose **Magic** is `IMAGE_ROM_OPTIONAL_HDR_MAGIC`: the sizes, the entry point, the bases of code, data and uninitialized data, the register masks and the GP value. |
| **IMAGE_RUNTIME_FUNCTION_ENTRY**{: #IMAGE_RUNTIME_FUNCTION_ENTRY } | One entry of the exception directory (`.pdata`) of an x64 image: the start and end RVAs of a function and the RVA of its unwind information. **UnwindInfoAddress** holds the C union with **UnwindData**. |
| [**IMAGE_SECTION_HEADER**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-image_section_header){: #IMAGE_SECTION_HEADER } | One entry of the section table: the section's name, 8 bytes, its size in memory in **Misc** (the C union of **VirtualSize** and **PhysicalAddress**), its RVA, its size and offset in the file, its relocations and line numbers, and its characteristics. |
| **IMAGE_SYMBOL**{: #IMAGE_SYMBOL } | One record of a COFF symbol table, 18 bytes: the name in **N** (the C union of a short name and an offset in the string table), the value, the section number, the type, the storage class and the number of auxiliary records that follow. |
| **IMAGE_SYMBOL_EX**{: #IMAGE_SYMBOL_EX } | As **IMAGE_SYMBOL**, in a `/bigobj` object file: 20 bytes, with a 32-bit section number. |
| **IMAGE_THUNK_DATA**{: #IMAGE_THUNK_DATA } | As **IMAGE_THUNK_DATA32** in a 32-bit build and **IMAGE_THUNK_DATA64** in a 64-bit one. |
| **IMAGE_THUNK_DATA32**{: #IMAGE_THUNK_DATA32 } | One entry of an import lookup table or import address table of a 32-bit image: **u1** holds the C union of an ordinal (with **IMAGE_ORDINAL_FLAG32**), the RVA of an **IMAGE_IMPORT_BY_NAME**, or the address of the imported function. |
| **IMAGE_THUNK_DATA64**{: #IMAGE_THUNK_DATA64 } | One entry of an import lookup table or import address table of a 64-bit image: **u1** holds the C union of an ordinal (with **IMAGE_ORDINAL_FLAG64**), the RVA of an **IMAGE_IMPORT_BY_NAME**, or the address of the imported function. |
| **IMAGE_TLS_DIRECTORY**{: #IMAGE_TLS_DIRECTORY } | As **IMAGE_TLS_DIRECTORY32** in a 32-bit build and **IMAGE_TLS_DIRECTORY64** in a 64-bit one. |
| **IMAGE_TLS_DIRECTORY32**{: #IMAGE_TLS_DIRECTORY32 } | The thread-local storage directory of a 32-bit image: the addresses of the TLS template's start and end, of the TLS index and of the array of TLS callbacks, the size of the zero fill and the characteristics. |
| **IMAGE_TLS_DIRECTORY64**{: #IMAGE_TLS_DIRECTORY64 } | The thread-local storage directory of a 64-bit image: the addresses of the TLS template's start and end, of the TLS index and of the array of TLS callbacks, the size of the zero fill and the characteristics. |
| **PDB_INFO**{: #PDB_INFO } | The CodeView record that an `IMAGE_DEBUG_TYPE_CODEVIEW` debug directory entry points to: its signature, the GUID and age of the PDB file, and the first byte of the PDB's file name, a null-terminated ANSI string that a driver reads up to its null. Not documented by Microsoft. |
| [**RUNTIME_FUNCTION**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-runtime_function){: #RUNTIME_FUNCTION } | The same structure as **IMAGE_RUNTIME_FUNCTION_ENTRY**, under winnt.h's name: one function's entry in the exception directory of an x64 image. |
| **UNWIND_HISTORY_TABLE**{: #UNWIND_HISTORY_TABLE } | A cache of function table lookups that a caller of the unwind routines passes from one call to the next: the count, the search hints, the range of addresses it covers and the entries. winnt.h declares it for x64 and ARM code only. See the note below. |
| **UNWIND_HISTORY_TABLE_ENTRY**{: #UNWIND_HISTORY_TABLE_ENTRY } | One entry of an **UNWIND_HISTORY_TABLE**: the base address of an image and the address of a function's **RUNTIME_FUNCTION** in it. |
<!-- /test -->

<!-- test: ImageLayoutTests.IMAGE_AUX_SYMBOL_Layout, ImageLayoutTests.IMAGE_AUX_SYMBOL_EX_Layout, ImageLayoutTests.IMAGE_LOAD_CONFIG_DIRECTORY32_Layout, ImageLayoutTests.IMAGE_LOAD_CONFIG_DIRECTORY_Layout -->
> [!WARNING] 0.3.0.5
> Three structures do not have the C structure's layout, so a driver that reads one from an image reads other data than the field it names. A driver declares each one itself, as `ntimage.h` has it.
>
> - **IMAGE_AUX_SYMBOL** and **IMAGE_AUX_SYMBOL_EX** lay the members of C's union out one after another, where C has each of them at the start of the structure: only the first, the **Sym_** fields, is at its place, and **TokenDef** is at offset 56 in one and 58 in the other, where C's is at 0. Each is longer than C's structure, which is the size of one symbol table entry.
> - **IMAGE_LOAD_CONFIG_DIRECTORY32**, and **IMAGE_LOAD_CONFIG_DIRECTORY** in a 32-bit build, has **ProcessAffinityMask** before **ProcessHeapFlags**, the order of the 64-bit structure: at offset 44 and 48 where C's are at 48 and 44.


## Enumerations

<!-- test: ImageValueTests.FPO_FRAME_Values, ImageValueTests.IMAGE_AUX_SYMBOL_TYPE_Values, ImageValueTests.IMAGE_COMMUNAL_SELTYPE_Values, ImageValueTests.IMAGE_DEBUG_EX_CH_Values, ImageValueTests.IMAGE_DEBUG_TYPE_Values, ImageValueTests.IMAGE_MAGIC_VALUES_Values, ImageValueTests.IMAGE_POLICY_ENTRY_TYPE_Values, ImageValueTests.IMAGE_POLICY_ID_Values, ImageValueTests.IMAGE_RELOC_TYPE_AMD64_Values, ImageValueTests.IMAGE_RELOC_TYPE_ARM_Values, ImageValueTests.IMAGE_RELOC_TYPE_ARM64_Values, ImageValueTests.IMAGE_RELOC_TYPE_CEE_Values, ImageValueTests.IMAGE_RELOC_TYPE_CEF_Values, ImageValueTests.IMAGE_RELOC_TYPE_EBC_Values, ImageValueTests.IMAGE_RELOC_TYPE_I386_Values, ImageValueTests.IMAGE_RELOC_TYPE_IA64_Values, ImageValueTests.IMAGE_RELOC_TYPE_M32R_Values, ImageValueTests.IMAGE_RELOC_TYPE_MIPS_Values, ImageValueTests.IMAGE_RELOC_TYPE_PPC_Values, ImageValueTests.IMAGE_RELOC_TYPE_SH3_Values, ImageValueTests.IMAGE_REL_BASED_Values, ImageValueTests.IMAGE_REL_NS_BASED_Values, ImageValueTests.IMAGE_SECTION_VALUES_Values, ImageValueTests.IMAGE_SYM_TYPE_Values, ImageValueTests.IMAGE_SYM_TYPE_DERIVED_Values, ImageValueTests.IMAGE_WEAK_EXTERN_Values, ImageValueTests.ImageDirectories_Values, ImageValueTests.ImageDllCharacteristics_Values, ImageValueTests.ImageFileCharacteristics_Values, ImageValueTests.ImageLoadConfigGuardFlags_Values, ImageValueTests.ImageMachineType_Values, ImageValueTests.ImageSectionCharacteristics_Values, ImageValueTests.ImageSubsystemType_Values -->
Every member that `ntimage.h` declares has the value of its constant or enumerator of the same name, apart from those of the note below.

| Name | Description |
|------|-------------|
| **FPO_FRAME**{: #FPO_FRAME } | The frame types of the **cbFrame** bits in **FPO_DATA.Flags**: `FRAME_FPO`, `FRAME_TRAP`, `FRAME_TSS` and `FRAME_NONFPO`. |
| **IMAGE_AUX_SYMBOL_TYPE**{: #IMAGE_AUX_SYMBOL_TYPE } | The types of an auxiliary token record, **IMAGE_AUX_SYMBOL_TOKEN_DEF.bAuxType**: `IMAGE_AUX_SYMBOL_TYPE_TOKEN_DEF`. |
| **IMAGE_COMMUNAL_SELTYPE**{: #IMAGE_COMMUNAL_SELTYPE } | The COMDAT selection types of an auxiliary section record's **Section_Selection**: how the linker chooses among sections with the same COMDAT symbol, such as `IMAGE_COMDAT_SELECT_NODUPLICATES`, `IMAGE_COMDAT_SELECT_ANY` and `IMAGE_COMDAT_SELECT_ASSOCIATIVE`. |
| **IMAGE_DEBUG_EX_CH**{: #IMAGE_DEBUG_EX_CH } | The `IMAGE_DLLCHARACTERISTICS_EX_` flags that an `IMAGE_DEBUG_TYPE_EX_DLLCHARACTERISTICS` debug entry holds: the image's compatibility with the CET shadow stack, such as `IMAGE_DLLCHARACTERISTICS_EX_CET_COMPAT`. |
| **IMAGE_DEBUG_TYPE**{: #IMAGE_DEBUG_TYPE } | The kinds of debug information, for **IMAGE_DEBUG_DIRECTORY.Type**, such as `IMAGE_DEBUG_TYPE_CODEVIEW` (a **PDB_INFO**), `IMAGE_DEBUG_TYPE_POGO` and `IMAGE_DEBUG_TYPE_REPRO`. |
| **IMAGE_MAGIC_VALUES**{: #IMAGE_MAGIC_VALUES } | The values of the optional header's **Magic**: `IMAGE_NT_OPTIONAL_HDR32_MAGIC` for a PE32 image, `IMAGE_NT_OPTIONAL_HDR64_MAGIC` for PE32+ and `IMAGE_ROM_OPTIONAL_HDR_MAGIC` for a ROM image. |
| [**IMAGE_POLICY_ENTRY_TYPE**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ne-wdm-_image_policy_entry_type){: #IMAGE_POLICY_ENTRY_TYPE } | The types of the value of an **IMAGE_POLICY_ENTRY**, such as `ImagePolicyEntryTypeBool`, `ImagePolicyEntryTypeUInt32` and `ImagePolicyEntryTypeUnicodeString`. |
| [**IMAGE_POLICY_ID**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ne-wdm-_image_policy_id){: #IMAGE_POLICY_ID } | The policies that an **IMAGE_POLICY_ENTRY** sets, such as `ImagePolicyIdEtw`, `ImagePolicyIdDebug` and `ImagePolicyIdCrashDump`. See the note below. |
| **IMAGE_REL_BASED**{: #IMAGE_REL_BASED } | The base relocation types that only some machines define, on the machine-specific values of **IMAGE_REL_NS_BASED**, such as `IMAGE_REL_BASED_ARM_MOV32` and `IMAGE_REL_BASED_THUMB_MOV32`. |
| **IMAGE_REL_NS_BASED**{: #IMAGE_REL_NS_BASED } | The base relocation types, in the top 4 bits of each entry of a block after an **IMAGE_BASE_RELOCATION**, such as `IMAGE_REL_BASED_HIGHLOW` for a 32-bit address, `IMAGE_REL_BASED_DIR64` for a 64-bit one and `IMAGE_REL_BASED_ABSOLUTE` for padding. |
| **IMAGE_RELOC_TYPE_AMD64**{: #IMAGE_RELOC_TYPE_AMD64 } | The COFF relocation types of an x64 object file, for **IMAGE_RELOCATION.nType**, such as `IMAGE_REL_AMD64_ADDR64`, `IMAGE_REL_AMD64_ADDR32NB` and `IMAGE_REL_AMD64_REL32`. |
| **IMAGE_RELOC_TYPE_ARM**{: #IMAGE_RELOC_TYPE_ARM } | The COFF relocation types of an ARM object file, for **IMAGE_RELOCATION.nType**, such as `IMAGE_REL_ARM_ADDR32` and `IMAGE_REL_ARM_BRANCH24T`, with the older `IMAGE_REL_THUMB_` names and the `IMAGE_REL_AM_` types. |
| **IMAGE_RELOC_TYPE_ARM64**{: #IMAGE_RELOC_TYPE_ARM64 } | The COFF relocation types of an ARM64 object file, for **IMAGE_RELOCATION.nType**, such as `IMAGE_REL_ARM64_ADDR64`, `IMAGE_REL_ARM64_BRANCH26` and `IMAGE_REL_ARM64_PAGEBASE_REL21`. |
| **IMAGE_RELOC_TYPE_CEE**{: #IMAGE_RELOC_TYPE_CEE } | The COFF relocation types of a CLR object file (`IMAGE_FILE_MACHINE_CEE`), for **IMAGE_RELOCATION.nType**, such as `IMAGE_REL_CEE_ADDR32` and `IMAGE_REL_CEE_TOKEN`. |
| **IMAGE_RELOC_TYPE_CEF**{: #IMAGE_RELOC_TYPE_CEF } | The COFF relocation types of an `IMAGE_FILE_MACHINE_CEF` object file, for **IMAGE_RELOCATION.nType**, such as `IMAGE_REL_CEF_ADDR32` and `IMAGE_REL_CEF_TOKEN`. |
| **IMAGE_RELOC_TYPE_EBC**{: #IMAGE_RELOC_TYPE_EBC } | The COFF relocation types of an EFI Byte Code object file, for **IMAGE_RELOCATION.nType**, such as `IMAGE_REL_EBC_ADDR32NB` and `IMAGE_REL_EBC_REL32`. |
| **IMAGE_RELOC_TYPE_I386**{: #IMAGE_RELOC_TYPE_I386 } | The COFF relocation types of an x86 object file, for **IMAGE_RELOCATION.nType**, such as `IMAGE_REL_I386_DIR32`, `IMAGE_REL_I386_DIR32NB` and `IMAGE_REL_I386_REL32`. |
| **IMAGE_RELOC_TYPE_IA64**{: #IMAGE_RELOC_TYPE_IA64 } | The COFF relocation types of an Itanium object file, for **IMAGE_RELOCATION.nType**, such as `IMAGE_REL_IA64_DIR64` and `IMAGE_REL_IA64_PCREL21B`. |
| **IMAGE_RELOC_TYPE_M32R**{: #IMAGE_RELOC_TYPE_M32R } | The COFF relocation types of an M32R object file, for **IMAGE_RELOCATION.nType**, such as `IMAGE_REL_M32R_ADDR32` and `IMAGE_REL_M32R_PCREL24`. |
| **IMAGE_RELOC_TYPE_MIPS**{: #IMAGE_RELOC_TYPE_MIPS } | The COFF relocation types of a MIPS object file, for **IMAGE_RELOCATION.nType**, such as `IMAGE_REL_MIPS_REFWORD` and `IMAGE_REL_MIPS_JMPADDR`. |
| **IMAGE_RELOC_TYPE_PPC**{: #IMAGE_RELOC_TYPE_PPC } | The COFF relocation types of a PowerPC object file, for **IMAGE_RELOCATION.nType**, such as `IMAGE_REL_PPC_ADDR32` and `IMAGE_REL_PPC_REL24`, with `IMAGE_REL_PPC_TYPEMASK` and flag bits such as `IMAGE_REL_PPC_NEG`. |
| **IMAGE_RELOC_TYPE_SH3**{: #IMAGE_RELOC_TYPE_SH3 } | The COFF relocation types of a Hitachi SH3 object file, for **IMAGE_RELOCATION.nType**, such as `IMAGE_REL_SH3_DIRECT32`, with the `IMAGE_REL_SHM_` types and the flag `IMAGE_REL_SH_NOMODE`. |
| **IMAGE_SECTION_VALUES**{: #IMAGE_SECTION_VALUES } | The special section numbers of **IMAGE_SYMBOL.SectionNumber**, `IMAGE_SYM_UNDEFINED`, `IMAGE_SYM_ABSOLUTE` and `IMAGE_SYM_DEBUG`, and the largest section numbers of **IMAGE_SYMBOL** and **IMAGE_SYMBOL_EX**. |
| **IMAGE_STORAGE_CLASS**{: #IMAGE_STORAGE_CLASS } | The storage classes of **IMAGE_SYMBOL.StorageClass**, such as `IMAGE_SYM_CLASS_EXTERNAL`, `IMAGE_SYM_CLASS_STATIC` and `IMAGE_SYM_CLASS_FILE`. See the note below. |
| **IMAGE_SYM_TYPE**{: #IMAGE_SYM_TYPE } | The base types of a symbol, in the low 4 bits of **IMAGE_SYMBOL.Type** (**N_BTMASK**), such as `IMAGE_SYM_TYPE_NULL`, `IMAGE_SYM_TYPE_INT` and `IMAGE_SYM_TYPE_STRUCT`. |
| **IMAGE_SYM_TYPE_DERIVED**{: #IMAGE_SYM_TYPE_DERIVED } | The derived types of a symbol, in the bits of **IMAGE_SYMBOL.Type** above its base type (**N_TMASK**): `IMAGE_SYM_DTYPE_POINTER`, `IMAGE_SYM_DTYPE_FUNCTION` and `IMAGE_SYM_DTYPE_ARRAY`. |
| **IMAGE_WEAK_EXTERN**{: #IMAGE_WEAK_EXTERN } | How the linker looks for the definition of a weak external, in its auxiliary record's search type (**IMAGE_AUX_SYMBOL_EX.Sym_WeakSearchType**), such as `IMAGE_WEAK_EXTERN_SEARCH_LIBRARY` and `IMAGE_WEAK_EXTERN_SEARCH_ALIAS`. |
| **ImageDirectories**{: #ImageDirectories } | The indexes of the data directories in **IMAGE_OPTIONAL_HEADER.DataDirectory**, such as `IMAGE_DIRECTORY_ENTRY_EXPORT`, `IMAGE_DIRECTORY_ENTRY_IMPORT` and `IMAGE_DIRECTORY_ENTRY_BASERELOC`. |
| **ImageDllCharacteristics**{: #ImageDllCharacteristics } | The `IMAGE_DLLCHARACTERISTICS_` flags of the optional header's **DllCharacteristics**, such as `IMAGE_DLLCHARACTERISTICS_DYNAMIC_BASE`, `IMAGE_DLLCHARACTERISTICS_NX_COMPAT` and `IMAGE_DLLCHARACTERISTICS_WDM_DRIVER`, with the reserved `IMAGE_LIBRARY_` flags. |
| **ImageFileCharacteristics**{: #ImageFileCharacteristics } | The `IMAGE_FILE_` flags of **IMAGE_FILE_HEADER.Characteristics**, such as `IMAGE_FILE_EXECUTABLE_IMAGE`, `IMAGE_FILE_LARGE_ADDRESS_AWARE` and `IMAGE_FILE_DLL`. |
| **ImageLoadConfigGuardFlags**{: #ImageLoadConfigGuardFlags } | The `IMAGE_GUARD_` flags of the load configuration directory's **GuardFlags**: which Control Flow Guard, return flow and related protections the image has, such as `IMAGE_GUARD_CF_INSTRUMENTED`, with the mask and shift of the stride of the guard function table. |
| **ImageMachineType**{: #ImageMachineType } | The `IMAGE_FILE_MACHINE_` values of **IMAGE_FILE_HEADER.Machine**: the processor the file is for, such as `IMAGE_FILE_MACHINE_I386`, `IMAGE_FILE_MACHINE_AMD64` and `IMAGE_FILE_MACHINE_ARM64`. See the warning below. |
| **ImageSectionCharacteristics**{: #ImageSectionCharacteristics } | The `IMAGE_SCN_` flags of **IMAGE_SECTION_HEADER.Characteristics**: what the section contains, its alignment in an object file (`IMAGE_SCN_ALIGN_`), and how it is mapped, such as `IMAGE_SCN_MEM_EXECUTE` and `IMAGE_SCN_MEM_NOT_PAGED`. |
| **ImageSubsystemType**{: #ImageSubsystemType } | The `IMAGE_SUBSYSTEM_` values of the optional header's **Subsystem**: the subsystem an image runs in, such as `IMAGE_SUBSYSTEM_NATIVE` for a driver and `IMAGE_SUBSYSTEM_WINDOWS_GUI`. |
<!-- /test -->

<!-- test: ImageFieldTests.MachineTypes_EqualTheMachineField -->
> [!WARNING] 0.3.0.5
> The members of **ImageMachineType** above `&H7FFF`, such as **IMAGE_FILE_MACHINE_AMD64** (`&H8664&`) and **IMAGE_FILE_MACHINE_ARM64** (`&HAA64&`), are positive **Long** values, but **IMAGE_FILE_HEADER.Machine** is an **Integer**, which holds them as negative numbers: `hdr.Machine = IMAGE_FILE_MACHINE_AMD64` is **False** for the header of an AMD64 image. A driver compares `hdr.Machine And &HFFFF&` with the constant.

<!-- test: ImageValueTests.IMAGE_STORAGE_CLASS_Values -->
> [!NOTE] 0.3.0.5
> **IMAGE_SYM_CLASS_END_OF_FUNCTION** of **IMAGE_STORAGE_CLASS** is -1, where C's is `(UCHAR)-1`, 255. It is not equal to the **StorageClass** of a symbol, a **Byte**, that holds 255.

## Constants

| Name | Value | Description |
|------|-------|-------------|
| **IMAGE_ARCHIVE_END**{: #IMAGE_ARCHIVE_END } | `` "`\n" `` | The two characters that end an archive member's header, **IMAGE_ARCHIVE_MEMBER_HEADER.EndHeader**: a backquote and a line feed. See the note below. |
| **IMAGE_ARCHIVE_HYBRIDMAP_MEMBER**{: #IMAGE_ARCHIVE_HYBRIDMAP_MEMBER } | `"/<HYBRIDMAP>/   "` | The **Name** of an archive's hybrid map member, `/<HYBRIDMAP>/` padded with spaces to 16 characters. |
| **IMAGE_ARCHIVE_LINKER_MEMBER**{: #IMAGE_ARCHIVE_LINKER_MEMBER } | `"/               "` | The **Name** of an archive's linker members, `/` padded with spaces to 16 characters. |
| **IMAGE_ARCHIVE_LONGNAMES_MEMBER**{: #IMAGE_ARCHIVE_LONGNAMES_MEMBER } | `"//              "` | The **Name** of an archive's long names member, `//` padded with spaces to 16 characters. |
| **IMAGE_ARCHIVE_PAD**{: #IMAGE_ARCHIVE_PAD } | `"\n"` | The line feed that pads an archive member to an even size. See the note below. |
| **IMAGE_ARCHIVE_START**{: #IMAGE_ARCHIVE_START } | `"!<arch>\n"` | The characters at the start of an archive (a `.lib` file): `!<arch>` and a line feed. See the note below. |
| **IMAGE_ARCHIVE_START_SIZE**{: #IMAGE_ARCHIVE_START_SIZE } | `8` | The number of characters of the signature at the start of an archive, **IMAGE_ARCHIVE_START**. |
| **IMAGE_DOS_SIGNATURE**{: #IMAGE_DOS_SIGNATURE } | `&H5A4D` | The **e_magic** of an **IMAGE_DOS_HEADER**: the characters `MZ`. |
| **IMAGE_NT_SIGNATURE**{: #IMAGE_NT_SIGNATURE } | `&H00004550` | The **Signature** of an **IMAGE_NT_HEADERS**: the characters `PE` and two zero bytes. |
| **IMAGE_NUMBEROF_DIRECTORY_ENTRIES**{: #IMAGE_NUMBEROF_DIRECTORY_ENTRIES } | `16` | The number of entries of **IMAGE_OPTIONAL_HEADER.DataDirectory**. |
| **IMAGE_ORDINAL_FLAG**{: #IMAGE_ORDINAL_FLAG } | `IMAGE_ORDINAL_FLAG64` (64-bit), `IMAGE_ORDINAL_FLAG32` (32-bit) | The bit of an **IMAGE_THUNK_DATA** that marks an import by ordinal: **IMAGE_ORDINAL_FLAG32** in a 32-bit build and **IMAGE_ORDINAL_FLAG64** in a 64-bit one. |
| **IMAGE_ORDINAL_FLAG32**{: #IMAGE_ORDINAL_FLAG32 } | `&H80000000` | The bit of an **IMAGE_THUNK_DATA32** that marks an import by ordinal, with the ordinal in the low 16 bits. |
| **IMAGE_ORDINAL_FLAG64**{: #IMAGE_ORDINAL_FLAG64 } | `&H8000000000000000` | The bit of an **IMAGE_THUNK_DATA64** that marks an import by ordinal, with the ordinal in the low 16 bits. |
| **IMAGE_OS2_SIGNATURE**{: #IMAGE_OS2_SIGNATURE } | `&H454E` | The signature of a 16-bit New Executable: the characters `NE`. |
| **IMAGE_OS2_SIGNATURE_LE**{: #IMAGE_OS2_SIGNATURE_LE } | `&H454C` | The signature of an OS/2 linear executable: the characters `LE`. |
| **IMAGE_POLICY_METADATA_NAME**{: #IMAGE_POLICY_METADATA_NAME } | `"__ImagePolicyMetadata"` | The name under which an image exports its **IMAGE_POLICY_METADATA**. |
| **IMAGE_POLICY_METADATA_VERSION**{: #IMAGE_POLICY_METADATA_VERSION } | `1` | The **Version** of an **IMAGE_POLICY_METADATA**. |
| **IMAGE_POLICY_SECTION_NAME**{: #IMAGE_POLICY_SECTION_NAME } | `".tPolicy"` | The name of the section that holds an image's **IMAGE_POLICY_METADATA**. |
| **IMAGE_RESOURCE_DATA_IS_DIRECTORY**{: #IMAGE_RESOURCE_DATA_IS_DIRECTORY } | `&H80000000` | The bit of **IMAGE_RESOURCE_DIRECTORY_ENTRY.OffsetToData** that marks an entry of a table one level down; without it the offset is that of an **IMAGE_RESOURCE_DATA_ENTRY**. |
| **IMAGE_RESOURCE_NAME_IS_STRING**{: #IMAGE_RESOURCE_NAME_IS_STRING } | `&H80000000` | The bit of **IMAGE_RESOURCE_DIRECTORY_ENTRY.Name** that marks a name; the other 31 bits are then the offset of the name's string, and without it the low 16 bits are an ID. |
| **IMAGE_SCN_SCALE_INDEX**{: #IMAGE_SCN_SCALE_INDEX } | `1` | A flag of **IMAGE_TLS_DIRECTORY.Characteristics**: the TLS index is scaled. |
| **IMAGE_SIZEOF_ARCHIVE_MEMBER_HDR**{: #IMAGE_SIZEOF_ARCHIVE_MEMBER_HDR } | `60` | The size in bytes of an **IMAGE_ARCHIVE_MEMBER_HEADER**. |
| **IMAGE_SIZEOF_FILE_HEADER**{: #IMAGE_SIZEOF_FILE_HEADER } | `20` | The size in bytes of an **IMAGE_FILE_HEADER**. |
| **IMAGE_SIZEOF_SECTION_HEADER**{: #IMAGE_SIZEOF_SECTION_HEADER } | `40` | The size in bytes of an **IMAGE_SECTION_HEADER**. |
| **IMAGE_SIZEOF_SHORT_NAME**{: #IMAGE_SIZEOF_SHORT_NAME } | `8` | The number of bytes of a section's name, **IMAGE_SECTION_HEADER.Name**, and of a short symbol name. |
| **IMAGE_SIZEOF_SYMBOL**{: #IMAGE_SIZEOF_SYMBOL } | `18` | The size in bytes of an **IMAGE_SYMBOL**, and of each auxiliary record after it. |
| **IMAGE_VXD_SIGNATURE**{: #IMAGE_VXD_SIGNATURE } | `&H454C` | The signature of a virtual device driver (VxD): the characters `LE`. |
| **N_BTMASK**{: #N_BTMASK } | `&H000F` | The bits of **IMAGE_SYMBOL.Type** that hold the base type, an **IMAGE_SYM_TYPE**. |
| **N_BTSHFT**{: #N_BTSHFT } | `4` | The number of bits of the base type in **IMAGE_SYMBOL.Type**: the shift of the first derived type. |
| **N_TMASK**{: #N_TMASK } | `&H0030` | The bits of **IMAGE_SYMBOL.Type** that hold the first derived type, an **IMAGE_SYM_TYPE_DERIVED**. |
| **N_TMASK1**{: #N_TMASK1 } | `&H00C0` | The bits of **IMAGE_SYMBOL.Type** that hold the second derived type. |
| **N_TMASK2**{: #N_TMASK2 } | `&H00F0` | The bits of **IMAGE_SYMBOL.Type** that hold the first two derived types. |
| **N_TSHIFT**{: #N_TSHIFT } | `2` | The number of bits of one derived type in **IMAGE_SYMBOL.Type**: the shift that adds or removes one level of derivation. |
| **SIZEOF_RFPO_DATA**{: #SIZEOF_RFPO_DATA } | `16` | The size in bytes of an `RFPO_DATA` record, which ntimage.h defines beside **FPO_DATA** and does not declare. |
| **UNWIND_HISTORY_TABLE_SIZE**{: #UNWIND_HISTORY_TABLE_SIZE } | `32` | The number of entries of **UNWIND_HISTORY_TABLE.Entry**. See the note below. |

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
