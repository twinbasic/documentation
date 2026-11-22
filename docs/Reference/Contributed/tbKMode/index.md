---
title: tbKMode Package
parent: Contributed Packages
has_toc: false
indexed_from: 0.3.0.8
permalink: /tB/Packages/Contributed/tbKMode/
---

# tbKMode Package
{: .no_toc }

**Author:** fafalone. **Version:** 0.3.0.8. **On GitHub:** [fafalone/tbKMode](https://github.com/fafalone/tbKMode).

Declarations for writing a Windows kernel-mode driver in twinBASIC.

The **tbKMode** contributed package declares types, routines, constants and macros of the Windows Driver Kit (WDK), from its headers `wdm.h`, `ntddk.h`, `ntifs.h`, `fltkernel.h`, `ntdddisk.h`, `mountmgr.h` and `ntimage.h`, for a driver built as a `.sys` file. It covers a part of the WDK: its author describes it as a start, to be extended by each project that uses it.

* TOC
{:toc}

## Building a driver

A driver is a project whose [Build Type](../../../IDE/Project-Settings#build-type) is **Standard EXE**, with these [project settings](../../../IDE/Project-Settings):

- [**Native Subsystem**](../../../IDE/Project-Settings#native-subsystem): **Yes**, which marks the built file as a native-subsystem image, as a driver is.
- [**Override Entry Point**](../../../IDE/Project-Settings#override-entry-point): `DriverEntry`, the name of the driver's entry point. It is a **Public Function** of a module that receives the driver's **DRIVER_OBJECT** and the path of its registry key, as in the [example of modWDM](modWDM#example).
- [**Runtime Binding Of DLL Declares**](../../../IDE/Project-Settings#runtime-binding-of-dll-declares): **No**, which puts the routines that the driver calls into the import table of the built file, for the kernel to resolve when it loads the driver. Only the routines that the driver calls are imported.
- [**Strip PE File Relocation Symbols**](../../../IDE/Project-Settings#strip-pe-symbols): **NO**, which keeps the relocation data in the built file. Its default, **AUTO**, leaves it out of an EXE. With the relocations kept, [**Enable Address Space Layout Randomization (ASLR)**](../../../IDE/Project-Settings#enable-aslr), **Yes** by default, also marks the file as one that can be loaded at any address.

<!-- test: probe declares, probe interlocked, probe stack, probe copied -->
The package's own procedures are compiled with the package's settings, not the driver's, and the package sets **Native Subsystem**, **Runtime Binding Of DLL Declares** to **No**, and the three settings that turn off the checks for overflow, array bounds and floating-point errors. A driver that calls them, such as [**IoGetNextIrpStackLocation**](modWDM#IoGetNextIrpStackLocation) or, in a 64-bit driver, [**InterlockedIncrement**](modWDM#InterlockedIncrement), imports only the kernel's routines. A procedure copied into the driver's own code is compiled with the driver's settings.
<!-- /test -->

<!-- test: bug declare-fastcall-static-binding-32bit, KernelHelperTests.IoCallDriver_PassesTheDeviceAndTheIrp, KernelHelperTests.ObDereferenceObject_PassesTheObject, KernelHelperTests.ExAcquireFastMutex_PassesTheMutex, KernelHelperTests.ExReleaseFastMutex_PassesTheMutex, KernelHelperTests.ExTryToAcquireFastMutex_PassesTheMutex, KernelHelperTests.InterlockedPopEntrySList_PassesTheListHead, KernelHelperTests.ExReleaseResource_ReleasesTheResource, KernelHelperTests.InterlockedIncrement_IncrementsTheValue, KernelHelperTests.ExReleaseResourceAndLeaveCriticalRegion_PassesTheResource, KernelHelperTests.ExReleaseResourceLite_PassesTheResource, KernelHelperTests.ExInterlockedAddUlong_PassesTheArguments -->
> [!WARNING] BETA 1042
> In a 32-bit driver no call of a `FastCall` declaration reaches its routine as it should. With **Runtime Binding Of DLL Declares** set to **No**, as a driver has it and as the package sets it for its own declarations, twinBASIC calls a `FastCall` declaration without its arguments in the registers where a `__fastcall` routine reads them: the routine works on other values, and the driver's stack is left wrong. The 32-bit kernel exports many routines as `__fastcall`, among them **IofCallDriver**, which [**IoCallDriver**](modWDM#IoCallDriver) calls, **ObfDereferenceObject**, **KfAcquireSpinLock**, which [**KeAcquireSpinLock**](modWDM#KeAcquireSpinLock) calls, the fast mutexes, **KfRaiseIrql** and **InterlockedIncrement**, and the package declares each of them `FastCall`. A 64-bit driver is not affected: it has one calling convention.

The [Build Output Path](../../../IDE/Project-Settings#build-output-path) ends in `.sys` in place of `.${FileExtension}`. A driver is built for the architecture of the Windows it runs on: the kernel runs no 32-bit code on 64-bit Windows. [Project Types](../../../../Features/Project-Configuration/Project-Types#kernel-mode-drivers) says more about kernel-mode projects.

## Names shared with VBA

**modWDM** has procedures named [**LCase**](modWDM#LCase), [**UCase**](modWDM#UCase), [**InStr**](modWDM#InStr) and [**MsgBox**](modWDM#MsgBox), as VBA's functions are. They take the addresses of null-terminated strings, since a driver works on the kernel's strings, and the package's changelog calls them overrides of VBA's.

<!-- test: KernelHelperTests.BareNames_CallTheModulesProcedures, compile MsgBoxBareNameIsTheModules -->
> [!WARNING] 0.3.0.8
> A call of one of these names without a module name calls VBA's function, not the package's. `LCase(StrPtr(s))` and `UCase(StrPtr(s))` leave the string as it was, `InStr(StrPtr(a), StrPtr(b))` returns 0 when *a* holds *b*, and `MsgBox "text"` compiles as VBA's **MsgBox**. A driver writes the module name to call the package's procedures: `modWDM.LCase`, `modWDM.UCase`, `modWDM.InStr` and `modWDM.MsgBox`.

## Modules

- [**modWDM**](modWDM) -- the Windows Driver Model: driver and device objects, IRPs, memory, synchronization, the registry, processes and threads, strings and callbacks; the types the other modules share
- [**modFltMgr**](modFltMgr) -- the Filter Manager, for a file-system minifilter driver
- [**modSysInfo**](modSysInfo) -- the information classes and structures of the `Zw` query and set routines
- [**modDisk**](modDisk) -- disk geometry, partitions and the structures of a driver that presents a disk
- [**modImage**](modImage) -- the headers, sections and tables of an executable image in the PE format
- [**modKmOpaque**](modKmOpaque) -- offsets of fields in opaque kernel structures

## See Also

- [tbKMode Verifier](Verifier) -- checks the package's declarations, and a built driver's imports, against the Windows kernel
- [tbKMode Writer](Writer) -- writes the module pages of this section
- [Project Settings](../../../IDE/Project-Settings) -- the settings of a driver project
- [Project Types](../../../../Features/Project-Configuration/Project-Types#kernel-mode-drivers) -- kernel-mode drivers in twinBASIC
- [Contributed Packages](..) -- the other packages from TWINSERV

## Test cases

The notes and warnings of this section are checked by the test cases in [tbKMode-tests.twinproj](tbKMode-tests.twinproj), a twinBASIC project. It uses tbKMode as a [linked package](../../../../Features/Packages/Linked#manual-management): put the package's `.twinpack` in `%APPDATA%\twinBASIC\packages`, then run the project, and each case prints whether it passes. The [tbKMode Verifier](Verifier), a Node.js program, checks the package's Declares against what the Windows kernel exports, and a built driver's imports.
