---
title: CreatePrompt
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/CreatePrompt
has_toc: false
---

# CreatePrompt
{: .no_toc }

Returns or sets whether the Open dialog asks permission before it accepts the name of a file that does not exist.

Syntax: *object*.**CreatePrompt** [ = *boolean* ]

*object*
: *required* An object expression that evaluates to a **cDialog**.

*boolean*
: A **Boolean**. **True** sets `OFN_CREATEPROMPT`. The default is **False**.

## Remarks

Only [**ShowOpen**](ShowOpen) uses the property. [**ShowSave**](ShowSave) never sets `OFN_CREATEPROMPT`, and [**ShowBrowseForFolder**](ShowBrowseForFolder) ignores the property.

When the user types the name of a file that does not exist, such as `nosuch.txt`, the box *This file doesn't exist. Create the file?* appears, with the buttons *Yes* and *No*. *Yes* closes the dialog and returns the path. *No* leaves the dialog open. This happens whether [**FileMustExist**](FileMustExist) is **True** or **False**, so the question takes the place of the *File not found* box that **FileMustExist** shows.

The file is not created: neither the dialog nor the class creates it, and the program has to do so.

## Example

```tb check_build check_run
Dim dlg As New cDialog
Debug.Print dlg.CreatePrompt   ' False

dlg.CreatePrompt = True
Debug.Print dlg.CreatePrompt   ' True
```

This example lets the user name a new file in the Open dialog and creates it when the user agrees.

```tb check_build
Dim dlg As New cDialog
Dim path As String

dlg.CreatePrompt = True
path = dlg.ShowOpen()
If Len(path) > 0 Then
    If Len(Dir$(path)) = 0 Then
        Open path For Output As #1
        Close #1
    End If
End If
```

## See Also

- [FileMustExist](FileMustExist) property -- lets only names of existing files through
- [ShowOpen](ShowOpen) method -- shows the Open dialog
- [cDialog](.) class -- overview
