---
title: ServiceTypeConstants
parent: Enumerations
grand_parent: WinServicesLib Package
permalink: /tB/Packages/WinServicesLib/Enumerations/ServiceTypeConstants
---
# ServiceTypeConstants
{: .no_toc }

The Win32 service-type values. Read into [**ServiceManager.Type**](../ServiceManager#type) at configuration time and reported back by the SCM through [**ServiceState.Type**](../ServiceState#type) at query time. Determines whether the service runs in its own process, in a shared host process, or is a kernel driver — and, historically, whether it can interact with the desktop.

| Constant | Value | Description |
|----------|-------|-------------|
| **tbServiceTypeKernelDriver**{: #tbServiceTypeKernelDriver }                | 1   | A kernel-mode driver. **Not applicable** to twinBASIC services — kernel drivers are written in C and built against the Windows DDK. |
| **tbServiceTypeSystemDriver**{: #tbServiceTypeSystemDriver }                | 2   | A file-system kernel driver. Same caveat as above. |
| **tbServiceTypeAdapter**{: #tbServiceTypeAdapter }                          | 4   | Legacy adapter service (network-adapter binding). Not used by modern services. |
| **tbServiceTypeRecognizerDriver**{: #tbServiceTypeRecognizerDriver }        | 8   | A file-system-recognizer driver. Kernel-only. |
| **tbServiceTypeOwnProcess**{: #tbServiceTypeOwnProcess }                    | 16  | The service runs in its own dedicated EXE process. The typical setting for a one-service EXE. |
| **tbServiceTypeShareProcess**{: #tbServiceTypeShareProcess }                | 32  | The service runs alongside other services in a shared host EXE. Used when one EXE hosts multiple distinct services (`ConfigureNew` called more than once); the SCM keeps a single process alive that serves all of them. |
| **tbServiceTypeOwnProcessInteractive**{: #tbServiceTypeOwnProcessInteractive }     | 272 | `tbServiceTypeOwnProcess` with the interactive bit (`SERVICE_INTERACTIVE_PROCESS`) set. **Not supported on Windows Vista and later** — see note below. |
| **tbServiceTypeShareProcessInteractive**{: #tbServiceTypeShareProcessInteractive } | 288 | `tbServiceTypeShareProcess` with the interactive bit set. Same caveat as above. |

> [!NOTE]
> Windows Vista and later run services in *Session 0*, which has no user desktop and no message-loop interaction with logged-in users — the `SERVICE_INTERACTIVE_PROCESS` flag is **silently ignored**. The `Interactive` constants are kept in the enum for compatibility, but services that need user-interface elements should use a separate UI process (launched via the Services package or via inter-process communication) rather than the interactive-service mechanism.

For user-mode twinBASIC services, the only two values that matter in practice are [**tbServiceTypeOwnProcess**](#tbServiceTypeOwnProcess) and [**tbServiceTypeShareProcess**](#tbServiceTypeShareProcess).
