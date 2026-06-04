---
title: EventLog
parent: WinEventLogLib Package
permalink: /tB/Packages/WinEventLogLib/EventLog
has_toc: false
---

# EventLog class
{: .no_toc }

A generic class representing one Windows Event Log source. The type parameters supply the schema of events the source can report: *T1* is an enumeration of event IDs, *T2* is an enumeration of categories. Member names from those enums become the human-readable strings the Event Viewer shows.

Syntax: **New EventLog(Of** *T1*, *T2* **)** ( *LogName* )

*T1*
: *required* The enumeration type whose members name the event IDs this source can report. Passed as the *EventId* argument of [**LogSuccess**](#logsuccess) / [**LogFailure**](#logfailure).

*T2*
: *required* The enumeration type whose members name the categories events fall into. Passed as the *CategoryId* argument of [**LogSuccess**](#logsuccess) / [**LogFailure**](#logfailure). The number of categories declared in *T2* is what [**Register**](#register) writes as the registry's `CategoryCount`.

*LogName*
: *required* A **String** naming the event source. A leaf name like `"MyService"` is registered under the **Application** log (`Application\MyService`); a path like `"System\MyService"` is registered under the named parent log. The trailing segment is the source name --- it appears in the Event Viewer's **Source** column.

```tb
Public Enum MyEventIds
    StartupOk     = 1000
    StartupFailed = 1001
End Enum

Public Enum MyCategories
    General = 1
    Network = 2
End Enum

Dim Log As New EventLog(Of MyEventIds, MyCategories)("MyService")
```

Both type arguments are required at instantiation --- twinBASIC does not deduce them from the *LogName* constructor argument. See the [Generics](../../../Features/Language/Generics) page for the general rules.

A class that needs to expose [**LogSuccess**](#logsuccess) / [**LogFailure**](#logfailure) / [**Register**](#register) as if those methods were its own can mix the **EventLog** members in through [**Implements ... Via**](../../../Features/Language/Inheritance) composition --- see the [composition-delegation idiom](.#composition-delegation-idiom) section on the package overview for the canonical service-class pattern.

The package [overview](.) covers the install-then-log lifecycle, the [`[PopulateFrom("json", ...)]` message-resource convention](.#populatefrom-convention), registry layout, and the [composition-delegation idiom](.#composition-delegation-idiom).

* TOC
{:toc}

## Methods

### LogFailure
{: .no_toc }

Writes an **Error**-type entry to the log.

Syntax: *object*.**LogFailure** *EventId*, *CategoryId* [, *AdditionalStrings* ... ]

*EventId*
: *required* A *T1* value naming the event being reported. Becomes the numeric **Event ID** column in the Event Viewer; the corresponding member name from *T1* is used to look up the message string.

*CategoryId*
: *required* A *T2* value naming the category the event belongs to. Becomes the numeric **Task Category** column.

*AdditionalStrings*
: *optional* A **ParamArray** of values inserted into the event's message string at the `%1`, `%2`, ... placeholders. Each value is converted to a **String** before being passed to `ReportEventW`.

> [!NOTE]
> Despite the name, **LogFailure** writes an **Error** entry --- the Windows event type `EVENTLOG_ERROR_TYPE` (= 1). It does *not* write an *Audit Failure* entry. That event type, and *Warning* and *Audit Success*, are not currently reachable through this class.

The first call after construction lazily resolves the source handle via `RegisterEventSourceW`; if [**Register**](#register) has not been run for this *LogName*, the entry is still written but the Event Viewer cannot resolve the message strings and shows *"The description for Event ID X cannot be found"*.

### LogSuccess
{: .no_toc }

Writes an **Information**-type entry to the log.

Syntax: *object*.**LogSuccess** *EventId*, *CategoryId* [, *AdditionalStrings* ... ]

*EventId*
: *required* A *T1* value naming the event being reported. Becomes the numeric **Event ID** column in the Event Viewer.

*CategoryId*
: *required* A *T2* value naming the category the event belongs to. Becomes the numeric **Task Category** column.

*AdditionalStrings*
: *optional* A **ParamArray** of values inserted into the event's message string at the `%1`, `%2`, ... placeholders. Each value is converted to a **String** before being passed to `ReportEventW`.

> [!NOTE]
> The Windows event type for this call is `EVENTLOG_SUCCESS` (= 0), which is the Win32 SDK's literal name for the **Information** event type --- *not* an Audit Success entry. The class spells the method **LogSuccess** to track the SDK constant, but the entries that appear in `eventvwr.msc` are tagged **Information**.

The first call after construction lazily resolves the source handle via `RegisterEventSourceW`; if [**Register**](#register) has not been run for this *LogName*, the entry is still written but the Event Viewer cannot resolve the message strings and shows *"The description for Event ID X cannot be found"*.

### New
{: .no_toc }

Constructs an **EventLog** instance bound to a single source name.

Syntax: **New EventLog(Of** *T1*, *T2* **)** ( *LogName* )

*LogName*
: *required* A **String** naming the event source. A simple name such as `"MyService"` registers the source under the **Application** parent log (`Application\MyService`). A backslash-separated path such as `"System\MyService"` registers the source under the named parent log instead. The final segment is always the source name and appears in the Event Viewer's **Source** column.

The constructor only stores *LogName*; no Win32 call is made at construction time. The source handle is acquired lazily by `RegisterEventSourceW` on the first call to [**LogSuccess**](#logsuccess) or [**LogFailure**](#logfailure). If the handle cannot be acquired at that point, run-time error 5 is raised.

[**Register**](#register) must be called separately --- once, with administrator rights --- to write the registry entries the Event Viewer reads when rendering message strings. Constructing an **EventLog** instance and calling [**LogSuccess**](#logsuccess) / [**LogFailure**](#logfailure) without a prior [**Register**](#register) still writes entries to the log, but the Event Viewer cannot resolve message strings and displays *"The description for Event ID X cannot be found"* for each entry.

Both type arguments *T1* and *T2* are required at instantiation; twinBASIC does not deduce them from the *LogName* argument.

```tb
' Bind to "MyService" under the Application log.
Dim Log As New EventLog(Of MyEventIds, MyCategories)("MyService")

' Bind to a source under a named parent log.
Dim SysLog As New EventLog(Of MyEventIds, MyCategories)("System\MyService")
```

### Register
{: .no_toc }

Writes the registry entries that declare this EXE as the message provider for the source.

Syntax: *object*.**Register**

Creates `HKLM\SYSTEM\CurrentControlSet\Services\EventLog\<LogPath>` (prepending `Application\` if *LogName* is a leaf name) and writes:

- **EventMessageFile** = `App.ModulePath` (the running EXE)
- **CategoryMessageFile** = `App.ModulePath`
- **CategoryCount** = the largest declared value in *T2*, resolved at compile time via [**GetDeclaredMaxEnumValue**](../../Modules/HiddenModule/GetDeclaredMaxEnumValue)`(Of T2)`

> [!IMPORTANT]
> **Register** requires administrator rights --- it writes to `HKEY_LOCAL_MACHINE`. The usual pattern is to call it once from an elevated installer, not from the application's normal startup path.

The Event Viewer renders message strings by loading **EventMessageFile** and looking up the message resource keyed by *EventId*. Because **EventMessageFile** points at `App.ModulePath`, the same EXE that calls **Register** must be the one that later calls [**LogSuccess**](#logsuccess) / [**LogFailure**](#logfailure); otherwise the Event Viewer cannot find the message strings. See [Message resources](.#message-resources) and [The `[PopulateFrom("json", ...)]` convention](.#populatefrom-convention) on the package landing page for the recommended way to populate the resource.

If the registry key cannot be opened for write, **Register** raises run-time error 5 *"Failed to register event log source (\<LogName\>)"*. Typical causes are insufficient privileges and a *LogPath* that points at a non-existent parent log.

The lower-level [**EventLogHelperPublic.RegisterEventLogInternal**](EventLogHelperPublic#registereventloginternal) is what **Register** delegates to; use it directly only when registering a source without binding it to a generic *T2* (and so without using **GetDeclaredMaxEnumValue** to derive the category count).

## Example

This example registers a source on first install (requires admin) and then writes an **Information**-type entry at runtime.

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

## See Also

- [WinEventLogLib](.) package -- overview, lifecycle, message-resource generation
- [EventLogHelperPublic](EventLogHelperPublic) module -- the lower-level registration helper
- [Generics](../../../Features/Language/Generics) feature -- syntax rules for generic class instantiation
