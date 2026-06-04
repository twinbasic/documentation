---
title: EventLogTypeConstants
parent: WinEventLogLib Package
permalink: /tB/Packages/WinEventLogLib/EventLogTypeConstants
has_toc: false
---
# EventLogTypeConstants
{: .no_toc }

The Windows Event Log entry-type values. Corresponds to the Win32 `EVENTLOG_*` type constants passed to `ReportEventW`.

| Constant | Value | Description |
|----------|-------|-------------|
| **vbEventLogTypeSuccess**{: #vbEventLogTypeSuccess } | 0 | An information entry. Maps to the Win32 `EVENTLOG_SUCCESS` constant. This is the type written by [**EventLog.LogSuccess**](EventLog#logsuccess). |
| **vbEventLogTypeError**{: #vbEventLogTypeError } | &H1 | An error entry. Maps to the Win32 `EVENTLOG_ERROR_TYPE` constant. This is the type written by [**EventLog.LogFailure**](EventLog#logfailure). |
| **vbEventLogTypeWarning**{: #vbEventLogTypeWarning } | &H2 | A warning entry. Maps to the Win32 `EVENTLOG_WARNING_TYPE` constant. |
| **vbEventLogTypeAuditSuccess**{: #vbEventLogTypeAuditSuccess } | &H8 | A success-audit entry. Maps to the Win32 `EVENTLOG_AUDIT_SUCCESS` constant. Typically used in the Security log; not applicable to the Application log. |
| **vbEventLogTypeAuditFailure**{: #vbEventLogTypeAuditFailure } | &H10 | A failure-audit entry. Maps to the Win32 `EVENTLOG_AUDIT_FAILURE` constant. Typically used in the Security log; not applicable to the Application log. |

> [!NOTE]
> The current [**EventLog**](EventLog) public API exposes only [**LogSuccess**](EventLog#logsuccess) (type **vbEventLogTypeSuccess**) and [**LogFailure**](EventLog#logfailure) (type **vbEventLogTypeError**). The **Warning**, **AuditSuccess**, and **AuditFailure** constants are not yet reachable through the generic class.

### See Also

- [EventLog](EventLog) -- the generic event-log source class
- [EventLogHelperPublic](EventLogHelperPublic) -- the low-level registry helper
