---
title: _App
parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/
has_toc: false
---

# _App interface
{: .no_toc }

The interface implemented by the global **App** object, which exposes information about the running executable --- its name, path, version, instance handle, and related metadata.

**App** is a predeclared global object of type **App** (a `CoClass` that implements **_App**). It is available in every twinBASIC project without any declaration or instantiation. All members are accessed through the `App` global:

```tb
Debug.Print App.EXEName
Debug.Print App.Major & "." & App.Minor & "." & App.Revision
```

* TOC
{:toc}

## Properties

### Build
{: .no_toc }

The build-number component of the project version, as configured in the project settings. **Integer**. Read-only.

See [**Build**](Build).

### Comments
{: .no_toc }

The **Comments** field from the compiled executable's version information. **String**. Read-only.

See [**Comments**](Comments).

### CompanyName
{: .no_toc }

The **Company Name** field from the compiled executable's version information. **String**. Read-only.

See [**CompanyName**](CompanyName).

### EXEName
{: .no_toc }

The name of the running executable, without the path or file extension. **String**. Read-only.

See [**EXEName**](EXEName).

### FileDescription
{: .no_toc }

The **File Description** field from the compiled executable's version information. **String**. Read-only.

See [**FileDescription**](FileDescription).

### HelpFile
{: .no_toc }

The path to the project's help file. **String**. Read/write.

See [**HelpFile**](HelpFile).

### hInstance
{: .no_toc }

The Win32 instance handle (`HINSTANCE`) of the running executable or DLL. **LongPtr**. Read-only.

See [**hInstance**](hInstance).

### IsInIDE
{: .no_toc }

**True** when code is executing inside the twinBASIC IDE; **False** when running as a compiled executable. **Boolean**. Read-only.

See [**IsInIDE**](IsInIDE).

### LastBuildPath
{: .no_toc }

The full path to the output file produced by the most recent build. **String**. Read-only.

See [**LastBuildPath**](LastBuildPath).

### LegalCopyright
{: .no_toc }

The **Legal Copyright** field from the compiled executable's version information. **String**. Read-only.

See [**LegalCopyright**](LegalCopyright).

### LegalTrademarks
{: .no_toc }

The **Legal Trademarks** field from the compiled executable's version information. **String**. Read-only.

See [**LegalTrademarks**](LegalTrademarks).

### LogMode
{: .no_toc }

The current logging mode. A member of **LogModeConstants**. Read-only.

> [!NOTE]
> Currently only **vbLogOff** and **vbLogAuto** are supported, for IDE-detection purposes.

### Major
{: .no_toc }

The major-version component of the project version. **Integer**. Read-only.

### Minor
{: .no_toc }

The minor-version component of the project version. **Integer**. Read-only.

### ModulePath
{: .no_toc }

The full path to the running executable or DLL, including the file name and extension. **String**. Read-only.

See [**ModulePath**](ModulePath).

### Path
{: .no_toc }

The directory that contains the running executable, without a trailing path separator. **String**. Read-only.

See [**Path**](Path).

### PrevInstance
{: .no_toc }

**True** when another instance of this executable was already running when this instance started. **Boolean**. Read-only.

### ProductName
{: .no_toc }

The **Product Name** field from the compiled executable's version information. **String**. Read-only.

### Revision
{: .no_toc }

The revision component of the project version. **Integer**. Read-only.

### ThreadID
{: .no_toc }

The Win32 thread ID of the main thread. **Long**. Read-only.

### Title
{: .no_toc }

The application title, as shown in the Windows taskbar and task list. **String**. Read/write.

The initial value comes from the project settings. Assigning to **Title** updates the running process's description immediately.

## Methods

### LogEvent
{: .no_toc }

Writes an entry to the application event log.

> [!NOTE]
> **LogEvent** is currently unimplemented. Calls are accepted but have no effect.

Syntax: **App**.**LogEvent** *LogBuffer*, *EventType*

*LogBuffer*
: *required* A **String** containing the message to write.

*EventType*
: *required* A **Variant** specifying the event severity.

### StartLogging
{: .no_toc }

Begins logging application events to the specified target.

> [!NOTE]
> **StartLogging** is currently unimplemented. Calls are accepted but have no effect.

Syntax: **App**.**StartLogging** *LogTarget*, *LogModes*

*LogTarget*
: *required* A **String** specifying the log destination (a file path or the Windows event log).

*LogModes*
: *required* A **Long** composed of **LogModeConstants** flags that controls what is logged.

## Remarks

The following **_App** properties are declared in the interface but are not yet implemented in twinBASIC. Reading or writing them has no effect:

- **LogPath**
- **NonModalAllowed**
- **OleRequestPendingMsgText**
- **OleRequestPendingMsgTitle**
- **OleRequestPendingTimeout**
- **OleServerBusyMsgText**
- **OleServerBusyMsgTitle**
- **OleServerBusyRaiseError**
- **OleServerBusyTimeout**
- **RetainedProject**
- **StartMode**
- **TaskVisible**
- **UnattendedApp**

## See Also

- [AppGlobalClassObject Package](.) -- package overview
