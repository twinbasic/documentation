---
title: ServiceStartConstants
parent: Enumerations
grand_parent: WinServicesLib Package
permalink: /tB/Packages/WinServicesLib/Enumerations/ServiceStartConstants
---
# ServiceStartConstants
{: .no_toc }

When and how the SCM starts a service. Assigned to [**ServiceManager.InstallStartMode**](../ServiceManager#installstartmode) at configuration time; the value is captured into the SCM database by [**ServiceManager.Install**](../ServiceManager#install) and can be changed afterwards through the Services control-panel applet or `sc.exe config`.

| Constant | Value | Description |
|----------|-------|-------------|
| **tbServiceStartBoot**{: #tbServiceStartBoot }                 | 0 | Started by the boot loader at OS boot. **Kernel drivers only** — not applicable to twinBASIC services. |
| **tbServiceStartDriverSystem**{: #tbServiceStartDriverSystem } | 1 | Started by `Ntldr` / `Winload` during system initialisation. **Kernel drivers only.** |
| **tbServiceStartAuto**{: #tbServiceStartAuto }                 | 2 | Automatically started by the SCM at system boot, before any user logs in. The typical setting for a background service that should always be running. |
| **tbServiceStartOnDemand**{: #tbServiceStartOnDemand }         | 3 | Started by the SCM only when something explicitly requests it (control-panel applet, `sc.exe start`, [**Services.LaunchService**](../Services#launchservice), or a service that lists it in [**DependentServices**](../ServiceManager#dependentservices)). The default for new [**ServiceManager**](../ServiceManager) instances. |
| **tbServiceStartDisabled**{: #tbServiceStartDisabled }         | 4 | The service cannot be started until an administrator changes its start mode. Use this to deactivate a service without uninstalling it. |

For user-mode twinBASIC services, the only three values that matter in practice are [**tbServiceStartAuto**](#tbServiceStartAuto), [**tbServiceStartOnDemand**](#tbServiceStartOnDemand), and [**tbServiceStartDisabled**](#tbServiceStartDisabled).
