# WinEventLogLib Package — Working Notes

See [WIP.md](WIP.md) for the cross-package maintenance guide. Sister packages: [WinServicesLib](WIP.WinServicesLib.md), [WinNamedPipesLib](WIP.WinNamedPipesLib.md).

`Constants.twin` declares `Public Enum EventLogTypeConstants` inside a `Private Module`, so the enum is not public. The `EventLogHelperPrivate` module in `Helper.twin` is *intended-private* despite its `Public` modifier (only `EventLog.LogArray` uses it). The Win32 API wrappers in `APIs.twin` are plumbing.

The public surface:

| Symbol                          | Kind                | Role                                                                                  |
|---------------------------------|---------------------|---------------------------------------------------------------------------------------|
| `EventLog(Of T1, T2)`           | Generic class       | Main user-facing class. `T1` is the event-ID enum, `T2` is the category enum.         |
| `EventLogHelperPublic`          | Public module       | Holds the low-level `RegisterEventLogInternal` helper.                                |
| `RegisterEventLogInternal`      | `Sub` on the module | Registry-write helper; `EventLog.Register()` is the normal entry point.               |

`EventLog(Of T1, T2)` public members:

- `Public Sub New(LogName As String)` — constructor. `LogName` is either a leaf name (`"MyService"`, registered under `Application\MyService`) or a full path (`"System\MyService"`, registered under `System\MyService`).
- `Public Sub LogSuccess(ByVal EventId As T1, ByVal CategoryId As T2, ParamArray AdditionalStrings())` — writes an **Information**-type event (`EVENTLOG_SUCCESS = 0`). The name "Success" is the Win32 SDK constant's literal name, *not* the audit-success category. The per-method entries of both methods say so.
- `Public Sub LogFailure(ByVal EventId As T1, ByVal CategoryId As T2, ParamArray AdditionalStrings())` — writes an **Error**-type event (`EVENTLOG_ERROR_TYPE = 1`).
- `Public Sub Register()` — writes the registry entries under `HKLM\SYSTEM\CurrentControlSet\Services\EventLog\…` to declare this EXE as the message provider for the source. Calls `RegisterEventLogInternal(LogName, GetDeclaredMaxEnumValue(Of T2))` — the category count is derived from `T2`'s declared maximum value at compile time.

Class-level decoration on `EventLog`: `[COMCreatable(False)]`, `[ClassId("4AEA12E8-…-EAEAEAEAEAEA")]` (the `EA` suffix triggers special compiler handling for generic classes). The `[Description]` attribute on the class is the basis for the page intro: *"This is the main event log (generic) class."*

`EventLogHelperPublic` public members:

- `Public Sub RegisterEventLogInternal(ByVal LogPath As String, ByVal CategoryCount As Long)` — the registry-write helper. Prepends `"Application\"` to *LogPath* if no backslash is present, opens `HKLM\SYSTEM\CurrentControlSet\Services\EventLog\<LogPath>` with `KEY_WRITE`, then writes `EventMessageFile` and `CategoryMessageFile` (both set to `App.ModulePath`) and `CategoryCount`. Requires admin rights (registry writes to HKLM). Raises run-time error 5 with the message *"Failed to register event log source (\<LogName\>)"* if the open fails. `EventLog.Register()` fills *CategoryCount* automatically.

**Gaps and quirks** the docs state (from a static read of the source):

- The `EventLogTypeConstants` enum has five values (`Success`, `Warning`, `Error`, `AuditSuccess`, `AuditFailure`) but the public class only exposes Information and Error event types — Warning and Audit events are not reachable.
- Message resources: the registry entries point at `App.ModulePath` (the running EXE) for both `EventMessageFile` and `CategoryMessageFile`. Windows therefore expects a message-table resource keyed by the `T1` and `T2` enum values to be embedded in the EXE. The `.twin` source does not itself synthesise that resource; whatever mechanism populates the resource sits in the compiler's special-handling path for the `[ClassId("…EAEAEAEAEAEA")]` magic-byte pattern. The docs describe what Windows expects without making strong claims about how the compiler delivers it.
- `Register()` requires elevation. Normal usage is to call it once during install (from an elevated installer), then call `LogSuccess` / `LogFailure` at runtime without elevation.

