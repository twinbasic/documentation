---
title: NewDialogStyle
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/NewDialogStyle
has_toc: false
---

# NewDialogStyle
{: .no_toc }

Returns or sets whether the Browse For Folder dialog uses the new style, which can be resized and has an edit box.

Syntax: *object*.**NewDialogStyle** [ = *boolean* ]

*object*
: *required* An object expression that evaluates to a **cDialog**.

*boolean*
: A **Boolean**. **True** adds `BIF_USENEWUI` to the flags of [**ShowBrowseForFolder**](ShowBrowseForFolder). The default is **True**.

## Remarks

Only **ShowBrowseForFolder** uses the property. [**ShowOpen**](ShowOpen) and [**ShowSave**](ShowSave) ignore it.

`BIF_USENEWUI` is the constant `BIF_NEWDIALOGSTYLE Or BIF_EDITBOX`. With **True**, the dialog is titled *Browse For Folder*, can be resized, and has an edit box, in which the user can type the path of a folder, and a *Make New Folder* button. It opens with the folder of the user's profile selected, whatever [**InitialDir**](InitialDir) holds. A path typed into the edit box and confirmed with *OK* is returned, and is stored in **InitialDir**.

With **False**, **ShowBrowseForFolder** sets only `BIF_RETURNONLYFSDIRS`, which it always sets, and the dialog has the old style: it is titled *Browse for Folder*, has no edit box and no *Make New Folder* button, selects *This PC* when it opens, and keeps *OK* disabled until the user selects a folder of the file system.

The Windows documentation of `SHBrowseForFolder` requires COM to be initialised before the call, with apartment threading if the program calls `CoInitializeEx`, and says that the call fails when `BIF_NEWDIALOGSTYLE` is passed and COM is initialised as multithreaded.

In a 64-bit program **ShowBrowseForFolder** ends the program with an access violation whatever **NewDialogStyle** holds, as the warning on its page describes.

## Example

```tb check_build check_run
Dim dlg As New cDialog
Debug.Print dlg.NewDialogStyle   ' True

dlg.NewDialogStyle = False
Debug.Print dlg.NewDialogStyle   ' False
```

This example shows the old-style dialog.

```tb check_build
Dim dlg As New cDialog
Dim folder As String

dlg.NewDialogStyle = False
dlg.DialogTitle = "Choose the backup folder"
folder = dlg.ShowBrowseForFolder()
If Len(folder) > 0 Then
    Debug.Print "Chosen: " & folder
End If
```

## See Also

- [ShowBrowseForFolder](ShowBrowseForFolder) method -- shows the Browse For Folder dialog
- [DialogTitle](DialogTitle) property -- the text above the tree of folders
- [cDialog](.) class -- overview
