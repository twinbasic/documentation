---
title: BorderStyle
parent: Enumerations
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Enumerations/BorderStyle
---
# BorderStyle
{: .no_toc }

The Win32 frame style used by a [**WaynesForm**](../WaynesForm/) window. Determines whether the window has a thick or thin border, whether it can be resized by dragging an edge, and whether it shows a normal title bar or the smaller tool-window title bar. Carried by [**WindowsFormOptions.BorderStyle**](../WaynesForm/WindowsFormOptions#borderstyle).

| Constant | Value | Description |
|----------|-------|-------------|
| **tbNone**{: #tbNone } | 0 | No border at all — the form is a borderless, captionless rectangle. |
| **tbFixedSingle**{: #tbFixedSingle } | 1 | Thin single-line border; size is fixed at run time. |
| **tbFixedSizable**{: #tbFixedSizable } | 2 | Standard resizable border with a normal title bar. The default for newly-constructed [**WindowsFormOptions**](../WaynesForm/WindowsFormOptions). |
| **tbFixedDialog**{: #tbFixedDialog } | 3 | Dialog-frame border; size is fixed and the system menu offers only **Move** / **Close**. |
| **tbFixedToolWindow**{: #tbFixedToolWindow } | 4 | Tool-window border with the smaller title bar; size is fixed. |
| **tbSizableToolWindow**{: #tbSizableToolWindow } | 5 | Tool-window border with the smaller title bar; the window is resizable. |

Most border styles cannot be combined with **MinimizeButton** or **MaximizeButton** — only **tbFixedSizable** shows full sizing controls. Setting [**MinimizeButton**](../WaynesForm/WindowsFormOptions#minimizebutton) or [**MaximizeButton**](../WaynesForm/WindowsFormOptions#maximizebutton) to **True** on a window style that does not include them has no effect.
