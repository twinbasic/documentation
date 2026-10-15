---
title: InitialDir
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/InitialDir
has_toc: false
---

# InitialDir
{: .no_toc }

Returns or sets the folder in which the Open and Save As dialogs start.

Syntax: *object*.**InitialDir** [ = *string* ]

*object*
: *required* An object expression that evaluates to a **cDialog**.

*string*
: A **String**, the path of a folder. The default is an empty string.

## Remarks

[**ShowOpen**](ShowOpen) and [**ShowSave**](ShowSave) pass the text as the `lpstrInitialDir` member of `OPENFILENAME`. The class does not check that the folder exists. Windows chooses the starting folder in the order that the [documentation of `lpstrInitialDir`](https://learn.microsoft.com/en-us/windows/win32/api/commdlg/ns-commdlg-openfilenamew) gives.

[**ShowBrowseForFolder**](ShowBrowseForFolder) does not use **InitialDir**. Its dialog opens with the folder of the user's profile selected, whatever **InitialDir** holds.

<!-- test: CDialogDialogTests.ShowBrowseForFolder_ReturnsTheTypedFolderAndStoresItInInitialDir, CDialogDialogTests.ShowBrowseForFolder_CancelReturnsAnEmptyStringAndKeepsInitialDir -->
> [!NOTE] 1.1.0.0
> A **ShowBrowseForFolder** that the user confirms replaces **InitialDir** with the folder it returns, a path typed into the edit box of the dialog included. A **ShowOpen** or **ShowSave** after it is given that folder as its starting folder. Set **InitialDir** again if that is not wanted.

VB6's **CommonDialog** control calls this property **InitDir**.

## Example

```tb check_build check_run
Dim dlg As New cDialog
Debug.Print "[" & dlg.InitialDir & "]"   ' []

dlg.InitialDir = "C:\Reports"
Debug.Print dlg.InitialDir               ' C:\Reports
```

This example starts the Save As dialog in a given folder.

```tb check_build
Dim dlg As New cDialog
dlg.InitialDir = "C:\Reports"
dlg.DefaultExt = "txt"
Debug.Print dlg.ShowSave()
```

## See Also

- [FileName](FileName) property -- the file name shown when the dialog opens
- [ShowOpen](ShowOpen) method -- shows the Open dialog
- [ShowSave](ShowSave) method -- shows the Save As dialog
- [ShowBrowseForFolder](ShowBrowseForFolder) method -- writes the chosen folder to **InitialDir**
- [cDialog](.) class -- overview
