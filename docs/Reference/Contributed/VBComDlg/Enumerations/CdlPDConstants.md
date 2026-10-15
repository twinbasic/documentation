---
title: CdlPDConstants
parent: Enumerations
grand_parent: VBComDlg Package
permalink: /tB/Packages/Contributed/VBComDlg/Enumerations/CdlPDConstants
---

# CdlPDConstants enumeration
{: .no_toc }

Options of the Print dialog and the extended Print dialog, combined with **Or** in the [**Flags**](../CommonDialog#flags) property.

The enumeration is declared inside the [**CommonDialog**](../CommonDialog) class. Its members are used without a qualifier, or with the name of the enumeration. The values are those of the Windows `PD_` constants of the `PRINTDLG` and `PRINTDLGEX` structures.

[**ShowPrinter**](../CommonDialog#showprinter) uses `PRINTDLG` and [**ShowPrinterEx**](../CommonDialog#showprinterex) uses `PRINTDLGEX`. A few flags exist for only one of the two, and the descriptions say which. When the [**HookEvents**](../CommonDialog#hookevents) property is **True**, [**ShowPrinter**](../CommonDialog#showprinter) adds the two Windows flags that switch on its hook procedures (`PD_ENABLEPRINTHOOK` and `PD_ENABLESETUPHOOK`) and removes them from **Flags** again when the dialog closes, so they are not members.

| Member | Value | Description |
|:-------|:------|:------------|
| **CdlPDAllPages**{: #CdlPDAllPages } | `&H0` | The **All** option is selected when the dialog opens. The value is zero, so the option is selected when none of **CdlPDSelection**, **CdlPDPageNums** and **CdlPDCurrentPage** is set. |
| **CdlPDSelection**{: #CdlPDSelection } | `&H1` | The **Selection** option is selected when the dialog opens, and the dialog returns the flag when the user chose it. |
| **CdlPDPageNums**{: #CdlPDPageNums } | `&H2` | The **Pages** option is selected when the dialog opens, and the dialog returns the flag when the user chose it. [**FromPage**](../CommonDialog#frompage) and [**ToPage**](../CommonDialog#topage) hold the range. |
| **CdlPDNoSelection**{: #CdlPDNoSelection } | `&H4` | Disables the **Selection** option. |
| **CdlPDNoPageNums**{: #CdlPDNoPageNums } | `&H8` | Disables the **Pages** option and the boxes for the range of pages. |
| **CdlPDCollate**{: #CdlPDCollate } | `&H10` | Selects the **Collate** check box when the dialog opens, and the dialog returns the flag when the user left it selected. The class also writes the choice to the printer settings. |
| **CdlPDPrintToFile**{: #CdlPDPrintToFile } | `&H20` | Selects the **Print to file** check box when the dialog opens, and the dialog returns the flag when the user left it selected. |
| **CdlPDPrintSetup**{: #CdlPDPrintSetup } | `&H40` | Shows the Print Setup dialog instead of the Print dialog. Only [**ShowPrinter**](../CommonDialog#showprinter) uses it. |
| **CdlPDNoWarning**{: #CdlPDNoWarning } | `&H80` | The dialog shows no warning when the computer has no default printer. |
| **CdlPDReturnDC**{: #CdlPDReturnDC } | `&H100` | The dialog returns a device context for the selected printer in [**hDC**](../CommonDialog#hdc). |
| **CdlPDReturnIC**{: #CdlPDReturnIC } | `&H200` | The dialog returns an information context for the selected printer in [**hDC**](../CommonDialog#hdc). |
| **CdlPDReturnDefault**{: #CdlPDReturnDefault } | `&H400` | The dialog does not appear. The printer properties receive the settings of the default printer. |
| **CdlPDHelpButton**{: #CdlPDHelpButton } | `&H800` | Shows a Help button. A click raises the [**Help**](../CommonDialog#help) event, but only when the dialog has an owner window. Only [**ShowPrinter**](../CommonDialog#showprinter) uses it. |
| **CdlPDUseDevModeCopies**{: #CdlPDUseDevModeCopies } | `&H40000` | Disables the **Copies** box when the printer does not support several copies. When the printer does, the dialog returns the number of copies in the printer settings, and [**Copies**](../CommonDialog#copies) holds it. |
| **CdlPDUseDevModeCopiesAndCollate**{: #CdlPDUseDevModeCopiesAndCollate } | `&H40000` | Has the same value as **CdlPDUseDevModeCopies**, and the two names mean the same. When the printer settings select collation, the class sets **CdlPDCollate** in [**Flags**](../CommonDialog#flags). |
| **CdlPDDisablePrintToFile**{: #CdlPDDisablePrintToFile } | `&H80000` | Disables the **Print to file** check box. |
| **CdlPDCurrentPage**{: #CdlPDCurrentPage } | `&H400000` | The **Current Page** option is selected when the dialog opens, and the dialog returns the flag when the user chose it. Only [**ShowPrinterEx**](../CommonDialog#showprinterex) uses it. |
| **CdlPDHidePrintToFile**{: #CdlPDHidePrintToFile } | `&H100000` | Hides the **Print to file** check box. |
| **CdlPDNoNetworkButton**{: #CdlPDNoNetworkButton } | `&H200000` | Hides and disables the Network button. Only [**ShowPrinter**](../CommonDialog#showprinter) uses it. |
| **CdlPDNoCurrentPage**{: #CdlPDNoCurrentPage } | `&H800000` | Disables the **Current Page** option. Only [**ShowPrinterEx**](../CommonDialog#showprinterex) uses it. |

## Used by

- [**CommonDialog**](../CommonDialog) class: [**Flags**](../CommonDialog#flags) (for [**ShowPrinter**](../CommonDialog#showprinter) and [**ShowPrinterEx**](../CommonDialog#showprinterex))

## See Also

- [Enumerations](.) -- all the enumerations of the package
- [CommonDialog](../CommonDialog) class
- [CdlPDResultConstants](CdlPDResultConstants) enumeration
