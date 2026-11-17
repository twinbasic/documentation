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

<!-- test: KernelHelperTests.RtlCompareUnicodeString_OrdersTheStrings, KernelHelperTests.ObDereferenceObject_PassesTheObject, KernelHelperTests.ExReleaseResourceLite_PassesTheResource -->
Every routine is in `ntoskrnl.exe`. Each declaration names it there, takes the routine's parameters and returns its result, and a routine that the 32-bit kernel exports as `__fastcall`, such as **ObDereferenceObject**, is declared `FastCall`, apart from those of the warnings and the note below.
<!-- /test -->

<!-- test: compile ZwCreateKeyClassIsOptional, compile ZwCreateKeyTransactedClassIsOptional, compile ZwCreateRegistryTransactionObjAttributesIsOptional, compile ZwOpenProcessClientIDIsOptional -->
A parameter that C declares optional, and that is a structure passed by reference here, takes a null pointer written `ByVal vbNullPtr`: *Class* of **ZwCreateKey** and **ZwCreateKeyTransacted**, *ObjAttributes* of **ZwCreateRegistryTransaction** and *ClientID* of **ZwOpenProcess** are four.
<!-- /test -->

{{table:declares}}

<!-- test: compile ZwDuplicateObjectTakesTargetProcessHandle, compile IoCreateDeviceReturnsThePointer, compile ExTryToAcquireFastMutexReturnsWhetherAcquired, compile SeLocateProcessImageNameReturnsThePointer, compile ExInitializeNPagedLookasideListTakesTheList, compile CmCallbackReleaseKeyObjectIDExTakesThePointer, compile DbgPrintEx1TakesTheComponentAndTheLevel, compile DbgPrintEx2TakesTheComponentAndTheLevel, compile DbgPrintEx3TakesTheComponentAndTheLevel, compile ZwMapViewOfSectionTakesTheInheritDisposition, compile ExAllocatePool2TakesPoolFlags, KernelHelperTests.ExAllocatePool2_PassesTheSizeAndTheTag, compile RtlCompareUnicodeStringsTakesTheLengths, KernelHelperTests.RtlFindFirstRunClear_ReturnsTheStartingIndex, KernelHelperTests.RtlFindLongestRunClear_ReturnsTheStartingIndex -->
> [!WARNING] 0.3.0.5
> These declarations do not match the kernel's routines, and a driver must not call them. It declares each one itself, as the WDK has the routine.
>
> - **CmCallbackReleaseKeyObjectIDEx** takes a **UNICODE_STRING**, but **CmCallbackGetKeyObjectIDEx** gives the name back as a pointer, which is what the routine takes. The compiler refuses the pointer, and a **UNICODE_STRING** passed instead gives the routine the address of the driver's own variable, not of the string it allocated.
> - **DbgPrintEx1**, **DbgPrintEx2** and **DbgPrintEx3** lack the first two parameters of `DbgPrintEx`, *ComponentId* and *Level*, and start at *Format*. The routine takes the address of the format as the component ID and the first argument as the level, and reads its format from whatever follows the arguments.
> - **ExAllocatePool2** and **ExAllocatePool3** take a **POOL_TYPE** where the routines take `POOL_FLAGS`, a 64-bit set of `POOL_FLAG_` bits, which the package does not declare. A **POOL_TYPE** value asks for something else: `NonPagedPool`, 0, names no pool, and `PagedPool`, 1, is `POOL_FLAG_USE_QUOTA`. In a 32-bit driver the routine also reads the size and the tag from the wrong places.
> - **ExInitializeNPagedLookasideList** takes *Lookaside* as a **LongPtr** passed by reference, where the routine takes the list. The routine initializes a list at the address of that variable, and writes over what follows it.
> - **ExTryToAcquireFastMutex** is a **Sub**, but the routine returns whether it acquired the mutex. A driver cannot tell whether it holds the mutex.
> - **IoCreateDevice** takes *DeviceObject* as a **DEVICE_OBJECT**, where the routine takes the address of a variable that receives a pointer to the new device object. The routine writes the pointer over the start of the structure, and the driver does not receive its device object.
> - **RtlCompareUnicodeStrings** lacks the length of each string, the routine's second and fourth parameters, so the routine takes the address of the second string as the length of the first. It also names `ntdll`, as **RtlDuplicateUnicodeString** does (see the note below).
> - **RtlFindFirstRunClear** and **RtlFindLongestRunClear** take *StartingIndex* `ByVal`, where the routine takes the address of a variable and writes the run's first index there: the routine writes to the address that the value names.
> - **SeLocateProcessImageName** takes *ImageFileName* as a **UNICODE_STRING**, where the routine takes the address of a variable that receives a pointer to the string it allocates. The routine writes the pointer over the start of the structure.
> - **ZwDuplicateObject** lacks the routine's third parameter, *TargetProcessHandle*. The routine takes the address meant for *TargetHandle* as *TargetProcessHandle*, each later argument as the parameter before the one it is meant for, and its last parameter, *Options*, from whatever follows.
> - **ZwMapViewOfSection** lacks the routine's eighth parameter, *InheritDisposition*, between *ViewSize* and *AllocationType*. The routine takes *AllocationType* as the disposition, *Win32Protect* as the allocation type, and its protection from whatever follows.

