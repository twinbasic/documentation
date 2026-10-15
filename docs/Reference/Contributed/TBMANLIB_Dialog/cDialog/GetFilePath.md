---
title: GetFilePath
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/GetFilePath
has_toc: false
---

# GetFilePath
{: .no_toc }

Returns the part of a path before its last backslash.

Syntax: *object*.**GetFilePath** ( *strFullPath* ) **As String**

*object*
: *required* An object expression that evaluates to a **cDialog**.

*strFullPath*
: *required* A **String**, a path or a file name.

## Remarks

<!-- test: CDialogPropertyTests.GetFilePath_ReturnsThePartBeforeTheLastBackslash -->
**GetFilePath** returns the folder of a file path, without a trailing backslash: the folder of `C:\Docs\summary.txt` is `C:\Docs`, and that of a file in the root of a drive is `C:`, without the backslash.

- Only the backslash separates folders. A forward slash is an ordinary character, so a path written with forward slashes is returned unchanged.
- A string with no backslash is returned unchanged, not as an empty string. `summary.txt` gives `summary.txt`, so a result equal to the argument means that the argument had no folder.
- A string that ends with a backslash loses it: `C:\Docs\` gives `C:\Docs`. A string that starts with its only backslash gives an empty string.

The method works on text only. It does not check that the folder exists, and it reads no property of the object.
<!-- /test -->

## Example

```tb check_build check_run
Dim dlg As New cDialog
Debug.Print dlg.GetFilePath("C:\Docs\Reports\summary.txt")   ' C:\Docs\Reports
Debug.Print dlg.GetFilePath("C:\summary.txt")                ' C:
Debug.Print dlg.GetFilePath("summary.txt")                   ' summary.txt
Debug.Print dlg.GetFilePath("C:\Docs\")                      ' C:\Docs
Debug.Print dlg.GetFilePath("C:/Docs/summary.txt")           ' C:/Docs/summary.txt
Debug.Print "[" & dlg.GetFilePath("\summary.txt") & "]"      ' []
```

## See Also

- [GetFileName](GetFileName) method -- the part after the last backslash
- [GetFileExtension](GetFileExtension) method -- the part from the last period
- [GetFileNameWithoutExt](GetFileNameWithoutExt) method -- the name without its extension
- [cDialog](.) class -- overview
