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

Order matters when more than one sibling is docked inside the same container: each docked control claims its edge from whatever client area remains *after* its earlier-added siblings have claimed theirs. The control with **Dock = tbDockFill** is therefore added last so that it inherits the residual space:

```tb
Private Sub Form_Load()
    lblHeader.Dock = tbDockTop      ' pinned to the top, full width
    lblStatus.Dock = tbDockBottom   ' pinned to the bottom, full width
    pnlTree.Dock   = tbDockLeft     ' pinned to the left, between header and status
    pnlAside.Dock  = tbDockRight    ' pinned to the right, between header and status
    pnlMain.Dock   = tbDockFill     ' fills whatever is left in the middle
End Sub
```

Setting **Dock** to anything other than **tbDockNone** makes the control's own [**Anchors**](../Styles/Anchors) irrelevant — docking takes over the position and size completely. To return to manual positioning, set **Dock** back to **tbDockNone**.
