---
title: CdlPRPQConstants
parent: Enumerations
grand_parent: VBComDlg Package
permalink: /tB/Packages/Contributed/VBComDlg/Enumerations/CdlPRPQConstants
---

# CdlPRPQConstants enumeration
{: .no_toc }

Presets for the print quality (the resolution) of the printer.

The enumeration is declared inside the [**CommonDialog**](../CommonDialog) class. Its members are used without a qualifier, or with the name of the enumeration. Each member has the value of the Windows `DMRES_` constant of the same meaning, which is also the value of the VB6 [**PrinterObjectConstants_PrintQuality**](../../../VBRUN/Constants/PrinterObjectConstants_PrintQuality) constant of the same name without the **Cdl** prefix. The values are negative, because a positive value is a resolution in dots per inch.

The [**PrintQuality**](../CommonDialog#printquality) property accepts these members, and also an integer from 0 to 32767, which is a resolution in dots per inch. Any other value raises run-time error 380.

| Member | Value | Description |
|:-------|:------|:------------|
| **CdlPRPQHigh**{: #CdlPRPQHigh } | `-4` | High quality. This is the default of the property. |
| **CdlPRPQMedium**{: #CdlPRPQMedium } | `-3` | Medium quality. |
| **CdlPRPQLow**{: #CdlPRPQLow } | `-2` | Low quality. |
| **CdlPRPQDraft**{: #CdlPRPQDraft } | `-1` | Draft quality, the lowest. |

## Used by

- [**CommonDialog**](../CommonDialog) class: [**PrintQuality**](../CommonDialog#printquality)

## See Also

- [Enumerations](.) -- all the enumerations of the package
- [CommonDialog](../CommonDialog) class
- [CdlPRCMConstants](CdlPRCMConstants) enumeration
