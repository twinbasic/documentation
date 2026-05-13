---
title: StartupPosition
parent: Enumerations
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Enumerations/StartupPosition
---
# StartupPosition
{: .no_toc }

The initial position of a form's window when it is first shown. Carried by [**WindowsFormOptions.StartUpPosition**](../WaynesForm/WindowsFormOptions#startupposition). Honoured once, at the form's first display; subsequent moves are at the user's discretion or controlled by code.

| Constant | Value | Description |
|----------|-------|-------------|
| **tbStartUpManual**{: #tbStartUpManual } | 0 | The form uses its design-time **Left** and **Top** values. |
| **tbStartUpCenterOwner**{: #tbStartUpCenterOwner } | 1 | The form is centred over its owner window. Falls back to **tbStartUpCenterScreen** if the form has no owner. |
| **tbStartUpCenterScreen**{: #tbStartUpCenterScreen } | 2 | The form is centred on the screen. |
| **tbStartUpWindowsDefault**{: #tbStartUpWindowsDefault } | 3 | Windows chooses the position using the same cascade-from-top-left logic the OS applies to new windows. The default for newly-constructed [**WindowsFormOptions**](../WaynesForm/WindowsFormOptions). |
