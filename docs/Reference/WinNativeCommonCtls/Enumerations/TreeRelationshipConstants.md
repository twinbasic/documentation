---
title: TreeRelationshipConstants
parent: Enumerations
grand_parent: WinNativeCommonCtls Package
permalink: /tB/Packages/WinNativeCommonCtls/Enumerations/TreeRelationshipConstants
---

# TreeRelationshipConstants
{: .no_toc }

Describes where a new node is inserted relative to an existing node. Passed as the *Relationship* parameter of [**Nodes.Add**](../TreeView/Nodes#add).

| Member               | Value | Description                                                                              |
|----------------------|-------|------------------------------------------------------------------------------------------|
| **tvwFirst**{: #tvwFirst }       | 0 | The new node becomes the first sibling of *Relative*'s parent — i.e. the leftmost peer.    |
| **tvwLast**{: #tvwLast }         | 1 | The new node becomes the last sibling of *Relative*'s parent — i.e. the rightmost peer.    |
| **tvwNext**{: #tvwNext }         | 2 | The new node is inserted immediately after *Relative*, as its next sibling.               |
| **tvwPrevious**{: #tvwPrevious } | 3 | The new node is inserted immediately before *Relative*, as its previous sibling.          |
| **tvwChild**{: #tvwChild }       | 4 | The new node becomes a child of *Relative*.                                               |

## See Also

- [TreeView](../TreeView/) -- consumer
- [Nodes.Add](../TreeView/Nodes#add) -- the consuming method
