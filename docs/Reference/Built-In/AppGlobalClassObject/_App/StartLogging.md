---
title: StartLogging
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/StartLogging
has_toc: false
---
# StartLogging
{: .no_toc }

Begins logging application events to the specified target.

Syntax: *object*.**StartLogging** *LogTarget*, *LogModes*

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

*LogTarget*
: *required* A **String** specifying the log destination. Pass a file path to write to a file, or the Windows event log name (for example, `"NT Event Log"`) to write to the Windows Application event log.

*LogModes*
: *required* A **Long** composed of **LogModeConstants** flags that controls what events are logged. Pass `vbLogOff` (0) to disable logging.

**StartLogging** configures the logging destination and mode for subsequent calls to [**LogEvent**](LogEvent). The settings take effect until **StartLogging** is called again or the application ends.

> [!NOTE]
>
> **StartLogging** is currently unimplemented in twinBASIC. The method exists on the **_App** interface for VB6 source compatibility but does not perform any action at runtime.

### Example

This example enables file-based logging and writes an informational entry.

```tb
App.StartLogging "C:\Logs\MyApp.log", vbLogToFile
App.LogEvent "Application started.", vbLogEventTypeInformation
```

### See Also

- [LogEvent](LogEvent) method
- [LogMode](LogMode) property
