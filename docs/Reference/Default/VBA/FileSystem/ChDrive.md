---
title: ChDrive
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/ChDrive
redirect_from:
-  /tB/Core/ChDrive
vba_attribution: true
---
# ChDrive
{: .no_toc }

Changes the current drive.

Syntax: **ChDrive** *drive*

*drive*
: *required* A string expression that specifies an existing drive. If *drive* is a zero-length string (""), the current drive doesn't change. If the *drive* argument is a multiple-character string, **ChDrive** uses only the first letter.

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

<!-- /errors -->

### See Also

- [ChDir](ChDir), [MkDir](MkDir), and [RmDir](RmDir) statements
- [CurDir](CurDir) function

### Example

This example uses the **ChDrive** statement to change the current drive. 

```tb check_build
ChDrive "D"   ' Make "D" the current drive.
```