---
title: OLEDropEffectConstants
parent: Constants Module
grand_parent: VBRUN Package
permalink: /tB/Packages/VBRUN/Constants/OLEDropEffectConstants
---
# OLEDropEffectConstants
{: .no_toc }

Bit flags for the *Effect* argument of OLE drag-and-drop events, controlling what the source and target want the drop to do.

| Constant | Value | Description |
|----------|-------|-------------|
| **vbDropEffectNone**{: #vbDropEffectNone } | 0 | The drop is not allowed. |
| **vbDropEffectCopy**{: #vbDropEffectCopy } | 1 | The data should be copied to the target. |
| **vbDropEffectMove**{: #vbDropEffectMove } | 2 | The data should be moved to the target --- the source removes it after a successful drop. |
| **vbDropEffectLink**{: #vbDropEffectLink } | 4 | A link to the data should be created at the target. *(twinBASIC addition.)* |
| **vbDropEffectScroll**{: #vbDropEffectScroll } | -2147483648 | The target is scrolling because the cursor is near its edge. |

> [!NOTE]
> Available only when the **FEATURE_OLEDRAGDROP** feature is enabled.
