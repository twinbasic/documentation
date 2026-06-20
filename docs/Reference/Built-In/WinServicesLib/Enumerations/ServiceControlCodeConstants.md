---
title: ServiceControlCodeConstants
parent: Enumerations
grand_parent: WinServicesLib Package
permalink: /tB/Packages/WinServicesLib/Enumerations/ServiceControlCodeConstants
---
# ServiceControlCodeConstants
{: .no_toc }

The control codes the SCM can deliver to a running service. Used as the *dwControl* parameter of [**ITbService.ChangeState**](../ITbService#changestate) (where the service reacts to the request) and as the *ControlCode* parameter of [**Services.ControlService**](../Services#controlservice) (where the consumer issues the request to a service running elsewhere).

The values mirror the Win32 `SERVICE_CONTROL_*` constants verbatim --- the `vb` prefix is a historical hold-over from VB6's coding conventions and does not affect the numeric values.

| Constant | Value | Description |
|----------|-------|-------------|
| **vbServiceControlStop**{: #vbServiceControlStop }                                   | 0x01 | Request the service stop. The standard shutdown signal --- every service should handle this in [**ChangeState**](../ITbService#changestate). |
| **vbServiceControlPause**{: #vbServiceControlPause }                                 | 0x02 | Pause the service. Only delivered if [**ServiceManager.SupportsPausing**](../ServiceManager#supportspausing) is **True**. |
| **vbServiceControlContinue**{: #vbServiceControlContinue }                           | 0x03 | Resume a paused service. Paired with [**vbServiceControlPause**](#vbServiceControlPause). |
| **vbServiceControlInterrogate**{: #vbServiceControlInterrogate }                     | 0x04 | The SCM is asking the service to re-report its current state via [**ReportStatus**](../ServiceManager#reportstatus). A bare-minimum handler can ignore it --- the SCM already has the most recent status from the previous call. |
| **vbServiceControlShutdown**{: #vbServiceControlShutdown }                           | 0x05 | The OS is shutting down. Most services treat this identically to [**vbServiceControlStop**](#vbServiceControlStop). |
| **vbServiceControlParamChange**{: #vbServiceControlParamChange }                     | 0x06 | An admin has changed the service's configuration via `sc.exe config`. Delivered only if the service registered `SERVICE_ACCEPT_PARAMCHANGE` --- currently not exposed through the package. |
| **vbServiceControlNetBindAdd**{: #vbServiceControlNetBindAdd }                       | 0x07 | A new network binding is available. Delivered only if `SERVICE_ACCEPT_NETBINDCHANGE` is accepted --- currently not exposed. |
| **vbServiceControlNetBindRemove**{: #vbServiceControlNetBindRemove }                 | 0x08 | A network binding has been removed. |
| **vbServiceControlNetBindEnable**{: #vbServiceControlNetBindEnable }                 | 0x09 | A previously disabled network binding has been enabled. |
| **vbServiceControlNetBindDisable**{: #vbServiceControlNetBindDisable }               | 0x0A | A network binding has been disabled. |
| **vbServiceControlDeviceEvent**{: #vbServiceControlDeviceEvent }                     | 0x0B | A device-arrival / -removal event. The *dwEventType* and *lpEventData* parameters of [**ChangeState**](../ITbService#changestate) hold the `DBT_*` sub-code and `DEV_BROADCAST_HDR` data. Only delivered when the service has accepted `SERVICE_ACCEPT_HARDWAREPROFILECHANGE`. |
| **vbServiceControlHardwareProfileChange**{: #vbServiceControlHardwareProfileChange } | 0x0C | A hardware-profile change (laptop docking, …). |
| **vbServiceControlPowerEvent**{: #vbServiceControlPowerEvent }                       | 0x0D | A system power event (suspend, resume, battery low, …). The *dwEventType* parameter holds the `PBT_*` sub-code. |
| **vbServiceControlSessionChange**{: #vbServiceControlSessionChange }                 | 0x0E | A session-change event (user logon, RDP connect / disconnect, …). The *dwEventType* parameter holds the `WTS_*` sub-code. |
| **vbServiceControlPreShutdown**{: #vbServiceControlPreShutdown }                     | 0x0F | The OS is about to shut down --- sent before [**vbServiceControlShutdown**](#vbServiceControlShutdown) to services that have registered for the longer pre-shutdown notification window. |
| **vbServiceControlTimeChange**{: #vbServiceControlTimeChange }                       | 0x10 | The system time has changed. |
| **vbServiceControlTriggerEvent**{: #vbServiceControlTriggerEvent }                   | 0x20 | A registered trigger event has fired (typically used by trigger-started services). |
| **vbServiceControlLowResources**{: #vbServiceControlLowResources }                   | 0x60 | The service should reduce its memory / CPU footprint. |
| **vbServiceControlSystemLowResources**{: #vbServiceControlSystemLowResources }       | 0x61 | The whole system is low on resources. |

Control codes in the range **128--255** are reserved for user-defined codes; pass any value in that range to [**Services.ControlService**](../Services#controlservice) and the package will request the matching `SERVICE_USER_DEFINED_CONTROL` SCM permission. Most services only need to handle [**vbServiceControlStop**](#vbServiceControlStop) and optionally the pause / continue pair.