<!-- test: WDMExportTests.Declares_NameExportsOfTheKernel, WDMExportTests.ZwCreateUserProcess_IsTheKernelsUnnamedOrdinal2, KernelHelperTests.RtlDuplicateUnicodeString_CallsTheKernel, probe ordinal, probe x86exports -->
> [!NOTE] 0.3.0.5
> The 64-bit kernel of Windows 10 version 22H2 does not export these routines: **KeQuerySystemTime**, **RtlAcquirePebLock**, **RtlAllocateAndInitializeSid**, **RtlCheckBit**, **RtlCreateServiceSid**, **RtlDefaultNpAcl**, **RtlEqualPrefixSid**, **RtlFreeSid**, **RtlGetCurrentPeb**, **RtlReleasePebLock**, **RtlUniform**, **ZwCompactKeys**, **ZwCompressKey**, **ZwFreezeRegistry**, **ZwInitializeRegistry**, **ZwLoadKey2**, **ZwLoadKey3**, **ZwLockRegistryKey**, **ZwNotifyChangeMultipleKeys**, **ZwQueryMultipleValueKey**, **ZwQueryOpenSubKeys**, **ZwQueryOpenSubKeysEx**, **ZwResumeProcess**, **ZwSaveMergedKeys**, **ZwSuspendProcess** and **ZwThawRegistry**. **RtlDuplicateUnicodeString**, which the kernel exports, is declared in the user-mode `ntdll`, which the kernel does not load for a driver. A driver imports only the routines that it calls, so a driver that calls none of them is not affected; one that calls any of them does not load.
>
> The same kernel exports **ZwCreateUserProcess** with no name, as ordinal 2, so the package's declaration, which imports it by name, does not load either. A driver that declares it with `Alias "#2"` imports it by ordinal. **ExFreePool2** is exported from Windows 11 and Windows Server 2022 on, as [its page](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exfreepool2) says: a driver that calls it does not load on Windows 10.
>
> A 32-bit driver has more of them. The 32-bit `ntoskrnl.exe` does not export **ExAcquireFastMutex**, **ExReleaseFastMutex**, **ExTryToAcquireFastMutex**, **KeGetCurrentIrql**, **KeRaiseIrqlToDpcLevel**, **KeReleaseSpinLock** and **KfRaiseIrql**, which the 32-bit `hal.dll` exports, and neither file exports `KeAcquireSpinLockRaiseToDpc`, which **KeAcquireSpinLock** names, or **RtlInitializeBitMapEx**, **RtlClearAllBitsEx**, **RtlClearBitEx**, **RtlSetBitEx**, **RtlTestBitEx**, **RtlFindSetBitsEx** and **RtlFindSetBitsAndClearEx**. A 32-bit driver that calls any of them does not load. A driver declares a routine of `hal.dll` itself, with `Lib "hal.dll"`. The 64-bit kernel exports all of them.

