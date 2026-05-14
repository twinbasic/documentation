---
title: Services
parent: WinServicesLib Package
permalink: /tB/Packages/WinServicesLib/Services
has_toc: false
---

# Services class
{: .no_toc }

The predeclared singleton coordinator for the **WinServicesLib** package. Every interaction with the package starts with **Services**: the class is tagged `[PredeclaredId]`, so a project-wide instance named `Services` exists at start-up and the consumer calls `Services.X` directly without `New`. The instance also doubles as an enumerable collection of the [**ServiceManager**](ServiceManager) instances that have been configured (`For Each manager In Services`).

```tb
' Configure two services at start-up:
With Services.ConfigureNew
    .Name             = "MyServiceA"
    .InstanceCreator  = New ServiceCreator(Of MyServiceA)
End With
With Services.ConfigureNew
    .Name             = "MyServiceB"
    .InstanceCreator  = New ServiceCreator(Of MyServiceB)
End With

' Run the dispatcher if launched as a service host:
If InStr(Command, "-startService") > 0 Then Services.RunServiceDispatcher
```

See the package [overview](.) for the broader lifecycle, the [**two-thread split**](.#two-thread-split), and the elevation rules around installation.

* TOC
{:toc}

## Methods

### ConfigureNew
{: .no_toc }

Allocates a fresh [**ServiceManager**](ServiceManager), adds it to the internal collection, and returns it for the caller to populate. Typically used during `Sub Main` to declare every service the EXE knows how to host.

Syntax: **Services.ConfigureNew** **As** [**ServiceManager**](ServiceManager)

```tb
With Services.ConfigureNew
    .Name             = "MyService"
    .Description      = "An example twinBASIC service"
    .Type             = tbServiceTypeOwnProcess
    .InstallStartMode = tbServiceStartOnDemand
    .InstallCmdLine   = """" & App.ModulePath & """ -startService"
    .InstanceCreator  = New ServiceCreator(Of MyService)
End With
```

Configuration is purely in-memory; **ConfigureNew** does not touch the SCM. The configured services are available via the [**For Each**](#_newenum) enumerator, [**GetConfiguredService**](#getconfiguredservice), and the bulk [**Install**](#installall) / [**Uninstall**](#uninstallall) / [**RunServiceDispatcher**](#runservicedispatcher) helpers.

### ControlService
{: .no_toc }

Sends an SCM control code to a running service.

Syntax: **Services.ControlService** *ServiceName*, *ControlCode*

*ServiceName*
: *required* A **String** naming an installed service.

*ControlCode*
: *required* A [**ServiceControlCodeConstants**](Enumerations/ServiceControlCodeConstants) value — typically [**vbServiceControlStop**](Enumerations/ServiceControlCodeConstants#vbServiceControlStop), [**vbServiceControlPause**](Enumerations/ServiceControlCodeConstants#vbServiceControlPause), [**vbServiceControlContinue**](Enumerations/ServiceControlCodeConstants#vbServiceControlContinue), or [**vbServiceControlInterrogate**](Enumerations/ServiceControlCodeConstants#vbServiceControlInterrogate). User-defined codes in the range 128–255 are also accepted.

The method opens the SCM, requests the minimum required permission for the chosen control code (`SERVICE_STOP`, `SERVICE_PAUSE_CONTINUE`, `SERVICE_INTERROGATE`, or `SERVICE_USER_DEFINED_CONTROL`), opens the service, calls `ControlServiceExW`, and closes the handles. For [**vbServiceControlStop**](Enumerations/ServiceControlCodeConstants#vbServiceControlStop) the reason code is filled with `SERVICE_STOP_REASON_FLAG_PLANNED | SERVICE_STOP_REASON_MAJOR_NONE | SERVICE_STOP_REASON_MINOR_NONE` ("planned stop, no specific reason"). Customising the reason code is not currently exposed.

Raises run-time error 5 with a descriptive message if the SCM cannot be opened (typically a permissions issue), the service is not installed, or `ControlServiceExW` fails.

### GetConfiguredService
{: .no_toc }

Looks up a previously-configured [**ServiceManager**](ServiceManager) by its [**Name**](ServiceManager#name).

Syntax: **Services.GetConfiguredService**( *Name* ) **As** [**ServiceManager**](ServiceManager)

*Name*
: *required* A **String** matching the [**Name**](ServiceManager#name) of one of the [**ServiceManager**](ServiceManager) instances created with [**ConfigureNew**](#configurenew).

Raises run-time error 5 *"service not found"* if no configured service carries that name. Typical use is in the interactive / install branch of `Sub Main`, where a UI button needs to act on a single configured service:

```tb
Private Sub btnInstallA_Click()
    If App.IsInIDE() Then Err.Raise 5, , "Run the compiled EXE as administrator."
    Services.GetConfiguredService("MyServiceA").Install
End Sub
```

Despite the `Property Get` syntax, the lookup is parameterised by name — it reads as a property in source code, but behaves like a function.

### InstallAll
{: .no_toc }

Iterates every [**ServiceManager**](ServiceManager) created through [**ConfigureNew**](#configurenew) and calls its [**Install**](ServiceManager#install) method. Convenience for the typical case where the EXE registers every service it hosts in one shot.

Syntax: **Services.InstallAll**

> [!IMPORTANT]
> **InstallAll** writes registry entries under `HKEY_LOCAL_MACHINE` and requires administrator rights. The usual pattern is to call it once from an elevated installer.

Per-service errors raised inside [**ServiceManager.Install**](ServiceManager#install) propagate out of **InstallAll** and abort the bulk operation — there is no per-service `On Error Resume Next` wrapping. Services already installed before the failure remain installed.

### LaunchService
{: .no_toc }

Starts an installed service by name and optionally passes launch arguments through to its [**ServiceManager.LaunchArgs**](ServiceManager#launchargs) field.

Syntax: **Services.LaunchService** *ServiceName* [, *LaunchArgs* ... ]

*ServiceName*
: *required* A **String** naming an installed service.

*LaunchArgs*
: *optional* A `ParamArray` of values forwarded to the service through `StartServiceW`. Each value is converted to a **String**; the service-side [**ITbService.EntryPoint**](ITbService#entrypoint) reads them through [**ServiceManager.LaunchArgs**](ServiceManager#launchargs).

The method opens the SCM with `SC_MANAGER_CONNECT`, opens the service with `SERVICE_START`, and calls `StartServiceW`. Raises run-time error 5 if the SCM cannot be opened, the service is not installed, the caller lacks the *Start* permission, or `StartServiceW` fails (typically because the service is already running).

The launch-args mechanism is commonly used to gate startup on a shared secret:

```tb
' UI side — starting the service with a password argument:
Services.LaunchService "MyService", "MySecretPassword"

' Service side — checking the argument inside EntryPoint:
Sub EntryPoint(ByVal ServiceManager As ServiceManager) _
        Implements ITbService.EntryPoint
    If Join(ServiceManager.LaunchArgs) <> "MySecretPassword" Then
        ServiceManager.ReportStatus vbServiceStatusStopped, &H12345678
        Exit Sub
    End If
    ' ...steady-state work
End Sub
```

This prevents accidental starts from the Services control-panel applet (which calls `StartServiceW` with no extra arguments).

### QueryStateOfService
{: .no_toc }

Returns a fresh [**ServiceState**](ServiceState) snapshot of an installed service.

Syntax: **Services.QueryStateOfService**( *ServiceName* ) **As** [**ServiceState**](ServiceState)

*ServiceName*
: *required* A **String** naming an installed service.

Raises run-time error 5 if the service is not installed or the SCM cannot be opened. The returned [**ServiceState**](ServiceState) is a single-shot snapshot; to monitor a service's state over time, call **QueryStateOfService** again at each sampling interval.

```tb
Private Sub timerRefresh_Timer()
    On Error Resume Next
    Dim state As ServiceState
    Set state = Services.QueryStateOfService("MyService")
    If Err.Number = 0 Then
        lblStatus.Caption = state.CurrentStateText _
                          & " (PID " & state.ProcessId & ")"
    Else
        lblStatus.Caption = "not installed"
    End If
End Sub
```

### RunServiceDispatcher
{: .no_toc }

Hands control of the main thread over to the SCM and runs the service dispatcher loop. **Blocks** until the SCM signals shutdown.

Syntax: **Services.RunServiceDispatcher**

Internally builds a `SERVICE_TABLE_ENTRYW` array from every configured [**ServiceManager**](ServiceManager) and calls `StartServiceCtrlDispatcherW`. The SCM spawns a fresh thread for each service the user (or the *Start* configuration) wants to start, and invokes the package's dispatcher trampoline on that thread; the trampoline reports `StartPending`, optionally initialises COM in STA mode (controlled by [**ServiceManager.AutoInitializeCOM**](ServiceManager#autoinitializecom)), then calls the user's [**ITbService.EntryPoint**](ITbService#entrypoint).

Raises run-time error 5 *"Unable to start the service dispatcher"* if `StartServiceCtrlDispatcherW` returns zero. The usual cause is that the EXE was launched normally rather than by the SCM — the dispatcher only works when the process is a service host. The conventional `If InStr(Command, "-startService") > 0 Then` gate in `Sub Main` avoids this error.

### UninstallAll
{: .no_toc }

Iterates every [**ServiceManager**](ServiceManager) created through [**ConfigureNew**](#configurenew) and calls its [**Uninstall**](ServiceManager#uninstall) method.

Syntax: **Services.UninstallAll**

> [!IMPORTANT]
> **UninstallAll** writes registry entries under `HKEY_LOCAL_MACHINE` and requires administrator rights. Per-service errors abort the bulk operation; services already uninstalled before the failure remain uninstalled.

## Enumerator

### _NewEnum
{: .no_toc }

Provides `For Each` support across every [**ServiceManager**](ServiceManager) the project has configured.

Syntax: **For Each** *manager* **In Services**

```tb
Dim manager As ServiceManager
For Each manager In Services
    Debug.Print manager.Name, manager.Description
Next
```

The enumeration order is insertion order — services appear in the order they were created with [**ConfigureNew**](#configurenew).

## See Also

- [WinServicesLib package](.) -- overview, lifecycle, two-thread split, integration with WinEventLogLib / WinNamedPipesLib
- [ServiceManager class](ServiceManager) -- the per-service configuration object **ConfigureNew** returns
- [ServiceState class](ServiceState) -- the state snapshot **QueryStateOfService** returns
- [ServiceControlCodeConstants enum](Enumerations/ServiceControlCodeConstants) -- the codes accepted by **ControlService**
