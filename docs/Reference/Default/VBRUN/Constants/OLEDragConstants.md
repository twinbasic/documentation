---
title: OLEDragConstants
parent: Constants Module
grand_parent: VBRUN Package
permalink: /tB/Packages/VBRUN/Constants/OLEDragConstants
---
# OLEDragConstants
{: .no_toc }

Mode values for the **OLEDragMode** property of a control, controlling whether OLE drag operations start automatically or only on demand.

| Constant | Value | Description |
|----------|-------|-------------|
| **vbOLEDragManual**{: #vbOLEDragManual } | 0 | OLE dragging starts only when the control's **OLEDrag** method is called from code. |
| **vbOLEDragAutomatic**{: #vbOLEDragAutomatic } | 1 | OLE dragging starts automatically when the user begins to drag the control. |

> [!NOTE]
> Available only when the **FEATURE_OLEDRAGDROP** feature is enabled.