<!-- test: KernelHelperTests.IoCallDriver_PassesTheDeviceAndTheIrp, KernelHelperTests.ExAcquireFastMutex_PassesTheMutex, KernelHelperTests.ExReleaseFastMutex_PassesTheMutex, KernelHelperTests.ExTryToAcquireFastMutex_PassesTheMutex, KernelHelperTests.InterlockedPopEntrySList_PassesTheListHead, KernelHelperTests.ExReleaseResourceAndLeaveCriticalRegion_PassesTheResource, KernelHelperTests.ObCloseHandle_PassesTheHandle, KernelHelperTests.ExInterlockedAddUlong_PassesTheArguments -->
> [!WARNING] 0.3.0.5
> In a 32-bit driver, these routines take their arguments in registers, as `__fastcall` routines, but the package declares them without `FastCall` and calls them as `__stdcall` routines, which push the arguments on the stack:
>
> - **ExAcquireFastMutex**, **ExReleaseFastMutex** and **ExTryToAcquireFastMutex**
> - **ExInterlockedAddUlong**
> - **ExReleaseResourceAndLeaveCriticalRegion**
> - **InterlockedPopEntrySList**
> - **IofCallDriver**, which [**IoCallDriver**](#IoCallDriver) calls
>
> Each routine receives other values than its arguments, and the call leaves the stack 4 bytes off, 8 for **ExInterlockedAddUlong** and **IofCallDriver**. **ObCloseHandle** is the other way round: the package declares it `FastCall`, but the kernel's routine is `__stdcall` and reads its arguments from the stack, so it receives other values than its arguments, and the call leaves the stack 8 bytes off. A 64-bit driver is not affected. The 32-bit [**InterlockedIncrement**](#InterlockedIncrement) has a warning of its own.

## Types

<!-- test: {{cases:WDMLayoutTests}} -->
Each structure that the WDK's kernel-mode headers declare has the size of its C structure, and its fields are at the C fields' offsets, in a 32-bit and in a 64-bit build, apart from those of the warning and the note below.

{{table:types}}
<!-- /test -->

<!-- test: WDMLayoutTests.IMAGE_INFO_Layout, WDMLayoutTests.IMAGE_INFO_EX_Layout, WDMLayoutTests.OB_POST_OPERATION_INFORMATION_Layout, WDMFieldTests.OB_PRE_OPERATION_INFORMATION_ParametersIsAPointer, WDMLayoutTests.OB_PRE_OPERATION_INFORMATION_Layout, WDMLayoutTests.KUSER_SHARED_DATA_Layout -->
> [!WARNING] 0.3.0.5
> Five structures do not have the C structure's layout, so a driver that reads one the kernel passes it reads other data than the field it names. A driver declares each one itself, as the WDK has it.
>
> - **IMAGE_INFO** has **ImageBase** first and **Properties** second, where C has the union of the properties first. In a 32-bit build the two fields have changed places; in a 64-bit build every field is at another offset, and the structure is 32 bytes where C's is 40. **IMAGE_INFO_EX** holds one: in a 64-bit build it is 48 bytes where C's is 56, and its **FileObject** is at offset 40 where C's is at 48.
> - **KUSER_SHARED_DATA** has the layout of an older Windows near its end. Its **SystemCall** is at offset 768, where the WDK has **QpcFrequency**, and the WDK's **SystemCall** is at 776; its **SystemCallPad** is at 776 where the WDK's is at 784. Its **Reserved2** is an array at offset 584, where the WDK's **Reserved2** is at 780. The structure is 824 bytes where the WDK's is 1848, and has none of the fields after **Cookie**.
> - **OB_POST_OPERATION_INFORMATION.Parameters** is an **OB_POST_OPERATION_PARAMETERS** where wdm.h has a pointer to one. In a 64-bit build it is at offset 36 where the pointer is at 40, and the structure is 40 bytes where C's is 48. In a 32-bit build the field is at the pointer's offset, so its **GrantedAccess** is the pointer.
> - **OB_PRE_OPERATION_INFORMATION.Parameters** is a **Byte** array of the size of the parameters' union where wdm.h has a pointer to the union: 16 bytes where the pointer is 4 in a 32-bit build, and 24 where it is 8 in a 64-bit one. The structure is 36 bytes where C's is 24, and 56 where C's is 40. The array starts at the pointer's offset, so its first 4 or 8 bytes are the pointer, and the rest is past the end of the structure the kernel passes.

<!-- test: WDMLayoutTests.IO_DRIVER_CREATE_CONTEXT_Layout, WDMLayoutTests.DEVICE_OBJECT_Layout, WDMLayoutTests._GENERAL_LOOKASIDE_Layout, WDMLayoutTests.NPAGED_LOOKASIDE_LIST_Layout, WDMLayoutTests.SE_SID_Layout -->
> [!NOTE] 0.3.0.5
> These structures differ from the C structures in size, and one in the start of a field:
>
> - **DEVICE_OBJECT.Queue** starts 3 bytes before C's **Queue**, at offset 49 where C's is at 52 in a 32-bit build and at 77 where C's is at 80 in a 64-bit one: its first 3 bytes are the padding after **StackSize**. In a 64-bit build the structure is 328 bytes where C's is 336. Its other fields are at their places.
> - **IO_DRIVER_CREATE_CONTEXT** lacks C's last field, **SiloContext**: it is 16 bytes where C's is 20 in a 32-bit build, and 32 where C's is 40 in a 64-bit one. Its other fields are at their places.
> - In a 32-bit build **_GENERAL_LOOKASIDE** is 128 bytes where C's is 72, and **NPAGED_LOOKASIDE_LIST**, which holds one, is 192 where C's is 80: their padding arrays, **align**, are longer than C's padding. In a 64-bit build both have C's sizes.
> - **SE_SID** is a buffer of **SECURITY_MAX_SID_SIZE** bytes, 60, where C's is 68 (see the note under [Constants](#constants)), so it cannot hold a SID of **SID_MAX_SUB_AUTHORITIES** subauthorities.

## Aliases

Other names for **Byte**, which the declarations use where C has the type of the same name. A variable of one of them is a **Byte**.

{{table:aliases}}

## Enumerations

<!-- test: {{cases:WDMValueTests}} -->
Every member that the WDK's kernel-mode headers declare has the value of the WDK's constant or enumerator of the same name, apart from those of the warning and the note below.

{{table:enums}}
<!-- /test -->

<!-- test: WDMValueTests.POOL_TYPE_Values -->
> [!WARNING] 0.3.0.5
> Three members of **POOL_TYPE** do not have the WDK's values: **DontUseThisType** is 2 where the WDK's is 3, **PagedPoolCacheAligned** is 3 where it is 5, and **MaxPoolType** is 4 where it is 7. A driver that allocates memory of **PagedPoolCacheAligned** asks the kernel for its `DontUseThisType`. A driver writes the WDK's value, 5, itself.

<!-- test: WDMValueTests.MEMORY_CACHING_TYPE_Values, WDMValueTests.ProcessAccessRights_Values -->
> [!NOTE] 0.3.0.5
> Two members do not have the WDK's values:
>
> - **MmNotMapped** of **MEMORY_CACHING_TYPE** is 7, where the WDK's is -1.
> - **PROCESS_ALL_ACCESS** of **ProcessAccessRights** is `&H1F0FFF`, the value of Windows versions before Windows Vista, where the WDK's is `&H1FFFFF`. A handle opened with it lacks the rights that Windows Vista added.

## Constants

The major and minor function codes of an IRP, the parts of an I/O control code that [**CTL_CODE**](#CTL_CODE) takes, the `SL_` flags of an I/O stack location, the values of **RtlQueryRegistryValues** and its **RTL_QUERY_REGISTRY_TABLE**, and the sizes and revisions of security descriptors and SIDs.

{{table:consts}}

<!-- test: WDMValueTests.Constants_Values -->
> [!WARNING] 0.3.0.5
> **MOUNTDEVCONTROLTYPE** is 4 and **MOUNTMGRCONTROLTYPE** is 6, where the WDK's device types are `&H4D` and `&H6D`. The I/O control codes built from them are not the WDK's, as the two mount codes that [**InitIOCTLs**](#InitIOCTLs) sets are not. A driver uses the WDK's values.

<!-- test: WDMValueTests.Constants_Values -->
> [!NOTE] 0.3.0.5
> These constants do not have the values of the C headers they come from:
>
> - **SECURITY_MAX_SID_SIZE** is 60, where the WDK's is 68: a buffer of that size cannot hold a SID of **SID_MAX_SUB_AUTHORITIES** subauthorities.
> - **RTL_QUERY_REGISTRY_TYPECHECK_MASK** is 0, where the WDK's is `&HFF000000`.
> - **MAXUINT16**, **MAXUSHORT**, **MAXWORD**, **USHRT_MAX** and **_UI16_MAX** are -1, where C's are 65535: `&HFFFF` is an **Integer** literal. They equal an **Integer** field that holds the bits of a **USHORT** of 65535, but not a **Long** of 65535.
> - **MINSHORT** is -32768, where the WDK's is `&H8000`, 32768, for the same reason.
> - **SCHAR_MIN** is 128, a **Byte** of `&H80`, where C's is -128.
> - **PS_ATTRIBUTE_NUMBER_MASK** is -1, an **Integer** literal of `&HFFFF`, where the Native API's mask is `&HFFFF`, 65535: as a **Long** it keeps every bit.

## Variables

The I/O control codes are variables, not constants: each is 0 until [**InitIOCTLs**](#InitIOCTLs) sets it. **SOURCE_FILE** is the file name that [**IoAcquireRemoveLock**](#IoAcquireRemoveLock) passes to the kernel.

{{table:variables}}

<!-- test: WDMHelperTests.InitIOCTLs_SetsTheMountCodes -->
> [!WARNING] 0.3.0.5
> **IOCTL_MOUNTMGR_QUERY_POINTS** and **IOCTL_MOUNTDEV_QUERY_DEVICE_NAME** are not the WDK's codes after [**InitIOCTLs**](#InitIOCTLs) has set them. A driver sets the two itself.

<!-- test: WDMHelperTests.InitIOCTLs_SetsFormatTracks -->
> [!NOTE] 0.3.0.5
> [**InitIOCTLs**](#InitIOCTLs) does not set **IOCTL_DISK_FORMAT_TRACKS**, which stays 0.

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
