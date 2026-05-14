---
title: App
parent: VB Package
permalink: /tB/Packages/VB/App/
has_toc: false
---

# App class
{: .no_toc }

The **App** class wraps the running application's identity and version metadata, plus a small amount of process-level state (the module handle, the main thread ID, whether the process is running inside the twinBASIC IDE or with elevated privileges, …). It is a singleton — there is exactly one **App** instance per process, owned by the runtime and exposed through the global **App** property of the [**Global**](../Global/) object. Code reaches it without qualification:

```tb
Debug.Print "Running from " & App.Path
Debug.Print "Version " & App.Major & "." & App.Minor & "." & App.Revision & "." & App.Build

If App.PrevInstance Then
    MsgBox "Another instance is already running.", vbExclamation
    End
End If

App.HelpFile = App.Path & "\help.chm"
```

Most properties are read-only and are populated from the project settings (compiled into the executable's Win32 `VERSIONINFO` resource) at build time. The few read/write properties — [**Title**](#title) and [**HelpFile**](#helpfile) — let code change a small amount of run-time state that other parts of the runtime (notably the form caption defaults and the **F1** help dispatcher) consult.

* TOC
{:toc}

## Singleton and access

**App** is not creatable: there is no `New App` and no public coclass to instantiate. The runtime exposes the singleton through the [**App**](../Global/#app) property on the [**Global**](../Global/) app-object, which is itself accessible without qualification. References returned by **App** are cached and stable for the lifetime of the process.

## File and module location

[**Path**](#path) and [**ModulePath**](#modulepath) describe where the executable lives:

- [**Path**](#path) returns the folder containing the EXE, with no trailing backslash (e.g. `"C:\Program Files\MyApp"`).
- [**ModulePath**](#modulepath) returns the full path to the EXE itself (e.g. `"C:\Program Files\MyApp\MyApp.exe"`).
- [**EXEName**](#exename) returns the EXE's base name without the extension (e.g. `"MyApp"`).

When the project is running inside the twinBASIC IDE — `App.IsInIDE` is **True** — [**Path**](#path) is the folder of the *project file* rather than of a compiled EXE, so it remains useful as a "where the application is" anchor for opening relative resources at design time.

[**LastBuildPath**](#lastbuildpath) is a twinBASIC-specific extension that records the path the most recent IDE build wrote its EXE to — useful for build scripts that need to chain steps after an IDE build.

## Version metadata

The version-info properties read straight from the EXE's `VERSIONINFO` resource:

- [**Major**](#major), [**Minor**](#minor), [**Revision**](#revision), and [**Build**](#build) — the four parts of the four-part version number set in the project's *Make* tab.
- [**Comments**](#comments), [**CompanyName**](#companyname), [**FileDescription**](#filedescription), [**LegalCopyright**](#legalcopyright), [**LegalTrademarks**](#legaltrademarks), and [**ProductName**](#productname) — the standard text fields of the same resource.
- [**Title**](#title) — the friendly application title shown in tasklist and message-box defaults; readable and writable.

[**hInstance**](#hinstance) and [**ThreadID**](#threadid) expose the underlying Win32 module handle and the ID of the application's main thread — useful for interop with Windows API functions that need either.

## Properties

### Build
{: .no_toc }

The **Build** component of the application's four-part version number, as set on the project's *Make* tab. **Integer**, read-only.

### Comments
{: .no_toc }

The free-form **Comments** field of the application's `VERSIONINFO` resource. **String**, read-only.

### CompanyName
{: .no_toc }

The **CompanyName** field of the application's `VERSIONINFO` resource. **String**, read-only.

### EXEName
{: .no_toc }

The base name of the executable — the file name minus its `.exe` extension and any directory component. **String**, read-only. When running inside the IDE, this is the project's compile-time output name rather than the IDE host's name.

### FileDescription
{: .no_toc }

The **FileDescription** field of the application's `VERSIONINFO` resource. **String**, read-only.

### HelpFile
{: .no_toc }

The full path to the application's help file (`.hlp` or `.chm`). **String**, readable and writable. The runtime consults this property when a control's [**HelpContextID**](../CheckBox/#helpcontextid) is non-zero and the user presses **F1**, and when application code calls `MsgBox` with a help-file argument.

### hInstance
{: .no_toc }

The Win32 module handle (`HINSTANCE`) for the executable. **LongPtr**, read-only. Useful when calling Windows API functions that load resources or create windows on the application's behalf.

### IsElevated
{: .no_toc }

**True** if the process is running with administrative privileges (a "Run as administrator" elevation token), **False** otherwise. **Boolean**, read-only.

### IsInIDE
{: .no_toc }

**True** if the running process is the twinBASIC IDE host rather than a stand-alone compiled executable. **Boolean**, read-only. Useful for code paths that should only run at design time, or for diagnostic logging that should be suppressed in shipping builds.

### LastBuildPath
{: .no_toc }

The full path that the IDE wrote the most recent build to. **String**, read-only. Empty when the IDE has not yet produced a build during the current session. twinBASIC-specific — VB6 had no equivalent.

### LegalCopyright
{: .no_toc }

The **LegalCopyright** field of the application's `VERSIONINFO` resource. **String**, read-only.

### LegalTrademarks
{: .no_toc }

The **LegalTrademarks** field of the application's `VERSIONINFO` resource. **String**, read-only.

### LogMode
{: .no_toc }

The current logging mode, as a member of [**LogModeConstants**](../../VBRUN/Constants/LogModeConstants). Read-only.

> [!NOTE]
> twinBASIC currently reports only **vbLogOff** and **vbLogAuto**, distinguishing IDE-detection cases. The other VB6 logging modes (file, NT event log) are not yet honoured.

### LogPath
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### Major
{: .no_toc }

The **Major** component of the application's four-part version number. **Integer**, read-only.

### Minor
{: .no_toc }

The **Minor** component of the application's four-part version number. **Integer**, read-only.

### ModulePath
{: .no_toc }

The full path to the executable file. **String**, read-only. This is what `GetModuleFileName(App.hInstance, …)` would return.

### NonModalAllowed
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### OleRequestPendingMsgText
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### OleRequestPendingMsgTitle
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### OleRequestPendingTimeout
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### OleServerBusyMsgText
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### OleServerBusyMsgTitle
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### OleServerBusyRaiseError
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### OleServerBusyTimeout
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### Path
{: .no_toc }

The folder containing the executable, with no trailing backslash. **String**, read-only. When running inside the IDE, this is the folder containing the project file rather than the IDE host's folder, so code that opens files relative to the application location works identically at design time and at run time.

### PrevInstance
{: .no_toc }

**True** if another instance of the application is already running, **False** otherwise. **Boolean**, read-only. Typically tested at startup so the second instance can bring the first to the foreground or exit gracefully.

### ProductName
{: .no_toc }

The **ProductName** field of the application's `VERSIONINFO` resource. **String**, read-only.

### RetainedProject
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### Revision
{: .no_toc }

The **Revision** component of the application's four-part version number. **Integer**, read-only.

### StartMode
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### TaskVisible
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### ThreadID
{: .no_toc }

The Win32 thread ID of the application's main (UI) thread. **Long**, read-only.

### Title
{: .no_toc }

The application title shown to the OS (in the tasklist) and used as the default title for `MsgBox`, `InputBox`, and other system dialogs. **String**, readable and writable. Defaults to the executable's [**FileDescription**](#filedescription) (or [**EXEName**](#exename) if no description is set).

### UnattendedApp
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

## Methods

### LogEvent
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

Syntax: *object*.**LogEvent** *LogBuffer*, *EventType*

### StartLogging
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

Syntax: *object*.**StartLogging** *LogTarget*, *LogModes*
