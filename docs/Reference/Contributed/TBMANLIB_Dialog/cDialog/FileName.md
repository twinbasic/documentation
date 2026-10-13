---
title: FileName
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/FileName
has_toc: false
---

# FileName
{: .no_toc }

Returns or sets the file name that the Open and Save As dialogs show when they open, and holds the path that the last of those dialogs returned.

Syntax: *object*.**FileName** [ = *string* ]

*object*
: *required* An object expression that evaluates to a **cDialog**.

*string*
: A **String**, a file name or a full path. The default is an empty string.

## Remarks

**Before a dialog.** [**ShowOpen**](ShowOpen) and [**ShowSave**](ShowSave) copy the text into the buffer that Windows uses for the `lpstrFile` member of `OPENFILENAME`, which initialises the File name box. The Save As dialog shows an empty box for an empty **FileName** and `x.txt` for `x.txt`. [**ShowSave**](ShowSave) pads the buffer with spaces, and the dialog does not show the padding.

**After a dialog.** A **ShowSave** or **ShowOpen** that the user confirms stores the path it returns in **FileName**. For a [**MultiSelect**](MultiSelect) selection of several files, which **ShowOpen** returns as an array, **FileName** becomes an empty string. A cancelled dialog leaves **FileName** as it was, and [**ShowBrowseForFolder**](ShowBrowseForFolder) neither reads nor changes it.

> [!NOTE]
> Because a confirmed dialog stores the full path, the next **ShowOpen** or **ShowSave** passes that path as the initial file name. Set **FileName** to an empty string, or call [**Reset**](Reset), to start without it.

**Length.** The buffer of **ShowSave** holds 260 characters. A **FileName** of up to 259 characters opens the dialog normally. A **FileName** of exactly 260 characters shows no dialog and returns an empty string at once, without an error, as a cancel does. A **FileName** of 261 characters or more raises run-time error 5, *Invalid procedure call or argument*, before any dialog. The buffer of **ShowOpen** holds 260 characters, or 32,768 when **FileName** is not empty or [**MultiSelect**](MultiSelect) is **True**. A **FileName** of 32,768 characters or more is not used by **ShowOpen**.

## Example

```tb check_build check_run
Dim dlg As New cDialog
dlg.FileName = "C:\Reports\summary.txt"
Debug.Print dlg.FileName                    ' C:\Reports\summary.txt
Debug.Print dlg.GetFileName(dlg.FileName)   ' summary.txt

dlg.Reset
Debug.Print "[" & dlg.FileName & "]"        ' []
```

This example suggests a name in the Save As dialog and prints the path that the user confirms.

```tb check_build
Dim dlg As New cDialog
dlg.FileName = "summary.txt"
If Len(dlg.ShowSave()) > 0 Then
    Debug.Print "Saved as " & dlg.FileName
End If
```

## See Also

- [InitialDir](InitialDir) property -- the folder in which the dialogs start
- [ShowOpen](ShowOpen) method -- shows the Open dialog
- [ShowSave](ShowSave) method -- shows the Save As dialog
- [GetFileName](GetFileName) method -- the name part of a path
- [cDialog](.) class -- overview
