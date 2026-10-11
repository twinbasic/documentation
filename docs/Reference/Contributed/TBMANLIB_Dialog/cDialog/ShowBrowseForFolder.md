---
title: ShowBrowseForFolder
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/ShowBrowseForFolder
has_toc: false
---

# ShowBrowseForFolder
{: .no_toc }

Shows the Browse For Folder dialog and returns the folder that the user chose.

Syntax: *object*.**ShowBrowseForFolder** ( ) **As String**

*object*
: *required* An object expression that evaluates to a **cDialog**.

Returns a **String**, the path of the chosen folder, or an empty string when the user cancelled.

> [!WARNING]
> **ShowBrowseForFolder** works in 32-bit programs only. In a 64-bit program it ends the program with an access violation (exception 0xC0000005 in KERNELBASE.dll) before any dialog appears, whatever [**NewDialogStyle**](NewDialogStyle) holds, and unsaved data is lost. The class declares the handles and pointers of `BROWSEINFO`, and the item list that `SHBrowseForFolder` returns, as **Long**, which is the wrong size in a 64-bit program.

## Remarks

**ShowBrowseForFolder** calls `SHBrowseForFolder` with a `BROWSEINFO` structure, then turns the item that the user chose into a path with `SHGetPathFromIDListA` and frees the item with `CoTaskMemFree`. Two properties apply:

| Property | What **ShowBrowseForFolder** passes |
|---|---|
| [**DialogTitle**](DialogTitle) | `lpszTitle`, which the dialog shows as a line of text above the tree of folders |
| [**NewDialogStyle**](NewDialogStyle) | `BIF_USENEWUI` (`BIF_NEWDIALOGSTYLE Or BIF_EDITBOX`) when **True** |

The method always sets `BIF_RETURNONLYFSDIRS`, so only a folder of the file system can be chosen. It passes 0 for `hwndOwner`, so the dialog has no owner window, and it passes no root folder and no callback. No other property is used to set up the dialog. The caption of the dialog is *Browse For Folder* (*Browse for Folder* when **NewDialogStyle** is **False**), and it is not changed by [**DialogTitle**](DialogTitle).

The dialog does not start in the folder that [**InitialDir**](InitialDir) holds. In the new style it opens with the folder of the user's profile selected, and in the old style with *This PC* selected, with *OK* disabled until the user selects a folder of the file system.

> [!NOTE]
> When the user confirms a folder, **ShowBrowseForFolder** stores the path in [**InitialDir**](InitialDir). A [**ShowOpen**](ShowOpen) or [**ShowSave**](ShowSave) after it passes that folder to Windows as its starting folder. A path typed into the edit box of the new-style dialog and confirmed is returned and stored in the same way. A cancelled dialog returns an empty string and leaves **InitialDir** as it was. [**FileName**](FileName) is not used or changed.

The class reads the path with the ANSI function `SHGetPathFromIDListA`, into a buffer of 260 characters. An empty string results when the user cancels, and also when Windows cannot turn the chosen item into a path. The method raises no error.

## Example

This example asks for a folder and prints its path.

```tb check_build
Dim dlg As New cDialog
Dim folder As String

dlg.DialogTitle = "Choose the backup folder"
folder = dlg.ShowBrowseForFolder()

If Len(folder) = 0 Then
    Debug.Print "Cancelled"
Else
    Debug.Print "Chosen: " & folder
    Debug.Print "Stored in InitialDir: " & dlg.InitialDir
End If
```

## See Also

- [ShowOpen](ShowOpen) method -- shows the Open dialog
- [ShowSave](ShowSave) method -- shows the Save As dialog
- [NewDialogStyle](NewDialogStyle) property -- selects the resizable dialog with an edit box
- [DialogTitle](DialogTitle) property -- the text above the tree of folders
- [InitialDir](InitialDir) property -- receives the chosen folder
- [cDialog](.) class -- overview
