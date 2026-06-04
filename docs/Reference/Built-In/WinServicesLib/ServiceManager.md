---
title: ServiceManager
parent: WinServicesLib Package
permalink: /tB/Packages/WinServicesLib/ServiceManager
has_toc: false
---

# ServiceManager class
{: .no_toc }

The per-service configuration object. One [**ServiceManager**](.) describes one Windows service the EXE knows how to host --- its [**Name**](#name), [**Description**](#description), service [**Type**](#type), [**InstallStartMode**](#installstartmode), [**InstanceCreator**](#instancecreator), and the optional fields the SCM cares about --- and exposes the methods that act on a single service: [**Install**](#install), [**Uninstall**](#uninstall), and the [**ReportStatus**](#reportstatus) call the service uses to inform the SCM of state transitions while running.

> [!NOTE]
> Do not construct **ServiceManager** instances directly. Call [**Services.ConfigureNew**](Services#configurenew) instead --- it allocates a fresh manager and registers it in the package's internal collection so the dispatcher can find it.

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

See the package [overview](.) for the broader lifecycle, the [two-thread split](.#two-thread-split), and the elevation rules around installation.

* TOC
{:toc}

## Fields

### LaunchArgs
{: .no_toc }

The launch-time arguments the SCM forwarded to the service. **String()**. Populated by the package's dispatcher trampoline when the SCM invokes the service-thread entry-point; *not* a configuration field. The service-thread [**ITbService.EntryPoint**](ITbService#entrypoint) reads it to discover the arguments that [**Services.LaunchService**](Services#launchservice) (or the SCM, or `sc.exe`) passed in.

`LaunchArgs(0)` is the *first user-supplied* argument --- the SCM-supplied service name that comes through as `argv[0]` is dropped before the array is populated, so the indexing matches the caller's mental model.

```tb
Sub EntryPoint(ByVal ServiceManager As ServiceManager) _
        Implements ITbService.EntryPoint
    If Join(ServiceManager.LaunchArgs) <> "MySecretPassword" Then
        ServiceManager.ReportStatus vbServiceStatusStopped, &H12345678
        Exit Sub
    End If
    ' ...steady-state work
End Sub
```

## Properties

### AutoInitializeCOM
{: .no_toc }

Controls whether COM is initialized on the service thread before [**ITbService.EntryPoint**](ITbService#entrypoint) is called. **Boolean**, default **True**.

Syntax (Get): *manager*.**AutoInitializeCOM**

Syntax (Let): *manager*.**AutoInitializeCOM** = *value*

*value*
: A **Boolean**. When **True** (the default), the dispatcher trampoline calls `CoInitializeEx(NULL, COINIT_APARTMENTTHREADED)` on the service thread immediately before invoking [**EntryPoint**](ITbService#entrypoint), placing the thread in a Single-Threaded Apartment (STA). When **False**, COM is not initialized by the package; the service must call `CoInitializeEx` (or `CoInitialize`) from its own [**EntryPoint**](ITbService#entrypoint) before any COM-aware objects are used.

The default **True** is appropriate for most services: it ensures that in-process COM objects and late-bound automation objects work without extra setup. Set to **False** when a different apartment model is required --- for example, a service that creates a Multi-Threaded Apartment (MTA) so that multiple worker threads can share COM objects directly:

```tb
Sub EntryPoint(ByVal ServiceManager As ServiceManager) _
        Implements ITbService.EntryPoint
    ' AutoInitializeCOM was set to False during configuration,
    ' so the package has not initialized COM. Initialize MTA here.
    CoInitializeEx vbNullPtr, COINIT_MULTITHREADED
    ServiceManager.ReportStatus vbServiceStatusRunning
    ' ...MTA-safe work
    ServiceManager.ReportStatus vbServiceStatusStopped
    CoUninitialize
End Sub
```

> [!IMPORTANT]
> Set **AutoInitializeCOM** before calling [**Services.RunServiceDispatcher**](Services#runservicedispatcher). Changing the property after the dispatcher has started has no effect on the already-running service thread.

### DependentServices
{: .no_toc }

A list of service names this service depends on. **Variant()**, no default.

When the SCM is asked to start this service, it auto-starts every listed dependency first. If any dependency fails to start, the SCM aborts the start of this service. The package converts the array into the double-null-terminated string that `CreateServiceW` expects when [**Install**](#install) is called.

Assign an array of **String** service names using `Array(...)`:

```tb
.DependentServices = Array("MSMQ", "LanmanServer")
```

The value is read at [**Install**](#install) time. Changing it after install requires uninstalling and re-installing the service.

### Description
{: .no_toc }

The human-readable description text displayed for the service in `services.msc` and `sc.exe query`. **String**, no default.

Syntax (Get): *manager*.**Description**

Syntax (Let): *manager*.**Description** = *value*

*value*
: A **String** containing the description text to display for this service in the Windows Services control panel and `sc.exe query` output.

The value is written to the SCM by [**Install**](#install) via `ChangeServiceConfig2W(SERVICE_CONFIG_DESCRIPTION)` and is applied on a fresh install or refreshed on every re-install. Assign this property before calling [**Install**](#install); changing it at run-time has no effect until the next install.

```tb
With Services.ConfigureNew
    .Name        = "MyBackgroundSvc"
    .Description = "Processes incoming requests and writes results to the event log."
    ' ...other configuration
End With
```

### InstallCmdLine
{: .no_toc }

The command line the SCM will use when launching the service-host EXE. **String**, default `"""<App.ModulePath>"""` (the running EXE path, quoted).

The default suffices only when the EXE always runs as a service. The conventional pattern is to **override the default** to add a discriminator argument so the EXE's `Sub Main` can tell which mode it is in:

```tb
.InstallCmdLine = """" & App.ModulePath & """ -startService"
```

The matching `If InStr(Command, "-startService") > 0 Then Services.RunServiceDispatcher` branch in `Sub Main` is what makes the same EXE work both as installer / control-panel UI (when launched normally) and as service host (when launched by the SCM).

The value is captured into the SCM database at [**Install**](#install) time. Changing it after install requires uninstalling and re-installing the service.

### InstallStartMode
{: .no_toc }

The SCM start mode the service is registered with. [**ServiceStartConstants**](Enumerations/ServiceStartConstants), default [**tbServiceStartOnDemand**](Enumerations/ServiceStartConstants#tbServiceStartOnDemand).

Typical settings:

- [**tbServiceStartOnDemand**](Enumerations/ServiceStartConstants#tbServiceStartOnDemand) -- the service is **not** started automatically; user / installer / [**Services.LaunchService**](Services#launchservice) starts it on demand.
- [**tbServiceStartAuto**](Enumerations/ServiceStartConstants#tbServiceStartAuto) -- the SCM starts the service at system boot.
- [**tbServiceStartDisabled**](Enumerations/ServiceStartConstants#tbServiceStartDisabled) -- the service cannot be started until its start mode is changed.

The driver-only modes ([**tbServiceStartBoot**](Enumerations/ServiceStartConstants#tbServiceStartBoot), [**tbServiceStartDriverSystem**](Enumerations/ServiceStartConstants#tbServiceStartDriverSystem)) are not meaningful for user-mode twinBASIC services.

### InstanceCreator
{: #instancecreator }
{: .no_toc }

The factory the dispatcher uses to create the [**ITbService**](ITbService) instance for this service when the SCM launches it. [**IServiceCreator**](ServiceCreator), no default.

Syntax (Get): *manager*.**InstanceCreator**

Syntax (Let/Set): *manager*.**InstanceCreator** = *creator*

*creator*
: An object expression that evaluates to a [**ServiceCreator(Of T)**](ServiceCreator) instance, where *T* is the user's [**ITbService**](ITbService) implementation class. Both **Let** and **Set** assignment syntax are accepted --- the underlying private interface exposes all three accessors (**Get**, **Let**, **Set**).

Assign `New ServiceCreator(Of MyServiceClass)` where `MyServiceClass` is the user's [**ITbService**](ITbService) implementation:

```tb
.InstanceCreator = New ServiceCreator(Of MyService)
```

[**Services.RunServiceDispatcher**](Services#runservicedispatcher) calls `InstanceCreator.CreateInstance()` once per service start to obtain the [**ITbService**](ITbService) instance the dispatcher hands to the service thread.

If only [**Install**](#install) / [**Uninstall**](#uninstall) need to run (for example, inside a stand-alone installer), **InstanceCreator** can be left **Nothing** --- the dispatcher only needs it when the SCM actually starts the service.

### Name
{: .no_toc }

The service's name in the SCM database, used by `services.msc` and `sc.exe`. **String**, no default.

Syntax (Get): *manager*.**Name**

Syntax (Let): *manager*.**Name** = *value*

*value*
: A **String** identifying the service in the SCM database. Must be unique across all services installed on the system.

The name is stored at `HKLM\SYSTEM\CurrentControlSet\Services\<Name>` when [**Install**](#install) is called. It is also the *ServiceName* argument that [**Services.LaunchService**](Services#launchservice), [**Services.ControlService**](Services#controlservice), and [**Services.QueryStateOfService**](Services#querystateofservice) accept. The same value is used for the SCM's *DisplayName* --- the package does not currently expose a distinct display name.

**Name** must be assigned before calling [**Install**](#install) or [**Uninstall**](#uninstall). It is also the key the package's dispatcher uses to match an incoming SCM service-thread invocation to its [**ServiceManager**](.) configuration; every configured manager must have a unique **Name** within the EXE.

```tb
With Services.ConfigureNew
    .Name = "MyBackgroundSvc"
    ' ...other configuration
End With
```

### SupportsPausing
{: .no_toc }

Whether the SCM is told that the service accepts [**SERVICE_CONTROL_PAUSE**](Enumerations/ServiceControlCodeConstants#vbServiceControlPause) / [**SERVICE_CONTROL_CONTINUE**](Enumerations/ServiceControlCodeConstants#vbServiceControlContinue) notifications. **Boolean**, default **False**.

Setting this property immediately resyncs the cached `SERVICE_STATUS` to the SCM via `SetServiceStatus`, so toggling it from inside [**EntryPoint**](ITbService#entrypoint) --- once the service is past the `StartPending` phase --- takes effect on the next SCM query. Most services that support pausing set the property to **True** at the top of [**EntryPoint**](ITbService#entrypoint) and handle [**vbServiceControlPause**](Enumerations/ServiceControlCodeConstants#vbServiceControlPause) / [**vbServiceControlContinue**](Enumerations/ServiceControlCodeConstants#vbServiceControlContinue) in [**ChangeState**](ITbService#changestate).

If the service has not yet reached the started state when **SupportsPausing** is set, the resync raises run-time error 5 *"Can't update the service state until the service has started"*. Wait until after the first [**ReportStatus**](#reportstatus)`(vbServiceStatusRunning)` call before toggling the property.

### Type
{: .no_toc }

The Win32 service type --- controls whether the service runs in its own process, in a shared process, or is a kernel driver. [**ServiceTypeConstants**](Enumerations/ServiceTypeConstants), default [**tbServiceTypeOwnProcess**](Enumerations/ServiceTypeConstants#tbServiceTypeOwnProcess).

Syntax (Get): *manager*.**Type**

Syntax (Let): *manager*.**Type** = *value*

*value*
: A [**ServiceTypeConstants**](Enumerations/ServiceTypeConstants) value. Typical values:
  - [**tbServiceTypeOwnProcess**](Enumerations/ServiceTypeConstants#tbServiceTypeOwnProcess) -- one service per EXE. This is the standard choice for a twinBASIC service.
  - [**tbServiceTypeShareProcess**](Enumerations/ServiceTypeConstants#tbServiceTypeShareProcess) -- multiple services hosted in a single EXE; the SCM keeps one process alive that serves all of them. Each [**ServiceManager**](.) still needs its own configuration and [**InstanceCreator**](#instancecreator).

The driver-only modes ([**tbServiceTypeSystemDriver**](Enumerations/ServiceTypeConstants#tbServiceTypeSystemDriver), [**tbServiceTypeKernelDriver**](Enumerations/ServiceTypeConstants#tbServiceTypeKernelDriver), and others in [**ServiceTypeConstants**](Enumerations/ServiceTypeConstants)) are not meaningful for user-mode twinBASIC services.

The value is captured into the SCM database at [**Install**](#install) time and is also written into every `SERVICE_STATUS` report via `dwServiceType`. Changing it after install requires uninstalling and re-installing the service.

## Methods

### New
{: .no_toc }

Initializes a new **ServiceManager** instance with default configuration values.

Syntax: **New ServiceManager**

**New** sets the following defaults:

- [**Type**](#type) to [**tbServiceTypeOwnProcess**](Enumerations/ServiceTypeConstants#tbServiceTypeOwnProcess)
- [**InstallStartMode**](#installstartmode) to [**tbServiceStartOnDemand**](Enumerations/ServiceStartConstants#tbServiceStartOnDemand)
- [**InstallCmdLine**](#installcmdline) to the quoted path of the running EXE (`App.ModulePath`)
- [**AutoInitializeCOM**](#autoinitializecom) to **True**

> [!NOTE]
> Do not call **New ServiceManager** directly. Use [**Services.ConfigureNew**](Services#configurenew), which constructs the instance and registers it in the package's internal collection. A **ServiceManager** created outside that method is invisible to the dispatcher and cannot be used as a service host.

### Install
{: .no_toc }

Registers this service in the SCM database.

Syntax: *manager*.**Install**

Opens the SCM with `SC_MANAGER_CONNECT Or SC_MANAGER_CREATE_SERVICE`, calls `CreateServiceW` with the configured fields. If a service with the same [**Name**](#name) already exists, the method deletes it first (via `OpenServiceW(SERVICE_DELETE)` + `DeleteService`) and retries --- so calling [**Install**](#install) on a service that already exists overwrites the existing registration rather than failing. On a successful create the [**Description**](#description) is written via `ChangeServiceConfig2W(SERVICE_CONFIG_DESCRIPTION)`.

> [!IMPORTANT]
> [**Install**](#install) writes to the SCM database, which requires administrator rights. The usual pattern is to call it once from an elevated installer, not from the application's normal startup path. Running from within the twinBASIC IDE typically fails --- the IDE is rarely elevated.

Raises run-time error 5 with a descriptive message on permission failure (`"Unable to open the Service manager..."`) or unrecoverable create failure (`"CreateServiceW() failed with error code <N>"`).

### ReportStatus
{: .no_toc }

Informs the SCM of the service's current state. Called by the service from inside [**ITbService.EntryPoint**](ITbService#entrypoint) (and from [**ITbService.ChangeState**](ITbService#changestate) to acknowledge pending transitions).

Syntax: *manager*.**ReportStatus** *CurrentState* [, *Win32ExitCode* [, *WaitHint* ] ]

*CurrentState*
: *required* A [**ServiceStatusConstants**](Enumerations/ServiceStatusConstants) value --- typically [**vbServiceStatusRunning**](Enumerations/ServiceStatusConstants#vbServiceStatusRunning), [**vbServiceStatusStopPending**](Enumerations/ServiceStatusConstants#vbServiceStatusStopPending), or [**vbServiceStatusStopped**](Enumerations/ServiceStatusConstants#vbServiceStatusStopped).

*Win32ExitCode*
: *optional* A **Long** exit code. Default **0** (`NO_ERROR`). When reporting [**vbServiceStatusStopped**](Enumerations/ServiceStatusConstants#vbServiceStatusStopped) after an error, pass either a Win32 error code or, for service-specific codes, the magic value `ERROR_SERVICE_SPECIFIC_ERROR` (1066) along with placing the real code in the service-specific field --- but the package's API exposes only the *Win32ExitCode* parameter directly. Most services pass **0** for a clean stop and a small custom code for an error stop.

*WaitHint*
: *optional* A **Long** giving the SCM an upper-bound milliseconds estimate of how long the current pending transition will take. Default **0**. Only meaningful for pending states ([**vbServiceStatusStartPending**](Enumerations/ServiceStatusConstants#vbServiceStatusStartPending), [**vbServiceStatusStopPending**](Enumerations/ServiceStatusConstants#vbServiceStatusStopPending), [**vbServiceStatusPausePending**](Enumerations/ServiceStatusConstants#vbServiceStatusPausePending), [**vbServiceStatusContinuePending**](Enumerations/ServiceStatusConstants#vbServiceStatusContinuePending)) --- the SCM uses it together with the auto-incremented `dwCheckPoint` field to detect a stuck service.

**ReportStatus** fills the `dwControlsAccepted` field of `SERVICE_STATUS` automatically --- *Stop* is always accepted except during [**vbServiceStatusStartPending**](Enumerations/ServiceStatusConstants#vbServiceStatusStartPending), and *Pause* / *Continue* are accepted when [**SupportsPausing**](#supportspausing) is **True**. The `dwCheckPoint` field auto-increments while the service is in a pending state and resets to **0** on [**vbServiceStatusRunning**](Enumerations/ServiceStatusConstants#vbServiceStatusRunning) / [**vbServiceStatusStopped**](Enumerations/ServiceStatusConstants#vbServiceStatusStopped).

The package's dispatcher trampoline reports [**vbServiceStatusStartPending**](Enumerations/ServiceStatusConstants#vbServiceStatusStartPending) immediately before calling [**EntryPoint**](ITbService#entrypoint); the user's [**EntryPoint**](ITbService#entrypoint) is responsible for the subsequent [**vbServiceStatusRunning**](Enumerations/ServiceStatusConstants#vbServiceStatusRunning) and [**vbServiceStatusStopped**](Enumerations/ServiceStatusConstants#vbServiceStatusStopped) transitions.

### ResyncStatus
{: .no_toc }

Re-applies the cached `SERVICE_STATUS` to the SCM via `SetServiceStatus`. Called automatically by [**ReportStatus**](#reportstatus) and by the [**SupportsPausing**](#supportspausing) setter; consumer code rarely needs to call this directly.

Syntax: *manager*.**ResyncStatus**

Raises run-time error 5 *"Can't update the service state until the service has started"* if called before the service has acquired its SCM status handle (i.e. before the dispatcher trampoline has called `RegisterServiceCtrlHandlerExW`). From inside [**EntryPoint**](ITbService#entrypoint), [**ReportStatus**](#reportstatus) is the right call rather than **ResyncStatus** directly.

### ServiceEntryPoint
{: .no_toc }

The SCM-invoked entry point that runs on the service thread when the OS starts the service.

Syntax: *manager*.**ServiceEntryPoint** *dwArgc*, *lpszArgv*

*dwArgc*
: *required* A **Long** giving the number of argument strings the SCM passed in, including the service name as `argv[0]`.

*lpszArgv*
: *required* A **LongPtr** pointing to an array of `LPWSTR` pointers. The first pointer is the service name (consumed internally); subsequent pointers become [**LaunchArgs**](#launchargs).

> [!NOTE]
> **ServiceEntryPoint** is called by the package's dispatcher trampoline via `StartServiceCtrlDispatcherW`'s thread-creation machinery. Consumer code does not call it directly --- the package obtains its address through the private `IServiceManagerInternal.GetEntryPointAddress` interface and passes it to the SCM as a function pointer. The sub is not marked **Public** and is not intended for direct invocation.

On entry, the sub calls `RegisterServiceCtrlHandlerExW` to obtain the service status handle. It then parses *lpszArgv* into [**LaunchArgs**](#launchargs) (dropping `argv[0]`, the service name), calls `InstanceCreator.CreateInstance()` to produce the [**ITbService**](ITbService) object, and --- if [**AutoInitializeCOM**](#autoinitializecom) is **True** --- initialises COM in STA mode before invoking [**ITbService.EntryPoint**](ITbService#entrypoint). If `RegisterServiceCtrlHandlerExW` returns zero (handle acquisition failed), [**ITbService.StartupFailed**](ITbService#startupfailed) is called instead.

### ServiceControlHandlerCallback
{: .no_toc }

Routes an SCM control-code notification to the active service instance.

Syntax: *manager*.**ServiceControlHandlerCallback** *dwControl*, *dwEventType*, *lpEventData*

*dwControl*
: *required* A **Long** holding the Win32 control code delivered by the SCM. Corresponds to a [**ServiceControlCodeConstants**](Enumerations/ServiceControlCodeConstants) value.

*dwEventType*
: *required* A **Long** holding the event-type sub-code for control codes that carry one. **0** for codes that do not.

*lpEventData*
: *required* A **LongPtr** pointing to an event-specific data structure for control codes that include one. `vbNullPtr` for codes that do not carry a data block.

> [!NOTE]
> **ServiceControlHandlerCallback** is an internal hook. The Win32 service infrastructure invokes it through the package's `ServiceControlHandlerCallback_Trampoline` helper, which is registered with the SCM via `RegisterServiceCtrlHandlerExW` inside [**ServiceEntryPoint**](#serviceentrypoint). User code never calls this method directly --- implement [**ITbService.ChangeState**](ITbService#changestate) to handle control-code notifications.

The method runs on the **dispatcher thread** (the main thread of the EXE), not on the service thread where [**ITbService.EntryPoint**](ITbService#entrypoint) runs. It forwards the three raw Win32 parameters to [**ITbService.ChangeState**](ITbService#changestate) on the active service instance. If no service instance is active (`InternalActiveInstance` is **Nothing**), the method returns without taking any action.

### Uninstall
{: .no_toc }

Removes this service from the SCM database.

Syntax: *manager*.**Uninstall**

Opens the SCM, opens the service with `SERVICE_DELETE`, calls `DeleteService`. The actual deletion is queued by the SCM and completes once every open handle to the service is closed --- `services.msc` may show the service as *"Marked for deletion"* until the host process exits.

> [!IMPORTANT]
> [**Uninstall**](#uninstall) requires administrator rights. Raises run-time error 5 with a descriptive message if the SCM cannot be opened, the service is not installed, or `DeleteService` fails.

## Types

### SERVICE_TABLE_ENTRYW
{: #service_table_entryw }

A Win32 UDT that pairs a service name with its entry-point address. Used internally by [**Services.RunServiceDispatcher**](Services#runservicedispatcher) to build the table that `StartServiceCtrlDispatcherW` consumes.

```tb
Type SERVICE_TABLE_ENTRYW
    Name       As String
    EntryPoint As LongPtr
End Type
```

*Name*
: A **String** holding the service name. Matches the [**Name**](#name) property of the corresponding **ServiceManager**.

*EntryPoint*
: A **LongPtr** holding the address of the service's entry-point procedure. The package fills this from `AddressOf ServiceEntryPoint` via the private `IServiceManagerInternal.GetEntryPointAddress` implementation; user code never sets this field.

> [!NOTE]
> **SERVICE_TABLE_ENTRYW** is an internal type. The package constructs and populates the table automatically inside [**Services.RunServiceDispatcher**](Services#runservicedispatcher); user code does not interact with it directly.

## See Also

- [WinServicesLib package](.) -- overview, lifecycle, two-thread split
- [Services class](Services) -- the predeclared coordinator that **ConfigureNew** comes from
- [ITbService interface](ITbService) -- what **InstanceCreator** must produce
- [ServiceCreator(Of T)](ServiceCreator) -- the generic factory typically passed to **InstanceCreator**
- [ServiceTypeConstants enum](Enumerations/ServiceTypeConstants) -- the values **Type** accepts
- [ServiceStatusConstants enum](Enumerations/ServiceStatusConstants) -- the values **ReportStatus** accepts
