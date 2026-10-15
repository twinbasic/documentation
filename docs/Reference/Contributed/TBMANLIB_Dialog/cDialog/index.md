---
title: cDialog
parent: TBMANLIB_Dialog Package
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/
has_toc: false
---

# cDialog class
{: .no_toc }

Shows the Windows Open, Save As and Browse For Folder dialogs, builds the file-type list of the first two, takes file paths apart, and opens a file in the program that Windows associates with it.

Properties set the options of a dialog before it is shown. **cDialog** works in 32-bit and in 64-bit programs. [**ShowOpen**](ShowOpen), [**ShowSave**](ShowSave) and [**ShowBrowseForFolder**](ShowBrowseForFolder) show the dialogs and return the path that the user chose. A cancelled dialog returns an empty string. **ShowOpen** and **ShowSave** also store the path in [**FileName**](FileName); several files chosen with [**MultiSelect**](MultiSelect) come back as an array, and **FileName** is then empty.

```tb check_build
Dim dlg As New cDialog
Dim path As String

dlg.DialogTitle = "Open a text file"
dlg.SetCommonFilters
path = dlg.ShowOpen()

If Len(path) > 0 Then
    Debug.Print "Chosen: " & path
    Debug.Print "Name: " & dlg.GetFileName(path)
End If
```

