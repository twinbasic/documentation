---
title: LogEvent
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/LogEvent
has_toc: false
---
# LogEvent
{: .no_toc }

Writes a message to the log target configured by [StartLogging](StartLogging).

Syntax: *object*.**LogEvent** *LogBuffer*, *EventType*

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

*LogBuffer*
: *required* A **String** containing the message text to write to the log.

*EventType*
: *required* A **Variant** specifying the severity of the event. Accepts the `LogEventTypeConstants` values: `vbLogEventTypeInformation` (1), `vbLogEventTypeWarning` (2), or `vbLogEventTypeError` (3).

**LogEvent** writes *LogBuffer* to the log destination established by a prior call to **StartLogging**. If logging has not been started, or if the **LogMode** is `vbLogOff`, the call has no effect.

> [!NOTE]
>
> **LogEvent** is currently unimplemented in twinBASIC. The method exists on the **_App** interface for VB6 source compatibility but does not perform any action at runtime.

### Example

This example writes an informational entry to the application log.

```tb
App.StartLogging "C:\Logs\MyApp.log", vbLogToFile
App.LogEvent "Application started.", vbLogEventTypeInformation
```

### See Also

- [StartLogging](StartLogging) method
- [LogMode](LogMode) property
