---
title: SelectFiles
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/SelectFiles
has_toc: false
---

# SelectFiles
{: .no_toc }

Shows the Open dialog and returns the chosen files as a **Collection** of full paths.

Syntax: *object*.**SelectFiles** ( ) **As Collection**

*object*
: *required* An object expression that evaluates to a **cDialog**.

Returns a **Collection** of **String** values, one full path for each chosen file, in the order in which [**ShowOpen**](ShowOpen) returns them. The collection is empty when the user cancels the dialog, and its **Count** is 1 when one file is chosen. It is never **Nothing**.

## Remarks

**SelectFiles** calls **ShowOpen** with the current properties of the object, so every option of the Open dialog applies, [**MultiSelect**](MultiSelect) first of all. With **MultiSelect** **False** the collection holds one path at most. With **MultiSelect** **True** and one file selected it holds one path, and with two or more files selected it holds one path for each. The method saves the program from testing whether **ShowOpen** returned a **String** or an array. An empty result and a failure of the dialog look the same, as they do for **ShowOpen**.

[**FileName**](FileName) is set as **ShowOpen** sets it: to the path when one file was chosen, and to an empty string after several.

## Example

This example lets the user select several text files and prints their names.

```tb check_build
Dim dlg As New cDialog
Dim file As Variant

dlg.MultiSelect = True
dlg.SetCommonFilters

Dim files As Collection
Set files = dlg.SelectFiles()
If files.Count = 0 Then
    Debug.Print "Cancelled"
Else
    For Each file In files
        Debug.Print dlg.GetFileName(CStr(file))
    Next
End If
```

## See Also

- [ShowOpen](ShowOpen) method -- shows the Open dialog and returns a string or an array
- [MultiSelect](MultiSelect) property -- lets the user select several files
- [SelectAndOpenFile](SelectAndOpenFile) method -- shows the dialog and opens the files
- [cDialog](.) class -- overview
