---
title: QueryUnloadConstants
parent: Constants Module
grand_parent: VBRUN Modules
permalink: /tB/Packages/VBRUN/Constants/QueryUnloadConstants
---
# QueryUnloadConstants
{: .no_toc }

Reason codes reported in the *UnloadMode* argument of a form's **QueryUnload** event, identifying what triggered the unload.

| Constant | Value | Description |
|----------|-------|-------------|
| **vbFormControlMenu**{: #vbFormControlMenu } | 0 | The user clicked the form's Close button (or selected Close from its system menu). |
| **vbFormCode**{: #vbFormCode } | 1 | The unload was initiated by code calling **Unload**. |
| **vbAppWindows**{: #vbAppWindows } | 2 | Windows is shutting down. |
| **vbAppTaskManager**{: #vbAppTaskManager } | 3 | The application is being closed by Task Manager. |
| **vbFormMDIForm**{: #vbFormMDIForm } | 4 | The MDI parent form is being unloaded. |
| **vbFormOwner**{: #vbFormOwner } | 5 | The owner form is being unloaded. |
