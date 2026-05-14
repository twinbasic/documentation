# WinServicesLib Package — Working Notes

See [WIP.md](WIP.md) for the cross-package maintenance guide. Sister packages: [WinEventLogLib](WIP.WinEventLogLib.md), [WinNamedPipesLib](WIP.WinNamedPipesLib.md).

A thin OS-services wrapper. The `[PredeclaredId]` singleton `Services` is the entry point; `ServiceManager` carries per-service configuration; `ServiceCreator(Of T)` is the generic factory; `ServiceState` is a read-only snapshot. The Win32 API wrappers, the `Private Module ServicesConstants` half of the constants file, the `ServiceControlHandlerCallback_Trampoline` helper, and the `IServiceCreator` / `IServiceManagerInternal` private interfaces are plumbing and get no doc page. The user-facing enums live in `Public Module ServicesConstantsPublic`.

Public user-facing surface (three concrete classes + one generic class + one interface + four enums):

| Symbol                          | Kind                  | Role                                                                                              |
|---------------------------------|-----------------------|---------------------------------------------------------------------------------------------------|
| `Services`                      | `[PredeclaredId]` Class | The singleton coordinator: `ConfigureNew`, `RunServiceDispatcher`, `InstallAll`, `UninstallAll`, `LaunchService`, `ControlService`, `QueryStateOfService`, `GetConfiguredService`, `_NewEnum`. Used as `Services.X` without `New`. |
| `ServiceManager`                | Class                 | Per-service configuration + runtime status reporting. Returned by `Services.ConfigureNew()`.      |
| `ServiceCreator(Of T)`          | Generic class         | The dispatcher's factory: `T` must implement `ITbService`; `CreateInstance` returns `New T`.       |
| `ServiceState`                  | Class                 | Read-only state snapshot. Constructor (called via `Services.QueryStateOfService(Name)`) queries the SCM.  |
| `ITbService`                    | Public Interface      | The contract every service class implements: `EntryPoint`, `StartupFailed`, `ChangeState`.        |
| `ServiceTypeConstants`          | Enum                  | `tbServiceTypeOwnProcess`, `tbServiceTypeShareProcess`, etc.                                       |
| `ServiceStartConstants`         | Enum                  | `tbServiceStartAuto`, `tbServiceStartOnDemand`, etc.                                              |
| `ServiceControlCodeConstants`   | Enum                  | `vbServiceControlStop`, `vbServiceControlPause`, `vbServiceControlContinue`, etc.                  |
| `ServiceStatusConstants`        | Enum                  | `vbServiceStatusRunning`, `vbServiceStatusStartPending`, `vbServiceStatusStopped`, etc.            |

The two private interfaces (`IServiceCreator`, `IServiceManagerInternal`) are pure implementation detail — same situation as `WinNamedPipesLib`'s `INamedPipe*Internal` interfaces. **No doc page**, and don't surface the underscored implementing members on the concrete classes either.

The two `Private Module` declarations (`ServicesAPIs`, `ServicesConstants`) and the `Private Module ServicesHelper` are all internal — **no doc page**.

## `Services` public members

`[PredeclaredId]` Class. The compiler instantiates a singleton named `Services` at program start; user code calls `Services.X` directly without `New`. The class also doubles as an enumerable collection of the `ServiceManager` instances that have been configured (`For Each manager In Services`).

**Public methods**:

