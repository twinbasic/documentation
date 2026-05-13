---
title: DockMode
parent: Enumerations
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Enumerations/DockMode
---
# DockMode
{: .no_toc }

How a control is positioned relative to its container — pinned to one edge, filling the whole client area, or not docked at all (positioned absolutely by [**Left**](../#controls) / [**Top**](../#controls) / [**Width**](../#controls) / [**Height**](../#controls)). Carried by the **Dock** property that every concrete custom control inherits.

| Constant | Value | Description |
|----------|-------|-------------|
| **tbDockNone**{: #tbDockNone } | 0 | Not docked. The control's **Left**, **Top**, **Width**, and **Height** are used directly, modulated by the control's [**Anchors**](../Styles/Anchors) when the container resizes. |
| **tbDockLeft**{: #tbDockLeft } | 1 | Pinned to the container's left edge. Width is preserved; height is stretched to the container's client area. |
| **tbDockTop**{: #tbDockTop } | 2 | Pinned to the container's top edge. Height is preserved; width is stretched. |
| **tbDockRight**{: #tbDockRight } | 3 | Pinned to the container's right edge. Width is preserved; height is stretched. |
| **tbDockBottom**{: #tbDockBottom } | 4 | Pinned to the container's bottom edge. Height is preserved; width is stretched. |
| **tbDockFill**{: #tbDockFill } | 5 | Fills the entire remaining client area, after other docked siblings have claimed their edges. |
