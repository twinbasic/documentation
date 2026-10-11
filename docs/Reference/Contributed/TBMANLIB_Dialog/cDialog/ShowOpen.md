---
title: ShowOpen
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/ShowOpen
has_toc: false
---

# ShowOpen
{: .no_toc }

Shows the Open dialog and returns the file that the user chose.

Syntax: *object*.**ShowOpen** ( ) **As Variant**

*object*
: *required* An object expression that evaluates to a **cDialog**.

Returns a **Variant** that always holds a **String**. When the user confirms the dialog, it holds the full path of the chosen file. When the user cancels, it holds an empty string. With [**MultiSelect**](MultiSelect) **True** and several files selected, it holds only a folder, as [below](#several-files) describes.

## Remarks

**ShowOpen** calls `GetOpenFileNameW` and takes its options from the properties of the object:

| Property | What **ShowOpen** passes |
|---|---|
| [**DialogTitle**](DialogTitle) | `lpstrTitle`, the title |
| [**InitialDir**](InitialDir) | `lpstrInitialDir`, the starting folder |
| [**FileName**](FileName) | `lpstrFile`, the text in the File name box when the dialog opens |
| [**Filter**](Filter) | `lpstrFilter`, the file-type list |
| [**DefaultExt**](DefaultExt) | `lpstrDefExt`, the extension added to a name typed without one |
| [**MultiSelect**](MultiSelect) | `OFN_ALLOWMULTISELECT` |
| [**OverwritePrompt**](OverwritePrompt) | `OFN_OVERWRITEPROMPT`, documented for Save As only |
| [**PathMustExist**](PathMustExist) | `OFN_PATHMUSTEXIST` |
| [**FileMustExist**](FileMustExist) | `OFN_FILEMUSTEXIST` |
| [**HideReadOnly**](HideReadOnly) | `OFN_HIDEREADONLY` |
| [**ReadOnly**](ReadOnly) | `OFN_READONLY` |
| [**NoChangeDir**](NoChangeDir) | `OFN_NOCHANGEDIR` |
| [**CreatePrompt**](CreatePrompt) | `OFN_CREATEPROMPT` |

A flag is set when its property is **True**. The method always sets `OFN_LONGNAMES`, `OFN_EXPLORER` and `OFN_ENABLESIZING`, selects the first pair of the filter, and has no owner window, hook or template. The [class page](.#settings-without-a-property) lists these settings.

An empty string means that the user cancelled, or that Windows reported a failure, such as a selected path that does not fit into the buffer, and no value tells which of the two happened. The buffer holds 260 characters, or 32,768 when [**MultiSelect**](MultiSelect) is **True** or [**FileName**](FileName) is not empty. Neither case raises an error.

A confirmed **ShowOpen** also stores the path it returns in [**FileName**](FileName), and leaves [**InitialDir**](InitialDir) as it was. A cancelled dialog changes neither. The next call therefore passes the previous path as the initial file name.

### Several files

> [!WARNING]
> With [**MultiSelect**](MultiSelect) **True** and two or more files selected, **ShowOpen** returns a **String** that holds only the folder of the files, never an array, and [**FileName**](FileName) becomes the folder. The names of the files are lost, and no error is raised. One selected file gives its full path.

Windows returns the selected names in one buffer, and the class cuts that buffer at its first null character, which ends the folder, before it looks for the separators between the names. The code that splits the names and returns an array of full paths therefore never runs. See [**MultiSelect**](MultiSelect) for a way to detect the result.

## Example

This example shows the Open dialog for text files and prints the chosen path and name.

```tb check_build
Dim dlg As New cDialog
Dim path As String

dlg.DialogTitle = "Open a text file"
dlg.InitialDir = "C:\Reports"
dlg.SetCommonFilters

path = dlg.ShowOpen()
If Len(path) = 0 Then
    Debug.Print "Cancelled"
Else
    Debug.Print path
    Debug.Print dlg.GetFileName(path)
End If
```

## See Also

- [ShowSave](ShowSave) method -- shows the Save As dialog
- [ShowBrowseForFolder](ShowBrowseForFolder) method -- shows the Browse For Folder dialog
- [SelectAndOpenFile](SelectAndOpenFile) method -- shows this dialog and opens the file
- [MultiSelect](MultiSelect) property -- lets the user select several files
- [FileName](FileName) property -- holds the path afterwards
- [cDialog](.) class -- overview
