---
title: CdlPRORConstants
parent: Enumerations
grand_parent: VBComDlg Package
permalink: /tB/Packages/Contributed/VBComDlg/Enumerations/CdlPRORConstants
---

# CdlPRORConstants enumeration
{: .no_toc }

Selects the orientation of the paper.

The enumeration is declared inside the [**CommonDialog**](../CommonDialog) class. Its members are used without a qualifier, or with the name of the enumeration. Each member has the value of the Windows `DMORIENT_` constant of the same meaning, which is also the value of the VB6 [**PrinterObjectConstants_Orientation**](../../../VBRUN/Constants/PrinterObjectConstants_Orientation) constant of the same name without the **Cdl** prefix.

The [**Orientation**](../CommonDialog#orientation) property accepts only these two members; any other value raises run-time error 380.

| Member | Value | Description |
|:-------|:------|:------------|
| **CdlPRORPortrait**{: #CdlPRORPortrait } | `1` | Portrait: the paper is taller than it is wide. This is the default of the property. |
| **CdlPRORLandscape**{: #CdlPRORLandscape } | `2` | Landscape: the paper is wider than it is tall. |

## Used by

- [**CommonDialog**](../CommonDialog) class: [**Orientation**](../CommonDialog#orientation)

## See Also

- [Enumerations](.) -- all the enumerations of the package
- [CommonDialog](../CommonDialog) class
- [CdlPRPSConstants](CdlPRPSConstants) enumeration
