---
title: TreeLabelEditConstants
parent: Enumerations
grand_parent: WinNativeCommonCtls Package
permalink: /tB/Packages/WinNativeCommonCtls/Enumerations/TreeLabelEditConstants
---

# TreeLabelEditConstants
{: .no_toc }

Controls when inline label editing is triggered on a [**TreeView**](../TreeView/). Carried by [**TreeView.LabelEdit**](../TreeView/#labeledit).

| Member               | Value | Description                                                                       |
|----------------------|-------|-----------------------------------------------------------------------------------|
| **tvwAutomatic**{: #tvwAutomatic } | 0 | Clicking an already-selected node opens the inline editor (after a short pause). |
| **tvwManual**{: #tvwManual }       | 1 | Only programmatic [**StartLabelEdit**](../TreeView/#startlabeledit) calls open the editor. |
| **tvwDisabled**{: #tvwDisabled }   | 2 | Label editing is disabled.                                                       |

## See Also

- [TreeView](../TreeView/) -- consumer
