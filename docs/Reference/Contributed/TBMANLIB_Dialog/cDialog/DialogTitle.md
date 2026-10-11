---
title: DialogTitle
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/DialogTitle
has_toc: false
---

# DialogTitle
{: .no_toc }

Returns or sets the text that the dialogs show as their title, or in the folder dialog as an instruction above the tree of folders.

Syntax: *object*.**DialogTitle** [ = *string* ]

*object*
: *required* An object expression that evaluates to a **cDialog**.

*string*
: A **String**. The default is an empty string.

## Remarks

[**ShowOpen**](ShowOpen) and [**ShowSave**](ShowSave) pass the text as the `lpstrTitle` member of `OPENFILENAME`, the text of the title bar. With an empty **DialogTitle** the Open dialog is titled *Open* and the Save As dialog *Save As*. A text that is set replaces the title.

[**ShowBrowseForFolder**](ShowBrowseForFolder) passes the text as the `lpszTitle` member of `BROWSEINFO`. The title bar of that dialog always reads *Browse For Folder* (*Browse for Folder* when [**NewDialogStyle**](NewDialogStyle) is **False**), and **DialogTitle** is shown as a line of text above the tree of folders, as an instruction to the user. With an empty **DialogTitle** there is no text there.

## Example

This example reads the starting value and sets a title.

```tb check_build check_run
Dim dlg As New cDialog
Debug.Print "[" & dlg.DialogTitle & "]"   ' []

dlg.DialogTitle = "Choose the log file"
Debug.Print dlg.DialogTitle               ' Choose the log file
```

This example shows the Open dialog with that title.

```tb check_build
Dim dlg As New cDialog
dlg.DialogTitle = "Choose the log file"
Debug.Print dlg.ShowOpen()
```

## See Also

- [ShowOpen](ShowOpen) method -- shows the Open dialog
- [ShowSave](ShowSave) method -- shows the Save As dialog
- [ShowBrowseForFolder](ShowBrowseForFolder) method -- shows the Browse For Folder dialog
- [cDialog](.) class -- overview
