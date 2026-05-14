---
title: TreeLineStyleConstants
parent: Enumerations
grand_parent: WinNativeCommonCtls Package
permalink: /tB/Packages/WinNativeCommonCtls/Enumerations/TreeLineStyleConstants
---

# TreeLineStyleConstants
{: .no_toc }

Controls whether the [**TreeView**](../TreeView/) draws tree lines from root nodes or only from child nodes. Carried by [**TreeView.LineStyle**](../TreeView/#linestyle). Only has visible effect when [**Style**](../TreeView/#style) is one of the **tvwTreelines…** variants.

| Member                | Value | Description                                                                |
|-----------------------|-------|----------------------------------------------------------------------------|
| **tvwTreeLines**{: #tvwTreeLines } | 0 | Tree lines connect children to their parents but not root-level peers. |
| **tvwRootLines**{: #tvwRootLines } | 1 | Tree lines connect root-level nodes to each other as well as child connections. |

## See Also

- [TreeView](../TreeView/) -- consumer
- [TreeStyleConstants](TreeStyleConstants) -- governs whether tree lines appear at all
