---
title: CdlPSDConstants
parent: Enumerations
grand_parent: VBComDlg Package
permalink: /tB/Packages/Contributed/VBComDlg/Enumerations/CdlPSDConstants
---

# CdlPSDConstants enumeration
{: .no_toc }

Options of the Page Setup dialog, combined with **Or** in the [**Flags**](../CommonDialog#flags) property.

The enumeration is declared inside the [**CommonDialog**](../CommonDialog) class. Its members are used without a qualifier, or with the name of the enumeration. The values are those of the Windows `PSD_` constants of the `PAGESETUPDLG` structure.

When the [**HookEvents**](../CommonDialog#hookevents) property is **True**, the class adds the Windows flag that switches on its hook procedure (`PSD_ENABLEPAGESETUPHOOK`) and removes it from **Flags** again when the dialog closes, so it is not a member.

| Member | Value | Description |
|:-------|:------|:------------|
| **CdlPSDDefaultMinMargins**{: #CdlPSDDefaultMinMargins } | `&H0` | The minimum margins are the ones the printer allows. The value is zero, so this is the behavior whenever **CdlPSDMinMargins** is not set. |
| **CdlPSDMinMargins**{: #CdlPSDMinMargins } | `&H1` | The dialog takes the minimum margins from [**PageLeftMinMargin**](../CommonDialog#pageleftminmargin), [**PageTopMinMargin**](../CommonDialog#pagetopminmargin), [**PageRightMinMargin**](../CommonDialog#pagerightminmargin) and [**PageBottomMinMargin**](../CommonDialog#pagebottomminmargin), and does not let the user enter smaller margins. The class does not update these properties when the dialog closes. |
| **CdlPSDMargins**{: #CdlPSDMargins } | `&H2` | The dialog opens with the margins in [**PageLeftMargin**](../CommonDialog#pageleftmargin), [**PageTopMargin**](../CommonDialog#pagetopmargin), [**PageRightMargin**](../CommonDialog#pagerightmargin) and [**PageBottomMargin**](../CommonDialog#pagebottommargin). Without it the dialog starts with margins of one inch. |
| **CdlPSDInThousandthsOfInches**{: #CdlPSDInThousandthsOfInches } | `&H4` | The margins are in thousandths of an inch. |
| **CdlPSDInHundredthsOfMillimeters**{: #CdlPSDInHundredthsOfMillimeters } | `&H8` | The margins are in hundredths of a millimeter. When neither this flag nor **CdlPSDInThousandthsOfInches** is set, the unit follows the measurement system of the user. |
| **CdlPSDDisableMargins**{: #CdlPSDDisableMargins } | `&H10` | Disables the part of the dialog for the margins. |
| **CdlPSDDisablePrinter**{: #CdlPSDDisablePrinter } | `&H20` | Disables the **Printer** button. |
| **CdlPSDNoWarning**{: #CdlPSDNoWarning } | `&H80` | The dialog shows no warning when the computer has no default printer. |
| **CdlPSDDisableOrientation**{: #CdlPSDDisableOrientation } | `&H100` | Disables the part of the dialog for the orientation. |
| **CdlPSDDisablePaper**{: #CdlPSDDisablePaper } | `&H200` | Disables the part of the dialog for the paper size and source. |
| **CdlPSDReturnDefault**{: #CdlPSDReturnDefault } | `&H400` | The dialog does not appear. The printer properties receive the settings of the default printer. |
| **CdlPSDHelpButton**{: #CdlPSDHelpButton } | `&H800` | Shows a Help button. A click raises the [**Help**](../CommonDialog#help) event, but only when the dialog has an owner window. |
| **CdlPSDDisablePagePainting**{: #CdlPSDDisablePagePainting } | `&H80000` | The dialog does not draw the contents of its sample page. |
| **CdlPSDNoNetworkButton**{: #CdlPSDNoNetworkButton } | `&H200000` | Hides and disables the Network button. |

## Used by

- [**CommonDialog**](../CommonDialog) class: [**Flags**](../CommonDialog#flags) (for [**ShowPageSetup**](../CommonDialog#showpagesetup))

## See Also

- [Enumerations](.) -- all the enumerations of the package
- [CommonDialog](../CommonDialog) class
