---
title: CdlPDResultConstants
parent: Enumerations
grand_parent: VBComDlg Package
permalink: /tB/Packages/Contributed/VBComDlg/Enumerations/CdlPDResultConstants
---

# CdlPDResultConstants enumeration
{: .no_toc }

Names the button that closed the extended Print dialog.

The enumeration is declared inside the [**CommonDialog**](../CommonDialog) class. Its members are used without a qualifier, or with the name of the enumeration. The values are those of the Windows `PD_RESULT_` constants of the `PRINTDLGEX` structure.

| Member | Value | Description |
|:-------|:------|:------------|
| **CdlPDResultCancel**{: #CdlPDResultCancel } | `&H0` | The user clicked **Cancel**. When [**CancelError**](../CommonDialog#cancelerror) is **True**, the method raises error `CdlCancel` instead of returning this value. |
| **CdlPDResultPrint**{: #CdlPDResultPrint } | `&H1` | The user clicked **Print**. |
| **CdlPDResultApply**{: #CdlPDResultApply } | `&H2` | The user clicked **Apply**. |

## Used by

- [**CommonDialog**](../CommonDialog) class: [**ShowPrinterEx**](../CommonDialog#showprinterex) (the return value)

## See Also

- [Enumerations](.) -- all the enumerations of the package
- [CommonDialog](../CommonDialog) class
- [CdlPDConstants](CdlPDConstants) enumeration
