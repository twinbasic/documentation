---
title: SelectAndOpenFile
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/SelectAndOpenFile
has_toc: false
---

# SelectAndOpenFile
{: .no_toc }

Shows the Open dialog and opens the file or files that the user chose.

Syntax: *object*.**SelectAndOpenFile** ( ) **As LongPtr**

*object*
: *required* An object expression that evaluates to a **cDialog**.

Returns a **LongPtr** (a **Long** in a 32-bit program, a **LongLong** in a 64-bit one):

- 0 when the user cancelled the dialog or the dialog failed.
- Otherwise the value that [**OpenFile**](OpenFile) returned for the path. A value above 32 means that the file was opened.

## Remarks

<!-- test: CDialogDialogTests.SelectAndOpenFile_CancelReturnsZero, CDialogDialogTests.SelectAndOpenFile_OneMissingFileReturnsWhatOpenFileReturned, CDialogDialogTests.SelectAndOpenFile_SeveralMissingFilesReturnOne -->
**SelectAndOpenFile** calls [**ShowOpen**](ShowOpen) with the current properties of the object, so every option that applies to the Open dialog ([**Filter**](Filter), [**InitialDir**](InitialDir), [**MultiSelect**](MultiSelect) and the others) applies here. It then calls **OpenFile** with the verb `open` for the path. The file is run as **OpenFile** describes: a program starts, and a document opens in its associated program.

With [**MultiSelect**](MultiSelect) **True** and two or more files selected, **ShowOpen** returns an array, and **SelectAndOpenFile** calls **OpenFile** for each element in turn. It then returns 1, whatever the individual calls returned, so the return value does not report a file that failed to open. For a single file it returns what **OpenFile** returned.
<!-- /test -->

## Example

This example lets the user pick any file and opens it.

```tb check_build
Dim dlg As New cDialog
Dim result As LongPtr

dlg.DialogTitle = "Open a document"
dlg.SetDocumentFilters
result = dlg.SelectAndOpenFile()

If result = 0 Then
    Debug.Print "Nothing was opened"
ElseIf result <= 32 Then
    Debug.Print "ShellExecute failed with code " & result
End If
```

## See Also

- [OpenFile](OpenFile) method -- opens a file whose path is known
- [ShowOpen](ShowOpen) method -- shows the Open dialog and returns the path
- [MultiSelect](MultiSelect) property -- lets the user select several files
- [cDialog](.) class -- overview
