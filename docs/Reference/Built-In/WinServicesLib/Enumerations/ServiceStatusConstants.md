---
title: ServiceStatusConstants
parent: Enumerations
grand_parent: WinServicesLib Package
permalink: /tB/Packages/WinServicesLib/Enumerations/ServiceStatusConstants
---
# ServiceStatusConstants
{: .no_toc }

The runtime-state values a service reports to the SCM through [**ServiceManager.ReportStatus**](../ServiceManager#reportstatus). The same numeric values are returned by [**ServiceState.CurrentState**](../ServiceState#currentstate) (typed as a plain **Long**) and rendered as text by [**ServiceState.CurrentStateText**](../ServiceState#currentstatetext).

The values mirror the Win32 `SERVICE_*` state constants. The `vb` prefix is a historical hold-over from VB6's coding conventions.

| Constant | Value | Description |
|----------|-------|-------------|
| **vbServiceStatusStopped**{: #vbServiceStatusStopped }                   | 1 | The service is not running. Set by the service immediately before [**EntryPoint**](../ITbService#entrypoint) returns; also the initial state the SCM stores when the service is registered. |
| **vbServiceStatusStartPending**{: #vbServiceStatusStartPending }         | 2 | The service is starting up. Set by the package's dispatcher trampoline before it calls [**EntryPoint**](../ITbService#entrypoint); services with long start-up sequences should also re-report this state periodically together with a `WaitHint` so the SCM does not declare the service hung. |
| **vbServiceStatusStopPending**{: #vbServiceStatusStopPending }           | 3 | The service has acknowledged a stop request and is shutting down. Typically reported from [**ChangeState**](../ITbService#changestate) immediately on receipt of [**vbServiceControlStop**](ServiceControlCodeConstants#vbServiceControlStop). |
| **vbServiceStatusRunning**{: #vbServiceStatusRunning }                   | 4 | The service has reached steady state. Reported from [**EntryPoint**](../ITbService#entrypoint) once initialisation is complete; this is what `services.msc` shows as "Running". |
| **vbServiceStatusContinuePending**{: #vbServiceStatusContinuePending }   | 5 | The service has acknowledged a continue request and is resuming. Reported from [**ChangeState**](../ITbService#changestate) on [**vbServiceControlContinue**](ServiceControlCodeConstants#vbServiceControlContinue). |
| **vbServiceStatusPausePending**{: #vbServiceStatusPausePending }         | 6 | The service has acknowledged a pause request. Reported from [**ChangeState**](../ITbService#changestate) on [**vbServiceControlPause**](ServiceControlCodeConstants#vbServiceControlPause). |
| **vbServiceStatusPaused**{: #vbServiceStatusPaused }                     | 7 | The service has reached the paused state. Reported from [**EntryPoint**](../ITbService#entrypoint) once the pause loop is active. |

The typical state sequence for a simple service: [**vbServiceStatusStartPending**](#vbServiceStatusStartPending) (package) → [**vbServiceStatusRunning**](#vbServiceStatusRunning) (from [**EntryPoint**](../ITbService#entrypoint)) → [**vbServiceStatusStopPending**](#vbServiceStatusStopPending) (from [**ChangeState**](../ITbService#changestate)) → [**vbServiceStatusStopped**](#vbServiceStatusStopped) (from [**EntryPoint**](../ITbService#entrypoint), before returning).
