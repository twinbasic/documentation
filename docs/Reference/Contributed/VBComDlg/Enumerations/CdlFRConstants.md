---
title: CdlFRConstants
parent: Enumerations
grand_parent: VBComDlg Package
permalink: /tB/Packages/Contributed/VBComDlg/Enumerations/CdlFRConstants
---

# CdlFRConstants enumeration
{: .no_toc }

Options and results of the Find and Replace dialogs, combined with **Or** in the [**Flags**](../CommonDialog#flags) property.

The enumeration is declared inside the [**CommonDialog**](../CommonDialog) class. Its members are used without a qualifier, or with the name of the enumeration. The values are those of the Windows `FR_` constants of the `FINDREPLACE` structure.

Some members are options that the program sets before it shows the dialog, and the dialog changes them as the user works. Others, such as **CdlFRFindNext**, tell which button the user clicked. The class updates [**Flags**](../CommonDialog#flags) before it raises each event of the dialog.

The Windows flags `FR_ENABLEHOOK` and `FR_DIALOGTERM` are not members. The class adds the first one when the [**HookEvents**](../CommonDialog#hookevents) property is **True**, and removes it from **Flags** again. The dialog sets the second one when it closes.

| Member | Value | Description |
|:-------|:------|:------------|
| **CdlFRDown**{: #CdlFRDown } | `&H1` | The **Down** option for the direction of the search is selected. The dialog sets or clears the flag as the user chooses **Up** or **Down**. |
| **CdlFRWholeWord**{: #CdlFRWholeWord } | `&H2` | The **Match whole word only** check box is selected. The dialog sets or clears the flag as the user changes the check box. |
| **CdlFRMatchCase**{: #CdlFRMatchCase } | `&H4` | The **Match case** check box is selected. The dialog sets or clears the flag as the user changes the check box. |
| **CdlFRFindNext**{: #CdlFRFindNext } | `&H8` | The user clicked **Find Next**. The class raises the [**FindNext**](../CommonDialog#findnext) event. |
| **CdlFRReplace**{: #CdlFRReplace } | `&H10` | The user clicked **Replace**. The class raises the [**Replace**](../CommonDialog#replace) event. |
| **CdlFRReplaceAll**{: #CdlFRReplaceAll } | `&H20` | The user clicked **Replace All**. See the [**ReplaceAll**](../CommonDialog#replaceall) event. |
| **CdlFRHelpButton**{: #CdlFRHelpButton } | `&H80` | Shows a Help button. A click raises the [**Help**](../CommonDialog#help) event. |
| **CdlFRNoUpDown**{: #CdlFRNoUpDown } | `&H400` | Disables the **Up** and **Down** options. |
| **CdlFRNoMatchCase**{: #CdlFRNoMatchCase } | `&H800` | Disables the **Match case** check box. |
| **CdlFRNoWholeWord**{: #CdlFRNoWholeWord } | `&H1000` | Disables the **Match whole word only** check box. |
| **CdlFRHideUpDown**{: #CdlFRHideUpDown } | `&H4000` | Hides the **Up** and **Down** options. |
| **CdlFRHideMatchCase**{: #CdlFRHideMatchCase } | `&H8000&` | Hides the **Match case** check box. |
| **CdlFRHideWholeWord**{: #CdlFRHideWholeWord } | `&H10000` | Hides the **Match whole word only** check box. |

## Used by

- [**CommonDialog**](../CommonDialog) class: [**Flags**](../CommonDialog#flags) (for [**ShowFind**](../CommonDialog#showfind) and [**ShowReplace**](../CommonDialog#showreplace))

## See Also

- [Enumerations](.) -- all the enumerations of the package
- [CommonDialog](../CommonDialog) class
