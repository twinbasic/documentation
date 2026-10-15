---
title: CdlPRDPConstants
parent: Enumerations
grand_parent: VBComDlg Package
permalink: /tB/Packages/Contributed/VBComDlg/Enumerations/CdlPRDPConstants
---

# CdlPRDPConstants enumeration
{: .no_toc }

Selects one-sided or two-sided (duplex) printing.

The enumeration is declared inside the [**CommonDialog**](../CommonDialog) class. Its members are used without a qualifier, or with the name of the enumeration. Each member has the value of the VB6 [**PrinterObjectConstants_Duplex**](../../../VBRUN/Constants/PrinterObjectConstants_Duplex) constant of the same name without the **Cdl** prefix. The class passes the value to the printer unchanged.

The [**Duplex**](../CommonDialog#duplex) property accepts only these three members; any other value raises run-time error 380.

| Member | Value | Description |
|:-------|:------|:------------|
| **CdlPRDPSimplex**{: #CdlPRDPSimplex } | `1` | Prints on one side of the paper. This is the default of the property. |
| **CdlPRDPHorizontal**{: #CdlPRDPHorizontal } | `2` | Prints on both sides, with the pages bound on the long edge. The value is that of the Windows constant `DMDUP_VERTICAL`. |
| **CdlPRDPVertical**{: #CdlPRDPVertical } | `3` | Prints on both sides, with the pages bound on the short edge. The value is that of the Windows constant `DMDUP_HORIZONTAL`. |

## Used by

- [**CommonDialog**](../CommonDialog) class: [**Duplex**](../CommonDialog#duplex)

## See Also

- [Enumerations](.) -- all the enumerations of the package
- [CommonDialog](../CommonDialog) class
- [CdlPRORConstants](CdlPRORConstants) enumeration
