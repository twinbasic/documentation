---
title: AppGlobalClassObject Package
parent: Built-In Packages
has_toc: false
exclude_from_docs:
  - InternalStuff
indexed_from: beta-x-0983
---

# AppGlobalClassObject Package
{: .no_toc }

The **AppGlobalClassObject** built-in package provides the `App` global object available in every twinBASIC project.

## Interfaces

- [_App](_App/_App) -- Interface implemented by the global `App` object, exposing executable metadata, version information, instance handle, and related properties.

## Properties

- [Build](_App/Build) -- Returns the build-number component of the project version. Read-only.
- [Comments](_App/Comments) -- Returns the Comments string from the project's version information. Read-only.
- [CompanyName](_App/CompanyName) -- Returns the company name stored in the project's version information. Read-only.
- [EXEName](_App/EXEName) -- Returns the name of the running executable, without path or extension. Read-only.
- [FileDescription](_App/FileDescription) -- Returns the file description string from the project's version information. Read-only.
- [HelpFile](_App/HelpFile) -- Gets or sets the path to the Help file associated with the application.
- [hInstance](_App/hInstance) -- Returns the Win32 instance handle (`HINSTANCE`) of the running executable or DLL. Read-only.
- [IsInIDE](_App/IsInIDE) -- Returns **True** if code is executing inside the twinBASIC IDE, **False** if running as a compiled executable. Read-only.
- [LastBuildPath](_App/LastBuildPath) -- Returns the full path to the output file produced by the most recent build. Read-only.
- [LegalCopyright](_App/LegalCopyright) -- Returns the legal copyright string from the project's version information. Read-only.
- [LegalTrademarks](_App/LegalTrademarks) -- Returns the legal trademarks string from the compiled executable's version information. Read-only.
- [LogMode](_App/LogMode) -- Returns a **LogModeConstants** value indicating the active logging mode. Read-only.
- [LogPath](_App/LogPath) -- Returns the path to the log file established by **StartLogging**. Read-only.
- [Major](_App/Major) -- Returns the major version number component of the project version. Read-only.
- [Minor](_App/Minor) -- Returns the minor version number component of the project version. Read-only.
- [ModulePath](_App/ModulePath) -- Returns the full file-system path of the currently executing module. Read-only.
- [NonModalAllowed](_App/NonModalAllowed) -- Returns **True** if the application is permitted to display non-modal forms. Read-only.
- [OleRequestPendingMsgText](_App/OleRequestPendingMsgText) -- Gets or sets the body text of the dialog displayed when an OLE request has been pending too long.
- [OleRequestPendingMsgTitle](_App/OleRequestPendingMsgTitle) -- Gets or sets the title bar text of the dialog displayed when an OLE request has been pending too long.
- [OleRequestPendingTimeout](_App/OleRequestPendingTimeout) -- Gets or sets the milliseconds that can elapse before a pending OLE request dialog is displayed.
- [OleServerBusyMsgText](_App/OleServerBusyMsgText) -- Gets or sets the body text of the dialog displayed when an OLE server is busy.
- [OleServerBusyMsgTitle](_App/OleServerBusyMsgTitle) -- Gets or sets the title bar text of the dialog displayed when an OLE server is busy.
- [OleServerBusyRaiseError](_App/OleServerBusyRaiseError) -- Gets or sets whether a runtime error is raised instead of displaying a dialog when an OLE server is busy.
- [OleServerBusyTimeout](_App/OleServerBusyTimeout) -- Gets or sets the milliseconds that can elapse before the OLE server busy dialog is displayed.
- [Path](_App/Path) -- Returns the directory containing the running executable, without a trailing path separator. Read-only.
- [PrevInstance](_App/PrevInstance) -- Returns **True** if another instance of this executable was already running when the current instance started. Read-only.
- [ProductName](_App/ProductName) -- Returns the product name stored in the project's version information. Read-only.
- [RetainedProject](_App/RetainedProject) -- Returns **True** if the project is retained in memory after all externally-created objects are released. Read-only.
- [Revision](_App/Revision) -- Returns the revision component of the project version. Read-only.
- [StartMode](_App/StartMode) -- Returns an **Integer** indicating how the application was started. Read-only.
- [TaskVisible](_App/TaskVisible) -- Gets or sets whether the application appears in the Windows taskbar and task list.
- [ThreadID](_App/ThreadID) -- Returns the Win32 thread ID of the main application thread. Read-only.
- [Title](_App/Title) -- Returns or sets the application title shown in the Windows taskbar and task list.
- [UnattendedApp](_App/UnattendedApp) -- Returns **True** if the application is running in unattended mode. Read-only.

## Methods

- [LogEvent](_App/LogEvent) -- Writes a message to the log target configured by **StartLogging**.
- [StartLogging](_App/StartLogging) -- Begins logging application events to the specified target.