The options are the members and flags of the Win32 structures that the dialogs take: [OPENFILENAME](https://learn.microsoft.com/en-us/windows/win32/api/commdlg/ns-commdlg-openfilenamew) for **ShowOpen** (`GetOpenFileNameW`) and **ShowSave** (`GetSaveFileNameW`), and [BROWSEINFO](https://learn.microsoft.com/en-us/windows/win32/api/shlobj_core/ns-shlobj_core-browseinfow) for **ShowBrowseForFolder** (`SHBrowseForFolder`). Each property page names the flag it sets and the dialogs in which it takes effect, and the table [below](#which-dialog-uses-which-property) lists them all.

<!-- test: compile CDialogHasNoFlags, compile CDialogHasNoFilterIndex, compile CDialogHasNoCancelError, compile CDialogHasNoFileTitle, compile CDialogHasNoMaxFileSize, compile CDialogHasNoOwnerWindow -->
> [!NOTE] 1.1.0.0
> The property names follow VB6's **CommonDialog** control, but **cDialog** is a class with a smaller set of members. It has no **Flags** property (each option is a **Boolean** property of its own), no **FilterIndex** (the first filter is always selected, and the filter that the user chose is not reported), no **CancelError** (a cancelled dialog returns an empty string), no **FileTitle** or **MaxFileSize**, and no owner window. **InitialDir** is the control's **InitDir**. **ShowOpen** returns the file name, as well as storing it in **FileName**, and there is no Color, Font or Print dialog in this class (the package has a class for each of them, listed on its [landing page](../)). The [**cDialogEx**](../cDialogEx) class of this package has a **FilterIndex** and an owner window. The [**CommonDialog**](../../VBComDlg/CommonDialog) class of the VBComDlg package has **Flags**, **FilterIndex**, **CancelError**, **FileTitle**, **MaxFileSize** and those dialogs.

## Defaults

<!-- test: CDialogPropertyTests.Defaults_Texts, CDialogPropertyTests.Defaults_FalseFlags, CDialogPropertyTests.Defaults_TrueFlags, CDialogPropertyTests.Properties_StoreWhatIsSet, CDialogPropertyTests.Reset_RestoresTheStartingValues -->
A new **cDialog** starts with these values, and [**Reset**](Reset) restores them.

| Property | Starting value |
|---|---|
| [**DialogTitle**](DialogTitle), [**InitialDir**](InitialDir), [**DefaultExt**](DefaultExt), [**FileName**](FileName), [**Filter**](Filter) | An empty string |
| [**MultiSelect**](MultiSelect), [**ReadOnly**](ReadOnly), [**NoChangeDir**](NoChangeDir), [**CreatePrompt**](CreatePrompt) | **False** |
| [**OverwritePrompt**](OverwritePrompt), [**PathMustExist**](PathMustExist), [**FileMustExist**](FileMustExist), [**HideReadOnly**](HideReadOnly), [**NewDialogStyle**](NewDialogStyle) | **True** |
<!-- /test -->

```tb check_build check_run
Dim dlg As New cDialog
Debug.Print dlg.MultiSelect      ' False
Debug.Print dlg.FileMustExist    ' True
Debug.Print dlg.NewDialogStyle   ' True
Debug.Print Len(dlg.Filter)      ' 0
```

## Which dialog uses which property

*yes* means that the class passes the value to Windows for that dialog. A property marked *ignored* is stored and returned, and the dialog does not receive it. **ShowOpen** and **ShowSave** read and write [**FileName**](FileName); **ShowBrowseForFolder** writes [**InitialDir**](InitialDir) when the user chooses a folder, and does not read it.

| Property | Win32 member or flag | ShowOpen | ShowSave | ShowBrowseForFolder |
|---|---|---|---|---|
| [**DialogTitle**](DialogTitle) | `lpstrTitle`, `lpszTitle` | yes | yes | yes |
| [**InitialDir**](InitialDir) | `lpstrInitialDir` | yes | yes | written, not read |
| [**DefaultExt**](DefaultExt) | `lpstrDefExt` | yes | yes | ignored |
| [**FileName**](FileName) | `lpstrFile` | read and written | read and written | ignored |
| [**Filter**](Filter) | `lpstrFilter` | yes | yes | ignored |
| [**MultiSelect**](MultiSelect) | `OFN_ALLOWMULTISELECT` | yes | ignored | ignored |
| [**OverwritePrompt**](OverwritePrompt) | `OFN_OVERWRITEPROMPT` | yes | yes | ignored |
| [**PathMustExist**](PathMustExist) | `OFN_PATHMUSTEXIST` | yes | yes | ignored |
| [**FileMustExist**](FileMustExist) | `OFN_FILEMUSTEXIST` | yes | ignored | ignored |
| [**HideReadOnly**](HideReadOnly) | `OFN_HIDEREADONLY` | yes | yes | ignored |
| [**ReadOnly**](ReadOnly) | `OFN_READONLY` | yes | ignored | ignored |
| [**NoChangeDir**](NoChangeDir) | `OFN_NOCHANGEDIR` | yes | yes | ignored |
| [**CreatePrompt**](CreatePrompt) | `OFN_CREATEPROMPT` | yes | ignored | ignored |
| [**NewDialogStyle**](NewDialogStyle) | `BIF_USENEWUI` | ignored | ignored | yes |

Windows documents some of these flags for one kind of dialog only. `OFN_OVERWRITEPROMPT` is documented for Save As, and `OFN_FILEMUSTEXIST` for Open. The class passes **OverwritePrompt** to **ShowOpen** all the same.

## Settings without a property

Some settings cannot be changed.

- **ShowOpen** and **ShowSave** always set `OFN_LONGNAMES`, `OFN_EXPLORER` and `OFN_ENABLESIZING`. Windows documents the effect of `OFN_LONGNAMES` and `OFN_ENABLESIZING` for old-style dialogs, hooks and templates, none of which the class uses. `OFN_EXPLORER` selects the layout of the buffer that a multiple selection returns ([**MultiSelect**](MultiSelect)).
- **ShowOpen** and **ShowSave** always select the first pair of the [**Filter**](Filter) list (`nFilterIndex` is 1) and do not report the pair that the user chose.
- **ShowOpen** and **ShowSave** pass no hook procedure, no custom template and no custom filter. The flags that the dialog returns are not read, so the choice of *Open as read-only* (see [**HideReadOnly**](HideReadOnly)) is not available after the dialog closes.
- **ShowBrowseForFolder** always sets `BIF_RETURNONLYFSDIRS`, so only a folder of the file system can be chosen, and passes no root folder and no callback.
- No dialog has an owner window: the class passes 0 for `hwndOwner` in both structures.

## Properties

- [CreatePrompt](CreatePrompt) -- asks before the Open dialog accepts a file that does not exist
- [DefaultExt](DefaultExt) -- the extension that Windows adds to a file name typed without one
- [DialogTitle](DialogTitle) -- the text that the dialogs show as their title
- [FileMustExist](FileMustExist) -- lets the Open dialog accept only the name of an existing file
- [FileName](FileName) -- the file name shown when a dialog opens, and the path that the last Open or Save As dialog returned
- [Filter](Filter) -- the file-type list of the Open and Save As dialogs
- [HideReadOnly](HideReadOnly) -- hides the read-only choice of the Open dialog
- [InitialDir](InitialDir) -- the folder in which the Open and Save As dialogs start
- [MultiSelect](MultiSelect) -- lets the Open dialog select more than one file
- [NewDialogStyle](NewDialogStyle) -- selects the resizable Browse For Folder dialog with an edit box
- [NoChangeDir](NoChangeDir) -- keeps the current folder of the program as it was
- [OverwritePrompt](OverwritePrompt) -- asks before the Save As dialog accepts the name of an existing file
- [PathMustExist](PathMustExist) -- lets the Open and Save As dialogs accept only paths that exist
- [ReadOnly](ReadOnly) -- sets the read-only flag of the Open dialog, which has no visible effect

## Methods

- [AddFilter](AddFilter) -- appends a description and a pattern to the filter
- [ClearFilter](ClearFilter) -- empties the filter
- [GetFileExtension](GetFileExtension) -- returns the part of a path from its last period
- [GetFileName](GetFileName) -- returns the part of a path after its last backslash
- [GetFileNameWithoutExt](GetFileNameWithoutExt) -- returns the file name of a path without its extension
- [GetFilePath](GetFilePath) -- returns the part of a path before its last backslash
- [OpenFile](OpenFile) -- runs a shell verb, by default `open`, on a file or a program
- [PathCombine](PathCombine) -- joins two path parts with one backslash
- [Reset](Reset) -- restores every property to its starting value
- [SelectAndOpenFile](SelectAndOpenFile) -- shows the Open dialog and opens the chosen file or files
- [SelectFiles](SelectFiles) -- shows the Open dialog and returns the chosen files as a collection
- [SetCodeFilters](SetCodeFilters) -- replaces the filter with one for source code files
- [SetCommonFilters](SetCommonFilters) -- replaces the filter with Text Files and All Files
- [SetDocumentFilters](SetDocumentFilters) -- replaces the filter with one for office documents
- [SetImageFilters](SetImageFilters) -- replaces the filter with one for image files
- [ShowBrowseForFolder](ShowBrowseForFolder) -- shows the Browse For Folder dialog and returns the chosen folder
- [ShowOpen](ShowOpen) -- shows the Open dialog and returns the chosen file
- [ShowSave](ShowSave) -- shows the Save As dialog and returns the chosen file name

## See Also

- [TBMANLIB_Dialog](../) package -- overview
- [cDialogEx](../cDialogEx) class -- the same dialogs in the style of Windows Vista and later
- [CommonDialog](../../VBComDlg/CommonDialog) class -- the fuller alternative, with flags, a filter index, cancel errors and the Color, Font and Print dialogs
