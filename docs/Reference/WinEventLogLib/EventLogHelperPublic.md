---
title: EventLogHelperPublic
parent: WinEventLogLib Package
permalink: /tB/Packages/WinEventLogLib/EventLogHelperPublic
has_toc: false
---

# EventLogHelperPublic module
{: .no_toc }

A single low-level helper that writes the registry entries Windows reads when rendering Event Log messages. Most projects do not call into this module directly — [**EventLog.Register**](EventLog#register) wraps the call and automatically supplies the category count from the *T2* type argument. Use **EventLogHelperPublic** only when registering a source outside the generic [**EventLog**](EventLog) class (for example, when the category count cannot be derived from a declared enum).

* TOC
{:toc}

## RegisterEventLogInternal

Writes the registry entries that declare the running EXE as the message provider for an event source.

Syntax: **EventLogHelperPublic.RegisterEventLogInternal** *LogPath*, *CategoryCount*

*LogPath*
: *required* A **String** naming the source. A leaf name like `"MyService"` is registered under the **Application** log (rewritten internally to `"Application\MyService"`); a full path like `"System\MyService"` is registered under the named parent log. The trailing segment is the source name displayed in the Event Viewer's **Source** column.

*CategoryCount*
: *required* A **Long** giving the number of categories declared for this source — the largest value in the corresponding category enum. Stored as the registry's `CategoryCount` DWORD; the Event Viewer uses it to bound category-string lookups in the EXE's message-table resource.

Creates `HKLM\SYSTEM\CurrentControlSet\Services\EventLog\<LogPath>` and writes:

- **EventMessageFile** = `App.ModulePath` (the running EXE; **REG_SZ**)
- **CategoryMessageFile** = `App.ModulePath` (**REG_SZ**)
- **CategoryCount** = *CategoryCount* (**REG_DWORD**)

> [!IMPORTANT]
> **RegisterEventLogInternal** writes under `HKEY_LOCAL_MACHINE` and requires administrator rights. The usual pattern is to call it once from an elevated installer, not from the application's normal startup path.

If the registry key cannot be opened for write, **RegisterEventLogInternal** raises run-time error 5 with the message *"Failed to register event log source (\<LogName\>)"*, where `<LogName>` is the trailing segment of *LogPath*. Typical causes are insufficient privileges and a *LogPath* whose parent log (e.g. `"Application"`, `"System"`) does not exist.

## See Also

- [WinEventLogLib](.) package -- overview, lifecycle, message-resource generation
- [EventLog](EventLog) class -- the generic class whose [**Register**](EventLog#register) method wraps this helper
