---
title: CurDir
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/CurDir
redirect_from:
-  /tB/Core/CurDir
vba_attribution: true
---
# CurDir
{: .no_toc }

Returns the current path.

## CurDir Function

Returns a **Variant** (**String**) representing the current path.

Syntax: **CurDir** [ **(** *drive* **)** ]

*drive*
: *optional* String expression that specifies an existing drive. If no drive is specified or if *drive* is a zero-length string (`""`), **CurDir** returns the path for the current drive.

### Example

This example uses the **CurDir** function to return the current path.

```tb
' Assume current path on C drive is "C:\WINDOWS\SYSTEM".
' Assume current path on D drive is "D:\EXCEL".
' Assume C is the current drive.
Dim MyPath
MyPath = CurDir       ' Returns "C:\WINDOWS\SYSTEM".
MyPath = CurDir("C")  ' Returns "C:\WINDOWS\SYSTEM".
MyPath = CurDir("D")  ' Returns "D:\EXCEL".
```

## CurDir$ Function
{: #curdir-1 }

Returns a **String** representing the current path.

Syntax: **CurDir$** [ **(** *drive* **)** ]

*drive*
: *optional* String expression that specifies an existing drive. If no drive is specified or if *drive* is a zero-length string (`""`), **CurDir$** returns the path for the current drive.

### Example

This example uses the **CurDir$** function to return the current path.

```tb
' Assume current path on C drive is "C:\WINDOWS\SYSTEM".
' Assume current path on D drive is "D:\EXCEL".
' Assume C is the current drive.
Dim MyPath As String
MyPath = CurDir$       ' Returns "C:\WINDOWS\SYSTEM".
MyPath = CurDir$("C")  ' Returns "C:\WINDOWS\SYSTEM".
MyPath = CurDir$("D")  ' Returns "D:\EXCEL".
```

### See Also

- [ChDir](ChDir), [ChDrive](ChDrive) statements
- [Dir](Dir) function
