---
title: CdlBIFConstants
parent: Enumerations
grand_parent: VBComDlg Package
permalink: /tB/Packages/Contributed/VBComDlg/Enumerations/CdlBIFConstants
---

# CdlBIFConstants enumeration
{: .no_toc }

Options of the Folder Browser dialog, combined with **Or** in the [**Flags**](../CommonDialog#flags) property.

The enumeration is declared inside the [**CommonDialog**](../CommonDialog) class. Its members are used without a qualifier, or with the name of the enumeration. The values are those of the Windows `BIF_` constants of the `BROWSEINFO` structure.

[**ShowFolderBrowser**](../CommonDialog#showfolderbrowser) passes **Flags** to the dialog unchanged and does not update it afterwards. The class always installs its own callback, which handles the initial folder ([**InitDir**](../CommonDialog#initdir)) and some of the flags below.

| Member | Value | Description |
|:-------|:------|:------------|
| **CdlBIFReturnOnlyFSDirs**{: #CdlBIFReturnOnlyFSDirs } | `&H1` | The user can select only a folder of the file system. The class disables the **OK** button while the selected item has no file system path, such as a computer name in the network. |
| **CdlBIFDontGoBelowDomain**{: #CdlBIFDontGoBelowDomain } | `&H2` | The tree does not show the network folders below the domain level. |
| **CdlBIFStatusText**{: #CdlBIFStatusText } | `&H4` | Shows a status line, in which the class writes the path of the selected folder. Windows does not support the status line together with **CdlBIFNewDialogStyle**. |
| **CdlBIFReturnFSAncestors**{: #CdlBIFReturnFSAncestors } | `&H8` | The dialog enables the **OK** button only for a file system folder that lies below the root folder. |
| **CdlBIFEditBox**{: #CdlBIFEditBox } | `&H10` | Shows a box in which the user can type the name of an item. |
| **CdlBIFValidate**{: #CdlBIFValidate } | `&H20` | When the user types a name that is not valid, the class raises the [**FolderBrowserValidateFailed**](../CommonDialog#folderbrowservalidatefailed) event. Windows ignores the flag without **CdlBIFEditBox**. |
| **CdlBIFNewDialogStyle**{: #CdlBIFNewDialogStyle } | `&H40` | Uses the new dialog style, which the user can resize and which has a **New Folder** button and shortcut menus. |
| **CdlBIFBrowseIncludeURLs**{: #CdlBIFBrowseIncludeURLs } | `&H80` | The dialog can show URLs. Windows rejects URLs unless **CdlBIFUseNewUI** and **CdlBIFBrowseIncludeFiles** are also set. |
| **CdlBIFUseNewUI**{: #CdlBIFUseNewUI } | `&H50` | The combination of **CdlBIFEditBox** and **CdlBIFNewDialogStyle**. |
| **CdlBIFUAHint**{: #CdlBIFUAHint } | `&H100` | With **CdlBIFNewDialogStyle**, shows a line of usage hints at the bottom of the dialog instead of the box for the name. Windows ignores it together with **CdlBIFEditBox**. |
| **CdlBIFNoNewFolderButton**{: #CdlBIFNoNewFolderButton } | `&H200` | Leaves out the **New Folder** button. |
| **CdlBIFNoTranslateTargets**{: #CdlBIFNoTranslateTargets } | `&H400` | When the user selects a shortcut, the dialog returns the shortcut itself, not the item it points to. |
| **CdlBIFBrowseForComputer**{: #CdlBIFBrowseForComputer } | `&H1000` | The user can select only a computer. |
| **CdlBIFBrowseForPrinter**{: #CdlBIFBrowseForPrinter } | `&H2000` | The user can select only a printer. |
| **CdlBIFBrowseIncludeFiles**{: #CdlBIFBrowseIncludeFiles } | `&H4000` | The tree also shows files, and the user can select one. For a file, [**FileName**](../CommonDialog#filename) holds the path of the file and [**FileTitle**](../CommonDialog#filetitle) its name. |
| **CdlBIFShareable**{: #CdlBIFShareable } | `&H8000&` | The tree shows the resources that remote computers share. Windows requires **CdlBIFNewDialogStyle** with it. |
| **CdlBIFBrowseFileJunctions**{: #CdlBIFBrowseFileJunctions } | `&H10000` | The user can browse into items that act as folders, such as a library or a compressed file with the extension `.zip`. |

<!-- test: FolderBrowserTests.BrowseForPrinter_SelectedPrinterIsReturned -->
> [!WARNING] 1.0.13.0
> With **CdlBIFBrowseForComputer** or **CdlBIFBrowseForPrinter**, [**ShowFolderBrowser**](../CommonDialog#showfolderbrowser) returns **True** after the user selects a computer or a printer, but [**FileName**](../CommonDialog#filename) and [**FileTitle**](../CommonDialog#filetitle) are empty: the class reads the selection as a file system path, and a computer or a printer has none. The name of the selection is not available. To let the user choose a printer, use [**ShowPrinter**](../CommonDialog#showprinter), which sets [**PrinterName**](../CommonDialog#printername).

## Used by

- [**CommonDialog**](../CommonDialog) class: [**Flags**](../CommonDialog#flags) (for [**ShowFolderBrowser**](../CommonDialog#showfolderbrowser))

## See Also

- [Enumerations](.) -- all the enumerations of the package
- [CommonDialog](../CommonDialog) class
