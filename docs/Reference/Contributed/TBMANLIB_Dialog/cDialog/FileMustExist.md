---
title: FileMustExist
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/FileMustExist
has_toc: false
---

# FileMustExist
{: .no_toc }

Returns or sets whether the Open dialog lets the user choose only the name of a file that exists.

Syntax: *object*.**FileMustExist** [ = *boolean* ]

*object*
: *required* An object expression that evaluates to a **cDialog**.

*boolean*
: A **Boolean**. **True** sets `OFN_FILEMUSTEXIST`. The default is **True**.

## Remarks

<!-- test: CDialogDialogTests.ShowOpen_FileMustExistRefusesAMissingName, CDialogDialogTests.ShowOpen_WithoutFileMustExistReturnsAMissingName -->
Only [**ShowOpen**](ShowOpen) uses the property. [**ShowSave**](ShowSave) never sets `OFN_FILEMUSTEXIST`, and Windows documents the flag for Open dialogs only, so **FileMustExist** has no effect on a Save As dialog. [**ShowBrowseForFolder**](ShowBrowseForFolder) ignores it too.

With **True**, a name that the user types and that does not exist, such as `nosuch.txt`, makes Windows show the box *File not found. Check the file name and try again.*, and the Open dialog stays open. Windows documents that the flag also applies `OFN_PATHMUSTEXIST`. With **False**, **ShowOpen** returns the path of a file that does not exist, and does not create the file, so the caller has to be ready to meet a missing file.

With [**CreatePrompt**](CreatePrompt) **True**, the question of that property is asked in place of the box, whether **FileMustExist** is **True** or **False**.
<!-- /test -->

## Example

```tb check_build check_run
Dim dlg As New cDialog
Debug.Print dlg.FileMustExist   ' True

dlg.FileMustExist = False
Debug.Print dlg.FileMustExist   ' False
```

This example lets the Open dialog return a name that does not exist, and creates the file when it is missing.

```tb check_build
Dim dlg As New cDialog
Dim path As String

dlg.FileMustExist = False
path = dlg.ShowOpen()
If Len(path) > 0 Then
    If Len(Dir$(path)) = 0 Then
        Open path For Output As #1
        Close #1
    End If
End If
```

## See Also

- [PathMustExist](PathMustExist) property -- the check on the folder of the name
- [CreatePrompt](CreatePrompt) property -- asks before a name that does not exist is accepted
- [ShowOpen](ShowOpen) method -- shows the Open dialog
- [cDialog](.) class -- overview