- `Function ConfigureNew() As ServiceManager` — *"Use this method to configure a service. Usually used during app startup."* Allocates a new `ServiceManager`, adds it to the internal collection, returns it. Typical use: `With Services.ConfigureNew : .Name = "MyService" : .InstanceCreator = New ServiceCreator(Of MyServiceClass) : End With`.
- `Sub RunServiceDispatcher()` — *"This method hands over to the OS for managing the starting/stopping of services via the main thread. This is a BLOCKING call, until the OS wants to shutdown the service EXE."* Builds a `SERVICE_TABLE_ENTRYW` from every configured `ServiceManager` and calls `StartServiceCtrlDispatcherW`. Returns only when the OS terminates the service host. Raises run-time error 5 if the dispatcher cannot start (typically when the EXE was launched normally rather than by the SCM).
- `Sub InstallAll()` — *"This method tries to register ALL of the configured services onto the system."* Iterates the configured `ServiceManager`s and calls `.Install()` on each. Requires admin.
- `Sub UninstallAll()` — *"This method tries to unregister ALL of the configured services off the system."* Iterates and calls `.Uninstall()` on each. Requires admin.
- `Function QueryStateOfService(ByVal ServiceName As String) As ServiceState` — returns a fresh `ServiceState` snapshot. Raises run-time error 5 if the service isn't installed.
- `Sub LaunchService(ByVal ServiceName As String, ParamArray LaunchArgs())` — start an installed service by name, optionally passing launch arguments through to its `ServiceManager.LaunchArgs()` field. Wraps `OpenServiceW(SERVICE_START)` + `StartServiceW`. Raises run-time error 5 on permission / not-installed / already-running.
- `Sub ControlService(ByVal ServiceName As String, ByVal ControlCode As ServiceControlCodeConstants)` — send an SCM control code to a running service. The required SCM permission is derived from the control code automatically (`SERVICE_STOP` for `vbServiceControlStop`, `SERVICE_PAUSE_CONTINUE` for the pause / continue / netbind / paramchange family, `SERVICE_INTERROGATE` for `vbServiceControlInterrogate`, `SERVICE_USER_DEFINED_CONTROL` for codes 128–255, `SERVICE_ALL_ACCESS` otherwise). For `vbServiceControlStop` the wrapper fills `SERVICE_CONTROL_STATUS_REASON_PARAMSW` with `SERVICE_STOP_REASON_FLAG_PLANNED | MAJOR_NONE | MINOR_NONE` — there is a `FIXME` to allow customising the reason code.

**Public properties**:

