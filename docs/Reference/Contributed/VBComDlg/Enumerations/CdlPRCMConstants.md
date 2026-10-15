---
title: CdlPRCMConstants
parent: Enumerations
grand_parent: VBComDlg Package
permalink: /tB/Packages/Contributed/VBComDlg/Enumerations/CdlPRCMConstants
---

# CdlPRCMConstants enumeration
{: .no_toc }

Selects monochrome or color printing.

The enumeration is declared inside the [**CommonDialog**](../CommonDialog) class. Its members are used without a qualifier, or with the name of the enumeration. Each member has the value of the Windows `DMCOLOR_` constant of the same meaning, which is also the value of the VB6 [**PrinterObjectConstants_ColorMode**](../../../VBRUN/Constants/PrinterObjectConstants_ColorMode) constant of the same name without the **Cdl** prefix.

The [**ColorMode**](../CommonDialog#colormode) property accepts only these two members; any other value raises run-time error 380.

| Member | Value | Description |
|:-------|:------|:------------|
| **CdlPRCMMonochrome**{: #CdlPRCMMonochrome } | `1` | Prints in monochrome. |
| **CdlPRCMColor**{: #CdlPRCMColor } | `2` | Prints in color. This is the default of the property. |

## Used by

- [**CommonDialog**](../CommonDialog) class: [**ColorMode**](../CommonDialog#colormode)

## See Also

- [Enumerations](.) -- all the enumerations of the package
- [CommonDialog](../CommonDialog) class
