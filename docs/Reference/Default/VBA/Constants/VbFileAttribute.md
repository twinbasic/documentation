---
title: VbFileAttribute
parent: Constants Module
grand_parent: VBA Package
permalink: /tB/Modules/Constants/VbFileAttribute
redirect_from:
- /tB/Core/VbFileAttribute
- /tB/Core/vbNormal
- /tB/Core/vbReadOnly
- /tB/Core/vbHidden
- /tB/Core/VbSystem
- /tB/Core/vbVolume
- /tB/Core/vbDirectory
- /tB/Core/vbArchive
- /tB/Core/vbAlias
vba_attribution: true
---
# VbFileAttribute
{: .no_toc }

Attribute flags for files and directories used by [**Dir**](../FileSystem/Dir), [**GetAttr**](../FileSystem/GetAttr), and [**SetAttr**](../FileSystem/SetAttr). Combine multiple flags with **Or**.

| Constant | Value | Description |
|----------|-------|-------------|
| **vbNormal**{: #vbNormal } | 0 | Normal (default for **Dir** and **SetAttr**). |
| **vbReadOnly**{: #vbReadOnly } | 1 | Read-only. |
| **vbHidden**{: #vbHidden } | 2 | Hidden. |
| **VbSystem**{: #VbSystem } | 4 | System file. |
| **vbVolume**{: #vbVolume } | 8 | Volume label. |
| **vbDirectory**{: #vbDirectory } | 16 | Directory or folder. |
| **vbArchive**{: #vbArchive } | 32 | File has changed since the last backup. |
| **vbAlias**{: #vbAlias } | 64 | Identifier is an alias (legacy Macintosh). |

### See Also

- [Dir](../FileSystem/Dir), [GetAttr](../FileSystem/GetAttr), [SetAttr](../FileSystem/SetAttr)
