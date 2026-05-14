---
title: ITbService
parent: WinServicesLib Package
permalink: /tB/Packages/WinServicesLib/ITbService
has_toc: false
---

# ITbService interface
{: .no_toc }

The contract every service class in a **WinServicesLib** project implements. Three subs, each invoked at a specific point in the service's lifecycle:

- [**EntryPoint**](#entrypoint) — runs the service's actual work.
- [**StartupFailed**](#startupfailed) — invoked when the SCM handshake fails before [**EntryPoint**](#entrypoint) can run.
- [**ChangeState**](#changestate) — invoked when the SCM delivers a control code (*Stop*, *Pause*, *Continue*, …).

The package's [**ServiceCreator**](ServiceCreator)`(Of T)` factory creates one instance per service start; the dispatcher trampoline holds the instance for the lifetime of the service and routes the three lifecycle subs to it.

```tb
[COMCreatable(False)]
Class MyService
    Implements ITbService

    Public IsStopping As Boolean

    Sub EntryPoint(ByVal ServiceManager As ServiceManager) _
            Implements ITbService.EntryPoint
        ServiceManager.ReportStatus vbServiceStatusRunning
        Do Until IsStopping
            ' ...do work, then yield with WaitForSingleObject / Sleep / etc.
        Loop
        ServiceManager.ReportStatus vbServiceStatusStopped
    End Sub

    Sub ChangeState(ByVal ServiceManager As ServiceManager, _
                    ByVal dwControl As ServiceControlCodeConstants, _
                    ByVal dwEventType As Long, _
                    ByVal lpEventData As LongPtr) _
            Implements ITbService.ChangeState
        Select Case dwControl
            Case vbServiceControlStop, vbServiceControlShutdown
                ServiceManager.ReportStatus vbServiceStatusStopPending
                IsStopping = True
        End Select
    End Sub

    Sub StartupFailed(ByVal ServiceManager As ServiceManager) _
            Implements ITbService.StartupFailed
        ' …optional failure-reporting hook
    End Sub
End Class
```

> [!IMPORTANT]
> [**EntryPoint**](#entrypoint) runs on the **service thread**. [**ChangeState**](#changestate) runs on the **dispatcher thread** (the EXE's main thread). The two methods execute concurrently and must coordinate through shared `Public` flags on the class — see [The two-thread split](.#two-thread-split) on the package overview.

* TOC
{:toc}

## Methods

### ChangeState
{: .no_toc }

Invoked by the SCM dispatcher thread when a control code is delivered to the service.

Syntax: *service*.**ChangeState** *ServiceManager*, *dwControl*, *dwEventType*, *lpEventData*

*ServiceManager*
: The [**ServiceManager**](ServiceManager) for this service — the same instance passed to [**EntryPoint**](#entrypoint). Use it to call [**ReportStatus**](ServiceManager#reportstatus) acknowledging the pending transition.

*dwControl*
: A [**ServiceControlCodeConstants**](Enumerations/ServiceControlCodeConstants) value identifying the control. Standard codes the SCM may deliver include [**vbServiceControlStop**](Enumerations/ServiceControlCodeConstants#vbServiceControlStop), [**vbServiceControlShutdown**](Enumerations/ServiceControlCodeConstants#vbServiceControlShutdown), [**vbServiceControlPause**](Enumerations/ServiceControlCodeConstants#vbServiceControlPause), [**vbServiceControlContinue**](Enumerations/ServiceControlCodeConstants#vbServiceControlContinue), [**vbServiceControlInterrogate**](Enumerations/ServiceControlCodeConstants#vbServiceControlInterrogate), and the event-bearing codes ([**vbServiceControlSessionChange**](Enumerations/ServiceControlCodeConstants#vbServiceControlSessionChange), [**vbServiceControlPowerEvent**](Enumerations/ServiceControlCodeConstants#vbServiceControlPowerEvent), [**vbServiceControlDeviceEvent**](Enumerations/ServiceControlCodeConstants#vbServiceControlDeviceEvent), [**vbServiceControlHardwareProfileChange**](Enumerations/ServiceControlCodeConstants#vbServiceControlHardwareProfileChange)). User-defined codes in the range 128–255 can also be delivered through [**Services.ControlService**](Services#controlservice).

*dwEventType*
: A **Long** holding the event-type sub-code for the codes that have one. **0** otherwise. See Microsoft's `HandlerEx` documentation for the per-code interpretation.

*lpEventData*
: A **LongPtr** to an event-specific data structure for the codes that have one. `vbNullPtr` otherwise.

The typical pattern is a `Select Case dwControl` that handles the codes the service cares about and ignores the rest. The minimum a service needs to handle is *Stop*:

```tb
Select Case dwControl
    Case vbServiceControlStop, vbServiceControlShutdown
        ServiceManager.ReportStatus vbServiceStatusStopPending
        IsStopping = True       ' signal the service thread
End Select
```

[**ChangeState**](#changestate) **does not stop** [**EntryPoint**](#entrypoint) — it only delivers the SCM's request. The user's code is responsible for the actual shutdown logic, typically by setting a shared `Public` flag the service thread polls (`IsStopping`) or by calling a signal method on a blocking primitive that [**EntryPoint**](#entrypoint) owns (`NamedPipeServer.ManualMessageLoopLeave`, `SetEvent` on a Win32 event handle, ...).

The method runs on a different thread than [**EntryPoint**](#entrypoint); see [The two-thread split](.#two-thread-split) for the coordination rules.

### EntryPoint
{: .no_toc }

The service's main routine. Invoked by the package's dispatcher trampoline on the SCM-spawned service thread once the SCM handshake has completed and the trampoline has reported [**vbServiceStatusStartPending**](Enumerations/ServiceStatusConstants#vbServiceStatusStartPending).

Syntax: *service*.**EntryPoint** *ServiceManager*

*ServiceManager*
: The [**ServiceManager**](ServiceManager) for this service. Contains the configuration that was set during `Sub Main` plus the runtime [**LaunchArgs**](ServiceManager#launchargs) the SCM passed in. Use it to call [**ReportStatus**](ServiceManager#reportstatus) on every state transition.

The body of **EntryPoint** is the service's actual work. The minimum responsibilities:

1. Optionally validate startup conditions (typically by inspecting [**LaunchArgs**](ServiceManager#launchargs)). Failure paths should call `ServiceManager.ReportStatus vbServiceStatusStopped, <ExitCode>` and `Exit Sub`.
2. Call `ServiceManager.ReportStatus vbServiceStatusRunning` once steady-state is reached.
3. Run the service's long-running loop. The loop typically blocks on something (a `WaitForSingleObject` on a manual-reset event, a `NamedPipeServer.ManualMessageLoopEnter`, a custom message loop, ...) and breaks out when [**ChangeState**](#changestate) signals shutdown through a shared flag.
4. Call `ServiceManager.ReportStatus vbServiceStatusStopped` before returning.

After the **EntryPoint** sub returns, the service thread exits and the SCM marks the service as stopped.

> [!IMPORTANT]
> **EntryPoint** runs on the **service thread**, not the dispatcher thread. The two threads execute concurrently for the lifetime of the service. Use shared `Public` flags on the implementing class (`IsStopping`, `IsPaused`, …) to coordinate state changes triggered from [**ChangeState**](#changestate).

### StartupFailed
{: .no_toc }

Invoked when the SCM handshake fails before [**EntryPoint**](#entrypoint) can run.

Syntax: *service*.**StartupFailed** *ServiceManager*

*ServiceManager*
: The [**ServiceManager**](ServiceManager) for this service.

This sub fires when `RegisterServiceCtrlHandlerExW` returns a zero handle — typically because the service was launched outside the SCM context, or the SCM's `RegisterServiceCtrlHandlerExW` rejected the registration. The service has no SCM status handle in this state, so [**ServiceManager.ReportStatus**](ServiceManager#reportstatus) cannot be called from inside **StartupFailed** — calling it raises run-time error 5.

The typical implementation is a logging-only hook so the failure is recorded somewhere a developer can find it later:

```tb
Sub StartupFailed(ByVal ServiceManager As ServiceManager) _
        Implements ITbService.StartupFailed
    LogFailure service_startup_failed, status_changed, CurrentComponentName
End Sub
```

If there is no useful failure-reporting hook to add, an empty implementation is fine — the SCM has already abandoned the start attempt at this point and no recovery is possible.

## See Also

- [WinServicesLib package](.) -- overview, lifecycle, [the two-thread split](.#two-thread-split)
- [ServiceManager class](ServiceManager) -- the per-service object passed into every method
- [ServiceCreator(Of T) class](ServiceCreator) -- the factory that creates an **ITbService** instance for each service start
- [ServiceControlCodeConstants enum](Enumerations/ServiceControlCodeConstants) -- the values **ChangeState** dispatches on
- [ServiceStatusConstants enum](Enumerations/ServiceStatusConstants) -- the values **EntryPoint** reports through [**ServiceManager.ReportStatus**](ServiceManager#reportstatus)
