---
title: modFltMgr
parent: tbKMode Package
permalink: /tB/Packages/Contributed/tbKMode/modFltMgr
has_toc: false
---

# modFltMgr module
{: .no_toc }

Declarations for a file-system minifilter driver: the routines of the Filter Manager, `fltmgr.sys`, and the structures, enumerations and constants they take.

A [minifilter](https://learn.microsoft.com/en-us/windows-hardware/drivers/ifs/filter-manager-concepts) is a driver that the Filter Manager calls before and after the I/O operations of the volumes it is attached to. It can look at an operation, change it, complete it itself or refuse it. In its **DriverEntry** a minifilter fills a [**FLT_REGISTRATION**](#FLT_REGISTRATION) with the operations it filters and its callbacks, passes it to [**FltRegisterFilter**](#FltRegisterFilter), and calls [**FltStartFiltering**](#FltStartFiltering). Its unload callback calls [**FltUnregisterFilter**](#FltUnregisterFilter).

The module covers a part of the Filter Manager's routines: registration, contexts, communication ports, file I/O, file names, volumes and instances, and cancellation. Its types of [**modWDM**](modWDM), such as **FILE_OBJECT**, **UNICODE_STRING** and **NTSTATUS**, are declared there.

A pointer to a filter, an instance, a volume, a context or a port is a **LongPtr**. A parameter with no `ByVal` is passed by reference: a structure, or the variable that receives a result.

* TOC
{:toc}

## Declares

<!-- test: compile GetFileNameInformationUnsafeTakesNameOptions, compile SetCancelCompletionTakesTheCallback, compile ClearCancelCompletionTakesOneArgument, compile GetUpperInstanceIsDeclared -->
Every routine is in `Fltmgr.sys`, and each declaration takes the routine's parameters in the routine's order.

{{table:declares}}
<!-- /test -->

## Delegates

<!-- test: compile ContextAllocateCallbackReturnsThePool -->
The callbacks a minifilter passes to the Filter Manager. A parameter or a field of one of these types takes `AddressOf` a procedure of the same signature.

{{table:delegates}}
<!-- /test -->

## Types

<!-- test: {{cases:FltMgrLayoutTests}} -->
Each structure has the size of its C structure, and its fields are at the C fields' offsets, in a 32-bit and in a 64-bit build.

{{table:types}}
<!-- /test -->

## Enumerations

<!-- test: {{cases:FltMgrValueTests -Constants_Values}} -->
Every member has the value of the Filter Manager's constant of the same name, apart from **FLT_ALL_CONTEXTS**.

{{table:enums}}
<!-- /test -->

## Constants

<!-- test: FltMgrValueTests.Constants_Values -->
Each constant has the value of the Filter Manager's constant of the same name.

{{table:consts}}
<!-- /test -->

The `IRP_MJ_` constants are the major function codes that the Filter Manager adds to those of an IRP, for fast I/O and file-system callbacks. Each is a **Byte**, for **FLT_OPERATION_REGISTRATION.MajorFunction**.

## Example

The operations a minifilter registers: a pre-operation callback for `IRP_MJ_CREATE`, and the entry that ends the array.

```tb check_build
Module MiniFilter
    Private Operations(0 To 1) As FLT_OPERATION_REGISTRATION
    Private Registration As FLT_REGISTRATION
    Private Filter As LongPtr

    Private Function PreCreate(Data As FLT_CALLBACK_DATA, FltObjects As FLT_RELATED_OBJECTS, CompletionContext As LongPtr) As FLT_PREOP_CALLBACK_STATUS
        Return FLT_PREOP_SUCCESS_NO_CALLBACK
    End Function

    Private Function FilterUnload(ByVal Flags As FLT_FILTER_UNLOAD_FLAGS) As Long
        FltUnregisterFilter Filter
        Return 0    ' STATUS_SUCCESS
    End Function

    Public Function RegisterMiniFilter(DriverObject As DRIVER_OBJECT) As Long
        Operations(0).MajorFunction = 0    ' IRP_MJ_CREATE
        Operations(0).PreOperation = AddressOf PreCreate
        Operations(1).MajorFunction = IRP_MJ_OPERATION_END

        Registration.Size = LenB(Registration)
        Registration.Version = FLT_REGISTRATION_VERSION
        Registration.OperationRegistration = VarPtr(Operations(0))
        Registration.FilterUnloadCallback = AddressOf FilterUnload

        Dim status As Long
        status = FltRegisterFilter(DriverObject, Registration, Filter)
        If status >= 0 Then
            status = FltStartFiltering(Filter)
            If status < 0 Then FltUnregisterFilter Filter
        End If
        Return status
    End Function
End Module
```

## See Also

- [modWDM](modWDM) module -- the types and routines every driver uses
- [Filter Manager concepts](https://learn.microsoft.com/en-us/windows-hardware/drivers/ifs/filter-manager-concepts) -- Microsoft's introduction to minifilters
- [fltkernel.h](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/) -- Microsoft's reference for the Filter Manager's routines
- [fafalone/FsMinifilter](https://github.com/fafalone/FsMinifilter) -- a minifilter written with this package, by its author
