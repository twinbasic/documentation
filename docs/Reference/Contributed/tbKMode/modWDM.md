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

| Name | Description |
|------|-------------|
| **_wcslwr**{: #_wcslwr } | Converts a null-terminated wide string to lowercase in place and returns its address. The package's **LCase** calls it. |
| **_wcsrev**{: #_wcsrev } | Reverses the characters of a null-terminated wide string in place and returns its address. The package's **StrRev** calls it. |
| **_wcsupr**{: #_wcsupr } | Converts a null-terminated wide string to uppercase in place and returns its address. The package's **UCase** calls it. |
| [**CmCallbackGetKeyObjectID**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-cmcallbackgetkeyobjectid){: #CmCallbackGetKeyObjectID } | Returns the unique identifier and the name of a registry key object, for a registry callback. *ObjectName* receives the address of a **UNICODE_STRING**; from Windows 8 on, **CmCallbackGetKeyObjectIDEx** gives the key's current name. |
| [**CmCallbackGetKeyObjectIDEx**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-cmcallbackgetkeyobjectidex){: #CmCallbackGetKeyObjectIDEx } | Returns the unique identifier and the name of a registry key object, for a registry callback. *ObjectName* receives the address of a **UNICODE_STRING** that **CmCallbackReleaseKeyObjectIDEx** frees. |
| [**CmCallbackReleaseKeyObjectIDEx**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-cmcallbackreleasekeyobjectidex){: #CmCallbackReleaseKeyObjectIDEx } | Frees a key object name that **CmCallbackGetKeyObjectIDEx** returned. See the warning below. |
| [**CmGetBoundTransaction**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-cmgetboundtransaction){: #CmGetBoundTransaction } | Returns the transaction object that a registry key object is bound to, or 0 when the key is not part of a transaction, for a registry callback. |
| [**CmGetCallbackVersion**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-cmgetcallbackversion){: #CmGetCallbackVersion } | Writes the major and minor version numbers of the configuration manager's registry callback feature into *Major* and *Minor*. |
| [**CmRegisterCallback**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-cmregistercallback){: #CmRegisterCallback } | Registers a registry callback routine, passed with `AddressOf`, and fills *Cookie* with the value that identifies the registration. Obsolete since Windows Vista: use **CmRegisterCallbackEx**. |
| [**CmRegisterCallbackEx**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-cmregistercallbackex){: #CmRegisterCallbackEx } | Registers a registry callback routine, passed with `AddressOf`, at the given altitude, and fills *Cookie* with the value that identifies the registration. |
| [**CmSetCallbackObjectContext**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-cmsetcallbackobjectcontext){: #CmSetCallbackObjectContext } | Attaches the context value *NewContext* to a registry key object, for a registry callback, and writes the previous context into *OldContext* when it is given. |
| [**CmUnRegisterCallback**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-cmunregistercallback){: #CmUnRegisterCallback } | Removes a registry callback that **CmRegisterCallback** or **CmRegisterCallbackEx** registered. Pass the cookie's **QuadPart**. |
| [**CompareMemory**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlcomparememory){: #CompareMemory } | `RtlCompareMemory`: returns how many bytes of two blocks match before the first one that differs, which is *Length* when the blocks are equal. |
| [**CopyMemory**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlmovememory){: #CopyMemory } | `RtlMoveMemory`: copies *Length* bytes from one block of memory to another; the blocks can overlap. |
| [**DbgPrint**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-dbgprint){: #DbgPrint } | Sends a message to the kernel debugger. *Format* is the address of a null-terminated ANSI string. |
| [**DbgPrint1**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-dbgprint){: #DbgPrint1 } | `DbgPrint`: sends a formatted message with one argument to the kernel debugger. *Format* is the address of an ANSI format string. *Arg1* is `As Any`: pass a number or an address as `ByVal`, or the routine is given the variable's address. |
| [**DbgPrint2**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-dbgprint){: #DbgPrint2 } | `DbgPrint`: as **DbgPrint1**, with two arguments. Pass each one as `ByVal`. |
| [**DbgPrint3**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-dbgprint){: #DbgPrint3 } | `DbgPrint`: as **DbgPrint1**, with three arguments. Pass each one as `ByVal`. |
| [**DbgPrintEx**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-dbgprintex){: #DbgPrintEx } | Sends a message to the kernel debugger when the debug filter of the component *ComponentId* lets messages of *Level* through. *Format* is the address of a null-terminated ANSI string. |
| [**DbgPrintEx1**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-dbgprintex){: #DbgPrintEx1 } | `DbgPrintEx`: sends a formatted message with one argument to the kernel debugger. *Format* is the address of an ANSI format string. *Arg1* is `As Any`: pass a number or an address as `ByVal`, or the routine is given the variable's address. See the warning below. |
| [**DbgPrintEx2**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-dbgprintex){: #DbgPrintEx2 } | `DbgPrintEx`: as **DbgPrintEx1**, with two arguments. Pass each one as `ByVal`. See the warning below. |
| [**DbgPrintEx3**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-dbgprintex){: #DbgPrintEx3 } | `DbgPrintEx`: as **DbgPrintEx1**, with three arguments. Pass each one as `ByVal`. See the warning below. |
| [**EtwActivityIdControl**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-etwactivityidcontrol){: #EtwActivityIdControl } | Gets, sets or creates the activity identifier of the current thread through *ActivityId*, as *ControlCode*, an `EVENT_ACTIVITY_CTRL_` value, says. |
| [**EtwEventEnabled**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-etweventenabled){: #EtwEventEnabled } | Returns nonzero if the event that *EventDescriptor* describes is enabled for the ETW provider that *RegHandle* identifies. |
| [**EtwProviderEnabled**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-etwproviderenabled){: #EtwProviderEnabled } | Returns nonzero if the ETW provider that *RegHandle* identifies is enabled for events of the given *Level* and *Keyword*. |
| [**EtwRegister**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-etwregister){: #EtwRegister } | Registers an ETW event provider, identified by its GUID, and writes the handle of the registration into *RegHandle*; a provider calls it before it writes any event. *EnableCallback* is a callback routine passed with `AddressOf`, or 0. |
| [**EtwSetInformation**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-etwsetinformation){: #EtwSetInformation } | Sets special-purpose information, of the kind *InformationClass* names, on the ETW provider registration that *RegHandle* identifies. |
| [**EtwUnregister**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-etwunregister){: #EtwUnregister } | Removes an ETW provider registration that **EtwRegister** made; a provider calls it before the driver unloads. |
| [**EtwWrite**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-etwwrite){: #EtwWrite } | Writes an ETW event that *EventDescriptor* describes, with the *UserDataCount* items of data that **EVENT_DATA_DESCRIPTOR** entries describe. *ActivityId* is the address of a **UUID**, or 0. |
| [**EtwWriteEx**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-etwwriteex){: #EtwWriteEx } | Writes an ETW event as **EtwWriteTransfer** does, with *Filter* naming the sessions that do not receive it, and *Flags*. |
| [**EtwWriteString**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-etwwritestring){: #EtwWriteString } | Writes an ETW event that holds only a string, at the given *Level* and *Keyword*. *String* is the address of a null-terminated wide string, and *ActivityId* the address of a **UUID**, or 0. |
| [**EtwWriteTransfer**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-etwwritetransfer){: #EtwWriteTransfer } | Writes an ETW transfer event, which links the activity *ActivityId* to *RelatedActivityId*, as **EtwWrite** writes an event. Each is the address of a **UUID**, or 0. |
| [**ExAcquireFastMutex**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exacquirefastmutex){: #ExAcquireFastMutex } | Acquires a fast mutex for the calling thread, waiting until it is free, and raises the IRQL to `APC_LEVEL`. See the warning about 32-bit drivers below. |
| [**ExAcquireResourceExclusiveLite**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exacquireresourceexclusivelite){: #ExAcquireResourceExclusiveLite } | Acquires a resource for exclusive access by the calling thread. With *Wait* 0 it returns 0 at once if the resource is not free. |
| [**ExAcquireResourceSharedLite**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exacquireresourcesharedlite){: #ExAcquireResourceSharedLite } | Acquires a resource for shared access by the calling thread. With *Wait* 0 it returns 0 at once if the resource cannot be shared now. |
| [**ExAcquireSharedStarveExclusive**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exacquiresharedstarveexclusive){: #ExAcquireSharedStarveExclusive } | Acquires a resource for shared access without waiting for threads that are waiting for exclusive access. |
| [**ExAcquireSharedWaitForExclusive**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exacquiresharedwaitforexclusive){: #ExAcquireSharedWaitForExclusive } | Acquires a resource for shared access only when shared access can be granted and no thread is waiting for exclusive access. |
| [**ExAllocatePool2**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exallocatepool2){: #ExAllocatePool2 } | Allocates a block of pool memory with the given tag, filled with zeros, and returns its address, or 0. It replaces **ExAllocatePoolWithTag** from Windows 10 version 2004 on. See the warning below. |
| [**ExAllocatePool3**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exallocatepool3){: #ExAllocatePool3 } | Allocates a block of pool memory as **ExAllocatePool2** does, with extended parameters, such as a priority, in an array of *ExtendedParametersCount* **POOL_EXTENDED_PARAMETER** entries. See the warning below. |
| [**ExAllocatePoolWithTag**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exallocatepoolwithtag){: #ExAllocatePoolWithTag } | Allocates a block of pool memory of the given type and tag and returns its address, or 0. Microsoft marks it obsolete in favour of `ExAllocatePool2`. |
| [**ExAllocatePoolWithTagPriority**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exallocatepoolwithtagpriority){: #ExAllocatePoolWithTagPriority } | Allocates a block of pool memory of the given type and tag, as **ExAllocatePoolWithTag** does, and returns its address, or 0. *Priority* says how important the request is when memory is low. |
| [**ExDeleteResourceLite**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exdeleteresourcelite){: #ExDeleteResourceLite } | Deletes a resource from the system's resource list, before its memory is freed. |
| [**ExEnterCriticalRegionAndAcquireResourceExclusive**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exentercriticalregionandacquireresourceexclusive){: #ExEnterCriticalRegionAndAcquireResourceExclusive } | Enters a critical region and acquires a resource for exclusive access by the calling thread. |
| **ExEnterCriticalRegionAndAcquireResourceShared**{: #ExEnterCriticalRegionAndAcquireResourceShared } | Enters a critical region and acquires a resource for shared access, as its name shows. Not documented by Microsoft. |
| **ExEnterCriticalRegionAndAcquireSharedWaitForExclusive**{: #ExEnterCriticalRegionAndAcquireSharedWaitForExclusive } | Enters a critical region and acquires a resource for shared access when no thread is waiting for exclusive access, as its name shows. Not documented by Microsoft. |
| [**ExFreePool2**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exfreepool2){: #ExFreePool2 } | Frees a block of pool memory that was allocated with the given tag; for a block of secure pool, the extended parameters say which pool. See the note below. |
| [**ExFreePoolWithTag**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exfreepoolwithtag){: #ExFreePoolWithTag } | Frees a block of pool memory that was allocated with the given tag. *P* is the block's address. |
| [**ExGetPreviousMode**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exgetpreviousmode){: #ExGetPreviousMode } | Returns the previous processor mode of the current thread: `UserMode` when the request came from a user-mode program, `KernelMode` when it came from the kernel. |
| [**ExInitializeNPagedLookasideList**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exinitializenpagedlookasidelist){: #ExInitializeNPagedLookasideList } | Initializes a lookaside list of nonpaged entries of the given size. See the warning below. |
| [**ExInitializeResourceLite**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exinitializeresourcelite){: #ExInitializeResourceLite } | Initializes a resource variable, which must be in nonpaged memory. |
| [**ExInterlockedAddLargeInteger**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exinterlockedaddlargeinteger){: #ExInterlockedAddLargeInteger } | Adds a 64-bit value to a variable as one atomic operation, under the given spin lock, and returns the variable's value before the addition. |
| [**ExInterlockedAddUlong**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exinterlockedaddulong){: #ExInterlockedAddUlong } | Adds a 32-bit value to a variable as one atomic operation, under the given spin lock, and returns the variable's value before the addition. |
| [**ExIsResourceAcquiredExclusiveLite**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exisresourceacquiredexclusivelite){: #ExIsResourceAcquiredExclusiveLite } | Tells whether the calling thread has exclusive access to a resource. |
| [**ExIsResourceAcquiredSharedLite**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exisresourceacquiredsharedlite){: #ExIsResourceAcquiredSharedLite } | Returns how many times the calling thread has acquired a resource, shared or exclusive, or 0 if it has not. |
| **ExRaiseHardError**{: #ExRaiseHardError } | Raises a hard error with the given status and parameters, which can show a message box, and returns in *Response* the button the user chose. The package's **MsgBox** calls it. Not documented by Microsoft. |
| [**ExRaiseStatus**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exraisestatus){: #ExRaiseStatus } | Raises an exception with the given status, for a structured exception handler to handle. |
| [**ExReinitializeResourceLite**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exreinitializeresourcelite){: #ExReinitializeResourceLite } | Reinitializes an existing resource variable, so that it can be used again. |
| [**ExReleaseFastMutex**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exreleasefastmutex){: #ExReleaseFastMutex } | Releases a fast mutex that **ExAcquireFastMutex** or **ExTryToAcquireFastMutex** acquired, and restores the IRQL. See the warning about 32-bit drivers below. |
| [**ExReleaseResourceAndLeaveCriticalRegion**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exreleaseresourceandleavecriticalregion){: #ExReleaseResourceAndLeaveCriticalRegion } | Releases a resource and leaves the critical region that one of the **ExEnterCriticalRegionAndAcquire** routines entered. See the warning about 32-bit drivers below. |
| [**ExReleaseResourceForThreadLite**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exreleaseresourceforthreadlite){: #ExReleaseResourceForThreadLite } | Releases a resource that the given thread acquired. |
| [**ExReleaseResourceLite**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exreleaseresourcelite){: #ExReleaseResourceLite } | Releases a resource that the calling thread owns. |
| [**ExSetResourceOwnerPointer**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exsetresourceownerpointer){: #ExSetResourceOwnerPointer } | Sets the owner of a resource to the given pointer, so that another thread can release it. |
| [**ExTryToAcquireFastMutex**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-extrytoacquirefastmutex){: #ExTryToAcquireFastMutex } | Acquires a fast mutex at once if it is free, as **ExAcquireFastMutex** does, without waiting. See the warning below. See the warning about 32-bit drivers below. |
| **FsRtlGetFileNameInformation**{: #FsRtlGetFileNameInformation } | Gets name information about a file object, as its name and parameters show. Not documented by Microsoft. |
| [**FsRtlGetFileSize**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-_fsrtl_advanced_fcb_header-fsrtlgetfilesize){: #FsRtlGetFileSize } | Gets the size of a file, in bytes, into *FileSize*. |
| [**FsRtlIsNameInExpression**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-_fsrtl_advanced_fcb_header-fsrtlisnameinexpression){: #FsRtlIsNameInExpression } | Tells whether a name matches a pattern that can contain wildcards. With *IgnoreCase* nonzero, the pattern must be in uppercase. |
| [**FsRtlIsNameInUnUpcasedExpression**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-_fsrtl_advanced_fcb_header-fsrtlisnameinunupcasedexpression-r3){: #FsRtlIsNameInUnUpcasedExpression } | As **FsRtlIsNameInExpression**, but with *IgnoreCase* nonzero the pattern need not be in uppercase. |
| [**FsRtlIsPagingFile**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-fsrtlispagingfile){: #FsRtlIsPagingFile } | Tells whether a file is a paging file: nonzero if it is. |
| [**FsRtlIsSystemPagingFile**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-fsrtlissystempagingfile){: #FsRtlIsSystemPagingFile } | Tells whether a file is a paging file of the system: nonzero if it is. |
| [**InterlockedPopEntrySList**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-expinterlockedpopentryslist){: #InterlockedPopEntrySList } | `ExpInterlockedPopEntrySList` in a 64-bit build: removes the first entry of a singly linked list as one atomic operation and returns its address, or 0 when the list is empty. See the warning about 32-bit drivers below. |
| **IoAcquireRemoveLockEx**{: #IoAcquireRemoveLockEx } | Acquires a remove lock, so that the device is not removed while the driver works with it, and returns `STATUS_SUCCESS`, or `STATUS_DELETE_PENDING` when a remove is under way. *Tag* is `As Any`: pass it as `ByVal`; drivers usually call the package's procedure **IoAcquireRemoveLock**, which supplies the other arguments. |
| [**IoAllocateDriverObjectExtension**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-ioallocatedriverobjectextension){: #IoAllocateDriverObjectExtension } | Allocates a context area for the driver object, identified by *ClientIdentificationAddress*, and returns its address in *DriverExtensionObject*. |
| [**IoAttachDeviceToDeviceStack**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-ioattachdevicetodevicestack){: #IoAttachDeviceToDeviceStack } | Attaches the device object *SourceDevice* to the top of the device stack that holds *TargetDevice*, and returns the device object it was attached to, or 0. |
| [**IoAttachDeviceToDeviceStackSafe**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/nf-ntddk-ioattachdevicetodevicestacksafe){: #IoAttachDeviceToDeviceStackSafe } | Attaches *SourceDevice* to the top of the device stack that holds *TargetDevice*, and writes the device object it was attached to into *AttachedToDeviceObject*. |
| [**IoCompleteRequest**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-iocompleterequest){: #IoCompleteRequest } | Completes an IRP and returns it to the I/O manager, raising the priority of the waiting thread by *PriorityBoost*. |
| [**IoCreateDevice**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-iocreatedevice){: #IoCreateDevice } | Creates a device object for the driver. See the warning below. |
| [**IoCreateSymbolicLink**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-iocreatesymboliclink){: #IoCreateSymbolicLink } | Creates a symbolic link, such as `\DosDevices\MyDevice`, to a device object's name, so that user-mode programs can open the device. |
| [**IoDeleteDevice**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-iodeletedevice){: #IoDeleteDevice } | Deletes a device object, for example when the driver unloads. *DeviceObject* is `As Any`: pass the address as `ByVal`. |
| [**IoDeleteSymbolicLink**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-iodeletesymboliclink){: #IoDeleteSymbolicLink } | Deletes a symbolic link that **IoCreateSymbolicLink** created. |
| [**IoDetachDevice**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-iodetachdevice){: #IoDetachDevice } | Detaches the driver's device object from the lower device object *TargetDevice*. |
| [**IofCallDriver**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-iofcalldriver){: #IofCallDriver } | Sends an IRP to the driver of a device object. Drivers call the package's procedure **IoCallDriver**, which calls it. See the warning about 32-bit drivers below. |
| [**IoGetDriverObjectExtension**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-iogetdriverobjectextension){: #IoGetDriverObjectExtension } | Returns the address of the context area that **IoAllocateDriverObjectExtension** allocated with the same *ClientIdentificationAddress*, or 0. |
| [**IoGetRequestorProcess**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-iogetrequestorprocess){: #IoGetRequestorProcess } | Returns the process (an `EPROCESS` pointer) of the thread that started the I/O operation of an IRP. |
| [**IoGetTopLevelIrp**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-iogettoplevelirp){: #IoGetTopLevelIrp } | Returns the value of the current thread's `TopLevelIrp` field, which file systems set to track the IRP at the top of a recursive call. |
| **IoInitializeRemoveLockEx**{: #IoInitializeRemoveLockEx } | Initializes a remove lock, which belongs in the device extension. Drivers usually call the package's procedure **IoInitializeRemoveLock**, which supplies *RemlockSize*. |
| **IoReleaseRemoveLockAndWaitEx**{: #IoReleaseRemoveLockAndWaitEx } | Releases a remove lock and waits until every other holder has released it, before the device is removed. *Tag* is `As Any`: pass the tag the lock was acquired with as `ByVal`. |
| **IoReleaseRemoveLockEx**{: #IoReleaseRemoveLockEx } | Releases a remove lock that **IoAcquireRemoveLockEx** acquired. *Tag* is `As Any`: pass the tag the lock was acquired with as `ByVal`; drivers usually call the package's procedure **IoReleaseRemoveLock**. |
| [**IoSetDeviceInterfaceState**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-iosetdeviceinterfacestate){: #IoSetDeviceInterfaceState } | Enables or disables an instance of a registered device interface class, named by its symbolic link. |
| [**IoThreadToProcess**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-iothreadtoprocess){: #IoThreadToProcess } | Returns the process (an `EPROCESS` pointer) that a thread belongs to. |
| [**KeAcquireSpinLock**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-keacquirespinlockraisetodpc){: #KeAcquireSpinLock } | `KeAcquireSpinLockRaiseToDpc`: Acquires a spin lock, raising the IRQL to `DISPATCH_LEVEL`, and returns the IRQL from before, which **KeReleaseSpinLock** takes back. The WDK's `KeAcquireSpinLock` macro writes that IRQL to a second argument instead. |
| [**KeAttachProcess**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-keattachprocess){: #KeAttachProcess } | Attaches the current thread to the address space of a process (a `KPROCESS` pointer). Obsolete: use **KeStackAttachProcess**. |
| [**KeDelayExecutionThread**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-kedelayexecutionthread){: #KeDelayExecutionThread } | Puts the current thread into a wait, alertable or not, for *Interval*, in 100-nanosecond units: negative for a time relative to now, positive for an absolute time. |
| [**KeDetachProcess**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-kedetachprocess){: #KeDetachProcess } | Detaches the current thread from the process that **KeAttachProcess** attached it to. Obsolete: use **KeUnstackDetachProcess**. |
| [**KeGetCurrentIrql**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-kegetcurrentirql){: #KeGetCurrentIrql } | Returns the current IRQL. |
| [**KeInitializeEvent**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-keinitializeevent){: #KeInitializeEvent } | Initializes a **KEVENT** as a notification or synchronization event, signaled or not signaled. |
| [**KeInitializeSpinLock**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-keinitializespinlock){: #KeInitializeSpinLock } | Initializes a spin lock variable, a **LongPtr**. The C routine returns nothing, so the **Long** it returns here has no meaning. |
| [**KeLowerIrql**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-kelowerirql){: #KeLowerIrql } | Restores the IRQL of the current processor to *NewIrql*, the value that **KeRaiseIrql** saved or **KfRaiseIrql** or **KeRaiseIrqlToDpcLevel** returned. Declared in a 64-bit build only; a 32-bit build has **KfLowerIrql**. |
| [**KeQuerySystemTime**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-kequerysystemtime-r1){: #KeQuerySystemTime } | Writes the current system time into *CurrentTime*, in 100-nanosecond units since 1 January 1601 (UTC). See the note below. |
| [**KeQuerySystemTimePrecise**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-kequerysystemtimeprecise){: #KeQuerySystemTimePrecise } | Writes the current system time into *CurrentTime*, as **KeQuerySystemTime** does but more precisely. |
| [**KeRaiseIrqlToDpcLevel**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-keraiseirqltodpclevel){: #KeRaiseIrqlToDpcLevel } | Raises the IRQL of the current processor to `DISPATCH_LEVEL` and returns the IRQL from before, which **KeLowerIrql** takes back. |
| [**KeReleaseSpinLock**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-kereleasespinlock){: #KeReleaseSpinLock } | Releases a spin lock and restores the IRQL that **KeAcquireSpinLock** returned. |
| [**KeSetEvent**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-kesetevent){: #KeSetEvent } | Sets an event to the signaled state and returns its previous state, nonzero if it was signaled. |
| [**KeSetPriorityThread**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-kesetprioritythread){: #KeSetPriorityThread } | Sets the priority of a thread (a `KTHREAD` pointer) and returns its old priority. |
| [**KeStackAttachProcess**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-kestackattachprocess){: #KeStackAttachProcess } | Attaches the current thread to the address space of a process (a `KPROCESS` pointer) and saves the previous attach state in *ApcState*, for **KeUnstackDetachProcess**. |
| [**KeUnstackDetachProcess**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-keunstackdetachprocess){: #KeUnstackDetachProcess } | Detaches the current thread from the process that **KeStackAttachProcess** attached it to, and restores the attach state saved in *ApcState*. |
| [**KeWaitForSingleObject**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-kewaitforsingleobject){: #KeWaitForSingleObject } | Waits until a dispatcher object, such as a **KEVENT**, is signaled, or until the timeout ends. *Timeout* is the address of a **LARGE_INTEGER** (negative for a time relative to now, in 100-nanosecond units), or 0 to wait with no limit. |
| **KfLowerIrql**{: #KfLowerIrql } | Restores the IRQL of the current processor to *NewIrql*. Declared in a 32-bit build only, in place of **KeLowerIrql**, as the WDK's `KeLowerIrql` macro calls it there. The package marks it `[Unimplemented]`, so that a call of it gets the warning TB0009. |
| **KfRaiseIrql**{: #KfRaiseIrql } | Raises the IRQL of the current processor to *NewIrql* and returns the IRQL from before, which **KeLowerIrql** takes back. The package's **KeRaiseIrql** calls it. |
| [**MmCopyMemory**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/nf-ntddk-mmcopymemory){: #MmCopyMemory } | Copies a range of virtual or physical memory, named by *SourceAddress* and *Flags*, into a buffer, and writes the number of bytes copied into *NumberOfBytesTransferred*. |
| [**MmGetSystemRoutineAddress**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-mmgetsystemroutineaddress){: #MmGetSystemRoutineAddress } | Returns the address of a kernel or HAL routine by name, or 0 if this Windows has none. |
| [**MmIsAddressValid**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/nf-ntddk-mmisaddressvalid){: #MmIsAddressValid } | Returns nonzero if reading or writing at a virtual address would not cause a page fault. Microsoft advises against using it. |
| [**MmMapLockedPagesSpecifyCache**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-mmmaplockedpagesspecifycache){: #MmMapLockedPagesSpecifyCache } | Maps the physical pages that an MDL describes to a virtual address, with the cache type given, and returns that address. |
| [**ObCloseHandle**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-obclosehandle){: #ObCloseHandle } | Closes an object handle. *PreviousMode* is `KernelMode` for a kernel handle and `UserMode` for a handle of a user-mode program. See the warning about 32-bit drivers below. |
| [**ObDereferenceObject**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-obdereferenceobject){: #ObDereferenceObject } | `ObfDereferenceObject`: Decrements an object's reference count, and deletes the object when it reaches zero. *Object* is the object's address. |
| [**ObDereferenceObjectDeferDelete**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-obdereferenceobjectdeferdelete){: #ObDereferenceObjectDeferDelete } | Decrements an object's reference count, as **ObDereferenceObject** does, but defers the object's deletion when the count reaches zero, to avoid deadlocks. |
| [**ObDereferenceObjectDeferDeleteWithTag**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-obdereferenceobjectdeferdeletewithtag){: #ObDereferenceObjectDeferDeleteWithTag } | As **ObDereferenceObjectDeferDelete**, and records the four-byte *Tag* for object reference tracing. |
| [**ObDereferenceObjectWithTag**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-obdereferenceobjectwithtag){: #ObDereferenceObjectWithTag } | `ObfDereferenceObjectWithTag`: Decrements an object's reference count, as **ObDereferenceObject** does, and records the four-byte *Tag* for object reference tracing. |
| **ObfDereferenceObject**{: #ObfDereferenceObject } | Decrements an object's reference count and deletes the object when it reaches zero: the routine that **ObDereferenceObject** declares under another name. |
| **ObfDereferenceObjectWithTag**{: #ObfDereferenceObjectWithTag } | Decrements an object's reference count and records *Tag* for object reference tracing: the routine that **ObDereferenceObjectWithTag** declares under another name. |
| [**ObfReferenceObject**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-obfreferenceobject){: #ObfReferenceObject } | Increments an object's reference count: the routine that **ObReferenceObject** declares under another name. |
| **ObfReferenceObjectWithTag**{: #ObfReferenceObjectWithTag } | Increments an object's reference count and records *Tag* for object reference tracing: the routine that **ObReferenceObjectWithTag** declares under another name. |
| **ObGetFilterVersion**{: #ObGetFilterVersion } | Returns the version number of the object manager's callback interface, as for the **Version** field of an **OB_CALLBACK_REGISTRATION**. Not documented by Microsoft. |
| [**ObGetObjectSecurity**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-obgetobjectsecurity){: #ObGetObjectSecurity } | Gets the security descriptor of an object into *SecurityDescriptor* and sets *MemoryAllocated*; release the descriptor with **ObReleaseObjectSecurity**, passing both back. |
| [**ObIsKernelHandle**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-obiskernelhandle){: #ObIsKernelHandle } | Returns nonzero if a handle is a kernel handle. |
| [**ObMakeTemporaryObject**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-obmaketemporaryobject){: #ObMakeTemporaryObject } | Makes an object temporary, so that it is deleted once its last handle is closed. Microsoft reserves it for internal use. |
| [**ObOpenObjectByPointer**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-obopenobjectbypointer){: #ObOpenObjectByPointer } | Opens an object from a pointer to it and writes a handle to the object into *Handle*. |
| [**ObQueryNameString**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-obquerynamestring){: #ObQueryNameString } | Writes the name of an object, if it has one, into *ObjectNameInfo*, a buffer of *Length* bytes that holds an **OBJECT_NAME_INFORMATION** followed by the name's characters, and the size it needs into *ReturnLength*. |
| [**ObReferenceObject**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-obreferenceobject){: #ObReferenceObject } | `ObfReferenceObject`: Increments an object's reference count, so that the object is not deleted while the driver uses it; release it with **ObDereferenceObject**. *Object* is the object's address. |
| [**ObReferenceObjectByHandle**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-obreferenceobjectbyhandle){: #ObReferenceObjectByHandle } | Checks that a handle grants *DesiredAccess* to an object of type *ObjectType*, and writes a referenced pointer to the object into *Object*; release it with **ObDereferenceObject**. *ObjectType* is a value such as **PsProcessType** returns, or 0. |
| [**ObReferenceObjectByHandleWithTag**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-obreferenceobjectbyhandlewithtag){: #ObReferenceObjectByHandleWithTag } | As **ObReferenceObjectByHandle**, and records the four-byte *Tag* for object reference tracing; release the object with **ObDereferenceObjectWithTag**. |
| [**ObReferenceObjectByPointer**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-obreferenceobjectbypointer){: #ObReferenceObjectByPointer } | Increments the reference count of an object, given its address, and fails with `STATUS_OBJECT_TYPE_MISMATCH` when *ObjectType* is not 0 and is not the object's type. |
| [**ObReferenceObjectByPointerWithTag**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-obreferenceobjectbypointerwithtag){: #ObReferenceObjectByPointerWithTag } | As **ObReferenceObjectByPointer**, and records the four-byte *Tag* for object reference tracing. |
| [**ObReferenceObjectSafe**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-obreferenceobjectsafe){: #ObReferenceObjectSafe } | Increments an object's reference count unless the object is being deleted, and returns nonzero if the object can be used, or 0 if it is being deleted. |
| **ObReferenceObjectSafeWithTag**{: #ObReferenceObjectSafeWithTag } | As **ObReferenceObjectSafe**, and records *Tag* for object reference tracing, as its name and declaration show. Not documented by Microsoft. |
| [**ObReferenceObjectWithTag**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-obreferenceobjectwithtag){: #ObReferenceObjectWithTag } | `ObfReferenceObjectWithTag`: Increments an object's reference count, as **ObReferenceObject** does, and records the four-byte *Tag* for object reference tracing. |
| [**ObRegisterCallbacks**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-obregistercallbacks){: #ObRegisterCallbacks } | Registers callback routines for operations on process, thread and desktop handles, and writes a handle to the registration into *RegistrationHandle*. |
| [**ObReleaseObjectSecurity**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-obreleaseobjectsecurity){: #ObReleaseObjectSecurity } | Releases a security descriptor that **ObGetObjectSecurity** returned; pass the *MemoryAllocated* value it set. |
| [**ObUnRegisterCallbacks**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-obunregistercallbacks){: #ObUnRegisterCallbacks } | Removes callback routines that **ObRegisterCallbacks** registered. |
| [**PoCallDriver**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-pocalldriver){: #PoCallDriver } | Passes a power IRP to the next lower driver in the device stack. From Windows Vista on, drivers call **IoCallDriver** instead. |
| [**PoStartNextPowerIrp**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-postartnextpowerirp){: #PoStartNextPowerIrp } | Tells the power manager that the driver is ready for the next power IRP. From Windows Vista on, drivers need not call it. |
| [**ProbeForRead**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-probeforread){: #ProbeForRead } | Checks that a user-mode buffer lies in the user part of the address space and is aligned to *Alignment*, and raises an exception if it does not. |
| [**ProbeForWrite**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-probeforwrite){: #ProbeForWrite } | Checks that a user-mode buffer lies in the user part of the address space, can be written and is aligned to *Alignment*, and raises an exception if it does not. |
| [**PsGetCurrentProcess**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-iogetcurrentprocess){: #PsGetCurrentProcess } | `IoGetCurrentProcess`: Returns the process (an `EPROCESS` pointer) of the current thread. |
| [**PsGetCurrentProcessId**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/nf-ntddk-psgetcurrentprocessid){: #PsGetCurrentProcessId } | Returns the ID of the current thread's process. |
| [**PsGetCurrentThread**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-kegetcurrentthread){: #PsGetCurrentThread } | `KeGetCurrentThread`: Returns the current thread (a `KTHREAD` pointer). |
| [**PsGetCurrentThreadId**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/nf-ntddk-psgetcurrentthreadid){: #PsGetCurrentThreadId } | Returns the ID of the current thread. |
| [**PsGetProcessId**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/nf-ntddk-psgetprocessid){: #PsGetProcessId } | Returns the ID of a process, given as an `EPROCESS` pointer. |
| [**PsGetThreadProcessId**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/nf-ntddk-psgetthreadprocessid){: #PsGetThreadProcessId } | Returns the ID of the process that a thread belongs to. |
| [**PsLookupProcessByProcessId**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-pslookupprocessbyprocessid){: #PsLookupProcessByProcessId } | Writes a referenced `EPROCESS` pointer of the process with an ID into *Process*; release it with **ObDereferenceObject**. |
| [**PsLookupThreadByThreadId**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-pslookupthreadbythreadid){: #PsLookupThreadByThreadId } | Writes a referenced `ETHREAD` pointer of the thread with an ID into *Thread*; release it with **ObDereferenceObject**. |
| [**PsRemoveCreateThreadNotifyRoutine**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/nf-ntddk-psremovecreatethreadnotifyroutine){: #PsRemoveCreateThreadNotifyRoutine } | Removes a callback routine that **PsSetCreateThreadNotifyRoutine** registered. |
| [**PsRemoveLoadImageNotifyRoutine**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/nf-ntddk-psremoveloadimagenotifyroutine){: #PsRemoveLoadImageNotifyRoutine } | Removes a callback routine that **PsSetLoadImageNotifyRoutine** registered. |
| [**PsSetCreateProcessNotifyRoutine**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/nf-ntddk-pssetcreateprocessnotifyroutine){: #PsSetCreateProcessNotifyRoutine } | Registers, or with *Remove* nonzero removes, a callback routine that is called when a process is created or deleted. |
| [**PsSetCreateProcessNotifyRoutineEx**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/nf-ntddk-pssetcreateprocessnotifyroutineex){: #PsSetCreateProcessNotifyRoutineEx } | Registers, or with *Remove* nonzero removes, a callback routine that is called when a process is created or exits, and that can refuse a process's creation. |
| [**PsSetCreateThreadNotifyRoutine**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/nf-ntddk-pssetcreatethreadnotifyroutine){: #PsSetCreateThreadNotifyRoutine } | Registers a callback routine that is called when a thread is created or deleted. |
| [**PsSetCreateThreadNotifyRoutineEx**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/nf-ntddk-pssetcreatethreadnotifyroutineex){: #PsSetCreateThreadNotifyRoutineEx } | Registers a callback routine that is called when a thread is created or deleted; *NotifyType* says which kind of callback *NotifyRoutine* is. |
| [**PsSetLoadImageNotifyRoutine**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/nf-ntddk-pssetloadimagenotifyroutine){: #PsSetLoadImageNotifyRoutine } | Registers a callback routine that is called when an image is loaded or mapped into memory. |
| **RtlAcquirePebLock**{: #RtlAcquirePebLock } | Acquires the lock of the current process's process environment block. Not documented by Microsoft. See the note below. |
| [**RtlAllocateAndInitializeSid**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-rtlallocateandinitializesid){: #RtlAllocateAndInitializeSid } | Allocates a security identifier (SID) with up to eight subauthorities and returns its address in *psid*, to be freed with **RtlFreeSid**. See the note below. |
| [**RtlAllocateHeap**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-rtlallocateheap){: #RtlAllocateHeap } | Allocates *Size* bytes from a heap and returns their address, or 0 when it fails. |
| [**RtlAppendUnicodeStringToString**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlappendunicodestringtostring){: #RtlAppendUnicodeStringToString } | Appends the string of *Source* to the string of *Destination*, within the buffer *Destination* already has. |
| [**RtlAppendUnicodeToString**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlappendunicodetostring){: #RtlAppendUnicodeToString } | Appends a null-terminated UTF-16 string to the string of *Destination*, within the buffer *Destination* already has. *Source* is `As Any`: pass the string's address as `ByVal StrPtr(...)`. |
| [**RtlAreBitsClear**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlarebitsclear){: #RtlAreBitsClear } | Returns nonzero when the *Length* bits of a bitmap from bit *StartingIndex* are all clear. |
| [**RtlAreBitsSet**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlarebitsset){: #RtlAreBitsSet } | Returns nonzero when the *Length* bits of a bitmap from bit *StartingIndex* are all set. |
| [**RtlCheckBit**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlcheckbit){: #RtlCheckBit } | Returns nonzero when bit *BitPosition* of a bitmap is set. See the note below. |
| [**RtlClearAllBits**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlclearallbits){: #RtlClearAllBits } | Clears every bit of a bitmap. |
| **RtlClearAllBitsEx**{: #RtlClearAllBitsEx } | As **RtlClearAllBits**, for an **RTL_BITMAP_EX**. Not documented by Microsoft. |
| [**RtlClearBit**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlclearbit){: #RtlClearBit } | Clears bit *BitNumber* of a bitmap. |
| **RtlClearBitEx**{: #RtlClearBitEx } | As **RtlClearBit**, for an **RTL_BITMAP_EX**. Not documented by Microsoft. |
| [**RtlClearBits**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlclearbits){: #RtlClearBits } | Clears *NumberToClear* bits of a bitmap, from bit *StartingIndex*. |
| [**RtlCompareUnicodeString**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlcompareunicodestring){: #RtlCompareUnicodeString } | Compares two strings, with or without case, and returns a value less than, equal to or greater than zero. |
| **RtlCompareUnicodeStrings**{: #RtlCompareUnicodeStrings } | Compares two UTF-16 strings given by their addresses, with or without case, and returns a value less than, equal to or greater than zero. See the warning below. |
| **RtlCopyBitMap**{: #RtlCopyBitMap } | Copies the bits of the bitmap *Source* into the bitmap *Destination*, at bit *TargetBit*. Not documented by Microsoft. |
| [**RtlCopyUnicodeString**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlcopyunicodestring){: #RtlCopyUnicodeString } | Copies the string of *SourceString* into the buffer of *DestinationString*, as much of it as the buffer holds. |
| [**RtlCreateHeap**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-rtlcreateheap){: #RtlCreateHeap } | Creates a heap for **RtlAllocateHeap** to allocate from, and returns its handle, or 0 when it fails. |
| [**RtlCreateSecurityDescriptor**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlcreatesecuritydescriptor){: #RtlCreateSecurityDescriptor } | Initializes an absolute security descriptor with no owner, group or access control lists; *Revision* is `SECURITY_DESCRIPTOR_REVISION`. |
| **RtlCreateServiceSid**{: #RtlCreateServiceSid } | Writes the SID of the service named *ServiceName* to the buffer at *ServiceSid*, whose size in bytes *ServiceSidLength* gives and receives. See the note below. |
| **RtlDefaultNpAcl**{: #RtlDefaultNpAcl } | Creates the default access control list (ACL) of a named pipe and returns its address in *Acl*. Not documented by Microsoft. See the note below. |
| **RtlDeriveCapabilitySidsFromName**{: #RtlDeriveCapabilitySidsFromName } | Derives the capability group SID and the capability SID of a capability's name, into the buffers at *CapabilityGroupSid* and *CapabilitySid*. Not documented by Microsoft. |
| [**RtlDestroyHeap**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-rtldestroyheap){: #RtlDestroyHeap } | Destroys a heap that **RtlCreateHeap** created, and returns 0 when it succeeds. |
| **RtlDuplicateUnicodeString**{: #RtlDuplicateUnicodeString } | Copies the string of *StringIn* into a new buffer, which *StringOut* then points at and which **RtlFreeUnicodeString** frees; *Flags* says whether the copy is null-terminated. See the note below. |
| [**RtlEqualPrefixSid**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-rtlequalprefixsid){: #RtlEqualPrefixSid } | Returns nonzero when two SIDs are equal in all but their last subauthority. See the note below. |
| [**RtlEqualSid**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-rtlequalsid){: #RtlEqualSid } | Returns nonzero when the SIDs at the addresses *Sid1* and *Sid2* are equal. |
| [**RtlEqualUnicodeString**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlequalunicodestring){: #RtlEqualUnicodeString } | Returns nonzero when two strings are equal, ignoring case when *CaseInSensitive* is nonzero. |
| **RtlExtractBitMap**{: #RtlExtractBitMap } | Copies *NumberOfBits* bits of the bitmap *Source*, from bit *TargetBit*, into the bitmap *Destination*. Not documented by Microsoft. |
| [**RtlFindClearBits**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlfindclearbits){: #RtlFindClearBits } | Returns the first bit of a run of *NumberToFind* clear bits in a bitmap, searching from bit *HintIndex*, or `&HFFFFFFFF` when there is none. |
| [**RtlFindClearBitsAndSet**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlfindclearbitsandset){: #RtlFindClearBitsAndSet } | As **RtlFindClearBits**, and sets the bits it finds. |
| [**RtlFindClearRuns**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlfindclearruns){: #RtlFindClearRuns } | Fills the array of **RTL_BITMAP_RUN** that starts at *RunArray* with up to *SizeOfRunArray* runs of clear bits of a bitmap, the longest ones when *LocateLongestRuns* is nonzero, and returns how many it found. |
| **RtlFindExportedRoutineByName**{: #RtlFindExportedRoutineByName } | Returns the address of a routine that a loaded image exports, from the image's base address and the address of the routine's name as an ANSI string, or 0 when the image has none of that name. Not documented by Microsoft. |
| [**RtlFindFirstRunClear**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlfindfirstrunclear){: #RtlFindFirstRunClear } | Returns the number of bits in the first run of clear bits of a bitmap. See the warning below. |
| [**RtlFindLastBackwardRunClear**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlfindlastbackwardrunclear){: #RtlFindLastBackwardRunClear } | Returns the number of bits in the run of clear bits of a bitmap that precedes bit *FromIndex*, and its first bit in *StartingRunIndex*. |
| [**RtlFindLeastSignificantBit**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlfindleastsignificantbit){: #RtlFindLeastSignificantBit } | Returns the zero-based position of the lowest set bit of *Set*, or 255 (`-1`) when *Set* is 0. |
| [**RtlFindLongestRunClear**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlfindlongestrunclear){: #RtlFindLongestRunClear } | Returns the number of bits in the longest run of clear bits of a bitmap. See the warning below. |
| [**RtlFindMostSignificantBit**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlfindmostsignificantbit){: #RtlFindMostSignificantBit } | Returns the zero-based position of the highest set bit of *Set*, or 255 (`-1`) when *Set* is 0. |
| [**RtlFindNextForwardRunClear**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlfindnextforwardrunclear){: #RtlFindNextForwardRunClear } | Returns the number of bits in the next run of clear bits of a bitmap from bit *FromIndex*, and its first bit in *StartingRunIndex*. |
| [**RtlFindSetBits**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlfindsetbits){: #RtlFindSetBits } | Returns the first bit of a run of *NumberToFind* set bits in a bitmap, searching from bit *HintIndex*, or `&HFFFFFFFF` when there is none. |
| [**RtlFindSetBitsAndClear**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlfindsetbitsandclear){: #RtlFindSetBitsAndClear } | As **RtlFindSetBits**, and clears the bits it finds. |
| **RtlFindSetBitsAndClearEx**{: #RtlFindSetBitsAndClearEx } | As **RtlFindSetBitsAndClear**, for an **RTL_BITMAP_EX**. Not documented by Microsoft. |
| **RtlFindSetBitsEx**{: #RtlFindSetBitsEx } | As **RtlFindSetBits**, for an **RTL_BITMAP_EX**. Not documented by Microsoft. |
| [**RtlFreeHeap**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-rtlfreeheap){: #RtlFreeHeap } | Frees a block that **RtlAllocateHeap** allocated, and returns nonzero when it succeeds. |
| [**RtlFreeSid**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-rtlfreesid){: #RtlFreeSid } | Frees a SID that **RtlAllocateAndInitializeSid** allocated. See the note below. |
| [**RtlFreeUnicodeString**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlfreeunicodestring){: #RtlFreeUnicodeString } | Frees the buffer of a string that a routine allocated, such as **RtlUpcaseUnicodeString** with *AllocateDestinationString* nonzero. |
| **RtlGetControlSecurityDescriptor**{: #RtlGetControlSecurityDescriptor } | Returns the control flags and the revision of a security descriptor in *Control* and *Revision*. |
| **RtlGetCurrentPeb**{: #RtlGetCurrentPeb } | Returns the address of the process environment block (PEB) of the current process. Not documented by Microsoft. See the note below. |
| [**RtlGetDaclSecurityDescriptor**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-rtlgetdaclsecuritydescriptor){: #RtlGetDaclSecurityDescriptor } | Returns in *DaclPresent* whether a security descriptor has a discretionary access control list (DACL), and in *Dacl* and *DaclDefaulted* its address and whether it was defaulted. |
| [**RtlGetSaclSecurityDescriptor**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-rtlgetsaclsecuritydescriptor){: #RtlGetSaclSecurityDescriptor } | As **RtlGetDaclSecurityDescriptor**, for the system access control list (SACL). |
| [**RtlGetVersion**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlgetversion){: #RtlGetVersion } | Returns the version of the running Windows. *lpVersionInformation* is `As Any`: pass an **RTL_OSVERSIONINFOW** or **RTL_OSVERSIONINFOEXW** whose **dwOSVersionInfoSize** is set to its size. |
| [**RtlGUIDFromString**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlguidfromstring){: #RtlGUIDFromString } | Converts a GUID in its text form, `{xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}`, into a **UUID**. |
| **RtlImageDirectoryEntryToData**{: #RtlImageDirectoryEntryToData } | Returns the address of a data directory of the image at *BaseAddress*, such as its export directory, and its size in *size*; *Directory* is an **ImageDirectories** value. Not documented by Microsoft. |
| **RtlImageNtHeader**{: #RtlImageNtHeader } | Returns the address of the NT headers of the image loaded at *ModuleBase*. Not documented by Microsoft. |
| [**RtlInitializeBitMap**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlinitializebitmap){: #RtlInitializeBitMap } | Initializes the header of a bitmap of *SizeOfBitmap* bits, which then points at the buffer and does not copy it. *BitmapBuffer* is `As Any`: pass the first element of a **Long** array, or an address as `ByVal`. |
| **RtlInitializeBitMapEx**{: #RtlInitializeBitMapEx } | As **RtlInitializeBitMap**, for an **RTL_BITMAP_EX**, whose size and bit numbers are **LongLong**. Not documented by Microsoft. |
| [**RtlInitializeSid**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-rtlinitializesid){: #RtlInitializeSid } | Initializes the SID at the address *Sid* with an identifier authority and a number of subauthorities, whose values it does not set. |
| [**RtlInitializeSidEx**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-rtlinitializesidex){: #RtlInitializeSidEx } | As **RtlInitializeSid**, with the values of the subauthorities passed after *SubAuthorityCount*. |
| [**RtlInitUnicodeString**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlinitunicodestring){: #RtlInitUnicodeString } | Sets a **UNICODE_STRING** to the null-terminated UTF-16 string at the address *SourceString*, which the structure then points at and which is not copied. |
| **RtlInterlockedClearBitRun**{: #RtlInterlockedClearBitRun } | As **RtlClearBits**, with interlocked operations. Not documented by Microsoft. |
| **RtlInterlockedSetBitRun**{: #RtlInterlockedSetBitRun } | As **RtlSetBits**, with interlocked operations. Not documented by Microsoft. |
| **RtlIsElevatedRid**{: #RtlIsElevatedRid } | Returns whether the SID in *SidAttr* has an elevated relative identifier (RID), as its name says. Not documented by Microsoft. |
| [**RtlIsNameLegalDOS8Dot3**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-rtlisnamelegaldos8dot3){: #RtlIsNameLegalDOS8Dot3 } | Returns nonzero when a file name is a valid short (8.3) name, and in *NameContainsSpaces* whether it contains spaces; *OemName* is a buffer for the name's OEM form. |
| [**RtlLengthSecurityDescriptor**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtllengthsecuritydescriptor){: #RtlLengthSecurityDescriptor } | Returns the size in bytes of a security descriptor, with the structures it points to. |
| [**RtlLocalTimeToSystemTime**](https://learn.microsoft.com/en-us/windows/win32/api/winternl/nf-winternl-rtllocaltimetosystemtime){: #RtlLocalTimeToSystemTime } | Converts a local time into system time (UTC), both in 100-nanosecond units since 1 January 1601. |
| [**RtlNtStatusToDosError**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-rtlntstatustodoserror){: #RtlNtStatusToDosError } | Returns the Windows system error code that matches an **NTSTATUS** code. |
| [**RtlNumberOfClearBits**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlnumberofclearbits){: #RtlNumberOfClearBits } | Returns the number of clear bits in a bitmap. |
| **RtlNumberOfClearBitsInRange**{: #RtlNumberOfClearBitsInRange } | Returns the number of clear bits among the *Length* bits of a bitmap from bit *StartingIndex*. |
| [**RtlNumberOfSetBits**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlnumberofsetbits){: #RtlNumberOfSetBits } | Returns the number of set bits in a bitmap. |
| **RtlNumberOfSetBitsInRange**{: #RtlNumberOfSetBitsInRange } | Returns the number of set bits among the *Length* bits of a bitmap from bit *StartingIndex*. |
| [**RtlNumberOfSetBitsUlongPtr**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlnumberofsetbitsulongptr){: #RtlNumberOfSetBitsUlongPtr } | Returns the number of set bits in *Target*. |
| [**RtlQueryRegistryValues**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlqueryregistryvalues){: #RtlQueryRegistryValues } | Reads several values of one registry key in a single call, as an array of **RTL_QUERY_REGISTRY_TABLE** describes them. *RelativeTo* is an `RTL_REGISTRY_` constant and *Path* the address of a null-terminated UTF-16 string. |
| **RtlReleasePebLock**{: #RtlReleasePebLock } | Releases the lock that **RtlAcquirePebLock** acquired. Not documented by Microsoft. See the note below. |
| [**RtlSetAllBits**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlsetallbits){: #RtlSetAllBits } | Sets every bit of a bitmap. |
| [**RtlSetBit**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlsetbit){: #RtlSetBit } | Sets bit *BitNumber* of a bitmap. |
| **RtlSetBitEx**{: #RtlSetBitEx } | As **RtlSetBit**, for an **RTL_BITMAP_EX**. Not documented by Microsoft. |
| [**RtlSetBits**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlsetbits){: #RtlSetBits } | Sets *NumberToSet* bits of a bitmap, from bit *StartingIndex*. |
| [**RtlSetControlSecurityDescriptor**](https://learn.microsoft.com/en-us/windows/win32/devnotes/rtlsetcontrolsecuritydescriptor){: #RtlSetControlSecurityDescriptor } | Sets the control flags *ControlBitsOfInterest* of a security descriptor to their values in *ControlBitsToSet*. |
| [**RtlSetDaclSecurityDescriptor**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlsetdaclsecuritydescriptor){: #RtlSetDaclSecurityDescriptor } | Sets the discretionary access control list (DACL) of an absolute security descriptor and its flags; *Dacl* is the ACL's address, or 0 for a null DACL. |
| [**RtlSetSaclSecurityDescriptor**](https://learn.microsoft.com/en-us/windows/win32/devnotes/rtlsetsaclsecuritydescriptor){: #RtlSetSaclSecurityDescriptor } | As **RtlSetDaclSecurityDescriptor**, for the system access control list (SACL). |
| **RtlSidHashInitialize**{: #RtlSidHashInitialize } | Fills a **SID_AND_ATTRIBUTES_HASH** for lookups in the array of *SidCount* **SID_AND_ATTRIBUTES** that starts at *SidAttr*. Not documented by Microsoft. |
| **RtlSidHashLookup**{: #RtlSidHashLookup } | Returns the address of the **SID_AND_ATTRIBUTES** of the SID at *Sid* in a hash that **RtlSidHashInitialize** filled. Not documented by Microsoft. |
| [**RtlTestBit**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtltestbit){: #RtlTestBit } | Returns nonzero when bit *BitNumber* of a bitmap is set. |
| **RtlTestBitEx**{: #RtlTestBitEx } | As **RtlTestBit**, for an **RTL_BITMAP_EX**. Not documented by Microsoft. |
| [**RtlUniform**](https://learn.microsoft.com/en-us/windows/win32/api/winternl/nf-winternl-rtluniform){: #RtlUniform } | Returns a uniformly distributed random number, made from *Seed* by D. H. Lehmer's method, and updates *Seed*. See the note below. |
| [**RtlUpcaseUnicodeString**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/nf-ntddk-rtlupcaseunicodestring){: #RtlUpcaseUnicodeString } | Writes an uppercase copy of *SourceString* into *DestinationString*, allocating its buffer when *AllocateDestinationString* is nonzero, to be freed with **RtlFreeUnicodeString**. |
| [**RtlValidRelativeSecurityDescriptor**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlvalidrelativesecuritydescriptor){: #RtlValidRelativeSecurityDescriptor } | Returns nonzero when a self-relative security descriptor of *SecurityDescriptorLength* bytes is valid and holds the parts that *RequiredInformation* names. |
| [**RtlValidSecurityDescriptor**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlvalidsecuritydescriptor){: #RtlValidSecurityDescriptor } | Returns nonzero when a security descriptor is valid. |
| [**RtlValidSid**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-rtlvalidsid){: #RtlValidSid } | Returns nonzero when the SID at the address *Sid* is valid. |
| [**SeAccessCheck**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-seaccesscheck){: #SeAccessCheck } | Returns nonzero when the access *DesiredAccess* to an object with the security descriptor *SecurityDescriptor* can be granted to the subject of *SubjectContext*, and the access granted in *GrantedAccess*. |
| [**SeAssignSecurity**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-seassignsecurity){: #SeAssignSecurity } | Builds the security descriptor of a new object from those of its parent and of the caller, and returns its address in *NewDescriptor*. |
| [**SeAssignSecurityEx**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-seassignsecurityex){: #SeAssignSecurityEx } | As **SeAssignSecurity**, with the object's type *ObjectType* and the auto-inheritance flags *AutoInheritFlags*. |
| **SeComputeAutoInheritByObjectType**{: #SeComputeAutoInheritByObjectType } | Returns the auto-inheritance flags, such as `SEF_DACL_AUTO_INHERIT`, for a new object of the type at *ObjectType*, from its security descriptor and its parent's. |
| [**SeEtwWriteKMCveEvent**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-seetwwritekmcveevent){: #SeEtwWriteKMCveEvent } | Logs an event that reports an attempt to exploit a known vulnerability, named by its CVE identifier. |
| [**SeLocateProcessImageName**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-selocateprocessimagename){: #SeLocateProcessImageName } | Returns the full path of a process's image file, from a pointer to the process's `EPROCESS`. See the warning below. |
| [**SeLockSubjectContext**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-selocksubjectcontext){: #SeLockSubjectContext } | Locks the tokens of a subject context, for **SeAccessCheck** with *SubjectContextLocked* nonzero. |
| [**SeQueryInformationToken**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-sequeryinformationtoken){: #SeQueryInformationToken } | Returns information about an access token, in the form *TokenInformationClass* names, in a buffer that the routine allocates and the caller frees. *TokenInformation* is `As Any`: pass a **LongPtr** variable, which receives the buffer's address. |
| [**SeUnlockSubjectContext**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-seunlocksubjectcontext){: #SeUnlockSubjectContext } | Unlocks the tokens that **SeLockSubjectContext** locked. |
| **towlower**{: #towlower } | Returns the lowercase form of a UTF-16 character. |
| **towupper**{: #towupper } | Returns the uppercase form of a UTF-16 character. |
| **wcscat**{: #wcscat } | Appends the null-terminated UTF-16 string at *src* to the one at *dest*, whose buffer must have room for both, and returns *dest*. |
| **wcscat_s**{: #wcscat_s } | As **wcscat**, with *_SizeInWords* the size of the buffer at *_Dst* in characters; returns 0, or an error code when the strings do not fit. |
| **wcschr**{: #wcschr } | Returns the address of the first character *Ch* in the null-terminated UTF-16 string at *str*, or 0 when it has none. |
| **wcscmp**{: #wcscmp } | Compares the null-terminated UTF-16 strings at *lhs* and *rhs*, and returns a value less than, equal to or greater than zero. |
| **wcscpy**{: #wcscpy } | Copies the null-terminated UTF-16 string at *src* to the buffer at *dest*, and returns *dest*. |
| **wcslen**{: #wcslen } | Returns the number of characters of the null-terminated UTF-16 string at *_String*, without its null. |
| **wcsnlen**{: #wcsnlen } | As **wcslen**, counting no more than *_MaxCount* characters. |
| **wcsstr**{: #wcsstr } | Returns the address of the first occurrence of the null-terminated UTF-16 string at *src* in the one at *dest*, or 0 when it does not occur. |
| [**ZeroMemory**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-rtlzeromemory){: #ZeroMemory } | `RtlZeroMemory`: fills *Length* bytes with zeros. *Destination* is `As Any`: pass a variable, or an address as `ByVal`. |
| [**ZwClose**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwclose){: #ZwClose } | Closes a handle to an object of any type. |
| **ZwCommitRegistryTransaction**{: #ZwCommitRegistryTransaction } | Commits the changes of a registry transaction. |
| **ZwCompactKeys**{: #ZwCompactKeys } | Compacts *Count* registry keys, whose handles are an array that starts at *KeyArray*. Not documented by Microsoft. See the note below. |
| **ZwCompressKey**{: #ZwCompressKey } | Compresses a registry key, by its handle. Not documented by Microsoft. See the note below. |
| [**ZwCreateDirectoryObject**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwcreatedirectoryobject){: #ZwCreateDirectoryObject } | Creates an object directory or opens an existing one, and returns its handle in *DirectoryHandle*. |
| [**ZwCreateFile**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwcreatefile){: #ZwCreateFile } | Creates a file or opens an existing one, and returns its handle in *FileHandle*. |
| [**ZwCreateKey**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwcreatekey){: #ZwCreateKey } | Creates a registry key or opens an existing one, and returns its handle in *KeyHandle* and in *Disposition* whether it was created or opened. |
| [**ZwCreateKeyTransacted**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwcreatekeytransacted){: #ZwCreateKeyTransacted } | As **ZwCreateKey**, as part of the transaction *TransactionHandle*. |
| **ZwCreateRegistryTransaction**{: #ZwCreateRegistryTransaction } | Creates a registry transaction and returns its handle in *RegistryTransactionHandle*. |
| [**ZwCreateSection**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwcreatesection){: #ZwCreateSection } | Creates a section object and returns its handle in *SectionHandle*; the section is backed by the file *FileHandle*, or by the paging file when it is 0. |
| **ZwCreateUserProcess**{: #ZwCreateUserProcess } | Creates a user-mode process and its first thread, and returns their handles in *ProcessHandle* and *ThreadHandle*. *ProcessParameters* is `As Any`: pass a structure, or an address as `ByVal`. Not documented by Microsoft. See the note below. |
| [**ZwDeleteFile**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-zwdeletefile){: #ZwDeleteFile } | Deletes the file that *ObjectAttributes* names. |
| [**ZwDeleteKey**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwdeletekey){: #ZwDeleteKey } | Deletes an open registry key. |
| [**ZwDeleteValueKey**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwdeletevaluekey){: #ZwDeleteValueKey } | Deletes a value of an open registry key, by its name. |
| [**ZwDuplicateObject**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-zwduplicateobject){: #ZwDuplicateObject } | Makes a duplicate of a handle. See the warning below. |
| [**ZwEnumerateKey**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwenumeratekey){: #ZwEnumerateKey } | Returns information about a subkey of an open registry key, by its index, in the form *KeyInformationClass* names. |
| [**ZwEnumerateValueKey**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwenumeratevaluekey){: #ZwEnumerateValueKey } | Returns information about a value of an open registry key, by its index, in the form *KeyValueInformationClass* names, such as **KEY_VALUE_FULL_INFORMATION**. |
| [**ZwFlushKey**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwflushkey){: #ZwFlushKey } | Writes the changes of an open registry key to disk. |
| **ZwFreezeRegistry**{: #ZwFreezeRegistry } | Freezes the registry, for no more than *TimeOutInSeconds*. Not documented by Microsoft. See the note below. |
| [**ZwFsControlFile**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-zwfscontrolfile){: #ZwFsControlFile } | Sends the file-system control code *FsControlCode* to the file system or the filter of an open file. *InputBuffer* and *OutputBuffer* are `As Any`: pass a variable, or an address as `ByVal` (`ByVal 0` for none). |
| **ZwInitializeRegistry**{: #ZwInitializeRegistry } | Initializes the registry, with a boot condition. Not documented by Microsoft. See the note below. |
| **ZwLoadKey**{: #ZwLoadKey } | Loads the registry hive of the file *SourceFile* names under the key *TargetKey* names. Not documented by Microsoft. |
| **ZwLoadKey2**{: #ZwLoadKey2 } | As **ZwLoadKey**, with *Flags*. Not documented by Microsoft. See the note below. |
| **ZwLoadKey3**{: #ZwLoadKey3 } | As **ZwLoadKeyEx**, with an array of **CM_EXTENDED_PARAMETER** in place of the trust class key and the event. Not documented by Microsoft. See the note below. |
| **ZwLoadKeyEx**{: #ZwLoadKeyEx } | As **ZwLoadKey2**, with a trust class key, an event, an access mask, and a handle to the loaded key returned in *RootHandle*. Not documented by Microsoft. |
| [**ZwLockFile**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-zwlockfile){: #ZwLockFile } | Locks the *Length* bytes of an open file from *ByteOffset*, exclusively when *ExclusiveLock* is nonzero. |
| **ZwLockProductActivationKeys**{: #ZwLockProductActivationKeys } | Locks the product activation keys of the registry; *pPrivateVer* and *pSafeMode* receive a value each. Not documented by Microsoft. |
| **ZwLockRegistryKey**{: #ZwLockRegistryKey } | Locks a registry key, by its handle. Not documented by Microsoft. See the note below. |
| [**ZwMapViewOfSection**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwmapviewofsection){: #ZwMapViewOfSection } | Maps a view of a section into the address space of a process, and returns its address in *BaseAddress* and its size in *ViewSize*. See the warning below. |
| [**ZwNotifyChangeKey**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-zwnotifychangekey){: #ZwNotifyChangeKey } | Asks to be told when an open registry key changes, by an event, an APC or *IoStatusBlock*; *CompletionFilter* names the changes, and *WatchTree* nonzero includes the subkeys. |
| **ZwNotifyChangeMultipleKeys**{: #ZwNotifyChangeMultipleKeys } | As **ZwNotifyChangeKey**, for *MasterKeyHandle* and the *Count* keys that *SubordinateObjects* names. Not documented by Microsoft. See the note below. |
| [**ZwOpenDirectoryObject**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-zwopendirectoryobject){: #ZwOpenDirectoryObject } | Opens an object directory and returns its handle in *DirectoryHandle*. |
| [**ZwOpenKey**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwopenkey){: #ZwOpenKey } | Opens an existing registry key and returns its handle in *KeyHandle*. |
| [**ZwOpenKeyEx**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwopenkeyex){: #ZwOpenKeyEx } | As **ZwOpenKey**, with *OpenOptions*. |
| [**ZwOpenKeyTransacted**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwopenkeytransacted){: #ZwOpenKeyTransacted } | As **ZwOpenKey**, as part of the transaction *TransactionHandle*. |
| [**ZwOpenKeyTransactedEx**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwopenkeytransactedex){: #ZwOpenKeyTransactedEx } | As **ZwOpenKeyEx**, as part of the transaction *TransactionHandle*. |
| [**ZwOpenProcess**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/nf-ntddk-zwopenprocess){: #ZwOpenProcess } | Opens a process, which *ClientID* names, with the access asked, and returns its handle in *ProcessHandle*. |
| **ZwOpenRegistryTransaction**{: #ZwOpenRegistryTransaction } | Opens an existing registry transaction and returns its handle in *RegistryTransactionHandle*. |
| [**ZwOpenSection**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwopensection){: #ZwOpenSection } | Opens a section object and returns its handle in *SectionHandle*. |
| [**ZwOpenSymbolicLinkObject**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwopensymboliclinkobject){: #ZwOpenSymbolicLinkObject } | Opens an existing symbolic link and returns its handle in *LinkHandle*. |
| [**ZwQueryDirectoryFile**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-zwquerydirectoryfile){: #ZwQueryDirectoryFile } | Returns information about the entries of an open directory in *FileInformation*, in the form *FileInformationClass* names. *FileName* is `As Any`: pass the address of a **UNICODE_STRING** as `ByVal` to match names against it, or `ByVal 0`. |
| [**ZwQueryDirectoryFileEx**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-zwquerydirectoryfileex){: #ZwQueryDirectoryFileEx } | As **ZwQueryDirectoryFile**, with *QueryFlags* in place of *ReturnSingleEntry* and *RestartScan*. |
| **ZwQueryDirectoryObject**{: #ZwQueryDirectoryObject } | Returns information about the objects of an object directory in *Buffer*, one or several per call, with *Context* keeping the position between calls. |
| [**ZwQueryKey**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwquerykey){: #ZwQueryKey } | Returns information about an open registry key, in the form *KeyInformationClass* names. |
| **ZwQueryMultipleValueKey**{: #ZwQueryMultipleValueKey } | Returns several values of an open registry key in one call: *ValueEntries* is an array of *EntryCount* **KEY_VALUE_ENTRY**, and the data goes into *ValueBuffer*. Not documented by Microsoft. See the note below. |
| **ZwQueryOpenSubKeys**{: #ZwQueryOpenSubKeys } | Returns in *HandleCount* the number of open handles to the key *TargetKey* names and its subkeys. Not documented by Microsoft. See the note below. |
| **ZwQueryOpenSubKeysEx**{: #ZwQueryOpenSubKeysEx } | As **ZwQueryOpenSubKeys**, returning information about the open keys in *Buffer*, or the size it needs in *RequiredSize*. Not documented by Microsoft. See the note below. |
| [**ZwQuerySymbolicLinkObject**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwquerysymboliclinkobject){: #ZwQuerySymbolicLinkObject } | Returns the target of a symbolic link in *LinkTarget*. |
| [**ZwQueryValueKey**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwqueryvaluekey){: #ZwQueryValueKey } | Returns a value of an open registry key, by its name, in the form *KeyValueInformationClass* names, such as **KEY_VALUE_PARTIAL_INFORMATION**. |
| [**ZwReadFile**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwreadfile){: #ZwReadFile } | Reads *Length* bytes from an open file, at *ByteOffset*, into *Buffer*. |
| **ZwRenameKey**{: #ZwRenameKey } | Changes the name of an open registry key. |
| **ZwReplaceKey**{: #ZwReplaceKey } | Replaces the file of the registry key *TargetHandle* with the one *NewFile* names, keeping the old file under the name *OldFile* gives. Not documented by Microsoft. |
| **ZwRestoreKey**{: #ZwRestoreKey } | Reads registry information from the file *FileHandle* into an open key and its subkeys. |
| **ZwResumeProcess**{: #ZwResumeProcess } | Resumes a suspended process, by its handle. Not documented by Microsoft. See the note below. |
| **ZwRollbackRegistryTransaction**{: #ZwRollbackRegistryTransaction } | Discards the changes of a registry transaction. |
| **ZwSaveKey**{: #ZwSaveKey } | Saves an open registry key and its subkeys to the file *FileHandle*. |
| **ZwSaveKeyEx**{: #ZwSaveKeyEx } | As **ZwSaveKey**, in the file format *Format* names. |
| **ZwSaveMergedKeys**{: #ZwSaveMergedKeys } | Saves two registry keys merged to the file *FileHandle*, the first key's values taking precedence. Not documented by Microsoft. See the note below. |
| **ZwSetInformationKey**{: #ZwSetInformationKey } | Sets information of an open registry key, of the class *KeySetInformationClass* names. |
| [**ZwSetValueKey**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwsetvaluekey){: #ZwSetValueKey } | Creates or replaces a value of an open registry key. *Data* is `As Any`: pass a variable, or an address as `ByVal`, such as `ByVal StrPtr(...)` for a string. |
| **ZwSuspendProcess**{: #ZwSuspendProcess } | Suspends a process, by its handle. Not documented by Microsoft. See the note below. |
| **ZwThawRegistry**{: #ZwThawRegistry } | Ends a freeze of the registry that **ZwFreezeRegistry** began. Not documented by Microsoft. See the note below. |
| **ZwUnloadKey**{: #ZwUnloadKey } | Unloads the registry hive loaded under the key *TargetKey* names. Not documented by Microsoft. |
| **ZwUnloadKey2**{: #ZwUnloadKey2 } | As **ZwUnloadKey**, with *Flags*. Not documented by Microsoft. |
| **ZwUnloadKeyEx**{: #ZwUnloadKeyEx } | As **ZwUnloadKey**, with an event in *Event*. Not documented by Microsoft. |
| [**ZwUnlockFile**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-zwunlockfile){: #ZwUnlockFile } | Unlocks a range of bytes that **ZwLockFile** locked. |
| [**ZwUnmapViewOfSection**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwunmapviewofsection){: #ZwUnmapViewOfSection } | Unmaps a view that **ZwMapViewOfSection** mapped from the address space of a process. |
| [**ZwWriteFile**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwwritefile){: #ZwWriteFile } | Writes *Length* bytes from *Buffer* to an open file, at *ByteOffset*. |

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

<!-- test: WDMExportTests.Declares_NameExportsOfTheKernel, WDMExportTests.ZwCreateUserProcess_IsTheKernelsUnnamedOrdinal2, KernelHelperTests.RtlDuplicateUnicodeString_CallsTheKernel, probe ordinal -->
> [!NOTE] 0.3.0.5
> The 64-bit kernel of Windows 10 version 22H2 does not export these routines: **KeQuerySystemTime**, **RtlAcquirePebLock**, **RtlAllocateAndInitializeSid**, **RtlCheckBit**, **RtlCreateServiceSid**, **RtlDefaultNpAcl**, **RtlEqualPrefixSid**, **RtlFreeSid**, **RtlGetCurrentPeb**, **RtlReleasePebLock**, **RtlUniform**, **ZwCompactKeys**, **ZwCompressKey**, **ZwFreezeRegistry**, **ZwInitializeRegistry**, **ZwLoadKey2**, **ZwLoadKey3**, **ZwLockRegistryKey**, **ZwNotifyChangeMultipleKeys**, **ZwQueryMultipleValueKey**, **ZwQueryOpenSubKeys**, **ZwQueryOpenSubKeysEx**, **ZwResumeProcess**, **ZwSaveMergedKeys**, **ZwSuspendProcess** and **ZwThawRegistry**. **RtlDuplicateUnicodeString**, which the kernel exports, is declared in the user-mode `ntdll`, which the kernel does not load for a driver. A driver imports only the routines that it calls, so a driver that calls none of them is not affected; one that calls any of them does not load.
>
> The same kernel exports **ZwCreateUserProcess** with no name, as ordinal 2, so the package's declaration, which imports it by name, does not load either. A driver that declares it with `Alias "#2"` imports it by ordinal. **ExFreePool2** is exported from Windows 11 and Windows Server 2022 on, as [its page](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-exfreepool2) says: a driver that calls it does not load on Windows 10.

<!-- test: KernelHelperTests.IoCallDriver_PassesTheDeviceAndTheIrp, KernelHelperTests.ExAcquireFastMutex_PassesTheMutex, KernelHelperTests.ExReleaseFastMutex_PassesTheMutex, KernelHelperTests.ExTryToAcquireFastMutex_PassesTheMutex, KernelHelperTests.InterlockedPopEntrySList_PassesTheListHead, KernelHelperTests.ExReleaseResourceAndLeaveCriticalRegion_PassesTheResource, KernelHelperTests.ObCloseHandle_PassesTheHandle -->
> [!WARNING] 0.3.0.5
> In a 32-bit driver, these routines take their arguments in registers, as `__fastcall` routines, but the package declares them without `FastCall` and calls them as `__stdcall` routines, which push the arguments on the stack:
>
> - **ExAcquireFastMutex**, **ExReleaseFastMutex** and **ExTryToAcquireFastMutex**
> - **ExReleaseResourceAndLeaveCriticalRegion**
> - **InterlockedPopEntrySList**
> - **IofCallDriver**, which [**IoCallDriver**](#IoCallDriver) calls
>
> Each routine receives other values than its arguments, and the call leaves the stack 4 bytes off, 8 for **IofCallDriver**. **ObCloseHandle** is the other way round: the package declares it `FastCall`, but the kernel's routine is `__stdcall` and reads its arguments from the stack, so it receives other values than its arguments, and the call leaves the stack 8 bytes off. A 64-bit driver is not affected. The 32-bit [**InterlockedIncrement**](#InterlockedIncrement) has a warning of its own.

## Types

<!-- test: WDMLayoutTests.ACCESS_STATE_Layout, WDMLayoutTests.ANSI_STRING_Layout, WDMLayoutTests.CLIENT_ID_Layout, WDMLayoutTests.DISPATCHER_HEADER_Layout, WDMLayoutTests.DRIVER_EXTENSION_Layout, WDMLayoutTests.DRIVER_OBJECT_Layout, WDMLayoutTests.ERESOURCE_Layout, WDMLayoutTests.EVENT_DATA_DESCRIPTOR_Layout, WDMLayoutTests.EVENT_DESCRIPTOR_Layout, WDMLayoutTests.FAST_MUTEX_Layout, WDMLayoutTests.FILE_OBJECT_Layout, WDMLayoutTests.GENERAL_LOOKASIDE_LAYOUT_Layout, WDMLayoutTests.INITIAL_PRIVILEGE_SET_Layout, WDMLayoutTests.IO_COMPLETION_CONTEXT_Layout, WDMLayoutTests.IO_REMOVE_LOCK_Layout, WDMLayoutTests.IO_REMOVE_LOCK_COMMON_BLOCK_Layout, WDMLayoutTests.IO_SECURITY_CONTEXT_Layout, WDMLayoutTests.IO_STACK_LOCATION_Layout, WDMLayoutTests.IO_STATUS_BLOCK_Layout, WDMLayoutTests.IRP_Layout, WDMLayoutTests.KAPC_STATE_Layout, WDMLayoutTests.KDEVICE_QUEUE_Layout, WDMLayoutTests.KDPC_Layout, WDMLayoutTests.KEVENT_Layout, WDMLayoutTests.KEY_VALUE_BASIC_INFORMATION_Layout, WDMLayoutTests.KEY_VALUE_ENTRY_Layout, WDMLayoutTests.KEY_VALUE_FULL_INFORMATION_Layout, WDMLayoutTests.KEY_VALUE_LAYER_INFORMATION_Layout, WDMLayoutTests.KEY_VALUE_PARTIAL_INFORMATION_Layout, WDMLayoutTests.KEY_VALUE_PARTIAL_INFORMATION_ALIGN64_Layout, WDMLayoutTests.KSYSTEM_TIME_Layout, WDMLayoutTests.LARGE_INTEGER_Layout, WDMLayoutTests.LIST_ENTRY_Layout, WDMLayoutTests.LUID_Layout, WDMLayoutTests.LUID_AND_ATTRIBUTES_Layout, WDMLayoutTests.MDL_Layout, WDMLayoutTests.OBJECT_ATTRIBUTES_Layout, WDMLayoutTests.OBJECT_HANDLE_INFORMATION_Layout, WDMLayoutTests.OB_CALLBACK_REGISTRATION_Layout, WDMLayoutTests.OB_OPERATION_REGISTRATION_Layout, WDMLayoutTests.OB_POST_CREATE_HANDLE_INFORMATION_Layout, WDMLayoutTests.OB_POST_DUPLICATE_HANDLE_INFORMATION_Layout, WDMLayoutTests.OB_POST_OPERATION_PARAMETERS_Layout, WDMLayoutTests.OB_PRE_CREATE_HANDLE_INFORMATION_Layout, WDMLayoutTests.OB_PRE_DUPLICATE_HANDLE_INFORMATION_Layout, WDMLayoutTests.OB_PRE_OPERATION_INFORMATION_Layout, WDMLayoutTests.OEM_STRING_Layout, WDMLayoutTests.OWNER_ENTRY_Layout, WDMLayoutTests.POOL_EXTENDED_PARAMETER_Layout, WDMLayoutTests.POOL_EXTENDED_PARAMS_SECURE_POOL_Layout, WDMLayoutTests.PS_CREATE_NOTIFY_INFO_Layout, WDMLayoutTests.REG_CALLBACK_CONTEXT_CLEANUP_INFORMATION_Layout, WDMLayoutTests.REG_DELETE_KEY_INFORMATION_Layout, WDMLayoutTests.REG_DELETE_VALUE_KEY_INFORMATION_Layout, WDMLayoutTests.REG_ENUMERATE_KEY_INFORMATION_Layout, WDMLayoutTests.REG_ENUMERATE_VALUE_KEY_INFORMATION_Layout, WDMLayoutTests.REG_FLUSH_KEY_INFORMATION_Layout, WDMLayoutTests.REG_KEY_HANDLE_CLOSE_INFORMATION_Layout, WDMLayoutTests.REG_LOAD_KEY_INFORMATION_Layout, WDMLayoutTests.REG_LOAD_KEY_INFORMATION_V2_Layout, WDMLayoutTests.REG_QUERY_KEY_INFORMATION_Layout, WDMLayoutTests.REG_QUERY_KEY_NAME_Layout, WDMLayoutTests.REG_QUERY_KEY_SECURITY_INFORMATION_Layout, WDMLayoutTests.REG_QUERY_MULTIPLE_VALUE_KEY_INFORMATION_Layout, WDMLayoutTests.REG_QUERY_VALUE_KEY_INFORMATION_Layout, WDMLayoutTests.REG_RENAME_KEY_INFORMATION_Layout, WDMLayoutTests.REG_REPLACE_KEY_INFORMATION_Layout, WDMLayoutTests.REG_RESTORE_KEY_INFORMATION_Layout, WDMLayoutTests.REG_SAVE_KEY_INFORMATION_Layout, WDMLayoutTests.REG_SAVE_MERGED_KEY_INFORMATION_Layout, WDMLayoutTests.REG_SET_INFORMATION_KEY_INFORMATION_Layout, WDMLayoutTests.REG_SET_KEY_SECURITY_INFORMATION_Layout, WDMLayoutTests.REG_SET_VALUE_KEY_INFORMATION_Layout, WDMLayoutTests.REG_UNLOAD_KEY_INFORMATION_Layout, WDMLayoutTests.RESOURCE_HASH_ENTRY_Layout, WDMLayoutTests.RESOURCE_PERFORMANCE_DATA_Layout, WDMLayoutTests.RTL_BITMAP_Layout, WDMLayoutTests.RTL_BITMAP_RUN_Layout, WDMLayoutTests.RTL_HEAP_PARAMETERS_Layout, WDMLayoutTests.RTL_OSVERSIONINFOEXW_Layout, WDMLayoutTests.RTL_OSVERSIONINFOW_Layout, WDMLayoutTests.RTL_QUERY_REGISTRY_TABLE_Layout, WDMLayoutTests.SECTION_OBJECT_POINTERS_Layout, WDMLayoutTests.SECURITY_DESCRIPTOR_Layout, WDMLayoutTests.SECURITY_SUBJECT_CONTEXT_Layout, WDMLayoutTests.SID_Layout, WDMLayoutTests.SID_AND_ATTRIBUTES_Layout, WDMLayoutTests.SID_AND_ATTRIBUTES_HASH_Layout, WDMLayoutTests.SID_IDENTIFIER_AUTHORITY_Layout, WDMLayoutTests.TOKEN_PRIVILEGES_Layout, WDMLayoutTests.ULARGE_INTEGER_Layout, WDMLayoutTests.UNICODE_STRING_Layout, WDMLayoutTests.UUID_Layout, WDMLayoutTests.VPB_Layout, WDMLayoutTests._SLIST_HEADER_Layout -->
Each structure that the WDK's kernel-mode headers declare has the size of its C structure, and its fields are at the C fields' offsets, in a 32-bit and in a 64-bit build, apart from those of the warning and the note below.

| Name | Description |
|------|-------------|
| **_GENERAL_LOOKASIDE**{: #_GENERAL_LOOKASIDE } | A lookaside list: its fields, **L**, followed by the padding array **align**. **NPAGED_LOOKASIDE_LIST** holds one. See the note below. |
| **_SLIST_HEADER**{: #_SLIST_HEADER } | The head of a sequenced singly linked list, whose address **InterlockedPopEntrySList** takes and which **GENERAL_LOOKASIDE_LAYOUT.ListHead** holds. It is opaque: a 16-byte **Byte** array, **HeaderX64**, in a 64-bit build and a **LongLong**, **Alignment**, in a 32-bit one. |
| [**ACCESS_STATE**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_access_state){: #ACCESS_STATE } | The state of an access check in progress, as **IO_SECURITY_CONTEXT.AccessState** points to it: the desired, remaining and granted access, the flags (**TokenAccessStateFlags**), the subject's **SECURITY_SUBJECT_CONTEXT**, the privileges and the object's name and type name. **Privileges** stands for the C union, as its larger member, an **INITIAL_PRIVILEGE_SET**. |
| **ANSI_STRING**{: #ANSI_STRING } | A counted string of 8-bit ANSI characters, laid out as **UNICODE_STRING**: its length and its buffer's size in bytes and the buffer's address. |
| **CLIENT_ID**{: #CLIENT_ID } | A process ID and a thread ID, as **ZwOpenProcess** takes them and **PS_CREATE_NOTIFY_INFO.CreatingThreadId** holds them. |
| **CM_EXTENDED_PARAMETER**{: #CM_EXTENDED_PARAMETER } | One extended parameter of **ZwLoadKey3**. **uType** holds the C bit fields, the 8-bit type (a **CM_EXTENDED_PARAMETER_TYPE** value) and the reserved bits, and **u** holds the C union of the parameter's value. |
| [**DEVICE_OBJECT**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_device_object){: #DEVICE_OBJECT } | A device, as **IoCreateDevice** creates it and **IoAttachDeviceToDeviceStack**, **IofCallDriver** and **IoDetachDevice** take it: its driver, the next and the attached device, flags, device extension, device type and stack size. The C union **Queue** is a **Byte** array. See the note below. |
| **DEVICEIOCTL**{: #DEVICEIOCTL } | The **DeviceIoControl** member of the C union **Parameters** of **IO_STACK_LOCATION**, for `IRP_MJ_DEVICE_CONTROL` and `IRP_MJ_INTERNAL_DEVICE_CONTROL`: the two buffer lengths, the control code and the input buffer of a `METHOD_NEITHER` request. In a 64-bit build **zPtrAlign2** and **zPtrAlign3** are the padding C puts before **InputBufferLength** and **IoControlCode**. |
| **DISPATCHER_HEADER**{: #DISPATCHER_HEADER } | The header that every kernel object a thread can wait on begins with, as **KEVENT.Header** holds it: its signal state and the list of waiting threads. **Lock** stands for the C union of the object's type, size and flag bytes. |
| **DRIVER_EXTENSION**{: #DRIVER_EXTENSION } | The driver extension that **DRIVER_OBJECT.DriverExtension** points to: the driver's **AddDevice** routine and the name of its service key in the registry. |
| [**DRIVER_OBJECT**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_driver_object){: #DRIVER_OBJECT } | The driver's loaded image, as the driver's entry routine receives it and **IoCreateDevice** and **IoAllocateDriverObjectExtension** take it: its devices, name and extension, and the routines the driver sets, **DriverUnload** and the dispatch table **MajorFunction** of `IRP_MJ_MAXIMUM_FUNCTION` + 1 entries. |
| [**ERESOURCE**](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/introduction-to-eresource-routines){: #ERESOURCE } | An executive resource, a lock that threads hold shared or exclusive, as **ExInitializeResourceLite** initializes it and the **ExAcquireResource...** and **ExReleaseResource...** routines take it. Its fields are for the system; **AddressOrCreatorBTIdx** stands for the C union of **Address** and **CreatorBackTraceIndex**. |
| [**EVENT_DATA_DESCRIPTOR**](https://learn.microsoft.com/en-us/windows/win32/api/evntprov/ns-evntprov-event_data_descriptor){: #EVENT_DATA_DESCRIPTOR } | One block of an ETW event's data, as **EtwWrite**, **EtwWriteTransfer** and **EtwWriteEx** take an array of them: its address as a **LongLong**, its size in bytes and its type (**ETWEventDataDescriptorTypes**). **Type**, **Reserved1** and **Reserved2** stand for the C union. |
| **EVENT_DESCRIPTOR**{: #EVENT_DESCRIPTOR } | The metadata of an ETW event, as **EtwWrite**, **EtwWriteEx** and **EtwEventEnabled** take it: its ID, version, channel, level, opcode, task and keyword. |
| **FAST_MUTEX**{: #FAST_MUTEX } | A fast mutex, as **ExInitializeFastMutex** initializes it and **ExAcquireFastMutex**, **ExTryToAcquireFastMutex** and **ExReleaseFastMutex** take it. |
| [**FILE_OBJECT**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_file_object){: #FILE_OBJECT } | An open instance of a file, device or volume, as **IO_STACK_LOCATION.FileObject** points to it and **FsRtlGetFileNameInformation**, **FsRtlGetFileSize** and **FsRtlIsPagingFile** take it: its device, file name, access and sharing, current byte offset and the file system's contexts. |
| [**FILETIME**](https://learn.microsoft.com/en-us/windows/win32/api/minwinbase/ns-minwinbase-filetime){: #FILETIME } | A time as two **Long** values, the low and the high half of the number of 100-nanosecond intervals since 1 January 1601 (UTC). |
| **GENERAL_LOOKASIDE_LAYOUT**{: #GENERAL_LOOKASIDE_LAYOUT } | The fields of a lookaside list, as **_GENERAL_LOOKASIDE.L** holds them: the list head, depth, counters, pool type, tag, entry size and the allocate and free routines. C declares them with the macro `GENERAL_LOOKASIDE_LAYOUT`; each of its unions is one field here, such as **AllocateMissesHits** for **AllocateMisses** and **AllocateHits**. |
| [**IMAGE_INFO**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/ns-ntddk-_image_info){: #IMAGE_INFO } | An image that is being mapped, as the routine registered with **PsSetLoadImageNotifyRoutine** receives it: its base, size and section number, and in **Properties** the C bit fields of its addressing mode, signature level and whether an **IMAGE_INFO_EX** holds it. See the warning below. |
| [**IMAGE_INFO_EX**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/ns-ntddk-_image_info_ex){: #IMAGE_INFO_EX } | The extended form of **IMAGE_INFO**: its size, an **IMAGE_INFO** and the image's file object. The **IMAGE_INFO** a load-image routine receives is inside one when its extended-information bit is set. See the warning below. |
| **INITIAL_PRIVILEGE_SET**{: #INITIAL_PRIVILEGE_SET } | A privilege set with room for `INITIAL_PRIVILEGE_COUNT` (3) privileges, as **ACCESS_STATE.Privileges** holds it: their count, the control flags and the privileges, each a **LUID_AND_ATTRIBUTES**. |
| **IO_COMPLETION_CONTEXT**{: #IO_COMPLETION_CONTEXT } | The I/O completion port and key associated with a file, as **FILE_OBJECT.CompletionContext** points to it. |
| [**IO_DRIVER_CREATE_CONTEXT**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/ns-ntddk-_io_driver_create_context){: #IO_DRIVER_CREATE_CONTEXT } | The extra parameters of the kernel's `IoCreateFileEx`: its size, the extra create parameters, a device object hint and the transaction parameters. See the note below. |
| **IO_REMOVE_LOCK**{: #IO_REMOVE_LOCK } | A remove lock, which keeps a device from being removed while I/O on it is in progress, as **IoInitializeRemoveLock**, **IoAcquireRemoveLock**, **IoReleaseRemoveLock** and **IoReleaseRemoveLockAndWait** take it. It is the structure of a release build: C adds a debug block when `DBG` is set. |
| **IO_REMOVE_LOCK_COMMON_BLOCK**{: #IO_REMOVE_LOCK_COMMON_BLOCK } | The state of a remove lock, as **IO_REMOVE_LOCK.Common** holds it: whether the device is removed, the count of acquisitions and the event that the final release waits for. |
| [**IO_SECURITY_CONTEXT**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_io_security_context){: #IO_SECURITY_CONTEXT } | The security context of an `IRP_MJ_CREATE` request: its quality of service, access state, desired access and create options. |
| [**IO_STACK_LOCATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_io_stack_location){: #IO_STACK_LOCATION } | One I/O stack location of an IRP, whose address **IoGetCurrentIrpStackLocation** and **IoGetNextIrpStackLocation** return: the major and minor function, flags, device and file object, and completion routine. Of the C union **Parameters** it holds the **DeviceIoControl** member only, a **DEVICEIOCTL**. |
| [**IO_STATUS_BLOCK**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_io_status_block){: #IO_STATUS_BLOCK } | The final status of an I/O request and a value that depends on the request, often the number of bytes transferred, as **IRP.IoStatus** holds it and **ZwCreateFile** fills it. It has the **Status** member of the C union; **IO_STATUS_BLOCK_Ptr** has the **Pointer** member. |
| **IO_STATUS_BLOCK_Ptr**{: #IO_STATUS_BLOCK_Ptr } | **IO_STATUS_BLOCK** with the **Pointer** member of its C union in place of **Status**, to copy an **IO_STATUS_BLOCK** into when a 64-bit driver needs the pointer. |
| [**IRP**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_irp){: #IRP } | An I/O request packet, as a dispatch routine receives it and **IoCompleteRequest**, **IoCallDriver** and **IoSetCompletionRoutine** take it. **SystemBuffer** stands for the C union **AssociatedIrp**, the C union **Overlay** is a **Byte** array, and **Pad** makes room for the larger member of the C union **Tail**. |
| **KAPC_STATE**{: #KAPC_STATE } | The APC state of a thread, which **KeStackAttachProcess** saves into it when it attaches the thread to another process and **KeUnstackDetachProcess** restores from it. Its fields are for the system. |
| **KDEVICE_QUEUE**{: #KDEVICE_QUEUE } | A device queue object, as **DEVICE_OBJECT.DeviceQueue** holds it: the list of queued entries, its spin lock and whether it is busy. |
| **KDPC**{: #KDPC } | A deferred procedure call object, as **DEVICE_OBJECT.Dpc** holds it: its routine, its context and its two system arguments. |
| **KEVENT**{: #KEVENT } | An event object, as **KeInitializeEvent** initializes it, **KeSetEvent** signals it and **KeWaitForSingleObject** waits on it. |
| [**KEY_VALUE_BASIC_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_key_value_basic_information){: #KEY_VALUE_BASIC_INFORMATION } | A value entry's type and name, as **ZwQueryValueKey** and **ZwEnumerateValueKey** return it for **KeyValueBasicInformation**. **Name** is a buffer of 512 characters where C has an array of any length. |
| [**KEY_VALUE_ENTRY**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_key_value_entry){: #KEY_VALUE_ENTRY } | One value entry to query, as **ZwQueryMultipleValueKey** takes an array of them: the value's name, and on return the length, offset and type of its data. |
| [**KEY_VALUE_FULL_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_key_value_full_information){: #KEY_VALUE_FULL_INFORMATION } | The header of a value entry's full information, as **ZwQueryValueKey** and **ZwEnumerateValueKey** return it for **KeyValueFullInformation**: its type and the offset and length of its data and name. The name and the data that follow the header in C are not part of it. |
| **KEY_VALUE_LAYER_INFORMATION**{: #KEY_VALUE_LAYER_INFORMATION } | Whether a value entry is a tombstone in a layered key, for **KeyValueLayerInformation**. **IsTombstone** holds the C bit fields. |
| [**KEY_VALUE_PARTIAL_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_key_value_partial_information){: #KEY_VALUE_PARTIAL_INFORMATION } | A value entry's type and data, as **ZwQueryValueKey** and **ZwEnumerateValueKey** return it for **KeyValuePartialInformation**. **Data** is a buffer of 4,096 bytes where C has an array of any length. |
| **KEY_VALUE_PARTIAL_INFORMATION_ALIGN64**{: #KEY_VALUE_PARTIAL_INFORMATION_ALIGN64 } | As **KEY_VALUE_PARTIAL_INFORMATION** without **TitleIndex**, for **KeyValuePartialInformationAlign64**. **Data** is a buffer of 4,096 bytes where C has an array of any length. |
| **KLDR_DATA_TABLE_ENTRY**{: #KLDR_DATA_TABLE_ENTRY } | An entry of the kernel's list of loaded modules, as **DRIVER_OBJECT.DriverSection** points to it: its links, base, entry point, size and names. It has the fields up to **LoadCount** only, and the source marks **InLoadOrderLinks** and the fields from **DllBase** on as the ones that stay the same between Windows versions. Not documented by Microsoft. |
| **KSYSTEM_TIME**{: #KSYSTEM_TIME } | A 64-bit time as **KUSER_SHARED_DATA** holds it: the low **Long** and two copies of the high **Long**. |
| [**KUSER_SHARED_DATA**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/ns-ntddk-kuser_shared_data){: #KUSER_SHARED_DATA } | The page of system data that the kernel shares with every process, at `KI_USER_SHARED_DATA`: the tick count, interrupt and system time, time zone bias, system root, Windows version, processor features and more. See the warning below. |
| [**LARGE_INTEGER**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-large_integer-r1){: #LARGE_INTEGER } | A signed 64-bit value. Of the C union it has the **QuadPart** member only. |
| [**LIST_ENTRY**](https://learn.microsoft.com/en-us/windows/win32/api/ntdef/ns-ntdef-list_entry){: #LIST_ENTRY } | An entry of a doubly linked list, or the list's head, as **InitializeListHead**, **InsertHeadList**, **InsertTailList**, **IsListEmpty** and **RemoveListHead** take it. |
| **LPC_MESSAGE**{: #LPC_MESSAGE } | The header of a local procedure call (LPC) message: its data length, total length, message type, sender and IDs. Not documented by Microsoft. |
| [**LUID**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/igpupvdev/ns-igpupvdev-_luid){: #LUID } | A locally unique identifier: a 64-bit value that is unique on the system that made it, such as a privilege's. |
| [**LUID_AND_ATTRIBUTES**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_luid_and_attributes){: #LUID_AND_ATTRIBUTES } | A **LUID** and its attributes, such as a privilege and whether it is enabled (**SE_PRIVILEGE_ATTR**). |
| [**MDL**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_mdl){: #MDL } | A memory descriptor list, which describes the physical pages of a buffer, as **IRP.MdlAddress** points to it and **MmGetSystemAddressForMdlSafe** and **MmMapLockedPagesSpecifyCache** take its address. |
| **NPAGED_LOOKASIDE_LIST**{: #NPAGED_LOOKASIDE_LIST } | A lookaside list of entries in nonpaged pool, whose address **ExInitializeNPagedLookasideList** takes. It holds a **_GENERAL_LOOKASIDE**, and in a 32-bit build also C's obsolete lock field and a padding array. See the note below. |
| [**OB_CALLBACK_REGISTRATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_ob_callback_registration){: #OB_CALLBACK_REGISTRATION } | What a driver registers with **ObRegisterCallbacks**: the version, the altitude, a context and **OperationRegistration**, which points to an array of **OperationRegistrationCount** **OB_OPERATION_REGISTRATION** items. |
| [**OB_OPERATION_REGISTRATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_ob_operation_registration){: #OB_OPERATION_REGISTRATION } | One object type to watch, with the handle operations (**OB_OPERATION**) and the pre-operation and post-operation callbacks. **ObjectType** is the address that **PsProcessType** or **PsThreadType** returns. |
| [**OB_POST_CREATE_HANDLE_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_ob_post_create_handle_information){: #OB_POST_CREATE_HANDLE_INFORMATION } | The access granted to a process or thread handle that has been opened, as a post-operation callback receives it. |
| [**OB_POST_DUPLICATE_HANDLE_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_ob_post_duplicate_handle_information){: #OB_POST_DUPLICATE_HANDLE_INFORMATION } | The access granted to a process or thread handle that has been duplicated, as a post-operation callback receives it. |
| [**OB_POST_OPERATION_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_ob_post_operation_information){: #OB_POST_OPERATION_INFORMATION } | A process or thread handle operation, as a post-operation callback receives it: the operation, whether the handle is a kernel handle, the object and its type, the context from the pre-operation callback, the status and the parameters. **KernelHandle** stands for the C union of the flags and the **KernelHandle** bit. See the warning below. |
| [**OB_POST_OPERATION_PARAMETERS**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_ob_post_operation_parameters){: #OB_POST_OPERATION_PARAMETERS } | The parameters of a post-operation callback. Both members of the C union have the one field **GrantedAccess**, so the package gives that field. |
| [**OB_PRE_CREATE_HANDLE_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_ob_pre_create_handle_information){: #OB_PRE_CREATE_HANDLE_INFORMATION } | The access asked for a process or thread handle that is being opened, which a pre-operation callback can reduce in **DesiredAccess**. |
| [**OB_PRE_DUPLICATE_HANDLE_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_ob_pre_duplicate_handle_information){: #OB_PRE_DUPLICATE_HANDLE_INFORMATION } | The access asked for a process or thread handle that is being duplicated, which a pre-operation callback can reduce in **DesiredAccess**, with the source and the target process. |
| [**OB_PRE_OPERATION_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_ob_pre_operation_information){: #OB_PRE_OPERATION_INFORMATION } | A process or thread handle operation, as a pre-operation callback receives it: the operation, whether the handle is a kernel handle, the object and its type, and the context to pass to the post-operation callback. **KernelHandle** stands for the C union of the flags and the **KernelHandle** bit. **Parameters** is a **Byte** array the size of the union of **OB_PRE_CREATE_HANDLE_INFORMATION** and **OB_PRE_DUPLICATE_HANDLE_INFORMATION**, where C has a pointer to that union. See the warning below. |
| [**OBJECT_ATTRIBUTES**](https://learn.microsoft.com/en-us/windows/win32/api/ntdef/ns-ntdef-_object_attributes){: #OBJECT_ATTRIBUTES } | The name, root directory, attributes (**ObjectAttributeValues**) and security of an object to open or create, as **InitializeObjectAttributes** fills it and **ZwCreateFile**, **ZwOpenKey** and the other **Zw** routines take it. |
| **OBJECT_HANDLE_INFORMATION**{: #OBJECT_HANDLE_INFORMATION } | The attributes of a handle and the access it grants, as **ObReferenceObjectByHandle** and **ObReferenceObjectByHandleWithTag** fill it. |
| **OEM_STRING**{: #OEM_STRING } | A counted string in the OEM code page, laid out as **ANSI_STRING**, such as the 8.3 name that **RtlIsNameLegalDOS8Dot3** returns in *OemName*. |
| **OWNER_ENTRY**{: #OWNER_ENTRY } | One owner of an executive resource, as **ERESOURCE.OwnerEntry** holds it: the owning thread, and in **TableSizeOrFlags** the C union of the owner count with its flag bits (**OwnerEntryFlags**) and the table size. |
| [**POOL_EXTENDED_PARAMETER**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-pool_extended_parameter){: #POOL_EXTENDED_PARAMETER } | One extended parameter of **ExAllocatePool3** and **ExFreePool2**. **Type** (a **POOL_EXTENDED_PARAMETER_TYPE**), **Optional** and **Reserved** stand for the C bit fields, and **u** for the C union of the parameter's value, such as an **EX_POOL_PRIORITY** or the address of a **POOL_EXTENDED_PARAMS_SECURE_POOL**. |
| [**POOL_EXTENDED_PARAMS_SECURE_POOL**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-pool_extended_params_secure_pool){: #POOL_EXTENDED_PARAMS_SECURE_POOL } | The secure pool parameters that a **POOL_EXTENDED_PARAMETER** of type `PoolExtendedParameterSecurePool` points to: the secure pool's handle, a buffer, a cookie and the flags (**SecurePoolFlags**). |
| **PORT_DATA_ENTRY**{: #PORT_DATA_ENTRY } | One data entry of an LPC message: the address and the size of a buffer. Not documented by Microsoft. |
| **PORT_DATA_INFORMATION**{: #PORT_DATA_INFORMATION } | The count of data entries of an LPC message, followed by the first **PORT_DATA_ENTRY**: a driver reads the count, then that many entries from the offset of **DataEntries**. Not documented by Microsoft. |
| **PORT_MESSAGE**{: #PORT_MESSAGE } | The header of a port message: lengths, type, sender, message ID and client view size. **Length**, **u2** and **ClientViewSizeOrCallbackId** each stand for a C union. Not documented by Microsoft. |
| **PS_ATTRIBUTE**{: #PS_ATTRIBUTE } | One attribute of a **PS_ATTRIBUTE_LIST**: its ID (**PS_ATTRIBUTE_ID**), the size of its value, the value or its address, and the address of a variable that receives the length returned. **ValuePtrOrValue** stands for the C union of the value and its address. Not documented by Microsoft. |
| **PS_ATTRIBUTE_LIST**{: #PS_ATTRIBUTE_LIST } | The attribute list of **ZwCreateUserProcess**: its length in bytes and room for 31 **PS_ATTRIBUTE** items. **TotalLength** counts only the items in use, never the whole array. Not documented by Microsoft. |
| **PS_BNO_ISOLATION_PARAMETERS**{: #PS_BNO_ISOLATION_PARAMETERS } | The value of a `PS_ATTRIBUTE_BNO_ISOLATION` attribute, which isolates the new process's named objects: the isolation prefix, the number and the address of the handles, and whether isolation is on. Not documented by Microsoft. |
| **PS_CREATE_INFO**{: #PS_CREATE_INFO } | What **ZwCreateUserProcess** takes and returns about the creation: its size, the state it reached (**PS_CREATE_STATE**) and **uniondata**, a **Byte** array for the C union of that state's data, which a **PS_CREATE_INFO_SUCCESS_U** reads after `PsCreateSuccess`. In a 64-bit build **pad** is the padding C puts before the union. Not documented by Microsoft. |
| **PS_CREATE_INFO_SUCCESS_U**{: #PS_CREATE_INFO_SUCCESS_U } | The data of a **PS_CREATE_INFO** whose state is `PsCreateSuccess`, to copy its **uniondata** into: the output flags, the file and section handles, and the native and WOW64 addresses of the process parameters and the PEB, and the manifest's address and size, the last in **ManifestSiz**. Not documented by Microsoft. |
| [**PS_CREATE_NOTIFY_INFO**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/ns-ntddk-_ps_create_notify_info){: #PS_CREATE_NOTIFY_INFO } | A process that is being created, as the routine registered with **PsSetCreateProcessNotifyRoutineEx** receives it: its parent, creating thread, file object, image name and command line. **Flags** stands for the C union of the flags and their bit fields (**PSCNI_Flags**), and the routine sets **CreationStatus** to an error status to deny the creation. |
| **PS_MEMORY_RESERVE**{: #PS_MEMORY_RESERVE } | The value of a `PS_ATTRIBUTE_MEMORY_RESERVE` attribute: the address and size of a range to reserve in the new process. Not documented by Microsoft. |
| **PS_STD_HANDLE_INFO**{: #PS_STD_HANDLE_INFO } | The value of a `PS_ATTRIBUTE_STD_HANDLE_INFO` attribute: which standard handles are duplicated into the new process, and the subsystem type that `PsRequestDuplicate` asks the image to have. **Flags** stands for the C bit fields, a **PS_STD_HANDLE_STATE** in its two low bits and a mask of **PS_STD_HANDLES** in the three above them. Not documented by Microsoft. |
| [**REG_CALLBACK_CONTEXT_CLEANUP_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_reg_callback_context_cleanup_information){: #REG_CALLBACK_CONTEXT_CLEANUP_INFORMATION } | What a registry callback receives for **RegNtCallbackObjectContextCleanup**: a registry object and the context the driver attached to it, to free. |
| [**REG_DELETE_KEY_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_reg_delete_key_information){: #REG_DELETE_KEY_INFORMATION } | What a registry callback receives for **RegNtPreDeleteKey**: the key that is being deleted. |
| [**REG_DELETE_VALUE_KEY_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_reg_delete_value_key_information){: #REG_DELETE_VALUE_KEY_INFORMATION } | What a registry callback receives for **RegNtPreDeleteValueKey**: the key and the name of the value entry that is being deleted. |
| [**REG_ENUMERATE_KEY_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_reg_enumerate_key_information){: #REG_ENUMERATE_KEY_INFORMATION } | What a registry callback receives for **RegNtPreEnumerateKey**: the key, the index of the subkey, the information class and the buffer that receives the information. |
| [**REG_ENUMERATE_VALUE_KEY_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_reg_enumerate_value_key_information){: #REG_ENUMERATE_VALUE_KEY_INFORMATION } | What a registry callback receives for **RegNtPreEnumerateValueKey**: the key, the index of the value entry, the information class and the buffer that receives the information. |
| **REG_FLUSH_KEY_INFORMATION**{: #REG_FLUSH_KEY_INFORMATION } | What a registry callback receives for **RegNtPreFlushKey**: the key that is being flushed. It has the fields of **REG_DELETE_KEY_INFORMATION**, which C declares it as. |
| [**REG_KEY_HANDLE_CLOSE_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_reg_key_handle_close_information){: #REG_KEY_HANDLE_CLOSE_INFORMATION } | What a registry callback receives for **RegNtPreKeyHandleClose**: the key whose handle is about to be closed. |
| [**REG_LOAD_KEY_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_reg_load_key_information){: #REG_LOAD_KEY_INFORMATION } | What a registry callback receives for **RegNtPreLoadKey**: the key, the hive file, the flags, the access and the root handle of a hive that is being loaded. |
| [**REG_LOAD_KEY_INFORMATION_V2**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-reg_load_key_information_v2){: #REG_LOAD_KEY_INFORMATION_V2 } | As **REG_LOAD_KEY_INFORMATION**, for a hive that is being loaded, with **Version** in place of **Reserved** and a file access token after it. |
| [**REG_QUERY_KEY_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_reg_query_key_information){: #REG_QUERY_KEY_INFORMATION } | What a registry callback receives for **RegNtPreQueryKey**: the key, the information class and the buffer that receives the information. |
| [**REG_QUERY_KEY_NAME**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_reg_query_key_name){: #REG_QUERY_KEY_NAME } | What a registry callback receives for **RegNtPreQueryKeyName**: the key and the buffer that receives its full name. |
| [**REG_QUERY_KEY_SECURITY_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_reg_query_key_security_information){: #REG_QUERY_KEY_SECURITY_INFORMATION } | What a registry callback receives for **RegNtPreQueryKeySecurity**: the key, the security information asked for and the buffer that receives its security descriptor. |
| [**REG_QUERY_MULTIPLE_VALUE_KEY_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_reg_query_multiple_value_key_information){: #REG_QUERY_MULTIPLE_VALUE_KEY_INFORMATION } | What a registry callback receives for **RegNtPreQueryMultipleValueKey**: the key, the array of **KEY_VALUE_ENTRY** items and the buffer that receives the data. |
| [**REG_QUERY_VALUE_KEY_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_reg_query_value_key_information){: #REG_QUERY_VALUE_KEY_INFORMATION } | What a registry callback receives for **RegNtPreQueryValueKey**: the key, the value entry's name, the information class and the buffer that receives the information. |
| [**REG_RENAME_KEY_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_reg_rename_key_information){: #REG_RENAME_KEY_INFORMATION } | What a registry callback receives for **RegNtPreRenameKey**: the key and its new name. |
| [**REG_REPLACE_KEY_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_reg_replace_key_information){: #REG_REPLACE_KEY_INFORMATION } | What a registry callback receives for **RegNtPreReplaceKey**: the key and the names of the old and the new hive file. |
| [**REG_RESTORE_KEY_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_reg_restore_key_information){: #REG_RESTORE_KEY_INFORMATION } | What a registry callback receives for **RegNtPreRestoreKey**: the key, the handle of the file it is restored from and the flags. |
| [**REG_SAVE_KEY_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_reg_save_key_information){: #REG_SAVE_KEY_INFORMATION } | What a registry callback receives for **RegNtPreSaveKey**: the key, the handle of the file it is saved to and the format (**RegSaveKeyFlags**). |
| [**REG_SAVE_MERGED_KEY_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-reg_save_merged_key_information){: #REG_SAVE_MERGED_KEY_INFORMATION } | What a registry callback receives for **RegNtPreSaveMergedKey**: the key, the handle of the file it is saved to, the high-precedence and low-precedence keys that are merged, and the contexts. |
| [**REG_SET_INFORMATION_KEY_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_reg_set_information_key_information){: #REG_SET_INFORMATION_KEY_INFORMATION } | What a registry callback receives for **RegNtPreSetInformationKey**: the key, the information class and the new information. |
| [**REG_SET_KEY_SECURITY_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_reg_set_key_security_information){: #REG_SET_KEY_SECURITY_INFORMATION } | What a registry callback receives for **RegNtPreSetKeySecurity**: the key, the security information to set and the new security descriptor. |
| [**REG_SET_VALUE_KEY_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_reg_set_value_key_information){: #REG_SET_VALUE_KEY_INFORMATION } | What a registry callback receives for **RegNtPreSetValueKey**: the key, the value entry's name, type and new data. |
| [**REG_UNLOAD_KEY_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_reg_unload_key_information){: #REG_UNLOAD_KEY_INFORMATION } | What a registry callback receives for **RegNtPreUnLoadKey**: the key of a hive that is being unloaded and an event. |
| **RESOURCE_HASH_ENTRY**{: #RESOURCE_HASH_ENTRY } | One entry of the hash table of **RESOURCE_PERFORMANCE_DATA**: its links, an address and its contention count. Not documented by Microsoft. |
| **RESOURCE_PERFORMANCE_DATA**{: #RESOURCE_PERFORMANCE_DATA } | Counters of the use of executive resources, with a hash table of **RESOURCE_HASH_TABLE_SIZE** **LIST_ENTRY** heads of **RESOURCE_HASH_ENTRY** items. Not documented by Microsoft. |
| **RTL_BITMAP**{: #RTL_BITMAP } | The header of a bitmap, as **RtlInitializeBitMap** initializes it and **RtlSetBit**, **RtlClearBit**, **RtlFindClearBits** and the other bitmap routines take it: the number of bits and the address of the buffer that holds them. |
| **RTL_BITMAP_EX**{: #RTL_BITMAP_EX } | As **RTL_BITMAP**, with a 64-bit number of bits, as **RtlInitializeBitMapEx** initializes it and the other bitmap routines whose names end in **Ex** take it. Not documented by Microsoft. |
| **RTL_BITMAP_RUN**{: #RTL_BITMAP_RUN } | A run of adjacent bits of a bitmap: its first bit and its number of bits, as **RtlFindClearRuns** fills an array of them. |
| [**RTL_HEAP_PARAMETERS**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-rtl_heap_parameters){: #RTL_HEAP_PARAMETERS } | The optional parameters of **RtlCreateHeap**: the structure's size in **Length**, the segment reserve and commit sizes, the decommit thresholds, the largest allocation, the virtual memory threshold, the initial commit and reserve sizes and a commit routine. |
| **RTL_OSVERSIONINFOEXW**{: #RTL_OSVERSIONINFOEXW } | As **RTL_OSVERSIONINFOW**, with the service pack version, suite mask and product type. **RtlGetVersion** fills it when **dwOSVersionInfoSize** is its size. |
| **RTL_OSVERSIONINFOW**{: #RTL_OSVERSIONINFOW } | The Windows version, as **RtlGetVersion** fills it: the major and minor version, build number, platform and service pack string. The caller sets **dwOSVersionInfoSize** to its size first. |
| **RTL_QUERY_REGISTRY_TABLE**{: #RTL_QUERY_REGISTRY_TABLE } | One entry of the table that **RtlQueryRegistryValues** takes: the routine or the variable that receives a value, its name, flags and default. The table ends with an entry whose **QueryRoutine** and **Name** are 0. |
| [**SE_SID**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_se_sid){: #SE_SID } | A buffer of **SECURITY_MAX_SID_SIZE** bytes for a **SID**, which a driver can declare as a local variable. Of the C union it has the **Buffer** member only. See the note below. |
| [**SECTION_OBJECT_POINTERS**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_section_object_pointers){: #SECTION_OBJECT_POINTERS } | The memory manager's and cache manager's data for a file stream, which the file system allocates and **FILE_OBJECT.SectionObjectPointer** points to. |
| [**SECURITY_DESCRIPTOR**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_security_descriptor){: #SECURITY_DESCRIPTOR } | The security of an object in absolute form: its revision, control flags and pointers to the owner, the group, the SACL and the DACL. |
| [**SECURITY_SUBJECT_CONTEXT**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_security_subject_context){: #SECURITY_SUBJECT_CONTEXT } | The security context of the thread that asks for access, as **ACCESS_STATE.SubjectSecurityContext** holds it and **SeLockSubjectContext**, **SeAssignSecurity** and **SeAccessCheck** take it: its client token, impersonation level and primary token. |
| [**SID**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_sid){: #SID } | A security identifier, which identifies a user or a group: its revision, identifier authority and sub-authorities. **SubAuthority** has 16 elements where C has an array of any length, so a driver can use the structure as a header and put fewer sub-authorities after it. |
| [**SID_AND_ATTRIBUTES**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_sid_and_attributes){: #SID_AND_ATTRIBUTES } | A pointer to a **SID** and its attributes (**GROUP_SID_ATTRIBUTES**). |
| [**SID_AND_ATTRIBUTES_HASH**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-sid_and_attributes_hash){: #SID_AND_ATTRIBUTES_HASH } | A hash of an array of **SID_AND_ATTRIBUTES** items: their count, the address of the array and **SID_HASH_SIZE** hash values. |
| [**SID_IDENTIFIER_AUTHORITY**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_sid_identifier_authority){: #SID_IDENTIFIER_AUTHORITY } | The top-level authority of a **SID**, six bytes. |
| [**TOKEN_PRIVILEGES**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_token_privileges){: #TOKEN_PRIVILEGES } | A set of privileges of an access token: their count and an array of **LUID_AND_ATTRIBUTES** with room for two, where C has an array of any length. |
| [**ULARGE_INTEGER**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-ularge_integer-r1){: #ULARGE_INTEGER } | An unsigned 64-bit value, held in a **LongLong**. Of the C union it has the **QuadPart** member only. |
| [**UNICODE_STRING**](https://learn.microsoft.com/en-us/windows/win32/api/ntdef/ns-ntdef-_unicode_string){: #UNICODE_STRING } | A counted string of UTF-16 characters: its length and its buffer's size in bytes and the buffer's address, as **RtlInitUnicodeString** fills it and the other **Rtl...UnicodeString** routines take it. |
| [**UUID**](https://learn.microsoft.com/en-us/windows/win32/rpc/rpcdce/ns-rpcdce-uuid){: #UUID } | A 128-bit unique identifier, laid out as a GUID. |
| [**VPB**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_vpb){: #VPB } | A volume parameter block, which links the device object of a mounted file system volume to the device object of its disk: flags, serial number, reference count and a volume label of up to 32 characters. **FILE_OBJECT.Vpb** and **DEVICE_OBJECT.Vpb** point to it. |
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

| Name | Type | Description |
|------|------|-------------|
| **CBoolean**{: #CBoolean } | **Byte** | C's **BOOLEAN**: 0 for false, 1 for true. It is not twinBASIC's **Boolean**, which is 2 bytes and -1 for true. |
| **KIRQL**{: #KIRQL } | **Byte** | An interrupt request level, such as a member of [**eKIRQL**](#eKIRQL). |
| **KPROCESSOR_MODE**{: #KPROCESSOR_MODE } | **Byte** | A processor mode, a member of [**eKPROCESSOR_MODE**](#eKPROCESSOR_MODE). |

## Enumerations

<!-- test: WDMValueTests.ALTERNATIVE_ARCHITECTURE_TYPE_Values, WDMValueTests.DEVICE_OBJECT_FLAGS_Values, WDMValueTests.DEVICE_TYPE_Values, WDMValueTests.DPFLTR_TYPE_Values, WDMValueTests.DRIVER_OBJECT_FLAGS_Values, WDMValueTests.DbgPrntLevels_Values, WDMValueTests.DirectoryAccessRights_Values, WDMValueTests.DuplicateObjectOptions_Values, WDMValueTests.EResFlags_Values, WDMValueTests.ETWEventDataDescriptorTypes_Values, WDMValueTests.ETWEventWriteFlags_Values, WDMValueTests.EVENT_INFO_CLASS_Values, WDMValueTests.EVENT_TYPE_Values, WDMValueTests.EX_POOL_PRIORITY_Values, WDMValueTests.FILE_ATTRIBUTES_Values, WDMValueTests.FILE_DEVICE_CHARACTERISTICS_Values, WDMValueTests.FILE_OBJECT_FLAGS_Values, WDMValueTests.FileAccessFlags_Values, WDMValueTests.FileAccessRights_Values, WDMValueTests.FileCreateDisposition_Values, WDMValueTests.FileCreateOutcome_Values, WDMValueTests.FileShareMode_Values, WDMValueTests.GenericRights_Values, WDMValueTests.HeapFlags_Values, WDMValueTests.IO_TYPE_Values, WDMValueTests.IoCreateFileFlags_Values, WDMValueTests.IoStackLocFlags_Values, WDMValueTests.IrpFlags_Values, WDMValueTests.KEY_INFORMATION_CLASS_Values, WDMValueTests.KEY_SET_INFORMATION_CLASS_Values, WDMValueTests.KEY_VALUE_INFORMATION_CLASS_Values, WDMValueTests.KPRIORITY_Values, WDMValueTests.KWAIT_REASON_Values, WDMValueTests.MDL_FLAGS_Values, WDMValueTests.MM_COPY_FLAGS_Values, WDMValueTests.MM_PAGE_PRIORITY_Values, WDMValueTests.MdlMappingFlags_Values, WDMValueTests.MemAllocType_Values, WDMValueTests.MemProtectFlags_Values, WDMValueTests.NTSectionAccessRights_Values, WDMValueTests.NT_PRODUCT_TYPE_Values, WDMValueTests.NtFileQueryFlags_Values, WDMValueTests.NTSTATUS_Values, WDMValueTests.OB_OPERATION_Values, WDMValueTests.OB_PREOP_CALLBACK_STATUS_Values, WDMValueTests.ObjectAttributeValues_Values, WDMValueTests.POOL_EXTENDED_PARAMETER_TYPE_Values, WDMValueTests.PSCREATETHREADNOTIFYTYPE_Values, WDMValueTests.REGSAM_Values, WDMValueTests.REGTYPES_Values, WDMValueTests.REG_NOTIFY_CLASS_Values, WDMValueTests.RegKeyRestoreAndLoadHiveFlags_Values, WDMValueTests.RegNotifyChangeValues_Values, WDMValueTests.RegOptions_Values, WDMValueTests.RegSaveKeyFlags_Values, WDMValueTests.RegUnloadFlags_Values, WDMValueTests.RegistryCreateDispositions_Values, WDMValueTests.ReparseDataExFlags_Values, WDMValueTests.RtlDupUnicodeStrFlags_Values, WDMValueTests.SECURITY_DESCRIPTOR_CONTROL_Values, WDMValueTests.SECURITY_IMPERSONATION_LEVEL_Values, WDMValueTests.SECURITY_INFORMATION_Values, WDMValueTests.SEF_FLAGS_Values, WDMValueTests.SE_PRIVILEGE_ATTR_Values, WDMValueTests.SID_NAME_USE_Values, WDMValueTests.SecurePoolFlags_Values, WDMValueTests.StandardAccessTypes_Values, WDMValueTests.SymbolicLinkAccessRights_Values, WDMValueTests.TOKEN_TYPE_Values, WDMValueTests.ThreadAccessRights_Values, WDMValueTests.TokenAccessStateFlags_Values, WDMValueTests.VBP_FLAGS_Values, WDMValueTests.eKIRQL_Values, WDMValueTests.eKPROCESSOR_MODE_Values -->
Every member that the WDK's kernel-mode headers declare has the value of the WDK's constant or enumerator of the same name, apart from those of the warning and the note below.

| Name | Description |
|------|-------------|
| **ALTERNATIVE_ARCHITECTURE_TYPE**{: #ALTERNATIVE_ARCHITECTURE_TYPE } | The hardware design of **KUSER_SHARED_DATA.AlternativeArchitecture**: `StandardDesign`, or `NEC98x86` for the NEC PC-98 series. |
| **BOOL**{: #BOOL } | A 32-bit truth value, `CFALSE` (0) or `CTRUE` (1), for the **KernelHandle** field of **OB_PRE_OPERATION_INFORMATION** and **OB_POST_OPERATION_INFORMATION**, which stands for the one defined bit of the C flags: `CTRUE` when the handle is a kernel handle. |
| **CM_EXTENDED_PARAMETER_TYPE**{: #CM_EXTENDED_PARAMETER_TYPE } | The type of a **CM_EXTENDED_PARAMETER** that **ZwLoadKey3** takes: a trust class key, an event or a file access token. Not documented by Microsoft. |
| **DbgPrntLevels**{: #DbgPrntLevels } | The importance of a message, for the *Level* of **DbgPrintEx**: `DPFLTR_ERROR_LEVEL` to `DPFLTR_INFO_LEVEL`, or a mask of levels with `DPFLTR_MASK` set. |
| **DEVICE_OBJECT_FLAGS**{: #DEVICE_OBJECT_FLAGS } | The `DO_` flags of **DEVICE_OBJECT.Flags**: a driver sets `DO_BUFFERED_IO` or `DO_DIRECT_IO` on a new device object, and clears `DO_DEVICE_INITIALIZING` once it is ready. |
| **DEVICE_TYPE**{: #DEVICE_TYPE } | The `FILE_DEVICE_` device types, such as `FILE_DEVICE_UNKNOWN` and `FILE_DEVICE_DISK`, for the *DeviceType* of **IoCreateDevice** and **CTL_CODE**, both a **Long**, and the **DeviceType** fields of **FLT_VOLUME_PROPERTIES** (modFltMgr) and **FILE_FS_DEVICE_INFORMATION** (modSysInfo). |
| **DirectoryAccessRights**{: #DirectoryAccessRights } | The access rights of an object directory, from `DIRECTORY_QUERY` to `DIRECTORY_ALL_ACCESS`, for the *DesiredAccess* of **ZwCreateDirectoryObject** and **ZwOpenDirectoryObject**. |
| **DPFLTR_TYPE**{: #DPFLTR_TYPE } | The component IDs of the kernel's debug message filter, such as `DPFLTR_IHVDRIVER_ID` for a driver's own messages and `DPFLTR_DEFAULT_ID`, for the *ComponentId* of **DbgPrintEx**. |
| **DRIVER_OBJECT_FLAGS**{: #DRIVER_OBJECT_FLAGS } | The `DRVO_` flags of **DRIVER_OBJECT.Flags**, which the I/O manager sets, such as `DRVO_UNLOAD_INVOKED` and `DRVO_LEGACY_DRIVER`. |
| **DuplicateObjectOptions**{: #DuplicateObjectOptions } | The `DUPLICATE_` options of **ZwDuplicateObject**'s *Options*: close the source handle, keep its access rights, keep its attributes. |
| **eKIRQL**{: #eKIRQL } | The interrupt request levels from `PASSIVE_LEVEL` to `DISPATCH_LEVEL`, for a [**KIRQL**](#KIRQL) such as the one **KeGetCurrentIrql** returns and the *NewIrql* of **KeReleaseSpinLock**. |
| **eKPROCESSOR_MODE**{: #eKPROCESSOR_MODE } | `KernelMode` or `UserMode`, for a [**KPROCESSOR_MODE**](#KPROCESSOR_MODE) such as the *AccessMode* of **MmMapLockedPagesSpecifyCache** and **ObOpenObjectByPointer**, the *WaitMode* of **KeWaitForSingleObject** and **IRP.RequestorMode**. |
| **EResFlags**{: #EResFlags } | The bits of **ERESOURCE.Flag**, among them the `#define`s `ResourceNeverExclusive`, `ResourceReleaseByOtherThread` and `ResourceOwnedExclusive` of `wdm.h`. |
| **ETWEventDataDescriptorTypes**{: #ETWEventDataDescriptorTypes } | The kind of data in **EVENT_DATA_DESCRIPTOR.Type**: `EVENT_DATA_DESCRIPTOR_TYPE_NONE` for the event's payload, event or provider metadata, or a timestamp override. ETW reads it only once **EtwSetInformation** has set `EventProviderUseDescriptorType` or the provider's traits. |
| **ETWEventWriteFlags**{: #ETWEventWriteFlags } | The flags of **EtwWriteEx**'s *Flags*: `EVENT_WRITE_FLAG_NO_FAULTING`, to write an event where a page fault is not allowed, and `EVENT_WRITE_FLAG_INPRIVATE`, which drops the event from the sessions that exclude InPrivate events. |
| [**EVENT_INFO_CLASS**](https://learn.microsoft.com/en-us/windows/win32/api/evntprov/ne-evntprov-event_info_class){: #EVENT_INFO_CLASS } | The setting that **EtwSetInformation** changes in a provider's registration, such as `EventProviderSetTraits` and `EventProviderUseDescriptorType`. See the note below. |
| **EVENT_TYPE**{: #EVENT_TYPE } | The kind of event that **KeInitializeEvent** initializes: `NotificationEvent`, which stays signalled until it is reset, or `SynchronizationEvent`, which releases one waiting thread and resets itself. |
| [**EX_POOL_PRIORITY**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ne-wdm-ex_pool_priority){: #EX_POOL_PRIORITY } | How important an allocation is when pool memory is short, for the *Priority* of **ExAllocatePoolWithTagPriority** and of a **POOL_EXTENDED_PARAMETER**: `LowPoolPriority`, `NormalPoolPriority` or `HighPoolPriority`, each also with a special-pool variant that catches overruns or underruns. |
| **FILE_ATTRIBUTES**{: #FILE_ATTRIBUTES } | The `FILE_ATTRIBUTE_` constants, such as `FILE_ATTRIBUTE_NORMAL` and `FILE_ATTRIBUTE_HIDDEN`, with `INVALID_FILE_ATTRIBUTES`, for the *FileAttributes* of **ZwCreateFile**. |
| **FILE_DEVICE_CHARACTERISTICS**{: #FILE_DEVICE_CHARACTERISTICS } | The characteristics of a device, such as `FILE_DEVICE_SECURE_OPEN` and `FILE_REMOVABLE_MEDIA`, for **DEVICE_OBJECT.Characteristics** and the *DeviceCharacteristics* of **IoCreateDevice**, a **Long**. |
| **FILE_OBJECT_FLAGS**{: #FILE_OBJECT_FLAGS } | The `FO_` flags of **FILE_OBJECT.Flags**, such as `FO_SYNCHRONOUS_IO` and `FO_CLEANUP_COMPLETE`. |
| **FileAccessFlags**{: #FileAccessFlags } | The `FILE_` create options of **ZwCreateFile**'s *CreateOptions*, such as `FILE_NON_DIRECTORY_FILE` and `FILE_SYNCHRONOUS_IO_NONALERT`, with the `FILE_VALID_` masks. |
| **FileAccessRights**{: #FileAccessRights } | The access rights of a file, directory or pipe, from `FILE_READ_DATA` to `FILE_WRITE_ATTRIBUTES`, with `FILE_ALL_ACCESS` and the `FILE_GENERIC_` combinations, for the *DesiredAccess* of **ZwCreateFile** and of **FltCreateFile** (modFltMgr). |
| **FileCreateDisposition**{: #FileCreateDisposition } | What **ZwCreateFile** does when the file exists or does not, its *CreateDisposition*: `FILE_SUPERSEDE`, `FILE_OPEN`, `FILE_CREATE`, `FILE_OPEN_IF`, `FILE_OVERWRITE` or `FILE_OVERWRITE_IF`. |
| **FileCreateOutcome**{: #FileCreateOutcome } | What **ZwCreateFile** did, as it returns it in **IO_STATUS_BLOCK.Information**: `FILE_CREATED`, `FILE_OPENED`, `FILE_OVERWRITTEN` and the others. |
| **FileShareMode**{: #FileShareMode } | The `FILE_SHARE_READ`, `FILE_SHARE_WRITE` and `FILE_SHARE_DELETE` constants, for **ZwCreateFile**'s *ShareAccess*. |
| **GenericRights**{: #GenericRights } | The generic access rights `GENERIC_READ`, `GENERIC_WRITE`, `GENERIC_EXECUTE` and `GENERIC_ALL`, which the object's type maps to its own rights, for a *DesiredAccess* such as that of **ZwCreateFile**, **ZwOpenKey** or **ObOpenObjectByPointer**. |
| **GROUP_SID_ATTRIBUTES**{: #GROUP_SID_ATTRIBUTES } | The `SE_GROUP_` attributes of a group in a token, for **SID_AND_ATTRIBUTES.Attributes**, such as `SE_GROUP_ENABLED` and `SE_GROUP_LOGON_ID`. |
| **HARDERROR_RESPONSE**{: #HARDERROR_RESPONSE } | The button the user chose in the box that **ExRaiseHardError** shows, as it returns it in *Response*, and the result of **MsgBox**: `HardError_ResponseOk`, `HardError_ResponseCancel` and the others. Not documented by Microsoft. |
| **HARDERROR_RESPONSE_OPTION**{: #HARDERROR_RESPONSE_OPTION } | The buttons that **ExRaiseHardError** offers, its *ValidResponseOptions*: `HardError_OptionOk`, `HardError_OptionYesNo` and the others. Not documented by Microsoft. |
| **HeapFlags**{: #HeapFlags } | The `HEAP_` flags of **RtlCreateHeap**, **RtlAllocateHeap** and **RtlFreeHeap**, such as `HEAP_GROWABLE`, `HEAP_ZERO_MEMORY` and `HEAP_NO_SERIALIZE`, with the heap classes and the tag masks. Some members share a value, as in C, because they belong to different routines. |
| **IO_TYPE**{: #IO_TYPE } | The value of the **Type** field that starts an I/O manager object, such as `IO_TYPE_DRIVER` for a **DRIVER_OBJECT** and `IO_TYPE_IRP` for an **IRP**. |
| **IoCreateFileFlags**{: #IoCreateFileFlags } | The `IO_` options of the I/O manager's create routines, such as `IO_IGNORE_SHARE_ACCESS_CHECK` and `IO_STOP_ON_SYMLINK`, for the *Flags* of **FltCreateFile** and its variants (modFltMgr). |
| **IoStackLocFlags**{: #IoStackLocFlags } | The `SL_` flags of **IO_STACK_LOCATION.Flags**, a **Byte**, such as `SL_WRITE_THROUGH` and `SL_OVERRIDE_VERIFY_VOLUME`; **FLT_IO_PARAMETER_BLOCK.OperationFlags** (modFltMgr) holds them too. |
| **IrpFlags**{: #IrpFlags } | The `IRP_` flags of **IRP.Flags**, such as `IRP_PAGING_IO` and `IRP_NOCACHE`, and the allocation flags of **IRP.AllocationFlags**, from `IRP_QUOTA_CHARGED` to `IRP_LOOKASIDE_ALLOCATION`, whose values other members share. |
| [**KEY_INFORMATION_CLASS**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ne-wdm-_key_information_class){: #KEY_INFORMATION_CLASS } | Which structure **ZwQueryKey** and **ZwEnumerateKey** return about a registry key, such as `KeyBasicInformation` or `KeyFullInformation`; **REG_QUERY_KEY_INFORMATION** and **REG_ENUMERATE_KEY_INFORMATION** pass it to a registry callback. |
| [**KEY_SET_INFORMATION_CLASS**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ne-wdm-_key_set_information_class){: #KEY_SET_INFORMATION_CLASS } | Which information **ZwSetInformationKey** sets for a registry key, such as `KeyWriteTimeInformation`; **REG_SET_INFORMATION_KEY_INFORMATION** passes it to a registry callback. |
| [**KEY_VALUE_INFORMATION_CLASS**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ne-wdm-_key_value_information_class){: #KEY_VALUE_INFORMATION_CLASS } | Which structure **ZwQueryValueKey** and **ZwEnumerateValueKey** return about a value, such as `KeyValuePartialInformation`; **REG_QUERY_VALUE_KEY_INFORMATION** and **REG_ENUMERATE_VALUE_KEY_INFORMATION** pass it to a registry callback. |
| **KPRIORITY**{: #KPRIORITY } | A thread priority, from 0 to 31, for **KeSetPriorityThread**; its members name the limits: `LOW_PRIORITY`, `LOW_REALTIME_PRIORITY`, `HIGH_PRIORITY` and `MAXIMUM_PRIORITY`, the number of levels. |
| **KWAIT_REASON**{: #KWAIT_REASON } | Why a thread waits, for **KeWaitForSingleObject**'s *WaitReason*: a driver passes `Executive`, or `UserRequest` when it waits on behalf of a user. |
| **MDL_FLAGS**{: #MDL_FLAGS } | The `MDL_` flags of **MDL.MdlFlags**, such as `MDL_PAGES_LOCKED` and `MDL_MAPPED_TO_SYSTEM_VA`. |
| **MdlMappingFlags**{: #MdlMappingFlags } | The flags `MdlMappingNoWrite`, `MdlMappingNoExecute` and `MdlMappingWithGuardPtes`, combined with **Or** with an **MM_PAGE_PRIORITY** in the *Priority* of **MmMapLockedPagesSpecifyCache** and **MmGetSystemAddressForMdlSafe**. |
| **MemAllocType**{: #MemAllocType } | The `MEM_` constants, such as `MEM_COMMIT`, `MEM_RESERVE` and `MEM_TOP_DOWN`, for **ZwMapViewOfSection**'s *AllocationType*, with the free types `MEM_DECOMMIT` and `MEM_RELEASE` and the region types such as `MEM_IMAGE`. Some members share a value, as in C, because they belong to different routines. |
| [**MEMORY_CACHING_TYPE**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ne-wdm-_memory_caching_type){: #MEMORY_CACHING_TYPE } | How the processor caches a mapping, for **MmMapLockedPagesSpecifyCache**'s *CacheType*: `MmCached`, `MmNonCached`, `MmWriteCombined` and the others. See the note below. |
| **MemProtectFlags**{: #MemProtectFlags } | The `PAGE_` memory protections, such as `PAGE_READWRITE` and `PAGE_EXECUTE_READ`, with the modifiers `PAGE_GUARD`, `PAGE_NOCACHE` and `PAGE_WRITECOMBINE`, for **ZwCreateSection**'s *SectionPageProtection* and **ZwMapViewOfSection**'s *Win32Protect*. |
| **MessageBoxFlags**{: #MessageBoxFlags } | The `MB_` constants of `winuser.h`, such as `MB_OKCANCEL` and `MB_ICONERROR`, for the buttons, icon and default button of **MsgBox**. |
| **MM_COPY_FLAGS**{: #MM_COPY_FLAGS } | Whether the source address of **MmCopyMemory** is physical (`MM_COPY_MEMORY_PHYSICAL`) or virtual (`MM_COPY_MEMORY_VIRTUAL`), its *Flags*. |
| **MM_PAGE_PRIORITY**{: #MM_PAGE_PRIORITY } | How important it is that a mapping succeeds when system memory is short, for the *Priority* of **MmMapLockedPagesSpecifyCache** and **MmGetSystemAddressForMdlSafe**: `LowPagePriority`, `NormalPagePriority` or `HighPagePriority`. |
| **NT_LPC_MSG_TYPE**{: #NT_LPC_MSG_TYPE } | The kind of message in **LPC_MESSAGE.MessageType**, such as `LPC_REQUEST` and `LPC_REPLY`. Not documented by Microsoft. |
| **NT_PRODUCT_TYPE**{: #NT_PRODUCT_TYPE } | The kind of Windows installation in **KUSER_SHARED_DATA.NtProductType**: a workstation (`NtProductWinNt`), a domain controller (`NtProductLanManNt`) or a server (`NtProductServer`). |
| **NtFileQueryFlags**{: #NtFileQueryFlags } | The `SL_` flags of **ZwQueryDirectoryFileEx**'s *QueryFlags*, such as `SL_RESTART_SCAN` and `SL_RETURN_SINGLE_ENTRY`, with `SL_QUERY_DIRECTORY_MASK`, the flags it accepts. |
| **NtLoadKeyExFlags**{: #NtLoadKeyExFlags } | The *Flags* of **ZwLoadKeyEx**, under names of the package's own: `NTLKEF_AppKey` has the value of `REG_APP_HIVE` and `NTLKEF_ReadOnly` that of `REG_OPEN_READ_ONLY`. Not documented by Microsoft. |
| **NTSectionAccessRights**{: #NTSectionAccessRights } | The access rights of a section object, from `SECTION_QUERY` to `SECTION_ALL_ACCESS`, for the *DesiredAccess* of **ZwCreateSection** and **ZwOpenSection**. `SECTION_ALL_ACCESS` does not include `SECTION_MAP_EXECUTE_EXPLICIT`. |
| **NTSTATUS**{: #NTSTATUS } | The status codes that most routines of the package return, the `STATUS_` values of `ntstatus.h` from `STATUS_SUCCESS` on, with the Filter Manager's `STATUS_FLT_` codes; **NT_SUCCESS** tells success from failure. See the note below. |
| **OB_OPERATION**{: #OB_OPERATION } | The handle operations an object callback is called for, `OB_OPERATION_HANDLE_CREATE` and `OB_OPERATION_HANDLE_DUPLICATE`, for **OB_OPERATION_REGISTRATION.Operations** and the **Operation** of **OB_PRE_OPERATION_INFORMATION** and **OB_POST_OPERATION_INFORMATION**. |
| **OB_PREOP_CALLBACK_STATUS**{: #OB_PREOP_CALLBACK_STATUS } | What a pre-operation callback registered with **ObRegisterCallbacks** returns: `OB_PREOP_SUCCESS`, its one value. |
| **ObjectAttributeValues**{: #ObjectAttributeValues } | The `OBJ_` attributes, such as `OBJ_KERNEL_HANDLE` and `OBJ_CASE_INSENSITIVE`, for **OBJECT_ATTRIBUTES.Attributes**, the *a* of **InitializeObjectAttributes** and the *HandleAttributes* of **ObOpenObjectByPointer** and **ZwDuplicateObject**. |
| **OwnerEntryFlags**{: #OwnerEntryFlags } | Names of the package's own for the three one-bit fields at the start of **OWNER_ENTRY.TableSizeOrFlags**: `OEF_IoPriorityBoosted`, `OEF_OwnerReferenced` and `OEF_IoQoSPriorityBoosted`. |
| [**POOL_EXTENDED_PARAMETER_TYPE**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ne-wdm-pool_extended_parameter_type){: #POOL_EXTENDED_PARAMETER_TYPE } | The type of a **POOL_EXTENDED_PARAMETER**: `PoolExtendedParameterPriority`, `PoolExtendedParameterSecurePool` or `PoolExtendedParameterNumaNode`. See the note below. |
| [**POOL_TYPE**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ne-wdm-_pool_type){: #POOL_TYPE } | The kind of memory **ExAllocatePoolWithTag** allocates, its *PoolType*, also in **GENERAL_LOOKASIDE_LAYOUT.Type**: `NonPagedPoolNx`, `PagedPool` and the others. See the warning below. |
| **PortAccessRights**{: #PortAccessRights } | The access rights of an LPC port: `PORT_CONNECT` and `PORT_ALL_ACCESS`. Not documented by Microsoft. |
| **PROCESS_CREATE_FLAGS**{: #PROCESS_CREATE_FLAGS } | The `PROCESS_CREATE_FLAGS_` flags of **ZwCreateUserProcess**'s *ProcessFlags*, such as `PROCESS_CREATE_FLAGS_SUSPENDED` and `PROCESS_CREATE_FLAGS_INHERIT_HANDLES`; the source marks some as for `NtCreateProcessEx` only, which the package does not declare. Not documented by Microsoft. |
| **ProcessAccessRights**{: #ProcessAccessRights } | The `PROCESS_` access rights of a process, such as `PROCESS_TERMINATE` and `PROCESS_QUERY_LIMITED_INFORMATION`, for the *DesiredAccess* of **ZwOpenProcess** and the access fields of the object callbacks' structures, such as **OB_PRE_CREATE_HANDLE_INFORMATION.DesiredAccess**. See the note below. |
| **PS_ATTRIBUTE_ID**{: #PS_ATTRIBUTE_ID } | The IDs of **PS_ATTRIBUTE.Attribute**, such as `PS_ATTRIBUTE_IMAGE_NAME` and `PS_ATTRIBUTE_PARENT_PROCESS`: each is a **PS_ATTRIBUTE_NUM** combined with the bits `PS_ATTRIBUTE_THREAD`, `PS_ATTRIBUTE_INPUT` and `PS_ATTRIBUTE_ADDITIVE` that apply to it. Not documented by Microsoft. |
| **PS_ATTRIBUTE_NUM**{: #PS_ATTRIBUTE_NUM } | The numbers of the process creation attributes, from `PsAttributeParentProcess` to `PsAttributeMax`, which the low 16 bits of a **PS_ATTRIBUTE_ID** hold. Not documented by Microsoft. |
| **PS_CREATE_STATE**{: #PS_CREATE_STATE } | How far **ZwCreateUserProcess** got, as **PS_CREATE_INFO.State** holds it: `PsCreateSuccess`, or the step that failed, such as `PsCreateFailOnFileOpen` or `PsCreateFailExeFormat`. Not documented by Microsoft. |
| **PS_MITIGATION_OPTION**{: #PS_MITIGATION_OPTION } | The positions of the mitigation options in the value of a `PS_ATTRIBUTE_MITIGATION_OPTIONS` attribute, such as `PS_MITIGATION_OPTION_NX` and `PS_MITIGATION_OPTION_CONTROL_FLOW_GUARD`; each option has 4 bits of the value. Not documented by Microsoft. |
| **PS_STD_HANDLE_STATE**{: #PS_STD_HANDLE_STATE } | When the standard handles are duplicated into the new process, for **PS_STD_HANDLE_INFO.Flags**: `PsNeverDuplicate`, `PsRequestDuplicate` (those of the mask, when the subsystem type matches the image's) or `PsAlwaysDuplicate`. Not documented by Microsoft. |
| **PS_STD_HANDLES**{: #PS_STD_HANDLES } | The standard handles `PS_STD_INPUT_HANDLE`, `PS_STD_OUTPUT_HANDLE` and `PS_STD_ERROR_HANDLE`, for the mask in **PS_STD_HANDLE_INFO.Flags**. Not documented by Microsoft. |
| **PSCNI_Flags**{: #PSCNI_Flags } | Names of the package's own for the two one-bit fields of **PS_CREATE_NOTIFY_INFO.Flags**: `PSCNI_FILE_OPEN_NAME_AVAILABLE`, the image file name is the name used to open the file, and `PSCNI_IS_SUBSYSTEM_PROCESS`. |
| [**PSCREATETHREADNOTIFYTYPE**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/ne-ntddk-_pscreatethreadnotifytype){: #PSCREATETHREADNOTIFYTYPE } | Which threads a routine registered with **PsSetCreateThreadNotifyRoutineEx** is called for, its *NotifyType*: `PsCreateThreadNotifyNonSystem`, or `PsCreateThreadNotifySubsystems` for the threads of subsystem processes too. |
| [**REG_NOTIFY_CLASS**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ne-wdm-_reg_notify_class){: #REG_NOTIFY_CLASS } | The registry operation a callback registered with **CmRegisterCallback** or **CmRegisterCallbackEx** receives in *Argument1*, such as `RegNtPreCreateKeyEx` and `RegNtPostSetValueKey`; each older name without `Pre`, such as `RegNtDeleteKey`, has the value of its `Pre` form. |
| **RegistryCreateDispositions**{: #RegistryCreateDispositions } | What **ZwCreateKey** and **ZwCreateKeyTransacted** did, as they return it in *Disposition*: `REG_CREATED_NEW_KEY` or `REG_OPENED_EXISTING_KEY`. |
| **RegKeyRestoreAndLoadHiveFlags**{: #RegKeyRestoreAndLoadHiveFlags } | The `REG_` flags of the *Flags* of **ZwRestoreKey**, **ZwLoadKey2** and **ZwLoadKey3**, such as `REG_FORCE_RESTORE`, `REG_APP_HIVE` and `REG_OPEN_READ_ONLY`. |
| **RegNotifyChangeValues**{: #RegNotifyChangeValues } | The `REG_NOTIFY_` changes that **ZwNotifyChangeKey** and **ZwNotifyChangeMultipleKeys** watch for, their *CompletionFilter*, such as `REG_NOTIFY_CHANGE_NAME` and `REG_NOTIFY_CHANGE_LAST_SET`. |
| **RegOptions**{: #RegOptions } | The `REG_OPTION_` options, such as `REG_OPTION_VOLATILE`, for the *CreateOptions* of **ZwCreateKey** and **ZwCreateKeyTransacted** and the *OpenOptions* of **ZwOpenKeyEx** and **ZwOpenKeyTransactedEx**, with the masks `REG_LEGAL_OPTION` and `REG_OPEN_LEGAL_OPTION`. |
| [**REGSAM**](https://learn.microsoft.com/en-us/windows/win32/shell/regsam){: #REGSAM } | The access rights of a registry key, from `KEY_QUERY_VALUE` to `KEY_ALL_ACCESS`, with `KEY_WOW64_64KEY` and `KEY_WOW64_32KEY`, for the *DesiredAccess* of **ZwCreateKey**, **ZwOpenKey** and the other key routines, and **REG_LOAD_KEY_INFORMATION.DesiredAccess**. |
| **RegSaveKeyFlags**{: #RegSaveKeyFlags } | The format in which **ZwSaveKeyEx** saves a key, its *Format*, also in **REG_SAVE_KEY_INFORMATION.Format**: `REG_STANDARD_FORMAT`, `REG_LATEST_FORMAT` or `REG_NO_COMPRESSION`. |
| **REGTYPES**{: #REGTYPES } | The `REG_` types of a registry value, such as `REG_SZ`, `REG_DWORD` and `REG_BINARY`, for the *Type* of **ZwSetValueKey** and **KEY_VALUE_ENTRY.Type**. |
| **RegUnloadFlags**{: #RegUnloadFlags } | The *Flags* of **ZwUnloadKey2**: `REG_FORCE_UNLOAD` unloads the hive even when it has open handles. |
| **ReparseDataExFlags**{: #ReparseDataExFlags } | The flag of **FltTagFileEx**'s *Flags* (modFltMgr): `REPARSE_DATA_EX_FLAG_GIVEN_TAG_OR_NONE` sets the reparse tag only if the file has no tag or the tag given as the existing one. |
| **RTL_UPP_FLAGS**{: #RTL_UPP_FLAGS } | The flags of **RTL_USER_PROCESS_PARAMETERS.Flags** (modSysInfo), such as `RTL_USER_PROCESS_PARAMETERS_NORMALIZED` and `RTL_USER_PROCESS_PARAMETERS_CASE_SENSITIVE`. Not documented by Microsoft. |
| **RtlDupUnicodeStrFlags**{: #RtlDupUnicodeStrFlags } | The flags of **RtlDuplicateUnicodeString**: `RTL_DUPLICATE_UNICODE_STRING_NULL_TERMINATE`, which ends the copy with a null character, and `RTL_DUPLICATE_UNICODE_STRING_ALLOCATE_NULL_STRING`, which allocates a buffer even for an empty source. |
| **SE_PRIVILEGE_ATTR**{: #SE_PRIVILEGE_ATTR } | The `SE_PRIVILEGE_` attributes of a privilege in a token, for **LUID_AND_ATTRIBUTES.Attributes**, such as `SE_PRIVILEGE_ENABLED` and `SE_PRIVILEGE_REMOVED`. |
| **SecurePoolFlags**{: #SecurePoolFlags } | The flags of **POOL_EXTENDED_PARAMS_SECURE_POOL.SecurePoolFlags**: `SECURE_POOL_FLAGS_FREEABLE` and `SECURE_POOL_FLAGS_MODIFIABLE`, whether the allocation can be freed and changed. |
| [**SECURITY_DESCRIPTOR_CONTROL**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ifs/security-descriptor-control){: #SECURITY_DESCRIPTOR_CONTROL } | The `SE_` control bits of a security descriptor, such as `SE_DACL_PRESENT` and `SE_SELF_RELATIVE`, as **SECURITY_DESCRIPTOR.Control** holds them and **RtlGetControlSecurityDescriptor** and **RtlSetControlSecurityDescriptor** take them, each an **Integer**: C's type is a 16-bit `USHORT`. |
| [**SECURITY_IMPERSONATION_LEVEL**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ne-wdm-_security_impersonation_level){: #SECURITY_IMPERSONATION_LEVEL } | How far a server may act for a client whose token it holds, from `SecurityAnonymous` to `SecurityDelegation`, in the **ImpersonationLevel** of **TOKEN_STATISTICS** and **TOKEN_ACCESS_INFORMATION** (modSysInfo). |
| [**SECURITY_INFORMATION**](https://learn.microsoft.com/en-us/windows/win32/secauthz/security-information){: #SECURITY_INFORMATION } | The parts of a security descriptor that a call reads or sets, such as `OWNER_SECURITY_INFORMATION` and `DACL_SECURITY_INFORMATION`; the **SecurityInformation** fields of **REG_QUERY_KEY_SECURITY_INFORMATION** and **REG_SET_KEY_SECURITY_INFORMATION** point to such a value. |
| **SEF_FLAGS**{: #SEF_FLAGS } | The `SEF_` flags of **SeAssignSecurityEx**'s *AutoInheritFlags*, such as `SEF_DACL_AUTO_INHERIT` and `SEF_DEFAULT_OWNER_FROM_PARENT`: how the new security descriptor inherits from its parent, and which checks are skipped. |
| [**SID_NAME_USE**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ne-ntifs-_sid_name_use){: #SID_NAME_USE } | The kind of account a security identifier names: `SidTypeUser`, `SidTypeGroup`, `SidTypeWellKnownGroup` and the others. |
| **StandardAccessTypes**{: #StandardAccessTypes } | The access rights common to every kind of object, `DELETE`, `READ_CONTROL`, `WRITE_DAC`, `WRITE_OWNER` and `SYNCHRONIZE`, with the `STANDARD_RIGHTS_` combinations, `ACCESS_SYSTEM_SECURITY` and `MAXIMUM_ALLOWED`, to combine with an object's own rights in a *DesiredAccess*. |
| **SymbolicLinkAccessRights**{: #SymbolicLinkAccessRights } | The access rights of a symbolic link object, `SYMBOLIC_LINK_QUERY` and `SYMBOLIC_LINK_ALL_ACCESS`, for the *DesiredAccess* of **ZwOpenSymbolicLinkObject**. It has no `SYMBOLIC_LINK_SET`. |
| **THREAD_CREATE_FLAGS**{: #THREAD_CREATE_FLAGS } | The `THREAD_CREATE_FLAGS_` flags of **ZwCreateUserProcess**'s *ThreadFlags*, such as `THREAD_CREATE_FLAGS_CREATE_SUSPENDED`; the source marks the others as for `NtCreateThreadEx`, which the package does not declare. Not documented by Microsoft. |
| **ThreadAccessRights**{: #ThreadAccessRights } | The `THREAD_` access rights of a thread, such as `THREAD_TERMINATE` and `THREAD_QUERY_LIMITED_INFORMATION`. It has no `THREAD_ALL_ACCESS`. |
| [**TOKEN_TYPE**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ne-ntifs-_token_type){: #TOKEN_TYPE } | Whether a token is a primary token (`TokenPrimary`) or an impersonation token (`TokenImpersonation`), in the **TokenType** of **TOKEN_STATISTICS** and **TOKEN_ACCESS_INFORMATION** (modSysInfo). |
| **TokenAccessStateFlags**{: #TokenAccessStateFlags } | The flags of **ACCESS_STATE.Flags**, which are also an access token's flags, such as `TOKEN_HAS_TRAVERSE_PRIVILEGE` and `TOKEN_IS_RESTRICTED`. |
| **VBP_FLAGS**{: #VBP_FLAGS } | The `VPB_` flags of **VPB.Flags**, such as `VPB_MOUNTED` and `VPB_LOCKED`; the enumeration's name is spelt `VBP`. |
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

| Name | Value | Description |
|------|-------|-------------|
| **_DBL_RADIX**{: #_DBL_RADIX } | `2` | The base of the exponent of a **Double**. |
| **_I16_MAX**{: #_I16_MAX } | `32767` | The largest value of a signed 16-bit integer, an **Integer**. |
| **_I16_MIN**{: #_I16_MIN } | `(-32767 - 1)` | The smallest value of a signed 16-bit integer, an **Integer**. |
| **_I32_MAX**{: #_I32_MAX } | `2147483647` | The largest value of a signed 32-bit integer, a **Long**. |
| **_I32_MIN**{: #_I32_MIN } | `(-2147483647 - 1)` | The smallest value of a signed 32-bit integer, a **Long**. |
| **_I64_MAX**{: #_I64_MAX } | `9223372036854775807^` | The largest value of a signed 64-bit integer, a **LongLong**. |
| **_I64_MIN**{: #_I64_MIN } | `(-9223372036854775807^ - 1)` | The smallest value of a signed 64-bit integer, a **LongLong**. |
| **_I8_MAX**{: #_I8_MAX } | `127` | The largest value of a signed 8-bit integer, Microsoft's `__int8`. |
| **_I8_MIN**{: #_I8_MIN } | `(-127 - 1)` | The smallest value of a signed 8-bit integer, Microsoft's `__int8`. |
| **_UI16_MAX**{: #_UI16_MAX } | `&Hffff` | The largest value of an unsigned 16-bit integer. See the note below. |
| **_UI32_MAX**{: #_UI32_MAX } | `&Hffffffff` | The largest value of an unsigned 32-bit integer. |
| **_UI64_MAX**{: #_UI64_MAX } | `&Hffffffffffffffff^` | The largest value of an unsigned 64-bit integer. |
| **_UI8_MAX**{: #_UI8_MAX } | `&Hff` | The largest value of an unsigned 8-bit integer, a **Byte**. |
| **CHAR_BIT**{: #CHAR_BIT } | `8` | The number of bits in a `char`, the C type of one byte. |
| **CHAR_MAX**{: #CHAR_MAX } | `UCHAR_MAX` | The largest value of a `char`, taken as unsigned as for **CHAR_MIN**: **UCHAR_MAX**. |
| **CHAR_MIN**{: #CHAR_MIN } | `0` | The smallest value of a `char`, which the package takes as unsigned, as a **Byte** is. In C `char` is signed unless the `/J` option is given, and `CHAR_MIN` is then **SCHAR_MIN**. |
| **CM_EXTENDED_PARAMETER_TYPE_BITS**{: #CM_EXTENDED_PARAMETER_TYPE_BITS } | `8` | The width in bits of the type field at the start of a **CM_EXTENDED_PARAMETER**. Not documented by Microsoft. |
| **DBL_DECIMAL_DIG**{: #DBL_DECIMAL_DIG } | `17` | The number of decimal digits that a **Double** needs to be written as text and read back unchanged. |
| **DBL_DIG**{: #DBL_DIG } | `15` | The number of decimal digits that a **Double** holds without change. |
| **DBL_EPSILON**{: #DBL_EPSILON } | `2.2204460492503131e-016#` | The difference between 1 and the next larger **Double**. |
| **DBL_HAS_SUBNORM**{: #DBL_HAS_SUBNORM } | `1` | A **Double** has subnormal numbers: 1 for yes. |
| **DBL_MANT_DIG**{: #DBL_MANT_DIG } | `53` | The number of bits in the mantissa of a **Double**, the implicit leading bit included. |
| **DBL_MAX**{: #DBL_MAX } | `1.7976931348623158e+308#` | The largest finite **Double**. |
| **DBL_MAX_10_EXP**{: #DBL_MAX_10_EXP } | `308` | The largest *e* for which 10 to the power *e* is a finite **Double**. |
| **DBL_MAX_EXP**{: #DBL_MAX_EXP } | `1024` | The largest *e* for which 2 to the power (*e* - 1) is a finite **Double**. |
| **DBL_MIN**{: #DBL_MIN } | `2.2250738585072014e-308#` | The smallest positive normalized **Double**. |
| **DBL_MIN_10_EXP**{: #DBL_MIN_10_EXP } | `(-307)` | The smallest *e* for which 10 to the power *e* is a normalized **Double**. |
| **DBL_MIN_EXP**{: #DBL_MIN_EXP } | `(-1021)` | The smallest *e* for which 2 to the power (*e* - 1) is a normalized **Double**. |
| **DBL_TRUE_MIN**{: #DBL_TRUE_MIN } | `4.9406564584124654e-324#` | The smallest positive **Double**, a subnormal number. |
| **EVENT_INCREMENT**{: #EVENT_INCREMENT } | `&H1` | For the *Increment* of **KeSetEvent**: the priority boost of a thread whose wait the event ends. |
| **FILE_ANY_ACCESS**{: #FILE_ANY_ACCESS } | `&H0` | For **CTL_CODE**: the I/O control code needs no particular access to the file. |
| **FILE_READ_ACCESS**{: #FILE_READ_ACCESS } | `&H1` | For **CTL_CODE**: the caller needs read access to the file. |
| **FILE_WRITE_ACCESS**{: #FILE_WRITE_ACCESS } | `&H2` | For **CTL_CODE**: the caller needs write access to the file. |
| **FLT_DECIMAL_DIG**{: #FLT_DECIMAL_DIG } | `9` | The number of decimal digits that a **Single** needs to be written as text and read back unchanged. |
| **FLT_DIG**{: #FLT_DIG } | `6` | The number of decimal digits that a **Single** holds without change. |
| **FLT_EPSILON**{: #FLT_EPSILON } | `1.192092896e-07!` | The difference between 1 and the next larger **Single**. |
| **FLT_GUARD**{: #FLT_GUARD } | `0` | A constant that float.h defines as 0, and does not describe. |
| **FLT_HAS_SUBNORM**{: #FLT_HAS_SUBNORM } | `1` | A **Single** has subnormal numbers: 1 for yes. |
| **FLT_MANT_DIG**{: #FLT_MANT_DIG } | `24` | The number of bits in the mantissa of a **Single**, the implicit leading bit included. |
| **FLT_MAX**{: #FLT_MAX } | `3.402823466e+38!` | The largest finite **Single**. |
| **FLT_MAX_10_EXP**{: #FLT_MAX_10_EXP } | `38` | The largest *e* for which 10 to the power *e* is a finite **Single**. |
| **FLT_MAX_EXP**{: #FLT_MAX_EXP } | `128` | The largest *e* for which 2 to the power (*e* - 1) is a finite **Single**. |
| **FLT_MIN**{: #FLT_MIN } | `1.175494351E-38!` | The smallest positive normalized **Single**. |
| **FLT_MIN_10_EXP**{: #FLT_MIN_10_EXP } | `(-37)` | The smallest *e* for which 10 to the power *e* is a normalized **Single**. |
| **FLT_MIN_EXP**{: #FLT_MIN_EXP } | `(-125)` | The smallest *e* for which 2 to the power (*e* - 1) is a normalized **Single**. |
| **FLT_NORMALIZE**{: #FLT_NORMALIZE } | `0` | A constant that float.h defines as 0, and does not describe. |
| **FLT_RADIX**{: #FLT_RADIX } | `2` | The base of the exponent of a floating-point number, for every C floating-point type. |
| **FLT_TRUE_MIN**{: #FLT_TRUE_MIN } | `1.401298464E-45!` | The smallest positive **Single**, a subnormal number. |
| **FSCTL_OFFLOAD_WRITE**{: #FSCTL_OFFLOAD_WRITE } | `&H98268` | The file-system control code of an offload write, which writes a range of a file from a token that an offload read returned. |
| **FTTYPE**{: #FTTYPE } | `&H66` | The device type of the fault-tolerant disk driver's I/O control codes, the character `f`; **InitIOCTLs** builds **FT_BALANCED_READ_MODE** from it. |
| **HARDERROR_OVERRIDE_ERRORMODE**{: #HARDERROR_OVERRIDE_ERRORMODE } | `&H10000000` | A flag added to the status passed to **ExRaiseHardError** that overrides the error mode of the process; **MsgBox** uses it. Not documented by Microsoft. |
| **INITIAL_PRIVILEGE_COUNT**{: #INITIAL_PRIVILEGE_COUNT } | `3` | The number of privileges that an **INITIAL_PRIVILEGE_SET** holds, the length of its **Privilege** array. |
| **INT_MAX**{: #INT_MAX } | `2147483647` | The largest value of an `int`, a **Long**. |
| **INT_MIN**{: #INT_MIN } | `(-2147483647 - 1)` | The smallest value of an `int`, a **Long**. |
| **IO_CD_ROM_INCREMENT**{: #IO_CD_ROM_INCREMENT } | `1` | For the *PriorityBoost* of **IoCompleteRequest**, in a CD-ROM device driver or file system. |
| **IO_DISK_INCREMENT**{: #IO_DISK_INCREMENT } | `1` | For the *PriorityBoost* of **IoCompleteRequest**, in a disk device driver or file system. |
| **IO_KEYBOARD_INCREMENT**{: #IO_KEYBOARD_INCREMENT } | `6` | For the *PriorityBoost* of **IoCompleteRequest**, in a keyboard device driver. |
| **IO_MAILSLOT_INCREMENT**{: #IO_MAILSLOT_INCREMENT } | `2` | For the *PriorityBoost* of **IoCompleteRequest**, in the mailslot file system. |
| **IO_MOUSE_INCREMENT**{: #IO_MOUSE_INCREMENT } | `6` | For the *PriorityBoost* of **IoCompleteRequest**, in a mouse device driver. |
| **IO_NAMED_PIPE_INCREMENT**{: #IO_NAMED_PIPE_INCREMENT } | `2` | For the *PriorityBoost* of **IoCompleteRequest**, in the named pipe file system. |
| **IO_NETWORK_INCREMENT**{: #IO_NETWORK_INCREMENT } | `2` | For the *PriorityBoost* of **IoCompleteRequest**, in a network device driver or network file system. |
| **IO_NO_INCREMENT**{: #IO_NO_INCREMENT } | `&H0` | For the *PriorityBoost* of **IoCompleteRequest**: the waiting thread gets no priority boost. |
| **IO_PARALLEL_INCREMENT**{: #IO_PARALLEL_INCREMENT } | `1` | For the *PriorityBoost* of **IoCompleteRequest**, in a parallel port device driver. |
| **IO_REMOUNT**{: #IO_REMOUNT } | `&H1` | For **IO_STATUS_BLOCK.Information** with `STATUS_REPARSE`: the file system has remounted the volume. |
| **IO_REPARSE**{: #IO_REPARSE } | `&H0` | For **IO_STATUS_BLOCK.Information** with `STATUS_REPARSE`: the file name has been replaced and the open is to be tried again. |
| **IO_REPARSE_GLOBAL**{: #IO_REPARSE_GLOBAL } | `&H2` | For **IO_STATUS_BLOCK.Information** with `STATUS_REPARSE`: as **IO_REPARSE**, with the new name resolved in the global namespace. |
| **IO_SERIAL_INCREMENT**{: #IO_SERIAL_INCREMENT } | `2` | For the *PriorityBoost* of **IoCompleteRequest**, in a serial port device driver. |
| **IO_SOUND_INCREMENT**{: #IO_SOUND_INCREMENT } | `8` | For the *PriorityBoost* of **IoCompleteRequest**, in a sound device driver. |
| **IO_VIDEO_INCREMENT**{: #IO_VIDEO_INCREMENT } | `1` | For the *PriorityBoost* of **IoCompleteRequest**, in a video device driver. |
| **IOCTL_DISK_BASE**{: #IOCTL_DISK_BASE } | `FILE_DEVICE_DISK` | The device type of the disk I/O control codes, `FILE_DEVICE_DISK`; **InitIOCTLs** builds the `IOCTL_DISK_` codes from it. |
| **IRP_MJ_CLEANUP**{: #IRP_MJ_CLEANUP } | `&H12` | The major function code of a request sent when the last handle to a file object is closed. |
| **IRP_MJ_CLOSE**{: #IRP_MJ_CLOSE } | `&H02` | The major function code of a request sent when the last reference to a file object is released. |
| **IRP_MJ_CREATE**{: #IRP_MJ_CREATE } | `&H00` | The major function code of a request to open or create a file or device. |
| **IRP_MJ_CREATE_MAILSLOT**{: #IRP_MJ_CREATE_MAILSLOT } | `&H13` | The major function code of a request to create a mailslot. |
| **IRP_MJ_CREATE_NAMED_PIPE**{: #IRP_MJ_CREATE_NAMED_PIPE } | `&H01` | The major function code of a request to create a named pipe. |
| **IRP_MJ_DEVICE_CHANGE**{: #IRP_MJ_DEVICE_CHANGE } | `&H18` | A major function code of an IRP, which wdm.h defines between **IRP_MJ_SYSTEM_CONTROL** and **IRP_MJ_QUERY_QUOTA**. Not documented by Microsoft. |
| **IRP_MJ_DEVICE_CONTROL**{: #IRP_MJ_DEVICE_CONTROL } | `&H0e` | The major function code of an I/O control request, from **ZwDeviceIoControlFile** or `DeviceIoControl` in a user-mode program. |
| **IRP_MJ_DIRECTORY_CONTROL**{: #IRP_MJ_DIRECTORY_CONTROL } | `&H0c` | The major function code of a request to list a directory or to watch it for changes. |
| **IRP_MJ_FILE_SYSTEM_CONTROL**{: #IRP_MJ_FILE_SYSTEM_CONTROL } | `&H0d` | The major function code of a file-system control request, such as a mount or an `FSCTL_` code. |
| **IRP_MJ_FLUSH_BUFFERS**{: #IRP_MJ_FLUSH_BUFFERS } | `&H09` | The major function code of a request to write a file's cached data to the device. |
| **IRP_MJ_INTERNAL_DEVICE_CONTROL**{: #IRP_MJ_INTERNAL_DEVICE_CONTROL } | `&H0f` | The major function code of an I/O control request sent from one driver to another in kernel mode. |
| **IRP_MJ_LOCK_CONTROL**{: #IRP_MJ_LOCK_CONTROL } | `&H11` | The major function code of a request to lock or unlock a byte range of a file. |
| **IRP_MJ_MAXIMUM_FUNCTION**{: #IRP_MJ_MAXIMUM_FUNCTION } | `&H1B` | The highest major function code, the upper bound of **DRIVER_OBJECT.MajorFunction**. |
| **IRP_MJ_PNP**{: #IRP_MJ_PNP } | `&H1B` | The major function code of a Plug and Play request; its minor function code says which. |
| **IRP_MJ_POWER**{: #IRP_MJ_POWER } | `&H16` | The major function code of a power management request; its minor function code says which. |
| **IRP_MJ_QUERY_EA**{: #IRP_MJ_QUERY_EA } | `&H07` | The major function code of a request to read a file's extended attributes. |
| **IRP_MJ_QUERY_INFORMATION**{: #IRP_MJ_QUERY_INFORMATION } | `&H05` | The major function code of a request to read information about a file. |
| **IRP_MJ_QUERY_QUOTA**{: #IRP_MJ_QUERY_QUOTA } | `&H19` | The major function code of a request to read the disk quota entries of a volume. |
| **IRP_MJ_QUERY_SECURITY**{: #IRP_MJ_QUERY_SECURITY } | `&H14` | The major function code of a request to read the security descriptor of a file. |
| **IRP_MJ_QUERY_VOLUME_INFORMATION**{: #IRP_MJ_QUERY_VOLUME_INFORMATION } | `&H0a` | The major function code of a request to read information about a volume. |
| **IRP_MJ_READ**{: #IRP_MJ_READ } | `&H03` | The major function code of a request to read data. |
| **IRP_MJ_SCSI**{: #IRP_MJ_SCSI } | `IRP_MJ_INTERNAL_DEVICE_CONTROL` | The major function code of a SCSI request, the same as **IRP_MJ_INTERNAL_DEVICE_CONTROL**. |
| **IRP_MJ_SET_EA**{: #IRP_MJ_SET_EA } | `&H08` | The major function code of a request to write a file's extended attributes. |
| **IRP_MJ_SET_INFORMATION**{: #IRP_MJ_SET_INFORMATION } | `&H06` | The major function code of a request to change information about a file, such as its name or size. |
| **IRP_MJ_SET_QUOTA**{: #IRP_MJ_SET_QUOTA } | `&H1A` | The major function code of a request to change the disk quota entries of a volume. |
| **IRP_MJ_SET_SECURITY**{: #IRP_MJ_SET_SECURITY } | `&H15` | The major function code of a request to change the security descriptor of a file. |
| **IRP_MJ_SET_VOLUME_INFORMATION**{: #IRP_MJ_SET_VOLUME_INFORMATION } | `&H0b` | The major function code of a request to change information about a volume, such as its label. |
| **IRP_MJ_SHUTDOWN**{: #IRP_MJ_SHUTDOWN } | `&H10` | The major function code of the request sent to a driver that registered for it when the system shuts down. |
| **IRP_MJ_SYSTEM_CONTROL**{: #IRP_MJ_SYSTEM_CONTROL } | `&H17` | The major function code of a Windows Management Instrumentation (WMI) request; its minor function code says which. |
| **IRP_MJ_WRITE**{: #IRP_MJ_WRITE } | `&H04` | The major function code of a request to write data. |
| **IRP_MN_CANCEL_REMOVE_DEVICE**{: #IRP_MN_CANCEL_REMOVE_DEVICE } | `&H03` | With **IRP_MJ_PNP**: a removal that was queried does not take place. |
| **IRP_MN_CANCEL_STOP_DEVICE**{: #IRP_MN_CANCEL_STOP_DEVICE } | `&H06` | With **IRP_MJ_PNP**: a stop that was queried does not take place. |
| **IRP_MN_CHANGE_SINGLE_INSTANCE**{: #IRP_MN_CHANGE_SINGLE_INSTANCE } | `&H02` | With **IRP_MJ_SYSTEM_CONTROL**: changes every data item of one instance of a WMI data block. |
| **IRP_MN_CHANGE_SINGLE_ITEM**{: #IRP_MN_CHANGE_SINGLE_ITEM } | `&H03` | With **IRP_MJ_SYSTEM_CONTROL**: changes one data item of an instance of a WMI data block. |
| **IRP_MN_DEVICE_ENUMERATED**{: #IRP_MN_DEVICE_ENUMERATED } | `&H19` | With **IRP_MJ_PNP**: tells a bus driver that the Plug and Play manager has enumerated one of its child devices. |
| **IRP_MN_DEVICE_USAGE_NOTIFICATION**{: #IRP_MN_DEVICE_USAGE_NOTIFICATION } | `&H16` | With **IRP_MJ_PNP**: the device holds, or no longer holds, a paging, hibernation or crash dump file. |
| **IRP_MN_DISABLE_COLLECTION**{: #IRP_MN_DISABLE_COLLECTION } | `&H07` | With **IRP_MJ_SYSTEM_CONTROL**: stops the collection of data for a WMI data block. |
| **IRP_MN_DISABLE_EVENTS**{: #IRP_MN_DISABLE_EVENTS } | `&H05` | With **IRP_MJ_SYSTEM_CONTROL**: stops the events of a WMI event block. |
| **IRP_MN_EJECT**{: #IRP_MN_EJECT } | `&H11` | With **IRP_MJ_PNP**: ejects the device from its slot. |
| **IRP_MN_ENABLE_COLLECTION**{: #IRP_MN_ENABLE_COLLECTION } | `&H06` | With **IRP_MJ_SYSTEM_CONTROL**: starts the collection of data for a WMI data block. |
| **IRP_MN_ENABLE_EVENTS**{: #IRP_MN_ENABLE_EVENTS } | `&H04` | With **IRP_MJ_SYSTEM_CONTROL**: starts the events of a WMI event block. |
| **IRP_MN_EXECUTE_METHOD**{: #IRP_MN_EXECUTE_METHOD } | `&H09` | With **IRP_MJ_SYSTEM_CONTROL**: runs a method of a WMI data block. |
| **IRP_MN_FILTER_RESOURCE_REQUIREMENTS**{: #IRP_MN_FILTER_RESOURCE_REQUIREMENTS } | `&H0D` | With **IRP_MJ_PNP**: lets a driver change the hardware resources the device asks for before they are assigned. |
| **IRP_MN_POWER_SEQUENCE**{: #IRP_MN_POWER_SEQUENCE } | `&H01` | With **IRP_MJ_POWER**: asks for the device's power sequence values, which show whether it has lost power. |
| **IRP_MN_QUERY_ALL_DATA**{: #IRP_MN_QUERY_ALL_DATA } | `&H00` | With **IRP_MJ_SYSTEM_CONTROL**: reads every instance of a WMI data block. |
| **IRP_MN_QUERY_BUS_INFORMATION**{: #IRP_MN_QUERY_BUS_INFORMATION } | `&H15` | With **IRP_MJ_PNP**: asks for the type and number of the bus the device is on. |
| **IRP_MN_QUERY_CAPABILITIES**{: #IRP_MN_QUERY_CAPABILITIES } | `&H09` | With **IRP_MJ_PNP**: asks for the device's Plug and Play and power capabilities. |
| **IRP_MN_QUERY_DEVICE_RELATIONS**{: #IRP_MN_QUERY_DEVICE_RELATIONS } | `&H07` | With **IRP_MJ_PNP**: asks for the devices related to this one, such as its children on a bus. |
| **IRP_MN_QUERY_DEVICE_TEXT**{: #IRP_MN_QUERY_DEVICE_TEXT } | `&H0C` | With **IRP_MJ_PNP**: asks for the device's description or location text. |
| **IRP_MN_QUERY_ID**{: #IRP_MN_QUERY_ID } | `&H13` | With **IRP_MJ_PNP**: asks for one of the device's identifiers, such as its hardware ID. |
| **IRP_MN_QUERY_INTERFACE**{: #IRP_MN_QUERY_INTERFACE } | `&H08` | With **IRP_MJ_PNP**: asks for a direct-call interface of the driver. |
| **IRP_MN_QUERY_PNP_DEVICE_STATE**{: #IRP_MN_QUERY_PNP_DEVICE_STATE } | `&H14` | With **IRP_MJ_PNP**: asks for the device's Plug and Play state, such as whether it has failed. |
| **IRP_MN_QUERY_POWER**{: #IRP_MN_QUERY_POWER } | `&H03` | With **IRP_MJ_POWER**: asks whether the device can change to a given power state. |
| **IRP_MN_QUERY_REMOVE_DEVICE**{: #IRP_MN_QUERY_REMOVE_DEVICE } | `&H01` | With **IRP_MJ_PNP**: asks whether the device can be removed. |
| **IRP_MN_QUERY_RESOURCE_REQUIREMENTS**{: #IRP_MN_QUERY_RESOURCE_REQUIREMENTS } | `&H0B` | With **IRP_MJ_PNP**: asks for the hardware resources the device can use. |
| **IRP_MN_QUERY_RESOURCES**{: #IRP_MN_QUERY_RESOURCES } | `&H0A` | With **IRP_MJ_PNP**: asks for the boot configuration of the device's hardware resources. |
| **IRP_MN_QUERY_SINGLE_INSTANCE**{: #IRP_MN_QUERY_SINGLE_INSTANCE } | `&H01` | With **IRP_MJ_SYSTEM_CONTROL**: reads one instance of a WMI data block. |
| **IRP_MN_QUERY_STOP_DEVICE**{: #IRP_MN_QUERY_STOP_DEVICE } | `&H05` | With **IRP_MJ_PNP**: asks whether the device can be stopped so that its resources can be reassigned. |
| **IRP_MN_READ_CONFIG**{: #IRP_MN_READ_CONFIG } | `&H0F` | With **IRP_MJ_PNP**: reads the configuration space of the device's bus. |
| **IRP_MN_REGINFO**{: #IRP_MN_REGINFO } | `&H08` | With **IRP_MJ_SYSTEM_CONTROL**: asks for the WMI data blocks a driver provides. |
| **IRP_MN_REGINFO_EX**{: #IRP_MN_REGINFO_EX } | `&H0b` | With **IRP_MJ_SYSTEM_CONTROL**: as **IRP_MN_REGINFO**, in the form of Windows XP and later. |
| **IRP_MN_REMOVE_DEVICE**{: #IRP_MN_REMOVE_DEVICE } | `&H02` | With **IRP_MJ_PNP**: the device is removed, and the driver frees what it holds for it and deletes its device object. |
| **IRP_MN_SCSI_CLASS**{: #IRP_MN_SCSI_CLASS } | `&H01` | With **IRP_MJ_SCSI**: the request is for a SCSI class driver. |
| **IRP_MN_SET_LOCK**{: #IRP_MN_SET_LOCK } | `&H12` | With **IRP_MJ_PNP**: locks or unlocks the device against ejection. |
| **IRP_MN_SET_POWER**{: #IRP_MN_SET_POWER } | `&H02` | With **IRP_MJ_POWER**: changes the device or system to a given power state. |
| **IRP_MN_START_DEVICE**{: #IRP_MN_START_DEVICE } | `&H00` | With **IRP_MJ_PNP**: starts the device with the hardware resources assigned to it. |
| **IRP_MN_STOP_DEVICE**{: #IRP_MN_STOP_DEVICE } | `&H04` | With **IRP_MJ_PNP**: stops the device so that its resources can be reassigned. |
| **IRP_MN_SURPRISE_REMOVAL**{: #IRP_MN_SURPRISE_REMOVAL } | `&H17` | With **IRP_MJ_PNP**: the device is no longer there, removed without warning. |
| **IRP_MN_WAIT_WAKE**{: #IRP_MN_WAIT_WAKE } | `&H00` | With **IRP_MJ_POWER**: asks the device to wake the system or itself when it signals a wake event. |
| **IRP_MN_WRITE_CONFIG**{: #IRP_MN_WRITE_CONFIG } | `&H10` | With **IRP_MJ_PNP**: writes the configuration space of the device's bus. |
| **LLONG_MAX**{: #LLONG_MAX } | `9223372036854775807^` | The largest value of a `long long`, a **LongLong**. |
| **LLONG_MIN**{: #LLONG_MIN } | `(-9223372036854775807^ - 1)` | The smallest value of a `long long`, a **LongLong**. |
| **LONG_MAX**{: #LONG_MAX } | `2147483647` | The largest value of a `long`, 32 bits on Windows, a **Long**. |
| **LONG_MIN**{: #LONG_MIN } | `(-2147483647 - 1)` | The smallest value of a `long`, 32 bits on Windows, a **Long**. |
| **MAX_PATH**{: #MAX_PATH } | `260` | The length in characters of a Win32 path, the terminating null included. |
| **MAXBYTE**{: #MAXBYTE } | `&Hff` | The largest value of a `BYTE`, a **Byte**. |
| **MAXCHAR**{: #MAXCHAR } | `&H7f` | The largest value of a `CHAR`. |
| **MAXDWORD**{: #MAXDWORD } | `&Hffffffff` | The largest value of a `DWORD`. |
| **MAXIMUM_VOLUME_LABEL_LENGTH**{: #MAXIMUM_VOLUME_LABEL_LENGTH } | `32 * LenB(Of Integer)` | The length in bytes of the longest volume label, 32 characters, the size of **VPB.VolumeLabel**. |
| **MAXINT16**{: #MAXINT16 } | `32767` | The largest value of an `INT16`, an **Integer**. |
| **MAXINT32**{: #MAXINT32 } | `2147483647` | The largest value of an `INT32`, a **Long**. |
| **MAXINT64**{: #MAXINT64 } | `9223372036854775807^` | The largest value of an `INT64`, a **LongLong**. |
| **MAXINT8**{: #MAXINT8 } | `127` | The largest value of an `INT8`. |
| **MAXLONG**{: #MAXLONG } | `&H7fffffff` | The largest value of a `LONG`, a **Long**. |
| **MAXLONG32**{: #MAXLONG32 } | `2147483647` | The largest value of a `LONG32`, a **Long**. |
| **MAXLONG64**{: #MAXLONG64 } | `MAXLONGLONG` | The largest value of a `LONG64`, a **LongLong**: **MAXLONGLONG**. |
| **MAXLONGLONG**{: #MAXLONGLONG } | `9223372036854775807^` | The largest value of a `LONGLONG`, a **LongLong**. |
| **MAXSHORT**{: #MAXSHORT } | `&H7fff` | The largest value of a `SHORT`, an **Integer**. |
| **MAXSIZE_T**{: #MAXSIZE_T } | `&Hffffffffffffffff^` (64-bit), `&Hffffffff` (32-bit) | The largest value of a `SIZE_T`, 32 bits in a 32-bit build and 64 bits in a 64-bit one. |
| **MAXUCHAR**{: #MAXUCHAR } | `&Hff` | The largest value of a `UCHAR`, a **Byte**. |
| **MAXUINT16**{: #MAXUINT16 } | `&Hffff` | The largest value of a `UINT16`. See the note below. |
| **MAXUINT32**{: #MAXUINT32 } | `&Hffffffff` | The largest value of a `UINT32`. |
| **MAXUINT64**{: #MAXUINT64 } | `&Hffffffffffffffff^` | The largest value of a `UINT64`. |
| **MAXUINT8**{: #MAXUINT8 } | `&Hff` | The largest value of a `UINT8`, a **Byte**. |
| **MAXULONG**{: #MAXULONG } | `&Hffffffff` | The largest value of a `ULONG`. |
| **MAXULONG32**{: #MAXULONG32 } | `&Hffffffff` | The largest value of a `ULONG32`. |
| **MAXULONG64**{: #MAXULONG64 } | `Not 0^` | The largest value of a `ULONG64`. |
| **MAXULONGLONG**{: #MAXULONGLONG } | `&Hffffffffffffffff^` | The largest value of a `ULONGLONG`. |
| **MAXUSHORT**{: #MAXUSHORT } | `&Hffff` | The largest value of a `USHORT`. See the note below. |
| **MAXWORD**{: #MAXWORD } | `&Hffff` | The largest value of a `WORD`. See the note below. |
| **MB_LEN_MAX**{: #MB_LEN_MAX } | `5` | The largest number of bytes in one multibyte character, in any locale. |
| **METHOD_BUFFERED**{: #METHOD_BUFFERED } | `0` | For **CTL_CODE**: the I/O manager copies the input and output through one system buffer. |
| **METHOD_IN_DIRECT**{: #METHOD_IN_DIRECT } | `1` | For **CTL_CODE**: the output buffer is described by an MDL for the device to read from. |
| **METHOD_NEITHER**{: #METHOD_NEITHER } | `3` | For **CTL_CODE**: the driver receives the caller's own buffer addresses, with no copy and no MDL. |
| **METHOD_OUT_DIRECT**{: #METHOD_OUT_DIRECT } | `2` | For **CTL_CODE**: the output buffer is described by an MDL for the device to write to. |
| **MINCHAR**{: #MINCHAR } | `&H80` | The smallest value of a `CHAR`, written as its bits, `&H80`: as a number it is 128, not -128. |
| **MININT16**{: #MININT16 } | `(-32767 - 1)` | The smallest value of an `INT16`, an **Integer**. |
| **MININT32**{: #MININT32 } | `(-2147483647 - 1)` | The smallest value of an `INT32`, a **Long**. |
| **MININT64**{: #MININT64 } | `(-9223372036854775807^ - 1)` | The smallest value of an `INT64`, a **LongLong**. |
| **MININT8**{: #MININT8 } | `(-127 - 1)` | The smallest value of an `INT8`. |
| **MINLONG**{: #MINLONG } | `&H80000000` | The smallest value of a `LONG`, a **Long**. |
| **MINLONG32**{: #MINLONG32 } | `(-2147483647 - 1)` | The smallest value of a `LONG32`, a **Long**. |
| **MINLONG64**{: #MINLONG64 } | `MINLONGLONG` | The smallest value of a `LONG64`, a **LongLong**: **MINLONGLONG**. |
| **MINLONGLONG**{: #MINLONGLONG } | `(-9223372036854775807^ - 1)` | The smallest value of a `LONGLONG`, a **LongLong**. |
| **MINSHORT**{: #MINSHORT } | `&H8000` | The smallest value of a `SHORT`. See the note below. |
| **MOUNTDEVCONTROLTYPE**{: #MOUNTDEVCONTROLTYPE } | `&H0000004` | The device type of the mount device I/O control codes; **InitIOCTLs** builds **IOCTL_MOUNTDEV_QUERY_DEVICE_NAME** from it. See the warning below. |
| **MOUNTMGRCONTROLTYPE**{: #MOUNTMGRCONTROLTYPE } | `&H0000006` | The device type of the mount manager's I/O control codes; **InitIOCTLs** builds **IOCTL_MOUNTMGR_QUERY_POINTS** from it. See the warning below. |
| **OB_FLT_REGISTRATION_VERSION**{: #OB_FLT_REGISTRATION_VERSION } | `&H100` | The version a driver states in **OB_CALLBACK_REGISTRATION.Version** for **ObRegisterCallbacks**. |
| **POOL_EXTENDED_PARAMETER_REQUIRED_FIELD_BITS**{: #POOL_EXTENDED_PARAMETER_REQUIRED_FIELD_BITS } | `1` | The width in bits of the **Optional** field of a **POOL_EXTENDED_PARAMETER**, after its type field. |
| **POOL_EXTENDED_PARAMETER_RESERVED_BITS**{: #POOL_EXTENDED_PARAMETER_RESERVED_BITS } | `(64 - POOL_EXTENDED_PARAMETER_TYPE_BITS - POOL_EXTENDED_PARAMETER_REQUIRED_FIELD_BITS)` | The width in bits of the reserved field that fills the rest of the first 64 bits of a **POOL_EXTENDED_PARAMETER**. |
| **POOL_EXTENDED_PARAMETER_TYPE_BITS**{: #POOL_EXTENDED_PARAMETER_TYPE_BITS } | `8` | The width in bits of the type field at the start of a **POOL_EXTENDED_PARAMETER**, which holds a **POOL_EXTENDED_PARAMETER_TYPE**. |
| **PORT_MAXIMUM_MESSAGE_LENGTH**{: #PORT_MAXIMUM_MESSAGE_LENGTH } | `512` (64-bit), `256` (32-bit) | The longest message of a local procedure call port in bytes, 512 in a 64-bit build and 256 in a 32-bit one, which limits the size of an error log entry. |
| **PS_ATTRIBUTE_ADDITIVE**{: #PS_ATTRIBUTE_ADDITIVE } | `&H00040000` | A bit of a **PS_ATTRIBUTE_ID** value: the attribute's values accumulate, as bit masks and counters do. Not documented by Microsoft. |
| **PS_ATTRIBUTE_INPUT**{: #PS_ATTRIBUTE_INPUT } | `&H00020000` | A bit of a **PS_ATTRIBUTE_ID** value: the attribute is input only. Not documented by Microsoft. |
| **PS_ATTRIBUTE_NUMBER_MASK**{: #PS_ATTRIBUTE_NUMBER_MASK } | `&H0000ffff` | The bits of a **PS_ATTRIBUTE_ID** value that hold its **PS_ATTRIBUTE_NUM**. Not documented by Microsoft. See the note below. |
| **PS_ATTRIBUTE_THREAD**{: #PS_ATTRIBUTE_THREAD } | `&H00010000` | A bit of a **PS_ATTRIBUTE_ID** value: the attribute may be given for the creation of a thread. Not documented by Microsoft. |
| **RESOURCE_HASH_TABLE_SIZE**{: #RESOURCE_HASH_TABLE_SIZE } | `64` | The number of entries of **RESOURCE_PERFORMANCE_DATA.HashTable**. |
| **RTL_QUERY_REGISTRY_DELETE**{: #RTL_QUERY_REGISTRY_DELETE } | `&H00000040` | For **RTL_QUERY_REGISTRY_TABLE.Flags**: deletes the value once it has been read. |
| **RTL_QUERY_REGISTRY_DIRECT**{: #RTL_QUERY_REGISTRY_DIRECT } | `&H00000020` | For **RTL_QUERY_REGISTRY_TABLE.Flags**: no query routine is called, and the value is stored at *EntryContext*; a string value is written to the **UNICODE_STRING** it points to. |
| **RTL_QUERY_REGISTRY_NOEXPAND**{: #RTL_QUERY_REGISTRY_NOEXPAND } | `&H00000010` | For **RTL_QUERY_REGISTRY_TABLE.Flags**: a `REG_MULTI_SZ` value is not split into one call per string, and a `REG_EXPAND_SZ` value is not expanded. |
| **RTL_QUERY_REGISTRY_NOSTRING**{: #RTL_QUERY_REGISTRY_NOSTRING } | `&H00000080` | For **RTL_QUERY_REGISTRY_TABLE.Flags**: with **RTL_QUERY_REGISTRY_DIRECT**, the value is not a string. Deprecated: **RTL_QUERY_REGISTRY_TYPECHECK** replaces it. |
| **RTL_QUERY_REGISTRY_NOVALUE**{: #RTL_QUERY_REGISTRY_NOVALUE } | `&H00000008` | For **RTL_QUERY_REGISTRY_TABLE.Flags**: the entry names no value, and its query routine is called once. |
| **RTL_QUERY_REGISTRY_REQUIRED**{: #RTL_QUERY_REGISTRY_REQUIRED } | `&H00000004` | For **RTL_QUERY_REGISTRY_TABLE.Flags**: **RtlQueryRegistryValues** fails when the entry finds no value. |
| **RTL_QUERY_REGISTRY_SUBKEY**{: #RTL_QUERY_REGISTRY_SUBKEY } | `&H00000001` | For **RTL_QUERY_REGISTRY_TABLE.Flags**: the entry's name is a subkey, which the entries after it read. |
| **RTL_QUERY_REGISTRY_TOPKEY**{: #RTL_QUERY_REGISTRY_TOPKEY } | `&H00000002` | For **RTL_QUERY_REGISTRY_TABLE.Flags**: the entries from this one on read the original key again. |
| **RTL_QUERY_REGISTRY_TYPECHECK**{: #RTL_QUERY_REGISTRY_TYPECHECK } | `&H00000100` | For **RTL_QUERY_REGISTRY_TABLE.Flags**: with **RTL_QUERY_REGISTRY_DIRECT**, checks the value's type against the one in the top byte of *DefaultType*. |
| **RTL_QUERY_REGISTRY_TYPECHECK_MASK**{: #RTL_QUERY_REGISTRY_TYPECHECK_MASK } | `(&Hff << RTL_QUERY_REGISTRY_TYPECHECK_SHIFT)` | The top byte of **RTL_QUERY_REGISTRY_TABLE.DefaultType**, which holds the type that **RTL_QUERY_REGISTRY_TYPECHECK** expects. See the note below. |
| **RTL_QUERY_REGISTRY_TYPECHECK_SHIFT**{: #RTL_QUERY_REGISTRY_TYPECHECK_SHIFT } | `24` | The bit position of the expected type in **RTL_QUERY_REGISTRY_TABLE.DefaultType**. |
| **RTL_REGISTRY_ABSOLUTE**{: #RTL_REGISTRY_ABSOLUTE } | `0` | For the *RelativeTo* of **RtlQueryRegistryValues**: the path is a full registry path. |
| **RTL_REGISTRY_CONTROL**{: #RTL_REGISTRY_CONTROL } | `2` | For the *RelativeTo* of **RtlQueryRegistryValues**: the path is relative to `\Registry\Machine\System\CurrentControlSet\Control`. |
| **RTL_REGISTRY_DEVICEMAP**{: #RTL_REGISTRY_DEVICEMAP } | `4` | For the *RelativeTo* of **RtlQueryRegistryValues**: the path is relative to `\Registry\Machine\Hardware\DeviceMap`. |
| **RTL_REGISTRY_HANDLE**{: #RTL_REGISTRY_HANDLE } | `&H40000000` | Added to the *RelativeTo* of **RtlQueryRegistryValues**: *Path* is a handle to an open key, not a string. |
| **RTL_REGISTRY_MAXIMUM**{: #RTL_REGISTRY_MAXIMUM } | `6` | One more than the highest of the relative-to values. |
| **RTL_REGISTRY_OPTIONAL**{: #RTL_REGISTRY_OPTIONAL } | `&H80000000` | Added to the *RelativeTo* of **RtlQueryRegistryValues**: the key is optional. |
| **RTL_REGISTRY_SERVICES**{: #RTL_REGISTRY_SERVICES } | `1` | For the *RelativeTo* of **RtlQueryRegistryValues**: the path is relative to `\Registry\Machine\System\CurrentControlSet\Services`. |
| **RTL_REGISTRY_USER**{: #RTL_REGISTRY_USER } | `5` | For the *RelativeTo* of **RtlQueryRegistryValues**: the path is relative to the current user's key. |
| **RTL_REGISTRY_WINDOWS_NT**{: #RTL_REGISTRY_WINDOWS_NT } | `3` | For the *RelativeTo* of **RtlQueryRegistryValues**: the path is relative to `\Registry\Machine\Software\Microsoft\Windows NT\CurrentVersion`. |
| **SCHAR_MAX**{: #SCHAR_MAX } | `127` | The largest value of a `signed char`. |
| **SCHAR_MIN**{: #SCHAR_MIN } | `&H80` | The smallest value of a `signed char`. See the note below. |
| **SECURITY_DESCRIPTOR_DO_NOT_FREE**{: #SECURITY_DESCRIPTOR_DO_NOT_FREE } | `&H04000000` | A flag of **ACCESS_STATE.Flags**: the new security descriptor in the access state's auxiliary data is not freed when the access state is deleted. Not documented by Microsoft. |
| **SECURITY_DESCRIPTOR_MIN_LENGTH**{: #SECURITY_DESCRIPTOR_MIN_LENGTH } | `40` (64-bit), `&H14` (32-bit) | The size in bytes of an absolute **SECURITY_DESCRIPTOR**, 40 in a 64-bit build and 20 in a 32-bit one. |
| **SECURITY_DESCRIPTOR_REVISION**{: #SECURITY_DESCRIPTOR_REVISION } | `(1)` | The revision of a **SECURITY_DESCRIPTOR**. |
| **SECURITY_DESCRIPTOR_REVISION1**{: #SECURITY_DESCRIPTOR_REVISION1 } | `(1)` | The first revision of a **SECURITY_DESCRIPTOR**, the same as **SECURITY_DESCRIPTOR_REVISION**. |
| **SECURITY_MAX_SID_SIZE**{: #SECURITY_MAX_SID_SIZE } | `(60)` | The size in bytes of the largest **SID**, the one with **SID_MAX_SUB_AUTHORITIES** subauthorities. See the note below. |
| **SEMAPHORE_INCREMENT**{: #SEMAPHORE_INCREMENT } | `1` | The priority boost of a thread whose wait on a semaphore ends when the semaphore is released. |
| **SHRT_MAX**{: #SHRT_MAX } | `32767` | The largest value of a `short`, an **Integer**. |
| **SHRT_MIN**{: #SHRT_MIN } | `(-32768)` | The smallest value of a `short`, an **Integer**. |
| **SID_HASH_SIZE**{: #SID_HASH_SIZE } | `32` | The number of entries of **SID_AND_ATTRIBUTES_HASH.Hash**. |
| **SID_MAX_SUB_AUTHORITIES**{: #SID_MAX_SUB_AUTHORITIES } | `(15)` | The largest number of subauthorities a **SID** can have. |
| **SID_RECOMMENDED_SUB_AUTHORITIES**{: #SID_RECOMMENDED_SUB_AUTHORITIES } | `(1)` | The number of subauthorities to allocate a **SID** with when the number is not known. |
| **SID_REVISION**{: #SID_REVISION } | `(1)` | The revision of a **SID**. |
| **SIZE_MAX**{: #SIZE_MAX } | `&Hffffffffffffffff^` (64-bit), `&Hffffffff` (32-bit) | The largest value of a `size_t`, 32 bits in a 32-bit build and 64 bits in a 64-bit one. |
| **SL_ERROR_RETURNED**{: #SL_ERROR_RETURNED } | `&H02` | For **IO_STACK_LOCATION.Control**: a lower driver completed the request with an error. |
| **SL_INVOKE_ON_CANCEL**{: #SL_INVOKE_ON_CANCEL } | `&H20` | For **IO_STACK_LOCATION.Control**: the completion routine is called when the request is cancelled. |
| **SL_INVOKE_ON_ERROR**{: #SL_INVOKE_ON_ERROR } | `&H80` | For **IO_STACK_LOCATION.Control**: the completion routine is called when the request fails. |
| **SL_INVOKE_ON_SUCCESS**{: #SL_INVOKE_ON_SUCCESS } | `&H40` | For **IO_STACK_LOCATION.Control**: the completion routine is called when the request succeeds. |
| **SL_PENDING_RETURNED**{: #SL_PENDING_RETURNED } | `&H01` | For **IO_STACK_LOCATION.Control**: a lower driver returned `STATUS_PENDING` for the request. |
| **UCHAR_MAX**{: #UCHAR_MAX } | `&Hff` | The largest value of an `unsigned char`, a **Byte**. |
| **UINT_MAX**{: #UINT_MAX } | `&Hffffffff` | The largest value of an `unsigned int`. |
| **ULLONG_MAX**{: #ULLONG_MAX } | `&Hffffffffffffffff^` | The largest value of an `unsigned long long`. |
| **ULONG_MAX**{: #ULONG_MAX } | `&Hffffffff` | The largest value of an `unsigned long`, 32 bits on Windows. |
| **UNICODE_STRING_MAX_BYTES**{: #UNICODE_STRING_MAX_BYTES } | `65534` | The largest **Length** of a **UNICODE_STRING**, in bytes: the largest even number that 16 unsigned bits hold. |
| **UNICODE_STRING_MAX_CHARS**{: #UNICODE_STRING_MAX_CHARS } | `32767` | The largest number of UTF-16 characters that a **UNICODE_STRING** holds, half of **UNICODE_STRING_MAX_BYTES**. |
| **USHRT_MAX**{: #USHRT_MAX } | `&Hffff` | The largest value of an `unsigned short`. See the note below. |

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

| Name | Description |
|------|-------------|
| **FT_BALANCED_READ_MODE**{: #FT_BALANCED_READ_MODE } | An I/O control code of the fault-tolerant disk driver, built from **FTTYPE**; **InitIOCTLs** sets it to `&H66001B`. Not documented by Microsoft. |
| **IOCTL_DISK_CHECK_VERIFY**{: #IOCTL_DISK_CHECK_VERIFY } | The disk I/O control code that asks whether the medium of a removable-media device has changed; **InitIOCTLs** sets it to `&H74800`. |
| **IOCTL_DISK_FORMAT_TRACKS**{: #IOCTL_DISK_FORMAT_TRACKS } | The disk I/O control code that formats a range of tracks of a floppy disk. See the note below. |
| **IOCTL_DISK_GET_DRIVE_GEOMETRY**{: #IOCTL_DISK_GET_DRIVE_GEOMETRY } | The disk I/O control code that returns a disk's geometry in a **DISK_GEOMETRY**; **InitIOCTLs** sets it to `&H70000`. |
| **IOCTL_DISK_GET_MEDIA_TYPES**{: #IOCTL_DISK_GET_MEDIA_TYPES } | The disk I/O control code that returns the media types a device supports; **InitIOCTLs** sets it to `&H70C00`. |
| **IOCTL_DISK_GET_PARTITION_INFO**{: #IOCTL_DISK_GET_PARTITION_INFO } | The disk I/O control code that returns a partition's information in a **PARTITION_INFORMATION**; **InitIOCTLs** sets it to `&H74004`. |
| **IOCTL_DISK_IS_WRITABLE**{: #IOCTL_DISK_IS_WRITABLE } | The disk I/O control code that asks whether a disk can be written to; **InitIOCTLs** sets it to `&H70024`. |
| **IOCTL_DISK_SET_PARTITION_INFO**{: #IOCTL_DISK_SET_PARTITION_INFO } | The disk I/O control code that sets a partition's type; **InitIOCTLs** sets it to `&H7C008`. |
| **IOCTL_MOUNTDEV_QUERY_DEVICE_NAME**{: #IOCTL_MOUNTDEV_QUERY_DEVICE_NAME } | The mount manager's request to a volume's driver for its device name, returned in a **MOUNTDEV_NAME**; **InitIOCTLs** sets it to `&H40008`. See the warning below. |
| **IOCTL_MOUNTMGR_QUERY_POINTS**{: #IOCTL_MOUNTMGR_QUERY_POINTS } | The I/O control code that asks the mount manager for its mount points; **InitIOCTLs** sets it to `&H60008`. See the warning below. |
| **SOURCE_FILE**{: #SOURCE_FILE } | The source file name that **IoAcquireRemoveLock** passes to the kernel with each acquisition of a remove lock; empty until the driver sets it. |

<!-- test: WDMHelperTests.InitIOCTLs_SetsTheMountCodes -->
> [!WARNING] 0.3.0.5
> **IOCTL_MOUNTMGR_QUERY_POINTS** and **IOCTL_MOUNTDEV_QUERY_DEVICE_NAME** are not the WDK's codes after [**InitIOCTLs**](#InitIOCTLs) has set them. A driver sets the two itself.

<!-- test: WDMHelperTests.InitIOCTLs_SetsFormatTracks -->
> [!NOTE] 0.3.0.5
> [**InitIOCTLs**](#InitIOCTLs) does not set **IOCTL_DISK_FORMAT_TRACKS**, which stays 0.

## Procedures

The procedures do what the WDK's macros and inline routines do, such as [**IoGetCurrentIrpStackLocation**](#IoGetCurrentIrpStackLocation) and [**InitializeListHead**](#InitializeListHead), or return the kernel's object types, such as [**PsProcessType**](#PsProcessType). [**InitIOCTLs**](#InitIOCTLs) sets the I/O control codes. **MsgBox**, **InStr**, **LCase** and **UCase** are kernel-mode versions of VBA's functions, and **StrRev** reverses a string; all five take the addresses of null-terminated strings.

### CmKeyObjectType
{: #CmKeyObjectType }

Returns the object type of registry keys, the value of the kernel's **CmKeyObjectType** variable, in the same way as [**IoFileObjectType**](#IoFileObjectType).

Syntax: **CmKeyObjectType**()

### CTL_CODE
{: #CTL_CODE }

Returns an I/O control code made from its four parts, as the WDK's `CTL_CODE` macro does.

Syntax: **CTL_CODE**( *DeviceType*, *lFunction*, *Method*, *Access* )

*DeviceType*
: *required* A **Long**: the device type, such as **IOCTL_DISK_BASE**. The values from `&H8000` up are for vendors.

*lFunction*
: *required* A **Long**: the function number. The values from `&H800` up are for vendors.

*Method*
: *required* A **Long**: how the buffers are passed, **METHOD_BUFFERED** or one of the other `METHOD_` constants.

*Access*
: *required* A **Long**: the access the caller needs, **FILE_ANY_ACCESS** or a combination of **FILE_READ_ACCESS** and **FILE_WRITE_ACCESS**.

<!-- test: WDMHelperTests.CTL_CODE_MakesTheWdkCode, WDMHelperTests.CTL_CODE_VendorDeviceType_MakesTheWdkCode -->
The result is *DeviceType* shifted left by 16 bits, *Access* by 14 and *lFunction* by 2, combined with *Method*: `CTL_CODE(7, 6, 0, 3)` is `&H7C018`. A device type of `&H8000` or more gives a code with the top bit set, a negative **Long**, and raises no overflow: `CTL_CODE(&H8000&, &H800, 0, 0)` is `&H80002000`.
<!-- /test -->

### ExDesktopObjectType
{: #ExDesktopObjectType }

Returns the object type of desktops, the value of the kernel's **ExDesktopObjectType** variable, in the same way as [**IoFileObjectType**](#IoFileObjectType).

Syntax: **ExDesktopObjectType**()

### ExEventObjectType
{: #ExEventObjectType }

Returns the object type of events, the value of the kernel's **ExEventObjectType** variable, in the same way as [**IoFileObjectType**](#IoFileObjectType).

Syntax: **ExEventObjectType**()

### ExInitializeFastMutex
{: #ExInitializeFastMutex }

Initializes a fast mutex before its first use.

Syntax: **ExInitializeFastMutex** *FastMutex*

*FastMutex*
: *required* A **FAST_MUTEX**, passed by reference, in memory that is not paged.

The procedure sets **Owner** and **Contention** to 0 and initializes **Event** as a synchronization event that is not signalled, with [**KeInitializeEvent**](#KeInitializeEvent). The WDK's routine of the same name, an inline function in wdm.h, also sets **Count** to `FM_LOCK_BIT`, 1, the value of a mutex that no thread holds.

<!-- test: KernelHelperTests.ExInitializeFastMutex_InitializesAsTheWdkDoes -->
> [!WARNING] 0.3.0.5
> **ExInitializeFastMutex** leaves **Count** as it was, where the WDK's routine sets it to 1. **Count** is 1 only in a mutex that no thread holds, and in a new **FAST_MUTEX** variable it is 0. A driver sets **Count** to 1 itself after the call.

### ExIsResourceAcquiredLite
{: #ExIsResourceAcquiredLite }

Returns the number of times the current thread has acquired shared access to a resource, as [**ExIsResourceAcquiredSharedLite**](#ExIsResourceAcquiredSharedLite) does.

Syntax: **ExIsResourceAcquiredLite**( *Resource* )

*Resource*
: *required* An **ERESOURCE**, passed by reference: the resource, as **ExInitializeResourceLite** initialized it.

In the WDK `ExIsResourceAcquiredLite` is a macro that stands for **ExIsResourceAcquiredSharedLite**, and the procedure calls that routine. The result is 0 when the thread does not hold the resource.

### ExReleaseResource
{: #ExReleaseResource }

Releases a resource that the current thread has acquired.

Syntax: **ExReleaseResource** *Resource*

*Resource*
: *required* An **ERESOURCE**, passed by reference: the resource to release.

<!-- test: KernelHelperTests.ExReleaseResource_ReleasesTheResource, compile ExReleaseResourceIsImplemented -->
In the WDK `ExReleaseResource` is a macro that stands for [**ExReleaseResourceLite**](#ExReleaseResourceLite), a `__fastcall` routine in a 32-bit kernel, and the procedure calls that routine, in a 32-bit and in a 64-bit build.
<!-- /test -->

### ExSemaphoreObjectType
{: #ExSemaphoreObjectType }

Returns the object type of semaphores, the value of the kernel's **ExSemaphoreObjectType** variable, in the same way as [**IoFileObjectType**](#IoFileObjectType).

Syntax: **ExSemaphoreObjectType**()

### InitializeListHead
{: #InitializeListHead }

Makes a list head the head of an empty doubly linked list.

Syntax: **InitializeListHead** *ListHead*

*ListHead*
: *required* A **LIST_ENTRY**, passed by reference: the head of the list, in memory that lasts as long as the list.

<!-- test: WDMHelperTests.InitializeListHead_MakesAnEmptyList -->
The procedure sets **Flink** and **Blink** to the address of *ListHead*, as the WDK's routine of the same name does.
<!-- /test -->

### InitializeObjectAttributes
{: #InitializeObjectAttributes }

Fills an **OBJECT_ATTRIBUTES** structure for a routine that opens or creates an object, as the WDK's `InitializeObjectAttributes` macro does.

Syntax: **InitializeObjectAttributes** *p*, *n*, *a*, *r*, *s*

*p*
: *required* An **OBJECT_ATTRIBUTES**, passed by reference: the structure to fill.

*n*
: *required* A **LongPtr**: the address of a **UNICODE_STRING** that holds the object's name, or 0.

*a*
: *required* An **ObjectAttributeValues**: the attributes, such as `OBJ_KERNEL_HANDLE Or OBJ_CASE_INSENSITIVE`.

*r*
: *required* A **LongPtr**: a handle of the directory that *n* is relative to, or 0 for a full name.

*s*
: *required* A **LongPtr**: the address of a security descriptor for a new object, or 0 for the default security.

<!-- test: WDMHelperTests.InitializeObjectAttributes_FillsTheStructure -->
The procedure sets **Length** to `LenB(Of OBJECT_ATTRIBUTES)`, **ObjectName**, **Attributes**, **RootDirectory** and **SecurityDescriptor** to the arguments, and **SecurityQualityOfService** to 0.
<!-- /test -->

### InitIOCTLs
{: #InitIOCTLs }

Sets the I/O control codes that the package declares as variables.

Syntax: **InitIOCTLs**

The codes are variables, not constants, and each is 0 until **InitIOCTLs** sets it, so a driver calls it once before it uses them, as in its **DriverEntry**. It sets each with [**CTL_CODE**](#CTL_CODE): **IOCTL_DISK_GET_DRIVE_GEOMETRY**, **IOCTL_DISK_GET_PARTITION_INFO**, **IOCTL_DISK_IS_WRITABLE**, **IOCTL_DISK_GET_MEDIA_TYPES**, **IOCTL_DISK_CHECK_VERIFY**, **IOCTL_DISK_SET_PARTITION_INFO**, **IOCTL_MOUNTMGR_QUERY_POINTS**, **IOCTL_MOUNTDEV_QUERY_DEVICE_NAME** and **FT_BALANCED_READ_MODE**.

<!-- test: WDMHelperTests.InitIOCTLs_SetsTheDiskCodes -->
The six `IOCTL_DISK_` codes it sets are the WDK's.
<!-- /test -->

<!-- test: WDMHelperTests.InitIOCTLs_SetsTheMountCodes, WDMValueTests.Constants_Values -->
> [!WARNING] 0.3.0.5
> The two mount codes are not the WDK's: **IOCTL_MOUNTMGR_QUERY_POINTS** is `&H60008` where the WDK's is `&H6D0008`, and **IOCTL_MOUNTDEV_QUERY_DEVICE_NAME** is `&H40008` where the WDK's is `&H4D0008`. They are built from **MOUNTMGRCONTROLTYPE**, 6, and **MOUNTDEVCONTROLTYPE**, 4, where the WDK's device types are `&H6D` and `&H4D`. A driver sets the two variables to the WDK's values after the call.

<!-- test: WDMHelperTests.InitIOCTLs_SetsFormatTracks -->
> [!NOTE] 0.3.0.5
> **InitIOCTLs** does not set **IOCTL_DISK_FORMAT_TRACKS**, which stays 0. A driver sets it to `&H7C018`, `CTL_CODE(IOCTL_DISK_BASE, 6, METHOD_BUFFERED, FILE_READ_ACCESS Or FILE_WRITE_ACCESS)`.

### InsertHeadList
{: #InsertHeadList }

Inserts an entry at the head of a doubly linked list.

Syntax: **InsertHeadList** *ListHead*, *Entry*

*ListHead*
: *required* A **LIST_ENTRY**, passed by reference: the head of the list.

*Entry*
: *required* A **LIST_ENTRY**, passed by reference: the entry to insert, usually a field of a larger structure.

The WDK's routine of the same name links *Entry* between *ListHead* and the entry that was first, and sets that entry's **Blink** to *Entry*.

<!-- test: KernelHelperTests.InsertHeadList_LinksTheEntryAfterTheHead -->
> [!WARNING] 0.3.0.5
> **InsertHeadList** copies the entry that was first into a local variable and links *Entry* to the copy. *Entry*'s **Flink** then points into the procedure's own stack, which is gone once it returns, and the **Blink** of the entry that was first is not changed: after an insert into an empty list, **ListHead.Blink** still points to *ListHead*. The list is broken from the first insert on. A driver sets the links itself, as the WDK's routine does.

### InsertTailList
{: #InsertTailList }

Inserts an entry at the tail of a doubly linked list.

Syntax: **InsertTailList** *ListHead*, *Entry*

*ListHead*
: *required* A **LIST_ENTRY**, passed by reference: the head of the list.

*Entry*
: *required* A **LIST_ENTRY**, passed by reference: the entry to insert, usually a field of a larger structure.

The WDK's routine of the same name links *Entry* between the entry that was last and *ListHead*, and sets that entry's **Flink** to *Entry*.

<!-- test: KernelHelperTests.InsertTailList_LinksTheEntryBeforeTheHead -->
> [!WARNING] 0.3.0.5
> **InsertTailList** copies the entry that was last into a local variable and links *Entry* to the copy. *Entry*'s **Blink** then points into the procedure's own stack, which is gone once it returns, and the **Flink** of the entry that was last is not changed: after an insert into an empty list, **ListHead.Flink** still points to *ListHead*. The list is broken from the first insert on. A driver sets the links itself, as the WDK's routine does.

### InStr
{: #InStr }

Searches a string for another, in kernel mode.

Syntax: **InStr**( *szIn*, *szFind* )

*szIn*
: *required* A **LongPtr**: the address of the null-terminated UTF-16 string to search.

*szFind*
: *required* A **LongPtr**: the address of the null-terminated UTF-16 string to find.

The function has the name of VBA's **InStr** but takes the strings' addresses. A driver calls it as `modWDM.InStr`: without the module name the call is VBA's (see [Names shared with VBA](.#names-shared-with-vba)). It calls [**wcsstr**](#wcsstr), and returns 0 when *szFind* is not in *szIn*.

<!-- test: KernelHelperTests.InStr_ReturnsTheCharacterPosition -->
> [!WARNING] 0.3.0.5
> For a string that is found, **InStr** returns `szIn` minus the address **wcsstr** returned: the negative of the match's offset in bytes, not its position in characters. `modWDM.InStr` of "mode" in "kernel mode" is -14, where VBA's **InStr** gives 8. A driver calls **wcsstr** and works out the position from the address *p* it returns: `(p - szIn) \ 2 + 1`.

### InterlockedAdd64
{: #InterlockedAdd64 }

Adds a value to a **LongLong** variable under a spin lock.

Syntax: **InterlockedAdd64** *Addend*, *Value*

*Addend*
: *required* A **LongLong**, passed by reference: the variable to add to.

*Value*
: *required* A **LongLong**: the value to add.

<!-- test: KernelHelperTests.InterlockedAdd64_AddsTheValue -->
Each call initializes a spin lock of its own with [**KeInitializeSpinLock**](#KeInitializeSpinLock), acquires it with [**KeAcquireSpinLock**](#KeAcquireSpinLock), passes it with *Addend* and *Value* to [**ExInterlockedAddLargeInteger**](#ExInterlockedAddLargeInteger), and releases it. The procedure is a **Sub**: it returns nothing, where the WDK's `InterlockedAdd64`, a compiler intrinsic, returns the sum. The package describes it as not usable in a 32-bit driver.
<!-- /test -->

<!-- test: KernelHelperTests.InterlockedAdd64_CallsWithTheLockFree -->
> [!WARNING] 0.3.0.5
> A call of **InterlockedAdd64** never returns. The procedure passes its spin lock to **ExInterlockedAddLargeInteger** while it holds it, and **ExInterlockedAddLargeInteger** acquires the lock it is given. A spin lock that is held is waited for until it is released, so the call waits without end. A driver calls **ExInterlockedAddLargeInteger** itself, with a spin lock that it has initialized with **KeInitializeSpinLock** and does not hold.

### InterlockedIncrement
{: #InterlockedIncrement }

Adds 1 to a **Long** variable.

Syntax (64-bit): **InterlockedIncrement** *Addend*

Syntax (32-bit): **InterlockedIncrement**( *Addend* )

*Addend*
: *required* A **Long**, passed by reference: the variable to increment.

In a 64-bit build **InterlockedIncrement** is a **Sub** of the package: each call initializes a spin lock of its own with [**KeInitializeSpinLock**](#KeInitializeSpinLock), acquires it with [**KeAcquireSpinLock**](#KeAcquireSpinLock), passes it to [**ExInterlockedAddUlong**](#ExInterlockedAddUlong) with *Addend* and 1, and releases it. In a 32-bit build it is a **Declare** of the kernel's `InterlockedIncrement`, a `__fastcall` routine there, which returns the incremented value. The WDK's [**InterlockedIncrement**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-interlockedincrement) is a compiler intrinsic that returns the incremented value.

<!-- test: KernelHelperTests.InterlockedIncrement_CallsWithTheLockFree -->
> [!WARNING] 0.3.0.5
> In a 64-bit driver a call of **InterlockedIncrement** never returns. The procedure passes its spin lock to **ExInterlockedAddUlong** while it holds it, and **ExInterlockedAddUlong** acquires the lock it is given. A spin lock that is held is waited for until it is released, so the call waits without end. A driver calls **ExInterlockedAddUlong** itself, with a spin lock that it has initialized with **KeInitializeSpinLock** and does not hold.

<!-- test: KernelHelperTests.InterlockedIncrement_IncrementsTheValue -->
> [!WARNING] 0.3.0.5
> In a 32-bit driver the kernel's `InterlockedIncrement` takes its argument in a register, but the package calls it as a `__stdcall` routine, which pushes the argument on the stack. The routine receives some other value than the variable's address, the variable keeps its value, and the call leaves the stack 4 bytes off.

<!-- test: compile InterlockedIncrementReturnsTheValue -->
> [!NOTE] 0.3.0.5
> In a 64-bit build **InterlockedIncrement** is a **Sub**, so `n = InterlockedIncrement(v)` is refused with TB5033. In a 32-bit build it compiles.

### IoAcquireRemoveLock
{: #IoAcquireRemoveLock }

Acquires a remove lock, so that the device is not removed while the driver works with it.

Syntax: **IoAcquireRemoveLock**( *RemoveLock*, *Tag*, *Line* )

*RemoveLock*
: *required* An **IO_REMOVE_LOCK**, passed by reference: the lock, as [**IoInitializeRemoveLock**](#IoInitializeRemoveLock) initialized it.

*Tag*
: *required* A **LongPtr**: a value that marks this acquisition, such as the address of the IRP, or 0. The matching [**IoReleaseRemoveLock**](#IoReleaseRemoveLock) passes the same value.

*Line*
: *required* A **Long**: the source line number to record with the acquisition.

The function returns what [**IoAcquireRemoveLockEx**](#IoAcquireRemoveLockEx) returns: `STATUS_SUCCESS`, or `STATUS_DELETE_PENDING` when the device is being removed, and then the driver does not use it. The WDK's `IoAcquireRemoveLock` macro takes two arguments and passes the file name and line number of the call itself; the procedure takes the line number as *Line*, and passes the address of [**SOURCE_FILE**](#SOURCE_FILE) as the file name and `LenB` of the lock as its size.

<!-- test: KernelHelperTests.IoAcquireRemoveLock_PassesTheTagTheFileAndTheLine -->
> [!NOTE] 0.3.0.5
> **IoAcquireRemoveLock** passes `StrPtr(SOURCE_FILE)`, the address of a UTF-16 string, where **IoAcquireRemoveLockEx** takes the address of an ANSI string. For a name made of ASCII characters the kernel reads only its first character as the file name: `D` for `Driver.twin`. *Tag* and *Line* reach the kernel as given.

### IoCallDriver
{: #IoCallDriver }

Sends an IRP to the driver of a device object.

Syntax: **IoCallDriver**( *DeviceObject*, *pIrp* )

*DeviceObject*
: *required* A **DEVICE_OBJECT**, passed by reference: the device object of the driver to call, usually the next lower one in the stack.

*pIrp*
: *required* An **IRP**, passed by reference: the IRP, with the stack location below the current one set up for the driver called.

The function returns what [**IofCallDriver**](#IofCallDriver) returns: the status the driver called gives, or `STATUS_PENDING`. In the WDK `IoCallDriver` is a macro that stands for **IofCallDriver**, a `__fastcall` routine in a 32-bit kernel.

<!-- test: KernelHelperTests.IoCallDriver_PassesTheDeviceAndTheIrp -->
> [!WARNING] 0.3.0.5
> In a 32-bit driver **IofCallDriver** takes its two arguments in registers, but **IoCallDriver** calls it as a `__stdcall` routine, which pushes them on the stack. The routine receives other values than the device object and the IRP, and the call leaves the stack 8 bytes off.

### IoCopyCurrentIrpStackLocationToNext
{: #IoCopyCurrentIrpStackLocationToNext }

Copies the current stack location of an IRP into the location below it, for the next lower driver.

Syntax: **IoCopyCurrentIrpStackLocationToNext** *pIrp*

*pIrp*
: *required* An **IRP**, passed by reference: the IRP that the driver passes down.

As the WDK's routine of the same name does, the procedure copies the fields of the current **IO_STACK_LOCATION** up to **CompletionRoutine**, `&H1C` bytes in a 32-bit build and `&H38` in a 64-bit one, and sets **Control** of the copy to 0. It finds the location below with [**IoGetNextIrpStackLocation**](#IoGetNextIrpStackLocation).

<!-- test: KernelHelperTests.IoCopyCurrentIrpStackLocationToNext_CopiesIntoTheLocationBelow, WDMHelperTests.IoGetNextIrpStackLocation_ReturnsTheLocationBelow -->
> [!WARNING] 0.3.0.5
> **IoGetNextIrpStackLocation** returns an address 4 or 8 bytes below the current location, not the location below, and **IoCopyCurrentIrpStackLocationToNext** writes the copy there. The location below receives none of the fields: its **MajorFunction**, **MinorFunction**, **Flags**, **DeviceObject** and **FileObject** stay as they were, and its **Context** receives the current location's **MajorFunction**, **MinorFunction** and **Flags**, with a 0 for **Control**. The copy also writes over the current location: its **MajorFunction**, **MinorFunction** and **Flags** take the values of the bytes 4 or 8 further on, and its **DeviceObject** the value of its **FileObject**. A driver copies the fields itself, to the current location's address less `LenB(Of IO_STACK_LOCATION)`, and sets **Control** there to 0.

### IoFileObjectType
{: #IoFileObjectType }

Returns the object type of file objects, the value of the kernel's **IoFileObjectType** variable.

Syntax: **IoFileObjectType**()

The kernel exports its object types as variables, which a C driver reaches by name; a twinBASIC driver reaches them through these functions. The first call fills a **UNICODE_STRING** of the package's with the name `IoFileObjectType`, and each call passes it to [**MmGetSystemRoutineAddress**](#MmGetSystemRoutineAddress), which a driver calls only at `PASSIVE_LEVEL`; the same holds for the function. The function reads the variable at the address that routine returns, without checking it: for a name the kernel does not export, it reads from address 0, which stops the system.

<!-- test: KernelHelperTests.PsProcessType_ReturnsTheObjectType -->
The function returns the `POBJECT_TYPE` that the variable holds, as **PsProcessType** and the other object-type functions do: the value of `*IoFileObjectType` in C. Where C passes `*IoFileObjectType`, as the *ObjectType* of [**ObOpenObjectByPointer**](#ObOpenObjectByPointer), a driver passes the result as it is. Where C passes `IoFileObjectType`, the address of the variable, as in **OB_OPERATION_REGISTRATION.ObjectType**, a driver passes what **MmGetSystemRoutineAddress** returns for the variable's name.
<!-- /test -->

### IoGetCurrentIrpStackLocation
{: #IoGetCurrentIrpStackLocation }

Returns the address of the driver's own stack location in an IRP.

Syntax: **IoGetCurrentIrpStackLocation**( *pIrp* )

*pIrp*
: *required* An **IRP**, passed by reference: the IRP the driver received.

<!-- test: WDMHelperTests.IoGetCurrentIrpStackLocation_ReturnsTheCurrentLocation -->
The function returns **pIrp.CurrentStackLocation**, the address of the current **IO_STACK_LOCATION**, as the WDK's routine of the same name does. A driver reads the location's fields by copying it into an **IO_STACK_LOCATION** of its own with **CopyMemory**.
<!-- /test -->

### IoGetNextIrpStackLocation
{: #IoGetNextIrpStackLocation }

Returns the address of the stack location below the current one in an IRP, the one the next lower driver receives.

Syntax: **IoGetNextIrpStackLocation**( *pIrp* )

*pIrp*
: *required* An **IRP**, passed by reference: the IRP that the driver passes down.

The WDK's routine of the same name returns the current location's address less one **IO_STACK_LOCATION**, 36 bytes in a 32-bit build and 72 in a 64-bit one.

<!-- test: WDMHelperTests.IoGetNextIrpStackLocation_ReturnsTheLocationBelow -->
> [!WARNING] 0.3.0.5
> **IoGetNextIrpStackLocation** subtracts `LenB(Of LongPtr)`, 4 or 8 bytes, instead: the address it returns is inside the location below, 32 bytes into it in a 32-bit build and 64 in a 64-bit one. A driver subtracts `LenB(Of IO_STACK_LOCATION)` from the result of [**IoGetCurrentIrpStackLocation**](#IoGetCurrentIrpStackLocation).

### IoInitializeRemoveLock
{: #IoInitializeRemoveLock }

Initializes a remove lock before its first use.

Syntax: **IoInitializeRemoveLock** *RemoveLock*, *Tag*, *Maxmin*, *HighWater*

*RemoveLock*
: *required* An **IO_REMOVE_LOCK**, passed by reference: the lock, which belongs in the device extension.

*Tag*
: *required* A **Long**: the pool tag for the memory the lock allocates.

*Maxmin*
: *required* A **Long**: the most minutes the lock may be held, or 0 for no limit.

*HighWater*
: *required* A **Long**: the most acquisitions the lock may have at one time, or 0 for no limit.

As the WDK's macro of the same name does, the procedure calls [**IoInitializeRemoveLockEx**](#IoInitializeRemoveLockEx) with its arguments and `LenB` of the lock as its size. The WDK says that the kernel uses *Tag*, *Maxmin* and *HighWater* only in its checked builds.

### IoReleaseRemoveLock
{: #IoReleaseRemoveLock }

Releases a remove lock that [**IoAcquireRemoveLock**](#IoAcquireRemoveLock) acquired.

Syntax: **IoReleaseRemoveLock** *RemoveLock*, *Tag*

*RemoveLock*
: *required* An **IO_REMOVE_LOCK**, passed by reference: the lock.

*Tag*
: *required* A **LongPtr**: the value the acquisition passed as its *Tag*.

<!-- test: KernelHelperTests.IoReleaseRemoveLock_PassesTheTag -->
As the WDK's macro of the same name does, the procedure calls [**IoReleaseRemoveLockEx**](#IoReleaseRemoveLockEx) with its arguments and `LenB` of the lock as its size.
<!-- /test -->

### IoReleaseRemoveLockAndWait
{: #IoReleaseRemoveLockAndWait }

Releases a remove lock and waits until every other acquisition of it has been released, before the driver removes its device.

Syntax: **IoReleaseRemoveLockAndWait** *RemoveLock*, *Tag*, *RemlockSize*

*RemoveLock*
: *required* An **IO_REMOVE_LOCK**, passed by reference: the lock.

*Tag*
: *required* A **Long**: the value the driver's own acquisition passed as its *Tag*.

*RemlockSize*
: *required* A **Long**: the size of the lock, `LenB(Of IO_REMOVE_LOCK)`.

The procedure calls [**IoReleaseRemoveLockAndWaitEx**](#IoReleaseRemoveLockAndWaitEx) with its three arguments. The WDK's macro of the same name takes two, and passes the size itself.

<!-- test: KernelHelperTests.IoReleaseRemoveLockAndWait_PassesTheTag, compile IoReleaseRemoveLockAndWaitTakesALongPtrTag -->
> [!NOTE] 0.3.0.5
> **IoReleaseRemoveLockAndWait** passes *Tag* by reference to the `As Any` *Tag* of **IoReleaseRemoveLockAndWaitEx**, so the kernel receives the address of the variable, not the tag value that the driver's acquisition passed. In a 64-bit build its *Tag* is a **Long** where **IoAcquireRemoveLock** takes a **LongPtr**, so the compiler refuses the **LongPtr** tag that the acquisition was given. A driver calls **IoReleaseRemoveLockAndWaitEx** itself, with the tag passed `ByVal` and `LenB` of the lock as *RemlockSize*.

### IoSetCompletionRoutine
{: #IoSetCompletionRoutine }

Sets the routine that is called when the next lower driver has completed an IRP.

Syntax: **IoSetCompletionRoutine** *pIrp*, *CompletionRoutine*, *Context*, *InvokeOnSuccess*, *InvokeOnError*, *InvokeOnCancel*

*pIrp*
: *required* An **IRP**, passed by reference: the IRP that the driver passes down.

*CompletionRoutine*
: *required* A **LongPtr**: `AddressOf` the completion routine.

*Context*
: *required* A **LongPtr**: a value that the completion routine receives.

*InvokeOnSuccess*
: *required* A **Boolean**: **True** to call the routine when the IRP completes with a success status.

*InvokeOnError*
: *required* A **Boolean**: **True** to call the routine when the IRP completes with an error status.

*InvokeOnCancel*
: *required* A **Boolean**: **True** to call the routine when the IRP is cancelled.

As the WDK's routine of the same name does, the procedure sets **CompletionRoutine** and **Context** of the stack location below the current one, and its **Control** to **SL_INVOKE_ON_SUCCESS**, **SL_INVOKE_ON_ERROR** and **SL_INVOKE_ON_CANCEL** as the three **Boolean** arguments say. It finds the location with [**IoGetNextIrpStackLocation**](#IoGetNextIrpStackLocation).

<!-- test: KernelHelperTests.IoSetCompletionRoutine_SetsTheLocationBelow, WDMHelperTests.IoGetNextIrpStackLocation_ReturnsTheLocationBelow -->
> [!WARNING] 0.3.0.5
> **IoGetNextIrpStackLocation** returns an address 4 or 8 bytes below the current location, and **IoSetCompletionRoutine** writes at the offsets of the fields from there. The location below gets no completion routine and no **Control** flags; the routine's address is written over the current location's **FileObject**, *Context* over its **CompletionRoutine**, and the flags into the location below's **Context**. A driver sets the three fields itself, at the current location's address less `LenB(Of IO_STACK_LOCATION)`.

### IoSkipCurrentIrpStackLocation
{: #IoSkipCurrentIrpStackLocation }

Moves an IRP's current stack location up by one, so that the next lower driver receives the driver's own location.

Syntax: **IoSkipCurrentIrpStackLocation** *pIrp*

*pIrp*
: *required* An **IRP**, passed by reference: the IRP that the driver passes down with [**IoCallDriver**](#IoCallDriver), with no completion routine.

The WDK's routine of the same name adds 1 to **CurrentLocation** and one **IO_STACK_LOCATION** to **CurrentStackLocation**.

<!-- test: WDMHelperTests.IoSkipCurrentIrpStackLocation_MovesUpOneLocation -->
> [!WARNING] 0.3.0.5
> **IoSkipCurrentIrpStackLocation** adds 1 to **CurrentStackLocation**, which is an address, so it moves one byte and not one location; **CurrentLocation** is right. The next lower driver then does not receive the driver's own location. A driver adds `LenB(Of IO_STACK_LOCATION)` to **CurrentStackLocation** itself.

### IsListEmpty
{: #IsListEmpty }

Returns whether a doubly linked list has no entries.

Syntax: **IsListEmpty**( *ListHead* )

*ListHead*
: *required* A **LIST_ENTRY**, passed by reference: the head of the list.

<!-- test: WDMHelperTests.InitializeListHead_MakesAnEmptyList -->
The function returns a **Byte**, 1 when **ListHead.Flink** is the address of *ListHead* and 0 otherwise, as the WDK's routine of the same name returns a `BOOLEAN`.
<!-- /test -->

### KeRaiseIrql
{: #KeRaiseIrql }

Raises the interrupt request level (IRQL) of the current processor, and returns the level it had before.

Syntax: **KeRaiseIrql** *NewIrql*, *OldIrql*

*NewIrql*
: *required* A [**KIRQL**](#KIRQL): the new level, such as `DISPATCH_LEVEL` of [**eKIRQL**](#eKIRQL). It must not be lower than the current level.

*OldIrql*
: *required* A [**KIRQL**](#KIRQL) variable, passed by reference, that receives the level before the call.

The procedure sets *OldIrql* to what [**KfRaiseIrql**](#KfRaiseIrql) returns for *NewIrql*, as the WDK's `KeRaiseIrql` macro does. A driver goes back to *OldIrql* with [**KeLowerIrql**](#KeLowerIrql), which the module declares for a 64-bit build only.

### LCase
{: #LCase }

Converts a string to lowercase in place, in kernel mode.

Syntax: **LCase**( *sz* )

*sz*
: *required* A **LongPtr**: the address of the null-terminated UTF-16 string to convert.

<!-- test: KernelHelperTests.LCaseUCaseStrRev_ChangeTheStringInPlace, KernelHelperTests.BareNames_CallTheModulesProcedures -->
The function has the name of VBA's **LCase** but takes the string's address. A driver calls it as `modWDM.LCase`: without the module name the call is VBA's (see [Names shared with VBA](.#names-shared-with-vba)). It calls [**_wcslwr**](#_wcslwr), which changes the characters of the string itself, and returns *sz*.
<!-- /test -->

### max
{: #max }

Returns the larger of two **Long** values.

Syntax: **max**( *x*, *y* )

*x*
: *required* A **Long**: the first value.

*y*
: *required* A **Long**: the second value.

<!-- test: WDMHelperTests.MinMax_ReturnTheSmallerAndTheLarger -->
The function returns *x* when it is greater than *y*, else *y*, as the WDK's `max` macro does.
<!-- /test -->

### min
{: #min }

Returns the smaller of two **Long** values.

Syntax: **min**( *x*, *y* )

*x*
: *required* A **Long**: the first value.

*y*
: *required* A **Long**: the second value.

<!-- test: WDMHelperTests.MinMax_ReturnTheSmallerAndTheLarger -->
The function returns *x* when it is less than *y*, else *y*, as the WDK's `min` macro does.
<!-- /test -->

### MmGetSystemAddressForMdlSafe
{: #MmGetSystemAddressForMdlSafe }

Returns a system address of the buffer that an MDL describes, and maps the buffer there first when it is not mapped yet.

Syntax: **MmGetSystemAddressForMdlSafe**( *Mdl*, *Priority* )

*Mdl*
: *required* A **LongPtr**: the address of the **MDL**, such as **pIrp.MdlAddress** of an IRP with direct I/O.

*Priority*
: *required* A **Long**: an [**MM_PAGE_PRIORITY**](#MM_PAGE_PRIORITY), combined with **Or** with any of the [**MdlMappingFlags**](#MdlMappingFlags).

<!-- test: KernelHelperTests.MmGetSystemAddressForMdlSafe_MappedMdl_ReturnsItsAddress -->
As the WDK's routine of the same name does, the function returns the MDL's **MappedSystemVa** when its **MdlFlags** has `MDL_MAPPED_TO_SYSTEM_VA` or `MDL_SOURCE_IS_NONPAGED_POOL` set.
<!-- /test -->
Otherwise it returns what [**MmMapLockedPagesSpecifyCache**](#MmMapLockedPagesSpecifyCache) returns for the MDL, mapped for kernel mode and cached: the new address, or 0 when the pages cannot be mapped.

### MsgBox
{: #MsgBox }

Shows a message box from kernel mode, and returns the button chosen.

Syntax: **MsgBox**( *lpText*, *dwOptions*, *lpTitle* )

*lpText*
: *required* A **LongPtr**: the address of the null-terminated UTF-16 text of the box.

*dwOptions*
: *required* A [**MessageBoxFlags**](#MessageBoxFlags): the buttons, the icon and the default button, such as `MB_OKCANCEL Or MB_ICONWARNING`.

*lpTitle*
: *required* A **LongPtr**: the address of the null-terminated UTF-16 title of the box.

The function has the name of VBA's **MsgBox** but takes the strings' addresses. A driver calls it as `modWDM.MsgBox`: without the module name the call is VBA's (see [Names shared with VBA](.#names-shared-with-vba)). It passes the two strings, as **UNICODE_STRING** structures, and *dwOptions* to [**ExRaiseHardError**](#ExRaiseHardError) with the status `STATUS_SERVICE_NOTIFICATION Or HARDERROR_OVERRIDE_ERRORMODE`, which shows the box, and returns the [**HARDERROR_RESPONSE**](#HARDERROR_RESPONSE) that it gives, such as `HardError_ResponseOk`. The package says that the call must come from a request of a user-mode process, such as in the driver's handler of **DeviceIoControl** requests.

<!-- test: KernelHelperTests.MsgBox_PassesTheTextAndTheTitle -->
> [!WARNING] 0.3.0.5
> **MsgBox** makes both of its strings into the **UNICODE_STRING** of the text, and leaves the one of the title empty. The box shows *lpTitle* as its text, and no title; *lpText* is not shown. A driver that needs a title calls **ExRaiseHardError** itself.

### NT_ERROR
{: #NT_ERROR }

Returns whether an **NTSTATUS** value is an error status.

Syntax: **NT_ERROR**( *Status* )

*Status*
: *required* A **Long**: the status, as a routine returned it.

The WDK's `NT_ERROR` macro is true when the two highest bits of *Status* are both set: for the error statuses, from `&HC0000000` on, such as `STATUS_ACCESS_DENIED`. The procedure returns whether *Status* is less than `&HC0000000` as a signed **Long**.

<!-- test: WDMHelperTests.NT_ERROR_IsTrueForErrorStatusesOnly -->
> [!WARNING] 0.3.0.5
> **NT_ERROR** returns **False** for an error status, such as `STATUS_ACCESS_DENIED` (`&HC0000022`) and `STATUS_UNSUCCESSFUL` (`&HC0000001`), and **True** for a warning, such as `STATUS_BUFFER_OVERFLOW` (`&H80000005`). A driver tests `(Status And &HC0000000) = &HC0000000` instead.

### NT_SUCCESS
{: #NT_SUCCESS }

Returns whether an **NTSTATUS** value is a success or an informational status.

Syntax: **NT_SUCCESS**( *Status* )

*Status*
: *required* A **Long**: the status, as a routine returned it.

<!-- test: WDMHelperTests.NT_SUCCESS_SuccessAndInformationalAreSuccess -->
The function returns whether *Status* is 0 or more as a signed **Long**, as the WDK's `NT_SUCCESS` macro does: **True** for `STATUS_SUCCESS` and the informational statuses, **False** for the warnings and the errors, whose highest bit is set.
<!-- /test -->

### PointerAdd
{: #PointerAdd }

Adds a value to an address as an unsigned number.

Syntax: **PointerAdd**( *Start*, *Incr* )

*Start*
: *required* A **LongPtr**: the address.

*Incr*
: *required* A **LongPtr**: the number of bytes to add.

<!-- test: WDMHelperTests.PointerAdd_AddsUnsigned -->
A **LongPtr** is signed, and the addresses of kernel memory are the ones with the highest bit set, which are negative. The function adds as if both were unsigned, so that a sum may cross from `&H7FFFFFFF` to `&H80000000`, or from `&H7FFFFFFFFFFFFFFF` to `&H8000000000000000` in a 64-bit build, with no overflow error: `PointerAdd(&H7FFFFFFF, 1)` is `&H80000000` in a 32-bit build.
<!-- /test -->

### PsJobType
{: #PsJobType }

Returns the object type of jobs, the value of the kernel's **PsJobType** variable, in the same way as [**IoFileObjectType**](#IoFileObjectType).

Syntax: **PsJobType**()

### PsProcessType
{: #PsProcessType }

Returns the object type of processes, the value of the kernel's **PsProcessType** variable, in the same way as [**IoFileObjectType**](#IoFileObjectType).

Syntax: **PsProcessType**()

### PsThreadType
{: #PsThreadType }

Returns the object type of threads, the value of the kernel's **PsThreadType** variable, in the same way as [**IoFileObjectType**](#IoFileObjectType).

Syntax: **PsThreadType**()

### RemoveListHead
{: #RemoveListHead }

Removes the first entry of a doubly linked list.

Syntax: **RemoveListHead**( *ListHead* )

*ListHead*
: *required* A **LIST_ENTRY**, passed by reference: the head of the list, which has at least one entry.

The function returns a copy of the entry removed, a **LIST_ENTRY**, where the WDK's `RemoveHeadList` returns the entry's address; a driver that needs the address reads **ListHead.Flink** before the call. The WDK's routine links *ListHead* to the second entry, and sets that entry's **Blink** to *ListHead*.

<!-- test: KernelHelperTests.RemoveListHead_UnlinksTheFirstEntry -->
> [!WARNING] 0.3.0.5
> **RemoveListHead** copies the second entry into a local variable and links *ListHead* to the copy, as [**InsertHeadList**](#InsertHeadList) and **InsertTailList** link to a copy of their neighbour. **ListHead.Flink** then points into the procedure's own stack, which is gone once it returns, and the **Blink** of the second entry is not changed: it still points to the entry removed. The list is broken from the first remove on. A driver sets the links itself, as the WDK's routine does.

### SeQuerySubjectContextToken
{: #SeQuerySubjectContextToken }

Returns the effective access token of a security subject context.

Syntax: **SeQuerySubjectContextToken**( *SubjectContext* )

*SubjectContext*
: *required* A [**SECURITY_SUBJECT_CONTEXT**](#SECURITY_SUBJECT_CONTEXT), passed by reference, such as the **SubjectSecurityContext** of an [**ACCESS_STATE**](#ACCESS_STATE).

The function returns **ClientToken**, the impersonation token, when it is not 0, else **PrimaryToken**, the token of the process, as the WDK's `SeQuerySubjectContextToken` macro of ntifs.h does. The result is the address of the token, which [**SeQueryInformationToken**](#SeQueryInformationToken) takes. The function does not lock the context or the token: a driver that has to keep them from changing calls [**SeLockSubjectContext**](#SeLockSubjectContext) first.

### SeTokenObjectType
{: #SeTokenObjectType }

Returns the object type of access tokens, the value of the kernel's **SeTokenObjectType** variable, in the same way as [**IoFileObjectType**](#IoFileObjectType).

Syntax: **SeTokenObjectType**()

### StrRev
{: #StrRev }

Reverses the characters of a string in place, in kernel mode.

Syntax: **StrRev**( *sz* )

*sz*
: *required* A **LongPtr**: the address of the null-terminated UTF-16 string to reverse.

<!-- test: KernelHelperTests.LCaseUCaseStrRev_ChangeTheStringInPlace -->
The function calls [**_wcsrev**](#_wcsrev), which changes the string itself, and returns *sz*: "KERNEL MODE" becomes "EDOM LENREK".
<!-- /test -->

### TmEnlistmentObjectType
{: #TmEnlistmentObjectType }

Returns the object type of enlistments in transactions, the value of the kernel's **TmEnlistmentObjectType** variable, in the same way as [**IoFileObjectType**](#IoFileObjectType).

Syntax: **TmEnlistmentObjectType**()

### TmResourceManagerObjectType
{: #TmResourceManagerObjectType }

Returns the object type of resource managers, the value of the kernel's **TmResourceManagerObjectType** variable, in the same way as [**IoFileObjectType**](#IoFileObjectType).

Syntax: **TmResourceManagerObjectType**()

### TmTransactionManagerObjectType
{: #TmTransactionManagerObjectType }

Returns the object type of transaction managers, the value of the kernel's **TmTransactionManagerObjectType** variable, in the same way as [**IoFileObjectType**](#IoFileObjectType).

Syntax: **TmTransactionManagerObjectType**()

### TmTransactionObjectType
{: #TmTransactionObjectType }

Returns the object type of transactions, the value of the kernel's **TmTransactionObjectType** variable, in the same way as [**IoFileObjectType**](#IoFileObjectType).

Syntax: **TmTransactionObjectType**()

### UCase
{: #UCase }

Converts a string to uppercase in place, in kernel mode.

Syntax: **UCase**( *sz* )

*sz*
: *required* A **LongPtr**: the address of the null-terminated UTF-16 string to convert.

<!-- test: KernelHelperTests.LCaseUCaseStrRev_ChangeTheStringInPlace, KernelHelperTests.BareNames_CallTheModulesProcedures -->
The function has the name of VBA's **UCase** but takes the string's address. A driver calls it as `modWDM.UCase`: without the module name the call is VBA's (see [Names shared with VBA](.#names-shared-with-vba)). It calls [**_wcsupr**](#_wcsupr), which changes the characters of the string itself, and returns *sz*.
<!-- /test -->

### UNREFERENCED_PARAMETER
{: #UNREFERENCED_PARAMETER }

Marks a parameter as used, for a procedure that has to take a parameter it does not use, as the WDK's `UNREFERENCED_PARAMETER` macro does in C.

Syntax: **UNREFERENCED_PARAMETER** *arg*

*arg*
: *required* The parameter, of any type: the procedure is [generic](../../../../Features/Language/Generics), and its type is taken from the argument.

<!-- test: compile UNREFERENCED_PARAMETERMarksTheParameterUsed -->
A call of it is a use of *arg*, so the compiler's warning of an unused parameter, TB0025, does not name *arg* where that warning is turned on.
<!-- /test -->

The procedure does nothing, and has the [**DebugOnly**](../../../Core/Attributes#debugonly) attribute: a built driver contains no call of it.

### ZwCurrentPeb
{: #ZwCurrentPeb }

Returns the address of the process environment block (PEB) of the current process.

Syntax: **ZwCurrentPeb**()

The function returns what [**RtlGetCurrentPeb**](#RtlGetCurrentPeb) returns. The WDK has no `ZwCurrentPeb` macro; the name is the one that the headers of the Native API give to `NtCurrentPeb`. The PEB is in the process's user-mode memory. Not documented by Microsoft.

The 64-bit kernel does not export **RtlGetCurrentPeb** (see the note under [Declares](#declares)), so a 64-bit driver that calls **ZwCurrentPeb** does not load.

### ZwCurrentProcess
{: #ZwCurrentProcess }

Returns the pseudo-handle that stands for the current process.

Syntax: **ZwCurrentProcess**()

The function returns -1, as the WDK's `ZwCurrentProcess` macro, which stands for `NtCurrentProcess`, does. A routine that takes a process handle, such as **ZwQueryInformationProcess**, takes this value for the process in whose context the driver runs. The pseudo-handle is not a real handle, and need not be closed with [**ZwClose**](#ZwClose).

### ZwCurrentProcessToken
{: #ZwCurrentProcessToken }

Returns the pseudo-handle that stands for the primary access token of the current process.

Syntax: **ZwCurrentProcessToken**()

The function returns -4, the value of `GetCurrentProcessToken` in processthreadsapi.h. A routine that queries a token, such as **ZwQueryInformationToken**, takes it in place of a token handle. It need not be closed with [**ZwClose**](#ZwClose).

### ZwCurrentTeb
{: #ZwCurrentTeb }

Returns the pointer at the place where `NtCurrentTeb` of winnt.h reads the address of the current thread's thread environment block.

Syntax: **ZwCurrentTeb**()

The function is machine code, declared `CDecl` and **Naked**: in a 64-bit build it returns the pointer at `gs:[&H30]`, and in a 32-bit build the one at `fs:[&H18]`. These are the reads of `NtCurrentTeb` in winnt.h, which in user mode gives the address of the current thread's thread environment block (TEB). In kernel mode the register points to the processor control region, the `KPCR` of ntddk.h, and the pointer read is its field `Used_Self`, at the place of the **Self** field. The WDK's routine for the current thread's TEB in kernel mode is `PsGetCurrentThreadTeb`. Not documented by Microsoft.

### ZwCurrentThread
{: #ZwCurrentThread }

Returns the pseudo-handle that stands for the current thread.

Syntax: **ZwCurrentThread**()

The function returns -2, as the WDK's `ZwCurrentThread` macro, which stands for `NtCurrentThread`, does. A routine that takes a thread handle takes this value for the thread that calls it. The pseudo-handle is not a real handle, and need not be closed with [**ZwClose**](#ZwClose).

### ZwCurrentThreadEffectiveToken
{: #ZwCurrentThreadEffectiveToken }

Returns the pseudo-handle that stands for the effective access token of the current thread.

Syntax: **ZwCurrentThreadEffectiveToken**()

The function returns -6, the value of `GetCurrentThreadEffectiveToken` in processthreadsapi.h: the token of the thread when it impersonates a client, else the primary token of its process. A routine that queries a token, such as **ZwQueryInformationToken**, takes it in place of a token handle. It need not be closed with [**ZwClose**](#ZwClose).

### ZwCurrentThreadToken
{: #ZwCurrentThreadToken }

Returns the pseudo-handle that stands for the impersonation token of the current thread.

Syntax: **ZwCurrentThreadToken**()

The function returns -5, the value of `GetCurrentThreadToken` in processthreadsapi.h. A routine that queries a token, such as **ZwQueryInformationToken**, takes it in place of a token handle, when the thread impersonates a client. It need not be closed with [**ZwClose**](#ZwClose).

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
