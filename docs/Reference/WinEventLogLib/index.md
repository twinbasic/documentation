---
title: WinEventLogLib Package
parent: Packages
grand_parent: Reference Section
nav_order: 8
permalink: /tB/Packages/WinEventLogLib/
has_toc: false
---

# WinEventLogLib Package
{: .no_toc }

The **WinEventLogLib** built-in package writes entries to the Windows Event Log from twinBASIC. Define two enumerations — one naming the event IDs your application can report, one naming the categories those events belong to — and the generic [**EventLog**](EventLog) class handles registration, registry setup, and the per-event `ReportEventW` call.

The package is a built-in package shipped with twinBASIC. Add it through Project → References (**Ctrl-T**) → Available Packages.

* TOC
{:toc}

## Lifecycle

A typical use has three stages:

1. **Declare** two enumerations — the event IDs and the categories — anywhere in the project. The values you assign become the numeric **Event ID** and **Category** columns visible in `eventvwr.msc`.
2. **Register** once, with administrator rights, at install time. Construct an [**EventLog**](EventLog) instance and call [**Register**](EventLog#register); this writes the source key under `HKLM\SYSTEM\CurrentControlSet\Services\EventLog\Application\<LogName>` and points the registry's **EventMessageFile** and **CategoryMessageFile** entries at the running EXE. Without this step, the Event Viewer shows *"The description for Event ID X cannot be found"* for every entry.
3. **Log** at runtime, without elevation. Construct the same [**EventLog**](EventLog) with the same *LogName* and call [**LogSuccess**](EventLog#logsuccess) or [**LogFailure**](EventLog#logfailure) whenever the application has something to report.

```tb
Public Enum MyEventIds
    StartupOk       = 1000
    StartupFailed   = 1001
    ShutdownClean   = 1100
End Enum

Public Enum MyCategories
    General = 1
    Network = 2
End Enum

' One-time install step (requires admin):
Sub Install()
    Dim Log As New EventLog(Of MyEventIds, MyCategories)("MyService")
    Log.Register
End Sub

' Runtime use (no admin required):
Sub OnServiceStart()
    Dim Log As New EventLog(Of MyEventIds, MyCategories)("MyService")
    Log.LogSuccess StartupOk, General, "Service started", App.ModulePath
End Sub
```

The same EXE that calls [**Register**](EventLog#register) must be the one that calls [**LogSuccess**](EventLog#logsuccess) / [**LogFailure**](EventLog#logfailure) — the registered **EventMessageFile** points at `App.ModulePath`, and the Event Viewer reads message strings out of that file when rendering entries.

## Message resources

The Windows Event Log stores only numeric **Event ID** and **Category** values; the human-readable strings live in a message-table resource embedded in the EXE pointed to by the registered **EventMessageFile** / **CategoryMessageFile** entries. Without this resource the Event Viewer cannot render entries and instead shows *"The description for Event ID X cannot be found"*.

For the generic [**EventLog**](EventLog)`(Of T1, T2)` class, the *T1* (event IDs) and *T2* (categories) enum declarations are the source of those strings — the class points the registry at the running EXE and assumes the EXE carries a message-table resource keyed by the enum member values. Authoring the resource yourself (a `.mc` file fed to `mc.exe`) and embedding it in the EXE is one route; the [**EventLog**](EventLog) class is designed to interoperate with whatever mechanism populates that resource for the *T1* / *T2* member names.

## Log Type

[**LogSuccess**](EventLog#logsuccess) and [**LogFailure**](EventLog#logfailure) are the only entry points currently exposed; they write **Information**-type and **Error**-type entries respectively. The names follow the Win32 SDK's `EVENTLOG_SUCCESS` (= 0, the *information* event type) and `EVENTLOG_ERROR_TYPE` (= 1) constants verbatim — *not* the Audit Success / Audit Failure event types familiar from the Security log.

The three other Windows Event Log entry types — **Warning**, **Audit Success**, and **Audit Failure** — are not yet reachable through the public API.

## Classes

- [EventLog](EventLog) -- the generic event-log source — open / register / log entries against one event log, parameterised by an event-ID enum and a category enum

## Modules

- [EventLogHelperPublic](EventLogHelperPublic) -- the low-level registry helper underlying [**EventLog.Register**](EventLog#register); call it directly only when you need to supply a category count without using the generic class
