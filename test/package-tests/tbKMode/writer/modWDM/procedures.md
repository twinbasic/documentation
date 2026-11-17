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
