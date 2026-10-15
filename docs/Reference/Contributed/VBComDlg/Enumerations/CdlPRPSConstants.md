---
title: CdlPRPSConstants
parent: Enumerations
grand_parent: VBComDlg Package
permalink: /tB/Packages/Contributed/VBComDlg/Enumerations/CdlPRPSConstants
---

# CdlPRPSConstants enumeration
{: .no_toc }

Selects the paper size.

The enumeration is declared inside the [**CommonDialog**](../CommonDialog) class. Its members are used without a qualifier, or with the name of the enumeration. Each member has the value of the Windows `DMPAPER_` constant for the same size, which is also the value of the VB6 [**PrinterObjectConstants_PaperSize**](../../../VBRUN/Constants/PrinterObjectConstants_PaperSize) constant of the same name without the **Cdl** prefix.

The [**PaperSize**](../CommonDialog#papersize) property accepts these members and any other integer from 1 to 32767, so a size that only the printer driver defines can be selected. A printer supports only some of the sizes. Without an assignment, the property is **CdlPRPSA4** on a system with the metric measurement system and **CdlPRPSLetter** on a US system.

| Member | Value | Description |
|:-------|:------|:------------|
| **CdlPRPSLetter**{: #CdlPRPSLetter } | `1` | Letter, 8.5 x 11 in. |
| **CdlPRPSLetterSmall**{: #CdlPRPSLetterSmall } | `2` | Letter Small, 8.5 x 11 in. |
| **CdlPRPSTabloid**{: #CdlPRPSTabloid } | `3` | Tabloid, 11 x 17 in. |
| **CdlPRPSLedger**{: #CdlPRPSLedger } | `4` | Ledger, 17 x 11 in. |
| **CdlPRPSLegal**{: #CdlPRPSLegal } | `5` | Legal, 8.5 x 14 in. |
| **CdlPRPSStatement**{: #CdlPRPSStatement } | `6` | Statement, 5.5 x 8.5 in. |
| **CdlPRPSExecutive**{: #CdlPRPSExecutive } | `7` | Executive, 7.25 x 10.5 in. |
| **CdlPRPSA3**{: #CdlPRPSA3 } | `8` | A3, 297 x 420 mm. |
| **CdlPRPSA4**{: #CdlPRPSA4 } | `9` | A4, 210 x 297 mm. |
| **CdlPRPSA4Small**{: #CdlPRPSA4Small } | `10` | A4 Small, 210 x 297 mm. |
| **CdlPRPSA5**{: #CdlPRPSA5 } | `11` | A5, 148 x 210 mm. |
| **CdlPRPSB4**{: #CdlPRPSB4 } | `12` | B4 (JIS), 250 x 354 mm. |
| **CdlPRPSB5**{: #CdlPRPSB5 } | `13` | B5 (JIS), 182 x 257 mm. |
| **CdlPRPSFolio**{: #CdlPRPSFolio } | `14` | Folio, 8.5 x 13 in. |
| **CdlPRPSQuarto**{: #CdlPRPSQuarto } | `15` | Quarto, 215 x 275 mm. |
| **CdlPRPS10x14**{: #CdlPRPS10x14 } | `16` | 10 x 14 in. |
| **CdlPRPS11x17**{: #CdlPRPS11x17 } | `17` | 11 x 17 in. |
| **CdlPRPSNote**{: #CdlPRPSNote } | `18` | Note, 8.5 x 11 in. |
| **CdlPRPSEnv9**{: #CdlPRPSEnv9 } | `19` | Envelope #9, 3.875 x 8.875 in. |
| **CdlPRPSEnv10**{: #CdlPRPSEnv10 } | `20` | Envelope #10, 4.125 x 9.5 in. |
| **CdlPRPSEnv11**{: #CdlPRPSEnv11 } | `21` | Envelope #11, 4.5 x 10.375 in. |
| **CdlPRPSEnv12**{: #CdlPRPSEnv12 } | `22` | Envelope #12, 4.75 x 11 in. |
| **CdlPRPSEnv14**{: #CdlPRPSEnv14 } | `23` | Envelope #14, 5 x 11.5 in. |
| **CdlPRPSCSheet**{: #CdlPRPSCSheet } | `24` | C size sheet. |
| **CdlPRPSDSheet**{: #CdlPRPSDSheet } | `25` | D size sheet. |
| **CdlPRPSESheet**{: #CdlPRPSESheet } | `26` | E size sheet. |
| **CdlPRPSEnvDL**{: #CdlPRPSEnvDL } | `27` | Envelope DL, 110 x 220 mm. |
| **CdlPRPSEnvC5**{: #CdlPRPSEnvC5 } | `28` | Envelope C5, 162 x 229 mm. |
| **CdlPRPSEnvC3**{: #CdlPRPSEnvC3 } | `29` | Envelope C3, 324 x 458 mm. |
| **CdlPRPSEnvC4**{: #CdlPRPSEnvC4 } | `30` | Envelope C4, 229 x 324 mm. |
| **CdlPRPSEnvC6**{: #CdlPRPSEnvC6 } | `31` | Envelope C6, 114 x 162 mm. |
| **CdlPRPSEnvC65**{: #CdlPRPSEnvC65 } | `32` | Envelope C65, 114 x 229 mm. |
| **CdlPRPSEnvB4**{: #CdlPRPSEnvB4 } | `33` | Envelope B4, 250 x 353 mm. |
| **CdlPRPSEnvB5**{: #CdlPRPSEnvB5 } | `34` | Envelope B5, 176 x 250 mm. |
| **CdlPRPSEnvB6**{: #CdlPRPSEnvB6 } | `35` | Envelope B6, 176 x 125 mm. |
| **CdlPRPSEnvItaly**{: #CdlPRPSEnvItaly } | `36` | Italian envelope, 110 x 230 mm. |
| **CdlPRPSEnvMonarch**{: #CdlPRPSEnvMonarch } | `37` | Envelope Monarch, 3.875 x 7.5 in. |
| **CdlPRPSEnvPersonal**{: #CdlPRPSEnvPersonal } | `38` | Envelope Personal, 3.625 x 6.5 in. |
| **CdlPRPSFanfoldUS**{: #CdlPRPSFanfoldUS } | `39` | US standard fanfold, 14.875 x 11 in. |
| **CdlPRPSFanfoldStdGerman**{: #CdlPRPSFanfoldStdGerman } | `40` | German standard fanfold, 8.5 x 12 in. |
| **CdlPRPSFanfoldLglGerman**{: #CdlPRPSFanfoldLglGerman } | `41` | German legal fanfold, 8.5 x 13 in. |
| **CdlPRPSUser**{: #CdlPRPSUser } | `256` | A user-defined size. |

## Used by

- [**CommonDialog**](../CommonDialog) class: [**PaperSize**](../CommonDialog#papersize)

## See Also

- [Enumerations](.) -- all the enumerations of the package
- [CommonDialog](../CommonDialog) class
- [CdlPRBNConstants](CdlPRBNConstants) enumeration
- [CdlPRORConstants](CdlPRORConstants) enumeration
