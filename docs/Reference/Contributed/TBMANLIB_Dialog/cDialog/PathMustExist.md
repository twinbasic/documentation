---
title: PathMustExist
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/PathMustExist
has_toc: false
---

# PathMustExist
{: .no_toc }

Returns or sets whether the Open and Save As dialogs accept only paths that exist.

Syntax: *object*.**PathMustExist** [ = *boolean* ]

*object*
: *required* An object expression that evaluates to a **cDialog**.

*boolean*
: A **Boolean**. **True** sets `OFN_PATHMUSTEXIST`. The default is **True**.

## Remarks

<!-- test: CDialogDialogTests.ShowOpen_PathMustExistRefusesAMissingFolder -->
[**ShowOpen**](ShowOpen) and [**ShowSave**](ShowSave) use the property. With **True**, a path that the user types and that does not exist makes Windows show a warning in a message box, and the dialog stays open. [**ShowBrowseForFolder**](ShowBrowseForFolder) ignores the property.

In an Open dialog, [**FileMustExist**](FileMustExist) **True** sets `OFN_FILEMUSTEXIST`, which Windows documents as implying `OFN_PATHMUSTEXIST`. **ShowOpen** with **FileMustExist** **True** therefore checks the path whatever **PathMustExist** holds.
<!-- /test -->

## Example

```tb check_build check_run
Dim dlg As New cDialog
Debug.Print dlg.PathMustExist   ' True

dlg.PathMustExist = False
Debug.Print dlg.PathMustExist   ' False
```

This example lets the Save As dialog accept a name in a folder that does not exist yet.

```tb check_build
Dim dlg As New cDialog
Dim path As String

dlg.PathMustExist = False
path = dlg.ShowSave()
If Len(path) > 0 Then
    Debug.Print "Chosen: " & path
End If
```

## See Also

- [FileMustExist](FileMustExist) property -- the check on the file of an Open dialog
- [OverwritePrompt](OverwritePrompt) property -- the question about a file that exists
- [ShowOpen](ShowOpen) method -- shows the Open dialog
- [ShowSave](ShowSave) method -- shows the Save As dialog
- [cDialog](.) class -- overview
