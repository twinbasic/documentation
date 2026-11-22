---
title: modWDM
parent: tbKMode Package
permalink: /tB/Packages/Contributed/tbKMode/modWDM
has_toc: false
---

# modWDM module
{: .no_toc }

Declarations for a kernel-mode driver: the routines of `ntoskrnl.exe` that a driver calls, the structures, enumerations and constants they take, and procedures in place of the WDK's macros.

The module covers driver and device objects, I/O request packets (IRPs) and their stack locations, memory, synchronization, the registry, processes and threads, strings, and the callbacks a driver registers for object handles, the registry, processes, threads and loaded images.

A driver's entry point, **DriverEntry**, receives its [**DRIVER_OBJECT**](#DRIVER_OBJECT) and the path of its registry key, a [**UNICODE_STRING**](#UNICODE_STRING). It sets the address of a dispatch routine in **MajorFunction** for each major function code it handles, such as **IRP_MJ_CREATE**, and the address of its unload routine in **DriverUnload**. A dispatch routine receives a [**DEVICE_OBJECT**](#DEVICE_OBJECT) and an [**IRP**](#IRP). It reads the request's parameters from the [**IO_STACK_LOCATION**](#IO_STACK_LOCATION) whose address [**IoGetCurrentIrpStackLocation**](#IoGetCurrentIrpStackLocation) returns, sets the IRP's **IoStatus**, and completes it with [**IoCompleteRequest**](#IoCompleteRequest).

The types that the package's other modules share, such as **UNICODE_STRING**, **LARGE_INTEGER**, **IO_STATUS_BLOCK**, **OBJECT_ATTRIBUTES** and the status codes of [**NTSTATUS**](#NTSTATUS), are declared here. The project settings of a driver are described on [the package's page](.), and so are [the procedures of this module that have the names of VBA's](.#names-shared-with-vba), which a driver calls with the module name.

A pointer is a **LongPtr**. A parameter with no `ByVal` is passed by reference: a structure, or the variable that receives a result.

* TOC
{:toc}

## Declares

<!-- test: KernelHelperTests.RtlCompareUnicodeString_OrdersTheStrings, KernelHelperTests.ObDereferenceObject_PassesTheObject, KernelHelperTests.ExReleaseResourceLite_PassesTheResource, compile ZwDuplicateObjectTakesTargetProcessHandle, compile IoCreateDeviceReturnsThePointer, compile ExTryToAcquireFastMutexReturnsWhetherAcquired, compile SeLocateProcessImageNameReturnsThePointer, compile ExInitializeNPagedLookasideListTakesTheList, compile CmCallbackReleaseKeyObjectIDExTakesThePointer, compile DbgPrintEx1TakesTheComponentAndTheLevel, compile DbgPrintEx2TakesTheComponentAndTheLevel, compile DbgPrintEx3TakesTheComponentAndTheLevel, compile ZwMapViewOfSectionTakesTheInheritDisposition, compile ExAllocatePool2TakesPoolFlags, compile RtlCompareUnicodeStringsTakesTheLengths, KernelHelperTests.ExAllocatePool2_PassesTheSizeAndTheTag, KernelHelperTests.RtlFindFirstRunClear_ReturnsTheStartingIndex, KernelHelperTests.RtlFindLongestRunClear_ReturnsTheStartingIndex, KernelHelperTests.RtlDuplicateUnicodeString_CallsTheKernel, KernelHelperTests.ObCloseHandle_PassesTheHandle, KernelHelperTests.IoCallDriver_PassesTheDeviceAndTheIrp, KernelHelperTests.ExAcquireFastMutex_PassesTheMutex, KernelHelperTests.ExReleaseFastMutex_PassesTheMutex, KernelHelperTests.ExTryToAcquireFastMutex_PassesTheMutex, KernelHelperTests.InterlockedPopEntrySList_PassesTheListHead, KernelHelperTests.ExReleaseResourceAndLeaveCriticalRegion_PassesTheResource, KernelHelperTests.ExInterlockedAddUlong_PassesTheArguments, WDMExportTests.ZwCreateUserProcess_IsTheKernelsUnnamedOrdinal2, probe ordinal -->
Every routine is in `ntoskrnl.exe`, but in a 32-bit build the fast mutexes and the IRQL and spin-lock routines, which the 32-bit kernel leaves to `hal.dll`, are declared there. Each declaration names its routine, takes the routine's parameters and returns its result, and a routine that the 32-bit kernel exports as `__fastcall`, such as **ObDereferenceObject**, is declared `FastCall`, apart from those of the warning and the note below. **ZwCreateUserProcess**, which the 64-bit kernel exports with no name, is declared `Alias "#2"`, its ordinal.
<!-- /test -->

<!-- test: compile ZwCreateKeyClassIsOptional, compile ZwCreateKeyTransactedClassIsOptional, compile ZwCreateRegistryTransactionObjAttributesIsOptional, compile ZwOpenProcessClientIDIsOptional -->
A parameter that C declares optional, and that is a structure passed by reference here, takes a null pointer written `ByVal vbNullPtr`: *Class* of **ZwCreateKey** and **ZwCreateKeyTransacted**, *ObjAttributes* of **ZwCreateRegistryTransaction** and *ClientID* of **ZwOpenProcess** are four.
<!-- /test -->

{{table:declares}}

<!-- test: probe x86exports -->
In a 32-bit build the routines that the 32-bit kernel has in `hal.dll`, such as `KfAcquireSpinLock` and `KfLowerIrql`, which [**KeAcquireSpinLock**](#KeAcquireSpinLock) and **KeLowerIrql** call there, are declarations of `hal.dll`. **RtlInitializeBitMapEx**, **RtlClearAllBitsEx**, **RtlClearBitEx**, **RtlSetBitEx**, **RtlTestBitEx**, **RtlFindSetBitsEx** and **RtlFindSetBitsAndClearEx** are declared in a 64-bit build only, since no 32-bit file exports them.
<!-- /test -->

<!-- test: WDMExportTests.Declares_NameExportsOfTheKernel -->
> [!NOTE] 0.3.0.8
> **ExFreePool2** is exported from Windows 11 and Windows Server 2022 on, as [its page](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exfreepool2) says: the 64-bit kernel of Windows 10 version 22H2 does not export it. A driver imports only the routines that it calls, so a driver that does not call it is not affected; one that calls it on Windows 10 does not load.

## Types

<!-- test: {{cases:WDMLayoutTests}} -->
Each structure that the WDK's kernel-mode headers declare has the size of its C structure, and its fields are at the C fields' offsets, in a 32-bit and in a 64-bit build, apart from those of the note below.

{{table:types}}
<!-- /test -->

<!-- test: WDMFieldTests.OB_PRE_OPERATION_INFORMATION_ParametersIsAPointer, WDMLayoutTests.OB_PRE_OPERATION_INFORMATION_Layout, WDMLayoutTests.OB_PRE_OPERATION_PARAMETERS_Layout -->
**OB_PRE_OPERATION_INFORMATION.Parameters** is the address of the parameters, as in wdm.h. The C type it points to is a union of **OB_PRE_CREATE_HANDLE_INFORMATION** and **OB_PRE_DUPLICATE_HANDLE_INFORMATION**, which **OB_PRE_OPERATION_PARAMETERS** declares as the larger of the two: a driver reads **DesiredAccess** and **OriginalDesiredAccess** of either from it, and **SourceProcess** and **TargetProcess** when the operation is `OB_OPERATION_HANDLE_DUPLICATE`.
<!-- /test -->

<!-- test: WDMLayoutTests.IO_DRIVER_CREATE_CONTEXT_Layout, WDMLayoutTests.KUSER_SHARED_DATA_Layout -->
> [!NOTE] 0.3.0.8
> These structures are smaller than the C structures:
>
> - **IO_DRIVER_CREATE_CONTEXT** lacks C's last field, **SiloContext**: it is 16 bytes where C's is 20 in a 32-bit build, and 32 where C's is 40 in a 64-bit one. The package declares the field under `#If NTDDI_VERSION >= NTDDI_WIN10_RS1`, as the WDK does, but defines no `NTDDI_VERSION`, and a project's conditional constants do not reach a package's code, so the field is never there. Its other fields are at their places.
> - **KUSER_SHARED_DATA** ends at **Cookie**: it is 824 bytes where the WDK's is 1848, and has none of the WDK's fields after **Cookie**. Its other fields are at their places.

## Aliases

Other names for a type, which the declarations use where C has the type of the same name: **CBoolean**, **KIRQL** and **KPROCESSOR_MODE** for **Byte**, and **POOL_FLAGS** for **LongLong**. A variable of one of them is a variable of that type.

{{table:aliases}}

## Enumerations

<!-- test: {{cases:WDMValueTests}} -->
Every member that the WDK's kernel-mode headers declare has the value of the WDK's constant or enumerator of the same name.

{{table:enums}}
<!-- /test -->

## Constants

The major and minor function codes of an IRP, the parts of an I/O control code that [**CTL_CODE**](#CTL_CODE) takes, the `SL_` flags of an I/O stack location, the values of **RtlQueryRegistryValues** and its **RTL_QUERY_REGISTRY_TABLE**, the `POOL_FLAG_` flags of **ExAllocatePool2**, the addresses in **KUSER_SHARED_DATA**, and the sizes and revisions of security descriptors and SIDs.

{{table:consts}}

<!-- test: WDMValueTests.Constants_Values -->
The limits of the 16-bit types hold the bits of the C value in an **Integer**, as the package's fields of those types are **Integers**: **MAXUINT16**, **MAXUSHORT**, **MAXWORD**, **USHRT_MAX** and **_UI16_MAX** are `&HFFFF`, -1, and **MINSHORT** is `&H8000`, -32768. Each equals a field that holds the bits of a `USHORT` of 65535, or a `SHORT` of -32768, but not the **Long** 65535 or 32768. **SCHAR_MIN** is the **Byte** `&H80`, 128, the bits of C's -128, as the package takes a `char` as a **Byte**.
<!-- /test -->

## Variables

<!-- test: WDMHelperTests.InitIOCTLs_SetsTheMountCodes, WDMHelperTests.InitIOCTLs_SetsFormatTracks -->
The I/O control codes are variables, not constants: each is 0 until [**InitIOCTLs**](#InitIOCTLs) sets it, to the WDK's value. **IOCTL_DISK_FORMAT_TRACKS** is a constant. **SOURCE_FILE** is the file name that [**IoAcquireRemoveLock**](#IoAcquireRemoveLock) passes to the kernel, as ANSI bytes.
<!-- /test -->

{{table:variables}}

## Procedures

The procedures do what the WDK's macros and inline routines do, such as [**IoGetCurrentIrpStackLocation**](#IoGetCurrentIrpStackLocation) and [**InitializeListHead**](#InitializeListHead), or return the kernel's object types, such as [**PsProcessType**](#PsProcessType). [**InitIOCTLs**](#InitIOCTLs) sets the I/O control codes. **MsgBox**, **InStr**, **LCase** and **UCase** are kernel-mode versions of VBA's functions, and **StrRev** reverses a string; all five take the addresses of null-terminated strings.

{{procedures}}

## Example

A driver that handles `IRP_MJ_CREATE` and `IRP_MJ_CLOSE` with one dispatch routine, which completes each request with `STATUS_SUCCESS`, and has an unload routine.

```tb check_build
Module Driver
    Private Function DispatchCreateClose(DeviceObject As DEVICE_OBJECT, pIrp As IRP) As NTSTATUS
        pIrp.IoStatus.Status = STATUS_SUCCESS
        pIrp.IoStatus.Information = 0
        IoCompleteRequest pIrp, IO_NO_INCREMENT
        Return STATUS_SUCCESS
    End Function

    Private Sub Unload(DriverObject As DRIVER_OBJECT)
    End Sub

    Public Function DriverEntry(DriverObject As DRIVER_OBJECT, RegistryPath As UNICODE_STRING) As NTSTATUS
        DriverObject.MajorFunction(IRP_MJ_CREATE) = AddressOf DispatchCreateClose
        DriverObject.MajorFunction(IRP_MJ_CLOSE) = AddressOf DispatchCreateClose
        DriverObject.DriverUnload = AddressOf Unload
        Return STATUS_SUCCESS
    End Function
End Module
```

## See Also

- [tbKMode](.) package -- the project settings of a driver
- [modFltMgr](modFltMgr) module -- the routines of a file-system minifilter
- [modSysInfo](modSysInfo) module -- the `Zw` information routines and their classes
- [modDisk](modDisk) module -- the structures of a driver that presents a disk
- [modKmOpaque](modKmOpaque) module -- offsets of fields in opaque kernel structures
- [Writing a DriverEntry routine](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/writing-a-driverentry-routine) -- Microsoft's description of a driver's entry point
- [Writing dispatch routines](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/writing-dispatch-routines) -- Microsoft's description of the routines that handle IRPs
- [wdm.h](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/) -- Microsoft's reference for the routines and structures of wdm.h
- [fafalone/FsMinifilter](https://github.com/fafalone/FsMinifilter) -- a minifilter written with this package, by its author
