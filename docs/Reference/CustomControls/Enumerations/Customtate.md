---
title: Customtate
parent: Enumerations
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Enumerations/Customtate
---
# Customtate
{: .no_toc }

> [!NOTE]
> The name **Customtate** appears to be a typo for "CustomState" preserved from an early draft of the package. The enum is not referenced by any of the eight concrete `Waynes…` controls; the actual minimized / normal / maximized state of a [**WaynesForm**](../WaynesForm/) is driven by the parallel [**WindowState**](WindowState) enum, which carries identical members. Treat **Customtate** as reserved.

A reserved enumeration with the same three members as [**WindowState**](WindowState). Defined in `Module Constants` of the **CustomControls DESIGNER** library, exported as **Public**, but otherwise unused inside the package.

| Constant | Value | Description |
|----------|-------|-------------|
| **tbNormal**{: #tbNormal } | 0 | Same value as [**WindowState.tbNormal**](WindowState#tbNormal). |
| **tbMinimized**{: #tbMinimized } | 1 | Same value as [**WindowState.tbMinimized**](WindowState#tbMinimized). |
| **tbMaximized**{: #tbMaximized } | 2 | Same value as [**WindowState.tbMaximized**](WindowState#tbMaximized). |
