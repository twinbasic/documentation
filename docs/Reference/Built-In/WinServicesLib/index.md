---
title: WinServicesLib Package
parent: Built-In Packages
nav_order: 10
permalink: /tB/Packages/WinServicesLib/
has_toc: false
indexed_from: beta-x-0983
exclude_from_docs:
  - ServicesConstantsPublic
---

# WinServicesLib Package
{: .no_toc }

The **WinServicesLib** built-in package wraps the Windows Service Control Manager so a twinBASIC EXE can run as one or more Windows services. The same EXE typically does double duty as the install / control-panel tool when launched normally and as the service host when launched by the SCM; both modes coexist in a single `Sub Main`. The package handles the SCM handshake, the service-thread dispatch, the control-code routing, and the install / uninstall registry plumbing.

The package is a built-in package shipped with twinBASIC. Add it through Project → References (**Ctrl-T**) → Available Packages.

* TOC
{:toc}

## What a Windows service is

A *Windows service* is a long-running background process supervised by the **Service Control Manager (SCM)**. Services can start before any user logs in, run under dedicated accounts (`LocalSystem`, `LocalService`, `NetworkService`, or any explicit user), and respond to lifecycle commands --- *Start*, *Stop*, *Pause*, *Continue* --- issued from the Services control-panel applet (`services.msc`), the `sc.exe` command-line tool, or programmatic equivalents.

A service-hosting EXE communicates with the SCM through a small set of Win32 entry points: `StartServiceCtrlDispatcherW` to hand the process over to the SCM, `RegisterServiceCtrlHandlerExW` to hook a control-code callback, `SetServiceStatus` to report state transitions, and `CreateServiceW` / `DeleteService` to register / unregister the service in the system database. **WinServicesLib** wraps all of these --- the consumer writes one class per service, declares it through the package's coordinator, and the package handles every Win32 detail.

## Lifecycle

A service-hosting EXE goes through four phases:

