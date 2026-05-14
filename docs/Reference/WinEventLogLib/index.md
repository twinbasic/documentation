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

The **WinEventLogLib** built-in package writes entries to the Windows Event Log from twinBASIC. Define two enumerations --- one naming the event IDs the application can report, one naming the categories those events belong to --- and the generic [**EventLog**](EventLog) class handles registration, registry setup, and the per-event `ReportEventW` call.

The package is a built-in package shipped with twinBASIC. Add it through Project → References (**Ctrl-T**) → Available Packages.

* TOC
{:toc}

## Lifecycle

A typical use has three stages:

1. **Declare** two enumerations --- the event IDs and the categories --- anywhere in the project. The assigned values become the numeric **Event ID** and **Category** columns visible in `eventvwr.msc`.
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

The same EXE that calls [**Register**](EventLog#register) must be the one that calls [**LogSuccess**](EventLog#logsuccess) / [**LogFailure**](EventLog#logfailure) --- the registered **EventMessageFile** points at `App.ModulePath`, and the Event Viewer reads message strings out of that file when rendering entries.

For service / long-running classes that should expose [**LogSuccess**](EventLog#logsuccess) / [**LogFailure**](EventLog#logfailure) / [**Register**](EventLog#register) as if those methods were their own, see the [composition-delegation idiom](#composition-delegation-idiom) below.

## Composition-delegation idiom

A class can mix [**EventLog**](EventLog)`(Of T1, T2)` in through twinBASIC's [`Implements ... Via`](../../../Features/Language/Inheritance) composition syntax and inherit its public members unqualified:

```tb
Class MyService
    Implements EventLog(Of MESSAGETABLE.EVENTS, MESSAGETABLE.CATEGORIES) Via _
        EventLog = New EventLog(Of MESSAGETABLE.EVENTS, MESSAGETABLE.CATEGORIES)("Application\" & CurrentComponentName)

    Sub Run()
        LogSuccess service_started, status_changed, CurrentComponentName    ' forwarded through the field above
        ' ...
        LogSuccess service_ended,   status_changed, CurrentComponentName
    End Sub
End Class
```

The `Implements <Class> Via <field> = <expression>` clause declares a private field, evaluates the constructor expression once on first use, and forwards every public member of [**EventLog**](EventLog) --- [**LogSuccess**](EventLog#logsuccess), [**LogFailure**](EventLog#logfailure), and [**Register**](EventLog#register) --- through that field. Inside `MyService` the three methods read as if they were declared on the class itself.

Two things to remember:

- The *T1* / *T2* type arguments must match between the `Implements` declaration and the constructor expression --- the compiler enforces this.
- Using `"Application\" & CurrentComponentName` as the *LogName* makes the log path automatically track the class name at compile time; renaming the class renames the source it logs to.

This is the canonical mix-in pattern for [**WinServicesLib**](../WinServicesLib/) service classes (every service class in a project that shares one set of event IDs inherits logging methods without per-class boilerplate). The same pattern works for any class that wants the [**EventLog**](EventLog) members available directly.

A class can use `Implements ... Via` on [**EventLog**](EventLog)`(Of T1, T2)` only **once**. When several classes in the same project need to share logging, declare a single module with one event-ID enum and one category enum and `Implements ... Via` against that pair from every class. Multiple unrelated message tables are still possible --- they just have to be reached through explicitly-named [**EventLog**](EventLog) fields rather than the `Implements ... Via` shortcut.

## Message resources

The Windows Event Log stores only numeric **Event ID** and **Category** values; the human-readable strings live in a message-table resource embedded in the EXE pointed to by the registered **EventMessageFile** / **CategoryMessageFile** entries. Without this resource the Event Viewer cannot render entries and instead shows *"The description for Event ID X cannot be found"*.

For the generic [**EventLog**](EventLog)`(Of T1, T2)` class, the *T1* (event IDs) and *T2* (categories) enum declarations are the source of those strings --- the class points the registry at the running EXE and the Event Viewer looks for a message-table resource keyed by the enum member values. Authoring the resource directly (a `.mc` file fed to `mc.exe`, embedded as a resource section) is one route; the convention shown below keeps the enums, the message strings, and the resource emission in lockstep from a single JSON file using twinBASIC's [`[PopulateFrom]`](../../Core/Attributes#populatefrom) enum-population attribute.

### The `[PopulateFrom("json", ...)]` convention
{: #populatefrom-convention }

Declare a module with two empty enum stubs, each tagged with [`[PopulateFrom]`](../../Core/Attributes#populatefrom) pointing at a project-relative JSON resource:

```tb
Module MESSAGETABLE
    [PopulateFrom("json", "/Resources/MESSAGETABLE/Strings.json", "events", "name", "id")]
    Enum EVENTS
    End Enum

    [PopulateFrom("json", "/Resources/MESSAGETABLE/Strings.json", "categories", "name", "id")]
    Enum CATEGORIES
    End Enum
End Module
```

The five [`[PopulateFrom]`](../../Core/Attributes#populatefrom) arguments are: the resource format (`"json"`), the project-relative path to the file, the JSON array to read entries from (`"events"` for the events stub, `"categories"` for the categories stub), the field name supplying each enum member's identifier, and the field name supplying its numeric value.

`Resources/MESSAGETABLE/Strings.json` has one entry per event and one per category. Each entry has three fields --- a numeric `id`, an enum-member `name`, and the per-locale message text under an `LCID_XXXX` key:

```json
{
    "events": [
        { "id": -1073610751, "name": "service_started",        "LCID_0000": "%1 service started" },
        { "id": -1073610750, "name": "service_startup_failed", "LCID_0000": "%1 service startup failed" },
        { "id": -1073610749, "name": "service_ended",          "LCID_0000": "%1 service ended" }
    ],
    "categories": [
        { "id": 1, "name": "status_changed", "LCID_0000": "Status Changed" }
    ]
}
```

The compiler reads the JSON at build time and populates each enum body --- `Enum EVENTS` ends up with `service_started = -1073610751`, `service_startup_failed = -1073610750`, … --- while emitting the message-table resource into the produced EXE. The `LCID_0000` strings (locale-neutral) become the message templates; substitute / add `LCID_0409` (US English), `LCID_040C` (French), etc. for localised projects.

Once the JSON, the enum stubs, and the registry entries written by [**Register**](EventLog#register) are in place, a runtime call

```tb
Dim Log As New EventLog(Of MESSAGETABLE.EVENTS, MESSAGETABLE.CATEGORIES)("Application\" & CurrentComponentName)
Log.LogSuccess service_started, status_changed, "MyService"
```

writes an event the Event Viewer renders as *"MyService service started"* --- the `%1` placeholder filled from the [**LogSuccess**](EventLog#logsuccess) *AdditionalStrings* `ParamArray`, the `status_changed` category resolved against the message table, both keyed by the numeric values the enums define.

The negative event-ID values in the JSON (`-1073610751` etc.) follow the Win32 documented event-ID bit layout --- the high bits encode severity, facility, and customer-defined flags. See Microsoft's *"Event Identifiers"* reference for the encoding; pick fresh IDs for new events and don't reuse identifiers across products.

## Log Type

[**LogSuccess**](EventLog#logsuccess) and [**LogFailure**](EventLog#logfailure) are the only entry points currently exposed; they write **Information**-type and **Error**-type entries respectively. The names follow the Win32 SDK's `EVENTLOG_SUCCESS` (= 0, the *information* event type) and `EVENTLOG_ERROR_TYPE` (= 1) constants verbatim --- *not* the Audit Success / Audit Failure event types familiar from the Security log.

The three other Windows Event Log entry types --- **Warning**, **Audit Success**, and **Audit Failure** --- are not yet reachable through the public API.

## Classes

- [EventLog](EventLog) -- the generic event-log source -- open / register / log entries against one event log, parameterised by an event-ID enum and a category enum

## Modules

- [EventLogHelperPublic](EventLogHelperPublic) -- the low-level registry helper underlying [**EventLog.Register**](EventLog#register); call it directly only when a category count must be supplied without using the generic class
