---
title: ShowSave
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/ShowSave
has_toc: false
---

# ShowSave
{: .no_toc }

Shows the Save As dialog and returns the file name that the user chose.

Syntax: *object*.**ShowSave** ( ) **As String**

*object*
: *required* An object expression that evaluates to a **cDialog**.

Returns a **String**, the full path that the user confirmed, or an empty string when the user cancelled.

## Remarks

**ShowSave** calls `GetSaveFileNameW` and takes its options from the properties of the object:

| Property | What **ShowSave** passes |
|---|---|
| [**DialogTitle**](DialogTitle) | `lpstrTitle`, the title |
| [**InitialDir**](InitialDir) | `lpstrInitialDir`, the starting folder |
| [**FileName**](FileName) | `lpstrFile`, the text in the File name box when the dialog opens |
| [**Filter**](Filter) | `lpstrFilter`, the file-type list |
| [**DefaultExt**](DefaultExt) | `lpstrDefExt`, the extension added to a name typed without one |
| [**OverwritePrompt**](OverwritePrompt) | `OFN_OVERWRITEPROMPT` |
| [**PathMustExist**](PathMustExist) | `OFN_PATHMUSTEXIST` |
| [**HideReadOnly**](HideReadOnly) | `OFN_HIDEREADONLY` |
| [**NoChangeDir**](NoChangeDir) | `OFN_NOCHANGEDIR` |

A flag is set when its property is **True**. Unlike [**ShowOpen**](ShowOpen), **ShowSave** never sets `OFN_ALLOWMULTISELECT`, `OFN_FILEMUSTEXIST`, `OFN_READONLY` or `OFN_CREATEPROMPT`, so [**MultiSelect**](MultiSelect), [**FileMustExist**](FileMustExist), [**ReadOnly**](ReadOnly) and [**CreatePrompt**](CreatePrompt) have no effect on it. The method always sets `OFN_LONGNAMES`, `OFN_EXPLORER` and `OFN_ENABLESIZING`, selects the first pair of the filter, and has no owner window, hook or template. The [class page](.#settings-without-a-property) lists these settings.

When the user confirms the dialog, **ShowSave** stores the path in [**FileName**](FileName) as well as returning it. A cancelled dialog returns an empty string and leaves **FileName** as it was. The dialog returns only a name: it saves nothing, and the class does not create or write the file.

An empty string also results when Windows reports a failure, such as a path that does not fit into the buffer of 260 characters, and no value tells which of the two happened. Neither case raises an error.

With [**OverwritePrompt**](OverwritePrompt) **True** and a file that exists, the box *Confirm Save As* asks whether to replace it. *Yes* returns the path, and *No* leaves the dialog open. With **False** there is no box and the path is returned. With [**DefaultExt**](DefaultExt) set, a name typed without an extension gets it.

> [!NOTE] 1.1.0.0
> The class pads the buffer with spaces to 260 characters, and the dialog does not show the padding. A [**FileName**](FileName) of 260 characters shows no dialog and returns an empty string at once, as a cancel does. A **FileName** of 261 characters or more makes **ShowSave** raise run-time error 5, *Invalid procedure call or argument*, before any dialog opens.

## Example

This example asks for a file name and writes a line to the file.

```tb check_build
Dim dlg As New cDialog
Dim path As String

dlg.DialogTitle = "Save the report"
dlg.DefaultExt = "txt"
dlg.FileName = "report.txt"
dlg.SetCommonFilters

path = dlg.ShowSave()
If Len(path) > 0 Then
    Open path For Output As #1
    Print #1, "Report"
    Close #1
End If
```

## See Also

- [ShowOpen](ShowOpen) method -- shows the Open dialog
- [ShowBrowseForFolder](ShowBrowseForFolder) method -- shows the Browse For Folder dialog
- [DefaultExt](DefaultExt) property -- the extension added to a name typed without one
- [OverwritePrompt](OverwritePrompt) property -- asks before a name that exists is accepted
- [FileName](FileName) property -- the suggested name and the result
- [cDialog](.) class -- overview
