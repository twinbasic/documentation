---
title: GetFileName
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/GetFileName
has_toc: false
---

# GetFileName
{: .no_toc }

Returns the part of a path after its last backslash.

Syntax: *object*.**GetFileName** ( *strFullPath* ) **As String**

*object*
: *required* An object expression that evaluates to a **cDialog**.

*strFullPath*
: *required* A **String**, a path or a file name.

## Remarks

**GetFileName** returns the file name of a path, with its extension: the name in `C:\Docs\summary.txt` is `summary.txt`.

- Only the backslash separates folders. A forward slash is an ordinary character, so a path written with forward slashes is returned unchanged.
- A string with no backslash is returned unchanged: `summary.txt` gives `summary.txt`.
- A string that ends with a backslash, such as `C:\Docs\`, gives an empty string.

The method works on text only. It does not check that the file exists, and it reads no property of the object.

## Example

```tb check_build check_run
Dim dlg As New cDialog
Debug.Print dlg.GetFileName("C:\Docs\Reports\summary.txt")   ' summary.txt
Debug.Print dlg.GetFileName("summary.txt")                   ' summary.txt
Debug.Print "[" & dlg.GetFileName("C:\Docs\") & "]"          ' []
Debug.Print dlg.GetFileName("C:/Docs/summary.txt")           ' C:/Docs/summary.txt
```

## See Also

- [GetFilePath](GetFilePath) method -- the part before the last backslash
- [GetFileNameWithoutExt](GetFileNameWithoutExt) method -- the name without its extension
- [GetFileExtension](GetFileExtension) method -- the part from the last period
- [cDialog](.) class -- overview
