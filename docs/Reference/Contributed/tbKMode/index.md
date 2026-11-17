---
title: tbKMode Package
parent: Experimental Packages
has_toc: false
indexed_from: 0.3.0.5
permalink: /tB/Packages/Contributed/tbKMode/
---

# tbKMode Package
{: .no_toc }

**Author:** fafalone. **Version:** 0.3.0.5. **On GitHub:** [fafalone/tbKMode](https://github.com/fafalone/tbKMode).

Declarations for writing a Windows kernel-mode driver in twinBASIC.

The **tbKMode** contributed package declares types, routines, constants and macros of the Windows Driver Kit (WDK), from its headers `wdm.h`, `ntddk.h`, `ntifs.h`, `fltkernel.h`, `ntdddisk.h`, `mountmgr.h` and `ntimage.h`, for a driver built as a `.sys` file. It covers a part of the WDK: its author describes it as a start, to be extended by each project that uses it.

<!-- test: compile ZwDuplicateObjectTakesTargetProcessHandle, compile IoCreateDeviceReturnsThePointer, compile ExTryToAcquireFastMutexReturnsWhetherAcquired, compile SeLocateProcessImageNameReturnsThePointer, compile ExInitializeNPagedLookasideListTakesTheList, compile CmCallbackReleaseKeyObjectIDExTakesThePointer, compile DbgPrintEx1TakesTheComponentAndTheLevel, compile ZwMapViewOfSectionTakesTheInheritDisposition, WDMLayoutTests.IMAGE_INFO_Layout, WDMLayoutTests.IMAGE_INFO_EX_Layout, WDMLayoutTests.OB_POST_OPERATION_INFORMATION_Layout, WDMLayoutTests.KUSER_SHARED_DATA_Layout, WDMFieldTests.OB_PRE_OPERATION_INFORMATION_ParametersIsAPointer, WDMValueTests.POOL_TYPE_Values, WDMValueTests.Constants_Values, KernelHelperTests.IoCallDriver_PassesTheDeviceAndTheIrp, KernelHelperTests.ExAcquireFastMutex_PassesTheMutex, KernelHelperTests.ExReleaseFastMutex_PassesTheMutex, KernelHelperTests.ExTryToAcquireFastMutex_PassesTheMutex, KernelHelperTests.InterlockedPopEntrySList_PassesTheListHead, KernelHelperTests.ExReleaseResourceAndLeaveCriticalRegion_PassesTheResource, KernelHelperTests.ObCloseHandle_PassesTheHandle, KernelHelperTests.InterlockedIncrement_CallsWithTheLockFree, KernelHelperTests.InterlockedAdd64_CallsWithTheLockFree, KernelHelperTests.InsertHeadList_LinksTheEntryAfterTheHead, KernelHelperTests.InsertTailList_LinksTheEntryBeforeTheHead, KernelHelperTests.RemoveListHead_UnlinksTheFirstEntry, KernelHelperTests.IoCopyCurrentIrpStackLocationToNext_CopiesIntoTheLocationBelow, KernelHelperTests.IoSetCompletionRoutine_SetsTheLocationBelow, WDMHelperTests.IoGetNextIrpStackLocation_ReturnsTheLocationBelow, WDMHelperTests.IoSkipCurrentIrpStackLocation_MovesUpOneLocation, WDMHelperTests.NT_ERROR_IsTrueForErrorStatusesOnly, KernelHelperTests.InStr_ReturnsTheCharacterPosition, KernelHelperTests.MsgBox_PassesTheTextAndTheTitle, KernelHelperTests.ExInitializeFastMutex_InitializesAsTheWdkDoes -->
> [!WARNING] 0.3.0.5
> The package compiles, and a driver can be built with it, but many of the declarations of [modWDM](modWDM) do not match the WDK, and most of them fail with no error: the driver reads or writes other memory than it means to, or a call never returns. The main ones:
>
> - Declarations of routines whose parameters or result do not match the routine: see [modWDM](modWDM#declares).
> - Structures with another layout than the C structure, so that a field holds other data: see [modWDM](modWDM#types).
> - Values that are not the WDK's: [**POOL_TYPE**](modWDM#POOL_TYPE) and the mount device types of [modWDM](modWDM#constants) with the two I/O control codes made from them.
> - In a 32-bit driver, routines declared in another calling convention than the kernel's, most of them routines that the kernel exports as `__fastcall`, receive other values than their arguments: see [modWDM](modWDM#declares).
> - Procedures of modWDM that write over memory or never return: the list procedures, such as [**InsertHeadList**](modWDM#InsertHeadList), the stack-location procedures, such as [**IoSetCompletionRoutine**](modWDM#IoSetCompletionRoutine), and in a 64-bit driver [**InterlockedIncrement**](modWDM#InterlockedIncrement) and [**InterlockedAdd64**](modWDM#InterlockedAdd64). [**NT_ERROR**](modWDM#NT_ERROR), [**InStr**](modWDM#InStr), [**MsgBox**](modWDM#MsgBox) and [**ExInitializeFastMutex**](modWDM#ExInitializeFastMutex) give wrong results.
>
> Each page states the defects of its own declarations, in a warning or a note below its table or in the section of the procedure.

* TOC
{:toc}

## Building a driver

A driver is a project whose [Build Type](../../../IDE/Project-Settings#build-type) is **Standard EXE**, with these [project settings](../../../IDE/Project-Settings):

- [**Native Subsystem**](../../../IDE/Project-Settings#native-subsystem): **Yes**, which marks the built file as a native-subsystem image, as a driver is.
- [**Override Entry Point**](../../../IDE/Project-Settings#override-entry-point): `DriverEntry`, the name of the driver's entry point. It is a **Public Function** of a module that receives the driver's **DRIVER_OBJECT** and the path of its registry key, as in the [example of modWDM](modWDM#example).
- [**Runtime Binding Of DLL Declares**](../../../IDE/Project-Settings#runtime-binding-of-dll-declares): **No**, which puts the routines that the driver calls into the import table of the built file, for the kernel to resolve when it loads the driver. Only the routines that the driver calls are imported.
- [**Strip PE File Relocation Symbols**](../../../IDE/Project-Settings#strip-pe-symbols): **NO**, which keeps the relocation data in the built file. Its default, **AUTO**, leaves it out of an EXE. With the relocations kept, [**Enable Address Space Layout Randomization (ASLR)**](../../../IDE/Project-Settings#enable-aslr), **Yes** by default, also marks the file as one that can be loaded at any address.

<!-- test: probe declares, probe interlocked, probe stack, probe copied -->
> [!WARNING] 0.3.0.5
> The package's own procedures are compiled with the package's settings, not the driver's, and the package sets none of the settings above. A driver that calls one of them imports routines from `USER32.dll`, `OLEAUT32.dll` and `KERNEL32.dll`, which the kernel does not load for a driver, so the driver does not load. Among them are [**IoGetNextIrpStackLocation**](modWDM#IoGetNextIrpStackLocation) and [**IoSkipCurrentIrpStackLocation**](modWDM#IoSkipCurrentIrpStackLocation), and in a 64-bit driver [**InterlockedIncrement**](modWDM#InterlockedIncrement), which is a declaration of a kernel routine in a 32-bit one. A driver that uses only the package's declarations of kernel routines, its types and its constants is not affected. A procedure copied into the driver's own code, under another name, is compiled with the driver's settings.

The [Build Output Path](../../../IDE/Project-Settings#build-output-path) ends in `.sys` in place of `.${FileExtension}`. A driver is built for the architecture of the Windows it runs on: the kernel runs no 32-bit code on 64-bit Windows. [Project Types](../../../../Features/Project-Configuration/Project-Types#kernel-mode-drivers) says more about kernel-mode projects.

## Names shared with VBA

**modWDM** has procedures named [**LCase**](modWDM#LCase), [**UCase**](modWDM#UCase), [**InStr**](modWDM#InStr) and [**MsgBox**](modWDM#MsgBox), as VBA's functions are. They take the addresses of null-terminated strings, since a driver works on the kernel's strings, and the package's changelog calls them overrides of VBA's.

<!-- test: KernelHelperTests.BareNames_CallTheModulesProcedures, compile MsgBoxBareNameIsTheModules -->
> [!WARNING] 0.3.0.5
> A call of one of these names without a module name calls VBA's function, not the package's. `LCase(StrPtr(s))` and `UCase(StrPtr(s))` leave the string as it was, `InStr(StrPtr(a), StrPtr(b))` returns 0 when *a* holds *b*, and `MsgBox "text"` compiles as VBA's **MsgBox**. A driver writes the module name to call the package's procedures: `modWDM.LCase`, `modWDM.UCase`, `modWDM.InStr` and `modWDM.MsgBox`.

## Modules

- [**modWDM**](modWDM) -- the Windows Driver Model: driver and device objects, IRPs, memory, synchronization, the registry, processes and threads, strings and callbacks; the types the other modules share
- [**modFltMgr**](modFltMgr) -- the Filter Manager, for a file-system minifilter driver
- [**modSysInfo**](modSysInfo) -- the information classes and structures of the `Zw` query and set routines
- [**modDisk**](modDisk) -- disk geometry, partitions and the structures of a driver that presents a disk
- [**modImage**](modImage) -- the headers, sections and tables of an executable image in the PE format
- [**modKmOpaque**](modKmOpaque) -- offsets of fields in opaque kernel structures

## See Also

- [Project Settings](../../../IDE/Project-Settings) -- the settings of a driver project
- [Project Types](../../../../Features/Project-Configuration/Project-Types#kernel-mode-drivers) -- kernel-mode drivers in twinBASIC
- [Experimental Packages](../../Experimental/) -- the packages from TWINSERV that are not yet ready for use in a program

## Test cases

The notes and warnings of this section are checked by the test cases in [tbKMode-tests.twinproj](tbKMode-tests.twinproj), a twinBASIC project. It uses tbKMode as a [linked package](../../../../Features/Packages/Linked#manual-management): put the package's `.twinpack` in `%APPDATA%\twinBASIC\packages`, then run the project, and each case prints whether it passes.
