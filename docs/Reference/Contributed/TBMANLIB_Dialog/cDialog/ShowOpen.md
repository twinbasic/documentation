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

Returns a **Variant**. When the user confirms the dialog, it holds the full path of the chosen file as a **String**. When the user cancels, it holds an empty string. With [**MultiSelect**](MultiSelect) **True** and two or more files selected, it holds a 0-based array of **String** values, one full path for each file, as [below](#several-files) describes.

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

A confirmed **ShowOpen** that returns a **String** also stores it in [**FileName**](FileName), and leaves [**InitialDir**](InitialDir) as it was. A cancelled dialog changes neither. The next call therefore passes the previous path as the initial file name.

### Several files

With [**MultiSelect**](MultiSelect) **True**, Windows returns the folder and then the name of each selected file in one buffer. **ShowOpen** joins the folder to each name with a backslash and returns the full paths as an array of **String** values, in the order in which the names stand in the File name box, and sets [**FileName**](FileName) to an empty string. One selected file gives its full path as a **String**, as without **MultiSelect**. Test the result with **IsArray**, or call [**SelectFiles**](SelectFiles), which returns a **Collection** in both cases.

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
- [SelectFiles](SelectFiles) method -- shows this dialog and returns the files as a collection
- [MultiSelect](MultiSelect) property -- lets the user select several files
- [FileName](FileName) property -- holds the path afterwards
- [cDialog](.) class -- overview
