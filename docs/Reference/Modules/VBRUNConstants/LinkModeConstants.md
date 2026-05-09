---
title: LinkModeConstants
parent: Constants Module
grand_parent: VBRUN Modules
permalink: /tB/Packages/VBRUN/Constants/LinkModeConstants
---
# LinkModeConstants
{: .no_toc }

DDE link-mode values for the **LinkMode** property of forms and supported controls.

| Constant | Value | Description |
|----------|-------|-------------|
| **vbLinkNone**{: #vbLinkNone } | 0 | No DDE link is active. |
| **vbLinkAutomatic**{: #vbLinkAutomatic } | 1 | The control updates whenever the source data changes. (Same value as **vbLinkSource**.) |
| **vbLinkSource**{: #vbLinkSource } | 1 | The form acts as a DDE source: changes to its controls notify any client that has linked to them. |
| **vbLinkManual**{: #vbLinkManual } | 2 | The control updates only when **LinkRequest** is called. |
| **vbLinkNotify**{: #vbLinkNotify } | 3 | A **LinkNotify** event is raised when the source data changes; the control updates only on demand. |
