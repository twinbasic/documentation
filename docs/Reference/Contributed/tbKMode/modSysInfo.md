---
title: modSysInfo
parent: tbKMode Package
permalink: /tB/Packages/Contributed/tbKMode/modSysInfo
has_toc: false
---

# modSysInfo module
{: .no_toc }

Declarations for asking Windows about the system, processes, access tokens, objects, files and volumes: the `Zw` information routines of `ntoskrnl.exe`, the information classes they take, and the structures and flags that each class reads or writes.

Each routine takes a class, a member of an enumeration such as [**SYSTEM_INFORMATION_CLASS**](#SYSTEM_INFORMATION_CLASS), and a buffer with its length. The buffer holds the structure that the class reads or writes: each structure's row in the [table of structures](#types) ends with its classes. A routine returns an **NTSTATUS**, which is negative for an error.

Microsoft documents most of the `FILE_`, `FILE_FS_` and `TOKEN_` structures and the classes of files, volumes, tokens and objects; a name with a link here has a page on Microsoft Learn. It documents only a few of the classes of the system and of processes, on the pages of [**ZwQuerySystemInformation**](#ZwQuerySystemInformation) and [**ZwQueryInformationProcess**](#ZwQueryInformationProcess), and the process parameters only in part. The other classes, most of the `SYSTEM_` structures and the process environment blocks are not documented: they are the structures of Windows' own headers, as the System Informer project's `phnt` headers describe them, and a new version of Windows can change them. The process environment block and the process parameters have a structure for each version of Windows that changed them, such as [**PEB_WIN10_R5**](#PEB_WIN10_R5) and [**RTL_USER_PROCESS_PARAMETERS_WIN10_R5**](#RTL_USER_PROCESS_PARAMETERS_WIN10_R5).

Some of the structures hold fields of types that [**modWDM**](modWDM) declares, such as **UNICODE_STRING**, **LARGE_INTEGER** and **IO_STATUS_BLOCK**.

* TOC
{:toc}

## Declares

Every routine is in `ntoskrnl.exe`. A parameter with no `ByVal` is passed by reference: the buffer, which is `As Any`, the **IO_STATUS_BLOCK**, and *ReturnLength*, which receives the length the routine wrote or needs.

| Name | Description |
|------|-------------|
| [**ZwQueryInformationFile**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwqueryinformationfile){: #ZwQueryInformationFile } | Retrieves information about a file, of a **FILE_INFORMATION_CLASS**. |
| [**ZwQueryInformationProcess**](https://learn.microsoft.com/en-us/windows/win32/procthread/zwqueryinformationprocess){: #ZwQueryInformationProcess } | Retrieves information about a process, of a **PROCESSINFOCLASS**. |
| [**ZwQueryInformationToken**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-zwqueryinformationtoken){: #ZwQueryInformationToken } | Retrieves information about an access token, of a **TOKEN_INFORMATION_CLASS**. |
| [**ZwQueryObject**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-zwqueryobject){: #ZwQueryObject } | Retrieves information about an object, of an **OBJECT_INFORMATION_CLASS**. |
| **ZwQuerySection**{: #ZwQuerySection } | Retrieves information about a section object, of a **SECTION_INFORMATION_CLASS**. Not documented by Microsoft. |
| [**ZwQuerySystemInformation**](https://learn.microsoft.com/en-us/windows/win32/sysinfo/zwquerysysteminformation){: #ZwQuerySystemInformation } | Retrieves information about the system, of a **SYSTEM_INFORMATION_CLASS**. |
| [**ZwQueryVolumeInformationFile**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-zwqueryvolumeinformationfile){: #ZwQueryVolumeInformationFile } | Retrieves information about the volume of a file, of an **FS_INFORMATION_CLASS**. |
| [**ZwSetInformationFile**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwsetinformationfile){: #ZwSetInformationFile } | Changes information about a file, of a **FILE_INFORMATION_CLASS**. |
| [**ZwSetInformationToken**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-zwsetinformationtoken){: #ZwSetInformationToken } | Changes information in an access token, of a **TOKEN_INFORMATION_CLASS**. |
| [**ZwSetVolumeInformationFile**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-zwsetvolumeinformationfile){: #ZwSetVolumeInformationFile } | Changes information about the volume of a file, of an **FS_INFORMATION_CLASS**. |

## Types

<!-- test: SysInfoLayoutTests.FILE_ACCESS_INFORMATION_Layout, SysInfoLayoutTests.FILE_ALIGNMENT_INFORMATION_Layout, SysInfoLayoutTests.FILE_ALLOCATION_INFORMATION_Layout, SysInfoLayoutTests.FILE_ALL_INFORMATION_Layout, SysInfoLayoutTests.FILE_ATTRIBUTE_TAG_INFORMATION_Layout, SysInfoLayoutTests.FILE_BASIC_INFORMATION_Layout, SysInfoLayoutTests.FILE_BOTH_DIR_INFORMATION_Layout, SysInfoLayoutTests.FILE_CASE_SENSITIVE_INFORMATION_Layout, SysInfoLayoutTests.FILE_COMPLETION_INFORMATION_Layout, SysInfoLayoutTests.FILE_COMPRESSION_INFORMATION_Layout, SysInfoLayoutTests.FILE_DESIRED_STORAGE_CLASS_INFORMATION_Layout, SysInfoLayoutTests.FILE_DIRECTORY_INFORMATION_Layout, SysInfoLayoutTests.FILE_DISPOSITION_INFORMATION_Layout, SysInfoLayoutTests.FILE_DISPOSITION_INFO_EX_Layout, SysInfoLayoutTests.FILE_EA_INFORMATION_Layout, SysInfoLayoutTests.FILE_END_OF_FILE_INFORMATION_Layout, SysInfoLayoutTests.FILE_FS_ATTRIBUTE_INFORMATION_Layout, SysInfoLayoutTests.FILE_FS_CONTROL_INFORMATION_Layout, SysInfoLayoutTests.FILE_FS_DATA_COPY_INFORMATION_Layout, SysInfoLayoutTests.FILE_FS_DEVICE_INFORMATION_Layout, SysInfoLayoutTests.FILE_FS_DRIVER_PATH_INFORMATION_Layout, SysInfoLayoutTests.FILE_FS_FULL_SIZE_INFORMATION_Layout, SysInfoLayoutTests.FILE_FS_FULL_SIZE_INFORMATION_EX_Layout, SysInfoLayoutTests.FILE_FS_LABEL_INFORMATION_Layout, SysInfoLayoutTests.FILE_FS_METADATA_SIZE_INFORMATION_Layout, SysInfoLayoutTests.FILE_FS_OBJECTID_INFORMATION_Layout, SysInfoLayoutTests.FILE_FS_SECTOR_SIZE_INFORMATION_Layout, SysInfoLayoutTests.FILE_FS_SIZE_INFORMATION_Layout, SysInfoLayoutTests.FILE_FS_VOLUME_FLAGS_INFORMATION_Layout, SysInfoLayoutTests.FILE_FS_VOLUME_INFORMATION_Layout, SysInfoLayoutTests.FILE_FULL_DIR_INFORMATION_Layout, SysInfoLayoutTests.FILE_FULL_EA_INFORMATION_Layout, SysInfoLayoutTests.FILE_ID_128_Layout, SysInfoLayoutTests.FILE_ID_BOTH_DIR_INFORMATION_Layout, SysInfoLayoutTests.FILE_ID_EXTD_BOTH_DIR_INFORMATION_Layout, SysInfoLayoutTests.FILE_ID_EXTD_DIR_INFORMATION_Layout, SysInfoLayoutTests.FILE_ID_FULL_DIR_INFORMATION_Layout, SysInfoLayoutTests.FILE_ID_GLOBAL_TX_DIR_INFORMATION_Layout, SysInfoLayoutTests.FILE_ID_INFORMATION_Layout, SysInfoLayoutTests.FILE_INTERNAL_INFORMATION_Layout, SysInfoLayoutTests.FILE_IOSTATUSBLOCK_RANGE_INFORMATION_Layout, SysInfoLayoutTests.FILE_IO_COMPLETION_NOTIFICATION_INFORMATION_Layout, SysInfoLayoutTests.FILE_IO_PRIORITY_HINT_INFORMATION_Layout, SysInfoLayoutTests.FILE_IS_REMOTE_DEVICE_INFORMATION_Layout, SysInfoLayoutTests.FILE_KNOWN_FOLDER_INFORMATION_Layout, SysInfoLayoutTests.FILE_LINKS_INFORMATION_Layout, SysInfoLayoutTests.FILE_LINK_ENTRY_FULL_ID_INFORMATION_Layout, SysInfoLayoutTests.FILE_LINK_ENTRY_INFORMATION_Layout, SysInfoLayoutTests.FILE_LINK_INFORMATION_Layout, SysInfoLayoutTests.FILE_LINK_INFORMATION_EX_Layout, SysInfoLayoutTests.FILE_MAILSLOT_QUERY_INFORMATION_Layout, SysInfoLayoutTests.FILE_MAILSLOT_SET_INFORMATION_Layout, SysInfoLayoutTests.FILE_MEMORY_PARTITION_INFORMATION_Layout, SysInfoLayoutTests.FILE_MODE_INFORMATION_Layout, SysInfoLayoutTests.FILE_MOVE_CLUSTER_INFORMATION_Layout, SysInfoLayoutTests.FILE_NAMES_INFORMATION_Layout, SysInfoLayoutTests.FILE_NAME_INFORMATION_Layout, SysInfoLayoutTests.FILE_NETWORK_OPEN_INFORMATION_Layout, SysInfoLayoutTests.FILE_NETWORK_PHYSICAL_NAME_INFORMATION_Layout, SysInfoLayoutTests.FILE_NUMA_NODE_INFORMATION_Layout, SysInfoLayoutTests.FILE_OBJECTID_INFORMATION_Layout, SysInfoLayoutTests.FILE_PIPE_INFORMATION_Layout, SysInfoLayoutTests.FILE_PIPE_LOCAL_INFORMATION_Layout, SysInfoLayoutTests.FILE_PIPE_REMOTE_INFORMATION_Layout, SysInfoLayoutTests.FILE_POSITION_INFORMATION_Layout, SysInfoLayoutTests.FILE_PROCESS_IDS_USING_FILE_INFORMATION_Layout, SysInfoLayoutTests.FILE_QUOTA_INFORMATION_Layout, SysInfoLayoutTests.FILE_REMOTE_PROTOCOL_INFORMATION_Layout, SysInfoLayoutTests.FILE_RENAME_INFORMATION_Layout, SysInfoLayoutTests.FILE_RENAME_INFORMATION_EX_Layout, SysInfoLayoutTests.FILE_REPARSE_POINT_INFORMATION_Layout, SysInfoLayoutTests.FILE_SFIO_RESERVE_INFORMATION_Layout, SysInfoLayoutTests.FILE_SFIO_VOLUME_INFORMATION_Layout, SysInfoLayoutTests.FILE_STANDARD_INFORMATION_Layout, SysInfoLayoutTests.FILE_STANDARD_LINK_INFORMATION_Layout, SysInfoLayoutTests.FILE_STAT_INFORMATION_Layout, SysInfoLayoutTests.FILE_STAT_LX_INFORMATION_Layout, SysInfoLayoutTests.FILE_STREAM_INFORMATION_Layout, SysInfoLayoutTests.FILE_TRACKING_INFORMATION_Layout, SysInfoLayoutTests.FILE_VALID_DATA_LENGTH_INFORMATION_Layout, SysInfoLayoutTests.FILE_VOLUME_NAME_INFORMATION_Layout, SysInfoLayoutTests.GENERIC_MAPPING_Layout, SysInfoLayoutTests.OBJECT_NAME_INFORMATION_Layout, SysInfoLayoutTests.PROCESS_BASIC_INFORMATION_Layout, SysInfoLayoutTests.TIME_FIELDS_Layout, SysInfoLayoutTests.TOKEN_ACCESS_INFORMATION_Layout, SysInfoLayoutTests.TOKEN_APPCONTAINER_INFORMATION_Layout, SysInfoLayoutTests.TOKEN_AUDIT_POLICY_Layout, SysInfoLayoutTests.TOKEN_CONTROL_Layout, SysInfoLayoutTests.TOKEN_DEFAULT_DACL_Layout, SysInfoLayoutTests.TOKEN_DEVICE_CLAIMS_Layout, SysInfoLayoutTests.TOKEN_ELEVATION_Layout, SysInfoLayoutTests.TOKEN_GROUPS_Layout, SysInfoLayoutTests.TOKEN_GROUPS_AND_PRIVILEGES_Layout, SysInfoLayoutTests.TOKEN_LINKED_TOKEN_Layout, SysInfoLayoutTests.TOKEN_MANDATORY_LABEL_Layout, SysInfoLayoutTests.TOKEN_MANDATORY_POLICY_Layout, SysInfoLayoutTests.TOKEN_ORIGIN_Layout, SysInfoLayoutTests.TOKEN_OWNER_Layout, SysInfoLayoutTests.TOKEN_PRIMARY_GROUP_Layout, SysInfoLayoutTests.TOKEN_SOURCE_Layout, SysInfoLayoutTests.TOKEN_STATISTICS_Layout, SysInfoLayoutTests.TOKEN_USER_Layout, SysInfoLayoutTests.TOKEN_USER_CLAIMS_Layout, SysInfoArrayTests.FILE_TRACKING_INFORMATION_ObjectInformationIsInline, SysInfoArrayTests.FILE_PROCESS_IDS_USING_FILE_INFORMATION_ProcessIdListIsInline, SysInfoArrayTests.RTL_PROCESS_MODULES_ModulesIsInline, SysInfoArrayTests.RTL_PROCESS_LOCKS_LocksIsInline, SysInfoArrayTests.RTL_PROCESS_BACKTRACES_BackTracesIsInline, SysInfoArrayTests.SYSTEM_HANDLE_INFORMATION_HandlesIsInline -->
The fields of each structure that the WDK's headers declare are at the C fields' offsets, in a 32-bit and in a 64-bit build, and the structure has the C structure's size, apart from the one of the note below. Where the C structure ends in an array of one element that stands for an array of any length, the structure here ends in an array of one element too, held inline, as with **SYSTEM_HANDLE_INFORMATION.Handles**, or, for a file name or a volume label, in an array of a fixed length, most often **MAX_PATH** + 1 characters, with a size of its own. A driver passes a buffer large enough for the entries, and reads them from the offset of that last field.

| Name | Description |
|------|-------------|
| **CURDIR**{: #CURDIR } | A current directory: its DOS path and a handle to it, as **RTL_USER_PROCESS_PARAMETERS** holds it. |
| [**FILE_ACCESS_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_access_information){: #FILE_ACCESS_INFORMATION } | The access rights the file was opened with. Class: **FileAccessInformation**. |
| [**FILE_ALIGNMENT_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/ns-ntddk-_file_alignment_information){: #FILE_ALIGNMENT_INFORMATION } | The buffer alignment the device needs. Class: **FileAlignmentInformation**. |
| [**FILE_ALL_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_all_information){: #FILE_ALL_INFORMATION } | The basic, standard, internal, EA, access, position, mode, alignment and name information of a file in one structure. Class: **FileAllInformation**. |
| [**FILE_ALLOCATION_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_allocation_information){: #FILE_ALLOCATION_INFORMATION } | The file's allocation size, to set. Class: **FileAllocationInformation**. |
| [**FILE_ATTRIBUTE_TAG_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/ns-ntddk-_file_attribute_tag_information){: #FILE_ATTRIBUTE_TAG_INFORMATION } | The file's attributes and its reparse tag. Class: **FileAttributeTagInformation**. |
| [**FILE_BASIC_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_file_basic_information){: #FILE_BASIC_INFORMATION } | The file's four times and its attributes. Class: **FileBasicInformation**. |
| [**FILE_BOTH_DIR_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_both_dir_information){: #FILE_BOTH_DIR_INFORMATION } | One file of a directory listing: times, sizes, attributes and both the long and the short name. Class: **FileBothDirectoryInformation**. |
| [**FILE_CASE_SENSITIVE_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_case_sensitive_information){: #FILE_CASE_SENSITIVE_INFORMATION } | Whether a directory's names are case-sensitive. Classes: **FileCaseSensitiveInformation**, **FileCaseSensitiveInformationForceAccessCheck**. |
| [**FILE_COMPLETION_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_completion_information){: #FILE_COMPLETION_INFORMATION } | The I/O completion port and key to associate with the file handle. Classes: **FileCompletionInformation**, **FileReplaceCompletionInformation**. |
| [**FILE_COMPRESSION_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_compression_information){: #FILE_COMPRESSION_INFORMATION } | The file's compressed size and compression format. Class: **FileCompressionInformation**. |
| [**FILE_DESIRED_STORAGE_CLASS_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_desired_storage_class_information){: #FILE_DESIRED_STORAGE_CLASS_INFORMATION } | The storage tier the file should be on. Class: **FileDesiredStorageClassInformation**. |
| [**FILE_DIRECTORY_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_directory_information){: #FILE_DIRECTORY_INFORMATION } | One file of a directory listing: times, sizes, attributes and name. Class: **FileDirectoryInformation**. |
| **FILE_DISPOSITION_INFO_EX**{: #FILE_DISPOSITION_INFO_EX } | Whether the file is deleted when its last handle closes, with the `FILE_DISPOSITION_` flags. Class: **FileDispositionInformationEx**. |
| [**FILE_DISPOSITION_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/ns-ntddk-_file_disposition_information){: #FILE_DISPOSITION_INFORMATION } | Whether the file is deleted when its last handle closes. Class: **FileDispositionInformation**. |
| [**FILE_EA_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_ea_information){: #FILE_EA_INFORMATION } | The size of the file's extended attributes. Class: **FileEaInformation**. |
| [**FILE_END_OF_FILE_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/ns-ntddk-_file_end_of_file_information){: #FILE_END_OF_FILE_INFORMATION } | The file's end-of-file position, to set. Class: **FileEndOfFileInformation**. |
| [**FILE_FS_ATTRIBUTE_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_fs_attribute_information){: #FILE_FS_ATTRIBUTE_INFORMATION } | The file system's attributes, its maximum name length and its name, such as `NTFS`. Class: **FileFsAttributeInformation**. |
| [**FILE_FS_CONTROL_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_fs_control_information){: #FILE_FS_CONTROL_INFORMATION } | The volume's quota and content-indexing settings. Class: **FileFsControlInformation**. |
| **FILE_FS_DATA_COPY_INFORMATION**{: #FILE_FS_DATA_COPY_INFORMATION } | The number of copies of the volume's data. Class: **FileFsDataCopyInformation**. |
| [**FILE_FS_DEVICE_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_file_fs_device_information){: #FILE_FS_DEVICE_INFORMATION } | The type and characteristics of the volume's device. Class: **FileFsDeviceInformation**. |
| [**FILE_FS_DRIVER_PATH_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_fs_driver_path_information){: #FILE_FS_DRIVER_PATH_INFORMATION } | Whether a driver is in the volume's I/O path. Class: **FileFsDriverPathInformation**. |
| [**FILE_FS_FULL_SIZE_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/ns-ntddk-_file_fs_full_size_information){: #FILE_FS_FULL_SIZE_INFORMATION } | The volume's total, caller-available and actual free allocation units, and its sector and unit sizes. Class: **FileFsFullSizeInformation**. |
| [**FILE_FS_FULL_SIZE_INFORMATION_EX**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/ns-ntddk-_file_fs_full_size_information_ex){: #FILE_FS_FULL_SIZE_INFORMATION_EX } | As **FILE_FS_FULL_SIZE_INFORMATION**, with the space reserved and used by the storage stack. Class: **FileFsFullSizeInformationEx**. |
| [**FILE_FS_LABEL_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/ns-ntddk-_file_fs_label_information){: #FILE_FS_LABEL_INFORMATION } | A volume label, to set. Class: **FileFsLabelInformation**. |
| **FILE_FS_METADATA_SIZE_INFORMATION**{: #FILE_FS_METADATA_SIZE_INFORMATION } | The size of the file system's metadata. Class: **FileFsMetadataSizeInformation**. |
| [**FILE_FS_OBJECTID_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/ns-ntddk-_file_fs_objectid_information){: #FILE_FS_OBJECTID_INFORMATION } | The volume's object ID. Class: **FileFsObjectIdInformation**. |
| [**FILE_FS_SECTOR_SIZE_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/ns-ntddk-_file_fs_sector_size_information){: #FILE_FS_SECTOR_SIZE_INFORMATION } | The volume's physical and logical sector sizes and alignment. Class: **FileFsSectorSizeInformation**. |
| [**FILE_FS_SIZE_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/ns-ntddk-_file_fs_size_information){: #FILE_FS_SIZE_INFORMATION } | The volume's total and free allocation units, and its sector and unit sizes. Class: **FileFsSizeInformation**. |
| **FILE_FS_VOLUME_FLAGS_INFORMATION**{: #FILE_FS_VOLUME_FLAGS_INFORMATION } | The volume's flags. Class: **FileFsVolumeFlagsInformation**. |
| [**FILE_FS_VOLUME_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/ns-ntddk-_file_fs_volume_information){: #FILE_FS_VOLUME_INFORMATION } | The volume's creation time, serial number and label. Class: **FileFsVolumeInformation**. |
| [**FILE_FULL_DIR_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_full_dir_information){: #FILE_FULL_DIR_INFORMATION } | One file of a directory listing, with the size of its extended attributes. Class: **FileFullDirectoryInformation**. |
| [**FILE_FULL_EA_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_file_full_ea_information){: #FILE_FULL_EA_INFORMATION } | One extended attribute: its flags, name and value. Class: **FileFullEaInformation**. |
| [**FILE_ID_128**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-file_id_128){: #FILE_ID_128 } | A 128-bit file ID. |
| [**FILE_ID_BOTH_DIR_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_id_both_dir_information){: #FILE_ID_BOTH_DIR_INFORMATION } | As **FILE_BOTH_DIR_INFORMATION**, with the file ID. Class: **FileIdBothDirectoryInformation**. |
| [**FILE_ID_EXTD_BOTH_DIR_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_id_extd_both_dir_information){: #FILE_ID_EXTD_BOTH_DIR_INFORMATION } | As **FILE_ID_BOTH_DIR_INFORMATION**, with a 128-bit file ID and the reparse tag. Class: **FileIdExtdBothDirectoryInformation**. |
| [**FILE_ID_EXTD_DIR_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-file_id_extd_dir_information){: #FILE_ID_EXTD_DIR_INFORMATION } | As **FILE_FULL_DIR_INFORMATION**, with a 128-bit file ID and the reparse tag. Class: **FileIdExtdDirectoryInformation**. |
| [**FILE_ID_FULL_DIR_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_id_full_dir_information){: #FILE_ID_FULL_DIR_INFORMATION } | As **FILE_FULL_DIR_INFORMATION**, with the file ID. Class: **FileIdFullDirectoryInformation**. |
| [**FILE_ID_GLOBAL_TX_DIR_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_id_global_tx_dir_information){: #FILE_ID_GLOBAL_TX_DIR_INFORMATION } | One file of a directory listing, with its transactional visibility. Class: **FileIdGlobalTxDirectoryInformation**. |
| [**FILE_ID_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-file_id_information){: #FILE_ID_INFORMATION } | The volume serial number and the 128-bit file ID. Class: **FileIdInformation**. |
| [**FILE_INTERNAL_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_internal_information){: #FILE_INTERNAL_INFORMATION } | The file's 64-bit file ID. Class: **FileInternalInformation**. |
| **FILE_IO_COMPLETION_NOTIFICATION_INFORMATION**{: #FILE_IO_COMPLETION_NOTIFICATION_INFORMATION } | The `FILE_SKIP_` flags of the file handle's completion notification. Class: **FileIoCompletionNotificationInformation**. |
| [**FILE_IO_PRIORITY_HINT_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_file_io_priority_hint_information){: #FILE_IO_PRIORITY_HINT_INFORMATION } | The default I/O priority of the file handle's requests (**IO_PRIORITY_HINT**). It is 8 bytes, as the Native API's headers declare it, where the WDK's is 4. Class: **FileIoPriorityHintInformation**. |
| **FILE_IOSTATUSBLOCK_RANGE_INFORMATION**{: #FILE_IOSTATUSBLOCK_RANGE_INFORMATION } | A range of I/O status blocks, for the user-mode I/O of a completion port. Class: **FileIoStatusBlockRangeInformation**. |
| [**FILE_IS_REMOTE_DEVICE_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_file_is_remote_device_information){: #FILE_IS_REMOTE_DEVICE_INFORMATION } | Whether the file is on a remote device. Class: **FileIsRemoteDeviceInformation**. |
| [**FILE_KNOWN_FOLDER_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-file_known_folder_information){: #FILE_KNOWN_FOLDER_INFORMATION } | The known folder a directory is, such as Desktop or Downloads. Class: **FileKnownFolderInformation**. |
| **FILE_LINK_ENTRY_FULL_ID_INFORMATION**{: #FILE_LINK_ENTRY_FULL_ID_INFORMATION } | One hard link of a file, with the parent directory's 128-bit ID. Class: **FileHardLinkFullIdInformation**. |
| [**FILE_LINK_ENTRY_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_link_entry_information){: #FILE_LINK_ENTRY_INFORMATION } | One hard link of a file: its parent directory's ID and its name. |
| [**FILE_LINK_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_link_information){: #FILE_LINK_INFORMATION } | A hard link to create to the file: its directory and name. Classes: **FileLinkInformation**, **FileLinkInformationBypassAccessCheck**. |
| **FILE_LINK_INFORMATION_EX**{: #FILE_LINK_INFORMATION_EX } | As **FILE_LINK_INFORMATION**, with the `FILE_LINK_` flags. Classes: **FileLinkInformationEx**, **FileLinkInformationExBypassAccessCheck**. |
| [**FILE_LINKS_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_links_information){: #FILE_LINKS_INFORMATION } | The hard links of a file: the bytes needed, the entries returned and the first **FILE_LINK_ENTRY_INFORMATION**. Class: **FileHardLinkInformation**. |
| [**FILE_MAILSLOT_QUERY_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_mailslot_query_information){: #FILE_MAILSLOT_QUERY_INFORMATION } | A mailslot's quota, message counts and read timeout. Class: **FileMailslotQueryInformation**. |
| [**FILE_MAILSLOT_SET_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_mailslot_set_information){: #FILE_MAILSLOT_SET_INFORMATION } | A mailslot's read timeout, to set. Class: **FileMailslotSetInformation**. |
| [**FILE_MEMORY_PARTITION_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_file_memory_partition_information){: #FILE_MEMORY_PARTITION_INFORMATION } | The memory partition of the file's pages. Class: **FileMemoryPartitionInformation**. |
| [**FILE_MODE_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_mode_information){: #FILE_MODE_INFORMATION } | The mode the file was opened with, such as synchronous or write-through. Class: **FileModeInformation**. |
| **FILE_MOVE_CLUSTER_INFORMATION**{: #FILE_MOVE_CLUSTER_INFORMATION } | The clusters of a file to move, and the file to move them to. Class: **FileMoveClusterInformation**. |
| [**FILE_NAME_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/ns-ntddk-_file_name_information){: #FILE_NAME_INFORMATION } | The file's name, at most **MAX_PATH** characters. Classes: **FileNameInformation**, **FileAlternateNameInformation**, **FileShortNameInformation**, **FileNormalizedNameInformation**. |
| [**FILE_NAMES_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_names_information){: #FILE_NAMES_INFORMATION } | One file of a directory listing: its name only. Class: **FileNamesInformation**. |
| [**FILE_NETWORK_OPEN_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_file_network_open_information){: #FILE_NETWORK_OPEN_INFORMATION } | The file's times, sizes and attributes, as a network open reads them in one request. Class: **FileNetworkOpenInformation**. |
| [**FILE_NETWORK_PHYSICAL_NAME_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_network_physical_name_information){: #FILE_NETWORK_PHYSICAL_NAME_INFORMATION } | The file's full UNC name on a remote server. Class: **FileNetworkPhysicalNameInformation**. |
| **FILE_NUMA_NODE_INFORMATION**{: #FILE_NUMA_NODE_INFORMATION } | The NUMA node of the file's device. Class: **FileNumaNodeInformation**. |
| [**FILE_OBJECTID_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_objectid_information){: #FILE_OBJECTID_INFORMATION } | The file's object ID and its extended information. Class: **FileObjectIdInformation**. |
| [**FILE_PIPE_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_pipe_information){: #FILE_PIPE_INFORMATION } | A named pipe's read mode and completion mode. Class: **FilePipeInformation**. |
| [**FILE_PIPE_LOCAL_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_pipe_local_information){: #FILE_PIPE_LOCAL_INFORMATION } | The local end of a named pipe: its type, configuration, instances, quotas and state. Class: **FilePipeLocalInformation**. |
| [**FILE_PIPE_REMOTE_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_pipe_remote_information){: #FILE_PIPE_REMOTE_INFORMATION } | The remote end of a named pipe: its collect time and maximum collection count. Class: **FilePipeRemoteInformation**. |
| [**FILE_POSITION_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_file_position_information){: #FILE_POSITION_INFORMATION } | The file's current byte offset. Class: **FilePositionInformation**. |
| **FILE_PROCESS_IDS_USING_FILE_INFORMATION**{: #FILE_PROCESS_IDS_USING_FILE_INFORMATION } | The processes that have the file open: their number and the first ID. Class: **FileProcessIdsUsingFileInformation**. |
| [**FILE_QUOTA_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_quota_information){: #FILE_QUOTA_INFORMATION } | One user's quota on a volume: its times, use, threshold and limit, and the user's SID. Class: **FileQuotaInformation**. |
| [**FILE_REMOTE_PROTOCOL_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-file_remote_protocol_information){: #FILE_REMOTE_PROTOCOL_INFORMATION } | The protocol and version a remote file is reached with. Class: **FileRemoteProtocolInformation**. |
| [**FILE_RENAME_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_rename_information){: #FILE_RENAME_INFORMATION } | A new name for the file, and whether to replace a file of that name. Classes: **FileRenameInformation**, **FileRenameInformationBypassAccessCheck**. |
| **FILE_RENAME_INFORMATION_EX**{: #FILE_RENAME_INFORMATION_EX } | As **FILE_RENAME_INFORMATION**, with the `FILE_RENAME_` flags. Classes: **FileRenameInformationEx**, **FileRenameInformationExBypassAccessCheck**. |
| [**FILE_REPARSE_POINT_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_reparse_point_information){: #FILE_REPARSE_POINT_INFORMATION } | One reparse point of a volume: the file's reference number and its tag. Class: **FileReparsePointInformation**. |
| [**FILE_SFIO_RESERVE_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-file_sfio_reserve_information){: #FILE_SFIO_RESERVE_INFORMATION } | The bandwidth reserved for the file's scheduled I/O. Class: **FileSfioReserveInformation**. |
| **FILE_SFIO_VOLUME_INFORMATION**{: #FILE_SFIO_VOLUME_INFORMATION } | The volume's limits for scheduled I/O. Class: **FileSfioVolumeInformation**. |
| [**FILE_STANDARD_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_file_standard_information){: #FILE_STANDARD_INFORMATION } | The file's allocation size, end of file, link count and whether it is being deleted or is a directory. Class: **FileStandardInformation**. |
| [**FILE_STANDARD_LINK_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-file_standard_link_information){: #FILE_STANDARD_LINK_INFORMATION } | The file's link counts and whether it is being deleted or is a directory. Class: **FileStandardLinkInformation**. |
| [**FILE_STAT_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_stat_information){: #FILE_STAT_INFORMATION } | The file's ID, times, sizes, attributes, reparse tag, link count and access rights. Class: **FileStatInformation**. |
| [**FILE_STAT_LX_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_stat_lx_information){: #FILE_STAT_LX_INFORMATION } | As **FILE_STAT_INFORMATION**, with the Linux owner, group, mode and device of the Windows Subsystem for Linux. Class: **FileStatLxInformation**. |
| [**FILE_STREAM_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_stream_information){: #FILE_STREAM_INFORMATION } | One stream of a file: its name, size and allocation size. Class: **FileStreamInformation**. |
| **FILE_TRACKING_INFORMATION**{: #FILE_TRACKING_INFORMATION } | The destination file and the object information of a link-tracking move: its length and first byte. Class: **FileTrackingInformation**. |
| [**FILE_VALID_DATA_LENGTH_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/ns-ntddk-_file_valid_data_length_information){: #FILE_VALID_DATA_LENGTH_INFORMATION } | The file's valid data length, to set. Class: **FileValidDataLengthInformation**. |
| **FILE_VOLUME_NAME_INFORMATION**{: #FILE_VOLUME_NAME_INFORMATION } | The name of the device the file's volume is on. Class: **FileVolumeNameInformation**. |
| [**GENERIC_MAPPING**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_generic_mapping){: #GENERIC_MAPPING } | The specific rights that generic read, write, execute and all stand for, for one type of object. |
| **OBJECT_BASIC_INFORMATION**{: #OBJECT_BASIC_INFORMATION } | An object's attributes, granted access, handle and pointer counts and the sizes of its name, type and security descriptor. Class: **ObjectBasicInformation**. |
| **OBJECT_DIRECTORY_INFORMATION**{: #OBJECT_DIRECTORY_INFORMATION } | One entry of an object directory: its name and its type's name. |
| **OBJECT_HANDLE_FLAG_INFORMATION**{: #OBJECT_HANDLE_FLAG_INFORMATION } | Whether a handle is inherited and protected from being closed. Class: **ObjectHandleFlagInformation**. |
| **OBJECT_NAME_INFORMATION**{: #OBJECT_NAME_INFORMATION } | An object's name. Class: **ObjectNameInformation**. |
| **OBJECT_TYPE_INFORMATION**{: #OBJECT_TYPE_INFORMATION } | An object type: its name, object and handle counts, valid access and generic mapping. Class: **ObjectTypeInformation**. |
| **PEB_VISTA**{: #PEB_VISTA } | The process environment block of Windows Vista and Windows Server 2003. |
| **PEB_WIN10_R3**{: #PEB_WIN10_R3 } | The process environment block of Windows 10 version 1709. |
| **PEB_WIN10_R4**{: #PEB_WIN10_R4 } | The process environment block of Windows 10 version 1803. |
| **PEB_WIN10_R5**{: #PEB_WIN10_R5 } | The process environment block of Windows 10 versions 1809 to 21H2. |
| **PEB_WIN10_T2**{: #PEB_WIN10_T2 } | The process environment block of Windows 10 versions 1511 to 1703. |
| **PEB_WIN11**{: #PEB_WIN11 } | The process environment block of Windows 11, up to version 22H2. |
| **PEB_WIN7**{: #PEB_WIN7 } | The process environment block of Windows 7 and Windows Server 2008. |
| **PEB_WIN8**{: #PEB_WIN8 } | The process environment block of Windows 8, 8.1 and Server 2012, and of Windows 10 version 1507. |
| **PEB_XP**{: #PEB_XP } | The process environment block of Windows XP. |
| **PROCESS_BASIC_INFORMATION**{: #PROCESS_BASIC_INFORMATION } | A process's exit status, the address of its process environment block, its affinity, priority, ID and parent's ID. Class: **ProcessBasicInformation**. |
| **PROCESS_BASIC_INFORMATION32**{: #PROCESS_BASIC_INFORMATION32 } | As **PROCESS_BASIC_INFORMATION**, for a 32-bit process whatever the driver's own build: its addresses and IDs are **Long**. |
| **PROCESS_BASIC_INFORMATION64**{: #PROCESS_BASIC_INFORMATION64 } | As **PROCESS_BASIC_INFORMATION**, for a 64-bit process whatever the driver's own build: its addresses and IDs are **LongLong**, and the IDs are **uUniqueProcessId** and **uInheritedFromUniqueProcessId**. |
| **RTL_DRIVE_LETTER_CURDIR**{: #RTL_DRIVE_LETTER_CURDIR } | The current directory of one drive letter, as **RTL_USER_PROCESS_PARAMETERS** holds 32 of them. |
| **RTL_DYNAMIC_TIME_ZONE_INFORMATION**{: #RTL_DYNAMIC_TIME_ZONE_INFORMATION } | A time zone with its key name and whether dynamic daylight time is off. Class: **SystemDynamicTimeZoneInformation**. |
| **RTL_PROCESS_BACKTRACE_INFORMATION**{: #RTL_PROCESS_BACKTRACE_INFORMATION } | One recorded stack trace. |
| **RTL_PROCESS_BACKTRACES**{: #RTL_PROCESS_BACKTRACES } | The stack traces the system has recorded: the memory they use, their number and the first **RTL_PROCESS_BACKTRACE_INFORMATION**. Class: **SystemStackTraceInformation**. |
| **RTL_PROCESS_LOCK_INFORMATION**{: #RTL_PROCESS_LOCK_INFORMATION } | One resource lock: its address, type, owner and counts. |
| **RTL_PROCESS_LOCKS**{: #RTL_PROCESS_LOCKS } | The system's resource locks: their number and the first **RTL_PROCESS_LOCK_INFORMATION**. Class: **SystemLocksInformation**. |
| **RTL_PROCESS_MODULE_INFORMATION**{: #RTL_PROCESS_MODULE_INFORMATION } | One loaded module: its base, size, flags, load order and path. |
| **RTL_PROCESS_MODULES**{: #RTL_PROCESS_MODULES } | The loaded kernel modules: their number and the first **RTL_PROCESS_MODULE_INFORMATION**. Class: **SystemModuleInformation**. |
| **RTL_TIME_ZONE_INFORMATION**{: #RTL_TIME_ZONE_INFORMATION } | A time zone: its bias, names and the dates of standard and daylight time. Classes: **SystemCurrentTimeZoneInformation**, **SystemTimeZoneInformation**. |
| [**RTL_USER_PROCESS_PARAMETERS**](https://learn.microsoft.com/en-us/windows/win32/api/winternl/ns-winternl-rtl_user_process_parameters){: #RTL_USER_PROCESS_PARAMETERS } | A process's parameters, as Windows Vista and later lay them out: its current directory, DLL path, image path, command line, environment and window settings. |
| **RTL_USER_PROCESS_PARAMETERS_WIN10**{: #RTL_USER_PROCESS_PARAMETERS_WIN10 } | As **RTL_USER_PROCESS_PARAMETERS**, for Windows 10. |
| **RTL_USER_PROCESS_PARAMETERS_WIN10_19H1**{: #RTL_USER_PROCESS_PARAMETERS_WIN10_19H1 } | As **RTL_USER_PROCESS_PARAMETERS**, for Windows 10 version 1903 and later. |
| **RTL_USER_PROCESS_PARAMETERS_WIN10_20H1**{: #RTL_USER_PROCESS_PARAMETERS_WIN10_20H1 } | As **RTL_USER_PROCESS_PARAMETERS**, for Windows 10 version 2004 and later. |
| **RTL_USER_PROCESS_PARAMETERS_WIN10_R5**{: #RTL_USER_PROCESS_PARAMETERS_WIN10_R5 } | As **RTL_USER_PROCESS_PARAMETERS**, for Windows 10 version 1809 and later. |
| **RTL_USER_PROCESS_PARAMETERS_WIN11_21H2**{: #RTL_USER_PROCESS_PARAMETERS_WIN11_21H2 } | As **RTL_USER_PROCESS_PARAMETERS**, for Windows 11 version 21H2 and later. |
| **RTL_USER_PROCESS_PARAMETERS_WIN7**{: #RTL_USER_PROCESS_PARAMETERS_WIN7 } | As **RTL_USER_PROCESS_PARAMETERS**, for Windows 7 and later. |
| **RTL_USER_PROCESS_PARAMETERS_WIN8**{: #RTL_USER_PROCESS_PARAMETERS_WIN8 } | As **RTL_USER_PROCESS_PARAMETERS**, for Windows 8 and later. |
| **RTL_USER_PROCESS_PARAMETERS_XP**{: #RTL_USER_PROCESS_PARAMETERS_XP } | As **RTL_USER_PROCESS_PARAMETERS**, for Windows XP and Server 2003. |
| **SECTION_BASIC_INFORMATION**{: #SECTION_BASIC_INFORMATION } | A section's base address, its allocation attributes (**NTSectionFlags**) and its maximum size. Class: **SectionBasicInformation**. |
| **SECTION_IMAGE_INFORMATION**{: #SECTION_IMAGE_INFORMATION } | The image a section maps: its entry point, stack sizes, subsystem and versions, characteristics, machine, flags (**SectionImageBitfield**), loader flags, file size and checksum. Class: **SectionImageInformation**. |
| **SECTION_INTERNAL_IMAGE_INFORMATION**{: #SECTION_INTERNAL_IMAGE_INFORMATION } | As **SECTION_IMAGE_INFORMATION**, with the image's extended flags, such as export suppression and CET shadow stacks. Class: **SectionInternalImageInformation**. |
| **SYSTEM_BASIC_INFORMATION**{: #SYSTEM_BASIC_INFORMATION } | The page size, physical pages, address range and number of processors. Classes: **SystemBasicInformation**, **SystemEmulationBasicInformation**, **SystemNativeBasicInformation**. |
| **SYSTEM_BASIC_PERFORMANCE_INFORMATION**{: #SYSTEM_BASIC_PERFORMANCE_INFORMATION } | The available, committed and total pages. Class: **SystemBasicPerformanceInformation**. |
| **SYSTEM_BOOT_ENVIRONMENT_INFORMATION**{: #SYSTEM_BOOT_ENVIRONMENT_INFORMATION } | The boot identifier, the firmware type and the boot flags. Class: **SystemBootEnvironmentInformation**. |
| **SYSTEM_BOOT_GRAPHICS_INFORMATION**{: #SYSTEM_BOOT_GRAPHICS_INFORMATION } | The boot graphics frame buffer: its address, size, pixel format and stride. Class: **SystemBootGraphicsInformation**. |
| **SYSTEM_BOOT_LOGO_INFORMATION**{: #SYSTEM_BOOT_LOGO_INFORMATION } | The boot logo's flags and its position in its bitmap. Class: **SystemBootLogoInformation**. |
| **SYSTEM_CALL_COUNT_INFORMATION**{: #SYSTEM_CALL_COUNT_INFORMATION } | How many times each system service has been called. Class: **SystemCallCountInformation**. |
| **SYSTEM_CALL_TIME_INFORMATION**{: #SYSTEM_CALL_TIME_INFORMATION } | The time spent in the system services. It lacks the C structure's array of times, TimeOfCalls. |
| **SYSTEM_CODEINTEGRITY_INFORMATION**{: #SYSTEM_CODEINTEGRITY_INFORMATION } | The code integrity options, such as test signing. Class: **SystemCodeIntegrityInformation**. |
| **SYSTEM_CODEINTEGRITYPOLICY_INFORMATION**{: #SYSTEM_CODEINTEGRITYPOLICY_INFORMATION } | The code integrity policy's options and its hypervisor-enforced options. Class: **SystemCodeIntegrityPolicyInformation**. |
| **SYSTEM_CODEINTEGRITYVERIFICATION_INFORMATION**{: #SYSTEM_CODEINTEGRITYVERIFICATION_INFORMATION } | The result of verifying an image's code integrity. Class: **SystemCodeIntegrityVerificationInformation**. |
| **SYSTEM_DEVICE_INFORMATION**{: #SYSTEM_DEVICE_INFORMATION } | The number of disks, floppies, CD-ROMs, tapes, serial and parallel ports. Class: **SystemDeviceInformation**. |
| **SYSTEM_FILECACHE_INFORMATION**{: #SYSTEM_FILECACHE_INFORMATION } | The file cache's current and peak size, faults and working-set limits. Classes: **SystemFileCacheInformation**, **SystemFileCacheInformationEx**, **SystemPagedPoolInformationEx**, **SystemSystemPtesInformationEx**. |
| **SYSTEM_FLAGS_INFORMATION**{: #SYSTEM_FLAGS_INFORMATION } | The global flags (**NTGLB_Flags**). Classes: **SystemFlagsInformation**, **SystemFlags2Information**. |
| **SYSTEM_HANDLE_INFORMATION**{: #SYSTEM_HANDLE_INFORMATION } | The open handles of every process: their number and the first **SYSTEM_HANDLE_TABLE_ENTRY_INFO**. Class: **SystemHandleInformation**. |
| **SYSTEM_HANDLE_TABLE_ENTRY_INFO**{: #SYSTEM_HANDLE_TABLE_ENTRY_INFO } | One open handle: its process, object type, attributes, value, object address and access. |
| **SYSTEM_KERNEL_DEBUGGER_INFORMATION**{: #SYSTEM_KERNEL_DEBUGGER_INFORMATION } | Whether a kernel debugger is enabled and present. Class: **SystemKernelDebuggerInformation**. |
| **SYSTEM_LOOKASIDE_INFORMATION**{: #SYSTEM_LOOKASIDE_INFORMATION } | One system lookaside list: its depth, allocations and frees. Class: **SystemLookasideInformation**. |
| **SYSTEM_OBJECT_INFORMATION**{: #SYSTEM_OBJECT_INFORMATION } | One object of a type's object list: its creator, flags, counts and name. Class: **SystemObjectInformation**. |
| **SYSTEM_OBJECTTYPE_INFORMATION**{: #SYSTEM_OBJECTTYPE_INFORMATION } | One object type of the type list: its counts, access and name. Class: **SystemObjectInformation**. |
| **SYSTEM_PAGEFILE_INFORMATION**{: #SYSTEM_PAGEFILE_INFORMATION } | One page file: its total, used and peak size, and its name. Class: **SystemPageFileInformation**. |
| **SYSTEM_PAGEFILE_INFORMATION_EX**{: #SYSTEM_PAGEFILE_INFORMATION_EX } | As **SYSTEM_PAGEFILE_INFORMATION**, with its minimum and maximum size. Class: **SystemPageFileInformationEx**. |
| **SYSTEM_PERFORMANCE_INFORMATION**{: #SYSTEM_PERFORMANCE_INFORMATION } | The system's performance counters: idle time, I/O, paging, pools and context switches. Class: **SystemPerformanceInformation**. |
| **SYSTEM_PROCESS_INFORMATION**{: #SYSTEM_PROCESS_INFORMATION } | One process of the process list: its threads, times, name, IDs, handle count and memory counters, followed by its **SYSTEM_THREAD_INFORMATION** entries. Classes: **SystemProcessInformation**, **SystemExtendedProcessInformation**, **SystemFullProcessInformation**. |
| **SYSTEM_PROCESSOR_INFORMATION**{: #SYSTEM_PROCESSOR_INFORMATION } | The processor's architecture, level, revision and features. Classes: **SystemProcessorInformation**, **SystemEmulationProcessorInformation**. |
| **SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION**{: #SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION } | One processor's idle, kernel, user, DPC and interrupt times. Class: **SystemProcessorPerformanceInformation**. |
| **SYSTEM_SECUREBOOT_INFORMATION**{: #SYSTEM_SECUREBOOT_INFORMATION } | Whether Secure Boot is enabled and capable. Class: **SystemSecureBootInformation**. |
| **SYSTEM_THREAD_INFORMATION**{: #SYSTEM_THREAD_INFORMATION } | One thread of a **SYSTEM_PROCESS_INFORMATION**: its times, start address, IDs, priority and state. |
| **SYSTEM_TIMEOFDAY_INFORMATION**{: #SYSTEM_TIMEOFDAY_INFORMATION } | The boot time, the current time, the time zone bias and the boot time bias. Class: **SystemTimeOfDayInformation**. |
| [**TIME_FIELDS**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-time_fields){: #TIME_FIELDS } | A time as its year, month, day, hour, minute, second, millisecond and weekday, as the kernel's RtlTimeToTimeFields fills it. |
| [**TOKEN_ACCESS_INFORMATION**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-token_access_information){: #TOKEN_ACCESS_INFORMATION } | A token's SIDs, privileges, authentication ID, type, mandatory policy, flags and AppContainer number. Class: **TokenAccessInformation**. |
| [**TOKEN_APPCONTAINER_INFORMATION**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-token_appcontainer_information){: #TOKEN_APPCONTAINER_INFORMATION } | A token's AppContainer SID. Class: **TokenAppContainerSid**. |
| [**TOKEN_AUDIT_POLICY**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-token_audit_policy){: #TOKEN_AUDIT_POLICY } | A token's per-user audit policy, of **POLICY_AUDIT_SUBCATEGORY_COUNT** subcategories. Class: **TokenAuditPolicy**. |
| **TOKEN_AUDIT_POLICY_Vista**{: #TOKEN_AUDIT_POLICY_Vista } | **TOKEN_AUDIT_POLICY** of Windows Vista's subcategories, **POLICY_AUDIT_SUBCATEGORY_COUNT_Vista**. Class: **TokenAuditPolicy**. |
| **TOKEN_AUDIT_POLICY_Win8**{: #TOKEN_AUDIT_POLICY_Win8 } | **TOKEN_AUDIT_POLICY** of Windows 8's subcategories, **POLICY_AUDIT_SUBCATEGORY_COUNT_Win8**. Class: **TokenAuditPolicy**. |
| [**TOKEN_CONTROL**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_token_control){: #TOKEN_CONTROL } | What identifies a token: its ID, authentication ID, modified ID and source. |
| [**TOKEN_DEFAULT_DACL**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_token_default_dacl){: #TOKEN_DEFAULT_DACL } | The DACL a token applies to the objects its process creates. Class: **TokenDefaultDacl**. |
| [**TOKEN_DEVICE_CLAIMS**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-token_device_claims){: #TOKEN_DEVICE_CLAIMS } | A token's device claims. |
| [**TOKEN_ELEVATION**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-token_elevation){: #TOKEN_ELEVATION } | Whether a token is elevated. Class: **TokenElevation**. |
| [**TOKEN_GROUPS**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_token_groups){: #TOKEN_GROUPS } | A token's group SIDs and their attributes. Classes: **TokenGroups**, **TokenRestrictedSids**, **TokenLogonSid**, **TokenCapabilities**, **TokenDeviceGroups**, **TokenRestrictedDeviceGroups**. |
| [**TOKEN_GROUPS_AND_PRIVILEGES**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_token_groups_and_privileges){: #TOKEN_GROUPS_AND_PRIVILEGES } | A token's SIDs, restricted SIDs and privileges, with their counts and lengths. Class: **TokenGroupsAndPrivileges**. |
| [**TOKEN_LINKED_TOKEN**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-token_linked_token){: #TOKEN_LINKED_TOKEN } | A handle to the token linked to this one, the elevated or the filtered token. Class: **TokenLinkedToken**. |
| [**TOKEN_MANDATORY_LABEL**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-token_mandatory_label){: #TOKEN_MANDATORY_LABEL } | A token's integrity level, as a SID and its attributes. Class: **TokenIntegrityLevel**. |
| [**TOKEN_MANDATORY_POLICY**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-token_mandatory_policy){: #TOKEN_MANDATORY_POLICY } | A token's mandatory integrity policy (**TOKEN_MANDATORY_POLICY_FLAGS**). Class: **TokenMandatoryPolicy**. |
| [**TOKEN_ORIGIN**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_token_origin){: #TOKEN_ORIGIN } | The logon session a token's logon session came from. Class: **TokenOrigin**. |
| [**TOKEN_OWNER**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_token_owner){: #TOKEN_OWNER } | The SID a token assigns as owner of the objects its process creates. Class: **TokenOwner**. |
| [**TOKEN_PRIMARY_GROUP**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_token_primary_group){: #TOKEN_PRIMARY_GROUP } | The group SID a token assigns to the objects its process creates. Class: **TokenPrimaryGroup**. |
| [**TOKEN_SOURCE**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_token_source){: #TOKEN_SOURCE } | The source of a token: an 8-character name and an ID. Class: **TokenSource**. |
| [**TOKEN_STATISTICS**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_token_statistics){: #TOKEN_STATISTICS } | A token's IDs, expiration, type, impersonation level, memory use and counts. Class: **TokenStatistics**. |
| [**TOKEN_USER**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_token_user){: #TOKEN_USER } | A token's user, as a SID and its attributes. Class: **TokenUser**. |
| [**TOKEN_USER_CLAIMS**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-token_user_claims){: #TOKEN_USER_CLAIMS } | A token's user claims. |
<!-- /test -->

## Enumerations

<!-- test: SysInfoValueTests.CheckTokenMembershipExFlags_Values, SysInfoValueTests.FILE_CS_FLAGS_Values, SysInfoValueTests.FILE_INFORMATION_CLASS_Values, SysInfoValueTests.FILE_IO_COMPLETION_FLAGS_Values, SysInfoValueTests.FILE_KNOWN_FOLDER_TYPE_Values, SysInfoValueTests.FILE_LINK_EX_FLAGS_Values, SysInfoValueTests.FILE_LX_FLAGS_Values, SysInfoValueTests.FILE_PIPE_COMPLETION_MODE_Values, SysInfoValueTests.FILE_PIPE_CONFIG_Values, SysInfoValueTests.FILE_PIPE_END_Values, SysInfoValueTests.FILE_PIPE_READ_MODE_Values, SysInfoValueTests.FILE_PIPE_STATE_Values, SysInfoValueTests.FILE_PIPE_TYPE_Values, SysInfoValueTests.FILE_RENAME_EX_FLAGS_Values, SysInfoValueTests.FILE_STORAGE_TIER_CLASS_Values, SysInfoValueTests.FILE_STORAGE_TIER_FLAGS_Values, SysInfoValueTests.FILE_TX_DIRINFO_FLAGS_Values, SysInfoValueTests.FIRMWARE_TYPE_Values, SysInfoValueTests.FS_CONTROL_FLAGS_Values, SysInfoValueTests.FS_INFORMATION_CLASS_Values, SysInfoValueTests.FileSystemFlags_Values, SysInfoValueTests.IO_PRIORITY_HINT_Values, SysInfoValueTests.MANDATORY_LEVEL_Values, SysInfoValueTests.NTSectionFlags_Values, SysInfoValueTests.NT_COMPRESSION_FORMAT_Values, SysInfoValueTests.OBJECT_INFORMATION_CLASS_Values, SysInfoValueTests.PROCESSINFOCLASS_Values, SysInfoValueTests.QUOTA_LIMITS_FLAGS_Values, SysInfoValueTests.REMOTE_PROTOCOL_FLAGS_Values, SysInfoValueTests.SECTOR_SIZE_FLAGS_Values, SysInfoValueTests.TOKEN_ELEVATION_TYPE_Values, SysInfoValueTests.TOKEN_INFORMATION_CLASS_Values, SysInfoValueTests.TOKEN_MANDATORY_POLICY_FLAGS_Values, SysInfoValueTests.WNNC_CODES_Values -->
Every member that the WDK's headers declare has the value of the WDK's constant or enumerator of the same name.

| Name | Description |
|------|-------------|
| **CheckTokenMembershipExFlags**{: #CheckTokenMembershipExFlags } | The flags of **CheckTokenMembershipEx**, a routine the package does not declare: include AppContainer and less-privileged AppContainer tokens. |
| **FILE_CS_FLAGS**{: #FILE_CS_FLAGS } | The flags of **FILE_CASE_SENSITIVE_INFORMATION.Flags**. |
| **FILE_DISPOSITION_EX_FLAGS**{: #FILE_DISPOSITION_EX_FLAGS } | The `FILE_DISPOSITION_` flags of **FILE_DISPOSITION_INFO_EX.Flags**. |
| [**FILE_INFORMATION_CLASS**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ne-wdm-_file_information_class){: #FILE_INFORMATION_CLASS } | The classes of file information that **ZwQueryInformationFile** takes, and the **FltQueryInformationFile** and **FltSetInformationFile** of modFltMgr. The table of structures above names each structure's class. |
| **FILE_IO_COMPLETION_FLAGS**{: #FILE_IO_COMPLETION_FLAGS } | The `FILE_SKIP_` flags of **FILE_IO_COMPLETION_NOTIFICATION_INFORMATION.Flags**. |
| [**FILE_KNOWN_FOLDER_TYPE**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ne-ntifs-file_known_folder_type){: #FILE_KNOWN_FOLDER_TYPE } | The known folders of **FILE_KNOWN_FOLDER_INFORMATION.Type**. |
| **FILE_LINK_EX_FLAGS**{: #FILE_LINK_EX_FLAGS } | The `FILE_LINK_` flags of **FILE_LINK_INFORMATION_EX.Flags**. |
| **FILE_LX_FLAGS**{: #FILE_LX_FLAGS } | The flags of **FILE_STAT_LX_INFORMATION.LxFlags**: which of its Linux fields are set. |
| **FILE_LX_MODE**{: #FILE_LX_MODE } | The Linux file type and permission bits of **FILE_STAT_LX_INFORMATION.LxMode**. |
| **FILE_PIPE_COMPLETION_MODE**{: #FILE_PIPE_COMPLETION_MODE } | A named pipe's completion mode, queue or complete, as **FILE_PIPE_INFORMATION.CompletionMode** holds it. |
| **FILE_PIPE_CONFIG**{: #FILE_PIPE_CONFIG } | A named pipe's direction, inbound, outbound or full duplex, as **FILE_PIPE_LOCAL_INFORMATION.NamedPipeConfiguration** holds it. |
| **FILE_PIPE_END**{: #FILE_PIPE_END } | Which end of a named pipe, client or server, as **FILE_PIPE_LOCAL_INFORMATION.NamedPipeEnd** holds it. |
| **FILE_PIPE_READ_MODE**{: #FILE_PIPE_READ_MODE } | A named pipe's read mode, byte stream or message, as **FILE_PIPE_INFORMATION.ReadMode** holds it. |
| **FILE_PIPE_STATE**{: #FILE_PIPE_STATE } | A named pipe's state, disconnected, listening, connected or closing, as **FILE_PIPE_LOCAL_INFORMATION.NamedPipeState** holds it. |
| **FILE_PIPE_TYPE**{: #FILE_PIPE_TYPE } | A named pipe's type, byte stream or message, as **FILE_PIPE_LOCAL_INFORMATION.NamedPipeType** holds it. |
| **FILE_RENAME_EX_FLAGS**{: #FILE_RENAME_EX_FLAGS } | The `FILE_RENAME_` flags of **FILE_RENAME_INFORMATION_EX.Flags**. |
| [**FILE_STORAGE_TIER_CLASS**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ne-ntifs-_file_storage_tier_class){: #FILE_STORAGE_TIER_CLASS } | The storage tiers of **FILE_DESIRED_STORAGE_CLASS_INFORMATION.Class**. |
| **FILE_STORAGE_TIER_FLAGS**{: #FILE_STORAGE_TIER_FLAGS } | The flags of **FILE_DESIRED_STORAGE_CLASS_INFORMATION.Flags**. |
| **FILE_TX_DIRINFO_FLAGS**{: #FILE_TX_DIRINFO_FLAGS } | The flags of **FILE_ID_GLOBAL_TX_DIR_INFORMATION.TxInfoFlags**: the file's transactional visibility. |
| **FileSystemFlags**{: #FileSystemFlags } | The `FILE_` flags of **FILE_FS_ATTRIBUTE_INFORMATION.FileSystemAttributes**: what the file system supports. |
| [**FIRMWARE_TYPE**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ne-winnt-firmware_type){: #FIRMWARE_TYPE } | The firmware a system booted from, BIOS or UEFI, as **SYSTEM_BOOT_ENVIRONMENT_INFORMATION.FirmwareType** holds it. |
| **FS_CONTROL_FLAGS**{: #FS_CONTROL_FLAGS } | The quota and content-indexing flags of **FILE_FS_CONTROL_INFORMATION.FileSystemControlFlags**. |
| **FS_INFORMATION_CLASS**{: #FS_INFORMATION_CLASS } | The classes of volume information that **ZwQueryVolumeInformationFile** and **ZwSetVolumeInformationFile** take. It has no **FileFsGuidInformation**, 15, whose structure the WDK declares only for versions after Windows 11 version 22H2. |
| [**IO_PRIORITY_HINT**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ne-wdm-_io_priority_hint){: #IO_PRIORITY_HINT } | The I/O priorities of **FILE_IO_PRIORITY_HINT_INFORMATION.PriorityHint**: very low to critical. |
| **LDR_DATA_TABLE_FLAGS**{: #LDR_DATA_TABLE_FLAGS } | The flags of a loaded module's loader entry, as **RTL_PROCESS_MODULE_INFORMATION.Flags** holds them. |
| [**MANDATORY_LEVEL**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ne-winnt-mandatory_level){: #MANDATORY_LEVEL } | The integrity levels: untrusted, low, medium, high, system and protected process. |
| **NT_COMPRESSION_FORMAT**{: #NT_COMPRESSION_FORMAT } | The compression formats and engines, for **FILE_COMPRESSION_INFORMATION.CompressionFormat**, an **Integer**. |
| **NTGLB_Flags**{: #NTGLB_Flags } | The global flags of **SYSTEM_FLAGS_INFORMATION.Flags**. |
| **NTSectionFlags**{: #NTSectionFlags } | The `SEC_` attributes of a section, such as `SEC_COMMIT` and `SEC_IMAGE`, for the *AllocationAttributes* of **ZwCreateSection** (modWDM) and **SECTION_BASIC_INFORMATION.AllocationAttributes**. |
| **OB_OBJECT_FLAGS**{: #OB_OBJECT_FLAGS } | The flags of an object, for **SYSTEM_OBJECT_INFORMATION.Flags**, an **Integer**. |
| [**OBJECT_INFORMATION_CLASS**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ne-ntifs-_object_information_class){: #OBJECT_INFORMATION_CLASS } | The classes of object information **ZwQueryObject** takes. |
| **PROCESSINFOCLASS**{: #PROCESSINFOCLASS } | The classes of process information **ZwQueryInformationProcess** takes. |
| **PROCESSOR_ARCHITECTURE**{: #PROCESSOR_ARCHITECTURE } | The processor architectures, for **SYSTEM_PROCESSOR_INFORMATION.ProcessorArchitecture**, an **Integer**. |
| **QUOTA_LIMITS_FLAGS**{: #QUOTA_LIMITS_FLAGS } | The working-set limit flags of **SYSTEM_FILECACHE_INFORMATION.Flags**. |
| **REMOTE_PROTOCOL_FLAGS**{: #REMOTE_PROTOCOL_FLAGS } | The flags of **FILE_REMOTE_PROTOCOL_INFORMATION.Flags**. |
| **SECTION_INFORMATION_CLASS**{: #SECTION_INFORMATION_CLASS } | The classes of section information **ZwQuerySection** takes. |
| **SECTION_INHERIT**{: #SECTION_INHERIT } | Whether child processes get a mapped view of a section, `SECINH_ViewShare` or `SECINH_ViewUnmap`, C's `ViewShare` and `ViewUnmap`, for the *InheritDisposition* of C's `ZwMapViewOfSection`, which the package's **ZwMapViewOfSection** does not have. |
| **SectionImageBitfield**{: #SectionImageBitfield } | The flags of **SECTION_IMAGE_INFORMATION.ImageFlags**, a **Byte**: whether the image is .NET IL-only or native-ready, relocated, mapped flat or based below 4 GB. |
| **SECTOR_SIZE_FLAGS**{: #SECTOR_SIZE_FLAGS } | The flags of **FILE_FS_SECTOR_SIZE_INFORMATION.Flags**: alignment and trim support. |
| **SYSTEM_BOOT_ENV_FLAGS**{: #SYSTEM_BOOT_ENV_FLAGS } | The boot flags of **SYSTEM_BOOT_ENVIRONMENT_INFORMATION.BootFlags**. |
| **SYSTEM_CODEINTEGRITY_OPTIONS**{: #SYSTEM_CODEINTEGRITY_OPTIONS } | The options of **SYSTEM_CODEINTEGRITY_INFORMATION.CodeIntegrityOptions**, such as test signing. |
| **SYSTEM_CODEINTEGRITYPOLICY_HVCI_OPTIONS**{: #SYSTEM_CODEINTEGRITYPOLICY_HVCI_OPTIONS } | The hypervisor-enforced options of **SYSTEM_CODEINTEGRITYPOLICY_INFORMATION.HVCIOptions**. |
| **SYSTEM_CODEINTEGRITYPOLICY_OPTIONS**{: #SYSTEM_CODEINTEGRITYPOLICY_OPTIONS } | The options of **SYSTEM_CODEINTEGRITYPOLICY_INFORMATION.Options**. |
| **SYSTEM_INFORMATION_CLASS**{: #SYSTEM_INFORMATION_CLASS } | The classes of system information **ZwQuerySystemInformation** takes. |
| **SYSTEM_PIXEL_FORMAT**{: #SYSTEM_PIXEL_FORMAT } | The pixel formats of **SYSTEM_BOOT_GRAPHICS_INFORMATION.Format**. |
| [**TOKEN_ELEVATION_TYPE**](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ne-winnt-token_elevation_type){: #TOKEN_ELEVATION_TYPE } | A token's elevation type: default, full or limited. |
| [**TOKEN_INFORMATION_CLASS**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ne-ntifs-_token_information_class){: #TOKEN_INFORMATION_CLASS } | The classes of token information **ZwQueryInformationToken** and **ZwSetInformationToken** take. |
| **TOKEN_MANDATORY_POLICY_FLAGS**{: #TOKEN_MANDATORY_POLICY_FLAGS } | The flags of **TOKEN_MANDATORY_POLICY.Policy**: no write up, new process minimum. |
| **WNNC_CODES**{: #WNNC_CODES } | The network provider codes of **FILE_REMOTE_PROTOCOL_INFORMATION.Protocol**. |
<!-- /test -->

## Constants

<!-- test: SysInfoValueTests.Constants_Values -->
| Name | Value | Description |
|------|-------|-------------|
| **POLICY_AUDIT_SUBCATEGORY_COUNT**{: #POLICY_AUDIT_SUBCATEGORY_COUNT } | `59` | The audit policy subcategories of Windows 10: the length of **TOKEN_AUDIT_POLICY**. It is the value of the Windows SDK of Windows 11 version 22H2 (10.0.22621); the SDK of version 24H2 (10.0.26100) and later has 60, so a driver for those versions declares a **TOKEN_AUDIT_POLICY** of 31 bytes itself. |
| **POLICY_AUDIT_SUBCATEGORY_COUNT_Vista**{: #POLICY_AUDIT_SUBCATEGORY_COUNT_Vista } | `53` | The audit policy subcategories of Windows Vista. |
| **POLICY_AUDIT_SUBCATEGORY_COUNT_Win8**{: #POLICY_AUDIT_SUBCATEGORY_COUNT_Win8 } | `56` | The audit policy subcategories of Windows 8. |
| **TOKEN_SOURCE_LENGTH**{: #TOKEN_SOURCE_LENGTH } | `8` | The characters of **TOKEN_SOURCE.SourceName**. |
<!-- /test -->

## Example

The number of processors, and the size of an open file from the handle that **ZwCreateFile** of [modWDM](modWDM) returned.

```tb check_build
Module SystemQueries
    Public Function ProcessorCount() As Long
        Dim info As SYSTEM_BASIC_INFORMATION
        Dim needed As Long
        If ZwQuerySystemInformation(SystemBasicInformation, info, LenB(info), needed) >= 0 Then
            Return info.NumberOfProcessors
        End If
    End Function

    Public Function GetFileSize(ByVal FileHandle As LongPtr, Size As LongLong) As Long
        Dim iosb As IO_STATUS_BLOCK
        Dim info As FILE_STANDARD_INFORMATION
        Dim status As Long
        status = ZwQueryInformationFile(FileHandle, iosb, info, LenB(info), FileStandardInformation)
        If status >= 0 Then Size = info.EndOfFile.QuadPart
        Return status
    End Function
End Module
```

## See Also

- [modWDM](modWDM) module -- the types and routines every driver uses
- [modFltMgr](modFltMgr) module -- **FltQueryInformationFile** and **FltSetInformationFile**, which take a **FILE_INFORMATION_CLASS**
- [ZwQueryInformationFile](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwqueryinformationfile) -- Microsoft's reference, with the structure of each file class
- [ZwQueryVolumeInformationFile](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-zwqueryvolumeinformationfile) -- Microsoft's reference, with the structure of each volume class
