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

> [!NOTE]
> A *drive* that is not a **String**, such as a number or a **Boolean**, is converted to one, as in **ChDrive**, in both **CurDir** and **CurDir$**: `CurDir(5)` looks for drive 5. VB6 and 64-bit VBA raise error 13, *Type mismatch*, for it.

### Example

This example uses the **CurDir** function to return the current path.

```tb check_build
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

```tb check_build
' Assume current path on C drive is "C:\WINDOWS\SYSTEM".
' Assume current path on D drive is "D:\EXCEL".
' Assume C is the current drive.
Dim MyPath As String
MyPath = CurDir$       ' Returns "C:\WINDOWS\SYSTEM".
MyPath = CurDir$("C")  ' Returns "C:\WINDOWS\SYSTEM".
MyPath = CurDir$("D")  ' Returns "D:\EXCEL".
```

<!-- errors: generated from errors/VBA.FileSystem.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | *drive* starts with a letter that no drive has<br>*drive* starts with a digit, a space or a punctuation character |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *drive* is **Null** |

> [!NOTE] BETA 1010
> When *drive* starts with a letter that no drive has, VB6 and 64-bit VBA raise error [68 (`&H44`)](tb:Errors#68), *Device unavailable*, instead.

> [!NOTE] BETA 1010
> When *drive* starts with a digit, a space or a punctuation character, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

> [!NOTE] BETA 1010
> When *drive* is **Null**, VB6 and 64-bit VBA raise error [13 (`&HD`)](tb:Errors#13), *Type mismatch*, instead.

<!-- /errors -->

### See Also

- [ChDir](ChDir), [ChDrive](ChDrive) statements
- [Dir](Dir) function
