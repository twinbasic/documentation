---
title: HitResultConstants
parent: Constants Module
grand_parent: VBRUN Modules
permalink: /tB/Packages/VBRUN/Constants/HitResultConstants
---
# HitResultConstants
{: .no_toc }

Return values from a **UserControl**'s **HitTest** event, telling the host how the supplied point relates to the control.

| Constant | Value | Description |
|----------|-------|-------------|
| **vbHitResultOutside**{: #vbHitResultOutside } | 0 | The point is outside the control's hit-test region. |
| **vbHitResultTransparent**{: #vbHitResultTransparent } | 1 | The point is inside the control's bounds but in a transparent area; mouse input passes through to the control behind. |
| **vbHitResultClose**{: #vbHitResultClose } | 2 | The point is close to the control. |
| **vbHitResultHit**{: #vbHitResultHit } | 3 | The point is inside the control and should be treated as a hit. |
