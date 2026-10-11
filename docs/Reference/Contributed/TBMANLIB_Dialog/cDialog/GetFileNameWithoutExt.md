---
title: GetFileNameWithoutExt
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/GetFileNameWithoutExt
has_toc: false
---

# GetFileNameWithoutExt
{: .no_toc }

Returns the file name of a path without its folder and without its last extension.

Syntax: *object*.**GetFileNameWithoutExt** ( *strFullPath* ) **As String**

*object*
: *required* An object expression that evaluates to a **cDialog**.

*strFullPath*
: *required* A **String**, a path or a file name.

## Remarks

**GetFileNameWithoutExt** takes the part of the string after the last backslash, as [**GetFileName**](GetFileName) does, and removes everything from the last period of that part. `C:\Docs\summary.txt` gives `summary`. The period is searched in the file name only, so a period in a folder name has no effect: `C:\my.dir\notes` gives `notes`.

- Only the last extension is removed: `archive.tar.gz` gives `archive.tar`.
- A name without a period is returned as it is.
- A name that ends with a period loses it: `report.` gives `report`.
- A name that starts with a period and has no other gives an empty string: `.gitignore` gives an empty string.

The method works on text only. It does not check that the file exists, and it reads no property of the object.

## Example

```tb check_build check_run
Dim dlg As New cDialog
Debug.Print dlg.GetFileNameWithoutExt("C:\Docs\summary.txt")   ' summary
Debug.Print dlg.GetFileNameWithoutExt("archive.tar.gz")        ' archive.tar
Debug.Print dlg.GetFileNameWithoutExt("README")                ' README
Debug.Print dlg.GetFileNameWithoutExt("C:\my.dir\notes")       ' notes
Debug.Print "[" & dlg.GetFileNameWithoutExt(".gitignore") & "]"   ' []
```

## See Also

- [GetFileName](GetFileName) method -- the part after the last backslash
- [GetFileExtension](GetFileExtension) method -- the part from the last period
- [GetFilePath](GetFilePath) method -- the part before the last backslash
- [cDialog](.) class -- overview
