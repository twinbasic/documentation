---
title: MultiSelect
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/MultiSelect
has_toc: false
---

# MultiSelect
{: .no_toc }

Returns or sets whether the Open dialog lets the user select more than one file.

Syntax: *object*.**MultiSelect** [ = *boolean* ]

*object*
: *required* An object expression that evaluates to a **cDialog**.

*boolean*
: A **Boolean**. **True** sets `OFN_ALLOWMULTISELECT` for [**ShowOpen**](ShowOpen). The default is **False**.

## Remarks

Only [**ShowOpen**](ShowOpen) uses the property. [**ShowSave**](ShowSave) and [**ShowBrowseForFolder**](ShowBrowseForFolder) ignore it.

With **MultiSelect** **True**, **ShowOpen** gives Windows a buffer of 32,768 characters, in place of 260. The class also always sets `OFN_EXPLORER`, so Windows fills the buffer with the folder, then the name of each selected file, each ended by a null character, and one more null character at the end. When the user selects one file, the buffer holds its full path, with no separator.

> [!WARNING]
> When the user selects two or more files, **ShowOpen** returns a **String** that holds only the folder of the files. It does not return an array and it does not return the file names, and [**FileName**](FileName) becomes the folder too. No error is raised, so the result looks like a valid answer and the names of the files are lost. One selected file gives its full path, as a **String**.

The source of **ShowOpen** has a branch that splits the names and returns an array of full paths. It never runs: the code cuts the buffer at its first null character, which is the end of the folder, before it looks for the separators between the names. A program can tell the two results apart, because the result for several files is the path of a folder.

[**SelectAndOpenFile**](SelectAndOpenFile) passes the folder to [**OpenFile**](OpenFile), which opens it in File Explorer.

## Example

```tb check_build check_run
Dim dlg As New cDialog
Debug.Print dlg.MultiSelect   ' False

dlg.MultiSelect = True
Debug.Print dlg.MultiSelect   ' True
```

This example lets the user select several files, and reports when only the folder came back.

```tb check_build
Dim dlg As New cDialog
Dim result As String

dlg.MultiSelect = True
dlg.SetImageFilters
result = dlg.ShowOpen()

If Len(result) = 0 Then
    Debug.Print "Cancelled"
ElseIf GetAttr(result) And vbDirectory Then
    Debug.Print "Several files were selected; only the folder came back: " & result
Else
    Debug.Print "One file: " & result
End If
```

## See Also

- [ShowOpen](ShowOpen) method -- shows the Open dialog and returns the result
- [SelectAndOpenFile](SelectAndOpenFile) method -- opens the file that the dialog returns
- [FileName](FileName) property -- holds the result
- [cDialog](.) class -- overview