## Canonical usage idiom — composition-delegation onto a service class

The package's intended usage, not obvious from the bare API:

```tb
Class TBSERVICE001
    Implements ITbService
    Implements EventLog(Of MESSAGETABLE.EVENTS, MESSAGETABLE.CATEGORIES) Via _
        EventLog = New EventLog(Of MESSAGETABLE.EVENTS, MESSAGETABLE.CATEGORIES)("Application\" & CurrentComponentName)
    …
    LogSuccess(service_started, status_changed, CurrentComponentName)   ' surfaces directly
End Class
```

The `Implements <Class> Via <field> = <expression>` form is twinBASIC's composition-delegation syntax ([Inheritance](docs/Features/Language/Inheritance.md); the [`CustomControls` mixin pattern](docs/Reference/Built-In/CustomControls/index.md) is an analogous use). The class gives the compiler a private field plus a constructor expression, and the compiler forwards every `Public` member of `EventLog` (`LogSuccess`, `LogFailure`, `Register`) through that field: the service class *contains* an `EventLog` instance and exposes its logging methods as its own.

The package index shows this as the **recommended pattern** for service and long-running classes (the `EventLog` page links to it), and spells out:

- The constructor expression evaluates *once* (the first time the delegating class is instantiated, per twinBASIC's `Implements ... Via` semantics).
- The `T1` / `T2` type arguments must be identical at the `Implements` declaration and the constructor (the compiler enforces this).
- The `LogPath` is typically `"Application\" & CurrentComponentName` — `CurrentComponentName` is the compile-time class name, so the log path automatically tracks renames.
- Calling code uses `LogSuccess` / `LogFailure` / `Register` unqualified.

## Message-table backing: `[PopulateFrom("json", …)]` on the enums

The `T1` / `T2` enums are typically auto-populated from a JSON resource via the `[PopulateFrom]` attribute:

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

…with `Resources\MESSAGETABLE\Strings.json`:

```json
{
    "events": [
        { "id": -1073610751, "name": "service_started",        "LCID_0000": "%1 service started" },
        { "id": -1073610750, "name": "service_startup_failed", "LCID_0000": "%1 service startup failed" },
        …
    ],
    "categories": [
        { "id": 1, "name": "status_changed", "LCID_0000": "Status Changed" }
    ]
}
```

1. **The enum bodies are populated at compile time** — `Enum EVENTS` starts empty in the source, but after compilation it has members `service_started = -1073610751`, `service_startup_failed = -1073610750`, … (one per `"events"` entry in the JSON, keyed `name → id`).
2. **The same JSON is consumed by the compiler's `mc.exe`-equivalent** that emits the message-table resource into `App.ModulePath`. The `LCID_0000` strings are the message-table entries, and the `%1`, `%2`, … placeholders are filled at log time from the `AdditionalStrings` `ParamArray` to `LogSuccess` / `LogFailure`. The `CategoryCount` registry value (written by `Register()`) is the highest declared `id` in the `categories` block, which is what `GetDeclaredMaxEnumValue(Of T2)` recovers at compile time.

So the round-trip is: JSON → compile-time enum population + message-table resource emission → registry entries that point Windows at the EXE → runtime `LogSuccess(EventId, CategoryId, …)` writes an event the Event Viewer can format using the embedded message-table strings.

The index page's *Message resources* section has this with the JSON skeleton and a cross-reference to `[PopulateFrom]` (documented in [Attributes](docs/Reference/Attributes.md), not in the package reference).

The negative event-ID values in the JSON (`-1073610751`) are the standard Win32 event-ID encoding: the high bits encode severity (`0xC0000000` = Error), facility (`0x...`), and customer bit. The docs do not unpack this; they point to Microsoft's "Event Identifiers" reference.

## Why `T1` / `T2` and not separate `EventIds` / `Categories` classes

A class can only `Implements EventLog(Of T1, T2) Via …` *once*. A service that needs events from several unrelated message tables can hold several `EventLog` instances **as named fields** (no `Via`). Calls then read `MyEventLog.LogSuccess(…)` instead of `LogSuccess(…)`; the index says so. Most services share one `MESSAGETABLE` module across all their classes, so the limit rarely matters.
