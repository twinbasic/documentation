---
title: ServiceState
parent: WinServicesLib Package
permalink: /tB/Packages/WinServicesLib/ServiceState
has_toc: false
---

# ServiceState class
{: .no_toc }

A read-only snapshot of an installed service's current state as reported by the SCM. Typically obtained via [**Services.QueryStateOfService**](Services#querystateofservice); can also be constructed directly with **New ServiceState**(*ServiceName*).

```tb
Dim state As ServiceState
Set state = Services.QueryStateOfService("MyService")

Debug.Print state.CurrentStateText, "PID " & state.ProcessId
```

The snapshot is taken **once at construction time** and never refreshed. To monitor a service over time, call [**Services.QueryStateOfService**](Services#querystateofservice) again at each sampling interval --- typically from a low-frequency Timer.

* TOC
{:toc}

## Methods

### New
{: .no_toc }

Initializes a **ServiceState** instance by querying the SCM for the named service's current status.

Syntax: **New ServiceState**(*ServiceName*)

*ServiceName*
: *required* A **String** naming the service as registered in the SCM database (the same value passed to [**Services.QueryStateOfService**](Services#querystateofservice) or stored in [**ServiceManager.Name**](ServiceManager#name)).

Opens the SCM with `SC_MANAGER_CONNECT`, opens the named service with `SERVICE_QUERY_STATUS`, and calls `QueryServiceStatusEx(SC_STATUS_PROCESS_INFO, ...)` to populate the internal `SERVICE_STATUS_PROCESS` buffer. All service and SCM handles are closed before the constructor returns.

Three failure modes raise run-time error **5** with a descriptive message:

- `"Unable to open the Service manager (OpenSCManagerW failed). Check permissions."` --- the calling process lacks sufficient rights to open the SCM.
- `"Service '<name>' is not installed on this system"` --- no service with the given name exists in the SCM database.
- `"Unable to query the service state"` --- `QueryServiceStatusEx` failed after the service handle was opened.

Wrap the constructor in `On Error Resume Next` when the caller needs to distinguish "service is running" from "service is not installed":

```tb
Private Function GetStateText(ByVal serviceName As String) As String
    On Error Resume Next
    Dim state As ServiceState
    Set state = New ServiceState(serviceName)
    If Err.Number = 0 Then
        GetStateText = state.CurrentStateText
    Else
        GetStateText = "not installed"
    End If
End Function
```

## Properties

### CheckPoint
{: .no_toc }

The SCM-reported `dwCheckPoint` value. **Long**.

Services in a *Pending* state ([**StartPending**](Enumerations/ServiceStatusConstants#vbServiceStatusStartPending), [**StopPending**](Enumerations/ServiceStatusConstants#vbServiceStatusStopPending), [**PausePending**](Enumerations/ServiceStatusConstants#vbServiceStatusPausePending), [**ContinuePending**](Enumerations/ServiceStatusConstants#vbServiceStatusContinuePending)) report a periodically-incrementing **CheckPoint** so the SCM can tell a slow-but-progressing transition from a hung service. The package's [**ServiceManager.ReportStatus**](ServiceManager#reportstatus) auto-increments the field while the service is in a pending state and resets it to **0** on [**Running**](Enumerations/ServiceStatusConstants#vbServiceStatusRunning) or [**Stopped**](Enumerations/ServiceStatusConstants#vbServiceStatusStopped).

### ControlsAccepted
{: .no_toc }

A bitmask of `SERVICE_ACCEPT_*` flags indicating which control codes the service has told the SCM it accepts. **Long**.

> [!NOTE]
> Although the underlying SCM field is a flag bitmask, the property is typed plain **Long** in this release rather than as a typed enum. The bit values follow the Win32 documented constants --- `SERVICE_ACCEPT_STOP` (1), `SERVICE_ACCEPT_PAUSE_CONTINUE` (2), `SERVICE_ACCEPT_SHUTDOWN` (4), `SERVICE_ACCEPT_PARAMCHANGE` (8), `SERVICE_ACCEPT_NETBINDCHANGE` (16), `SERVICE_ACCEPT_HARDWAREPROFILECHANGE` (32), `SERVICE_ACCEPT_POWEREVENT` (64), `SERVICE_ACCEPT_SESSIONCHANGE` (128), `SERVICE_ACCEPT_PRESHUTDOWN` (256), and so on.

### CurrentState
{: .no_toc }

The SCM-reported `dwCurrentState` value. **Long**.

> [!NOTE]
> The property is typed plain **Long** in this release rather than as [**ServiceStatusConstants**](Enumerations/ServiceStatusConstants). The numeric values *do* match the enum (e.g. `4` is [**vbServiceStatusRunning**](Enumerations/ServiceStatusConstants#vbServiceStatusRunning)), so a cast such as `CType(state.CurrentState, ServiceStatusConstants)` recovers typed access if needed. For display purposes [**CurrentStateText**](#currentstatetext) is usually more convenient.

### CurrentStateText
{: .no_toc }

A human-readable rendering of [**CurrentState**](#currentstate). **String**.

The mapping:

| State value | Text |
|-------------|------|
| [**vbServiceStatusContinuePending**](Enumerations/ServiceStatusConstants#vbServiceStatusContinuePending) | `CONTINUING` |
| [**vbServiceStatusPausePending**](Enumerations/ServiceStatusConstants#vbServiceStatusPausePending)       | `PAUSING` |
| [**vbServiceStatusPaused**](Enumerations/ServiceStatusConstants#vbServiceStatusPaused)                   | `PAUSED` |
| [**vbServiceStatusRunning**](Enumerations/ServiceStatusConstants#vbServiceStatusRunning)                 | `RUNNING` |
| [**vbServiceStatusStartPending**](Enumerations/ServiceStatusConstants#vbServiceStatusStartPending)       | `STARTING` |
| [**vbServiceStatusStopPending**](Enumerations/ServiceStatusConstants#vbServiceStatusStopPending)         | `STOPPING` |
| [**vbServiceStatusStopped**](Enumerations/ServiceStatusConstants#vbServiceStatusStopped)                 | `STOPPED` |

Any unrecognised state value is rendered as `UNKNOWN STATE (<n>)`.

### ExitCode
{: .no_toc }

The Win32 exit code the service reported when it last stopped. **Long**. Read-only.

Syntax: *state*.**ExitCode**

*state*
: *required* An object expression that evaluates to a **ServiceState** instance, obtained from [**Services.QueryStateOfService**](Services#querystateofservice).

Returns the `dwWin32ExitCode` field from the `SERVICE_STATUS_PROCESS` structure the SCM fills in. For a service that stopped normally this is **0** (`NO_ERROR`). For a service that stopped due to an error, this is either a standard Win32 error code or the sentinel value `ERROR_SERVICE_SPECIFIC_ERROR` (1066) --- in which case the real vendor-defined code is in [**ServiceSpecificExitCode**](#servicespecificexitcode).

While the service is in any state other than [**Stopped**](Enumerations/ServiceStatusConstants#vbServiceStatusStopped) the SCM keeps this field at **0**. The value becomes meaningful only after the service thread exits and the SCM records the terminal status.

### Flags
{: .no_toc }

The SCM-reported `dwServiceFlags` value. **Long**.

Only one bit is currently documented --- `SERVICE_RUNS_IN_SYSTEM_PROCESS` (1), set when the service is hosted inside the system process (`services.exe`).

### ProcessId
{: .no_toc }

The OS process ID hosting the service, or **0** if the service is not running. **Long**.

Syntax: *object*.**ProcessId**

*object*
: *required* An object expression that evaluates to a **ServiceState** instance, obtained from [**Services.QueryStateOfService**](Services#querystateofservice).

The value is the Win32 process identifier (`dwProcessId`) as reported by `QueryServiceStatusEx`. When the service is in the [**Stopped**](Enumerations/ServiceStatusConstants#vbServiceStatusStopped) state the SCM reports **0**, as there is no live process. For a service in [**Running**](Enumerations/ServiceStatusConstants#vbServiceStatusRunning) state the value matches the PID shown in Task Manager or returned by `tasklist /svc`.

Use **ProcessId** as a quick "is the service alive?" check in preference to string-comparing [**CurrentStateText**](#currentstatetext):

```tb
Dim state As ServiceState
Set state = Services.QueryStateOfService("MyService")
If state.ProcessId <> 0 Then
    Debug.Print "Service is alive; PID " & state.ProcessId
Else
    Debug.Print "Service is not running"
End If
```

### ServiceSpecificExitCode
{: .no_toc }

The SCM-reported `dwServiceSpecificExitCode` value. **Long**.

Meaningful only when [**ExitCode**](#exitcode) equals `ERROR_SERVICE_SPECIFIC_ERROR` (1066); otherwise the field is **0** and should be ignored. Services that report custom error codes through [**ServiceManager.ReportStatus**](ServiceManager#reportstatus) populate this field through the package's machinery.

### Type
{: .no_toc }

The SCM-reported service type. [**ServiceTypeConstants**](Enumerations/ServiceTypeConstants). Read-only.

Syntax: *state*.**Type**

*state*
: *required* An object expression that evaluates to a **ServiceState** instance, obtained from [**Services.QueryStateOfService**](Services#querystateofservice).

Returns the [**ServiceTypeConstants**](Enumerations/ServiceTypeConstants) value the SCM has on file for the service. For twinBASIC services this is typically one of:

- [**tbServiceTypeOwnProcess**](Enumerations/ServiceTypeConstants#tbServiceTypeOwnProcess) -- the service runs in its own dedicated process.
- [**tbServiceTypeShareProcess**](Enumerations/ServiceTypeConstants#tbServiceTypeShareProcess) -- the service shares its host process with one or more other services from the same EXE.

The value is read directly from the `dwServiceType` field of the `SERVICE_STATUS_PROCESS` structure returned by `QueryServiceStatusEx`. It reflects whatever was registered in the SCM at install time via [**ServiceManager.Type**](ServiceManager#type).

### WaitHint
{: .no_toc }

The estimated upper bound, in milliseconds, of the time the current pending state transition will take. **Long**. Read-only.

Syntax: *object*.**WaitHint**

*object*
: *required* An object expression that evaluates to a **ServiceState** instance, obtained from [**Services.QueryStateOfService**](Services#querystateofservice).

Returns the `dwWaitHint` field from the `SERVICE_STATUS_PROCESS` structure the SCM fills in. The value is the estimate the service last reported through `SetServiceStatus` when it entered the current pending state. It is only meaningful while the service is in a *Pending* state ([**StartPending**](Enumerations/ServiceStatusConstants#vbServiceStatusStartPending), [**StopPending**](Enumerations/ServiceStatusConstants#vbServiceStatusStopPending), [**PausePending**](Enumerations/ServiceStatusConstants#vbServiceStatusPausePending), [**ContinuePending**](Enumerations/ServiceStatusConstants#vbServiceStatusContinuePending)). For services in [**Running**](Enumerations/ServiceStatusConstants#vbServiceStatusRunning) or [**Stopped**](Enumerations/ServiceStatusConstants#vbServiceStatusStopped) states the field is **0** or the last value set before the transition completed and should not be interpreted.

The SCM uses [**CheckPoint**](#checkpoint) and **WaitHint** together to decide whether a pending service is making progress. If the [**CheckPoint**](#checkpoint) value has not increased within the **WaitHint** interval, the SCM considers the service hung and may report an error. A service that expects a long pending phase should either set **WaitHint** large enough to cover the whole transition, or increment [**CheckPoint**](#checkpoint) at regular sub-intervals to signal continued progress.

### Example

This example reads the wait hint and check point for a service currently in a pending state and prints a progress summary.

```tb
Dim state As ServiceState
Set state = Services.QueryStateOfService("MyService")

If state.CurrentStateText = "STARTING" Or state.CurrentStateText = "STOPPING" Then
    Debug.Print "Pending -- checkpoint: " & state.CheckPoint & _
                ", max wait: " & state.WaitHint & " ms"
End If
```

## See Also

- [WinServicesLib package](.) -- overview, lifecycle
- [Services.QueryStateOfService method](Services#querystateofservice) -- constructs a **ServiceState** from the predeclared coordinator
- [CheckPoint property](#checkpoint) -- the progress counter the SCM reads alongside **WaitHint**
- [ServiceStatusConstants enum](Enumerations/ServiceStatusConstants) -- the values **CurrentState** can take
- [ServiceTypeConstants enum](Enumerations/ServiceTypeConstants) -- the values **Type** can take
