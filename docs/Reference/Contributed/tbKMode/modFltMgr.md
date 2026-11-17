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

| Name | Description |
|------|-------------|
| [**FltAllocateContext**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltallocatecontext){: #FltAllocateContext } | Allocates a context of the given type and size. |
| [**FltAllocatePoolAlignedWithTag**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltallocatepoolalignedwithtag){: #FltAllocatePoolAlignedWithTag } | Allocates a buffer aligned for the volume's device, for noncached I/O. |
| [**FltBuildDefaultSecurityDescriptor**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltbuilddefaultsecuritydescriptor){: #FltBuildDefaultSecurityDescriptor } | Builds a default security descriptor for **FltCreateCommunicationPort**. |
| [**FltCancelFileOpen**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltcancelfileopen){: #FltCancelFileOpen } | Closes a file that a create operation has just opened, from the post-create callback. |
| [**FltCancelIo**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltcancelio){: #FltCancelIo } | Cancels an I/O operation the minifilter started. |
| [**FltClearCancelCompletion**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltclearcancelcompletion){: #FltClearCancelCompletion } | Clears the cancel routine set for an I/O operation. |
| [**FltClose**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltclose){: #FltClose } | Closes a handle that **FltCreateFile** or one of its variants opened. |
| [**FltCloseClientPort**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltcloseclientport){: #FltCloseClientPort } | Closes a communication client port. *ClientPort* is the variable that holds the port. |
| [**FltCloseCommunicationPort**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltclosecommunicationport){: #FltCloseCommunicationPort } | Closes the minifilter's communication server port. |
| [**FltCompareInstanceAltitudes**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltcompareinstancealtitudes){: #FltCompareInstanceAltitudes } | Compares the altitudes of two instances: negative, zero or positive. |
| [**FltCreateCommunicationPort**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltcreatecommunicationport){: #FltCreateCommunicationPort } | Creates the server port that user-mode programs connect to. |
| [**FltCreateFile**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltcreatefile){: #FltCreateFile } | Creates or opens a file, sending the request below the calling instance. |
| [**FltCreateFileEx**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltcreatefileex){: #FltCreateFileEx } | As **FltCreateFile**, and also returns the file object. |
| [**FltCreateFileEx2**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltcreatefileex2){: #FltCreateFileEx2 } | As **FltCreateFileEx**, with a driver create context. |
| [**FltDeleteContext**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltdeletecontext){: #FltDeleteContext } | Marks a context for deletion. |
| [**FltFlushBuffers**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltflushbuffers){: #FltFlushBuffers } | Sends the file system a flush request for a file. |
| [**FltFreeCallbackData**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltfreecallbackdata){: #FltFreeCallbackData } | Frees a callback data structure that **FltAllocateCallbackData** allocated. |
| [**FltFreePoolAlignedWithTag**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltfreepoolalignedwithtag){: #FltFreePoolAlignedWithTag } | Frees a buffer that **FltAllocatePoolAlignedWithTag** allocated. |
| [**FltFreeSecurityDescriptor**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltfreesecuritydescriptor){: #FltFreeSecurityDescriptor } | Frees a security descriptor that **FltBuildDefaultSecurityDescriptor** built. |
| [**FltGetBottomInstance**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltgetbottominstance){: #FltGetBottomInstance } | Returns the instance at the bottom of a volume's instance stack. |
| [**FltGetContexts**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltgetcontexts){: #FltGetContexts } | Fills a **FLT_RELATED_CONTEXTS** with the minifilter's contexts for an operation's objects. |
| [**FltGetDeviceObject**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltgetdeviceobject){: #FltGetDeviceObject } | Returns the Filter Manager's volume device object for a volume. |
| [**FltGetDiskDeviceObject**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltgetdiskdeviceobject){: #FltGetDiskDeviceObject } | Returns the disk device object of a volume. |
| [**FltGetFileContext**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltgetfilecontext){: #FltGetFileContext } | Returns the minifilter's context for a file. |
| [**FltGetFileNameInformation**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltgetfilenameinformation){: #FltGetFileNameInformation } | Returns name information for the file of an operation, as a pointer to a **FLT_FILE_NAME_INFORMATION**. |
| [**FltGetFileNameInformationUnsafe**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltgetfilenameinformationunsafe){: #FltGetFileNameInformationUnsafe } | Returns name information for an open file, from its file object and instance. |
| [**FltGetFilterFromInstance**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltgetfilterfrominstance){: #FltGetFilterFromInstance } | Returns the filter that created an instance. |
| [**FltGetIrpName**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltgetirpname){: #FltGetIrpName } | Returns the name of a major function code, as a pointer to an ANSI string. |
| [**FltGetLowerInstance**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltgetlowerinstance){: #FltGetLowerInstance } | Returns the next instance below the given one on the same volume. |
| [**FltGetRequestorProcessId**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltgetrequestorprocessid){: #FltGetRequestorProcessId } | Returns the ID of the process that requested an I/O operation. |
| [**FltGetRequestorProcessIdEx**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltgetrequestorprocessidex){: #FltGetRequestorProcessIdEx } | As **FltGetRequestorProcessId**, as a **LongPtr**, the size of a handle. |
| [**FltGetRoutineAddress**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltgetroutineaddress){: #FltGetRoutineAddress } | Returns the address of a Filter Manager routine by name, or 0 where this Windows has none. |
| [**FltGetStreamContext**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltgetstreamcontext){: #FltGetStreamContext } | Returns the minifilter's context for a file stream. |
| [**FltGetStreamHandleContext**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltgetstreamhandlecontext){: #FltGetStreamHandleContext } | Returns the minifilter's context for a stream handle. |
| [**FltGetTopInstance**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltgettopinstance){: #FltGetTopInstance } | Returns the instance at the top of a volume's instance stack. |
| [**FltGetUpperInstance**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltgetupperinstance){: #FltGetUpperInstance } | Returns the next instance above the given one on the same volume. |
| [**FltGetVolumeFromDeviceObject**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltgetvolumefromdeviceobject){: #FltGetVolumeFromDeviceObject } | Returns the volume that a volume device object stands for. |
| [**FltGetVolumeFromFileObject**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltgetvolumefromfileobject){: #FltGetVolumeFromFileObject } | Returns the volume that a file stream is on. |
| [**FltGetVolumeFromInstance**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltgetvolumefrominstance){: #FltGetVolumeFromInstance } | Returns the volume that an instance is attached to. |
| [**FltGetVolumeName**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltgetvolumename){: #FltGetVolumeName } | Gets a volume's name, or with no *VolumeName* the buffer size the name needs. |
| [**FltGetVolumeProperties**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltgetvolumeproperties){: #FltGetVolumeProperties } | Fills a **FLT_VOLUME_PROPERTIES** for a volume. |
| [**FltIsDirectory**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltisdirectory){: #FltIsDirectory } | Tells whether a file object is a directory. |
| [**FltIsFltMgrVolumeDeviceObject**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltisfltmgrvolumedeviceobject){: #FltIsFltMgrVolumeDeviceObject } | Tells whether a device object is one of the Filter Manager's volume device objects. |
| [**FltIsIoCanceled**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltisiocanceled){: #FltIsIoCanceled } | Tells whether an IRP-based operation has been canceled. |
| [**FltObjectDereference**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltobjectdereference){: #FltObjectDereference } | Removes a rundown reference from a filter, instance or volume. Pass the pointer as `ByVal`. |
| [**FltObjectReference**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltobjectreference){: #FltObjectReference } | Adds a rundown reference to a filter, instance or volume. *FltObject* is `As Any`: pass the pointer as `ByVal`, or the routine is given the variable's address. |
| [**FltOpenVolume**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltopenvolume){: #FltOpenVolume } | Returns a handle and a file object for the volume an instance is attached to. |
| [**FltParseFileNameInformation**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltparsefilenameinformation){: #FltParseFileNameInformation } | Parses the name in a **FLT_FILE_NAME_INFORMATION** into its extension, stream, final component and parent directory. |
| [**FltQueryInformationFile**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltqueryinformationfile){: #FltQueryInformationFile } | Retrieves information about a file. |
| [**FltReadFile**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltreadfile){: #FltReadFile } | Reads from an open file, stream or device. |
| [**FltReadFileEx**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltreadfileex){: #FltReadFileEx } | As **FltReadFile**, with a byte-range lock key and an MDL. |
| [**FltReferenceContext**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltreferencecontext){: #FltReferenceContext } | Adds a reference to a context. |
| [**FltRegisterFilter**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltregisterfilter){: #FltRegisterFilter } | Registers the minifilter with the Filter Manager, from a **FLT_REGISTRATION**, and returns its filter pointer. |
| [**FltReleaseContext**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltreleasecontext){: #FltReleaseContext } | Releases a reference to a context. |
| [**FltReleaseContexts**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltreleasecontexts){: #FltReleaseContexts } | Releases every context in a **FLT_RELATED_CONTEXTS**. |
| [**FltReleaseFileNameInformation**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltreleasefilenameinformation){: #FltReleaseFileNameInformation } | Releases a file name information structure. |
| [**FltSendMessage**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltsendmessage){: #FltSendMessage } | Sends a message to the user-mode program connected to a client port, and can wait for its reply. |
| [**FltSetCancelCompletion**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltsetcancelcompletion){: #FltSetCancelCompletion } | Sets a cancel routine for an I/O operation. |
| [**FltSetFileContext**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltsetfilecontext){: #FltSetFileContext } | Sets the minifilter's context for a file. |
| [**FltSetInformationFile**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltsetinformationfile){: #FltSetInformationFile } | Sets information about a file. |
| [**FltSetStreamContext**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltsetstreamcontext){: #FltSetStreamContext } | Sets the minifilter's context for a file stream. |
| [**FltSetStreamHandleContext**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltsetstreamhandlecontext){: #FltSetStreamHandleContext } | Sets the minifilter's context for a stream handle. |
| [**FltStartFiltering**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltstartfiltering){: #FltStartFiltering } | Starts filtering: from this call on the Filter Manager calls the minifilter's callbacks. |
| [**FltTagFile**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-flttagfile){: #FltTagFile } | Sets a reparse point on a file or directory. |
| [**FltTagFileEx**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-flttagfileex){: #FltTagFileEx } | As **FltTagFile**, replacing an existing reparse point only when its tag and GUID match. |
| [**FltUnregisterFilter**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltunregisterfilter){: #FltUnregisterFilter } | Unregisters the minifilter, from its unload callback. |
| [**FltUntagFile**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltuntagfile){: #FltUntagFile } | Removes a reparse point from a file or directory. |
| [**FltWriteFile**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltwritefile){: #FltWriteFile } | Writes to an open file, stream or device. |
| [**FltWriteFileEx**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nf-fltkernel-fltwritefileex){: #FltWriteFileEx } | As **FltWriteFile**, with a byte-range lock key and an MDL. |
<!-- /test -->

## Delegates

<!-- test: compile ContextAllocateCallbackReturnsThePool -->
The callbacks a minifilter passes to the Filter Manager. A parameter or a field of one of these types takes `AddressOf` a procedure of the same signature.

| Name | Description |
|------|-------------|
| **FLT_COMPLETE_CANCELED_CALLBACK**{: #FLT_COMPLETE_CANCELED_CALLBACK } | The cancel routine of **FltSetCancelCompletion**. |
| [**FLT_COMPLETED_ASYNC_IO_CALLBACK**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nc-fltkernel-pflt_completed_async_io_callback){: #FLT_COMPLETED_ASYNC_IO_CALLBACK } | Called when an asynchronous **FltReadFile** or **FltWriteFile** has finished. |
| [**FLT_CONNECT_NOTIFY**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nc-fltkernel-pflt_connect_notify){: #FLT_CONNECT_NOTIFY } | Called when a user-mode program connects to the server port. |
| [**FLT_CONTEXT_ALLOCATE_CALLBACK**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nc-fltkernel-pflt_context_allocate_callback){: #FLT_CONTEXT_ALLOCATE_CALLBACK } | Allocates a context and returns its address, for **FLT_CONTEXT_REGISTRATION.ContextAllocateCallback**. |
| [**FLT_CONTEXT_CLEANUP_CALLBACK**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nc-fltkernel-pflt_context_cleanup_callback){: #FLT_CONTEXT_CLEANUP_CALLBACK } | Cleans a context up before it is freed. |
| [**FLT_CONTEXT_FREE_CALLBACK**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nc-fltkernel-pflt_context_free_callback){: #FLT_CONTEXT_FREE_CALLBACK } | Frees a context that the minifilter's own allocate routine allocated. |
| [**FLT_DISCONNECT_NOTIFY**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nc-fltkernel-pflt_disconnect_notify){: #FLT_DISCONNECT_NOTIFY } | Called when the client port's last handle is closed. |
| [**FLT_MESSAGE_NOTIFY**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/nc-fltkernel-pflt_message_notify){: #FLT_MESSAGE_NOTIFY } | Called when a user-mode program sends the minifilter a message. |
<!-- /test -->

## Types

<!-- test: FltMgrLayoutTests.FLT_CALLBACK_DATA_Layout, FltMgrLayoutTests.FLT_CONTEXT_REGISTRATION_Layout, FltMgrLayoutTests.FLT_FILE_NAME_INFORMATION_Layout, FltMgrLayoutTests.FLT_IO_PARAMETER_BLOCK_Layout, FltMgrLayoutTests.FLT_OPERATION_REGISTRATION_Layout, FltMgrLayoutTests.FLT_PARAMETERS_Create_Layout, FltMgrLayoutTests.FLT_PARAMETERS_DeviceIoControl_Buffered_Layout, FltMgrLayoutTests.FLT_PARAMETERS_FsControl_Common_Layout, FltMgrLayoutTests.FLT_PARAMETERS_Others_Layout, FltMgrLayoutTests.FLT_PARAMETERS_Read_Layout, FltMgrLayoutTests.FLT_PARAMETERS_SetFileInformation_Layout, FltMgrLayoutTests.FLT_PARAMETERS_SetVolumeInformation_Layout, FltMgrLayoutTests.FLT_PARAMETERS_Write_Layout, FltMgrLayoutTests.FLT_REGISTRATION_Layout, FltMgrLayoutTests.FLT_RELATED_CONTEXTS_Layout, FltMgrLayoutTests.FLT_RELATED_CONTEXTS_EX_Layout, FltMgrLayoutTests.FLT_RELATED_OBJECTS_Layout, FltMgrLayoutTests.FLT_VOLUME_PROPERTIES_Layout -->
Each structure has the size of its C structure, and its fields are at the C fields' offsets, in a 32-bit and in a 64-bit build.

| Name | Description |
|------|-------------|
| [**FLT_CALLBACK_DATA**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/ns-fltkernel-_flt_callback_data){: #FLT_CALLBACK_DATA } | One I/O operation, as every pre-operation and post-operation callback receives it: its flags, thread, parameter block (**Iopb**, a pointer to a **FLT_IO_PARAMETER_BLOCK**), status and requestor mode. The C union of the four filter contexts and the queue links is the array **FilterCtxOrQueueLnkCtx**. |
| [**FLT_CONTEXT_REGISTRATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/ns-fltkernel-_flt_context_registration){: #FLT_CONTEXT_REGISTRATION } | One context type the minifilter uses, with its size, pool tag and callbacks. **FLT_REGISTRATION.ContextRegistration** points to an array of them that ends with one of type **FLT_CONTEXT_END**. |
| [**FLT_FILE_NAME_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/ns-fltkernel-_flt_file_name_information){: #FLT_FILE_NAME_INFORMATION } | A file's name and, once parsed, its volume, share, extension, stream, final component and parent directory, each a **UNICODE_STRING**. |
| [**FLT_IO_PARAMETER_BLOCK**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/ns-fltkernel-_flt_io_parameter_block){: #FLT_IO_PARAMETER_BLOCK } | The parameters of an I/O operation: the IRP flags, the major and minor function, the target file object and instance. The C union **Parameters** is a **Byte** array, 48 bytes in a 64-bit build and 28 in a 32-bit one, which a driver copies into the **FLT_PARAMETERS_** type of the operation. |
| [**FLT_OPERATION_REGISTRATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/ns-fltkernel-_flt_operation_registration){: #FLT_OPERATION_REGISTRATION } | One major function the minifilter filters, with its pre-operation and post-operation callbacks. **FLT_REGISTRATION.OperationRegistration** points to an array of them that ends with one whose **MajorFunction** is **IRP_MJ_OPERATION_END**. |
| **FLT_PARAMETERS_Create**{: #FLT_PARAMETERS_Create } | The **Create** member of the C union **FLT_PARAMETERS**, for `IRP_MJ_CREATE`. |
| **FLT_PARAMETERS_DeviceIoControl_Buffered**{: #FLT_PARAMETERS_DeviceIoControl_Buffered } | The **DeviceIoControl.Buffered** member, for a device control request of `METHOD_BUFFERED`. |
| **FLT_PARAMETERS_FsControl_Common**{: #FLT_PARAMETERS_FsControl_Common } | The **FileSystemControl.Common** member, for `IRP_MJ_FILE_SYSTEM_CONTROL`. |
| **FLT_PARAMETERS_Others**{: #FLT_PARAMETERS_Others } | The **Others** member: five pointer-sized arguments and a **LARGE_INTEGER**, for any other operation. |
| **FLT_PARAMETERS_Read**{: #FLT_PARAMETERS_Read } | The **Read** member, for `IRP_MJ_READ`. |
| **FLT_PARAMETERS_SetFileInformation**{: #FLT_PARAMETERS_SetFileInformation } | The **SetFileInformation** member, for `IRP_MJ_SET_INFORMATION`. Its inner C union (**ReplaceIfExists** and **AdvanceOnly**, **ClusterCount**, **DeleteHandle**) is one **LongPtr** field named **union**. |
| **FLT_PARAMETERS_SetVolumeInformation**{: #FLT_PARAMETERS_SetVolumeInformation } | The **SetVolumeInformation** member, for `IRP_MJ_SET_VOLUME_INFORMATION`. |
| **FLT_PARAMETERS_Write**{: #FLT_PARAMETERS_Write } | The **Write** member, for `IRP_MJ_WRITE`. |
| [**FLT_REGISTRATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/ns-fltkernel-_flt_registration){: #FLT_REGISTRATION } | What a minifilter registers with **FltRegisterFilter**: its size and version, flags, context and operation arrays, and callbacks. It is the structure of version **FLT_REGISTRATION_VERSION_0202**, which has no **SectionNotificationCallback**. |
| [**FLT_RELATED_CONTEXTS**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/ns-fltkernel-_flt_related_contexts){: #FLT_RELATED_CONTEXTS } | The minifilter's contexts for the objects of an operation, as **FltGetContexts** fills it. |
| [**FLT_RELATED_CONTEXTS_EX**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/ns-fltkernel-_flt_related_contexts_ex){: #FLT_RELATED_CONTEXTS_EX } | As **FLT_RELATED_CONTEXTS**, with the section context. |
| [**FLT_RELATED_OBJECTS**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/ns-fltkernel-_flt_related_objects){: #FLT_RELATED_OBJECTS } | The filter, volume, instance, file object and transaction of an operation, as every callback receives them. |
| [**FLT_VOLUME_PROPERTIES**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltkernel/ns-fltkernel-_flt_volume_properties){: #FLT_VOLUME_PROPERTIES } | A volume's device type, characteristics, sector size and the names of its file system driver and devices, as **FltGetVolumeProperties** fills it. |
<!-- /test -->

## Enumerations

<!-- test: FltMgrValueTests.FLT_ALLOCATE_CALLBACK_DATA_FLAGS_Values, FltMgrValueTests.FLT_CALLBACK_DATA_FLAGS_Values, FltMgrValueTests.FLT_CONTEXT_REGISTRATION_FLAGS_Values, FltMgrValueTests.FLT_CONTEXT_TYPE_Values, FltMgrValueTests.FLT_FILESYSTEM_TYPE_Values, FltMgrValueTests.FLT_FILE_NAME_OPTIONS_Values, FltMgrValueTests.FLT_FILE_NAME_PARSED_FLAGS_Values, FltMgrValueTests.FLT_FILTER_UNLOAD_FLAGS_Values, FltMgrValueTests.FLT_INSTANCE_SETUP_FLAGS_Values, FltMgrValueTests.FLT_IO_OPERATION_FLAGS_Values, FltMgrValueTests.FLT_POSTOP_CALLBACK_STATUS_Values, FltMgrValueTests.FLT_POST_OPERATION_FLAGS_Values, FltMgrValueTests.FLT_PREOP_CALLBACK_STATUS_Values, FltMgrValueTests.FLT_REGISTRATION_FLAGS_Values, FltMgrValueTests.FLT_SET_CONTEXT_OPERATION_Values, FltMgrValueTests.FltPortAccessRights_Values, FltMgrValueTests.FltVolumePropertyFlags_Values -->
Every member has the value of the Filter Manager's constant of the same name, apart from **FLT_ALL_CONTEXTS**.

| Name | Description |
|------|-------------|
| **FLT_ALLOCATE_CALLBACK_DATA_FLAGS**{: #FLT_ALLOCATE_CALLBACK_DATA_FLAGS } | The flag of **FltAllocateCallbackDataEx**, a routine the package does not declare. |
| **FLT_CALLBACK_DATA_FLAGS**{: #FLT_CALLBACK_DATA_FLAGS } | The `FLTFL_CALLBACK_DATA_` flags of **FLT_CALLBACK_DATA.Flags**: the kind of operation, whether it was generated or reissued, and whether its parameters were changed. |
| **FLT_CONTEXT_REGISTRATION_FLAGS**{: #FLT_CONTEXT_REGISTRATION_FLAGS } | The flag of **FLT_CONTEXT_REGISTRATION.Flags**. |
| **FLT_CONTEXT_TYPE**{: #FLT_CONTEXT_TYPE } | The context types, `FLT_VOLUME_CONTEXT` to `FLT_TRANSACTION_CONTEXT`, with **FLT_CONTEXT_END** and **FLT_ALL_CONTEXTS**. It has no **FLT_SECTION_CONTEXT**, and **FLT_ALL_CONTEXTS** is `&H3F`, without it. |
| [**FLT_FILE_NAME_OPTIONS**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ifs/flt-file-name-options){: #FLT_FILE_NAME_OPTIONS } | The name format (`FLT_FILE_NAME_NORMALIZED`, `_OPENED`, `_SHORT`), query method and flags that **FltGetFileNameInformation** takes, combined with **Or**. |
| **FLT_FILE_NAME_PARSED_FLAGS**{: #FLT_FILE_NAME_PARSED_FLAGS } | The bits of **FLT_FILE_NAME_INFORMATION.NamesParsed**: which parts of the name have been parsed. |
| [**FLT_FILESYSTEM_TYPE**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/fltuserstructures/ne-fltuserstructures-_flt_filesystem_type){: #FLT_FILESYSTEM_TYPE } | The file system of a volume, as the instance setup callback receives it: `FLT_FSTYPE_NTFS`, `FLT_FSTYPE_FAT` and the others. |
| **FLT_FILTER_UNLOAD_FLAGS**{: #FLT_FILTER_UNLOAD_FLAGS } | The flag the unload callback receives: the unload is mandatory. |
| **FLT_INSTANCE_QUERY_TEARDOWN_FLAGS**{: #FLT_INSTANCE_QUERY_TEARDOWN_FLAGS } | The flags the instance query teardown callback receives. None is defined. |
| **FLT_INSTANCE_SETUP_FLAGS**{: #FLT_INSTANCE_SETUP_FLAGS } | The flags the instance setup callback receives: an automatic or a manual attachment, a newly mounted or a detached volume. |
| **FLT_IO_OPERATION_FLAGS**{: #FLT_IO_OPERATION_FLAGS } | The flags of **FltReadFile** and **FltWriteFile**: noncached, paging, without updating the file's byte offset. |
| **FLT_POST_OPERATION_FLAGS**{: #FLT_POST_OPERATION_FLAGS } | The flag a post-operation callback receives: the instance is being torn down, and the operation is being drained. |
| **FLT_POSTOP_CALLBACK_STATUS**{: #FLT_POSTOP_CALLBACK_STATUS } | What a post-operation callback returns. |
| **FLT_PREOP_CALLBACK_STATUS**{: #FLT_PREOP_CALLBACK_STATUS } | What a pre-operation callback returns: pass the operation on with or without a post-operation callback, pend it, complete it. |
| **FLT_REGISTRATION_FLAGS**{: #FLT_REGISTRATION_FLAGS } | The flags of **FLT_REGISTRATION.Flags**. |
| **FLT_SET_CONTEXT_OPERATION**{: #FLT_SET_CONTEXT_OPERATION } | What **FltSetFileContext** and the other set routines do when a context is already set: replace it or keep it. |
| **FltPortAccessRights**{: #FltPortAccessRights } | The access rights of a communication port: **FLT_PORT_CONNECT** and **FLT_PORT_ALL_ACCESS**. |
| **FltVolumePropertyFlags**{: #FltVolumePropertyFlags } | The flag of **FLT_VOLUME_PROPERTIES.Flags**: a DAX volume. |
<!-- /test -->

## Constants

<!-- test: FltMgrValueTests.Constants_Values -->
Each constant has the value of the Filter Manager's constant of the same name.

| Name | Value | Description |
|------|-------|-------------|
| **FLT_REGISTRATION_VERSION**{: #FLT_REGISTRATION_VERSION } | `FLT_REGISTRATION_VERSION_0202` | The version a **FLT_REGISTRATION** of this package states. |
| **FLT_REGISTRATION_VERSION_0200**{: #FLT_REGISTRATION_VERSION_0200 } | `&H0200` | The registration version of Windows XP SP2 and Windows Server 2003 SP1. |
| **FLT_REGISTRATION_VERSION_0201**{: #FLT_REGISTRATION_VERSION_0201 } | `&H0201` | The registration version of Windows Vista Beta 2. |
| **FLT_REGISTRATION_VERSION_0202**{: #FLT_REGISTRATION_VERSION_0202 } | `&H0202` | The registration version of Windows Vista. |
| **FLT_REGISTRATION_VERSION_0203**{: #FLT_REGISTRATION_VERSION_0203 } | `&H0203` | The registration version of Windows 8, which adds **SectionNotificationCallback**. |
| **FLT_VARIABLE_SIZED_CONTEXTS**{: #FLT_VARIABLE_SIZED_CONTEXTS } | `(-1)` | For **FLT_CONTEXT_REGISTRATION.Size**: the contexts of this type differ in size. |
| **IRP_MJ_ACQUIRE_FOR_CC_FLUSH**{: #IRP_MJ_ACQUIRE_FOR_CC_FLUSH } | `&HFB` | The cache manager acquires a file for a flush. |
| **IRP_MJ_ACQUIRE_FOR_MOD_WRITE**{: #IRP_MJ_ACQUIRE_FOR_MOD_WRITE } | `&HFD` | The modified page writer acquires a file. |
| **IRP_MJ_ACQUIRE_FOR_SECTION_SYNCHRONIZATION**{: #IRP_MJ_ACQUIRE_FOR_SECTION_SYNCHRONIZATION } | `&HFF` | A file is acquired to create a section. |
| **IRP_MJ_FAST_IO_CHECK_IF_POSSIBLE**{: #IRP_MJ_FAST_IO_CHECK_IF_POSSIBLE } | `&HF3` | A check whether fast I/O is possible on a file. |
| **IRP_MJ_MDL_READ**{: #IRP_MJ_MDL_READ } | `&HF1` | A fast I/O MDL read. |
| **IRP_MJ_MDL_READ_COMPLETE**{: #IRP_MJ_MDL_READ_COMPLETE } | `&HF0` | The completion of an MDL read. |
| **IRP_MJ_MDL_WRITE_COMPLETE**{: #IRP_MJ_MDL_WRITE_COMPLETE } | `&HEE` | The completion of an MDL write. |
| **IRP_MJ_NETWORK_QUERY_OPEN**{: #IRP_MJ_NETWORK_QUERY_OPEN } | `&HF2` | A fast I/O query of a file's network open information. |
| **IRP_MJ_OPERATION_END**{: #IRP_MJ_OPERATION_END } | `&H80` | Ends the array of **FLT_OPERATION_REGISTRATION**. |
| **IRP_MJ_PREPARE_MDL_WRITE**{: #IRP_MJ_PREPARE_MDL_WRITE } | `&HEF` | A fast I/O MDL write. |
| **IRP_MJ_QUERY_OPEN**{: #IRP_MJ_QUERY_OPEN } | `&HF9` | A query of an open file's information. |
| **IRP_MJ_RELEASE_FOR_CC_FLUSH**{: #IRP_MJ_RELEASE_FOR_CC_FLUSH } | `&HFA` | The release after a cache manager flush. |
| **IRP_MJ_RELEASE_FOR_MOD_WRITE**{: #IRP_MJ_RELEASE_FOR_MOD_WRITE } | `&HFC` | The release by the modified page writer. |
| **IRP_MJ_RELEASE_FOR_SECTION_SYNCHRONIZATION**{: #IRP_MJ_RELEASE_FOR_SECTION_SYNCHRONIZATION } | `&HFE` | The release after a section is created. |
| **IRP_MJ_VOLUME_DISMOUNT**{: #IRP_MJ_VOLUME_DISMOUNT } | `&HEC` | A volume is dismounted. |
| **IRP_MJ_VOLUME_MOUNT**{: #IRP_MJ_VOLUME_MOUNT } | `&HED` | A volume is mounted. |
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
