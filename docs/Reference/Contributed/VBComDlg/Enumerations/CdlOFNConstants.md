---
title: CdlOFNConstants
parent: Enumerations
grand_parent: VBComDlg Package
permalink: /tB/Packages/Contributed/VBComDlg/Enumerations/CdlOFNConstants
---

# CdlOFNConstants enumeration
{: .no_toc }

Options of the File Open and File Save dialogs, combined with **Or** in the [**Flags**](../CommonDialog#flags) property.

The enumeration is declared inside the [**CommonDialog**](../CommonDialog) class. Its members are used without a qualifier, or with the name of the enumeration. The values are those of the Windows `OFN_` constants of the `OPENFILENAME` structure.

When the [**HookEvents**](../CommonDialog#hookevents) property is **True**, the class adds the Windows flags that switch on its hook procedure (`OFN_ENABLEHOOK` and `OFN_ENABLESIZING`) and removes them from **Flags** again when the dialog closes, so they are not members. The dialog also changes some of the flags before it returns, as the descriptions of **CdlOFNReadOnly** and **CdlOFNExtensionDifferent** say.

| Member | Value | Description |
|:-------|:------|:------------|
| **CdlOFNReadOnly**{: #CdlOFNReadOnly } | `&H1` | Selects the Read Only check box when the dialog opens. When the dialog closes with **OK**, the flag is set if the check box is selected. |
| **CdlOFNOverwritePrompt**{: #CdlOFNOverwritePrompt } | `&H2` | File Save dialog: asks the user to confirm before the dialog accepts the name of a file that exists. |
| **CdlOFNHideReadOnly**{: #CdlOFNHideReadOnly } | `&H4` | Hides the Read Only check box. |
| **CdlOFNNoChangeDir**{: #CdlOFNNoChangeDir } | `&H8` | Sets the current directory of the process back to the one it had before the dialog opened, if the user browsed to another folder. |
| **CdlOFNHelpButton**{: #CdlOFNHelpButton } | `&H10` | Shows a Help button. A click raises the [**Help**](../CommonDialog#help) event, but only when the dialog has an owner window. |
| **CdlOFNNoValidate**{: #CdlOFNNoValidate } | `&H100` | The dialog accepts a file name that contains characters which are not valid in a file name. |
| **CdlOFNAllowMultiSelect**{: #CdlOFNAllowMultiSelect } | `&H200` | File Open dialog: the user can select more than one file. Together with **CdlOFNExplorer**, [**FileName**](../CommonDialog#filename) then holds the folder followed by the file names, separated by null characters. [**MaxFileSize**](../CommonDialog#maxfilesize) must be large enough for all of them. |
| **CdlOFNExtensionDifferent**{: #CdlOFNExtensionDifferent } | `&H400` | The dialog sets this flag when the user typed an extension that differs from [**DefaultExt**](../CommonDialog#defaultext). |
| **CdlOFNPathMustExist**{: #CdlOFNPathMustExist } | `&H800` | The user can type only paths that exist. Otherwise the dialog shows a warning. |
| **CdlOFNFileMustExist**{: #CdlOFNFileMustExist } | `&H1000` | The user can type only names of files that exist. Otherwise the dialog shows a warning. The flag includes **CdlOFNPathMustExist**. |
| **CdlOFNCreatePrompt**{: #CdlOFNCreatePrompt } | `&H2000` | When the user types the name of a file that does not exist, the dialog asks whether to create it. If the user agrees, the dialog closes and returns the name. |
| **CdlOFNShareAware**{: #CdlOFNShareAware } | `&H4000` | The dialog ignores a network sharing violation and returns the selected name. The [**FileShareViolation**](../CommonDialog#fileshareviolation) event is not raised. |
| **CdlOFNNoReadOnlyReturn**{: #CdlOFNNoReadOnlyReturn } | `&H8000&` | The file that the dialog returns has the Read Only check box cleared and is not in a write-protected folder. |
| **CdlOFNNoNetworkButton**{: #CdlOFNNoNetworkButton } | `&H20000` | Hides and disables the Network button. |
| **CdlOFNExplorer**{: #CdlOFNExplorer } | `&H80000` | Selects the Explorer-style dialog and its customization methods. With [**HookEvents**](../CommonDialog#hookevents) **True**, the class installs the hook procedure that matches the style. |
| **CdlOFNNoDereferenceLinks**{: #CdlOFNNoDereferenceLinks } | `&H100000` | When the user selects a shortcut (`.lnk` file), the dialog returns the path of the shortcut itself, not of the file it points to. |
| **CdlOFNDontAddToRecent**{: #CdlOFNDontAddToRecent } | `&H2000000` | The dialog does not add the file to the list of recent documents. |
| **CdlOFNForcesShowHidden**{: #CdlOFNForcesShowHidden } | `&H10000000` | The dialog shows hidden and system files, even when the user has set the folder options not to show them. |

## Used by

- [**CommonDialog**](../CommonDialog) class: [**Flags**](../CommonDialog#flags) (for [**ShowOpen**](../CommonDialog#showopen) and [**ShowSave**](../CommonDialog#showsave))

## See Also

- [Enumerations](.) -- all the enumerations of the package
- [CommonDialog](../CommonDialog) class
- [CdlOFNShareViResultConstants](CdlOFNShareViResultConstants) enumeration
