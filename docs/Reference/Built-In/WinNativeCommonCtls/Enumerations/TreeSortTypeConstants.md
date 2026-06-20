---
title: TreeSortTypeConstants
parent: Enumerations
grand_parent: WinNativeCommonCtls Package
permalink: /tB/Packages/WinNativeCommonCtls/Enumerations/TreeSortTypeConstants
---

# TreeSortTypeConstants
{: .no_toc }

The string comparison enumeration used by [**TreeView.SortType**](../TreeView/#sorttype) and [**Node.SortType**](../TreeView/Node#sorttype). Selects between case-sensitive and case-insensitive sorting.

| Member             | Value | Description                                                                         |
|--------------------|-------|-------------------------------------------------------------------------------------|
| **tvwBinary**{: #tvwBinary } | 0 | Case-sensitive comparison; uses `lstrcmpW` (binary Unicode order). |
| **tvwText**{: #tvwText }     | 1 | Case-insensitive comparison; uses `lstrcmpiW`.                       |

## See Also

- [TreeView](../TreeView/) -- consumer
- [Node](../TreeView/Node) -- consumer (per-subtree sorting)
- [TreeSortOrderConstants](TreeSortOrderConstants) -- the companion enum selecting ascending / descending
