---
title: CdlPRBNConstants
parent: Enumerations
grand_parent: VBComDlg Package
permalink: /tB/Packages/Contributed/VBComDlg/Enumerations/CdlPRBNConstants
---

# CdlPRBNConstants enumeration
{: .no_toc }

Selects the paper source (bin) of the printer.

The enumeration is declared inside the [**CommonDialog**](../CommonDialog) class. Its members are used without a qualifier, or with the name of the enumeration. Each member has the value of the Windows `DMBIN_` constant for the same bin, which is also the value of the VB6 [**PrinterObjectConstants_PaperBin**](../../../VBRUN/Constants/PrinterObjectConstants_PaperBin) constant of the same name without the **Cdl** prefix.

The [**PaperBin**](../CommonDialog#paperbin) property accepts these members and any other integer from 1 to 32767, so a bin that only the printer driver defines can be selected. A printer offers only some of the bins.

| Member | Value | Description |
|:-------|:------|:------------|
| **CdlPRBNUpper**{: #CdlPRBNUpper } | `1` | The upper bin. |
| **CdlPRBNLower**{: #CdlPRBNLower } | `2` | The lower bin. |
| **CdlPRBNMiddle**{: #CdlPRBNMiddle } | `3` | The middle bin. |
| **CdlPRBNManual**{: #CdlPRBNManual } | `4` | Manual feed. |
| **CdlPRBNEnvelope**{: #CdlPRBNEnvelope } | `5` | The envelope feeder. |
| **CdlPRBNEnvManual**{: #CdlPRBNEnvManual } | `6` | Manual feed of envelopes. |
| **CdlPRBNAuto**{: #CdlPRBNAuto } | `7` | The printer chooses the bin. This is the default of the property. |
| **CdlPRBNTractor**{: #CdlPRBNTractor } | `8` | The tractor feeder. |
| **CdlPRBNSmallFmt**{: #CdlPRBNSmallFmt } | `9` | The bin for small-format paper. |
| **CdlPRBNLargeFmt**{: #CdlPRBNLargeFmt } | `10` | The bin for large-format paper. |
| **CdlPRBNLargeCapacity**{: #CdlPRBNLargeCapacity } | `11` | The large-capacity bin. |
| **CdlPRBNCassette**{: #CdlPRBNCassette } | `14` | The cassette. |

## Used by

- [**CommonDialog**](../CommonDialog) class: [**PaperBin**](../CommonDialog#paperbin)

## See Also

- [Enumerations](.) -- all the enumerations of the package
- [CommonDialog](../CommonDialog) class
- [CdlPRPSConstants](CdlPRPSConstants) enumeration
