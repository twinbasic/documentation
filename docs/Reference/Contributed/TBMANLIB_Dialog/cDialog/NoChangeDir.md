---
title: NoChangeDir
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/NoChangeDir
has_toc: false
---

# NoChangeDir
{: .no_toc }

Returns or sets whether the Open and Save As dialogs restore the current folder of the program when they close.

Syntax: *object*.**NoChangeDir** [ = *boolean* ]

*object*
: *required* An object expression that evaluates to a **cDialog**.

*boolean*
: A **Boolean**. **True** sets `OFN_NOCHANGEDIR`. The default is **False**.

## Remarks

<!-- test: CDialogDialogTests.ShowOpen_NoChangeDirKeepsTheCurrentFolder -->
[**ShowOpen**](ShowOpen) and [**ShowSave**](ShowSave) use the property. [**ShowBrowseForFolder**](ShowBrowseForFolder) ignores it.

The current folder is the one that **CurDir** returns, and that relative paths are resolved against. With **False**, the current folder is the folder of the chosen file after **ShowOpen** or **ShowSave**. With **True** it stays as it was. The flag works for both dialogs. The Windows documentation of `OFN_NOCHANGEDIR` calls it ineffective for `GetOpenFileName`, but it is effective for **ShowOpen**.
<!-- /test -->

## Example

```tb check_build check_run
Dim dlg As New cDialog
Debug.Print dlg.NoChangeDir   ' False

dlg.NoChangeDir = True
Debug.Print dlg.NoChangeDir   ' True
```

This example shows the Open dialog and reports whether the current folder is the same afterwards.

```tb check_build
Dim dlg As New cDialog
Dim before As String

before = CurDir$
dlg.NoChangeDir = True
dlg.ShowOpen
Debug.Print CurDir$ = before
```

## See Also

- [ShowOpen](ShowOpen) method -- shows the Open dialog
- [ShowSave](ShowSave) method -- shows the Save As dialog
- [InitialDir](InitialDir) property -- the folder in which the dialogs start
- [cDialog](.) class -- overview
