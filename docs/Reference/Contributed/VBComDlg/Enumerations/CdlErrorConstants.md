---
title: CdlErrorConstants
parent: Enumerations
grand_parent: VBComDlg Package
permalink: /tB/Packages/Contributed/VBComDlg/Enumerations/CdlErrorConstants
---

# CdlErrorConstants enumeration
{: .no_toc }

The run-time error numbers that the methods of [**CommonDialog**](../CommonDialog) raise when a dialog fails or the user cancels it.

The enumeration is declared inside the [**CommonDialog**](../CommonDialog) class. Its members are used without a qualifier, or with the name of the enumeration. The numbers are those of the VB6 CommonDialog control (`cdlCancel` and the other `cdl` constants), not the codes that the Windows common-dialog library reports: the class translates the Windows code of a failure into the member that matches it. A failure for which there is no member raises an error whose number is the Windows code and whose description is "Unexpected error."

No property takes or returns a member. A handler reads them from `Err.Number`.

| Member | Value | Description |
|:-------|:------|:------------|
| **CdlCancel**{: #CdlCancel } | `32755` | The user closed the dialog with **Cancel**. The error is raised only when [**CancelError**](../CommonDialog#cancelerror) is **True**. |
| **CdlBufferTooSmall**{: #CdlBufferTooSmall } | `20476` | The buffer for the file name is too small for the name that the user chose. The size of the buffer is [**MaxFileSize**](../CommonDialog#maxfilesize). |
| **CdlInvalidFileName**{: #CdlInvalidFileName } | `20477` | The file name is not valid. |
| **CdlSubclassFailure**{: #CdlSubclassFailure } | `20478` | The dialog could not subclass a list box because the system had too little memory. |
| **CdlMaxLessThanMin**{: #CdlMaxLessThanMin } | `24573` | The Font dialog was asked to limit the size, and [**Max**](../CommonDialog#max) is less than [**Min**](../CommonDialog#min). |
| **CdlNoFonts**{: #CdlNoFonts } | `24574` | The Font dialog found no fonts to list. |
| **CdlPrinterNotFound**{: #CdlPrinterNotFound } | `28660` | The `[devices]` section of `WIN.INI` has no entry for the printer. |
| **CdlCreateICFailure**{: #CdlCreateICFailure } | `28661` | The dialog could not create an information context for the printer. |
| **CdlDndmMismatch**{: #CdlDndmMismatch } | `28662` | The device mode and the device names describe two different printers. |
| **CdlNoDefaultPrn**{: #CdlNoDefaultPrn } | `28663` | The computer has no default printer. |
| **CdlNoDevices**{: #CdlNoDevices } | `28664` | The computer has no printer drivers. |
| **CdlInitFailure**{: #CdlInitFailure } | `28665` | The dialog failed while it was starting up. [**ShowPrinterEx**](../CommonDialog#showprinterex) raises this error for a failure of the extended Print dialog that has no member of its own. |
| **CdlGetDevModeFail**{: #CdlGetDevModeFail } | `28666` | The printer driver could not fill in the device mode. |
| **CdlLoadDrvFailure**{: #CdlLoadDrvFailure } | `28667` | The dialog could not load the driver of the printer. |
| **CdlRetDefFailure**{: #CdlRetDefFailure } | `28668` | **CdlPDReturnDefault** or **CdlPSDReturnDefault** was set, but a field that must be zero was not. |
| **CdlParseFailure**{: #CdlParseFailure } | `28669` | The dialog could not read the strings in `WIN.INI`. |
| **CdlHelp**{: #CdlHelp } | `32751` | The call of the WinHelp viewer failed. |
| **CdlBufferLengthZero**{: #CdlBufferLengthZero } | `36848` | A buffer of the Find or Replace dialog is not valid. |

## Used by

- [**CommonDialog**](../CommonDialog) class, the methods that raise them:
    - **CdlCancel**: [**ShowOpen**](../CommonDialog#showopen), [**ShowSave**](../CommonDialog#showsave), [**ShowColor**](../CommonDialog#showcolor), [**ShowFont**](../CommonDialog#showfont), [**ShowPrinter**](../CommonDialog#showprinter), [**ShowPrinterEx**](../CommonDialog#showprinterex), [**ShowPageSetup**](../CommonDialog#showpagesetup) and [**ShowFolderBrowser**](../CommonDialog#showfolderbrowser)
    - **CdlBufferTooSmall**, **CdlInvalidFileName** and **CdlSubclassFailure**: [**ShowOpen**](../CommonDialog#showopen) and [**ShowSave**](../CommonDialog#showsave)
    - **CdlMaxLessThanMin** and **CdlNoFonts**: [**ShowFont**](../CommonDialog#showfont)
    - **CdlPrinterNotFound**, **CdlCreateICFailure**, **CdlDndmMismatch**, **CdlNoDefaultPrn**, **CdlNoDevices**, **CdlInitFailure**, **CdlGetDevModeFail**, **CdlLoadDrvFailure**, **CdlRetDefFailure** and **CdlParseFailure**: [**ShowPrinter**](../CommonDialog#showprinter) and [**ShowPageSetup**](../CommonDialog#showpagesetup); [**ShowPrinterEx**](../CommonDialog#showprinterex) raises only **CdlInitFailure**
    - **CdlHelp**: [**ShowHelp**](../CommonDialog#showhelp)
    - **CdlBufferLengthZero**: [**ShowFind**](../CommonDialog#showfind) and [**ShowReplace**](../CommonDialog#showreplace)

## See Also

- [Enumerations](.) -- all the enumerations of the package
- [CommonDialog](../CommonDialog) class
