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

When the user selects one file, **ShowOpen** returns its full path as a **String**. When the user selects two or more, it returns an array of **String** values, one full path for each file, in the order in which the names stand in the File name box. The array is 0-based. [**FileName**](FileName) is an empty string after a selection of several files. A program can tell the two results apart with **IsArray**, and [**SelectFiles**](SelectFiles) hides the difference by returning a **Collection** in both cases.

[**SelectAndOpenFile**](SelectAndOpenFile) opens each file of an array.

## Example

```tb check_build check_run
Dim dlg As New cDialog
Debug.Print dlg.MultiSelect   ' False

dlg.MultiSelect = True
Debug.Print dlg.MultiSelect   ' True
```

This example lets the user select several image files and prints each path.

```tb check_build
Dim dlg As New cDialog
Dim file As Variant

dlg.MultiSelect = True
dlg.SetImageFilters
For Each file In dlg.SelectFiles()
    Debug.Print file
Next
```

## See Also

- [ShowOpen](ShowOpen) method -- shows the Open dialog and returns the result
- [SelectFiles](SelectFiles) method -- returns the selected files as a collection
- [SelectAndOpenFile](SelectAndOpenFile) method -- opens the file that the dialog returns
- [FileName](FileName) property -- holds the result
- [cDialog](.) class -- overview
