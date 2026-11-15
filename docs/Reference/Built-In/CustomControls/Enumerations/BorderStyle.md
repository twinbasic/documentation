---
title: BorderStyle
parent: Enumerations
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Enumerations/BorderStyle
---
# BorderStyle
{: .no_toc }

The Win32 frame style used by a [**WaynesForm**](../WaynesForm/) window. Determines whether the window has a thick or thin border, whether it can be resized by dragging an edge, and whether it shows a normal title bar or the smaller tool-window title bar. Used by [**WindowsFormOptions.BorderStyle**](../WaynesForm/WindowsFormOptions#borderstyle).

| Constant | Value | Description |
|----------|-------|-------------|
| **tbNone**{: #tbNone } | 0 | No border at all --- the form is a borderless, captionless rectangle. |
| **tbFixedSingle**{: #tbFixedSingle } | 1 | Thin single-line border; size is fixed at run time. |
| **tbFixedSizable**{: #tbFixedSizable } | 2 | Standard resizable border with a normal title bar. The default for newly-constructed [**WindowsFormOptions**](../WaynesForm/WindowsFormOptions). |
| **tbFixedDialog**{: #tbFixedDialog } | 3 | Dialog-frame border; size is fixed. |
| **tbFixedToolWindow**{: #tbFixedToolWindow } | 4 | Tool-window border with the smaller title bar; size is fixed. |
| **tbSizableToolWindow**{: #tbSizableToolWindow } | 5 | Tool-window border with the smaller title bar; the window is resizable. |

The **Minimize** and **Maximize** buttons that [**MinimizeButton**](../WaynesForm/WindowsFormOptions#minimizebutton) and [**MaximizeButton**](../WaynesForm/WindowsFormOptions#maximizebutton) ask for are shown by **tbFixedSingle**, **tbFixedSizable** and **tbFixedDialog**. The two tool-window styles show only a **Close** button, and **tbNone** has no title bar at all.

Six forms, one in each style, each with **MinimizeButton** and **MaximizeButton** set to **True**:

![Six forms: tbNone with no border or title bar; tbFixedSingle, tbFixedSizable and tbFixedDialog with a title bar holding the minimize, maximize and close buttons; and tbFixedToolWindow and tbSizableToolWindow with a lower title bar holding only a close button](Images/BorderStyle.png){:width="905" height="317"}
