---
title: WindowState
parent: Enumerations
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Enumerations/WindowState
---
# WindowState
{: .no_toc }

The window state of a [**WaynesForm**](../WaynesForm/) --- minimized, restored to normal size, or maximized to fill its monitor. Used by [**WindowsFormOptions.WindowState**](../WaynesForm/WindowsFormOptions#windowstate); honoured once when the form is first shown.

| Constant | Value | Description |
|----------|-------|-------------|
| **tbNormal**{: #tbNormal } | 0 | The window is shown at its design-time size. The default for newly-constructed [**WindowsFormOptions**](../WaynesForm/WindowsFormOptions). |
| **tbMinimized**{: #tbMinimized } | 1 | The window is minimized to the taskbar on first display. |
| **tbMaximized**{: #tbMaximized } | 2 | The window is maximized to fill its monitor on first display. |

The three names are also the members of [**Customtate**](Customtate), and **tbNormal** is a member of [**FontWeight**](FontWeight) as well, so each name written alone is ambiguous (TB5073), even where a **WindowState** is expected. Qualify it with the enumeration's name:

```tb check_build
Dim state As WindowState = WindowState.tbMaximized
```
