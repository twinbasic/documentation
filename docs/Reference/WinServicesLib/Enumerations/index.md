---
title: Enumerations
parent: WinServicesLib Package
permalink: /tB/Packages/WinServicesLib/Enumerations/
has_toc: false
---

# Enumerations

The four user-facing enumerations the **WinServicesLib** package exposes. All four come from the public `ServicesConstantsPublic` module in the package source; the larger surface of internal `SERVICE_*` constants the source uses to call into `advapi32.dll` lives in a `Private Module` and is not part of the public API.

| Enumeration | Used by |
|-------------|---------|
| [ServiceTypeConstants](ServiceTypeConstants) | [**ServiceManager.Type**](../ServiceManager#type), [**ServiceState.Type**](../ServiceState#type) |
| [ServiceStartConstants](ServiceStartConstants) | [**ServiceManager.InstallStartMode**](../ServiceManager#installstartmode) |
| [ServiceControlCodeConstants](ServiceControlCodeConstants) | [**Services.ControlService**](../Services#controlservice), the *dwControl* parameter of [**ITbService.ChangeState**](../ITbService#changestate) |
| [ServiceStatusConstants](ServiceStatusConstants) | [**ServiceManager.ReportStatus**](../ServiceManager#reportstatus) |

The member-name prefixes are inherited from the underlying Win32 SDK constants — `tb…` on the *configuration* enums ([**ServiceTypeConstants**](ServiceTypeConstants), [**ServiceStartConstants**](ServiceStartConstants)) and `vb…` on the *runtime* enums ([**ServiceControlCodeConstants**](ServiceControlCodeConstants), [**ServiceStatusConstants**](ServiceStatusConstants)). The split is not deliberate; treat the prefixes as part of the member names and ignore the asymmetry.
