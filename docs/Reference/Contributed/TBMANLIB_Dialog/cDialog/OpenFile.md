---
title: OpenFile
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/OpenFile
has_toc: false
---

# OpenFile
{: .no_toc }

Runs a shell verb, by default `open`, on a file or a program.

Syntax: *object*.**OpenFile** ( *strFilePath* [, *strOperation* ] ) **As LongPtr**

*object*
: *required* An object expression that evaluates to a **cDialog**.

*strFilePath*
: *required* A **String**, the file to act on or the program to start. Any value that [ShellExecute](https://learn.microsoft.com/en-us/windows/win32/api/shellapi/nf-shellapi-shellexecutew) accepts as its file argument is allowed: a document, a program, a folder or a web address.

*strOperation*
: *optional* A **String**, the verb to run, such as `open`, `edit`, `explore`, `print` or `properties`. The default is `open`. The verbs that exist depend on the type of the file.

Returns a **LongPtr** (a **Long** in a 32-bit program, a **LongLong** in a 64-bit one), the value that `ShellExecute` returned. A value above 32 means that the call succeeded. A smaller value is an error code.

| Value | Meaning |
|---|---|
| 0 | The system is out of memory or resources. |
| 2 | The file was not found. |
| 3 | The path was not found. |
| 5 | Access to the file was denied. |
| 8 | There is not enough memory to run the call. |
| 26 | A sharing violation occurred. |
| 31 | No program is associated with the file type for the verb. |

The Windows documentation of `ShellExecute` lists the other values.

## Remarks

<!-- test: CDialogPropertyTests.OpenFile_NonexistentFileReturns2 -->
**OpenFile** calls `ShellExecuteW`, the Unicode form of `ShellExecute`, so a path with any character is passed intact. It passes no owner window, no parameters and no working folder, and shows the program's window normally (`SW_SHOWNORMAL`). The method raises no error: the return value is the only report. A path that does not exist returns 2 and shows no message.
<!-- /test -->

For a program, the verb `open` starts the program. For a document, it starts the program that Windows associates with the document. For a folder, it opens the folder in File Explorer.

<!-- test: none -- the call opens a File Explorer window, which a test case never does -->
> [!NOTE] 1.1.0.0
> An empty *strFilePath* is not an error. `OpenFile("")` returns 42, which is above 32 and looks like success, and opens a File Explorer window on the current folder of the program.

## Example

This example opens a document and reports an error code.

```tb check_build
Dim dlg As New cDialog
Dim result As LongPtr

result = dlg.OpenFile("C:\Reports\summary.pdf")
If result <= 32 Then
    Debug.Print "ShellExecute failed with code " & result
End If
```

This example edits a text file with the verb `edit`, then shows the folder of the file in Windows Explorer with the verb `explore`.

```tb check_build
Dim dlg As New cDialog
Dim path As String

path = "C:\Reports\notes.txt"
dlg.OpenFile path, "edit"
dlg.OpenFile dlg.GetFilePath(path), "explore"
```

## See Also

- [SelectAndOpenFile](SelectAndOpenFile) method -- shows the Open dialog and calls **OpenFile**
- [ShowOpen](ShowOpen) method -- shows the Open dialog
- [GetFilePath](GetFilePath) method -- the folder part of a path
- [cDialog](.) class -- overview
