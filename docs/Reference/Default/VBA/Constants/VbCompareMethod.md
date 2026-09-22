---
title: VbCompareMethod
parent: Constants Module
grand_parent: VBA Package
permalink: /tB/Modules/Constants/VbCompareMethod
redirect_from:
- /tB/Core/VbCompareMethod
- /tB/Core/vbBinaryCompare
- /tB/Core/vbTextCompare
- /tB/Core/vbDatabaseCompare
vba_attribution: true
---
# VbCompareMethod
{: .no_toc }

Text comparison modes used by string functions such as [**InStr**](../Strings/InStr), [**InStrRev**](../Strings/InStrRev), [**Replace**](../Strings/Replace), [**StrComp**](../Strings/StrComp), [**Filter**](../Strings/Filter), and [**Split**](../Strings/Split).

| Constant | Value | Description |
|----------|-------|-------------|
| **vbBinaryCompare**{: #vbBinaryCompare } | 0 | Performs a binary comparison. |
| **vbTextCompare**{: #vbTextCompare } | 1 | Performs a textual comparison. |
| **vbDatabaseCompare**{: #vbDatabaseCompare } | 2 | Accepted for source compatibility. Compares as **vbTextCompare** --- see the note below. |

> [!NOTE]
> **vbDatabaseCompare** has no distinct behaviour in twinBASIC. Within Microsoft Access it selects the sort order recorded in the database; outside that host there is no database to consult, so twinBASIC accepts the constant and performs a case-insensitive comparison --- the same result as [**vbTextCompare**](#vbTextCompare).
