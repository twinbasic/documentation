---
title: GetFileExtension
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/GetFileExtension
has_toc: false
---

# GetFileExtension
{: .no_toc }

Returns the part of a path from its last period, the period included.

Syntax: *object*.**GetFileExtension** ( *strFullPath* ) **As String**

*object*
: *required* An object expression that evaluates to a **cDialog**.

*strFullPath*
: *required* A **String**, a path or a file name.

## Remarks

**GetFileExtension** returns the extension with its period: `.txt` for `C:\Docs\summary.txt`. A string with no period gives an empty string. Of `archive.tar.gz` only `.gz` is returned, and a name that ends with a period gives `.`.

> [!NOTE] 1.1.0.0
> The method searches the whole string for the last period, not the file name only. A period in a folder name is taken for the start of an extension when the file name has none: `C:\my.dir\notes` gives `.dir\notes`. [**GetFileNameWithoutExt**](GetFileNameWithoutExt) looks in the file name only, and gives `notes` for the same path.

The method works on text only. It does not check that the file exists, and it reads no property of the object.

## Example

```tb check_build check_run
Dim dlg As New cDialog
Debug.Print dlg.GetFileExtension("C:\Docs\summary.txt")   ' .txt
Debug.Print dlg.GetFileExtension("archive.tar.gz")        ' .gz
Debug.Print dlg.GetFileExtension("report.")               ' .
Debug.Print "[" & dlg.GetFileExtension("README") & "]"    ' []
Debug.Print dlg.GetFileExtension("C:\my.dir\notes")       ' .dir\notes
```

## See Also

- [GetFileNameWithoutExt](GetFileNameWithoutExt) method -- the name without its extension
- [GetFileName](GetFileName) method -- the part after the last backslash
- [GetFilePath](GetFilePath) method -- the part before the last backslash
- [cDialog](.) class -- overview
