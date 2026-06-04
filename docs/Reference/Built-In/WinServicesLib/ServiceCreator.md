---
title: ServiceCreator
parent: WinServicesLib Package
permalink: /tB/Packages/WinServicesLib/ServiceCreator
has_toc: false
---

# ServiceCreator(Of T) class
{: .no_toc }

The generic factory the **WinServicesLib** dispatcher uses to instantiate the user's service class when the SCM launches a service. *T* is the user's [**ITbService**](ITbService) implementation; **ServiceCreator(Of T)** wraps `New T` in a factory the dispatcher can hold by interface.

Syntax: **New ServiceCreator(Of** *T* **)**

*T*
: *required* A user class that implements [**ITbService**](ITbService). The constraint is practical rather than syntactic --- there is no `Where T : ITbService` clause in the source, but the factory's `CreateInstance` returns `New T As ITbService`, which the compiler only accepts when *T* implements [**ITbService**](ITbService).

The class is the value typically assigned to [**ServiceManager.InstanceCreator**](ServiceManager#instancecreator):

```tb
With Services.ConfigureNew
    .Name             = "MyService"
    .InstanceCreator  = New ServiceCreator(Of MyService)    ' MyService Implements ITbService
End With
```

The package keeps the factory by reference; the dispatcher trampoline calls [**CreateInstance**](#createinstance) once per service start, immediately after the SCM has spawned the service thread. The returned instance is the object whose [**EntryPoint**](ITbService#entrypoint), [**StartupFailed**](ITbService#startupfailed), and [**ChangeState**](ITbService#changestate) methods the package will route to.

See the package [overview](.) for where **ServiceCreator** fits in the broader lifecycle.

* TOC
{:toc}

## Methods

### CreateInstance
{: .no_toc }

Returns a fresh `New T` cast as [**ITbService**](ITbService).

Syntax: *creator*.**CreateInstance** **As** [**ITbService**](ITbService)

User code rarely calls **CreateInstance** directly; the package's dispatcher trampoline invokes it once per service start. The returned instance is owned by the dispatcher for the lifetime of the service --- it is released when the service stops or the dispatcher exits.

The method has no parameters. If the user's service class needs configuration, it should read it from the [**ServiceManager**](ServiceManager) passed to [**EntryPoint**](ITbService#entrypoint) rather than from constructor arguments.

## Why a factory rather than a class reference

`ServiceCreator(Of T)` exists because the SCM dispatch model needs deferred instantiation. The configuration phase runs in `Sub Main` before the SCM has decided which services to start; constructing the service class eagerly there would create an unnecessary instance for services the SCM may never launch (or launch only much later). The factory defers the `New T` call until the service actually starts.

The same indirection lets the dispatcher pair the [**ITbService**](ITbService) instance with the [**ServiceManager**](ServiceManager) one-to-one --- the trampoline can pass the service-specific [**ServiceManager**](ServiceManager) into [**EntryPoint**](ITbService#entrypoint) without the service class having to know about the manager at construction time.

### Example

This example shows the complete setup for a single-service EXE. `MyService` implements [**ITbService**](ITbService); a `ServiceCreator(Of MyService)` factory is assigned to `InstanceCreator` during configuration so the dispatcher can call **CreateInstance** when the SCM starts the service.

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

## See Also

- [WinServicesLib package](.) -- overview, lifecycle, two-thread split
- [ITbService interface](ITbService) -- the contract *T* must implement
- [ServiceManager class](ServiceManager) -- the per-service configuration; **ServiceCreator** instances are assigned to its [**InstanceCreator**](ServiceManager#instancecreator) field