- `Property Get GetConfiguredService(ByVal Name As String) As ServiceManager` — look up a previously-configured `ServiceManager` by its `Name`. Raises run-time error 5 if not found. (Despite the `Get` syntax the lookup is parameterised by name; it's a property in name only.)

**Public enumerator**:

- `Property Get _NewEnum() As Variant` — `[Enumerator]`-tagged; enables `For Each manager In Services` over the configured `ServiceManager`s. *"Provides For-Each support for the services collection, exposing each configured service as a ServiceManager instance."*

## `ServiceManager` public members

`[COMCreatable(False)]`. User code never instantiates this directly — `Services.ConfigureNew()` returns it. The source-side constructor carries `[Description("For internal use. Dont create instances of ServiceManager manually, use Services.ConfigureNew instead")]` — surface that on the page intro.

**Public field** (one):

- `LaunchArgs() As String` — populated by `ServiceEntryPoint` from the `argv` the SCM hands over. `LaunchArgs(0)` is the *first user-supplied* argument (the SCM-supplied service name at `argv[0]` is dropped). The example uses it to gate startup: `If Join(ServiceManager.LaunchArgs) <> "MySecretPassword" Then …`.

**Public properties** (each carries a `[Description("...")]`):

- `InstanceCreator As IServiceCreator` (Get / Let / Set) — *"Set this to an instance of the ServiceCreator class to allow the OS to launch the instance of your service."* Typically `.InstanceCreator = New ServiceCreator(Of MyServiceClass)`.
- `Name As String` (Get / Let) — *"The name of the service, as listed in the OS services database."*
- `Description As String` (Get / Let) — *"The description of the service, as listed in the OS services database."* Applied via `ChangeServiceConfig2W(SERVICE_CONFIG_DESCRIPTION)` on every successful `Install()`.
- `Type As ServiceTypeConstants` (Get / Let) — *"The type of the service, typically `tbServiceTypeOwnProcess` or `tbServiceTypeShareProcess`."* Defaults to `tbServiceTypeOwnProcess`.
- `InstallStartMode As ServiceStartConstants` (Get / Let) — *"The start-mode of the service, typically `tbServiceStartOnDemand` or `tbServiceStartAuto`."* Defaults to `tbServiceStartOnDemand`.
- `InstallCmdLine As String` (Get / Let) — *"The command line arguments passed to the service EXE when the OS launches the service."* Defaults to `"""<App.ModulePath>"""`. **Usually overridden to add a discriminator argument** like `-startService` so the EXE knows whether it was launched by the SCM (run dispatcher) or by a user (show UI). Example: `.InstallCmdLine = """" & App.ModulePath & """ -startService"`.
- `DependentServices() As Variant` (Get / Let) — *"A list of dependent services that this service requires to be started before this service is launched (dependent services are auto-launched by the OS)."* Pass an `Array("OtherSvc1", "OtherSvc2")`. The setter stashes it; `Install()` packs it into a double-null-terminated string and hands it to `CreateServiceW`.
- `AutoInitializeCOM As Boolean` (Get / Let) — *"When TRUE, COM will be initialized for you on the new service thread in STA mode."* Defaults to `True`. Set to `False` if your service needs a different apartment model (call `CoInitializeEx` yourself from `EntryPoint`).
- `SupportsPausing As Boolean` (Get / Let) — *"When TRUE, the SCM will send `SERVICE_CONTROL_PAUSE` / `SERVICE_CONTROL_CONTINUE` notifications."* Defaults to `False`. The setter calls `ResyncStatus()` so toggling it mid-run takes effect immediately. (Most services set this to `True` once inside `EntryPoint` and then handle `vbServiceControlPause` / `vbServiceControlContinue` in `ChangeState`.)

**Public methods**:

- `Sub Install()` — *"This method attempts to install the configured service on the system."* Opens the SCM with `SC_MANAGER_CONNECT Or SC_MANAGER_CREATE_SERVICE`, calls `CreateServiceW`. If the service already exists, deletes it (via `OpenServiceW(SERVICE_DELETE)` + `DeleteService`) and **retries** the create — so `Install()` is effectively re-entrant / safe to call multiple times. On successful create, sets the description via `ChangeServiceConfig2W`. Raises run-time error 5 on permissions failure or unrecoverable create failure. **Requires admin elevation.**
- `Sub Uninstall()` — *"This method attempts to uninstall the configured service on the system."* Opens the SCM, opens the service with `SERVICE_DELETE`, calls `DeleteService`. Raises run-time error 5 if the service isn't registered or on permissions failure. **Requires admin elevation.**
- `Sub ReportStatus(ByVal dwCurrentState As ServiceStatusConstants, Optional ByVal dwWin32ExitCode As Long = ERRORCODE_NO_ERROR, Optional ByVal dwWaitHint As Long = 0)` — *"This method informs the OS of the current state of the service."* The user's `EntryPoint` is **required** to call `ReportStatus(vbServiceStatusRunning)` once steady-state is reached and `ReportStatus(vbServiceStatusStopped)` once shut-down completes; long start-up sequences should also call `ReportStatus(vbServiceStatusStartPending, , <waitHint_ms>)` periodically to keep the SCM from killing the service. The `dwControlsAccepted` field of `SERVICE_STATUS` is filled automatically from the state and from `SupportsPausing` (Stop is always accepted except during `StartPending`; Pause/Continue is gated on `SupportsPausing`). The `dwCheckPoint` field auto-increments for pending states and resets on `Running`/`Stopped`.
- `Sub ResyncStatus()` — re-applies the cached `SERVICE_STATUS` to the SCM via `SetServiceStatus`. Called automatically from `ReportStatus` and from the `SupportsPausing` setter. User code rarely needs to call this directly; mention it for completeness.

The class also carries two methods that are technically `Public`-by-default (no modifier) but are invoked only by the OS dispatcher / the package's own trampoline — `ServiceEntryPoint(ByVal dwArgc As Long, ByVal lpszArgv As LongPtr)` and `ServiceControlHandlerCallback(ByVal dwControl As Long, ByVal dwEventType As Long, ByVal lpEventData As LongPtr)`. **Do not list these as user-facing methods**; mention them at the very end of the page under "Internal hooks" with a `> [!NOTE]` saying the OS / package infrastructure invokes them and user code never calls them.

## `ServiceCreator(Of T)` public members

Generic class. `[COMCreatable(False)]`. `[Description("This class allows the service manager to create an instance of a particular service on-demand as needed")]` is the source intro. Tagged with the EA magic-byte `[ClassId("66170220-FEF3-4257-8FBA-EAEAEAEAEAEA")]` — same compiler-special-handling treatment as `WinEventLogLib`'s `EventLog(Of T1, T2)`. Do not surface the `ClassId` on the page.

Type parameter constraint: `T` must implement `ITbService`. There is no syntactic `Where T : ITbService` constraint expressed in the source, but `Function CreateInstance() As ITbService` returning `New T` only compiles when `T` implements `ITbService` — flag this as the practical constraint on the page.

**Public method**:

- `Function CreateInstance() As ITbService` — `Implements IServiceCreator.CreateInstance`. Returns `New T`. Called once per service start by the package's dispatcher trampoline. User code never calls this directly; the typical usage is `.InstanceCreator = New ServiceCreator(Of MyServiceClass)` on a freshly-allocated `ServiceManager`.

The page should be small (the surface is one method) and largely focused on explaining the `Of T` parameterisation + the `T : ITbService` constraint + how it slots into `ServiceManager.InstanceCreator`.

## `ServiceState` public members

`[COMCreatable(False)]`. Returned by `Services.QueryStateOfService(Name)`. The constructor takes the service name, opens the SCM with `SC_MANAGER_CONNECT`, opens the service with `SERVICE_QUERY_STATUS`, calls `QueryServiceStatusEx(SC_STATUS_PROCESS_INFO, ...)`, and snapshots a `SERVICE_STATUS_PROCESS` struct. **The snapshot is taken once at construction time and never refreshed** — to see updated state, call `Services.QueryStateOfService` again.

The constructor raises run-time error 5 with descriptive messages on three failure modes: SCM open failed (*"Unable to open the Service manager..."*), service not installed (*"Service '<Name>' is not installed on this system"*), status query failed (*"Unable to query the service state"*).

**Public properties** (all read-only `Get`):

- `Type As ServiceTypeConstants` — the SCM-reported service type.
- `CurrentState As Long` — the SCM-reported state, but typed `Long` rather than `ServiceStatusConstants`. **Source carries a `' FIXME` comment** — surface as a `> [!NOTE]` that this returns the underlying `Long` value (which happens to match the `ServiceStatusConstants` enum values), and that callers wanting type-safety can `CType(state.CurrentState, ServiceStatusConstants)`.
- `CurrentStateText As String` — human-readable text: `"RUNNING"`, `"STOPPED"`, `"STARTING"`, `"STOPPING"`, `"PAUSED"`, `"PAUSING"`, `"CONTINUING"`, `"UNKNOWN STATE (<n>)"`.
- `ControlsAccepted As Long` — bitmask of `SERVICE_ACCEPT_*` flags. **Source carries a `' FIXME` comment** — surface the same way as `CurrentState`.
- `ExitCode As Long` — the `dwWin32ExitCode` field. The Win32 documented sentinel `ERROR_SERVICE_SPECIFIC_ERROR` (`1066`) means "see `ServiceSpecificExitCode`".
- `ServiceSpecificExitCode As Long` — the service-defined exit code when `ExitCode = ERROR_SERVICE_SPECIFIC_ERROR`. Otherwise meaningless.
- `CheckPoint As Long` — the `dwCheckPoint` field; increments while the service is in a pending state and resets at steady state.
- `WaitHint As Long` — the `dwWaitHint` milliseconds field.
- `ProcessId As Long` — the OS process ID hosting the service (0 if not running).
- `Flags As Long` — the `dwServiceFlags` field (currently `SERVICE_RUNS_IN_SYSTEM_PROCESS = 1` is the only documented bit).

## `ITbService` public members

`Public Interface`. Tagged `[InterfaceId("5F137E12-5164-452E-911A-6FD9BF20EC81")]`. Description: *"All services must implement `ITbService`."* The contract is three subs:

- `Sub EntryPoint(ByVal ServiceContext As ServiceManager)` — the main service body. Called by the package's dispatcher trampoline once the SCM has finished start-up handshaking. **Runs on the service thread** (a separate thread from the dispatcher). Inside this sub the implementor:
  1. Optionally validates startup conditions (e.g. checks `ServiceContext.LaunchArgs`).
  2. Calls `ServiceContext.ReportStatus(vbServiceStatusRunning)` once steady-state is reached (the dispatcher trampoline reports `vbServiceStatusStartPending` automatically before calling `EntryPoint`).
  3. Runs the long-running work loop. For pipe-server services this is the `NamedPipeServer.ManualMessageLoopEnter()` blocking call; for other services it might be a `Do While IsStopping = False` loop with a wait primitive.
  4. Calls `ServiceContext.ReportStatus(vbServiceStatusStopped)` before returning.
- `Sub StartupFailed(ByVal ServiceContext As ServiceManager)` — called if `RegisterServiceCtrlHandlerExW` failed (the control handler couldn't be hooked, e.g. the service was launched outside the SCM context). Typical implementation: log a failure event. Don't try to `ReportStatus` from here — the status handle is invalid.
- `Sub ChangeState(ByVal ServiceContext As ServiceManager, ByVal dwControl As ServiceControlCodeConstants, ByVal dwEventType As Long, ByVal lpEventData As LongPtr)` — the control-code dispatcher. **Runs on the main (dispatcher) thread**, not on the service thread. Typical pattern: `Select Case dwControl` over `vbServiceControlStop` / `vbServiceControlShutdown` / `vbServiceControlPause` / `vbServiceControlContinue`, set shared `Public` flags (`IsStopping`, `IsPaused`), call `ServiceContext.ReportStatus` to acknowledge the transition, signal the service thread to react (e.g. `NamedPipeServer.ManualMessageLoopLeave()`). The `dwEventType` + `lpEventData` parameters carry the event-specific payload for the codes that need it (`SERVICE_CONTROL_DEVICEEVENT`, `SERVICE_CONTROL_POWEREVENT`, `SERVICE_CONTROL_SESSIONCHANGE`, `SERVICE_CONTROL_HARDWAREPROFILECHANGE` — see Microsoft's `HandlerEx` documentation for the data layouts).

**The two-thread split is the single most important fact about the interface** — every page entry should reinforce it. The example uses `Public IsPaused As Boolean` + `Public IsStopping As Boolean` shared fields on the service class to ferry state between the two threads, which is the documented pattern.

## Enumerations

Public enums (in `Public Module ServicesConstantsPublic`), one page each under `docs/Reference/WinServicesLib/Enumerations/`:

- `ServiceTypeConstants` — `tbServiceTypeAdapter`, `tbServiceTypeSystemDriver`, `tbServiceTypeKernelDriver`, `tbServiceTypeRecognizerDriver`, `tbServiceTypeOwnProcess`, `tbServiceTypeShareProcess`, `tbServiceTypeOwnProcessInteractive`, `tbServiceTypeShareProcessInteractive`. The driver values (`tbServiceTypeSystemDriver`, `tbServiceTypeKernelDriver`, `tbServiceTypeRecognizerDriver`, `tbServiceTypeAdapter`) are only meaningful when registering a kernel-mode driver — twinBASIC services compile to a user-mode EXE and should use `tbServiceTypeOwnProcess` (one service per EXE) or `tbServiceTypeShareProcess` (multiple services hosted in one EXE; the example uses this). The `Interactive` variants are kept for compatibility but Windows Vista and later disallow them; flag with a `> [!NOTE]`.
- `ServiceStartConstants` — `tbServiceStartAuto`, `tbServiceStartBoot`, `tbServiceStartOnDemand`, `tbServiceStartDisabled`, `tbServiceStartDriverSystem`. `tbServiceStartBoot` and `tbServiceStartDriverSystem` only apply to kernel drivers.
- `ServiceControlCodeConstants` — 18 values mirroring the Win32 `SERVICE_CONTROL_*` constants. Source-side prefix is `vbServiceControl*` (carried over from VB6 — note the prefix is `vb`, not `tb`, in this enum; surface as-is, don't try to rationalise).
- `ServiceStatusConstants` — `vbServiceStatusStopped`, `vbServiceStatusStartPending`, `vbServiceStatusStopPending`, `vbServiceStatusRunning`, `vbServiceStatusContinuePending`, `vbServiceStatusPausePending`, `vbServiceStatusPaused`. Same `vb` prefix.

Format pages like `WebView2/Enumerations/wv2PrintOrientation.md` — single intro paragraph, a value table with `{: #vbServiceXxx }` anchors per row for deep-linking.

The package's `index.md` walks the reader through: (1) what a Windows service is; (2) the lifecycle — configure (`Services.ConfigureNew`) → install (elevated) → run (`Services.RunServiceDispatcher` blocks the main thread, SCM launches the service thread on demand); (3) the two-thread split between `EntryPoint` and `ChangeState`; (4) integration cross-links to `WinEventLogLib` (composition-delegation idiom) and `WinNamedPipesLib` (the `ManualMessageLoopEnter` / `Leave` service-hosting idiom).
