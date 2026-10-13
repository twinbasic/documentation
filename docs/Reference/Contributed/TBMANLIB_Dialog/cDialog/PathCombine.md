---
title: PathCombine
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/PathCombine
has_toc: false
---

# PathCombine
{: .no_toc }

Joins two path parts with one backslash.

Syntax: *object*.**PathCombine** ( *strPath1*, *strPath2* ) **As String**

*object*
: *required* An object expression that evaluates to a **cDialog**.

*strPath1*
: *required* A **String**, the folder or the first part of the path.

*strPath2*
: *required* A **String**, the file name or the rest of the path.

## Remarks

**PathCombine** returns *strPath1* and *strPath2* with exactly one backslash between them, so it does not matter whether *strPath1* ends with a backslash or *strPath2* starts with one. The method follows these steps, in order:

1. An empty *strPath1* returns *strPath2* as it is, and an empty *strPath2* returns *strPath1* as it is. Two empty strings give an empty string.
2. A *strPath2* that is already absolute is returned alone, and *strPath1* is dropped. It is absolute when it starts with a drive letter, a colon and a backslash (`D:\b`), or with two backslashes (`\\server\share`).
3. One trailing backslash of *strPath1* and one leading backslash of *strPath2* are removed.
4. The two parts are joined with a backslash.

| *strPath1* | *strPath2* | Result |
|---|---|---|
| `C:\a` | `b` | `C:\a\b` |
| `C:\a\` | `\b` | `C:\a\b` |
| `C:` | `b` | `C:\b` |
| `C:\a` | `D:\b` | `D:\b` |
| `C:\a` | `\\srv\x` | `\\srv\x` |
| `C:\a` | `D:b` | `C:\a\D:b` |
| `C:\a` | `..\b` | `C:\a\..\b` |
| `C:\a\\` | `b` | `C:\a\\b` |

The method works on text only. It does not check that a folder or a file exists, and it does not resolve `..` or `.`. A forward slash is an ordinary character: `a/` and `b` give `a/\b`, and `http://x/y` after `C:\a` gives `C:\a\http://x/y`. Only one backslash is removed from each side, so a doubled backslash stays. A *strPath2* with a drive letter but no backslash after the colon (`D:b`) is not absolute and is joined like any other name. [**cDialogEx**](../cDialogEx#pathcombine) has the same method.

## Example

```tb check_build check_run
Dim dlg As New cDialog
Debug.Print dlg.PathCombine("C:\Reports", "summary.txt")    ' C:\Reports\summary.txt
Debug.Print dlg.PathCombine("C:\Reports\", "\summary.txt")  ' C:\Reports\summary.txt
Debug.Print dlg.PathCombine("C:\Reports", "D:\other.txt")   ' D:\other.txt
Debug.Print dlg.PathCombine("", "summary.txt")              ' summary.txt
Debug.Print dlg.PathCombine("C:\Reports", "")               ' C:\Reports
```

## See Also

- [GetFilePath](GetFilePath) method -- the part before the last backslash
- [GetFileName](GetFileName) method -- the part after the last backslash
- [cDialog](.) class -- overview
