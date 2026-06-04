---
title: LogMode
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/LogMode
has_toc: false
---
# LogMode
{: .no_toc }

Returns a **LogModeConstants** value indicating the active logging mode for the application. Read-only.

Syntax: *object*.**LogMode**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

**LogMode** reflects the logging state most recently set by a call to [**StartLogging**](StartLogging). The possible values are listed below.

| Constant | Value | Description |
|----------|-------|-------------|
| **vbLogAuto** | 0 | Logging mode is selected automatically. When running inside the IDE, log entries are sent to the debug console; when running as a compiled executable, they are written to a file. |
| **vbLogOff** | 1 | Logging is disabled. No entries are written. |
| **vbLogToFile** | 2 | Log entries are written to a file specified by [**LogPath**](LogPath). |
| **vbLogToNT** | 3 | Log entries are written to the Windows Event Log. |
| **vbLogOverwrite** | 16 | Combined with **vbLogToFile**: overwrite the log file each time the application starts instead of appending. |
| **vbLogThreadID** | 32 | Combined with **vbLogToFile** or **vbLogToNT**: prefix each log entry with the thread ID. |

> [!NOTE]
>
> In the current twinBASIC release, **LogMode** only reflects **vbLogOff** and **vbLogAuto**. The other constants are defined for compatibility with VB6 but are not yet fully supported.

### Example

This example checks the current log mode and prints it to the debug console.

```tb
Select Case App.LogMode
    Case vbLogOff
        Debug.Print "Logging is off."
    Case vbLogAuto
        Debug.Print "Logging is automatic."
    Case vbLogToFile
        Debug.Print "Logging to file: " & App.LogPath
    Case vbLogToNT
        Debug.Print "Logging to Windows Event Log."
End Select
```

### See Also

- [StartLogging](StartLogging) method
- [LogPath](LogPath) property
- [IsInIDE](IsInIDE) property