1. **Configure** --- at startup, declare every service the EXE knows how to host by calling [**Services.ConfigureNew**](Services#configurenew) and filling the returned [**ServiceManager**](ServiceManager). Configuration is purely in-memory and does not touch the SCM; it builds the map the dispatcher will use *if* the EXE is launched as a service host.
2. **Install** (one-time, elevated) --- register the configured services in the system database via [**ServiceManager.Install**](ServiceManager#install) or [**Services.InstallAll**](Services#installall). This writes registry entries under `HKLM\SYSTEM\CurrentControlSet\Services\<Name>` pointing at the EXE and requires administrator rights. Usually run from an installer.
3. **Run as a service** (when the SCM launches the EXE) --- the EXE's `Sub Main` detects it was launched as a service host (typically by inspecting `Command` for a known argument like `"-startService"`) and calls [**Services.RunServiceDispatcher**](Services#runservicedispatcher). This blocks the main thread inside `StartServiceCtrlDispatcherW` until the SCM signals shutdown. The SCM spawns a separate service thread per service and calls into the package's dispatcher trampoline; the trampoline reports `StartPending`, then invokes the user's [**ITbService.EntryPoint**](ITbService#entrypoint) on the service thread.
4. **Run normally** (when a user launches the EXE) --- the EXE's `Sub Main` does *not* see the service-host argument and proceeds to whatever UI / CLI logic the EXE provides for installation, status display, or interactive testing. The same configured [**ServiceManager**](ServiceManager) instances are still reachable through [**Services.GetConfiguredService**](Services#getconfiguredservice) and the [**For Each**](Services#_newenum) enumerator, which is what enables a single-EXE install-and-host design.

The canonical `Sub Main` skeleton:

```tb
Module Startup
    Public Sub Main()
        With Services.ConfigureNew
            .Name             = "MyService"
            .Description      = "An example twinBASIC service"
            .Type             = tbServiceTypeOwnProcess
            .InstallStartMode = tbServiceStartOnDemand
            .InstallCmdLine   = """" & App.ModulePath & """ -startService"
            .InstanceCreator  = New ServiceCreator(Of MyService)
        End With

        If InStr(Command, "-startService") > 0 Then
            Services.RunServiceDispatcher       ' blocks until the SCM signals shutdown
        Else
            MainForm.Show                       ' control-panel / install UI
        End If
    End Sub
End Module
```

The `-startService` discriminator is the conventional way for the EXE to know which mode it is in. The `InstallCmdLine` field embeds this argument so the SCM passes it back when launching the service; the user-launched path sees no such argument and falls through to the UI branch.

## The two-thread split
{: #two-thread-split }

When the SCM launches the EXE as a service host, twinBASIC's runtime runs **two threads** for each service:

- The **service thread** --- the SCM-spawned thread that runs the user's [**ITbService.EntryPoint**](ITbService#entrypoint). This is where the service does its actual work. The thread is created by `StartServiceCtrlDispatcherW`'s machinery; it is *not* the main thread of the EXE.
- The **dispatcher thread** --- the EXE's main thread, which is what the SCM invokes when it has a control code to deliver (*Stop*, *Pause*, *Continue*, …). The package routes the control through `RegisterServiceCtrlHandlerExW` to a trampoline that calls the user's [**ITbService.ChangeState**](ITbService#changestate).

The two methods therefore run *concurrently*: while [**EntryPoint**](ITbService#entrypoint) is doing the service's work on the service thread, [**ChangeState**](ITbService#changestate) waits idle on the dispatcher thread, and the SCM wakes it on demand to deliver a control code. The two methods must coordinate through shared `Public` flags on the service class --- `IsStopping`, `IsPaused`, and similar --- because the package cannot stop the service thread except through the user's own code path.

```tb
Class MyService
    Implements ITbService

    Public IsStopping As Boolean

    Sub EntryPoint(ByVal ServiceManager As ServiceManager) _
            Implements ITbService.EntryPoint
        ServiceManager.ReportStatus vbServiceStatusRunning
        Do Until IsStopping
            ' …do work, then yield with WaitForSingleObject / Sleep / etc.
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
                IsStopping = True       ' wakes EntryPoint's loop on the other thread
        End Select
    End Sub

    Sub StartupFailed(ByVal ServiceManager As ServiceManager) _
            Implements ITbService.StartupFailed
        ' …optional failure-reporting hook
    End Sub
End Class
```

The shared-flag pattern is the documented coordination mechanism --- there is no built-in cancellation primitive. For services that host an inherently message-loop-driven object (a [**NamedPipeServer**](../WinNamedPipesLib/NamedPipeServer), a window-message handler, …) that object's own *Stop*-signal method is usually called from [**ChangeState**](ITbService#changestate); see [the WinNamedPipesLib service-host idiom](../WinNamedPipesLib/#service-host-idiom) for a worked example.

## Integration with the sister "winlibs" packages

`WinServicesLib` is most often used together with [**WinEventLogLib**](../WinEventLogLib/) and [**WinNamedPipesLib**](../WinNamedPipesLib/) --- Windows services typically need a place to write diagnostic events (the Windows Event Log) and a way to communicate with non-service processes (named pipes). The three packages integrate well:

- **Logging** --- every service class can mix in the [**EventLog**](../WinEventLogLib/EventLog) members through the [composition-delegation idiom](../WinEventLogLib/#composition-delegation-idiom) (`Implements EventLog(Of EVENTS, CATEGORIES) Via EventLog = New EventLog(...)`), so [**LogSuccess**](../WinEventLogLib/EventLog#logsuccess) / [**LogFailure**](../WinEventLogLib/EventLog#logfailure) read as plain method calls inside `EntryPoint` and `ChangeState`. The events fire under the service account (typically `LocalSystem`), which the Event Viewer renders against the message-table resource embedded in the EXE.
- **IPC** --- a [**NamedPipeServer**](../WinNamedPipesLib/NamedPipeServer) hosted inside the service uses [**ManualMessageLoopEnter**](../WinNamedPipesLib/NamedPipeServer#manualmessageloopenter) as the [**EntryPoint**](ITbService#entrypoint)'s blocking primitive, and [**ManualMessageLoopLeave**](../WinNamedPipesLib/NamedPipeServer#manualmessageloopleave) from [**ChangeState**](ITbService#changestate) becomes the *Stop*-signal mechanism. See [Hosting inside a Windows service](../WinNamedPipesLib/#service-host-idiom) for the complete pattern, including pause / continue and the dispatcher-thread / service-thread interaction.

## Installation and elevation

[**Install**](ServiceManager#install) and [**Uninstall**](ServiceManager#uninstall) (and their bulk-helpers [**Services.InstallAll**](Services#installall) / [**Services.UninstallAll**](Services#uninstallall)) call `CreateServiceW` / `DeleteService`, which require an SCM handle opened with `SC_MANAGER_CREATE_SERVICE`. Both succeed only when the calling process runs with **administrator rights**. The typical project structure:

- A standalone installer EXE (or installer mode inside the same EXE, gated by a `-install` command-line argument) runs elevated and calls [**Install**](ServiceManager#install) / [**Uninstall**](ServiceManager#uninstall) plus a one-time call to [**EventLog.Register**](../WinEventLogLib/EventLog#register).
- The service-host EXE itself does not need elevation at run-time (the SCM launches it under whatever account the service is configured for).
- The control-panel / interactive UI does not need elevation either --- it can use [**Services.LaunchService**](Services#launchservice) and [**Services.ControlService**](Services#controlservice) freely, as long as the user has the standard *Start* / *Stop* permissions on the relevant service (the default ACL grants this to **LocalSystem**, **Administrators**, and the running interactive user for *interactive* services).

Calling [**Install**](ServiceManager#install) while running inside the twinBASIC IDE will fail with an SCM-access error --- the IDE is rarely elevated. Either run the compiled EXE as administrator, or wrap the call in an `If App.IsInIDE() Then Err.Raise 5, , "Run the compiled EXE as administrator."` guard.

## Classes and interface

- [ITbService](ITbService) -- the interface every service class implements: [**EntryPoint**](ITbService#entrypoint), [**StartupFailed**](ITbService#startupfailed), [**ChangeState**](ITbService#changestate)
  - [ChangeState](ITbService#changestate) -- invoked on the dispatcher thread when the SCM delivers a control code (*Stop*, *Pause*, *Continue*, ...)
  - [EntryPoint](ITbService#entrypoint) -- the service's main routine, invoked on the SCM-spawned service thread once the SCM handshake has completed
  - [StartupFailed](ITbService#startupfailed) -- invoked when the SCM handshake fails before **EntryPoint** can run
- [ServiceCreator](ServiceCreator) -- the generic [**ServiceCreator**](ServiceCreator)`(Of T)` factory the dispatcher uses to instantiate each service class on demand; *T* must implement [**ITbService**](ITbService)
  - [CreateInstance](ServiceCreator#createinstance) -- returns a fresh `New T` cast as [**ITbService**](ITbService) for use by the dispatcher trampoline
- [ServiceManager](ServiceManager) -- one per configured service; holds the fields the SCM cares about (name, description, type, start-mode, command-line, dependencies, ...) plus the [**ReportStatus**](ServiceManager#reportstatus) call the service uses to inform the SCM of state transitions
  - [AutoInitializeCOM](ServiceManager#autoinitializecom) -- controls whether COM is initialized in STA mode on the service thread before **EntryPoint** is called; default **True**
  - [DependentServices](ServiceManager#dependentservices) -- list of service names the SCM must auto-start before starting this service
  - [Description](ServiceManager#description) -- human-readable description text displayed in `services.msc` and `sc.exe query`
  - [Install](ServiceManager#install) -- registers this service in the SCM database; requires administrator rights
  - [InstallStartMode](ServiceManager#installstartmode) -- the SCM start mode (*OnDemand*, *Auto*, *Disabled*, ...) the service is registered with
  - [InstanceCreator](ServiceManager#instancecreator) -- the [**ServiceCreator(Of T)**](ServiceCreator) factory the dispatcher calls to create the **ITbService** instance at service start
  - [Name](ServiceManager#name) -- the service's unique name in the SCM database, used by `services.msc` and `sc.exe`
  - [New](ServiceManager#new) -- initializes a new **ServiceManager** with default configuration values
  - [ReportStatus](ServiceManager#reportstatus) -- informs the SCM of the service's current state; called from inside **EntryPoint** and **ChangeState**
  - [ResyncStatus](ServiceManager#resyncstatus) -- re-applies the cached `SERVICE_STATUS` to the SCM via `SetServiceStatus`
  - [SERVICE_TABLE_ENTRYW](ServiceManager#service_table_entryw) -- internal Win32 UDT pairing a service name with its entry-point address; used by **RunServiceDispatcher**
  - [ServiceEntryPoint](ServiceManager#serviceentrypoint) -- the SCM-invoked entry point that runs on the service thread; called by the package's dispatcher trampoline, not by user code
  - [SupportsPausing](ServiceManager#supportspausing) -- whether the service advertises acceptance of *Pause* / *Continue* control codes to the SCM; default **False**
  - [Type](ServiceManager#type) -- the Win32 service type (*OwnProcess*, *ShareProcess*, ...); default **tbServiceTypeOwnProcess**
  - [Uninstall](ServiceManager#uninstall) -- removes this service from the SCM database; requires administrator rights
- [Services](Services) -- the predeclared singleton coordinator: [**ConfigureNew**](Services#configurenew), [**RunServiceDispatcher**](Services#runservicedispatcher), the bulk install / uninstall helpers, plus the runtime control methods ([**LaunchService**](Services#launchservice), [**ControlService**](Services#controlservice), [**QueryStateOfService**](Services#querystateofservice))
  - [_NewEnum](Services#_newenum) -- `For Each` enumerator across every configured [**ServiceManager**](ServiceManager) in insertion order
  - [ConfigureNew](Services#configurenew) -- allocates a fresh **ServiceManager**, registers it internally, and returns it for the caller to populate
  - [ControlService](Services#controlservice) -- sends an SCM control code (*Stop*, *Pause*, *Continue*, ...) to a running service by name
  - [GetConfiguredService](Services#getconfiguredservice) -- looks up a previously-configured **ServiceManager** by its **Name**
  - [InstallAll](Services#installall) -- calls **Install** on every configured **ServiceManager**; requires administrator rights
  - [LaunchService](Services#launchservice) -- starts an installed service by name and optionally forwards launch arguments to **ServiceManager.LaunchArgs**
  - [QueryStateOfService](Services#querystateofservice) -- returns a fresh **ServiceState** snapshot of an installed service
  - [UninstallAll](Services#uninstallall) -- calls **Uninstall** on every configured **ServiceManager**; requires administrator rights
- [ServiceState](ServiceState) -- a read-only state snapshot returned by [**Services.QueryStateOfService**](Services#querystateofservice), giving the SCM-reported state and process ID of an installed service
  - [CheckPoint](ServiceState#checkpoint) -- the SCM-reported `dwCheckPoint` progress counter; auto-incremented by the package while the service is in a pending state
  - [CurrentStateText](ServiceState#currentstatetext) -- human-readable rendering of **CurrentState** (e.g. `RUNNING`, `STOPPING`, `STOPPED`)
  - [ExitCode](ServiceState#exitcode) -- the Win32 exit code the service reported when it last stopped
  - [Flags](ServiceState#flags) -- the SCM-reported `dwServiceFlags` bitmask (e.g. `SERVICE_RUNS_IN_SYSTEM_PROCESS`)
  - [New](ServiceState#new) -- initializes a **ServiceState** by querying the SCM for the named service's current status
  - [ProcessId](ServiceState#processid) -- the OS process ID hosting the service, or **0** if not running
  - [ServiceSpecificExitCode](ServiceState#servicespecificexitcode) -- vendor-defined exit code, meaningful only when **ExitCode** equals `ERROR_SERVICE_SPECIFIC_ERROR` (1066)
  - [Type](ServiceState#type) -- the SCM-reported service type as a [**ServiceTypeConstants**](Enumerations/ServiceTypeConstants) value
  - [WaitHint](ServiceState#waithint) -- estimated upper-bound milliseconds for the current pending state transition, as last reported by the service

## Enumerations

- [Enumerations](Enumerations/) -- four user-facing enumerations: [**ServiceTypeConstants**](Enumerations/ServiceTypeConstants), [**ServiceStartConstants**](Enumerations/ServiceStartConstants), [**ServiceControlCodeConstants**](Enumerations/ServiceControlCodeConstants), [**ServiceStatusConstants**](Enumerations/ServiceStatusConstants)
